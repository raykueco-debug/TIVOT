#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/map_compose.py —— 槍棺小地圖「合成器」（ver -1141）

    python3 tools/map_compose.py <地圖id> --paper <紙.png> --icons <圖示表.png>

⚠⚠⚠ **為什麼要有這一支**（34 格的伊甸古墓踩出來的）：
把整張地圖交給圖像模型畫，格數一多就守不住兩件事 ——
① 墨點的**座標**（模型會把版面重排，34 格量出來有好幾格配到隔壁圖示上）
② 連線的**正確性**（多畫一條就多一個環，而那張圖的規矩是「只有一條正確的路」）。
12 格、5 格那兩張矇對了，34 格矇不過去。

⇒ 照 `_map_spec.md` 那條通則分工：
   **形狀交給人／幾何交給程式／畫法交給模型**
   · 模型只出兩樣「畫法」的東西：**一張空白羊皮紙** ＋ **一張圖示貼紙表**
   · 墨點、連線、草書地名的**位置**全部由這一支照
     `tools/map_layout.py` 的 `POS`（＝從 `script/town.js` 讀出來的權威版面）算出來
   ⇒ `spots` 是**算出來的**不是量出來的，連線不可能多也不可能少。

輸出：`resources/map/map_<id>.webp` ＋ `resources/map/_spots_<id>.json`
"""
import argparse, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from map_layout import POS, load            # 同一份版面、同一支讀取器（鐵律 7）

W, H = 1536, 1024
MARGIN  = 0.08
ICON_PX = 46
NAME_PX = 24
DOT_R   = 7                               # 紙的四周留白（比例）
INK   = (62, 38, 22)
FONT_CURSIVE = '/System/Library/Fonts/Supplemental/SnellRoundhand.ttc'

def frac_positions(town, nodes=None):
    """把 POS 的格網換算成圖上的比例座標。

    ⚠ **空的行與列會被壓掉**：POS 裡常有沒放格子的行（層與層之間的間隔），
      照原樣等比展開會把 34 格擠成 57px 的間距，圖示與草書名一定疊在一起。
      壓掉空行只改「畫在哪」，**不改相對順序**（left 的還在左、up 的還在上），
      所以方向與拓樸都不受影響。"""
    pos = {k: v for k, v in POS[town].items() if (nodes is None or k in nodes)}
    cs = sorted({c for c, _ in pos.values()}); rs = sorted({r for _, r in pos.values()})
    ci = {c: i for i, c in enumerate(cs)}; ri = {r: i for i, r in enumerate(rs)}
    sx = (1 - 2*MARGIN) / max(1, len(cs)-1)
    sy = (1 - 2*MARGIN) / max(1, len(rs)-1)
    return {k: (MARGIN + ci[c]*sx, MARGIN + ri[r]*sy) for k, (c, r) in pos.items()}

def edges_of(T):
    N = T['nodes']; e = set()
    for nid, n in N.items():
        for d, to in (n.get('exits') or {}).items():
            if isinstance(to, str) and to in N:
                e.add(tuple(sorted((nid, to))))
    return sorted(e)

def wobble(d, x1, y1, x2, y2, width, fill, seg=26, amp=1.6, rnd=None):
    """手繪感：把直線切成小段，每一段的端點抖一點點。"""
    n = max(2, int(math.hypot(x2-x1, y2-y1)//seg))
    pts = []
    for i in range(n+1):
        t = i/n
        x = x1 + (x2-x1)*t; y = y1 + (y2-y1)*t
        if 0 < i < n:
            x += rnd.uniform(-amp, amp); y += rnd.uniform(-amp, amp)
        pts.append((x, y))
    d.line(pts, fill=fill, width=width, joint='curve')

def cut_icons(path, cols=6, rows=6, want=None):
    """把圖示表切成一格一張，並把每一格的墨裁到最小外框（白底→透明）。"""
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int32)
    lum = (a[:,:,0]*299 + a[:,:,1]*587 + a[:,:,2]*114)//1000
    ink = lum < 190
    cw, ch = im.width//cols, im.height//rows
    out = []
    for i in range(cols*rows):
        c, r = i % cols, i//cols
        sub = ink[r*ch:(r+1)*ch, c*cw:(c+1)*cw]
        if sub.sum() < 60: out.append(None); continue
        ys, xs = np.where(sub)
        x0, x1_, y0, y1_ = xs.min(), xs.max()+1, ys.min(), ys.max()+1
        tile = im.crop((c*cw+x0, r*ch+y0, c*cw+x1_, r*ch+y1_)).convert('RGBA')
        t = np.asarray(tile).copy()
        tt = t.astype(np.int32)
        l = (tt[:,:,0]*299 + tt[:,:,1]*587 + tt[:,:,2]*114)//1000
        t[:,:,3] = np.clip((205 - l) * 3, 0, 255).astype(np.uint8)   # 亮度鍵成 alpha
        out.append(Image.fromarray(t, 'RGBA'))
    if want: out = out[:want]
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('town'); ap.add_argument('--paper', required=True)
    ap.add_argument('--icons', required=True)
    ap.add_argument('--order', help='圖示表的順序（node id 以逗號分隔）；預設照 POS 的順序')
    ap.add_argument('--dashed', default='', help='要畫成虛線的邊，格式 a-b,c-d（換層用）')
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()

    T = load(args.town); N = T['nodes']
    F = frac_positions(args.town, set(N))
    miss = [k for k in N if k not in F]
    if miss: print('POS 少了：', miss); sys.exit(1)
    EDG = edges_of(T)
    dashed = {tuple(sorted(p.split('-'))) for p in args.dashed.split(',') if p}

    order = args.order.split(',') if args.order else list(N)
    icons = cut_icons(args.icons, want=len(order))
    paper = Image.open(args.paper).convert('RGBA').resize((W, H), Image.LANCZOS)

    rnd = __import__('random').Random(args.seed)
    layer = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    P = {k: (F[k][0]*W, F[k][1]*H) for k in N}

    for a, b in EDG:
        (x1,y1),(x2,y2) = P[a], P[b]
        if tuple(sorted((a,b))) in dashed:
            n = 14
            for i in range(0, n, 2):
                d.line([x1+(x2-x1)*i/n, y1+(y2-y1)*i/n,
                        x1+(x2-x1)*(i+1)/n, y1+(y2-y1)*(i+1)/n], fill=INK+(255,), width=5)
        else:
            wobble(d, x1, y1, x2, y2, 5, INK+(255,), rnd=rnd)

    # 圖示：畫在墨點的斜上方，不碰到線
    for k, ic in zip(order, icons):
        if ic is None: continue
        x, y = P[k]
        s = ICON_PX / max(ic.width, ic.height)
        w_, h_ = max(8,int(ic.width*s)), max(8,int(ic.height*s))
        layer.alpha_composite(ic.resize((w_, h_), Image.LANCZOS), (int(x-w_/2)-2, int(y-h_-12)))

    # 墨點（程式畫的，所以 spots 一定對）
    for k in N:
        x, y = P[k]
        d.ellipse([x-DOT_R, y-DOT_R, x+DOT_R, y+DOT_R], fill=INK+(255,))

    # 草書英文名（右下）
    fnt = ImageFont.truetype(FONT_CURSIVE, NAME_PX, index=0)
    EN = {k: k[:1].upper()+k[1:] for k in N}
    for k in N:
        x, y = P[k]
        d.text((x+DOT_R+5, y-4), EN[k], font=fnt, fill=INK+(255,))

    out = paper.copy(); out.alpha_composite(layer)
    out.save(os.path.join(ROOT, 'resources', 'map', 'map_%s.webp' % args.town),
             quality=92, method=6, lossless=False)
    json.dump({k: [round(F[k][0],4), round(F[k][1],4)] for k in N},
              open(os.path.join(ROOT,'resources','map','_spots_%s.json'%args.town),'w',encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print('✓ %s：%d 格・%d 邊 → map_%s.webp ＋ _spots_%s.json'
          % (args.town, len(N), len(EDG), args.town, args.town))

if __name__ == '__main__':
    main()

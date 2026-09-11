#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/map_tomb_draft.py —— 帝王墓遺跡的拓樸草圖（提案階段）

    python3 tools/map_tomb_draft.py

⚠⚠ 這是**提案階段**的產生器：拓樸還沒搬進 `script/town.js`。
   搬進去之後由 `tools/map_layout.py` 接手（它直接讀 town.js，圖與遊戲不可能走鐘），
   **這一支就要回收掉** —— 同一個拓樸不留兩份（鐵律 7）。同 map_fallen_draft.py。

⚠⚠⚠ 憲法 §「地圖的拓樸是 Ray 的設計，不是我的」（ver -907）：這一版是**提案**，
   要 Ray 看過、改過才算數。Ray 給的條件只有三句：**大型、20 格以上、
   大部份不見天光但要大要曠**。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

FONT = '/System/Library/Fonts/PingFang.ttc'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id → (欄, 列, 中文名, 種類)
#   kind: end=末端 / pass=過道 / hub=樞紐（3 向以上）/ gate=跨圖出口 / sky=降落
#   ⚠ 列越小＝越深（`up` 一律是「走進畫面裡」，不是「往高處」，憲法 §6.5.4）
NODES = {
  # ── 〇、地表（唯一見天光的一段）──────────────────────────────
  'sky'        : (4, 13, '天空\n（降落）', 'sky'),
  'gate'       : (4, 12, '墓門',           'end'),     # ☀ 露天
  'spiritway'  : (4, 11, '神道',           'hub'),
  'stelae'     : (2, 11, '碑林',           'end'),
  # ── 一、前殿層（環 A）────────────────────────────────────
  'antehall'   : (4, 10, '前殿',           'hub'),
  'guardroom'  : (2, 10, '甲士室',         'end'),
  'gal_east'   : (6, 10, '東廡',           'hub'),
  'armory'     : (8, 10, '兵器窖',         'end'),
  'greathall'  : (6,  8, '享堂',           'hub'),
  'gal_west'   : (4,  8, '西廡',           'hub'),
  'mural'      : (2,  8, '壁畫廊',         'end'),
  'offering'   : (8,  8, '供器室',         'end'),
  # ── 二、下沉段 ─────────────────────────────────────────
  'shaft'      : (6,  7, '天光井',         'pass'),    # ☀ 破口漏光
  'descent'    : (6,  6, '長階',           'hub'),
  'well'       : (4,  6, '枯井底',         'end'),
  # ── 三、玄宮層（環 B）────────────────────────────────────
  'crossvault' : (6,  5, '十字穹室',       'hub'),
  'pit'        : (4,  5, '盜洞',           'end'),     # ☀ 斜插下來的破口
  'gal_south'  : (8,  5, '南耳廊',         'hub'),
  'treasury'   : (10, 5, '寶器室',         'end'),
  'gal_north'  : (6,  3, '北耳廊',         'hub'),
  'chariot'    : (4,  3, '車馬坑',         'end'),
  'tombhall'   : (8,  3, '玄宮',           'hub'),
  'concubine'  : (10, 3, '陪葬坑',         'end'),
  'sarcophagus': (8,  2, '石棺台',         'end'),
}

# (a, b, a 這一端的方向) —— 另一端一定是相反方向（憲法 §6.5.4）
EDGES = [
  ('sky','gate','up'),
  ('gate','spiritway','up'),
  ('spiritway','stelae','left'), ('spiritway','antehall','up'),
  # 環 A：前殿 →(右) 東廡 →(上) 享堂 →(左) 西廡 →(下) 前殿
  ('antehall','gal_east','right'), ('gal_east','greathall','up'),
  ('greathall','gal_west','left'), ('gal_west','antehall','down'),
  ('antehall','guardroom','left'), ('gal_east','armory','right'),
  ('gal_west','mural','left'),     ('greathall','offering','right'),
  ('greathall','shaft','up'), ('shaft','descent','up'),
  ('descent','well','left'), ('descent','crossvault','up'),
  # 環 B：十字穹室 →(右) 南耳廊 →(上) 玄宮 →(左) 北耳廊 →(下) 十字穹室
  ('crossvault','gal_south','right'), ('gal_south','tombhall','up'),
  ('tombhall','gal_north','left'),    ('gal_north','crossvault','down'),
  ('crossvault','pit','left'), ('gal_south','treasury','right'),
  ('gal_north','chariot','left'), ('tombhall','concubine','right'),
  ('tombhall','sarcophagus','up'),
]

SUN = {'gate', 'shaft', 'pit'}          # ☀ 有室外光 → 要四時段差分

def main():
    err = []
    for a, b, d in EDGES:
        (ca, ra), (cb, rb) = NODES[a][:2], NODES[b][:2]
        if ca != cb and ra != rb: err.append('%s–%s 不是直線' % (a, b))
        ok = {'left': cb < ca, 'right': cb > ca, 'up': rb < ra, 'down': rb > ra}[d]
        if not ok: err.append('%s.%s→%s：方向與版面不符' % (a, d, b))
    # 自檢：同一格不可以有兩條同方向的出口
    seen = {}
    OPP = {'up':'down','down':'up','left':'right','right':'left'}
    for a, b, d in EDGES:
        for k, dd in ((a, d), (b, OPP[d])):
            if (k, dd) in seen: err.append('%s 有兩條 %s 出口（%s 與 %s）' % (k, dd, seen[(k,dd)], b if k==a else a))
            seen[(k, dd)] = b if k == a else a
    if err: [print('✗', e) for e in err]; sys.exit(1)

    CW, CH, BW, BH = 168, 116, 132, 82
    cols = [c for c,_,_,_ in NODES.values()]; rows = [r for _,r,_,_ in NODES.values()]
    cx = lambda c: 110 + (c - min(cols)) * CW
    cy = lambda r: 80 + (r - min(rows)) * CH
    W = cx(max(cols)) + BW//2 + 60; H = cy(max(rows)) + BH//2 + 60
    im = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    F  = ImageFont.truetype(FONT, 24, index=4)
    FS = ImageFont.truetype(FONT, 20, index=4)

    for a, b, _ in EDGES:
        (ca, ra), (cb, rb) = NODES[a][:2], NODES[b][:2]
        dash = (a == 'sky' or b == 'sky')
        if dash:
            x1, y1, x2, y2 = cx(ca), cy(ra), cx(cb), cy(rb)
            n = 12
            for i in range(0, n, 2):
                d.line([x1+(x2-x1)*i/n, y1+(y2-y1)*i/n,
                        x1+(x2-x1)*(i+1)/n, y1+(y2-y1)*(i+1)/n], fill=(20,20,20), width=5)
        else:
            d.line([cx(ca), cy(ra), cx(cb), cy(rb)], fill=(20,20,20), width=5)

    COL = {'hub':((232,168,56),(26,18,8)), 'sky':((255,255,255),(20,20,20)),
           'end':((20,20,20),(255,255,255)), 'pass':((90,90,96),(255,255,255))}
    for k, (c, r, nm, kind) in NODES.items():
        bg, fg = COL[kind]
        x, y = cx(c)-BW//2, cy(r)-BH//2
        d.rectangle([x, y, x+BW, y+BH], fill=bg, outline=(20,20,20), width=(3 if kind=='sky' else 0))
        L = nm.split('\n')
        for i, ln in enumerate(L):
            bb = d.textbbox((0,0), ln, font=F)
            d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+(i-(len(L)-1)/2)*30-(bb[3]-bb[1])/2-4), ln, font=F, fill=fg)
        if k in SUN:      # 有室外光的那幾格：右上角一顆琥珀色的小太陽（要四時段差分）
            sx, sy, rr = x+BW-19, y+19, 8
            d.ellipse([sx-rr, sy-rr, sx+rr, sy+rr], fill=(240,176,48), outline=(20,20,20), width=2)
            for t in range(8):
                import math
                ang = t*math.pi/4
                d.line([sx+math.cos(ang)*(rr+3), sy+math.sin(ang)*(rr+3),
                        sx+math.cos(ang)*(rr+7), sy+math.sin(ang)*(rr+7)], fill=(240,176,48), width=2)

    deg = {}
    for a, b, _ in EDGES:
        if 'sky' in (a, b): continue
        deg[a] = deg.get(a,0)+1; deg[b] = deg.get(b,0)+1
    dst = os.path.join(ROOT, 'resources', 'map', '_layout_tomb.png')
    im.save(dst)
    n = len(NODES)-1; e = len(EDGES)-1
    print('✓ 帝王墓遺跡（提案）：%d 格・%d 邊・環數 %d' % (n, e, e-n+1))
    ends = [v[2] for k,v in NODES.items() if deg.get(k)==1]
    hubs = [(v[2], deg[k]) for k,v in NODES.items() if deg.get(k,0)>=3]
    print('   末端 %d：%s' % (len(ends), '・'.join(ends)))
    print('   樞紐 %d：%s' % (len(hubs), '・'.join('%s(%d)'%h for h in hubs)))
    print('   有室外光（要四時段差分）%d：%s' % (len(SUN), '・'.join(NODES[k][2] for k in SUN)))
    print('   圖量：%d 格單張 ＋ %d 格 ×4 ＝ %d 張'
          % (n-len(SUN), len(SUN), (n-len(SUN)) + len(SUN)*4))
    print('   →', os.path.relpath(dst, ROOT))
main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/map_check2.py —— 小地圖交件檢查器（通用版，ver -1123）

    python3 tools/map_check2.py <地圖id> <地圖png>

`tools/map_check.py` 是木雅克神殿專用的（GRID／EDGES 寫死在檔裡）。這一支把那兩張表
換成**從資料算出來的**：

  · **邊** 從 `script/town.js` 讀（借 jsc，同 map_layout.py）—— 圖與遊戲不可能走鐘。
  · **預期座標** 從 `tools/map_layout.py` 的 `POS` 換算（同一份版面，鐵律 7）。

驗的三件事與舊版相同：
  ① 墨點找不找得到（侵蝕 2px，只有實心圓活得下來）
  ② 每一條邊的兩顆墨點在不在同一塊墨裡（連通元件；⚠ 判之前要膨脹 2px 封掉抗鋸齒縫）
  ③ 印出 `spots`（比例座標）—— **那是量出來的，不要用眼睛估**

⚠ 它驗不出「線接對了但接到別格」：那要靠 `_layout_<id>.png` 肉眼對一次。
"""
import sys, json, os, subprocess, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'
W, H = 1536, 1024

sys.path.insert(0, os.path.join(ROOT, 'tools'))
from map_layout import POS, load          # 同一份版面與同一支讀取器（鐵律 7）

def edges_of(T):
    N = T['nodes']; e = set()
    for nid, n in N.items():
        for d, to in (n.get('exits') or {}).items():
            if isinstance(to, str) and to in N:
                e.add(tuple(sorted((nid, to))))
    return sorted(e)

def label(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); parent = [0]
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[max(ra, rb)] = min(ra, rb)
    nxt = 1
    for y in range(h):
        row = mask[y]; prev = mask[y-1] if y else None
        for x in np.flatnonzero(row):
            ns = []
            if x and row[x-1]: ns.append(lab[y, x-1])
            if y:
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and prev[xx]: ns.append(lab[y-1, xx])
            if ns:
                m = min(ns); lab[y, x] = m
                for n in ns: union(m, n)
            else:
                lab[y, x] = nxt; parent.append(nxt); nxt += 1
    flat = np.array([find(i) if i else 0 for i in range(nxt)], np.int32)
    return flat[lab]

def main():
    town, src = sys.argv[1], sys.argv[2]
    T = load(town); N = T['nodes']; EDGES = edges_of(T)
    # ── 預期座標：優先讀 `_expect_<id>.json`（＝下給模型的那組比例座標，美術交件的一部分）
    #    ⚠⚠ 沒有它就從 POS 的格點推，但那只是**版面**、不是這張圖真正的構圖 ——
    #    圖一旦畫成蜿蜒或錯開，推出來的預期點會差好幾百 px，貪心配對就會配錯格
    #    （實測聖索菲亞第一版：midtown 被配到左上角的一塊撕邊，八條邊全報斷線）。
    expf = os.path.join(ROOT, 'resources', 'map', '_expect_%s.json' % town)
    if os.path.exists(expf):
        E = json.load(open(expf, encoding='utf-8'))
        miss = [k for k in N if k not in E]
        if miss: print('_expect 少了這幾格：', miss); sys.exit(1)
        fxy = lambda k: (E[k][0]*W, E[k][1]*H)
    else:
        pos_grid = POS[town]
        cols = [c for c, _ in pos_grid.values()]; rows = [r for _, r in pos_grid.values()]
        c0, c1, r0, r1 = min(cols), max(cols), min(rows), max(rows)
        fxy = lambda k: (W*(0.12 + 0.76*((pos_grid[k][0]-c0)/max(1, c1-c0))),
                         H*(0.12 + 0.76*((pos_grid[k][1]-r0)/max(1, r1-r0))))

    im = Image.open(src).convert('RGBA')
    if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
    g  = np.array(im.convert('L')).astype(np.int16)
    al = np.array(im.split()[3])
    ink = (g < 120) & (al > 200)
    print('墨像素 %.2f%%' % (ink.mean()*100))

    # ── 墨點：**在預期點附近找**，不要全圖抓候選再配對 ─────────────────
    #  ⚠⚠ 全圖抓候選＋貪心配對很脆弱：撕邊的焦痕、速寫記號裡的小圓都會變成假候選，
    #    一顆假的就把整串配歪（實測聖索菲亞：midtown 被配到左上角的撕邊，
    #    八條邊全報「沒接上」，而畫面上那八條線好端端地在）。
    #  現在的作法：模型是照我給的比例座標畫的，所以**在那一點的 ±R 視窗裡找最近的實心圓**。
    #  ⚠⚠ 墨點是**騎在線上**的，所以侵蝕 2px 常常把「點＋一段線」留成一條長條
    #    （實測聖索菲亞：騎在直向線上的 midtown／dock／inn／uptown 四顆全抓不到）。
    #    作法是**由淺而深逐級侵蝕**，取第一級「在預期點附近長得像圓」的那一塊 ——
    #    線越細，越早一級就斷掉；線越粗，多侵蝕兩級也能把它切開。
    LEVELS = ((5, 100), (7, 60), (9, 30), (11, 12))   # (侵蝕大小, 那一級的最小面積)
    cores = [(np.array(Image.fromarray((ink*255).astype(np.uint8))
                       .filter(ImageFilter.MinFilter(m))) > 127, amin) for m, amin in LEVELS]
    R = 90
    pos, missing = {}, []
    for k in N:
        ex, ey = fxy(k)
        x0, y0 = int(max(0, ex-R)), int(max(0, ey-R))
        best = None
        for core, amin in cores:
            sub = core[y0:int(ey+R), x0:int(ex+R)]
            if not sub.any(): continue
            lb = label(sub); ids, cnt = np.unique(lb[lb > 0], return_counts=True)
            for i_, area in zip(ids, cnt):
                if area < amin: continue          # ⚠ 面積門檻擋掉「速寫記號裡的小圓」
                ys, xs = np.where(lb == i_)
                w_, h_ = xs.max()-xs.min()+1, ys.max()-ys.min()+1
                if max(w_, h_) > 34 or not (0.55 <= w_/h_ <= 1.8): continue
                # ⚠ 要**實心**：墨點是塗滿的圓（填充率≈0.78），圖示裡的圓環／扣環不是。
                #   實測聖索菲亞：火槍的扳機護環被當成 Firearm 的墨點，那一條邊就報斷線。
                if area < 0.55*w_*h_: continue
                cxx, cyy = x0+xs.mean(), y0+ys.mean()
                d_ = ((cxx-ex)**2 + (cyy-ey)**2) ** .5
                if best is None or d_ < best[2]: best = (cxx, cyy, d_)
            if best is not None: break
        if best is None: missing.append(k)
        else: pos[k] = best
    print('找到墨點 %d / %d' % (len(pos), len(N)))
    if missing: print('⚠ 找不到墨點：', missing)
    if not pos: sys.exit(1)
    print('\n節點（離我下給模型的那一點最遠的排前面）：')
    for k in sorted(pos, key=lambda k: -pos[k][2]):
        x, y, d = pos[k]
        print('  %-12s (%6.1f,%6.1f)  偏離 %5.1f%s' % (k, x, y, d, '  ⚠' if d > 60 else ''))

    closed = np.array(Image.fromarray((ink*255).astype(np.uint8))
                      .filter(ImageFilter.MaxFilter(5))) > 127
    li = label(closed)
    def comp(k):
        x, y = int(round(pos[k][0])), int(round(pos[k][1]))
        v = li[y, x]
        if v: return v
        sub = li[max(0,y-6):y+7, max(0,x-6):x+7]; nz = sub[sub > 0]
        return int(np.bincount(nz).argmax()) if len(nz) else 0
    cid = {k: comp(k) for k in pos}

    def gap(a, b):
        """沿著兩顆墨點的直線取樣，回傳最長的連續缺口（px）。
           ⚠ 這是連通元件之外的**第二個訊號**：元件只回答「有沒有一條墨連著」，
             缺口回答「那條線是實的還是斷續的」——串珠狀的線兩者會分歧。"""
        (x1, y1, _), (x2, y2, _) = pos[a], pos[b]
        n = int(max(abs(x2-x1), abs(y2-y1))//2) or 1
        worst = run = 0
        for t in range(n+1):
            x, y = int(x1+(x2-x1)*t/n), int(y1+(y2-y1)*t/n)
            if ink[max(0,y-6):y+7, max(0,x-6):x+7].any(): run = 0
            else:
                run += 1; worst = max(worst, run)
        return worst*2

    print('\n邊的連通性：'); bad = []
    for a, b in EDGES:
        if a not in pos or b not in pos: bad.append((a,b)); print('  %-12s—%-12s ✘ 有一端沒找到墨點'%(a,b)); continue
        conn = bool(cid.get(a) == cid.get(b) and cid.get(a))
        gp = gap(a, b)
        # ⚠⚠ **判準是「同一塊墨」，缺口只是參考**：缺口是沿**直線**取樣量的，
        #    路畫成蜿蜒的（石製遺蹟那張）時，直線本來就會走到紙上 —— 那是誤判。
        #    缺口真正有用的時候是「直線邊卻量到大缺口」，那代表線被速寫記號蓋斷了。
        if not conn: bad.append((a, b))
        note = '' if gp < 25 else ('  ← 缺口 %dpx：若這條是直線邊，多半是被速寫記號蓋斷' % gp)
        print('  %-12s—%-12s %s%s' % (a, b, '連通' if conn else '✘ 沒接上', note))
    groups = {}
    for k, v in cid.items(): groups.setdefault(v, []).append(k)
    print('\n墨塊分群（正常應該只有一群）：')
    for v, ks in sorted(groups.items(), key=lambda t: -len(t[1])):
        print('  塊 %-6d %2d 格: %s' % (v, len(ks), ' '.join(sorted(ks))))

    spots = {k: [round(float(v[0])/W, 4), round(float(v[1])/H, 4)] for k, v in pos.items()}
    out = os.path.join(ROOT, 'resources', 'map', '_spots_%s.json' % town)
    open(out, 'w', encoding='utf-8').write(json.dumps(spots, ensure_ascii=False, indent=2))
    print('\n→ ' + out)

    ov = im.convert('RGB'); d = ImageDraw.Draw(ov)
    for a, b in EDGES:
        if a not in pos or b not in pos: continue
        col = (255, 0, 0) if (a, b) in bad else (0, 150, 255)
        d.line([pos[a][0], pos[a][1], pos[b][0], pos[b][1]], fill=col, width=3)
    for k, (x, y, _) in pos.items():
        d.ellipse([x-15, y-15, x+15, y+15], outline=(255, 0, 0), width=3)
    ov.save(os.path.join(ROOT, 'resources', 'map', '_check_%s.jpg' % town), quality=88)
    print('斷線:', bad if bad else '無')

main()

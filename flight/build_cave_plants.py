"""地底的九種發光植物（ver -2369，Ray：「發光植物先給 GPT 設計九種九宮格，再用程式拆成 3D 物件」）

輸入：GPT 交的 3×3 九宮格（真 alpha），原圖放 resources/_originals/cave/cave_plants_grid.png。
輸出：flight/cave/cave_plants.webp —— 3×3 的圖集，每格 512²，植物縮到格子裡、根部貼底（垂掛的那一種貼頂）；
      以及寫回 index.html 的 CAVE_PLANT_ART（每一種在格子裡實際佔的寬高比例、掛在天頂與否）。
飛行頁把每一株做成三片十字交叉的插片（見 glDrawCavePlants）。

切法：不信九宮格的等分線（GPT 不保證對齊），用 alpha 的行列投影找出兩道最空的縫。
"""
import json, os, re, sys
import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'resources', '_originals', 'cave', 'cave_plants_grid.png')
OUT = os.path.join(HERE, 'cave', 'cave_plants.webp')
CELL = 512
HANG = {2}          # 垂掛的發光藤：掛在天頂（第 3 格）

a = np.array(Image.open(SRC).convert('RGBA'))
H, W = a.shape[:2]
al = a[..., 3].astype(np.float32)

def cuts(proj, n):
    """在 1/3、2/3 附近各找一道最空的縫"""
    out = []
    L = len(proj)
    for k in range(1, n):
        c = L * k // n
        lo, hi = c - L // 8, c + L // 8
        seg = proj[lo:hi]
        m = seg.min()
        idx = np.where(seg <= m + 1e-3)[0]
        out.append(lo + int(idx[len(idx) // 2]))
    return [0] + out + [L]

xs = cuts(al.sum(0), 3)
ys = cuts(al.sum(1), 3)
atlas = np.zeros((CELL * 3, CELL * 3, 4), np.uint8)
meta = []
# 依「連通塊」分格，不依格線切：鄰格的傘可以跨過縫（實測第 1 格那朵巨蕈的傘伸進第 2 格）。
# 先膨脹一點把同一株的細碎部位黏成一塊，再看每一塊的重心落在哪一格。
solid = (al > 6).astype(np.uint8)
grp = cv2.dilate(solid, np.ones((9, 9), np.uint8))
nlab, lab, st, cen = cv2.connectedComponentsWithStats(grp, 8)
owner = np.zeros(nlab, np.int32) - 1
for k in range(1, nlab):
    cx, cy = cen[k]
    cc = min(2, int(np.searchsorted(xs, cx, 'right') - 1)); rr = min(2, int(np.searchsorted(ys, cy, 'right') - 1))
    owner[k] = rr * 3 + cc
for r in range(3):
    for c in range(3):
        i = r * 3 + c
        keep = np.isin(lab, np.where(owner == i)[0]) & (solid > 0)
        yy, xx = np.where(keep)
        y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
        crop = a[y0:y1, x0:x1].copy()
        crop[~keep[y0:y1, x0:x1]] = 0
        ch, cw = crop.shape[:2]
        s = (CELL - 8) / max(ch, cw)
        nw, nh = max(1, round(cw * s)), max(1, round(ch * s))
        sm = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA)
        # 透明處的顏色往外擴（線性取樣時邊緣不會滲出黑邊）
        rgb = sm[..., :3].copy(); am = sm[..., 3]
        hole = (am < 8).astype(np.uint8)
        if hole.any() and hole.mean() < 1:
            rgb = cv2.inpaint(rgb, hole, 3, cv2.INPAINT_TELEA)
        sm = np.dstack([rgb, am])
        ox = (CELL - nw) // 2
        oy = 4 if i in HANG else CELL - 4 - nh
        atlas[r * CELL + oy:r * CELL + oy + nh, c * CELL + ox:c * CELL + ox + nw] = sm
        # 格內 uv（0~1）：左右、上下；寬高比（寬/高）
        meta.append([round(ox / CELL, 4), round(oy / CELL, 4), round((ox + nw) / CELL, 4), round((oy + nh) / CELL, 4),
                     round(cw / ch, 3), 1 if i in HANG else 0])

Image.fromarray(atlas, 'RGBA').save(OUT, 'WEBP', quality=88, method=6)
print('cuts x', xs, 'y', ys, '→', OUT, os.path.getsize(OUT) // 1024, 'KB')
for i, m in enumerate(meta): print(i, m)

import hashlib
hv = hashlib.md5(open(OUT, 'rb').read()).hexdigest()[:8]
html = os.path.join(HERE, 'index.html')
s = open(html, encoding='utf-8').read()
line = "const CAVE_PLANT_ART = {v:'%s', cells:%s};   // [u0,v0,u1,v1,寬高比,掛天頂]（build_cave_plants.py 寫回）\n" % (hv, json.dumps(meta, separators=(',', ':')))
if 'const CAVE_PLANT_ART = ' in s:
    s = re.sub(r"const CAVE_PLANT_ART = .*?\n", lambda m: line, s, count=1)
else:
    s = s.replace('const CAVE_ALT = ', line + 'const CAVE_ALT = ', 1)
open(html, 'w', encoding='utf-8').write(s)

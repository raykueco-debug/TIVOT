#!/usr/bin/env python3
"""小地圖交件檢查器 —— 找 22 顆墨點，並用**連通元件**判斷每一條邊有沒有真的接上。

為什麼不是沿線取樣：取樣窗只要放到 ±11px 就會把**標籤的墨**算進去，
於是「線斷了、但字剛好落在缺口上」會被判成 100% 有墨（v4 實測就是這樣騙過我）。
連通元件問的是「這兩顆墨點之間有沒有一條連續的墨」，那才是要驗的事。

墨點偵測用**侵蝕**：實心圓點侵蝕 2px 還在，細線與文字筆畫會消失。

用法： python3 mapcheck.py <地圖png>
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1536, 1024
COLS, ROWS = 7, 7
X0, Y0 = 128, 96
DX = (W - 2 * X0) / (COLS - 1)
DY = (H - 2 * Y0) / (ROWS - 1)

GRID = {
    'darkbridge': (6, 0), 'deepaltar': (1, 1), 'deepspring': (5, 1), 'rift': (6, 1),
    'bridge': (1, 2), 'colossus': (2, 2), 'machine': (3, 2), 'prison': (4, 2),
    'hollow': (5, 2), 'mosschamber': (6, 2),
    'collapsed': (0, 3), 'brazier': (1, 3), 'well': (2, 3), 'catacomb': (5, 3),
    'mural': (0, 4), 'stairup': (1, 4), 'crossway': (2, 4), 'stairdeep': (5, 4),
    'corridora': (2, 5), 'antechamber': (3, 5), 'corridorb': (5, 5),
    'entrance': (3, 6),
}
EDGES = [
    ('entrance', 'antechamber'), ('antechamber', 'corridora'), ('corridora', 'crossway'),
    ('crossway', 'well'), ('crossway', 'stairup'), ('stairup', 'brazier'),
    ('brazier', 'collapsed'), ('collapsed', 'mural'),
    ('brazier', 'bridge'), ('bridge', 'deepaltar'),
    ('brazier', 'colossus'), ('colossus', 'machine'),
    ('antechamber', 'corridorb'), ('corridorb', 'stairdeep'),
    ('stairdeep', 'catacomb'), ('catacomb', 'hollow'),
    ('hollow', 'prison'), ('hollow', 'deepspring'),
    ('hollow', 'mosschamber'), ('mosschamber', 'rift'), ('rift', 'darkbridge'),
]


def label(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    nxt = 1
    for y in range(h):
        row = mask[y]
        prev = mask[y - 1] if y else None
        for x in np.flatnonzero(row):
            ns = []
            if x and row[x - 1]:
                ns.append(lab[y, x - 1])
            if y:
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and prev[xx]:
                        ns.append(lab[y - 1, xx])
            if ns:
                m = min(ns)
                lab[y, x] = m
                for n in ns:
                    union(m, n)
            else:
                lab[y, x] = nxt
                parent.append(nxt)
                nxt += 1
    flat = np.array([find(i) if i else 0 for i in range(nxt)], np.int32)
    return flat[lab]


src = sys.argv[1]
im = Image.open(src).convert('RGBA')
if im.size != (W, H):
    im = im.resize((W, H), Image.LANCZOS)
g = np.array(im.convert('L')).astype(np.int16)
al = np.array(im.split()[3])
ink = (g < 120) & (al > 200)
print('墨像素 %.2f%%' % (ink.mean() * 100))

# ── 1) 墨點：侵蝕 2px，只有實心圓活得下來 ──
core = np.array(Image.fromarray((ink * 255).astype(np.uint8))
                .filter(ImageFilter.MinFilter(5))) > 127
lc = label(core)
ids, cnt = np.unique(lc[lc > 0], return_counts=True)
cands = []
for i, area in zip(ids, cnt):
    if area < 20:
        continue
    ys, xs = np.where(lc == i)
    w_, h_ = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    if max(w_, h_) > 26 or not (0.6 <= w_ / h_ <= 1.67):
        continue
    cands.append((xs.mean(), ys.mean(), area))
print('侵蝕後的實心圓候選', len(cands))

names = list(GRID)
exp = np.array([[X0 + GRID[k][0] * DX, Y0 + GRID[k][1] * DY] for k in names])
got = np.array([[c[0], c[1]] for c in cands])
cost = np.linalg.norm(exp[:, None, :] - got[None, :, :], axis=2)
pos, used = {}, set()
for r in sorted(range(len(names)), key=lambda r: cost[r].min()):
    for c in np.argsort(cost[r]):
        if c not in used:
            used.add(c)
            pos[names[r]] = (got[c][0], got[c][1], cost[r][c])
            break
missing = [k for k in names if k not in pos]
if missing:
    print('⚠ 找不到墨點：', missing)

print('\n節點（離預期格點最遠的排前面）：')
for k in sorted(pos, key=lambda k: -pos[k][2]):
    x, y, d = pos[k]
    print('  %-12s (%6.1f,%6.1f)  偏離 %5.1f%s' % (k, x, y, d, '  ⚠' if d > 180 else ''))

# ── 2) 連通性：這兩顆墨點在不在同一塊墨裡 ──
# ⚠ 判連通之前要**輕微膨脹**：墨點與線之間常有 1~2px 的抗鋸齒縫（肉眼完全看不出），
#   不封起來的話每個節點都會自成一塊。真正的斷線是 40~70px，膨脹 2px 封不到。
closed = np.array(Image.fromarray((ink * 255).astype(np.uint8))
                  .filter(ImageFilter.MaxFilter(5))) > 127
li = label(closed)


def comp(k):
    x, y = int(round(pos[k][0])), int(round(pos[k][1]))
    v = li[y, x]
    if v:
        return v
    sub = li[max(0, y - 6):y + 7, max(0, x - 6):x + 7]
    nz = sub[sub > 0]
    return int(np.bincount(nz).argmax()) if len(nz) else 0


cid = {k: comp(k) for k in pos}
print('\n邊的連通性：')
bad = []
for a, b in EDGES:
    ok = cid[a] == cid[b] and cid[a] != 0
    if not ok:
        bad.append((a, b))
    print('  %-12s—%-12s %s' % (a, b, '連通' if ok else '✘ 沒接上'))

groups = {}
for k, v in cid.items():
    groups.setdefault(v, []).append(k)
print('\n墨塊分群（正常應該只有一群）：')
for v, ks in sorted(groups.items(), key=lambda t: -len(t[1])):
    print('  塊 %-6d %2d 格: %s' % (v, len(ks), ' '.join(sorted(ks))))

spots = {k: [round(float(v[0]) / W, 4), round(float(v[1]) / H, 4)] for k, v in pos.items()}
print('\nspots = ' + json.dumps(spots, ensure_ascii=False))

ov = im.convert('RGB')
d = ImageDraw.Draw(ov)
for a, b in EDGES:
    col = (255, 0, 0) if (a, b) in bad else (0, 150, 255)
    d.line([pos[a][0], pos[a][1], pos[b][0], pos[b][1]], fill=col, width=3)
for k, (x, y, _) in pos.items():
    d.ellipse([x - 15, y - 15, x + 15, y + 15], outline=(255, 0, 0), width=3)
ov.save('mapcheck_overlay.jpg', quality=88)
print('\n斷線:', bad if bad else '無')

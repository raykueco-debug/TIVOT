#!/usr/bin/env python3
"""城鎮小地圖檢查器：找墨點、驗連通、印 spots。

用法： python3 citycheck.py <city> <map.png>
判連通的膨脹量**用掃的看拐點**（見 _map_spec.md）：
  9 以內就全部連成一群 ＝ 那些只是手繪斷點；要 20 以上才收斂 ＝ 真的斷了。
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, '.')
W, H = 1536, 1024


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


city, src = sys.argv[1], sys.argv[2]
src_mod = open('mkfeed_city.py').read()
ns = {}
exec(src_mod.split('name = sys.argv[1]')[0].replace('import sys, json', 'import json'), ns)
C = ns['CITY'][city]
plan = json.load(open(f'plan_{city}.json'))
outside = set(C.get('outside', ()))

im = Image.open(src).convert('RGBA')
if im.size != (W, H):
    im = im.resize((W, H), Image.LANCZOS)
g = np.array(im.convert('L')).astype(np.int16)
al = np.array(im.split()[3])
ink = (g < 120) & (al > 200)
print('墨像素 %.2f%%' % (ink.mean() * 100))

core = np.array(Image.fromarray((ink * 255).astype(np.uint8))
                .filter(ImageFilter.MinFilter(5))) > 127
lc = label(core)
ids, cnt = np.unique(lc[lc > 0], return_counts=True)
cands = []
for i, area in zip(ids, cnt):
    if area < 18:
        continue
    ys, xs = np.where(lc == i)
    w_, h_ = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    if max(w_, h_) > 30 or not (0.6 <= w_ / h_ <= 1.67):
        continue
    cands.append((xs.mean(), ys.mean()))
got = np.array(cands)
print('圓點候選', len(cands))

names = list(plan)
exp = np.array([[plan[k][0] * W, plan[k][1] * H] for k in names])
cost = np.linalg.norm(exp[:, None, :] - got[None, :, :], axis=2)
pos, used = {}, set()
for r in sorted(range(len(names)), key=lambda r: cost[r].min()):
    for c in np.argsort(cost[r]):
        if c not in used:
            used.add(c)
            pos[names[r]] = (got[c][0], got[c][1], cost[r][c])
            break
print('\n節點（偏離預期格點，>150 要人工確認）：')
for k in sorted(pos, key=lambda k: -pos[k][2]):
    x, y, d = pos[k]
    print('  %-12s (%6.1f,%6.1f)  %5.1f%s' % (k, x, y, d, '  ⚠' if d > 150 else ''))

print('\n連通性（掃膨脹量找拐點）：')
knee = None
for k in (5, 7, 9, 11, 15, 21):
    cl = np.array(Image.fromarray((ink * 255).astype(np.uint8))
                  .filter(ImageFilter.MaxFilter(k))) > 127
    li = label(cl)
    cid = {n: int(li[int(round(pos[n][1])), int(round(pos[n][0]))]) for n in pos}
    bad = [(a, b) for a, b in C['edges'] if cid[a] != cid[b] or cid[a] == 0]
    print('  MaxFilter(%2d)  斷 %2d 條  分 %d 群%s'
          % (k, len(bad), len(set(cid.values())), '   ← 拐點' if not bad and knee is None else ''))
    if not bad and knee is None:
        knee = k
    if k == 21 and bad:
        print('    ⚠ 到 21 還斷：', bad)
print('拐點 =', knee, '（≤9 正常；>11 表示真的有斷線）')

spots = {k: [round(float(v[0]) / W, 4), round(float(v[1]) / H, 4)]
         for k, v in pos.items() if k not in outside}
print('\nspots(%d) = %s' % (len(spots), json.dumps(spots, ensure_ascii=False)))

ov = im.convert('RGB')
d = ImageDraw.Draw(ov)
from PIL import ImageFont
f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 15)
for a, b in C['edges']:
    d.line([pos[a][0], pos[a][1], pos[b][0], pos[b][1]], fill=(0, 150, 255), width=2)
for k, (x, y, _) in pos.items():
    d.ellipse([x - 15, y - 15, x + 15, y + 15], outline=(255, 0, 0), width=3)
    d.text((x + 17, y - 8), k, font=f, fill=(210, 0, 0))
ov.save(f'check_{city}.jpg', quality=88)
print('疊圖 check_%s.jpg' % city)

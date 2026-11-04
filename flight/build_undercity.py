#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""地下古城的地圖產生器（ver -2399）。

Ray：「按照大溶洞的方式做一個地下古城」
     「但是風格與溶洞不同，以岩洞通道為主，先不指定（入口），沒有發光植物跟胞子、地下湖等，
       比較像是風蝕迴廊，但各腔室還是要有一些有辨識度的場景，穿過迴廊抵達巨大腔室，地面是地下都市」

⇒ 與 build_cave.py 同一套輸出格式（飛行頁同一支地底引擎讀，`?world=undercity`）：
    undercity/cave_hm.png   R＝地面高度/8、G＝天頂高度/8（255＝天頂的洞）、B＝發光（這裡一律 0）
    undercity/cave_aux.png  R＝光柱遮罩、G＝溢光（這裡是暖色：天光的反光＋城裡的燈）、B＝地貌類別
    undercity/cave_col.png  地面顏色（砂岩）
    undercity/world.js      window.UNDERCITY_DATA＝{v, start, rooms, exit, city}（飛行頁只在 ?world=undercity 時載入）

    D 入口豎井 ── 石柱廳 ─────────── 迴廊盡頭（死路）
         │
       天光裂隙
         │
       層岩高廳 ── 風穴（死路）
         │
       崩落廳 ── 拱門峽 ── 斷橋深谷 ── 地下都市（巨大腔室）

⚠ 尺度同大溶谷：768² 排好、輸出前加密成 1536²（飛行頁地底 MAP_SCALE＝10）。
⚠ 船的定高、岩層、地面與天頂的編碼與 build_cave.py 相同（改一邊要改另一邊）。
用法：python flight/build_undercity.py
"""
import hashlib, json, math, os, re
import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'undercity')
N = 768
SEED = 2399
rng = np.random.default_rng(SEED)
FLOOR_SCALE = 8; CEIL_SCALE = 8; HOLE = 255
ZOFF = 400                     # ＝ build_cave.py
ALT = 700 + ZOFF               # 船的定高 ＝ flight/index.html 的 CAVE_ALT
SOLID = 1900
SLAB = 1700                    # ＝ flight/index.html 的 CAVE_SLAB
WALL_W = 7
CITY = 'Z'

# 鍵 → 位置／大小／地面／天頂／場景
ROOMS = {
    'A': dict(no=1, x=90,  y=690, a=46, b=42, rot=0,   floor=330, ceil=950,  name='入口豎井'),
    'B': dict(no=2, x=240, y=600, a=62, b=48, rot=-20, floor=300, ceil=1050, pillars=11, name='石柱廳'),
    'C': dict(no=3, x=105, y=440, a=72, b=42, rot=75,  floor=320, ceil=1150, slit=1, name='天光裂隙'),
    'E': dict(no=4, x=150, y=205, a=60, b=50, rot=10,  floor=200, ceil=1500, strata=1, name='層岩高廳'),
    'F': dict(no=5, x=360, y=110, a=64, b=46, rot=-10, floor=300, ceil=1100, boulders=14, name='崩落廳'),
    'D': dict(no=6, x=585, y=115, a=66, b=44, rot=15,  floor=300, ceil=1300, arch=1, name='拱門峽'),
    'G': dict(no=7, x=690, y=320, a=56, b=52, rot=80,  floor=320, ceil=1150, chasm=1, name='斷橋深谷'),
    'H': dict(no=8, x=305, y=330, a=50, b=42, rot=30,  floor=280, ceil=1050, pores=7, name='風穴'),
    'I': dict(no=9, x=430, y=720, a=44, b=40, rot=0,   floor=300, ceil=980,  name='迴廊盡頭'),
    'Z': dict(no=10, x=470, y=500, a=150, b=128, rot=-8, floor=120, ceil=1650, city=1, holes=3, name='地下都市'),
}
LINKS = [('A', 'B', 14), ('B', 'C', 13), ('C', 'E', 14), ('E', 'F', 14), ('F', 'D', 15),
         ('D', 'G', 14), ('G', 'Z', 17), ('B', 'I', 12), ('E', 'H', 12)]

YY, XX = np.mgrid[0:N, 0:N].astype(np.float32)
def fbm(n, octaves=5, base=64, persistence=0.5):
    out = np.zeros((n, n), np.float32); amp, tot, cell = 1.0, 0.0, base
    for _ in range(octaves):
        g = max(2, n // cell + 2)
        grid = rng.random((g, g)).astype(np.float32)
        out += cv2.resize(grid, (n + cell, n + cell), interpolation=cv2.INTER_CUBIC)[:n, :n] * amp
        tot += amp; amp *= persistence; cell = max(2, cell // 2)
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)
def disc(cx, cy, r, soft=1.0):
    return np.clip((1 - np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) / r) / soft, 0, 1)
def seg_dist(ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = np.clip(((XX - ax) * vx + (YY - ay) * vy) / (vx * vx + vy * vy + 1e-9), 0, 1)
    return np.sqrt((XX - ax - t * vx) ** 2 + (YY - ay - t * vy) ** 2)
def room_uv(R):
    c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    return ((XX - R['x']) * c + (YY - R['y']) * s) / R['a'], (-(XX - R['x']) * s + (YY - R['y']) * c) / R['b']

wob = (fbm(N, 4, 28, 0.55) - 0.5) * 2
scal = (fbm(N, 3, 7, 0.5) - 0.5) * 2             # 風蝕的扇貝：高頻、淺
room_f = {}
for k, R in ROOMS.items():
    u, v = room_uv(R)
    w = 0.10 if R.get('city') else 0.28
    room_f[k] = (1 + w * wob + 0.06 * scal - np.sqrt(u * u + v * v)) * R['b']
best = np.full((N, N), -1e9, np.float32); owner = np.full((N, N), '', object)
for k, f in room_f.items():
    m = f > best; owner[m] = k; best = np.where(m, f, best)
in_room = best > 0

# ── 風蝕迴廊：蛇行的多段折線，壁面扇貝狀 ─────────────────────────────
tunnel_f = np.full((N, N), -1e9, np.float32)
for a, b, hw in LINKS:
    ax, ay, bx, by = ROOMS[a]['x'], ROOMS[a]['y'], ROOMS[b]['x'], ROOMS[b]['y']
    L = math.hypot(bx - ax, by - ay); nx, ny = -(by - ay) / L, (bx - ax) / L
    amp, ph, nseg = rng.uniform(0.06, 0.13) * L, rng.uniform(0, 6.28), 7
    pts = []
    for i in range(nseg + 1):
        t = i / nseg
        o = math.sin(t * math.pi * rng.uniform(1.6, 2.4) + ph) * amp * math.sin(t * math.pi)
        pts.append((ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o))
    d = np.full((N, N), 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(x0, y0, x1, y1))
    tunnel_f = np.maximum(tunnel_f, hw * (1 + 0.32 * wob + 0.18 * scal) - d)
openm = (best > 0) | (tunnel_f > 0)
dist = cv2.distanceTransform(openm.astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)

def field(key, default):
    num = np.zeros((N, N), np.float32); den = np.zeros((N, N), np.float32)
    for k, R in ROOMS.items():
        dd = np.sqrt((XX - R['x']) ** 2 + (YY - R['y']) ** 2) / max(R['a'], R['b'])
        w = 1.0 / (dd ** 4 + 1e-3); num += w * R.get(key, default); den += w
    return num / den
floor_base = field('floor', 300) + ZOFF
ceil_top = field('ceil', 1000) + ZOFF
roomness = np.clip(best / 12.0, 0, 1)

# 地面：風吹出的沙紋＋緩起伏；迴廊天頂壓低成管狀
dune = np.sin((XX * 0.8 + YY * 0.45) * 0.55 + fbm(N, 3, 32, 0.5) * 6) * 9
floor = floor_base + (fbm(N, 5, 80, 0.5) - 0.5) * 90 + dune
ceil = ceil_top * roomness + (ALT + 230 + (fbm(N, 3, 40, 0.5) - 0.5) * 120) * (1 - roomness)
ceil = ceil - fbm(N, 4, 24, 0.55) * 90 * roomness

pillar_core = np.zeros((N, N), bool)
holes = []
chasm = np.zeros((N, N), np.float32)
strata_k = np.zeros((N, N), np.float32)
for k, R in ROOMS.items():
    rmask = owner == k
    u, v = room_uv(R)
    def inside(n, margin=0.8, sep=10):
        out = []
        for _ in range(n * 60):
            ang, rr = rng.uniform(0, 6.283), math.sqrt(rng.uniform(0, 1)) * margin
            c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
            lu, lv = math.cos(ang) * rr * R['a'], math.sin(ang) * rr * R['b']
            px, py = R['x'] + lu * c - lv * s, R['y'] + lu * s + lv * c
            if all(math.hypot(px - qx, py - qy) > sep for qx, qy in out):
                out.append((px, py))
            if len(out) >= n: break
        return out
    if k == 'A':                                   # 進出口：正上方的天井（＝起點）
        holes.append((R['x'], R['y'], R['b'] * 0.46))
    for px, py in inside(R.get('pillars', 0), 0.78, 13):     # 風蝕石柱：腰細頭粗的岩柱（高度圖裡是實心柱＋腳下的岩裙）
        r = rng.uniform(3.2, 6.5)
        pillar_core |= disc(px, py, r * (1 + 0.25 * wob[int(py), int(px)]), 0.3) > 0.5
        fl = disc(px, py, r * 2.3, 1.0) ** 2
        floor = floor + fl * rng.uniform(60, 140); ceil = ceil - fl * rng.uniform(80, 180)
    if R.get('slit'):                              # 天光裂隙：沿長軸一道細縫
        c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
        for i in range(-12, 13):
            t = i / 12 * 0.75
            holes.append((R['x'] + c * t * R['a'] + s * math.sin(i * 0.7) * 2, R['y'] + s * t * R['a'] - c * math.sin(i * 0.7) * 2, 2.6))
    if R.get('strata'):
        strata_k = np.maximum(strata_k, rmask * 1.0)
    for px, py in inside(R.get('boulders', 0), 0.8, 9):      # 落石
        floor = floor + disc(px, py, rng.uniform(4, 8), 0.5) * rng.uniform(120, 260)
    if R.get('arch'):                              # 天然石拱：一道低垂的岩樑橫過頭頂
        band = np.clip(1 - np.abs(u) / 0.13, 0, 1) * rmask
        ceil = ceil * (1 - band) + np.minimum(ceil, ALT + 110) * band
    if R.get('chasm'):                             # 斷橋深谷：整間裂開，中間留一道石脊
        cm = np.clip((np.sqrt(u * u + v * v) < 0.92) * 1.0 - np.clip(1 - np.abs(v) / 0.10, 0, 1) * 1.6, 0, 1) * rmask
        chasm = np.maximum(chasm, cm)
    for px, py in inside(R.get('pores', 0), 0.75, 8):         # 風穴：天頂一堆小孔
        holes.append((px, py, rng.uniform(1.6, 3.0)))
    if R.get('city'):
        for px, py in inside(R.get('holes', 0), 0.55, 40):
            holes.append((px, py, rng.uniform(5, 9)))
        cityflat = np.clip(best / 10.0, 0, 1) * rmask
        floor = floor * (1 - cityflat) + (R['floor'] + ZOFF) * cityflat   # 都市的地面是平的（鋪過的）

floor = np.clip(floor, 40 + ZOFF, ALT - 90)
floor = floor * (1 - chasm) + (60 + fbm(N, 4, 40, 0.5) * 120) * chasm
ceil = np.maximum(ceil, ALT + 90)
hole = np.zeros((N, N), np.float32)
for hx, hy, hr in holes:
    hole = np.maximum(hole, disc(hx, hy, hr * (1 + 0.18 * wob[min(N - 1, int(hy)), min(N - 1, int(hx))]), 0.15))
holemask = (hole > 0.5) & openm
t = np.clip(dist / WALL_W, 0, 1); t = t * t * (3 - 2 * t)
floor = SOLID * (1 - t) + floor * t
ceil = SOLID * (1 - t) + ceil * t
solid = ~openm | pillar_core
floor[solid] = SOLID; ceil[solid] = SOLID

# ── 地下都市：建築清單（飛行頁畫成 3D）＋街道 ─────────────────────────────
Rz = ROOMS[CITY]
cz, sz_ = math.cos(math.radians(Rz['rot'])), math.sin(math.radians(Rz['rot']))
CELLP = 9.0                                     # 一個街區（像素）
CITYL = []
gfloor = Rz['floor'] + ZOFF
for i in range(-18, 19):
    for j in range(-16, 17):
        lu, lv = (i + 0.5) * CELLP, (j + 0.5) * CELLP
        px, py = Rz['x'] + lu * cz - lv * sz_, Rz['y'] + lu * sz_ + lv * cz
        if not (0 <= px < N and 0 <= py < N): continue
        if owner[int(py), int(px)] != CITY or best[int(py), int(px)] < 14: continue
        if abs(j) <= 0 or abs(i) <= 0: continue                          # 十字大道
        r0 = math.hypot(lu / Rz['a'], lv / Rz['b'])
        if r0 < 0.16: continue                                            # 中央廣場（神殿另外放）
        if rng.random() < 0.12: continue                                  # 空地
        kind = 0
        rr = rng.random()
        if rr < 0.07: kind = 1                                            # 塔（少）
        elif rr < 0.42: kind = 3                                          # 坍塌（古城：殘垣多）
        w = rng.uniform(4.4, 6.8); d = rng.uniform(4.4, 6.8)
        # ⚠ 高度上限：塔＋尖頂（×1.35）要低於船的航高（ALT−60），不然船從塔頂穿過去；古城也不該是摩天樓
        h = {0: rng.uniform(70, 210) * (1.1 - 0.4 * r0), 1: rng.uniform(230, 330), 3: rng.uniform(25, 90)}[kind]
        CITYL.append([round(px * 20), round(py * 20), round(w * 20), round(d * 20), round(h), round(Rz['rot'], 1), kind, round(float(rng.random()), 3), gfloor])
for lvl, (w, h) in enumerate([(26, 120), (19, 110), (12, 100), (6, 120)]):   # 中央的階梯神殿：四層往上收
    CITYL.append([Rz['x'] * 20, Rz['y'] * 20, w * 20, w * 20, h, Rz['rot'], 2, lvl, gfloor + sum(x[1] for x in [(26, 120), (19, 110), (12, 100), (6, 120)][:lvl])])

# ── 光：天光的反光、城裡零星的燈（暖色溢光）─────────────────────────────
shaft = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 3.5); shaft /= (shaft.max() + 1e-6)
lamps = np.zeros((N, N), np.float32)
for b in CITYL:
    if b[6] in (0, 1) and b[7] < 0.22:
        lamps = np.maximum(lamps, disc(b[0] / 20, b[1] / 20, 7, 1.0))
spill = cv2.GaussianBlur(holemask.astype(np.float32) * 0.8 + lamps * 0.6, (0, 0), 9); spill /= (spill.max() + 1e-6)
spill = np.clip(spill * 1.2, 0, 1) * (~solid)

# ── 顏色：砂岩（赭黃～褐），岩層一層一層；都市地面＝鋪石＋街道 ───────────────
tone = fbm(N, 5, 24, 0.55)[..., None]
sandA = np.array([176, 140, 100], np.float32); sandB = np.array([132, 100, 74], np.float32)
col = sandB * (1 - tone) + sandA * tone
ripple = (0.5 + 0.5 * np.sin((XX * 0.8 + YY * 0.45) * 1.1))[..., None]
col = col * (0.92 + 0.08 * ripple)
lit = np.clip(cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 8)[..., None] * 2.0, 0, 1)
col = col * (1 - lit) + np.array([210, 180, 136], np.float32) * lit
cityk = (owner == CITY) & (best > 8)
lu = (XX - Rz['x']) * cz + (YY - Rz['y']) * sz_; lv = -(XX - Rz['x']) * sz_ + (YY - Rz['y']) * cz
street = ((np.abs((lu / CELLP) - np.round(lu / CELLP)) < 0.16) | (np.abs((lv / CELLP) - np.round(lv / CELLP)) < 0.16) |
          (np.abs(lu) < 2.2) | (np.abs(lv) < 2.2))
pave = np.array([150, 132, 110], np.float32); road = np.array([118, 104, 88], np.float32)
col[cityk] = np.where(street[cityk][..., None], road, pave * (0.9 + 0.2 * tone[cityk]))
col[solid] = sandB * 0.85
col = np.clip(col, 0, 255).astype(np.uint8)
geo = np.where(tone[..., 0] > 0.5, 3, 2).astype(np.uint8)
geo[lit[..., 0] > 0.5] = 1
geo[cityk] = 2
geo[solid] = 3

# ── 加密（同 build_cave.py）───────────────────────────────────────────
SUPER = 2; N2 = N * SUPER
def up(a, it=cv2.INTER_CUBIC): return cv2.resize(a.astype(np.float32), (N2, N2), interpolation=it)
def upn(a): return cv2.resize(a.astype(np.uint8), (N2, N2), interpolation=cv2.INTER_NEAREST)
tt = np.clip(up(t, cv2.INTER_LINEAR), 0, 1)
bandw = np.clip(4 * tt * (1 - tt), 0, 1)
fine = fbm(N2, 3, 6, 0.55) - 0.5; mid = fbm(N2, 3, 22, 0.5) - 0.5
# 風蝕岩壁：水平的岩層凹凸（一圈一圈），比大溶谷的亂紋規整
Y2, X2 = np.mgrid[0:N2, 0:N2].astype(np.float32)
rough = fine * 50 + mid * 80
city2 = up(cityk.astype(np.float32), cv2.INTER_LINEAR) > 0.5
floor2 = up(floor) + bandw * rough + (1 - bandw) * fine * 10 * (tt > 0.99) * (~city2)
ceil2 = up(ceil) - bandw * rough
solid2 = upn(solid).astype(bool)
floor2[solid2] = SOLID; ceil2[solid2] = SOLID
open2 = ~solid2
floor2[open2] = np.minimum(floor2[open2], np.maximum(up(floor)[open2], ALT - 90))
ceil2[open2] = np.maximum(ceil2[open2], np.minimum(up(ceil)[open2], ALT + 90))
holemask2 = upn(holemask).astype(bool)
shaft2 = np.clip(up(shaft, cv2.INTER_LINEAR), 0, 1); spill2 = np.clip(up(spill, cv2.INTER_LINEAR), 0, 1)
geo2 = upn(geo)
col2 = np.clip(up(col), 0, 255)
strata2 = up(strata_k, cv2.INTER_LINEAR)
shade = 1 + bandw[..., None] * (fine[..., None] * 0.30 + 0.12 * np.sin(up(ceil) / 40.0)[..., None] * (0.5 + strata2[..., None]))
col2 = np.clip(col2 * shade, 0, 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
R_ = np.clip(np.round(floor2 / FLOOR_SCALE), 0, 255)
Gc = np.clip(np.round(ceil2 / CEIL_SCALE), 0, 254); Gc[holemask2] = HOLE
B = np.zeros_like(R_)
hm = np.stack([R_, Gc, B], -1).astype(np.uint8)
aux = np.stack([np.round(shaft2 * 255), np.round(spill2 * 255), geo2], -1).astype(np.uint8)
paths = {}
for name, arr in (('cave_hm.png', hm), ('cave_aux.png', aux), ('cave_col.png', col2)):
    p = os.path.join(OUT, name)
    Image.fromarray(arr).save(p, optimize=True)
    paths[name] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]

ax, ay, bx, by = ROOMS['A']['x'], ROOMS['A']['y'], ROOMS['B']['x'], ROOMS['B']['y']
data = {
    'v': {'hm': paths['cave_hm.png'], 'aux': paths['cave_aux.png'], 'col': paths['cave_col.png']},
    'start': [int(ax * 20), int(ay * 20), round(math.atan2(-(bx - ax), -(by - ay)), 4)],
    'rooms': [[R['name'], R['x'], R['y'], R['a'], R['b'], R['rot'], 0, R['no']] for k, R in ROOMS.items()],
    'exit': [int(ROOMS['A']['x'] * 20), int(ROOMS['A']['y'] * 20), int(ROOMS['A']['b'] * 0.46 * 20)],
    'city': CITYL,
}
js = 'window.UNDERCITY_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(OUT, 'world.js'), 'w', encoding='utf-8').write(js)
v = hashlib.md5(js.encode('utf-8')).hexdigest()[:8]
idx = os.path.join(HERE, 'index.html')
s = open(idx, encoding='utf-8', newline='').read()
s2, n = re.subn(r"undercity/world\.js\?v=[0-9a-f]*", "undercity/world.js?v=" + v, s)
if n: open(idx, 'w', encoding='utf-8', newline='').write(s2)
print('undercity:', N2, 'px,', len(CITYL), 'buildings,', len(holes), 'holes,', paths, 'world.js v', v, '(index 更新 %d 處)' % n)
# 航道自檢：船能走的格子是否連成一塊
nav = (floor2 < ALT - 60) & (ceil2 > ALT + 60) & open2
nlab, lab = cv2.connectedComponents(nav.astype(np.uint8))
ids = {k: int(lab[int(R['y'] * SUPER), int(R['x'] * SUPER)]) for k, R in ROOMS.items()}
print('航道連通（同一個數字＝連得通）:', ids)

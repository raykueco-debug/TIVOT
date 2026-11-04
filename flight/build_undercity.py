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
    ver -2426 再加 7 間（×1.7）：斷柱迴廊（拱門峽）、裂光側室（天光裂隙）、星孔廳（層岩高廳）、
    落石坡（斷橋深谷—雙拱廳）、雙拱廳（—迴廊盡頭）、層岩小廳（石柱廳—風穴）、懸崖廊（拱門峽—斷橋深谷）

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
    'A': dict(no=1, x=90,  y=690, a=46, b=42, rot=0,   floor=260, ceil=950,  name='入口豎井'),   # -2427：水往下流 12→3→2→1，地面跟著一路降
    'B': dict(no=2, x=240, y=600, a=62, b=48, rot=-20, floor=290, ceil=1050, pillars=11, name='石柱廳'),
    'C': dict(no=3, x=105, y=440, a=72, b=42, rot=75,  floor=320, ceil=1150, slit=1, name='天光裂隙'),
    'E': dict(no=4, x=150, y=205, a=60, b=50, rot=10,  floor=200, ceil=1500, strata=1, name='層岩高廳'),
    'F': dict(no=5, x=360, y=110, a=64, b=46, rot=-10, floor=300, ceil=1100, boulders=14, name='崩落廳'),
    'D': dict(no=6, x=585, y=115, a=66, b=44, rot=15,  floor=300, ceil=1300, arch=1, name='拱門峽'),
    'G': dict(no=7, x=690, y=320, a=56, b=52, rot=80,  floor=320, ceil=1150, chasm=1, name='斷橋深谷'),
    'H': dict(no=8, x=305, y=330, a=50, b=42, rot=30,  floor=280, ceil=1050, pores=7, name='風穴'),
    'I': dict(no=9, x=430, y=720, a=44, b=40, rot=0,   floor=300, ceil=980,  name='迴廊盡頭'),
    'Z': dict(no=10, x=470, y=500, a=150, b=128, rot=-8, floor=120, ceil=1650, city=1, holes=5, name='地下都市'),
    # ver -2426（Ray：「把腔室數量 ×1.7」）：10 → 17。擺在既有腔室之間的空地，幾條連成迴圈（不只是死路）。
    # ⚠ 這幾間（NEW）的場景與迴廊**用另一條亂數**（rng2）—— 不然整條亂數序列位移，地下都市的建築／高塔
    #   （連帶地表樹海的樹位，crowns.js）會整個重排。
    'J': dict(no=11, x=470, y=240, a=52, b=40, rot=5,   floor=290, ceil=1150, pillars=6, name='斷柱迴廊'),
    'K': dict(no=12, x=60,  y=318, a=34, b=40, rot=90,  floor=520, ceil=1350, slit=1, name='裂光側室'),   # -2427：地勢高，水源
    'L': dict(no=13, x=70,  y=75,  a=44, b=40, rot=0,   floor=290, ceil=1250, pores=9, name='星孔廳'),
    'M': dict(no=14, x=712, y=560, a=40, b=52, rot=70,  floor=300, ceil=1150, boulders=10, name='落石坡'),
    'N': dict(no=15, x=640, y=712, a=52, b=36, rot=0,   floor=300, ceil=1200, wind=1, name='無底風穴'),   # -2434（Ray：「15 刪掉改成風穴，無底，有氣流一直往上吹，頂有外部光源…只出不進」）
    'O': dict(no=16, x=228, y=468, a=40, b=34, rot=20,  floor=290, ceil=1300, strata=1, name='層岩小廳'),
    'P': dict(no=17, x=712, y=195, a=32, b=40, rot=80,  floor=300, ceil=1200, chasm=1, name='懸崖廊'),
}
NEW = {'J', 'K', 'L', 'M', 'N', 'O', 'P'}
# -2427（Ray：「9 跟 15 不要連結、3 跟 4 不要連結」）：這兩條**亂數照抽、只是不挖** —— 拿掉的話亂數序列位移，地下都市整個重排
SKIP = {('C', 'E'), ('N', 'I')}
LPTS = {}                                         # 每條迴廊的中心線（水沿著它流）
OUTW = 12                                        # 地圖最左邊這一條＝洞外（雲海＋天），出口從 1 號往左挖出去
rng2 = np.random.default_rng(SEED + 26)
LINKS = [('A', 'B', 14), ('B', 'C', 13), ('C', 'E', 14), ('E', 'F', 14), ('F', 'D', 15),
         ('D', 'G', 14), ('G', 'Z', 17), ('B', 'I', 12), ('E', 'H', 12)]
LINKS_NEW = [('D', 'J', 12), ('C', 'K', 12), ('E', 'L', 12), ('G', 'M', 13), ('M', 'N', 12), ('N', 'I', 12),
             ('B', 'O', 11), ('O', 'H', 11), ('D', 'P', 12), ('P', 'G', 12)]

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
for a, b, hw in LINKS + LINKS_NEW:
    R_ = rng2 if (a, b, hw) in LINKS_NEW else rng
    ax, ay, bx, by = ROOMS[a]['x'], ROOMS[a]['y'], ROOMS[b]['x'], ROOMS[b]['y']
    L = math.hypot(bx - ax, by - ay); nx, ny = -(by - ay) / L, (bx - ax) / L
    amp, ph, nseg = R_.uniform(0.06, 0.13) * L, R_.uniform(0, 6.28), 7
    pts = []
    for i in range(nseg + 1):
        t = i / nseg
        o = math.sin(t * math.pi * R_.uniform(1.6, 2.4) + ph) * amp * math.sin(t * math.pi)
        pts.append((ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o))
    LPTS[(a, b)] = pts
    if (a, b) in SKIP: continue
    d = np.full((N, N), 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(x0, y0, x1, y1))
    tunnel_f = np.maximum(tunnel_f, hw * (1 + 0.32 * wob + 0.18 * scal) - d)
# ── 出口（-2427，Ray：「從 1 流到地圖外，出口做成一個開口，外面是雲海」）：1 號往左一條迴廊挖到地圖邊 ──
ax_, ay_ = ROOMS['A']['x'], ROOMS['A']['y']
MOUTH = [(ax_, ay_), (ax_ - 30, ay_ + 6), (ax_ - 58, ay_ + 4), (OUTW - 4, ay_ + 10)]
d = np.full((N, N), 1e9, np.float32)
for (x0, y0), (x1, y1) in zip(MOUTH, MOUTH[1:]):
    d = np.minimum(d, seg_dist(x0, y0, x1, y1))
tunnel_f = np.maximum(tunnel_f, 18 * (1 + 0.18 * wob + 0.10 * scal) - d)
outside = (XX < OUTW) & (np.abs(YY - (ay_ + 10)) < 70)   # -2428：只留出口外那一段（出口開在崖面上），不再整條地圖左邊
openm = (best > 0) | (tunnel_f > 0) | outside
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
PILLARS = []                                       # 風蝕石柱 [x, y, 半徑]（世界座標）
holes = []
chasm = np.zeros((N, N), np.float32)
chasm_g = np.zeros((N, N), np.float32)            # 斷橋深谷那一間的谷底（樹海）
bridge_m = np.zeros((N, N), bool); bridge_par = np.zeros((N, N), bool); wind_m = np.zeros((N, N), bool)
BR_GAP = (0.30, 0.47)                             # 斷口（u）：偏往 14
BR_Z = 320 + ZOFF                                 # 橋面高 ＝ 斷橋深谷的地面
FOREST_Z = 470                                    # 谷底（樹海的地面）
strata_k = np.zeros((N, N), np.float32)
rng_main = rng
for k, R in ROOMS.items():
    rng = rng2 if k in NEW else rng_main                # 新腔室走自己那條亂數（見 NEW）
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
        PILLARS.append([round(px * 20), round(py * 20), round(r * (1 + 0.25 * wob[int(py), int(px)]) * 20)])   # 飛行頁：撞到石柱的語音（-2435）
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
    if R.get('chasm') and k == 'G':                # 斷橋深谷（-2434 Ray：「橋改成人造石橋，古舊，在往 14 的方向橋斷，不要斷在正中間，要分長短」）
        # 橋沿 u 軸（+u 朝 14／南）；斷口在 u∈[BR_GAP]（偏 14 那一頭）⇒ 北段長、南段短；斷口兩端的邊緣參差（崩掉的）
        jag = wob * 0.05
        deck = (np.abs(v) < 0.085) & (np.sqrt(u * u + v * v) < 1.02) & ~((u > BR_GAP[0] + jag) & (u < BR_GAP[1] - jag))
        bridge_m |= deck & rmask
        bridge_par |= deck & (np.abs(v) > 0.064) & rmask & ((wob * 7.0) % 1.0 > 0.18)   # 欄杆：一段一段，缺了幾塊
        cm = np.clip((np.sqrt(u * u + v * v) < 0.92) * 1.0, 0, 1) * rmask * (~deck)
        chasm = np.maximum(chasm, cm); chasm_g = np.maximum(chasm_g, cm)
    elif R.get('chasm'):                           # 懸崖廊：整間裂開，中間留一道石脊
        cm = np.clip((np.sqrt(u * u + v * v) < 0.92) * 1.0 - np.clip(1 - np.abs(v) / 0.10, 0, 1) * 1.6, 0, 1) * rmask
        chasm = np.maximum(chasm, cm)
    if R.get('wind'):                              # 無底風穴：腔室中央往下沒底、天頂開一個大口（外面的光照下來）
        wind_m |= (np.sqrt(u * u + v * v) < 0.86) & rmask
        holes.append((R['x'], R['y'], R['b'] * 0.55))
    for px, py in inside(R.get('pores', 0), 0.75, 8):         # 風穴：天頂一堆小孔
        r_ = rng.uniform(1.6, 3.0)
        if k != 'L': holes.append((px, py, r_))      # -2434：13 是全黑的（亂數照抽、只是不開，不然後面的腔室與城會重排）
    if R.get('city'):
        # 神殿頂上那一束藤（ver -2405）：高度圖裡**不再**放實心柱 —— 藤束會往上收、會彎，直柱包不住；
        # 碰撞改由飛行頁照同一條藤束的中軸判（flight/index.html 的 ucTrunkAt，caveSolidAt 裡）。
        for px, py in inside(R.get('holes', 0), 0.60, 34):
            holes.append((px, py, rng.uniform(2.5, 10)))   # 大小不一（Ray：「天空有大小的洞」）
        cityflat = np.clip(best / 10.0, 0, 1) * rmask
        floor = floor * (1 - cityflat) + (R['floor'] + ZOFF) * cityflat   # 都市的地面是平的（鋪過的）

rng = rng_main
floor = np.clip(floor, 40 + ZOFF, ALT - 90)
chf = 60 + fbm(N, 4, 40, 0.5) * 120              # ⚠ 照抽（亂數序列）
floor = floor * (1 - chasm) + chf * chasm
floor = floor * (1 - chasm_g) + (FOREST_Z + (chf - 60) * 0.25) * chasm_g   # 斷橋深谷的谷底＝樹海的地面（-2434）
floor[bridge_m] = BR_Z; floor[bridge_par] = BR_Z + 26
def link_dt(key):                                 # 每一格到某條迴廊中心線的距離 d 與沿線位置 t（0＝起點腔室、1＝終點）
    pts_ = LPTS[key]; Ls = [math.hypot(b_[0] - a_[0], b_[1] - a_[1]) for a_, b_ in zip(pts_, pts_[1:])]; Lt = sum(Ls)
    dd = np.full((N, N), 1e9, np.float32); tt = np.zeros((N, N), np.float32); acc = 0
    for (a_, b_), Lk in zip(zip(pts_, pts_[1:]), Ls):
        vx, vy = b_[0] - a_[0], b_[1] - a_[1]
        q = np.clip(((XX - a_[0]) * vx + (YY - a_[1]) * vy) / (vx * vx + vy * vy + 1e-9), 0, 1)
        d_ = np.sqrt((XX - a_[0] - q * vx) ** 2 + (YY - a_[1] - q * vy) ** 2)
        m_ = d_ < dd; dd = np.where(m_, d_, dd); tt = np.where(m_, (acc + q * Lk) / Lt, tt); acc += Lk
    return dd, tt
# 樹海往 10 延伸（-2434 Ray：「橋的下面是樹海往 10 延伸」）：7→10 那條迴廊挖成一道谷，谷底同高，接近 10 時順坡接上都市的地面
dGZ, tGZ = link_dt(('G', 'Z'))
ravine = (dGZ < 15 * (1 + 0.25 * wob)) & ~((owner == CITY) & (best > 0))
rz = FOREST_Z + (ROOMS[CITY]['floor'] + ZOFF - FOREST_Z) * np.clip((tGZ - 0.78) / 0.22, 0, 1)
floor = np.where(ravine, np.minimum(floor, rz + (chf - 60) * 0.2), floor)
forest_m = (chasm_g > 0.5) | ravine
floor[wind_m] = 30                                 # 無底：比雲底還低（飛行頁畫成往下沒底的灰黑雲）
ceil = np.maximum(ceil, ALT + 90)
hole = np.zeros((N, N), np.float32)
for hx, hy, hr in holes:
    hole = np.maximum(hole, disc(hx, hy, hr * (1 + 0.18 * wob[min(N - 1, int(hy)), min(N - 1, int(hx))]), 0.15))
holemask = (hole > 0.5) & openm
# ver -2400（Ray：「天空的洞透入洞外的光，不用畫出，做成束狀光源就好」）：
#   洞只拿來算光柱與落點的亮；天頂上真的開口的只有進出口那一個（要從那裡飛出去）（-2432 起天頂完全不開口）
floor[outside] = 40 + ZOFF
# 水道（-2427，Ray：「12 地勢較高，水流到 3 2 1，然後從 1 流到地圖外」）：中心線 12→3→2→1→出口，
#   水面高度沿路線性往下（WAYZ），溝底再低 20；水面那一段標成水（geo 8，飛行頁的水膜照 stream 那一份高度鋪）
def _rev(k): return list(reversed(LPTS[k]))
WAY = [(_rev(('C', 'K')), 900, 715), (_rev(('B', 'C')), 715, 685), (_rev(('A', 'B')), 685, 655), (MOUTH, 655, 600)]
stream = []
for pts_, z0, z1 in WAY:
    seg = [(pts_[i], pts_[i + 1]) for i in range(len(pts_) - 1)]
    Ls = [math.hypot(b_[0] - a_[0], b_[1] - a_[1]) for a_, b_ in seg]; Lt = sum(Ls) or 1; acc = 0
    for (a_, b_), Lk in zip(seg, Ls):
        n_ = max(1, int(Lk / 1.5))
        for q in range(n_):
            f_ = q / n_; x_ = a_[0] + (b_[0] - a_[0]) * f_; y_ = a_[1] + (b_[1] - a_[1]) * f_
            stream.append((x_, y_, z0 + (z1 - z0) * (acc + Lk * f_) / Lt))
        acc += Lk
stream.append((OUTW - 4, ay_ + 10, 600))
water = np.zeros((N, N), bool); HW = 3.6
for x_, y_, z_ in stream:
    x0, x1, y0, y1 = int(x_ - HW - 2), int(x_ + HW + 3), int(y_ - HW - 2), int(y_ + HW + 3)
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(N, x1), min(N, y1)
    dd = np.sqrt((XX[y0:y1, x0:x1] - x_) ** 2 + (YY[y0:y1, x0:x1] - y_) ** 2)
    bed = z_ - 20 * np.clip(1 - (dd / (HW + 1.5)) ** 2, 0, 1) + 26 * np.clip(dd / (HW + 1.5) - 1, 0, 1)
    floor[y0:y1, x0:x1] = np.where(dd < HW + 2.5, np.minimum(floor[y0:y1, x0:x1], bed), floor[y0:y1, x0:x1])
    water[y0:y1, x0:x1] |= dd < HW
water &= openm & ~outside
# 整間的湖：每間一個水面（高的先、一路往下），迴廊的水面沿中心線從上一間的水位降到下一間（照 stream 的線性水位）
LAKE = {'K': 900, 'C': 715, 'B': 685, 'A': 655}
lev = np.zeros((N, N), np.float32); lbest = np.full((N, N), 1e9, np.float32)
fdx = np.zeros((N, N), np.float32); fdy = np.zeros((N, N), np.float32)   # 流向（-2428 Ray：「水要有流向，高至低」）
for i_, (x_, y_, z_) in enumerate(stream):                  # 迴廊：最近的那一個水道點給水位與流向
    xn, yn, _ = stream[min(i_ + 1, len(stream) - 1)]; xp, yp, _ = stream[max(i_ - 1, 0)]
    vx, vy = xn - xp, yn - yp; vl = math.hypot(vx, vy) or 1
    R_ = 50 if any(abs(x_ - ROOMS[k_]['x']) < ROOMS[k_]['a'] and abs(y_ - ROOMS[k_]['y']) < ROOMS[k_]['a'] for k_ in ('K', 'C', 'B', 'A')) else 20
    x0, x1, y0, y1 = max(0, int(x_ - R_)), min(N, int(x_ + R_ + 1)), max(0, int(y_ - R_)), min(N, int(y_ + R_ + 1))
    dd = np.sqrt((XX[y0:y1, x0:x1] - x_) ** 2 + (YY[y0:y1, x0:x1] - y_) ** 2)
    m = dd < lbest[y0:y1, x0:x1]
    lbest[y0:y1, x0:x1] = np.where(m, dd, lbest[y0:y1, x0:x1]); lev[y0:y1, x0:x1] = np.where(m, z_, lev[y0:y1, x0:x1])
    fdx[y0:y1, x0:x1] = np.where(m, vx / vl, fdx[y0:y1, x0:x1]); fdy[y0:y1, x0:x1] = np.where(m, vy / vl, fdy[y0:y1, x0:x1])
corr = (lbest < 19) & (tunnel_f > 0) & openm & ~outside
for k_, L_ in LAKE.items():                                 # 湖：整間同一個水面
    rm = (owner == k_) & (best > 0) & openm
    lev[rm] = L_; corr |= rm
water |= corr
floor = np.where(water, np.minimum(floor, lev - 34), floor)  # 湖底在水面下 34（牆邊的過渡會把岸墊回來）
# 2 與 16、2 與 9 的接點（-2434 Ray：「靠 2 那一側地勢要略高一些」）：出湖那一段墊一道比水面高的坎，往迴廊裡順坡降回去
for key_ in (('B', 'O'), ('B', 'I')):
    d_, t_ = link_dt(key_)
    w_ = (d_ < 14) & ~water & (t_ < 0.5)
    sill = LAKE['B'] + 30 + 34 * np.clip(1 - t_ / 0.42, 0, 1)
    floor = np.where(w_, np.maximum(floor, sill * (1 - np.clip((t_ - 0.30) / 0.15, 0, 1)) + floor * np.clip((t_ - 0.30) / 0.15, 0, 1)), floor)
t = np.clip(dist / WALL_W, 0, 1); t = t * t * (3 - 2 * t)
floor = SOLID * (1 - t) + floor * t
ceil = SOLID * (1 - t) + ceil * t
solid = ~openm | pillar_core
floor[outside] = 40 + ZOFF                         # 洞外：牆的過渡會把它墊回去（-2428 抓到：洞外地面一路 800～1800），這裡再壓回雲海面
floor[solid] = SOLID; ceil[solid] = SOLID
ceil[outside] = SOLID - 1                          # 洞外的天頂：下面 Gc 會換成 HOLE（開成天）

# ── 黑暗（-2434 Ray：「13 從入口開始漸暗到全黑，進到 13 以後也是全黑」「7 往 10 的通道會有一段全暗，進到 10 以後才漸亮起來」）──
#   0＝照常、1＝全黑（只剩船燈與牆上的光點）。寫進 cave_hm 的 B（飛行頁地下古城把它當黑暗讀；大溶谷那一格是發光植物）
dark = np.zeros((N, N), np.float32)
dEL, tEL = link_dt(('E', 'L'))
dark = np.where((dEL < 26) & (owner != 'E'), np.maximum(dark, np.clip(tEL / 0.85, 0, 1)), dark)
dark[(owner == 'L') & (best > -WALL_W - 4)] = 1
pin = next(((x_, y_) for x_, y_ in LPTS[('G', 'Z')] if owner[int(y_), int(x_)] == CITY and best[int(y_), int(x_)] > 0), LPTS[('G', 'Z')][-1])
dark = np.where((dGZ < 30) & (owner != CITY) & (owner != 'G'), np.maximum(dark, np.clip((tGZ - 0.18) / 0.22, 0, 1)), dark)
dPin = np.sqrt((XX - pin[0]) ** 2 + (YY - pin[1]) ** 2)
dark = np.where((owner == CITY), np.maximum(dark, 1 - np.clip(dPin / 75, 0, 1)), dark)
dark = cv2.GaussianBlur(dark, (0, 0), 2.0)

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
        if rr < 0.08: kind = 1                                            # 塔（少）
        elif rr < 0.50: kind = 3                                          # 坍塌（ver -2400：失落的古文明，殘垣過半）
        w = rng.uniform(4.4, 6.8); d = rng.uniform(4.4, 6.8)
        # ⚠ 高度上限：塔＋尖頂（×1.35）要低於船的航高（ALT−60），不然船從塔頂穿過去；古城也不該是摩天樓
        h = {0: rng.uniform(70, 210) * (1.1 - 0.4 * r0), 1: rng.uniform(230, 330), 3: rng.uniform(25, 90)}[kind]
        CITYL.append([round(px * 20), round(py * 20), round(w * 20), round(d * 20), round(h), round(Rz['rot'], 1), kind, round(float(rng.random()), 3), gfloor])
        if kind == 3:                                                     # 坍塌的旁邊散一地碎石塊（種類 4）
            for _ in range(rng.integers(2, 5)):
                a_, r_ = rng.uniform(0, 6.283), rng.uniform(2.6, 5.0)
                CITYL.append([round((px + r_ * math.cos(a_)) * 20), round((py + r_ * math.sin(a_)) * 20),
                              round(rng.uniform(0.9, 2.2) * 20), round(rng.uniform(0.9, 2.2) * 20), round(rng.uniform(8, 26)),
                              round(float(rng.uniform(0, 90)), 1), 4, round(float(rng.random()), 3), gfloor])
# 十字大道兩側的列柱（種類 5）：一根一根，斷的多、站著的少
for ax in (0, 1):
    for tc in np.arange(-15.0, 15.01, 1.6):
        for side in (-1, 1):
            lu, lv = (tc * CELLP, side * 1.45) if ax == 0 else (side * 1.45, tc * CELLP)
            if math.hypot(lu / Rz['a'], lv / Rz['b']) < 0.20: continue
            px, py = Rz['x'] + lu * cz - lv * sz_, Rz['y'] + lu * sz_ + lv * cz
            if not (0 <= px < N and 0 <= py < N): continue
            if owner[int(py), int(px)] != CITY or best[int(py), int(px)] < 14: continue
            if rng.random() < 0.25: continue                              # 整根倒了不見
            ok = rng.random() < 0.35
            h = rng.uniform(150, 200) if ok else rng.uniform(25, 110)
            CITYL.append([round(px * 20), round(py * 20), 26, 26, round(h), round(Rz['rot'], 1), 5, round(float(rng.random()), 3), gfloor])
TEMPLE = [(26, 120), (19, 110), (12, 100), (6, 120)]
for lvl, (w, h) in enumerate(TEMPLE):            # 中央的階梯神殿：四層往上收
    CITYL.append([Rz['x'] * 20, Rz['y'] * 20, w * 20, w * 20, h, Rz['rot'], 2, lvl, gfloor + sum(x[1] for x in TEMPLE[:lvl])])
# 巨樹（種類 8）：ver -2403 起飛行頁不畫它了 —— 神殿頂改成藤蔓交纏直通天頂（flight/index.html 的 glBuildUnderCity），這一筆只留著當位置標記；碰撞由飛行頁的 ucTrunkAt 判
CITYL.append([Rz["x"] * 20, Rz["y"] * 20, 190, 0, 1900, 0, 8, 0.5, gfloor + sum(x[1] for x in TEMPLE)])

# ── 光：天光的反光、城裡零星的燈（暖色溢光）─────────────────────────────
shaft = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 3.5); shaft /= (shaft.max() + 1e-6)
# ver -2400：遺跡沒有燈（Ray：「非現代」）—— 光只剩天光的反光
spill = cv2.GaussianBlur(holemask.astype(np.float32) * 0.8, (0, 0), 9); spill /= (spill.max() + 1e-6)
spill = np.clip(spill * 1.2, 0, 1) * (~solid)
# 洞外的天光照進出口（-2428：出口一圈的岩壁與天頂不然是全黑的，貼著亮的洞外就是破圖）
osh = cv2.GaussianBlur(outside.astype(np.float32), (0, 0), 14); osh = np.clip(osh / (osh.max() + 1e-6) * 1.6, 0, 1)
shaft = np.maximum(shaft, osh); spill = np.maximum(spill, osh * 0.9)

# ── 顏色：砂岩（赭黃～褐），岩層一層一層；都市地面＝鋪石＋街道 ───────────────
tone = fbm(N, 5, 24, 0.55)[..., None]
# ver -2400（Ray：「地表也要貼黃土材質」）：地面＝黃土，配地貌貼圖 waste_brown（geo 6）
sandA = np.array([200, 162, 104], np.float32); sandB = np.array([156, 120, 78], np.float32)
col = sandB * (1 - tone) + sandA * tone
ripple = (0.5 + 0.5 * np.sin((XX * 0.8 + YY * 0.45) * 1.1))[..., None]
col = col * (0.92 + 0.08 * ripple)
lit = np.clip(cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 8)[..., None] * 2.0, 0, 1)
col = col * (1 - lit) + np.array([210, 180, 136], np.float32) * lit
cityk = (owner == CITY) & (best > 8)
lu = (XX - Rz['x']) * cz + (YY - Rz['y']) * sz_; lv = -(XX - Rz['x']) * sz_ + (YY - Rz['y']) * cz
street = ((np.abs((lu / CELLP) - np.round(lu / CELLP)) < 0.16) | (np.abs((lv / CELLP) - np.round(lv / CELLP)) < 0.16) |
          (np.abs(lu) < 2.2) | (np.abs(lv) < 2.2))
# 都市地面也是黃土；舊街道只剩一點被踩實的淡痕（不是鋪面）
road = np.array([172, 140, 96], np.float32)
col[cityk] = np.where(street[cityk][..., None], col[cityk] * 0.6 + road * 0.4, col[cityk])
# ver -2401（Ray：「古城的路應該讓野生植物遍布」）：街道上一片一片的野草野灌木，空地與廣場也零星長著
ovn = fbm(N, 4, 20, 0.55)
# 「綠植要幾乎布滿道路」：街道上幾乎全綠（只剩零星露出的黃土），街區裡一片一片
over = (street * np.clip(0.78 + (ovn - 0.5) * 1.2, 0, 1) + (~street) * np.clip((ovn - 0.35) * 2.6, 0, 1)) * cityk
over = cv2.GaussianBlur(over.astype(np.float32), (0, 0), 0.8)
grassA = np.array([96, 128, 58], np.float32); grassB = np.array([62, 92, 44], np.float32)
green = grassB * (1 - tone) + grassA * tone
col = col * (1 - over[..., None]) + green * over[..., None]
# 灌木叢（種類 6，飛行頁畫成一團一團的 3D 草叢）：長在野草最密的地方
ys, xs = np.nonzero((over > 0.5) & street & (best > 10))
for q in rng.choice(len(xs), size=min(len(xs), 1100), replace=False) if len(xs) else []:
    px, py = float(xs[q]) + rng.uniform(-0.5, 0.5), float(ys[q]) + rng.uniform(-0.5, 0.5)
    CITYL.append([round(px * 20), round(py * 20), round(rng.uniform(1.6, 3.6) * 20), 0, round(rng.uniform(26, 72)),
                  0, 6, round(float(rng.random()), 3), gfloor])
# 大樹（種類 7）：ver -2411 起飛行頁不畫（Ray：「把舊的樹移除」，樹只剩藤蔓樹）；這幾筆仍留著，因為拿掉會讓亂數序列位移、整城重排。原本：跟高樓差不多高（260～380；樹頂 < 航高），長在街口與空地上，彼此隔開
trees = []
ys, xs = np.nonzero(street & cityk & (best > 14) & (over > 0.3))
for q in rng.permutation(len(xs))[:4000]:
    px, py = float(xs[q]), float(ys[q])
    if math.hypot(px - Rz['x'], py - Rz['y']) < 34: continue          # 神殿那一圈不長
    if any(math.hypot(px - a_, py - b_) < 42 for a_, b_ in trees): continue
    trees.append((px, py))
    CITYL.append([round(px * 20), round(py * 20), round(rng.uniform(5.5, 8.0) * 20), 0, round(rng.uniform(300, 420)),
                  0, 7, round(float(rng.random()), 3), gfloor])
    if len(trees) >= 9: break
col[forest_m & ~solid] = col[forest_m & ~solid] * 0.25 + np.array([52, 70, 40], np.float32) * 0.75   # 樹海的地面（林下的暗綠）
# 石橋（-2434）：灰石、一塊一塊錯縫（沿 u 每 4 格一道縫）、欄杆亮一階、綠苔一叢一叢
Rg = ROOMS['G']; ug, vg = room_uv(Rg)
blk = ((ug * Rg['a'] / 4.0 + np.floor(vg * Rg['b'] / 3.0) * 0.5) % 1.0 < 0.14) | ((vg * Rg['b'] / 3.0) % 1.0 < 0.12)
stone = np.array([148, 144, 134], np.float32) * (0.86 + 0.24 * tone)
mossk = np.clip((ovn - 0.48) * 4, 0, 1)[..., None]
bcol = stone * np.where(blk[..., None], 0.72, 1.0)
bcol = bcol * (1 - mossk * 0.7) + np.array([88, 112, 56], np.float32) * mossk * 0.7
col[bridge_m] = bcol[bridge_m]; col[bridge_par] = bcol[bridge_par] * 1.12
col[solid] = sandB * 0.85
col[water] = col[water] * 0.35 + np.array([40, 70, 96], np.float32) * 0.65   # 水底
col[outside] = sandB * 0.85                                                    # 洞外邊上那一圈＝崖壁（雲海那幾格飛行頁另外依時段上色）
col = np.clip(col, 0, 255).astype(np.uint8)
geo = np.full((N, N), 6, np.uint8)             # 黃土
geo[lit[..., 0] > 0.5] = 5                      # 天光落點：淺色碎石
geo[over > 0.45] = np.where(tone[..., 0][over > 0.45] > 0.5, 1, 0)   # 野草：森林的地貌貼圖
geo[solid] = 3
geo[forest_m & ~solid] = 1                       # 樹海的地面：森林的地貌貼圖
geo[bridge_m] = 5
geo[wind_m] = 14                                 # 無底（飛行頁：往下沒底的灰黑雲，頂上的光照得到）
geo[water & ~solid] = 8                                  # 水（飛行頁的水膜）
outside_in = cv2.erode(outside.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
geo[outside_in] = 10                            # 洞外的雲海（飛行頁依時段上色、不吃洞裡的霧）
# ⚠ 往內縮兩格（-2428）：牆腳那一圈若標成雲海，牆的下半截就被塗成白的 ⇒ 看起來是一塊懸空的岩板

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
floor2[upn(outside).astype(bool)] = 40 + ZOFF      # 加密時的粗糙度也不准把洞外墊起來（-2428）
floor2[upn(bridge_m).astype(bool)] = up(floor)[upn(bridge_m).astype(bool)]   # 橋面是平的（不吃岩壁的粗糙度）
open2 = ~solid2
floor2[open2] = np.minimum(floor2[open2], np.maximum(up(floor)[open2], ALT - 90))
ceil2[open2] = np.maximum(ceil2[open2], np.minimum(up(ceil)[open2], ALT + 90))
holemask2 = upn(holemask).astype(bool)
shaft2 = np.clip(up(shaft, cv2.INTER_LINEAR), 0, 1); spill2 = np.clip(up(spill, cv2.INTER_LINEAR), 0, 1)
geo2 = upn(geo)
col2 = np.clip(up(col), 0, 255)
strata2 = up(strata_k, cv2.INTER_LINEAR)
shade = 1 + bandw[..., None] * (fine[..., None] * 0.30 + 0.12 * np.sin(up(ceil) / 40.0)[..., None] * (0.5 + strata2[..., None]))
col2 = col2 * shade
# ver -2400（Ray：「地表要有土質紋理」）：黃土的龜裂（Voronoi 的邊）＋大小土塊的深淺，只上在地面（不上牆）
pts = np.ones((N2, N2), np.uint8)
for _ in range(9000):
    pts[rng.integers(0, N2), rng.integers(0, N2)] = 0
_, lab = cv2.distanceTransformWithLabels(pts, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
edge = ((lab != np.roll(lab, 1, 0)) | (lab != np.roll(lab, 1, 1))).astype(np.float32)
edge = cv2.GaussianBlur(edge, (0, 0), 0.6)
clod = cv2.resize(fbm(N, 3, 6, 0.6), (N2, N2), interpolation=cv2.INTER_LINEAR)
cell = np.random.default_rng(SEED + 7).uniform(0.88, 1.10, lab.max() + 2)[lab]
water2 = upn(water).astype(bool)
ground = (1 - bandw) * (1 - np.clip(up(over, cv2.INTER_LINEAR) * 1.4, 0, 1)) * (~water2) * (~upn(forest_m | bridge_m).astype(bool))   # 樹海的地面、石橋也不上龜裂（-2434）   # 牆帶、長草、水底都不上龜裂（-2428 Ray：「有水就不該是乾裂地」）
soil = (cell * (0.86 + 0.24 * clod)) * (1 - 0.38 * np.clip(edge * 1.6, 0, 1))
col2 = col2 * (1 + (soil[..., None] - 1) * ground[..., None])
# 河床（-2429 Ray：「地下河的地表底圖要換」）：⚠ 不准借龜裂那張 Voronoi —— 格子＋暗縫讀起來就是乾裂的泥。
#   改成：淤泥色的底＋大小兩層的斑駁（水流沖出來的深淺）＋稀疏的小卵石（亮點，不畫縫）
rb = np.random.default_rng(SEED + 31)
mott = cv2.GaussianBlur(rb.random((N2, N2)).astype(np.float32), (0, 0), 9); mott = (mott - mott.mean()) / (mott.std() + 1e-6)
silt = cv2.GaussianBlur(rb.random((N2, N2)).astype(np.float32), (0, 0), 2.2); silt = (silt - silt.mean()) / (silt.std() + 1e-6)
peb = np.zeros((N2, N2), np.float32)
for _ in range(26000):
    py_, px_ = rb.integers(0, N2), rb.integers(0, N2); peb[py_, px_] = rb.uniform(0.5, 1.0)
peb = cv2.GaussianBlur(peb, (0, 0), 0.9) * 6
k_ = np.clip(1 + 0.10 * mott + 0.05 * silt + 0.20 * np.clip(peb, 0, 1), 0.6, 1.5)
bed = np.array([66, 88, 80], np.float32)[None, None, :] * k_[..., None]
col2[water2] = bed[water2]
col2 = np.clip(col2, 0, 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
R_ = np.clip(np.round(floor2 / FLOOR_SCALE), 0, 255)
Gc = np.clip(np.round(ceil2 / CEIL_SCALE), 0, 254)   # -2432（Ray：舊的 1 號豎井天窗出口「拿掉」）：天頂不再開洞，出入只走 1 號往外那條出口
Gc[cv2.dilate(upn(outside), np.ones((5, 5), np.uint8)).astype(bool)] = HOLE
RN = ROOMS['N']; Gc[upn(disc(RN['x'], RN['y'], RN['b'] * 0.42, 0.2) > 0.5).astype(bool)] = HOLE   # 無底風穴的天頂開口（外面的光從這裡下來）   # 洞外的天往岩石裡多開兩格（-2428：不然天頂雙線性在邊上混出一條懸空的黑岩頂）
B = np.clip(np.round(up(dark, cv2.INTER_LINEAR) * 255), 0, 255)   # 地下古城：B＝黑暗（-2434）
hm = np.stack([R_, Gc, B], -1).astype(np.uint8)
aux = np.stack([np.round(shaft2 * 255), np.round(spill2 * 255), geo2], -1).astype(np.uint8)
paths = {}
for name, arr in (('cave_hm.png', hm), ('cave_aux.png', aux), ('cave_col.png', col2)):
    p = os.path.join(OUT, name)
    Image.fromarray(arr).save(p, optimize=True)
    paths[name] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]

WT = 8; wlev_grid = []; wflow_grid = []
for gy in range(0, N + 1, WT):
    for gx in range(0, N + 1, WT):
        y0, y1, x0, x1 = max(0, gy - WT // 2), min(N, gy + WT // 2 + 1), max(0, gx - WT // 2), min(N, gx + WT // 2 + 1)
        wm = water[y0:y1, x0:x1]
        wlev_grid.append(int(round(float(lev[y0:y1, x0:x1][wm].mean()))) if wm.any() else 0)
        if wm.any():
            ux, uy = float(fdx[y0:y1, x0:x1][wm].mean()), float(fdy[y0:y1, x0:x1][wm].mean()); ul = math.hypot(ux, uy) or 1
            wflow_grid += [round(ux / ul * 100), round(uy / ul * 100)]
        else: wflow_grid += [0, 0]
# 樹海（-2434）：抖動格，樹冠頂在地面上 80～130（比橋面 720 低一截，橋才浮在樹海上）；第四欄＝那一點有多暗（×100，飛行頁照它壓暗葉子）
FOREST = []; rf = np.random.default_rng(SEED + 41); FS = 3.6
for gy in np.arange(0, N, FS):
    for gx in np.arange(0, N, FS):
        x_, y_ = gx + rf.uniform(-1.2, 1.2), gy + rf.uniform(-1.2, 1.2); xi, yi = int(x_), int(y_)
        if not (0 <= xi < N and 0 <= yi < N): continue
        ok = forest_m[yi, xi] and not solid[yi, xi] and dist[yi, xi] > WALL_W + 1   # 不長在牆腳的坡上（那裡的地面一路墊高到岩頂）
        nz = owner[yi, xi] == CITY and 0 < best[yi, xi] < 13 and math.hypot(x_ - pin[0], y_ - pin[1]) < 60   # 進 10 的那一圈也長（不碰到建築）
        if not (ok or nz) or floor[yi, xi] > 760: continue          # 只長在谷底與都市的地面上（牆、岩柱上不長）
        if bridge_m[max(0, yi - 3):yi + 4, max(0, xi - 3):xi + 4].any(): continue   # 離橋三格（樹冠才不會蓋到橋面上）
        FOREST.append([round(x_ * 20), round(y_ * 20), round(float(floor[yi, xi]) + rf.uniform(80, 130)), round(float(dark[yi, xi]) * 100)])
ax, ay, bx, by = ROOMS['A']['x'], ROOMS['A']['y'], ROOMS['B']['x'], ROOMS['B']['y']
data = {
    'v': {'hm': paths['cave_hm.png'], 'aux': paths['cave_aux.png'], 'col': paths['cave_col.png']},
    # 起點（-2431）：從地表崖壁的入口進來 ⇒ 落在出口迴廊裡、面朝 1 號（往東）
    'start': [int((ax_ - 34) * 20), int((ay_ + 6) * 20), round(-math.pi / 2, 4)],
    'rooms': [[R['name'], R['x'], R['y'], R['a'], R['b'], R['rot'], 0, R['no']] for k, R in ROOMS.items()],
    'city': CITYL,
    'stream': [[round(x_ * 20), round(y_ * 20), round(z_)] for x_, y_, z_ in stream[::2]],   # 水面（世界座標＋水面高）：飛行頁鋪水膜
    'streamW': round(HW * 20),
    'outW': OUTW * 20,                                       # 洞外那一條的寬（世界單位）：船飛進去就開始出洞
    'wlev': wlev_grid,
    'wflow': wflow_grid,
    'pillars': PILLARS,                                     # 風蝕石柱（-2435）：撞到它跟撞到樹柱一樣，索菈娜會吐槽
    'forest': FOREST,                                       # 斷橋深谷底下往 10 延伸的樹海：[x, y, 樹冠頂, 黑暗×100]（-2434）
    'wind': [ROOMS['N']['x'] * 20, ROOMS['N']['y'] * 20, round(ROOMS['N']['b'] * 0.62 * 20)],   # 無底風穴：飛進這一圈就被氣流往上送出去（只出不進）                                     # 流向網格（同 wlev 的角點；每點 [dx,dy]×100，往下游）                                       # 水位網格（768² 每 8 格一個角點＝97×97；0＝沒水）：飛行頁的水膜照它鋪
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

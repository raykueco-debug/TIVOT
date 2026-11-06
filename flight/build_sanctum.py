#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""卡耶爾山谷 → 聖王廳地宮的地底大空洞（ver -2565）。

Ray（整理）：
  · 入口：卡耶爾山谷，船從那裡駛入洞穴。
  · 拓樸規模同「西部大溶谷」（18 間、768²），但**終點在地圖左上角**。
  · 風格漸變：前段腔室與通道同卡耶爾山谷；後段開始變成灰白石磚牆；越接近終點越接近「聖王廳」。
  · 終點是一個平台，平台後面是聖王廳地宮建築。
  · 從第二個腔室開始沒有地板，全部是無底深淵（同地下古城「無底風穴」那一套：地面壓到 30、地貌 14）。
  （HANDOFF「地底世界」的路線那一行：峽谷 → 地底大空洞（開船穿梭）→ 通到聖王廳 G3 —— 就是這一張。）

⇒ 與 build_undercity.py 同一套輸出格式（飛行頁同一支地底引擎讀，`?world=sanctum`）：
    sanctum/cave_hm.png   R＝地面高度/8、G＝天頂高度/8、B＝風格（0 卡耶爾岩 → 128 灰白石磚 → 255 聖王廳）
    sanctum/cave_aux.png  R＝光柱遮罩、G＝溢光、B＝地貌類別（14＝無底深淵）
    sanctum/cave_col.png  地面／岩壁的顏色（照風格漸變）
    sanctum/world.js      window.SANCTUM_DATA＝{v, start, rooms, exit, city, plat}

    18 Q 北塔基 ─ 8 H 灰磚井                      （右上）
                      │
   12 Z 終點 ─ 11 O 前廳 ─ 10 J 列柱廳 ─ 9 I 拱廊 ─ 15 R 斷拱室
   （平台＋地宮）       │         │
                   16 S 迴音祠  （死路，貼著終點南邊）
    17 U 西隙 ─ 5 E 崩石廳 ─ 6 F 殘壁廳 ─ 7 G 石磚迴廊 ─ 13 P 落磚窟
                   │                        （G 往北接 H）
    4 D 風蝕窟 ─ 3 C 裂谷廳 ─ 2 B 斷崖窟 ─ 1 A 谷口窟 ═ 入口（卡耶爾山谷）
                   │
                14 T 塌陷坑
    · 正解：1→2→3→4→5→6→7→8→9→10→11→12（由右下往左繞一個 S 到左上）。
    · 誘餌：落磚窟（7 往東）、北塔基（8 往北）、斷拱室（9 往北）、迴音祠（10 往西，貼著終點、隔岩層）、
      塌陷坑（3 往北）、西隙（5 往西）—— 都是死路。

⚠ 尺度同大溶谷：768² 排好、輸出前加密成 1536²（飛行頁地底 MAP_SCALE＝10）。
⚠ 船的定高、岩層、地面與天頂的編碼與 build_cave.py／build_undercity.py 相同（改一邊要改另一邊）。
用法：py flight/build_sanctum.py
"""
import hashlib, json, math, os, re
import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'sanctum')
N = 768
SEED = 2565
rng = np.random.default_rng(SEED)
FLOOR_SCALE = 8; CEIL_SCALE = 8
ZOFF = 400                     # ＝ build_cave.py
ALT = 700 + ZOFF               # 船的定高 ＝ flight/index.html 的 CAVE_ALT
SOLID = 1900
WALL_W = 7
ABYSS = 30                     # 無底深淵的「地面」：比雲底還低（飛行頁畫成往下沒底的灰黑雲；同地下古城的無底風穴）
PLAT_Z = 860                   # 終點平台的高（航高 1100 的下方 240）
END = 'Z'

# 鍵 → 位置／大小／天頂／風格 sty（0 卡耶爾 → 0.5 灰白石磚 → 1 聖王廳）
#   floor 只有 1 號有（其餘無底）；cracks＝天頂的裂縫（天光，卡耶爾那一段才有）
ROOMS = {
    'A': dict(no=1,  x=650, y=700, a=54, b=44, rot=-10, floor=330, ceil=1000, sty=0.00, cracks=1, name='谷口窟'),
    'B': dict(no=2,  x=505, y=668, a=68, b=48, rot=8,   ceil=1150, sty=0.04, cracks=1, name='斷崖窟'),
    'C': dict(no=3,  x=315, y=692, a=62, b=44, rot=-12, ceil=1250, sty=0.10, cracks=1, name='裂谷廳'),
    'D': dict(no=4,  x=110, y=640, a=56, b=50, rot=30,  ceil=1100, sty=0.16, cracks=1, name='風蝕窟'),
    'E': dict(no=5,  x=160, y=470, a=60, b=44, rot=80,  ceil=1200, sty=0.28, name='崩石廳'),
    'F': dict(no=6,  x=345, y=505, a=66, b=48, rot=0,   ceil=1300, sty=0.42, name='殘壁廳'),
    'G': dict(no=7,  x=548, y=482, a=62, b=46, rot=-20, ceil=1250, sty=0.52, name='石磚迴廊'),
    'H': dict(no=8,  x=680, y=318, a=54, b=58, rot=10,  ceil=1400, sty=0.60, name='灰磚井'),
    'I': dict(no=9,  x=505, y=290, a=64, b=44, rot=15,  ceil=1300, sty=0.68, name='拱廊'),
    'J': dict(no=10, x=350, y=330, a=58, b=46, rot=-10, ceil=1450, sty=0.78, name='列柱廳'),
    'O': dict(no=11, x=330, y=160, a=54, b=42, rot=20,  ceil=1500, sty=0.90, name='前廳'),
    'Z': dict(no=12, x=122, y=125, a=102, b=94, rot=0,  ceil=1600, sty=1.00, end=1, name='聖王廳地宮'),
    'P': dict(no=13, x=702, y=508, a=44, b=38, rot=60,  ceil=1150, sty=0.50, name='落磚窟'),
    'T': dict(no=14, x=250, y=585, a=40, b=32, rot=10,  ceil=1150, sty=0.12, cracks=1, name='塌陷坑'),
    'R': dict(no=15, x=530, y=110, a=48, b=38, rot=-5,  ceil=1300, sty=0.72, name='斷拱室'),
    'S': dict(no=16, x=215, y=300, a=44, b=36, rot=0,   ceil=1350, sty=0.86, name='迴音祠'),
    'U': dict(no=17, x=58,  y=340, a=38, b=44, rot=0,   ceil=1150, sty=0.30, name='西隙'),
    'Q': dict(no=18, x=690, y=118, a=48, b=40, rot=0,   ceil=1350, sty=0.64, name='北塔基'),
}
LINKS = [('A', 'B', 15), ('B', 'C', 15), ('C', 'D', 14), ('D', 'E', 14), ('E', 'F', 14), ('F', 'G', 15),
         ('G', 'H', 14), ('H', 'I', 14), ('I', 'J', 15), ('J', 'O', 15), ('O', 'Z', 17),
         ('G', 'P', 12), ('C', 'T', 12), ('I', 'R', 12), ('J', 'S', 12), ('E', 'U', 12), ('H', 'Q', 12)]

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
scal = (fbm(N, 3, 7, 0.5) - 0.5) * 2
room_f = {}
for k, R in ROOMS.items():
    u, v = room_uv(R)
    w = 0.10 if R.get('end') else 0.24
    room_f[k] = (1 + w * wob + 0.02 * scal - np.sqrt(u * u + v * v)) * R['b']
best = np.full((N, N), -1e9, np.float32); owner = np.full((N, N), '', object)
for k, f in room_f.items():
    m = f > best; owner[m] = k; best = np.where(m, f, best)

# ── 通道：蛇行的折線（同地下古城）─────────────────────────────────────
LPTS = {}
tunnel_f = np.full((N, N), -1e9, np.float32)
for a, b, hw in LINKS:
    ax, ay, bx, by = ROOMS[a]['x'], ROOMS[a]['y'], ROOMS[b]['x'], ROOMS[b]['y']
    L = math.hypot(bx - ax, by - ay); nx, ny = -(by - ay) / L, (bx - ax) / L
    amp, ph, nseg = rng.uniform(0.05, 0.11) * L, rng.uniform(0, 6.28), 7
    pts = []
    for i in range(nseg + 1):
        t = i / nseg
        o = math.sin(t * math.pi * rng.uniform(1.6, 2.4) + ph) * amp * math.sin(t * math.pi)
        pts.append((ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o))
    LPTS[(a, b)] = pts
    d = np.full((N, N), 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(x0, y0, x1, y1))
    tunnel_f = np.maximum(tunnel_f, hw * (1 + 0.28 * wob + 0.05 * scal) - d)
# ── 入口隧道：1 號往東一條，盡頭＝卡耶爾山谷那一側的洞口（出口：飛到盡頭亮「離開」）──
RA = ROOMS['A']
ENT = [(RA['x'], RA['y']), (RA['x'] + 30, RA['y'] + 4), (RA['x'] + 52, RA['y'] + 2), (752, RA['y'] + 6)]
d = np.full((N, N), 1e9, np.float32)
for (x0, y0), (x1, y1) in zip(ENT, ENT[1:]):
    d = np.minimum(d, seg_dist(x0, y0, x1, y1))
tunnel_f = np.maximum(tunnel_f, 16 * (1 + 0.16 * wob + 0.10 * scal) - d)
ent_d = d
openm = (best > 0) | (tunnel_f > 0)
dist = cv2.distanceTransform(openm.astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)

def field(key, default, p=4):
    num = np.zeros((N, N), np.float32); den = np.zeros((N, N), np.float32)
    for k, R in ROOMS.items():
        dd = np.sqrt((XX - R['x']) ** 2 + (YY - R['y']) ** 2) / max(R['a'], R['b'])
        w = 1.0 / (dd ** p + 1e-3); num += w * R.get(key, default); den += w
    return num / den
ceil_top = field('ceil', 1200) + ZOFF
sty = np.clip(field('sty', 0.0), 0, 1)
sty = np.where(ent_d < 30, 0.0, sty)                 # 入口隧道＝卡耶爾
roomness = np.clip(best / 12.0, 0, 1)

# 地面：只有 1 號、入口隧道、1→2 通道的前半有地；其餘一律無底
dA, tA = None, None
def link_dt(key):
    pts_ = LPTS[key]; Ls = [math.hypot(b_[0] - a_[0], b_[1] - a_[1]) for a_, b_ in zip(pts_, pts_[1:])]; Lt = sum(Ls)
    dd = np.full((N, N), 1e9, np.float32); tt = np.zeros((N, N), np.float32); acc = 0
    for (a_, b_), Lk in zip(zip(pts_, pts_[1:]), Ls):
        vx, vy = b_[0] - a_[0], b_[1] - a_[1]
        q = np.clip(((XX - a_[0]) * vx + (YY - a_[1]) * vy) / (vx * vx + vy * vy + 1e-9), 0, 1)
        d_ = np.sqrt((XX - a_[0] - q * vx) ** 2 + (YY - a_[1] - q * vy) ** 2)
        m_ = d_ < dd; dd = np.where(m_, d_, dd); tt = np.where(m_, (acc + q * Lk) / Lt, tt); acc += Lk
    return dd, tt
dAB, tAB = link_dt(('A', 'B'))
land = ((owner == 'A') & (best > -WALL_W)) | (ent_d < 22) | ((dAB < 22) & (tAB < 0.42) & (owner != 'B'))
# 卡耶爾山谷的谷底：棕灰石地＋碎石起伏；崖邊（land 的邊）往下斷成深淵
dune = np.sin((XX * 0.6 + YY * 0.5) * 0.4 + fbm(N, 3, 32, 0.5) * 6) * 8
floor_land = RA['floor'] + ZOFF + (fbm(N, 5, 60, 0.5) - 0.5) * 120 + dune
land_e = cv2.distanceTransform(land.astype(np.uint8), cv2.DIST_L2, 5)
edge_jag = 2.5 + 2.4 * (fbm(N, 3, 24, 0.5) - 0.5)
landk = np.clip((land_e - edge_jag) / 1.2, 0, 1)        # 崖邊一格內斷掉（參差）
floor = ABYSS * (1 - landk) + floor_land * landk
geo = np.full((N, N), 14, np.uint8)
geo[landk > 0.5] = 3                                      # 谷底：褐岩（同卡耶爾谷底的棕石地）

ceil = ceil_top * roomness + (ALT + 240 + (fbm(N, 3, 40, 0.5) - 0.5) * 120) * (1 - roomness)
ceil = ceil - fbm(N, 4, 24, 0.55) * 80 * roomness

# 天頂的裂縫（卡耶爾那一段）：光柱（洞不開，同地下古城 -2400：只算光束）
holes = []
for k, R in ROOMS.items():
    if not R.get('cracks'): continue
    c, s = math.cos(math.radians(R['rot'] + 25)), math.sin(math.radians(R['rot'] + 25))
    for i in range(-10, 11):
        t = i / 10 * 0.7
        holes.append((R['x'] + c * t * R['a'] + s * math.sin(i * 0.8) * 3, R['y'] + s * t * R['a'] - c * math.sin(i * 0.8) * 3, 2.2))
# 入口隧道的盡頭：外面的天光
EX = ENT[-1]
holes.append((EX[0] - 4, EX[1], 7.0))

# ── 終點：平台＋聖王廳地宮（地宮面朝東，船從前廳那一側進來第一眼就看到）──────────────
RZ = ROOMS['Z']
PLAT = dict(x0=RZ['x'] - 62, x1=RZ['x'] - 8, y0=RZ['y'] - 30, y1=RZ['y'] + 30)   # 平台（地圖格）
plat_m = (XX >= PLAT['x0']) & (XX <= PLAT['x1']) & (YY >= PLAT['y0']) & (YY <= PLAT['y1'])
# 平台前緣往東伸出一段階台（窄一點）
plat_m |= (XX >= PLAT['x1']) & (XX <= PLAT['x1'] + 8) & (YY >= RZ['y'] - 14) & (YY <= RZ['y'] + 14)
PAL_X1 = PLAT['x0']                                      # 地宮正面的那條線（平台後緣）
pal_m = (XX >= 10) & (XX < PAL_X1) & (YY >= RZ['y'] - 58) & (YY <= RZ['y'] + 58)   # 地宮所在的那一片（開成平地，建築另外畫 3D）
openm |= pal_m
floor = np.where(plat_m | pal_m, PLAT_Z, floor)
geo[plat_m | pal_m] = 2                                   # 灰岩（平台的鋪石）
ceil = np.where(pal_m, np.maximum(ceil, RZ['ceil'] + ZOFF), ceil)

# 地宮的建築（飛行頁 glBuildUnderCity 畫；格式同地下古城 [x,y,寬,深,高,轉角,種類,種子,地面高]，世界單位）
#   種類（聖王廳）：9 本殿（完整、有山牆屋頂）／1 塔（尖頂）／5 列柱／10 楣樑（橫的長石）／11 大門（發光）
W20 = 20
CITY = []; core = np.zeros((N, N), bool)
def blk(cx, cy, w, d, h, kind, gz=PLAT_Z, solid=True, sd=None):
    CITY.append([round(cx * W20), round(cy * W20), round(w * W20), round(d * W20), round(h), 0, kind,
                 round(float(rng.random()) if sd is None else sd, 3), gz])
    if solid:   # 碰撞：高度圖裡往內縮一格半的實心（3D 外殼蓋住它）
        global core
        core |= (np.abs(XX - cx) < w / 2 - 1.5) & (np.abs(YY - cy) < d / 2 - 1.5)
yc = RZ['y']
blk(PAL_X1 - 20, yc, 40, 64, 720, 9)                        # 本殿：正面寬 64 格（1280）、高 720（屋脊另加）
blk(PAL_X1 - 14, yc - 44, 16, 16, 860, 1)                   # 左右兩座塔
blk(PAL_X1 - 14, yc + 44, 16, 16, 860, 1)
blk(PAL_X1 - 30, yc - 22, 18, 14, 980, 1)                   # 後面兩座更高的塔（從本殿屋頂後面冒出來）
blk(PAL_X1 - 30, yc + 22, 18, 14, 980, 1)
for j in range(-3, 4):                                       # 門廊的列柱（正面前一排）
    if j == 0: continue
    cx, cy = PAL_X1 + 3, yc + j * 8.5
    CITY.append([round(cx * W20), round(cy * W20), 48, 48, 560, 0, 5, 0.9, PLAT_Z])
    core |= (XX - cx) ** 2 + (YY - cy) ** 2 < 1.2 ** 2
CITY.append([round((PAL_X1 + 3) * W20), round(yc * W20), 120, round(58 * W20), 70, 0, 10, 0.5, PLAT_Z + 560])   # 楣樑
CITY.append([round(PAL_X1 * W20) + 4, round(yc * W20), 4, 300, 460, 0, 11, 0.5, PLAT_Z])                       # 大門（貼在本殿正面）
# 平台四角的火盆（種類 12：發光的小台座）
for cx, cy in ((PLAT['x1'] - 4, PLAT['y0'] + 4), (PLAT['x1'] - 4, PLAT['y1'] - 4), (PLAT['x0'] + 6, PLAT['y0'] + 4), (PLAT['x0'] + 6, PLAT['y1'] - 4)):
    CITY.append([round(cx * W20), round(cy * W20), 40, 40, 70, 0, 12, 0.5, PLAT_Z])

floor = np.clip(floor, ABYSS, ALT - 90)
ceil = np.maximum(ceil, ALT + 90)
hole = np.zeros((N, N), np.float32)
for hx, hy, hr in holes:
    hole = np.maximum(hole, disc(hx, hy, hr * (1 + 0.18 * wob[min(N - 1, int(hy)), min(N - 1, int(hx))]), 0.15))
holemask = (hole > 0.5) & openm
t = np.clip(dist / WALL_W, 0, 1); t = t * t * (3 - 2 * t)
t = np.where(pal_m | plat_m, 1.0, t)                         # 地宮那一片不吃岩壁的過渡（平的）
floor = SOLID * (1 - t) + floor * t
ceil = SOLID * (1 - t) + ceil * t
solid = ~openm
floor[solid] = SOLID; ceil[solid] = SOLID
floor[core] = SOLID; ceil[core] = SOLID                      # 地宮建築的碰撞芯

# ── 光：裂縫的天光（光柱）＋溢光（天光反光、終點的火光）──────────────────────────
shaft = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 3.0); shaft /= (shaft.max() + 1e-6)
spill = cv2.GaussianBlur(holemask.astype(np.float32) * 0.8, (0, 0), 9); spill /= (spill.max() + 1e-6)
fire = np.zeros((N, N), np.float32)
for c_ in CITY:
    if c_[6] in (11, 12): fire = np.maximum(fire, disc(c_[0] / W20, c_[1] / W20, 26 if c_[6] == 11 else 14, 1.0))
spill = np.clip(np.maximum(spill * 1.2, fire * 0.9), 0, 1) * (~solid)

# ── 顏色：照風格漸變（岩壁與地面都讀這一張；飛行頁的牆面石磚／聖王廳紋另外在著色器裡照 B 通道畫）─────────
tone = fbm(N, 5, 24, 0.55)[..., None]
s3 = sty[..., None]
kay = np.array([176, 162, 140], np.float32) * (0.80 + 0.30 * tone)        # 卡耶爾：灰褐的崖岩（照山谷背景圖）
gry = np.array([196, 194, 188], np.float32) * (0.86 + 0.20 * tone)        # 灰白石磚
hol = np.array([104, 108, 128], np.float32) * (0.85 + 0.22 * tone)        # 聖王廳：藍灰的哥德石
k1 = np.clip((s3 - 0.25) / 0.25, 0, 1); k2 = np.clip((s3 - 0.68) / 0.24, 0, 1)
col = kay * (1 - k1) + gry * k1
col = col * (1 - k2) + hol * k2
floorcol = np.array([150, 132, 108], np.float32) * (0.82 + 0.30 * tone)   # 谷底的棕石地
col = np.where((landk > 0.5)[..., None], floorcol, col)
# 平台與地宮的地面：磨亮的石板（大塊方磚，錯縫）
px_ = XX / 3.0; py_ = YY / 3.0
seam = (np.abs(px_ - np.round(px_)) < 0.08) | (np.abs(py_ + 0.5 * (np.floor(px_) % 2) - np.round(py_ + 0.5 * (np.floor(px_) % 2))) < 0.08)
slab = np.array([150, 152, 166], np.float32) * (0.88 + 0.18 * tone)
slab = np.where(seam[..., None], slab * 0.62, slab)
pm = (plat_m | pal_m)[..., None]
col = np.where(pm, slab, col)
lit = np.clip(cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 8)[..., None] * 2.0, 0, 1)
col = col * (1 - lit * 0.4) + np.array([214, 200, 172], np.float32) * lit * 0.4
col = np.clip(col, 0, 255).astype(np.uint8)
geo[solid] = 3
geo[(geo == 14) & (floor > ABYSS + 60)] = 3               # 岩壁那一圈（地面往上翻成牆）不是深淵：不然整面牆被塗成灰黑的雲
geo[lit[..., 0] > 0.5] = np.where(geo[lit[..., 0] > 0.5] == 14, 14, 5)

# ── 加密（同 build_cave.py）───────────────────────────────────────────
SUPER = 2; N2 = N * SUPER
def up(a, it=cv2.INTER_CUBIC): return cv2.resize(a.astype(np.float32), (N2, N2), interpolation=it)
def upn(a): return cv2.resize(a.astype(np.uint8), (N2, N2), interpolation=cv2.INTER_NEAREST)
tt = np.clip(up(t, cv2.INTER_LINEAR), 0, 1)
bandw = np.clip(4 * tt * (1 - tt), 0, 1)
fine = fbm(N2, 3, 6, 0.55) - 0.5; mid = fbm(N2, 3, 22, 0.5) - 0.5
smooth2 = up(np.clip((sty - 0.35) / 0.3, 0, 1), cv2.INTER_LINEAR)     # 石磚那一段起，岩壁的粗糙度收掉（砌出來的牆是平的）
rough = (fine * 55 + mid * 85) * (1 - 0.8 * smooth2)
rough = rough * np.clip((up(floor) - 700) / 400, 0, 1)          # 深淵那一段的牆腳不加粗糙度：不然一排一排細尖的黑齒（無底的牆是直落的）
flat2 = upn(plat_m | pal_m).astype(bool)
floor2 = up(floor) + bandw * rough
ceil2 = up(ceil) - bandw * rough
solid2 = upn(solid | core).astype(bool)
floor2[solid2] = SOLID; ceil2[solid2] = SOLID
floor2[flat2 & ~solid2] = PLAT_Z
open2 = ~solid2
floor2[open2] = np.minimum(floor2[open2], np.maximum(up(floor)[open2], ALT - 90))
ceil2[open2] = np.maximum(ceil2[open2], np.minimum(up(ceil)[open2], ALT + 90))
abyss2 = upn(geo == 14).astype(bool) & open2 & (up(floor) < ABYSS + 40)
floor2[abyss2] = ABYSS
shaft2 = np.clip(up(shaft, cv2.INTER_LINEAR), 0, 1); spill2 = np.clip(up(spill, cv2.INTER_LINEAR), 0, 1)
geo2 = upn(geo)
geo2[(geo2 == 14) & (floor2 > ABYSS + 40)] = 3               # 加密後牆腳被內插墊高的那幾格也不准是深淵（不然牆腳一排黑齒）
col2 = np.clip(up(col), 0, 255)
shade = 1 + bandw[..., None] * (fine[..., None] * 0.30 * (1 - smooth2[..., None]))
col2 = np.clip(col2 * shade, 0, 255).astype(np.uint8)
sty2 = np.clip(up(sty, cv2.INTER_LINEAR), 0, 1)

os.makedirs(OUT, exist_ok=True)
R_ = np.clip(np.round(floor2 / FLOOR_SCALE), 0, 255)
Gc = np.clip(np.round(ceil2 / CEIL_SCALE), 0, 254)          # 天頂不開洞（同地下古城 -2432）：裂縫只算光束
B = np.clip(np.round(sty2 * 255), 0, 255)                    # B＝風格
hm = np.stack([R_, Gc, B], -1).astype(np.uint8)
aux = np.stack([np.round(shaft2 * 255), np.round(spill2 * 255), geo2], -1).astype(np.uint8)
paths = {}
for name, arr in (('cave_hm.png', hm), ('cave_aux.png', aux), ('cave_col.png', col2)):
    p = os.path.join(OUT, name)
    Image.fromarray(arr).save(p, optimize=True)
    paths[name] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]

# 起點：入口隧道裡、離洞口 36 格、面朝西（往 1 號）；出口：洞口那一圈（飛進去亮「離開」）
SX, SY = ENT[-1][0] - 40, ENT[-1][1] - 1
data = {
    'v': {'hm': paths['cave_hm.png'], 'aux': paths['cave_aux.png'], 'col': paths['cave_col.png']},
    'start': [int(SX * 20), int(SY * 20), round(math.pi / 2, 4)],
    'exit': [int((ENT[-1][0] - 6) * 20), int(ENT[-1][1] * 20), 300],
    'rooms': [[R['name'], R['x'], R['y'], R['a'], R['b'], R['rot'], 1 if R.get('end') else 0, R['no']] for k, R in ROOMS.items()],
    'city': CITY,
    'plat': [PLAT['x0'] * 20, PLAT['y0'] * 20, PLAT['x1'] * 20, PLAT['y1'] * 20, PLAT_Z],
}
js = 'window.SANCTUM_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(OUT, 'world.js'), 'w', encoding='utf-8').write(js)
v = hashlib.md5(js.encode('utf-8')).hexdigest()[:8]
idx = os.path.join(HERE, 'index.html')
s = open(idx, encoding='utf-8', newline='').read()
s2, n = re.subn(r"sanctum/world\.js\?v=[0-9a-f]*", "sanctum/world.js?v=" + v, s)
if n: open(idx, 'w', encoding='utf-8', newline='').write(s2)
print('sanctum:', N2, 'px,', len(CITY), 'pieces,', len(holes), 'holes,', paths, 'world.js v', v, '(index 更新 %d 處)' % n)
# 航道自檢：船能走的格子是否連成一塊
nav = (floor2 < ALT - 60) & (ceil2 > ALT + 60) & open2
nlab, lab = cv2.connectedComponents(nav.astype(np.uint8))
ids = {k: int(lab[int(R['y'] * SUPER), int(R['x'] * SUPER)]) for k, R in ROOMS.items()}
ids['start'] = int(lab[int(SY * SUPER), int(SX * SUPER)])
print('航道連通（同一個數字＝連得通）:', ids)
# 腔室有沒有黏在一起（沒有通道卻連通）：每一間只准跟 LINKS 裡的鄰居接觸
adj = set()
for dy_, dx_ in ((0, 1), (1, 0)):
    a_ = owner[:N - dy_, :N - dx_]; b_ = owner[dy_:, dx_:]
    m_ = (a_ != b_) & (best[:N - dy_, :N - dx_] > 0) & (best[dy_:, dx_:] > 0)
    for p_, q_ in set(zip(a_[m_], b_[m_])): adj.add(tuple(sorted((p_, q_))))
bad = [p for p in adj if p not in {tuple(sorted((a, b))) for a, b, _ in LINKS}]
print('黏在一起的腔室（應為空）:', bad)
# 總覽圖（編號＋風格色）
ov = np.zeros((N, N, 3), np.uint8)
ov[openm] = (col[openm] * 0.7).astype(np.uint8)
ov[(geo == 14) & openm] = (30, 30, 40)
ov[openm & (geo == 14)] = (np.array([60, 60, 70]) * 0.5 + col[openm & (geo == 14)] * 0.35).astype(np.uint8)
ov[core] = (230, 200, 120)
im = Image.fromarray(ov)
from PIL import ImageDraw
dr = ImageDraw.Draw(im)
for k, R in ROOMS.items(): dr.text((R['x'] - 6, R['y'] - 6), str(R['no']), fill=(255, 255, 0))
dr.ellipse((SX - 3, SY - 3, SX + 3, SY + 3), outline=(0, 255, 0))
im.save(os.path.join(OUT, '_rooms_map.png'))

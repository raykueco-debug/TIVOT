#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""地底世界（地底大空洞）的地圖產生器。

ver -2362 Ray：「遺蹟改成地底世界，地底大空洞，開船在 2.5D 的地底世界穿梭，有一些發光植物跟天頂的孔洞引入地表光」
ver -2364 Ray：「要多一點岩窟的質感，有些地圖有水晶 石柱 瀑布等變化」
              「要有不同的空腔，由較小的岩穴連結」「地圖拓樸要合理」
              「水晶、石柱、瀑布的變化分散到不同腔室，不要太規整，每個腔室也不要都一樣的寬高，
                有深有淺，有大有小，但是不要有太小的腔室」

⇒ 地圖是一張**圖**：空腔由比較窄、比較低的**岩穴通道**連起來，空腔與通道以外全是實心岩層。
  拓樸寫在 ROOMS／LINKS，形狀與細節由程式生。（ver -2364 Ray：「加倍吧 還要有一個終點」→ 16 間、768²）

    M 迴音井(死路)        N 晶脈 ─────── O 前庭 ── Z 終點（往聖王廳 G3）
      │                    │               │
    H 晶洞      E 螢光谷 ──┴─ K 蕈林 ──── L 鐘乳廳 ── P 瀑布窟
      │       ／   │           │         ／            │
    C 湖窟 ──┘     │         D 深淵 ── I 斷層 ─────────┘
      │            │       ／            │
      └───── B 大廳 ──────┴──── F 柱林 ── J 暗河（死路）
               │
             A 入口窟
    · 主線：入口 → 大廳 → 深淵 → 蕈林 → 鐘乳廳 → 前庭 → 終點（約 7 間）。
    · 支路：湖窟／螢光谷／晶脈那一側是另一條到前庭的路；斷層／瀑布窟繞到鐘乳廳。
    · 死路兩條：湖窟 → 晶洞 → 迴音井、柱林 → 暗河（探索的獎勵點）。

⚠ 每個空腔**各自**的大小（橢圓兩軸＋轉角）、深淺（地面基準）、高低（天頂）、內容（水晶／石柱／瀑布／
  湖／發光植物／洞口，可以混搭、份量不同）—— 不要讓每一間長得一樣。
⚠ 最小的空腔也要夠船繞一圈：短軸不小於 MIN_R。

輸出（flight/cave/，飛行頁 `?world=cave` 讀）：
    cave_hm.png    R＝地面高度 /6、G＝天頂高度 /8（255＝天頂的洞）、B＝發光植物強度
    cave_aux.png   R＝光柱遮罩、G＝溢光、B＝地貌類別（0 深林／1 淺林／2 灰岩／3 褐岩／4 深礫／8 深水／9 亮水／15 水晶）
    cave_col.png   地面顏色
    cave_rooms.json  空腔與通道（名字、位置），日後小地圖／遭遇／出入口用

尺度照飛行頁：1 地圖像素＝20 世界單位（MAP_SCALE），船定高 ALT。
用法：  python3 flight/build_cave.py   （雜湊與起點自動寫回 cave.html／index.html）
"""
import hashlib
import json
import math
import os
import re

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cave')
N = 768                      # 地圖像素（＝15360 世界單位見方）
SEED = 2364
rng = np.random.default_rng(SEED)

FLOOR_SCALE = 8              # R 通道 ×8（要裝得下 SOLID：255×8＝2040 ＞ 1900；ver -2370 由 6 改，整座地底抬高 ZOFF）
CEIL_SCALE = 8               # G 通道 ×8
HOLE = 255                   # G＝255 ⇒ 沒有天頂（洞）
ZOFF = 400                   # ver -2370（Ray：「加入無底深谷，以現在的底部為頂」）：整座地底抬高 400，原本的地面成了「頂」，深谷往下挖
ALT = 700 + ZOFF             # 船的定高（＝ flight/index.html 的 CAVE_ALT —— 改一邊要改另一邊）
SOLID = 1900                 # 實心岩層：地面與天頂都填這個（要高過最高的天頂，不然高的空腔看得穿岩壁）
MIN_R = 40                   # 空腔的短軸下限（像素）：再小船就繞不了身

# ── 拓樸 ────────────────────────────────────────────────────────────
#  鍵 → x, y, 長軸, 短軸, 轉角(度), 地面基準, 天頂, 內容, 名字
#   地面基準：越低越「深」（看下去是一個坑）；天頂：越高越「高」。
#   內容（可混搭）：hole=洞口數, pillars=石柱數, crystal=水晶叢數, falls=瀑布數, lake=湖的大小(0~1), glow=發光植物(0~1)
ROOMS = {
    'A': dict(x=96,  y=700, a=56, b=44, rot=20,  floor=330, ceil=900,  hole=1, glow=0.15, name='入口窟'),
    'B': dict(x=250, y=600, a=96, b=64, rot=-20, floor=170, ceil=1220, hole=2, pillars=3, crystal=1, glow=0.2, name='大廳'),
    'C': dict(x=110, y=470, a=70, b=52, rot=60,  floor=90,  ceil=1060, falls=2, lake=0.85, crystal=1, glow=0.35, name='湖窟'),
    'D': dict(x=390, y=470, a=66, b=58, rot=10,  floor=45,  ceil=1250, falls=1, crystal=3, pillars=1, lake=0.35, name='深淵'),
    'E': dict(x=250, y=320, a=78, b=46, rot=-10, floor=260, ceil=960,  hole=1, glow=1.0, pillars=1, name='螢光谷'),
    'F': dict(x=470, y=660, a=64, b=48, rot=35,  floor=380, ceil=880,  pillars=6, glow=0.1, name='柱林'),
    'H': dict(x=78,  y=290, a=48, b=42, rot=35,  floor=200, ceil=900,  crystal=4, glow=0.2, name='晶洞'),
    'M': dict(x=110, y=110, a=50, b=44, rot=-15, floor=40,  ceil=1250, hole=1, lake=0.3, name='迴音井'),
    'I': dict(x=575, y=530, a=74, b=42, rot=70,  floor=420, ceil=900,  crystal=1, pillars=1, name='斷層'),
    'J': dict(x=660, y=700, a=60, b=46, rot=-10, floor=60,  ceil=1000, falls=1, lake=0.7, glow=0.4, name='暗河'),
    'K': dict(x=420, y=280, a=60, b=52, rot=25,  floor=220, ceil=1050, glow=0.8, pillars=2, name='蕈林'),
    'L': dict(x=580, y=330, a=82, b=56, rot=-35, floor=150, ceil=1240, hole=1, pillars=2, stal=2.0, name='鐘乳廳'),
    'N': dict(x=330, y=110, a=64, b=44, rot=5,   floor=300, ceil=950,  crystal=3, falls=1, lake=0.3, name='晶脈'),
    'O': dict(x=560, y=150, a=58, b=48, rot=-20, floor=260, ceil=1000, pillars=2, glow=0.3, name='前庭'),
    'P': dict(x=700, y=470, a=54, b=48, rot=15,  floor=120, ceil=1150, falls=3, lake=0.6, name='瀑布窟'),
    'Z': dict(x=690, y=90,  a=62, b=52, rot=10,  floor=280, ceil=1150, hole=1, crystal=2, end=True, name='終點'),
}
END = 'Z'                    # 終點（往聖王廳 G3）：飛行頁進到這一間就報「終點」
#  通道：(甲, 乙, 半寬像素)。⚠ 半寬要比岩壁的過渡帶（WALL_W）寬一截，中間才留得出航道。
LINKS = [
    ('A', 'B', 15), ('B', 'C', 16), ('B', 'D', 17), ('B', 'F', 15),
    ('C', 'E', 14), ('C', 'H', 14), ('H', 'M', 13),
    ('D', 'K', 16), ('D', 'I', 15), ('F', 'I', 14), ('F', 'J', 14),
    ('E', 'K', 15), ('E', 'N', 14), ('K', 'L', 16), ('I', 'P', 14), ('P', 'L', 14),
    ('N', 'O', 15), ('L', 'O', 16), ('O', 'Z', 16),
]
WALL_W = 7                   # 岩壁的過渡帶（像素）：地面往上翻、天頂往下壓成一道弧形的壁


def fbm(n, octaves=5, base=64, persistence=0.5):
    """平滑雜訊：逐層放大的隨機格點，三次內插後疊加。回傳 0~1。"""
    out = np.zeros((n, n), np.float32)
    amp, tot = 1.0, 0.0
    cell = base
    for _ in range(octaves):
        g = max(2, n // cell + 2)
        grid = rng.random((g, g)).astype(np.float32)
        up = cv2.resize(grid, (n + cell, n + cell), interpolation=cv2.INTER_CUBIC)[:n, :n]
        out += up * amp
        tot += amp
        amp *= persistence
        cell = max(2, cell // 2)
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def ridged(octaves, base):
    return (1 - np.abs(2 * fbm(N, octaves, base, 0.55) - 1)) ** 3


YY, XX = np.mgrid[0:N, 0:N].astype(np.float32)


def disc(cx, cy, r, soft=1.0):
    d = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) / r
    return np.clip((1 - d) / soft, 0, 1)


def seg_dist(ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = np.clip(((XX - ax) * vx + (YY - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.sqrt((XX - ax - t * vx) ** 2 + (YY - ay - t * vy) ** 2)


def ellipse_f(R):
    """>0 在空腔內；單位約為像素（以短軸換算）。邊緣用低頻雜訊推擠，不要是一個乾淨的橢圓。"""
    c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    u = ((XX - R['x']) * c + (YY - R['y']) * s) / R['a']
    v = (-(XX - R['x']) * s + (YY - R['y']) * c) / R['b']
    return (1 + 0.30 * wob - np.sqrt(u * u + v * v)) * R['b']


for k, R in ROOMS.items():
    assert min(R['a'], R['b']) >= MIN_R, '%s 太小（短軸 %d < %d）' % (k, min(R['a'], R['b']), MIN_R)

# ── 空腔與通道的形狀 ────────────────────────────────────────────────
wob = (fbm(N, 4, 28, 0.55) - 0.5) * 2              # −1~1，邊緣起伏（共用一張）
room_f = {k: ellipse_f(R) for k, R in ROOMS.items()}
best = np.full((N, N), -1e9, np.float32)
owner = np.full((N, N), '', object)
for k, f in room_f.items():
    m = f > best
    owner[m] = k
    best = np.where(m, f, best)
in_room = best > 0
tunnel_f = np.full((N, N), -1e9, np.float32)
TUN = []        # 每一條通道的折線（排路燈似的發光植物用）
for a, b, hw in LINKS:
    ax, ay, bx, by = ROOMS[a]['x'], ROOMS[a]['y'], ROOMS[b]['x'], ROOMS[b]['y']
    # 通道不走直線：中點往旁邊推一點 → 一個彎
    L = math.hypot(bx - ax, by - ay)
    nx, ny = -(by - ay) / L, (bx - ax) / L
    off = rng.uniform(-0.2, 0.2) * L
    mx, my = (ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off
    TUN.append((ax, ay, mx, my, bx, by))
    d = np.minimum(seg_dist(ax, ay, mx, my), seg_dist(mx, my, bx, by))
    tunnel_f = np.maximum(tunnel_f, hw * (1 + 0.30 * wob) - d)
openm = (best > 0) | (tunnel_f > 0)
dist = cv2.distanceTransform(openm.astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)

# 每一格的「這一間」參數：空腔裡用自己的、通道裡由兩端內插（用最近的兩間依距離加權）
def field(key, default):
    num = np.zeros((N, N), np.float32)
    den = np.zeros((N, N), np.float32)
    for k, R in ROOMS.items():
        d = np.sqrt((XX - R['x']) ** 2 + (YY - R['y']) ** 2) / max(R['a'], R['b'])
        w = 1.0 / (d ** 4 + 1e-3)
        num += w * R.get(key, default)
        den += w
    return num / den


floor_base = field('floor', 250) + ZOFF
ceil_top = field('ceil', 1000) + ZOFF
roomness = np.clip(best / 14.0, 0, 1)                # 空腔邊緣往通道漸變

# ── 地面 ────────────────────────────────────────────────────────────
floor = floor_base + (fbm(N, 6, 96, 0.55) - 0.5) * 160 + ridged(5, 40) * 110
lake = np.zeros((N, N), np.float32)
glow = np.zeros((N, N), np.float32)
crystal = np.zeros((N, N), np.float32)
crys_fp = np.zeros((N, N), np.float32)        # 水晶錐的整個腳印（湖面壓平時要避開它）
fallm = np.zeros((N, N), bool)
foam = np.zeros((N, N), np.float32)
pillar_core = np.zeros((N, N), bool)
holes = []


def inside_pts(k, n, margin=0.78, sep=16):
    """在空腔 k 裡撒 n 個不擠在一起的點（不規則，不是排成一圈）。"""
    R = ROOMS[k]
    c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    pts = []
    for _ in range(n * 40):
        if len(pts) >= n:
            break
        u, v = rng.uniform(-1, 1, 2)
        if u * u + v * v > 1:
            continue
        u, v = u * R['a'] * margin, v * R['b'] * margin
        px, py = R['x'] + u * c - v * s, R['y'] + u * s + v * c
        if all((px - qx) ** 2 + (py - qy) ** 2 > sep ** 2 for qx, qy in pts):
            pts.append((px, py))
    return pts


for k, R in ROOMS.items():
    if R.get('lake'):
        # 湖：偏在空腔的一側、形狀不規則（兩三個圓疊起來）
        for (px, py) in inside_pts(k, 3, 0.45, 8):
            lake = np.maximum(lake, disc(px, py, R['b'] * R['lake'] * rng.uniform(0.55, 0.9), 0.35))
    # 地面發光苔（ver -2372，Ray：「有點太暗了，增加地面苔蘚面積讓地表基礎照明多一點」）：
    #   每一間都有（glow 沒寫的當 0.5），門檻放寬一截 ⇒ 面積約多一倍；亮度下限 0.6
    gq = max(R.get('glow', 0), 0.5)
    g = np.clip(best / 24.0, 0, 1) * (owner == k) * np.clip((fbm(N, 5, 16, 0.6) - (0.62 - 0.4 * gq)) * 4, 0, 1)
    glow = np.maximum(glow, g * max(gq ** 0.5, 0.6))
lake *= in_room
floor = floor * (1 - lake) + np.minimum(floor, 46 + ZOFF) * lake

# 石筍：遍布，但深的空腔多、淺的少
for _ in range(950):
    sx, sy = rng.uniform(0, N, 2)
    if lake[int(sy) % N, int(sx) % N] > 0.05:
        continue
    floor += disc(sx, sy, rng.uniform(2, 6), 1.0) ** 1.8 * rng.uniform(60, 260)

# ── 天頂 ────────────────────────────────────────────────────────────
#  空腔照自己的高度；通道低（岩穴的壓迫感），只留 ALT+110~180
ceil_room = ceil_top - fbm(N, 5, 80, 0.55) * 180 - ridged(4, 36) * 80
ceil_tun = ALT + 110 + fbm(N, 4, 24, 0.5) * 70
ceil = ceil_tun * (1 - roomness) + ceil_room * roomness
for _ in range(680):
    sx, sy = rng.uniform(0, N, 2)
    ceil -= disc(sx, sy, rng.uniform(3, 8), 1.0) ** 2.2 * rng.uniform(80, 320)


for k, R in ROOMS.items():
    for _ in range(int(60 * (R.get('stal', 0)))):
        u, v = rng.uniform(-1, 1, 2)
        if u * u + v * v > 1:
            continue
        sx, sy = R['x'] + u * R['a'] * 0.8, R['y'] + v * R['b'] * 0.8
        ceil -= disc(sx, sy, rng.uniform(4, 11), 1.0) ** 2.0 * rng.uniform(150, 420)


CRYSTALS = []   # ver -2370（Ray：「水晶不要鋪在現有地形，另外畫晶狀物，有大有小有密有疏，小的密大的疏」）
                # [世界x, 世界y, 半徑, 高, 傾向角, 傾斜, 色(0青 1藍 2紫)] —— 飛行頁做成六角尖柱的 3D 網格
def add_crystals(cx, cy, count, spread, hmin, hmax):
    """一叢：大的 1~3 根疏疏地立在中間，小的一大把密密地圍在四周（小的密、大的疏）"""
    hue = int(rng.choice([0, 0, 1, 2]))
    def one(px, py, r, h, tilt):
        d = disc(px, py, max(1.2, r / 20 * 1.6), 1.0)
        crystal[d > 0.30] = np.maximum(crystal[d > 0.30], min(1.0, h / 300))   # 只進光的足跡，不改地形
        CRYSTALS.append([int(px * 20), int(py * 20), round(r, 1), round(h, 1), round(float(rng.uniform(0, 6.283)), 2), round(tilt, 2),
                         hue if rng.random() < 0.85 else int(rng.integers(0, 3))])
    for _ in range(int(rng.integers(1, 4))):
        ox, oy = rng.normal(0, spread * 0.35, 2)
        one(cx + ox, cy + oy, rng.uniform(28, 60), rng.uniform(hmin * 1.3, hmax), rng.uniform(0.0, 0.35))
    for _ in range(count * 3):
        ox, oy = rng.normal(0, spread, 2)
        one(cx + ox, cy + oy, rng.uniform(5, 14), rng.uniform(18, 90), rng.uniform(0.1, 0.7))

def scatter_crystals(k, n):
    """小晶簇：零星撒在空腔邊上（疏），每一處三五根"""
    for (px, py) in inside_pts(k, n, 0.9, 10):
        for _ in range(int(rng.integers(3, 7))):
            ox, oy = rng.normal(0, 1.8, 2)
            CRYSTALS.append([int((px + ox) * 20), int((py + oy) * 20), round(float(rng.uniform(4, 10)), 1), round(float(rng.uniform(15, 55)), 1),
                             round(float(rng.uniform(0, 6.283)), 2), round(float(rng.uniform(0.1, 0.7)), 2), int(rng.integers(0, 3))])


# 各空腔的內容（份量各自不同；位置隨機，不排整齊）
for k, R in ROOMS.items():
    taken = []
    def pick(n, margin=0.75, sep=20):
        pts = [p for p in inside_pts(k, n * 3, margin, sep)
               if lake[int(p[1]), int(p[0])] < 0.1 or True]
        out = []
        for p in pts:
            if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > sep ** 2 for q in taken):
                out.append(p)
                taken.append(p)
            if len(out) >= n:
                break
        return out
    for i, (px, py) in enumerate(pick(R.get('hole', 0), 0.6, 26)):
        holes.append((px, py, (R['b'] * 0.32 if i == 0 else R['b'] * 0.16) * rng.uniform(0.8, 1.15)))
    for px, py in pick(R.get('falls', 0), 0.6, 18):
        fr = rng.uniform(2.3, 3.4)
        fallm |= disc(px, py, fr, 0.25) > 0.5
        foam = np.maximum(foam, disc(px, py, fr * 3.4, 1.0))
        lake = np.maximum(lake, disc(px, py, fr * 4.5, 0.4))     # 瀑布底下一定有一灘水
    for px, py in pick(R.get('pillars', 0), 0.82, 18):
        r = rng.uniform(4.5, 10)
        pillar_core[disc(px, py, r, 0.25) > 0.5] = True
        flare = disc(px, py, r * rng.uniform(2.0, 2.8), 1.0) ** 2
        floor = floor + flare * rng.uniform(80, 160)
        ceil = ceil - flare * rng.uniform(100, 200)
    for px, py in pick(R.get('crystal', 0), 0.8, 16):
        add_crystals(px, py, int(rng.integers(7, 20)), rng.uniform(4, 10), 120, 460)
    scatter_crystals(k, int(rng.integers(0, 3)) + R.get('crystal', 0))
# 大型發光植物（ver -2366，Ray：「多一點大型發光植物」）：
#   柱蕈＝一叢三到六根細高的發光菌柱；傘蕈＝一頂巨大的發光菌傘（高度場畫不出傘下的柄，
#   所以是一座頂面圓鼓、側面陡直的傘：頂面最亮、側面是菌褶的暗紋，見著色器的 cvTx==14）。
#   份量跟著那一間的 glow 走，但每一間至少一株（螢光谷、蕈林最多）。
plant = np.zeros((N, N), np.float32)
PLANTS = []     # 九宮格的發光植物（ver -2369）：這裡只排位置與種類，形狀是 GPT 設計的那九張、由飛行頁做成十字插片
# 九格的分工（ver -2370，Ray：「植物有大有小，小的讓他成片出現，看哪些適合」）
#  大的（路燈）：0 巨蕈、5 珊瑚、7 銀杏扇 —— 剪影寬、一株就照亮一段路
#  小的（成片）：1 細柱蕈、3 蕨芽、4 燈苞、6 鈴燈花、8 晶管 —— 一叢叢鋪在地上
#  掛的：2 垂藤 —— 少量掛在天頂
BIG, SMALL, HANG_K = (0, 5, 7), (1, 3, 4, 6, 8), 2
# 尺寸與種的位置（ver -2372，Ray：「發光植物都太大了，都改小且尺寸不一，有的在地上有的掛牆上有的在天頂」）：
#  · 尺寸＝相對於基準高度 360 的倍數。路燈 0.26~0.6（約 95~215）、成片的 0.05~0.26（約 18~95，偏小的多）。
#  · mount：0 地上／1 牆上（根貼著岩壁斜斜往外長）／2 天頂（倒掛）。飛行頁照這一欄取根部與生長軸。
FLOOR, WALL, CEIL = 0, 1, 2
def lamp_size():
    return math.exp(rng.uniform(math.log(0.26), math.log(0.6)))
def small_size():
    return 0.05 + 0.21 * rng.random() ** 1.6
def pick_mount(pf, pw):
    r = rng.random()
    return FLOOR if r < pf else (WALL if r < pf + pw else CEIL)
def add_plant(px, py, kind, size=None, light=1.0, mount=FLOOR):
    """登記一株（不改地面高度）；光的足跡進 plant ⇒ 溢光圖裡有它。"""
    global crys_fp
    if size is None:
        size = lamp_size()
    r = 1.2 + 4.5 * min(1.0, size)
    d = disc(px, py, r, 0.12)
    plant[d > 0.3] = np.maximum(plant[d > 0.3], light)
    crys_fp = np.maximum(crys_fp, d)
    PLANTS.append([int(px * 20), int(py * 20), int(kind), round(float(size), 2), round(float(rng.uniform(0, 6.283)), 2), int(mount)])

def ok_spot(x, y, mount):
    xi, yi = int(round(x)), int(round(y))
    if not (0 <= xi < N and 0 <= yi < N) or not openm[yi, xi] or lake[yi, xi] > 0.1:
        return False
    if mount == WALL:
        return dist[yi, xi] <= 3.5          # 貼著岩壁（飛行頁再往外找真正的牆面）
    return dist[yi, xi] >= 2

def add_patch(px, py, n, mount):
    """一片小植物：同一種（偶爾混第二種）、中間密邊緣疏；牆上那片沿著岩壁撒、天頂那片混一點垂藤"""
    k1 = int(rng.choice(SMALL)); k2 = int(rng.choice(SMALL)) if rng.random() < 0.35 else k1
    R = rng.uniform(5, 10) if mount != WALL else rng.uniform(6, 12)
    for _ in range(n * (12 if mount == WALL else 3)):
        if n <= 0:
            break
        a, rr = rng.uniform(0, 6.283), R * math.sqrt(rng.random())
        x, y = px + math.cos(a) * rr, py + math.sin(a) * rr
        if not ok_spot(x, y, mount):
            continue
        k = k2 if rng.random() < 0.3 else k1
        if mount == CEIL and rng.random() < 0.3:
            k = HANG_K
        add_plant(x, y, k, size=small_size(), light=0.5, mount=mount)
        n -= 1

def wall_side(px, py, nx, ny, want=6.0):
    """從 (px,py) 沿法線往一側走，停在離岩壁約 want 像素的地方（植物貼著路邊長，照亮路面）"""
    for t in range(0, 60):
        x, y = px + nx * t, py + ny * t
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < N and 0 <= yi < N) or not openm[yi, xi]:
            return None
        if dist[yi, xi] <= want:
            return (x, y) if dist[yi, xi] >= 1 else None
    return None

# 發光植物＝路燈（ver -2370，Ray：「不要太密集，可以照亮路的分布就好」）：
#  · 每條通道沿線每 ~75 像素一株，左右交替；地上、牆上、天頂各有（-2372）。
#  · 每一間空腔 1~2 株路燈＋1~3 片小植物（地上／牆上／天頂）。
SPACING = 75
for (ax, ay, mx, my, bx, by) in TUN:
    segs = [(ax, ay, mx, my), (mx, my, bx, by)]
    tot = sum(math.hypot(x1 - x0, y1 - y0) for x0, y0, x1, y1 in segs)
    n = max(1, int(tot // SPACING))
    for j in range(n):
        t = (j + 0.5) / n * tot
        for x0, y0, x1, y1 in segs:
            L = math.hypot(x1 - x0, y1 - y0)
            if t <= L:
                px, py = x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L
                nx, ny = -(y1 - y0) / L, (x1 - x0) / L
                break
            t -= L
        side = 1 if j % 2 == 0 else -1
        m = pick_mount(0.45, 0.4)
        q = wall_side(px, py, nx * side, ny * side, 2.5 if m == WALL else 6.0)
        if q and lake[int(q[1]), int(q[0])] < 0.1:
            add_plant(q[0], q[1], HANG_K if m == CEIL and rng.random() < 0.5 else int(rng.choice(BIG)), mount=m)
for k, R in ROOMS.items():
    g = R.get('glow', 0)
    n = 1 + (1 if g >= 0.4 else 0)
    pts = [p for p in inside_pts(k, n * 4, 0.92, 20) if lake[int(p[1]), int(p[0])] < 0.1]
    for (px, py) in pts[:n]:
        add_plant(px, py, int(rng.choice(BIG)), mount=FLOOR)
    # 成片的小植物：每間 1~3 片（glow 越高越多），一片 8~16 株；牆上那片挑靠牆的點起頭
    cands = [p for p in inside_pts(k, 40, 0.98, 18) if lake[int(p[1]), int(p[0])] < 0.1]
    for i in range(1 + int(round(g * 2))):
        m = pick_mount(0.45, 0.3)
        if not cands:
            break
        px, py = cands[int(rng.integers(0, len(cands)))]
        if m == WALL:                       # 從空腔裡隨便一點往外走到貼牆
            a = rng.uniform(0, 6.283)
            for t in range(80):
                x, y = px + math.cos(a) * t, py + math.sin(a) * t
                if ok_spot(x, y, WALL):
                    px, py = x, y
                    break
        add_patch(px, py, int(rng.integers(8, 17)), m)
    # 垂藤：天頂夠高的間偶爾掛一兩串
    if R.get('ceil', 1000) >= 1000 and rng.random() < 0.6:
        for (px, py) in pts[n:n + 1 + int(rng.random() < 0.4)]:
            add_plant(px, py, HANG_K, size=rng.uniform(0.3, 0.7), mount=CEIL)

# ⚠ 這一次壓平湖面要避開水晶的腳印：壓下去的話水晶變成浮在水面上的一塊平平的藍色
lk = lake * in_room * (crys_fp < 0.01)
floor = floor * (1 - lk) + np.minimum(floor, 46 + ZOFF) * lk

# 湖岸一圈發光藻、通道裡零星的發光苔
shore = np.clip(lake * 3, 0, 1) * (1 - np.clip(lake * 3 - 1.2, 0, 1)) * (lake < 0.6)
glow = np.maximum(glow, shore * 0.6 * (fbm(N, 4, 8, 0.6) > 0.45))
glow = np.maximum(glow, (fbm(N, 4, 12, 0.6) > 0.6) * (~in_room) * 0.55)   # 通道的苔也多一截（-2372：0.74→0.6）

# ── 洞口 ────────────────────────────────────────────────────────────
hole = np.zeros((N, N), np.float32)
for hx, hy, hr in holes:
    hole = np.maximum(hole, disc(hx, hy, hr * (1 + 0.18 * wob), 0.15))
holemask = (hole > 0.5) & openm

# ── 航道保證、實心岩層、岩壁的弧 ──────────────────────────────────────
floor = np.clip(floor, 40 + ZOFF, ALT - 90)
# ── 無底深谷（ver -2370）────────────────────────────────────────────
#  空腔與通道裡挖幾道蜿蜒的裂谷：谷壁陡、谷底高低不一（60~360，比原本的地面低 400~800）。
#  地底沒有環境光、霧是黑的 ⇒ 看下去就是一片沒有底的黑。湖、瀑布腳下不挖。
chasm = np.zeros((N, N), np.float32)
def add_chasm(x0, y0, x1, y1, w):
    L = math.hypot(x1 - x0, y1 - y0)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    bend = rng.uniform(-0.35, 0.35) * L
    pts = []
    for i in range(25):
        t = i / 24
        b = 4 * t * (1 - t) * bend
        pts.append((x0 + (x1 - x0) * t + nx * b, y0 + (y1 - y0) * t + ny * b))
    d = np.full((N, N), 1e9, np.float32)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(ax, ay, bx, by))
    ww = w * (0.7 + 0.6 * fbm(N, 3, 24, 0.5))          # 寬窄不一
    return np.clip((ww - d) / (ww * 0.35), 0, 1)       # 谷壁陡：外緣 35% 就從地面落到谷底
for k, R in ROOMS.items():
    if R.get('end') or k == 'A':
        continue
    for _ in range(int(rng.integers(0, 3))):
        a0 = rng.uniform(0, 6.283)
        cx, cy = R['x'], R['y']
        r0 = max(R['a'], R['b']) * 0.9
        x0, y0 = cx + math.cos(a0) * r0, cy + math.sin(a0) * r0
        a1 = a0 + math.pi + rng.uniform(-0.8, 0.8)
        x1, y1 = cx + math.cos(a1) * r0, cy + math.sin(a1) * r0
        chasm = np.maximum(chasm, add_chasm(x0, y0, x1, y1, rng.uniform(5, 11)))
for (ax, ay, mx, my, bx, by) in TUN:                      # 少數通道底下也裂開
    if rng.random() < 0.3:
        chasm = np.maximum(chasm, add_chasm(ax, ay, bx, by, rng.uniform(3, 6)))
chasm *= openm * (lake < 0.05) * (foam < 0.05)
chasm_bottom = 60 + fbm(N, 4, 48, 0.55) * 300
floor = floor * (1 - chasm) + np.minimum(floor, chasm_bottom) * chasm
ceil = np.maximum(ceil, ALT + 90)
t = np.clip(dist / WALL_W, 0, 1)
t = t * t * (3 - 2 * t)
floor = SOLID * (1 - t) + floor * t
ceil = SOLID * (1 - t) + ceil * t
solid = ~openm | pillar_core | fallm
floor[solid] = SOLID
ceil[solid] = SOLID
glow[solid] = 0
crystal[solid] = 0
plant[solid] = 0
lake[solid] = 0

spill = cv2.GaussianBlur(np.maximum(np.maximum(np.maximum(glow * 1.4, crystal * 0.9), plant * 2.2), fallm * 1.6), (0, 0), 9)   # 瀑布也是光源（ver -2369）
spill = spill / (spill.max() + 1e-6)
shaft = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 3.5)
shaft = shaft / (shaft.max() + 1e-6)

# ── 地面顏色 ─────────────────────────────────────────────────────────
rock = np.array([128, 118, 122], np.float32)   # 亮一階：地貌貼圖是乘上去的，底色太暗紋理就讀不出來
rock2 = np.array([96, 90, 104], np.float32)
moss = np.array([70, 100, 84], np.float32)
sand = np.array([120, 108, 92], np.float32)
water = np.array([20, 40, 70], np.float32)
tone = fbm(N, 5, 24, 0.55)[..., None]
col = rock2 * (1 - tone) + rock * tone
mossy = (fbm(N, 4, 40, 0.5) > 0.58).astype(np.float32)[..., None] * 0.7
col = col * (1 - mossy) + moss * mossy
lit = np.clip(cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 8)[..., None] * 2.2, 0, 1)
col = col * (1 - lit) + (sand * 0.5 + np.array([90, 120, 60]) * 0.5) * lit
col = col * (1 - lake[..., None]) + water * lake[..., None]
gcol = np.where((fbm(N, 3, 64, 0.5) > 0.5)[..., None], np.array([60, 230, 210], np.float32),
                np.array([150, 110, 255], np.float32))
col = col * (1 - 0.3 * glow[..., None]) + gcol * 0.3 * glow[..., None]   # 只染一點底色，真正的發光在著色器
col[solid] = rock * 0.8
fm = (np.clip(foam * 1.6, 0, 1) * lake)[..., None]
col = col * (1 - fm * 0.7) + np.array([200, 225, 235], np.float32) * fm * 0.7
col[fallm] = np.array([170, 205, 225], np.float32)
col = np.clip(col, 0, 255).astype(np.uint8)

# ── 地貌類別（飛行頁拿它挑地貌貼圖，與大陸同一套 —— 畫風才一致）──────────
geo = np.where(tone[..., 0] > 0.5, 2, 3).astype(np.uint8)
geo[mossy[..., 0] > 0.3] = 0
geo[lit[..., 0] > 0.5] = 1
geo[glow > 0.25] = 4
geo[lake > 0.5] = 8
geo[solid] = 2
geo[(foam > 0.3) & (lake > 0.5)] = 9
geo[fallm] = 9

# ── 加密（ver -2369，Ray：「多邊形數要高一點」）──────────────────────────
#  拓樸、空腔、水晶、植物都在 768² 上排好（上面所有像素尺寸都是那一張的），
#  輸出前整張放大成 SUPER 倍（世界大小不變 ⇒ 飛行頁那邊一格由 20 變 10 世界單位，MAP_SCALE 跟著改），
#  再在岩壁那一圈與地面加上只有細格子才裝得下的岩面起伏 —— 格子密了，起伏才有地方長。
SUPER = 2
N2 = N * SUPER
def up(a, it=cv2.INTER_CUBIC):
    return cv2.resize(a.astype(np.float32), (N2, N2), interpolation=it)
def upn(a):
    return cv2.resize(a.astype(np.uint8), (N2, N2), interpolation=cv2.INTER_NEAREST)
tt = np.clip(up(t, cv2.INTER_LINEAR), 0, 1)
band = np.clip(4 * tt * (1 - tt), 0, 1)                    # 岩壁那一圈（實心與空腔之間）
fine = fbm(N2, 3, 6, 0.55) - 0.5
mid = fbm(N2, 3, 22, 0.5) - 0.5
rough = fine * 80 + mid * 110
lake2 = up(lake, cv2.INTER_LINEAR); crys2 = up(crystal, cv2.INTER_LINEAR); plant2 = up(plant, cv2.INTER_LINEAR)
flat = np.clip(1 - lake2 * 2 - crys2 * 2 - plant2 * 2, 0, 1)   # 湖面、水晶、植物不加起伏
floor2 = up(floor) + band * rough + (1 - band) * fine * 14 * flat * (tt > 0.99)
ceil2 = up(ceil) - band * rough
solid2 = upn(solid).astype(bool)
floor2[solid2] = SOLID; ceil2[solid2] = SOLID
open2 = ~solid2
floor2[open2] = np.minimum(floor2[open2], np.maximum(up(floor)[open2], ALT - 90))   # 起伏不准把航道墊高
ceil2[open2] = np.maximum(ceil2[open2], np.minimum(up(ceil)[open2], ALT + 90))    # 也不准把航道壓低
holemask2 = upn(holemask).astype(bool)
glow2 = np.clip(up(glow, cv2.INTER_LINEAR), 0, 1)
shaft2 = np.clip(up(shaft, cv2.INTER_LINEAR), 0, 1)
spill2 = np.clip(up(spill, cv2.INTER_LINEAR), 0, 1)
geo2 = upn(geo)
col2 = np.clip(up(col), 0, 255)
shade = 1 + band[..., None] * fine[..., None] * 0.35          # 岩壁上跟著起伏的明暗
col2 = np.clip(col2 * shade, 0, 255).astype(np.uint8)

# ── 輸出 ────────────────────────────────────────────────────────────
os.makedirs(OUT, exist_ok=True)
R_ = np.clip(np.round(floor2 / FLOOR_SCALE), 0, 255)
Gc = np.clip(np.round(ceil2 / CEIL_SCALE), 0, 254)
Gc[holemask2] = HOLE
B = np.clip(np.round(glow2 * 255), 0, 255)
hm = np.stack([R_, Gc, B], -1).astype(np.uint8)
aux = np.stack([np.round(shaft2 * 255), np.round(spill2 * 255), geo2], -1).astype(np.uint8)
col = col2

paths = {}
for name, arr in (('cave_hm.png', hm), ('cave_aux.png', aux), ('cave_col.png', col)):
    p = os.path.join(OUT, name)
    Image.fromarray(arr, 'RGB').save(p, optimize=True)
    paths[name] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]
json.dump({'rooms': {k: {kk: vv for kk, vv in R.items()} for k, R in ROOMS.items()},
           'links': [[a, b] for a, b, _ in LINKS]},
          open(os.path.join(OUT, 'cave_rooms.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 起點：入口窟中心，船頭朝往大廳的那條通道（飛行頁的前方是 (-sin a, -cos a)）
ax, ay, bx, by = ROOMS['A']['x'], ROOMS['A']['y'], ROOMS['B']['x'], ROOMS['B']['y']
start = (int(ax * 20), int(ay * 20), math.atan2(-(bx - ax), -(by - ay)))

# 把雜湊與起點寫回（同名覆蓋要換 ?v=，同 §5 的規矩；起點也只在這裡算，鐵律 7）
for html in (os.path.join(HERE, 'cave.html'), os.path.join(HERE, 'index.html')):
    if os.path.exists(html):
        s = open(html, encoding='utf-8').read()
        s = re.sub(r"const CAVE_V = \{[^}]*\};",
                   "const CAVE_V = {hm:'%s', aux:'%s', col:'%s'};" % (paths['cave_hm.png'], paths['cave_aux.png'], paths['cave_col.png']), s)
        key = 'CAVE_START' if html.endswith('index.html') else 'START'   # 飛行頁那一份叫 CAVE_START（別撞到別的 START）
        s = re.sub(r"const %s = \[[^\]]*\];" % key, "const %s = [%d, %d, %.4f];" % ((key,) + start), s)
        if html.endswith('index.html'):
            rooms_js = json.dumps([[R['name'], R['x'], R['y'], R['a'], R['b'], R['rot'], 1 if k == END else 0]
                                   for k, R in ROOMS.items()], ensure_ascii=False, separators=(',', ':'))
            # ⚠ 一律只換「那一行裡的陣列」，不准跨行（ver -2370：行尾有註解時 .*?\];\n 會一路吃到下一個 ]; 為止，實測刪掉 index.html 39 行）
            s = re.sub(r"const CAVE_ROOMS = \[[^\n]*?\];", lambda m: "const CAVE_ROOMS = %s;" % rooms_js, s, count=1)
            plants_js = json.dumps(PLANTS, separators=(',', ':'))
            crys_js = json.dumps(CRYSTALS, separators=(',', ':'))
            if 'const CAVE_CRYSTALS = ' in s:
                s = re.sub(r"const CAVE_CRYSTALS = \[[^\n]*?\];", lambda m: "const CAVE_CRYSTALS = %s;" % crys_js, s, count=1)
            else:
                s = s.replace('const CAVE_ALT = ', 'const CAVE_CRYSTALS = %s;   // [世界x, 世界y, 半徑, 高, 傾向角, 傾斜, 色]（build_cave.py 寫回）\nconst CAVE_ALT = ' % crys_js, 1)
            if 'const CAVE_PLANTS = ' in s:
                s = re.sub(r"const CAVE_PLANTS = \[[^\n]*?\];", lambda m: "const CAVE_PLANTS = %s;" % plants_js, s, count=1)
            else:
                s = s.replace('const CAVE_ALT = ', 'const CAVE_PLANTS = %s;   // [世界x, 世界y, 種類0~8, 尺寸, 轉角]（build_cave.py 寫回）\nconst CAVE_ALT = ' % plants_js, 1)
        open(html, 'w', encoding='utf-8').write(s)

# 航道自檢：船能走的地方（離岩壁夠遠、不是實心）要把所有空腔連成一塊
core = (dist > WALL_W + 1) & ~solid
nav = cv2.connectedComponents(core.astype(np.uint8))[1]
def room_label(R):
    # 空腔中心可能剛好立著石柱：取空腔裡最多的那一個航道編號，不只看中心一格
    c, s_ = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    u = ((XX - R['x']) * c + (YY - R['y']) * s_) / R['a']; v = (-(XX - R['x']) * s_ + (YY - R['y']) * c) / R['b']
    lab = nav[(u * u + v * v < 0.5) & core]
    return int(np.bincount(lab).argmax()) if lab.size else 0
ids = {k: room_label(R) for k, R in ROOMS.items()}
print('cave:', N, '→', N2, 'px,', len(PLANTS), 'plants,', len(CRYSTALS), 'crystals,', len(ROOMS), 'rooms,', len(LINKS), 'links,', len(holes), 'holes,',
      'crystal %.1f%%,' % (100 * crystal.mean()), 'falls', int(fallm.sum()), 'px', paths)
print('航道連通（同一個數字＝連得通；0＝那一格本身被堵住）:', ids)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""地底世界（地底大空洞）原型地圖（ver -2362，Ray：「遺蹟改成地底世界，地底大空洞，開船在 2.5D 的地底世界穿梭，
有一些發光植物跟天頂的孔洞引入地表光」）。

輸出三張（都在 flight/cave/，給 flight/cave.html 讀）：
    cave_hm.png   R＝地面高度 /4、G＝天頂高度 /8（255＝天頂的洞）、B＝發光植物強度
    cave_aux.png  R＝光柱遮罩（洞的投影、已模糊）、G＝發光植物的溢光（模糊）、
                  B＝地貌類別（飛行頁的 GEO 類別：0 深林／1 淺林／2 灰岩／3 褐岩／4 深礫／8 深水）
    cave_col.png  地面顏色（RGB）

尺度照飛行頁：1 地圖像素＝20 世界單位（MAP_SCALE），船定高 700。
    地面 40~360、天頂 ≥ 820（鐘乳石尖不低於 780）、石柱＝天頂一路接到地面（船過不去）。

可重跑：參數改了直接再跑一次，三張整批蓋掉（cave.html 吃 ?v=內容雜湊，見檔尾）。
用法：  python3 flight/build_cave.py
"""
import hashlib
import os
import re

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cave')
N = 512                      # 地圖像素（＝10240 世界單位見方）
SEED = 2362
rng = np.random.default_rng(SEED)

FLOOR_SCALE = 4              # R 通道 ×4
CEIL_SCALE = 8               # G 通道 ×8
HOLE = 255                   # G＝255 ⇒ 沒有天頂（洞）
ALT = 700                    # 船的定高（與 cave.html 的 ALT 同一個數字 —— 改一邊要改另一邊）


def fbm(n, octaves=5, base=64, persistence=0.5):
    """平滑雜訊：逐層放大的隨機格點，線性內插後疊加。回傳 0~1。"""
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


def disc(cx, cy, r, soft=1.0):
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    return np.clip((1 - d) / soft, 0, 1)


# ── 地面 ────────────────────────────────────────────────────────────
f0 = fbm(N, 6, 128, 0.55)
f1 = fbm(N, 4, 32, 0.5)
floor = 70 + f0 * 230 + f1 * 40                     # 70~340
# 地底湖（低窪、平）：兩片
lake = np.maximum(disc(150, 330, 70, 0.35), disc(360, 140, 50, 0.35))
floor = floor * (1 - lake) + 46 * lake
# 岩丘：幾座隆起（最高壓在 380，離船 320）
for _ in range(9):
    cx, cy = rng.uniform(40, N - 40, 2)
    floor += disc(cx, cy, rng.uniform(18, 40), 1.0) ** 1.6 * rng.uniform(60, 140)
floor = np.clip(floor, 40, 380)

# ── 天頂 ────────────────────────────────────────────────────────────
c0 = fbm(N, 5, 96, 0.55)
ceil = 1180 - c0 * 260                              # 920~1180
# 鐘乳石：小而尖的下垂錐（尖端不低於 780，讓船過得去）
for _ in range(220):
    cx, cy = rng.uniform(0, N, 2)
    r = rng.uniform(3, 9)
    depth = rng.uniform(80, 340)
    ceil -= disc(cx, cy, r, 1.0) ** 2.2 * depth
ceil = np.maximum(ceil, 790)

# 石柱：天頂一路接到地面（實心，船撞到被擋）
PILLARS = []
for _ in range(14):
    for _try in range(30):
        cx, cy = rng.uniform(30, N - 30, 2)
        if lake[int(cy), int(cx)] > 0.05:
            continue
        if all((cx - px) ** 2 + (cy - py) ** 2 > 60 ** 2 for px, py, _ in PILLARS):
            break
    r = rng.uniform(6, 13)
    PILLARS.append((cx, cy, r))
    core = disc(cx, cy, r, 0.25)                    # 柱身（硬邊）
    flare = disc(cx, cy, r * 2.4, 1.0) ** 2         # 上下張開的柱腳／柱頭
    floor = np.maximum(floor, floor + flare * 120)
    ceil = np.minimum(ceil, ceil - flare * 160)
    m = core > 0.5
    floor[m] = 1000                                  # 實心：地面直接頂到天頂之上
    ceil[m] = 1000

# 天頂的洞（引入地表光）
HOLES = [(256, 250, 22), (120, 120, 14), (400, 380, 17), (90, 420, 10), (430, 60, 12)]
hole = np.zeros((N, N), np.float32)
for cx, cy, r in HOLES:
    wob = 1 + 0.18 * (fbm(N, 3, 16, 0.5) - 0.5)
    hole = np.maximum(hole, disc(cx, cy, r * wob, 0.15))
holemask = hole > 0.5

# 船的航道保證：定高 ALT 上下各留 80（石柱除外）
ceil = np.where(floor >= 999, ceil, np.maximum(ceil, ALT + 80))
floor = np.where(floor >= 999, floor, np.minimum(floor, ALT - 80))

# ── 發光植物 ─────────────────────────────────────────────────────────
glow = np.zeros((N, N), np.float32)
G_CENTERS = [(200, 300), (300, 200), (330, 330), (160, 190), (420, 250), (80, 300), (250, 440), (260, 80)]
patch = fbm(N, 5, 16, 0.6)
for cx, cy in G_CENTERS:
    glow = np.maximum(glow, disc(cx, cy, rng.uniform(40, 70), 0.8))
glow = np.clip(glow * 1.6, 0, 1) * np.clip((patch - 0.40) * 4, 0, 1)
glow *= (lake < 0.3)                                  # 湖面不長
glow[floor >= 999] = 0
# 湖岸一圈發光（藻）
shore = np.clip(lake * 3, 0, 1) * (1 - np.clip(lake * 3 - 1.2, 0, 1)) * (lake < 0.6)
glow = np.maximum(glow, shore * 0.55 * (fbm(N, 4, 8, 0.6) > 0.45))
glow = np.clip(glow, 0, 1)
spill = cv2.GaussianBlur(glow, (0, 0), 9)
spill = spill / (spill.max() + 1e-6)

# ── 光柱遮罩：洞在地面的投影（光從洞口斜射，cave.html 依高度再位移取樣）──
shaft = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 3.5)
shaft = shaft / (shaft.max() + 1e-6)

# ── 地面顏色 ─────────────────────────────────────────────────────────
rock = np.array([88, 80, 90], np.float32)
rock2 = np.array([62, 58, 72], np.float32)
moss = np.array([46, 72, 62], np.float32)
sand = np.array([120, 108, 92], np.float32)
water = np.array([20, 40, 70], np.float32)
tone = fbm(N, 5, 24, 0.55)[..., None]
col = rock2 * (1 - tone) + rock * tone
mossy = (fbm(N, 4, 40, 0.5) > 0.55).astype(np.float32)[..., None] * 0.7
col = col * (1 - mossy) + moss * mossy
# 洞底下的地面（被光照到的地方長草、沙）
lit = cv2.GaussianBlur(holemask.astype(np.float32), (0, 0), 8)[..., None]
lit = np.clip(lit * 2.2, 0, 1)
col = col * (1 - lit) + (sand * 0.5 + np.array([90, 120, 60]) * 0.5) * lit
# 湖
col = col * (1 - lake[..., None]) + water * lake[..., None]
# 發光植物的底色（真正的發光在 cave.html 疊）
gcol = np.where((fbm(N, 3, 64, 0.5) > 0.5)[..., None], np.array([60, 230, 210], np.float32),
                np.array([150, 110, 255], np.float32))
col = col * (1 - glow[..., None]) + gcol * glow[..., None]
col[floor >= 999] = rock * 0.8
col = np.clip(col, 0, 255).astype(np.uint8)

# ── 地貌類別（飛行頁拿它挑地貌貼圖，與大陸同一套 —— 畫風才一致）──────────
geo = np.where(tone[..., 0] > 0.5, 2, 3).astype(np.uint8)        # 灰岩／褐岩
geo[mossy[..., 0] > 0.3] = 0                                     # 苔＝深林的貼圖
geo[lit[..., 0] > 0.5] = 1                                       # 洞口下的草地
geo[glow > 0.25] = 4                                             # 發光田的底＝深礫
geo[lake > 0.5] = 8
geo[floor >= 999] = 2

# ── 輸出 ────────────────────────────────────────────────────────────
os.makedirs(OUT, exist_ok=True)
R = np.clip(np.round(floor / FLOOR_SCALE), 0, 255)
Gc = np.clip(np.round(ceil / CEIL_SCALE), 0, 254)
Gc[holemask] = HOLE
B = np.clip(np.round(glow * 255), 0, 255)
hm = np.stack([R, Gc, B], -1).astype(np.uint8)
aux = np.stack([np.round(shaft * 255), np.round(spill * 255), geo], -1).astype(np.uint8)

paths = {}
for name, arr in (('cave_hm.png', hm), ('cave_aux.png', aux), ('cave_col.png', col)):
    p = os.path.join(OUT, name)
    Image.fromarray(arr, 'RGB').save(p, optimize=True)
    paths[name] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]

# 起點：最大洞口西北方約 55 像素的開闊處（cave.html 讀 START）
# 起點：繞著最大的洞口找一個「到洞口那一路都開闊」的位置，船頭朝洞口（不要一開場就對著石柱）
import math
hx, hy, _ = HOLES[0]
best = None
for ang in range(0, 360, 5):
    for rad in (55, 65, 75):
        sx, sy = hx + rad * math.cos(math.radians(ang)), hy + rad * math.sin(math.radians(ang))
        if not (20 < sx < N - 20 and 20 < sy < N - 20):
            continue
        clear = 1e9
        for t in np.linspace(0, 1, 40):
            x, y = int(sx + (hx - sx) * t), int(sy + (hy - sy) * t)
            for ox in (-3, 0, 3):
                for oy in (-3, 0, 3):
                    xx, yy = min(N - 1, max(0, x + ox)), min(N - 1, max(0, y + oy))
                    c = 1e9 if holemask[yy, xx] else ceil[yy, xx]
                    clear = min(clear, ALT - floor[yy, xx], c - ALT)
        if best is None or clear > best[0]:
            best = (clear, sx, sy)
_, sx, sy = best
# 飛行頁的前方是 (-sin a, -cos a)
start = (int(sx * 20), int(sy * 20), math.atan2(-(hx - sx), -(hy - sy)))

# 把雜湊與起點寫回 cave.html（同名覆蓋要換 ?v=，同 §5 的規矩；起點也是這裡算的，鐵律 7）
for html in (os.path.join(HERE, 'cave.html'), os.path.join(HERE, 'index.html')):
  if os.path.exists(html):
    s = open(html, encoding='utf-8').read()
    s = re.sub(r"const CAVE_V = \{[^}]*\};",
               "const CAVE_V = {hm:'%s', aux:'%s', col:'%s'};" % (paths['cave_hm.png'], paths['cave_aux.png'], paths['cave_col.png']), s)
    key = 'CAVE_START' if html.endswith('index.html') else 'START'   # 飛行頁那一份叫 CAVE_START（別撞到別的 START）
    s = re.sub(r"const %s = \[[^\]]*\];" % key, "const %s = [%d, %d, %.4f];" % ((key,) + start), s)
    open(html, 'w', encoding='utf-8').write(s)
print('cave:', N, 'px,', len(PILLARS), 'pillars,', len(HOLES), 'holes, glow %.1f%%' % (100 * (glow > 0.2).mean()), paths)

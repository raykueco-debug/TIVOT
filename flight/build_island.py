#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ver -733：阿斯佩里亞王國外海的大型島嶼（主島面積 ≈ 恩雅王國 48.9k 全解析像素）。
島群配置取不列顛群島的「結構」（一大＋一中＋成串小島），但整個鏡射＋換方位：
  · 主島在大陸西南外海，長軸東西向（不列顛是南北向）
  · 中島在主島「北方」的西灣（愛爾蘭在不列顛西方）
  · 小島鏈沿中島與主島之間往南串（赫布里底群島在蘇格蘭西北）
重跑：py flight/build_island.py —— ⚠ 它會**覆蓋**兩張 silvermoon PNG，
跑之前先 tools/recycle.sh 回收現行版，跑完把 index.html 的 ?v=N 再 +1（§5 快取鐵則）。
預覽輸出 _island_preview.png / _island_world.png（底線開頭，遊戲不載、gitignore 同類）。
高度＝多八度值雜訊 × 距岸衰減；配色＝按高度分箱從恩雅／南阿斯佩里亞的實地取樣，
再乘上自算的 NW 光 hillshade（原圖的陰影是烘死的，新地也要有同一種立體感）。
"""
import numpy as np
from PIL import Image
from scipy import ndimage

import os
BASE = os.path.dirname(os.path.abspath(__file__)) + '/'
rng = np.random.default_rng(20260902)

hg = np.array(Image.open(BASE + 'silvermoon_heightmap.png')).astype(np.float64)
tr = np.array(Image.open(BASE + 'silvermoon_terrain.png')).astype(np.float64)
H, W = hg.shape
sea_now = hg <= 21

# ── 值雜訊（多八度）──────────────────────────────────────────────
def vnoise(shape, cell, seed):
    r = np.random.default_rng(seed)
    gh, gw = shape[0] // cell + 2, shape[1] // cell + 2
    g = r.random((gh, gw))
    big = ndimage.zoom(g, cell, order=3)[:shape[0], :shape[1]]
    return big

def fbm(shape, base_cell, octaves, seed):
    out = np.zeros(shape)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * vnoise(shape, max(2, base_cell >> o), seed + o)
        tot += amp
        amp *= 0.5
    return out / tot

# ── 形狀：高斯 blob 疊加 → 域扭曲 → 門檻（門檻用二分法逼近目標面積）──
def blob(field, cx, cy, rx, ry, rot=0.0, w=1.0):
    yy, xx = np.mgrid[0:H, 0:W]
    ca, sa = np.cos(rot), np.sin(rot)
    dx, dy = xx - cx, yy - cy
    u = (dx * ca + dy * sa) / rx
    v = (-dx * sa + dy * ca) / ry
    field += w * np.exp(-(u * u + v * v) * 1.8)

def shape_mask(blobs, target_area, warp_amp, seed, roughness_cell=48):
    f = np.zeros((H, W))
    for b in blobs:
        blob(f, *b)
    # 域扭曲：海岸線的碎形感
    wx = (fbm((H, W), roughness_cell, 4, seed) - 0.5) * 2
    wy = (fbm((H, W), roughness_cell, 4, seed + 100) - 0.5) * 2
    yy, xx = np.mgrid[0:H, 0:W]
    sx = np.clip(xx + wx * warp_amp, 0, W - 1)
    sy = np.clip(yy + wy * warp_amp, 0, H - 1)
    f = ndimage.map_coordinates(f, [sy, sx], order=1)
    lo, hi = 0.05, 0.95
    for _ in range(40):
        th = (lo + hi) / 2
        area = int((f > th).sum())
        if area > target_area:
            lo = th
        else:
            hi = th
    m = f > (lo + hi) / 2
    # 只留最大連通塊（扭曲可能甩出碎屑）
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = lab == (np.argmax(sizes) + 1)
    return m

# 主島：長軸東西向，西肥東尖（尾端一條往東的半島），北緣一個小隆起
main = shape_mask([
    (235, 1040, 148, 92, np.deg2rad(8)),      # 核心
    (128, 1005, 78, 66, 0.0),                 # 西肥
    (345, 978, 66, 42, np.deg2rad(-22)),      # 東北肩
    (418, 1062, 52, 26, np.deg2rad(14), 0.9), # 東半島（康瓦爾的鏡像語氣）
    (198, 952, 55, 40, 0.0, 0.8),             # 北隆起
], target_area=48900, warp_amp=14, seed=7)

# 中島：西灣裡，NNE–SSW 斜放
mid = shape_mask([
    (102, 565, 44, 72, np.deg2rad(18)),
    (138, 645, 42, 40, 0.0, 0.9),
], target_area=10200, warp_amp=10, seed=17)

# 小島鏈（中島 → 主島之間往南串；另兩顆在主島東側）
isles = np.zeros((H, W), dtype=bool)
for (cx, cy, r, sd) in [(60, 748, 13, 31), (96, 802, 15, 32), (63, 872, 11, 33),
                        (108, 903, 12, 34), (480, 992, 9, 35), (507, 1058, 11, 36)]:
    isles |= shape_mask([(cx, cy, r, r * 0.8, rng.random() * 3.14)],
                        target_area=int(np.pi * r * r * 0.55), warp_amp=4, seed=sd,
                        roughness_cell=16)

island = main | mid | isles

# ── 安全檢查 ──────────────────────────────────────────────────────
assert island[~sea_now].sum() == 0, '島壓到既有陸地！'
d_old = ndimage.distance_transform_edt(hg <= 21)   # 距既有陸地
min_strait = d_old[island].min()
print('最窄海峽（到既有陸地，px）:', round(min_strait, 1))
assert min_strait >= 22, '海峽太窄'
import json
stars = json.load(open(BASE + 'starpoints.json'))['points']
newland_d = ndimage.distance_transform_edt(~island)
for p in stars:
    d = newland_d[int(p['y']), int(p['x'])]
    assert d > 18, f"星點 {p['id']} 被新島壓到（d={d}）"
edge = min(island.nonzero()[1].min(), (W - 1) - island.nonzero()[1].max(),
           island.nonzero()[0].min(), (H - 1) - island.nonzero()[0].max())
print('離圖緣最近（px）:', edge)
print('面積 主島:', int(main.sum()), '中島:', int(mid.sum()), '小島:', int(isles.sum()),
      '合計:', int(island.sum()), '（恩雅=48922）')

# ── 高度 ──────────────────────────────────────────────────────────
dist_in = ndimage.distance_transform_edt(island)
# 海岸帶 0→1（8px 拉滿）；內陸再以 fbm 起伏
coast = np.clip(dist_in / 8.0, 0, 1)
n1 = fbm((H, W), 96, 5, 900)          # 大起伏
n2 = fbm((H, W), 24, 4, 901)          # 細節
# 高地核：主島西南一塊（把「蘇格蘭高地在北」的印象打掉）
yy, xx = np.mgrid[0:H, 0:W]
highland = np.exp(-(((xx - 175) / 95.0) ** 2 + ((yy - 1065) / 60.0) ** 2) * 1.6)
h_is = 26 + coast * (16 + n1 * 70 + n2 * 24 + highland * 105 * n1)
h_is = np.clip(h_is, 24, 210)
h_new = hg.copy()
h_new[island] = h_is[island]
land_h = h_new[island]
print('島高度: min', int(land_h.min()), 'mean', round(land_h.mean(), 1), 'max', int(land_h.max()))

# ── 配色＋高度改成「整塊搬運」：從大陸內陸借真實地形（顏色與高度一起）──
# 逐像素合成的質感一眼是貼的（沒有烘死的白稜線與林斑）；借真地形連陰影、
# 銳化、河點都是同一鍋出來的。防認出：來源鏡射 ＋ 低頻域扭曲 ±22px。
# 來源：阿斯佩里亞中部內陸（平原＋稜線＋林斑都有）
SX0, SX1, SY0, SY1 = 180, 760, 300, 820
warpx = (fbm((H, W), 128, 3, 903) - 0.5) * 44
warpy = (fbm((H, W), 128, 3, 904) - 0.5) * 44
iy, ix = np.where(island)
IX0, IY0 = ix.min(), iy.min()
IW, IH = ix.max() - IX0 + 1, iy.max() - IY0 + 1
# 鏡射映射（x 翻轉）＋等比縮放塞進來源框
kx = (SX1 - SX0 - 60) / IW
ky = (SY1 - SY0 - 60) / IH
sx = SX1 - 30 - (ix - IX0) * kx + warpx[iy, ix]
sy = SY0 + 30 + (iy - IY0) * ky + warpy[iy, ix]
sx = np.clip(sx, 0, W - 1); sy = np.clip(sy, 0, H - 1)
sxi, syi = sx.astype(int), sy.astype(int)
# 來源落在海／河上的點 → 用「最近合法來源」補（在來源空間查最近陸地）
riverish = (tr[..., 2] > tr[..., 0] + 16) & (tr[..., 2] > tr[..., 1] + 4) \
           & (tr[..., 2] > 70) & (tr[..., 2] < 200)
valid = (hg > 21) & ~riverish
_, (nyi, nxi) = ndimage.distance_transform_edt(~valid, return_indices=True)
bad = ~valid[syi, sxi]
b_sy, b_sx = syi[bad].copy(), sxi[bad].copy()
syi[bad] = nyi[b_sy, b_sx]
sxi[bad] = nxi[b_sy, b_sx]
print('來源落海要補的點：', int(bad.sum()), '/', len(sxi))
# 顏色直接搬
out_c = tr.copy()
out_c[iy, ix] = tr[syi, sxi]
# 高度：借來源的結構，乘上距岸衰減（島緣要沉入海）；壓一點讓島的量感 ≈ 恩雅
h_src = hg[syi, sxi]
h_bor = 24 + np.clip(h_src - 20, 0, None) * 0.80
h_new = hg.copy()
h_new[iy, ix] = np.clip(24 + coast[iy, ix] * (h_bor - 24), 24, 210)
land_h = h_new[island]
print('島高度: min', int(land_h.min()), 'mean', round(land_h.mean(), 1), 'max', int(land_h.max()))
# 海岸帶把借來的顏色往岸色壓一點（來源是內陸，直接切到海會太生硬）
coast_band = (coast < 1) & island
shore = np.array([146, 138, 108], dtype=np.float64)   # 既有海岸的砂岩色調
a = (1 - coast[coast_band])[:, None] * 0.5
out_c[coast_band] = out_c[coast_band] * (1 - a) + shore * a
mask3 = island[..., None]

# ── 輸出 ──────────────────────────────────────────────────────────
Image.fromarray(np.clip(h_new, 0, 255).astype(np.uint8), 'L').save(BASE + 'silvermoon_heightmap.png')
Image.fromarray(np.clip(out_c, 0, 255).astype(np.uint8), 'RGB').save(BASE + 'silvermoon_terrain.png')
print('已寫出兩張 PNG')

# 預覽
prev = out_c.astype(np.uint8).copy()
prev[h_new <= 21] = [18, 28, 52]
Image.fromarray(prev[380:1200, 0:700]).save(
    BASE + '_island_preview.png')
Image.fromarray(prev[::2, ::2]).save(
    BASE + '_island_world.png')

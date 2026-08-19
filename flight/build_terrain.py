# -*- coding: utf-8 -*-
"""依 Reference/R1water.png 的水文與地形設計，改寫大陸的高度圖與地表色圖。

▍為什麼是「從基底重算」而不是就地修改
地形改壞就回不去，而且要調參數勢必反覆重跑。所以原始的兩張圖鎖在
`_src/terrain/` 當基底，**永不修改**；每次執行都從基底重算一次，輸出覆蓋
`silvermoon_heightmap.png` / `silvermoon_terrain.png`。要退回原狀就把 EDITS
清空重跑。

▍為什麼兩張圖都要動
高度圖決定形狀，但**河道遮罩是從地表色反推的**（index.html 的
`b>r+16 && b>g+4 && 70<b<200`）。只改高度會得到「有溝沒有水色」的乾谷；
只改顏色會得到「畫在山坡上的藍線」。兩邊必須同步。

▍幾何來自哪裡
Reference/R1water.png 是疊在 silvermoon_sheet.png 上畫的，兩張同尺寸，所以
差分就能把畫上去的東西抽出來（同 build_regions.py）。實測抽到：
  · 4 座高山湖，半徑均 48px（≈960 世界單位）
  · 河道 32843 px（全圖 1.27%），7 條線段
  · 2 道山脈走向示意，各 124x42px，主軸同為 121.0°
⚠ 綠色方塊是**走向示意**，不是山脈的形狀。照著畫成長方形是錯的 ——
  要沿那個軸拉出有起伏的山脊，長度也不受方塊長度限制。

用法：  py flight/build_terrain.py [--only ridges|lakes|rivers]
"""
import argparse
import math
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_H = os.path.join(HERE, '_src/terrain/heightmap_base.png')
BASE_T = os.path.join(HERE, '_src/terrain/terrain_base.png')
OUT_H = os.path.join(HERE, 'silvermoon_heightmap.png')
OUT_T = os.path.join(HERE, 'silvermoon_terrain.png')

MAP_SCALE = 20
CLOUD_H = 44
PEAK_SCALE = 520
SEA_GREY = CLOUD_H / PEAK_SCALE * 255.0      # 21.6

# ── 卡耶爾山谷：兩道包夾的山脈 ────────────────────────────────────────
# 中心與主軸取自 R1water 的綠塊（PCA 實測 121.0°，兩塊間距 80px）。
# ⚠ len 遠大於綠塊的 124px：那兩塊只是走向示意。實測現況的橫剖面在
#   -80~-10px 已有 99~169 的高地、+70~+150 有 118~195，山脈本來就在那裡，
#   這裡是把它們接起來、加高、讓中間的走廊乾淨。
# ⚠ 長度 130 不是隨便取的：沿 121° 走到 +100px 就進雲海了（實測 17 個取樣點
#   有 3~4 個在海平面以下）。綠塊畫 124px 是有道理的，延伸太長會憑空造出新陸地
#   —— 第一版用 300 造出 11877px 的新海岸線，城的定位與國界索引全部要重跑。
RIDGES = [
    # (中心x, 中心y, 主軸角度°, 長度px, 半寬px, 脊頂灰階, 起伏幅度)
    (963, 777, 121.0, 130, 24, 200, 32),
    (1041, 794, 121.0, 130, 24, 212, 32),
]
# ⚠ maxCut 是這裡的關鍵。第一版把谷底壓到定值 52，結果最深切了 187 灰階 ——
#   谷心 ±40px 有 20% 的像素高於 150，那是真的山，被整片削平。
#   改成「最多只切 maxCut」，谷底因此保有原本的起伏，而且不會挖成峽谷。
VALLEY = dict(x=1002, y=786, ang=121.0, length=110, half=20, feather=16, maxCut=42)


def ridge_field(H, W, cx, cy, ang_deg, length, half, peak, wob, seed):
    """沿一條線段生成山脊的高度場（只加不減，回傳要加上去的量）。

    ⚠ 脊線要有起伏。等寬等高的直脊在低解析度緩衝上讀起來像一道牆 ——
      這個引擎的地形是 234x334 上採樣的低頻內容，人造的規則形狀特別顯眼。
      沿脊長加一條低頻噪聲，脊頂高度與中心線位置都跟著擺。
    ⚠ 只回傳增量，由呼叫端做 max()：直接寫入會把既有的山削掉。
    """
    rng = np.random.default_rng(seed)
    a = math.radians(ang_deg)
    ux, uy = math.cos(a), math.sin(a)          # 沿脊
    vx, vy = -uy, ux                           # 垂直脊

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx, dy = xx - cx, yy - cy
    t = dx * ux + dy * uy                      # 沿脊的座標
    s = dx * vx + dy * vy                      # 離脊心的距離

    # 沿脊的低頻起伏：脊頂高度與中心線橫向位移各一條
    n = 512
    ts = np.linspace(-length, length, n)
    k = rng.normal(size=n)
    k = np.convolve(np.r_[k, k, k], np.ones(41) / 41, 'same')[n:2 * n]
    k /= (np.abs(k).max() + 1e-6)
    k2 = rng.normal(size=n)
    k2 = np.convolve(np.r_[k2, k2, k2], np.ones(61) / 61, 'same')[n:2 * n]
    k2 /= (np.abs(k2).max() + 1e-6)

    tc = np.clip((t + length) / (2 * length) * (n - 1), 0, n - 1)
    i0 = tc.astype(np.int32)
    hk = k[i0]
    off = k2[i0] * half * 0.55                 # 中心線擺動
    s = s - off

    # 沿脊：兩端收斂（不然山脈是突然開始的）
    along = np.clip(1.0 - (np.abs(t) / length) ** 2.2, 0, 1)
    # 橫向：脊的斷面。用 cos² 而不是高斯 —— 高斯的尾巴太長，會把整片抬起來
    w = half * (1.0 + 0.25 * hk)
    lat = np.clip(1.0 - (np.abs(s) / np.maximum(w, 1e-3)), 0, 1)
    lat = np.sin(lat * math.pi / 2) ** 2

    amp = peak + wob * hk
    return (along * lat * amp).astype(np.float32)


def apply_ridges(h, land0):
    add = np.zeros_like(h)
    for i, (cx, cy, ang, ln, half, peak, wob) in enumerate(RIDGES):
        add = np.maximum(add, ridge_field(h.shape[0], h.shape[1],
                                          cx, cy, ang, ln, half, peak, wob, 1000 + i))
    # ⚠ 只在**原本就是陸地**的地方抬升。不擋的話山脊會延伸到雲海上憑空造出
    #   新陸地，海岸線一動，城的定位、路網、國界索引全部要重跑。
    #   邊緣羽化一下，免得山脊在海岸線上被切成斷面。
    lm = cv2.GaussianBlur(land0.astype(np.float32), (0, 0), 6.0)
    add *= np.clip((lm - 0.35) / 0.5, 0, 1)
    # ⚠ 只抬不降：既有的山比脊高的地方保持原樣（同河面整平那條規則）
    out = np.maximum(h, add)
    n = int((out > h + 0.5).sum())
    print('  山脈：抬升 %d px（佔全圖 %.2f%%），最高 +%.0f 灰階'
          % (n, 100.0 * n / h.size, (out - h).max()))
    return out


def carve_valley(h):
    """把兩脊之間的走廊壓平成溪谷。

    ⚠ 壓到定值會挖出峽谷（河面整平那一輪的教訓）。這裡是**上限**不是設定值：
      高於 floor 的才壓下來，本來就低的不動，谷底因此保有原本的起伏。
    """
    V = VALLEY
    a = math.radians(V['ang'])
    ux, uy = math.cos(a), math.sin(a)
    vx, vy = -uy, ux
    yy, xx = np.mgrid[0:h.shape[0], 0:h.shape[1]].astype(np.float32)
    dx, dy = xx - V['x'], yy - V['y']
    t = dx * ux + dy * uy
    s = np.abs(dx * vx + dy * vy)
    inside = (np.abs(t) < V['length']) & (s < V['half'] + V['feather'])
    k = np.clip((V['half'] + V['feather'] - s) / max(1e-3, V['feather']), 0, 1)
    k *= np.clip(1.0 - (np.abs(t) / V['length']) ** 3, 0, 1)
    out = np.where(inside, h - k * V['maxCut'], h)
    # ⚠ 谷底不准掉進雲海 —— 但這個下限**只能作用在谷內**。
    #   寫成全圖的 np.maximum 會把整片雲海抬成陸地（實測海岸線動了 50.8%）。
    out = np.where(inside, np.maximum(out, SEA_GREY + 4), out)
    n = int((out < h - 0.5).sum())
    print('  溪谷：壓低 %d px，最深 -%.0f 灰階' % (n, (h - out).max()))
    return out.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    steps = set(a.only.split(',')) if a.only else {'ridges'}

    h = np.asarray(Image.open(BASE_H).convert('L')).astype(np.float32)
    t = np.asarray(Image.open(BASE_T).convert('RGB')).astype(np.float32)
    H, W = h.shape
    land0 = h > SEA_GREY
    print('基底 %dx%d   陸地 %.2f%%' % (W, H, 100 * land0.mean()))

    if 'ridges' in steps:
        h = apply_ridges(h, land0)
        h = carve_valley(h)

    land1 = h > SEA_GREY
    moved = int((land1 != land0).sum())
    print('海岸線變動 %d px（%.4f%%）%s'
          % (moved, 100.0 * moved / h.size,
             '' if moved < 500 else '  ⚠ 動太多，城的定位與國界索引都要重跑'))

    # 地表色：抬高的地方要跟著換成岩／雪，不然是「綠色的山」
    if 'ridges' in steps:
        rise = np.asarray(Image.open(BASE_H).convert('L')).astype(np.float32)
        d = h - rise
        m = d > 6
        if m.any():
            # 依最終高度分：高處雪、中段裸岩
            snow = m & (h > 190)
            rock = m & ~snow
            for msk, col, k in ((rock, (126, 120, 110), 0.72), (snow, (226, 228, 232), 0.80)):
                if msk.any():
                    for c in range(3):
                        t[:, :, c][msk] = t[:, :, c][msk] * (1 - k) + col[c] * k
            print('  地表色：裸岩 %d px、雪 %d px' % (int(rock.sum()), int(snow.sum())))

    Image.fromarray(np.clip(h, 0, 255).astype(np.uint8)).save(OUT_H)
    Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(OUT_T)
    print('→ %s / %s' % (os.path.basename(OUT_H), os.path.basename(OUT_T)))


if __name__ == '__main__':
    main()

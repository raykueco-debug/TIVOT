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
# ⚠ 半寬與脊頂高度是一起調的：實測第一版 half=24／peak=200 的高度梯度是
#   9.0 灰階/px，而周圍原生地形只有 1.1 —— 陡 8 倍。那種坡度會觸發引擎的
#   立面繪製路徑，讀起來就是階梯狀的鋸齒。放寬到 34、降到 165 之後約 4 倍，
#   還是比原生陡（山脊本來就該陡），但不再觸發階梯。
#   再寬就會跟另一道脊疊在一起把谷填掉（兩脊間距只有 80px）。
RIDGES = [
    # (中心x, 中心y, 主軸角度°, 長度px, 半寬px, 脊頂灰階, 起伏幅度)
    (963, 777, 121.0, 130, 34, 165, 28),
    (1041, 794, 121.0, 130, 34, 176, 28),
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
    # ⚠ 加一道小模糊：脊是解析式生成的，逐像素會有量化階。原生地形的梯度
    #   中位只有 1.1 灰階/px，人造的規則形狀在這個尺度上特別顯眼。
    add = cv2.GaussianBlur(add, (0, 0), 2.2)
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


def r1_masks():
    """從 Reference/R1water.png 差分抽出湖與河的遮罩。

    那張是疊在 silvermoon_sheet.png 上畫的（同 build_regions.py 的道理）。
    ⚠ 湖與河同色而且相連，要用**侵蝕**分開：河寬約 10~14px，湖直徑約 96px，
      侵蝕 25 之後只有湖活得下來。
    """
    a = np.asarray(Image.open(os.path.join(HERE, 'Reference/R1water.png'))
                   .convert('RGB')).astype(np.float32)
    b = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_sheet.png'))
                   .convert('RGB')).astype(np.float32)
    if a.shape != b.shape:
        raise SystemExit('R1water.png 與 silvermoon_sheet.png 尺寸不同')
    m = np.abs(a - b).max(axis=2) > 25
    hsv = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV)
    Hh, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    blue = ((Hh > 95) & (Hh < 115) & (S > 120) & (V > 170) & m).astype(np.uint8)
    blue = cv2.morphologyEx(blue, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    lake = cv2.erode(blue, np.ones((25, 25), np.uint8))
    lake = cv2.dilate(lake, np.ones((25, 25), np.uint8)) & blue
    return blue, lake, (blue & ~lake)


# 河道：core＝河面寬度（地圖像素）。⚠ 畫上去的線寬 10~14px 是**標註**不是河寬，
# 照著挖會得到 200~280 世界單位寬的河。取 4 讓它與大陸原有的河同一個量級。
RIVER = dict(core=4.0, bank=9.0, depth=26.0, colour=(88, 116, 132))


def apply_rivers(h, t, land0):
    """沿 R1water 的河線挖河道，並把地表色換成河色。

    ⚠ 兩件事都要做。河道遮罩是 index.html 從**地表色**反推的
      （b>r+16 && b>g+4 && 70<b<200），只挖不上色的話那條溝不會被認成河，
      loadWorld 的「河面整平」就不會作用，飛過去看到的是一條乾谷。
    ⚠ 深度是相對**當地岸高**，不是絕對值。壓到固定高度會挖出峽谷 ——
      這條規則在 HANDOFF 的 D 節（河面整平）已經付過學費。
    """
    _, _, riv = r1_masks()
    riv = (riv > 0) & land0
    if not riv.any():
        return h, t
    # 距離場：河心最深，往岸邊收斂
    d = cv2.distanceTransform((riv).astype(np.uint8), cv2.DIST_L2, 5)
    prof = np.clip(d / RIVER['core'], 0, 1)
    prof = np.sin(prof * math.pi / 2) ** 0.7          # 河心平、岸邊陡
    # 當地岸高：把地形用大核取中值，河道自己的值不會汙染岸高
    bank = cv2.medianBlur(h.astype(np.uint8), 31).astype(np.float32)
    target = bank - RIVER['depth']
    out = np.where(riv, h * (1 - prof) + np.minimum(h, target) * prof, h)
    # ⚠ 不准挖穿到雲海：那會打出直通雲海的洞（＝裂谷不是水，HANDOFF 記過）
    out = np.where(riv, np.maximum(out, SEA_GREY + 5), out)

    # 上色：核心整片河色，往外羽化，才不會是一條硬邊的藍帶
    wcol = np.clip(d / (RIVER['core'] * 0.75), 0, 1) * 0.94
    for c in range(3):
        t[:, :, c] = t[:, :, c] * (1 - wcol) + RIVER['colour'][c] * wcol
    cut = (h - out)
    print('  河道：%d px（全圖 %.2f%%），最深 -%.0f 灰階，上色權重>0.5 的 %d px'
          % (int(riv.sum()), 100.0 * riv.mean(), cut.max(), int((wcol > 0.5).sum())))
    return out.astype(np.float32), t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    # ⚠ rivers 預設關閉。R1water 畫的河線是**設計意圖**，不是沿現有的谷走 ——
    #   實測 7 條河段每一條都有往上爬的區段（8 個分箱裡 2~4 段上升 >3 灰階，
    #   最極端的河段 2 從 26 爬到 245）。挖固定深度會在穿過高地處切出 -176 灰階
    #   的峽谷。正解是「照著河把地形刻出來」：沿流路強制單調下降
    #   elev[i]=min(elev[i-1]-坡降, 地形[i])，再把地形削到那條剖面。
    #   那支演算法還沒寫，先關著，免得地形停在壞狀態。
    steps = set(a.only.split(',')) if a.only else {'ridges'}

    h = np.asarray(Image.open(BASE_H).convert('L')).astype(np.float32)
    t = np.asarray(Image.open(BASE_T).convert('RGB')).astype(np.float32)
    H, W = h.shape
    land0 = h > SEA_GREY
    print('基底 %dx%d   陸地 %.2f%%' % (W, H, 100 * land0.mean()))

    if 'ridges' in steps:
        h = apply_ridges(h, land0)
        h = carve_valley(h)
    if 'rivers' in steps:
        h, t = apply_rivers(h, t, land0)

    land1 = h > SEA_GREY
    moved = int((land1 != land0).sum())
    print('海岸線變動 %d px（%.4f%%）%s'
          % (moved, 100.0 * moved / h.size,
             '' if moved < 500 else '  ⚠ 動太多，城的定位與國界索引都要重跑'))

    # 地表色：抬高的地方要跟著換成岩／雪，不然是「綠色的山」
    if 'ridges' in steps:
        rise = np.asarray(Image.open(BASE_H).convert('L')).astype(np.float32)
        d = h - rise
        if (d > 3).any():
            # ⚠ 權重要**連續**，不能用二值遮罩。第一版用 d>6 硬切，邊界處 d 中位
            #   只有 6.5 顏色卻直接混到 0.72，那條硬邊正是鋸齒的來源之一。
            wr = np.clip((d - 3) / 22.0, 0, 1)
            # ⚠ 雪線也不能硬切。第一版切在 h>190，而抬升區的高度分佈 p90 是 187
            #   —— 那條線正好穿過分佈最密的地方，鋸齒最大化。改成有過渡帶。
            # ⚠ 雪線隨緯度變。帝都(y=600)大約是現實中羅馬的緯度(41.9°N)，
            #   往南（y 增大）雪線升高，南部的山就不該有雪。
            #   每往南 100px 抬高 34 灰階，到大陸南緣(y≈1000)雪線已在 285，
            #   超過灰階上限 255 —— 等於南部山永遠沒有雪，正是要的結果。
            yy2 = np.arange(h.shape[0], dtype=np.float32)[:, None]
            snowline = 148.0 + np.maximum(0.0, yy2 - 600.0) * 0.34
            ws = np.clip((h - snowline) / 38.0, 0, 1)
            for col, w in (((126, 120, 110), wr * (1 - ws) * 0.72),
                           ((226, 228, 232), wr * ws * 0.82)):
                for c in range(3):
                    t[:, :, c] = t[:, :, c] * (1 - w) + col[c] * w
            print('  地表色：換色權重 >0.5 的 %d px（岩 %d、雪 %d）'
                  % (int((wr > 0.5).sum()),
                     int(((wr * (1 - ws)) > 0.5).sum()), int(((wr * ws) > 0.5).sum())))

    Image.fromarray(np.clip(h, 0, 255).astype(np.uint8)).save(OUT_H)
    Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).save(OUT_T)
    print('→ %s / %s' % (os.path.basename(OUT_H), os.path.basename(OUT_T)))


if __name__ == '__main__':
    main()

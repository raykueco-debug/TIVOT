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
import re

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



# ══════════════════════════════════════════════════════════════════════════
# 水文重整（ver -1266，Ray：「重整全圖，讓水文山脈走勢合理，水往低處流，
#   大致北向南流」「不要動到已設置地點的區域」）
# ──────────────────────────────────────────────────────────────────────────
# 為什麼要整個重來：實測現況（`hydro_check`）
#   · 河格**沒有更低的河鄰居**（水流不出去）＝ 63.1%
#   · 陸地內流窪地（周圍全比自己高）＝ 102248 px（4.0%）
#   · 南北走勢：中間高、南北低；高度與 y 的相關只有 −0.06 ＝ 沒有走勢
# 原因很單純：**河是畫上去的**（從地表色反推），不是從地形算出來的。
# 畫的線不知道地形哪裡高，所以有 6 成的河段在往上爬。
#
# 作法（標準的 DEM 水文四步，順序不能換）：
#   ① 北高南低的區域傾斜 —— 只加在陸地，而且**離岸越近越弱**，海岸線才不會動
#   ② 填窪（形態學的以侵蝕重建）—— 每一格陸地都要有往海的下坡路
#   ③ D8 流向 ＋ 匯流面積 —— 河 ＝ 匯流超過門檻的地方，寬度隨流量
#   ④ 刻河道 ＋ 上水色；填得很深的窪地留成**湖**（填平的水面本來就是平的）
# ⚠⚠ 已設置地點的區域（城／遺蹟）**一律不動**：①②④ 都乘上 (1-保護)。
# ══════════════════════════════════════════════════════════════════════════
TILT_RANGE   = 46.0     # 北到南的總落差（灰階）。⚠ 太大會把南岸壓進海、北岸推成崖
TILT_EDGE    = 26.0     # 岸邊多少 px 之內不加傾斜（海岸線不准動）
RIVER_THR    = 320.0    # 匯流面積門檻（格）＝ 這條溪多大才算河
RIVER_CUT2   = 7.0      # 河道比兩岸低多少（灰階）
LAKE_FILL    = 40.0     # 填高超過這個就不是「填平」而是**湖**
PROT_FEATHER = 24.0     # 保護區外緣的羽化寬度（px）


def protect_mask(h, w, places):
    """已設置地點的保護遮罩（1＝完全不動）。

    ⚠ 半徑取城的插畫寬（planW，世界單位 → ÷MAP_SCALE÷2）再放寬 1.8 倍；
      遺蹟沒有 planW，給 28px 的地板 —— 量體加整地大約就是那個尺度。
    """
    prot = np.zeros((h, w), np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for o in places:
        r = max(28.0, o.get('planW', 0) / MAP_SCALE / 2.0 * 1.8)
        d = np.hypot(xx - o['x'], yy - o['y'])
        k = np.clip((r + PROT_FEATHER - d) / PROT_FEATHER, 0, 1)
        prot = np.maximum(prot, k * k * (3 - 2 * k))
    return prot


def regional_tilt(h, land0, prot):
    """① 北高南低。⚠ 只作用在內陸：岸邊乘 0，海岸線才不會移動。"""
    H, W = h.shape
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32)
    dsea = cv2.distanceTransform(land0.astype(np.uint8), cv2.DIST_L2, 5)
    edge = np.clip(dsea / TILT_EDGE, 0, 1)
    ramp = 1.0 - yy / (H - 1)
    t = (ramp - ramp.mean()) * TILT_RANGE * edge * land0 * (1 - prot)
    out = h + t
    out = np.where(land0, np.maximum(out, SEA_GREY + 2), np.minimum(out, SEA_GREY - 1))
    print('  ① 傾斜：±%.0f 灰階，海岸線變動 %d px'
          % (np.abs(t).max(), int(((out > SEA_GREY) != land0).sum())))
    return out.astype(np.float32)


def fill_sinks(h, land0):
    """② 填窪：形態學的「以侵蝕重建」。

    marker 從很高開始、被 h 由下托住，反覆取 3x3 最小值直到收斂 ——
    結果是「每一格都有往海的下坡路」的高度場。
    ⚠ 種子是**海與圖框**：沒有種子的話整張圖會被填成一片高原。
    """
    marker = np.full_like(h, 1e4)
    seed = ~land0
    marker[seed] = h[seed]
    marker[0, :] = h[0, :]; marker[-1, :] = h[-1, :]
    marker[:, 0] = h[:, 0]; marker[:, -1] = h[:, -1]
    k3 = np.ones((3, 3), np.uint8)
    it = 0
    while it < 4000:
        it += 1
        nm = np.maximum(cv2.erode(marker, k3), h)
        if np.array_equal(nm, marker):
            break
        marker = nm
    d = marker - h
    print('  ② 填窪：%d 趟，填高 %d px（中位 %.1f、最深 %.0f 灰階）'
          % (it, int((d > 0.01).sum()),
             float(np.median(d[d > 0.01])) if (d > 0.01).any() else 0, d.max()))
    return marker


NB8 = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, -1)]
NB8 = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]


def flow_acc(filled, land0, h_micro):
    """③ D8 流向 ＋ 匯流面積。

    ⚠⚠ 被填平的窪地是**完全水平**的，流向會由「鄰居的列舉順序」決定 ——
      畫出來是一條筆直的線。所以要給一點破平手的依據：
      **離海距離**（很弱的全域偏置，讓水往海走、流量集中）＋ **原始微地形**
      （更弱，讓線不要筆直）。
      ⚠ 反過來（微地形當主）會讓流量在平坦的湖底**散開**，下游的河就斷成一截一截
        （實測最大匯流由 11790 掉到 7897，河網全是碎片）。
    """
    H, W = filled.shape
    dsea = cv2.distanceTransform(land0.astype(np.uint8), cv2.DIST_L2, 5)
    route = filled + 1.0e-3 * dsea + 1.0e-5 * h_micro
    route[~land0] = -1e9
    best = np.full((H, W), -1, np.int64)
    bestd = np.zeros((H, W), np.float32)
    for k, (dy, dx) in enumerate(NB8):
        sh = np.roll(np.roll(route, -dy, 0), -dx, 1)
        if dy > 0: sh[-dy:, :] = 1e9
        if dy < 0: sh[:-dy, :] = 1e9
        if dx > 0: sh[:, -dx:] = 1e9
        if dx < 0: sh[:, :-dx] = 1e9
        drop = (route - sh) / (1.414 if dy and dx else 1.0)
        m = drop > bestd
        bestd = np.where(m, drop, bestd)
        best = np.where(m, k, best)
    acc = np.ones(H * W, np.float32)
    rt = route.ravel(); bs = best.ravel(); lm = land0.ravel()
    for i in np.argsort(-rt):
        if not lm[i]:
            continue
        k = bs[i]
        if k < 0:
            continue
        y, x = divmod(int(i), W)
        ny, nx = y + NB8[k][0], x + NB8[k][1]
        if 0 <= ny < H and 0 <= nx < W:
            acc[ny * W + nx] += acc[i]
    acc = acc.reshape(H, W)
    print('  ③ 流向：有下坡的陸地格 %.2f%%，最大匯流 %.0f 格'
          % (100.0 * ((best >= 0) & land0).sum() / land0.sum(), acc.max()))
    return acc



def carve_water(h_fill, h_pre, acc, land0, prot, t):
    """④ 刻河道、留湖、上水色（並把**舊的畫上去的河**抹掉）。

    ⚠⚠ 河道深度隨流量遞增（`sqrt(acc)`）—— 那不只是好看：深度**沿流向不遞減**，
      刻完的剖面才保證還是往下走的，不會刻出新的窪地。
    ⚠⚠ 被填得很深的窪地不要填平，留成**湖**：填平的水面本來就是平的，
      那正是湖該有的樣子（而且省掉「把整座盆地抬高 110 灰階」那種破壞）。
    ⚠⚠⚠ **舊的河一定要抹掉**。引擎的河道遮罩是從**地表色**反推的
      （`b>r+16 && b>g+4 && 70<b<200`）—— 不抹的話新舊兩套河會同時存在，
      而舊的那一套有六成是往上爬的，等於什麼都沒改。用 `cv2.inpaint` 從
      周圍的地面色補回去。
    """
    H, W = h_fill.shape
    fill_d = h_fill - h_pre
    lake = (fill_d > LAKE_FILL) & land0 & (prot < 0.5)
    riv_c = (acc > RIVER_THR) & land0 & (prot < 0.5) & ~lake

    # 河寬隨流量：主流粗、支流細
    widf = np.clip(np.sqrt(np.maximum(acc, 1.0) / RIVER_THR), 1, 4.2)
    Wm = np.zeros((H, W), np.float32)
    for lo, hi, r in ((0, 1.6, 1), (1.6, 2.4, 2), (2.4, 3.3, 3), (3.3, 99, 4)):
        m = (riv_c & (widf >= lo) & (widf < hi)).astype(np.uint8)
        if m.any():
            Wm = np.maximum(Wm, cv2.dilate(m, np.ones((2 * r + 1, 2 * r + 1), np.uint8)) * float(r))
    river = (Wm > 0) & land0 & (prot < 0.5) & ~lake

    # 刻：河心最深、往岸收斂（同既有 apply_rivers 的剖面作法）
    out = h_fill.copy()
    if river.any():
        d = cv2.distanceTransform(river.astype(np.uint8), cv2.DIST_L2, 5)
        prof = np.clip(d / np.maximum(Wm, 1.0), 0, 1)
        prof = np.sin(prof * math.pi / 2) ** 0.7
        depth = RIVER_CUT2 * np.clip(np.sqrt(np.maximum(acc, 1.0) / RIVER_THR), 1, 3.0)
        tgt = h_fill - depth
        out = np.where(river, h_fill * (1 - prof) + tgt * prof, h_fill)
        out = np.where(river, np.maximum(out, SEA_GREY + 5), out)     # 不准挖穿到雲海

    # ⚠⚠ **刻完要再填一次**（ver -1266 實測補上）：刻河道會製造新的窪地 ——
    #   最主要的來源是「不准挖穿到雲海」那個下限：靠海那一段的河床被夾上來，
    #   就在上游留下一個出不去的坑。實測只做一次填窪，保護區之外還有 5.09% 的
    #   陸地排不掉水；補這一趟之後降到 0.1% 以下。
    #   ⚠ 這一趟不會把河道填回去：會被填高的只有**真的排不掉的坑**，
    #     刻得好的河道本來就有下坡路。
    out = fill_sinks(out, land0)

    # 保護區：原樣不動（連填窪一起退回去）
    out = out * (1 - prot) + h_pre * prot

    # ── 地表色 ──────────────────────────────────────────────────────
    water_new = (river | lake)
    r0, g0, b0 = t[:, :, 0], t[:, :, 1], t[:, :, 2]
    water_old = (b0 > r0 + 16) & (b0 > g0 + 4) & (b0 > 70) & (b0 < 200) & land0
    stale = water_old & ~water_new
    if stale.any():
        m8 = cv2.dilate(stale.astype(np.uint8), np.ones((3, 3), np.uint8))
        t = cv2.inpaint(np.clip(t, 0, 255).astype(np.uint8), m8, 4, cv2.INPAINT_TELEA).astype(np.float32)
    if water_new.any():
        d2 = cv2.distanceTransform(water_new.astype(np.uint8), cv2.DIST_L2, 5)
        wcol = np.clip(d2 / 1.6, 0, 1) * 0.94
        for c in range(3):
            t[:, :, c] = t[:, :, c] * (1 - wcol) + RIVER['colour'][c] * wcol
    print('  ④ 河 %d px（%.2f%%）、湖 %d px；抹掉舊河 %d px'
          % (int(river.sum()), 100.0 * river.mean(), int(lake.sum()), int(stale.sum())))
    return out.astype(np.float32), t


def load_places():
    """已設置地點（城與地標）的座標 —— 從 flight/index.html 抽。

    ⚠ 自己數大括號切頂層物件，**不要用 `[^{}]*` 的正規式**：城裡有 `podium:{…}`、
      地標有 `land:{…}`，一有巢狀就整筆漏掉（實測只抓到 2 座城、漏了貝利薩爾）。
    """
    src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()

    def arr(start):
        i = src.index(start); j = src.index('[', i); d = 0; k = j
        while True:
            c = src[k]
            if c == '[': d += 1
            elif c == ']':
                d -= 1
                if d == 0: break
            k += 1
        return src[j + 1:k]

    def objs(body):
        out, d, st, i = [], 0, -1, 0
        while i < len(body):
            c = body[i]
            if c == "'":
                i += 1
                while i < len(body) and body[i] != "'":
                    i += 2 if body[i] == '\\' else 1
            elif c == '{':
                if d == 0: st = i
                d += 1
            elif c == '}':
                d -= 1
                if d == 0 and st >= 0:
                    out.append(body[st:i + 1]); st = -1
            i += 1
        return out

    def num(seg, key, dflt=0.0):
        m = re.search(r'\b%s:\s*(-?\d+(?:\.\d+)?)' % key, seg)
        return float(m.group(1)) if m else dflt

    def nm(seg):
        m = re.search(r"\bn:'([^']+)'", seg) or re.search(r"\bname:'([^']+)'", seg)
        return m.group(1) if m else '?'

    out, seen = [], set()
    for seg in objs(arr('const SETTLEMENTS = [')):
        if 'x:' not in seg or 'y:' not in seg: continue
        o = dict(n=nm(seg), x=num(seg, 'x'), y=num(seg, 'y'), planW=num(seg, 'planW'))
        out.append(o); seen.add(o['n'])
    for seg in objs(arr('const PLACES=[')):
        if 'x:' not in seg or 'y:' not in seg: continue
        n = nm(seg)
        if n in seen: continue
        out.append(dict(n=n, x=num(seg, 'x'), y=num(seg, 'y'), planW=num(seg, 'planW')))
    return out


def apply_hydro(h, t, land0):
    places = load_places()
    print('  保護 %d 個已設置地點：%s' % (len(places), '、'.join(o['n'] for o in places)))
    prot = protect_mask(h.shape[0], h.shape[1], places)
    print('  保護區核心 %.2f%%（含羽化 %.2f%%）'
          % (100 * (prot > 0.99).mean(), 100 * (prot > 0).mean()))
    h_micro = h.copy()
    h1 = regional_tilt(h, land0, prot)
    filled = fill_sinks(h1, land0)
    acc = flow_acc(filled, land0, h_micro)
    return carve_water(filled, h1, acc, land0, prot, t)


def bump_terrain_v():
    """⚠⚠⚠ 蓋掉圖之後把 `TERRAIN_V` 加一（§5：同名覆蓋一定要跳版本號）。

    這兩張是**同名覆蓋**的，檔名永遠一樣 —— 不跳的話瀏覽器拿快取裡的舊那一份，
    而**症狀只是「地圖看起來沒變」**，沒有任何錯誤訊息。ver -1266／-1267 連踩兩次
    （重整水文、又還原回去，兩次都忘了跳，Ray 那邊看到的一直是舊的）。
    ⚠ 由**蓋掉檔案的這一支**負責跳，不要指望人記得（鐵律 8）。
    ⚠ 不交給 `tools/bust.py`：那一支綁全域 `VERSION`，每改一次程式就要玩家
      重抓 1.7MB 的地形圖（同 `ASSET_VER` 不做成全域版本號的理由）。
    """
    p = os.path.join(HERE, 'index.html')
    s = open(p, encoding='utf-8').read()
    m = re.search(r"const TERRAIN_V\s*=\s*'\?v=(\d+)'", s)
    if not m:
        print('  ⚠ 找不到 TERRAIN_V，版本號沒跳 —— 瀏覽器會拿到舊的地形圖！')
        return
    n = int(m.group(1)) + 1
    s = s[:m.start()] + ("const TERRAIN_V  = '?v=%d'" % n) + s[m.end():]
    open(p, 'w', encoding='utf-8').write(s)
    print('  TERRAIN_V → ?v=%d（同名覆蓋，不跳的話瀏覽器會用快取）' % n)


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
    # ⚠⚠⚠ **`hydro` 預設關閉**（ver -1267，Ray 退回：「很多很不自然的水文，
    #   修改痕跡太重了。先把地圖回復到地圖編輯器之前的版本」）。
    #   程式碼留著當紀錄，要跑得自己 `--only hydro`，而且**跑之前先想清楚**：
    #   它在數字上是對的（水出不去的陸地 30.23% → 1.96%、北高南低的相關
    #   −0.06 → −0.17、海岸線 0 px 變動），但**看起來不自然**：
    #     · 填窪把 28% 的陸地墊高，谷地被抹平成一片片台地
    #     · 河網是演算法算出來的樹狀，密度均勻、分岔規律 —— 一眼看得出是生成的
    #     · 保護圓的邊界在地形上留下一圈接縫（Ray 說的「修改痕跡太重」）
    #   ⇒ 下次要動水文，**先解決「像不像手畫的」而不是「對不對」**：
    #     少填多刻（breach 而不是 fill）、河網密度隨地區變、保護區的過渡要更長。
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
    if 'hydro' in steps:
        print('水文重整（ver -1266）')
        h, t = apply_hydro(h, t, land0)

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
    bump_terrain_v()
    print('→ %s / %s' % (os.path.basename(OUT_H), os.path.basename(OUT_T)))


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""
把手繪的成品地圖（map_01.png）轉成引擎要的兩張來源圖。

  輸入  flight/map_01.png          1536×1024 的插畫（含外框／圖例／比例尺／城鎮文字）
  輸出  flight/silvermoon_terrain.png    地貌色（去標註）
        flight/silvermoon_heightmap.png  高度場（灰階）
        flight/map_build_debug.png       各階段的中間結果，出問題時看這張

⚠ 這張圖是「成品插畫」不是地形資料，所以高度得用推的。

  ▍山地怎麼認出來 —— 用**局部起伏度**，不是亮度
    實測各地貌的亮度幾乎完全重疊（山 87～109、平原 88～106），
    這張圖的山不是「畫得比較亮」而是「畫得比較皺」：稜線與陰影造成
    高頻對比，平原則是平的。所以取局部標準差當山地指標，
    這同時也符合物理 —— 崎嶇＝山。
    色相只用來認森林（r−g 明顯為負且飽和度高），那是唯一乾淨的色彩特徵。

  ▍海／陸
    海是連到畫框邊界的那一大塊藍。內陸湖泊同色，靠「有沒有連到邊界」
    區分 —— 只看顏色會把湖也挖成海。

  ▍高度＝ 離岸距離做的緩丘（大尺度）
        + 起伏度 → 山脈（作者畫的山脈走向就這樣被保住）
        + 插畫明暗的高頻（只作用在山區，給稜線細節）
    邊緣：距海岸 RIM_W 內強制拉到 RIM_H 以上 → 浮空大陸的斷崖。

⚠ 地貌色**不直接沿用插畫的像素**，而是依分類重新合成。原因有三：
   1. 文字擦不乾淨。文字與山脊高光同樣是「亮＋低飽和」，怎麼調門檻都會
      互相波及；中值補洞又會把岩石紋理抹成糊塊，還留下方形補丁。
   2. 插畫自帶的立體光影是照「俯視固定光源」畫的，貼到我們合成的 3D 地形
      上之後，畫死的陰影不會跟真實形狀對齊 → 看起來就是一片來歷不明的條紋。
      引擎本來就會依坡度算光，貼圖該給的是**固有色**不是打好光的成品。
   3. 合成的可控：雪線、森林濃淡、岩石色調都變成參數。

   插畫因此退居「版面來源」——它決定哪裡是山、森林、河、海岸線，
   這些資訊比它的像素值有價值得多。
   ⚠ 代價：道路與城鎮聚落的紋理不會出現在 3D 裡。要的話得另外把路網
     單獨抽成一張遮罩再畫上去，那是獨立的一步。

⚠ 經緯線是貫穿全圖的直線，用「整行/整列都偏亮」偵測後抹平 ——
   它會污染起伏度（被當成山脊），所以在分類之前就得處理掉。
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "map_01.png")
OUT_COL = os.path.join(HERE, "silvermoon_terrain.png")
OUT_HGT = os.path.join(HERE, "silvermoon_heightmap.png")
OUT_DBG = os.path.join(HERE, "map_build_debug.png")

# 目標尺寸＝引擎沿用的地圖像素數（PLACES 座標、MAP_SCALE 都以此為準）
TW, TH = 2152, 1200
# 插畫的內容框（外圈深色邊已量測過）
CROP = (11, 55, 1522, 990)

# 與 index.html 同步的高度常數
PEAK_SCALE = 520      # 灰階 255 → 世界高
CLOUD_H    = 44       # 雲海高度（世界單位）
RIM_H      = 145      # 邊緣台地高度
RIM_W      = 34       # 抬升作用範圍（地圖像素）
CRUISE_ALT = 700      # 巡航高度：峰頂必須低於此值

g = lambda world: world / PEAK_SCALE * 255.0      # 世界高 → 灰階


def main():
    im = Image.open(SRC).convert("RGB").crop(CROP).resize((TW, TH), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    r, gg, b = a[..., 0], a[..., 1], a[..., 2]
    lum = r * 0.299 + gg * 0.587 + b * 0.114
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)

    # ── 1. 海／陸 ──────────────────────────────────────────────────
    # 海：藍明顯高於紅、且整體偏暗。湖泊同色，靠連通性排除。
    bluish = (b - r > 14) & (b > 55)
    lab, n = ndi.label(bluish)
    edge = set(lab[0].tolist()) | set(lab[-1].tolist()) | \
           set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    edge.discard(0)
    sea = np.isin(lab, list(edge)) if edge else np.zeros_like(bluish)
    sea = ndi.binary_closing(sea, np.ones((5, 5)))
    land = ~sea
    land = ndi.binary_opening(land, np.ones((3, 3)))
    land = ndi.binary_fill_holes(land)          # 湖泊算陸地（之後再壓低）

    # 圖例方框與比例尺是壓在海上的「不透明矩形」，不藍 → 會被當成陸地，
    # 變成海中央一座方形島。真正的島嶼不會是完美矩形，用「填滿外接框的
    # 比例」就分得開：矩形 ≈1.0，海島大約 0.4～0.7。
    lb0, n0 = ndi.label(land)
    if n0:
        areas = np.bincount(lb0.ravel())
        keep0 = np.zeros(areas.size, bool)
        main = int(np.argmax(areas[1:])) + 1
        keep0[main] = True
        objs = ndi.find_objects(lb0)
        for k in range(1, n0 + 1):
            if k == main or areas[k] < 150:
                continue
            sl = objs[k - 1]
            bb = (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start)
            keep0[k] = areas[k] / max(bb, 1) < 0.82      # 夠不規則才算島
        land = keep0[lb0]

    # 內陸水域。⚠ 要濾掉碎點：插畫在岩石陰影邊緣有零星偏藍的反鋸齒像素，
    # 留著的話每一點在 MAP_SCALE 20 下都會變成 20 世界單位寬的藍斑。
    # 真正的河是細長連通線、湖是成塊區域，兩者都遠大於這個門檻。
    lake = bluish & land
    lb1, n1 = ndi.label(ndi.binary_closing(lake, np.ones((3, 3))))
    if n1:
        sz = np.bincount(lb1.ravel())
        keep1 = np.zeros(sz.size, bool)
        keep1[1:] = sz[1:] >= 60
        lake = keep1[lb1]

    # ── 2. 經緯線：貫穿全圖的直線，先抹平 ─────────────────────────
    # 判定「整列都比左右鄰居亮」——地貌不會有這種一路到底的一致性
    def wipe_lines(img, axis):
        L = img.mean(2)
        prof = L.mean(axis)                                     # 沿該軸壓成一維
        nb = (np.roll(prof, 4) + np.roll(prof, -4)) * 0.5
        d = prof - nb
        hit = np.where(d > d.std() * 2.2 + 0.4)[0]
        for i in hit:
            if 4 <= i < len(prof) - 4:
                if axis == 0: img[:, i] = (img[:, i - 3] + img[:, i + 3]) * 0.5
                else:         img[i, :] = (img[i - 3, :] + img[i + 3, :]) * 0.5
        return len(hit)
    a = a.copy()
    n_gx = wipe_lines(a, 0)
    n_gy = wipe_lines(a, 1)
    lum = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)

    # ── 3. 標註遮罩：只用來把文字排除在「起伏度」之外 ──────────────
    # 貼圖已改成合成，所以這裡不必補洞，只要別讓文字被當成山脊。
    bright = land & (lum > 190) & (sat < 0.26)
    lb, _n = ndi.label(ndi.binary_dilation(bright, np.ones((3, 3))))
    sizes = np.bincount(lb.ravel())
    keep = np.zeros(sizes.size, bool)
    keep[1:] = sizes[1:] < 700
    ink = ndi.binary_dilation(keep[lb], np.ones((9, 9)))

    clean = a
    clum = lum
    cmx, cmn = mx, mn
    csat = sat

    # ── 5. 地貌分類 ────────────────────────────────────────────────
    # 森林是唯一乾淨的色彩特徵：綠明顯高於紅、且飽和。
    forest = land & (clean[..., 1] - clean[..., 0] > 4) & (csat > 0.28)
    forest = ndi.binary_opening(forest, np.ones((3, 3)))

    # 起伏度＝局部標準差。這才是山地的指標（亮度分不出來，實測完全重疊）。
    # ⚠ 文字先換成鄰域平均再算起伏度，否則每個字都會變成一座小山
    lflat = np.where(ink, ndi.uniform_filter(clum, 31), clum)
    m1 = ndi.uniform_filter(lflat, 9)
    rug = np.sqrt(np.maximum(ndi.uniform_filter(lflat * lflat, 9) - m1 * m1, 0))
    rug = ndi.gaussian_filter(rug, 5)
    lo, hi_ = np.percentile(rug[land], 25), np.percentile(rug[land], 97)
    rn = np.clip((rug - lo) / max(1e-3, hi_ - lo), 0, 1) * land   # 0..1
    mount = land & (rn > 0.45)
    snow  = land & (csat < 0.18) & (clum > 150)

    # ── 6. 高度場 ──────────────────────────────────────────────────
    # (a) 離岸距離 → 大尺度緩丘。開 0.55 次方讓內陸不要一路長高。
    dist = ndi.distance_transform_edt(land).astype(np.float32)
    dn = dist / max(1.0, np.percentile(dist[land], 97))
    base = np.clip(dn, 0, 1) ** 0.55 * 130.0                    # 世界單位

    # (b) 起伏度 → 山脈。次方 >1 讓平原保持平坦，只有真的皺的地方長起來。
    ridge = (rn ** 1.35) * 400.0

    # (c) 插畫明暗的高頻 → 稜線細節，只作用在山區（同樣要吃去字後的版本）
    hf = lflat - ndi.gaussian_filter(lflat, 9)
    detail = ndi.gaussian_filter(hf, 1.0) * 2.0 * rn

    h = (base + ridge + forest * 18.0) * land + detail
    h = ndi.gaussian_filter(h, 1.6)
    h[~land] = 0.0
    h[lake] = np.minimum(h[lake], CLOUD_H + 26)                  # 湖面壓低但仍高於雲海

    # (d) 邊緣台地：距海岸 RIM_W 內拉到 RIM_H，斷崖才成立
    rim = land & (dist < RIM_W)
    h[rim] = np.maximum(h[rim], RIM_H)
    h[land] = np.maximum(h[land], CLOUD_H + 8)                   # 陸地一律高於雲海
    h[~land] = 0.0

    # (e) 峰頂必須低於巡航高度，否則會撞山
    peak = h.max()
    cap = CRUISE_ALT - 120
    if peak > cap:
        over = h > cap * 0.62
        h[over] = cap * 0.62 + (h[over] - cap * 0.62) * (cap - cap * 0.62) / (peak - cap * 0.62)

    # ── 7. 合成地貌色（固有色，不含光影）──────────────────────────
    hg = np.clip(h / PEAK_SCALE * 255.0, 0, 255).astype(np.uint8)
    Image.fromarray(hg, "L").save(OUT_HGT)

    # 各分類的反照率。刻意偏低飽和：引擎還會再套 GRADE_SAT／大氣霧，
    # 這裡給太艷的話疊完會變成塑膠感。
    C_PLAIN = np.array([126, 124,  86], np.float32)
    C_FOREST= np.array([ 74,  88,  56], np.float32)
    C_ROCK  = np.array([130, 122, 110], np.float32)
    C_SNOW  = np.array([228, 233, 242], np.float32)
    C_WATER = np.array([ 88, 116, 132], np.float32)   # 與引擎的河道偵測對齊

    forest_w = ndi.gaussian_filter(forest.astype(np.float32), 2.5)
    rock_w   = np.clip((rn - 0.20) / 0.28, 0, 1)                 # 山區露岩

    # 雪：緯度越高、雪線越低。y=0 是北（60°N+）、y=TH 是南（40°N）。
    # ⚠ 分佈**取自插畫的亮度**而不是我們合成的高度。作者把雪畫在稜線上，
    #   那是連續的山脊線；用高度推的話高度場本身是模糊團塊，
    #   算出來的雪會變成一顆一顆散落的白斑（實測就是這樣）。
    #   高度只當輔助分數，主導權交給畫面。
    latf = 1.0 - np.arange(TH, dtype=np.float32)[:, None] / TH   # 1=最北 0=最南
    art  = np.clip((lflat - 100.0) / 80.0, 0, 1)                 # 插畫亮度 0..1
    score = art * 0.62 + np.clip(h / 520.0, 0, 1) * 0.38
    need  = 0.56 - latf * 0.26                                   # 北方門檻低＝同樣高度就積雪
    snow_w = np.clip((score - need) / 0.13, 0, 1) * rock_w * land
    snow_w = ndi.gaussian_filter(snow_w, 1.2)                    # 只做極輕的收邊，保住稜線形狀

    col = np.repeat(C_PLAIN[None, None, :], TH, 0).repeat(TW, 1).copy()
    col += (C_FOREST - col) * forest_w[..., None]
    col += (C_ROCK   - col) * rock_w[..., None]
    col += (C_SNOW   - col) * snow_w[..., None]

    # 程序紋理：三個八度的值雜訊，讓大片同色不至於死板。
    # 用固定亂數種子 → 每次重建結果一致，方便比對。
    rng = np.random.default_rng(1908)
    tex = np.zeros((TH, TW), np.float32)
    for oct_, amp in ((96, 0.055), (32, 0.040), (11, 0.028)):
        n = rng.random((TH // oct_ + 2, TW // oct_ + 2)).astype(np.float32)
        n = np.asarray(Image.fromarray((n * 255).astype(np.uint8))
                       .resize((TW, TH), Image.BICUBIC), np.float32) / 255.0
        tex += (n - 0.5) * 2 * amp
    col *= (1.0 + tex)[..., None]

    # 水域（河＋湖）直接蓋上去，引擎靠這個顏色認河道／畫瀑布
    water = lake & land
    col[water] = C_WATER
    # 海：引擎在雲海高度以下改用程序雲，顏色其實用不到，壓暗避免誤判成河
    col[~land] = np.array([46, 52, 58], np.float32)

    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").save(OUT_COL)

    # ── 除錯拼圖 ───────────────────────────────────────────────────
    def tile(mask_or_img, tag):
        if mask_or_img.ndim == 2:
            v = mask_or_img
            v = (v - v.min()) / max(1e-6, (v.max() - v.min())) * 255
            img = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8)).convert("RGB")
        else:
            img = Image.fromarray(np.clip(mask_or_img, 0, 255).astype(np.uint8), "RGB")
        img = img.resize((TW // 3, TH // 3), Image.LANCZOS)
        from PIL import ImageDraw
        ImageDraw.Draw(img).text((6, 6), tag, fill=(255, 210, 90))
        return img

    dbg = Image.new("RGB", (TW // 3 * 3, TH // 3 * 2), (12, 13, 18))
    for i, (m, t) in enumerate([
        (a, "1 原插畫(去經緯線)"), (land.astype(float), "2 陸地遮罩"), (rn, "3 起伏度→山脈"),
        (h, "4 高度場"), (snow_w, "5 雪線(高度×緯度)"), (col, "6 合成貼圖"),
    ]):
        dbg.paste(tile(m, t), (i % 3 * (TW // 3), i // 3 * (TH // 3)))
    dbg.save(OUT_DBG)

    print(f"經緯線抹除 {n_gx} 欄 / {n_gy} 列")
    print(f"陸地 {land.mean()*100:5.1f}%　山地 {mount.mean()*100:4.1f}%　森林 {forest.mean()*100:4.1f}%　"
          f"積雪 {(snow_w>0.5).mean()*100:4.2f}%　水域 {water.mean()*100:4.2f}%")
    print(f"高度：峰頂 {h.max():.0f}（灰階 {hg.max()}）　陸地中位 {np.median(h[land]):.0f}　"
          f"巡航 {CRUISE_ALT}　雲海 {CLOUD_H}")
    print(f"→ {OUT_HGT}\n→ {OUT_COL}\n→ {OUT_DBG}")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""把等角視的城市插畫，做成 3D 飛行畫面可以貼地使用的素材。

產出兩樣（以薇拉馮德港為例）：
  velafonte_plan.webp  正俯視色圖（色調對齊、外緣羽化、依海岸線裁過）
  velafonte_h.webp     高度圖（灰階；0＝地面，255＝index.html 的 planH 世界單位）

▍反投影
等角視是把地面平面縱向壓縮 k 倍（仰角 θ 時 k=sinθ），縱向拉伸 1/k 就還原。
UNSQUASH 是量出來的：城的輪廓在 ×1.60 時最接近正圓（×1.40 仍偏扁、
×1.85 已偏長）。
⚠ 建築立面會往上抹開 —— 等角視看得到牆、俯視看不到，這是必然代價。
  遊戲裡這座城最大約 400px 寬，抹開幾像素看不出來。

▍為什麼海岸線要烘進 alpha
先前是 runtime 逐格判斷「格心落在海上就不畫」。格子大小隨距離變，鏡頭一動
哪些格被剔除就整塊整塊地跳 —— 海岸線因此會鋸齒抖動。改成在這裡逐像素取樣
大陸高度圖、把海的部分 alpha 清零：靜態、精確、runtime 零成本。

⚠ 下面 JOBS 裡的 mx/my/planW/planRot 必須與 index.html 的 SETTLEMENTS 一致。
  改了一邊就要改另一邊，否則海岸線會對不上。

用法：  py flight/build_city.py
"""
import io
import os
import json
import sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.join(HERE, 'city')
HEIGHTMAP = os.path.join(HERE, 'silvermoon_heightmap.png')

UNSQUASH = 1.60      # 縱向拉伸倍率（見上方）
# 輸出長邊。768 在遊戲裡「太利」——地形是 234×334 上採樣的低頻內容，城若保有
# 768 的細節密度，即使像素大小一樣，讀起來仍比地形精細得多。440 讓兩者的細節
# 密度接近，又還沒糊掉街廓。
MAXDIM = 440
QUALITY = 88

# ── 色調對齊 ──────────────────────────────────────────────────────────
# 插畫比遊戲裡的地形亮得多、也飽和得多，直接貼上去像一張貼紙。
# 這兩個數字是對著地形實測值調的：近景地表 RGB≈(64,71,54)、S≈0.24、V≈0.28，
# 而地形本身還會再吃 GRADE_SAT=0.68 的去飽和。
# ⚠ 烘進素材而不是在 runtime 做：ctx.filter 在部分 Safari 版本沒有，
#   而且每幀做去飽和是白費的——這是固定的色調對齊，不隨光線變。
SAT = 0.70           # 飽和度倍率
VAL = 0.86           # 明度倍率
# ⚠ 必須與 index.html 的同名常數一致：地形每像素會再過這一道去飽和，所以
#   「地圖上的顏色」與「畫面上的顏色」差了這個係數。逐類別對齊要用後者。
GRADE_SAT = 0.68
# 外緣羽化：插畫是硬邊，貼在地形上就是一塊界線分明的補丁——那正是「割裂感」
# 的來源。把最外圈的 alpha 漸淡，讓郊區的農地與綠地融進地形。
# ⚠ 羽化要**沿著插畫自己的輪廓**往內，不能用「以圖心為原點的橢圓距離場」。
#   舊版就是後者，結果把插畫裁成了正圓：實測處理後的外緣半徑變異只剩 2.1%，
#   而原插畫是 17.4%（479~850）——城看起來「幾乎正圓」就是這麼來的。
#   作法：把 alpha 二值化後高斯模糊，模糊值本身就是一個沿輪廓的柔邊，
#   再用 smoothstep 取出羽化帶。不需要 scipy 的距離變換。
FEATHER = 0.09       # 羽化帶寬（佔短邊的比例）

# ── 高度 ──────────────────────────────────────────────────────────────
H_BUILT = 0.20       # 一般屋舍（0..1，對應 index.html 的 planH 世界單位）
H_LAND = 1.00        # 地標

# 大陸的世界換算（與 index.html 同值）
MAP_SCALE = 20
CLOUD_H = 44
PEAK_SCALE = 520

# ⚠ 內陸城不做「拿插畫水域對真實海域」的搜尋（那是港都專用的定位法）：
#   它們沒有海岸線可對，mx/my 直接取聚落座標、planRot 取 0。
#   planW 依等級給：帝都級 1250、教廷級 1100、市鎮 620。
JOBS = [{
    # ver -216：換成接近正射的新平面圖。舊的 Capital_iso.png 是斜俯視 —— 立面
    # 大量可見、尖塔全部往外傾，而引擎的屋頂貼圖直接取自平面圖，等於把牆畫在屋頂上。
    # ⚠ unsquash 由輪廓長寬比推得（bbox 1.354、二階矩 1.315），取 1.35。
    #   沒能量到可靠的圓形水景當量尺（只抓到河），所以這個值是待驗的。
    'src': 'CapitalTD_iso.png',
    'unsquash': 1.35,
    'shadowCheck': 0.45,   # 中央宮殿花園一帶，量投影（只報數字）
    'dst': 'capital_plan.webp',
    'hdst': 'capital_h.webp',
    'mdst': 'capital_mass.webp', 'jdst': 'capital_mass.json',
    'mx': 1005, 'my': 600, 'planW': 1250, 'planRot': 0.0,
    'landmarks': [(0.500, 0.430, 0.060, H_LAND)],     # 中央的宮殿群
}, {
    # ver -214：換成**真正的正射俯視**。前兩版都還是「從有限高度往下看」，
    # 結構會往外傾、看得到立面 —— 而引擎畫的是平頂稜柱、屋頂貼圖直接取自平面圖，
    # 等於把北面聖堂的正面立面（含門洞）平鋪在屋頂上。實測四個方位的裁切：
    # 北面看得到整片牆與門洞、東西向穹頂露出鼓座、南面階梯看得到踏面。
    # 正射版把這些全部消掉，穹頂變成正圓（偵測到 12~13 座，南面 67° 缺口＝大階梯）。
    'src': 'HolyseeTD.png',
    'unsquash': 1.03,      # 正射，只補殘餘；建成區外框長寬比實測 1.027
    'nowater': True,       # 藍色圓頂不是水（實測佔本體 10.0%）
    'shadowCheck': 0.62,   # 量廣場上還有沒有投影（只報數字，不改像素）
    # 24 個量體、5 階高度，取代原本手捏的三階（圓頂 .50／尖塔 1.0／環廊 .28）。
    # ⚠ holysee_classes 與 towers 一併停用 —— 那兩個是沒有高度資料時的代理。
    'polarBlocks': 'holysee_blocks.json',
    'dst': 'holysee_plan.webp',
    'hdst': 'holysee_h.webp',
    'mdst': 'holysee_mass.webp', 'jdst': 'holysee_mass.json',
    'mx': 934, 'my': 606, 'planW': 550, 'planRot': 0.0,   # ver -213 縮至 50%
    'landmarks': [],       # 高度改由 polarBlocks 給，不再需要手填地標
}, {
    'src': 'MTown_iso.png',
    'dst': 'mtown_plan.webp',
    'hdst': 'mtown_h.webp',
    'mdst': 'mtown_mass.webp', 'jdst': 'mtown_mass.json',
    'mx': 1693, 'my': 282, 'planW': 620, 'planRot': 0.0,
    'landmarks': [],
}, {
    # 取代 MTown 成為 11 座市鎮共用的插畫（ver -208）。
    # ⚠ 這張圖本身已帶 alpha（29.1% 透明），去背分支不會觸發。
    # ⚠ unsquash 沿用預設 1.60：實測建成區外框 aspect=1.558、二階矩 sx/sy=1.684，
    #   1.60 正落在兩者之間，不必逐圖覆寫。
    'src': 'Stown_iso.png',
    'dst': 'stown_plan.webp',
    'hdst': 'stown_h.webp',
    'mdst': 'stown_mass.webp', 'jdst': 'stown_mass.json',
    # ⚠ 位置／旋轉是 place_city.py 對著地圖河道搜出來的（三個河口全接通），
    #   不是目測。必須與 index.html 的「聖索菲亞城」一致。
    'mx': 559, 'my': 562, 'planW': 800, 'planRot': 0.79,
    'landmarks': [],
}, {
    'src': 'Velafonte_iso.png',
    'dst': 'velafonte_plan.webp',
    'hdst': 'velafonte_h.webp',
    'mdst': 'velafonte_mass.webp', 'jdst': 'velafonte_mass.json',
    # ⚠ 與 index.html 的 SETTLEMENTS 一致
    'mx': 1366, 'my': 936, 'planW': 1050, 'planRot': 1.40,
    # 地標：(u, v, 半徑佔圖寬, 高度)。圖心是 (0.5,0.5)，可對著輸出的 plan 目測。
    'landmarks': [
        (0.520, 0.360, 0.055, H_LAND),   # 大教堂（中央那座哥德式尖塔）
        (0.300, 0.090, 0.070, H_LAND),   # 山坡上的莊園／城堡群
    ],
}]

# ── 街廓量體（index.html 的量體層用）──────────────────────────────────
# 舊版把高度圖拿去「位移共用的網格頂點」，等於把紋理整片往上剪切，所以高度圖
# 得先糊 5px、planTall 得夾在 26。改成逐街廓拉伸的獨立稜柱之後這些限制都沒了，
# 但需要的資料不一樣：要的是**街廓的多邊形**，不是一張連續的高度場。
#
# ⚠ 怎麼從插畫分出街廓：**局部對比**，不是絕對亮度。這批插畫的街道是淺色、
#   屋頂是深色，但整張圖本身有大範圍明暗（實測 built 區亮度 p10=62 p90=143，
#   沒有雙峰），全域門檻切不出來。用「比鄰域暗」就與大範圍明暗無關。
# ⚠ 門檻取分位數而不是定值：四座城的對比強度差很多（實測 T=5.5~10.7）。
# ⚠ 亮＝街道，但**聖王廳的塔頂受光也是亮的** —— 所以亮度只拿來分街道／街廓，
#   不拿來當高度。高度另外由 hm（地標＋塔）給。
ROOF_Q = 60.0      # 建成區裡有多少比例算「街廓」（其餘是街道）
BLK_MIN = 20       # 小於這個面積的碎塊丟掉（雜訊）
BLK_SPLIT = 900    # 大於這個面積的連通區要再切（不然是一塊台地）
BLK_CELL = 30      # 切大街廓用的格距（插畫像素）
POLY_EPS = 1.5     # 多邊形簡化容差（插畫像素）
POLY_MAX = 12      # 單一街廓的頂點數上限
ATLAS_PAD = 1


def report_ground_shadow(rgb, al, frac=0.62, note=''):
    """**量**地面鋪面上的投影有多重，印出來。不修改任何像素。

    ▍分工
    底圖修正是美術端的工作，不是這支腳本的。這裡只負責把「有多少投影、
    要往哪個方向補多少」量成數字交出去 —— 專案慣例：需要素材就開口，
    別用演算法硬湊（HANDOFF G）。

    ▍為什麼量得出來
    投影不是深色材質，是同一材質乘上一個較暗的光，而且**偏藍**（只被藍天
    照亮）。實測聖王廳廣場：受光 (239,225,207)、陰影 (112,120,144)，
    B/R 從 0.87 升到 1.29。用色度而不是亮度判斷，才不會把中性的深色鋪面
    誤認成陰影 —— 亮度分位數那版就是這樣，把廣場 p95 從 234 推到 255 爆掉。

    ⚠ 只看**中央鋪面圓盤內**（半徑 frac 以內）。藍色穹頂又暗又藍，任何陰影
      偵測都會把它抓進去。
    """
    H2, W2 = al.shape[0], al.shape[1]
    op = al[:, :, 0] > 40
    ys, xs = np.where(op)
    if len(xs) < 100:
        return 0.0
    cx, cy = xs.mean(), ys.mean()
    rr = np.hypot(np.arange(W2)[None, :] - cx, np.arange(H2)[:, None] - cy)
    R0 = np.percentile(np.hypot(xs - cx, ys - cy), 99.0)
    disc = op & (rr < frac * R0) & (rr > 0.10 * R0)
    if disc.sum() < 500:
        return 0.0

    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2)
    # ⚠ 用**色度**判斷陰影，不能用亮度分位數。分位數會強制把固定比例的像素
    #   當成陰影 —— 沒有投影的圖照樣被「校正」，鋪面的深色紋路一起被抹平。
    #   實測第一版就是這樣：廣場 p95 從 234 被推到 255（爆掉）、p50 204→244。
    #   陰影的指紋是**偏藍**（只被藍天照亮），與「暗」是兩回事：
    #   實測受光 B/R=0.87、陰影 B/R=1.29。用它就不會誤傷中性的深色鋪面。
    chroma = rgb[:, :, 2] / np.maximum(rgb[:, :, 0], 1.0)
    cl = float(np.percentile(chroma[disc & (lum > np.percentile(lum[disc], 70))], 50))
    ch = float(np.percentile(chroma[disc], 98))
    if ch - cl < 0.12:
        print('  ⚑ 底圖投影量測%s：色度差只有 %.3f，判定無投影' % (note, ch - cl))
        return 0.0
    t = np.clip((chroma - cl) / (ch - cl), 0, 1)
    t = np.where(disc & (lum < np.percentile(lum[disc], 85)), t, 0)

    lit = rgb[disc & (t < 0.15)].mean(axis=0)
    shd_m = disc & (t > 0.75)
    if shd_m.sum() < 300:
        return 0.0
    shd = rgb[shd_m].mean(axis=0)
    frac_sh = float((t[disc] > 0.5).mean())
    print('  ⚑ 底圖投影量測%s：圓盤 %d px，投影佔 %.1f%%' % (note, disc.sum(), 100 * frac_sh))
    print('     受光 (%.0f,%.0f,%.0f)  投影 (%.0f,%.0f,%.0f)  B/R %.2f→%.2f'
          % (lit[0], lit[1], lit[2], shd[0], shd[1], shd[2],
             lit[2] / max(1.0, lit[0]), shd[2] / max(1.0, shd[0])))
    print('     → 美術端補平的話，投影區約需乘 %.2f / %.2f / %.2f (R/G/B)'
          % tuple(np.clip(lit / np.maximum(shd, 1.0), 1.0, 4.0)))
    return frac_sh


def polar_label(jpath, size):
    """把極座標的量體資料畫成一張**標號圖**（來源插畫解析度）。

    回傳 (標號圖 PIL 'L', [(標號, 高度), ...])。

    ▍為什麼是標號圖而不是直接轉座標
    後面的裁切／反投影／縮放是一連串 PIL 運算，自己再算一次座標變換必然對不齊
    （少算一次 thumbnail 就整圈錯位）。把量體畫成圖、讓它跟色圖走**完全同一條**
    管線，對齊就是免費的。

    ▍為什麼量體是極座標
    這座建築是放射對稱的環。實測讓視覺模型報絕對座標會錯得很離譜（前一版
    24 塊裡 9 塊落在建築外、6 對互相重疊），但報「幾點鐘方向、離中心多遠」
    很準 —— 而且環狀扇形只要角度不重疊就**不可能**相交。
    """
    from preview_blocks import polar_to_poly
    J = json.load(io.open(jpath, encoding='utf-8'))
    lv = {L['id']: L['h'] for L in J['levels']}
    P = J['polar']
    lbl = Image.new('L', size, 0)
    d = ImageDraw.Draw(lbl)
    out = []
    n = 0
    for b in J['blocks']:
        h = lv.get(b['level'], 0.0)
        if h <= 0:                      # ground 不生量體
            continue
        n += 1
        d.polygon(polar_to_poly(b, P), fill=n)
        out.append((n, h))
    print('  極座標量體：%d 個（%d 階高度，來源 %s）'
          % (len(out), len(set(h for _, h in out)), os.path.basename(jpath)))
    return lbl, out


def holysee_classes(rgb, al, built):
    """聖王廳專用的分類：圓頂／尖塔／環廊，各給一個固定高度（0..1）。

    ⚠ 為什麼不沿用一般城的「比鄰域暗＝街廓」：那條只抓得到深藍色的圓頂，
      白色尖塔因為**亮**而被歸成街道，整圈尖塔立不起來。
    ⚠ 也不能用亮度硬切：廣場也是淺色石材。但實測廣場落在中間調
      （lum 中位 ~150），尖塔是最亮的一截 —— 取最亮 20% 就切得乾淨，
      而且切出來全是小塊（114 個，最大不到 2000px），沒有一塊是廣場。
    高度是**捏的**，不是從圖上量的：圓頂 0.50、尖塔 1.00、環廊 0.28
    （乘上 index.html 的 planTall=100 就是世界單位）。
    """
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2)
    dome = built & (B > R + 8) & (B > 60)
    T = float(np.percentile(lum[built], 80.0))
    spire = built & (~dome) & (lum > T)
    spire = cv2.morphologyEx(spire.astype(np.uint8), cv2.MORPH_OPEN,
                             np.ones((3, 3), np.uint8)).astype(bool)
    rest = built & (~dome) & (~spire)
    # 廣場＝rest 裡最大的那一塊連通區。它是地面，不生量體。
    n, lab, st, _ = cv2.connectedComponentsWithStats(rest.astype(np.uint8), 8)
    ring = rest.copy()
    if n > 1:
        big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        ring = rest & (lab != big)
        print('  聖王廳：廣場 %d px（不生量體）' % st[big, cv2.CC_STAT_AREA])
    print('  聖王廳分類：圓頂 %.1f%% / 尖塔 %.1f%% / 環廊 %.1f%%'
          % (100 * dome.mean(), 100 * spire.mean(), 100 * ring.mean()))
    return [(spire, 1.00), (dome, 0.50), (ring, 0.28)]


def _components(mask8):
    """連通標記 → [(ox, oy, sub_bool)]。太大的連通區用格子再切。

    ⚠ 用格子切而不是分水嶺：格子的結果是確定性的、邊界筆直（街廓本來就方），
      而分水嶺會依距離變換的雜訊給出蜿蜒的假邊界。
    """
    out = []
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask8, 8)
    for i in range(1, n):
        area = int(st[i, cv2.CC_STAT_AREA])
        if area < BLK_MIN:
            continue
        x0, y0 = int(st[i, cv2.CC_STAT_LEFT]), int(st[i, cv2.CC_STAT_TOP])
        w0, h0 = int(st[i, cv2.CC_STAT_WIDTH]), int(st[i, cv2.CC_STAT_HEIGHT])
        sub = (lab[y0:y0 + h0, x0:x0 + w0] == i)
        if area <= BLK_SPLIT:
            out.append((x0, y0, sub))
            continue
        for gy in range(0, h0, BLK_CELL):
            for gx in range(0, w0, BLK_CELL):
                cut = np.zeros_like(sub)
                cut[gy:gy + BLK_CELL, gx:gx + BLK_CELL] = sub[gy:gy + BLK_CELL, gx:gx + BLK_CELL]
                if cut.sum() < BLK_MIN:
                    continue
                cn, cl, cs, _ = cv2.connectedComponentsWithStats(cut.astype(np.uint8), 8)
                for k in range(1, cn):
                    if cs[k, cv2.CC_STAT_AREA] < BLK_MIN:
                        continue
                    out.append((x0, y0, cl == k))
    return out


def _finish(parts, rgb, al, hm, fixed, note):
    """把連通區變成「多邊形 ＋ 高度 ＋ atlas 上的一格」。

    fixed 為 None 時高度取 hm 在該塊裡的 p80；否則用 fixed[i] 那個固定值。
    """
    blocks = []
    for n_i, (ox, oy, sub) in enumerate(parts):
        cnts, _ = cv2.findContours(sub.astype(np.uint8), cv2.RETR_EXTERNAL,
                                   cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        c = max(cnts, key=cv2.contourArea)
        eps = POLY_EPS
        for _ in range(6):                       # 頂點太多就加大容差再簡化一次
            ap = cv2.approxPolyDP(c, eps, True)
            if len(ap) <= POLY_MAX:
                break
            eps *= 1.6
        if len(ap) < 3:
            continue
        ys, xs = np.where(sub)
        bx0, by0 = int(xs.min()), int(ys.min())
        bx1, by1 = int(xs.max()) + 1, int(ys.max()) + 1
        if fixed is None:
            hv = float(np.percentile(hm[oy:oy + sub.shape[0], ox:ox + sub.shape[1]][sub], 80))
        else:
            hv = float(fixed[n_i])
        blocks.append({
            'poly': [(int(px) + ox, int(py) + oy) for [[px, py]] in ap],
            'bb': (int(bx0 + ox), int(by0 + oy), int(bx1 - bx0), int(by1 - by0)),
            'h': hv, 'mask': sub, 'mo': (ox, oy),
        })

    # ── Atlas ──────────────────────────────────────────────────────────
    # 每個街廓要有**自己的 alpha**：直接拿 bbox 去貼會把鄰塊與街道一起抬上來，
    # 那就是舊版剪切問題換個樣子。切成獨立 sprite 之後 runtime 一次 drawImage
    # 就好，不必逐塊 clip（clip 要重新光柵化路徑，幾百塊就吃掉畫格時間）。
    order = sorted(range(len(blocks)), key=lambda i: -blocks[i]['bb'][3])
    AW = 1024
    shelf_y, shelf_h, cx = 0, 0, 0
    for i in order:
        bw, bh = blocks[i]['bb'][2] + ATLAS_PAD, blocks[i]['bb'][3] + ATLAS_PAD
        if cx + bw > AW:
            cx = 0
            shelf_y += shelf_h
            shelf_h = 0
        blocks[i]['at'] = (int(cx), int(shelf_y))
        cx += bw
        shelf_h = max(shelf_h, bh)
    AH = shelf_y + shelf_h
    atlas = np.zeros((max(1, AH), AW, 4), np.uint8)
    src = np.dstack([rgb, al]).astype(np.uint8)
    for b in blocks:
        bx, by, bw, bh = b['bb']
        ax, ay = b['at']
        ox, oy = b['mo']
        mk = np.zeros(src.shape[:2], bool)
        mh, mw = b['mask'].shape
        mk[oy:oy + mh, ox:ox + mw] = b['mask']
        tile = src[by:by + bh, bx:bx + bw].copy()
        tile[:, :, 3] = tile[:, :, 3] * mk[by:by + bh, bx:bx + bw]
        atlas[ay:ay + bh, ax:ax + bw] = tile
        del b['mask'], b['mo']
    print('  街廓 %d 塊%s → atlas %dx%d' % (len(blocks), note or '', AW, AH))
    return blocks, Image.fromarray(atlas, 'RGBA')


def extract_blocks(rgb, al, built, hm, name, mode='dark', classes=None, nosplit=False):
    """回傳 (blocks, atlas_image)。blocks 是 dict 列表，座標都在插畫像素空間。

    classes 有給就走「逐類別固定高度」（聖王廳）；否則依 mode 從圖上分街廓。
    mode='dark' 密集市街：街道是**亮**的網、街廓是暗的塊 → 取「比鄰域暗」。

    ⚠ 試過 mode='texture'（局部標準差）想在聖王廳把白色尖塔也抓成街廓 ——
      是退步：整圈環廊連成一個 33000px 的連通區，被格子硬切成方塊，圓頂反而
      消失。真正有效的是 holysee_classes 那種**逐類別**的分法。
    """
    if classes is not None:
        parts, fixed = [], []
        for (m, hv) in classes:
            mm = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN,
                                  np.ones((3, 3), np.uint8))
            if nosplit:
                # ⚠ 極座標量體**整塊不切**。走 _components 的話大於 BLK_SPLIT(900px)
                #   的區塊會被 30px 格子硬切 —— 實測 24 個量體被切成 130 塊，
                #   那正是「城看起來細碎」的來源（整輪最早診斷出來的那件事）。
                #   這批量體是人為定義的完整結構，切了只會把它們變回碎塊。
                ys2, xs2 = np.where(mm > 0)
                if len(xs2) < BLK_MIN:
                    continue
                x0, y0 = int(xs2.min()), int(ys2.min())
                parts.append((x0, y0, mm[y0:ys2.max() + 1, x0:xs2.max() + 1] > 0))
                fixed.append(hv)
                continue
            for pc in _components(mm):
                parts.append(pc)
                fixed.append(hv)
        return _finish(parts, rgb, al, hm, fixed,
                       '（極座標量體，整塊不切）' if nosplit else '（逐類別高度）')

    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2)
    lo = np.asarray(Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(10.0))).astype(np.float32)
    hp = lum - lo
    T = float(np.percentile(hp[built], ROOF_Q))
    roof = cv2.morphologyEx((built & (hp <= T)).astype(np.uint8), cv2.MORPH_OPEN,
                            np.ones((3, 3), np.uint8))
    return _finish(_components(roof), rgb, al, hm, None, '（門檻 %.1f）' % T)


hmap = np.asarray(Image.open(HEIGHTMAP).convert('L')).astype(np.float32)
SEA_LEVEL = CLOUD_H / PEAK_SCALE * 255.0     # 高度圖上的海平面灰階值
print('大陸高度圖 %dx%d，海平面灰階 %.1f' % (hmap.shape[1], hmap.shape[0], SEA_LEVEL))

_only = [a.lower() for a in sys.argv[1:]]
if _only:
    JOBS = [J for J in JOBS if any(a in J['src'].lower() or a in J['dst'].lower() for a in _only)]
    print('只處理：%s' % '、'.join(J['src'] for J in JOBS))

for J in JOBS:
    im = Image.open(os.path.join(CITY, J['src'])).convert('RGBA')
    # ⚠ 有些插畫是**不透明白底**（實測 Capital / MTown 的四角是 253,253,254,255），
    #   直接進羽化流程會找不到邊緣，城就變成一塊硬邊的方形貼圖貼在地上。
    #   白底改用「離白色的距離」轉成 alpha（同 build_dock.py）——單一門檻二值化
    #   會在建物邊緣留一圈白。
    _a0 = np.asarray(im)
    if _a0[:, :, 3].min() > 250:
        # 背景色由四邊外圈的中位數估出來（不假設是純白：實測 Capital 的背景是
        # 帶灰的漸層，用「離純白的距離」去背會留下一角不透明 —— 那一角就會變成
        # 一塊蓋在地形上的淡色方塊）。
        _e = np.concatenate([_a0[:3, :, :3].reshape(-1, 3), _a0[-3:, :, :3].reshape(-1, 3),
                             _a0[:, :3, :3].reshape(-1, 3), _a0[:, -3:, :3].reshape(-1, 3)])
        _bg = np.median(_e, axis=0)
        _d = np.abs(_a0[:, :, :3].astype(np.float32) - _bg[None, None, :]).max(axis=2)
        # 容差由背景本身的離散度決定：Capital 的背景是 233~253 的漸層，
        # 固定容差 8 會讓亮的那一角仍然半透明地留下來（實測 coverage 98.9%）。
        _sp = float(np.percentile(np.abs(_e.astype(np.float32) - _bg[None, :]).max(axis=1), 92))
        _t0 = max(10.0, _sp * 1.6)
        _al = np.clip((_d - _t0) / 40.0, 0, 1) * 255.0
        im = Image.fromarray(np.dstack([_a0[:, :, :3].astype(np.float32), _al]).astype(np.uint8), 'RGBA')
        print('  %s：不透明背景 (%d,%d,%d) → 去背，保留 %.1f%%'
              % (J['src'], _bg[0], _bg[1], _bg[2], 100.0 * (_al > 40).mean()))
    # 極座標量體：在**裁切之前**畫成標號圖，之後跟色圖走同一條管線（見 polar_label）
    _lbl, _lblH = (polar_label(os.path.join(CITY, J['polarBlocks']), im.size)
                   if J.get('polarBlocks') else (None, None))

    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a >= 128)
    _box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    im = im.crop(_box)
    if _lbl is not None:
        _lbl = _lbl.crop(_box)
    w, h = im.size
    # ⚠ UNSQUASH 是「等角視 → 俯視」的反投影。素材本身若已經是頂視圖就不能再套，
    #   套了會把圓形的廣場拉成橢圓。逐 JOB 可覆寫。
    _uq = J.get('unsquash', UNSQUASH)
    im = im.resize((w, int(round(h * _uq))), Image.LANCZOS)
    if max(im.size) > MAXDIM:
        im.thumbnail((MAXDIM, MAXDIM), Image.LANCZOS)
    if _lbl is not None:
        # ⚠ 一律 NEAREST：標號是類別不是顏色，插值會在兩塊之間生出不存在的標號。
        _lbl = _lbl.resize(im.size, Image.NEAREST)

    arr = np.asarray(im).astype(np.float32)
    rgb, al = arr[:, :, :3], arr[:, :, 3:]

    # 底圖投影量測（只印數字，不改像素 —— 修圖是美術端的工作）
    if J.get('shadowCheck'):
        report_ground_shadow(rgb, al, float(J['shadowCheck']))

    # 色調對齊（見上方 SAT/VAL）
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2, keepdims=True)
    rgb = np.clip((lum + (rgb - lum) * SAT) * VAL, 0, 255)

    # ── 逐類別色調對齊（ver -210）────────────────────────────────────
    # ⚠ 上面那組 SAT/VAL 是**全圖一個值**，對著「近景地表均值」調的。但綠地與
    #   屋頂要對齊的目標不同，一個全域係數不可能同時對上兩者 —— 實測聖索菲亞城
    #   的綠地是 RGB(55,66,38)、落點周圍地圖的綠地是 (76,88,57)，暗了 26%，
    #   所以城裡的公園讀起來是另一種植被，城與地形的接縫就浮出來。
    # 作法：只對綠地（與水）套一組**乘法增益**，把它們的均色推到地圖在**這座城
    #   落點附近**的同類均色。乘法而不是換色 —— 插畫自己的明暗變化要留著。
    # ⚠ 增益夾在 [0.6,1.8]：插畫若本來就接近就幾乎不動，差太多也不會過曝。
    # ⚠ 遮罩要羽化，否則公園邊緣會出現一圈硬色階。
    _ring = None
    if J.get('toneMatch', True):
        _tr = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_terrain.png'))
                         .convert('RGB')).astype(np.float32)
        _yy, _xx = np.mgrid[0:_tr.shape[0], 0:_tr.shape[1]]
        _rad = J['planW'] * 0.5 / MAP_SCALE
        _d = np.sqrt((_xx - J['mx']) ** 2 + (_yy - J['my']) ** 2)
        _ring = _tr[(_d > _rad * 0.9) & (_d < _rad * 2.0)]     # 城外一圈

    def _match(mask, pick, name):
        """把 mask 內的像素乘一組增益，均色對上地圖同類的均色。"""
        if _ring is None or mask.sum() < 40:
            return
        mr, mg, mb = _ring[:, 0], _ring[:, 1], _ring[:, 2]
        sel = pick(mr, mg, mb)
        if sel.sum() < 40:
            print('  逐類別對齊：地圖城外找不到足夠的%s，跳過' % name)
            return
        tgt = _ring[sel].mean(axis=0)
        # ⚠ 地圖 PNG 的顏色是**畫面上的顏色之前**的東西：地形每像素還會再過一道
        #   GRADE_SAT 去飽和（index.html 的內迴圈）。直接拿原始色當目標，等於替
        #   綠地把去飽和還原掉，倍率正好 1/0.68 ≈ 1.47 —— 實測畫面上城的綠比
        #   周圍森林飽和 2~3 倍就是這麼來的（沿同一列橫掃剖面量到的）。
        #   所以目標色要先過同一道去飽和。
        _tl = float((tgt * np.array([0.299, 0.587, 0.114])).sum())
        tgt = _tl + (tgt - _tl) * GRADE_SAT
        cur = rgb[mask].mean(axis=0)
        gain = np.clip(tgt / np.maximum(cur, 1.0), 0.6, 1.8)
        soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8), 'L')
                          .filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255.0
        rgb[:] = np.clip(rgb * (1 + (gain - 1) * soft[:, :, None]), 0, 255)
        print('  逐類別對齊 %s：(%.0f,%.0f,%.0f) → (%.0f,%.0f,%.0f)  增益 %.2f/%.2f/%.2f'
              % (name, cur[0], cur[1], cur[2], tgt[0], tgt[1], tgt[2], *gain))

    _R, _G, _B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    _op = al[:, :, 0] > 40
    _mveg = (_G > _R + 6) & (_G > _B + 6) & _op
    _mwat = (_B > _R + 8) & (_B > 50) & _op & (not J.get('nowater', False))
    _match(_mveg, lambda r, g, b: (g > r + 6) & (g > b + 6), '綠地')
    _match(_mwat, lambda r, g, b: (b > r + 16) & (b > g + 4) & (b > 70) & (b < 200), '水域')

    H2, W2 = al.shape[0], al.shape[1]
    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)

    # 外緣羽化（見 FEATHER）：沿插畫自己的輪廓往內
    r_f = max(2.0, min(W2, H2) * FEATHER * 0.5)
    mask = Image.fromarray((al[:, :, 0] > 40).astype(np.uint8) * 255, 'L')
    soft = np.asarray(mask.filter(ImageFilter.GaussianBlur(r_f))).astype(np.float32) / 255.0
    t = np.clip((soft - 0.30) / 0.45, 0, 1)
    al = al * (t * t * (3 - 2 * t))[:, :, None]

    # 依海岸線裁切：每個像素換算到大陸座標，取樣高度圖
    hw = J['planW'] * 0.5
    hh = hw * H2 / W2
    ca, sa = np.cos(J['planRot']), np.sin(J['planRot'])
    u = (xx / (W2 - 1)) * 2 - 1
    v = (yy / (H2 - 1)) * 2 - 1
    lx, ly = u * hw, v * hh
    wx = J['mx'] + (lx * ca - ly * sa) / MAP_SCALE
    wy = J['my'] + (lx * sa + ly * ca) / MAP_SCALE
    xi = np.clip(np.round(wx).astype(np.int32), 0, hmap.shape[1] - 1)
    yi = np.clip(np.round(wy).astype(np.int32), 0, hmap.shape[0] - 1)
    land = hmap[yi, xi] > SEA_LEVEL
    # ⚠ 這裡**不再**用海岸線去裁 alpha。裁了會把城咬掉一角——插畫的城是完整的，
    #   被真實陸塊切開就沒有城市全貌可言。改成反過來：讓**地形去遷就插畫**
    #   （index.html 的整平 pass 依這張圖的水域遮罩挖海／填地），
    #   海岸線因此自動與插畫一致，一格都不用裁。
    print('  與大陸現況吻合：%.1f%%（不裁，改由地形遷就插畫）' % (land.mean() * 100))

    out = Image.fromarray(np.concatenate([rgb, al], axis=2).astype(np.uint8), 'RGBA')
    out.save(os.path.join(CITY, J['dst']), quality=QUALITY, method=6)

    # ── 高度圖 ────────────────────────────────────────────────────────
    # 依顏色粗分三類：水（藍）／植被（綠）／其餘＝建成區。
    # ⚠ 用色相分類而不是亮度：這張圖的街道是淺色、屋頂是深色，照亮度分會把
    #   街道當成低地、屋頂當成高地，結果是整片鋸齒。
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # ⚠ nowater：聖王廳頂視圖的圓頂是深藍色，會整片被判成水（實測 24.1%）。
    #   那不只是高度歸零 —— index.html 還會依這張水域遮罩去挖海，
    #   等於把聖座挖成一片海。純建築群的素材要明講「這裡沒有水」。
    water = np.zeros(R.shape, bool) if J.get('nowater') else ((B > R + 10) & (B > 60))
    veg = (G > R + 6) & (G > B + 6)
    built = (~water) & (~veg) & (al[:, :, 0] > 40)
    hm = np.where(built, H_BUILT, 0.0).astype(np.float32)

    # ── 依底圖把個別建物立體化（塔林立的城要用）──────────────────────
    # 作法：取亮度的**局部對比**（原圖減去大半徑模糊）。等角視插畫裡，越高的
    # 東西頂面越亮、旁邊的陰影越深，所以局部對比就是「這棟比鄰居高多少」的代理。
    # ⚠ 不能直接拿亮度當高度：街道是淺色、屋頂是深色（build_city 開頭那條警告），
    #   照亮度分會把街道抬成高地。局部**對比**沒有這個問題——它比的是鄰域，
    #   街道整片一樣亮，對比為零。
    # ⚠ 模糊半徑要比一棟建物大、比整個街區小，不然要嘛沒反應要嘛整片一起抬。
    _tw = J.get('towers', 0.0)
    if _tw > 0:
        _lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2)
        _lo = np.asarray(Image.fromarray(np.clip(_lum, 0, 255).astype(np.uint8), 'L')
                         .filter(ImageFilter.GaussianBlur(9.0))).astype(np.float32)
        _hp = np.clip((_lum - _lo) / 26.0, 0, 1)          # 0＝與鄰居齊平，1＝明顯突出
        hm = np.maximum(hm, np.where(built, H_BUILT + _hp * (_tw - H_BUILT), 0.0))
        print('  依底圖立體化：突出面積 %.1f%%（塔頂上限 %.2f）'
              % (100.0 * ((_hp > 0.35) & built).mean(), _tw))
    for (lu, lv, rad, hv) in J['landmarks']:
        dd = np.sqrt((xx - lu * W2) ** 2 + (yy - lv * H2) ** 2) / (rad * W2)
        hm = np.maximum(hm, np.clip(1.0 - dd, 0, 1) ** 0.6 * hv)
    # 海上不長東西。⚠ 用**插畫自己的**水域而不是大陸現況：
    #   地形會被改成跟插畫一致，所以該以插畫為準。
    hm = hm * (~water)
    hb = Image.fromarray((np.clip(hm, 0, 1) * 255).astype(np.uint8), 'L')
    # ⚙ 糊得夠多很重要：高度是用來位移網格頂點的，相鄰頂點高度差太大，
    #   那一格的仿射矩陣就會被剪成長條（實測：近距離整座城拖曳）。
    hb = hb.filter(ImageFilter.GaussianBlur(5.0))
    hb.save(os.path.join(CITY, J['hdst']), quality=QUALITY, method=6)

    # ── 街廓量體 ──────────────────────────────────────────────────────
    # ⚠ 用**未糊**的 hm 取高度：上面那個 5.0 的模糊是舊版位移網格頂點時的必要
    #   妥協（相鄰頂點高差太大會把格子剪成長條）。稜柱各自獨立，不需要糊。
    if _lbl is not None:
        _L = np.asarray(_lbl)
        _cls = [(_L == k, hv) for (k, hv) in _lblH if (_L == k).sum() >= BLK_MIN]
    else:
        _cls = holysee_classes(rgb, al, built) if J.get('classes') == 'holysee' else None
    blocks, atlas = extract_blocks(rgb, al, built, hm, J['dst'],
                                   J.get('blockmode', 'dark'), _cls,
                                   nosplit=_lbl is not None)
    atlas.save(os.path.join(CITY, J['mdst']), quality=QUALITY, method=6)
    json.dump({
        'w': W2, 'h': H2,
        'atlas': J['mdst'],
        'aw': atlas.width, 'ah': atlas.height,
        # poly：插畫像素座標；at：在 atlas 上的位置；bb：在插畫上的外框；h：0..1
        'b': [{'p': [c for xy in b['poly'] for c in xy],
               'bb': list(b['bb']), 'at': list(b['at']),
               'h': round(b['h'], 4)} for b in blocks],
    }, io.open(os.path.join(CITY, J['jdst']), 'w', encoding='utf-8'), separators=(',', ':'))

    print('%s  %dx%d  →  %s / %s  %dx%d'
          % (J['src'], w, h, J['dst'], J['hdst'], out.width, out.height))

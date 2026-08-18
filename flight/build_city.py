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
import numpy as np
import cv2
from PIL import Image, ImageFilter

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
    'src': 'Capital_iso.png',
    'dst': 'capital_plan.webp',
    'hdst': 'capital_h.webp',
    'mdst': 'capital_mass.webp', 'jdst': 'capital_mass.json',
    'mx': 1005, 'my': 600, 'planW': 1250, 'planRot': 0.0,
    'landmarks': [(0.500, 0.430, 0.060, H_LAND)],     # 中央的宮殿群
}, {
    'src': 'holysee_topdown.png',
    'unsquash': 1.10,      # 已是頂視圖：只補殘餘的縱向壓縮（外框長寬比實測 1.102）
    'nowater': True,       # 藍色圓頂不是水
    # ⚠ 試過 'texture'（局部標準差）想把白色尖塔也抓成街廓 —— 是退步：整圈環廊
    #   連成一個 33000px 的連通區，被 30px 格硬切成方塊，圓頂反而消失。
    #   'dark' 至少讓深藍圓頂各自立起來。真正的尖塔要等 Ray 的灰階高度圖。
    'dst': 'holysee_plan.webp',
    'hdst': 'holysee_h.webp',
    'mdst': 'holysee_mass.webp', 'jdst': 'holysee_mass.json',
    'mx': 934, 'my': 606, 'planW': 1100, 'planRot': 0.0,
    'landmarks': [(0.500, 0.440, 0.070, H_LAND)],     # 大聖堂
    'towers': 1.00,                                   # 塔林立：依底圖逐棟抬高
}, {
    'src': 'MTown_iso.png',
    'dst': 'mtown_plan.webp',
    'hdst': 'mtown_h.webp',
    'mdst': 'mtown_mass.webp', 'jdst': 'mtown_mass.json',
    'mx': 1693, 'my': 282, 'planW': 620, 'planRot': 0.0,
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


def extract_blocks(rgb, al, built, hm, name, mode='dark'):
    """回傳 (blocks, atlas_image)。blocks 是 dict 列表，座標都在插畫像素空間。

    mode='dark'    密集市街：街道是**亮**的網、街廓是暗的塊 → 取「比鄰域暗」。
    mode='texture' 聖王廳這種「大片平坦廣場 ＋ 四周建築」：廣場與白色尖塔都亮，
                   亮度分不開。改用**局部紋理能量**（局部標準差）—— 廣場是平滑的
                   鋪面（低），建築有柱列、窗、圓頂（高）。
                   ⚠ 非用不可：'dark' 在聖王廳只會抓到深藍色的圓頂，白色尖塔
                     因為亮而被歸成「街道」，結果整圈尖塔立不起來。
    """
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2)
    if mode == 'texture':
        L8 = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
        mu = np.asarray(L8.filter(ImageFilter.GaussianBlur(4.0))).astype(np.float32)
        m2 = np.asarray(Image.fromarray(np.clip(lum * lum / 255, 0, 255).astype(np.uint8))
                        .filter(ImageFilter.GaussianBlur(4.0))).astype(np.float32) * 255
        sd = np.sqrt(np.maximum(0.0, m2 - mu * mu))
        T = float(np.percentile(sd[built], 100.0 - ROOF_Q))
        roof = (built & (sd > T)).astype(np.uint8)
    else:
        lo = np.asarray(Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
                        .filter(ImageFilter.GaussianBlur(10.0))).astype(np.float32)
        hp = lum - lo
        T = float(np.percentile(hp[built], ROOF_Q))
        roof = (built & (hp <= T)).astype(np.uint8)
    # 開運算去掉單像素雜訊；不做閉運算 —— 那會把窄街封起來，街廓就黏成一片
    roof = cv2.morphologyEx(roof, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(roof, 8)

    # 大連通區再切：整座城若只有幾塊巨型街廓，拉伸出來是台地不是天際線。
    # ⚠ 用格子切而不是分水嶺：格子的結果是確定性的、邊界筆直（街廓本來就方），
    #   而分水嶺會依距離變換的雜訊給出蜿蜒的假邊界。
    parts = []
    for i in range(1, n):
        area = st[i, cv2.CC_STAT_AREA]
        if area < BLK_MIN:
            continue
        x0, y0 = int(st[i, cv2.CC_STAT_LEFT]), int(st[i, cv2.CC_STAT_TOP])
        w0, h0 = int(st[i, cv2.CC_STAT_WIDTH]), int(st[i, cv2.CC_STAT_HEIGHT])
        sub = (lab[y0:y0 + h0, x0:x0 + w0] == i)
        if area <= BLK_SPLIT:
            parts.append((x0, y0, sub))
            continue
        for gy in range(0, h0, BLK_CELL):
            for gx in range(0, w0, BLK_CELL):
                cut = np.zeros_like(sub)
                cut[gy:gy + BLK_CELL, gx:gx + BLK_CELL] = sub[gy:gy + BLK_CELL, gx:gx + BLK_CELL]
                if cut.sum() < BLK_MIN:
                    continue
                # 切完可能碎成幾塊，各自成為一個街廓
                cn, cl, cs, _ = cv2.connectedComponentsWithStats(cut.astype(np.uint8), 8)
                for k in range(1, cn):
                    if cs[k, cv2.CC_STAT_AREA] < BLK_MIN:
                        continue
                    parts.append((x0, y0, cl == k))

    blocks = []
    for (ox, oy, sub) in parts:
        m = sub.astype(np.uint8)
        cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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
        # 高度：取 hm 在這塊裡的 p80。hm 帶著地標與塔的抬升，所以大教堂那幾塊
        # 自然會比一般街廓高；一般街廓則落在 H_BUILT。
        hv = float(np.percentile(hm[oy:oy + sub.shape[0], ox:ox + sub.shape[1]][sub], 80))
        blocks.append({
            'poly': [(int(px) + ox, int(py) + oy) for [[px, py]] in ap],
            'bb': (int(bx0 + ox), int(by0 + oy), int(bx1 - bx0), int(by1 - by0)),
            'h': hv,
            'mask': sub,
            'mo': (ox, oy),
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
    print('  街廓 %d 塊（門檻 %.1f）→ atlas %dx%d' % (len(blocks), T, AW, AH))
    return blocks, Image.fromarray(atlas, 'RGBA')


hmap = np.asarray(Image.open(HEIGHTMAP).convert('L')).astype(np.float32)
SEA_LEVEL = CLOUD_H / PEAK_SCALE * 255.0     # 高度圖上的海平面灰階值
print('大陸高度圖 %dx%d，海平面灰階 %.1f' % (hmap.shape[1], hmap.shape[0], SEA_LEVEL))

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
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a >= 128)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size
    # ⚠ UNSQUASH 是「等角視 → 俯視」的反投影。素材本身若已經是頂視圖就不能再套，
    #   套了會把圓形的廣場拉成橢圓。逐 JOB 可覆寫。
    _uq = J.get('unsquash', UNSQUASH)
    im = im.resize((w, int(round(h * _uq))), Image.LANCZOS)
    if max(im.size) > MAXDIM:
        im.thumbnail((MAXDIM, MAXDIM), Image.LANCZOS)

    arr = np.asarray(im).astype(np.float32)
    rgb, al = arr[:, :, :3], arr[:, :, 3:]

    # 色調對齊（見上方 SAT/VAL）
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2, keepdims=True)
    rgb = np.clip((lum + (rgb - lum) * SAT) * VAL, 0, 255)

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
    blocks, atlas = extract_blocks(rgb, al, built, hm, J['dst'], J.get('blockmode', 'dark'))
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

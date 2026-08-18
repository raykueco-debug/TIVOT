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
import os
import numpy as np
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

JOBS = [{
    'src': 'Velafonte_iso.png',
    'dst': 'velafonte_plan.webp',
    'hdst': 'velafonte_h.webp',
    # ⚠ 與 index.html 的 SETTLEMENTS 一致
    'mx': 1366, 'my': 936, 'planW': 1050, 'planRot': 1.40,
    # 地標：(u, v, 半徑佔圖寬, 高度)。圖心是 (0.5,0.5)，可對著輸出的 plan 目測。
    'landmarks': [
        (0.520, 0.360, 0.055, H_LAND),   # 大教堂（中央那座哥德式尖塔）
        (0.300, 0.090, 0.070, H_LAND),   # 山坡上的莊園／城堡群
    ],
}]

hmap = np.asarray(Image.open(HEIGHTMAP).convert('L')).astype(np.float32)
SEA_LEVEL = CLOUD_H / PEAK_SCALE * 255.0     # 高度圖上的海平面灰階值
print('大陸高度圖 %dx%d，海平面灰階 %.1f' % (hmap.shape[1], hmap.shape[0], SEA_LEVEL))

for J in JOBS:
    im = Image.open(os.path.join(CITY, J['src'])).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a >= 128)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size
    im = im.resize((w, int(round(h * UNSQUASH))), Image.LANCZOS)
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
    water = (B > R + 10) & (B > 60)
    veg = (G > R + 6) & (G > B + 6)
    built = (~water) & (~veg) & (al[:, :, 0] > 40)
    hm = np.where(built, H_BUILT, 0.0).astype(np.float32)
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

    print('%s  %dx%d  →  %s / %s  %dx%d'
          % (J['src'], w, h, J['dst'], J['hdst'], out.width, out.height))

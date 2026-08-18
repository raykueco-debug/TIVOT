# -*- coding: utf-8 -*-
"""把等角視的城市插畫反投影成「正俯視平面圖」，供 3D 飛行畫面貼地使用。

等角視是把地面平面在縱向壓縮了 k 倍（仰角 θ 時 k=sinθ），縱向拉伸 1/k 就
還原成俯視。UNSQUASH 是量出來的：城的輪廓在 ×1.60 時最接近正圓
（×1.40 仍偏扁、×1.85 已經偏長）。

⚠ 建築立面會往上抹開 —— 等角視看得到牆面，俯視看不到，這是必然代價。
  遊戲裡這座城最大約 400px 寬，抹開幾像素看不出來；換來的是城真正躺在地上。

用法：  py flight/build_city.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.join(HERE, 'city')

UNSQUASH = 1.60      # 縱向拉伸倍率（見上方）
MAXDIM = 768         # 輸出長邊。螢幕上最大約 400px，768 已有餘裕
QUALITY = 88
# ── 色調對齊 ──────────────────────────────────────────────────────────
# 插畫比遊戲裡的地形亮得多、也飽和得多，直接貼上去像一張貼紙。
# 這兩個數字是對著地形實測值調的：近景地表 RGB≈(64,71,54)、S≈0.24、V≈0.28，
# 而地形本身還會再吃 GRADE_SAT=0.68 的去飽和。
# ⚠ 烘進素材而不是在 runtime 做：ctx.filter 在部分 Safari 版本沒有，
#   而且每幀做去飽和是白費的——這是固定的色調對齊，不隨光線變。
SAT = 0.70           # 飽和度倍率
VAL = 0.86           # 明度倍率

JOBS = [('Velafonte_iso.png', 'velafonte_plan.webp')]

for src, dst in JOBS:
    im = Image.open(os.path.join(CITY, src)).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a >= 128)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size
    im = im.resize((w, int(round(h * UNSQUASH))), Image.LANCZOS)
    if max(im.size) > MAXDIM:
        im.thumbnail((MAXDIM, MAXDIM), Image.LANCZOS)
    # 色調對齊（見上方 SAT/VAL）
    arr = np.asarray(im).astype(np.float32)
    rgb, al = arr[:, :, :3], arr[:, :, 3:]
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=2, keepdims=True)
    rgb = np.clip((lum + (rgb - lum) * SAT) * VAL, 0, 255)
    im = Image.fromarray(np.concatenate([rgb, al], axis=2).astype(np.uint8), 'RGBA')
    im.save(os.path.join(CITY, dst), quality=QUALITY, method=6)
    print('%s  %dx%d  →  %s  %dx%d' % (src, w, h, dst, im.width, im.height))

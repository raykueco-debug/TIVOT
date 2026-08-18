# -*- coding: utf-8 -*-
"""把 resources/Flight_Enemy/ 的六視圖合成稿拆成單獨的視角圖。

原稿是 RGBA、透明底，六個角度排在同一張 1536×1024 上。
拆法：對 alpha 取連通區塊 → 每塊就是一個視角。

⚠ 主體外圍有一圈半透明輝光（蜈蚣有 44% 的像素落在 alpha 1~254），
  直接用 alpha>0 找連通區塊會把六個視角的輝光連成一整片。
  所以先用較高的門檻（ALPHA_CORE）找「實體」，再把該區塊的外框
  往外放 PAD 像素去取回完整的輝光。

輸出到 flight/enemy/<名稱>/view_<序號>.webp，並印出各視角的外框與尺寸，
供人工指認哪一張是俯視／側視／正面。

用法：  py flight/split_enemy.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'resources', 'Flight_Enemy')
OUT = os.path.join(HERE, 'enemy')

ALPHA_CORE = 40      # 「實體」的 alpha 門檻（避開輝光）
                     # 實測：40 就把兩張稿都切成五五六六塊且框不相疊；
                     # 96 反而把半透明的翅切掉、一隻裂成好幾塊。
MIN_PX = 3000        # 小於這個面積的區塊視為雜點
PAD = 26             # 外框往外放，取回輝光
MAXDIM = 512         # 輸出長邊上限：螢幕上最大約 200px，再降 0.6 倍緩衝，512 綽綽有餘
QUALITY = 88         # webp 品質。⚙ 這是飛行開場就要載的東西，原尺寸 PNG 共 4.3MB，
                     #   會把開場拖長（同舵輪那組的考量：1.4MB → 70/48KB）。

def split(name):
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    core = a >= ALPHA_CORE
    # ⚠ 不做閉運算：俯視與仰視兩張只隔 3px，5×5 的閉運算會把它們黏成一塊。
    #   alpha>=40 的原始連通區塊本來就是乾淨的六塊。
    lab, n = ndimage.label(core)
    sizes = ndimage.sum(core, lab, range(1, n + 1))

    boxes = []
    for i in np.argsort(sizes)[::-1]:
        if sizes[i] < MIN_PX:
            break
        sl = ndimage.find_objects(lab == i + 1)[0]
        boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, i + 1])

    boxes.sort(key=lambda b: (b[1] // 200, b[0]))     # 由上而下、由左而右
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    print('%s  →  %d 個視角' % (name, len(boxes)))
    src = np.asarray(im).copy()
    for k, (x0, y0, x1, y1, lb) in enumerate(boxes):
        x0 = max(0, x0 - PAD); y0 = max(0, y0 - PAD)
        x1 = min(im.width, x1 + PAD); y1 = min(im.height, y1 + PAD)
        cut = src[y0:y1, x0:x1].copy()
        # 只保留屬於這個視角的像素：外框放大後可能框進隔壁視角的一角。
        # 把該區塊的遮罩往外膨脹 PAD 取回輝光，範圍外的 alpha 歸零。
        own = ndimage.binary_dilation(lab[y0:y1, x0:x1] == lb, np.ones((PAD * 2 + 1, PAD * 2 + 1)))
        cut[:, :, 3] = np.where(own, cut[:, :, 3], 0)
        out = Image.fromarray(cut, 'RGBA')
        if max(out.size) > MAXDIM:
            out.thumbnail((MAXDIM, MAXDIM), Image.LANCZOS)
        out.save(os.path.join(d, 'view_%d.webp' % k), quality=QUALITY, method=6)
        print('   view_%d  %4dx%-4d  @ (%d,%d)' % (k, x1 - x0, y1 - y0, x0, y0))

for n in ['FLM_CENTIPI', 'FLM_Serpent']:
    split(n)

# -*- coding: utf-8 -*-
"""出一張「地圖設計用」的銀月大陸總圖：地形＋座標網格＋聚落與地標。

▍為什麼要專門出一張
遊戲裡的地圖是浮雕投影（buildRelief），好看但不是等距的，量不了距離也標不了
座標。設計階段要的是**正射、有格線、標了名字**的工作底圖 —— 討論位置時可以
直接說「(1366,936) 那條河」，而不是「右下角那邊」。

▍座標系
就是地圖像素座標，與 index.html 的 SETTLEMENTS / PLACES / place_city.py 同一套。
1 像素 = MAP_SCALE(20) 世界單位。管理人模式在 3D 畫面右鍵取到的也是這個座標。

用法：  py flight/map_sheet.py [--scale 1.0] [--no-grid]
輸出：  flight/silvermoon_sheet.png
"""
import argparse
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
MAP_SCALE = 20
CLOUD_H = 44
PEAK_SCALE = 520
GRID = 100          # 細格（地圖像素）
GRID_MAJOR = 500    # 粗格＋標數字


def parse_list(name, src):
    """從 index.html 撈 SETTLEMENTS / PLACES 的 (名稱, x, y)。

    ⚠ 不 import 也不解析 JS：那份檔案是單檔遊戲，結構會變。這裡只用正規式抓
      「n:'…' x:… y:…」這個穩定的形狀，抓不到就算了（總圖少一個標記，不影響）。
    """
    m = re.search(r'const %s\s*=\s*\[(.*?)\n\];' % name, src, re.S)
    if not m:
        return []
    out = []
    for line in m.group(1).split('\n'):
        mm = re.search(r"(?:n|name)\s*:\s*'([^']+)'", line)
        mx = re.search(r'\bx\s*:\s*(-?\d+)', line)
        my = re.search(r'\by\s*:\s*(-?\d+)', line)
        if mm and mx and my:
            out.append((mm.group(1), int(mx.group(1)), int(my.group(1))))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--no-grid', action='store_true')
    ap.add_argument('--out', default='silvermoon_sheet.png')
    a = ap.parse_args()

    terr = Image.open(os.path.join(HERE, 'silvermoon_terrain.png')).convert('RGB')
    hgt = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_heightmap.png'))
                     .convert('L')).astype(np.float32)
    W, H = terr.size
    sea = CLOUD_H / PEAK_SCALE * 255.0
    land = hgt > sea

    base = np.asarray(terr).astype(np.float32)
    # 海（雲海）壓暗一階，大陸輪廓才跳得出來
    base[~land] *= 0.55
    im = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))

    d = ImageDraw.Draw(im, 'RGBA')
    fs = max(13, W // 130)
    try:
        fnt = ImageFont.truetype('msjh.ttc', fs)
        fnt_s = ImageFont.truetype('msjh.ttc', int(fs * 0.78))
    except Exception:
        fnt = fnt_s = ImageFont.load_default()

    if not a.no_grid:
        for x in range(0, W, GRID):
            maj = x % GRID_MAJOR == 0
            d.line([(x, 0), (x, H)], fill=(255, 255, 255, 95 if maj else 38),
                   width=2 if maj else 1)
        for y in range(0, H, GRID):
            maj = y % GRID_MAJOR == 0
            d.line([(0, y), (W, y)], fill=(255, 255, 255, 95 if maj else 38),
                   width=2 if maj else 1)
        for x in range(0, W, GRID_MAJOR):
            for yy, anc in ((4, 'ma'), (H - 4, 'md')):
                d.text((x, yy), str(x), font=fnt_s, fill=(255, 235, 120, 255),
                       anchor=anc, stroke_width=3, stroke_fill=(0, 0, 0, 255))
        for y in range(0, H, GRID_MAJOR):
            for xx, anc in ((4, 'lm'), (W - 4, 'rm')):
                d.text((xx, y), str(y), font=fnt_s, fill=(255, 235, 120, 255),
                       anchor=anc, stroke_width=3, stroke_fill=(0, 0, 0, 255))

    src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    setts = parse_list('SETTLEMENTS', src)
    places = parse_list('PLACES', src)
    # PLACES 有些與 SETTLEMENTS 同名同位置（城的名牌），不要標兩次
    seen = {(n, x, y) for n, x, y in setts}
    places = [p for p in places if p not in seen]

    def mark(x, y, name, col, r):
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (210,),
                  outline=(0, 0, 0, 255), width=2)
        d.text((x, y - r - 3), name, font=fnt, fill=(255, 255, 255, 255),
               anchor='md', stroke_width=3, stroke_fill=(0, 0, 0, 255))
        d.text((x, y + r + 3), '(%d,%d)' % (x, y), font=fnt_s,
               fill=(210, 230, 255, 235), anchor='ma',
               stroke_width=3, stroke_fill=(0, 0, 0, 255))

    for n, x, y in setts:
        mark(x, y, n, (255, 90, 60), 9)
    for n, x, y in places:
        mark(x, y, n, (110, 190, 255), 6)

    d.text((10, H - 10), '銀月大陸 · 設計用底圖   1 格 = %d 地圖像素 = %d 世界單位   '
                         '全圖 %dx%d px = %dx%d 世界單位   陸地 %.0f%%'
           % (GRID, GRID * MAP_SCALE, W, H, W * MAP_SCALE, H * MAP_SCALE,
              100 * land.mean()),
           font=fnt_s, fill=(255, 255, 255, 230), anchor='ld',
           stroke_width=3, stroke_fill=(0, 0, 0, 255))

    if a.scale != 1.0:
        im = im.resize((int(W * a.scale), int(H * a.scale)), Image.LANCZOS)
    dst = os.path.join(HERE, a.out)
    im.save(dst)
    print('%s  %dx%d   聚落 %d  地標 %d'
          % (os.path.basename(dst), im.width, im.height, len(setts), len(places)))
    for n, x, y in setts + places:
        print('   %-12s (%4d,%4d)  高度 %3d 灰階 = %4.0f 世界單位  %s'
              % (n, x, y, hgt[y, x], hgt[y, x] / 255 * PEAK_SCALE,
                 '陸' if land[y, x] else '雲海'))


if __name__ == '__main__':
    main()

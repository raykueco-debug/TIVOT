# -*- coding: utf-8 -*-
"""在插畫上燒一層有標號的座標網格，給視覺模型判讀街廓用。

▍為什麼要這一步
把插畫直接丟給模型判讀街廓，語意judgment（哪裡是教堂、哪裡是民居）相當可靠，
但**絕對座標是弱項**。實測聖索菲亞城那份：54 塊裡 11 塊落在水面或綠地上，
三個地標全部放錯位置，而且模型自報的 confidence 與實際準確度**完全不相關**
（兩塊自報 high 的是錯得最離譜的）。

模型讀不準「這棟在 x=452」，但很會讀「這棟在 G7 格、靠近 450 那條線」。
所以把格線與數字燒進圖裡，讓它照著抄。

▍座標空間
x 正規化到 0~1000，y 依原圖長寬比等比延伸（不是也拉到 1000 —— 那會讓模型
以為圖是正方形，回報的 y 全部被壓扁）。輸出的 JSON 就用這組數字。

用法：  py flight/grid_overlay.py city/TheHolySee_iso.png
輸出：  同目錄的 *_grid.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

STEP = 50           # 細格線間距（座標單位）
MAJOR = 100         # 粗格線＋標數字
COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def main(rel, out=None):
    path = rel if os.path.isabs(rel) else os.path.join(HERE, rel)
    im = Image.open(path).convert('RGB')
    W, H = im.size
    CW = 1000                       # x 的座標空間
    CH = int(round(1000.0 * H / W))  # y 等比
    k = W / float(CW)               # 座標 → 像素

    d = ImageDraw.Draw(im, 'RGBA')
    fs = max(14, W // 70)
    try:
        fnt = ImageFont.truetype('arialbd.ttf', fs)
        fnt2 = ImageFont.truetype('arialbd.ttf', int(fs * 1.5))
    except Exception:
        fnt = fnt2 = ImageFont.load_default()

    def line(p0, p1, col, w):
        d.line([p0, p1], fill=col, width=w)

    for cx in range(0, CW + 1, STEP):
        x = cx * k
        maj = cx % MAJOR == 0
        line((x, 0), (x, H), (255, 255, 255, 90 if maj else 45), 2 if maj else 1)
    for cy in range(0, CH + 1, STEP):
        y = cy * k
        maj = cy % MAJOR == 0
        line((0, y), (W, y), (255, 255, 255, 90 if maj else 45), 2 if maj else 1)

    # 格子代號（A1 式）標在每個大格中央，淡淡的；數字標在四邊
    for gi, cx in enumerate(range(0, CW, MAJOR)):
        for gj, cy in enumerate(range(0, CH, MAJOR)):
            if gi >= len(COLS):
                continue
            d.text(((cx + MAJOR / 2) * k, (cy + MAJOR / 2) * k),
                   '%s%d' % (COLS[gi], gj + 1), font=fnt2,
                   fill=(255, 255, 255, 70), anchor='mm')

    for cx in range(0, CW + 1, MAJOR):
        for yy, anc in ((6, 'ma'), (H - 6, 'md')):
            d.text((cx * k, yy), str(cx), font=fnt, fill=(255, 240, 120, 255),
                   anchor=anc, stroke_width=3, stroke_fill=(0, 0, 0, 255))
    for cy in range(0, CH + 1, MAJOR):
        for xx, anc in ((6, 'lm'), (W - 6, 'rm')):
            d.text((xx, cy * k), str(cy), font=fnt, fill=(255, 240, 120, 255),
                   anchor=anc, stroke_width=3, stroke_fill=(0, 0, 0, 255))

    dst = out or path.rsplit('.', 1)[0] + '_grid.png'
    im.save(dst)
    print('%s  %dx%d  →  %s   座標空間 %d x %d（x 正規化到 1000，y 等比）'
          % (os.path.basename(path), W, H, os.path.basename(dst), CW, CH))
    return dst


def polar(rel, cx, cy, R, out=None):
    """放射對稱的建築（環廊、圓形廣場）用的極座標網格。

    ⚠ 為什麼不是方格：實測方格網格**沒有用** —— 模型宣告用了我燒進去的
      1000x667，實際輸出的座標卻到 x1450/y940，格子代號也自己編了一套
      （A~X / 1~18，圖上只有 A~J / 1~7）。它根本沒讀那層網格。
      改讓它報「幾點鐘方向、離中心多遠」——那是相對判斷，模型的強項。
    角度 0°＝12 點鐘，順時針。半徑 0＝中心，1.0＝建築群外緣。
    """
    path = rel if os.path.isabs(rel) else os.path.join(HERE, rel)
    im = Image.open(path).convert('RGB')
    W, H = im.size
    d = ImageDraw.Draw(im, 'RGBA')
    fs = max(15, W // 55)
    try:
        fnt = ImageFont.truetype('arialbd.ttf', fs)
    except Exception:
        fnt = ImageFont.load_default()

    import math
    for rr in (0.2, 0.4, 0.6, 0.8, 1.0):
        r = rr * R
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 110), width=3)
        d.text((cx + 6, cy - r - 4), '%.1f' % rr, font=fnt, fill=(120, 240, 255, 255),
               anchor='ls', stroke_width=3, stroke_fill=(0, 0, 0, 255))
    for a in range(0, 360, 15):
        th = math.radians(a - 90)
        x1, y1 = cx + math.cos(th) * R * 1.02, cy + math.sin(th) * R * 1.02
        maj = a % 45 == 0
        d.line([(cx, cy), (x1, y1)], fill=(255, 255, 255, 110 if maj else 55), width=3 if maj else 1)
        xt, yt = cx + math.cos(th) * R * 1.10, cy + math.sin(th) * R * 1.10
        d.text((xt, yt), str(a) + '°', font=fnt, fill=(255, 240, 120, 255),
               anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0, 255))
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(255, 60, 60, 255))

    dst = out or path.rsplit('.', 1)[0] + '_polar.png'
    im.save(dst)
    print('%s  %dx%d  →  %s   心(%d,%d) R=%d  0deg=12點鐘、順時針'
          % (os.path.basename(path), W, H, os.path.basename(dst), cx, cy, R))
    return dst


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'polar':
        polar(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]))
    else:
        main(sys.argv[1] if len(sys.argv) > 1 else 'city/TheHolySee_iso.png')

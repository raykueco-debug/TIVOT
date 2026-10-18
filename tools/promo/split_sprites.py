# 把透明底的精靈圖（一張好幾個素材）切成一個一個的 PNG：alpha 連通塊各一張，周圍留一點邊。
#   py -X utf8 tools/promo/split_sprites.py <輸出資料夾> <前綴> <sheet.png> [<sheet2.png> ...]
# ⚠ 先把 alpha 輕微膨脹再找連通塊 —— 花莖、細花瓣尖這類很細的部分才不會被切成另一塊；太小的碎塊（雜點）丟掉。
import os, sys
import numpy as np
from PIL import Image, ImageFilter

out, prefix, sheets = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(out, exist_ok=True)
k = 0
for sh in sheets:
    im = Image.open(sh).convert('RGBA'); a = np.asarray(im)[..., 3]
    mask = Image.fromarray(((a > 8) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    m = np.asarray(mask) > 0
    h, w = m.shape; lab = np.zeros((h, w), np.int32); n = 0; boxes = []
    for y0 in range(h):
        row = m[y0]
        if not row.any(): continue
        for x0 in np.nonzero(row & (lab[y0] == 0))[0]:
            if lab[y0, x0]: continue
            n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; x1 = x2 = x0; y1 = y2 = y0; cnt = 0
            while stack:
                y, x = stack.pop(); cnt += 1
                x1 = min(x1, x); x2 = max(x2, x); y1 = min(y1, y); y2 = max(y2, y)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; stack.append((yy, xx))
            if cnt > 400: boxes.append((y1, x1, y2, x2))
    boxes.sort(key=lambda b: (round(b[0] / 120), b[1]))   # 由上而下、由左而右
    for (y1, x1, y2, x2) in boxes:
        p = 6; c = im.crop((max(0, x1 - p), max(0, y1 - p), min(w, x2 + p + 1), min(h, y2 + p + 1)))
        k += 1; c.save(os.path.join(out, '%s_%02d.png' % (prefix, k)))
    print(sh, '->', len(boxes))
print('total', k)

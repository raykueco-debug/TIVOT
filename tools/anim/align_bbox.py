# 兩張去背圖用同一個外框裁切：在聯集外框四角補幾乎透明的點（alpha 12 > 門檻 8）
# 用法：python align_bbox.py <A.png> <B.png> <輸出A> <輸出B>
import sys
from PIL import Image
a, b, oa, ob = sys.argv[1:5]
ims = [Image.open(p).convert('RGBA') for p in (a, b)]
bbs = [im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() for im in ims]
u = (min(x[0] for x in bbs), min(x[1] for x in bbs), max(x[2] for x in bbs), max(x[3] for x in bbs))
for im, o in zip(ims, (oa, ob)):
    for x, y in ((u[0], u[1]), (u[2] - 1, u[1]), (u[0], u[3] - 1), (u[2] - 1, u[3] - 1)):
        if im.getpixel((x, y))[3] <= 8: im.putpixel((x, y), (0, 0, 0, 12))
    im.save(o)
print(bbs, '→', u)

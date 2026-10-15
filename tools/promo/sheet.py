# 素材縮圖表（附秒數）：py sheet.py <場景資料夾> <起秒> <迄秒> <間隔秒> <輸出.jpg>
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, a, b, st, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
ts = []; t = a
while t <= b + 1e-6: ts.append(t); t += st
cols = 10; tw, th = 135, 240
rows = (len(ts)+cols-1)//cols
sh = Image.new('RGB', (cols*tw, rows*th), 'black'); dr = ImageDraw.Draw(sh)
f = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 20)
for i, t in enumerate(ts):
    p = os.path.join(d, 'f%05d.jpg' % round(t*60))
    if not os.path.exists(p): continue
    im = Image.open(p).resize((tw, th)); x, y = (i%cols)*tw, (i//cols)*th
    sh.paste(im, (x, y)); dr.rectangle([x, y, x+62, y+24], fill='black'); dr.text((x+3, y+2), '%.1f' % t, fill='yellow', font=f)
sh.save(out, quality=88)

# -*- coding: utf-8 -*-
"""把羅經座拆成「殼體」與「銅指針」兩張圖。

⚠ 先前是在 drawImage 當下切兩段來源矩形，指針那段一旋轉就跟殼體開縫（斷圖）。
   切割要在素材端做完：殼體是一張完整的圖、指針是另一張，各自獨立繪製，
   旋轉再大也不會有接縫。
指針的樞紐取「指針底邊中央」——它是插在殼體上的，本來就繞底部擺。
"""
import os
import numpy as np
from PIL import Image

HERE = r"C:\Users\Ray Ku\Desktop\TIVOT\flight"
im = Image.open(os.path.join(HERE, "_src", "Base.png")).convert("RGBA")
im = im.crop(im.getbbox())
a = np.asarray(im)
op = a[..., 3] > 24
W, H = im.width, im.height

# 逐列的不透明寬度：指針是頂端一段很窄的錐體（12→50px），
# 到刻度弧才會突然跳寬（70→100+）。⚠ 門檻要壓在 70 附近；
# 先前用 W*0.30=308 會把整段刻度弧也切進指針，樞紐算出來偏到 0.412。
wid = op.sum(1)
narrow = wid < 70
cut = 0
for y in range(H):
    if not narrow[y]:
        cut = y
        break
print("圖 %dx%d　指針佔頂端 %d 列（%.1f%%）　該列寬度 %d" % (W, H, cut, cut / H * 100, wid[max(0, cut - 1)]))

spike = im.crop((0, 0, W, cut))
# ⚠ 用 alpha>120 求外接框：頂端幾列散落著極淡的反鋸齒像素（離指針很遠），
#   用預設的 getbbox() 會把框撐到 604 寬，指針只有 50 —— 那些雜點跟著轉會很怪。
sa = np.asarray(spike)[..., 3] > 120
sys_, sxs_ = np.where(sa)
sb = (int(sxs_.min()), int(sys_.min()), int(sxs_.max()) + 1, int(sys_.max()) + 1)
spike = spike.crop(sb)
# 樞紐在指針底邊中央 → 記錄它相對整張基座的位置
piv_x = (sb[0] + sb[2]) / 2 / W
piv_y = cut / H
spike.save(os.path.join(HERE, "Pointer.webp"), "WEBP", quality=90, method=6)

body = im.crop((0, cut, W, H))
bw = 420
body = body.resize((bw, round(body.height * bw / body.width)), Image.LANCZOS)
body.save(os.path.join(HERE, "Base.webp"), "WEBP", quality=88, method=6)

print("Pointer.webp %dx%d  樞紐(相對原基座) x=%.3f y=%.3f  %dKB"
      % (spike.width, spike.height, piv_x, piv_y,
         os.path.getsize(os.path.join(HERE, "Pointer.webp")) // 1024))
print("Base.webp    %dx%d  %dKB"
      % (body.width, body.height, os.path.getsize(os.path.join(HERE, "Base.webp")) // 1024))
print("→ index.html 用：POINTER_PIV = { x:%.3f, y:%.3f }，指針高度佔基座 %.4f"
      % (piv_x, piv_y, spike.height / H))

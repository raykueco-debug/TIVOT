# 索拉娜眼睛回綠：Wan 在 480 解析下把虹膜洗成暗橄欖色。只在臉部那一塊、色相落在黃綠～青綠、不太亮的像素上，把色相拉回綠、提飽和與亮度。
import glob, os, sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
X0, Y0, X1, Y1 = 130, 90, 310, 210   # 480×720 格上的臉部範圍
for p in sorted(glob.glob(os.path.join(src, 'frame_*.webp'))):
    im = Image.open(p).convert('RGBA'); a = np.array(im)
    reg = a[Y0:Y1, X0:X1]; hsv = np.array(Image.fromarray(reg[..., :3]).convert('HSV')).astype(float)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = (reg[..., 3] > 128) & (h > 55) & (h < 175) & (s > 0.10) & (v < 0.85)
    hsv[..., 0] = np.where(m, 120 * 255 / 360, hsv[..., 0])
    hsv[..., 1] = np.where(m, np.minimum(255, hsv[..., 1] * 2.4 + 70), hsv[..., 1])
    hsv[..., 2] = np.where(m, np.minimum(255, hsv[..., 2] * 1.8 + 30), hsv[..., 2])
    rgb = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))
    reg[..., :3] = rgb; a[Y0:Y1, X0:X1] = reg
    Image.fromarray(a).save(os.path.join(dst, os.path.basename(p)), 'WEBP', lossless=True)
print('ok', dst)



# 頭頂洋紅色塊（Wan 低頭→抬頭時冒出）→ 色相校回髮色。只動上半部、洋紅色相、夠飽和的像素。
# 用法：python fix_magenta.py <格資料夾>（就地覆寫）
import glob, os, sys
import numpy as np
from PIL import Image
for f in sorted(glob.glob(os.path.join(sys.argv[1], 'frame_*.webp'))):
    im = Image.open(f); mode = im.mode; a = np.array(im.convert('RGBA'))
    Y1 = a.shape[0] * 45 // 100; reg = a[:Y1]
    hsv = np.array(Image.fromarray(reg[..., :3]).convert('HSV')).astype(float); h = hsv[..., 0] * 360 / 255; s = hsv[..., 1] / 255
    m = ((h > 290) | (h < 2)) & (s > 0.35)
    hsv[..., 0] = np.where(m, 14 * 255 / 360, hsv[..., 0]); hsv[..., 1] = np.where(m, hsv[..., 1] * 0.85, hsv[..., 1])
    reg[..., :3] = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')); a[:Y1] = reg
    out = Image.fromarray(a)
    (out if mode == 'RGBA' else out.convert('RGB')).save(f, 'WEBP', quality=92)
print('ok', sys.argv[1])

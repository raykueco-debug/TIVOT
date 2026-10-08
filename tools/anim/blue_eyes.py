# 安雅眼睛轉藍（ci_anya_nightmarereload 結尾圖專用）：兩隻虹膜用手量的橢圓，
# 橢圓內整片換色相、保留明度（瞳孔照樣暗、虹膜下半的淺色漸層照樣淺），只跳過高光；
# 橢圓外（眼白、睫毛、眼線、皮膚、頭髮）一律不動。
# 用法：python blue_eyes.py <in> <out> <強度 0~1>
import sys, numpy as np
from PIL import Image
src, dst, t = sys.argv[1], sys.argv[2], float(sys.argv[3])
a = np.array(Image.open(src).convert('RGB'))
IRIS = [(550, 342, 23, 26), (412, 413, 22, 21)]             # (cx, cy, rx, ry)，1024×1536
H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
for cx, cy, rx, ry in IRIS:
    x0, x1, y0, y1 = cx - rx - 3, cx + rx + 4, cy - ry - 3, cy + ry + 4
    reg = a[y0:y1, x0:x1]; hsv = np.array(Image.fromarray(reg).convert('HSV')).astype(float)
    v = hsv[..., 2] / 255
    e = np.sqrt(((xx[y0:y1, x0:x1] - cx) / rx) ** 2 + ((yy[y0:y1, x0:x1] - cy) / ry) ** 2)
    w = np.clip((1 - e) * 12, 0, 1) * (v < 0.94)             # 邊緣約 2px 柔化
    sat = np.minimum(255, hsv[..., 1] * 0.3 + 255 * (0.30 + 0.40 * t) * (0.35 + 0.65 * (1 - v)))
    new = np.dstack([np.full_like(v, 215 * 255 / 360), sat, hsv[..., 2]]).astype(np.uint8)
    rgb = np.array(Image.fromarray(new, 'HSV').convert('RGB')).astype(float)
    reg[:] = (reg * (1 - w[..., None]) + rgb * w[..., None]).astype(np.uint8)
Image.fromarray(a).save(dst)

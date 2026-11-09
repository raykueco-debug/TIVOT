"""GPT 關鍵格進 Wan 前對色（natali rule §10）。11-08 在 3060 這台寫。
用法：python kf_colormatch.py <GPT 關鍵格.png> <接點那一格（原圖／上一段接點格）> <輸出.png>
只看主體（alpha>128），Lab 三通道的平均與標準差對到參考圖；alpha 原樣保留。"""
import sys
import numpy as np, cv2
from PIL import Image

def stats(lab, m):
    return [(lab[..., c][m].mean(), lab[..., c][m].std()) for c in range(3)]

src, ref, out = sys.argv[1:4]
S = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
R = np.asarray(Image.open(ref).convert('RGBA')).astype(np.float32)
ms, mr = S[..., 3] > 128, R[..., 3] > 128
ls = cv2.cvtColor(S[..., :3] / 255, cv2.COLOR_RGB2LAB)
lr = cv2.cvtColor(R[..., :3] / 255, cv2.COLOR_RGB2LAB)
a, b = stats(ls, ms), stats(lr, mr)
o = ls.copy()
for c in range(3):
    o[..., c] = (ls[..., c] - a[c][0]) / (a[c][1] + 1e-6) * b[c][1] + b[c][0]
rgb = np.clip(cv2.cvtColor(o, cv2.COLOR_LAB2RGB), 0, 1) * 255
Image.fromarray(np.dstack([rgb, S[..., 3]]).astype(np.uint8)).save(out)
print(f'L 平均 {a[0][0]:.1f}→{b[0][0]:.1f}（標準差 {a[0][1]:.1f}→{b[0][1]:.1f}） → {out}')

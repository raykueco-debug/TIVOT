# 張嘴格修補：對齊頭的位置 → 量嘴唇區域與「閉嘴參考格」的差 → 張嘴的格借最近閉嘴格的嘴唇補上。
# 用法：python mouthfix.py <輸入資料夾> <輸出資料夾> [門檻]
import glob, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
src, od = sys.argv[1], sys.argv[2]
TH = float(sys.argv[3]) if len(sys.argv) > 3 else 0
HEAD = (170, 95, 300, 205)          # 頭部（對齊用）x0,y0,x1,y1（480×720）
MOUTH = (182, 142, 262, 192)        # 嘴唇＋刀那一條
L = sorted(glob.glob(os.path.join(src, 'frame_*.webp')))
F = [np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in L]
G = [cv2.cvtColor(f.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) for f in F]
x0, y0, x1, y1 = HEAD
def shift(a, b):   # b 相對 a 的位移
    (dx, dy), _ = cv2.phaseCorrelate(G[a][y0:y1, x0:x1], G[b][y0:y1, x0:x1]); return dx, dy
def mouth_of(i, ref):  # 把第 i 格對齊到 ref 之後取嘴
    dx, dy = shift(ref, i)
    M = np.float32([[1, 0, -dx], [0, 1, -dy]])
    a = cv2.warpAffine(F[i], M, (480, 720), borderMode=cv2.BORDER_REPLICATE)
    mx0, my0, mx1, my1 = MOUTH; return a[my0:my1, mx0:mx1]
ref = 0
score = [float(np.abs(mouth_of(i, ref) - F[ref][MOUTH[1]:MOUTH[3], MOUTH[0]:MOUTH[2]]).mean()) for i in range(len(F))]
th = TH or (np.median(score) + 2.5 * np.median(np.abs(np.array(score) - np.median(score))) + 3)
bad = [i for i, s in enumerate(score) if s > th]
print('mouth score', [round(s, 1) for s in score]); print('threshold', round(th, 1), 'open frames', bad)
m = Image.new('L', (480, 720), 0); ImageDraw.Draw(m).ellipse((MOUTH[0] + 6, MOUTH[1] + 4, MOUTH[2] - 6, MOUTH[3] - 4), fill=255)
m = np.asarray(m.filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
os.makedirs(od, exist_ok=True)
good = [i for i in range(len(F)) if i not in bad]
out = []
for i, f in enumerate(F):
    if i in bad and good:
        k = min(good, key=lambda g: abs(g - i))            # 最近的閉嘴格
        dx, dy = shift(k, i)                               # 把 k 對齊到 i 的頭的位置
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        kk = cv2.warpAffine(F[k], M, (480, 720), borderMode=cv2.BORDER_REPLICATE)
        mm = cv2.warpAffine(m, M, (480, 720))
        f = f * (1 - mm[..., None]) + kk * mm[..., None]
    out.append(f)
    Image.fromarray(f.clip(0, 255).astype('uint8')).save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', quality=82)
print('fixed', len(bad), 'of', len(F))

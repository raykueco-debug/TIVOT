# 黑背景加飄過的火星：粒子只畫在背景（亮度低）的地方，不蓋人物。往上偏左飄、閃爍、短尾跡。
# 用法：python embers.py <格資料夾> <輸出資料夾> [數量]
import glob, math, os, random, sys
import numpy as np, cv2
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; N = int(sys.argv[3]) if len(sys.argv) > 3 else 28
os.makedirs(dst, exist_ok=True)
fs = sorted(glob.glob(os.path.join(src, 'frame_*.webp'))); T = len(fs)
W, H = Image.open(fs[0]).size; rnd = random.Random(5)
P = []
for _ in range(N):
    sp = rnd.uniform(2.5, 6.0)
    P.append(dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H), vx=-sp * rnd.uniform(0.15, 0.45), vy=-sp,
                  r=rnd.uniform(1.2, 2.6), ph=rnd.uniform(0, 6.28), fl=rnd.uniform(0.25, 0.6), wob=rnd.uniform(0.5, 1.6)))
for t, f in enumerate(fs):
    im = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    lay = np.zeros((H * 2, W * 2, 3), np.float32)            # 2 倍解析畫粒子再縮，邊緣才柔
    for p in P:
        x = (p['x'] + p['vx'] * t + p['wob'] * 6 * math.sin(t * 0.3 + p['ph'])) % W
        y = (p['y'] + p['vy'] * t) % H
        a = 0.55 + 0.45 * math.sin(t * p['fl'] * 2 + p['ph'])
        c = np.array([255, 105 + 45 * a, 25 * a]) * a
        x0, y0 = x - p['vx'] * 1.8, y - p['vy'] * 1.8             # 尾跡
        cv2.line(lay, (int(x0 * 2), int(y0 * 2)), (int(x * 2), int(y * 2)), (c * 0.45).tolist(), max(1, int(p['r'] * 2)), cv2.LINE_AA)
        cv2.circle(lay, (int(x * 2), int(y * 2)), int(p['r'] * 2.2), c.tolist(), -1, cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA)
    glow = cv2.GaussianBlur(lay, (0, 0), 3.5) * 2.2
    add = lay + glow
    lum = im.mean(axis=2, keepdims=True)
    bgmask = np.clip((40 - lum) / 25, 0, 1)                   # 只在接近黑的背景上
    bgmask = cv2.GaussianBlur(bgmask[..., 0], (0, 0), 1.5)[..., None]
    out = np.clip(im + add * bgmask, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(dst, os.path.basename(f)), 'WEBP', quality=92)
print(T, 'frames →', dst)

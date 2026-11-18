# 鎖住某一塊（Ray 11-18：「尾部大小跟位置固定」，喪鐘蠕蟲）
# 逐格在「參考區」（預設畫面最下面 --frac 那一段）找特徵點，對到第 0 格同一區，算等比縮放＋平移（不旋轉），
# 整格照那個變換貼回去 ⇒ 那一塊在每一格的大小與位置都跟第 0 格一樣，其他部分照常動。
# 特徵不夠就沿用上一格的變換。變換做移動平均（--win）免得抖。畫布四邊加 --pad，anim.json 的 box 照比例擴。
# 用法：python lock_region.py <格資料夾> <輸出資料夾> --json <原 anim.json> [--frac 0.3] [--pad 60] [--win 3]
import argparse, glob, json, os
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--json', required=True)
ap.add_argument('--frac', type=float, default=0.3); ap.add_argument('--pad', type=int, default=60); ap.add_argument('--win', type=int, default=3)
ap.add_argument('--fps', type=float, default=None)
ap.add_argument('--skipmid', type=float, default=0, help='參考區排除畫面中央這個寬度比例（武器擋在雙腳中間時用，例 0.24）')
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
ims = [np.asarray(Image.open(f).convert('RGBA')) for f in fs]
H, W = ims[0].shape[:2]
def gray(im):
    g = cv2.cvtColor(im[..., :3], cv2.COLOR_RGB2GRAY); g[im[..., 3] < 128] = 0; return g
mask = np.zeros((H, W), np.uint8); mask[int(H * (1 - a.frac)):, :] = 255
if a.skipmid > 0: mask[:, int(W * (0.5 - a.skipmid / 2)):int(W * (0.5 + a.skipmid / 2))] = 0
orb = cv2.ORB_create(3000); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
g0 = gray(ims[0]); k0, d0 = orb.detectAndCompute(g0, mask)
T = [(1.0, 0.0, 0.0)]
for im in ims[1:]:
    g = gray(im); m2 = np.zeros_like(mask); m2[int(H * (1 - a.frac * 1.6)):, :] = 255
    if a.skipmid > 0: m2[:, int(W * (0.5 - a.skipmid / 2)):int(W * (0.5 + a.skipmid / 2))] = 0   # 第 i 格的搜尋區放寬一點（尾巴可能縮小往下）
    k, d = orb.detectAndCompute(g, m2)
    t = T[-1]
    if d is not None and d0 is not None:
        ms = sorted(bf.match(d, d0), key=lambda m: m.distance)[:300]
        if len(ms) >= 12:
            p = np.float32([k[m.queryIdx].pt for m in ms]); q = np.float32([k0[m.trainIdx].pt for m in ms])
            M, inl = cv2.estimateAffinePartial2D(p, q, method=cv2.RANSAC, ransacReprojThreshold=4)
            if M is not None and inl is not None and inl.sum() >= 10:
                s = float(np.hypot(M[0, 0], M[1, 0])); t = (s, float(M[0, 2]), float(M[1, 2]))
    T.append(t)
T = np.array(T); w = a.win
if w > 1:
    Tp = np.pad(T, ((w // 2, w // 2), (0, 0)), mode='edge'); T = np.stack([np.convolve(Tp[:, c], np.ones(w) / w, 'valid') for c in range(3)], 1)
p = a.pad; W2, H2 = W + 2 * p, H + 2 * p
os.makedirs(a.dst, exist_ok=True)
for f in glob.glob(os.path.join(a.dst, 'frame_*.webp')): os.remove(f)
for j, (im, (s, tx, ty)) in enumerate(zip(ims, T)):
    M = np.float32([[s, 0, tx + p], [0, s, ty + p]])
    out = cv2.warpAffine(im, M, (W2, H2), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    Image.fromarray(out).save(os.path.join(a.dst, f'frame_{j:02d}.webp'), 'WEBP', quality=82)
j0 = json.load(open(a.json, encoding='utf-8')); sc = j0['box'][2] / j0['px'][0]
j0['box'] = [round(j0['box'][0] - p * sc), round(j0['box'][1] - p * sc), round(W2 * sc), round(H2 * sc)]
j0['px'] = [W2, H2]; j0['frames'] = len(ims)
if a.fps: j0['fps'] = a.fps
json.dump(j0, open(os.path.join(a.dst, 'anim.json'), 'w', encoding='utf-8'), indent=1)
print(f'{len(ims)} 格，縮放 {T[:,0].min():.3f}～{T[:,0].max():.3f}，平移 x {T[:,1].min():.0f}～{T[:,1].max():.0f} y {T[:,2].min():.0f}～{T[:,2].max():.0f}，box {j0["box"]}')

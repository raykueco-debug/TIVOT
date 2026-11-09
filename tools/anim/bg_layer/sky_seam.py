"""背景線：雲層做成左右無縫（同空戰天空 _sky_parallax 那一套：左右接縫處做最小誤差切接）。
原圖寬 W → 輸出寬 W-ov：把最右邊 ov 欄與最左邊 ov 欄重疊，沿「兩邊差異最小」的一條直向路徑切開，
路徑左邊取右段、右邊取左段。整張重複排列時，右緣接回左緣就是原本連續的那一欄 ⇒ 看不出接縫。
（空間上的切接，不是時間上的交叉淡化。）RGBA 的 alpha 一起算。
用法：python sky_seam.py <in.png> <out.png> [--ov 192] [--size 1536x1024]
"""
import argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--ov', type=int, default=192); ap.add_argument('--size', default='')
a = ap.parse_args()
im = Image.open(a.src)
im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
x = np.array(im).astype(np.float32); H, W, C = x.shape; ov = a.ov
R = x[:, W - ov:]; L = x[:, :ov]
cost = np.abs(R - L).sum(2)
if C == 4: cost += np.abs(R[..., 3] - L[..., 3]) * 2
# 動態規劃：每一列選一欄，相鄰列最多偏 1 欄
acc = cost.copy(); back = np.zeros((H, ov), np.int32)
for y in range(1, H):
    prev = acc[y - 1]
    cand = np.stack([np.r_[np.inf, prev[:-1]], prev, np.r_[prev[1:], np.inf]])
    k = cand.argmin(0); back[y] = k - 1 + np.arange(ov); acc[y] += cand.min(0)
path = np.zeros(H, np.int32); path[-1] = int(acc[-1].argmin())
for y in range(H - 1, 0, -1): path[y - 1] = back[y, path[y]]
blend = np.empty_like(L)
for y in range(H):
    c = path[y]; blend[y, :c] = R[y, :c]; blend[y, c:] = L[y, c:]
out = np.concatenate([blend, x[:, ov:W - ov]], axis=1)   # 寬 W-ov：開頭是切接段，結尾接回 R 的開頭（＝原圖第 W-ov 欄的左鄰）
res = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA' if C == 4 else 'RGB')
if a.size:
    w, h = map(int, a.size.split('x')); res = res.resize((w, h), Image.LANCZOS)
res.save(a.dst)
print(a.dst, res.size, 'seam cost', round(float(acc[-1].min() / H), 2))

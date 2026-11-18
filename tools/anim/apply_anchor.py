# 用錨點（anchor_tool.py 存的 anchor.json）把整支片對齊：第 0 格＝不動，錨點那一格＝Ray 調好的 s/dx/dy，
# 中間的格子線性內插。--mirror：片子是 A→B→A 對稱（前後倒放）時，錨點 k 也套到 N-1-k，最後一格＝不動。
# 輸出畫布四邊加 --pad，anim.json 的 box 照比例擴。
# 用法：python apply_anchor.py <格資料夾（含 anchor.json）> <輸出資料夾> --json <原 anim.json> [--mirror] [--pad 80]
import argparse, glob, json, os
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--json', required=True)
ap.add_argument('--mirror', action='store_true'); ap.add_argument('--pad', type=int, default=80)
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp'))); N = len(fs)
AJ = json.load(open(os.path.join(a.src, 'anchor.json'), encoding='utf-8')); A = AJ['frames']; PX, PY = AJ.get('pivot', [0, 0])   # 縮放支點（anchor_tool 存的腳底中心）
key = {0: (1.0, 0.0, 0.0)}
if a.mirror: key[N - 1] = (1.0, 0.0, 0.0)
for k, v in A.items():
    k = int(k); t = (float(v['s']), float(v['dx']), float(v['dy'])); key[k] = t
    if a.mirror: key[N - 1 - k] = t
ks = sorted(key)
def at(i):
    if i <= ks[0]: return key[ks[0]]
    if i >= ks[-1]: return key[ks[-1]]
    for lo, hi in zip(ks, ks[1:]):
        if lo <= i <= hi:
            u = (i - lo) / max(1, hi - lo); return tuple(key[lo][c] + (key[hi][c] - key[lo][c]) * u for c in range(3))
ims = [np.asarray(Image.open(f).convert('RGBA')) for f in fs]
H, W = ims[0].shape[:2]; p = a.pad; W2, H2 = W + 2 * p, H + 2 * p
os.makedirs(a.dst, exist_ok=True)
for f in glob.glob(os.path.join(a.dst, 'frame_*.webp')): os.remove(f)
for j, im in enumerate(ims):
    s, dx, dy = at(j)
    M = np.float32([[s, 0, PX - s * PX + dx + p], [0, s, PY - s * PY + dy + p]])   # 以支點縮放再平移
    out = cv2.warpAffine(im, M, (W2, H2), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    Image.fromarray(out).save(os.path.join(a.dst, f'frame_{j:02d}.webp'), 'WEBP', quality=82)
j0 = json.load(open(a.json, encoding='utf-8')); sc = j0['box'][2] / j0['px'][0]
j0['box'] = [round(j0['box'][0] - p * sc), round(j0['box'][1] - p * sc), round(W2 * sc), round(H2 * sc)]
j0['px'] = [W2, H2]; j0['frames'] = N
json.dump(j0, open(os.path.join(a.dst, 'anim.json'), 'w', encoding='utf-8'), indent=1)
print(f'{N} 格，錨點 {ks}，box {j0["box"]}')

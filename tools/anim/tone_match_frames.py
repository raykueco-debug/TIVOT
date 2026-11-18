# 整支動畫統一色調（Ray 11-18：「生完以後統一色調 不要那麼亮」，高蹺細影四宮格版偏亮）
# 用「所有格的主體合起來」算一組 Lab 平均／標準差，對到參考圖（原立繪）的主體；整支套同一個變換（不逐格算，免得閃）。
# alpha 原樣保留。用法：python tone_match_frames.py <格資料夾> <參考圖> <輸出資料夾> [--amt 1.0]
import argparse, glob, os, shutil
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('ref'); ap.add_argument('dst'); ap.add_argument('--amt', type=float, default=1.0)
a = ap.parse_args()
def lab_mask(im):
    A = np.asarray(im.convert('RGBA')).astype(np.float32)
    lab = cv2.cvtColor(A[..., :3] / 255.0, cv2.COLOR_RGB2LAB); return A, lab, A[..., 3] > 128
_, rl, rm = lab_mask(Image.open(a.ref))
ref = [(rl[..., c][rm].mean(), rl[..., c][rm].std()) for c in range(3)]
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
pix = [[], [], []]
data = []
for f in fs:
    A, lab, m = lab_mask(Image.open(f)); data.append((f, A, lab, m))
    for c in range(3): pix[c].append(lab[..., c][m])
src = [(np.concatenate(p).mean(), np.concatenate(p).std()) for p in pix]
os.makedirs(a.dst, exist_ok=True)
for f, A, lab, m in data:
    o = lab.copy()
    for c in range(3):
        t = (lab[..., c] - src[c][0]) / max(src[c][1], 1e-3) * ref[c][1] + ref[c][0]
        o[..., c] = lab[..., c] + (t - lab[..., c]) * a.amt
    rgb = np.clip(cv2.cvtColor(o, cv2.COLOR_LAB2RGB) * 255, 0, 255)
    out = np.dstack([rgb, A[..., 3]]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(a.dst, os.path.basename(f)), 'WEBP', quality=82)
for x in glob.glob(os.path.join(a.src, '*.json')): shutil.copy(x, a.dst)
print(f'{len(fs)} 格；L {src[0][0]:.1f}→{ref[0][0]:.1f}（σ {src[0][1]:.1f}→{ref[0][1]:.1f}）')

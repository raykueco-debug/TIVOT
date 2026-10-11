"""後製乳搖（Ray：「加乳搖，別搖太大力」）：只動胸部那一塊（中心最大、往外衰減），上下的衰減彈跳。
不重畫像素（變形），所以臉、手、光效都不會被改畫；觸發點（--hits）由動作決定，例如手開始動、到位那一格。

彈跳：每個觸發點 te 之後 A·exp(-(t-te)/tau)·sin(2π(t-te)/period)，先往下沉再回彈（sin 取負＝往下）。
用法：python bounce_warp.py <格資料夾> <輸出資料夾> --center 340 300 --radius 95 75 --hits 10:2 22:4 [--period 8] [--tau 6]
  --hits 格:幅度px（可多個）；--track-box 有給就用相位相關追胸口位移（人在動時用）
"""
import argparse, glob, math, os, shutil
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--center', type=float, nargs=2, required=True); ap.add_argument('--radius', type=float, nargs=2, default=[95, 75])
ap.add_argument('--hits', nargs='+', required=True); ap.add_argument('--period', type=float, default=8); ap.add_argument('--tau', type=float, default=6)
ap.add_argument('--track-box', type=int, nargs=4)
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp'))); os.makedirs(a.out, exist_ok=True)
hits = [(float(h.split(':')[0]), float(h.split(':')[1])) for h in a.hits]
def amp(t):
    s = 0.0
    for te, A in hits:
        if t >= te: d = t - te; s += -A * math.exp(-d / a.tau) * math.sin(2 * math.pi * d / a.period)
    return s
ref = None
for t, f in enumerate(fs):
    im = np.asarray(Image.open(f).convert('RGBA')).astype(np.float32); H, W = im.shape[:2]
    cx, cy = a.center
    if a.track_box:
        x0, y0, x1, y1 = a.track_box; g = im[y0:y1, x0:x1, :3].mean(-1)
        if ref is None: ref = g
        else: (dx, dy), _ = cv2.phaseCorrelate(ref.astype(np.float32), g.astype(np.float32)); cx += dx; cy += dy
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    w = np.exp(-(((xx - cx) / a.radius[0]) ** 2 + ((yy - cy) / a.radius[1]) ** 2) * 1.6)
    A = amp(t)
    out = cv2.remap(im, xx, (yy - A * w).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(a.out, os.path.basename(f)), 'WEBP', quality=94)
print('ok', len(fs), 'frames; amp per frame:', [round(amp(t), 1) for t in range(len(fs))])

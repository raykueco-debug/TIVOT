"""背景線：ABA 合成（Ray 11-10：「樹葉布條用 ABA 下去跑，跑兩段接上就錯不了」「連雲一起 ABA」）。
A→B 段＝從原圖 I2V 出來的那段（s101）第 0～k 格（B 就是它的第 k 格 —— 這個接點天生吻合）；
B→A 段＝FLF（起 B、終 A）。播放：A→B 的 0..k，接 B→A 的 1..n-2（丟掉它的第 0 格＝B 與最後一格≈A），再回到 A。
只在 Ray 註記的範圍（refined/*.png）換成 Wan 的像素，其餘原圖；天空那一色收邊（不扭山壁）。
用法：python aba_comp.py <原圖> <notes key> <AB 前綴> <k> <BA 前綴> <輸出名> [--fps 16]
"""
import argparse, glob, json, os, subprocess
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY_OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'output')
ap = argparse.ArgumentParser()
ap.add_argument('still'); ap.add_argument('key'); ap.add_argument('ab'); ap.add_argument('k', type=int); ap.add_argument('ba'); ap.add_argument('name')
ap.add_argument('--fps', type=int, default=16); ap.add_argument('--sky', default='cyan')
ap.add_argument('--nosky', action='store_true', help='天空不走 ABA（雲交給程式分層）')
ap.add_argument('--reach', type=int, default=80, help='布可以飄出 Ray 畫的範圍多遠（像素）')
a = ap.parse_args()
out = os.path.join(HERE, 'out', a.name); os.makedirs(out, exist_ok=True)
still = np.array(Image.open(a.still).convert('RGB')); H, W = still.shape[:2]; H, W = H - H % 2, W - W % 2; still = still[:H, :W].astype(np.float32)
nd = os.path.join(HERE, 'notes', a.key, 'refined'); layers = []
for p in sorted(glob.glob(os.path.join(nd, '*.png'))):
    m = np.array(Image.open(p).convert('L').resize((W, H)))
    if os.path.basename(p)[:-4] == a.sky:
        if a.nosky: continue
        hard = cv2.erode((m > 127).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
        m = cv2.GaussianBlur(hard.astype(np.float32), (0, 0), 1.5)
    else:
        m = m.astype(np.float32) / 255
    layers.append(m)
M0 = np.max(layers, axis=0)
ld = lambda f: cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
ab = sorted(glob.glob(os.path.join(COMFY_OUT, a.ab + '_*.png')))[:a.k + 1]
ba = sorted(glob.glob(os.path.join(COMFY_OUT, a.ba + '_*.png')))
seq = [ld(f) for f in ab] + [ld(f) for f in ba[1:-1]]
# Ray 11-10：「我畫的範圍只是大概，布飄出我畫的範圍會消失」
# ⇒ 遮罩＝Ray 的範圍 ∪（範圍外 reach 像素內、任何一格跟原圖差得明顯的地方）。只往外長、不往天空與遠處長。
near = cv2.dilate((M0 > 0.3).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.reach + 1, 2 * a.reach + 1)))
dmax = np.zeros((H, W), np.float32)
for f in seq: dmax = np.maximum(dmax, cv2.GaussianBlur(np.abs(f - still).mean(2), (0, 0), 2))
moved = ((dmax > 22) & (near > 0)).astype(np.uint8)
moved = cv2.morphologyEx(moved, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
moved = cv2.dilate(moved, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
M = np.maximum(M0, cv2.GaussianBlur(moved.astype(np.float32), (0, 0), 2))[..., None]
Image.fromarray((M[..., 0] * 255).astype(np.uint8)).save(os.path.join(out, 'mask_used.png'))
# 色調：遮罩區平均對齊原圖（Wan 會慢慢漂色）
ws = M.sum() + 1e-6; ref = (still * M).sum((0, 1)) / ws
seq = [f + (ref - (f * M).sum((0, 1)) / ws) for f in seq]
sm = lambda x: cv2.resize(x, (192, 128), interpolation=cv2.INTER_AREA)
Ms = cv2.resize(M[..., 0], (192, 128))[..., None]
S = [sm(f) for f in seq]
steps = [float((np.abs(S[i] - S[(i + 1) % len(S)]) * Ms).sum() / (Ms.sum() * 3)) for i in range(len(S))]
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an',
                      os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
for f in seq:
    p.stdin.write((still * (1 - M) + f * M).clip(0, 255).astype(np.uint8).tobytes())
p.stdin.close(); p.wait()
meta = dict(method='aba', key=a.key, ab=a.ab, k=a.k, ba=a.ba, frames=len(seq), fps=a.fps,
            joint_AB_to_BA=round(steps[a.k], 3), joint_BA_to_A=round(steps[-1], 3),
            seam_diff=round(max(steps[a.k], steps[-1]), 3), mean_step_diff=round(float(np.mean(steps)), 3), size=[W, H])
json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(meta, ensure_ascii=False))

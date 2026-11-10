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
ap.add_argument('--full', action='store_true', help='純 Wan：整張都用 Wan 的像素（Ray 11-10 點名的那幾格）')
ap.add_argument('--protect', default='', help='這張遮罩白色的地方一律用原圖（圖騰、會冒出人的小徑…）')
ap.add_argument('--keepflicker', action='store_true', help='不要自動拿掉閃動格')
a = ap.parse_args()
out = os.path.join(HERE, 'out', a.name); os.makedirs(out, exist_ok=True)
still = np.array(Image.open(a.still).convert('RGB')); H, W = still.shape[:2]; H, W = H - H % 2, W - W % 2; still = still[:H, :W].astype(np.float32)
nd = os.path.join(HERE, 'notes', a.key, 'refined'); layers = [np.ones((H, W), np.float32)] if a.full else []
for p in ([] if a.full else sorted(glob.glob(os.path.join(nd, '*.png')))):
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
# 接點挑選（只做整格取捨）：每圈接回開頭那一下是最明顯的閃（第 0 格是原圖重建、比 Wan 後面的格銳利）。
# 在 A→B 的開頭幾格、B→A 的結尾幾格、以及 B 附近各試幾個切點，挑兩個接縫加起來最小的那一組。
sm0 = lambda f: cv2.resize(np.array(Image.open(f).convert('RGB')), (192, 128), interpolation=cv2.INTER_AREA).astype(np.float32)
AB = [sm0(f) for f in ab]; BA = [sm0(f) for f in ba]
d0 = lambda x, y: float(np.abs(x - y).mean())
best = None
for s0 in range(0, 7):
    for e in range(len(BA) - 1, len(BA) - 8, -1):
        for kk in range(a.k, a.k - 4, -1):
            for j in range(1, 5):
                c = d0(BA[e - 1], AB[s0]) + d0(AB[kk], BA[j])
                if best is None or c < best[0]: best = (c, s0, e, kk, j)
_, S0, E0, KK, J0 = best
ab = ab[S0:KK + 1]; ba_use = ba[J0:E0]
seq = [ld(f) for f in ab] + [ld(f) for f in ba_use]
a.k = KK - S0   # 之後的 k＝B 在 seq 裡的位置
# Ray 11-10：「我畫的範圍只是大概，布飄出我畫的範圍會消失」
# ⇒ 遮罩＝Ray 的範圍 ∪（範圍外 reach 像素內、任何一格跟原圖差得明顯的地方）。只往外長、不往天空與遠處長。
near = cv2.dilate((M0 > 0.3).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.reach + 1, 2 * a.reach + 1)))
dmax = np.zeros((H, W), np.float32)
for f in seq: dmax = np.maximum(dmax, cv2.GaussianBlur(np.abs(f - still).mean(2), (0, 0), 2))
moved = ((dmax > 22) & (near > 0)).astype(np.uint8)
moved = cv2.morphologyEx(moved, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
moved = cv2.dilate(moved, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
M = np.maximum(M0, cv2.GaussianBlur(moved.astype(np.float32), (0, 0), 2))
if a.protect:   # 保護區：一律原圖（羽化 3px）
    P = (np.array(Image.open(a.protect).convert('L').resize((W, H))) > 127).astype(np.float32)
    M = M * (1 - cv2.GaussianBlur(P, (0, 0), 3))
M = M[..., None]
Image.fromarray((M[..., 0] * 255).astype(np.uint8)).save(os.path.join(out, 'mask_used.png'))
# 色調：遮罩區平均對齊原圖（Wan 會慢慢漂色）
ws = M.sum() + 1e-6; ref = (still * M).sum((0, 1)) / ws
seq = [f + (ref - (f * M).sum((0, 1)) / ws) for f in seq]
sm = lambda x: cv2.resize(x, (192, 128), interpolation=cv2.INTER_AREA)
Ms = cv2.resize(M[..., 0], (192, 128))[..., None]
S = [sm(f) for f in seq]
dif = lambda i, j: float((np.abs(S[i % len(S)] - S[j % len(S)]) * Ms).sum() / (Ms.sum() * 3))
# 拿掉閃動格（Ray 11-10：「除了閃動勉強可以，把閃動幀拿掉」）—— 只做整格取捨，不補格不淡化。
# 判準：某 1~2 格跟前後都差很多、而前後兩格彼此很近 ⇒ 那 1~2 格是突跳的雜訊，拿掉反而順。
keep = list(range(len(S))); dropped = []
if not a.keepflicker:
    for _ in range(12):
        n = len(keep); st = [dif(keep[i], keep[(i + 1) % n]) for i in range(n)]; med = float(np.median(st)) + 1e-6; best = None
        for w in (1, 2):
            for i in range(1, n - w):
                if any(keep[i + t] in (0, a.k) for t in range(w)): continue   # A 與 B 不拿
                into, out_, skip = st[i - 1], st[i + w - 1], dif(keep[i - 1], keep[i + w])
                if into > 2.2 * med and out_ > 2.2 * med and skip < 0.6 * min(into, out_):
                    gain = into + out_ - skip
                    if not best or gain > best[0]: best = (gain, i, w)
        if not best: break
        _, i, w = best; dropped += keep[i:i + w]; del keep[i:i + w]
seq = [seq[i] for i in keep]; kpos = keep.index(a.k); S = [S[i] for i in keep]
steps = [dif(i, i + 1) for i in range(len(S))]
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an',
                      os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
for f in seq:
    p.stdin.write((still * (1 - M) + f * M).clip(0, 255).astype(np.uint8).tobytes())
p.stdin.close(); p.wait()
meta = dict(method='aba', full=a.full, key=a.key, ab=a.ab, k=a.k, ba=a.ba, frames=len(seq), fps=a.fps, dropped=sorted(dropped), cut=dict(ab_start=S0, ab_end=KK, ba_start=J0, ba_end=E0),
            protect=a.protect, still=a.still, args=[x for x in __import__('sys').argv[1:]], k_src=KK,
            joint_AB_to_BA=round(steps[kpos], 3), joint_BA_to_A=round(steps[-1], 3),
            seam_diff=round(max(steps[kpos], steps[-1]), 3), mean_step_diff=round(float(np.mean(steps)), 3), size=[W, H])
json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(meta, ensure_ascii=False))

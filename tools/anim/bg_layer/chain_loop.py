"""背景線：ABCD 真循環（Ray 11-10：「真循環用 abc 還是會倒車，那就用 abcd 試看看」）。
A→B、B→C、C→D 三段都是 I2V「往前生」（從上一段最後一格繼續，不回頭），只有最後 D→A 用 FLF 收回原圖。
往前走的路越長，最後那一段要「拉回去」的比例就越小，看起來就不像倒帶。
接點只做整格取捨（D→A 的結尾、A→B 的開頭各試幾格，挑接縫最小的），不淡化。
用法：python chain_loop.py <notes key> <A→B 的 Wan 前綴> <k> <名字> "<往前的提示詞>" [--protect 遮罩] [--seg 49]
（A→B 用既有的 s101 輸出，取到第 k 格；其餘三段這支會自己送 Wan）"""
import argparse, glob, json, os, subprocess, sys
import numpy as np, cv2
from PIL import Image
import bg_queue as Q, time


def comfy_up():   # Ray 指名的這一件插隊：不等佇列清空，只等 ComfyUI 活著（送進去照 FIFO 排）
    while Q.queue_busy(8188, True) == 99: time.sleep(15)
HERE = Q.HERE; COMFY = Q.COMFY; BG = Q.BG; PY = Q.PY
ap = argparse.ArgumentParser(); ap.add_argument('key'); ap.add_argument('ab'); ap.add_argument('k', type=int); ap.add_argument('name'); ap.add_argument('prompt')
ap.add_argument('--protect', default=''); ap.add_argument('--seg', type=int, default=49); ap.add_argument('--seed', type=int, default=505); ap.add_argument('--fps', type=int, default=16)
a = ap.parse_args()
j = json.load(open(os.path.join(HERE, 'notes', a.key, 'notes.json'), encoding='utf8')); still_p = os.path.join(BG, j['file'])
base = a.key.replace('__', '_'); inp = f'bg_{base}.png'
frames = lambda p: sorted(glob.glob(os.path.join(COMFY, 'output', p + '_*.png')))
segs = [frames(a.ab)[:a.k + 1]]
last = segs[0][-1]
for tag in ('bc', 'cd'):
    pre = f'bgl/{base}_{a.name}_{tag}'
    src = f'bg_{base}_{a.name}_{tag}_in.png'; Image.open(last).convert('RGB').save(os.path.join(COMFY, 'input', src))
    if len(frames(pre)) < a.seg:
        comfy_up(); ok, _ = Q.run([PY, 'bg_wan.py', src, pre, str(a.seg), a.prompt, str(a.seed)])
        if not ok: sys.exit(1)
    segs.append(frames(pre)); last = segs[-1][-1]
pre = f'bgl/{base}_{a.name}_da'; src = f'bg_{base}_{a.name}_da_in.png'; Image.open(last).convert('RGB').save(os.path.join(COMFY, 'input', src))
if len(frames(pre)) < a.seg:
    comfy_up(); ok, _ = Q.run([PY, 'bg_flf.py', src, inp, pre, str(a.seg), a.prompt + '最後回到畫面原本的樣子。', str(a.seed)])
    if not ok: sys.exit(1)
segs.append(frames(pre))
# 合成：整張用 Wan（保護區用原圖），每格色調對齊原圖
still = np.array(Image.open(still_p).convert('RGB')); H, W = still.shape[:2]; H -= H % 2; W -= W % 2; still = still[:H, :W].astype(np.float32)
M = np.ones((H, W), np.float32)
if a.protect: M *= 1 - cv2.GaussianBlur((np.array(Image.open(a.protect).convert('L').resize((W, H))) > 127).astype(np.float32), (0, 0), 3)
sm = lambda f: cv2.resize(np.array(Image.open(f).convert('RGB')), (192, 128), interpolation=cv2.INTER_AREA).astype(np.float32)
d0 = lambda x, y: float(np.abs(x - y).mean())
A0 = [sm(f) for f in segs[0][:7]]; DA = [sm(f) for f in segs[-1]]
best = min(((d0(DA[e], A0[s]), s, e) for s in range(len(A0)) for e in range(len(DA) - 8, len(DA) - 1)))
_, S0, E0 = best
seq = segs[0][S0:] + segs[1][1:] + segs[2][1:] + segs[3][1:E0 + 1]
out = os.path.join(HERE, 'out', f'{base}_{a.name}'); os.makedirs(out, exist_ok=True)
Mm = M[..., None]; ws = Mm.sum() + 1e-6; ref = (still * Mm).sum((0, 1)) / ws
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
S = []
for f in seq:
    x = cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    x += ref - (x * Mm).sum((0, 1)) / ws
    p.stdin.write((still * (1 - Mm) + x * Mm).clip(0, 255).astype(np.uint8).tobytes()); S.append(cv2.resize(x, (192, 128)))
p.stdin.close(); p.wait()
steps = [d0(S[i], S[(i + 1) % len(S)]) for i in range(len(S))]
cut = [len(segs[0]) - S0 - 1, len(segs[0]) - S0 - 1 + len(segs[1]) - 1, len(segs[0]) - S0 - 1 + len(segs[1]) - 1 + len(segs[2]) - 1]
meta = dict(method='abcd', key=a.key, frames=len(seq), fps=a.fps, joints=[round(steps[c], 3) for c in cut] + [round(steps[-1], 3)],
            seam_diff=round(max(steps[c] for c in cut + [-1]), 3), mean_step_diff=round(float(np.mean(steps)), 3), size=[W, H], start=S0, da_end=E0)
json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1); print(json.dumps(meta, ensure_ascii=False))

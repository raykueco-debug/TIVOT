"""背景線：F 版前景（布 ABA）＋ 程式雲（GPT 九宮格雲塊）＋ 拿掉閃動格（Ray 11-11：「F 的前景反而都沒問題，用 F＋程式跑雲，把閃動格減掉」）。
天空＝原圖天空色的縱向漸層（sky_alpha 範圍內取樣）；雲只撒在天空那一條裡，從地平線（天空下緣）往上湧、只往前；
前景＝out/<base>_abacloth/loop.mp4，天空那塊用 sky_alpha 挖掉。
閃動格：前景區逐格差分，某一格跟前後都差很大、但前後兩格彼此很像 ⇒ 那一格是閃，丟掉（循環接縫也算）。
用法：python f_cloud_comp.py <key 例 canyon__entry__day> [秒數 16] [fps 16]"""
import sys, os, subprocess
import numpy as np, cv2
from PIL import Image
import cloud_sprites as CS

key = sys.argv[1]; T = float(sys.argv[2]) if len(sys.argv) > 2 else 16.0; FPS = int(sys.argv[3]) if len(sys.argv) > 3 else 16
BL = r'C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/bg_layer/'; DL = r'C:/Users/Ray Ku/Downloads/'
base = key.replace('__', '_'); W, H = CS.W, CS.H
src = BL + f'out/{base}_abacloth/loop.mp4'
cap = cv2.VideoCapture(src); F = []
while True:
    ok, fr = cap.read()
    if not ok: break
    F.append(cv2.resize(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32))
sa = np.array(Image.open(BL + f'notes/{key}/refined/sky_alpha.webp').convert('RGBA').resize((W, H), Image.LANCZOS))[..., 3].astype(np.float32) / 255
fg = 1 - sa
# ── 閃動格 ──
m = fg > 0.5
def d(a, b): return float(np.abs(F[a][m] - F[b][m]).mean())
keep = list(range(len(F))); dropped = []
for _ in range(len(F) // 3):
    n = len(keep); st = [d(keep[i], keep[(i + 1) % n]) for i in range(n)]; med = float(np.median(st)); bad = None; worst = 0
    for i in range(n):
        a, b, c = keep[(i - 1) % n], keep[i], keep[(i + 1) % n]
        da, db, ac = st[(i - 1) % n], st[i], d(a, c)
        if min(da, db) > 1.8 * med and ac < 0.75 * min(da, db) and min(da, db) - ac > worst: worst, bad = min(da, db) - ac, i
    if bad is None: break
    dropped.append(keep.pop(bad))
n = len(keep); st = [d(keep[i], keep[(i + 1) % n]) for i in range(n)]
print('frames', len(F), '→', n, 'dropped', sorted(dropped), 'step med', round(float(np.median(st)), 2), 'max', round(max(st), 2))
FR = [F[i] for i in keep]
# ── 天空底色 ──
orig = F[0]; ys, xs = np.where(sa > 0.9); yb = int(ys.max()); yt = int(ys.min()); x0, x1 = int(xs.min()), int(xs.max()); sw = x1 - x0
top_c = np.median(orig[sa > 0.9][ys < yt + (yb - yt) * 0.25], 0) if (ys < yt + (yb - yt) * 0.25).any() else np.median(orig[sa > 0.9], 0)
hor_c = np.median(orig[sa > 0.9][ys > yt + (yb - yt) * 0.7], 0)
g = np.clip((np.arange(H) - yt) / max(1, yb - yt), 0, 1)[:, None, None]
sky = np.broadcast_to(top_c * (1 - g) + hor_c * g, (H, W, 3)).astype(np.float32)
print('sky', yt, yb, x0, x1, top_c.round(), hor_c.round())
# ── 雲（只撒在天空那一條；地平線往上湧）──
S_far, S_mid, S_near = (CS.cut_grid(DL + f'cloudgrid_{n_}.png') for n_ in ('far', 'mid', 'near'))
fogc = lambda k: tuple(np.array((232, 238, 246), np.float32) * (1 - k) + hor_c * k)
xr = (x0 - sw * 0.15, x1 + sw * 0.15); hgt = yb - yt
L = [CS.Layer(S_far, 2, yb - hgt * 0.12, hgt * 0.30, 7, sw * 0.20, sw * 0.38, 70, 3, haze_col=hor_c, haze=0.30, fog_col=fogc(0.6), xr=xr, fog=0.5),
     CS.Layer(S_mid, 3, yb - hgt * 0.35, hgt * 0.55, 6, sw * 0.30, sw * 0.55, 54, 5, haze_col=hor_c, haze=0.12, fog_col=fogc(0.3), xr=xr, fog=0.0),
     CS.Layer(S_near, 4, yb - hgt * 0.62, hgt * 0.75, 4, sw * 0.45, sw * 0.80, 44, 7, fog_col=fogc(0.0), xr=xr, fog=0.0)]
out = BL + f'out/{base}_fcloud/loop.mp4'; os.makedirs(os.path.dirname(out), exist_ok=True)
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
for fi in range(int(T * FPS)):
    t = 30 + fi / FPS; img = sky.copy()
    for Ly in L:
        c, a = Ly.render(t); img = img * (1 - a[..., None]) + c * a[..., None]
    img = img * sa[..., None] + FR[fi % len(FR)] * fg[..., None]
    p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
    if fi in (0, 80): Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out.replace('.mp4', f'_f{fi}.jpg'))
p.stdin.close(); p.wait(); print('ok', out)

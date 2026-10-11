"""分層合成：人物層（去背 RGBA）＋特效層（黑底發光）各自停格，再疊成一支 CI。
Ray 2026-10-09：「把特效跟人物動作分開」—— 人物與特效各用自己的節奏，特效不再變成人物剪格時的另一種斷點。

疊法：純黑 → 特效（後景，screen）→ 人物 → 特效（前景，screen × --front，像光蓋在身上）
節奏：輸出 --fps（預設 24）。每一層各自「幾格換一張」：
  --char-step N ＝人物每 N 格換一張（2＝一拍二、3＝一拍三）；--char-holds 檔＝改用 animechk／auto_cut 的 holds.json
  --fx-step   N ＝特效每 N 格換一張（1＝每格都換）
  原片都是 16fps：第 t 格輸出取原片 floor(換圖時刻 × 16 / fps)
人物層放回原畫布：用 --char-canvas（產生人物層時餵給 Wan 的那張去背原圖）決定位置，同 comp_fgbg_embers.py。
特效層是整張（ci 模式）＝直接縮到 480×720。

用法：python comp_layers.py <人物格資料夾> <特效格資料夾> <輸出名> --char-canvas <原圖> [--dur 2] [--char-step 2] [--fx-step 1] [--front 0.35]
"""
import argparse, glob, json, math, os, subprocess
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('fx'); ap.add_argument('name')
ap.add_argument('--char-canvas', required=True); ap.add_argument('--dur', type=float, default=2.0)
ap.add_argument('--fps', type=float, default=24); ap.add_argument('--src-fps', type=float, default=16)
ap.add_argument('--char-step', type=int, default=2); ap.add_argument('--fx-step', type=int, default=1)
ap.add_argument('--char-holds'); ap.add_argument('--front', type=float, default=0.35); ap.add_argument('--fx-gain', type=float, default=1.0)
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
for f in glob.glob(os.path.join(OD, 'frame_*')): os.remove(f)
W, H = 480, 720; T = int(round(a.dur * a.fps))
cf = sorted(glob.glob(os.path.join(a.char, 'frame_*.webp'))); xf = sorted(glob.glob(os.path.join(a.fx, 'frame_*.webp')))
# 人物放回原畫布（tivot_wan.to_green 的 0.92 fit 反推）
src = Image.open(a.char_canvas).convert('RGBA'); K = W / src.width
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); bw, bh = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / bw, H * 0.92 / bh); ox, oy = (W - round(bw * s)) // 2, (H - round(bh * s)) // 2
def char_img(p):
    f = Image.open(p).convert('RGBA'); sc = K / s; big = f.resize((round(W * sc), round(H * sc)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K)), big); return c
def stepped(t, step, n):            # 第 t 個輸出格 → 原片第幾格（每 step 格換一張）
    return min(n - 1, int(math.floor((t // step) * step * a.src_fps / a.fps)))
if a.char_holds:                    # 用 holds.json：第 k 張停 holds[k] 格（張＝資料夾裡依序的格）
    hs = json.load(open(a.char_holds))['holds']; seq = [k for k, h in enumerate(hs) for _ in range(h)]
    cidx = lambda t: seq[min(t, len(seq) - 1)]
else:
    cidx = lambda t: stepped(t, a.char_step, len(cf))
cache = {}
for t in range(T):
    ci, xi = cidx(t), stepped(t, a.fx_step, len(xf))
    if ci not in cache: cache[ci] = char_img(cf[ci])
    fx = np.asarray(Image.open(xf[xi]).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255 * a.fx_gain
    ch = np.asarray(cache[ci]).astype(np.float32) / 255; al = ch[..., 3:4]
    out = fx * (1 - al) + ch[..., :3] * al                      # 後景特效 → 人物
    out = 1 - (1 - out) * (1 - fx * a.front)                    # 前景特效：screen
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', f'{a.fps:g}', '-i', os.path.join(OD, 'frame_%02d.webp'),
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(f'{T} 格 @{a.fps:g}fps → {OD}.mp4（人物 {"holds.json" if a.char_holds else f"每 {a.char_step} 格"}、特效每 {a.fx_step} 格）')

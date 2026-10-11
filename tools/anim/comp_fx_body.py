"""人物（Ray 剪好的去背序列）＋「全身升騰」特效（剪影模式 VACE 生的）＋外圈火焰環，合成成 CI。
Ray：「火燄不一定不能吃到前景，力量是全身升騰而出」「越中心火燄越淡，不然會遮臉」
  · 全身特效以 screen 疊在人物「前面」，乘上由中心往外的漸層（--center 那一點附近幾乎 0，往外到 --radius 達到 1）
  · 外圈火焰環（可選）放在人物後面（黑底 screen）
用法：python comp_fx_body.py <人物格(holds 展開前)> <holds.json/export.json> <全身特效格資料夾> <輸出名> [--ring <火焰環格資料夾>]
      [--center 245 210] [--radius 260] [--inner 0.05] [--gain 1.0] [--total 49] [--fps 24]
"""
import argparse, glob, json, os, subprocess
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('holds'); ap.add_argument('fx'); ap.add_argument('name')
ap.add_argument('--ring'); ap.add_argument('--center', type=float, nargs=2, default=[245, 210]); ap.add_argument('--radius', type=float, default=260)
ap.add_argument('--inner', type=float, default=0.05); ap.add_argument('--gain', type=float, default=1.0); ap.add_argument('--ring-gain', type=float, default=0.8)
ap.add_argument('--total', type=int, default=49); ap.add_argument('--fps', type=float, default=24)
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
for f in glob.glob(os.path.join(OD, 'frame_*')): os.remove(f)
W, H = 480, 720
cf = sorted(glob.glob(os.path.join(a.char, 'frame_*.webp'))); hs = json.load(open(a.holds, encoding='utf-8'))['holds']
seq = [cf[k] for k, h in enumerate(hs) for _ in range(h)]; seq = (seq + [seq[-1]] * a.total)[:a.total]
xf = sorted(glob.glob(os.path.join(a.fx, 'frame_*.webp'))); rf = sorted(glob.glob(os.path.join(a.ring, 'frame_*.webp'))) if a.ring else []
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.hypot(xx - a.center[0], (yy - a.center[1]) * 0.8) / a.radius                 # 縱向稍微壓扁：人是直的
wgt = (a.inner + (1 - a.inner) * np.clip(d, 0, 1) ** 1.6)[..., None]                # 中心淡、往外強
for t in range(a.total):
    ch = np.asarray(Image.open(seq[t]).convert('RGBA').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    out = np.zeros((H, W, 3), np.float32)
    if rf: out = np.asarray(Image.open(rf[min(t, len(rf) - 1)]).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255 * a.ring_gain
    out = out * (1 - ch[..., 3:4]) + ch[..., :3] * ch[..., 3:4]                         # 外圈火焰環在人物後面
    fx = np.asarray(Image.open(xf[min(t, len(xf) - 1)]).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255 * a.gain * wgt
    out = 1 - (1 - out) * (1 - np.clip(fx, 0, 1))                                       # 全身火焰：screen 疊在前面
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', f'{a.fps:g}', '-i', os.path.join(OD, 'frame_%02d.webp'),
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(f'{a.total} 格 @{a.fps:g}fps → {OD}.mp4')

"""往上升的半透明火焰（Ray：「不要遮罩，大概指定一個範圍，半透明火燄升騰，不要環，往上升」「不要轉 往上升」）。
拿一段「一撮往上升的火」（黑底），複製成好幾撮、錯開時間與左右位置、放大，排成一片往上升的火，screen 半透明疊在人物上。
臉附近再淡一點（--face 那一點、--face-r 半徑內降到 --face-min）。

用法：python comp_fx_rise.py <人物格> <holds/export.json> <火焰格資料夾> <輸出名>
      [--src-box 146 315 339 712] [--plumes "x,scale,offset;..."] [--opacity 0.6] [--total 49] [--fps 24]
"""
import argparse, glob, json, os, subprocess
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('holds'); ap.add_argument('fx'); ap.add_argument('name')
ap.add_argument('--src-box', type=int, nargs=4, default=[146, 315, 339, 712])
ap.add_argument('--plumes', default='150,1.5,0;245,1.8,9;340,1.5,17;200,1.2,24;295,1.2,31')   # 中心 x、放大倍數、時間錯開（格）
ap.add_argument('--bottom', type=int, default=720); ap.add_argument('--opacity', type=float, default=0.6)
ap.add_argument('--speed', type=float, default=1.0, help='火焰播放速度（0.5＝慢一倍，每張火焰停 2 格）')
ap.add_argument('--face', type=float, nargs=2, default=[245, 200]); ap.add_argument('--face-r', type=float, default=110); ap.add_argument('--face-min', type=float, default=0.15)
ap.add_argument('--total', type=int, default=49); ap.add_argument('--fps', type=float, default=24)
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
for f in glob.glob(os.path.join(OD, 'frame_*')): os.remove(f)
W, H = 480, 720
cf = sorted(glob.glob(os.path.join(a.char, 'frame_*.webp'))); hs = json.load(open(a.holds, encoding='utf-8'))['holds']
seq = [cf[k] for k, h in enumerate(hs) for _ in range(h)]; seq = (seq + [seq[-1]] * a.total)[:a.total]
xf = sorted(glob.glob(os.path.join(a.fx, 'frame_*.webp'))); N = len(xf)
x0, y0, x1, y1 = a.src_box
src = [np.asarray(Image.open(f).convert('RGB').crop((x0, y0, x1, y1))).astype(np.float32) / 255 for f in xf]
plumes = [tuple(float(v) for v in p.split(',')) for p in a.plumes.split(';')]   # x,scale,offset[,bottom]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
face = np.clip(np.hypot(xx - a.face[0], yy - a.face[1]) / a.face_r, 0, 1)
fade = (a.face_min + (1 - a.face_min) * face ** 1.5)[..., None]
for t in range(a.total):
    fx = np.zeros((H, W, 3), np.float32)
    for pl in plumes:
        cx, sc, off = pl[:3]; bot = pl[3] if len(pl) > 3 else a.bottom
        s = src[int(t * a.speed + off) % N]                                     # 循環錯開：每撮在不同的升騰階段
        im = Image.fromarray((s * 255).astype(np.uint8)); w, h = round(im.width * sc), round(im.height * sc)
        p = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
        px, py = int(cx - w / 2), int(bot - h)
        sx0, sy0 = max(0, -px), max(0, -py); dx0, dy0 = max(0, px), max(0, py)
        ww, hh = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
        if ww > 0 and hh > 0:
            reg = fx[dy0:dy0 + hh, dx0:dx0 + ww]; fx[dy0:dy0 + hh, dx0:dx0 + ww] = 1 - (1 - reg) * (1 - p[sy0:sy0 + hh, sx0:sx0 + ww])
    ch = np.asarray(Image.open(seq[t]).convert('RGBA').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    out = ch[..., :3] * ch[..., 3:4]
    out = 1 - (1 - out) * (1 - np.clip(fx * a.opacity * fade, 0, 1))
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', f'{a.fps:g}', '-i', os.path.join(OD, 'frame_%02d.webp'),
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(f'{a.total} 格 → {OD}.mp4')

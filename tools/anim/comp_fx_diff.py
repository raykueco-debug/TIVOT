"""把「Wan 自由生成、Ray 看過可以」的特效，套到 Ray 剪好的人物動作上（Ray 2026-10-09：「整個丟給 wan 生力量升騰，我看過可以以後你再用那個套到我剪好的動作上」）。
特效抽取：特效影片每格 − 生成時餵的起始圖（無特效的人物在黑底）＝ 多出來的光（只取正值）。
套用：Ray 的人物格放回原畫布（同 comp_fgbg_embers 的 0.92 fit 反推）→ 黑底 → screen 疊上抽出的光。
特效照自己原本的速度跑（16fps → 輸出 fps），不跟人物停格；人物照 holds 展開、最後一張停到 --total。

用法：python comp_fx_diff.py <人物格> <holds/export.json> <特效影片格資料夾> <無特效基準圖> <人物畫布原圖> <輸出名> [--gain 1.0] [--total 49] [--fps 24]
"""
import argparse, glob, json, os, subprocess
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('holds'); ap.add_argument('fx'); ap.add_argument('base'); ap.add_argument('canvas'); ap.add_argument('name')
ap.add_argument('--gain', type=float, default=1.0); ap.add_argument('--total', type=int, default=49); ap.add_argument('--fps', type=float, default=24)
ap.add_argument('--fx-fps', type=float, default=16)
ap.add_argument('--inside', type=float, default=0.35, help='基準人物剪影內的光只留這個比例（避免基準圖本身的亮邊在 Ray 的人物上變成殘影）')
ap.add_argument('--fx-start', type=int, default=0, help='特效從第幾格開始（提早發生）；有設時把剩下的格平均攤滿整支，不會停在最後一格')
ap.add_argument('--base-alpha', help='基準人物的去背圖（取剪影＋對位用）')
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
for f in glob.glob(os.path.join(OD, 'frame_*')): os.remove(f)
W, H = 480, 720
cf = sorted(glob.glob(os.path.join(a.char, 'frame_*.webp'))); hs = json.load(open(a.holds, encoding='utf-8'))['holds']
seq = [cf[k] for k, h in enumerate(hs) for _ in range(h)]; seq = (seq + [seq[-1]] * a.total)[:a.total]
xf = sorted(glob.glob(os.path.join(a.fx, 'frame_*.webp')))
base = np.asarray(Image.open(a.base).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
src = Image.open(a.canvas).convert('RGBA'); K = W / src.width
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); bw, bh = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / bw, H * 0.92 / bh); ox, oy = (W - round(bw * s)) // 2, (H - round(bh * s)) // 2
balpha = None
if a.base_alpha:
    balpha = np.asarray(Image.open(a.base_alpha).convert('RGBA').resize((W, H), Image.LANCZOS))[..., 3].astype(np.float32) / 255
    inner = cv2.GaussianBlur(cv2.erode((balpha > 0.5).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32), (0, 0), 4)
    keepw = (1 - inner * (1 - a.inside))[..., None]
def char_img(p):
    f = Image.open(p).convert('RGBA'); sc = K / s; big = f.resize((round(W * sc), round(H * sc)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K)), big)
    x = np.asarray(c).astype(np.float32) / 255; return x[..., :3] * x[..., 3:4], x[..., 3]
cache = {}
for t in range(a.total):
    if seq[t] not in cache:
        rgb, al = char_img(seq[t]); sh = (0.0, 0.0)
        if balpha is not None:
            (dx, dy), _ = cv2.phaseCorrelate(balpha, al.astype(np.float32)); sh = (dx, dy)   # 基準剪影 → 這張人物的位移
        cache[seq[t]] = (rgb, sh)
    crgb, (dx, dy) = cache[seq[t]]
    fi = (a.fx_start + round(t * (len(xf) - 1 - a.fx_start) / max(1, a.total - 1))) if a.fx_start else min(len(xf) - 1, int(t * a.fx_fps / a.fps))
    fxf = np.asarray(Image.open(xf[fi]).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    light = np.clip(fxf - base, 0, 1) * a.gain                       # 多出來的光
    if balpha is not None: light = light * keepw
    if dx or dy: light = cv2.warpAffine(light, np.float32([[1, 0, dx], [0, 1, dy]]), (W, H))   # 跟著人物位移
    out = 1 - (1 - crgb) * (1 - light)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', f'{a.fps:g}', '-i', os.path.join(OD, 'frame_%02d.webp'),
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(f'{a.total} 格 @{a.fps:g}fps → {OD}.mp4')

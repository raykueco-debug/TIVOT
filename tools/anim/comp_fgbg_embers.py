# 去背人物格 → 放回原畫布 → 純黑底＋「後景火星」＋人物＋「前景火星」→ 480×720 16fps mp4
# comp_black_embers.py 的前後景版（Bullet Rain 起用）。火星一律同方向直飛、無尾巴（Ray：「火星要往一個方向飛，不要像精蟲」）。
# 前景火星：數量少、顆大、帶一點景深模糊、比後景快（視差）。
# 長度不夠就把最後一格停住補滿 --total 格；停住期間火星照飛（CI 全程都要在動，不可停格）。
# 半透明（速度模糊）的邊緣再壓一次綠：g ≤ (r+b)/2（綠幕跑模糊的殘綠）。
# 用法：python comp_fgbg_embers.py <人物格資料夾> <對位原圖(畫布)> <輸出名> [--total 16] [--bg 110] [--fg 14] [--ang 35]
import argparse, glob, math, os, random, subprocess
import numpy as np, cv2
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('frames'); ap.add_argument('src'); ap.add_argument('name')
ap.add_argument('--total', type=int, default=0); ap.add_argument('--bg', type=int, default=110); ap.add_argument('--fg', type=int, default=24)
ap.add_argument('--ang', type=float, default=35); ap.add_argument('--dehue', action='store_true'); ap.add_argument('--keep', type=int, nargs=4, default=[150, 60, 330, 230]); ap.add_argument('--seed', type=int, default=5)
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
FF = r'C:\ffmpeg\bin\ffmpeg.exe'
W, H = 480, 720; ANG = math.radians(a.ang)
src = Image.open(a.src).convert('RGBA'); CW = src.width; K = W / CW
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); bw, bh = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / bw, H * 0.92 / bh); ox, oy = (W - round(bw * s)) // 2, (H - round(bh * s)) // 2
def despill(f):
    x = np.asarray(f).astype(np.float32); r, g, b, al = x[..., 0], x[..., 1], x[..., 2], x[..., 3]
    semi = (al < 250)[..., None]
    x[..., 1] = np.where(semi[..., 0], np.minimum(g, (r + b) / 2), x[..., 1])
    lum = (0.30 * x[..., 0] + 0.59 * x[..., 1] + 0.11 * x[..., 2])[..., None]   # 模糊殘影是槍的金屬灰：半透明處去飽和 85%（殘綠去掉後會偏紫）
    x[..., :3] = np.where(semi, lum + (x[..., :3] - lum) * 0.15, x[..., :3])
    return Image.fromarray(x.clip(0, 255).astype(np.uint8))
def fig(p):
    f = despill(Image.open(p).convert('RGBA')); sc = K / s; big = f.resize((round(W * sc), round(H * sc)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K)), big)
    return dehue(c) if a.dehue else c
def dehue(c):
    # Wan 在速度模糊的槍上畫出的綠／紫色塊（不透明）：色相落在綠（70~170°）或紫（250~340°）且有彩度的，去飽和；
    # --keep 框（臉、發光紫眼）不碰。座標是 480×720 輸出畫布。
    x = np.asarray(c).astype(np.float32); hsv = cv2.cvtColor(x[..., :3].astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    h, sat = hsv[..., 0] * 2, hsv[..., 1] / 255
    bad = (((h > 70) & (h < 170)) | ((h > 250) & (h < 340))) & (sat > 0.10)
    x0, y0, x1, y1 = a.keep; bad[y0:y1, x0:x1] = False
    lum = (0.30 * x[..., 0] + 0.59 * x[..., 1] + 0.11 * x[..., 2])[..., None]
    x[..., :3] = np.where(bad[..., None], lum + (x[..., :3] - lum) * 0.12, x[..., :3])
    return Image.fromarray(x.clip(0, 255).astype(np.uint8))
fs = sorted(glob.glob(os.path.join(a.frames, 'frame_*.webp')))
total = max(a.total, len(fs)); seq = fs + [fs[-1]] * (total - len(fs))
rnd = random.Random(a.seed)
def mk(n, sp, r):
    return [dict(x=rnd.uniform(-W * .3, W), y=rnd.uniform(0, H * 1.3), sp=rnd.uniform(*sp), r=rnd.uniform(*r),
                 ph=rnd.uniform(0, 6.28), fl=rnd.uniform(0.25, 0.6), cu=rnd.uniform(-0.07, 0.07)) for _ in range(n)]
BG, FG = mk(a.bg, (6, 9), (0.9, 2.0)), mk(a.fg, (13, 18), (3.2, 5.2))
def layer(P, t, glow, blur):
    lay = np.zeros((H * 2, W * 2, 3), np.float32)
    for p in P:
        an = ANG + p['cu']; dx, dy = math.cos(an) * p['sp'], -math.sin(an) * p['sp']
        x = (p['x'] + dx * t) % (W * 1.3) - W * .15; y = (p['y'] + dy * t) % (H * 1.3) - H * .15
        k = 0.55 + 0.45 * math.sin(t * p['fl'] * 2 + p['ph']); c = (np.array([255, 105 + 45 * k, 25 * k]) * k).tolist()
        cv2.circle(lay, (int(x * 2), int(y * 2)), int(p['r'] * 2.2), c, -1, cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA)
    if blur: lay = cv2.GaussianBlur(lay, (0, 0), blur)
    return np.clip(lay + cv2.GaussianBlur(lay, (0, 0), 3.5) * glow, 0, 255)
for t, f in enumerate(seq):
    base = Image.fromarray(layer(BG, t, 2.2, 0).astype(np.uint8)).convert('RGBA'); base.alpha_composite(fig(f))
    out = np.asarray(base.convert('RGB')).astype(np.float32) + layer(FG, t, 2.4, 0.9)   # 前景火星是光，加上去
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([FF, '-loglevel', 'error', '-y', '-framerate', '16', '-i', os.path.join(OD, 'frame_%02d.webp'), '-c:v', 'libx264', '-profile:v', 'high',
                '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(len(fs), '格 +停', total - len(fs), '格 =', total, '→', OD + '.mp4')

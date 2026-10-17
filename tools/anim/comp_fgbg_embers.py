# 去背人物格 → 放回原畫布 → 純黑底＋「後景火星」＋人物＋「前景火星」→ 480×720 mp4（--fps，預設 16；停格版 24）
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
ap.add_argument('--ang', type=float, default=35); ap.add_argument('--dehue', action='store_true'); ap.add_argument('--keep', type=int, nargs=4, default=[150, 60, 330, 230]); ap.add_argument('--seed', type=int, default=5); ap.add_argument('--fps', type=float, default=16)
ap.add_argument('--bg-mode', default='dot', choices=['dot', 'streak'], help='streak＝後景也用線狀火花（較細、較暗、較慢＝景深）')
ap.add_argument('--fg-mode', default='dot', choices=['dot', 'streak'], help='streak＝前景改成「線狀飄散」的槍火火花（Ray：「槍火是線狀飄散」）')
ap.add_argument('--streak-dir', type=float, default=None, help='streak 大致方向（度，0＝右、正值往上，例 40＝右上）；給了就不再四散，只在 ±--streak-spread 內')
ap.add_argument('--streak-spread', type=float, default=10); ap.add_argument('--wiggle', type=float, default=0, help='氣流擾動：垂直於飛行方向的擺幅（px），線會彎成小 S')
ap.add_argument('--streak-gold', action='store_true', help='金色（不是白熱轉橙）')
ap.add_argument('--emit', type=float, nargs=4, default=[0.15, 0.35, 0.85, 0.85], help='streak 的發射區（0~1 比例 x0 y0 x1 y1）')
ap.add_argument('--native', action='store_true', help='原尺寸輸出（不縮成 480×720、不重新置中）：畫布＝對位圖尺寸，火星大小／速度依寬度等比放大（尼莫 BR 起用）')
ap.add_argument('--fg-size', type=float, default=1.0, help='前景火星大小倍數'); ap.add_argument('--fg-gain', type=float, default=1.0, help='前景火星亮度倍數'); ap.add_argument('--fg-speed', type=float, default=1.0, help='前景火星速度倍數')
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', a.name); os.makedirs(OD, exist_ok=True)
FF = r'C:\ffmpeg\bin\ffmpeg.exe'
W, H = 480, 720; ANG = math.radians(a.ang)
SPD = 16 / a.fps   # 火星速度以 16fps 校的；24fps（停格版）每格位移乘 16/24，秒速不變
src = Image.open(a.src).convert('RGBA'); CW = src.width; K = W / CW
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); bw, bh = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / bw, H * 0.92 / bh); ox, oy = (W - round(bw * s)) // 2, (H - round(bh * s)) // 2
U = 1.0   # 火星的 px 尺寸／速度倍數（以 480 寬校的）
if a.native: W, H = src.size; K = 1; bb, s, ox, oy = (0, 0, W, H), 1, 0, 0; U = W / 480
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
BG, FG = mk(a.bg, (6 * U, 9 * U), (0.9 * U, 2.0 * U)), mk(a.fg, (13 * a.fg_speed * U, 18 * a.fg_speed * U), (3.2 * a.fg_size * U, 5.2 * a.fg_size * U))
SR = random.Random(a.seed + 1)
_dir = a.streak_dir is not None
def make_streaks(n, size, spd, R):
    def ang():
        if not _dir: return R.uniform(0, 6.283)
        return -math.radians(a.streak_dir + R.uniform(-a.streak_spread, a.streak_spread))     # 畫面座標 y 向下，所以取負
    return [dict(ox=R.uniform(a.emit[0], a.emit[2]) * W, oy=R.uniform(a.emit[1], a.emit[3]) * H, ang=ang(),
                 sp=R.uniform(12, 20) * spd if _dir else R.uniform(14, 30) * spd,
                 life=R.uniform(6, 11) if _dir else R.uniform(6, 13), born=R.uniform(-26, 0),
                 ln=R.uniform(2.2, 4.0) * size / U, w=R.uniform(1.0, 2.2) * size,   # 線長＝速度×ln，速度已含 U，ln 要除回去
                 grav=0.0 if _dir else R.uniform(0.2, 0.9) * U, wf=R.uniform(0.5, 0.9), wp=R.uniform(0, 6.283), wa=R.uniform(0.6, 1.0)) for _ in range(n)]
STREAKS = make_streaks(a.fg, a.fg_size * U, a.fg_speed * U, SR)                                          # ⚠ 前景沿用原本的亂數序列（Ray 已看過的那一版不變）
BGSTREAKS = make_streaks(a.bg, a.fg_size * 0.6 * U, a.fg_speed * 0.6 * U, random.Random(a.seed + 2))    # 後景：細、慢（景深）
def streak_layer(t, glow, S, gain):
    lay = np.zeros((H * 2, W * 2, 3), np.float32); tt = t * SPD
    for s in S:
        age = (tt - s['born']) % s['life']; f = age / s['life']
        vx, vy = math.cos(s['ang']) * s['sp'], math.sin(s['ang']) * s['sp'] + s['grav'] * age * 2
        if a.streak_gold: k = min(1, f * 6) * (1 - f) ** 1.6; c = (np.array([255, 205, 95]) * k * 1.6).tolist()   # 金色：一出現就亮、之後很快散掉
        else: k = (1 - f) ** 1.5; c = (np.array([255, 190 + 50 * k, 90 + 120 * k]) * k).tolist()       # 白熱→橙
        if a.wiggle:                                                                               # 小 S：沿路徑擺動，畫成一段彎曲的尾跡
            ca, sa = math.cos(s['ang']), math.sin(s['ang'])
            def P(ag):
                d = s['sp'] * ag; off = a.wiggle * U * s['wa'] * math.sin(ag * s['wf'] + s['wp'])
                return (s['ox'] + ca * d - sa * off, s['oy'] + sa * d + ca * off)
            tail = s['ln'] * 0.35 * ((1 - f) if a.streak_gold else 1)
            pts = np.array([P(age - tail * j / 6) for j in range(7)], np.float32) * 2
            cv2.polylines(lay, [pts.astype(np.int32).reshape(-1, 1, 2)], False, c, max(1, int(s['w'] * 2)), cv2.LINE_AA)
            continue
        x = s['ox'] + math.cos(s['ang']) * s['sp'] * age; y = s['oy'] + math.sin(s['ang']) * s['sp'] * age + s['grav'] * age * age
        sh = (1 - f) if a.streak_gold else 1
        x2, y2 = x - vx * s['ln'] * 0.35 * sh, y - vy * s['ln'] * 0.35 * sh
        cv2.line(lay, (int(x * 2), int(y * 2)), (int(x2 * 2), int(y2 * 2)), c, max(1, int(s['w'] * 2)), cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA)
    return np.clip(lay * gain + cv2.GaussianBlur(lay, (0, 0), 2.5) * glow, 0, 255)
def layer(P, t, glow, blur):
    lay = np.zeros((H * 2, W * 2, 3), np.float32)
    for p in P:
        an = ANG + p['cu']; dx, dy = math.cos(an) * p['sp'] * SPD, -math.sin(an) * p['sp'] * SPD
        x = (p['x'] + dx * t) % (W * 1.3) - W * .15; y = (p['y'] + dy * t) % (H * 1.3) - H * .15
        k = 0.55 + 0.45 * math.sin(t * SPD * p['fl'] * 2 + p['ph']); c = (np.array([255, 105 + 45 * k, 25 * k]) * k).tolist()
        cv2.circle(lay, (int(x * 2), int(y * 2)), int(p['r'] * 2.2), c, -1, cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA)
    if blur: lay = cv2.GaussianBlur(lay, (0, 0), blur)
    return np.clip(lay + cv2.GaussianBlur(lay, (0, 0), 3.5) * glow, 0, 255)
for t, f in enumerate(seq):
    bgl = streak_layer(t, 1.0, BGSTREAKS, 0.55) if a.bg_mode == 'streak' else layer(BG, t, 2.2, 0)
    base = Image.fromarray(bgl.astype(np.uint8)).convert('RGBA'); base.alpha_composite(fig(f))
    out = np.asarray(base.convert('RGB')).astype(np.float32) + (streak_layer(t, 1.6 * a.fg_gain, STREAKS, a.fg_gain) if a.fg_mode == 'streak' else layer(FG, t, 2.4 * a.fg_gain, 0.9) * a.fg_gain)   # 前景火星是光，加上去
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([FF, '-loglevel', 'error', '-y', '-framerate', f'{a.fps:g}', '-i', os.path.join(OD, 'frame_%02d.webp'), '-c:v', 'libx264', '-profile:v', 'high',
                '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(len(fs), '格 +停', total - len(fs), '格 =', total, '→', OD + '.mp4')

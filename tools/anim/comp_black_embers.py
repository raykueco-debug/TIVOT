# 去背人物格（idle 綠幕模式的輸出）→ 放回原畫布位置 → 疊在「純黑＋斜飛火星」上 → 480×720 16fps mp4
# 用法：python comp_black_embers.py <人物格資料夾> <起手原圖(決定畫布對位)> <輸出名> [火星數] [角度]
import glob, math, os, random, subprocess, sys
import numpy as np, cv2
from PIL import Image
FR, SRC, NAME = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 110; ANG = math.radians(float(sys.argv[5]) if len(sys.argv) > 5 else 35)
HERE = os.path.dirname(os.path.abspath(__file__)); OD = os.path.join(HERE, 'out', 'ci', NAME); os.makedirs(OD, exist_ok=True)
W, H = 480, 720
src = Image.open(SRC).convert('RGBA'); CW = src.width; K = W / CW
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); bw, bh = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / bw, H * 0.92 / bh); ox, oy = (W - round(bw * s)) // 2, (H - round(bh * s)) // 2
def fig(p):
    f = Image.open(p).convert('RGBA'); sc = K / s; big = f.resize((round(W * sc), round(H * sc)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K)), big); return c
fs = sorted(glob.glob(os.path.join(FR, 'frame_*.webp'))); rnd = random.Random(5)
P = [dict(x=rnd.uniform(-W * .3, W), y=rnd.uniform(0, H * 1.3), sp=rnd.uniform(6, 9), r=rnd.uniform(0.9, 2.0),
          ph=rnd.uniform(0, 6.28), fl=rnd.uniform(0.25, 0.6), cu=rnd.uniform(-0.07, 0.07)) for _ in range(N)]
for t, f in enumerate(fs):
    lay = np.zeros((H * 2, W * 2, 3), np.float32)
    for p in P:
        a_ = ANG + p['cu']; dx, dy = math.cos(a_) * p['sp'], -math.sin(a_) * p['sp']
        x = (p['x'] + dx * t) % (W * 1.3) - W * .15; y = (p['y'] + dy * t) % (H * 1.3) - H * .15
        a = 0.55 + 0.45 * math.sin(t * p['fl'] * 2 + p['ph']); c = (np.array([255, 105 + 45 * a, 25 * a]) * a).tolist()
        cv2.circle(lay, (int(x * 2), int(y * 2)), int(p['r'] * 2.2), c, -1, cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA); bg = np.clip(lay + cv2.GaussianBlur(lay, (0, 0), 3.5) * 2.2, 0, 255)
    base = Image.fromarray(bg.astype(np.uint8)).convert('RGBA'); base.alpha_composite(fig(f))
    base.convert('RGB').save(os.path.join(OD, f'frame_{t:02d}.webp'), 'WEBP', quality=92)
subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', '16', '-i', os.path.join(OD, 'frame_%02d.webp'), '-c:v', 'libx264', '-profile:v', 'high',
                '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', OD + '.mp4'])
print(len(fs), 'frames →', OD + '.mp4')

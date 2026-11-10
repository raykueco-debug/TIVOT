"""背景線：程式雲海「湧出來」原型（Ray 11-10：「讓程式跑自然不間斷的雲湧出來」）。
不靠 Wan、不靠來回 —— 雲海由程式即時排出來：
  ① 雲團素材＝天空組中層／近層（GPT 手繪、已去背）裡的一團團積雲，切成精靈圖 —— 畫風與天空一致。
  ② 每一團從雲海底下持續冒上來：邊升邊放大、往右飄；升到雲海上緣就縮小沉回去，底下再冒新的
     （重生點在畫面外）。每一團永遠只往前走，不可能倒回。
  ③ 越上面（越遠）的雲團越小、越淡藍（空氣遠近），越前面越大、越白。
後面的天空照舊是 sky_parallax 那三層往右捲；前景是 GPT 挖空的那張 alpha 圖。
這支是原型（出預覽影片給 Ray 看）；進遊戲時由程式端照同一套排法寫成 canvas。
用法：python cloud_churn.py <前景 alpha png> <天空組前綴> <輸出 mp4> [秒數 12] [雲海上緣 0.40] [fps 16]"""
import sys, subprocess
import numpy as np, cv2
from PIL import Image

fg_p, sky_p, out_p = sys.argv[1:4]
T = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
TOP = float(sys.argv[5]) if len(sys.argv) > 5 else 0.40
FPS = int(sys.argv[6]) if len(sys.argv) > 6 else 16
W, H = 1536, 1024
rng = np.random.default_rng(11)

fg = np.array(Image.open(fg_p).convert('RGBA').resize((W, H), Image.LANCZOS)).astype(np.float32)
SKY = [np.array(Image.open(f'{sky_p}{n}.webp').convert('RGBA').resize((W, H), Image.LANCZOS)).astype(np.float32) for n in ('l0_far', 'l1_mid', 'l2_near')]
SKY_SEC = [160, 70, 32]

# ① 從中層／近層切雲團精靈
SPR = []
for lay in SKY[1:]:
    a = (lay[..., 3] > 40).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(a, np.ones((5, 5), np.uint8)))
    for i in range(1, n):
        x, y, ww, hh, ar = st[i]
        if ar < 6000 or ww > W * 0.6: continue
        crop = lay[y:y + hh, x:x + ww].copy(); crop[..., 3] *= (lab[y:y + hh, x:x + ww] == i)
        SPR.append(crop)
print('sprites', len(SPR))

top_y = TOP * H
N = 70; LIFE = 30.0
ph = (np.arange(N) + rng.random(N) * 0.8) / N        # 生命週期錯開、平均分布
bx = rng.random(N)
sid = rng.integers(0, len(SPR), N)
smax = rng.uniform(0.55, 1.0, N)                      # 最大縮放
drift = rng.uniform(6, 14, N)                         # 往右飄（像素/秒）
flip = rng.random(N) < 0.5
HAZE = np.array([196, 214, 236], np.float32)


def blit(img, spr, cx, by, sc, fl, haze):
    """把雲團貼上去：cx＝中心 x，by＝底緣 y。"""
    s = spr[:, ::-1] if fl else spr
    hh, ww = int(s.shape[0] * sc), int(s.shape[1] * sc)
    if hh < 4 or ww < 4: return
    s = cv2.resize(s, (ww, hh), interpolation=cv2.INTER_AREA)
    x0, y0 = int(cx - ww / 2), int(by - hh)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + ww), min(H, y0 + hh)
    if xa >= xb or ya >= yb: return
    sp = s[ya - y0:yb - y0, xa - x0:xb - x0]
    rgb = sp[..., :3] * (1 - haze) + HAZE * haze; a = sp[..., 3:] / 255
    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - a) + rgb * a


p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out_p], stdin=subprocess.PIPE)
for fi in range(int(T * FPS)):
    t = fi / FPS
    img = None
    for lay, s in zip(SKY, SKY_SEC):
        sh = np.roll(lay, int(round((t / s * W) % W)), axis=1)
        if img is None: img = sh[..., :3].copy()
        else: a = sh[..., 3:] / 255; img = img * (1 - a) + sh[..., :3] * a
    u = (t / LIFE + ph) % 1.0; k = np.floor(t / LIFE + ph)
    bottom = H + 260 - u * (H + 260 - top_y - 40)                 # 底緣一路往上
    grow = np.clip(u / 0.6, 0, 1); sink = np.clip((1 - u) / 0.3, 0, 1)
    sc = smax * (0.45 + 0.55 * grow) * (0.25 + 0.75 * sink)       # 升起長大、到頂縮回
    cx = ((bx + k * 0.618) % 1.0) * (W + 400) - 200 + drift * u * LIFE
    depth = 1 - (bottom - top_y) / (H - top_y)                    # 越上面越遠
    order = np.argsort(bottom)                                     # 上面（遠）的先畫，前面的蓋上去
    for i in order:
        blit(img, SPR[sid[i]], cx[i], bottom[i], sc[i] * (0.7 + 0.5 * (1 - np.clip(depth[i], 0, 1))), flip[i], 0.35 * np.clip(depth[i], 0, 1))
    a = fg[..., 3:] / 255; img = img * (1 - a) + fg[..., :3] * a
    p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
    if fi in (0, int(T * FPS) // 2): Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out_p.replace('.mp4', f'_f{fi}.jpg'))
p.stdin.close(); p.wait(); print('ok', out_p)

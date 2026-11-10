"""背景線：雲與草分開跑（Ray 11-11：「有雲的地方給 GPT 挖天空，你再鋪回對應天空底色，讓程式跑雲；
草就分開跑，讓 GPT 生一個與原圖差不多、草與影子微微有變化的圖，跑 ABA 鎖」）。
由後往前：天空底色（原圖天空色的漸層）→ 最遠方雲（程式）→ 遠景層（GPT 拆層，靜止）→ 遠／中景雲（程式）
          → 近雲（程式）→ 近景層（草 ABA：Wan FLF A→B、B→A，頭尾都是原圖 A）。
雲塊＝GPT 九宮格（近／中／遠三組）切出來的，動態（湧上、變形、沉回）全由程式（cloud_sprites.py）。
用法：python cloud_sep_comp.py <輸出 mp4> [秒數 16] [fps 16]"""
import sys, glob, os, subprocess
import numpy as np, cv2
from PIL import Image
import cloud_sprites as CS

out_p = sys.argv[1]
T = float(sys.argv[2]) if len(sys.argv) > 2 else 16.0
FPS = int(sys.argv[3]) if len(sys.argv) > 3 else 16
W, H = CS.W, CS.H
DL = r'C:/Users/Ray Ku/Downloads/'
OUTD = r'C:/Users/Ray Ku/Desktop/ComfyUI-master/output/bgl/'
ORIG = r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background/forest/forest_cliff_day.webp'


def layer(p):
    rgb, al = CS.key_magenta(np.array(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)))
    al = cv2.erode(al, np.ones((3, 3), np.uint8))
    return rgb, al


near_rgb, an = layer(DL + 'cliff_near_magenta.png')          # A 的 alpha（草 ABA 每一格都套它）
far_rgb, af = layer(DL + 'cliff_far_magenta.png')
orig = np.array(Image.open(ORIG).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
top_c = np.median(orig[:30, 600:1000].reshape(-1, 3), 0); hor_c = np.median(orig[330:360, 1200:1500].reshape(-1, 3), 0)
g = np.clip(np.linspace(0, 1, H) / 0.42, 0, 1)[:, None, None]
sky = np.broadcast_to(top_c * (1 - g) + hor_c * g, (H, W, 3)).astype(np.float32)

# 樹與草：VACE 循環（頭尾鎖原圖 A）
fr = sorted(glob.glob(OUTD + 'cliffgrass_vloop_*.png'))[5:46]   # Ray 11-11「樹用 VACE 跑 loop」：bg_vace_loop 頭尾鎖 A；整格取捨 5~45（接縫 2.0，段內最大一步 2.85）
GR = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) for f in fr]
# 接縫交叉模糊過渡（Ray 11-11：「頭尾接不好就頭尾逐幀找差異最小的，交叉模糊過渡看看」）：
# 循環的最後 XF 格，逐步換成「開頭之前那 XF 格」（第 1~4 格），權重 0→1；過渡中段加一點模糊把接點抹平。
XF = 4
pre = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
       for f in sorted(glob.glob(OUTD + 'cliffgrass_vloop_*.png'))[5 - XF:5]]
for k in range(XF):
    w = (k + 1) / (XF + 1); j = len(GR) - XF + k
    mix = GR[j] * (1 - w) + pre[k] * w
    sig = 1.2 * np.sin(np.pi * w)
    GR[j] = cv2.GaussianBlur(mix, (0, 0), sig) if sig > 0.3 else mix
# 原圖解析度的 A：放大的 Wan 格只取「跟 A 差多少」加回 A，靜止處保留原解析度
A0 = np.mean(GR, 0)   # 只疊「每一格偏離整段平均」的動態 ⇒ 靜止處保留原圖清晰度與色調
print('grass frames', len(GR))

S_far, S_mid, S_near = (CS.cut_grid(DL + f'cloudgrid_{n}.png') for n in ('far', 'mid', 'near'))
fogc = lambda k: tuple(np.array((226, 233, 244), np.float32) * (1 - k) + hor_c * k)
BACK = [CS.Layer(S_far, 2, 300, 70, 44, 90, 200, 60, 4, haze_col=hor_c, haze=0.25, fog_col=fogc(0.6))]
MID = [CS.Layer(S_mid, 3, 410, 150, 44, 140, 280, 48, 6, haze_col=hor_c, haze=0.15, fog_col=fogc(0.35)),
       CS.Layer(S_mid, 4, 470, 120, 30, 200, 360, 40, 8, haze_col=hor_c, haze=0.05, fog_col=fogc(0.2))]
FRONT = [CS.Layer(S_near, 5, 600, 380, 40, 380, 640, 36, 10, fog_col=fogc(0.0))]

p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out_p], stdin=subprocess.PIPE)
for fi in range(int(T * FPS)):
    t = 20 + fi / FPS
    img = sky.copy()
    for L in BACK:
        c, a = L.render(t); img = img * (1 - a[..., None]) + c * a[..., None]
    img = img * (1 - af[..., None]) + far_rgb * af[..., None]
    for L in MID + FRONT:
        c, a = L.render(t); img = img * (1 - a[..., None]) + c * a[..., None]
    nr = near_rgb + (GR[fi % len(GR)] - A0)                   # 原解析度 A ＋ Wan 的變化量
    img = img * (1 - an[..., None]) + nr * an[..., None]
    p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
    if fi in (0, 8): Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out_p.replace('.mp4', f'_f{fi}.jpg'))
p.stdin.close(); p.wait(); print('ok', out_p)

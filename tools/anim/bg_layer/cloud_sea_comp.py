"""背景線：雲海夾層合成（Ray 11-10：「雲海有層次，在近景的崖之下、在遠景的山之上」）。
由後往前：天空（原圖天空色的漸層）→ 遠景層（石柱／城堡／遠山，GPT 拆層）→ 遠雲海（程式，包住山腳）
          → 近雲海（程式，在崖下）→ 近景層（懸崖／小徑／樹，GPT 拆層）。
GPT 交回的兩層是畫在純洋紅底上的，這裡用「洋紅程度」鍵成 alpha 並去洋紅溢色。
用法：python cloud_sea_comp.py <原圖> <近景洋紅圖> <遠景洋紅圖> <輸出 mp4> [秒數 16] [fps 16]"""
import sys, subprocess
import numpy as np, cv2
from PIL import Image
import cloud_proc as C

orig_p, near_p, far_p, out_p = sys.argv[1:5]
T = float(sys.argv[5]) if len(sys.argv) > 5 else 16.0
FPS = int(sys.argv[6]) if len(sys.argv) > 6 else 16
W, H = C.W, C.H


def key(p):
    a = np.array(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    mag = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]                  # 洋紅程度
    al = np.clip((150 - mag) / 70, 0, 1)                                # 160 以上全透明、80 以下全實
    al = cv2.erode(al, np.ones((3, 3), np.uint8)); al = cv2.GaussianBlur(al, (0, 0), 0.7)
    sp = np.clip(mag, 0, None)[..., None] * 0.5 * (al[..., None] < 1)   # 邊緣去洋紅
    rgb = a.copy(); rgb[..., 0:1] -= sp; rgb[..., 2:3] -= sp
    return rgb.clip(0, 255), al


near, an = key(near_p); far, af = key(far_p)
orig = np.array(Image.open(orig_p).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
# 天空：原圖最上緣與地平線附近的顏色做縱向漸層
top_c = np.median(orig[:30, 600:1000].reshape(-1, 3), 0); hor_c = np.median(orig[330:360, 1200:1500].reshape(-1, 3), 0)
g = np.clip(np.linspace(0, 1, H) / 0.42, 0, 1)[:, None, None]
sky = np.broadcast_to(top_c * (1 - g) + hor_c * g, (H, W, 3)).astype(np.float32)

FAR = C.Layer(3, 410, 140, 150, 14, 34, 46, 5, (232, 240, 250), (205, 218, 237), (178, 195, 222), (158, 176, 210))
NEAR = C.Layer(5, 580, 380, 90, 55, 125, 36, 9, (250, 252, 255), (216, 228, 244), (180, 197, 224), (146, 166, 204))

p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out_p], stdin=subprocess.PIPE)
for fi in range(int(T * FPS)):
    t = 20 + fi / FPS                                                    # 從第 20 秒開始（雲已經湧滿）
    img = sky.copy()
    img = img * (1 - af[..., None]) + far * af[..., None]
    for L in (FAR, NEAR):
        c, a = L.render(t); img = img * (1 - a[..., None]) + c * a[..., None]
    img = img * (1 - an[..., None]) + near * an[..., None]
    p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
    if fi in (0, int(T * FPS) // 2): Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out_p.replace('.mp4', f'_f{fi}.jpg'))
p.stdin.close(); p.wait(); print('ok', out_p)

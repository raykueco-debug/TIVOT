# 索拉娜吼叫 CI：火（Wan，整張）＋ Q 版（程式滑入彈跳）＋ 索拉娜（Wan idle，綠底去背）→ 480×720 16fps mp4
# 用法：python compose_roar.py <索拉娜格資料夾> <輸出名尾碼>
import glob, os, subprocess, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out', 'ci')
T = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\ci'
SOR_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'sorana_roar_s7'); TAG = sys.argv[2] if len(sys.argv) > 2 else 's7'
W, H, CW, CH = 480, 720, 1024, 1536; K = W / CW
FIRE = sorted(glob.glob(os.path.join(OUT, 'bg_fire_s7', 'frame_*.webp')))
SOR = sorted(glob.glob(os.path.join(SOR_DIR, 'frame_*.webp')))
N = min(len(FIRE), len(SOR))
# 索拉娜 idle 格 → 原圖畫布（idle：裁 bbox、fit 0.92、置中）→ 再縮到 480
src = Image.open(os.path.join(T, 'layers', 'sorana_roar', 'sorana.png')).convert('RGBA')
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); w, h = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / w, H * 0.92 / h); ox, oy = (W - round(w * s)) // 2, (H - round(h * s)) // 2
def sor_frame(p):
    f = Image.open(p).convert('RGBA'); sc = K / s          # 動畫格 → 480 畫面的倍率
    big = f.resize((round(W * sc), round(H * sc)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K))) if False else \
        c.paste(big, (round((bb[0] - ox / s) * K), round((bb[1] - oy / s) * K)), big)
    return c
# Q 版：最終位置（原圖 Q 版安雅：右上，約 x 640～1024、y 240～800）—— 高 560、中心 x 860、上緣 y 240（原圖座標）
def chibi_track(i):
    # 0～4：從右邊畫面外滑入（ease-out）；5：往上彈；6：落回；7～10：左右抖；之後停
    fx, fy = 860, 240
    if i <= 4: t = i / 4; x = 1024 + 320 - (1024 + 320 - fx) * (1 - (1 - t) ** 3); return x, fy
    if i == 5: return fx, fy - 40
    if i == 6: return fx, fy + 8
    if 7 <= i <= 10: return fx + (10 if i % 2 else -10), fy
    return fx, fy
def run(chibi_file, name):
    ch = Image.open(os.path.join(T, chibi_file)).convert('RGBA'); ch = ch.crop(ch.getchannel('A').getbbox())
    hh = round(560 * K); ww = round(ch.width * hh / ch.height); ch = ch.resize((ww, hh), Image.LANCZOS)
    od = os.path.join(OUT, f'roar_{name}_{TAG}'); os.makedirs(od, exist_ok=True)
    for i in range(N):
        fr = Image.open(FIRE[i]).convert('RGBA').resize((W, H), Image.LANCZOS)
        cx, ty = chibi_track(i); fr.alpha_composite(ch, (round(cx * K - ww / 2), round(ty * K))) if 0 <= round(cx * K - ww / 2) < W and False else \
            fr.paste(ch, (round(cx * K - ww / 2), round(ty * K)), ch)
        fr.alpha_composite(sor_frame(SOR[i]))
        fr.convert('RGB').save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', quality=90)
    mp4 = os.path.join(OUT, f'roar_{name}_{TAG}.mp4')
    subprocess.run([r'C:\ffmpeg\bin\ffmpeg.exe', '-loglevel', 'error', '-y', '-framerate', '16', '-i', os.path.join(od, 'frame_%02d.webp'),
                    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4])
    print(name, N, 'frames →', mp4)
for f, n in (('ci_anya_scared.webp', 'anya'), ('ci_nouvelle_scared.webp', 'nouvelle'), ('ci_renna_scared.webp', 'renna')):
    run(f, n)

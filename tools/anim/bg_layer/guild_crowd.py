"""背景線（11-21）：賞金獵人公會戰鬥背景（正方形 1254）的觀眾吆喝。
Ray：「可以 跑WAN」「背景LOOP要短」。段法照 sorana_sail（F 系列）：
  A→B I2V 取前 K+1 格 → B→A 首尾幀 SEG 格（回到原圖）；Wan 在 640×640 跑。
合成：只有觀眾的範圍（crowd_mask.png，白＝觀眾）取 Wan 的動作（光流推原圖，保留原圖線稿），其餘一律原圖。
輸出：out/guild_hunter_crowd/loop.mp4（整張 1254，16fps）＋ f06.jpg 預覽。
用法：python guild_crowd.py   環境變數 CROWD_K（預設 12）、CROWD_SEG（17）、CROWD_SEED（101）"""
import os, sys, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bg_queue as Q
ORIG = r'C:/Users/User/Desktop/TIVOT/resources/_originals/enemy/guild_hunter_battle_bg.png'
OUT = os.path.join(HERE, 'out', 'guild_hunter_crowd'); os.makedirs(OUT, exist_ok=True)
MASK = os.path.join(OUT, 'crowd_mask.png')
K = int(os.environ.get('CROWD_K', 12)); SEG = int(os.environ.get('CROWD_SEG', 17)); SD = os.environ.get('CROWD_SEED', '101')
P = ('動漫風格的酒館背景。兩側的賞金獵人觀眾在吆喝、揮拳、舉杯、大笑，身體輕微晃動。'
     '鏡頭固定，桌椅、牆、吊燈、地板保持原樣。動漫風格，賽璐珞上色。')
ENV = dict(Q.ENV, BG_W='640', BG_H='640')
ab, ba = f'bgl/guild_crowd_s{SD}_ab', f'bgl/guild_crowd_s{SD}_ba{SEG}'
inp = 'bgsep_guild_crowd.png'

# 觀眾範圍（1254 座標）：二樓左一人、二樓右兩人、一樓左三人、一樓右三人
BOXES = [(340, 140, 495, 258), (785, 155, 995, 258), (0, 545, 360, 1050), (990, 525, 1254, 1045)]
if not os.path.exists(MASK):
    m = Image.new('L', (1254, 1254), 0); d = ImageDraw.Draw(m)
    for b in BOXES: d.rectangle(b, fill=255)
    m.save(MASK)


def run(a):
    r = subprocess.run(a, cwd=HERE, env=ENV, capture_output=True, text=True, encoding='utf8')
    print((r.stdout or '')[-300:], (r.stderr or '')[-600:]); return r.returncode == 0


o = np.array(Image.open(ORIG).convert('RGB'))
Hh, Ww = o.shape[:2]
Image.fromarray(o).resize((640, 640), Image.LANCZOS).save(os.path.join(Q.COMFY, 'input', inp))
if len(Q.wan_out(ab)) < 81 and not run([Q.PY, 'bg_wan.py', inp, ab, '81', P, SD]): sys.exit('ab 失敗')
B = f'bgsep_guild_crowd_B{SD}_{K}.png'
Image.open(Q.wan_out(ab)[K]).convert('RGB').save(os.path.join(Q.COMFY, 'input', B))
if len(Q.wan_out(ba)) < SEG and not run([Q.PY, 'bg_flf.py', B, inp, ba, str(SEG), P, SD]): sys.exit('ba 失敗')

seq = Q.wan_out(ab)[:K + 1] + Q.wan_out(ba)[1:-1]   # ba 最後一格＝原圖（＝第 0 格），不重複
m = (np.array(Image.open(MASK).convert('L')) > 127).astype(np.float32)
a = cv2.GaussianBlur(m, (0, 0), 6.0)[..., None]
G0 = cv2.cvtColor(np.array(Image.open(seq[0]).convert('RGB')), cv2.COLOR_RGB2GRAY)
DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
YY, XX = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
of = o.astype(np.float32)
outp = os.path.join(OUT, 'loop.mp4')
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{Ww}x{Hh}', '-r', '16', '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', outp], stdin=subprocess.PIPE)
for i, f in enumerate(seq):
    g = cv2.cvtColor(np.array(Image.open(f).convert('RGB')), cv2.COLOR_RGB2GRAY)
    fl = DIS.calc(g, G0, None)
    fl = cv2.resize(fl, (Ww, Hh), interpolation=cv2.INTER_LINEAR) * (Ww / 640.0)
    w = cv2.remap(of, XX + fl[..., 0], YY + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    fr = (of * (1 - a) + w * a).clip(0, 255).astype(np.uint8)
    p.stdin.write(fr.tobytes())
    if i == 6: Image.fromarray(fr).save(os.path.join(OUT, 'f06.jpg'), quality=90)
p.stdin.close(); p.wait()
print('done', outp, len(seq), 'frames')

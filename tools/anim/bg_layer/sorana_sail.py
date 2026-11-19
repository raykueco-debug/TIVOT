"""背景線（11-20）：索菈娜戰鬥背景（湖上甲板，正方形 1254）的帆微動。
Ray：「帆要微動」。sep_run 寫死 1536×1024 橫圖，這張是正方形，所以另開這支，段法照 F 系列：
  A→B I2V 81 格取前 K 格 → B→A 首尾幀 33 格（回到原圖）；Wan 在 640×640 跑。
合成：只有帆的範圍（sail_mask.png，白＝帆）取 Wan 的像素，其餘一律原圖（天空／水交給遊戲程式層）。
輸出：out/sorana_battle_bg_v3_sail/loop.mp4（整張 1254，16fps）＋ f12.jpg 預覽。
用法：python sorana_sail.py [--recomp]   環境變數 SAIL_K（預設 23）、SAIL_SEED（101）"""
import os, sys, subprocess, glob
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bg_queue as Q
ORIG = r'C:/Users/Ray Ku/Desktop/TIVOT/resources/_originals/enemy/sorana_kf/sorana_battle_bg3_lake.png'
OUT = os.path.join(HERE, 'out', 'sorana_battle_bg_v3_sail'); os.makedirs(OUT, exist_ok=True)
MASK = os.path.join(OUT, 'sail_mask.png')
K = int(os.environ.get('SAIL_K', 23)); SD = os.environ.get('SAIL_SEED', '101')
P = ('動漫風格的背景。船帆被微風吹拂，帆布輕輕鼓起又鬆開，微微起伏擺動。'
     '鏡頭完全固定不動，桅杆、繩索、甲板、欄杆、木桶、山與湖面都完全不動。動漫風格，賽璐珞上色。')
ENV = dict(Q.ENV, BG_W='640', BG_H='640')
ab, ba = f'bgl/sorana_sail_s{SD}_ab', f'bgl/sorana_sail_s{SD}_ba'
inp = 'bgsep_sorana_sail.png'


def run(a):
    r = subprocess.run(a, cwd=HERE, env=ENV, capture_output=True, text=True, encoding='utf8')
    print((r.stdout or '')[-300:], (r.stderr or '')[-600:]); return r.returncode == 0


o = np.array(Image.open(ORIG).convert('RGB'))
Hh, Ww = o.shape[:2]
Image.fromarray(o).resize((640, 640), Image.LANCZOS).save(os.path.join(Q.COMFY, 'input', inp))
if len(Q.wan_out(ab)) < 81 and not run([Q.PY, 'bg_wan.py', inp, ab, '81', P, SD]): sys.exit('ab 失敗')
B = f'bgsep_sorana_sail_B{SD}.png'
Image.open(Q.wan_out(ab)[K]).convert('RGB').save(os.path.join(Q.COMFY, 'input', B))
if len(Q.wan_out(ba)) < 33 and not run([Q.PY, 'bg_flf.py', B, inp, ba, '33', P, SD]): sys.exit('ba 失敗')

seq = Q.wan_out(ab)[:K + 1] + Q.wan_out(ba)[1:-1]   # ba 最後一格＝原圖（＝第 0 格），不重複
m = (np.array(Image.open(MASK).convert('L')) > 127).astype(np.uint8)
m = cv2.erode(m, np.ones((5, 5), np.uint8))           # 只在帆內取 Wan：帆邊往外鼓出去的部分會被遊戲的天空遮罩挖掉，不如不取
a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0)[..., None]
G0 = cv2.cvtColor(np.array(Image.open(seq[0]).convert('RGB')), cv2.COLOR_RGB2GRAY)
DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
YY, XX = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
of = o.astype(np.float32)
outp = os.path.join(OUT, 'loop.mp4')
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{Ww}x{Hh}', '-r', '16', '-i', '-',
                      '-vf', 'scale=1254:1254', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', outp], stdin=subprocess.PIPE)
for i, f in enumerate(seq):
    # 動作來自 Wan：第 0 格 → 這一格的光流（640 上算），放大後拿去推原圖 ⇒ 保留原圖線稿，640 的糊不帶進來
    g = cv2.cvtColor(np.array(Image.open(f).convert('RGB')), cv2.COLOR_RGB2GRAY)
    fl = DIS.calc(g, G0, None)                           # 這一格每個像素在第 0 格的位置（backward）
    fl = cv2.resize(fl, (Ww, Hh), interpolation=cv2.INTER_LINEAR) * (Ww / 640.0)
    w = cv2.remap(of, XX + fl[..., 0], YY + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    img = of * (1 - a) + w * a
    fr = img.clip(0, 255).astype(np.uint8)
    p.stdin.write(fr.tobytes())
    if i == 12: Image.fromarray(fr).save(os.path.join(OUT, 'f12.jpg'), quality=90)
p.stdin.close(); p.wait()
print('done', outp, len(seq), 'frames')

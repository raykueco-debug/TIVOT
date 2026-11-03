"""地底終點：安雅抱膝漂浮的剪影 loop → 圖集（ver -2383）。

來源＝animechk 剪好的那一支（Ray 11-03：「anya_curlfloat_calmb_cut 用這個」），
export.json 帶 kept_index（取哪幾格）、holds（每格停幾個 1/fps）、fps。

做三件事：
  1. 只取 kept_index 那幾張原格（export 資料夾是照 holds 展開過的，重複格不必再存）
  2. 裁成所有格的共同外框，長邊縮到 CELL，RGB 一律烘成剪影色（只留 alpha）—— 畫面上它就是一個小黑影
  3. 拼成 COLS 欄的圖集 → flight/cave/cave_anya.webp，並把 CAVE_ANYA_ART 寫回 flight/index.html

用法：python flight/build_cave_anya.py [來源資料夾]
"""
import glob, hashlib, io, json, os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out\anya\anya_curlfloat_calmb'
EXPORT = r'C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out\export\anya_curlfloat_calmb_cut\export.json'
CELL = 240            # 長邊像素（畫面上最大也只有光芯那麼大）
COLS = 6
SIL = (24, 14, 8)     # 剪影色 ＝ 舊 drawAnyaSil 的 fillStyle

ex = json.load(open(EXPORT, encoding='utf-8'))
src_frames = sorted(glob.glob(os.path.join(SRC, 'frame_*.webp')))
frames = [Image.open(src_frames[i]).convert('RGBA') for i in ex['kept_index']]
box = None
for im in frames:
    b = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
bw, bh = box[2] - box[0], box[3] - box[1]
k = CELL / max(bw, bh)
cw, ch = round(bw * k), round(bh * k)
rows = (len(frames) + COLS - 1) // COLS
atlas = Image.new('RGBA', (cw * COLS, ch * rows), (0, 0, 0, 0))
for n, im in enumerate(frames):
    a = im.crop(box).resize((cw, ch), Image.LANCZOS).getchannel('A')
    cell = Image.new('RGBA', (cw, ch), SIL + (0,)); cell.putalpha(a)
    atlas.paste(cell, ((n % COLS) * cw, (n // COLS) * ch))
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=90, method=6)
out = os.path.join(HERE, 'cave', 'cave_anya.webp')
open(out, 'wb').write(buf.getvalue())
v = hashlib.md5(buf.getvalue()).hexdigest()[:8]
art = {'v': v, 'n': len(frames), 'cols': COLS, 'cw': cw, 'ch': ch, 'fps': ex['fps'], 'holds': ex['holds']}
line = 'const CAVE_ANYA_ART = %s;   // build_cave_anya.py 寫回（圖集 cave/cave_anya.webp：n 格、cols 欄、每格 cw×ch；holds＝每格停幾個 1/fps）' % json.dumps(art, separators=(',', ':'))
idx = os.path.join(HERE, 'index.html')
s = open(idx, encoding='utf-8', newline='').read()
s, cnt = re.subn(r'^const CAVE_ANYA_ART = [^\n]*$', lambda m: line, s, count=1, flags=re.M)
if not cnt: sys.exit('index.html 裡找不到 const CAVE_ANYA_ART 那一行')
open(idx, 'w', encoding='utf-8', newline='').write(s)
print('cave_anya.webp', atlas.size, len(buf.getvalue()) // 1024, 'KB', 'v', v, 'cell', cw, ch)

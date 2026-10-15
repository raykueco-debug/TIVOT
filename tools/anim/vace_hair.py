"""VACE 遮罩重繪：只重畫頭髮（Ray 10-14：「把前面幾格的頭髮也改成同樣的飄動，只改頭髮」）。
control＝原影格、頭髮區塗灰；mask＝頭髮區白、其餘黑 → Wan 只在頭髮區生成，其餘照原畫面。
用法：python vace_hair.py <影格資料夾> <輸出資料夾名> "<提示詞>"
"""
import os, sys, glob, json, shutil, argparse
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tivot_vace as tv, tivot_wan as tw

SRC, NAME, PROMPT = sys.argv[1], sys.argv[2], sys.argv[3]
fs = sorted(glob.glob(os.path.join(SRC, 'frame_*.webp')))
n = len(fs); assert (n - 1) % 4 == 0, f'格數 {n} 要是 4n+1'
W0, H0 = Image.open(fs[0]).size
# 頭髮區（影格座標 720x992）：頭頂到瀏海，避開眼睛、嘴、槍
HAIR = [(240, 90), (300, 20), (420, 0), (720, 0), (720, 290), (650, 255), (600, 248), (560, 240), (515, 250),
        (470, 262), (425, 252), (402, 205), (330, 172), (260, 150)]
m = Image.new('L', (W0, H0), 0); ImageDraw.Draw(m).polygon(HAIR, fill=255)
m = m.resize((tw.W, tw.H), Image.NEAREST)
inp = os.path.join(tw.COMFY, 'input'); tag = 'hair_' + NAME
ctrl, mask = [], []
mn = f'vace_{tag}_mask.png'; m.convert('RGB').save(os.path.join(inp, mn))
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS)
    im.paste((128, 128, 128), (0, 0), m)
    cn = f'vace_{tag}_c{i:02d}.png'; im.save(os.path.join(inp, cn)); ctrl.append(cn); mask.append(mn)

class A: pass
a = A(); a.lora_high = 'wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors'; a.lora_low = 'wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors'
a.shift = 5.0; a.strength = 1.0; a.neg_extra = ''; a.hi_end = 0; a.pre = 0; a.pre_cfg = 3.0; a.steps = 4; a.cfg = 1.0
tw.ensure_server()
paths, secs = tv.run(tv.graph(ctrl, mask, n, PROMPT, 7, f'vacehair/{NAME}', a))
od = os.path.join(tw.HERE if hasattr(tw, 'HERE') else os.path.dirname(os.path.abspath(__file__)), 'out', 'ci', NAME)
shutil.rmtree(od, ignore_errors=True); os.makedirs(od)
# 遮罩外貼回原畫面（保證只改頭髮）
mf = m.resize((W0, H0), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4))
for i, (p, f) in enumerate(zip(paths, fs)):
    gen = Image.open(p).convert('RGB').resize((W0, H0), Image.LANCZOS); orig = Image.open(f).convert('RGB')
    Image.composite(gen, orig, mf).save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', quality=92)
json.dump({'fps': 16}, open(os.path.join(od, 'holds.json'), 'w'))
print(n, 'frames', round(secs), 's →', od)

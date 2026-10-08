"""從一張（綠底原始）起始格往後生 N 格，指定的方框（例：嘴）每一格都照抄起始格，其餘自由生成。
VACE 空間遮罩：第 0 格整張照抄；其後每格 control＝起始格、mask＝白（生成），方框內塗黑（照抄）。
用法：python tivot_vace_lock.py <起始格.png 480×720 綠底> --box x0 y0 x1 y1 --length 9 --seed 7 --name xxx --prompt "…"
輸出：out/vace/<name>_s<seed>/frame_NN.webp（已去綠幕）＋ sheet.jpg
"""
import os, sys, json, argparse
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tivot_wan as tw, tivot_vace as tv
ap = argparse.ArgumentParser()
ap.add_argument('start'); ap.add_argument('--box', type=int, nargs=4, required=True)
ap.add_argument('--length', type=int, default=9); ap.add_argument('--seed', type=int, default=7); ap.add_argument('--name', default='lock')
ap.add_argument('--prompt', required=True); ap.add_argument('--steps', type=int, default=4); ap.add_argument('--cfg', type=float, default=1.0)
ap.add_argument('--shift', type=float, default=5.0); ap.add_argument('--strength', type=float, default=1.0)
ap.add_argument('--lora-high', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors')
ap.add_argument('--lora-low', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'vace'))
a = ap.parse_args()
if (a.length - 1) % 4: sys.exit('length 必須 4n+1')
tag = f'{a.name}_s{a.seed}'; inp = os.path.join(tw.COMFY, 'input')
st = Image.open(a.start).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS); stn = f'vlock_{tag}_start.png'; st.save(os.path.join(inp, stn))
m0 = Image.new('RGB', (tw.W, tw.H), (0, 0, 0)); m0n = f'vlock_{tag}_m0.png'; m0.save(os.path.join(inp, m0n))
mb = Image.new('RGB', (tw.W, tw.H), (255, 255, 255)); ImageDraw.Draw(mb).rectangle(a.box, fill=(0, 0, 0)); mbn = f'vlock_{tag}_mbox.png'; mb.save(os.path.join(inp, mbn))
# ⚠ 後面幾格的 control 不能整張放起始格：mask＝1 的區域 VACE 只拿它當「結構提示」重畫，顏色會整個跑掉（實測頭髮變棕、制服變藍）。
#   改成：灰底＋只有方框內貼起始格的像素 ⇒ 模型從第 0 格往後接（像 I2V），方框照抄。
gb = Image.new('RGB', (tw.W, tw.H), tv.GRAY); gb.paste(st.crop(a.box), a.box[:2]); gbn = f'vlock_{tag}_graybox.png'; gb.save(os.path.join(inp, gbn))
ctrl = [stn] + [gbn] * (a.length - 1); mask = [m0n] + [mbn] * (a.length - 1)
tw.ensure_server()
print(f'▶ {tag}  length={a.length}  lock box={a.box}', flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, a.length, a.prompt, a.seed, f'tivotvace/{tag}', a))
od = os.path.join(a.out, tag); os.makedirs(od, exist_ok=True); files = []
for j, p in enumerate(paths):
    im = tw.key(np.asarray(Image.open(p).convert('RGB')).astype(np.float32)); fn = f'frame_{j:02d}.webp'
    im.save(os.path.join(od, fn), 'WEBP', quality=90); files.append(fn)
sh = Image.new('RGB', (160 * len(files), 240), (30, 30, 38))
for j, fn in enumerate(files):
    t = Image.open(os.path.join(od, fn)).convert('RGBA').resize((160, 240)); sh.paste(t, (j * 160, 0), t)
sh.save(os.path.join(od, 'sheet.jpg'), quality=88)
json.dump({'name': tag, 'start': a.start, 'box': a.box, 'length': a.length, 'seed': a.seed, 'wan_seconds': round(secs), 'prompt': a.prompt, 'frames': files},
          open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'  ✔ {len(files)} 格，VACE {round(secs)} 秒 → {od}', flush=True)

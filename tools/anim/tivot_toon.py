"""ToonCrafter 補間：給兩張關鍵格，生出動畫式的中間格（試 GG 那種「關鍵姿勢＋過渡格」）。

ToonCrafter 只吃 512×320 橫向：直式格先鋪綠底 → 轉 90° → 左右補綠到 1.6:1 → 送進去；出來再轉回、裁掉補邊、縮回 480×720、去綠幕。
用法：python tivot_toon.py <關鍵格A> <關鍵格B> --name xxx [--frames 16] [--seed 123] [--prompt "…"]
輸出：out/toon/<name>/frame_NN.webp（含頭尾兩張關鍵格，已去綠幕）＋ sheet.jpg
"""
import os, sys, json, time, argparse, urllib.request
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tivot_wan as tw

ap = argparse.ArgumentParser()
ap.add_argument('a'); ap.add_argument('b'); ap.add_argument('--name', required=True)
ap.add_argument('--frames', type=int, default=16); ap.add_argument('--seed', type=int, default=123)
ap.add_argument('--steps', type=int, default=50); ap.add_argument('--cfg', type=float, default=7.5); ap.add_argument('--eta', type=float, default=1.0)
ap.add_argument('--ckpt', default='tooncrafter_512_interp_v1/tooncrafter_512_interp-pruned-fp16.safetensors')
ap.add_argument('--prompt', default='anime girl, dynamic action, cel shading, green background')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'toon'))
a = ap.parse_args()

W, H = tw.W, tw.H                       # 480×720 直式
PAD = round(W * 1.6) - H                # 轉 90° 後寬 720、高 480 → 補到 768×480（1.6:1）

def prep(p, n):
    im = Image.open(p).convert('RGBA').resize((W, H), Image.LANCZOS)
    g = Image.new('RGBA', (W, H), tw.GREEN + (255,)); g.alpha_composite(im)
    r = g.convert('RGB').rotate(90, expand=True)                    # 720×480
    c = Image.new('RGB', (H + PAD, W), tw.GREEN); c.paste(r, (PAD // 2, 0))
    c.save(os.path.join(tw.COMFY, 'input', n)); return n

def back(p):
    im = Image.open(p).convert('RGB').resize((H + PAD, W), Image.LANCZOS)
    im = im.crop((PAD // 2, 0, PAD // 2 + H, W)).rotate(-90, expand=True)   # 480×720
    return tw.key(np.asarray(im).astype(np.float32))

na, nb = prep(a.a, f'toon_{a.name}_a.png'), prep(a.b, f'toon_{a.name}_b.png')
g = {'1': {'class_type': 'LoadImage', 'inputs': {'image': na}}, '2': {'class_type': 'LoadImage', 'inputs': {'image': nb}},
     '3': {'class_type': 'ToonCrafterNode', 'inputs': {'image': ['1', 0], 'image2': ['2', 0], 'ckpt_name': a.ckpt, 'vram_opt_strategy': 'low',
           'prompt': a.prompt, 'seed': a.seed, 'eta': a.eta, 'cfg_scale': a.cfg, 'steps': a.steps, 'frame_count': a.frames, 'fps': 8}},
     '4': {'class_type': 'SaveImage', 'inputs': {'images': ['3', 0], 'filename_prefix': f'tivottoon/{a.name}'}}}
tw.ensure_server()
req = urllib.request.Request(tw.URL + '/prompt', data=json.dumps({'prompt': g}).encode(), headers={'Content-Type': 'application/json'})
pid = json.load(urllib.request.urlopen(req))['prompt_id']; t0 = time.time()
while True:
    time.sleep(5)
    h = json.load(urllib.request.urlopen(f'{tw.URL}/history/{pid}'))
    if pid in h:
        st = h[pid].get('status', {})
        if st.get('status_str') == 'error': sys.exit(json.dumps(st)[:1500])
        imgs = h[pid]['outputs']['4']['images']; break
paths = [os.path.join(tw.COMFY, 'output', i.get('subfolder', ''), i['filename']) for i in imgs]
od = os.path.join(a.out, a.name); os.makedirs(od, exist_ok=True)
for j, p in enumerate(paths): back(p).save(os.path.join(od, f'frame_{j:02d}.webp'), 'WEBP', quality=90)
n = len(paths); sh = Image.new('RGB', (120 * n, 180), (0, 0, 0))
for j in range(n):
    im = Image.open(os.path.join(od, f'frame_{j:02d}.webp')).convert('RGBA'); bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
    sh.paste(bg.convert('RGB').resize((120, 180)), (j * 120, 0))
sh.save(os.path.join(od, 'sheet.jpg'))
json.dump({'a': a.a, 'b': a.b, 'frames': n, 'seed': a.seed, 'steps': a.steps, 'cfg': a.cfg, 'secs': round(time.time() - t0), 'prompt': a.prompt},
          open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'  ✔ {n} 格，{round(time.time() - t0)} 秒 → {od}', flush=True)

"""既有動畫只重畫一小塊（例：手上的彈匣），動作完全不動 —— VACE 逐格空間遮罩。

每一格：control＝原片那一格（遮罩內塗灰）、mask＝遮罩內白（重畫）、其餘黑（照抄）。
遮罩自動追：每格「近黑、低彩度」的連通塊（黑色彈匣）＞ --min-area 的全部框起來，往外擴 --grow 像素。
--first-patch <圖>：第 0 格在遮罩內貼這張圖（綠底化後）當外觀參考、整格照抄。
--last <圖>：最後一格整張換成這張（例：B 圖），整格照抄。
用法：python tivot_vace_repaint.py "<原片綠底格 glob>" --name xxx --prompt "…" [--first-patch A.png] [--last B.png]
輸出：out/ci5s/<name>_s<seed>/frame_NN.webp（已去綠幕）＋ _mask_sheet.jpg（遮罩檢查）
"""
import os, sys, glob, json, argparse
import numpy as np, cv2
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tivot_wan as tw, tivot_vace as tv

ap = argparse.ArgumentParser()
ap.add_argument('frames'); ap.add_argument('--name', required=True); ap.add_argument('--prompt', required=True)
ap.add_argument('--first-patch'); ap.add_argument('--last')
ap.add_argument('--grow', type=int, default=26); ap.add_argument('--min-area', type=int, default=120)
ap.add_argument('--seed', type=int, default=7); ap.add_argument('--steps', type=int, default=6); ap.add_argument('--cfg', type=float, default=1.0)
ap.add_argument('--shift', type=float, default=5.0); ap.add_argument('--strength', type=float, default=1.0)
ap.add_argument('--lora-high', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors')
ap.add_argument('--lora-low', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'ci5s'))
ap.add_argument('--dry', action='store_true', help='只出遮罩檢查圖，不跑')
ap.add_argument('--pre', type=int, default=0, help='高噪段前幾步不掛加速 LoRA、用 --pre-cfg（負面詞才生效）'); ap.add_argument('--pre-cfg', type=float, default=3.0)
ap.add_argument('--neg-extra', default='', help='追加負面詞（cfg>1 才看得到）')
a = ap.parse_args()
a.hi_end = 0

fs = sorted(glob.glob(a.frames)); N = len(fs)
if (N - 1) % 4: sys.exit(f'格數 {N} 不是 4n+1')
tag = f'{a.name}_s{a.seed}'; inp = os.path.join(tw.COMFY, 'input')

def track(arr):
    v = arr.max(2); sat = v - arr.min(2)
    dark = ((v < 55) & (sat < 40)).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark)
    m = np.zeros(dark.shape, np.uint8)
    for k in range(1, n):
        if st[k, 4] >= a.min_area:
            x, y, w, h = st[k, :4]; m[y:y + h, x:x + w] = 1
    return cv2.dilate(m, np.ones((2 * a.grow + 1, 2 * a.grow + 1), np.uint8)) > 0

frames = [np.asarray(Image.open(p).convert('RGB').resize((tw.W, tw.H))) for p in fs]
masks = [track(f.astype(int)) for f in frames]
masks[0][:] = False                     # 第 0 格整格照抄（遮罩內先貼參考）
if a.last: masks[-1][:] = False
if a.first_patch:
    ref = np.asarray(tw.to_green(a.first_patch, 'idle'))
    m0 = track(frames[0].astype(int)) | track(ref.astype(int))
    f0 = frames[0].copy(); f0[m0] = ref[m0]; frames[0] = f0
if a.last:
    frames[-1] = np.asarray(tw.to_green(a.last, 'idle'))

# 遮罩檢查圖
idx = list(range(0, N, max(1, N // 8)))[:9]
sh = Image.new('RGB', (160 * len(idx), 240))
for k, i in enumerate(idx):
    im = Image.fromarray(frames[i].copy()); ov = np.asarray(im).copy(); ov[masks[i]] = (ov[masks[i]] * 0.4 + np.array([255, 0, 0]) * 0.6).astype(np.uint8)
    sh.paste(Image.fromarray(ov).resize((160, 240)), (k * 160, 0))
od = os.path.join(a.out, tag); os.makedirs(od, exist_ok=True); sh.save(os.path.join(od, '_mask_sheet.jpg'))
print('遮罩檢查：', os.path.join(od, '_mask_sheet.jpg'), flush=True)
if a.dry: sys.exit(0)

ctrl, mask = [], []
for i, (f, m) in enumerate(zip(frames, masks)):
    c = f.copy(); c[m] = tv.GRAY
    cn, mn = f'vrep_{tag}_c{i:02d}.png', f'vrep_{tag}_m{i:02d}.png'
    Image.fromarray(c).save(os.path.join(inp, cn)); Image.fromarray((m * 255).astype(np.uint8)).convert('RGB').save(os.path.join(inp, mn))
    ctrl.append(cn); mask.append(mn)
tw.ensure_server()
print(f'▶ {tag}  {N} 格  遮罩平均 {np.mean([m.mean() for m in masks]) * 100:.1f}% 畫面', flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, N, a.prompt, a.seed, f'tivotvrep/{tag}', a))
files = []
for j, p in enumerate(paths):
    im = tw.key(np.asarray(Image.open(p).convert('RGB')).astype(np.float32))
    fn = f'frame_{j:02d}.webp'; im.save(os.path.join(od, fn), 'WEBP', quality=90); files.append(fn)
json.dump({'name': tag, 'from': a.frames, 'seed': a.seed, 'steps': a.steps, 'fps': 16, 'wan_seconds': round(secs), 'prompt': a.prompt, 'frames': files},
          open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'  ✔ {len(files)} 格，VACE {round(secs)} 秒 → {od}', flush=True)

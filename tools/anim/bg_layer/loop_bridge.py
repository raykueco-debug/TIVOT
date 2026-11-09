"""背景線：循環接縫用「動作補間」補平（RIFE 4.7，沿光流推移像素 —— 不是半透明疊兩張的交叉淡化）。
Wan／VACE 的頭尾都只是「很像原圖」，接回去差一截（實測天空：一般相鄰格 0.22、接縫 1.34）。
作法：先每格整體色調對齊原圖；丟掉最後 k 格，改由 RIFE 從第 n-1-k 格補到第 0 格。
用法：python loop_bridge.py <Wan 輸出前綴> <原圖> <輸出前綴> [--k 6] [--drop-last]
輸出：ComfyUI/output/<輸出前綴>_00001_.png…（可以直接當 sky_place.py 的雲前綴）
"""
import argparse, glob, json, os, time, urllib.request
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(os.path.dirname(HERE))
URL = 'http://127.0.0.1:8188'
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('still'); ap.add_argument('dst')
ap.add_argument('--k', type=int, default=6); ap.add_argument('--start', type=int, default=0, help='VACE 開頭幾格常常抖（第 0→1 格跳最大），從第幾格起算')
ap.add_argument('--drop-last', action='store_true', help='最後一格＝鎖回第 0 格的那一格，先丟掉')
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(COMFY, 'output', a.src + '_*.png')))
if a.drop_last: fs = fs[:-1]
fr = [np.array(Image.open(f).convert('RGB')).astype(np.float32) for f in fs]
h, w = fr[0].shape[:2]
ref = np.array(Image.open(a.still).convert('RGB').resize((w, h), Image.LANCZOS)).astype(np.float32)
fr = [(x - x.mean((0, 1))) / (x.std((0, 1)) + 1e-6) * ref.std((0, 1)) + ref.mean((0, 1)) for x in fr]   # 整體色調對齊（VACE 會整張偏色）
keep = fr[a.start:len(fr) - a.k]
A, B = keep[-1], fr[a.start]
inp = os.path.join(COMFY, 'input'); tag = a.dst.replace('/', '_')
Image.fromarray(A.clip(0, 255).astype(np.uint8)).save(os.path.join(inp, f'{tag}_A.png'))
Image.fromarray(B.clip(0, 255).astype(np.uint8)).save(os.path.join(inp, f'{tag}_B.png'))
g = {'1': {'class_type': 'LoadImage', 'inputs': {'image': f'{tag}_A.png'}}, '2': {'class_type': 'LoadImage', 'inputs': {'image': f'{tag}_B.png'}},
     '3': {'class_type': 'ImageBatch', 'inputs': {'image1': ['1', 0], 'image2': ['2', 0]}},
     '4': {'class_type': 'RIFE VFI', 'inputs': {'ckpt_name': 'rife47.pth', 'frames': ['3', 0], 'clear_cache_after_n_frames': 10,
                                              'multiplier': a.k + 1, 'fast_mode': False, 'ensemble': True, 'scale_factor': 1.0}},
     '5': {'class_type': 'SaveImage', 'inputs': {'images': ['4', 0], 'filename_prefix': a.dst + '_rife'}}}
req = urllib.request.Request(URL + '/prompt', data=json.dumps({'prompt': g}).encode(), headers={'Content-Type': 'application/json'})
pid = json.load(urllib.request.urlopen(req))['prompt_id']
while True:
    time.sleep(2); hst = json.load(urllib.request.urlopen(f'{URL}/history/{pid}'))
    if pid in hst:
        st = hst[pid].get('status', {})
        if st.get('status_str') == 'error': raise SystemExit(json.dumps(st)[:1500])
        imgs = hst[pid]['outputs']['5']['images']; break
mids = [np.array(Image.open(os.path.join(COMFY, 'output', i.get('subfolder', ''), i['filename'])).convert('RGB')).astype(np.float32) for i in imgs][1:-1]
seq = keep + mids
od = os.path.join(COMFY, 'output', os.path.dirname(a.dst)); base = os.path.basename(a.dst)
for j, x in enumerate(seq):
    Image.fromarray(x.clip(0, 255).astype(np.uint8)).save(os.path.join(od, f'{base}_{j + 1:05d}_.png'))
sm = lambda x: np.array(Image.fromarray(x.clip(0, 255).astype(np.uint8)).resize((192, 128))).astype(np.float32)
S = [sm(x) for x in seq]
steps = [float(np.abs(S[i] - S[(i + 1) % len(S)]).mean()) for i in range(len(S))]
print(json.dumps({'frames': len(seq), 'rife_mid': len(mids), 'mean_step': round(float(np.mean(steps)), 3), 'max_step': round(max(steps), 3),
                  'seam': round(steps[-1], 3)}, ensure_ascii=False))

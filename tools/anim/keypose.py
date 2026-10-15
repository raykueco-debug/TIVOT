# 極點停留＋大跳格：從 Wan 原始 49 格找出動作極點，極點停久、過渡一閃，輸出 frames＋timing。
# 用法：python keypose.py <名字> <seed> <輸出資料夾> [區域 x0,y0,x1,y1（480×720 座標）] [--uniform 對照資料夾]
import glob, json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(HERE)
name, seed, od = sys.argv[1], sys.argv[2], sys.argv[3]
box = tuple(int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else '230,230,410,360').split(','))
uni = sys.argv[sys.argv.index('--uniform') + 1] if '--uniform' in sys.argv else None
HOLD, PASS = 0.72, 0.28        # 一段時間裡：極點佔 72%、過渡佔 28%
paths = sorted(glob.glob(os.path.join(COMFY, 'output', 'tivotwan', f'{name}_{seed}_*.png')))
raw = [Image.open(p).convert('RGB') for p in paths]
n = len(raw); T = n / 16 * 1000                       # 總長（毫秒），Wan 16fps
x0, y0, x1, y1 = box
g = [cv2.cvtColor(np.asarray(r)[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY).astype(np.float32) for r in raw]
dy = np.array([cv2.phaseCorrelate(g[0], gi)[0][1] for gi in g])    # 區域的垂直位移
dy = np.convolve(dy, np.ones(3) / 3, mode='same')
# 極點：局部最高／最低，且與上一個極點差距夠大
ext = [0]
for i in range(1, n - 1):
    if (dy[i] - dy[i-1]) * (dy[i+1] - dy[i]) < 0 and abs(dy[i] - dy[ext[-1]]) > 1.5 and i - ext[-1] >= 3:
        ext.append(i)
if ext[-1] != n - 1: ext.append(n - 1)
# 每段：極點停 HOLD，若段長 ≥6 格再插一張中點過渡格（一閃）
seq = []                                               # (原始格號, 毫秒, 類型)
for a, b in zip(ext, ext[1:]):
    span = (b - a) / 16 * 1000
    if b - a >= 6: seq += [(a, span * HOLD, 'key'), ((a + b) // 2, span * PASS, 'pass')]
    else: seq.append((a, span, 'key'))
seq.append((ext[-1], 0, 'key')) if False else None
os.makedirs(od, exist_ok=True)
files, timing, kinds, tot, saved = [], [], [], 0, {}
for i, ms, k in seq:
    if i not in saved:
        fn = f'raw_{i:02d}.webp'; raw[i].save(os.path.join(od, fn), 'WEBP', quality=82); saved[i] = fn
        tot += os.path.getsize(os.path.join(od, fn))
    files.append(saved[i]); timing.append(round(ms)); kinds.append(f'{k} #{i}')
meta = {'name': os.path.basename(od), 'seed': int(seed), 'frames': files, 'timing_ms': timing, 'kinds': kinds,
        'unique_files': len(saved), 'bytes': tot, 'total_ms': sum(timing), 'region': box, 'extrema_raw': ext}
json.dump(meta, open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
U = json.load(open(os.path.join(uni, 'meta.json'), encoding='utf-8')) if uni else None
uf = [os.path.relpath(os.path.join(uni, f), od).replace('\\', '/') for f in U['frames']] if U else []
open(os.path.join(od, 'preview.html'), 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><title>{meta["name"]}</title>
<style>body{{margin:0;background:#15151b;color:#ccc;font:14px sans-serif;text-align:center}}.g{{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}}
img{{width:360px;height:540px;object-fit:contain;background:#2a2730}}#lab{{font:16px monospace;color:#fc6}}</style>
<p>{meta["name"]}｜{len(files)} 拍／{len(saved)} 張檔｜{tot//1024} KB｜總長 {sum(timing)} ms</p>
<div class=g><div><img id=k><p>極點停留＋大跳格 <span id=lab></span></p></div>
{"<div><img id=u><p>平均抽格（對照）</p></div>" if U else ""}</div>
<script>const F={json.dumps(files)},D={json.dumps(timing)},K={json.dumps(kinds)};let i=0;const k=document.getElementById('k'),lab=document.getElementById('lab');
F.forEach(u=>{{new Image().src=u}});function step(){{k.src=F[i];lab.textContent=K[i]+' '+D[i]+'ms';const t=D[i];i=(i+1)%F.length;setTimeout(step,t)}}step();
const UF={json.dumps(uf)};if(UF.length){{let j=0;const u=document.getElementById('u');setInterval(()=>{{u.src=UF[j];j=(j+1)%UF.length}},{1000/U["fps"] if U else 125})}}</script>''')
print(f'極點 {ext}；{len(files)} 拍、{len(saved)} 張檔、{tot//1024} KB；拍長 {timing}')

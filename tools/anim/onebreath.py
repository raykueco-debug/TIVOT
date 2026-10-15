# 試做：從既有 Wan 輸出（16fps）找出「一喘」的週期，只取那一段均勻抽 12 格。不重跑 Wan。
# 用法：python onebreath.py <name> <seed> [frames=12]
import glob, json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tivot_wan import COMFY, HERE, deflicker, key

name, seed = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 12
paths = sorted(glob.glob(os.path.join(COMFY, 'output', 'tivotwan', f'{name}_{seed}_*.png')))
arrs = deflicker([np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in paths])
small = [np.asarray(Image.fromarray(a.astype(np.uint8)).resize((96, 144))).astype(np.float32) for a in arrs]
d = [float(np.abs(s - small[0]).mean()) for s in small]
lo, hi = 10, len(arrs) - 2                       # 週期至少 10 格（0.6 秒）
P = min(range(lo, hi), key=lambda t: d[t])       # 與首格最像的那一格＝回到原點
idx = [round(P * i / N) for i in range(N)]       # [0, P) 均勻抽 N 格（P 那一格＝首格，不取）
fps = N / (P / 16)
od = os.path.join(HERE, 'out', 'monsters', f'{name}_1breath'); os.makedirs(od, exist_ok=True)
files, tot = [], 0
for j, i in enumerate(idx):
    im = key(arrs[i]); im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
    fn = f'frame_{j:02d}.webp'; im.save(os.path.join(od, fn), 'WEBP', quality=82); files.append(fn)
    tot += os.path.getsize(os.path.join(od, fn))
meta = {'name': f'{name}_1breath', 'mode': 'idle', 'seed': int(seed), 'frames': files, 'fps': round(fps, 2),
        'width': 480, 'period_raw_frames': P, 'period_sec': round(P / 16, 2), 'bytes': tot,
        'diff_to_first': [round(x, 1) for x in d]}
json.dump(meta, open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'週期 {P} 格（{P/16:.2f} 秒），{N} 格 @ {fps:.1f}fps，{tot//1024} KB；回到原點的差 {d[P]:.1f}（最大 {max(d):.1f}）')

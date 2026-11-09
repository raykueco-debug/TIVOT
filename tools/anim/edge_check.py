"""逐格查碰邊（natali rule §4）。11-08 在 3060 這台重寫（原版在 4070S）。
用法：python edge_check.py <格資料夾> [<格資料夾>…]  [--th 32] [--m 2]
主體（alpha > th）碰到畫框 m 像素內就算碰邊，列出每格碰哪幾邊。"""
import sys, glob, os
import numpy as np
from PIL import Image

def check(d, th=32, m=2):
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')) + glob.glob(os.path.join(d, 'frame_*.png')))
    hits = []
    for i, f in enumerate(fs):
        a = np.asarray(Image.open(f).convert('RGBA'))[..., 3] > th
        e = [k for k, v in (('上', a[:m].any()), ('下', a[-m:].any()), ('左', a[:, :m].any()), ('右', a[:, -m:].any())) if v]
        if e: hits.append((i, e))
    print(f'{os.path.basename(d.rstrip("/\\"))}：{len(fs)} 格，碰邊 {len(hits)} 格')
    for i, e in hits: print(f'  第 {i} 格：{"".join(e)}')
    return hits

if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    th = int(sys.argv[sys.argv.index('--th') + 1]) if '--th' in sys.argv else 32
    m = int(sys.argv[sys.argv.index('--m') + 1]) if '--m' in sys.argv else 2
    args = [x for x in args if x not in (str(th), str(m))]
    for d in args: check(d, th, m)

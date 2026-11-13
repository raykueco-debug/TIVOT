"""把 ~/Downloads 的 <key>__sky.png 搬進 out/<地圖>/，順便驗：不是原圖、洋紅佔比合理。"""
import sys, os, shutil, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); DL = os.path.expanduser('~/Downloads')
for k in sys.argv[1:]:
    f = os.path.join(DL, k + '__sky.png')
    if not os.path.exists(f): print('MISSING', k); continue
    a = np.array(Image.open(f).convert('RGB').resize((192, 128))).astype(float)
    s = np.array(Image.open(os.path.join(HERE, '_src', k + '.png')).convert('RGB').resize((192, 128))).astype(float)
    mag = ((a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 60)).mean()
    d = abs(a - s).mean()
    od = os.path.join(HERE, 'out', k.split('__')[0]); os.makedirs(od, exist_ok=True)
    shutil.move(f, os.path.join(od, k + '__sky.png'))
    print(k, f'magenta {mag:.0%}', f'diff {d:.1f}', 'SAME-AS-SRC?' if d < 3 else '')

# 交件（座標不明的舊片用）：第 0 格主體外框對齊立繪主體外框（等高、腳底置中），算出 anim.json 的 box
# ver -2732 北泊交件用（Ray：「先交件再開車輪戰」）。片子第 0 格要是中立站姿（＝立繪）。
# 用法：python deliver_by_bbox.py <格資料夾> <立繪.webp> <輸出資料夾> [--fps 24] [--loop 0]
import argparse, glob, json, os
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('portrait'); ap.add_argument('dst')
ap.add_argument('--fps', type=float, default=24); ap.add_argument('--loop', type=int, default=0)
a = ap.parse_args()
bb = lambda im, t=128: im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp'))); ims = [Image.open(f).convert('RGBA') for f in fs]
bs = [bb(im, 8) for im in ims]; U = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
os.makedirs(a.dst, exist_ok=True)
areas = []
for i, im in enumerate(ims):
    im.crop(U).save(os.path.join(a.dst, f'frame_{i:02d}.webp'), 'WEBP', quality=82); areas.append(int((np.asarray(im)[..., 3] > 128).sum()))
P = Image.open(a.portrait).convert('RGBA'); bp = bb(P); b0 = bb(ims[0])
s = (bp[3] - bp[1]) / (b0[3] - b0[1])
x0 = (bp[0] + bp[2]) / 2 - ((b0[0] + b0[2]) / 2 - U[0]) * s; y0 = bp[3] - (b0[3] - U[1]) * s
cw, ch = U[2] - U[0], U[3] - U[1]
j = {'canvas': list(P.size), 'box': [round(x0), round(y0), round(cw * s), round(ch * s)], 'frames': len(ims), 'fps': a.fps, 'loop': bool(a.loop), 'px': [cw, ch]}
json.dump(j, open(os.path.join(a.dst, 'anim.json'), 'w', encoding='utf-8'), indent=1)
print(os.path.basename(a.dst), len(ims), '格，主體最大＝第', int(np.argmax(areas)), '格，box', j['box'])

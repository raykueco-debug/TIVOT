"""鎖嘴（Ray 10-13：「嘴不要動」）：把第 ref 格的嘴部貼片，跟著臉的位移貼回每一格（橢圓羽化邊）。

提示詞寫「嘴閉著」壓不住 Wan 的嘴動（交接檔記過），所以從後製鎖。同 BR v6 的「下半臉鎖成固定一格」。
用法：
  python mouth_lock.py <輸入資料夾> <輸出資料夾> --mouth 347,164 --size 64,40 [--face 300,90,410,190] [--ref 0]
  --mouth  嘴的中心（影格像素座標）    --size  貼片寬高（橢圓直徑）
  --face   用來量位移的臉部框（x0,y0,x1,y1）；人不動的圖位移≈0
輸出：全格（不裁），holds.json 照抄。
"""
import os, glob, json, shutil, argparse
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--mouth', required=True); ap.add_argument('--size', default='64,40')
ap.add_argument('--face'); ap.add_argument('--ref', type=int, default=0)
ap.add_argument('--ref-img', help='改用這張圖（縮到影格大小）當嘴的來源，例如原圖 —— Wan 第 0 格的嘴常畫得很淡')
a = ap.parse_args()
mx, my = map(int, a.mouth.split(',')); sw, sh = map(int, a.size.split(','))
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
ref = Image.open(fs[a.ref]).convert('RGB')
src_ref = Image.open(a.ref_img).convert('RGB').resize(ref.size, Image.LANCZOS) if a.ref_img else ref
fb = tuple(map(int, a.face.split(','))) if a.face else (mx - 60, my - 80, mx + 60, my + 30)
refg = np.asarray(ref.convert('L').crop(fb)).astype(np.float32)
pad = 12
box = (mx - sw // 2 - pad, my - sh // 2 - pad, mx + sw // 2 + pad, my + sh // 2 + pad)
patch = src_ref.crop(box)
mask = Image.new('L', patch.size, 0)
ImageDraw.Draw(mask).ellipse((pad, pad, pad + sw, pad + sh), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(pad / 2))
os.makedirs(a.dst, exist_ok=True)
shifts = []
for f in fs:
    im = Image.open(f).convert('RGB')
    g = np.asarray(im.convert('L').crop(fb)).astype(np.float32)
    (dx, dy), _ = cv2.phaseCorrelate(refg, g)
    dx, dy = round(dx), round(dy); shifts.append((dx, dy))
    im.paste(patch, (box[0] + dx, box[1] + dy), mask)
    im.save(os.path.join(a.dst, os.path.basename(f)), 'WEBP', quality=90)
h = os.path.join(a.src, 'holds.json')
if os.path.exists(h): shutil.copy2(h, os.path.join(a.dst, 'holds.json'))
print(len(fs), 'frames; head shift range x', min(s[0] for s in shifts), max(s[0] for s in shifts),
      'y', min(s[1] for s in shifts), max(s[1] for s in shifts))

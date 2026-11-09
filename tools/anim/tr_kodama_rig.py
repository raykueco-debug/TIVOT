# 訓練用聖徒待機：身體＝Wan 靜頭呼吸格，頭（含頸環）拆層、以頸為軸做木靈式喀喀抽轉（Ray 2026-11-05 同意程式做）
import glob, math, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
SRC = 'out/monsters/saint_tr_neutral_idlestill'
OUT = 'out/monsters/saint_tr_neutral_idlekodama'
PX, PY = 223, 147                      # 頸部軸心（生成空間 480×720）
fs = sorted(glob.glob(SRC + '/frame_*.webp'))
os.makedirs(OUT, exist_ok=True)
for f in glob.glob(OUT + '/*'): os.remove(f)
W, H = Image.open(fs[0]).size
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
d.ellipse((205-46, 101-52, 205+46, 101+50), fill=255)
d.ellipse((240-33, 115-40, 240+33, 115+38), fill=255)
d.rectangle((0, 150, W, H), fill=0)
m = m.filter(ImageFilter.GaussianBlur(1.5))
# 每格的頭部角度（度，正＝順時針）：一陣喀喀抽轉→停→再一陣，格與格之間硬切
burst1 = [8, -7, 10, -5, 7, -9, 4, 0]
burst2 = [-9, 7, -6, 10, -8, 5, -3, 0]
seq = [0]*6 + burst1 + [0]*12 + burst2 + [0]*(48-6-8-12-8)
assert len(seq) == 48
HEAD0 = Image.open(fs[0]).convert('RGBA')
for k, f in enumerate(fs[:48]):
    fr = Image.open(f).convert('RGBA')
    ang = seq[k]
    head = Image.new('RGBA', (W, H), (0, 0, 0, 0)); head.paste(HEAD0, (0, 0), m)
    a = np.array(fr).astype(np.float32); a[..., 3] *= 1 - np.array(m).astype(np.float32) / 255
    body = Image.fromarray(a.astype(np.uint8))
    hr = head.rotate(-ang, resample=Image.BICUBIC, center=(PX, PY))
    # 頭底邊壓在左肩上：頭轉走後露出的肩膀缺口用 inpaint 補（只補原本有身體、頭轉走後空掉、而且在肩線以下的區域）
    mm = np.array(m) > 20
    ha = np.array(hr)[..., 3] > 40
    yy, xx = np.mgrid[0:H, 0:W]
    shoulder = (yy > 118) & (xx < PX)
    hole = mm & ~ha & shoulder & (np.array(fr)[..., 3] > 200)
    if hole.any():
        b = np.array(body); rgb = np.ascontiguousarray(b[..., :3])
        mask8 = (hole * 255).astype(np.uint8)
        src = rgb.copy(); src[mm & ~hole] = rgb[mm & ~hole]
        fill = cv2.inpaint(src, cv2.dilate(mask8, np.ones((3, 3), np.uint8)), 5, cv2.INPAINT_TELEA)
        b[hole, :3] = fill[hole]; b[hole, 3] = 255
        body = Image.fromarray(b)
    body.alpha_composite(hr)
    body.save(f'{OUT}/frame_{k:02d}.webp', 'WEBP', quality=90)
print('done', len(fs))

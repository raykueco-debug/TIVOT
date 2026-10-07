# 待機動檔 → 轉回原圖畫布（idle 模式：裁 bbox、fit 0.92、置中），裁成全格聯集框，交 webp ＋ anim.json
import glob, json, os, sys
from PIL import Image
src_img, frames_dir, dst, fps = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
W, H = 480, 720
src = Image.open(src_img).convert('RGBA')
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
w, h = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / w, H * 0.92 / h); w2, h2 = round(w * s), round(h * s)
ox, oy = (W - w2) // 2, (H - h2) // 2
L = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.webp')))
canv = []
for p in L:
    f = Image.open(p).convert('RGBA'); big = f.resize((round(W / s), round(H / s)), Image.LANCZOS)
    c = Image.new('RGBA', src.size, (0, 0, 0, 0)); c.paste(big, (round(bb[0] - ox / s), round(bb[1] - oy / s)), big); canv.append(c)
box = None
for c in canv:
    b = c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
os.makedirs(dst, exist_ok=True); tot = 0
for j, c in enumerate(canv):
    p = os.path.join(dst, f'frame_{j:02d}.webp'); c.crop(box).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
json.dump({'canvas': list(src.size), 'box': [box[0], box[1], box[2] - box[0], box[3] - box[1]], 'frames': len(canv), 'fps': fps, 'loop': True},
          open(os.path.join(dst, 'anim.json'), 'w'), indent=1)
print(len(canv), 'frames', box, tot // 1024, 'KB')

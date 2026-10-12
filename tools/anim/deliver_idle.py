# 待機動檔 → 轉回原圖畫布（idle 模式：裁 bbox、fit 0.92、置中），裁成全格聯集框，交 webp ＋ anim.json
import glob, json, os, sys
from PIL import Image
src_img, frames_dir, dst, fps = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
W, H = 480, 720
src = Image.open(src_img).convert('RGBA')
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
w, h = bb[2] - bb[0], bb[3] - bb[1]
FIT = float(sys.argv[5]) if len(sys.argv) > 5 else 0.92   # 要與生成時的 TIVOT_FIT 一致
s = min(W * FIT / w, H * FIT / h); w2, h2 = round(w * s), round(h * s)
ox, oy = (W - w2) // 2, (H - h2) // 2
L = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.webp')))
PAD = 600   # 畫布四周留邊：動作（振翅）可以超出原圖，box 允許負數（引擎照 canvas 座標擺）
canv = []
for p in L:
    f = Image.open(p).convert('RGBA'); big = f.resize((round(W / s), round(H / s)), Image.LANCZOS)
    c = Image.new('RGBA', (src.size[0] + 2 * PAD, src.size[1] + 2 * PAD), (0, 0, 0, 0)); c.paste(big, (PAD + round(bb[0] - ox / s), PAD + round(bb[1] - oy / s)), big); canv.append(c)
box = None
for c in canv:
    b = c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
os.makedirs(dst, exist_ok=True); tot = 0
for j, c in enumerate(canv):
    p = os.path.join(dst, f'frame_{j:02d}.webp'); c.crop(box).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
json.dump({'canvas': list(src.size), 'box': [box[0] - PAD, box[1] - PAD, box[2] - box[0], box[3] - box[1]], 'frames': len(canv), 'fps': fps, 'loop': True},
          open(os.path.join(dst, 'anim.json'), 'w'), indent=1)
print(len(canv), 'frames', (box[0] - PAD, box[1] - PAD, box[2] - PAD, box[3] - PAD), tot // 1024, 'KB')

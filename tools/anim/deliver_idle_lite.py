# 待機動檔交件（程式端版，ver -2075）：同 deliver_idle.py 的對位（原圖 bbox → fit 0.92 置中於 480×720），
# 但格子**不放大回原圖解析度**：在格子自己的座標裁聯集框、再縮 SCALE，anim.json 的 box 換算回原圖畫布。
# 引擎（modules/enemy.js 的 startIdleLoop）把格子拉回 box 大小 —— 解碼只吃縮小後的像素。
# 用法：py -3.11 tools/anim/deliver_idle_lite.py <原圖> <格資料夾> <目的地> [fps=8] [scale=0.75]
import glob, json, os, sys
from PIL import Image
src_img, frames_dir, dst = sys.argv[1], sys.argv[2], sys.argv[3]
fps = int(sys.argv[4]) if len(sys.argv) > 4 else 8
SCALE = float(sys.argv[5]) if len(sys.argv) > 5 else 0.75
W, H = 480, 720
src = Image.open(src_img).convert('RGBA')
bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
w, h = bb[2] - bb[0], bb[3] - bb[1]
s = min(W * 0.92 / w, H * 0.92 / h); w2, h2 = round(w * s), round(h * s)
ox, oy = (W - w2) // 2, (H - h2) // 2
L = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.webp')))
fr = [Image.open(p).convert('RGBA') for p in L]
fb = None
for f in fr:
    b = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if b: fb = b if fb is None else (min(fb[0], b[0]), min(fb[1], b[1]), max(fb[2], b[2]), max(fb[3], b[3]))
os.makedirs(dst, exist_ok=True); tot = 0
cw, ch = fb[2] - fb[0], fb[3] - fb[1]
ow, oh = max(1, round(cw * SCALE)), max(1, round(ch * SCALE))
for j, f in enumerate(fr):
    p = os.path.join(dst, f'frame_{j:02d}.webp')
    f.crop(fb).resize((ow, oh), Image.LANCZOS).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
box = [round(bb[0] + (fb[0] - ox) / s), round(bb[1] + (fb[1] - oy) / s), round(cw / s), round(ch / s)]
json.dump({'canvas': list(src.size), 'box': box, 'frames': len(fr), 'fps': fps, 'loop': True, 'px': [ow, oh]},
          open(os.path.join(dst, 'anim.json'), 'w'), indent=1)
print(os.path.basename(dst), len(fr), 'frames', ow, 'x', oh, tot // 1024, 'KB', round(len(fr) * ow * oh * 4 / 1048576), 'MB')

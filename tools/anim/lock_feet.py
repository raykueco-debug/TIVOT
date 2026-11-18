# 鎖雙腳（Ray 11-18：「保持動畫中位置大小不變 鎖住雙腳位置大小」，崩岩巨像咆哮）
# 逐格量「腳那一帶」（主體最下緣往上 --band 像素）的左右寬與底緣，等比縮放讓腳寬回到第 0 格、腳底中心對齊第 0 格。
# 與 lock_scale.py 的差別：那支看整體面積（張手就會被誤縮），這支只看腳。
# 畫布四邊各加 --pad 像素（放大會出界），anim.json 的 box 照同一個換算往外擴。
# 用法：python lock_feet.py <格資料夾 frame_*.webp> <輸出資料夾> --json <原 anim.json> [--band 70] [--pad 48] [--fps 16] [--loop 0]
import argparse, glob, json, os
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--json', required=True)
ap.add_argument('--band', type=int, default=70); ap.add_argument('--pad', type=int, default=48)
ap.add_argument('--fps', type=float, default=None); ap.add_argument('--loop', type=int, default=0)
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
ims = [Image.open(f).convert('RGBA') for f in fs]
def feet(im):
    al = np.asarray(im)[..., 3] > 128; ys, _ = np.where(al); by = ys.max()
    bx = np.where(al[max(0, by - a.band):by + 1].any(0))[0]
    return (bx.min() + bx.max()) / 2, by, bx.max() - bx.min()
inf = [feet(im) for im in ims]
cx0, by0, w0 = inf[0]
W, H = ims[0].size; p = a.pad; W2, H2 = W + 2 * p, H + 2 * p
os.makedirs(a.dst, exist_ok=True)
for f in glob.glob(os.path.join(a.dst, 'frame_*.webp')): os.remove(f)
for j, (im, (cx, by, w)) in enumerate(zip(ims, inf)):
    s = w0 / max(1, w)
    t = im.resize((max(1, round(W * s)), max(1, round(H * s))), Image.LANCZOS)
    c = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    c.paste(t, (round(p + cx0 - cx * s), round(p + by0 - by * s)), t)
    c.save(os.path.join(a.dst, f'frame_{j:02d}.webp'), 'WEBP', quality=82)
j0 = json.load(open(a.json, encoding='utf-8'))
sc = j0['box'][2] / j0['px'][0]
j0['box'] = [round(j0['box'][0] - p * sc), round(j0['box'][1] - p * sc), round(W2 * sc), round(H2 * sc)]
j0['px'] = [W2, H2]; j0['frames'] = len(ims); j0['loop'] = bool(a.loop)
if a.fps: j0['fps'] = a.fps
json.dump(j0, open(os.path.join(a.dst, 'anim.json'), 'w', encoding='utf-8'), indent=1)
ks = [w0 / max(1, i[2]) for i in inf]
print(f'{len(ims)} 格，縮放 {min(ks):.3f}～{max(ks):.3f}，box {j0["box"]}')

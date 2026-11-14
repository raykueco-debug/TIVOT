# 鎖體積（Ray 11-15：「喪鐘蠕蟲要體積變太多 鎖好」）：逐格量主體面積，等比縮放讓 √面積 回到第 0 格，腳底中心對齊第 0 格
# 縮放係數做移動平均（避免逐格抖），只縮不移動構圖重心以外的東西。
# 用法：python lock_scale.py <格資料夾 frame_*.webp> <輸出資料夾> [--win 5]
import argparse, glob, os
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--win', type=int, default=5)
a = ap.parse_args()
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
ims = [Image.open(f).convert('RGBA') for f in fs]
def info(im):
    al = np.asarray(im)[..., 3] > 128; ys, xs = np.where(al)
    return al.sum(), (xs.min() + xs.max()) / 2, ys.max()
inf = [info(im) for im in ims]
k = np.array([np.sqrt(inf[0][0] / max(1, i[0])) for i in inf])
w = a.win; ks = np.convolve(np.pad(k, (w // 2, w // 2), mode='edge'), np.ones(w) / w, mode='valid')
os.makedirs(a.dst, exist_ok=True)
cx0, by0 = inf[0][1], inf[0][2]
for j, (im, s, (ar, cx, by)) in enumerate(zip(ims, ks, inf)):
    t = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new('RGBA', im.size, (0, 0, 0, 0))
    c.paste(t, (round(cx0 - cx * s), round(by0 - by * s)), t)
    c.save(os.path.join(a.dst, os.path.basename(fs[j])), 'WEBP', quality=82)
print(f'{len(fs)} 格，縮放 {ks.min():.2f}～{ks.max():.2f}')

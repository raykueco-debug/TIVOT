# 背景（黑＋火星）與人物分開畫再合成：每格從畫面邊緣找連通的近黑區＝背景，火星只畫在背景層，人物疊在最上面。
# 用法：python embers2.py <格資料夾> <輸出資料夾> [數量] [角度°，0＝往右、正＝往上]
import glob, math, os, random, sys
import numpy as np, cv2
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 70; ANG = math.radians(float(sys.argv[4]) if len(sys.argv) > 4 else 35)
os.makedirs(dst, exist_ok=True); os.makedirs(dst + '_mask', exist_ok=True)
fs = sorted(glob.glob(os.path.join(src, 'frame_*.webp'))); W, H = Image.open(fs[0]).size; rnd = random.Random(5)
P = [dict(x=rnd.uniform(-W * .3, W), y=rnd.uniform(0, H * 1.3), sp=rnd.uniform(5, 11), r=rnd.uniform(1.0, 2.4),
          ph=rnd.uniform(0, 6.28), fl=rnd.uniform(0.25, 0.6), cu=rnd.uniform(-0.04, 0.04)) for _ in range(N)]
def bgmask(im):
    lum = im.max(axis=2)
    dark = (lum < 22).astype(np.uint8)
    n, lab = cv2.connectedComponents(dark, connectivity=4)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = np.isin(lab, list(edge)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.erode(m, np.ones((3, 3), np.uint8))           # 往背景內縮一點，人物邊緣不吃火星
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)[..., None]
for t, f in enumerate(fs):
    im = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    lay = np.zeros((H * 2, W * 2, 3), np.float32)
    for p in P:
        a_ = ANG + p['cu'] * t
        dx, dy = math.cos(a_) * p['sp'], -math.sin(a_) * p['sp']
        x = (p['x'] + dx * t) % (W * 1.3) - W * .15; y = (p['y'] + dy * t) % (H * 1.3) - H * .15
        a = 0.55 + 0.45 * math.sin(t * p['fl'] * 2 + p['ph'])
        c = (np.array([255, 105 + 45 * a, 25 * a]) * a).tolist()
        cv2.line(lay, (int((x - dx * 1.6) * 2), int((y - dy * 1.6) * 2)), (int(x * 2), int(y * 2)), [v * .45 for v in c], max(1, int(p['r'] * 2)), cv2.LINE_AA)
        cv2.circle(lay, (int(x * 2), int(y * 2)), int(p['r'] * 2.2), c, -1, cv2.LINE_AA)
    lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_AREA)
    bgl = lay + cv2.GaussianBlur(lay, (0, 0), 3.5) * 2.2           # 背景層：黑底＋火星
    m = bgmask(im)
    out = np.clip(im * (1 - m) + np.maximum(im, bgl) * m, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(dst, os.path.basename(f)), 'WEBP', quality=92)
    Image.fromarray((m[..., 0] * 255).astype(np.uint8)).save(os.path.join(dst + '_mask', os.path.basename(f).replace('.webp', '.png')))
print(len(fs), 'frames', dst)

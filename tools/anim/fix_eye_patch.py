"""眼睛虹膜糊掉的後製修正（Bullet Rain 起用）：每格追蹤眼睛（搜尋框內最亮的那一塊），
把原圖（清楚的關鍵格）的眼睛小塊縮放對齊貼上去，邊緣羽化。看不到眼睛的格（亮塊太小）不動。

用法：python fix_eye_patch.py <格資料夾(去背 RGBA)> <輸出資料夾> --ref <原圖> --ref-box x0 y0 x1 y1 --search x0 y0 x1 y1 [--only 6 8 16]
  --ref-box：原圖上眼睛那一塊（含眼白與虹膜）的座標
  --search ：格上找眼睛的範圍（480×720 畫布座標）；之後每格以前一格的位置為中心縮小搜尋
"""
import argparse, glob, os
import numpy as np, cv2
from PIL import Image, ImageFilter
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--ref', required=True)
ap.add_argument('--ref-box', type=int, nargs=4, required=True); ap.add_argument('--search', type=int, nargs=4, required=True)
ap.add_argument('--thr', type=float, default=0.42); ap.add_argument('--min-px', type=int, default=25)
ap.add_argument('--only', type=int, nargs='*'); ap.add_argument('--scale', type=float, default=1.15)
ap.add_argument('--lav', type=float, default=12, help='眼睛的色偏門檻：b-g（淡紫／發光紫）＞此值才算，排除白牙與子彈')
ap.add_argument('--eye-w', type=float, default=0, help='眼睛寬度固定值（px）；0＝用偵測到的亮塊寬')
ap.add_argument('--fixed', action='store_true', help='頭幾乎不動的段落：所有格用同一個位置（中位數），眼睛完全不抖')
ap.add_argument('--track-box', type=int, nargs=4, help='⭐ 用這一大塊（臉、瀏海、鼻子）做相位相關算整顆頭的位移；眼睛位置＝基準格中心＋頭的位移（不再逐格用亮塊質心 ⇒ 不抖）')
a = ap.parse_args()

ref = Image.open(a.ref).convert('RGBA'); rb = Image.new('RGBA', ref.size, (0, 0, 0, 255)); rb.alpha_composite(ref)
patch = rb.convert('RGB').crop(a.ref_box)
pv = np.asarray(patch.convert('HSV'))[..., 2] / 255.
pm = (pv > a.thr).astype(np.uint8) * 255                                # 原圖眼睛的形狀（眼白＋虹膜）
pm = cv2.dilate(pm, np.ones((3, 3), np.uint8)); pmask = Image.fromarray(pm).filter(ImageFilter.GaussianBlur(1.6))
ys, xs = np.where(pm > 0); pw = xs.max() - xs.min() + 1; pcx, pcy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2

os.makedirs(a.out, exist_ok=True)
fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp')))
sx0, sy0, sx1, sy1 = a.search; log = []
# 第一輪：逐格找眼睛中心（淡紫亮塊的質心）；第二輪：時間上平滑後再貼（避免逐格抖）
found = {}
for k, f in enumerate(fs):
    if a.only is not None and k not in a.only: continue
    x = np.asarray(Image.open(f).convert('RGBA')).astype(np.float32); reg = x[sy0:sy1, sx0:sx1]
    v = reg[..., :3].max(-1) / 255. * (reg[..., 3] / 255.)
    m = ((v > a.thr) & (reg[..., 2] - reg[..., 1] > a.lav)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    if n > 1:
        j = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        if st[j, cv2.CC_STAT_AREA] >= a.min_px: found[k] = (sx0 + cen[j][0], sy0 + cen[j][1], st[j, cv2.CC_STAT_WIDTH])
ks = sorted(found)
pos = {}
if a.track_box and ks:
    # 基準：所有偵測格的中心取中位數，放在中位那一格；其餘格＝基準＋（該格相對基準格的整頭位移）
    tx0, ty0, tx1, ty1 = a.track_box
    def gray(k):
        x = np.asarray(Image.open(fs[k]).convert('RGBA')).astype(np.float32)
        g = x[ty0:ty1, tx0:tx1, :3].mean(-1) * (x[ty0:ty1, tx0:tx1, 3] / 255.)
        return g * cv2.createHanningWindow((g.shape[1], g.shape[0]), cv2.CV_32F)
    kb = ks[len(ks) // 2]; gb = gray(kb)
    bx = float(np.median([found[q][0] for q in ks])); by = float(np.median([found[q][1] for q in ks]))
    for q in range(ks[0], ks[-1] + 1):            # ⚠ 中間偵測不到的格也要貼（漏一格＝那一格閃回糊眼）
        (dx, dy), _ = cv2.phaseCorrelate(gb, gray(q))
        pos[q] = (bx + dx, by + dy)
        if q not in found: found[q] = (bx + dx, by + dy, a.eye_w or found[kb][2])
for k, f in enumerate(fs):
    im = Image.open(f).convert('RGBA'); out = im
    if k in found:
        if a.fixed and pos: cx = float(np.median([p[0] for p in pos.values()])); cy = float(np.median([p[1] for p in pos.values()]))
        elif pos: cx, cy = pos[k]
        else:
            near = [found[q] for q in ks if abs(q - k) <= 2]
            cx = float(np.median([p[0] for p in near])); cy = float(np.median([p[1] for p in near]))
        bw = a.eye_w or found[k][2]
        s = bw * a.scale / pw
        P = patch.resize((max(1, round(patch.width * s)), max(1, round(patch.height * s))), Image.LANCZOS)
        M = pmask.resize(P.size, Image.LANCZOS)
        ox, oy = round(cx - pcx * s), round(cy - pcy * s)
        base = im.copy(); layer = Image.new('RGBA', im.size, (0, 0, 0, 0)); layer.paste(P.convert('RGBA'), (ox, oy))
        mm = Image.new('L', im.size, 0); mm.paste(M, (ox, oy))
        out = Image.composite(layer, base, mm)
        o = np.asarray(out).copy(); o[..., 3] = np.maximum(np.asarray(base)[..., 3], np.asarray(mm)); out = Image.fromarray(o)
        log.append((k, round(cx, 1), round(cy, 1), round(s, 2)))
    out.save(os.path.join(a.out, os.path.basename(f)), 'WEBP', quality=95)
print('貼了', len(log), '格：', log)

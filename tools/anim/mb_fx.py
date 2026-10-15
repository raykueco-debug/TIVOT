"""托爾斯坦 MB：在 Wan 跑好的槍機底片上疊槍火與彈殼（Ray 10-14：「先跑開槍動作跟槍機，再把彈殼跟槍火做上去」）。
素材＝B3 裡 GPT 畫的火光與空彈殼（B3−B2 差異摳出）。
用法：python mb_fx.py <底片資料夾> <輸出資料夾> <開槍格> <噴殼格>
"""
import glob, os, shutil, json, sys, numpy as np, cv2
from PIL import Image
SRC, OUT, SHOT, EJECT = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
L = 'C:/Users/Ray Ku/Desktop/TIVOT/resources/ci/layers/torsten_mb/'
B2 = np.asarray(Image.open(L + 'mb_B2_slideback.png').convert('RGB')).astype(np.float32)
B3 = np.asarray(Image.open(L + 'mb_B3_fire.png').convert('RGB')).astype(np.float32)
diff = np.abs(B3 - B2).mean(2)
cx0, cy0, cx1, cy1 = 135, 395, 285, 525
hsv = cv2.cvtColor(B3.astype(np.uint8), cv2.COLOR_RGB2HSV)
cm = ((hsv[..., 1] > 50) & (hsv[..., 2] > 45)).astype(np.uint8)[cy0:cy1, cx0:cx1]
cm = cv2.morphologyEx(cm, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(cm); k = 1 + np.argmax(st[1:, 4]); cm = (lab == k).astype(np.uint8)
cnt, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cm = np.zeros_like(cm)
cv2.drawContours(cm, [cv2.convexHull(cnt[0])], -1, 1, -1)
cas = B3[cy0:cy1, cx0:cx1]; cas_a = cv2.GaussianBlur(cm.astype(np.float32), (3, 3), 0)
fm = (diff > 14).astype(np.uint8); fm[:380] = 0; fm[380:580, 120:300] = 0
fm = cv2.morphologyEx(fm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
fa = cv2.GaussianBlur(cv2.dilate(fm, np.ones((5, 5), np.uint8)).astype(np.float32), (9, 9), 0) * np.clip((diff - 6) / 20, 0, 1) ** 0.5
ys, xs = np.nonzero(fa > 0.02); fx0, fy0, fx1, fy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
fl = B3[fy0:fy1, fx0:fx1]; fl_a = fa[fy0:fy1, fx0:fx1]
S = 720 / 1066; MUZ = np.array([75., 975.])
fl_off = (np.array([(fx0 + fx1) / 2, (fy0 + fy1) / 2]) - MUZ) * S
rs = lambda a: cv2.resize(a, None, fx=S, fy=S)
flS, flaS, caS, caaS = rs(fl), rs(fl_a), rs(cas), rs(cas_a)

def paste(fr, spr, al, cx, cy, scale=1.0, rot=0):
    sp = cv2.resize(spr, None, fx=scale, fy=scale); a = cv2.resize(al, None, fx=scale, fy=scale); h, w = a.shape
    if rot:
        R = cv2.getRotationMatrix2D((w / 2, h / 2), rot, 1); sp = cv2.warpAffine(sp, R, (w, h)); a = cv2.warpAffine(a, R, (w, h))
    x0, y0 = int(cx - w / 2), int(cy - h / 2); H, W = fr.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xb <= xa or yb <= ya: return
    aa = a[ya - y0:yb - y0, xa - x0:xb - x0][..., None]
    fr[ya:yb, xa:xb] = fr[ya:yb, xa:xb] * (1 - aa) + sp[ya - y0:yb - y0, xa - x0:xb - x0] * aa

src = sorted(glob.glob(os.path.join(SRC, 'frame_*.webp')))
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
f0 = np.asarray(Image.open(src[SHOT - 1]).convert('L')).astype(np.float32); tx0, ty0, tw, th = 20, 620, 80, 80
tpl = f0[ty0:ty0 + th, tx0:tx0 + tw]
c0 = np.array([(cx0 + cx1) / 2, (cy0 + cy1) / 2]) * S
CAS = {EJECT: (0, 0, 0), EJECT + 1: (-48, -78, 45), EJECT + 2: (-100, -160, 95), EJECT + 3: (-150, -245, 150)}
for i, f in enumerate(src):
    fr = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    if i in (SHOT, SHOT + 1):
        g = np.asarray(Image.open(f).convert('L')).astype(np.float32)
        res = cv2.matchTemplate(g[ty0 - 60:ty0 + th + 60, tx0 - 20:tx0 + tw + 60].copy(), tpl, cv2.TM_CCOEFF_NORMED)
        _, _, _, ml = cv2.minMaxLoc(res)
        mx = tx0 - 20 + ml[0] + tw / 2; my = ty0 - 60 + ml[1] + th / 2; sc = 1.0 if i == SHOT else 0.6
        paste(fr, flS, flaS, mx + fl_off[0] * sc, my + fl_off[1] * sc, sc)
    if i in CAS:
        dx, dy, r = CAS[i]; paste(fr, caS, caaS, c0[0] + dx, c0[1] + dy, 1.0, r)
    Image.fromarray(fr.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, os.path.basename(f)), 'WEBP', quality=92)
json.dump({'fps': 16}, open(os.path.join(OUT, 'holds.json'), 'w'))
print(len(src), 'frames →', OUT)

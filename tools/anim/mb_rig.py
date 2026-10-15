"""托爾斯坦 MB 開槍：分層動畫（Ray 10-14：VACE 補間做不出滑套／拋殼，改程式逐格算）。
環境層＝Wan 跑的 A→A 循環（頭髮、煙在動），槍＋手這一組從 A 摳出來由程式動：
  滑套沿槍管往後→覆進、整組以握把為軸後座上揚、B 的火光、B 的彈殼從拋殼窗拋物線飛出。
座標全部是原圖 1066x1476，最後縮到環境層的尺寸。
"""
import glob, os, json, math, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
AMB = os.path.join(HERE, 'out', 'ci', sys.argv[1] if len(sys.argv) > 1 else 'mb_A_amb7')
OUT = os.path.join(HERE, 'out', 'ci', sys.argv[2] if len(sys.argv) > 2 else 'ci_torsten_mb_rig1')
A = np.asarray(Image.open(os.path.join(HERE, 'in_mb', 'mb_A.png')).convert('RGB')).astype(np.float32)
B = np.asarray(Image.open(os.path.join(HERE, 'in_mb', 'mb_B.png')).convert('RGB')).astype(np.float32)
H0, W0 = A.shape[:2]

def poly_mask(pts, feather=2):
    m = Image.new('L', (W0, H0), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(feather))).astype(np.float32) / 255

# 槍＋手＋袖口（後座力整組轉）
GROUP = [(30, 895), (95, 828), (425, 500), (462, 455), (565, 462), (610, 560), (615, 790), (655, 950),
         (668, 1235), (430, 1215), (300, 1185), (215, 1310), (40, 1310)]
# 滑套（沿槍管後退）：槍口面＋上緣＋側面，到側面下緣那條接縫為止
SLIDE = [(36, 898), (95, 828), (155, 790), (430, 503), (465, 458), (562, 468), (566, 556), (502, 640),
         (212, 1238), (206, 1302), (58, 1302), (40, 1200)]
gm, sm = poly_mask(GROUP), poly_mask(SLIDE, 1.5)
AX = np.array([0.58, -0.81]); AX /= np.linalg.norm(AX)      # 槍口→槍尾
PIVOT = (560, 1150)                                          # 握把（手腕）
PORT = np.array([505, 545.])                                 # 拋殼窗（滑套右上靠後）
MUZZLE = np.array([112, 1075.])

# 彈殼精靈：從 B 摳
cx0, cy0, cx1, cy1 = 40, 250, 180, 420
cas = B[cy0:cy1, cx0:cx1]
hsv = cv2.cvtColor(cas.astype(np.uint8), cv2.COLOR_RGB2HSV)
cm = ((hsv[..., 0] < 32) & (hsv[..., 1] > 55) & (hsv[..., 2] > 45)).astype(np.uint8)
cm = cv2.morphologyEx(cm, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(cm); k = 1 + np.argmax(st[1:, 4]); cm = (lab == k).astype(np.uint8)
cnt, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cm = np.zeros_like(cm)
cv2.drawContours(cm, [cv2.convexHull(cnt[0])], -1, 1, -1)
cas_a = cv2.GaussianBlur(cm.astype(np.float32), (3, 3), 0)

# 火光：程式畫在槍口（核心＋放射光芒），不取 B 的像素（B 的槍身輪廓會一起被摳進來）
def make_flash(r=150, rays=9, seed=3):
    rng = np.random.default_rng(seed); S = r * 2 + 1
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32); d = np.hypot(xx, yy) / r; th = np.arctan2(yy, xx)
    core = np.clip(1 - d / 0.5, 0, 1) ** 0.5
    ray = np.zeros_like(d)
    for k in range(rays):
        a0 = rng.uniform(-np.pi, np.pi); w = rng.uniform(0.06, 0.13); L = rng.uniform(0.6, 1.0)
        dd = np.abs(np.angle(np.exp(1j * (th - a0))))
        ray = np.maximum(ray, np.clip(1 - dd / w, 0, 1) * np.clip(1 - d / L, 0, 1))
    return np.clip(np.maximum(core, ray * 1.0), 0, 1)
FLASH = make_flash(r=430, rays=12)
LB = B.mean(2).astype(np.float32); FL_B = np.array([107, 1134.])   # B 的火光核心重心
def warp(img, M, border=cv2.BORDER_REPLICATE):
    return cv2.warpAffine(img, M, (W0, H0), flags=cv2.INTER_LINEAR, borderMode=border)

def rot_M(deg, piv):
    return cv2.getRotationMatrix2D(piv, deg, 1.0)

# 逐格參數：(滑套後退px, 後座角度°, 火光強度, 彈殼 t)
PLAN = {2: (75, 3.0, 1.0, 0), 3: (75, 6.5, 0.55, 1), 4: (55, 7.0, 0.15, 2), 5: (25, 5.5, 0, 3),
        6: (0, 3.8, 0, 4), 7: (0, 2.2, 0, 5), 8: (0, 1.0, 0, 6), 9: (0, 0.3, 0, 7)}
for f in range(10, 16): PLAN[f] = (0, 0, 0, f - 2)

fs = sorted(glob.glob(os.path.join(AMB, 'frame_*.webp')))
os.makedirs(OUT, exist_ok=True)
aw, ah = Image.open(fs[0]).size
# 乾淨底：A 去掉槍組（後座轉動時邊緣露出來用）
clean = cv2.inpaint(A.astype(np.uint8), (gm > 0.3).astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA).astype(np.float32)
for i, fp in enumerate(fs):
    env = np.asarray(Image.open(fp).convert('RGB').resize((W0, H0), Image.LANCZOS)).astype(np.float32)
    slide, ang, fl, ct = PLAN.get(i, (0, 0, 0, None))
    if i not in PLAN and i >= 16: ct = None
    if (slide, ang, fl) == (0, 0, 0) and ct is None:
        frame = env
    else:
        # 1) 槍組在 A 上：滑套沿槍管後退
        gun = A.copy()
        if slide:
            T = np.float32([[1, 0, AX[0] * slide], [0, 1, AX[1] * slide]])
            s_img, s_a = warp(A, T), warp(sm, T, cv2.BORDER_CONSTANT)
            exposed = np.clip(sm - s_a, 0, 1)[..., None]                # 滑套離開後露出的地方＝槍管暗色金屬
            gun = gun * (1 - exposed) + clean * exposed
            gun = gun * (1 - s_a[..., None]) + s_img * s_a[..., None]
        # 2) 後座：整組以握把為軸逆時針上揚（槍口在左 → 角度取正＝往上）
        M = rot_M(-ang, PIVOT) if ang else np.float32([[1, 0, 0], [0, 1, 0]])
        g_img, g_a = warp(gun, M), warp(gm, M, cv2.BORDER_CONSTANT)
        base = env * (1 - gm[..., None]) + clean * gm[..., None]
        frame = base * (1 - g_a[..., None]) + g_img * g_a[..., None]
        # 3) 火光（跟著槍口轉）
        if fl:
            mz = M @ np.array([*MUZZLE, 1])
            T = np.float32([[1, 0, mz[0] - FL_B[0]], [0, 1, mz[1] - FL_B[1]]])
            lbw = warp(LB, T, cv2.BORDER_CONSTANT); fc = warp(B, T)
            fa = np.clip((lbw - 140) / 80, 0, 1)
            on_gun = np.clip(g_a, 0, 1)                                  # 槍身上只留近白的高光，B 的槍身輪廓不帶進來
            fa = fa * (1 - on_gun) + np.clip((lbw - 215) / 30, 0, 1) * on_gun
            fa = (fa * fl)[..., None]
            frame = frame * (1 - fa) + np.maximum(frame, fc) * fa
        # 4) 彈殼：從拋殼窗往右上彈出、拋物線落下、邊飛邊轉
        if ct is not None:
            port = M @ np.array([*PORT, 1])
            t = ct
            x = port[0] + 150 * t
            y = port[1] - 190 * t + 22 * t * t
            sc = 0.6 + 0.25 * t
            spr = cv2.resize(cas, None, fx=sc, fy=sc); sa = cv2.resize(cas_a, None, fx=sc, fy=sc)
            h, w = sa.shape; R = cv2.getRotationMatrix2D((w / 2, h / 2), -70 * t, 1.0)
            spr = cv2.warpAffine(spr, R, (w, h)); sa = cv2.warpAffine(sa, R, (w, h))
            x0, y0 = int(x - w / 2), int(y - h / 2)
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W0, x0 + w), min(H0, y0 + h)
            if xb > xa and yb > ya:
                a = sa[ya - y0:yb - y0, xa - x0:xb - x0][..., None]
                frame[ya:yb, xa:xb] = frame[ya:yb, xa:xb] * (1 - a) + spr[ya - y0:yb - y0, xa - x0:xb - x0] * a
    Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).resize((aw, ah), Image.LANCZOS).save(
        os.path.join(OUT, os.path.basename(fp)), 'WEBP', quality=92)
json.dump({'fps': 16}, open(os.path.join(OUT, 'holds.json'), 'w'))
print(len(fs), 'frames →', OUT)

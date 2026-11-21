"""背景線（11-21）：城鎮背景的天空拆層 —— 天空遮罩＋乾淨天色＋原圖自己的雲拆成遠／中／近三層，雲交給程式動（bgfx 的 sky.layers）。
Ray：「把城鎮的天空都摳了 用程式跑雲」。

輸入：
  原圖  resources/background/<城>/<名>.webp
  遮罩  GPT 把天空與雲塗成洋紅 #FF00FF 的那一張（<工作夾>/<名>__sky.png；尺寸可不同，縮回原圖）
輸出（<工作夾>/<名>/）：
  skymask.png   白＝天空（往內收 1px、羽化 1px），與原圖同尺寸
  sky.png       乾淨天色（無雲；天空範圍以外延伸填滿，RGB）
  cloud_far.png／cloud_mid.png／cloud_near.png   原圖的雲（RGBA，未預乘），依雲塊重心高度分層
  moon.png      （有月亮才有）月亮本體，RGBA —— 程式固定貼在原位，不跟雲動
  meta.json     天空下緣、各層雲塊數
用法：python town_sky.py <原圖> <洋紅圖> <輸出夾> [--moon]"""
import json, os, sys
import numpy as np, cv2
from PIL import Image

src, magp, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
O = np.array(Image.open(src).convert('RGB')).astype(np.float32)
H, W = O.shape[:2]
G = np.array(Image.open(magp).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.int32)
mag = ((G[..., 0] > 180) & (G[..., 2] > 180) & (G[..., 1] < 90)).astype(np.uint8)
mag = cv2.morphologyEx(mag, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
# 只留跟上緣連著的天空（建築窗戶裡誤塗的洋紅不算）
n, lab = cv2.connectedComponents(mag)
keep = set(np.unique(lab[0][lab[0] > 0]))
sky = np.isin(lab, list(keep)).astype(np.uint8)
m = cv2.erode(sky, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.0)
Image.fromarray((alpha * 255).clip(0, 255).astype(np.uint8)).save(os.path.join(out, 'skymask.png'))
ys = np.where(sky.any(1))[0]; ybot = int(ys.max())

# ── 乾淨天色：取「最像天」的像素（彩度高、不太亮）擬合 x、y 的二次曲面，逐通道 ──
hsv = cv2.cvtColor(O.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
inner = cv2.erode(sky, np.ones((9, 9), np.uint8)).astype(bool)
sat, val = hsv[..., 1], hsv[..., 2]
cand = inner & (sat > np.percentile(sat[inner], 45))
yy, xx = np.nonzero(cand)
if len(yy) < 500: yy, xx = np.nonzero(inner)
xn, yn = xx / W, yy / max(1, ybot)
A = np.stack([np.ones_like(xn), xn, yn, xn * xn, yn * yn, xn * yn, yn ** 3], 1)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
Xn, Yn = XX / W, np.minimum(YY, ybot) / max(1, ybot)
AF = np.stack([np.ones_like(Xn), Xn, Yn, Xn * Xn, Yn * Yn, Xn * Yn, Yn ** 3], -1)
plate = np.zeros_like(O)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, O[yy, xx, c], rcond=None)
    # 兩輪：第一輪的殘差裡最亮的（雲邊）剔掉再擬一次
    r = O[yy, xx, c] - A @ coef; ok = np.abs(r) < np.percentile(np.abs(r), 80)
    coef, *_ = np.linalg.lstsq(A[ok], O[yy[ok], xx[ok], c], rcond=None)
    plate[..., c] = AF @ coef
# 逐列補正：地平線附近的天光（變淡那一段）二次曲面貼不住，取每一列候選像素與曲面的中位差、上下平滑後補回
corr = np.zeros((H, 3), np.float32); have = np.zeros(H, bool)
for y in range(ybot + 1):
    xs = xx[yy == y]
    if len(xs) > 20: corr[y] = np.median(O[y, xs] - plate[y, xs], 0); have[y] = True
if have.any():
    idx = np.arange(H)
    for c in range(3): corr[:, c] = np.interp(idx, idx[have], corr[have, c])
    corr = cv2.GaussianBlur(corr[:, None, :], (1, 0), sigmaX=0.1, sigmaY=6)[:, 0, :]
    corr[ybot + 1:] = corr[ybot]
    plate += corr[:, None, :]
plate = plate.clip(0, 255)

# ── 月亮（夜景）：比天色亮很多的圓塊，留在 moon.png，從雲層裡挖掉 ──
moonA = np.zeros((H, W), np.float32)
if '--moon' in sys.argv:
    lum = O.mean(2) - plate.mean(2)
    b = ((lum > 90) & sky.astype(bool)).astype(np.uint8)
    k, lb, st, ce = cv2.connectedComponentsWithStats(b)
    if k > 1:
        i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); cx, cy = ce[i]; r = max(st[i, 2], st[i, 3]) * 0.5 * 1.6
        moonA = np.clip((r - np.hypot(XX - cx, YY - cy)) / 3.0, 0, 1)   # 連光暈一起取
        rgba = np.dstack([O, moonA * 255 * alpha]).clip(0, 255).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'moon.png'))

# ── 雲：與天色的差（偏亮的那一側），換成 alpha ＋ 反解未預乘的顏色 ──
d = np.sqrt(((O - plate) ** 2).sum(2))
# 雲＝比天色「白」：彩度降、亮度不降（地平線的淡天光彩度也降，但貼著天際線那一圈另外壓掉）
sp = cv2.cvtColor(plate.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)[..., 1]
white = np.clip((sp - sat) / 40.0, 0, 1) * (val >= sp * 0 + cv2.cvtColor(plate.astype(np.uint8), cv2.COLOR_RGB2HSV)[..., 2] - 25)
edge = np.clip(cv2.distanceTransform(sky, cv2.DIST_L2, 3) / 6.0, 0, 1)
a = np.clip((d - 6) / 34.0, 0, 1) * np.maximum(white, 0) * edge * alpha * (1 - moonA)
a = cv2.GaussianBlur(a, (0, 0), 0.6)
col = (O - (1 - a[..., None]) * plate) / np.maximum(a[..., None], 1e-3)
col = np.where(a[..., None] > 0.02, col, O).clip(0, 255)

# 依雲塊重心分層（同一塊雲不切開）：上三分之一＝近、下三分之一＝遠
blob = (a > 0.08).astype(np.uint8)
blob = cv2.dilate(blob, np.ones((5, 5), np.uint8))
k, lb, st, ce = cv2.connectedComponentsWithStats(blob)
cut1, cut2 = ybot * 0.36, ybot * 0.68
which = np.zeros(k, np.int32)
for i in range(1, k): which[i] = 2 if ce[i][1] < cut1 else (1 if ce[i][1] < cut2 else 0)
names = ['far', 'mid', 'near']; cnt = {}
for j, nm in enumerate(names):
    sel = (which[lb] == j) & (lb > 0)
    aa = a * sel
    Image.fromarray(np.dstack([col, aa * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, f'cloud_{nm}.png'))
    cnt[nm] = int(((which == j) & (np.arange(k) > 0)).sum())
Image.fromarray(plate.astype(np.uint8)).save(os.path.join(out, 'sky.png'))
json.dump({'w': W, 'h': H, 'skyBottom': ybot, 'clouds': cnt, 'moon': bool(moonA.any())}, open(os.path.join(out, 'meta.json'), 'w'))
print(out, 'skyBottom', ybot, cnt)

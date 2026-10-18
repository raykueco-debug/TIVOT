# 宣傳片：勿忘我花瓣特效（透明疊加層，1080×1920 60fps）。
#   片內時間 0 ＝全片 62.0 秒；結束＝MB 開播（全片 66.817）。
#   花瓣由右下被風捲進來，一路往左上飄飛（12 格／秒），錯開時間一片一片飄出畫面、越來越少；
#   最後半秒一片巨大的花瓣從左上往右下劃過整個畫面當轉場 —— 離開畫面那一格＝結束＝MB 開播
#
#   py -X utf8 tools/promo/petal_fx.py --samples <資料夾> [<底圖影片> <底圖起點秒>]
#   py -X utf8 tools/promo/petal_fx.py --render <輸出.webm>          （VP9＋alpha，剪輯器疊在快剪上面）
import os, sys, math, random, glob, subprocess
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PET = os.path.join(ROOT, 'tools/promo/editor/media/generated/petals')
W, H, FPS = 1080, 1920, 60
T0 = 62.0; MB = 66.81666666666666; DUR = MB - T0
# 只用花瓣（不用花苞）；整朵花只出一朵（fmn_05）。fmn4_05、fmn_08 有切圖雜邊，不用。
PETALS = ['fmn4_01', 'fmn4_02', 'fmn4_03', 'fmn4_04', 'fmn4_06', 'fmn4_07', 'fmn4_08', 'fmn4_14', 'fmn4_15', 'fmn4_16',
          'fmn_01', 'fmn_02', 'fmn_03', 'fmn_04', 'fmn_09', 'fmn_10', 'fmn_11', 'fmn_12']
FLOWER = 'fmn_05'
HERO = 'fmn_01'
# 最後劃過全畫面的那一片要另外一張高解析（ver -2224，Ray：「最後一片讓 gpt 重畫一張單獨的，不然解析不好」）
HERO_SPR = Image.open(os.path.join(PET, 'hero_petal.png')).convert('RGBA')
# ── 逆光（ver -2224，Ray：「在藍天下逆光，其他場景淡入到正常顏色」）──
#   藍天那一段（甲板鏡頭，到快剪開始 63.417 為止）花瓣是逆光：本體壓暗偏深藍、外緣一圈暖白的輪廓光＋一層柔光暈；
#   快剪開始後 0.33 秒內淡回原本的顏色。每張圖預先做好「正常／逆光」兩版（同樣外擴 PADPX，才能逐格混合）。
PADPX = 18
BACKLIT_UNTIL, BACKLIT_FADE = 63.41666666666666 - T0, 0.33
def _pad(im):
    c = Image.new('RGBA', (im.width + 2 * PADPX, im.height + 2 * PADPX), (0, 0, 0, 0)); c.paste(im, (PADPX, PADPX)); return c
def _backlit(im):
    a = np.asarray(im, float); al = a[..., 3:] / 255
    body = a[..., :3] * 0.42 + np.array([18, 30, 78]) * 0.58                 # 背光面：暗、偏深藍
    A = Image.fromarray(a[..., 3].astype(np.uint8))
    er = np.asarray(A.filter(ImageFilter.MinFilter(7)), float) / 255
    rim = np.clip(al[..., 0] - er, 0, 1)[..., None]                            # 外緣那一圈
    rim = np.asarray(Image.fromarray((rim[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), float)[..., None] / 255
    # ver -2224（Ray：「不要白邊」）：不畫白色輪廓光；邊緣只微微透一點天藍
    rgb = body * (1 - rim * 0.45) + np.array([120, 165, 235]) * rim * 0.45
    halo = np.asarray(A.filter(ImageFilter.GaussianBlur(9)), float)[..., None] / 255   # 柔光暈（外擴到輪廓外）
    out_a = np.clip(al + halo * 0.30, 0, 1)
    out_rgb = (rgb * al + np.array([110, 160, 235]) * halo * 0.30 * (1 - al)) / np.maximum(out_a, 1e-3)
    return Image.fromarray(np.dstack([np.clip(out_rgb, 0, 255), out_a * 255]).astype(np.uint8), 'RGBA')
def _no_white_rim(im):
    # GPT 的花瓣外緣有一段一段的白色高光（量過：外圈 15～24% 的像素接近白）—— 外圈 5px 內偏白的像素
    # 換成附近內側的顏色（模糊過的本體色），白邊就沒了；內側的花脈與高光不動。
    a = np.asarray(im, float); al = a[..., 3]
    A = Image.fromarray(al.astype(np.uint8))
    inner = np.asarray(A.filter(ImageFilter.MinFilter(11)), float) > 220
    ring = (al > 8) & ~inner
    body = a[..., :3] * inner[..., None]
    w = np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), float)[..., None] / 255
    blur = np.stack([np.asarray(Image.fromarray(body[..., c].astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), float) for c in range(3)], -1)
    local = blur / np.maximum(w, 1e-3)
    whit = np.clip((a[..., :3].min(-1) - 150) / 60, 0, 1) * ring
    a[..., :3] = a[..., :3] * (1 - whit[..., None]) + local * whit[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
SPR = {}; SPR_BL = {}
for n in PETALS + [FLOWER]:
    im = _pad(_no_white_rim(Image.open(os.path.join(PET, n + '.png')).convert('RGBA')))
    SPR[n] = im; SPR_BL[n] = _backlit(im)
def backlit_k(t):
    if t <= BACKLIT_UNTIL: return 1.0
    return max(0.0, 1 - (t - BACKLIT_UNTIL) / BACKLIT_FADE)
def sprite_at(n, t):
    k = backlit_k(t)
    if k >= 1: return SPR_BL[n]
    if k <= 0: return SPR[n]
    return Image.blend(SPR[n], SPR_BL[n], k)

def ease_in_out(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)
def bez(p0, p1, p2, t): return tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c for a, b, c in zip(p0, p1, p2))

# ══ v2（ver -2224，Ray：「F 率太高，看起來不像被風捲起而像是灑花；不要散開，一直飄飛，像是經歷了那些場景後
#   一片一片越來越少；最後一片直接從左上往右下全畫面切下用來轉景」）══
#   · 花瓣只跑 PET_FPS 格／秒（一格停好幾個 60fps 影格，動畫的「一拍三」），讀起來是被風帶著走，不是滑順地灑。
#   · 每一片從右下被風帶進來，沿一條往左上的路一路飄（左右擺盪、翻面、打轉），自己飄出畫面就沒了 ——
#     出畫的時刻刻意錯開（EXIT_FROM～EXIT_TO 平均分配），所以畫面上一片一片變少。
#   · 最後一片（HERO）放大到蓋滿整個畫面，從左上往右下劃過去當轉場；出畫那一格＝結束＝MB 開播。
PET_FPS, HERO_FPS = 12, 24
# 減格（ver -2224，Ray：「把原 f 率平均抽成 1/4，然後剩下的每隔 1f 就 ×2」）：
#   60fps 先抽成每 4 格留 1 格，留下來的再隔一格停兩倍 ⇒ 停 4 格、停 8 格、停 4 格、停 8 格……
#   節奏不均勻，比等間隔的 12fps 更像手繪動畫的時間感。每一次停格取的是「停格開始那一刻」的狀態。
HOLDS = (1.5, 3.0)   # ver -2224 Ray：「花瓣改成 2/3 F」（基數 2/3；之前 1/2 ＝ (2, 4)、1/4 ＝ (4, 8)）
_HOLD_STARTS = []
_f = 0.0; _k = 0
while _f < 100000:
    _HOLD_STARTS.append(int(_f)); _f += HOLDS[_k % 2]; _k += 1   # 小數的停格長度累加後取整 ⇒ 1,3,2,3,1,3…
def held_time(t):
    f = int(round(t * FPS)); lo, hi = 0, len(_HOLD_STARTS) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if _HOLD_STARTS[mid] <= f: lo = mid
        else: hi = mid - 1
    return _HOLD_STARTS[lo] / FPS
EXIT_FROM, EXIT_TO = 1.0, 4.45   # ver -2224 一陣風：頭一批被搖鏡那一甩帶走，其餘一路少到主瓣切下
HERO_AT = DUR - 0.5
rng = random.Random(62)
rng2 = random.Random(7)   # ver -2224（Ray：「花瓣速度太平均，要有的快有的慢」）：快慢與陣風另一顆種子，原本的排位不動
P = []
N = 62
order = list(range(N)); rng.shuffle(order)
for i in range(N):
    name = FLOWER if i == 5 else PETALS[i % len(PETALS)]
    z = rng.choice([rng.uniform(0.40, 0.70), rng.uniform(0.70, 1.10), rng.uniform(0.70, 1.10), rng.uniform(1.10, 1.50)])   # 遠／中／中／近
    if name == FLOWER: z = 1.0
    te = EXIT_FROM + (EXIT_TO - EXIT_FROM) * (order[i] / (N - 1)) + rng.uniform(-0.08, 0.08)   # 出畫時間：錯開
    if name == FLOWER: te = 2.6
    travel = 2.4 / (0.45 + 0.55 * z)                                             # 遠的飄得慢（走同一段要比較久）
    spd = rng2.choice([rng2.uniform(0.90, 1.10), rng2.uniform(1.30, 1.65), rng2.uniform(1.30, 1.65), rng2.uniform(2.2, 3.0)])   # 慢／中／中／快（Ray：「太慢」→ 整組往上推）
    if name == FLOWER: spd = 1.0
    travel = travel / spd
    tmin = rng.uniform(0.0, 0.25)
    if te - travel < tmin: travel = te - tmin                                    # 早出畫的那幾片沒時間慢慢飄 ⇒ 自然被推快
    ts = te - travel                                                             # 進場時間
    s0 = (W * rng.uniform(0.80, 1.25), H * rng.uniform(0.80, 1.18))           # 右下（大多在畫面外）
    s1 = (W * rng.uniform(-0.35, 0.55), -H * rng.uniform(0.10, 0.25)) if rng.random() < 0.7 else (-W * rng.uniform(0.2, 0.35), H * rng.uniform(0.0, 0.45))   # 左上出口（上緣或左緣外）
    mid = ((s0[0] + s1[0]) / 2 + rng.uniform(-260, 260), (s0[1] + s1[1]) / 2 + rng.uniform(-200, 260))
    P.append(dict(name=name, ts=ts, te=te, s0=s0, s1=s1, mid=mid, size=(150 if name == FLOWER else rng.uniform(55, 125)),
                  rot0=rng.uniform(0, 360), vrot=rng.uniform(-220, 220), flip=rng.uniform(2.5, 6.0), fph=rng.uniform(0, 6.28),
                  wob=rng.uniform(25, 90) * z, wfr=rng.uniform(1.2, 2.6), wph=rng.uniform(0, 6.28), depth=z,
                  gust=rng2.uniform(0.35, 0.85), gn=rng2.choice([1, 1.5, 2, 2.5]), gph=rng2.uniform(0, 6.28)))

# ══ 一陣風（ver -2224，Ray：「看起來像在爬動不像在飄 —— 花是被風捲起，要配合蕾娜頭髮吹開那一 cut 的搖鏡速度」）══
#   v6~v8 每一片各走一條自己的速度曲線＋時間上的左右擺 ⇒ 慢的時候讀起來像在原地爬。
#   改成：**所有花瓣共乘同一陣風**，風速曲線照那一 cut 量出來的搖鏡（phase correlation 實測，deck_long_v1_1.mp4）：
#     本片 0~0.6s 鏡頭停著、頭髮被吹 → 風漸起；0.65~0.85s 鏡頭往左上甩（峰值約 4000 px/s）→ 指數收（τ≈0.28s）；
#     之後是快剪那一段「飛快飄散」的巡航風，慢慢收到 4.3s 主瓣切下。
#   快慢只來自**遠近視差**與每片一點點個性（×0.85~1.2）—— 同一陣風裡近的快、遠的慢，才是「被風捲」不是「各自在爬」。
#   ⚠ 捲曲是**沿路徑的空間波**（跟著走過的距離轉），不是隨時間左右晃 —— 後者在風慢時就是原地抖。
WIND_DIR = (-0.80, -0.60)                       # 往左上（＝鏡頭甩的方向）
WIND_N   = (0.60, -0.80)                        # 垂直方向（捲曲用）
def wind_v(t):
    ramp = 350 + 650 * ease_in_out(t / 0.62)                                   # 頭髮被吹：風漸起
    pan  = 3900 * math.exp(-max(0.0, t - 0.78) / 0.28) * ease_in_out((t - 0.58) / 0.20) if t > 0.58 else 0.0   # 搖鏡那一甩
    cruise = (900 - 250 * ease_in_out((t - 1.4) / 2.9)) if t > 0.6 else 0.0    # 快剪段：飛快飄散，慢慢收
    return max(ramp if t < 0.9 else 0.0, pan, cruise)
_WD = [0.0]; _WSTEP = 1 / 600
for _k in range(int((DUR + 1) / _WSTEP) + 2): _WD.append(_WD[-1] + wind_v(_k * _WSTEP) * _WSTEP)
def wind_d(t):
    f = max(0.0, t) / _WSTEP; k = int(f); k = min(k, len(_WD) - 2); a = f - k
    return _WD[k] * (1 - a) + _WD[k + 1] * a
# ══ 後段 2/3 快飛、1/3 慢飄（Ray：「開頭可以，但是後面的花瓣速度太勻」）══
#   開頭（風漸起＋搖鏡那一甩）照舊共乘一陣風；甩完之後的巡航風**逐片乘一個倍率**：
#   快飛組 ×1.5~2.1、慢飄組 ×0.22~0.35（慢飄的另加一點低頻的上下浮，才讀得出是「飄」不是「停」）。
#   ⚠ 每片的距離表各自積分（v＝max(開頭那陣風, 倍率×巡航)），不能拿一張共用表乘 —— 兩段的倍率不同。
def open_v(t):
    ramp = 350 + 650 * ease_in_out(t / 0.62) if t < 0.9 else 0.0
    pan  = 3900 * math.exp(-max(0.0, t - 0.78) / 0.28) * ease_in_out((t - 0.58) / 0.20) if t > 0.58 else 0.0
    return max(ramp, pan)
def cruise_v(t):
    return (900 - 250 * ease_in_out((t - 1.4) / 2.9)) if t > 0.6 else 0.0
_NT = int((DUR + 1) / _WSTEP) + 2
_OV = np.array([open_v(k * _WSTEP) for k in range(_NT)]); _CV = np.array([cruise_v(k * _WSTEP) for k in range(_NT)])
def _table(kc):
    return np.concatenate([[0.0], np.cumsum(np.maximum(_OV, kc * _CV) * _WSTEP)])
def pdist(p, t):
    tab = p['tab']; f = max(0.0, t) / _WSTEP; k = min(int(f), len(tab) - 2); a = f - k
    return (tab[k] * (1 - a) + tab[k + 1] * a) * p['mul']
rng3 = random.Random(11)
_late = [i for i in range(len(P)) if P[i]['te'] >= 2.3]                        # 慢飄的要撐到後段 ⇒ 從晚出畫的那一批裡挑
_slow = set(rng3.sample(_late, min(len(_late), 11)))   # 快飛的在畫面上停得短 ⇒ 慢飄組取 11 片，畫面上看起來才是約 2/3 快、1/3 慢
for _i, p in enumerate(P):
    z = p['depth']
    p['slow'] = (_i in _slow) and p['name'] != FLOWER
    p['kc'] = rng3.uniform(0.32, 0.5) if p['slow'] else rng3.uniform(1.5, 2.1)
    p['tab'] = _table(p['kc'])
    p['fa'] = rng3.uniform(25, 55) * z if p['slow'] else 0.0; p['ff'] = rng3.uniform(0.35, 0.6); p['fp'] = rng3.uniform(0, 6.28)
    p['mul'] = (0.55 + 0.45 * z) * rng3.uniform(0.85, 1.2)
    p['camp'] = rng3.uniform(40, 150) * z; p['clam'] = rng3.uniform(520, 1150); p['cph'] = rng3.uniform(0, 6.28)
    ex = p['s1']; dte = pdist(p, p['te'])
    p['base'] = (ex[0] - WIND_DIR[0] * dte, ex[1] - WIND_DIR[1] * dte)
    if p['slow']:
        # 慢飄：甩完那一刻（1.3s）停在畫面裡的某處，之後慢慢飄出左上；出畫時間是算出來的（不是指定的）
        q = (W * rng3.uniform(0.10, 0.95), H * rng3.uniform(0.15, 0.95)); d13 = pdist(p, 1.3)
        p['base'] = (q[0] - WIND_DIR[0] * d13, q[1] - WIND_DIR[1] * d13); p['te'] = DUR
    b = p['base']; p['pop'] = (-200 < b[0] < W + 200 and -200 < b[1] < H + 200)   # 一開場就在畫面裡的 ⇒ 淡入，不要憑空冒出來

def petal_state(p, t):
    if t > p['te']: return None
    d = pdist(p, t)
    if p['slow'] and pdist(p, t) > 0 and p['base'][0] + WIND_DIR[0] * d < -300: return None
    x = p['base'][0] + WIND_DIR[0] * d; y = p['base'][1] + WIND_DIR[1] * d
    c = p['camp'] * math.sin(2 * math.pi * d / p['clam'] + p['cph'])          # 捲：沿路徑轉
    x += WIND_N[0] * c; y += WIND_N[1] * c
    if p['fa']: y += p['fa'] * math.sin(2 * math.pi * p['ff'] * t + p['fp']) * ease_in_out((t - 1.0) / 0.6)   # 慢飄：低頻浮沉（甩完才開始）
    sc = p['size'] * p['depth']
    rot = p['rot0'] + p['vrot'] * 0.35 * t + d * 0.12 * (1 if p['vrot'] >= 0 else -1)   # 轉速跟著風走
    fl = math.cos(p['flip'] * 0.6 * t + d / 260 + p['fph'])
    return x, y, sc, rot, fl, (min(1.0, t / 0.25) if p.get('pop') else 1.0)

def hero_state(t):
    if t < HERO_AT: return None
    k = (t - HERO_AT) / (DUR - HERO_AT)                                  # 0 → 1，1＝剛好整片離開畫面
    k = k ** 1.15
    x = -W * 0.95 + (W * 2.9) * k; y = -H * 0.75 + (H * 2.5) * k         # 左上（畫面外）→ 右下（畫面外）
    sc = 2900                                                            # 大到蓋滿整個畫面
    return x, y, sc, 128, 0.9, 1.0, 3

_LOOK = {}
def depth_look(spr, z):
    # 遠的：往天空的淡藍灰靠（空氣透視）、彩度低一點；近的照原色
    if z >= 0.9: return spr
    key = (id(spr), round(z, 2))
    if key in _LOOK: return _LOOK[key]
    a = np.asarray(spr, float); k = (0.9 - z) / 0.5 * 0.45
    a[..., :3] = a[..., :3] * (1 - k) + np.array([185, 205, 232]) * k
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    if len(_LOOK) > 4000: _LOOK.clear()
    _LOOK[key] = im; return im
def paste(canvas, spr, x, y, sc, rot, fl, al, blur=0):
    w0, h0 = spr.size; s = sc / max(w0, h0)
    w = max(2, int(w0 * s * max(0.12, abs(fl)))); h = max(2, int(h0 * s))
    im = spr.convert('RGBa').resize((w, h), Image.BILINEAR)
    if fl < 0: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.rotate(rot, resample=Image.BILINEAR, expand=True)
    if blur > 0.5: im = im.filter(ImageFilter.GaussianBlur(blur))
    im = im.convert('RGBA')
    if al < 1:
        a = im.getchannel('A').point(lambda v: int(v * al)); im.putalpha(a)
    ox, oy = int(x - im.width / 2), int(y - im.height / 2)
    # 只貼看得到的那一塊（alpha_composite 不收負座標）
    cx0, cy0 = max(0, -ox), max(0, -oy); cx1, cy1 = min(im.width, W - ox), min(im.height, H - oy)
    if cx1 <= cx0 or cy1 <= cy0: return
    canvas.alpha_composite(im.crop((cx0, cy0, cx1, cy1)), (ox + cx0, oy + cy0))

def frame(t):
    cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    tp = held_time(t)                                                   # Ray 的減格法（見 HOLDS）
    for p in sorted(P, key=lambda p: p['depth']):
        st = petal_state(p, tp)
        if not st: continue
        x, y, sc, rot, fl, al = st
        if x < -300 or x > W + 300 or y < -300 or y > H + 300: continue
        z = p['depth']
        spr = depth_look(sprite_at(p['name'], tp), z)
        paste(cv, spr, x, y, sc, rot, fl, al * (0.78 + 0.22 * min(1, z)), blur=(1.4 * (0.75 - z) / 0.35 if z < 0.75 else (1.2 * (z - 1.25) / 0.25 if z > 1.25 else 0)))
    th = math.floor(t * HERO_FPS) / HERO_FPS
    hs = hero_state(th)
    if hs:
        x, y, sc, rot, fl, al, blur = hs
        paste(cv, HERO_SPR, x, y, sc, rot, fl, al, blur)
    return cv

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == '--samples':
        out = sys.argv[2]; os.makedirs(out, exist_ok=True)
        bgv = sys.argv[3] if len(sys.argv) > 3 else None
        ts = [float(x) for x in os.environ['PFX_TS'].split(',')] if os.environ.get('PFX_TS') else [0.15, 0.45, 0.8, 1.15, 1.5, 2.6, 4.2, 4.55, DUR - 1 / FPS]
        thumbs = []
        for t in ts:
            fx = frame(t)
            if bgv:
                b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '%.3f' % (T0 + t), '-i', bgv, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '%dx%d' % (W, H), '-'], capture_output=True).stdout
                base = Image.frombytes('RGBA', (W, H), b) if len(b) == W * H * 4 else Image.new('RGBA', (W, H), (40, 40, 50, 255))
            else: base = Image.new('RGBA', (W, H), (40, 40, 50, 255))
            base.alpha_composite(fx)
            th = base.convert('RGB').resize((270, 480)); thumbs.append((t, th))
        sheet = Image.new('RGB', (270 * len(thumbs), 500), (0, 0, 0))
        from PIL import ImageDraw
        d = ImageDraw.Draw(sheet)
        for i, (t, th) in enumerate(thumbs):
            sheet.paste(th, (270 * i, 20)); d.text((270 * i + 6, 4), '%.2fs (全片 %.2f)' % (t, T0 + t), fill=(255, 255, 0))
        sheet.save(os.path.join(out, 'petal_sheet.jpg'), quality=88); print('->', out)
    else:
        outp = sys.argv[2]; n = int(round(DUR * FPS))
        pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
                               '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '28', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', outp],
                              stdin=subprocess.PIPE)
        for i in range(n):
            pr.stdin.write(frame(i / FPS).tobytes())
            if i % 60 == 0: print('%d/%d' % (i, n), flush=True)
        pr.stdin.close(); pr.wait(); print('done ->', outp, n, 'frames')

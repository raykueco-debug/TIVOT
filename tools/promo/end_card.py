# 宣傳片結尾字卡（ver -2224，Ray 10-19）：1:56「2026.11.27／中文體驗版釋出」。
#   顯現＝A 熱光掃過（Ray 選的）：字先以暗鐵色浮出，一道斜的熾熱光帶由左往右掃過，掃到的筆畫白熱→冷成金；
#   火星只從光帶剛經過的筆畫零星迸出（順著光帶走），之後留下飛蚊般的光點、一顆一顆熄掉；字一路緩緩縮小。
#   ⚠ 第一版是「烙鐵砸下＋白閃＋整圈火星」—— Ray：「烙下的感覺有些廉價」，已換掉。
#   第二張（2:00 的署名）是靜態字卡，見 credit_card.py 的 credit_end.png。
#
#   py -X utf8 tools/promo/end_card.py --samples <資料夾>   幾張關鍵影格
#   py -X utf8 tools/promo/end_card.py --render  <輸出.mp4> 整段（1080×1920、60fps、黑底）
import os, sys, math, subprocess, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 60
T0 = 116.0                         # 全片時間
DUR = 120.0 - T0                   # 到第二張字卡
FONT = r'C:\Windows\Fonts\NotoSerifTC-VF.ttf'
GOLD = np.array([236, 205, 140], float)
MAIN = ['2026.11.27', '中文體驗版釋出']
CY = 0.45                          # 字的中心高度
END_SCALE = 0.86                   # 4 秒緩緩縮到這個比例
APPEAR = 0.5                       # 暗鐵字浮出的時間
SWEEP_AT, SWEEP_DUR = 0.45, 1.1    # 光帶開始掃、掃完一趟

def hot_color(h):
    stops = [(0.0, (120, 20, 0)), (0.35, (255, 90, 10)), (0.65, (255, 175, 60)), (0.85, (255, 235, 170)), (1.0, (255, 255, 240))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if h <= b:
            k = (h - a) / (b - a); return np.array([ca[i] + (cb[i] - ca[i]) * k for i in range(3)])
    return np.array(stops[-1][1], float)

def text_mask(lines, sizes, weights, gaps, spacing):
    f = [ImageFont.truetype(FONT, s) for s in sizes]
    for ff, wv in zip(f, weights): ff.set_variation_by_name(wv)
    tmp = ImageDraw.Draw(Image.new('L', (10, 10)))
    widths = [sum(tmp.textlength(ch, font=ff) for ch in ln) + sp * (len(ln) - 1) for ln, ff, sp in zip(lines, f, spacing)]
    hh = sum(sizes) + sum(gaps) + 40
    lay = Image.new('L', (W, int(hh * 1.25))); dr = ImageDraw.Draw(lay); y = 20
    for ln, ff, sp, w, s, g in zip(lines, f, spacing, widths, sizes, gaps + [0]):
        x = (W - w) / 2
        for ch in ln: dr.text((x, y), ch, font=ff, fill=255); x += dr.textlength(ch, font=ff) + sp
        y += s + g
    bb = lay.getbbox(); return lay.crop((0, bb[1] - 30, W, bb[3] + 30))

MAIN_M = text_mask(MAIN, [150, 96], ['Black', 'Bold'], [46], [6, 14])
MW, MH = MAIN_M.size
A0 = np.asarray(MAIN_M, float) / 255
# 暗鐵版的浮雕高光（筆畫左上緣）
EDGE = np.clip(A0 - np.asarray(MAIN_M.filter(ImageFilter.GaussianBlur(2)).transform(MAIN_M.size, Image.AFFINE, (1, 0, 1.5, 0, 1, 1.5)), float) / 255, 0, 1)
nr = np.random.default_rng(9)
_n2 = np.asarray(Image.fromarray((nr.random((40, 100)) * 255).astype(np.uint8)).resize((MW, MH), Image.BICUBIC), float) / 255
yy, xx = np.mgrid[0:MH, 0:MW]
ORD = (xx / MW * 0.85 + yy / MH * 0.15) * 0.92 + _n2 * 0.08        # 光帶到達每個像素的「位置」（0→1，斜的）
def sweep_pos(t): return -0.15 + (t - SWEEP_AT) / SWEEP_DUR * 1.3
def sweep_time(o): return SWEEP_AT + (o + 0.15) / 1.3 * SWEEP_DUR   # 光帶到達位置 o 的時刻

def text_rgb(t):
    appear = min(1, max(0, t / APPEAR))
    d = sweep_pos(t) - ORD
    lit = np.clip(d / 0.04, 0, 1)
    age = np.clip(d / 1.3 * SWEEP_DUR, 0, None); heat = np.exp(-age / 0.45) * lit
    band = np.exp(-(d / 0.035) ** 2)
    iron = np.array([46, 40, 36]) * appear + np.array([110, 96, 80]) * EDGE[..., None] * appear
    shade = np.linspace(1.08, 0.84, MH)[:, None, None]                   # 金字上亮下暗一點，像金屬
    col = iron * (1 - lit[..., None]) + GOLD * shade * lit[..., None]
    hc = np.stack([np.interp(heat, [0, .4, 1], [GOLD[0], 255, 255]), np.interp(heat, [0, .4, 1], [GOLD[1], 140, 235]),
                   np.interp(heat, [0, .4, 1], [GOLD[2], 40, 170])], -1)
    col = col * (1 - heat[..., None]) + hc * heat[..., None] + band[..., None] * np.array([255, 170, 70]) * 0.9
    rgb = col * A0[..., None]
    glow = np.asarray(Image.fromarray(np.clip(rgb * (heat[..., None] * 0.9 + band[..., None]), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), float)
    return rgb + glow * 1.1

def scale_at(t): return 1.0 + (END_SCALE - 1.0) * min(1, max(0, t / DUR))
def to_screen(px, py, t):                  # 字塊座標 → 畫面座標（跟著縮）
    s = scale_at(t); return W / 2 + (px - MW / 2) * s, H * CY + (py - MH / 2) * s

# ── 火星：光帶經過某一筆畫的那一刻，從那裡零星迸出，順著光帶往右上飛 ──
rng = random.Random(21)
ys, xs = np.nonzero(A0 > 0.6)
SPARKS = []
for i in range(170):
    k = rng.randrange(len(xs)); px, py = xs[k], ys[k]
    st = sweep_time(ORD[py, px])
    ang = rng.uniform(-1.25, -0.15)                                      # 右上方（光帶往右走）
    sp = rng.uniform(260, 900)
    SPARKS.append((px, py, st, sp * math.cos(ang), sp * math.sin(ang), rng.uniform(0.25, 0.65), rng.uniform(1.0, 2.2)))
FLOAT = []                                                               # 飛蚊：從光帶掃過的地方留下，慢慢飄、一顆一顆熄
for i in range(34):
    k = rng.randrange(len(xs)); px, py = xs[k], ys[k]
    st = sweep_time(ORD[py, px]) + rng.uniform(0.05, 0.3)
    FLOAT.append(dict(px=px, py=py, born=st, vx=rng.uniform(8, 34), vy=rng.uniform(-30, -6), r0=rng.uniform(10, 60), ang=rng.uniform(0, 6.28),
                      wf=rng.uniform(0.3, 0.8), wp=rng.uniform(0, 6.28), wa=rng.uniform(5, 14), sz=rng.uniform(1.5, 2.8), h=rng.uniform(0.45, 0.75)))
order = list(range(len(FLOAT))); rng.shuffle(order)
for j, i in enumerate(order):                                            # 熄滅時間錯開：一顆一顆，越後面越稀
    FLOAT[i]['die'] = max(FLOAT[i]['born'] + 0.6, 1.7 + (j / (len(FLOAT) - 1)) ** 1.2 * (DUR - 1.85))
G = 900.0

# 飛蚊的停格節奏（memory：程式算的粒子像手繪 —— 基數 2/3、隔格 ×2）
_HOLD = []; _f = 0.0; _k = 0
while _f < 100000: _HOLD.append(int(_f)); _f += (1.5, 3.0)[_k % 2]; _k += 1
def held(t):
    f = int(round(t * FPS)); lo, hi = 0, len(_HOLD) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if _HOLD[mid] <= f: lo = mid
        else: hi = mid - 1
    return _HOLD[lo] / FPS

def particles(t):
    lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
    for (px, py, st, vx, vy, life, wd) in SPARKS:                          # 迸出的火星：快、帶短拖尾（快速劃過的，滿格數）
        tt = t - st
        if tt < 0 or tt > life: continue
        k = tt / life; x0, y0 = to_screen(px, py, st)
        def pos(u):
            dd = 3.0; f = (1 - math.exp(-dd * u)) / dd
            return x0 + vx * f, y0 + vy * f + 0.5 * G * u * u
        x1, y1 = pos(tt); x2, y2 = pos(max(0, tt - 0.03))
        c = hot_color(max(0.1, 0.95 - k * 0.8)) * (1 - k ** 2)
        dr.line([(x2, y2), (x1, y1)], fill=tuple(int(v) for v in c), width=max(1, int(round(wd))))
    th = held(t)
    for p in FLOAT:
        e = th - p['born']
        if e < 0 or th > p['die']: continue
        fin = min(1, e / 0.3); fout = min(1, (p['die'] - th) / 0.22)       # 消失得乾脆：一顆一顆熄
        x0, y0 = to_screen(p['px'], p['py'], p['born'])
        x = x0 + p['r0'] * math.cos(p['ang']) * min(1, e / 0.6) + p['vx'] * e + p['wa'] * math.sin(p['wf'] * 6.283 * e + p['wp'])
        y = y0 + p['r0'] * math.sin(p['ang']) * min(1, e / 0.6) + p['vy'] * e + p['wa'] * 0.6 * math.cos(p['wf'] * 5.1 * e + p['wp'])
        tw = 0.75 + 0.25 * math.sin(e * 3.1 + p['wp'])
        c = hot_color(p['h']) * fin * fout * tw; s = p['sz']
        dr.ellipse([x - s, y - s, x + s, y + s], fill=tuple(int(v) for v in c))
    a = np.asarray(lay, float)
    return a + np.asarray(lay.filter(ImageFilter.GaussianBlur(5)), float) * 1.5

def frame(t):
    img = np.zeros((H, W, 3), float)
    s = scale_at(t); mw, mh = int(MW * s), int(MH * s)
    lay = Image.fromarray(np.clip(text_rgb(t), 0, 255).astype(np.uint8)).resize((mw, mh), Image.LANCZOS)
    x0, y0 = int(W / 2 - mw / 2), int(H * CY - mh / 2)
    img[y0:y0 + mh, x0:x0 + mw] += np.asarray(lay, float)
    img += particles(t)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    mode, out = sys.argv[1], sys.argv[2]
    if mode == '--samples':
        os.makedirs(out, exist_ok=True)
        ts = [0.3, 0.75, 1.0, 1.3, 1.7, 2.4, 3.2, 3.95]
        thumbs = []
        for t in ts:
            im = Image.fromarray(frame(t)); im.save(os.path.join(out, 'end_%05.2f.png' % t))
            tb = im.crop((0, int(H * 0.3), W, int(H * 0.62))).resize((540, int(H * 0.32) // 2)); ImageDraw.Draw(tb).text((6, 6), '%.2fs（全片 %.2f）' % (t, t + T0), fill=(255, 255, 0)); thumbs.append(tb)
        w, h = thumbs[0].size; sheet = Image.new('RGB', (w * 2, h * 4))
        for i, tb in enumerate(thumbs): sheet.paste(tb, ((i % 2) * w, (i // 2) * h))
        sheet.save(os.path.join(out, 'end_sheet.jpg'), quality=88); print('samples ->', out)
    else:
        n = int(round(DUR * FPS))
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
                              '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for i in range(n):
            p.stdin.write(frame(i / FPS).tobytes())
            if i % 120 == 0: print('%d/%d' % (i, n), flush=True)
        p.stdin.close(); p.wait(); print('done ->', out)

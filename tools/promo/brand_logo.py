# 宣傳片 LOGO 段：團徽像烙鐵一樣猛地烙上去 → 濺火星 → 降溫 → 慢慢拉遠到中間偏上；標題像燒烙出來一樣浮現。
#
#   py -X utf8 tools/promo/brand_logo.py --samples <輸出資料夾>        只出幾張關鍵影格（先給 Ray 看）
#   py -X utf8 tools/promo/brand_logo.py --render  <輸出.mp4>           整段算出來（1080×1920、60fps、黑底）
#
# 時間參數（秒，片段內的時間）：DUR＝整段長、TITLE_AT＝標題開始燒出來的時刻。
# 預設對著 pv_v4_board 的 LOGO 片段（8.517–15.883，標題在全片 12.0 秒＝片內 3.483）。
import os, sys, math, subprocess, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, H, FPS = 1080, 1920, 60
DUR = 7.367
TITLE_AT = 12.0 - 8.517
IMPACT = 0.12                         # 撞上去的那一刻
EMB = Image.open(os.path.join(ROOT, 'resources/background/tivot_emblem.webp')).convert('RGBA')
BASE = 900                            # 烙上去時團徽的寬（像素）
END_SCALE, END_Y = 0.68, 0.36         # 拉遠的終點：大小比例、中心高度（畫面高的比例）（v2：0.60→0.68，縮得更少＝更慢）
TITLE = ['聖約第四騎士團', 'SAINT INSTALL']
FONT = r'C:\Windows\Fonts\NotoSerifTC-VF.ttf'
GOLD = np.array([236, 205, 140], float)

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_inout(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)
def ease_in(x): x = min(max(x, 0), 1); return x ** 3

def heat_of(t):                      # 1＝白熱、0＝冷卻完
    if t < IMPACT: return 1.0
    return math.exp(-(t - IMPACT) / 0.85)

def hot_color(h):                    # 黑體輻射近似：白→黃→橘→暗紅
    stops = [(0.0, (120, 20, 0)), (0.35, (255, 90, 10)), (0.65, (255, 175, 60)), (0.85, (255, 235, 170)), (1.0, (255, 255, 240))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if h <= b:
            k = (h - a) / (b - a); return np.array([ca[i] + (cb[i] - ca[i]) * k for i in range(3)])
    return np.array(stops[-1][1], float)

def emblem_pose(t):
    """回傳（寬度像素、中心 x、中心 y）。"""
    if t < IMPACT:                       # 猛地壓下來：從很大很近砸到定位
        k = ease_in(t / IMPACT); s = 1.9 + (1.0 - 1.9) * k
    else:
        s = 1.0
        if t > IMPACT: s = 1.0 + 0.04 * math.exp(-(t - IMPACT) / 0.05) * math.cos((t - IMPACT) * 60)   # 撞擊的一下回彈
    z = min(max((t - IMPACT) / (DUR - IMPACT), 0), 1)   # v2（Ray）：烙下去那一刻就開始等速慢慢縮，一路縮到結尾
    s *= 1.0 + (END_SCALE - 1.0) * z
    cy = 0.5 + (END_Y - 0.5) * z
    return BASE * s, W / 2, H * cy

def shake(t):
    if t < IMPACT: return 0, 0
    a = 26 * math.exp(-(t - IMPACT) / 0.09)
    return a * math.sin(t * 173), a * math.cos(t * 131)

# ── 火星：撞擊那一刻從團徽外緣往外噴（拋物線＋拖尾） ──
rng = random.Random(7)
SPARKS = []
for i in range(420):
    ang = rng.uniform(0, 2 * math.pi)
    r0 = BASE / 2 * rng.uniform(0.82, 1.0)
    sp = rng.uniform(500, 2300) * (1.25 if math.sin(ang) < 0 else 1.0)     # 往上噴的快一點
    life = rng.uniform(0.35, 1.3)
    SPARKS.append((W / 2 + r0 * math.cos(ang), H / 2 + r0 * math.sin(ang), sp * math.cos(ang), sp * math.sin(ang), life, rng.uniform(1.2, 3.2)))
EMBERS = []                                            # 降溫時慢慢飄起的餘燼
for i in range(70):
    EMBERS.append((W / 2 + rng.uniform(-BASE * 0.45, BASE * 0.45), H / 2 + rng.uniform(-BASE * 0.4, BASE * 0.45),
                   rng.uniform(-30, 30), rng.uniform(-160, -60), IMPACT + rng.uniform(0.1, 1.8), rng.uniform(1.0, 2.4), rng.uniform(1.0, 2.2)))
G = 1700.0

def spark_pos(x0, y0, vx, vy, tt):
    d = 2.2                                              # 空氣阻力
    f = (1 - math.exp(-d * tt)) / d
    return x0 + vx * f, y0 + vy * f + 0.5 * G * tt * tt

def draw_sparks(t):
    lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
    tt = t - IMPACT
    if tt > 0:
        for (x0, y0, vx, vy, life, wdt) in SPARKS:
            if tt > life: continue
            k = tt / life
            x1, y1 = spark_pos(x0, y0, vx, vy, tt)
            x2, y2 = spark_pos(x0, y0, vx, vy, max(0, tt - 0.035))   # 拖尾＝前一小段的位置
            c = hot_color(max(0.05, 1 - k * 0.95)) * (1 - k ** 2)
            dr.line([(x2, y2), (x1, y1)], fill=tuple(int(v) for v in c), width=max(1, int(round(wdt * (1 - 0.5 * k)))))
    for (x0, y0, vx, vy, st, life, sz) in EMBERS:
        e = t - st
        if e < 0 or e > life: continue
        k = e / life
        x = x0 + vx * e + 14 * math.sin(e * 5 + x0); y = y0 + vy * e
        c = hot_color(0.55 * (1 - k)) * math.sin(math.pi * k)
        dr.ellipse([x - sz, y - sz, x + sz, y + sz], fill=tuple(int(v) for v in c))
    a = np.asarray(lay, float)
    glow = np.asarray(lay.filter(ImageFilter.GaussianBlur(6)), float)
    return a + glow * 1.6

# ── 標題：預先排好字、算好每個像素「什麼時候燒出來」 ──
def build_title():
    lay = Image.new('L', (W, 420)); dr = ImageDraw.Draw(lay)
    f1 = ImageFont.truetype(FONT, 118); f1.set_variation_by_name('Black')
    f2 = ImageFont.truetype(FONT, 64); f2.set_variation_by_name('Bold')
    def center(txt, f, y, spacing=0):
        w = dr.textlength(txt, font=f) + spacing * (len(txt) - 1); x = (W - w) / 2
        for ch in txt:
            dr.text((x, y), ch, font=f, fill=255); x += dr.textlength(ch, font=f) + spacing
    center(TITLE[0], f1, 40, 10)
    center(TITLE[1], f2, 230, 18)
    a = np.asarray(lay, float) / 255
    nr = np.random.default_rng(3)
    n = Image.fromarray((nr.random((14, 36)) * 255).astype(np.uint8)).resize((W, 420), Image.BICUBIC)
    n2 = Image.fromarray((nr.random((60, 150)) * 255).astype(np.uint8)).resize((W, 420), Image.BICUBIC)
    noise = (np.asarray(n, float) * 0.7 + np.asarray(n2, float) * 0.3) / 255
    xs = np.linspace(0, 1, W)[None, :].repeat(420, 0)
    order = 0.55 * xs + 0.45 * noise                      # 由左往右、邊緣不規則地燒過去
    return a, order
TITLE_A, TITLE_ORDER = build_title()
TITLE_BURN = 1.7                                          # 燒完整行要幾秒

def title_layer(t, emb_bottom):
    e = t - TITLE_AT
    if e < 0: return None
    th = -0.12 + 1.3 * e / TITLE_BURN                    # 燒到哪裡
    a = TITLE_A
    shown = np.clip((th - TITLE_ORDER) / 0.025, 0, 1)    # 已燒出來的部分
    age = np.clip((th - TITLE_ORDER) / 1.3 * TITLE_BURN, 0, None)   # 這個像素燒出來幾秒了
    heat = np.exp(-age / 0.55)
    edge = np.clip(1 - np.abs(th - TITLE_ORDER) / 0.03, 0, 1)        # 正在燒的那一條邊
    # 顏色：剛燒出來白熱→橘→冷成金
    hc = np.stack([np.interp(heat, [0, .35, .7, 1], [GOLD[0], 255, 255, 255]),
                   np.interp(heat, [0, .35, .7, 1], [GOLD[1], 120, 200, 245]),
                   np.interp(heat, [0, .35, .7, 1], [GOLD[2], 30, 90, 200])], -1)
    col = hc * (a * shown)[..., None]
    burn = (edge * a)[..., None] * np.array([255, 150, 40]) * 1.3       # 字上正在燒的邊
    char = (edge * (1 - a) * 0.0)                                       # （底是黑的，不畫焦痕）
    rgb = col + burn
    glow_src = Image.fromarray(np.clip((col * heat[..., None] + burn), 0, 255).astype(np.uint8))
    glow = np.asarray(glow_src.filter(ImageFilter.GaussianBlur(10)), float) * 1.2
    out = rgb + glow
    y = int(emb_bottom + 40)
    return out, y

def frame(t):
    img = np.zeros((H, W, 3), float)
    w, cx, cy = emblem_pose(t)
    dx, dy = shake(t); cx += dx; cy += dy
    e = EMB.resize((max(2, int(w)), max(2, int(w))), Image.LANCZOS)
    a = np.asarray(e, float)
    alpha = a[..., 3:] / 255; rgb = a[..., :3]
    h = heat_of(t)
    if h > 0.003:
        lum = rgb.mean(-1, keepdims=True) / 255
        hc = np.array([hot_color(min(1, h * (0.55 + 0.6 * float(l)))) for l in np.linspace(0, 1, 32)])
        idx = np.clip((lum[..., 0] * 31).astype(int), 0, 31)
        hot = hc[idx]
        mix = min(1, h * 1.25)
        rgb = rgb * (1 - mix) + hot * mix
    x0, y0 = int(cx - e.width / 2), int(cy - e.height / 2)
    def paste(dst, src, al, x, y):
        hh, ww = src.shape[:2]
        sx0, sy0 = max(0, -x), max(0, -y); dx0, dy0 = max(0, x), max(0, y)
        sx1, sy1 = min(ww, W - x), min(hh, H - y)
        if sx1 <= sx0 or sy1 <= sy0: return
        reg = dst[dy0:dy0 + sy1 - sy0, dx0:dx0 + sx1 - sx0]
        aa = al[sy0:sy1, sx0:sx1]
        reg[:] = reg * (1 - aa) + src[sy0:sy1, sx0:sx1] * aa
    paste(img, rgb, alpha, x0, y0)
    # 白熱的光暈（跟著熱度退）
    if h > 0.01:
        g = Image.fromarray((alpha[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(4, w * 0.045)))
        gl = np.asarray(g, float)[..., None] / 255 * hot_color(min(1, h)) * (1.1 * h)
        tmp = np.zeros_like(img); paste(tmp, gl, np.ones(gl.shape[:2] + (1,)), x0, y0)
        img += tmp
    img += draw_sparks(t)
    # 撞擊白閃
    if t >= IMPACT:
        fl = math.exp(-(t - IMPACT) / 0.06) * 0.85
        img = img * (1 - fl) + 255 * fl
    tl = title_layer(t, cy + w / 2 * 0.98)
    if tl is not None:
        rgbT, yT = tl
        hh = rgbT.shape[0]
        if yT < H:
            seg = img[yT:min(H, yT + hh)]
            seg += rgbT[:seg.shape[0]]
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    mode, out = sys.argv[1], sys.argv[2]
    if mode == '--samples':
        os.makedirs(out, exist_ok=True)
        ts = [0.06, IMPACT + 0.02, 0.3, 0.8, 1.6, 3.0, TITLE_AT + 0.6, TITLE_AT + 1.3, DUR - 0.05]
        thumbs = []
        for t in ts:
            im = Image.fromarray(frame(t)); im.save(os.path.join(out, 'brand_%05.2f.png' % t))
            th = im.resize((270, 480)); d = ImageDraw.Draw(th); d.text((6, 6), '%.2fs (全片 %.2f)' % (t, t + 8.517), fill=(255, 255, 0)); thumbs.append(th)
        sheet = Image.new('RGB', (270 * len(thumbs), 480))
        for i, th in enumerate(thumbs): sheet.paste(th, (270 * i, 0))
        sheet.save(os.path.join(out, 'brand_sheet.jpg'), quality=88); print('samples ->', out)
    else:
        n = int(round(DUR * FPS))
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
                              '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for i in range(n):
            p.stdin.write(frame(i / FPS).tobytes())
            if i % 60 == 0: print('%d/%d' % (i, n), flush=True)
        p.stdin.close(); p.wait(); print('done ->', out)

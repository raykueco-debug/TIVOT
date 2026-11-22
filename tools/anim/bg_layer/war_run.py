"""背景線：戰地（溫斯摩爾港／北方泊地戰損版）分層跑法（Ray 11-11：「火給 wan，原圖有火的話再給 Wan 自由發揮，不要下 prompt，煙給 code」）。
素材：_layers_gpt/out/<地圖>/<名>__cut.png ＝ GPT 把天空／雲／煙挖成洋紅、火拿掉補畫的靜止底圖；_src/<名>.png ＝原圖。
  · 底圖＝__cut（靜止）。
  · 火：原圖有火才跑 Wan（原圖、正負提示詞都空、F 系列段長：81 格取前 23 格＋首尾幀 33 格接回），只取火的範圍疊上去，接縫倒放接回。
  · 天空／雲／煙（洋紅的地方）：原圖天空色漸層＋靜止遠景雲＋程式雲（只往前）＋程式煙（從火的位置往上冒、變大、隨風偏、變淡，只往前）。
用法：python war_run.py <名>...（例 ws_0_0_dusk、northport_east_bf）；SEP_NOWAIT=1 不等 GPU 閒。"""
import os, sys, json, glob, subprocess, time
import numpy as np, cv2
from PIL import Image
import cloud_sprites as CS
import bg_queue as Q
import sep_run as S

HERE = os.path.dirname(os.path.abspath(__file__))
LG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background', '_layers_gpt'))
DL = os.path.join(HERE, 'clouds') + '/'   # 11-22：原本寫死另一台的 Downloads；改讀工具自己的 clouds/（兩台都有）
W, H = 768, 1024                      # 戰地是直式 3:4
GW, GH = 528, 704                     # Wan 的解析度（16 的倍數、3:4）
K, LAB, LBA = 23, 81, 33
PROMPT = os.environ.get('WAR_PROMPT', '有風吹拂')   # Ray 11-11：空提示詞 Wan 會生出跑過去的士兵 ⇒ 只寫這一句


def log(*a): S.log(*a)


def cut_path(name):
    f = glob.glob(os.path.join(LG, 'out', '*', name + '__cut.png')); return f[0] if f else None


def run(cmd, env=None):
    e = dict(os.environ, PYTHONIOENCODING='utf-8', **(env or {}))
    r = subprocess.run(cmd, cwd=HERE, env=e, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0: log('✘', (r.stdout + r.stderr)[-600:]); return False
    return True


def align(orig, cut, valid):
    """原圖 → GPT 圖的透視對位（ECC），只看兩邊都有東西的地方。"""
    a = cv2.cvtColor(cv2.resize(orig, (W // 2, H // 2)).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    b = cv2.cvtColor(cv2.resize(cut, (W // 2, H // 2)).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    m = cv2.resize(valid.astype(np.uint8), (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
    w = np.eye(3, dtype=np.float32)
    try: _, w = cv2.findTransformECC(b, a, w, cv2.MOTION_HOMOGRAPHY, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), m, 5)
    except cv2.error as e: log('對位失敗，用單位矩陣', str(e)[:80])
    # 11-22：ECC 會收斂到歪掉的透視（ws_2_0：天空遮罩被扭成方塊、遠景城市整排被當天空蓋掉）
    # ⇒ 在兩邊都有東西的地方比一次誤差，比「不對位」還差、或縮放／透視離譜，就退回不對位。
    def err(M):
        wb = cv2.warpPerspective(b, M, (W // 2, H // 2), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
        wm = cv2.warpPerspective(m, M, (W // 2, H // 2), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP) * m
        return float(np.abs(a - wb)[wm > 0].mean()) if wm.sum() > 1000 else 1e9
    e0, e1 = err(np.eye(3, dtype=np.float32)), err(w)
    sx, sy = np.hypot(w[0, 0], w[1, 0]), np.hypot(w[0, 1], w[1, 1])
    if e1 >= e0 * 0.98 or not (0.85 < sx < 1.18 and 0.85 < sy < 1.18) or np.abs(w[2, :2]).max() > 2e-4:
        log('對位結果不可信，退回不對位', f'誤差 {e0:.1f}→{e1:.1f} 縮放 {sx:.2f},{sy:.2f}'); w = np.eye(3, dtype=np.float32)
    else: log('對位', f'誤差 {e0:.1f}→{e1:.1f}')
    S_ = np.diag([2, 2, 1]).astype(np.float32); return S_ @ w @ np.linalg.inv(S_)   # 半尺寸 → 全尺寸；把原圖座標映到 GPT 圖座標


def fire_mask(orig, cut_o, sky_o):
    """火＝原圖裡又亮又橘、而且 GPT 版在那裡已經拿掉（兩者差很多）的像素；落在天空的火舌要貼著建築（40px 內）才算，避開夕陽雲。"""
    hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hot = (hsv[..., 0] < 26) & (hsv[..., 1] > 130) & (hsv[..., 2] > 210)
    v = hsv[..., 2] / 255; mu = cv2.blur(v, (9, 9)); sd = np.sqrt(np.clip(cv2.blur(v * v, (9, 9)) - mu * mu, 0, None))
    tex = sd > 0.09                                                     # 火舌有紋理；夕陽天空是平滑漸層
    near_b = cv2.dilate((sky_o < 0.5).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0   # 貼著建築
    smoke = ((hsv[..., 1] < 110) & (hsv[..., 2] < 130) & (sky_o >= 0.5)).astype(np.uint8)        # 天空區裡又灰又暗＝煙
    smoke = cv2.morphologyEx(smoke, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    near_s = cv2.dilate(smoke, np.ones((71, 71), np.uint8)) > 0                                   # 火一定在煙柱底下（避開燈、地面反光、沒有煙的夕陽）
    f = hot & tex & near_b & near_s
    f = cv2.morphologyEx(f.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(f)
    keep = np.zeros_like(f)
    for i in range(1, n):
        if st[i, 4] >= 60: keep[lab == i] = 1
    return keep


class Smoke:
    """程式煙：原版的貼圖煙團（Ray 11-22 退回改良版：「原版的煙改成更不規則　幀數更高」「煙要有散開的感覺」）。
    · 冒出的間隔、每團大小、壽命、上升速度、側偏全部逐團隨機（原版是固定間隔、固定壽命 → 太整齊）
    · 間隔縮短 → 團與團重疊更多，煙柱比較連續
    · 越高越大、越往兩側攤開（側偏隨高度放大）、越淡
    · 合成在建築之下（do() 先疊煙再蓋地面）"""
    def __init__(self, srcs, sprites, col, seed=7, wind=None, **kw):
        self.srcs = srcs; self.spr = sprites; self.col = np.array(col, np.float32)
        r = np.random.default_rng(seed); self.wind = wind if wind is not None else r.choice([-1, 1]) * r.uniform(8, 16)
        self.ph = r.random(len(srcs)); self.seed = seed
        # 每個源頭自己的間隔：一圈剛好 N 團（N 整數）→ 第 k 團的亂數取 k mod N，t 與 t+T 完全同一個畫面（無縫循環）
        self.T = float(kw.get('loop_s', 12.0))
        self.N = [max(1, round(self.T / r.uniform(0.22, 0.3))) for _ in srcs]
        self.ev = [self.T / n for n in self.N]
        self.life = 8.0
        # 遠近：源頭越窄＝越遠 → 越慢（11-22 Ray：「遠景慢近景快」；v5 整體放慢被退，速度回 v4，只保留遠近差）
        self.k = [float(np.clip(sw / 60, 0.55, 1.15)) for _, _, sw in srcs]

    def _births(self, si, t):
        """第 si 個源頭在 [t-life, t] 之間出生的煙團：間隔逐團隨機（決定性，同一個 k 永遠同一組）。"""
        ev = self.ev[si]; out = []
        k0 = int((t - self.life * 1.2) / ev) - 2; k1 = int(t / ev) + 1
        for k in range(k0, k1 + 1):
            rr = np.random.default_rng(self.seed * 9973 + si * 100003 + (k % self.N[si]))
            birth = (k + self.ph[si] + rr.uniform(-0.45, 0.45)) * ev
            if rr.random() < 0.12: continue                       # 偶爾斷一下 → 不規則
            out.append((birth, rr))
        return out

    def render(self, t, rgb, A):
        items = []
        for si, (sx, sy, sw) in enumerate(self.srcs):
            for birth, rr in self._births(si, t):
                life = self.life * rr.uniform(0.7, 1.15); age = t - birth
                if age < 0 or age > life: continue
                u = age / life
                s = self.spr[rr.integers(len(self.spr))]
                if rr.random() < 0.5: s = s[:, ::-1]
                if rr.random() < 0.3: s = s[::-1]
                ww = int(sw * (0.9 + 3.0 * u ** 1.2) * rr.uniform(0.8, 1.25)); hh = int(ww * s.shape[0] / s.shape[1] * rr.uniform(0.75, 1.2))
                if ww < 6 or hh < 6: continue
                lat = rr.normal(0, 1) * sw * (0.08 + 0.6 * u ** 1.6)    # 越高越往兩側散
                vs = rr.uniform(0.9, 1.1)
                kd = self.k[si]
                cx = sx + self.wind * kd * age * (1 + u) * rr.uniform(0.85, 1.15) + lat
                cy = sy - age * (H * 0.045) * kd * vs * (1 + 0.4 * u)
                op = rr.uniform(0.8, 1.0)
                items.append((age, s, ww, hh, cx, cy, u, op))
        items.sort(key=lambda z: -z[0])                             # 老的先畫
        for age, s, ww, hh, cx, cy, u, op in items:
            sp = cv2.resize(np.ascontiguousarray(s), (ww, hh), interpolation=cv2.INTER_AREA)
            a = sp[..., 3] / 255 * (np.clip(age / 0.5, 0, 1) * (1 - u) ** 1.5) * 0.85 * op
            l = sp[..., :3].mean(-1, keepdims=True) / 255
            c = self.col * (0.75 + 0.5 * l)
            x0, y0 = int(cx - ww / 2), int(cy - hh / 2)
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + ww), min(H, y0 + hh)
            if xa >= xb or ya >= yb: continue
            sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0)); aa = a[sl][..., None]
            rgb[ya:yb, xa:xb] = rgb[ya:yb, xa:xb] * (1 - aa) + c[sl] * aa
            A[ya:yb, xa:xb] = A[ya:yb, xa:xb] * (1 - aa[..., 0]) + aa[..., 0]


class Water:
    """程式水面（Ray 11-22：守城戰「水空煙」—— 地面不動，水／天空／煙由程式動）。
    只動框內「平滑、有彩度」的像素（河面），前景的欄杆／燈柱／木箱不動。
    橫向波紋（越近振幅越大、波長越長）＋反光帶閃動；所有頻率都是循環長度的整數倍 ⇒ 首尾接得上，只往前不倒放。"""
    def __init__(self, orig, sky_o, boxes, loop_s):
        self.T = loop_s
        hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        g = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        gx = cv2.blur(np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)), (7, 7))
        box = np.zeros((H, W), np.uint8)
        for b in boxes:
            x0, y0, x1, y1 = [float(v) for v in b.split(',')]
            box[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1
        m = (box > 0) & (sky_o < 0.5) & (gx < float(os.environ.get('WAR_WATER_TEX', 22))) & (hsv[..., 1] > 45)
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 5), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 9), np.uint8)) & box
        k, lb, st, _ = cv2.connectedComponentsWithStats(m)
        keep = np.zeros_like(m)
        for i in range(1, k):
            if st[i, 4] >= 150: keep[lb == i] = 1
        self.m = keep
        self.a = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.0)[..., None]
        # 取樣底圖：框內非水的像素（欄杆、燈柱）先補成水，橫移時才不會把它們拖進水裡
        hole = ((box > 0) & (keep == 0)).astype(np.uint8)
        self.src = cv2.inpaint(orig.clip(0, 255).astype(np.uint8), hole, 5, cv2.INPAINT_TELEA).astype(np.float32)
        ys = np.where(keep.any(1))[0]
        self.y0, self.y1 = (int(ys.min()), int(ys.max())) if len(ys) else (0, 1)
        YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
        u = np.clip((YY - self.y0) / max(1, self.y1 - self.y0), 0, 1)      # 0＝遠（地平線）1＝近
        self.XX, self.YY, self.u = XX, YY, u
        self.amp = 0.5 + 2.6 * u                                             # 近大遠小
        self.ky = 2 * np.pi / (3.0 + 9.0 * u)                                 # 近處波長長
        self.lum = (orig.mean(-1) / 255.0)
        log('水', f'{int(keep.sum())} px，y {self.y0}~{self.y1}')

    def render(self, t, img):
        if not self.m.any(): return img
        w = 2 * np.pi / self.T
        ph = self.YY * self.ky
        dx = self.amp * (0.65 * np.sin(ph - 5 * w * t + self.XX * 0.021) + 0.35 * np.sin(ph * 1.7 + 3 * w * t - self.XX * 0.013))
        dy = 0.25 * self.amp * np.sin(ph * 0.8 - 4 * w * t + self.XX * 0.017)
        f = cv2.remap(self.src, self.XX + dx, self.YY + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        # 反光帶閃動：只在亮的地方（夕陽倒影）明暗起伏
        sh = 1 + 0.13 * np.clip(self.lum - 0.45, 0, 1) / 0.55 * np.sin(self.XX * 0.11 + ph * 0.5 - 6 * w * t)
        f = f * sh[..., None]
        return img * (1 - self.a) + f * self.a


def sky_from_orig(orig, sky_g):
    """11-22：GPT 洋紅圖重畫時把天際線畫低了（ws_2_0），遮罩對不上 → 原圖的建築上半與太陽被當成天空蓋掉、程式煙跑到建築前面。
    改從原圖自己切：建築＝偏紫灰／低彩度（夕照天空是又暖又飽和的），只留跟地面連著的那幾塊、補洞；
    再聯集 GPT 的地面（它的建築比較矮，一定在原圖建築裡面）。煙（灰）在天空裡、不跟地面連 → 歸天空，交給程式煙。"""
    o8 = orig.clip(0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(o8, cv2.COLOR_RGB2HSV).astype(np.float32)
    r, b = orig[..., 0], orig[..., 2]
    B = ((((r - b) / (r + 1) < 0.45) | (hsv[..., 1] < 110)) & ~((hsv[..., 2] > 235) & (hsv[..., 1] < 170))) | (hsv[..., 2] < 95)   # 太陽本體不算建築；很暗的（燈的鐵架）算
    gnd = (sky_g < 0.5)
    rows = np.where(gnd.mean(1) > 0.5)[0]
    ytop = (int(rows.min()) if len(rows) else H // 2) - int(H * 0.17)     # 建築最高也不會高出 GPT 地面太多（尖塔）；再上面一律是天空
    B[:max(0, ytop)] = False
    G = (B | gnd).astype(np.uint8)
    n, lab = cv2.connectedComponents(G, connectivity=8)
    keep = np.unique(lab[gnd]); keep = keep[keep > 0]
    g = np.isin(lab, keep).astype(np.uint8)
    # 火（貼著建築頂、又亮又橘、有紋理）＝地面的一部分，留在原圖
    v = hsv[..., 2] / 255; mu = cv2.blur(v, (9, 9)); sd = np.sqrt(np.clip(cv2.blur(v * v, (9, 9)) - mu * mu, 0, None))
    hot = ((hsv[..., 0] < 24) | (hsv[..., 0] > 175)) & (hsv[..., 1] > 140) & (hsv[..., 2] > 225) & (sd > 0.11)
    hot = cv2.morphologyEx(hot.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    near = cv2.dilate(g, np.ones((11, 11), np.uint8)) > 0
    nh, lh, sh, _ = cv2.connectedComponentsWithStats((hot & near).astype(np.uint8))
    for i in range(1, nh):
        if sh[i, 4] >= 25: g[lh == i] = 1                                   # 成塊的火才算（零星的亮紋是天空）
    g = cv2.morphologyEx(g, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    inv = (1 - g).copy(); mm = np.zeros((H + 2, W + 2), np.uint8)
    for x in range(0, W, 8):
        if inv[0, x] == 1: cv2.floodFill(inv, mm, (x, 0), 2)
    g = np.where(inv == 1, 1, g).astype(np.uint8)                       # 被建築包住的洞（亮窗）補回地面
    sky = (1 - g).astype(np.float32)
    # 逐欄的天空下緣不准比左右鄰居低太多（太陽光暈裡的遠景建築、燈罩玻璃會被誤判成天空 → 一律收回地面）
    sb = np.array([np.max(np.where(sky[:, x] > 0)[0], initial=-1) for x in range(W)], np.float32)
    pad = np.pad(sb, 30, mode="edge"); ref = np.median(np.lib.stride_tricks.sliding_window_view(pad, 61), axis=1)
    # 太陽光暈裡的遠景建築被照成天空色、整段判不出來 → 光暈那一段的天際線用左右兩側接過去
    sn = sun_disc(orig)
    if sn:
        sx0, rad = sn[0], sn[2]; a0, a1 = int(max(0, sx0 - rad * 7)), int(min(W - 1, sx0 + rad * 7))
        l = np.median(sb[max(0, a0 - 20):a0 + 1]); r_ = np.median(sb[a1:min(W, a1 + 21)])
        ref[a0:a1 + 1] = np.minimum(ref[a0:a1 + 1], np.linspace(l, r_, a1 - a0 + 1))
    yy = np.arange(H)[:, None]
    sky[yy > (np.minimum(sb, ref + 8))[None, :]] = 0
    # 上下都貼著地面的天空（燈罩玻璃：上有燈帽、下有燈柱）→ 收回地面
    gg = sky < 0.5; up = np.zeros_like(gg); dn = np.zeros_like(gg)
    for k in range(1, 15): up[k:] |= gg[:-k]; dn[:-k] |= gg[k:]
    sky[(sky > 0.5) & up & dn] = 0
    sky = cv2.erode(sky, np.ones((2, 2), np.uint8)); log('原圖天空', f'{sky.mean():.0%}，建築上限 y={ytop}')
    return cv2.GaussianBlur(sky, (0, 0), 0.7)


def sun_disc(orig, sky=None):
    """原圖的太陽盤（淡黃、夠圓、不大）→ (cx, cy, r) 或 None。"""
    hsv = cv2.cvtColor(orig.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
    m = ((hsv[..., 2] > 240) & (hsv[..., 1] < 130)).astype(np.uint8)
    if sky is not None: m &= (sky > 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, ce = cv2.connectedComponentsWithStats(m)
    best = None
    for i in range(1, n):
        x, y, w_, h_, a_ = st[i]
        if a_ < 60 or max(w_, h_) > W * 0.15 or a_ < 0.5 * w_ * h_ or not (0.6 < w_ / max(1, h_) < 1.6) or y > H * 0.7: continue
        if sky is not None:   # 四周一圈（1.5~2.5 倍半徑）幾乎都要是天空 —— 路燈的燈罩有鐵架圍著，不算
            cx_, cy_ = ce[i]; r_ = max(w_, h_) / 2; ang = np.linspace(0, 6.283, 48, endpoint=False)
            ring = [sky[int(np.clip(cy_ + k * r_ * np.sin(a), 0, H - 1)), int(np.clip(cx_ + k * r_ * np.cos(a), 0, W - 1))] > 0.5 for k in (1.6, 2.4) for a in ang]
            if np.mean(ring) < 0.85: continue
        if best is None or a_ > st[best, 4]: best = i
    if best is None: return None
    return ce[best][0], ce[best][1], max(st[best, 2], st[best, 3]) / 2


def sun_layer(orig, sky):
    """原圖的太陽：本體＋光暈貼回程式天空；回傳 (rgb, alpha, 讓雲淡掉的範圍)。"""
    sn = sun_disc(orig, sky)
    if not sn: return None
    cx, cy, rad = sn
    YY, XX = np.mgrid[0:H, 0:W].astype(np.float32); d = np.hypot(XX - cx, YY - cy)
    a = np.clip((rad * 2.2 - d) / (rad * 1.4), 0, 1) * sky                 # 本體連一圈光暈，邊緣羽化
    keep = np.clip((rad * 5 - d) / (rad * 3), 0, 1)                       # 雲在這附近淡掉
    log('太陽', f'({cx:.0f},{cy:.0f}) r={rad:.0f}')
    return orig, a, keep


def smoke_auto(orig, sky_a, nmax=5):
    """自動找煙源（11-22）：原圖的煙柱都是從建築後面冒出來的 ⇒ 在每一欄的天空下緣（天際線）正上方那一段找「比同一列的天空暗很多」的連續欄，
    而且往上還延伸一截（煙柱，不是天際線附近的一小片暗雲）。每一段給一個源頭：中心 x、天際線下 6px、寬＝那一段的寬。"""
    m = sky_a > 0.5; lum = orig.mean(2)
    rowref = np.array([np.percentile(lum[y][m[y]], 70) if m[y].sum() > 20 else 255 for y in range(H)], np.float32)[:, None]
    D = ((rowref - lum) / np.maximum(rowref, 1) > 0.22) & m
    sb = np.array([np.max(np.where(m[:, x])[0], initial=-1) for x in range(W)])
    def frac(x, a, b):
        y0, y1 = max(0, sb[x] - b), max(0, sb[x] - a)
        return D[y0:y1, x].mean() if sb[x] > b and y1 > y0 else 0.0
    base = np.array([frac(x, 15, 110) for x in range(W)]); up = np.array([frac(x, 110, 220) for x in range(W)])   # 煙柱根部常被火照亮 → 看天際線上方 15~110px
    dark = np.convolve(((base > 0.35) & (up > 0.15)).astype(np.float32), np.ones(7) / 7, 'same') > 0.5
    runs, x = [], 0
    while x < W:
        if dark[x]:
            x0 = x
            while x < W and dark[x]: x += 1
            if x - x0 >= 10: runs.append((x0, x))
        x += 1
    runs.sort(key=lambda r: -(r[1] - r[0]))
    out = []
    for x0, x1 in runs[:nmax]:
        cx = (x0 + x1) / 2; out.append((cx, float(np.median(sb[x0:x1])) + 6, float(np.clip((x1 - x0) * 1.2, 30, 110))))
    return out


def export_live(name, orig, sky, sky_a, L, SUN, SM, WT, outdir):
    """即時跑的素材（全部與靜態圖同尺寸）：
      <名>_sky.webp        天空底（漸層＋靜止遠雲＋太陽）
      <名>_skymask.png     白＝天空（遊戲把靜態圖的這一塊挖掉，透出天空／雲／煙）
      <名>_cloud_{far,mid,near}.webp  程式雲三層（RGBA，遊戲裡往右捲、遠慢近快）
      <名>_sun.webp        太陽本體＋光暈（RGBA，畫在雲之上：雲經過不會擋住）
      <名>_water.png       河面遮罩（有水的格才有）
      <名>_smoke.webp      煙團圖集（8 格 × 256，已照這一格的煙色上好明暗）
      <名>_live.json       給 script/bg_fx.js 的規格（煙源、風、圖集每格的實際大小）"""
    os.makedirs(outdir, exist_ok=True); P = lambda s: os.path.join(outdir, f'{name}_{s}')
    u8 = lambda a: np.clip(a, 0, 255).astype(np.uint8)
    Image.fromarray(u8(sky)).save(P('sky.webp'), quality=92)
    Image.fromarray(u8(sky_a * 255)).save(P('skymask.png'))
    files = {'sky': 'sky.webp', 'mask': 'skymask.png'}
    for nm, Ly in zip(('far', 'mid', 'near'), L):
        c, a = Ly.render(30.0)
        Image.fromarray(np.dstack([u8(c), u8(a * 255)]), 'RGBA').save(P(f'cloud_{nm}.webp'), quality=90, method=6)
    if SUN:
        Image.fromarray(np.dstack([u8(SUN[0] * (SUN[1][..., None] > 0)), u8(SUN[1] * 255)]), 'RGBA').save(P('sun.webp'), quality=92, method=6); files['sun'] = 'sun.webp'
    if WT is not None:
        Image.fromarray(u8(WT.a[..., 0] * 255)).save(P('water.png')); files['water'] = 'water.png'
    # 煙團圖集：照 Smoke.render 的上色（煙色 ×(0.75＋0.5×亮度)），每格寬 256、高依比例（最高 256）
    # 煙色：原圖天空裡最暗的那 6%（＝原圖畫的煙柱本體，暗褐灰）—— Smoke 用的平均灰紫色在即時版會跟雲混在一起（11-22 實測）
    sk = orig[sky_a > 0.5]; v = sk.mean(1)
    col = np.median(sk[v <= np.percentile(v, 6)], 0) if len(sk) > 500 else SM.col
    cells = []; atlas = np.zeros((256, 256 * 8, 4), np.float32)
    for i, s in enumerate(SM.spr[:8]):
        h, w = s.shape[:2]; k = min(256 / w, 256 / h); cw, ch = max(8, int(w * k)), max(8, int(h * k))
        sp = cv2.resize(np.ascontiguousarray(s), (cw, ch), interpolation=cv2.INTER_AREA)
        l = sp[..., :3].mean(-1, keepdims=True) / 255
        atlas[:ch, i * 256:i * 256 + cw, :3] = col * (0.7 + 0.5 * l); atlas[:ch, i * 256:i * 256 + cw, 3] = sp[..., 3]
        cells.append([cw, ch])
    Image.fromarray(u8(atlas), 'RGBA').save(P('smoke.webp'), quality=90, method=6)
    msk = sky_a > 0.5; sbs = [np.max(np.where(msk[:, x])[0]) for x in range(W) if msk[:, x].any()]
    log('煙色（即時版）', np.round(col)); spec = dict(files=files, w=W, h=H, sky_frac=round(float(msk.mean()), 4),
                bottom=round(float(np.median(sbs)) / H, 3) if sbs else 0, smoke=dict(cells=cells, wind=round(float(SM.wind) / W, 5),
                src=[[round(x / W, 4), round(y / H, 4), round(w_ / W, 4)] for x, y, w_ in SM.srcs]))
    json.dump(spec, open(P('live.json'), 'w'), indent=1)
    log('✔ 即時素材', name, outdir); return True


def do(name):
    global W, H, GW, GH
    cp = cut_path(name); sp = os.path.join(LG, '_src', name + '.png')
    ns = glob.glob(os.path.join(LG, 'out', '*', name + '__nosmoke.png'))
    if ns and not os.environ.get('WAR_KEEPSMOKE'): sp = ns[0]; log('用 GPT 去煙版當底圖', os.path.basename(sp))   # Ray 11-12：火保留、煙拿掉，煙交給程式
    if ns and not os.environ.get('WAR_KEEPSMOKE'):
        nk = ns[0].replace('__nosmoke.png', '__nssky.png')
        if os.path.exists(nk): cp = nk; log('天空遮罩改用去煙版自己摳的', os.path.basename(nk))   # 舊的 __cut 連地上的煙一起挖，天空會往下吃
    else: ns = []
    if not os.path.exists(sp): log('沒有素材', name); return False
    iw, ih = Image.open(sp).size
    if iw > ih: W, H, GW, GH = 1536, 1024, 768, 512        # 北方泊地是橫的
    else: W, H, GW, GH = 768, 1024, 528, 704
    outd = os.path.join(HERE, 'out', name + '_war' + os.environ.get('WAR_SUFFIX', '')); os.makedirs(outd, exist_ok=True)
    if os.path.exists(os.path.join(outd, 'loop.mp4')) and '--recomp' not in sys.argv: log('已有', name); return True
    log('■ 戰地', name)
    orig = np.array(Image.open(sp).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    if cp:
        cutI = np.array(Image.open(cp).convert('RGB').resize((W, H), Image.LANCZOS))
        crgb, ca = CS.key_magenta(cutI); sky_a = 1 - ca                   # 1＝天空／雲／煙（洋紅）
    else:                                                                   # 室內：沒有天空，整張交給 Wan
        crgb = orig.copy(); sky_a = np.zeros((H, W), np.float32)
    # Ray 11-11：「不准 inpaint，只分天空跟天空以外這兩個跑」—— GPT 圖只拿洋紅的範圍當遮罩（搬到原圖座標），
    # 它補畫的建築一律不用；天空以外＝原圖整張交給 Wan，天空交給程式。全部在原圖座標做，沒有任何貼塊。
    Mw = align(orig, crgb.astype(np.float32), sky_a < 0.5)                  # 原圖 → GPT 圖
    Mi = np.linalg.inv(Mw)
    sky_o = cv2.warpPerspective(sky_a, Mi.astype(np.float64), (W, H)).clip(0, 1)
    if os.environ.get('WAR_SKY') == 'orig': sky_o = sky_from_orig(orig, sky_o); log('天空遮罩', '改從原圖切')
    m = sky_o > 0.5
    fill = np.median(orig[m].reshape(-1, 3), 0) if m.any() else np.array([180, 150, 140], np.float32)
    other = orig * (1 - sky_o[..., None]) + fill * sky_o[..., None]       # 天空鋪平（Wan 才不會去動雲）
    cut_o = cv2.warpPerspective(crgb.astype(np.float32), Mi.astype(np.float64), (W, H))
    fire = fire_mask(orig, cut_o, sky_o).astype(np.float32)               # 只拿來定煙的源頭
    nfire = int(fire.sum()); log('火', f'{nfire} px（只用來定煙的源頭）')
    if os.environ.get('WAR_STATIC'):   # Ray 11-12：港口「不用畫動畫，分天空就好」
        FR = [other]
    else:
      inp = f'war_{name}_other.png'; Image.fromarray(other.clip(0, 255).astype(np.uint8)).resize((GW, GH), Image.LANCZOS).save(os.path.join(Q.COMFY, 'input', inp))
      SEED = os.environ.get('WAR_SEED', '101'); sd = ('' if SEED == '101' else f's{SEED}') + ('' if PROMPT == '有風吹拂' else 'p' + __import__('hashlib').md5(PROMPT.encode()).hexdigest()[:4])   # Ray 11-12：跑出人／馬車／門開 ⇒ 換種子
      ns_ = ('ns' if ns else '') + ('k' if cp and cp.endswith('__nssky.png') else '')
      ab, ba = f'bgl/war_{name}_sep{sd}{ns_}_ab', f'bgl/war_{name}_sep{sd}{ns_}_ba'; env = dict(BG_W=str(GW), BG_H=str(GH), BG_NEG='')
      if len(Q.wan_out(ab)) < LAB:
          if not S.wait_gpu() or not run([Q.PY, 'bg_wan.py', inp, ab, str(LAB), PROMPT, SEED], env): return False
      B = f'war_{name}_sep{sd}{ns_}_B.png'; Image.open(Q.wan_out(ab)[K]).convert('RGB').save(os.path.join(Q.COMFY, 'input', B))
      if len(Q.wan_out(ba)) < LBA:
          if not S.wait_gpu() or not run([Q.PY, 'bg_flf.py', B, inp, ba, str(LBA), PROMPT, SEED], env): return False
      seq = Q.wan_out(ab)[:K + 1] + Q.wan_out(ba)[1:-1]
      FR = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) for f in seq]
      FR = S.rev_seam(FR, 1 - sky_o)
    pz = os.environ.get('WAR_PROTECT')   # Ray 11-12：人影／雕像那一塊遮掉 ⇒ 框內一律原圖（"x0,y0,x1,y1;…" 0~1 比例）
    if pz:
        P = np.zeros((H, W), np.float32)
        for b in pz.split(';'):
            x0, y0, x1, y1 = [float(v) for v in b.split(',')]; P[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1
        P = cv2.GaussianBlur(P, (0, 0), 6)[..., None]
        FR = [f * (1 - P) + other * P for f in FR]; log('遮掉', pz)
    sky_a = sky_o

    # ── 天空：原圖天空色漸層＋靜止遠景雲＋程式雲 ──
    m = sky_o > 0.5
    ys = np.where(m.any(1))[0]; yt, yb = (int(ys.min()), int(ys.max())) if len(ys) else (0, H // 3)
    col = lambda y0, y1: np.median(orig[y0:y1][m[y0:y1]].reshape(-1, 3), 0) if m[y0:y1].any() else np.array([200, 150, 120], np.float32)
    top_c, hor_c = col(yt, yt + max(8, (yb - yt) // 6)), col(max(yt, yb - (yb - yt) // 5), yb + 1)
    g = np.clip((np.arange(H) - yt) / max(1, yb - yt), 0, 1)[:, None, None]
    sky = np.broadcast_to(top_c * (1 - g) + hor_c * g, (H, W, 3)).astype(np.float32).copy()
    CS.W, CS.H = W, H; S.W, S.H = W, H; S.ORIG[0] = orig
    nosky = sky_a.max() < 0.01
    if not nosky: sky = S.sky_backdrop(sky, sky_a, (yt, yb), hor_c)
    L = [] if nosky else S.clouds(sky_a, (yt, yb), hor_c)
    SUN = None if nosky or os.environ.get('WAR_NOSUN') else sun_layer(orig, sky_a)   # WAR_NOSUN：自動判到的是火光不是太陽（逐格人工判）
    if SUN: sky = sky * (1 - SUN[1][..., None]) + SUN[0] * SUN[1][..., None]
    # ── 煙：從火冒出（沒有火就從原圖煙柱的底部）──
    srcs = []
    src_m = (fire > 0.5).astype(np.uint8); from_smoke = False
    if src_m.sum() < 300:   # 沒火：原圖天空裡又暗又灰的那一團＝煙（煙從那一團的底部冒 —— 底部就是火／建築）
        from_smoke = True
        hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV)
        sm = (m & (hsv[..., 1] < 145) & (hsv[..., 2] < 165)).astype(np.uint8)
        sm = cv2.morphologyEx(sm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        # 只留「底部貼著建築」的那幾團（煙柱從建築冒出來；暗雲飄在半空、不貼建築）
        near_g = cv2.dilate((~m).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
        n_, l_, s_, _ = cv2.connectedComponentsWithStats(sm)
        src_m = np.zeros_like(sm)
        for j in range(1, n_):
            if s_[j, 4] >= 300 and (near_g & (l_ == j)).any(): src_m[l_ == j] = 1
    if ns:   # 去煙版：煙＝原圖跟去煙版差很多、而且原圖那裡又灰（低彩度）的地方；程式煙從每一團的底部冒
        o0 = np.array(Image.open(os.path.join(LG, '_src', name + '.png')).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
        hs = cv2.cvtColor(o0.astype(np.uint8), cv2.COLOR_RGB2HSV)
        sm = ((np.abs(o0 - orig).mean(-1) > 22) & (hs[..., 1] < 90)).astype(np.uint8)
        src_m = cv2.morphologyEx(sm, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
        bot = []
        n0, lab0, st0, _ = cv2.connectedComponentsWithStats(cv2.dilate(src_m, np.ones((25, 25), np.uint8)))
        for i in sorted(range(1, n0), key=lambda i: -st0[i, 4])[:6]:
            x, y, w_, h_, a_ = st0[i]
            if a_ > 600: bot.append((x + w_ / 2, y + h_ * 0.9, max(30, min(160, w_ * 0.5))))
        srcs = bot; log('原圖的煙', f'{len(srcs)} 團（程式從底部冒）')
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(src_m, np.ones((15, 15), np.uint8)))
    for i in ([] if ns else sorted(range(1, n), key=lambda i: -st[i, 4])[:5]):
        x, y, w_, h_, a_ = st[i]
        if a_ < 200: continue
        if from_smoke:   # 煙柱貼著建築的那幾段（一團可能有好幾根柱）：依 x 分群，每群一個源頭，在貼地處的最低點
            cy_, cx_ = np.where((lab == i) & near_g)
            if not len(cx_): continue
            o_ = np.argsort(cx_); cx_, cy_ = cx_[o_], cy_[o_]
            cut = np.where(np.diff(cx_) > 25)[0] + 1
            for gx_, gy_ in zip(np.split(cx_, cut), np.split(cy_, cut)):
                if len(gx_) < 40: continue
                yb_ = gy_.max(); sel = gy_ > yb_ - 20
                srcs.append((float(gx_[sel].mean()), float(yb_) + 8, max(30, min(110, (gx_.max() - gx_.min()) * 0.8))))
        else:
            srcs.append((x + w_ / 2, y + h_ * 0.2, max(30, min(140, w_ * 0.9))))
    hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV)
    smk = orig[m & (hsv[..., 1] < 110) & (hsv[..., 2] < 140)]
    scol = np.median(smk, 0) if len(smk) > 200 else np.array([70, 62, 64], np.float32)
    if not os.environ.get('WAR_SMOKE') and os.environ.get('WAR_EXPORT'):
        srcs = smoke_auto(orig, sky_a); log('煙源（自動）', [(round(a), round(b), round(c)) for a, b, c in srcs])
    if os.environ.get('WAR_SMOKE'):   # 手指定煙源（x,y,寬；以 768×1024 計），自動偵測在夕陽天空上不可靠（整片天都又亮又橘又有紋理）
        srcs = [tuple(float(v) * (W / 768 if k != 1 else H / 1024) for k, v in enumerate(s.split(','))) for s in os.environ['WAR_SMOKE'].split(';')]
    if nosky: srcs = []
    FPS = int(os.environ.get('WAR_FPS', 24)); T = max(12.0, len(FR) / FPS * 3)   # 11-22 Ray：幀數更高（16→24）
    SM = Smoke(srcs, CS.cut_grid(DL + ('cloudgrid_mid.png' if os.path.exists(DL + 'cloudgrid_mid.png') else 'cloudgrid_v2_a.png')), scol, seed=sum(map(ord, name)), loop_s=T)
    log('煙', f'{len(srcs)} 個源頭，色 {scol.round()}', [(round(a), round(b), round(c)) for a, b, c in srcs])
    WT = Water(orig, sky_o, os.environ['WAR_WATER'].split(';'), T) if os.environ.get('WAR_WATER') else None
    if os.environ.get('WAR_EXPORT'):   # 11-22 Ray：「改遊戲內即時跑」—— 不出影片，出拆層素材＋規格，交給 modules/bgfx.js 在遊戲裡即時跑（沒有循環 → 沒有縫）
        return export_live(name, orig, sky, sky_a, L, SUN, SM, WT, os.environ['WAR_EXPORT'])
    outp = os.path.join(outd, 'loop.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', outp], stdin=subprocess.PIPE)
    vis = sky_a[..., None]
    for fi in range(int(os.environ.get('WAR_NFR', 0)) or int(T * FPS)):
        t = 30 + fi / FPS; img = sky.copy()
        for Ly in L:
            c, a = Ly.render(t)
            if SUN: a = a * (1 - 0.85 * SUN[2])
            img = img * (1 - a[..., None]) + c * a[..., None]
        sr, sa = np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32); SM.render(30 + fi / FPS, sr, sa)
        img = img * (1 - sa[..., None]) + sr * sa[..., None]   # 煙在天空這一層（Ray 11-22：煙一律壓在建築後面）
        img = img * vis + FR[fi % len(FR)] * (1 - vis)
        if WT: img = WT.render(fi / FPS, img)
        p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
        if fi == 40: Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(os.path.join(outd, 'f40.jpg'))
    p.stdin.close(); p.wait()
    json.dump({'name': name, 'fire_px': nfire, 'fg_frames': len(FR), 'smoke_src': len(srcs)}, open(os.path.join(outd, 'meta.json'), 'w'), indent=1)
    log('✔ 戰地', name, outp); return True


if __name__ == '__main__':
    for n in [x for x in sys.argv[1:] if not x.startswith('--')]:
        do(n)

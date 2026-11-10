"""背景線：GPT 九宮格雲塊 → 程式跑的雲海（Ray 11-10：「讓 gpt 生 9 宮格雲塊 3 組 切著用」「變形也可以給程式做」）。
雲的畫風交給 GPT（同一套畫風畫背景），動態全由程式：
  · 切塊：九宮格（純洋紅底）鍵成 alpha，每格取最大的那一團 ⇒ 一組 9 塊，三組＝遠／中／近。
  · 湧：每一塊從雲海面底下冒上來，邊升邊放大，到頂之後縮小沉回去，底下再冒新的 ⇒ 不間斷；只往前，不可能倒回。
  · 變形：每一塊自己帶一張緩慢演化的平滑位移場（雜訊沿時間只往前演化），加上縱橫比的緩慢呼吸 ⇒ 雲團在翻湧，不是一張貼紙。
  · 底部淡進霧裡，越遠的層越偏天空色。
Sprites(set_png).render_layer(t, spec) → (rgb, alpha)；呼叫端決定疊層順序（見 cloud_sea_comp.py）。"""
import numpy as np, cv2
from PIL import Image

W, H = 1536, 1024


def key_magenta(a):
    """洋紅底解混色：像素 ＝ 雲色·α ＋ 洋紅·(1−α)。洋紅程度 m＝(min(R,B)−G)/255 ⇒ α≈1−m，
    再反算雲色 C＝(P − (1−α)·M)/α —— 半透明的雲底不會殘留粉紅。"""
    a = a.astype(np.float32)
    m = np.clip((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) / 255, 0, 1)
    al = np.clip((1 - m - 0.06) / 0.94, 0, 1)
    M = np.array([255, 0, 255], np.float32)
    rgb = (a - (1 - al)[..., None] * M) / np.maximum(al, 0.05)[..., None]
    rgb[..., 0] = np.minimum(rgb[..., 0], rgb[..., 1] + 8)   # 雲是冷色：紅不高過綠 ⇒ 去掉 GPT 畫進雲底的淡紫
    al = cv2.GaussianBlur(al, (0, 0), 0.6)
    return rgb.clip(0, 255), al


def cut_grid(png):
    """九宮格 → 9 塊（每格取最大連通的那一團，裁到緊貼）。"""
    a = np.array(Image.open(png).convert('RGB'))
    rgb, al = key_magenta(a); h, w = al.shape; out = []
    for gy in range(3):
        for gx in range(3):
            y0, y1, x0, x1 = gy * h // 3, (gy + 1) * h // 3, gx * w // 3, (gx + 1) * w // 3
            m = (al[y0:y1, x0:x1] > 0.5).astype(np.uint8)
            n, lab, st, _ = cv2.connectedComponentsWithStats(m)
            if n < 2: continue
            i = 1 + int(np.argmax(st[1:, 4])); x, y, ww, hh, _ = st[i]
            if ww < 20 or hh < 20: continue
            keep = cv2.dilate((lab == i).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)
            A = (al[y0:y1, x0:x1] * keep)[y:y + hh, x:x + ww]
            out.append(np.dstack([rgb[y0:y1, x0:x1][y:y + hh, x:x + ww], A * 255]).astype(np.float32))
    return out


class Layer:
    def __init__(self, sprites, seed, surface, depth, n, wmin, wmax, life, drift, haze_col=None, haze=0.0, fog_col=None):
        rng = np.random.default_rng(seed)
        self.spr = sprites; self.surface, self.depth, self.n = surface, depth, n
        self.ph = (np.arange(n) + rng.random(n) * 0.9) / n
        self.bx = rng.random(n); self.k0 = rng.random(n) * 10
        self.wmax = rng.uniform(wmin, wmax, n)                         # 最寬時的寬度（像素）
        self.life = life * rng.uniform(0.8, 1.2, n)
        self.drift = drift * rng.uniform(0.7, 1.3, n)
        self.sid = rng.integers(0, len(sprites), n); self.flip = rng.random(n) < 0.5
        self.wseed = rng.integers(0, 1 << 30, n)
        self.haze_col = np.array(haze_col if haze_col is not None else (200, 214, 234), np.float32); self.haze = haze
        self.fog_col = np.array(fog_col if fog_col is not None else (205, 216, 234), np.float32)

    def warp(self, s, i, t):
        """逐塊的翻湧變形：兩個時間切片的平滑雜訊之間只往前插值（不回頭），位移量約寬度的 4%。"""
        h, w = s.shape[:2]
        rate = 0.18; z = t * rate + (self.wseed[i] % 1000) * 0.37; z0 = int(z); f = z - z0; f = f * f * (3 - 2 * f)

        def slice_(k, ax):
            r = np.random.default_rng((int(self.wseed[i]) * 131 + k * 7 + ax) & 0x7fffffff)
            g = r.standard_normal((4, 4)).astype(np.float32)
            return cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        amp = 0.04 * w
        dx = (slice_(z0, 0) * (1 - f) + slice_(z0 + 1, 0) * f) * amp
        dy = (slice_(z0, 1) * (1 - f) + slice_(z0 + 1, 1) * f) * amp * 0.7
        gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        return cv2.remap(s, (gx + dx).astype(np.float32), (gy + dy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

    def render(self, t):
        rgb = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
        ys = np.arange(H, dtype=np.float32)[:, None]
        fog = np.clip((ys - self.surface - self.depth * 0.2) / (self.depth * 0.6), 0, 1)
        rgb[:] = self.fog_col; A[:] = np.broadcast_to(fog * 0.92, (H, W))   # 雲海深處的霧
        age = t / self.life + self.ph; u = age % 1.0; k = np.floor(age)
        rise = np.clip(u / 0.65, 0, 1)
        grow = 0.45 + 0.55 * np.sin(np.clip(u, 0, 1) * np.pi) ** 0.7
        y_bot = self.surface + self.depth * (1 - rise) + 30                   # 雲塊底緣一路往上
        x = ((self.bx + k * 0.618 + self.k0) % 1.0) * (W + 400) - 200 + self.drift * u * self.life
        for i in np.argsort(y_bot):                                            # 上面（遠）的先畫
            s = self.spr[self.sid[i]]
            if self.flip[i]: s = s[:, ::-1]
            breath = 1 + 0.06 * np.sin(t * 0.25 + self.wseed[i] % 7)          # 縱橫比緩慢呼吸
            ww = int(self.wmax[i] * grow[i] * (0.8 + 0.3 * np.clip((y_bot[i] - self.surface) / self.depth, 0, 1)))
            hh = int(ww * s.shape[0] / s.shape[1] * breath)
            if ww < 8 or hh < 8: continue
            sp = cv2.resize(np.ascontiguousarray(s), (ww, hh), interpolation=cv2.INTER_AREA)
            sp = self.warp(sp, i, t)
            yy = np.linspace(0, 1, hh, dtype=np.float32)[:, None]
            al = sp[..., 3] / 255 * np.clip((1.0 - yy) / 0.45, 0, 1)            # 下半淡進霧裡
            col = sp[..., :3] * (1 - self.haze) + self.haze_col * self.haze
            x0, y0 = int(x[i] - ww / 2), int(y_bot[i] - hh)
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + ww), min(H, y0 + hh)
            if xa >= xb or ya >= yb: continue
            sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0)); a = al[sl][..., None]
            rgb[ya:yb, xa:xb] = rgb[ya:yb, xa:xb] * (1 - a) + col[sl] * a
            A[ya:yb, xa:xb] = A[ya:yb, xa:xb] * (1 - a[..., 0]) + a[..., 0]
        return rgb, A

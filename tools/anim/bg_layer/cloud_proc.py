"""背景線：程式生成的賽璐珞雲海（Ray 11-10：「用程式跑，不是叫程式拿著畫好的圖跑」「雲海有層次，在近景的崖之下、在遠景的山之上」）。
沒有任何素材 —— 雲完全由程式算出來：
  · 一層雲海＝一片底（起伏的雲海面）＋一群「雲堆」。每一堆＝一個主體＋上半圈一圈小雲瓣（花椰菜邊）。
    雲堆從雲海面底下冒上來，邊升邊膨脹，到頂之後縮回去沉進雲海，底下再冒新的 ⇒ 不間斷地「湧」；
    每一堆只往前走，不可能倒回。
  · 上色看整片雲的形狀（不是逐顆球）：把覆蓋範圍模糊，往光源（左上）方向取樣 ——
    靠左上外緣的是亮面、裡面是中間影、右下背光那一側是深影；三階硬邊＋外輪廓線。
  · 層與層：遠層較小、較淡、偏天空色（空氣遠近），近層較大、較白。
Layer(...).render(t) → (rgb float32 H×W×3, alpha float32 H×W)；呼叫端決定疊層順序。"""
import numpy as np, cv2

W, H = 1536, 1024


class Layer:
    def __init__(self, seed, surface, depth, n, rmin, rmax, life, drift, lit, mid, deep, line, base_wave=10, light_px=None):
        rng = np.random.default_rng(seed)
        self.surface, self.depth, self.n = surface, depth, n
        self.ph = (np.arange(n) + rng.random(n) * 0.9) / n
        self.bx = rng.random(n); self.k0 = rng.random(n) * 10
        self.R = rng.uniform(rmin, rmax, n)
        self.life = life * rng.uniform(0.8, 1.2, n)
        self.drift = drift * rng.uniform(0.7, 1.3, n)
        self.nb = rng.integers(6, 10, n)                                 # 每堆幾個小雲瓣
        self.bseed = rng.random((n, 12, 3))                             # 小雲瓣的角度／大小／外推抖動
        self.col = [np.array(c, np.float32) for c in (lit, mid, deep, line)]
        self.wave_ph = rng.random(3) * 6.28; self.base_wave = base_wave
        self.lp = light_px or max(6, int(rmax * 0.22))                 # 打光取樣的位移（像素）

    def heaps(self, t):
        age = (t / self.life + self.ph); u = age % 1.0; k = np.floor(age)
        x = ((self.bx + k * 0.618 + self.k0) % 1.0) * (W + 400) - 200 + self.drift * u * self.life
        rise = np.clip(u / 0.65, 0, 1)
        R = self.R * (0.4 + 0.6 * np.sin(np.clip(u, 0, 1) * np.pi) ** 0.7)
        y = self.surface + self.depth * (1 - rise) - R * 0.35 * rise
        return x, y, R

    def heap_mask(self, i, r, pad):
        """一堆雲的覆蓋：主體＋上半圈雲瓣＋雲瓣上再長小雲瓣（三個尺度 ⇒ 邊緣細碎，像原圖的手繪積雲）。"""
        m = np.zeros((2 * pad, 2 * pad), np.uint8); c = pad
        cv2.ellipse(m, (c, c), (int(r * 1.15), int(r * 0.8)), 0, 0, 360, 1, -1)
        cv2.ellipse(m, (c, c + int(r * 0.6)), (int(r * 1.7), int(r * 0.75)), 0, 0, 360, 1, -1)
        rs = self.bseed[i]
        for j in range(self.nb[i]):
            a = np.pi * (1.02 + 0.96 * (j + 0.5 * rs[j, 0]) / self.nb[i])
            rr = r * (0.34 + 0.24 * rs[j, 1]); d = r * (0.78 + 0.16 * rs[j, 2])
            px, py = c + np.cos(a) * d * 1.12, c + np.sin(a) * d * 0.82
            cv2.circle(m, (int(px), int(py)), int(rr), 1, -1)
            for q in range(3):                                         # 小雲瓣
                b = a + (q - 1) * 0.55 + (rs[(j + q) % 12, 0] - 0.5) * 0.3
                r2 = rr * (0.32 + 0.2 * rs[(j + 3 * q) % 12, 1])
                cv2.circle(m, (int(px + np.cos(b) * rr * 0.92), int(py + np.sin(b) * rr * 0.86)), max(1, int(r2)), 1, -1)
        return m

    def render(self, t):
        rgb = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
        xs = np.arange(W, dtype=np.float32)
        top = self.surface + self.base_wave * (np.sin(xs / 230 + self.wave_ph[0] + t * 0.04) + 0.5 * np.sin(xs / 103 + self.wave_ph[1] - t * 0.07))
        ys = np.arange(H, dtype=np.float32)[:, None]
        hz = np.clip((ys - top[None, :] - self.depth * 0.15) / (self.depth * 0.5), 0, 1)   # 雲海深處的霧：越下面越實
        rgb[:] = self.col[3]; A[:] = hz * 0.95
        x, y, R = self.heaps(t)
        R = R * (0.75 + 0.5 * np.clip((y - self.surface) / max(1, self.depth), 0, 1))
        C0, C1, C2, C3 = self.col
        for i in np.argsort(y):
            r = R[i]
            if r < 3: continue
            pad = int(r * 2.4) + 4; cx, cy = int(x[i]), int(y[i]); x0, y0 = cx - pad, cy - pad
            m = self.heap_mask(i, r, pad); mf = m.astype(np.float32)
            lp = max(2, int(r * 0.16))
            b = cv2.GaussianBlur(mf, (0, 0), lp)
            toward = np.roll(np.roll(b, lp, 0), lp // 2, 1); away = np.roll(np.roll(b, -lp, 0), -lp // 2, 1)
            yy = (np.arange(2 * pad, dtype=np.float32)[:, None] - pad) / r
            # 四階：亮面（左上外緣）／淡面／中間影／陰影（下半、右下）
            tone = np.where(toward < 0.55, 0, np.where(toward < 0.8, 1, 2))
            tone = np.where((away < 0.6) & (yy > -0.2), 3, tone)
            tone = np.where((yy > 0.25) & (tone < 2), 2, tone); tone = np.where(yy > 0.6, 3, tone)
            col = np.where((tone == 0)[..., None], C0, np.where((tone == 1)[..., None], (C0 + C1) / 2, np.where((tone == 2)[..., None], C1, C2)))
            # 底部淡進霧裡（不畫線、不硬切）
            al = mf * np.clip(1.0 - (yy - 0.45) / 0.6, 0, 1)
            al = cv2.GaussianBlur(al, (0, 0), 0.7)
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + 2 * pad), min(H, y0 + 2 * pad)
            if xa >= xb or ya >= yb: continue
            sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0)); a = al[sl][..., None]
            rgb[ya:yb, xa:xb] = rgb[ya:yb, xa:xb] * (1 - a) + col[sl] * a
            A[ya:yb, xa:xb] = A[ya:yb, xa:xb] * (1 - a[..., 0]) + a[..., 0]
        return rgb, A

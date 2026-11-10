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
        self.nb = rng.integers(5, 9, n)                                 # 每堆幾個小雲瓣
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

    def render(self, t):
        rgb = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
        xs = np.arange(W, dtype=np.float32)
        top = self.surface + self.base_wave * (np.sin(xs / 230 + self.wave_ph[0] + t * 0.04) + 0.5 * np.sin(xs / 103 + self.wave_ph[1] - t * 0.07))
        ys = np.arange(H, dtype=np.float32)[:, None]
        base = ys >= top[None, :] + self.depth * 0.25
        rgb[base] = self.col[1]; A[base] = 1                       # 雲海深處（被雲堆蓋住，偶爾從縫裡看到）
        x, y, R = self.heaps(t)
        # 透視：越下面（越近）越大
        R = R * (0.75 + 0.5 * np.clip((y - self.surface) / max(1, self.depth), 0, 1))
        for i in np.argsort(y):                                    # 遠（上面）的先畫，近的蓋上去
            r = R[i]
            if r < 3: continue
            pad = int(r * 2.2) + 4
            cx, cy = int(x[i]), int(y[i])
            x0, y0 = cx - pad, cy - pad
            m = np.zeros((2 * pad, 2 * pad), np.uint8); c = (pad, pad)
            cv2.ellipse(m, c, (int(r * 1.2), int(r * 0.9)), 0, 0, 360, 1, -1)
            cv2.ellipse(m, (pad, pad + int(r * 0.7)), (int(r * 1.7), int(r * 0.9)), 0, 0, 360, 1, -1)   # 寬的下半身，往兩側攤開沉進雲海
            for j in range(self.nb[i]):
                a = np.pi * (1.05 + 0.9 * (j + 0.5 * self.bseed[i, j, 0]) / self.nb[i])
                rr = r * (0.36 + 0.26 * self.bseed[i, j, 1]); d = r * (0.8 + 0.18 * self.bseed[i, j, 2])
                cv2.circle(m, (int(pad + np.cos(a) * d * 1.12), int(pad + np.sin(a) * d * 0.85)), int(rr), 1, -1)
            mf = m.astype(np.float32); lp = max(3, int(r * 0.22))
            b = cv2.GaussianBlur(mf, (0, 0), lp)
            toward = np.roll(np.roll(b, lp, 0), lp // 2, 1); away = np.roll(np.roll(b, -lp, 0), -lp // 2, 1)
            tone = np.where(toward < 0.66, 0, np.where(away < 0.62, 2, 1))
            # 雲堆下半部本來就在陰影裡（越往下越暗）
            yy = (np.arange(2 * pad)[:, None] - pad) / r
            tone = np.where((yy > 0.35) & (tone == 0), 1, tone); tone = np.where(yy > 0.75, 2, tone)
            col = np.where((tone == 0)[..., None], self.col[0], np.where((tone == 1)[..., None], self.col[1], self.col[2]))
            edge = cv2.morphologyEx(m, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0
            edge &= (np.arange(2 * pad)[:, None] < pad + r * 0.5)   # 下面接雲海的那段不畫線
            col[edge] = self.col[3]
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + 2 * pad), min(H, y0 + 2 * pad)
            if xa >= xb or ya >= yb: continue
            sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0)); on = m[sl] > 0
            rgb[ya:yb, xa:xb][on] = col[sl][on]; A[ya:yb, xa:xb][on] = 1
        A = cv2.GaussianBlur(A, (0, 0), 0.6)
        return rgb, A

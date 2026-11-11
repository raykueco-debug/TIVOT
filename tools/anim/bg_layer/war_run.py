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
DL = r'C:/Users/Ray Ku/Downloads/'
W, H = 768, 1024                      # 戰地是直式 3:4
GW, GH = 528, 704                     # Wan 的解析度（16 的倍數、3:4）
K, LAB, LBA = 23, 81, 33
PROMPT = '有風吹拂'   # Ray 11-11：空提示詞 Wan 會生出跑過去的士兵 ⇒ 只寫這一句


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
    """程式煙：每個源頭固定間隔冒一團，往上升、變大、隨風往一邊偏、越高越淡。時間只往前。"""
    def __init__(self, srcs, sprites, col, seed=7, wind=None):
        self.srcs = srcs; self.spr = sprites; self.col = np.array(col, np.float32)
        r = np.random.default_rng(seed); self.wind = wind if wind is not None else r.choice([-1, 1]) * r.uniform(8, 16)
        self.ph = r.random(len(srcs)); self.r = r

    def render(self, t, rgb, A):
        for si, (sx, sy, sw) in enumerate(self.srcs):
            life = 7.0; every = 0.55
            n0 = int((t - life) / every) - 1; n1 = int(t / every) + 1
            for k in range(max(0, n0), n1 + 1):
                birth = (k + self.ph[si]) * every; age = t - birth
                if age < 0 or age > life: continue
                u = age / life
                rr = np.random.default_rng(si * 100003 + k)
                s = self.spr[rr.integers(len(self.spr))]
                if rr.random() < 0.5: s = s[:, ::-1]
                ww = int(sw * (0.7 + 2.6 * u) * rr.uniform(0.8, 1.2)); hh = int(ww * s.shape[0] / s.shape[1])
                if ww < 6 or hh < 6: continue
                cx = sx + self.wind * age * (1 + u) + rr.uniform(-0.3, 0.3) * sw
                cy = sy - age * (H * 0.045) * (1 + 0.6 * u)
                sp = cv2.resize(np.ascontiguousarray(s), (ww, hh), interpolation=cv2.INTER_AREA)
                a = sp[..., 3] / 255 * (np.clip(u / 0.08, 0, 1) * (1 - u) ** 1.3) * 0.85
                l = sp[..., :3].mean(-1, keepdims=True) / 255
                c = self.col * (0.75 + 0.5 * l)
                x0, y0 = int(cx - ww / 2), int(cy - hh / 2)
                xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + ww), min(H, y0 + hh)
                if xa >= xb or ya >= yb: continue
                sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0)); aa = a[sl][..., None]
                rgb[ya:yb, xa:xb] = rgb[ya:yb, xa:xb] * (1 - aa) + c[sl] * aa
                A[ya:yb, xa:xb] = A[ya:yb, xa:xb] * (1 - aa[..., 0]) + aa[..., 0]


def do(name):
    cp = cut_path(name); sp = os.path.join(LG, '_src', name + '.png')
    if not cp or not os.path.exists(sp): log('沒有素材', name); return False
    outd = os.path.join(HERE, 'out', name + '_war'); os.makedirs(outd, exist_ok=True)
    if os.path.exists(os.path.join(outd, 'loop.mp4')) and '--recomp' not in sys.argv: log('已有', name); return True
    log('■ 戰地', name)
    orig = np.array(Image.open(sp).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    cutI = np.array(Image.open(cp).convert('RGB').resize((W, H), Image.LANCZOS))
    crgb, ca = CS.key_magenta(cutI); sky_a = 1 - ca                       # 1＝天空／雲／煙（洋紅）
    # Ray 11-11：「不准 inpaint，只分天空跟天空以外這兩個跑」—— GPT 圖只拿洋紅的範圍當遮罩（搬到原圖座標），
    # 它補畫的建築一律不用；天空以外＝原圖整張交給 Wan，天空交給程式。全部在原圖座標做，沒有任何貼塊。
    Mw = align(orig, crgb.astype(np.float32), sky_a < 0.5)                  # 原圖 → GPT 圖
    Mi = np.linalg.inv(Mw)
    sky_o = cv2.warpPerspective(sky_a, Mi.astype(np.float64), (W, H)).clip(0, 1)
    m = sky_o > 0.5
    fill = np.median(orig[m].reshape(-1, 3), 0) if m.any() else np.array([180, 150, 140], np.float32)
    other = orig * (1 - sky_o[..., None]) + fill * sky_o[..., None]       # 天空鋪平（Wan 才不會去動雲）
    cut_o = cv2.warpPerspective(crgb.astype(np.float32), Mi.astype(np.float64), (W, H))
    fire = fire_mask(orig, cut_o, sky_o).astype(np.float32)               # 只拿來定煙的源頭
    nfire = int(fire.sum()); log('火', f'{nfire} px（只用來定煙的源頭）')
    inp = f'war_{name}_other.png'; Image.fromarray(other.clip(0, 255).astype(np.uint8)).resize((GW, GH), Image.LANCZOS).save(os.path.join(Q.COMFY, 'input', inp))
    ab, ba = f'bgl/war_{name}_sep_ab', f'bgl/war_{name}_sep_ba'; env = dict(BG_W=str(GW), BG_H=str(GH), BG_NEG='')
    if len(Q.wan_out(ab)) < LAB:
        if not S.wait_gpu() or not run([Q.PY, 'bg_wan.py', inp, ab, str(LAB), PROMPT, '101'], env): return False
    B = f'war_{name}_sep_B.png'; Image.open(Q.wan_out(ab)[K]).convert('RGB').save(os.path.join(Q.COMFY, 'input', B))
    if len(Q.wan_out(ba)) < LBA:
        if not S.wait_gpu() or not run([Q.PY, 'bg_flf.py', B, inp, ba, str(LBA), PROMPT, '101'], env): return False
    seq = Q.wan_out(ab)[:K + 1] + Q.wan_out(ba)[1:-1]
    FR = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) for f in seq]
    FR = S.rev_seam(FR, 1 - sky_o)
    sky_a = sky_o

    # ── 天空：原圖天空色漸層＋靜止遠景雲＋程式雲 ──
    m = sky_o > 0.5
    ys = np.where(m.any(1))[0]; yt, yb = (int(ys.min()), int(ys.max())) if len(ys) else (0, H // 3)
    col = lambda y0, y1: np.median(orig[y0:y1][m[y0:y1]].reshape(-1, 3), 0) if m[y0:y1].any() else np.array([200, 150, 120], np.float32)
    top_c, hor_c = col(yt, yt + max(8, (yb - yt) // 6)), col(max(yt, yb - (yb - yt) // 5), yb + 1)
    g = np.clip((np.arange(H) - yt) / max(1, yb - yt), 0, 1)[:, None, None]
    sky = np.broadcast_to(top_c * (1 - g) + hor_c * g, (H, W, 3)).astype(np.float32).copy()
    CS.W, CS.H = W, H; S.W, S.H = W, H; S.ORIG[0] = orig
    sky = S.sky_backdrop(sky, sky_a, (yt, yb), hor_c)
    L = S.clouds(sky_a, (yt, yb), hor_c)
    # ── 煙：從火冒出（沒有火就從原圖煙柱的底部）──
    srcs = []
    src_m = (fire > 0.5).astype(np.uint8)
    if src_m.sum() < 300:   # 沒火：原圖天空裡又暗又灰的那一團＝煙
        hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV)
        sm = (m & (hsv[..., 1] < 110) & (hsv[..., 2] < 120)).astype(np.uint8)
        src_m = sm
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(src_m, np.ones((15, 15), np.uint8)))
    for i in sorted(range(1, n), key=lambda i: -st[i, 4])[:5]:
        x, y, w_, h_, a_ = st[i]
        if a_ < 200: continue
        srcs.append((x + w_ / 2, y + (0 if src_m.sum() < 300 else h_ * 0.2), max(30, min(140, w_ * 0.9))))
    hsv = cv2.cvtColor(orig.astype(np.uint8), cv2.COLOR_RGB2HSV)
    smk = orig[m & (hsv[..., 1] < 110) & (hsv[..., 2] < 140)]
    scol = np.median(smk, 0) if len(smk) > 200 else np.array([70, 62, 64], np.float32)
    SM = Smoke(srcs, CS.cut_grid(DL + 'cloudgrid_mid.png'), scol, seed=hash(name) & 0xffff)
    log('煙', f'{len(srcs)} 個源頭，色 {scol.round()}')

    FPS = 16; T = max(12.0, len(FR) / FPS * 3)
    outp = os.path.join(outd, 'loop.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', outp], stdin=subprocess.PIPE)
    vis = sky_a[..., None]
    for fi in range(int(T * FPS)):
        t = 30 + fi / FPS; img = sky.copy()
        for Ly in L:
            c, a = Ly.render(t); img = img * (1 - a[..., None]) + c * a[..., None]
        sr, sa = np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32); SM.render(t, sr, sa)
        img = img * (1 - sa[..., None]) + sr * sa[..., None]
        img = img * vis + FR[fi % len(FR)] * (1 - vis)
        p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
        if fi == 40: Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(os.path.join(outd, 'f40.jpg'))
    p.stdin.close(); p.wait()
    json.dump({'name': name, 'fire_px': nfire, 'fg_frames': len(FR), 'smoke_src': len(srcs)}, open(os.path.join(outd, 'meta.json'), 'w'), indent=1)
    log('✔ 戰地', name, outp); return True


if __name__ == '__main__':
    for n in [x for x in sys.argv[1:] if not x.startswith('--')]:
        do(n)

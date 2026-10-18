# 宣傳片：給「黑底去背」的 CI 影片墊一層硝煙背景（ver -2224，Ray：「幫尼莫加個硝煙背景吧」）。
#
#   py -X utf8 tools/promo/smoke_bg.py <輸入.mp4> <輸出.mp4> [--sample <秒> <輸出.png>]
#
# 作法：從畫面四邊往內 flood fill「幾乎全黑」的像素 ＝ 背景（人身上的深色衣服跟外面不連通，不會被吃掉；
# 金色火星不是黑的，照舊留著）→ 遮罩邊緣羽化 → 背後換成程序生成的硝煙（多層雜訊、慢慢往上飄、
# 灰褐色、靠近槍口的地方帶一點火光）。輸出跟輸入同尺寸、同幀率。
import sys, subprocess, json, math
import numpy as np
from PIL import Image, ImageFilter

def probe(p):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                                   '-of', 'json', p], capture_output=True, text=True).stdout)['streams'][0]
    a, b = j['r_frame_rate'].split('/'); return j['width'], j['height'], int(a) / int(b)

def frames(p, w, h):
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        b = pr.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)

DARK = 16          # 背景的黑：每個通道都 ≤ 這個
def bg_mask(f):
    from scipy import ndimage  # noqa  （有就用；沒有走下面的純 numpy）
def bg_mask_np(f):
    dark = f.max(-1) <= DARK
    h, w = dark.shape
    m = np.zeros_like(dark)
    m[0, :] = dark[0, :]; m[-1, :] = dark[-1, :]; m[:, 0] = dark[:, 0]; m[:, -1] = dark[:, -1]
    # 反覆往四個方向擴（只擴進 dark 的格子）直到不再變 —— 等同從邊界 flood fill
    for _ in range(4000):
        n = m.copy()
        n[1:, :] |= m[:-1, :]; n[:-1, :] |= m[1:, :]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
        n &= dark
        if (n == m).all(): break
        m = n
    return m

def smoke_field(w, h, t, seed=11):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w))
    amp, tot = 1.0, 0.0
    for octv, (gw, gh) in enumerate([(5, 7), (9, 13), (17, 25), (33, 49)]):
        base = rng.random((gh * 2, gw * 2))
        # 往上飄、左右晃：取一個隨時間移動的視窗
        oy = (t * (0.18 + 0.06 * octv)) % 1.0 * gh
        ox = (math.sin(t * 0.7 + octv) * 0.15 + t * 0.05) % 1.0 * gw
        y0, x0 = int(oy), int(ox)
        win = base[y0:y0 + gh + 1, x0:x0 + gw + 1]
        im = Image.fromarray((win * 255).astype(np.uint8)).resize((w + int(w / gw), h + int(h / gh)), Image.BICUBIC)
        fy, fx = int((oy - y0) * h / gh), int((ox - x0) * w / gw)
        acc += np.asarray(im, float)[fy:fy + h, fx:fx + w] / 255 * amp
        tot += amp; amp *= 0.55
    s = acc / tot
    s = np.clip((s - 0.38) * 2.2, 0, 1) ** 1.3          # 拉開對比：一團一團的煙
    return s

def compose(f, t, muzzles):
    h, w, _ = f.shape
    m = bg_mask_np(f).astype(np.uint8) * 255
    m = np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.6)), float)[..., None] / 255
    s = smoke_field(w, h, t)[..., None]
    smoke = np.array([92, 86, 80]) * s + np.array([14, 12, 12]) * (1 - s)        # 灰褐色的煙、深底
    yy, xx = np.mgrid[0:h, 0:w]
    glow = np.zeros((h, w))
    for (mx, my) in muzzles:                                                  # 槍口附近的火光照在煙上
        glow += np.exp(-(((xx - mx * w) ** 2 + (yy - my * h) ** 2) / (2 * (0.22 * w) ** 2)))
    glow = np.clip(glow, 0, 1)[..., None]
    smoke = smoke + glow * s * np.array([150, 80, 20]) + glow * np.array([40, 18, 4])
    vig = (1 - 0.55 * (((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2.2)).clip(0.35, 1)[..., None]
    smoke = smoke * vig
    out = f * (1 - m) + smoke * m
    return np.clip(out, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    w, h, fps = probe(src)
    MUZ = [(0.11, 0.37), (0.88, 0.18)]       # 尼莫兩把槍的槍口（畫面比例）
    if '--sample' in sys.argv:
        i = sys.argv.index('--sample'); ts, outp = float(sys.argv[i + 1]), sys.argv[i + 2]
        for k, f in enumerate(frames(src, w, h)):
            if k >= int(ts * fps):
                Image.fromarray(compose(f, ts, MUZ)).save(outp); print('sample ->', outp); break
        sys.exit(0)
    pw = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (w, h), '-r', '%g' % fps, '-i', '-',
                           '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
    for k, f in enumerate(frames(src, w, h)):
        pw.stdin.write(compose(f, k / fps, MUZ).tobytes())
    pw.stdin.close(); pw.wait(); print('done ->', dst)

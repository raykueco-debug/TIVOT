"""背景線：雲由程式動（憲法 11-08「雲由程式動」），分層、保證首尾接得上。
- 天空範圍＝Ray 註記收斂後的雲遮罩（refined/cyan.png 或指定）。
- 天空底板：前景擋住的部分先補（inpaint），形變時拉到邊緣也有東西。
- 分兩層：遠層＝整片天空（形變小、慢）；近層＝較亮的雲塊（從亮度抽 alpha，形變大）。
- 形變：每一層兩組平滑雜訊場 A、B，位移 = A·cosθ + B·sinθ（θ＝2π·t/N）＋ 二次諧波。
  每個點沿一個小橢圓繞一圈 → 第 N 格剛好回到第 0 格，不是倒放、不是來回。
- 其他註記層（布…）照舊取 Wan 那一版（--wan 前綴＋週期），疊在最上面。
用法：python cloud_prog.py <原圖> <notes key> <輸出名> [--frames 96] [--fps 16] [--wan bgl/xxx_flf --wanlen 48]
"""
import argparse, glob, json, os, subprocess
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY_OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'output')


def noise(h, w, scale, seed):
    r = np.random.default_rng(seed).standard_normal((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    r = cv2.resize(r, (w, h), interpolation=cv2.INTER_CUBIC)
    r = cv2.GaussianBlur(r, (0, 0), scale * 0.35)
    return r / (np.abs(r).max() + 1e-6)


def warp(img, dx, dy):
    h, w = img.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, (gx + dx).astype(np.float32), (gy + dy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('still'); ap.add_argument('key'); ap.add_argument('name')
    ap.add_argument('--frames', type=int, default=96); ap.add_argument('--fps', type=int, default=16)
    ap.add_argument('--sky', default='cyan')
    ap.add_argument('--far', type=float, default=10.0, help='遠層最大位移（原圖像素）')
    ap.add_argument('--near', type=float, default=26.0, help='近層最大位移')
    ap.add_argument('--wan'); ap.add_argument('--wanlen', type=int, default=48)
    a = ap.parse_args()
    out = os.path.join(HERE, 'out', a.name); os.makedirs(out, exist_ok=True)
    nd = os.path.join(HERE, 'notes', a.key, 'refined')

    still = np.array(Image.open(a.still).convert('RGB'))
    H, W = still.shape[:2]; H, W = H - H % 2, W - W % 2; still = still[:H, :W].astype(np.float32)
    rd = lambda p: np.array(Image.open(p).convert('L').resize((W, H))).astype(np.float32) / 255
    sky = rd(os.path.join(nd, a.sky + '.png'))
    # refined 遮罩為了布擺動往外擴過；雲只准吃到真正的天空 → 收回來、邊緣只留 1.5px 的羽化（不然山壁邊緣會被一起扭）
    hard = cv2.erode((sky > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    sky = cv2.GaussianBlur(hard.astype(np.float32), (0, 0), 1.5)
    # 離天空邊緣越近位移越小（邊緣 0 → 70px 以內爬到全幅）：山壁輪廓與遠山不會被扭出殘影
    dist = cv2.distanceTransform(hard, cv2.DIST_L2, 5)
    fall = np.clip(dist / 70.0, 0, 1); fall = (fall * fall * (3 - 2 * fall)).astype(np.float32)

    # 天空底板：非天空的地方補起來（半解析度做，夠用）
    hole = ((sky < 0.5) * 255).astype(np.uint8)
    sm = cv2.resize(still.astype(np.uint8), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
    plate_s = cv2.inpaint(sm, hs, 9, cv2.INPAINT_TELEA)
    plate = cv2.resize(plate_s, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    plate = np.where(sky[..., None] > 0.5, still, plate)

    # 近層：亮的雲塊（天空裡亮度高於中位數的部分）
    lum = plate.mean(2)
    med = float(np.median(lum[sky > 0.5])) if (sky > 0.5).any() else 128
    hi = float(np.percentile(lum[sky > 0.5], 90)) if (sky > 0.5).any() else 200
    near_a = np.clip((lum - med) / max(8.0, hi - med), 0, 1)
    near_a = cv2.GaussianBlur(near_a, (0, 0), 2)

    # 兩層各兩組雜訊場（＋二次諧波）
    S = max(W, H)
    def fields(seed, sc): return [noise(H, W, sc, seed + k) for k in range(8)]
    Ff, Fn = fields(11, S // 6), fields(31, S // 10)

    # 其他註記層（布…）取 Wan
    others = [p for p in sorted(glob.glob(os.path.join(nd, '*.png'))) if os.path.basename(p)[:-4] != a.sky]
    om = np.max([rd(p) for p in others], axis=0)[..., None] if others else None
    wf = []
    if a.wan and om is not None:
        files = sorted(glob.glob(os.path.join(COMFY_OUT, a.wan + '_*.png')))[:a.wanlen]
        wf = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) for f in files]
        ref = (still * om).sum((0, 1)) / (om.sum() + 1e-6)
        wf = [f + (ref - (f * om).sum((0, 1)) / (om.sum() + 1e-6)) for f in wf]

    sky3 = sky[..., None]
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                          '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an',
                          os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
    N = a.frames
    for t in range(N):
        th = 2 * np.pi * t / N
        c1, s1, c2, s2 = np.cos(th), np.sin(th), np.cos(2 * th), np.sin(2 * th)
        def disp(F, amp):
            dx = (F[0] * c1 + F[1] * s1) * amp + (F[2] * c2 + F[3] * s2) * amp * 0.35
            dy = (F[4] * c1 + F[5] * s1) * amp * 0.5 + (F[6] * c2 + F[7] * s2) * amp * 0.2
            return dx * fall, dy * fall
        dfx, dfy = disp(Ff, a.far); dnx, dny = disp(Fn, a.near)
        far = warp(plate, dfx, dfy)
        na = warp(near_a, dnx, dny)[..., None]
        nr = warp(plate, dnx, dny)
        skyimg = far * (1 - na) + nr * na
        comp = still * (1 - sky3) + skyimg * sky3
        if wf: comp = comp * (1 - om) + wf[t % len(wf)] * om
        p.stdin.write(comp.clip(0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()
    meta = dict(still=a.still, key=a.key, method='cloud_prog', frames=N, fps=a.fps, far=a.far, near=a.near, wan=a.wan, wanlen=len(wf),
                seam_diff=0.0, mean_step_diff=None, size=[W, H])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == '__main__':
    main()

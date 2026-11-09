"""背景線（4070）：拆層合成。
原圖（靜態層）＋ Wan 輸出（只取「被風吹的層」那塊遮罩內的像素）→ 找自然回到原點的一段當循環 → mp4。

用法：
  python bg_comp.py <原圖> <Wan 輸出前綴（ComfyUI/output 底下）> <輸出名> [--minlen 32] [--maxlen 72] [--fps 16]
產出（放在 bg_layer/out/<輸出名>/）：
  mask.png        風吹層遮罩（白＝取 Wan、黑＝原圖不動）
  mask_check.jpg  遮罩疊在原圖上的檢查圖
  loop.mp4        成品（循環段，首尾自然接上；不倒放、不來回、不交叉淡化）
  meta.json       取了 Wan 的第幾格到第幾格、接縫差值
規矩（憲法 11-08）：天空、地面、岩石、樹幹一律取原圖（不會跟著 Wan 閃）；只有遮罩內的葉／草／布走 Wan。
"""
import argparse, glob, json, os, subprocess
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY_OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'output')


def wind_mask(rgb):
    """葉、草、蕨：綠／黃綠且有彩度的像素。收斂成塊、外擴一點、羽化。"""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    r_, gg = rgb[..., 0].astype(int), rgb[..., 1].astype(int)
    g = ((h >= 30) & (h <= 95) & (s >= 70) & (v >= 35) & (gg > r_ * 1.08)).astype(np.uint8) * 255   # 地面的土黃（h≈20~30、R≥G）排除
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    g = cv2.morphologyEx(g, cv2.MORPH_CLOSE, k)
    g = cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    g = cv2.GaussianBlur(g, (0, 0), 3)
    return g.astype(np.float32) / 255.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('still'); ap.add_argument('prefix'); ap.add_argument('name')
    ap.add_argument('--minlen', type=int, default=32); ap.add_argument('--maxlen', type=int, default=72)
    ap.add_argument('--fps', type=int, default=16)
    ap.add_argument('--full', action='store_true', help='FLF 版：整段 0..n-2 就是循環（最後一格＝第一格，丟掉）')
    ap.add_argument('--maskdir', help='用這個資料夾裡所有 png 的聯集當遮罩（Ray 註記收斂後的 refined/）')
    a = ap.parse_args()
    out = os.path.join(HERE, 'out', a.name); os.makedirs(out, exist_ok=True)

    still = np.array(Image.open(a.still).convert('RGB'))
    H, W = still.shape[:2]
    H, W = H - H % 2, W - W % 2; still = still[:H, :W]   # H.264 yuv420p 要偶數（卡耶爾山谷是 1536×1031）
    files = sorted(glob.glob(os.path.join(COMFY_OUT, a.prefix + '_*.png')))
    assert files, '找不到 Wan 輸出：' + a.prefix
    fr = [cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) for f in files]
    if a.maskdir:
        ms_ = [np.array(Image.open(f).convert('L').resize((W, H))).astype(np.float32) / 255 for f in glob.glob(os.path.join(a.maskdir, '*.png'))]
        m = np.max(ms_, axis=0)
    else:
        m = wind_mask(still)
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(out, 'mask.png'))
    chk = still.astype(np.float32) * 0.45 + np.dstack([m * 255 * 0.55, m * 0, m * 255 * 0.55])
    Image.fromarray(chk.clip(0, 255).astype(np.uint8)).resize((W // 2, H // 2)).save(os.path.join(out, 'mask_check.jpg'), quality=85)

    # 顏色對齊：每一格的遮罩區平均色對到原圖（Wan 會慢慢漂色，不對齊的話循環接縫會跳亮度）
    m3 = m[..., None]; wsum = m.sum() + 1e-6
    ref = (still.astype(np.float32) * m3).sum((0, 1)) / wsum
    for i in range(len(fr)):
        mu = (fr[i] * m3).sum((0, 1)) / wsum
        fr[i] = fr[i] + (ref - mu)

    # 找自然回到原點的一段。有分層遮罩時：每一層各自找起點、共用同一個長度 L（各層的循環彼此獨立，接縫只跟自己比）
    layers = [m]
    if a.maskdir:
        layers = [np.array(Image.open(f).convert('L').resize((W, H))).astype(np.float32) / 255 for f in sorted(glob.glob(os.path.join(a.maskdir, '*.png')))]
    small = [cv2.resize(f, (192, 128), interpolation=cv2.INTER_AREA) for f in fr]
    n = len(fr)
    lsm = [cv2.resize(l, (192, 128))[..., None] for l in layers]
    def seam(ms, i, j): return float((np.abs(small[i] - small[j]) * ms).sum() / (ms.sum() * 3 + 1e-6))
    best = None
    for L in range(a.minlen, min(a.maxlen, n - 1) + 1):
        tot = 0; starts = []
        for ms in lsm:
            c = min((seam(ms, i, i + L), i) for i in range(0, n - L))
            tot += c[0] * float(ms.sum()); starts.append(c)
        tot /= sum(float(ms.sum()) for ms in lsm) + 1e-6
        if best is None or tot < best[0]: best = (tot, L, starts)
    d, Lb, starts = best
    if a.full:
        Lb = n - 1; starts = [(seam(ms, 0, n - 1), 0) for ms in lsm]; d = sum(x[0] for x in starts) / len(starts)
    i0 = starts[0][1]; j0 = i0 + Lb
    step = float(np.mean([(np.abs(small[k] - small[k + 1]) * lsm[0]).sum() / (lsm[0].sum() * 3) for k in range(i0, j0)]))
    seq = list(range(Lb))
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                          '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an',
                          os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
    st = still.astype(np.float32)
    lm3 = [l[..., None] for l in layers]
    for t in seq:
        comp = st.copy()
        for l3, (_, i_) in zip(lm3, starts):
            comp = comp * (1 - l3) + fr[i_ + t] * l3
        p.stdin.write(comp.clip(0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()
    meta = dict(still=a.still, prefix=a.prefix, wan_frames=n, loop_from=i0, loop_to=j0, layer_starts=[[os.path.basename(f) for f in sorted(glob.glob(os.path.join(a.maskdir, '*.png')))] if a.maskdir else ['auto'], [int(x[1]) for x in starts], [round(x[0], 3) for x in starts]], frames=len(seq), fps=a.fps,
                seam_diff=round(d, 3), mean_step_diff=round(step, 3), size=[W, H])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == '__main__':
    main()

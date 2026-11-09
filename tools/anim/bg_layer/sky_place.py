"""背景線：一段湧動雲的循環（Wan，只有天空）放到每個場景的山後面；每個場景換一個取景位置。
Ray 11-09：「你讓 wan 生一段 loop 的湧動雲，然後放在山的後面跑，每個場景換一點位置不就好了？」

- 天空範圍＝Ray 註記收斂後的雲遮罩（refined/cyan.png），收回到真正的天空、邊緣只羽化 1.5px（山壁輪廓不動）。
- 雲影片放大 zoom 倍後，從 (ox, oy)（0~1，取景框在放大後畫面的相對位置）切一塊蓋到場景大小。
- 色調：雲影片的天空平均／對比對齊這個場景原本的天空（每個場景天色不同）。
- 前景（山、布、骨頭…）全是原圖，蓋在雲上面。
用法：python sky_place.py <原圖> <notes key> <雲 Wan 前綴> <輸出名> [--zoom 1.3 --ox 0.2 --oy 0.0 --fps 16]
"""
import argparse, glob, json, os, subprocess
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY_OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'output')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('still'); ap.add_argument('key'); ap.add_argument('sky'); ap.add_argument('name')
    ap.add_argument('--zoom', type=float, default=1.3); ap.add_argument('--ox', type=float, default=0.0); ap.add_argument('--oy', type=float, default=0.0)
    ap.add_argument('--fps', type=int, default=16); ap.add_argument('--skycolor', default='cyan'); ap.add_argument('--drop-last', action='store_true')
    a = ap.parse_args()
    out = os.path.join(HERE, 'out', a.name); os.makedirs(out, exist_ok=True)
    still = np.array(Image.open(a.still).convert('RGB'))
    H, W = still.shape[:2]; H, W = H - H % 2, W - W % 2; still = still[:H, :W].astype(np.float32)
    m = np.array(Image.open(os.path.join(HERE, 'notes', a.key, 'refined', a.skycolor + '.png')).convert('L').resize((W, H)))
    hard = cv2.erode((m > 127).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    sky = cv2.GaussianBlur(hard.astype(np.float32), (0, 0), 1.5)[..., None]

    files = sorted(f for f in glob.glob(os.path.join(COMFY_OUT, a.sky + '_*.png')) if '_rife_' not in f)
    if a.drop_last: files = files[:-1]   # FLF／VACE 原始輸出：最後一格＝第一格，丟掉（loop_bridge 補過的不用）
    zw, zh = int(W * a.zoom), int(H * a.zoom)
    x0, y0 = int((zw - W) * a.ox), int((zh - H) * a.oy)
    frames = [cv2.resize(np.array(Image.open(f).convert('RGB')), (zw, zh), interpolation=cv2.INTER_CUBIC)[y0:y0 + H, x0:x0 + W].astype(np.float32) for f in files]

    # 色調對齊：天空範圍內，雲影片（全段平均）→ 場景原本的天空
    wsum = sky.sum() + 1e-6
    ref_mu = (still * sky).sum((0, 1)) / wsum
    ref_sd = np.sqrt((((still - ref_mu) ** 2) * sky).sum((0, 1)) / wsum)
    allf = np.stack(frames[::4])
    mu = (allf * sky).sum((0, 1, 2)) / (wsum * len(allf))
    sd = np.sqrt((((allf - mu) ** 2) * sky).sum((0, 1, 2)) / (wsum * len(allf)))
    gain = np.clip(ref_sd / (sd + 1e-6), 0.6, 1.6)

    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps), '-i', '-',
                          '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an',
                          os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
    for f in frames:
        s = (f - mu) * gain + ref_mu
        comp = still * (1 - sky) + s * sky
        p.stdin.write(comp.clip(0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()
    meta = dict(still=a.still, key=a.key, method='sky_place', sky=a.sky, zoom=a.zoom, ox=a.ox, oy=a.oy, frames=len(frames), fps=a.fps,
                seam_diff=None, mean_step_diff=None, size=[W, H])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(a.name, len(frames), 'frames')


if __name__ == '__main__':
    main()

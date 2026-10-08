# 程序式呼吸：拿一張去背格，沿呼吸曲線把上半身往上「拉」（頭頂位移最大、往下遞減到底緣為 0），
# 胸口附近再加一點點橫向擴張。不重生成任何像素 ⇒ 嘴型、咬著的子彈、臉 100% 不變。
# 用法：python breath_warp.py <來源格.webp 或 資料夾> <輸出資料夾> <起始編號> <格數> [頭頂位移px=5] [胸寬擴張=0.006]
#   來源是資料夾 ⇒ 逐格疊（第 j 格用資料夾裡第 j 張 frame_*.webp），用在已經有微動的格上再加大呼吸
import sys, os, math, numpy as np, cv2
from PIL import Image
src, od, k0, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
A = float(sys.argv[5]) if len(sys.argv) > 5 else 5.0; SX = float(sys.argv[6]) if len(sys.argv) > 6 else 0.006
CURVE = sys.argv[7] if len(sys.argv) > 7 else 'arch'   # arch＝吸了再吐（首尾回 0）；inhale＝整段一口緩慢吸氣（0→1，頭尾緩）
# ⚠ Ray：「呼吸要從第一 F 開始做，不要動作做完才做」—— 整支 CI 一起套 inhale，不要只套在結尾停格上（那會像打嗝）。
import glob
srcs = sorted(glob.glob(os.path.join(src, 'frame_*.webp'))) if os.path.isdir(src) else [src]
im = np.asarray(Image.open(srcs[0]).convert('RGBA')).astype(np.float32); H, W = im.shape[:2]
al = im[..., 3]; ys = np.where(al.max(1) > 128)[0]; top = ys[0]
cx = W / 2; chest = top + (H - top) * 0.35
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
w_up = np.clip((H - yy) / (H - top), 0, 1) ** 1.3                    # 底緣 0 → 頭頂 1
w_ch = np.exp(-((yy - chest) / ((H - top) * 0.25)) ** 2)             # 胸口附近才擴張
os.makedirs(od, exist_ok=True)
for j in range(n):
    if len(srcs) > 1: im = np.asarray(Image.open(srcs[j]).convert('RGBA')).astype(np.float32)
    ph = (1 - math.cos(math.pi * j / max(1, n - 1))) / 2 if CURVE == 'inhale' else math.sin(math.pi * (j + 1) / (n + 1))                       # 吸氣 → 吐回，首尾接近 0
    mx = cx + (xx - cx) / (1 + SX * ph * w_ch)
    my = yy + A * ph * w_up                                          # 取樣點往下 ＝ 畫面往上
    out = cv2.remap(im, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(od, f'frame_{k0 + j:02d}.webp'), 'WEBP', quality=92)
print('ok', n, 'frames')

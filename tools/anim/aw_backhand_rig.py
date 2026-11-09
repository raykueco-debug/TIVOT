# 安雅光翼 反手巴掌：左翼以翼根為軸程式旋轉（Ray 2026-11-05 同意），翼上火焰取 Wan 待機格
import glob, math, os
import numpy as np
from PIL import Image, ImageFilter
SRC = 'out/monsters/mon_np_anyawings_idle'
OUT = 'out/enemy_atk/mon_np_anyawings_backhand_rig'
RX, RY = 486, 562          # 翼根（待機生成空間 960×640）
PADX, PADY = 240, 160      # 輸出畫布加大，避免切出直線
fs = sorted(glob.glob(SRC + '/frame_*.webp'))
os.makedirs(OUT, exist_ok=True)
for f in glob.glob(OUT + '/*'): os.remove(f)
W, H = Image.open(fs[0]).size
CW, CH = W + 2 * PADX, H + 2 * PADY
cx, cy = RX + PADX, RY + PADY

def split(im):
    big = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); big.paste(im, (PADX, PADY))
    a = np.array(big).astype(np.float32)
    xs = np.arange(CW)[None, :]
    wl = np.clip((cx + 6 - xs) / 12.0, 0, 1)          # 中線 12px 羽化
    L = a.copy(); R = a.copy()
    L[..., 3] *= wl; R[..., 3] *= (1 - wl)
    return Image.fromarray(L.astype(np.uint8)), Image.fromarray(R.astype(np.uint8))

def xform(im, ang, sc):
    # 以翼根為中心：先縮放再旋轉（ang 度，正＝順時針）
    t = math.radians(ang); c, s = math.cos(t), math.sin(t)
    # 輸出→輸入的反矩陣
    a, b = c / sc, s / sc
    d, e = -s / sc, c / sc
    return im.transform((CW, CH), Image.AFFINE, (a, b, cx - a * cx - b * cy, d, e, cy - d * cx - e * cy), resample=Image.BICUBIC)

def ease(x): return x * x * (3 - 2 * x)
# 關鍵：(格數, 起角, 迄角, 起縮放, 迄縮放, 緩動, 是否動態模糊)
SEG = [
    (12, 0, 78, 1.0, 0.92, 'io', False),     # 蓄力：左翼往右翻、略縮（往後收）
    (3, 78, 82, 0.92, 0.92, 'io', False),    # 拉滿停頓
    (5, 82, -35, 0.92, 1.7, 'in', True),     # 反手甩出：快速往左掃、靠近鏡頭
    (2, -35, -42, 1.7, 1.75, 'out', True),   # 打到底
    (12, -42, 0, 1.75, 1.0, 'out', False),   # 收回
]
frames = []
for n, a0, a1, s0, s1, ez, blur in SEG:
    for i in range(n):
        u0, u1 = i / n, (i + 1) / n
        frames.append((a0, a1, s0, s1, ez, blur, u0, u1))
for k, (a0, a1, s0, s1, ez, blur, u0, u1) in enumerate(frames):
    L, R = split(Image.open(fs[k % len(fs)]).convert('RGBA'))
    def at(u):
        e = ease(u) if ez == 'io' else (u * u if ez == 'in' else 1 - (1 - u) ** 2)
        return a0 + (a1 - a0) * e, s0 + (s1 - s0) * e
    if blur:
        Lw = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        for j, al in [(3, .18), (2, .3), (1, .45)]:
            ang, sc = at(max(0, u1 - (u1 - u0) * j * 0.6))
            g = xform(L, ang, sc); ga = np.array(g).astype(np.float32); ga[..., 3] *= al
            Lw.alpha_composite(Image.fromarray(ga.astype(np.uint8)))
        ang, sc = at(u1); Lw.alpha_composite(xform(L, ang, sc))
    else:
        ang, sc = at(u1)
        Lw = xform(L, ang, sc)
    ang_now = at(u1)[0]
    if ang_now > 20:
        ra = np.array(R).astype(np.float32); k2 = 1 - 0.45 * min(1, (ang_now - 20) / 50); ra[..., :3] *= k2; R = Image.fromarray(ra.astype(np.uint8))
    out = R.copy(); out.alpha_composite(Lw)   # 左翼在前
    out.save(f'{OUT}/frame_{k:02d}.webp', 'WEBP', quality=90)
print(len(frames), 'frames', CW, CH, 'root', cx, cy)

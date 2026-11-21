"""空中怪 3D：GPT 四視圖 → 切格、統一比例尺 → Hunyuan 的四張輸入＋圖集用的四塊。

用法：python tools/sky3d/prep4.py <四視圖.png> <鍵>
  四視圖版面（GPT 照提示詞畫的）：左上＝正面（頭朝鏡頭）／右上＝左側面（頭朝左）／
                                   左下＝背面／右下＝俯視（頭朝上）
產出：
  resources/_originals/flight/mon3d/<鍵>_4view_std.png    四格同一比例尺、置中（給人看）
  ComfyUI-master/input/<鍵>_front|side|back|side_m.png   Hunyuan 的四張（side_m＝側面鏡射當右側）
  resources/_originals/flight/mon3d/<鍵>_cells/*.png      各視圖裁到主體外框、白底轉透明（bake.py 做圖集用）

⚠ GPT 的版面不一定等分：分隔線找「中間那一段最寬的空白欄／列」。
⚠ 四格要**同一比例尺**餵 Hunyuan —— 各自填滿會把細長的怪撐成一大塊（11-07 踩過）。
   這一支是 11-07 那一版（scratchpad，已遺失）的重寫，2026-11-21。
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COMFY_IN = os.path.abspath(os.path.join(ROOT, '..', 'ComfyUI-master', 'input'))
OUTDIR = os.path.join(ROOT, 'resources', '_originals', 'flight', 'mon3d')
WHITE = 238          # 三色都高於這個＝背景
CELL = 1024          # Hunyuan 輸入的邊長
FILL = 0.86          # 最大那一格的主體佔邊長的比例


def fg_mask(a):
    return (a[..., :3].min(-1) < WHITE)


def split_at(counts, lo, hi):
    """counts 在 [lo,hi) 之間最寬的一段 0，回中點；沒有 0 就回最小值的位置。"""
    seg = counts[lo:hi]
    best, run, start, bs = 0, 0, 0, None
    for i, v in enumerate(seg):
        if v == 0:
            if run == 0: start = i
            run += 1
            if run > best: best, bs = run, start
        else:
            run = 0
    if bs is None:
        return lo + int(np.argmin(seg))
    return lo + bs + best // 2


def bbox(m, minc=3):
    ys = np.where(m.sum(1) >= minc)[0]; xs = np.where(m.sum(0) >= minc)[0]
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main(src, key):
    im = Image.open(src).convert('RGB'); a = np.asarray(im)
    m = fg_mask(a); H, W = m.shape
    # GPT 有時畫格線：佔滿大半列／欄的細線＝格線，清掉（主體不會橫跨半張圖還只有一兩像素粗）
    m[m.mean(1) > 0.9, :] = False; m[:, m.mean(0) > 0.9] = False
    cx = split_at(m.sum(0), int(W * 0.3), int(W * 0.7))
    cyl = split_at(m[:, :cx].sum(1), int(H * 0.3), int(H * 0.7))   # 左右兩欄各找各的橫線（GPT 兩欄常常不齊）
    cyr = split_at(m[:, cx:].sum(1), int(H * 0.3), int(H * 0.7))
    cells = {'front': (0, 0, cx, cyl), 'side': (cx, 0, W, cyr), 'back': (0, cyl, cx, H), 'top': (cx, cyr, W, H)}
    crops = {}
    for k, (x0, y0, x1, y1) in cells.items():
        sub = m[y0:y1, x0:x1]; bx0, by0, bx1, by1 = bbox(sub)
        crops[k] = (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1)
    dims = {k: (c[2] - c[0], c[3] - c[1]) for k, c in crops.items()}
    print('split', cx, cyl, cyr)
    for k, d in dims.items(): print(f'  {k:5s} w={d[0]:4d} h={d[1]:4d}')
    # 一致性：正背寬（翼展）、正側背高、側寬≈俯高（身長）、俯寬≈正寬
    f, s, b, t = dims['front'], dims['side'], dims['back'], dims['top']
    print(f'  翼展 正{f[0]} 背{b[0]} 俯{t[0]}｜高 正{f[1]} 側{s[1]} 背{b[1]}｜身長 側{s[0]} 俯{t[1]}')
    big = max(max(d) for d in dims.values()); sc = CELL * FILL / big
    os.makedirs(OUTDIR, exist_ok=True); celldir = os.path.join(OUTDIR, key + '_cells'); os.makedirs(celldir, exist_ok=True)
    std = Image.new('RGB', (CELL * 2, CELL * 2), (255, 255, 255))
    pos = {'front': (0, 0), 'side': (1, 0), 'back': (0, 1), 'top': (1, 1)}
    for k, (x0, y0, x1, y1) in crops.items():
        piece = im.crop((x0, y0, x1, y1))
        pm = m[y0:y1, x0:x1]
        rgba = np.dstack([np.asarray(piece), (pm * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(celldir, k + '.png'))
        w, h = max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))
        r = piece.resize((w, h), Image.LANCZOS)
        canvas = Image.new('RGB', (CELL, CELL), (255, 255, 255)); canvas.paste(r, ((CELL - w) // 2, (CELL - h) // 2))
        std.paste(canvas, (pos[k][0] * CELL, pos[k][1] * CELL))
        if k != 'top':
            canvas.save(os.path.join(COMFY_IN, f'{key}_{k}.png'))
            if k == 'side':
                canvas.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(COMFY_IN, f'{key}_side_m.png'))
    std.save(os.path.join(OUTDIR, key + '_4view_std.png'))
    print('ok', os.path.join(OUTDIR, key + '_4view_std.png'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

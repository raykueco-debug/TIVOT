#!/usr/bin/env python3
"""髮梢擺動圖層（路線 B 試做，Ray 2026-10-03：「用分割結果把髮梢那一段剪成獨立小圖層，以髮根為軸做 1~2px 的擺動」）

一張立繪產出三樣（都放 resources/si/sway/，資料寫進 script/sway.js，引擎是 modules/sway.js）：
  <名>_l0.webp     擺動層：切口以下那一段頭髮（原圖像素，切口往下 FADE 列 alpha 由 0 漸到 1）
  <名>_under.webp  墊底層：頭髮原本蓋住的地方（背景＝透明、斗篷等＝周圍顏色擴散補上）——
                   擺動時頭髮邊緣會讓開 1~2px，露出來的就是這一層，不然會看到原圖頭髮的疊影
  <名>_mask.webp   底圖遮罩（整張圖大小）：擺動層「完全不透明」的地方把底圖挖掉（淡入那一段不挖）

用法（試做：區域與切口手給）：
  py -3.11 tools/hair_sway.py anya_si_front --region 690,300,940,700 --cut 300 --pivot 700,300
  ⚠ 頭髮判定：alpha 夠、亮度 >70、藍 ≥ 綠+4（淡紫髮；斗篷的金與米白內襯會被排掉）——
    其他髮色要另訂規則（--rule），這是試做。
"""
import argparse, json, os, re
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'resources', 'si', 'sway')
TABLE = os.path.join(ROOT, 'script', 'sway.js')
FADE = 40


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def harmonic_rgba(pm, M, iters=600):
    """預乘 RGBA 在遮罩 M 裡做擴散內插（背景的 alpha 0 也一起擴散進去）。"""
    out = pm.copy()
    ys, xs = np.where(M)
    y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
    sub = out[y0:y1, x0:x1]; m = M[y0:y1, x0:x1]
    sub[m] = sub[~m].mean(0) if (~m).any() else 0
    for _ in range(iters):
        avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
        sub[m] = avg[m]
    out[y0:y1, x0:x1] = sub
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name')
    ap.add_argument('--region', required=True, help='x0,y0,x1,y1')
    ap.add_argument('--cut', type=int, required=True, help='切口的 y（以上不動）')
    ap.add_argument('--pivot', required=True, help='轉軸 x,y（原圖像素）')
    ap.add_argument('--amp', type=float, default=0.5, help='擺幅（度）')
    ap.add_argument('--dur', type=float, default=3.3, help='週期（秒）')
    ap.add_argument('--rule', default='violet', choices=['violet', 'blonde'], help='髮色判定')
    ap.add_argument('--preview', help='另存 ±擺幅 兩格的靜態合成（驗收用）')
    A = ap.parse_args()
    src = os.path.join(ROOT, 'resources', 'si', A.name + '.webp')
    im = Image.open(src).convert('RGBA'); arr = np.array(im).astype(np.float32)
    H, W = arr.shape[:2]
    x0, y0, x1, y1 = (int(v) for v in A.region.split(','))
    px, py = (float(v) for v in A.pivot.split(','))
    rgb, al = arr[..., :3], arr[..., 3]
    if A.rule == 'blonde':      # 金髮（蕾娜）：G 明顯高於 B；膚色的 G−B 只有 10 左右
        hair = (al > 40) & (lum(rgb) > 100) & (rgb[..., 1] >= rgb[..., 2] + 30)
    else:                       # violet：淡紫髮（安雅）
        hair = (al > 40) & (lum(rgb) > 70) & (rgb[..., 2] >= rgb[..., 1] + 8)
    R = np.zeros((H, W), bool); R[max(y0, A.cut):y1, x0:x1] = True
    hair &= R
    # 只留**最大的那一塊**（頭髮主體）：袖口的白、斗篷內襯與刺繡上零碎的偏藍色塊都跟它不相連
    from scipy import ndimage as nd
    lab, k = nd.label(np.array(Image.fromarray(hair.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0)
    if k:
        sz = nd.sum(np.ones_like(lab), lab, range(1, k + 1))
        hair &= lab == (int(np.argmax(sz)) + 1)
    # 頭髮的反鋸齒邊（半透明的外緣）也算進層裡：往外 2px、而且是原圖有 alpha 的
    hair_e = np.array(Image.fromarray(hair.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    hair_e &= (al > 0) & R & ~((lum(rgb) < 70) & (al > 200) & ~hair)   # 不吃進斗篷的深色
    # 擺動層的 alpha：原圖 alpha × 淡入（切口往下 FADE 列 0→1）
    yy = np.arange(H)[:, None]
    fade = np.clip((yy - A.cut) / FADE, 0, 1)
    la = np.where(hair_e, al / 255.0, 0) * fade
    # 墊底層：頭髮蓋住的地方用周圍擴散補（預乘 RGBA）
    pm = np.dstack([rgb * (al[..., None] / 255.0), al / 255.0])
    fillM = hair_e & (fade > 0)
    under = harmonic_rgba(pm, fillM)
    ua = under[..., 3]
    urgb = np.where(ua[..., None] > 1e-3, under[..., :3] / np.maximum(ua[..., None], 1e-3), 0)
    # 底圖遮罩：擺動層完全進場（淡入完）的地方挖掉底圖；淡入那一段留著（擺幅在轉軸附近趨近 0）
    core = fillM & (fade >= 1)
    mask = np.where(core, 0, 255).astype(np.uint8)
    # ── 輸出（裁到最小框）──
    def bbox(m, pad=3):
        ys, xs = np.where(m)
        return (int(max(xs.min() - pad, 0)), int(max(ys.min() - pad, 0)),
                int(min(xs.max() + pad + 1, W)), int(min(ys.max() + pad + 1, H)))
    lx0, ly0, lx1, ly1 = bbox(la > 0)
    layer = np.dstack([rgb, la * 255])[ly0:ly1, lx0:lx1]
    ux0, uy0, ux1, uy1 = bbox(fillM)
    und = np.dstack([urgb, ua * 255])[uy0:uy1, ux0:ux1]
    os.makedirs(DST, exist_ok=True)
    n = A.name.lower()
    Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(DST, n + '_l0.webp'), 'WEBP', quality=92, alpha_quality=100, method=6)
    Image.fromarray(np.clip(und, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(DST, n + '_under.webp'), 'WEBP', quality=90, alpha_quality=100, method=6)
    mk = np.dstack([np.full((H, W, 3), 255, np.uint8), mask])
    Image.fromarray(mk, 'RGBA').save(os.path.join(DST, n + '_mask.webp'), 'WEBP', lossless=True, method=6)
    ent = {'w': W, 'h': H, 'under': [ux0, uy0, ux1 - ux0, uy1 - uy0],
           'layers': [{'r': [lx0, ly0, lx1 - lx0, ly1 - ly0], 'p': [px, py], 'a': A.amp, 'd': A.dur}]}
    tab = {}
    if os.path.exists(TABLE):
        m = re.search(r'SWAY\s*=\s*(\{.*\});', open(TABLE, encoding='utf-8').read(), re.S)
        tab = json.loads(m.group(1)) if m else {}
    tab[n] = ent
    rows = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(tab[k], separators=(",", ":"))}' for k in sorted(tab))
    open(TABLE, 'w', encoding='utf-8', newline='\n').write(
        '/* ══ 髮梢擺動表 —— **機器產生，不要手改**（tools/hair_sway.py）══\n'
        '   鑰匙＝立繪檔名；under＝墊底層的框、layers[].r＝擺動層的框、p＝轉軸、a＝擺幅（度）、d＝週期（秒），\n'
        '   座標都是原圖像素。檔案：resources/si/sway/<鑰匙>_l0.webp／_under.webp／_mask.webp。\n'
        '   引擎：modules/sway.js。 */\n'
        'export const SWAY = {\n' + rows + '\n};\n')
    print(json.dumps(ent))
    for f in ('_l0', '_under', '_mask'):
        print(f, os.path.getsize(os.path.join(DST, n + f + '.webp')), 'bytes')
    if A.preview:
        # 靜態驗收：底圖（挖掉）＋墊底＋擺動層旋轉 −a／0／+a 三格，綠底放大
        base = im.copy(); base.putalpha(Image.fromarray((al * (mask / 255.0)).astype(np.uint8)))
        L = Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8), 'RGBA')
        U = Image.fromarray(np.clip(und, 0, 255).astype(np.uint8), 'RGBA')
        tiles = []
        for ang in (-A.amp * 3, 0, A.amp * 3):     # 放大三倍擺幅，看得出接縫
            cv = Image.new('RGBA', (W, H), (40, 90, 40, 255))
            cv.alpha_composite(base); cv.alpha_composite(U, (ux0, uy0))
            big = Image.new('RGBA', (W, H), (0, 0, 0, 0)); big.alpha_composite(L, (lx0, ly0))
            big = big.rotate(ang, resample=Image.BICUBIC, center=(px, py))
            cv.alpha_composite(big)
            tiles.append(cv.crop((x0 - 40, A.cut - 60, x1 + 20, y1 + 10)).convert('RGB'))
        Wt = tiles[0].width; sh = Image.new('RGB', (Wt * 3 + 16, tiles[0].height), (0, 0, 0))
        for i, t in enumerate(tiles):
            sh.paste(t, (i * (Wt + 8), 0))
        sh.save(A.preview)


if __name__ == '__main__':
    main()

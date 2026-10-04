#!/usr/bin/env python3
"""立繪眼部特效（Ray 2026-10-03：「加入瞳孔顫動／淚眼汪汪兩個選項」）—— 目前做「瞳孔顫動」(tremble)。

從原圖自己的像素推出三張小圖（都在兩眼合起來的框內，座標寫進 script/eyefx.js）：
  <名>_tr_mask.webp   眼睛開口（睫毛線以下、下眼瞼以上）的 alpha —— 容器用它裁切，虹膜抖不出眼眶、睫毛留在上面
  <名>_tr_fill.webp   開口內「虹膜挖掉、用眼白補上」的底
  <名>_tr_iris.webp   虹膜＋瞳孔＋高光（上下各多補 3 列邊緣色，抖動時不會露出一條白縫）
引擎：modules/eyefx.js。開不開在腳本那一拍的 `eyes`（ver -1959；首頁「立繪」工具的「這一拍眼睛」）。

用法：py -3.11 tools/eye_fx.py renna_si_shockopen [--eye x0,y0,x1,y1 ...] [--preview out.png]
  眼框沿用 blink_patch 的自動找法（分割圖 tools/_blink_seg/<名>/classes_s1.6.png）。
"""
import argparse, json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blink_patch as B

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'resources', 'si', 'eyefx')
TABLE = os.path.join(ROOT, 'script', 'eyefx.js')


def src_of(name):
    for p in (os.path.join(ROOT, 'resources', 'si', name + '.webp'), os.path.join(ROOT, 'resources', 'si', 'npc', name + '.webp')):
        if os.path.exists(p):
            return p
    raise SystemExit('找不到立繪 ' + name)


def opening_of(e, shape, seg=None):
    """睫毛線（t+h）以下、看得到眼球的地方。
    有分割圖時下界用「分割的眼睛類」（Ray 10-03：「瞳顫要全眼，現在看起來只有上半眼球在抖」——
    逐欄偵測的下緣 b 常常停在虹膜中段，下半顆眼球就沒進開口）；沒有才退回 b。"""
    O = np.zeros(shape, bool)
    EY = (seg == B.SEG_EYE) if seg is not None else None
    for i, xr in enumerate(e['xs']):
        x = e['x0'] + int(xr)
        y0 = int(round(e['y0'] + e['t'][i] + e['h'][i] + 0.5))
        if EY is not None:
            rows = np.where(EY[:, x])[0]
            rows = rows[rows >= y0]
            if len(rows):
                O[y0:rows[-1] + 1, x] = True
                continue
        y1 = int(round(e['y0'] + e['b'][i] - 1))
        if y1 > y0:
            O[y0:y1, x] = True
    return O


def fill_from(img, known, unknown, iters=500):
    """unknown 的像素用 known 鄰居擴散填（只在 known|unknown 裡傳）。"""
    out = img.astype(np.float32).copy()
    V = known.astype(np.float32)
    region = known | unknown
    ys, xs = np.where(unknown)
    if not len(ys):
        return out
    y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    sub = out[y0:y1, x0:x1]; v = V[y0:y1, x0:x1].copy(); u = unknown[y0:y1, x0:x1]; r = region[y0:y1, x0:x1]
    acc = sub * v[..., None]
    for _ in range(iters):
        num = np.zeros_like(sub); den = np.zeros(v.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = np.roll(np.roll(v * r, dy, 0), dx, 1)
            num += np.roll(np.roll(acc, dy, 0), dx, 1) * 1.0
            den += sv
        upd = u & (den > 0)
        nv = np.where(den > 0, 1.0, 0.0)
        sub[upd] = (num[upd] / den[upd, None])
        acc = np.where((u & (den > 0))[..., None], sub, acc)
        v = np.where(upd, 1.0, v)
    out[y0:y1, x0:x1] = sub
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name')
    ap.add_argument('--eye', action='append', default=[])
    ap.add_argument('--preview')
    ap.add_argument('--tear-only', action='store_true', help='只產淚眼（ver -1959，Ray：「全表情都做淚眼、瞳顫只做我選的」）')
    A = ap.parse_args()
    n = A.name
    im = Image.open(src_of(n)).convert('RGBA'); arr = np.array(im); rgb = arr[..., :3]
    H, W = rgb.shape[:2]
    segp = os.path.join(ROOT, 'tools', '_blink_seg', n, 'classes_s1.6.png')
    seg = B.load_seg(segp, arr.shape) if os.path.exists(segp) else None
    hs = B.seg_hair_core(seg) if seg is not None else None
    boxes = [tuple(int(v) for v in e.split(',')) for e in A.eye] or (B.seg_eyes(seg, rgb=rgb) if seg is not None else [])
    if not boxes:
        raise SystemExit('沒有眼框')
    eyes = [B.analyse(rgb, b, seg, hs) for b in boxes]
    O = np.zeros((H, W), bool)
    for e in eyes:
        O |= opening_of(e, (H, W), seg)
    if seg is not None:   # 只留模型判成眼睛的地方（逐欄算的開口會把眼角外的皮膚也算進去）
        O &= nd.binary_dilation(seg == B.SEG_EYE, iterations=1)
    O = nd.binary_opening(O, iterations=1)
    f = rgb.astype(np.float32)
    L = B.lum(f); sat = f.max(-1) - f.min(-1)
    # 眼白＝低飽和、不太暗（上眼皮的陰影眼白偏灰紫，也算眼白 —— 只看亮度會被當成虹膜）
    sclera = O & (L > 120) & (sat < 45)
    # 找虹膜時先把開口往內縮 2px：上下眼瞼線、下睫毛都貼在開口邊上，縮掉就不會黏進虹膜那一塊
    irisraw = nd.binary_erosion(O, iterations=2) & ~sclera
    lab, k = nd.label(irisraw)
    if not k:
        raise SystemExit('找不到虹膜')
    sz = nd.sum(np.ones_like(lab), lab, range(1, k + 1))
    # 虹膜＝每隻眼最大的那一塊；用「最寬那一列」擬合成橢圓（被上下眼皮蓋掉的部分也包進來）
    iris = np.zeros((H, W), bool)       # 看得到的虹膜（原圖像素）
    ell = np.zeros((H, W), bool)        # 完整的橢圓（看不到的部分用擴散補）
    yy, xx = np.mgrid[0:H, 0:W]
    irises = []                         # 每隻眼的虹膜橢圓 (cx, cy, rx, ry)，淚眼的高光用
    for e in eyes:
        oe = opening_of(e, (H, W), seg)
        ids = np.unique(lab[oe & irisraw]); ids = ids[ids > 0]
        if not len(ids):
            continue
        j = ids[np.argmax(sz[ids - 1])]
        comp = nd.binary_fill_holes(lab == j)
        comp = nd.binary_dilation(comp, iterations=2) & O & ~sclera     # 擴回 2px（虹膜外框）
        rows = np.where(comp.any(1))[0]
        wid = np.array([comp[r].sum() for r in rows])
        rc = rows[int(np.argmax(wid))]
        cols = np.where(comp[rc])[0]
        cx = (cols[0] + cols[-1]) / 2; rx = (cols[-1] - cols[0] + 1) / 2
        cy = rc + 0.5; ry = rx * 1.1
        E = ((xx - cx) / (rx + 0.5)) ** 2 + ((yy - cy) / (ry + 0.5)) ** 2 <= 1
        # 虹膜邊上的白色反光會被判成眼白、又沒被外框圍住 ⇒ 用縮小 8% 的橢圓補進來（抖動時反光跟著動）
        Es = ((xx - cx) / (rx * 0.92)) ** 2 + ((yy - cy) / (ry * 0.92)) ** 2 <= 1
        Eb = ((xx - cx) / (rx * 1.15)) ** 2 + ((yy - cy) / (ry * 1.15)) ** 2 <= 1
        comp = nd.binary_fill_holes((comp | (Es & O)) & Eb)    # 虹膜不准超出放大 15% 的橢圓
        irises.append((cx, cy, rx, ry))
        iris |= comp
        ell |= E | comp        # 擬合不準時也要把原圖的虹膜整塊包進來（原位才不會留一塊灰）
        # 開口扣掉橢圓外的暗線（下眼瞼線、下睫毛）：它們留在原圖上、蓋在虹膜上面，虹膜往下抖不會蓋過下眼瞼
        O &= ~(~Eb & (L < 110) & oe)
    # 開口的框（兩眼合起來）＋ 抖動餘裕
    ys, xs = np.where(O)
    PAD = 4
    bx0, by0, bx1, by1 = int(xs.min()) - PAD, int(ys.min()) - PAD, int(xs.max()) + PAD + 1, int(ys.max()) + PAD + 1
    # 底：虹膜挖掉、用開口裡的眼白擴散補
    # 整個橢圓（含虹膜外框）都換成眼白，抖開時原位不留殘影。
    # 逐列左右內插：同一列只拿左右兩邊的眼白（上眼皮下的陰影只延續在上面那幾列，不會擴散成一整塊灰）；
    # 某一列只有一邊有眼白就照抄那一邊；兩邊都沒有的才走擴散。
    # 虹膜層＝看得到的虹膜 ＋ 橢圓裡被眼皮蓋住（開口外）的部分；看得到的眼白一律不進層（擬合偏大時才不會塗出一塊灰）
    ell = iris | (ell & ~O)
    U = nd.binary_dilation(iris, iterations=2) & O      # 底層要補成眼白的：虹膜＋外框 2px（外框反鋸齒的暗邊也要換掉）
    fill = f.copy()
    known = sclera & ~ell
    left_over = np.zeros((H, W), bool)
    for y in np.where(U.any(1))[0]:
        xs_u = np.where(U[y])[0]
        # 這一列的未知區可能分成兩隻眼睛的兩段，逐段處理
        segs = np.split(xs_u, np.where(np.diff(xs_u) > 1)[0] + 1)
        for s in segs:
            a, b = s[0], s[-1]
            lk = np.where(known[y, max(0, a - 12):a])[0]
            rk = np.where(known[y, b + 1:min(W, b + 13)])[0]
            lc = f[y, max(0, a - 12) + lk[-1]] if len(lk) else None
            rc = f[y, b + 1 + rk[0]] if len(rk) else None
            if lc is None and rc is None:
                left_over[y, s] = True; continue
            if lc is None: lc = rc
            if rc is None: rc = lc
            t = (s - a + 1) / (b - a + 2)
            fill[y, s] = lc[None] * (1 - t[:, None]) + rc[None] * t[:, None]
    if left_over.any():
        fill = fill_from(fill, U & ~left_over | known, left_over)
    # 逐列內插會因為相鄰兩列抓到的眼白深淺不同而排成橫紋 ⇒ 在補上的範圍內做一次「只沿垂直、只算補上像素」的柔化
    from scipy.ndimage import gaussian_filter1d
    Uf = U.astype(np.float32)
    num = gaussian_filter1d(fill * Uf[..., None], 1.6, axis=0)
    den = gaussian_filter1d(Uf, 1.6, axis=0)[..., None]
    sm = np.where(den > 1e-3, num / np.maximum(den, 1e-3), fill)
    fill[U] = sm[U]
    # 虹膜層＝整個橢圓：看得到的用原圖，被眼皮蓋住的用虹膜自己的顏色擴散補（抖動時不會露出白縫或方塊）
    hidden = ell & ~iris
    irisC = fill_from(f, iris, hidden)
    # 邊緣 1px 羽化（不然抖動時虹膜的鋸齒邊會閃）
    irisA = nd.gaussian_filter(ell.astype(np.float32), 0.6)
    irisA = np.clip(irisA * 1.4, 0, 1) * (nd.binary_dilation(ell, iterations=1))
    crop = lambda a: a[by0:by1, bx0:bx1]
    os.makedirs(DST, exist_ok=True)
    key = n.lower()
    mk = np.dstack([np.full((by1 - by0, bx1 - bx0, 3), 255, np.uint8), (crop(O) * 255).astype(np.uint8)])
    if not A.tear_only:
        Image.fromarray(mk, 'RGBA').save(os.path.join(DST, key + '_tr_mask.webp'), 'WEBP', lossless=True, method=6)
    fl = np.dstack([np.clip(crop(fill), 0, 255).astype(np.uint8), (crop(O) * 255).astype(np.uint8)])
    if not A.tear_only:
        Image.fromarray(fl, 'RGBA').save(os.path.join(DST, key + '_tr_fill.webp'), 'WEBP', quality=95, alpha_quality=100, method=6)
    ir = np.dstack([np.clip(crop(irisC), 0, 255).astype(np.uint8), (crop(irisA) * 255).astype(np.uint8)])
    if not A.tear_only:
        Image.fromarray(ir, 'RGBA').save(os.path.join(DST, key + '_tr_iris.webp'), 'WEBP', quality=95, alpha_quality=100, method=6)
    # ══ 淚眼汪汪（tear）══ Ray 10-03：「不是畫水線，讓虹膜有白光閃動就好」——
    #   三張光點圖（te_g0／g1／g2），各在虹膜裡放一兩顆白色柔邊光點，引擎用不同節奏與相位閃（像淚光在眼裡一閃一閃）。
    #   光點只在虹膜（看得到的部分）裡。位置：左上大光點、右下小光點、右側與下方的細碎閃點。
    GL = [
        [(-0.30, -0.34, 0.30, 1.0)],                        # g0：左上主光（慢慢明滅）
        [(0.30, 0.36, 0.16, 1.0), (-0.38, 0.30, 0.09, 0.9)],  # g1：右下＋左下小光（閃）
        [(0.40, -0.18, 0.10, 1.0), (0.02, 0.52, 0.08, 0.85)], # g2：右側與下方細碎閃點（快閃）
    ]
    glints = []
    for spec in GL:
        g = np.zeros((H, W), np.float32)
        for (cx, cy, rx, ry) in irises:
            Ei = ((xx - cx) / (rx * 1.02)) ** 2 + ((yy - cy) / (ry * 1.02)) ** 2 <= 1
            for (ox, oy, r, a) in spec:
                d2 = ((xx - (cx + ox * rx)) ** 2 + (yy - (cy + oy * ry)) ** 2) / (r * rx) ** 2
                g = np.maximum(g, a * np.clip(1.5 - d2 * 1.5, 0, 1) * Ei)
        glints.append(g * O)
    for i, g in enumerate(glints):
        arr_ = np.dstack([np.full((H, W, 3), 255, np.float32), g * 255])
        Image.fromarray(np.clip(crop(arr_), 0, 255).astype(np.uint8), 'RGBA').save(
            os.path.join(DST, key + '_te_g%d.webp' % i), 'WEBP', quality=95, alpha_quality=100, method=6)
    te_w = te_h = None    # 表
    tab = {}
    if os.path.exists(TABLE):
        m = re.search(r'EYEFX\s*=\s*(\{.*\});', open(TABLE, encoding='utf-8').read(), re.S)
        tab = json.loads(m.group(1)) if m else {}
    ent = tab.get(key, {})
    if not A.tear_only:
        ent['tr'] = [bx0, by0, bx1 - bx0, by1 - by0]
    ent['te'] = [bx0, by0, bx1 - bx0, by1 - by0]   # 淚眼：同一個框（_te_g0／g1／g2 三張光點）
    tab[key] = ent
    rows = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(tab[k], separators=(",", ":"))}' for k in sorted(tab))
    open(TABLE, 'w', encoding='utf-8', newline='\n').write(
        '/* ══ 立繪眼部特效表 —— **機器產生，不要手改**（tools/eye_fx.py）══\n'
        '   鑰匙＝立繪檔名；tr＝瞳孔顫動三張圖的框 [x,y,w,h]（原圖像素）。檔案：resources/si/eyefx/<鑰匙>_tr_{mask,fill,iris}.webp。\n'
        '   開不開由 腳本那一拍的 `eyes` 決定（ver -1959；引擎 modules/eyefx.js 的 eyesOf）。 */\n'
        'export const EYEFX = {\n' + rows + '\n};\n')
    print(json.dumps(ent), 'iris px', int(iris.sum()), 'opening px', int(O.sum()))
    if A.preview:
        tiles = []
        for dx, dy in ((0, 0), (-2, 0), (2, 1), (0, -2)):   # 放大抖幅（實際約 1px）看接縫
            cv = im.copy().crop((bx0, by0, bx1, by1)).convert('RGBA')
            box = Image.new('RGBA', cv.size, (0, 0, 0, 0))
            box.alpha_composite(Image.fromarray(fl, 'RGBA'))
            box.alpha_composite(Image.fromarray(ir, 'RGBA'), (dx, dy)) if dx >= 0 and dy >= 0 else None
            if dx < 0 or dy < 0:
                sh = Image.new('RGBA', cv.size, (0, 0, 0, 0)); sh.paste(Image.fromarray(ir, 'RGBA'), (dx, dy)); box.alpha_composite(sh)
            m = Image.fromarray((crop(O) * 255).astype(np.uint8))
            clipped = Image.new('RGBA', cv.size, (0, 0, 0, 0)); clipped.paste(box, (0, 0), m)
            cv.alpha_composite(clipped)
            tiles.append(cv.convert('RGB').resize((cv.width * 6, cv.height * 6), Image.NEAREST))
        # 第五格：淚眼（原圖＋水線＋高光）
        cv = im.copy().crop((bx0, by0, bx1, by1)).convert('RGBA')
        for g in glints:
            cv.alpha_composite(Image.fromarray(np.clip(crop(np.dstack([np.full((H, W, 3), 255, np.float32), g * 255])), 0, 255).astype(np.uint8), 'RGBA'))
        tiles.append(cv.convert('RGB').resize((cv.width * 6, cv.height * 6), Image.NEAREST))
        Wt, Ht = tiles[0].size
        out = Image.new('RGB', (Wt, Ht * len(tiles) + 8 * len(tiles)), (0, 0, 0))
        for i, t in enumerate(tiles):
            out.paste(t, (0, i * (Ht + 8)))
        out.save(A.preview)


if __name__ == '__main__':
    main()

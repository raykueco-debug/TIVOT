# -*- coding: utf-8 -*-
"""把 `flight/index.html` 的 `RUIN_ART[<key>].parts` 畫成一張**正立面圖**（剪影＋深度分層）。

為什麼要這一支（ver -1230）：`ruin_heightmap.py` 出的是**俯視**，而美術交的參考是
**外觀圖（立面）** —— 拿俯視圖去比外觀圖比不出任何東西。Ray 說的
「柱太多太細太長」全部是**立面**上的事（數量、粗細、高度比），
所以要有一張同方向的圖才比得了（§6.8.1「先量參考圖，不要憑眼睛排」）。

⚠ 它是**正投影**（沒有透視）：外觀圖是仰角透視，所以**只准比「比例」**
  —— 數量、寬高比、誰比誰高。平面位置一律比不出來（§6.8.1 那條鐵則）。
⚠ 觀看方向＝`rot:0` 的正面（+x 看向 −x）：螢幕 x ＝ 世界 y（沿牆），螢幕 y ＝ z。
  越靠近觀眾（x 越大）畫得越亮 —— 那一階灰就是「前後幾排」。

用法：  python3 tools/ruin_elevation.py muyak [out.png]
"""
import json, math, os, subprocess, sys
import _jsrun               # JS 資料的唯一引擎（jsc／node），見 tools/_jsrun.py
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PPU  = 4          # 每個世界單位幾個像素
PAD  = 10

def art_of(key):
    """從 index.html 抽出 RUIN_ART，用 JS 引擎求值（tools/_jsrun.py）。"""
    src = open(os.path.join(ROOT, 'flight/index.html'), encoding='utf-8').read()
    i = src.index('const RUIN_ART')
    j = src.index('\n};', i) + 3
    js = src[i:j] + '\nprint(JSON.stringify(RUIN_ART[%s]));' % json.dumps(key)
    return _jsrun.dump(js, what='RUIN_ART')

def place_of(key):
    """PLACES 裡那一筆（要 x/y 才取樣得到地形）。"""
    src = open(os.path.join(ROOT, 'flight/index.html'), encoding='utf-8').read()
    i = src.index('const PLACES'); j = src.index('\n];', i) + 3
    js = src[i:j] + '\nprint(JSON.stringify(PLACES.filter(p=>p.ruin===%s)[0]||null));' % json.dumps(key)
    return _jsrun.dump(js, what='PLACES')

def main():
    key = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else \
          os.path.join(ROOT, 'flight/Reference/%s_elev.png' % key)
    A = art_of(key)
    parts = A['parts']

    # ══ drape（ver -1231）：每一塊踩自己腳下的地形。畫立面時一定要跟著算，
    #    不然看到的是「攤平在一個平面上」的假象 —— 而那正是 -1230 沒看出
    #    「22 塊埋在地下」的原因。
    dzf = lambda lx, ly, w, l: 0.0
    ground = None
    if A.get('drape'):
        from PIL import Image as _I
        import numpy as _np
        P = place_of(key)
        hm = _np.asarray(_I.open(os.path.join(ROOT, 'flight/silvermoon_heightmap.png'))
                         .convert('L')).astype(float) / 255.0 * 520.0
        CX, CY = P['x'], P['y']
        rot = A.get('rot', 0); ca, sa = math.cos(rot), math.sin(rot)
        GH = hm[CY, CX] + A.get('lift', 0)
        def hl(lx, ly):
            wx = CX + (lx * ca - ly * sa) / 20.0
            wy = CY + (lx * sa + ly * ca) / 20.0
            ix, iy = int(wx), int(wy); fx, fy = wx - ix, wy - iy
            h0 = hm[iy, ix] * (1 - fx) + hm[iy, ix + 1] * fx
            h1 = hm[iy + 1, ix] * (1 - fx) + hm[iy + 1, ix + 1] * fx
            return (h0 * (1 - fy) + h1 * fy) - GH
        UP = A.get('drapeUp', 0)          # 整座一起往上抬（ver -1233）
        def dzf(lx, ly, w, l):
            m = min(hl(lx + a * w / 4.0, ly + b * l / 4.0)
                    for a in range(-2, 3) for b in range(-2, 3))
            return m + UP
        ground = hl

    # ── 每個零件在立面上的矩形（y 範圍 × z 範圍）＋ 它的 x（深度）──
    rects = []
    cur = 0.0
    for p in parts:
        k = p.get('k', 'fallen')
        x, y = p.get('x', 0), p.get('y', 0)
        z0 = p.get('z0', 0)
        if k == 'tower':
            w = p['r'] * 2; h = p.get('h', 0)
            if p.get('cap'): h += p['cap'].get('h', 0)
        elif k == 'fallen':
            w = p.get('len', 0) * abs(math.cos(p.get('rot', 0))) + p.get('dia', 0)
            h = p.get('dia', 0) * 0.82
        else:                                    # stump / gable
            w = p.get('l', p.get('dia', 0)); h = p.get('h', 0)
        # ⚠ 規約同引擎：z0<=0 ＝踩地（自己取樣）、z0>0 ＝跟著前一塊踩地的
        if p.get('z0', 0) <= 0:
            dw = p['r'] * 2 if k == 'tower' else p.get('w', p.get('dia', p.get('len', 0)))
            cur = dzf(x, y, dw, w)
        z0 += cur
        rects.append((y - w / 2, y + w / 2, z0, z0 + h, x, k, p.get('col')))

    ys = [r[0] for r in rects] + [r[1] for r in rects]
    zs = [r[2] for r in rects] + [r[3] for r in rects]
    y0, y1 = min(ys) - PAD, max(ys) + PAD
    z0, z1 = min(zs) - PAD, max(zs) + PAD
    W = int((y1 - y0) * PPU); H = int((z1 - z0) * PPU)

    from PIL import Image, ImageDraw
    im = Image.new('RGB', (W, H), (24, 26, 30)); d = ImageDraw.Draw(im)
    xs = [r[4] for r in rects]; xlo, xhi = min(xs), max(xs)
    # 由遠而近畫（x 小的先），近的蓋住遠的
    for r in sorted(rects, key=lambda r: r[4]):
        t = 0 if xhi == xlo else (r[4] - xlo) / (xhi - xlo)
        g = int(70 + 150 * t)
        c = (200, 120, 60) if r[6] else (g, g, int(g * 0.96))
        a = ((r[0] - y0) * PPU, (z1 - r[3]) * PPU)
        b = ((r[1] - y0) * PPU, (z1 - r[2]) * PPU)
        d.rectangle([a, b], fill=c, outline=(18, 18, 20))
    # 地面：drape 時畫**真正的地形剖面**（沿長軸掃一遍，取那一條線上的高度）
    if ground:
        pts = []
        for sx in range(W):
            ly = y0 + sx / PPU
            pts.append((sx, (z1 - ground(0, ly)) * PPU))
        d.line(pts, fill=(200, 90, 60), width=2)
    else:
        gy = (z1 - 0) * PPU
        d.line([(0, gy), (W, gy)], fill=(220, 60, 60), width=2)
    im.save(dst)
    above = [r for r in rects if r[3] > 0]
    print('%s  %dx%d px  (%.0f/PPU=%d)  零件 %d  露出地面 %d' %
          (dst, W, H, PPU, PPU, len(rects), len(above)))
    print('沿牆 %.0f 進深 %.0f  地面上最高 %.1f  最低 %.1f' %
          (y1 - y0 - 2 * PAD, xhi - xlo, max(r[3] for r in rects), min(r[2] for r in rects)))

main()

# -*- coding: utf-8 -*-
"""把 *_blocks.json 的街廓／水域／綠地疊回原插畫，用來檢查對位。

那份 JSON 是把插畫丟給視覺模型判讀出來的（街廓多邊形＋高度階），語意判讀
可靠但**空間精度是弱項** —— 沒有疊圖就等於在盲改。這支腳本就是那面鏡子。

用法：  py flight/preview_blocks.py city/stown_blocks.json
輸出：  同目錄的 *_preview.png（長邊 1200）
"""
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# 高度階 → 疊色（越高越亮，與 SVG 那版同一套視覺）
RAMP = [(0.00, (90, 90, 90)), (0.20, (120, 120, 120)), (0.35, (160, 160, 160)),
        (0.50, (195, 195, 195)), (0.65, (225, 225, 225)), (0.80, (245, 245, 245)),
        (1.01, (255, 255, 255))]


def shade(h):
    for t, c in RAMP:
        if h <= t:
            return c
    return RAMP[-1][1]


def polar_to_poly(b, P, seg=3.0):
    """極座標的環狀扇形 → 多邊形（插畫像素）。

    ⚠ 弧要細分：直接用四個角連直線的話，24° 的扇形外弧會凹進去約 2%，
      在 599px 半徑上是 13px —— 疊圖驗證時會被誤讀成「模型畫歪了」。
    """
    import math
    cx, cy, R = P['cx'], P['cy'], P['R']
    prof = P.get('Rprofile')
    a0, a1 = float(b['a0']), float(b['a1'])
    if a1 <= a0:
        a1 += 360.0                      # 跨過 0° 的扇形
    fr0, fr1 = float(b['r0']), float(b['r1'])
    n = max(2, int(math.ceil((a1 - a0) / seg)))

    # ⚠ 外緣半徑取**當地值**而不是全域平均：這座建築的外緣在 464~626px 之間
    #   變動，固定半徑會讓貼著外緣的細長扇形整個戳出建築外 —— 實測尖塔 #18
    #   的本體佔比是 0%，不是模型判斷錯，是這個換算的錯。
    def Rat(a):
        return prof[int(a) % 360] if prof else R

    def pt(a, f):
        r = f * Rat(a)
        return (cx + math.sin(math.radians(a)) * r,
                cy - math.cos(math.radians(a)) * r)

    out = [pt(a0 + (a1 - a0) * i / n, fr1) for i in range(n + 1)]
    out += [pt(a1 - (a1 - a0) * i / n, fr0) for i in range(n + 1)]
    return out


def main(rel):
    path = rel if os.path.isabs(rel) else os.path.join(HERE, rel)
    J = json.load(io.open(path, encoding='utf-8'))
    src = os.path.join(os.path.dirname(path), J['src'])
    im = Image.open(src).convert('RGBA')
    W, H = im.size

    # JSON 的座標空間 → 實際像素。等比才不會變形，這裡順手驗一次。
    cw, ch = J.get('coordSpace', [1000, 1000])
    kx, ky = W / float(cw), H / float(ch)
    print('圖 %dx%d，座標空間 %dx%d → kx=%.4f ky=%.4f%s'
          % (W, H, cw, ch, kx, ky, '' if abs(kx - ky) < 1e-3 else '  ⚠ 非等比！'))

    lv = {L['id']: L['h'] for L in J['levels']}
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    PL = J.get('polar')
    def pts_of(b):
        if PL is not None and 'a0' in b:
            return polar_to_poly(b, PL)
        return [(p[0] * kx, p[1] * ky) for p in b['poly']]

    for r in J.get('regions', []):
        pts = pts_of(r)
        col = (30, 111, 176, 70) if r['type'] == 'water' else (47, 125, 50, 52)
        d.polygon(pts, fill=col)

    for b in J['blocks']:
        pts = pts_of(b)
        c = shade(lv.get(b['level'], 0.0))
        d.polygon(pts, fill=c + (140,), outline=(0, 0, 0, 190))

    out = Image.alpha_composite(im, ov)

    # 編號另外畫在合成之後，才不會被半透明蓋掉
    d2 = ImageDraw.Draw(out)
    try:
        fnt = ImageFont.truetype('arial.ttf', max(11, W // 90))
    except Exception:
        fnt = ImageFont.load_default()
    for b in J['blocks']:
        pts = pts_of(b)
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        d2.text((cx, cy), str(b['id']), fill=(255, 60, 60, 255), font=fnt,
                anchor='mm', stroke_width=2, stroke_fill=(0, 0, 0, 255))

    out = out.convert('RGB')
    out.thumbnail((1200, 1200), Image.LANCZOS)
    dst = path.replace('.json', '_preview.png')
    out.save(dst)
    print('→ %s  (%d 塊 / %d 區)' % (os.path.basename(dst),
                                     len(J['blocks']), len(J.get('regions', []))))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'city/stown_blocks.json')

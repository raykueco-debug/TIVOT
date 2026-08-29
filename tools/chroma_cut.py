#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""chroma_cut.py — 綠幕去背（ver -574）

Gemini 生不出真 alpha，所以請它畫在**純青綠底**（#00B140）上，由這一支去背。

  python3 tools/chroma_cut.py <輸入.png> [輸出.png]

作法：轉 YCbCr 判色差（不是逐像素比 RGB —— 那對抗鋸齒邊緣一律失敗），
邊緣做**去溢色**（把綠通道壓回 R/B 的較大值，消掉輪廓那圈綠邊）。
⚠ 門檻是對 #00B140 調的；換底色要重調 KEY。
"""
import sys, os
from PIL import Image

KEY = (0x00, 0xB1, 0x40)          # Gemini 那邊指定的青綠
HARD, SOFT = 60, 130              # 色差 < HARD 全透明；> SOFT 全不透明；中間線性

def ycbcr(r, g, b):
    y  =  0.299*r + 0.587*g + 0.114*b
    cb = -0.168736*r - 0.331264*g + 0.5*b + 128
    cr =  0.5*r - 0.418688*g - 0.081312*b + 128
    return y, cb, cr

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(src)[0] + '_cut.png'
    im = Image.open(src).convert('RGBA')
    px = im.load()
    w, h = im.size
    _, kcb, kcr = ycbcr(*KEY)
    cut = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            yy, cb, cr = ycbcr(r, g, b)
            d = ((cb-kcb)**2 + (cr-kcr)**2) ** 0.5
            # ⚠⚠ **暗像素不參與去背**（ver -574 實測）：色度在低亮度下本來就不穩，
            #   怪物身上的暗紅褐／暗紫（Y≈40~90）色度會落在綠鍵附近，
            #   於是主體中央被打成半透明（實測 alpha 只剩 109~151）。
            #   綠幕本身很亮（#00B140 的 Y≈100），拿亮度當守門不會誤放綠底。
            if yy < 90:
                continue
            if d < HARD:
                px[x, y] = (r, g, b, 0); cut += 1
            elif d < SOFT:
                na = int(255 * (d-HARD) / (SOFT-HARD))
                # 去溢色只做在**邊緣的半透明帶**，而且按透明度加權 ——
                # 無條件把 g 壓到 max(r,b) 會把主體裡本來就含綠的顏色
                # （紫紅祭衣、青銅、暗綠）一起洗成灰白（ver -574 實測踩過）。
                g2 = min(g, max(r, b))
                k = 1.0 - na/255.0          # 越透明的邊緣壓得越重
                px[x, y] = (r, int(g*(1-k) + g2*k), b, min(a, na))
    im.save(dst)
    print('%s → %s（去掉 %.1f%% 像素）' % (os.path.basename(src), os.path.basename(dst),
                                          100.0*cut/(w*h)))

if __name__ == '__main__':
    main()

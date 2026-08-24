#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""measure_si.py — 立繪取景值量測（CLAUDE.md §6.5 的量法，做成工具）

用法：  python3 tools/measure_si.py resources/SI/*.webp

輸出每張圖的 top / bot / fx，可直接貼進 script/speakers.js 的 ART。
  top/bot  alpha>24 的上下緣（= 人物最上緣/最下緣）
  fx       **頭部那一段**（頭頂往下 8% 身高）的 alpha 加權橫向重心 ÷ 圖寬

⚠ 只適用**全身**去背立繪。半身/胸像照量會把人放大好幾倍（§6.5），
  工具會在 (bot-top)/高 < 0.9 時警告。
⚠ 這些數字是**那一張圖**的，不可沿用別張（差分是不同姿勢，不是換臉）。
"""
import sys
from PIL import Image

TH = 24          # alpha 門檻
HEAD = 0.08      # 臉中心取樣帶：頭頂往下 8% 身高

def measure(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    a = im.getchannel('A').load()
    rows = []
    for y in range(H):
        for x in range(W):
            if a[x, y] > TH:
                rows.append(y); break
    if not rows:
        return None
    top = rows[0]
    bot = 0
    for y in range(H - 1, -1, -1):
        if any(a[x, y] > TH for x in range(W)):
            bot = y; break
    band = max(1, int((bot - top) * HEAD))
    num = den = 0
    for y in range(top, min(bot, top + band) + 1):
        for x in range(W):
            v = a[x, y]
            if v > TH:
                num += x * v; den += v
    fx = (num / den / W) if den else 0.5
    return dict(w=W, h=H, top=top, bot=bot, fx=fx)

for p in sys.argv[1:]:
    m = measure(p)
    if not m:
        print('%-46s  全透明？' % p); continue
    span = (m['bot'] - m['top']) / m['h']
    warn = '   ⚠ 縱向只佔 %.0f%%，可能不是全身圖 → top/bot 不可當身高用' % (span * 100) if span < 0.9 else ''
    print('%-46s  %dx%d   top:%-5d bot:%-5d fx:%.3f%s'
          % (p.split('/')[-1], m['w'], m['h'], m['top'], m['bot'], m['fx'], warn))

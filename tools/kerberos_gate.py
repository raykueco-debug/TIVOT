#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/kerberos_gate.py —— 楣＋槍棺合成同一張圖（ver -2217，Ray：「把楣跟槍棺做成同一張圖，不要再分」）

    py tools/kerberos_gate.py          # 寫 resources/vfx/kerberos_gate.webp，印出 KERB_META.gate

來源是**已經切好的**兩張遊戲素材（`kerberos_cut.py` 的輸出）：
  kerberos_door.webp  門本體 853×1844
  kerberos_top.webp   楣（原本橫跨整個畫面寬，這一版改成**跟門一樣寬** —— Ray 定）

擺法照原本畫面上的相對位置（`KERB_META.top`）：楣縮到門寬 → 高 th＝門寬×ar；
楣的**中段下緣**壓進門頂 th×dip（兩端的鉚接塊比中段低，§ layoutKerberos 的說明）。
⇒ 合成圖的上方多出 off＝th×(1−dip) 列，門本體從 y＝off 開始。

⚠ 門的座標系**不變**（紋章／箭／鉚釘／吊墜的比例都還是對 853×1844 那一塊算）：
  程式端只是讓門的畫面往上多畫 off 那一段（主頁＝左右兩扇往上延伸、飛行頁＝門的底圖往上延伸）。
⚠ `ar`／`dip` 與 story.js 的 KERB_META.top、flight 的 FKERB.top 是同一組數字（三邊互指）。
"""
import os, sys
import _utf8  # noqa: F401
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VFX = os.path.join(ROOT, 'resources', 'vfx')
AR, DIP = 0.11159, 0.11915          # ＝ KERB_META.top（改一邊要改另外兩邊）

door = Image.open(os.path.join(VFX, 'kerberos_door.webp')).convert('RGBA')
top = Image.open(os.path.join(VFX, 'kerberos_top.webp')).convert('RGBA')
W, H = door.size
th = W * AR
off = round(th * (1 - DIP))
top = top.resize((W, round(th)), Image.LANCZOS)
out = Image.new('RGBA', (W, H + off), (0, 0, 0, 0))
out.alpha_composite(door, (0, off))
out.alpha_composite(top, (0, 0))      # 楣蓋在門上（中段下緣壓進門頂）
dst = os.path.join(VFX, 'kerberos_gate.webp')
out.save(dst, 'WEBP', quality=90, method=6)
print('寫出', dst, out.size, '%.1f KB' % (os.path.getsize(dst) / 1024))
print('KERB_META.gate = {"off": %.5f}   # off ÷ 門高（門本體從合成圖的這個比例開始）' % (off / H))

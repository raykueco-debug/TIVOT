# 宣傳片：原作字卡（黑底，1080×1920 PNG）。字型與顏色跟 brand_logo.py 的標題同一套（思源宋體、金色）。
#   py -X utf8 tools/promo/credit_card.py <輸出資料夾>      → credit_al.png（原作 AL）、credit_eos.png（Project E.O.S.）
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
FONT = r'C:\Windows\Fonts\NotoSerifTC-VF.ttf'
GOLD = (236, 205, 140)          # ＝ brand_logo.py 的 GOLD
GOLD_DIM = (176, 150, 102)
CREAM = (214, 198, 166)

def font(size, var):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_name(var); return f

def spaced(dr, cx, y, txt, f, sp, fill):
    w = sum(dr.textlength(ch, font=f) for ch in txt) + sp * (len(txt) - 1)
    x = cx - w / 2
    for ch in txt:
        dr.text((x, y), ch, font=f, fill=fill); x += dr.textlength(ch, font=f) + sp
    return w

def rule(dr, cx, y, half=210):
    for i in range(-half, half + 1):
        a = max(0, 1 - abs(i) / half) ** 1.5
        dr.point((cx + i, y), fill=tuple(int(c * a) for c in GOLD_DIM))

def finish(lay, out):
    a = np.asarray(lay, float)
    glow = np.asarray(lay.filter(ImageFilter.GaussianBlur(9)), float)
    Image.fromarray(np.clip(a + glow * 0.45, 0, 255).astype(np.uint8)).save(out); print('->', out)

out = sys.argv[1]; cx = W / 2
# ① 原作 AL
lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
spaced(dr, cx, 790, '原作', font(46, 'SemiBold'), 40, GOLD_DIM)
rule(dr, cx, 868)
spaced(dr, cx, 872, 'AL', font(168, 'Black'), 18, GOLD)
rule(dr, cx, 1092)
finish(lay, os.path.join(out, 'credit_al.png'))
# ② Project E.O.S.
lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
rule(dr, cx, 852, 260)
spaced(dr, cx, 870, 'Project', font(58, 'Medium'), 14, CREAM)
spaced(dr, cx, 952, 'E.O.S.', font(150, 'Black'), 22, GOLD)
rule(dr, cx, 1150, 260)
finish(lay, os.path.join(out, 'credit_eos.png'))

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
# ③ 結尾署名 v2（ver -2224，Ray：「Project E.O.S. 要做成 LOGO，像兩個協力廠商那樣並列；BGM 字樣不要小」）
#   左：Project E.O.S. 標誌（細金雙環＋環內 E.O.S.＋環下 PROJECT）；右：PV BGM／Peritune Material／Havoc；中間細直線
import math
def logo_eos(dr, cx, cy):
    R = 118
    for k in range(3):
        r = R - k * 0.8; dr.ellipse((cx - r, cy - r, cx + r, cy + r), outline=GOLD_DIM if k else GOLD, width=1)
    r2 = R - 11; dr.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=GOLD_DIM, width=1)
    for a in (90, 270):
        x = cx + math.cos(math.radians(a)) * R; y = cy - math.sin(math.radians(a)) * R
        dr.line((x, y - 16, x, y + 16), fill=GOLD, width=2)
    spaced(dr, cx, cy - 40, 'E.O.S.', font(56, 'Black'), 6, GOLD)
    spaced(dr, cx, cy + R + 22, 'PROJECT', font(30, 'SemiBold'), 16, CREAM)
def block_bgm(dr, cx, cy):
    spaced(dr, cx, cy - 150, 'PV BGM', font(34, 'SemiBold'), 16, CREAM)
    rule(dr, cx, cy - 96, 120)
    spaced(dr, cx, cy - 70, 'Peritune', font(64, 'Bold'), 4, GOLD)
    spaced(dr, cx, cy + 4, 'Material', font(64, 'Bold'), 4, GOLD)
    rule(dr, cx, cy + 96, 120)
    spaced(dr, cx, cy + 116, 'Havoc', font(44, 'Medium'), 8, CREAM)
lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay); cy = 960
logo_eos(dr, W * 0.27, cy)
for y in range(cy - 190, cy + 190):
    a = max(0, 1 - abs(y - cy) / 190) ** 1.2
    dr.point((W / 2, y), fill=tuple(int(c * a) for c in GOLD_DIM))
block_bgm(dr, W * 0.73, cy)
finish(lay, os.path.join(out, 'credit_end_v2.png'))

# ④ 開頭兩張原作字卡 v2（ver -2224，Ray：「credit al 跟 credit eos 都太醜，簡約不要簡陋，字太大、太置中看起來偏低」「改成 A.L.」）
#   字縮小、放在畫面高 40%（視覺中心），細線＋兩端菱形，背景一層淡暖光暈（抖色消色階）；E.O.S. 用結尾署名卡同一個 LOGO
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
CY = int(H * 0.40)                                     # 視覺中心（偏上），不放正中
def backdrop():
    # 不是死黑：中心一層很淡的暖光暈＋四周壓暗
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot((xx - W / 2) / (W * 0.55), (yy - CY) / (H * 0.30))
    g = np.clip(1 - d, 0, 1) ** 2
    rgb = np.stack([g * 22, g * 16, g * 9], -1) + np.array([4, 3, 3])
    rgb = rgb + np.random.default_rng(1).uniform(-0.6, 0.6, rgb.shape)   # 抖色：消掉漸層的一圈圈色階
    return Image.fromarray(rgb.astype(np.uint8))
def fine_rule(dr, cx, y, half):
    for i in range(-half, half + 1):
        a = max(0, 1 - abs(i) / half) ** 0.6 * 0.9
        dr.point((cx + i, y), fill=tuple(int(c * a) for c in GOLD_DIM))
    for s in (-1, 1):                                  # 兩端小菱形
        x = cx + s * (half + 10); dr.polygon([(x, y - 4), (x + 4, y), (x, y + 4), (x - 4, y)], fill=GOLD_DIM)
def glowify(lay, base, amt=0.35):
    a = np.asarray(lay, float); gl = np.asarray(lay.filter(ImageFilter.GaussianBlur(7)), float)
    b = np.asarray(base, float)
    return Image.fromarray(np.clip(b + a + gl * amt, 0, 255).astype(np.uint8))
def save(lay, name):
    im = lay   # Ray：「字跟黑底就好，不要光暈」—— 純黑底、字也不發光（glowify／backdrop 不再用）
    im.save(os.path.join(out, name)); return im
# ① 原作 AL
lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
spaced(dr, W / 2, CY - 92, '原　作', font(30, 'Medium'), 22, GOLD_DIM)
fine_rule(dr, W / 2, CY - 34, 130)
spaced(dr, W / 2, CY - 18, 'A.L.', font(96, 'SemiBold'), 14, GOLD)
a1 = save(lay, 'credit_al_v2.png')
# ② Project E.O.S.（Ray：「credit eos 還不用放 logo」）—— 跟 A.L. 同一套排法的純文字
lay = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(lay)
spaced(dr, W / 2, CY - 40, 'Project E.O.S.', font(72, 'SemiBold'), 6, GOLD)   # Ray：「一排字就好」
a2 = save(lay, 'credit_eos_v2.png')
#sh = Image.new('RGB', (540 * 2, 960)); sh.paste(a1.resize((540, 960)), (0, 0)); sh.paste(a2.resize((540, 960)), (540, 0)); sh.save(os.path.join(out, 'sheet.jpg'), quality=92)


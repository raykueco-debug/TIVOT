# -*- coding: utf-8 -*-
"""把 resources/Flight_Enemy/ 的六視圖合成稿拆成單獨的視角圖。

原稿是 RGBA、透明底，六個角度排在同一張 1536×1024 上。
拆法：對 alpha 取連通區塊 → 每塊就是一個視角。

⚠ 主體外圍有一圈半透明輝光（蜈蚣有 44% 的像素落在 alpha 1~254），
  直接用 alpha>0 找連通區塊會把六個視角的輝光連成一整片。
  所以先用較高的門檻（ALPHA_CORE）找「實體」，再把該區塊的外框
  往外放 PAD 像素去取回完整的輝光。

輸出到 flight/enemy/<名稱>/view_<序號>.webp，並印出各視角的外框與尺寸，
供人工指認哪一張是俯視／側視／正面。

用法：  py flight/split_enemy.py
"""
import math
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'resources', 'Flight_Enemy')
OUT = os.path.join(HERE, 'enemy')

ALPHA_CORE = 40      # 「實體」的 alpha 門檻（避開輝光）
                     # 實測：40 就把兩張稿都切成五五六六塊且框不相疊；
                     # 96 反而把半透明的翅切掉、一隻裂成好幾塊。
MIN_PX = 3000        # 小於這個面積的區塊視為雜點
PAD = 26             # 外框往外放，取回輝光
MIN_BG = 25          # 清棋盤時，候選區塊小於此面積就當成船身高光保留
MAXDIM = 512         # 輸出長邊上限：螢幕上最大約 200px，再降 0.6 倍緩衝，512 綽綽有餘
QUALITY = 88         # webp 品質。⚙ 這是飛行開場就要載的東西，原尺寸 PNG 共 4.3MB，
                     #   會把開場拖長（同舵輪那組的考量：1.4MB → 70/48KB）。

def dealpha_checker(im):
    """稿子若是 RGB（匯出時把透明壓平成棋盤格），把棋盤還原成 alpha。

    ⚠ 不用純顏色門檻：船身上也有接近白的亮部（黃銅高光、甲板反光），
      一律砍掉會在船中間開洞。改成**自邊界洪水填充** —— 背景是連通的、
      船不是，只有從畫布邊緣走得到的淺色中性像素才算背景。
    ⚠ 邊緣那一圈是「船色與棋盤混合」出來的像素，硬切會留一道白邊。
      只在貼著背景的 2px 帶狀區域內，依亮度給部分 alpha 把它化掉。
    """
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    luma = a.mean(axis=2)
    neutral = (a.max(axis=2) - a.min(axis=2)) <= 8      # 棋盤是中性灰
    cand = neutral & (luma >= 232)
    lab, n = ndimage.label(cand)
    sizes = ndimage.sum(cand, lab, range(1, n + 1))
    bg = np.isin(lab, np.where(sizes >= MIN_BG)[0] + 1)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # 邊緣羽化：貼著背景的一圈，依亮度給部分 alpha
    ring = ndimage.binary_dilation(bg, np.ones((5, 5))) & (~bg)
    soft = np.clip((249.0 - luma) / 42.0, 0, 1)
    alpha = np.where(ring, (soft * 255).astype(np.uint8), alpha)
    out = np.dstack([np.asarray(im.convert('RGB')), alpha])
    return Image.fromarray(out, 'RGBA')


def split(name):
    im = Image.open(os.path.join(SRC, name + '.png'))
    if im.mode != 'RGBA':
        im = dealpha_checker(im)
    else:
        im = im.convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    core = a >= ALPHA_CORE
    # ⚠ 不做閉運算：俯視與仰視兩張只隔 3px，5×5 的閉運算會把它們黏成一塊。
    #   alpha>=40 的原始連通區塊本來就是乾淨的六塊。
    lab, n = ndimage.label(core)
    sizes = ndimage.sum(core, lab, range(1, n + 1))

    boxes = []
    for i in np.argsort(sizes)[::-1]:
        if sizes[i] < MIN_PX:
            break
        sl = ndimage.find_objects(lab == i + 1)[0]
        boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, i + 1])

    boxes.sort(key=lambda b: (b[1] // 200, b[0]))     # 由上而下、由左而右
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    print('%s  →  %d 個視角' % (name, len(boxes)))
    src = np.asarray(im).copy()
    biggest = max(max(b[2]-b[0], b[3]-b[1]) for b in boxes) + PAD*2
    scale = min(1.0, float(MAXDIM) / biggest)
    for k, (x0, y0, x1, y1, lb) in enumerate(boxes):
        x0 = max(0, x0 - PAD); y0 = max(0, y0 - PAD)
        x1 = min(im.width, x1 + PAD); y1 = min(im.height, y1 + PAD)
        cut = src[y0:y1, x0:x1].copy()
        # 只保留屬於這個視角的像素：外框放大後可能框進隔壁視角的一角。
        own = ndimage.binary_dilation(lab[y0:y1, x0:x1] == lb, np.ones((PAD * 2 + 1, PAD * 2 + 1)))
        cut[:, :, 3] = np.where(own, cut[:, :, 3], 0)
        out = Image.fromarray(cut, 'RGBA')
        # ⚠ 全張共用同一個縮放係數：各視角自己縮到 MAXDIM 的話，
        #   彼此的相對尺寸就跑掉了 —— 剛體怪要依朝向在視角之間換圖，
        #   比例尺不一致會讓船在轉向時忽大忽小。
        w2, h2 = int(round((x1 - x0) * scale)), int(round((y1 - y0) * scale))
        if (w2, h2) != out.size:
            out = out.resize((max(1, w2), max(1, h2)), Image.LANCZOS)
        out.save(os.path.join(d, 'view_%d.webp' % k), quality=QUALITY, method=6)
        print('   view_%d  %4dx%-4d  @ (%d,%d)' % (k, x1 - x0, y1 - y0, x0, y0))

for n in ['FLM_CENTIPI', 'FLM_Serpent', 'FLH_Pirate']:
    split(n)


# ── 補充稿:斜方位圖 ────────────────────────────────────────────
# 六視圖只給了正／背／左／右四個水平方位,間隔 90°。剛體怪靠換圖表現轉向,
# 90° 一跳太粗,只能靠橫向收縮(index.html 的 squash)硬撐中間形。
# 補充稿 viewex.png 多給兩個斜方位,把間隔降到 ~45°。
#
# ⚠ 補充稿與六視圖**不是同一台相機**:六視圖的縮放係數由那張稿自己算,
#   補充稿得另外正規化,否則轉向換圖時船會忽大忽小。
#
# 正規化用**桅高**不用船長:繞垂直軸轉一圈,船長的投影長度隨方位角變
# (∝ sinθ),桅高不變 —— 桅高才是跨方位的不變量。
# 反過來,量出來的寬度就成了方位角的量尺:sinθ = 寬 / 側視寬。
# 實測(見下方 print):兩張是 53.6° 與 141.6°,**不是**原先以為的 45°／135°。
# 這也解釋了先前「寬度說兩張差 30%、高度說只差 4%」的矛盾 ——
# 兩張其實同一台相機,只是方位角不對稱。
EXTRA = {
    'FLH_Pirate': {
        'sheet': 'viewex.png',      # 放在 flight/enemy/<名稱>/ 下(不在 resources/)
        'ref':   'view_0.webp',     # 尺度與方位的基準:側視,θ=90°
        'out':   ['view_6.webp',    # 斜前(與 view_0 同一側:船首朝左)
                  'view_7.webp'],   # 斜後(與 view_1 同一側:船首朝右)
    },
}
PAD_OUT = 16     # 輸出空間的透明邊(留給輝光)。對稱補,不夾制 ——
                 # 夾到畫布邊會讓補邊變不對稱,船在換圖時就會上下跳一下。


def core_box(alpha):
    ys, xs = np.where(alpha >= ALPHA_CORE)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def split_extra(name):
    J = EXTRA.get(name)
    if not J:
        return
    d = os.path.join(OUT, name)
    im = Image.open(os.path.join(d, J['sheet'])).convert('RGBA')
    a = np.asarray(im)
    lab, n = ndimage.label(a[:, :, 3] >= ALPHA_CORE)
    sizes = ndimage.sum(a[:, :, 3] >= ALPHA_CORE, lab, range(1, n + 1))
    blobs = [i + 1 for i in np.argsort(sizes)[::-1] if sizes[i] >= MIN_PX]
    if len(blobs) != len(J['out']):
        print('%s/%s  ⚠ 找到 %d 塊,預期 %d 塊' % (name, J['sheet'], len(blobs), len(J['out'])))
        return

    cuts = []
    for lb in blobs:
        sl = ndimage.find_objects(lab == lb)[0]
        x0, y0, x1, y1 = sl[1].start, sl[0].start, sl[1].stop, sl[0].stop
        cut = a[y0:y1, x0:x1].copy()
        # 外框可能框進隔壁視角的一角:只留屬於這塊的像素(連同它自己的輝光)
        own = ndimage.binary_dilation(lab[y0:y1, x0:x1] == lb, np.ones((PAD * 2 + 1, PAD * 2 + 1)))
        cut[:, :, 3] = np.where(own, cut[:, :, 3], 0)
        cuts.append((x0, cut))
    cuts.sort(key=lambda c: c[0])           # 由左而右＝斜前、斜後(稿面排法)
    cuts = [c[1] for c in cuts]

    ref = np.asarray(Image.open(os.path.join(d, J['ref'])).convert('RGBA'))
    rx0, ry0, rx1, ry1 = core_box(ref[:, :, 3])
    refW, refH = rx1 - rx0, ry1 - ry0

    boxes = [core_box(c[:, :, 3]) for c in cuts]
    hs = [b[3] - b[1] for b in boxes]
    k = float(refH) / (sum(hs) / float(len(hs)))     # 共用一個縮放係數(同一台相機)
    print('%s  補充稿 %d 塊,尺度 k=%.4f(基準 %s 桅高 %dpx)' % (name, len(cuts), k, J['ref'], refH))

    for i, (cut, box) in enumerate(zip(cuts, boxes)):
        cx0, cy0, cx1, cy1 = box
        o = Image.fromarray(cut[cy0:cy1, cx0:cx1], 'RGBA')
        w2 = max(1, int(round(o.width * k)))
        h2 = max(1, int(round(o.height * k)))
        o = o.resize((w2, h2), Image.LANCZOS)
        pad = Image.new('RGBA', (w2 + PAD_OUT * 2, h2 + PAD_OUT * 2), (0, 0, 0, 0))
        pad.paste(o, (PAD_OUT, PAD_OUT))
        pad.save(os.path.join(d, J['out'][i]), quality=QUALITY, method=6)
        th = math.degrees(math.asin(min(1.0, w2 / float(refW))))
        if i:                                  # 斜後:sinθ 的另一解
            th = 180.0 - th
        print('   %s  %dx%-4d  方位角 theta=%.1f 度  (寬 %d / 側視寬 %d)'
              % (J['out'][i], pad.width, pad.height, th, w2, refW))


for n in ['FLH_Pirate']:
    split_extra(n)

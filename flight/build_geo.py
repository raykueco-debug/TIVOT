# -*- coding: utf-8 -*-
"""
地貌細節貼圖（林草）→ 可平鋪的小圖
------------------------------------------------------------------
輸入：flight/_src/geo/*.png（美術給的俯視樹冠圖，任意尺寸、不必無縫）
輸出：flight/geo/<name>.webp（邊長 2 的次方、無縫、去掉大尺度明暗）

為什麼要有這一步（三件事，缺一不可）：

1. **去大尺度明暗**。原圖左下亮、右上暗這種緩慢漂移，平鋪之後會變成一格一格的
   方塊感 —— 而且比接縫更醒目，因為它的週期正好是貼圖的週期。作法是除以自己的
   大半徑模糊再乘回原本的均值：保留樹冠的高頻，壓平照明的低頻。
   ⚠ 這一步要在接縫處理**之前**做，不然是拿有漸層的兩邊去對接。

2. **接縫**。用重疊交叉淡入：輸出邊長取 W−m，最左邊 m 像素與「右邊界外」那段
   （也就是原圖的最右 m 像素）依斜坡混合。平鋪後 T[0] 左邊接的是 T[Wt−1]，
   兩者在原圖裡本來就相鄰 → 連續。
   ⚠ 不用鏡射法：鏡射一定無縫，但會產生對稱的萬花筒紋路，在低對比細節層上
     反而比接縫更容易被眼睛抓到。樹冠是隨機性紋理，交叉淡入這種最簡單的作法
     剛好完全適用。

3. **邊長 2 的次方**。runtime 取樣要用 `&` 遮罩（跟雲的貼圖同一套），
   不是 2 的次方就得改成除法或取模——那是每幀十七萬次的內迴圈，付不起。

⚠ 色調不在這裡定。這是**細節層**，實際顏色由地圖底色決定（相乘），
  所以這裡只輸出「相對於自身均值的起伏」，均值本身另外印出來給 runtime 參考。
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '_src', 'geo')
DST = os.path.join(HERE, 'geo')

SIZE = 256          # 輸出邊長（2 的次方）。256 世界單位一塊時＝1 texel/世界單位
BLEND = 0.16        # 交叉淡入的邊寬（佔原圖寬的比例）
FLATTEN_R = 0.14    # 去明暗的模糊半徑（佔原圖寬的比例）
QUALITY = 92

JOBS = [
    {'src': 'forest_dark.png',  'dst': 'forest_dark.webp'},
    {'src': 'forest_light.png', 'dst': 'forest_light.webp'},
    {'src': 'rock_grey.png',    'dst': 'rock_grey.webp'},
    {'src': 'rock_brown.png',   'dst': 'rock_brown.webp'},
    {'src': 'gravel_dark.png',  'dst': 'gravel_dark.webp'},
    {'src': 'gravel_light.png', 'dst': 'gravel_light.webp'},
    {'src': 'waste_brown.png',  'dst': 'waste_brown.webp'},
    {'src': 'snow.png',         'dst': 'snow.webp'},
    {'src': 'water_dark.png',   'dst': 'water_dark.webp'},
    {'src': 'water_light.png',  'dst': 'water_light.webp'},
]


def flatten_light(a):
    """除以自己的大半徑模糊 → 去掉照明的低頻，保留樹冠的高頻。"""
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    r = max(2.0, a.shape[1] * FLATTEN_R)
    lo = np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
    lo = np.maximum(lo, 1.0)
    mean = a.reshape(-1, 3).mean(axis=0)
    return np.clip(a / lo * mean, 0, 255)


def make_tileable(a, m):
    """重疊交叉淡入。回傳邊長 (W-m, H-m) 的無縫圖。"""
    H, W = a.shape[0], a.shape[1]
    # 橫向
    t = np.linspace(0, 1, m, dtype=np.float32)
    t = (t * t * (3 - 2 * t))[None, :, None]          # smoothstep，線性斜坡會留下一條淡淡的帶
    Wt = W - m
    out = a[:, :Wt].copy()
    out[:, :m] = a[:, :m] * t + a[:, Wt:Wt + m] * (1 - t)
    # 縱向（對已經橫向處理過的圖再做一次）
    Ht = H - m
    t2 = np.linspace(0, 1, m, dtype=np.float32)
    t2 = (t2 * t2 * (3 - 2 * t2))[:, None, None]
    out2 = out[:Ht].copy()
    out2[:m] = out[:m] * t2 + out[Ht:Ht + m] * (1 - t2)
    return out2


def seam_error(a):
    """平鋪後接縫兩側的平均色差（0＝完美）。拿來當驗收數字，不是靠眼睛看。"""
    lr = np.abs(a[:, 0] - a[:, -1]).mean()
    tb = np.abs(a[0, :] - a[-1, :]).mean()
    return lr, tb


os.makedirs(DST, exist_ok=True)
for J in JOBS:
    p = os.path.join(SRC, J['src'])
    if not os.path.exists(p):
        print('跳過（找不到）：', p)
        continue
    im = Image.open(p).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    # 先裁成正方形（取中央）
    H, W = a.shape[0], a.shape[1]
    s = min(H, W)
    a = a[(H - s) // 2:(H - s) // 2 + s, (W - s) // 2:(W - s) // 2 + s]

    before = seam_error(a)
    a = flatten_light(a)
    a = make_tileable(a, int(round(s * BLEND)))
    after = seam_error(a)

    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    out = out.resize((SIZE, SIZE), Image.LANCZOS)
    out.save(os.path.join(DST, J['dst']), quality=QUALITY, method=6)

    arr = np.asarray(out).astype(np.float32)
    mean = arr.reshape(-1, 3).mean(axis=0)
    lum = (arr * np.array([0.299, 0.587, 0.114])).sum(axis=2)
    print('%-18s %dx%d → %s %dx%d' % (J['src'], W, H, J['dst'], SIZE, SIZE))
    print('   接縫色差 %.1f/%.1f → %.1f/%.1f（左右/上下）'
          % (before[0], before[1], after[0], after[1]))
    print('   均值 RGB %.0f,%.0f,%.0f   亮度 std %.1f（細節層的對比）'
          % (mean[0], mean[1], mean[2], lum.std()))

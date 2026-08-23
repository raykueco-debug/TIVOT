#!/usr/bin/env python3
"""Kerberos.png（門）→ 開門演出用的分件素材。

⚠ 來源是**一張合成好的平面圖**：853×1844、不透明、沒有圖層。紋章與四支箭都是
  「畫死在門上」的，所以這裡做的是**切割＋補洞**，補出來的凹槽是合成的，不是美術畫的。
  哪天拿到分層檔，直接換掉輸出檔即可，座標常數不用動。

輸出（resources/vfx/）：
  kerberos_door.webp    門（紋章挖掉、補成凹槽）——開門時左右各半用 background-position 切
  kerberos_crest.webp   紋章圓盤（四支箭已挖掉補暗）——浮起＋旋轉 180°
  kerberos_arm_{n,e,s,w}.webp  四支箭 —— 向外彈開

幾何常數由 tools/ 目錄下的網格圖量出（見 HANDOFF）。改圖要重量。
"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, os, json

# ⚠ 原圖放 _originals（不入版控，同專案慣例）——遊戲載的是下面切出來的 webp。
#   Ray 手上有原圖；要重切就把它放回這個路徑再跑。
SRC = 'resources/_originals/background/Kerberos.png'
OUT = 'resources/vfx'
CX, CY = 426, 383          # 紋章中心
R_DISC = 302               # 圓盤外緣（羽化到 R_DISC+8）
FEATHER = 10
ARMS = {                   # 四支箭的框（左,上,右,下）
    'n': (390,  92, 464, 252),
    's': (390, 536, 464, 696),
    'w': (176, 326, 314, 428),
    'e': (538, 326, 676, 428),
}

def bronze_alpha(rgb):
    """銅色遮罩：R 明顯高於 B 的就是金屬件，暗石材是背景。
    ⚠ 這是**顏色**判定不是形狀判定 —— 箭上的暗部會被挖掉一點，
      所以再做一次膨脹＋模糊把輪廓補回來。"""
    a = rgb.astype(np.int16)
    warm = (a[:,:,0] - a[:,:,2]).clip(0, None)
    lum  = a.mean(axis=2)
    m = np.clip((warm - 12) / 26.0, 0, 1) * np.clip((lum - 34) / 30.0, 0, 1)
    im = Image.fromarray((m*255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
    return np.asarray(im).astype(np.float32)/255.0

def radial_mask(w, h, cx, cy, r, feather):
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx-cx)**2 + (yy-cy)**2)
    return np.clip((r + feather - d) / feather, 0, 1)

def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(SRC).convert('RGB')
    W, H = src.size
    a = np.asarray(src)

    # 石材底色：由乾淨的一塊門面取樣（避開所有金屬件）
    stone = a[1150:1350, 200:320].reshape(-1,3).mean(axis=0)

    # ── 1. 四支箭 ──────────────────────────────────────────────
    for k,(x0,y0,x1,y1) in ARMS.items():
        sub = a[y0:y1, x0:x1]
        al  = bronze_alpha(sub)
        rgba = np.dstack([sub, (al*255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(f'{OUT}/kerberos_arm_{k}.webp', quality=92, method=6)

    # ── 2. 紋章圓盤（挖掉四支箭，補成暗凹槽）───────────────────
    # ⚠ 取景要**含住所有箭的框**：下方那支箭比圓盤外緣還低 1px，只按半徑取會 off-by-one
    d0 = min([CX-R_DISC-FEATHER] + [b[0] for b in ARMS.values()])
    d1 = min([CY-R_DISC-FEATHER] + [b[1] for b in ARMS.values()])
    d2 = max([CX+R_DISC+FEATHER] + [b[2] for b in ARMS.values()])
    d3 = max([CY+R_DISC+FEATHER] + [b[3] for b in ARMS.values()])
    disc = a[d1:d3, d0:d2].astype(np.float32)
    dh, dw = disc.shape[:2]
    # ⚠⚠ **圓盤不挖箭**（試過，失敗）。四支箭不是獨立零件 —— 上下那兩支是同一支
    #   十字架的兩端，貫穿整個紋章；把它們挖掉會連十字一起斷，遮罩膨脹之後更是把
    #   周圍的浮雕一起吃掉，看起來像紋章壞了而不是「箭飛出去了」。
    #   改成：飛出去的是**複製品**（下面的 arm 檔），圓盤保持完整。
    #   「彈開」讀起來是「從四個尖端射出去的東西」，不是「紋章少了四塊」——
    #   而且圓盤完整，浮起旋轉那一段才成立。
    dm = radial_mask(dw, dh, CX-d0, CY-d1, R_DISC, FEATHER)
    Image.fromarray(np.dstack([disc.astype(np.uint8), (dm*255).astype(np.uint8)]), 'RGBA') \
         .save(f'{OUT}/kerberos_crest.webp', quality=92, method=6)

    # ── 3. 門（整個紋章挖掉，補成凹槽）─────────────────────────
    door = a.astype(np.float32)
    full = radial_mask(W, H, CX, CY, R_DISC, FEATHER)[:,:,None]
    # 凹槽＝把該區壓暗並往石材色靠，再加一圈內陰影讓它有深度
    socket = door*0.22 + stone*0.30
    rim = np.clip((np.sqrt((np.mgrid[0:H,0:W][1]-CX)**2 + (np.mgrid[0:H,0:W][0]-CY)**2) - (R_DISC-26))/26.0, 0, 1)
    socket = socket * (0.55 + 0.45*rim)[:,:,None]        # 邊緣稍亮＝內壁受光
    door = door*(1-full) + socket*full
    Image.fromarray(door.astype(np.uint8), 'RGB') \
         .save(f'{OUT}/kerberos_door.webp', quality=88, method=6)

    # ⚠ 給前端的是**每一件在門上的實際框**（左/上/寬/高，都是門圖的比例）——
    #   不是「中心＋半徑」。圓盤的裁切框是「圓＋四支箭」的聯集，不等於圓的外接框，
    #   用中心＋半徑去擺會偏。前端照這個框放，位置就一定對得回原圖。
    meta = {'w':W, 'h':H, 'seam':0.506,
            'crest': {'x':d0/W, 'y':d1/H, 'w':(d2-d0)/W, 'h':(d3-d1)/H},
            'arms':  {k:{'x':b[0]/W, 'y':b[1]/H, 'w':(b[2]-b[0])/W, 'h':(b[3]-b[1])/H}
                      for k,b in ARMS.items()}}
    print(json.dumps(meta, indent=1))

main()

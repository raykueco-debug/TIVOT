#!/usr/bin/env python3
"""Kerberos 之門 → 開門演出用的分件素材。

素材來源（`resources/_originals/kerberos/`，不入版控）：
  door.png    Ray 畫的門，**紋章已挖掉**（853×1844，不透明）
  crest.png   Ray 去背的紋章圓盤（1226×1283，含 alpha）
  arm.png     Ray 去背的箭（1214×1295，含 alpha）
  Kerberos.png（在 ../background/）＝最早那張「紋章還在門上」的合成圖，
              只拿來當**對位基準**（用它算 crest 貼在門上的位置與大小），不輸出。

⚠⚠ Ray 的三個檔**各自是各自的畫布尺寸**，不是同一張門的座標系 ——
   所以位置與縮放是**對位算出來的**（見 CREST_BOX，由 align 模式重算）。
   要一勞永逸的話請 Ray 把每一件都輸出成**與門同尺寸（853×1844）的透明圖**，
   那樣全部貼 (0,0) 就對，不必再猜。

輸出（resources/vfx/）：
  kerberos_door.webp / kerberos_crest.webp / kerberos_arm_{n,e,s,w}.webp

用法：  python3 tools/kerberos_cut.py          # 輸出素材
       python3 tools/kerberos_cut.py align    # 重算 crest 在門上的框
"""
from PIL import Image, ImageFilter
import numpy as np, os, sys, json

SRC   = 'resources/_originals/kerberos'
REF   = 'resources/_originals/background/Kerberos.png'   # 對位基準（紋章還在門上）
OUT   = 'resources/vfx'
DOOR_W, DOOR_H = 853, 1844

# 紋章貼在門上的框（門像素）。由 align 模式算出來的：score 0.173。
CREST_BOX = (136, 80, 576, 603)          # x, y, w, h

# 四支箭：由原圖裁出來的框（門像素）。⚠ Ray 的 arm.png 目前**沒有對位資訊**
#   （見上方的警告），所以這四片還是從原圖切的。等 Ray 給同尺寸的圖就換掉。
ARMS = { 'n': (390,  92, 464, 252), 's': (390, 536, 464, 696),
         'w': (176, 326, 314, 428), 'e': (538, 326, 676, 428) }

def bronze_alpha(rgb):
    """銅色遮罩：R 明顯高於 B 的是金屬件，暗石材是背景。
    ⚠ 顏色判定不是形狀判定 —— 暗部會被挖掉一點，再膨脹＋模糊把輪廓補回來。"""
    a = rgb.astype(np.int16)
    warm = (a[:,:,0] - a[:,:,2]).clip(0, None)
    lum  = a.mean(axis=2)
    m = np.clip((warm - 12) / 26.0, 0, 1) * np.clip((lum - 34) / 30.0, 0, 1)
    im = Image.fromarray((m*255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
    return np.asarray(im).astype(np.float32)/255.0

def align():
    """把 crest.png 疊到 Kerberos.png 上，掃縮放與位移取邊緣相關性最大的那組。
    ⚠ 只對 crest 有用：箭太細長，在滿是浮雕的門上會匹配到雜訊（實測收斂到最小尺寸）。"""
    def edges(a):
        a=a.astype(np.float32)
        return np.abs(np.diff(a,axis=1,prepend=a[:,:1])) + np.abs(np.diff(a,axis=0,prepend=a[:1,:]))
    ref = Image.open(REF).convert('L')
    cr  = Image.open(f'{SRC}/crest.png').convert('RGBA')
    K=4
    O=np.asarray(ref.resize((ref.width//K, ref.height//K), Image.LANCZOS))
    Oe=edges(O); Oe/=(Oe.max()+1e-6)
    best=None
    for w in range(480, 760, 8):
        h=round(w*cr.height/cr.width)
        c=cr.resize((max(1,w//K), max(1,h//K)), Image.LANCZOS)
        ca=np.asarray(c); m=ca[:,:,3].astype(np.float32)/255.0
        ce=edges(np.asarray(c.convert('L')))*m; ce/=(ce.max()+1e-6)
        ch,cw=ce.shape
        if ch>=Oe.shape[0] or cw>=Oe.shape[1]: continue
        for y in range(0, min(260, Oe.shape[0]-ch), 2):
            for x in range(0, Oe.shape[1]-cw, 2):
                sc=float((Oe[y:y+ch,x:x+cw]*ce).sum()/(ce.sum()+1e-6))
                if best is None or sc>best[0]: best=(sc,w,h,x*K,y*K)
    print('CREST_BOX =', (best[3],best[4],best[1],best[2]), ' score', round(best[0],4))

def main():
    os.makedirs(OUT, exist_ok=True)
    # ── 門：Ray 已經把紋章挖掉了，直接轉檔（不再合成凹槽）──────────────
    door = Image.open(f'{SRC}/door.png').convert('RGB')
    assert door.size == (DOOR_W, DOOR_H), f'門的尺寸變了：{door.size}'
    door.save(f'{OUT}/kerberos_door.webp', quality=88, method=6)

    # ── 紋章：縮到門上的實際大小再輸出（前端就不必再換算）────────────
    cx, cy, cw, ch = CREST_BOX
    crest = Image.open(f'{SRC}/crest.png').convert('RGBA').resize((cw, ch), Image.LANCZOS)
    crest.save(f'{OUT}/kerberos_crest.webp', quality=92, method=6)

    # ── 四支箭：暫時仍由原圖切（Ray 的 arm.png 缺對位資訊）──────────
    ref = np.asarray(Image.open(REF).convert('RGB'))
    for k,(x0,y0,x1,y1) in ARMS.items():
        sub = ref[y0:y1, x0:x1]
        al  = bronze_alpha(sub)
        Image.fromarray(np.dstack([sub,(al*255).astype(np.uint8)]),'RGBA') \
             .save(f'{OUT}/kerberos_arm_{k}.webp', quality=92, method=6)

    print(json.dumps({'w':DOOR_W,'h':DOOR_H,'seam':0.506,
        'crest':{'x':cx/DOOR_W,'y':cy/DOOR_H,'w':cw/DOOR_W,'h':ch/DOOR_H},
        'arms':{k:{'x':b[0]/DOOR_W,'y':b[1]/DOOR_H,
                   'w':(b[2]-b[0])/DOOR_W,'h':(b[3]-b[1])/DOOR_H} for k,b in ARMS.items()}}, indent=1))

if __name__=='__main__':
    align() if len(sys.argv)>1 and sys.argv[1]=='align' else main()

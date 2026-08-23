#!/usr/bin/env python3
"""Kerberos 之門 → 開門演出用的分件素材（ver -331 起用 Ray 畫的分層）。

來源（`resources/_originals/kerberos/`，Ray 提供，不入版控）：
  Kerberos_All.png    完整的門（只當**對位基準**，不輸出）
  Kerberos_base.png   門本體，紋章整組拿掉（853×1844，不透明）
  Kerberos_plate.png  圓盤（不含箭與鉚釘）
  Kerberos_arrow.png  箭（一支，四個方向靠旋轉）
  Kerberos_revet.png  鉚釘（一顆，四個方向靠旋轉）
  Kerberos_top.png    楣（槍棺頂端的橫飾條）

輸出（`resources/vfx/`）：door / plate / arrow / rivet 四個 webp ＋ 一份幾何 JSON。

⚠⚠ **分件各自是各自的畫布尺寸**，不是門的座標系。所以位置與大小是算出來的：
   拿 Kerberos_All 當基準做邊緣相關性搜尋（`python3 tools/kerberos_cut.py align`）。
   · 圓盤：搜出來很穩（score 0.165，疊上去逐一吻合）→ PLATE_BOX。
   · 箭：限制在中軸那一條窄帶才搜得到（score 0.162）→ ARROW_TOP。
     ⚠ 不限制範圍的話它會收斂到最小尺寸、落在花押中間 —— 那是雜訊不是解。
   · 鉚釘：**放棄搜尋**，改用幾何擺位（見下）。46px 的東西在滿是浮雕的門上
     相關性全是雜訊（四個方向搜出來的尺寸與位置互相矛盾）。它在畫面上只有 22px、
     彈開 0.4 秒就沒了，對稱擺位比「搜出來的位置」更可信也更好看。

⚠ 箭與鉚釘都以**圓盤中心**為原點、用半徑擺位（四向對稱），所以只要 PLATE_BOX 對，
  它們就一定對稱。改圖只要重跑 align 更新 PLATE_BOX 與 ARROW_TOP。
"""
from PIL import Image
import numpy as np, os, sys, json

# ⚠ 原始分層放 _originals（不入版控，同專案慣例）—— 那幾張加起來 8MB 多，
#   不該上線。遊戲載的是下面切出來的 webp（五件加起來約 480KB）。
SRC, OUT = 'resources/_originals/kerberos', 'resources/vfx'
DOOR_W, DOOR_H = 853, 1844

PLATE_BOX = (96, 76, 666, 624)      # x, y, w, h（門像素）
ARROW_TOP = (395, 76, 66, 185)      # 上方那支箭的框（門像素）
RIVET_WH  = (46, 49)                # 鉚釘原尺寸（已是門像素）
RIVET_R   = 0.90                    # 鉚釘中心的半徑，佔圓盤半徑的比例

def geom():
    """回傳每一件的**中心點**（門座標比例）＋**未旋轉**的尺寸＋旋轉角。

    ⚠ 給中心不給左上角、尺寸是**未旋轉**的：前端用 CSS `rotate()` 轉，元素繞自己的
      中心轉 —— 只要中心擺對，轉幾度都落在該落的地方。若改成「左上角＋已旋轉的寬高」，
      前端就得把旋轉再做一次（等於轉兩次）。
    ⚠ rot 決定的不只是外觀，也決定**彈開的方向**：CSS 是先 rotate 再 translateY(−x)
      ＝「往自己的上方推」。要往外推，rot 必須讓自己的上方指向外側；順時針轉，
      (0,−1) 轉 90° 變成 (1,0)＝右 → 北 0／東 90／南 180／西 270。
    ⚠ 箭與鉚釘都以**圓盤中心**為原點按半徑擺（四向對稱），所以只要 PLATE_BOX 對，
      它們就一定對稱 —— 不必逐顆去搜（46px 的東西在滿是浮雕的門上搜出來全是雜訊）。
    """
    px, py, pw, ph = PLATE_BOX
    cx, cy = px + pw/2, py + ph/2
    ax, ay, aw, ah = ARROW_TOP
    rv = cy - (ay + ah/2)            # 箭中心到盤心的距離（縱向）
    rh = rv * (pw/ph)                # 橫向按圓盤的長寬比放大（盤不是正圓：666×624）
    ROT = {'n':0, 'e':90, 's':180, 'w':270}
    off = {'n':(0,-1), 's':(0,1), 'w':(-1,0), 'e':(1,0)}
    arrows = {k: {'cx':cx+off[k][0]*rh, 'cy':cy+off[k][1]*rv, 'w':aw, 'h':ah, 'rot':ROT[k]}
              for k in 'nesw'}
    rw, rh2 = RIVET_WH
    kv, kh = ph/2*RIVET_R, pw/2*RIVET_R
    rivets = {k: {'cx':cx+off[k][0]*kh, 'cy':cy+off[k][1]*kv, 'w':rw, 'h':rh2, 'rot':ROT[k]}
              for k in 'nesw'}
    return cx, cy, arrows, rivets

def align():
    """邊緣相關性搜尋。⚠ 只對夠大、夠有特徵的件有意義（圓盤、限制範圍後的箭）。"""
    def edges(a):
        a=a.astype(np.float32)
        return np.abs(np.diff(a,axis=1,prepend=a[:,:1]))+np.abs(np.diff(a,axis=0,prepend=a[:1,:]))
    ref=np.asarray(Image.open(f'{SRC}/Kerberos_All.png').convert('L'))
    Re=edges(ref); Re/=(Re.max()+1e-6)
    def run(im, wrange, xr, yr):
        best=None
        for w in wrange:
            h=max(1,round(w*im.height/im.width))
            c=im.resize((w,h), Image.LANCZOS)
            m=np.asarray(c)[:,:,3].astype(np.float32)/255.0
            ce=edges(np.asarray(c.convert('L')))*m
            if ce.sum()<1: continue
            ce/=(ce.max()+1e-6)
            for y in range(yr[0], min(yr[1], ref.shape[0]-h)):
                for x in range(xr[0], min(xr[1], ref.shape[1]-w)):
                    sc=float((Re[y:y+h,x:x+w]*ce).sum()/(ce.sum()+1e-6))
                    if best is None or sc>best[0]: best=(round(sc,4),x,y,w,h)
            
        return best
    pl=Image.open(f'{SRC}/Kerberos_plate.png').convert('RGBA')
    print('PLATE_BOX =', run(pl, range(480,800,6), (0,DOOR_W), (0,260))[1:])
    ar=Image.open(f'{SRC}/Kerberos_arrow.png').convert('RGBA')
    ar=ar.crop(ar.getbbox())
    print('ARROW_TOP =', run(ar, range(46,110,2), (370,486), (20,300))[1:])

def main():
    os.makedirs(OUT, exist_ok=True)
    door = Image.open(f'{SRC}/Kerberos_base.png').convert('RGB')
    assert door.size==(DOOR_W,DOOR_H), f'門的尺寸變了：{door.size}'
    door.save(f'{OUT}/kerberos_door.webp', quality=88, method=6)

    px,py,pw,ph = PLATE_BOX
    Image.open(f'{SRC}/Kerberos_plate.png').convert('RGBA').resize((pw,ph), Image.LANCZOS) \
         .save(f'{OUT}/kerberos_plate.webp', quality=92, method=6)

    # 箭與鉚釘：只輸出「朝上」那一版，四個方向由前端 CSS rotate（省檔案、也保證對稱）
    ar=Image.open(f'{SRC}/Kerberos_arrow.png').convert('RGBA'); ar=ar.crop(ar.getbbox())
    ar.resize((ARROW_TOP[2], ARROW_TOP[3]), Image.LANCZOS) \
      .save(f'{OUT}/kerberos_arrow.webp', quality=92, method=6)
    Image.open(f'{SRC}/Kerberos_revet.png').convert('RGBA') \
         .save(f'{OUT}/kerberos_rivet.webp', quality=92, method=6)

    # 楣（Kerberos_top）：蓋在槍棺頂端的橫飾條。裁掉四周的空白只留內容，
    # 前端才好「以自己的下緣貼齊門的上緣」對齊。
    top = Image.open(f'{SRC}/Kerberos_top.png').convert('RGBA')
    top = top.crop(top.getbbox())
    top.save(f'{OUT}/kerberos_top.webp', quality=92, method=6)

    cx,cy,arrows,rivets = geom()
    f=lambda v,d: round(v/d, 5)
    pack=lambda d:{k:{'cx':f(v['cx'],DOOR_W),'cy':f(v['cy'],DOOR_H),
                      'w':f(v['w'],DOOR_W),'h':f(v['h'],DOOR_H),'rot':v['rot']} for k,v in d.items()}
    meta={'w':DOOR_W,'h':DOOR_H,'seam':0.506,
          'plate':{'x':f(px,DOOR_W),'y':f(py,DOOR_H),'w':f(pw,DOOR_W),'h':f(ph,DOOR_H)},
          'top':{'ar':round(top.height/top.width,5)},
          'arrows':pack(arrows), 'rivets':pack(rivets)}
    print(json.dumps(meta, separators=(',',':')))

    # 驗收圖：base ＋ 全部零件，應該長得跟 Kerberos_All 一樣
    if 'check' in sys.argv:
        comp=door.copy()
        for k,v in arrows.items():
            im=ar.resize((round(v['w']),round(v['h'])), Image.LANCZOS)
            im=im.rotate(-v['rot'], expand=True, resample=Image.BICUBIC)
            comp.paste(im,(round(v['cx']-im.width/2),round(v['cy']-im.height/2)),im)
        pl=Image.open(f'{SRC}/Kerberos_plate.png').convert('RGBA').resize((pw,ph), Image.LANCZOS)
        comp.paste(pl,(px,py),pl)
        rv=Image.open(f'{SRC}/Kerberos_revet.png').convert('RGBA')
        for k,v in rivets.items():
            im=rv.rotate(-v['rot'], expand=True, resample=Image.BICUBIC)
            comp.paste(im,(round(v['cx']-im.width/2),round(v['cy']-im.height/2)),im)
        comp.crop((0,0,853,900)).resize((427,450)).save('/tmp/kerb_check.png')
        print('check → /tmp/kerb_check.png')

if __name__=='__main__':
    align() if 'align' in sys.argv else main()

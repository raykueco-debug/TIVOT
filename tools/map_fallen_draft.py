#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/map_fallen_draft.py —— 坍倒石製遺構的拓樸草圖（提案階段）

    python3 tools/map_fallen_draft.py

⚠⚠ 這是**提案階段**的產生器：拓樸還沒搬進 `script/town.js`。
   搬進去之後由 `tools/map_layout.py` 接手（它直接讀 town.js，圖與遊戲不可能走鐘），
   **這一支要回收掉** —— 同一個拓樸不留兩份（鐵律 7）。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

FONT='/System/Library/Fonts/PingFang.ttc'
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id → (欄, 列, 中文名, 種類)   kind: end=端末 / pass=通道 / hub=岔口 / gate=跨圖出口
NODES={
  'out'     :(2,5,'原野\n（跨圖）','gate'),
  'entry'   :(2,4,'崩塌門廊','end'),
  'causeway':(2,3,'斷柱道','pass'),
  'fork'    :(2,2,'傾石岔口','hub'),
  'basin'   :(0,2,'沉水石坑','end'),
  'altar'   :(2,1,'祭壇','end'),
}
# (a, b, a 這一端的方向)  —— 另一端一定是相反方向（憲法 §6.5.4）
EDGES=[('out','entry','up'),('entry','causeway','up'),
       ('causeway','fork','up'),('fork','basin','left'),('fork','altar','up')]

OPP={'up':'down','down':'up','left':'right','right':'left'}
def main():
    # ── 自檢 1：每條邊都得是直線（同欄或同列）
    err=[]
    for a,b,d in EDGES:
        (ca,ra),(cb,rb)=NODES[a][:2],NODES[b][:2]
        if ca!=cb and ra!=rb: err.append('%s–%s 不是直線'%(a,b))
        ok={'left':cb<ca,'right':cb>ca,'up':rb<ra,'down':rb>ra}[d]
        if not ok: err.append('%s.%s→%s：方向與版面不符'%(a,d,b))
    if err: [print('✗',e) for e in err]; sys.exit(1)

    CW,CH,BW,BH=170,120,132,80
    cols=[c for c,_,_,_ in NODES.values()]; rows=[r for _,r,_,_ in NODES.values()]
    cx=lambda c:110+(c-min(cols))*CW; cy=lambda r:80+(r-min(rows))*CH
    W=cx(max(cols))+BW//2+60; H=cy(max(rows))+BH//2+60
    im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
    F=ImageFont.truetype(FONT,24,index=4)

    for a,b,_ in EDGES:
        (ca,ra),(cb,rb)=NODES[a][:2],NODES[b][:2]
        d.line([cx(ca),cy(ra),cx(cb),cy(rb)],fill=(20,20,20),width=5)

    COL={'hub':((232,168,56),(26,18,8)), 'gate':((255,255,255),(20,20,20)),
         'end':((20,20,20),(255,255,255)), 'pass':((90,90,96),(255,255,255))}
    for k,(c,r,nm,kind) in NODES.items():
        bg,fg=COL[kind]
        x,y=cx(c)-BW//2, cy(r)-BH//2
        d.rectangle([x,y,x+BW,y+BH],fill=bg,outline=(20,20,20),width=(3 if kind=='gate' else 0))
        for i,ln in enumerate(nm.split('\n')):
            bb=d.textbbox((0,0),ln,font=F)
            d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+(i-(len(nm.split('\n'))-1)/2)*30-(bb[3]-bb[1])/2-4),
                   ln,font=F,fill=fg)

    deg={}
    for a,b,_ in EDGES: deg[a]=deg.get(a,0)+1; deg[b]=deg.get(b,0)+1
    dst=os.path.join(ROOT,'resources','map','_layout_fallen.png')
    im.save(dst)
    n=len(NODES)-1; e=len(EDGES)-1          # 扣掉跨圖出口那一格與那一條邊
    print('✓ 坍倒石製遺構：%d 格・%d 邊・環數 %d'%(n,e,e-n+1))
    for k,(_,_,nm,kind) in NODES.items():
        if kind!='gate': print('   %-9s %-5s 向數 %d'%(k,nm.replace('\n',''),deg.get(k,0)))
    print('   一直按↑：崩塌門廊 → 斷柱道 → 傾石岔口 → 祭壇（岔口往左是沉水石坑）')
    print('   →',os.path.relpath(dst,ROOT))
main()

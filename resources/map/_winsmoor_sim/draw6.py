import sys; sys.argv=['v6.py','h1','h2','a1','a2','a3','a4']
exec(open('v6.py',encoding='utf8').read().replace("if '--sim' in MY:","if False:"))
from PIL import Image,ImageDraw,ImageFont
alley={frozenset(e) for e in AL}
xs=[p[0] for p in P.values()]; ys=[p[1] for p in P.values()]
SX=52; SY=50; M=100; TOP=90
W=(max(xs)-min(xs))*SX+2*M; H=(max(ys)-min(ys))*SY+2*M+TOP
ox,oy=-min(xs),-min(ys)
XY=lambda k:(M+(P[k][0]+ox)*SX, M+TOP+(P[k][1]+oy)*SY)
im=Image.new('RGB',(W,H),(246,240,226)); dr=ImageDraw.Draw(im)
F=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',19); f2=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',14)
FB=ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc',26)
# 海（南、西）
dr.rectangle([0,XY('oA')[1]+40,W,H],fill=(186,212,228))
def dashed(pts,col,w):
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
        L=((x2-x1)**2+(y2-y1)**2)**.5; n=max(1,int(L//14))
        for i in range(0,n,2):
            a=i/n; b=min(1,(i+1)/n)
            dr.line([(x1+(x2-x1)*a,y1+(y2-y1)*a),(x1+(x2-x1)*b,y1+(y2-y1)*b)],fill=col,width=w)
for (a,d),b in used.items():
    if a>b: continue
    (x1,y1),(x2,y2)=XY(a),XY(b)
    boxes=[XY(k) for k in P if k not in (a,b)]
    def hits(c):
        for (p,q) in [((x1,y1),c),(c,(x2,y2))]:
            for bx,by in boxes:
                if min(p[0],q[0])-54<bx<max(p[0],q[0])+54 and min(p[1],q[1])-26<by<max(p[1],q[1])+26: return True
        return False
    c1=(x2,y1) if d in 'LR' else (x1,y2); c2=(x1,y2) if d in 'LR' else (x2,y1)
    corner=c1 if not hits(c1) or hits(c2) else c2
    if frozenset((a,b)) in alley: dashed([(x1,y1),corner,(x2,y2)],(60,140,90),5)
    else: dr.line([(x1,y1),corner,(x2,y2)],fill=(110,95,80),width=6,joint='curve')
for k,(nm,x,y,ent) in N.items():
    cx,cy=XY(k); w,h=100,48
    fill=(255,250,238); ol=(90,75,60); wd=2
    if k=='C': fill=(250,214,140); ol=(170,40,30); wd=5
    elif ent: ol=(200,40,30); wd=4
    elif len(adj[k])==1: fill=(225,222,215)
    dr.rounded_rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],9,fill=fill,outline=ol,width=wd)
    dr.text((cx,cy-8),nm,font=F,fill=(40,30,20),anchor='mm')
    dr.text((cx,cy+13),f'{k} ·{g.d[k]}'+(f' ▼{ent}' if ent else ''),font=f2,fill=(200,40,30) if ent else (110,95,80),anchor='mm')
dr.text((30,18),'溫斯摩爾港　守城戰拓樸 v5（10-27）　防衛目標＝市政廳　39 格',font=FB,fill=(40,30,20))
dr.text((30,56),'配置照城鎮版（市政廳左上、港務大道→大教堂／中央廣場→上街區、舊港町與碼頭在左下）　紅框＝敵人進入點 13　綠虛線＝小路（主角可走、敵人不走）　灰＝死巷　·數字＝敵人到市政廳步數',font=F,fill=(40,30,20))
im.save(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\map\_layout_winsmoor_siege_v5.png'); print(im.size)

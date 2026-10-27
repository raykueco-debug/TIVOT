exec(open('final_grid.py',encoding='utf8').read().split("if __name__")[0])
from PIL import Image,ImageDraw,ImageFont
g,hs=build()
NAME={
 (5,0):'北門',
 (4,1):'北墓園',(5,1):'北大路',(6,1):'高架橋',
 (3,2):'西北門',(4,2):'法院前',(5,2):'法院前',(6,2):'鐘樓街',
 (2,3):'磨坊口',(4,3):'議會街',(5,3):'議會街',(6,3):'學校',(7,3):'救濟院',(8,3):'東北門',
 (1,4):'西門',(2,4):'西大路',(3,4):'西大路',(4,4):'市政廳後巷',(5,4):'市政廳北庭',(6,4):'修道院',(7,4):'大教堂前',(8,4):'大教堂前',(9,4):'東北郊路',
 (0,5):'西岬砲台',(1,5):'西郊',(3,5):'碼頭路',(4,5):'市政廳西翼',(5,5):'市政廳',(6,5):'港務大道',(7,5):'港務大道',(8,5):'東大路',(9,5):'東大路',(10,5):'東門',
 (1,6):'西南海岸路',(2,6):'碼頭',(3,6):'碼頭',(4,6):'舊港町',(5,6):'舊港町',(6,6):'中央廣場',(7,6):'中央廣場',(8,6):'上街區',(9,6):'東濱路',
 (1,7):'燈塔堤',(2,7):'西碼頭',(3,7):'槍匠街',(6,7):'公會倉庫',(7,7):'餐飲街',(8,7):'雜貨舖',(9,7):'東棧橋',
}
HOLE_NAME={(4,7):'港池',(5,7):'港池',(3,3):'監獄',(7,2):'調車場',(2,5):'運河'}
assert set(NAME)==set(g.adj), set(g.adj)^set(NAME)
# 拆半：同一列相鄰、同名 ⇒ 一張寬圖裁兩格
pairs=[]
for (x,y),n in NAME.items():
    if NAME.get((x+1,y))==n: pairs.append(((x,y),(x+1,y)))
S=150; M=70; TOP=120
Wp=W*S+2*M; Hp=H*S+2*M+TOP
im=Image.new('RGB',(Wp,Hp),(246,240,226)); dr=ImageDraw.Draw(im)
F=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',21); f2=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',15)
FB=ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc',28)
XY=lambda c:(M+c[0]*S+S//2, TOP+M+c[1]*S+S//2)
# 海
dr.rectangle([0,TOP+M+H*S-10,Wp,Hp],fill=(186,212,228)); dr.text((Wp-260,Hp-50),'海（無入口）',font=F,fill=(60,90,120))
for c in HOLE_NAME:
    cx,cy=XY(c)
    col=(186,212,228) if HOLE_NAME[c] in ('港池','運河') else (200,190,170)
    dr.rectangle([cx-S//2+6,cy-S//2+6,cx+S//2-6,cy+S//2-6],fill=col)
    dr.text((cx,cy),HOLE_NAME[c],font=f2,fill=(80,80,90),anchor='mm')
for u in g.adj:
    for v in g.adj[u]:
        if u<v: dr.line([XY(u),XY(v)],fill=(110,95,80),width=6)
ALLEY={'人行橋（跨運河）':((1,5),(3,5)),'監獄旁窄巷':((2,3),(4,3)),'港池渡船':((3,7),(6,7))}
for nm,(a,b) in ALLEY.items():
    (x1,y1),(x2,y2)=XY(a),XY(b); L=x2-x1; n=int(L//16)
    for i in range(0,n,2): dr.line([(x1+L*i/n,y1),(x1+L*min(1,(i+1)/n),y1)],fill=(60,140,90),width=6)
    dr.text(((x1+x2)//2,y1-16),nm,font=f2,fill=(40,110,60),anchor='mm')
for a,b in pairs:
    (x1,y1),(x2,y2)=XY(a),XY(b)
    dr.rounded_rectangle([x1-66,y1-50,x2+66,y2+50],16,outline=(70,110,160),width=4)
for c in g.adj:
    cx,cy=XY(c); w,h=118,66
    fill=(255,250,238); ol=(90,75,60); wd=2
    if c==T: fill=(250,214,140); ol=(170,40,30); wd=6
    elif c in g.entries: ol=(200,40,30); wd=5
    elif len(g.adj[c])==1: fill=(225,222,215)
    dr.rounded_rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],10,fill=fill,outline=ol,width=wd)
    pair=[p for p in pairs if c in p]
    side='' if not pair else ('·西' if pair[0][0]==c else '·東')
    dr.text((cx,cy-10),NAME[c]+side,font=F,fill=(40,30,20),anchor='mm')
    dr.text((cx,cy+18),f'{c[0]},{c[1]} ·{g.d[c]}'+(' ▼入口' if c in g.entries else ''),font=f2,fill=(200,40,30) if c in g.entries else (110,95,80),anchor='mm')
dr.text((24,18),'溫斯摩爾港　守城戰拓樸 v7（10-27）　棋盤・星形城牆　防衛目標＝市政廳',font=FB,fill=(40,30,20))
dr.text((24,60),f'{len(g.adj)} 格（背景 {len(g.adj)-len(pairs)} 張：藍框＝一張寬圖裁東西兩格，共 {len(pairs)} 組）　紅框＝敵人進入點 {len(g.entries)}（全在城牆線上，到市政廳都是 5 步）　綠虛線＝小路（主角限定）　灰＝死巷　·數字＝到市政廳步數',font=F,fill=(40,30,20))
im.save(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\map\_layout_winsmoor_siege_v7.png'); print(im.size,len(pairs))
import json; json.dump({'pairs':[[list(a),list(b)] for a,b in pairs]},open('pairs.json','w'))

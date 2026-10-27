exec(open('v9.py',encoding='utf8').read())
from PIL import Image,ImageDraw,ImageFont
COL={0:'崖邊路',2:'市政廳街',4:'教堂街',6:'港務大道',8:'磨坊街',10:'東環路'}     # 南北向
ROW={0:'河岸路',2:'議會街',4:'廣場街',6:'舊港町',8:'上街',10:'南環路'}           # 東西向
LAND={(2,2):'市政廳',(4,4):'大教堂前',(6,4):'中央廣場',(8,4):'上街區',(4,6):'舊港町口',(6,6):'港務大道口',
      (6,8):'雜貨舖前',(8,8):'餐飲街',(2,0):'河岸碼頭',(0,2):'雲海崖',(4,2):'法院前',(0,10):'崖邊南口'}
def name(c):
    x,y=c
    if c in LAND: return LAND[c]
    if x%2==0 and y%2==0: return f'{COL[x][:2]}×{ROW[y][:2]}'
    if x%2==0: return f'{COL[x]}{(y+1)//2}段'
    return f'{ROW[y]}{(x+1)//2}段'
# 寬圖：路口＋它東邊那一段（同一條東西向街）
PAIRS=[((x,y),(x+1,y)) for (x,y) in g.adj if x%2==0 and y%2==0 and (x+1,y) in g.adj and w((x,y),(x+1,y)) not in WALLS]
S=124; M=70; TOP=130
im=Image.new('RGB',(W*S+2*M,H*S+2*M+TOP),(246,240,226)); dr=ImageDraw.Draw(im)
F=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',17); f2=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',13)
FB=ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc',28); FM=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',20)
XY=lambda c:(M+c[0]*S+S//2, TOP+M+c[1]*S+S//2)
x0,y0=XY((0,0)); x1,y1=XY((W-1,H-1))
dr.rectangle([0,TOP,x1+S,TOP+M-12],fill=(186,212,228)); dr.text((x0+300,TOP+18),'河（北）　無入口',font=FM,fill=(60,90,120))
dr.rectangle([0,TOP,M-12,y1+S],fill=(225,232,240)); dr.text((10,TOP+M+40),'雲\n海\n︵\n西\n︶',font=FM,fill=(90,110,140))
for x in range(W):
    for y in range(H):
        c=(x,y)
        if c not in g.adj:
            cx,cy=XY(c); col=(214,204,186) if x%2 and y%2 else (236,230,218)
            dr.rectangle([cx-S//2+5,cy-S//2+5,cx+S//2-5,cy+S//2-5],fill=col)
for a,b in PAIRS:
    (xa,ya),(xb,yb)=XY(a),XY(b)
    dr.rounded_rectangle([xa-56,ya-40,xb+56,yb+40],12,fill=(232,238,246))
for u in g.adj:
    for v in g.adj[u]:
        if u<v: dr.line([XY(u),XY(v)],fill=(110,95,80),width=6)
for wl in WALLS:
    a,b=tuple(wl)
    if a in g.adj or b in g.adj:
        (ax,ay),(bx,by)=XY(a),XY(b); mx,my=(ax+bx)//2,(ay+by)//2
        long=wl in {w((4,2),(5,2)),w((2,4),(2,5))}
        col=(200,60,30) if long else (120,70,50)
        if ay==by: dr.line([(mx,my-44),(mx,my+44)],fill=col,width=10)
        else: dr.line([(mx-44,my),(mx+44,my)],fill=col,width=10)
for c in g.adj:
    cx,cy=XY(c); bw,bh=104,52
    fill=(255,250,238); ol=(90,75,60); wd=2
    if c==T: fill=(250,214,140); ol=(170,40,30); wd=6
    elif c in g.entries: ol=(200,40,30); wd=5
    elif c in LAND: fill=(252,240,214)
    elif len(g.adj[c])==1: fill=(225,222,215)
    dr.rounded_rectangle([cx-bw//2,cy-bh//2,cx+bw//2,cy+bh//2],8,fill=fill,outline=ol,width=wd)
    dr.text((cx,cy-8),name(c),font=F,fill=(40,30,20),anchor='mm')
    dr.text((cx,cy+14),f'{c[0]},{c[1]}'+f' ·{g.d[c]}'+(' ▼' if c in g.entries else ''),font=f2,fill=(200,40,30) if c in g.entries else (110,95,80),anchor='mm')
dr.text((24,14),'溫斯摩爾港　守城戰拓樸 v9（10-27）　街區棋盤・菁英分三路斬首　防衛目標＝市政廳（西北：北河、西雲海）',font=FB,fill=(40,30,20))
dr.text((24,56),f'{len(g.adj)} 格　背景 {len(g.adj)-len(PAIRS)} 張（淺藍底＝路口＋東邊一段共用一張寬圖，{len(PAIRS)} 組）　紅框＝入口 {len(g.entries)}（只在南、東，到市政廳都是 {R} 步）',font=FM,fill=(40,30,20))
dr.text((24,88),'深褐牆＝堤防／舊城牆（把河岸帶、崖邊帶和城區隔開）　橘紅牆＝戰時路障（議會街東段、市政廳街南段）　淺色格＝建築街區　·數字＝到市政廳步數',font=FM,fill=(40,30,20))
im.save(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\map\_layout_winsmoor_siege_v9.png'); print(im.size,len(PAIRS))

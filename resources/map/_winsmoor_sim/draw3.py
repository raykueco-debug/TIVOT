import sys; sys.argv=['x']
exec(open('v3.py',encoding='utf8').read())
from PIL import Image,ImageDraw,ImageFont
NAME={'C':'中央廣場',
 'N1':'高街','E1':'大教堂前','S1':'港灣大道','W1':'市政廳前',
 'NR':'車站前圓環','ER':'醫院街口','SR':'海關前','WR':'拱廊口',
 'NX':'北大路','EX':'市場街','SX':'碼頭街','WX':'磨坊街',
 'Na1':'北墓園','Nb1':'排屋巷','Nb2':'北門','Nc1':'中央車站','Nc2':'調車場','Nc3':'高架橋',
 'Ea1':'東北門','Eb1':'屠宰場','Eb2':'東門','Ec1':'製革廠','Ec2':'河岸','Ec3':'東濱',
 'Sa1':'東棧橋','Sb1':'魚市','Sb2':'中央棧橋','Sc1':'倉庫街','Sc2':'運河閘','Sc3':'西防波堤',
 'Wa1':'西棧橋','Wb1':'貧民窟','Wb2':'西門','Wc1':'煤氣廠','Wc2':'濟貧院','Wc3':'北農地',
 'Nd':'學校','Ed':'救濟院巷','Sd':'製繩坊'}
ENTL={'Na1':'北','Nb2':'北','Nc3':'北','Ea1':'東','Eb2':'東','Ec3':'東','Sa1':'海','Sb2':'海','Sc3':'海','Wa1':'海','Wb2':'西','Wc3':'西'}
assert set(NAME)==set(P), set(P)^set(NAME)
xs=[p[0] for p in P.values()]; ys=[p[1] for p in P.values()]
SX=122; SY=76; M=110
W=(max(xs)-min(xs))*SX+2*M; H=(max(ys)-min(ys))*SY+2*M+70
ox,oy=-min(xs),-min(ys)
XY=lambda k:(M+(P[k][0]+ox)*SX, M+70+(P[k][1]+oy)*SY)
im=Image.new('RGB',(W,H),(246,240,226)); dr=ImageDraw.Draw(im)
F=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',19); f2=ImageFont.truetype(r'C:\Windows\Fonts\msjh.ttc',14)
FB=ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc',24)
ring=lambda a,b:a.endswith('R') and b.endswith('R')
for (a,d),b in used.items():
    if a>b: continue
    (x1,y1),(x2,y2)=XY(a),XY(b)
    col=(196,120,30) if ring(a,b) else (110,95,80); w=9 if ring(a,b) else 5
    boxes=[XY(k) for k in P if k not in (a,b)]
    def hits(c):
        for (p,q) in [((x1,y1),c),(c,(x2,y2))]:
            for bx,by in boxes:
                if min(p[0],q[0])-56<bx<max(p[0],q[0])+56 and min(p[1],q[1])-28<by<max(p[1],q[1])+28: return True
        return False
    c1=(x2,y1) if d in 'LR' else (x1,y2); c2=(x1,y2) if d in 'LR' else (x2,y1)
    corner=c1 if not hits(c1) or hits(c2) else c2
    dr.line([(x1,y1),corner,(x2,y2)],fill=col,width=w,joint='curve')
for k in P:
    cx,cy=XY(k); w,h=104,50
    fill=(255,250,238); ol=(90,75,60); wd=2
    if k=='C': fill=(250,214,140); ol=(170,40,30); wd=5
    elif k in ENTL: ol=(200,40,30); wd=4
    elif k.endswith('R'): fill=(252,232,196); ol=(196,120,30); wd=4
    elif len(adj[k])==1: fill=(225,222,215)
    dr.rounded_rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],9,fill=fill,outline=ol,width=wd)
    dr.text((cx,cy-8),NAME[k],font=F,fill=(40,30,20),anchor='mm')
    dr.text((cx,cy+14),f'{k} ·{g.d[k]}'+(f' ▼{ENTL[k]}' if k in ENTL else ''),font=f2,fill=(200,40,30) if k in ENTL else (110,95,80),anchor='mm')
dr.text((30,18),'溫斯摩爾港　守城戰拓樸 v3（10-27）　40 格・43 邊',font=FB,fill=(40,30,20)); dr.text((30,52),'金＝內環（第 2 格互通，決定難度的那一圈）　紅框＝進入點 12　灰＝死巷　·數字＝到廣場步數',font=F,fill=(40,30,20))
im.save(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\map\_layout_winsmoor_siege_v3.png'); print(im.size)

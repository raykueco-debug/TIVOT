import sys; sys.argv=['x','outer','outer4']
exec(open('v5.py',encoding='utf8').read())
from PIL import Image,ImageDraw,ImageFont
NAME={'C':'中央廣場',
 'N1':'高街','NR':'車站前圓環','NRp':'排屋巷','NRq':'學校','NX':'北大路','Na1':'北墓園','Nb1':'北門','Nc1':'中央車站','Nc2':'高架橋','Nd':'鐘樓巷',
 'E1':'大教堂前','ER':'醫院街口','ERp':'救濟院','ERq':'修道院巷','EX':'市場街','Ea1':'東北門','Eb1':'東門','Ec1':'製革廠','Ec2':'東濱','Ed':'屠宰巷',
 'S1':'港灣大道','SR':'海關前','SRp':'製繩坊','SRq':'保稅倉','SX':'碼頭街','Sa1':'東棧橋','Sb1':'中央棧橋','Sc1':'倉庫街','Sc2':'西防波堤','Sd':'魚市巷',
 'W1':'市政廳前','WR':'拱廊口','WRp':'貧民窟','WRq':'劇院巷','WX':'磨坊街','Wa1':'西棧橋','Wb1':'西門','Wc1':'煤氣廠','Wc2':'北農地'}
ENTL={'Na1':'北','Nb1':'北','Nc2':'北','Ea1':'東','Eb1':'東','Ec2':'東','Sa1':'海','Sb1':'海','Sc2':'海','Wa1':'海','Wb1':'西','Wc2':'西'}
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
    outer={frozenset(e) for e in OUTER}; isO=frozenset((a,b)) in outer
    col=(70,110,160) if isO else (110,95,80); w=7 if isO else 5
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
    elif len(adj[k])==1: fill=(225,222,215)
    dr.rounded_rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],9,fill=fill,outline=ol,width=wd)
    dr.text((cx,cy-8),NAME[k],font=F,fill=(40,30,20),anchor='mm')
    dr.text((cx,cy+14),f'{k} ·{g.d[k]}'+(f' ▼{ENTL[k]}' if k in ENTL else ''),font=f2,fill=(200,40,30) if k in ENTL else (110,95,80),anchor='mm')
dr.text((30,18),'溫斯摩爾港　守城戰拓樸 v4（10-27 定案）　40 格・43 邊',font=FB,fill=(40,30,20)); dr.text((30,52),'場上永遠 2 隻、清一隻進一隻　全 B 守住約 5 成　紅框＝進入點 12（4 格×8・5 格×4）　藍＝外圍橫街　灰＝死巷　·數字＝到廣場步數',font=F,fill=(40,30,20))
im.save(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\map\_layout_winsmoor_siege_v4.png'); print(im.size)

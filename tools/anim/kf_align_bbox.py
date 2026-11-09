"""B 對齊到 A（bbox 法）：B 等比縮到 alpha>128 外框塞得進 A 的外框（min 高比/寬比），腳底置中對齊；
放進共同畫布，聯集 bbox 四角打 alpha12 記號（同 kf_align_ab）。A 不縮放 —— deliver_kf2 靠這一點換算回立繪。
用法：kf_align_bbox.py A B outA outB [額外放大倍率=1]"""
import sys
from PIL import Image
a,b,oa,ob=sys.argv[1:5]; k=float(sys.argv[5]) if len(sys.argv)>5 else 1.0
A=Image.open(a).convert('RGBA'); B=Image.open(b).convert('RGBA')
bb=lambda im: im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
ba,bB=bb(A),bb(B)
s=min((ba[3]-ba[1])/(bB[3]-bB[1]),(ba[2]-ba[0])/(bB[2]-bB[0]))*k
B2=B.resize((round(B.width*s),round(B.height*s)),Image.LANCZOS); b2=bb(B2)
ox=round((ba[0]+ba[2])/2-(b2[0]+b2[2])/2); oy=ba[3]-b2[3]
x0,y0=min(0,ox),min(0,oy); x1,y1=max(A.width,ox+B2.width),max(A.height,oy+B2.height)
def place(im,px,py):
    c=Image.new('RGBA',(x1-x0,y1-y0),(0,0,0,0)); c.paste(im,(px-x0,py-y0),im); return c
cA,cB=place(A,0,0),place(B2,ox,oy)
u,v=bb(cA),bb(cB); U=(max(0,min(u[0],v[0])-8),max(0,min(u[1],v[1])-8),min(cA.width,max(u[2],v[2])+8),min(cA.height,max(u[3],v[3])+8))
for c,n in ((cA,oa),(cB,ob)):
    c=c.crop(U)
    for p in ((0,0),(c.width-1,0),(0,c.height-1),(c.width-1,c.height-1)):
        if c.getpixel(p)[3]<=8: c.putpixel(p,(0,0,0,12))
    c.save(n)
print(f'縮放 {s:.3f} 畫布 {U[2]-U[0]}x{U[3]-U[1]}')

# 把 GPT 新出的 B（白底、任意尺寸）對到 A 格子：白底 flood-fill 去掉 → 依下半身寬＋腳底對齊 A → 512×768 → 加聯集角點
import sys
import numpy as np
from PIL import Image, ImageDraw
CW,CH=512,768
src,acell,out=sys.argv[1:4]
im=Image.open(src).convert('RGB'); w,h=im.size
pad=Image.new('RGB',(w+2,h+2),(255,255,255)); pad.paste(im,(1,1)); ImageDraw.floodfill(pad,(0,0),(255,0,255),thresh=40)
a=np.array(pad)[1:-1,1:-1]; bg=(a[...,0]==255)&(a[...,1]==0)&(a[...,2]==255)
B=Image.fromarray(np.dstack([np.array(im),np.where(bg,0,255).astype(np.uint8)]))
A=Image.open(acell).convert('RGBA')
def low(x):
    al=x.getchannel('A').point(lambda v:255 if v>8 else 0); bb=al.getbbox(); hh=bb[3]-bb[1]
    return bb, al.crop((0,bb[3]-int(hh*0.25),x.width,bb[3])).getbbox()
(ba,la),(bb,lb)=low(A),low(B)
s=(la[2]-la[0])/(lb[2]-lb[0]); src=B.crop(bb); src=src.resize((round(src.width*s),round(src.height*s)),Image.LANCZOS)
mxA=(la[0]+la[2])/2; mxB=((lb[0]+lb[2])/2-bb[0])*s
nb=Image.new('RGBA',(CW,CH),(0,0,0,0)); nb.alpha_composite(src,(round(mxA-mxB),ba[3]-src.height)) if ba[3]-src.height>=0 else nb.paste(src,(round(mxA-mxB),ba[3]-src.height),src)
for x in (A,nb):
    pass
bbs=[x.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox() for x in (A,nb)]
u=(min(b[0] for b in bbs),min(b[1] for b in bbs),max(b[2] for b in bbs),max(b[3] for b in bbs))
for p in ((u[0],u[1]),(u[2]-1,u[1]),(u[0],u[3]-1),(u[2]-1,u[3]-1)):
    if nb.getpixel(p)[3]<=8: nb.putpixel(p,(0,0,0,12))
nb.save(out); print('scale %.3f'%s, bbs, u)

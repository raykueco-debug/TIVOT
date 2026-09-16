# -*- coding: utf-8 -*-
"""原/新髮飾並排對照條（自動定位）
   蕾娜髮飾換裝產線（見 resources/SI/renna_newhair/ 與 HANDOFF.md）。
"""
import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))
import _utf8  # noqa
import _font
import numpy as np
from PIL import Image, ImageDraw
TX0,TX1,TY0,TY1=404,472,40,110
def lum(im):
    a=np.asarray(im.convert('RGBA')).astype(np.float32); al=a[...,3]/255.0
    return a[...,:3].mean(2)*al+255.0*(1-al)
REF=Image.open('resources/SI/Renna_SI_front.webp')
T0=lum(REF)[TY0:TY1,TX0:TX1]; T=T0-T0.mean(); tn=np.sqrt((T*T).sum()); th,tw=T.shape
def locate(im):
    I=lum(im); best=(-2,0,0)
    for dy in range(-120,121,2):
        y0=TY0+dy
        if y0<0 or y0+th>I.shape[0]: continue
        for dx in range(-120,121,2):
            x0=TX0+dx
            if x0<0 or x0+tw>I.shape[1]: continue
            W=I[y0:y0+th,x0:x0+tw]; Wm=W-W.mean(); wn=np.sqrt((Wm*Wm).sum())
            if wn<1e-6: continue
            r=float((T*Wm).sum()/(tn*wn))
            if r>best[0]: best=(r,dx,dy)
    return best
def onwhite(p):
    im=Image.open(p).convert('RGBA'); bg=Image.new('RGBA',im.size,(255,255,255,255))
    return Image.alpha_composite(bg,im).convert('RGB')
out=sys.argv[1]; bases=sys.argv[2:]
CS=190
im=Image.new('RGB',(len(bases)*(CS+10)+20, CS*2+70),(250,249,246)); d=ImageDraw.Draw(im)
F=_font.cjk(17)
for i,base in enumerate(bases):
    o=Image.open('resources/SI/%s.webp'%base).convert('RGBA')
    r,dx,dy=locate(o)
    cx=TX0+dx+(TX1-TX0)//2; cy=TY0+dy+(TY1-TY0)//2
    a=onwhite('resources/SI/%s.webp'%base); b=onwhite('resources/SI/renna_newhair/%s.webp'%base)
    x=14+i*(CS+10)
    d.text((x,6), base.replace('Renna_SI_','')[:14], font=F, fill=(20,20,20))
    im.paste(a.crop((cx-55,cy-55,cx+55,cy+55)).resize((CS,CS),Image.LANCZOS),(x,28))
    im.paste(b.crop((cx-55,cy-55,cx+55,cy+55)).resize((CS,CS),Image.LANCZOS),(x,28+CS+14))
d.text((14,28+CS-4),'↑原　↓新',font=F,fill=(90,90,90))
im.save(out); print('→',out)

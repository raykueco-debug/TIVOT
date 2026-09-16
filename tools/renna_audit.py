# -*- coding: utf-8 -*-
"""交件夾全體抽檢：平均差＋人物高差，判合格/重跑
   蕾娜髮飾換裝產線（見 resources/SI/renna_newhair/ 與 HANDOFF.md）。
"""
import sys, os, glob
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))
import _utf8  # noqa
from PIL import Image, ImageChops
def edges(img,thr=40):
    al=img.getchannel('A'); W,H=img.size; px=al.load()
    t=next(y for y in range(H) if any(px[x,y]>thr for x in range(0,W,2)))
    b=next(y for y in range(H-1,-1,-1) if any(px[x,y]>thr for x in range(0,W,2)))
    return t,b
def flat(img):
    bg=Image.new('RGBA',img.size,(255,255,255,255))
    return Image.alpha_composite(bg,img).convert('RGB')
rows=[]
for p in sorted(glob.glob('resources/SI/renna_newhair/Renna_SI_*.webp')):
    base=os.path.basename(p)[:-5]
    o=Image.open('resources/SI/%s.webp'%base).convert('RGBA')
    n=Image.open(p).convert('RGBA')
    t1,b1=edges(o); t2,b2=edges(n)
    d=ImageChops.difference(flat(o),flat(n)).convert('L')
    mean=sum(d.histogram()[i]*i for i in range(256))/(o.size[0]*o.size[1])
    dh=(b2-t2)-(b1-t1)
    ok = mean<=6 and abs(dh)<=5
    rows.append((base, mean, dh, ok, os.path.getmtime(p)))
rows.sort(key=lambda r:r[1])
print('%-28s %6s %6s  %s' % ('檔名','平均差','高差','判定'))
for base,mean,dh,ok,_ in rows:
    print('%-28s %6.1f %+6d  %s' % (base, mean, dh, '✔ 合格' if ok else '✘ 重跑'))
good=[r for r in rows if r[3]]
print('\n交件夾共 %d 張：合格 %d、要重跑 %d' % (len(rows), len(good), len(rows)-len(good)))
print('全部 57 張中，尚未產出的有 %d 張' % (57-len(rows)))

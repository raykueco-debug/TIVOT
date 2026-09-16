# -*- coding: utf-8 -*-
"""平原古道驗收：量畫面下半（地表區，排除天空）的平均明度與彩度。
   驗收帶（_plainsroad_spec.md §二）：V 105~142、S ≤29%。"""
import sys, os, glob, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _utf8  # noqa
from PIL import Image
p=sys.argv[1]
if not os.path.exists(p):
    c=sorted(glob.glob('C:/Users/Kaede/Downloads/gen_%s*.png'%p), key=os.path.getmtime); p=c[-1]
im=Image.open(p).convert('RGB'); W,H=im.size
r=im.crop((0,int(H*0.5),W,H)).resize((160,80))
V=S=0; n=0
for px in list(r.getdata()):
    mx,mn=max(px),min(px)
    V+=mx; S+= (mx-mn)/mx if mx else 0; n+=1
V/=n; S=S/n*100
ok = 105<=V<=142 and S<=29
print('%s  %s' % (os.path.basename(p), im.size))
print('地表區 平均V %.0f（帶 105~142）　平均S %.1f%%（上限 29%%）　→ %s'
      % (V, S, '✔ 合格' if ok else '✘ 超出'))

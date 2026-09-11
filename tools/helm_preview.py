#!/usr/bin/env python3
"""把甲板背景依 flight/index.html 的 drawPanel 幾何合成，看上機後真正露出多少。"""
import sys, os
from PIL import Image
ROOT='/Users/rayku/Desktop/TIVOT'
W,H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv)>3 else (390,844)
VIEW_F, HELM_OUT, HELM_FOOT, BASE_K = 0.66, 20, 4, 1.05
BORE=(0.4481,0.1581)
VIEWH=round(H*VIEW_F); y0=VIEWH; ph=H-VIEWH
cx=W/2; wcy=H-HELM_FOOT; R=wcy-(y0-HELM_OUT)

deck=Image.open(sys.argv[1]).convert('RGBA')
# cover-fit 進面板矩形
s=max(W/deck.width, ph/deck.height)
dw,dh=round(deck.width*s), round(deck.height*s)
deck=deck.resize((dw,dh), Image.LANCZOS)
canvas=Image.new('RGBA',(W,H),(18,16,26,255))
canvas.alpha_composite(deck,( (W-dw)//2, y0+(ph-dh)//2 ))

def put(path,x,y,w,h):
    im=Image.open(os.path.join(ROOT,path)).convert('RGBA').resize((max(1,round(w)),max(1,round(h))),Image.LANCZOS)
    canvas.alpha_composite(im,(round(x),round(y)))

B=Image.open(os.path.join(ROOT,'flight/Base.webp'))
bw=R*2*BASE_K; bh=bw*B.height/B.width
put('flight/Base.webp', cx-bw*BORE[0], wcy-bh*BORE[1], bw, bh)

# 舵輪：裁掉軸心以下
wh=Image.open(os.path.join(ROOT,'flight/Wheel.webp')).convert('RGBA').resize((round(R*2),round(R*2)),Image.LANCZOS)
lay=Image.new('RGBA',(W,H),(0,0,0,0)); lay.alpha_composite(wh,(round(cx-R),round(wcy-R)))
lay=lay.crop((0,0,W,round(wcy))); canvas.alpha_composite(lay,(0,0))

# 3D 視窗那一半塗掉，只看面板
canvas.paste((10,10,14,255),(0,0,W,y0-HELM_OUT))
out=sys.argv[4] if len(sys.argv)>4 else '/tmp/helm_preview.png'
canvas.convert('RGB').save(out)
print('%dx%d  面板 y0=%d ph=%d  R=%.0f  露出率待看 → %s'%(W,H,y0,ph,R,out))

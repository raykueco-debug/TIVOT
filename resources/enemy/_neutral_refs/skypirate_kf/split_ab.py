# 四宮格切回每人：A＝原分層（真 alpha）照格位重擺；B＝GPT 那一格，白底由四邊 flood-fill 去掉（只是 Wan 輸入，不是交件）。
# 兩張同一張 512×768 畫布＋聯集外框角點（同 align_bbox.py）⇒ tivot_wan 的 to_green 用同一個縮放，B 不會變小。
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
K=os.path.dirname(os.path.abspath(__file__)); R='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'
OUT=os.path.join(K,'cells'); os.makedirs(OUT,exist_ok=True)
CW,CH=512,768
def deflood(cell):
    im=cell.convert('RGB'); w,h=im.size
    mask=Image.new('L',(w+2,h+2),0)
    pad=Image.new('RGB',(w+2,h+2),(255,255,255)); pad.paste(im,(1,1))
    ImageDraw.floodfill(pad,(0,0),(255,0,255),thresh=40)
    a=np.array(pad)[1:-1,1:-1]; bg=(a[...,0]==255)&(a[...,1]==0)&(a[...,2]==255)
    rgba=np.dstack([np.array(im),np.where(bg,0,255).astype(np.uint8)])
    return Image.fromarray(rgba)
for g in sys.argv[1:]:
    meta=json.load(open(f'{K}/grid_{g}.json')); B=Image.open(f'{K}/B_grid_{g}.png').convert('RGB').resize((CW*2,CH*2),Image.LANCZOS)
    for name,m in meta.items():
        cx,cy=m['cell']; lay=Image.open(f'{R}/man_skypirate_{g}_layers/{name}.webp').convert('RGBA').crop(m['bbox'])
        lay=lay.resize((round(lay.width*m['scale']),round(lay.height*m['scale'])),Image.LANCZOS)
        A=Image.new('RGBA',(CW,CH),(0,0,0,0)); A.alpha_composite(lay,(m['paste'][0]-cx,m['paste'][1]-cy))
        Bc=deflood(B.crop((cx,cy,cx+CW,cy+CH)))
        # GPT 會把人畫小／抬高：用下半身（底部 25%）的寬度與腳底對齊回 A
        def low(x):
            al=x.getchannel('A').point(lambda v:255 if v>8 else 0); bb=al.getbbox(); h=bb[3]-bb[1]
            lb=al.crop((0,bb[3]-int(h*0.25),CW,bb[3])).getbbox(); return bb,lb
        (ba,la),(bbb,lbb)=low(A),low(Bc)
        sc=max(0.85,min(1.2,(la[2]-la[0])/max(1,lbb[2]-lbb[0])))
        if abs(sc-1)>0.02 or abs(ba[3]-bbb[3])>4:
            src=Bc.crop(bbb); src=src.resize((round(src.width*sc),round(src.height*sc)),Image.LANCZOS)
            mxA=(la[0]+la[2])/2; mxB=((lbb[0]+lbb[2])/2-bbb[0])*sc
            nb=Image.new('RGBA',(CW,CH),(0,0,0,0)); nb.alpha_composite(src,(max(0,round(mxA-mxB)),max(0,ba[3]-src.height)))
            print('  B 對齊',name,'scale %.3f'%sc,'底 %d→%d'%(bbb[3],ba[3])); Bc=nb
        bbs=[x.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox() for x in (A,Bc)]
        u=(min(b[0] for b in bbs),min(b[1] for b in bbs),max(b[2] for b in bbs),max(b[3] for b in bbs))
        for x in (A,Bc):
            for p in ((u[0],u[1]),(u[2]-1,u[1]),(u[0],u[3]-1),(u[2]-1,u[3]-1)):
                if x.getpixel(p)[3]<=8: x.putpixel(p,(0,0,0,12))
        A.save(f'{OUT}/sp{g}_{name}_A.png'); Bc.save(f'{OUT}/sp{g}_{name}_B.png')
        print(g,name,bbs,'→',u)

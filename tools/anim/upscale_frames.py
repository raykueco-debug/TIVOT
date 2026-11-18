# 動畫格放大（ver -2778，Ray：「kling 的太模糊了 能修嗎」）：4x-UltraSharp 逐格放大 RGB，alpha 也過同一個模型（當灰階圖），
# 再縮到 --scale 倍輸出。輸入是 animechk 匯出的 frame_*.webp（RGBA），輸出同名到另一個資料夾，export.json 一起抄。
# 用法：<ComfyUI venv python> upscale_frames.py <in_dir> <out_dir> [--scale 2] [--tile 384]
import argparse, glob, os, shutil
import numpy as np, torch
from PIL import Image
from spandrel import ModelLoader
ap=argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--scale',type=float,default=2); ap.add_argument('--tile',type=int,default=384)
ap.add_argument('--model',default=r'C:/Users/Ray Ku/Desktop/ComfyUI-master/models/upscale_models/4x-UltraSharp.pth')
a=ap.parse_args()
m=ModelLoader().load_from_file(a.model).cuda().eval().half(); S=m.scale
def up(rgb):   # rgb: HxWx3 float 0..1 → (H*S)x(W*S)x3，分塊跑
    H,W,_=rgb.shape; out=np.zeros((H*S,W*S,3),np.float32); t=a.tile; pad=16
    for y in range(0,H,t):
        for x in range(0,W,t):
            y0,x0=max(0,y-pad),max(0,x-pad); y1,x1=min(H,y+t+pad),min(W,x+t+pad)
            ten=torch.from_numpy(rgb[y0:y1,x0:x1]).permute(2,0,1)[None].cuda().half()
            with torch.no_grad(): r=m(ten)[0].permute(1,2,0).float().clamp(0,1).cpu().numpy()
            yy,xx=(y-y0)*S,(x-x0)*S; hh,ww=min(t,H-y)*S,min(t,W-x)*S
            out[y*S:y*S+hh,x*S:x*S+ww]=r[yy:yy+hh,xx:xx+ww]
    return out
os.makedirs(a.dst,exist_ok=True)
fs=sorted(glob.glob(os.path.join(a.src,'frame_*.webp')))
for f in fs:
    im=np.asarray(Image.open(f).convert('RGBA')).astype(np.float32)/255
    # 只跑有東西的那一塊（省時間）：alpha 外框外擴 8px
    ys,xs=np.where(im[...,3]>0.02); H,W=im.shape[:2]
    y0,y1,x0,x1=max(0,ys.min()-8),min(H,ys.max()+9),max(0,xs.min()-8),min(W,xs.max()+9)
    c=im[y0:y1,x0:x1]; al=c[...,3:4]
    rgb=up(np.ascontiguousarray(c[...,:3]*al+ (1-al)*0.5))           # 透明處墊中灰，邊緣不吃黑邊
    alp=up(np.ascontiguousarray(np.repeat(al,3,2)))[...,:1]
    big=np.dstack([rgb,alp]); full=np.zeros((H*S,W*S,4),np.float32); full[y0*S:y1*S,x0*S:x1*S]=big
    o=Image.fromarray((full*255).round().clip(0,255).astype(np.uint8)); o=o.resize((round(W*a.scale),round(H*a.scale)),Image.LANCZOS)
    o.save(os.path.join(a.dst,os.path.basename(f)),'WEBP',quality=90)
for j in glob.glob(os.path.join(a.src,'*.json')): shutil.copy(j,a.dst)
print(len(fs),'格 →',a.dst)

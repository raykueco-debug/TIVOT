import sys,os,numpy as np
from PIL import Image
from scipy import ndimage as nd
# eyefix.py src_dir dst_dir mode(white|black) box(x0,y0,x1,y1) frames...
src,dst,mode,box=sys.argv[1:5]; HL,HH,SM,VM=[float(v) for v in os.environ.get("EYE","30,62,0.3,0.5").split(",")]; fr=[int(x) for x in sys.argv[5:]]
x0,y0,x1,y1=map(int,box.split(','))
os.makedirs(dst,exist_ok=True)
for i in fr:
    im=Image.open(f'{src}/frame_{i:02d}.webp').convert('RGBA'); a=np.asarray(im).astype(float)
    hsv=np.asarray(im.convert('RGB').convert('HSV')).astype(float)
    H,S,V=hsv[...,0]*360/255,hsv[...,1]/255,hsv[...,2]/255
    m=(H>=HL)&(H<=HH)&(S>SM)&(V>VM)&(a[...,3]>200)
    reg=np.zeros_like(m); reg[y0:y1,x0:x1]=True; m&=reg
    lab,n=nd.label(m); sizes=nd.sum(m,lab,range(1,n+1))
    TOP=int(os.environ.get('TOP','99'));order=sorted(range(n),key=lambda k:-sizes[k])[:TOP];keep=np.isin(lab,[k+1 for k in order if sizes[k]>=4])
    keep=nd.binary_fill_holes(nd.binary_dilation(keep,iterations=2))
    keep=nd.binary_fill_holes(nd.binary_closing(keep,iterations=2))
    soft=nd.gaussian_filter(keep.astype(float),0.8)[...,None]
    col=np.array([238,234,224.]) if mode=='white' else np.array([14,10,12.])
    a[...,:3]=a[...,:3]*(1-soft)+col*soft
    Image.fromarray(a.astype(np.uint8)).save(f'{dst}/frame_{i:02d}.png')
    print(i,int(keep.sum()),'px')

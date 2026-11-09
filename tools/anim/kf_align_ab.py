"""B 對齊到 A 的座標（SIFT＋相似變換 RANSAC），放進共同畫布並在聯集 bbox 四角打 alpha12 記號，
讓 tivot_wan 的 to_green 對 A、B 用同一個縮放。用法：kf_align_ab.py A.png B.png outA.png outB.png"""
import sys, numpy as np, cv2
from PIL import Image
a,b,oa,ob=sys.argv[1:5]
A=np.array(Image.open(a).convert('RGBA')); B=np.array(Image.open(b).convert('RGBA'))
def g(X): 
    m=X[...,3]>128; G=cv2.cvtColor(X[...,:3],cv2.COLOR_RGB2GRAY); G[~m]=0; return G,m.astype(np.uint8)
ga,ma=g(A); gb,mb=g(B)
s=cv2.SIFT_create(4000); ka,da=s.detectAndCompute(ga,ma); kb,db=s.detectAndCompute(gb,mb)
mt=cv2.BFMatcher().knnMatch(db,da,k=2); good=[m for m,n in mt if m.distance<0.75*n.distance]
src=np.float32([kb[m.queryIdx].pt for m in good]); dst=np.float32([ka[m.trainIdx].pt for m in good])
M,inl=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=4)
sc=np.hypot(M[0,0],M[1,0]); print(f'匹配 {len(good)} 內點 {int(inl.sum())} 縮放 {sc:.3f} 位移 {M[0,2]:.0f},{M[1,2]:.0f}')
H,W=A.shape[:2]; pad=600
T=np.array([[1,0,pad],[0,1,pad]],np.float32); M2=M.copy(); M2[:,2]+=pad
CW,CH=W+2*pad,H+2*pad
Bw=cv2.warpAffine(B,M2,(CW,CH),flags=cv2.INTER_LANCZOS4,borderValue=(0,0,0,0))
Aw=cv2.warpAffine(A,T,(CW,CH),flags=cv2.INTER_NEAREST,borderValue=(0,0,0,0))
m=(Aw[...,3]>8)|(Bw[...,3]>8); ys,xs=np.where(m); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
Aw=Aw[y0:y1+1,x0:x1+1].copy(); Bw=Bw[y0:y1+1,x0:x1+1].copy()
for X in (Aw,Bw):
    for y,x in ((0,0),(0,-1),(-1,0),(-1,-1)):
        if X[y,x,3]<=8: X[y,x]=[0,0,0,12]
Image.fromarray(Aw).save(oa); Image.fromarray(Bw).save(ob)

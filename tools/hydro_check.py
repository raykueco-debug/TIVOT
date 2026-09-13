# -*- coding: utf-8 -*-
"""水文體檢（決定性的那一種）。

⚠ 不要用「八鄰居都不比自己低」當窪地的判準：**填平的盆地是一片平台**，
  平台邊緣的格子鄰居只有「等高」與「更高」，會被誤判成窪地（第一版就是這樣，
  填完還報 3.8%）。正解是**把成品再填一次**：還會被填高的地方，才是水真的
  出不去的地方。
"""
import sys, numpy as np, cv2
from PIL import Image
f = sys.argv[1] if len(sys.argv)>1 else 'flight/silvermoon_heightmap.png'
ft = sys.argv[2] if len(sys.argv)>2 else 'flight/silvermoon_terrain.png'
H = np.asarray(Image.open(f).convert('L')).astype(np.float32)
T = np.asarray(Image.open(ft).convert('RGB')).astype(np.int32)
SEA = 44/520*255.0
land = H > SEA
r,g,b = T[:,:,0],T[:,:,1],T[:,:,2]
riv = (b>r+16)&(b>g+4)&(b>70)&(b<200)&land
print('%s  陸地 %.1f%%  水色 %d px (%.2f%%)'%(f.split('/')[-1],100*land.mean(),riv.sum(),100*riv.mean()))

marker=np.full_like(H,1e4); seed=~land
marker[seed]=H[seed]; marker[0,:]=H[0,:]; marker[-1,:]=H[-1,:]; marker[:,0]=H[:,0]; marker[:,-1]=H[:,-1]
k3=np.ones((3,3),np.uint8); it=0
while it<4000:
    it+=1; nm=np.maximum(cv2.erode(marker,k3),H)
    if np.array_equal(nm,marker): break
    marker=nm
d=(marker-H)[land]
print('① 水出不去的陸地（再填一次還會被填高）：%d px = 陸地的 %.2f%%（深 >3 灰階的 %.2f%%）'
      %((d>0.01).sum(),100*(d>0.01).mean(),100*(d>3).mean()))
# 河有沒有往下走：沿 D8 流向走，看沿線高度有沒有上升
yy=np.mgrid[0:H.shape[0],0:H.shape[1]][0].astype(np.float32)
print('② 高度與 y 的相關（負＝北高南低）：%.3f'%np.corrcoef(H[land],yy[land])[0,1])
n=[]
for y0 in range(0,H.shape[0],200):
    m=land[y0:y0+200]; v=H[y0:y0+200][m]
    if v.size: n.append('%d'%round(v.mean()))
print('③ 由北到南每 200 列的陸地平均高：%s'%(' → '.join(n)))

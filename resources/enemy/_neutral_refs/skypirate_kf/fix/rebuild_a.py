# 換了分層的人：照 grid_<組>.json（make_grid 已重跑）重做 A 格；B 用指定圖（縮到 512×768），兩張加聯集角點
import json, sys
from PIL import Image
R='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'; CW,CH=512,768
g,name,bsrc=sys.argv[1],sys.argv[2],sys.argv[3]
m=json.load(open(f'grid_{g}.json'))[name]; cx,cy=m['cell']
lay=Image.open(f'{R}/man_skypirate_{g}_layers/{name}.webp').convert('RGBA').crop(m['bbox'])
lay=lay.resize((round(lay.width*m['scale']),round(lay.height*m['scale'])),Image.LANCZOS)
A=Image.new('RGBA',(CW,CH),(0,0,0,0)); A.alpha_composite(lay,(m['paste'][0]-cx,m['paste'][1]-cy))
B=Image.open(bsrc).convert('RGBA').resize((CW,CH),Image.LANCZOS)
bbs=[x.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox() for x in (A,B)]; print(bbs)
u=(min(b[0] for b in bbs),min(b[1] for b in bbs),max(b[2] for b in bbs),max(b[3] for b in bbs))
for x in (A,B):
    for p in ((u[0],u[1]),(u[2]-1,u[1]),(u[0],u[3]-1),(u[2]-1,u[3]-1)):
        if x.getpixel(p)[3]<=8: x.putpixel(p,(0,0,0,12))
A.save(f'cells/sp{g}_{name}_A.png'); B.save(f'cells/sp{g}_{name}_B.png')

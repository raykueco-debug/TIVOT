# 7-3／3-1 換分層後的整套重交（11-09 Ray）：攻擊照 deliver_v2；待機 24 格 8fps loop；倒地自剪＝紫月軍標準節拍
# 倒地：原片前段有火光／濺血（違反提示詞），從第 START 格起取 16 張（同紫月 hit 模式的取樣），再套 s1_s1_cut 的 kept [0,2,4,6,8,10,12,14,15]、holds [1,2,2,1,2,2,2,2,1] → 15 格 24fps
import json, os, shutil
from PIL import Image
R='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'; FIX='C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/out/pirate_fix'
W,H=480,720
def layer_bbox(g,n):
    L=Image.open(f'{R}/man_skypirate_{g}_layers/pirate_{n}.webp').convert('RGBA'); return L.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
def box_for(bb,fit,mode):
    w,h=bb[2]-bb[0],bb[3]-bb[1]; s=min(W*fit/w,H*fit/h); w2,h2=round(w*s),round(h*s)
    ox=(W-w2)//2; oy=H-h2-int(H*0.05) if mode=='hit' else round((H-h2)*0.5)
    return [round(bb[0]-ox/s),round(bb[1]-oy/s),round(W/s),round(H/s)]
def put(out,frames,info):
    if os.path.isdir(out):
        for f in os.listdir(out): os.remove(os.path.join(out,f))
    os.makedirs(out,exist_ok=True)
    for j,f in enumerate(frames): shutil.copy(f,os.path.join(out,'frame_%02d.webp'%j))
    info['frames']=len(frames); json.dump(info,open(os.path.join(out,'anim.json'),'w'),indent=1)
START,END=14,45
KEPT=[0,2,4,6,8,10,12,14,15]; HOLD=[1,2,2,1,2,2,2,2,1]
for g,n in [(7,3),(3,1)]:
    bb=layer_bbox(g,n)
    src=f'{FIX}/pirate_{n}_sp{g}_{n}_idle'; fr=sorted(os.path.join(src,f) for f in os.listdir(src) if f.startswith('frame_'))
    put(f'{R}/anim/man_skypirate_{g}_idle_v2/pirate_{n}',fr,{'canvas':[1254,1254],'box':box_for(bb,0.92,'idle'),'fps':8,'loop':True,'note':'v2（11-09）：換分層後重跑'})
    src=f'{FIX}/pirate_{n}_sp{g}_{n}_hit'; allf=sorted(os.path.join(src,f) for f in os.listdir(src) if f.startswith('frame_'))
    picks=[round(START+(END-START)*i/15) for i in range(16)]
    seq=[allf[picks[k]] for k,h in zip(KEPT,HOLD) for _ in range(h)]
    put(f'{R}/anim/man_skypirate_{g}_hit_v2/pirate_{n}',seq,{'canvas':[1254,1254],'box':box_for(bb,0.86,'hit'),'fps':24,'loop':False,
        'note':f'v2（11-09）：換分層後重跑；原片第 {START} 格起（前段有火光／濺血不用），紫月軍標準節拍','raw_index':[picks[k] for k in KEPT]})
    print(g,n,'idle',len(fr),'hit',len(seq),[picks[k] for k in KEPT])

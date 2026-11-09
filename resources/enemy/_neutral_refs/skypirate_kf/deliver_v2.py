# 空賊攻擊 v2 交件：animechk 剪好的 out/export/sp<組>_pirate_<K>_A_L17_cut（4 格）→ resources/enemy/anim/man_skypirate_<組>_atk_v2/pirate_<K>/
# Wan 的 480×720 整格不裁，box＝這一格在 1254² 分層畫布上的位置（反算 tivot_wan.to_green 與四宮格對位）。
import json, os, re, shutil, sys
ONLY=sys.argv[1:]   # 例：sp8_pirate_2（不給＝全部）
from PIL import Image
K=os.path.dirname(os.path.abspath(__file__)); R='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'
EXP='C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/out/export'
W,H,FIT=480,720,0.86
for g in range(1,9):
    meta=json.load(open(f'{K}/grid_{g}.json'))
    for name,m in meta.items():
        if ONLY and f'sp{g}_{name}' not in ONLY: continue
        base=f'sp{g}_{name}_A_L17_cut'; cuts=[c for c in os.listdir(EXP) if re.fullmatch(re.escape(base)+r'(_\d+)?',c)]
        if not cuts: print('missing',base); continue
        src=f'{EXP}/'+max(cuts,key=lambda c:int(c.rsplit('_',1)[1]) if c[-1].isdigit() and c!=base else 1)   # 取最新的 _cut_N
        A=Image.open(f'{K}/cells/sp{g}_{name}_A.png'); u=A.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
        uw,uh=u[2]-u[0],u[3]-u[1]; s=min(W*FIT/uw,H*FIT/uh); iw,ih=round(uw*s),round(uh*s)
        ox,oy=(W-iw)//2, round((H-ih)*0.5)
        # 格內座標 → 分層：layer = bbox0 + (cell - (paste-cellorigin)) / gscale
        px,py=m['paste'][0]-m['cell'][0], m['paste'][1]-m['cell'][1]; gs=m['scale']; bx,by=m['bbox'][0],m['bbox'][1]
        cx0=u[0]-ox/s; cy0=u[1]-oy/s
        x0=bx+(cx0-px)/gs; y0=by+(cy0-py)/gs; bw=W/s/gs; bh=H/s/gs
        out=f'{R}/anim/man_skypirate_{g}_atk_v2/{name}'; os.makedirs(out,exist_ok=True)
        ex=json.load(open(f'{src}/export.json'))
        for f in os.listdir(out):
            if f.startswith('frame_'): os.remove(f'{out}/{f}')
        fs=[]   # 停格展開成實格（同 v1 倒地的交法）
        for f,h in zip(sorted(f for f in os.listdir(src) if f.startswith('frame_')), ex.get('holds') or []):
            for _ in range(h): shutil.copy(f'{src}/{f}',f'{out}/frame_%02d.webp'%len(fs)); fs.append(f)
        json.dump({'canvas':[1254,1254],'box':[round(x0),round(y0),round(bw),round(bh)],'frames':len(fs),'fps':ex.get('fps',24),'loop':False,
                   'note':'v2（11-09）：剪法見 from／kept_index／holds；槍火畫在格子裡（程式不必再畫）；打到＝最後一格；R＝倒放','from':os.path.basename(src)+' ← '+ex['from'],'kept_index':ex['kept_index'],'holds':ex.get('holds')},
                  open(f'{out}/anim.json','w'),indent=1)
        print(g,name,[round(x0),round(y0),round(bw),round(bh)])

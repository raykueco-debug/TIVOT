# 空賊 A 四宮格：每組每人從 1254² 分層裁出主體，縮進 512×768 格（留白 8%），拼成 1024×1536 送 GPT 出 B。
# 對位寫進 grid_<組>.json（之後切回每人時照這個反算）。
import json, os
from PIL import Image
R='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'
OUT=os.path.dirname(os.path.abspath(__file__))
CW,CH,PAD=512,768,0.08
for g in range(1,9):
    d=f'{R}/man_skypirate_{g}_layers'
    ps=sorted(f for f in os.listdir(d) if f.startswith('pirate_') and f.endswith('.webp'))
    grid=Image.new('RGBA',(CW*2,CH*2),(255,255,255,255)); meta={}
    for i,f in enumerate(ps):
        im=Image.open(f'{d}/{f}').convert('RGBA'); bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
        cr=im.crop(bb); s=min(CW*(1-2*PAD)/cr.width, CH*(1-2*PAD)/cr.height)
        cr=cr.resize((round(cr.width*s),round(cr.height*s)),Image.LANCZOS)
        cx,cy=(i%2)*CW,(i//2)*CH; ox=cx+(CW-cr.width)//2; oy=cy+(CH-cr.height)//2
        grid.alpha_composite(cr,(ox,oy))
        meta[f[:-5]]={'cell':[cx,cy],'paste':[ox,oy],'scale':s,'bbox':bb}
    grid.convert('RGB').save(f'{OUT}/A_grid_{g}.png')
    json.dump(meta,open(f'{OUT}/grid_{g}.json','w'),indent=1)
    print(g,len(ps))

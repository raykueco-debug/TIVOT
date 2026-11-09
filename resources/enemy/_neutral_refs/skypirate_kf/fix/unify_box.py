# 空賊每人的 待機／攻擊／倒地 補成「同一個框」（Ray 11-09 選第三案）：三支的 box 取聯集，每格照原位貼進聯集框（外面補透明），不縮不改圖。
# 換框時不管程式先換框還是先換圖都一樣大 ⇒ 不會「縮一下」。輸出 man_skypirate_N_{idle,atk,hit}_v3/pirate_K/（整組齊）。
# 解析度 R＝每 1 分層像素 0.6 輸出像素（Wan 格約 0.53～0.57，v1 待機／倒地原本 1.0 → 略降；手機上顯示約 250px 寬，綽綽有餘）。
import json, os
from PIL import Image
A='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/anim'; R=0.6
GROUPS={1:[1,2,3,4],2:[1,2,3,4],3:[1,2,3,4],4:[1,2,3],5:[1,2,3,4],6:[1,2,3],7:[1,2,3,4],8:[1,2]}
V2={(3,1),(7,3)}   # 換過分層的人：待機／倒地用 v2
tot=0
for g,ps in GROUPS.items():
    for n in ps:
        src={'idle':f'{A}/man_skypirate_{g}_idle_{"v2" if (g,n) in V2 else "v1"}/pirate_{n}',
             'hit': f'{A}/man_skypirate_{g}_hit_{"v2" if (g,n) in V2 else "v1"}/pirate_{n}',
             'atk': f'{A}/man_skypirate_{g}_atk_v2/pirate_{n}'}
        src={k:v for k,v in src.items() if os.path.isfile(v+'/anim.json')}
        J={k:json.load(open(v+'/anim.json')) for k,v in src.items()}
        bx=[j['box'] for j in J.values()]
        U=(min(b[0] for b in bx),min(b[1] for b in bx),max(b[0]+b[2] for b in bx),max(b[1]+b[3] for b in bx))
        cw,ch=round((U[2]-U[0])*R),round((U[3]-U[1])*R)
        for k,d in src.items():
            j=J[k]; x,y,w,h=j['box']; out=f'{A}/man_skypirate_{g}_{k}_v3/pirate_{n}'; os.makedirs(out,exist_ok=True)
            for f in os.listdir(out): os.remove(f'{out}/{f}')
            fs=sorted(f for f in os.listdir(d) if f.startswith('frame_'))
            for f in fs:
                im=Image.open(f'{d}/{f}').convert('RGBA').resize((round(w*R),round(h*R)),Image.LANCZOS)
                c=Image.new('RGBA',(cw,ch),(0,0,0,0)); c.paste(im,(round((x-U[0])*R),round((y-U[1])*R)),im)
                c.save(f'{out}/{f}','WEBP',quality=85,alpha_quality=90,method=6); tot+=os.path.getsize(f'{out}/{f}')
            nj=dict(j); nj['box']=[U[0],U[1],U[2]-U[0],U[3]-U[1]]; nj['frames']=len(fs)
            nj['note']=(j.get('note','')+'；v3：待機／攻擊／倒地同一個框（'+os.path.basename(os.path.dirname(d))+'）').lstrip('；')
            json.dump(nj,open(f'{out}/anim.json','w'),indent=1)
        print(g,n,list(src),nj['box'],(cw,ch))
print('total MB',round(tot/1e6,1))

# 空賊 v6 剪法（Ray 11-09）：17 格裡取「頭兩格（0、1）＋ 中間無槍火一格 ＋ 槍火最大那一格」，4 張全 ×1、24fps。
# 槍火格／中間格是逐支看縮圖定的（自動偵測抓不準：Wan 把火光畫成淡灰白，跟身體移動混在一起）。
# 槍火最大＝第一發開槍的火光最大格；中間格＝第 1 格到槍火格之間、沒有槍火、最靠中間的那一格。
import json, os, shutil, sys
HERE=os.path.dirname(os.path.abspath(__file__)); SRC=os.path.join(HERE,'out','pirate_atk_v6'); EXP=os.path.join(HERE,'out','export')
PICK={  # 人：(中間無槍火格, 槍火最大格)
 'sp1_pirate_1':(4,7),'sp1_pirate_2':(3,6),'sp1_pirate_3':(2,5),'sp1_pirate_4':(6,11),
 'sp2_pirate_1':(6,11),'sp2_pirate_2':(2,3),'sp2_pirate_3':(3,4),'sp2_pirate_4':(6,11),
 'sp3_pirate_1':(6,10),'sp3_pirate_2':(3,5),'sp3_pirate_3':(6,11),'sp3_pirate_4':(3,4),
 'sp4_pirate_1':(3,6),'sp4_pirate_2':(2,7),'sp4_pirate_3':(3,4),
 'sp5_pirate_1':(6,11),'sp5_pirate_2':(2,4),'sp5_pirate_3':(2,5),'sp5_pirate_4':(6,11),
 'sp6_pirate_1':(2,3),'sp6_pirate_2':(3,5),'sp6_pirate_3':(6,11),
}
for k,(M,F) in PICK.items():
    n=k+'_A_L17'; d=os.path.join(SRC,n); out=os.path.join(EXP,n+'_cut')
    if not os.path.isdir(d): print('missing',n); continue
    if os.path.isdir(out) and '--force' not in sys.argv: continue
    kept=[0,1,M,F]; os.makedirs(out,exist_ok=True)
    for j,i in enumerate(kept): shutil.copy(os.path.join(d,'frame_%02d.webp'%i),os.path.join(out,'frame_%02d.webp'%j))
    json.dump({'from':'pirate_atk_v6/'+n,'kept_index':kept,'holds':[1]*4,'fps':24,'rule':'Ray 11-09'},open(os.path.join(out,'export.json'),'w'),indent=1)
    print(n,kept)

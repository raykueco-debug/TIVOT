# KF 審閱 Excel（Ray 11-09：「出 exl」）：每隻一列，原圖／新 A／B 圖嵌縮圖，最後兩欄給 Ray 填
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XImg
from openpyxl.styles import Alignment, Font, PatternFill
from PIL import Image
import importlib.util
spec=importlib.util.spec_from_file_location('r',os.path.join(os.path.dirname(os.path.abspath(__file__)),'make_kf_review.py'))
src=open(spec.origin,encoding='utf-8').read().split("LBL=")[0]; ns={}; exec(src,ns)
ROWS=ns['ROWS']; T=ns['T']; K=ns['K']
COLS=[('原圖',None),('新 A 中立','A_neutral'),('B 攻擊（撲咬／撲抓）','B_bite'),('B 攻擊②','B_bite_2'),('B 延時（爪／斜劈）','B_claw'),('B 延時②','B_claw_2|B_claw_v2')]
TH=340; tmp=tempfile.mkdtemp()
wb=Workbook(); ws=wb.active; ws.title='KF審閱'
head=['編號','敵人','走法','表上寫的動作','問題']+[c[0] for c in COLS]+['A 攻擊','D 延時','M 點錯','I 待機','R 收回','E 倒地','備註']
ws.append(head)
for c in ws[1]: c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='333344'); c.alignment=Alignment(wrap_text=True,vertical='center')
widths=[6,16,7,20,26]+[31]*len(COLS)+[16]*6+[28]
from openpyxl.utils import get_column_letter as L
for i,w in enumerate(widths): ws.column_dimensions[L(i+1)].width=w
def thumb(p,name):
    im=Image.open(p).convert('RGBA'); s=TH/im.height; im=im.resize((round(im.width*s),TH),Image.LANCZOS)
    bg=Image.new('RGBA',im.size,(70,70,82,255)); bg.alpha_composite(im); q=os.path.join(tmp,name+'.png'); bg.convert('RGB').save(q); return q
for r,(no,name,key,orig,rule,table,note) in enumerate(ROWS,start=2):
    ws.append([no,name,rule,table,note])
    ws.row_dimensions[r].height=TH*0.75+6
    for c in range(1,len(head)+1): ws.cell(r,c).alignment=Alignment(wrap_text=True,vertical='center')
    for c in range(6+len(COLS),len(head)+1): ws.cell(r,c).fill=PatternFill('solid',fgColor='FFF8DC')
    if note.startswith('⚠'): ws.cell(r,5).font=Font(color='C00000')
    for j,(lbl,tag) in enumerate(COLS):
        if tag is None: p=f'{T}/{orig}.webp'
        else:
            p=None
            for t in tag.split('|'):
                q=f'{K}/cm_{key}_{t}.png'
                if os.path.exists(q): p=q; break
        if not p or not os.path.exists(p): continue
        img=XImg(thumb(p,f'{key}_{j}')); ws.add_image(img, f'{chr(70+j)}{r}')
ws.freeze_panes='C2'
out='C:/Users/Ray Ku/Desktop/TIVOT/敵人KF審閱_1109.xlsx'; wb.save(out); print(out)

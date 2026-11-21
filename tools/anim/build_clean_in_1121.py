# 2026-11-21 空戰動畫副理：空賊船 4、5 號「只動帆跟槳」的 VACE 輸入（Ray：「讓 Wan inpaint 只動帆跟槳 這樣就不會有浪了吧」）。
# 底＝原立繪（綠底、TIVOT_FIT 0.86，同待機那一套取景）×49 格；遮罩＝帆（暗、低彩度、甲板以上）膨脹 ＋ 螺旋槳框。船身不在遮罩裡 ⇒ 逐像素照抄原圖，不會長浪。
import os, sys, numpy as np, cv2
os.environ.setdefault('TIVOT_GEN', '720x480'); os.environ.setdefault('TIVOT_FIT', '0.86')
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tivot_wan as tw
SRC = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
# deck＝甲板線（生成畫面高的比例，以上才算帆）；prop＝螺旋槳框（0~1，同 batch_skyships_prop_1121.py）
JOBS = {'mon_pirateship_n4_side': dict(deck=0.665, prop=(0.865, 0.55, 0.955, 0.80)),
        'mon_pirateship_n5_side': dict(deck=0.615, prop=(0.855, 0.55, 0.955, 0.80))}
for name, j in JOBS.items():
    g = tw.to_green(os.path.join(SRC, name + '.webp'), 'idle'); a = np.asarray(g).astype(int)
    r, gg, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1)
    fg = (gg - np.maximum(r, b)) < 40
    sail = fg & (mx < 120) & ((mx - mn) < 45)
    sail[int(j['deck'] * tw.H):] = False
    sail = cv2.morphologyEx(sail.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    sail = cv2.dilate(cv2.morphologyEx(sail, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)), np.ones((15, 15), np.uint8)) > 0
    sail[int(j['deck'] * tw.H):] = False                 # 膨脹也不准吃到甲板以下
    x0, y0, x1, y1 = j['prop']; sail[round(y0 * tw.H):round(y1 * tw.H), round(x0 * tw.W):round(x1 * tw.W)] = True
    d = os.path.join(HERE, 'in_clean', name); os.makedirs(d, exist_ok=True)
    for i in range(49): g.save(os.path.join(d, f'frame_{i:02d}.png'))
    Image.fromarray((sail * 255).astype(np.uint8)).save(os.path.join(d, '_mask.png'))
    ov = a.copy(); ov[sail] = (ov[sail] * 0.45 + np.array([255, 0, 0]) * 0.55).astype(int)
    Image.fromarray(ov.astype(np.uint8)).save(os.path.join(d, '_mask_preview.png'))
    print(name, f'遮罩 {sail.mean()*100:.1f}%', flush=True)

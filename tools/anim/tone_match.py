# 分離怪色調對齊節制者（ver -2990，Ray 11-24：「色調校對成跟節制者一樣」）
# 用法：python tone_match.py <參考立繪> <來源立繪> <輸出目錄或檔案>...
#  · 只拿「白色皮肉」（alpha>128、L>55、彩度<15）算 Lab 的平均與標準差 —— 節制者身上的鐵鏈很暗，整張平均會把分離怪壓黑
#  · 同一組轉換（由兩張立繪算出）套到來源立繪與牠所有動畫格，格與格之間不會跳色
#  · 原檔先由呼叫端走 tools/recycle.sh 回收；這支只讀 <檔>.orig 寫回 <檔>（見 main）
import sys, os, glob
import numpy as np, cv2
from PIL import Image

def flesh_stats(p):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32)
    l = cv2.cvtColor(a[..., :3] / 255, cv2.COLOR_RGB2LAB)
    m = (a[..., 3] > 128) & (l[..., 0] > 55) & (np.hypot(l[..., 1], l[..., 2]) < 15)
    return [(l[..., c][m].mean(), l[..., c][m].std()) for c in range(3)]

def apply(src, dst, A, B):
    im = Image.open(src).convert('RGBA'); a = np.asarray(im).astype(np.float32)
    l = cv2.cvtColor(a[..., :3] / 255, cv2.COLOR_RGB2LAB); o = l.copy()
    for c in range(3):
        o[..., c] = (l[..., c] - A[c][0]) / (A[c][1] + 1e-6) * B[c][1] + B[c][0]
    rgb = np.clip(cv2.cvtColor(o, cv2.COLOR_LAB2RGB), 0, 1) * 255
    out = Image.fromarray(np.dstack([rgb, a[..., 3]]).astype(np.uint8), 'RGBA')
    if dst.lower().endswith('.webp'): out.save(dst, 'WEBP', quality=88, alpha_quality=92, method=6)
    else: out.save(dst)

if __name__ == '__main__':
    ref, srcp, targets = sys.argv[1], sys.argv[2], sys.argv[3:]
    B, A = flesh_stats(ref), flesh_stats(srcp)
    print('來源', [tuple(round(float(x), 1) for x in t) for t in A], '→ 參考', [tuple(round(float(x), 1) for x in t) for t in B])
    n = 0
    for t in targets:   # t＝原路徑；讀 t+'.orig'（呼叫端先複製出來）寫回 t
        files = sorted(glob.glob(os.path.join(t, 'frame_*.webp'))) if os.path.isdir(t) else [t]
        for f in files:
            apply(f + '.orig' if os.path.exists(f + '.orig') else f, f, A, B); n += 1
    print('改了', n, '張')

# 綠幕重新去背（實心版）：白衣服帶綠反光時原本的 key 會把衣服變半透明。
# 做法：先粗判綠幕（明顯偏綠）→ 人物＝非綠幕的最大區塊、填洞 → 內部 alpha=1，只在邊緣 2px 柔化；顏色去綠溢。
# 用法：python rekey_solid.py <ComfyUI 輸出前綴> <輸出資料夾>
import glob, os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tivot_wan import COMFY
pre, od = sys.argv[1], sys.argv[2]; os.makedirs(od, exist_ok=True)
paths = sorted(glob.glob(os.path.join(COMFY, 'output', 'tivotwan', pre + '_*.png')), key=os.path.getmtime)[-49:]
paths = sorted(paths)
for i, p in enumerate(paths[:-1]):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = ((g - np.maximum(r, b)) > 60) & (g > 120)
    fg = (~green).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, 8)
    keep = np.zeros_like(fg)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] > 300: keep[lab == k] = 1
    inv = (1 - keep).astype(np.uint8); n2, lab2 = cv2.connectedComponents(inv, connectivity=4)
    border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]])))
    holes = (inv > 0) & ~np.isin(lab2, list(border))
    gs = (g - np.maximum(r, b)); holes &= ~((gs > 90) & (g > 150))      # 真的透出綠幕的大洞（手臂間）保留透明
    m = (keep | holes).astype(np.float32)
    m = cv2.GaussianBlur(cv2.erode(m, np.ones((2, 2), np.uint8)), (0, 0), 0.8)
    g2 = np.minimum(g, (r + b) / 2 + 10)                                 # 去綠溢
    out = np.dstack([r, g2, b, m * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', lossless=True)
print(len(paths) - 1, 'frames', od)

# 綠眼不被綠幕吃掉：從 ComfyUI 原始輸出重新去背，臉部範圍內「沒有連到外圍綠幕」的綠色區塊（眼睛）保留不去背。
# 用法：python rekey_eyes.py <原始輸出前綴，如 sorana_roarG_77> <輸出資料夾>
import glob, os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tivot_wan import deflicker, key, COMFY
pre, od = sys.argv[1], sys.argv[2]; os.makedirs(od, exist_ok=True)
FX0, FY0, FX1, FY1 = 130, 80, 270, 180      # 480×720 上的臉部範圍
paths = sorted(glob.glob(os.path.join(COMFY, 'output', 'tivotwan', pre + '_*.png')))
raw = [np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in paths]
arrs = deflicker(raw)
for i in range(len(arrs) - 1):
    a = arrs[i]; k = np.array(key(a))
    g = ((a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 25).astype(np.uint8)
    n, lab = cv2.connectedComponents(g, connectivity=8)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    keep = (g > 0) & ~np.isin(lab, list(border))
    face = np.zeros_like(keep); face[FY0:FY1, FX0:FX1] = True
    keep &= face
    keep = cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    k[keep, :3] = np.clip(a[keep], 0, 255).astype(np.uint8); k[keep, 3] = 255
    Image.fromarray(k).save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', lossless=True)
print(len(arrs) - 1, 'frames', od)

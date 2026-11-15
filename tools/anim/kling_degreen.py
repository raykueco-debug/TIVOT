# Kling 綠底 mp4 → 去背格（frame_NN.webp，原尺寸）放進 ComfyUI out/<目錄>，給 animechk 與 auto_cut 用
# 用法：python kling_degreen.py <mp4> <out 底下的相對資料夾，例：monsters/kling_censer_atk_16x9_3s>
# 綠幕去背公式同 deliver_kling.key（tivot_wan.key 那一條）
import glob, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'ComfyUI-master', 'tivot_wan', 'out')

def key(arr):
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    al = 1 - np.clip((g - np.maximum(r, b) - 25) / 70, 0, 1)
    g2 = np.minimum(g, (r + b) / 2 + 6)
    return Image.fromarray(np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8))

mp4, rel = sys.argv[1], sys.argv[2]
od = os.path.join(OUT, rel); os.makedirs(od, exist_ok=True)
for f in glob.glob(os.path.join(od, 'frame_*.webp')): os.remove(f)
with tempfile.TemporaryDirectory() as td:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, os.path.join(td, 'f_%03d.png')], check=True)
    fs = sorted(glob.glob(os.path.join(td, 'f_*.png')))
    for i, f in enumerate(fs):
        key(np.asarray(Image.open(f).convert('RGB')).astype(float)).save(os.path.join(od, f'frame_{i:02d}.webp'), 'WEBP', quality=88)
print(f'{rel}：{len(fs)} 格')

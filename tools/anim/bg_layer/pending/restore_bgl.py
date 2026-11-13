"""換機後：把 pending/comfy_output_bgl/*.webp 轉回 PNG 放進 ComfyUI-master/output/bgl/（sep_run 讀 PNG）。"""
import os, sys, cv2
src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'comfy_output_bgl')
dst = sys.argv[1] if len(sys.argv) > 1 else r'C:/Users/Ray Ku/Desktop/ComfyUI-master/output/bgl'
os.makedirs(dst, exist_ok=True)
for f in os.listdir(src):
    if f.endswith('.webp'): cv2.imwrite(os.path.join(dst, f[:-5] + '.png'), cv2.imread(os.path.join(src, f), cv2.IMREAD_UNCHANGED))
print('done')

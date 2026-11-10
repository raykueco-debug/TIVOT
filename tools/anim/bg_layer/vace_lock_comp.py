"""bg_vace_lock 的合成：丟最後一格（＝第 0 格）、放大回原圖尺寸、動區以外貼原圖。
用法：python vace_lock_comp.py <notes key> <Wan 前綴> <輸出名> [動區外擴px] [fps]"""
import os, sys, json, glob, subprocess
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(os.path.dirname(HERE))
key, pre, name = sys.argv[1:4]; grow = int(sys.argv[4]) if len(sys.argv) > 4 else 24; fps = int(sys.argv[5]) if len(sys.argv) > 5 else 16
j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
still = np.array(Image.open(os.path.join(r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background', j['file'])).convert('RGB')).astype(np.float32)
H, W = still.shape[:2]; H -= H % 2; W -= W % 2; still = still[:H, :W]
mv = np.zeros((H, W), np.uint8)
for c in j['colors']:
    mv |= (np.array(Image.open(os.path.join(HERE, 'notes', key, c['mask'])).convert('L').resize((W, H))) > 127).astype(np.uint8)
g = int(grow * W / 768); mv = cv2.dilate(mv, np.ones((g * 2 + 1,) * 2, np.uint8)).astype(np.float32)
M = cv2.GaussianBlur(mv, (0, 0), 3 * W / 768)[..., None]
fr = sorted(glob.glob(os.path.join(COMFY, 'output', pre + '_*.png')))[:-1]
out = os.path.join(HERE, 'out', name); os.makedirs(out, exist_ok=True)
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
for f in fr:
    x = cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    p.stdin.write((still * (1 - M) + x * M).clip(0, 255).astype(np.uint8).tobytes())
p.stdin.close(); p.wait()
json.dump(dict(method='vace_lock', key=key, frames=len(fr), fps=fps, pre=pre), open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False)
print(out, len(fr))

# Kling 影片交件（敵人攻擊）：綠底 mp4 → 去背 webp ＋ anim.json（格式同 deliver_kf2 的程式端版）
# 用法：python deliver_kling.py <mp4> <立繪.webp> <送 Kling 前的對齊圖 wanA.png> <dst 資料夾> [--fit 0.78] [--canvas 1080x1920] [--fps 24]
#  · 輸入鏈：立繪 → kf_align_bbox（A 不縮放，只平移）→ wanA → 等比縮到 canvas×fit、置中貼綠底 → Kling
#  · 這支做逆變換：Kling 像素 → canvas 像素 → wanA 座標 → 立繪座標（平移由兩張 alpha>128 的 bbox 左上角求）
#  · 綠幕去背用 tivot_wan.key 同一條公式；格子在生成座標裁聯集框、原尺寸存，box 換算回立繪畫布、px＝實際像素
import argparse, glob, json, os, subprocess, tempfile
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('mp4'); ap.add_argument('portrait'); ap.add_argument('wanA'); ap.add_argument('dst')
ap.add_argument('--fit', type=float, default=0.78); ap.add_argument('--canvas', default='1080x1920'); ap.add_argument('--fps', type=int, default=24)
a = ap.parse_args()
CW, CH = map(int, a.canvas.split('x'))

def key(arr):
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    al = 1 - np.clip((g - np.maximum(r, b) - 25) / 70, 0, 1)
    g2 = np.minimum(g, (r + b) / 2 + 6)
    return Image.fromarray(np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8))

bb = lambda im, t=128: im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()
por, wanA = Image.open(a.portrait).convert('RGBA'), Image.open(a.wanA).convert('RGBA')
bp, bw = bb(por), bb(wanA)
tx, ty = bw[0] - bp[0], bw[1] - bp[1]                      # 立繪在 wanA 畫布裡的位置
s = min(CW * a.fit / wanA.width, CH * a.fit / wanA.height)
iw, ih = round(wanA.width * s), round(wanA.height * s)
ox, oy = (CW - iw) // 2, (CH - ih) // 2                     # 同準備 Kling 輸入那一段

tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a.mp4, os.path.join(tmp, 'f_%03d.png')], check=True)
fs = sorted(glob.glob(os.path.join(tmp, 'f_*.png')))
keyed = [key(np.asarray(Image.open(f).convert('RGB')).astype(np.float32)) for f in fs]
VW, VH = keyed[0].size; k = VW / CW                          # 影片像素 / canvas 像素
boxes = [bb(im, 8) for im in keyed]
U = (min(b[0] for b in boxes if b), min(b[1] for b in boxes if b), max(b[2] for b in boxes if b), max(b[3] for b in boxes if b))
os.makedirs(a.dst, exist_ok=True)
areas, tot = [], 0
for i, im in enumerate(keyed):
    c = im.crop(U); fn = os.path.join(a.dst, f'frame_{i:02d}.webp'); c.save(fn, 'WEBP', quality=82); tot += os.path.getsize(fn)
    areas.append(int((np.asarray(im)[..., 3] > 128).sum()))
cw, ch = U[2] - U[0], U[3] - U[1]
box = [round((U[0] / k - ox) / s - tx), round((U[1] / k - oy) / s - ty), round(cw / k / s), round(ch / k / s)]
json.dump({'canvas': list(por.size), 'box': box, 'frames': len(keyed), 'fps': a.fps, 'loop': False, 'px': [cw, ch]},
          open(os.path.join(a.dst, 'anim.json'), 'w', encoding='utf-8'), indent=1)
peak = int(np.argmax(areas))
edge = sum(1 for b in boxes if b and (b[0] <= 2 or b[1] <= 2 or b[2] >= VW - 2 or b[3] >= VH - 2))
print(f'{len(keyed)} 格／{len(keyed)/a.fps:.2f} 秒，主體最大＝第 {peak} 格，碰邊 {edge} 格，box {box}，px {cw}x{ch}，{tot//1024} KB')

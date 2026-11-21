"""空中怪 3D：把四視圖 _cells/ 裡翅膀的細紋路收淡（Ray 11-21：蜈蚣「翅膀紋路少一點」）。

用法：python tools/sky3d/wing_veins.py <鍵> <核大小> [淡化比例 0~1，預設 1] [輸出資料夾]
  翅膀區＝淺色、低彩度的那一片（膨脹後補上紋路、再往內縮幾像素保住外框線）；
  在翅膀區裡做灰階閉運算（先取最大再取最小）：比核細的深色線消失，粗的主脈留下。
  不給輸出資料夾＝寫到 <鍵>_cells_veinK/（不覆蓋原本的 _cells）。
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(ROOT, 'resources', '_originals', 'flight', 'mon3d')


def run(key, k, mix, out):
    src = os.path.join(D, key + '_cells'); os.makedirs(out, exist_ok=True)
    for f in ['front', 'side', 'back', 'top']:
        im = Image.open(os.path.join(src, f + '.png')).convert('RGBA'); a = np.asarray(im).astype(np.int16)
        rgb = a[..., :3]; mx, mn = rgb.max(-1), rgb.min(-1)
        pale = (mn > 150) & (mx - mn < 60) & (a[..., 3] > 0)
        m = Image.fromarray((pale * 255).astype(np.uint8))
        m = m.filter(ImageFilter.MaxFilter(k + 4)).filter(ImageFilter.MinFilter(k + 4))   # 補上紋路的縫
        m = m.filter(ImageFilter.MinFilter(7))                                          # 往內縮：外框線不動
        wing = np.asarray(m) > 127
        rgbim = Image.fromarray(rgb.astype(np.uint8))
        closed = np.asarray(rgbim.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))).astype(np.int16)
        o = a.copy(); o[..., :3] = np.where(wing[..., None], (closed * mix + rgb * (1 - mix)).round(), rgb)
        Image.fromarray(o.astype(np.uint8), 'RGBA').save(os.path.join(out, f + '.png'))
        print(f, 'wing px', int(wing.sum()))


if __name__ == '__main__':
    key, k = sys.argv[1], int(sys.argv[2]); mix = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    run(key, k, mix, sys.argv[4] if len(sys.argv) > 4 else os.path.join(D, f'{key}_cells_vein{k}_{int(mix*100)}'))

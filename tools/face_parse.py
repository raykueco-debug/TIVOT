#!/usr/bin/env python3
"""眨眼工具：臉部分割＋特徵點實測（在 3060/3070 那台的 .venv-face 裡跑）。

  .\\.venv-face\\Scripts\\python tools\\face_parse.py            # 預設五張壓力測試圖
  .\\.venv-face\\Scripts\\python tools\\face_parse.py anya_si_front misha_si_front

做的事：
  1. anime-face-detector（hysts，MIT）找臉框＋28 個特徵點
  2. 以臉框為中心裁正方形（兩種大小），白底合成後縮到 512，送進
     Anime-Face-Segmentation（siyeong0，MIT）的 UNet，逐像素分 7 類
  3. 輸出到 tools/_blink_seg/<圖名>/：
       overlay_s<倍率>.png   分割色塊疊回原圖（含特徵點與編號），驗收用
       classes_s<倍率>.png   類別圖（0 背景 1 頭髮 2 眼睛 3 嘴 4 臉 5 皮膚 6 衣服），原圖座標
       face.json            臉框、28 點、裁切框
     以及 tools/_blink_seg/sheet.png（全部一張總覽）

類別順序以 util.py 的 PALETTE 為準（network.py 註解的順序與它不同，argmax 的位置跟 PALETTE）。
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEG_REPO = os.path.join(ROOT, '_ext', 'Anime-Face-Segmentation')
OUT = os.path.join(ROOT, 'tools', '_blink_seg')
DEFAULT = ['anya_si_front', 'renna_si_front', 'sorana_si_side', 'nouvelle_si_front', 'misha_si_front']
SCALES = (1.6, 2.4)            # 裁切邊長＝臉框長邊 × 倍率
NAMES = ['背景', '頭髮', '眼睛', '嘴', '臉', '皮膚', '衣服']
COLORS = [(0, 0, 0), (255, 60, 60), (40, 120, 255), (255, 255, 255), (60, 220, 60), (255, 220, 0), (220, 0, 220)]


def load_models():
    import torch
    from anime_face_detector import create_detector
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    det = create_detector('yolov3', device=dev)
    sys.path.insert(0, SEG_REPO)
    from network import UNet
    net = UNet()
    net.load_state_dict(torch.load(os.path.join(SEG_REPO, 'model', 'UNet.pth'), map_location=dev))
    net.to(dev).eval()
    return det, net, dev


def segment(net, dev, crop_rgb):
    import torch
    x = torch.from_numpy(np.asarray(crop_rgb.resize((512, 512), Image.BICUBIC), np.float32) / 255.0)
    x = x.permute(2, 0, 1).unsqueeze(0).to(dev)
    with torch.no_grad():
        y = net(x)[0].cpu().numpy()          # 7×512×512 機率
    return y


def main():
    names = sys.argv[1:] or DEFAULT
    det, net, dev = load_models()
    os.makedirs(OUT, exist_ok=True)
    tiles = []
    for n in names:
        src = os.path.join(ROOT, 'resources', 'si', n + '.webp')
        im = Image.open(src).convert('RGBA')
        W, H = im.size
        white = Image.new('RGBA', im.size, (255, 255, 255, 255)); white.alpha_composite(im)
        rgb = white.convert('RGB')
        res = det(np.asarray(rgb)[:, :, ::-1].copy())
        od = os.path.join(OUT, n); os.makedirs(od, exist_ok=True)
        if not res:
            print(n, '找不到臉'); continue
        f = max(res, key=lambda r: r['bbox'][4])
        x0, y0, x1, y1, sc = [float(v) for v in f['bbox']]
        kp = [[float(a), float(b), float(c)] for a, b, c in f['keypoints']]
        meta = {'bbox': [x0, y0, x1, y1, sc], 'keypoints': kp, 'crops': {}}
        cx, cy, side0 = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0)
        for s in SCALES:
            side = side0 * s
            box = [int(round(cx - side / 2)), int(round(cy - side / 2)), int(round(cx + side / 2)), int(round(cy + side / 2))]
            crop = Image.new('RGB', (box[2] - box[0], box[3] - box[1]), (255, 255, 255))
            crop.paste(rgb.crop((max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3]))),
                       (max(0, -box[0]), max(0, -box[1])))
            prob = segment(net, dev, crop)
            cls512 = prob.argmax(0).astype(np.uint8)
            cls = np.array(Image.fromarray(cls512).resize(crop.size, Image.NEAREST))
            # 類別圖（原圖座標，框外＝255）
            full = np.full((H, W), 255, np.uint8)
            sx0, sy0 = max(0, box[0]), max(0, box[1]); sx1, sy1 = min(W, box[2]), min(H, box[3])
            full[sy0:sy1, sx0:sx1] = cls[sy0 - box[1]:sy1 - box[1], sx0 - box[0]:sx1 - box[0]]
            Image.fromarray(full).save(os.path.join(od, f'classes_s{s}.png'))
            # 疊圖
            col = np.array(COLORS, np.uint8)[cls]
            base = np.asarray(crop, np.float32)
            ov = Image.fromarray((base * 0.55 + col * 0.45).astype(np.uint8))
            d = ImageDraw.Draw(ov)
            for i, (a, b, c) in enumerate(kp):
                px, py = a - box[0], b - box[1]
                d.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(255, 255, 255), outline=(0, 0, 0))
                d.text((px + 4, py - 6), str(i), fill=(0, 0, 0))
            ov = ov.resize((512, 512), Image.LANCZOS)
            ov.save(os.path.join(od, f'overlay_s{s}.png'))
            meta['crops'][str(s)] = box
            share = {NAMES[k]: round(float((cls == k).mean()), 3) for k in range(7)}
            print(n, f's{s}', '類別佔比', share)
            tiles.append((n, s, ov))
        json.dump(meta, open(os.path.join(od, 'face.json'), 'w'), ensure_ascii=False, indent=1)
    # 總覽：每張圖一列，兩種裁切並排
    if tiles:
        rows = sorted({t[0] for t in tiles}, key=names.index)
        sheet = Image.new('RGB', (512 * len(SCALES) + 10 * (len(SCALES) - 1), 512 * len(rows) + 10 * (len(rows) - 1)), (20, 20, 24))
        for n, s, ov in tiles:
            sheet.paste(ov, (SCALES.index(s) * 522, rows.index(n) * 522))
        sheet.save(os.path.join(OUT, 'sheet.png'))
    print('\n輸出在', OUT)
    print('傳回來給 Claude：')
    print('  git add tools/_blink_seg')
    print('  git commit -m "眨眼：臉部分割實測結果"')
    print('  git push')


if __name__ == '__main__':
    main()

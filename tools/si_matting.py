#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/si_matting.py —— 本機 matting 去背（ver -1516，3060 那台）

  為什麼是 matting 而不是「去背腳本」（`resources/SI/_alpha_matting_eval.md`）：

  ver -1503 那 78 張白霧，病灶**不在判準**，在**沒有解前景色**。
  影像合成方程式是  I = αF + (1−α)B。白底圖的 B 已知是白，
  邊緣那個像素的顏色 I **本來就混了白**；只把它「變半透明」而不動顏色，
  留下的就是「半透明的白」⇒ 疊深色背景 ＝ 白霧。

  GPT 重繪之所以邊緣乾淨，是因為它**重畫了前景色** —— 髮絲邊緣那個像素，
  它畫的是「頭髮真正的顏色」。matting 在結果上等價、機制不同：
  **同時解出 α 與真正的前景色 F**，而且**不重畫，所以角色 100% 不可能變**。

  ⚠⚠⚠ `estimate_foreground_ml` 那一步**不可省** —— 省掉它這支工具就退化成
    ver -1503 那個被退件的東西。unpremultiply（F=(I−(1−α)B)/α）實測只到 6.3%，
    仍然不及格；它在 α→0 的地方會炸開，而髮絲邊緣全是 α→0。

  用法：
      python3 tools/si_matting.py <白底圖…> --out <目錄>
      python3 tools/si_matting.py resources/_originals/_matting_eval/input/*.png \\
              --out resources/_originals/_matting_eval/out_birefnet

  驗收一律走 `tools/matting_eval.py score` ＋ `crops`，不要用眼睛看縮圖。

  ⚠ 這支要在 `.venv-matting` 裡跑（系統 python 的 transformers 5.x 擋 torch<2.4）：
      .venv-matting/Scripts/python.exe tools/si_matting.py …

  授權（憲法鐵律 12：這遊戲要上架，non-commercial 一律不准進產線）：
      BiRefNet  ZhengPeng7/BiRefNet-matting   MIT         ✔
      pymatting                                MIT         ✔
      ⛔ RMBG-2.0 (BRIA) 是 non-commercial，效果再好都不准用
"""
import os, sys, glob, time, argparse
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py
import numpy as np
from PIL import Image

MODELS = {
    'birefnet-matting': 'ZhengPeng7/BiRefNet-matting',   # 有 matting 權重，髮絲最強
    'birefnet': 'ZhengPeng7/BiRefNet',                   # 通用版，當對照
}
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def load_model(name, device, fp16=True):
    import torch
    from transformers import AutoModelForImageSegmentation
    m = AutoModelForImageSegmentation.from_pretrained(MODELS[name], trust_remote_code=True)
    m.eval().to(device)
    if fp16 and device == 'cuda':
        m.half()
    return m


def predict_alpha(model, rgb, size, device, fp16=True):
    """rgb: HxWx3 uint8（白底）→ 與原圖同尺寸的 float alpha [0,1]。"""
    import torch
    H, W = rgb.shape[:2]
    im = Image.fromarray(rgb).resize((size, size), Image.BILINEAR)
    x = (np.asarray(im).astype(np.float32) / 255.0 - MEAN) / STD
    x = torch.from_numpy(x.transpose(2, 0, 1))[None].to(device)
    if fp16 and device == 'cuda':
        x = x.half()
    with torch.no_grad():
        pred = model(x)[-1].sigmoid()          # BiRefNet 回一串，最後一個是主輸出
    a = pred[0, 0].float().cpu().numpy()
    # 回到原尺寸：alpha 要用雙線性，不要用 nearest（髮絲邊緣會鋸齒）
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR),
                      dtype=np.float32) / 255.0


def solve_foreground(rgb, alpha):
    """解真正的前景色 F —— 白霧的解法，整支工具的重點。

    ⚠ 不要換成 unpremultiply：那條在 α→0 的地方會炸，而髮絲邊緣全是 α→0
      （ver -1503 實測 35.3% → 6.3%，仍然不及格）。
    """
    from pymatting import estimate_foreground_ml
    img = rgb.astype(np.float64) / 255.0
    return estimate_foreground_ml(img, alpha.astype(np.float64))


def refine_cf(rgb, alpha, band=12):
    """closed-form matting 精修：把 BiRefNet 的軟 alpha 當 trimap 的來源再解一次。

    只在 `--refine cf` 時走。慢（1024x1536 約數十秒），所以預設關。
    """
    from pymatting import estimate_alpha_cf
    import scipy.ndimage as ndi
    img = rgb.astype(np.float64) / 255.0
    fg = alpha > 0.98
    bg = alpha < 0.02
    # 往內縮一圈，中間留成未知區 —— 未知區就是髮絲那一帶
    fg = ndi.binary_erosion(fg, iterations=band)
    bg = ndi.binary_erosion(bg, iterations=band)
    tri = np.full(alpha.shape, 0.5, np.float64)
    tri[fg] = 1.0
    tri[bg] = 0.0
    return np.clip(estimate_alpha_cf(img, tri), 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inputs', nargs='+', help='白底圖（可用萬用字元）')
    ap.add_argument('--out', required=True, help='輸出目錄')
    ap.add_argument('--backend', default='birefnet-matting', choices=list(MODELS))
    ap.add_argument('--size', type=int, default=1024, help='模型輸入邊長')
    ap.add_argument('--refine', default='none', choices=['none', 'cf'])
    ap.add_argument('--fp32', action='store_true', help='關掉 fp16（對不上時拿來排除）')
    a = ap.parse_args()

    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    files = []
    for p in a.inputs:
        files += sorted(glob.glob(p)) if any(c in p for c in '*?[') else [p]
    if not files:
        print('⛔ 沒有輸入檔')
        return 1
    os.makedirs(a.out, exist_ok=True)

    print('backend %s / %s / size %d / refine %s' % (a.backend, device, a.size, a.refine))
    t0 = time.time()
    model = load_model(a.backend, device, fp16=not a.fp32)
    print('模型載入 %.1fs\n' % (time.time() - t0))

    for i, f in enumerate(files, 1):
        t = time.time()
        rgb = np.asarray(Image.open(f).convert('RGB'))
        alpha = predict_alpha(model, rgb, a.size, device, fp16=not a.fp32)
        if a.refine == 'cf':
            alpha = refine_cf(rgb, alpha)
        fg = solve_foreground(rgb, alpha)          # ⚠ 不可省
        rgba = np.concatenate([np.clip(fg * 255, 0, 255),
                               np.clip(alpha[:, :, None] * 255, 0, 255)], axis=2)
        name = os.path.splitext(os.path.basename(f))[0] + '.png'
        Image.fromarray(rgba.astype(np.uint8)).save(os.path.join(a.out, name))
        print('[%2d/%d] %-30s %.1fs' % (i, len(files), name, time.time() - t))

    print('\n✔ → %s' % a.out)
    print('⚠ 還沒驗收：python3 tools/matting_eval.py score %s' % a.out)
    return 0


if __name__ == '__main__':
    sys.exit(main())

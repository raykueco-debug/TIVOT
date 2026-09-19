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
    'birefnet-matting': 'ZhengPeng7/BiRefNet-matting',   # ⭐ 預設：GT 上四項全過（斜坡 1.13 倍）
    'birefnet-hr': 'ZhengPeng7/BiRefNet_HR',             # 單張看起來較銳利，但 GT 上斜坡 1.16 倍，沒過
    'birefnet': 'ZhengPeng7/BiRefNet',                   # 通用版，當對照
}
# ⚠ HR 那一筆是「憑一張圖的印象」與「拿 GT 量」給出相反答案的例子 —— 以量為準。
# ⛔ 測過、輸掉的（不要再花時間，ver -1516）：
#   · anime-segmentation (SkyTNT isnetis)  Apache-2.0
#     ONNX 的輸入**寫死 1024x1024**，而立繪是 1024x1536 ⇒ 一定要先等比縮到 682x1024
#     再貼進方形畫布，等於**縮小 1.5 倍再放大回來**。實測斜坡寬 6.3~7.0，
#     GT 是 3.2~4.5 —— **比 GT 糊兩倍**，而且這是模型介面決定的，改不掉。
#   · closed-form 精修（寬帶 6.39／窄 trimap 3.82 但透明區冒雜訊）、導引濾波（7.49）
#     —— 三種精修都讓邊更糟，不要再試。銳利度是**推論解析度**決定的，不是後處理。
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
    """rgb: HxWx3 uint8（白底）→ 與原圖同尺寸的 float alpha [0,1]。

    ⚠⚠⚠ **預設用原生解析度，不要縮成正方形**（ver -1516 踩過，Ray：「頭髮還是有白邊」）。
      立繪是 1024×1536。第一版照 BiRefNet 的範例縮成 1024×1024 推論，算完再把 alpha
      **垂直放大 1.5 倍**塞回去 —— 放大就是糊，於是每束頭髮外圍多一圈寬的淡色暈，
      那就是「白邊」。實測 alpha 斜坡寬（半透明像素 ÷ 邊界長）：

          GT（產圖端出的，好的） 3.37
          縮 1024 正方形          4.53   ⛔ 糊了 35%
          原生 1024×1536          3.47   ✔ 與 GT 幾乎一樣

    ⚠⚠ **而且這個病三個指標都抓不到** —— αMAE 只從 1.11 變 0.97、IoU 幾乎不動，
      因為 1~2px 的軟斜坡在整張圖裡佔比極小。**它只有把髮際放大到 6 倍才看得見。**
      ⇒ 驗收要看斜坡寬這個量，別只看那三個（`matting_eval.py` 已補）。
    """
    import torch
    H, W = rgb.shape[:2]
    if size:
        tw = th = size
    else:
        # 原生：只把邊長修到 32 的倍數（模型的 stride），不改長寬比
        tw, th = (max(32, round(W / 32) * 32), max(32, round(H / 32) * 32))
    im = rgb if (tw, th) == (W, H) else Image.fromarray(rgb).resize((tw, th), Image.BILINEAR)
    x = (np.asarray(im).astype(np.float32) / 255.0 - MEAN) / STD
    x = torch.from_numpy(x.transpose(2, 0, 1))[None].to(device)
    if fp16 and device == 'cuda':
        x = x.half()
    with torch.no_grad():
        pred = model(x)[-1].sigmoid()          # BiRefNet 回一串，最後一個是主輸出
    a = pred[0, 0].float().cpu().numpy()
    if a.shape != (H, W):
        # 回到原尺寸：alpha 要用雙線性，不要用 nearest（髮絲邊緣會鋸齒）
        a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR),
                       dtype=np.float32) / 255.0
    return a


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
    ap.add_argument('--size', type=int, default=0,
                    help='模型輸入邊長；0＝原生解析度（預設，不要改，見 predict_alpha 的註解）')
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

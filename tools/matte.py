#!/usr/bin/env python3
"""動漫立繪去背（ver -734）—— isnet-anime，本機推論

⚠⚠ 為什麼不用 `rembg` 整包：它的 alpha-matting 附屬功能相依 `numba/llvmlite`，
在這台的 Python 3.11 環境編不起來。核心推論其實只要 onnxruntime，
所以這裡直接跑 ONNX，少一層包裝。

模型：`~/.tivot_models/isnet-anime.onnx`（rembg 釋出的權重，**專門訓練動漫角色**）
—— 這正是白底 flood fill 做不到的部分：它輸出的是**逐像素的軟遮罩**，
髮絲有自己的半透明值，而不是二值輪廓加柔化。

用法：
    python3 tools/matte.py <輸入圖> [輸出.png] [--gamma 1.0] [--check]
"""
import sys, os
import numpy as np
from PIL import Image
import onnxruntime as ort

MODEL = os.path.expanduser("~/.tivot_models/isnet-anime.onnx")
SIZE = 1024


def matte(path, gamma=1.0):
    im = Image.open(path).convert("RGB")
    W, H = im.size

    x = np.array(im.resize((SIZE, SIZE), Image.BILINEAR)).astype(np.float32) / 255.0
    x = (x - 0.5) / 1.0
    x = x.transpose(2, 0, 1)[None]

    sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
    m = out[0][0] if out.ndim == 4 else out[0]
    m = (m - m.min()) / max(m.max() - m.min(), 1e-8)

    a = Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    al = np.array(a).astype(np.float32) / 255.0
    if gamma != 1.0:
        al = np.power(al, gamma)
    al = (al * 255).astype(np.uint8)

    rgba = np.dstack([np.array(im), al])
    soft = int(((al > 8) & (al < 247)).sum())
    return Image.fromarray(rgba, "RGBA"), {
        "size": (W, H),
        "transparent_pct": round(float((al < 8).mean()) * 100, 1),
        "soft_px": soft,
    }


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    flags = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    g = 1.0
    for i, f in enumerate(flags):
        if f == "--gamma" and i + 1 < len(flags):
            g = float(flags[i + 1])
    src = args[0]
    out, info = matte(src, g)
    print(f"{os.path.basename(src)}  {info['size'][0]}x{info['size'][1]}  "
          f"透明 {info['transparent_pct']}%  半透明髮絲邊 {info['soft_px']:,}px")
    if "--check" in flags:
        return
    dst = args[1] if len(args) > 1 else os.path.splitext(src)[0] + "_matte.png"
    out.save(dst)
    print("→", dst)


if __name__ == "__main__":
    main()

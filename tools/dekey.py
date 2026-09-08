#!/usr/bin/env python3
"""白底立繪去背（ver -734）

⚠⚠ 為什麼不用「把白色都變透明」：那會**連角色身上的白一起吃掉** ——
眼白、牙、獠牙、白毛、金屬高光、白衣。那正是「自動去背不可靠」的成因。

本工具只拿掉**與畫框邊緣相連**的白（從四邊 flood fill），
所以被角色包起來的白（眼白、牙、輪廓內的高光）一律保留。

用法：
    python3 tools/dekey.py <輸入圖> [輸出圖] [--thr 244] [--feather 2] [--check]

    --thr      多白算背景（三通道都 >= 這個值），預設 244
    --feather  邊緣柔化的寬度（像素），預設 2；0 = 硬邊
    --maxhole  被角色包住的白，超過幾個像素就當成背景破洞挖掉，預設 1200
    --check    只檢查不寫檔，印出會拿掉多少、保留了幾塊內部白
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage


def dekey(path, thr=244, feather=2, max_hole=1200):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    rgb = a[..., :3].astype(np.int16)

    # 1) 近白遮罩
    near_white = (rgb >= thr).all(axis=2)

    # 2) 只取「與邊緣相連」的那些白 —— 這一步就是與naive去背的差別
    lab, n = ndimage.label(near_white)
    border = np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])
    bg_ids = set(int(x) for x in np.unique(border) if x != 0)
    bg = np.isin(lab, list(bg_ids)) if bg_ids else np.zeros_like(near_white)

    # ⚠⚠ 只靠「與邊緣相連」是不夠的（ver -734，Ray 指出）：
    #    腿與腿之間、蛇盤繞的圈內、鹿角的縫隙 —— 那些白**被角色圍住**、
    #    碰不到畫框，卻仍然是背景。第一版把它們全留下來，變成一堆白洞。
    #    判準是**面積**：牙、眼白、高光都很小；被圍住的背景破洞很大。
    inner_white = near_white & ~bg
    ilab, inum = ndimage.label(inner_white)
    inner_blobs = int(inum)
    holes_removed = 0
    if inum:
        sizes = ndimage.sum(inner_white, ilab, range(1, inum + 1))
        big = np.where(sizes >= max_hole)[0] + 1     # 大於門檻 = 背景破洞
        if big.size:
            hole = np.isin(ilab, big)
            bg = bg | hole
            holes_removed = int(big.size)
            inner_blobs -= holes_removed

    # 3) alpha：背景 0、其餘 255
    alpha = np.where(bg, 0, 255).astype(np.uint8)

    # 4) 邊緣柔化 —— 在背景外擴 feather 像素的帶狀區域內，
    #    用「有多白」決定半透明，讓乾淨線稿的邊不會有鋸齒
    if feather > 0:
        grown = ndimage.binary_dilation(bg, iterations=feather)
        band = grown & ~bg
        if band.any():
            whiteness = rgb.min(axis=2).astype(np.float32)      # 越白越接近 255
            lo = float(thr) - 40.0
            t = np.clip((whiteness - lo) / (255.0 - lo), 0.0, 1.0)
            alpha[band] = ((1.0 - t[band]) * 255).astype(np.uint8)

    # 5) 去白邊：半透明處把顏色往「不含白」的方向還原
    af = alpha.astype(np.float32) / 255.0
    edge = (af > 0.02) & (af < 0.98)
    if edge.any():
        e = af[edge][:, None]
        src = rgb[edge].astype(np.float32)
        a[..., :3][edge] = np.clip((src - 255.0 * (1.0 - e)) / np.maximum(e, 1e-3), 0, 255).astype(np.uint8)

    a[..., 3] = alpha
    kept = float((alpha > 0).mean())
    return Image.fromarray(a, "RGBA"), {
        "removed_pct": round((1 - kept) * 100, 1),
        "inner_white_blobs": inner_blobs,
        "holes_removed": holes_removed,
        "size": im.size,
    }


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    flags = [x for x in sys.argv[1:] if x.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)

    def opt(name, default):
        for f in flags:
            if f.startswith("--" + name + "="):
                return int(f.split("=", 1)[1])
        if "--" + name in flags:
            i = sys.argv.index("--" + name)
            if i + 1 < len(sys.argv):
                return int(sys.argv[i + 1])
        return default

    src = args[0]
    thr = opt("thr", 244)
    feather = opt("feather", 2)
    max_hole = opt("maxhole", 1200)
    out, info = dekey(src, thr, feather, max_hole)

    print(f"{os.path.basename(src)}  {info['size'][0]}x{info['size'][1]}  "
          f"去掉背景 {info['removed_pct']}%  補除包圍式破洞 {info['holes_removed']} 塊  保留內部白（牙／眼／高光）{info['inner_white_blobs']} 塊")

    if "--check" in flags:
        return
    dst = args[1] if len(args) > 1 else os.path.splitext(src)[0] + "_cut.png"
    out.save(dst)
    print("→", dst)


if __name__ == "__main__":
    main()

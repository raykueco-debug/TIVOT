"""機戰式 CI 運鏡（Ray 2026-10-12）：特寫漂移 → 往後一躍拉到半身 → 落地過衝回正 → 接 Wan 原地動態。

運鏡由程式從高解析原圖逐格重取樣（不糊、可精準控制緩急）；人在動（乳搖／頭髮／衣擺）交給 Wan。
接點：運鏡最後一格＝結尾圖原尺寸＝Wan 那段的第 0 格（同一張圖，不做淡化）。

用法：
  python cam_cut.py --close A.png --end B.png --wan out/ci/<Wan 資料夾> --face 655,245 --zoom 2.5 --out out/ci/<名字>
  --face  結尾圖上「臉的中心」（結尾圖原尺寸座標）—— 起跳那一格把鏡頭對準這裡
  --zoom  起跳那一格相對結尾取景的放大倍率（臉要接近特寫的大小）
輸出 frame_NNN.webp ＋ holds.json（24fps），丟進 animechk 剪。
"""
import os, glob, json, argparse
from PIL import Image

W, H = 480, 720


def render(src, cx, cy, scale, dy=0.0):
    """以 (cx,cy) 為畫面中心、scale 為放大倍率（1＝整張原圖塞滿 480×720）取一格；超出原圖的地方補黑。"""
    sw, sh = src.size
    cw, ch = sw / scale, sh / scale
    x0, y0 = cx - cw / 2, cy - ch / 2 - dy * sh
    if scale >= 1:   # 取景框夾在原圖內：不准露出圖外的黑邊（背景不是黑的時候會穿幫）
        x0 = min(max(x0, 0), sw - cw); y0 = min(max(y0, 0), sh - ch)
    box = (x0, y0, x0 + cw, y0 + ch)
    canvas = Image.new('RGB', (W, H), (0, 0, 0))
    im = src.transform((W, H), Image.EXTENT, box, Image.BICUBIC, fillcolor=(0, 0, 0))
    canvas.paste(im)
    return canvas


def ease_out(t, p=3):
    return 1 - (1 - t) ** p


def lerp(a, b, t):
    return a + (b - a) * t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--close', required=True)
    ap.add_argument('--end', required=True)
    ap.add_argument('--wan', help='Wan 原地動態那段的資料夾（frame_*.webp），接在落地之後')
    ap.add_argument('--wan-end', type=int, help='第一段 Wan 只用到第幾格（含）')
    ap.add_argument('--wan2', help='第二段 Wan（從第一段最後一格接著生的），略過它的第 0 格接上')
    ap.add_argument('--face', default='655,245')
    ap.add_argument('--zoom', type=float, default=2.5)
    ap.add_argument('--hold', type=int, default=3, help='特寫幾格（24fps）——第 0 格起就往後退，不停')
    ap.add_argument('--close-face', default=None, help='特寫圖上兩眼中點（原尺寸座標）；鏡頭對準它')
    ap.add_argument('--eye-y', type=float, default=0.5, help='特寫時兩眼在畫面上的高度（0~1）；對齊換圖那一格')
    ap.add_argument('--close-end', type=float, default=1.03, help='特寫推近到多大才換圖（換圖那一格 zoom 自動乘上它，臉的大小才接得上）')
    ap.add_argument('--leap', type=int, default=10, help='躍出幾格')
    ap.add_argument('--land', type=int, default=5, help='落地過衝回正幾格')
    ap.add_argument('--over', type=float, default=1.0, help='落地過衝的倍率（比 --base 小＝拉過頭再回來）')
    ap.add_argument('--base', type=float, default=1.04, help='落地後的取景倍率（留邊緣餘裕，過衝時才不會露出圖外）')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    close = Image.open(a.close).convert('RGB')
    end = Image.open(a.end).convert('RGB')
    fx, fy = map(float, a.face.split(','))
    ex, ey = end.size[0] / 2, end.size[1] / 2
    frames = []

    # ① 特寫：原圖構圖不動（不縮小、不平移 —— 縮到 1 以下或平移都會露出圖邊），只微微推近；
    #    換圖那一格改由 Wan 那邊去對齊特寫上兩眼的位置與大小。
    cw, ch = close.size
    ccx, ccy = map(float, a.close_face.split(',')) if a.close_face else (cw / 2, ch / 2)
    for i in range(a.hold):
        frames.append(render(close, cw / 2, ch / 2, lerp(1.0, a.close_end, (i / max(1, a.hold - 1)) ** 2)))
    zoom0 = a.zoom * a.close_end                                    # 換圖那一格：臉的大小＝特寫最後的大小
    eye_sx = 0.5 + (ccx - cw / 2) / cw * a.close_end                # 特寫最後一格上，兩眼在畫面上的位置（0~1）
    eye_sy = 0.5 + (ccy - ch / 2) / ch * a.close_end

    # ②③ 躍出＋落地：直接取 Wan 的影格套運鏡（法環從跳出來那一格就在轉、身體也在動）；
    #     Wan 第 0 格＝結尾圖本身。沒給 --wan 就退回用靜態結尾圖。
    wan = [Image.open(p).convert('RGB') for p in sorted(glob.glob(os.path.join(a.wan, 'frame_*.webp')))] if a.wan else []
    if wan and a.wan_end is not None: wan = wan[:a.wan_end + 1]
    if a.wan2: wan += [Image.open(p).convert('RGB') for p in sorted(glob.glob(os.path.join(a.wan2, 'frame_*.webp')))[1:]]
    def src():
        nonlocal_k[0] += 0
        return wan[min(nonlocal_k[0], len(wan) - 1)] if wan else end
    nonlocal_k = [0]
    for i in range(a.leap):   # 第一格＝臉部特寫（倍率 zoom，對準臉），最後一格＝拉過頭
        t = ease_out(i / (a.leap - 1), 2)
        s_ = lerp(zoom0, a.over, t)
        im = src(); sx, sy = im.size[0] / end.size[0], im.size[1] / end.size[1]
        fx0 = fx * sx + (0.5 - eye_sx) * im.size[0] / zoom0      # 起點：讓 Wan 上的兩眼落在特寫兩眼的位置
        fy0 = fy * sy + (0.5 - eye_sy) * im.size[1] / zoom0
        cx, cy = lerp(fx0, ex * sx, t), lerp(fy0, ey * sy, t)
        frames.append(render(im, cx, cy, s_, dy=-0.03 * (1 - abs(2 * t - 1)))); nonlocal_k[0] += 1
    for i in range(1, a.land + 1):
        t = i / a.land
        s_ = lerp(a.over, a.base, ease_out(t, 2))
        dip = 0.015 * (1 - t) * (1 if t < 0.6 else -0.3)
        im = src()
        frames.append(render(im, im.size[0] / 2, im.size[1] / 2, s_, dy=dip)); nonlocal_k[0] += 1
    # ④ 落地之後：Wan 剩下的影格原樣接上
    for im in wan[nonlocal_k[0]:]:
        frames.append(render(im, im.size[0] / 2, im.size[1] / 2, a.base))

    os.makedirs(a.out, exist_ok=True)
    for f in glob.glob(os.path.join(a.out, 'frame_*.webp')):
        os.remove(f)
    for i, f in enumerate(frames):
        f.save(os.path.join(a.out, f'frame_{i:03d}.webp'), 'WEBP', quality=90)
    json.dump({'fps': 24}, open(os.path.join(a.out, 'holds.json'), 'w'))
    print(f'{len(frames)} frames -> {a.out} (camera {a.hold + a.leap + a.land})')


if __name__ == '__main__':
    main()

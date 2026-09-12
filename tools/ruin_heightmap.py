# -*- coding: utf-8 -*-
"""把 `flight/index.html` 的 `RUIN_ART[<key>].parts` 反算成一張**正俯視高度圖**。

用途有兩個，方向相反：
  ① **出**（現在這一支）：把現有的手寫量體畫成高度圖，當**美術的底圖** ——
     美術在上面改形狀，不必從零畫，也保證與程式端的座標系對得上。
  ② **入**（日後的 `build_ruin.py`）：把美術改好的高度圖逐列合併成 `parts`，
     剪影就與外廓圖完全一致。

⚠⚠ 灰階是**線性**的：`255 = HMAX 世界單位`（與 `build_city.py` 的 `*_h.webp`
   同一個慣例 —— 那邊是「0＝地面，255＝planH」）。改 HMAX 兩邊都要改。
⚠ 屋頂的**坡**表達不出來（高度圖只有一個高度）：山牆與錐頂仍由程式端的
  `k:'gable'` / `cap` 產生，高度圖只管**量體與footprint**。

用法：  python3 tools/ruin_heightmap.py belisar
"""
import io, json, os, re, subprocess, sys, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'
PPU  = 3          # 每個世界單位幾個像素
HMAX = 320.0      # 白（255）＝這麼高。⚠ 貝利薩爾最高的尖端是 302
PAD  = 8          # 四邊留白（世界單位）

def parts_of(key):
    """借 jsc 把 RUIN_ART 跑出來（不要用 regex 猜資料，同 script_lint.py）。"""
    s = io.open(os.path.join(ROOT, 'flight/index.html'), encoding='utf-8').read()
    i = s.index('const RUIN_ART')
    j = s.index('\n};\n', s.index("x:-62, y: 92", i)) + 4
    src = s[i:j].replace('const RUIN_ART', 'var RUIN_ART', 1) + '\nprint(JSON.stringify(RUIN_ART));\n'
    tmp = os.path.join(ROOT, '_recycle', '.ruin_art.js')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    io.open(tmp, 'w', encoding='utf-8').write(src)
    out = subprocess.check_output([JSC, tmp]).decode()
    os.remove(tmp)
    return json.loads(out)[key]

def poly_of(p):
    """這一塊在平面上佔的多邊形（局部世界座標）＋ 它的頂高。"""
    k = p.get('k')
    z = (p.get('z0') or 0) + (p.get('h') or 0)
    if k == 'tower':
        z += ((p.get('cap') or {}).get('h') or 0)
        n, r = (p.get('n') or 10), p['r']
        a0 = p.get('rot') or 0
        pts = [(p['x'] + math.cos(a0 + i / n * 2 * math.pi) * r,
                p['y'] + math.sin(a0 + i / n * 2 * math.pi) * r) for i in range(n)]
    else:
        w = p.get('w', p.get('dia', 0)); l = p.get('l', p.get('dia', 0))
        c, s = math.cos(p.get('rot') or 0), math.sin(p.get('rot') or 0)
        hw, hl = w / 2, l / 2
        pts = [(p['x'] + (qx * c - qy * s), p['y'] + (qx * s + qy * c))
               for qx, qy in ((-hw, -hl), (hw, -hl), (hw, hl), (-hw, hl))]
    return pts, z

def main(key):
    from PIL import Image, ImageDraw
    A = parts_of(key)
    P = [p for p in A.get('parts', []) if isinstance(p, dict) and 'h' in p]
    polys = [poly_of(p) for p in P]
    xs = [q[0] for pl, _ in polys for q in pl]; ys = [q[1] for pl, _ in polys for q in pl]
    x0, x1 = min(xs) - PAD, max(xs) + PAD
    y0, y1 = min(ys) - PAD, max(ys) + PAD
    W, H = int(round((x1 - x0) * PPU)), int(round((y1 - y0) * PPU))
    # ⚠ 逐塊取**最大**：兩塊疊在一起時看得到的是高的那一塊
    img = Image.new('L', (W, H), 0)
    for pl, z in sorted(polys, key=lambda t: t[1]):          # 由低而高，高的蓋上來
        lay = Image.new('L', (W, H), 0)
        ImageDraw.Draw(lay).polygon(
            [((qx - x0) * PPU, (qy - y0) * PPU) for qx, qy in pl],
            fill=max(0, min(255, int(round(z / HMAX * 255)))))
        img = Image.fromarray(__import__('numpy').maximum(
            __import__('numpy').asarray(img), __import__('numpy').asarray(lay)))
    dst = os.path.join(ROOT, 'flight/Reference', '%s_plan_h_draft.png' % key)
    img.save(dst)
    print('%s　%d×%d px　%g px/世界單位　白=%g 單位' % (dst, W, H, PPU, HMAX))
    print('  局部座標範圍：x %.0f…%.0f（→ 圖的左→右）　y %.0f…%.0f（→ 圖的上→下）'
          % (x0, x1, y0, y1))
    print('  零件 %d 個，最高 %.0f 單位' % (len(P), max(z for _, z in polys)))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'belisar')

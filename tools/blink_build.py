#!/usr/bin/env python3
"""眨眼補丁量產：分割 → 補丁 → webp 交件 → 重寫 script/blink.js（唯一的資料表）。

  py -3.11 tools/blink_build.py renna_si_front anya_si_front ...
  py -3.11 tools/blink_build.py --all            # resources/si/ 底下全部的 *_si_*.webp（含 npc/）
  py -3.11 tools/blink_build.py --list           # 只列出表上現有幾張

做的事（逐張）：
  1. tools/_blink_seg/<名>/classes_s1.6.png 不在 → 用 .venv-face 跑 tools/face_parse.py --lite（批次一次）
  2. tools/blink_patch.py（自動眼框）→ tools/_blink_out/<名>/half.png、closed.png、blink.json
  3. 轉 webp → resources/si/blink/<名>_half.webp、<名>_closed.webp
  4. script/blink.js 的 BLINK[<名>] = { half:[x,y,w,h], closed:[x,y,w,h] }（整份機器產生）

⚠ 補丁的座標是**原圖像素**；引擎依立繪外框的百分比擺，所以跟著縮放／翻轉／壓暗一起動。
⚠ 量產之後要人看：tools/_blink_out/<名>/sheet.png（睜／半／閉 放大三格）。
"""
import glob, json, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SI = os.path.join(ROOT, 'resources', 'si')
OUTD = os.path.join(ROOT, 'tools', '_blink_out')
SEGD = os.path.join(ROOT, 'tools', '_blink_seg')
DST = os.path.join(SI, 'blink')
TABLE = os.path.join(ROOT, 'script', 'blink.js')
VENV_FACE = os.path.join(ROOT, '.venv-face', 'Scripts', 'python.exe')


def find_src(name):
    for p in (os.path.join(SI, name + '.webp'), os.path.join(SI, 'npc', name + '.webp')):
        if os.path.exists(p):
            return p
    return None


def read_table():
    if not os.path.exists(TABLE):
        return {}
    t = open(TABLE, encoding='utf-8').read()
    m = re.search(r'BLINK\s*=\s*(\{.*\});', t, re.S)
    return json.loads(m.group(1)) if m else {}


def write_table(tab):
    rows = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(tab[k], separators=(",", ":"))}' for k in sorted(tab))
    open(TABLE, 'w', encoding='utf-8', newline='\n').write(
        '/* ══ 立繪眨眼補丁表 —— **機器產生，不要手改**（tools/blink_build.py）══\n'
        '   鑰匙＝立繪檔名（去副檔名、去 ?v=、轉小寫）；值＝兩格補丁在**原圖像素**的框 [x,y,w,h]。\n'
        '   補丁檔：resources/si/blink/<鑰匙>_half.webp／_closed.webp。\n'
        '   引擎（modules/story.js 的 blinkBind）只認這一張表：表上有的立繪就會眨眼，沒有的不動。 */\n'
        'export const BLINK = {\n' + rows + '\n};\n')


def main():
    args = sys.argv[1:]
    tab = read_table()
    if '--list' in args:
        print(len(tab), '張：', ' '.join(sorted(tab)))
        return
    if '--all' in args:
        names = sorted({os.path.splitext(os.path.basename(p))[0]
                        for p in glob.glob(os.path.join(SI, '*.webp')) + glob.glob(os.path.join(SI, 'npc', '*.webp'))})
    else:
        names = [a for a in args if not a.startswith('--')]
    names = [n for n in names if find_src(n)]
    need = [n for n in names if not os.path.exists(os.path.join(SEGD, n, 'classes_s1.6.png'))]
    if need:
        print('分割', len(need), '張 ……')
        subprocess.run([VENV_FACE, os.path.join(ROOT, 'tools', 'face_parse.py'), '--lite'] + need, check=True)
    os.makedirs(DST, exist_ok=True)
    ok, bad = [], []
    for n in names:
        if not os.path.exists(os.path.join(SEGD, n, 'classes_s1.6.png')):
            bad.append((n, '找不到臉')); continue
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'blink_patch.py'), find_src(n), '--out', OUTD],
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        mp = os.path.join(OUTD, n, 'blink.json')
        if r.returncode != 0 or not os.path.exists(mp):
            bad.append((n, (r.stderr or r.stdout).strip().splitlines()[-1:] or '?')); continue
        meta = json.load(open(mp))
        ent = {}
        for k in ('half', 'closed'):
            m = meta[k]
            Image.open(os.path.join(OUTD, n, m['src'])).save(
                os.path.join(DST, f'{n}_{k}.webp'), 'WEBP', quality=92, alpha_quality=100, method=6)
            ent[k] = [m['x'], m['y'], m['w'], m['h']]
        tab[n.lower()] = ent
        ok.append(n)
        print('✔', n)
    write_table(tab)
    print(f'\n完成 {len(ok)} 張，失敗 {len(bad)} 張；表上共 {len(tab)} 張')
    for n, why in bad:
        print('✘', n, why)


if __name__ == '__main__':
    main()

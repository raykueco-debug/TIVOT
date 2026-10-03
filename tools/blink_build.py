#!/usr/bin/env python3
"""眨眼補丁量產：分割 → 補丁 → webp 交件 → 重寫 script/blink.js（唯一的資料表）。

  py -3.11 tools/blink_build.py renna_si_front anya_si_front ...
  py -3.11 tools/blink_build.py --all            # resources/si/ 底下全部（含 npc/）
  py -3.11 tools/blink_build.py --all --qa       # 跑完再出驗收總覽 tools/_blink_out/_qa_NN.png
  py -3.11 tools/blink_build.py --qa-only        # 不重跑，只依現有輸出重出總覽
  py -3.11 tools/blink_build.py --list           # 只列出表上現有幾張

做的事（逐張）：
  1. tools/_blink_seg/<名>/classes_s1.6.png 不在 → 用 .venv-face 跑 tools/face_parse.py --lite（批次一次）
  2. tools/blink_patch.py（自動眼框）→ tools/_blink_out/<名>/half.png、closed.png、blink.json
  3. 轉 webp → resources/si/blink/<名>_half.webp、<名>_closed.webp
  4. script/blink.js 的 BLINK[<名>] = { half:[x,y,w,h], closed:[x,y,w,h] }（整份機器產生）

⚠⚠ **排除清單 tools/blink_reject.txt**（一行一張：`<名>  # 理由`）：人看過總覽、判定不能上線的
  （本來就閉眼／背影／遮臉／補丁有瑕疵）。清單上的不產、表上有也一併拿掉 —— 不上線的圖就是「不眨」，
  那是安全的失敗模式。理由一定要寫，下一個人才知道是「不適用」還是「待修」。
⚠ 補丁的座標是**原圖像素**；引擎（modules/blink.js）依立繪外框的百分比擺，所以跟著縮放／翻轉／壓暗一起動。
"""
import glob, hashlib, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SI = os.path.join(ROOT, 'resources', 'si')
OUTD = os.path.join(ROOT, 'tools', '_blink_out')
SEGD = os.path.join(ROOT, 'tools', '_blink_seg')
DST = os.path.join(SI, 'blink')
TABLE = os.path.join(ROOT, 'script', 'blink.js')
REJECT = os.path.join(ROOT, 'tools', 'blink_reject.txt')
VENV_FACE = os.path.join(ROOT, '.venv-face', 'Scripts', 'python.exe')
WORKERS = max(1, min(8, (os.cpu_count() or 4) - 2))


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


def base_hash(name):
    """底圖內容雜湊前 8 碼 —— 補丁是對著這一版做的；底圖被同名覆蓋時 lint 的 check_blink 會報錯。"""
    return hashlib.sha1(open(find_src(name), 'rb').read()).hexdigest()[:8]


def read_reject():
    out = {}
    if os.path.exists(REJECT):
        for ln in open(REJECT, encoding='utf-8'):
            ln = ln.strip()
            if not ln or ln.startswith('#'):
                continue
            n, _, why = ln.partition('#')
            out[n.strip().lower()] = why.strip()
    return out


def write_table(tab):
    rows = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(tab[k], separators=(",", ":"))}' for k in sorted(tab))
    open(TABLE, 'w', encoding='utf-8', newline='\n').write(
        '/* ══ 立繪眨眼補丁表 —— **機器產生，不要手改**（tools/blink_build.py）══\n'
        '   鑰匙＝立繪檔名（去副檔名、去 ?v=、轉小寫）；值＝兩格補丁在**原圖像素**的框 [x,y,w,h]；\n'
        '   base＝底圖內容雜湊前 8 碼（底圖被同名覆蓋時 tools/script_lint.py 的 check_blink 會報錯）。\n'
        '   補丁檔：resources/si/blink/<鑰匙>_half.webp／_closed.webp。\n'
        '   引擎（modules/blink.js）只認這一張表：表上有的立繪就會眨眼，沒有的不動。\n'
        '   不上線的在 tools/blink_reject.txt（附理由）。 */\n'
        'export const BLINK = {\n' + rows + '\n};\n')


def all_names():
    return sorted({os.path.splitext(os.path.basename(p))[0]
                   for p in glob.glob(os.path.join(SI, '*.webp')) + glob.glob(os.path.join(SI, 'npc', '*.webp'))})


EYES = os.path.join(ROOT, 'tools', 'blink_eyes.txt')


def read_eyes():
    """手給的眼框（分割抓錯時用）：一行 `<名>  x0,y0,x1,y1 [x0,y0,x1,y1]  # 理由`。
    另一種寫法 `<名>  glasses  # 理由`：戴眼鏡，鏡框保留原圖（blink_patch --glasses）。"""
    out = {}
    if os.path.exists(EYES):
        for ln in open(EYES, encoding='utf-8'):
            ln = ln.split('#')[0].split()
            if len(ln) >= 2:
                out[ln[0].lower()] = ln[1:]
    return out


def run_one(n):
    extra = []
    for b in read_eyes().get(n.lower(), []):
        extra += ['--glasses'] if b == 'glasses' else ['--eye', b]
    # GPT 閉眼合成（Ray 10-03）：tools/_blink_base/<名>_closed.png 在 ⇒ 全閉用它
    cf = os.path.join(ROOT, 'tools', '_blink_base', n + '_closed.png')
    if os.path.exists(cf):
        extra += ['--closed-from', cf]
    hf = os.path.join(ROOT, 'tools', '_blink_base', n + '_half.png')   # 半閉同理（Ray 10-04）
    if os.path.exists(hf):
        extra += ['--half-from', hf]
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'blink_patch.py'), find_src(n), '--out', OUTD] + extra,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    mp = os.path.join(OUTD, n, 'blink.json')
    if r.returncode != 0 or not os.path.exists(mp):
        tail = (r.stderr or r.stdout).strip().splitlines()
        return n, None, tail[-1] if tail else '?'
    return n, json.load(open(mp)), None


def qa_sheets(names, prefix='_qa_'):
    """驗收總覽：每張一格＝「睜｜閉」眼部放大並排，下方寫檔名。一頁 4×6。"""
    try:
        font = ImageFont.truetype('msjh.ttc', 18)
    except Exception:
        font = ImageFont.load_default()
    tiles = []
    for n in names:
        mp = os.path.join(OUTD, n, 'blink.json')
        if not os.path.exists(mp):
            continue
        m = json.load(open(mp))
        src = Image.open(find_src(n)).convert('RGBA')
        c = m['closed']
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        hw = c['w'] / 2 + 26; hh = max(c['h'] / 2 + 16, hw * 0.42)
        box = tuple(int(v) for v in (cx - hw, cy - hh, cx + hw, cy + hh))
        cl = src.copy(); cl.alpha_composite(Image.open(os.path.join(OUTD, n, c['src'])), (c['x'], c['y']))
        def crop(im):
            bg = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (40, 40, 48, 255))
            bg.alpha_composite(im.crop(box))
            return bg.convert('RGB').resize((240, int(240 * (box[3] - box[1]) / (box[2] - box[0]))), Image.LANCZOS)
        a, b = crop(src), crop(cl)
        t = Image.new('RGB', (a.width * 2 + 6, a.height + 26), (20, 20, 24))
        t.paste(a, (0, 0)); t.paste(b, (a.width + 6, 0))
        ImageDraw.Draw(t).text((4, a.height + 3), n, fill=(240, 220, 120), font=font)
        tiles.append(t)
    per = 24
    for p in range(0, len(tiles), per):
        page = tiles[p:p + per]
        cols = 4; rows = (len(page) + cols - 1) // cols
        W = max(t.width for t in page); H = max(t.height for t in page)
        sh = Image.new('RGB', (cols * (W + 8), rows * (H + 8)), (0, 0, 60))
        for i, t in enumerate(page):
            sh.paste(t, ((i % cols) * (W + 8), (i // cols) * (H + 8)))
        sh.save(os.path.join(OUTD, f'{prefix}{p // per + 1:02d}.png'))
    print('驗收總覽', (len(tiles) + per - 1) // per, '頁 →', OUTD)


def main():
    args = sys.argv[1:]
    tab = read_table()
    rej = read_reject()
    if '--rehash' in args:          # 補上缺 base 的舊條目（補丁沒重做，前提是底圖沒換過）
        for k in tab:
            if 'base' not in tab[k] and find_src(k):
                tab[k]['base'] = base_hash(k)
        write_table(tab)
        print('rehash', len(tab))
        return
    if '--list' in args:
        print(len(tab), '張：', ' '.join(sorted(tab)))
        return
    names = all_names() if ('--all' in args or '--qa-only' in args) else [a for a in args if not a.startswith('--')]
    names = [n for n in names if find_src(n)]
    if '--qa-only' in args:
        qa_sheets([n for n in names if n.lower() not in rej])
        return
    # --try 待修C ＝ 把排除清單裡理由含「待修C」的那幾張重跑一次、只出總覽（_try_NN.png），不寫表、不交件 ——
    # 修工具時用來看「這一類修好了沒」。
    if '--try' in args:
        tag = args[args.index('--try') + 1]
        tn = [n for n in all_names() if tag in rej.get(n.lower(), '')]
        print('試跑', tag, len(tn), '張')
        with ThreadPoolExecutor(WORKERS) as ex:
            res = list(ex.map(run_one, tn))
        for n, _, err in res:
            if err:
                print('✘', n, err)
        qa_sheets([n for n, m, err in res if not err], prefix='_try_')
        return
    todo = [n for n in names if n.lower() not in rej]
    need = [n for n in todo if not os.path.exists(os.path.join(SEGD, n, 'classes_s1.6.png'))]
    if need:
        print('分割', len(need), '張 ……')
        subprocess.run([VENV_FACE, os.path.join(ROOT, 'tools', 'face_parse.py'), '--lite'] + need, check=True)
    os.makedirs(DST, exist_ok=True)
    ok, bad = [], []
    noseg = [n for n in todo if not os.path.exists(os.path.join(SEGD, n, 'classes_s1.6.png'))]
    bad += [(n, '找不到臉（分割偵測不到）') for n in noseg]
    todo = [n for n in todo if n not in noseg]
    with ThreadPoolExecutor(WORKERS) as ex:
        for n, meta, err in ex.map(run_one, todo):
            if err:
                bad.append((n, err)); continue
            ent = {}
            for k in ('half', 'closed'):
                m = meta[k]
                Image.open(os.path.join(OUTD, n, m['src'])).save(
                    os.path.join(DST, f'{n}_{k}.webp'), 'WEBP', quality=92, alpha_quality=100, method=6)
                ent[k] = [m['x'], m['y'], m['w'], m['h']]
            ent['base'] = base_hash(n)
            tab[n.lower()] = ent
            ok.append(n)
            print('✔', n, flush=True)
    for k in list(tab):
        if k in rej:
            del tab[k]
    write_table(tab)
    print(f'\n完成 {len(ok)} 張，失敗 {len(bad)} 張；表上共 {len(tab)} 張（排除清單 {len(rej)} 張）')
    for n, why in bad:
        print('✘', n, why)
    if '--qa' in args:
        qa_sheets(ok)


if __name__ == '__main__':
    main()

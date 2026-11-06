#!/usr/bin/env python3
"""tools/i18n_xlsx.py —— 介面多語：**一份 Excel 是唯一來源**（ver -2582）

    py tools/i18n_xlsx.py sync     # 掃程式 → 把新出現的中文補進 i18n_ui.xlsx（譯文與備註照留）＋列出漏網
    py tools/i18n_xlsx.py build    # i18n_ui.xlsx → 遊戲讀的檔（i18n/ui/<lang>.js、pack.<lang>.js、packs.js、langs.js）
    py tools/i18n_xlsx.py check    # 只驗不寫：缺譯／佔位符不符／漏網（程式裡還沒經過翻譯層的中文）
    py tools/i18n_xlsx.py wrap     # 把程式裡新寫、還沒包的中文字面值包成 i18nT('…')（冪等；改的是共用檔，先 git pull）

範圍：**除了劇情台詞以外的所有介面字**（選單、按鈕、結算、戰鬥浮字、提示、道具、商店、整備、
地名／人名、飛行頁介面）。台詞仍走 tools/script_i18n.py（劇本表）。

Excel（根目錄 `i18n_ui.xlsx`）一列一句：
  鍵 ｜ 類別 ｜ 中文 ｜ en｜English ｜ ja｜日本語 ｜ es｜Español ｜ 出處 ｜ 備註 ｜ 狀態 ｜ 缺譯
  · 鍵 `L:<路徑>` ＝ 語言包（i18n/zh.js 的那一格，例 `L:home.start`）；
    鍵 `T:<雜湊>` ＝ 查表字（遊戲拿**中文原文**去查：i18nT／trTree／trDom）。
  · **中文欄由程式同步過來，在 Excel 裡改中文不會回寫程式** —— 要改中文去改程式，再 sync。
  · 譯文欄只有 Excel 這一份：build 之後遊戲就讀到。空白＝退回中文。
  · 加一個語種＝在譯文欄後面插一欄，表頭寫 `<代碼>｜<名稱>`（例 `pt｜Português`），build 會自己認。
  · 狀態：`停用`＝程式已不用（列照留，build 不收）／`中文已改`＝語言包那一格的中文變了，譯文要重看／
    `新增 <日期>`＝這一次 sync 才進表。看過可以自己清掉，tool 不會再寫回去。
"""
import re, sys, os, json, glob, hashlib, subprocess, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ui_i18n as U
from script_i18n import tokens, unesc, SOURCES as SCRIPT_SOURCES

ROOT = U.ROOT
XLSX = os.path.join(ROOT, 'i18n_ui.xlsx')
UI_DIR = os.path.join(ROOT, 'i18n', 'ui')
LANGS_DEFAULT = [('en', 'English'), ('ja', '日本語'), ('es', 'Español')]
SHEET = '介面字'
FIXED = ['鍵', '類別', '中文']
TAIL = ['出處', '備註', '狀態', '缺譯']

# 程式裡也有、但不是 module 的介面檔（開機前就跑的 classic script）：掃，但 wrap 不碰（手包 T()）
CLASSIC = [os.path.join(ROOT, p) for p in ('offline.js', 'orientation.js')]
# 劇本資料裡「不是台詞」的欄位：地名／人名／標籤／打烊說明 → 進 Excel
NAME_KEYS = {'name', 'label', 'closed'}
# 檔案 → 類別（讀 Excel 的人好分段）
CAT_OF_FILE = [
    ('index.html', '首頁・靜態'), ('main.js', '主程式'), ('config.js', '資料卡'),
    ('flight/', '飛行頁'), ('modules/town.js', '城鎮'), ('modules/inn.js', '旅店'),
    ('modules/gear.js', '整備'), ('modules/loot.js', '道具・拾得'), ('modules/settings.js', '設定選單'),
    ('modules/save.js', '存讀檔'), ('modules/inspector.js', '結算'), ('modules/story.js', '劇情介面'),
    ('modules/tutorial.js', '教學'), ('modules/', '戰鬥'), ('script/enemies.js', '敵人卡'),
    ('script/weapons.js', '武器卡'), ('script/shopcards.js', '商店卡'), ('script/progress.js', '章節・進度'),
    ('script/clock.js', '時間'), ('script/', '資料'), ('offline.js', '離線包'), ('orientation.js', '轉向提示'),
]
CAT_OF_L = {'home': '首頁', 'loading': '載入', 'battle': '戰鬥', 'exitConfirm': '戰鬥', 'cutins': '戰鬥',
            'weapons': '武器卡', 'partners': '搭檔', 'enemies': '敵人卡', 'inspector': '結算（監察官台詞）',
            'result': '結算', 'transitions': '過場', 'tutorial': '教學（台詞）', 'sheets': '首頁・面板',
            'sentou': '銭湯'}
CAT_NAMES = '地名・人名'

PH = re.compile(r'\{[A-Za-z0-9_+]+\}|<[^>]+>|\$\{[^}]*\}|\\n|\n')


def rel(p): return U.rel(p)
def cat_of(f):
    for pre, c in CAT_OF_FILE:
        if f.startswith(pre): return c
    return '其他'
def tkey(zh): return 'T:' + hashlib.sha1(zh.encode('utf-8')).hexdigest()[:10]


# ── 掃程式 ──────────────────────────────────────────────────────────────────
def scan_code():
    """回 (items, leaks)。items: {中文: {'src':[…], 'cat':…}}；leaks: 程式裡沒經過翻譯層的中文。"""
    script_text = set()          # 劇本台詞（不進 Excel）
    items, leaks = {}, []

    def add(text, where, cat):
        it = items.setdefault(text, {'src': [], 'cat': cat})
        if where not in it['src']: it['src'].append(where)

    def scan_js(path, src, base, mode, classic=False):
        f = rel(path)
        for pos, raw, q in tokens(src):
            if not U.CJK.search(raw): continue
            end = pos + len(raw) + 2
            m = U.classify(src, pos, raw, q, end)
            line = base + src.count('\n', 0, pos)
            text = unesc(raw) if q != '`' else raw
            if m == 'skip-template' and re.search(r'\b(vec[234]|float|uniform|gl_FragColor)\b', raw): continue   # 著色器原始碼（註解裡有中文）
            if m == 'skip-compare' and re.search(r'\bi18nT\(\s*$', src[max(0, pos-8):pos]): continue   # 比對的已經是譯文
            if m == 'skip-template' or (m == 'skip-compare' and mode == 'wrap'):
                leaks.append((f, line, m, raw)); continue
            if m: continue
            back = re.sub(r'/\*.*?\*/', ' ', src[max(0, pos-200):pos], flags=re.S)
            km = re.search(r'([A-Za-z_$][\w$]*)\s*:\s*\[?\s*$', back[-60:])
            if f == 'config.js' and km and km.group(1) == 'text':
                continue                                      # 戰鬥內對白（battles[].talk）＝台詞
            add(text, f'{f}:{line}', cat_of(f))
            if mode == 'wrap':
                wrapped = re.search(r'\b(i18nT|T)\(\s*$', src[max(0, pos-8):pos])
                if not wrapped: leaks.append((f, line, 'unwrapped', raw))

    for p in U.CODE: scan_js(p, open(p, encoding='utf-8').read(), 1, 'wrap')
    for p in U.DATA: scan_js(p, open(p, encoding='utf-8').read(), 1, 'data')
    for p in CLASSIC: scan_js(p, open(p, encoding='utf-8').read(), 1, 'wrap', classic=True)
    for p in U.HTML:
        s = open(p, encoding='utf-8').read()
        for m in re.finditer(U.SCRIPT_RE, U.blank_comments(s), re.S):
            scan_js(p, m.group(1), s.count('\n', 0, m.start(1)) + 1, 'wrap')
        body = s
        for m in re.finditer(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', s, re.S):
            body = body[:m.start()] + ' ' * (m.end()-m.start()) + body[m.end():]
        for m in re.finditer(r'>([^<]+)<', body):
            t = m.group(1).strip()
            if U.CJK.search(t): add(t, f'{rel(p)}:{s.count(chr(10), 0, m.start()) + 1}', cat_of(rel(p)))
        for m in re.finditer(r'\b(placeholder|title|aria-label|alt)="([^"]*)"', body):
            t = m.group(2).strip()
            if U.CJK.search(t): add(t, f'{rel(p)}:{s.count(chr(10), 0, m.start()) + 1}', cat_of(rel(p)))
    for t in U.FORCE: add(t, '(識別字也會顯示)', '時間' if t.endswith('月') else '武器卡')

    # 劇本資料裡的地名／人名（台詞不收）
    for r, keys in SCRIPT_SOURCES:
        if r == 'config.js': continue
        src = open(os.path.join(ROOT, r), encoding='utf-8').read()
        for pos, raw, q in tokens(src):
            if not U.CJK.search(raw): continue
            back = src[max(0, pos-160):pos]
            if re.search(r'console\.\w+\([^;]*$', back): continue
            km = re.search(r'([A-Za-z_$][\w$]*)\s*:\s*\[?\s*$', back[-50:])
            if not km or km.group(1) not in NAME_KEYS: continue
            if keys and km.group(1) not in keys: continue
            text = unesc(raw) if q != '`' else raw
            add(text, f'{r}:{src.count(chr(10), 0, pos) + 1}', CAT_NAMES)
    return items, leaks


def dump_packs():
    """用 node 讀 i18n/zh.js、en.js、ja.js、es.js（舊手寫包，只當第一次的種子）。"""
    js = ("const r=process.argv[1];const o={};for(const l of ['zh','en','ja','es']){"
          "try{o[l]=(await import('file:///'+r+'/i18n/'+l+'.js')).STRINGS;}catch(e){o[l]=null;}}"
          "process.stdout.write(JSON.stringify(o));")
    out = subprocess.run(['node', '--input-type=module', '-e', js, ROOT.replace(os.sep, '/')],
                         capture_output=True, check=True).stdout
    return json.loads(out.decode('utf-8'))

def flatten(o, p=''):
    if isinstance(o, dict):
        for k, v in o.items(): yield from flatten(v, f'{p}.{k}' if p else k)
    elif isinstance(o, list):
        for i, v in enumerate(o): yield from flatten(v, f'{p}.{i}')
    else: yield p, o

def get_path(o, path):
    for k in path.split('.'):
        if isinstance(o, list):
            k = int(k)
            if k >= len(o): return None
            o = o[k]
        elif isinstance(o, dict):
            if k not in o: return None
            o = o[k]
        else: return None
    return o


# ── Excel 讀寫 ──────────────────────────────────────────────────────────────
def read_xlsx():
    """回 (langs[(code,name)], rows{鍵: dict}, order[鍵])。檔案不存在 → 空表。"""
    if not os.path.exists(XLSX): return list(LANGS_DEFAULT), {}, []
    import openpyxl
    ws = openpyxl.load_workbook(XLSX)[SHEET]
    head = [c.value or '' for c in ws[1]]
    langs = []
    for h in head:
        m = re.match(r'^([a-z]{2,3}(?:-[A-Za-z]+)?)｜(.*)$', str(h))
        if m: langs.append((m.group(1), m.group(2)))
    idx = {str(h): i for i, h in enumerate(head)}
    rows, order = {}, []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[0]: continue
        g = lambda name: (r[idx[name]] if name in idx and idx[name] < len(r) else None)
        row = {'key': str(r[0]), 'cat': g('類別') or '', 'zh': g('中文') or '',
               'src': g('出處') or '', 'note': g('備註') or '', 'status': g('狀態') or '', 'tr': {}}
        for code, name in langs:
            v = g(f'{code}｜{name}')
            row['tr'][code] = '' if v is None else str(v)
        rows[row['key']] = row; order.append(row['key'])
    return langs, rows, order

def write_xlsx(langs, rows, order, leaks):
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    wb = openpyxl.Workbook()
    ws = wb.active; ws.title = SHEET
    head = FIXED + [f'{c}｜{n}' for c, n in langs] + TAIL
    ws.append(head)
    ILLEGAL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')
    for k in order:
        r = rows[k]
        miss = [c for c, _ in langs if not r['tr'].get(c)] if '停用' not in r['status'] else []
        vals = [r['key'], r['cat'], r['zh']] + [r['tr'].get(c, '') for c, _ in langs] + \
               [r['src'], r['note'], r['status'], ','.join(miss)]
        ws.append([ILLEGAL.sub('', v) if isinstance(v, str) else v for v in vals])
        for c in ws[ws.max_row]:
            if isinstance(c.value, str) and c.value.startswith('='): c.data_type = 's'   # 不要被當成公式
    widths = [16, 12, 46] + [46] * len(langs) + [30, 24, 14, 10]
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    wrap = Alignment(wrap_text=True, vertical='top')
    for row in ws.iter_rows(min_row=2):
        for c in row[2:3 + len(langs)]: c.alignment = wrap
    hf = PatternFill('solid', fgColor='E8E0CC')
    for c in ws[1]: c.font = Font(bold=True); c.fill = hf
    ws.freeze_panes = 'D2'
    ws.auto_filter.ref = ws.dimensions
    # 說明頁
    hs = wb.create_sheet('說明')
    for line in HELP: hs.append([line])
    hs.column_dimensions['A'].width = 120
    # 漏網頁：程式裡沒經過翻譯層的中文（切語種時不會換）
    ls = wb.create_sheet('漏網')
    ls.append(['檔案', '行', '種類', '字串（程式原樣）'])
    for f, l, m, raw in leaks: ls.append([f, l, {'unwrapped': '沒包 i18nT', 'skip-template': '樣板字串（含 ${}）', 'skip-compare': '比較運算元'}.get(m, m), raw[:300]])
    for c, w in zip('ABCD', (30, 8, 18, 100)): ls.column_dimensions[c].width = w
    for c in ls[1]: c.font = Font(bold=True)
    wb.save(XLSX)

HELP = [
    '介面多語表（tools/i18n_xlsx.py 管理）—— 遊戲所有介面字的譯文只有這一份。',
    '',
    '【給校稿的人】',
    '・一列一句：「中文」是原文，右邊各欄是譯文。空白＝遊戲裡退回中文。',
    '・不要改「鍵」「中文」「出處」三欄（中文是從程式同步過來的；要改中文請改程式後重跑 sync）。',
    '・「備註」欄自由寫，tool 不會蓋掉。「狀態」：停用＝程式已不用；中文已改＝原文變了、譯文要重看；新增＝最近一次才進表。',
    '・「缺譯」欄是 tool 算的，列出還空著的語種，可用篩選找。',
    '',
    '【給 AI 機翻的指示（整段貼給 AI 即可）】',
    '請把「介面字」工作表裡每一列的「中文」翻成各譯文欄表頭的語言（en｜English、ja｜日本語、es｜Español…），',
    '只填空白的譯文格，已經有字的不要改。規則：',
    '  1. 原樣保留：{n}、{name} 這類大括號佔位符；<b>…</b> 等 HTML 標籤與屬性（但 aria-label／title／alt 的值要翻）；${…}；\\n 與換行。',
    '  2. 這是手機遊戲 UI：按鈕與標籤要短；全形空格（「繼　續」）是排版用，譯文不必照抄。',
    '  3. 世界觀：19 世紀末～1908 年的架空大陸（銀月大陸），哥德式宗教＋飛空艇。專有名詞前後一致。',
    '  4. 「類別」欄是 地名・人名 的，照音譯或意譯皆可，但全表同一個名字只能有一種譯法。',
    '  5. 只輸出同一張表（欄位與列順序都不變）。',
    '',
    '【流程】',
    '  py tools/i18n_xlsx.py sync   ← 程式改過介面字之後（新字補進來、舊字標停用；譯文與備註照留）',
    '  py tools/i18n_xlsx.py build  ← 譯文改過之後（產生遊戲讀的檔），再 py tools/bust.py --bump',
    '  py tools/i18n_xlsx.py check  ← 只看統計：缺譯／佔位符不符／漏網',
    '',
    '【加一個語種】在最後一個譯文欄右邊插一欄，表頭寫「代碼｜名稱」（例：pt｜Português），build 就會產生那一語。',
    '  首頁語言鈕的順序與鈕面字在 main.js 的 NEXT_FACE（沒寫的語種鈕面印代碼大寫）。',
    '',
    '【漏網】工作表＝程式裡還沒經過翻譯層的中文（切語種時不會換）。沒包的跑 wrap；樣板字串要手改成可查表的形狀。',
]


# ── sync ───────────────────────────────────────────────────────────────────
def collect():
    items, leaks = scan_code()
    packs = dump_packs()
    return items, leaks, packs

def sync():
    items, leaks, packs = collect()
    langs, rows, order = read_xlsx()
    first = not rows
    today = datetime.date.today().isoformat()
    seen = set()
    # 種子：舊的譯文表（只在第一次建表、或某一列還沒有譯文時用）
    seed_T = {}
    for code, _ in langs:
        tab = {}
        for p in (os.path.join(ROOT, 'i18n', 'script', f'{code}.json'), os.path.join(UI_DIR, f'{code}.json')):
            if os.path.exists(p): tab.update(json.load(open(p, encoding='utf-8')))
        seed_T[code] = tab
    zh = packs['zh']
    new_rows = []
    # ① 語言包
    for path, v in flatten(zh):
        if not isinstance(v, str): continue
        others = {c: get_path(packs.get(c), path) for c, _ in langs}
        if not (U.CJK.search(v) or any(isinstance(x, str) and x != v for x in others.values())): continue
        k = 'L:' + path; seen.add(k)
        if k in rows:
            r = rows[k]
            if r['zh'] != v:
                r['zh'] = v
                if '中文已改' not in r['status']: r['status'] = ('中文已改 ' + r['status']).strip()
        else:
            r = rows[k] = {'key': k, 'cat': CAT_OF_L.get(path.split('.')[0], '語言包'), 'zh': v,
                           'src': 'i18n/zh.js', 'note': '', 'status': '' if first else f'新增 {today}',
                           'tr': {c: (others[c] if isinstance(others[c], str) and others[c] != v else '') for c, _ in langs}}
            new_rows.append(k)
        r['status'] = r['status'].replace('停用', '').strip()
        r['_ord'] = (0, '')
    # ② 查表字
    lzh = {}   # 語言包裡同一句中文的譯文 → 補查表字的空格（同一句中文同一個譯法）
    for path, v in flatten(zh):
        if isinstance(v, str):
            for c, _ in langs:
                x = get_path(packs.get(c), path)
                if isinstance(x, str) and x != v: lzh.setdefault(c, {}).setdefault(v, x)
    for text, it in items.items():
        k = tkey(text); seen.add(k)
        src = it['src'][0] + (f' (+{len(it["src"])-1})' if len(it['src']) > 1 else '')
        if k in rows:
            r = rows[k]; r['src'] = src
        else:
            r = rows[k] = {'key': k, 'cat': it['cat'], 'zh': text, 'src': src, 'note': '',
                           'status': '' if first else f'新增 {today}', 'tr': {}}
            new_rows.append(k)
        for c, _ in langs:
            if not r['tr'].get(c):
                r['tr'][c] = seed_T.get(c, {}).get(text) or lzh.get(c, {}).get(text) or ''
        r['status'] = r['status'].replace('停用', '').strip()
        r['_ord'] = (1, it['src'][0])
    # ③ 不見了的 → 停用（不刪）
    gone = 0
    for k, r in rows.items():
        if k not in seen:
            if '停用' not in r['status']: r['status'] = ('停用 ' + r['status']).strip(); gone += 1
            r['_ord'] = (2, r.get('src', ''))
    cat_rank = {}
    for _, c in CAT_OF_FILE: cat_rank.setdefault(c, len(cat_rank))
    def sk(k):
        r = rows[k]; o = r.get('_ord', (2, ''))
        if o[0] == 0: return (0, order.index(k) if k in order else 10**6, k)
        if o[0] == 1:
            f, _, ln = o[1].rpartition(':')
            return (1, cat_rank.get(r['cat'], 99), f, int(ln) if ln.isdigit() else 0)
        return (2, r['cat'], k)
    L_keys = [p for p, v in flatten(zh) if isinstance(v, str)]
    lpos = {('L:' + p): i for i, p in enumerate(L_keys)}
    def sk2(k):
        if rows[k].get('_ord', (2,))[0] == 0: return (0, lpos.get(k, 10**6))
        return sk(k)
    order = sorted(rows, key=sk2)
    write_xlsx(langs, rows, order, leaks)
    n_live = sum(1 for k in order if '停用' not in rows[k]['status'])
    print(f'→ i18n_ui.xlsx：{n_live} 句在用（新增 {len(new_rows)}、這次標停用 {gone}）；漏網 {len(leaks)} 處（見「漏網」頁）')
    report(langs, rows)

def report(langs, rows):
    live = [r for r in rows.values() if '停用' not in r['status']]
    for c, n in langs:
        done = sum(1 for r in live if r['tr'].get(c))
        print(f'  {c}｜{n}: {done}/{len(live)} 已譯')
    bad = []
    for r in live:
        want = sorted(PH.findall(r['zh']))
        for c, _ in langs:
            t = r['tr'].get(c)
            if t:
                got = sorted(PH.findall(t))
                norm = lambda xs: sorted(re.sub(r'\b(aria-label|placeholder|title|alt)="[^"]*"', r'\1=""', x).replace('{M}', '{m}').replace('\\n', '\n') for x in xs)
                if norm(want) != norm(got) and set(norm(want)) != set(norm(got)): bad.append((r['key'], c))
    if bad:
        print(f'  ⚠ 佔位符／標籤不符 {len(bad)} 格（譯文少了或多了 {{n}}、<b>、\\n…）：')
        for k, c in bad[:12]: print('   ', k, c)
    return bad


# ── build ──────────────────────────────────────────────────────────────────
def build():
    langs, rows, order = read_xlsx()
    if not rows: sys.exit('沒有 i18n_ui.xlsx —— 先跑 sync')
    packs = dump_packs(); zh = packs['zh']
    live = [rows[k] for k in order if '停用' not in rows[k]['status']]
    script_langs = [c for c, _ in langs if os.path.exists(os.path.join(ROOT, 'i18n', 'script', f'{c}.js'))]
    hdr = '/* 由 tools/i18n_xlsx.py build 從 i18n_ui.xlsx 產生 —— 不要手改，改 Excel 再重跑。 */\n'
    for c, n in langs:
        tab = {r['zh']: r['tr'][c] for r in live if r['key'].startswith('T:') and r['tr'].get(c)}
        dump = json.dumps(tab, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(UI_DIR, f'{c}.js'), 'w', encoding='utf-8').write(hdr + 'export default ' + dump + ';\n')
        open(os.path.join(UI_DIR, f'{c}.classic.js'), 'w', encoding='utf-8').write(
            hdr + 'window.__TIVOT_TR=Object.assign(window.__TIVOT_TR||{},' + dump + ');\n')
        # 語言包：zh 的整棵樹，有譯文的葉子換掉（缺的就是中文 ＝ 同 deepMerge 的回退）
        tree = json.loads(json.dumps(zh))
        n_l = 0
        for r in live:
            if not r['key'].startswith('L:') or not r['tr'].get(c): continue
            path = r['key'][2:].split('.'); o = tree
            for p in path[:-1]: o = o[int(p)] if isinstance(o, list) else o[p]
            last = path[-1]
            if isinstance(o, list): o[int(last)] = r['tr'][c]
            else: o[last] = r['tr'][c]
            n_l += 1
        open(os.path.join(UI_DIR, f'pack.{c}.js'), 'w', encoding='utf-8').write(
            hdr + 'export const STRINGS = ' + json.dumps(tree, ensure_ascii=False, indent=1) + ';\n')
        print(f'  {c}: 查表字 {len(tab)} 句、語言包 {n_l} 格')
    codes = [c for c, _ in langs]
    imp = ''.join(f"import {{ STRINGS as {c.replace('-', '_')} }} from './pack.{c}.js';\n" for c in codes)
    open(os.path.join(UI_DIR, 'packs.js'), 'w', encoding='utf-8').write(
        hdr + imp + 'export const PACKS = { ' + ', '.join(f"'{c}': {c.replace('-', '_')}" for c in codes) + ' };\n')
    lj = json.dumps(codes); sj = json.dumps(script_langs)
    open(os.path.join(UI_DIR, 'langs.js'), 'w', encoding='utf-8').write(
        hdr + f'export const UI_LANGS = {lj};      // Excel 的譯文欄\nexport const SCRIPT_LANGS = {sj};  // 有劇本譯文表的（i18n/script/<lang>.js）\n')
    open(os.path.join(UI_DIR, 'langs.classic.js'), 'w', encoding='utf-8').write(
        hdr + f'window.__TIVOT_LANGS={{ui:{lj},script:{sj}}};\n')
    print('→ i18n/ui/<lang>.js（＋.classic.js）、pack.<lang>.js、packs.js、langs.js —— 接著跑 py tools/bust.py --bump')
    report(langs, rows)

def check():
    items, leaks = scan_code()
    langs, rows, order = read_xlsx()
    missing = [t for t in items if tkey(t) not in rows]
    print(f'程式裡的介面字 {len(items)} 種；還沒進 Excel 的 {len(missing)} 種（跑 sync）；漏網 {len(leaks)} 處')
    for f, l, m, raw in leaks[:40]: print(f'  {f}:{l} {m}：{raw[:60]!r}')
    bad = report(langs, rows)
    return 1 if (missing or bad) else 0

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'sync': sync()
    elif cmd == 'build': build()
    elif cmd == 'check': sys.exit(check())
    elif cmd == 'wrap': U.extract(); U.wrap()
    else: print(__doc__)

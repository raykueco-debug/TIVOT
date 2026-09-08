#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""敵人卡 ⇄ Excel（ver -943，Ray：「不要壓縮，給我統一格式，然後出一張 excel 給我，
   以後我直接輸 excel 你去讀」）

    python3 tools/enemies_xlsx.py export            # enemies.js → tools/enemies.xlsx
    python3 tools/enemies_xlsx.py import [檔案]      # Excel → 改回 enemies.js（只動有變的格）

⚠⚠⚠ **匯入是「就地改值」不是「重新產生檔案」**。
  `script/enemies.js` 裡有大量 ⚠ 註解（哪個數字是 Ray 指定的、哪個是暫定、為什麼這樣調）
  —— 那些是這個專案最貴的東西。整檔重產會把它們全部洗掉，所以匯入只做一件事：
  **把 Excel 上與現況不同的那幾格，找到原檔的那一行、替換等號右邊的值**。
  沒改的欄位一個字都不碰；改不到的（結構複雜的）一律報出來請人自己改，不硬幹。

⚠ **真相仍然是 `script/enemies.js`**（鐵律 1/7）：Excel 是**編輯用的視圖**，
  不是第二份資料。所以每次要改之前先 `export` 一次拿最新的，改完 `import` 回去 ——
  不要拿一份放了三天的 Excel 蓋回來（中間別人改過的會被你手上的舊值蓋掉）。
  ⚠ `import` 會先比對「Excel 匯出時的那一版」與「現在的檔案」是否一致，
    不一致就列出差在哪、要你確認（見 STAMP）。

⚠ 讀 enemies.js 用 macOS 的 `jsc` 跑一次真的 import（同 script_lint.py 的作法）——
  自己寫 JS 解析器一定會在某個引號或巢狀上翻車。
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS   = os.path.join(ROOT, 'script', 'enemies.js')
XLSX = os.path.join(ROOT, 'tools', 'enemies.xlsx')
JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'

# ── 巢狀欄位怎麼攤平成欄 ───────────────────────────────────────────────
#   ⚠ 只攤「格子裡填得下一個數字」的那幾個；結構複雜的（hitFx／loot／resist…）
#     整包寫成 JSON 字串，Excel 上照樣改得動，但改壞了 import 會擋下來。
WEAPONS = ['重機槍', '霰彈槍', '萊福槍']
PAIRS   = {                      # 欄位 → (子鍵順序)
    'openAssault':  ['min', 'max'],
    'assaultEvery': ['min', 'max'],
}
OBJS = {                         # 欄位 → 子鍵（缺的留空）
    'ult':          ['on', 'hp', 'count', 'atk', 'gap', 'cd'],
    'assault':      ['count', 'gap'],
    'fit':          ['mode', 'pos'],
    'delayPenalty': ['seconds', 'damage', 'dmgScale', 'timeDelta'],
    'wrongPenalty': ['damage', 'dmgScale'],
}
# 欄的順序：照卡上本來的順序排（讀第一張卡的鍵序），沒出現過的排在後面
def columns(data):
    seen, order = set(), []
    for card in data.values():
        for k in card:
            if k not in seen:
                seen.add(k); order.append(k)
    cols = ['key']
    for k in order:
        if k == 'weaponMod':
            for w in WEAPONS: cols += [f'weaponMod.{w}.傷害', f'weaponMod.{w}.迴避']
        elif k in PAIRS:  cols += [f'{k}.{s}' for s in PAIRS[k]]
        elif k in OBJS:   cols += [f'{k}.{s}' for s in OBJS[k]]
        else:             cols.append(k)
    return cols

def cell(card, col):
    """一格的值：攤平的取子鍵，其餘純量原樣、結構寫 JSON。"""
    if '.' in col:
        head, rest = col.split('.', 1)
        v = card.get(head)
        if v is None: return ''
        if head == 'weaponMod':
            w, which = rest.split('.')
            arr = (v or {}).get(w) or [0, 0]
            return arr[0] if which == '傷害' else arr[1]
        if head in PAIRS:
            i = PAIRS[head].index(rest)
            return (v or [None, None])[i]
        got = (v or {}).get(rest)
        return '' if got is None else got
    v = card.get(col)
    if v is None: return ''
    if isinstance(v, (str, int, float, bool)): return v
    return json.dumps(v, ensure_ascii=False)

def load_js():
    tmp = '/tmp/_tivot_dump_enemies.mjs'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(f"import {{ ENEMIES }} from '{JS}';\nprint(JSON.stringify(ENEMIES));\n")
    r = subprocess.run([JSC, '-m', tmp], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        sys.exit('讀不到 enemies.js：\n' + (r.stderr or '')[:800])
    return json.loads(r.stdout)

# ── 匯出 ──────────────────────────────────────────────────────────────
STAMP = '__源檔指紋__'   # 匯出當下 enemies.js 的內容雜湊；匯入時對一次
def do_export():
    import hashlib
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    data = load_js()
    cols = columns(data)
    wb = Workbook(); ws = wb.active; ws.title = '敵人卡'
    ws.append(cols)
    for k, card in data.items():
        ws.append([k] + [cell(card, c) for c in cols[1:]])
    # 版面：凍結首列與 key 欄、標題粗體、寬度依內容
    ws.freeze_panes = 'B2'
    head = Font(bold=True); fill = PatternFill('solid', fgColor='FFF2E0')
    for c in ws[1]:
        c.font = head; c.fill = fill; c.alignment = Alignment(vertical='center')
    for i, col in enumerate(cols, 1):
        w = max(len(str(col)), *(len(str(ws.cell(r, i).value or '')) for r in range(2, ws.max_row + 1)))
        ws.column_dimensions[ws.cell(1, i).column_letter].width = min(max(w + 2, 8), 46)
    # 指紋放在另一張表，不干擾編輯
    meta = wb.create_sheet('__meta__')
    meta.append([STAMP, hashlib.sha256(open(JS, 'rb').read()).hexdigest()])
    meta.append(['說明', '這一頁不要改。匯入時會拿它確認「你手上這份是從哪一版匯出的」。'])
    wb.save(XLSX)
    print(f'寫出 {XLSX}：{len(data)} 張卡、{len(cols)} 欄')

# ── 匯入（就地改值）────────────────────────────────────────────────────
def js_literal(v):
    if isinstance(v, bool):  return 'true' if v else 'false'
    if isinstance(v, (int,)):return str(v)
    if isinstance(v, float): return ('%g' % v)
    return "'" + str(v).replace("'", "\\'") + "'"

def card_span(src, key):
    m = re.search(r'\n    ' + re.escape(key) + r': \{', src)
    if not m: return None
    i = m.end(); d = 1; j = i
    while j < len(src) and d > 0:
        if src[j] == '{': d += 1
        elif src[j] == '}': d -= 1
        j += 1
    return (i, j)

def set_scalar(src, key, path, val):
    """把 <卡>.<路徑> 的值換掉；路徑是 'attack' 或 'ult.atk' 或 'weaponMod.霰彈槍.1'。"""
    sp = card_span(src, key)
    if not sp: return src, False
    i, j = sp; body = src[i:j]
    parts = path.split('.')
    if len(parts) == 1:
        pat = re.compile(r'(\n\s*' + re.escape(parts[0]) + r':\s*)([^,\n]*)')
        m = pat.search(body)
        if not m: return src, False
        body2 = body[:m.start(2)] + js_literal(val) + body[m.end(2):]
    else:
        head = parts[0]
        m = re.search(r'\n\s*' + re.escape(head) + r':\s*(\{[^{}]*\}|\[[^\]]*\])', body)
        if not m: return src, False
        blob = m.group(1)
        if head == 'weaponMod':
            w, idx = parts[1], int(parts[2])
            mm = re.search(r"('" + re.escape(w) + r"'\s*:\s*\[)([^\]]*)(\])", blob)
            if not mm: return src, False
            nums = [x.strip() for x in mm.group(2).split(',')]
            nums[idx] = js_literal(val)
            blob2 = blob[:mm.start(2)] + ','.join(nums) + blob[mm.end(2):]
        elif head in PAIRS:
            idx = PAIRS[head].index(parts[1])
            nums = [x.strip() for x in blob.strip('[]').split(',')]
            nums[idx] = js_literal(val)
            blob2 = '[' + ','.join(nums) + ']'
        else:
            sub = parts[1]
            mm = re.search(r'(\b' + re.escape(sub) + r'\s*:\s*)([^,}]*)', blob)
            if not mm: return src, False
            blob2 = blob[:mm.start(2)] + js_literal(val) + blob[mm.end(2):]
        body2 = body[:m.start(1)] + blob2 + body[m.end(1):]
    return src[:i] + body2 + src[j:], True

def do_import(path):
    import hashlib
    from openpyxl import load_workbook
    path = path or XLSX
    wb = load_workbook(path, data_only=True)
    if '__meta__' in wb.sheetnames:
        got = wb['__meta__'].cell(1, 2).value
        now = hashlib.sha256(open(JS, 'rb').read()).hexdigest()
        if got and got != now:
            print('⚠⚠ 這份 Excel 是從**別的版本**匯出的（源檔指紋對不上）。')
            print('   中間 enemies.js 被改過 —— 直接匯入會把那些改動蓋掉。')
            print('   建議：先 `export` 一份新的、把你的修改抄過去，再 import。')
            if input('   還是要繼續？(yes/N) ').strip().lower() != 'yes': return
    ws = wb['敵人卡']; rows = list(ws.values)
    cols = [str(c) for c in rows[0]]
    cur  = load_js()
    src  = open(JS, encoding='utf-8').read()
    changed, skipped, unknown = [], [], []
    for row in rows[1:]:
        if not row or not row[0]: continue
        key = str(row[0]).strip()
        if key not in cur: unknown.append(key); continue
        for c, v in zip(cols[1:], row[1:]):
            old = cell(cur[key], c)
            new = '' if v is None else v
            if isinstance(old, float) and isinstance(new, (int, float)) and abs(old - new) < 1e-9: continue
            if str(old) == str(new): continue
            path = c
            if c.startswith('weaponMod.'):
                _, w, which = c.split('.')
                path = f'weaponMod.{w}.' + ('0' if which == '傷害' else '1')
            src2, ok = set_scalar(src, key, path, new)
            if ok: src = src2; changed.append(f'{key}.{c}: {old} → {new}')
            else:  skipped.append(f'{key}.{c}（{old} → {new}）')
    if changed:
        open(JS, 'w', encoding='utf-8').write(src)
    print(f'改了 {len(changed)} 格：')
    for l in changed: print('  ', l)
    if skipped:
        print(f'⚠ 改不到 {len(skipped)} 格（結構太複雜，請直接改 enemies.js）：')
        for l in skipped: print('  ', l)
    if unknown:
        print('⚠ Excel 上有、enemies.js 沒有的卡（新增卡請直接寫進 js）：', unknown)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'export'
    if cmd == 'export': do_export()
    elif cmd == 'import': do_import(sys.argv[2] if len(sys.argv) > 2 else None)
    else: sys.exit(__doc__)

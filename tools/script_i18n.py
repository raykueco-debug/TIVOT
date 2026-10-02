#!/usr/bin/env python3
"""tools/script_i18n.py —— 劇本多語：抽出玩家看得到的中文字串（ver -1907）

    python3 tools/script_i18n.py extract            # → i18n/script/strings.json（母本清單）
    python3 tools/script_i18n.py check es           # 驗 i18n/script/es.json：缺譯／孤兒／佔位符
    python3 tools/script_i18n.py xlsx es            # → reference/script_es.xlsx（給人審）

譯文表 i18n/script/<lang>.json ＝ { 中文原句: 譯句 }。鑰匙就是原句本身：
腳本改了某一句，那一句的譯文就變成「孤兒」、新句變成「缺譯」，`check` 會列出來。
"""
import re, sys, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'i18n', 'script')
CJK  = re.compile(r'[\u3040-\u30ff\u4e00-\u9fff]')

# 劇本的來源（玩家看得到的對白／旁白／地名／角色名）
SOURCES = [
    ('script/mainScript.js', None),
    ('script/town.js',       None),
    ('script/evaluation.js', None),
    ('script/speakers.js',   {'name'}),      # 只要顯示名
    ('flight/talks.js',      None),
    ('config.js',            {'text'}),      # 只要戰鬥內對白（battles[].talk 那一族）
]

def tokens(src):
    """極簡 JS 斷詞：只認註解、字串、樣板字串、正則字面值。回 [(起點, 內容)]。"""
    i, n, out, prev = 0, len(src), [], ''
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i+2); i = n if j < 0 else j+2; continue
        if c in '\'"`':
            j, depth = i+1, 0
            while j < n:
                if src[j] == '\\': j += 2; continue
                if c != '`' and src[j] in (c, '\n'): break
                if c == '`':
                    if src[j] == '`' and depth == 0: break
                    if src.startswith('${', j): depth += 1
                    elif src[j] == '}' and depth: depth -= 1
                j += 1
            out.append((i, src[i+1:j], c)); i = j+1; prev = 'a'; continue
        if c == '/' and prev and prev in '(,=:[!&|?{};+-*%<>~^':
            j, cls = i+1, False
            while j < n and src[j] != '\n':
                if src[j] == '\\': j += 2; continue
                if src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                elif src[j] == '/' and not cls: break
                j += 1
            i = j+1
            while i < n and src[i].isalpha(): i += 1
            prev = 'a'; continue
        if not c.isspace():
            prev = 'a' if (c.isalnum() or c in '_$)]') else c
        i += 1
    return out

def unesc(s):
    def r(m):
        t = m.group(1)
        if t[0] == 'u' and t[1:2] == '{': return chr(int(t[2:-1], 16))
        if t[0] in 'ux' and len(t) > 1: return chr(int(t[1:], 16))
        return {'n': '\n', 't': '\t', 'r': '', '0': '\0'}.get(t, t)
    return re.sub(r'\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)', r, s)

def extract():
    items = {}
    for rel, keys in SOURCES:
        path = os.path.join(ROOT, rel); src = open(path, encoding='utf-8').read()
        base = 0
        if rel.endswith('.html'): pass
        helpers = dict((h, sp) for h, sp in re.findall(r"\b(\w+)\s*=\s*N\('(\w+)'\)", src))
        for pos, raw, q in tokens(src):
            if not CJK.search(raw): continue
            back = src[max(0, pos-160):pos]
            if re.search(r'console\.\w+\([^;]*$', back) or re.search(r'\bthrow\b[^;]*$', back): continue
            km = re.search(r'([A-Za-z_$][\w$]*)\s*:\s*\[?\s*$', back[-50:])
            key = km.group(1) if km else None
            if keys and key not in keys: continue
            text = unesc(raw) if q != '`' else raw
            line = src.count('\n', 0, pos) + 1
            sp = None
            near = back[-120:]
            m = list(re.finditer(r"(?:speaker|who)\s*:\s*'([\w/]+)'", near))
            if m: sp = m[-1].group(1)
            else:
                m = list(re.finditer(r"\b(\w+)\(\s*(?:'[^']*'|null)\s*,\s*$", near))
                if m and m[-1].group(1) in helpers: sp = helpers[m[-1].group(1)]
            it = items.setdefault(text, {'zh': text, 'where': [], 'speaker': [], 'key': []})
            it['where'].append(f'{rel}:{line}')
            if sp and sp not in it['speaker']: it['speaker'].append(sp)
            if key and key not in it['key']: it['key'].append(key)
    os.makedirs(OUT, exist_ok=True)
    lst = list(items.values())
    json.dump(lst, open(os.path.join(OUT, 'strings.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(lst)} 句（{sum(len(x["zh"]) for x in lst)} 字）→ i18n/script/strings.json')

def load(lang):
    src = json.load(open(os.path.join(OUT, 'strings.json'), encoding='utf-8'))
    p = os.path.join(OUT, f'{lang}.json')
    tr = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    return src, tr

def check(lang):
    src, tr = load(lang)
    zh = {x['zh'] for x in src}
    miss = [x['zh'] for x in src if not tr.get(x['zh'])]
    orphan = [k for k in tr if k not in zh]
    ph = re.compile(r'\{[A-Za-z0-9_]+\}')
    bad = [k for k in tr if k in zh and sorted(ph.findall(k)) != sorted(ph.findall(tr[k]))]
    cjk = [k for k in tr if k in zh and CJK.search(tr[k])]
    print(f'{lang}: {len(src)-len(miss)}/{len(src)} 已譯｜缺 {len(miss)}｜孤兒 {len(orphan)}｜佔位符不符 {len(bad)}｜譯文殘留中文 {len(cjk)}')
    for k in bad[:20]: print('  佔位符', repr(k), '→', repr(tr[k]))
    for k in cjk[:20]: print('  殘留', repr(k), '→', repr(tr[k]))
    return 1 if (miss or bad) else 0

def xlsx(lang):
    import openpyxl
    from openpyxl.styles import Alignment, Font
    src, tr = load(lang)
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = lang
    ws.append(['#', '說話者（自動推測，可能有誤）', '位置', '中文', lang])
    for i, x in enumerate(src, 1):
        ws.append([i, ','.join(x['speaker']), x['where'][0] + (f' (+{len(x["where"])-1})' if len(x['where']) > 1 else ''),
                   x['zh'], tr.get(x['zh'], '')])
    for c, w in zip('ABCDE', (6, 14, 26, 60, 70)): ws.column_dimensions[c].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row[3:]: c.alignment = Alignment(wrap_text=True, vertical='top')
    for c in ws[1]: c.font = Font(bold=True)
    ws.freeze_panes = 'A2'
    p = os.path.join(ROOT, 'reference', f'script_{lang}.xlsx'); wb.save(p); print('→', os.path.relpath(p, ROOT))

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'extract'
    if cmd == 'extract': extract()
    elif cmd == 'check': sys.exit(check(sys.argv[2]))
    elif cmd == 'xlsx': xlsx(sys.argv[2])

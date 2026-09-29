#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/devserver.py —— 開發用靜態伺服器（ver -1498）

    PORT=8200 python3 tools/devserver.py

與 `python3 -m http.server` 的差別**只有一件**：它收得下
`POST /__save/<白名單裡的路徑>`，把 body 寫進專案裡的那個檔。

⚠⚠⚠ **為什麼要有它**（Ray：「換 port 不該不見，寫進去就寫進去了，
  我每次重開都要再重畫一次不是很蠢嗎？」）：
  地圖編輯的筆畫本來只存在 `localStorage`，而 localStorage 是**綁 origin 的
  （含 port）** —— 8123 畫的東西 8200 看不到，清一次網站資料就全沒，
  而且玩家的瀏覽器裡根本沒有那份資料。
  ⇒ 真相搬到**檔案**（`flight/map_edits.json`）：換 port 照樣在、進得了版控、
    玩家也吃得到。瀏覽器那一份從此只是離線時的備援。

⚠⚠ **只准寫白名單裡的路徑**（`SAVE_OK`）：這是開發機上的伺服器，
  但它照樣是一個「任何人 POST 就能寫檔」的洞 —— 白名單是那道門。
  ⚠ 路徑一律以專案根目錄為準並 `realpath` 比對，擋掉 `../` 那一族。
⚠ 只聽 **127.0.0.1**（不是 0.0.0.0）：同一個網段上的別台機器不該寫得動這裡的檔。
  ⚠ 要用手機連進來測就自己改成 `''`，但那時白名單就是唯一的防線了。

⚠ ThreadingHTTPServer：單執行緒版會被一條 keep-alive 連線卡住，backlog 填滿
  之後新連線一律 connection refused —— 症狀與「伺服器被回收」一模一樣
  （ver -1370 實測）。這一條是從 `.claude/launch.json` 那段內嵌 python 搬過來的。
⚠⚠ 那三個 config（tivot / tivot-ray / tivot-verify）本來**各自抄了一份**同樣的
  程式碼 —— 現在三個都指到這一支（鐵律 7：一份實作）。
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ⚠ 白名單：**只有這幾個檔**寫得進來。新增之前先想「這個檔被亂寫會怎樣」。
SAVE_OK = {
    'flight/map_edits.json',      # 地圖編輯的筆畫（見 flight/index.html 的 MAPEDIT）
}


# ══⚠⚠ 立繪調整工具（ver -1812，Ray：「管理人模式下新增工具，劇情播放器期間可調整立繪位置與大小，
#   儲存確認後永久寫入」）══════════════════════════════════════════════════════
# `POST /__tune`，body＝`{"kind":"src"|"base", "key":"<那一張的路徑字串，原樣>", "set":{"cm":…, "yShift":…, "fxShift":…}}`
# ⇒ 在 `script/speakers.js` 裡找到**唯一**那個 `src:'<key>'`（或 `base:'<key>'`），改它所在那個物件的
#   **第一層**欄位（有就換值、沒有就補在 `{` 後面）。真相照舊只有 speakers.js 一份（鐵律 7）。
# ⚠ 只准動這三個欄位、只准動這一個檔（白名單的同一個道理）。
# ⚠ 找不到／不只一處 ⇒ 409，不猜。
import json
import re

TUNE_FILE = 'script/speakers.js'
# body 可以帶 `"file"`，只准這兩個。⚠ ver -1833 起飛行頁直接讀 speakers.js（不再有自己的取景表），
# 立繪調整只寫 speakers.js；flight/index.html 留在白名單裡是給舊請求不報錯用的。
TUNE_FILES = {'script/speakers.js', 'flight/index.html'}
TUNE_KEYS = {'cm': 1, 'standCm': 1, 'yShift': 1, 'fxShift': 3}
TUNE_BOOL = {'flip'}   # ver -1866：水平翻轉（這一張一律翻，同 speakers.js 既有的 `flip:true`；寫 false＝蓋掉角色層的 true）   # 欄位 → 小數位數（standCm：ver -1827，兩份取景的頭頂要同一個數字）


def _depth_map(text, start):
    """從 start（一個 `{`）往後掃，回傳 (end, top)：end＝對應的 `}`，top＝落在第一層（非字串、非註解）的索引集合。"""
    depth = 0
    i = start
    n = len(text)
    top = set()
    while i < n:
        c = text[i]
        if c in '\'"`':
            q = c
            i += 1
            while i < n and text[i] != q:
                i += 2 if text[i] == '\\' else 1
            i += 1
            continue
        if text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i, top
        elif depth == 1:
            top.add(i)
        i += 1
    return -1, top


def tune_patch(text, kind, key, sets):
    """同一張圖在檔裡出現幾次就寫幾次（ver -1823）：別名鍵（awkward／awkwerd…）或兩份表指到同一張圖時，
    它們本來就該是同一組取景（§6.5「同一張立繪＝同一個結果」）。一處都沒有 ⇒ 409。"""
    needle = "%s:'%s'" % (kind, key)
    n = text.count(needle)
    if n < 1:
        raise ValueError('找不到 %s' % needle)
    # 由後往前改：前面的索引不會被後面的改動推移
    ats = []
    i = text.find(needle)
    while i >= 0:
        ats.append(i)
        i = text.find(needle, i + 1)
    for at in reversed(ats):
        text = _patch_at(text, at, needle, sets)
    return text


def _patch_at(text, at, needle, sets):
    # 往回找包住它的那個 `{`（同一層）
    depth = 0
    i = at - 1
    while i >= 0:
        if text[i] == '}':
            depth += 1
        elif text[i] == '{':
            if depth == 0:
                break
            depth -= 1
        i -= 1
    if i < 0:
        raise ValueError('找不到包住 %s 的物件' % needle)
    start = i
    end, top = _depth_map(text, start)
    if end < 0:
        raise ValueError('物件沒有收尾')
    body = text[start:end + 1]
    for k, v in sets.items():
        if (k not in TUNE_KEYS and k not in TUNE_BOOL) or v is None:
            continue
        if k in TUNE_BOOL:
            val = 'true' if v else 'false'
            vre = r'(?:true|false)'
        else:
            val = ('%.' + str(TUNE_KEYS[k]) + 'f') % float(v)
            val = val.rstrip('0').rstrip('.') if '.' in val else val
            if val in ('', '-0'):
                val = '0'
            vre = r'-?[\d.]+'
        hit = None
        for m in re.finditer(r'\b' + k + r'\s*:\s*' + vre, body):
            if (start + m.start()) in top:
                hit = m
                break
        if hit:
            body = body[:hit.start()] + k + ':' + val + body[hit.end():]
        else:
            body = '{ ' + k + ':' + val + ',' + body[1:]
        # 重算第一層索引（長度變了）
        text2 = text[:start] + body + text[end + 1:]
        end2, top = _depth_map(text2, start)
        text, end = text2, end2
        body = text[start:end + 1]
    return text


# ══⚠⚠ 改某一拍的立繪（ver -1826，Ray：「管理者功能，對話、戰鬥中點立繪可以更改該拍的立繪」）══
# `POST /__beat`，body＝`{"text":台詞, "old":舊差分(null＝沒寫), "new":新差分, "field":"expr"|"img",
#                        "prev":上一拍台詞?, "next":下一拍台詞?}`
# 在腳本檔裡找**同一行**同時有 `'台詞'` 與舊差分的那一行；不只一行就用前後一拍的台詞（上下 6 行內）篩；
# 還是不只一行（或一行都沒有）⇒ 409，不猜。只改那一行的差分字面：
#   field=expr：`expr:'舊'` → `expr:'新'`，或輔助函式的第一個參數 `ren('舊',` → `ren('新',`（舊＝null 也吃）
#   field=img ：`img:'舊'` → `img:'新'`（戰鬥內對白）
# 前後一拍往外找幾行（ver -1866 由 6 放寬：拍子之間常隔著一大段註解，實測主線開場「啊！」與下一拍隔 11 行）。
NEAR = 20
BEAT_FILES = ['script/town.js', 'script/mainScript.js', 'config.js', 'script/evaluation.js',
              'flight/talks.js', 'flight/index.html']   # 飛行對白（ver -1827）：field=who ⇒ `who:'renna/relief'`


def _js_str(s):
    return "'" + str(s).replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


def _beat_line_ok(line, text, old, field):
    if _js_str(text) not in line:
        return False
    if field == 'img':
        return ("img:" + _js_str(old)) in line.replace(' ', '')
    if field == 'who':
        return ("who:" + _js_str(old)) in line.replace(' ', '')
    if old is None:
        return bool(re.search(r"\b[a-zA-Z_]\w*\(\s*null\s*,", line) or re.search(r"expr\s*:\s*null", line))
    return bool(re.search(r"expr\s*:\s*" + re.escape(_js_str(old)), line) or
                re.search(r"\b[a-zA-Z_]\w*\(\s*" + re.escape(_js_str(old)) + r"\s*,", line))


def _beat_replace(line, old, new, field):
    if field == 'img':
        return re.sub(r"img\s*:\s*" + re.escape(_js_str(old)), "img:" + _js_str(new), line, count=1)
    if field == 'who':
        return re.sub(r"who\s*:\s*" + re.escape(_js_str(old)), "who:" + _js_str(new), line, count=1)
    olit = 'null' if old is None else re.escape(_js_str(old))
    out, n = re.subn(r"expr(\s*):(\s*)" + olit, lambda m: 'expr' + m.group(1) + ':' + m.group(2) + _js_str(new), line, count=1)
    if n:
        return out
    return re.sub(r"(\b[a-zA-Z_]\w*\(\s*)" + olit + r"(\s*,)", lambda m: m.group(1) + _js_str(new) + m.group(2), line, count=1)


def beat_patch(req):
    text, old, new = req.get('text') or '', req.get('old'), req.get('new')
    field = req.get('field') or 'expr'
    hits = []
    for rel in BEAT_FILES:
        path = os.path.join(ROOT, rel)
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.read().split('\n')
        for i, ln in enumerate(lines):
            if _beat_line_ok(ln, text, old, field):
                hits.append((rel, i, lines))
    def near(h, t, lo, hi):
        if t is None:
            return True
        lit = _js_str(t)
        return any(lit in h[2][j] for j in range(max(0, h[1] + lo), min(len(h[2]), h[1] + hi + 1)) if j != h[1])
    if len(hits) > 1:
        hits = [h for h in hits if near(h, req.get('prev'), -NEAR, -1) and near(h, req.get('next'), 1, NEAR)]
    if len(hits) != 1:
        raise ValueError('找到 %d 行符合（要剛好一行）：台詞 %s／舊差分 %s' % (len(hits), _js_str(text), old))
    rel, i, lines = hits[0]
    newline = _beat_replace(lines[i], old, new, field)
    if newline == lines[i]:
        raise ValueError('那一行改不動：' + lines[i].strip()[:80])
    lines[i] = newline
    dst = os.path.join(ROOT, rel)
    tmp = dst + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    os.replace(tmp, dst)
    return '%s:%d' % (rel, i + 1)


# ══ 改某一拍的台詞（ver -1828，Ray：「對話框也插個編輯鈕改台詞」）══
# `POST /__text`，body＝`{"text":原台詞, "new":新台詞, "prev":上一拍?, "next":下一拍?}`
# 同 `/__beat` 的定位法（同一行有 `'原台詞'`；不只一行就用前後一拍篩），只把那一行的那個字串換掉。
def text_patch(req):
    text, new = req.get('text'), req.get('new')
    if text is None or new is None:
        raise ValueError('缺 text／new')
    lit = _js_str(text)
    hits = []
    for rel in BEAT_FILES:
        path = os.path.join(ROOT, rel)
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.read().split('\n')
        for i, ln in enumerate(lines):
            if lit in ln:
                hits.append((rel, i, lines))
    def near(h, t, lo, hi):
        if t is None:
            return True
        l2 = _js_str(t)
        return any(l2 in h[2][j] for j in range(max(0, h[1] + lo), min(len(h[2]), h[1] + hi + 1)) if j != h[1])
    # `mark`＝這一拍同一行一定有的字面（差分名／img 鍵／who）—— 兩條支線同一句台詞時靠它分開。
    if len(hits) > 1 and req.get('mark'):
        mk = _js_str(req['mark'])
        hits = [h for h in hits if mk in h[2][h[1]]] or hits
    if len(hits) > 1:
        hits = [h for h in hits if near(h, req.get('prev'), -NEAR, -1) and near(h, req.get('next'), 1, NEAR)]
    if len(hits) != 1:
        raise ValueError('找到 %d 行有這句（要剛好一行）：%s' % (len(hits), lit))
    rel, i, lines = hits[0]
    if lines[i].count(lit) != 1:
        raise ValueError('那一行有 %d 處同樣的字串，不猜：%s' % (lines[i].count(lit), lines[i].strip()[:80]))
    lines[i] = lines[i].replace(lit, _js_str(new), 1)
    dst = os.path.join(ROOT, rel)
    tmp = dst + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    os.replace(tmp, dst)
    return '%s:%d' % (rel, i + 1)


# ══ 插入／刪除一拍（ver -1866，Ray：「除了編輯對話，也加入插入、刪除對話功能」）══
# `POST /__line`，body＝`{"op":"insert"|"delete", "text":定位用的原台詞, "mark":差分?, "prev":?, "next":?,
#                        "where":"before"|"after", "beat":{"speaker","expr","text"}}`
# 定位同 `/__text`（原台詞＋差分＋前後一拍，要剛好一拍）。拍子可以跨多行：從台詞那一行開頭
#   （`{` 或 `ren(`）括號配對到結尾（`_beat_span`）；台詞不在拍子第一行、或配對不起來 ⇒ 409，不猜。
# ⚠ 只准動主線與城鎮兩支腳本（戰鬥對白／飛行閒聊的格式不同）。
LINE_FILES = ['script/town.js', 'script/mainScript.js']


FX_NAME = re.compile(r'^[a-z]+$')


def _fx_literal(v):
    """對話框效果（ver -1870）：None／空 ⇒ None；一個 ⇒ 'fear'；多個 ⇒ ['fear','sweat']。"""
    vals = [x for x in ([v] if isinstance(v, str) else (v or [])) if isinstance(x, str) and FX_NAME.match(x)]
    if not vals:
        return None
    if len(vals) == 1:
        return _js_str(vals[0])
    return '[' + ','.join(_js_str(x) for x in vals) + ']'


FX_ANY = r"bubbleFx\s*:\s*(?:'[^']*'|\[[^\]]*\])"


def _beat_literal(b):
    sp = str(b.get('speaker') or 'NARRATION')
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', sp):
        raise ValueError('speaker 不合法：' + sp)
    txt = b.get('text') or ''
    if sp == 'PLAYER' and not txt:
        fx = _fx_literal(b.get('bubbleFx'))   # ver -1872：空白框也帶得了效果
        return "{ speaker:'PLAYER', blank:true" + (", bubbleFx:" + fx if fx else '') + " },"
    out = "{ speaker:" + _js_str(sp) + ", text:" + _js_str(txt)
    ex = b.get('expr')
    if sp not in ('NARRATION', 'PLAYER'):
        out += ", portrait:{ char:" + _js_str(sp) + ", expr:" + ('null' if not ex else _js_str(ex)) + ", show:true }"
    fx = _fx_literal(b.get('bubbleFx'))
    if fx:
        out += ", bubbleFx:" + fx
    return out + " },"


BLANK_TAG = '\u0001B'
KEY_SEP = '\u0002'
_STR = r"'((?:[^'\\]|\\.)*)'"


def _js_unstr(s):
    return re.sub(r"\\(.)", lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), s)


def _beat_key(chunk):
    """一拍在序列比對裡的鑰匙：空白框 ⇒ BLANK_TAG；有台詞 ⇒「台詞 + KEY_SEP + 差分」；其餘 ⇒ None（不比）。
    ⚠ 差分也要比（ver -1873）：同一段對白抄在兩個分支裡時，台詞常常一字不差、只有表情不同。
    ⚠ 與 story.js 的 edLocate 那一支 `key()` 是同一個格式，改一邊要改另一邊。"""
    if re.search(r"blank\s*:\s*true", chunk):
        return BLANK_TAG
    m = re.match(r"\s*(?:Object\.assign\(\s*)*[A-Za-z_]\w*\(\s*(null|" + _STR + r")\s*,\s*" + _STR, chunk)
    if m:
        return _js_unstr(m.group(3)) + KEY_SEP + (_js_unstr(m.group(2)) if m.group(2) is not None else '')
    m = re.search(r"\btext\s*:\s*" + _STR, chunk)
    if m:
        e = re.search(r"\bexpr\s*:\s*" + _STR, chunk)
        return _js_unstr(m.group(1)) + KEY_SEP + (_js_unstr(e.group(1)) if e else '')
    return None


def _scan(text):
    """整份檔掃一次（ver -1874）：回傳 (配對表 open→close, 陣列元素的起點清單)。
    元素起點＝字串／註解之外、前一個有意義的字元是 `[` 或 `,`，而且接著是 `{` 或 `名字(`。
    ⚠ 以前是「一拍＝從行首開始、結尾只剩逗號的那幾行」—— `ren(...) ],`（拍子後面同一行接陣列收尾）
      與 `meet:{ lines:[ { speaker:… },`（拍子從行中間開始）都認不出來，插入／刪除就「找到 0 拍」。"""
    n = len(text)
    match, stack, starts = {}, [], []
    prev_sig = '['          # 檔頭視為在陣列開頭之後（不會真的用到）
    i = 0
    while i < n:
        c = text[i]
        if c in '\'"`':
            q = c
            i += 1
            while i < n and text[i] != q:
                i += 2 if text[i] == '\\' else 1
            i += 1
            prev_sig = q
            continue
        if text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c.isspace():
            i += 1
            continue
        if prev_sig in '[,' and (c == '{' or c.isalpha() or c in '_$'):
            if c == '{':
                starts.append(i)
            else:
                m = re.match(r'[A-Za-z_$][\w$.]*\(', text[i:i + 80])
                if m:
                    starts.append(i)
        if c in '([{':
            stack.append(i)
        elif c in ')]}':
            if stack:
                match[stack.pop()] = i
        prev_sig = c
        i += 1
    return match, starts


def _elements(text):
    """(起點, 結尾那個括號的位置) —— 起點是 `名字(` 就配對那個 `(`。"""
    match, starts = _scan(text)
    out = []
    for s in starts:
        o = s if text[s] == '{' else text.index('(', s)
        e = match.get(o)
        if e is not None:
            out.append((s, e))
    return out


def _is_beat(seg):
    if seg.startswith('{'):
        m = re.search(r"\bspeaker\s*:|\[", re.sub(FX_ANY, '', seg))   # 多選效果的 `[` 不算（它在 speaker 前面）
        return bool(m) and m.group(0) != '['
    return bool(re.match(r"(Object\.assign\(\s*)*[A-Za-z_]\w*\(\s*(null|')", seg))


def _beats(text):
    """這一份檔裡所有的拍（依位置排，最內層）：[(起點, 結尾, 鑰匙)]。"""
    els = sorted((s, e) for s, e in _elements(text) if _is_beat(text[s:e + 1]))
    out = []
    for k, (s, e) in enumerate(els):
        # 只留最內層的拍：元素是正確巢狀的，下一個拍的起點落在自己裡面 ⇒ 自己是外層
        if k + 1 < len(els) and els[k + 1][0] <= e:
            continue
        out.append((s, e, _beat_key(text[s:e + 1])))
    return out


def _line_of(text, off):
    return text.count('\n', 0, off)


def _find_beat(req, files):
    """原台詞（＋差分＋前後一拍＋前後序列）→ 剛好一拍：(rel, text, 起點, 結尾, beats, 第幾拍)。"""
    want = None if req.get('blank') else (req.get('text') or '')
    hits = []
    for rel in files:
        with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
            text = f.read()
        beats = _beats(text)
        for b, (s, e, key) in enumerate(beats):
            if key is None:
                continue
            if want is None:
                ok = key == BLANK_TAG
            else:
                ok = key != BLANK_TAG and key.split(KEY_SEP, 1)[0] == want
            if ok:
                hits.append((rel, text, s, e, beats, b))

    def seg(h):
        return h[1][h[2]:h[3] + 1]

    def txt(h, k):
        b = h[5] + k
        if b < 0 or b >= len(h[4]):
            return None
        key = h[4][b][2]
        return key.split(KEY_SEP, 1)[0] if key and key != BLANK_TAG else None

    if len(hits) > 1 and req.get('mark'):
        mk = _js_str(req['mark'])
        hits = [h for h in hits if mk in seg(h)] or hits
    if len(hits) > 1 and (req.get('prev') is not None or req.get('next') is not None):
        narrowed = [h for h in hits
                    if (req.get('prev') is None or txt(h, -1) == req['prev'])
                    and (req.get('next') is None or txt(h, 1) == req['next'])]
        hits = narrowed or hits
    if len(hits) > 1 and (req.get('before') or req.get('after')):
        hits = _pick_by_seq(hits, req.get('before') or [], req.get('after') or [])
    if len(hits) != 1:
        raise ValueError('找到 %d 拍（要剛好一拍）：%s' % (len(hits), '（空白框）' if want is None else _js_str(want)))
    return hits[0]


def _pick_by_seq(hits, before, after):
    scored = []
    for h in hits:
        beats, b = h[4], h[5]
        score = 0
        for k, want in enumerate(before, 1):            # 由近到遠，連續對得上才加分
            if b - k < 0 or beats[b - k][2] != want:
                break
            if want is not None:
                score += 1
        for k, want in enumerate(after, 1):
            if b + k >= len(beats) or beats[b + k][2] != want:
                break
            if want is not None:
                score += 1
        scored.append((score, h))
    best = max(sc for sc, _ in scored)
    top = [h for sc, h in scored if sc == best]
    return top if best > 0 else hits


def _write_text(rel, text):
    dst = os.path.join(ROOT, rel)
    tmp = dst + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    os.replace(tmp, dst)


def _set_fx_seg(seg, value):
    """一拍的原始碼 seg → 把 `bubbleFx` 設成 value（None＝拿掉）後的 seg。"""
    lit = _fx_literal(value)
    if re.search(FX_ANY, seg):
        if lit:
            return re.sub(FX_ANY, 'bubbleFx:' + lit, seg, count=1)
        s2 = re.sub(r"\{\s*" + FX_ANY + r"\s*\}", '{ }', seg, count=1)   # 唯一的鍵（Object.assign 包的那一種）
        if s2 == seg:
            s2 = re.sub(r"\s*" + FX_ANY + r"\s*,", '', seg, count=1)
        if s2 == seg:
            s2 = re.sub(r"\s*,\s*" + FX_ANY, '', seg, count=1)
        m = re.match(r"^Object\.assign\((.*),\s*\{\s*\}\)$", s2, re.S)
        return m.group(1) if m else s2
    if not lit:
        return seg
    if seg.startswith('{'):
        return '{ bubbleFx:' + lit + ',' + seg[1:]
    m = re.match(r"^(Object\.assign\(.*,\s*\{)(.*\}\))$", seg, re.S)   # 已經包過一層 ⇒ 塞進最後那個物件
    if m:
        return m.group(1) + ' bubbleFx:' + lit + ',' + m.group(2)
    return 'Object.assign(' + seg + ', { bubbleFx:' + lit + ' })'


def line_patch(req):
    op = req.get('op')
    if op not in ('insert', 'delete', 'set'):
        raise ValueError('op 只能是 insert／delete／set')
    rel, text, s, e, _, _ = _find_beat(req, LINE_FILES)
    ln = _line_of(text, s) + 1
    ls = text.rfind('\n', 0, s) + 1                     # 起點那一行的行首
    le = text.find('\n', e)
    le = len(text) if le < 0 else le                    # 結尾那一行的行尾
    if op == 'set':
        if req.get('key') != 'bubbleFx':
            raise ValueError('set 只准改 bubbleFx')
        seg = text[s:e + 1]
        new = _set_fx_seg(seg, req.get('value'))
        if new == seg:
            return '%s:%d 沒有變動' % (rel, ln)
        _write_text(rel, text[:s] + new + text[e + 1:])
        return '%s:%d' % (rel, ln)
    after = e + 1                                       # 拍子後面緊接的逗號算這一拍的
    m = re.match(r'[ \t]*,', text[after:le])
    comma = bool(m)
    if m:
        after += m.end()
    lead = text[ls:s]                                   # 同一行、拍子前面的東西
    tail = text[after:le]                               # 同一行、拍子（與它的逗號）後面的東西
    only_ws_lead = not lead.strip()
    tail_is_comment = (not tail.strip()) or tail.strip().startswith('//') or tail.strip().startswith('/*')
    if op == 'delete':
        gone = re.sub(r'\s+', ' ', text[s:e + 1])[:60]
        prev_nl = ls - 1                                # 上一行的行尾（換行字元的位置）
        prev_ls = text.rfind('\n', 0, prev_nl) + 1 if prev_nl >= 0 else 0
        prev_line = text[prev_ls:prev_nl] if prev_nl >= 0 else ''
        if only_ws_lead and tail_is_comment:
            new = text[:ls] + text[le + 1:]             # 整行（連同註解）都是這一拍 ⇒ 拿掉整行
        elif only_ws_lead and re.match(r'\s*[\]\})]', tail) and prev_nl >= 0 and '//' not in prev_line and '/*' not in prev_line:
            # 這一行只剩陣列收尾（`],`）⇒ 接回上一行，上一行多出來的逗號一併拿掉（插入時補的）
            head = prev_line.rstrip()
            head = head[:-1] if head.endswith(',') else head
            new = text[:prev_ls] + head + ' ' + tail.strip() + text[le:]
        elif not only_ws_lead and not tail.strip():
            # 拍子在行尾、前面還有別的（`lines:[ `）⇒ 下一行接回來
            nxt = re.match(r'\n[ \t]*', text[le:])
            new = text[:s] + text[le + (nxt.end() if nxt else 0):]
        else:
            new = text[:s] + text[after:].lstrip(' \t')   # 行裡還有別的 ⇒ 只拿掉這一拍
        _write_text(rel, new)
        return '%s:%d 刪除 %s' % (rel, ln, gone)
    ind = lead if only_ws_lead else ' ' * len(lead)
    lit = _beat_literal(req.get('beat') or {})
    if req.get('where') == 'before':
        if only_ws_lead:
            new = text[:ls] + ind + lit + '\n' + text[ls:]
        else:
            new = text[:s] + lit + '\n' + ind + text[s:]
        _write_text(rel, new)
        return '%s:%d 插入' % (rel, ln)
    if not comma:                                       # 這一拍原本是清單的最後一個 ⇒ 先補逗號
        text = text[:e + 1] + ',' + text[e + 1:]
        after, le = e + 2, le + 1
        tail = text[after:le]
        tail_is_comment = (not tail.strip()) or tail.strip().startswith('//') or tail.strip().startswith('/*')
    if tail_is_comment:
        new = text[:le] + '\n' + ind + lit + text[le:]
    else:
        new = text[:after] + '\n' + ind + lit + ' ' + tail.lstrip() + text[le:]
    _write_text(rel, new)
    return '%s:%d 插入' % (rel, ln + 1)


def beat_span_patch(req):
    """`/__beat` 的退路（ver -1866）：差分寫在拍子的另一行（跨多行的物件）時，以整拍為範圍換 `expr`。"""
    if (req.get('field') or 'expr') != 'expr':
        raise ValueError('只支援 expr')
    old, new = req.get('old'), req.get('new')
    rel, text, s, e, _, _ = _find_beat(dict(req, mark=None), BEAT_FILES)
    olit = 'null' if old is None else re.escape(_js_str(old))
    seg = text[s:e + 1]
    out, n = re.subn(r"expr(\s*):(\s*)" + olit, lambda m: 'expr' + m.group(1) + ':' + m.group(2) + _js_str(new), seg, count=1)
    if not n:
        raise ValueError('那一拍裡找不到 expr:%s' % ('null' if old is None else _js_str(old)))
    _write_text(rel, text[:s] + out + text[e + 1:])
    return '%s:%d' % (rel, _line_of(text, s) + 1)


class Handler(http.server.SimpleHTTPRequestHandler):
    def _fail(self, code, msg):
        body = msg.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.split('?')[0] == '/__text':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                sys.stderr.write('[devserver] text %s\n' % json.dumps(req, ensure_ascii=False))
                where = text_patch(req)
            except ValueError as e:
                return self._fail(409, str(e))
            except Exception as e:                        # noqa: BLE001
                return self._fail(500, '寫檔失敗：%s' % e)
            return self._fail(200, 'ok ' + where)
        if self.path.split('?')[0] == '/__line':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                sys.stderr.write('[devserver] line %s\n' % json.dumps(req, ensure_ascii=False))
                where = line_patch(req)
            except ValueError as e:
                return self._fail(409, str(e))
            except Exception as e:                        # noqa: BLE001
                return self._fail(500, '寫檔失敗：%s' % e)
            return self._fail(200, 'ok ' + where)
        if self.path.split('?')[0] == '/__beat':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                sys.stderr.write('[devserver] beat %s\n' % json.dumps(req, ensure_ascii=False))
                try:
                    where = beat_patch(req)
                except ValueError as e1:        # 差分寫在拍子的另一行（跨多行）⇒ 以整拍為範圍再試一次
                    try:
                        where = beat_span_patch(req)
                    except ValueError:
                        raise e1
            except ValueError as e:
                return self._fail(409, str(e))
            except Exception as e:                        # noqa: BLE001
                return self._fail(500, '寫檔失敗：%s' % e)
            return self._fail(200, 'ok ' + where)
        if self.path.split('?')[0] == '/__tune':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                sys.stderr.write('[devserver] tune %s\n' % json.dumps(req, ensure_ascii=False))
                rel = req.get('file') or TUNE_FILE
                if rel not in TUNE_FILES:
                    return self._fail(403, '不在白名單裡：' + rel)
                dst = os.path.join(ROOT, rel)
                with open(dst, 'r', encoding='utf-8') as f:
                    text = f.read()
                # 批次（ver -1825，「標準化」＝一個角色的所有立繪套同一組值）：`items:[{kind,key}]`，
                # 同一個檔只讀寫一次；找不到的那幾張跳過、回報數字（整批都找不到才算失敗）。
                if req.get('items'):
                    out, hit, miss = text, 0, []
                    for it in req['items']:
                        try:
                            out = tune_patch(out, it.get('kind'), it.get('key'), req.get('set') or {})
                            hit += 1
                        except ValueError:
                            miss.append(it.get('key'))
                    if not hit:
                        return self._fail(409, '一張都找不到（%d 張）' % len(miss))
                    tmp = dst + '.tmp'
                    with open(tmp, 'w', encoding='utf-8') as f:
                        f.write(out)
                    os.replace(tmp, dst)
                    return self._fail(200, 'ok %d/%d' % (hit, hit + len(miss)))
                out = tune_patch(text, req.get('kind'), req.get('key'), req.get('set') or {})
                tmp = dst + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    f.write(out)
                os.replace(tmp, dst)
            except ValueError as e:
                return self._fail(409, str(e))
            except Exception as e:                        # noqa: BLE001
                return self._fail(500, '寫檔失敗：%s' % e)
            return self._fail(200, 'ok')
        if not self.path.startswith('/__save/'):
            return self._fail(404, 'no such endpoint')
        rel = self.path[len('/__save/'):].split('?')[0].lstrip('/')
        if rel not in SAVE_OK:
            return self._fail(403, '不在白名單裡：' + rel)
        dst = os.path.realpath(os.path.join(ROOT, rel))
        if os.path.commonpath([dst, ROOT]) != ROOT:      # 擋 `../`
            return self._fail(403, '路徑跑到專案外面了')
        try:
            n = int(self.headers.get('Content-Length') or 0)
            data = self.rfile.read(n)
            # ⚠ 先寫暫存再 replace：寫到一半斷線不會留下半個檔
            #   （那個檔一壞，開機就沒有地形了，而且看不出為什麼）。
            tmp = dst + '.tmp'
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, dst)
        except Exception as e:                            # noqa: BLE001
            return self._fail(500, '寫檔失敗：%s' % e)
        self._fail(200, 'ok %d bytes' % len(data))

    def log_message(self, fmt, *args):
        # POST 要看得到（存檔有沒有進來）；GET 太吵，維持 http.server 的預設行為
        if args and str(args[0]).startswith('POST'):
            sys.stderr.write('[devserver] %s\n' % (fmt % args))


def main():
    port = int(os.environ.get('PORT', '8000'))
    h = functools.partial(Handler, directory=ROOT)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), h)
    srv.daemon_threads = True
    print('serving on', port, '（可存檔：' + '、'.join(sorted(SAVE_OK)) + '）', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()

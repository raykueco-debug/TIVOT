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
TUNE_KEYS = {'cm': 1, 'standCm': 1, 'yShift': 1, 'fxShift': 3}   # 欄位 → 小數位數（standCm：ver -1827，兩份取景的頭頂要同一個數字）


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
        if k not in TUNE_KEYS or v is None:
            continue
        val = ('%.' + str(TUNE_KEYS[k]) + 'f') % float(v)
        val = val.rstrip('0').rstrip('.') if '.' in val else val
        if val in ('', '-0'):
            val = '0'
        hit = None
        for m in re.finditer(r'\b' + k + r'\s*:\s*-?[\d.]+', body):
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
        hits = [h for h in hits if near(h, req.get('prev'), -6, -1) and near(h, req.get('next'), 1, 6)]
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
        hits = [h for h in hits if near(h, req.get('prev'), -6, -1) and near(h, req.get('next'), 1, 6)]
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
        if self.path.split('?')[0] == '/__beat':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                sys.stderr.write('[devserver] beat %s\n' % json.dumps(req, ensure_ascii=False))
                where = beat_patch(req)
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

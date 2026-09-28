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
# ver -1818：飛行頁的立繪取景是另一份（`flight/index.html` 的 PORTRAIT／PORTRAIT_EXPR），憲法 §5 要兩邊一起改 ——
# 所以 body 可以帶 `"file"`，只准這兩個。
TUNE_FILES = {'script/speakers.js', 'flight/index.html'}
TUNE_KEYS = {'cm': 1, 'yShift': 1, 'fxShift': 3}   # 欄位 → 小數位數


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


class Handler(http.server.SimpleHTTPRequestHandler):
    def _fail(self, code, msg):
        body = msg.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.split('?')[0] == '/__tune':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                req = json.loads(self.rfile.read(n).decode('utf-8'))
                rel = req.get('file') or TUNE_FILE
                if rel not in TUNE_FILES:
                    return self._fail(403, '不在白名單裡：' + rel)
                dst = os.path.join(ROOT, rel)
                with open(dst, 'r', encoding='utf-8') as f:
                    text = f.read()
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

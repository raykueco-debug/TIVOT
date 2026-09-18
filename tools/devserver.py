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


class Handler(http.server.SimpleHTTPRequestHandler):
    def _fail(self, code, msg):
        body = msg.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
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

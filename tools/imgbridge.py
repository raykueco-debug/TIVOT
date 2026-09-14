# -*- coding: utf-8 -*-
"""本機圖橋 —— 內建瀏覽器沒有上傳／下載工具時的替代路（美術產線用）。

  GET  /<檔名>                    讀 SERVE_DIR 底下的檔
  GET  /grab?f=<檔名>&back=<網址>  把圖以 base64 塞進 window.name，再導回 back
  POST /save?name=<檔名>           收 multipart 檔案寫進 DROP_DIR，**回 204**
                                   （204 ＝ 瀏覽器不導頁，頁面留在原地）

⚠ chatgpt.com 的 CSP 實測（ver -1264）：
  · connect-src 白名單 ⇒ fetch／XHR 到本機一律擋
  · img-src *          ⇒ CSP 放行，但**混合內容**擋：`localhost` 會被自動升級成
                          https、`127.0.0.1` 因為是 IP 不升級但直接擋
  · form-action 未設定 ⇒ **表單 POST 出去可以**（存檔那一路）
  · window.name        ⇒ 跨網域導頁不清除（進料那一路）
  兩條路加起來就是雙向的橋，不需要瀏覽器擴充功能。

⚠ 只綁 127.0.0.1、只讀 SERVE_DIR、只寫 DROP_DIR。
"""
import os, sys, re, cgi, base64, json
from urllib.parse import urlparse, parse_qs
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SERVE_DIR = sys.argv[1]
DROP_DIR = sys.argv[2]
PORT = int(sys.argv[3]) if len(sys.argv) > 3 else 8777
os.makedirs(DROP_DIR, exist_ok=True)

SAFE = re.compile(r'^[A-Za-z0-9_.\-]{1,120}$')
MIME = {'webp': 'image/webp', 'png': 'image/png',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg'}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE_DIR, **kw)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if not self.path.startswith('/grab'):
            return super().do_GET()
        q = parse_qs(urlparse(self.path).query)
        fn = os.path.basename((q.get('f') or [''])[0])
        back = (q.get('back') or [''])[0] or 'about:blank'
        p = os.path.join(SERVE_DIR, fn)
        if not fn or not os.path.isfile(p):
            self.send_response(404)
            self.end_headers()
            return
        b64 = base64.b64encode(open(p, 'rb').read()).decode()
        mime = MIME.get(os.path.splitext(fn)[1].lower().lstrip('.'),
                        'application/octet-stream')
        html = ('<!doctype html><meta charset=utf-8><title>bridge</title>'
                '<script>window.name=%s+"|"+%s+"|"+%s;location.replace(%s);</script>'
                '載入中…' % (json.dumps(fn), json.dumps(mime),
                            json.dumps(b64), json.dumps(back)))
        body = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        print('GRAB %s  %d b64chars' % (fn, len(b64)), flush=True)

    def do_POST(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile, headers=self.headers,
                environ={'REQUEST_METHOD': 'POST',
                         'CONTENT_TYPE': self.headers.get('Content-Type', '')})
            item = form['f'] if 'f' in form else None
            name = form.getvalue('name') or (item.filename if item else None) or 'drop.bin'
            name = os.path.basename(name)
            if not SAFE.match(name):
                name = 'drop.bin'
            data = item.file.read() if item is not None else b''
            with open(os.path.join(DROP_DIR, name), 'wb') as f:
                f.write(data)
            print('SAVED %s  %d bytes' % (name, len(data)), flush=True)
        except Exception as e:
            print('ERR %s' % e, flush=True)
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


print('serve=%s  drop=%s  port=%d' % (SERVE_DIR, DROP_DIR, PORT), flush=True)
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()

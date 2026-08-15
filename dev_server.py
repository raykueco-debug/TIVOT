#!/usr/bin/env python3
# 開發用靜態伺服器：等同 python3 -m http.server，但回應加 Cache-Control: no-store——
# 瀏覽器對無驗證頭的靜態檔會用 heuristic cache，改完模組後可能餵舊檔（曾害雙槍教學吃到舊 weapon.js）。
import http.server, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()

#!/usr/bin/env python3
# 開發用靜態伺服器：等同 python3 -m http.server，但回應加 Cache-Control: no-store——
# 瀏覽器對無驗證頭的靜態檔會用 heuristic cache，改完模組後可能餵舊檔（曾害雙槍教學吃到舊 weapon.js）。
import http.server, os, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

# port 來源優先序：命令列引數 > PORT 環境變數 > 8123。
# 中間那段是給 .claude/launch.json 的 autoPort 用的——由 harness 指派 port，
# 才不會像先前那樣每個 session 在 launch.json 裡多加一個連號的固定 port，
# 最後撞在一起（8128 被另一個 session 佔住）。
port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 8123)
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()

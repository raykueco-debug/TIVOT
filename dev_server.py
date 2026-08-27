#!/usr/bin/env python3
# 開發用靜態伺服器：等同 python3 -m http.server，但快取頭分兩種——
# · 程式檔（js/css/html）→ Cache-Control: no-store：改完模組立刻吃到新檔
#   （瀏覽器對無驗證頭的靜態檔會用 heuristic cache，曾害雙槍教學吃到舊 weapon.js）。
# · 資源檔（圖/音/字型）→ Cache-Control: no-cache：**可以存、但每次重驗證**。
#   SimpleHTTPRequestHandler（Py3.7+）認得 If-Modified-Since → 檔案沒改就回 304，
#   瀏覽器直接用快取。⚠ 以前整站 no-store 的代價（ver -472 的教訓）：每一次
#   document 載入（重整、出航時飛行頁 reload）所有圖整包重抓，楣（kerberos_top，
#   130KB WebP）邊下載邊解碼，看起來就是「由上而下刷出」——不是圖沒優化，
#   是快取被關掉了。正式上線的靜態空間有正常快取，本來就沒這個問題。
import http.server, os, sys

RES_EXT = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg',
           '.m4a', '.mp3', '.ogg', '.wav', '.woff2', '.woff', '.json')

class DevCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split('?')[0].lower()
        if path.endswith(RES_EXT):
            self.send_header('Cache-Control', 'no-cache')   # 存起來，每次革驗證（304）
        else:
            self.send_header('Cache-Control', 'no-store')   # 程式檔永遠抓新的
        super().end_headers()

# port 來源優先序：命令列引數 > PORT 環境變數 > 8123。
# 中間那段是給 .claude/launch.json 的 autoPort 用的——由 harness 指派 port，
# 才不會像先前那樣每個 session 在 launch.json 裡多加一個連號的固定 port，
# 最後撞在一起（8128 被另一個 session 佔住）。
port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 8123)
http.server.ThreadingHTTPServer(('', port), DevCacheHandler).serve_forever()

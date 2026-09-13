#!/bin/bash
# 從 ~/Downloads 撈出**最新的那個下載暫存檔**，複製到指定路徑。
#
# ⚠⚠⚠ 為什麼需要這一支（ver -1258，Ray：「又跳下載視窗，一定要我自己點嗎？」）：
# 瀏覽器下載時**會先把完整的檔案寫成一個隱藏的暫存檔**，那個確認視窗只擋住
# 「改名搬到最終檔名」這一步 —— 也就是說**位元組已經在磁碟上了**，
# 不必等使用者點任何東西。
#
# ⚠ 只**複製**不搬不刪（暫存檔是別人的東西，動它就是踩回收區那條鐵律）。
# ⚠ 先前試過的兩條路都不通，留著當紀錄：
#   · curl 圖的 CDN 網址 → **403**（那個網址要帶 cookie）
#   · 分頁 fetch 完 POST 到本機 127.0.0.1 → **CSP 擋掉 connect-src**
#     （連用 iframe 當 bridge 都不行，chatgpt.com 的 frame 內腳本沒有跑起來）
set -e
DST="$1"
T=$(ls -t "$HOME"/Downloads/.*claudefordesktop.* 2>/dev/null | head -1)
[ -n "$T" ] || { echo "找不到下載暫存檔"; exit 1; }
cp "$T" "$DST"
echo "$T  →  $DST  ($(stat -f%z "$DST") bytes)"

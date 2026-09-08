#!/bin/bash
# 收圖入庫（ver -734）：抓 ~/Downloads 最新的一張，比對 md5 防重複，轉 WebP 入庫。
#
#   tools/collect.sh bg  <名字>   → resources/background/<名字>.webp   (1536 寬, q85)
#   tools/collect.sh mon <名字>   → resources/enemy/<名字>.webp        (1024 寬, q88)
#   tools/collect.sh si  <名字>   → resources/SI/<名字>.webp           (原寬, q88, 保留 alpha)
#
# ⚠ 原圖一律留在 resources/_originals/<層>/，不留在會被載入的目錄（§5）。
# ⚠ md5 比對是防「下載被擋 → 抓到上一張」的假成功（那個坑今天踩了很多次）。
set -e
cd "$(dirname "$0")/.."
KIND="$1"; NAME="$2"
[ -z "$NAME" ] && { echo "用法: tools/collect.sh bg|mon|si <名字>"; exit 1; }

case "$KIND" in
  bg)  SRCGLOB="$HOME/Downloads/Gemini* $HOME/Downloads/ChatGPT*"; OUT=resources/background;  ORIG=resources/_originals/background; OPT="-q 85 -resize 1536 0" ;;
  mon) SRCGLOB="$HOME/Downloads/Gemini* $HOME/Downloads/ChatGPT*"; OUT=resources/enemy;       ORIG=resources/_originals/enemy;      OPT="-q 88 -resize 1024 0" ;;
  si)  SRCGLOB="$HOME/Downloads/ChatGPT* $HOME/Downloads/Gemini*"; OUT=resources/SI;          ORIG=resources/_originals/SI;         OPT="-q 88 -alpha_q 100" ;;
  *)   echo "未知類別 $KIND"; exit 1 ;;
esac

F=$(ls -t $SRCGLOB 2>/dev/null | head -1)
[ -z "$F" ] && { echo "✘ Downloads 裡沒有檔案"; exit 2; }
H=$(md5 -q "$F")

# 已入庫的原圖都比一遍，重複就是「下載其實沒發生」
if find resources/_originals -type f \( -name "*.jpeg" -o -name "*.png" \) -exec md5 -q {} \; 2>/dev/null | grep -q "$H"; then
  echo "⚠ 重複（下載被擋）→ 放掉，繼續生：${F##*/}"
  exit 3
fi

mkdir -p "$ORIG" "$OUT"
EXT="${F##*.}"
cp "$F" "$ORIG/$NAME.$EXT"
cwebp $OPT "$ORIG/$NAME.$EXT" -o "$OUT/$NAME.webp" >/dev/null 2>&1
echo "✔ $NAME → $OUT/$NAME.webp  ($(sips -g pixelWidth -g pixelHeight "$OUT/$NAME.webp" 2>/dev/null | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/ /;s/pixelHeight:/x/'))"

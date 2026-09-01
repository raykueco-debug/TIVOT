#!/bin/sh
# tools/recycle.sh — 專案的回收區（本專案唯一的「刪除」出口，鐵律 8）
#
#   任何時候要把檔案刪掉、或用同名檔覆蓋掉，一律先呼叫這一支。
#   它只做「搬進 _recycle/」，永遠不會真的刪東西。
#
# 用法：
#   tools/recycle.sh <檔案或資料夾>...            回收
#   tools/recycle.sh -m "為什麼" <檔案>...        回收並記下理由
#   tools/recycle.sh --list                       印出回收紀錄
#   tools/recycle.sh --restore <_recycle 裡的路徑> 放回原位
#
# 規約：
#   · 保留原本的相對路徑（_recycle/resources/CI/x.png），才知道它本來住哪
#   · 同名再回收一次不覆蓋，加時間戳（x.png.20260901-1432）
#   · 每一筆寫進 _recycle/RECYCLE_LOG.tsv：時間 / 原路徑 / 回收路徑 / 理由

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BIN="$ROOT/_recycle"
LOG="$BIN/RECYCLE_LOG.tsv"
STAMP=$(date +%Y%m%d-%H%M%S)
REASON=""

mkdir -p "$BIN"
[ -f "$LOG" ] || printf 'when\tfrom\tto\treason\n' > "$LOG"

case "$1" in
  --list)
    column -t -s "$(printf '\t')" "$LOG" 2>/dev/null || cat "$LOG"
    exit 0 ;;
  --restore)
    [ -n "$2" ] || { echo "用法：tools/recycle.sh --restore <_recycle 裡的路徑>" >&2; exit 1; }
    SRC=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
    REL=${SRC#"$BIN"/}
    [ "$REL" != "$SRC" ] || { echo "不在回收區裡：$2" >&2; exit 1; }
    DST="$ROOT/$REL"
    if [ -e "$DST" ]; then "$0" -m "restore 前先讓位" "$DST"; fi
    mkdir -p "$(dirname "$DST")"
    mv "$SRC" "$DST"
    printf '%s\t%s\t%s\t%s\n' "$STAMP" "${SRC#"$ROOT"/}" "${DST#"$ROOT"/}" "restore" >> "$LOG"
    echo "已放回：$REL"
    exit 0 ;;
  -m)
    REASON=$2; shift 2 ;;
esac

[ $# -gt 0 ] || { echo "用法：tools/recycle.sh [-m 理由] <檔案或資料夾>..." >&2; exit 1; }

for P in "$@"; do
  [ -e "$P" ] || { echo "找不到（略過）：$P" >&2; continue; }
  ABS=$(cd "$(dirname "$P")" && pwd)/$(basename "$P")
  REL=${ABS#"$ROOT"/}
  [ "$REL" != "$ABS" ] || REL=$(basename "$ABS")   # 專案外的東西只留檔名
  DST="$BIN/$REL"
  [ ! -e "$DST" ] || DST="$DST.$STAMP"
  mkdir -p "$(dirname "$DST")"
  mv "$ABS" "$DST"
  printf '%s\t%s\t%s\t%s\n' "$STAMP" "$REL" "${DST#"$ROOT"/}" "$REASON" >> "$LOG"
  echo "已回收：$REL  →  ${DST#"$ROOT"/}"
done

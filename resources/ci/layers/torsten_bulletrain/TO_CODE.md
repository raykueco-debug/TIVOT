# 給程式 session：Bullet Rain 待接（動畫 session 2026-10-09 交件）

> 程式 session 當時不在線，訊息送不出去，寫在這裡。接完請刪這份或在交接裡註記。

1. **檔案：`resources/ci/video/cutin_dual_torsten_v5.mp4`**（⭐ 接這支；v4 眼睛修好，v5 再把火星改成前後景金色線狀、往右上飄、走小 S 會散掉）
   - ⚠ **24fps**（不是 16），23 格＝0.96 秒；480×720、H.264 High yuv420p crf22 faststart、無音軌，約 165 KB。
   - 請把 `cutinAnim.cutin_dual_torsten` 改指 **v5**；`cutinDur.cutin_dual_torsten` 照片長（0.96 秒；要撤出時還在播就留 1000）。
   - v1～v4 留著不覆蓋，回收等 Ray。
   - 內容：起手「弓身低頭」（A2）；Ray 用 animechk 停格功能剪（重拍同一格停 2 格）；全程呼吸＋前後景火星；
     v3 再把第 10～22 格糊掉的紫色虹膜換成原圖清楚的眼睛（`tools/anim/fix_eye_patch.py`）。
   - 之後 CI 交件改 **24fps** 為主（Ray 定的 a 案）。
2. **Ray 的程式需求（原話）**：「br 滑出時到尾要有一點拉回煞車感」
   - 動畫 session 的理解：Bullet Rain 這張 CI **撤出（滑出）**時，結尾不要等速滑到底，要有一點「過頭再拉回」的煞車／回彈感（ease-out-back 類，例如 `cubic-bezier(0.34,1.4,0.64,1)`，或最後幾 % 先超出一點再回來）。
   - 細節請直接跟 Ray 對，這裡只是轉述。

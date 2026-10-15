# 給程式 session：米夏「NI 發動」CI 動畫（動畫 session 2026-10-16 交件）

> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

## ⭐ 現行：v2（2026-10-16，Ray：「ci_misha_ni_burst77_cut 改交這個」）
- ⭐ **`resources/ci/video/ci_misha_ni_v2.mp4`**：**720×1080、16fps、65 格＝4.06 秒**、約 3.19 MB、無音軌。
  Ray 剪的 `out/export/ci_misha_ni_burst77_cut`（原片 65 格的第 0～64 格全留，全 ×1）。
- 內容：原圖 `ci_misha_ni.webp` 的米夏低角度持劍站定，金色氣浪由下往上衝，頭上法環轉動，
  白髮、披風、外套下擺被氣浪掀起，左手金光晶簇聚亮後爆開。
- 第一格≒原圖（差 6.8，從原圖生成，可從靜態圖無縫切入）；**沒鎖結尾 ⇒ 最後一格≠原圖**（差 56），
  播完停在最後一格，不可循環。
- 靜態圖的鍵是 `config.js` 的 `ci_misha_ni`（ver -1964）。要不要接成 `cutinAnim` 由程式決定；
  ⚠ 片長 4.06 秒，若 CI 長度（`cutinDur`）比片長短，會在撤下時截掉（照其他 CI 的慣例設定即可）。

## ~~v1~~（同日稍早，`ci_misha_ni_burst7_cut`）
- `ci_misha_ni_v1.mp4` **已被 v2 取代，不要接**；回收等 Ray。

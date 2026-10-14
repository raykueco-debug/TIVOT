# 給程式 session：托爾斯坦「處決」CI 動畫（動畫 session 2026-10-14 交件）

> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

## ⭐ 現行：v2（2026-10-14）
- ⭐ **`resources/ci/video/ci_torsten_execute_v2.mp4`**：**720×960、16fps、39 格＝2.44 秒**、約 1.07 MB、無音軌。
  Ray 剪的 `out/export/ci_torsten_execute_gun_short11_cut`（原片 65 格的第 0～64 格挑 39 格，全 ×1）。
- 內容：新底圖（Ray SD 修的短夾克＋長褲、低角度，GPT 修背景、換成迦尼米德大槍）—— 托爾斯坦持槍朝下站定，頭髮與衣擺順風飄，前景彈殼落下，背景與前景煙霧飄過。
- ⚠⚠ **底圖換了**：第一格≒ **`resources/ci/layers/torsten_execute/exec_gun_gpt.png`**（差 3.2），**≠ 現在的靜態圖 `resources/ci/ci_torsten_execute.png`**（差 15.0，舊槍、舊構圖）。
  靜態佔位要換成 `exec_gun_gpt.png`（或用影片第一格），不然從靜態圖切進影片會跳一下。
- **沒鎖結尾 ⇒ 最後一格≠原圖**（差 40），播完停在最後一格，不可循環。
- 靜態圖目前在兩個地方用：`config.js` 的 `cutin_exc_torsten`（CI）與 `script/town.js` 的劇情 cg —— 換不換、換哪一處由程式決定。


- ~~`resources/ci/video/ci_torsten_execute_v1.mp4`~~ **已被 v2 取代，不要接；回收等 Ray**（舊版：長大衣、舊槍）。
- （舊版說明）`ci_torsten_execute_v1.mp4`：**720×960、16fps、39 格＝2.44 秒**、約 0.97 MB、無音軌。
  Ray 剪的 `out/export/ci_torsten_execute_smoke7_cut`（原片 65 格的第 0～64 格挑 39 格，全 ×1）。
- 內容：原圖 `ci_torsten_execute.png` 的托爾斯坦（短夾克）背影站定，整片戰場硝煙翻湧、往同一方向吹，頭髮與衣擺順風飄，前景彈殼落下、餘燼飄散。
- 第一格≒原圖（從原圖生成）；**沒鎖結尾 ⇒ 最後一格≠原圖**，播完停在最後一格。
- 靜態圖目前在兩個地方用：`config.js` 的 `cutin_exc_torsten`（CI）與 `script/town.js` 的劇情 cg。
  要不要兩處都換成影片由程式決定；CI 那條可以照其他 `ci_*.mp4` 的接法。

> ✅ **已接**（程式 ver -2187）：`config.tuning.cutinAnim` 登記 v2、`cutinDur` 補片長、靜態佔位換成 v2 首格 webp、`partnerCiKeys` 預熱（本篇每場都暖）。

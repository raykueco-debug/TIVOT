# 給程式 session：托爾斯坦 MB（Max Burst）CI 動畫（動畫 session 2026-10-14 交件）

> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

- ⭐ **接 `resources/ci/video/ci_torsten_mb_v2.mp4`**：**720×992、16fps、28 格＝1.75 秒**、約 0.97 MB、無音軌。
  Ray 剪的 `out/export/ci_torsten_mb_slowaba7s_cut`（慢動作 A→B→A 原片 81 格挑 28 格：0~7 連續、之後 13,21,27,34…78 抽格，全 ×1）。
- 內容：近景，托爾斯坦舉 Ganymede（**單管**）朝 viewer 開一槍 —— 槍口火光、拋殼、爆風吹起頭髮後落回、槍口冒煙；背景是煙霧戰場（不透明）。
- ✅ **第一格＝開槍前的 A**（`_anim` 用圖 `resources/ci/layers/torsten_mb/mb_A7_single.png`）、**最後一格≒A**，可循環。
  ⚠ 原圖 `ci_torsten_mb.webp` 是「開火瞬間」，不是影片首格；CI 若先顯示靜態圖，請用影片第一格。
- `_v1.mp4`（雙管、頭髮不動）已被 v2 取代，不要接；回收等 Ray。
- 靜態圖目前在 `config.js` 的 CI 鍵（`ci_torsten_mb.webp`）；接法照其他 `ci_*.mp4`。

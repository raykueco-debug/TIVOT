# 給程式 session：托爾斯坦「處決」CI 動畫（動畫 session 2026-10-14 交件）

> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

- ⭐ **`resources/ci/video/ci_torsten_execute_v1.mp4`**：**720×960、16fps、39 格＝2.44 秒**、約 1.9 MB、無音軌。
  Ray 剪的 `out/export/ci_torsten_execute_smoke7_cut`（原片 65 格的第 0～64 格挑 39 格，全 ×1）。
- 內容：原圖 `ci_torsten_execute.png` 的托爾斯坦（短夾克）背影站定，整片戰場硝煙翻湧、往同一方向吹，頭髮與衣擺順風飄，前景彈殼落下、餘燼飄散。
- 第一格≒原圖（從原圖生成）；**沒鎖結尾 ⇒ 最後一格≠原圖**，播完停在最後一格。
- 靜態圖目前在兩個地方用：`config.js` 的 `cutin_exc_torsten`（CI）與 `script/town.js` 的劇情 cg。
  要不要兩處都換成影片由程式決定；CI 那條可以照其他 `ci_*.mp4` 的接法。

# 給程式 session：尼莫 Bullet Rain CI v1 待接（動畫 session 2026-10-16 交件）

> 動畫 session 不碰程式（憲法鐵律 11），要接的寫在這裡。接完請在交接裡註記。

1. **檔案：`resources/ci/video/cutin_dual_nemo_v1.mp4`**
   - **24fps**、24 格 ＝ **1.000 秒**；704×1056、H.264 High yuv420p、黑底、無音軌，約 0.54 MB。
   - 片長＝CI 長（1000 ms）。
2. **演出：CI 從畫面下方滑入**（Ray 指定：「他的 br 是從下方滑入」）。
   - 片子本身不帶位移（位移交給引擎，避免片內露黑邊）。滑入的時長與曲線請照既有 CI 進場的那一套調，Ray 看過再定。
3. **觸發點**：尼莫的 Bullet Rain —— 現行敵人卡 `nemo`（`script/enemies.js`）在玩家戰敗時播 `vo_nemo_bulletrain`（2.34 秒）。CI 要不要與這句語音同時起播、還是另有觸發點，**Ray 還沒定**，接之前先問他。
4. 內容：VACE 關鍵格 0＝A（貓背低頭、雙槍下垂，人物下移一個頭）、32＝B（`resources/si/nemo_si_dual.webp`）；33 格 16fps、704×1056、seed 7、提示詞只用正向關鍵字。Ray 在 animechk 剪成 `out/export/nemo_AB_hd_s7_cut`（原片 6,10~32 全 ×1）。
   - A 圖：`nemo_br_A_alpha.png`（GPT 透明背景）／`nemo_br_A_green.png`（實際餵 Wan 的綠底版，已下移 340px）。

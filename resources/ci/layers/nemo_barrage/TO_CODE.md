# 給程式 session：尼莫「彈幕支援」CI v1 待接（動畫 session 2026-11-04 交件）

> 動畫 session 不碰程式（憲法鐵律 11），要接的寫在這裡。接完請在交接裡註記。

## v2（11-04）：加黑色半透明遮罩背景 —— 取代 v1
- ⭐ **檔案：`resources/ci/video/ci_nemo_barrage_v2.webm`**：960×640、**16fps、56 格＝3.500 秒**、VP9 帶 alpha（`alpha_mode=1`）、無音軌，1.40 MB（1,472,397 bytes）。
- 內容與 v1 **完全相同**（同一份 Ray 剪的 `out/export/ci_nemo_barrage_fl87s_swing_loop_cut`），只是原本透明的地方改成**黑色、不透明度 60%**（alpha 153）：人物與槍照舊不透明，底下的戰鬥畫面被壓暗透出來。
  合成後的影格：`out/export/ci_nemo_barrage_fl87s_swing_loop_cut_dim60`。
- 🎯 **觸發點（Ray 定案 11-04）：尼莫「與主角共鬥」的主動技。**
- 濃淡 Ray 還沒看過實機；要調就只改那一個 60%，重轉一支 v3。
- iOS 那一條照下面 v1 第 1 點（VP9 alpha 在 iOS Safari 播不了），仍待 Ray 決定。

## v1（11-04）—— ⚠ 已被 v2 取代，不要接；回收等 Ray

1. ⭐ **檔案：`resources/ci/video/ci_nemo_barrage_v1.webm`**
   - **960×640（橫式 3:2）**、**16fps、56 格＝3.500 秒**、**VP9 帶 alpha**（`yuva420p`，`alpha_mode=1`）、無音軌，1.61 MB（1,683,771 bytes）。
   - ⚠⚠ **這一支是 webm 不是 mp4**（Ray 指定，因為後段要透明）。現行 CI 影片都是 mp4 黑底，播放端要能吃 webm＋alpha。
   - ⚠⚠ **iOS Safari 不支援 VP9 alpha**（會播成不透明或播不出來）。鐵律 12 手機優先 —— iOS 上要不要另做一份（HEVC alpha 的 .mov／png 序列），**接之前先問 Ray**。
2. 內容（三段，前後接起來是一支）：
   - **第 0～10 格：轉景**。尼莫徒手握著 FL87s 提把與側握把的**全畫面特寫**（不透明、整個畫面被槍蓋滿），猛力往上甩、槍身掠過鏡頭成動態模糊 —— 用來**全畫面覆蓋轉景**。
   - **接著：CI 本體**（尼莫持 FL87s 蹲馬步，alpha）＝ Ray 先前剪的 `ci_nemo_barrage_fl87s_alpha_cut`。
   - **最後：飄髮飄衣**（姿勢不動、頭髮與外套下襬在風裡翻，alpha，Ray 剪成 ×2 慢放）。
3. 來源：Ray 在 animechk 剪的 `out/export/ci_nemo_barrage_fl87s_swing_loop_cut`
   （原片 `out/ci/ci_nemo_barrage_fl87s_swing_loop` 77 格：0～8 甩槍、9～27 CI、28～76 飄髮循環；
   Ray 取 0～10 全 ×1，之後 12～69 隔格挑 35 格，其中 10 格 ×2）。
   - 甩槍：GPT 兩張關鍵格（`tivot_wan/in_nemo/grip_cover_v1.png` → `grip_blur_v1.png`），Wan A→B 17 格 seed 7。
   - 飄髮：Wan `--loop` 49 格，起點＝fl87s 原片第 104 格綠幕版，綠幕 key 轉 alpha（同 CI 原本那串）。
4. 首尾格：
   - ⚠ 第一格＝**全畫面不透明的握槍特寫**（≠任何既有靜態圖）—— 靜態佔位請用影片第一格。
   - ⚠ 最後一格＝飄髮段中途的一格，**不能循環**（與飄髮起點差 7.6）—— **播完停在最後一格**。
5. 觸發點：尼莫「與主角共鬥」的主動技（見 v2）。

## ⚠ 要程式決定／注意的（各支共通）
- 第 0～10 格是**不透明全畫面**，要蓋在戰鬥畫面最上層才有「轉景」效果；之後透明，底下的畫面會露出來。

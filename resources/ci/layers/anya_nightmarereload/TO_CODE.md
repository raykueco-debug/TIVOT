# 給程式 session：安雅夢魘再臨（夢中夢）待接（動畫 session 2026-10-10 交件）

> 程式 session 當時不在線，訊息送不出去，寫在這裡。接完請刪這份或在交接裡註記。

1. **檔案：`resources/ci/video/cutin_nireload_v4.mp4`**（⭐ 接這支）
   - **24fps**、48 格 ＝ **2.00 秒**；480×720、H.264 High yuv420p crf22 faststart、無音軌，約 1.16 MB。
   - 請把 `config.js` 的 `cutinAnim.cutin_nireload` 改指 **v4**，`cutinDur.cutin_nireload` 由 917 改成 **2000**（片長＝CI 長）。
   - v1～v3 留著不覆蓋，回收等 Ray。
2. 內容：Ray 指定把低於 2 秒的 CI 重跑成 5 秒原片再剪。
   - A＝`anya_nr_A_body.png`（GPT 重畫：縮成一團往左倒、雙臂抱肩、閉眼），B＝`anya_B_on_black.png`（正面驚嚇），Wan A→B 81 格 16fps（seed 7）。
   - Ray 在 animechk 剪成 `out/export/nr_A_body_5s_cut`（原片第 10～80 格、隔一抽一，24fps 輸出）。
   - ⚠ B 圖沒有紫焰，所以片尾紫焰會散掉；藍眼版 `anya_nr_Bblue.png` 不在這台，這支用的是原色眼。

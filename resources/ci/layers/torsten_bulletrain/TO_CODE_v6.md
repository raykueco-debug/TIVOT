# 給程式 session：Bullet Rain v6 待接（動畫 session 2026-10-11 交件）

> 程式 session 當時不在線，寫在這裡。接完請刪這份或在交接裡註記。（v5 那份是 `TO_CODE.md`，同一個鍵、這份取代它）

1. **檔案：`resources/ci/video/cutin_dual_torsten_v6.mp4`**（⭐ 接這支）
   - **24fps**、47 格 ＝ **1.959 秒**；480×720、H.264 High yuv420p、無音軌，約 0.38 MB。
   - 請把 `config.js` 的 `cutinAnim.cutin_dual_torsten` 改指 **v6**，`cutinDur.cutin_dual_torsten` 由 1000 改成 **1959**（片長＝CI 長）。
   - v1～v5 留著不覆蓋，回收等 Ray。
2. 內容：Ray 指定把低於 2 秒的 CI 重跑成 5 秒原片再剪。
   - VACE 關鍵格：0＝A2、30＝B3（甩槍模糊格）、34＝C_nc、80＝C_nc；81 格 16fps、seed 7。提示詞只用正向關鍵字（含 silent），不寫彈殼／槍火（寫了反而會冒彈殼）。
   - 第 34～80 格下半臉鎖成第 34 格（追蹤頭部位移後貼回，嘴與下巴不再亂動）。
   - Ray 在 animechk 剪成 `out/export/br5s_kw2_s7_jawlock_cut`；火星後製參數同 v5（`comp_fgbg_embers.py` 金色線狀、往右上、前後景）。

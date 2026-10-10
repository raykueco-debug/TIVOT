# 給程式 session：索拉娜前線補給 CI 待接（動畫 session 2026-10-10 交件）

> 程式 session 當時不在線，寫在這裡。接完請刪這份或在交接裡註記。

1. **檔案：`resources/ci/video/ci_sorana_supply_v2.mp4`**（⭐ 接這支）
   - **24fps**、46 格 ＝ **1.917 秒**；480×720、H.264 High yuv420p crf22 faststart、無音軌，約 0.9 MB。
   - 請把 `config.js` 的 `cutinAnim.ci_sorana_supply` 改指 **v2**，`cutinDur.ci_sorana_supply` 由 1500 改成 **1917**（片長＝CI 長）。
   - v1 留著不覆蓋，回收等 Ray。
2. 內容：Ray 指定把低於 2 秒的 CI 重跑成 5 秒原片再剪。
   - A＝`sorana_A_turn6.png`（Ray 親修：回頭蓄力、兩個雙排彈匣、丁字褲、腿套空），B＝`sorana_B.png`。
   - Wan A→B 81 格 16fps、seed 7、LoRA `bounce_test` High/Low 0.5，提示詞只用正向關鍵字（戰鬥、躍出、轉身微笑、把兩個彈匣往後給 viewer、飄動、安靜的微笑）。
   - Ray 在 animechk 剪成 `out/export/sorana_A_turn6_L4_btest05_claudecut_cut`；後製同 v1（`comp_black_embers.py` 放回原畫布、純黑底＋同向斜飛火星）。

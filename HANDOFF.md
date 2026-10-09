# HANDOFF — 截至 `ver 2026.09.22-2101`（10-09 晚，Windows 3060 程式 session 收工）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、回收舊交接**（`tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261009-214000`（git 歷史也有）。

## 現況
- 只有一個分支：`main`。這台是 **RTX 3060 12GB／16GB RAM**（使用者資料夾 `C:\Users\User`，舊機是 `C:\Users\Ray Ku`）。
- 測試伺服器：桌面 `.claude/launch.json` 的 **`tivot-claude`（8202）**；8200／8201 是 Ray 的。一進頁面先設 `tivot_admin_v1`＋`tivot_mute_v1`。
  Python 一律 `py -3.11 -X utf8`（openpyxl 已裝在 3.11）；跑會印符號的工具前 `PYTHONIOENCODING=utf-8`。
- ⚠⚠ **西文翻譯暫停**（Ray 10-09：「西文之後不用做，完成後再一次做」）—— 改中文時不要動 `i18n/*/es*`。
- ⚠⚠ 改視覺效果先做幾張給 Ray 看，看過才整批。刪／覆蓋／回收任何檔案前先問 Ray。
- 其他 session：**動畫**（`resources/_HANDOFF_ANIM.md`）、**美術**（`resources/_HANDOFF_ART_20260925.md`）。交件由程式接、commit。
  動畫交件說明另有 `resources/ci/layers/torsten_bulletrain/TO_CODE.md`（BR，已接到 v5；刪不刪等 Ray）。
- 不要 commit：`tools/anim/*` 未提交的修改（動畫的）、`resources/ci/layers/**` 的中間檔、`resources/si/eyefx/cecilie_si_fluster_te_mask.webp`（來源不明）。

## 本機 Wan 動畫環境（10-08 建好，全部 SHA256 對過官方）
- `ComfyUI-master\.venv`（py3.12、torch 2.11+cu128）；`C:\ffmpeg\bin\ffmpeg.exe`（7.1，有 libx264）。
- 模型：I2V A14B High/Low Q4_K_M（`models/unet`）、VACE-Fun A14B high/low Q4_K_M（`models/unet`）、
  lightx2v 4 步 LoRA：I2V v1 high/low＋T2V v1.1 high/low（`models/loras`）、`umt5_xxl_fp8_e4m3fn_scaled`、`wan_2.1_vae`。沒有 Bouncing/Motto LoRA。
- 工具在 `ComfyUI-master\tivot_wan\`（從 `tools/anim` 拷來，寫死的 `Ray Ku` 路徑只在拷貝裡改成 `User`）。idle 測試一支約 226 秒。

## 本輪做的（-2082～-2101）—— 都推上了
- **首頁 BGM**：iOS `audioSession='playback'`（靜音鍵不再消掉 BGM；舊 iOS 不接 Web Audio）、曲子在路上引擎不休眠、BGM 下載 8 秒逾時退串流（-2085）；
  **解鎖改成每一下手勢都叫、加聽 touchend/click/pointerup**（iOS 的 touchstart 不算使用者啟用，舊寫法第一下就拆監聽 ⇒ 要按鈕出 SE 才有音樂，-2089）。HUD 多 `ctx/ses/bless/idle`。
- **CI 進場**：滑入段獨立計時 `--ci-in`（短 CI 也 0.27 秒，-2090）；BR 專屬：發動瞬間淡入 70% 黑遮罩（`tuning.brDim`）→ 從左下滑入、衝過頭拉回煞車（`.br`，-2091／-2093）。
  `playCutin` 新增 `opts.dim`／`opts.cls`。破防 CI 分流抽成 `config.dualCiKey`，並排進預熱。
- **CI 現行影片**：BR＝`cutin_dual_torsten_v5`（24fps 0.96 秒，cutinDur 1000）；安雅清醒夢（主動一般版）＝`ci_anya_luciddream_v3`（Ray 剪，1.375 秒）；
  夢中夢（被動）＝`cutin_nireload_v3`（Ray 剪 ni_reload_auto24_cut，0.917 秒）；夢魘裝填（reload）**不放 CI**（`reloadCutin:''`）；夢境粉碎＝`ci_anya_dreambreaker`。
  之後 CI 交件以 **24fps** 為主（Ray 定）。
- **安雅改名**：被動 夢中夢／Dream Within、主動一般版與增益狀態 清醒夢／Lucid Dream、夢魘化版 夢境粉碎。語音兩邊**暫時共用** `vo_anya_lucid`（Ray）。
- **新差分接線**（-2099）：安雅 `sad`／`shakehead`、諾薇兒 `runcry`、賽西莉 `teary`；新 speaker `MAGE`（謎之術師：front／barrier／hurt）、`COMMANDER`（指揮官）。
  術師 `cast` 不是全身圖，沒接。差分總表重出（`si_xlsx.py` 已排除 blink/eyefx/sway，516 個差分）。
- **聖索菲亞旅店收尾**照 Ray 修稿（蘿法道謝 → 蕾娜託她發報，一道保險）。

## 未完成
**等另一台電腦 git 進來（Ray 的檔）**
1. `resources/audio/se/se_paperfold.m4a`（摺信聲，鍵已接在 `story.js` 的 `SE_FILES`；進庫前 lint 報 2 個錯是預期的；到件要量 `fileGain`）。
2. 缺圖 4 張：`si/npc/npc_ss_lofa_shy／ask／lookdown.webp`、`si/renna_si_letter.webp` —— 進庫後在 `speakers.js` 登記並 `measure_si` 量。
   ⚠ **不要先預留路徑**：立繪沒有 onerror 退路，指到不存在的檔＝人從畫面消失；沒登記的差分才會回退基本立繪。

**等 Ray**
3. 謎之術師數值卡（建卡＋碼頭 Boss）；術師名字定稿。
4. 其他人類敵人要不要比照米夏補呼吸待機。
5. 帝都衛士戰四件假設：前三場受擊特效、storyBattle 輸了回檔、守衛名稱、舊街區後城鎮戰結束。
6. 被刪的 33 張圖要不要還原；廢城 `hallcourt` 碎石重出；插圖 `023`／`024` 沒腳本引用、`032_rennablush` 未交。
7. 舊影片回收：BR v1～v4、清醒夢 v1／v2、夢中夢 v1／v2（`cutin_nireload_v2` 是動畫的候選，已沒在用）。

**要手機實測**
8. 首頁 BGM（-2089：冷／熱啟動各點一次 COMPLETE、不按按鈕）、BR 進場（黑遮罩＋左下滑入煞車）、群戰倒地與閉棺、米夏 NI 取景、主祭壇最後自動出航（Stage 16 可直接跳）。

**程式端可做**
9. `misha_si_ni` 眼效是舊圖座標，要用時重產（`tools/eye_fx.py`）。
10. `se_march` 不存在，主祭壇那一拍用 `se_troops` 頂著。
11. 茉莉／羅伯特／亞隆的立繪已在 `si/npc/`，還沒接進 `speakers.js`（差分總表「未接線」那一頁）。
12. 美術 10-09 新交卡耶爾山谷怪物 16 隻（`resources/enemy/mon_canyon_*`，見 `_canyon_horror_spec.md`）—— 敵卡／待機都還沒接。

**眨眼／眼睛（舊單）**
13. GPT 半閉欠 10 張（`tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`）；瞳顫框偏大（索拉娜 surprise／furious／readshock、柯文 shock）；
    `sorana_si_carrynouvelleshock` 欠眨眼；淚光 6 張待修（`tools/tear_reject.txt`）。

## 已結案（不要再列）
（-2081 以前的見上一份。）本輪：首頁 BGM 靜音鍵／休眠／逾時／手勢監聽、CI 滑入計時、BR 黑遮罩與左下煞車、BR v1→v5、安雅三支 CI 定案、安雅技能改名、
Wan 環境（含 VACE、T2V LoRA）、怪物待機（87 隻已交，非 94 隻待交）、返回帝都 6 張差分接線、聖索菲亞旅店修稿、摺信聲接鍵。

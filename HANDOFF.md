# HANDOFF — 截至 `ver 2026.09.22-2000`（10-04 深夜，Windows 3070 程式 session）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261004-233258`（git 歷史也有）。

## 現況
- 分支 `claude/standing-art-blink-animation-ub7vw7` ＝ origin ＝ ver -2000（本機的 `main` 比較舊，不要從它開工）。
- 本機 server：`py -X utf8 tools/devserver.py`（不加 `-X utf8` 中文主控台會直接退出）。
  3070 的三台（桌面 `C:\Users\User\Desktop\.claude\launch.json`）：**8200、8201 是 Ray 在用的，不要動**；8202 是程式 session 自己測試用。
  ⚠ 拉了遠端、而且 `tools/devserver.py` 有變，就重開自己那台 server（server 開機時載入規則）。
- Python 工具一律 `py -3.11 -X utf8`；批次叫子程序時加 `PYTHONIOENCODING=utf-8`。
  ⚠⚠ **Windows 上用 Python 產清單再餵給 bash 的 `while read`，先 `tr -d '\r'`**（每行尾巴的 `\r` 讓整批「找不到立繪」）。
- ⚠⚠ **改視覺效果先做幾張給 Ray 看，看過才整批**（10-04 整批重跑兩次都白跑：我自己的「0 出框」指標跟 Ray 說的「眼框」不是同一件事）。
- **眼睛特效標在「那一拍」**：腳本寫 `eyes:'half'|'tremble'|'trembleslow'|'tear'`，可疊 `['half','tear']`；解讀只有 `modules/eyefx.js` 的 `eyesOf`。
- 不要 commit：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`（gitignore）；
  `resources/si/eyefx/cecilie_si_fluster_te_mask.webp`（排除清單上的，表上沒有、遊戲不讀）。
- 另一個 session「美術背景重繪替換」會用跨 session 訊息交件；**Ray 本人點頭才接、才 commit**，而且只挑它的檔單獨 commit。

## 未完成

**淚光（ver -1999 上線，Ray：「先用這版，不盡完美但至少能用了」）**
- 規則的唯一真相在 `tools/eye_fx.py` 的 `fit_lights`（常數 `TL_*`）＋ `style.css` 的 `efWob`（只做水平）；引擎照表上的 `tl` 擺。
  現行：眼頭眼尾線、大光（2:1 橢圓）中心在線上／小光（圓點）頂端貼線、ta≥0「._」ta<0「_.」、
  大光寬 0.35 虹膜寬、黃框退 20%、離眼底半個閃光高、含形變外框整顆塞得進才放。
1. 「不盡完美」—— Ray 之後可能再調。已知可以調的旋鈕：`TL_BIG_IW`（大小）、`TL_ALONG`（沿線離多遠）、`TL_EDGE`／`TL_BOT`（離框多遠）、左右順序（現在看 ta 的正負）。
   ⚠ 試過不行的：偵測最暗那一塊當瞳孔（會抓到睫毛線、眼角線）；排除「碰到眼框的暗塊」（瞳孔本來就貼上眼瞼，全部被排除）；
     虹膜中心當瞳孔中心（一半偏掉）。眼頭眼尾線是目前最穩的基準。
2. 30 隻眼只放得下一顆（眼睛太細）；`tools/tear_reject.txt` 6 張待修（現在沒有淚光）。
3. 驗收工具在 scratchpad（不入版控）：離線合成、最壞形變外框 vs 黃框；要再做可照 `fit_lights` 的幾何重寫一支。

**米夏／羅賽爾廢城主祭壇**
- ❓ 稿上的 `se_march` 專案裡沒有這支，用 `se_troops`（行軍聲）頂著；Ray 若有專用檔，換 `town.js` 那一拍的 `amb` 就好。
- 主祭壇那一段**最後「自動出航、從廢城起飛」還沒親眼確認**。

**眨眼／眼睛**
1. ⚠⚠ **GPT 半閉還欠 10 張**（拼格 `tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`；`blink_gpt.py prompt half` ＋「半閉不是閉眼」「只動眼睛」，
   **開新對話送**；合併 `blink_gpt.py merge …` → `blink_build.py` → `bust --bump` → lint）。
2. 瞳顫框偏大／只框一隻、要進遊戲看：索拉娜 surprise／furious／readshock、柯文 shock。
3. 「這一拍眼睛」還沒在遊戲裡實演過的：瞳顫快／慢、戰鬥對白那條路。
4. `sorana_si_carrynouvelleshock` 欠眨眼（雙人圖，要在 `tools/blink_eyes.txt` 手給眼框）。
5. 之後：飛行頁 canvas 眨眼、手機實機量發熱（鐵律 12）、路線 B 髮梢擺動。
6. ⏸ 呼吸與微晃（路線 A，-1934）：commit 在 3060 本機、沒推上來，等 Ray 看效果。

**北泊公會櫃台**
7. ⚠ `npc_guildcounter_si_northport.webp` 美術重新去背 → **眨眼補丁要重跑**：`py -3.11 tools/blink_build.py npc_guildcounter_si_northport`
   （lint 現在唯一的 ❌ 就是它）。人物位置沒變，取景值不必改。

**程式端要接的**
8. 峽谷 `canyon` 的小地圖 `map:{img,spots}`（整段可抄：`resources/map/_minimap_worklist.md` 末段）。

**等 Ray**
- 被刪的 33 張圖：已從 git 取回放進 `_recycle/` 留底，沒有還原進遊戲；要不要還原哪幾張。
- 廢城 `hallcourt`：正門應該堵死但圖裡碎石只擋一半 —— 要不要重出（美術的活）。
- `resources/illustration/023_anyacottoncandy`／`024_nouvellesmile` 沒有腳本引用；`032_rennablush` 插圖還沒交。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫、賽西莉 fluster、按鈕避開動態島、聖徒系列敵卡、米夏隨從、`_TO_CODE_20260922.md`、
雪都教堂大小寫、阿瑞尼斯台詞差分、廢城祭壇 `_lit`、眨眼修正（賽西莉／露娜眼罩／柯文與 decode／族長／米夏 11 張半閉／closeopen 與 nemo bye）、
索拉娜 battlecry 兩鍵對調、背景雷同修正 9 組、米夏敵卡（劈落／NI／語音 20 支／BR 首末發／Havoc BGM）、空中戰預設 EpicBattle、
主祭壇劇本與兩場戰鬥、主角空白框可寫、淚眼 v2 整批重算（分割 3070 已齊）、
主祭壇點亮版 `dunmor_altar_lit`、親衛隊正式版 `man_misha_guards`（-1998）、主祭壇插圖 037_mishamarch／038_mishasting、
**淚光改版（-1999：眼頭眼尾線＋水平形變，356 張 0 失敗 0 出框）**。

# HANDOFF — 截至 `ver 2026.09.22-1985`（10-04 晚，Windows 3070 程式 session）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261004-220521`（git 歷史也有）。

## 現況
- 分支 `claude/standing-art-blink-animation-ub7vw7` ＝ origin ＝ ver -1985（本機的 `main` 比較舊，不要從它開工）。
- 本機 server：`py -X utf8 tools/devserver.py`（不加 `-X utf8` 中文主控台會直接退出）。
  3070 的三台（桌面 `C:\Users\User\Desktop\.claude\launch.json`）：**8200、8201 是 Ray 在用的，不要動**；8202 是程式 session 自己測試用。
  ⚠ 拉了遠端、而且 `tools/devserver.py` 有變，就重開自己那台 server（server 開機時載入規則）。
- Python 工具一律 `py -3.11 -X utf8`；批次叫子程序時加 `PYTHONIOENCODING=utf-8`。
  ⚠⚠ **Windows 上用 Python 產清單再餵給 bash 的 `while read`，先 `tr -d '\r'`**（ver -1985 踩過：每行尾巴的 `\r`
  讓 224 張全部「找不到立繪」，工具本身沒問題）。
- **眼睛特效標在「那一拍」**：腳本寫 `eyes:'half'|'tremble'|'trembleslow'|'tear'`，可疊 `['half','tear']`；解讀只有 `modules/eyefx.js` 的 `eyesOf`。
- 不要 commit：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`（gitignore）；
  `resources/si/eyefx/cecilie_si_fluster_te_mask.webp`（排除清單上的，表上沒有、遊戲不讀）。

## 未完成

**淚眼（v2 已全套上線，剩下的）**
1. ⚠ **等 Ray 進遊戲抽看**（離線合成驗收過，遊戲裡的呼吸對齊／輪播還沒人看）：建議 Luna（front／seat_hand／taunt）、
   `renna_si_lookaside`、`renna_si_stare`、`sorana_si_smile`、雙人圖 `sorana_si_carrynouvellescream`。
2. ⚠ `tools/tear_reject.txt` 的 6 張**待修**（現在沒有淚眼，那一拍寫 `tear` 不會出光）：
   - 擬合虹膜偏大、光比虹膜大一圈：`luna_si_seat_angry`／`luna_si_seat_n`／`npc_gunsmith_si_v2`／`corvin_si_think`
   - 瞳孔極小、找不到虹膜：`npc_guildhunter_si_shock`／`cecilie_si_fluster`
   修法未定（手給虹膜框？）。修好從清單拿掉、重跑 `py -3.11 tools/eye_fx.py <名> --tear-only`。
3. 只抓到一隻眼的 30 張：多半本來就只看得到一隻（Luna 眼罩、側臉、`sorana_si_salute` 眨眼），
   但 `nouvelle_si_lookdown`／`nouvelle_si_sleepy` 另一隻（半閉）沒抓到 —— 那隻眼沒光，安全的失敗模式，要不要補等 Ray。
- 規格的唯一真相在 `tools/eye_fx.py`（tg／ta／`TEAR_MAX_H`）與 `modules/eyefx.js`（`TL`），不在這裡重抄。
  扁眼規則（ver -1985，Ray 選 C）：大光高 ≤ 眼框半高 × 1.25，超過整顆等比縮、1:2 不變。

**米夏／羅賽爾廢城主祭壇（-1957～-1984）**
- ⚠ 欠 `resources/background/dunmor/dunmor_altar_lit.webp`（主祭壇點亮版；照四座小祭壇 `_lit` 的翡翠綠電路紋，GPT 從 `dunmor_altar` 衍生）。
  程式已接（白光那一拍 `bgBand`＋節點 `bgWhen need:'dm_altar_done'`），**交件就生效**；交件後拔掉那一拍的 `bgPending`。⛔ 不要用 Gemini。
- ⚠ 欠 `man_misha_guards` 正式版（現在是 Gemini 代圖，等 GPT 重畫；同名覆蓋要跑 `bust --bump`）。
- ⚠ 欠插圖「主角被刺穿」（那一拍現在只有斬殺音＋震動）。
- ❓ 米夏「這點成色還想成王……」那一拍表上寫 `mishaattack`，立繪庫沒有，暫用 `fight`。
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
主祭壇劇本與兩場戰鬥、主角空白框可寫、**淚眼 v2 整批重算（-1985：356 張上線、分割 3070 已齊）**。

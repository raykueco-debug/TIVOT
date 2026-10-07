# HANDOFF — 截至 `ver 2026.09.22-2012`（10-05 晚，Mac 程式 session 收工，換機器）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md`（git 歷史也有）。

## 現況
- ⚠⚠ **只有一個分支：`main`**（10-05，Ray 定案）。`claude/standing-art-blink-animation-ub7vw7` 已刪 ——
  兩個名字指同一份進度，漏推一邊就分岔（鐵律 7）。其他機器若還停在那個分支：`git checkout main && git pull`。
- Windows 3070：server `py -X utf8 tools/devserver.py`；8200、8201 是 Ray 在用的，不要動；8202 給程式 session 測。
  Python 工具一律 `py -3.11 -X utf8`；批次叫子程序加 `PYTHONIOENCODING=utf-8`；餵 bash `while read` 先 `tr -d '\r'`。
- **Mac**：`python3` 跑 lint／bust／bg_index 都行（jsc 內建）；**沒有 node**。
  ⚠ Mac 推 GitHub 用的是 fine-grained token（存在鑰匙圈，**2027-01-03 到期**，只授權 TIVOT、Contents 讀寫）。
  到期或換機器推不動（403／could not read Username）：重建一支，**Permissions 要按 Add permissions 加 Contents: Read and write**
  —— 新版頁面不會自動列出 Contents，不加就只有讀權限（10-05 踩過）。
  ⚠ Mac 這份工作區 10-05 之前缺了 565 支檔（`resources/SI`／`enemy`／`map`／`tools`）＋ 83 支只差換行碼 —— 已 stash 後 pull、stash 已丟，現在乾淨。
  ⚠ Mac 的 `.venv-face` 是空的、也沒有 `_ext/Anime-Face-Segmentation` ⇒ **眨眼／淚光的分割只能在 Windows 3070 跑**
  （-2005 已讓 `blink_build.py` 認得 Mac 的 venv 路徑，裝好就能用）。
- ⚠⚠ **改視覺效果先做幾張給 Ray 看，看過才整批**。
- **眼睛特效標在「那一拍」**：`eyes:'half'|'tremble'|'trembleslow'|'tear'`，可疊；解讀只有 `modules/eyefx.js` 的 `eyesOf`。
  ⚠ -2006 起 **tear 是狀態**：標了之後她被壓暗照留，到**她自己的下一拍**才重新決定（`story.js` 的 `heldTear`／`tutorial.js` 的 other._eyes）。半眨與瞳顫照舊只管那一拍。
- 不要 commit：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`；`resources/si/eyefx/cecilie_si_fluster_te_mask.webp`。
- ⚠ 工作區 `script/speakers.js` 有一筆**不是程式 session 改的**修改（10-05 發現，沒動、沒 commit）—— 是誰的、要不要收，問 Ray。
- 另一個 session「美術背景重繪替換」用跨 session 訊息交件；**Ray 點頭才接、才 commit**，只挑它的檔單獨 commit。

## 本輪做的（10-05，-2004～-2012）—— 都等 Ray 實測
| 版 | 內容 | 測什麼 |
|---|---|---|
| -2004 | 章節選擇加 **Stage 16**（廢城主祭壇；四座小祭壇全亮、`dm_altar_done` 不給） | 選了直接開演主祭壇 |
| -2005 | 米夏劈落語音 **每 7~9 次一句**（卡上 `parryVoiceEvery:[7,9]`，通用欄位） | 連擋的頻率 |
| -2006 | 淚眼不說話被壓暗**照留** | 換人講話時淚光還在 |
| -2007 | **赤爪星**：連續十次開火的反擊，**只有斷 combo 才歸零**；蓄滿而夢境破碎沒用過＝留著，用掉後下一次反擊就回填 | 要先點亮那顆星 |
| -2008 | 編輯器的立繪／差分選單改**字母順序**（插入拍的「說話者」沒排） | — |
| -2010 | 索菈娜亂入那一頁：**第一下「繼續」先叫她出來，第二下才走**（-2009 做反了、已撤） | C／D 評價連按兩下 |
| -2012 | **米夏：暴擊打穿劈落**（Ray：「米夏被爆擊的時候也可以打穿防禦」）—— 暴擊骰子改在 `tap` 開頭擲一次，槍火與傷害讀同一顆；點錯照舊劈落。8123 實測過 | 連打時偶爾冒暴擊字樣、真的扣血 |
| -2011 | 背景差分接線：平原古道五格改吃四時段；貝利薩爾枯井底／前廳原圖改名 `_day` 接上四時段 | 夜裡走一次 |

## 背景差分盤點（-2011，362 個來源逐格模擬候選鏈＋逐字比對磁碟）
- ⚠ **欠：0 格**（指「腳本要的時段檔都在」）。但古城有六張單張其實有室外天光 → 已開美術工單（見「未完成」）。
- ✔ 不欠（長得像缺）：北泊 13 格 `_bf`（戰損版單張）／木雅克神殿深層 14 格（無天光，spec 定單張）／
  卡耶爾山谷 5 格、夏爾森林 9 格（刻意三差分，沒有 dawn）／帝都槍店・公會・雜貨沒有 night（營業到 17）／
  夏爾工坊沒有 night（營業到 19，夜從 19 起）／聖索菲亞酒吧沒有 dawn（酒吧三差分）／深夜退夜晚（正常退路）。
- 沒有人用的整組：`ravn_*`（雪都改名 `varn_*` 前的舊檔）、`east_bistro`、`belisar_sunkencourt`、別座遺蹟的 `ruins_*`、`vela_bar`（掛點等 Ray）。
- 可選：神殿深層 14 格沒寫 `noTime:true`，每次進去白試幾個 404（手機多幾個請求，不影響畫面）。

## 未完成

**淚光（-1999 上線，「先用這版」）**
2. 可能再調：`tools/eye_fx.py` 的 `TL_BIG_IW`／`TL_ALONG`／`TL_EDGE`／`TL_BOT`、左右順序。
   試過不行：最暗塊當瞳孔、排除碰框暗塊、虹膜中心當瞳孔中心。
3. 30 隻眼只放得下一顆；`tools/tear_reject.txt` 6 張待修。

**米夏／羅賽爾廢城主祭壇**
4. ❓ 稿上 `se_march` 不存在，用 `se_troops` 頂著；有專用檔就換 `town.js` 那一拍的 `amb`。
5. 主祭壇最後「自動出航、從廢城起飛」還沒親眼確認（現在可用 Stage 16 直接跳去測）。

**眨眼／眼睛**
6. ⚠⚠ GPT 半閉還欠 10 張（`tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`；`blink_gpt.py prompt half`，開新對話送；merge → `blink_build.py` → `bust --bump` → lint）。
7. 瞳顫框偏大／只框一隻：索拉娜 surprise／furious／readshock、柯文 shock。
8. 還沒實演過：瞳顫快／慢、戰鬥對白那條路的眼睛。
9. `sorana_si_carrynouvelleshock` 欠眨眼（雙人圖，`tools/blink_eyes.txt` 手給眼框）。
10. 之後：飛行頁 canvas 眨眼、手機實機量發熱、路線 B 髮梢擺動。
11. ⏸ 呼吸與微晃（路線 A，-1934）：commit 在 3060 本機、沒推上來，等 Ray 看效果。

**茉莉 39／羅伯特 60／亞隆 36 全身立繪（10-05 開單，一張都還沒產）**
- 工單＋三則提示詞：`resources/si/_molly_robert_aaron_spec.md`；參考圖 `reference/Molly.png`／`Roberto.png`（已入版控）。
- 羅伯特＝武官出身、M 型禿；亞隆＝羅伯特之子、現任侍衛長。**先各出一張給 Ray 看**，不進遊戲。
- 10-05 Mac 卡在 Claude in Chrome 連不上（清單回空、重試五次）。⚠ 這是產圖的活（鐵律 11）—— 換機器後最好交美術 session 做。

**等 Ray**
- 被刪的 33 張圖：已放進 `_recycle/` 留底，要不要還原哪幾張。
- 廢城 `hallcourt` 正門碎石只擋一半 —— 要不要重出（美術）。
- `023_anyacottoncandy`／`024_nouvellesmile` 沒有腳本引用；`032_rennablush` 插圖還沒交。
- 插入拍的「說話者」要不要也字母排序。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫、賽西莉 fluster、按鈕避開動態島、聖徒系列敵卡、米夏隨從、`_TO_CODE_20260922.md`、
雪都教堂大小寫、阿瑞尼斯台詞差分、廢城祭壇 `_lit`、眨眼修正（賽西莉／露娜眼罩／柯文與 decode／族長／米夏 11 張半閉／closeopen 與 nemo bye）、
索拉娜 battlecry 兩鍵對調、背景雷同修正 9 組、米夏敵卡（劈落／NI／語音 20 支／BR 首末發／Havoc BGM）、空中戰預設 EpicBattle、
主祭壇劇本與兩場戰鬥、主角空白框可寫、淚眼 v2 整批重算、主祭壇點亮版、親衛隊正式版、主祭壇插圖 037／038、淚光改版（-1999）、
北泊公會櫃台眨眼重跑（-2013/-2014）、古城天光六格四時段（-2072，單張已回收、戰鬥卡改指 _night）、峽谷與鏡湖小地圖（-2073/-2074）。

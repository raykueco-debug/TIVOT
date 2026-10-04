# HANDOFF — 截至 `ver 2026.09.22-1961`（10-04 下午，Windows 3070，程式 session）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261004-151802`（git 歷史也有）。

## 現況
- 分支 `claude/standing-art-blink-animation-ub7vw7` ＝ origin/main ＝ ver -1961（本機的 `main` 分支比較舊，不要從它開工）。
- 本機 server：`py -X utf8 tools/devserver.py`（不加 `-X utf8` 中文主控台會直接退出）。
  10-04 開的三台（設定在桌面 `C:\Users\User\Desktop\.claude\launch.json`）：**8200、8201 是 Ray 在用的，不要動**；8202 是程式 session 自己測試用。
- Python 工具一律 `py -3.11 -X utf8`；批次叫子程序時加 `PYTHONIOENCODING=utf-8`（不加會 cp1252 編碼錯誤）。
- **眼睛特效標在「那一拍」**（ver -1959，Ray：「不是將該表情全域改成特效」）：腳本寫 `eyes:'half'|'tremble'|'trembleslow'|'tear'`，可疊 `['half','tear']`；
  套在那一拍的說話者，下一拍沒寫就回平常。解讀只有 `modules/eyefx.js` 的 `eyesOf`；立繪工具「這一拍眼睛」那排鈕直接寫進腳本；lint 會擋不認得的值。
  素材：眨眼 329 張（`script/blink.js`）、淚眼 362 張、瞳顫 40 張（Ray 選的，`script/eyefx.js` 的 `tr`）。
- 不要 commit：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`（gitignore，GPT 原圖與合成底稿，重建眨眼要用）。

## 未完成

**米夏／羅賽爾廢城主祭壇（-1957～-1972，Mac 程式 session）**
- ⚠ 欠 `resources/background/dunmor/dunmor_altar_lit.webp`（主祭壇點亮版；照四座小祭壇 `_lit` 的翡翠綠電路紋，GPT 從 `dunmor_altar` 衍生）。
  程式已接（白光那一拍 `bgBand`＋節點 `bgWhen need:'dm_altar_done'`），**交件就生效**；交件後拔掉那一拍的 `bgPending`。Ray：不要用 Gemini。
- ⚠ 欠 `man_misha_guards` 正式版（現在是 Gemini 代圖，等 GPT 重畫；同名覆蓋要跳 `?v=`）。
- ⚠ 欠插圖「主角被刺穿」（那一拍現在只有斬殺音＋震動）。
- ❓ 米夏「這點成色還想成王……」那一拍表上寫 `mishaattack`，立繪庫沒有，暫用 `fight`。
- ❓ 米夏戰的 BGM 沒指定（走預設戰鬥曲）。

**眨眼／眼睛**
1. ⚠⚠ **GPT 半閉還欠 10 張**（10-04 額度用完，22:52 重置）。拼格已做好：
   `tools/_blink_base/grid_fixh4.png`（米夏 side／sideopen／talk、蘿法 complain／front／talk、諾薇兒 decode）、
   `grid_fixh3.png`（柯文 ecstasy／lookaside、族長 npc_shinier_chief_si）。
   提示詞＝`blink_gpt.py prompt half` ＋「半閉不是閉眼：每隻眼都要看得到下半個虹膜」「只動眼睛，頭／臉／頭髮一個像素都不要移動」（fixh2 有 7 格被 GPT 挪了構圖、對位擋下）。**開新對話送**。
   合併：`PYTHONIOENCODING=utf-8 py -3.11 -X utf8 tools/blink_gpt.py merge fixh4 <下載的圖> half` → `tools/blink_build.py <名…>` → `bust --bump` → lint。
   在那之前：米夏／蘿法這 6 張照舊像眨兩下；柯文／decode／族長半閉那格遠側眼還睜著（閉眼已修好）。
2. 瞳顫框偏大／只框一隻、要進遊戲看：索拉娜 surprise／furious／readshock、柯文 shock。
3. 「這一拍眼睛」還沒在遊戲裡實演過的：瞳顫快／慢、戰鬥對白那條路（劇情頁的半眨已實測過）。
4. `sorana_si_carrynouvelleshock` 欠眨眼：雙人圖，要在 `tools/blink_eyes.txt` 手給眼框（Ray 沒點名）。
5. 之後：飛行頁 canvas 眨眼、手機實機量發熱（鐵律 12）、路線 B 髮梢擺動。
6. ⏸ 呼吸與微晃（路線 A，-1934）：commit 在 3060 本機、沒推上來，等 Ray 看效果。

**背景雷同修正（10-04 美術已交件）**
7. ✔ 美術已交：9 組共 37 張背景＋北泊公會櫃台立繪 1 張，**全部同名覆蓋**（舊檔在 `_recycle/`，母版在 `_originals/`）。明細在 `resources/background/_similarity_audit_20261003.md` 末段「交件紀錄」。
   Ray 改了方向：「有雷同的圖要整張重繪，不是小改」→ 7 組整張重繪（大教堂、中心區、帝都行政廳、帝都大教堂、東泊大學、命之泉、夏爾村祭壇），北泊 grocery／east 兩組只改招牌字（含 `_bf`）。
   ⚠⚠ **程式端要接**：
   ① 跑 `py -3.11 tools/bust.py --bump`（38 個檔都是同名覆蓋，不跳版號玩家拿到的還是舊圖）。
   ② `npc_guildcounter_si_northport.webp` 重新去背（Ray：「去背不全」，臂與馬甲夾縫留白、髮側白邊）→ **底圖換了，眨眼補丁要重跑**：`tools/blink_build.py npc_guildcounter_si_northport`（lint `check_blink` 會報）。人物位置沒變（頂 25、底 1521→1522），取景值不必改。
   ③ midtown 的四個出口方向照舊（上＝大道、左＝市政廳、右＝大教堂、下＝廣場），新圖照這個畫；其餘 6 張都是末端，節點資料不用動。

**程式端要接的**
8. 峽谷 `canyon` 的小地圖 `map:{img,spots}`（整段可抄：`resources/map/_minimap_worklist.md` 末段）。

**等 Ray**
- 被刪的 33 張圖：已從 git 取回放進 `_recycle/` 留底，沒有還原進遊戲；要不要還原哪幾張。
- 廢城 `hallcourt`：正門應該堵死但圖裡碎石只擋一半 —— 要不要重出（美術的活）。
- `resources/illustration/023_anyacottoncandy`／`024_nouvellesmile` 沒有腳本引用；`032_rennablush` 插圖還沒交。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫、賽西莉 fluster、按鈕避開動態島、聖徒系列敵卡、米夏隨從、`_TO_CODE_20260922.md`、
雪都教堂大小寫（-1957）、阿瑞尼斯台詞差分（-1958）、廢城祭壇 `_lit`（程式早已接好）、
眨眼修正（賽西莉 blush／tease、露娜眼罩、柯文與 decode 遠側眼閉眼、族長閉眼、米夏 11 張半閉、米夏 closeopen 與 nemo bye 不眨）、
索拉娜 battlecrylookserious ⇄ battlecrylookaside 對調。

# HANDOFF — 截至 `ver 2026.09.22-1984`（10-04 晚，Mac 程式 session → 換 Windows 3070）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md`（同名再回收會加時間戳；git 歷史也有）。

## 現況
- 分支 `claude/standing-art-blink-animation-ub7vw7` ＝ origin ＝ ver -1984（本機的 `main` 分支比較舊，不要從它開工）。
- 本機 server：`py -X utf8 tools/devserver.py`（不加 `-X utf8` 中文主控台會直接退出）。
  3070 的三台（設定在桌面 `C:\Users\User\Desktop\.claude\launch.json`）：**8200、8201 是 Ray 在用的，不要動**；8202 是程式 session 自己測試用。
  ⚠ **拉了遠端、而且 `tools/devserver.py` 有變，就重開自己那台 server** —— server 是開機時載入的，不重開會用舊規則
  （10-04 Mac 踩到：「這一拍眼睛」寫淚眼／瞳顫一直 409「set 只准改 bubbleFx／shake／flip」，就是舊 server）。
- Python 工具一律 `py -3.11 -X utf8`；批次叫子程序時加 `PYTHONIOENCODING=utf-8`（不加會 cp1252 編碼錯誤）。
- **眼睛特效標在「那一拍」**：腳本寫 `eyes:'half'|'tremble'|'trembleslow'|'tear'`，可疊 `['half','tear']`；解讀只有 `modules/eyefx.js` 的 `eyesOf`。
  素材：眨眼 329 張（`script/blink.js`）、淚眼 362 張、瞳顫 40 張（`script/eyefx.js`）。
- 不要 commit：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`（gitignore）；`docs/EOS_CONTEST.md`、`reference/TIVOT_Glossary_ZH_EN_JA_ES.xlsx`（Mac 工作區裡別人的改動，沒碰）。

## 未完成

**⚠⚠ 換機器的理由：淚眼 v2 要在 3070 整批重算（Ray：「沒有一次全套的方法嗎？」→「那就換機器」）**

淚眼 v2 已經定型（Ray 一路看過、逐項改到 -1984），但**只有 5 張**是新效果：
`anya_si_front`／`misha_si_front`／`nouvelle_si_front`／`renna_si_front`／`sorana_si_side`。
其餘 357 張還是 v1（舊的三張光點，Ray 說「很不明顯」）。工具是全自動的，**卡在分割資料**：
`tools/eye_fx.py` 要 `tools/_blink_seg/<名>/classes_s1.6.png`，那是 `tools/face_parse.py`（GPU＋anime-face-detector＋UNet）產的，**只有 3070 有**（Mac 只有 5 份）。

**要做的（一次全套）：**
1. 缺分割的先補：`tools/blink_build.py` 的第 1 步就是「`_blink_seg` 不在 → `.venv-face` 跑 `face_parse.py --lite`（批次一次）」，照它的方式補齊淚眼那 362 張。
2. 整批重算（`--tear-only` 不碰瞳顫的 `tr`）：
   ```
   PYTHONIOENCODING=utf-8 py -3.11 -X utf8 -c "import re,json,subprocess;t=json.loads(re.search(r'EYEFX\s*=\s*(\{.*\});',open('script/eyefx.js',encoding='utf-8').read(),re.S).group(1));[subprocess.run(['py','-3.11','-X','utf8','tools/eye_fx.py',k,'--tear-only']) for k in sorted(t) if 'te' in t[k]]"
   ```
   每張會產 `resources/si/eyefx/<名>_te_mask.webp`，並在表上補 `tg`（每隻眼 7 格）／`ta`（傾斜角）。
3. `py -3.11 tools/bust.py --bump` → `py -3.11 tools/script_lint.py`。
4. **抽樣進遊戲看**（Ray 一定會看）：側臉、瞇眼、瀏海蓋眼、雙人圖。工具算不出來（找不到虹膜）的那幾張會 `SystemExit`，照舊留 v1、列給 Ray。

**淚眼 v2 定案的規格（不要再改回去）：**
- 每隻眼兩顆白光：**大光寬＝虹膜寬、1:2 橢圓**；小光是大光的一半、也是 1:2（Ray -1984）。
- **角度**＝兩眼下眼線最低點連線的角度（`ta`），光與排列都跟著轉。
- **位置**：x 依虹膜中心；高度依「眼框遮罩在虹膜那一欄的上下緣」（大光 38%、小光 72%）—— 一定落在框內，不會被橫切。
- **裁切**：`_te_mask`＝眼睛開口，**扣睫毛之前**的那一份＋把睫毛帶裡像虹膜色的像素還回來（只收分割判成「眼睛」的、扣掉頭髮）＋補洞＋0.7px 羽化；**近鏡頭那隻眼內縮半高的 15%**（Ray：「離鏡頭較近的眼一律要留一點空」）。
- **動**：原地變形三格輪播（`efWob`，0.3s、steps）—— **不是平移**；全部同步不錯開；**閒置也不停**（`perf-idle` 例外）。
- **呼吸**：容器跟頭同一段 `brHead`，掛上去那一刻把動畫時間對齊頭部（`syncBreath`）。
- ⛔ 拿掉的不要加回：下眼線濕光、虹膜下緣亮色（Ray：「眼框下方的可以不用」）。
- 引擎沒有 `tg` 的照舊退回 v1，所以重算前後都不會壞。

**米夏／羅賽爾廢城主祭壇（-1957～-1984）**
- ⚠ 欠 `resources/background/dunmor/dunmor_altar_lit.webp`（主祭壇點亮版；照四座小祭壇 `_lit` 的翡翠綠電路紋，GPT 從 `dunmor_altar` 衍生）。
  程式已接（白光那一拍 `bgBand`＋節點 `bgWhen need:'dm_altar_done'`），**交件就生效**；交件後拔掉那一拍的 `bgPending`。⛔ Ray：不要用 Gemini（「他會加一些有的沒的」）。
- ⚠ 欠 `man_misha_guards` 正式版（現在是 Gemini 代圖，等 GPT 重畫；同名覆蓋要跳 `?v=`）。
- ⚠ 欠插圖「主角被刺穿」（那一拍現在只有斬殺音＋震動）。
- ❓ 米夏「這點成色還想成王……」那一拍表上寫 `mishaattack`，立繪庫沒有，暫用 `fight`。
- 主祭壇那一段 Ray 在 Mac 上從頭玩過到劇情殺；**最後「自動出航、從廢城起飛」還沒親眼確認**。

**眨眼／眼睛（上一份帶過來，未動）**
1. ⚠⚠ **GPT 半閉還欠 10 張**（拼格 `tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`；提示詞與合併步驟照舊：`blink_gpt.py prompt half` ＋「半閉不是閉眼」「只動眼睛」，**開新對話送**；合併 `blink_gpt.py merge …` → `blink_build.py` → `bust --bump` → lint）。
2. 瞳顫框偏大／只框一隻、要進遊戲看：索拉娜 surprise／furious／readshock、柯文 shock。
3. 「這一拍眼睛」還沒在遊戲裡實演過的：瞳顫快／慢、戰鬥對白那條路。
4. `sorana_si_carrynouvelleshock` 欠眨眼（雙人圖，要在 `tools/blink_eyes.txt` 手給眼框）。
5. 之後：飛行頁 canvas 眨眼、手機實機量發熱（鐵律 12）、路線 B 髮梢擺動。
6. ⏸ 呼吸與微晃（路線 A，-1934）：commit 在 3060 本機、沒推上來，等 Ray 看效果。

**北泊公會櫃台**
7. ⚠ `npc_guildcounter_si_northport.webp` 美術重新去背 → **眨眼補丁要重跑**：`tools/blink_build.py npc_guildcounter_si_northport`（lint 現在唯一的 ❌ 就是它）。人物位置沒變，取景值不必改。

**程式端要接的**
8. 峽谷 `canyon` 的小地圖 `map:{img,spots}`（整段可抄：`resources/map/_minimap_worklist.md` 末段）。

**等 Ray**
- 被刪的 33 張圖：已從 git 取回放進 `_recycle/` 留底，沒有還原進遊戲；要不要還原哪幾張。
- 廢城 `hallcourt`：正門應該堵死但圖裡碎石只擋一半 —— 要不要重出（美術的活）。
- `resources/illustration/023_anyacottoncandy`／`024_nouvellesmile` 沒有腳本引用；`032_rennablush` 插圖還沒交。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫、賽西莉 fluster、按鈕避開動態島、聖徒系列敵卡、米夏隨從、`_TO_CODE_20260922.md`、
雪都教堂大小寫、阿瑞尼斯台詞差分、廢城祭壇 `_lit`、眨眼修正（賽西莉／露娜眼罩／柯文與 decode／族長／米夏 11 張半閉／closeopen 與 nemo bye）、
索拉娜 battlecry 兩鍵對調、背景雷同修正 9 組（美術交件＋同名覆蓋的內容雜湊已由 bust 掛上）、
米夏敵卡（劈落／NI／語音 20 支／BR 首末發／Havoc BGM）、空中戰預設 EpicBattle、主祭壇劇本與兩場戰鬥、主角空白框可寫（DM_PLAYER 簡寫已拿掉）。

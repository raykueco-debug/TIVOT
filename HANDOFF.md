# HANDOFF — 截至 `ver 2026.09.22-2081`（10-08 凌晨，Windows 3070 程式 session 收工）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261008-014313`（git 歷史也有）。

## 現況
- 只有一個分支：`main`（本地 `master` 推 `origin master:main`）。
- Windows 3070：8200、8201 是 Ray 在用的，不要動；程式 session 自己測用 **tivot-verify 8123**，**一進頁面先設 `tivot_admin_v1`＋`tivot_mute_v1`**（Ray：開 server 一律預設靜音）。
  Python 工具一律 `py -3.11 -X utf8`；跑 `tivot_wan.py` 這類會印符號的，要先 `PYTHONIOENCODING=utf-8 PYTHONUTF8=1`（cp950 會讓它當場中止）。
  ffmpeg 在 `C:\ffmpeg\bin\ffmpeg`（Ray 剪的動畫格 → mp4 就用它：`-framerate 16 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -movflags +faststart -an`）。
- **Mac**：`python3` 跑 lint／bust／bg_index 都行；沒有 node。GitHub token 2027-01-03 到期（Contents 讀寫要手動加）。
  Mac 的 `.venv-face` 是空的 ⇒ 眨眼／淚光分割只能在 Windows 跑。
- ⚠⚠ 改視覺效果先做幾張給 Ray 看，看過才整批。
- 不要 commit：`.claude/launch.json`、`resources/_HANDOFF_ART_20260925.md`（美術的）、`tools/_blink_base/`、
  `resources/ci/ci_nouvelle_saintinstall0/1.png`、`resources/ci/anya_ni2.png`、`resources/ci/ci_anya_nightmareinstall.png`（別的 session 的未入庫檔）、`tools/anim/embers2.py` 的修改（動畫的）。
- 另外兩個 session 用跨 session 訊息交件：**動畫**（`resources/_HANDOFF_ANIM.md`）、**交接美術**。交件後由程式這邊接、commit。
  ⚠ 10-07 `ci_anya_ni_v1.mp4` 曾在工作區被刪（未 commit、不是動畫刪的、來源不明）—— 之後交件檔莫名不見，先停下來問 Ray。

## 本輪做的（10-06～10-08，-2013～-2081）—— 都推上了，大部分等 Ray 手機實測

**CI（全部改影片）**
- CI 動檔改交 **mp4**（動畫交件 480×720 16fps）。播放：預熱時整支 fetch 成 **blob**，開演才建 `<video>`（藏在畫面外 1×1）**逐格畫進 canvas**（-2064：避開 iPhone 的 video 圖層亂序；CI 字壓在 canvas 上）。撤下即停播釋放。
- 預熱 **插旗／拔旗**（-2054）：有戰鬥的地圖背景與怪暖完才暖搭檔 CI、飛行頁載完後暖、開戰先讓敵人圖（`holdCiWarm`）、整備頁重選人重暖、**切地圖才放**；低優先 2 條連線。
- 搭檔 CI 名單只有一份：`config.partnerCiKeys`（掃卡上所有 `*cutin` 欄位，含主被動技）；`config.ciShownFrames`；lint 的 **CI 解碼預算**（每位搭檔 120 MB；影片不計）。
- CI 驗收頁（首頁「CI」鈕 → `tools/ci_review.html`）：影片可暫停／重播／逐格、**循環開關**（CI 預設關、怪待機預設開）、**怪的待機 87 組**列表。-2027 起的語法錯已修。
- 長度表 `tuning.cutinDur`（片長＝CI 長，撤出時還在播）。**安雅 NI 2.875 秒**（v2 1.875＋Ray「再延 1 秒」）。

**敵人**
- **群體敵人**（`group`）：plate（整張背景）或 cover（掩體）＋每人一層；`hp`／`hpEach`；倒誰看子彈落點；`fall`＋`fallLead`／`fallMs`／`fallHold` 倒地動畫；最後一人播完才閉棺。帝都衛士四場、米夏親衛隊、聖索菲亞惡棍五場都接了。
- **人類敵人不給 OVK**、擊殺即閉棺不碎殘格（`overkill:1` 可個案給回）；BR 瞄準點只落在還站著的人身上。
- 單人敵人卡 `fall`（同格式）＝擊殺時換倒地動畫、播完才閉棺 —— **目前沒有任何單人卡有素材**。
- **怪的待機循環**：`config.ENEMY_IDLE`（立繪基底名 → `resources/enemy/anim/<名>_idle_v1/`），87 隻＋米夏；降臨演完才換、受擊／死亡／換敵在本體演；`tools/anim/deliver_idle_lite.py` 轉檔（不放大、縮 3/4，解碼約 14 MB／隻）。
- 米夏 NI 立繪重畫：`lastStand.fit`（放大 1.45）＋`lastStand.idle`（24 格縮六成 `_s60`）。
- **米夏呼吸待機**：用「明顯深呼吸」提示詞、不掛 LoRA（Civitai 的 Live2D LoRA 1958461 兩輪測不出效果，檔案留在 `ComfyUI-master/models/loras/wan22_live2d_low.safetensors`）。

**其他**
- iPhone 首頁點一下就起播 BGM（-2077：手勢前建立、沒跑過的 AudioContext 第一下當場重建）—— **要手機確認**。
- 古城天光六格四時段、峽谷／鏡湖小地圖、帝都教廷衛士戰（旅店→上街區→廣場結算→舊街區，劈落 30%，攻擊槍彈）。

## 資產盤點（這一輪碰過的，`✔ 不欠`／`⚠ 欠`）
| 項目 | 狀態 |
|---|---|
| CI 影片：諾薇兒 SI／OBE／即死防禦（v2＝`dg3j_s7_cut`）／魂之歸所 | ✔ 不欠 |
| CI 影片：安雅 NI（v2）／熔斷／夢境粉碎／明晰之夢（主動）／夢魘再臨（被動，`nr_blue77_cut`） | ✔ 不欠；⚠ Ray「眼睛是藍色」已轉動畫，哪一支待它確認 |
| CI 影片：索拉娜共鬥／飛刀耗盡／補給／怒吼 ×3 | ✔ 不欠 |
| CI 影片：賽西莉 SI／OBE | ✔ 不欠（守護／歸還仍是靜態圖，沒有動畫交件） |
| 群戰倒地：帝都衛士 16 人／親衛隊 3 人／惡棍 26 人 | ✔ 不欠 |
| 單人人類敵人倒地（米夏、賞金獵人、尼莫…） | ⚠ 欠動畫（產線 `tivot_wan/out/hit/` 有中槍素材，未交） |
| 怪待機 | ✔ 87 隻；⚠ 祭壇獸（去背壞掉不收）；⚠ 燭塔（圓盤不見）、聖遺物重組（偏暗）已接但請 Ray 看 |
| 人類敵人待機（除米夏外） | ⚠ 欠（Ray 未決定要不要比照米夏的深呼吸寫法） |
| 謎之術師（碼頭 Boss）`man_mage.webp` | ✔ 立繪已交；⚠ 欠 Ray 的數值卡 → 卡與碼頭那場還沒建 |

## 未完成
**等 Ray**
1. 謎之術師數值卡（建卡＋接碼頭 Boss，帝都城鎮戰舊街區之後那一場）。
2. 其他人類敵人要不要比照米夏補呼吸待機（要就把寫法轉給動畫 session）。
3. 帝都衛士戰四件假設：前三場受擊特效、storyBattle 輸了回檔、守衛名稱、舊街區後城鎮戰結束。
4. 被刪的 33 張圖要不要還原；廢城 `hallcourt` 碎石重出；`023`／`024` 插圖沒腳本引用、`032_rennablush` 未交；插入拍「說話者」字母排序。

**要實機確認**
5. iPhone：首頁第一下 BGM、CI 在最上層會動且字壓在上面、群戰倒地與閉棺、米夏 NI 取景（光環有沒有切到）。
6. 主祭壇最後「自動出航、從廢城起飛」（Stage 16 可直接跳）。

**程式端可做**
7. `misha_si_ni`（對話用 NI 立繪）眼效是舊圖座標，要用時重產（`tools/eye_fx.py`，要先有分割圖）。
8. `se_march` 不存在，主祭壇那一拍用 `se_troops` 頂著。

**眨眼／眼睛（舊單，仍未做）**
9. GPT 半閉欠 10 張（`tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`）；瞳顫框偏大（索拉娜 surprise／furious／readshock、柯文 shock）；`sorana_si_carrynouvelleshock` 欠眨眼；淚光 6 張待修（`tools/tear_reject.txt`）。
10. 茉莉／羅伯特／亞隆全身立繪（產圖的活，交美術）。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫、賽西莉 fluster、按鈕避開動態島、聖徒系列敵卡、米夏隨從、雪都教堂大小寫、阿瑞尼斯台詞差分、
廢城祭壇 `_lit`、眨眼修正多批、米夏敵卡、空中戰預設 EpicBattle、主祭壇劇本與兩場戰鬥、淚眼 v2、主祭壇點亮版、親衛隊正式版、主祭壇插圖 037／038、
淚光改版（-1999）、北泊公會櫃台眨眼重跑、古城天光六格、峽谷與鏡湖小地圖、iPhone 語音被音樂蓋過（-2015～-2018，Ray：「現在這樣很好不用再動」）、
CI 格率比較（定案後改影片）、Live2D LoRA 試跑（不採用）。

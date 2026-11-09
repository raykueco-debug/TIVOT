# HANDOFF — 截至 `ver 2026.11.08-2615`（11-09 早上，Windows 3060 程式／PM session）

> ⚠⚠ **交接規則（Ray 10-04 定）**：開工讀這一份 → 逐項清點「完成／未完成」給 Ray 確認 → 生成新的一份、回收舊的（`tools/recycle.sh`）。**只留一份現況，不往下疊。**
> 上一份：`_recycle/HANDOFF.md.20261109-110250`（10-30，-2323；git 歷史也有）。
> ⚠ **那一份的未完成項目還沒跟 Ray 一起清點**（這一份是 Ray 11-09 早上直接交辦「最新進度與最新處理方式寫進 HANDOFF」寫的）—— 最後一段列出那一份還掛著的段落，下一個 session 開工要先跟 Ray 盤。

---

## 一、現況

- 只有一個分支 `main`。兩台在推：**Windows 3060**（`C:/Users/User/Desktop/TIVOT`）與 **iMac**。**開工先 `git pull`，推之前再 pull 一次**。4070 那台另有北泊的動畫（這台不做北泊）。
- 測試伺服器（Windows）：遊戲 `tivot-claude` **8202**、試玩版 dist **8215**、animechk／背景審閱 **8130**（`ComfyUI-master/tivot_wan/serve_player.py`）。**8200 是 Ray 的，不碰**。
- 版號一律 `py tools/bust.py --bump`；commit 前 `py tools/script_lint.py`（目前 13 個既有錯誤＝`charm_C01`～`C13` 大寫檔名，不是新壞的）。
- **工作分五條線**（Ray 定，memory `tivot-five-workstreams`）：程式（主 session，兼 PM）／動畫／敵人／背景／地圖。主 session `git pull` 後當程式，其餘四條各開子 session（副理）。

## 二、這兩天做了什麼（11-07～11-09，都推上了）

### 程式（主 session）
- **安雅主動技（非夢魘化）＝清醒夢減速**：敵人的**延時讀秒 ×2**、**攻擊圈縮圈速度減半**，持續 10 秒（ver -2606 → -2607 更正）。
  - ⚠ 第一版做成「攻擊頻率減半」被 Ray 退：「縮圈變慢　不是頻率變慢」「d讀秒x2」。
  - 實作：`state.enemySlowUntil／enemySlowMul` ＋ `enemyTimeK()`（唯一換算點）；`defense.chargeSec()` 讀它；`combat.effIntervalLimit` 乘它；發動時 `stretchIntervalDeadline(1/mul)`＋`defense.rescaleCharge(1/mul)` 把**正在跑**的讀秒與縮圈一起拉長，10 秒後 `rescaleCharge(mul)` 收回。數值在 `config` 安雅 active 的 `slowSec:10, slowMul:0.5`。
  - 實測：縮圈 4→8 秒、延時 5→10 秒，結束後恢復。多語 Excel 已補新說明（ver -2613）。
- **背負祭壇者咆哮 delay_v2 接上**（ver -2612）：`ENEMY_DELAY.mon_beast_altar` → `mon_beast_altar_delay_v2/`，hit 13。
- **空賊群戰逐人動畫**（ver -2589）＋車輪戰鎖血測試已開過，可試打。
- lint 誤判修正（空賊卡註解檔名佔位改小寫，66f21d3d）。

### 3D 空戰（夜間授權 session，已推 main）
- 空中怪 3D 試驗（ver -2587～-2615）：王座徘徊者 → 模組通用化 → 其餘 14 隻＋管狀四隻；調整面板（大小／出場／轉彎／上下扭／標準化／儲存進 `flight/enemy/sky3d_tune.json`）；首頁管理人「空戰」鈕；接戰閃字、免戰交棒借劇本戰鬥卡（`bl_sky`／`li_south`）。
- 程式在 `flight/drg3d.js`。**仍是試驗模式，不是預設。**

### 敵人動畫（副理）
- **背負祭壇者咆哮 v2**（natali 重做：撲出＋收勢＋收回，42 格 24fps，c1720f55）。
- **空賊攻擊**：v4 28 支；其中 8 支（火光問題）重跑成 v5，自動初剪都放 animechk「空賊」頁（`pirate_v5_*_auto`），等 Ray 剪。
- **單隻怪的關鍵格（KF）**：30 隻出完（獸型 tiger 10、其他 natali 20），**都還沒跑 Wan**。對照圖 `resources/enemy/_neutral_refs/s3_kf/_review_第三節_1～6.jpg`；盤點表 `resources/enemy/anim/_ADMIRE_盤點.md`（第二、三批段落）。
- 飛行怪 swim_v2：`flm_boneray／flm_gasjelly／flm_ribwhale`（已交件進版控，還沒接程式）。

### 背景動畫（副理）
- 一律拆層跑（憲法 11-08 那一條）。審閱頁 `http://localhost:8130/bg_layer/night_review.html`。
- 成：光束（s202，擺幅小）、瀑布。要 Ray 看：燭台兩版。卡住：火盆、樹晃、光束 s101。雲＝程式動，有預覽。
- 成品與中間檔在 `resources/background/anim/`，候選清單 `resources/background/_anim_candidates.md`。

### 地圖（副理）
- 地底大空洞巡檢正常（ver -2576～-2585：壁龕、3D 祈禱像、女神 SMK 模型、入口改成賽西莉入隊後才開、谷頭遺跡包）。

### 多語種
- 介面多語收進 `i18n_ui.xlsx`（ver -2586），補新字到 -2613。**Ray 指示暫停**，機翻還沒開始。

## 三、最新處理方式（這一段是規矩，不是進度）

1. **PM 模式**：Ray 睡前交「各副理的工作序列」→ 主 session 盯到跑完；子 session 回報是**報告不是證據**，要看檔案／diff 才算數。夜裡電腦會睡：長跑的 GPU 工作掛 `SetThreadExecutionState`（keep-awake），完成就放開。
2. **敵人動畫**：獸型（有爪牙）一律 **tiger rule**（`tivot_wan/tiger_cut.py`）、其他一律 **natali rule**；**man_（人類）先不做**；**北泊不做**（4070 有）；**空戰飛行怪不做**（memory `enemy-anim-no-aerial`）。KF 每張都要 Ray 點頭才跑 Wan。無嘴的怪「撲咬」改成撲抓／重拳，要 Ray 定。
3. **Wan 提示詞**：短的正向關鍵字講目標，不加負面詞、不寫長段（memory）。尺寸 16 整除；3060 跑 VACE 會 RAM OOM，用 FLF 分段。
4. **Ray 剪之前先 auto_cut 初剪**，剪完對答案記 `tools/anim/AUTO_CUT_LOG.md`；**沒叫不准後製**（鎖嘴／貼片／補格），原片給 Ray 選。
5. **背景動畫**：一律拆層、只有被風吹的層進 Wan、雲由程式動；循環不准倒放／來回。**Mobius 潛空間輪轉**（`TIVOT_MOBIUS`，ComfyUI `custom_nodes/tivot_latent_loop.py`）4 步、8 步都沒讓頭尾閉合 → 改成在 Mobius 成品裡**找自然回到原點的一段**當循環。
6. **GPT 產 KF**：提示詞英文、新角色一批開一串新對話、新視角一律上傳定稿圖、透明圖要真 alpha（收件量角落 alpha，假透明立刻重出）。被擋先質疑哪裡違規，一次不行換 session＋換提詞。
7. **驗收**：另開前景分頁、不碰 Ray 的窗、不開背景瀏覽器；測試第一步先點掉開機讀取頁。測戰鬥用 JS import 模組呼叫 `startScriptBattle`，`state.hpLock`／`GAME_CONFIG.lineup` 鎖血排輪戰。
8. **刪除／覆蓋**一律 `tools/recycle.sh`，而且先問 Ray（HANDOFF 這一份是常駐許可）。

## 四、等 Ray 決定（11-09 早上的清單）

- **空賊攻擊**：在 animechk「空賊」頁剪 v4 的 28 支＋v5 的 8 支。
  - v5 裡 6 支（1-3、2-2、4-2、5-1、7-4、8-2）火光已乾淨。
  - 5-3 第 12～18 格還有火星：剪掉那幾格，還是換種子重跑？
  - 6-1 後半人縮到 0.76、另有 6 格碰邊；7-4 縮到 0.88。原因是 B 圖本身小，改提示詞救不了。
- **30 隻怪的 KF**：逐張點頭；無嘴的怪改撲抓／重拳定不定；還缺詩輪、風箱的撲抓，香爐肺的斜劈。
- **ChatGPT 檔案空間滿了**（Ray 的帳號）：要 Ray 清掉，才能續出 KF。
- **背景**：燭台兩版選一；火盆、樹晃、光束 s101 怎麼處理。
- **3D 空戰**：`sky3d_tune.json` 數值定案；天之裂隙膜邊要不要重跑；什麼時候改成預設；手機實機 fps；打贏回飛行那條還沒實測。
- **地圖**：賽西莉入隊段要插 `party_cecilie` 旗（不然正篇進不去地底大空洞）；聖王廳地宮 G3／G4 拓樸；手機效能；「類似這樣的風格」參考圖要再傳一次。
- **多語種**：要不要開機翻、先翻哪幾種。

## 五、還沒收乾淨的（這一次推版刻意沒動的）

- ⚠ **`resources/illustration/041_cecilienemo.webp` 在工作區被刪掉、旁邊多一張同名 `.png`（10-18、2.3 MB、沒進過版控）**。不是我刪的、回收區也沒有紀錄 —— 遊戲照樣顯示得出來（候選鏈 `.webp → .png`）。**沒有 commit 這個刪除**，等 Ray 說是不是他換的圖；若是，要轉 webp、原 png 進 `_originals`。
- ⚠ **`tools/anim/` 的三支比 `ComfyUI-master/tivot_wan/` 舊**：`tivot_wan.py`（缺 `TIVOT_STEPS`／`TIVOT_MOBIUS`）、`make_player.py`、`player.html`（tivot_wan 是 11-08 晚上的版本）。這一次同步被權限擋下沒做；版控裡的是 11-08 下午那一版。下一個動畫 session 開工照 memory `sync-anim-tools-first` 先同步（舊版先回收），順便把 `custom_nodes/tivot_latent_loop.py` 收進 `tools/anim/`。
- script_lint 的 13 個既有錯誤（charm 大寫檔名）。

## 六、資產盤點（`✔ 不欠`／`⚠ 欠`）—— 只列這兩天動到的

| 項目 | 狀態 |
|---|---|
| 背負祭壇者 延時（咆哮 v2） | ✔ 不欠（已交、已接 ver -2612） |
| 空賊群戰 待機／隨機一人攻擊 | ✔ 不欠（ver -2589 已接） |
| 空賊攻擊 36 支 | ⚠ 欠 Ray 剪片 → 交件 → 程式接 |
| 單隻怪攻擊／延時 30 隻 | ⚠ 欠 KF 審閱 → Wan → 剪 → 交件；另有約 60 隻 KF 還沒出（清單在 `_ADMIRE_盤點.md`） |
| 飛行怪 swim_v2 三隻 | ⚠ 欠程式接（資產已在 `flight/enemy/*/swim_v2/`） |
| 背景動畫 | ⚠ 光束、瀑布已成但**還沒進戰鬥／城鎮**；燭台待選；火盆、樹晃卡住 |
| 槍口座標、倒地 v2、背景動畫進戰鬥 | ⚠ 等美術 |

## 七、10-30 那一份還掛著、尚未清點的段落

在 `_recycle/HANDOFF.md.20261109-110250`（或 git 上一版的 `HANDOFF.md`）：
- 「這一段做了什麼」／「10-30 晚上接著做的」（西泊 Stage 23、米夏攻城、守城戰地圖 v9b、阿什弗德立繪、紫月軍小隊）
- 「地底世界」（西部大溶谷、地下古城 -2399～-2430 的全部紀錄與還沒做的）
- 「等 Ray 決定」12 條（試玩版上線方式、守城戰玩法細節、-2259 待確認那一件、數值暫填、立繪翻回、美術待判、眨眼補丁、iMac 未進版控的檔、LoRA 商用確認、舊影片回收…）
- 「要實測」「程式端可以做的」「美術欠的」「資產盤點」「已結案」
⇒ **下一個 session 開工第一件事：跟 Ray 逐條清點，做完的劃掉、還要的搬進這一份，然後才開始做事。**

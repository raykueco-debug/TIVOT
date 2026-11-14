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

## 〇、4070 這台 11-09～11-13 的進度（11-13 換機前寫；ver -2618，全部推上）

> 這一段是 4070（`C:/Users/Ray Ku/Desktop/TIVOT`）PM session 與四個副理的收尾。**下面一～七段是 11-09 早上 3060 寫的，仍有效**，這一段只補新進度。
> ⚠ 11-09 那條「開工先跟 Ray 清點 10-30 那一份」**還沒做**（Ray 直接派了四條線）。

**程式（主 session）**
- ver -2617：接動畫副理交接 —— `cgAnim` 005 v2／010 v2／038 v3，新接 013／014／28／30；`cutinAnim.ci_misha_ni`（v2，cutinDur 4063）；4 處過期註解（守城戰「還沒做」、地下古城回程）。
- ver -2618：**反擊硬直改成延時退回一半**（Ray：「反擊不應該全清延時 應該清1/2」）。`tuning.counterStaggerClear:0.5`、`combat.easeIntervalDeadline`；憲法 §6.5.2 同步。⚠ `script/enemies.js` 檔頭那句「延時計時歸零」還沒改。
- 剪輯器（`tools/promo/editor`，啟動 `run_editor.bat`＝**8140**）：比例選單／自動比例（動畫副理）；**輸出加速**（51320bf1）：硬體編碼 NVENC→VideoToolbox→libx264，填滿改先裁再縮（`exact=1`）。實測長片約 3.5 倍。
- **不接的**：飛行怪 swim_v2（`flight/enemy/_sky_flight_TO_CODE.md` 寫 Ray 10-18 選 v1）、安雅 NI v3（Ray：先維持 v2）、尼莫彈幕 v2（橫式＋alpha，CI 引擎要改、iPhone 未測）。
- ⚠ **程式端待接**：`resources/enemy/anim/TO_CODE_skypirate.md` —— 空賊 8 張卡改指 `_v3/`、受擊閃（抖動掛錯在 opacity:0 的分層上）、有倒地動畫的群戰受擊播倒地前兩格再倒放、攻擊收尾縮一下的時序。

**程式（3060，11-14，ver -2620）**
- **過場動畫（`cgAnim`）改成「播完停最後一格、點掉才推進」**（Ray：「所有過場動畫播完就定在最後一格 點掉才會推進下一幕」），推翻 -2182 的片尾前自動撤下。播放中點一下＝跳到最後一格；停格時點＝插圖淡出 0.4 秒＋推進；自動播放＝播完自己走。判定只有 `story.cgAnimGate`。`hold:true`（041）改成「點擊也不撤，撐到 `cg:null`」。順修：插圖動畫開場黑幕要撐 3 秒保險才掀（等第一格的兩邊互等）。
- **背景動畫接上（整張影片那一種，192 支）**：對照表 `script/bg_anim.js` 由 `py tools/bg_anim_index.py` 掃磁碟產生（鑰匙＝靜態背景檔名，含時段；`_loop_v1` 作廢不收、獅口水道退役）。播放在 `story.js` 的 bgAnim 段（canvas 疊在 `#storyBg` 上，換背景／收舞台自己停）。⚠ **交件後重跑那支工具**（`--check` 會比對）。⚠ **還沒做的程式層**：雲、水面、落水、光束（長廊）、煙（硝坑）、獅口水柱 —— 交件單 `TO_CODE_bg_anim.md` 下半段；獅口水道節點還指舊底圖。
- **敵人**：KF 第二輪五支接上（巨像 A、監查者 D、腐鹿骸 A＋換中立立繪〔⚠ 沒有待機、fit 沒重調〕、鹿主 A＝D、熊骸 M）；鹿主的櫻花／加速、監查者飛刃等程式效果**還沒做**。空賊 8 組改 `_v3/`、`muzzle:false`、打到＝最後一格、換框前先換圖、受擊閃＋倒地前兩格倒放、開戰那道門預載逐人動檔。
- 紫黑之翼（`mon_np_anyawings`）待機**有接、有在播**；只是攻擊間隔 3～5 秒、A 動畫 2.7 秒，待機只露一兩秒。

**動畫副理**：`tools/anim/` 與 ComfyUI `tivot_wan/` 兩台已同步（版控較新）；`TIVOT_STEPS/MOBIUS` 版 `tivot_wan.py` 與 `tivot_latent_loop.py` 這台沒有，要 3060 推。待 Ray：6 支插畫放哪一幕（32 米夏行軍、grifonback、canyon_army、torsten_sit、槍機特寫、deck_long）、`cutin_dual_nemo`／`anya_curlfloat` 要不要接、舊影片回收。

**敵人副理**：KF 審閱清單 `resources/enemy/anim/_敵人線_盤點與審閱_1109.md`；第二輪 12 隻逐格盤點 `_KF_第二輪_1109.md` §四；空賊 v3（每人三支動作同框）已交。待 Ray：animechk「空賊之後」頁剪片、熊骸 husk 透明版（`_neutral_refs/s3_kf/redo/mon_bear_husk_alpha*.png` 三版待選）。

**背景副理**：大量拆層循環已交件（北泊／伊甸古墓／夏爾森林／羅賽爾／里朋莊園／室內…）。**換機接續看 `resources/background/_layers_gpt/PROGRESS.md` 最後兩段**（剩 19 格各卡在哪一步、哪些檔要放回哪）。

**地圖副理**（只盤點）：`party_cecilie` 沒有任何劇情插（劇本還沒有賽西莉入隊段）→ 正篇進不去地底大空洞；守城戰六隊→米夏段路徑完整但未實測；西部大溶谷／地下古城入口沒有章節鎖；G3/G4 拓樸、大溶谷終點去向待 Ray。

**這次一起推上的未提交檔**：Ray 改的 `script/enemies.js`（訓練用聖徒 `fit.scale` 0.8→0.7）、敵人 KF 重出圖（`_neutral_refs/`）、空戰側面工作檔（`_sky_side/_work/`）、根目錄四份 xlsx（`.tmp.xlsx` 暫存檔除外）。

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

### 背景動畫（副理，11-09～11-10 在 4070 從頭重做）
- ⚠ 11-08 那批拆層成品（光束 s202／s101、瀑布、燭台、火盆、樹晃、`night_review.html`）**只在 3060**，從沒進過版控；Ray 11-09 定「從頭開始做、分地圖做、城鎮一律靜態」，4070 重做，那批不再追。
- **Ray 11-10 定案的做法**：有方向性的（雲）→ **程式分層捲**（遠／中／近三張左右無縫的雲，近快遠慢、只往右）；其他（布、燈籠、樹葉、火、天光）→ **ABA**（A→B＝從原圖 I2V 的開頭到「動得最開」那一格，B→A＝FLF，接成一圈）。只換註記範圍＋布實際掃過的範圍，其餘原圖。
  - 試過不行的（留紀錄）：Wan 輸出裡找循環段（跳）、FLF／VACE 頭尾鎖原圖（4 步加速鎖不住）、RIFE 補接縫、雲用程式扭曲（「像衛生紙泡在水裡」）、Mobius 潛空間輪轉（4 步加速下整段閃）、雲一起 ABA（「倒車回去」）。
- **註記板＝bgchk**（`http://localhost:8133/`，開在 Chrome；啟動設定 `bg-annotate`）：Ray 用各色畫筆塗會動的範圍、每色寫怎麼動；成品直接在卡片上播（「▶ F 雲程式分層＋布 ABA」＝遊戲裡的疊法即時預覽）。工具在 `ComfyUI-master/tivot_wan/bg_layer/`，版控副本 `tools/anim/bg_layer/`；註記資料在本機 `bg_layer/notes/`（Ray 自己塗的那幾格另備份在 `resources/background/_anim_notes/`）。
- **排程 `bg_queue.py` 整夜在跑**：照註記自動跑 ABA，每件先等 GPU 空（別的 session 在用就排隊）；喊停＝在 `bg_layer/` 放 `STOP` 檔；進度看 `bg_layer/bg_queue.log`；`keepawake.py` 防睡到 STOP 或 36 小時。
- **沒註記的 307 格是我自動判斷的範圍**（綠＝葉草、橙＝火、青＝天空→程式雲；布、旗、水面判不出來），標 `auto:true`、只存檔不提交，**等 Ray 在註記板確認或改**。
- 成品：卡耶爾山谷 5 格 ABA 樣本＋天空遮罩 `resources/background/anim/canyon/`；雲三層 `resources/background/_sky_layers/`（`canyon_day`、`dusk`、`purple`；藍天地圖借空戰的 `sky_parallax/sky_cumulus_day`；對照表 `_sky_layers/map_sky.json`）。程式交接寫在 `resources/background/anim/TO_CODE_bg_anim.md` 的「11-10 新格式」。
- 分地圖工作表 `resources/background/_anim_by_map.md`（取代 `_anim_candidates.md`）。11-07／11-08 那 20 支整張版 mp4 已回收（`_recycle/`）。

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
- **背景**：卡耶爾山谷「雲程式分層＋布 ABA」樣本點不點頭（ABA 接點仍約一般兩格的 1.5～2.5 倍）；自動判斷的 307 格範圍要 Ray 在 bgchk 確認或改；程式端何時接（交接已寫）。
- **3D 空戰**：`sky3d_tune.json` 數值定案；天之裂隙膜邊要不要重跑；什麼時候改成預設；手機實機 fps；打贏回飛行那條還沒實測。
- **地圖**：賽西莉入隊段要插 `party_cecilie` 旗（不然正篇進不去地底大空洞）；聖王廳地宮 G3／G4 拓樸；手機效能；「類似這樣的風格」參考圖要再傳一次。
- **多語種**：要不要開機翻、先翻哪幾種。

## 五、還沒收乾淨的（這一次推版刻意沒動的）

- ✔ **041_cecilienemo**：11-09 Ray 確認是他換的 png（10-18 版）→ 已轉 webp（q92，ASSET_VER 02bae284，ver -2616）；原 png 存成 `resources/_originals/illustration/041_cecilienemo_20261018.png`（`_originals` 裡 10-09 的舊同名 png 沒動）。
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
| 背景動畫 | ⚠ 欠 Ray 看樣本（卡耶爾山谷 5 格）→ 程式接；其餘地圖 ABA 排程整夜在跑（自動範圍待確認）；城鎮 9 張 ✔ 不欠（Ray 11-09：城鎮一律靜態）|
| 槍口座標、倒地 v2、背景動畫進戰鬥 | ⚠ 等美術 |

## 七、10-30 那一份還掛著、尚未清點的段落

在 `_recycle/HANDOFF.md.20261109-110250`（或 git 上一版的 `HANDOFF.md`）：
- 「這一段做了什麼」／「10-30 晚上接著做的」（西泊 Stage 23、米夏攻城、守城戰地圖 v9b、阿什弗德立繪、紫月軍小隊）
- 「地底世界」（西部大溶谷、地下古城 -2399～-2430 的全部紀錄與還沒做的）
- 「等 Ray 決定」12 條（試玩版上線方式、守城戰玩法細節、-2259 待確認那一件、數值暫填、立繪翻回、美術待判、眨眼補丁、iMac 未進版控的檔、LoRA 商用確認、舊影片回收…）
- 「要實測」「程式端可以做的」「美術欠的」「資產盤點」「已結案」
⇒ **下一個 session 開工第一件事：跟 Ray 逐條清點，做完的劃掉、還要的搬進這一份，然後才開始做事。**

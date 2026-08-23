# HANDOFF — Saint Install 模組化重寫 · 進度交接

> 每輪開工前讀本檔 + 憲法/規格。實況以 `git log` 與 `DECISIONS.md` 為準;本檔為人類可讀的進度總覽。
> 目前狀態:**CLAUDE.md §6 開發順序第 1~5 步已完成**,下一輪為**第 6 步(全流程 ACCEPTANCE 對照 reference 收尾)**。
> ⚠ 第 6 步已擱置一段時間了:`-208` 之後的產出幾乎都在 `flight/` 與**全站通用系統**
> (音訊分層、對白演出、讀取畫面)。要收尾戰鬥那側的話,`ACCEPTANCE.md` 仍然不存在。

---

> **飛行模組（`flight/`）的交接在 `flight/HANDOFF.md`** —— 那是獨立的一套
> （地形 raycaster、聚落、敵人、手繪城市貼圖），與本檔的戰鬥模組不共用程式碼。

---

## 一、開工必讀(依序)
1. `CLAUDE.md` — 專案憲法(鐵律、目錄結構、模組邊界、§3 狀態契約與擁有者制、§4 函式歸屬、§6 開發順序)。
2. `DECISIONS.md` — 已定的刻意偏離 reference 決策 **D1~D4**(D1 戰敗優先致死鏈、D2 MB 回血 50%、D3 統一改血 API、D4 saintComboStep 1.0)。
3. `SPEC.md` — 行為規格。**§4 已修正為規則制 rank**;**§三 已補「戰鬥層級模型(場/局/敵/盤)」**(見下方三、備註)。
4. `reference/index.html` — 唯讀行為基準,行為有疑義以它為準。
5. `git log`(本檔最後回寫於 `52c07d8` / `ver -252`)。

---

## 二、模組狀態表

| 模組 | 狀態 | 摘要 |
|---|---|---|
| `state.js` | ✅ | 集中狀態 + 具名 setter(applyDeathGuard/enterSaint/exitSaint/markExecution/addCounter/addPerfect/initEnemyHp)。 |
| `config.js` | ✅ | GAME_CONFIG + ASSETS(resources/ 相對路徑)。 |
| `audio.js` | ✅ | SFX(Web Audio 合成,模組化)。 |
| `combat.js` | ✅ | 戰鬥核心 + 統一改血 API(`healPlayer`/`setPlayerHpRatio`,D3)+ D1 致死鏈 + 雙槍 tap 分支 + 對 defense/saint/weapon/partner/inspector/enemy 的注入協調。win/lose 算 totalTime/avg → `inspector.settle`。**`startIntruderFight`(Boss 亂入＝重開新場,注入 enemy)**。 |
| `defense.js` | ✅ | 三段防禦(Counter/Perfect/Defense)+ `setUltRate` 擁有者管道 + `addPerfect` 計數。多發大絕(ULT_SHOTS/GAP)讀取端已就緒。 |
| `enemy.js` | ✅ | 立繪 / 受擊特效 / `setEnemy`(含 witch Boss 大絕/懲罰/彈痕 config 寫入 state)。**`triggerIntruder` 已接實體**(Boss 遭遇 cut-in → enterFight → 呼叫注入的 `startIntruderFight`)。 |
| `saint.js` | ✅ | 聖徒化三結局(MB / OBE / 生命歸還)、`lifeReturnAbort` 執行體、`markExecution`。 |
| `partner.js` | ✅ | 被動即死防禦(`tryDeathGuard`)接致死鏈;主動技框架(`tryActive(context)`,支援 `'any'` 情境與 `oncePerBattle`)。**第二搭檔馬季諾**:主動「前線補給」(`supplyRefill`,一般盤面發動即進雙槍破防窗口(`weapon.startDualWindow` 經注入)、不吃破防值、不另播雙槍 cut-in、每場一次;聖徒化期間不可發動——context:'board' + saintMode 雙重擋門)+ 被動「高裝藥彈」(`checkLowHpBuff`,HP 跌破 50% 瞬間發動 10 秒普攻加倍、可跨盤;邊緣觸發,回門檻上重新上膛;檢查掛 combat.updateBars,聖徒化中不判定;發動插 cut-in)。`currentPartner` 讀 `state.pickedPartner`(換人即換技)。 |
| `weapon.js` | ✅ | 反擊武器 `weaponCounter`、雙槍破防窗口(`activateDual`/`endDual`)、**副武器選擇畫面**(`openWeaponSheet`:全螢幕橫式卡疊上下滑動、抽換輪轉動畫、點卡直選播擊發聲、底部鈕=選定並返回)、`reset`/`stopTimers`。**搭檔選人畫面**(`openPartnerSheet`:全螢幕卡疊左右滑動——未選卡墊於現選卡後、箭頭切換、抽換輪轉動畫、技能描述卡、底部發動說明;點卡直選(`selectPartnerAt` 經 `setPickedPartner` 唯一管道寫入、實際切換播確認 SE)、底部鈕=選定並返回,兩畫面皆無獨立返回鈕)。 |
| `inspector.js` | ✅ | 規則制評價(rank + EXP 顯示)、監察官結算演出(`showResultSequence` 分階段 + 處決台詞分支 + 打字機)、好感雙軌查表(`pickByThreshold`,currentFavor 固定 0)、Boss 優先 `bossDialogues`、S 解鎖 → `onRematchBtn` 迎擊分流、最佳成績雙存檔(一般 `saint_best_total_v1` / Boss `saint_best_total_boss_v1`)。**不搬 legacy `inspectorPanelHtml`**。 |
| `main.js` | ✅ | composition root:注入、按鈕/手勢綁定、開機閒置。rematchBtn 綁 `inspector.onRematchBtn`。 |

> **CLAUDE.md §6 開發順序第 1~5 步全部完成。** 一般戰、聖徒化、雙槍、監察官結算、Boss/亂入整條龍皆已接上並驗收。

---

## 二之二、全站通用系統(戰鬥／飛行共用,通則寫在 CLAUDE.md)

這幾套**不屬於任何單一模組**,兩個頁面都吃。改之前先讀對應的通則章節,
不要在其中一邊各寫一份。

| 系統 | 通則 | 實作 | 一句話 |
|---|---|---|---|
| 對白演出 | `CLAUDE.md` §6.5 | `modules/tutorial.js`(DOM)／`flight/index.html` 的 `castEnter`/`drawTalk`(canvas) | 站位、明暗、點擊推進、輪轉換卡全部共用一套語彙 |
| 立繪取景 | `CLAUDE.md` §6.5「取景」 | 同上 | **縮放鎖單眼寬、站位鎖身高**,兩個獨立旋鈕 |
| 畫質 | `CLAUDE.md` §6.5「畫質」 | 同上 | 畫布開到裝置像素(DPR≤2);縮小超過 2 倍要走逐次減半的預縮圖 |
| 音訊分層 | `CLAUDE.md` §6.6 | `config.js` 的 `tuning.*Gain`／`audio.js` | 語音 −18／音效 −22／音樂 −28 LUFS |
| 語音鏈 | `CLAUDE.md` §6.6「耳機對了不代表手機對了」 | `tuning.voiceChain` → `SFX.playVoice` | 手機喇叭 600Hz 以下不發聲,語音層要**量兩次**才知道對不對 |
| 讀取畫面 | — | `main.js` 的 `#assetLoader`／`flight/index.html` 的 `bootUI` | 圈內字樣一律 SAINT INSTALL;監察官對話框＋Hint 輪播**有**;底部「載入中／點擊繼續」**沒有** |

⚠ 讀取畫面有**兩份**(`#assetLoader` 與 `#boot`),`-229` 撤字、`-251` 放回的時候
都各改過一次 —— 只改一邊的話 Ray 會在另一邊看到舊行為(這次就是這樣被抓到的)。

⚠ 量測工具:`tools/audio_probe.html`(響度,含手機喇叭模型)。瀏覽器開,
WebAudio 解碼所以 mp3/m4a/wav 通吃。改 `voiceChain` 或增益就要重跑一次。

---

## 三、Git · 關鍵 commit

**近期(全站/飛行)**
- **HEAD**:`52c07d8` fix(flight):聖王廳地板的水平切線、遭遇不再看得見才算、探索改一次 30 秒 — `-252`。
- `36da648` feat(flight):立繪放大、讀取畫面的監察官說明放回、**畫質自適應** — `-251`。
- `96f10c8` fix(audio):語音在手機外放上「糊」— **語音鏈** + 增益改對耳機／手機的平均響度 — `-250`。
- `8fa967d` fix(flight):立繪的尺與畫質 — **眼寬定縮放、身高定站位**;畫布開到裝置像素 — `-249`。
- `c90c94e` refactor(audio):全域響度重訂三層 — 語音 −18／音效 −22／音樂 −28 LUFS — `-243`。
- `3586b34` refactor:全站音訊集中到 `resources/audio/{bgm,se,vo}` 並統一命名 — `-240`。

**戰鬥模組(第 1~5 步)**
- `9dc6db6` enemy:Boss/亂入接實體—triggerIntruder(S 解鎖→迎擊→槍之魔女 witch)。
- `2f244e4` docs(HANDOFF):回寫進度(partner/weapon/inspector 三輪完成)。
- `3ddaece` docs(SPEC):§4 修正 rank 規則制、tiers 為休眠 config。
- `8af9453` inspector:評價(規則制 rank+EXP)/監察官結算演出/最佳成績雙存檔/迎擊分流。
- `772d0be` weapon:雙槍破防獎勵窗口 + 換裝面板收尾。
- `a58fe81` partner:主動技通用框架(單槽 + 情境標註)+ 被動 cut-in 讀 config。
- `c3e1879` partner:即死防禦(deathGuard)接上致死鏈,一場一次鎖 1 HP。
- `090ba5a` balance(saint):saintComboStep 0.5→1.0(D4)。

### 備註 · DECISIONS 與 SPEC 修正
- `DECISIONS.md` 已含 **D1~D4**(刻意偏離)。
- **SPEC §4 評價已修正為規則制 rank**(逆向誤述修正,非刻意偏離,不入 DECISIONS)。
- **SPEC §三 已補「戰鬥層級模型(場/局/敵/盤)」**:結束一敵唯一靠 `hp` 歸零→overkill→清盤即 win;`boards[0..4]` 是前五盤參數模板、非結束條件,越界循環沿用第 5 盤參數。舊「一場=五盤」為誤述,已修正。
- **Boss 亂入＝重開新場**(場/局/敵/盤 模型):`startIntruderFight` 做完整重置(playerHp 滿血、deathGuardUsed 歸零)。觀察上與 reference 等價(S 解鎖前提無傷),**照原意加程式註解即可,不記 DECISIONS(無 D5)**。

---

## 四、下一輪:CLAUDE.md §6 第 6 步 — 全流程 ACCEPTANCE 對照 reference 收尾

前 1~5 步功能皆已接上。第 6 步為**收尾驗收**:建 `ACCEPTANCE.md` 把 CLAUDE.md §6 驗收流程的關鍵手感點列成勾選清單,於 390×844 對照 `reference/index.html` 逐項打勾。重點覆蓋:
- 聖徒化推進手感(受擊 +1s / 格擋 +0.5s / 免傷不推進 / 無受擊 10s 回滿)。
- 三級防禦門檻(0.35 / 0.12 兩界線)、散彈 Perfect 改傷、狙擊無 Perfect 帶。
- cut-in 後敵照常發動(v18c 取消緩衝)、聖徒化期間大絕更密集。
- Boss 雙發大絕(間隔 1s、2~4s 頻率)、延時懲罰半傷減 1 秒、全彈痕。
- combo 傷害斜率、MaxBurst 追加 20% 總傷(D4/D2 差異)、評價 S 解鎖亂入。
- 場/局/敵/盤:一敵靠 hp 歸零結束、越界循環出盤、Boss=重開新場。

> 連戰 `lineup`(局層,一場多敵)目前預留未接;若日後要接,屬 combat/enemy 的「敵死→下一敵」串接,與本次 Boss 亂入(重開新場)不同層級。

---

## 五、線上功能(本次不實作,state 已預留備忘)

- **Ghost 對戰**:只記每盤點擊頻率(5 數字),對戰生成槍聲+隨機彈孔,無聖徒化/無雙槍,純舒爾特五戰三勝取兩盤,不重播輸入軌跡。
- **排行榜**:各關卡完成秒數(有聖徒化有雙槍),秒數決勝。
- 共用零維運後端(Supabase 類),不做防作弊。順序:前端假榜 → 自我 ghost → 接後端,每階段可獨立出貨。

---

## 六、工作慣例(照做)

- **驗收**:app 內建 Browser(`mcp__Claude_Browser__*`)在 **390×844** 跑;模組化須經 http(`python -m http.server <port> --bind 127.0.0.1`,在 `TIVOT/` 下)。ES module 有快取 → **每次驗收換新 port**。
- **測試 hook**:驗收時可在 `main.js` 暫掛 `window.__T = {…}` 供 `javascript_tool` 驅動內部函式 / 讀 state;**commit 前務必移除**、乾淨重載確認 `typeof window.__T==='undefined'`。
- 敵立繪那幾個 404 是既有外部路徑 fallback,正常、與改動無關。
- **版本號**:**每個 commit 都升** `config.js` 的 `VERSION`(`ver YYYY.MM.DD-NN`,NN 連號),
  包含只動 `flight/` 的 commit。序號與 commit 訊息末尾的 `— ver -NN` 對齊。
  ⚠ -128~-170 那段 flight-only 的 commit 沒升,HUD 版本號卡在 -127,Ray 在手機上
  無從判斷拿到的是不是新版;-171 起補齊對齊。
- **commit**:每模組完成即 commit,訊息末尾加
  `Co-Authored-By: Claude Opus <n> <noreply@anthropic.com>`(`<n>` 寫**當下實際在跑的
  模型版本**,不要照抄本檔 —— `-249` 起是 Opus 5)。
- 刻意偏離 reference 才寫 `DECISIONS.md`;照 reference 一致的不寫;逆向誤述的修正(如 SPEC §4、戰鬥層級模型)不入 DECISIONS。
- 語言:與使用者用**繁體中文**溝通。

---

# 交接 · `ver -288~-295`（主線腳本系統、存讀檔、立繪站位；飛行頁見 `flight/HANDOFF.md`）

## 一、新增的子系統：主線 scene 播放器 ＋ 劇情層存讀檔

依 `docs/TIVOT_SCRIPT_ARCHITECTURE.md`（Ray 提供，ver -326 歸檔）建的第一層。

| 檔案 | 內容 |
|---|---|
| `script/speakers.js` | 角色表（§2）。監察官正名前後當兩個 id：`OFFICER` / `RENNA`。附立繪取景實測值，與 `flight` 的 `PORTRAIT` **同一組數字，改一邊要改兩邊**。 |
| `script/progress.js` | stage / flags / 好感 / 玩家名。**與 flight 共用同一組 localStorage 鑰匙**。 |
| `script/mainScript.js` | scene 鏈。⚠ 目前是**佔位示範內容**，正式開稿時整段刪掉重寫。 |
| `modules/story.js` | scene 播放器（首頁 `story` 鈕，管理人限定）。 |
| `modules/save.js` | F4 即時存／F7 即時讀／F5 選欄存／F8 選欄讀，10 列一頁、超出增頁。 |

⚠ **`RENNA` 不是 `REGINE`**：ver -262 已全面更名，`Regine` 是本名、隊伍中喊 `Renna`。
⚠⚠ **蕾娜 Renna ≠ 蕾妮 Renee**。Renee 是戰鬥搭檔（`config.js` 的 `partners.renee`）。
⚠ F5 是瀏覽器重新整理鍵，必須 `preventDefault`；F 鍵只在 `body.testmode` 下受理。
⚠ macOS 預設把 F 鍵當系統功能鍵，要壓 fn。手機沒有 F 鍵 —— 面板本身可觸控，
  之後在 UI 上補入口即可，不必另寫一套。

**取景踩到的兩個坑**（都照 CLAUDE.md §6.5 修正，flight 版也適用）：
- 輪廓**只能量看得見的那一段**。整張圖量會把散髮/裙襬算進去，夾中線時直接把人
  推出畫面。
- 縮小後不該再把頭頂釘在頂線，改成**腳落地平線**（那本來就是 §6.5 的目標）。

表情差分與 CG 素材尚不存在 → 自動回退基本立繪並在 console 記一筆，
**那串紀錄就是「還缺哪些圖」的清單**。

## 二、立繪站位：發起位制試過又退回，定案固定 2/2 分邊

    右　索拉娜・安雅　　　左　蕾娜・諾薇兒

`side` 寫在角色資料裡，不隨台詞變動。⚠ ver -288 曾改成「發起人站右」，**已退回**——
退回的原因不是規則不好，是**素材做不到**：立繪朝向是畫死的，換邊必須水平翻轉，
而翻轉會把髮旋、配件、持物全部左右顛倒（實測蕾娜的板夾會換手）。

正解是**同一個角色畫左右兩版圖**（Ray 判斷）。欄位已備妥：`ART[].alt` / `PORTRAIT[].alt`，
四人皆 `null`。⚠⚠ 補圖時 **eye/fx/top/bot 四個值全部要重量** —— 那是那一張圖的
數字，不同的畫不可能沿用。目前沒有程式路徑會用到 `alt`，它是留給日後的接口。

⚠ **已知後果**：stage 1 只有蕾娜＋諾薇兒，兩人都在左邊 → **整個第一章的對話畫面上
只會有一個人**（實測確認）。現有 24 組閒聊不受影響（都是三、四人）。
要解就是先補其中一人的 `alt` 圖，或把諾薇兒改到右邊（但右側就變三人輪）。

## 三、飛行頁「進度」鈕（管理人限定）

操作盤右上，顯示 stage、主角名、四人好感與 tier（含「未入隊」）、本章可播閒聊組數。
⚠ 管理人限定是**刻意的**：ARCHITECTURE §0.5 明訂**好感度不可視化**，
玩家端要靠獨坐出場順序、敲門安全感、稱呼變化去感知。
⚠ 唯讀。改值走既有的 `setStage` / `setAff` —— 好感是棘輪制，隨手可點會弄髒測試狀態。

## 四、⚠ 工作方法上的修正（這一輪最貴的教訓）

聖王廳廣場破圖我連改十幾次沒有一次改善，原因是**用靜止截圖找一個移動才出現的問題**。
細節見 `flight/HANDOFF.md` 的 `-290~-295` A/B 兩節。兩條規則：

1. **使用者說「破圖」時先問「靜止時有嗎？」** 靜態破洞與移動抖動是兩類病，修法沒有交集。
2. **不要拿糊掉的小圖下結論。** 390×844 的截圖裡城只有一兩百像素寬還被面板遮住，
   據此說「看起來正常」等於唬人。要看細節先 `resize_window` 開到 1000×1450。
3. **只認量測。** 任何改動都要有改前／改後的數字；量不出改善的**退掉**，不要留在
   程式裡。這一輪就是這樣退掉了三條無效的修法（見 flight/HANDOFF.md D 節）。

## 五、待辦（明天）

1. ~~`TIVOT_SCRIPT_ARCHITECTURE.md` 歸檔到 `docs/`~~ —— **ver -326 完成**。
   內文一字未改，檔頭補了「已實裝／還沒接」對照表。
2. **`TALKS[1]→[3]` 搬遷** ＋ `PARTY` 填真正的入隊章節（安雅 `from:2`、索拉娜 `from:3`）。
   ⚠ Ray 已確認：**stage 1 的閒聊只有蕾娜＋諾薇兒且還沒寫，現有 24 組全部是 stage 3 的**。
   ⚠ 語義保留現行的「**起始章節**」（第 N 組＝第 N 章起可播），不要改成精確匹配 ——
   Ray：「第 1 章的日常閒聊後面還是可以聊，不要做死，因為 stage 本身也連動角色間的
   熟悉度與化學作用」。而且他是**依 stage 分組寫稿**的，群組結構要留著。
3. `stash@{0}`（launch.json，本機 `python3` vs 遠端 `python`）—— 確認哪個可用後 drop。
4. 未追蹤的 `NPC/`、`resources/illustration/` —— 進版控還是進 `.gitignore`。
5. 抖動的殘量（見 `flight/HANDOFF.md` D 節「還沒查的」）。

---

# 交接 · `ver -315`（劇情播放器擴充：背景／CG／暗調 CI／音效／震動／平移；地宮第一幕）

## A. story.js 新增的「演出層」

line 上的演出欄位，全部**只寫變化**（省略＝沿用上一句）：

    bg:'HolyseeDungeonWhole'   背景（resources/background/*.webp），bg:null 清掉
    cg:'001_Nouvelle_Fell'     全屏插圖（resources/illustration/*.webp），cg:null 清掉
    cgPan:'up'                 這一句的 CG 由下往上平移
    ci:'Lunaria_SI_Armed'      暗調 CI 插入（resources/SI/*.webp），ci:null 收掉
    bgm:'crisis'               背景音樂（BGM_SRC 查表），bgm:null 停掉
    se:'se_steps'              音效；多發寫成 [{n:'x'},{n:'x',delay:500}]
    shake:true                 畫面抖一下
    fx:'gunfire'               在 CG 上灑一串槍擊命中點

- ⚠ **持續**（bg/cg/ci）與**一次性**（se/shake/fx）分成 `applyPersist` 與
  `fireOneShot` 兩支處理。混在一起寫會很難讀，而且一次性的容易被誤沿用。
- ⚠ **平移每次都要先移除 class 再加**：同一個 class 還在的話 animation 不會
  重新開始，第二次就不會播。`void el.offsetWidth` 那一行是刻意的。
- ⚠ **音效逐支列出實際路徑**（`SE_SRC`），不要拼副檔名 —— `resources/audio/se/`
  裡 wav／mp3／m4a 三種都有，拼錯會**靜默 404**（audio.js 載不到只 resolve(null)，
  不會報錯，你會以為是音量問題）。
- ⚠ CG 用 `object-fit:cover` 不是 contain：插圖與畫面都是直幅，contain 會上下
  留黑邊，讀起來像「貼了一張圖」而不是「鏡頭切過去」。
- ⚠ 暗調 CI 的壓暗用 `filter` 不用 `opacity`（CLAUDE.md §6.5：壓暗必須不透明）。

## B. 地宮第一幕（`dungeon_chase` → `dungeon_lunaria`）

Ray 的第一段正式稿。逐句驗過：背景／跑姿／腳步聲 → 跌倒插圖 → 上膛 ×2（隔
0.5 秒）→ 戰鬥插入點（跳過）→ 聖徒插圖 → 暗調 CI「讓開。」→ 槍擊 26 發＋抖動
→ 回地宮 → 璐娜莉亞插畫由下往上平移 → 結束交還控制權。

## C. ⚠ 三個待補，不要當成完成品

1. **諾薇兒的五張表情差分是「不同姿勢」不是換臉** —— `top/bot/fx` 還沒逐張量，
   目前沿用 front 那一組，人會偏。要照 CLAUDE.md §6.5 逐張重量，而且 `ART` 現在
   一個角色只有一組取景，屆時要擴成 **expr 各自帶自己的取景**。
2. **彈殼落地音沒有這個素材**。原稿指定了，`resources/audio/se/` 裡沒有。
   我在密集槍擊那一拍暫用 `se_mg_squall`（重機槍連射），那是**我加的**，待確認。
3. **戰鬥沒接線**。`{battle:'tutorial'}` 目前由 story.js 跳過並記 console。
4. ⚠ `Nouvelle_SI_front.webp` 這次被**重新轉檔**了 —— Ray 放了一張新的
   `Nouvelle_SI_front.png` 進來。如果那張畫有改構圖，`speakers.js` 與
   `flight/index.html` 兩邊的 `top/bot/fx` 都要重量（同一組數字、兩個地方）。

⚠ `MAIN_ENTRY` 暫時指到 `dungeon_chase` 方便驗這一幕，正式串主線要改回
  `prologue_audience` 或把地宮段接進鏈裡。

---

# 交接 · `ver -316`（劇情版面定案；重進卡圖修掉）

## A. 版面：上半立繪、下半固定戰鬥盤面（Ray 指定）

    #storyStage{ --story-top:56%; }      ← 比例只寫在這一個地方

所有**場景層**（背景／CG／暗調 CI／特效／情境卡／立繪）都只佔上半；下半是
`#storyBoard`，無戰鬥時放團徽當佔位。

⚠ **版面不能因為有沒有戰鬥而變高變矮** —— 那會讓立繪的大小與站位每一幕都跳。
  接真的戰鬥盤面時只改 `--story-top` 與 `#storyBoard` 的內容，其餘不動。
⚠ `layout()` 的高度要取 **`#storyCast` 的高**，不是整個舞台 —— 拿舞台高去算的話
  人會被畫到盤面底下，而且「腳落地平線」那條規則會落在錯的地方。
⚠ 對話框錨在**立繪區下緣**（盤面之上），不是畫面底：盤面是固定的，框壓上去會
  擋住戰鬥資訊。

## B. 立繪規則（與飛行畫面同一套）

- **單人也站自己那一側**，不置中（Ray 指定「同一人物立繪需一直在同一側」）。
  置中的話同一個人會因為場上有幾個人而左右跳，那正是固定站位要解決的事。
  單人時錨點往中間讓一點（0.38／0.62），畫面才不會太偏；且**單人不夾中線**
  （夾了會把她壓回半邊，人變小又擠在角落）。
- **同一個人換表情／換圖 → 淡入淡出**；**同側換人 → 滑出滑入**（輪轉換卡，
  比照飛行畫面）。⚠ 只換表情卻走滑動的話，讀起來是「她走掉又走回來」。
- **插圖之間也淡入淡出**。第一次上圖直接顯示 —— 先淡出會有一段莫名的空白。
- `CAST_SHOW` 0.52 → **0.44**（Ray：「人物高度高放一點」）。這個值是「最高的人
  露出身體的幾成」，**越小＝鏡頭越近＝人越大、頭頂越高**。上半舞台變矮之後
  不調的話人會顯得又小又低。

## C. ⚠ 重進劇情卡在上一次的畫面（已修）

Bug：第二次點 story 會卡在上一輪的結束畫面。原因是 `stageBg/stageCg/stageCi/
stageBgm` 是**模組級狀態**，關閉時沒清；重開時第一句只寫了 `bg` 沒寫 `cg`，
於是上一輪最後那張插圖一直蓋在上面。

修法：`resetStage()`，在 **`open()`** 呼叫。
⚠ **不能放在 `playScene()`** —— scene 之間是接續的，`bg` 要能跨場沿用，
  每次 playScene 都清的話換場會閃一下黑。

## D. 新增：情境卡 `card:'…'`

背景之上蓋半透黑、文字置中；有 `card` 的那一句**不顯示對話框**（它不是台詞）。
⚠ 腳本裡用 `\n` 斷行，CSS 要 `white-space:pre-line`，否則擠成一行。
⚠ 卡片那一句要明寫 `portrait:{show:false}` —— 立繪預設是 `show:true`，
  不寫的話人會先用 base 立繪站在卡片後面，下一句才換成該有的姿勢，看起來像閃了一下。

## E. 其他（Ray 指定）

- 槍擊改成**機關槍掃射**：沿一條斜線由一端掃到另一端、44 發、**兩秒**，火花放大
  （16px＋外光暈，逐發大小有差）。⚠ 不是隨機灑點 —— 隨機讀起來是一片斑點，
  沿線推進才讀得出「掃過去」。音效改用 `se_lunaMG`。
- **離開劇情要把主畫面的 BGM 接回來**。劇情有自己的曲子，而首頁的播放邏輯只在
  「進首頁」那一刻跑一次，不會自己修正。

---

# 交接 · `ver -317`（抖動只抖場景層；「啊！」加音效）

## ⚠ 抖動的作用對象：**場景各層**，不是整個舞台

Ray：「這一禎要畫面抖動，**對話框不要抖**」。抖整個 `#storyStage` 會連對話框
一起晃，字在跳的框裡很難讀。

改成逐層指定：

    #storyStage.shake #storyBg,  #storyCast, #storyCg,
                      #storyCi,  #storyFx,   #storyCard, #storyBoard { animation: storyShake … }

⚠ **新增場景層時要記得加進這個選擇器清單。** 漏了那一層就不會跟著抖，畫面會
分成「抖的」與「不抖的」兩半 —— 比整個不抖還糟。

## 這一輪順手修掉的

`-316` 把 `se_lunaMG` 加進 `SE_SRC` 了，但**腳本那一行忘了改**，掃射還在放
`se_mg_squall`。現在照 Ray 指定改成 `se_lunaMG`。
⚠ 教訓：加素材與**用素材**是兩個地方，加完要回頭確認腳本真的指過去。

新增 `se_Fall`（跌倒），掛在「啊！」那一拍，與抖動同一句。

---

# 交接 · `ver -318`（插圖平移雙向；抖動殘留修掉）

- `cgPan` 支援 `'up'`／`'down'`。插圖一號改成由上往下平移（Ray 指定）。
- 「那就是......聖約第四騎士團的......」台詞照 Ray 的新稿。

## ⚠⚠ 抖動的 class **跑完要拿掉**（Ray：「最後一格不要抖」）

`-317` 把抖動改成逐層之後，`shake` 這個 class 一直留在 `#storyStage` 上沒清。
那些場景層只要**重新顯示**（插圖換圖是 `display:none→block`）animation 就會
**再跑一次** —— 所以最後一格明明沒寫 `shake`，插圖一上來還是抖了一下。

修法：觸發後 460ms 用 timer 把 class 移除（`st.__shakeT`，重觸發時先 clear）。

⚠ 這是「一次性效果用 class 實作」的通病：**class 是狀態，動畫是事件**。
  用 class 觸發動畫就一定要自己負責把它清掉，否則任何會讓元素重新進入排版的
  操作都會把動畫再放一次。日後加新的一次性效果照這條辦。

---

# 交接 · `ver -319`（璐娜莉亞改走正規立繪；插圖蓋住立繪的坑；平移／延遲）

## A. ⚠⚠ 「立繪一直沒出來」的真因：**插圖蓋在立繪上面**

Ray 回報「『對不起，我已經……！』的立繪一直沒出來」。查下來**不是位置問題**：
`#storyCg`（z-index 2）在 `#storyCast`（z-index 1）**之上**，那一句插圖 002 還在，
人整個被蓋住。

⚠ **凡是要看到立繪的句子，插圖都得先 `cg:null` 讓開。** 這件事在腳本上不明顯
（你只會看到「我明明指定了立繪」），所以每一句都要想一下「現在畫面上有沒有插圖」。

## B. 璐娜莉亞：從「全屏 CI」改成**正規立繪**

Ray：「她的比例明顯與諾薇兒不同，戰鬥中的對話立繪版面分配一概比照飛行畫面」。

CI 那條路是自己一套縮放（object-fit cover 到一個框），**比例對不上是必然的**。
改走立繪系統才會鎖身高、與諾薇兒同一把尺。實測 168cm vs 165cm → 417px vs 406px。

取景值是**量出來的**（照 CLAUDE.md §6.5 / HANDOFF F）：
- `cm 168`（Ray 指定）
- `top 9 / bot 1528` ＝ alpha 上下緣。⚠ 先確認過**四角 alpha 是 0、逐列輪廓寬由
  21% 變到 97%** —— 是去背立繪不是滿版插圖，所以 alpha 邊界就是頭頂與腳底。
  （這一步不能跳：滿版插圖照量會把人放大好幾倍。）
- `fx 0.496` —— 量**頭部那一段**（頭頂往下 8% 圖高）的 alpha 中心得 0.483，
  再拿諾薇兒校準這把尺（同法量她得 0.551、表上 0.564，偏移 +0.013）。
- `eye` 沒量（`CAST_EYE_MIX=0` 不參與運算）。要改回混合模式前必須先量。

⚠ 順帶修掉一個坑：**沒有立繪資料的角色不准碰立繪槽**。`UNKNOWN` 原本 art 是
null，`artOf` 回 null 之後 side 退回 'L'，於是它去佔了左邊那個槽，把站在那裡的
諾薇兒**整個清掉**。現在 `ensureOn` 直接擋掉，`highlight` 也改成「說話者沒有
立繪時誰都不亮」。

## C. 新欄位

- `dark:true` —— 這一句的說話者立繪壓成暗調（剪影感，還沒表明身分）。
  ⚠ 每一句都要清一次：它是**句子屬性**不是角色屬性。
- `delay:2600` —— 對話框**先不出**，等這麼久再打字（等平移跑完，Ray 指定）。
  ⚠ 等待中點畫面要**跳過等待**而不是推到下一句 —— 不然玩家會覺得「點了沒反應」
    然後連點兩下，一次跳掉兩句。（同「還在打字時點一下先補完」的規矩。）
  ⚠ 2600 與 CSS 的平移時間同值，改一邊要改另一邊。

## D. 立繪位置

- 身高差的縱向讓位**只在兩人同台時**才做。它的用意是「腳落同一條地平線」，
  單人時沒有對象可對齊，那一段只是在頭頂空出一塊（實測空掉 62px）。
  改後頂端由 124 → 57。
- `cgPan` 方向要看構圖：001 是跌倒的圖，**由上往下會停在裙底**，往上才收在臉上。

---

# 交接 · `ver -320`（立繪尺寸定案：**一張圖只有一個大小**）

## A. 拿掉「依人數縮放」

Ray：「同一張立繪不可有兩個大小」「多少有些交疊沒關係」「立繪不要出全身，
以膝部以上為原則，不然細節看不清」。

舊作法：兩人同台時每人只有半屏，輪廓超出就**整體等比縮小**。三個後果：
1. 同一張圖**單人時大、兩人時小**，換場就跳一下。
2. 縮到最後**全身都出來**，臉只剩幾十像素 —— 就是「細節看不清」。
3. 還有一道「把輪廓拉回畫面內」的夾制排在「夾中線」**之後**，方向相反、
   後者會贏 —— 兩個人被一起推回中間**疊在一起**（實測重疊 197px，
   璐娜莉亞的頭髮蓋掉諾薇兒半個人）。

現在：`pxCm` 只由 `CAST_SHOW`（0.56）與畫面高決定，是個**常數**。
→ 同一張圖永遠同一個大小（實測諾薇兒每一幀都是 731px，以前在 406~568 之間跳）。
外緣讓它出畫面（`#storyCast` 有 `overflow:hidden`，裁掉的是裙襬與頭髮的邊，不是臉）。

## B. ⚠ 不要改成鎖「耳朵／眼睛」

Ray 提過用耳朵大小鎖。**不要走這條** —— 專案已經踩過同一個坑（`flight/HANDOFF.md`
F 節）：鎖眼寬會把**畫風差異放大成體型差異**。實測索拉娜眼睛被畫小 → 整個人放大
13%（螢幕身高比 1.249 vs 真實身高比 1.107），Ray 當時回報「索拉娜太巨大」。
耳朵是同一類臉部特徵，會重演。

**尺要鎖身高** —— 那是角色的客觀屬性，不隨畫風跑。真正的病根不是「鎖什麼」，
是「會依場上人數動態縮放」，那已經拿掉了。

## C. 新欄位 `hide`

`portrait` 一句只能指定一個人，要**同時**讓另一個人退場就用 `hide:'UNKNOWN'`
（或陣列）。立繪是**持續狀態**，不明寫的話上一句站上來的人會一直留著。
⚠ 要在 `ensureOn` 之前處理：同側換人時先清掉舊的，新的才會走「首次上場滑入」
而不是「輪轉換卡」。

---

# 交接 · `ver -321`（劇情插入戰鬥；劇情專用預載頁；兩種教學分開）

## A. 劇情 → 戰鬥 → 回劇情

`{battle:'tutorial'}` 現在真的會發動教學戰，打完接回劇情的下一句。

- ⚠ **story.js 不 import 戰鬥模組**（單向資料流：劇情不該知道戰鬥怎麼跑）。
  改由 `story.setBattleHandler(fn)` 讓 main.js 注入發動器，回程也由 main.js 負責。
- ⚠ 交棒前要**先收掉舞台**，否則劇情層（z-index 8300）會蓋住戰鬥畫面。
- ⚠ 收掉時**不要接回首頁 BGM**（`close({keepBgm:true})`）—— 戰鬥有自己的曲子。
- **「什麼時候算打完」不看戰鬥模組的內部狀態**，看**首頁重新出現**（`#home.on`）：
  勝、敗、跳過、退出確認回主選單，所有出口都經過那裡，一個訊號涵蓋全部。
- ⚠⚠ 觀察器要**先離開過首頁才武裝**。發動的當下首頁本來就是 `.on`，不設這道的話
  任何一次 class 變動都會被當成「打完回來了」，劇情會在戰鬥還沒開始就蓋回去
  （實測就是這樣，第一版直接跳過整場戰鬥）。
- 回來時 `open(resume)` 不再擋預載頁 —— 圖上一輪已經抓過，再擋只是多一個黑畫面。

## B. 劇情專用預載頁（Ray 指定）

點 story → 自己的預載頁 → 播。
- ⚠ **不併進遊戲開機那個預載**：劇情素材是插圖與背景，一張上百 KB，全塞進開機
  會把首頁等待拉長，而多數玩家點進去是要出陣不是看劇情。代價只落在要看劇情的人身上。
- ⚠ 走**整條 scene 鏈**掃（跟著 `next` 走），不是只掃第一段 —— 中途才換的插圖
  若沒先抓，切過去那一刻會是空白（圖是 `display:block` 之後才開始下載）。
- ⚠ 保底 8 秒：慢網不要把人卡在預載頁，沒載完的用到時自己補。

## C. 兩種教學分開（Ray 指定）

`tutorial.requestReplay({story:true})` → `tutorial.isStoryRun()`。
**ver -323 起台詞也分**（見下方 -323 交接）。
⚠ 兩者都不動「已看過」旗標（`requestReplay` 本來就不動），所以劇情跑過教學
不會讓首次出陣的自動教學消失。

---

# 交接 · `ver -322`（教學打完回到故事開頭；同角色換圖會疊影）

## A. ⚠⚠ 打完教學回到**故事開頭**（Ray 回報）

`resume` 是 `{scene, line: lineIdx+1}`。而戰鬥那一句是 `dungeon_chase` 的
**最後一句**，所以 resume 的 line **剛好等於 `lines.length`**。
舊寫法用 `pos.line < cur.lines.length` 擋掉越界 → 條件不成立 → 停在第 0 句。

正解：**超出就走 `next` 接下一段**（那本來就是 `endScene` 的行為）。

⚠ 這一類「剛好等於長度」的邊界很容易漏：`{battle:…}` 放在段中間時完全正常，
只有放在**段尾**才會炸。日後任何「存位置／回位置」的機制都要想一下段尾那一格。

## B. ⚠⚠ 同一角色換圖會**疊影**（Ray：「淡入淡出時不可重疊」）

淡出是 CSS transition（180ms），但**載圖是非同步的**。舊寫法在 190ms 時
`apply(); el.classList.remove('fading');` —— 移除 class 的那一瞬間元素上還是
**舊圖**（新圖還沒載完），於是**舊圖先淡回來、新圖才蓋上去**，看起來就是兩張疊在一起。

正解：`.fading` 要等**新圖 onload 之後**才拿掉。
⚠ 還要處理「新圖已在快取」的情況 —— 那時 `onload` 不會再觸發，要靠
`complete && naturalWidth` 這條退路（同 `ensureOn` 既有的作法）。


---

# 交接 · `ver -323`（劇情版教學：諾薇兒帶完整段）

Ray 手改過的稿在 `script/TUTORIAL_LINES_NOUVELLE.md`（**那份是母本**，
逐句附了表情差分）。這一版把它接進遊戲。

## A. 只換台詞，不換流程

`config.tutorial.story`（＝ `i18n/zh.js` 的 `tutorial.story`）是**整份平行的台詞**：
`steps` / `script` / `scold` / `result`。程式端只多了四個查表器（`modules/tutorial.js`）：

    storyCfg()               storyRun 且有 story 那份才回它，否則 null
    linesForStep(trigger)    steps 的 trigger → story.steps 的鍵
    scriptLines(key, 原本)   script.* 段落
    scoldCfg() / scoldLine() 插話（原版是監察官，劇情版是諾薇兒）

⚠ **觸發點、節奏、閘門、教的東西全部共用同一套程式碼**。教學的手感已經校過，
另寫一份必然走鐘 —— 日後要再加第三個版本（別的角色帶）也照這個方式加一份資料就好。

⚠ ja/en **沒有** story 那一份（中文母本層先定案，見 `flight/script/STYLE.md`）→
`storyCfg()` 回 null → 自動退回芙蕾雅／蕾妮那一份。是預期行為，不是漏翻。

## B. ⚠⚠ 左槽被搶：諾薇兒與芙蕾雅**同站左側**

`config.tutorial.cast` 現在有三個人，但畫面上只有**左右兩個 `<img>`**。
舊的 `openStep` / `syncCast` 是**逐角色**掃全表：

- `openStep` 逐角色寫 `el.src` → 字典順序在後的那個把真正的說話者蓋掉（連取景一起蓋錯）。
- `syncCast` 逐角色 `toggle('in')` → 沒講話的那位把講話那位的 `.in` 關掉。

**兩個都改成以「槽」為單位算**：先算出本段有誰講話（`used`），
`openStep` 只套 used 的人；`syncCast` 先把每個槽要不要亮算完再一次 toggle。
⚠ 這類 bug 的味道是「**結果取決於物件的鍵順序**」—— 看到這種就要停下來。

## C. 逐句表情差分 `img` 與全畫面 cut-in `cutin`

台詞多兩個選用欄位（都是 ASSETS 鍵）：

    { who:'nouvelle', img:'tut_nouvelle_cringe', text:'…' }
    { who:'nouvelle', img:'tut_nouvelle_saint', cutin:'cutin_nouvelle_saint', text:'SAINT INSTALL......！' }

- `img`：**直接換 src，不做淡入淡出**。同一角色同一槽的表情切換，淡出會讓她整個人
  消失一拍 —— 那是「換人」的語彙，不是「換表情」的（劇情頁的淡入淡出是**換人**用的）。
- `cutin`：**先演完 cut-in 再打字**。`#cutin` 是 z8100、對話框 z8000 ——
  同時跑的話字被蓋住白打了一整句。走 `api.playCutin(done,label,imgKey)` 的 done 回呼接打字機。
  ⚠ 用 `cutinLine` 記住已播過的索引：點擊「跳完整句」會重跑 `showLine` 的分支，
  沒這個游標會**重播一次 cut-in**。

## D. 劇情版**不出結算頁**（Ray 指定，對應表第八節整段刪除）

擋在 `inspector.settle` 的**最前面**（`state.tutorialStoryRun`），不是擋在
`applyTutorialResult` —— 擋在後面的話畫面會先閃一下評價再跳走。
擋掉之後 500ms `goHome()`，由 `main.js` 那個觀察器把劇情續下去。

⚠ **不能只是「不講台詞」**：結算頁停在畫面上就沒有人把劇情叫回來，玩家卡在那裡。

⚠ `tutorialStoryRun` 是新的共享狀態（§3.9，擁有者 tutorial），與 `tutorialRun` 同壽命：
`combat.startGame` 歸零、`maybeStart` 設回、`skip()` 清掉。
`maybeStart` 另外多一道 `if(!replayRequested) storyRun = false;` ——
不是被劇情叫起來的那一場（首次出陣自動教學）一定要是原版，否則旗標會漏到下一場。

## E. 實測（390×844，走完整條）

自動走了兩趟完整流程（劇情 → 教學 → 回劇情），逐句比對：

- 開場三句 → board1 → threat → defended → strike → dualReady/dualGo →
  **saintCall（`resources/CI/Nouvelle_SAINTINSTALL.webp` 全畫面 cut-in 確實播了）**
  → saintStart ×2 → finishMB，全部是諾薇兒、差分與對應表一致。
- 故意點錯格 → 插話「別慌……順序，慢慢來就好。」＋ Cringe 差分（不是監察官）。
- 打完**沒有出結算頁**，直接回首頁 → 劇情從「對不起，我已經……！」續下去到收場。

## F. ⚠ 還沒做：諾薇兒的差分**取景值沒有逐張量**

五張差分是**不同姿勢**（跑／畏縮／驚恐／絕望／驚訝／SAINT INSTALL），
現在共用 `config.tutorial.cast.nouvelle` 的一組 `fit`，換圖時人會上下跑一點。
正解照 CLAUDE.md §6.5：逐張量 top/bot/fx，`cast` 擴成「每張差分各帶自己的取景」。
劇情頁的 `script/speakers.js` 也有同一個 TODO（`ART.nouvelle.expr` 共用 front 的數字）。


---

# 交接 · `ver -324`（獨腳戲的說明立繪放大）

Ray：「把戰鬥中的說明立繪調大」。劇情版教學全程只有諾薇兒一個人，
卻還照著「兩個人要並排塞進 390 寬」那組尺寸縮 —— 全身入鏡、臉只剩四十幾像素。

## 作法：同一組取景放大，**頭頂釘在原處**

`modules/tutorial.js` 的 `applyPortraitFit()`。`config.tutorial.cast.fit`
（zoom/drop）一個字都沒動，只是獨腳戲時多乘一個 `portraitSoloScale`（現行 **1.8**），
並重算 `bottom` 讓頭頂 y 不變 —— 放大多出來的全部從**下面**溢出（裁腿，不裁頭）。

實測 390×844：立繪高 342 → **612 px**，頭頂 y 維持 105，畫面上看到的是頭到腰胯。

⚠ 算式走**像素**不走 %：`object-fit:contain` 下「元素高」與「圖高」只有在寬度
不吃緊時才相等，`height:%` 疊 `max-width:62%` 兩個限制同時在跑，很難算準頭頂落在哪。
放大時也要一併把 `max-width` 鬆綁（那是雙人版怕撞在一起的護欄），否則寬度先吃到上限、
高度就長不上去。

## ⚠⚠ solo 是「整場」的屬性，不是「這一段台上幾個人」

`computeSoloRun()` 在 `maybeStart` 掃**整份台詞**（steps＋script）的 `who`，
只有一個人才算獨腳戲。

逐段判會炸在原版教學：它的插話段（罵人）只有芙蕾雅一個人 → 她會在插話時忽然
放大 1.8 倍再縮回去，**同一張立繪出現兩個大小**（Ray 在劇情頁定過同一條規矩）。

⚠ 判定看**資料**不看 `storyRun` 旗標 —— 哪天再加第三份台詞（別的角色帶）也自動吃到。

## 沒動到的

原版教學（首頁「教學」鈕，芙蕾雅＋蕾妮）**尺寸完全不變** —— 實測比對過。
那組數字是 ver -45 手調到「兩人五官等大、身高差看得出來」的。


---

# 交接 · `ver -325`（劇情教學收短；戰鬥交棒切乾淨；插圖／背景淡入淡出）

Ray 一次交代六件事，逐項記。

## A. 劇情教學**不可跳過**、**教到破防為止**

- 跳過鈕只在**非劇情場**掛 `.on`（`maybeStart`）。劇情教學是主線的一段，
  跳掉之後下一幕接的是「打完了」，接不下去。
- `maybeStart` 在劇情場**濾掉 `strike` 這一步**。整條
  「劇情殺三連擊 → 即死防禦 → 聖徒化 → MB／生命歸還」都是掛在
  `onStepClosed('strike')` 上的，拿掉那一步等於整條鏈都不會發生。
  ⚠ 不要改成「不講 saintCall 的台詞」—— 流程照跑，玩家會卡在沒有引導的閘門。
- 收尾改成：`dualGo` 收段 → 旗標 `awaitDualEnd` → **下一盤載入**那一刻
  封頂敵血 ＋ 講 `finishLR`「撐過來了……收拾他吧！」→ `endTutorial`。
  ⚠ 掛「下一盤載入」不掛「雙槍窗口關閉」：窗口會因清盤／敵死／逾時好幾種原因關掉，
    只有載新盤才真的代表這一輪打完。
  ⚠ 用 `finishLR` 不用 `finishMB` —— MB 那句寫的是「體力也回來一些了」，
    沒有聖徒化就沒有回血，講出來對不上畫面。
- ⚠ `ultSuppressed` 裡「第四盤 && 沒用過聖徒化 → 壓制大絕」那條要加 `!storyRun`：
  劇情版永遠沒用過聖徒化，不加的話第四盤起敵人再也不出手。

## B. ⚠⚠ 劇情插入的戰鬥**不再走收尾流程**

Ray：「教學打完會先進評價一瞬間（BGM）才繼續跑劇情，切乾淨。」

舊作法是 `main.js` 用 MutationObserver 盯 `#home.on`，等於
**先走完整條收尾流程回到首頁，再把劇情蓋上去** —— 那條路上有「驅逐完成」過渡禎
（要點一下）、結算 BGM、評價頁、主選單，全部會閃過去。

現在：`combat` 的 `win()` / `lose()` **第一件事**就是 `storyBattleEnd()` ——
`state.tutorialStoryRun` 為真就直接回呼 `setStoryReturn` 註冊的函式並 return，
整條結算流程根本不執行。`main.js` 收到回呼後走
`combat.goHome(()=>story.open(resume), {noBgm:true})`：

- 首頁確實會被還原，但那是在 `fadeTransition` 的**黑幕全蓋瞬間**，
  劇情在同一刻蓋上去，畫面上看不到首頁。
- `noBgm` 讓主選單 BGM 不起播 —— 不然交棒那一秒會漏出半句主選單的曲子。

⚠ **勝負都要接**。教學的即死防禦讓戰敗幾乎不可能，但收尾台詞之後盤面是交還玩家的，
那一段真的會死 —— 沒接的話會卡在戰敗結算頁，劇情永遠回不來。

⚠ `inspector.settle` 開頭那道 `tutorialStoryRun` 現在**正常走不到**，留著當保險：
哪天多開一條通往 settle 的路，也不會突然冒出一頁評價。

## C. 插圖可以當背景用；背景／插圖都淡入淡出

- `story.js` 的 `imgSrc()`：名字是 `NNN_` 開頭就去 `illustration/`，
  否則去 `background/`。腳本裡照樣只寫一個名字。
  （Ray：「『對不起，我已經…』的背景是插圖002」—— 插圖收掉不等於回地宮，
  聖徒撲上來那張要留在她背後當場景，只是要退到立繪之下才看得到她。）
- `swapImg()` 取代原本的 `setImg`＋手寫淡出：淡出 → **等新圖 onload** → 淡入。
  ⚠ 等 onload 是關鍵，理由同 ver -322 的立繪：不等的話舊圖會先淡回來再被蓋掉，
    看起來是兩張疊在一起。快取命中時 onload 不觸發，要靠 `complete && naturalWidth`。
  ⚠ `#storyBg` 的 CSS transition 時間要與 `FADE_MS` 同值，改一邊要改另一邊。

## D. ⚠⚠ 兩人同台不再夾中線；諾薇兒的差分**逐張量了取景**

Ray：「璐娜登場時兩人的對話立繪都太靠畫面邊緣。」兩個原因疊在一起：

1. **夾中線**（輪廓不准越過中線，越了往外推）。這些立繪的輪廓都比半個畫面寬，
   於是每次都推到底，兩人各自貼著左右邊緣，臉有一半被 `#storyCast` 裁掉。
   → 拿掉，錨點由 0.26／0.74 收到 **0.34／0.66**。臉的位置從此可預期。
   代價是輪廓會在中間交疊 —— Ray 早就定過「多少有些交疊沒關係」，
   交疊的是裙襬與頭髮的邊，臉各自在自己那 1/3 處。
   ⚠ 不要再加「把輪廓拉回畫面內」那道（ver -320 踩過）：方向與錨點相反，
     排在後面會贏，兩個人會被一起推回中間疊成一團（實測重疊 197px）。
2. **差分沿用 front 的取景**（-323 就記過的 TODO）。諾薇兒的差分是不同姿勢，
   臉的橫向位置差很多：front 0.564、Scared **0.397**。照 front 擺會把她往左推
   77px —— 那才是她貼著左緣的主因。

現在 `speakers.js` 的 `expr` 可以寫成 `{src, top, bot, fx}` 自帶取景
（字串形式仍支援），排版一律走新的 `frameOf(id, expr)`。
`story.js` 多記一個 `slotExpr`，因為排版要知道**這一槽現在用的是哪張圖**。

量法（可重跑，見 `speakers.js` 的註解）：`top/bot` = alpha>24 的上下緣；
`fx` = 頭頂往下 8% 身高那一段的 alpha 加權橫向重心 ÷ 圖寬。
校準：同法量 front 得 0.571（表上 0.564）、璐娜莉亞得 0.494（表上 0.496）——
兩個獨立校準都落在 ±0.007 內，所以直接採用量到的值。

## E. 實測（390×844）

自動走完整條：劇情 → 教學（諾薇兒帶、跳過鈕不出現）→ 破防那一盤打完 →
「撐過來了……收拾他吧！」→ 殺敵 → **結算頁完全沒出現**（程式監看 `#result.on`
全程為空）→ 劇情從「對不起，我已經……！」續下去（背景是插圖 002）→
璐娜登場兩人的臉各在 1/3 與 2/3 處 → 跑到收場。


---

# 交接 · `ver -326`（教學立繪逐張取景；雜項歸位）

## A. ⚠⚠ 教學的說明立繪：把**臉**釘住，不是把**圖框**釘住

CSS 只會把圖框貼齊左緣（`left:-2%`）。但諾薇兒的表情差分是不同姿勢，
臉在圖上的橫向位置從 **0.397（Scared）到 0.564（front）** 都有 ——
圖框對齊 ≠ 臉對齊，實測相鄰兩句臉會位移 **71px**（390 寬、立繪 408 寬）。
讀起來像鏡頭在抖，不像換表情。

`modules/tutorial.js` 的 `placePortraitX()`：依取景值算出 `width` 與 `left`，
讓臉一定落在 `portraitFaceX`（0.44×框寬）。換圖時呼叫兩次 ——
先用規格比例（1024×1536）排一次不等載入（不閃），`onload` 後再排一次修正真實比例。

⚠ 查不到取景值就把 `width/left/right` 還原給 CSS（芙蕾雅／蕾妮沒量過，行為不變）。
⚠ `.center`（引導箭頭讓位那個模式）不碰 `left`：那個 class 靠
  `left:50% + translateX(-50%)` 置中，寫死 inline left 會把它推歪半個身寬。

## B. ⚠ 取景值**只有一份**：`script/speakers.js` 的 `ART`

教學的說明立繪與劇情的立繪是同一批圖，量出來當然是同一組數字。
`config.js` 直接 `import { ART }` 再組 `tutorial.portraitFrames`，**沒有抄第二份**。

這個專案被「同一組數字寫在兩個地方」咬過好幾次（`speakers.js` 與 flight 的
`PORTRAIT` 至今仍是「改一邊要改兩邊」，那是因為隔著資料夾邊界不好共用，
不是因為抄一份比較好）。能 import 就 import。
⚠ `speakers.js` 不 import 任何東西，所以這條相依不會成環。

## C. 雜項歸位

- `TIVOT_SCRIPT_ARCHITECTURE.md` → `docs/`（CLAUDE.md §8 的待辦）。內文一字未改，
  檔頭補了「哪些已經照它做出來了／哪些還沒接」的對照表。
- `LunariaOffice.png`（2.4 MB）與 `HolyseeDungeonLow.jpeg` 轉 WebP
  （251 KB／87 KB），原圖進 `resources/_originals/`（不入版控）。
  ⚠ `TIVOT_Emblem.png` 是**例外**，團徽維持 PNG。
  ⚠ 這兩張目前**沒有任何程式引用** —— 是先備著的素材，不是漏接。


---

# 交接 · `ver -327`（預載真的等完；演出拍不出對話框；掃射抖到底；說明立繪分左右）

## A. 預載頁：**decode 完**才算載完

`onload` 只代表「下載完」—— 1024×1536 的 webp 真正解碼是在第一次要畫的時候，
而那一刻剛好是立繪滑入／插圖切換，於是第一格會頓一下或空一拍。
現在每張圖 `onload` 之後再 `decode()`，解碼也搬進預載頁裡做完。

- 保底上限 8 秒 → **25 秒**。Ray 要的是「載完才開始」，8 秒在慢網下常常是
  「還沒載完就開演」。完全不設上限的話一個卡住的請求會把人鎖死，所以保留上限。
- 最短顯示 **500ms**：快取全中時預載只要一百多毫秒，畫面會「閃一下」，
  讀起來像破圖不像在載入。實測本機 787ms。
- 每張圖的 promise 都不 reject（`onerror` 也 resolve）：缺一張圖不該擋住整場。

## B. ⚠ **空台詞的那一拍不出對話框**

Ray：「插圖002出來的時候不要先出空白的諾薇兒對話框」。
`renderLine` 看到 `text` 為空就把框藏起來直接收工 —— 那一拍是演出（咆哮、掃射），
不是對白，掛一個只有名字的空框讀起來像「她有話要說但沒說出來」。

配套加了 `auto:<ms>`：**沒有台詞的演出拍自己走完**，不等玩家點。
咆哮那一拍 `auto:3500`（`Se_enemy_Saintroar` 實測 3.34 秒），
於是「聲音放完 → 對話框與立繪一同出現」。
⚠ `auto` **只給沒有台詞的演出拍用** —— 有台詞的一律點擊推進（CLAUDE.md §6.5
「不自動跳拍」）。玩家想快轉照樣可以點，點了就提前推進。
⚠ 沒有框也沒有 ▼ 提示的一拍如果不自己走，畫面會停在那裡看起來像卡住 ——
所以掃射那一拍也給了 `auto:2200`（略長於 2 秒的掃射）。

## C. 掃射：更密、抖到底、換句就收

- 發數 44 → **96**（約 48 發/秒），火花尺寸 0.8~1.7 → **1.0~2.3**（Ray：「大量密集」「火花大一點」）。
- ⚠ 抖動要**跟著演出的長度**（Ray：「畫面抖動要連續直到射擊效果停止」）。
  單發的 `.shake` 是 0.42 秒跑完就停，配上兩秒的掃射會變成「槍還在打、畫面已經定住」。
  `.shake.hold` 把同一組 keyframes 改成無限循環，由 JS 依演出長度決定何時拿掉。
- ⚠⚠ **換句要收掉上一拍的演出**（`stopFx`，renderLine 開頭呼叫）。
  玩家可以在演出跑完之前就點掉那一拍，殘留的持續抖動會蓋到下一句上 ——
  在會抖的畫面上讀字很難受。掃射的每一發與抖動的收尾都記在 `fxTimers` 裡，一起清。

## D. 說明立繪分左右（不再置中）

Ray：「戰鬥中的說明立繪太靠中了，跟飛行畫面立繪一樣分左右邊」。
`portraitFaceX` 由單一數字 0.44 改成 `{left:0.38, right:0.62}`，
與劇情頁 solo 的錨點同值。實測諾薇兒的臉由 x=172 移到 **x=148**（390 寬）。
站哪一邊看 `cast[key].side`，不隨台詞變動（CLAUDE.md §6.5）。

## E. ⚠ 未解：璐娜莉亞的立繪比例（Ray 回報，等他確認方向）

實測兩人的身高鎖是**準的**：諾薇兒 695px/165cm、璐娜莉亞 707px/168cm，
都是 4.21 px/cm。所以問題不在身高鎖，在兩張插畫**自己的頭身比**：
量頭寬諾薇兒約 122 源像素、璐娜莉亞約 106 —— 她的臉小 13%
（正是 ver -266 索拉娜那件事的同一個量級，Ray 當時就看得出來）。

另外找到一個**可能的量測錯誤**：她穿厚底細跟鞋，`bot` 量的是**鞋底**。
如果 168cm 是赤腳身高，那 1519px 對應的其實是 168＋鞋高（估 11~14cm）≈ 180cm，
現在等於把她放大了 7~8%。

兩個方向相反（「臉太小」要放大她、「鞋高沒算」要縮小她），
所以**先問 Ray 他看到的是太大還是太小**再動，不要憑猜改。

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

依 `TIVOT_SCRIPT_ARCHITECTURE.md`（Ray 提供，**尚未歸檔到 `docs/`**，見待辦）建的第一層。

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

1. **`TIVOT_SCRIPT_ARCHITECTURE.md` 歸檔到 `docs/`**，照 CLAUDE.md §8「內文一字不改，
   只在檔頭補與現有程式的接點」。檔頭要列出已定案的八處調整（RENNA 命名、站位、
   tier 對照、`{P}` 佔位符、翻譯層、支線分檔…）。
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

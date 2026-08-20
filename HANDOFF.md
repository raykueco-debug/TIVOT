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

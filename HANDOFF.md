# HANDOFF — Saint Install 模組化重寫 · 進度交接

> 每輪開工前讀本檔 + 憲法/規格。實況以 `git log` 與 `DECISIONS.md` 為準;本檔為人類可讀的進度總覽。
> 目前狀態:**CLAUDE.md §6 開發順序第 1~4 步已完成**,下一輪為**第 5 步(Boss/亂入)**。

---

## 一、開工必讀(依序)
1. `CLAUDE.md` — 專案憲法(鐵律、目錄結構、模組邊界、§3 狀態契約與擁有者制、§4 函式歸屬、§6 開發順序)。
2. `DECISIONS.md` — 已定的刻意偏離 reference 決策 **D1~D4**(D1 戰敗優先致死鏈、D2 MB 回血 50%、D3 統一改血 API、D4 saintComboStep 1.0)。
3. `SPEC.md` — 行為規格。**注意 §4 已修正為規則制 rank**(見下方三、備註)。
4. `reference/index.html` — 唯讀行為基準,行為有疑義以它為準。
5. `git log`(HEAD 應為 `3ddaece`)。

---

## 二、模組狀態表

| 模組 | 狀態 | 摘要 |
|---|---|---|
| `state.js` | ✅ | 集中狀態 + 具名 setter(applyDeathGuard/enterSaint/exitSaint/markExecution/addCounter/addPerfect/initEnemyHp)。 |
| `config.js` | ✅ | GAME_CONFIG + ASSETS(resources/ 相對路徑)。 |
| `audio.js` | ✅ | SFX(Web Audio 合成,模組化)。 |
| `combat.js` | ✅ | 戰鬥核心 + 統一改血 API(`healPlayer`/`setPlayerHpRatio`,D3)+ D1 致死鏈 + 雙槍 tap 分支 + 對 defense/saint/weapon/partner/inspector 的注入協調。win/lose 算 totalTime/avg → `inspector.settle`。 |
| `defense.js` | ✅ | 三段防禦(Counter/Perfect/Defense)+ `setUltRate` 擁有者管道 + `addPerfect` 計數。 |
| `enemy.js` | ⚠ 部分 | 立繪 / 受擊特效 / `setEnemy`。**`triggerIntruder` 為 no-op 注入點**(console 提示待第 5 步);無 witch 進場/戰鬥重啟邏輯(witch 僅 config 有資料)。 |
| `saint.js` | ✅ | 聖徒化三結局(MB / OBE / 生命歸還)、`lifeReturnAbort` 執行體、`markExecution`。 |
| `partner.js` | ✅ | 被動即死防禦(`tryDeathGuard`,cut-in 讀 config)歸位接上致死鏈;主動技通用框架(單槽 `tryActive(context)` + 情境標註分派 + `ACTIVE_HANDLERS`,lifeReturn 為首個 handler)。 |
| `weapon.js` | ✅ | 反擊武器 `weaponCounter`(mg/shotgun/sniper 三 vfx,counter 產生端已驗)、雙槍破防窗口(`activateDual`/`endDual`)、換裝面板(搭檔為顯示層)、`reset`/`stopTimers` 跨場清理。 |
| `inspector.js` | ✅ | 規則制評價(rank + EXP 顯示)、監察官結算演出(`showResultSequence` 分階段 + 處決台詞分支 + 打字機)、好感雙軌查表(`pickByThreshold`,currentFavor 固定 0)、Boss 優先 `bossDialogues`、S 解鎖 → `onRematchBtn` 迎擊分流、最佳成績雙存檔(一般 `saint_best_total_v1` / Boss `saint_best_total_boss_v1`)。**不搬 legacy `inspectorPanelHtml`(reference 未呼叫的死碼)**。 |
| `main.js` | ✅ | composition root:注入、按鈕/手勢綁定、開機閒置。rematchBtn 綁 `inspector.onRematchBtn`。 |

---

## 三、Git · 關鍵 commit

- **HEAD**:`3ddaece` docs(SPEC) §4 修正:rank 規則制、tiers 為休眠 config。
- `8af9453` inspector:評價(規則制 rank+EXP)/監察官結算演出/最佳成績雙存檔/迎擊分流。
- `772d0be` weapon:雙槍破防獎勵窗口 + 換裝面板收尾。
- `a58fe81` partner:主動技通用框架(單槽 + 情境標註)+ 被動 cut-in 讀 config。
- `c3e1879` partner:即死防禦(deathGuard)接上致死鏈,一場一次鎖 1 HP。
- `090ba5a` balance(saint):saintComboStep 0.5→1.0(D4)。

### 備註 · DECISIONS 與 SPEC 修正
- `DECISIONS.md` 已含 **D1~D4**(刻意偏離)。
- **SPEC §4 評價已修正為規則制 rank**:reference 的 `computeEvaluation` rank 為規則制(無傷 ≤40s→S 否則 A;有傷 ≤40→B/≤50→C/≤60→D/>60→E),`score/raw` 只算 EXP 顯示、不決定 rank,`tiers`(S3600…)為 reference 未使用的休眠 config。**這是逆向誤述的修正,非刻意偏離,故不入 DECISIONS**。

---

## 四、下一輪:CLAUDE.md §6 第 5 步 — Boss / 亂入(New Hustle)

**目標**:實作「槍之魔女」遭遇整條龍。S 評價 → 迎擊分流**已就緒**,只等 enemy 接實體。

- **`enemy.triggerIntruder`**:目前為 no-op 注入點(inspector 迎擊分支已呼叫到,可驗非死鈕)。需實作:
  1. 播亂入 cut-in(`saintCutin` boss 版,`cutin_boss` 圖、`NEW HUSTLE INCOMING` 字樣)。
  2. 點擊畫面 → 載入 `it.enemy`(witch)數值/立繪(`setEnemy`)。
  3. **戰鬥重啟**:`inIntruderFight=true`;連擊/聖能/回合統計/計時/每盤用時/無傷旗標全歸零;清紅點與加攻 buff;`sRankUnlocked=false`、`resultMode='rematch'`(避免 Boss 戰後再誤觸迎擊);重排大絕(`resetEnemyTimers`/`scheduleUlt`)。
  4. 參照 `reference/index.html:2259` `triggerIntruder`。
- **Boss 專屬機制驗收**(config 已有,defense/enemy 執行):雙發大絕(`shots:2`/`gapMs:1000`/`minMs:2000`/`maxMs:4000`)、延時懲罰半傷減 1 秒、全彈痕受擊特效。
- **最佳成績**:Boss 走獨立 `saint_best_total_boss_v1`(inspector 已依 `inIntruderFight` 判別,無需改動)。
- 之後:第 5 步尾段的最佳成績存檔已在 inspector 就位;第 6 步為全流程對照 reference 做 ACCEPTANCE 勾選收尾。

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
- **commit**:每模組完成即 commit,訊息末尾加
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 刻意偏離 reference 才寫 `DECISIONS.md`;照 reference 一致的不寫;逆向誤述的修正(如 SPEC §4)不入 DECISIONS。
- 語言:與使用者用**繁體中文**溝通。

# HANDOFF — Saint Install 模組化重寫 · inspector.js 這輪(未動工)

> 預防性 session 交接。新 session 讀完本檔 + 憲法/規格後,**停在「等使用者裁決 2 件事 + 放行」**,在得到放行前不要修改任何檔案。

---

## 一、開工必讀(依序)
1. `CLAUDE.md` — 專案憲法(鐵律、目錄結構、模組邊界、§3 狀態契約與擁有者制、§4 函式歸屬、§6 開發順序)。
2. `DECISIONS.md` — 已定的刻意偏離 reference 決策 **D1~D4**(D1 戰敗優先致死鏈、D2 MB 回血 50%、D3 統一改血 API、D4 saintComboStep 1.0)。
3. `SPEC.md` — 行為規格(注意:§4 evaluation 與 reference 有出入,見第四節)。
4. `reference/index.html` — 唯讀行為基準,行為有疑義以它為準。
5. `git log`(HEAD 應為 `772d0be` weapon 收尾)。

---

## 二、進度(已完成並 commit)
- 底層:`state.js`(集中狀態 + 具名 setter)、`config.js`(GAME_CONFIG + ASSETS)、`audio.js`。
- `combat.js`:戰鬥核心 + 統一改血 API(`healPlayer`/`setPlayerHpRatio`,D3)+ D1 致死鏈 + 雙槍 tap 分支 + 對 defense/saint/weapon/partner 的注入協調。
- `defense.js`:三段防禦(Counter/Perfect/Defense)+ `setUltRate` 擁有者管道。
- `enemy.js`:立繪 / 受擊特效 / `setEnemy`。**⚠ 沒有 `triggerIntruder`、無任何亂入/witch 進場邏輯**(witch 只在 config 有資料)。
- `saint.js`:聖徒化三結局(MB / OBE / 生命歸還)、`lifeReturnAbort` 純執行體。
- `partner.js`:被動即死防禦(`tryDeathGuard`,cut-in 讀 config)+ 主動技通用框架(單槽 `tryActive(context)` + context 分派 + `ACTIVE_HANDLERS`,首個 handler = lifeReturn)。
- `weapon.js`:反擊武器 `weaponCounter`(mg/shotgun/sniper 三 vfx)、雙槍破防窗口(`activateDual`/`endDual`)、換裝面板(`openPickSheet`/`closePickSheet`/`refreshLoadoutLabels`,搭檔為顯示層)、`reset`/`stopTimers`。
- `inspector.js`:**純骨架(只有註解),本輪目標**。

---

## 三、本輪任務:inspector.js(CLAUDE.md §6 第 4 步的最後一塊)
狀態:**唯讀分析已完成,尚未寫任何碼,停在等使用者裁決 2 件事 + 放行。** 別擅自開工。

### inspector.js 最小清單(放行後才做)
1. `computeEvaluation(totalTime)`、`pickByThreshold`、`getInspector`、`pickInspectorPortrait`、`pickInspectorDialogue`(Boss 優先 bossDialogues)。
2. `combatStatsRows`、`showResultSequence`(分階段演出 + 處決台詞分支)、`typeInspectorLine`(打字機)。
3. `loadBestTotal`/`saveBestTotal`(兩組 localStorage:`saint_best_total_v1` / `saint_best_total_boss_v1`,以 `inIntruderFight` 判別)+ win 破紀錄顯示。
4. `sRankUnlocked` 偵測 + `onRematchBtn`(resultMode `rematch`/`intercept` 分流)。
5. 接線:`combat.win/lose` 改為 combat 算 `totalTime/avg`(它擁有計時)→ 呼叫 `inspector.settle(totalTime, avg, {isLose})`;`main.js` 的 `rematchBtn` 改綁 `inspector.onRematchBtn`;`combat.setup` 注入 inspector 所需(`goHome`,若接 Boss 再加 `enemy.triggerIntruder`)。inspector 只 import state/config/audio,combat/enemy 原語一律經注入(維持依賴方向)。

### 狀態契約要點(本輪)
- inspector 擁有 `sRankUnlocked` / `resultMode` / `currentFavor`(3.6)。
- **只讀不反寫**的跨擁有者累加值:`counterCount`/`counterDamage`(weapon 經 `addCounter`)、`perfectCount`(defense 經 `addPerfect`)、`sawExecution`(saint 經 `markExecution`)、`flawlessRun`(combat)。
- `currentFavor` 本輪**只讀、固定 0**(養成層未接);好感雙軌查表用 reference 的 `pickByThreshold`(門檻→值,查不到降級 fallback)。未來加好感層＝純 config(往 `dialogues[rank]`/`portraits` 加門檻 key),查表器不動。

---

## 四、⚠ 兩個待使用者裁決的問題(先問,別自己猜)

1. **評價排名邏輯衝突**:reference 的 `computeEvaluation`(`reference/index.html:2322-2352`)是**規則制**(無傷 ≤40s→S、否則 A;有傷 ≤40→B / ≤50→C / ≤60→D / >60→E),config 的 `tiers`(S3600…)在 reference 是**死碼**,那條 raw/score 公式**只拿來算 EXP 顯示**。但 `config.js` / `SPEC.md §4` / 前一位使用者的 bullet 都寫 **score-tier**(S3600…)。憲法鐵律 3 說以 reference 為準(規則制)。→ **問使用者:走規則制,還是 score-tier?**

2. **intercept 的下一步 `triggerIntruder` 這輪接不接**:inspector 只負責「S 解鎖 → 鈕變迎擊(`resultMode='intercept'`)」;實際 Boss 遭遇 `triggerIntruder`(載 witch、重啟戰鬥)是 **enemy 職責**且**目前完全沒實作**。選項:
   - **(a)** 收斂在 inspector,intercept 分支呼叫尚未實作的 `enemy.triggerIntruder`(先留注入點 / no-op),Boss 遭遇留給 §6 第 5 步。
   - **(b)** 一併把 `enemy.triggerIntruder` 做掉,打通 S→迎擊→槍之魔女整條龍。
   前一位 Claude 建議 **(a)**(照開發順序把 Boss/亂入留第 5 步)。

---

## 五、工作慣例(照做)
- **驗收**:用 app 內建 Browser(`mcp__Claude_Browser__*`)在 **390×844** 跑;因模組化須經 http:`python -m http.server <port> --bind 127.0.0.1`(在 `TIVOT/` 下),ES module 有快取 → **每次驗收換新 port** 避免載到舊模組。
- **測試 hook**:驗收時可在 `main.js` 暫掛 `window.__T = {…}` 供 `mcp__Claude_Browser__javascript_tool` 驅動內部函式 / 讀 state;**commit 前務必移除**、乾淨重載確認 `typeof window.__T==='undefined'`。
- 敵立繪那幾個 404 是既有的外部路徑 fallback,正常、與改動無關。
- **commit**:每模組完成即 commit,訊息末尾加
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 刻意偏離 reference 才寫 `DECISIONS.md`;照 reference 一致的不寫。
- 語言:與使用者用**繁體中文**溝通。

---

## 六、新 session 第一步
讀完上述檔案後,**用中文簡短回報你對本輪的理解 + 覆述那兩個待裁決問題**,然後**停下等使用者裁決與放行**。在得到放行前不要修改任何檔案。

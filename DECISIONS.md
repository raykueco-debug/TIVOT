# DECISIONS.md — 刻意偏離 reference 的決策紀錄

> reference/index.html 是「已知正確」的行為基準,但少數地方我們**刻意偏離**(修 bug、改設計)。
> 這些偏離若不記錄,未來對照 reference 驗收時會被誤判為「重寫錯誤」。每條註明:偏離什麼、為什麼、怎麼實作。

---

## D1 · 戰敗優先於同一瞬間的敵人死亡(修正同時歸零競態)

- **日期**:2026-08-10
- **狀態**:已實作(combat.js 致死判定鏈 + `state.defeated` 鎖)

### 偏離內容
reference 存在一個競態 bug:當玩家 HP 與敵人 HP 在**同一次攻防瞬間同時歸零**時
(例如機槍 Counter 逐發打空敵人、同時延時懲罰扣死玩家),勝利 / overkill 結算可能
搶先執行、蓋掉戰敗,導致玩家 0 HP 卻沒進戰敗畫面。

本專案**刻意修正**此 bug:**戰敗一律優先於任何敵人死亡 / overkill / 勝利結算**,
即使同一瞬間敵人也歸零,結果都是戰敗。

### 為什麼
「0 HP 卻顯示勝利」是明確的邏輯錯誤與體驗瑕疵。玩家死亡應立即定案為戰敗,
不該被同幀的敵人死亡蓋過。這是產品決策,不是重寫失誤。

### 怎麼實作(combat.js)
統一的「致死判定鏈」放在所有扣玩家血路徑的唯一 choke point——`enemyAttack` 的
致死尾段(挨大絕 / 延時懲罰 / 按錯懲罰 / Defense 格擋皆經此):

1. 任一次扣血使 `playerHp` 歸零 → 先問即死防禦(partner 的 `deathGuard`,本場未用過才可用)。
2. **可用** → 於 `tryDeathGuard` 內把 `playerHp` 鎖為 1、續盤;這一擊若同時打死敵人
   ＝1 HP 慘勝,照常走 `win()`(未上戰敗鎖)。
3. **不可用** → 先設 `state.defeated = true`(戰敗鎖)再 `lose()`;`win()` 一律
   檢查 `if(state.over || state.defeated) return`,故任何勝利結算讓位給戰敗。

判定點刻意放在「未來即死防禦會插入的位置」:本輪 partner 為佔位、`deathGuard` 恆不可用,
實際行為＝致死即戰敗;下一輪接 partner 時只需讓 `tryDeathGuard` 回真並於其內鎖 1 HP,
**combat 這段不必再改**。

### 驗收提醒
對照 reference 時,若見「同時歸零 → reference 顯示勝利、本專案顯示戰敗」,那是**預期差異**,
非重寫錯誤。

---

## D2 · Maximum Burst（EXSECUTIŌ）回血 10% → 50%

- **日期**:2026-08-10
- **狀態**:已實作（saint.js `triggerMaxBurst` 未擊殺分支 → `combat.setPlayerHpRatio(0.5)`）

### 偏離內容
reference 的 Maximum Burst 未擊殺（敵人仍存活）時,收尾把玩家 HP 設為 `playerMax` 的 **10%**
（[reference/index.html:1856](reference/index.html) `finishSaintMode(()=>Math.max(1, Math.round(playerMax*0.1)))`）。
本專案**刻意改為 50%**。連帶把結局 cut-in 副標由「追加聖裁 · HP 10%」改為「追加聖裁 · HP 50%」。

### 為什麼
產品/手感決策:提高「滿前清盤（贏了就跑）」的回報,讓 Maximum Burst 更值得追求。純數值調整,不動流程。

### 怎麼實作
走統一改血 API（見 D3）:`triggerMaxBurst` 未擊殺分支 `finishSaintMode(()=>api.setPlayerHpRatio(0.5))`。
OBE（HP→1）、EXSECUTIŌ（擊殺→直接結算,不回血）、生命歸還（保留當前血量）三結局**維持 reference 行為不變**。

### 驗收提醒
對照 reference 時,Maximum Burst 未擊殺後「reference 顯示 10 HP、本專案顯示 50 HP」為**預期差異**。

---

## D3 · 統一改血 API 架構（combat 集中管理，所有來源受 D1 致死鏈保護）

- **日期**:2026-08-10
- **狀態**:已實作（combat.js `healPlayer` / `setPlayerHpRatio`；扣血沿用 `enemyAttack` 致死咽喉點）

### 偏離內容
這是**架構決策**,非行為偏離——reference 各處直接讀寫全域 `playerHp`（聖徒化三結局、受擊、結算各自賦值）。
本專案把 `playerHp` 的所有變動集中成 combat 對外的一組 API,任何想改血的系統一律走它,**不得直接寫 `state.playerHp`**:

- `combat.healPlayer(amount)` — 加血（回血/吸血/緩回血 tick、聖徒化 `saintAdvance` 推進）。上限裁切至 `playerMax`。
- `combat.setPlayerHpRatio(ratio)` — 設為 `playerMax` 的某百分比（各結局回血）。夾在 `[1, playerMax]`（下限 floor 1）。
- **扣血**:唯一入口仍是 `enemyAttack` → `handlePlayerLethal`（D1 致死鏈：即死防禦 / 戰敗優先）。

### 為什麼
日後大量系統會想改血（聖徒化三結局、回血/緩回血技能、吸血反擊武器、結局回不同百分比…）。
若每個來源各開 setter 或各自賦值,邊界規則（上限裁切、下限、即死防禦、戰敗優先）會散落複製,
正是舊單檔的病灶。集中成一組 API 後:
- 上限/下限邊界只在一處維護。
- 致死只可能發生在扣血路徑（加血/設值永不致死),故**任何扣血來源都自動經 D1 致死鏈**,
  不會有系統繞過即死防禦或戰敗優先。
- `state.js` 契約維持 `playerHp` 擁有者為 combat;其他模組「請 combat 改」,唯一契約例外仍是
  partner 即死防禦 `state.applyDeathGuard()`（鎖 1 HP）。

### 怎麼實作
- combat 匯出 `healPlayer` / `setPlayerHpRatio`;於 `setup()` 把兩者注入 saint（`saint.init` 的 api）。
- saint 的 `saintAdvance`（推進＝回血）走 `api.healPlayer`;三結局回血走 `api.setPlayerHpRatio`;saint **不直接寫** `playerHp`。
- 大絕頻率（`ULT_MIN/MAX`,defense 擁有）同理:saint 只讀現值存自有 `saintPrevUlt`,寫入經 `defense.setUltRate`（擁有者管道）。

### 驗收提醒
此為內部架構,對外行為與 reference 等價（除 D2 的數值差異）。驗收看行為即可,不會與 reference 有可見差異。

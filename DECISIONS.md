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

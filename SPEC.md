# TIVOT · Saint Install — SPEC（單檔 HTML 原型）

> 依上傳的 `index.html`（單檔 2.06 MB，含內嵌 base64 立繪／cut-in）逆向整理。
> 架構鐵律：**所有內容集中在 `GAME_CONFIG`**（資料／程式分離）；base64 素材集中在 `ASSETS`。標題為「TIVOT · 原型 v2」（原「聖裁修女」，2026-08 更名），內部數值對應 v18 系列（受擊推進式聖徒化）。

---

## 一、檔案結構

單一 `<style>` + 單一 `<script>`，`GAME_CONFIG` 位於第 668 行、`ASSETS` 位於第 965 行、程式邏輯自第 987 行起。

- HTML `#app` 版面：`#top`（敵人區＋HUD＋血條＋威脅紅點）／`#bottom`（`#grid` Schulte 盤面）／`#cutin`（一般演出）／`#saintCutin`（五張聖徒化 cut-in）／`#returnSwipe`（生命歸還下滑區）。
- 主要 DOM id：`enemyImg` `enemyName` `enemyHp/playerHp`（血條）`energyClaspFill`（聖能）`redDots`（大絕紅點）`hitFxLayer`（受擊特效）`claw`（爪痕 SVG）`grid` `cutin/cutinImg/cutinText` `saintCutinImg*`（execute/obe/burst/return/boss 五張）。
- 存檔：`localStorage`，`saint_best_total_v1`（一般最佳）與 `saint_best_total_boss_v1`（Boss 最佳）。

---

## 二、GAME_CONFIG 內容

### 1. 武器 `weapons`（Counter 反擊用）
每把武器欄位：`counterWin`（反擊窗口 0~1）、`hits`、`dmgPerHit`、`vfx`（`burst`散彈同時跳字／`single`狙擊大紅字／`null`逐發）、`defenseDamageScale`（Defense 段受傷倍率，相對 `ULT_DAMAGE`）、`noPerfectBand`（取消 Perfect 免傷帶）、`perfectDamageScale`（散彈專屬）、`image`（換裝選單縮圖鑰匙 → ASSETS）。

> ⚠ 武器 key＝圖檔基底名（`類型_武器名`，同 `resources/weapon/` 圖庫；統一代碼與檔名。原 reference 為 `mg`/`shotgun`/`sniper` 且 `image:null`，本專案改此命名並接上選單縮圖）。

| key | 名稱 | counterWin | hits×dmg | 反擊總傷 | defenseScale | noPerfectBand | 圖 | 備註 |
|---|---|---|---|---|---|---|---|---|
| `MG_Squall` | 重機槍 | 0.12 | 8×6 | 48（基準） | 0.5 | false | MG_Squall.png | 預設武器 |
| `Shotgun_Blast` | 散彈槍 | 0.20 | 6×4 | 24 | 0.25 | false | Shotgun_Blast.png | `perfectDamageScale:0.5`（Perfect 改打 6×2=12） |
| `Sniper_Falcon` | 狙擊槍 | 0.06 | 1×72 | 72 | 0.5 | true | Sniper_Falcon.png | 單發大紅字、無 Perfect 免傷帶 |

`defaultWeapon: 'MG_Squall'`。程式僅 `defaultWeapon` 硬寫此 key，其餘一律 `WEAPONS[state.equippedWeapon]` 動態查表、選單動態列 `Object.keys`。

### 2. 搭檔 `partners`（config key `freya`，顯示名「蕾妮」）
- `image:'partner_twin'`、`cutin:'cutin_saint'`。
- **被動 `deathGuard`（即死防禦）**：整場一次性（`oncePerBattle:true`），致死傷害改為保留 1 HP 並插 cut-in。
- **主動 `lifeReturn`（生命歸還）**：聖徒化中「下往上滑」強制中止，保留當前血量（第四結局）。
- `defaultPartner:'freya'`。

### 3. 監察官 `inspectors`（config key `freya`，顯示名「芙蕾雅」，`tier:'rookie'`）
- `executionLine`（處決勝利專屬）：「熔斷了？真慘烈呢。」
- `interceptLine`（S 評價「再度執槍」隱藏關警告）：「慢著！有新的敵人！」
- `imageBase:'freya'` → 外部目錄 `assets/inspector/freya/portrait.*`（優先，失敗才用內嵌 `image`）。
- `portraits{}`：好感門檻 → 立繪鑰匙（目前留空）。
- `dialogues`：`[rank(S/A/B/C/D/E/lose)][好感門檻0]` → 台詞陣列（隨機取一）。
- `bossDialogues`：Boss（槍之魔女）結算專用，優先於一般 dialogues。
- `defaultInspector:'freya'`。

### 4. 評價 `evaluation`

> ⚠ **修正逆向誤述**（本 SPEC 原記述為 score-tier 制，與 reference 實際行為不符）。
> reference/index.html:2322 的 `computeEvaluation` rank 為**規則制**；`score/raw` 公式只算 **EXP 顯示**、**不決定 rank**；`tiers` 為 reference 未使用的**休眠 config**。以下依 reference 實際行為記述。

**rank（規則制，以 reference 為準）**——由「無傷與否 + 總用時」直接定等第，不經分數：

| 無傷 flawlessRun | 條件 | rank |
|---|---|---|
| 是 | 總用時 ≤ 40s | **S** |
| 是 | 總用時 > 40s（無時間上限） | **A** |
| 否 | 總用時 ≤ 40s | **B** |
| 否 | ≤ 50s | **C** |
| 否 | ≤ 60s | **D** |
| 否 | > 60s | **E** |

**EXP（分數公式，僅結算面板顯示，不決定 rank）**：
```
raw = max(0, timeBonus.base − 總用時秒 × timeBonus.perSecond)
    + 反擊累計傷害 × counterCoef
    + 完美防禦次數 × perfectPerHit
exp = round( raw × (無傷? flawlessMult : 1) × (MaxBurst擊殺? executionMult : 1) )
```
- 係數：`timeBonus{base:3000, perSecond:40}`、`counterCoef:2.0`、`perfectPerHit:50`、`flawlessMult:1.30`、`executionMult:1.10`。
- `tiers`（S 3600 / A 2800 / B 2100 / C 1400 / D 700 / E 0）：**reference 未使用的休眠 config**，保留於 config.js 但不參與 rank 判定（比照本 SPEC 其他過時標註手法）。

### 5. 敵人 `enemies`
共用欄位：`name`（UI 只顯示底線前段）、`image`（內嵌 fallback）、`imageBase`（外部目錄優先）、`hp`、`attack`（大絕單擊傷害）、`atkInterval`（大絕蓄力秒，null＝用 `tuning.chargeSeconds`）、`boardGrids`（每盤格數覆寫，聖徒化不受影響）、`hitFx`（受擊特效三件套 delay/wrong/ult，type：`blood`/`bite`/`claw(count)`/`bullet(count,pos)`）。

| key | 名稱 | hp | attack | boardGrids | 備註 |
|---|---|---|---|---|---|
| `faceless` | 地下聖徒_A | 500（測試值，正式約150） | 45 | [9,9,16,16,16] | delay=血痕/wrong=齒痕/ult=三爪 |
| `intruderEnemy` | 亂入者·??? | 400 | 50 | 同上 | 舊亂入怪，現已改用 witch |
| `witch` | 槍之魔女（Boss） | 500 | 45 | 同上 | 見下方 Boss 專屬機制 |

`currentEnemy:'faceless'`；`lineup:['faceless']`（連戰預留，未接邏輯）。

**Boss `witch` 專屬機制（一般怪不填＝走預設）：**
- `ult:{ shots:2, gapMs:1000, minMs:2000, maxMs:4000 }`：一次先後出 2 個攻擊點、間隔 1 秒、發動頻率 2~4 秒。
- `delayPenalty:{ dmgScale:0.5, timeDelta:-1 }`：延時懲罰半傷、時限減 1 秒（判定更嚴）。
- `wrongPenalty:{ dmgScale:1 }`。
- `hitFx`：全部彈痕（玻璃碎裂），delay 1 顆／wrong 3 顆／ult 2 顆、位置隨機。

### 6. 亂入 `intruder`（New Hustle）
`enable:true`、觸發實綁 **S 評價**（`condition{maxTime:45,noDamage:true}` 僅備查）、`cutinText:'NEW HUSTLE INCOMING'`、`enemy:'witch'`、`bannerHold:1800`（結算停留後才播 Boss cut-in）。

### 7. 數值總表 `tuning`
```
玩家       playerHp 100
傷害       dmgBase 3 / dmgPerCombo 0.2 / dmgComboCap 20 / dmgDualMult 0.7 /
           dmgCritMult 3 / dmgWrong 10 / dmgHeavy 18 / dmgDelay 8
聖能/大絕  energyPerHit 2 / chargeSeconds 4
三級防禦   defDefenseMin 0.35（0.35~1.0=Defense 半傷）
           defPerfectMin 0.12（0.12~0.35=Perfect 免傷；0~0.12=Counter 免傷+反擊）
雙槍       dualSeconds 4
聖徒化     saintGrid 16 / saintGridCols 4
           saintAdvanceDivisor 15（一次受擊推進＝playerMax/15 ≈+1秒）
           saintBlockDivisor 30（一次格擋推進 ≈+0.5秒）
           saintPassiveHealSec 10（無受擊時回滿約需秒數）
           saintReactSecInSaint 5 / saintNoAtkAfterCutinSec 3
           saintUltMinMs 1200 / saintUltMaxMs 2600（期間敵大絕頻率）
           saintComboStep 0.5（每 combo 疊傷斜率，無上限）
           saintLastHitRatio 0.20（結束清盤追加期間總傷 20%）
攻擊 buff  atkBuffSeconds 3
榴彈       grenades 1
```

### 8. 盤面序列 `boards`（Schulte）
```
[0] grid 9,  cols 3, interval 2.0, hint true
[1] grid 9,  cols 3, interval 2.2, hint false
[2] grid 16, cols 4, interval 2.8, hint false
[3] grid 16, cols 4, interval 3.0, hint false
[4] grid 16, cols 4, interval 3.2, hint false
```
逐怪 `boardGrids` 可覆寫格數；`boardGridFor(idx)` 決定實際格數。

---

## 三、核心系統（程式邏輯）

### 戰鬥層級模型（場／局／敵／盤）
戰鬥分四層,結束條件與重置範圍以此為準（程式已驗與此一致,見 combat.js `win`/`clearBoard`/`goNextBoard`/`enemyDamage`）：

- **場（battle）**：一場完整戰鬥。**新場一切從頭**——`playerHp`、`deathGuardUsed`、所有計數（counter/perfect/sawExecution）、計時（runStartTime/boardTimes）、無傷旗標全歸零。**Boss 亂入＝重開新場**（`combat.startIntruderFight`，僅差別在載 witch、`inIntruderFight=true`）。
- **局（round／lineup）**：一場內的敵人序列,敵可複數,打完一敵接下一敵。**`lineup` 連戰目前預留、未接邏輯**（`lineup:['faceless']`）。
- **敵（enemy）**：單一敵人。**結束一敵的唯一條件是 `hp` 歸零** → 進 overkill（`enemyDamage` 凍結 killTime、停大絕排程，不自行結算）→ 清盤時若 `enemyHp<=0` 即 `win()`（最後一敵→結算；連戰接上後→下一敵）。`enemyDamage` 敵血歸零**不**觸發結算,只進 overkill。
- **盤（board）**：Schulte 數字盤。**一敵之內連續出盤,盤數不固定,以清完該敵 `hp` 為準**。`boards[0..4]` 是**前五盤的參數模板**（grid/cols/interval/hint）,**非結束條件**；`goNextBoard` 對 `boardIndex` 無上限,越界後 `BOARDS[idx]||BOARDS[length-1]` fallback **循環沿用第 5 盤參數繼續出盤**,直到 `hp` 歸零。全檔無「boardIndex 達 5 就 win」的判定。

> ⚠ 修正舊誤述：本 SPEC 早期「一場 = 五盤」是錯的腦補；碼從來以 hp 歸零為結束條件。`faceless` 測試值 `hp:500` 實戰會跑超過五盤,證明越界循環路徑真的會被走到。

### 戰鬥主循環
一敵之內連續出盤,清完該敵 hp 才結算（見上「戰鬥層級模型」）。`tap(num,cell,e)` 判定按對／按錯：按對 → `gunHitOnEnemy`（依 `hitDamage()`＝`DMG_BASE + min(combo,cap)×perCombo`，雙槍×0.7）、加聖能、疊 combo；按錯 → `enemyAttack(DMG_WRONG 或紅字期 DMG_HEAVY)`。`startIntervalTimer` 逐格計時，超時 → 延時懲罰（`DMG_DELAY`，Boss 縮放）。`goNextBoard`/`loadBoard`/`buildGrid`/`markNext`（hint 高亮）/`clearBoard`/`recordBoardTime`。

### 三級防禦（大絕紅點）
`startCharge`/`scheduleUlt`/`spawnThreat`/`updateThreats`/`resolveThreat`：紅點縮放，依剩餘時間比例 `ratio` 分三段——
- 0.35~1.0：**Defense**（傷害減半，武器 `defenseDamageScale` 縮放）
- 0.12~0.35：**Perfect**（免傷；散彈改為 `perfectDamageScale` 打反擊傷）
- 0~0.12：**Counter**（免傷＋`weaponCounter` 依武器 hits/dmg 反擊）
Boss 多發（`ULT_SHOTS/ULT_GAP_MS`）。`flashDefense` 視覺。`noPerfectBand` 武器（狙擊）取消橘圈。

### 雙槍（破防）
`activateDual`/`endDual`：聖能滿自動發動，`DUAL_SECONDS` 期間傷害 `dmgDualMult`。

### 聖徒化（v18 受擊推進式）
`activateSaint(dir)`（左右滑觸發）→ `playSaintCutin` → `startSaintMode`。血條改為**倒數槽**：`saintAdvance(amount)` 只在真受擊（挨大絕／按錯／反應超時）推進（`SAINT_ADVANCE_DIVISOR`），格擋推進較少（`SAINT_BLOCK_DIVISOR`），Counter/Perfect 免傷不推進；無受擊時被動回滿（`SAINT_PASSIVE_HEAL_SEC`）。維持 16 宮格，期間敵大絕更密集（`SAINT_ULT_MIN/MAX_MS`）。`startSaintReactTimer`（每格反應時限，`SAINT_REACT_SEC_IN_SAINT` 放寬）。~~cut-in 後 `SAINT_NOATK_AFTER_CUTIN_SEC` 秒敵不發動。~~ ⚠ **過時**:reference v18c 已取消此緩衝（`startSaintMode` 設 `enemyAtkSuppressUntil=0`，一進聖徒化敵人即照常發動大絕）；本專案依此為準（2026-08-10 裁決），`saintNoAtkAfterCutinSec` 為休眠參數。
三種結局：
- **Maximum Burst / EXSECUTIŌ**（`triggerMaxBurst`）：滿前清盤 → 追加期間總傷 20%（`SAINT_LAST_HIT_RATIO`），`sawExecution=true`（評價 ×1.10）。
- **OBE**（`triggerOBE`）：推進到滿 = 沒守住。
- **生命歸還**（`activateLifeReturn`，下滑觸發）：中止並保留當前血量（第四結局）。

### 受擊特效
`showHitFx(kind)`/`spawnBlood`/`spawnBite`/`spawnBullets`/`triggerClaw`（爪痕 SVG）/`bulletSVG`（玻璃碎裂），依怪 `hitFx` 三件套。

### 結算與評價
`win`→`computeEvaluation(totalTime)`（套上方公式）→ `getInspector`/`pickInspectorDialogue`（Boss 走 `bossDialogues`）/`inspectorPanelHtml`/`combatStatsRows`/`showResultSequence`（打字機 `typeInspectorLine`）。S 評價 `sRankUnlocked` → 按鈕轉 `intercept` 模式 → `triggerIntruder` 遭遇 Boss 槍之魔女。`lose` 為失敗流程。最佳成績分一般／Boss 兩組。

### 音效（程式合成，Web Audio）
`SFX` IIFE：`gunshot`（重機槍）/`sniperShot`（狙擊，含尾嘯）/`wrong`/`hit`/`clear`/`ultCharge` 等，`ASSETS` 音效槽目前留空。

### 素材載入
`applyConfigToDOM`/`setEnemy`/`loadEnemyPortrait`：`imageBase` 外部目錄優先，載入失敗 fallback 內嵌 `image`。`displayEnemyName` 只顯示底線前段。

---

## 四、驗證流程（維護慣例）

1. Python regex 抽出行內 `<script>` → `node --check` 檢查語法。
2. Playwright 於 390×844 viewport 做 runtime 測試。

工作檔：`/home/claude/index.html`、`/home/claude/SPEC.md`；交付至 `/mnt/user-data/outputs/`。

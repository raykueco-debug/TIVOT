# CLAUDE.md — 聖約第四騎士團 / Saint Install 模組化重寫

> 本檔是本專案的憲法。每個 session 開工前必讀。任何改動不得違反此處鐵律。
> 任務性質:把「單檔可循環 HTML 原型」**整檔重寫**成可擴充的模組化目錄,**行為與手感須與 `reference/index.html` 完全等價**。

---

## 0. 鐵律(不可違反)

1. **資料/程式分離**:所有遊戲內容(武器/敵人/搭檔/監察官/評價/數值/盤面)集中在 `config.js` 的 `GAME_CONFIG`。程式碼不得寫死任何內容數值——一律讀 config。
2. **共享狀態集中**:所有跨模組的可變狀態集中在 `state.js`。模組間不得各自持有散落的全域變數(這正是舊單檔的病灶)。存取規則見第 3 節。
3. **手感等價是驗收標準**:不是「功能都在」就算過,是連時序、延遲、推進手感、判定門檻、combo 節奏都要與 `reference/index.html` 一致。判斷有疑義時,**以 `reference/index.html` 的實際行為為準**,SPEC 為輔。
4. **reference 唯讀**:`reference/index.html` 是「已知正確」的行為基準,**永不修改**,只讀來比對。
5. **框架一次性建,偏差逐項修**:先把目錄骨架與 state 契約立好,再逐模組填。不追求一次每個數值都對,但每個模組完成都要對照 SPEC/reference 校驗。
6. **每個模組完成即 commit**(見第 6 節 Git)。

---

## 1. 目錄結構(目標)

```
index.html          <script type="module"> 掛載,串接以下
style.css           全部 CSS(原單檔 <style>)
config.js           GAME_CONFIG(所有內容資料)+ ASSETS(圖片路徑鑰匙)
state.js            集中共享狀態 + 存取器(見第 3 節)
audio.js            SFX(Web Audio 合成,IIFE 改模組)
modules/
├─ combat.js        戰鬥核心:Schulte 盤面、輸入判定、計時、傷害計算
├─ defense.js       三級防禦:大絕紅點生成/縮放/判定(Defense/Perfect/Counter)
├─ saint.js         聖徒化:降臨/推進/三結局(MaxBurst/OBE/生命歸還)
├─ weapon.js        武器:雙槍破防、Counter 反擊演算
├─ partner.js       搭檔:即死防禦、生命歸還觸發
├─ inspector.js     監察官:評價計算、對白、結算面板
└─ enemy.js         敵人:立繪載入、大絕排程、受擊特效、Boss(亂入)
resources/          圖片(已完成,見第 5 節)
reference/
└─ index.html       現行完整版(唯讀行為基準)
SPEC.md             行為規格
```

**注意**:SPEC 原提六模組(戰鬥面板/聖徒化/武器/伙伴/監察官/敵人),我在重寫時把「三級防禦」自戰鬥核心獨立為 `defense.js`——因為它是自成一體的紅點判定系統,獨立後 combat 更乾淨。這是唯一對 SPEC 模組劃分的調整,已納入下方邊界圖。

---

## 2. 模組邊界圖(誰依賴誰)

依賴方向由上而下,**不得出現反向或循環依賴**:

```
        state.js  ◄──────────── 所有模組讀寫狀態的唯一來源
        config.js ◄──────────── 所有模組讀資料的唯一來源
        audio.js  ◄──────────── 純輸出(被呼叫播音),不依賴他人
           ▲
           │(以上為底層,無業務邏輯)
   ┌───────┴─────────────────────────────┐
   │              combat.js               │  戰鬥主循環,協調者
   │  呼叫→ defense / weapon / saint /     │
   │        enemy / partner / inspector    │
   └───┬────┬────┬────┬────┬────┬─────────┘
       │    │    │    │    │    │
   defense weapon saint enemy partner inspector
       │         │              │
   (回報判定) (聖徒化狀態)   (即死防禦攔截)
```

**關鍵原則**:`combat.js` 是唯一的「協調者」,其他模組彼此**不直接互相 import**,一律透過 `state.js` 溝通或由 combat 調度。這樣切斷了舊單檔那種「人人讀寫 saintMode」的網狀耦合。

---

## 3. 共享狀態契約(state.js)

舊單檔約 40 個模組級變數散在全域。重寫時全部收進 `state.js`,分組如下。**標註「擁有者」= 唯一有權寫入的模組;其他模組只讀。** 這是解耦的核心。

### 3.1 戰鬥核心(擁有者:combat)
`boardIndex, N, cols, intervalLimit, intervalDeadline, cells, order, expect, combo, energy, boardStartTime, boardClean, transitioning, boardTimes, boardsCompleted, runStartTime, killTime`

### 3.2 生命/敵我(擁有者:combat;partner 可經攔截器改 playerHp)
`playerHp, playerMax, enemyHp, enemyMax, overkill, over, flawlessRun`
- ⚠️ `playerHp` 唯一的例外寫入:`partner.js` 的即死防禦(`tryDeathGuard`)在致死時把 playerHp 保留為 1。此為契約允許的攔截,須明確走 partner 的攔截函式,不得散寫。

### 3.3 三級防禦/大絕(擁有者:defense)
`threats, threatTick, ultCheckTimer, CHARGE_SECONDS, ULT_DAMAGE, ULT_SHOTS, ULT_GAP_MS, ULT_MIN, ULT_MAX, DELAY_PENALTY_SCALE, DELAY_TIME_DELTA, WRONG_PENALTY_SCALE`
- 後面那串大寫是「當前敵人的大絕參數」,由 `enemy.js` 設定敵人時寫入、`defense.js` 讀取執行。設定敵人是 enemy 的職責,執行判定是 defense 的職責。

### 3.4 武器/雙槍(擁有者:weapon)
`equippedWeapon, grenades, dualWield, dualTimer`

### 3.5 聖徒化(擁有者:saint)
`saintMode, saintTimer, saintUsedThisBattle, saintDamageDealt, saintReactTimer, saintPrevBoard, saintPrevUlt, enemyAtkSuppressUntil`
- ⚠️ `saintMode` 在舊檔被 31 處讀取(跨 combat/defense/enemy/weapon)。重寫後:**只有 saint.js 能寫 saintMode**,其他模組一律**讀** `state.saintMode` 來分支。這條契約若破,就退回舊單檔的病。務必守住。

### 3.6 評價/流程(擁有者:inspector)
`counterCount, counterDamage, perfectCount, sawExecution, sRankUnlocked, resultMode, currentFavor`
- `counterDamage/counterCount` 由 weapon 反擊時累加、inspector 結算時讀 → 允許 weapon 寫入這兩個計數(跨擁有者的唯一計數例外,須註明)。

### 3.7 亂入/Boss(擁有者:enemy)
`currentEnemyKey, curEnemyHitFx, intruderTriggered, inIntruderFight, deathGuardUsed`

### 3.8 增益(擁有者:combat)
`atkBuff, atkBuffTimer`

> **契約寫法建議**:state.js 匯出一個 `state` 物件 + 少量受控 setter(如 `applyDeathGuard()`、`enterSaint()`、`addCounter(dmg)`)。純讀走 `state.x`,跨擁有者的寫一律走具名 setter,禁止外部模組直接 `state.saintMode = ...`。

---

## 4. 函式歸屬對照(重寫時搬遷依據)

- **combat.js**: shuffle, goNextBoard, boardGridFor, loadBoard, buildGrid, fitGridSquare, markNext, tap, clearBoard, recordBoardTime, gunHitOnEnemy, floatDmg, startIntervalTimer, effIntervalLimit, resetIntervalDeadline, stopIntervalTimer, updateBars, updateStatus, hitDamage, triggerAtkBuff, clearAtkBuff, startGame, goHome, win, lose, stopAll, fmtTime
- **defense.js**: scheduleUlt, startCharge, updateThreats, stopThreatTick, releaseUlt, endCharge, spawnThreat, removeThreat, clearThreat, resolveThreat, flashDefense, resetEnemyTimers
- **saint.js**: saintAdvance, activateSaint, playSlash, startSaintReactTimer, clearSaintReactTimer, setReturnSwipe, startSaintMode, triggerMaxBurst, triggerOBE, activateLifeReturn, playSaintCutin, finishSaintMode
- **weapon.js**: activateDual, endDual, weaponCounter, addEnergy, updateUltBtn, updateEnergyClasp, refreshLoadoutLabels, openPickSheet, closePickSheet
- **partner.js**: currentPartner, tryDeathGuard
- **inspector.js**: computeEvaluation, getInspector, pickByThreshold, pickInspectorPortrait, pickInspectorDialogue, inspectorPanelHtml, combatStatsRows, showResultSequence, typeInspectorLine, showBanner, loadBestTotal, saveBestTotal
- **enemy.js**: enemyAttack, enemyDamage, showHitFx, triggerClaw, hitLayer, addFx, spawnBlood, spawnBite, spawnBullets, bulletSVG, shatterCell, ejectShell, triggerIntruder, loadEnemyPortrait, setEnemy, displayEnemyName, applyConfigToDOM
- **audio.js**: SFX(init/unlock/noise/env/gunshot/sniperShot/wrong/hit/clear/ultCharge/confirm/menuClick)
- **index.html / 啟動**: bindBtn, onRematchBtn, playCutin, cutin 綁定, 手勢綁定(showAura/hitThreatAt/滑動)

> 這是**建議歸屬**,重寫時若發現某函式跨模組更合理,可調整,但須維持第 2 節的依賴方向、不得製造循環。

---

## 5. 資源(已完成,勿重做)

圖片已外置至 `resources/`,依功能分:`inspector/`(Freya_SI_01)、`partner/`(Luna 立繪+聖徒化 cut-in、Renee cut-in)、`enemy/`(Faceless/Witch/Belinda)、`weapon/vfx/background/misc`(預留空)。命名 `角色_類型_編號`(SI=立繪/CI=cut-in/EN=敵人立繪)。`config.js` 的 `ASSETS` 已改為相對路徑;音效/特效為程式合成,無檔案。

⚠️ SPEC 提到 `imageBase` 走 `assets/inspector/freya/...` 舊路徑——重寫時統一改為 `resources/` 新結構,與已完成的目錄一致。

---

## 6. 執行約束與驗收

### 執行環境
- 多檔用 `<script type="module">`,**必須經 http 伺服器**(`python3 -m http.server`)或靜態託管,不能 `file://` 雙擊。上線走靜態空間(GitHub Pages / itch.io)。

### Git(重要 — 防止改壞丟工作)
- 開工第一件事:`git init` 並把 `reference/index.html` + 現有 resources commit 為初始版本。
- **每完成一個模組 commit 一次**,訊息註明模組名。改壞隨時可回。

### 驗收流程(沿用專案慣例)
1. 語法:Python regex 抽出各 JS(或直接 `node --check modules/*.js`)。
2. Runtime:Playwright 於 **390×844 viewport** 測試,對照 `reference/index.html` 逐項比對手感關鍵點:
   - 聖徒化推進手感(受擊 +1s / 格擋 +0.5s / 免傷不推進 / 無受擊 10s 回滿)
   - 三級防禦門檻(0.35 / 0.12 兩條界線)、散彈 Perfect 改傷、狙擊無 Perfect 帶
   - cut-in 後敵不發動 3 秒、聖徒化期間大絕更密集
   - Boss 雙發大絕(間隔 1s、2~4s 頻率)、延時懲罰半傷減 1 秒
   - combo 傷害斜率、MaxBurst 追加 20% 總傷、評價 S 解鎖亂入
3. 建議建一份 `ACCEPTANCE.md` 把上述關鍵點列成勾選清單,逐項對照 reference 打勾。

### 開發順序(增量,每步可獨立驗)
1. 骨架:目錄 + `index.html` + `style.css` + `config.js` + `state.js`(空殼契約)。先能載入、顯示標題。
2. combat + enemy + defense:先讓「一般怪一場五盤」能打完、能結算。這是核心,先對齊手感。
3. weapon + saint:接雙槍與聖徒化三結局。
4. partner + inspector:即死防禦、生命歸還、評價與監察官結算。
5. Boss/亂入(enemy 內)、最佳成績存檔。
6. 全流程對照 reference 做 ACCEPTANCE 勾選,收尾。

---

## 6.5 對白演出通則(全域,ver -247 起)

任何畫面要演對白(戰鬥教學、飛行探索、日後的劇情段)一律照這一套,**不要各寫一份**。
基準實作:`modules/tutorial.js` + `style.css` 的 `#tutCast`(DOM 版)、
`flight/index.html` 的 `castEnter`/`drawTalk`(canvas 版)。

**站位與進場**
- 每個角色的站位(左/右)寫在角色資料裡(`side`),**不隨台詞變動** —— 同一個人每次都站同一邊,玩家才記得住誰是誰。
- 立繪從**自己那一側**滑入,450ms、ease-out。
- **說話的人先上場,接話的人輪到他那一拍才上場**。不要一開場就把所有人擺出來。
- 第三、四人上場時,**同一側的舊角先滑出、新角滑入**(輪轉換卡)。

**明暗**
- 說話者原色;其餘 `brightness(.38) saturate(.75)`(與教學同值,不要另訂)。

**推進**
- **點畫面任何一處(按鈕除外)推進一句**,不自動跳拍。最後一句再點一下才收場。
- 框內給 `▼` 閃爍提示,否則玩家不知道要點。

**取景**
- 逐角色一組 `{crop, h, cx}`,**不要共用一組數字** —— 每張插畫構圖不同。
- ⚠ **身高差寫在 `h`**(角色在畫面上的高度佔比)。全部填一樣的話畫面上所有人一樣高,身高差就消失了。插畫本身給不出身高(都是 head-to-toe 全身框,實測三張人物像素高差不到 1%)。
- 兩人同台要挑**橫向佔比小**的那張圖(例:索拉娜用 side 不用 front,69% vs 78%),站位再拉開,才不會疊在一起。

**層次**
- ⚠ 立繪要在**操作面板與舵輪之下**。飛行頁因此畫在 canvas 上、排在 `drawPanel` 之前 —— DOM 疊層做不到這件事(裁切是「避開」不是「在下面」,圓形的舵輪會露餡)。
- 對話框與該畫面既有的橫向元件對齊(飛行頁:與方向計同寬、疊在其上),幾何抽成共用函式,兩邊別各寫一份。

## 7. 未來功能(本次不實作,但 state 預留)

`state.js` 設計時預留、**本次不寫**:
- **Ghost 對戰**:只記每盤點擊頻率(5 數字),對戰生成槍聲+隨機彈孔,無聖徒化/無雙槍,純舒爾特五戰三勝取兩盤。不重播輸入軌跡。
- **排行榜**:各關卡完成秒數(有聖徒化有雙槍),秒數決勝。
- 共用零維運後端(Supabase 類),不做防作弊。
- 順序:前端假榜 → 自我 ghost → 接後端。每階段可獨立出貨。

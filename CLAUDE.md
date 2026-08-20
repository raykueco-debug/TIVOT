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

**取景(ver -249 改版)**
- 逐角色一組 `{cm, eye, fx, top, bot}`,**不要共用一組數字** —— 每張插畫構圖與畫風都不同。
- ⚠⚠ **縮放鎖「身高」,不是鎖眼寬**(ver -266 改;-249~-265 曾經鎖眼寬,見下)。
  - 縮放 = `每公分像素 × 角色身高cm ÷ 這張圖裡人物的像素身高`。
  - 站位同樣鎖身高:頭頂 y = `頂線 + (最高身高 − 自己身高) × 每公分像素`。
  - ⚠ **每公分像素必須與縮放自洽**(= 最高角色的螢幕身體高 ÷ 她的身高),不能再用「真人單眼寬≈3cm」那個估值 —— 自洽時**四個人的腳才會落在同一條地平線上**(實測腳底 y 全部 972)。
- ⚠ **為什麼放棄鎖眼寬**:它把**畫風差異放大成體型差異**。四張插畫的身體都佔滿約 1520/1536 像素,但插畫家給的眼睛差很多(索拉娜 27、安雅 34);鎖眼寬 = 縮放 ∝ 1/eye,眼睛被畫小的人整個被放大 —— 實測螢幕身體高索拉娜 983 / 安雅 787,比值 1.249,而身高比只有 1.107。**索拉娜被畫得比應有的大 13%**,Ray 回報「索拉娜太巨大、安雅太小」。
  代價是臉的大小會有差(索拉娜眼寬 16.1、諾薇兒 20.1),那正是鎖眼寬原本要避免的 —— 要往回調就動 `CAST_EYE_MIX`(0=純身高、1=純眼寬),但別調回 1。
- ⚠ 側面圖**不能拿自己的眼寬當尺**(索拉娜 side 的眼睛被壓扁成 26px)。鎖身高之後 `eye` 已不是縮放的尺,但 `CAST_EYE_MIX>0` 時仍會用到,所以照舊量 front 的。
- ⚠ 頂線(最高角色的頭頂)**由左上角 HUD 的實際高度量出來**,不寫死 —— 那塊吃 safe-area,寫死在瀏海機上一定會撞到「大陸曆 1908」。
- ⚠ 橫向站位錨的是**臉的中心**(`fx`)不是圖框中心:這些插畫左右留白差很多。
- ⚠ **立繪不可越中線**(ver -265):左側的人輪廓右緣不得超過畫面中線,右側反之。夾的是**輪廓**不是圖框(留白佔圖寬 2~5 成),而且只能量**看得見的那一段**(立繪只畫到腰,裙襬腿部不在畫面上)。由 `measureBounds` 在載入時建逐列累積的左右界,改取景不必重量。

**新增立繪要量什麼(基準點)**
- **縱向基準 = 頭頂**(`top`)。每張圖都看得到,最穩。⚠ 髮飾/帽子/武器超出頭頂會污染它,量的是**人物最上緣**,所以誇張髮飾會把整個人往下壓。
- **縮放基準 = 這張圖的「每公分幾像素」**。全身頭到腳的圖直接用 `(bot−top)/cm`;⚠ **半身或胸像圖絕對不能照量 alpha 上下緣** —— 那不是全身高,照算會把人放大好幾倍。沒有腳可量時,拿**同一角色已量好的全身圖**對齊「頭頂→眼線」的距離換算。
- **橫向基準 = 臉中心**(`fx`),兩眼中心的中點 ÷ 圖寬。
- `eye` 只在 `CAST_EYE_MIX>0` 時才用得到,但仍建議量著備用。量法見 `flight/HANDOFF.md` F 節(要先拿已知角色校準尺,自動偵測暗像素會把頭髮當眼睛)。

**畫質**
- ⚠ 畫布**要開到裝置像素**(`canvas.width = W × DPR`,DPR 上限 2,再 `setTransform(DPR,…)`)。只開 CSS 像素的話立繪與 canvas 文字會被瀏覽器再放大一次 → 糊。
- ⚠ 立繪縮小超過 2 倍要走**逐次減半的預縮圖**(等同 mipmap),不能直接 `drawImage` 縮到位:關平滑是最近鄰(頭髮蕾絲閃成雜點=顆粒化),開平滑也只是雙線性,一樣漏取樣。縮好之後每幀 1:1 貼上。

**角色身高(全域通用,任何畫面的立繪都照這個比例)**

| 角色 | 身高 | 備註 |
|---|---|---|
| 索拉娜 | 176 cm | 立繪用 side(front 橫向太滿) |
| 蕾娜 | 169 cm | 立繪用 front(ver -263 到位) |
| 諾薇兒 | 165 cm | |
| 安雅 | 159 cm | |

- 兩人同台要挑**橫向佔比小**的那張圖(例:索拉娜用 side 不用 front,69% vs 78%),站位再拉開,才不會疊在一起。

**層次**
- ⚠ 立繪要在**操作面板與舵輪之下**。飛行頁因此畫在 canvas 上、排在 `drawPanel` 之前 —— DOM 疊層做不到這件事(裁切是「避開」不是「在下面」,圓形的舵輪會露餡)。
- 對話框與該畫面既有的橫向元件對齊(飛行頁:與方向計同寬、疊在其上),幾何抽成共用函式,兩邊別各寫一份。

## 6.6 音訊通則(全域,ver -243 起)

**檔案位置與命名** —— `resources/audio/{bgm,se,vo}`,搬檔與改名走 `tools/audio_reorg.py`
(它會**一併**改 `config.js` 與 `flight/index.html` 兩邊,手改很容易只改了前者)。

    bgm_<場合>            背景音樂
    se_<分類>_<名稱>      音效(ui/weapon/enemy/saint/flight);循環音加 _loop
    vo_<角色>_<技能>      語音

命名一律用**用途**當主詞,不用來源或流水號。底線開頭的資料夾(`_master`/`_unused`/`_raw`)
不會被遊戲載入。

**響度分級** —— 量測用 BS.1770 K 加權的閘控積分響度(近似 LUFS),**不要用 RMS**:
RMS 低估人聲、高估低頻,舊表就是這樣把槍聲調得比語音還大。

| 層 | 目標 | 相對語音 | 以音效為 100% |
|---|---|---|---|
| 語音 VO | −18 LUFS | 0 dB | 158% |
| 音效 SE | −22 LUFS | −4 dB | 100% |
| 音樂 BGM | −28 LUFS | −10 dB | 50% |

每支的增益都是實測反推:`gain = 10^((目標 − 實測 LUFS)/20) ÷ masterVolume`
(BGM 走 `HTMLAudio.volume` 不吃 master,故不除)。**加新音檔照這條算,不要憑感覺填。**
整體要放大縮小只動 `masterVolume`,三層等比,比例不變。

⚠ 環境音(航行/停船那種循環床)與**音樂是堆疊不是輪播**。舊版把它們當成兩首 BGM
交叉輪播,換上真正的音樂之後環境音就整個消失了。

**⚠ 耳機對了不代表手機對了(ver -250)** —— LUFS 是**全頻**的量測,但手機喇叭
600 Hz 以下幾乎不發聲。同一層在耳機上齊平,到手機上可能整個散開:

| | 耳機落差 | 手機落差 | 最慘的一支 |
|---|---|---|---|
| 語音層(修正前) | 0.0 dB | **9.7 dB** | `vo_luna_dualwield` −18.0 → −25.2(掉到音效層以下) |
| 語音層(修正後) | 3.3 dB | 3.3 dB | −18.1 → −20.1 |

- **量測要量兩次**:原始的、以及**過一次手機喇叭模型**(600 Hz 三階高通)的。
  工具是 `tools/audio_probe.html`(瀏覽器開,WebAudio 解碼所以 mp3/m4a/wav 通吃)。
- **語音要走語音鏈**(`SFX.playVoice` → `tuning.voiceChain`):切 130 Hz 以下、
  壓 500 Hz 以下的渾濁段、抬 3 kHz 的子音。手機放不出來的低頻只會吃掉 limiter 餘裕。
- **增益對的是「耳機與手機的平均響度」**,不是只對其中一邊 —— 只對手機的話,
  低頻重的那幾支在耳機上會突出 4~7 dB,反而把原本對的耳機平衡打壞。
- ⚠ **不要再串一顆「限幅器」**:Chrome 的 `DynamicsCompressor` 內建自動補償增益
  (綁 threshold 與 ratio),多一節的結果是**更大聲、峰值更高**。實測把門檻從
  −1 降到 −4,整層反而從 −17.9 變 −16.0 LUFS。峰值交給既有的 SFX 匯流 limiter。

## 7. 未來功能(本次不實作,但 state 預留)

`state.js` 設計時預留、**本次不寫**:
- **Ghost 對戰**:只記每盤點擊頻率(5 數字),對戰生成槍聲+隨機彈孔,無聖徒化/無雙槍,純舒爾特五戰三勝取兩盤。不重播輸入軌跡。
- **排行榜**:各關卡完成秒數(有聖徒化有雙槍),秒數決勝。
- 共用零維運後端(Supabase 類),不做防作弊。
- 順序:前端假榜 → 自我 ghost → 接後端。每階段可獨立出貨。

## 8. 設計文件歸檔(docs/ — 規劃,尚未實裝)

Ray 提供的設計文件放 `docs/`,**內文一字不改**,歸檔時只在檔頭補「與現有程式的接點」。

- `docs/TIVOT_IMPL_SPEC.md` — 城鎮結構(節點式導航)、好感度 tier 1..5(棘輪不降)、
  結局判定(BE1~4 / HE1~5 / 離隊)、諾薇兒暴走(獨立風險系統)、蕾娜機制。

⚠ **與 `GAMESPEC.md` 性質不同**:GAMESPEC 是現況實裝快照,docs/ 是還沒開工的規劃。
  判斷現行行為一律看 GAMESPEC 與 `config.js`,不要引 docs/ 當依據。

⚠ **養成層目前一行都沒接**。唯一已存在的接點是 `state.currentFavor`(固定 0)與
  `config.js` 的 `dialogues[rank][好感門檻]` / `inspectors[].portraits[好感門檻]`
  查表(`pickByThreshold` 已在)。要接 tier 是**把門檻表填滿**,不是另建一套。

**監察官＝蕾娜(Renna Heisenberg)** —— Ray 定案。**芙蕾雅(Freya)是暫代版。**
  所以設計文件 §5 的蕾娜機制不是新增角色,是接在現行監察官那個位子上。
  正名要動:`config.js` 的 `inspectors` 鍵/`defaultInspector`/`ASSETS`/`castTable`、
  `i18n/` 三份的 `inspector.name`。`main.js` 已改走 `defaultInspector`(ver -256)。
  ⛔ **卡素材**:`resources/inspector/` 只有 `Freya_SI_01`,蕾娜立繪還沒有。

⚠⚠ **蕾娜(Renna)≠ 蕾妮(Renee)**。蕾妮是現行搭檔(即死防禦/生命歸還),是另一個人。
  ver -262 把監察官的西文名由 Regine 改為 **Renna** 之後,這兩個名字只差兩個字母、
  中文只差一個字 —— **全專案最容易寫錯的一組**。
  蕾妮已**實裝**(`config.js` 的 `partners.renee`、`Renee_CI_pas/act`、`vo_renee_*`);
  蕾娜還不存在。看到 `renee` 一律是搭檔,不要當成監察官順手改掉。

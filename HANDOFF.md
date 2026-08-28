# HANDOFF — 破防計量（月牙）這條線的交接（ver -538，2026-08-28）

> 上一個 session 在這條線上連續抄錯 Ray 的圖被廢掉。新 session 開工前把這份讀完，
> **尤其是「教訓」那一節** —— 不讀就會把同樣的錯再犯一輪。

## 現況

- **已推到 origin/main（`30c2d27`，ver -538）**。
- ⚠⚠⚠ **-538 仍被 Ray 退回**（「叫你畫蘋果一直畫香蕉還睜眼說瞎話」）——
  下面列的幾何數字是**我對他的圖目測換算的比例，連續四版都被判不像**，
  只能當「現在程式長這樣」的紀錄，**不是規格**。規格＝他貼的標註圖本身。
- **下個 session 的第一步（強烈建議）**：不要再目測換算 —— 請 Ray 把他畫的月牙
  **存成圖檔交過來**（小畫家原檔就行），直接把那張圖當素材用（去背景後鋪進
  `#energyClasp`，尺寸錨定 S），或以其 alpha 輪廓 trace 成 path。
  這才做得到他要的「1 pixel 都不准差」；比例參數化這條路已證明走不通。
- 破防計量現在的樣子：
  - **胖月**（幾乎實心的月牙）壓在兩條血條左邊：高 2.16S、寬 1.28S、腰 0.95S、
    月角在右上/右下（±50°）尖端貼血條（0.05S 縫）；中心在紅頂下 0.18S，
    所以上端到紅頂上 0.90S、**下端垂出藍條下緣 0.26S**（他的圖就是垂出去的）。
    S＝紅條頂→藍條底，全部照血條 rect 現量（`layoutClasp`）。
  - 內緣的凹縫很淺（右側），大半藏在連擊數後面 —— 畫面上讀起來是一顆金月盤。
  - **計量＝扇形掃掠遮罩**：月心為軸、由下角掃到上角（`claspGeo` 存幾何，
    `updateEnergyClasp` 只讀）。⚠ 不要走「沿中脊描邊 dash」—— 胖月罩不住，
    滿了中間留暗帶（-537 踩過）。
  - **連擊數**：白粗斜體 1.3S，**蓋在月牙上層**、中心＝月心略偏下（+0.07S）、
    右緣停在血條左緣。0 隱藏；每次連擊**蓋章**（半透明大→縮小落下，`.pop`）；
    斷連轉紅消散（`.break`）；**受擊歸零**（`enemyAttack` 裡 `state.combo=0`，
    不在 markNext —— -527 修過）。
  - **HITS**：0.36S、起筆＝血條左緣、紅條上方。

## 實作位置

- `modules/combat.js`：`layoutClasp()`（幾何全在這，含註解）、`armClaspLayout()`
  （進場 0/120/400/1000ms 重試＋resize 重量）、`updateEnergyClasp()`（扇形＋連擊數同步）。
- `index.html` `#energyClasp`：svg 的靜態 `d` 是**殘影 fallback**，layoutClasp 一跑就蓋掉。
- `style.css` `.clasp-*`：蓋章/斷連動畫、字體樣式。`.clasp-combo.on{transition:none}`
  是刻意的（淡入會吃掉蓋章的第一拍，-531 修過）。

## 教訓（Ray 的嚴正命令，逐字遵守）

1. **「不准再自己發揮，嚴格用我給的形狀跟位置，1 pixel 都不准差。」**
   他給圖就是規格：**逐 px 量他的圖**（以 S 為單位換算比例），不要「理解成」某個
   幾何概念再自己蓋一個。這條線連錯四版全是因為用概念取代量測
   （環→挖口環→細彎月→胖月，每一步都是我腦補的）。
2. **「做之前先跟我確認。」** 對圖有任何一處看不懂，先問再動手。
   （例：某版把他塗掉舊數字的黑框看成「數字欄位」，把數字擺去 HITS 上面。）
3. **改完必須在瀏覽器實測再交**。-534 的事故：改寫時漏宣告 `bb`/`rt`，
   整支 layoutClasp 每次執行都拋 ReferenceError，畫面停在舊座標 ——
   我沒實測就 push，Ray 連報三個症狀（下臂斜/數字小/蓋章不見）其實是同一個根因。
   測法見下節。
4. python 替換程式碼時**錨點必須唯一**（-522 把 `state.combo=0` 插進 markNext 的教訓）。

## 快速測法（瀏覽器 console）

```js
const st=await import('/state.js'); const combat=await import('/modules/combat.js');
document.getElementById('home').classList.remove('on');
combat.startScriptBattle('flight_pirate',{story:false});
// 等 1.5 秒後：
combat.pauseForDialog(); st.state.energy=85; st.state.combo=13;
window.dispatchEvent(new Event('resize'));   // 觸發 layoutClasp + updateEnergyClasp
```
連擊蓋章驗證：改 `st.state.combo` 再派一次 resize，看 `#claspCombo` 的 `.pop` 類名。

## 背景待辦（與月牙無關，沿用中）

- stage2 羽蛇「戰鬥結束」戲（Sturm／Deck_Chaos／著水）等 Ray 的 stage2 稿與素材。
- `Northport_Entrance_BF.png` 還沒接。
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。
- 蜈蚣／空賊的稀有度暫定 E（卡還沒給）。

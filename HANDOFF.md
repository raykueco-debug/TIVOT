# HANDOFF — 破防計量（月牙）＋換槍鈕＋紅點觸碰 ver -539~-553（2026-08-28，全數已 push）

> -534~-538 用比例參數化仿 Ray 的畫連錯四版，那條路已廢除。
> ver -539 起：**形狀＝Ray 交的 alpha 月牙圖本身**，程式不再畫月牙。

## 現況（ver -539）

- Ray 交了 alpha 月牙原圖（原檔名「未命名-1.png」，276×272），並文字定案規格：
  1. 就是月牙；連擊數在**月牙缺口中心**，可蓋月牙、**不可蓋過 HP 條**
  2. 連擊數＝**白色粗斜體黑邊**
  3. HITS 照舊（起筆＝血條左緣、紅條上方）
  4. HITS 上方黑框＝塗掉舊數字的痕跡，不放東西
  5. 血條與右端數字框不動
  6. 金圈＝計量本體；**未充滿時是透明框**（空圈）
  7. 能量 0／連擊 0 → 空圈（不是整顆藏起）
  8. 蓋章／斷連轉紅／受擊歸零 照舊
  9. 掃滿方向：**順時針**（下月角 → 上月角）
- 實作：
  - 素材 `resources/vfx/clasp_moon.webp`（金月本體＝Ray 原圖）＋
    `clasp_moon_frame.webp`（同輪廓描邊＝空圈，由 alpha 邊緣生成，內縮 19px 核、60% 金）。
    原 PNG 在 `resources/_originals/vfx/`（clasp_moon_raw.png ＝ Ray 原檔）。
  - `modules/combat.js`：`MOON` 常數（**那張圖**量出來的：寬高比 276/272、
    缺口中心 (0.6957, 0.4412)、下月角 165°、掃角 258.2°，CSS conic 慣例 0°=上、順時針；
    **換圖要重量**，量法＝對缺口中心射線掃 360° 找月角）。
    `layoutClasp()` 擺位（ver -542 定案，Ray：「月的位置跟大小參考未命名-2」，
    那張圖存 `resources/_originals/vfx/clasp_moon_mock2.png`，逐 px 量出）：
    **高 1.548S、上緣＝紅頂上方 0.516S、右緣＝血條左緣＋0.290S**（壓進血條左端，
    被血條蓋住那一角是刻意的 —— 月牙圖層在 HP 之下，-526 Ray 指定）。
    -540 的月角錨、-541 的臂厚錨都作廢。
    連擊數字 0.9S、錨在缺口中心；**位數變寬時右緣夾在血條左緣內**（updateEnergyClasp
    換字那一刻用 offsetWidth 夾，幾何常數仍只在 layoutClasp 算）。
    計量＝`conic-gradient` 遮罩掛在金月 img 上（0＝藏、滿＝拿掉遮罩避免 360° 接縫）。
  - `index.html`：`#energyClasp` 內改成兩張 `<img>`（frame 下、fill 上）＋ HITS svg ＋ 連擊數。
    src 由 combat.js 從 ASSETS 掛（路徑只有一份）。
  - `config.js` ASSETS：`clasp_moon` / `clasp_moon_frame`（開機預載自動吃到）。
  - `style.css`：`.clasp-moon` 圖層、滿檔光暈/pulse 換到 img 上；
    舊的 `.clasp-track/.clasp-gold/.clasp-maskstroke` 規則已清掉。
- **已在瀏覽器實測**（390×844 與桌面寬各一輪）：0（空圈）／30（下角起順時針弧）／
  85（上角留缺）／100（全亮＋光暈＋數字讓位）／連擊 13 蓋章／999 夾位
  （右緣 238.2 < 血條左緣 240）／斷連轉紅。console 無新錯誤。
- ⚠ 還沒給 Ray 過目 —— 他驗收前這一版不算過。

## 同日後續（-543〜-549，Ray 邊看邊調）

- **色彩**：月體不透明、原圖金再 `hue-rotate(10deg)` 往黃調成正金（-548/-549；
  中途的半透明、白金、降飽和都被推翻，色彩鏈只有 style.css `#claspMoonFill` 一份）。
- **蓄能**：`.charging`＝金色呼吸光暈＋**整圈平滑漸層流光**繞缺口中心順時針轉
  （#claspMoonGlow：外層吃計量扇形遮罩、內層 .glow-shape 吃月牙形遮罩）。
- **滿檔**＝實心白光（moonFull keyframes）。
- **副武器切換鈕**（-549~-551）：三張類別徽章 Ray 交件（連射=Switch_MG、
  散射=Switch_Split、高爆=Switch_Hyper；白底原檔沿金環裁圓去背、縮 256 轉 webp，
  **暗部烘成 α85 半透明**、卡面深底拿掉）。落點最終版（-551）：**月的 0.78 倍、
  右緣貼面板內 6px、垂直中心＝血條中線、整顆在血條右端之外**（不遮 hp 條；
  血條右側讓位，讓位改變 rect 所以設完重跑一次；鈕藏著不讓位，
  weapon.renderSwitch 顯示切換時派 resize 通知重量）。幾何全在 combat.layoutClasp。
- **紅點觸碰範圍分流**（-552，Ray 指定）：`.reddot` 拆成外層**觸碰區**＋內層
  `.rd-vis` 視覺圈 —— dot 的 listener 與 main.js 的 hitThreatAt 都以外層 rect 判。
  規則在 `config.weaponCatHitZone`：連射＝平時同視覺、只剩紅圈時擴到橘圈最大；
  散射＝恆黃圈最大；高爆＝恆同視覺。實作只有 defense.js 的 `hitDia()`。
- **挑戰 Boss 戰敗北評價**（-553）：勝敗都由璐娜莉亞評；lose＝
  `inspector_luna_angry`＋「討人厭的夢......」（-471「敗北回芙蕾雅」作廢）。
- 途中 Ray 回報「挑戰直接進武器選擇」：**重現不出來**，最可能是他載入頁面時
  正好抓到改到一半的 weapon.js —— 重整後他確認正常。日後改檔期間他在測，
  先提醒他等 commit 再重整。

## 後半日（-554〜-564）：正式遊玩線＋旗標連環案

- **首頁「開始故事」大鈕**（-554）＝正式遊玩入口；-559 起**完全獨立**：
  killAllPages（藏著的飛行 iframe 會把記憶體舊值寫回共用鑰匙）＋
  clearRunSaves（main/auto 作廢）＋ newRun。testmode 小 story 鈕＝同一支。
- **章節編號定案**（-562，Ray）：**S0 開頭 → S1 第一次進帝都（town.open 守門 ===0）
  → S2 第一次出航（main.js `sailOut()` 守門 ===1，劇情/城鎮兩條出航路同一支）**。
  七點閘門不再升段；北方泊地地圖鎖改 `stage===2`；北方泊地之後**還沒定號**，
  試飛暫定（STAGE_DEFAULT 主/flight 兩份、FEATURE_FROM、talks sorana/anya from）
  **全部推到 5** 以防萬一。
- **⚠⚠ 鐵律 9 誕生**（-561/-563，Ray 原話：「旗插了以後被拔之前不動，要拔旗只有
  單一事件能拔」）。連環案根因兩個，都修了：
  ① 快照存「查詢結果」→ 預設值（stage=3、名字=HUND）被物化進存檔 →
     改存**鑰匙原始狀態**（null＝不存在，restore 原樣移除）；
  ② newRun 清鑰匙後沒寫回 → 任何 newRun 呼叫者（章節工具）掉進測試預設 →
     **newRun 收尾自己插 stage 0＋playtime 0**。
  「繼續」也只認 main/auto 兩格（quick/slots 是 testmode 跨輪格＝借屍還魂通道）。
- **存讀檔**：讀取頁檢查點（auto 格；-555）＋坐坐也存檔＋飛行距離制檢查點
  （首動一筆、每 600 一筆、交棒補遭遇位置；「繼續」把座標塞回
  `tivot_flight_ret_v1` 走既有 restoreFlightPos）。
- **數值規則**：進城體力回滿（town.open 唯一入口）；好感預設全 0、進帝都諾薇兒
  初始化 5（一次性）；戰後評價→好感（搭檔 S+1／索拉娜 C 以下+1／蕾娜每 4 次 S+1，
  `prog.applyRankAffection` 一支，打靶不算）。
- **旅店兩鈕長按 1 秒**（金色填充、放早取消）。
- **testmode 工具**：devStat 左下浮條（stage｜四人好感｜⏱實體遊玩時間，1s 更新）；
  遊玩時間 5s tick，選單開著/切頁/非遊玩暫停。

## 教訓（沿用，逐字遵守）

1. **「不准再自己發揮，嚴格用我給的形狀跟位置，1 pixel 都不准差。」** 他給圖就是規格。
2. **「做之前先跟我確認。」** 對圖有任何一處看不懂，先問再動手。
3. **改完必須在瀏覽器實測再交**。
4. python 替換程式碼時**錨點必須唯一**。

## 快速測法（瀏覽器 console）

```js
Promise.all([import('/state.js'), import('/modules/combat.js')]).then(([st,combat])=>{
  window.__st=st; window.__combat=combat;
  document.getElementById('home').classList.remove('on');
  combat.startScriptBattle('flight_pirate',{story:false});
});
// 等 1.5 秒後：
__combat.pauseForDialog(); __st.state.energy=85; __st.state.combo=13;
window.dispatchEvent(new Event('resize'));   // 觸發 layoutClasp + updateEnergyClasp
```

## 背景待辦（沿用中）

- **交叉雙槍兩張圖**（`resources/vfx/42452231-….png` 彩色、`resources/background/42452231-….png`
  黑剪影）：Ray 說「另有用途」，**用途還沒講** —— 下次問清楚再接，先不入版控。
- stage2 羽蛇「戰鬥結束」戲（Sturm／Deck_Chaos／著水）等 Ray 的 stage2 稿與素材。
- `Northport_Entrance_BF.png` 還沒接。
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。
- 蜈蚣／空賊的稀有度暫定 E（卡還沒給）。

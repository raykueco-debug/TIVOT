# HANDOFF — 破防計量（月牙）ver -539：Ray 交圖，改成「圖直接鋪」

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
- **副武器切換鈕**（-549）：三張類別徽章 Ray 交件（連射=Switch_MG、散射=Switch_Split、
  高爆=Switch_Hyper；白底原檔沿金環裁圓去背、縮 256 轉 webp）。鈕與月**同大小、
  以血條水平中軸鏡射**（combat.layoutClasp 唯一計算點；血條右側讓位 `Wm-OVER`，
  讓位改變 rect 所以設完重跑一次；鈕藏著不讓位，weapon.renderSwitch 顯示切換時
  派 resize 通知重量）。

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

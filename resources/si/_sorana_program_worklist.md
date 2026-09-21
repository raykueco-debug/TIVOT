# 給程式 session 的工單 — 索拉娜立繪換新（ver -1556）

> 美術 session 出，鐵律 11：我不動 `.js`。以下三件請程式端接。

## 一、⚠⚠⚠ 這 11 個檔**同名覆蓋**了，`speakers.js` 的路徑要掛 `?v=2`

不掛的話瀏覽器會繼續吃舊的那一份，**而且畫面上不會有任何錯誤訊息**（§5 的 -650，連報三次查四版）。

```
resources/si/sorana_si_cry.webp        resources/si/sorana_si_sad.webp
resources/si/sorana_si_determine.webp  resources/si/sorana_si_salute.webp
resources/si/sorana_si_eat.webp        resources/si/sorana_si_serious.webp
resources/si/sorana_si_nod.webp        resources/si/sorana_si_stare.webp
resources/si/sorana_si_point.webp      resources/si/sorana_si_wave.webp
resources/si/sorana_si_lookaway.webp   resources/si/sorana_si_worry.webp
resources/si/sorana_si_relief.webp     resources/si/sorana_si_sleep.webp
resources/si/sorana_si_scare.webp      ← scare 交件後一起
```

⚠ 這 11 個目前都**還沒有** `?v=`，所以是加 `?v=2`（同 `renna_si_scream` 的寫法）。

## 二、取景值：**只改 `top`/`bot`，`fx` 不要動**

`top`/`bot` 是量出來的（alpha 上下緣，人物實際佔的範圍）：

| expr | top 舊→新 | bot 舊→新 |
|---|---|---|
| cry | 6 → **5** | 1511 → **1515** |
| determine | 6 → **11** | 1507 → **1523** |
| eat | 2 → 2（不變） | 1518 → **1528** |
| nod | 12 → **7** | 1494 → **1527** |
| point | 5 → **10** | 1513 → **1522** |
| sad | 3 → **4** | 1521 → **1527** |
| salute | 3 → **12** | 1522 → **1525** |
| serious | 0 → **7** | 1513 → **1523** |
| stare | 11 → **7** | 1515 → **1527** |
| wave | 3 → **9** | 1516 → **1526** |
| worry | 0 → **5** | 1514 → **1519** |
| lookaway | 5 → 5（不變） | 1513 → **1521** |
| relief | 8 → **11** | 1518 → **1517** |
| sleep | 304 → **231** | 1231 → **1424** ⚠ 見下 |

### ⚠⚠ `sleep` 另外要調 `cm`／`standCm`（**不要照抄，要看畫面調**）

那是**坐姿**（現行 `cm:147, standCm:140`）。新圖的人物在框裡**比舊圖大 1.29 倍**
（人物高 927px → 1193px）—— 只換 `top`/`bot` 的話她在畫面上會**縮小約兩成**。

⚠ 憲法 §5 明寫：`cm`／`standCm` **沒有可靠的自動量法，要看渲染結果調**，
而且**只動這兩個、不要去動 `top`/`bot`**（那兩個是那張圖的客觀事實）。
⚠ 純算是 `147 × 1.29 ≈ 189`，但那會**超過 `CAST_TALL` 現行最高的 178**，
把全體立繪一起縮小 —— **所以不要照算的填**，開遊戲看著調。

⚠⚠ **`fx` 保持原值，不要照我量的改。** 理由兩個：
1. 新圖是**照舊圖的姿勢**重畫的（同一個姿勢 ⇒ 沿用，§5 的 -649）。
2. `salute` 與 `wave` 的 `fx` 在 `speakers.js` 裡本來就是**目視手調**過的
   （註解寫著「量到 0.596 / 0.342」）—— 那兩張手臂抬高，自動量到的框含手臂，一定偏。
⚠ 真的覺得臉沒對準再動 `fx`，而且動的是**角色層的 `fxShift`** 不是 `fx`（§5 的 -645）。

## 三、`crybig` 是**新的 expr 鍵**（Ray 交的圖，ver -1556 定案）

`resources/si/sorana_si_crybig.png`（Ray 自己產的，真 alpha、髮色 198.8°）
—— `speakers.js` 的 `sorana.expr` **沒有這個鍵**，要新增一個。
`cry`（一般哭）與 `crybig`（大哭）**並存**，不是取代。
⚠ 那個檔還是 `.png`，要轉 webp 再接（或請美術轉）。

---

## 沒動到的

- 其餘索拉娜立繪（含 `battlecry`／`front`／`side`／`back` 與 read 系列）**這一輪沒換**。
- Ray 交辦「舊索拉娜圖全部重製」還有 **46 張**沒做（清單在 `_sorana_regen_spec.md` §十）。
- 這一輪還欠 **1 張**：`scare`（那一串連續掛掉兩次，還在重送）。

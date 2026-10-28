# 給程式 session 的工單 — 蕾娜新差分 `meltdownbite`（2026-10-28，美術 session）

> 鐵律 11：我不動 `.js`。只有一件要接。

## 要做的：`script/speakers.js` 的 `ART.renna.expr` 加一列

```js
meltdownbite:{ src:'resources/si/renna_si_meltdownbite.webp', top:0, bot:1535, fx:0.528 },
```

- 檔：`resources/si/renna_si_meltdownbite.webp`（**新檔名**，不是同名覆蓋，不必掛 `?v=`）
- 原 PNG：`resources/_originals/SI/renna_si_meltdownbite.png`
- 內容：以 `meltdown` 為底只換表情 —— 眼睛藏在瀏海下、**不笑、輕咬下唇、忍著悲傷**（臉頰一滴淚）。Ray 10-28 定稿。

## ✔ 取景值照抄 `meltdown`（量過了）

同一個姿勢的差分（§5 的 -649）：alpha 外框與 `meltdown` 對比 —— 上下 0/1535 完全相同、左緣差 2px，
所以 `top/bot/fx` 直接沿用 `meltdown` 那一列的數字。

## 用在哪

薇拉馮德夜談（《薇拉馮德_夜襲_台詞差分.xlsx》）要不要換成這張，由 Ray／腳本決定；美術這邊只交圖。


---

## 追加：蕾娜新差分 `realize`（隱隱驚覺，2026-10-28，Ray 修圖後定稿）

```js
realize: { src:'resources/si/renna_si_realize.webp', top:6, bot:1521, fx:0.506 },   // 隱隱驚覺：指尖輕觸下巴、微啟唇
```

- 新檔名，不必掛 `?v=`。原 PNG：`resources/_originals/SI/renna_si_realize.png`
- 取景值是 `tools/measure_si.py` 量的。

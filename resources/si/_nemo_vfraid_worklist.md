# 給程式 session 的工單 — 尼莫新差分（2026-10-28，美術 session）

> 鐵律 11：我不動 `.js`。用在薇拉馮德夜襲戰後「我沒彈藥囉——」那一段。Ray 10-28 定稿。

## 要做的：`script/speakers.js` 的 `ART.nemo.expr` 加一列

```js
dryfire: { src:'resources/si/nemo_si_dryfire.webp', top:2, bot:1527, fx:0.536 },   // 雙手舉 M1911、滑套後定、彈盡愣住
```

- 新檔名，不必掛 `?v=`。原 PNG：`resources/_originals/SI/nemo_si_dryfire.png`
- 取景值：`tools/measure_si.py` 量的（front 是 top:3 bot:1524，身高幾乎相同）。
- 槍照 Ray 指定畫成 M1911、滑套後定（參考圖：Wikimedia Commons「M1911A1 noBG」）。

## 追加：同姿勢的 bore 臉版本（Ray 10-28 定稿）

```js
dryfirebore: { src:'resources/si/nemo_si_dryfirebore.webp', top:6, bot:1528, fx:0.537 },   // 彈盡＋無聊臉（同 dryfire 姿勢）
```

- 原 PNG：`resources/_originals/SI/nemo_si_dryfirebore.png`。新檔名，不必掛 `?v=`。
- 與 `dryfire` 同一個姿勢；取景值是 measure_si 量的，與 dryfire 幾乎相同（依 §5 -649 也可直接沿用 dryfire 那一列）。

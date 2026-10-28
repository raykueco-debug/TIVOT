# 給程式 session 的工單 — 賽西莉新差分 2 張（2026-10-28，美術 session）

> 鐵律 11：我不動 `.js`。用在薇拉馮德夜襲戰後那段（SAINT INSTALL 被尼莫打斷）。Ray 10-28 定稿。

## 要做的：`script/speakers.js` 的 `ART.cecilie.expr` 加兩列

```js
disbelief: { src:'resources/si/cecilie_si_disbelief.webp', top:6, bot:1506, fx:0.532 },   // 不可置信
gritteeth: { src:'resources/si/cecilie_si_gritteeth.webp', top:7, bot:1501, fx:0.534 },   // 生氣咬牙
```

- 新檔名，不是同名覆蓋 → 不必掛 `?v=`。
- 原 PNG：`resources/_originals/SI/cecilie_si_{disbelief,gritteeth}.png`
- 取景值是 `tools/measure_si.py` 量的。⚠ 腳底比 front（bot 1533）高約 30px，人略小約 2% —
  照 §5 預設（不寫 `rescale`）沿用 front 的尺；進遊戲看若覺得腳浮起來再調。

## 用在哪（台詞由腳本決定）
- `disbelief`：尼莫「我沒彈藥囉——」之後那幾句（例：`cec('think','？？')` 那一拍可換）
- `gritteeth`：「哈？你的槍棺呢？」／「寄……你在想什麼啊！」那一帶

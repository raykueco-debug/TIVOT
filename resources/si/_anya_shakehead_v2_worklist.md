# 給程式 session 的工單 — 安雅 `shakehead` 換圖（同名覆蓋，2026-10-28，美術 session）

> Ray 10-28：「安雅現在的搖頭立繪太誇張了 換一個動作小點的」→「安雅搖頭 v2 可以 覆蓋」。
> 鐵律 11：美術不動 `.js`。下面三件都是程式端的。

## 1. ⚠⚠ 版本號（同名覆蓋，不做就會一直吃舊快取）
跑 `python3 tools/bust.py --bump`。實測它會自動做這兩處（美術誤跑過一次、已原樣還原，內容如下供對照）：
- `config.js` 的 `ASSET_VER` 自動區塊加 `'anya_si_shakehead': '274438ab'`
- `script/speakers.js` 的 `shakehead` 那一列 `src` 掛上 `?v=274438ab`

## 2. 取景值要重量（新圖構圖不同）
```js
shakehead: { src:'resources/si/anya_si_shakehead.webp?v=…', top:0, bot:1533, fx:0.510 },
```
舊值 `top:5, bot:1521, fx:0.405` 是舊圖的，**不可沿用**（新圖人物置中、頭髮不再往右甩）。數字是 `tools/measure_si.py` 量的。

## 3. 眨眼要拿掉或重做
`script/blink.js` 的 `"anya_si_shakehead"` 那一筆（`resources/si/blink/anya_si_shakehead_{half,closed}.webp`）是**對舊圖量的眼睛位置**，套在新圖上會錯位。
⇒ 新圖本來就是**閉眼**，建議直接**拿掉這一筆眨眼**（閉著的眼睛不用眨）。若要保留眨眼得重做（`blink_gpt.py` 那條，程式的活）。
⚠ 兩張舊眨眼檔美術**沒有回收**（blink.js 還在指著它們，回收了會 404）—— 拿掉那一筆之後再回收即可。

## 檔
- 新圖：`resources/si/anya_si_shakehead.webp`；原 PNG：`resources/_originals/SI/anya_si_shakehead.png`
- 舊圖：`_recycle/resources/si/anya_si_shakehead.webp`（`tools/recycle.sh --restore` 可放回）

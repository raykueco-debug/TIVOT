# 給程式 session 的工單 — 蕾娜 15 張換新（ver -1637，美術 session）

> 鐵律 11：我不動 `.js`。這一張只有**一件**要接。

## ⚠⚠⚠ 唯一要做的：`speakers.js` 的這 15 條路徑掛 `?v=2`

這 15 個檔是**同名覆蓋**。不掛版號的話瀏覽器會繼續吃舊的那一份，
**而且畫面上不會有任何錯誤訊息**（§5 的 -650：連報三次、查了四版才發現是快取）。
⚠ 這 15 個目前**都還沒有** `?v=`，所以是加 `?v=2`（同 `renna_si_scream` 的寫法）。

```
resources/si/renna_si_apologize.webp    resources/si/renna_si_lookaside.webp
resources/si/renna_si_armcross.webp     resources/si/renna_si_nod.webp
resources/si/renna_si_back.webp         resources/si/renna_si_pointmap.webp
resources/si/renna_si_blushangry.webp   resources/si/renna_si_salute.webp
resources/si/renna_si_coldstare.webp    resources/si/renna_si_side.webp
resources/si/renna_si_determine.webp    resources/si/renna_si_sipdrink.webp
resources/si/renna_si_handout.webp
resources/si/renna_si_holdfile.webp
resources/si/renna_si_laugh.webp
```

⚠ `Renna_SI_determined.png` 對到的鍵是 **`determine`**（檔名去時態，ver -1555 改過）。

## ✔ 取景值**不必動**（量過了，不是略過）

§5 說「換圖一定要重量 `top`/`bot`/`fx`」—— 量了，**15 張全部在雜訊範圍內**：

| | 最大偏移 | 佔畫布 |
|---|---|---|
| `top` | 5 px | 0.33% |
| `bot` | 6 px | 0.39% |

而且這一批是**同一個姿勢的重製**（GPT 拿原圖重畫，構圖沒變）——
依 §5 的 -649「同一個姿勢的差分，位置就直接沿用，不要逐張量」，**現值照舊**。
⚠ 改了反而會讓她在換表情那一拍上下跳一格。

`fx`（臉的橫向中心）同理不動 —— 構圖沒變，臉在圖上的位置就沒變。

## ✔ 去背：15/15 都變乾淨（ver -1638 更正）

量法一律用 `tools/matting_eval.py` 的 `near_white_pct`（半透明像素中 min(RGB)≥235 的比例，
`SEMI_LO = 8`）：

| | 舊 | 新 |
|---|---|---|
| 15 張 | 0.47 ~ 3.19% | **0.00 ~ 0.94%** ✔ |
| 其中 `nod` | 0.47% | **0.01%** ✔ |

⚠⚠⚠ **這一段原本寫「`nod` 有回歸（0.67% → 6.20%）」，那是錯的 —— 鐵律 7 的又一次。**
指標早就有唯一的計算點（`near_white_pct`），我卻在臨時腳本裡自己寫了第二份，
邊界條件寫成 `alpha > 0`（工具是 `> 8`）。被標出來的那 1,874 個像素
**alpha 平均是 1**（滿值 255）—— 它們**根本看不見**，卻被算成白霧。
· 對照：守墓者那張真的有白霧的，同樣的點 alpha 平均 **28**（約 11% 不透明）。
· 兩份的**主體一模一樣，只差一個邊界條件**，而 bug 只住在邊界上（憲法 §0 鐵律 7 但書）。
⇒ **以後量白霧一律叫那支工具，不要在腳本裡重寫一次。**

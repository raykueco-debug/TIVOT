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

## ⚠ 一張有回歸，已知並接受：`nod`

去背品質（半透明像素中的近白比例）：

| | 舊 | 新 |
|---|---|---|
| 其餘 14 張 | 0.63 ~ 3.19% | **0.03 ~ 0.94%** ✔ |
| **`nod`** | 0.67% | **6.20%** ⚠（其中 55% 貼在外緣＝真的白霧） |

照樣一起換，理由是**這一批換的是畫法（頭髮），一張留舊的會讓她在那一拍換一個畫風**。
要修的話重跑那一張就好，不影響其餘 14 張。

# 死亡峽谷 Death Canyon — 背景規格（2026-09-06 美術 session 開單）

灰石質的野戰地圖（同夏爾森林那類）。**節點與連線尚未進 `script/town.js`** ——
本檔先定美術工單，遊戲資料等程式 session 接。

## 節點（5 個 × day/dusk/night ＝ 15 張）

| 節點 | 檔名前綴 | 備註 |
|---|---|---|
| 峽谷入口 | `Canyon_entry_` | 谷口，兩壁夾出的窄門；復活點，氣氛可以稍緩 |
| 風蝕迴廊 | `Canyon_corridor_` | 層狀灰岩夾道，被風磨出的波浪紋壁面 |
| 白骨之地 | `Canyon_bones_` | 巨獸骸骨半埋碎石坡，肋骨如拱門 |
| 斷橋 | `Canyon_bridge_` | 橫跨深谷的石橋從中斷落，殘端懸在霧上 |
| 谷底祭場 | `Canyon_altar_` | 谷底盡頭的風化石壇與傾倒的聖像（Boss 場） |

## 共用規格（每張都要）

- 橫式 3:2、平視圖、**中央留空給人物立繪（景物擺兩側）**。
- **風土**：灰石質死谷 —— 風蝕層狀灰岩、碎石坡、乾涸河床；植被幾乎沒有
  （至多幾株枯樹與乾草）；散見獸骨與**朝聖者的遺物**（路邊石龕、風化到面目
  模糊的聖像、繫著褪色布條的骨杆、半埋的鏽鐵燈）—— 哥德宗教感（同怪的
  美術基準：骨與鐵的質地、沉鬱厚重的剪影），但不是地獄岩漿風。
- **色域**：灰階為主的冷灰、青灰、暖灰層次；點綴極少量褪色的布條暗紅／
  鏽鐵褐。不要綠意盎然、不要沙漠黃。
- 產圖四鐵則（CLAUDE.md §5）：anime style／cel shading／clean lineart／
  **絕不要顆粒感**。原稿細節密度要**偏高**（Gemini 後製會削一階）。
- 產圖順序照 §5：GPT 出 5 張日景原稿（同串連出，風格自鎖）→
  Gemini 逐張重繪（正式 day）＋衍生 dusk/night。

## 三個時段

| | 光 |
|---|---|
| `day` | 高而蒼白的陰天光或穿隙冷光，岩壁灰階層次分明 |
| `dusk` | 暖橘金斜光只打在崖頂與岩壁上緣，谷底已沉入藍灰陰影，長影 |
| `night` | 深藍紫夜、岩壁剪影；若畫月亮**必為銀色滿月**；一個人影都沒有 |

## 交件

- `Canyon_<節點>_<時段>.webp`，**時段尾綴全小寫**（ver -774）。
- 不刪舊檔、不同名覆蓋；GPT 原稿進 `resources/_originals/background/_canyon_gpt/`。

## 進度（2026-09-06 完成）

- [x] **15/15 全部入庫**（5 節點 × day/dusk/night，cwebp q85 1536 寬）。
- [x] 全谷俯瞰地圖 `_canyon_map.webp`（設計參考，1→5 節點路線；底線開頭不被載入）。
- 原稿：GPT 日景 5 張＋地圖在 `_originals/background/_canyon_gpt/`、
  Gemini 成品原檔在 `_originals/background/_canyon_gem/`。
- [ ] `script/town.js` 的節點資料還沒接（程式 session 的事）。

### 產線對話（要重衍生時用）
| 節點 | Gemini 對話 |
|---|---|
| entry | `gemini.google.com/app/bfc2e7c5bef6ae4a` |
| corridor | `gemini.google.com/app/afc6b38749ae6d90` |
| bones | `gemini.google.com/app/f5f91df260a09c15` |
| bridge | `gemini.google.com/app/600079d63dd5c0e9` |
| altar | `gemini.google.com/app/91545197668a5125` |

GPT 原稿串（含地圖）：`chatgpt.com/c/6a9c4418-23fc-83e8-a928-fa8a94d9e45f`

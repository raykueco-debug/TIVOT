# 怪物立繪草稿（ver -577）

ChatGPT／Gemini 協作生成的怪物戰鬥立繪，**尚未接進遊戲**（底線資料夾不會被載入）。
要用哪一張、叫什麼名字、數值多少，等 Ray 的敵人卡（格式見 `script/SCRIPT_FORMAT.md` §8.5）。

## 規格

- **WebP、真 alpha 去背**（角落全透明，逐張驗過）；原 PNG 在
  `resources/_originals/monster_drafts/`（gitignore，不入版控）。
- 直式（多為 1024×1536 或 687×1024），全身入鏡不出框。
- 賽璐璐上色（平塗色塊、二三階硬邊陰影、無顆粒雜訊）、日式動漫線條（非和風）。
- **向鏡頭前衝／撲來的攻擊姿態**、低角度仰拍。

## 命名

`mon_<類別>_<特徵>.webp`；雜魚在 `mobs/`，`mob_<特徵>.webp`。

| 類別 | 意思 | 張數 |
|---|---|---|
| `relic` | 宗教聖物系（燭台、鐘、經文、香爐） | 9 |
| `chain` | 白肌＋鐵枷鎖系 | 4 |
| `plant` | 植物系 | 4 |
| `beast` | 野獸系 | 3 |
| `sea` | 深海系 | 2 |
| `brute` | 壯碩重擊型 | 2 |
| `bug` / `flesh` / `ghost` / `demon` / `armor` | 各 1 | 5 |

## 生成流程（要再生時照這個走）

- **ChatGPT**：直接要求「真正的透明背景 alpha PNG」，它做得到。
  ⚠ 血肉／撞擊類字眼會踩暴力防範機制被擋 —— 換 session 並用雕塑／浮雕語彙改寫。
- **Gemini**：生不出真 alpha → 請它畫在**純青綠底 #00B140**，再跑
  `python3 tools/chroma_cut.py <綠幕圖> <輸出>` 去背（綠幕原檔留
  `resources/_originals/monster_green/`）。
  ⚠ 細節密度偏低 —— 開場先手動上傳一張 ChatGPT 的成品當畫風錨，明顯有效。
  ⚠ 它的圖是 blob URL：`fetch` 會被擋，但 canvas 沒被污染，走
  `drawImage` + `toDataURL` 存得下來。

## 待處理

- `_originals/monster_drafts/_redo/mon_sea_coralman`：漸層背景與主體同色系，
  去背會髒 —— 要用的話重生一張。

# 美術交接 — 2026-10-15 收工（Windows）

> ⚠ 這個檔**只留一份現況**（交接規則同 `HANDOFF.md`）：開工先逐項清點給 Ray 確認，收工重寫、舊的走 `tools/recycle.sh`。
> 上一份（10-09）在 `_recycle/resources/_HANDOFF_ART.md`，git 歷史也有。
> 美術只管產圖與交件，**一行程式都不碰**（憲法鐵律 11）；交件後寫進那一批的 spec，由程式 session 接。

## 一、接下來的事項（照順序）

1. **孤舟島時段差分剩 6 張**（Gemini 10-15 額度用完，等重置）：
   - `wild`（島緣荒地）dawn／dusk／night —— ⚠ 連三次**靜默失敗**（回覆空白、無錯誤訊息），分不出是額度將盡還是這張圖被擋；先試它，再失敗就換串／換措辭。
   - `inn`（旅舍大廳，室內）dawn／dusk／night —— 室內提示詞已改成「窗外光＋室內油燈」（寫法在 `loneisle/_spec.md`）。
   - 可選：7 張 Flash 只給 1264 寬的（plaza／north／cliff／chief／lighthouse／slipway 的 dawn、west dusk）若 Ray 嫌軟，用 2528 的重跑。
2. **西泊（溫斯摩爾港）城鎮版時段差分剩 20 張**：church／cityhall／oldtown／dock／uptown／inn × dawn／dusk／night ＋ bar dusk／night。進度表在 `winsmoor_town/_spec.md` 尾段。
3. 小地圖：聖索菲亞修正（碼頭→貧民區圖示、補酒吧／餐廳點）、聖索菲亞郊外 `sofiaout`；薇拉馮德等 Ray 說開工（佈局圖已照 v3 重產）。
4. 西泊戰鬥版：城鎮版定了再做。

## 二、等 Ray 決定

- 西泊守城戰 40 格：格子太像要不要每格一張（約 +23 張）／畫風半寫實沒過平塗／城名暫名。
- 賽西莉 `call`／`ready`／`battlecry` 頭髮長而散、`pant` 左肩露出、`shyhand` 頭頂裁到 —— 要不要重畫。
- 廢城 `hallcourt`、郊外 `backhall` 要不要重畫；帝都外郊舊圖 `capital_outskirts_dusk`（厚塗）要不要換成本批 windmill。
- 插圖由 Ray 自己畫（039／040／041／043／032／碎片 01 巨大聖徒）；GPT 不及格版還在 `illustration/` 工作區未入庫，要不要回收。
- 工作區裡不是我動的：`illustration/003_lunaria_armed.webp` 在 10-14 commit 後又被覆蓋（未提交）、`34_rennacityhall.webp` 刪掉換成 `.png`（回收區無紀錄）—— 是 Ray 自己改的嗎？
- 各批生成原圖（`_gpt`／`_gem`／`_trial`／`_draft`）沒入版控，要不要移進 `_originals/`。

## 三、資產盤點（只列這一輪碰過的＋還開著的；`✔ 不欠`／`⚠ 欠`）

| 件 | 狀態 |
|---|---|
| 孤舟島日景 13 張 | ✔ 不欠 |
| 孤舟島時段差分：plaza north west east cliff chief lighthouse slipway × 三時段（24 張） | ✔ 不欠（逐格與日景並排對過） |
| 孤舟島時段差分：wild、inn × 三時段 | ⚠ 欠 6 張 |
| 孤舟島 gunsmith／canteen／store 時段差分 | ✔ 不欠 —— 有營業時間的店舖只有 day（憲法 §5） |
| 西泊城鎮版日景 15 張 | ✔ 不欠（第二版，Ray 試稿通過） |
| 西泊城鎮版時段差分 | ⚠ 欠 20 張（square／midtown 已交 6 張；cafe／sweets／店舖只有 day ✔ 不欠） |
| 帝都外郊 4 格 | ✔ 不欠 —— Ray 定只有黃昏 |
| 空中戰怪第一批 8／第二批 8 | ✔ 不欠（Ray 10-15 定案） |
| 聖索菲亞小地圖修正、sofiaout 小地圖 | ⚠ 欠 |
| 薇拉馮德小地圖 | ⏸ 等 Ray 開工 |

## 四、產線（10-15 實測，下一個人直接照做）

- **Claude in Chrome 這台連得上**（`list_connected_browsers` 直接有）。⚠ **Gemini 分頁要在螢幕上看得到**：Chrome 視窗被蓋住／縮小時分頁是 `hidden`，送出鈕、Enter、合成事件**全部送不出去**。
- **上傳**：先在頁面裡攔 `HTMLInputElement.prototype.click`（遇到 `type=file` 就存起來、不開原生對話框），再點「＋ → 上傳檔案」，用 `find` 找到那個 input 給 `file_upload`。⚠ **沒裝攔截就點上傳 → 會跳出 Windows 選檔視窗**。
  · `localStorage.__setup` 存了那段（Gemini 頁有 Trusted Types，`eval` 要先 `trustedTypes.createPolicy` 包一層）。
- **「＋」選單**：剛重載或剛跑過 JS 之後的第一下常常被吃掉 → 每次點完截圖確認選單開了再點選項。
- **送出**：點送出鈕（JS 量位置）；**等 40~50 秒後重載那個對話網址**才看得到圖（頁面常常不刷新，回覆顯示空白但其實有圖）。
- **新對話偶爾拿不到網址（一直轉圈）**：中止，改在既有能出圖的串裡送，提示詞開頭加「只看我這次上傳的這張圖」。
- **Pro 會開始回「我只是語言模型」**（嗆一句也沒用）→ 改用 Flash。兩個模型都可能給 1264 或 2528 寬。
- **下載**：hover 圖、點右上「下載原尺寸」（真點擊），落在 `~/Downloads`。⚠ **只收點下載之後才出現的檔**（`find -newer marker`）—— Downloads 裡躺著舊的 Gemini 下載，10-15 就因此整批錯位一格。
- 交件：`_gem/_raw_<鍵>_<時段>.jpg` → LANCZOS 縮成 1536×1024、webp q90；每格做完拼四張並排對一次。

## 五、工作區裡不是美術的東西（不要動）

`tools/anim/*`、`resources/ci/layers/*`（動畫 session 的）、`script/speakers.js` 的未提交改動（Ray 本機在調）。

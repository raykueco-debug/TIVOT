# 帝都外郊 —— 4 格直線（10-14，Windows 美術 session）

> Ray：「一個是"帝都外郊"，終點是安雅躲藏的廢風車，殘破的外郊村落，大概四格直線就可以，
> 從帝都城外、河畔，越走越偏遠的感覺」

- **產法**：GPT，每格一個新對話；只上傳一張畫風參考（不給草稿），內容與出口寫在提示詞裡。
  畫風規則同西泊城鎮版第二版（線條密度照參考、標準鏡頭、偏灰柔和、不要直射光斑）。
- ⚠⚠ **這一系列只有黃昏**（Ray 10-14：「帝都外郊系列都是黃昏」）——不做其他時段差分，程式端接的時候要寫 `noTime`／硬指定 dusk。
- **檔名**：`outer_<鍵>_dusk.webp`（1536×1024），總覽 `_sheet4.jpg`；GPT 原輸出 `_gpt/_raw_<鍵>_dusk.png`（城外、河畔另有先畫的白天版 `_raw_<鍵>_day.png`，不用），皆不進版控。

| # | 鍵 | 名稱 | 內容 | 出口 | 畫風參考 | 黃昏 |
|---|---|---|---|---|---|---|
| 1 | gate | 帝都城外 | 帝都城牆與城門在身後（畫面近處一側／遠景），出城的石板路轉成土路、路邊零星的低矮民房與菜園 | up→river／back＝帝都 | capital_downtown_day | ✔ |
| 2 | river | 河畔 | 沿河的土路、蘆葦與柳樹、舊石橋、遠處帝都輪廓變小 | up→village／back | shinier_wilds_day | ✔ |
| 3 | village | 殘破的外郊村落 | 被遺棄的村子：屋頂塌陷、門窗釘死、雜草從石縫長出、倒下的籬笆與手推車；沒有人 | up→windmill／back | shinier_west_day | ✔ |
| 4 | windmill | 廢風車（終點） | 荒草丘上一座殘破的石基木造風車、扇葉破爛、周圍碎石牆與廢車；安雅躲在這裡（**不畫人**）。內容照既有 `capital/capital_outskirts_dusk.webp`，畫風改成本批 | back | shinier_wilds_day | ✔ |

- ⚠ 既有 `capital_outskirts_dusk.webp`（劇情硬指定）畫風是厚塗，與本批不同；本批第 4 格出完後要不要取代它由 Ray 決定（程式端接）。
- ✔ 不欠：時段差分（刻意只有黃昏，Ray 定）。

## ✔ 程式端要接的 —— 已完成（程式 session ver -2197／-2198）

- 已接：`capital_outer` 4 格（全 `noTime` 黃昏）；廣場下方只在返回帝都追安雅那一段通外郊，平時照舊出航（Ray 定）；後半段對白改在廢風車那一格演；章節多了「Stage 17　帝都廣場」。
- ⚠ 舊 `capital/capital_outskirts_dusk.webp` 已不再被引用 —— 要不要回收由 Ray 決定。

### 原交接內容（留作紀錄）（美術 session 10-15 寫，Ray：「把帝都荒野接上，然後開回帝都的劇情給我」）

> 美術 session 依鐵律 11 不動程式；以下交程式 session 照做。

1. **`script/town.js` 新增一張 4 格直線地圖**（建議鍵 `capital_outer`，名「帝都外郊」）：
   `gate`(up→river／back→帝都) → `river`(up→village) → `village`(up→windmill) → `windmill`(末端，只有 back)。
   各格 `back` 照通則（`exits:{ up:<下一格>, back:<上一格> }`），出口兩端相反（lint 會驗）。
   ⚠ **從帝都哪一格出城、是不是用 `@capital_outer` 跨圖出口** —— Ray 未定，接之前問他。
2. **背景只有黃昏**：每格 `bg:'outer_<鍵>_dusk', noTime:true`（檔在 `resources/background/capital_outer/`）。
   ⚠ 不寫 `noTime` 的話候選鏈會先試別的時段，而這系列刻意只有黃昏（Ray 定）。
   ⚠ `script/bg_index.js` 照既有流程登記（若那支是工具產生就重跑工具，不要手打）。
3. **返回帝都的風車荒地那一拍**（`script/town.js:1141`，`bg:'capital_outskirts_dusk'`）：
   要不要換成本批的 `outer_windmill_dusk` —— **Ray 決定**（舊圖是厚塗畫風、與本批不一致）。
4. 驗：`py tools/script_lint.py`；`python3 tools/bust.py --bump`（本批是新檔，不是同名覆蓋）。

# 空中戰敵人：全部改畫側面飛行圖 — 交件單（程式 → 美術）

> Ray（ver -2468 之後）：「把空中戰的敵人全部畫成側面飛行圖」

## 為什麼／朝向
戶外空戰的天空改成往左捲的分層視差（`_sky_parallax/_spec.md`），讀起來是我方往右飛。
⇒ **側面圖一律頭朝左**（迎著我們飛來、從右前方逼近）。程式端要翻可以翻，但交件請統一朝左。

## 範圍（`config.js` 的 ASSETS 鍵 → 現檔）
- 空中怪 16 隻（`SKY_FLIGHT_KINDS`）：`mon_sky_twinwyvern` / `boneray` / `ribwhale` / `mawbat` / `eyemoth` / `eelswarm` / `gasjelly` / `armorcrab`，
  `mon_sky2_spine` / `maskbanner` / `ringchain` / `mouthpillar` / `facecrown` / `eyeveil` / `rift` / `maw`
  （孤舟島四個空之主 li_lord1～4 與 li_south 用的就是其中幾隻，畫一次就好）
- 羽蛇 `serpent`、巨型蜈蚣 `centipi`（day/dd/night 三張）
- 貝利薩爾空中龍 `mon_dragon_v1_flight`（bl_sky）
- 空賊船 `pirate_ship`（若它算空中戰，側面船身）
- ⛔ 不重畫：古城樹寄生石龍（已是側飛動檔）

## 規格
- 全身側面、飛行姿態（翼展開／游動中），**頭朝左**，四邊留白至少 12%（同飛行怪那一條，不要被裁）
- 真 alpha（產圖端直出或 GPT 重製去背，不要本機去背）
- 尺寸比照現檔（多為直式 1024×1536；側面若改橫式請在下方註明，程式端會重量取景）
- 四鐵則照舊；同一隻原本的設計、配色、特徵不變，只換成側面
- 交件放 `resources/enemy/`，**新檔名** `mon_<名>_side.webp`（不要同名覆蓋，程式端改指向）

## ⚠ 程式端要接的（美術不碰 code）
交件後列在這裡：哪幾隻交了、尺寸。程式端改 ASSETS 指向＋逐隻重量取景（fit）。

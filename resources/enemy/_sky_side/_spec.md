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

### ✅ 美術交件（2026-11-05）—— 20 隻全交

**全部 1536×1024 橫式、真 alpha（GPT 直出；3 張白底的由 GPT 重製成 alpha）、頭朝左、四邊各留 12%（本機只做裁邊＋等比縮放置中，不動像素）。**
放在 `resources/enemy/`：

| 新檔 | 對應原檔 |
|---|---|
| `mon_sky_twinwyvern_side` / `boneray` / `ribwhale` / `mawbat` / `eyemoth` / `eelswarm` / `gasjelly` / `armorcrab` `_side` | `mon_sky_*` 8 隻 |
| `mon_sky2_spine` / `maskbanner` / `ringchain` / `mouthpillar` / `facecrown` / `eyeveil` / `rift` / `maw` `_side` | `mon_sky2_*` 8 隻 |
| `mon_serpent_side` | `serpent_day/dd/night`（原檔是連背景的整張圖；側面版只有怪本身） |
| `mon_centipi_side` | `centipi_day/dd/night`（同上） |
| `mon_dragon_v1_flight_side` | `mon_dragon_v1_flight` |
| `mon_pirateship_side` | `pirateship_day/dd/night`（船頭朝左，同上沒有背景） |

- ⚠ 羽蛇／蜈蚣／空賊船原本是**三個時段各一張（含背景）**，側面版**只交一張中性光的**——背景改由空戰視差層負責。要分時段色調的話再交辦。
- ⚠ 原圖是正面／俯角，側面是 GPT 依原設計推的：配色材質特徵一致，但細部（翼骨數、腳數）不保證逐根相同。
- 總覽（本機）：`_work/sky_side_overview.jpg`。程式端改 ASSETS 指向＋逐隻重量取景（fit）。

## ✔ 程式端已接（ver -2471）
20 隻全部改指向 `enemy_*_side`；羽蛇／蜈蚣／空賊船補上分層天空背景。側面版目前是靜態圖（舊的正面待機動畫不套用），要動畫另交辦。

## ⚠ 第二件：側面版的待機動畫（Ray：「要，轉給美術」，ver -2471 之後）
20 隻側面圖各做一支**飛行待機 loop**（振翅／游動／漂浮），取代舊的正面 idle。
- 輸出 `resources/enemy/anim/mon_<名>_side_idle_v1/`：`frame_NN.webp` ＋ `anim.json`（`canvas`／`box`／`frames`／`fps`／`loop:true`），格式照既有的 `mon_sky_*_idle_v1`。
- 走既有動畫產線（Wan，不准程式拼／交叉淡化；整張要活，見 memory 的動畫規矩）；有翅的照「有翅怪振翅模式」寬畫布。
- 頭朝左、首尾接得上（loop）、真 alpha、四邊留白。
- 交件後在這裡列出哪幾隻好了 —— 程式端在 `config.ENEMY_IDLE` 加 `mon_<名>_side` 一列就會播（照檔名查，不必改卡）。

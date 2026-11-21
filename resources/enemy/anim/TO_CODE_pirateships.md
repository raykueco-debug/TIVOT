# 空賊船 8 艘 —— 交件單（空戰動畫副理 → 程式 session）

> Ray 11-20：「海賊船多做幾艘不同風格 19世紀晚期到20世紀風格 大部份是木造船貼金屬蒙皮 還有一些蒸氣帆船」
> → 九宮格定稿（Ray 在同串自己改：船身加長、帆統一黑、不要旋轉砲台）→ 「除了9都可以用」→ 11-21「可以，交件排待機」

## ✅ 立繪交件（11-21）

全部 **1536×1024 橫式、真 alpha（GPT 直出 RGBA）、船頭朝左、四邊各留 12%**（本機只做裁邊＋等比縮放置中），格式同 `mon_pirateship_side_v2`。
放在 `resources/enemy/`：

| 檔 | 型 | 特徵（取名參考，名字 Ray 定） |
|---|---|---|
| `mon_pirateship_n1_side.webp` | 木殼包鐵皮 | 現行那艘加長版：三桅、9 門側舷砲、艦橋窗列 |
| `mon_pirateship_n2_side.webp` | 木殼包鐵皮 | 紅褐細長快船、兩桅、砲少 |
| `mon_pirateship_n3_side.webp` | 木殼包鐵皮 | 灰色鐵甲、紅色船底、單主桅、舷側管線 |
| `mon_pirateship_n4_side.webp` | 木殼包鐵皮 | 橄欖綠雙桅縱帆船、圓舷窗、輕巧 |
| `mon_pirateship_n5_side.webp` | 木殼包鐵皮 | 深藍三桅巡防艦、兩層砲門、重火力 |
| `mon_pirateship_n6_side.webp` | 木殼包鐵皮 | 灰紅砲艇、單桅、低矮 |
| `mon_pirateship_n7_side.webp` | 蒸汽帆船 | 紅煙囪、側明輪、雙桅 |
| `mon_pirateship_n8_side.webp` | 蒸汽帆船 | 淺灰鐵甲、雙煙囪、5 門側砲、雙桅 |

原檔／九宮格／比對圖：`resources/_originals/enemy/pirateship_variants/`（`_README.md`）。

## ⚠ 程式端要接的（美術不碰 code，鐵律 11）
1. `config.js` 的 ASSETS 加 8 個鍵（例 `enemy_pirate_n1_side` → 上表檔名），照 `enemy_pirate_side` 那一列。
2. 敵人卡：現行只有一張 `pirate_ship`。這 8 艘要**各開一張卡**還是**同一張卡隨機抽外觀**、數值與名字，**Ray 未定**——先問他。
3. 取景（`fit`）：比例與 `mon_pirateship_side_v2` 相同（1536×1024、四邊 12%），照它的值應該就對；逐隻看一眼。
4. 待機：Wan 在跑（`ComfyUI-master/tivot_wan/out/sky_ships/`），Ray 剪完交件後補在下面，屆時 `config.ENEMY_IDLE` 加 `mon_pirateship_nN_side` 一列即可。

## 待機交件進度
| 鍵 | 狀態 |
|---|---|
| n1～n8 | ⏳ Wan 生成中（720×480、49 格、帆鼓動＋船身浮沉＋螺旋槳；7、8 號加煙囪冒煙、7 號明輪轉）→ auto_cut → Ray 在 animechk 剪 |

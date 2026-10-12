# 給程式 session：怪物待機改「一拍二」＋新交 9 隻（動畫 session 2026-10-12）

> Ray：「人以外的待機全部 f 數減半 freeze x2 交件」
> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

## 1. 已交件的 87 隻怪 → 改指 `_idle_v2`

- 每隻新開 `resources/enemy/anim/mon_*_idle_v2/`（v1 不動、不覆蓋）。
- 內容＝v1 的偶數格（0,2,…,22）→ **12 格、`fps:4`**，總長仍 3 秒；`canvas`／`box`／`px` 照抄 v1。
  （引擎是等間隔播 `1000/fps`，沒有單格停留，所以「每格停 2 倍」＝ fps 減半。）
- 總大小 117 MB → 59 MB（解碼記憶體也減半）。
- **要改的**：`config.js` 的 `ENEMY_IDLE`，所有 `mon_*` 那幾行 `_idle_v1/` → `_idle_v2/`。
  ⚠ **人類不改**：`man_misha`（`_idle_v1`）、米夏夢魘化（卡上 `idle:'…man_misha_ni_idle_s60/'`）維持 24 格 8fps。
- 接完、Ray 確認之後，v1 那 87 個資料夾走 `tools/recycle.sh` 回收。

## 2. 新交 9 隻（直接就是一拍二：12 格 fps 4）

| 立繪 | 資料夾 | 備註 |
|---|---|---|
| `mon_canyon_colossus_dark` | `mon_canyon_colossus_dark_idle_v1/` | 卡耶爾谷底 Boss（`canyon_colossus`）—— **現在就能接** |
| `mon_sky_twinwyvern` | `mon_sky_twinwyvern_idle_v1/` | 空中戰：**還沒有敵人卡**，接卡時一起補 `ENEMY_IDLE` |
| `mon_sky_boneray` | `mon_sky_boneray_idle_v1/` | 同上 |
| `mon_sky_ribwhale` | `mon_sky_ribwhale_idle_v1/` | 同上 |
| `mon_sky_mawbat` | `mon_sky_mawbat_idle_v1/` | 同上 |
| `mon_sky_eyemoth` | `mon_sky_eyemoth_idle_v1/` | 同上 |
| `mon_sky_eelswarm` | `mon_sky_eelswarm_idle_v1/` | 同上 |
| `mon_sky_gasjelly` | `mon_sky_gasjelly_idle_v1/` | 同上 |
| `mon_sky_armorcrab` | `mon_sky_armorcrab_idle_v1/` | 同上 |

- ⚠ 飛行怪振翅會超出原圖，**`box` 有負數、寬度超過 canvas**（例：ribwhale `[-215,-114,1453,1538]`）。
  格式與 v1 相同（box＝x,y,w,h，座標是原圖畫布），`canvasBoxInTop` 照算即可；請實測一次翼尖沒有被 `#top` 以外的東西裁掉。

## 3. 進行中（今晚整夜批次）：人型＋群戰每個人的待機

- 單人：尼莫、賞金獵人 EP、公會賞金獵人、惡棍 6 種（24 格 8fps，人不減半）。
- **群戰**（Ray：「群體敵人已經拆分了 可以做」）：惡棍 5 場 26 人、帝都衛士 4 場 16 人、米夏親衛隊 3 人、卡耶爾禍魘大軍 11 組 44 隻（怪 → 12 格 4fps）。
  每個人一組影格，座標＝**那一層的畫布**（分層與美術原稿同畫布，已比對）——格式同中槍倒地（`<組>_hit_v1/<人>/`）。
- 不透明整張插圖的三張（`man_sorana`、`gunwitch_boss_ci`、`saint_gt_ci`）沒有 alpha，綠幕做不了，另試「整張生成＋首尾鎖」的循環；
  **無臉巨人 `saint_gt_ci` 照怪的規格**（12 格 4fps，Ray 10-12），另兩張照人的規格。
  ⚠ 群戰目前 `idleDirFor` 直接回 null（`en.group`）：**要接得讓每一層各自播自己的循環、被打倒時切到倒地動畫**。交件後另寫一份。

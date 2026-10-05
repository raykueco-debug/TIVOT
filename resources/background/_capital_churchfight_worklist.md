# 帝都：教廷衛士戰的戰鬥背景（10-05 晚開單，Ray 交辦）

> Ray：「旅店 上街區 攝政王廣場 舊街區 碼頭都會與教廷衛士發生戰鬥 一次都是一群」
> 「戰鬥時間是深夜 路上沒人 只是我覺得體量跟角度都不適合 旅店太小 上街區太窄 廣場太大 舊街區還行 碼頭根本沒地站」
> → 旅店＝**大廳（室內）**；舊街區**照另外四張的取景重畫**。

## 規格（五張共通）
- 深夜、無人、**單張**（不做時段差分 ⇒ 程式端 `noTime:true`）。
- 中景、接近平視；畫面中段留 10~25 m 深的空地，站得下 3~5 人的群體敵人。
- 建築以該地點現有背景為參考（地點認得出來），構圖重做。
- 銀藍月光；朝向不明 ⇒ 不畫月亮本體（§5）。
- 產法：GPT 一張 → 有顆粒才過 Gemini（§5 場景分工）。
- 1536×1024 WebP，交件 `resources/background/capital/capital_<地點>_battle.webp`。

## 盤點
| 地點 | 參考 | 取景 | 狀態 |
|---|---|---|---|
| 攝政王廣場 | `capital_square_midnight` | 廣場一角：雕像基座＋路燈當前景，對面建築拉近 | ✔ 已出（待 Ray 驗收） |
| 旅店大廳 | `capital_hotel_night` | 家具推開、大廳中央空出 | ✔ 已出（待 Ray 驗收） |
| 上街區 | `capital_uptown_midnight` | 最寬的一段／十字路口 | ✔ 已出（待 Ray 驗收） |
| 舊街區 | `capital_downtown_midnight` | 同上規格重畫 | ✔ 已出（待 Ray 驗收） |
| 碼頭 | `capital_dock_night` | 倉庫前的寬石砌碼頭，水面只在後方 | ✔ 已出（待 Ray 驗收） |

交件（10-05 晚）：`resources/background/capital/capital_{hotel,uptown,square,downtown,dock}_battle.webp`，原 PNG 在 `resources/_originals/background/capital/_battle_wip/`。
天空 100% 看過無顆粒 ⇒ 沒過 Gemini。⚠ 新檔名、不是同名覆蓋 ⇒ 不必動 `ASSET_VER`；單張 ⇒ 節點／戰鬥卡要 `noTime:true`。

## 群體敵人（另單，待 Ray 決定）
教廷衛兵 a~f（`resources/_originals/SI/NPC/_vela_v2/church_guard_si_*.png`）組成 3~5 人群體圖（拔刀／射擊／遠處奔來），最後一場最多人。

## 程式端要接的（交件後，鐵律 11：美術不碰）
戰鬥卡／敵人卡（`kind:'human'`）、五格的 `acts`、戰鬥背景指向上表檔名。

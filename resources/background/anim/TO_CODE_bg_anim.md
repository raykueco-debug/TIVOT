# 給程式 session：背景動畫（美術 session 2026-11-07）

> 美術 session 不碰程式（憲法鐵律 11），要接的寫在這裡。接完請在 HANDOFF 註記。
> ⚠ 尚未 commit，等 Ray 決定。

## 格式：mp4（Ray 11-07 定案「改交 mp4」）

逐格 webp 在手機上太重（一支 6–7 MB、全解開約 88 MB 記憶體、每秒換 16–24 張大圖會發熱，鐵律 12）。
改交 H.264 mp4，交給硬體解碼。編碼參數同 CI／插畫動畫（anim-deliver）：
`libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an`
（已在 Chrome 實測：播出來的顏色與原格平均差 1.8，不偏色。）

## 已交

| 背景 | 檔案 | 長度 | 大小 |
|---|---|---|---|
| `forest/forest_trail_day` | `anim/forest/forest_trail_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 796 KB |
| `forest/forest_valley_day` | `anim/forest/forest_valley_day_loop_v1.mp4` | 56 格 24fps（2.3 秒） | 648 KB |
| `dunmor/dunmor_oakgrove` | `anim/dunmor/dunmor_oakgrove_loop_v1.mp4` | 32 格 24fps（1.3 秒） | 360 KB |
| `capital_outer/outer_village_dusk` | `anim/capital_outer/outer_village_dusk_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1708 KB |
| `fallen/fallen_altar_day` | `anim/fallen/fallen_altar_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 936 KB |
| `fallen/fallen_basin_day` | `anim/fallen/fallen_basin_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1183 KB |
| `fallen/fallen_causeway_day` | `anim/fallen/fallen_causeway_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 955 KB |
| `fallen/fallen_entry_day` | `anim/fallen/fallen_entry_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 815 KB |
| `fallen/fallen_fork_day` | `anim/fallen/fallen_fork_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 989 KB |
| `forest/forest_entry_day` | `anim/forest/forest_entry_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1089 KB |
| `forest/forest_glade_day` | `anim/forest/forest_glade_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 793 KB |
| `forest/forest_highland_day` | `anim/forest/forest_highland_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1485 KB |
| `forest/forest_shoal_day` | `anim/forest/forest_shoal_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1026 KB |
| `shinier/shinier_wilds_day` | `anim/shinier/shinier_wilds_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 920 KB |
| `sofia/sofiaout_avenue` | `anim/sofia/sofiaout_avenue_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1955 KB |
| `sofia/sofiaout_forecourt` | `anim/sofia/sofiaout_forecourt_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1372 KB |
| `sofia/sofiaout_lodge` | `anim/sofia/sofiaout_lodge_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1524 KB |
| `sofia/sofiaout_road` | `anim/sofia/sofiaout_road_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1439 KB |
| `sofia/sofiaout_terrace` | `anim/sofia/sofiaout_terrace_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1420 KB |
| `winsmoor/ws_farm_day` | `anim/winsmoor/ws_farm_day_loop_v1.mp4` | 56 格 16fps（3.5 秒） | 1532 KB |

> 11-08 追加 17 支（Ray 核可）。**只交 mp4**，沒有逐格資料夾。時段：檔名帶 `_day`／`_dusk` 的只有那個時段有動畫，其餘時段照舊靜態；不帶時段的（`sofiaout_*`）整天都用。
> ⚠⚠ 11-08 Ray 定案「背景一律拆層跑」：上表這幾支是**整張丟 Wan** 做的（循環是往前再擺回來），**之後會改成分層版重交**（天空／雲由程式捲動、只有樹葉草叢等是影片層），格式另寫。時段差分那一批已停掉，不會再交整張版。

- 同名資料夾裡的逐格 webp＋`anim.json` 是原料（`anim.json` 有 `bg` 對應的靜態背景鍵）；遊戲只要讀 mp4。
- 影片是 **768×512**，靜態背景是 1536×1024 —— 構圖相同，播放時放大兩倍蓋在同一位置。
- 時段：森林那兩支只有 **day** 有動畫，其他時段照舊靜態；敦莫爾橡樹林本來就沒有時段差分，整天都用。

## 播放要求

- `<video muted playsinline loop autoplay>`（iOS 要靜音＋頁內播放才肯自動播）。
- ⚠ 有些瀏覽器在 `loop` 接回開頭時會頓一格，要實機（手機）測；頓的話改成在結尾前 `currentTime=0` 自己接。
- 由那張探索地圖自己的讀取門載（鐵律 13），離開那張地圖就收掉（鐵律 10）。
- 第一幀出來之前先顯示靜態背景，影片 `playing` 之後再蓋上去，避免黑一下。

## 之後

Ray 11-07：「戶外樹葉背景都用這個方式」—— 後續陸續交同格式的戶外背景 mp4，命名照 `anim/<系列>/<背景名>_loop_v1.mp4`。
雲海那幾張（森林懸崖、孤舟島懸崖、孤舟島荒野）改走**分層**（背景＋遠雲＋近雲＋前景，雲由程式橫向捲動），格式另議。

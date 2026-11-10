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

---

## 11-10 新格式：拆層（Ray 定案「有方向性的如雲給程式，其他走 ABA」）—— ⚠ 樣本，等 Ray 點頭再全面接

> 上面 11-07／11-08 那 20 支「整張丟 Wan」的 mp4 **作廢**（不拆層、循環是來回），不要接。

每一格背景由下往上疊三樣：

| 層 | 檔案 | 怎麼動 |
|---|---|---|
| ① 雲（程式捲） | `resources/background/_sky_layers/<天空組>_l0_far.webp`（不透明）／`_l1_mid.webp`（alpha）／`_l2_near.webp`（alpha） | 三層都**左右無縫**，整張重複排列、**往右**捲；捲過一整張的秒數：l0 **160**／l1 **70**／l2 **32**（遠慢近快）。寬高照背景畫面 cover。**同一張地圖的各格共用一組**（卡耶爾山谷＝`canyon_day`）。與空戰的 `tuning.skyPan`／`setSkyPan` 同一套做法 |
| ② 場景影片（ABA） | `resources/background/anim/<系列>/<背景名>_aba_v1.mp4` | `<video muted playsinline loop autoplay>`；布、燈籠、天光等在動（A→B→A，接成一圈）；天空以外的部分＝原圖 |
| ③ 天空挖空遮罩 | `resources/background/anim/<系列>/<背景名>_sky.webp`（白色，**alpha＝天空**） | 把②的天空那一塊挖掉（canvas：畫影片 → `destination-out` 畫這張），讓①透出來 |

- 參考實作（可以直接照抄邏輯）：`tools/anim/bg_layer/annotate.html` 的 `startLive()`（雲三層捲＋影片挖天空，每幀一次）。
- 影片 1536×1030、16fps、H.264（同既有參數）。靜態背景照常先顯示，影片 `playing` 後再蓋上去。
- 時段：目前只有 **day**；其他時段照舊靜態。
- 讀取：由那張探索地圖自己的門載（鐵律 13），離開就收（鐵律 10）。
- ⚠ 雲在手機上要看效能：三層 1536 寬的圖每幀平移，比影片解碼還輕，但要實機量一次。

### 卡耶爾山谷（canyon，day）樣本

| 格（節點） | 影片 | 格數 | 天空遮罩 |
|---|---|---|---|
| entry 峽谷入口 | `anim/canyon/canyon_entry_day_aba_v1.mp4` | 48 | `canyon_entry_day_sky.webp` |
| corridor 風蝕迴廊 | `anim/canyon/canyon_corridor_day_aba_v1.mp4` | 52 | `canyon_corridor_day_sky.webp` |
| bones 白骨之地 | `anim/canyon/canyon_bones_day_aba_v1.mp4` | 55 | `canyon_bones_day_sky.webp` |
| bridge 斷橋 | **✔ Ray 11-10 可交**：`anim/canyon/canyon_bridge_day_abcd_v1.mp4`（純 Wan 整張、ABCD 真循環） | 191 | **不用**（雲海就在影片裡，不疊雲層） |
| altar 谷底祭場 | **✔ Ray 11-10 可交**：`anim/canyon/canyon_altar_day_pure_v1.mp4`（純 Wan 整張，見下） | 61 | **不用**（天空就是原圖，不疊雲層） |

**純 Wan 整張（第四種接法，11-10）**：整張畫面就是那支影片（天空保持原圖、不疊雲層、不挖空），直接 `<video muted playsinline loop autoplay>` 蓋在靜態背景上即可。目前有谷底祭場、斷橋。

雲：`_sky_layers/canyon_day_l0_far.webp`／`canyon_day_l1_mid.webp`／`canyon_day_l2_near.webp`。
⚠ ABA 兩個接點還比一般兩格大（約 1.5～2.5 倍），等 Ray 看過決定要不要再修。


## 11-10 Ray 看過可交（整張影片，直接蓋）

做法同上面的「純 Wan 整張」接法：**一支 mp4 就是整張畫面**（只有會動的那幾塊是 Wan，其餘、包括天空都是原圖），
`<video muted playsinline loop autoplay>` 蓋在靜態背景上即可，**不疊雲層、不用天空遮罩**。16fps、1536 寬。

| 格 | 影片 | 格數 | 天空遮罩 |
|---|---|---|---|
| 羅賽爾廢城　石棺墓 | `anim/dunmor/dunmor_cistgrave_aba_v1.mp4` | 42 | 不用（天空就是原圖） |
| 羅賽爾廢城　石首龕 | `anim/dunmor/dunmor_headshrine_aba_v1.mp4` | 50 | 不用（天空就是原圖） |
| 羅賽爾廢城　內壘門 | `anim/dunmor/dunmor_innergate_aba_v1.mp4` | 71 | 不用（天空就是原圖） |
| 羅賽爾廢城　王塚 | `anim/dunmor/dunmor_kingsbarrow_aba_v1.mp4` | 55 | 不用（天空就是原圖） |
| 羅賽爾廢城　王廳廢墟 | `anim/dunmor/dunmor_kingshall_aba_v1.mp4` | 69 | 不用（天空就是原圖） |
| 夏爾森林　岩窟 | `anim/shinier_forest/forest_cave_day_aba_v1.mp4` | 62 | 不用（天空就是原圖） |
| 夏爾森林　淺灘 | `anim/shinier_forest/forest_shoal_day_aba_v1.mp4` | 48 | 不用（天空就是原圖） |
| 里朋莊園　莊園門房 | `anim/sofiaout/sofiaout_lodge_aba_v1.mp4` | 53 | 不用（天空就是原圖） |

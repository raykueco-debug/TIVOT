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
| 里朋莊園　噴泉前庭 | `anim/sofiaout/sofiaout_forecourt_abcd_v1.mp4` | 57 | 不用（整張含天空都是影片） |
| 里朋莊園　地下囚室 | `anim/sofiaout/sofiaout_cellar_abcd_v1.mp4` | 57 | 不用（天空就是原圖） |
| 里朋莊園　棕櫚車道 | `anim/sofiaout/sofiaout_avenue_abcd_v1.mp4` | 61 | 不用（整張含天空都是影片） |

> 11-10 追加三支（Ray 核可）。這三支取代 11-08 那張表裡 `anim/sofia/` 的 forecourt／avenue 舊版（接新檔即可）。
| 夏爾森林　河谷 | `anim/shinier_forest/forest_valley_day_abcd_v1.mp4` | 60 | 不用（整張含天空都是影片） |
| 夏爾森林　舊獵道 | `anim/shinier_forest/forest_trail_day_abcd_v1.mp4` | 57 | 不用（整張含天空都是影片） |
| 夏爾森林　森林入口 | `anim/shinier_forest/forest_entry_day_abcd_v1.mp4` | 107 | 不用（天空就是原圖） |

> 11-10 追加三支（Ray 核可）。取代 11-08 表裡 `anim/forest/` 的 valley／trail／entry 舊版（接新檔即可）。
| 夏爾森林　遺蹟入口 | `anim/shinier_forest/forest_ruins_day_abcd_v1.mp4` | 56 | 不用（整張含天空都是影片）；靜態圖是 `ruins_shinier_entrance_day` |

> 11-12 第二批（Ray 核可；天空是程式雲合成進影片，整張蓋上去即可）
| 夏爾森林　高地 | `anim/forest/forest_highland_day_sep_v1.mp4` | 264 | 不用（整張含天空都是影片） |
| 石製遺蹟　祭壇 | `anim/fallen/fallen_altar_day_sep_v1.mp4` | 399 | 不用（整張含天空都是影片） |
| 石製遺蹟　沉水石坑 | `anim/fallen/fallen_basin_day_sep_v1.mp4` | 270 | 不用（整張含天空都是影片） |
| 帝都外郊　河畔 | `anim/capital_outer/outer_river_dusk_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 帝都外郊　廢風車 | `anim/capital_outer/outer_windmill_dusk_sep_v1.mp4` | 390 | 不用（整張含天空都是影片） |
| 帝都外郊　城外 | `anim/capital_outer/outer_gate_dusk_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 平原古道　烽燧臺 | `anim/plains/plains_beacon_day_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 伊甸古墓（Ray 核可；室內整張照 F 系列跑，只交一圈，整張蓋上去）
| 伊甸古墓　廢坑道 | `anim/tomb/tomb_adit_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 伊甸古墓　側廊 | `anim/tomb/tomb_aislew_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　繞行廊 | `anim/tomb/tomb_ambulatory_sep_v1.mp4` | 102 | 不用（整張含天空都是影片） |
| 伊甸古墓　灰坑 | `anim/tomb/tomb_ashpit_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　骨坑 | `anim/tomb/tomb_bonepit_sep_v1.mp4` | 92 | 不用（整張含天空都是影片） |
| 伊甸古墓　誦經室 | `anim/tomb/tomb_chantry_sep_v1.mp4` | 81 | 不用（整張含天空都是影片） |
| 伊甸古墓　禮拜堂 | `anim/tomb/tomb_chapel_sep_v1.mp4` | 83 | 不用（整張含天空都是影片） |
| 伊甸古墓　藏骨所 | `anim/tomb/tomb_charnel_sep_v1.mp4` | 82 | 不用（整張含天空都是影片） |
| 伊甸古墓　蓄水池 | `anim/tomb/tomb_cistern_sep_v1.mp4` | 90 | 不用（整張含天空都是影片） |
| 伊甸古墓　迴廊 | `anim/tomb/tomb_cloister_sep_v1.mp4` | 98 | 不用（整張含天空都是影片） |
| 伊甸古墓　列柱廊 | `anim/tomb/tomb_colonnade_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 伊甸古墓　告解所 | `anim/tomb/tomb_confessio_sep_v1.mp4` | 108 | 不用（整張含天空都是影片） |
| 伊甸古墓　長廊 | `anim/tomb/tomb_corr2_sep_v1.mp4` | 92 | 不用（整張含天空都是影片） |
| 伊甸古墓　十字交會 | `anim/tomb/tomb_crossing_sep_v1.mp4` | 86 | 不用（整張含天空都是影片） |
| 伊甸古墓　十字墓窖 | `anim/tomb/tomb_crossvault_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 伊甸古墓　家族墓室 | `anim/tomb/tomb_crypta_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 伊甸古墓　石棺主室 | `anim/tomb/tomb_crypt_sep_v1.mp4` | 98 | 不用（整張含天空都是影片） |
| 伊甸古墓　墓道 | `anim/tomb/tomb_cryptwalk_sep_v1.mp4` | 98 | 不用（整張含天空都是影片） |
| 伊甸古墓　墓道深處 | `anim/tomb/tomb_deepwalk_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　玄室前廊 | `anim/tomb/tomb_gallery3_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　柱廳 | `anim/tomb/tomb_hall2_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　焚化窯 | `anim/tomb/tomb_kiln_sep_v1.mp4` | 89 | 不用（整張含天空都是影片） |
| 伊甸古墓　二層梯廳 | `anim/tomb/tomb_landing2_sep_v1.mp4` | 95 | 不用（整張含天空都是影片） |
| 伊甸古墓　底層梯廳 | `anim/tomb/tomb_landing3_sep_v1.mp4` | 108 | 不用（整張含天空都是影片） |
| 伊甸古墓　碑廊 | `anim/tomb/tomb_lapidarium_sep_v1.mp4` | 88 | 不用（整張含天空都是影片） |
| 伊甸古墓　中殿 | `anim/tomb/tomb_nave_sep_v1.mp4` | 100 | 不用（整張含天空都是影片） |
| 伊甸古墓　骨甕廊 | `anim/tomb/tomb_ossuarya_sep_v1.mp4` | 79 | 不用（整張含天空都是影片） |
| 伊甸古墓　底層階梯 | `anim/tomb/tomb_stair2_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 伊甸古墓　積水坑 | `anim/tomb/tomb_sump_sep_v1.mp4` | 95 | 不用（整張含天空都是影片） |

> 11-12 伊甸古墓 重跑 5 格（Ray 核可；只交一圈）
| 伊甸古墓　破碎廊道 | `anim/tomb/tomb_brokenhall_sep_v1.mp4` | 90 | 不用（整張含天空都是影片） |
| 伊甸古墓　排煙井 | `anim/tomb/tomb_chimney_sep_v1.mp4` | 86 | 不用（整張含天空都是影片） |
| 伊甸古墓　碎石陷落 | `anim/tomb/tomb_graveldrop_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　表層階梯 | `anim/tomb/tomb_stair1_sep_v1.mp4` | 89 | 不用（整張含天空都是影片） |

> 11-12 伊甸古墓 香爐室（Ray 核可；煙是程式畫的、只往前，交整段，loop 播即可）
| 伊甸古墓　香爐室 | `anim/tomb/tomb_censerroom_sep_v1.mp4` | 303 | 不用（整張含天空都是影片） |

> 11-12 北方泊地 戰損版 4 張（Ray 核可；室外天空／雲／煙是程式合成進影片，整張蓋上去）
| 北方泊地　公會 | `anim/northport/northport_guild_bf_sep_v1.mp4` | 309 | 不用（整張含天空都是影片） |

> 11-12 修正版（Ray 核可；取代先前同名檔）：塌陷的階梯中間人影遮掉
| 伊甸古墓　塌陷的階梯 | `anim/tomb/tomb_falsestair_sep_v1.mp4` | 81 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可）：教堂殘垣＝紫黑之爪戰底圖 northport_church_ruin（女神像框住不動）；墓地截到鏡頭不動；市政廳櫃台後遮掉人影（墓地／市政廳取代先前同名檔）
| 北方泊地　教堂殘垣（紫黑之爪戰） | `anim/northport/northport_church_ruin_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 北方泊地　墓地 | `anim/northport/northport_cemetery_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 北方泊地　市政廳 | `anim/northport/northport_cityhall_bf_sep_v1.mp4` | 318 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可）：港口（只有天空動）、酒館
| 北方泊地　港口 | `anim/northport/northport_port_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 北方泊地　酒館 | `anim/northport/northport_tavern_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可；取代先前同名檔）：東區、西區（GPT 去煙底圖＋程式煙、逐格對齊）
| 北方泊地　東區 | `anim/northport/northport_east_bf_sep_v1.mp4` | 324 | 不用（整張含天空都是影片） |
| 北方泊地　西區 | `anim/northport/northport_west_bf_sep_v1.mp4` | 204 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可）：廣場（左邊人框住、逐格對齊）
| 北方泊地　廣場 | `anim/northport/northport_square_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可）：北區（去煙去火底圖）、槍店（只有窗外天空動）
| 北方泊地　北區 | `anim/northport/northport_north_bf_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 北方泊地　槍店 | `anim/northport/northport_gunstore_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 伊甸古墓 底層祭壇（Ray 核可；祭壇框住＋程式藍光，藍光不是嚴格循環，交整段）
| 伊甸古墓　底層祭壇 | `anim/tomb/tomb_lowaltar_sep_v1.mp4` | 249 | 不用（整張含天空都是影片） |

> 11-12 北方泊地（Ray 核可）：雜貨店、旅館（a world without humans＋窗上木板框住）
| 北方泊地　雜貨店 | `anim/northport/northport_grocery_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 北方泊地　旅館 | `anim/northport/northport_hotel_bf_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 審閱頁核可（Ray 留白＝可交）：有天空的格子（程式雲合成進影片，交整段）
| 羅賽爾廢城　骨龕 | `anim/dunmor/dunmor_ossuary_sep_v1.mp4` | 324 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　歐甘石列 | `anim/dunmor/dunmor_oghamrow_sep_v1.mp4` | 300 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　聖林祭場 | `anim/dunmor/dunmor_nemeton_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　市集十字 | `anim/dunmor/dunmor_marketcross_sep_v1.mp4` | 270 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　石板主街 | `anim/dunmor/dunmor_mainstreet_sep_v1.mp4` | 390 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　律法石 | `anim/dunmor/dunmor_lawstone_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　陶窯場 | `anim/dunmor/dunmor_kilnyard_sep_v1.mp4` | 258 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　內壕 | `anim/dunmor/dunmor_innerditch_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　石環 | `anim/dunmor/dunmor_henge_sep_v1.mp4` | 288 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　王廳中庭 | `anim/dunmor/dunmor_hallcourt_sep_v1.mp4` | 288 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　穀倉遺址 | `anim/dunmor/dunmor_granary_sep_v1.mp4` | 450 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　石棚墓 | `anim/dunmor/dunmor_dolmen_sep_v1.mp4` | 348 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　東壕 | `anim/dunmor/dunmor_ditche_sep_v1.mp4` | 354 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　堤道 | `anim/dunmor/dunmor_causeway_sep_v1.mp4` | 432 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　圓塔基座 | `anim/dunmor/dunmor_brochbase_sep_v1.mp4` | 414 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　泥沼小徑 | `anim/dunmor/dunmor_boglane_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　塚原 | `anim/dunmor/dunmor_barrowfield_sep_v1.mp4` | 354 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　吟遊石階 | `anim/dunmor/dunmor_bardsstep_sep_v1.mp4` | 285 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　祭壇前庭 | `anim/dunmor/dunmor_altarcourt_sep_v1.mp4` | 270 | 不用（整張含天空都是影片） |
| 夏爾森林　斷崖邊 | `anim/forest/forest_cliff_day_sep_v1.mp4` | 231 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　崩頂坡 | `anim/belisar/belisar_rooffall_day_sep_v1.mp4` | 303 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　古城中庭 | `anim/belisar/belisar_greatcourt_day_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 里朋莊園　露台 | `anim/sofia/sofiaout_terrace_sep_v1.mp4` | 336 | 不用（整張含天空都是影片） |
| 里朋莊園　橄欖園道 | `anim/sofia/sofiaout_road_sep_v1.mp4` | 297 | 不用（整張含天空都是影片） |
| 平原古道　風蝕岩 | `anim/plains/plains_windrock_day_sep_v1.mp4` | 285 | 不用（整張含天空都是影片） |
| 平原古道　古井驛 | `anim/plains/plains_well_day_sep_v1.mp4` | 324 | 不用（整張含天空都是影片） |
| 平原古道　里程碑 | `anim/plains/plains_stone_day_sep_v1.mp4` | 318 | 不用（整張含天空都是影片） |
| 平原古道　草海 | `anim/plains/plains_sea_day_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 平原古道　碎石坡 | `anim/plains/plains_scree_day_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 平原古道　城外 | `anim/belisar/belisar_exterior_day_sep_v1.mp4` | 270 | 不用（整張含天空都是影片） |
| 平原古道　道口 | `anim/plains/plains_entry_day_sep_v1.mp4` | 264 | 不用（整張含天空都是影片） |
| 平原古道　枯木林 | `anim/plains/plains_deadwood_day_sep_v1.mp4` | 300 | 不用（整張含天空都是影片） |
| 鏡湖　北岸 | `anim/lake/lake_northshore_day_sep_v1.mp4` | 411 | 不用（整張含天空都是影片） |
| 鏡湖　山口 | `anim/lake/lake_inlet_day_sep_v1.mp4` | 294 | 不用（整張含天空都是影片） |
| 鏡湖　石碑林 | `anim/lake/lake_grove_day_sep_v1.mp4` | 318 | 不用（整張含天空都是影片） |
| 鏡湖　東岸 | `anim/lake/lake_eastshore_day_sep_v1.mp4` | 288 | 不用（整張含天空都是影片） |
| 鏡湖　倒木灣 | `anim/lake/lake_deadfall_day_sep_v1.mp4` | 255 | 不用（整張含天空都是影片） |
| 鏡湖　湖心石堤 | `anim/lake/lake_causeway_day_sep_v1.mp4` | 276 | 不用（整張含天空都是影片） |
| 石製遺蹟　傾石岔口 | `anim/fallen/fallen_fork_day_sep_v1.mp4` | 306 | 不用（整張含天空都是影片） |
| 石製遺蹟　崩塌門廊 | `anim/fallen/fallen_entry_day_sep_v1.mp4` | 378 | 不用（整張含天空都是影片） |
| 石製遺蹟　斷柱道 | `anim/fallen/fallen_causeway_day_sep_v1.mp4` | 312 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　聖井廣場 | `anim/dunmor/dunmor_wellsq_sep_v1.mp4` | 318 | 不用（整張含天空都是影片） |
| 卡耶爾山谷　白骨之地 | `anim/canyon/canyon_bones_day_sep_v1.mp4` | 273 | 不用（整張含天空都是影片） |
| 卡耶爾山谷　風蝕迴廊 | `anim/canyon/canyon_corridor_day_sep_v1.mp4` | 243 | 不用（整張含天空都是影片） |
| 卡耶爾山谷　峽谷入口 | `anim/canyon/canyon_entry_day_sep_v1.mp4` | 240 | 不用（整張含天空都是影片） |
| 卡耶爾山谷　白骨之地 | `anim/canyon/canyon_bones_day_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-12 審閱頁核可（Ray 留白＝可交）：室內格子（只交一圈）
| 貝利薩爾遺址　燭廊 | `anim/belisar/belisar_candlewalk_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　石棺廊 | `anim/belisar/belisar_sarcophagi_sep_v1.mp4` | 102 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　鐘室 | `anim/belisar/belisar_bellroom_sep_v1.mp4` | 108 | 不用（整張含天空都是影片） |
| 伊甸古墓　汲水階 | `anim/tomb/tomb_waterstair_sep_v1.mp4` | 88 | 不用（整張含天空都是影片） |
| 伊甸古墓　側墓穴 | `anim/tomb/tomb_vaultw_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　甕窖 | `anim/tomb/tomb_urnvault_sep_v1.mp4` | 90 | 不用（整張含天空都是影片） |
| 伊甸古墓　工具龕 | `anim/tomb/tomb_toolniche_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 伊甸古墓　墓龕 | `anim/tomb/tomb_tombniche_sep_v1.mp4` | 90 | 不用（整張含天空都是影片） |
| 伊甸古墓　沉陷廳 | `anim/tomb/tomb_sunkhall_sep_v1.mp4` | 102 | 不用（整張含天空都是影片） |
| 伊甸古墓　豎井 | `anim/tomb/tomb_shaft_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 伊甸古墓　抄經房 | `anim/tomb/tomb_scriptorium_sep_v1.mp4` | 83 | 不用（整張含天空都是影片） |
| 伊甸古墓　石棺室 | `anim/tomb/tomb_sarce_sep_v1.mp4` | 89 | 不用（整張含天空都是影片） |
| 伊甸古墓　硝室 | `anim/tomb/tomb_saltroom_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　法衣室 | `anim/tomb/tomb_sacristy_sep_v1.mp4` | 104 | 不用（整張含天空都是影片） |
| 伊甸古墓　圓廳 | `anim/tomb/tomb_rotunda_sep_v1.mp4` | 100 | 不用（整張含天空都是影片） |
| 伊甸古墓　聖骨匣室 | `anim/tomb/tomb_reliquary_sep_v1.mp4` | 100 | 不用（整張含天空都是影片） |
| 伊甸古墓　骨室 | `anim/tomb/tomb_ossuary_sep_v1.mp4` | 96 | 不用（整張含天空都是影片） |
| 伊甸古墓　甕棺廊 | `anim/tomb/tomb_ossuary2_sep_v1.mp4` | 91 | 不用（整張含天空都是影片） |
| 伊甸古墓　壁龕廊 | `anim/tomb/tomb_nichehall_sep_v1.mp4` | 95 | 不用（整張含天空都是影片） |
| 伊甸古墓　淤泥坑 | `anim/tomb/tomb_mudpit_sep_v1.mp4` | 93 | 不用（整張含天空都是影片） |
| 伊甸古墓　石工長廳 | `anim/tomb/tomb_masonhall_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 伊甸古墓　石工房 | `anim/tomb/tomb_mason_sep_v1.mp4` | 89 | 不用（整張含天空都是影片） |

> 11-13 室內（Ray 核可；無天空，只交一圈）
| 木雅克神殿　上行石階 | `anim/ruins/ruins_shinier_stairup_sep_v1.mp4` | 92 | 不用（整張含天空都是影片） |
| 木雅克神殿　下行深階 | `anim/ruins/ruins_shinier_stairdeep_sep_v1.mp4` | 97 | 不用（整張含天空都是影片） |
| 木雅克神殿　地底裂隙 | `anim/ruins/ruins_shinier_rift_sep_v1.mp4` | 104 | 不用（整張含天空都是影片） |
| 木雅克神殿　石牢區 | `anim/ruins/ruins_shinier_prison_sep_v1.mp4` | 100 | 不用（整張含天空都是影片） |
| 木雅克神殿　古代機械 | `anim/ruins/ruins_shinier_machine_sep_v1.mp4` | 95 | 不用（整張含天空都是影片） |
| 木雅克神殿　苔穴岔道 | `anim/ruins/ruins_shinier_hollow_sep_v1.mp4` | 95 | 不用（整張含天空都是影片） |
| 木雅克神殿　墓道 | `anim/ruins/ruins_shinier_catacomb_sep_v1.mp4` | 98 | 不用（整張含天空都是影片） |
| 聖王廳地宮　大門 | `anim/holysee/holyseedungeonwhole_sep_v1.mp4` | 104 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　旋梯井 | `anim/belisar/belisar_spiralwell_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　千柱廳 | `anim/belisar/belisar_cistern_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　納骨堂 | `anim/belisar/belisar_ossuary_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　壁畫長廊 | `anim/belisar/belisar_muralgallery_sep_v1.mp4` | 100 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　鏡廊 | `anim/belisar/belisar_mirrorwalk_sep_v1.mp4` | 106 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　靜水池 | `anim/belisar/belisar_stillpool_sep_v1.mp4` | 102 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　枝燈長廊 | `anim/belisar/belisar_chandelierhall_sep_v1.mp4` | 92 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　獸欄 | `anim/belisar/belisar_cages_sep_v1.mp4` | 91 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　甲冑廊 | `anim/belisar/belisar_armourgallery_sep_v1.mp4` | 94 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　獅階 | `anim/belisar/belisar_lionstair_sep_v1.mp4` | 102 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　絞盤室 | `anim/belisar/belisar_capstan_sep_v1.mp4` | 90 | 不用（整張含天空都是影片） |

> 11-13 有天空的格子（Ray 核可）
| 平原古道　石塚群 | `anim/plains/plains_cairn_day_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 伊甸古墓　墓門 | `anim/tomb/tomb_gate_day_sep_v1.mp4` | 276 | 不用（整張含天空都是影片） |
| 木雅克神殿　岔道 | `anim/ruins/ruins_shinier_crossway_day_sep_v1.mp4` | 255 | 不用（整張含天空都是影片） |
| 木雅克神殿　拱門長廊 | `anim/ruins/ruins_shinier_corridorb_day_sep_v1.mp4` | 291 | 不用（整張含天空都是影片） |
| 木雅克神殿　崩塌走道 | `anim/ruins/ruins_shinier_collapsed_day_sep_v1.mp4` | 267 | 不用（整張含天空都是影片） |
| 木雅克神殿　前廳 | `anim/ruins/ruins_shinier_antechamber_day_sep_v1.mp4` | 303 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　中央大廳 | `anim/belisar/belisar_greathall_day_sep_v1.mp4` | 285 | 不用（整張含天空都是影片） |
| 貝利薩爾遺址　兵器工坊 | `anim/belisar/belisar_forge_day_sep_v1.mp4` | 264 | 不用（整張含天空都是影片） |
| 鏡湖　水蝕洞 | `anim/lake/lake_cave_day_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-13 北方泊地（Ray 核可）
| 北方泊地　教堂 | `anim/northport/northport_church_bf_sep_v1.mp4` | 324 | 不用（整張含天空都是影片） |

> 11-13 夏爾森林 獸巢（Ray 核可 H＝ABCD 真循環）
| 夏爾森林　獸巢 | `anim/forest/forest_nest_day_sep_v1.mp4` | 56 | 不用（整張含天空都是影片） |

> 11-13 只拆天地（Ray 核可：地面不動、天空程式雲）
| 羅賽爾廢城　東壘牆 | `anim/dunmor/dunmor_ramparte_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　陶匠巷 | `anim/dunmor/dunmor_potters_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　戰車棚 | `anim/dunmor/dunmor_chariotshed_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　圓塔頂 | `anim/dunmor/dunmor_brochtop_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　野豬石 | `anim/dunmor/dunmor_boarstone_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　祭壇 | `anim/dunmor/dunmor_altar_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 羅賽爾廢城　德魯伊居所 | `anim/dunmor/dunmor_druidhouse_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 西泊戰地　ws_0_0（黃昏） | `anim/winsmoor_siege/ws_0_0_dusk_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |
| 西泊戰地　ws_0_1（黃昏） | `anim/winsmoor_siege/ws_0_1_dusk_sep_v1.mp4` | 192 | 不用（整張含天空都是影片） |

> 11-13 不倒放 12 格（Ray 在 animechk 剪；斷橋鐵鍊遮掉）。取代同名舊檔
| 木雅克神殿　命之泉 | `anim/ruins/ruins_shinier_deepspring_sep_v1.mp4` | 29 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 木雅克神殿　深部祭壇 | `anim/ruins/ruins_shinier_deepaltar_sep_v1.mp4` | 54 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 木雅克神殿　黑暗斷橋 | `anim/ruins/ruins_shinier_darkbridge_sep_v1.mp4` | 42 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 木雅克神殿　巨像廳 | `anim/ruins/ruins_shinier_colossus_sep_v1.mp4` | 54 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 木雅克神殿　養息之間 | `anim/ruins/ruins_shinier_brazier_sep_v1.mp4` | 50 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 木雅克神殿　圓井房 | `anim/ruins/ruins_shinier_well_sep_v1.mp4` | 23 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　水牢 | `anim/belisar/belisar_waterjail_sep_v1.mp4` | 44 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　近衛墓室 | `anim/belisar/belisar_guardtomb_sep_v1.mp4` | 14 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　三拱廳 | `anim/belisar/belisar_triarch_sep_v1.mp4` | 13 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　聖油室 | `anim/belisar/belisar_chrismroom_sep_v1.mp4` | 10 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　獅口水道 | `anim/belisar/belisar_lionspout_sep_v1.mp4` | 16 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |
| 貝利薩爾遺址　寶冠室 | `anim/belisar/belisar_crownroom_sep_v1.mp4` | 47 | 不用（室內無天空；不倒放，Ray 在 animechk 剪） |

> 11-13 **新 SOP：有光束的格子，光束交給遊戲程式畫**（Ray：「這種有光束的都讓 gpt 把光束拿掉，然後換程式跑光束，先用這張試作」→「交給遊戲程式」）
> ⚠ 樣本，先做這一格；Ray 看過遊戲裡的效果再推到其他有光束的格子。

**木雅克神殿　長廊**（`ruins/ruins_shinier_corridora_*`，四個時段都有光束；11-14 Ray 看過預覽：「光束可以，記得光束色調要依場景差分變化」）

| 層 | 檔案／參數 |
|---|---|
| 底圖（光束已拿掉，其餘與該時段原圖一致；1536×1031） | `anim/ruins/ruins_shinier_corridora_{dawn,day,dusk,night}_nobeam.webp` |
| 光束（程式畫，疊在底圖之上、立繪之下，`lighter` 疊加） | 見下 |

光束量自「原圖 − 去光束圖」（兩張都先模糊 14px 再相減；座標＝畫面比例 0~1，原點左上）。⚠ 11-13 版寫的「梯形、中段 +55」量錯了（沒模糊，被線稿差異稀釋），以下為準：
- **中心線**：直線，(0.255, 0.10) → (0.50, 0.64)，往右下斜。
- **半寬**（畫面寬的比例）：`0.035 + 0.06 × (y−0.08)/0.6`，往下變寬。
- **橫向分布**：以中心線為準的高斯；右緣較銳（右側寬度 ×0.7），左側多拖一段光暈（強度 0.35、寬度 ×3）。
- **沿光束的亮度**（白天，以 0~255 加到底圖上，其他時段照下表等比縮放）：

| y | 0.06 | 0.10 | 0.14 | 0.20 | 0.26 | 0.33 | 0.40 | 0.46 | 0.52 | 0.58 | 0.64 | 0.70 | 0.74 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| + | 0 | 33 | 48 | 82 | 106 | 103 | 92 | 78 | 68 | 54 | 41 | 15 | 0 |

- **色調依時段差分**（量自四張原圖；最亮處的加量＝上表最大值 106 換算）：

| 時段 | 光束色 RGB | 最亮處 | 讀起來 |
|---|---|---|---|
| dawn | (229, 215, 255) | +109 | 淡紫白 |
| day | (255, 221, 186) | +106 | 暖黃白 |
| dusk | (255, 169, 124) | +119 | 橘 |
| night | (230, 227, 255) | +79 | 月光藍白 |

- 動態：①整條光束亮度緩慢呼吸（±15%，週期約 5 秒）；②光束裡的細小塵埃緩緩往下飄（約 12 px/s，帶一點左右漂），只出現在光束內、越靠邊緣越淡，顏色＝光束色往白拉一半。
- 地上的光斑留在底圖裡，不用另外畫。
- 預覽（美術測試用，不是成品）：`ComfyUI-master/tivot_wan/bg_layer/beamtest/index.html`（annotate_server 8133），可切四時段、對照原圖、拉桿調參數。

> 11-13 Ray 在 animechk 剪（3060）—— **拆層交件，程式雲不烤進影片**（Ray：「程式成圖不是美術的工作，不然我把動畫修好了，程式跑的又破壞 loop」）。由後往前疊三層：
> ① 天空靜態層 `*_sky.png`（RGBA，只有天空，其餘透明）② **程式雲**（遊戲畫，可先不做）③ 影片 `*_sep_v1.mp4`，用 `*_skymask.png` 當遮罩**挖掉天空那一塊**（白＝天空＝透明，邊緣已羽化），讓後面的天空與雲透出來。
> 還沒做程式雲之前，直接整張播影片也對（影片裡的天空就是同一張靜態天空）。
| 鏡湖　瀑布底 | `anim/lake/lake_fallbase_day_sep_v1.mp4`＋`_sky.png`＋`_skymask.png` | 62 | day 時段；24fps，每格停 2 |
| 貝利薩爾遺址　排水崖口 | `anim/belisar/belisar_draincliff_day_sep_v1.mp4`＋`_sky.png`＋`_skymask.png` | 8 | day 時段；24fps，每格停 2 |

> 11-13 **伊甸古墓　硝坑**（Ray：「跳過，程式跑坑內煙霧升起就好」）—— 沒有影片層，**煙由遊戲程式畫**。
| 層 | 檔案／參數 |
|---|---|
| 底圖（GPT 去火版：壁上火把是熄的） | `anim/tomb/tomb_nitrepit_base_nofire.webp`（1536×1024） |
| 程式煙（疊在底圖之上、立繪之下） | 三個煙源在坑底，座標（畫面比例）：(0.34, 0.74)、(0.48, 0.74)、(0.62, 0.74)；每個源寬約 0.07。煙往上升、緩慢擴散變淡，大約升到 y≈0.45 消失；顏色灰白偏暖 RGB(150, 140, 135)，半透明柔邊；只往上不倒退，持續生成（不必是嚴格循環）。 |

> 11-13 **羅賽爾廢城　石塚**（Ray：「不要有火，只拆天地」）—— 地面完全不動，**沒有影片層**；拆成天地兩層，雲由遊戲程式畫（同上面瀑布底的三層疊法，第③層換成靜態原圖）：
> ① `anim/dunmor/dunmor_cairn_sky.png`（只有天空）② 程式雲 ③ 原圖 `dunmor/dunmor_cairn.webp` 用 `anim/dunmor/dunmor_cairn_skymask.png` 挖掉天空。還沒做程式雲之前，直接用原圖即可（不必改）。

> 11-14 **新規矩：水面一律交給遊戲程式畫**（Ray：「這水是動畫還是程式？以後水也挖成程式」）。美術交水面遮罩（白＝水，邊緣已羽化），Wan 只跑會被風吹的層。
> ⚠ 樣本先做這兩格；參數是預覽頁的起始值，Ray 調好後會更新這一段。

**程式水面的畫法（通用）**：在遮罩範圍內，
1. **逐列橫向扭動**：每一列（2px 一條）把該列的水面往左右位移 `off(y) = amp·k·(sin(2π·y/(λ·k) − 3·v·t) + 0.5·sin(2π·y/(0.37·λ·k) + 4.1·v·t))`，`k = 1 + persp·(y−水面上緣)/(水面高)`（越靠畫面下方越近、波越大）。起始值 `amp 2.2px、λ 26px、v 1.0、persp 1.6`（以 1536 寬計）。
2. **反光**：一張可平鋪的「零散橫向短亮線」貼圖（白、兩端淡出、長 12~64px、高約 1.4px），緩緩往右下飄（約 40·v₂ px/s、6·v₂ px/s，`v₂ 0.35`），用遮罩裁切後以 `lighter` 疊上去，強度約 0.35 並以 ±25% 慢慢呼吸。
3. 水面以外不動；遮罩邊緣用羽化值混合。
- 預覽（美術測試用）：`ComfyUI-master/tivot_wan/bg_layer/beamtest/water.html`。

| 格 | 底圖 | 水面遮罩 | 其他層 |
|---|---|---|---|
| 羅賽爾廢城　西壕 | 原圖 `dunmor/dunmor_ditchw.webp`（**不跑 Wan，整格靜態**） | `anim/dunmor/dunmor_ditchW_watermask.png` | 天空：`*_sky.png`＋`*_skymask.png`（另交） |
| 羅賽爾廢城　沼澤獻祭處 | 蘆葦的 Wan 循環（水面已固定成原圖，Ray 在 animechk 剪 `chk1114c`，交件後補檔名） | `anim/dunmor/dunmor_bogoffer_watermask.png` | 同上 |

> 11-14 Ray：「可以，把所有有水的都這樣處理」→ 審過成品頁後依意見修正（11-14 17:27）。**有水的格子：影片裡的水面固定成靜態，水由程式畫。**
> 遮罩（白＝該區域，邊緣已羽化）：`*_watermask.png` ＝**平靜水面**（用上面「程式水面」的畫法）；`*_flowmask.png` ＝**落下／沖流的水**。
> **落水的程式畫法**（預覽頁那一套）：遮罩內的畫面本體不動，疊一層白色細長亮條（長 20~80px、寬約 1px）沿下落方向捲動（約 220 px/s，以 768 寬計），**每秒 12 格跳格**（Ray：太滑順太慢），`lighter` 疊加、強度約 0.55。
> **獅口水道特例**（Ray：「獅口水瀑水花移除改用程式低幀跑」）：影片裡的水柱與水花已拿掉（用 `belisar_dragonrace_base_nospout.webp` 補底），程式改畫 `belisar_dragonrace_base_spout.png`（RGBA，原圖的水柱＋水花，alpha＝範圍）：每 1/8 秒跳一格（8fps），圖本身往下位移 0~24px 循環並交叉淡化，再疊上面那層亮條。
> ⛔ 這幾格**沒有水**，不交遮罩、影片維持原交件：崩頂坡、旋梯井、暗橋、圓井房、墓龕（Ray：「此景無水／不用水」）。排水崖口、水蝕洞**地面沒有水**，只交瀑布的 `flowmask`。

| 格 | 遮罩 | 影片 |
|---|---|---|
| 貝利薩爾遺址　獅口水道 | `anim/belisar/` `belisar_dragonrace_base_watermask.png`＋`belisar_dragonrace_base_flowmask.png` | `belisar/belisar_lionspout_sep_v1.mp4`（水面固定版，⏳ Ray 審閱中） |
| 貝利薩爾遺址　排水崖口 | `anim/belisar/` `belisar_draincliff_day_flowmask.png` | `belisar/belisar_draincliff_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 貝利薩爾遺址　靜水池 | `anim/belisar/` `belisar_mirrorpool_base_watermask.png` | `belisar/belisar_stillpool_sep_v1.mp4`（水面固定版，✔ 已換） |
| 貝利薩爾遺址　水牢 | `anim/belisar/` `belisar_waterjail_base_watermask.png` | `belisar/belisar_waterjail_sep_v1.mp4`（水面固定版，✔ 已換） |
| 帝都外郊　河畔 | `anim/capital_outer/` `capital_outer_river_base_watermask.png`＋`capital_outer_river_base_flowmask.png` | `capital_outer/outer_river_dusk_sep_v1.mp4`（水面固定版，✔ 已換） |
| 羅賽爾廢城　野豬石 | `anim/dunmor/` `dunmor_boarstone_base_watermask.png` | `dunmor/dunmor_boarstone_sep_v1.mp4`（水面固定版，✔ 已換） |
| 羅賽爾廢城　泥沼小徑 | `anim/dunmor/` `dunmor_boglane_base_watermask.png` | `dunmor/dunmor_boglane_sep_v1.mp4`（水面固定版，✔ 已換） |
| 羅賽爾廢城　東壕 | `anim/dunmor/` `dunmor_ditchE_base_watermask.png` | `dunmor/dunmor_ditche_sep_v1.mp4`（水面固定版，✔ 已換） |
| 羅賽爾廢城　內壕 | `anim/dunmor/` `dunmor_innerditch_base_watermask.png` | `dunmor/dunmor_innerditch_sep_v1.mp4`（水面固定版，✔ 已換） |
| 石製遺蹟　沉水石坑 | `anim/fallen/` `fallen_basin_day_watermask.png` | `fallen/fallen_basin_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 鏡湖　湖心石堤 | `anim/lake/` `lake_causeway_day_watermask.png` | `lake/lake_causeway_day_sep_v1.mp4`（水面固定版，✔ 已換）；⚠ 這格的程式水面**遠近擺幅要拉大**：`amp 0.5`、`persp 5`（最近處約最遠處的 6 倍，Ray：「看起來沒有距離感」） |
| 鏡湖　水蝕洞 | `anim/lake/` `lake_cave_day_flowmask.png` | `lake/lake_cave_day_sep_v1.mp4`（水面固定版，✔ 已換）；⚠ 這格瀑布**再快一倍**（亮條約 420 px/s，仍 12fps），落點加**水霧**：從 flowmask 每一欄的最下緣隨機取點，同時約 46 團柔邊白霧（RGB 235,242,248，中心不透明→邊緣透明的圓形漸層），每團壽命 6 秒：半徑 14→60px、往外 ±70px、往上 55px、透明度 0→0.16→0（sin 曲線），`screen` 疊加（Ray：「水花霧狀緩慢飄開就好」） |
| 鏡湖　倒木灣 | `anim/lake/` `lake_deadfall_day_watermask.png` | `lake/lake_deadfall_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 鏡湖　東岸 | `anim/lake/` `lake_eastshore_day_watermask.png` | `lake/lake_eastshore_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 鏡湖　瀑布底 | `anim/lake/` `lake_fallbase_day_watermask.png`＋`lake_fallbase_day_flowmask.png` | `lake/lake_fallbase_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 鏡湖　山口 | `anim/lake/` `lake_inlet_day_watermask.png` | `lake/lake_inlet_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 鏡湖　北岸 | `anim/lake/` `lake_northshore_day_watermask.png` | `lake/lake_northshore_day_sep_v1.mp4`（水面固定版，✔ 已換） |
| 夏爾森林　淺灘 | `anim/shinier_forest/` `shinier_forest_shoal_day_watermask.png`＋`shinier_forest_shoal_day_flowmask.png` | `shinier_forest/forest_shoal_day_aba_v1.mp4`（水面固定版，✔ 已換） |
| 夏爾森林　河谷 | `anim/shinier_forest/` `shinier_forest_valley_day_watermask.png`＋`shinier_forest_valley_day_flowmask.png` | `shinier_forest/forest_valley_day_abcd_v1.mp4`（水面固定版，✔ 已換） |
| 木雅克神殿　命之泉 | `anim/ruins/` `shinier_ruins_deepspring_base_watermask.png`＋`shinier_ruins_deepspring_base_flowmask.png` | `ruins/ruins_shinier_deepspring_sep_v1.mp4`（水面固定版，✔ 已換） |
| 里朋莊園　噴泉前庭 | `anim/sofiaout/` `sofiaout_forecourt_base_watermask.png`＋`sofiaout_forecourt_base_flowmask.png` | `sofiaout/sofiaout_forecourt_abcd_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　蓄水池 | `anim/tomb/` `tomb_cistern_base_watermask.png` | `tomb/tomb_cistern_sep_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　淤泥坑 | `anim/tomb/` `tomb_mudpit_base_watermask.png` | `tomb/tomb_mudpit_sep_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　積水坑 | `anim/tomb/` `tomb_sump_base_watermask.png`＋`tomb_sump_base_flowmask.png` | `tomb/tomb_sump_sep_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　沉陷廳 | `anim/tomb/` `tomb_sunkhall_base_watermask.png`＋`tomb_sunkhall_base_flowmask.png` | `tomb/tomb_sunkhall_sep_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　汲水階 | `anim/tomb/` `tomb_waterstair_base_watermask.png`＋`tomb_waterstair_base_flowmask.png` | `tomb/tomb_waterstair_sep_v1.mp4`（水面固定版，✔ 已換） |
| 伊甸古墓　豎井 | `anim/tomb/` `tomb_shaft_base_watermask.png`＋`tomb_shaft_base_flowmask.png` | `tomb/tomb_shaft_sep_v1.mp4`（水面固定版，✔ 已換） |
| 羅賽爾廢城　湖岸 | `anim/dunmor/dunmor_lakeshore_base_watermask.png` | （未交件） |

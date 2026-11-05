# 給程式 session：敵人「攻擊／延時」動畫（動畫 session 2026-11-05 起）

> 動畫 session 不碰程式（憲法鐵律 11），要接的寫在這裡。接完請在 HANDOFF 註記。
> 來源：Ray 的 `敵人一覽_非空戰_動畫編排.xlsx`（待機 loop／攻擊動畫／延時點錯動畫三欄）。

## 規格（全部共通）

- 位置：`resources/enemy/anim/<立繪名>_atk_v<N>/`（攻擊）、`<立繪名>_delay_v<N>/`（延時・點錯）。
- 格式**與待機相同**（`frame_00.webp…` ＋ `anim.json`：`canvas`／`box`／`frames`／`fps`／`px`），差別只有：
  - **`loop:false`** —— 播一次。
  - `fps` 照 Ray 在 animechk 剪的（目前 24）。
- Ray 定的規則：**所有攻擊都從待機的中立姿勢起手、最後回到中立姿勢**（「所有攻擊都要回到原本的中立動畫」）。
  ⇒ 程式端：觸發時從待機切進這一支，播完切回待機 loop。
- ⚠ 首尾格不保證與待機第 0 格像素相同（Ray 剪掉頭尾的停頓），切換點建議蓋在既有的命中閃白／受擊特效之下。

## 已交

| 編號 | 敵人 | 用途 | 資料夾 | 格數／fps／秒 | 大小 | box |
|---|---|---|---|---|---|---|
| E007／E008 | 同上 | **攻擊**（縮身蓄力 → 彈射撲向鏡頭張嘴咬 → 回彈落回中立站姿） | `mon_natalia_atk_v3/` | 47／24／1.96 秒，loop:false | 2.1 MB | `[-33,-42,1091,1565]` |
| E007／E008 | 禍魘娜塔莉 `nightmare_natalia`／逝去的守護者 `dm_lost_guardian` | **延時・點錯**（撲向鏡頭一爪劈下 → 殭屍左右晃歸位；Ray 11-05：爪＝延時、撲咬＝攻擊，攻擊另交 `mon_natalia_atk_v3/`） | `mon_natalia_delay_v1/` | 37／24／1.54 秒 | 1.9 MB | `[-33,-19,1091,1536]` |
| E007／E008 | 同上 | **待機（換新）** | `mon_natalia_idle_v3/` | 38／24／1.58 秒，loop | 1.9 MB | `[104,13,820,1502]` |
| E007／E008 | 同上 | ~~攻擊~~ ⚠ **已被 v3 取代**（縮身蓄力 → 彈射撲向鏡頭張嘴咬、雙爪抓來；只有撲出段，停在撲咬姿勢，沒有歸位段） | `mon_natalia_atk_v2/` | 16／24／0.67 秒，loop:false | 0.7 MB | `[-21,4,1041,1511]`（左右略超出畫布） |

- E007 攻擊 **v3**（現行）：撲出 `biteAB2_cut`（13 格→16）＋ 收回 `biteBA2_cut`（25 格→31）同一個生成空間首尾相接。⚠ `edge_check`：第 25–30 格（收回段開頭、雙爪張開）碰到生成畫布左右邊緣，爪尖會被切一點點。
- E007 攻擊 v2（已被 v3 取代）：Ray 剪的 `out/export/mon_natalia_neutral_biteAB2_cut`（A 中立 → B 撲咬，原片 49 格取 13 格、部分 ×2 → 16 格），`edge_check` 無碰邊。B 圖 `resources/enemy/_natalia_bite/mon_natalia_B_bite2.png`（GPT）。⚠ 結尾停在撲咬姿勢，與待機第 0 格差很多 —— 切回待機要蓋在受擊特效之下。
| E017 | 魘魔 `np_coralman` | 延時・點錯（單爪大幅斜劈） | `mon_sea_coralman_delay_v1/` | 30／24／1.25 秒 | 2.0 MB | `[-44,-46,1113,1574]`（略超出畫布四邊） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | **延時・點錯**（右前爪胸前水平橫掃 → 收爪落回低伏；四足爪擊一律橫向） | `mon_shinierforest_tiger_delay_v1/` | 23／24／0.96 秒，loop:false | 0.4 MB | `[38,-91,1455,1108]`（上下超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊~~ ⚠ **已被 v2 取代**（只有撲出段） | `mon_shinierforest_tiger_atk_v1/` | 20／24／0.83 秒，loop:false | 0.3 MB | `[-7,-136,1654,1178]`（四邊略超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | **攻擊**（縮身蓄力 → 撲向鏡頭張嘴咬 → 收勢落回低伏） | `mon_shinierforest_tiger_atk_v2/` | 41／24／1.71 秒，loop:false | 0.7 MB | `[-13,-332,1664,1413]` |
| E065 | 森林山貓 `mon_shinierforest_lynx` | **延時・點錯**（右前爪胸前水平橫掃過身體 → 收爪落回低伏） | `mon_shinierforest_lynx_delay_v1/` | 32／24／1.33 秒，loop:false | 0.7 MB | `[-249,20,1268,1352]` |
| E065 | 同上 | **攻擊**（縮身蓄力 → 撲向鏡頭雙爪抓來 → 落回低伏） | `mon_shinierforest_lynx_atk_v1/` | 29／24／1.21 秒，loop:false | 0.6 MB | `[-265,-230,1556,1887]` |

- E017：Ray 剪的 `out/export/mon_sea_coralman_delay2_cut`（原片 48 格取 24 格、部分 ×2 → 30 格）。最後一格與第一格差 8.8（不完全相同，見上方 ⚠）。

- E007：Ray 定的作法（**所有爪擊照這套**）：GPT 先把原圖改成「中立站姿」(A) 與「爪已劈到底、手背朝鏡頭」(B)；Wan 跑 A→B（撲擊劈下）＋ B→A（歸位過渡），Ray 剪完兩段接成一支。
  延時 = `out/export/mon_natalia_neutral_slashAB_cut`（9 格）＋ `mon_natalia_B_slash_returnBA_cut`（28 格）。
- ⚠⚠ **娜塔莉換了立繪**：待機、延時、攻擊都是用新的中立站姿生成的，**卡上的立繪要一起換成 `resources/enemy/mon_natalia_neutral.webp`**（1024×1536，舊的 `mon_natalia.webp` 是撲擊姿勢），
  `ENEMY_IDLE.mon_natalia` 也要改指 `mon_natalia_idle_v3/`（或新增一把 `mon_natalia_neutral` 的鑰匙 —— 照 ENEMY_IDLE 以立繪檔名當鑰匙的規約，建議後者）。不換的話待機第一格會跟靜態立繪對不上。

## 程式端要做的（Ray 11-05：「進遊戲測」）

1. **播放器**：戰鬥中敵人「主動攻擊」那一刻（受擊演出之前）從待機 loop 切進 `_atk_v*`，播一次後切回待機；**延時／點錯**懲罰那一刻同理切 `_delay_v*`。格式同 `ENEMY_IDLE`（`startIdleLoop` 那一套的 canvas/box/px），只多 `loop:false`。
2. **登記**：建議 `ENEMY_ATK`／`ENEMY_DELAY` 兩張表（鑰匙＝立繪檔名，同 `ENEMY_IDLE`），沒有登記的敵人照舊只有現有演出。
3. **讀取**：照鐵律 13，只在那一場戰鬥的門載（`enterBattleAudio` 那一族的圖版），戰後釋放。
4. 驗收：開 `np_nightmare`（娜塔莉）與北方泊地的魘魔那一場，攻擊／延時各觸發一次，看切換點有沒有跳。

- E068 延時：Ray 剪的 `out/export/mon_shinierforest_tiger_B_hswipe_hswipeBA_cut`（收回段，原片 33 格取 19 格、部分 ×2 → 23 格），`edge_check` 無碰邊。⚠⚠ **立繪要換成中立站姿 `resources/enemy/mon_shinierforest_tiger_neutral.webp`**（舊的 `mon_shinierforest_tiger.webp` 是撲擊姿勢）；canvas 是這一張。B 圖 `_neutral_refs/mon_shinierforest_tiger_B_hswipe.png`。攻擊（撲咬）製作中。

- E068 攻擊：Ray 剪的 `out/export/mon_shinierforest_tiger_neutral_biteAB_cut`（撲出段，原片 49 格取 20 格）。**咬到那一格＝最後一格（第 19 格，0 起算）**。⚠ `edge_check`：第 6 格獨角尖碰到生成畫布上緣。結尾停在撲咬姿勢、沒有歸位段（同娜塔莉 v2 的情況），切回待機要蓋在受擊特效下。B 圖 `_neutral_refs/mon_shinierforest_tiger_B_bite.png`。

- E068 攻擊 **v2**（現行）：撲出 `biteAB_cut`（20 格）＋ 收勢 `biteBA2_cut`（18 格→23 格）。**咬到那一格＝第 19 格（0 起算，撲出段最後一格）**。⚠ 兩段原本不在同一個生成空間（撲出 FIT 0.78／OY 0.5、收勢 FIT 0.72／OY 0.85）：撲出段已用 B 圖的對位**整格等比縮放＋平移**換算到收勢那一個空間（不重畫、不交叉淡化），接點差異 12.9（小於撲出段相鄰格 26.9）。canvas 照收勢空間交（FIT 0.72／OY 0.85）。⚠ `edge_check`：收勢段開頭幾格獨角碰生成畫布上緣。

- E065：延時＝`hswipeAB2_cut`（10 格）＋`hswipeBA2_cut`（22 格），**打到那一格＝第 9 格**；攻擊＝`pounceAB2_cut`（14 格）＋`pounceBA2_cut`（15 格），**打到那一格＝第 13 格**（皆 0 起算＝撲出段最後一格）。兩段同一生成空間（直式、FIT 0.64）。⚠ `edge_check`：攻擊第 9–10 格雙爪碰生成畫布左右邊；延時無碰邊。⚠⚠ **立繪要換成中立站姿 `resources/enemy/mon_shinierforest_lynx_neutral.webp`**（舊的 `mon_shinierforest_lynx.webp` 是撲擊姿勢）。中立待機已生成（`out/enemy_atk/mon_shinierforest_lynx_neutral_idle`），等 Ray 剪。

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
| E007／E008 | 同上 | **攻擊 v5（現行）**（撲出同 v4；收回換成重新生成的 biteBA2_cut_2） | `mon_natalia_atk_v5/` | 48／24／2.0 秒，loop:false | 2.2 MB | `[-33,-53,1068,1572]` |
| E007／E008 | 同上 | ~~攻擊 v4~~ ⚠ **已被 v5 取代**（同 v3，撲出段多最後一格咬到底的原片 #48） | `mon_natalia_atk_v4/` | 48／24／2.0 秒，loop:false | 2.2 MB | `[-33,-42,1091,1565]` |
| E007／E008 | 同上 | ~~攻擊 v3~~ ⚠ **已被 v4 取代**（縮身蓄力 → 彈射撲向鏡頭張嘴咬 → 回彈落回中立站姿） | `mon_natalia_atk_v3/` | 47／24／1.96 秒，loop:false | 2.1 MB | `[-33,-42,1091,1565]` |
| E007／E008 | 禍魘娜塔莉 `nightmare_natalia`／逝去的守護者 `dm_lost_guardian` | **延時・點錯**（撲向鏡頭一爪劈下 → 殭屍左右晃歸位；Ray 11-05：爪＝延時、撲咬＝攻擊，攻擊另交 `mon_natalia_atk_v3/`） | `mon_natalia_delay_v1/` | 37／24／1.54 秒 | 1.9 MB | `[-33,-19,1091,1536]` |
| E007／E008 | 同上 | **待機（換新）** | `mon_natalia_idle_v3/` | 38／24／1.58 秒，loop | 1.9 MB | `[104,13,820,1502]` |
| E007／E008 | 同上 | ~~攻擊~~ ⚠ **已被 v3 取代**（縮身蓄力 → 彈射撲向鏡頭張嘴咬、雙爪抓來；只有撲出段，停在撲咬姿勢，沒有歸位段） | `mon_natalia_atk_v2/` | 16／24／0.67 秒，loop:false | 0.7 MB | `[-21,4,1041,1511]`（左右略超出畫布） |

- E007 攻擊 **v5**（現行）：撲出 `mon_natalia_neutral_biteAB2_cut_3`（17 格）＋ 收回 `mon_natalia_B_bite_src_biteBA2_cut_2`（31 格；取格表同 v3/v4 那支，但來源 biteBA2 在 17:07～17:19 重生成過，內容是新的），FIT 0.92。**咬到＝第 16 格**。接縫 16→17 差 12.2（撲出段相鄰格約 32），沒有跳。
- E007 攻擊 v4（已被 v5 取代，收回段誤用舊的 biteBA2_cut、與 v3 相同）：撲出 `mon_natalia_neutral_biteAB2_cut_3`（17 格＝v3 那 16 格＋原片 #48）＋ 收回 `mon_natalia_B_bite_src_biteBA2_cut`（31 格），同一生成空間首尾相接、FIT 0.92（同 v3）。**咬到＝第 16 格**（撲出段最後一格）。
- E007 攻擊 v3（已被 v4 取代）：撲出 `biteAB2_cut`（13 格→16）＋ 收回 `biteBA2_cut`（25 格→31）同一個生成空間首尾相接。⚠ `edge_check`：第 25–30 格（收回段開頭、雙爪張開）碰到生成畫布左右邊緣，爪尖會被切一點點。
- E007 攻擊 v2（已被 v3 取代）：Ray 剪的 `out/export/mon_natalia_neutral_biteAB2_cut`（A 中立 → B 撲咬，原片 49 格取 13 格、部分 ×2 → 16 格），`edge_check` 無碰邊。B 圖 `resources/enemy/_natalia_bite/mon_natalia_B_bite2.png`（GPT）。⚠ 結尾停在撲咬姿勢，與待機第 0 格差很多 —— 切回待機要蓋在受擊特效之下。
| E017 | 魘魔 `np_coralman` | 延時・點錯（單爪大幅斜劈） | `mon_sea_coralman_delay_v1/` | 30／24／1.25 秒 | 2.0 MB | `[-44,-46,1113,1574]`（略超出畫布四邊） |
| E017 | 同上 | **攻擊**（縮身蓄力 → 雙爪張開撲向鏡頭；只有撲出段，停在撲到最近那一格） | `mon_sea_coralman_atk_v1/` | 14／24／0.58 秒，loop:false | 0.5 MB | `[-966,-431,2954,2197]`（撲到最近時雙爪遠超出畫布，大半會被 #top 切掉） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~延時 v2~~ ⚠ **已被 delay_v3 取代**（程式端 ver -2519 組：Ray 剪的 hswipeAB_cut）（右前爪胸前水平橫掃 → 收爪落回低伏） | `mon_shinierforest_tiger_delay_v2/` | 32／24／1.33 秒，loop:false | 0.6 MB | `[-154,-91,1724,1112]` |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~延時~~ ⚠ **已被 delay_v2 取代**（右前爪胸前水平橫掃 → 收爪落回低伏；四足爪擊一律橫向） | `mon_shinierforest_tiger_delay_v1/` | 23／24／0.96 秒，loop:false | 0.4 MB | `[38,-91,1455,1108]`（上下超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊~~ ⚠ **已被 v2 取代**（只有撲出段） | `mon_shinierforest_tiger_atk_v1/` | 20／24／0.83 秒，loop:false | 0.3 MB | `[-7,-136,1654,1178]`（四邊略超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊 v3~~ ⚠ **已被 atk_v4 取代**（程式端 ver -2519 組：Ray 指定改用 biteAB）（縮身蓄力 → 撲向鏡頭張嘴咬 → 收勢落回低伏） | `mon_shinierforest_tiger_atk_v3/` | 29／24／1.21 秒，loop:false | 0.5 MB | `[-31,-332,1677,1413]` |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊~~ ⚠ **已被 atk_v3 取代**（縮身蓄力 → 撲向鏡頭張嘴咬 → 收勢落回低伏） | `mon_shinierforest_tiger_atk_v2/` | 41／24／1.71 秒，loop:false | 0.7 MB | `[-13,-332,1664,1413]` |
| E065 | 森林山貓 `mon_shinierforest_lynx` | **延時・點錯**（右前爪胸前水平橫掃過身體 → 收爪落回低伏） | `mon_shinierforest_lynx_delay_v1/` | 32／24／1.33 秒，loop:false | 0.7 MB | `[-249,20,1268,1352]` |
| E065 | 同上 | **攻擊**（縮身蓄力 → 撲向鏡頭雙爪抓來 → 落回低伏） | `mon_shinierforest_lynx_atk_v1/` | 29／24／1.21 秒，loop:false | 0.6 MB | `[-265,-230,1556,1887]` |
| E066 | 淺灘水蛇 `mon_shinierforest_snake` | **攻擊＝延時**（盤身 → 彈出張嘴咬向鏡頭 → 縮回盤姿；表上兩欄都是咬擊，同一支） | `mon_shinierforest_snake_atk_v1/` | 29／24／1.21 秒，loop:false | 0.7 MB | `[-85,9,1105,1526]` |
| E067 | 巨山豬 `mon_shinierforest_hog` | **攻擊＝延時**（低頭蹬地 → 撞向鏡頭 → 退回站姿；表上兩欄都是撞擊，同一支） | `mon_shinierforest_hog_atk_v1/` | 29／24／1.21 秒，loop:false | 0.4 MB | `[64,-103,1422,1197]` |
| 北泊 | 安雅光翼 `mon_np_anyawings`（新敵，卡還沒有） | **待機**（紫焰之翼流動） | `mon_np_anyawings_idle_v1/` | 48／24／2.0 秒，loop | 2.3 MB | `[105,111,1561,990]` |
| 北泊 | 同上 | **大力振翅**（高舉→全力下拍到底→回升展開） | `mon_np_anyawings_flap_v1/` | 81／24／3.4 秒，loop:false | 3.4 MB | `[62,-9,1653,1200]` |
| 北泊 | 同上 | **爆炎**（收攏→從翼根炸開紫焰→收回展翼） | `mon_np_anyawings_burst_v1/` | 81／24／3.4 秒，loop:false | 4.6 MB | `[35,12,1719,1161]` |
| 北泊 | 同上 | **攻擊 A＝振翅接爆炎**（Ray 剪） | `mon_np_anyawings_atk_v1/` | 64／24／2.67 秒，loop:false | 3.3 MB | `[47,25,1696,1166]` |
| 教學 | 訓練用聖徒 `trainee`（ASSETS `enemy_trainee`） | **待機**（身體呼吸、頭以頸為軸木靈式喀喀抽轉兩陣，不眨眼） | `saint_tr_neutral_idle_v1/` | 48／24／2.0 秒，loop | 1.9 MB | `[115,-11,772,1520]` |
| 教學 | 同上 | **攻擊＝延時＝點錯 v2（現行，DMA 共用）**：前撲爪擊＋退回待機（IAR 完整） | `saint_tr_neutral_atk_v2/` | 30／24／1.25 秒，loop:false | 0.9 MB | `[-193,-3,1260,1669]` |
| 教學 | 同上 | ~~攻擊 v1~~ ⚠ **已被 v2 取代**（只有 A 段）：前撲爪擊（從待機往鏡頭撲、右爪劈下；只有撲出段，停在劈中那一格） | `saint_tr_neutral_atk_v1/` | 10／24／0.42 秒，loop:false | 0.3 MB | `[-193,9,1214,1657]` |
| E019 | 背負祭壇者 `mon_beast_altar` | **延時・點錯**（吼叫：一開場就在仰身張大胸口巨口咆哮 → 收口落回站姿） | `mon_beast_altar_delay_v1/` | 22／24／0.92 秒，loop:false | 0.5 MB | `[-56,21,774,995]`（左右略超出畫布） |
| E019 | 同上 | **攻擊**（低伏蓄力 → 撲撞向鏡頭、胸口黑洞大口張開雙爪抓來 → 落回四足站姿） | `mon_beast_altar_atk_v1/` | 29／24／1.21 秒，loop:false | 0.6 MB | `[-306,-68,1316,1341]`（撲到最近時四邊超出畫布） |
| E019 | 同上 | **待機** | `mon_beast_altar_idle_v1/` | 48／24／2.0 秒，loop | 3.5 MB | `[-71,58,780,960]` |

- 安雅光翼（Ray 11-05：「教堂中間大瓦礫堆，安雅被埋在下面看不到，只看得到背後一對光翼」）：
  · 立繪 `resources/enemy/mon_np_anyawings.webp`（1781×1187 橫幅 alpha，只有翅膀、沒有人；翼根在下緣中央）；**背景** `resources/background/northport/northport_church_ruin.webp`（北泊教堂室內殘垣，中央大瓦礫堆＝安雅被埋的地方，光翼要擺成從瓦礫堆中央長出來）。
  · 振翅與爆炎**都還沒經 Ray 剪**（Ray：「先接上」），各 81 格全留。**打到＝第 48 格**（兩支都是 A 段最後一格：振翅下拍到底／爆炎炸到最大）。**對應（Ray 11-06）：A＝`atk_v1`（振翅接爆炎）、D＝`flap_v1`（振翅）、M＝`burst_v1`（爆炎）**。A：瓦礫噴襲在第 8 格（下拍到底），**打到＝第 48 格**（爆炎炸到最大）；來源 `out/export/mon_np_anyawings_flapburst_joined_cut`（爆炎段已換算到振翅的生成空間）。
  · ⚠⚠ **振翅要程式加「瓦礫噴襲」效果**（Ray 指定）：下拍到底那一格（第 48 格）從瓦礫堆往鏡頭噴碎石。美術沒有做這個效果。
  · 輸出比例 0.5（解碼約 43 MB／支）：81 格全留太重，手機優先。
- 訓練用聖徒攻擊 **v2**（現行）：A＝`out/export/saint_tr_neutral_lungeAB_cut`（10 格）＋ R＝`saint_tr_R_start_R_cut`（20 格，由 A 段結尾那一格＝原片第 25 格重跑 Wan 回中立，同一生成空間），**打到＝第 9 格**；第 29 格回到中立，可直接接回待機。
- 訓練用聖徒（Ray 11-05「把第一個怪 訓練用聖徒跟背景拆開 獨立出來」）：⚠⚠ **立繪要換**：`enemy_trainee` 由合成圖 `saint_tr_ci.webp`（怪＋走廊）改指 **`resources/enemy/saint_tr_neutral.webp`**（中立站姿、alpha 1024×1536，待機與爪擊都用它生成）；戰鬥背景另交 **`resources/enemy/saint_tr_bg.webp`**（1254² 空走廊，同原構圖），卡上 `bg` 請指它。`saint_tr.webp` 是原姿勢（伸手）的去背版，備用。待機頭部抽動是程式旋轉（Ray 同意）、身體是 Wan。攻擊（前撲爪擊，DMA 共用一支）＝`saint_tr_neutral_atk_v1/`：Ray 剪的 `out/export/saint_tr_neutral_lungeAB_cut`（原片 49 格取前段 10 格），**打到＝最後一格（第 9 格）**；結尾停在劈中姿勢、與待機差很多 —— R（退回待機）還沒交，先蓋在受擊特效之下切回待機。
- E068 tiger rule 重剪（Ray 指定）：攻擊 v3＝`out/export/mon_shinierforest_tiger_atk_tigerrule`（biteAB2＋biteBA2，pounce 規則，**打到第 13 格**；兩段同一生成空間 720×480／FIT 0.72／OY 0.85，不必換算）；延時 v2＝`mon_shinierforest_tiger_delay_tigerrule`（hswipeAB＋hswipeBA，hswipe 規則，**打到第 9 格**；720×480／FIT 0.78／OY 0.5）。canvas 對 `mon_shinierforest_tiger_neutral.webp`。
- E019 攻擊：tiger rule 自動剪（`out/export/mon_beast_altar_atk_tiger`＝ramAB＋ramBA），**打到＝第 13 格**，無碰邊。B 圖 `_neutral_refs/mon_beast_altar_B_ram.png`。待機：`out/monsters/mon_beast_altar_idle2` 48 格全留（Ray 未另剪；第一版 idle 左側經幡碰邊、已棄）。
- E019 延時：Ray 剪的 `out/export/mon_beast_altar_B_roar_roarBA_cut`（**只有收回段**，原片 33 格取 19 格、部分 ×2 → 22 格）。⚠ **第 0 格就是吼叫姿勢**（胸口巨口張到最大），從待機切進來那一下會直接跳到吼的那一格 —— 要蓋在受擊特效之下。吼叫的「打到」＝第 0 格。B 圖 `_neutral_refs/mon_beast_altar_B_roar.png`。
- E017 攻擊：Ray 剪的 `out/export/mon_sea_coralman_atk_tiger_cut`（tiger rule 自動剪的 29 格只留前 14 格＝撲出段），**打到那一格＝最後一格（第 13 格）**，結尾停在撲擊姿勢、與待機第 0 格差很多 —— 切回待機要蓋在受擊特效之下（同娜塔莉 v2）。720×720 生成、FIT 0.52（撲出時雙爪張到畫布邊，AB 16–41 碰邊，Ray 看過選用）；B 圖 `_neutral_refs/mon_sea_coralman_B_pounce.png`。
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

- E066／E067：tiger rule 自動剪（`tivot_wan/tiger_cut.py pounce`），**打到那一格＝第 13 格**（0 起算），兩支都 29 格、無碰邊。ENEMY_ATK 與 ENEMY_DELAY 都指同一支。⚠⚠ **立繪要換成中立站姿** `mon_shinierforest_snake_neutral.webp`／`mon_shinierforest_hog_neutral.webp`（舊的在咬／在衝）。⚠ 水蛇第 16–19 格頭縮進身體；山豬收回段兩格帶一小團煙塵（Ray 看過說交）。中立待機在 animechk 等 Ray 剪。

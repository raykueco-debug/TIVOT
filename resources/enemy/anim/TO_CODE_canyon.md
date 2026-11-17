# 給程式 session：卡耶爾山谷（夢境碎片 02）敵人的程式效果（敵人線 2026-11-14）

> 出處：Ray 在 `tools/enemy_review/canyon.html` 提交的編排（`_review/submit_canyon_20261114_211703.json`）與 KF 審閱（`_review/submit_canyonkf_20261114_215730.json`）。
> 美術 session 不碰程式（鐵律 11），只寫在這裡。11-15 起動畫已交件（見下）；「程式效果」那一節是動畫之外要程式做的。

## ⚠ 11-17 待程式接：香爐蠍打擊點改第 32 格（Ray：「香爐蠍的打擊點在槌下那一瞬」）

- `config.js` 的 `ENEMY_ATK.mon_canyon_censer_dark`：`hit:50` → **`hit:32`**。
- 第 32 格＝尾槌砸到地面、冒出第一道火花的那一格（31 還在半空揮下、33 起是塵爆擴散）。
  原本的 50 是「主體面積最大格」，那時槌早就砸完、正在收回。
- 只改這一個數字，片不動。

## ⚠ 11-16 待程式接：飛行兩隻的殘影瞬移攻擊（Ray：「一道黑影快速畫過畫面 畫過時攻擊判定」）

- 骨鴉 `mon_canyon_bonecrow_dark_atk_v1` 已交（Ray 的 cut，**10 格／0.42 秒**，`loop:false`）：只有殘影消失段，**不含現形**（Ray：「不用倒放 讓程式讓他從畫面飛回來就好」）。
- 程式要做：播完（最後幾格主體全空，敵人隱藏）→ **一道黑影快速劃過畫面（隨機角度）→ 劃過的那一刻＝攻擊判定（打到）** → **讓牠從畫面外飛回原位**，接回待機。
- 聖面鷲 `mon_canyon_saintvulture_dark_atk_v1` 已交（照骨鴉剪法，10 格／0.42 秒），同上。
- 取代下面「程式效果」表裡聖面鷲／骨鴉那兩列的「閃現消失」：消失由動畫演，黑影、判定與飛回原位由程式做。

## ⚠ 11-16 待程式接：攻擊時放大到貼框（Ray：「出框的就讓敵在攻時放大到貼框 進遊戲鎖血跑一輪看看」）

- **對象**：Kling 16:9 的攻擊片，主體撲到片框外、被片框裁掉的那幾隻。ABA 版碰邊格數：餓獸 35、鎖鏈餓犬 27、提燈小鬼 16、爬行朝聖者 6、鐘殼蟲 2、香爐蠍 1。
  - ✅ **11-16 已交件（Ray：「先交件」）**：ABA 原片、未剪，交在 `<立繪名>_atk_v1/`，取代原本的 AB＋倒放；舊的已放進回收區。
    每支都是 73 格／3.04 秒、`loop:false`，片尾已回到中立，**不必再接 R**。

    | 敵人 | 鑰匙（立繪檔名） | 打到（主體最大格） |
    |---|---|---|
    | 香爐蠍 | `mon_canyon_censer_dark` | 50 |
    | 餓獸 | `mon_canyon_houndbeast` | 42 |
    | 鐘殼蟲 | `mon_canyon_bellmite_dark` | 45 |
    | 鎖鏈餓犬 | `mon_canyon_chainhound_dark` | 45 |
    | 提燈小鬼 | `mon_canyon_lanternimp_dark` | 24 |
    | 爬行朝聖者 | `mon_canyon_crawler_dark` | 45 |

    `box` 遠大於立繪畫布（例：餓獸是 `[-1699,-475,4427,2490]`），因為片是 16:9 橫版、撲到鏡頭前。`ENEMY_ATK` 各加一行即可。
    Ray 之後在 chk 剪完按輸出，canyon_watch 會自動換成剪好的版本（同一個資料夾）。
- **要做的事**：播 A（`playActionClip('atk')`）的那段時間，把敵人顯示放大到片的 `box` 外緣貼齊敵人區的畫面邊框，播完回待機時縮回原大小。
  - 目的：片框裁切的那條硬邊落在畫面外，玩家看不到「被切掉」的主體。
  - 放大倍率由 `anim.json` 的 `box` 和敵人區的實際尺寸現算（鐵律 7：別寫死）。只放大會出框的那幾支，建議由 `ENEMY_ATK` 該列的一個旗標宣告（例如 `fillFrame:true`）。
- **驗收**：進遊戲鎖血（管理人模式、不會死），讓這幾隻各打一輪 A，看放大、縮回和接回待機順不順。
- ⚠ 美術 session 不碰程式（鐵律 11），以上交給程式 session 實作。

## ✅✅ 11-15 交件（Ray：「現在做好的先接上」）—— 現行版，取代下面 11-14 那一筆

Ray 11-15 規則：**待機 I 一律 Wan、攻擊依 Ray 分配走 Kling**；所有動畫用**快剪**（auto_cut）處理過、holds 已展開成 24fps 逐格。
格式同待機程式端版：`frame_NN.webp` ＋ `anim.json`（`canvas`＝立繪畫布、`box`＝換回立繪座標、`px`＝實際像素、`fps` 24）。
工具 `tools/anim/deliver_canyon.py`（座標鏈寫在檔頭）；第 0 格疊回立繪已驗過，位置吻合。

| 敵人 | 表 | 鑰匙（立繪檔名） | 待機 I（loop:true） | 動作（loop:false） | 動作格／秒 | 打到（主體最大格） | R |
|---|---|---|---|---|---|---|---|
| 石棺甲蟲 | ENEMY_ATK | `mon_canyon_coffinbeetle_dark` | `…_idle_v1/` 48 格 | `…_atk_v2/`（中立→撲→收爪回中立；**11-15 換成 Ray 剪的 16:9 ABA 版**，box 超出立繪畫布是撲到鏡頭前的設計） | 27／1.12 | 19 | 已含（片尾收爪回中立） |
| 骸殼蟹 | ENEMY_DELAY | `mon_canyon_bonecrab_dark` | `…_idle_v1/` | `…_delay_v1/`（雙鉗張開） | 74／3.08 | 16 | 未定 |
| 朝聖者團塊 | ENEMY_MISS | `mon_canyon_pilgrimmass_dark` | `…_idle_v1/` | `…_miss_v1/`（張手；**程式鎖體積版**） | 74／3.08 | 20 | 未定 |
| 喪鐘蠕蟲 | ENEMY_ATK | `mon_canyon_bellwyrm_dark` | `…_idle_v1/` | `…_atk_v1/`（鐘口撲向鏡頭；**程式鎖體積版**） | 74／3.08 | 50 | 未定 |
| 鐵衣苦修者 | ENEMY_DELAY | **`mon_canyon_ironpenitent_neutral`**（新立繪） | `…_idle_v1/` | `…_delay_v1/`（錘砸向鏡頭） | 74／3.08 | 40 | **倒放**（Ray 11-15） |
| 肋籠獸 | ENEMY_ATK | `mon_canyon_ribcage_dark` | `…_idle_v1/` | `…_atk_v1/`（側移、嘴轉向鏡頭；火交程式） | 74／3.08 | 17 | 未定 |
| 高蹺細影 | ENEMY_MISS | **`mon_canyon_stilt_neutral`**（新立繪） | `…_idle_v1/` | `…_miss_v1/`（爪擊） | 74／3.08 | 31 | 未定 |
| 聖面鷲 | —（攻擊是程式演出） | `mon_canyon_saintvulture_dark` | `…_idle_v1/`（振翅，縮小重跑不出框） | — | — | — | — |
| 骨鴉 | —（同上） | `mon_canyon_bonecrow_dark` | `…_idle_v1/`（振翅） | — | — | — | — |

- ⚠⚠ **兩張新立繪**（比照腐鹿骸 `mon_stag_rot_neutral`）：鐵衣苦修者、高蹺細影的動畫是用 Ray 要求重畫的中立站姿生成的 ⇒ 立繪改指 `resources/enemy/mon_canyon_ironpenitent_neutral.webp`、`mon_canyon_stilt_neutral.webp`（1024×1536）；群戰圖層若是從舊立繪排版出來的，也要換成新立繪。
- ⚠⚠ **群戰圖層**：這些怪在遊戲裡是 `canyon_swarm/fly<n>/guard_*.webp`（混編 `canyon_mix2..12`），`box` 是對**原立繪畫布**算的，接到群組成員時要乘上該成員的排版縮放與位移。
- ⚠ **R 未定的**：動作停在 B（攻擊姿勢），播完回待機前要怎麼收（倒放／收勢／撤步）Ray 還沒指定 —— 先照現行通則（播完切回待機），等 Ray。
- ⚠ 片尾（B）有快剪補足總長的停格約 1 秒（24 格）；「打到」用主體最大那一格。
- ⚠ 容量偏大：攻擊每支 3.7～8.3 MB（Kling 720p 去背、撲到鏡頭前主體很大），待機每支 1.2～3.3 MB。要減格請告訴美術。
- ✅ **11-15 補交：另 7 隻待機**（Ray 編排寫「交給 wan 自由發揮」或空白；Wan 從原深色立繪直接生，FIT 0.85，碰邊全 0，快剪 2 秒 48 格 24fps loop）：
  `mon_canyon_censer_dark_idle_v1`／`mon_canyon_hanged_dark_idle_v1`／`mon_canyon_houndbeast_idle_v1`／`mon_canyon_bellmite_dark_idle_v1`／`mon_canyon_chainhound_dark_idle_v1`／`mon_canyon_lanternimp_dark_idle_v1`／`mon_canyon_crawler_dark_idle_v1`
  ⇒ 程式端：`config.js` 的 `ENEMY_IDLE` 各加一行（鑰匙＝立繪檔名）即可；立繪與分層都沒換，**不必**重跑 group_member_map。

## （11-14）已交件 —— ⚠ 已被上面的 `atk_v2` 取代

| 敵人 | 表 | 鑰匙（立繪檔名） | 資料夾 | 格／秒 | 主體最大格 |
|---|---|---|---|---|---|
| 石棺甲蟲 `mon_canyon_coffinbeetle_dark`（`canyon_mix2` 後排大型） | ENEMY_ATK（撲向鏡頭） | `mon_canyon_coffinbeetle_dark` | `mon_canyon_coffinbeetle_dark_atk_v1/` | 97／4.04（24fps，loop:false） | 44（打到） |

- Kling 4.0 生成（中立→撲擊→中立，一支到底，Ray 11-14：「甲蟲交件」）。格式同待機程式端版：`canvas` 立繪 1024×1536、`box` 換回立繪座標、`px` 720×1280。
- ⚠ 撲到最近時整個貼滿鏡頭（第 30~60 格前後碰邊 38 格）—— 那是設計，鏡頭被撲滿。
- ⚠ 這隻在遊戲裡是**群戰圖層**（`canyon_swarm/fly2/guard_1.webp`，排版縮放過的立繪）：`box` 是對**原立繪**畫布算的，接到群組成員時要乘上該成員的排版縮放與位移。
- ⚠ 5.6 MB（97 格），比其他攻擊大；要減格請告訴美術。

## 程式效果

| 敵人（深色版立繪） | 時機 | 動畫（美術） | 程式要做的 |
|---|---|---|---|
| 崩岩巨像 `mon_canyon_colossus_dark` | M（點錯） | 仰天咆哮 | **敵人回血 15%** |
| 崩岩巨像 | D（延時） | 向前出拳（已有 atk 動畫，Ray：「已有動畫」） | **打出飛石** |
| 骸殼蟹 `mon_canyon_bonecrab_dark` | D | 雙鉗向兩邊張開 | **噴出泡泡、汙染盤面** |
| 朝聖者團塊 `mon_canyon_pilgrimmass_dark` | M | 張手 | **震動＋震波；盤面數字消失、慢慢淡入恢復** |
| 肋籠獸 `mon_canyon_ribcage_dark` | A | 側移、長頸末端的嘴轉向鏡頭張開（**火已從動畫拿掉**） | **噴火由程式做**（Ray：「火太卡通了 不如拿掉火給程式跑看看」）；嘴張開的那幾格噴 |
| 聖面鷲 `mon_canyon_saintvulture_dark` | A | 不出 KF | **閃現消失 → 一道黑影以隨機角度劃過畫面 → 閃現復歸** |
| 骨鴉 `mon_canyon_bonecrow_dark` | A | 不出 KF | 同聖面鷲 |

- 時長、數值（泡泡持續多久、數字淡入多久、飛石幾顆）Ray 都還沒定，先問他。
- 其餘 Ray 寫「交給 wan 自由發揮」的格沒有程式效果。
- ⚠ 這些怪在遊戲裡是**群戰圖層**（`canyon_swarm/fly<n>/guard_*.webp`，混編 `canyon_mix2..12`）—— 動畫交件時要對應到群組成員，屆時另寫。

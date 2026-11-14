# 給程式 session：卡耶爾山谷（夢境碎片 02）敵人的程式效果（敵人線 2026-11-14）

> 出處：Ray 在 `tools/enemy_review/canyon.html` 提交的編排（`_review/submit_canyon_20261114_211703.json`）與 KF 審閱（`_review/submit_canyonkf_20261114_215730.json`）。
> 美術 session 不碰程式（鐵律 11），只寫在這裡。11-15 起動畫已交件（見下）；「程式效果」那一節是動畫之外要程式做的。

## ✅✅ 11-15 交件（Ray：「現在做好的先接上」）—— 現行版，取代下面 11-14 那一筆

Ray 11-15 規則：**待機 I 一律 Wan、攻擊依 Ray 分配走 Kling**；所有動畫用**快剪**（auto_cut）處理過、holds 已展開成 24fps 逐格。
格式同待機程式端版：`frame_NN.webp` ＋ `anim.json`（`canvas`＝立繪畫布、`box`＝換回立繪座標、`px`＝實際像素、`fps` 24）。
工具 `tools/anim/deliver_canyon.py`（座標鏈寫在檔頭）；第 0 格疊回立繪已驗過，位置吻合。

| 敵人 | 表 | 鑰匙（立繪檔名） | 待機 I（loop:true） | 動作（loop:false） | 動作格／秒 | 打到（主體最大格） | R |
|---|---|---|---|---|---|---|---|
| 石棺甲蟲 | ENEMY_ATK | `mon_canyon_coffinbeetle_dark` | `…_idle_v1/` 48 格 | `…_atk_v2/`（中立→撲→中立，一支到底） | 98／4.08 | 29 | 已含（片尾回中立） |
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
- 待機 I 的另 7 隻（香爐蠍、崖縫吊屍者、餓獸、鐘殼蟲、鎖鏈餓犬、提燈小鬼、爬行朝聖者）Wan 跑中，跑完補交在這裡。

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

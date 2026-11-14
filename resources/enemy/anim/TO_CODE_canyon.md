# 給程式 session：卡耶爾山谷（夢境碎片 02）敵人的程式效果（敵人線 2026-11-14）

> 出處：Ray 在 `tools/enemy_review/canyon.html` 提交的編排（`_review/submit_canyon_20261114_211703.json`）與 KF 審閱（`_review/submit_canyonkf_20261114_215730.json`）。
> 美術 session 不碰程式（鐵律 11），只寫在這裡。**動畫還沒交件**（Wan 跑完、等 Ray 在 animechk 剪），下面是「動畫之外要程式做的」，可以先排。

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

# 安雅立繪整套重畫成蕾娜畫風（2026-09-28，Ray 定案）

> Ray：「我一直覺得安雅的畫風跟其他人有點對不太上」→ 試畫 front（照 `renna_si_front` 的畫法）→「不錯，給過，把安雅照這模式全辦了」

- **病因**：安雅＝淡彩細線的輕小說插畫（淺色細線稿、上千根細髮絲、低對比、刺繡極密）；其他三人＝深描邊、成束髮塊＋強高光、高對比。
- **作法**：每一張附「舊差分＋新 front 基準」給 GPT：姿勢／表情／構圖／道具 100% 照舊差分，畫法與角色設計照新 front。真 alpha 直出。
- **交件**：同名覆蓋 `resources/si/anya_si_<鍵>.webp`（舊版進 `_recycle/`），原稿 `_originals/si/`；取景值每張 `measure_si.py` 重量，整批交接程式端（`?v=` 全跳）。

| 鍵 | 狀態 |
|---|---|
| front | ✔ 入庫（09-28 第一批，試畫定稿那張） |
| amaze | ✔ 入庫（09-28 第一批） |
| angry | ✔ 入庫（09-28 第一批） |
| answer | ✔ 入庫（09-28 第一批） |
| argue | ✔ 入庫（09-28 第一批） |
| armcross | ✔ 入庫（09-28 第一批） |
| back | ✔ 入庫（09-28 第一批） |
| clap | ✔ 入庫（09-28 第一批） |
| cry | ✔ 入庫（09-28 第一批） |
| crying | ✔ 入庫（09-28 第一批） |
| cryrun | ✔ 入庫（09-28 第一批） |
| curious | ✔ 入庫（09-28 第一批） |
| desperate | ✔ 入庫（09-28 第一批） |
| determine | ✔ 入庫（09-28 第一批） |
| die | ✔ 入庫（09-28 第一批） |
| eat | ✔ 入庫（09-28 第一批） |
| happy | ✔ 入庫（09-28 第一批） |
| hug | ✔ 入庫（09-28 第一批） |
| laugh | ✔ 入庫（09-28 第一批） |
| lookback | ✔ 入庫（09-28 第一批） |
| lookup | ✔ 入庫（09-28 第一批） |
| makeface | ✔ 入庫（09-28 第一批） |
| nervous | ✔ 入庫（09-28 第一批） |
| nightmareinstall | ✔ 入庫（09-28 第一批） |
| nod | ✔ 入庫（09-28 第一批） |
| panic | ✔ 入庫（09-28 第一批） |
| peace | ✔ 入庫（09-28 第一批） |
| point | ✔ 入庫（09-28 第一批） |
| read | ✔ 入庫（09-28 第一批） |
| relief | ✔ 入庫（09-28 第一批） |
| runworry | ✔ 入庫（09-28 第一批） |
| scare | ✔ 入庫（09-28 第一批） |
| scare2 | ✔ 入庫（09-28 第一批） |
| shy | ✔ 入庫（09-28 第一批） |
| side | ✔ 入庫（09-28 第二批） |
| silent | ✔ 入庫（09-28 第二批） |
| sleep | ✔ 入庫（09-28 第二批） |
| sleepy | ✔ 入庫（09-28 第二批） |
| smile | ✔ 入庫（09-28 第二批） |
| smileshy | ✔ 入庫（09-28 第二批） |
| smilesneaky | ✔ 入庫（09-28 第二批） |
| sob | ✔ 入庫（09-28 第二批） |
| stare | ✔ 入庫（09-28 第二批） |
| steady | ✔ 入庫（09-28 第二批） |
| surprise | ✔ 入庫（09-28 第二批） |
| talk | ✔ 入庫（09-28 第二批） |
| talkshy | ✔ 入庫（09-28 第二批） |
| terrify | ✔ 入庫（09-28 第二批） |
| think | ✔ 入庫（09-28 第二批） |
| upset | ✔ 入庫（09-28 第二批） |
| watch | ✔ 入庫（09-28 第二批） |
| wave | ✔ 入庫（09-28 第二批） |
| wheel | ✔ 入庫（09-28 第二批） |
| wheelback | ✔ 入庫（09-28 第二批） |
| wheelpoint | ✔ 入庫（09-28 第二批） |
| wheeltalk | ✔ 入庫（09-28 第二批） |
| whisper | ✔ 入庫（09-28 第二批） |
| worry | ✔ 入庫（09-28 第二批） |


## 第一批取景值（`tools/measure_si.py`，09-28）

```
anya_si_amaze            top:4 bot:1526 fx:0.485
anya_si_angry            top:3 bot:1525 fx:0.514
anya_si_answer           top:2 bot:1534 fx:0.468
anya_si_argue            top:2 bot:1528 fx:0.488
anya_si_armcross         top:0 bot:1529 fx:0.505
anya_si_back             top:3 bot:1525 fx:0.499
anya_si_clap             top:4 bot:1521 fx:0.493
anya_si_cry              top:0 bot:1532 fx:0.458
anya_si_crying           top:2 bot:1522 fx:0.470
anya_si_cryrun           top:4 bot:1519 fx:0.452
anya_si_curious          top:3 bot:1525 fx:0.428
anya_si_desperate        top:6 bot:1534 fx:0.412
anya_si_determine        top:4 bot:1521 fx:0.506
anya_si_die              top:0 bot:1525 fx:0.439
anya_si_eat              top:3 bot:1531 fx:0.508
anya_si_front            top:3 bot:1532 fx:0.507
anya_si_happy            top:3 bot:1530 fx:0.506
anya_si_hug              top:0 bot:1534 fx:0.470
anya_si_laugh            top:3 bot:1527 fx:0.474
anya_si_lookback         top:5 bot:1515 fx:0.520
anya_si_lookup           top:5 bot:1527 fx:0.479
anya_si_makeface         top:4 bot:1531 fx:0.469
anya_si_nervous          top:2 bot:1525 fx:0.479
anya_si_nightmareinstall top:0 bot:1528 fx:0.507
anya_si_nod              top:0 bot:1527 fx:0.499
anya_si_panic            top:0 bot:1522 fx:0.434
anya_si_peace            top:0 bot:1530 fx:0.479
anya_si_point            top:26 bot:1520 fx:0.406
anya_si_read             top:3 bot:1522 fx:0.491
anya_si_relief           top:7 bot:1511 fx:0.490
anya_si_runworry         top:8 bot:1511 fx:0.436
anya_si_scare            top:2 bot:1515 fx:0.488
anya_si_scare2           top:4 bot:1519 fx:0.364
anya_si_shy              top:8 bot:1527 fx:0.443
```

- ⚠ `nightmareinstall`：`top:0` 是**法環頂**不是頭頂，人也比舊版大一號 —— 要照憲法 §5（-635）用顏色挑人物重量，並確認 `rescale` 還要不要。
- ⚠ `cryrun`：原本是 Ray 丟進來、沒入庫的 `anya_si_cryrun.png`（已進 `_recycle/`），現在是新檔 `anya_si_cryrun.webp`。

## 第二批取景值（`tools/measure_si.py`，09-28）—— ✔ 58／58 全部入庫

```
anya_si_side             top:4 bot:1521 fx:0.424
anya_si_silent           top:4 bot:1521 fx:0.423
anya_si_sleep            top:209 bot:1269 fx:0.544 ⚠ 縱向只佔 69%，可能不是全身圖 → top/bot 不可當身高用
anya_si_sleepy           top:0 bot:1515 fx:0.464
anya_si_smile            top:0 bot:1521 fx:0.464
anya_si_smileshy         top:5 bot:1524 fx:0.452
anya_si_smilesneaky      top:3 bot:1529 fx:0.446
anya_si_sob              top:8 bot:1535 fx:0.377
anya_si_stare            top:0 bot:1521 fx:0.506
anya_si_steady           top:0 bot:1526 fx:0.499
anya_si_surprise         top:9 bot:1526 fx:0.459
anya_si_talk             top:8 bot:1526 fx:0.483
anya_si_talkshy          top:2 bot:1523 fx:0.479
anya_si_terrify          top:8 bot:1527 fx:0.458
anya_si_think            top:11 bot:1521 fx:0.483
anya_si_upset            top:0 bot:1522 fx:0.469
anya_si_watch            top:8 bot:1535 fx:0.478
anya_si_wave             top:0 bot:1525 fx:0.404
anya_si_wheel            top:0 bot:1526 fx:0.477
anya_si_wheelback        top:4 bot:1522 fx:0.504
anya_si_wheelpoint       top:5 bot:1514 fx:0.482
anya_si_wheeltalk        top:9 bot:1511 fx:0.458
anya_si_whisper          top:6 bot:1515 fx:0.416
anya_si_worry            top:7 bot:1524 fx:0.492
```

- ⚠ `sleep`：人比舊版大一號、位置也不同（坐姿），取景值要用新的，`cm`／`standCm` 可能要重調。
- `side`／`back` 舊版髮色偏米白，新版照基準改回淡紫。

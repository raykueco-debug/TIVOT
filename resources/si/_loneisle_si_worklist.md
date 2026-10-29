# 給程式 session 的工單 — 孤舟島劇本缺的立繪 26 張（2026-10-29，美術 session）

> 鐵律 11：我不動 `.js`。全部是**新檔名**，不是同名覆蓋 → 不必掛 `?v=`、不必 bust。
> 原 PNG 一律在 `resources/_originals/SI/<同名>.png`。取景值是 `tools/measure_si.py` 量的。
> 全部 1024×1536、真 alpha。Ray 10-29 定稿。

## 一、胡安（新角色，10 張）— `script/speakers.js`

`JUAN` / `JUAN_Q` 現在是 `art:null`（第 69 行註解寫著「交件後改成 `art:'juan'`」）——
現在交了：兩個都改 `art:'juan'`，並在 `ART` 新增 `juan`。

```js
juan: { src:'resources/si/juan_si_front.webp', side:'R', cm:/*身高未定，美術估 165（矮胖）*/165,
        top:6, bot:1513, fx:0.532,
  expr:{
    talk:    { src:'resources/si/juan_si_talk.webp',    top:7,  bot:1506, fx:0.557 },
    laugh:   { src:'resources/si/juan_si_laugh.webp',   top:5,  bot:1518, fx:0.546 },   // 哈哈哈！
    grin:    { src:'resources/si/juan_si_grin.webp',    top:5,  bot:1493, fx:0.631 },   // 漂亮的戰鬥！（摸八字鬍壞笑）
    shock:   { src:'resources/si/juan_si_shock.webp',   top:18, bot:1516, fx:0.422 },   // 主角開槍那一拍
    serious: { src:'resources/si/juan_si_serious.webp', top:3,  bot:1515, fx:0.534 },
    think:   { src:'resources/si/juan_si_think.webp',   top:11, bot:1499, fx:0.545 },   // 「……」被拿捏（搔光頭）
    smirk:   { src:'resources/si/juan_si_smirk.webp',   top:7,  bot:1514, fx:0.540 },   // 抱胸得意
    worry:   { src:'resources/si/juan_si_worry.webp',   top:13, bot:1497, fx:0.564 },   // 我可不想跟異端管理局扯上關係喔！
    sigh:    { src:'resources/si/juan_si_sigh.webp',    top:9,  bot:1496, fx:0.489 },   // ……幹都幹了，就當是那樣吧。
  } },
```
- `side`／`cm` 是我的建議，請照劇本站位定。睜眼的幾張眼睛一律茶褐色（Ray 指定一致）。
- ⚠ **船匠 `SHIPWRIGHT_LI` 還沒交**（候選圖在 Ray 那邊等確認），維持 `art:null`。

## 二、蘿芮（6 張）— `ART.laurie.expr` 加

```js
shout:    { src:'resources/si/laurie_si_shout.webp',    top:6,  bot:1535, fx:0.577 },   // 停！停手！／蕾姬娜學姐！那是……
command:  { src:'resources/si/laurie_si_command.webp',  top:8,  bot:1529, fx:0.508 },   // 這是十三課監察官的命令！
scheme:   { src:'resources/si/laurie_si_scheme.webp',   top:6,  bot:1521, fx:0.508 },   // 念告狀日期：低頭翻書、眼鏡全反光看不到眼睛、嘴微張、不笑
smile:    { src:'resources/si/laurie_si_smile.webp',    top:12, bot:1522, fx:0.563 },   // （蘿：微笑）
bow:      { src:'resources/si/laurie_si_bow.webp',      top:8,  bot:1522, fx:0.680 },   // 那麼，保重了（閉眼微笑鞠躬）
bowsweat: { src:'resources/si/laurie_si_bowsweat.webp', top:6,  bot:1522, fx:0.679 },   // 同姿勢、嚴肅臉掛滴汗
```
- `bow`／`bowsweat` 是同一個姿勢的差分（§5 -649）：位置可以直接共用 `bow` 的數字。

## 三、尼莫（6 張）— `ART.nemo.expr` 加

```js
hurt:        { src:'resources/si/nemo_si_hurt.webp',        top:13, bot:1527, fx:0.418 },   // 嗚……／學長……變得更強了呢
stubborn:    { src:'resources/si/nemo_si_stubborn.webp',    top:4,  bot:1527, fx:0.459 },   // 我也……還能打
panic:       { src:'resources/si/nemo_si_panic.webp',       top:5,  bot:1533, fx:0.606 },   // ！！呃——（被拆穿）
stumble:     { src:'resources/si/nemo_si_stumble.webp',     top:15, bot:1520, fx:0.531 },   // 好了啦，要走囉——（跌）
saluteblush: { src:'resources/si/nemo_si_saluteblush.webp', top:4,  bot:1525, fx:0.517 },   // 是！（驚＋臉紅敬禮）
collar:      { src:'resources/si/nemo_si_collar.webp',      top:4,  bot:1524, fx:0.519 },   // 同表情，站直扣起領扣（Ray 追加）
```

## 四、賽西莉（4 張）— `ART.cecilie.expr` 加

```js
furiouscry:  { src:'resources/si/cecilie_si_furiouscry.webp',  top:5,  bot:1531, fx:0.591 },   // 討厭……討厭！／看我把你們碾成塵埃！
coverlaurie: { src:'resources/si/cecilie_si_coverlaurie.webp', top:49, bot:1507, fx:0.648 },   // 哇——哇————！（撲去摀嘴）
pouttear:    { src:'resources/si/cecilie_si_pouttear.webp',    top:7,  bot:1528, fx:0.540 },   // 十三課的告狀精……
supportnemo: { src:'resources/si/cecilie_si_supportnemo.webp', top:8,  bot:1526, fx:0.599 },   // 真沒用！（扶尼莫）
```
- `coverlaurie`／`supportnemo` 是**單人立繪**（只用手勢演，沒畫蘿芮／尼莫）。
- ⚠ `coverlaurie` 的右手指尖貼到圖的右緣、`top:49`（身體大幅側傾）—— 照 §5 預設沿用 front 的尺即可，
  若站右側時指尖被畫面切到，進遊戲看過再調 `fxShift`。

## 五、還沒做（同一張工單的下一批）
- 索菈娜暈船系列：vomit（背對、撐牆、打馬賽克）／sick／covermouth／dizzy／sickembarrass／sickbed 或 sickpout ＋ 房內插圖（T3）。

## 六、追加：船匠（`SHIPWRIGHT_LI`，1 張，2026-10-29）

`SHIPWRIGHT_LI` 現在是 `art:null` → 改 `art:'shipwright'`，`ART` 新增：

```js
shipwright: { src:'resources/si/shipwright_si_front.webp', side:'R', cm:/*美術估 178*/178, top:7, bot:1517, fx:0.422 },
```
- 只用一句（「啥？現在這種狀況哪有辦法接那種麻煩事！」），一張 front 就夠。新檔名，不必 bust。
- ⚠ `top:7` 是**肩上那根木板**的上緣，不是頭頂（頭頂約在 30 上下）—— 鎖身高時人會被縮小一點；
  進遊戲覺得偏小就把 `top` 改成頭頂的值（§5「髮飾／持物會污染 top」）。
- 原 PNG：`resources/_originals/SI/shipwright_si_front.png`

# 交給程式 session：空中戰怪 3 隻的飛行地圖素材（2026-10-18，美術／動畫交件）

> Ray：「飛鰩 骨鯨 水母做飛行正面圖 要有游動振翅感」→「三隻跑完讓動畫跑原地游動振翅的 LOOP 動畫」
> →「直接照減格法抽 1/4、停 4/8 交件」
> 美術不碰程式（鐵律 11）—— 下面是要接的東西。

## 一、交件

| 怪 | 戰鬥立繪（已有） | 飛行正面圖 | 原地游動 loop |
|---|---|---|---|
| 骨刺飛鰩 | `resources/enemy/mon_sky_boneray.webp` | `flight/enemy/flm_boneray/view_0.webp`（1368×1824） | `flight/enemy/flm_boneray/swim_v1/`（30 張） |
| 浮空骨鯨 | `resources/enemy/mon_sky_ribwhale.webp` | `flight/enemy/flm_ribwhale/view_0.webp`（1376×1834） | `flight/enemy/flm_ribwhale/swim_v1/`（30 張） |
| 氣囊水母獸 | `resources/enemy/mon_sky_gasjelly.webp` | `flight/enemy/flm_gasjelly/view_0.webp`（1304×1738） | `flight/enemy/flm_gasjelly/swim_v1/`（30 張） |

- 飛行正面圖：§5「飛行地圖的怪只做正面一張」—— 頭朝鏡頭飛來、身體往深處透視縮短、真 alpha（GPT 原生）、
  主體佔中央 76%（四邊各留 12%）。原圖在 `resources/_originals/flight/flm_*_raw_v1.png`。
- loop：本機 Wan I2V（576×768、首尾鎖原圖、seed 101）生 48 格 16fps ＝ 3 秒，再照減格法抽格（見二）。
  影格是 Wan 的原生解析度（約 480×640 內裁出的聯集框），**不放大到原圖畫布**——飛行畫面上只有一兩百像素高。

⚠ 同資料夾另有 `swim_v2/`（8 張、停 0.25／0.5 秒的減兩次版）—— **Ray 10-18 選了 v1，v2 不要接**（回收等 Ray 點頭）。

## 二、⚠ `anim.json` 多了一格 `holds`（引擎要支援「每張停不同長度」）

```json
{ "canvas":[1368,1824], "box":[75,162,1239,1446], "frames":30, "fps":15,
  "holds":[1,2,1,2,…], "loop":true, "src":[0,1,3,4,…] }
```

- `canvas`／`box`：同 `resources/enemy/anim/` 的格式 —— `box` 是**在 `view_0` 畫布上的座標**（x, y, 寬, 高），
  影格要**縮放貼進這個框**（影格本身比框小，是刻意的）。
- `holds`：每一張停幾個 `1/fps`。`fps 15` ＋ `1,2,1,2…` ＝ 60fps 上停 **4／8／4／8** 格（Ray 的減格法），
  總長 3.00 秒，首尾接得上（最後一張接回第 0 張）。
- `src`：每一張取自 Wan 原片第幾格（紀錄用，引擎不必讀）。
- ⚠ 現行 `ENEMY_IDLE` 是等間隔播 `1000/fps`、沒有單格停留。**沒接 `holds` 也能播**（30 張 15fps ＝ 2 秒一圈，
  只是少了停格節奏、速度快 1.5 倍）；要照 Ray 的節奏就得讀 `holds`。

## 三、程式端要做的

1. `flight/index.html` 的 `ENEMY_KINDS` 加三筆（`plan` 用 `rigid` 或新的「整張播 loop」那一型——**不要走 chain 的分帶切翅**，
   振翅已經在影格裡了）；稀有度／出場條件等 Ray 的敵人卡。
2. 繪製時優先播 `swim_v1`，載不到退回 `view_0.webp` 靜態圖。
3. 讀 `holds`（見二）。
4. 這三隻還沒有敵人卡（`config.enemies`）—— 戰鬥那一邊同 `_sky_battle_spec.md`，待卡。

## 四、盤點（§0.1 兩邊都寫）

| 件 | 狀態 |
|---|---|
| 飛鰩／骨鯨／水母 飛行正面圖＋loop | ✔ 不欠（10-18 交件，Ray 看過圖與動畫） |
| 其餘 5 隻第一批（翼龍、巨蝠、巨蛾、飛鰻群、飛鱟）飛行圖 | ⚠ 欠（還沒做） |
| 第二批 8 隻 `mon_sky2_*` 飛行圖 | ⚠ 欠（還沒做；戰鬥卡也沒有） |

---

## 追加：懸環長鏈（`sky2_ringchain`，孤舟島空之主，2026-10-30 交件）

| 件 | 路徑 |
|---|---|
| 戰鬥立繪（已有） | `resources/enemy/mon_sky2_ringchain.webp` |
| 飛行正面圖 | `flight/enemy/flm_sky2_ringchain/view_0.webp`（1440×1920；原圖 `resources/_originals/flight/flm_sky2_ringchain_raw_v1.png`） |
| 原地振翅 loop | `flight/enemy/flm_sky2_ringchain/swim_v1/`（30 張＋`anim.json`，格式同上，`fps 15`、`holds 1/2`、3 秒一圈） |

- 正面：獨眼圓環正對鏡頭、骨翼左右張、環節長身從圓環背後往上方深處退（透視縮短）。GPT 原生 alpha；
  原圖左右貼邊（翼尖被切約 5px，肉眼看不出），本機補白成 1440×1920（左右各 12%）。
- loop：本機 Wan（**960×704 寬畫布**、FIT 0.62、首尾鎖原圖、seed 101、motionfix）48 格 → 照減格法抽 30 張。
  ⚠ 576×768／768×768 兩次都會把翅膀撐到左右出框（6~7 格），寬畫布才解；剩 3 格上緣碰 1~4px，可忽略。
- ⚠ 振翅比靜態圖張得開很多 ⇒ `box` 是 `[-382, 103, 2225, 1421]`（負座標、比畫布寬）—— 程式端 ver -2316 已支援。
- 影格縮到 Wan 原生的 55%（504×321），整包 841 KB。
- 程式端：`SKY_FLIGHT_ANIM` 加一列。

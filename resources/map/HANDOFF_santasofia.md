# 交接：聖索菲亞城 — 美術 → 程式

> Ray（2026-09-11）：「再跑一個城市圖，拓樸參考帝都」→「聖索菲亞城，西班牙風」
> →「聖索菲亞城也交件」

**12 格背景已入庫**，拓樸就是帝都那一套。這份是接點說明 ——
**我沒有動任何程式檔**（鐵律 11）。

---

---

## ⚠⚠⚠ 本輪的範圍：**先搭景**（Ray，2026-09-11：「沒關係，先搭景，交給 code 動手」）

**這一輪只要做到「降得下去、12 格走得通、看得到背景」**。
店主、接待員、旅店的伙伴門、餐飲街分店、時段差分 —— **全部先不要做**
（那些都要新立繪或新圖，我這邊還沒交）。

| 先做 | 先不做 |
|---|---|
| `SETTLEMENTS` 那一列補 `town:'santasofia'` | 店舖（`config.shop.shops.ss_*`）與貨單鑰匙 |
| `TOWNS.santasofia` 的 12 格（抄 `capital` 的 `nodes`，換 `name`／`bg`） | 店主／櫃台的 speaker id 與立繪 |
| **每一格 `noTime:true`**（現在 0 張差分） | 旅店大廳與四扇伙伴門（`innDoors`） |
| `entry:'square'`、`square` 的 `sail` | 餐飲街分店（`dining.scenes` 先不給，只寫 `{ node:'tavern' }`） |
| | 槍棺小地圖（`map:`）—— 圖還沒畫，先整欄不寫 |
| | `acts`／`bgm`／城鎮戰／安全區旗 |

⇒ 驗收就是：**降落 → 主廣場 → 三個樞紐與九個末端全部走得到、退得回來**，
每一格的背景都出得來（`noTime` 有寫的話 0 個 404）。

## 〇、先看這兩個檔

| 檔 | 是什麼 |
|---|---|
| `resources/map/_santasofia_spec.md` | **權威**：拓樸、逐格特徵、西班牙風的畫風清單 |
| `resources/background/Sofia_*.webp` | 12 張，1536×1024、q85 |

---

## 一、接點：**大地圖上那座城已經在了，缺的只是 `town:`**

`flight/index.html` 的 `SETTLEMENTS` 已經有這一筆（插畫、位置、旋轉都做過了）：

```js
{ n:'聖索菲亞城', x:559, y:562, t:'city1', f:'free',
  plan:'city/stown_plan.webp', planH:'city/stown_h.webp',
  planW:800, planRot:0.79, planTall:50 },
```

它**沒有 `town:`** ⇒ 飛過去看得到城，但**降不下去**。要做的只有一件事：

```js
{ n:'聖索菲亞城', x:559, y:562, t:'city1', f:'free', town:'santasofia',
  plan:'city/stown_plan.webp', planH:'city/stown_h.webp',
  planW:800, planRot:0.79, planTall:50 },
```

（照帝都那一列 `town:'capital'` 的寫法；`nearestTown` 的著陸掃描自然吃到，
**程式不必改**。）

⚠ **位置與旋轉一個字都不要動**：那三個值是 `place_city.py` 拿插畫的水域遮罩
去對地圖河道**搜出來**的，而且必須與 `flight/build_city.py` 的 JOBS 一致。

---

## 二、拓樸 ＝ **直接抄 `capital` 的 `nodes`**（12 格・11 邊・環 0）

大城地圖已經規則化（§6.5.4.2），所以節點 id、出口、樞紐／末端的分佈**一格不改**，
只換 `name` 與 `bg`：

| 節點 id | 向數 | 出口 | `name` | `bg` |
|---|---|---|---|---|
| `square` | 3 | `{ up:'midtown', left:'oldtown', right:'uptown' }` | 聖索菲亞　主廣場 | `Sofia_Square` |
| `midtown` | 3 | `{ left:'cityhall', right:'church', down:'square' }` | 聖索菲亞　中心區 | `Sofia_Midtown` |
| `church` | 末 | `{ back:'midtown' }` | 聖索菲亞　大教堂 | `Sofia_Church` |
| `cityhall` | 末 | `{ back:'midtown' }` | 聖索菲亞　市政廳 | `Sofia_Cityhall` |
| `oldtown` | **4** | `{ left:'gunstore', right:'square', up:'dock', down:'guild' }` | 聖索菲亞　舊街區 | `Sofia_Downtown` |
| `gunstore` | 末 | `{ back:'oldtown' }` | 聖索菲亞　武器店 | `Sofia_Firearm` |
| `dock` | 末 | `{ back:'oldtown' }` | 聖索菲亞　船塢 | `Sofia_Dock` |
| `guild` | 末 | `{ back:'oldtown' }` | 聖索菲亞　賞金獵人公會 | `Sofia_Guild` |
| `uptown` | **4** | `{ left:'square', right:'tavern', up:'inn', down:'grocery' }` | 聖索菲亞　上街區 | `Sofia_Uptown` |
| `tavern` | 末 | `{ back:'uptown' }` | 聖索菲亞　餐飲街 | `Sofia_Bistro` |
| `grocery` | 末 | `{ back:'uptown' }` | 聖索菲亞　雜貨舖 | `Sofia_Grocerie` |
| `inn` | 末 | `{ back:'uptown' }` | 聖索菲亞　旅店 | `Sofia_Hotel` |

### ⚠⚠ 三個很容易抄錯的地方

1. **節點 id 是 `oldtown`，背景檔名是 `Sofia_Downtown`** —— 帝都本來就是這樣
   （id `oldtown` / bg `Capital_Downtown`）。**不要順手統一成同一個字**。
2. **帝都的公會背景拼錯成 `Captal_Guild`**（少一個 `i`）。那是既有的檔名，
   不要照抄進聖索菲亞 —— 這邊是正確的 `Sofia_Guild`。
3. **`square` 是入口**（`entry:'square'`），而 **入口那一格不可以有戰鬥**（§6.5.2）。
   出航掛在 `square` 的下方（`sail:`），照帝都那一列。

⚠ 接完仍要跑 `tools/script_lint.py`（驗同一條邊兩端相反、單向邊、指到不存在的節點）。
⚠ `tools/map_layout.py` 的 `POS` 可以**直接複製 `capital` 那一組** —— 節點 id 一樣，
方向驗證自然會過。

---

## 三、背景檔名

```
resources/background/Sofia_{Square,Midtown,Church,Cityhall,Downtown,Firearm,
                            Dock,Guild,Uptown,Bistro,Grocerie,Hotel}.webp
```

- ⚠⚠ **目前 0 張時段差分** —— 節點資料**要寫 `noTime:true`**，
  否則候選鏈會先去試 `_dawn/_day/_dusk/_night` 四個名字，每一格白吃好幾個 404
  （§6.5.4 的插圖那一條同理）。差分交件之後再把 `noTime` 拿掉。
- 12 格幾乎全是室外，照「有室外光才有差分」＝**全做就是 36 張**。
  要不要做由 Ray 決定；要挑的話建議先做四個樞紐：
  **`square`／`midtown`／`oldtown`／`uptown`**（玩家一定會反覆經過）。
- **餐飲街的分店還沒有**：帝都的 `tavern` 有 `dining.scenes`（咖啡廳／餐廳／
  甜品店／酒吧四張）。聖索菲亞只有一張 `Sofia_Bistro` ⇒
  `dining` 那一欄先只寫 `{ node:'tavern' }`、**不要給 `scenes`**（§6.5.4.2：
  城裡沒有那一家就不換，照節點原本那一張）。
- 前綴 `Sofia_` 與地圖 id `santasofia` **不同名是刻意的**（檔名短、id 完整）。
  要統一趁現在 —— 這批還沒上線，改名沒有快取問題（§5）。

---

## 四、⚠⚠ 還缺什麼

### Ray 要決定的

1. **這座城在劇情裡是什麼**：現在是「試放」的一座城。要不要能降落、第幾章開放、
   進去演什麼（`acts`）、`bgm`、有沒有城鎮戰 —— 全是劇本的判斷，我不自己發明。
2. **店舖與旅店要不要真的開**。要開的話至少還要：
   · `config.shop.shops.ss_grocery` / `ss_gunstore`（店主圖與**貨單鑰匙**都要另開 ——
     `script/shopstock.js` 分開記帳，共用的話帝都買空的東西飛過來也是空的）
   · 店主的 speaker id（顯示名一樣但**不是同一個人**，art 不同就不能共用 id）
   · 旅店的四扇伙伴門要不要在（`innDoors`）
   ⇒ 這些都要**新的立繪**，我這邊還沒畫。先只開「走得進去、看得到背景」也成立。
3. **安全區旗**：城上要不要 `safehouse:true`（帝都是一直插著的）。

### 我這邊還沒交的

4. **槍棺小地圖**（`map:{ img, spots }`）。流程同 `HANDOFF_fallen.md` §四：
   程式先接進 `script/town.js` → `tools/map_layout.py` 產權威佈局 →
   我照它畫羊皮紙圖 → `tools/map_check.py` 產 `_spots_santasofia.json` → 程式照抄。
   ⚠ 在那之前 `map` 整欄先不要寫（地圖鈕照樣常駐，點下去回「這一帶還沒有留下地圖。」）。
5. **12 格 × 4 時段的差分**（見 §三）。
6. **店主／接待員立繪**（見上）。

---

## 五、版本 → 動了哪幾支檔案（鐵律 11）

| 版 | 檔案 |
|---|---|
| ver -1056 | `resources/background/Sofia_*.webp`（12 張，已 commit） |
| **本輪** | `resources/map/_santasofia_spec.md`（改：節點 id `downtown`→`oldtown`、補 back 的去處）<br>`resources/map/HANDOFF_santasofia.md`（新增） |

⚠ `flight/index.html` 在我這一輪是**改動中**的狀態（程式 session 正在動它）——
我沒有碰、也沒有 commit 進來。

# 2026-09-16 美術產線交接（接 `_HANDOFF_ART_20260904.md`）—— **四條線同時在跑，全部未完成**

> ⚠⚠ **美術與程式是兩條版本線，不要互相借號**（`HANDOFF.md` 自己就記著這一條）。
> 這一份只講美術；程式那邊的進度看 `HANDOFF.md`，**不要去改它的抬頭**。

> 交件一律只寫各自的目標夾，**原檔一張都沒動**。
> 生成的原始 PNG 在 `resources/_originals/**/*_raw.png`（**帶 `_raw` ＝未處理**）。
> ⚠⚠⚠ **`_originals` 在 `.gitignore` 裡，換機器不會跟著走** —— 要留就自己複製。

## 一、蕾娜髮飾換裝（月桂葉 → 銀製勿忘我）**Ray 指示擱置**

交件夾 `resources/SI/renna_newhair/`

```
57 張 ├ 合格 19  ├ 待修 23  └ 未跑 15
```

**未跑 15**：commandsoft meltdown meltdowncry reach run scarecute scared scarejump
shocked shockedCalm shockedopen sigh sighsweat surprised unbraid

**做法（Ray 定，不准自己改）**
1. **一組＝兩張圖**：該張原圖 ＋ `renna_newhair/_ornament_master2.png`（髮飾母版）。不准有其他做法。
2. 提示詞就一句，**不要加長**：`嚴格保持原畫風，嚴格保持髮飾設計細節，只換髮飾，alpha 背景`
3. **不要提「勿忘我」或任何花名** —— 一提名字模型就自己發揮（前七版全敗在這）。
4. session 不必每張換：**第一張對了就沿用**，出現偏差就換 session 從那張重跑。
5. 驗收：`py tools/renna_finish.py <base>`；全體：`py tools/renna_audit.py`
   門檻 **平均差 ≤6 且人物高 ≤5px**。實測合格全落 2~5.6、壞的全在 6.5 以上，中間是空的。

⚠ **Ray 還沒答的**：門檻要不要放寬到 12（23 張待修裡有 14 張落在 6~14，肉眼看不出問題）。
對照條已給過他看，他沒回。**沒答就維持 6。**

## 二、東泊街道拔鐵軌 —— day 完成，**時段差分未做**

```
✔ East_Midtown_day.webp   軌道整條移除、鋪面補成連續石板，其餘完全不動
✔ East_Square_day.webp    同上
✘ 兩格的 dawn / dusk / night 共 6 張 —— 從修好的 day 用 Gemini 重新衍生
```

⚠ `East_Oldtown`／`East_Uptown` 乾淨，不用動。`East_Dock` 那條是**起重機軌道不是街道電車**，
Ray 未表示要拔，先留著。

## 三、平原古道（新圖）—— 1 / 20

拓樸與工單：`resources/background/_plainsroad_spec.md`、`resources/map/_layout_plainsroad.png`

```
✔ Plains_Entry_day.webp   道口（驗收帶過：地表 V 126、S 25.7%）
✘ 里程碑／烽燧臺／草海／古井驛 的 day（4 張）＋ 全部 15 張時段衍生
```

⚠⚠ **水只出現在頭尾兩格**（Ray：「古道不要有水」→「第一張可以有」→「最後一張的溪谷也可以有」）：
道口與溪谷口可以有水，**中間三格一律不出現海灣／河／池／水窪**。
地形統計那 27% 的水是**整條走廊**的，不代表每格都看得到水。

## 四、NPC 立繪去背重做 —— 3 / 13

`resources/SI/NPC/` 量過 45 張，**13 張完全沒有 alpha**（全透 0.0%，整張不透明）：

```
✔ 已修  NPC_Gunsmith_SI_v1 v2 v3      （全透 0% → 57~74%）
✘ 待修  NPC_Gunsmith_SI_v4 v5
        NPC_Grocer_SI_v2 v3 v4 v5
        NPC_GuildCounter_SI_v1 v3 v4 v5
```

提示詞（§5 的短句，長篇反而容易踩內容判定）：`重繪此角色，100%保留原角色細節，alpha背景`
驗收：`py tools/npc_finish.py <base>`（全透 <15% 會拒絕入庫）

## 五、貝利薩爾古城中庭 —— 2 / 8

```
✔ Belisar_GreatCourt_day.webp        乾涸・日景
✔ Belisar_GreatCourt_flood_day.webp  積水・日景（含龍造成的破壞：高處斷裂的導水渠在灌水）
✘ 兩者的 dawn / dusk / night 共 6 張（Gemini 衍生，不吃 GPT 額度）
```

設計要點在 `_plainsroad_spec.md` §五：**封閉的下凹花園**（地面層無任何缺口／排水溝，
上方對天空敞開、飛船垂直降落），**積水來自龍打斷的上層水道**。
節點名 Ray 定為「**古城中庭**」（城深處那一格維持「下沉中庭」）。

## 六、⚠ 程式端要接的（美術不動，鐵律 11）

1. ⚠⚠⚠ **`ASSET_VER` 一定要動** —— 這一輪有 **5 個同名覆蓋**
   （`East_Midtown_day`／`East_Square_day`／`NPC_Gunsmith_SI_v1~v3`）。
   不動的話玩家端抱著舊圖，**而症狀只是「圖沒換」，查不出原因**。
2. **東泊餐飲街**要改成室外街景（`tavern` 那一格現在掛的是 `East_Bistro`＝酒吧室內，
   但它在拓樸上是四向樞紐）。**Ray 還沒答**：酒吧要不要另開一格（A 四條路／B 酒吧退場）。
   規格寫在 `resources/map/_eastport_spec.md` 末段。
3. `Plains_*` 與 `Belisar_GreatCourt*` 是**新檔**，要接進 `script/town.js` 才用得到。

## 七、⚠⚠⚠ 產線的坑（都會**靜默失敗**，下一台機器照抄）

1. **Chrome 下載同名不覆蓋**，會存成 `xxx (1).png`。腳本要取「最新的那一個」、用完刪。
2. **glob 前綴碰撞**：`gen_chase*.png` 會吃到 `chase2`。要精確比對。
3. **驗收門檻不可與處理門檻相同**：曾用「彩度 ≥0.12」清藍、又用同一門檻驗「還有沒有藍」，
   殘留的淡藍必然量不到。**驗收要用比處理更寬的門檻。**
4. ⚠⚠ **Chrome 會封鎖「多個自動下載」** —— 觸發後 `fetch` 照樣拿得到 blob、
   腳本回報 `ok:true`，但**檔案根本沒寫出來**。這一輪就是這樣停的。
   **每隔幾張要 `ls` 對一次檔案有沒有真的落地**；被擋了要在網址列放行。
5. **內建瀏覽器沒有 `file_upload`**，而 chatgpt.com 的 CSP 擋死從網路進料 ——
   上傳只能走 Claude in Chrome。這不是作業系統差異，換 Mac 一樣。
6. `javascript_tool` 的等待迴圈**不要超過 40 秒**（CDP 45 秒逾時）。
7. ⚠ **排程任務要先按一次「Run now」把工具授權吃掉**，否則它會準時觸發、然後整夜停在
   權限提示上什麼都沒做（這一輪真的發生過，浪費一晚）。

## 八、⚠ 未追蹤的檔案（**不是美術 session 產的**）

`resources/SI/` 底下有一批 Ray 自己放的 PNG（`Anya_SI_*`／`Renna_SI_lookfaropen`／
`reachcry`／`scream`／`Sorana_SI_battlecry`／`Torsten_SI_Q`／`sorana_SI_Q`／
`gen_Renna_SI_blushed`）與 `resources/illustration/018*_rennafantasy.png`。

⚠ Ray 交代過「**PNG 不要再放 SI 資料夾**」—— 這些應該轉 webp、原 PNG 進 `_originals`。
**這一輪為了換機器不掉檔，先原樣 commit 進版控**（掉了就沒了，位置不對還救得回來）。

---


## 九、⚠⚠⚠ 程式端要接的：貝利薩爾拓樸改動（ver -1378，Ray 交辦）

> Ray 的原話：「懸梯井移到鐘室跟排水崖口之間／枯井底跟崩頂坡連起來／把古代祭壇換成
> 新板的／下沉中庭右邊連到崩頂坡／星象室連兵器工房／獸欄連靜水池／寶冠室跟聖物室移到
> 王座廳左右／**這個地圖的重點是把敵追到王座廳決戰／所以王座廳以外不能有死路**」
> 追加修正：「**只有祭壇跟王座廳兩旁的房間是死路**」（祭壇＝觸發點）。

**這是程式的活（鐵律 11），美術不動 `script/town.js`。** 改動已經逐條解成
出口欄位，而且**驗過了**（見下）。照抄即可，改完把 `resources/map/_belisar_patch.json`
刪掉 —— 那份 patch 是提案用的，留著就變成第二份拓樸（鐵律 7）。

### 改 `script/town.js` 的 `TOWNS.belisar.nodes`

| 節點 | 拆掉 | 改成／新增 |
|---|---|---|
| `stairwell` 旋梯井 | `up→mirrorpool`、`left→muralwalk`、`down→incense` | `up→draincliff`、`left→bellroom` |
| `draincliff` 排水崖口 | — | `down→stairwell` |
| `bellroom` 鐘室 | — | `right→stairwell` |
| `muralwalk` 壁畫長廊 | `right→stairwell` | `down→incense` |
| `incense` 聖油室 | `up→stairwell` | `up→muralwalk` |
| `mirrorpool` 靜水池 | `down→stairwell` | `down→cages` |
| `cages` 獸欄 | — | `up→mirrorpool` |
| `drywell` 枯井底 | — | `down→rooffall` |
| `rooffall` 崩頂坡 | — | `up→drywell`、`left→courtyard` |
| `courtyard` 下沉中庭 | — | `right→rooffall` |
| `forge` 兵器工坊 | — | `up→starroom` |
| `starroom` 星象室 | — | `down→forge` |
| `throne` 王座廳 | — | `left→crown`、`right→offering` |
| `crown` 寶冠室 | `right→antecham` | `right→throne` |
| `offering` 聖物室 | `left→antecham` | `left→throne` |
| `antecham` 謁見前廳 | `left→crown`、`right→offering` | —（剩 `up→throne`、`down→dragstair`） |
| `ossuary` 納骨堂 | — | `down→wardtomb` ⚠ **美術提的第 8 條，見下** |
| `wardtomb` 近衛墓室 | — | `up→ossuary` ⚠ 同上 |

**兩條是美術補的，不是 Ray 交辦的**（旋梯井搬走之後 `incense` 會變成新的死路 →
`muralwalk↔incense` 直接接起來；`ossuary`／`wardtomb` 是七條改完唯一剩下的兩格死路，
一條邊同時修掉兩格，而且兩間都是骨室，題材對得上）。**不同意就退回來，別默默照做。**

### 驗過的三件事

1. **死路 0 格**（允許的除外：`altar` 觸發點、`throne`、`crown`、`offering`、
   `entrance` 地圖入口）。改動前是 12 格。
2. **同一條邊兩端方向相反**：0 筆不合（§6.5.4.3 那條會害人「一直按同方向在兩格之間彈」）。
3. **每一格的出口數對得上那張背景圖** —— 見下一節，**有兩張圖不夠用**。

### ⚠ 美術這一邊要補的圖（我做，不是程式的事）

| 圖 | 為什麼 | 狀態 |
|---|---|---|
| `Belisar_OldAltar` ＋ `Belisar_OldAltaractive` 古代祭壇 | Ray：「已經定稿了」「**祭壇用這兩張**」＝ 既有的 `Belisar_EntryHall` 那一對（閒置＝淡青微光／啟動＝台座升起＋翠綠電路線） | **✔ 已交** |
| `Belisar_RoofFall` 崩頂坡 | 現圖只畫得出**兩條**路（右側拱廊、往左上爬的碎石坡）。Ray 要它接**三條** → 前景碎石間補了一道**塌陷的井口**（圓形石砌井緣破開、往下是黑暗豎井）＝通枯井底那一條 | **✔ 已交（四張時段差分全部重做）** |
| `Belisar_Ossuary` 納骨堂 | 現圖是圓廳，四周全是**嵌著雕像的盲龕**，開不出第二條路 → 要補一道真的通道 | 待畫 |

**古代祭壇這一件的細節（已完成，程式端只有兩個小動作）：**
· 圖已就位：`Belisar_OldAltar.webp` ／ `Belisar_OldAltaractive.webp`（1536×1024，
  內容＝定稿的那一對）。舊的巨石祭壇與我誤產的那張已進 `_recycle/`。
· **`bg` 欄位不必改** —— `altar` 那一格本來就寫 `bg:'Belisar_OldAltar'`、也已經有 `noTime:true`。
· ⚠ **同名覆蓋** → `config.js` 的 `ASSET_VER` 要給 `belisar_oldaltar` 跳號，否則玩家
  抓到的還是舊的巨石祭壇（而症狀只是「圖沒換」，查不出原因，§5）。
· ⚠ **啟動版要有人接**：祭壇啟動時換成 `Belisar_OldAltaractive`（與入口大廳那一件同一個機制）。
· ⚠ `Belisar_EntryHall*.webp` 現在與祭壇**內容相同但沒有任何節點在用** ——
  之後若不打算另做「入口大廳」那一格，這兩張可以回收。
⚠ `Belisar_GuardTomb` 近衛墓室**不必重畫**：中央甬道本來就往深處走得通，`up` 接得出來。
**崩頂坡這一件的細節：**
· 四張全部重做：`Belisar_RoofFall_dawn/_day/_dusk/_night`（1536×1024）。
  日景由 GPT 改圖（只加井口），其餘三張由同一張衍生 —— 構圖、視角、景物位置一個字沒動。
· 夜景照憲法走：**不畫月亮本體**（這一格的鏡頭朝向沒有定案），只有銀白月光把空間洗成銀藍、
  右側拱廊的暖橙火光是畫面唯一的暖色。
· 三條路在圖上分別是：**右側亮著的拱廊**（壁畫長廊）／**往左上爬到露天的碎石坡**（下沉中庭）／
  **前景的塌陷井口**（枯井底）。
· ⚠ **四個檔名都要跳 `ASSET_VER`**（`belisar_rooffall_dawn`／`_day`／`_dusk`／`_night`）——
  一組差分要一起帶，漏掉哪一張哪一張就被快取住（§5）。

⚠ 崩頂坡與納骨堂是**同名覆蓋** → `config.js` 的 `ASSET_VER` 那三筆要跳號，否則瀏覽器抱著舊圖不放
（§5，而且症狀只是「圖沒換」，查不出原因）。

### 提案圖

`resources/map/_thumbs_belisar_proposal.png` —— 縮圖＋名字＋每格幾條路，
**紅線＝這次新增的邊、藍框＝刻意留的死路**。由 `tools/map_thumbs.py belisar --patch …`
從 `town.js` 真的跑出來，不是手畫（同 §6.5.4.3「回給美術的佈局簡圖要用工具產」）。

## 十、⚠ 程式端要接的：店舖營業時間 ＋ `noTime`（ver -1378，Ray 交辦）

> Ray：「餐廳 公會 槍店 雜貨店這些**早上 8 點開下午 5 點關**，所以只有 day 不用四差分」
> 「**只有旅店是四差分，酒吧有日昏夜三差分**」

美術規格那一半已經**入憲**（CLAUDE.md §5「有營業時間的室內設施」那張表）。
**這一半是資料，程式端改**（鐵律 11，美術不動 `script/town.js`）：

### 1. `hours` 要由 `[8,20]` 改成 `[8,17]`

現況全部是 `[8,20]`（開到晚上八點），與 Ray 這一句不符：

| 城 | 節點 | 現況 |
|---|---|---|
| 帝都 | `gunstore` 武器店／`guild` 公會／`grocery` 雜貨舖 | `[8,20]` |
| 北方泊地 | `gunstore`／`guild`／`grocery` | `[8,20]` |
| 東方泊地 | `gunstore`／`guild`／`grocery` | `[8,20]` |
| 夏爾村 | `grocery` 雜貨街 | `[8,20]` |

⚠ **餐廳**在資料上是餐飲街的分店（§6.5.4.2），沒有自己的 `hours` ——
要不要給餐飲街那一格分時段，Ray 未定。
⛔ **不要一起改的**：酒吧 `[8,24]`（`lateNight`）／旅店（全天）／
教堂 `[8,19]`／行政廳・市鎮中心 `[8,17]`（本來就對）／工坊 `[8,19]`。

### 2. 只有 day 的那幾格要補 `noTime:true`

不補的話每次進去都先吃 `_Dusk`／`_night` 的 404 才退回 day，而且**玩家的快取裡
可能還留著舊的那幾張** → 候選鏈先命中它們＝「五點就關門的店卻是夜景」，
**而且沒有任何錯誤訊息**（§5 那個快取坑）。
⚠ 聖索菲亞與拉芬斯達爾的 `grocery` 已經寫了 `noTime:true`，照抄即可。

### 3. ⚠ 美術這一邊等你們改完才動手

現有**多交的 17 張**（照新規格該回收）：

    Capital_Firearm_Dawn / _Dusk
    Captal_Guild_Dawn / _Dusk
    Capital_Grocerie_Dawn / _Dusk
    Shinier_Grocery_Dawn / _Dusk / _Night
    East_Firearm_dawn / _dusk / _night
    East_Guild_dawn / _dusk / _night
    East_Grocerie_dawn / _dusk / _night
    Capital_Bistro_Dawn          ← 酒吧只要 日/昏/夜，不要 Dawn

**`hours` 還沒改之前不回收** —— 現在玩家真的走得到 19:00 的槍店，
先收掉黃昏那張會讓那一格當場變白天。順序是：**改 `hours` → 美術回收 → 跳 `ASSET_VER`**。

### 4. 順帶回報：缺一張

`Capital_Dessert`（帝都餐飲街・甜品店）**一張圖都沒有** —— 那一格現在退回節點原本那張。
照新規格它只要 **一張 day**。要我補就說一聲。

## 十一、✔ 平原古道：**20 張全部交完**（ver -1378）

`resources/background/plains/Plains_{Entry,Stone,Beacon,Sea,Well}_{dawn,day,dusk,night}.webp`

| 格 | 畫面上讀得出幾條路 | 對應拓樸 |
|---|---|---|
| `entry` 道口 | 古道從丘陵下來、前方沒入草原；**遠景右緣有海灣** | 2（`up:stone` ／ `down:@eastport`） |
| `stone` 里程碑 | 風化石柱立在岔口：**正前一條、左邊一條** | 3（`up:sea` ／ `left:beacon` ／ `down:entry`） |
| `beacon` 烽燧臺 | 半塌圓塔在**白灰岩脊**上，單一條路上來**到此為止** | 1（`back:stone`） |
| `sea` 草海 | 及腰乾草吞掉路面、只剩兩道車轍：**正前一條、右邊一條** | 3（`up:ravine` ／ `right:well` ／ `down:stone`） |
| `well` 古井驛 | 驛站殘牆＋朽壞轆轤的**乾井**，路到驛站前**到此為止** | 1（`back:sea`） |
| `ravine` 溪谷口 | —— **不畫**，照 Ray 指定沿用 `Belisar_Exterior_*`（已存在四張） | 2 |

- **水規則照 Ray 的定案**：只有**道口**（遠景海灣）與**溪谷口**（沿用的那張）有水，
  中間四格**一滴水都沒有**（連古井裡也是乾的）。
- **月亮本體六格都沒畫**（spec §三：行進方位 205.2°、月亮 266.4°，偏出畫面 61.2°）——
  night 一律「月光從畫面右緣之外的右前方來、影子往左前方拖」。
- 產法：GPT 畫日景（附上 `Plains_Entry_day` 鎖畫風），其餘三張同一串衍生、只換光與色溫。
- ⚠⚠ **色調驗收的結論寫進 `_plainsroad_spec.md` 了**：那條 `S ≤29%` **只對材質混合的畫面成立**，
  草海／古井驛那種「整片草」的格子會算出 35~40%，**那不是太鮮豔**。
  照它壓下去實測會把乾草的暖色抽乾（已還原）。同題材校準（`Belisar_Exterior`）下，
  這一批的 night 甚至**比已驗收的還不飽和**。

### ⚠ 程式端要接的

1. **`TOWNS.plainsroad` 這張圖還不存在** —— 節點、出口、`rest:true`、`mist`（不寫＝有霧）、
   `wildSpawn.endBattle` 照 `_plainsroad_spec.md` 第一節那份拓樸建；
   兩個跨圖出口（`@eastport` ／ `@belisar`）要兩邊對接。
2. `ravine` 那一格的 `bg` 指 **`Belisar_Exterior`**（不要另外要圖）。
3. 20 張都是**新檔**（`plains/` 這個資料夾本來只有一張），除了 `Plains_Entry_day` 是
   **同名覆蓋** → `ASSET_VER` 的 `plains_entry_day` 要跳號。


## 十二、✔ 東泊鐵軌 ＋ 貝利薩爾中庭（ver -1378）

### 東泊：鐵軌的時段差分補完（6 張）

`East_Midtown_{dawn,dusk,night}` ／ `East_Square_{dawn,dusk,night}` **全部重做**。
⚠ 成因記一筆：day 那兩張在 9/16 已經把鐵軌拔掉，但**另外三個時段是 9/14 的舊檔**
—— 玩家在清晨／黃昏／夜晚走過去，地上的電車軌道還在。
**同一組差分只修其中一張＝沒修**（§5 的快取條也是同一個道理：一組要一起帶）。
· 由已修好的 day 衍生，提示詞明寫「地面上沒有鐵軌，也不要把鐵軌加回來」。
· 夜景：不畫月亮本體，冷月光＋街燈暖黃光池的對比。
· ⚠ 六個檔名都要跳 `ASSET_VER`。

### 貝利薩爾中庭：8 張到齊

`Belisar_GreatCourt_{dawn,day,dusk,night}` ＋ `Belisar_GreatCourt_flood_{dawn,day,dusk,night}`
—— 這一輪補的是**乾涸與積水各三張**時段差分（day 兩張本來就有）。
· 乾涸版明寫「中庭裡沒有水，保持乾涸」；積水版明寫「水面要保留、水位高度不變」。
· 積水版那道**瀑布是原圖就有的**（龍破壞高架水道形成的那一道），不是模型加的。
· 夜景一律不畫月亮本體。
· ⚠ 六個新檔 ＋ `ASSET_VER`：`flood` 在**基底名**裡（`bandNames` 的時段永遠在最後），
  程式端只要把那一格的 `bg` 在乾／積水之間換字串，引擎一行都不必改。

## 十三、✔ 平原古道的槍棺小地圖（ver -1378）

**這就是古道最後缺的那一件** —— 20 張場景交完之後，那一格點地圖鈕仍會顯示
「這一帶還沒有留下地圖」，因為每座城的小地圖是另一份資產：
`resources/map/map_<城>.webp` ＋ 量出來的 `_spots_<城>.json`。

**已交**：
- `resources/map/map_plainsroad.webp`（1536×1024，羊皮紙撕邊之外**已去背成 alpha**）
- `resources/map/_spots_plainsroad.json`（**量出來的**，不是估的）

**畫面上的連法**（＝遊戲裡的箭頭方向，一格都不准挪）：

    Entry ─ Milestone ─ Grass Sea ─ Ravine   （垂直主軸，下→上）
              └ Beacon（左）        └ Old Well（右）

Entry 往下、Ravine 往上各有一段虛線延伸到紙緣＝通往圖外（東泊／貝利薩爾）。
Beacon 與 Old Well 各只接一條線＝死路，看得出路到底了。

### 程式端要接的

`TOWNS.plainsroad` 建好之後補一個 `map:` 區塊，格式照帝都那一份：

```js
map: {
  img: 'resources/map/map_plainsroad.webp',
  spots: {
    entry:[0.4950,0.7820], stone:[0.4680,0.5760], beacon:[0.3230,0.5740],
    sea:  [0.4950,0.3910], well: [0.7380,0.4160], ravine:[0.4910,0.2320],
  },
},
```

⚠⚠ **`tools/map_check2.py` 這一版跑不了** —— 它是**從 `script/town.js` 讀邊**的，
而 `TOWNS.plainsroad` 還不存在。所以上面那組座標是我用獨立量測（侵蝕 2px 找實心圓墨點）
＋**逐點畫紅圈的審圖**對過的，六個標籤都落在正確的墨點上。
**等拓樸接進 `town.js` 之後請補跑一次**：

    py tools/map_check2.py plainsroad resources/map/map_plainsroad.webp

它會再驗「每條邊的兩顆墨點連不連得起來」，並重印一次 `spots`。
⚠ 這也是 `_map_spec.md` 那條「**拓樸接進 town.js、實走過，才畫小地圖**」的缺口 ——
這一次是因為古道擋著劇情才先畫，**順序上是例外，不是新慣例**。

## 十四、✔ 東泊：南門驛站（原碼頭）＋ 餐飲街街景（ver -1378，Ray 交辦）

> Ray：「把東泊碼頭改成南門驛站，生圖四差分，1900 年的馬車驛站，**朝城外的原野走的感覺（接古道）**」
> Ray：「餐飲街現在看起來還是室內」

### 1. `East_SouthGate_{dawn,day,dusk,night}` —— 南門驛站（**新檔**）

站在驛站前庭**面向城門外**：石板道穿過門洞、出去就接上古道那種**橄欖色原野與白灰岩脊**
（畫風與色系用 `East_Midtown_day` ＋ `Plains_Entry_day` 兩張一起鎖）。
車棚裡兩輛四輪驛馬車、石砌飲馬槽、上下車的石踏台、木箱木桶、屋簷下的提燈。
**沒有海、港口、船、起重機** —— 那一格已經不是碼頭了。

#### ⚠⚠⚠ 程式端要接的（這一條會改變地圖走向）

`dock` 那一格現在是：

```js
dock: { bg:'East_Dock', name:'東方泊地　倉庫碼頭',
        exits:{ back:'oldtown', up:'@belisar' }, acts:[…] },
```

要改成：

```js
dock: { bg:'East_SouthGate', name:'東方泊地　南門驛站',
        exits:{ back:'oldtown', up:'@plainsroad' }, acts:[…] },
```

- ⚠⚠ **`up` 由 `@belisar` 改成 `@plainsroad`** —— 這正是 Ray 說的「接古道」：
  以後去貝利薩爾要**先走過古道六格**，不再從這一格直接跳。
  古道那一側是 `entry.down:'@eastport'`（見 `_plainsroad_spec.md`），**兩邊要對接**。
- ⚠ **節點 id 維持 `dock` 不要改** —— 那一格的旗標是 `ep_dock_anya`，改 id 會把它打斷。
  要改的只有 `name` 與 `bg`（外加上面那個出口）。
- ⚠ 那一段 `acts` 的台詞是安雅看**尤拉西亞湖**（「這就是……尤拉西亞湖？」「好壯觀……」）
  —— 站在南門驛站看不到湖了，**那兩句要重寫或搬到別格**，這是**腳本的事**，Ray 定。
- ⚠ 舊的 `East_Dock_*` 四張**先留著不回收**：等 `bg` 真的改過去、確認沒有別的地方在用，
  再走 `tools/recycle.sh`。

### 2. `East_Dining_{dawn,day,dusk,night}` —— 餐飲街的**街景**（**新檔**）

Ray 回報「餐飲街現在看起來還是室內」—— 成因：`tavern` 那一格的 `bg` 是 **`East_Bistro`**
（酒吧**室內**），而 §6.5.4.2 的分店機制是「**在街景之上**依同行女伴換成某一家店的室內」。
少了街景那一張，沒有女伴時就直接看到酒吧內部。

```js
tavern: { bg:'East_Dining', name:'東方泊地　餐飲街', … },
```

- 畫面：石板窄街往深處延伸、兩側騎樓與遮陽棚、**素木長桌配長凳**、記菜小黑板
  （⛔ 沒有看得懂的字）、鑄鐵煤油吊燈、一家的廚房門透出蒸氣。
- ⚠ **照憲法 §5 的「19 世紀一般餐廳」**：工人與船員吃飯的地方，沒有白桌巾／銀器／水晶燈。
- ⚠ **分店那四張不動**（`East_Cafe`／`East_Restaurant`／`East_Dessert`／`East_Bistro`）——
  它們是走進某一家店的室內，仍由 `dining.scenes` 依同行女伴切換。
- ⚠ 街景是**街道**，所以照新憲法是**四差分**；`East_Restaurant` 那三張多餘的仍待回收
  （等 `hours` 改成 `[8,17]`）。

## 十五、✔ 貝利薩爾的槍棺小地圖（ver -1378）

**已交**：
- `resources/map/map_belisar.webp`（1536×1024，撕邊之外已去背成 alpha，38 格）
- `resources/map/_spots_belisar.json`（38 格，**量出來的**）
- `resources/map/_layout_belisar.png`（版面規格圖，畫圖時餵給模型的那一張）
- `resources/map/_pos_belisar.json`（解出來的格點座標，**版面的唯一真相**）

### 版面是解出來的，不是排出來的

38 格 46 條邊，用「照方向各走一步」的排法會**撞格 20 處**（兩個房間落在紙上同一點）——
有環的圖在方格上必然這樣。作法改成**把方向當約束解**：

1. 每條邊只要求**相對位置**（`up` 的鄰居 y 比較小…），不要求剛好差一格 → 先驗有沒有矛盾。
   **結果：零矛盾**（5 欄 × 8 列）—— 所以這個拓樸畫得成一張不說謊的地圖。
2. 再用退火找「**46 條邊方向全對、交叉最少**」的整數格點版面 → `_pos_belisar.json`。
   最佳解：**方向違規 0**。

⚠ 這份 `_pos_belisar.json` 就是 §6.7.5 講的那個「**手維護的 POS**」——
只是這次是解出來的。日後拓樸一改，**版面要重解、地圖要重畫**（地圖的每一筆都是拓樸的函數）。

### 程式端要接的

```js
map: {
  img: 'resources/map/map_belisar.webp',
  spots: { /* 照抄 resources/map/_spots_belisar.json 的 38 筆 */ },
},
```

⚠⚠⚠ **這張圖畫的是「提案版」拓樸**（Ray 的七條 ＋ 美術補的兩條，見第九節）——
而**那些改動還沒進 `script/town.js`**（實測 `antecham.left:'crown'` 還在）。
所以**施工順序是**：① 先照第九節改 `nodes` ② 再補 `map:` 區塊 ③ 然後補跑

    py tools/map_check2.py belisar resources/map/map_belisar.webp

它會驗「每條邊的兩顆墨點連不連得起來」並重印 `spots`。
**沒改資料就先接這張圖的話，小地圖會與畫面上的箭頭矛盾**（例如寶冠室：
圖上它掛在王座廳左邊，資料上它還掛在謁見前廳）。


## 十六、貝利薩爾的**地圖設計條件**（ver -1378，Ray 交辦 —— 驗過了）

> Ray：「這個地圖的設計理念就是**在一個廣大的空間追逐、把敵人逼進死胡同為勝利條件**；
> **在走到祭壇之前一定要經過積水處**；其他就是要符合空間邏輯。」

提案版拓樸（第九節那張表）**三條全部成立**，實測：

| 條件 | 驗法 | 結果 |
|---|---|---|
| 逼進死胡同 | 數每一格的鄰居 | 全圖只有 **4 個**死胡同：`altar` 古代祭壇（觸發點）／`crown` 寶冠室／`offering` 聖物室（王座廳兩旁）／`entrance` 古城中庭（地圖入口）。其餘 34 格都 ≥2 條路 |
| 祭壇必經積水處 | **把 `floodway` 從圖上拿掉再做一次連通** | 從入口**走不到** `altar` ✔（祭壇的鄰居只有積水甬道一個） |
| 廣大空間可追逐 | 環數 ＝ 邊−格+1 | 38 格 46 邊 ⇒ **環 9**，九個迴圈可以繞 |

**王座廳那一帶就是那個口袋**：謁見前廳（2 條路）→ 王座廳（3 條）→ 寶冠室／聖物室（各 1 條）。
敵人被逼過謁見前廳之後，出路只剩那兩間死路或原路折返。

### ⚠ 程式端要接的：入口不能當逃生口

`entrance` 古城中庭本身是死胡同，但它有**跨圖出口通古道** —— 敵人被逼到那裡會變成
**逃出地圖**而不是被堵死。Ray 定案：**不改拓樸，用怪的行為擋**
（「這個讓 code 用怪的行為去堵就好」）。
⇒ 追逐邏輯要讓怪**不會選擇往 `entrance` 逃**（或走到那一格就強制轉身）。

### ⚠ 小地圖的版面重解過

原本 9 對交叉 → 5 → **0**。現行 `resources/map/_pos_belisar.json` 是
**方向違規 0、交叉 0** 的版面（Ray：「調整成不會交錯，房間可最小限度移動，
空間邏輯正確就好」）。⚠ 拓樸一改就要重解版面、重畫小地圖。

## 十七、✔ 貝利薩爾：出口數對不上的格子，補畫五張（ver -1378）

> Ray：「唉 這樣圖跟路線大概又對不上了」→「有四差分的不補 其他全補」

**成因**（不是拓樸複雜）：七條改動裡有六條掛在**原本只有一條路的末端房間**上，
而那些背景圖當初就是照「死路」畫的 —— §6.5.4.3「一格能有幾個出口，先問那張背景圖
畫得出幾條路」。逐格對出來有 **10 格出口數增加**，其中：

| 房間 | 需要 | 處理 |
|---|---|---|
| `throne` 王座廳 | 3 | 原圖左右側廊夠用 ✔ 不動 |
| `wardtomb` 近衛墓室 | 2 | 中央甬道往深處 ✔ 不動 |
| `ossuary` 納骨堂 | 2 | **已重畫**（圓廳開出下行階梯） |
| `rooffall` 崩頂坡 | 2 | **已重畫**（補塌陷井口，四張時段差分全做） |
| **`starroom` 星象室** | 2 | **重畫**：右側壁龕改成暗拱門 ＋ 左前方下行石階 |
| **`bellroom` 鐘室** | 2 | **重畫**：右側牆開一道暗拱門 |
| **`cages` 獸欄** | 2 | **重畫**：右側被破開的獸籠改成**石造門洞**（籠子不是路） |
| **`drywell` 枯井底** | 2 | **重畫**：左側井壁補塌陷缺口（對上崩頂坡那道井） |
| **`forge` 兵器工坊** | 4 | **重畫**：左側工具牆補一道往上的石階拱門 |
| `draincliff` 排水崖口 | 2 | ⚠ **不補**（Ray 指定：有四差分的不補）—— 第二條路靠崖邊石階勉強讀 |

⚠ 五張都是**同名覆蓋**，`ASSET_VER` 要跳：
`belisar_orrery`／`belisar_bellroom`／`belisar_cages`／`belisar_drywell`／`belisar_forge`
（加上先前的 `belisar_ossuary`／`belisar_oldaltar`／`belisar_rooffall_*`）

⚠ 每一張的提示詞都寫死「**只改一個地方，其餘一律照抄**」＋「新開的通道裡面是暗的、
不要從裡面打光出來」—— 後者是為了不讓模型順手改掉整張圖的光。

---

# 十八、⚠⚠⚠ 現況總表與接下來（ver -1378 收工，換機器）

## A. 這一輪交了什麼（全部是圖，**沒有動任何程式碼**）

| 批次 | 張數 | 檔名 |
|---|---|---|
| **平原古道** | **20** | `plains/Plains_{Entry,Stone,Beacon,Sea,Well}_{dawn,day,dusk,night}` |
| 古道小地圖 | 1 ＋ spots | `map/map_plainsroad.webp`、`map/_spots_plainsroad.json` |
| 貝利薩爾中庭 | 6 | `belisar/Belisar_GreatCourt_{dawn,dusk,night}` ＋ `_flood_` 同三張 |
| 貝利薩爾崩頂坡 | 4 | `belisar/Belisar_RoofFall_{dawn,day,dusk,night}`（補了通枯井底的塌陷井口） |
| 貝利薩爾古代祭壇 | 2 | `belisar/Belisar_OldAltar` ／ `_OldAltaractive`（Ray 指定沿用入口大廳那一對） |
| 貝利薩爾補通道 | 6 | `Belisar_{Ossuary,Orrery,BellRoom,Cages,DryWell,Forge}` |
| 東泊鐵軌修正 | 6 | `eastport/East_{Midtown,Square}_{dawn,dusk,night}`（day 先前已修） |
| 東泊南門驛站 | 4 | `eastport/East_SouthGate_{dawn,day,dusk,night}`（**新檔**，原碼頭） |
| 東泊餐飲街街景 | 4 | `eastport/East_Dining_{dawn,day,dusk,night}`（**新檔**） |
| 貝利薩爾小地圖 | 1 ＋ spots | `map/map_belisar.webp`、`map/_spots_belisar.json` ⚠ **是舊版面畫的，要重畫** |

**合計 53 張背景 ＋ 2 張小地圖。**

## B. ⚠ 下一個美術 session 的第一件事

**用 `map/_pos_belisar.json`（37 格、方向 0、交叉 0）重畫貝利薩爾小地圖。**
現在版控裡那張 `map_belisar.webp` 是**38 格、5 交叉**的舊版面畫的，**與拓樸對不上**，
`_spots_belisar.json` 也是對著它量的 —— 兩個都要重做。作法照第十三節（古道那張）：

1. 餵 `map/_layout_belisar.png`（版面規格）＋ `scratchpad/ref_material.jpg`（只給紙與墨的材質）
2. 生圖 → 去白背成 alpha → 量墨點 → **逐點畫紅圈的審圖**確認 37 格沒對錯
3. 出 `_spots_belisar.json`

⚠ Ray 的指示是「**動手前先給我確認拓樸**」—— 拓樸他**已經確認過**（37 格那一版），
但地圖畫完仍要給他看。

## C. 等 Ray 決定的

- **納骨堂**那條新開的路「讀起來不如崩頂坡的井口明確」，他說不滿意就重跑（還沒回）
- **`Capital_Dessert`** 帝都甜品店缺圖（1 張 day）—— 問過，還沒回
- **蕾娜髮飾** `SI/renna_newhair/` 47 張待檢 —— 他說「先擱置」

## D. 等程式端施工才能動的

| 件 | 卡在哪 |
|---|---|
| **20 張待回收** | 店舖的 `hours` 要先由 `[8,20]` 改成 `[8,17]`（第十節）。**改之前不要回收** —— 玩家現在真的走得到 19:00 的槍店 |
| `East_Dock_*` 4 張 | 等 `dock.bg` 真的改指 `East_SouthGate` 再回收（第十四節） |
| `Belisar_SunkenCourt*` | 等 `courtyard` 節點真的刪掉再回收（第十六節、`map/_belisar_worklist.md`） |
| 古道能不能走 | `TOWNS.plainsroad` **還不存在**（第十一節）—— 這是 Ray 說「劇情跑不下去」的真正原因 |

## E. ⚠ 給程式 session 的兩份施工單

- **`resources/map/_belisar_worklist.md`** —— 貝利薩爾拓樸（刪 `courtyard` ＋ 18 格的 `exits`），
  **從 patch 過的資料印出來的，不是手抄**
- 本檔第十、十一、十三、十四節 —— 東泊 `hours`／古道建圖／兩張小地圖的 `map:` 區塊／
  `dock` 改南門驛站（`up:'@belisar'` → `up:'@plainsroad'`）

## F. ⚠ ASSET_VER 要跳的（同名覆蓋，不跳＝玩家抓到舊圖，而且沒有錯誤訊息）

    belisar_orrery / belisar_bellroom / belisar_cages / belisar_drywell / belisar_forge
    belisar_ossuary / belisar_oldaltar
    belisar_rooffall_dawn / _day / _dusk / _night
    belisar_greatcourt_day 那一族不必（新檔）
    east_midtown_dawn / _dusk / _night、east_square_dawn / _dusk / _night
    plains_entry_day

## G. 產線狀態（換機器要重建的）

- `tools/imgbridge.py` 要重開：`py tools/imgbridge.py resources <暫存目錄> 8777`
  —— ChatGPT 的圖靠它**表單 POST** 落地（Chrome 擋自動下載，見第七節）
- 上傳參考圖只能走 **Claude in Chrome**（內建瀏覽器沒有 `file_upload`）
- ⚠ 這台機器上 `python` 是 Store 空殼，**一律用 `py`**

---

# 十九、⚠ 換到 `Ray Ku` 那台（ver -1395 收工）

**兩台不同的電腦**，今天前半在 `Kaede` 那台（它的「桌面」被 Windows 導向到
`C:\Users\Kaede\OneDrive\桌面`，所以 repo 路徑帶 OneDrive —— 不是有人手動搬過去的）。
現在主力移到 `C:\Users\Ray Ku\Desktop\TIVOT`。

## 新機器開工的三件事

1. `git pull`（這一輪的東西都推上去了）
2. **重開圖橋**（它是「瀏覽器 → 本機檔案」的唯一通路，必須與 repo 同一台）：

       py tools/imgbridge.py resources "%TEMP%\drop" 8777

   ⚠ 圖橋在哪台，`bg_finish.py` 的來源目錄就要對到哪台的 `Downloads`／`drop`。
3. ⚠ **確認 Claude in Chrome 選到的是這台的瀏覽器** —— 兩台都連著時會出現選單。
   選錯的症狀是：**圖產得出來但落不了地**（表單 POST 打到那台的 `127.0.0.1:8777`，
   而圖橋在另一台）。驗法：在那個瀏覽器開 `http://127.0.0.1:8777/`，開得起來才是對的。

## 手上正在做的（接著跑就好）

- **平原古道擴成 10 格迷宮**：規格在 `resources/background/_plainsroad_spec.md` 最末段
  （拓樸、時間試算、逐格工單）。**`Plains_Cairn_day` 已交**，還缺：
  · 日景 4 張：`Plains_Scree`（碎石坡）／`Plains_Deadwood`（枯木林）／
    `Plains_Windrock`（風蝕岩）／`Plains_Gorge`（狹窄溪谷）
  · 時段衍生 15 張（5 格 × dawn/dusk/night）
  ⚠ 中間四格**一滴水都不能有**，只有狹窄溪谷可以有溪流；六格一律**不畫月亮本體**。
- **貝利薩爾小地圖**：等 Ray 的 `reference/B.PNG`（他在 Keynote 重排的版面）。
  他那台已經有了；**這台看不到，要他 commit 才過得來**。
  拿到之後：反算每格位置 → **驗 44 條邊的方向是否還全對** → 重畫小地圖 → 量墨點 →
  出 `_spots_belisar.json` ＋ 逐點審圖。
  ⚠ 從 `.key` 的預覽圖（1024px）反算過一次，**37 格只有 26 格有把握** ——
    暗色室內在低解析度下分不開，所以一定要他匯出的全尺寸 PNG。

## ⚠ 還沒回答的兩個問題（問 Ray）

從 Keynote 預覽看到的，但不敢自己認定：

1. **線是不是被拆掉了？** 很多房間之間沒有連線 —— 是改拓樸，還是移動時線留在原地？
2. **王座廳與聖物室被搬到右上角、與主體斷開** —— 刻意的嗎？
   （若連線也拆了，王座廳就不再是「把敵人逼進去的口袋」，與他自己定的設計條件衝突。）

## ⚠ OneDrive 的隱患（新機器不必擔心，但舊機器要注意）

`Kaede` 那台的 repo 在 OneDrive 同步資料夾裡，`.git/` 會被同步。
**兩台不要同時對同一個 repo 動手** —— 會出現檔案鎖與 `.git/index.lock` 衝突。
主力搬走之後，那台就只拿來 `git pull` 看，不要再開 session 產圖。

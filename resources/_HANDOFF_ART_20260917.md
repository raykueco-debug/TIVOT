# 美術交接單 — 2026/09/17（程式 session 開，`ver -1427`）

> ⚠ 這一份是**程式端掃出來的「還欠什麼」**，不是美術自己的工作紀錄。
> 前一份（`_HANDOFF_ART_20260916.md`）裡美術自己記的進度以那一份為準；
> 這裡只列**掃過檔案系統之後確認還缺的**，每一條都附「怎麼驗」。

---

## ⚠⚠⚠ 欠的五件

### 一、貝利薩爾　前廳 `Belisar_Foyer` —— 四差分（**Ray 點名**）

現在 `resources/background/belisar/` 只有 **`Belisar_Foyer.webp` 單張**。
Ray：「古城前廳 4 差分沒上」。

要 `Belisar_Foyer_{dawn,day,dusk,night}.webp`。
⚠ 程式端**不必動**：那一格現在寫著 `noTime:true`，四張一交我把它拔掉就會走候選鏈。
⚠ 它是**室內**（`_undercity_spec.md` 的 C 帶）—— 光從哪裡來由美術決定，
  前廳有大門，晨昏的斜光應該進得來。

### 二、貝利薩爾　枯井底 `Belisar_DryWell` —— 四差分（**規格書就該有**）

也只有單張。而 `resources/map/_undercity_spec.md` 把它列在**「戶外 4」**那一組：

> 下沉中庭・崩頂坡・排水崖口・**枯井底**

同組的另外三個都有四張（`SunkenCourt`／`RoofFall`／`DrainCliff` 各 4），
**只有它沒有** —— 照規格書就是漏的。

### 三、NPC 立繪去背 —— 還剩 5 張

前一份記「3 / 13」，我重量過 `resources/SI/NPC/` 的每一張 alpha，
**已經修掉 8 張，剩 5 張完全沒有 alpha 通道**：

```
NPC_Grocer_SI_v5
NPC_GuildCounter_SI_v1
NPC_GuildCounter_SI_v3
NPC_GuildCounter_SI_v4
NPC_GuildCounter_SI_v5
```

作法照前一份（§5：短句提示詞、`py tools/npc_finish.py <base>` 驗收）。

### 四、四張立繪差分（**低優先**）

`tools/script_lint.py` 每次都報，但那兩幕是**孤兒場景**（`prologue_audience`／
`prologue_fall` 從 `MAIN_ENTRY` 走不到）—— 現在**玩家看不到**，回退基本立繪也不會壞：

| 角色 | 差分 |
|---|---|
| 諾薇兒 | `gentle`、`pain` |
| 監察官（蕾娜） | `stunned`、`fluster` |

**要不要做等 Ray 一句話** —— 那兩幕本身要不要接回主線都還沒定。

### 五、蕾娜髮飾換裝（月桂葉 → 銀製勿忘我）—— **Ray 擱置中**

不是欠件，是等他決定（前一份 §一）。順帶那份裡問的「門檻要不要放寬到 12」也還沒答。

---

## ✅ 已結案，**不要重做**

| 件 | 結在哪 |
|---|---|
| 貝利薩爾小地圖 | `ver -1415` 重畫入庫，37 個點與資料 **37/37 對上**，下沉中庭已不在紙上 |
| 王座徘徊者・飛行地圖素材 | `ver -1427` 接完（`FLM_DragonThrone/view_0.webp` ＋ 三個帶狀值 ＋ 動態重調） |
| 王座徘徊者・第三型態立繪 | `ver -1424` 接上 `mon_dragon_v1_flight.webp` |
| 祭壇啟動版 `Belisar_OldAltaractive` | `ver -1420` 接上（那張圖**早就交了**，漏的是程式端的 `bgWhen`） |
| 平原古道 20 張／東泊鐵軌時段差分／古城中庭 8 張 | 前一份的 §十一・十二 已結 |
| `se_waterfall` | `ver -1414` 入庫並轉 AAC（167→61 KB），原檔進 `_raw/` |
| 追擊戰的 Gothic 主體檔 | `ver -1421` 接上 |

---

## ⚠ 程式端的事（**美術不要碰**，鐵律 11）

列在這裡只為了讓美術知道「那不是你們欠的」：

- **22 格有單張圖卻沒寫 `noTime:true`**（北泊戰損 7 格＋石製遺蹟 15 格）——
  每次進去先吃三四個 404 才退回單張。**卡在北泊那幾格與 `rebuild.bg` 糾纏**
  （重建版**有**時段差分），要先確認 `bgCandsOf` 兩條路怎麼分。
- 前一份 §六／九／十／十四 的「程式端要接的」：**九（拓樸）已做完**（-1404~-1406），
  §十（店舖 `hours` 由 `[8,20]` 改 `[8,17]` ＋ 逐格 `noTime`）**還沒做** ——
  ⚠ 那一條沒做之前，美術**不要回收**多出來的時段差分（玩家現在真的走得到 19:00 的槍店）。

---

## 要 Ray 一句話的兩件

1. **前廳四差分真的要嗎？** 它是室內。要就照上面第一條做。
2. **`PerituneMaterial_Gothic_Dark_loop_intro.m4a`（7.78 秒）要留著嗎？**
   主體檔 `..._loop.m4a` 已經接上，那支 intro 現在**沒有人用**（lint 每次提醒一句）。
   日後要做 intro→loop 的接法就留著（響度已量過），否則可以回收。

---

## 怎麼重跑這一份的稽核

```bash
py tools/script_lint.py          # 差分／音效／插圖／拓樸，一次列出來
```

其餘三項（背景四差分、NPC alpha、敵人立繪）沒有現成工具，是這一次臨時寫的掃法：
- **四差分**：把 `resources/background/**` 依 `<基底名>_<時段>` 分組，
  再對 `script/town.js` 每一格的 `bg:` 查那一組有幾張。
- **NPC alpha**：`PIL` 讀 `resources/SI/NPC/*.webp`，`mode!=='RGBA'` 或全透 <5% ＝沒去背。
- **敵人立繪**：`script/enemies.js` 的每個 `image:'<鍵>'` → `config.js` 的 `ASSETS` → 檔案在不在。

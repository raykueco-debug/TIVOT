# HANDOFF（已被 HANDOFF.md 取代，留作紀錄）

# 原標題：HANDOFF — ver -971〜-995（2026-09-09）／女主九星・技能文案・整備頁改版

> **HEAD ＝ `ver 2026.09.09-995`**（`config.js` 的 `VERSION`）。
> 前一份（-953〜-955）與 `HANDOFF_ver964-970_ART_SESSION.md`（美術 session 做的 -964〜-970）
> 都**已被這一份取代**；那兩份留著當紀錄，**檔尾的「環境備忘／教訓／快速測法」仍然有效**
> （抄在本檔第 7 節）。
>
> ⚠⚠⚠ **這一輪推翻了非常多舊規則 —— 舊註解會騙人。** 動下面任何一支檔案之前，
> 先看第 2 節那張「被推翻」表，再重讀那一支。

---

## 0. 版本 → 動了哪幾支檔案（**重讀清單**）

| 版本 | 主題 | 動到的檔案 |
|---|---|---|
| `-971` | 索菈娜黃橘圈 ×0.7 沿用萊福槍例外（Ray 確認，行為零改動） | `config.js` |
| `-972` | **諾薇兒的巨蟹座九星** | `config.js` `script/progress.js` `modules/{combat,partner,saint}.js` |
| `-973` | 次回指引＝全程高光／堅殼星聖徒化期間不回血（Ray 定案） | `config.js` `modules/combat.js` |
| `-974` | **安雅的雙子座九星**＋反擊三分法 | `config.js` `modules/{combat,defense,partner,saint,weapon}.js` |
| `-975` | 賞金獵人的圖／旅店插畫／瑪麗亞提早出現／萊福槍黃橘圈也反擊 | `config.js` `modules/{story,town}.js` `script/town.js` |
| `-976` | **索菈娜的射手座九星** | `config.js` `modules/{combat,partner,saint,weapon}.js` |
| `-977` | 飛行打完馬上又來一隻／船戰 HP 走結算就回滿 | `config.js` `main.js` `flight/index.html` |
| `-978` | 捲軸改成細銅色 | `style.css` `css/lootsheet.css` `index.html` |
| `-979` | 北泊送行加四句＋北峰山羊奶油／翌日直接落碼頭／插圖世代守門 | `config.js` `modules/story.js` `script/town.js` |
| `-980` | 開發者模式手動點亮九星 | `config.js` `modules/gear.js` |
| `-981` | **好感段位邊界改成「累積 20 點進 T2」** | `config.js` `script/progress.js` `flight/index.html` |
| `-982` | 管理人手動改好感（後由 -983 搬到飛行頁） | `config.js` `script/progress.js` `modules/gear.js` `style.css` |
| `-983` | 整備頁手機版改版／好感搬到飛行頁／副武器每場歸一順位 | `config.js` `modules/{gear,weapon}.js` `flight/index.html` `style.css` `index.html` |
| `-984` | 諾薇兒技能文案短版＋改名 | `config.js` `i18n/zh.js` |
| `-985` | 技能名改成讀搭檔卡（蕾妮不跟著改名） | `config.js` `i18n/zh.js` `modules/{partner,saint}.js` |
| `-986` | 免傷回血與吸血由基礎移到星上 | `config.js` `modules/partner.js` |
| `-987` | 諾薇兒九星文案對齊實作 | `config.js` |
| `-988` | 諾薇兒定稿；連擊延續移到引路星、**Lv8/Lv9 效果對調** | `config.js` `modules/partner.js` |
| `-989`〜`-992` | 技能分色／技能表排版與凹槽／內文技能名上色 | `config.js` `modules/gear.js` `style.css` `index.html` |
| `-993` | **索菈娜文案定稿**；技能表改成置中視窗 | `config.js` `modules/gear.js` `style.css` `index.html` |
| `-994` | **安雅文案定稿**；明晰之夢 5→10→15、夢境破碎不再回血 | `config.js` |
| `-995` | Alzirr ＝鐵蹄星；兩則刻意不寫進文案的註記 | `config.js` |

**熱區**：`config.js`（幾乎每一版）／`modules/{partner,gear,saint}.js`／`style.css`。

⚠ 工作樹裡的未追蹤檔（根目錄兩張 uuid png、`resources/SI/*.png`、`flight/Reference/`、
兩個 .docx、`resources/vfx/42452231-….png` 的改動）**是 Ray 自己丟進來的美術素材** ——
不要動、不要提交。

---

## 1. 這一輪的成果（三句話）

1. **三位女主的九星全部上線**（27 顆），效果、文案、名字都由 Ray 定案，沒有暫填的了。
2. **整備頁改版**：手機版左槍右人、整頁不捲；星辰收進「技能表」置中視窗（凹槽＋分色）。
3. 一批 bug：賞金獵人的圖、旅店插畫、瑪麗亞提早出現、飛行打完馬上又來一隻、好感段位邊界。

---

## 2. **被推翻的舊規則**（最重要 —— 舊註解會騙人）

| 版本 | 推翻了什麼 | 現在是 |
|---|---|---|
| -974 | ver -740「明晰之夢期間任何反擊都算完美反擊，傷害跟評價都是」 | **判定分色**：只壓命中，攻擊力要點星 |
| -974 | ver -959「惡夢化期間三帶一律紅圈」 | 同上（攻擊力紅圈＋命中 100%，判定照實際帶） |
| -974 | ver -897「16 格點完不出 MB，直接出夢境粉碎」 | **點完＝MB／處決**，夢粉歸夢粉 |
| -974 | ver -967「夢魘化一律 15 秒、斜率變緩」 | **固定抽血速率**：滿血 13 秒，血少更短 |
| -975 | 萊福槍「黃橘圈不反擊」 | **黃橘圈也反擊，攻擊力 −50%**（`dmgScale:0.5`） |
| -977 | ver -481/-489 在**船戰**那一半的持久 HP | 船戰走結算就回滿（Ray 確認是規格） |
| -981 | `floor((aff−1)/20)+1`（T2 從 21 起） | **`floor(aff/20)+1`**：0~19=T1、20~39=T2… |
| -983 | 整備頁 480px 的上下堆＋整頁可捲 | 左右分欄、不捲；拖曳改成**真的長按** 230ms |
| -983 | 副武器輪轉模式沿用上一場停在哪一把 | 本篇**每場開戰都回一順位** |
| -984/-985 | 技能名住在 i18n（蕾妮與諾薇兒共用） | **名字讀卡**：諾薇兒＝獄門天鎖／魂之歸所，蕾妮不動 |
| -986/-988 | 諾薇兒基礎的免傷回血 2%／吸血 10 秒／連擊延續 | 全部移到星上（連擊延續在引路星） |
| -988 | 諾薇兒 Lv8 與 Lv9 的效果 | **對調**（Lv8＝受擊不推進、Lv9＝每發延長） |
| -994 | 安雅明晰之夢 10 秒（-974 定的） | **基礎 5 秒**，赤足星 10、鐵蹄星 15 |
| -994 | ver -888/-892「夢境粉碎回復最高 25% hp」 | **不再回血**（`burstHealPct:0`，欄位留著） |

---

## 3. 新增／改了語意的 API 與資料

```
progress.girlHas(who,key)          -972  「這一位有沒有那顆星」的唯一查詢點
progress.setAffectionDev(who,v)    -982  管理人改好感（**連棘輪地板一起改**）
progress.tierOf / tierFloor        -981  邊界改成 floor(aff/20)+1；地板 1/20/40/60/80
partner.counterAtkStep()           -974  反擊用哪一帶的**攻擊力**（0照判定/1橘/2紅）
partner.counterHitForced()         -974  命中壓成 100%
partner.lifeReturnWindow/saintComboKeep/guideActive/burstBuffActive/startBurstBuff
saint.saintComboStep/niAtkMul/niCounterPause/coopExtendByEnergy
combat.hintAlways()                -971  「要不要一直指下一格」的唯一查詢點
girls.levels[].skill               -990  這一顆強化哪一招（install/passive/active，決定顏色）
partners.anya.active               -994  **純顯示**的夢境破碎（context:'none'，不接主動技系統）
```

---

## 4. 刻意如此、**不要「修好」它**的三件事

1. **索菈娜 Lv4 與 Lv6 的文案一字不差**（Ray：「一次升橘一次升紅，玩家不用知道數據」）。
2. **索菈娜的三段文案沒提「副武器命中減半」**（Ray：「目前只活在程式裡，劇情或評價時再提就好」）。
3. **三位的基礎文案都略去了細節**（每場一次／MB／命中 100%…）—— Ray：「頁面放最基本的說明即可」。

---

## 5. 等 Ray 的

1. **三位女主九星的戰鬥實測**（照 -939 的規矩交給他）。
2. ⚠ **「對話點太快卡插畫」**：-979 補了世代守門，但**我沒能在測試環境重現**
   （安雅醒來那兩張、九種點擊間隔各跑一輪都是乾淨的）。要他回報**卡住當下的畫面**
   （插圖蓋著不走／點了沒反應／黑幕不掀）才收得掉。
3. `saintAdvanceDivisor` 的 A/B：註解寫「受擊 −1 秒」但實際 0.67 秒
   （`saintPassiveHealSec` 由 15 改 10 之後匯率變了）。**惡夢化共用這個數字**。
4. Stage 8 兩處稿面（瑪麗亞立繪標記、鹿腿）／鹿腿肉的取得管道。
5. 聖遺物 10 隻部署；三張新卡（`bug_mantis`／`relic_bellascetic`／`rictus_hooked`）的鑰匙與數值。
6. 安雅／索菈娜的**基礎技能沒有「常駐」欄**（三位都留空，Ray：「先留空」）。

---

## 6. 這一輪踩到的坑（逐字遵守）

1. ⚠⚠ **改共用的 i18n 等於改到別人**：-984 把「即死防禦／生命歸還」改名，那兩條是
   **蕾妮與諾薇兒共用**的 → 試玩版被一起改名。名字是**卡的性質**（鐵律 1），-985 收回卡上。
2. ⚠⚠ **量錯東西會得到相反的結論**：追「卡插畫」時我用 `src` 判斷插圖在不在 ——
   `setImg(el,'')` **只拔 `.on` class、故意留著 src**（淡出時圖必須還在）。
   後來又拿 `#storyCg2` 的 `display` 判斷（它是 opacity 控制）。**兩層的判準不一樣**：
   `#storyCg` 看 `display`、`#storyCg2` 看 `opacity`。
3. ⚠ **`innerText` 對 flex 會逐項斷行**（flex 子項被 blockify）—— 判斷「是不是同一行」
   要量 `getBoundingClientRect().top`，不要看 innerText。
4. ⚠ **`padding-left` 不會移動 box 的 left** —— 量縮排要量文字（`Range`）不是元素。
5. ⚠⚠⚠ **改語意的那一版，要把所有讀它的地方掃一遍**（憲法教訓 5）——
   這一輪犯了兩次同一個病：
   · `weapon.js` 漏 import `weaponBand`（共鬥開火時才炸）
   · `partner.js` 的戰吼：-976 把兩段式改單段時刪掉 `reload` 變數，
     但 cut-in 的樣板字串還在用它 → **戰吼一發動就 ReferenceError、盤面消失**
     （-998 修；與 ver -963「MB 的 reload 標籤交叉寫錯」是同一個病的第二次）。
   ⚠⚠ **`jsc` 與「逐支 import」都抓不到這種** —— 它藏在回呼／樣板字串裡，
     只有那一段真的跑起來才求值。**要把那幾支入口真的叫一遍**，配方見第 8 節。
6. ⚠ python 批次替換**一個 assert 失敗＝整批都沒寫入**（寫檔在最後）—— 別以為前面幾條生效了。

---

## 7. 環境備忘／快速測法（沿用）

- dev server 用 `preview_start`（埠會變）。⚠ **第一步永遠是先點一次把開機讀取頁點掉**，
  等首頁穩定才下程式化指令（憲法 §6 的第 4 條）。
  ⚠ 程式化 `click()` **點不掉那一層**，要真的 `computer.left_click`。
- `jsc` 在 `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`
  （`node` 這台機器沒有）。⚠ 它會執行模組，看到 `document` 未定義＝**語法沒問題**。
- 資源路徑自檢：`grep -o '"resources/[^"]*"' config.js | ... | test -f` ——
  -975 就是這樣抓到賞金獵人那條漏改的路徑。
- 戰鬥類不要自己開瀏覽器實測，交給 Ray（-939）；非戰鬥的照舊自己測。
- `enemies.xlsx` 是 reference，只有 Ray 明講才 import。

---

## 8. 搭檔模組的煙霧測試（**改過 partner／saint 之後一定要跑**）

`jsc` 與「逐支 import」抓不到回呼裡的 ReferenceError（-963／-998 都是這樣漏掉的）。
把入口真的叫一遍才驗得出來 —— 瀏覽器 console：

```js
const [partner, st, prog, saint] = await Promise.all([import('/modules/partner.js'),
  import('/state.js'), import('/script/progress.js'), import('/modules/saint.js')]);
const errs=[], hit=[];
partner.init({ floatDmg:()=>{}, updateBars:()=>{}, healPlayer:()=>{}, lucidFlood:()=>{},
  resetEnemyTimers:()=>{}, scheduleAssault:()=>{}, hintCurrentCell:()=>{}, resetInstallSlot:()=>{},
  startDual:()=>{}, setLowHpBuff:()=>{}, saintApi:{lifeReturnAbort:cb=>cb&&cb()},
  playCutin:(cb,label)=>{ hit.push(String(label).replace(/<[^>]+>/g,'|'));
                          try{cb();}catch(e){errs.push('cb:'+e.message);} } });
// 三位 × 滿級，逐個入口叫：onBoardCleared / onThreatResolved / tryActive /
//   onEnemySet / onEnemyCleared / tryDeathGuard / 各查詢點 / saint 的四支
```

⚠ 跑完看兩件事：`errs` 要空、`hit` 的 cut-in 標題要印得出名字（那一行正是 -998 炸掉的地方）。
⚠ 跑完**重整頁面** —— `partner.init` 會把真正的 api 換掉。

# HANDOFF — 截至 `ver 2026.09.14-1291`

> 這一份是**唯一**的交接檔。前面那四份（-861 / -964~-970 / -971~-995 / -1127~-1145
> ＋ `HANDOFF_ver1289.md`）已經走回收區 —— 內容都在 git 歷史裡，不必留在工作目錄
> 互相矛盾。**下一次交接請直接改這一份，不要再開新檔。**
>
> ⚠⚠⚠ **寫進這裡的每一條都要當場驗過**（ver -1291 的教訓，Ray：「我明明有跑到
> shipcrush」「序章一直都沒有問題」）：上一份交接把**已經被 revert 掉的鐵路暫停**
> 寫成現況，把 lint 的假警告寫成待辦，於是下一個 session 照著它做了錯的判斷。
> **沒有 `grep` 過的事實不要寫。**

## 現有進度（逐條驗過）

| 項目 | 狀態 |
|---|---|
| **地圖編輯器** | 完成並在用。13 支筆：平移／山／挖／平／自動修正／水／湖／河／貼材／**鐵路**／**公路**／擦除／移城。中鍵平移、每次改動要確認、復原、匯出。`mapEditClear()` 是**搬進回收區**不真的刪 |
| **鐵路／火車** | ⚠⚠ **是開著的，不是暫停。** ver -1276 曾經做過「整套暫停」（`RAILS_ON`），但 ver -1269 那一次 `revert(flight): 整串鐵路改動退回`（Ray 指定）把它一起退掉了 —— **現在專案裡沒有 `RAILS_ON` 這個名字**，軌道／路基／石橋／站場／火車／大地圖虛線全部照常出，編輯器的「鐵路」筆也正常 |
| **地形圖** | 水文重整已退回（Ray：修改痕跡太重）。來源＝`flight/_src/terrain/heightmap_base.png`（⚠ 在 `flight/` 底下，不是根目錄）；上線的是 `flight/silvermoon_heightmap.png`，同名覆蓋走 `TERRAIN_V`（現行 `?v=3`，`build_terrain.py` 自動遞增，不要手改） |
| **貝利薩爾第一次降落** | 已上線（-1279）：按降落 → 演十拍（索菈娜找不到落點 → 改去東方泊地）→ 開大地圖標記東方泊地 → 蕾娜一句 → 關地圖記旗。之後再按降落只出蕾娜「先去東方泊地吧。」（`belisarLandGate`） |
| **索菈娜 `watch` 立繪** | 已進版。取景 Ray 驗收過，**不要再動**：`fx:0.680／top:6／bot:1521`，飛行頁另掛 `cm:132／standCm:168`。⚠ `top:6` 是**遮陽的手**不是頭頂（頭頂在 y≈17） |
| **索菈娜 `tired` 立繪** | ver -1290 補上（圖 -772 就交了，一直沒轉檔也沒登記）。`top:2／bot:1522／fx:0.511` —— ⚠ `fx` **不能用 `measure_si.py` 的 0.489**，舉起的手臂污染了取樣帶，改量兩眼睫毛中點 |
| **東方泊地** | 城鎮資料**已經在** `script/town.js`（13 格、`bgm:portside`、`entry:square`）；佈局圖、`SETTLEMENTS` 那一筆都在。**缺的只有 15 張背景**（13 格＋餐飲街一格三張） |
| **BGM 音量** | ver -1291 由 0.32 → **0.42**（Ray：「BGM 都太小聲，提高音量 10」）。⚠ 兩份：`config.js` 的 `tuning.loudness.layer` 與 `flight/index.html` 的 `LAYER_BASE` |
| git | 全部已 push。本機用 SSH 金鑰，`git push` 不會問密碼 |

## 接下來的事項

1. **`belisar_land_ok` 這支旗還沒有人插** ⇒ 貝利薩爾目前**永遠降不下去**。
   等 Ray 的下一段稿決定由哪一拍插旗（作法同北方泊地的 `sail.hold.until`）。
   常數在 `flight/index.html` 的 `BELISAR_LAND_OK`，那裡的註解也寫著「現在還沒有人插」。
2. **東方泊地 15 張背景**（`East_Square/Midtown/Church/Customs/University/Oldtown/
   Firearm/Dock/Guild/Uptown/Grocerie/Hotel` ＋ 餐飲街的 `East_Bistro/Cafe/Restaurant`）。
   交件後：拔 13 格的 `bgPending`、補 `SETTLEMENTS` 的 `town:'eastport'`
   （⚠ `flight/index.html` 那一行的理由註解 -1291 已更正：城鎮資料早就有了，缺的是圖）。
3. **拉芬斯達爾 7 張店內／室內圖**（表在 `resources/map/_ravnsdal_spec.md` §四）：
   · **5 張同名覆蓋** `Ravn_Firearm／Guild／Grocerie／Hotel／Bistro` → 交件時**要補
     `config.js` 的 `ASSET_VER` 五列**（§5：背景寫不了 `?v=`，走版本表）
   · **2 張新增** `Ravn_Cafe／Ravn_Restaurant` → 新檔名，**不必**動 `ASSET_VER`
   · 另外還有 `Ravn_Church`（`church` 那一格現在借用 `Ravn_Midtown`，`bgPending`）
4. **卡耶爾山谷**：① 小地圖 `resources/map/map_canyon.webp`（去白背走 alpha，底稿可以
   直接用 `_canyon_map.webp`）② **遭遇戰的敵人卡還沒有**，所以 `wildSpawn` 先沒給；
   谷底祭場（`altar`）是 Boss 場。工單 `resources/background/_canyon_spec.md`。
5. **瓦努努遺蹟的 Boss 卡**（`script/town.js:3900` 那一拍，Ray 還沒給）。
6. 鐵路要不要**重做**是 Ray 的決定（他之前說「故事寫完城都做完再一次做」）。
   真的重做時要重跑 `RAIL_CLIMB`，並過兩條驗收：① 沿線坡度（可以有一點點坡，
   不可以爬山）② 大地圖上的線密度（不可以變成一張網）。

## 驗收指令

```bash
python3 tools/script_lint.py     # 現況基準：0 個錯誤、30 個提醒
python3 tools/bust.py            # 改完 config.js 的 VERSION 之後跑
```

**那 30 個提醒都是什麼**（ver -1291 逐條追過，**沒有一條是 bug**）：

| 數量 | 內容 | 判定 |
|---|---|---|
| 14 | `bgPending`（東方泊地 13 ＋ 拉芬斯達爾 church） | 等美術，見上面第 2、3 項 |
| 6 | 「劇情戰之前沒有 checkpoint」 | ✔ **都不會卡死**，回捲點：北方泊地墓地兩場→**教堂**（`church.acts[1][12]`）；`sf_deer_nightmare`→**斷崖邊**（結算怪 `sf_stag_*` 打完就落點，只差一格）；神殿兩場→**前廳／命之泉**（`deepaltar` 的節點註解已載明）；`man_sorana` 在還沒上線的 `lake_deck` |
| 2 | 「入口那一格有戰鬥」（northport / shinier） | 已知設計債，憲法 §6.5.2 寫明靠「連敗三次抬回旅店」兜底，Ray 未定 |
| 2 | `prologue_audience／prologue_fall` 走不到 | ⚠ **不是 Ray 在玩的那個序章**。現行序章＝地宮（`MAIN_ENTRY='dungeon_chase'`，`CHAPTERS.stage0` 也走它）。這兩幕是**舊草稿**，`mainScript.js:619` 的註解寫著「正式串主線時改回 `prologue_audience`」。要不要退役等 Ray 決定 |
| 4 | `gentle／stunned／pain／fluster` 沒有差分 | 全部**只出現在上面那兩幕舊草稿裡**，玩得到的內容一張都沒缺。缺圖時引擎本來就回退基本立繪，不會壞 |
| 2 | `se_cannonslide.mp3`／`Peritune_Mystic_Tides_loop.m4a` 沒人用 | 真的零引用，大概是先丟進來備用的，沒有壞任何事 |

⚠⚠ **lint 曾經謊報過三類，ver -1290/-1291 已修**，別再被它騙：
① 音檔「載不到」原本只認 `SE_FILES` 與 `ASSETS` 兩條登記路，漏了**飛行頁自己那組
HTMLAudio**（`se_sail`／`se_shipcrush`）與**只用鑰匙引用的**（`se_weapon_cannon`）；
② 孤兒場景原本只走 `next` 鏈，看不到 `story.open({scene:…})`（`lake_deck`）；
③ 「空台詞又沒有 auto」漏掉**自己就是畫面**的那幾種拍（`cg`／`dayBreak`／`kitchen`／`boon`）。

**語法檢查**：抽出 `flight/index.html` 最大的 `<script>`，用 macOS 的 `jsc`
（`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`）跑
`new Function(...)`。⚠ `jsc` 檢不出 GLSL 的錯 —— shader 壞掉是**悄悄退回 CPU**
（`glReady` 變 false、無錯誤訊息），改完 shader 一定要在瀏覽器確認 `glReady===true`。
⚠ GLSL 在 JS 樣板字串裡，**註解不可以有反引號**。

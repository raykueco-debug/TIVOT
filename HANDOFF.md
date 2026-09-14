# HANDOFF — 截至 `ver 2026.09.14-1293`

> 這一份是**唯一**的交接檔。**下一次交接請直接改這一份，不要再開新檔。**
>
> ⚠⚠⚠ **寫進這裡的每一條都要當場驗過**（ver -1291 的教訓，Ray：「我明明有跑到
> shipcrush」「序章一直都沒有問題」）：上一份交接把**已經被 revert 掉的鐵路暫停**
> 寫成現況，把 lint 的假警告寫成待辦，於是下一個 session 照著它做了錯的判斷。
> **沒有 `grep` 過的事實不要寫。**

---

# ⚠⚠⚠ 第零節：換機器之前一定要做的四件事

**這四樣東西 git 帶不走。** 不處理就是真的消失，而且多半要等到很久以後才發現。

### 1. 地圖編輯的筆畫 —— 目前**全部只在這台機器的瀏覽器裡**

`MAP_EDITS_SRC` 現在是**空陣列**（`flight/index.html:1891`，已確認）。
也就是說 Ray 在地圖編輯器畫過的**每一筆**都只存在 localStorage 的
`tivot_mapedit_v1`，**沒有一筆進過版控**。換機器＝全部歸零。

**做法**（程式自己的警語就是這句）：
1. 大地圖 →「✎ 地圖編輯」→ 右下 **「⇩ 匯出」**
2. 把匯出的陣列內容貼進 `flight/index.html` 的 `MAP_EDITS_SRC`（**會進版控**）
3. commit ＋ push，然後在舊機器 `mapEditClear()`（那是**搬進回收區**，不是真的刪）

⚠ 同一個坑還有**拖城的位置覆寫**（`tivot_settle_drag_v1`，ver -835）—— 一樣是
localStorage、一樣 git 看不到。有拖過城就一併定稿。

### 2. 存檔與遊戲進度

整組 `tivot_*` 鑰匙都在瀏覽器裡（存檔 `tivot_save_v1`、旗標 `tivot_flags_v1`、
時鐘 `tivot_clock_v1`、道具 `tivot_inventory_v1`、金錢、好感、九星、音量…）。
要帶走就在**遊戲的分頁**的主控台跑這一行，存成檔案帶過去：

```js
copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('tivot_')))))
```

新機器貼回來：`Object.entries(JSON.parse(貼上)).forEach(([k,v])=>localStorage.setItem(k,v))`

⚠ **新機器記得重開管理人模式**：`localStorage.tivot_admin_v1='1'` ——
沒有它首頁只剩「挑戰／教學／原作／Credit」，開始故事、章節、試飛、地圖編輯全部不出現
（§6.9 的白名單，那是設計不是壞掉）。

### 3. `resources/_originals`（**2.6 GB**）與 `_recycle`（107 MB）

兩個都在 `.gitignore` 裡 —— 憲法 §5 明寫它們是「**可回滾**」不是「異地備份」。
· `_originals`＝所有被轉成 WebP 的原始 PNG
· `_recycle`＝所有被「刪掉」的東西（**本專案唯一的刪除出口**，永不真的刪）
**要留就自己複製到外接／雲端**，git 不會幫忙。⚠ 清空回收區是 Ray 的決定，
沒有任何 session 被授權清它。

### 4. 還沒進版控的散檔

工作目錄裡這幾個是未追蹤的（換機器就沒了）：
`地理筆記.docx`／`索菈娜技能.docx`／`resources/audio/vo/vo_sorana_miss4.wav`
＋`未命名 1.wav`/`.pkf`／`reference/maze.png`／`flight/Reference/ship_topdown.png`
／根目錄兩張 GUID 檔名的 png。

⚠ **`git status` 乾淨不代表安全** —— 上面那些都是 `??`（未追蹤），`git push` 不會帶走。

---

## 這一輪（-1290 ~ -1293）做了什麼

| 版 | 內容 |
|---|---|
| -1290 | 索菈娜 `tired` 差分接上（圖 -772 就交了，一直沒轉檔也沒登記）；lint 的四條假警告 |
| -1291 | BGM 0.32→**0.42**（Ray：「太小聲，提高音量 10」）；交接檔整併；拉芬斯達爾室內 7 張接上 |
| -1292 | 副武器輪轉每「場」歸位；索敵收到螢幕上半；地圖編輯鈕搬進大地圖 |
| -1293 | 東方泊地上線；拉芬斯達爾室外 6 格；候選鏈少吃 429 個 404 |

## 現有進度（逐條驗過）

| 項目 | 狀態 |
|---|---|
| **東方泊地** | **上線**。13 格、`bgm:portside`、`entry:square`；15 張背景到齊（室外 8×四時段＋室內 7 單張）；`SETTLEMENTS` 有 `town:'eastport'` ⇒ 降落鈕會亮 |
| **拉芬斯達爾** | 室內 7 張＋室外 6 格×四時段都接完。**只差 `Ravn_Church`**（`church` 借用 `Ravn_Midtown`，掛 `bgPending`）。⚠⚠ 那一格**現在沒有 `noTime`**，因為它借的那張已只剩四個時段版；`Ravn_Church` 交件時是單張 ⇒ **要把 `noTime:true` 加回來** |
| **鐵路／火車** | ⚠⚠ **是開著的，不是暫停**。-1276 做過「整套暫停」（`RAILS_ON`），但 ver -1269 那次 `revert(flight): 整串鐵路改動退回`（Ray 指定）把它一起退掉了 —— **專案裡沒有 `RAILS_ON` 這個名字** |
| **地圖編輯器** | 完成並在用。13 支筆：平移／山／挖／平／自動修正／水／湖／河／貼材／鐵路／公路／擦除／移城。⚠ 入口鈕 -1292 起**在大地圖頁面裡**（`#mapWrap`，「★ 已發現」底下），不再是飛行畫面上的浮鈕 |
| **地形圖** | 水文重整已退回。來源＝`flight/_src/terrain/heightmap_base.png`（⚠ 在 `flight/` 底下）；上線的是 `flight/silvermoon_heightmap.png`，同名覆蓋走 `TERRAIN_V`（現行 `?v=3`，`build_terrain.py` 自動遞增，不要手改） |
| **貝利薩爾第一次降落** | 已上線（-1279）。⚠ 見下面待辦第 1 項 |
| **BGM 音量** | `layer.bgm` **0.42**。⚠ **兩份**：`config.js` 的 `tuning.loudness.layer` 與 `flight/index.html` 的 `LAYER_BASE`（非 module 頁面 import 不到），改一邊要改兩邊 |
| git | ⚠ 見下面「推送狀態」 |

## 接下來的事項

1. **`belisar_land_ok` 這支旗還沒有人插** ⇒ 貝利薩爾目前**永遠降不下去**。
   等 Ray 的下一段稿決定由哪一拍插旗（作法同北方泊地的 `sail.hold.until`）。
   常數在 `flight/index.html` 的 `BELISAR_LAND_OK`，那裡的註解也寫著「現在還沒有人插」。
2. **`Ravn_Church`** 交件 → 改 `bg`、拔 `bgPending`、**補回 `noTime:true`**。
3. **卡耶爾山谷**：① 小地圖 `resources/map/map_canyon.webp`（去白背走 alpha，底稿可用
   `_canyon_map.webp`）② **遭遇戰的敵人卡還沒有**，所以 `wildSpawn` 先沒給；
   谷底祭場（`altar`）是 Boss 場。工單 `resources/background/_canyon_spec.md`。
4. **瓦努努遺蹟的 Boss 卡**（`script/town.js:3900` 那一拍，Ray 還沒給）。
5. **兩座新城都沒有 `midnight` 差分** —— 午夜退到 `night`（每格白吃 8 個 404，
   有 `bgResolved` 快取所以一輪只吃一次）。要不要補是美術的活。
6. 鐵路要不要**重做**是 Ray 的決定。重做時要重跑 `RAIL_CLIMB`，並過兩條驗收：
   ① 沿線坡度（可以有一點點坡，不可以爬山）② 大地圖上的線密度（不可以變成一張網）。

## 驗收指令

```bash
python3 tools/script_lint.py     # 現況基準：0 個錯誤、17 個提醒
python3 tools/bust.py            # 改完 config.js 的 VERSION 之後跑
```

**那 17 個提醒都是什麼**（逐條追過，**沒有一條是 bug**）：

| 數量 | 內容 | 判定 |
|---|---|---|
| 1 | `bgPending`（拉芬斯達爾 `church`） | 等 `Ravn_Church` |
| 6 | 「劇情戰之前沒有 checkpoint」 | ✔ **都不會卡死**。回捲點：北方泊地墓地兩場→**教堂**（`church.acts[1][12]`）；`sf_deer_nightmare`→**斷崖邊**（結算怪打完就落點，只差一格）；神殿兩場→**前廳／命之泉**；`man_sorana` 在還沒上線的 `lake_deck` |
| 2 | 「入口那一格有戰鬥」（northport / shinier） | 已知設計債，§6.5.2 寫明靠「連敗三次抬回旅店」兜底，Ray 未定 |
| 2 | `prologue_audience／prologue_fall` 走不到 | ⚠ **不是 Ray 在玩的那個序章**。現行序章＝地宮（`MAIN_ENTRY='dungeon_chase'`，`CHAPTERS.stage0` 也走它）。這兩幕是**舊草稿**。要不要退役等 Ray 決定 |
| 4 | `gentle／stunned／pain／fluster` 沒有差分 | 全部**只出現在上面那兩幕舊草稿裡**，玩得到的內容一張都沒缺 |
| 2 | `se_cannonslide.mp3`／`Peritune_Mystic_Tides_loop.m4a` 沒人用 | 真的零引用，沒有壞任何事 |

⚠⚠ **lint 曾經謊報過三類，-1290/-1291 已修**，別再被它騙：
① 音檔「載不到」原本只認 `SE_FILES` 與 `ASSETS`，漏了**飛行頁自己那組 HTMLAudio**
（`se_sail`／`se_shipcrush`）與**只用鑰匙引用的**（`se_weapon_cannon`）；
② 孤兒場景原本只走 `next` 鏈，看不到 `story.open({scene:…})`（`lake_deck`）；
③ 「空台詞又沒有 auto」漏掉**自己就是畫面**的拍（`cg`／`dayBreak`／`kitchen`／`boon`）。

**語法檢查**：抽出 `flight/index.html` 最大的 `<script>`，用 macOS 的 `jsc`
（`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`）跑
`new Function(...)`。⚠ `jsc` 檢不出 GLSL 的錯 —— shader 壞掉是**悄悄退回 CPU**
（`glReady` 變 false、無錯誤訊息），改完 shader 一定要在瀏覽器確認 `glReady===true`。
⚠ GLSL 在 JS 樣板字串裡，**註解不可以有反引號**。

**跑起來**：`.claude/launch.json` 已備好（`python3 -m http.server 8000`）。
⚠⚠⚠ **背景的大小寫不可以只靠本機驗**：macOS 不分大小寫，本機 server 會把
`_Day.webp` 當成 `_day.webp` 送出來 —— -1293 實測「13 格全部第 1 次就中」是**假的**。
真值要用分大小寫的比對（把真正上線的 `bandNames` 丟進 `jsc` 對磁碟清單）。

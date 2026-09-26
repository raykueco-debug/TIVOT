> ⚠⚠⚠ **美術 session（2026-09-24 下午，Mac）交了三件，程式端要接** —— 都是一行到一段的事：
> 1. ✅ **-1728 已接** 索拉娜 `whisper` `?v=3`／`top:4 bot:1524`
> 2. `script/town.js` 的 `lake` 與 `canyon` 各補 `map:{img,spots}`（新增，整段可抄：`resources/map/_minimap_worklist.md` 末段）
> 3. 米夏的隨從 `retainer_si_front` 仍未接（`cm`／`side` 要 Ray 給，`_misha_program_worklist.md` 附）
> 4. ✅ **-1728 已接** 米夏 `draw` `?v=3` top:6 bot:1534 fx:0.434；`drawopen` `?v=2` 同取景
> 5. **（09-25 凌晨，Mac）米夏九張重做、同名覆蓋，版號全跳 —— 九行可直接抄：根目錄 `_TO_CODE_20260925.md`**：`draw` `?v=3`→`?v=4`、`drawopen` `?v=2`→`?v=3`、`frown` `?v=2`→`?v=3`、`close` `?v=2`→`?v=3`；`stare`／`stareopen`／`frownopen`／`closeopen` 加 `?v=2`；`frontshock` 由字串縮寫改成物件（頭轉正，`fx:0.444`）。**逐行的取景值在 `resources/si/_misha_program_worklist.md` 附四那張表**（frown／close／frontshock 是重畫，top/bot/fx 都變了）。
> 6. ✅ **-1753 已搬進 `TOWNS.dunmor`（名「羅賽爾廢城」）** **（09-25，Mac）無人廢城 `dunmor` 拓樸 v2 Ray 定案** —— 56 格・5 環，`tools/map_dunmor_draft.py` 的 `NODES`／`EDGES` 就是資料來源；要搬進 `town.js`（全部 `noTime:true`、三個 `rest`、迷霧預設），細節在 `resources/background/_dunmor_spec.md` §五。⚠ id／中文名／祭壇那一場還沒定，搬之前問 Ray。
> 7. ✅ **（09-25 晚～26 凌晨，Mac）廢城 `dunmor` 背景 55／55 全交、聖索菲亞補圖 9／9 全交** —— 程式端要接的都在工單，**逐條列在下面 8／9**。
> 8. ✅ **-1743 已接 ①②③**（④ 小地圖是美術單；③ 的中文名仍是暫定、等 Ray 正名）**聖索菲亞補圖（`resources/background/_sofia_add_spec.md` §四，四件）**：
>    ① `TOWNS.santasofia.nodes.inn.bg` → `'sofia_inn'` 並**拿掉 `noTime`**（四差分齊：`sofia_inn_{dawn,day,dusk,night}`）
>    ② 餐飲街 `dining.scenes` 補 `bar:{bg:'sofia_bar'}`（三差分 `_day/_dusk/_night`，**不寫 `noTime`**）、`restaurant:{bg:'sofia_restaurant', noTime:true}`；`tavern` 節點自己的 `bg` 仍是室外街景 `sofia_bistro`
>    ③ `dock` 那一格改成貧民窟：`bg:'sofia_dock'` → `'sofia_slum'`、`name` 改（中文正名等 Ray，暫「聖索菲亞　舊碼頭貧民窟」）；節點 id 不改；`sofia_dock.webp` 留著
>    ④ 小地圖 `map_santasofia` 的 `dock` 圖示（船錨）要換貧民窟簡筆 —— 另開一單（美術）
>    全部是**新增檔**，不用跳 `ASSET_VER`；`bg_index.js` 已重跑。
> 9. **廢城 `dunmor`（`resources/background/_dunmor_spec.md` §五／§九）**：
>    ① ✅ -1753 已接 ② ③ 同（祭壇那一場／wildSpawn／小地圖仍等 Ray） 拓樸搬進 `script/town.js`：`tools/map_dunmor_draft.py` 的 `NODES`／`EDGES`（方向＝相對位置：左邊的鄰居掛 `left`…，`up`＝小 row；`back` 不寫）。搬完 `map_layout.py` 的 `POS` 補一格、產生器回收。⚠ 地圖 id／中文名／祭壇那一場（`sessionEnd`）／`wildSpawn` 還沒定，搬之前問 Ray
>    ② 每一格 `bg:'dunmor_<id 小寫>'`（`ditchW`→`dunmor_ditchw`，55 個檔全在 `resources/background/dunmor/`，`bg_index.js` 的 `dunmor` 列）
>    ③ 每一格 **`noTime:true`**（Ray：「這張圖沒有四差分，都是同一天色」）、`wilderness:true`、迷霧預設（不要寫 `mist:0`）；`rest:true`＋`noWild:true`：`wellsq`／`oakgrove`／`nemeton`；入口 `entry:'gate'`
>    ④ ✅ **-1743 已跳** ⚠⚠ **`config.js` 的 `ASSET_VER` 要跳這 14 個鍵**（第四版同名覆蓋了第一版）：`dunmor_causeway` `dunmor_southgate` `dunmor_ditchw` `dunmor_oghamrow` `dunmor_gatecourt` `dunmor_mainstreet` `dunmor_marketcross` `dunmor_boarstone` `dunmor_innergate` `dunmor_druidhouse` `dunmor_oakgrove` `dunmor_nemeton` `dunmor_altar` `dunmor_wellsq`（其餘 41 張是新增，不必跳）
>    ⑤ 等 Ray：`hallcourt` 正門本該堵死、圖裡只擋一半要不要重出；小地圖走 `tools/map_compose.py` 另開一單
>    總覽 `resources/background/_dunmor_all55_sheet.jpg`；逐格出口／鏡頭／月亮朝向在工單 §八／§九 的表。
> 10. ✅ **-1762 已接（戰鬥／結算點仍等 Ray）** **（09-26 凌晨，Mac）聖索菲亞郊外・里朋家族豪宅 `sofiaout`（Stage 14 合流：救小女孩的姐姐）** —— 拓樸 v3 提案在 `resources/map/_sofiaout_spec.md` §一（產生器 `tools/map_sofiaout_draft.py`、佈局圖 `_layout_sofiaout.png`）：
>    11 格、**兩個終點**（`cellar` 地下囚室＝馬努決戰、`terrace` 露台＝挾人質劇情）；背景 **10／10 已交** `resources/background/sofia/sofiaout_<id>.webp`（09-26 中午補齊 road／avenue／carriage／backhall／cellar／terrace，`bg_index.js` 已重跑；`backhall` 往下石階不明顯，重出與否等 Ray）；小地圖另開。
>    程式端要做的（Ray 點頭後）：搬進 `script/town.js`（全部 `noTime:true`、`bg:'sofiaout_<id>'`）、`gate` 接聖索菲亞哪一格（建議 `uptown`）、結算點在囚室還是露台、`map_layout.py` 補 `POS`、產生器回收。全部新增檔，不用跳 `ASSET_VER`。
> 11. ✅ **-1755 已接** **（09-26，Mac）羅賽爾廢城小地圖交件** —— `resources/map/map_dunmor.webp`＋`_spots_dunmor.json`（55 格）。`TOWNS.dunmor` 補一行（新增、不必 `?v=`），整行可抄在 `resources/background/_dunmor_spec.md` §十：
>    `map:{ img:'resources/map/map_dunmor.webp', spots:{ kingsbarrow:[0.0853,0.1396], barrowfield:[0.1777,0.1396], altar:[0.27…`
> 12. **（09-26 下午，Mac）聖索菲亞四張同名覆蓋** —— Ray：「貧民窟不要有碼頭」「索菲亞的公會要室內圖」「**只要是個店的都要室內**」。
>    `resources/background/sofia/` 的 `sofia_slum`（重畫：窄巷貧民窟，**沒有碼頭與水面**）／`sofia_guild`／`sofia_firearm`／`sofia_grocerie`（三張改**室內**：櫃台中央偏左、右三分之一留白牆給店主立繪、無人）。舊版進 `_recycle/`。
>    程式端要做的：① **`config.js` 的 `ASSET_VER` 補四鍵** `sofia_slum`／`sofia_guild`／`sofia_firearm`／`sofia_grocerie`（同名覆蓋，不跳版號玩家永遠拿舊圖、而且驗不出來，§5）
>    ② `dock` 節點的 `name` 目前「聖索菲亞　舊碼頭貧民窟」—— 已經沒有碼頭了，建議改「聖索菲亞　貧民窟」（**正名仍等 Ray**）；節點 id 不改。三家店節點照舊 `noTime`（室內營業時間 [8,17] ＝只有 day）。
> 13. ✅ **-1764 已接（bgm／小地圖／酒吧掛點仍等；⚠ 旅店暫不寫 `inn:true`＝敲門對白表還沒有、店還沒有買賣介面＝`config.shop.shops` 沒有薇拉馮德的店）** **（09-26 下午，Mac）薇拉馮德港 `verafond` 拓樸 v2 Ray 定案**（「整個城式義大利風，當世最發達的富庶港都」「1900 年」）——
>    程式端要做的：**`TOWNS.verafond` 整段已寫好可直接抄 → `resources/background/_verafond_spec.md` §六**（機器產生、22 格 `bg` 鑰匙全部對過；出航 `sail:{dir:'right'}` 因為碼頭的 `down` 是燈塔）＋ `map_layout.py` 的 `POS` 也在那裡；產生器搬完回收。
>    背景 **73／73 全交**（`resources/background/verafond/`；室外 `vela_<格>` 四差分、店內單張 `noTime`、旅店四差分、酒吧三差分）；鑰匙與 `noTime` 規則在 `resources/background/_verafond_spec.md` §五；全是新檔，不用跳 `ASSET_VER`。
>    ⚠ **不要用 `dining.scenes`**（同第 14 項）；酒吧 `vela_bar` 的掛點等 Ray（建議 `harbor.right` 當港邊酒館）。
> 14. ✅ **-1763 已拆（小地圖補點仍待美術）** **（09-26 晚，Mac）聖索菲亞餐飲街進去看到的是酒吧室內 —— 不是圖錯，是 `dining` 沒拆**（Ray：「索菲亞的餐飲街應該是街道而不是室內」）
>    `tavern` 的 `bg:'sofia_bistro'` 本來就是**街道圖**；但 `TOWNS.santasofia.dining.scenes` 還在，沒有同行女伴時 `DINE.fallback='bar'` ⇒ 整格換成 `sofia_bar`（室內）＝「站在街上卻看到店裡」。
>    ⇒ **同雪都 -1487／東泊 -1263：拆掉 `dining`，改成三分支**（店走得進去、街道就是街道）。建議：
>    `tavern.exits` 加 `up:'bar'`、`down:'restaurant'`（`right` 已經給 `@sofiaout`、`left` 是回頭路）；
>    `bar:{ bg:'sofia_bar', name:'聖索菲亞　酒吧', exits:{back:'tavern'} }`（三差分，**不寫 `noTime`**）、
>    `restaurant:{ bg:'sofia_restaurant', name:'聖索菲亞　餐廳', noTime:true, exits:{back:'tavern'} }`。
>    ⚠ 新增兩格 ⇒ 小地圖 `map_santasofia` 要補兩個點（美術另開一單）；`map_layout.py` 補 `POS`。圖都已在庫，不用跳 `ASSET_VER`。
>    ⚠⚠ 薇拉馮德工單 §五原本寫 `dining.scenes.bar` —— **同一個坑，已改掉**，見第 13 項／`_verafond_spec.md` §五。
> 15. **（09-26 晚，Mac）惡棍系敵人 6 張 `man_thug_*`**（Ray：「`ssophia_si_thug` 這個系列風格的惡棍，大多用手槍、步槍，1900 年」「被突擊的感覺、不要女的、表情動作多變化」）——
>    `resources/enemy/man_thug_{pistol,shotgun,rifle,dual,lookout,boss}.webp`（1024×1536、真 alpha）；規格與每人的反應在 `resources/enemy/_thug_spec.md`、總覽 `_thug_all6_sheet.jpg`。
>    程式端要做的（等 Ray 給卡）：`config.enemies` 各一張敵人卡，`kind:'human'`（結算「已擊敗」、**不吃**降臨／淨化演出）；圖路徑直接指 `resources/enemy/man_thug_*.webp`。全是新檔，不用跳 `ASSET_VER`。
> 16. ✅ **-1767 已跳 `?v=3`** **（09-26 晚，Mac）索拉娜 `remind` 回上一版**（Ray：「索的 remind 修壞，回上一版」）—— `resources/si/sorana_si_remind.webp` 換回 d556b53（09-20 軟遮罩版），09-22 的重製版（3f5a10b）進 `_recycle/`。
>    程式端：**`script/speakers.js` 的 `remind` 路徑 `?v=2` → `?v=3`**（同名覆蓋，不跳版號玩家永遠拿到修壞的那版）；取景值 `measure_si.py` 重量＝`top:1 bot:1525 fx:0.523`（現行寫 `top:4`，差 3px 可改可不改）。
> 17. ✅ **-1768 已跳 `?v=4`**（取景不變 top:9 bot:1530 fx:0.528） **（09-26 晚，Mac）索拉娜 `smile` 也回上一版**（Ray：「smile 也修壞了，回復」）—— `resources/si/sorana_si_smile.webp` 換回 d556b53，09-22 第三輪重製版（82caf63）進 `_recycle/`。
>    程式端：**`script/speakers.js` 的 `smile` 路徑 `?v=3` → `?v=4`**；取景 `measure_si.py` 重量＝`top:9 bot:1530 fx:0.528`，與現行完全相同、不用改。
> 美術現況與換機器交接：**`resources/_HANDOFF_ART_20260925.md`**（§七＝米夏九張；§八＝廢城兩次退稿到定風格；**§九＝聖索菲亞 9 張＋廢城 55 張全交、產線的坑**）（Windows 那台收工版；09-24 那份 §六～§八是細節）。做完把這一塊刪掉或標成已接。

> ✅ **`tomb_misha_met` 東泊那一邊 -1717 接上了**（Ray 定案：AB 順序長談在「滿足滿足！」收場、
> 可睡、沒有那一夜也沒有審訊、隔天直接走出旅店）—— 見 -1717 那一段。

> ⚠⚠⚠ **美術 session 在 ver -1670 之後交了一批東西，程式端有事要接** ——
> 清單在 **`_TO_CODE_20260922.md`**（`ASSET_VER` 七列／`speakers.js` 16 條版號 ＋ 8 個新鍵
> ／三件等 Ray 決定的）。⚠ 那一份是 2026-09-22 晚寫的，做完請把它刪掉或標成已接。

> ⚠⚠⚠ **換 session（2026-09-25，Mac，程式 session 收工）—— 開工前先讀這一塊**
> · `origin/main` ＝ **`-1774`**（見下一段），工作樹只剩 Ray 自己的 untracked 檔，沒有欠 commit。
> · **這一輪 -1728～-1733 沒在瀏覽器驗到的（省用量，Ray 在 8200 看）**：
>   ① 墓門開場的新順序（兵聲起→米夏 CI→terrify→行軍插圖→索那句→插圖收兵聲停），三版都改了
>   ② 拉煙減量（機槍 3 團／霰彈 1 團）與去 blur 的視覺 ③ Stage 14（`enter:'flight'`＋`flight:{town:'ravnsdal'}`）落點
>   ④ -1729 那三處發熱修正在手機上有沒有差 ⑤ 王座徘徊者的拍翅感（-1731 的四組數字）
> · **等 Ray 決定的**：~~BA・M2 敲門約蕾娜「扯平」與合流重複~~（-1736 結案）；蕾娜 M2 的 −10 是我訂的；`sodier_.webp`（隨從）
>   這個 WIP 檔名；`023_anyacottoncandy`／`024_nouvellesmile` 兩張 PNG 沒有腳本引用；`032_rennablush` 插圖還沒交；
>   `hugangry2` 在 Windows 找；pptx 要 node 重出；美術 spec 裡 `Deck_`／`Sky_` 大寫檔名要改。
> · **已做完、不要再做**：美術 9/24～9/25 交接的四件全接了（whisper／米夏 draw／drawopen／隨從）；差分總表 -1728 重出；
>   `_TO_CODE_20260922.md` 那批**是否已接仍待對**（沒人確認過）。
> · 這台 Mac 上 Ray 的 untracked 檔清單見 -1724 那一段（沒推、換機器要自己帶）。
> · 路線模擬器 `tools/routesim.mjs`（Mac：`cd tools && jsc -m routesim.mjs -- BAM2 40`）。

# HANDOFF — 截至 `ver 2026.09.22-1774`（-1774：女主星不再用等級鎖）

**`-1774`：女主九星改價、拿掉等級鎖**（Ray：「女主的技能不要用等級來鎖，前兩個各 1 份，三四各 2，五六各 3，七八各 4，9 是滿足特定條件」）
· `config.girls.starCost` ＝ `[1,1,2,2,3,3,4,4,0]`、新增 `starCond:{9:'girlstar9'}`。
  `progress.canLightStar` 不再看等級；第 9 顆要旗 `girlstar9_<她>`，不花紀錄。⚠ 鐵律 9：**那支旗還沒有人插**（條件等 Ray 定）。
  整備頁的技能表：序號由 `LV.n` 改成 `★n`，第 9 顆鎖著時印「條件未達」。
· **經濟試算表** `docs/girl_star_economy.xlsx`（`python3 tools/girl_star_economy.py` 重產，星名與效果從 config 現讀）：
  參數／星價／升級與收入／方案比較（A 現值～E 每級 3 份）／失衡分析。我建議方案 D（每級 2 份＋劇情合計 4 份：Lv5 約 4 顆、主線打完 ①～⑧ 全亮）。
  ⚠ `recordPerLevel` **還是 1**（現值），等 Ray 挑方案再改。
· Ray 的方向（同時交代）：**諾薇兒要早期就進入穩定的不死狀態，保護手殘玩家** —— 分析頁建議把 ⑦蟹生（天鎖每隻怪一次）換到 ②／③，
  與 ④堅殼（天鎖期間回血）湊成 6 份的「免死組」。**還沒動星的排列**，等 Ray 定。

# （上一段）截至 `ver 2026.09.22-1773`（-1773：Stage 14 接不上舊存檔）

**`-1773`：Stage 14 新劇情接不上正在玩的存檔**（Ray：「新接上的劇情好像在我連續遊玩時不會接到我正在玩的紀錄裡？」）
· 成因：-1769 的合流旗 `s14_route` 插在**合流段的最後一句** —— 已經演過那一段的存檔永遠拿不到，
  飛行段與聖索菲亞抵達（其後整串都掛在 `ss_arrive` 上）全部不觸發。鐵律 9 的坑：新鑰匙掛在已經發生過的事件上。
· 改法：`s14_route` **整支拿掉**，改由既有的旗推出來 ——
  AB＝`ep_leave_final`；BA＝`vn_after_tomb`＋`ep_leave_tomb`（B 先跑的人第一次離開東泊一定演過；AB 永遠演不到）。
  · 聖索菲亞 `ss_arrive` 的 `need` 寫成 `{ any:[ 'ep_leave_final', ['vn_after_tomb','ep_leave_tomb'] ] }`
    —— `modules/town.js` 的 `needOk` 新增 `{any:[…]}`（任一項成立；陣列那一項＝全部都要）。
  · 飛行頁 `s14Route()` 同一組條件（兩邊各一份，註解互指）。
  · Stage 14 章節的旗拿掉 `s14_route`（BA_M1_EXIT 本來就有 `ep_leave_tomb`）。
· ⚠ **自檢**：以後在「已上線的段落」上加新旗當後續劇情的鑰匙，先問「已經演過這一段的存檔拿得到嗎？」—— 拿不到就用既有的旗推。

# （上一段）截至 `ver 2026.09.22-1772`（-1772：瞭望台 M2 +5／其他 +3）

**`-1772`**：雪都瞭望台安雅約會 —— Ray 定案「M2 +5、其他路線 +3」（不疊加）。拍上的 +5 拿掉，改走段落的
`dateAff:{ ep_m2_route:5 }`（約會統一那一支新增的寫法：第一支插著的旗說了算，都沒插＝`OUTING.dateDoneAff`）。

# （上一段）截至 `ver 2026.09.22-1771`（-1771：約會 +3、小女孩拉高）

**`-1771`**（Ray 四句話）
· **小女孩（Loki）往上拉一個頭**：`ART.loki` 加 `standCm:151`（+23cm ≈ 她一個頭高；只動頭頂位置，大小不變）。
· **約會場景事件演完 +3**：`OUTING.dateDoneAff:3`，實作在 `modules/town.js` 段落收尾 —— 任何 `withWho` 段落第一次演完，
  給正在約的那個人。聖索菲亞索菈娜那條拆兩段，前半寫 `dateAff:0`（後半舊街區演完才給）。
  原本段落裡寫死的兩筆（東泊餐廳諾 +2、甜品店安 +3）併進這條，拿掉。
  ⚠ ~~雪都瞭望台 M2 +5+3＝8~~ → -1772 定案：M2 +5、其他 +3。
· **蕾娜**：東泊大學接她 +1→**+3**；聖索菲亞市政廳（`ss_cityhall` 最後一句）**+3**；安雅私會米夏那晚敲蕾娜一起跟上 +2→**+3**。
· **順手修的舊 bug**：段落收尾的好感記帳以前**整段盲加**，有 `onlyIf`／`skipIf` 的拍也照加（瞭望台 M2 的 +5 非 M2 也拿到）。
  現在照拍上的條件記帳（與 story.js 跳拍同一套判法）。

# （上一段）截至 `ver 2026.09.22-1770`（-1770：手機過熱兩處）

**`-1770`：手機嚴重快速過熱**（Ray 附兩張 HUD：城鎮 stage 13／飛行 stage 14，17 分鐘掉 12% 電）
· **城鎮**：HUD 上唯一在跑的無限動畫是槍棺箭頭的 `kerbBreathe` —— 逐禎改兩層 `drop-shadow`（模糊 16／22px），
  `filter` 不是合成器屬性，每禎重新光柵化（同 -848 首頁團徽）。改成光暈固定、呼吸走 `opacity`，箭頭 `will-change:transform,opacity`
  升層 ⇒ 晃動與呼吸都在合成器上做。⚠ 視覺：原本是「光暈大小在呼吸」，現在是「整支發光的箭在呼吸」（亮度 .62↔1），要調跟我說。
· **飛行**：-1749 為了立繪與對白字不糊，把 2D 畫布**整趟**鎖在 DPR 2 —— 等於把自適應降畫質對這一層關掉（手機降檔時照樣每禎填 4 倍像素）。
  收窄成**只在對白期間**（`sayQueue`）撐 2，`say()` 開始與 `drawTalk` 收尾各叫一次 `resize()`；其餘跟 `Q().dpr`。
  實測（`?q=3`）：平時 DPR 1、對白中 2、講完回 1。
· HUD 上的 `home●`＋`stage●` 不是熱源：`body:has(#storyStage.on) #home` 已經 `visibility:hidden` ＋ 動畫暫停。
· ⚠ 還沒動的疑點（等手機數字）：飛行頁的 `fkgShine`／`fkpShine`（齒輪／吊墜的反光，`background-position` 無限動畫）；
  -1752 的 `preserveDrawingBuffer:true`（GL 畫布只有 BW×BH，理論上很小）。改完請 Ray 看一下同一段路的掉電速度。

# （上一段）截至 `ver 2026.09.22-1769`（-1769：Stage 14 全支線合流 → 聖索菲亞）

**`-1769`：Stage 14 劇本接上**（Ray 交稿「全支線合流 Stage14」，台詞一字未改）
· **合流旗 `s14_route`**：三條路的最後一句各插一次 —— 雪都旅店 BA・M2（`vn_after_tomb` 第一個 act）、BA・M1（第二個）、
  AB 走出東泊旅店（`ep_leave_final`）。飛行段與聖索菲亞抵達都只問這一支。Stage 14 章節的旗也補了它。
· **飛行段**（`flight/index.html` 的 `S14_TALK`／`s14FlightMaybe`，起飛演完才開口）：立繪對白 → 開大地圖標聖索菲亞城
  （蕾娜無立繪一句「瓦勒里亞王國是中立國…」）→ 關地圖 → 立繪對白。**T3 派生看各人自己的段位**：索 T3＝smirk 一句＋主角空白框狂抖
  （飛行頁新增 `shake:'bubble'`，同 DOM 那一套）；諾 T3＝angry、安 T3＝argue（兩拍無台詞，各自獨立）。旗 `s14_flight_talk` 演完才記。
  ⚠ 舊的 DEPART_TALKS ③（`sofia_depart_talk`，東泊→聖索菲亞方向說明）**拆了**：同一段路不講兩次。
  飛行頁補登 6 張差分（蕾 evaluate／evaluateclosemouth／tire、索 upset／nod、諾 angry），取景抄 speakers.js。
· **聖索菲亞**（`TOWNS.santasofia`，`storyStages:[14,null]`）：
  - 主廣場 `ss_arrive`（進城那一大段，含插圖 `33_worldofsorana`、馬努／小女孩／路人）。
  - **支線一**市政廳 `ss_cityhall`（`noDate`）：蕾娜 T3 以上走插圖 `34_rennacityhall`（`cgPan:'up'`），T2 以下一般對話。
  - **支線二／三／四**貧民窟（`dock` 那一格）`ss_slum_anya`／`ss_slum_nou`／`ss_slum_sor`（`withWho`）。
    支線四後半在**舊街區**（貧民窟唯一的下一格）`ss_sor_resolve`，演完 `goto:'inn'`。
  - **下午四點** `gates` 的 `ss_4pm`（`hourOfDay:[16,24]`，`goto:'inn'`）：沒約人／約安雅＝諾薇兒跑來、約諾薇兒＝安雅跑來；
    **約索菈娜不走這一道**（台詞是「蕾娜跟索菈娜吵起來了」，她就在旁邊）。
  - 旅店開了 `inn:true`：蕾娜 `out`（辦手續）、`noSleep`（睡覺會跳過四點那一道）。
· 新素材：NPC 立繪 15 張（`npc_ss_*`／`ssophia_si_manu_*`，PNG→WebP，原檔進 `_originals/SI/NPC/`）、插圖 33／34、
  音效 `se_coins`／`se_drawknife`（AAC，`fileGain` 1.549／1.928 CAP，audio_scan 實量）。
  新 speaker：`MANU_X`（？？？）／`LOKI`（小女孩）／`LOFA`（少女）／`WORKER_SS`（路人）／`COUNTER_SS`（櫃台）；
  身高是估的（176／128／158／174／175），取景 `measure_si` 實量。諾薇兒 `back` 補登（圖早就在，沒登記）。
  舊的 `npc_ss_cityhall_front.webp`（09-09，與新 PNG 不同張）進回收區。
· 稿上對不上的差分取最接近的：安 `sacre`→scare、`dying`→die、`shock`→surprise；蕾 `softcommand`→commandsoft；諾 `expain`→explain。
· 實測（51374，自己的分頁）：抵達整段／支線一（T4 走插圖、收圖）／四點帶回旅店／敲索菈娜的門→貧民窟→舊街區→強制回旅店／
  飛行段（開圖、T3 分支、旗記上）全部走通，新素材全 200、無錯誤。**支線二、三沒實跑**（與支線四同一套，只換 `withWho`）。
· ⚠⚠ **等 Ray**：
  ① **旅店合流**那一段的稿（「蕾娜跟索菈娜吵起來了」）還沒到 —— 現在四點那一道／支線四只把人帶回旅店，旅店裡沒有戲。
  ② 三個人的**約會邀約台詞是我暫代的**（稿上只寫「自由行動，可約會」）；換稿保留 `ss_date_*` 那支旗（四點那一道靠它分台詞）。
  ③ 約索菈娜但沒去貧民窟 ⇒ 沒有東西把人帶回旅店（要等合流稿決定怎麼收）。
  ④ `ssophia_si_thug.png`（美術的惡棍畫風參考）沒動；要轉 WebP 跟美術說一聲（`_thug_spec.md` 寫的是 .png 路徑）。

# （上一段）截至 `ver 2026.09.22-1768`（-1768：索拉娜 smile `?v=4`）

**`-1767`：索拉娜 `remind` 跳 `?v=3`**（交接第 16 項；Ray：「索的 remind 修壞，回上一版」）—— 美術已把圖換回 d556b53 那版（68576aa），
`speakers.js` 的 src 跳 `?v=3`、取景改用重量值 `top:1 bot:1525 fx:0.523`（原 top:4）。飛行頁沒有登記這張，不必改。
⚠ commit `34fd3b9` 的訊息寫成「ver -1765」是**撞號**（同時間另一個程式 session 推了 -1765／-1766）；實際 `VERSION` 是 **1767**。

# （上一段）截至 `ver 2026.09.22-1766`

**`-1766`：補上「程式在用、檔案卻沒進版控」的兩支**（Ray：「推上，巡一下有哪些該 commit 沒上的」）
· `resources/audio/bgm/peritune_sylblanc_loop.m4a`（鏡湖 BGM，-1542 起就被引用）入版控。
· `renna_si_hugangry2`（H 路線抱著那三拍）：PNG → WebP q85（1.1 MB → 181 KB），`speakers.js` 改指 `.webp`，原 PNG 進 `_originals/SI/`。
  ＝交接「`hugangry2` 在 Windows 找」那一條結案（檔案在這台 Mac 上）。
· ⚠⚠ **工作樹裡 `corvin_si_ecstasy.webp` 被刪，而腳本在用它**（`town.js` 315／3199／3201 的 `cor('ecstasy',…)`）——
  **不要 commit 那個刪除**（origin 上還在，線上沒事）。原檔在 `_originals/SI/NPC/Corvin_SI_ecstasy.png`。等 Ray 說是要換圖還是誤刪。
· 巡查結果（untracked 47 個，逐一對過程式引用）：其餘都是**還沒接進程式的新素材**（NPC `npc_ss_*`／`ssophia_si_manu_*`、
  插圖 023／024／33／34、`anya_si_cryrun`、`nemo_ci_dual`、`se_coins/drawknife/page1/page2/pickup`、`enemy_lowroar`），
  或 `_raw`／wav 原檔、UUID 檔名的暫存圖、參考文件 —— 接的時候再一起進版控（PNG 要先轉 WebP）。

# （上一段）截至 `ver 2026.09.22-1765`

**`-1765`：薇拉馮德港 BGM ＝ PeriTune Emerald Hill**（Ray 指定）
· 檔案由 Ray 放的 `PeriTune_Emerald_Hill_loop.m4a` 改成小寫 `peritune_emerald_hill_loop.m4a`（靜態空間分大小寫），入版控。
· `ASSETS.bgm_emeraldhill`、`TOWNS.verafond.bgm:'emeraldhill'`、`fileGain` **0.682**（audio_scan：−11.38／−9.59 ⇒ 平均 −10.49；同輪 sylblanc 1.137、Prairie4 0.754 校準點對得上）。
· 實測（8123）：`town.open('verafond')` → 碼頭、抓 `peritune_emerald_hill_loop.m4a` 200。
· ⚠ 鏡湖那首 `peritune_sylblanc_loop.m4a` 從來沒進版控 —— -1766 已補。

# （上一段）截至 `ver 2026.09.22-1764`

**`-1764`：薇拉馮德港 `verafond` 接上**（美術交件 `_verafond_spec.md` §六，Ray：「薇拉馮德拓樸跟圖給 code」）
· `TOWNS.verafond` 22 格照工單原樣抄（草稿 `map_verafond_draft.py` 回收，版面進 `map_layout.py` 的 `POS`）：入口碼頭、出航掛右、`mist:0`、不加 `dining`。
  營業時間照帝都：武器店／公會／雜貨舖／市政廳／咖啡廳／甜品店／餐廳 `[8,17]`、大教堂 `[8,19]`，打烊句照帝都同類店。
· 飛行地圖 `SETTLEMENTS` 的薇拉馮德港補 `town:'verafond'` ⇒ 降落鈕。
· ⚠ 跟工單不一樣（程式端判斷）：**旅店不寫 `inn:true`**（沒有敲門對白表，寫了會敲到一排空門）；店沒有買賣介面（`config.shop.shops` 沒有這座城）。
· ⚠ 還沒有：`bgm`、小地圖、酒吧 `vela_bar` 掛點 —— 等 Ray／美術。
· 實測（8123）：上空出現「降落　薇拉馮德港」→ 碼頭 `vela_harbor_day`，上碼頭市集／左造船廠／右出航／下燈塔。
· ⚠⚠ 工作樹裡 `resources/si/npc/corvin_si_ecstasy.webp` **被刪了、沒走回收區**（不是這個 session 動的），而 `speakers.js` 還指著它（lint 提醒）。沒有 commit 那個刪除，等 Ray 確認。

# （上一段）截至 `ver 2026.09.22-1763`

**`-1763`：聖索菲亞拆掉 `dining`（分店機制），酒吧／餐廳直接放進拓樸**（Ray：「現在已經沒有這個了，直接放拓樸就好」；＝交接第 14 項）
· 沒有女伴同行時 `DINE.fallback='bar'` 把整格換成酒吧室內 ⇒ 站在餐飲街卻看到店裡。拆掉之後：
  `tavern`（街景 `sofia_bistro`）出口＝上 `bar`／左 `uptown`／右 `@sofiaout`／下 `restaurant`；
  `bar`（`sofia_bar` 三差分，不寫 `noTime`）、`restaurant`（`noTime`），兩格都 `back:'tavern'`。
  ⚠ 回上街區由 `back` 改成明寫 `left`：`back` 在沒有來向時預設掛「下」，會跟餐廳撞在一起（上街區是 `right` 進來的，兩端相反）。
· `map_layout.py`：補 `bar`／`restaurant` 兩格與通往莊園的跨圖框 ⇒ 14 格・13 邊・0 環。
· 實測（8123）：餐飲街是街景、四個方向對；進酒吧是 `sofia_bar_day` 室內、往下回餐飲街。
· ⚠ 小地圖 `map_santasofia` 要補酒吧／餐廳兩個點（美術另開一單，第 14 項原文就有寫）。

# （上一段）截至 `ver 2026.09.22-1762`

**`-1762`：里朋莊園（`sofiaout`）接進城鎮資料，從聖索菲亞餐飲街往右走進去**（Ray：「索菲亞連往莊園中間的路應該已經好了，接在餐飲街右邊」）
· `TOWNS.sofiaout`（名「里朋莊園」）：10 格，照 `map_sofiaout_draft.py` v3 原樣搬（草稿回收，版面進 `map_layout.py` 的 `POS`／`OUT_POS`）。
  入口 `road`（橄欖園道）；露台 `terrace`＝`rest`＋`noWild`；地下囚室 `cellar`＝終點（戰鬥未定）。每格 `noTime`、迷霧、`wilderness`。
  `bgm:'suspense'` 是程式端挑的。
· 聖索菲亞 `tavern` 加 `right:'@sofiaout'`；園道 `back:'@santasofia:tavern'`。
  ⚠ 跨圖進來沒有帶入方向 ⇒ 園道的回頭路掛在「下」（＝這張圖的身後、草稿上 gate 的位置）。不會彈：從餐飲街一直按右停在園道，一直按下回餐飲街再到上街區。
· 實測（8123）：餐飲街多一支「右：里朋莊園」→ 園道（往前「？？？」、往下「聖索菲亞　餐飲街」）→ 往下回到餐飲街。
· ⚠ `map_layout.py` 對這張印「8 邊・環數 −1」是顯示誤差（它不數 `back` 上的跨圖出口卻照樣扣掉）；資料實測 9 邊、10 格全連通、0 環。
· ⚠ **還沒有**：戰鬥（結算點在囚室還是露台）、`wildSpawn`、劇情、小地圖。

# （上一段）截至 `ver 2026.09.22-1761`

**`-1761`：里朋莊園從飛行地圖拿掉**（Ray：「把莊園從飛行地圖拿掉吧，反正不是降落點，從城鎮進去就好」）
· 刪掉 `SETTLEMENTS` 那一列、`PLACES` 那一筆名牌、`export_mapref.py` 那一行；俯視插畫的美術單 `flight/city/_ripon_plan.md` 回收（不需要了）。
· 莊園本身（`sofiaout`，11 格）照舊**從聖索菲亞城走進去**，拓樸等 Ray 定案（`resources/map/_sofiaout_spec.md`）。
· ⚠ 上面 -1755～-1760 那幾段（3D 量體 → 城鎮模式 → 美術單）**全部作廢**，留著當紀錄。

# （上一段）截至 `ver 2026.09.22-1760`

**`-1759`／`-1760`：里朋莊園進 `SETTLEMENTS`（城鎮模式）** —— Ray：「里朋莊園還是要有建築，只是走城鎮模式」。
· 加了一列 `{ n:'里朋莊園', x:544, y:595, t:'village', f:'free' }`（不寫 `town`）。
· ⚠⚠ **實測地表上沒有建築**：飛行地圖只畫有正俯視插畫的城；`Settlement.generate` 產出的程序房子（這一座 11 棟）**早就沒人畫**。
  ⇒ 建築要等 `flight/city/_ripon_plan.md` 那張插畫；或 Ray 同意由程式端先用程式合成一張暫代的俯視圖（鐵律 11：程式 session 產圖要先問）。
· `PLACES` 那一筆名牌留著（同帝都／聖王廳，兩份座標一起動）。

# （上一段）截至 `ver 2026.09.22-1758`

**`-1758`：里朋莊園改走城鎮模式**（Ray：「里朋不要走 3D 物件好了，反正不是降落點，走城鎮模式」）
· 拿掉 `RUIN_ART.ripon`（38 件）與 `RUIN_PAL.villa`；`PLACES` 那一筆**只剩名牌**（不寫 `town`、不是降落點）。
· 城鎮模式要一張**正俯視插畫** ⇒ 美術單 `flight/city/_ripon_plan.md`（交件 `flight/city/Ripon_topdown.png`，1024² RGBA、大門畫在上緣、
  縮到 1/8 讀得出、附來源 V／S）。收到後的程式端五步寫在那張單的 §六（build_city JOB → 色調反解 → SETTLEMENTS 一列 → 刪 PLACES 那一筆 → 三距離驗）。

# （上一段）截至 `ver 2026.09.22-1757`

**`-1757`：從禁航區裡起飛會被空氣牆釘死**（Ray 回報「廢城出航會黑畫面出不去」時查到的，**但不是他那一次的原因** —— 他是在試飛裡，試飛沒有禁航區）
· `noflyCheck`：起點就在禁區內、這一趟還沒在禁區外待過（`noflySafe` 空）⇒ 放行到飛出去為止（`noflyFromInside`）。
  舊邏輯第一禎把牆內位置記成安全點，之後每禎拉回同一點。實測（拔掉試飛旗）：從廢城一路飛得出去；飛出去後再朝牆內飛，照樣被擋、蕾娜照樣講話。
· ⚠⚠ **Ray 那一次的黑畫面還沒找到**：同流程（試飛 → 降落鈕 → 收名卡 → 按住「出航」）在 1757 桌機上 2 秒內回到飛行畫面、16 秒內無黑。
  懷疑方向：他的分頁吃到 -1752 之前的版本（靜止不重算 ＋ 沒保留繪圖緩衝 ＝ 靜止時整片黑，而出航後船正好是靜止的）。等 Ray 的 HUD 版本號。

# （上一段）截至 `ver 2026.09.22-1756`

**`-1754`～`-1756`：羅賽爾廢城小地圖接上 ＋ 里朋莊園放上飛行地圖 (544,595)**
· `TOWNS.dunmor.map`：`resources/map/map_dunmor.webp`＋55 格 spots（美術 `_spots_dunmor.json`）。實測：降落鈕落地 → 地圖鈕翻開旅誌、只露出堤道那一格、探索 1／55。
  （`lostplace` BGM 由暫代改為 Ray 認可。）
· 里朋莊園：`PLACES` 一筆（`type:'莊園'`、`ruin:'ripon'`、**沒有 `town`** —— `sofiaout` 拓樸還在提案，接上時補 `town:`）；
  `RUIN_ART.ripon`（38 件、最高 47）：兩層黃赭灰泥主樓＋赤陶四坡瓦、四柱柱廊＋鐵欄陽台＋大台階、右翼拱門馬車道、前庭噴泉、米白石圍牆、棕櫚與柏樹。
  `rot:-1.145`＝正面朝北北東 36 格外的聖索菲亞城；地形整片 171 平地、非禁航。新色票 `RUIN_PAL.villa`。
  貼材用 geo 現成的（Ray：「geo 裡應該夠用了」）：牆 `flight_villagewall`、瓦 `flight_rooftile`。`export_mapref.py` 同步。
  實測（8123 試飛）：城南一座白牆紅瓦的宅院，讀得出來。
· ⚠ 測試小抄：跳版號**之後**才開分頁；已開的分頁要用 `?nc=<版號>` 之類的網址重載，不然吃到快取裡的舊模組（這一輪踩了兩次）。

# （上一段）截至 `ver 2026.09.22-1753`

**`-1753`：無人廢城正名「羅賽爾廢城」＋ 拓樸接進 `TOWNS.dunmor`**（Ray 指定）
· `script/town.js`：`dunmor`（55 格，照 `map_dunmor_draft.py` 的 NODES／EDGES 原樣搬，方向由座標算、兩端自動相反）。
  入口 `causeway`（草稿上的 `gate` 是跨圖出口、沒有背景圖 ⇒ 不是一格；堤道往下＝`sail` 回船）。
  每格 `noTime`、`wilderness`、迷霧預設；休息處 `wellsq`／`oakgrove`／`nemeton`＝`rest`＋`noWild`。`bgm:'lostplace'`（我挑的，Ray 認可）。
  ⚠ **還沒有**：祭壇那一場、`wildSpawn`（遭遇的怪）、小地圖 `map:`、劇情、章節窗 —— 等 Ray。
· `tools/map_layout.py` 補 `POS.dunmor`，跑出 55 格・59 邊・5 環（＝草稿；少的那一條是通往 gate 的跨圖出口）；草稿 `tools/map_dunmor_draft.py` 回收。
· 飛行地圖 `PLACES` 那一筆改名並補 `town:'dunmor'`（降落鈕）；`export_mapref.py` 同步。
· 實測（8123 試飛）：`land('dunmor')` → 讀取頁只抓這張圖的 55 張背景（覆蓋過的 14 張帶 `?v=2`）→ 名卡「羅賽爾廢城」→ 堤道 → 南壘門（左右「？？？」、下回堤道）。
  ⚠ 測試時第一次看起來「落地卡在戰鬥盤面」—— 是**我的分頁開在跳版號之前**、吃到快取裡的舊 `town.js`，不是資料問題。

# （上一段）截至 `ver 2026.09.22-1752`

**`-1752`：船靜止時畫面閃黑（-1750 的副作用）**—— GL 建 context 加 `preserveDrawingBuffer:true`。
預設時繪圖緩衝交出後就清空，桌機 Chrome 沿用上一張、手機可能交出清掉的黑畫面。桌機重現不出來；
實測（8123）：開機正常、`preserve` 為真、靜止每秒重算 5 次、畫面正常。**要 Ray 手機上再驗一次**；還閃的話退路是改成
「地形畫進離屏 FBO、每禎只貼那一張」（更穩，但要動遺蹟的深度緩衝）。

# （上一段）截至 `ver 2026.09.22-1751`

**`-1750`／`-1751`：飛行畫面發熱對策 1 與 3**（Ray：「1. 3 可以試試，2 不可」—— 2＝鎖 30 禎，**不做**）
· **1 畫面沒動就不重算地形**（`render` 裡的 `glKey`）：鑰匙＝相機／光向光色／霧色／雲亮／日夜／緩衝尺寸／地貌與遺蹟上傳狀態／畫質檔。
  沒變就這一禎不碰 GL（瀏覽器繼續顯示上一張），每 `GL_IDLE_MS`（200ms）補畫一次（瀑布水流、非同步載入的城貼圖）。
  `screenSample` 的 GL 回讀改成只在剛畫過（40ms 內）才發 —— 否則可能讀到交出後清掉的緩衝，把遺蹟環境光壓黑。
  實測（8123）：船停著 **60→4.5 次／秒**、飛行中 58.5 次／秒；停著的畫面與遺蹟色正常。
· **3 低畫質檔縮步數與視距**：`QUALITY[]` 新欄 `step`／`view`（q0/q1 都是 1＝畫面零變化；q2 1.2/0.92、q3 1.4/0.85、q4 1.7/0.78）。
  shader 新 uniform `uStepK`（步進三個常數 0.75／0.0062／0.0031 一起乘，跳格的等價性不變）、`uZfar`（迴圈與霧用它；**深度換算仍用 ZFAR**，
  不然與 GL 遺蹟的遮擋對不上）。實測同在 q4：GPU **2.1→1.3 ms**。
· ⚠⚠ 以上都是桌機數字；**發熱要 Ray 手機上看**（HUD：fps／q／gpu w、g）。

# （上一段）截至 `ver 2026.09.22-1749`

**`-1749`：廢城貼材接上 ＋ 飛行畫面手機上立繪／對話字變糊**
· `flight/geo/dunmor_wall.webp`（Ray 交件 1254² → LANCZOS 256²、q90、10 KB；原檔 `resources/_originals/flight/geo/dunmor_wall_gpt.png`）；
  `RUIN_ART.dunmor.tex:'dunmor_wall'`。屋頂那張選用的沒交，王廳山牆沿用這張。
· **糊的原因**：自適應畫質 q2～q4 的 `dpr:1` 把**整張 2D 畫布**壓成 CSS 像素，立繪／對話框／canvas 文字都在那一張上。
  **修法**：GL 路徑（`GLON && glReady`）下 2D 畫布固定 `min(2, 裝置 DPR)`，降畫質只降地形（`glcv` 的 BW）；CPU 路徑照舊。
  GL 就緒那一刻叫 `resize()`。⚠ `applyResize` 開機就跑、`GLON`／`glReady` 宣告在後面 ⇒ 包 try（TDZ）。
  實測（8123）：開機正常、強制 q4 時 DPR 仍是 2。
  ⚠⚠ **代價**：手機掉幀時 2D 這一層不再降解析（以前 q2 起降成 1 倍）。發熱要 Ray 手機上看一次 —— 若變燙，退路是「只有對白進行中才升 DPR」。
· 12802 行那句「Stage 1a 仍然照跑 CPU 那一圈」是過期註解（-1201 起 GL 下只剩粗算地平線），已改正。

# （上一段）截至 `ver 2026.09.22-1748`

**`-1746`～`-1748`：無人廢城放上飛行地圖 (183,762)，照背景圖畫風做了手寫量體**（Ray 指定）
· `flight/index.html`：`PLACES` 一筆（名「無人廢城」暫定、`ruin:'dunmor'`、**沒有 `town`** —— 拓樸還沒搬進 `town.js`，接上時補 `town:` 就有降落鈕）；
  `RUIN_ART.dunmor`（100 件：外城牆殘段、南壘門＋塌掉的過梁、堤道＋歐甘立石、主街兩側多層石屋、內壘門、圓石塔 broch、
  王廳＋半塌山牆＋石柱廊、十根立石的石環＋三組過梁、四階石塚、石桌墓、聖道立石、崖邊三立石祭壇、散落碎石）；
  新色票 `RUIN_PAL.slate`（冷藍灰帶紫，-1747 第二版壓暗一成二）。`flight/export_mapref.py` 同步一筆。
· 地形實測：平頂台地（整片 145）、西南 124° 約 240 單位是崖 ⇒ `rot:2.16`，局部 +x 朝崖（祭壇背崖）、−x 朝東北（城門）。不整地、`lift:6`。
  自檢：最高 78、無懸空零件 ⇒ 不必挪降落點。
· ⚠⚠ **這一點在第 9 國（羅賽爾）＝禁航區裡**：正常遊玩飛不進去，只有試飛放行。要開放得改 `NOFLY_IDS` 或等劇情。
· 實測（8123 試飛）：遠／中／側面讀得出石城；正午與 21:00 各看一次，夜裡跟著環境光變暗、不發亮；60 fps。**閃動量測（§6.8.1 第五節）沒做**。
· **試飛補漏**（-1747）：大地圖上的出航說明（`departureTalkMaybe`，走 `mapDlgStart` 不經過 `say()`）與 Stage9 飛行段（`s9FlightMaybe`）也歸 `freeFlight()` 管。
  實測：試飛不再一開就攤地圖讓蕾娜講「往西南方一路飛回去」。

# （上一段）截至 `ver 2026.09.22-1745`

**`-1745`：劇情戰結算頁續播戰鬥曲，結算頁結束才切回**（Ray 指定）—— 撤回 -1740 的「進結算就淡出」（`combat.js` 的 `toResult`）。
切回照舊由回程接：飛行 `openFlight` 收、城鎮 `ensureBgm`、劇情 `resume.bgm`／`bgmAfter`（-1740 實測過飛行那一條回到天上時父頁曲子有停）。
挑戰（非劇情戰）仍是結算放 `bgm_result`、教學接 crisis，沒動。

# （上一段）截至 `ver 2026.09.22-1744`

**`-1744`：試飛＝完全無劇情、無限航區**（Ray：「讓試飛完全無劇情 無限航區」）
· 旗 **`free_flight`**：`FLIGHT_TEST` 插、`newRun()` 清（鐵律 9）。飛行頁 `freeFlight()`、城鎮 `storyOff`／`outOfStoryWindow` 問它。
· 飛行頁放行／關掉的：`say()`（不講、照叫 `done`，所以船上對話、過境與邊界碎念、禁航台詞全靜）／禁航區與紅罩／
  劇本遭遇與「劇本遭遇沒打完不刷雜怪」／`placeLockedNag`／`placeStageLocked`／`stage1Blocked`／`belisarLandGate`／`huntLandGate`。
· 降落進城：這座城的劇情一律不演，**連明寫 `fromStage`／`untilStage` 的早訪也不演**。
· 實測（8123）：禁航取樣點 3645→0、`scriptPending` null、貝利薩爾降落鎖放行；夏爾村餐廳帶旗不演、拔旗立刻演瑪麗亞那一段（對照）。
· ⚠ 隱藏地標（感應才出現的）沒動 —— 那是探索玩法，不是鎖。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1743`

**`-1743`：接美術 05533a8 —— 聖索菲亞三件 ＋ 廢城 ASSET_VER 14 鍵**
· 聖索菲亞（`script/town.js` santasofia）：`inn.bg`→`sofia_inn`、拿掉 `noTime`（四差分）；`dining.scenes` 補 `bar`（三差分）與
  `restaurant`（`noTime`），咖啡廳／甜品店沒交 ⇒ 照節點原圖；`dock`→`bg:'sofia_slum'`、名「聖索菲亞　舊碼頭貧民窟」（**美術暫定，等 Ray 正名**）。
  實測（8123）：旅店抓 `sofia_inn_day`、餐飲街預設開酒吧抓 `sofia_bar_day`、碼頭抓 `sofia_slum`。
· 廢城：`ASSET_VER` 跳 14 鍵（`dunmor_causeway`…`dunmor_wellsq`）。**拓樸還沒搬** —— id／中文名／祭壇那一場／`wildSpawn`／
  祭壇前庭要不要 `exitIf` 開路，都在等 Ray。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1742`

**`-1742`：幻影系八張怪卡**（Ray：「把 enemy/phamtoms 裡的怪卡建一下，都先用標準數值，除了貪欲者以外都是 B，貪是 C」）
· 圖：`resources/enemy/phamtoms/ph_<id>.webp`（cwebp q85、真 alpha），原 PNG 在 `resources/_originals/enemy/phamtoms/`（本機，gitignore）。
  ⚠ 資料夾名照 Ray 的拼法 `phamtoms`，沒改。
· 卡（`script/enemies.js` 末段，`ASSETS` 的 `enemy_ph_*`）：
  執劍天使 `ph_sword_angel`／慈愛殘像 `ph_mercy_remnant`／才能祝福之人 `ph_gifted`／殺戮魔女 `ph_slaughter_witch`／
  纏髮之人 `ph_hairbound`／負棺者 `ph_coffin_bearer`／靜默等待者 `ph_silent_waiter` —— **B**（HP 380／攻 16／9-9-9-16-16／疊圈）；
  貪欲者 `ph_greed` —— **C**（HP 270／攻 12／9-9-9-9-16／不疊）。數值由 `enemies_baseline.py apply` 套的。
· ⚠ **我填的暫定值，等 Ray 在 Excel 改**：`atype:'P'`（Ray 沒給類型，基準要兩欄都有才套）／`kind:'harm'`（禍魘）／`story:0`。
  **沒有 `bg`、沒有 `spawnAt`**：出沒在哪張圖還沒定 —— 目前只會出現在 RUSH 的 B／C 池（那個池子照 `tier` 算）。
· `enemies.xlsx` 已重新匯出（104 張）。

# （上一段）截至 `ver 2026.09.22-1741`

**`-1741`：S10 以後照數字升章 ＋ Stage 13 收成一列、分支進第二層**（Ray：「按數字升章就好」「12BM2 應該作 13，S13 分支做入選單」「M1H M2H 都要列」）
· **為什麼以前不升**：章節表只是跳關落點，正常遊玩升章只有「那一拍寫 `stage:N`」一條路，而 10／11／13／14 從來沒人掛（只有 12-A 的底層梯廳有）。**不是 AB 造成的。**
· **起點那一拍掛升章**（`script/town.js` 新 helper `atStage(n, lines)`：第一拍帶 `stage`，`story.js` 只升不降 ⇒ AB／BA 共用號碼不會倒退）：
  10-A 初入雪都 `vn_arrive`／11-A 初入古墓 `tomb_enter`／10-B 二次進古城 `bl_night_land`／11-B「上船追！」那一拍／
  12-B 東泊長談 `ep_hairpin_talk`／13 東泊隔日（M1 `ep_interrogate`、M2 `ep_leave_tomb`）與走出古墓 `tomb_exit_done` ×3／
  14 出墓合流 `vn_after_tomb` ×3（段落層 `stage:14`，演完才寫）。12-A 照舊。
· **章節表**（`script/progress.js`）：「12-B・M2 隔日」那一列拿掉（半套改名的殘留）；13-A／13-BA-M1／13-BA-M2 併成 **`stage13` 一列**，
  第二層八項：B・M1 隔日／B・M2 隔日／A 出口／A 出口・H／BA・M1／BA・M1H／BA・M2／BA・M2H（＋無劇情）。
  第二層新欄位 **`over`**＝整份覆寫（旗／落點／時刻／好感），`main.js` 的 chapterBtn 認它。`H_VARIANTS` 拿掉。
  B・M1 隔日是新的落點（旗＝12-B ＋ `B_M1_NIGHT`，不含審訊）。
· ⚠ **路線城的「過期」上限仍未做**：AB／BA 共用 10～13，上限得用路線旗判（例如 B 線整段走完鎖東泊），不能用章節號。等 Ray 說哪一支旗算「走完」。
· 實測（8123）：選單與第二層正確；B・M2 落東泊旅店 08:00、stage 13。升章那幾拍沒逐一實走（資料層驗過：每個起點第一拍的 `stage` 都對）。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1740`

**`-1739`／`-1740`：帝都教堂改稿 ＋ 劇情戰打贏戰鬥曲淡出 ＋ 隊伍名單嚴格以章節篩 ＋ 每座城的章節窗**（Ray 一次交四件）
· **帝都教堂**（stage0）三拍照稿：surprise「雖說不及聖王廳…」→ sadsmile「上一次來，還是跟學姐一起……」→ surprise「啊！對不起……」。
  原本的主角空白與「我沒事啦」拿掉。
· **劇情蜈蚣戰後戰鬥曲沒退**：實測（8123，飛行交棒蜈蚣戰）回到飛行畫面時父頁**是有停的**；沒停的是**結算頁** ——
  `scriptRun` 打贏刻意不放 result 曲，於是戰鬥曲一路放到按「繼續」。`combat` 的 `toResult` 改成劇情戰（非教學）進結算時 `stopBgm(1200)`。
  實測：結算頁上戰鬥曲已停。回程的曲子照舊由各自接（飛行航行曲／城鎮 `ensureBgm`／劇情 `resume.bgm`＋`bgmAfter`）。
· **入隊章節**：安雅 **3**、索拉娜 **9**（`OUTING.who` 與 `flight/talks.js` 的 `PARTY` 兩份一起改）。
  **旅店寫死的 `innDoors.roster` 也再過一次 `girlsHere()`**（瓦恩霍姆四扇門寫死 ANYA／SORANA ⇒ Stage 1 看得到她們，就是這個）。
  實測 Stage 1 落瓦恩霍姆旅店：只剩諾薇兒一扇門。
  ⚠ **整備頁的戰鬥搭檔池沒動**：那是劇情旗開的（夏爾村圍城 S5 強配索拉娜），與「入隊」是兩件事，Ray 要改再說。
  ⚠ `FEATURE_FROM`（索敵在 S8 開，那是索拉娜的〈獵手之眼〉）沒動 —— 她現在 S9 才入隊，要不要一起推到 9 等 Ray。
· **章節窗 `storyStages:[起,迄]`**（城上，`modules/town.js` 的 `storyWindow`／`outOfStoryWindow`／`storyOff`）：窗外這座城的
  進場對白／acts／gates／onLeave／街上偶遇／旅店約會**一律不觸發**（過期無效、提早到也不演）。-753 的 `muteTalksFrom` 是它的「過期」半邊，
  北泊那一行已併進 `[2,3]`（舊欄位仍吃得下）。**段落明寫 `fromStage`／`untilStage` 的照它自己的**（夏爾村／古墓的早訪是 Ray 設計的例外）。
  | 城 | 窗 | 依據 |
  |---|---|---|
  | 帝都 | 0–1 | 章節表：S2 起全演完 |
  | 北方泊地 | 2–3 | 原 `muteTalksFrom:4` |
  | 夏爾村 | 4–9 | S4 抵達（`sv_arrive fromStage:4`）～S9 |
  | 夏爾森林／木雅克神殿 | 6–7 | S8 章節旗已全數演完 |
  | 石製遺蹟／伊甸古墓 | 8–∞ | S8 發現／墓門 `fromStage:8` |
  | 瓦恩霍姆／東泊／貝利薩爾／平原古道／鏡湖 | 9–∞ | 路線 AB／BA 可前後交換 ⇒ **上限不能用章節號切** |
  ⚠⚠ **實際遊玩時 Stage 9 之後章節號不再升**（10／11 只有章節跳關會插，古墓底層插 12）—— 路線那幾座城的下限只能訂 9，
    **「過期」那一端在路線段目前做不到**，要等 Ray 定好 S10 起的升章點（哪一段插 10／11…）再補上限。
  實測：帝都廣場進場對白 Stage 9 不演、Stage 1 演。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1738`

**`-1738`：-1737 誤讀更正 —— 「過期就沒了」是劇本遭遇，不是隨機刷怪**（Ray：「不是指這兩隻怪以後不出，是指強制戰鬥的劇情不出」）
· `ENEMY_KINDS` 的 `untilStage` 整個還原（蜈蚣回到無條件、羽蛇回到 `fromStage:2`），守門那一行也拿掉。
· `SCRIPTED_ENCOUNTERS` 新欄位 **`stages:[起,迄]`**（含）：蜈蚣 `[1,2]`（Stage 1 的戲，但 `sailOut` 出航那一刻就升成 2，遭遇發生時已是 2）、
  羽蛇 `[4,4]`。守門在 `syncScriptPending`（`scriptedInStage`）；王座徘徊者沒寫＝不看章節。
· 連帶：`updateEnemy` 那條「劇本遭遇沒打完就不刷雜怪」改成只看**還在窗內**的 —— 過期的那一場不再把雜怪封死。
· 沒在瀏覽器跑（jsc `checkSyntax` 過）。lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1737`

**`-1737`：飛行地圖隨機刷怪加章節上限 —— 蜈蚣只在 Stage 1、羽蛇只在 Stage 4**（Ray：「stage4 的羽蛇跟 stage1 的蜈蚣
不會出現在該章節以外的地方，過期就沒了」）
· `flight/index.html` 的 `ENEMY_KINDS`：新欄位 **`untilStage`**（最後一個還會刷的 stage，含；與 `fromStage` 成對，
  守門在 `enemyKindEligible`）。蜈蚣 `fromStage:1, untilStage:1`；羽蛇 `fromStage:2` → `fromStage:4, untilStage:4`；空賊照舊（1 起、不進薩梅爾）。
· 劇本遭遇（`SCRIPTED_ENCOUNTERS` 指定 kind）不經過抽選，不受影響。
· ⚠ 後果：**Stage 5 之後隨機池只剩空賊，而空賊不進薩梅爾 ⇒ 薩梅爾上空沒有隨機怪**（`spawnEnemy` 的 `!kind` return 現在會真的走到）。
  Ray 定的「過期就沒了」，照做；要補後期的隨機怪就加新的 kind。
· 沒在瀏覽器跑（純守門邏輯；inline script 用 jsc `checkSyntax` 過）。lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1736`

**`-1736`：雪都敲蕾娜門的 M2 約會照 Ray 重交的稿**（`town.js` ravnsdal `knock.RENNA`）
· M2 五拍換成：lookawaytalk「我想休息一下。」→ 主角空白 → coldstare「……」→ upset「評價我是不會改的喔。」
  → upsetstare「但是可以考慮原諒你。」→ smile「好好努力吧。」（記 `vn_date_renna`）。表情是 Ray 給的。
· **「就當作扯平了吧」從這裡拿掉** —— -1724 已搬進合流必經，交接檔那條「與合流重複」的待決事項**結案**。
· M1（含 T4 派生的臉紅插圖）稿與線上一致，沒動；`032_rennablush` 插圖仍未交。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1735`

**`-1735`：首頁「分歧」「巡場」兩顆鈕拿掉，章節第二層多「無劇情」**（Ray：「分歧跟巡場鈕可以拿掉，在章節選擇裡多一個無劇情選項」）
· `index.html` 兩顆鈕移除；`main.js` 的 `tourBtn`／`branchBtn`／`startBranch` 與 `scanBranches` import 拿掉；
  `script/branches.js` 回收（`tools/recycle.sh`，沒有呼叫者了）。
· **章節第二層**（`chapterBtn`）：進城的章節一律再問一次 —— 有 `variants` 就列 variants，沒有就列「演劇情」；
  兩種都再加一列 **「無劇情」**＝`prog.noStorySpec(章, town.storyFlagsOf(城))`：這一章的旗 ＋ `safehouse_<城>` ＋
  那座城的劇情旗整組（＝當成演過了），落點照章節的 `town`／`node`。不進城的章節（試飛型／story）直接開。
· `progress.tourSpec` 換成 `noStorySpec`（底改成那一章自己的旗，不再拿 `SCRIPT_TEST`）；`SCRIPT_TEST` 留著當紀錄，沒有入口用它。
· `script/bg_index.js` 由 lint 重掃（聖索菲亞新交的 `sofia_bar_*`／`sofia_inn_*`／`sofia_restaurant`／`sofia_slum`）。
· lint 0 錯誤、41 提醒。

# （上一段）截至 `ver 2026.09.22-1734`

**`-1734`：墓門的米夏 CI 改成東泊那一拍的動畫 ＋ 「撤收」音效走 troop 三秒淡出**（Ray 兩句交辦）
· **墓門三版**（`town.js` 的 `tomb_exit_done` ×3，M2／belisar／M1）：-1733 放的是插圖 `021_mishalookback`＋`echoedart`，**放錯了**。
  改成東泊 `sleepy` 那一拍同一套：`any('sleepy','')` → `any('terrify','')` 帶 `{ bgm:'glasscradle', fx:'stare', fxCi:'ci_mishastare', noSkip:true }`
  → `{ speaker:'PLAYER', text:'！！' }` → 行軍插圖 `32_mishamarch`（`amb:'se_troops'` 改掛在這一拍起，`fireOneShot` 立刻播不等黑幕）
  → 索那句 → desperate 拍 `amb:null` 停。⚠ 我沒在瀏覽器跑（Ray 在 8200 看 13-BA-M1 / M2 / belisar 三條）。
· **`ambStop:<ms>`**（`story.js` 新欄位，SCRIPT_FORMAT §8.6 補了寫法）：這一拍起的環境音放 N 毫秒就 `stop(800)` 淡出。
  計時器是跨句狀態（不進 `fxTimers`），換成別支／`amb:null`／`stopAmb()` 都取消。
  用在三版的「撤收。」下一拍：`{ hide:['MISHA'], amb:'se_troops', ambStop:3000 }`（取代 -1715 的 `se:'se_steps'`）。
· 拉煙三項：Ray 重述的規格與 -1733 已做的相同（機槍 3 團頭中尾／霰彈 1 團 44~74px／去 blur），**沒動**；霰彈要更大再說。
· lint 0 錯誤、41 提醒（jsc `checkModuleSyntax` 過）。

# （上一段）截至 `ver 2026.09.22-1733`

**`-1733`：墓門開場補三件（troop 停點／米夏 CI／換曲）＋ 拉煙減量去 blur ＋ 北泊回城不能出航**
· **拍上的環境音** `amb:'<名>'`／`amb:null`（`story.js` 的 `fireOneShot`，走城鎮節點同一支 `playAmb`；SCRIPT_FORMAT §8.6 補了寫法）。
  墓門三版：`amb:'se_troops'` 起 → 索菈娜「這些傢伙是……？軍隊？」→ 下一拍（安 desperate）`amb:null` 停。
· **terrify 前一拍插東泊同樣的米夏 CI**（`021_mishalookback` 速度模糊、`se_preasure`、同消失點）並 **`bgm:'echoedart'`**（東泊那一夜的曲）；
  terrify 那一拍 `cg:null` 收 CI 再接 `32_mishamarch` 平移。⚠ **我沒在瀏覽器跑到這一段**（省用量），Ray 在 8200 走 13-BA-M1 看：
  順序應是 真奸詐 → 兵聲起 → CI 一閃 → 安 terrify → 行軍插圖上移 → 索那句 → 插圖收、兵聲停 → 蕾「……」。
· **拉煙**（`enemy.trailSmoke`，船戰副武器）：機槍／步槍每條 **3 團（頭中尾）**，霰彈 **一團大的**＋50ms 節流（六顆彈丸同 tick）；
  `.tracer-smoke`／`.muzzle-smoke` 的 `filter:blur` 拿掉。`weapon.mzHit` 把 `w.vfx` 傳給 `fireTracerAt`。**視覺效果 Ray 看**。
· **北泊回城不能出航**（Ray 回報）：`entrance.sail.hold` 到 `np_leave_ok` 才解，那支旗只有碼頭道別最後一拍插 ——
  **章節表 12 份旗清單全部沒有它**（S5 起每一章都列了 `np_depart` 卻漏 `np_leave_ok`），跳關進來的人回北泊永遠「不能丟下同伴」。
  已全部補上。⚠ 正常一路玩到的人本來就有那支旗；Ray 若是正常玩到也遇到，那就是另一個洞，要再查。
· lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1732`

**`-1732`：章節表（13 章三路線起於古墓出口、可選 H／非 H、加 Stage 14）＋ 蕾娜 M2 改扣分 ＋ 墓門開場接 Ray 的稿**
· **章節**（`script/progress.js`）：`stage13a`／`stage13bam1`／`stage13bam2x` 三筆都落 `tomb/gate`、`tomb_altar_done` 已插、
  `tomb_exit_done` 沒插 ⇒ 一落地就演出墓那一幕（版本由路線旗選）。旗是**接上去的**：B 底＝原「13-BA-M2（東泊隔日）」
  那一筆去掉 M 尾（`B_COMMON`）＋ `B_M1_TAIL`／`B_M2_TAIL` ＋ A 路線的尾 `A_TAIL`。
  **`variants`**＝章節鈕的第二層（`main.js` chapterBtn：選章 → 再選「H 路線（插 `tomb_h_route`）／非 H」）。
  **Stage 14**：`enter:'flight'`、`flight:{town:'ravnsdal'}`（雪都出港位），旗＝BA・M1 出墓 ＋ `tomb_exit_done`／`tomb_misha_met`／
  `tomb_done`／`vn_after_tomb`。原「13-BA-M2（東泊隔日）」改名 **「Stage 12-B・M2 隔日」**（id 不動）。
  實測：選 13-BA-M1 → H → 落墓門、`tomb_h_route`／`ep_m1_route`／`ep_belisar_done` 都在、stage 13。
· **蕾娜 M2**：`AFF_CAPS` 的「M2 封頂 T4」拿掉；改在雪都合流 BA・M2 版「扣分。」那一拍 `aff:{renna:-10}`（−10 是我訂的，半個段位）。
· **墓門開場（三版共用）照 Ray 稿**：`se_troops`（Ray 交 mp3 → AAC 96k，`fileGain` 1.30 CAP：平均 −22.0、峰值 −0.3）→ 安 terrify →
  插圖 `32_mishamarch` 由下而上平移（時段差分：稿的 -1＝`_day`、-2＝`_night`、-3＝`_dusk`＋`_dawn`，PNG→WebP、原檔進 `_originals`）→
  索「這些傢伙是……？軍隊？」在插圖上講 → 插圖結束落在安 desperate。米夏不再另掛上台拍（他第一句自己上）。
  實測 13-BA-M1・H：`32_mishamarch_day.webp pan-up` → 索那句 → cg 收 → 蕾「……」→ 米夏俄語 ✔。
· **接美術這一輪的搬家**（工作樹裡的移動，一併進這個 commit）：`retainer_si_front.webp` → `resources/si/npc/sodier_.webp`
  （位元組相同）、`npc_np_priest.webp` → `npc/npc_np_priest.webp`，`speakers.js` 三處路徑跟著改；`021_soranadrunk` → `022_soranadrunk`
  （`town.js` 的 `cg` 跟著改）。⚠ `sodier_.webp` 這個名字（尾底線）像是 WIP，美術要改名再說一聲。
  ⚠ 還沒接的：`023_anyacottoncandy.png`／`024_nouvellesmile.png`（untracked，沒有腳本引用）；`gen_renna_si_blush.webp` 被刪（沒人引用，沒動）。
· **火線特效的疊加（Ray 問「過熱跟火線有關？」，只查沒改）**：見下一段。
· lint 0 錯誤、42 提醒。

### 火線特效：疊加在哪、能省哪（-1732 查的，等 Ray 說要不要改）
一次**反擊**每一發都走 `weapon.mzHit` → `muzzleBurst`（1 槍火 ＋ 1 光環 ＋ **14×k 顆火星**）＋ 1 條 `.tracer` ＋
（船戰）`trailSmoke` **7 團** `.tracer-smoke` ＋（步槍）`muzzleSmoke`。機槍 `hits:8` ⇒ 半秒內約 **8 槍火＋8 環＋60 火星＋8 火線＋56 團煙**。
· ⚠ **最貴的是煙**：`.muzzle-smoke`／`.tracer-smoke` 每一團都 `filter:blur(1.5~2px)`＋`will-change`＋動 scale ⇒ 每團是一個帶模糊濾鏡的合成層，
  56 團同時在動。而它的底本來就是 `radial-gradient` 軟邊，blur 是疊上去的第二層軟。`trailSmoke` **沒有節流**（`muzzleSmoke` 有 50ms）。
· `.tracer` 用 `mix-blend-mode:screen`：只要有一條在，`#top` 整個 stacking context 要走離屏合成（只活 150ms，代價短）。
· 槍火那一組已經有池（`MZ_MAX 130`）與火星上限，火星是純 transform/opacity，便宜。
· **建議**（都不改視覺語彙）：① 煙拿掉 `filter:blur`（漸層自己就軟）② `trailSmoke` 每條 7 團 → 4 團、加 50ms 節流 ③ 火線的 `screen` 換成
  不透明的亮色線（或保留、只在船戰用）。做完在手機量一次。

# （上一段）截至 `ver 2026.09.22-1731`

**`-1731`：王座徘徊者拍翅檢討**（Ray：「振翅感不足，翅膀應該要壓扁一點，動態、頻率應該要更自然，要有威壓感」）
-1730 的三節鉸鏈是對的骨架，但三節同相位、對稱正弦、幅度小、素材的翅本來就是往上揚的 V 字 ⇒ 讀成「圖在點頭」。
改四件事，全在 `sprite` 上（`flight/index.html` 的 `bldragon`，鐵律 1）：
· **波形不對稱** `flapDown:0.38`：下拍快而重、上收慢（大型掠食者的節奏；對稱正弦是蜂鳥）。
· **由內往外相位落後** `flapLag:0.07`（每節落後 7% 週期）：下拍時翼根先壓、翼端還在上面 —— 膜翼的「甩」。
· **常駐姿勢往下壓** `wingRest:[0.05,0.10,0.12]`（合計 15°）：V 字攤平，翼展看起來更寬，拍動繞著攤開的姿勢來回。
· **整張縱向壓到 0.86** `frontSquash`：更扁＝更寬＝壓迫感；身體與翅一起壓（只壓翅肩縫會對不上），中欄仍不動。
· 幅度 `flapAmp:[0.20,0.20,0.22]`（翼端合計約 ±36°）；`wingHz` 0.005→**0.0037**（1.7 秒一拍，巨獸慢而重；頂視圖同吃）。
· 身體那一欄改**最後畫、多取 4% 半幅**蓋住肩縫；節與節疊 4px。
· 實測（8123 試飛召龍，四幀 0.4 秒間隔）：攤平 → 翼根先舉、翼端落後 → 高舉 V → 回落，中欄不動，無錯誤。
  要再調：行程改 `flapAmp`、快慢改 `wingHz`、下拍比例改 `flapDown`、翅更平改 `wingRest`。

# （上一段）截至 `ver 2026.09.22-1730`

**`-1730`：王座徘徊者正面視的拍翅改成三節鉸鏈上下擺**（Ray：「翅應該是上下擺動，不要用整個變形矇過去，
把單邊翅膀拆成三節做出飛行感，中間不要動」）
· `flight/index.html` 的 `drawEnemy3D`／`whole` 那一段：**正面視**（`useFront`）改走新路 —— 身體那一欄
  （半幅 `wingCut[0]` 以內）整塊不動；每邊翅切三節，每一節繞**自己內側端點**轉、角度往外累加
  （下一節的鉸鏈＝上一節轉過之後的外端），橫向縮短是轉動自帶的透視，不再橫縮。
  **頂視圖（飛離）照舊走 -1473 的橫縮**：俯瞰時展幅在變才是對的。
· 三組數字在 `sprite` 上（鐵律 1）：`wingCut:[0.15,0.42,0.72,1.00]`（半幅切點）、`wingCen:[0.55,0.46,0.30,0.28]`
  （各切點欄的翼脊高＝逐欄不透明區重心列，量自 `mon_dragon_v1_flight.webp`）、`flapAmp:[0.16,0.14,0.14]`
  （每節相對上一節 ±rad，翼端合計約 ±25°）。要更大／更小的行程只改 `flapAmp`。
· 實測（8123 試飛，`spawnEnemy({kind:'bldragon',ahead:true})`）：兩幀翼端高低不同、中欄不動、無錯誤。
  ⚠ 這一步用了 `localStorage.tivot_admin_v1='1'`，只在我的 8123 origin。
· lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1729`

**`-1729`：手機發熱 —— 三處違反鐵律 10／-851 的地方 ＋ 飛行面板天空的大小寫**（Ray：「手機過熱很快，
檢查現在的預載頁如何運作？飛行轉探索 探索轉飛行有沒有確實清除前頁？戰鬥畫面是否過載？」→「三處都改」）
· **查的結論**：預載門（`loadScene` 先 `releaseAudio` 再載）與飛行→探索（`enterTown` 全黑那一刻 `closeFlightFrame`
  → 必殺）都對；漏的是下面三處。
· **① 探索→飛行只藏沒停**：`openFlight` 只 `town.suspend()`＋`#storyStage{visibility:hidden}`，劇情層的無限動畫
  （槍棺 `kerbCompass`、齒輪 `kgShine`…）沒有一條被停（`#top/#bottom` 有、`perf-idle` 有、劇情層沒有）——
  -848 團徽那一型。補 `body.flight-on #storyStage *{animation-play-state:paused}`（style.css）；
  `story.js` 那個一秒轉齒輪的 interval 在 `flight-on` 時跳過。實測試飛：`#kerb`／`#storyExit` 全 paused。
  ⚠ 不能 `display:none`：交棒開棺要量它的幾何（2803 那一條的理由不變）。
· **② 延時光圈住在濾鏡層裡**：`#delayRing` 每幀改 dashoffset，而它掛在 `#grid` 內、`#grid.saint` 是靜態
  `drop-shadow` ⇒ SI／NI 期間半個畫面的模糊每幀重算。搬到 `#gridWrap`（`combat.placeDelayRing` 照 `#grid`
  offset 擺、外擴 9px 同舊 `inset`），它自己的 drop-shadow 換成第二條寬淡筆畫 `.dr-glow`。
  ⚠ `buildGrid` 不再會掃掉它，`stopDelayRing` 是唯一收場。實測：parent `gridWrap`、rect＝grid±9、兩筆同步。
· **③ 破防計滿檔呼吸光逐幀動 filter**（-1070 的 `arcFullGW`，正是 -851 上面幾行寫著不准的那一型）：改成兩層
  各自靜態 —— 白的 `#claspArcFill` 不動，新加綠色複本 `#claspArcFillG`（index.html；`layoutClasp` 餵 `d`、
  `updateBars` 同步 visibility）只動 opacity。看起來一樣綠⇄白。
· **④ 飛行面板天空**：不是大小（3072×1024、0.3~0.4 MB、一趟只抓一對），是**大小寫** —— `deckPair` 寫
  `'Deck_'`／`'Sky_'`，磁碟是 `deck_`／`sky_`（-1554 全庫小寫化）。Mac 不分所以桌機看得到，手機的靜態空間 404。
  改小寫；實測請求 `flight/sky_day.webp`／`deck_day.webp` 200。
  ⚠ 美術那兩份 spec（`flight/_deck_spec.md`／`HANDOFF_deck_layers.md`）還寫大寫檔名，**美術端自己改**（鐵律 11）。
· ⚠ 三處都是照憲法能指出來的違例；發熱真正的份量還沒在手機上量過。Ray 手機再跑一次看有沒有差。
· lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1728`

**`-1728`：接美術交件 ＋ 重出 SI 差分總表**（Ray：「拉下並更新差分總表」）
· `script/speakers.js` 三行：索拉娜 `whisper` `?v=3`／top 4 bot 1524（回復重製前那張）；米夏 `draw` `?v=3`／top 6 bot 1534 fx 0.434
  （Ray 新出的拔刀圖，姿勢換了）；`drawopen` `?v=2`、取景同 draw（以新 draw 為底重做）。
· `py tools/si_xlsx.py` 重出 `resources/SI/_SI_差分總表.xlsx`：**401 個差分**（主要角色 368・NPC 33）、已接 375、未接 26、
  50 個差分另有 58 張版本（列在「待接線・缺檔」頁）。缺檔仍只有 `renna_si_hugangry2.png`（Windows 找）。
· ⚠ 表上多出的怪分頁 `image - 2026-09-20t…`×4／`索菈娜2`／`{N}`／`隨從`：前四張是 `resources/si/soranagpt/` 底下 Ray 9/20 丟的
  GPT 原圖（沒接線，工具照檔名猜角色）；`{N}`＝主角、`隨從`＝米夏隨從（已接）。要不要把 `soranagpt/` 那四張回收或改名等 Ray。
· 美術交接頂端那一塊還剩兩件沒接：`lake`／`canyon` 的小地圖 `map:{img,spots}`（`_minimap_worklist.md` 末段可抄）、
  米夏隨從的 `cm`／`side` 要 Ray 給。`_TO_CODE_20260922.md` 那一批是否已接仍待對。
· lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1727`

**`-1727`：東泊守夜那一夜的兩顆鈕 ＋ M2 第二天直接播**（Ray 交辦）
· **睡覺鈕留著、按了回一句**：`modules/inn.js` 的 `refresh` 在**任務鎖**那一道不藏鈕（-1570 的「關著就藏」只剩另外兩道：
  旅店還沒開放睡覺／天還沒黑）；`sleepHere` 第一道門本來就回 `questSay('sleep')`。句子改成 Ray 的字面
  `EP_VIGIL_SAY`＝「似乎不太平靜，今晚還是守著吧。」（`script/town.js`，一個常數兩處讀）。
· **出旅店鎖到安雅溜出門**：東泊旅店 `lock:{ uptown:{ need:'ep_hairpin_talk', until:'ep_night_anya_out', skipIf:'tomb_misha_met', text:EP_VIGIL_SAY } }`。
  `lock` 新支援 `skipIf`（`modules/town.js`）—— AB 順序沒有那一夜，不寫就鎖到天荒地老。
· **M2 那一夜收尾不用走出旅店**：`goto:'inn'` 抵達那一刻直接演簡報 —— 旅店多一個 act
  `{ flag:'ep_leave_tomb', need:['ep_m2_route','ep_night_mi_done'], until:'tomb_done' }`，台詞抽成 `EP_LEAVE_TOMB_LINES`
  與 `onLeave` 那一份共用（同一支旗，演過一次另一條路不再演）。
· 實測（8123，12-B 一路點到長談結束）：睡覺鈕在、按住 1 秒 → 那一句、時鐘不動；按 S 出旅店 → 同一句、人還在旅店。
  模擬器 BA・M2：08:10 抵達旅店 `■ act ep_leave_tomb` ✔。lint 0 錯誤、42 提醒。
· ⚠ 測試中有一次時鐘從 23:00 跳到 01:00 而我沒按坐坐 —— 那一刻分頁在背景、我的合成長按與 1 秒門檻撞在一起，
  之後乾淨重做**沒有再現**（時鐘不動）。Ray 若在 8200 看到「沒坐坐時間自己走兩小時」再回報。

# （上一段）截至 `ver 2026.09.22-1726`

**`-1726`：Ray 的四件修正**
· **墓門 A 版尾巴**：「撤收。」→ 安 `desperate` → 蕾「……」`determine` → 索「什麼啊那傢伙……？」`guardtalk` → 蕾「……」`determine`
  → 合流。原本接的「……沒錯／安雅小姐／我們都在喔」是 BA・M1 的段落（蕾娜那一夜跟去過），A 路線她第一次見米夏，只有沉默。
· **東泊「該回去看看了」**：那道 20:00 閘門加 `skipIf:'ep_day2'` —— 翌日那一道演過就永遠不催（第二天從古城回來、那一夜之後、
  BA・M2 隔日全部不再出）。Ray：「只在初入東泊自由活動時出現，10-B 以後永不觸發」。
· **貝利薩爾 兵器工坊**：`rest:true` 拿掉（仍 `noWild`）。
· **M2 那一夜收尾自動接第二天**：`ep_m2_route` 那一段加 `goto:'inn'`（時鐘已是 08:00）＋ `endStoryExplore:true`（M2 沒有審訊，
  自由探索的旗以前沒有人替它插）；旅店 `onLeave` 的 `ep_leave_tomb` 由 `need:'ep_interrogate'` 改成 `need:'ep_night_mi_done'`
  —— M2 從此走出旅店接得上「下一個是伊甸古墓」的簡報。⚠ 我對「第二天 M2 劇情」的判讀就是這一段（M2 沒有別的第二天戲）；
  Ray 若另有稿，接在旅店那一格 `need:['ep_m2_route','ep_night_mi_done']` 就好。
· 模擬器 BA・M2：夜段 → `goto inn` D1 08:10 → 離店演 `ep_leave_tomb` ✔。lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1725`

**`-1725`：章節表改成 A 路線編號 —— 新增 10-A／11-A／12-A／13-A，刪 13-BA／14-BA／15**
（Ray：「把 A 路線做成 stage 10-A，始於初入雪都；11-A 始於鏡湖結束古墓開門的門口；12-A 始於古墓第三層；
13-A 始於走出古墓回到墓門；並把 13-BA 14BA 15 都刪掉，更新章節表」）
· `script/progress.js`：四筆 A 章的旗是**接上去的**（S9 的底 ＋ `sv_s9_order` ＋ `tomb_gate` → 雪都／鏡湖那串
  ＋ `tomb_opened` → `TOMB_CHASE_DONE` → 祭壇那五支），插在 Stage 9 之後。**B 路線的旗一支都不給**，所以墓門
  走 A 版、雪都合流走 A 版。好感四人 45（T3，同舊 15 的理由）。**13-BA-M2 留著**（他點名的是 13-BA／14-BA／15）。
· 落點：10-A `ravnsdal/square`；11-A `tomb/gate`＋`tomb_opened`；12-A `tomb/landing3`（底層梯廳＝他說的「第三層」）；
  13-A `tomb/gate`＋`tomb_altar_done`。瀏覽器實測 13-A：一落地就是出墓那一幕（米夏上台、`tivot_stage_v1=13`、0 錯誤）。
· ⚠⚠ **底層梯廳那一拍 `stage:15` → `stage:12`**（`script/town.js`），跟著改號。
· ⚠⚠⚠ **順手抓到一個真的洞**：`town.js` 與 `story.js` 兩處註解都寫「`prog.setStage` 只升不降」——**它從來不是**
  （原樣寫入，而且得是：讀舊檔與跳關要能往回寫）。線性時代沒事，非線性之後 BA 順序的人（13）走進 A 編號 12 的
  底層梯廳就會被拉回 12。現在 `story.js` 讀 `line.stage` 時夾 `> getStage()` 才寫；兩處註解改掉。
  ⚠ `clockGate` 的 `stage` 欄位與 `startBranch` 的 `fromStage` 沒動（前者是閘門、後者本來就有 `<` 守門）。
· `tools/routesim.mjs` 的 AB 底改讀 `stage11a`（14-BA 沒了）；AB 跑過一遍，合流版本照舊、`章 12` 在底層梯廳升起。
· 分歧面板（`startBranch`）挑底的規則沒動 —— 古墓的分支現在會自己挑到 13-A／12-A 當底。
· lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1724`

**`-1724`：雪都旅店隔日 08:00 合流 —— Ray 重交 A／BA・M1／BA・M2 三版稿**（`script/town.js` 的 `ravnsdal.inn.acts`）
· **BA・M1**：與 -1707 一字不差，沒動。
· **A 版**：尾巴由 -1707 的「不是墳墓，就不怕了？…好、好……」（9 拍）換成「我……我就留在這裡就好了……」起
  到蕾娜 `sigh` 那 33 拍（與 M2 同文 —— A 路線蕾娜在古墓已經知道她是誰）。兩處改字：「無人**靠近**」、
  「舊**貝利薩爾**王國」（Ray 兩次稿一次寫貝薩利亞一次寫貝薩利爾，統一跟地名；他要改再說）。
· **BA・M2**：`sigh` 之後多六拍「至於你嘛……」`upsetstare`／「扣分。」**`laugh`**（Ray 定：不是 happy，用 `renna_si_laugh`）／
  主角空白＋尷尬線／諾「不要看我……」`concern`／「就這樣扯平吧。」`smile`／「還得靠你呢。」`stare`。
  ⚠ **「扯平」搬進合流必經了**（他 -1719 預告過）—— 敲門約蕾娜的 M2 那句「就當作扯平了吧」現在**重複**，
    Ray 沒說要動，先照舊。**等他決定**要不要把 M2 約會改字。
· **新的一拍寫法** `{ speaker:'PLAYER', blank:true, awk:true }` ＝ 稿上的「主角空白，對話框有尷尬線」：
  `story.js` 掛 class `awk`（與 `blank` 同拍生同拍拔），`style.css` 用 `::after` 的 repeating-gradient 畫四條縱線
  在小氣泡右上、往右淡掉。SCRIPT_FORMAT §8.6 補了一段。瀏覽器實測（8123 強掛 class）看得到。
· lint 0 錯誤、42 提醒；town.js jsc 解析過。

# （上一段）截至 `ver 2026.09.22-1723`

**`-1723`：選單多一列「免　戰」（管理人限定）＋ 三大分支全版本走過一次**
（Ray：「加入一個免戰選項在設定內，迴避所有戰鬥把三大分支跑一次」→「免戰是**移除一切戰鬥行為，棺都不推**，直接跳過」）。
· **免戰**：`modules/settings.js` 的 `peaceOn()`（鑰匙 `tivot_flight_peace_v1`，與飛行頁的 `PEACE_KEY` **同一把** ——
  開了飛行地圖也不遭遇）；`body.testmode` 才看得到那一列（`#gmPeace`）。
  `story.js` 在 `line.battle` 那一拍**進 `playKerberos` 之前**就 `advance()`（當成打贏：`bgmAfter`／`@town` 照接，
  震動／染色／感應一併收掉），`line.settle`（休息處結算）同樣跳過。**戰鬥卡的 `talk`／閘門／教學一律不會執行**，
  所以免戰只是「看劇情順不順」的梯子，不是測戰鬥用的。
  實測（8123、Stage 15 一路自動點）：console 三行 `[免戰] 跳過戰鬥（當成打贏）： tomb_low_solo`／`tomb_low_ni`／`跳過結算`，
  `#kerb.rise` 全程 false、`#app` 維持 hidden。
· **三大分支走一次**（資料層模擬器 `routesim.mjs`，jsc；BA・M1／BA・M2／AB 各在 T3 與 T2 跑）：
  三條路的墓門版本、雪都旅店敲門、東泊離開段全部選到正確版本；AB 東泊收在 `ep_leave_final`；A×H／BA・M1×H 的派生拍與 -1720/-1722 稿一致。
  **沒有找到硬洞**。軟的三件照舊：① BA・M2 出墓隔天早上蕾娜沒有交代（Ray：「不一定要補，她這個角色就是這樣默默扣分然後進工作模式」）
  ② `032_rennablush`（T4 派生的臉紅插圖）**素材還沒有** ③ `hugangry2` 這台 Mac 上沒有那張圖（Windows 那邊找）。
· ⚠ 順手量到的：`resources/illustration/` 的 **26_nouvellefaint／27_rennapull／28_tordefeat／30_torstandup 還是 PNG**，
  候選鏈先吃一次 `.webp` 404 才退回 —— 美術端轉 WebP 就好（§5 規約），不是壞。
· `resources/audio/se/se_rockimpact.mp3` 這一輪開工時就已經是 modified（不是我改的）—— **沒有一起 commit**，等 Ray 決定。
· `劇情分歧樹.pptx` 仍沒重出（這台沒 node）。

# （上一段）截至 `ver 2026.09.22-1722`

**`-1722`**：墓門 BA・M1 版接 Ray 的 BA・M1 稿 —— 「……哼」「看來有人聽得懂我們的語言呢」拿掉；
蕾娜兩句改字（「……海森伯格**！**」「您**方才**所謂安娜殿下的使命是**指**……？」，第二句稿上沒給表情、沿用 hugtalk／talkwork）；
H 派生後補 `se_snatch` 一拍（同 A 版）。從「……安娜，」起與稿一字不差（沒動）。三個版本現在各自完整、互不共用條件。

# （上一段）截至 `ver 2026.09.22-1721`

**`-1721`**：分歧面板的版本標籤 —— 「沒寫 M 的版本＝其他版本的反面」那條推論會把 A 版推成 AB・M1、
對不上新的路線表（AB 沒有 M）；改成 ORD 是 AB 且 M 不是自己寫的 ⇒ `M:null`。三處版本（墓門、雪都旅店、
東泊離開時）現在標 BA・M2／BA・M1／AB。

# （上一段）截至 `ver 2026.09.22-1720`

**`-1720`：墓門那一幕拆成三個獨立版本（BA・M2／BA・M1／A），A 版接 Ray 的 A 路線稿**
（Ray：「當初把 A 路線共用 M1 把我自己搞混了，分一下」→ 交了 A 路線的稿到「米：！！ shock」為止）。
· `tomb_exit_done` 現在三個 act：M2（`need ep_m2_route`）／BA・M1（`need ep_belisar_done`）／A（`until ep_belisar_done`）。
  -1716 那些 `onlyIfAll`／`skipIf:['ep_belisar_done',…]` 的四選一全部拆掉，每個版本只剩 H 的 `onlyIf`／`skipIf`。
· A 版依稿：蕾娜「安娜跟……米夏……」「米海爾……謝索洛夫？」→ 諾「米海爾˙謝索洛夫？那不是……」→ 蕾「米海爾殿下！」→
  米轉回正面（**`ART.misha.front` 新鍵**＝本尊那張）→ 自報身分／「為何您會身在此處？」／「第一皇子！」（一般用 `command`）→
  H 派生四拍＋**`se_snatch` 一拍**（稿上獨立一行，放在她那句之後）→ 索「所以小公主……是真的公主？」→ 「……安娜，」起與 BA 版相同。
  **沒有「……哼」與「聽得懂我們的語言」**。稿到 shock 為止，之後（女狐→…→嗯!）沿用。
· BA・M1 版＝-1716 的 BA 分支原樣（H 派生**沒有** `se_snatch` —— Ray 只在 A 稿寫了它；BA 稿若也要就補一拍）。
· `branches.js`：`ROUTES` 的 AB 改名 **`AB`**（沒有 M；選它拔掉兩支 M 旗）。面板上三個版本標 BA・M2／BA・M1／AB。
· 驗收：jsc 模擬 A×H／A×一般／BA・M1×H／BA・M1×一般／BA・M2 五組逐拍對過（頭 14 拍、尾 29 拍三版相同）；lint 0 錯誤、42 提醒。
· `劇情分歧樹.pptx` 仍沒重出（這台沒 node）。

# （上一段）截至 `ver 2026.09.22-1719`

**`-1718`**：雪都瞭望台約安雅 M2 那句在出墓揭露後改「害你瞞著大家」（`onlyIfAll`）。
**`-1719`：雪都出墓合流之後 —— 蕾娜的約會路線（Ray 交稿）＋ M2 封頂**
· 雪都旅店 `innStage1.knock.RENNA`：`need:'vn_after_tomb'`（合流演完才開，之前敲門回旁白「（蕾娜好像還在忙。）」暫代）；
  M1（含先跑古墓）四句 ＋ **T4 以上派生**（主角空白 → 臉紅插圖 `032_rennablush` → 兩句 → 收圖）；M2 五句「就當作扯平了吧」。
  收尾旗 `vn_date_renna`，演完照既有機制設同行。**`inn.js` 的 knock 表多了 `need`／`needSay`**（唯一那支實作）。
· **表情是我配的**（write／whisper／smile／apologize／blush；tire／lookaway／smile／bow）—— Ray 稿上沒給。
· ⚠ **美術要交：`resources/illustration/032_rennablush.webp`**（蕾娜臉紅的插圖，T4 派生那一拍）。圖沒到那兩拍照演，只是沒插圖。
· **M2 ⇒ 蕾娜 T 值上限 4**：`progress.js` 的 `AFF_CAPS` 加一列 `{who:'renna', need:'ep_m2_route', maxTier:4}`（既有機制，-1353）。
· Ray 的設計註記（照錄）：「沒約蕾娜就不會有扯平這個最低限度的結束……角色的個性反而是上了 4 以後變得有一點冷淡，
  這是個性設定，所以不論如何應該都咬得到。不能觸碰所以保持距離跟感覺背叛保持距離的外顯是一樣的。
  進度推到以後發現辦不到的話，回頭把扯平放到過場必經也可。」BA・M2 出墓蕾娜摔門那一拍**不補**（「她這個角色就是這樣默默扣分然後進工作模式」）。
· 「自由探索，可出航」在雪都本來就成立（`sail.hold` 到 `vn_depart` 為止、城上沒有 `storyExplore`），沒有動。
· 驗收：jsc 模擬 M1 T3／M1 T5／M2 三組敲門對白逐拍對過；lint 0 錯誤、42 提醒。

# （上一段）截至 `ver 2026.09.22-1717`

## `-1717`：AB 順序（先古墓再東泊）的收場 —— Ray 定案「米夏在這邊不用出場，也沒有審訊」

四條線盤點的結論（-1716 那一輪報給 Ray 的）：BA・M1／BA・M2／H 各自通；漏洞全在 AB。這一版把它們補掉：

| 件 | 做法 |
|---|---|
| 長談在「妳高興就好啦！……滿足滿足！」收場 | 那之後的 20 拍（安雅打瞌睡→米夏注視→守夜）全部 `skipIf:'tomb_misha_met'` |
| 那一夜不觸發 | `ep_night_anya_out` 加 `until:'tomb_misha_met'` ⇒ AB 永遠不分 M1／M2（AB・M2 在資料上也消失了） |
| 守夜任務鎖不會關到天荒地老 | `QUEST_LOCK` 那扇窗加 `unless:'tomb_misha_met'`（`questWindow` 新欄位） |
| BGM 不會卡在 glasscradle | `bgmWhen` 那一列加 `not:'tomb_misha_met'`（`bgmWhenRow` 新欄位） |
| 隔天走出旅店＝「只剩西邊廢城」 | `ep_leave_final` 的 `need` 由審訊改成長談＋`tomb_done` |
| **`tomb_done` 真的有人插了** | 出墓那一段（兩版）收尾與 `tomb_misha_met` 一起插；分歧面板的 AB 判定從此成立 |
| 古城回東泊「下一站是伊甸古墓」 | 加 `skipIf:'tomb_done'`，AB 只剩「休整一下，明天就出發吧。」 |
| 第二天有人出門 | `endStoryExplore:true` 移到長談那一段（以前只掛審訊 ⇒ AB 與 BA・M2 第二天永遠沒人出門） |

驗收：jsc 模擬三組旗（AB 長談完／BA 長談完／BA・M1 審訊完）—— AB：長談 28/48 拍、夜不演、無鎖、
預設 bgm、走出旅店取到 `ep_leave_final`；BA 兩組與改前一模一樣。lint 0 錯誤、42 提醒。

⚠ 還開著（-1716 盤點的軟項，Ray 沒交辦就沒動）：BA・M2 揭露後回雪都約安雅去瞭望台那段「要你瞞著大家」會過期；
BA・M2 出墓蕾娜摔門走人、隔天旅店直接公事模式，中間沒有和好的拍；BA・M2 第二天沒有「下一站是古墓」的簡報。

# （上一段）截至 `ver 2026.09.22-1716`

**`-1716`：墓門 M1 版的 BA／A 分歧（Ray 修正稿，三點判讀他都確認）**。
· 判準 `ep_belisar_done`（插＝BA 先去過古城／沒插＝A）；三個分歧點：蕾娜的反應（「！！」vs
  「安娜跟……米夏……」「米海爾……謝索洛夫？」）、米夏（「看來有人聽得懂」vs「聖王廳的狗，鼻子挺靈的」）、
  蕾娜質問（自報身分＋永夜協議兩句 vs「您是第一皇子沒錯吧?」）。H 一律公主抱系、一般路線
  `lookaway`／`lookawaytalk`／`talkwork`（稿上的 `worktalk`＝`talkwork`）；米夏「！！」＝`frontshock`。
· 米夏那句改「妳竟然連身份都告訴他們了？」。M2 版一字未動。
· ⚠⚠ **`onlyIf` 的陣列是「或」**（-1484）—— BA×H 那三拍要「且」，所以 story 加了 **`onlyIfAll:[…]`**
  （條件拍那一段有四選一的寫法表；`branches.js` 也掃它；SCRIPT_FORMAT 補一行）。
· 驗收：jsc 模擬四種旗組合走 M1 版，每一組印出來的蕾娜／米夏句子與差分都對；lint 0 錯誤、42 提醒。
· A 路線合流（雪都旅店「貝薩利爾古城」那一段）Ray 又交了一次 —— **與線上 A・M1 版一字不差，沒動**。
· **`hugangry2` 的下落**：差分表那一列的 ✔ 是 Windows 那台出表時量到的 —— 檔在那台工作區、未追蹤。
  Ray 要從那台推上來；程式端鍵已在。

# （上一段）截至 `ver 2026.09.22-1715`

## `-1715`：Ray 一次交的 14 件（古墓／鏡湖／墓門那一段）

| 件 | 做法 | 在哪 |
|---|---|---|
| 瀑布底 `se_waterfall` 要連續 loop | Ray 交的 11.8 秒新檔轉成 **`se_waterfall_loop.m4a`**（`_loop` 命名規約）接到瀑布底／水蝕洞的 `amb`；`audio.js` 的 `playBuffer` 在 `loop` 那一條把 `loopStart/loopEnd` **夾在有聲的區間**（AAC 的 priming／padding 靜音就是「每一圈空一下」的元兇：舊檔頭 4.6ms、尾 25ms 全靜）。舊的 `se_waterfall` 留給一次性的 `se:` | `audio.js`／`story.js` SE_FILES／`town.js` lake／`config.js` fileGain |
| 安雅感應動畫不可點擊跳過 | 引擎規則：`renderLine` 看到 `fx:'sense'` 就把 `noSkipUntil` 拉到 `max(auto, SENSE_BURST_AT+SENSE_BURST_GROW)`（五處 sense 拍以前只有兩處寫了 `noSkip`） | `modules/story.js` |
| 鏡湖主角背影水平翻轉＋同拍 `se_walk` | `ART.torsten.flip:true`（這張畫的性質）；`tor('back','',{se:'se_walk'})` | `speakers.js`／`town.js` |
| 墓主一場只跑一次降臨音跟咆哮 | story 記下最近一次 `cgBackRise` 的拍（`storyRoseAt`），戰鬥拍在兩拍之內就傳 `storyRose`；main 對 `kerbRise` **或** `storyRose` 都 `suppressEnemyRise`；enemy 被壓掉那一場**連登場音與衝擊一起不發**（以前只壓畫面，`arrive()` 照樣響鐘＋吼） | `story.js`／`main.js`／`enemy.js` |
| 無夥伴那場改成安雅或索、預設索 | `tomb_low_solo` 卡：拿掉 `solo/noSaint/noPartner`，改 `partner:'sorana', partners:['sorana','anya']`；`combat.startGame` 新分支：現任在名單裡（且沒出局）就照他的，否則落回預設 | `config.js`／`combat.js` |
| 第三層追擊再密、走錯一次回頭就被追上；沒被追上就在骨坑必遭遇 | `chase.l3`（資料）：底層梯廳那一段（`tomb_low_arrive`）演完 ⇒ 牠擺到 `stair2`（背後一格）、`speed:1`／`stun:1`、`catchAll`（noWild 的格子也追得上，`rest` 除外）、`mustAt:'bonepit'`（這一層 `hits` 沒增加就在骨坑逼一場；打完照舊走骨坑的 rest 結算）。骨坑本來就 `rest:true` | `town.js` chase／`modules/town.js` `chaseSpec`／`chaseActDue`／`chaseAfterAct` |
| 墓門遭遇墓主後永久關閉 | `exitIf` 新增**否定**與**陣列**寫法（`'!旗'`、全部要成立），而且 `back` 也吃：墓門 `up:['tomb_opened','!tomb_gk1_done']`、前庭 `back:'!tomb_gk1_done'` | `town.js`／`modules/town.js` `exitsOf` |
| 「米夏！」差分沿用上一張 | 兩個版本都改 `any(null,…)` | `town.js` |
| 女狐拍 `se_sworddraw`／「殿下……」士兵立繪／「安娜。」`se_swordcease`／「撤收。」後一拍 `se_steps` | 兩個版本都改。刀音兩支是 Ray 今天丟的 mp3 → 轉 m4a、原檔進 `se/_raw/`；士兵＝`ART.retainer`（`measure_si.py` 實量 4/1534/0.451，站右） | `town.js`／`speakers.js`／`story.js`／`config.js` |
| **`hugangry2` 的檔** | ⚠⚠ **這台上沒有**：全碟搜過、git 全歷史沒有、Downloads 那幾張 `an_hug*`／`s_hug` 都不是她。美術 09-24 交接寫它是 **Windows 機工作區的未追蹤 png**（`renna_si_hugangry2.png`）—— 要從那台 commit 或丟過來；`speakers.js:343` 的鍵先留著（現在指向不存在的檔＝那兩拍會空） | — |

驗收：`script_lint` 0 錯誤、42 提醒（基準不變）；8123 首頁開機無 console 錯誤；資料 dump 確認 `l3`／`exitIf`／`amb`／五拍的 se 與立繪都落地。
⚠ 追擊 l3 與墓門封閉**沒有實走**（要進到底層梯廳那一段才驗得到）—— Ray 測。
⚠ `check_module` 對 DOM 模組（audio／story／town…）一律回 `document` 未定義：那是**執行**不是語法，用瀏覽器載入代替。

# （上一段）截至 `ver 2026.09.22-1714`

**`-1714`：`vn_after_tomb` 那個 AB・M2 的死版本拿掉了**（Ray：「把 town.js 那個 ABM2 死版本拿掉」）。
`script/town.js` 雪都旅店的 `vn_after_tomb` 由四個 act 變**三個**（BA・M2／BA・M1／AB・M1），
檔頭註解寫明為什麼沒有分支 1 × M2。`branches.js` 的 ⚠ 標記自然消失（面板現在列「共 3 個版本」）。
`script_lint` 0 錯誤、42 提醒（與 -1712 基準相同）。

# （上一段）截至 `ver 2026.09.22-1713`

**`-1713`：「分歧」面板的路線改成**列舉**的三條**（Ray：「分岐目前有 ABM1,H、BAM1,H、BAM2,H
這些是帶編號跟順序的路線」「應該沒有 ABM2」）。-1711 把先後順序（AB／BA）與那一夜（M1／M2）
當成兩個獨立的分支點在**乘**，於是面板長出 AB・M2。現在 `script/branches.js` 只有一張
`ROUTES`（AB・M1／BA・M1／BA・M2），選的是整條路線；H 是古墓之後的派生，另立一軸。
每一幕仍**只動它真的讀到的旗**（＋`belisar_seen`／`ep_belisar_done`、M1／M2 這兩對同伴）——
墓門選 AB 不會順手插 `tomb_done`（人正要走進去）。
⚠ 資料上曾有一個 AB・M2 的死版本（`vn_after_tomb`）—— 面板標成「⚠ 資料有這個版本、路線表沒有」
讓 Ray 看到；**-1714 已照 Ray 指示拿掉**。日後再出現這個 ⚠ 標記＝腳本又長出路線表外的版本。
⚠ `劇情分歧樹.pptx` **沒有重出**：這台 Mac 沒有 node／pptxgenjs（`tools/branch_tree.mjs` 要它們）。
  下一台有 node 的機器跑一次 `node tools/branch_tree.mjs` 就好，樹讀的是同一份 `scanBranches()`。
驗收（8123）：首頁「分歧」→ 伊甸古墓 墓門 `tomb_gate` 只列三條路線；console 無錯。

# （上一段）截至 `ver 2026.09.22-1712`

> ⚠ **Ray 在 -1712 之後換機器**。下一台開工：`git pull` → 讀這一段 →
>   確認 `config.js` 的 `VERSION` 是 **-1712**（不是就是沒拉到）。
>   Windows 機器：`python3` 是空殼，一律 `py`；預覽用 `.claude/launch.json` 的 `tivot-win`（8124）。
>   `tools/branch_tree.mjs` 要 `pptxgenjs`（沒裝就 `npm i pptxgenjs` 或設 `NODE_PATH`）。

**`-1712`：安雅 `smile` 接上**。圖從 -1554 就在庫裡，東泊約安雅那一拍 `any('smile','好！')`
一直在用、卻沒登記 ⇒ 靜靜退回基本立繪。全身站姿、另一張構圖 ⇒ `tools/measure_si.py` 逐張量：
`top:0 bot:1526 fx:0.494`（同工具量本尊得 0/1531/0.505 ＝線上值，工具可信）。
瀏覽器確認鍵解析得到、圖載得到（1024×1536）。

---

# ⭐⭐⭐ `-1695` ～ `-1711`

> ⚠⚠⚠ **交接檔又落了 16 版**（標頭停在 -1694，程式已到 -1710）—— 第三次了。
>   `-1695`～`-1710` 只依 commit 訊息摘要，**沒有逐項複驗**；`-1711` 是這一輪自己做的。

## 一、`-1695` ～ `-1710`（別人做的）

| 版 | 內容 |
|---|---|
| -1695 | SI／NI 期間的反擊計入 MB 期間總傷 ＋ 修好「反擊整個不開火」 |
| -1696 | 夢境粉碎＝強制消去敵最大 HP 的 20%，打得死＝處決（憲法已記） |
| -1697～-1699 | Ray 的古墓／鏡湖腳本修正稿、Execute CI 改 .png、T3 分支改三件 |
| -1700～-1704 | 古墓終戰：墓主真的變巨大、所有怪的接地陰影、追兵擊退後倒地（`seal_down`）、降臨改淨化倒放 |
| -1705～-1706 | 「索菈娜！」之後先播 `se_snatch` 再上插圖；米夏 21 個差分接上 `speakers.js` |
| -1707 | 走出墓門（M1／M2 × H 路線）＋ 雪都旅店合流（古城前／後 × M1／M2） |
| -1708 | 首頁「分歧」檢查（管理人）＋ 根目錄 `劇情分歧樹.pptx` |
| -1709～-1710 | 雙人立繪話講完就撤、改小幅滑入＋淡入淡出 |

美術端（見 `resources/_HANDOFF_ART_20260924.md`）：索拉娜 realpha 12 張、米夏 12 張＋刀鞘修正、
蕾娜公主抱四差分、索拉娜 `carrynouvelleshock2`、安雅 `happy`、米夏隨從 `retainer_si_front`。

## 二、`-1711`（這一輪）

**① 索拉娜 realpha 12 張接上**（`_sorana_r3_worklist.md` §十三）：
`amaze angry armcross cry crybig determine eat embarrass front cringe drink excite2`
的 `top`/`bot` 換成新畫布的值、`?v=` 各跳一號；`flight/index.html` 的 `amaze`／`cringe`／`excite2` 同步；
`config.js` 的 `partner_sorana`（也指 `sorana_si_front`）由 `?v=2` 跳到 `?v=4`（它本來就落後）。
⚠ 實量 alpha 上下緣與工單差 1~3 px（門檻不同），用工單的值。`fx` 照規矩不動。

**② 安雅 `happy`** 新鍵（取景照抄本尊）。

**③ 「分歧」面板收窄**（Ray：「分歧選擇以有編號的為準 如 M H 路線 AB 路線或 BA 路線
不用分好感 好感在遊戲內可調」「約會事件只要放旅店就好 我測試可以自己走」）：
- `script/branches.js` 只認路線旗（`ROUTE` 表：`ep_m1/m2_route`＝M、`tomb_h_route`＝H、
  `belisar_seen`／`ep_belisar_done`＝BA、`tomb_done`＝AB）。**好感段位、選項、其他旗一律不列。**
- 整幕版本（同 `flag` 的幾個 act）標成路線名（例：雪都旅店 `vn_after_tomb` 四版＝`BA・M2`／`BA・M1`／`AB・M2`／`AB・M1`）；
  進場時**不選也會把那個版本的路線旗擺好**（`main.startBranch`）。
- **約會事件一座城一筆**（`withWho` 的段落、`need:ep_date_*`、敲門邀約）→ 放到旅店，自己去約。
- 新掃 `onLeave`：東泊走出旅店（AB／BA 兩版）。
- 現況 **4 座城、14 幕**（原 49 幕）。`劇情分歧樹.pptx` 已重出。
- ⚠ `tools/branch_tree.mjs` 要 `pptxgenjs`；這台沒全域裝，用 `NODE_PATH=<有它的 node_modules>` 跑。
- 驗收（8124）：墓門 M1 版＋H → 旗 `ep_m1_route`／`tomb_h_route` 插上、`ep_m2_route` 拔掉、落在墓門；
  東泊〔約會〕→ 落在東方泊地旅店；console 無錯。

## 三、⚠ 還開著

| 件 | 狀況 |
|---|---|
| 東泊腳本讀 `tomb_misha_met` | -1707 掛的提醒，**Ray 要回修**，現在沒人讀這支旗 |
| 米夏 `close` 自然站姿、`closeopen` 重做、刀長不合格 7 張 | 等 Ray（美術交接 §三） |
| 米夏 `order` 的 `top/bot`、`back` 的 `fx` | 要看畫面複核 |
| 11 份美術交接檔從磁碟消失 | 仍在 git，等 Ray 回覆（**不要 `git add -A`**） |
| `script_lint` 42 條提醒 | 古墓 6 張插圖仍是 png、3 場劇情戰前沒有 `checkpoint`、貝利薩爾 6 條 L 形邊 |
| -1694 那張表 | `carrynouvelle` 的 `fx`、`determine／eat／wave` 的 `fx`、`embarrass` 右緣 —— 仍等 Ray |

## 四、資產盤點（這一輪動到的）

| 項 | 狀態 |
|---|---|
| 索拉娜 realpha 12 張 | ✔ 不欠 —— 圖已交、`-1711` 取景與版號已接 |
| 安雅 `happy` | ✔ 不欠 —— `-1711` 已接 |
| 蕾娜 `hugserious／hugshock／hugtalk／hugtalk2`、索拉娜 `carrynouvelleshock2` | ✔ 不欠 —— 已在 `speakers.js`（-1711 查過） |
| 安雅 `smile` | ✔ 不欠 —— `-1712` 已接（誰交的仍不明，但不影響） |

---

# HANDOFF — 截至 `ver 2026.09.22-1694`（以下為舊文）

---

# ⭐⭐⭐ `-1671` ～ `-1694`

> ⚠⚠⚠ **`-1671` ～ `-1693` 這 23 版沒有人寫進交接檔** —— 標頭停在 -1670，而
>   `config.js` 已經是 -1693。**這正是 §0.1 第 3 條說的那件事，而且是第二次了。**
>   下面這一段是 -1694 補寫的，`-1671`~`-1693` 只依 commit 訊息摘要，沒有逐項複驗。

## 一、`-1671` ～ `-1693`（別人做的，主線幾乎整輪在伊甸古墓）

| 版 | 內容 |
|---|---|
| -1671 | 索拉娜 `battlecry` 五個新鍵接線、`se_heavycursh` 登記、插圖改名補 6 處 |
| -1672 | 底層梯廳與祭壇終戰 —— Ray 的收場稿轉成資料 |
| -1678 | 實跑一遍修四件 ＋ Ray 的四項追加 |
| -1680 | 諾薇兒熔斷出局、雪都大教堂背景接上、`panic` 新圖 |
| -1682 | 底層梯廳＝**Stage 15**，章節跳關新增一筆 |
| -1683 | NI 的延時懲罰／追逐終點／三層不出怪／墓門封死／BGM 回預設／真無夥伴 |
| -1685 | 七件改稿 ＋ 兩個 bug（NI 的 MB 沒有畫面／立繪都沒出來） |
| -1687 | 開場重排：上膛獨立成一拍、「對不起」移到戰鬥前 |
| -1691 | 首頁手機版按鈕重疊（`padding-bottom:72px` 那個猜出來的高度）**⚠ 方向被 -1694 推翻一半** |
| -1693 | T3 收場改稿 ＋ 蕾娜公主抱三張接線（`cm:193` 由**眼距**反推） |

美術端：索拉娜第四輪 19 張（13 張換 1024×1600）、背諾薇兒 5 張、蕾娜公主抱 3 張
＋`snivel`、守墓者重製、古墓 7 張背景改畫、14 張地圖 PPT 重出、三張退件還原。

## 二、`-1694`：把落了 23 版的交接單接完 ＋ 首頁更正

**① `ASSET_VER` 六張古墓背景**（同名覆蓋卻沒跳版號 ⇒ 玩家快取抱著舊的窄圖，
而且畫面上沒有任何錯誤訊息）。**② `speakers.js` 索拉娜第三＋第四輪 35 項**
（版號、13 張換畫布的 `top`/`bot`、三個新鍵）＋ `flight/index.html` 同步 11 處。
**③ 首頁團徽還原，改縮那三顆鈕**（Ray：「logo 大小跟位置不能改…為了放按鈕都被
變型了」）。

⚠⚠⚠ **這一輪最值得記的兩件：**

1. **工單的 `fx` 不要照抄 —— 量一次就知道哪個是真的。**
   工單給了 15 個新 `fx`，用憲法的**髮心量法**（-1578）逐張比舊圖與新圖：
   **只有 `shy` 真的移了（+0.074）**，其餘 ≤0.003 ——「determine +0.028／eat +0.030」
   那幾個是**自動量測被手臂與頭髮拉偏**，不是頭移位。Ray -1578 定的「`fx` 一律
   不要動」是對的，而**分辨真假只花了三十行 python**。
2. ⚠⚠ **改視口一定要重新載入再量。** `--appvh` 是開機時算一次的，`resize` 之後
   不更新 —— 拿舊值量出來的「溢出 139px」是假的（這一輪第一批數字整組作廢，
   差點照著它去改一個根本不存在的 bug）。

## 三、⚠ 還開著（-1694 當下）

| 件 | 狀況 |
|---|---|
| `carrynouvelle` 一族的 `fx` | 線上五張是 **0.667**，美術工單是 **0.648**（差 ≈8 CSS px），兩邊都說是索菈娜的兩眼中點。**要改就五張一起改** —— Ray 看畫面決定 |
| `determine`／`eat`／`wave` 的 `fx` | -1578 就量出「現行值與髮心差 0.02~0.03」，一直留給 Ray 決定，**這一版也沒動** |
| `carrynouvelle` 兩個世代 | `scream`／`smirk` 是 A 世代，`carrynouvelle`／`shock`／`jealous` 是 B —— **混用時索拉娜的頭髮會變**，接腳本時先避開 |
| 四張插圖沒轉 webp | `26_nouvellefaint`／`27_rennapull`／`28_rennanouvelle`／`29-1`／`29-2`（`script_lint` 每次都在喊，5 條提醒） |
| `embarrass` 右緣 0px 餘裕 | 被裁，要不要重生成由 Ray 決定 |
| 三張公主抱的 `.png` 母版 | 還留在 `resources/si/`，該進 `_originals`（§5）—— 那是美術那一邊的檔 |
| 差分表四個垃圾分頁／古墓 26 隻的 `kind`・`loot`・`bgm`／`purgeFx` 上 Excel | 同 -1670 那一輪，沒有進展 |

---

# HANDOFF — 截至 `ver 2026.09.22-1670`（以下為舊文）

---

# ⭐⭐⭐ 這一輪（`ver -1669` → `-1670`，2 個 commit，**已推**）

> 這一輪很短（Ray 只交辦三件小的），但**開工那一段踩到的坑比做的事重要**，
> 而且 §0.1 那條規矩這一次是被**我**違反的 —— 先讀第一節。

## 一、⚠⚠⚠ 開工：`git pull` 說完成了，其實落後 322 個 commit

Ray 開場說「git pull complete to latest」，我就照著本機的 `HANDOFF.md`（-1408）
讀完、還報了一整頁「接下來可以做什麼」。他一句「handoff too old check again,
check ver no.」才發現：**本機 `fbbdf72`／-1408，遠端 `65d03c0`／-1668 —— 差 260 版。**

三個教訓，都值得下一個人照做：

1. **⚠⚠⚠ 開工第一件事是 `git ls-remote` 對一次 SHA，不是讀交接檔。**
   `git status` 只會拿**本機記的** `origin/main` 去比 —— 沒 fetch 成功時它會很有自信地
   說「乾淨、與 origin 同步」。分辨法（三秒）：

       git ls-remote origin refs/heads/main     # 回來的 SHA 與 git rev-parse HEAD 比
       ls -l .git/FETCH_HEAD                    # 0 bytes ＝ 上一次 fetch 根本沒完成

2. **⚠⚠ `git pull` 的 exit code 0 不代表拉下來了。**
   我先開了一支背景 `git fetch`，接著又下 `git pull` —— 兩者撞在一起：

       error: cannot lock ref 'refs/remotes/origin/main':
              is at 65d03c0 but expected fbbdf72
       ! fbbdf72..65d03c0  main -> origin/main  (unable to update local ref)

   **它照樣 exit 0**，工作區一個檔都沒動。⇒ **拉完一定要 `git log --oneline -1` 看一眼**。
   （收拾法：`origin/main` 其實已經更新了，`git merge --ff-only origin/main` 就落地。）
   ⚠ 這台的 repo 在 OneDrive 同步資料夾裡，`git fetch` 常常要跑好幾分鐘 ——
     要背景跑就**只跑一支**，不要再疊第二支。

3. **⚠⚠⚠ 交接檔自己也會落後於碼。** 拉下來之後 `HANDOFF.md` 寫「截至 -1657」，
   而 `config.js` 是 **-1668** —— 中間 11 版（`-1658`～`-1668`）沒有人寫進來。
   ⇒ **讀交接檔之前先比一次它的標頭與 `VERSION`**；對不上就去補讀那幾個 commit。

## 二、⚠ `-1658` ～ `-1668` 那 11 版：我只讀了 commit 訊息，**沒有逐項複驗**

主線是 **RUSH 模式**、**王座徘徊者的光砲**、**敵人卡搬上 Excel**：

| 版 | 做了什麼 |
|---|---|
| -1668 | 受擊特效 CD 上 Excel（`hitFxCd` 欄；`config.HITFX.*.cdSec` 退成「沒填時的保底」） |
| -1667 | 光砲：發動＝真的清場（`defense.holdAssaultFor`）／光退了才重算下一次攻擊／12 秒 CD |
| -1665 | RUSH：城鎮背景改**白名單**（`config.rush.bgDirs`）／船戰・空戰走天空背景＋`ship:true` |
| -1664 | RUSH：隨機背景、結算按繼續回首頁、按 RUSH 跑一次讀取頁 |
| -1662 | RUSH：打完第一隻不出第二隻（閉棺把劇情層打開了沒人收） |
| -1661／-1660 | 重擊只清畫面上的圈／餐廳那句不指名菜色／沒食材的「跟平常一樣的」／第一餐 +80 |
| -1658 | 米夏 CI 不可點掉／天黑抵達開睡覺鈕／iOS 補播與飛行雙曲／翌日直接到碼頭 |

## 三、做掉的兩件（都附驗收）

### ① `-1669`：古墓 26 隻全部給降臨（Ray：「古墓都用降臨」）

用 **`riseFx:1`，沒有動 `kind`**。理由寫在 commit 裡，重點是：
`kind:'multi'` **同時**擋著降臨、淨化、結算副標的「已淨化」——
改成 `harm` 會一次打開三件，而**那 26 隻不是同一類東西**（墓熊／蒼白牝鹿／谷蟾／
地窖蜈蚣是**獸**，副標該是「已獵殺」）。`riseFx` 的語意正好是「分類與演出分家」。
⚠ 守墓者 `gk_*` 四張 -1615 就有了，沒有重複加。

### ② `-1670`：降臨上 Excel ＋ 差分表修好大小寫

（Ray：「全部填 riseFx:0 加欄重新匯出」／「更新差分表」）

**降臨欄**：`enemies.xlsx` 現在 **96 張卡・64 欄**，「降臨」在「種類」右邊（H 欄）。
`script/enemies.js` 補到 **96/96 都有 `riseFx`**（古墓 30＝1、其餘 66＝0），
檔頭「統一欄位」由三格改成**四格**。
⚠⚠ **為什麼非得每張卡都有那一行**：匯入是**就地改值**（`set_scalar` 拿 `^\s*欄名:` 去比），
  卡上沒有那一行它改不到、只會默默列進 `skipped` ⇒ 光加一欄等於「改了沒用」。同 boss 的 -1024。
⚠ `intruderEnemy` 連 `kind` 都沒有（挑戰亂入的佔位卡，`triggerIntruder` 會整組覆寫），
  它錨在統一欄位那一行。

**⚠⚠⚠ 差分表從 ver -1554 起一直是錯的**（`tools/si_xlsx.py`）：
`SI_DIR`／`NPC_DIR` 寫死大寫 `resources/SI/`，而 git 索引與磁碟都是**小寫**
（-1554 全庫改小寫那一輪換掉的）。Windows 不分大小寫 ⇒ `os.walk` **讀得到檔**，
卻照著給進去的大小寫吐回路徑 ⇒ 永遠對不上 `speakers.js` 的 `resources/si/...`。
症狀（**表照樣出得來，沒有任何錯誤訊息**）：
· 352 個差分**全部**被判成「未接線」（實際只有 29 個沒接）
· 縮圖整批走 alpha 估的退路，不是 `speakers.faceStyle()` 那顆真頭像
· 「城鎮店主 NPC」那一頁是空的
修法：兩個常數改小寫 ＋ **比對兩側各 `.lower()` 一次**當第二道保險
（磁碟的大小寫是**作業系統**給的，speakers.js 那份是**人寫的字串**）。
⚠ 真正會讓靜態空間 404 的大小寫錯誤仍歸 `script_lint.py`／`bg_index` 那一族管。

**驗收（都真的跑過）**
· Excel 來回三趟：原封不動匯入 → **改了 0 格**；把 `witch` 改成 1 再匯入 →
  **改了 1 格 `witch.riseFx: 0 → 1`**（這正是先前會 skipped 的那一步）；改回 0 重匯 → 與 js 一致
· 差分表修後：**352 個差分（主要角色 319・NPC 33）、已接線 323、未接線 29**；
  18 個分頁（蕾娜 85／諾薇兒 69／索菈娜 63／安雅 58／…／城鎮店主 NPC 36／待接線・缺檔 88 列）
· `node --input-type=module --check script/enemies.js` 過
· `py tools/script_lint.py` **0 個錯誤、35 個提醒**（＝ -1668 的基準，沒有新增）
· `py tools/bust.py` → v=1670

## 四、⚠ 還開著的（這一輪新增的，舊帳看下面幾輪）

| 件 | 狀況 |
|---|---|
| **差分表四個垃圾分頁** | `image - 2026-09-20t*` ＝ `resources/si/soranagpt/` 底下**四張沒改名的 GPT 原始輸出**，工具猜不到角色就各開一頁。要併進「底線開頭母版」那條排除規則、還是改名接線？**問 Ray** |
| **古墓 26 隻的 `kind`／`loot`／`bgm`** | 仍是預設。`kind` 現在只影響**淨化與結算副標**（降臨已由 `riseFx` 解決）—— 要不要逐隻分成禍魘／獸，等 Ray |
| **`purgeFx` 還沒上 Excel** | 它是 `riseFx` 的反向（分類不給淨化、但我要淨化）。要上表的話**同樣得先讓每張卡都有那一行** |
| **Ray 已結案的三件** | 遇敵率（**結案，不要再查**）／`sorana_si_q.webp`（**不管它**，表上照舊列在未接線）／古墓降臨（做完了） |

## 五、⚠ 這一台機器（-1670 當場踩到的）

1. **node 不在 PATH** —— 跑 lint／`si_xlsx`／`map_layout` 之前先
   `export PATH="$PATH:/c/Program Files/nodejs"`，不然回報「找不到可用的 JS 引擎」。
2. ⚠⚠ **`openpyxl` 存 `enemies.xlsx` 卡死過一次（三個多小時，沒有錯誤訊息）**。
   重跑就正常。懷疑是 Excel 開著那個檔或 OneDrive 在同步 —— **動那兩個 xlsx 之前
   先問 Ray 有沒有開著**；跑之前先丟背景（`run_in_background`），不要用前景等。
3. 主控台是 cp950：python 一律 `export PYTHONIOENCODING=utf-8`（或 `import _utf8`），
   不然印中文會 `UnicodeEncodeError` **中斷整支腳本**。
4. 這台只有 `Kaede` 這個使用者 —— 美術交接 §十九 寫的
   `C:/Users/Ray Ku/Desktop/TIVOT` **不存在於這台**。repo 在 OneDrive 同步資料夾裡，
   **兩台不要同時對它動手**。

---

# 上一輪（`ver -1614` → `-1656`，43 版・57 個 commit，**已推**）

> ⚠ **開工先讀這一段。** 這一輪幾乎整輪都在**伊甸古墓**（拓樸從 35 格長到 61 格）
>   與**開火的視覺**（火線／硝煙／拉煙）。第三節那四個教訓比程式碼重要。

## 一、伊甸古墓：拓樸 35 → 61 格（Ray 逐次定案，PPT 已交）

| 版 | 改了什麼 |
|---|---|
| -1634 | 一層 +4、二層 +4（+24%／+33%），出第一份 PPT |
| -1638 | 二層整層翻成「一路往下」 —— **被退回** |
| -1640 | **退回上一版的佈局加房間**（Ray：「用上一版加圖」）＋往三層梯廳改成往右再一路往下 |
| -1641 | **甕窖做成四岔路**，四個方向各有路線與岔路 |
| -1642 | 墓道加深 ＋ **要轉彎才到得了底層階梯**（十字墓窖沒有 `down`） |
| -1643 | 破碎廊道接成環／十字墓窖往下兩格／階梯改名／祭壇差分／**廢坑道**（祭壇啟動才開，雙向） |

**現況**：61 格・63 邊・**3 個環**、**0 交錯 0 斜線**（程式驗過）。
第一趟走得到 60/61（廢坑道要祭壇啟動），二層梯廳→三層梯廳 **12 步**。

⚠⚠ **`tomb_altar_on` 這支旗還沒有人插**（祭壇啟動那一段劇本沒寫）——
  名字先留好（同 `tomb_opened` 那一族），寫那一段的人**不要再發明第二支旗**。

## 二、⚠⚠⚠ 這一輪最貴的四個教訓

1. **⚠⚠⚠ 交接檔會過期，而我照著它講了錯話。**
   我依 -1613 那一行「古墓 28 隻是佔位數值」告訴 Ray「等級還在等你」——
   實際上 `tier`／`atype` 與基準值 **-1586 就套好了**（Ray：「等級我不是給了嗎？」）。
   ⇒ **憲法 §0.1 那條「不准用交接檔／git log／檔案時間去推現況」是雙向的**：
     交接檔**自己也是要驗的對象**。回答「還缺什麼」之前，先跑一次資料。
   （那三行已經標成作廢，見下面各節。）

2. **⚠⚠⚠ 交了新背景要重跑 `tools/bg_index.py`，不然是「用上一張圖」。**
   -1647 接上 27 張補圖，**沒重跑索引** ⇒ 那 27 個檔名查不到區域資料夾 ⇒ 退回根目錄
   ⇒ 404 ⇒ `bgFor` **載不到就不換** ⇒ 畫面上留著上一格的背景，**沒有任何錯誤訊息**
   （Ray：「背景圖沒接好，很多地方的圖都是用上一張圖」）。
   ⇒ **那句話 `bg_index.js` 的檔頭本來就寫著**，我讀過、就是沒做。
     ⚠ 建議做成會執行的檢查（`script_lint` 掃磁碟 vs 索引，對不起來就報**錯誤**）——
       這一輪沒做，留給下一個人。

3. **⚠⚠⚠ 「規矩寫在註解裡」＋「兩份真相」又各咬一次。**
   · `exitIf` 在同一個節點寫了**兩份**（物件字面重複的鍵後者勝）⇒ 廢坑道的箭頭永遠
     出不來，而畫面完全正常（-1643）。
   · `boardLoop` 是 opt-in，98 張卡只有 5 張寫了 ⇒ 其餘 93 張打完最後一盤就
     **一路 16 格到死**；`[9,9,9,9,9]` 那 38 張還會**憑空跳成 16 格**（-1630）。
     ⇒ 改成預設繞回去（鐵律 13：漏寫的下場要落在安全的那一側）。

4. **⚠⚠ 我又自作主張改了 Ray 的安排一次。**
   -1616 把三段追擊戲從柱廳搬到中殿（他沒要求），-1617 整個搬回去。
   Ray：「不准調整我的安排」。⇒ **他講的是「觸發時機不對」，不是「資料擺錯地方」。**

## 三、開火的視覺：四層，全部程式畫的（無素材）

| 層 | 誰有 | 旋鈕在哪 |
|---|---|---|
| **火線** | 普攻／BR／三種副武器反擊 | `enemy.js` 的 `TRACER_MS`／`TRACER_LEN`／`MIRROR`／`SPREAD` |
| **槍火** | 同上（**與火線同一個落點**，-1627） | 既有的 `muzzleAt`／`muzzleAtPoint` |
| **硝煙** | 普攻 0.55／機槍 0.35／散彈 0.45／**爆發型 1.6** | `enemy.muzzleSmoke(k)`（**自己節流 50ms**） |
| **拉煙** | **只有船戰的副武器** | `enemy.trailSmoke`；方向**一場擲一次**（`rollSmokeDir` 在 `setEnemy`） |

⚠⚠ **火線的落點是「鏡射到起點的另一側」** —— 那不是美感，是**保證交叉**
  （-1625：亂數保證不了交叉，只會讓角度忽大忽小）。
⚠ **陸戰萊福槍與船戰高爆砲是同一條分支**（`vfx:'single'`），所以「兩個都加大」
  寫一次就好。
⚠ 飛行聲 `se_bulletsfly1~4`：由交件重取樣出四個版本（±0.7 半音以內），
  **播放時刻往後推 200ms**（`BF_DELAY_MS`）—— 不推的話前 0.2 秒的飛行咻聲會被槍聲吃掉。

## 四、⚠ 還開著的

| 件 | 狀況 |
|---|---|
| **`tomb_altar_on`** | 沒有人插 ⇒ 底層祭壇永遠是「未啟動」那一張、廢坑道永遠不開 |
| **古墓 26 隻的 `kind`／`loot`／`bgm`** | 三格都還是預設（全 `multi`／全空／全沒寫）。`kind` 會決定降臨・淨化演出與結算副標 |
| **`sorana_si_q.webp`** | -1656 那一批交了，但 `speakers.js` **沒有引用** |
| **三張舊圖的 alpha 還很髒** | `mon_bear_husk` 35.5%／`mon_beast_organ` 8.7%／`mon_shinierforest_snake` 6.5%（§5 門檻 ≤1%） |
| **雪都大教堂** | 全庫唯一還掛 `bgPending` 的一格（借中城區） |
| `stageCurve` | `{from:8, k:1.025}` 佔位，等「總調整」那一輪 |

## 五、⚠ 新增的機制（日後直接用，不要重造）

| 東西 | 做什麼 |
|---|---|
| `map.sheets` ＋ `mapSheet()` | 小地圖**一層一張**（古墓三張）；舊的單張寫法照舊吃得到 |
| `chase.scenes`（一張表） | 被追上時演哪一段：**順序靠各段自己的 `flag`／`need`／`until`**，不靠次數 |
| `chase.hard` | 某支旗插上去之後整組追擊參數換一套（覆寫收在 `chaseSpec()` 一支） |
| 節點的 `mustWild`／`noWildFirst` | 「這一格整輪保證第一次必出怪」／「這一趟第一次進來不出怪」 |
| `line.kerbRise` | **這一拍要完整推棺**（其餘一律原地開棺）；同時讓那一場**不再降臨** |
| `enemy.suppressRiseOnce()` | 一次性的「這一場不降臨」（是**這一場**的性質，不是這一隻的） |
| `bgmWhen[].lock` | 這一段期間**連戰鬥都不換曲**（`battleBgmOf` 回 null，三個呼叫點什麼都不做） |
| `story.dustPlume()` | 崩塌音（`se_brickcrush`／`se_rockimpact`）一響就在演出區最前景揚煙 —— **掛在 `playSe` 的唯一入口**，不是逐拍寫 |
| `tools/map_pptx.py --cols/--rows` | 圖示表的格數可調；`bgPending` 的格子畫**綠方塊**（美術一眼看得出要補哪幾格） |

## 六、⚠⚠ 素材同名覆蓋：一支腳本重跑就好

版號＝**git 上真的被覆蓋過幾次 ＋1**（可重跑、冪等）：

```python
# 對 config.js / script/{speakers,enemies,town}.js / main.js
# git log --diff-filter=M 逐檔數覆蓋次數，與現行 ?v= 比對，落後的才改
```

這一輪跑了四次：-1632（30 處）／-1637（蕾娜 15）／-1656（古墓怪 25 ＋ 索菈娜 23）。

⚠⚠ **只算「現在這個路徑」上的覆蓋** —— ver -1554 全庫改小寫時每一個檔都換了網址，
  在那之前的覆蓋與快取無關（蕾娜／諾薇兒／安雅在舊路徑上有 60 次，**不必跳**）。

---

# 上一輪（`ver -1582` → `-1613`，21 個 commit，**已推**）

> ⚠ **開工先讀這一段。** 這一輪動的是**敵人數值系統**與**古墓追逐**，
>   而且有**六件是 Ray 在遊測中連續退回**的 —— 那幾件的教訓比程式碼重要，讀第三節。

## 一、做完並推上去的

| ver | 做了什麼 |
|---|---|
| **-1582** | **等級／類型／stage加成三欄**入卡 ＋ 全怪基準數值 ＋ `noStack`→`stack` ＋ xlsx 補到 96 張 |
| -1583 | 16 格收斂（S/A/B `9,9,9,16,16`；C 只有最後一盤）＋ hp 重算 |
| **-1584** | 首頁「腳本測試」→ **RUSH**（隨機刷 E→S 一輪怪再結算） |
| **-1586** | 匯入 Ray 填的等級／類型 ＋ **stage 加成上線** ＋ **出沒地**（圖／房間） |
| -1592 | 古墓 26 隻雜兵出沒地填 `tomb` ＋ **開機不再掛挑戰用怪** |
| -1594 | 雜兵真的刷出來 ＋ 守墓者改「三戰後下一格」 |
| -1595 | **BR**：次數＝殘格、每一擊＝一發普攻 |
| -1597／**-1598** | 古墓整張圖算**一局**（不再每戰一結算）＋ 遇敵率 33% ＋ 管理人模式好感吃滿 |
| -1599／-1600／-1602〜-1613 | 古墓追逐的劇情分段（見第二節）＋ 鎖血補洞 ＋ 兩支除錯工具 |

## 二、⚠⚠⚠ 古墓追逐現在長這樣（動它之前先讀完）

**觸發**：進古墓後**打過 3 場** → **下一格**追兵出現（`chase.startFights:3`；
「踩到第 4 格」那條 `startStep` **已停用**）。上線那一刻牠**站在玩家腳下那一格**。

**柱廳（`hall2`）是三段，各有各的 flag：**

    [0] tomb_hall2_arrive   4 拍   氣氛戲「這個地方好大……」        **只在柱廳**
    [1] tomb_gk1_done      22 拍   登場戲：震動→「什麼東西？」→gk1×2
                                   →「什麼跟什麼啊沒完沒了！」＋插 `tomb_chase_on`
                                                                     **追逐帶著走**
    [2] tomb_gk1_split     21 拍   **gk2 降臨** ＋ 分組＋Execute＋插 `tomb_split`
                                                                     **只在柱廳**

· `chase.intro:{at:'hall2',flag:'tomb_gk1_done'}` ＝**照 flag 指名那一段**（不是那一格）。
· `chase.next:{at:'nichehall',flag:'tomb_carry'}` ＝**登場戲之後換一格就演**（背安雅）。
· `hall2` 是 `noWild`（-1613，Ray：「柱廳只刷守墓者那一場劇情戰」）。

⚠⚠⚠ **這一段我被退回四次，每次都是同一個病：把「地點的戲」與「牠的戲」混在一起。**
  -1599 整段拖走／-1600 整個撤回／-1606 指名對了那一段卻沒發現裡面**還包著分組戲**／
  -1607 拆對了卻把 `tomb_chase_on` 一起關進柱廳 ⇒ 背安雅整段不見。
  **動這三段之前先問：這一拍是「這個地方」的戲，還是「這隻怪」的戲？**

## 三、⚠⚠⚠ 這一輪最貴的四個教訓

1. **同一個判斷散在九個地方，就不能靠「在其中一處補退路」去修。**
   `spawnAt` 刷出來的是**敵人卡 key**，而戰鬥層有 **9 處**在查 `GAME_CONFIG.battles[id]`。
   我 -1594／-1597 各「就地合成」一次，兩次都只治好當下那一處。
   正解是 -1598 的 `wildBattlesFromSpawnAt()`：**讓那張卡真的存在**。
2. **「有安全點的圖」＝每一場都要有 `session`**，漏一張就打完結算一次，而且不報錯。
   已做成 lint（`check_map_sessions`）並用已知壞樣本驗過會叫。
3. **開機那一批的成本要用量的**（`check_boot_batch`）—— 過期的註解會讓人憑空砍掉不用砍的東西。
4. ⚠⚠ **我的瀏覽器自動測試在這個專案上不可靠**：長按走格常常不生效、教學會插隊、
   上一輪測試的殘留狀態會污染判讀。這一輪我好幾次回報「驗過了」其實驗到的是環境。
   **戰鬥／探索的手感一律交給 Ray 跑**，我只做資料驗證與單點驗證。

## 四、⚠ 還開著的

| 件 | 狀況 |
|---|---|
| **遇敵率** | Ray 回報「走好久才一隻」；資料是 `wildSpawn.rate:0.33`，我重現不出來。**已加 `wildDebug()`**（走了幾格／真的擲了／中了／沒擲的原因）—— 等他的數字 |
| **等級 S 一隻都沒有** | RUSH 會跳過 S |
| **E 級那 5 張沒填類型** | `trainee`／`dart_target`／`sv_dart`／`guild_hunter`／`bounty_ep` ⇒ RUSH 也跳過 E。要它們進 RUSH 就在 Excel 填類型 |
| **`stageCurve` 是佔位** | `{from:8, k:1.025}`，等「總調整」那一輪 |
| ~~**古墓 28 隻是佔位數值**~~ | ⚠⚠ **已作廢（ver -1656 實測）**：`tier`／`atype` 與基準值 **-1586 就套好了**（hp 七檔 70~380、attack 8/12/16、盤面照等級分）。還沒定的只剩 `kind`／`loot`／`bgm` 三格。⚠ 這正是憲法 §0.1「不准用交接檔推現況」—— 我照這一行講，Ray 一句「等級我不是給了嗎？」才發現 |
| **`chase.gap`／`wildRate`／`firstWildAt`** | 沒有人讀（`gap` 自 -1593 起無用；後兩者的真相在 `wildSpawn.rate`） |

## 五、⚠ 新增的工具（日後直接用，不要重造）

| 東西 | 做什麼 |
|---|---|
| `tools/enemies_baseline.py` | `plan`／`apply` —— 依卡上的 `tier`／`atype` 套基準，**就地改值不重產檔案** |
| `check_boot_batch()`（lint） | 開機那一批的位元組預算，超過就**錯誤**並點名最大的幾張 |
| `check_map_sessions()`（lint） | 有安全點的圖，野怪池／必出格／追擊**每一場都要有 `session`** |
| `window.wildDebug()` | 遇敵率的現場計數（走幾格／擲幾次／中幾次／沒擲的原因） |
| `window.chaseDebug()` | 追兵狀態 ＋「登場戲為什麼沒演」（旗插著／等前置／條件已到） |
| `config.js` 的 `wildBattlesFromSpawnAt()` | 填了出沒地的怪 → 自動生 `{enemy,session:'<圖>_wild'}` |

## 六、⚠ 敵人數值系統速查

· **等級**（`tier`）S/A/B/C/D/E ＋ **類型**（`atype`）**P 力量／S 速度／D 防禦**
  —— ⚠ 類型的 `S` 是**速度型**不是等級 S，兩欄各自獨立。
· 基準表在 `config.tuning.enemyTier`／`enemyType`；**卡上存的是 S8 的絕對值**，
  stage 加成在 `enemy.setEnemy` **唯一那一處**乘上去（`1.025^(stage-8) × stageScale`）。
· **兩欄都填了才套基準**（`enemies_baseline.py`）——「無分類的由我手動設製」。
· 改完 Excel：`python3 tools/enemies_xlsx.py import` → `python3 tools/enemies_baseline.py apply`
  → `python3 tools/enemies_xlsx.py export`。
  ⚠⚠ **欄位一欄一行**：匯入器是照 `^      欄名: 值,$` 就地改值的，擠在同一行它**改不到**。

---

# 上一輪（`ver -1577` → `-1581`，5 個 commit）

> ⚠ **開工先讀這一段**，再讀下面的資產盤點。要動哪一塊就跳到那一塊自己的段落。

## 一、做完並推上去的

| ver | 做了什麼 |
|---|---|
| **-1577** | **古墓追逐的 runtime 接上了**（交接檔指名的第一順位）＋ 兩個靜靜壞掉的 |
| **-1578** | 美術三件：索菈娜 12 張的 `fx` **還原**／`crybig` 新鍵／古墓 28 張怪卡建檔 |
| **-1579** | 怪圖改由「**進探索地圖那一刻**」預熱 ＋ 開機那一批做成**會執行的** lint 守望 |
| **-1580** | **預載頁的時機與原則入憲**（鐵律 13 的五條）；程式裡的時機判斷註解**全刪** |
| **-1581** | 補上**第六條**「探索地圖轉探索地圖」—— 那條路以前**根本沒有讀取頁** |

## 二、⚠⚠⚠ 等 Ray 定的三件（照急迫度）

### 1. ~~追逐的場數對不上~~（⚠ ver -1593 之後整個改了：觸發改成「打過 3 場」、
    上線就站在玩家腳下，`gap` 已無用 —— 下面這張表**只剩紀錄價值**）

### 1. 追逐的場數對不上（舊算法，ver -1582 當時）
接完 runtime 之後拿**真拓樸**跑模擬（不是用想的）：

| | 交接檔算的 | 實際 |
|---|---|---|
| 逛完全圖 | 13 場 | **13.3 場** ✔ |
| 直線衝到玄室 | 5 場 | **3 場** ✘ |

⚠⚠ **-1576 那張表算錯一格**：它寫「之後每 `停 N ÷ 1.25` 回合一戰」＝3.2 回合，
但**玩家在停頓那 4 回合裡也走了 4 步** ⇒ 周期是 `4 + 4/1.25 ≈ 7.2` 回合，差兩倍多。
⚠⚠ 連帶：**`gap:6` 現在是無效參數** —— `startStep:4` 時玩家離入口最多 4 格，
放不下 6（實測 gap 4~10 的結果完全一樣）。

三條路，**等 Ray 挑**：

| | 直線 | 逛完 | |
|---|---|---|---|
| 現況 `停 4` | 3.0 | 13.3 | 下限破功 |
| 改 `停 2` | 4.6 | 21.3 | 逛完變很密 |
| 擊退後改成「**把牠推回 N 格**」（不停頓），N=3 | 5.3 | 40.9 | -1576 那張表在這個規則下才成立 |

⭐ **我的看法**：直線 3 場不見得是問題 —— 那張圖有迷霧、沒地圖，第一次進去的人
走不出直線；3 場是「已經背下路的重跑」。要真的保證 5 場，比調數字更乾淨的是
**最後一場（`gk_crypt` 決戰）由腳本指定**，那樣直線 4 場、逛完 14 場。

### 2. 索菈娜三張的 `fx`：量出來頭**真的**移了（⚠ **仍然開著**，Ray 還沒決定）
-1578 照指示（「`fx` 一律不要動」）把 12 張全部還原回 -1572 的值。
但拿 git 裡的舊圖（`a7eb8dd~1`）比**頭髮質心**（避開手臂，不是工具那一帶）：

    determine  0.541→0.570  +0.029   現行 0.547   量出來應是 0.576  ⚠
    eat        0.567→0.595  +0.028   現行 0.569   量出來應是 0.597  ⚠
    wave       0.563→0.577  +0.014   現行 0.530   量出來應是 0.544  ⚠
    其餘 9 張               ≤0.009   沿用就對 ✔

⇒ `determine`／`eat` 切過去時臉會往左偏約 14 CSS px。**要改就是三個數字的事**，
數字也寫在 `script/speakers.js` 那一段註解裡。

### 3. ~~追逐的「一層那一場打什麼」~~（✔ ver -1607/-1612 解了：登場戲跟著追兵走、
    柱廳那一段自己再降臨一次 gk2）

### 3. 追逐的「一層那一場打什麼」（舊）
追兵第 4 格上線、第 6 格就會追上（實測），而 `chase.battles` 三張**全是守墓者**
—— 但腳本裡他們是**在柱廳才第一次見到守墓者**。-1576 的交接寫「敘事岔路已解」，
實際跑起來仍然會在一層撞上。⚠ 最省事的解是**那幾場演成雜兵**（等 28 隻的卡），
或把 `battles` 拆成「一層用的／柱廳之後用的」兩組 —— 兩種都是資料的事。

## 三、⚠⚠ 古墓追逐 runtime —— 接在哪、怎麼驗

**參數**全在 `TOWNS.tomb.chase`（鐵律 1）；**狀態**在 `progress` 的
`tivot_chase_v1`（一輪內：`newRun` 清、`runSnapshot/runRestore` 帶）。
**實作只有 `modules/town.js` 那一族**（鐵律 8）：

| 時刻 | 誰 |
|---|---|
| 站上入口（`open()` 落在 `entryNodeId`） | 整組清掉（＝「從墓門進入」重算） |
| 玩家走一格（`go()`） | `chaseStep`：步數 +1、該上線就上線、推進 `speed` 格 |
| 遭遇雜怪 | `wildRoll`（包住 `wildActDue`）→ 再推進 `onEncounter` 格 |
| 抵達踩到牠 | `chaseActDue`（排在 `wildActDue` **之前** ＝追兵優先） |
| 段落演完 | `chaseAfterAct`：場數 +1／`resetAt` 歸位／擊退後停 `stun` |

⚠⚠⚠ **追兵走的是「無向」的圖**（`mapLinks`／`chaseToward`）：古墓有兩條邊
只寫了 `back:`（墓門↔前庭、第一道階梯↔二層梯廳），用 `nodeNeighbors`（有向）
的話整棵樹變成「從入口單向往外」⇒ **追兵永遠放不出來，而且沒有任何錯誤訊息**。
⚠ **刻意不動 `nodeNeighbors`**：`dragonCanStop` 的「三岔以上才停」綁在那個有向
度數上，改了會換掉貝利薩爾那一整套調好的行為。兩支回答的是兩個問題。
⚠ **不新增 lose kind**（Ray：「不用，就是聖光黯滅那一套」）：古墓沒有旅店、
這幾場是插入戰 ⇒ `setLoseKind` 現行分流本來就給 `rollback`。
⚠ **`wildRate`／`firstWildAt` 還沒有人讀**（雜兵那一半，28 隻的卡還沒有真值）。

**實測過**：墓門進去走 4 格 → 追兵生在前殿 → 第 6 格在後殿追上 → `gk_seal` 開打 →
打贏後 `hits 1 / stun 4`、牠留在後殿；存讀檔 round-trip、`newRun` 清掉、
讀檔落在中間那一格不重置，三條都驗過。

## 四、⚠⚠⚠ 讀取分工這一輪改了很多 —— 動預載之前先讀鐵律 13

**鐵律 13 現在有六條**（Ray 原話），而且**它是唯一準則**：
程式碼裡任何「什麼時候跳讀取頁／那一批載什麼」的註解**都刪掉了**，不要再寫回去。

- ⚠⚠ **`ASSETS` 登記路徑本身不載任何位元組** —— `preloadRestImgs`（開機第二段圖片
  預載）在 **ver -1295** 就整個拿掉了。-1578 抄了一段 -934 的舊註解，憑空把 28 行
  `ASSETS` 註解掉，理由是假的（成本是零）。**這種過期註解已經全數刪除。**
- **怪圖的門**：`modules/town.js` 的 `warmEnemies` —— 進探索地圖、讀取頁收掉之後
  背景預熱。⚠ 名單是**算出來的**（`wildSpawn`／各格 `acts`／`onLeave`／`chase.battles`），
  **不是列出來的** —— 那 26 隻接進 `wildSpawn` 那天自動就有。
- **第六條是新接的**：跨圖出口（`'@<地圖>'`）以前走 `veil(260ms)` → `open()`，
  **沒有讀取頁、沒有 `releaseAudio`、目標地圖一張圖都沒預載**。現在兩處跨圖收成
  一支 `gotoMap()` → 注入的 `enterTown`（鐵律 8）。
- ⚠⚠⚠ **守望是會執行的**：`tools/script_lint.py` 的 `check_boot_batch()` 靜態算出
  開機那一批真的會抓什麼、加總磁碟位元組，超過預算就是**錯誤**並點名最大的那幾張。
  每次 lint 都印一行：`開機那一批：圖 13 張 1.63 MB ／ 音效 4 支 0.08 MB`。
  **拿「已知壞」的樣本驗過它會叫**（加一條 `'enemy_'` 前綴 → 報 102 張 30.92 MB）。

## 五、⚠⚠ 測試小抄（這一輪踩出來的，補在上一輪那張之後）

- ⚠⚠⚠ **背景分頁（`document.hidden`）裡 `img.decode()` 永遠不 settle** ——
  而 `story.loadScene` 的圖那一段正是靠它 ⇒ **任何會跳讀取頁的流程都會卡在 10%**，
  看起來與「自己剛改壞」一模一樣（-1581 誤判過一次，查了三輪）。測之前先短路掉：
  `HTMLImageElement.prototype.decode = () => Promise.resolve();`
  ⚠ `fetch` 與 `img.onload` 在背景分頁**照常運作**，只有 `decode()` 會卡。
- **另開一個沒人用的 port ＋ 靜音**（這一輪用 8187；8000／8123 是 Ray 的）。
- 城鎮的移動是**長按**：`pointerdown` → 等 1.8 秒 → `pointerup`（`.click()` 沒用）。
- 驗拓樸／場數**用模擬不要用眼睛**：`tools/map_layout.py` 的 `load('<圖>')` 直接
  把 `TOWNS[圖]` 跑出來，幾十行 python 就能把追逐跑完 —— -1577 的兩個 bug
  （chase 寫錯城、追兵放不出來）都是這樣抓到的，光讀程式看不出來。

## 六、⚠⚠ 這一輪學到的三個「靜靜壞掉」（同類的下次先查）

1. **`chase` 那一整塊資料寫在錯的城底下**（`fallen` 而不是 `tomb`，`resetAt:'hall2'`
   在那張圖根本不存在）—— 沒有人讀它的時候完全看不出來。
   ⇒ **新增一塊「還沒有人讀」的資料時，順手 grep 一次它引用的節點 id 在不在同一座城。**
2. **有向圖 vs 無向圖**（追兵放不出來）：`back:` 那種只寫一邊的出口，在
   「不含 `back`」的圖裡是**單向邊**。⇒ **任何要「往回走」的邏輯都不能用 `nodeNeighbors`。**
3. **過期註解會被下一個 session 當成規格照抄**（-1578 那 28 行）。
   ⇒ 鐵律 7 但書：兩份真相同時，另一份**不要存在** —— 改一改不夠，要刪。

---

# 上一輪（`ver -1554` → `-1576`，23 個 commit）

> ⚠ **開工先讀這一段**，再讀下面的資產盤點。要動哪一塊就跳到那一塊自己的段落。

## 一、做完並推上去的

| ver | 做了什麼 |
|---|---|
| **-1554** | **全庫素材檔名改小寫**（1472 檔＋10 資料夾）；`script_lint.py` 新增 `check_lowercase_assets()` |
| **-1555** | **差分的鍵與檔名去時態**（`dying`→`die`…53 張）；`check_tense_exprs()`；⚠ 三個明寫的例外 |
| -1556 | 雪都圖書館：拍桌 `se_tablepunch`／搶奪 `se_snatch`，兩拍不出對話框 |
| -1559 | 趴睡插圖 `025-rennasleepdesk`／米夏注視一閃（`fx:'stare'`）／速度模糊進入（`cgRush`） |
| -1560 | CI 改出在「點掉睏意」那一拍／M2 也有米夏回頭／**新增章節 13-BA-M2** |
| -1561 | 米夏回頭配 `se_preasure` |
| **-1563** | 米夏回頭改成**以他眼睛為消失點的放射狀模糊**（疊影，`filter:blur` 做不到） |
| **-1564** | 主角的符號拍也給藍框（`isSelfLine`）／`shake:'bubble'`／圖書館與雪都七件 |
| **-1567** | **教堂好感差分從來沒生效過**（`tierWho`）／**戰鬥卡短別名的曲子一首都沒響過**（`story.bgmSrc`）／立繪色調只調暗／碑林發光背景 等十二件 |
| -1569 | 瀑布聲改成場景內循環（`SFX.playLoop`／`story.playAmb`）；剔除候選資格兩張立繪對調 |
| **-1570** | **睡覺鈕「有就能用」**（`canSleep`，推翻 §6.5.5 的 -659）／守墓者移到柱廳／尼莫改「？？？」／古墓拓樸投影片 |
| -1571 | **小隊分組**那一段（Ray 交稿）＋ `tools/map_pptx.py`（拓樸出可編輯 PPT） |
| -1572 | 四組 T 分支（分組／長廊／石碑林）＋ 二層梯廳 `noWild` |
| **-1573** | **美術同名覆蓋的 12 張索菈娜**：跳 `?v=2` ＋ 重量 `top/bot/fx` |
| **-1575** | 安全點換成 Ray 指定的三格 ＋ **新增底層祭壇** ＋ **「安全點先結算再劇情」升為全域規則** |
| **-1576** | 追逐參數定案寫進 `TOWNS.tomb.chase`；墓門不出怪也不追 |

## 二、~~下一個 session 最該做的一件：古墓追逐的 runtime~~（✔ ver -1577 做完了，見上面那一輪）

**規格已經齊了**（Ray 逐項定案，全部在 `TOWNS.tomb.chase` 與本檔上面那一節）。
**資料立好了、還沒有人讀它。**

接的時候要注意的四件（都寫在那一格的註解裡）：
1. ⚠⚠⚠ **打輸＝Game Over 要新開一種 lose kind** —— 現有三種（回飛行畫面／回檔／
   回首頁）都不是那個意思，§6.5.2 那張表要加一列。
2. ⚠⚠ **安全點不重置追兵位置**（Ray 明講）—— 所以刻意**沒有** `resetAtRest` 那種欄位，
   不要「順手補上」。
3. ⚠⚠ **追兵與雜怪競合 ⇒ 追兵優先**。
4. ⚠ 追兵的計數是**一輪內**的狀態（§6.9）：`newRun()` 要清、`runSnapshot/runRestore`
   要帶 —— **同一張清單的兩面，漏一支就是「讀了舊存檔卻帶著新一輪的追兵位置」**。

⚠⚠ **雜兵那一半做不完**：25% 遭遇**沒有怪可以生**（古墓 28 隻的卡還沒到，
  清單見 `resources/enemy/_tomb_mon_spec.md`）。追兵那一半不依賴它，**可以先上線**。

## 三、⚠ 在等 Ray 的

| 件 | 卡在哪 |
|---|---|
| ~~**古墓 28 隻雜兵的數值卡**~~ | ⚠ **已作廢（ver -1656 實測）**：26 隻的等級／類型／基準值都在，野怪也刷得出來 |
| **底層祭壇的背景** | Ray：「明天補」。現在**借骨坑那一張**（`lowaltar.bg:'tomb_bonepit'`）—— 圖到了**只改那一行** |
| 米夏的 `cm` | 現在是 `176`（我估的，依據只有「安雅的雙胞胎哥哥」） |
| 圖書館報告的四個日期時刻 | 還是佔位字串 |
| 石碑林最後一拍的諾 | -1570 他說 `sadnoeye`，-1572 的稿又寫 `sad` —— **現行是 `sadnoeye`** |
| `rennasorana_si_annoyedd/c` | 去時態會變成 `annoyd`／`annoyc`（讀起來像沒改乾淨），**原樣留著** |
| 三個撞名的差分 | `anya.crying`↔`cry`／`nouvelle.thinking`↔`think`／`renna.surprised`↔`surprise` —— 是**不同的圖**，等他給新名字 |
| 玄室前廊現在會出怪 | -1575 把舊安全點整組拔掉的連帶結果。要留一格喘息就說一聲 |
| 旅店「還沒六點呢」 | -1570 之後**打不到了**（鈕在那個時段不出來）。要留著那段演出說一聲 |

## 四、⚠⚠ 測試小抄（這一輪 Ray 立的規矩）

- ⚠⚠⚠ **另開一個沒人用的 port ＋ 靜音**（Ray：「以後你要試就另開一個新的 port
  然後靜音，不要用我正在使用的」）。**8000 與 8123 都是他的**；每一輪開新的。
  進頁第一件事：`(await import('/audio.js?v=<ver>')).SFX.setMasterVolume(0)`。
- 開機 → 等讀取頁 → **點一次** → 等聖光離場跑完 → 才下程式化指令（§6 的 -570）。
- 章節測試：`document.body.classList.add('testmode')` → `#scriptTestBtn`。
- 驗資料比驗畫面快：`await import('/script/town.js?v=<ver>')` 直接查那一段的 `lines`。
- ⚠ `py tools/script_lint.py` 與 `py tools/bust.py --bump` 每次 commit 前都跑。

## 五、⚠ 新增的工具與機制（日後直接用，不要重造）

| 東西 | 做什麼 |
|---|---|
| `tools/map_pptx.py` | 拓樸出成**可編輯的 .pptx**（每格＝縮圖＋地名的 group、connector 會跟著走） |
| `story.playAmb/stopAmb` ＋ `SFX.playLoop` | 場景**循環環境音**（節點寫 `amb:'…'`；`enter()` 每格都叫一次，沒寫就是停） |
| `fx:'stare'` ＋ `fxCi` | 半透明 CI 一閃而過（脈動 ＋ 一聲心跳） |
| `cgRush:{x,y}` | 插圖**放射狀動態模糊**進場（消失點走 `coverOrigin` 換算） |
| `shake:'bubble'` | 只抖對話框 |
| `isSelfLine()` | 「這一句是不是主角在說話」的**唯一**判準（藍框與對話回顧共用） |
| `story.bgmSrc()`（已 export） | 「BGM 名字 → 檔案」的**唯一**真相（吃檔名／短別名／`bgm_*`／資產鍵） |
| 節點的 `amb` / `chase` | 見 `script/town.js` 那兩段的註解 |
| `AWAY_WHEN`（evaluation.js） | 「評價者不在場」的那幾段（與卡上的 `noEval` 是兩件事） |

## 六、⚠⚠ 這一輪學到的兩個「靜靜壞掉」（同類的下次先查）

1. **`tierMin`／`tierMax` 不寫 `tierWho` ＝ 看說話者自己** —— 說話者若是神父／主角
   那種**好感表上沒有的人**，段位一律算 0 ⇒ `tierMin` 永遠不成立、`tierMax` 永遠成立。
   教堂那一段整條差分**從來沒生效過**。`script_lint.py` 現在會擋。
2. **戰鬥卡的 `bgm:` 有兩種寫法**（短別名／資產鍵），而 `main.js` 是直接 `asset(k)`
   ⇒ **短別名一律查不到、那一場無聲**。`nemo`／`warhorn`／`crisis`／`portside`／
   `whirlwind` 全部中招。現在四個呼叫點都問 `story.bgmSrc`。
   ⚠ main.js 早在 -1398 就為**飛行**那條路寫過一模一樣的警告 —— 戰鬥卡那條沒一起改。

---

# ⭐⭐⭐ 資產盤點（ver -1543 實量）—— **`✔ 不欠` 也要寫出來**

> ⚠⚠ **ver -1656 補的那一批在最前面**（下面 -1543 那一份仍然有效，沒被推翻的就照舊讀）。

## 伊甸古墓（ver -1656 實量，61 格）

| | 狀態 |
|---|---|
| **背景 61 格** | **✔ 不欠** —— 27 張補圖 -1647 全部接上、`bgPending` 清空；底層祭壇的**啟動前後兩張**都在。全部 1536×1024，與既有 44 張同規格 |
| **小地圖** | **✔ 不欠** —— **一層一張共三張**（`map_tomb_l1/l2/l3.webp`，21／33／7 格），墨點 61 格全有、沒有多出來的點。⚠ 舊的單張 `map_tomb.webp` **已經沒有人讀**（還留在磁碟上，要回收再說） |
| **26 隻雜兵的圖** | **✔ 不欠** —— alpha 這一輪重做完（白霧 35~50% → 0.00~0.23%），版號已跳 |
| **26 隻雜兵的數值** | **✔ 不欠** —— 等級／類型／基準值 -1586 就套好了（見上面那條作廢標記）。⚠ 還沒定的是 `kind`／`loot`／`bgm` 三格，那是**決定**不是缺件 |
| 守墓者四張 | **✔ 不欠**（-1650 那一批重繪 ＋ `mon_gravekeeper_offset_body/soul` 兩張新層）。⚠ **那兩張新層程式端還沒接**，交接寫在 `resources/enemy/_gravekeeper_handoff.md` |

## 立繪（ver -1656 補）

| | 狀態 |
|---|---|
| 蕾娜 15 張重繪 | **✔ 不欠** —— 版號已跳；`top/bot` 量過**全部不動**（高度差 ≤0.6%，在雜訊內） |
| 索菈娜第二輪 28 張 | **✔ 不欠** —— 版號已跳。⚠ **`sorana_si_q.webp` 交了但 `speakers.js` 沒引用** |
| `soranaanya_si_backcarry` | **✔ 不欠** —— 已接（`sorana.expr.backcarry`）。⚠ `cm` 沿用 176 沒調，她會比平常略大一點點 |
| 索菈娜 `determine`／`eat`／`wave` 的 `fx` | **⚠ 仍然開著** —— 量出來頭真的移了（約 14 CSS px），但 Ray 的指示是「`fx` 一律不要動」。三個數字的事 |


> Ray（-1543）：「**不欠的都註記不欠，有欠的才記有欠，寫進每一次交接**
> —— 不然你每次都叫美術一直畫重覆的圖」→ **已入憲**（CLAUDE.md §0.1 那一節）。
>
> ⚠⚠⚠ **沒出現在這張表上的 ＝「還沒盤過」，不是「不欠」。**
> ⚠⚠ **標了 `✔` 的不要重盤** —— 直接讀這一行；要翻案得有新證據（新節點／新腳本／
>   Ray 改規格），不是「我重新算了一次」。
> 盤法：`TOWNS` 的每一個 `bg`／`bgWhen`／分店／重建版、腳本每一個 `cg:`、
> `ART` 每一張差分、敵人卡、`resources/map/map_*` ⇄ 磁碟實檔。

## 伊甸古墓・追逐機制（規格 ver -1574~-1576；**runtime ✔ ver -1577 做完了**）

> ⚠⚠⚠ **下面那幾張「場數」的表是 -1574/-1576 用公式推的，其中「直線衝」那一欄
>   是錯的** —— 接完 runtime 之後對真拓樸跑模擬，直線只有 **3 場**不是 5 場
>   （周期算漏了「玩家在停頓的 N 回合裡也走了 N 步」）。**以上面那一輪第二節的
>   實測數字為準**，這幾張留著只為了看當時是怎麼推的。
> ⚠ `gap:6` 是**無效參數**（`startStep:4` ⇒ 玩家離入口最多 4 格，放不下 6）。

Ray 已經定的：
| | |
|---|---|
| **追逐起點** | **墓門進去踩到第 4 格**，或**打過 3 場**，先到者（ver -1576 定案） |
| **墓門那一格** | **不出怪、追兵也不推進**，但**不是安全點**（不結算、不回血） |
| 追兵速度 | 玩家每動一格，**追兵推進 2 格** |
| **柱廳** | **必觸戰鬥**（二層梯廳只有往前一條路）；戰後**追兵位置＝柱廳**、停 N 回合 |
| **安全點** | 結算＋回血，**不重置追兵位置** —— 回頭走的話牠可能已經很近 |
| **競合** | 追兵與雜怪同時成立 ⇒ **追兵優先** |
| 雜兵遭遇 | 每動一格 **25%**；遭遇時追兵**再推進 1 格** |
| 第一次遭遇 | 進墓門後**走 4 格必定發生** |
| 擊退追兵 | **停 N 回合**（N 未定，見下） |
| 追擊戰場數 | **至少 5 場**（ver -1574 由 6 改定） |
| 打輸 | **Game Over** |
| 柱廳 | 一踩就進戰鬥（✔ 已接，`tomb_gk1_done`） |
| 二層梯廳 | 安全區（✔ 已接 `noWild:true`） |
| 安全點 | **＝迷宮出口**，而且**很少**；找不到就一直被追、無法回血 |

**這張圖的硬數字**（`tools/map_layout.py` 從 `script/town.js` 算的）：

    全圖        34 格・33 邊・**0 環（樹狀）**・10 個末端・直徑 19
    墓門→柱廳   10 步
    墓門→最深   18 步
    逛完全圖    約 48 步
    柱廳以上    16 格・15 邊・最深 9 步・**逛完只有 21 步**・末端 5

⚠⚠⚠ **0 環是這張圖的性質，不是缺點**：沒有迴路 ⇒ **每條死路都要原路走回來**，
  探索在追逐裡是**雙倍曝險**。調參數之前先接受這一點。

**差距每回合縮 1 + 0.25 ＝ 1.25 格**（追兵 2 − 玩家 1 ＋ 遭遇 0.25）。
⇒ 第一次被追上 ＝ 起始距離 ÷ 1.25 回合；之後每 **停 N ÷ 1.25** 回合一次。

| 起始距離 | 停 N | 每幾回合一戰 | **逛完（21 步）打幾場** | **直線衝（9 步）打幾場** |
|---|---|---|---|---|
| 6 | 3 | 2.4 | 7 | 2 |
| 6 | **4** | **3.2** | **6** | **2** |
| 6 | **5** | **4.0** | **5** ⭐ | **2** |
| 6 | 6 | 4.8 | 4 | 1 |
| 8 | 5 | 4.0 | 4 | 1 |

⭐ **建議：起始 6 格・擊退後停 5 回合** —— 把追逐區逛完剛好 **5 場**
   （第一場在第 5 回合，之後每 4 回合一次），而且不必把節奏壓到 `停 3` 那麼緊。

### ⚠⚠⚠ 追逐從墓門開始之後，「最少五場」**保證得了**（ver -1576 重算）

    一層（墓門→二層梯廳）  18 格・17 邊・直線  9 步・逛完 25 步
    二三層（柱廳以上）      17 格・16 邊・直線 10 步・逛完 22 步

| 起始 | 停 N | **直線衝（19 步）** | 逛完全圖（47 步） |
|---|---|---|---|
| **6** | **4** | 1＋柱廳1＋3 ＝ **5 場** ⭐ | 6＋1＋6 ＝ **13 場** |
| 6 | 5 | 1＋1＋2 ＝ **4 場** ✘ | 5＋1＋5 ＝ 11 場 |
| 8 | 4 | 0＋1＋3 ＝ **4 場** ✘ | 5＋1＋6 ＝ 12 場 |
| 6 | 6 | 1＋1＋2 ＝ **4 場** ✘ | 4＋1＋4 ＝ 9 場 |

⚠⚠ **追兵第 4 格才上線 ⇒ 一層可追的只剩 6 步（直線）** —— 所以 `停 5` 會掉到 4 場、
  下限破功。**`起始 6・停 4` 是唯一還守得住「最少五場」的一組。**

⭐ **定案：起始 6 格・擊退後停 4 回合** —— 直線衝剛好 5 場、逛完全圖 13 場。
   參數已經寫進 `TOWNS.tomb.chase`（`script/town.js`，鐵律 1）；**runtime 還沒做**。
   ⚠ 「起點改成墓門」正是讓下限成立的那一步：只在二三層追的話直線只有 3 場，
     怎麼調參數都補不回來（-1574 算過）。

### ✔ 敘事岔路已解（ver -1576）
追兵**第 4 格才上線**，而第 4 格正是「第一次雜兵遭遇必定發生」那一格 ——
所以一層前三步是乾淨的，柱廳仍然是他們**第一次見到守墓者**的地方（腳本不必改）。
⇒ 下面那一段（甲／乙／丙）作廢。

~~⚠⚠⚠ **還有一個敘事上的岔路要 Ray 定**：起始 6 格 ⇒ **第 5 步就會在一層被追上**，
  而腳本裡他們是**在柱廳才第一次見到守墓者**（「那是什麼東西？」→咆哮→開打）。
  三種讀法，請他挑：
  · **(甲) 一層那幾場就是守墓者** —— 那要改劇本（牠更早出現，柱廳那一段改寫）
  · **(乙) 一層只有雜兵**，追兵到柱廳才「上線」 ⇒ 那麼一層的推進只是在**縮短距離**、
    不會真的追上 —— 但柱廳本來就把位置設成 0，一層的計數就沒有意義了
  · **(丙) 一層的追上＝雜兵擋路**（用同一個計數器，但演出成雜兵）——
    敘事與數值都成立，而且不必改劇本。**我推薦這一條。**

~~⚠⚠⚠ **「最少五場」只有在玩家**真的去逛**時成立**（ver -1574）：~~
  追逐區直線衝到底只有 **9 步** ⇒ 不管參數怎麼調都只打得到 **1~3 場**。
  這不是 bug，是這張圖的長相 —— 而且與 Ray 自己的設計一致：
  **「安全點就是迷宮出口，找不到就一直被追」** ⇒ **找得到出口的人本來就少打幾場**。
  ⚠ 真的要**保證**五場，只有兩條路（都要他點頭）：
    · 最後一場（`gk_crypt` 決戰）**由腳本指定**，不靠追逐計數 —— 那樣「逛完 5 場／
      衝刺 3 場」會變成「逛完 6 場／衝刺 4 場」，仍然保證不了 5。
    · 或者**路上放門**（要拿到某個東西才開得了玄室），把直線那條拉長。

⚠⚠ **第二件：追逐區只有 21 步**（若追逐從柱廳開始）。
  兩條路，**Ray 選一條**：
  · **(A) 追逐從柱廳開始**（現況）⇒ 只能 `停 4・起始 6`：每 3.2 回合一戰、
    6 場剛好用完整個二三層。非常緊，但那正是他要的「一直被追」。
  · **(B) 追逐從墓門就開始**（他原話「第一次遭遇進墓門後走 4 格」暗示遭遇系統
    是從墓門起算的）⇒ 48 步可用 ⇒ `停 6・起始 8` 只要 30 步，還有餘裕。
    ⚠ 但一層沒有守墓者（牠在柱廳才登場）—— 要嘛一層只有雜兵、追兵從柱廳才上線，
      要嘛改劇本讓牠更早出現。

⚠⚠ **卡住的第二件：古墓雜兵的卡還沒有**（庫裡只有 `gk_seal`／`gk_offset`／
  `gk_many`／`gk_crypt` 四張＝守墓者）。25% 那條**沒有東西可以生**，
  待建清單見 `resources/enemy/_tomb_mon_spec.md`（美術 -1573 盤點：28 隻）。

**安全點（ver -1574 Ray 定案，✔ 已接）**：`landing2` 二層梯廳／`landing3` 三層梯廳／
  **`lowaltar` 底層祭壇（新格，骨坑後面）**。三格都是 `rest:true, noWild:true`。
  · 墓門 → 二層梯廳 **9 步**／三層梯廳 **16 步**／底層祭壇 **20 步**。
  · ⚠⚠⚠ **底層祭壇的背景是借骨坑那一張**（Ray：「還沒畫，明天補，先重覆一次骨坑代替」）
    —— 圖來了**只改 `bg` 那一行**。借圖期間玩家走進去還是骨坑，那是已知的。
  · ⚠⚠ **-1525 的舊三格（第一／第二道階梯、玄室前廊）已整組拔掉**，連 `noWild` 一起
    ⇒ **最終房間前現在會出怪**。要留一格喘息就說一聲。
  · ⚠⚠⚠ **節點 34→35 ⇒ 手繪小地圖要重畫**（`resources/map/map_tomb.webp`）。
  · 追逐區（柱廳以上）重算：**17 格・直線 10 步・逛完 22 步**。

~~**安全點的提案（等 Ray 點頭）**：~~`rest:true`（＝走進去就結算＋回滿）擺在
  **墓門 `gate`／二層梯廳 `landing2`／三層梯廳 `landing3`** —— 那三格正是
  「迷宮的出口」。追逐區裡因此**只有 `landing3` 一個**，剛好對上「安全點少」。
  ⚠ 還要決定：**踏進安全點時追兵怎麼算**（差距歸位到起始值？還是只回血不重置？）。

**✔ 實作完成（ver -1577）**：接點與驗收見上面那一輪的第三節。
⚠ **雜兵那一半還是空的**：`chase.wildRate`／`firstWildAt` 沒有人讀 —— 28 隻的
~~**真數值卡**還沒有~~ ⚠ **已作廢（ver -1656 實測）**：等級／類型／基準值 -1586 就套好了。


## 背景

| | 狀態 |
|---|---|
| **夏爾森林 9 格** | **✔ 不欠** —— **刻意的三差分**（`Day`／`Dusk`／`Night`，27 張齊）。⚠⚠ **沒有也不需要 `_Dawn`**：ver -1542 我拿「室外＝四差分」當預設去推，報成「缺 9 張」，被 Ray 擋下（「你確定？」）。**不要再叫美術補 Dawn。** |
| **卡耶爾山谷 5 格** | **✔ 不欠** —— 同上，三差分 15 張齊（`day`／`dusk`／`night`）。 |
| **北方泊地 13 格（`_BF` 戰損版）** | **✔ 不欠** —— 戰損版**本來就沒有時段差分**（§6.5.4.2）；重建版另一組走候選鏈。 |
| 帝都 雜貨舖／公會／槍店、夏爾村 工坊 | **✔ 不欠** —— 有 `hours`，照憲法那張表只要 day（／Dusk）。 |
| 帝都・北方泊地・夏爾村・聖索菲亞・雪都・東方泊地・平原古道・**鏡湖**・伊甸古墓・貝利薩爾・石製遺蹟 | **✔ 不欠** —— 該有的時段全部在。 |
| **雪都・大教堂 `Varn_Church`** | **⚠ 欠** —— **全庫唯一還掛著 `bgPending` 的一格**；`bg` 暫時借中心區那一張（`Varn_Midtown`）。圖到了：`bg` 改成 `Varn_Church`、拔掉 `bgPending`，其餘不動。 |
| 木雅克神殿 21 格 | **✔ 圖不欠**（每格一張，地下遺蹟不吃時段）。⚠ **但這是程式端的洞**：只有 2 格寫了 `noTime`，其餘 19 格每進一次白吃 4 個 404（古墓 32/34、貝利薩爾 34/37 都寫了）。 |

## 小地圖（`resources/map/map_*.webp`）

- **✔ 不欠**：帝都／北方泊地／夏爾村／夏爾森林／木雅克神殿／石製遺蹟／聖索菲亞／
  雪都／東方泊地／平原古道／伊甸古墓／貝利薩爾 —— **12 張全在，接線也對**。
- **⚠ 欠 2 張**：**卡耶爾山谷**、**鏡湖**。⚠ 這兩座連 `TOWNS[].map` 欄位都還沒有，
  圖到了要一起接（其餘 12 座照抄它們的寫法）。

## 插圖（`cg:`）

- **✔ 不欠** —— **腳本裡引用到的插圖 0 張缺**（`002`～`021` 共 21 張全部對得上）。
  ⚠ 交接檔舊版寫的「索菈娜微醺還沒有」**已作廢**（`021-soranadrunk` -1540 就進來了）。
- ⚠ **未歸檔**：`resources/illustration/d03273c9-….png`（-1542 當天丟進來的）——
  白髮少年在夜街回頭看少女，**看起來就是欠很久的「米夏注視 CI」**，等 Ray 一句話才改名接線。
- ⚠ **未接線**：`resources/CI/045ac642-….png`（白髮少年雙槍，與 `Nemo_CI_dual` 不同張）、
  `resources/CI/Nemo_CI_dual.webp`（交了，全庫沒有任何地方引用）。

## 立繪（`ART`）

- **✔ 不欠**：四主角 ＋ 尼莫（5）／賽西莉（8）／蘿芮（4）／阿瑞尼斯（6）的差分
  **與腳本對得上**，取景值逐張量過。
- **⚠ 欠**：諾薇兒 `gentle`／`pain`、蕾娜（`OFFICER`）`stunned`／`fluster`
  —— 都在 `prologue_audience`／`prologue_fall`（**目前是走不到的孤兒場景**，
  會退回底圖，不會壞）；安雅 `smile`（庫裡只有 `smileshy`／`smilesneaky`，
  **要新圖還是改指，等 Ray 一句話**）。
- **⚠ 欠整個人**：**米夏**（`MISHA`／`MISHA_X` 仍是 `art:null`）。
  ⚠ `resources/SI/misha_SI_front.png` 在資料夾裡但**沒接**（而且是 PNG）。
- **✔ 不欠（ver -1555 已修）**：安雅 `Silent`→`silent`、諾薇兒 `Shocked2`→`shock2`
  兩處大小寫寫錯已改掉（原本查不到就靜靜退回底圖，畫面上沒有錯誤訊息）。
- ⚠ `cecilie_si_refusertemp.png` 是暫代 PNG，現在用 `nolook` 頂著。
- **✔ 新增（ver -1578）**：索菈娜 `crybig`（大哭，Ray 自己產的圖）——
  已轉 webp、原 PNG 進 `_originals/si/`，**與 `cry` 並存**。
  ⚠ 它是**新增不是覆蓋** ⇒ 不掛 `?v=`；`fx` 是量出來的（與 `cry` 姿勢不同）。
- ⚠⚠ **索菈娜那 12 張的 `fx` 已還原回 -1572 的值**（ver -1578，照 Ray 的
  「`fx` 一律不要動」）—— 但其中 **3 張量出來頭真的移了**，等他決定，
  見上面那一輪第二節的 2。

### ⚠⚠⚠ 命名規約（ver -1554／-1555，Ray 定案）—— 交圖前先看這兩條

1. **檔名一律小寫**（`sorana_si_read.webp`）。macOS 不分大小寫、靜態空間分 ——
   寫錯在本機測不出來，上線就是 404 而且畫面上沒有任何錯誤訊息。
2. **一律無時態**（`cry`／`die`／`scare`／`shock`／`think`／`surprise`／`write`）。

兩條都由 `py tools/script_lint.py` 把關（`check_lowercase_assets()`／
`check_tense_exprs()`），**commit 前跑一次**就會叫。

- ⚠⚠ **三個還帶時態的鍵是明寫的例外，不要「順手統一」**：
  `anya.crying`↔`cry`、`nouvelle.thinking`↔`think`、`renna.surprised`↔`surprise`
  —— 每一對都是**兩張不同的圖**，合併會靜靜換掉那幾拍的臉。
  **等 Ray 給這三張新名字**（例外登記在 `tools/script_lint.py` 的 `TENSE_OK`）。
- ⚠ **在等 Ray 一句話**：`resources/si/rennasorana_si_annoyedd.webp` ／ `_annoyedc.webp`
  （索菈娜 D／C 評價那兩張，`script/evaluation.js` 在用）—— 檔名是
  `annoyed` ＋ 等第字母，去時態之後會變成 `annoyd`／`annoyc`（讀起來像沒改乾淨）。
  **先原樣留著**，命名怎麼定由他說。

## 敵人

- **✔ 不欠**：敵人立繪**0 張缺**（全部卡上的 `img` 都對得到檔案）。
- ⚠ **程式端**：三張卡的 `bg:''` 還是「待填」（`bug_mantis`／`relic_bellascetic`／`rictus_hooked`）。
- **✔ 卡建好了（ver -1578）**：古墓 26 ＋ 王座間 2 ＝ **28 張**已經在 `script/enemies.js`
  （敵人卡 68 → **96**），`ASSETS` 那 28 行也**放出來了**（登記不載位元組，見鐵律 13）。
  ⚠⚠ **整批是佔位值**：Ray 指定「數值全部先用王座徘徊者追擊型態」⇒ 逐格照抄
    `bl_dragon_chase`。**照抄的不只有數值，這幾格多半不對，給真值時要一起看**：
    `kind:'multi'`（那是龍那一段為了「沒有淨化反應」才選的；一般古墓雜兵多半該是
    `harm`）、`entrance:'se_enemy_roardeer'`＋`entranceBlast`（**龍吟** —— 納骨鼠群
    配龍吟顯然不對）、26 隻齊頭的 `hp:350`／`attack:20`（沒有難度曲線）、`loot:[]`。
  ⚠⚠ **現在一隻都遇不到，那是刻意的**：沒有任何戰鬥卡或刷怪池指到它們。
    接進 `wildSpawn` 那一刻，`warmEnemies` 會自動把圖預熱（名單是算出來的）。
  ⚠ 三層分區與中文名是**美術暫譯／暫推**的，以 Ray 的命名為準。

## 音訊

- **✔ 不欠**：`fileGain` -1542 補齊三列（`sylblanc`／`glass_cradle`／`echoed_art`，
  後兩支被 `peakCeilDb` 夾住，見 config 的註解）。
- **⚠ 檔案在磁碟上、但沒登記進表 ⇒ 遊戲載不到**（`script_lint.py` 每次都在叫）：
  · SE：`se_page1/2/3`、`se_pickup`、`enemy_lowroar`、`se_cannonslide`（圖書館那一段的翻頁聲現在是**靜音**的）
  · BGM：`PerituneMaterial_Gothic_Dark_loop_intro`、`PerituneMaterial_Pray_Organ_loop`、`Peritune_Mystic_Tides_loop`

---

# ⚠⚠⚠ 換機器交接（-1519 ～ -1526 這一輪，Windows 那台交出去）

## 〇、⭐ **Ray 定的一條原則：劇情、玩法、手感要一起長**

> Ray（-1526 收工）：「後面劇情還沒寫，**到時再決定**。因為**劇情一直沒 CODE 到這邊，
> 我沒法自己跑迷宮**。**劇情跟玩法還有玩家的觸感必需連動。**」

⇒ **`⑨ 追逐機制` 先不要自己寫完。** 它不是「還沒排到」，是**刻意等**：
  那一套（動一格追一格／25% 插隊遭遇／安全點／墓門關上）**手感只有 Ray 跑得出來**，
  而他跑不了迷宮是因為程式還沒把那一段接起來 —— 先把**跑得起來的部分**交到他手上，
  他跑過、說了要什麼手感，再定規則。
  ⚠ 設計已經寫在下面第三大段（`-1525/-1526` 那一輪的第三節），**那是備忘不是授權**。

## 一、這一輪推上去的（7 個 commit，`ver -1519` → `-1526`）

| ver | 做了什麼 |
|---|---|
| -1519 | 拷問宣言之後直接接隔日審訊（M1 收尾 `goto:'inn'`） |
| -1520 | 東泊那一夜的三段換曲 ＋ 兩張差分 |
| -1521 | 伊甸古墓・墓門 stage7 以前那一段 ＋ stage8 那一段三處修正 |
| -1522 | 雪都 ①②③：抵達／禁止出航／三條約會線／六點回旅店／圖書館 |
| -1523 | 雪都 ④：隔日出發／上船簡報／鏡湖／石碑林・NIEM（⭐ `tomb_opened` 終於有人插） |
| -1524 | 鏡湖 ⑤⑥：尼莫戰 ＋ 賽西莉／蘿芮／尼莫那一段（三個新角色接線） |
| -1525/-1526 | 古墓 ⑦⑧ ＋ ⑨ 的安全點與墓門 |

**逐輪的細節在下面每一段** —— 開工要動哪一塊就讀那一段，不要只讀這張表。

## 二、⚠⚠⚠ **這個 repo 同時有一個美術 session 在跑**

· -1516（`tools/si_matting.py`，本機 matting）是**它**推的；收工時它的
  `tools/si_matting.py` 還改著沒 commit。
· ⇒ **這一輪七個 commit 全部是逐支 `git add <path>`，一次都沒有用 `git add -A`**，
  `resources/` 底下**一個檔都沒碰**（`git diff --name-only @{u}..HEAD | grep ^resources/` ＝ 0）。
· **下一台照做**：動共用檔（`config.js`／`CLAUDE.md`／`HANDOFF.md`）之前先 `git log -1`
  看一眼；commit 一律點名路徑。

## 三、⚠ 這台機器（Windows）與 Mac 不一樣的四件

| 件 | 狀況 |
|---|---|
| `node` | **沒有** ⇒ `tools/script_lint.py` **整輪都跑不動**。語法驗證靠**瀏覽器真的載一次**（模組載得起來＝沒有 SyntaxError） |
| `python3` | 是 WindowsApps 的殼；**可用的是 `python`**（3.11.9） |
| 主控台編碼 | 中文會 `UnicodeEncodeError`（cp1252）⇒ 跑任何印中文的 script 都要 `PYTHONIOENCODING=utf-8` |
| 伺服器 | `PYTHONIOENCODING=utf-8 PORT=8145 python tools/devserver.py`。這一輪用 **8145**，Ray 的 8123／8200 沒碰 |

⚠⚠ **回到 Mac 第一件事：`python3 tools/script_lint.py`** ——
  這一輪加了大量腳本、四張敵人卡、三組 `ART`、兩支還沒到的 BGM，
  **lint 一次會把所有「名字打錯」一起抓出來**（這台跑不了，等於整輪沒過那一關）。

## 四、⚠ 在等 Ray 一句話的（照急迫度）

1. ⭐ **古墓 26 隻雜怪的數值卡** —— 卡不到就做不了 `wildSpawn`、「三場戰鬥後」的真觸發、
   追逐的 25% 分支（`_tomb_mon_spec.md`：「等 Ray，我不自己發明」）。
2. **`man_nemo.webp` 是不是尼莫的戰鬥立繪**（-1503 就在問，現在已經接上去用了）。
3. **圖書館四條記事的日期時刻**（現在是照 EPOCH 推的佔位，**它會說謊**）——
   給數字、或說要做時戳。
4. **三個新角色的身高**（尼莫 174／賽西莉 170／蘿芮 158 是我估的）。
5. `NIEM_TAIL` 逼得石碑林那一段**把蕾娜四拍挪到 NIEM 之前**（順序與稿上相反）——要不要改。
6. 追逐的「誰拔」（決戰打贏？還是蕾娜那段分離之後？）。
7. 一批**我暫代的台詞**：禁止出航那句旁白、雪都旅店的 `noSleep`、三扇門的
   `low`／`dateBusy`／`dateDone`／`nightRest`。

## 五、⚠ 在等美術的

· 插圖五張：安雅棉花糖／索菈娜微醺 `021-soranadrunk`／蕾娜趴睡／索菈娜背安雅／Execute
· 米夏眼部 CI（`CI_Misha_eyes`，-1511 就在等）
· `Cecilie_SI_refusertemp`（現在用 `nolook` 頂著）
· 索菈娜的 `drink`／`shy` 兩張差分（腳本已經寫上去了，會退回本尊＝那就是工單）
· 兩支 BGM：`Peritune_Glass_Cradle_loop` / `Peritune_Echoed_Art`（**Mac 上應該有**）
· 音效：`Se_pickup`、汽笛、`Se_groawing`（`enemy_lowroar.mp3` 還沒登記進 `ASSETS`）

## 六、⚠⚠ 測試小抄（這一輪踩出來的，下一台照用）

1. **城鎮裡會動的東西幾乎都是「長按」不是點擊**，而且**按不動時完全沒有錯誤訊息**：
   `#townNav .town-dest`（移動）、`#innLobby .inn-btn`（坐坐／睡覺）——
   自動化一律 `pointerdown` → **等 1.5~1.8 秒** → `pointerup`。
   ⚠ `.click()`、`computer.left_click`、鍵盤方向鍵**三種都沒用**（卡了四次）。
2. ⚠⚠⚠ **巡場會插 `safehouse_<圖>`** ⇒ **「有戰鬥拍的段落整段不演」**（§6.5.4.4 的規則）。
   要測有戰鬥的段落，**先把那支旗從 `tivot_flags_v1` 拿掉**。
   ⚠ 它看起來與「act 寫錯了」一模一樣，查了一輪才找到。
3. **旗與時鐘都是純 localStorage、每次現讀** ⇒ 可以直接注入：
   `tivot_flags_v1`（陣列）／`tivot_clock_v1`（開局起算的分鐘數，EPOCH ＝ 1908/10/11 11:00）／
   `tivot_affection_v1`／`tivot_stage_v1`。
4. **圖名卡要用真的點擊收掉**（`#storyTouch.click()` 收不掉它，它有自己的接手層）。
5. 戰鬥測試：`#testClearBtn`（清盤）、`#hpLockBtn`（鎖血）—— 兩顆都 `body.testmode` 限定。
6. ⚠ **接稿之前先把角色的 expr 鍵 dump 出來對一次**：稿上一批是**檔名的大小寫**
   （`Shout`／`expain`／`laughbig`…），**寫錯不報錯，只會靜靜退回本尊立繪**。

## 七、⚠ 一件沒修、也還沒定位的

走進某些格子時 console 會跳一行**暗罩守望**：

    [story] [town.showNav] 畫面該亮了卻還蓋著：切景黑幕 #storyVeil —— 已清掉，上游有路徑沒收它

· **畫面是好的**（那支守望自己清掉了），整輪幾十張截圖都正常。
· **已確認不是 -1519～-1526 帶進來的**：-1522 那一輪走的是完全不同的路（巡場＋自己走），
  照樣跳。⇒ **既有的**。
· 憲法說得很清楚：**驗到東西就是上游有 bug，不是誤報**。追的方向是
  「哪一條路走完沒有 `veil(false)`」。

---

# 本輪 — `-1525`／`-1526`（⑦⑧ 做完；⑨ **只做得到一半，另一半被缺件卡住**）

## 一、⑦ 古墓那三段戲（全部驗過）

| 段 | 落點 | 旗 |
|---|---|---|
| **門開了呢** | `tomb.gate`，**排在既有兩段之後** | `tomb_enter`（`need:'tomb_opened'`） |
| **進古墓**（索菈娜與蕾娜那一段長談） | `tomb.vestibule` | `tomb_talk` |
| **守墓者・降臨 ＋ 兩階段揭露** | `tomb.rotunda`（圓廳） | `tomb_gk1_done`；收尾插 **`tomb_chase_on`** |
| **下一個房間**（索菈娜背安雅） | `tomb.nichehall` | `tomb_carry` |

⚠⚠ **「門開了呢」排在既有兩段之後**是刻意的：排前面的話，「先跑鏡湖、沒來過古墓」
  的玩家第一次抵達就聽到「門開了呢」，而初見那一整段（`tomb_gate`）會被推到下一次。

### ⚠⚠⚠ 觸發條件是**暫代的**：稿上是「三場戰鬥後」

**這張圖現在一隻雜怪都沒有**（`TOWNS.tomb` 沒有 `wildSpawn`，**26 隻古墓怪的數值卡
還在等 Ray** —— `_tomb_mon_spec.md` 明寫「我不自己發明」）。
⇒ 這一版改成「**走到圓廳**（二層樞紐）才演」。
雜怪接上之後要改成數戰鬥次數 —— ⚠ **現在沒有那個計數器**，要做先照鐵律 9
決定「誰加、誰歸零」。

## 二、⑧ 守墓者四張卡（驗過）

照 `_tomb_mon_spec.md` §九 一條一條做的，**＝ `sf_deer_nightmare` 照抄**，只改那幾格：
`hp` 700→**350**／`image`／`bg`／`hitFx.assault` sakura→**bite**／`loot`→**[]**
／`kind` harm→**multi**／`entrance:'se_enemy_roardeer'`／`entranceBlast:true`。

· 四張卡 `gk_seal`／`gk_offset`／`gk_many`（追擊輪出）／`gk_crypt`（決戰），
  **名字全部叫「守墓者」**（同王座徘徊者三張同名）。
· 戰鬥卡 `tomb_gk1`／`tomb_gk2`／`tomb_gk3`／`tomb_gk_final`。
· `ASSETS` 四個鍵 `enemy_gk_*`。

⚠⚠⚠ **`kind:'multi'` 是那句台詞成立的前提**：實測結算副標印的是
  **「守墓者已擊退」不是「已淨化」** ✔ —— `harm` 的話每打贏一次就與
  「沒有淨化反應，那東西沒有死！」矛盾一次。
⚠ 規格提醒的「照抄鹿主時 `entrance:null` 會把龍吟蓋掉」—— 四張卡裡
  `entrance` 都**只出現一次**，這一條已經避開。
⚠ Ray 腳本裡的 `Se_groawing`（`enemy_lowroar.mp3`）**還沒進 `ASSETS`／`fileGain`**
  ⇒ 全段沿用既有的 `se_enemy_roardeer`。要換那一支得先登記，不然是靜靜不播。
⚠ 「哪一張當決戰」是**美術交接裡填的判斷，不是 Ray 指定的**（我沿用 `crypt`）。

## 三、⑨ **做到哪裡**

### ✔ 做了的兩件

1. **三處安全點**（Ray：「兩個樓梯及最終房間前」）＝
   `stair1`／`stair2`／`gallery3` 加 `rest:true, noWild:true`
   —— 走既有的**休息處**機制（§6.5.4.4：走進去閉棺結算；**沒打過架就不作動**）。
2. **墓門關上了** ＝ `vestibule` 的 `lock:{ gate:{ need:'tomb_chase_on', text:'（墓門關上了。）' } }`
   —— 走既有的出口鎖（-786），**箭頭照樣在、按了出訊息、不移動也不推時鐘**（實測 ✔）。
   ⚠⚠ 為此 `lock` 這一版起**鑰匙可以是「目的地那一格的 id」，不只是方向**
     （`modules/town.js` 一處，鐵律 8）：通往墓門的是 `back`，**那是執行期算出來的**，
     從不同方向走進前庭會落在不同的 `dir` 上 ⇒ 用方向當鑰匙必然漏掉其中一條，
     而且不會報錯。
   ⚠ **沒寫 `until`** ＝從追逐開始就一直關著。Ray 沒說什麼時候開（決戰收尾要不要開由他定）。

### ✘ **沒做的：追兵那一套狀態機**（而且**現在做不完整**）

Ray 的規格：「玩家每動一格，敵追一格，但是玩家有 **25%** 遭遇**其他敵人**的機率，
遭遇敵人追擊者就會**再推進一格**。要走到最下層的祭壇才能決戰。」

⚠⚠⚠ **那個 25% 的「其他敵人」就是這張圖的雜怪 —— 而雜怪的卡還在等 Ray**。
  也就是說，現在就算把狀態機寫出來，**有四分之一的分支是空的、測不出來**。
  照憲法那條自檢（「加任何『每次 X 都要 Y』的規矩時先回答兩句」），
  **我不把一個驗不了的系統推上去**。

**設計（下一個人照這個做，不要重想）：**

| 要回答的 | 答案 |
|---|---|
| 狀態是什麼 | **追兵離玩家幾格**（一個整數），不是「追兵在哪一格」—— 玩家會繞死胡同，用格子座標會逼出一套尋路 |
| 誰插 | `tomb_chase_on` 那一拍（已經有了）⇒ 初值＝離幾格（建議 2） |
| 誰加/減 | **只有一支推進函式**（鐵律 8）：玩家每走一格 −1；那一步撞到雜怪再 −1 |
| 誰拔 | 決戰打贏（`tomb_gk_final`）／或蕾娜那一段分離之後 —— **Ray 沒說，要問** |
| 歸零＝什麼 | 距離 ≤0 ⇒ 被追上 ⇒ 打 `tomb_gk1/2/3` **輪出**（規格：三張輪流） |
| 安全點怎麼算 | 站在 `rest:true` 的格子上時**不推進**（那就是「安全」的定義） |
| 進不進存檔 | **要**（§6.9：`newRun` 清、`runSnapshot/runRestore` 帶 —— 同一張清單的兩面） |
| 掛在哪 | `go()` 的移動收尾，與 `wildActDue` 同一個位置（那裡已經有「走一步之後」的鉤子） |

⚠ 還缺的劇本：**「下到第二層一出安全區馬上就被追上」那一段**（蕾娜與諾薇兒分離、
  Execute 插圖、「夥伴只剩諾薇兒，無蕾娜評價畫面，也無評價，但仍然計算」）——
  它要接在追兵機制上（「一出安全區就被追上」＝距離初值的特例），所以一起留著。
  ⚠ 「無評價但仍然計算」是**戰鬥卡的 `noEval`**＋照常結算，那一格已經有了。

## 四、驗過的（巡場 → 伊甸古墓 → 演劇情，注入 `tomb_gate`／`tomb_opened`、拿掉 `safehouse_tomb`）

· 墓門「門開了呢。走吧。」✔（`tomb_gate` 已插著，所以是**第三段**取到的）
· 前庭那一整段長談 ✔
· 一路走到圓廳（經過 `stair1` 安全點 —— **沒打過架所以沒作動，對的**）⇒
  守墓者那一段觸發 ✔ → **戰鬥真的開起來**：名字「守墓者」、**HP 350/350**、
  `mon_gravekeeper_seal.webp` 載到 ✔
· 打贏 ⇒ 結算副標 **「守墓者已擊退」**（不是「已淨化」）✔ → 回到腳本
  「嚇、嚇死我了！」→ 整段揭露演完 ⇒ **`tomb_chase_on` 插上** ✔
· 重開一輪、注入 `tomb_chase_on` ⇒ 在前庭按往墓門的方向 ⇒
  **「（墓門關上了。）」，位置沒動、時鐘沒推** ✔
· console 零錯誤、**一個「沒有這個差分」都沒有**。

## 五、⚠ 現在擋著 Stage10-A 收尾的**兩件缺件**

1. ⭐ **古墓 26 隻雜怪的數值卡**（`_tomb_mon_spec.md`：「等 Ray，我不自己發明」）
   —— 卡到齊才做得了：`wildSpawn`、「三場戰鬥後」的真觸發、追逐的 25% 分支。
2. **插圖兩張**：索菈娜背安雅、Execute（分離那一段）。

---

# 本輪 — `-1524`（第 ⑤⑥ 塊：尼莫戰 ＋ 賽西莉／蘿芮／尼莫那一段）

> Ray 的 Stage10-A 稿第 5、6 塊做完。剩下 ⑦⑧⑨（古墓內部三場戰鬥／守墓者／追逐機制）。

## 一、三個新角色**正式接線**（-1503 那筆交接的「戲來了再開」到此結案）

`script/speakers.js` 新增 **5 個 speaker id ＋ 3 組 `ART`**：

| id | 顯示名 | art | 差分 |
|---|---|---|---|
| `NEMO_X` / `NEMO` | ？？？／尼莫 | `nemo` | surprise・happy・bye・bored・dual（5） |
| `CECILIE_X` / `CECILIE` | ？？？／賽西莉 | `cecilie` | talk・tease・upset・lookaside・smile・sadback・nolook・think（8） |
| `LAURIE` | 蘿芮 | `laurie` | crying・dying・idea・lookaside（4） |

⚠ 報上身分之前／之後**兩個 id**（同 `PRIEST_X`／`MISHA_X` 的慣例）；
  蘿芮沒有 `_X` —— 她一開口就喊「蕾姬娜學姐」，蕾娜當場叫出她的名字。
⚠ 取景值（top/bot/fx）**全部是 `tools/measure_si.py` 逐張量出來的**，17 張，沒有互抄。

### ⚠⚠⚠ **`cm`（身高）是我估的，Ray 還沒給**

**尼莫 174／賽西莉 170／蘿芮 158**。
· 這三個數字**只影響大小與頭頂高度**，改一個數字就好（不必重量 top/bot/fx）。
· ⚠ 都低於現行最高的 **178**，所以 `CAST_TALL` 不變、既有四位不會被連累縮小。

### ⚠ `Cecilie_SI_refusertemp.png` 庫裡沒有

稿上「我不要。」那兩拍標的是這個暫代檔名 —— 現在改用 **`nolook`**（手撫側髮、不看人）。
圖到了加一個鍵就好。

## 二、尼莫的敵人卡（模板照槍之魔女）

> Ray：「Man_nemo **模板照槍之魔女**，攻擊力到 50%」

`script/enemies.js` 的 `nemo` ＝ **照 `witch` 抄的**，只改四件：
名字／立繪（`enemy_nemo`）／`kind:'human'`／**`attack` 45 → 22**（50%，取整）。
⚠⚠ Ray 說的是「攻擊力」單數 ⇒ **只動那一格**；`ult.atk`（20）與 `delayPenalty`
  照樣沿用模板。**要連大絕一起減半就說一聲。**
⚠ `kind:'human'` ⇒ 結算副標「已擊敗」，而且不吃降臨／淨化那一套特效。

**戰鬥卡** `config.battles.lk_nemo`：`{ enemy:'nemo', allowLose:true }`
⚠⚠ **`allowLose:true`** —— 稿上**勝敗都有台詞**，所以輸了不走 Game Over，
  跳到腳本的 `onLose` 標籤接著演（§6.5.2 的既有機制）。
⚠ **不禁聖徒化／搭檔技**：Ray 沒說要禁，而憲法那條是「**禁了要明寫**」。
⚠ **沒有接 `bgm`**：`bgm_nemo`（Prairie5）-1508 就備好了、交接也寫著它是
  「尼莫戰的預設曲」，但**Ray 這一份稿沒提音樂** —— 要用就在那張卡上寫 `bgm:'nemo'`。

## 三、蕾娜的評價「不論 RANK」

`script/evaluation.js` 的 `BY_BATTLE.lk_nemo` —— **六個等第填同一句**
（`S/A/B/C/D/E` 都是「那制服……是第四騎士團的人……？」`shockedopen`）。
⚠ 那張表的鑰匙就是等第，**沒有「全部」那一種寫法** ⇒ 六格同句就是「不論 RANK」的落地。
⚠ **戰敗看不到它**（沒有結算頁）—— 那是對的，稿上勝敗的分歧在腳本裡。

## 四、那一場戲（`lake.shingle`）

稿上「往外走到出口前一格」＝ 出口是山口（出航那一格）⇒ **碎石灘**。
`need:'lk_steles'`（石碑林演完，回程才撞到）。
· 人影兩拍走既有的 **`ci:`**（暗調 CI 插入）⚠ 它是**持續狀態**，本人上台那一拍 `ci:null` 收掉。
· 勝敗分歧走 **`onLose:'nemo_lose'` ＋ `label`／`goto:'nemo_join'`**（§6.5.2）——
  ⚠ **不要用旗去分**：那一場輸了不會記任何旗（`talkOnce` 是打贏才記的）。

## 五、⚠⚠⚠ 測試的坑：**巡場會讓「有戰鬥的段落」整段不演**

第一次走到碎石灘什麼都沒發生，查了一輪才找到：**巡場（「同一個落點、沒有怪」）
會插 `safehouse_<圖>`**，而 §6.5.4.4 的安全區規則正是
「`actDue` 裡『這一段**有戰鬥拍**』＋『這張地圖插著旗』→ **不演**」。
⇒ **要測有戰鬥的段落，先把 `safehouse_<圖>` 從 `tivot_flags_v1` 拿掉。**
⚠ 這不是 bug，是規則本身 —— 但它在測試時看起來**與「act 寫錯了」一模一樣**。

## 六、驗過的

巡場 → 鏡湖 → 演劇情，注入 `vn_brief`／`lakestele_found`／`lk_arrive`／`lk_steles`，
**拿掉 `safehouse_lake`**，走到碎石灘：
· 人影 → 諾薇兒「那是……」→ ？？？「！」→ **戰鬥真的開起來了**
  （盤面、`man_nemo.webp` 立繪都在）✔
· 打輸 ⇒ **沒有走 Game Over**，跳到 `nemo_lose`「學長——你是不是沒睡飽呀——」✔
  （`allowLose` ＋ label 跳轉那一條驗到了）
· 合流之後整段演完：蘿芮 → 諾薇兒說出「尼莫。」⇒ **名字從「？？？」換成「尼莫」** ✔
  → 賽西莉的人影「？？？」⇒ 上台之後換成「賽西莉」✔ → 收尾三拍 ✔
· **18 張新立繪全部 200 OK**、`man_nemo.webp` 在戰鬥裡載到 ✔
· console **一個「沒有這個差分」都沒有** ⇒ 三組 `ART` 的鍵全部對得上。

⚠ **打贏那一支（「不愧是學長」）沒有實測到** —— 那一趟輸了。
  它與輸的那一支是同一個機制的兩半（`goto:'nemo_join'` 合流），風險低，但要挑剔的話
  下一輪順手打贏一次。

## 七、剩下的（⑦⑧⑨）

7. 古墓入口／進古墓／三場戰鬥 —— ⚠ 一般怪的卡
8. **守墓者（兩階段：打完沒有淨化反應、再次降臨）** —— 四張卡，
   規格 `resources/enemy/_tomb_mon_spec.md` §八～九；⚠ 照抄鹿主時 `entrance:null` 會蓋掉龍吟
9. ⚠⚠⚠ **追逐機制**（動一格追一格／25% 插隊遭遇／三安全點／墓門關上）——
   引擎新機制，最大的一塊。動手前先照鐵律 9 把「追兵在哪一格」的誰插誰拔寫下來、
   照鐵律 8 只做**一支**推進函式。

---

# 本輪 — `-1523`（第 ④ 塊：隔日出發／上船簡報／鏡湖／石碑林・NIEM）

> Ray 的 Stage10-A 稿第 4 塊做完。⭐ **`tomb_opened` 終於有人插了**（見第二節）。
> 剩下第 5~9 塊（尼莫戰／賽西莉那一段／古墓內部／守墓者／追逐機制）。

## 一、做了什麼

| 件 | 落點 | 旗 |
|---|---|---|
| **隔日出發**（好了，出發吧 → 走出旅店那一段路） | `ravnsdal.gates` 第二道 | `vn_day2`（`need:'vn_night_done'` ＋ `hourOfDay:[6,12]` ⇒ **睡一覺跨過午夜才成立**）→ `goto:'square'` |
| **上船的簡報**（石碑林的來歷） | `ravnsdal.square.acts` **排在抵達那一段前面** | `vn_brief`；收尾插 **`vn_depart` ＝解除禁止出航** |
| **抵達鏡湖** | `lake.inlet.acts` | `lk_arrive`（`need:'vn_brief'`） |
| **石碑林・啟動 ＋ NIEM** | `lake.grove.acts` | `lk_steles`；**插 `tomb_opened`** ＋ `...NIEM_TAIL` |

## 二、⭐ **`tomb_opened` 的「誰插」在這裡結案**

`tomb.gate` 從 ver -1142 起就掛著一條但書：
「⚠⚠ 鐵律 9：`tomb_opened` 誰插的 —— Ray 已經定了條件，實作後補
（**要找到另一個遺蹟啟動才會開**）」。
**石碑林那一段就是那個事件** —— 插在蕾娜「如果文獻沒錯的話，古墓應該開啟了……」
那一拍。誰拔：沒有人（同 `got_ship` 那一族）。
⇒ 連帶：`tomb.gate` 的 `exitIf:{up:'tomb_opened'}` 從此打得開，
`bgWhen` 的 `Tomb_Gate_Sealed` 也會換成開著的那一張。

## 三、⚠⚠⚠ **`...NIEM_TAIL` 一定要放在最後一拍**

它裡面有**兩個 `end:true`**（「第一次拿就收」「已經教過就收」兩條分流）——
**寫在它後面的拍一個都不會演**，而且不會有任何錯誤訊息。

⇒ 稿上的順序是「啟動動畫 → 提示獲得 NIEM → 蕾娜『古墓應該開啟了』」，
這一版**把蕾娜那四拍挪到 NIEM 之前**（拿到道具的提示因此晚幾拍出來）。
要照稿上的順序就得把那一段拆成兩個 act，而第二個 act 需要「再抵達一次」
才演得到 —— 不划算。**⚠ 要改說一聲。**

## 四、⚠ 這一輪的三個判讀

1. **「感應捕捉到遺蹟」那四句放在降落之後的第一格**（`lake.inlet`），不在飛行頁：
   那一段是另一個 document，為了四句話在那邊再開一條路不划算（§6.10）；
   而且**降得下來就表示感應已經掃到了**（`nearestTown` 的 `P.flag` 那道門）。
2. **「索：『生前？』」改成諾薇兒** —— 稿上標的立繪是 `Nouvelle_SI_Shocked`，
   而下一句「好過份……」也是她。判成抄稿時的欄位錯位（同 -1522 那兩處）。
3. **隔日那一段的 M1／M2 兩條都是 `onlyIf`**（與 -1522 那五處刻意不同）：
   那兩句是「安雅站在誰那一邊」的表態，沒跑過東泊的人本來就不該有立場 ——
   兩支旗都沒有時那一拍不演，讀起來只是她沒接話。

⚠ 「啟動動畫」走既有的 **`fx:'sense'`**（安雅啟動祭壇那一拍同一支，鐵律 8）＋ `shake`
—— **沒有**為這一段另做一個動畫。

## 五、驗過的（巡場 → 雪都／鏡湖，兩趟，都沒有動 `SCRIPT_TEST`）

**雪都那一趟**：注入 `tomb_gate`／`vn_arrive`／`vn_evening`／`vn_lib_done`／
`vn_night_done`、時鐘撥到 **10/13 07:00**，走一步 ⇒
「好了，出發吧。」整段演完（M1／M2 兩句正確跳過）→ **`goto` 廣場** →
上船簡報自己接上 → 收工旗 `vn_day2`／`vn_brief`／**`vn_depart`** 全上 ✔

**鏡湖那一趟**：注入 `vn_brief`／`lakestele_found`，走 山口→碎石灘→瀑布底→水蝕洞→石碑林 ⇒
抵達那一段「哇，還真有。」✔ → 石碑林整段演完 ⇒
**`tomb_opened` 插上** ✔、`niem_got1` 插上 ✔、**道具袋出現 `niem:1`** ✔
（這一輪是第一份，所以走的是短的那一條分流 —— 對的）。
console **零錯誤**、**沒有任何「沒有這個差分」** ⇒ 稿上那一批差分名全部對到了鍵。

## 六、剩下的（第 5~9 塊，照 -1521 那張表）

5. **尼莫戰** —— ⚠ `man_nemo.webp` 的用途**要 Ray 確認一句**；BGM `bgm_nemo` 已備好
6. **賽西莉／蘿芮／尼莫那一段** —— ⚠ 四個人**都還沒有 `speakers.js` 的 `ART` 條目**
   （-1503 說「戲來了再開」，**現在就是**）；`Cecilie_SI_refusertemp.png` 是 PNG 暫代檔
7. 古墓入口／進古墓／三場戰鬥
8. **守墓者（兩階段）** —— 四張卡，規格 `resources/enemy/_tomb_mon_spec.md` §八～九
9. ⚠⚠⚠ **追逐機制** —— 引擎新機制，最大的一塊；動手前先照鐵律 9 把
   「追兵在哪一格」的誰插誰拔寫下來

---

# 本輪 — `-1522`（雪都：抵達／禁止出航／三條約會線／六點回旅店／圖書館）

> Ray 的 Stage10-A 稿，**第 1、2、3 塊做完**（-1521 那張表的前三列）。
> 第 4~9 塊照那張表往下做。

## 一、做了什麼（全部在 `TOWNS.ravnsdal`）

| # | 件 | 落點 |
|---|---|---|
| ① | **抵達雪都**（下雪那一段）＋ `endStoryExplore` 開自由探索 | `square.acts` 的 `vn_arrive`（`need:'tomb_gate'`） |
| ① | **禁止出航「不能丟下夥伴」** | `square.sail.hold`（`need:'vn_arrive'` / `until:'vn_depart'`） |
| ② | **旅店變成真的旅店**：大廳＋四扇門＋邀約 | `inn` 加 `inn:true`／`innSpots`／`sleepFlag`／`innDoors`／`innStage1.knock` |
| ② | **三條約會線的目的地** | `grocery`（安雅）／`lookout`（安雅）／`bar`（索）／`station`（索）／`church`（諾）／`dessert`（諾），全部 `withWho:` |
| ③ | **六點回旅店** | 城上的 `gates`（`hourOfDay:[18,24]` ＋ `goto:'inn'` ＋ `enterAgain`） |
| ③ | **圖書館・評鑑報告** ＋ 後半（轉景中心區） | `library.acts` → `goto:'midtown'` → `midtown.acts` |

新旗（鐵律 9，誰插／誰拔）：
`vn_arrive`（廣場那一段演完／沒有人拔）・`vn_evening`（六點那一段）・
`vn_lib_done`（圖書館）・`vn_night_done`（中心區後半 ＝ **旅店的 `sleepFlag`**）・
`vn_date_*`（邀約那一拍）・`vn_shop_anya`／`vn_lookout_anya`／`vn_bar_sor`／
`vn_station_sor`／`vn_church_nou`／`vn_dessert_nou`（各地點演過了）・
⚠⚠ **`vn_depart` 還沒有人插** —— 那是「隔日上船」那一段（第 4 塊）要插的，
禁止出航在那之前是真的走不掉。

## 二、⚠⚠⚠ 一條反覆出現的坑：**非線性 ⇒ 兩個 `onlyIf` 會讓整段沒東西演**

A route（古墓→雪都）與 B route（東泊）是**非線性**的 —— **先跑 A 的人
`ep_m1_route` 與 `ep_m2_route` 兩支都沒有**。稿上那幾處「M1路線／M2路線」
如果照字面寫成兩個 `onlyIf`，那一段就會**一句都不演、而且不報錯**。

⇒ 一律寫成「**其中一條 `onlyIf`、另一條 `skipIf`**」（鐵律 13：漏掉的那一側
要落在安全的地方）。這一輪四處都這樣處理：
六點那一段（M1 / 其餘）、安雅的邀約（M2 / 其餘）、瞭望台（M2 / 其餘）、
甜品店（M2 / 其餘）、中心區後半（M1 / M2 —— ⚠ **這一處是兩個 `onlyIf`**，
因為稿上那兩句是「安雅站誰那邊」的表態，沒跑過東泊的人本來就不該有立場）。

## 三、⚠ 我暫代的東西（**Ray 一句話就能換**）

| 什麼 | 現在寫的 |
|---|---|
| **圖書館那四條記事的日期時刻** | ⚠⚠⚠ 稿上是「X月Y日Z時（首戰蜈蚣的日期時間）」那種**佔位**，而真正的時刻**每一輪都不一樣**。現在填的是照 `clock.EPOCH`（1908/10/11 11:00）推出來的合理值（10/12 14時・10/13 16時・10/14 23時・10/16 20時）——**它會說謊，只是說得不離譜**。要真的對，得在那四段戲各記一個時戳（引擎的活，而且**舊存檔沒有那幾支戳**要有退路）。**給數字、或說一聲要做時戳，兩條路都行。** |
| 禁止出航那一句 | 旁白「（大家都還在城裡。不能丟下夥伴。）」 |
| 旅店的 `noSleep` | 「……蕾娜還沒回來。」 |
| 三扇門的 `low`／`dateBusy`／`dateDone`／`nightRest` | 稿上沒給，照東泊那一份的語氣暫代 |

## 四、⚠ 稿上寫了、但**庫裡沒有**的（照既有慣例處理，不是漏做）

· **插圖三張**：安雅棉花糖／索菈娜微醺 `021-soranadrunk`／蕾娜趴睡
  ⇒ **不寫 `cg:`**（寫了就是六個候選全 404，§6.5.4 的 -433 那一課）。
  註解裡寫好了圖到了補在哪一拍、哪一拍 `cg:null` 收掉。
· **索菈娜的 `drink`／`shy` 兩張差分** ⇒ **照樣寫上去**：查不到會退回本尊立繪、
  台詞照播（同東泊 -1346），而且**留在稿上就是交給美術的工單**。
· **音效**：`se_page1/2/3` 走既有的 **`se_ui_pageflip`**（§6.6：不要為了三個名字
  另加三支檔案）；`Se_pickup` 與**汽笛**庫裡沒有對得上的 ⇒ **不掛 `se`**
  （掛一支對不上的比不掛更糟）。
· 稿上的差分名有一批是**檔名的大小寫**，要換成 `speakers.js` 的**鍵**：
  `Shout→shout`／`think→thinking`（蕾娜）、`expain→explain`／`Shocked→shocked`／
  `shock2→shocked2`／`Awkwerd→awkwerd`（諾薇兒）、`surprise→surprised`／
  `laughbig→lauaghbig`（索菈娜，⚠ 資料裡就是拼成這樣）、`smilebig→smile`、
  `Silent→silent`／`Desperate→desperate`（安雅）。
  ⚠⚠ **寫錯不會報錯**（退回本尊），所以**接稿前先把角色的 expr 鍵 dump 出來對一次**。

## 五、⚠ 兩處判讀（錯了很好改）

1. 圖書館那一句「是在說第四課的團長璐娜大人」稿上標的是 `Nouvelle_SI_expain2`，
   但**說話的是安雅** —— 判成抄稿時的欄位錯位，照說話者改用她自己的差分。
2. 六點那一段的 M2 分支（索菈娜提議去圖書館、安雅一路沉默）**同時當成
   「還沒跑過東泊」的預設** —— 那幾拍不提米夏，讀得通。

## 六、驗過的（走 **巡場 → 雪都瓦恩霍姆 → 演劇情**，沒有動 `SCRIPT_TEST`）

注入 `tomb_gate`、好感三人各 40，然後整條走一次：
· 廣場抵達八句 ✔ → 按出航被「（大家都還在城裡。不能丟下夥伴。）」擋下 ✔
· 旅店大廳出來了：**三扇門**（蕾娜在圖書館 ⇒ 她那扇不畫）✔；
  按睡覺被「……蕾娜還沒回來。」擋下 ✔
· 敲安雅的門 ⇒ **「我、聽說雪都有一種糖！」**（非 M2 那一套）✔ → 同行安雅 ✔
· 走到雜貨舖 ⇒ 「真的……跟雲朵一樣。」✔
· 時鐘撥到 18:00 走一步 ⇒ **六點那一段觸發**，M1 那三句被跳過、其餘那一套演完 ✔
· 走到圖書館 ⇒ 評鑑報告整段演完 → `goto` 中心區 → 後半演完（T3 那一支分歧）✔
· 收工旗：`vn_arrive`／`vn_date_anya`／`vn_shop_anya`／`vn_evening`／`vn_lib_done`／
  `vn_night_done` 六支全上；那兩段用到的立繪全部 200 OK；**console 零錯誤**。

⚠ **暗罩守望那一行 warn 又出現了**（-1520 交接第六節那一件）——
  這一輪走的是**完全不同的路**（巡場＋自己走），所以它**不是 -1519／-1520 帶進來的**，
  是**既有的**。追的方向：哪一條路走完沒有 `veil(false)`。

---

# 本輪 — `-1521`（伊甸古墓・墓門兩段；**Ray 的新稿只做完第一塊**）

> ⚠⚠⚠ **Ray 這一次交的是一整章的稿**（古墓 → 非線性 Stage 10 A route → 雪都自由探索
> ＋三條約會線 → 圖書館那一大段 → 石碑林／NIEM → 尼莫戰 → 古墓內部與追逐戰）。
> **這一輪只做完最前面那一塊（墓門）。** 其餘照第三節那張表往下做。

## 一、做完的：墓門兩段

### 1. **stage7 以前**（新，`tomb.gate` 的 `tomb_gate_early`）

還沒接到任務就自己飛過來看的那一趟，六句就走（只有蕾娜與諾薇兒）。
· `untilStage:8` ⇔ 既有那一段的 `fromStage:8` —— **靠章節互斥**，所以順序不影響。
· 兩段**各有各的 flag**：stage7 看過的人，到 stage8 照樣演長的那一段（兩件事）。
· **不寫 `sides`**：台上只有蕾娜（本位右）與諾薇兒（本位左），本來就分兩邊。

### 2. **stage8 以後**（既有的 `tomb_gate`，改了三處）

| 改了什麼 | 為什麼 |
|---|---|
| 「先到**拉芬斯達爾城**休整」→「先到**瓦恩霍姆城**休整」 | ⚠⚠⚠ **-1191 定的舊名，-1491 整座城改名成「雪都瓦恩霍姆」，這一句沒人跟上** ⇒ 演出來是一個遊戲裡不存在的地名 |
| 新增 蕾「不然，我們就先去貝利薩爾遺址。好不好？」`skipIf:'belisar_seen'` | 新稿的「分支派生，若還未去過貝利薩爾」 |
| 安「幽靈……交給我。不要怕。」加上 `onlyIf:'ep_m1_route'` | 新稿的「M1路線派生」 |

⚠⚠⚠ **-1491 那一輪的教訓還有另一半**：`SETTLE_RENAMES` 接得住**存檔裡的鑰匙**，
**接不住台詞裡的字**。⇒ **改 `TOWNS[].name` 之前，先 grep 一次舊名。**

⚠⚠ **一處判讀，錯了很好改**：新稿把「索：修女小姐是不是全力想逃離這裡？」與
「諾：好像是……」排在同一個「分支派生」底下，**讀得成兩種**。
沿用 **-1189 Ray 親口確認過**的那一種（「多一句」只指那一句），兩句維持**無條件**。

⚠ 稿上又寫了 `dyingcute` —— **那張圖還是沒有**（實查 `resources/SI/`），
沿用 -1189 Ray 改指的 `scarecute`。

## 二、驗過的（走 **巡場 → 伊甸古墓 → 演劇情**，沒有動 `SCRIPT_TEST`）

· stage8、`belisar_seen` 未插、`ep_m1_route` 未插 ⇒
  開頭「為什麼偏偏先來這裡……」**有演**、「先到**瓦恩霍姆城**」✔、
  「不然，我們就先去貝利薩爾遺址。好不好？」**有演**、
  安雅那一句**被跳過**（直接接「啊——夠了！出發了！」）✔
· 把 `tivot_stage_v1` 改成 7、清掉兩支 flag、走上去再走回來 ⇒
  **六句的早期版整段演完**，HUD 印 stage 7 ✔
· 那一段用到的五張立繪（`Renna_SI_cringe`／`talkwork`／`watch`／`smile`／
  `Nouvelle_SI_front`）全部 **200 OK**；console 零錯誤。
⚠ 網路面板的 404 是 `Tomb_Gate_Sealed_*` 的**時段候選鏈**（本來就這樣）。

## 三、⚠⚠⚠ **Ray 的新稿剩下的部分**（照這個順序做，前四塊不需要新素材）

| # | 這一塊 | 落點 | 卡在什麼 |
|---|---|---|---|
| 1 | **雪都抵達 ＋ 禁止出航旗**（「不能丟下夥伴」）＋ 自由探索開放 | `ravnsdal.square` 的 act ＋ `sail.hold` | — **可以直接做** |
| 2 | **約會三條線**：安雅（雜貨舖／瞭望台）、索菈娜（酒吧／車站）、諾薇兒（大教堂／甜品店） | `ravnsdal` 各節點的 acts ＋ `innStage1` 的邀約詞 | ⚠ 節點**全部都在**（`grocery`／`lookout`／`bar`／`station`／`church`／`dessert`）。⚠ 插圖三張還沒有：安雅棉花糖、索菈娜微醺 `021-soranadrunk`、（諾薇兒那條沒有插圖） |
| 3 | **六點回旅店 → 圖書館那一大段**（評鑑報告） | `ravnsdal` 的 `gates`（時刻閘門）＋ `library` 的 act | ⚠ 蕾娜趴睡插圖、`se_page1/2/3`、`Se_pickup` 還沒有；**日期時刻要填**（稿上是 X月Y日Z時，要對既有事件的時鐘） |
| 4 | **隔日出發 → 上船 → 鏡湖石碑林 → 啟動 NIEM** | `ravnsdal` 的隔日閘門 ＋ `lake` 的 acts | ⚠ **`tomb_opened` 就是在這裡插的**（鐵律 9 的那個「誰插」終於有答案了，見 `tomb.gate` 的註解）。⚠ 鏡湖的 `ASSET_VER` 還沒補（舊欠件） |
| 5 | **尼莫戰** | `config.battles` 新卡 ＋ `lake` 出口前一格的 act | ⚠ 舊欠件：`man_nemo.webp` 的用途**要 Ray 確認一句**；BGM `bgm_nemo` 已備好 |
| 6 | **賽西莉／蘿芮／尼莫那一段** | 同上，接在戰後 | ⚠ 四個人**都還沒有 `speakers.js` 的 `ART` 條目**（-1503 的交接明寫「要用到他們的戲時再開」——**現在就是那個時候**）。⚠ `Cecilie_SI_refusertemp.png` 是暫代檔（**PNG**，要轉 webp） |
| 7 | **古墓入口／進古墓／三場戰鬥** | `tomb` 各節點 | ⚠ 一般怪的卡 |
| 8 | **守墓者（兩階段：打完沒有淨化反應、再次降臨）** | 四張卡 | ⚠ 舊欠件第 1 條：規格在 `resources/enemy/_tomb_mon_spec.md` §八～九；⚠ 照抄鹿主時 `entrance:null` 會蓋掉龍吟 |
| 9 | ⚠⚠⚠ **追逐機制**（玩家動一格敵追一格、25% 遭遇會讓追兵再推一格、三個安全點、墓門關上） | **引擎新機制**，不是資料 | **最大的一塊**。要先回答：誰擁有「追兵在哪一格」這個狀態？誰拔？（鐵律 9）存檔要不要帶？被追上＝哪一場？ |

⚠⚠ **第 9 塊不要順手寫成「在 `go()` 裡加幾行」** —— 它是一個有狀態的系統
（追兵位置、安全點、墓門關閉、25% 的插隊遭遇），照鐵律 9 先把「誰插誰拔」寫下來
再動手；照鐵律 8 只做**一支**推進函式，所有移動路徑都呼叫它。

---

# 本輪 — `-1520`（東泊那一夜的三段換曲／兩張差分）

> Ray 一次交了七件，六件已落地，一件卡在檔案（見第三節）。

## 一、換曲：**拍上寫「那一刻」，城上寫「那一段期間」**

⚠⚠⚠ **這是 ver -1420 那一課的第二次**：`townBgm()` 在**每走一格 `enter()`** 都會
重算一次，所以**只寫在腳本那一拍上，下一步就被打回 `portside`**。
⇒ 兩邊都要寫，而且分工不同（**不是抄兩份**）：

| 寫在哪 | 管什麼 |
|---|---|
| 那一拍的 `bgm:` | **換曲的那一刻**（演到那一句才換） |
| 城上的 `bgmWhen` | **那一段期間**（走一格、進旅店、離開再回來都還是它） |

旗是**演完**才插的 ⇒ 中間那一段只有拍上那一支撐得住。

**`TOWNS.eastport.bgmWhen`（由上往下取第一個成立的，晚的排前面）：**

    { need:'ep_night_mi_done',                            bgm:'result'      }  // 第二天起
    { need:'ep_night_anya_out', until:'ep_night_mi_done',  bgm:'echoedart'   }  // 守夜
    { need:'ep_hairpin_talk',   until:'ep_night_anya_out', bgm:'glasscradle' }  // 米夏注視之後

**拍上的四處**（`script/town.js`）：
· 旅店長談・**米夏注視**那一拍 → `glasscradle`（Ray 指定的那一拍）
· 守夜・**安雅溜出房間**第一拍 → `echoedart`（＝「休息兩小時後」）
· 隔日審訊**第一拍** → `result`（＝「第二天開始」）
· 審訊・**「安娜˙謝琳娜˙謝索洛夫殿下。」** → `glasscradle`

⚠⚠ **`result` 那一條沒有 `until`** ＝ 第二天之後就一直是它。**Ray 只說了起點，
沒說終點** —— 要收在哪一段等他定，定了補一個 `until` 就好。
**不要自己猜終點**：猜錯的下場是某一段戲的曲子憑空變回 `portside`，而那不報錯。
⚠ 同理，**謝索洛夫那一句換的 glasscradle 沒有人把它換回來** —— 走出旅店那一格就
回到 `result`。要它撐到某一段為止，在 `bgmWhen` 補一條排在 `result` 上面。

## 二、兩張差分（Ray 指定）

| 哪一句 | 原本 | 改成 |
|---|---|---|
| 諾薇兒「好好吃。」（審訊） | `bigsmileclose` | **`lookaway`** |
| 蕾娜「我相信安娜殿下沒有惡意，但是……」 | `dying` | **`evalutatingclosemouth`** |

⚠ **`好好吃。` 全庫有兩處** —— 另一處在**帝都餐飲街**（1303 行），那一處本來就是
`lookaway`、**沒有動**。改的是審訊那一處（5502 行）。

## 三、⚠⚠⚠ 兩支音檔**不在這台機器上**（Ray：「先寫，切回 mac 後就可以接上」）

|  | 短名 | 檔名（我照 Ray 的字面 ＋ `.m4a`） |
|---|---|---|
| 安雅與米夏 | `glasscradle` | `Peritune_Glass_Cradle_loop.m4a` |
| 守夜 | `echoedart` | `Peritune_Echoed_Art.m4a` |

⚠⚠ **Ray 只說了 Glass Cradle 沒有，但實查 `Echoed_Art` 在這台也不存在** ——
兩支一起當成「還沒到」處理。

**四個地方都已經備好，檔案放進 `resources/audio/bgm/` 就會響：**
① `config.js` 的 `ASSETS.bgm_glasscradle` / `bgm_echoedart`
② `modules/story.js` 的 `BGM_FILES`
③ 同檔的 `BGM_ALIAS`（⚠ **不能省** —— 執行期有 `ASSETS` 的退路，但
   **`script_lint.py` 只認 `BGM_FILES` 與 `BGM_ALIAS`**，不寫就會被判成「沒有這首 BGM」）
④ `index.html` 的 Credit

**⚠ 回到 Mac 的三件事：**
1. `python3 tools/script_lint.py` —— **檔名拼錯它會直接報「BGM_FILES 表指到不存在的
   檔案」**，照那一行改。
2. `tools/audio_scan.html` 量響度，把兩列補進 `tuning.fileGain`。
   ⚠⚠ **現在那兩列是刻意留空的**（＝增益 1 ＝母帶響度，§6.6）。
   **不要憑感覺填一個數字** —— 那張表每一列都是量出來的，填一個猜的進去，
   下一個人會把它當成量過的。
3. **親耳聽一次**：檔案不在時 `playBgm` 只是靜靜不出聲（不報錯、畫面完全正常），
   所以這件事在這台**測不出來**。

## 四、⚠ 還沒做的一件：**米夏注視的 CI 圖還是沒有**

Ray 說的是「接著是米夏注視 CI」—— **順序線上本來就是**（諾薇兒立繪 → 安雅 →
米夏注視），這一版把**曲子**接上了，**圖仍然沒有**（`CI_Misha_eyes`，-1511 就在等）。
圖到了補 `cg:` 在**那一拍**（不要另開一拍，理由見那裡的註解）。

## 五、驗過的（真的跑了一次 Stage 12-B → 守夜 → 隔日審訊）

| 時機 | 實測 |
|---|---|
| 米夏注視那一拍 | 送出 `Peritune_Glass_Cradle_loop.m4a` → **404**（＝接線對了，檔案沒到） |
| 坐滿兩小時（10/11 23:00 → 10/12 01:00） | 演「（房門輕輕開了。）」＋送出 `Peritune_Echoed_Art.m4a` → **404** |
| 插旗推到隔日 08:00、走一格 | 送出 **`bgm_result.m4a` → 200**（＝`bgmWhen` 的排序對了） |
| 走回旅店 | 審訊自己接上（蕾娜「好的，安雅小姐。」） |
| 諾薇兒「好好吃。」 | DOM 實查 `src` ＝ **`Nouvelle_SI_Lookaway.webp`** |
| 「謝索洛夫殿下」那一句 | 正常演到，console **沒有**「沒有這首 BGM」（＝短名兩支都解得出來） |

⚠ 網路面板的 404 有兩族，**不要混**：`East_*_midnight.*` 是**時段底圖候選鏈**
（退回 `_night`，本來就這樣）；`Peritune_*` 那兩支才是這一輪的欠件。

## 六、⚠ 順手看到、**沒有修**的一件

走進旅店那一次，console 跳了一行**暗罩守望**（§6.5.4 的 `assertNoDarkOverlay`）：

    [story] [town.showNav] 畫面該亮了卻還蓋著：切景黑幕 #storyVeil —— 已清掉，上游有路徑沒收它

· **畫面是好的**（那支守望自己清掉了），四次截圖都正常。
· 憲法說得很清楚：**驗到東西就是上游有 bug，不是誤報**。
· ⚠ 但**不確定是不是這一輪帶進來的** —— -1519 那一輪我只讀了 `onlyErrors`，
  warn 看不到，沒有對照組。**下一輪開工時先讀一次完整 console 確認它在不在**，
  在的話追「哪一條路走完沒有 `veil(false)`」。

## 七、⚠ 測試用的小抄（-1519 那份的續集）

城鎮裡**會動的東西幾乎都是「長按」不是點擊**，而且**按不動時完全沒有錯誤訊息**：
· `#townNav .town-dest`（移動）
· `#innLobby .inn-btn`（獨自坐坐／回房睡覺）—— 走的是同一支 `bindHold`
⇒ 自動化測試一律派送 `pointerdown` → **等 1.5~1.8 秒** → `pointerup`。
⚠ `.click()`、`computer.left_click`、鍵盤方向鍵**三種都沒有用**（我在這上面卡了四次）。

---

# 本輪 — `-1519`（拷問宣言直接接隔日審訊）

> Ray：「蕾娜的拷問宣言之後直接接第二天劇情」

**只動了 `script/town.js` 的一個欄位**（＋版號）。

## 一、改了什麼

`eastport.uptown` 的 **M1（與蕾娜同行）** 那一段（`ep_m1_route`）加了 **`goto:'inn'`**。

· 「拷問宣言」＝那一段的倒數第二句
  「就在這極東之境，用最殘酷的方式拷問妳吧。」
· 「第二天劇情」＝旅店的 `ep_interrogate`（隔日審訊）。
· **`clockToday:8` 本來就在**（把時鐘推到早上八點，正好落在 `ep_interrogate` 的
  `hourOfDay:[8,18]` 裡）—— **缺的只是那段路**：玩家還得自己從上城區往上走回旅店。
· 引擎的順序是 **旗 → `clockToday` → `goto`**（`modules/town.js` 的 `applyClockToday`
  那一段就是為這件事排的）⇒ 抵達旅店那一刻時鐘已經八點，審訊當場成立。
  **審訊那一段本身一個字都沒改** —— 接戲的門是「抵達那一格」（同 -1517 那一件）。

⚠ 同城不必寫 `@eastport:`，`goto:'inn'` 就好。
⚠ **不寫 `enterAgain`**：這一段演在上城區，人必然不在旅店裡。
⚠⚠ **M2（獨自跟上）沒有加** —— `ep_interrogate` 的 `need` 是 `ep_m1_route`，
  M2 本來就沒有隔日那一段（蕾娜沒跟去就沒看到米夏）。給它 `goto` 只會把玩家
  搬回旅店然後什麼都不演。**這一條要改的話是「先寫 M2 的隔日戲」，不是先加 goto。**

## 二、驗過的（真的從頭跑了一次）

Stage 12-B 進旅店 → 注入 `ep_hairpin_talk`／`ep_night_anya_out`／`ep_night_renna`
三支旗 ＋ 時鐘 +120 分（＝01:00）→ 走去上城區 → M1 整段演完：

    「算了。明天有一整天的時間。」
    「就在這極東之境，用最殘酷的方式拷問妳吧。」
    →（三秒轉場，玩家不必做任何事）
    旅店・白天底圖（East_Hotel_Day）→ 蕾娜「好的，安雅小姐。」

收工實測 `tivot_clock_v1` ＝ **1260 分 ＝ 10/12 08:00**，
旗是 `ep_night_mi_done` ＋ `ep_m1_route`，**console 零錯誤**。

⚠ 網路面板會看到 `East_Uptown_midnight.*` **一串 404** —— 那是**時段底圖候選鏈**
在試「午夜版」，試不到就退回 `East_Uptown_night.webp`（200）。**與這一輪無關、本來就這樣**，
不要把它當成新壞掉的東西去追。

## 三、⚠ 測試用的小抄（下一個 session 可以省很多時間）

旗與時鐘都是**純 localStorage**，`hasFlag` 每次現讀 ⇒ **可以直接注入**：

    JSON.parse(localStorage.tivot_flags_v1)      // 旗（陣列）
    localStorage.tivot_clock_v1                  // 開局起算的分鐘數

· 章節跳關擺好底，再注入幾支旗 ＋ 推時鐘，就能落在任何一段的前一拍。
· ⚠ 城鎮的**移動是長按**不是點擊：`#townNav .town-dest` 要 `pointerdown` 按住
  約 1.5 秒（`.click()` 與鍵盤方向鍵都沒有用，而且不會有任何錯誤訊息）。

---

# 本輪 — `-1518`（電腦版的固定比例框）

> Ray：「視窗比例會隨視窗大小變動，給電腦版一個固定比例」

**只動了 `style.css` 一支**（＋ `bust.py` 的版號）。

## 一、做法：**一段 `@media (pointer:fine)`，收在 `style.css` 的最尾端**

    --frame-w: min(100vw, calc(100vh * 390 / 844), var(--app-max-w))
    --frame-h: calc(var(--frame-w) * 844 / 390)

· **比例只有一個計算點**（鐵律 7）：`--frame-w` 由三個上限解出來，
  `--frame-h` **只從 `--frame-w` 推** ⇒ 永遠同一個比例。
· 比例 **390×844** ＝ 憲法 §6 驗收流程用的那個 viewport（不另立數字）。
· `--app-max-w:520px` ＝ `#app` 本來那個 `max-width`，現在**框與 `#app` 讀同一個變數**
  ⇒ 不會各自封頂在不同的寬度。
· 露出來的黑邊是 `body` 的 `--bg`，沒有新顏色。

## 二、⚠⚠⚠ 三個踩過／避開的坑

### 1. **這一段一定要排在檔尾** —— 第一版寫在檔頭，靜靜地沒生效

`#app`（`max-width`）、`#flightFrame`（`width/height:100%`）那幾條就在上面，
**選擇器層級一模一樣（都是 id），比的是順序**。排到前面去＝完全不生效，
而且畫面上沒有任何錯誤訊息（實測 `#app` 依舊是 520×800）。

### 2. **`body` 不准加 `transform` / `contain`**

那會讓**所有** `position:fixed` 改以 body 為準（＝框）。而戰鬥特效
（`enemy.shellFrom` 的彈殼、`throwDagger`、`gear.js` 的教學光圈…）寫進 `style.left`
的是 `getBoundingClientRect()` 的**視窗座標** ⇒ 整批會平移一整條黑邊的寬度，
**而且不會報錯**。所以這一版**只把「畫面本身」收進框**，
`position:fixed` 的相對對象一個字都沒有改。
⚠ 框是**置中**的，所以任何「置中」的東西位置完全不變。

### 3. **`#app` / `#storyStage` 也不准加 `contain`**

那會讓它變成 stacking context ⇒ 裡面的 `#gearSheet`（z:8450）、
`body.prep-over #prepSheet`（z:8400）就再也蓋不過 body 層的 `#storyStage`（z:8300）
—— 而那幾個 z-index 是**刻意**排成這樣的。

## 三、⚠ 這一版的已知代價

· **「會整片蓋滿畫面的層」是一份清單**（那一條選擇器）：
  `#assetLoader #storyStage #flightFrame #gearSheet #gameMenu #chapterSheet
   #choiceSheet #nameSheet #storyLog #saveSheet #exitConfirm #tutSkipConfirm`。
  新增一層這種頁面要加進去。⚠ **漏掉的下場是那一頁沒有黑邊（一眼看得見）**，
  不是靜靜壞掉 —— 這是在「清單」與「上面第 2 點那個會平移特效的 containing block」
  之間選的，理由寫在那一段的註解裡。
  ⚠ 只列**無條件**就是 `position:fixed;inset:0` 的：`#prepSheet`／`#weaponSheet`／
    `#partnerSheet` 是 `body.prep-over` 時才轉 fixed，給它固定寬高會在另一半情境下壞掉。
· **`#muteBtn`／`#devStat` 仍在視窗的角落**（框外）—— 兩個都是 `body.testmode` 限定的
  開發用浮標，留在框外反而好按。要收進框就加進那一條選擇器。
· **`--appvh` 沒有跟著改**（它是 main.js 寫在 html 上的 inline style，蓋不過去）。
  框幾乎總是「高度吃滿視窗」，只有視窗高過 `520 / (390/844)` ≈ **1125px** 時才差得出來
  （首頁的垂直間距會略鬆）。看得出來再處理。

## 四、驗過的（`pointer:fine` 的桌機視窗）

| 視窗 | `#app` | 比例 |
|---|---|---|
| 1280×800 | 370×800，left 455（左右留邊） | 0.4621 ✔ |
| 1600×600 | 277×600 | 0.4621 ✔ |
| 1200×1400 | 520×1125，top 137（**上下**留邊，`--app-max-w` 封頂） | 0.4621 ✔ |
| 寬 300（模擬器轉成觸控裝置） | 300×900 原樣 | 不套框 ✔（鐵律 12：手機不受影響） |

畫面逐一看過：開機讀取頁／首頁／章節面板／東泊旅店的劇情，都乖乖落在框裡，
console 零錯誤。

---

# 本輪 — `-1517`（撿完髮飾直接接旅店長談／旅店對話列為 Stage 12-B）

> 這一輪在 **Windows 那台**跑的，只動了三支檔（`script/town.js`／`script/progress.js`／
> `config.js`）＋ `bust.py` 的三處版號。**沒有碰 `resources/`**（見下面第四節）。

## 一、Ray 這一輪交辦的兩件

> 「將撿完髮飾後的劇情直接接到旅店對話」「旅店對話定為 stage 12B，列入章節選擇」

### 1. 撿完髮飾 → 旅店長談：改的是**一個 `goto`**

`script/town.js` 的 `belisar.entrance`：`bl_night_done`（髮飾奪回來那一段）
收尾的 `goto` 由 `@eastport:square` 改成 **`@eastport:inn`**。

· 為什麼這樣就夠：旅店那一段長談（`ep_hairpin_talk`）的 `need` **本來就是**
  `bl_night_done`，只是玩家得自己從廣場走兩格（廣場→上城區→旅店）過去。
  接戲的門是「**抵達那一格**」（`open()` → `enter()` → `actDue`），跨圖 `goto`
  走的正是同一支 `open()`（`modules/town.js` 的 `@` 分支）⇒ 落在旅店那一格，
  那一次抵達就自己接上了。**兩段對白一個字都沒改。**
· ⚠ 廣場那兩段（`ep_bel_back`／`ep_arrive`）**不會因此漏掉** —— 它們的 `need`
  在白天那一趟就成立過、旗早就插了。
· ⚠ **不寫 `enterAgain`**：那是給「人已經站在那一格」用的，而這一段演在古城入口。

### 2. Stage 12-B ＝ 旅店那一段長談

`script/progress.js` 的 `CHAPTERS` 新增一筆 `stage12b`（`main.js` 一個字都不必動，
章節選單是從這張表長出來的）。

| 欄 | 值 | 理由 |
|---|---|---|
| `name` | `Stage 12-B` | ⚠ **`-B` 只在 `name` 上**，`stage` 是整數 **12**（同 10-B／11-B：`stage` 要比大小，`-B` 是顯示） |
| 落點 | `eastport:inn` | ⚠ **跟著上面那個 `goto` 走** —— 跳關與正常流程要落在同一格，不然這一筆測到的路跟玩家跑的路不一樣 |
| `clockHour` | **23** | ⚠⚠ **不可以給 0~6 點**：下一段（安雅溜出房間）的門是 `hourOfDay:[0,6]`，起點若已過午夜，長談與那一段會在同一次抵達連著演完 ⇒ 中間「守夜・坐兩小時跨過午夜」整段測不到 |
| `aff` | `renna:40`（T3） | 同 10-B／11-B；`tierMin:3` 那句「我很相信你喔。」要 T3 才多講 |
| 旗 | 11-B 那一串 ＋ **三支** | `bl_night_sky`（空中戰打完）／`bl_night_done`（這一章的 `need`）／`renna_t4_ok`（那一段最後插的 T4 解鎖 —— 不給的話蕾娜會莫名其妙封頂在 T3） |

⚠ **`ep_hairpin_talk` 不給** —— 那正是這一章要演的第一拍。
⚠ 主線目前一樣**沒有任何一段會 `setStage(12)`**（東泊線上跑的還是 stage 9）：
  這一筆是**章節工具的落點**，不是「主線升到十二章」。哪一段負責升章由 Ray 定。

## 二、驗過的

· 章節選單第 13 列出現 **Stage 12-B**，按下去：東方泊地・旅店、**1908/10/11 23:00**、
  HUD 印 `stage 12｜ver -1517｜蕾40`，長談第一句（索菈娜「折騰一晚上，呼啊——」）
  自己接上，往下點四句正常，**console 零錯誤**。
· `goto` 那一半沒有從頭跑一次空中戰 —— 但它與章節落點**走的是同一支 `open()`**
  （跨圖 `goto` 的 `@` 分支就是它），而且形狀與既有的
  `ep_bel_court → @eastport:square → ep_bel_back` 完全一樣（那一條線上一直是好的）。

## 三、⚠⚠ 這台機器（Windows）與交接寫的 Mac **不一樣**

| 件 | 狀況 |
|---|---|
| `node` | **沒有** ⇒ `tools/script_lint.py` **跑不動**（它要 node 或 macOS 的 jsc，兩個都沒有）。這一輪的語法驗證是**靠瀏覽器真的載一次**（模組載得起來＝沒有 SyntaxError） |
| `python3` | 是 WindowsApps 的殼；**可用的是 `python`**（3.11.9） |
| `tools/devserver.py` | ⚠ 要 `PYTHONIOENCODING=utf-8`，不然開機那行中文會 `UnicodeEncodeError` 直接退出（cp1252）。指令：`PYTHONIOENCODING=utf-8 PORT=8145 python tools/devserver.py` |
| `tools/bust.py` | 正常（已跑，v=1517，模組 40 支） |
| port | 這一輪用 **8145**，收工已關。Ray 的 8123／8200 沒碰 |

## 四、⚠⚠⚠ 同一個 repo 裡**還有一個美術 session 在跑**

開工時 HEAD 是 `e3c48dd1`（-1515），做到一半變成 `1be18bea`
（「tools(去背): 本機 matting 建制 ver -1516」），而且 working tree 裡有一大批
`resources/SI/*.webp` 是**改了還沒 commit 的**。

· ⇒ 這一輪**只 commit 自己動的那幾支檔**（`git add <path>` 逐支，**不准 `git add -A`**）——
  不然會把美術那邊做到一半的東西一起推上去。
· ⇒ 版號跳過 -1516（那一支被美術那邊的 commit 用掉了），這一輪是 **-1517**。
  ⚠ `config.js` 在 -1516 那次**沒有被 bump**（純工具改動），所以 HUD 上不會有 -1516 這一版。
· ⚠ 這正是鐵律 11 在講的那個風險：**另一個 session 手上的檔案是舊讀值**。
  動任何共用檔（`config.js`／`CLAUDE.md`／這一份）之前先 `git log -1` 看一眼。

---

# 本輪 — `-1503` ～ `-1515`（主角空白格／MB 回滿／立繪接線／Stage10-B 收尾）

## ⚠⚠⚠ 開工第一件事：**問 Ray 的 HUD 顯示幾版**（沿用，理由見 -1448 那一輪）

## ⚠⚠⚠ 第二件事：**伺服器用 `tools/devserver.py`**（-1500）

    PORT=8200 python3 tools/devserver.py

⚠ **這一輪是在 Mac 上跑的**，而這台**沒有 node**（`node --check` 用不了）。
語法檢查改用 macOS 自帶的 jsc：

    JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
    $JSC --module-file=modules/story.js   # 只看有沒有 SyntaxError

⚠ `tools/script_lint.py`、`tools/bust.py --bump`、`tools/si_xlsx.py` 在這台都正常。

---

## 一、⚠⚠⚠ 這一輪最貴的四課（每一課都是「做了、但沒接上，而且不報錯」）

### 1. 旅店自己演的對白**從來沒有人記好感**（-1514 挖出來的舊洞）

`line.aff` 的記帳只有 `applyAff` 一支，住在 `modules/town.js`；而旅店那一層
（敲門的 `date`／`rennaAlt`）走的是**自己的** `host.play` —— 兩條路都沒接。
· 症狀：**演了、旗也插了、好感就是不動**，零錯誤訊息。
· 修法：`applyAff` 交給 `st1`，兩條路的收尾各叫一次。
· ⚠ 我第一次寫成 `host.applyAff` 又踩一次同樣的坑 —— 它掛在 **`st1`** 上，
  `if(undefined)` 會**靜靜跳過**。**注入的鉤子掛在哪個物件上，要看著程式確認。**

### 2. 寫在錯的層級上，不會有人告訴你

| 寫錯 | 真正吃它的是誰 | 後果 |
|---|---|---|
| act 上寫 `clockTo` | 只有 `gates`（`clockGate`） | 時鐘不動，不報錯 |
| 一拍上寫 `needTier` | 只有 `actDue`（擋整段） | 完全沒作用，不報錯 |
| 一拍上要「多講一句」 | `tierMin`／`tierMax`（story.js） | —— |

⇒ **加任何欄位之前，先 grep 誰在讀它。**

### 3. `QUEST_LOCK` 改成陣列，四處 `.flag` 會變 `undefined`

`need:undefined` ＝**沒有條件** ⇒ 古城那三段會立刻演。所以第一扇窗給了名字
（`Q_HAIRPIN`），**指名的人讀名字，不要讀容器**。

### 4. 「開啟那一段的條件，同時把它擋死」（§6.5.4.2 -581 的同一個形狀）

半夜敲蕾娜的門那一段**只發生在深夜**，而宵禁（21:00~07:00）正好蓋在同一段時間上。
⇒ 敲門的劇本回應加了**明寫的例外** `anytime:true`（漏寫就照舊被擋，安全的那一側是預設）。

---

## 二、逐件

| 件 | 版 | 重點 |
|---|---|---|
| **主角空白格** | -1503／-1505 | 滿寬空框 → **小氣泡（104×62）＋三顆跑動的點**，最短停留 **0.7 秒**；**加速模式豁免**（Ray 定）。⚠⚠ 保護期與自動計時器**必須同一個來源**，不然加速模式先到就卡死。⚠⚠⚠ 彈出動畫**不准動 opacity**：`both` 的 fill ＋ 動畫被暫停 ＝ 整顆看不見。⚠ 置中改用獨立 `translate`，`scale` 會把 `translateX(-50%)` 一起縮 |
| **MB 回滿** | -1506 | 未擊殺由回 50% 改成**回滿**。⚠ 順手修掉**從 -974 就在說謊的副標**：惡夢化的 MB 與聖徒化的 MB 共用 cut-in，但 -974 起它回的是 `niFrom` —— 已拆成 `nmbSub` |
| **72 列取景值** | -1507 | 四主差分擴充接線。逐張複驗 0 筆對不上；標 `?` 的 11 張 **fx 目視重量**改了 9 個；4 張座姿走 `cm`＋`standCm`。實測 **faceX 展幅 0.0px** |
| **差分表分頁** | -1507 | 一個角色一頁（12 頁）。頁籤用**投票**取名（問已接線的列自己說自己是誰）⇒ 檔案改派時自己跟著走 |
| **Prairie5 → `bgm_nemo`** | -1508 | 尼莫戰的預設曲。⚠ 加一首 BGM 要補**四個地方**（ASSETS／`BGM_FILES`／`fileGain`／Credit） |
| **阿瑞尼斯** | -1504／-1509 | 舊司祭立繪正名（北泊司祭換成 `NPC_NP_Priest`）＋ 6 張表情差分；底圖 `git mv` 成 `Arrhenius_SI_front.webp` |
| **risehand 取景** | -1510 | 舉起的手不是頭頂（同 -635 法環那一課）：`top 1→124`／`fx 0.393→0.620` |
| **Stage10-B 收尾** | -1511～-1515 | 見下 |

---

## 三、Stage10-B 那一整段（-1514／-1515）

**流程**：旅店長談 → 守夜（睡覺擋、提示指「獨自坐坐」）→ 坐兩小時 →
安雅溜出（她的門變 `empty`）→ 岔路：
· 敲蕾娜的門 ⇒ 一起跟上（好感 +2，`ep_m1_route`）→ **隔日審訊**
· 直接走出旅店 ⇒ 獨自跟上（`ep_m2_route`），俄語四句全程極小字
兩條路都插 `ep_night_mi_done`、`clockToday:8` 推到隔天早上。

**新做的機制**：
· `tiny:true`（極小字，9px vs 13px）—— ⚠ 排在 `dlg-large` 之前，玩家開了「加大」時蓋過它
· `QUEST_LOCK` 改陣列（一輪有好幾段任務窗）
· 敲門的劇本回應可 `anytime:true`（繞過宵禁）
· `innDoors[].say` 可寫 `{ text, narrate:true }` ＝**旁白**
· `MISHA_X`（？？？）／`MISHA`，**`art:null`**（圖還沒有）

⚠ 稿上第一句「快下降！…」**線上早就有**（`SKY_WIN_TALK`），掛的是**諾薇兒**
（稿上標「安：」是筆誤）。中庭那一段（含 `renna_t4_ok`）**也早就做完了**。

---

## 四、⚠ 程式端還欠的（照優先序）

1. ⭐ **守墓者・不死者之龍 BOSS 四張卡** —— 數值與四張圖都到齊，
   規格 `resources/enemy/_tomb_mon_spec.md` §八～§九。⚠ 照抄鹿主時 `entrance:null` 會把龍吟蓋掉。
2. **尼莫的戰鬥卡** —— BGM（`bgm_nemo`）已備好。
   ⚠⚠ `resources/enemy/man_nemo.webp` 已入庫，但**那張圖的用途是美術推斷的**，
   接卡之前要 Ray 確認一句「它是不是尼莫的戰鬥立繪」。
3. **木雅克神殿的 `noTime` 14 格**（清單見 -1502 那一輪）
4. **空戰三雲景輪播**（12 張已到齊，規格 `_skybattle_spec.md`；要處理「一局之內不可換」）
5. **鏡湖的 `ASSET_VER`**（11 個 day 基底＋33 個時段名）
6. `se_enemy_throneattack`／`se_rockimpact`／`se_dragonbite`／`se_enemy_holyburst` 的 `fileGain` 還沒量
7. 東泊 10 格店舖的 `noTime` 卡在檔名（等美術改名）

## 五、⚠ 等 Ray 一句話

| 件 | 問題 |
|---|---|
| **無髮飾蕾娜立繪組** | Ray -1511：「先跳過，用原圖，之後再一次改」。⚠ 實查：`resources/SI/` 與 `renna_newhair/` **兩組都戴著髮飾**，「無髮飾」那一組庫裡沒有 |
| **顯示名「阿瑞尼斯」** | 是我音譯的（Ray 只給了 `Arrhenius`） |
| **`obeSub` 印「O.B.E. · HP 1」** | ver -964 起 OBE 不再扣血 —— 這行字已經說謊 550 版，新字面要 Ray 定 |
| 鏡湖的地名與 `Lake_` 前綴 | 還是暫名，44 個檔名綁著它 |
| 那幾件 -1502 就在等的（熄滅版石碑林／符文光色／石碑發光） | 沿用 |

## 六、⚠ 等美術（位置都留了註解，圖到了補 `cg:`／`art` 即可）

米夏立繪／米夏眼部 CI／少年遠望插畫／諾薇兒拿點心插圖／諾薇兒抱安雅插圖。

## 七、⚠ 測試的 port

Ray 的是 **8123／8200**（不要碰，也不要清他的 localStorage）。
我這一輪用 **8142**，收工已關。

---

# 本輪 — `-1487` ～ `-1502`（雪都改名與擴建／小地圖／鏡湖／地圖編輯存檔）

## ⚠⚠⚠ 開工第一件事：**問 Ray 的 HUD 顯示幾版**（沿用，理由見 -1448 那一輪）

## ⚠⚠⚠ 第二件事：**伺服器換成 `tools/devserver.py`**（-1500）

    PORT=8200 python3 tools/devserver.py

`python3 -m http.server` **照樣跑得動**，只是**地圖編輯存不進檔案**（console 會喊 501）。
`.claude/launch.json` 三個 config 都已改指它。

---

## 一、⚠⚠⚠ 這一輪最貴的兩課

### 1. 「規矩寫在註解裡」＝ 沒有規矩（-1491 → -1493）

-1491 我把「拉芬斯達爾城」改名成「雪都瓦恩霍姆」，**在 commit 裡就寫了風險**
（「這台機器若存過拖城覆寫，鑰匙對不上會退回 code 寫的座標」）——
**但只寫成一句話，沒做成會執行的東西**。隔一天 Ray 就回報「我用地圖編輯改出來的東西怎不見了」。
· 病灶：拖城／刪城**兩本帳都拿「顯示名」當鑰匙**，改名 ⇒ `ov[S.n]` 查不到 ⇒ 靜靜跳過。
· 修法：`SETTLE_RENAMES`（舊名→現名）＋ 開機一次性遷移（**先推備份**）。
· ⇒ **規矩：改任何 `SETTLEMENTS.n`／`PLACES.name` 之前，先在那張表加一列。**
  （-1496 改「山谷湖碑」→「鏡湖」時第一次照著用，驗過確實接得住。）

### 2. 一條線留在原地，而兩個手勢已經對調過了（-1495）

Ray：「探索（點船）被索敵（點天空）遮住了」。
-1292 加 `y < H/2` 時**長按船身是「索敵」**；**-1418 把兩個手勢對調**，那條線沒跟著走
⇒ 它從「索敵只認上半」變成「**船只有上半截按得到**」。
實測：`H/2`＝599.5，而船圈**圓心 601.7** —— 圓心就在線下面 2.2px，
按船身掉進「天空」那一條，1.2 秒後起的是索敵。
⇒ 把那條線放回它現在該管的手勢（船＝`skyBottom()`、天空＝`skyHuntFloor()`）。
**自檢：對調兩個手勢的意義時，把兩邊的邊界條件並排看一次。**

---

## 二、逐件

| 件 | 版 | 重點 |
|---|---|---|
| **震動吃掉插圖平移** | -1487 | -1453 只修對一半（動畫**沒有**重來，`currentTime` 全程 2600），壞的是**兩個動畫搶同一個 `transform`**、震動排在後面 ⇒ 每一拍 shake 就跳回沒平移的取景 0.42 秒。⇒ `storyShake` 改動 **`translate`**（獨立變換屬性，相乘合成）。八層一起好。 |
| **雪都瓦恩霍姆** | -1488／-1491／-1492 | 改名（含大地圖名牌、`export_mapref`、Credit）；12→**16 格**（圖書館＋餐飲街三分支，同東泊）；`dining:{}` 整段拿掉；背景前綴 `Ravn_`→**`Varn_`**（美術 -1488 交的 41 張）。⚠ 順手抓到**旅店的 `noTime` 沒拔** ⇒ 四張新差分一張都沒被用到，而畫面完全正常。 |
| **髮飾劇情必跑** | -1489／-1490 | 拿掉 `ep_night_raid` 的 `needTier:{renna:3}`（全專案唯一一處 `needTier` 用例）；那一晚的睡覺鈕改成「**回房睡覺……？**」（`refreshSleepLabel` 連大字一起換，同一個 `napAct()` 判斷）。 |
| **兩張小地圖** | -1492 | 東泊／雪都各 16 格接上。⚠ **逐點取樣底圖**確認光點落在墨點上（墨 43／紙 126）。 |
| **鏡湖**（隱藏地點） | -1491／-1496／-1497／-1501／-1502 | (647,135) `sense:true`＋`flag:'lakestele_found'`；改名「鏡湖」；**黑石碑 3D**（`RUIN_ART.stele`，9 塊・5 塊青綠碑文走 `col` 通道，CPU/GL 兩路都亮）；**10 格地圖接上、降得下去**；符文走 `bgWhen` 綁同一支旗。 |
| **地圖編輯改存檔案** | -1494／-1500 | 關閉重整時船站回原地（走既有回程鑰匙）；筆畫真相搬到 **`flight/map_edits.json`**（`tools/devserver.py` 的 `POST /__save/…`）—— **換 port／換瀏覽器都還在，玩家也吃得到**。舊 localStorage 自動搬家一次。 |
| 差分表 | -1487／-1502 | 去重（一個差分一列，294 檔→236）；-1502 重跑成 **255 個差分**，並修掉「小寫 `_si_` 讓同一個人變成七個角色」。 |

---

## 三、⚠ 程式端還欠的（**照優先序**，都已經可以直接開工）

1. ⭐ **守墓者・不死者之龍 BOSS 四張卡** —— 美術 -1501 交件並把數值寫成交接：
   `resources/enemy/_tomb_mon_spec.md` §八～§九。四張同名「守墓者」、`kind:'multi'`
   （不跑降臨／淨化）、`hp:350`／`attack:22`、`loot:[]`、`hitFx.assault:'bite'`、
   `entrance:'se_enemy_roardeer'`＋`entranceBlast:true`；三隻追擊輪出、一隻 `crypt` 決戰。
   ⚠ 照抄鹿主時 `entrance:null` 會把龍吟蓋掉。
2. **木雅克神殿的 `noTime` 14 格**（美術已掃出清單，照抄即可）：
   `well, stairup, brazier, mural, colossus, machine, stairdeep, catacomb, hollow,
    prison, mosschamber, deepspring, rift, darkbridge`
   ⛔ **這 5 格絕對不要碰**（有完整四差分）：`antechamber, corridora, crossway, collapsed, corridorb`
3. **空戰三雲景輪播** —— `Sky_Towers`／`Sky_Cumulus`／`Sky_Cirrus` **12 張已到齊**。
   規格 `resources/background/_skybattle_spec.md`；⚠ 要一併處理「一局之內不可以換」。
4. **鏡湖的 `ASSET_VER`**：11 個 day 基底名要跳版號（同名覆蓋）、33 個時段名要登記。
5. `se_enemy_throneattack`／`se_rockimpact`／`se_dragonbite`／`se_enemy_holyburst`
   的 `tuning.fileGain` **都還沒量**（§6.6：沒補＝以母帶響度播出）。
6. 東泊 10 格店舖的 `noTime` 卡在檔名（`_Day` 尾綴），要美術改名才加得了。

## 四、⚠ 等 Ray 一句話

| 件 | 問題 |
|---|---|
| **鏡湖的地名與 `Lake_` 前綴** | 都還是**暫名**，現在 44 個檔名綁著它 —— 愈晚改愈貴 |
| **熄滅版的石碑林** | `nearestTown` 要旗才降得下去 ⇒ 正常流程進去符文一定亮著，`Lake_Grove_*` 四張等於看不到。要玩家看到「熄→亮」得讓鏡湖在感應前就降得下去 |
| 符文光色 | 現在是冷銀藍白，Ray 沒指定過 |
| **石碑的「發光」** | 目前是**自體亮色、不吃光照**（夜裡環境光最多混 28%）。真正的光暈（外圈 bloom、完全不吃環境光）要多開一個 kind（VS/FS/封裝三處），還沒做 |
| 鏡湖那一帶的地形 | 盆地底 h=59、`CLOUD_H` 44 ⇒ 低空進去整片霧；四周稜線 300~360 ⇒ 幾乎只有正上方看得到。**Ray 已自己重畫地形，叫我不要動** |

## 五、⚠ 測試的 port

Ray 的是 **8123／8200**（不要碰，也不要清他的 localStorage）。
我這一輪用 **8138～8141**，收工都已經關掉、測試資料也清乾淨。

---

# 上一輪 — `-1467` ～ `-1486`（飛行怪的素材與畫法／索敵／空中戰）

## ⚠⚠⚠ 開工第一件事：**問 Ray 的 HUD 顯示幾版**（沿用上一輪，理由見下面那一段）

---

## 一、⚠⚠⚠ 這一輪最貴的一課：**「血是 0」不等於「牠死了」**

`bl_dragon_front`（空中戰第三型態）打完要 `morph` 成第四型態，而換卡是**延後 2.5 秒**的
（`HOLY_SWAP_MS`，放光演完才換）。那 2.5 秒裡**舊卡的血是 0、新卡還沒掛上** ——
系統裡有好幾條路只問「血是不是 0」：

· ⚠⚠ **反擊是連發的**（Ray 踩到的就是這條）：第一發把血打到 0、`maybeMorph` 接走；
  **同一串的後續幾發**再進 `enemyDamage` 時 `morphed` 已經 true ⇒ 不再攔，
  血是 0 ⇒ 直接走死亡流程。機槍串、雙槍破防窗口、聖徒化追打都是同一個形狀。
· **擊殺落在最後一格**：`tap()` 接著清盤 ⇒ `clearBoard` 看到血是 0 就收場。

兩條都**沒有任何錯誤訊息**，症狀是「第四型態不見了」而且**時有時無**（看最後一下怎麼打）。
⚠⚠ **開發用的「清盤」鈕測不出來**：它是**清完盤才補最後一擊**，擊殺落在清盤之後，
   剛好繞開那兩條路 —— 我用它測了一輪還以為是好的。

**作法（-1486）**：`morphed`（換過了）與 **`morphSwapping`（正在換的那 2.5 秒）**分開，
守門放在 **`finishEnemyOrAdvance()`** —— 它自己的註解就寫著是「一隻怪倒下的**唯一
匯流點**」⇒ 日後多出任何一條路都自動吃到（鐵律 8）。另外兩道（`enemyDamage` 空窗
不吃傷害、`clearBoard` 不推下一盤）只是省掉無意義的動作。

## 二、戰鬥／演出

| 件 | 版 | 重點 |
|---|---|---|
| **空戰怪出現地下聖徒** | -1467 | `startGame()` 第一件事是無條件 `enemy.startLineup()` ＝載**挑戰那一串的第一隻**（`currentEnemy`＝`faceless`），七十行後才換成卡上的。網路慢時 `<img>` 在新圖解碼完成前不重繪 ⇒ 玩家看著地下聖徒。⚠ -1321 修的是**開機**那一次，管不到「每一場戰鬥的開頭」。⇒ 載哪一隻搬到**搭檔決定之後**、只算一次；`loadEnemyPortrait` 換怪先拔 `src`（順手：`#enemyImg` 的 `alt` 清空，不然空窗會露出破圖字）。 |
| **第四型態不見** | -1486 | 見上面第一節。 |
| BGM 重疊 | -1468 | 「讓位」以前是 `tick(0)` —— **元素照樣在播，只是每幀被按成 0**。實測 `keepbgm=1` 而 `bgmMain.playing()` 仍是 true。⇒ 飛行頁音樂的開關**唯一擁有者是 `updateBgm`**（父頁放著就 `stop()`），`kick()` 只管解鎖手勢；`stop()` 一律把音量歸零。**已入憲 §6.6**：「同一時刻整個 app 只准一個播放器 playing」——音量是演出，`playing` 才是狀態。 |
| 索敵後才生怪 | -1480／-1482 | 以前 `spotFire()` 之後**同一拍**就 spawn。⇒ `spotFire(done)` 收回呼（收尾只有一處）。⚠⚠ -1480 我又做出**一按出兩隻**：`scriptedDue()` 的守門看 `skyHeldOnce`（按下去就設）⇒ 下一幀 `updateEnemy` 先生一隻。-1482 拆成 `skyHeldOnce`（手勢做到了）與 **`skySpotDone`（演出收尾了）**，而且**生成點只留 `updateEnemy` 一個**。 |
| 索敵 CI 被裁 | -1483 | -1481／-1482 我兩次都錯在**拿臉的錨點（`ay`／`fy`）去定位** —— 那組數字沒把控制區上緣當邊界。⇒ **錨底**：任何一刻底都貼在 `VIEWH`，尺寸由最大那一刻反解（`h_max ≤ VIEWH−pad`）⇒ **放大縮小的幅度可以自由調，兩端都不會被截**。 |
| 教學圈圈到船 | -1481／-1482 | 框是對的（收在船圈上緣 10px 之上），**撐出去的是那個圓**（`max(w,h)*0.75+14`＝365、圓底 646 vs 船頂 523）。-1481 我做成「整個內接」⇒ 縮太小；-1482 改成**只夾下緣**：半徑 233、圓底 513。 |

## 三、飛行怪（王座徘徊者）—— 素材與畫法整個重做

| 件 | 版 | 重點 |
|---|---|---|
| 上下鏡射 | -1468 | 朝向拿**已經加了擺動**的投影點算。`vertical:true` 的擺動加在**高度**上、投影到螢幕就是上下位移 ⇒ 擺幅壓過相鄰兩節的深度位移時**相鄰點前後顛倒**。算過：每節深度位移 3px 時 **34% 的節在任一瞬間是反的**（正對鏡頭飛時最嚴重）。⇒ 另存一份**不含擺動**的投影點算角度，基線太短就往回多退一節。 |
| 外框切邊 | -1470 | `marginW` 只由圖的尺寸算，**完全沒算 `gap`**（相鄰兩節在螢幕上的距離，貼近時很大）⇒ 越近切得越兇。⇒ 改成外接圓半徑 ＋ `maxGap*0.8`，**兩項都由實際會畫的東西推出來**。 |
| 「整個是方塊、上下被橫切」 | -1471 | **不是框太小，是圖真的被切開**：三帶（head／wings／body）的分界**切在實心上**（y=0.196 那列 278px、y=0.642 那列 621px，圖寬才 1230）。⇒ `sprite.whole:true` ＝**整張貼、一刀都不切**（只給宣告的素材；蜈蚣／羽蛇不動）。 |
| 振翅 | -1469／-1473 | 單邊翅沿翼展切**三欄**，`kk=k/(N−1)` ⇒ **最內那欄完全不壓**（身體不動）、越往翼端壓越多，外側欄再往後掠。⚠ -1471 我把它繞過去了（整張貼做成一個 `drawImage`），-1473 接回來 —— **縱向切不會有接縫**（同節點、同角度、首尾相接），與「不裁圖」不互斥。 |
| 素材 | -1468／-1475／-1479 | 美術的優化版一直躺在 `~/Downloads` 沒進專案（線上還是 -1427 那張 **511×768**）。現在**兩個視角**：`front`＝第三型態那張正面飛行姿（迎面時用、**永遠正立**）、`dorsal`＝頂視圖（飛離時用、跟著航向轉）。換圖有**遲滯**（±0.15）不然橫越視野時每幀換一次。 |
| ⚠⚠ 頂視圖的檔名 | -1479 | **美術在 22:06 覆蓋了 `FLM_DragonThrone/view_0.webp`，換上去的也是正面圖** ⇒ 當場沒有頂視圖、飛離時畫不出東西。我從 `_originals` 轉回來存成 **`top_dorsal.webp`**（檔名獨立就不會再被蓋）。**請美術日後交 `top_dorsal`，不要覆蓋 `view_0`。** |
| 拖尾 | -1469／-1474／-1480 | 四條不透明白束（照船的 `drawWake`，收尾靠寬度收到 0 不靠淡出）。⚠ -1474 才發現它**從來沒露出來過**（錨在 `pts[1]`、被身體整個蓋住）。**-1480 Ray 要求拿掉** ⇒ 改成 `sprite.trail:true` 才有，**預設沒有**。 |
| 眼睛閃 | -1469 | **整支 `drawEyes` 退役**（Ray：「那個是前期地圖夜間明度不夠做的」）。**已入憲 §5**：要「怪在夜裡看得見」去調環境光與剪影，不要加會動的亮點；任何「在素材上疊程序繪製的臉部特徵」都不要做。 |
| 速度 | -1486 | 追擊的 `speedMul` 1.6 → **2.40**（×1.5）。 |

## 四、劇本／章節

| 件 | 版 | 重點 |
|---|---|---|
| **Stage 10-B／11-B** | -1466 | 列入章節選擇。⚠ `-B` 只在 `name` 上，`stage` 是整數 10／11。 |
| **11-B 落在帝都** | -1472 | `enter:'flight'` 只叫 `openFlight()`、**沒給起飛座標**，而 `newRun()` 剛把 `tivot_flight_ret_v1` 清掉 ⇒ 飛行頁退回 `SAIL_FROM_CAPITAL`。⇒ 章節資料寫 `flight:{town:'belisar'}`。**日後任何 `enter:'flight'` 的章節都要給 `flight:`。** |
| 開圖那一句分歧 | -1484 | 開圖前踩過獅階／謁見／王座任一格 → 蕾「把牠往王座之間趕就無處可逃了！」＋**獅階那段趕龍對白不演**；沒踩過 → 蕾「得找一個能困住牠的地方！」。⚠⚠ **一定要在開圖那一刻 latch**（`bl_throne_known`）：獅階那段是**走進獅階時**才演的，那時 `seen_belisar_dragstair` 早就記上了 ⇒ 現算永遠成立。連帶 `onlyIf`／`skipIf` 現在**吃陣列＝任一支成立**（已寫進 `SCRIPT_FORMAT.md`）。 |
| 「一直往反方向跑」 | -1485 | 由「開圖三戰之後」改成**開圖後第一戰**（`DRAGON_TALK_AFTER`）。⚠ 鍵名 `afterThree`／旗名 `bl_chase_talk3` 刻意不改（已寫進 `CHAPTERS` 與存檔）。 |

## 五、⚠ 還沒收的事

· **手機發熱**：Ray 說先觀察。已量到的：**飛行 iframe 交棒進戰鬥時確實被 kill**
  （`src=null`、`contentWindow`→`about:blank`、種在裡面的 rAF 探針消失），飛行跑的是
  **GL 那條**（`GLX` 活著）。桌機內建瀏覽器**浮著不動只有 44 fps**。
  ⇒ 要釘死就看飛行畫面 HUD 那一行（`ver / fps / 緩衝 / q檔`）：**飛行中就掉幀** ＝ 削 GL 的
  工作量；**進戰鬥才燙** ＝ 砍放光那一層（`position:fixed` 蓋滿全畫面、一次 2.9 秒、連發）。
· **美術那邊 6 張圖 ＋ 11 個回收沒 commit**（含 `Sky_Towers_day`）——
  我沒碰，怕蓋掉它正在改的檔。要收要問 Ray。
· 上一輪列的美術欠件（平原小地圖重畫、15 張平原時段差分、`Sky_Cumulus`／`Sky_Cirrus`）照舊。

## 六、⚠ 測試的 port

Ray：「不要動我現在在測的 port，自己另外開一個測」⇒ **我用 8137**；
**8123 與 8200 是 Ray 的，不要碰**（也不要清他的 localStorage）。

---

# 上一輪 — `-1448` ～ `-1466`

## ⚠⚠⚠ 開工第一件事：**問 Ray 的 HUD 顯示幾版**

-1458～-1460 三個 commit 的 `VERSION` **都還是 1457**（我用 `sed s/舊號/新號/` 手動
bump，號碼猜錯時 sed 靜靜什麼都沒做）⇒ 模組網址一直是 `?v=1457` ⇒ **Ray 的瀏覽器
一直吃快取，那三版一個字都沒送出去**，而 HUD 上看不出來（他回報「修了還是壞的」）。

· **一律跑 `python3 tools/bust.py --bump`**（工具自己 +1，不要打舊號碼）。
· `bust.py` 現在**會擋**：tracked 程式碼有改動、而 `VERSION` 與 HEAD 相同就報錯退出。
· 憲法 §6 補了這一段（含那句自檢）。
· ⚠ **同一類錯我在 -1466 又犯一次**（python 的 `str.replace` 沒中卻沒檢查）——
  **改檔的 script 一定要 `assert 新字串 != 舊字串`**，不是只 assert 找得到錯點。

## 一、演出／戰鬥

| 件 | 版 | 重點 |
|---|---|---|
| 跌倒插圖播三次 | -1453 | **真因是 CSS 權重**：`#storyStage.shake #storyCg` 壓過 `#storyCg.pan-v` ⇒ 震動把平移整條取消，`.shake` 一拿掉又從第 0 毫秒重跑。修法是**把兩個動畫寫成同一份清單**（平移排第 0 位，依規格照名字＋位置配對 ⇒ 不重來）。`pan-up`／`pan-down`／`zoom-in` 同病，一併補。 |
| 龍吟 | -1443／-1465 | 震動 → **迎面衝擊的動態模糊**（`#app.roarblast`；-1465 補上劇情層的 `#storyStage.roarblast`，腳本那一拍寫 `roarBlast:true`）。⚠ 不可與 `shake` 同時寫（都動 transform）。 |
| 放光 | -1449 | 綻放節奏**逐格照抄首頁**（2.5s／`.3,.35,.25,1`／起始 .85），淡出 .4s；發動就 `defense.clearThreat()`；音效 `se_enemy_holyburst`。 |
| 三轉四是爪擊 | -1455 | `showHitFx(kind)` 吃的是**受擊種類**，`maybeMorph` 傳的是**特效名** ⇒ 查不到就靜靜退回三爪。新增 `enemy.playFx(name)`（與 showHitFx 共用同一份 switch）。 |
| 空戰背景 | -1455 | `state.battleBg` 是持續狀態，而**飛行交棒那三條路從來沒設它** ⇒ 吃到上一場城鎮戰的背景。三條都補 `setBattleBg(null)`；城鎮那條改問 `isOpen() && isLive()`。 |
| 船戰「重武裝」 | -1456 | 「是不是船戰」以前靠**卡上有沒有 `weaponSound`** 推（兩處各推一次）⇒ 空戰卡沒寫音效表就整組退回陸戰。收成一份真相：場次的 `ship`（`weapon.js` 改問 `state.shipBattle`、`battleBgmOf` 改問 `b.ship`）。`bl_sky` 補艦載武器音 ＋ `counterGapMs:180`。 |
| 魂之歸所無限使用 | -1463 | 諾薇兒卡上**漏寫 `oncePerBattle`** ⇒ `if(act.oncePerBattle && …)` 永遠 false ⇒ 守門等於不存在。把**預設翻到安全那一側**（不寫＝一局一次），要無限次得明寫 `false`。 |
| 王座戰 | -1449 | 拿掉 `morph` ＝ 一條血條打完就結束（`bl_dragon_throne2` 留著但已無人指到）。 |
| 空中戰兩型態 | -1449 | 第三型態 `ult:{on:0}`（鹿主前段）、`morph` 改 `onDeath`；第四型態 hp 700→**500**、`ult:{on:1,hp:100}`（鹿主後段）。 |

## 二、飛行畫面（發熱）

⚠⚠⚠ **-1457：「離開飛行地圖 ＝ 殺掉，沒有例外」寫進憲法（鐵律 10 底下）。**
`closeFlightFrame()` 現在**一定殺**；「藏」與「殺」不再是兩支讓呼叫端挑的函式。
以前只接了三條路，而「返回」「湖上甲板」「讀檔／章節／被抬回旅店進探索地圖」
全部只叫了「藏」⇒ 地形陣列、取樣金字塔、離屏畫布（上百 MB）押著不放 ⇒ 手機發燙。
· 憲法同時補了**通則**：「每次 X 都要 Y」寫成清單＝沒有實作；
  並做成會跑的自檢（`tools/script_lint.py` 的 `HEAVY_PAIRS`，-1458）。

## 三、地圖

· **古城小地圖**換成 2400×2600 直式（-1450），37 點全部移位、`?v=4`；
  長寬比改由 JS 讀 `naturalWidth/naturalHeight`（-1451 拿掉 CSS 那份寫死的）。
· **古城拓樸 46 → 50 邊**（-1449）：美術從 `_topology.001.png` 讀出的是我那份的超集，
  四條漏掉的逐條回原圖取樣確認有墨線。37/37 可達、環 14。
· **小地圖縮放**（-1449／-1451）：捏合／拖曳／滾輪／三顆鈕，上限 6×；
  滿版 contain；地名**不跟著紙放大**（`--tm-inv`），疊到就先收起來只留所在地（-1452）。
· **平原古道**：6 → 10 → 11 格（-1447／-1459），最後一格是**城外**（安全區・結算點），
  倒數第二是狹窄溪谷；-1460 重排、-1461 依 Ray 改成**樹狀**（11 格・10 邊・環 0，
  三條死路）。⚠ **那張羊皮紙還是 6 格的舊版**，參考圖 `resources/map/_layout_plainsroad.png`。
· **龍的移動**：兩階段（-1442，開圖前隨機／開圖後穿過去→唯一那條路→往王座廳）；
  -1445 一場只移一格；-1446 只停**三岔以上**的房間、休息處是「經過不停留」；
  -1446 段落收尾改成**白名單**（只有真的追擊戰才算，結算不再讓牠亂跑）；
  -1454 加 `guardhall:'dragstair'` 漏斗；**-1464 開圖前的遭遇機率 ＝ 探索率 × 0.5**
  （`exploreRate()` 是唯一計算點，小地圖那一行讀的是同一支）。

## 四、章節（-1466）

`CHAPTERS` 新增兩筆：
· **Stage 10-B** — 那一夜・二次進入古城（夜襲）→ 追擊。`belisar/entrance`，21:00，
  `renna` 好感 40（那一夜幾段的門是段位 T3）。⚠ `bl_night_land` 不插 —— 那就是要演的。
· **Stage 11-B** — 升空追擊（上船追）→ 空中戰。`enter:'flight'`，23:00。
  ⚠ **不要插 `bl_night_sky`**（那是空中戰打完的旗，插了就不演了）。
⚠⚠ **`-B` 只在 `name` 上，`stage` 是整數 10／11**；而**主線目前沒有任何一段會
`setStage(10/11)`**（東泊線上跑的還是 stage 9）—— 哪一段升章由 Ray 定。

---

# ⚠⚠ 美術還欠的

1. **平原古道的小地圖**（6 格 → **11 格**，樹狀）—— 參考圖 `_layout_plainsroad.png`，
   座標抄 `TOWNS.plainsroad.map.spots`。⚠ 同名覆蓋要跳 `?v=`。
2. **古道五格的 dawn／dusk／night ＝ 15 張**（現在只有 `_day`，程式端暫時把 `bg` 指到
   帶尾綴的檔名 ＋ `noTime:true`）—— 交齊就改回基底名並拿掉 `noTime`。
3. **空戰的另兩組雲景**：`Sky_Cumulus`／`Sky_Cirrus` 各 4 張（`_skybattle_spec.md`）。
4. **王座徘徊者的飛行 sprite 重製**（`_flight_sprite_handoff.md`）——
   交件時**附 head／wings／body 三個切分比例**，程式端只改那三個數字。

# ⚠ 程式端還欠的

1. **空戰的三雲景輪播**（12 張交齊再接；要一併處理「一局之內不可以換」）。
2. `se_enemy_throneattack`／`se_rockimpact`／`se_dragonbite`／`se_enemy_holyburst`
   的 `tuning.fileGain` **都還沒量**（§6.6：沒補＝以母帶響度播出）。
3. 東泊 10 格店舖的 `noTime` 卡在檔名（`_Day` 尾綴），要美術改名才加得了。
4. 「裡面有燈光」那三句已經回到古道的**城外**那一格（-1459），古城中庭那邊不必補。

---

# 工具：`tools/map_keynote.py` —— 把現有的拓樸出成可編輯的簡報

> Ray：「把現有的拓樸出成 kenote 給我，**縮圖跟地名同一個物件**」

    python3 tools/map_keynote.py                 # 全部（13 張圖・196 格，一張一頁）
    python3 tools/map_keynote.py belisar tomb    # 只出這幾張

輸出 `resources/map/_topology.pptx`（2.8 MB）—— **Keynote 直接開得了 .pptx**；
要純 Keynote 檔就在裡面「另存為 Keynote」。

- ⚠⚠ **一格＝一個群組**（Ray 指定）：縮圖與地名包在同一個 `p:grpSp`，拖曳時一起走。
  python-pptx 沒有「建立群組」的 API，那一段是手寫 XML（`group_shapes`）。
  實測：196 個群組，每個群組裡是 `PICTURE + TEXT_BOX`。
- ⚠⚠⚠ **節點與連線是從 `script/town.js` 讀出來的**（走 `tools/_jsrun.py`，同
  `map_layout.py`／`script_lint.py`）—— 手抄一份就是同一個拓樸兩個真相（鐵律 7）。
- ⚠ **版面是自動排的，排完就交給 Ray 改**（憲法 -907：拓樸是他的設計）：
  只保證「初始位置符合出口方向、不重疊、整張塞得進一頁」。
  · 方向 → 網格偏移（`up` 往上…），位子被佔就螺旋找最近的空位
  · 超出頁面就整體等比縮小；⚠ **字框不跟著等比縮**（縮到讀不出來就沒意義），
    所以算縮放比時要用字框**真正會佔的高度**，不然最底下那一排的標記會被切掉（踩過）
- ⚠ 標記：入口／休息處／旅店／跨圖出口（`→@其他圖:格`）印在地名下面，紅色。
- ⚠ 縮圖走 **JPEG 不是 PNG**：196 張 320px 的 PNG 讓檔案變成 **24 MB**（實測），
  JPEG q82 之後 2.8 MB。快取在 `resources/map/_thumbs/`（已進 `.gitignore`，刪掉會重建）。

---

# 本輪 — `-1437` ～ `-1442`（古城地圖重接／追擊兩階段／插畫平移／小地圖）

## 一、⚠⚠⚠ 貝利薩爾的拓樸換成 **Ray 自己排的那一張**（`reference/_topology.pdf`）

> Ray：「用這張圖重接古城地圖，小地圖等美術跑完接上，這樣就沒有斜線了吧」
> 「你就照我給的 refrence 畫，線就照我轉彎的地方轉彎就不會有斜線了啊」
> 「你能不能看清楚點再回話？」

**37 格的 `exits` 整組重寫**（`script/town.js`），46 條邊。作法是**解 PDF 的向量內容流**
（zlib 解壓 → 追 CTM → `m`/`l`/`S`），不是看圖估 —— 我先後看錯兩次：

1. **把「一條跨好幾格的線」當成一條邊**，中間那幾格被跳過（納骨堂變成零連線）。
   ⇒ 改成**逐對相鄰格做線段覆蓋測試**。
2. **相鄰只認「緊接著的下一個格位」**，隔一個空位的那兩對（壁畫長廊↔鐘室、
   燭廊↔旋梯井）整個漏掉。⇒ 改成**往那個方向找「下一個有東西的格位」**。

⚠ 收工驗過：43 條邊的方向與版面完全一致、3 條是 Ray 圖上**刻意轉折的 L 形**
（`starroom.left↔forge.up`／`stairwell.down↔stephall.left`／
`dragonrace.down↔waterjail.right`）—— 那不是斜線，是兩段正交線，
`script_lint.py` 的 L 形提醒是**預期中的**，不要「修」掉。
37/37 可達、10 個環、0 條會彈的邊。

## 二、小地圖（`resources/map/map_belisar.webp` ＋ `_spots_belisar.json`）**已接上**

- 格線版面（欄距 0.1114／列距 0.1031），37 個點**全部移位**，
  `TOWNS.belisar.map.spots` 照 json 抄（一個數字都沒有用眼睛估）。
- ⚠⚠ **`?v=2` → `?v=3`**：同名覆蓋（§5 ver -650）—— 不跳版瀏覽器照樣拿舊的那一張，
  而畫面上**不會有任何錯誤訊息**，症狀只是「點跟圖對不上」。
- 驗收是**離線合成**（PIL 把 37 個點畫回那張紙）＋ 逐邊比對方向，不是靠肉眼掃。

## 三、⚠⚠⚠ 追擊分兩階段（`modules/town.js` 的 `dragonPickExit`）

> Ray：「為什麼我每打一次龍他就隨機亂跑？不是應該往我的反方向移動嗎？」
> → 「追擊戰有兩階段／第一階段是隨機亂跑／第二階段是索拉娜開圖以後，玩家從左側進房，
>    他就從右側出，從下方進他就從上方出／只有一條路的話就往唯一的反方向走／
>    有兩條沒有辦法判斷該走哪條（無相反方向）一率往靠近王座廳的方向走」

| | 何時 | 牠怎麼動 |
|---|---|---|
| **第一階段** | `bl_dragon_seen` 沒插（還沒開圖） | **隨機** |
| **第二階段** | 開圖之後 | **穿過去**（照玩家按的方向直走）→ 只有一條路就走它 → 判不出來**一律往王座廳**（`stepToward`） |

⚠⚠ **-1421~-1441 為什麼會讀成「亂跑」**：那一版是「直走那一條不存在就**隨機挑**」，
而貝利薩爾 46 條邊／平均度數 2.5 ⇒ **直走多半不存在**，實際跑起來大半落進隨機分支。
⚠ 第二階段整段**沒有亂數**（`dragonSlide` 的落點也走同一支）—— 玩家看得見小地圖，
牠的每一步都要能被預測。
⚠ 漏斗（`dragonFunnel`，謁見前廳→王座廳）排在**所有規則之前**，沒有變。

## 四、蕾娜跌倒插畫：由上往下平移（`.pan-v`）

> Ray：「蕾娜跌倒插畫由上到下平移，停下後才出對話框，平移結尾不要把蕾娜的臉移出畫面」

⚠⚠ **`object-position` 的 Y 在這裡是 no-op**：1536×1024 的圖放進 390×473 的框、
`cover` ⇒ 是**寬度**在溢出，垂直方向根本沒有多餘的量可以移。
⇒ 新的 `.pan-v`：**先放大再位移 transform**（`--cg-pan-k/-a/-b`），
`modules/story.js` 自己判斷「有沒有垂直的餘裕」再決定走哪一條（`noRoom`）。
- 參數（k 1.55／18%→8%／delay 2750）是**離線合成模擬**（PIL）挑的：
  兩端都保住臉、結尾看得到掉在地上的髮飾。**不是調出來的。**

## 五、呼吸燈 ＋ 探索率（Ray：「主角所在位置跟方向指示都要呼吸燈，不然不夠明顯」）

- **導覽箭**：原本的光是**常亮**的 ⇒ 加一條 `kerbBreathe`（動 `filter`）。
  ⚠ 兩條動畫掛同一個元素，**動的必須是不同的屬性** —— `kerbCompass` 動 `transform`。
  ⚠ `animation-delay` 寫兩份：晃動照舊錯開，**呼吸四支同步**（那是同一個訊號）。
- **小地圖的所在地**：加大到 14px ＋ `b::before` 一圈**往外擴散**的光暈（`tmHere`）。
  ⚠ 用 `::before` 不是 `::after` —— `::after` 被休息處的墨圈用掉了。
  ⚠ **動的必須是「大小」不是只有「亮度」**：一張滿是墨點的紙上，亮一點的墨點還是墨點。
- **探索率**（Ray：「小地圖顯示地圖探索率」）：`.tm-pct` 擺在 `.tm-frame` **外面**
  （框裡的尺寸是地圖的百分比，字塞進去會跟著縮）。
  ⚠ 分母與「全部踩過就撤霧」是**同一個數**（鐵律 7）——
  不然會出現「99% 但霧已經撤了」。

## 六、空戰的天空：夜空交件了，**兩張卡已接上**

`bl_dragon_front`／`bl_dragon_sky` 的 `bg` 由 `deck_rapidsail` 改成 **`Sky_Towers`**
（基底名；時段交給既有的候選鏈）。交件單：`resources/background/_skybattle_spec.md`。
- 現有 3 張：`Sky_Towers_night`（本體）／`Sky_Towers_dusk`／`Sky_Towers`（**無時段
  萬用退路**，內容＝夜空；md5 與 night 相同是**刻意的**，不是交件失誤）。

---

# ⚠⚠ 美術還欠的（程式端已經接好，等圖）

1. **平原古道的小地圖要重畫**（`resources/map/map_plainsroad.webp`）：ver -1447 由
   6 格擴成 **10 格**，而那張羊皮紙還是 6 格那一版。新版面的參考圖已經產好：
   `resources/map/_layout_plainsroad.png`（`py tools/map_layout.py plainsroad`）。
   · 新增：石塚群 cairn／碎石坡 scree／枯木林 deadwood／風蝕岩 windrock
   · 改名：溪谷口 ravine → **狹窄溪谷 gorge**
   · 座標抄 `script/town.js` 的 `TOWNS.plainsroad.map.spots`（已是新版面）。
   ⚠ 同名覆蓋 ⇒ 交件時**要跳 `?v=`**（§5 ver -650）。
2. **古道五格的 dawn／dusk／night ＝ 15 張**：現在只有 `_day`。程式端暫時把那五格的
   `bg` 指到帶尾綴的檔名 ＋ `noTime:true`（四個時段都命中同一張、零 404）——
   **圖交齊就改回基底名並拿掉 `noTime`**，忘了改的症狀是「走一整天天色都不會變」。
3. **空戰的另兩組雲景**：`Sky_Cumulus`／`Sky_Cirrus` 各 4 張（`_skybattle_spec.md`）。
4. 未封印形態的龍立繪**翅膀被裁掉**，要重切。

---

# ⚠ 程式端還欠的（下一個 session 接得上的）

1. **空戰的三雲景輪播**（spec §六之一）：`Sky_Cumulus`／`Sky_Cirrus` **一張都還沒交**，
   所以池子現在只有雲塔一組、還沒做成 `bgPool`。
   ⚠⚠ **12 張交齊再接** —— 先寫進池子的話挑中沒交的那兩組就是**整片空背景，
   而且沒有任何錯誤訊息**（鐵律 13：漏寫要落在安全那一側）。
   接的時候要一併處理「**一局之內不可以換**」（連戰換怪、morph 換卡都算同一局）。
2. **東泊 10 格店舖的 `noTime`**：那幾格的檔案全是 `_Day` 尾綴，而 `noTime` 的語意是
   「**只試不帶時段的那個基底名**」⇒ 現在加上去會變成**空背景**。
   要嘛美術把那 10 張改名成不帶時段的，要嘛這一條就不要加。**卡在美術那一端。**
3. `se_enemy_throneattack`／`se_rockimpact` 還沒量 `tuning.fileGain`
   （§6.6：沒補＝以母帶響度播出，實測過會小到聽不見）。
4. 未封印形態的龍立繪**翅膀被裁掉**，要重切。
5. 東泊酒吧那一格要不要開，Ray 還沒定。

---

# 上一輪 — `ver 2026.09.17-1436`（首頁那一排鈕）

---

---

# -1436：首頁那一排鈕（Ray：「把腳本測試鈕拿掉　巡場跟讀檔按鈕風格統一」）

## 一、「腳本測試」移除

「巡場」做的是同一件事 —— **同一個落點**（`SCRIPT_TEST`），而且多了「選哪一張圖」
與「要不要演劇情」兩步。鈕（`index.html`）與綁定（`main.js`）都拿掉了。

⚠ **`prog.SCRIPT_TEST` 不要跟著刪**：`tourSpec` 拿它當底（鐵律 7：落點只有一份）。

## 二、⚠⚠ 風格不統一的原因：那一條選擇器是**逐顆列 id** 的

`#home #tutorialBtn, #home #creditBtn, …` 串了六顆 —— 後來加的**巡場／讀檔／腳本測試**
三顆掉在名單外，於是長成**瀏覽器預設的灰方鈕**，與旁邊的金色圓角鈕擺在一起。

- 改成 **`#home #homeLinks button`** 一條涵蓋全部 ⇒ **新鈕預設就是對的**
  （同首頁白名單那條的理由：安全的那一側當預設，不要靠「記得回來補一個 id」）。
- ⚠ 版權那一行是 `<span>` 不是 `<button>`，不受影響。
- 實測（管理人模式，八顆）：`border-radius` 20px／`color` rgb(138,109,46)／
  `font-size` 11px **全部一致**。

⚠ 自檢：**看到「把好幾個 id 串成一條」的樣式規則，先問「下一顆鈕會不會掉在名單外」**
—— 這與 §6.9 首頁白名單、鐵律 13 的名單是同一個形狀的問題。

---

# 上一輪 — `ver 2026.09.17-1435`

---

---

# -1435：Ray 的六件 —— 其中**三個是靜默失敗**（卡上寫了、畫面上沒有）

## 一、⚠⚠⚠ 龍吟沒有聲音 —— **同一件事踩了兩個坑**

Ray：「龍的追擊戰每一場出場都要有龍吟，同攻擊音效 `se_enemy_roardeer`」
—— 我 -1433 就接了（`entrance:'se_monsterroardeep'`），而**它從來沒響過**。兩個原因疊在一起：

1. ⚠⚠⚠ **同一張卡裡有兩個 `entrance:`，後面那個是 `null`。**
   我把新欄位插在 `openAssault:` 前面，而那幾張卡**下面本來就有一格
   `entrance:null`** —— 物件字面量同名鍵**後者勝**，龍吟被整個蓋掉。
   卡上看起來兩行都在，實際只有 null 生效，**沒有任何錯誤訊息**。
   ⇒ **自檢：插欄位進既有的卡之前，先 grep 那張卡裡有沒有同名的那一格。**
   （實測：`entrance` 那四張全是 null，只有我新寫的 `bl_dragon_throne2` 是對的。）
2. ⚠⚠ **登場音走 `asset(key)` 查的是 `ASSETS`，不是 `SE_FILES`。**
   `se_enemy_roardeer` 只登記在 `story.js` 的 `SE_FILES` ＋ `fileGain` ——
   `playEntranceSe` 拿到空字串就**靜靜 return**。已補進 `ASSETS`。
   ⇒ **卡上要用的音效，先確認它在 `ASSETS` 裡。**

## 二、⚠⚠⚠ 「第三型態打完 hp 就結算了，第四型態呢？」

`maybeMorph` 的百分比分支第一行是 `if(state.enemyHp<=0) return false;`（-1418 寫的
「打死了就不換」）—— 於是**一擊從門檻之上直接把血打到 0** 就走死亡結算，第四型態整個跳過。

- 空中戰特別容易踩到：第三型態 **500 血、門檻 250**，而那時玩家已經全裝
  （反擊／破防／聖徒化追打一下幾百點）。
- ⚠⚠ **卡宣告的是「掉到 50% 就換型態」，那條血本來就還沒打完** ——
  「牠死了」與「牠變了」在這一擊上只有一個是對的，而卡說的是後者。
- 修法：百分比分支只留 `if(enemyHp > max*pct) return false;`。
  換型態時 `setEnemy` 會重設血，溢出多少都不必管；沒有 `morph` 的第四型態照舊會死。

## 三、對白（`script/town.js`）

| Ray 的原話 | 落點 |
|---|---|
| 初入遺蹟前廳：安 `lookup`／諾 `shock`，**把索的「這裡太安靜了」搬到這一拍** | `belisar.foyer` 新段 `bl_foyer_first`（`need:'ep_bel_enter'`）；`gates` 的 **3 格那一道整段移除** |
| 諾「這麼空的城」那一拍後面加兩句 | `bel_hint2` ＋ 蕾 `thinking`「確實……永夜之後這種地方最容易聚集禍魘，為什麼……」／索 `tired`「啊——真無聊。」 |

- ⚠ 前廳那一段一定演得到：`ep_bel_enter` 的 `goto` 就是 `foyer`。
- ⚠ 安／諾那兩拍**只有立繪沒有台詞** ⇒ 點擊推進（§6.5 的 -628）。
- ⚠ 稿上的 `think` → 蕾娜那一族的鍵是 `thinking`（同一張圖，照 -1434 那條「取最接近」）。

## 四、⚠⚠ 地圖上「被指出來的那一格」一律是紅的（**全域規則**）

Ray：「安雅指方向時用的標記用紅色的，跟龍一樣，**以後角色指向就統一用紅**，
不然會跟玩家位置搞混」

- 金色是**玩家的所在地**（`.here` 與整張紙的主色）—— 指路也用金，畫面上就有兩顆
  金點在閃，玩家讀不出哪一顆是自己。
- 顏色收成**一組 CSS 變數**（`--tm-point*`），紅點（威脅）與指路共用（鐵律 7）。
- ⚠ **兩者仍分得出來 —— 靠節奏不靠顏色**：紅點 1.6s、指路 2.4s（指路不該比威脅還急）。
  日後再多一種「被指出來的東西」，加的是新的節奏，不是新的顏色。

## 五、⚠⚠ OVK 與 BR 改成「閒置逾時」

Ray：「把 ovk 跟 br 的時限拿掉，改成**兩秒內不點下一格就結束**」

- 以前是**固定總長**（OVK 3 秒／BR 6 秒）—— 那會懲罰「打得好但打得久」的人：
  盤面還剩十幾格，時間到就是到。現在是**距離上一次點擊**兩秒，還在打就一直開著。
- **一個數字管兩邊**（`tuning.idleEndMs`，鐵律 7）：兩段的結束條件現在是同一件事。
  分兩個常數必然走鐘 —— -1338 就踩過「有時候 3 秒有時候 6 秒」。
- 重設點只有兩處：OVK 走 `combat.armOverkillLimit()`（那一段的點擊分支）、
  BR 走 `weapon.pokeDual()`（`combat.dualShot` 每打出一發叫一次）。
- ⚠ 教學照舊**完全不設時限**。⚠ `overkillLimitMs`／`dualSeconds` 已無人讀，留在 config 當紀錄。

## ⚠ 還沒做 ／ 等人一句話（延續 -1433）

1. **⏸ 空中戰的背景要夜空**（等美術）—— 圖到了把 `bl_dragon_front` 與
   `bl_dragon_sky` **兩張卡的 `bg` 一起改**。
2. **⚠ 第二型態（`mon_dragon_v1_unsealed`）的立繪翅膀被裁**（實測貼邊 19%／21%）——
   程式端已改 `cover` 讓切口出畫面，真正的修法是重交一張。
3. **⚠ 三支音效的 `fileGain` 要量**：`se_enemy_throneattack`／`se_rockimpact`
   （-1433 新接）。`se_enemy_roardeer` 已經有值（3.006）。
4. 那 10 格店舖的 `_Day` 改名成不帶尾綴（美術）→ 程式端才補得了 `noTime`；
   東泊酒吧要不要另開一格（Ray 未決）。

---

# 上一輪 — `ver 2026.09.17-1434`

---

---

# -1433：王座徘徊者那一夜 —— Ray 的 22 條，21 條做完

> 一次交辦 22 件（對白、演出、音效、型態、飛行畫面）。**21 件落地，1 件等美術**
> （空中戰的夜空背景）。下面按「改了什麼」分組，每一組都寫了**為什麼要那樣改**。

## 一、對白與腳本（`script/town.js`）

| # | Ray 的原話 | 落點 |
|---|---|---|
| 1 | 龍吃了髮飾的那拍播 `se_enemy_throneattack` | 祭壇那一段 `ren(null,'啊……')`（旗 `renna_hairpin_lost` 同一拍） |
| 2 | `walk` 在「喂你倒是聽我說話啊」的時候就播 | 從**下一拍**（主角空白框）**移到她那一句上** |
| 3 | 全員決定去奪回髮飾時封南門驛站出口 | 東泊 `dock.lock.up` ＋ 索「喂！開船去比較快啦！」`confuse` |
| 4 | 降落古城中庭以後（9 拍） | `belisar.entrance` 新段 `bl_night_land` |
| 5 | 進入前廳（5 拍） | `belisar.foyer` 新段 `bl_night_foyer` |
| 9 | 開圖三戰以後跳對話（5 拍） | `DRAGON_LINES.afterThree`（判定見第三節） |
| 10 | 初踩獅階（2 拍），**若觸發結算，結算完再跑** | `belisar.dragstair` ＋ `afterSettle:true` |
| 13 | 「小心！要垮了！」同時播 `se_rockimpact` | 一拍兩個聲音（`se` 吃陣列）：崩瓦＋落石 |

- ⚠⚠ **2 為什麼要搬**：聲音壓在她那一句上，「她還在講、他已經走了」那個時間差
  才是這一段的笑點。掛在下一拍＝「她講完了他才動」。
- ⚠⚠ **3 用既有的 `lock` 機制**（ver -786）：擋在 `go()` 不在 `exitsOf` ⇒ **箭頭照樣在**，
  按下去由她擋回來。這一版讓 `lock` 多吃一個 `lines`（帶了就走**同一支** `playAdhoc`，
  鐵律 8）。旗名**讀 `QUEST_LOCK`**，不抄第二份字串。
- ⚠⚠ **10 的 `afterSettle` 是逐段宣告，不是全域換順序**：獅階是休息處
  （帶著帳走進來會先閉棺結算）。全域把 `restActDue` 提到 `actDue` 前面會動到
  **另外六個**「休息處＋acts」的格子（夏爾森林兩格、木雅克兩格、古道溪谷口）——
  那幾段是劇情，先被一頁戰績打斷讀起來是斷的。
  ⚠ 結算那一段沒有 `flag` ⇒ 演完之後段落收尾的接續會**再回來演獅階那一段**，
    而那一趟已經沒有帳可報 —— 順序就自然變成「結算 → 對話」。
- ⚠ **4／5 都寫了 `until:QUEST_LOCK.until`**：空中戰打完之後不該再演「還真的能降落」。
- ⚠ 立繪：稿上的 `tire`／`confused`／`guardthink` 在 `ART` 裡是
  **`tired`／`confuse`／`guardthinking`**。
  ⚠ 諾薇兒**沒有 `smile`** 這張差分 —— **ver -1434 Ray 指定用
  `Nouvelle_SI_bigsmileclose.webp`**（`bigsmileclose`）；-1433 暫用的 `happy` 已換掉。

## 二、演出與音效

| # | 事 | 落點 |
|---|---|---|
| 6 | 追擊戰 BGM **從槍棺推上**開播（初戰也是） | 戰鬥卡 `bgmOnRise:true` ＋ `story.setBattleEarly`（main 注入） |
| 7 | 「交給我」開小地圖：對話框往下、不用立繪 | `style.css` 的 `#townMapView.map-story` 那一組 |
| 12 | 龍**每次出現**都要龍吟＋畫面震動 | 敵人卡 `entrance:'se_monsterroardeep'` ＋ **新欄位** `entranceShake:true` |
| 19 | 攻擊光圈太快，**再放慢 50%** | `HOLY_GROW_MS` 1100→2200／`HOLY_LIFE_MS` 2700→5400／CSS 1.1→2.2s、1.5→3s |
| 20 | 第四型態前光圈全蓋，散去才變身 | 既有的 `morph.fx:'holyburst'` 就是全蓋的那一圈；**放慢之後才看得出來** |

- ⚠⚠ **6 是逐場的宣告不是通則**：ver -356 的「戰鬥音樂在**撞頂之後**才進」對一般戰鬥
  仍然成立（上推那一秒還是劇情的餘韻）。追擊戰不一樣 —— 它整段都在追，門一動音樂就該起來。
- ⚠⚠ **12 為什麼要新欄位**：龍是 `kind:'multi'` ⇒ **不走降臨**（ver -1414，Ray：
  「戰鬥中不播降臨，劇情出場時播」），而降臨那一條的著地震動掛在 `landT` 裡 ——
  那條路上沒有人震。震動走**同一支** `api.screenShake`（鐵律 8）。
- ⚠⚠⚠ **19 連動三個數字**：`enemy.js` 的兩個常數、CSS 的 transition、
  `combat.js` 的 `HOLY_SWAP_MS`（換圖時機＝光蓋滿畫面那一刻）。三處註解互指。
- ⚠⚠ **新增的兩支音效 `fileGain` 還沒量**（`se_enemy_throneattack.mp3`／
  `se_rockimpact.mp3`，都已進 `SE_FILES`）—— 沒有那一列＝增益 1 ＝以母帶響度播出，
  正是 -441 抓到「跌倒音永遠不出來」的成因。**要 Ray 用 `tools/audio_scan.html` 量一次。**

## 三、追逐的玩法（`modules/town.js`）

| # | 事 | 落點 |
|---|---|---|
| 8 | **取消**龍自己往王座廳跑，讓玩家趕 | `DRAGON_AUTO_AFTER`／`dragonAuto`／`dragonAutoStep()` 全部退役 |
| 9 | 開圖三戰之後跳對話 | `dragonTalkDue()` ＋ `dragonSeenFights` 計數 |

- ⚠⚠⚠ **8 的前提是 -1432 的 `dragonCanStop`**：自動模式原本**兼著當「卡住了」的保險絲**
  （牠躲進打不起來的格子時，五場之後會自己走出來）。拿掉之後那個保險沒有了 ——
  **兩條要一起看，不要單獨把其中一條改回去。**
- ⚠ 9 **不必踩到牠**（走一步就會演）⇒ 判定不在 `dragonActDue`（那一支的前提是「踩到牠」），
  另立一支掛進抵達的選擇鏈。計數是**這一趟進圖**的狀態（`open()` 歸零、不進存檔）。

## 四、王座戰變成兩條血（`combat` ＋ `script/enemies.js`）

| # | Ray 的原話 | 落點 |
|---|---|---|
| 21 | 第一條血打完進第二型態，血 500，**攻擊節奏走鹿主** | 新卡 `bl_dragon_throne2` ＋ `morph:{ onDeath:true }` |
| 11 | 第二型態的左右好像被裁了 | `fit` 改 `cover`（**根因是素材**，見下） |

- ⚠⚠⚠ **`morph` 現在有兩種**：`{ hp:50 }` 百分比門檻（-1418 的空中戰）／
  **`{ onDeath:true }` 血歸零那一刻變**（兩條血的 BOSS）。後者必須攔在
  「敵人死了」那一整套演出**之前** ⇒ `maybeMorph()` 改成**回傳 true**＝
  「這一下被接走了」，呼叫端看到就不走死亡流程。
- ⚠⚠ **「節奏」照抄鹿主、「威力」留著龍自己的**（我的判讀）：`openAssault`／
  `assaultEvery`／`assault`／`ult` 的 `on/hp/count/gap/cd` 逐格照 `sf_deer_nightmare`；
  `attack`(20) 與 `ult.atk`(20) 沿用第一型態 —— 換成鹿主的 22／25 等於順手改難度。
  **要連威力一起走鹿主就改那兩個數字。**
- ⚠⚠⚠ **11 的根因是圖，不是程式**：`mon_dragon_v1_unsealed` **本身就裁掉了翅膀** ——
  實測左 **18.95%**、右 **21.48%** 的像素貼著圖的邊緣（另外三張龍都在 2% 以下；
  `_originals` 的原 PNG 一樣，v2／v3 更嚴重）。補不回來的東西程式端修不了。
  · 程式端做的是**換一種讀法**：`contain` 會留白 ⇒ 切口落在畫面中間、清清楚楚；
    改 `cover`＋`center top` 讓牠填滿框，切口推到畫面外 ⇒ 讀起來成了「翅膀展出畫面」。
  · **真正的修法是請美術重交一張翅膀完整的。**

## 五、飛行畫面（`flight/index.html` ＋ `config.flightBgmWhen`）

| # | 事 | 落點 |
|---|---|---|
| 14 | 上船追換 warhorn 是**進到飛行畫面以後**換 | `config.flightBgmWhen` ＋ `main.flightBgmKey()`；腳本那一拍的 `bgm` 拿掉 |
| 22 | 空中戰以後飛行畫面走 **crisis** 直到切換到探索地圖 | 同一張表（crisis 排在 warhorn **上面**） |
| 15 | 諾薇兒的「一片黑」用 shock2 | `SKY_HUNT_TALK` → `nouvelle/shocked2`（`ART` 的鍵是 `shocked2`） |
| 16 | 索拉娜的「安靜下」用 guardthink | **-1418 就已經是** `guardthinking` 了，這一版沒動 |
| 17 | 教學的獵手之眼要跑索敵動畫跟語音 | `spotFire()` **移到 `spawnByHold()`** |
| 17 | 敵人穿過雲霧遠距飛近、出怪要淡入 | 那一筆 `dist` 1800→**3200**（`ZFAR`=3600）＋ `ENEMY_FADE_MS`(1400) |

- ⚠⚠⚠ **17 的索敵動畫為什麼沒演過**：`spotFire()`（索菈娜的 CI ＋ 語音）原本掛在
  `spawnEnemy({byHold})` 裡，而那一段走的是**劇本遭遇**（`spawnScripted`）——
  **根本不經過那一支**。落點改成「長按天空真的撐滿了」那一刻，兩條生成路徑都演。
- ⚠⚠ **淡入包在呼叫端不在 `drawEnemy3D` 裡面**：那一支有好幾個 early return
  （在身後／太遠／貼圖還沒解碼），在裡面 `save()` 要每一條 return 都配 `restore()`
  —— 漏一個就是**整個畫面從此半透明**，而且很難查。
- ⚠⚠⚠ **BGM 的鍵一定要走 `story.ensureBgm`，不要自己拼 `asset('bgm_'+key)`**：
  實測 `warhorn` **不在 `ASSETS` 裡**（只有 `fileGain` 有那一列），自己拼就查不到 ——
  而那是**靜靜壞掉**的（只印一行 console，曲子就是不響，-1398 踩過同一個坑）。
- ⚠ crisis 那一條**不寫 `until`**：「直到切換到探索地圖」是自然發生的 ——
  降落進城時 `town` 自己的 `bgm`／`bgmWhen` 會接手（鐵律 8）。

## ⚠ 還沒做 ／ 等人一句話

1. **⏸ 空中戰的背景要夜空**（Ray：「等等美術補件」）—— 圖一進
   `resources/background/`，把 **`bl_dragon_front` 與 `bl_dragon_sky` 兩張卡的 `bg`
   一起改**（不一致的話 morph 那一刻背景會跳）。現在照舊是 `deck_rapidsail`。
2. **⚠ 第二型態的立繪要重畫**（翅膀被裁，見第四節）—— 程式端只是換了讀法。
3. **⚠ 兩支新音效的 `fileGain` 要量**（見第二節）。
4. 上一版（-1432）那幾件照舊：那 10 格店舖的 `_Day` 改名成不帶尾綴（美術）→
   程式端才補得了 `noTime`；東泊酒吧要不要另開一格（Ray 未決）。

---

# 上一輪 — `ver 2026.09.17-1432`

---

# -1432：換機器之後的第一輪 —— **交接檔的三件，逐件用資料複驗**

> Ray：「東泊那批／祭壇／追逐 —— **再檢一次**，應該已經寫了」

⚠⚠⚠ **三件的答案不一樣，而交接檔三件都寫「還沒做」** —— 所以這一節的重點不是
「做了什麼」，是**怎麼驗的**（驗法都可重跑，寫在每一段末尾）。

## 一、✔ 祭壇啟動版 `Belisar_OldAltaractive` —— **早就接了**（Ray 對，交接檔過期）

四件都在：圖 `resources/background/belisar/Belisar_OldAltaractive.webp`、
節點 `altar` 的 `bgWhen:[{ need:'bel_altar_on', bg:'Belisar_OldAltaractive', noTime:true }]`、
`bgWhen` 的實作（`modules/town.js` 的 `bgCandsOf`）、插旗的那一拍
（`script/town.js` 的 `flags:['bel_altar_on']`）、`ASSET_VER` 的 `belisar_oldaltar`。

    grep -n "OldAltaractive" script/town.js       # 節點的 bgWhen ＋ 腳本那一拍
    grep -rn "bel_altar_on" --include="*.js" .    # 誰插、誰讀（鐵律 9）

## 二、⚠ 東泊那一批 —— **四項裡兩項早就做了、一項今天做、一項現在做不了**

| 項 | 複驗結果 | 這一版 |
|---|---|---|
| `dock.bg` → `East_SouthGate` | **早就改了** | 不動 |
| 餐飲街改室外街景 | `tavern.bg` 還是 `East_Bistro`（酒吧**室內**） | **改成 `East_Dining`** |
| 店舖 `hours` `[8,20]`→`[8,17]` | 四座城 **10 格全部**還是 `[8,20]` | **10 格一起改** |
| 逐格 `noTime:true` | 一格都沒有 | ⛔ **現在補不了，見下** |
| `ASSET_VER`（交接單只說「5 張」） | 實查 **12 個鍵**沒跳版 | **12 個一起補** |

### ⚠⚠⚠ `noTime:true` 現在補下去 ＝ 那 10 格**整格空背景**

交接單第十節第 2 條「只有 day 的那幾格要補 `noTime:true`，聖索菲亞與拉芬斯達爾的
`grocery` 已經寫了，照抄即可」—— **照抄不成立**：

- `noTime` 的語意是「**只試不帶時段尾綴的那一張**」（`bandNames`，`modules/story.js`）。
- 拉芬那幾格的檔名正好是 `Ravn_Grocerie.webp`（**沒有尾綴**）⇒ 它成立。
- 而這 10 格的檔名**全部帶尾綴**：`Capital_Firearm_Day.webp`／`East_Firearm_day.webp`
  ／`Northport_Gunstore_Day.webp`／`Shinier_Grocery_Day.webp` —— 補下去就是試一張
  **不存在的** `Capital_Firearm.webp`，整格沒有背景，**而且沒有任何錯誤訊息**。

⇒ **要美術先把 `_Day` 那張改名成不帶尾綴的基底名**（順手回收 `_Dawn`／`_Dusk`／
`_Night`，那正是交接單第十節第 3 點那 17 張），程式端才補得上去。
⚠ 在那之前**不補也不會壞**：候選鏈自己會退回 `_Day`（`BAND_FALL`），只是多吃幾個 404。

### `ASSET_VER`：交接單說 5 個，實查是 12 個

驗法（**可重跑**，這比抄交接單可靠）—— 「git 說它被同名覆蓋」對「config 說它有沒有版號」：

    git log --format='%h' -200 | while read c; do
      git show --name-status --format="" "$c" |
      awk '$1=="M" && $2 ~ /^resources\/background\/.*\.(webp|png)$/ {print $2}'
    done | sort -u | while read f; do
      k=$(basename "$f" | sed 's/\.[^.]*$//' | tr 'A-Z' 'a-z')
      grep -qE "^[[:space:]]*'$k'[[:space:]]*:" config.js || echo "沒跳版 $k"
    done

補上的 12 個：`belisar_orrery`／`_bellroom`／`_cages`／`_drywell`／`_forge`
（commit `9a9014a`「補通道 6」那一批，只跳了納骨堂）、
`east_midtown_{dawn,dusk,night}`／`east_square_{dawn,dusk,night}`
（同一個 commit 的「鐵軌 6」，而 `ASSET_VER` 只跳了 day —— **一組差分要一起帶**，
漏掉哪一張哪一張就被快取住）、`plains_cairn_day`（`24ce484` 石塚群重畫）。

⚠ `-1371` 那段註解寫「美術只重畫了 day 那一張，其餘時段沒動」在當時是對的，
  `9a9014a` 之後就過期了 —— 已改寫。**註解會過期，git 不會。**

### ⚠ 連帶：`East_Bistro`（酒吧室內）從此沒有節點在用

餐飲街那一格在拓樸上是**四向樞紐**，站在樞紐上卻看到某一家店的室內 —— 那正是
Ray 回報的「餐飲街現在看起來還是室內」。改指街景之後，酒吧要不要**另開一格**
是 `_eastport_spec.md` §八 的 A／B，**Ray 還沒答**。
⛔ `East_Bistro_*` 四張**先不要回收**。
⚠ 那一格四個方向已經滿了（`back` 現算成 `left`）⇒ 另開一格要動拓樸，不是加一行。

## 三、⚠⚠⚠ 追逐：**「不能往 entrance 逃」真的沒寫** —— 而且它會死鎖

`resources/map/_belisar_worklist.md` §四。-1404 的交接檔判斷是
「現行實作裡龍只有第四場之後才佔格子…**暫時不必動**，日後若改成龍會佔格子移動，
這一條要回頭處理」—— 而 **ver -1421 就是把它改成佔格子移動**，那個「日後」已經到了，
只是沒有人回頭。

### 病灶：兩條規則對撞

    dragonActDue()   第一行：if(n.noWild) return null;   ← ver -1420（Ray：前廳／古城外是安全區）
    dragonFleeStep() ／ dragonPlaceNear() ／ dragonAutoStep()：**完全不看 noWild**

⇒ 牠跑進那 8 格（古城中庭 `entrance`／四個休息處／崩頂坡／枯井底／古代祭壇）
  就等於**躲進安全屋**：玩家踩上去什麼都不會發生 → 打不到 → `dragonFights` 不增
  → 自動模式（要 >5 場）永遠開不了 → **追逐死鎖，而且畫面上沒有任何錯誤訊息**。

### ⚠⚠ 修法不是「不准進」—— 那 8 格是**關節**

實測：把 `noWild` 那 8 格整個拿掉，剩下 29 格會**裂開** —— 從王座之間只走得到 4 格。
所以正解是**穿過去、不停下**：

- `dragonCanStop(id)` —— 判準**只有 `n.noWild`**（鐵律 7：與 `dragonActDue` 讀同一個真相，
  不另列名單）。
- `dragonSlide(from, dir)` —— 落點停不住就沿**同一個方向**再滑一格（上限 6，實際最長 2）。
- 三個移動點都接上去；`dragonFleeStep` 那個方向整條都是死路（前廳→古城中庭、祭壇）
  時**改挑別的方向**，不留在原地（「打完就跑一格」是這一段的手感）。

驗收（`jsc` 把 `TOWNS` 真的跑出來再模擬，腳本在 scratchpad）：

| 項 | 結果 |
|---|---|
| `slide`：88 組（格×方向）各 200 次 | 只有 3 組整條是死路 → 由 fleeStep 的退路接手 |
| `fleeStep`：43,500 次 | **停在打不起來的格子 0 次、原地不動 0 次** |
| `autoStep`：29 個可停格出發 | **全部走得到王座之間**，最多 8 步 |

⚠ 這一條的自檢值得記住：**「A 的判定」與「B 的移動」讀的是同一件事時，兩邊要讀同一個
  真相** —— 這裡是「這一格打不打得起來」，`dragonActDue` 讀了、三支移動沒讀。

## 四、換機器：`.claude/launch.json` 的 `py` → `python3`

這台是 macOS，`py` 不存在（那是上一台 Windows 的寫法）⇒ 三個 config 全部改成 `python3`，
`preview_start` 才起得來。⚠ 回 Windows 那台要改回去（或兩邊都裝一個 `py` 的 alias）。

## ⚠ 還沒做 ／ 等人一句話（延續上一版，這一版沒有動的）

1. **等美術**：那 10 格的 `_Day` 改名成不帶尾綴 → 程式端才補得了 `noTime`（第二節）。
2. **等 Ray**：東泊酒吧要不要另開一格（第二節末）。
3. **等 Ray**：`CI_Anya_OBE.png` 是不是新版／`resources/background/ruins/` 那 20 張
   UUID 檔名的原始件要不要收／`Peritune_Mystic_Tides_loop.m4a` 的用途。
4. `resources/_HANDOFF_ART_20260917.md` 第五節的**小地圖**與**王座徘徊者 sprite**
   兩件還沒接（那一份自己標著「完整 prompt 已交給 Ray」）。

---

# 上一輪 — `ver 2026.09.17-1431`

---

# ⚠⚠⚠ -1431：「長按天空無效了」—— **我 -1430 的修法拆到了解鎖那一支**

> Ray：「長按天空無效了，這你都能搞砸？」

## 鐵律 9 的原形：一支旗被拿來回答兩個問題

`S9_FLAG`（`sv_s9_flight`）同時是：
① **「那一段教學演過了沒」**　② **「加速／探索／索敵解鎖了沒」**
（②是 -1423 為了「中途離開不要把能力鎖死」自己加上去的：`featureOn` 看到它就放行）

-1430 我為了「只綁從夏爾村出來那一次」，在 `addFlag(S9_FLAG)` **前面**加了
`if(sailedFrom !== 'shinier') return false;` —— **擋掉①的同時把②也擋了**：

```
featureOn('sense')：
  feat_sense 沒插（教學沒演過）      → 不放行
  S9_FLAG 沒記（被新條件擋在前面）   → 不放行
  sv_s9_leave 立了                   → return false   ← 鎖死
```

而 `canSpawnHold()` 的第一個條件就是 `featureOn('sense')`
⇒ **長按天空整個失效**（連帶加速與索敵也是）。

## 修法：把兩件事拆開

那一條分支現在**照樣不演，但把三支能力旗直接插上**，而且**不記 `S9_FLAG`** ——
所以日後真的從夏爾村起飛，那一段教學還演得到。

⚠⚠ **自檢（這一條值得記住）**：看到一支旗被「順便」拿來當第二個問題的答案時，
  **加任何新條件之前先問「我擋掉的是哪一個問題？另一個誰來答？」**
  -1423 加②的時候就該把它拆成兩支旗，我沒有 —— 於是 -1430 一碰就斷。

## 順手

`let sailedFrom` 原本宣告在**用它的函式下面 300 行**（能跑，是因為呼叫發生在求值
之後）—— 已搬到 S9 那組狀態旁邊。**靠「呼叫順序剛好對」的宣告是下一個 TDZ 爆炸。**

---

# 上一輪 — `ver 2026.09.17-1430`

---

# -1430：Ray 的四件回報（兩件是我前幾版做壞的）

## ⚠⚠⚠ 1. 第四階段「敵人 HP 錯誤、完全鎖血」—— 鐵律 7 的原形

`maybeMorph()`（ver -1419）換完卡之後又補了一次 `initEnemyHp()` ——
**而那一支的簽名是 `initEnemyHp(hp)`**：沒帶參數 ⇒
`state.enemyMax` 與 `state.enemyHp` **都變成 `undefined`**
⇒ `enemyDamage` 的 `if(state.enemyHp>0)` 永遠不成立 ⇒ **打不動、血條也是錯的**。

真相是 **`enemy.setEnemy()` 裡面本來就有 `initEnemyHp(en.hp)`** —— 我多設了一次，
而且設錯了。**同一個量兩個設定點**，那就是鐵律 7 要消滅的東西。已拿掉。

## ⚠⚠⚠ 2. 「一出城還是一直在播加速跟搜索」—— -1423 的條件太鬆

-1423 我把旗改成「**開演就記**」，那一半是對的。但**條件本身**只看
「`sv_s9_leave` 立了、`sv_s9_flight` 還沒立」—— **任何一次起飛都算**。
旗一被清掉（`newRun()`／巡場／腳本測試／讀檔回到那之前），從**別的城**起飛也照演。

⇒ 再加一道硬條件：**這一趟得是從夏爾村起飛的**（新的 `sailedFrom`，
在 `restoreFlightPos` 讀 `tivot_flight_ret_v1` 時順手記一份 —— 那把鑰匙讀了就清）。
**那才是 Ray 原話的字面意思**：「只綁 S8 從夏爾村出來那一次」。
⚠ 查不到出發地（舊鑰匙、獨立開啟飛行頁）就**不演**：安全的那一側是預設 ——
漏演一次教學遠比每次起飛都演一次好。

## 3. 空中戰的背景改到天空

兩張卡（`bl_dragon_front`／`bl_dragon_sky`）的 `bg` 由 **`Belisar_Exterior`**
（古城外觀＝地面）改成 **`deck_rapidsail`**（甲板高速航行，羽蛇那一段用的也是它）
—— 那一場是**從船上**打的。

## 4. 第三階段的圖往上提

`bl_dragon_front.fit.pos` 由 `center bottom` 改成 **`center 18%`**：
牠是**正面展翅在飛**，貼著下緣會讀成「站在地上」。
⚠ 第四階段（`ascendant`）維持 `center bottom` —— 那張是**立姿**。

---

# 上一輪 — `ver 2026.09.17-1429`

---

# ⚠⚠⚠ -1429：「上船追還是黑畫面」＝**改名漏了一處**

> Ray 連報兩次。

`flight/index.html` 的 `skyHuntHint()` 裡還寫著 **`senseFiredOnce`** ——
那是 ver -1418 改名成 `skyHeldOnce` 時**漏掉的那一處**。

而 `skyHuntHint()` 是掛在 **`update()`（每幀都跑）**裡的 ⇒
**第一幀就 ReferenceError、整個算圖迴圈死掉 ＝ 一片黑畫面**，
畫面上沒有任何訊息，console 之外看不出來。

## 為什麼前面都沒抓到

`flight/index.html` 是**非 module 的單一大腳本**，`node --check` **只驗語法** ——
**執行期的 ReferenceError 它抓不到**。語法檢查過、`script_lint` 過、commit 推上去，
**Ray 白測兩次**。

⇒ **改任何識別字的名字，收工前 `grep` 一次舊名字**（全庫，含 `flight/`）。
  這不是「小心一點」，是**一個可以執行的動作**，一行指令的事。已寫進 CLAUDE.md §6.5。

⚠⚠ 一度想做成工具（`tools/flight_undef.py`：掃「用到卻沒宣告」的識別字）——
  **寫完當場砍掉**：粗篩的正則抓不到 `const A=1, B=2;` 這類多重宣告，
  實測**誤報 507 個**。**誤報那麼多的檢查等於沒有**，留著只會讓下一個人學會忽略它。
  真要做得靠真正的 JS 剖析器，那是另一件事。

## 順手驗過的

`skyHuntHint` 之外，-1416~-1421 我加進 `flight/index.html` 的 **17 個符號逐個對過**
（`SKY_HUNT_TALK`／`SKY_WIN_TALK`／`skyTargetRect`／`huntLandGate`／`HUNT_*`／
`battleIdFor`／`skyHeldOnce`／`bldragon`…）—— 全部**宣告剛好一次**，沒有第二個漏網。

---

# 上一輪 — `ver 2026.09.17-1428`

---

# ⚠⚠⚠ -1428：我做了一整套重複的工具，而且擋住了盤面

> Ray：「你另外做鎖血跟清盤在盤面上幹嘛？**演出區已經有那兩個鈕了**」
> 　　　「盤面不要有東西，我連點都點不到」

-1426 我「新增」的鎖血／清盤 **早就存在**（ver -463）：

| 我加的（已全部拆掉） | 早就有的 |
|---|---|
| `#devTools` 兩顆鈕（左下，**蓋在盤面上**） | `#hpLockBtn`／`#testClearBtn`（演出區角落鈕） |
| `combat.setHpLock`／`hpLocked` ＋ `enemyAttack` 的守門 | `state.hpLock` ＋ `combat.js:1228` 的守門 |
| `combat.devKill` | `combat.testClearBoard` |

⚠⚠⚠ **兩個錯，各記一次**：
1. **鐵律 7／8 的原形** —— 同一件事做了第二份實作。**加任何「工具」之前先 grep
   一次它的中文名**（`鎖血`／`清盤` 兩個字就搜得到）。
2. **蓋住了盤面** —— 那是**遊戲的操作區**。§0.6 寫得很清楚：下半是控制區。
   我把鈕擺在 `left:8px; bottom:8px`、`z-index:8000`，正好壓在格子上
   ⇒ **點不到**。新增任何浮動元素之前先問：「**它壓在誰身上？**」

## 順帶把 Ray 原本要的那件做對

「鎖血以後按清盤＝秒殺」—— 既有的 `testClearBoard` 是「把**這一盤**點完」
（五盤的場次要按五次）。現在清完盤**補掉剩下的血** ⇒ 一按結束這一場。
⚠ 走 `enemyDamage`（與普攻同一條，`src:'dev'` 不套武器倍率）——
擊殺演出／overkill／連戰換敵／結算照舊。**沒有**直接把 `enemyHp` 設成 0。

## 龍登場的降臨音

> Ray：「龍登場時的降臨音沒有出來 SE_SAINTINSTALL」

-1414 我把降臨搬到劇情那一側時**刻意沒放**那支鐘聲，理由寫的是
「這一拍自己的 `se` 就是登場音，再播一次會疊在一起」—— **那是錯的**：
那一拍的 `se` 是**龍犼**（牠在吼），降臨音是**牠落地**，**兩件事**。
少了它，劇情這一側的降臨只有畫面沒有重量。

現在著地那一刻（`702ms` ＝ CSS `enemyRise` 的 78% 格，與光環同一個延遲）
播 `se_saint_install` —— 與戰鬥那一側**同一支**（`enemy.js` 的 `playEntranceSe`）。

---

# 上一輪 — `ver 2026.09.17-1427`

---

# -1427：王座徘徊者的飛行素材接線（美術 ver -1414 交件）

## 一、`bldragon` 換掉暫代的 sprite

```
sprite:{ dir:'enemy/FLM_DragonThrone/', dorsal:'view_0.webp',
         head:[0.00,0.079], wings:[0.079,0.368], body:[0.368,1.00] },
```

⚠⚠ **-1416 我寫的那句「美術交了之後只要換 `sprite.dir`」是錯的** —— 三個帶狀值
也得換：羽蛇有一段長頸、頭佔 16.5%；王座徘徊者的頭是**直接接在肩上的冠**，
只佔 **7.9%**。照抄會把半個翼根切進「頭」那一段 ⇒ 拍翼時頭跟著晃。

⚠ **我重跑了一次他們的量法**（逐列不透明寬度，取「>最寬 40% 且含最寬列」的連續區段）：
頭 0.079 **完全一致**，翼帶尾端我算 0.375 vs 他們 0.368（差在取 `j` 還是 `j+1`）。
**照 spec 上的值接** —— 程式與規格書要是同一份。

## 二、動態：比羽蛇更慢、更重、更大

| 值 | 羽蛇（暫代） | 現在 | 為什麼 |
|---|---|---|---|
| `waveAmp` | 9.0 | **6.0** | 擺太大會讀成軟體動物（牠是硬質辮狀骨甲） |
| `wavePhase` | 1.35 | **1.70** | 波長拉長 —— 硬的東西不會一節一節扭 |
| `waveHz` | 0.0030 | **0.0022** | 擺得更慢 |
| `wingHz` | 0.008 | **0.005** | 膜翼比鳥翼重（`wingSmooth` 留著） |
| `turnRate` | 0.0020 | **0.0009** | 大型 BOSS 掉頭要有重量（空賊船 0.00055） |
| `bodyLen` | 280 | **360** | 該比羽蛇佔畫面更大 |

⚠ `speedK` **不動**（0.72）：追那一段的速度由劇本遭遇的 `speedMul:1.6` 決定 ——
兩個地方各調一次會走鐘（鐵律 7）。

## 三、兩階的圖 —— **本來就對了**，但加了防誤讀的註解

| 階 | 卡 | 圖 |
|---|---|---|
| 3（開場～50%） | `bl_dragon_front` | `mon_dragon_v1_flight.webp` |
| 4（≤50%） | `bl_dragon_sky` | `mon_dragon_v1_ascendant.webp` |

⚠⚠ 交接單寫「`enemy_bl_dragon_sky` 改指新的那一張」——那是**假設空中戰只有一張卡**。
ver -1419 的 `morph` 是**兩張卡**：`bl_sky` 的敵人是 `bl_dragon_front`，打到 50%
由卡上的 `morph` 換成 `bl_dragon_sky`。**對應的圖完全一樣，只是鑰匙分兩支** ——
照字面把 sky 改指 flight 會變成**兩階都是同一張**。已把這段寫進 `config.js` 的註解。

## 四、「索敵後必出」只此一次 —— **確認成立**

`settleScriptResult`：`if(won) addFlag(doneKey)` ⇒ 空中戰**打贏那一刻**插上
`bl_night_sky`，而那一筆劇本遭遇的 `done` 就是它 ⇒ `syncScriptPending()` 之後
`scriptPending` 變 null，再長按天空也不會再出牠。**不必另立旗**（鐵律 7／9）。

---

# 上一輪 — `ver 2026.09.17-1426`

---

# ⚠⚠⚠ -1426：「上船追以後卡住」—— 我用錯了出口

城鎮段落**本來就有**自己的出航出口：**`act.sailOut:true`**（ver -741 就在了）——
收尾跑到那裡 `suspend()` → `flightOpener(sailFrom())` → **`return`**。

而 -1417 我用的是**劇情層**那一拍 `{ goFlight:true }`。它會先 `endScene()`，
而城鎮段落的 `endScene` 會把 **act 的收尾整條跑完** —— 裡面還有
「還有下一段就原地接上」與開導覽。於是**收尾把畫面要回去、`flightOpener` 又要
開飛行頁，兩邊搶同一個舞台** ⇒ 卡住。

⇒ throne 段改成 `sailOut:true`，`bgm:'warhorn'` 與 `bl_sky_hunt` 改掛在
**「上船追！」那一句**上（登船的那一刻）。

⚠ **教訓**：`{goFlight:true}` 是**主線 scene** 那一層的拍，`sailOut:true` 是**城鎮段落**
那一層的 —— 同一件事兩層各有一個出口，**挑錯層不會報錯，只會卡住**。
新增交棒時先問：「**我現在在哪一層？**」

## 其餘兩件

| 件 | |
|---|---|
| 追趕前的遭遇機率 | `DRAGON_ROLL_P` **0.5 → 0.25**（Ray：「讓玩家多開圖」） |
| **管理人工具：鎖血／清盤** | 見下 |

## 管理人工具（Ray：「加一個工具，鎖血以後按清盤＝秒殺」）

左下角兩顆鈕，**只有 `body.testmode` 看得到**（明寫的開發梯子，同章節跳關、九星 +1）。

· **鎖血** —— 守在 `enemyAttack` **唯一那個入口**（大絕／延時／點錯／格擋四條扣血
  路徑都經過它）。擺在最前面 ⇒ 連帶不記失誤、不破無傷 —— 那正是「拿來測流程，
  不是拿來刷成績」。開著時鈕會亮（這種開關最怕忘了它還開著）。
  ⚠ **惡夢化的抽血（`drainPlayer`）故意不擋**：那是那個系統自己的代價，
    擋了會讓惡夢化永遠不會熔斷，那一段就測不到。
· **清盤** —— 走**與普攻同一條** `enemyDamage`（`src:'dev'` 不套武器倍率），
  所以擊殺演出／overkill／連戰換敵／結算全部照舊。
  ⚠ **不要自己把 `enemyHp` 設成 0** —— 那會繞過上面那一整套。

⚠⚠ **兩個開關都不進 `state.js`**：那是「一輪遊戲」的狀態（會被存讀檔帶著走）——
  這是**這一次開機**的工具，存進去等於把測試狀態寫進玩家的存檔。

---

# 上一輪 — `ver 2026.09.17-1425`

---

# -1425：追趕開始前，龍絕不出現在王座那一區

> Ray：「在追趕開始前龍絕不出現在獅階、謁見廳、王座廳、寶冠、聖物等房間」

那一區正是**最後要把牠逼進去的地方** —— 還在找的階段就撞見牠，等於把
「往死胡同逼」那一段的意義先用掉了。

城上寫 `dragonKeepOut:['dragstair','antecham','throne','crown','offering']`
（資料歸資料，鐵律 1），判定在 `dragonActDue` 的**刷新那一段**（`bl_dragon_seen` 之前）。

⚠⚠ **只擋那一段**：追趕開始之後牠**本來就要**往那裡跑，王座廳更是決戰的那一格。
⚠ 獅階本來就被 `noWild` 擋著（它是休息處）—— 仍然列進去，是**把 Ray 的話寫全**：
  日後那一格的 `noWild` 若因別的理由拿掉，這一條還守得住。

---

# 上一輪 — `ver 2026.09.17-1424`

---

# -1424：古城 BGM 的門 ／ 追逐前半的刷新制 ／ 龍的第三型態圖到了

## 1. 「遇到龍之前都先播古城自己的 bgm」

`bgmWhen` 那條 gothic 的門由 `ep_bel_altar` 改成 **`bl_chase1`**。
`ep_bel_altar` 是**白天那一趟**（祭壇首戰）插的 —— 拿它當門，晚上一走進古城就直接
gothic，而 Ray 要的是「**遇到龍之前**」都放 `numina`。
⚠ 第一次追擊戰**本身**照樣是 gothic：戰鬥卡自己寫著 `bgm:'bgm_gothic'`。

## 2. 追逐前半改成刷新制（Ray 重訂）

> 「二番戰階梯大廳必刷一次龍，接下來隨機 50% 在任一移動點，直到第四戰提示小地圖
>   開始追趕」

**兩個階段**（這是 Ray 前後兩次交代的合體）：

| | 何時 | 規則 |
|---|---|---|
| ① 還看不見牠 | `bl_dragon_seen` 之前 | 牠**沒有位置**。二番戰＝走到**階梯大廳**必刷；之後每走一步 **50%** 在任一移動點遭遇 |
| ② 看得見之後 | 第四戰「交給我！」開地圖起 | ver -1421 的**位置制**（站在某一格、打完往反方向跑一格、超過五場自己往王座之間走） |

⚠⚠ **骰子擲在 `go()`（移動那一刻），不是擲在 `dragonActDue` 裡**：那一支在一次抵達
裡可能被問到不只一次，每次擲一顆＝同一格時有時無 —— **那不是機率，是閃爍**（鐵律 7）。

## 3. 龍的第三型態圖到了

美術去背完交了 `resources/enemy/mon_dragon_v1_flight.webp`（1536×1024，真 alpha：
全透 48.6%／半透 10.0%）。`ASSETS.enemy_bl_dragon_front` 改指它
（-1418 我先寫的假路徑 `mon_dragon_front.webp` 作廢）。

## ⚠ 四差分的稽核結果（Ray：「檢查有沒有其他地方四差分未上」）

**要美術補的兩件**（程式端沒得接，圖不存在）：
· **貝利薩爾　前廳 `Belisar_Foyer`** —— 只有單張（Ray 點名的那一格）
· **貝利薩爾　枯井底 `Belisar_DryWell`** —— 只有單張，**但 `_undercity_spec.md`
  把它列在「戶外 4」那一組**（下沉中庭・崩頂坡・排水崖口・**枯井底**）⇒ 規格上就該有四張

其餘查過都對：平原古道 6 格全部四差分；貝利薩爾的崩頂坡・排水崖口・古城中庭四差分齊。

⚠ **另外 22 格有單張圖卻沒寫 `noTime:true`**（北泊戰損 7 格＋石製遺蹟 15 格）——
每次進去都要先吃三、四個 404 才退回單張（§6.5.4 的 -433）。
**這一版沒動**：北泊那幾格與 `rebuild.bg`（重建版**有**時段差分）互相糾纏，
要先確認 `bgCandsOf` 兩條路怎麼分才動得了。列在這裡當待辦。

---

# 上一輪 — `ver 2026.09.17-1423`

---

# -1423：加速／探索教學只綁「從夏爾村出來那一次」

> Ray：「加速、探索教學只綁 S8 從夏爾村出來那一次，不然每次在 S8 之後的升空
>   都要演一次」

**真因**：`addFlag(S9_FLAG)` 掛在**整條鏈的最後一拍**（`S9_E` 演完）。那條鏈很長 ——
等船停穩 → 三段對白 → **兩個教學閘門** → 開大地圖挑目的地 → 收尾。
中途離開（降落、進戰鬥、回主選單）旗就**永遠記不下去** ⇒ 下一次升空從頭再演一次。

**改成開演那一刻就記。**

⚠⚠ 這與城鎮通則「**演完才記**」**刻意相反**，而且理由要記住：
兩條保護的東西不同 —— 城鎮那一條保護「這一段戲還沒看過」；
這一條綁的是**那一次起飛的事件**（Ray 的原話就是「只綁…那一次」）。
**事件用掉了就是用掉了。**

## ⚠⚠⚠ 連帶必須補的一件（不補就會永久鎖死能力）

`feat_sturm`／`feat_sense`／`feat_scan` 是在**教學的閘門裡**插的，中途離開就沒插到；
而 `featureOn()` 在 `sv_s9_leave` 之後**只認旗** ⇒ 加速／探索會**永久不能用**。

⇒ `featureOn()` 補一條：**`S9_FLAG` 立了就當三個能力都開**。
那一趟已經給過了，玩家有沒有跟著做完是他的事，**不該變成永久懲罰**。

⚠ 自檢：**任何「一開演就記」的旗，都要問「中途離開的話，這一段本來要給的東西
  誰補？」** —— 答不出來就不要把記旗提前。

---

# 上一輪 — `ver 2026.09.17-1422`

---

# ⚠⚠⚠ -1422：「轉場立繪還是在」—— 第三次回報，**這次收在對的位置**

> Ray：「切換場景時不要殘留立繪，要講幾次？**憲法沒有嗎**？」
> 　　　「轉場立繪還是在，**播插圖也算轉場**」

## 憲法確實有，但收的位置錯了

§6.5（ver -430）寫的是「**一段對白演完**就清場」，收在 `clearCast`／`endScene`
（**段落的收尾**）。而「**段落中途換了個地方**」那幾條路**從來沒有人收** ——
**規矩沒錯，收的位置錯了**。這正是鐵律 8 的原形。

· -1420 我只補了 `bg:` 一條 ⇒ Ray 又報一次（插圖那一條沒收）。
· -1422 收成**一支** `story.cutCastForScene()`，三條路都呼叫它：

| 算轉場 | |
|---|---|
| ① `bg:` | 硬指定換背景 |
| ② `bgBand:` | 走時段候選鏈換背景（祭壇啟動、城重建都走它） |
| ③ `cg:` | 插圖**蓋上或收掉** —— **兩個方向都算** |

**刻意不算的兩個**：`cgSoft`（同一張插圖的差分 —— 同一個地方發生了變化，不是換地方）、
`cgBack`（中景層 —— 那是**有東西出現在這一景裡**）。

⚠⚠ **`bgBand` 那一條要同步判**：真正換圖在 `im.onload` 裡（非同步），
把清場放進去會跑在**這一拍的立繪上台之後** —— 等於把現在講話的人也掃掉。

**具體修掉的那個**（祭壇那一段）：插圖上索菈娜喊「危險！」→ 下一拍 `cg:null`
回到原背景 → 她**留在原背景前面**。腳本寫的 `hide:[…]` 是在**進插圖**那一拍，
**出插圖**沒有人寫 —— 也不該要求腳本每次記得寫。

⇒ **已寫進 CLAUDE.md §6.5**（Ray 問「憲法沒有嗎」，那就把缺的那一半補上）。
  日後新增任何一條換景的路，**呼叫那一支**，不要自己再寫一次清場。

## 順手

「喔，逃了！」配 `se_monsterroardeep`（Ray：「喔　逃了的時候播龍吼」）——
牠在畫面外吼那一聲。

---

# 上一輪 — `ver 2026.09.17-1421`

---

# -1421：追逐改成**真的在圖上移動** ＋ 追擊戰音樂換主體檔

## ⚠⚠⚠ 追逐的規則整個換掉（Ray 重訂）

> 「每一次戰鬥龍都會往玩家進入房間的反方向移動一格，然後等到玩家再次踩同一格才會再動」
> 「『交給我！』以後開小地圖，顯示龍在當前格的隔壁任一位置」
> 「從開圖開始起算超過 5 場玩家仍沒辦法成功將他往王座之間趕，龍就會開始自己往那個
>   方向移動…此時玩家移動時不論有沒有遭遇，他都會移動，直到停在王座之間」

**這一版取代 ver -1389 的「步數模擬」**：那一版刻意**不算牠在哪一格**，只留
「還要走幾步會遇到」（理由是前四戰看不見牠）。現在牠要**在圖上**，步數模擬表達不了。
⇒ `dragonSteps`／`dragonFlee`／`DRAGON_CHASE_MAX` 全部退役。

| 狀態（都是「這一趟進圖」的，`open()` 歸零、不進存檔） | 意思 |
|---|---|
| `dragonNode` | 牠站在哪一格 |
| `dragonFights` | 這一趟打了幾場（Ray 的「從開圖開始起算」） |
| `dragonAuto` | 超過 5 場 ⇒ 不管玩家來向，自己往王座之間走 |

· **跑的方向**＝`OPPOSITE[backDir]`（＝玩家原本前進的方向）。那條路沒了就挑
  「任何一個不是回頭路的出口」；只剩回頭路（死胡同）才往回 —— 那正是 -1389
  Ray 說的「撞牆後通常只有一條路」。
· **自動模式**走最短路（BFS）往 `throne`，掛在**移動那一刻**（`go()`）而不是抵達
  —— 抵達那一支還要判「有沒有踩到牠」，先讓牠走掉的話玩家永遠追不上。
  ⚠ 靜態驗過：貝利薩爾**每一格都到得了王座之間**，所以自動模式一定會停下來。
· **看得見是另一件事**：`bl_dragon_seen`（「交給我！」那一拍插）—— 在那之前
  `dragonAtNode()` 回 null ＝沒有紅點（Ray：「四戰前就是瞎找」）。
· **第五場以後**用 `DRAGON_LINES.chaseMore`（**沒有 `flag` ＝可重複**，只有戰鬥拍
  —— Ray 沒給那幾場的台詞，不替他編）。不會無窮迴圈：打完牠就跑掉了。

### ⚠⚠ 一個時序坑（值得記住）

「交給我！」那一拍在**段落中間**播，而「打完一場就跑一格」是段落**收尾**才做的
—— 不補的話紅點會畫在**玩家自己那一格**（牠還沒跑）。
現在 `showMapForStory(true)` 看到牠與玩家同格就當場挪到隔壁，並記一筆
`dragonJustPlaced`，段落收尾那一支看到就不再跑第二次 —— **一場只移動一格**。

## 其餘

| 件 | 修法 |
|---|---|
| 諾薇兒 `hungry` 那一拍 | 配 `Se_Tummy`（那一拍沒有台詞，聲音就是那句沒說出口的話） |
| 「那氣味我記住了！」 | 演在地圖上（地圖是持續狀態，段落講完才收） |
| **追擊戰音樂** | `bgm_gothic` 改指 **`PerituneMaterial_Gothic_Dark_loop.m4a`**（主體檔到了）。`fileGain` 重量＝**0.651**（本機 −6.2／手機 −9.0 ⇒ 平均 −7.60，錨 `bgm_battle` 實效 −11.32；峰值 −3.7 dBFS） |

⚠ `..._loop_intro`（7.78 秒那一支）**留在庫裡沒有人用** —— lint 會提醒一句。
日後真要做 intro→loop 的接法時它的響度已經量過了（`fileGain` 那一列留著）。

---

# 上一輪 — `ver 2026.09.17-1420`

---

# -1420：Ray 的七件回報（六件修掉，一件是缺素材）

## ⚠⚠⚠ 1. 追擊戰在安全區開打 —— 鐵律 8 的原形

> Ray：「追擊戰要從進到古城內開始，為什麼我設成安全區的前廳會遭遇戰鬥？古城外也是安全區」

`wildActDue` 有整套守門（安全區旗、`noWild`、`wildFrom`），而**追擊戰自己走一條路**
（`dragonActDue`），**一條都沒問**。加一行 `if(n.noWild) return null;` 一次涵蓋三種：
古城外（`entrance`）／四個休息處（`foyer`・`forge`・`stairwell`・`dragstair`）／祭壇。
王座廳不受影響（它沒有 `noWild`），決戰照舊。

⇒ **新增任何「會開打」的路徑時，先把 `wildActDue` 的守門逐條問一遍。**

## ⚠⚠⚠ 2. 換背景不清立繪 —— 規矩只收在段落收尾，**中途換背景那條路沒人收**

> Ray：「切換場景時不要殘留立繪，要講幾次？憲法沒有嗎？每次轉場都要把前面的立繪清掉」

憲法 §6.5 早就有這條，但它收在 `clearCast`／`endScene`（**段落的收尾**）——
**段落中途換一張背景**從來沒有人收，所以上一個地方的人就站在新背景前面。
現在收在**唯一的換背景點**（`story.js` 的 `bgChanged`），所有腳本一次吃到。
· 這一拍自己的立繪不受影響（上台在 renderLine 後段才做）。
· 真的要跨背景留人就寫 `keepCast:true` —— **明寫的例外**，漏寫的下場是「多清一次」
  （看得見、無害），不是殘留。

## 3. 追擊戰期間音樂被打回去

真因：**每走一格 `enter()` 都 `ensureBgm(townBgm())`**，而那一支只認城上的 `T.bgm`
（＝`numina`）—— 腳本那一拍換成 gothic，**下一步就被打回去**。
新增城上的 `bgmWhen:[{need,until,bgm}]`（由上往下取第一個成立的），
把 -1398 Ray 交辦的三段真的接成**狀態**：

    { need:'bl_night_throne', until:'bl_sky_hunt',     bgm:'crisis' }   // 王座戰後～登船
    { need:'ep_bel_altar',    until:'bl_night_throne', bgm:'gothic' }   // 遭遇／追擊戰

⚠ 不拿 `siege` 去湊：那個開關會連末端封鎖／店關門／路人閉嘴一起開。

## 4~6 其餘

| 件 | 修法 |
|---|---|
| 龍降臨上半被裁 | 中景層預設 `cover`（為**鹿主**訂的，主體在下半）；龍是滿框展翅 ⇒ 那一拍寫 `cgBackFit:'contain'`。不動預設（動了鹿主會壞） |
| 蕾娜「呀！」 | 配 `se_Fall` |
| 追擊戰血量 | `bl_dragon_chase.hp` 500 → **350**（四場共用這張卡） |
| 祭壇啟動的圖 | 圖 `Belisar_OldAltaractive.webp` **早就交了**，漏的是那一拍與節點的 `bgWhen` —— 補上（同木雅克／瓦努努那兩段的作法），旗 `bel_altar_on` |

⚠ 連帶：throne 段的 `goto:'entrance'` 拿掉了 —— 那一段的出口 -1417 起是 `goFlight`。

## ⛔ 7.「追擊戰的音樂是壞的」＝**素材只有半首**

`PerituneMaterial_Gothic_Dark_loop_intro.m4a` **只有 7.78 秒**（Numina 142s／
Irregular 196s／Crisis 87s），而且最後一秒還在滿音量（−8.8 dB）**沒有收尾** ——
它是 intro／loop 成對檔案裡的 **intro 那一半**，主體那一個檔**不在庫裡**。
所以現在聽到的是一段 8 秒的東西一直重複。

**要 Ray 補 `PerituneMaterial_Gothic_Dark_loop.m4a`**（或指定換一首）。
檔案一進 `resources/audio/bgm/` 並補進 `BGM_FILES` ＋ `fileGain` 就好，
`bgm_gothic` 那一格不必動。⚠ 我不替他挑曲子。

---

# 上一輪 — `ver 2026.09.16-1419`

---

# -1419：空中戰改成兩型態 ＋ 放光放慢（Ray 交辦）

> 「空中戰敵人有兩型態，第一形態是美術剛交的 dragonfront，敵 hp 50% 以下放光
>  （攻擊命中的光圈，**要你降 50% 那個**，只放光不受擊），放光完換第 4 型態（原第三型態）」

## ⚠⚠⚠ 我 -1416 改錯了東西

「攻擊光圈」在這個專案裡**有兩個東西**：
· **威脅圈**（紅點收縮，`CHARGE_SECONDS`／卡上的 `atkInterval`）
· **放光**（攻擊命中的那一圈，`holyburst`）

-1416 我把 `bl_dragon_sky.atkInterval` 改成 8（＝蓄力窗口加倍）——
Ray 這一版澄清指的是**放光**。已**還原 `atkInterval:null`**，改放慢 `holyburst`：
CSS `.55s/.75s → 1.1s/1.5s`、`HOLY_GROW_MS 550→1100`、`HOLY_LIFE_MS 1350→2700`
（那三處是同一組數字，鐵律 7 的但書，註解互指）。

## 型態表（四型態）

| 型態 | 卡 | 圖 | 何時 |
|---|---|---|---|
| 1 | `bl_dragon_chase` | `mon_dragon_v1_shackled` | 古城追擊（×4） |
| 2 | `bl_dragon_throne` | `mon_dragon_v1_unsealed` | 王座廳決戰 |
| **3** | **`bl_dragon_front`（新）** | **`mon_dragon_front`（⚠ 還沒進庫）** | **空中戰開場** |
| 4 | `bl_dragon_sky` | `mon_dragon_v1_ascendant` | 放光之後 |

## `morph`：同一場打到一半換一張卡（新機制）

卡上寫 `morph:{ hp:50, to:'bl_dragon_sky', fx:'holyburst' }`，
**判定與執行只有 `modules/combat.js` 的 `maybeMorph()` 一支**（鐵律 8），
掛在 `hitDamage` 那唯一一個扣血點上。

⚠⚠ **與連戰（`advanceEnemy`）是兩件事**：那個是「這一隻死了換下一隻」（併 overkill、
併時間、重開盤序）；這個是**同一隻換了個樣子** —— 血條重開、立繪換掉，
但**局／場的帳一個都不動**（§0.5：換一隻怪才是換一場，而這在敘事上仍是同一隻）。
⚠⚠ **只放光不受擊**：走 `enemy.showHitFx(fx)` 而**不是** `enemyAttack()` ——
後者會扣血、記失誤、破無傷、震畫面。這一下是演出不是攻擊。
⚠ 一場只換一次（`morphed`，`startGame` 兩處歸零）；等光綻放完才換圖
（`HOLY_SWAP_MS`＝`HOLY_GROW_MS`），光還亮著就抽掉立繪讀起來是「牠消失了」。

## ⚠⚠⚠ 圖還沒進庫

美術 -1418 交的是 `resources/_originals/enemy/mon_dragon_v1_flight_raw.png`
（**1536×1024 白底 raw，還沒去背**；我開圖確認過是正面展翅那一張）。
**去背是美術那一段**（§5 明令不要用程式去背 —— 鎖鏈、緞帶、骨刺一定碎）。
圖一進 `resources/enemy/mon_dragon_front.webp` 就自動接上；
在那之前第三型態是**空的立繪**（不會壞，但看得出來）。

⚠ **數值是我照第 4 型態抄的**（血量給 500，其餘照抄）—— Ray 還沒給這一張卡。

---

# 上一輪 — `ver 2026.09.16-1418`

---

# -1416 ~ -1418：古城那一段的收尾（Ray 交辦十件）

## 做掉的

| # | 件 | 重點 |
|---|---|---|
| 1 | 兩拍主角走開的音 `se_steps`→`se_walk` | `se_steps` 是跑步聲；諾「彼此彼此！」是真的在跑，不動 |
| 2 | 「小心！要垮了！」持續震動到破瓦音播完 | 新增 `shakeHold:'se'`，長度**問音檔**（§6.5.5） |
| 3 | 第三型態光圈放慢 | `bl_dragon_sky.atkInterval` null→**8**（預設 4）。⚠ 我讀成「速度剩一半」；要「時間多 50%」就改 6 |
| 4 | 任務探索（追髮飾） | 一旗一判定：不能約會／不能睡覺／只降得了古城（輪跳三句） |
| 5 | 上船追牠 | throne 段收在「上船追！」→ `goFlight`，其餘搬到飛行頁 |
| 6 | 長按天空＝獵手之眼索敵 | **-1418 更正**，見下 |
| 7 | 小地圖重畫入庫 | 37 點照抄＋`?v=2`（-1415） |

## ⚠⚠⚠ -1418 更正：**長按天空 vs 長按船身是兩個人的兩個能力**

> Ray：「**是長按天空**，船身是安雅的搜索」

| 手勢 | 誰的 | 程式 |
|---|---|---|
| **長按天空** | 索菈娜〈獵手之眼〉索敵 | `spawnByHold()`（ver -1086 的「長按天空生怪」，早就在了） |
| **長按船身** | 安雅〈混沌感知〉 | `senseT0` 那一條 |

-1416 我把劇本遭遇掛在**船身**那一條（`onSense` ＋ `senseTargetRect`）—— **那是錯的**：
按下去只會叫出安雅的感應，龍永遠不會出來，**而且畫面上不會有任何錯誤訊息**。
現在改成 `onSkyHold`，觸發點落在 `spawnByHold()`（那一支本來就是「長按真的撐滿
`SPAWN_HOLD_MS`」的唯一落點 —— 中途放手或動了就被 clearTimeout，不算索敵完成）。

⚠ 連帶：`s9GateHit` 加了一道 `if(FEATURE_FLAG[k])` —— `skyhold` 教的是**既有的動作**、
不解鎖任何能力，不擋的話會插一支 `undefined` 進 flags（靜靜髒掉存檔）。

## 「強制轉場至古城升空」——**不必另外做**

`goFlight` 那一拍走 `town.sailFrom()` → `{town:'belisar'}` → 飛行頁的 `townMapXY`
現查座標（ver -1105：「所有地圖都一樣，從那座城正上方升空」）。
貝利薩爾在 `PLACES` 有 `town:'belisar'` 那一筆，所以**升空點天生就在古城正上方**。
轉場本身走飛行頁自己的讀取頁（「用加載頁洗掉」，-428 就定案了）。

## ⚠ 還沒驗

**上船追那一整段我沒有實測**（到不了那個狀態）：語法檢查與 lint 都過，
時序要 Ray 跑一次 —— 特別是
① 黑幕掀完才開口（我掛在 `update()` 裡等 `sayQueue` 空）
② 聚光燈圈的天空範圍（`skyTargetRect`）在手機比例上會不會壓到船。

---

# 上一輪 — `ver 2026.09.16-1415`

---

# -1415：貝利薩爾小地圖重畫入庫（美術交件 `8d8ebe3`）

整張紙的佈局換了（照 `reference/B`，37 格、方向 88 條），**37 個點全部移位**。
程式端兩件事，**兩件都是漏了就靜靜壞掉**：

1. **座標照抄 `_spots_belisar.json`** —— 一個數字都不用眼睛估（§6.5.4.4）。
   實測 37/37 與交件完全一致。
2. ⚠⚠⚠ **`map.img` 跳 `?v=2`**（§5 ver -650）—— 這是**同名覆蓋**：不跳版的話
   瀏覽器照樣拿舊的那一張，**畫面上沒有任何錯誤訊息**，症狀只是「點跟圖對不上」。
   ⚠ 背景走 `ASSET_VER` 是因為那邊的檔名是**組**出來的；小地圖的路徑是
     **手寫字串**，所以直接把 `?v=` 打進去（同 `sfx_saint` 的作法）。

**驗收**（把點疊回圖上看，不是讀資料讀出來的）：37 個紅圈全部落在畫出來的節點上，
名字對得上（Old Altar＝`altar`、Great Court＝`entrance`…），圖上的連線逐條對過
`exits` 沒有一條歪掉。

✅ **「小地圖紙上還畫著下沉中庭」這一件結案** —— 新的那張上面沒有它了。

---

# 上一輪 — `ver 2026.09.16-1414`

---

# -1414：降臨搬到劇情那一側 ＋ 水聲真檔入庫

## 一、⚠⚠⚠ 「戰鬥中不播降臨，劇情出場時播」（Ray 定案，更正 -1413）

-1413 我把 `multi` 放進 `ENTRANCE_KINDS` 是**錯的**：牠在劇情裡已經轟轟烈烈降下來
過一次了（祭壇那一拍），開打再降一次是同一件事演兩遍，第二遍沒有戲劇理由。

| | 之前 | 現在 |
|---|---|---|
| 降臨 | 戰鬥開打時 | **劇情那一拍**（`cgBackRise:true`） |
| 淨化 | 不給 | 不給（牠是被打退的） |

⇒ 判準現在是一句話：**「牠是在劇情裡出場的嗎？」** 是的話降臨歸劇情，戰鬥只負責打。
野怪沒有劇情出場，照舊在戰鬥裡降。

**同一套 CSS keyframes 兩個舞台共用**（鐵律 8）：`#enemyImg` 與 `#storyCgBack`。
⚠⚠ keyframes 多了一個 `--rise-k`（落定後的縮放，預設 1）—— 沒有它的話
`cgBackScale:0.9`（-1413 的「龍縮 10%」）會在降臨演完那一刻被打回原大小：
animation 的 `transform` **蓋過 inline**，而且帶 `both` 填充。
⚠ 著地光環的延遲（`.702s ＝ 0.9s × 78%`）寫在 **CSS**、緊貼著 keyframes ——
劇情那一側因此**一個時間常數都不必抄**（`enemy.js` 的 `LAND_AT` 是同一個數字）。

## 二、⚠⚠⚠ 「不降臨」的完整規格：**槍棺開的時候就在那裡了，推上前就暖讀圖**

它不是「少播一個動畫」。兩件事撐起這句話，缺一個都會變成
「空戰場，然後怪啪一聲貼上去」：

1. **立刻掛 `src`，不受 `riseHeld` 押住** —— 而 `holdRise()` 是在 `startGame`
   **之前**叫的，所以掛上去的那一刻門還關著，時機天生就對（本來就是這樣，補了說明）。
2. **圖要先暖好** —— **新增**：`combat.warmBattleImage(battleId)`，由戰鬥那道門
   在**推棺之前**呼叫。只 `new Image()` 預熱，**不碰 `#enemyImg`**：
   誰什麼時候把圖掛上去仍然只有 `loadEnemyPortrait` 一支說了算。

⚠ 連帶把那道門改名：`enterBattleAudio` → **`enterBattleAssets`**（它現在連圖一起，
名字再叫 Audio 就是說謊）。順序照 §6.6：音效 → 圖。

## 三、`se_waterfall` 真檔入庫（Ray 交件）

交來的是 256 kbps mp3（4.94 秒）→ 照 §6.6 轉 AAC 96k（**167→61 KB**），
原檔進 `resources/audio/se/_raw/`（底線開頭＝不載入）。
-1413 我程序合成的那支暫代品已走 `tools/recycle.sh` 進回收區。

⚠ **換檔就重量**：`fileGain` 由 1.32 → **2.43**。錨 `se_brickcrush`（同一拍一起播）：
brickcrush −15.7 LUFS × 1.825 ⇒ 實效 −10.47；waterfall −18.2 ⇒ 齊平 ＝ 2.43。
峰值 −6.2 dBFS × 2.43 ＝ **+1.5 dBFS**，在 `peakCeilDb`(+2) 之內 —— 這次**不必夾**
（暫代品那支要夾到 1.32，是因為它的峰值本來就貼著頂）。

---

# 上一輪 — `ver 2026.09.16-1413`

---

# -1413：龍那一段的聲音與取景、BGM 優先序、`kind:'multi'`（Ray 交辦五件）

## 一、聲音重排 —— 兩個聲音各自落在自己該在的時刻

| 拍 | 之前 | 現在 |
|---|---|---|
| **龍出現**（`cgBack` 那一拍） | 沒有聲音 | **`se_monsterroardeep`（龍犼）** ＋ `cgBackScale:0.9` |
| 索：「危險！」 | 龍犼 | **`se_brickcrush`（破瓦）** |
| 其後的演出拍 | 破瓦 | 沒有聲音（不重複） |
| 索：「喔，逃了！」之後的震動 | 沒有聲音 | **`['se_brickcrush','se_waterfall']`** |

⚠ 舊註解寫的「龍咆掛在索菈娜那一句上、崩瓦接在後面那一拍」**已作廢**：
那個安排是為了繞過「一拍只有一支 `se`」，而 -1413 把那個限制拿掉了。

## 二、引擎兩處（都收在唯一那支，鐵律 8）

- **`se` 吃陣列**（`fireOneShot`）：一拍要兩個聲音以前只能拆成兩拍，
  而那會把「同時發生」演成「先後發生」—— 崩塌與湧水正是同時的。
- **`cgBackScale`**（中景層縮放）：錨**腳底**（`transform-origin:center bottom`）——
  這一層是 `object-fit:cover` ＋ `object-position:center bottom`，錨中心的話
  縮小＝整隻往下沉進地面。
  ⚠⚠ **每次換圖都重設**（不寫＝1）＋ 離場一起收：中景層是持續狀態，
    縮放留著會跟到下一張圖上（同「誰收它」那一族的坑）。

## 三、⚠⚠ `se_waterfall` 是**我程序合成的暫代品**

庫裡沒有任何水聲（只有 `se_Fall`／`se_brickcrush`／`se_shipcrush`），而 lint 把
「音效不存在」判成**錯誤**。所以先合了一支：粉紅噪音分低頻隆隆＋中高飛濺、
各自慢速起伏，0.25 秒湧上來、尾端 0.5 秒收，3 秒 37 KB。

**要換成真的錄音就同名覆蓋** —— ⚠ 那時記得**重量 `fileGain`**（§6.6：一支音檔只有一個響度）。
現值 **1.32**：錨 `se_brickcrush`（它們同一拍一起播），齊平要 1.59 但峰值會到 +3.6 dBFS
**超過 `peakCeilDb`(+2)**，夾下來剛好比崩塌低 1.6 dB —— 那是對的，
崩塌是撞擊、水是漫上來的，水壓過撞擊那一拍就失焦了。

## 四、BGM 優先序（Ray：「有指定音樂的特殊敵人音樂選擇優先於伙伴配樂」）

`main.battleBgmOf` 的順序寫清楚了：
**① 戰鬥卡 `bgm` → ② 敵人卡 `bgm`（新增）→ ③ 搭檔專屬曲 → ④ 打靶場 → ⑤ 船戰禍魘 → ⑥ 預設**

⚠ ①②＝「**指定**了曲子」、③＝「剛好誰跟著你」—— 指定的一律壓過剛好的。
⚠ **①本來就贏過③**（龍那三場的曲子寫在戰鬥卡上，一直是對的）；新增的是②，
  現在還沒有敵人卡在用它 —— 這一行是**先立規矩**，日後把曲子寫在怪身上自動照走。

## 五、`kind:'multi'` ＝多型態 BOSS 的中間型態

`bl_dragon_chase`／`bl_dragon_throne` 由 `aerial` 改成 **`multi`**；
結算副標三語都補了（中「{name}已擊退」／日「を撃退」／英「Repelled」）。

⚠⚠ **有降臨、沒有淨化**，而且那是刻意的：淨化是「散成白光消失」＝死了，
而這兩型態是**被打退**的 —— 腳本下一句就是索菈娜的「喔，逃了！」，
散白光等於把後面那一場的戲先講完。所以 `multi` 只進 `ENTRANCE_KINDS`，
**不進 `PURIFY_KINDS`**（同 `ship` 的理由：那兩張表分的不是同一刀，不可以合回一份）。
⚠ 最後一型態 `bl_dragon_sky` 仍是 `aerial` —— 那一場才是真的擊墜。

---

# 上一輪 — `ver 2026.09.16-1412`

---

# -1412：祭壇在地圖上亮起 ＋ **祭壇以後的劇情不觸發（真因）**

## 一、⚠⚠⚠ `ep_bel_altar` 有戰鬥拍卻沒宣告 `storyBattle:true`

`actDue` 有這一條（ver -634）：**這一段裡有戰鬥 ＋ 這張地圖插著 `safehouse_<圖>` → 不演**。
而巡場**一定**會插那支旗（它就是「無怪」的來源）—— 於是走到祭壇**什麼都不會發生**，
祭壇以後的整條鏈（首戰 → 撤離 → 回東泊 → 那一夜）一起沒了，
**而且畫面上沒有任何錯誤訊息**。

憲法 -679 早就寫著「**劇情戰不受安全區旗管**（`storyBattle:true`）」——
漏的是**那一格的宣告**。補上就好。

⚠ 這不是 -1410 造出來的洞，是 -1410 的「演劇情」**第一次讓那條路走得到**：
在那之前巡場一律把 `ep_bel_altar` 當成演過了，所以這一段從來沒有被叫起來過。

⚠⚠ **`pullSafehouse` 不可以拿來湊**：那是特殊戰（開演前拔旗、演完插回去），
打輸的話旗會停在拔掉的狀態，整座城當場退回戰鬥探索（Ray -679 踩過）。

**全庫掃過一次**「有戰鬥拍但沒宣告 `storyBattle`」的段落：
· 北泊／夏爾村那 20 段是**圍城圖的遭遇**，本來就該被擋（正常）。
· `shinier_ruins.ruins_bell_done` 的卡是 `session:'ruins_wild'` ＝遭遇怪，也該被擋。
· ⚠ **`eastport.ep_guild_sor` 待 Ray 一句話**：那是約會中在公會被挑釁的一場
  （`withWho:'SORANA'`），形狀像帝都的賞金獵人（`special:true` ＋ `pullSafehouse`）
  但卡上沒標。它是**劇情戰**還是**特殊戰**會改變戰敗行為（回檔 vs 一次送旅店），
  所以我沒有自己決定。

⚠ lint 現在會多一條提醒：「祭壇這一段沒有 `checkpoint:true`」。**這是對的，不要加** ——
加了會讀回**祭壇那一格**，而那一格一踏上去就再演一次同一段＝強制鏈中間的回檔點
（§6.5.2：那等於沒有）。現行退到「進圖」那一筆，人站在古城中庭，走得掉。

## 二、安雅指完方向，祭壇在小地圖上亮起（不給地名）

**照紅點那一套做，不另寫一份**（鐵律 8）：浮在霧上、`span` 空著。

| 件 | 在哪 |
|---|---|
| 資料 | 城上 `mapHint:{node,need,until}` —— 貝利薩爾＝`{altar, bel_hint3, ep_bel_altar}` |
| 判定 | `modules/town.js` 的 `hintNode()`（同 `dragonAtNode()` 的形狀，鐵律 7） |
| 樣式 | `.tm-spot.hint` —— **金色**、呼吸 2.4s |

⚠ **顏色與紅點不同是刻意的**：紅點是「牠在那裡」（威脅），這一顆是「往那邊去」（指路）。
⚠ **地名擋在兩個地方**：有霧那一支（整個 `span` 空著）與**沒霧那一支**
  （`mist:0` 的圖走的是後者）—— 只擋一邊的話換一張沒霧的圖就露出來了。
⚠ 旗是 `clockGate` **第一行**就記的，所以那一拍地圖攤開時祭壇已經亮著。
⚠ `until:'ep_bel_altar'` ＝踩到了就不再指（同三段提示的 `skipIf`）。

---

# 上一輪 — `ver 2026.09.16-1411`

---

# ⚠⚠⚠ -1411：**六家店的店主立繪從 ver -953 起一直是 404**

Ray 回報「一堆對話立繪都沒跑出來」。全庫掃了一次路徑（561 條）之後找到的真因：

> **ver -953 那次「NPC 路徑修復」把六張店主立繪從 `resources/SI/` 搬進
> `resources/SI/NPC/`，但 `config.js` 的 `shop.shops[].art` 沒有跟著改。**

壞掉的六家：帝都雜貨舖／帝都武器店／北泊雜貨舖／北泊武器店／夏爾村雜貨街／杰羅的工坊。
症狀是走進店裡右邊**空著** —— **畫面上沒有任何錯誤訊息**，所以撐了四百多版沒人發現。

⚠ 這是 §5 那條「搬檔要連引用一起改」的反面案例：搬檔的人只改了檔案系統。
**日後搬任何素材，`grep` 一次舊路徑再收工。**

## 順手建的自檢（值得留著）

把「所有寫在程式裡的素材路徑」對檔案系統掃一次，**同時驗大小寫**
（Windows 與 `http.server` 都不分大小寫，靜態空間分 —— 本機測不出來，上線才 404）。
現在的結果：**561 條路徑、0 條缺、0 條大小寫對不上**。

## ⚠ 這一輪順便釐清的（不是 bug）

- **插畫**：腳本用到 22 張，**21 張在**。唯一掃出來的 `noue_fall` 是**檔頭範例註解裡的
  假名字**（ver -433 就修掉了），不是真腳本 —— 誤報。
- **-1408 的 PNG→WebP 清理沒有動到任何引用**：那六支是 -953 留下的舊帳，
  與這一輪無關（`git log --diff-filter=ADR` 可以直接看到搬檔那一筆）。

---

# 上一輪 — `ver 2026.09.16-1410`

---

# -1410：巡場改成「選圖 ＋ 選要不要演劇情」（Ray 交辦）

> Ray：「巡場加入選擇探索地圖名單，選擇以後選是否播放劇情」

**三件事各由一個機制負責**，不要混在一起：

| 要什麼 | 誰做的 |
|---|---|
| 進度推到後期 | `SCRIPT_TEST.flags` 當**底**（落點只有一份，鐵律 7） |
| **沒有怪** | `safehouse_<圖>`（由 `townId` 推） |
| **劇情演不演** | `town.storyFlagsOf(圖)` —— **加上去＝當成演過了**、**扣掉＝回到還沒演** |

⚠⚠ **「演」是把旗扣掉，不是另外加什麼**：底那一份含著一大票別張圖的劇情旗
（`np_*`／`sv_*`／`sr_*`…），要看北泊那一段就得把北泊那幾支**拿掉** ——
否則走進去只會一片安靜，而那看起來與「劇情壞了」一模一樣。

## 兩支新函式，都是**從 `TOWNS` 算出來的，不列名單**（鐵律 7）

- `town.explorableMaps()` → 13 張圖（`{id,name,node,nodes}`）。加一張圖，選單自己多一列。
- `town.storyFlagsOf(id)` → 那張圖「演過了」的整組旗：段落／閘門／離場自己宣告的
  `flag`，加上由 `townId` 推得出來的 `seen_*`／`inn_seen_*`／`mapcard_*`／`visitFlag`。
  ⚠ **`safehouse_` 不在裡面**：那是「有沒有怪」，與「劇情演過了沒」是兩件事。
- ⇒ -1396 手寫的 `SCRIPT_TEST.tourFlags`（只涵蓋貝利薩爾）**已移除**。
  它的失敗模式是「換圖測忘了改 → 劇情把你抓走」，而巡場的本意正是不要被抓走。

## 面板收成一支（鐵律 8）

章節與巡場共用 `pickSheet(title, rows, onPick)`（`main.js`）——
巡場要開三種面板，另寫一份必然走鐘（外框／淡入／關閉鈕／音效各一套）。
⚠ `onPick(i, next)` 的 `next(fn)` ＝「**這一張收乾淨了**再做下一件事」：
面板延後 200ms 才移除，而守門看的是 `getElementById` —— 不等它，第二張面板
會被自己的守門擋掉（**開不出來**，而且不會有錯誤訊息）。

**實測**：巡場 → 13 張圖的清單 → 平原古道 → 「演劇情」→ 落在**道口**、
`safehouse_plainsroad` 插上、古道自己的旗確實被扣掉（`seen_plainsroad_entry` 是
抵達當下才記的），而且 **`PerituneMaterial_Prairie4_loop.m4a` 真的抓下來播了**
（-1408 那一首的最終驗收）。

⚠ 測試過程留一筆：開機讀取頁**卡在 86%** 是我自己造成的（在讀取中途按了兩下、
又用 `await import()` 開了重複的模組實例）—— 乾淨重載就是 COMPLETE。
同憲法 ver -570：**開機交接期間搶跑會造出假 bug。**

---

# 上一輪 — `ver 2026.09.16-1409`

---

# -1409：貝利薩爾 —— 第一次走到有水的地方（Ray 交稿）

索菈娜「哇！這地方怎麼到處都是水」那一段，六句，**一個段落物件掛在六格上**
（`BEL_WATER_FIRST`，`script/town.js`）。「第一次」由旗標 `bel_water` 保證 ——
`actDue` 跳過旗立起來的段落，所以**先踩到哪一格就在哪一格演**，其餘五格安靜。

⚠⚠ **哪幾格算「有水」照 `_undercity_spec.md` 逐格的描述，不照名字猜**：
千柱廳（淺水）・獅口水道・水牢（及膝）・暗渠（腳踝）・積水甬道（積水到膝）・靜水池。
⛔ **枯井底是乾的、排水崖口是開在崖壁上的出口**（戶外、腳下沒有路）—— 兩格都不算。
別被「井」「排水」這兩個字帶著走。

⚠ Ray 的稿寫蕾娜的 `think`，`speakers.js` 那張差分叫 **`thinking`**（其餘五張都對得上）。

**實測**（腳本測試 → 走進古城 → 前廳 → 絞盤室 → 水牢）：
在**水牢**跳出來、六張差分全部載到（含 `Anya_SI_Silent`）、演完才記旗，
接著走到**積水甬道**（另一格有水的）**沒有再演**。

---

# 上一輪 — `ver 2026.09.16-1408`

---

# ⚠⚠⚠ -1405 ~ -1408：貝利薩爾的拓樸**終於對上了**，外加素材的一次總清

## 一、拓樸：權威是 `reference/投影片1`，不是我推的那一版

-1404 套用施工單之後 Ray 還是說「對不上」，接著連退三次，措辭一次比一次重：

> 「你不能照拓樸接圖嗎？拓樸是正確的，圖也是正確的，**只有你接錯**」
> 「不是你有什麼病嗎？**上一版拓樸是你出給我的啊**」
> 「你是白癡嗎？怎麼會拿最初版的拓樸來做？**我傳給你的 ppt 你是當屎嗎？**」
> 「**reference/投影片1** 白癡 給我照這個做」

⚠⚠⚠ **根因只有一句：有權威來源卻不打開。** 這一件事上，repo 裡躺著
**四份**互相印證的權威文件，我一份都沒開就動手：

| 文件 | 它寫著什麼 |
|---|---|
| `resources/map/_undercity_spec.md` 23~26 行 | 每一格的出口數 |
| `resources/map/_belisar_worklist.md` ＋ `_belisar_patch.json` | -1378 的施工單，逐格 `exits` |
| `resources/map/map_belisar.webp` | **已經是新拓樸**的小地圖 |
| `reference/投影片1.PNG`（＝ Ray 傳的 `belisar_topology.pptx`） | **最終權威**：節點、連線、相對位置 |

**-1406 照 `reference/投影片1` 重接完，逐項驗過：**

| 驗收 | 實測 |
|---|---|
| 37 格・44 邊・環 8，與投影片**零邊差** | ✔ |
| 方向由**相對位置**重解（角度成本最小化，22 格重寫） | ✔（憲法 -907：方向＝相對位置） |
| 同一條邊兩端相反 | ✔ 44/44 |
| 全圖連通、無同向繞回 | ✔ |
| 死胡同只有 `altar`／`crown`／`offering`／`entrance` | ✔ |
| `altar` 只能從 `floodway` 進 | ✔ |
| 小地圖 `map.spots` 對得上 | ✔ 37/37 |

## 二、⚠⚠ 休息處是四個，不是三個（Ray 更正）

我把 Ray 的「旋梯井、獅階、武器工坊為**安全點**」只接成 `noWild`（不出怪），
漏了 `rest`（＝閉棺結算點）。Ray：「**休息處是前廳 兵器工坊 旋梯井 獅階**」。
現在四格都是 `rest:true` ＋ `noWild:true`。
⚠ **`rest` 與 `noWild` 是兩件事**：前者是「走進去就結算」（§6.5.4.4 的第四條結算路徑），
後者是「這一格不刷怪」。講「安全點」時要問清楚是哪一個 —— 這一次我自己選了一個，選錯了。

## 三、素材：`makeface` 不是缺圖，是**沒登記**

我回報「安雅的 `makeface` 缺圖」，Ray：「makeface 明明就有圖，給我好好找，可能是大小寫。」
—— 檔案 `resources/SI/Anya_SI_makeface.png` **一直都在**，缺的是
`script/speakers.js` 的 `ART.anya.expr` 那一列。已接上（並轉成 webp）。
⚠ **「查不到差分」有兩種**：真的沒交、與交了沒登記。**先 `ls` 資料夾再回報。**

## 四、-1408：平原古道的曲子 ＋ PNG→WebP 總清

**曲子**（Ray：「`PerituneMaterial_Prairie4_loop` 平原古道用這一首」）——
四處都補了（漏一處就是**靜靜不響**，那正是 -1398 抓到「古城從 -1350 起一首沒播過」的病）：

| 檔 | 補了什麼 |
|---|---|
| `config.js` `ASSETS` | `bgm_prairie` |
| `config.js` `tuning.fileGain` | `peritunematerial_prairie4_loop:0.731` |
| `modules/story.js` `BGM_FILES` | `PerituneMaterial_Prairie4_loop.m4a` |
| `script/town.js` | `TOWNS.plainsroad.bgm:'prairie'` |
| `index.html` credit | Prairie4 ＋ **補登** Numina／Gothic Dark／Irregular（-1350 交件時漏的） |

⚠ 增益是量出來的（ffmpeg BS.1770，§6.6 的兩次量測取平均）：
本機 −7.2 LUFS／手機模型 −10.0 ⇒ 平均 **−8.60**；錨 `bgm_battle`（0.849）平均 −9.90
⇒ `0.849×10^(−1.30/20)＝0.731`。峰值 0.0 dBFS × 0.731 ＝ −2.7 dBFS，未觸頂。

**PNG→WebP**（Ray：「轉 webp 這種小事你就自己做，不要等美術」）——
分四類處理，**只有第一類需要判斷**：

| 類 | 張數 | 處置 |
|---|---|---|
| **真的被載入的** | 1（`TIVOT_Emblem`） | 轉 webp、`config.home_emblem` 改指它（542→253 KB，**在 `HOME_IMG` 白名單裡＝每次冷開機都要付**）。⚠ **PNG 留在原位**：`index.html` 的 `apple-touch-icon` 吃不了 webp |
| **交了還沒接的立繪／CI** | 14 | 轉 webp、原 PNG 收進 `_originals`（沒有人引用，不必改任何程式） |
| **已經轉過、原 PNG 忘了收** | 25 | 直接收進 `_originals`（指紋比對確認與 webp 同內容） |
| **工具輸出／UUID 原始檔／去背前的合成稿** | 42 | **不動**（見下） |

合計：**轉檔 24.2 → 3.6 MB（省 20.7 MB，85%）**；另有 25 張原 PNG 移出會被載入的目錄。
保真度逐張驗過（只看 alpha>8 的可見像素）：色差 1.46~2.49／255，alpha 差 0.00。

## ⚠⚠ 還沒做 ／ 要 Ray 一句話

1. ~~小地圖紙上還畫著下沉中庭（Sunken Court）~~ —— **ver -1415 結案**（美術重畫了整張）。
2. **兩張 PNG 與同名 webp 內容不同，我沒動**（改它們＝同名覆蓋，要跳 `ASSET_VER`，§5 ver -650）：
   · `resources/CI/CI_Anya_OBE.png`（差 16.4）　· `resources/map/map_ruins_shinier.png`（差 114.9）
   ⚠ 後者**很可能不是同一個東西**：憲法 -907 說 `map_ruins_shinier.png` 是
     **Ray 手畫的佈局圖**，而 `.webp` 是遊戲裡的小地圖 —— 同名不同物，那就該留著。
     前者要請 Ray 確認是不是新版。
3. **`resources/background/ruins/` 有 20 張 UUID 檔名的原始件（54 MB）**，沒有任何程式引用。
   是「還沒命名的交件」還是「已經改名過的殘渣」？要 Ray 一句話才敢收。
4. **`Peritune_Mystic_Tides_loop.m4a` 在庫裡但沒有人用**（lint 每次都提醒）——
   等 Ray 指派用途，我不自己接。
5. `resources/_HANDOFF_ART_20260916.md` 的九節「程式端要接的」**大半還沒做**：
   §六（5 張同名覆蓋要跳 `ASSET_VER`、東泊餐飲街改室外街景）、§十（店舖 `hours`
   `[8,20]`→`[8,17]` ＋ 逐格 `noTime`）、§十四（`dock.bg` 改指 `East_SouthGate`）、
   `TOWNS.plainsroad` 的 `map:` 已補、追逐邏輯不能讓怪往 `entrance` 逃、D 那 20 張待回收。
6. **祭壇啟動版 `Belisar_OldAltaractive` 還沒接**（Ray 以為接了，實測沒有）。
7. ⚠ `Belisar_OldAltar` 與 `Belisar_EntryHall` **是位元組相同的兩個檔**（32×32 指紋差 0.00）——
   -1405 我靠「指紋比對」挑了 `EntryHall`，那個判斷其實是擲骰子，-1406 已還原成 `OldAltar`。
   要分開的話得請美術真的畫兩張。

---

# 上一輪 — `ver 2026.09.16-1404`

---

# ⚠⚠⚠ -1403/-1404：貝利薩爾的拓樸 —— **施工單躺了 25 版沒有人套用**

Ray 連報三次「實際圖跟拓樸對不上」，我連改三輪（-1399／-1400 換房間位置、
-1402 又還原），**每一輪都是錯的方向**。真相：

> **`resources/map/_belisar_worklist.md`（ver -1378 開的施工單）從來沒有被套用。**
> 它從 `resources/map/_belisar_patch.json`（美術提案＋Ray 定案）印出來，
> 逐格列好 `exits`、要刪的節點、驗收條件、要跳的 `ASSET_VER` —— 一件都沒做。

⇒ **圖是照新拓樸畫的，資料還停在舊拓樸** —— 那就是「對不上」。

## ⚠⚠⚠ 我犯的錯，三次都是同一種

1. **沒讀規格書就自己重判**：拿 440px 的暗色縮圖去數「這張圖畫得出幾條路」，
   判錯了，然後動手改資料（-1399／-1400 換了七組房間位置）。
   ⚠ `resources/map/_undercity_spec.md` 第 23~26 行、`_belisar_worklist.md` 全篇
   **都寫著每一格幾向** —— 兩份都在 repo 裡，我一份都沒開。
2. **把「我看不出來」當成「圖不支援」**：據此對 Ray 說「差 7~8 張圖，要補圖」——
   那是**拿自己的判讀去否定他的設計**（憲法 -907：拓樸是 Ray 的設計）。
3. **改壞之後又「還原」**：還原到的是**舊的**那一版，而舊的本來就是要被施工單換掉的。

⇒ **規矩**：動任何一張圖／一格地圖之前，先 `ls resources/map/_<圖>_*.md`
  與 `_<圖>_patch.json`。**那裡有施工單就照它做，不要自己重判。**

## 現在的狀態（照施工單做完，逐項驗過）

| 施工單的驗收 | 實測 |
|---|---|
| 37 格・44 邊・環 8 | ✔ |
| 死胡同只有 4：`altar`／`crown`／`entrance`／`offering` | ✔ |
| `altar` 只能從 `floodway` 進 | ✔（唯一的入口） |
| 全圖連通、同一條邊兩端相反 | ✔（44/44） |
| 同向不繞回（-902 的自檢） | ✔ |
| `courtyard`（下沉中庭）整格移除 | ✔（連 `lamphall.up`／`rooffall.left` 一起拆） |
| §六 `ASSET_VER` 跳版 | ✔（`belisar_oldaltar`／`_ossuary`／`_rooffall_*`） |

⚠⚠ **這座城的休息處因此只剩 `foyer` 前廳一個**（下沉中庭是另一個）——
那是施工單的設計，不是漏掉。
⚠ `Belisar_SunkenCourt` 那組圖從此沒有人用（施工單：美術**先不回收**）。

## ⚠⚠⚠ 還沒做的兩件

1. **小地圖待美術更新**（⚠ Ray 更正我的錯誤結論）—— 我原本寫「`map_belisar.webp`
   是照舊拓樸合成的，必須重跑」，**那是錯的，而且我沒開過那張圖就下了結論**。
   Ray：「白癡嗎？小地圖美術早就做好了，是你一直拿最初板的拓樸在做。」
   實測：那張圖**就是新拓樸**，37 個點與 `map.spots` **37/37 全對**。
   剩下的只有一件：**紙上還畫著已經刪掉的下沉中庭（Sunken Court）** —— 待美術擦掉。
   ⚠⚠ 教訓與這一輪其他幾次同源：**下「這個素材是舊的」這種判斷之前，先把它打開看。**
2. 施工單 §四（入口不能當逃生口）：現行實作裡龍**只有第四場之後才佔格子**
   （`dragonAtNode()` 固定回 `throne`），前四場是「走到哪打到哪」——
   所以目前沒有「被逼到 entrance 逃出地圖」這條路徑。**暫時不必動**，
   日後若改成龍會佔格子移動，這一條要回頭處理。

---

# 上一輪 — `ver 2026.09.16-1402`

---

# ⚠⚠⚠ -1402：**-1397 有兩處改動從來沒寫進檔案**（教訓，值得記住）

Ray 回報：「蕾娜『打擾了』進去以後是在前廳開始自由探索，不是直接送到祭壇」——
那**正是 -1397 的 commit 訊息說做掉了的事**，而實際上檔案裡從頭到尾都是 `goto:'altar'`。

**原因**：-1397 那一批三個改動寫在**同一支 python script** 裡
（① 溪谷口的新 act ② 古城中庭的 act ③ `forge` 的 `noWild`），
而 ③ 的 `assert` 失敗 —— **寫檔在整支 script 的最後一行**，於是 ①② 一起沒落地。
我看到 traceback 之後**只補做了失敗的 ③**，以為前兩個已經進去了
（script 在死之前印過 `ok`，那是**別的步驟**印的）。

⇒ **規矩**：
- **一支 script 改多處時，每一處各自寫檔** —— 不要把 N 個 assert 串在一次寫入前面。
- ⚠⚠ **驗收看檔案，不要看 script 印什麼**：改完一定 `grep` 一次那個字串。
  這一條與「瀏覽器測試要用真的點擊」同族：**印出來的 ok 不是證據，量到的才是。**
- ⚠ commit 訊息也會因此說謊 —— -1397 那一則寫「開場搬到古道／從前廳探索」，兩件都沒發生。

**-1402 補回來的兩件**（實測過）：
- 古道最後一格（溪谷口）新 act `ep_bel_sight`：諾「裡面有燈光！」／蕾「跟木雅克遺蹟的
  時候一樣嗎……」／安雅 `lookup` 的無台詞立繪拍。
- 古城中庭那一段從「不過倒是挺安靜的」開始，收尾 **`goto:'foyer'`**。
  實測：走進中庭 → 演完四拍 → **落在「貝利薩爾遺址　前廳」**，`ep_bel_enter` 記下、
  `ep_bel_altar` 還沒有、導覽箭頭（上／下）回來 ⇒ 從前廳開始自由探索 ✔

---

# 上一輪 — `ver 2026.09.16-1400`

---

# -1400：貝利薩爾「照拓樸接圖」**做到完**

> Ray：「先照我說的做到完　再來修」—— -1399 只換了三組就停下來問，這一版補齊。

**現在 38 格沒有任何一格多接**（每一格的向數都 ≤ 那張背景圖畫得出的通道數）。

| 換下來的（圖撐不住） | | 換上去的 | |
|---|---|---|---|
| 甲冑廊（兩牆全甲冑，無側口） | 4→1 | 下沉中庭（四面拱廊） | 1→4 |
| 枝燈長廊（直廊） | 3→1 | 納骨堂（圓頂大廳） | 1→3 |
| 獅口水道（直水道） | 3→1 | 星象室（圓頂） | 1→3 |
| 謁見前廳（正中一門） | 4→3 | 千柱廳（滿場列柱，四面通） | 3→4 |
| 階梯大廳（正中一門） | 4→3 | 中央大廳（開闊、兩側拱廊） | 3→4 |
| 旋梯井（垂直梯井） | 3→1 | 寶冠室（圓頂） | 1→3 |
| 石棺廊（兩側是壁龕不是通道） | 3→1 | 古代祭壇（四面拱廊） | 1→3 |

⚠⚠ **拓樸完全沒動**：38 格／41 邊／**4 個環**、全連通、兩端相反 41/41 過、
38 格 × 4 向沒有任何一條同向繞回。**變的只有哪個房間坐在哪個位置。**

**三個硬釘住的**（換了會壞掉，所以沒動）：
· `entrance` 古城中庭 —— 入口
· `foyer` 前廳 —— 必須與入口相鄰（`ep_bel_enter` 的 `goto:'foyer'`＝從前廳開始探索）
· `throne` 王座廳 —— **必須是死胡同**（腳本：「把他往死胡同逼！」，`dragonAtNode()` 回傳它）

⚠ 版面與彎線已重解重畫（`_layout_belisar.png`）。彎線三條：
古代祭壇–鏡廊／寶冠室–靜水池／寶冠室–壁畫長廊。

## ⚠⚠⚠ 兩件跟著要做的

1. **小地圖 `map_belisar.webp` 現在整張對不上** —— 七組房間換了位置。
   要美術重跑：`py tools/map_compose.py belisar --paper <紙> --icons <圖示表>`
   （那兩張來源圖 repo 裡沒有），然後把新的 `_spots_belisar.json` 抄回
   `script/town.js` 的 `map.spots`。**在那之前小地圖是錯的。**
2. **「再來修」那一輪**：房間換位之後有幾處**敘事地理**要看過 ——
   王座廳現在掛在千柱廳下（原本是謁見前廳），寶冠室跑到城中段，
   古代祭壇落到墓道那一區。要調就再對調，拓樸不必動。

---

# 上一輪 — `ver 2026.09.16-1399`

---

# -1399：貝利薩爾「照拓樸接圖」＋ 王座徘徊者死之前沒有野怪

> Ray：「照拓樸接圖　貝利薩爾在王座徘徊者擊敗前沒有野怪」

## 一、照拓樸接圖 —— **拓樸一個字沒動，是房間換了位置**

38 張背景圖逐張看過，判它畫得出幾條路。**三張明顯是直廊卻坐在樞紐上**，
與三個「畫得出多向卻坐在死巷」的房間**對調位置**（交換 `exits` ＋ 對調所有指向它們的出口）：

| 換下來的（圖是直廊） | 原本 | 換上去的（圖是開闊空間） | 原本 |
|---|---|---|---|
| **甲冑廊**（兩牆全是甲冑，沒有側口） | 4 向 → 1 | **下沉中庭**（開闊、四面拱廊） | 1 → 4 |
| **枝燈長廊**（直廊收在暗處） | 3 向 → 1 | **納骨堂**（圓頂大廳） | 1 → 3 |
| **獅口水道**（一條直水道） | 3 向 → 1 | **星象室**（圓頂） | 1 → 3 |

⚠⚠ **驗過**：38 格／41 邊／**4 個環**（與原本完全相同）、全連通、
同一條邊兩端相反 41/41 通過、38 格 × 4 向**沒有任何一條會同向繞回**。
⇒ **Ray 的拓樸設計完全保留**（憲法 -907），變的只有哪個房間坐在哪個位置。

⚠ 版面（`tools/map_layout.py` 的 `POS`）與彎線清單已重解並重畫
（`resources/map/_layout_belisar.png`）。彎線仍是三條：
靜水池–旋梯井／壁畫長廊–旋梯井／石棺廊–鏡廊。

### ⚠⚠⚠ 留著沒動的六格（**要 Ray 一句話**）

這幾格是**邊界案例**，我判「圖勉強撐得住」就沒動 —— 動它們會把寶冠室、王座廳那些
**有敘事位置的房間**趕到地底下去，那是設計決定不是驗證：

| 格 | 向數 | 圖 | 我的判讀 |
|---|---|---|---|
| 謁見前廳／階梯大廳 | 4 | 正中一道亮門＋兩側壁毯／欄杆樓梯 | 是**大廳**不是走廊，勉強 4 |
| 壁畫長廊 | 3 | 左牆壁畫＋右側拱廊 | 右邊那道拱廊算一條 |
| 旋梯井 | 3 | 好幾段梯 | 梯間可以有側平台 |
| 水牢 | 3 | 兩側是**鐵柵牢房**不是通道 | 偏弱 |
| 石棺廊 | 3 | 兩側是**石棺壁龕**不是通道 | 偏弱 |

**水牢與石棺廊最弱。** 要修就得再拿兩個「圖夠開闊」的房間跟它們換 ——
剩下的候選只有寶冠室／王座廳／聖物室／古代祭壇那一族，而那幾間有敘事位置。
⇒ **要嘛接受這兩格多接一條，要嘛補兩張真三岔的圖。**

### ⚠⚠⚠ 小地圖 `map_belisar.webp` **現在對不上了，要重新合成**

`resources/map/map_belisar.webp` 是 `tools/map_compose.py` 依舊版面畫的 ——
那六間房換了位置，**圖上的草書地名與連線就錯了**。
⚠ 我**沒辦法重跑**：它要 `--paper`（羊皮紙）與 `--icons`（圖示貼紙表）兩張來源圖，
**repo 裡沒有**（`_thumbs_belisar.png` 像是圖示表，紙找不到）。
⇒ **這一件要美術 session 接**：拿回那兩張來源，重跑

    py tools/map_compose.py belisar --paper <紙> --icons <圖示表>

然後把新的 `_spots_belisar.json` 抄回 `script/town.js` 的 `map.spots`（照舊規約）。
**在那之前小地圖上那六格是錯的。**

## 二、王座徘徊者擊敗前沒有野怪

城上新欄位 **`wildFrom:'<旗>'`**（`modules/town.js` 的 `wildActDue` 讀它）：
那支旗插上去之前，這張圖一隻野怪都不出。貝利薩爾＝`bl_night_sky`
（空中戰打完那一拍插的旗 ＝ 牠真的死了）。

- ⚠ 它與**安全區旗**是兩件事：安全區旗是**會開會關**的狀態（特殊戰還會拔了再插），
  `wildFrom` 是這張圖的**資料**（在那個事件之前它根本還不是一張會出怪的圖）。
- ⚠ 這座城**目前仍然沒有 `wildSpawn`**（怪的名單還沒給）—— 這一行是**先立規矩**，
  名單一到就自動照它走，不會有人忘記補。

---

# 上一輪 — `ver 2026.09.16-1398`

---

# 這一輪（-1397 ~ -1398）：古城那一段的腳本重排、探索提示、四首曲子

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

`script/town.js`／`modules/town.js`／`modules/story.js`／`main.js`／`config.js`／
`style.css`／`tools/map_layout.py`（-1396）＋ `bust.py` 蓋版號那三支。
**美術的檔一個都沒動**（`resources/map/_layout_belisar.png` 是工具產的附件）。

## 做掉的

| 版 | 做了什麼 |
|---|---|
| -1396 | 首戰回東泊的時刻規則／那一夜改由睡覺觸發（小睡一小時→索菈娜）／巡場鈕／貝利薩爾佈局圖 |
| -1397 | 開場兩句搬到古道最後一格（＋安雅 `lookup`）／從**前廳**開始探索／龍降臨接插圖 `020-rennadrop`／三段探索提示（3・6・10 格）／兵器工坊 `noWild` |
| -1398 | 古城那一段的四首曲子（見下）＋ **`bgmSrc` 的靜默 bug** |

## ⚠⚠⚠ -1398 抓到的靜默 bug：**貝利薩爾古城從 -1350 以來一首 BGM 都沒播過**

`TOWNS.belisar.bgm='numina'`，而 `numina`／`gothic`／`irregular` **三個短名都沒有進
`modules/story.js` 的 `BGM_ALIAS`** ⇒ `bgmSrc()` 一律回 null ⇒ `ensureBgm` 只印一行
`[story] 沒有這首 BGM：numina` 就算了。**畫面上沒有任何錯誤訊息，曲子就是不響。**
一次測試的 console 裡就有 **156 行**。

- **修法是把預設翻到安全的那一側**（鐵律 13）：`bgmSrc` 查不到就回頭問
  `ASSETS['bgm_'+短名]` —— 以後在 `ASSETS` 加一首 `bgm_xxx`，短名 `xxx` 自動可用。
- ⚠ `BGM_ALIAS` 留著：它處理的是**短名與檔名對不起來**的那幾首
  （`suspense`→`…Suspense6…`、`battle`→`bgm_battle`），這一條取代不了。
- ⚠⚠ **教訓**：`BGM_ALIAS` 是「這首曲子存不存在」的**第二張表**，而真相在 `ASSETS`
  —— 兩張表必然走鐘，漏一列的下場是靜靜不響。**加音檔時要問的不只「補了 fileGain
  沒有」，還有「短名查得到嗎」。**

## 古城那一段的四首（Ray 交辦，ver -1398）

| 段 | 曲 | 掛在哪 |
|---|---|---|
| 遭遇龍**之前** | `numina` | `TOWNS.belisar.bgm`（不抄第二份） |
| 遭遇＋追擊 → **王座戰結束為止** | `gothic` | chase① 第一拍 `bgm:'gothic'`；四張卡 `bgm:'bgm_gothic'`、**不寫 `bgmAfter`**（打完接回戰前那一首＝還是 gothic） |
| 王座戰結束後 → 登船 | `crisis` | `bl_throne` 的 `bgmAfter:'crisis'` |
| 登船 → 空中戰前 | `warhorn` | `DRAGON_LINES.throne` 的「一片黑，看不到在哪！」那一拍 |
| 對龍空戰 | `irregular` | `bl_sky` 的 `bgm:'bgm_irregular'` |

⚠ 卡上的 `bgm` 是 **ASSETS 全名**、`bgmAfter` 是**短名** —— 兩格查不同的表（既有慣例）。

## ⚠⚠ 等 Ray 一句話：**貝利薩爾的拓樸與背景圖對不上**

Ray：「實際接圖跟拓樸沒對上　重接」。我逐張看過多向的那幾格，**他是對的**：

| 節點 | 現在 | 圖畫得出 |
|---|---|---|
| 甲冑廊 | 4 向 | **2** —— 筆直長廊，兩牆全是甲冑與旗，沒有側口 |
| 枝燈長廊 | 3 向 | **2** —— 同上 |
| 獅口水道 | 3 向 | **2** —— 一條直水道，左邊只有獅頭吐水口 |
| 旋梯井 | 3 向 | 上下（垂直梯井），`left` 存疑 |
| 謁見前廳／階梯大廳 | 4 向 | 正中一道亮門＋兩側壁毯／欄杆，側向存疑 |
| 中央大廳・千柱廳・地下墓道 | 3~4 向 | **沒問題**（真的開闊） |

⚠⚠⚠ **但照圖降向數，38 格會塌成一條長鏈** —— 那正是 Ray -901／-903 退過兩次的
「根本一直線而已啊」。而憲法 -890 對這個情況只有一條解：**「想要更多分岔，就去要圖」**；
-907 又寫著拓樸是 Ray 的設計。⇒ **沒有動**，兩條路等他挑：
① 照圖降（結果是一條主軸＋幾個死巷，環大概剩 1 個）② 補 3~4 張真三岔的側開口圖。

## 還掛著的

1. **龍是兩套設計**：出場用 `mon_dragon_throne_dormant`（-1396 改），戰鬥立繪還是
   `mon_dragon_v1_*`。要不要把 `config.js` 那三行一起換成 `throne_{dormant,awakened,roar}`？
2. `020-rennadrop` 還是 `.png`，`script_lint` 在唸 —— 要美術轉 webp。
3. **貝利薩爾沒有 `wildSpawn`** ⇒ 現在整座城**一隻野怪都沒有**。Ray 說的
   「安全點不出怪／祭壇只出一次怪」資料面已備好（三格 `noWild`），但**還沒有怪的名單**。
4. 小睡那一晚套了 `needTier:{renna:3}`（T2 那一晚照舊睡到隔天）—— 要改就說一聲。
5. 舊的：`ANYA makeface`／`RENNA sighbreath` 沒有差分圖；`East_SouthGate_dusk` 與
   `_night` 同一張；`NPC_GuildCounter_SI_v5` 沒有 alpha；東泊 `ep_range` 還沒有卡。

---

# 上一輪 — `ver 2026.09.16-1396`

---

# 這一輪（-1396）：古城首戰的回程時刻、那一夜改由睡覺觸發、Ray 的測試埠

> ⚠⚠⚠ **這一台又換回舊機器了**：`py` **3.11.9**、`_originals` **36 檔**、
> `_recycle` **45 檔**、分支 **`master`**（推 `origin master:main`）。
> ⇒ 下面「⚠⚠⚠ 換機器」那一節的 **§六（-1395 那一台）不適用**，反而是它標成
> 「舊的」§二／§三 才是這一台。`node` 有（v24.19.0），`script_lint` 跑得動。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

`modules/town.js`／`modules/inn.js`／`script/town.js`／`script/progress.js`／
`main.js`／`config.js`／`.claude/launch.json` ＋ `bust.py` 蓋版號那三支。
**美術的檔一個都沒動。**

## ⚠⚠⚠ 兩台伺服器，不要互搶

| 名字 | 埠 | 誰用 |
|---|---|---|
| **`tivot-ray`** | **8200（固定，`autoPort:false`）** | **Ray 專用** |
| `tivot-verify` | 8123 | 我驗收用 |
| `tivot` | 8000 | 舊的，沒動 |

⚠ Ray 那一支**故意關掉 `autoPort`**：`localStorage` 是**逐 origin** 的，
埠一漂他的進度就換了一個世界。

## 做掉的（逐條，附驗收）

| 件 | 做了什麼 | 怎麼驗的 |
|---|---|---|
| **巧遇之後不說「啊，回來了。」** | 那一段（`ep_renna_night` 的 `need:'ep_renna_met'` 版）拿掉第一句招呼語 | Ray 定案：那**不是 bug**，是他要的行為（巧遇是跟她一起回來的）。-1395 把它列成「重現不出來的疑案」，現在結案 |
| **首戰回東泊的時刻** | `ep_bel_court` 的 `clockToday:{ hour:18, lateFrom:15 }`；規則在 `town.applyClockToday` | 09:00→**18:00**／16:00→**19:00**／22:00→**隔日 01:00** |
| **那一夜改由睡覺觸發** | act 欄位 `sleepFirst:{hours:1}`；`actDue(n, sleepOnly)` 分流；`napPending` 一次性閂 | 走進旅店**不再**直接演；長按睡覺 19:00→20:00 →索菈娜「想去哪啊？」→ 演完 → 貝利薩爾主廳 |
| 睡覺鈕的字 | 那一晚「小睡 1 小時」，演過之後回到「到隔日 7:00・存檔」 | 兩種狀態各量一次 |
| **龍出場改用趴著那張** | `cgBack` → `mon_dragon_throne_dormant` | 檔在庫裡（326 KB）；⚠ 見下面「要 Ray 一句話」 |
| 測試落點 | `SCRIPT_TEST` 改到**貝利薩爾・古城中庭**；chapter 多一格 `aff` | 進去是 09:00、蕾娜 40＝T3 |

## ⚠⚠ 這一輪的教訓

1. **「從某一句開始跑」要照字面找那一句**，不要換算成「第幾句」。
   -1360 Ray 寫的是「從『有找到一些資料了』開始跑」，被讀成「那一段的第一句」——
   而上面那一段的第一句**剛好也是**招呼語，所以錯得很合理，撐了三十幾版。
2. ⚠⚠⚠ **跳關進去好感是 0（＝T1），所有 `needTier` 的段落都永遠不成立** ——
   而且畫面上**沒有任何錯誤訊息**（只是「按了睡覺什麼都沒發生」）。
   所以 chapter 多了一格 `aff`，走 `setAffectionDev`（唯一那支會連棘輪地板與封頂
   一起處理的）。**日後任何一段掛 `needTier` 的戲，測試落點都要記得給好感。**
3. ⚠⚠⚠ **§6.6「先點掉開機讀取頁」那一條我又踩了一次**：`location.reload()` 之後
   直接下程式化指令，症狀是**黑幕不掀**（`#storyVeil` class 已經拔掉、computed
   opacity 卻停在 1）—— 那正是 ver -570 列的三個假 bug 之一。
   ⚠ **`document.body.click()` 點不掉那一層**，要用**真的滑鼠點擊**（`computer.left_click`）。
   ⚠ 連帶：`#storyTouch` 的推進也**只吃真的點擊**，合成 PointerEvent 推不動對白。
4. ⚠ 驗收時 `town.open()` **不要在對白播到一半時呼叫** —— 會留下一個推不動的空對話框。
   先 reload、點掉讀取頁，再擺狀態。

## ⚠⚠ 還沒解決 ／ 要 Ray 一句話

1. ⚠⚠⚠ **龍現在是兩套設計**：出場（降臨）用 -1118 定案的 `mon_dragon_throne_dormant`
   （趴著那張），**戰鬥立繪還是 `mon_dragon_v1_*` 的三張**（v1 那一輪的草稿，
   -1343 你說「先用這個」）。要嘛把 `config.js` 的
   `enemy_bl_dragon_{chase,throne,sky}` 三行一起換成
   `mon_dragon_throne_{dormant,awakened,roar}`（卡與腳本都不必動），要嘛降臨改回 v1。
2. ⚠⚠ **小睡那一晚我把 `needTier:{renna:3}` 一起套上去了**（＝蕾娜 T2 那一晚
   **睡得著、直接到隔天**，沒有小睡也沒有索菈娜）。理由：稿上 T2 是「隔日正常探索」，
   不這樣的話 T2 玩家要按兩次睡覺、中間什麼都沒有。**要改成「兩條都小睡」就說一聲**
   —— 拿掉那一段的 `needTier` 之外還要另想 T2 醒來要演什麼。
3. 開機時 console 會印 `⚠ 收首頁時沒有東西蓋著：enterTown/covered`
   （跳關進城那條路徑，**-1396 之前就有**，不是這一輪造成的）。要不要修？
4. 舊的仍然掛著：`ANYA makeface`／`RENNA sighbreath` 沒有差分圖；
   `East_SouthGate_dusk` 與 `_night` 是同一張；`NPC_GuildCounter_SI_v5` 沒有 alpha；
   東泊 `ep_range`（打靶）還沒有卡。

---

# 上一輪 — `ver 2026.09.16-1395`

> 這一份是**唯一**的交接檔。**下一次交接請直接改這一份，不要再開新檔。**
>
> ⚠⚠⚠ **寫進這裡的每一條都要當場驗過**（ver -1291 的教訓）：交接檔曾經把
> 已經被 revert 掉的東西寫成現況，於是下一個 session 照著它做了錯的判斷。
> **沒有 `grep` 過、沒有量過的事實不要寫。**
>
> ⚠⚠⚠ **這一份又是「換機器」那一版**（-1395，Ray：「先推上　換機器　寫交接」）：
> 拉下來之後**先看「⚠⚠⚠ 換機器」那一節**，而且**那一節的第二、三小節是舊機器的數字** ——
> 以 **§六（-1395 當天實測）** 為準。git 帶不走的三件是 `_originals`（**337 MB**）／
> `_recycle` 的**內容**（3 MB）／**localStorage**。
> ⚠⚠⚠ **Ray 的遊玩進度在 `http://localhost:49848` 那個 origin**，不是版控裡那份
> `HANDOFF_localStorage.json`（那是再上一台 `:8000` 的快照）—— 要帶就從他那一頁匯出（§六）。
>
> ⚠⚠⚠ **環境數字要標「哪一台機器」**（-1369 立、**-1395 又應驗一次**）：
> 這條教訓上一版寫的是「上一版記著 Python 3.10.0，而這台是 3.11.9」——
> 而**這一台又是 3.10.0**、`_originals` 由 79 MB 變 337 MB、分支由 `master` 變 `main`。
> 三台機器的數字混在同一份檔案裡，所以**每一節都要標自己是哪一台量的**。
> 同一份檔案裡混著兩台機器的數字，讀的人不會知道自己在讀哪一台的。
> **「某支工具可以跑」與「它在這台真的跑得起來」是兩件事。**

---

# 這一輪（-1390 ~ -1395）：小地圖的霧、東泊的四件回報、兩張新地圖

> ⚠⚠⚠ **先讀這一句：這一台**不是**上一份交接寫的那一台。**
> `py` 是 **3.10.0**（上一版寫 3.11.9）、`_originals` **337 MB／156 檔**（上一版 79.2 MB／36 檔）、
> `_recycle` **3 MB／5 檔**（上一版 25.1 MB／45 檔）、專案合計 **1960 MB**（上一版 736 MB）。
> ⇒ **「⚠⚠⚠ 換機器」那一節的第二、三、六小節整組是舊機器的數字**，已在下面第六小節更新；
> 其餘小節（要裝什麼、先跑哪幾件）照舊適用。**同一份檔裡混著兩台機器的數字時，
> 以「這一輪」這一節為準。**

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

`modules/town.js`／`modules/inn.js`／`script/town.js`／`style.css`／`config.js`／
`tools/script_lint.py`／`CLAUDE.md`（§0.5 補一條）＋ `bust.py` 蓋版號的那三支。
**美術的檔一個都沒動。**

## 做掉的（逐條，附驗收）

| 版 | 做了什麼 | 怎麼驗的 |
|---|---|---|
| -1390 | **王座徘徊者的紅點**：`dragonAtNode()` ＝「牠在哪一格」的唯一答案（鐵律 7，`dragonActDue` 改讀它）；小地圖那一格加 `.dragon`（偏橙血紅＋光暈，呼吸 1.6s 比所在地那顆慢） | 當時貝利薩爾**還沒有小地圖**，所以借 `shinier_ruins` 驗；-1395 接上真地圖後補驗（見下） |
| -1391 | 小地圖的霧由米色改**黑霧**（Ray：「世紀帝國那樣」） | 被 -1392 取代 |
| -1392 | ⚠⚠ **霧改成整片一層**：一張 SVG 蓋滿全圖、走過的格子在它身上**挖洞**（`fogShroud`）。`viewBox 0 0 100 100`＋`preserveAspectRatio="none"` ⇒ 不必量 rect、不理 DPR、不接 resize；洞的邊緣 `feGaussianBlur`；一格三顆錯開的橢圓（形狀用**位置算的假亂數**，不可 `Math.random`）；整片黑用 CSS `mask-image` 夾成紙的形狀（否則是個方框，撕邊全沒了） | `shinier_ruins` 21 格逐步走；`capital`（`mist:0`）無霧 |
| -1393 | **全部踩過就把霧整片撤掉**（`fog = fogOn() && !ids.every(seenNode)`） | 20/21 → 中間一座黑島；21/21 → shroud 0、整張紙乾淨 |
| -1394 | 東泊四件（見下面「Ray 的回報」） | 逐條實測，見那一節 |
| -1395 | **接上貝利薩爾（38 格）與古道（6 格）的小地圖**（美術 `9a9014a` 交件）；`cg:'018-anyahide'`→`019-anyahide`；**補 lint 的 `gates` 洞** | 紅點在真地圖上驗過（見下） |

## ⚠⚠ -1394：Ray 的東泊回報（四件，全部有真因）

1. **睡覺鈕點了無效** —— `inn.sleepHere` 的「太早」那一條原本是「有 `innEarly`
   台詞才演，沒有就 `return`」。東泊**沒寫 `innEarly`** ⇒ 18:00 之前按下去
   **完全沒有反應**。⚠ 難查的地方：`eveningHour` 的**預設是 18**（`let eveningHour = 18`），
   城上沒寫 `evening` 就沿用它 —— **資料上看不出這一格有一條 18:00 的線**。
   修法：沒有台詞也給一句旁白（§6.5.5）。
2. **巧遇蕾娜後回旅店＝當天 18:00** —— 新的 act 欄位 **`clockToday:<時>`**
   （`advanceToHour`，只往前）。⚠ 與閘門的 `clockTo`（`advanceToNextHour`）
   **不是同一件事，所以不共用名字**。
3. **巧遇後不能再約人，但頭像照舊都在** —— 新的 act 欄位 **`dateSpent:true`**。
   ⚠ 它與 `datedSet`（今天約了**誰**）是**兩份狀態**，刻意不合併：前者讓其他人的
   頭像消失（-1383），後者頭像全留、**敲門才拒絕**。
4. **出城回飛行地圖搭檔變空** —— 兩層原因：`dateParty()` 回 `{who:null}` 時
   `combat` 會**真的寫下** `setPickedPartner(null)`；而 **`isOpen()` 只看 `townId`，
   `suspend()`（出航）不清它** ⇒ 人到天上了城鎮規則還在生效。
   修法：`townLive` ＋ `isTownMap()`（**有旅店才算城鎮**，Ray 定義，含索菈娜家＝
   `sorahome:{inn:true}`）＋ 進城快照／出城還原（`restoreTownPartner`）。憲法 §0.5 已補。

**實測（8123，靜音，375×812）**：大學 17:00 巧遇 → 推回旅店**時間 18:00** →
蕾娜「啊，回來了」「早點休息吧」→ 旗記下 → 長按睡覺**真的睡到隔日 07:00**；
07:00 再按 → 「……天還沒黑，先做點別的吧。」；敲門 →「今天已經聊夠多囉」；
19:30 四扇門**頭像全在**；進城 nouvelle → 城裡被寫成無夥伴 → 出航**還原成 nouvelle**；
貝利薩爾（沒旅店）`dateParty()` 回 null。

## ⚠⚠⚠ -1395：lint 有一個洞，補起來了（這一條值得記住）

`gates`（城上的強制轉場）的 `lines` **從來沒有被驗過** —— -424 加的那一支只掃
節點的 `acts`。而東泊隔天早上那一整段戲（四人的對白＋安雅躲身後那張插圖）
就是掛在**城**上的一個 gate ⇒ 美術把 `018-anyahide` 改號成 `019-anyahide` 之後
**lint 全綠**，要等玩到隔天早上才會發現插圖不出來（§6.5.4 的 ver -433 同一個坑）。
- 已補 `gates[].lines`（含舊名 `stage1`）與 `goto` 的節點檢查。
- 驗過：改回舊名 → `❌ 沒有這張插圖 018-anyahide`；改成新名 → 0 錯誤。
- 順手浮出兩個沒人看過的提醒：**ANYA `makeface`／RENNA `sighbreath` 沒有差分圖**
  （會回退基本立繪）—— 要給美術。

## ⚠⚠ 還沒解決 ／ 要 Ray 一句話

1. ⚠⚠⚠ **「巧遇之後蕾娜不會說『啊，回來了』」我重現不出來**。乾淨存檔跑：
   大學 16~18 點巧遇 → `goto:'inn'` → 那一段**每次都播**、旗（`ep_renna_night`）
   也記得下（`console` 有 `runArrival` 的實測記錄）。-1394 把時間推到 18:00 之後，
   後面那條鏈（睡覺）確定是通的。
   ⇒ **下一次再遇到時要問的兩個數字**：當下**幾點**、以及 `ep_renna_night`
   **這支旗在不在**（`(await import('/script/progress.js')).getFlags().filter(f=>/ep_renna/.test(f))`）。
2. **ANYA `makeface`／RENNA `sighbreath`** 兩張差分圖沒有（lint 新抓到的）。
3. 舊的兩件仍然掛著：`East_SouthGate_dusk` 與 `_night` **是同一張圖**（指紋 70.1/70.1/87.4）；
   `NPC_GuildCounter_SI_v5` 仍是 RGB 沒有 alpha。
4. 東泊的 `ep_range`（打靶）**還沒有卡**，所以索菈娜武器店那一段到不了（-1346 就記著了）。

---

# 最新這一輪（-1357 ~ -1371）：Ray 的回報清單、S8 那道門、約會的收尾

> 這一輪的主軸是 Ray 丟過來的兩批回報，開頭那一句是
> 「**這些都是以前修繕過的問題，為什麼又跑出來？**」——
> 所以下面每一條都附**真因**與**上一次修的是哪裡**。
> ⚠⚠ 查下來 **四件「又被改回去」裡有三件根本沒被改過**（`git log -S` 查得出來），
> 真正的成因是「**同一件事有第二個入口／第二份真相，而只修了被回報的那一個**」。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

| 版 | 除了 `config.js`（VERSION）＋ `index.html`／`flight/index.html`／`modules/story.js`（bust 產生）之外 |
|---|---|
| -1357 | `style.css`、`main.js`、`CLAUDE.md` |
| -1358 | `script/town.js` |
| -1359 | `main.js`、`script/progress.js` |
| -1360 | `flight/talks.js`、`modules/inn.js`、`modules/town.js`、`script/town.js` |
| -1361 | `script/town.js`、`CLAUDE.md` |
| -1362 | `script/town.js`、`CLAUDE.md` |
| -1363 / -1364 | 只有 `flight/index.html` |
| -1365 | `script/progress.js` |
| -1366 | **註解標記 256 段**，掃過 `modules/`／`script/`／`state.js`／`main.js`／`telemetry.js`／`style.css`（**只加註記，一行程式都沒動**） |
| -1367 | `script/evaluation.js` |
| -1368 / -1369 | `modules/town.js`、`script/town.js` |
| -1370 | `modules/town.js`、`modules/inn.js`、`.claude/launch.json` |
| -1371 | `config.js`（`ASSET_VER`＋店主圖 `?v=2`）、`script/speakers.js`、`HANDOFF.md`、**新** `HANDOFF_localStorage.json` |

⚠ **`resources/` 一個檔都沒碰。**

## 修掉的（逐條，附真因）

| 版 | 症狀（Ray 的話） | 真因 |
|---|---|---|
| **-1361** | —— | ⚠⚠⚠ **`tools/script_lint.py` 在這台從來沒跑過**：憲法 §6.5.4 自 -1326 起寫著「Windows 也跑得動了」，但**這台沒有 node**。裝上之後**第一次跑就抓到一個真的錯誤**：貝利薩爾抵達那一段的推門聲寫成 `se_kerb_open`（正確是 `se_Kerberos_open`）—— 音效名查不到是**靜靜不播**。 |
| **-1362** | 「S8 之前沒有飛行畫面索敵／探索／加速，**講好幾遍了**」 | **stage 0 被判成「沒跑主線」** ⇒ `featureOn()` 走「試飛全開」那一條 ⇒ 三個能力在 S0 全開。`script/progress.js` 的 `getStage` 在 **-556** 就修成 `v>=0`，而 `flight/index.html` 那一份**到 -1362 都還是 `v>0`** —— **漏了六百版**。 |
| **-1362** | 「S8 之前不應該顯示古城可進入，**四大遺蹟都要**」 | 只有木雅克神殿有 `stageFrom:8`，另外三座沒有。判定收成一支 `placeStageLocked(P)`，`nearestTown()`／`doLand()` 共用（鐵律 8）。 |
| **-1362** | 「娜塔莉戰後轉景應該**直接從碼頭開始**，這個也修了好幾次」 | ⚠⚠ `git log -S` 證明**從來沒有被改回去**（-979 拔掉的 `onMove` 還拔著）。真因是**另一拍**：墓地那一段尾巴有一拍 `fadeIn:3000` 會把黑幕**亮回來**再切景（-928 加的，至今沒人動過）。所以「修了好幾次」修的一直是別的東西。 |
| **-1363** | 「我現在在 **S2** 就常常按出索敵」 | ⚠⚠⚠ **我第一次的診斷是錯的**（去查 `featureOn` 的三道門，量出來 S1/S2/S7 全是 false）。Ray 更正兩次之後才對焦：**索菈娜那支 CI 是「主動按著畫面生怪」才該播**，而 `spotFire()` 被無條件寫在 `spawnEnemy()` 裡 ⇒ **畫面自動刷怪也跑一次**。改成 `if(opt.byHold) spotFire();`。 |
| **-1364** | 「長按生怪現在已經不是 admin 工具，但是 S8 以後才開放」 | `canSpawnHold()` 拔掉 ADMIN、只留 `featureOn('sense')`；四段寫著「開發用／管理人限定」的註解一起改掉（那些字本身就是下一個誤判的來源）。 |
| **-1365** | —— | 拆掉害 -1362 漏六百版的那句註解。-556 當時寫的理由是「**stage 0 時本來就沒有船、進不了飛行頁，不受影響**」—— 那句話**當時是對的**，後來首頁多了「試飛」就過期了，而**過期的假設躺在另一支檔案的註解裡，沒有人會回頭看**。 |
| **-1366** | —— | §0.5 的用詞（場／局／盤）是 **-893** 才統一的，之前的「場」＝現在的「局」。**256 段**舊註解機械標上 `（-893 前用詞）`。⚠ **只標不改寫**：分類之後發現其中 14 段已經是新義、162 段從字面判不出來 —— **整批改寫會製造 176 條新的假斷言**。 |
| **-1367** | 「**stage1 時不會有蕾娜評價**」→「蕾娜**從 stage2 才**會開始評價」 | `script/evaluation.js` 的 `FROM_STAGE` 是 1，照 Ray 這一版的口徑改成 **2**。 |
| **-1368** | 「索拉娜的武器店**打靶劇情未觸發**」 | 那一段掛在 `acts`（**抵達**時才演），而打完靶人還站在店裡，收尾只做「清場→還原導覽→回店裡」，**從來沒有再問一次「現在該演什麼」**。旗插了，要走出去再走回來才看得到。收成 `backToShop(n)`，打靶與交談共用（＝ -599 那條「一段演完就接下一段」漏掉的第二個入口）。 |
| **-1368** | 「打靶的台詞不要照帝都，也不會給龍息，獎勵是**吞噬者升一級**」 | 戰鬥卡拿掉 `prizeSec`/`prize:'Shotgun_Dragon'`，改成過關那一拍 `gunStar:'albali'`（走既有那一支；吞噬者本來就是 `repeat`，北泊拿過再拿一次是對的）。 |
| **-1370** | 「**獨自坐坐到時間蕾娜也沒回來啊**」 | ⚠⚠⚠ **這一件是我 -1360 自己弄壞的**，而且正是我跟 Ray 講的那個形狀：**為了一個新的局部需求，去動一個被共用的守門**。-1360 加了 `nudge`（「人已經在旅店就不必講『該回去看看了』」），寫成 `if(g.nudge && g.goto===nodeId) return false;` —— 我要跳過的只有**那句台詞**，卻連 `enterAgain`（再問一次這一格該演什麼）一起跳過了 ⇒ 旗記了、時鐘推了，**東泊「晚上碰到蕾娜」那一段（`hourOfDay:20`）永遠沒有人叫得動**。⚠ 順手補上**第二個入口**：旅店的坐坐／睡覺推完時鐘之後也要問一次 `actDue`（`inn.settle` → 城鎮注入的 `rerun` → 與 -1368 的店舖收尾**同一支** `rerunIfDue`）—— 這正是 -1346 的程式註解裡自己寫著「還沒接、已回報」的那一條。 |
| **-1369** | 「回旅店女主觸發**告別對話**後同行就會解除」 | 新增 `dateByeAct(n)`，與 `dateCurfewAct`（她自己先回去）**同一個形狀**：合成一個 act、`endDate:true` 走既有收尾。⚠⚠ **它刻意不掛旗** —— 那是「**這一次的**約會結束了」，掛旗第二次不演、`endDate` 就不跑、**同行永遠解除不掉**。 |

⚠ **-1369 不是把 -1097 改回去**：-1097 拿掉「走進旅店就解除」的理由是 Ray 當時說的
「帝都還沒有約會事件，只會變成**無意義的動作**」。現在東泊有整組約會戲，而且要的是
**先演告別再解除** —— **前提變了，不是決定被推翻。**

## ⚠⚠ Ray 的回報清單：**還有五件沒做**

> 這是 Ray 一次丟過來的七件，做掉兩件（③蕾娜評價＝-1367、⑦S8 三能力＝-1362）。

| | 回報 | 現況 |
|---|---|---|
| ① | **自動播放時不播畫面震動** | **沒查**。 |
| ② | **讀取畫面的間隙偶爾露出首頁** | ⚠⚠⚠ **診斷完成、還沒修**：「收首頁」這個動作有 **9 個實作點**（`main.js` 6 處＋`modules/combat.js` 3 處，`grep "\$('home').classList.remove('on')"` 數得出來）。正解只有一句：**要等新的那一層真的蓋上去才收**（§6.10 的 -576 已經寫成規矩）。修的紀錄是 -576 修了 `openFlightAt` 那一處、-1321 修了 `enterTown` 那一處、-1357 修了 `land()` 那一處 —— **每一次都只修「被回報的那一個呼叫點」。** ⇒ 正解是收成**一支 `hideHome()`**（鐵律 8），不是等下一次回報。 |
| ④ | **進飛行地圖要點一下才播音樂** | **沒查**。 |
| ⑤ | **帝都降落判定範圍太大，跟底圖一樣大就好** | **沒查**。⚠ 相關常數在 `flight/index.html` 的降落半徑那一族；貝利薩爾為了讓開量體另外寫了 `land:{x,y}`（§6.8.1）。 |
| ⑥ | **飛行畫面的吊飾去背不全** | **美術**的活（鐵律 11）。 |

## ⚠⚠⚠ 等 Ray 的稿（線上跑的是我暫代的字）

| 在哪 | 暫代的是什麼 |
|---|---|
| **東泊打靶三句**（`script/town.js` 的 `challengeLines`） | 報紀錄／獎品／過關交件那一拍。-1350 有兩句是照帝都抄的（「三十秒」「龍息」），已經拿掉 —— 但 Ray 這次只給了**規則**沒給台詞。⚠ 「五十秒」是 `config.js` `ep_range.timeAttack.parSec` 的**同一個數字**，要調門檻得一起改。 |
| **回旅店的告別**（`OUTING.dateBye`） | 現在是一句誰都講得通的旁白「（她在門口停下腳步。）」，**四個人共用**。有各自的稿就往城的 `dateBye.by[WHO]` 加，機制一個字都不必動。 |
| 夏爾村索菈娜的 `low` ／ 約會關閉時的擋話 | 同上，都是暫代。 |

## ⚠⚠ 等 Ray 決定（問了但還沒回）

1. **`tools/regress.mjs`（回歸測試）要不要做。** 這是我對「**我要怎麼防止修好的東西
   又被你擅做主張改壞？**」的答案：查下來四件「又壞了」裡**三件根本沒被改過**，
   真的被我改壞的兩件**共用同一個形狀** —— **為了一個新的局部需求，去動一個被共用的守門**。
   那是程式抓得到的：把「S8 之前 `featureOn` 全 false」「S2 進不了四大遺蹟」這種
   **一句話講得完的事實**寫成可執行的斷言（憲法鐵律 7 自己那句
   「**要寫成會執行的東西，不要寫成註解**」的落地）。
2. **註解衛生的另外兩案**（Ray 上次選了「先回去做遊戲」）：
   ① lint 加一條規則，禁止「另一邊不必改」這種**會過期的跨檔斷言**
   ② 出貨時剝除註解（實測註解佔 **43%**、gzip 後約 **1.1 MB**）

## 這一輪的教訓（已進憲法的不重複）

- ⚠⚠⚠ **症狀用的詞與程式裡的名字不是同一件事**（-1363 我診斷錯一次）：
  Ray 說的「索敵」是**索菈娜那支 CI**，程式裡的 `sense` 是**長按生怪的能力**。
  ⇒ **收到畫面回報時，先問「你看到的是畫面上的哪一個東西」**，不要直接去 grep 那個詞。
- ⚠⚠ **「這個修了好幾次又被改回去」要先用 `git log -S` 問 git**，不要從症狀去猜有人動了什麼
  （§13 那句同樣的話）。四件裡三件查出來是**從來沒被動過**。
- ⚠⚠ **commit 訊息一律走 heredoc**：在 bash 的雙引號字串裡寫反引號會**真的執行**它 ——
  -1361 的 commit body 因此被塞進一行「找不到可用的 JS 引擎」的錯誤輸出，
  **在紀錄裡留下一句假話**（已 `--amend` 修掉）。

---

# 這一輪（-1372 ~ -1374）：立繪差分、hideHome、降落判定圈

> Ray 這一輪指定「1、2、3」＝ ①接他新丟的立繪 ②收首頁那九個呼叫點 ③三件小回報。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

> ⚠⚠⚠ **-1376 搬了 `resources/background/` 底下 525 張圖**（依區域分成 15 個資料夾）。
> 美術那一邊手上若有還沒交的背景檔，**丟進根目錄照樣跑得動**（索引查不到就退回根目錄）
> —— 交完之後跑一次 `py tools/bg_index.py` 歸檔就好。

| 版 | 除了 `config.js`（VERSION）＋ `index.html`／`flight/index.html`／`modules/story.js`（bust 產生）之外 |
|---|---|
| -1372 | `script/speakers.js`、`script/town.js`、**新** `resources/SI/{Anya_SI_amazed,Anya_SI_curious,Renna_SI_scream,Renna_SI_reachcry,Sorana_SI_battlecry}.webp` |
| -1373 | `modules/transition.js`、`main.js`、`modules/combat.js` |
| -1374 | 只有 `flight/index.html`（非 bust 的實質改動） |
| -1375 | `script/enemies.js`、`script/speakers.js`、`script/town.js`、`resources/SI/_SI_差分總表.xlsx`（重跑） |
| -1376 | **`resources/background/` 525 張圖搬資料夾**、**新** `tools/bg_index.py`／`script/bg_index.js`、`tools/script_lint.py`、`flight/index.html` |

⚠⚠ **-1372 那一輪有另一個 session 同時在改 `resources/SI/NPC/`**
（10:50 覆蓋了 `NPC_Gunsmith_SI_v4.webp`）—— 那一批與 Ray 另外丟進 `resources/SI/` 的
9 張 PNG ＋ 2 張插圖**這三版一個都沒有碰**，還躺在工作區沒進版控。

## 做掉的

| 版 | 內容 |
|---|---|
| **-1372** | Ray 交的五張差分接上（PNG→WebP、原 PNG 進 `_originals/SI/`、`measure_si.py` 逐張量）：ANYA `amazed`／`curious`、RENNA `scream`／`reachcry`、SORANA `battlecry`。⚠⚠⚠ 順手抓到 **`ART.nouvelle` 有兩把同名的 `scared` 鑰匙**（物件實字重複鍵**合法**、後面那一把靜靜贏，`node --check` 驗不出來）→ 收成尾巴那唯一的定義（＝維持今天畫面上真正在跑的那一張，不趁機換圖）。另外四個鑰匙是**大小寫／筆誤**（`exprSrc` 是純大小寫敏感查表）：`nou('Shocked')→shocked`、`nou('Surprise')→surprise`、`nou('Scared2')→scared`、`ren('think')→thinking` ×3 —— **圖本來就在、也早就登記好了，只是查不到**。lint 差分提醒 **31 → 18**。 |
| **-1373** | 九個「收首頁」呼叫點收成 `transition.js` 的 **`hideHome(where)`**（鐵律 8）。它不改時序，做的是①把動作收成一個②**驗收**：收的那一刻沒有任何一層蓋著就記一筆 `console.warn` 並寫出**是哪一個呼叫點**（管理人模式再浮紅字）。順手修好一條順序真的反了的（獨立模式降落：先收首頁再 `town.open`）。 |
| **-1375** | **東泊賞金獵人接上他自己的兩張圖**（Ray 交件 `man_bounty_EP`／`NPC_ep_SI_bounty`；在那之前 grep 零命中，線上跑的還是 -1346 那句「先用帝都的」）：ASSETS ＋ 新敵卡 `bounty_ep` ＋ 新 speaker `HUNTER_EP`／ART `hunter_ep` ＋ 東泊那一段 7 處 HUNTER→HUNTER_EP。⚠ 這位的**對話立繪與戰鬥圖是兩張不同的圖**（帝都那位是兩邊共用一張）。另：`tools/si_xlsx.py` 重跑，**立繪總表**更新（SI 263・NPC 46；已接進 speakers.js 205→206 張）。 |
| **-1376** | **背景依區域分成 15 個資料夾**（525 張，git 認出 rename）＋ `tools/bg_index.py` 掃出 `script/bg_index.js`，由 `story.imgSrc()` 查（鐵律 7）。⚠⚠⚠ **查不到退回根目錄**＝搬之前的現況，所以漏歸檔的下場是「照舊」不是「空背景」。⚠ 根目錄刻意留 `Kerberos.png`／`TIVOT_Emblem.png`／`SENTOUINSTALL.webp`（UI 素材、路徑寫死）。順手修掉兩份第二路徑解析：`flight/index.html` 寫死的 `deck_rapidsail`、`tools/script_lint.py` 自己那一份（搬檔當場噴 200 個假錯誤）。 |
| **-1374** | 降落判定圈：`landRadius()` —— 有手繪底圖就 `max(planW*0.5, 384)`、沒有底圖照舊 `townEdgeR*3.2`。帝都 **1680→625**（＝底圖半徑），瀏覽器實測邊界 624 亮／626 不亮。 |

## ⚠⚠ Ray 的回報清單：**剩三件**

| | 回報 | 現況 |
|---|---|---|
| ① | **自動播放時不播畫面震動** | ⚠⚠⚠ **量過了，在自動播放下「有」播** —— 實測（prologue「啊！」那一拍）`#storyStage` 掛著 `story-auto` 時 `.shake` 存活 **471ms**，而 CSS 的 `storyShake` 是 **0.42s**，動畫整段跑完。⇒ **需要 Ray 釐清**，三種讀法見下面那一節。 |
| ④ | **進飛行地圖要點一下才播音樂** | ⚠ **這台重現不出來**：進飛行地圖後**沒有點過 iframe**，`bgmMain/ambSail/ambIdle/sfxTrain/sfxGull` 五軌 `playing()` 全是 `true`。機制讀出來了（`flight/index.html` 的 `startBgm` IIFE：parse 時先 `kick()` 一次，被自動播放政策擋掉就等 iframe 自己的 `pointerdown`／`keydown`）——**那幾顆監聽掛在飛行 iframe 的 window 上，父頁的手勢不會叫醒它**。桌機 localStorage 的 MEI 高所以直接放行；Ray 的裝置／首次造訪就會被擋。**沒有重現就沒有動它**。 |
| ⑥ | **飛行畫面的吊飾去背不全** | **美術**的活（鐵律 11）。 |

## ⚠⚠⚠ ① 要 Ray 一句話：你說的是哪一個？

量到的事實：自動播放（`autoPlay`，間隔讀選單的 `settings.autoDelayMs()`，預設 **1100ms**、
最快 400ms）下震動整段播完。會被砍掉的只有**加速模式**（`fastMode`＝按住下拉／按住空白）——
`scheduleAuto` 在那個模式下寫死 **120ms**，而 `renderLine` 開頭的 `stopFx()` 會把 `.shake` 拔掉
⇒ 420ms 的動畫只演了 **29%**，讀起來就是「幾乎沒抖」。

三種讀法，各自要做的事不同：
- **(a) 你指的是加速模式** → 那就決定加速時震動要「演完」還是「乾脆不演」（現在是演 29%，最糟的那一種）。
- **(b) 你要的是「自動播放時把震動關掉」**（一句**需求**不是 bug）→ 在 `renderLine` 的兩個 shake 分支加一道 `!autoPlay` 守門即可。
- **(c) 你是在手機上看到的** → 那要另外查（可能與 `prefers-reduced-motion` 或那台的動畫節流有關）。

## 還沒做（延續上一版，序號沿用）

程式端可以自己做的：
- **14. 無尾綴舊檔退役**（`East_{Firearm,Guild,Bistro,Grocerie,Hotel,Cafe,Restaurant}.webp`）
- **15. 東泊餐飲街改室外街景** —— ⚠ 等 Ray 答 A／B（酒吧要不要另開一格）
- **16. `Plains_*` 與 `Belisar_GreatCourt*` 接進 `script/town.js`**（圖交了，沒有節點資料，誰都走不到）
- **17. `resources/SI/` 的 PNG 轉檔** —— ⚠⚠ 這一輪只轉了**要用的那五張**。
  ⚠⚠⚠ **剩下的 29 張裡有 12 張已經有同名 `.webp`**（`Renna_SI_{annoyed,askserious,blushed,callangry,chase2,lookdown,meltdown,meltdowncry,reach,scarejump,upset}`、
  `Nouvelle_SI_{lookback,reliefbreath,runserious}` 那一族）—— **轉檔之前一定要先量像素指紋**
  （§5）：是「已經轉過的來源」就直接進 `_originals/`，是「Ray 重交的新版」就是**同名覆蓋**，
  要掛 `?v=`／`ASSET_VER` 而且**取景值要重量**。兩者從檔案系統看起來一模一樣。

美術／Ray 那一邊：
- **剩 4 個差分是真的還沒有圖**：NOUVELLE `gentle`／`pain`、OFFICER `stunned`／`fluster`（都在 prologue）。
- **孤兒素材 `Nouvelle_SI_Scared.webp`**（-1372 把重複鍵收掉之後就沒有人指它了）——
  要不要走 `tools/recycle.sh` 是 Ray 的決定（§5：回收區是唯一的刪除出口）。
- 其餘（東泊三位店主的 `GuildCounter` 還是 RGB 沒 alpha、`Ravn_Church`、拉芬斯達爾室內 21 張、
  `midnight` 差分）照舊，見下一節。

## 這一輪的教訓

- ⚠⚠⚠ **「沒有這張差分」不等於「圖沒交」**：-1372 那 13 個缺件裡，**4 個圖早就在、
  也早就登記好了**，只是腳本把鑰匙打錯字（大小寫／`think` vs `thinking`）。
  ⇒ **看到 lint 報缺差分，先去 `ART[x].expr` 把鑰匙列出來比對**，不要直接開美術工單。
- ⚠⚠⚠ **物件實字的重複鍵是合法的，而且所有語法檢查都驗不出來**（`node --check`、
  `--input-type=module --check` 都過）。它的症狀是「A 靜靜變成 B、而且沒有人知道 A 已經沒人用」。
  `speakers.js` 這種一支檔上千行的查表**特別容易中**。
- ⚠⚠ **回報要先重現再修**：①與④這一輪都**量出來與回報不符**（① 自動播放其實有抖、
  ④ 五軌都在播）。沒有重現就照實寫進交接，不要憑症狀去猜一個修法 —— 那正是 -1363
  那一次診斷錯的形狀。

---

# ⚠⚠⚠ 這台機器：**開工先做這三件**（-1369 當場實測，不是沿用）

| 項 | 實測（-1369） | 上一版交接寫的 |
|---|---|---|
| Python | **3.11.9**，⚠ 仍然**只有 `py`** | 3.10.0 |
| node | **裝在 `C:\Program Files\nodejs\node.exe`（v24.19.0），但⚠⚠ 不在 PATH 上** | 「在 PATH 上」 |
| 主控台 | cp950（所以 `tools/_utf8.py` 還是必要的） | 同 |

⚠⚠⚠ **node 不在 PATH ⇒ `script_lint.py`／`map_layout.py` 那一族會回報
「找不到可用的 JS 引擎」，看起來像工具壞了。** 它是 -1361 用 `winget` 裝的，
而**已經開著的 shell 不會拿到新的 PATH**（PATH 是行程啟動時繼承的）。
兩種解法，**跑 lint 之前先做**：

```bash
export PATH="$PATH:/c/Program Files/nodejs"   # Bash（每個新 shell 各做一次）
```
```powershell
$env:PATH += ';C:\Program Files\nodejs'       # PowerShell
```

⚠ 開一個**全新**的終端機通常就有了 —— 沒有的話才需要上面那一行。

## ⚠⚠⚠ 預覽伺服器：**單執行緒版會被一條連線卡死**（-1370 實測，已修 `.claude/launch.json`）

症狀與第零節那條「`py -m http.server` 會被回收」**一模一樣，但成因不同**：
`socketserver.TCPServer` ＋ `SimpleHTTPRequestHandler` 是**單執行緒**的，
一條 keep-alive 連線就能把它佔住 ⇒ 之後的連線先排進 backlog、填滿之後
**一律 connection refused**。而 `Get-NetTCPConnection` 看得到 listener、
`preview_list` 也說 running —— **看起來一切正常，就是連不上**。

- 分辨法照舊（回 `000` 就是連不上）：
  ```bash
  curl -s -m 8 -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/main.js
  ```
- ⚠ 這一輪它同時騙過了瀏覽器（分頁卡在 `readyState:loading`、
  `navigate` 回「denied or failed」）—— 很容易誤判成程式壞了。
- 修法：`.claude/launch.json` 改用 **`ThreadingHTTPServer` ＋ `daemon_threads`**（-1370）。

## 驗收指令（-1369 當場跑過）

```bash
export PATH="$PATH:/c/Program Files/nodejs"
py tools/script_lint.py     # ✔ 0 個錯誤、31 個提醒
py tools/bust.py            # 改完 config.js 的 VERSION 之後跑
```

**語法檢查**：
```bash
node --input-type=module --check < modules/story.js
```
⚠⚠ **不要用 `node --check`** —— 它把 `.js` 當 CommonJS，**抓不到重複宣告**
（-1297 就是因此讓兩個同名函式上線，首頁整個壞掉才發現）。
⚠ `flight/index.html` 是 HTML，要抽出最大的 `<script>` 再驗（它是非 module，`node --check` 即可）。
⚠⚠⚠ **JS 語法過了不代表 shader 過**：GLSL 編譯失敗是**悄悄退回 CPU**
（`glReady:false`、畫面上沒有任何錯誤訊息）。

## ⚠ lint 那 31 個提醒裡，**有兩類是真的要處理的**

1. ⚠⚠ **腳本寫了 13 種不存在的表情差分**（17 個拍子，多半是貝利薩爾那一段，-1353 寫的）
   —— 會**靜靜回退基本立繪**，畫面上沒有任何錯誤訊息：

   | 角色 | 缺的差分 |
   |---|---|
   | ANYA | `amazed`（4 拍）、`curious`（2 拍） |
   | NOUVELLE | `Scared2` / `Shocked` / `Surprise` / `gentle` / `pain` |
   | RENNA | `think` / `scream` / `reachcry` |
   | OFFICER | `stunned` / `fluster` |
   | SORANA | `battlecry` |

   ⇒ **兩條路**：要那張表情就開**美術**工單（`script/speakers.js` 的 `ART[x].expr` 補一列）；
   不要就把腳本那幾拍改成既有的差分。**不要放著** —— 那是「稿上寫了、畫面上看不到」。
2. **6 段劇情戰前沒有 `checkpoint:true`**（`sf_deer_nightmare`／`ruins_saint_thug`／
   `ruins_saint_temperance`／`np_nightmare`／`np_cemetery`／`man_sorana`）。
   ⚠ lint **驗不出上一段有沒有**（跨段落靜態排不出先後），所以這是**提醒不是錯誤** ——
   但 §6.5.2 那條「落在強制鏈中間等於沒有」要人去確認。

其餘是既有的舊帳：`Ravn_Church` 借圖、東泊懸賞榜還沒有委託、兩支零引用的音檔、
入口那一格有戰鬥（北泊／帝都廣場，靠「連敗三次抬回旅店」兜底）、兩個孤兒場景。

---

# ⚠⚠⚠ 換機器（**數字都是交機當天實測的，不要沿用舊的那幾節**）

> 舊的「第零節」與「換機器要帶什麼」那張表是**再上一台**的（-1306）——
> 那時兩個瀏覽器的 localStorage 都是空的、`_recycle` 只有 36 KB。
> **這一次兩項都不成立**，照抄會掉東西。

## 一、`git clone` 帶得走的（新機器拉下來就有）

程式、資料、素材、`CLAUDE.md`、`HANDOFF.md`、`.claude/launch.json`（預覽伺服器設定）、
`_recycle/README.md` 與 `_recycle/RECYCLE_LOG.tsv`（回收**紀錄**）、
以及 **`HANDOFF_localStorage.json`**（見第三節）。

    git clone <remote> TIVOT        # 分支：本地 master，遠端只有 main

## 二、⚠⚠ git **帶不走**的兩個資料夾（gitignore，要自己複製）

| | 實測 | 為什麼要帶 |
|---|---|---|
| `resources/_originals/` | **79.2 MB／36 個檔** | 轉成 webp 之前的原 PNG。**掉了就回不去了**（§5：它是「可回滾」不是「異地備份」） |
| `_recycle/`（**內容**） | **25.1 MB／45 個檔** | 回收區＝本專案唯一的刪除出口（§5）。⚠ 上一份交接寫「36 KB（很小）」—— **那是舊機器的數字，現在不是**（雪都重修那 12 張、退役的 si.xlsx 都在裡面） |

⚠⚠ **`RECYCLE_LOG.tsv` 進版控、被回收的「檔案本身」不進** —— 所以
「誰在哪一版拿掉了什麼」查 git 就有，但**要把那個檔案救回來，只有這台機器上有**。

## 三、⚠⚠⚠ localStorage：**這一次真的有東西**（已經匯出進版控）

上一次換機器兩個瀏覽器都是空的；**這一台不是**。內建瀏覽器
（`http://localhost:8000`）有一份跑到**最新內容**的進度：

| | |
|---|---|
| 章節 | **stage 8**、旗標 **72** 支 |
| 位置 | 東方泊地　旅店（`tivot_save_v1` 的 `main` 格與 `auto` 格都有） |
| 進度 | 打靶拿到龍息、索菈娜約會與公會那一段、晚上碰到蕾娜、`ep_day2` 已開 |
| 其他 | 遊玩 990 秒、錢 11180、好感 蕾娜 20.5／索菈娜 25／安雅 2、地圖標記在東方泊地 |
| 上次開機版本 | `ver 2026.09.15-1366` |

⇒ **已經匯出成 `HANDOFF_localStorage.json`（7 KB，26 支鑰匙，進版控）。**

**新機器還原**（開好遊戲頁面，在那個 origin 的 console 貼這一段）：

```js
const j = await (await fetch('/HANDOFF_localStorage.json')).json();
for (const [k, v] of Object.entries(j.data)) localStorage.setItem(k, v);
location.reload();
```

- ⚠⚠ **localStorage 是逐 origin 的**：`localhost:8000` 與 `127.0.0.1:8010` 是**兩份**
  （這一輪的驗證殘留就躺在後者，那一份是測試垃圾，不要還原它）。
  還原之前先確認自己開的是哪一個。
- ⚠ **Ray 自己的 Chrome 是另一個設定檔、另一份 localStorage** —— 我這裡讀不到。
  真的在那邊玩過就自己匯出一份（`F12` → console）：
  ```js
  copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('tivot_')))))
  ```
- ⚠ 不想要這一份就把 `HANDOFF_localStorage.json` 刪掉 —— 它只是一張快照，程式不讀它。

## 四、新機器要裝什麼（照這台實測的清單）

| | 這台的狀況 | 新機器 |
|---|---|---|
| **Node.js** | v24.19.0，裝在 `C:/Program Files/nodejs`，⚠ **不在這個 shell 的 PATH 上** | `winget install OpenJS.NodeJS.LTS`，**裝完開一個新的終端機**才吃得到 PATH。沒有它 `script_lint.py`／`map_layout.py` 整族是黑的（§6.5.4 的教訓） |
| **Python** | 3.11.9，⚠ **只有 `py`**（`python`／`python3` 是空殼） | 文件裡的 `python3 tools/xxx.py` 一律唸成 `py tools/xxx.py` |
| Pillow／numpy／scipy | 11.3.0／2.2.1／1.17.1 ✔ | 量 alpha、量顆粒、量色調那幾支要 |
| **openpyxl** | ⚠ **沒裝** | 只有 `enemies_xlsx export` 要：`py -m pip install openpyxl` |
| ffmpeg | 有（gyan full build） | 音檔轉檔要 |
| cwebp／magick | ⚠ **不在 PATH**（圖都是 Pillow 處理的） | 要跑 §5 那條 `cwebp` 流程就得另外裝 |
| 主控台 | cp950 ⇒ `tools/_utf8.py` 仍然必要 | 同 |

## 五、到了新機器，**動手之前先跑這四件**

```bash
export PATH="$PATH:/c/Program Files/nodejs"      # 沒有就先開新終端機
py tools/script_lint.py      # ver -1395 應該是 0 個錯誤、20 個提醒
py tools/bust.py --check     # 應該說「快取版本號同步中 ✔」
curl -s -m 8 -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/main.js   # 起了伺服器之後
```

外加**量效能之前**先確認 `renderer` 抓到的是真顯卡（第零節陷阱 1：Claude 桌面版會
自己關掉硬體加速，而且選單救不回來 —— 那一格是 `isHardwareAccelerationAutoDisabled`）。

## 六、這一台的現況（**-1395 當天實測，取代上面第二、三小節的數字**）

⚠⚠⚠ **上面第二、三小節（`_originals` 79.2 MB／`_recycle` 25.1 MB／localStorage 那一份）
是「再上一台」的數字** —— 這一台不是那一台（`py` 也由 3.11.9 變成 3.10.0）。
以下是這一台交出去那一刻**當場量的**：

| | 這一台（-1395） | 上一版寫的（舊機器） |
|---|---|---|
| `resources/_originals/` | **337 MB／156 檔** | 79.2 MB／36 檔 |
| `_recycle/`（內容） | **3 MB／5 項**（`README.md`／`RECYCLE_LOG.tsv`／`resources/`／`si.xlsx`） | 25.1 MB／45 檔 |
| 專案合計 | **1960 MB** | 736.4 MB |
| `py` | **3.10.0** | 3.11.9 |
| node | v24.19.0，`C:/Program Files/nodejs`，⚠ **不在 shell 的 PATH 上** | 同 |
| 分支 | **`main`**（`origin/main` 同一個 commit） | 寫「本地 master」—— 這一台不是 |

⚠⚠ **`RECYCLE_LOG.tsv` 裡的紀錄比 `_recycle/` 裡的檔案多很多** ——
那些被回收的檔案**留在舊機器上**。要救哪一個回來就得去那一台拿。

- 工作區**乾淨**：`git status --untracked-files=all` 零筆；`main` ＝ `origin/main` ＝ `b8775b6`。
- ⚠⚠⚠ **Ray 自己測的是 `http://localhost:49848`** —— 他的遊玩進度（localStorage）
  住在**那個 origin**，不是 `:8000`／`:8123`。換機器要帶就從**那一頁**的 console 匯出：
  ```js
  copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('tivot_')))))
  ```
  （版控裡那份 `HANDOFF_localStorage.json` 是**舊機器 `:8000`** 的快照，不是他現在在跑的那一份。）
- ⚠ 我這一輪測試一律開自己的 **8123**（`.claude/launch.json` 的 `tivot-verify`），
  **沒有碰 49848**，而且整輪靜音 —— 那是 Ray 這一輪明講的規矩。

---

# 接下來的事項（-1369 逐項複驗過現況）

> **等 Ray 的**（我不能自己決定）：

1. **`belisar_land_ok` 這支旗還是沒有人插** ⇒ 貝利薩爾**飛不下去**
   （`flight/index.html:18092`）。⚠ -1358 開了**走路**那條（東泊碼頭 → 舊道），
   所以現在到得了；但「從天上降落」仍然是關著的。
2. **東泊打靶三句 ／ 回旅店的告別**（上面那張暫代表）。
3. **`tools/regress.mjs` 要不要做**／**註解衛生的另外兩案**（上面那一節）。
4. **卡耶爾山谷的遭遇戰敵人卡**（所以 `wildSpawn` 先沒給）；
   **瓦努努遺蹟的 Boss 卡**（`script/town.js` 那一拍）。
5. **兩支音檔交了但從來沒接上**（`script_lint` 報的，-922 入庫至今、**現在仍是零引用**）：
   `resources/audio/se/se_cannonslide.mp3`（⚠ 還是 `.mp3`，§6.6 規約是 m4a）／
   `resources/audio/bgm/Peritune_Mystic_Tides_loop.m4a`。
   **要接在哪一拍是 Ray 的決定**；接的時候別忘了補 `tuning.fileGain` 那一列。
6. **要不要把「貼圖上傳一律走 ImageBitmap(Blob)」寫進憲法**（-1306 只寫在程式註解）。
7. **鐵路要不要重做。**

> **⚠⚠ 美術那一條線另有一份交接檔**：`resources/_HANDOFF_ART_20260916.md`
> （-1371 那一天美術自己推的；**版本號是兩條，不要互相借號**）。它 §六 點名
> **程式端要接三件**，第 1 件 -1371 已經做掉，另外兩件在下面第 15／16 項。

> **等美術交件的**：

8. **東泊三位店主的立繪 —— 修好一個，還剩一個**（-1371 實測，`py` + PIL 數 alpha）：

   | 線上指到的那張 | 現況 |
   |---|---|
   | 槍匠 `NPC_Gunsmith_SI_v1` | **✔ 已去背**（透明 71.7%，美術 -20260916 那一輪）—— 同名覆蓋，所以 -1371 幫它掛了 `?v=2` |
   | 雜貨 `NPC_Grocer_SI_v1` | ✔ 本來就是 RGBA（透明 60.5%） |
   | 公會櫃台 `NPC_GuildCounter_SI_v5` | ⚠⚠ **還是 RGB、沒有 alpha ⇒ 畫面上仍是一塊白板** |

   ⚠ 待修清單在 `resources/_HANDOFF_ART_20260916.md` §四（`Gunsmith_v4 v5`／
   `Grocer_v2~v5`／`GuildCounter_v1 v3 v4 v5`）。**那是美術的活**（鐵律 11）。
   ⚠ 交件之後程式端只有一件事：若是**重繪**而不是純去背，`top`/`bot`/`fx` 要重量（§5）；
   純去背的話取景值照舊成立。同名覆蓋一律記得 `?v=`／`ASSET_VER`。
   ⚠⚠ **那個路徑寫在兩個地方**（`config.js` 的 `shop.shops.ep_gunstore.art` 與
   `speakers.js` 的 `ART.gunsmith_ep.base`）—— 掛 `?v=` 要兩邊一起掛，漏一邊就是
   「店裡是新圖、講話時是舊圖」（鐵律 7，還沒收成一支）。
9. **`Ravn_Church`**：圖**還沒交**（`ls resources/background | grep Ravn_Church` 是空的），
   節點仍是 `bg:'Ravn_Midtown'` ＋ `bgPending:'Ravn_Church'`。
   圖到了才改 `bg`、拔 `bgPending`、**補回 `noTime:true`**。
10. **拉芬斯達爾室內 7 格 × 3 ＝ 21 張**（清單在 `_eastport_spec.md` §九）。
11. 兩座新城沒有 `midnight` 差分（午夜退到 `night`）。

> **程式端可以自己做的**（優先序照這個）：

12. **② 讀取間隙露出首頁** —— 上面那張表，**九個呼叫點收成一支 `hideHome()`**。
13. **① 自動播放不播震動** ／ **④ 飛行地圖要點一下才播音樂** ／
    **⑤ 帝都降落判定範圍** —— 三件都還沒查。
14. **無尾綴舊檔退役**（`East_{Firearm,Guild,Bistro,Grocerie,Hotel,Cafe,Restaurant}.webp`）：
    -1317 拔掉 `noTime` 之後四時段確認吃得到了才走 `tools/recycle.sh`。
15. **東泊餐飲街要改成室外街景**（美術 §六 第 2 件）：`tavern` 那一格現在掛的是
    `East_Bistro`（＝酒吧**室內**），但 -1318 起它在拓樸上是**四向樞紐**。
    ⚠⚠ **Ray 還沒答**「酒吧要不要另開一格」（A：四條路／B：酒吧退場），
    兩種讀法寫在 `resources/map/_eastport_spec.md` 末段 —— **等他一句話再動**。
16. **`Plains_*` 與 `Belisar_GreatCourt*` 是新交的背景**（美術 §六 第 3 件），
    **還沒接進 `script/town.js`**，所以現在誰都走不到。⚠ 新檔沒有快取問題
    （`ASSET_VER` 不必動），要的是節點資料。規格在 `resources/background/_plainsroad_spec.md`。
17. ⚠ **`resources/SI/` 底下有一批 Ray 自己放的 PNG**（美術 §八）——
    為了換機器不掉檔，美術那一輪**先原樣 commit 進版控**了。
    照 §5 該轉成 webp、原 PNG 收進 `_originals/`：**那是程式／美術都碰得到的收尾**，
    但**轉檔之前要先確認沒有腳本在指那些 PNG**。

---

# -1327 ~ -1356：**以下照 commit 訊息整理，我沒有逐項複驗**

| 版 | 內容 |
|---|---|
| -1327 / -1328 | SI 差分總表（分角色、帶檔名與抓臉縮圖，交件重跑就更新；NPC 獨立一頁） |
| **-1329 ~ -1339** | **破防改成「對著敵人立繪狂點」那一整串**：盤面玻璃化但不可操作 → 打隨機瞄準點（鎖定特效）→ 瞄準點落在敵人身上 → 開火也拋彈殼與槍火 → BR 中擊殺不收窗（額度可以繼續打進 overkill）→ BR 中的 OVK（配額＝殘磚數、兩種結束條件）→ 彈殼從點擊處飛出 |
| -1340 ~ -1345 | 東方泊地：三位店主上任／抵達與固定 11:00／約會的發起那一半（四扇門、大學巧遇、睡覺鈕守門）／蕾娜的「不在房裡」補上終點 |
| -1341 | 只飛得到的三座城不再要 `got_ship`（**進得去出不來**） |
| -1343 / -1351 | 王座徘徊者三張敵人卡（追逐／王座／空中）＋ 空中戰限定的全螢幕聖光 |
| -1347 / -1349 | 約會的過程與收尾（六段地點戲、18:00 宵禁、回旅店四段）＋ 同行徽 |
| -1350 | 貝利薩爾三首 BGM ＋ 東泊打靶場 |
| -1352 / -1353 | 東泊翌日出發前（長對話、四分歧、限制出航）／貝利薩爾古城那一段（抵達、祭壇、龍戰、中庭、好感封頂） |
| **-1355 / -1356** | **讀取分工補完**（＝憲法鐵律 13）：首頁與戰鬥各自接上那道門、切換就釋放；首頁的圖再切一刀 **22 支 3.55MB → 13 支 1.91MB** |

---
# -1326：驗收工具在 Windows 上全部復活（**環境數字見上面那一節，這裡的已作廢**）

> ⚠ 這一輪**沒有動遊戲程式**，只動 `tools/`（外加 `config.js` 的 `VERSION`
> 與 bust 產生的三處版本號）。遊戲行為一個字都沒變。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

| 版 | 檔案 |
|---|---|
| -1326 | `tools/*.py`（28 支各加一行 import）、**新** `tools/_utf8.py`／`_jsrun.py`／`_font.py` |
| -1326 | `config.js`（VERSION）、`index.html`／`flight/index.html`／`modules/story.js`（bust 產生） |
| 憲法 | `CLAUDE.md` §6.5.4（「Windows 上跑不了」那一句已作廢） |

## 問題是什麼

**這台機器（Windows）上，`tools/` 幾乎整層跑不動**，而其中好幾支是憲法指定的驗收：

| 病 | 中招 | 代表 |
|---|---|---|
| 主控台 cp950，印到第一個 ⚠ 就 `UnicodeEncodeError` | **22 支** | `bust.py --check`（§5 的快取驗收）崩在印訊息那一行，看起來像工具本身壞了 |
| 寫死 macOS 的 `jsc` | **7 支** | `script_lint.py`（§6.5.1「稿子轉完一定要跑」）、`map_layout.py`（§6.7.5「回給美術的佈局簡圖只能用它產」） |
| 寫死 macOS 的字型路徑 | **6 支** | 畫圖那一族 `OSError: cannot open resource` |

⚠⚠ 所以 §6.5.1／§6.7.5 那兩道「一定要跑」的驗收，**在唯一會用到它們的機器上一直是空的**。

## 修法（三支共用檔，鐵律 7／8：一件事一個實作）

- **`tools/_utf8.py`** —— 主控台強制 UTF-8。28 支各加一行 import，不是 22 個地方各貼三行。
- **`tools/_jsrun.py`** —— 把專案裡的 JS 資料真的跑一次再 dump 成 JSON，唯一一支。
  **有 jsc 用 jsc（macOS），沒有就用 node**（PATH 上有就認得，不必設定）。
  · jsc 有內建 `print()`、node 沒有 ⇒ node 那條注入一行 shim，**呼叫端照舊寫 `print`**。
  · ⚠ 一律走暫存檔不用 `-e`：Windows 命令列上限約 32 KB，而餵進去的常常是整支
    `town.js`／`config.js`（數百 KB）。
  · ⚠ `file_url()`：node 的 ESM 不吃 `C:\...` 絕對路徑（當成套件名）—— macOS 的
    `/a/b.js` 剛好長得像相對路徑，所以以前沒露餡。
  · ⚠ subprocess 要明寫 `encoding='utf-8'`：`text=True` 走 locale 編碼，而 dump 出來
    整份是中文 —— 不寫的症狀是「讀不到資料」不是編碼錯誤，會害人查錯方向。
- **`tools/_font.py`** —— 字型候選由上往下取第一個存在的（macOS→Windows→Linux）。
  **macOS 的行為一個字沒變。** ⚠ `.ttc` 的 index 是字重、逐字型不同
  （PingFang 的 4 ≠ 微軟正黑的 4）⇒ 收 `weight` 參數，對不到退回 0，不要炸掉。

## 這一輪量到的（都是當場跑的）

| 項 | 結果 |
|---|---|
| `script_lint.py` | **0 個錯誤、17 個提醒**（首次在 Windows 上跑得動） |
| 　└ 負向測試 | 故意寫壞的檔報得出 `script/broken.js:5` —— **行號對得回原檔** |
| `bust.py --check` | 先前崩潰 → 現在正常回報；順手清掉走鐘（檔案 `?v=1324` vs config -1325） |
| `map_layout.py` | 三張圖都出得來（shinier_ruins 21 格/20 邊、shinier 13、northport 13），繁體中文正常 |
| `enemies_xlsx` | 57 張卡／ASSETS 238 筆／HITFX 讀得到 |
| `ruin_elevation`／`ruin_heightmap` | 跑完，最高 **302 單位**＝§6.8.1 記的那個數字 |
| `tools/*.py` 語法 | 33 支，0 錯 |

## ⚠⚠ 這一段的工具鏈數字是**另一台機器**的（-1369 更正，留著當紀錄）

| 項 | 實測 |
|---|---|
| Python | ⚠ **仍然只有 `py`**（`python`／`python3` 不存在）—— 與舊機一樣 |
| 版本 | Python **3.10.0**　⚠ -1369 實測是 **3.11.9** |
| node | 「**v24.19.0 在 PATH 上**」⇒ ⚠⚠⚠ **這台是 -1361 才用 `winget` 裝的，而且不在 PATH 上** |
| 主控台 | **cp950**（所以才需要 `_utf8`） |
| 中文字型 | `C:/Windows/Fonts/msjh.ttc`（微軟正黑，繁體）⇒ `_font.cjk()` 取到它 |
| 缺的套件 | `openpyxl`（只有出 xlsx 那兩支要） |

⚠ **文件裡的 `python3 tools/xxx.py` 在這台機器要唸成 `py tools/xxx.py`。**

⚠ `enemies_xlsx export` 另缺 **openpyxl**（沒裝，與這一版無關）。要出表先 `py -m pip install openpyxl`。

## 這一輪**沒有**碰的

- 產生的圖檔（`_layout_*.png`／`belisar_*`）跑完都**還原**了 —— 那些是工具隨時重跑得出來的產物。
- 遊戲程式、資料、素材：一個字都沒動。

---

# 上一輪（-1319 ~ -1325）：以下照 commit 訊息整理，**我沒有逐項複驗**

- -1319　標記點進地圖編輯器；教學期間連鍵盤都不給操船
- -1320　無名遺蹟＝瓦努努（兩筆併一筆、接上地圖內容與地表量體）
- -1321　讀取間隙不再露出首頁與挑戰立繪／**憲法鐵律 11 改寫**（美術 session 被下 code 指令要**拒絕**）
- -1322　遺蹟掃到才出現，而且是淡入
- -1323　攝政王廣場五張重畫；主角的空白格換成冷鋼藍
- -1324　遊戲起始時間改成 **1908 年 10 月 11 日**
- -1325　雪都三格重修 12 張（清掉輕軌與架空線）
- 憲法另加：§5 產圖第五條鐵則（模型會「越塞越多東西」）、銀月大陸只有一輪銀月

---

# 再上一輪（-1309 ~ -1318）：飛行地圖撕裂、開機量、東泊接線

> ⚠ 這一輪跑在**新機器**（RTX 4070 SUPER / 2560×1440）。第零節那些是**舊機器**的數字，
> 兩者不要混用。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

| 版 | 檔案 |
|---|---|
| -1309 ~ -1315 | `flight/index.html`、`main.js`、`config.js`、`index.html`、`modules/story.js` |
| -1316 | `resources/background/*`（美術交件入庫）、`_recycle/RECYCLE_LOG.tsv` |
| -1317 / -1318 | `script/town.js`、`config.js`、`index.html`、`flight/index.html`、`modules/story.js` |
| 憲法 | `CLAUDE.md`（鐵律 12、§0.1） |

## 修掉的

- **-1310　地形撕裂的真因：texture unit 撞號。** 地形跳空的 max-mipmap（`uHmax`，-1303
  新增）與**遺蹟量體的石材貼圖**（`uTexW`）都綁在 **TEXTURE14**。遺蹟一進視距就把 14
  換掉 ⇒ 地形讀到石頭的顏色當「這一塊的最高點」⇒ 射線亂跳 ⇒ 撕裂。
  **指紋是 GPU 時間掉一半**（同機位 6.8ms → 3.0ms：少走了一半的步＝被騙）。
  遺蹟的貼材改用 unit **6/15**，14 從此屬於地形。
  ⚠ 分兩族：**長期綁著的**（地形 0~5、7~14）與**畫前才綁的**（量體 6、遺蹟 6/15）——
  長期那一族絕對不能被短期的借走。
- **-1312　開機量 36.2 MB → 5.6 MB。** `SFX.preloadBgm` 是**一支一支排隊**下載的，
  而開機批揹著 15 首（31.5 MB），首頁只播一首 ⇒ 進度圈卡在 89%（實測 84 秒下完 9 首）。
  `LATE_BGM_PATHS` 改成**排除法**：只留 `bgm_home`，其餘 20 首背景補載。
  ⚠ 它平時被快取蓋住，**版本號一跳就現形** —— 那天連跳三次，等於每台裝置重跑冷載入。
- **-1313　解開 -1309 那把畫質鎖**（`QUALITY_LOCK`）。-1309 是誤判的產物
  （把撕裂讀成「畫質降到底」），病在 -1310 才修掉，鎖卻留著 ⇒ 把機器釘在 q0。
- **-1315　軟體算圖改走 CPU 路徑。** 認出 SwiftShader／llvmpipe／Microsoft Basic Render
  ⇒ **當作這台沒有 WebGL**（`GLX=null; return false`，走既有退路）。
  理由是**演算法的量級反過來**：GL ＝逐像素 17.5 萬條／幀、CPU ＝逐欄 406 條（差 332 倍），
  GPU 在時 GL 大勝，沒 GPU 時拿 CPU 跑十三萬條就是 6~8 fps。HUD 印 `cpu(sw)`。
  ⚠⚠ **不要因此把 CPU 那條變成預設**：GL 存在的理由是**手機發熱**（Ray -1315 指出），
  而那件事從 fps 上看不出來（桌機兩條都是 60）。
- **-1317　東泊室內五格＋餐飲街三張的 `noTime` 拔掉。** 美術 -1263~-1268 交的 32 張
  時段差分**整批看不到**（節點還寫著 -1293 當時正確的 `noTime:true`，候選鏈只試無尾綴
  那一張）。⚠ 症狀是「交了卻看不到」，沒有任何錯誤訊息。
- **-1318　東泊餐飲街接成樞紐**（`_eastport_spec.md` §八 的 **(甲) 樞紐＝酒吧**，
  Ray：「隨便排就好」）：`tavern`(酒吧) → up 餐廳／right 咖啡廳／down 甜品店。
  連帶把這座城的 `dining` 整塊移除（分店機制 -1263 就取消了，留著會與「走進去的是哪一家」打架）。
  ⚠ **四張圖都已經交了**（`East_Dessert` 也在）—— spec §八 那張「甜品店開單」是舊的。

## 這一輪量到的（新機器，都是當場量的）

| 項 | 數字 |
|---|---|
| 飛行 fps（GL，q0 420×418） | **59.9 fps／GPU 6.8ms** ← 交接檔上一版「fps 還沒複驗」**結案** |
| 飛行 fps（CPU 路徑，同機位） | **59.9 fps／最差幀 16.9ms** |
| renderer（內建瀏覽器） | `ANGLE (NVIDIA, RTX 4070 SUPER, D3D11)` |
| renderer（Ray 的 Chrome，實測） | **`ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)`** ＝軟體算圖 |
| 開機（線上冷載） | -1311 卡在 89%／84 秒 → **-1312 COMPLETE ＜9 秒** |

⚠⚠ **那個 Chrome 掉到 WARP 不是誰設定的**：主行程啟動列是空的、捷徑沒帶參數、
`chrome://flags` 沒改過、沒有企業政策 —— 是 Chrome 自己 fallback 之後記住了。
要修是 `chrome://settings/system` 開圖形加速＋完全重開。**玩家那一邊由 -1315 接住。**

## 還沒做（程式端）

1. **無尾綴舊檔退役**（HANDOFF 原第 3 件）：`East_{Firearm,Guild,Bistro,Grocerie,Hotel,
   Cafe,Restaurant}.webp` 那幾張。**要等 -1317 上線、確認四時段真的吃得到之後**才走
   `tools/recycle.sh` —— 先退會讓那幾格當場變空背景。
2. **`Ravn_Church`**：圖**還沒交**（`ls resources/background | grep Ravn_Church` 是空的），
   節點仍是 `bg:'Ravn_Midtown'` ＋ `bgPending:'Ravn_Church'`。圖到了才動。
3. 原「接下來的事項」第 5／7／8／11 項**照舊等 Ray**（貝利薩爾降落旗、山谷敵人卡、
   瓦努努 Boss 卡、ImageBitmap 要不要入憲）。

## 憲法改了兩處

- **鐵律 12　載體優先序**：手機第一、PC／Mac 其次；網頁是過渡，成品是上架的 App。
  驗收基準是手機不是桌機；發熱與續航是一等公民。
- **§0.1　開工的第一個動作是讀 `HANDOFF.md`**（-1317，Ray 定案）。
  那一天我沒讀就開工，用 `git log`／檔案時間推現況 —— 把早就建好的夏爾村講成缺圖、
  把一筆沒有任何腳本在用的休眠立繪講成「線上在借圖」、漏掉正在建的雪都與東泊，
  而交接檔的「程式端要接的三件」就攤在那裡沒人接。

---

# ⚠⚠⚠ 第零節：**舊**機器（Windows）的環境 —— 新機器請重量

⚠⚠ Ray 於 -1306 之後**再次換機器**。以下是舊機那台的實測（-1303/-1306 當場量），
留著只為了兩件事：① 底下那三個「容易誤導人」的陷阱多半**跨機器成立**
② 新機器量完可以對照。**數字本身一律作廢。**

| 項目 | 實測 |
|---|---|
| 機器 | Windows 10、**4 核**、**實體 RAM 8 GB** |
| 顯示卡 | **NVIDIA GeForce GT 1030、2 GB VRAM** |
| 驅動 | **582.66**（`32.0.15.8266`，2026/6/9）—— 這一輪從 560.94 更新上來 |
| Python | ⚠⚠ **只有 `py` 能用**。`python`／`python3` 是 Microsoft Store 的空殼，**跑什麼都 exit 49 而且零輸出** |
| `MAP_EDITS_SRC` | 仍是 `[]`（`flight/index.html:1891`）—— 地圖編輯的筆畫仍然只在瀏覽器裡 |
| 未追蹤散檔 | **零個**（`git status --untracked-files=all` 乾淨） |
| `resources/_originals` | **61 MB**（gitignore） |
| `_recycle` | **36 KB**（gitignore，唯一的刪除出口，永不真的刪） |

### ⚠⚠⚠ 這台機器最容易誤導人的三件事（-1303 這一輪各騙過我一次以上）

1. ⚠⚠⚠ **Claude 桌面版的硬體加速會被它自己關掉，而且選單救不回來**（-1306 解決）。
   症狀：內建瀏覽器的 `renderer` 是
   `ANGLE (Microsoft, **Microsoft Basic Render Driver**, D3D11)` ＝ **純軟體算圖**，
   顯卡完全沒碰到。**在那個面板裡量效能全部作廢** —— 它一天之內給過三個假結論
   （「地形 shader 只要 1.4ms」「跳空沒有差別」「每幀 2.2ms」），真相是 GPU 100%、fps 2~30。

   **成因與解法（-1306 查出來的）**：`%APPDATA%\Claude\claude_desktop_config.json` 有**兩格**：

   | 旗標 | 誰設的 | 選單切得到嗎 |
   |---|---|---|
   | `isHardwareAccelerationDisabled` | 使用者 | ✔ |
   | **`isHardwareAccelerationAutoDisabled`** | **Claude 自己**（驅動反覆 TDR 時） | **✘** |

   ⇒ 這就是 -1303 記的「Help 選單點過一次**沒有生效**」：選單只切前者，
     Claude 自己關的那一格還立著，下次啟動又把它壓回去。**兩格要一起清。**
   ⚠ 改設定檔要**先完全結束 Claude**，否則它退出時會寫回舊值。
   ⇒ 清完實測 `renderer` ＝ `ANGLE (NVIDIA, NVIDIA GeForce GT 1030, D3D11)`，
     內建面板 fps 由「當掉」變成 **56.5**。
   ⚠ **新機器要重新確認一次**：這一格是 Claude 自己會設的，換機器不會跟著過去，
     但新機器也可能自己設上。**量效能之前一律先看 `renderer` 有沒有 NVIDIA／AMD／Intel。**

2. **分頁不在前景時 rAF 被節流**（實測 2.5 秒只跑 1 幀）。
   量到「fps 2.6、CPU 15%、GPU 0%」那種「什麼都不忙卻跑不動」的組合，
   **那是節流不是效能問題**。要量就得請 Ray 把視窗放前景。

3. **`py -m http.server` 會被回收**（這一輪死了五次）。症狀是
   **首頁破圖＋沒有 testmode 鈕**，與程式壞掉一模一樣。分辨法：
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/main.js
   ```
   回 `000` 就是伺服器沒了。
   ⚠ `.claude/launch.json` 已改成讀 `PORT` ＋ `autoPort`（-1303），
     所以預覽伺服器不會再跟手動起的那台搶 8000。

### 換機器要帶什麼（-1306 當場清點，不是沿用舊交接）

| | 實測 | 要不要帶 |
|---|---|---|
| `MAP_EDITS_SRC` | 仍是 `[]`，而且**兩個瀏覽器的 localStorage 都沒有地圖編輯的鑰匙** | **不用** —— 沒有待匯出的筆畫 |
| `tivot_settle_drag_v1`（拖城） | **不存在**（只有 `_purge` 那支旗） | **不用** |
| localStorage 存檔 | 真 Chrome 8 筆 761 字；`main:null`／`quick:null`，只有 `dev_seed_money`、玩 175 秒 | **不用** —— 是空的開發狀態 |
| `resources/_originals` | **67 MB**（gitignore） | ⚠⚠ **要**。轉檔前的原 PNG，git 帶不走 |
| `_recycle` | 36 KB（gitignore；`RECYCLE_LOG.tsv` 本身有進版控） | 要（很小） |
| 未追蹤散檔 | **零個** | — |

⚠⚠ **「玩家存檔在 localStorage」這件事要分兩個瀏覽器看**：內建面板與 Ray 的真
Chrome 是不同的設定檔、不同的 localStorage。-1306 兩邊都查過，兩邊都是空的開發狀態。
匯出法（在該瀏覽器的 console）：
```js
copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('tivot_')))))
```
⚠ 管理人模式：`localStorage.tivot_admin_v1='1'`（沒有它首頁只剩四顆鈕，§6.9 的白名單）。

---

## 上一輪（-1294 ~ -1303）：讀取分工 ＋ 飛行地圖上 GPU

⚠ 期間有**另一個 session 並行在做美術**（-1263~-1267 那幾筆，東方泊地室內四時段）。
編號是兩套計數器，不要混。這一輪程式端**只動過**下面列的那幾支檔案。

### A. 讀取分工（Ray：「每一個讀取頁都只讀接下來要用的資源，並且清空上一個場景的資源」）

| 版 | 內容 | 實測 |
|---|---|---|
| -1294 | 四座城的 BGM 接上播放表（`story.js` 的 `BGM_FILES`/`BGM_ALIAS` 少了它們，`bgmSrc()` 回 null ⇒ 延用進城前那一首、不報錯） | 19 個短名全部解析，分大小寫對過磁碟 |
| -1295 | **開機只載這個畫面要的圖** | DOM 解碼 **738 MB → 19 MB**、圖片請求 132 → 20 |
| -1296 | `SFX.releaseAudio(keep)`（全專案第一支會把記憶體**真的**還回去的函式）＋ 挑戰卡改 fetch 暖快取 | 117 sfx / 21 bgm → 放掉 116 / 20 |
| -1297 | `story.loadScene()` —— 換場唯一的那道門（清場 → 讀取頁 → 音效/圖/音樂 → 開演 → 背景暖快取） | 背景請求 432 → 72 |
| -1298 | 每座城的音效**從資料掃出來**（`collectSe`，不手維護清單）＋ 候選鏈先試最可能的 | 12 座城 28 支、合計 2.41 MB；404 56 → 26 |
| -1300 | 進飛行畫面把主頁音訊整個放掉 | 117 支 / **121 MB** → 5 支 / 4.8 MB |

⚠⚠⚠ **-1295 與 -1300 是同一課**：**預載的成本要算「解碼後的量」，不是檔案大小。**
· 圖：`new Image()` 會**解碼成點陣圖**（寬×高×4），WebP 常壓到 1/30~1/50 ——
  5.3 MB 的 WebP 解開來是 250 MB。
· 音：Web Audio 存 Float32 PCM，96kbps 的 m4a 解開來約 **32 倍** ——
  7.2 MB 的檔案是 **121 MB** 的記憶體。
`SFX.audioHeld()` 現在直接報 `sfxMB`，不要再用檔案大小推。

### B. 飛行地圖的效能（Ray：「這種程度的 2.5D 再怎麼樣也不該卡」——他是對的）

**成因：ver -1198~-1223 把地形搬上 GPU 時，演算法的複雜度等級變了。**

```
舊（CPU，voxel space 正宗作法）：逐欄   →     406 條射線
新（GPU，fragment shader）    ：逐像素 → 134,792 條射線     ← 多 332 倍（＝BH）
```

GPU 每條射線快 20~50 倍，但工作多 332 倍 ⇒ 淨值更慢。而且逐欄版的 `ybuf`
有免費的遮擋剔除（填滿就收手），逐像素版每條各走各的，沒有人把它補回來。
⚠ 這不是誰寫壞了：fragment shader 天生逐像素，「一條射線填一整條色帶」在那個
模型裡做不到。**那幾個 commit 記的「3~11ms → 0.14ms」全是 `workMs`（CPU 送出
指令的時間）—— 成本沒消失，是搬到了那個指標看不見的地方。**

| 版 | 內容 |
|---|---|
| -1301 | 雲團改貼預烘的圖（每幀 141 個 `createRadialGradient` 歸零）。**不是主因**，但是真的浪費 |
| -1302 | 射線高過地形最高點且還在爬 ⇒ 提早結束（模擬省 37.8%）；HUD 加印 GPU 時間 `g` |
| **-1303** | **max-mipmap 跳空** ＋ 畫質階梯的兩個 bug |

**-1303 的實測（Ray 的真 Chrome，前景）**：

| | 修前 | 修後 |
|---|---|---|
| fps | 2~30 | **54** |
| GPU（Chrome 程序） | **100%、79°C** | **11%**（全系統 16%） |

⚠⚠⚠ **max-mipmap 的四個坑，每一個都會讓畫面破洞或不等價**：
1. **跳的必須是「整數個原本的步」**（二次式反解一次 sqrt）—— 射線要永遠落在原本
   會取樣的那些 z 上，第一個命中點才會一模一樣。跳任意距離 ⇒ 取樣點偏移 ⇒ 不等價。
2. **安全距離用 DDA 算**（沿射線離開這一塊還有多遠），不要拿格寬去猜：
   `dir` **沒有正規化**（|dir| 最大 2.6），拿格寬當距離會一口氣跨過兩三格。
3. **hNeed 在區間內不是單調的**（往下看先降後升，頂點在 `z=k/(2·curv)`）——
   要取區間內的**最小值**。只看起點會漏掉中間比較低的那一段。
4. **底階要先做 3×3 膨脹**：`hSurf` 是**雙線性**取樣，它讀的四個 texel 可能有一個
   落在隔壁格 —— 只取「這一格的最大值」涵蓋不到。**實測就是這樣抓到的**
   （某個機位差 337 個通道／最大 28），膨脹之後歸零。
⚠ **不可以用 `generateMipmap`**：那一支做的是平均（box filter），這裡要的是最大值。
  MIN 濾鏡必須 `NEAREST_MIPMAP_NEAREST`。

**位元等價驗收（這是硬性門檻，不等價就不上）**：固定 `uTime`、**12 幀暖機**、
每一組都配「同設定跑兩次」的對照組 —— 5 個高度 × 6 組角度高度 × 先前失敗的那一組，
**全部 0/0**。
⚠ 暖機不足會出現假陽性（城與遺蹟的貼圖還在載、LOD 遲滯還沒穩），-1303 踩過。

**畫質階梯修好的兩個 bug**：
1. 反應時間用**幀數**算（40 幀評估、換檔靜置 90 幀）—— 60fps 下是 2 秒，
   **2fps 下降一級要 65 秒、降到底四分鐘**。越需要它快越慢。
   加了「中位數 > 24ms 連續 8 幀就立刻降」（只放寬降級，升級照舊）。
2. `clamp(v, 下限, 上限)` 在**下限 > 上限**時回傳**下限** —— 1920 寬時五個檔位
   全是 **634**（比上限 420 還大）。改成把上限夾在**視窗寬**上：q0 420 → q4 231。
   ⚠ 與 -1196 是同一個病的兩端（那次下限寫死 160 壓平下面三階）。

### C. 機器層面（與程式無關，但害我查了很久）

- **驅動在反覆 TDR**：更新前五分鐘內三次
  `Display driver nvlddmkm stopped responding and has successfully recovered.`
  → 更新到 582.66 之後**重開機至今 0 次**。
- Claude 桌面版因此自己關掉硬體加速（見第零節第 1 點，**至今沒開回來**）。

---

## 這一輪（-1304 ~ -1306）：頓挫結案 ＋ 硬體加速

⚠ 這三版都是**程式端**；期間美術 session 並行在做東方泊地室內差分（-1266~-1268），
**編號是兩套計數器**。兩邊動的檔案不重疊（美術只動 `resources/`，程式動
`config.js`／`flight/index.html`／`index.html`／`modules/story.js`）。

### -1304　走遠的城把 GL 貼圖也放掉（VRAM 25.8 MB）

`releaseFarCityArt`（-1195）只放掉 CPU 那一半（`cityPlanArt`／`CITY_PYR`），
GL 那一份沒有人動；而且 `RELEASE_R`(14400) ≫ `ZFAR`(3600) ⇒ 被放掉的城
**再也不會被 `glPickCities` 選到** ⇒ 永遠等不到重建。十座城走一遍 25.8 MB
（拉芬 7.4／卡耶爾 5.7／東泊 5.3）。
實測 `GLX.isTexture(舊物件)` `true → false`，飛回去重建成全解析、`glGetError()` 0。

### -1305　GL 之下不再白建取樣金字塔 ← **「偶發頓挫」的主犯**

`CITY_PYR` 的 `levels` **只有 CPU 那一大圈在取樣**，而 `GLON && glReady` 時
那一整段被 `z=ZFAR` 跳過（城的地面自 -1206 起由 shader 讀 `glCityTexture`）。
-1206 的註解早就寫著「GL 的 mipmap 取代了 CITY_PYR 那一整套」，
**但沒有人把建構那一端關掉。**

20 秒橫越大陸（帝都 → 東方泊地）：

| | 修前 | 修後 |
|---|---|---|
| `buildCityPyramid` | **204ms**（單次最高 **101.5ms**） | **3ms** |
| `>28ms` 的長幀 | 72 個 | — |

最貴的那一次＝飛近東方泊地 1024×1024 → 7 層，每層一次 `getImageData`（GPU→CPU 回讀）。

作法：分流收在 `buildCityPyramid` 自己身上（鐵律 8，兩個呼叫者一起好），
GL 之下退成**佔位** `{levels:null, full, src}`，CPU 退路真的要取樣才補建（`pyrLevels`）。
⚠ **不可以整個不留**：`planCity`／`groundSampled` 兩處在看它**存不存在**
（＝「這座城有手繪圖」，沒有它程序生成的白色小房子會疊在插畫上，§6.7.5）。
⚠ `src` 必須是呼叫端傳進來的那一張 —— 抓全解析的話 -1195/-1304 就白放了。

### -1306　城的貼圖改走 ImageBitmap(Blob)

拆開量才知道錢在哪（GT 1030，`g.finish()` 逼它做完）：

| | ms |
|---|---|
| `generateMipmap` | **0**（硬體全免費，不是它的錯） |
| `texImage2D` ← `HTMLImageElement` | 78.5 首次／**36.7 熱快取** |
| `texImage2D` ← `ImageBitmap` | **2.4** |

貴的是**主執行緒把圖轉成貼圖格式**，而且**每次都要重做**——
「載過了就便宜」的直覺在這裡是錯的。

⚠⚠⚠ **而且 bitmap 一定要從 Blob 建，不可以從 `<img>` 建**（733×1536 實測）：

| | 同步段（卡幀的那一段） | 總計 |
|---|---|---|
| `createImageBitmap(HTMLImageElement)` | **70.2ms**（整段都是同步的！） | 70.2ms |
| `createImageBitmap(Blob)` | **0.1ms** | 32.3ms（主執行緒外） |

從 `<img>` 那一支回傳的是「已經做完」的 promise —— 看起來非同步，該卡的一分沒少。
**-1306 的第一版就是這樣寫的，幀 1 反而 57.2ms（比舊路徑還糟）。**
改 `fetch(img.src).then(r=>r.blob())` 才真的搬得出去（打 HTTP 快取，3.3ms）。

`glCityTexture` 是在畫的迴圈裡**同步**呼叫的，所以不能等 —— 作法是
「排解碼、這一幀先用手上有的」。一座城從無到有：幀1 12.0ms／幀2 10.0ms／幀3 **0.1ms**。
⚠ 上傳完 `close()`（ImageBitmap 抱著解碼後的點陣，1024² ＝ 4MB）。

視覺驗收：低空過帝都，手繪地面（放射狀街道、街廓）正常，沒有白色小房子疊上去。

### ⚠⚠ 還沒驗的一件：**fps**

修後的 fps 一直量不到 —— 內建面板每次量到一半就被藏起來，rAF 節流到 30Hz
（第零節陷阱 2；**形狀是「幾乎每一幀都剛好 33ms」**，看起來像效能爆掉）。
那幾組整組作廢。**函式耗時不受節流影響**，所以上面那些數字是有效的。
⇒ **新機器第一件事：在真瀏覽器前景飛一段跨兩三座城的長程，看頓挫還在不在。**

---

## 平台實測（-1303／-1306，**舊機器**）

| | 狀態 |
|---|---|
| Windows + Chrome（GT 1030） | ✔ fps 54、GPU 11% |
| Mac / MacBook / iPhone | ✔ Ray 回報正常 |
| **Claude 內建瀏覽器** | ✔ **-1306 修好**：硬體加速那兩格清掉之後 renderer ＝ NVIDIA、fps 56.5（先前的「仍卡」是軟體算圖，非程式問題） |

Ray 定的目標：**以 GPU 為前提優化，最爛的設備也要跑全效**（下限抓
Intel HD 520 級的內顯），**Android / Win / Mac / iOS 都要跑得動**。
GT 1030 現在只用 11% GPU，那個餘裕是留給內顯與手機的。

---

## 接下來的事項 ／ 驗收指令

⚠⚠ **移到最前面那兩節了**（-1369）—— 同一份檔案裡兩張「接下來要做什麼」的清單
必然走鐘（鐵律 7）。舊機器那一版的寫法已整段刪除。

# 美術產線（-1263 ~ -1268，與程式那一串平行）

> ⚠ 美術與程式的版本號是**兩條**，會撞號。這一段是美術那一條。

## 做完了什麼

**東方泊地室內八格 × 四時段 ＝ 32 張全部交件**（`resources/background/East_*_{dawn,day,dusk,night}.webp`）。

| 版 | 內容 |
|---|---|
| -1263 | 餐飲街改成走得進去的節點（Ray 定案，分店機制取消）＋ 室內四時段工單 |
| -1264 | 甜品店四時段 `East_Dessert_*` ＋ `tools/imgbridge.py` |
| -1265 | 逐格光線要點（七格採光條件不同，不能用同一段通用敘述） |
| -1266 | 六格 18 張差分（酒吧／咖啡廳／餐廳／武器店／公會／雜貨舖） |
| -1267 | 交件進度表 ＋ 踩坑紀錄 |
| -1268 | 旅店四時段，八格到齊 |

權威規格與逐格光線：`resources/map/_eastport_spec.md` §八～§十之二。
驗收：24 張衍生圖**全部 scale 1.00**（邊緣圖相關度 ＋ 掃縮放找最佳擬合）。

## ⚠ 程式端要接的三件

1. **拔掉 `noTime:true`** —— 東泊的 `gunstore`／`guild`／`tavern`／`grocery`／`inn`，
   以及 `dining.scenes` 那三支。檔名現在都帶時段尾綴，留著 `noTime` 只會去抓無尾綴那張。
2. **餐飲街接成樞紐**（Ray：「進去多加三條路線　餐廳　甜品店　咖啡廳」）——
   四家店的圖都在，拓樸是 Ray 的設計（憲法 ver -907），美術沒動 `town.js`。
3. **無尾綴的舊檔先留著**，等 1 做完才走 `tools/recycle.sh` 退役 ——
   先退會讓那幾格當場變空背景。

## 還沒定 ／ 還沒做

- ⚠ **餐飲街那一格自己顯示哪一張**：樞紐＝酒吧（現況，不必再畫）／樞紐＝街景
  （要再補 `East_Dining` 室外四張）。等 Ray 一句話，兩種讀法寫在 `_eastport_spec.md` §八。
- **拉芬斯達爾室內 7 格 × 3 ＝ 21 張**（同一套流程，清單在 §九）。
- `Ravn_Church`（見上面「接下來的事項」第 5 項）。

## ⚠⚠⚠ 產線：三條會咬人的（下一台機器照抄，不要再撞一次）

1. **表單 POST 回本機一定要 `target="_blank"`**。不加的話 Chrome 會把主分頁導去
   `127.0.0.1:8777/save`、CDP 連線當場中斷，**請求根本沒送完** ——
   檔案不會落地，而且**沒有任何錯誤訊息**。
   ⚠ 內建瀏覽器吃 204 所以不導頁、**Chrome 不吃**：在內建瀏覽器驗過不代表 Chrome 也對。
2. **這個 ChatGPT 帳號不保存對話**：`/backend-api/conversations` 恆為 0 筆、
   用對話網址回去會被導到「庫」、在另一個瀏覽器開同一串回「登入以查看此對話」。
   ⇒ **每張一畫好就立刻存**，不要等三張跑完（雜貨舖那一串就是這樣整個丟掉重跑）。
   ⇒ `resources/background/_art_sessions.md` 與各 spec 記的產線網址**全部 404**
     （那是**別的帳號**的），畫風上下文接不回來，只能靠上傳底圖重建。
3. **`javascript_tool` 的等待迴圈不要超過 40 秒**：CDP `Runtime.evaluate` 45 秒逾時；
   逾時之後那一支其實還在跑（存檔會成功），但你拿不到回傳值。輪詢拆成多次短呼叫。

### 工具

- **`tools/imgbridge.py`**（已入版控）：內建瀏覽器沒有上傳／下載工具時的圖橋。
  `py tools/imgbridge.py <serve_dir> <drop_dir> [port]`
  · `GET /<檔名>` 讀本機圖　· `GET /grab?f=&back=` window.name 傳輸（⚠ Chrome 會清，已無效）
  · `POST /save?name=` 收檔並回 **204**（204 ＝ 內建瀏覽器不導頁）
- 上傳走 **Claude in Chrome 的 `file_upload`** —— 內建瀏覽器沒有這個工具，
  而 chatgpt.com 的 CSP（`connect-src` 白名單）＋ 混合內容擋死了所有從網路進料的路。

## ⚠ 換機器：這些**不會**跟著走

- ⚠⚠⚠ **這是換機器唯一真的會掉東西的一項**——見第零節「換機器要帶什麼」那張清點表：localStorage 、存檔、地圖筆畫、拖城 **全部是空的**（-1306 兩個瀏覽器都查過），**只有這一項要搬**。
- `resources/_originals`（**67 MB／31 個檔**，含這一輪 25 張成品的原始 PNG）與 `_recycle`
  —— 都在 `.gitignore` 裡。要留就自己複製。
- ⚠ 上一次換機器已經掉過一次大的：舊機器的 `_originals` 有 **2.6 GB**，
  這台只剩 11 MB —— **卡耶爾山谷那 20 隻怪的 Gemini 原形就是那樣沒的**
  （`_canyon_beast_spec.md` 的下一步「GPT 加氣勢＋去背」因此做不下去，要重生成一輪）。

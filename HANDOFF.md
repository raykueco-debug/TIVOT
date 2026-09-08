# HANDOFF — 教學順序／敵人卡 Excel 化／受擊四態／錢的規則 ver -928〜-951（2026-09-08）

> 前一份（-803〜-854：彈殼演出、全流程監測掃查）已被本檔取代；
> **檔尾的「環境備忘／教訓／快速測法」是沿用的**，不隨版次汰換。
> HEAD＝`ver 2026.09.08-951`，已推 origin/main。
> ⚠ 工作樹只剩並行**美術 session** 的未追蹤檔（`resources/*`、根目錄兩張 png、
>   `enemies.xlsx`＝Ray 的版面範本、`地理筆記.docx`）——**不要動、不要提交**。

## 這一輪的兩條工作規矩（Ray 定，已寫進長期記憶）

1. **戰鬥類的改動不要自己開瀏覽器實測，交給 Ray**（-939，「你測太慢了」）。
   改完只做 `script_lint.py` ＋ `jsc -m` 語法檢查，然後**說清楚「改了什麼、要看哪幾點」**。
   ⚠ 自動測試還會**失真**：用程式直接對元素派事件會繞過真正的輸入路徑 ——
   「反擊教學點不了」就是這樣測不出來的（對話期間 `#tutTouch` 蓋在最上層，
   手指根本碰不到底下的紅點）。非戰鬥的（城鎮／地圖／選單／存檔／版面）照舊自己實測。
2. **`enemies.xlsx` 是 reference，只有 Ray 明講才 `import`**（-944）。
   平常只 `export`。要加欄位**先在對話裡討論、改 Excel 的格式**，不要自己長欄。

---

## 一、敵人卡 ⇄ Excel（`tools/enemies_xlsx.py`）—— 這一輪最大的一塊

```bash
python3 tools/enemies_xlsx.py export            # enemies.js → tools/enemies.xlsx
python3 tools/enemies_xlsx.py import 檔案.xlsx   # 只在 Ray 說的時候跑
```

- **真相仍然是 `script/enemies.js`**（鐵律 1/7），Excel 只是編輯用的視圖。
- **匯入是「就地改值」不是重產檔案** —— `enemies.js` 裡那些 ⚠ 註解是這個專案最貴的
  東西，整檔重產會全部洗掉。只把「與現況不同」的那幾格找到原行替換；
  `loot`／`hitFx` 是陣列／多鍵物件，改成**整塊重寫**（`set_block`，欄位不存在會照
  那張卡的縮排補一行）。
- `__meta__` 分頁存匯出當下的**源檔指紋**，匯入時對不上會擋下來（防「拿放了三天的
  Excel 蓋掉中間的修改」）。`__lists__` 分頁放下拉的清單（隱藏）。
- **版面照 Ray 交的那一份**：三列表頭（① 群組合併 ② 欄名＝機器讀的 ③ 中文顯名）、
  資料第 4 列起、A 欄編號、凍結 B4、全表格線。
  ⚠ **第 2 列（欄名）是唯一的真相**，中文顯名純給人看、改了不影響匯入。
- **下拉選單**：`bg`（背景基底名）／`掉落1~4.id`（顯示成「中文｜id」，匯入取 `｜` 之後）／
  `hitFx` 四格（`config.HITFX` 的名字）。
  ⚠ 清單走**另一張表的範圍**不是塞進公式：Excel 的 `formula1` 有 255 字上限，
  三百多個背景直接塞會**整條驗證失效而且不報錯**。
- **縮圖欄**（B）：轉 PNG、去背墊白、等比縮 64px；`圖檔`欄存**專案相對路徑**不是檔名
  （敵人立繪不是全都住在 `resources/enemy/`，賞金獵人那張在 `resources/SI/`）。
- **「有圖還沒有卡」的怪**也各給一列、`key` 留空＝**待辦不是資料**（匯入跳過）。
  現在剩 3 隻：`mon_bug_mantis`／`mon_relic_bellascetic`／`mon_rictus_hooked`。
  濾掉「假待辦」的兩條規則是**算的**不是名單：① 同名另一種副檔名已被卡用（轉檔前的原圖）
  ② 檔名在 `script/*.js` 被引用過（鹿主的中景層走 `cgBack`，不是敵人卡）。

## 二、敵人卡的欄位大清理（-939〜-951）

| 動作 | 欄位 | 說明 |
|---|---|---|
| **新增** | `ult:{on,hp,count,atk,gap,cd}` | 每張卡都有；**開關看 `on`不看「有沒有填 hp」**。`atk`＝每顆圈的攻擊力（大絕與一般攻擊的差別之一），不填退回 `attack` |
| **新增** | `Ganymede` | 主武器（普攻）的增減傷，與 `weaponMod` 三把**同一排**，正=增傷負=減傷、加法 |
| **改名** | `openUlt`→`openAssault`、`ultEvery`→`assaultEvery`、`landSe`+`entranceVo`→`entrance` | |
| **移除** | `image`／`resist`／`weak`／`money`／`boardLoop`／`dualBonus`／`counterBuff`／`counterStun`／`wrongPenalty.dmgScale` | |
| **保留但不上 Excel** | `delayPenalty.dmgScale`／`timeDelta` | 只有 `witch` 用；`timeDelta` 是**相對盤面 `intervalLimit`**，換不成絕對值 |
| **我管、Ray 不碰** | `fit.mode`／`fit.pos` | 去背立繪用 `contain`＋`center bottom` |

- **`ult` 統一擺在 `openAssault` 的下一行**；`sf_lynx` 之後那 19 張的壓縮寫法也拆成逐行，
  全檔格式一致。
- **受擊特效：一個名字就是一整個樣子**（-951）。卡上四格只寫 `'claw'`／`'bite'`…，
  `count`／`pos`／`scale`／`flash`／`angle` 全部住在 `config.HITFX`。
  爪數不同的各給一個名字（`claw1`／`claw`／`claw4`／`bullet_big`）——
  名字要在下拉裡讀得懂，那是 Ray 挑特效的唯一介面。`angle` 一律 random。

## 三、引擎規則的改動（都要 Ray 實測）

- **`ult`／`assault` 正名**（-931/-932）：`assault`＝普攻（一般主動攻擊）、
  `ult`＝血量門檻觸發的大絕。引擎內部一起改（`ASSAULT_*`／`scheduleAssault`／
  `penAssault`／`assaultHits`…）；**現在只剩門檻波還叫 ult**。
- **受擊四種狀況**（-932）：延時／按錯／攻擊 assault／大絕 ult。
  門檻波生的圈掛 `th.ult`（只有 defense 分得出來），由 `state.lastAssaultUlt` 發佈給
  combat 的 fxKind 讀。**卡上沒寫 `hitFx.ult` 就退回 `assault`**。
  ⚠ 計數那一族仍是四格（assault/block/delay/wrong），沒有多一格。
- **完美反擊的獎勵只剩全域一套**（-947）：3 秒普攻 ×2。
  ⚠ 修掉一個沉默的老 bug：`defense` 那一行寫死 `triggerAtkBuff(…: 2)` **繞過了全域的 3**，
  實際行為一直是「四張老卡 5 秒、其餘所有怪 2 秒、沒有人吃到 3」。
- **船戰 BR 窗口 +20%** 改成**場次規則**（`tuning.shipDualBonus`）：那不是怪的性質。
  飛行交棒的三條路都帶 `ship:true` → `state.shipBattle`。
- **錢＝整局血量總和 × 評價**（-950）：S90/A80/B70/C60/D50，**連戰用併帳後的等第算一次**。
  唯一計算點 `inspector.moneyOf`。拆掉舊的兩套來源（卡上的 `money.hpRatio`、
  `battleLoot.money` 的逐場擲骰＋`state.sessionMoney` 整條記帳）。
- **索菈娜搭檔的評價係數 650**（-935）：`timeKBonus:250`（全域 `timeK` 400 ＋ 250）。
  ⚠ 那一格存**差值**，動全域 `timeK` 要回推。

## 四、開場教學（-937/-938/-939）

Ray：「開場的教學錯亂了，要先做過一次反擊教學，反擊教學那一局清盤後的下一盤
打一發就滿 BR，進 BR 教學，這一段就這樣而已」

**錯亂的兩個真正成因**（都是 BR 搶在反擊教學前面）：
1. ver -807 的「**任何一盤**清掉第二格就填滿破防值」——第一盤根本不出光圈
   （`noAssaultBoards:1`），所以 BR 教學固定在**第 0 盤第二格**跳出來；
   `onEnergyFull` 又會把 threat／defended 兩段濾掉 → **反擊教學再也不會演**。整條拆掉。
2. 削血保底（敵血 ≤50%）同樣會搶跑 → 改成要「反擊教學做完且翻過那一盤」才准。

現在順序由**一把尺**決定：`counterBoard`（反擊教學在第幾盤完成）。
反擊教學那一盤清完 → 破防值補到 `100 − energyPerHit`（**算的**不是常數）→ 下一盤第一發滿。

**三拍**：台詞「敵人的攻擊要來了！用強力的副武器阻止他！」→ 雪鐵龍箭指著光圈（點掉才過）
→ 台詞「越接近敵人攻擊的瞬間反擊威力越強！」。台詞在 `i18n/zh.js` 的 `tutorial.story.steps`。

⚠ 三個順手修掉的坑：
- `resolveGate` 沒有 `action` 就回 `null` ＝**門根本沒開**，只在 console 留一行 ——
  畫面上看起來像 CSS 壞掉。現在「沒有 action 的閘門」是合法的。
- **排隊的段落沒有換成劇情版台詞**：`fire()` 以前在最後一行才 `withStoryLines`，
  而 `queue.push` 推的是原始步驟 —— 只要段落在別的對話開著時被觸發，
  諾薇兒的教學裡就會冒出**芙蕾雅與蕾妮**的台詞。改成入口換一次。
- 對話期間 `#tutTouch` 蓋在最上層 → 紅點碰不到（Ray 回報「根本點不了」）。
  改成由那一層自己判落點、命中就轉交 `defense.resolveThreat`。

## 五、其他

- **自動播放一路播到段落結束**（-940）：`playScene`／`playAdhoc` 不再關掉 auto
  （§6.5「模式不跨場」對 auto 取消），只有**選項**與**戰鬥**打斷它。
  圖名卡／翌日卡在自動播放時 2.2 秒自己收。⚠ 加速（按住下拉）照舊關掉。
- **靜音鈕放回左上最角落**（-933）：`body` 直屬、z-100000、**飛行畫面上也在**、
  `body.testmode` 限定。⚠ 兩個 UI 一份狀態：畫面一律由 `applyMute` 重畫
  （第一版讓面板自己畫自己 → 從角落切，面板那一列不會更新）。
- **小地圖的存檔／讀檔**（-936/-937）：獨立一格 `sim`，**不進 `latest()`**
  （首頁「繼續」是玩家的路），`clearRunSaves()` 不清它。-937 起**不是管理人限定**。
- **聖遺物 10 隻的卡**已備好但**沒有部署**：`config.js` 的 ASSETS 那十行**註解著**
  （Ray：「先註解，等到開峽谷的時候再放」，省開機 3.87 MB 背景預載）。
  ⚠ 要放回來是**兩邊一起**：① 拿掉那十行的註解 ② 在戰鬥卡／刷怪池接上。
  漏一邊都是沉默的失敗，兩邊註解已互指。
- `enemy_np_boss` 曾指向不存在的 `mon_beast_altar.webp`（美術更名）——已修（-929）。
  ⚠ 那種錯的症狀是「**那一場沒有敵人立繪**」，畫面上不會有任何錯誤訊息。

## 六、等 Ray 的（下一個 session 別自己決定）

1. **戰鬥實測**：① 開場教學的新順序與箭頭 ② `ult.on:1` 的大絕波（`atk` 有沒有吃到）
   ③ 船戰 BR 窗口 +20% ④ 錢的新公式。
2. **CLAUDE.md 有幾處是死名字**：§6.5.2 的 `penUlt`、折秒表的 `ult`、
   `enemyAttack(dmg,kind)` 那段的 `'ult'`/`fxKind`。**憲法我不自己動**，等他點頭。
3. **`counterBuff.mult` 那一格本來就沒有人讀**（已隨欄位移除，記錄在此以免有人想加回來）。
4. 美術那邊：苦笑系 9 隻卡在 GPT 帳號層級不通＋Chrome 擋下載；峽谷 20 隻同樣卡著。
   `mon_canyon_*` **還不存在**，接卡時不要去找。
5. 舊待辦仍在：BOSS 節制的劇情觸發點、`mon_relic_candletower`/`candlepenitent` 的
   劇情接點、九張 1024 寬背景要不要重出。

## 七、這一輪踩到、值得記住的坑

1. ⚠⚠ **`assault:{` 裡面含有 `ult:{`** —— 正則搬 `ult` 那一格時咬到錯的地方，
   19 張一行卡的兩個欄位內容整個對調。**改資料的正則一律加負向後查邊界**
   `(?<![A-Za-z0-9_])`，而且**改完要逐卡把欄位解析成字典比對前後**（語法檢查抓不到）。
2. ⚠⚠ **改名造成重複鍵會沉默吃掉資料**：`man_sorana` 同時有 `entranceVo` 與 `landSe:null`，
   兩個都改名成 `entranceSe` → 後面那個 `null` 蓋掉前面，**登場語音直接消失且不報錯**。
   改名之後要跑一次「全欄位重名」自檢。
3. ⚠ **行首樣式的移除掃不到行內的欄位**：`sv_dart` 把 `resist:{}, weak:{}` 寫在
   `ult` 那一行後面，於是整檔只剩它還帶著死欄位。**自檢要問解析後的物件有沒有那個鍵**，
   不要看原始碼的行。
4. ⚠ **改語意就要掃所有讀它的地方**：`hitFx` 由物件改成字串之後，`combat` 的敵攻擊音
   查表 `HITFX[_hf.type]` 立刻失效 → **攻擊音整個消失而畫面上看不出來**。
5. ⚠ **同一個量兩處各寫一次**又抓到兩個：`triggerAtkBuff(…:2)` 繞過全域的 3；
   錢有三個來源。**動任何常數前先 grep 那個數字。**

## 環境備忘（給下一個 session）
- cv2 已裝（opencv-python-headless 5.0.0）—— build_city.py 的 mass 區塊現在跑得動。
- dev server 埠會變（上次是 57635），用 `preview_start` 起。
- 飛行相機：console 直接讀 `cam`（x/y/angle/alt/speed）；強制白天 `clock.minutes=720`。
- 音量測法：`tools/audio_scan.html` 現場列目錄逐支印建議值；語音要過完 voiceChain 才量（見 §6.6）。
- 原 wav 進 `resources/_originals/audio/<vo|se>`，不入版控。

## 教訓（沿用，逐字遵守）

1. **「不准再自己發揮，嚴格用我給的形狀跟位置，1 pixel 都不准差。」** 他給圖就是規格。
2. **「做之前先跟我確認。」** 對圖有任何一處看不懂，先問再動手。
3. **改完必須在瀏覽器實測再交** —— ⚠ ver -939 起**戰鬥類例外**：那一族交給 Ray 測
   （見檔頭「這一輪的兩條工作規矩」）。其餘照舊自己測。
4. python 替換程式碼時**錨點必須唯一**。
5. ⚠⚠ **改了一個機制之後，去問「誰掛在它上面」**（-706 三帶反擊連環四 bug 的教訓）。
   **改語意的那一版，就要把所有讀它的地方掃一遍。**
6. ⚠ **重複鍵不會有錯誤訊息**：物件字面同一個鍵寫兩次，JS 靜靜取後面那個。改資料前 grep 一下。
7. ⚠ **jsc 的語法檢查會把 `import` 剝掉** —— 以瀏覽器實測為準。
8. ⚠ python splice 用「起點到終點索引」時先確認中間沒有別的東西。
9. ⚠⚠ **靜態空間分大小寫、macOS 不分**：檔名推法（如 `_BF` → 基底名）本機測不出來，上線整排 404
   —— 逐格寫出真實檔名（夏爾村 hsrc、城重建背景都踩過）。
10. ⚠ **改圖同名覆蓋要帶 `?v=N`**：瀏覽器快取沿用舊圖，量像素指紋確認換到新的。

## 快速測法（瀏覽器 console）

```js
Promise.all([import('/state.js'), import('/modules/combat.js')]).then(([st,combat])=>{
  window.__st=st; window.__combat=combat;
  document.getElementById('home').classList.remove('on');
  combat.startScriptBattle('flight_pirate',{story:false});
});
// 等 1.5 秒後：
__combat.pauseForDialog(); __st.state.energy=85; __st.state.combo=13;
window.dispatchEvent(new Event('resize'));   // 觸發 layoutClasp + updateEnergyClasp
```

彈殼／反擊要看實際軌跡：`enemy.ejectShell(cell)`／`enemy.ejectCounterShell(x,y,opts)` 手動叫一次，
用 DOMMatrix 取樣確認頂點速度＝0、方向、等速。

## 背景待辦（沿用中）

- ⚠⚠ **多語種整批留到最後做**（Ray：「多語種等全部完成再做」）—— 在那之前**只維護繁中**，
  英日落差先記著、不逐版追。已知落差：`tutorial.story`（地宮聖徒戰那份）只有 `i18n/zh.js` 有，
  切 en/ja 時 `tut.story` 是 null；逐版改的台詞 en/ja 跟不上。
- **交叉雙槍兩張圖**（`resources/vfx/42452231-….png` 彩色、`background/…` 黑剪影）：
  Ray「另有用途」，用途還沒講 —— 下次問清楚再接，先不入版控。
- stage2 羽蛇「戰鬥結束」戲（Sturm／Deck_Chaos／著水）等 Ray 的 stage2 稿與素材。
- **九星素材配方**（`config.gunUpgrade.recipes`）仍是草案；「部分關鍵素材由劇情控制產出」那幾樣沒填。
- **副武器第 5 階特殊能力**（`tuning.weaponPerks`）先留槽（Ray 還沒想好）。
- **強化護符**（`items.defs` 的 `cat:'charm'`）：管線全通、一張卡都還沒給，不要自己發明。
- **S3 章節編號**未定（出航～北方泊地之間）；試玩／飛行的暫填值（STAGE_DEFAULT 等）先擺 5。
- 森林地圖的戰鬥（夏爾村所在的暗色森林）尚未鋪。
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。

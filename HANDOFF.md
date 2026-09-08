# HANDOFF — Excel 匯入／新怪圖建卡／憲法死碼 ver -952（2026-09-08）

> 前一份（-928〜-951：教學順序、敵人卡 Excel 化、受擊四態、錢的規則）已被本檔取代；
> **檔尾的「環境備忘／教訓／快速測法／背景待辦」是沿用的**，不隨版次汰換。
> HEAD＝`ver 2026.09.08-952`。
> ⚠ 工作樹只剩並行**美術 session** 的未追蹤檔（`resources/vfx/*.png`、根目錄兩張 png、
>   `flight/Reference/ship_topdown.png`、`地理筆記.docx`）——**不要動、不要提交**。

## 這一輪 Ray 交辦的三件（都做完了）

### 一、匯入他改的 Excel（12 格）

`tools/enemies_xlsx.py import enemies.xlsx`，指紋對得上。

| 卡 | 改了什麼 |
|---|---|
| `sv_dart` | 受擊特效 slash → **blunt**（三格） |
| `sf_deer_nightmare` | `assaultEvery` 8~10 → **2~4**、`assault.count` 3 → **1**、`ult.hp` 40 → **50**、`ult.count` 2 → **4** |
| `sf_bear_husk` | 受擊特效 delay `bite` / wrong `slash` / assault `claw` |
| `ruins_bonemaw` / `ruins_halo_ring` / `ruins_bellwalker` | HP 400→**300** / 350→**200** / 500→**400** |
| `ruins_saint_inspector` | HP 400 → **500** |
| `ruins_saint_temperance` | 名字 節制 → **節制者** |

⚠⚠ **Excel 收成根目錄一份**（鐵律 7）：Ray 一直在編輯的是根目錄那份，工具卻匯出到
`tools/` —— 兩份走鐘的症狀是「匯入之後數值又跳回去」，事後看不出是哪一格被換走的。
`XLSX` 常數已改指根目錄，舊的走 `recycle.sh` 進回收區（沒有 rm）。

### 二、新怪圖的流程（Ray 定的作業方式）

> 「之後有新怪圖我會指示你更新，匯入後再匯出 xls 檔直接更新，
>   套用一個最普通的怪數值，我再自己下去手動改」

收成一個指令：

```bash
python3 tools/enemies_xlsx.py import enemies.xlsx   # ① 先收他在 Excel 上的修改
python3 tools/enemies_xlsx.py newcards              # ② 有圖沒卡的 → 各建一張最普通的卡
python3 tools/enemies_xlsx.py export                # ③ 再匯出，他在 Excel 上手動調
```

- 範本＝`sf_lynx`（沒有大絕、九宮格五盤的一般野獸）。
- ⚠⚠ **只套「最普通的」那一組，不替他猜**：`bg`／`loot` 留空、名字寫「（待命名）」——
  猜出來的數字看起來像已經調過，反而更難發現還沒填。
- ⚠⚠ **卡與 ASSETS 一起寫**：只建卡不補 `ASSETS` ＝「那一場沒有敵人立繪」，
  而畫面上不會有任何錯誤訊息（-929 的 `np_boss` 就是這樣）。
- ⚠ 「有圖沒卡」的偵測抽成 `orphan_images()` **一支**（鐵律 7）——
  匯出的待辦列與 `newcards` 都問它。

**已建的三張**（卡數 54 → 57，`orphan_images()` 現在是空的）：

| 鑰匙 | 圖 |
|---|---|
| `bug_mantis` | `mon_bug_mantis.webp` |
| `relic_bellascetic` | `mon_relic_bellascetic.webp` |
| `rictus_hooked` | `mon_rictus_hooked.webp` |

⚠⚠ **鑰匙是從檔名推的（去掉 `mon_`），不是 Ray 命名的**。既有卡的鑰匙是「地區＋生物」
（`mon_shinierforest_lynx.webp` → `sf_lynx`），推不出來。**現在還沒有任何地方引用它們，
是改名最便宜的時候** —— 等 Ray 說要叫什麼。三張卡也都還沒接進任何戰鬥卡或刷怪池。

### 三、憲法的死碼（Ray：「憲法死碼清一下」）

把 `CLAUDE.md` 裡 1378 個反引號識別字全部掃過原始碼，找出真的不存在的，逐處改：

| 死名字 | 改成 |
|---|---|
| `penUlt` | `penAssault`（-931 改名） |
| `scheduleOpeningUlt` | `defense.scheduleOpeningAssault`；**秒數也不對了** —— 現在逐怪讀卡上的 `openAssault`（預設 1~2 秒），寫死 0~3 秒的 `ULT_OPEN_MS` 已移除 |
| `HARM_KINDS` | `ENTRANCE_KINDS`／`PURIFY_KINDS`。**不只是改名**：兩份內容不同（船有降臨、沒有淨化），原文「兩個演出共用同一份名單」已經是錯的 |
| `config.battles[x].evalFrom` | **整條刪掉**：-670 撤旗標時漏刪，與正上方「預設就有評價」那一條**互相矛盾**。改寫成現行的兩格特例宣告（`noEval`／`noEvalBeforeStage`） |
| `castTable` | `tutorial.cast.inspector` |
| 主角預設名 **凱勞諾斯／凱** | **托爾斯坦／托爾**（ver -477 就改了，憲法沒跟上；飛行頁那第二份是對的） |
| `enemyAttack(dmg,kind)` 那一段 | 計數與演出**分的不是同一刀**：計數 `assault/block/delay/wrong`、演出 `delay/wrong/assault/ult`；補上 `state.lastAssaultUlt` 由 defense 發佈、`hitFx.ult` 沒寫退回 `assault` |

⚠ **保留的是「已刪的舊名紀錄」**（`maybeMeetRenna`／`setUltRate`／`talkIfNot`／
`combat.armAtkBuff`…）—— 那些明寫著「已移除」，作用是**擋住有人加回去**，不是死碼。

## 這一輪踩到的坑

1. ⚠⚠ **錨點踩了兩次，同一個教訓的兩種變形**（`newcards` 找 ASSETS 插入點）：
   · 「檔案裡**最後一行** `enemy_`」＝ `enemy_man_sorana`，它夾在 **BGM 區**中間（-745 補的）
     —— 照那個錨點插會把敵人立繪塞進音樂區。**語法沒錯、遊戲照跑、沒有任何錯誤訊息。**
   · 改成「**最長的**連續區塊」又遇到森林與神殿同為 9 行的平手，插到中間。
   現行規則：**最後一段 3 行以上的連續 `enemy_`**（落單那行進不來）。
   ⇒ 「錨點必須唯一」不只是「找得到一個」，是**要先問「符合這個描述的還有誰」**。
2. ⚠ **自檢程式自己也會有 off-by-one**：掃重複鍵時括號層次算差一層，54 張卡全部報錯；
   而且**沒有剝掉區塊註解**，`centipi` 的註解裡有一行 `kind:'aerial'` 被當成重複鍵。
   自檢報一大片「全部有問題」時，先懷疑自檢，不要先改資料。
3. ⚠ `penUlt` 在原始碼裡 grep 得到 3 處 —— 全部是 **`openUlt` 的子字串**。
   查一個名字死了沒，要加邊界（`(?<![A-Za-z0-9_])`）。

## 等 Ray 的

1. **戰鬥實測**（上一輪就在等，沒有變）：① 開場教學的新順序與箭頭
   ② `ult.on:1` 的大絕波（`atk` 有沒有吃到）③ 船戰 BR 窗口 +20% ④ 錢的新公式。
2. **三張新卡**：鑰匙要不要改名、名字／`kind`／`bg`／`hp`／掉落怎麼填、接到哪一場。
3. **聖遺物 10 隻**仍未部署（`config.js` 的 ASSETS 那十行註解著，省 3.87 MB 預載）——
   要放回來是**兩邊一起**：拿掉註解 ＋ 接進戰鬥卡／刷怪池。
4. 美術：苦笑系 9 隻卡在 GPT 帳號層級不通＋Chrome 擋下載；峽谷 20 隻同樣卡著
   （`mon_canyon_*` **還不存在**，接卡時不要去找）。
5. 舊待辦仍在：BOSS 節制的劇情觸發點、`mon_relic_candletower`/`candlepenitent` 的劇情接點、
   九張 1024 寬背景要不要重出。

## 這一輪的兩條工作規矩（沿用，Ray 定）

1. **戰鬥類的改動不要自己開瀏覽器實測，交給 Ray**（-939，「你測太慢了」）。
   改完只做 `script_lint.py` ＋ `jsc -m` 語法檢查，然後**說清楚「改了什麼、要看哪幾點」**。
   ⚠ 自動測試還會**失真**：用程式直接對元素派事件會繞過真正的輸入路徑。
   非戰鬥的（城鎮／地圖／選單／存檔／版面）照舊自己實測。
2. **`enemies.xlsx` 是 reference，只有 Ray 明講才 `import`**（-944）。平常只 `export`。
   要加欄位**先在對話裡討論、改 Excel 的格式**，不要自己長欄。

---

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
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。

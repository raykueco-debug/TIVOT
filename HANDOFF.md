# HANDOFF — Stage 8（索菈娜家→餐廳→索菈娜家）／瑪麗亞的廚房 ver -953〜-955（2026-09-08）

> ⚠⚠⚠ **開工前先讀 `HANDOFF_ver964-970_ART_SESSION.md`（2026-09-09）。**
> `-964`〜`-970` 這七版是 Ray 在**美術（產圖）session** 裡交辦、由它做完並 commit 的
> —— 這一份檔案（-955）之後的事它一件都沒記。**HEAD 已經是 `ver -970`。**
> 那七版動過 `config.js`／`modules/{saint,combat,defense,partner,weapon,inspector,gear}.js`／
> `script/{progress,town}.js`／`style.css`／`CLAUDE.md`，而且**推翻了好幾條舊規則**
> （生命歸還回滿、OBE HP→1、惡夢化灌滿與 12.8 秒、`showExp:false`…）——
> **舊註解會騙人，動那幾支之前先重讀。**
> 憲法也多了**鐵律 11**（繪圖 session 被要求 coding 要先跳提醒）。

> 前一份（-928〜-952）已被本檔取代；**檔尾的「環境備忘／教訓／快速測法／背景待辦」是沿用的**。
> HEAD＝`ver 2026.09.08-955`。
> ⚠ 工作樹只剩並行**美術 session** 的未追蹤檔（根目錄兩張 uuid png、
>   `resources/SI/NPC/f66a41f1-….png`、幾張還沒轉檔的 SI png、`flight/Reference/`、
>   `地理筆記.docx`、`CLAUDE.md` 那一段怪的分工）——**不要動、不要提交**。

## 這一輪做完的

### 一、Stage 8 的劇本（Ray 交稿，台詞一字未改）
`script/town.js` 三段 ＋ 三道閘門：

| 段落 | 掛在哪 | 旗 |
|---|---|---|
| 索菈娜家（開場，T1/T2 分歧） | `sorahome.acts` | `sv_s8_home`（`fromStage:7`，`stage:8`） |
| 餐廳（瑪麗亞／廚房／煮第一道／科爾文） | `restaurant.acts` | `sv_s8_dine` |
| 索菈娜家（作戰課的指令、電報） | `sorahome.acts` | `sv_s8_corvin` |

閘門：`sv_s8_noon`（起始時間→下一個中午 12 點、搬到索菈娜家）／
`sv_s8_hungry`（`afterMoves:6`，第七步被抓去餐廳）／`sv_s8_to_home`（餐廳演完換場回家）。

⚠⚠ **稿上兩處標記與說話者對不起來**，我按說話者處理，仍待 Ray 確認：
· 「索：『瑪麗亞的料理可是很美味的喔。』」與下一句標的是**瑪麗亞的立繪**，但說話的是索菈娜。
· 「第一道**羊**腿排」vs 稿上台詞「奶油**鹿**腿一份」＋插圖 `di_deersteak` —— 以稿與圖為準寫成鹿。

⚠ 「（耳語）」保留原文：它是那一拍的全部內容，拿掉只剩一個空框。

### 二、料理（十道菜，每道固定 HP 上限 ＋40）
- 資料 `config.cooking.dishes`：一肉一菜一調味，五種肉各用兩次，無重複配方。
  **每道只算一次**（記「吃過哪幾道」不是次數，不然反覆煮同一道能無限刷）。
- 食材 11 樣（`items.defs`）。⚠⚠ **「它在料理裡佔哪一格」只寫在道具身上**
  （`food:'meat'|'veg'|'season'`）—— 配方只列三個 id。
- 介面 `loot.showKitchen`：一列＝一道，左菜圖（未習得「？？？」）／中菜名＋材料／
  右按鈕三態（已習得金色・料理可按・料理灰階）。
- 交易 `loot.cookDish` **一支**；演出 `story.playCooking` **一支**（腳本的 `cook:` 與
  介面那顆「煮」都走它）。成品登場：縮小彈出＋背後金色光線旋轉。
- 大字 `story.showBoon` **另一次呼叫**（不藏在演出裡）：稿上它排在索菈娜那幾句之後，
  而介面那條路沒有那幾句 —— 兩種時機不同，所以規則是「演出永遠不含大字」。

### 三、三個「一個量一個計算點」的收斂
| 收成 | 原本散在哪 |
|---|---|
| `progress.bonus`（由 `starBonus` 改名） | 加了料理之後就不只是「星」的加成，名字要說實話 |
| `progress.playerMaxHp()` | `tuning.playerHp` 被三處各讀一次（state 模組常數／整備頁／回復道具） |
| `clock.dateTextIn` ＋ 台詞的 `{D+N}` | 期限「兩個月內」由**當下**算，不寫死日期 |

⚠ 體力上限**不可以快取成模組常數**：料理是中途吃的，快取要重整頁面才生效
（同主槍強化那個坑）—— 改成開戰時 `combat.refreshPlayerMax()` 現算。

### 四、Ray 現場回報的三個**全域**問題（都修在唯一那一支）
1. **自動播放碰到沒台詞的純立繪拍會卡住**：自動推進掛在「這一句唸完」的回呼上，
   而那種拍沒有字、打字機不會跑，回呼永遠不來（本章就有十幾拍）。補上自動／加速
   那條路的計時器；手動照舊等點擊（-628 的規矩沒變）。
2. **謎之人影不說話時不要再加黑遮罩**（Ray：「全域原則」）：`dark` 由**句子屬性**改成
   **跟著人走的狀態**。舊版每句清一次 → 他在別人講話時**會露臉**、輪到他又黑回去，
   而且拿到的是非說話者的壓暗（另一層黑）。現在剪影持續到他自己報上名字，
   剪影上不再疊 `.dim`；判「同一個人」比 **art**（`CORVIN_Q` → `CORVIN` 是同一張臉）。
3. **瑪麗亞立繪水平翻轉**：新增 `ART[].flip`（這張圖本來就畫反了，站哪邊都翻）。
   ⚠ 與 `mirror`（可以翻→換邊才翻）是**兩件事**：她本位在右，用 mirror 一次都不會翻。

### 五、素材
- 科爾文 9 張差分（`resources/SI/NPC/`）轉 webp、逐張量取景，`cm:176`（Ray：與索菈娜同高）。
  ⚠ 他原本說 180 —— 那會成為全劇組最高，`CAST_TALL` 是每公分像素的分母，全體會縮小 1.1%。
- `013_Corvin_intro`（`cgPan:'up'`，帶 `cgNoTime`）、`resources/dishes/` 三張、
  三支音檔轉 m4a 並量增益（`se_cooking` 換過新檔：39.7→3.73 秒，增益 2.88→**1.59**，
  `cooking.animMs` 對齊成 3730）。
- ⚠⚠ 順手修好**現行的破圖**：18 張 NPC 立繪已搬進 `resources/SI/NPC/` 而 `speakers.js`
  還指舊路徑（店主／櫃台／獵人／村長／瑪麗亞／娜塔莉／群眾**全部載不到，而且畫面上
  沒有任何錯誤訊息**）；`Renna_SI_cutescare` 其實是檔名打反（`scarecute`）。

## 這一輪踩到的坑
1. ⚠⚠ **又踩到 -879**：用 CSS animation 做菜品彈出與金光淡入 ——
   `body.perf-idle #storyStage *` 把 animation 凍在第 0 幀，而演這一段時玩家本來就
   沒在碰螢幕，實測 `opacity` 卡在 0：**金光根本不會出現，畫面上還看不出為什麼**。
   ⇒ **顯形一律 transition，animation 只留「凍住也無所謂」的錦上添花**（旋轉）。
2. ⚠⚠ **時鐘要在轉場之前推**：Stage8 的起始時間本來想寫在 act 上 —— 那樣人已經站在
   那一格、背景是按**舊時刻**選的（半夜走進來會看到夜景配中午的戲）。閘門才對。
3. ⚠ **自檢程式自己也會有 off-by-one**：掃重複鍵時括號層次差一層、又沒剝區塊註解，
   54 張卡全部誤報。自檢報一大片時先懷疑自檢。
4. ⚠ TDZ：`const SV_S8_DINE` 用到的 `sor`／`any` 宣告在它後面 —— 資料常數要放在
   **所有 helper 之後**。
5. ⚠ 錨點：`grep` 出來的註解要**整行抄**（少抄「也擺店主立繪」五個字就對不上）。

## 等 Ray 的
1. **戰鬥實測**（上兩輪就在等）：開場教學的新順序與箭頭／`ult.on:1` 的大絕波／
   船戰 BR 窗口 +20% ／錢的新公式。
2. **Stage 8 的兩處稿面**（見上面「稿上兩處標記」）。
3. ⚠⚠ **鹿腿肉與草原奶油目前遊戲裡拿不到**（沒有怪掉、沒有店賣）—— 所以那一段由
   劇情發給玩家，否則 +40 會默默不生效。要指派掉落／店貨的話等他決定。
4. **其餘九道菜的插圖**（`dish_lynxgrill` 那些）：沒有圖的那幾道演到時不出插圖、不會壞。
5. **聖遺物 10 隻**仍未部署（ASSETS 那十行註解著，省 3.87 MB 預載）—— 要放回來是
   **兩邊一起**：拿掉註解 ＋ 接進戰鬥卡／刷怪池。
6. 三張新卡（`bug_mantis`／`relic_bellascetic`／`rictus_hooked`）的鑰匙要不要改名、
   數值怎麼填、接到哪一場。
7. 美術：苦笑系 9 隻與峽谷 20 隻卡在 GPT 帳號層級（`mon_canyon_*` **還不存在**）。

## 工作規矩（沿用，Ray 定）
1. **戰鬥類的改動不要自己開瀏覽器實測，交給 Ray**（-939）。改完只做 `script_lint.py`
   ＋ `jsc -m` 語法檢查，然後說清楚「改了什麼、要看哪幾點」。
   **非戰鬥的（城鎮／地圖／選單／存檔／版面）照舊自己實測。**
2. **`enemies.xlsx` 是 reference，只有 Ray 明講才 `import`**（-944）。平常只 `export`。
   新怪圖的流程見 `tools/enemies_xlsx.py` 的 `newcards`（import → newcards → export）。

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

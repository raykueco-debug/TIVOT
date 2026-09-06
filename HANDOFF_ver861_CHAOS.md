# HANDOFF — ver -861 混亂善後 ＋ Ray 未完成需求（2026-09-07）

> ⚠⚠⚠ **這份是「亂局善後」交接**。上一個 session（我）在一個 **shell 輸出被污染
> ＋多 session 交叉改動同一 repo** 的環境裡工作，導致：
> - `git commit && git push` 的成功訊息**很多是假的**（環境吐出 `a1b2c3d main->main`
>   之類的幻覺文字），我信了、往下做，實際 commit 從沒發生。
> - 我以為推上的「番茄人圖 / ovk撤格 / NI處決 / 墜船音樂 / 下滑降落 / 外海區域」
>   等，**多數沒真的進版控**。
> - Ray 回報「番茄人圖丟失、se_saintinstall 播成舊低 pitch 版」——證實工作樹狀態
>   已不可靠。
>
> **教訓（下一個 session 務必遵守）**：
> 1. **永遠不要信 shell 的 push/commit 成功訊息**。每次 commit 後**立刻 `git log
>    --oneline -1` 亲眼確認 HEAD 是不是你的 commit**；push 後 `git log origin/main
>    --oneline -1` 確認遠端。
> 2. **grep/sed/python-print 的輸出在這環境會被截斷/遮罩/污染**（顯示 `§`、`...`、
>    假的成功行）。要讀檔內容用 **Read tool**（實測可靠，能小段讀），要驗證存在性
>    用 `python3 -c "print('x' in open(f).read())"` 但**把結果寫進檔案再 Read**，
>    不要信終端直接輸出。
> 3. **這個 repo 有別的 session（美術）同時在 commit**（例：`0f18cec 死亡峽谷場圖`
>    是三小時前另一個 session 的）。你 push 前先 `git fetch` 看遠端有沒有前進，
>    避免覆蓋；`git add` **只 add 你自己動的程式檔**，`resources/` 的 modified/
>    deleted **一律不要碰**（那是美術 session 的，git status 會列一大票 CI/SI/bg）。

---

## 一、真實的版控狀態（用 git log 驗過，可信）

- **origin/main HEAD = `c718fae`（ver -859）** ← Ray 玩得到的、真的推上去的最後一版。
  內容：北泊退燒藥事件/公會情報/三店拉回、夏爾村早訪/杰羅修船打靶/村長分章/
  獵人兌換表/村雜貨9折/森林解鎖+大地圖發現、村民獸骸戰膝上、改裝頁四大格、
  碎玻璃停用、薇拉馮德紋章10000、索拉娜vo(?v=3)/獵手戰吼CI縮0.62、下滑降落、
  外海沿用陸地國、一票引擎擴充（need收陣列/acts吃hourOfDay/lines可為函式/
  untilStage/hideBelowStage/逐拍take-give-money/tierMin/店家sale折扣/
  timeAttack.ultOn+hitPenaltySec）。**這些是真的，別重做。**

- **本機 HEAD = `b2df6d3`（ver -861）**，比 origin 多一個 commit，但 **`git show
  --stat` 證實它只改了 2 個檔**：
  - `config.js`：food/treasure 兩個 cat 分類（catOrder/catName）、五食材改
    `cat:'food'`、三個新素材（tiger_horn 虎王的獨角/crow_beak 尖喙/elf_antler
    精靈鹿角，都 cat:material）。**這部分是好的、要保留。**
  - `modules/town.js`：`isOpenNow` 加全域規則「t>=19 一律關，除非節點標
    `lateNight`」。**這部分也好、要保留。**
  - ⚠⚠ commit message 寫的「ovk撤格/NI處決/墜船音樂」**是騙人的——那三項的
    改動沒進這個 commit**（可能寫進了工作樹又被沖掉，或根本沒寫入）。**下面第三節
    要重做。**

- **`ver -861` 還沒 push**（origin 還在 -859）。下一個 session 決定保留的話要
  `git fetch` 後再 push。

---

## 二、-861 之後 Ray 又交辦、**完全還沒做**的需求（依交辦順序）

### A. 番茄人圖（丟失，要補）
- 蕃茄人11號的圖要用 `resources/enemy/Dart_counter.webp`（Ray 交件，已從
  Dart_counter.png 轉過 webp，**檔案在**）。
- 要做：`config.js` ASSETS 加 `enemy_dart_counter: "resources/enemy/Dart_counter.webp"`；
  `script/enemies.js` 的 `sv_dart` 卡 `image:'enemy_dart_target'` → `'enemy_dart_counter'`。
- **這兩處我以為做了，git 證實 config 裡 `enemy_dart_counter` 不存在——丟了，重做。**

### B. 兩個戰鬥 bug（我以為修了，沒進版控，要重做）
1. **ovk 沒把點掉的方格撤掉**：`.done` 格的 `::after` 裂痕切片沒被清，彩色裂紋
   殘留在黑底上＝看起來沒撤掉。修法：`style.css` 加
   `#grid.dualwield .cell.done::after, #grid.overkill .cell.done::after{ content:none; }`
   （放在 `.cell.done{background:#000...}` 那條後面）。**實測過有效，但沒 commit。**
2. **NI（惡夢化）中敵 hp 歸零沒跑 EXECUTE**：`modules/saint.js` 的
   `finishNightmare` 只呼叫 `combat.markMaxBurst()`，漏了「敵已死→處決」。
   修法：把那行唯一的 `combat.markMaxBurst && combat.markMaxBurst();` 換成
   `if(state.enemyHp<=0){ if(state.markExecution) state.markExecution(); } else { combat.markMaxBurst && combat.markMaxBurst(); }`
   （MB 與處決互斥，同 SI 清盤判定）。**改過語法通過，但沒 commit。**

### C. 墜船音樂（我以為修了，沒進版控，要重做）
- 墜船時常態航行音樂＋環境音沒收，跟腳本的 crisis 疊。
- 修法：`flight/index.html` 的 `crisisBgm(on)` 裡，`if(on){ bgmMain.stop(); ...}`
  改成 `if(on){ flightAudio(false); ...}`（收整組航行/環境 loop；crisisLoop 獨立
  不在 flightAudio 清單，不會被收）。**Read 讀得到那段，改一行即可。**

### D. se_saintinstall 播成舊低 pitch 版（Ray 回報，**未查**）
- Ray：「連 se_saintinstall 都播成舊的低 pitch 版」。可能是快取（同名覆蓋沒帶
  `?v=N`）或 ASSETS 指到舊檔。**要查 `config.js` 的 `sfx_saint`/`se_saint_install`
  ASSETS 路徑與 `?v=`，對照 resources/audio 實際檔。** 這是 Ray 明確回報的 bug。

### E. 杰羅改槍系統（Ray 交規格，**大工程，未做**）
> 「杰羅不賣槍，只改槍，他改的槍有50%機率會失敗，白花錢。但是成功的話增加增益
>   15~50%隨機。讓改槍畫面時杰羅自己坦白這件事，畢竟自己不是專業槍匠。百分比不要
>   講出來，就說改出來的比制式火力還強。改槍畫面改成點下去以後跳槍的圖與數值出來。
>   在杰羅處改裝成功的話額外顯示額外增益。」
- 這與現有槍店改裝（`modules/loot.js` 的四大格改裝頁、副武器 `weaponMod`）不同：
  杰羅是**賭博式改槍**（50%失敗白花錢、成功隨機+15~50%），要新做一套 UI（點下去
  跳槍圖+數值+額外增益），配杰羅的坦白台詞（不講百分比）。
- 夏爾村工坊（`script/town.js` 的 `workshop` node）目前是「杰羅打靶修船」（sv_range），
  要改成「杰羅的槍店（只改不賣）」。Ray 說「杰羅的工坊就是槍店」。
- ⚠ 增益數值系統：副武器現在是 `weaponMod` 固定+20%/階。杰羅這套是**隨機增益**，
  要另存（可能 progress 存每把槍的杰羅加成）。**規格要想清楚再動，別急。**

### F. 夏爾森林怪卡 ＋ 掉落 ＋ 刷怪（Ray 交卡，**大工程，未做**）
> 出怪率25%/地點（踩過也可能出，一場內不重複）。三類掉落物：寶物（賣錢）/
> 素材（改槍）/食材（料理）。
- **圖全部在**（`resources/enemy/`）：mon_bear_husk、mon_bear_nightmare、
  mon_stag_rot、mon_stag_nightmare、mon_shinierforest_{lynx,snake,hog,tiger,
  crows,deer}（deer/hog/tiger 我已轉 webp，其餘本來就 webp）。
- **cat 分類已備好**（-861 的 config）：food（食材）、treasure（寶物）、material
  （素材，改槍用）。掉落物 defs：五食材已 cat:food；harm_* 與新三素材（tiger_horn/
  crow_beak/elf_antler）cat:material。**還缺食材對應——見下表。**
- **怪卡要做**（`script/enemies.js`，格式抄 `sv_stag`：name/hp/attack/kind/image/
  story/ultEvery/boardGrids/assault/hitFx…；掉落用 **`loot:[{id,n,p}]`**，p=機率不填=100%，
  見 inspector line 809 `en.loot`）：

  | 怪 key（建議） | image | hp | 出沒限制 | 掉落 |
  |---|---|---|---|---|
  | mon_bear_husk（日/晨） | enemy_sf_bear_husk | ? | 黃昏夜→nightmare | 熊掌 paw_bear 100% |
  | mon_bear_nightmare（昏/夜） | enemy_sf_bear_nightmare | ? | | 熊掌 100% |
  | mon_stag_rot（日/晨） | enemy_sf_stag_rot | ? | **懸崖必出**（結算點） | 鹿角 antler_deer 100% |
  | mon_stag_nightmare（昏/夜） | enemy_sf_stag_nightmare | ? | | 鹿角 100% |
  | lynx | enemy_sf_lynx | 200 | 非末端限定 | 山貓腿肉 meat_lynx 100% |
  | snake | enemy_sf_snake | 200 | 水域限定（淺灘必出） | 蛇肉 meat_snake 100% |
  | hog | enemy_sf_hog | 350 | | 山豬腹肉 meat_boar 100% |
  | tiger | enemy_sf_tiger | 500 | 末端限定（**洞窟必出，只一次**） | 虎王的獨角 tiger_horn 25% |
  | crows | enemy_sf_crows | 300 | 非末端限定 | 尖喙 crow_beak 100% |
  | deer 樹靈鹿主 | enemy_sf_deer | 600 | 遺蹟入口出現 | 精靈鹿角 elf_antler 100% |

  - ASSETS 我**還沒加**（-861 只加了 items，enemy_sf_* 圖路徑沒進 config）。要補：
    `enemy_sf_bear_husk` 等 10 條指到 `resources/enemy/mon_*.webp`。
  - **日夜差分**（bear/stag）：日晨常態、黃昏夜晚變 nightmare。這是「同一隻怪依時段
    換卡」——機制要想（可能刷怪時看 clock.band 選 husk 或 nightmare）。
  - **攻擊力/其他數值** Ray 沒給，要照 sv 系列估或問 Ray。
- **刷怪表**（`flight/index.html` 的 `ENEMY_KINDS`，line 7236）：出怪率25%/地點、
  踩過也可能、一場內不重複、洞窟tiger只一次(下次進地圖再生)、淺灘必snake、
  懸崖必stag_rot(結算點)、遺蹟入口deer。⚠ 這在 flight（讀取困難，用 Read 小段讀）。
  ⚠ 但這其實是**城鎮式的森林地圖**（`shinier_forest` town，節點式），不是飛行刷怪——
    出怪掛在 town 的 acts/戰鬥格上，不是 ENEMY_KINDS。**要釐清森林是 town 節點戰
    還是飛行遭遇**（現有 shinier_forest 是 town，10節點 entry/glade/nest/shoal/
    valley/trail/cave/high/cliff/ruins）。「洞窟/淺灘/懸崖/遺蹟入口」對得上那些節點。

### G. 夏爾森林安雅劇情（Ray 交長稿，**未做**）
- Ray 給了一大段稿（安雅頭埋進去→翌日06:00索拉娜家→前往森林→森林入口→各節點
  必出怪→遺蹟入口樹靈鹿主分支(黃昏前/後)→戰後紮營討論→進遺蹟）。**全文在對話
  記錄裡**（這個 session Ray 貼的那則長訊息），下一個 session 去對話撈原文，
  照 `script/SCRIPT_FORMAT.md` 轉成 town.js 的 acts。
- **安雅為夥伴時戰鬥音樂**：`PerituneMaterial_BattleField4`（同索拉娜的
  `battleBgm.partner` 機制，config.battleBgm.partner 加 anya）。
- 立繪差分很多（Anya_SI_panic/sleepy、Renna_SI_wake/unbraid、Sorana_SI_side/idea…）
  ——**要先 `python3 tools/script_lint.py` 對差分是否存在**，缺的回退基本立繪或請
  Ray 交件。
- 新插圖 `010_Anyaheadrubbing`（由上往下平移）。
- 新怪立繪 `mon_shinierforest_deerlook`（樹靈鹿主看向鏡頭）、
  `mon_shinierforest_deernightmare`（鹿主變異禍魘）——**這兩張圖在不在要確認**。

### H. 地圖（Ray 交件 ＋ 規格，**未做**）
- 素材 `mpa/map_shinierforest`（Ray：夏爾森林的地圖圖檔）——**確認實際路徑**
  （Ray 打的 `mpa/` 可能是 `resources/mpa/` 或 typo）。
- 需求：槍棺控制介面**右下角放「地圖」選項**，點開控制面板變成那張地圖，**所在地
  閃爍光點**。（劇情稿裡「高光地圖」那幾拍也是指這個。）
- **每個地點都要有中文地名**（也是日後翻譯標的）——森林10節點的 name 檢查。
- **開圖規則**（Ray）：村落/城鎮一進去就有全圖；城村以外（遺蹟/野外）要走過才開圖。
- 這是新 UI（槍棺控制盤的地圖模式），要新做。

### I. 羽蛇改一般怪（Ray 點破了做法，**未做**）
> Ray：「把飛行敵人跟一般敵人分開就好了，不要跑 harm，擊敗一樣寫淨化。」
- 羽蛇現在 kind:'harm'（enemies.js），走 HARM_KINDS 的降臨/淨化特效，但因為是
  **SCRIPTED 劇本遭遇**（一次性），進戰鬥沒有一般怪的降臨演出（Ray：「進戰鬥沒
  震動衝擊波」）。
- Ray 的解法：**飛行敵人自成一類**（不擠 harm），有自己的降臨特效，擊敗結算副標
  照樣寫「已淨化」。做法：
  - 給飛行怪一個新 kind（如 `flight` 或 `aerial`），`modules/enemy.js` 的
    `HARM_KINDS`／降臨判定把它也算進「有降臨特效」那組（或另開一組 RISE_KINDS）；
  - 結算副標 `i18n` 的 `result.winSubBy` 給這 kind 對到「已淨化」；
  - 羽蛇從 SCRIPTED 一次性改成「每次出場都有特效」——Ray：「以後羽蛇就是一般怪，
    每次出場都要有一樣特效」。要把羽蛇加進飛行的隨機刷怪（ENEMY_KINDS），或至少
    讓它每次遭遇都走正常 setEnemy→riseFx。
  - 「劇情插圖一次，進入戰鬥也要一次」：飛行頁的羽蛇 intro 插圖演一次，交棒進戰鬥
    時降臨特效再演一次。
- ⚠ 涉及 `flight/index.html`（SCRIPTED_ENCOUNTERS / ENEMY_KINDS / toBattle /
  runSerpentIntro）＋ `modules/enemy.js`（riseFx/HARM_KINDS）＋ config（羽蛇卡kind）。
  flight 讀取困難，用 Read 小段。

---

## 三、下一個 session 的建議動作順序

1. **先決定地基**：Ray 選了「生成交接檔交給下一個 session」，沒明說要不要丟棄 -861。
   -861 只有 config(food/treasure/素材)＋town(營業時間) 兩個好改動，**保留無妨**，
   但**先 `git fetch` 看 origin 有沒有被美術 session 推新的**，再決定 rebase/merge。
2. **先補回丟失的小修**（都很快、我驗過邏輯）：番茄人圖(A)、ovk撤格(B1)、
   NI處決(B2)、墜船音樂(C)、se_saintinstall查(D)。**每個 commit 後 git log 驗證。**
3. **再攻大塊**（依 Ray 順序）：森林怪卡+掉落(F) → 杰羅改槍(E) → 地圖(H) →
   安雅森林劇情(G) → 羽蛇改一般怪(I)。
4. **每一件做完就 commit + `git log --oneline -1` 亲眼確認 + push + `git log
   origin/main` 確認**。不要累積、不要信 shell 成功訊息。

## 四、環境注意（血淚）
- **多 session 共用這個 repo**，隨時有別人 commit。動手前 `git fetch`，push 前再 fetch。
- **`git add` 白名單**：只 add 你動的程式檔（config.js / modules/*.js / script/*.js /
  style.css / css/*.css / flight/index.html）。`resources/` 的 modified/deleted
  **一律不 add**（美術 session 的，git status 會列一大票，全部略過）。
- **讀檔用 Read tool**（可靠），grep/sed 的輸出會被截斷/污染，別信。
- 版本號：`config.js` 的 VERSION、`flight/index.html` 的 FLIGHT_VER 一起 bump。
- Ray 的 attribution 這輪要求 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

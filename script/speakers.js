/* ══════════════════════════════════════════════════════════════════════
   speakers.js — 角色表（TIVOT_SCRIPT_ARCHITECTURE §2）
   ──────────────────────────────────────────────────────────────────────
   角色 id → 顯示名 ＋ 立繪資源。所有腳本檔（mainScript / sideScript /
   dialogue / innInteract）共用這一份，**不要在腳本裡寫死人名或圖檔路徑**。

   ⚠ 命名：監察官正名前後當**兩個 id** 處理（規格 §2），不做 name 覆蓋機制。
     正名前用 OFFICER、正名後用 RENNA，兩者 art 同指蕾娜立繪。好感掛在 RENNA。
   ⚠⚠ **蕾娜 Renna ≠ 蕾妮 Renee**。Renna 是監察官（本檔），Renee 是戰鬥搭檔
     （config.js 的 partners.renee，即死防禦/生命歸還）。中文只差一個字、
     西文只差兩個字母，是全專案最容易寫錯的一組。
   ⚠ Regine 是蕾娜的**本名**，隊伍中一律喊 Renna（Ray 定案）。程式 id 用 RENNA；
     本名只在劇情需要時當台詞內容出現，不另立 id。
   ══════════════════════════════════════════════════════════════════════ */

export const SPEAKERS = {
  OFFICER:  { name:'監察官', art:'renna'    },   // 正名前的蕾娜，只出現一幕多
  RENNA:    { name:'蕾娜',   art:'renna'    },
  NOUVELLE: { name:'諾薇兒', art:'nouvelle' },
  ANYA:     { name:'安雅',   art:'anya'     },
  SORANA:   { name:'索菈娜', art:'sorana'   },
  /* 索菈娜：報上名字之前是「？？？」（ver -752，湖上甲板登場稿）。
     同 GIRL／ANYA_Q／OFFICER 的慣例：顯示名不同就是兩個 id，art 同指。 */
  SORANA_Q: { name:'？？？',   art:'sorana'   },
  /* 科爾文（ver -953）。報上名字之前是「？？？」＋暗調剪影（稿上的「陰影立繪」）
     —— 同 SORANA_Q／ANYA_X／OFFICER 的慣例：顯示名不同就是兩個 id，art 同指。 */
  CORVIN:   { name:'科爾文', art:'corvin'   },
  CORVIN_Q: { name:'？？？',   art:'corvin'   },
  LUNA:     { name:'璐娜',   art:'luna'     },
  /* 璐娜莉亞：第四騎士團團長。⚠ 目前只以 **CG 與暗調 CI 插入**登場，不站立繪
     —— 所以 art 是 null。真的要讓她在對話裡站台，得先量取景值（見下方 ART 的
     警告），不要隨便指一張圖。 */
  LUNARIA:  { name:'璐娜莉亞', art:'lunaria' },
  /* 尚未表明身分時用這個 id。⚠ 不要用 LUNARIA 然後把 name 蓋成「？？？」——
     顯示名是查表來的，蓋名會讓「這一句是誰講的」在資料上消失。
     art 指同一張圖：畫面上是同一個人，只是玩家還不知道她是誰。 */
  UNKNOWN:  { name:'？？？',   art:'lunaria' },
  /* 主角。⚠ 顯示名**不查這裡**：他的名字在存檔裡（玩家可改），story.js 顯示那一刻
     才去取 —— 而且取的是**暱稱**（ver -396，Ray：「主角的空對話格用暱稱」）：
     隊上的人平常就是這樣叫他的，全名只在正式場合／台詞裡用 `{P}` 明寫。
     這一筆存在只是為了讓 `speaker:'PLAYER'` 在資料上有著落（驗稿工具會檢查）。
     ⚠ `art:null` ＝ 沒有立繪：他從不站台，只有對話框（含 `blank:true` 的空框）。 */
  PLAYER:   { name:'{N}',     art:null },
  /* 城鎮 NPC（ver -369）。⚠ 站**右**：城鎮裡玩家的同伴（諾薇兒/蕾娜）在左，
     對面的人在右 —— 與主線的固定站位同一個邏輯。 */
  SHOPKEEP: { name:'店主',   art:'shopkeep' },
  /* 背景人聲（路人閒聊）：**沒有立繪**，但**有名字「路人」**（ver -405，Ray 指定）。
     ⚠ 名字欄空著時玩家分不出「這是誰在講」與「這是旁白」——
       標了「路人」就清楚了，而且 NPC 台詞已經不再包引號（ver -404），
       更需要名字欄來標明它是一句話。
     ⚠ 這是**唯一**的那個名字（鐵律 7）：`modules/town.js` 的路人單句問這裡，
       不要在那邊寫死字串。 */
  /* 士兵（ver -953，Stage8）：只有一兩句傳令，**沒有立繪** —— 同 VOICE 的作法，
     名字框標明是誰在講話就夠了（§6.5.4：路人單句要標名字）。 */
  SOLDIER:  { name:'士兵',   art:null },
  VOICE:    { name:'路人',   art:null },
  /* 旁白（ver -656）：**沒有立繪、名字欄空著** —— 「跳一個對話框」那種畫面訊息
     （「該回去看看了。」）。⚠ 與 `VOICE` 的差別只有名字：那是「某個路人在講話」，
     這是「沒有人在講話」。⚠ 主角的空白框（`blank:true`）又是另一件事：
     那是**他**在說話，只是不出聲，名字欄會印他的暱稱。 */
  NARRATION:{ name:'',      art:null },
  /* 夏爾村村民／村長（-802 沒有立繪；**ver -838 Ray 交件接上** NPC_shinier_*）。
     ⚠ 兩位「村民」是**不同的人**（獵人／雜貨商）→ 兩個 id（同 NP 店主那一條：
       同一個顯示名兩個人）。台詞不包引號（§6.5.4）。 */
  VILLAGER: { name:'村民',   art:'sh_villager'  },
  VILLAGER2:{ name:'村民',   art:'sh_villager2' },
  VILLAGER3:{ name:'村民',   art:'sh_craftsman' },   // ver -842：戰後稿的第三位（工匠的臉）
  CHIEF:    { name:'村長',   art:'sh_chief'     },
  /* ver -858（Ray 交辦）：夏爾村三位有名字的 NPC —— 臉沿用 -838 量好的 sh_*。 */
  JERO:     { name:'杰羅',   art:'sh_craftsman' },
  HUNTER_SV:{ name:'謝尼',   art:'sh_villager'  },
  GROCER_SV:{ name:'店主',   art:'sh_villager2' },
  COOK_SV:  { name:'瑪麗亞', art:'sv_cook' },   // 夏爾村餐廳（ver -875，Ray：「圖用cook，名字瑪麗亞」）
  /* 賞金獵人公會（ver -375）。⚠ 兩位都站**右**：與店主同一個邏輯 ——
     玩家的同伴在左，對面的人在右。 */
  HUNTER:   { name:'獵人',   art:'hunter'  },
  /* 東方泊地公會的賞金獵人（ver -1375）。⚠ 顯示名與帝都那位一樣，但**是另一個人**
     —— art 不同就不能共用一個 id（§6.5.6，同 GUNSMITH_EP／COUNTER_EP 的理由）。 */
  HUNTER_EP:{ name:'獵人',   art:'hunter_ep' },
  /* 槍店店主（ver -377）。同樣站右。 */
  GUNSMITH: { name:'店主',   art:'gunsmith' },
  /* ══ 北方泊地的兩位店主（ver -655，Ray 交件）══════════════════════════
     ⚠⚠ **顯示名一樣（「店主」）但是不同的人**，所以是**不同的 id** ——
       art 不同就不能共用一個 id（同 PRIEST_X／OFFICER 的理由的反面：
       那兩組是「同一個人兩個顯示名」，這一組是「同一個顯示名兩個人」）。
     ⚠ 城鎮節點上寫 `keeperWho:'GUNSMITH_NP'`／`'SHOPKEEP_NP'`，
       商店那張單子的店主圖另外寫在 `config.shop.shops[…].art`（兩處都要指對）。 */
  GUNSMITH_NP: { name:'店主', art:'gunsmith_np' },
  /* 北方泊地的送行群眾（ver -741，stage2 碼頭道別）。 */
  CROWD_NP:    { name:'群眾', art:'crowd_np' },
  SHOPKEEP_NP: { name:'店主', art:'grocer_np'   },
  COUNTER:  { name:'櫃台',   art:'counter' },
  /* 北泊公會櫃台（ver -858，Ray 交辦「賞金獵人公會」）。 */
  COUNTER_NP:{ name:'櫃台',  art:'counter_np' },
  /* ══ 東方泊地的三位（ver -1340，Ray 交件：從 `resources/SI/_npc_shopkeeper_pool.md`
       的立繪池指派 —— 槍匠 `Gunsmith_v1`／雜貨 `Grocer_v1`／公會櫃台 `GuildCounter_v5`）══
     ⚠ **顯示名與別城一樣，但都是不同的人**（同北泊那兩位的理由）：art 不同就不能
       共用 id，也不能靠 `keeperOf` 的預設值帶過去（-1062 就是這樣把北泊的櫃台
       小姐在對白講完之後換成帝都那一位的）。 */
  GUNSMITH_EP: { name:'店主', art:'gunsmith_ep' },
  SHOPKEEP_EP: { name:'店主', art:'grocer_ep'   },
  COUNTER_EP:  { name:'櫃台', art:'counter_ep'  },
  /* 旅店前台（ver -392）。同樣站右（玩家的同伴在左、對面的人在右）。 */
  CLERK:    { name:'前台',   art:'clerk' },
  /* ══ 北方泊地的司祭（ver -582，Ray 交稿）══════════════════════════════
     ⚠ **兩個 id**（同 OFFICER／RENNA 的作法）：報上身分之前是「？？？」，
       蕾娜問出「您是——本地的司祭嗎」之後才改用 `PRIEST`。
       畫面上是同一個人（art 同指），只是玩家還不知道他是誰 ——
       **不要**用一個 id 再把 name 蓋成「？？？」，那會讓「這一句是誰講的」
       在資料上消失（同上面 UNKNOWN 那條註解）。
     ⚠ `UNKNOWN` 那一筆是**璐娜莉亞專用**的（art 指她），不能借來用。 */
  /* 安雅：報上名字之前是「？？？」（ver -624，北方泊地教堂那一幕）。
     ⚠ 同 `PRIEST_X`／`OFFICER` 的慣例：畫面上是同一個人，**顯示名不同就是兩個 id**
       —— 不要在腳本裡臨時覆寫名字（§6.5.6）。 */
  /* 北方泊地那一幕的三個階段（ver -636，Ray 交稿）：抱著娜塔莉哭的時候是「少女」→
     報上名字前是「？？？」→ 之後才是「安雅」。**顯示名不同就是不同的 id**（§6.5.6）。 */
  GIRL:     { name:'少女',    art:'anya'   },
  ANYA_X:   { name:'？？？',  art:'anya'   },
  /* 娜塔莉：安雅的侍女（ver -636）。只在這一幕出現，倒在地上。 */
  NATALIA:  { name:'娜塔莉',  art:'natalia' },
  /* 禍魘娜塔莉（ver -681）：墓地那一幕「進場」的那一拍用得到。
     ⚠ **顯示名與生前是兩個 id**（同 PRIEST_X／OFFICER 的慣例）—— 畫面上是
       同一個人，但玩家看到的是另一個東西。 */
  NATALIA_X:{ name:'禍魘娜塔莉', art:'natalia_x' },
  PRIEST_X: { name:'？？？',  art:'priest' },
  PRIEST:   { name:'司祭',   art:'priest' },
  /* ══ 阿瑞尼斯（Arrhenius，ver -1504，Ray：「原本的司祭等等會用上，名為 Arrhenius」）══
     北泊的司祭在 -1504 換成光頭老祭司（`NPC_NP_Priest`）之後，**上一版那張立繪
     不是廢稿**，是這個人 —— 所以它**不回收**，由這一筆認領。
     ⚠⚠⚠ **顯示名「阿瑞尼斯」是我音譯的，Ray 還沒定** —— 要改就改這一個字串
       （`art` 與檔案都不必動）。
     ⚠ 他還沒有戲：登場之後八成要跟司祭一樣拆成「報上身分之前／之後」兩個 id
       （同 PRIEST_X／PRIEST、OFFICER／RENNA 的慣例）—— 到時候再加，不要現在先開。 */
  ARRHENIUS:{ name:'阿瑞尼斯', art:'arrhenius' },
  /* ══⚠⚠⚠ 鏡湖那一段的三個人（ver -1524，Ray 的 Stage10-A 稿）══════════════
     -1503 的美術交接寫著「`Nemo`／`Laurie`／`Cecilie` 在 `speakers.js` 都還沒有
     `ART` 條目 …… **要用到他們的戲時再開，不要現在先開空的**」——
     **這一段就是那齣戲**，所以現在開。
     ⚠ 報上身分之前／之後是**兩個 id**（同 `PRIEST_X`／`PRIEST`、`MISHA_X`）：
       · `NEMO_X`／`CECILIE_X` ＝畫面上是「？？？」（人影那一拍）
       · `NEMO`／`CECILIE`／`LAURIE` ＝名字說出來之後
       ⚠ 蘿芮**沒有 `_X`**：她一開口就喊「蕾姬娜學姐」，蕾娜當場叫出她的名字。
     ⚠ 中文名照 -1503 Ray 定案的：`Nemo`＝**尼莫**、`Laurie`＝**蘿芮**。
       賽西莉（Cecilie）在諾薇兒的台詞裡早就出現過，沿用那個寫法。 */
  NEMO:{      name:'尼莫',   art:'nemo' },
  NEMO_X:{    name:'？？？', art:'nemo' },
  CECILIE:{   name:'賽西莉', art:'cecilie' },
  CECILIE_X:{ name:'？？？', art:'cecilie' },
  LAURIE:{    name:'蘿芮',   art:'laurie' },
  /* ══ 米夏（米海爾・約瑟・謝索洛夫，謝索洛夫皇國第一皇子，安雅的雙胞胎哥哥）══
     ver -1511，Ray 的 Stage10-B 稿。**報上身分之前／之後是兩個 id**
     （同 `PRIEST_X`／`PRIEST`、`OFFICER`／`RENNA` 的慣例）：
       · `MISHA_X` ＝畫面上是「？？？」—— 上城區那一夜玩家只看得到一個背影
       · `MISHA`   ＝蕾娜說破身分之後才用得上（**這一版還沒有他的戲**，先備著）
     ⚠⚠⚠ **ver -1549：圖到了，①② 都接上了**（Ray：「misha 先接上所有他的對話」）。
       -1511 那張清單的三件，現況：
       ① `art` 指到 `ART.misha` ── ✔ 做了（下面兩筆）
       ② 上城區那兩段的「立繪撤出」── ✔ 做了（`script/town.js` 那兩拍的 `hide`）
       ③ 「少年遠距離望了一眼主角」的插畫與「米夏眼部 CI」── **還沒接**
          （Ray -1549：「il 跟 ci 先不用管，之後我會編號命名」）
     ⚠⚠ 他那幾拍走 **`dark:true`（剪影）**，不是原色：那一夜蕾娜的台詞就是
       「燈光不夠，但是……」「總覺得那個人……是不是跟安雅有點像？」——
       看得一清二楚的話那兩句就沒有著落了。剪影是**跟著人走的狀態**（ver -954），
       他**每一句都要寫 `dark:true`**：漏一句 ＝ 那一句「他自己開口而沒有 dark」
       ＝ 揭曉，人當場變原色。
     ⚠ 名字欄照舊分兩個 id（`MISHA_X`＝？？？／`MISHA`＝報上名字之後），
       立繪是同一份 —— 與 `NEMO_X`／`CECILIE_X` 一模一樣。 */
  MISHA_X:  { name:'？？？',   art:'misha' },
  MISHA:    { name:'米夏',     art:'misha' },
};

/* ══ 立繪素材 ＋ 取景實測值 ══
   ⚠ cm / eye / fx / top / bot 是**量出來的**，不是估的。量法與原委見
     CLAUDE.md §6.5 與 flight/HANDOFF.md F 節。這份數字與 flight/index.html
     的 PORTRAIT 是**同一組**（同樣的圖、同樣的量測），改一邊要改兩邊。
       cm   角色身高（全域通用，任何畫面的立繪都照這個比例）
       top  圖中人物最上緣（頭頂）的像素 y
       bot  最下緣像素 y —— (bot-top) ÷ cm ＝ 這張圖的「每公分幾像素」
       fx   臉中心佔圖寬的比例（兩眼中心的中點）；橫向站位錨這個，不是圖框中心
       eye  單眼寬。**目前不參與運算**（CAST_EYE_MIX=0，鎖身高不鎖眼寬），
            留著是為了哪天要調回混合模式。
   ⚠ 縮放**鎖身高**不鎖眼寬（ver -266 起）。鎖眼寬會把畫風差異放大成體型差異。

   side：**固定站位**（ver -289，Ray 定案）：右 索菈娜・安雅／左 蕾娜・諾薇兒。
        不隨台詞變動 —— 同一個人每次都站同一邊，玩家才記得住誰是誰。
        與 flight/index.html 的 PORTRAIT.side 同義同值，改一邊要改兩邊。
   ⚠ ver -288 曾短暫改成「發起位制」（發起人站右、其他人左側輪），**已退回**。
     退回的原因不是規則不好，是**素材做不到**：立繪朝向是畫死的，換邊必須水平
     翻轉，而翻轉會把髮旋、配件、持物全部左右顛倒（實測蕾娜的板夾會換手）。

   alt：**另一側專用立繪**，目前四個人都是 null（圖還沒畫）。正解是同一個角色
        畫左右兩版，兩版到位之後要不要改回發起位制再議。
   ⚠⚠ 補圖時 **eye/fx/top/bot 四個值全部要重量** —— 那是**那一張圖**的數字，
     不同的畫不可能沿用。沿用的話人會歪掉，而且很難看出原因。
   ⚠ 目前沒有任何程式路徑會用到 alt（固定站位下沒有人會站到另一側），
     它是留給日後的接口，不是死碼。

   expr：表情/動作差分。鍵是腳本 line.portrait.expr 寫的 id，值是圖檔路徑。
   ⚠ **差分素材目前全部不存在**，所以每個人的 expr 都是空的 —— 這是預期狀態，
     不是漏填。story.js 查不到 expr 會**自動回退 base 立繪**並在 console 記一筆
     （見 story.js 的 missingExpr），所以腳本可以先照規格寫 expr，圖到位再補這張表。

   ⚠⚠⚠ **差分的鍵與檔名一律「無時態」**（ver -1555，Ray：「檔名時態全部拿掉，
     crying 改成 cry」「confused 改成 confuse，統一用無時態」）——
     `cry`／`die`／`scare`／`shock`／`think`／`surprise`／`blush`／`tire`／`write`…
     ⚠ 這一條由 `tools/script_lint.py` 的 `check_tense_exprs()` **會跑的檢查**守著
       （憲法：規矩要寫成會執行的東西），不是靠記性。

   ⚠⚠ **三個明寫的例外** —— 它們的無時態名字**已經被另一張圖佔住了**，
     兩張是不同的圖，合併會靜靜換掉那幾拍的表情（§鐵律 7）：

       anya.crying      ↔ anya.cry        （兩張不同的圖）
       nouvelle.thinking↔ nouvelle.think  （同上）
       renna.surprised  ↔ renna.surprise  （同上）

     ⚠ 等 Ray 給這三張新名字再改；**在那之前不要「順手統一」** ——
       改了不會有任何錯誤訊息，只會換掉那幾拍演的是哪張臉。 */
export const ART = {
  /* ⚠ `OFFICER`（正名前，顯示「監察官」）與 `RENNA`（正名後）**共用這一組 art**——
     同一個人、同一批立繪，只有顯示名不同（規格 §2、CLAUDE.md §8）。
     ⚠ 取景值逐張量（ver -347，量法同下方諾薇兒那段）。 */
  renna: { cm:169, eye:32, fx:0.519, top:1, bot:1521,
           side:'L', alt:null, base:'resources/si/renna_si_front.webp',
           expr:{ /* ver -870（森林行 G 稿）——measure_si 量測。 */
                  /* ══ stage7・木雅克神殿（ver -922，Ray 交稿）══ 同上。
                     ⚠ `front` 的圖早就在庫裡，只是一直沒進表（稿上點名了它）。 */
                  sighsweat:    { src:'resources/si/renna_si_sighsweat.webp', top:2, bot:1525, fx:0.536 },
                  shockopen:  { src:'resources/si/renna_si_shockopen.webp', top:4, bot:1519, fx:0.500 },
                  sigh:         { src:'resources/si/renna_si_sigh.webp', top:2, bot:1531, fx:0.522 },
                  front:        { src:'resources/si/renna_si_front.webp', top:5, bot:1521, fx:0.504 },
                  /* ══ Stage8 後段（ver -1092，Ray 交稿）══ 逐張量（alpha 上下緣＋
                     頭部那一段的水平重心）。⚠ `evalutating`／`evalutatingclosemouth`
                     的**圖早就在庫裡**，只是一直沒進表 —— 餐廳那一段的 lint 警告
                     （「沒有這張差分，會回退基本立繪」）就是它。 */
                  evaluate:  { src:'resources/si/renna_si_evaluate.webp', top:1, bot:1524, fx:0.491 },
                  evaluateclosemouth:
                                { src:'resources/si/renna_si_evaluateclosemouth.webp', top:3, bot:1524, fx:0.491 },
                  argue:        { src:'resources/si/renna_si_argue.webp',     top:9, bot:1524, fx:0.515 },
                  arguecute:    { src:'resources/si/renna_si_arguecute.webp', top:6, bot:1516, fx:0.515 },
                  wake:       { src:'resources/si/renna_si_wake.webp',        top:0, bot:1531, fx:0.539 },
                  unbraid:    { src:'resources/si/renna_si_unbraid.webp',     top:6, bot:1528, fx:0.550 },
                  callangry:  { src:'resources/si/renna_si_callangry.webp',   top:2, bot:1533, fx:0.516 },
                  commandsoft:{ src:'resources/si/renna_si_commandsoft.webp', top:6, bot:1532, fx:0.559 },
                  smile:   { src:'resources/si/renna_si_smile.webp',   top:5, bot:1530, fx:0.518 },
                  bow:     { src:'resources/si/renna_si_bow.webp',     top:0, bot:1530, fx:0.507 },
                  awkward: { src:'resources/si/renna_si_awkwerd.webp', top:6, bot:1526, fx:0.519 },
                  /* 帝都廣場那一段新增（ver -359）。`stare`＝直視／半瞇，用在她盯著人講話那幾拍。 */
                  stare:   { src:'resources/si/renna_si_stare.webp',   top:0, bot:1527, fx:0.515 },
                  surprise:{ src:'resources/si/renna_si_surprise.webp',top:8, bot:1524, fx:0.498 },
                  /* 北方泊地教堂那一段（ver -595，Ray 交稿）。取景值全部用
                     `tools/measure_si.py` 量的，沒有沿用別張。
                     ⚠ 交件是 PNG，依 §5 轉 WebP 之後才接（原 PNG 進 _originals）。 */
                  shockcalm:{src:'resources/si/renna_si_shockcalm.webp',top:4, bot:1516, fx:0.493 },
                  shout:   { src:'resources/si/renna_si_shout.webp',    top:4, bot:1534, fx:0.549 },
                  write:{ src:'resources/si/renna_si_write.webp', top:4, bot:1524, fx:0.507 },
                  ask:     { src:'resources/si/renna_si_ask.webp',     top:3, bot:1525, fx:0.489 },
                  /* 船塢那一段新增（ver -424，Ray 交件）。取景值是 `tools/measure_si.py`
                     量的，**每一張各自帶**（差分是不同姿勢，不是換臉，§6.5）。 */
                  watch:    { src:'resources/si/renna_si_watch.webp',    top:7, bot:1530, fx:0.492 },
                  shock:  { src:'resources/si/renna_si_shock.webp',  top:3, bot:1530, fx:0.492 },
                  run:      { src:'resources/si/renna_si_run.webp',      top:3, bot:1532, fx:0.611 },
                  scare:   { src:'resources/si/renna_si_scare.webp',   top:5, bot:1528, fx:0.498 },
                  surprised:{ src:'resources/si/renna_si_surprised.webp',top:0, bot:1522, fx:0.502 },
                  lookaway: { src:'resources/si/renna_si_lookaway.webp',   top:2, bot:1529, fx:0.532 },   // ver -842
                  lookawaytalk:{src:'resources/si/renna_si_lookawaytalk.webp',top:3,bot:1519, fx:0.545 },  // ver -842
                  tire:    { src:'resources/si/renna_si_tire.webp',    top:7, bot:1522, fx:0.495 },
                  /* ver -427 交件。`talkserious`＝正色說明、`talkwork`＝談公事、
                     `think`＝思索。取景值一張一張量（§6.5）。 */
                  talkserious:{src:'resources/si/renna_si_talkserious.webp',top:3, bot:1516, fx:0.509 },
                  talkwork: { src:'resources/si/renna_si_talkwork.webp',   top:3, bot:1519, fx:0.509 },
                  think: { src:'resources/si/renna_si_think.webp',   top:4, bot:1530, fx:0.515 },
                  /* ver -425 交件。`covermouth`＝掩口（驚訝／忍笑）、`cringe`＝尷尬皺眉。 */
                  covermouth:{src:'resources/si/renna_si_covermouth.webp',top:2, bot:1528, fx:0.512 },
                  cringe:   { src:'resources/si/renna_si_cringe.webp',    top:3, bot:1524, fx:0.502 },
                  cutescare:{ src:'resources/si/renna_si_scarecute.webp', top:0, bot:1530, fx:0.537 },
                  die:    { src:'resources/si/renna_si_die.webp',     top:2, bot:1518, fx:0.543 },
                  relief:   { src:'resources/si/renna_si_relief.webp',    top:3, bot:1525, fx:0.518 },
                  /* 北方泊地教堂那一幕（ver -624，Ray 交稿）。逐張量（tools/measure_si.py）。
                     ⚠ 交件時的拼字是 `evalutating`，ver -1555 去時態時一併改成 `evaluate`
                       —— 腳本裡寫的是鍵名，路徑只有這裡一處在對。 */
                  worry:    { src:'resources/si/renna_si_worry.webp',      top:6, bot:1527, fx:0.568 },
                  pause:    { src:'resources/si/renna_si_pause.webp',      top:3, bot:1525, fx:0.513 },
                  upsetstare:{src:'resources/si/renna_si_upsetstare.webp', top:0, bot:1524, fx:0.503 },
                  upset:    { src:'resources/si/renna_si_upset.webp',      top:2, bot:1524, fx:0.507 },   // Stage8（ver -953）
                  chase:    { src:'resources/si/renna_si_chase.webp',      top:4, bot:1532, fx:0.554 },
                  /* 娜塔莉那一幕（ver -636）。 */
                  invite:   { src:'resources/si/renna_si_invite.webp',     top:2, bot:1525, fx:0.537 },
                  /* 惡夢戰後那一幕的修正稿（ver -739，Ray 指定 Renna_SI_command）。
                     取景 tools/measure_si.py 量的。 */
                  command:  { src:'resources/si/renna_si_command.webp',    top:0, bot:1527, fx:0.502 },
                  /* 北方泊地第三天（ver -664，Ray 交稿）。逐張量（tools/measure_si.py）。 */
                  smile:    { src:'resources/si/renna_si_smile.webp',      top:5, bot:1529, fx:0.518 },
                  reach:    { src:'resources/si/renna_si_reach.webp',      top:2, bot:1528, fx:0.566 },
                  /* 墓地那一幕（ver -671，Ray 交稿）。逐張量（tools/measure_si.py）。 */
                  meltdown:    { src:'resources/si/renna_si_meltdown.webp',    top:0,  bot:1535, fx:0.528 },
                  meltdowncry: { src:'resources/si/renna_si_meltdowncry.webp', top:4,  bot:1532, fx:0.607 },
                  scarejump:   { src:'resources/si/renna_si_scarejump.webp',   top:0,  bot:1533, fx:0.632 },
                  scarecute:   { src:'resources/si/renna_si_scarecute.webp',   top:0,  bot:1530, fx:0.537 },
                  blush:     { src:'resources/si/renna_si_blush.webp',     top:8,  bot:1522, fx:0.551 },
                  lookdown:    { src:'resources/si/renna_si_lookdown.webp',    top:6,  bot:1524, fx:0.548 },
                  chase2:      { src:'resources/si/renna_si_chase2.webp',      top:11, bot:1529, fx:0.579 },
                  /* stage2 出航（ver -741，Ray 交稿）。逐張量（measure_si.py）。 */
                  curious:     { src:'resources/si/renna_si_curious.webp',     top:0,  bot:1526, fx:0.529 },
                  intense:     { src:'resources/si/renna_si_intense.webp',     top:6,  bot:1526, fx:0.629 },
                  lookup:      { src:'resources/si/renna_si_lookup.webp',      top:5,  bot:1520, fx:0.510 },   // ver -746 交件補量
                  /* 湖上甲板（ver -744，Ray 的 stage5 稿）。逐張量。 */
                  intense2:    { src:'resources/si/renna_si_intense2.webp',    top:5,  bot:1520, fx:0.510 },
                  /* ══ 伊甸古墓・墓門那一段（ver -1188，Ray 交稿）══ 交件是 PNG，
                     依 §5 轉 WebP；取景值逐張量（`tools/measure_si.py`）。 */
                  sad:         { src:'resources/si/renna_si_sad.webp',         top:5,  bot:1517, fx:0.520 },
                  askserious:  { src:'resources/si/renna_si_askserious.webp',  top:3,  bot:1527, fx:0.525 },
                  /* ══ 貝利薩爾・祭壇那一段（ver -1372）══ 腳本（-1353）早就在用這兩個名字，
                     圖是 Ray 這一輪才交的 —— 在那之前 `script_lint.py` 一直報
                     「沒有這張差分，會回退基本立繪」（**靜靜回退，畫面上沒有錯誤訊息**）。
                     交件是 PNG，依 §5 轉 WebP、原 PNG 收進 `_originals/SI/`；
                     取景值逐張量（`tools/measure_si.py`），**不沿用別張**（§6.5）——
                     這兩張都是大動作的姿勢，臉本來就不在圖的正中：
                     `fx` 0.644／0.608 比她平常那幾張（≈0.52）偏右將近一成的圖寬，
                     沿用舊值會把她整個往左推一大截。 */
                  /* ⚠ ver -1439：Ray 交了新版（同名覆蓋）⇒ **路徑要帶 `?v=`**，
                     不然瀏覽器抱著舊的那一份不放（§5 的老坑，而症狀只是「圖沒換」）。
                     ⚠ `top`／`bot` 已重量（7→8／1527→1535，那是那一張圖的客觀事實）。
                     ⚠⚠ `fx` **沿用 0.644**：臉的位置沒有可靠的自動量法（§6.5），
                       而新圖的輪廓重心只往左移了約 1% —— 畫面上她若偏了就調這一個數字，
                       **不要去動 `top`／`bot`**。 */
                  scream:      { src:'resources/si/renna_si_scream.webp?v=2', top:8,  bot:1535, fx:0.644 },
                  /* ══ 貝利薩爾之後那一夜（ver -1386，Ray 交稿）══ 逐張量（measure_si.py）。 */
                  cry:      { src:'resources/si/renna_si_cry.webp',      top:5,  bot:1534, fx:0.585 },
                  lookfaropen: { src:'resources/si/renna_si_lookfaropen.webp', top:12, bot:1517, fx:0.572 },
                  reachcry:    { src:'resources/si/renna_si_reachcry.webp',    top:2,  bot:1533, fx:0.608 },
    /* ══ 差分擴充 18 張（ver -1503 美術交件，-1507 接線）══
       取景值是美術用 `tools/measure_si.py` 量的，**程式端逐張複驗過**（72 張全對）。
       ⚠ `sleepdesk` 趴在桌上，**不是全身圖**（縱向只佔 43%）—— `top/bot` 不可當身高用，
         走 `cm`（管大小）＋ `standCm`（管頭擺多高）兩個旋鈕，見檔頭 §5 的說明。 */
    apologize: { src:'resources/si/renna_si_apologize.webp', top:5, bot:1484, fx:0.521 },
    armcross:  { src:'resources/si/renna_si_armcross.webp', top:2, bot:1522, fx:0.482 },
    back:      { src:'resources/si/renna_si_back.webp', top:5, bot:1502, fx:0.504 },
    blushangry:{ src:'resources/si/renna_si_blushangry.webp', top:7, bot:1506, fx:0.511 },
    coldstare: { src:'resources/si/renna_si_coldstare.webp', top:8, bot:1501, fx:0.497 },
    determine:{ src:'resources/si/renna_si_determine.webp', top:7, bot:1519, fx:0.495 },
    handout:   { src:'resources/si/renna_si_handout.webp', top:5, bot:1519, fx:0.505 },
    holdfile:  { src:'resources/si/renna_si_holdfile.webp', top:4, bot:1505, fx:0.499 },
    laugh:     { src:'resources/si/renna_si_laugh.webp', top:5, bot:1500, fx:0.522 },
    lookaside: { src:'resources/si/renna_si_lookaside.webp', top:4, bot:1519, fx:0.513 },
    nod:       { src:'resources/si/renna_si_nod.webp', top:7, bot:1520, fx:0.508 },
    pointmap:  { src:'resources/si/renna_si_pointmap.webp', top:4, bot:1511, fx:0.507 },
    salute:    { src:'resources/si/renna_si_salute.webp', top:1, bot:1495, fx:0.486 },
    side:      { src:'resources/si/renna_si_side.webp', top:5, bot:1502, fx:0.503 },
    sipdrink:  { src:'resources/si/renna_si_sipdrink.webp', top:4, bot:1513, fx:0.492 },
    sleepdesk: { src:'resources/si/renna_si_sleepdesk.webp', top:436, bot:1098, fx:0.595, cm:52, standCm:135 },   // 座（非全身圖）
    smilesoft: { src:'resources/si/renna_si_smilesoft.webp', top:6, bot:1520, fx:0.503 },
    whisper:   { src:'resources/si/renna_si_whisper.webp', top:7, bot:1519, fx:0.566 },
  } },
  /* ⚠⚠ 諾薇兒的表情差分是**不同姿勢**（跑、畏縮、驚恐、絕望、驚訝），不是換臉，
       所以每一張**各帶自己的 top/bot/fx**（ver -325 量完）。
       ⚠ 沿用 front 那一組的後果實測過：Scared 的臉其實在 0.397，照 0.564 擺會
         把她往左推 77px，人整個貼在畫面左緣（Ray：「立繪太靠畫面邊緣」）。
       量法（照 CLAUDE.md §6.5 與 HANDOFF F 節，可重跑）：
         · top/bot＝alpha>24 的上下緣。六張的身高 1519~1533，彼此一致 →
           確認都是全身構圖，alpha 邊界就是頭頂與腳底。
         · fx＝**頭部那一段**（頭頂往下 8% 身高）的 alpha 加權橫向重心 ÷ 圖寬。
           校準：同法量 front 得 0.571（表上 0.564，差 −0.007）、璐娜莉亞得 0.494
           （表上 0.496，差 +0.002）—— 兩個獨立校準都落在 ±0.007 內，所以直接用。
         · eye 沒量（CAST_EYE_MIX=0 不參與運算）。 */
  /* ⚠⚠ `mirror:true`（ver -625，Ray：「諾薇兒跟索菈娜左右是對稱的，可以水平翻轉」）
     ＝**這個角色的立繪換到非預設那一側時可以水平翻轉**。這是 §6.5「立繪朝向是畫死的，
     換邊要水平翻轉，髮旋與持物會左右顛倒」那條的**例外開關**：翻不翻由**這張畫**決定，
     所以寫在角色上、預設不翻 —— 有髮旋／單邊持物／不對稱制服的人不要加這一格。
     ⚠ 蕾娜**沒有**這一格（Ray：「蕾娜原則右，碰到安雅就放左，因為蕾娜整體框細，
       受左右影響小」）—— 她換邊就是換邊，不翻。 */
  nouvelle: { cm:165, eye:40, fx:0.582, top:3, bot:1536, mirror:true,
           side:'L', alt:null, base:'resources/si/nouvelle_si_front.webp',
           expr:{ /* ══ 瓦努努遺蹟・NIEM 那一段（ver -1186，Ray 交稿）══ 同上，逐張量。
                     ⚠ 檔名 `expain2` 是交件時的拼字（少一個 l），鍵名照 Ray 的稿寫
                       —— 他的腳本上就是 `Nouvelle_SI_expain2`。
                     ⚠ `think` 與既有的 `thinking` 是**兩張不同的圖**，不要合併。 */
                  expain2:  { src:'resources/si/nouvelle_si_expain2.webp', top:3, bot:1535, fx:0.579 },
                  /* ⚠ **同一張圖的別名**（ver -1186）：交件的檔名少一個 l（`expain2`），
                     而 Ray 的稿有時寫 `explain2`（正確拼法）。兩個鍵指同一張、
                     取景值照抄（§6.5：同一個姿勢就直接沿用，不要逐張重量）。
                     ⚠ `shinier_ruins.darkbridge` 那一段本來就在用 `explain2`，
                       之前一直回退基本立繪 —— 這一條順手把它修好。 */
                  explain2: { src:'resources/si/nouvelle_si_expain2.webp', top:3, bot:1535, fx:0.579 },
                  think:    { src:'resources/si/nouvelle_si_think.webp',   top:5, bot:1525, fx:0.551 },
                  /* 艦鬥教學那幾拍（ver -424，Ray 交件）：她穩住陣腳的姿勢。 */
                  /* ══ stage7・木雅克神殿（ver -922，Ray 交稿）══ 交件是 PNG，依 §5 轉 WebP；
                     取景值是 `tools/measure_si.py` 量的（差分不沿用別張，§6.5）。
                     ⚠ `decoding` ＝她「讀」古代文字那幾拍專用。 */
                  /* ⚠⚠ **這一張是近景，不是全身**（ver -924，Ray：「諾薇兒 worry 不是全身圖」；
                     §6.5「半身/近景絕對不能照量 alpha 上下緣」）：alpha 量到的 1531px
                     被當成 165cm ⇒ 她整個放大 18% 壓過別人。
                     · `cm:139` ＝**這張畫該佔多少公分**：量「頭頂→脖」的距離對照全身圖
                       （worry 284px vs front 240px ⇒ 這張畫大 1.18 倍 ⇒ 165÷1.18≈139）。
                     · `standCm:165` ＝她**站姿的身高**，只管頭頂擺多高（不然頭會掉下去）。
                     ⚠ 只調 `cm` 一定失敗（那條規矩寫在 §6.5）：兩個旋鈕各管一件事。 */
                  worry:        { src:'resources/si/nouvelle_si_worry.webp', top:4, bot:1535, fx:0.683,
                                  cm:139, standCm:165 },
                  thinking:     { src:'resources/si/nouvelle_si_thinking.webp', top:3, bot:1535, fx:0.532 },
                  decode:     { src:'resources/si/nouvelle_si_decode.webp', top:4, bot:1528, fx:0.579 },
                  /* ══⚠⚠ ver -1547：美術**重交了 `sadsmilenoeye`（同名覆蓋）＋ 新增 `sadnoeye`**══
                     兩張都是「低著頭、瀏海蓋住眼睛」，差別只在**嘴角**（笑／不笑）。
                     ⚠⚠ 同名覆蓋一定要掛 **`?v=2`**（§5）：瀏覽器以 URL 為鍵，
                       檔名沒變它照樣拿舊的那一份，而症狀只是「圖沒換」，查不出原因。
                     ⚠ `top`/`bot`/`fx` **是新圖重量的**（`tools/measure_si.py`）——
                       舊值 `2/1527/0.556`，新值 `3/1531/0.568`，沿用舊值臉會偏。
                     ⚠⚠ **腳本現在一個都沒有在用 `sadsmilenoeye`**（ver -1547，Ray：
                       「諾薇兒的 sadsmilenoeye 換成 sadsmile」—— 五處全換了）。
                       接著留在這裡是因為**圖存在**：日後要「把臉藏起來」那一拍就用得上。 */
                  sadsmilenoeye:{ src:'resources/si/nouvelle_si_sadsmilenoeye.webp?v=2', top:3, bot:1531, fx:0.568 },
                  sadnoeye: { src:'resources/si/nouvelle_si_sadnoeye.webp',      top:2, bot:1528, fx:0.552 },
                  bigsmileclose:{ src:'resources/si/nouvelle_si_bigsmileclose.webp', top:4, bot:1529, fx:0.568 },
                  die:        { src:'resources/si/nouvelle_si_die.webp', top:4, bot:1524, fx:0.614 },
                  steady:   { src:'resources/si/nouvelle_si_steady.webp',   top:8,  bot:1529, fx:0.534 },
                  /* ver -870（森林行 G 稿）。front＝基本立繪的別名（稿上點名了它）。 */
                  sleepy:   { src:'resources/si/nouvelle_si_sleepy.webp',   top:5,  bot:1535, fx:0.580 },
                  front:    { src:'resources/si/nouvelle_si_front.webp',    top:3,  bot:1536, fx:0.582 },
                  /* 北方泊地碼頭那一幕的收尾（ver -582，Ray 交稿「沒錯！我們上吧！」）。
                     ⚠ 交件是 PNG，依 §5 的規約轉成 WebP 後才接（原 PNG 留在 resources/SI）。
                     ⚠ 取景值是 `tools/measure_si.py` 量的，不是沿用 `run` 那一張。 */
                  runserious:{src:'resources/si/nouvelle_si_runserious.webp',top:12, bot:1521, fx:0.402 },
                  /* ver -427 交件：酒館第一句要的那張（在此之前一直回退基本立繪）。 */
                  pray:     { src:'resources/si/nouvelle_si_pray.webp',     top:0,  bot:1533, fx:0.535 },
                  /* 北方泊地教堂那一段（ver -595，Ray 交稿）。`relief` 交件是 PNG，
                     依 §5 轉 WebP 之後才接；`saintinstall` 的圖早就在，只是沒進表。 */
                  relief:   { src:'resources/si/nouvelle_si_relief.webp',   top:4,  bot:1530, fx:0.540 },
                  /* 娜塔莉那一幕（ver -636）。 */
                  sad:      { src:'resources/si/nouvelle_si_sad.webp',      top:3,  bot:1534, fx:0.481 },
                  /* ⚠⚠ **法環不算在身高裡**（ver -635，Ray：「戰鬥中諾的 saint install
                     立繪太小，因為你把法環也納入總高了，抓臉的大小調整」）。
                     這張圖頭頂上有一圈金色法環，照 alpha 上下緣量會把它算進人物身高
                     （舊值 top:3 ＝法環頂）—— 於是「鎖身高」把她整個縮小 5%，
                     而且因為 `top` 偏高，位置也被往下壓了 73px×縮放。
                     §6.5 早就寫了「髮飾／帽子／武器超出頭頂會污染 `top`，量的是
                     **人物最上緣**」—— 這就是那一條。
                     ⚠ 現行值是量**頭髮**（暗紅棕，濾掉金色法環）到**腳底**
                     （只看畫面中央那一段，避開兩側垂下的緞帶）：76 / 1519。
                     ⚠ `rescale:true`：這張圖把她畫得比基本立繪小一號
                     （1443 vs 1523 px），所以縮放要用**它自己的**身高，
                     不是基本立繪的（見 tutorial.placePortraitX 的說明）。 */
                  saintinstall:{src:'resources/si/nouvelle_si_saintinstall.webp',top:76,bot:1519,fx:0.505, rescale:true },
                  run:      { src:'resources/si/nouvelle_si_run.webp',       top:13, bot:1533, fx:0.418 },
                  cringe:   { src:'resources/si/nouvelle_si_cringe.webp',    top:5,  bot:1533, fx:0.459 },
                  /* ⚠⚠⚠ 這裡**曾經有第二個 `scared:`**（指向舊的 `Nouvelle_SI_Scared.webp`），
                     而本區塊尾巴（湖上甲板 ver -744）又寫了一個 `scared:` 指向重畫版
                     `Nouvelle_SI_Scared2.webp` —— **同一個物件實字裡兩把同名鑰匙，
                     後面那一把靜靜贏**（鐵律 7：一個量只有一個定義點）。
                     後果有兩層，**兩層都沒有任何錯誤訊息**：
                       ① 每一句 `nou('scare')` 其實都拿到重畫版，前面那一行是死碼；
                       ② 於是誰都不知道舊圖已經沒有人在用了。
                     ver -1372 收成尾巴那唯一的一個定義（＝**維持今天畫面上真正在跑的那一張**，
                     不趁機換圖）。⚠ `Nouvelle_SI_Scared.webp` 因此成為**孤兒素材** ——
                     要不要走 `tools/recycle.sh` 是 Ray 的決定（§5：回收區是唯一的刪除出口）。
                     ⚠ 自檢：`node --input-type=module --check` **驗不出**重複鍵
                     （物件實字的重複鍵在非嚴格模式下合法），所以這一類只能靠人看或另外寫檢查。 */
                  desperate:{ src:'resources/si/nouvelle_si_desperate.webp', top:2,  bot:1532, fx:0.415, faceFx:0.450, faceZoomK:0.79 },
                  surprise: { src:'resources/si/nouvelle_si_surprise.webp',  top:5,  bot:1524, fx:0.487 },
                  /* 會客廳那一幕的四張（ver -348）。
                     ⚠⚠ `gossip1` 的臉在 **0.710** —— 其他差分落在 0.39~0.60，這張她整個人
                       偏右。沿用別張的 fx 會把她推出畫面，這就是「每張差分都要自己量」的活例子。 */
                  awkward:  { src:'resources/si/nouvelle_si_awkwerd.webp',   top:2,  bot:1534, fx:0.468 },
                  gossip1:  { src:'resources/si/nouvelle_si_gossip1.webp',   top:0,  bot:1536, fx:0.710 },
                  gossip2:  { src:'resources/si/nouvelle_si_gossip2.webp',   top:2,  bot:1536, fx:0.603 },
                  shy:      { src:'resources/si/nouvelle_si_shy.webp',       top:4,  bot:1533, fx:0.592 },
                  /* ⚠ `whisper` 的臉在 **0.697**（其他差分 0.39~0.60）——她整個人偏右，
                     與 `gossip1`（0.710）同一類構圖。沿用別張會把她推出畫面。 */
                  whisper:  { src:'resources/si/nouvelle_si_whisper.webp',   top:8,  bot:1530, fx:0.697 },
                  talk:     { src:'resources/si/nouvelle_si_talk.webp',      top:3,  bot:1535, fx:0.582 },   // ver -752
                  explain:  { src:'resources/si/nouvelle_si_expain.webp',    top:2,  bot:1526, fx:0.582 },   // ver -772（檔名 expain 照交件）
                  /* 城鎮探索那一段新增（ver -369）。 */
                  sadsmile: { src:'resources/si/nouvelle_si_sadsmile.webp',  top:5,  bot:1532, fx:0.587 },
                  hungry:   { src:'resources/si/nouvelle_si_hungry.webp',    top:0,  bot:1536, fx:0.579 },
                  /* Stage8（ver -953）。逐張量（measure_si.py）。
                     ⚠ `awkwerd` 的鍵照檔名拼（Ray 的稿寫 Awkwerd）—— 鍵與檔名對得上才找得到圖，
                       同 sorana 的 `lauaghbig`，不要「修正」它。 */
                  /* ⚠⚠⚠ **舉起的手不算「人物最上緣」**（ver -1510，Ray：「這張立繪都放太低了，
                     以臉部為高度判別修正」）—— 與 §6.5 的法環那一條（-635）是**同一個坑**：
                     `measure_si` 量的是 alpha 的上下緣，而她把手舉過頭頂 ⇒ 量到的 `top:1`
                     是**手指尖**，不是頭。後果有兩層，而且兩層都往同一個方向錯：
                       ① `top` 太高 → 引擎把「圖的上緣」對到頭線 ⇒ 她整個被壓低 123px×縮放
                       ② `bot−top` 被撐大 8.8% → 鎖身高時她又被縮小 8.8%
                     `fx:0.393` 同樣是污染的：那個值取自「頭頂往下 8% 身高」那一條帶，
                     而在這張圖裡**那一整條帶都是手臂與袖子**，量到的是袖子的重心。
                     ⚠ 正解是量**人**：手完全落在 x<500，頭從 x=500 那一側進來 ⇒ 頭頂 row 124；
                       臉（兩眼中點）放大加刻度尺目視 ⇒ 0.62。`bot:1529` 是她真的下緣，不動。 */
                  risehand: { src:'resources/si/nouvelle_si_risehand.webp',  top:124, bot:1529, fx:0.620 },
                  awkwerd:  { src:'resources/si/nouvelle_si_awkwerd.webp',   top:2,  bot:1533, fx:0.468 },
                  /* ⚠ 別名（同上，ver -1186）：Ray 的稿寫 `shock`。 */
                  shock:    { src:'resources/si/nouvelle_si_shock.webp',   top:3,  bot:1534, fx:0.504 },
                  lookaway: { src:'resources/si/nouvelle_si_lookaway.webp',  top:5,  bot:1529, fx:0.504 },
                  /* ⚠ ver -1092 Ray **重交了這一張**（同名覆蓋）→ `?v=2`（§5：不掛
                     cache-buster 的話瀏覽器會抱著舊的那一份），取景值也**重量過**
                     （§5「換圖就要重量取景值」：0.583→0.517，差了 6.6% 的圖寬）。 */
                  /* ⚠⚠⚠ ver -1182：美術把 -1092 交的那張改名成 `Nouvelle_SI_furious`，
                     **舊的那張 angry 放回原檔名** —— 所以這裡是**兩張圖兩筆**，
                     不是改個名字而已。
                     ⚠ 取景值是**那一張圖**的（§5）：`angry` 那一組（3/1535/0.583）是
                       ver -842 對舊圖量的、`furious` 那一組（8/1528/0.517）是 -1092 對
                       新圖量的 —— **不要互換也不要互抄**。
                       驗過：兩張的 alpha 上下緣正好是 3..1535 與 8..1528。
                     ⚠ `angry` 掛 **?v=3**：同一個檔名的內容又換了一次（新圖→舊圖），
                       不跳號的話瀏覽器拿到的還是「已經改名走了的那一張」（§5）。
                     ⚠ `_originals/SI/` 那張 PNG 實測就是**新圖**，已一併改名成
                       `Nouvelle_SI_furious.png`。**舊 angry 沒有 `_originals` 備份**
                       （-1092 同名覆蓋時就沒了），它現在的來源是 git 歷史。 */
                  angry:    { src:'resources/si/nouvelle_si_angry.webp?v=3',   top:3,  bot:1535, fx:0.583 },   // ver -842 的舊圖（-1182 放回來）
                  furious:  { src:'resources/si/nouvelle_si_furious.webp',     top:8,  bot:1528, fx:0.517 },   // ver -1092 交的那張（-1182 改名）
                  bigsmile: { src:'resources/si/nouvelle_si_bigsmile.webp',  top:4,  bot:1534, fx:0.565 },
                  /* 舊街區／公會那一段新增（ver -375）。取景由 `tools/measure_si.py` 量出來的。 */
                  concern:  { src:'resources/si/nouvelle_si_concern.webp',   top:6,  bot:1529, fx:0.505 },
                  happy:    { src:'resources/si/nouvelle_si_happy.webp',     top:1,  bot:1533, fx:0.578 },
                  shock2: { src:'resources/si/nouvelle_si_shock2.webp',  top:3,  bot:1533, fx:0.541 },
                  /* 北方泊地第三天（ver -664）：回頭看。 */
                  lookback: { src:'resources/si/nouvelle_si_lookback.webp',  top:2,  bot:1528, fx:0.661 },
                  /* stage2 出航（ver -741，Ray 交稿）：揮手道別。 */
                  wave:     { src:'resources/si/nouvelle_si_wave.webp',      top:13, bot:1535, fx:0.483 },
                  /* 湖上甲板（ver -744）。⚠ 檔案是 **Scared2**：美術 session 把舊的
                     Nouvelle_SI_Scared.webp 換成這一張（重畫），鍵名照稿寫 scared。 */
                  scare:   { src:'resources/si/nouvelle_si_scare2.webp',   top:9,  bot:1530, fx:0.399 },
    /* ══ 差分擴充 18 張（ver -1503 美術交件，-1507 接線）══
       ⚠ `apologize`／`reach` 的 `fx` 是**目視重量**的：measure_si 量的是「頭頂往下 8%」
         那一條整帶的重心，而鞠躬（看不到臉）與伸出去的手都會把它拉走。
       ⚠ `sleep` 不是全身圖 → `cm` ＋ `standCm`。 */
    apologize: { src:'resources/si/nouvelle_si_apologize.webp', top:72, bot:1496, fx:0.645 },   // fx 目視重量（量到 0.662）
    armcross:  { src:'resources/si/nouvelle_si_armcross.webp', top:3, bot:1528, fx:0.571 },
    blush:   { src:'resources/si/nouvelle_si_blush.webp', top:4, bot:1512, fx:0.572 },
    coldstare: { src:'resources/si/nouvelle_si_coldstare.webp', top:4, bot:1512, fx:0.560 },
    covermouth:{ src:'resources/si/nouvelle_si_covermouth.webp', top:3, bot:1529, fx:0.567 },
    cry:       { src:'resources/si/nouvelle_si_cry.webp', top:4, bot:1526, fx:0.581 },
    eat:       { src:'resources/si/nouvelle_si_eat.webp', top:3, bot:1529, fx:0.578 },
    handout:   { src:'resources/si/nouvelle_si_handout.webp', top:4, bot:1526, fx:0.579 },
    lookdown:  { src:'resources/si/nouvelle_si_lookdown.webp', top:8, bot:1526, fx:0.581 },
    nod:       { src:'resources/si/nouvelle_si_nod.webp', top:8, bot:1516, fx:0.574 },
    point:     { src:'resources/si/nouvelle_si_point.webp', top:0, bot:1519, fx:0.561 },
    reach:     { src:'resources/si/nouvelle_si_reach.webp', top:35, bot:1499, fx:0.575 },   // fx 目視重量（量到 0.512）
    salute:    { src:'resources/si/nouvelle_si_salute.webp', top:5, bot:1517, fx:0.565 },
    sigh:      { src:'resources/si/nouvelle_si_sigh.webp', top:5, bot:1535, fx:0.579 },
    sleep:     { src:'resources/si/nouvelle_si_sleep.webp', top:233, bot:1301, fx:0.435, cm:104, standCm:135 },   // 座（非全身圖）
    smug:      { src:'resources/si/nouvelle_si_smug.webp', top:3, bot:1525, fx:0.562 },
    stare:     { src:'resources/si/nouvelle_si_stare.webp', top:2, bot:1523, fx:0.586 },
    wet:       { src:'resources/si/nouvelle_si_wet.webp', top:3, bot:1524, fx:0.582 },
  } },
  /* ⚠ 索菈娜用 **side** 那張：front 橫向佔 78%，兩人同台一定疊；側面只佔 69%。
     ⚠⚠ ver -752：front／side 換了新圖（同名覆蓋 → 掛 ?v=2，§5）＋湖上甲板
       登場稿的 12 張差分逐張量（measure_si.py）。
     ⚠⚠ ver -753（Ray：「索菈娜有些圖會太大」）：壓低重心／鞠躬那幾張人物
       畫得比 front 滿版，鎖身高會放大 —— 逐張給 `cm`（-636 的旋鈕，expr 層
       蓋過角色層；看渲染結果調的，重量 top/bot 不會治這個）。standCm 不動
       （舞台只看得見上半身，頭頂錨著就對）。
       `flight/index.html` 的 PORTRAIT.sorana 是同一組數字，改一邊要改另一邊。 */
  /* `faceFx` ＝小方框頭像的橫向錨（ver -1046）：側面圖的臉在正中、身體偏右，
     照 `fx`（0.498）擺會把她右半切掉 —— 往右挪一截才框得住頭與肩。 */
  sorana: { cm:176, eye:27, fx:0.498, faceFx:0.62, top:4, bot:1526, mirror:true,
           side:'R', alt:null, base:'resources/si/sorana_si_side.webp?v=2', expr:{
    /* stage7・木雅克神殿（ver -922，Ray 交稿）。 */
    confuse:      { src:'resources/si/sorana_si_confuse.webp', top:6, bot:1522, fx:0.510 },
    front:        { src:'resources/si/sorana_si_front.webp?v=2',     top:3,  bot:1523, fx:0.659 },
    side:         { src:'resources/si/sorana_si_side.webp?v=2',      top:4,  bot:1526, fx:0.498 },
    /* ⚠⚠ ver -1047 交件（「無飛刀」那一張）：目前**只給破防計量表的頭像用**，
       所以只量了頭像要的 `faceFx`（頭那一塊的水平重心）。
       **要拿去演對白之前，`top`／`bot`／`fx` 必須先量過**（§6.5「新增立繪要量什麼」）
       —— 現在不寫，`frameOf` 會沿用 side 那一張的取景，姿勢不同一定會歪。 */
    panic:        { src:'resources/si/sorana_si_panic.webp', faceFx:0.632, faceZoomK:0.51 },
    guard:        { src:'resources/si/sorana_si_guard.webp',         top:9,  bot:1527, fx:0.651, cm:168 },
    guardtalk:    { src:'resources/si/sorana_si_guardtalk.webp',     top:5,  bot:1529, fx:0.653, cm:168 },
    guardthink:{ src:'resources/si/sorana_si_guardthink.webp', top:8,  bot:1529, fx:0.672, cm:168 },
    embarrass:   { src:'resources/si/sorana_si_embarrass.webp',    top:5,  bot:1527, fx:0.551 },
    /* 夏爾村・夜襲之後那一段（`shinier.wild`）的「唉——又是南面那個遺蹟」。
       圖 ver -772 那一批就交了，但一直沒轉檔也沒登記 —— 於是那三句一路回退成
       基本立繪（script_lint 每次都在喊「SORANA 沒有 tired 這張差分」），ver -1290 補上。
       ⚠ `fx` **不是 measure_si.py 那個 0.489**：她把左手舉到頭後，手臂落進
         「頭頂往下 8% 身高」那條取樣帶裡，把重心拉偏了（同 §5 法環污染那一條）。
         改量兩眼睫毛的中點＝0.511（銀白髮的橫向重心 0.508 獨立佐證）。
       ⚠ 人物像素身高 1520，與基本立繪的 1522 差 0.1%＝雜訊，所以**不加 `rescale`**。
       ⚠ `bot` 是腳底不是裙襬的流蘇：實測 y=1500 只剩 x518..637（那是腳），流蘇沒那麼低。 */
    tire:        { src:'resources/si/sorana_si_tire.webp',         top:2,  bot:1522, fx:0.511 },
    /* 瞭望（ver -1281，貝利薩爾降不下去那一段）。⚠ 取景值與 `flight/index.html`
       的 `PORTRAIT_EXPR.sorana.watch` **是同一次量測**，改一邊要改兩邊（§5／§6.10）。
       ⚠⚠ 飛行頁那一邊另外掛 **`cm:132 / standCm:168`**（ver -1289 的定案值，Ray 驗收過）
         —— 那是**那個畫面的擺法**，不是這張圖的性質，所以不抄過來；
         這裡要用到時再照劇情頁自己的規矩調。
       ⚠ ver -1291 更正：這一段原本寫的是 `cm:80 / standCm:176 / anchorBot`，
         那是 **-1280 的中途值**，被 -1281~-1289 那一串取代了（`anchorBot` 也拿掉了）。
         交叉註解寫錯比沒寫更糟 —— 下一個人會照著它去改另一邊。 */
    watch:        { src:'resources/si/sorana_si_watch.webp',        top:6,  bot:1521, fx:0.680 },
    sorry:        { src:'resources/si/sorana_si_sorry.webp',         top:12, bot:1528, fx:0.511, cm:166 },
    talk:         { src:'resources/si/sorana_si_talk.webp',          top:7,  bot:1525, fx:0.508 },
    laugh:        { src:'resources/si/sorana_si_laugh.webp',         top:3,  bot:1529, fx:0.579, cm:170, standCm:176 },
    amaze:       { src:'resources/si/sorana_si_amaze.webp',        top:3,  bot:1527, fx:0.562 },
    /* 伊甸古墓・墓門那一段（ver -1188，同上，逐張量）。 */
    whisper:      { src:'resources/si/sorana_si_whisper.webp',       top:4,  bot:1524, fx:0.524 },
    /* ══ Stage8 後段（ver -1092，Ray 交稿）══ 逐張量。
       ⚠ `excite`／`excite2` 的畫布不是規約的 1024×1536（1028×1530／1026×1532）——
         那是裁切的誤差，**不是另一個尺**，所以**不加 `rescale`**：讓它照基本立繪的
         身高縮放，同一個人才不會忽大忽小（§5 的預設就是這樣）。
       ⚠⚠ `excite2` 的人物比基本立繪短 2.4%（雙手舉高、`bot` 只到 1487）——
         Ray 交稿時特別註明「注意不要裁到角色」。不加 `rescale` 正是為了這件事：
         加了它會用這一張自己的身高當分母，人反而被放大、頭頂更容易頂出框。 */
    /* ⚠ ver -1105：Ray 換了新圖（同名覆蓋）→ `?v=2` 是**必要的**（§5：瀏覽器以 URL 為鍵，
       檔名沒變、內容變了它照樣拿舊的那一份），取景值也**重量過**
       （top 0→6／bot 1535→1526／fx 0.500→0.454，沿用舊值會歪一截）。
       ⚠ `flight/index.html` 的 `PORTRAIT_EXPR.sorana.cringe` 是同一組數字，兩邊都改了。 */
    cringe:       { src:'resources/si/sorana_si_cringe.webp?v=2',   top:6,  bot:1526, fx:0.454 },
    excite:       { src:'resources/si/sorana_si_excite.webp',        top:9,  bot:1521, fx:0.674 },
    excite2:      { src:'resources/si/sorana_si_excite2.webp',       top:4,  bot:1487, fx:0.688 },
    furiouscute:  { src:'resources/si/sorana_si_furiouscute.webp',   top:9,  bot:1527, fx:0.474 },
    think:        { src:'resources/si/sorana_si_think.webp',         top:3,  bot:1530, fx:0.529, cm:168, standCm:176 },
    idea:         { src:'resources/si/sorana_si_idea.webp',          top:3,  bot:1525, fx:0.523 },
    /* 夏爾村抵達稿（ver -772，Ray 交稿）。逐張量（measure_si.py）。
       ⚠ smirk/smile/remind/back/readysmile 交件是**白底**，程式端邊緣泛洪去背
         （白衣白髮保住，未去背原稿留在 _originals/SI 以備重做——Ray 指定不刪）。
       ⚠ `lauaghbig` 的拼法照稿（檔名如此），不要「修正」成 laughbig——鍵與檔名
         對得上才找得到圖。 */
    smirk:        { src:'resources/si/sorana_si_smirk.webp',         top:8,  bot:1528, fx:0.582 },
    lauaghbig:    { src:'resources/si/sorana_si_lauaghbig.webp',     top:4,  bot:1529, fx:0.492 },
    remind:       { src:'resources/si/sorana_si_remind.webp',        top:4,  bot:1525, fx:0.523 },
    /* ver -953：美術把 webp 換成新畫的 png，webp 版一度從磁碟消失（speakers 指得到、
       檔案卻不在）。轉回 webp 並**重量取景**（fx 0.547→0.528，差 0.019＝橫向約 19px，
       沿用舊值她會偏一格）；`?v=2` 是同名覆蓋的快取破除（§5）。 */
    smile:        { src:'resources/si/sorana_si_smile.webp?v=2',    top:9,  bot:1530, fx:0.528 },
    /* ver -953：Ray 為 Stage8「索：dying」補的圖（他原話：「dying 進去了」）。 */
    die:        { src:'resources/si/sorana_si_die.webp',        top:7,  bot:1524, fx:0.452 },
    back:         { src:'resources/si/sorana_si_back.webp?v=2',       top:1,  bot:1516, fx:0.533 },  // ver -786 換新圖＋重量取景
    ready:        { src:'resources/si/sorana_si_ready.webp',         top:7,  bot:1521, fx:0.631 },
    readysmile:   { src:'resources/si/sorana_si_readysmile.webp?v=2', top:6,  bot:1534, fx:0.578 },  // ver -837 換新圖＋重量取景（?v=2：同名覆蓋）
    /* ver -837（Ray：「我的 tease 也被刪了，找回來」）：從 _originals 的透明版轉回，
       逐張量（measure_si.py）。腳本還沒有用到它 —— 先掛著備用。 */
    tease:        { src:'resources/si/sorana_si_tease.webp',         top:7,  bot:1528, fx:0.583 },
    surprise:    { src:'resources/si/sorana_si_surprise.webp',     top:9,  bot:1522, fx:0.537 },   // ver -842
    /* Stage8（ver -953）。 */
    upset:        { src:'resources/si/sorana_si_upset.webp',         top:5,  bot:1526, fx:0.514 },
    /* ⚠⚠ `furiousq` 的畫布是 **1205×1305**，不是規約的 1024×1536（§5）——
       人物在它裡面只有 1288px 高，而基本立繪是 ~1520px。差分預設**沿用基本立繪的
       像素身高**當分母（ver -346：避免每換一次表情就縮放一次），套在這張上會小一截，
       所以要明寫 `rescale:true` ＝ 這一張用它自己的高（同諾薇兒 SAINT INSTALL 那張）。
       ⚠ 圖若之後補成 1024×1536，這一行的 rescale 與 top/bot 都要重來。 */
    furiousq:     { src:'resources/si/sorana_si_furiousq.webp',      top:5,  bot:1293, fx:0.535, rescale:true },
    hug:          { src:'resources/si/sorana_si_hug.webp?v=2',       top:11, bot:1485, fx:0.408 },  // ver -843：Ray 換新圖＋重量（?v=2 同名覆蓋）
    /* ══ 貝利薩爾・祭壇那一段（ver -1372）══ 同蕾娜那兩張：腳本 -1353 就在用這個名字，
       圖這一輪才交。⚠ `fx:0.668` 是舉劍開闊的姿勢量出來的（她平常那幾張 ≈0.5），
       這是**那一張圖**的事實，不可沿用（§6.5）。人物像素身高 1517，與基本立繪的
       1522 差 0.3%＝雜訊 ⇒ **不加 `rescale`**（同 `tired` 那一條的判準）。 */
    battlecry:    { src:'resources/si/sorana_si_battlecry.webp',     top:6,  bot:1523, fx:0.668 },
    /* ══ 差分擴充 18 張（ver -1503 美術交件，-1507 接線）══
       ⚠ `lookaway`／`salute`／`scared`／`wave` 的 `fx` 目視重量（同上）。
       ⚠ `sleep` 不是全身圖 → `cm` ＋ `standCm`。 */
    angry:     { src:'resources/si/sorana_si_angry.webp', top:5, bot:1524, fx:0.522 },
    armcross:  { src:'resources/si/sorana_si_armcross.webp', top:5, bot:1517, fx:0.547 },
    blush:   { src:'resources/si/sorana_si_blush.webp', top:6, bot:1513, fx:0.560 },
    /* ══⚠⚠⚠ **ver -1573：美術同名覆蓋了 12 張（-1571／-1572 那兩個 art commit）**══
       同名覆蓋一定要做兩件事，少一件就是**靜靜壞掉**：
       ① **跳 `?v=`**（§5 的 -650）：檔名沒變、內容變了，瀏覽器照樣拿舊的那一份 ——
          症狀是「換了圖卻沒換」，而 `src`／位置／程式全部是對的，查不出原因。
       ② **重量 `top`/`bot`**：那兩個是**那一張圖**的客觀事實。實測這一批差很多
          （`nod` 的 `bot` 1494→1527）—— 沿用舊值人會歪。
          ⚠ 量法只有一支：`python3 tools/measure_si.py resources/si/sorana_si_*.webp`
            （鐵律 7）。⚠⚠ 它是 **0 起算**的列號；美術工單那張表是 **1 起算**的，
            所以整欄差 1 —— **那不是兩份數字打架，是同一個像素的兩種寫法**。
            以工具為準（別人也照它量），不要照工單改。

       ⚠⚠⚠ **ver -1578 修正：`fx` 不可以跟著重量 —— 那 12 張 -1573 動錯了**
         （Ray／美術 -1556 的工單明寫「`fx` 一律不要動」，§5 的 -649 也是同一條）。
         · **理由一（規矩）**：新圖是**照舊圖的姿勢重畫**的 ⇒ **同姿勢沿用**。
           `fx` 是「臉在那一張圖裡的位置」，姿勢沒變它就該沒變；逐張重量只會讓
           同一個人在換表情那一拍橫向跳一格（-649 娜塔莉那個坑）。
         · **理由二（量不準）**：自動量測取的是「頭頂往下 8% 身高」那一帶的 alpha
           重心 —— **舉起的手臂與垂下的頭髮都會落在那一帶**。`wave` 就是活例：
           量到 0.374、真正對得準的是手調的 0.530。照量到的填會歪掉一個身寬。
         ⇒ 這一版把 12 張的 `fx` **全部還原回 -1572 的值**。
         ⚠ 真的覺得臉沒對準，動的是**角色層的 `fxShift`** 不是 `fx`（§5 的 -645）——
           兩者不可以合成一個數字，合了下次重量 `top`/`bot` 就會把手調一起洗掉。

       ⚠⚠⚠ **量過了：12 張裡有 3 張的頭「真的動了」—— 這三張等 Ray 決定**（ver -1578）
         「同姿勢沿用」的前提是**頭沒有移位**。拿 git 裡的舊圖（`a7eb8dd~1`）與新圖
         逐張比**頭髮的質心**（＝頭在哪的代理值；不是工具那個「頭頂往下 8%」的
         alpha 重心 —— 那一帶會吃到舉起的手臂，正是 `wave` 量到 0.374 的原因）：

             expr        舊圖髮心 → 新圖髮心    位移      現行(舊)fx   量出來應該是
             determine     0.541 → 0.570      +0.029      0.547        0.576  ⚠
             eat           0.567 → 0.595      +0.028      0.569        0.597  ⚠
             wave          0.563 → 0.577      +0.014      0.530        0.544  ⚠
             其餘 9 張                        ≤0.009      —            沿用就對 ✔

         ⇒ **`determine`／`eat` 的頭真的往右挪了約 30px**（不是量測誤差，也不是
           手臂造成的 —— 髮心量法避開了手臂）。沿用舊 `fx` ⇒ 切到這兩張時臉會
           往左偏約 14 CSS px。`wave` 偏約 7px。
         ⚠ **這一版照 Ray 的指示「`fx` 一律不要動」全部還原** —— 上面那三個數字是
           **給他決定用的**，不是我自作主張套上去的。要改就是三個數字的事。
         ⚠ 量法可重跑（三十行，用 PIL）：亮度>150、彩度<70、偏藍 ⇒ 頭髮；
           取最上面那一團的橫向質心 ÷ 圖寬。 */
    cry:    { src:'resources/si/sorana_si_cry.webp?v=2', top:4, bot:1515, fx:0.550 },
    /* ══ `crybig` ＝**大哭**（ver -1578，Ray 自己產的圖；美術工單 -1556 §三）══
       ⚠ 與 `cry`（一般哭）**並存**，不是取代 —— 兩個鍵指兩張不同的圖。
       ⚠ 這是**新增**不是同名覆蓋 ⇒ **不掛 `?v=`**（§5：新增比覆蓋安全）。
       ⚠⚠ `fx` 這一張**是量出來的**（不是沿用 `cry`）：兩張的姿勢**不一樣**
         —— `cry` 是站直、單手抵著臉；這一張是仰頭、雙手收在胸前、膝蓋併攏。
         §5 的「同姿勢沿用」講的是同一個姿勢的差分，這一張不是。
       ⚠ 原 PNG 已依 §5 移進 `resources/_originals/si/`（不入版控、遊戲不載）。 */
    crybig: { src:'resources/si/sorana_si_crybig.webp', top:7, bot:1524, fx:0.532 },
    determine:{ src:'resources/si/sorana_si_determine.webp?v=2', top:10, bot:1523, fx:0.547 },
    /* ⚠⚠ ver -1536：這兩張**圖早就在版控裡**，只是從來沒登記進這張表 ——
       雪都酒吧那一段（`ravnsdal.bar`）從 -1522 起就寫著 `drink`／`shy`，
       線上一直**靜靜退回本尊立繪**（`script_lint.py` 那八行
       「SORANA 沒有 drink／shy 這張差分」講的就是它）。
       ⚠ 取景值 `tools/measure_si.py` 實測，沒有抄別張。 */
    drink:     { src:'resources/si/sorana_si_drink.webp', top:2, bot:1526, fx:0.442 },
    shy:       { src:'resources/si/sorana_si_shy.webp',   top:3, bot:1533, fx:0.503 },
    eat:       { src:'resources/si/sorana_si_eat.webp?v=2', top:1, bot:1529, fx:0.569 },
    lookaway:  { src:'resources/si/sorana_si_lookaway.webp?v=2', top:4, bot:1522, fx:0.610 },   // fx 目視手調，不隨新圖走（新圖量到 0.623，含垂下的頭髮）
    nod:       { src:'resources/si/sorana_si_nod.webp?v=2', top:6, bot:1527, fx:0.529 },
    /* ══ 唸報告的那一張（ver -1550，Ray：「索拉娜唸報告時全用 `Sorana_SI_read`，
       判斷是**雙引號跟日期開頭**的台詞」「**只限那場戲**」）══
       用在雪都圖書館那一段（`ravnsdal.library`）：她把蕾娜的評鑑報告唸出來的那幾句。
       ⚠ 「只限那場戲」＝**不要**拿雙引號去全庫掃：`sor('tease','修女不都是只會
         『神啊～』之類的嗎？')` 也有雙引號，那是她在學人講話，不是唸報告。 */
    read:        { src:'resources/si/sorana_si_read.webp',        top:4, bot:1533, fx:0.640 },
    /* ══ 唸報告的四張情緒差分（ver -1553，Ray 逐句指定）══
       ⚠⚠ **交件的檔名大小寫不一致**（`Sorana_SI_readshock.png`／`Sorana_SI_readsad.png`
         但 `sorana_SI_readhappy.png`／`sorana_SI_readconfuse.png`）——
         轉檔時**統一成 `Sorana_`**（她其餘每一張都是大寫 S）。
         ⚠⚠⚠ 這不是潔癖：**macOS 不分大小寫、靜態空間分** ——
           照小寫寫進來在這台測不出問題，**上線就是 404，而且畫面上不會報錯**
           （同 §6.5.4 的時段尾綴那一課）。
       ⚠ 取景值逐張量（`tools/measure_si.py`），沒有互抄 —— 四張的 `fx` 是
         0.645／0.644／0.643／0.671，`readconfuse` 明顯偏右（她把本子推遠了）。 */
    readshock:   { src:'resources/si/sorana_si_readshock.webp',   top:4, bot:1522, fx:0.645 },
    readhappy:   { src:'resources/si/sorana_si_readhappy.webp',   top:0, bot:1531, fx:0.644 },
    readsad:     { src:'resources/si/sorana_si_readsad.webp',     top:5, bot:1530, fx:0.643 },
    readconfuse: { src:'resources/si/sorana_si_readconfuse.webp', top:9, bot:1528, fx:0.671 },
    point:     { src:'resources/si/sorana_si_point.webp?v=2', top:9, bot:1523, fx:0.543 },
    relief:    { src:'resources/si/sorana_si_relief.webp?v=2', top:8, bot:1518, fx:0.556 },
    sad:       { src:'resources/si/sorana_si_sad.webp?v=2', top:3, bot:1527, fx:0.515 },
    salute:    { src:'resources/si/sorana_si_salute.webp?v=2', top:11, bot:1525, fx:0.580 },   // fx 目視手調，不隨新圖走（新圖量到 0.581，含舉起的手臂）
    scare:    { src:'resources/si/sorana_si_scare.webp?v=2', top:16, bot:1518, fx:0.540 },   // fx 目視重量（量到 0.443）
    serious:   { src:'resources/si/sorana_si_serious.webp?v=2', top:6, bot:1524, fx:0.576 },
    /* ⚠⚠ **top/bot 於 ver -1632 重量**（新版同名覆蓋，§5：換圖一定要重量取景值）：
       304/1231 → **230/1424**（人物在新圖裡佔的高度多了 29%）。
       ⚠ `fx` 一律不動（Ray -1578 的指示）；`cm`/`standCm` 是**旋鈕**不是事實，
         沒有 Ray 看畫面不動 —— 但人物變高 29% ⇒ 同一個 `cm` 會讓她**小 22%**，
         要維持原本的大小得把 `cm` 往上帶（147→約 189，而那會超過 `CAST_TALL` 178）。 */
    sleep:     { src:'resources/si/sorana_si_sleep.webp?v=2', top:230, bot:1424, fx:0.461, cm:147, standCm:140 },   // 座（非全身圖）
    stare:     { src:'resources/si/sorana_si_stare.webp?v=2', top:7, bot:1528, fx:0.514 },
    wave:      { src:'resources/si/sorana_si_wave.webp?v=2', top:8, bot:1527, fx:0.530 },   // fx 目視手調，不隨新圖走（新圖量到 0.374，含舉起的手臂）
    worry:     { src:'resources/si/sorana_si_worry.webp?v=2', top:4, bot:1519, fx:0.543 },
  } },
  /* ⚠ 取景值於 ver -624 **重量**：`Anya_SI_front` 換過圖（舊的留成
     `XAnya_SI_front.webp`）—— §5「換圖一定要重量取景值」。
     ⚠ `flight/index.html` 的 `PORTRAIT.anya` 是同一組數字，改一邊要改另一邊。 */
  /* ⚠⚠ `cm:146` ＋ `standCm:162`（ver -705，Ray：「安雅立繪太大了，臉比所有人大一圈」）：
     她的 `top`/`bot` **沒有量錯**（實測與 alpha 邊界完全相符，四個人都是）——
     問題出在**這張畫的頭身比本來就比別人大**（畫風偏幼，眼睛也畫得大）。
     鎖身高會把畫風差異原樣端上螢幕，那是 §6.5 寫明的代價。
     旋鈕就是 -636 那一組：`cm` 管**大小**（146＝縮到 0.90）、`standCm` 管**頭頂高度**
     （162＝她真正的身高，所以頭還是擺在該在的位置，不會跟著沉下去）。
     ⚠ 152 是**看渲染結果調出來的**（與蕾娜並排比對：146 過小、162 過大）——
       這一組值沒有可靠的自動量法（-636 已寫明），要改就再並排看一次。
     ⚠ **不要去動 `top`/`bot`** —— 那兩個是那張圖的客觀事實。
     ⚠ 也不要動 `CAST_EYE_MIX`：那是全域旋鈕，會把另外三個人一起改掉。 */
  anya:   { cm:152, standCm:162, eye:34, fx:0.505, top:0, bot:1531,
           side:'R', alt:null, base:'resources/si/anya_si_front.webp', expr:{
    /* ══ 瓦努努遺蹟・NIEM 那一段（ver -1186，Ray 交稿）══ 交件是 PNG，依 §5 轉 WebP；
       取景值逐張量（`tools/measure_si.py`），不沿用別張（§6.5）。 */
    smilesneaky:  { src:'resources/si/anya_si_smilesneaky.webp', top:2, bot:1530, fx:0.441 },
    /* ══ stage7・木雅克神殿（ver -922，Ray 交稿）══
       ⚠ `point` 的 `top:34` 是量出來的事實（她舉手指的姿勢，人物最上緣比別張低）。 */
    point:        { src:'resources/si/anya_si_point.webp', top:34, bot:1518, fx:0.406 },
    /* ══⚠⚠ **Q 版的驚嚇圖**（ver -924，Ray：「安雅的 CI scare 是 Q 版圖」「太大了，
       壓到平常的對話尺寸」）══ -923 是拿它當**全螢幕插圖**（`cg`）——那是錯的：
       它不是一張場景畫，是一張「反應圖」。改成**差分立繪**擺，走既有的 cm／standCm
       那兩個旋鈕（§6.5 的近景／坐姿那一條，娜塔莉是同一族）：
       · `cm:95`     ＝這張畫該佔多少公分 ⇒ 比正常立繪小一號（Q 版本來就小）
       · `standCm:162` ＝頭頂擺多高 ⇒ 與她平常的頭線同高。
         ⚠ 一開始填 110（想讓她「縮成一團」）**是錯的**：舞台只看得到立繪的上面
           約六成，頭線一往下壓，這張小圖就整個躲到楣的後面去了（實測只露出頭頂）。
           小圖要**掛在原本的頭線上**才看得完整。
       ⚠ 這兩個數字**沒有可靠的自動量法**（§6.5 明寫）：看渲染結果調，
         要放大縮小只動 `cm`、要上下移只動 `standCm`，不要去碰 top/bot（那是事實）。
       ⚠ `rescale:true`：這張圖的比例與基本立繪完全不同（Q 版），要用它自己的高。 */
    chibiscared:  { src:'resources/ci/ci_anya_scared.webp', top:11, bot:1252, fx:0.442,
                    cm:95, standCm:162, rescale:true },
    watch:        { src:'resources/si/anya_si_watch.webp', top:8, bot:1535, fx:0.476 },
    surprise:    { src:'resources/si/anya_si_surprise.webp', top:5, bot:1527, fx:0.458 },   // Stage8（ver -953）
    talkshy:      { src:'resources/si/anya_si_talkshy.webp', top:0, bot:1525, fx:0.451 },
    /* 北方泊地教堂那一幕（ver -624）。逐張量（tools/measure_si.py）。 */
    scare:   { src:'resources/si/anya_si_scare.webp',   top:0, bot:1511, fx:0.477 },
    runworry: { src:'resources/si/anya_si_runworry.webp', top:0, bot:1534, fx:0.432 },
    /* ══ 娜塔莉那一幕（ver -636）══
       ⚠⚠ 這三張都是**近景**（比基本立繪畫得大：人物只畫到膝或大腿，頭相對大）。
         照 alpha 上下緣量 ＝「這 1535px 就是 162cm」→ 頭會比別人大一圈
         （Ray：「娜塔莉跟安雅的立繪太失控了吧」）。
         所以 `cm` 給的是**這張畫該佔多少公分**（§6.5 的 `cm` 就是這個意思）：
         畫得越近 → 佔的公分越少 → 頭才會與其他立繪一樣大。
       ⚠ 這幾個數字是**看出來的**（沒有可靠的自動量法：臉的自動偵測會被頭髮吃掉）。
         頭太大就往下調、太小就往上調 —— 只動 `cm`，別去動 top/bot。
       ⚠⚠ **近景一定要配 `standCm`**：`cm` 同時管**大小**與**頭頂高度**
         （頭頂 y ＝ 頂線 ＋ (最高身高−cm)×每公分像素），所以只調 `cm` 會讓
         「畫得越近 → 頭擺得越低」——正好相反。`standCm` 是**站姿身高**，
         只管頭頂高度、不進縮放：近景給她真正的 162，頭就會回到該在的位置。 */
    /* ⚠ ver -637 換過圖：新的是**全身**（頭到靴底都在框內，取景與基本立繪一樣）——
       所以 `cm`／`standCm` 的近景修正整組拿掉，回到照量的預設。
       §5：換圖一定要重量取景值，這一組是重量的。 */
    crying:   { src:'resources/si/anya_si_crying.webp',    top:6,  bot:1527, fx:0.454 },
    desperate:{ src:'resources/si/anya_si_desperate.webp', top:13, bot:1535, fx:0.402, cm:110, standCm:162, faceFx:0.465, faceZoomK:0.63 },
    /* ⚠⚠ `sobbing` 是**裁到膝蓋**的近景，不是全身（§6.5：半身圖照量 alpha 上下緣
       會把人放大好幾倍）。畫面上看得到的大約是「頭頂→膝」＝身高的 75%，
       所以 `cm` 給 162×0.75 ≈ **122** —— 這樣她的**頭**才會與其他立繪一樣大，
       而畫面下緣正好切在膝蓋（那就是近景該有的樣子）。
       ⚠ 95 是**看出來的**，不是量出來的：覺得頭太大就往上調、太小就往下調。 */
    sob:  { src:'resources/si/anya_si_sob.webp',   top:4,  bot:1535, fx:0.320, cm:95, standCm:162 },
    /* 北方泊地第三天（ver -664，Ray 交稿）。四張都是**全身站姿**，照量即可
       —— 近景那幾張才要 `cm`／`standCm`（見上面的說明）。 */
    silent:    { src:'resources/si/anya_si_silent.webp',     top:0, bot:1527, fx:0.432 },
    panic:     { src:'resources/si/anya_si_panic.webp',      top:0, bot:1535, fx:0.395 },   // ver -842
    /* ⚠ ver -1092 Ray **重交了這一張**（同名覆蓋）→ `?v=2` ＋ 取景值重量
       （0.426→0.522：差了將近一成的圖寬，沿用舊值臉會明顯偏左）。 */
    talk:      { src:'resources/si/anya_si_talk.webp?v=2',   top:10, bot:1524, fx:0.522 },
    /* ══ Stage8 後段（ver -1092，Ray 交稿）══ 逐張量。 */
    argue:     { src:'resources/si/anya_si_argue.webp',      top:0, bot:1530, fx:0.512 },
    shy:       { src:'resources/si/anya_si_shy.webp',        top:0, bot:1528, fx:0.472 },
    upset:     { src:'resources/si/anya_si_upset.webp',      top:0, bot:1523, fx:0.500 },
    /* 湖上甲板（ver -752，Ray 交稿）。逐張量（measure_si.py）。 */
    wheel:     { src:'resources/si/anya_si_wheel.webp',      top:4, bot:1531, fx:0.483 },
    wheelpoint:{ src:'resources/si/anya_si_wheelpoint.webp', top:0, bot:1529, fx:0.473 },
    die:     { src:'resources/si/anya_si_die.webp',      top:0, bot:1526, fx:0.431 },
    sleepy:    { src:'resources/si/anya_si_sleepy.webp',     top:0, bot:1518, fx:0.441 },   // ver -772
    cry:       { src:'resources/si/anya_si_cry.webp',        top:0, bot:1528, fx:0.452 },
    terrify:{ src:'resources/si/anya_si_terrify.webp', top:0, bot:1518, fx:0.448 },
    /* ver -870（森林行 G 稿）——measure_si 量測。 */
    answer:    { src:'resources/si/anya_si_answer.webp',     top:3, bot:1531, fx:0.468 },
    smileshy:  { src:'resources/si/anya_si_smileshy.webp',   top:6, bot:1532, fx:0.454 },
    /* ══ 惡夢化（ver -671）══
       ⚠⚠ **不可以照量 alpha 上下緣**（Ray：「安雅的聖徒化 SI 太低太小了，要抓臉」）：
         她頭上有一圈金色法環，`tools/measure_si.py` 量到的 `top:1` 是**法環頂**
         —— 於是頭被壓低了一大截，而且鎖身高把她整個縮小。
         這是諾薇兒 SAINT INSTALL 那一張的同一個坑（ver -635，§6.5「法環也算污染」）。
       ⚠ 量法：用**顏色**把人物挑出來（淡紫的頭髮挑得掉金色特效），
         腳底只看中央那一段（避開兩側披風與光帶）。這張的正解是 308 / 1530。
       ⚠⚠ `rescale:true`：人物在這張圖上只佔 1222px，而基本立繪是 1531px
         （小了 20%）—— 那不是雜訊，是真的畫得比較小，所以這一張用它自己的身高。 */
    nightmareinstall:{ src:'resources/si/anya_si_nightmareinstall.webp',
                       top:308, bot:1530, fx:0.519, rescale:true },
    /* stage2 出航那一段（ver -741，Ray 交稿）。全身站姿，照量（measure_si.py）。 */
    lookup:    { src:'resources/si/anya_si_lookup.webp',     top:5, bot:1525, fx:0.479 },
    nervous:   { src:'resources/si/anya_si_nervous.webp',    top:0, bot:1526, fx:0.459 },
    scare2:   { src:'resources/si/anya_si_scare2.webp',    top:3, bot:1519, fx:0.356 },
    /* ══ 東方泊地・碼頭／甜品店 ＋ 貝利薩爾祭壇（ver -1372）══
       腳本（-1318／-1353）一共有 6 拍在用這兩個名字，圖是 Ray 這一輪才交的 ——
       在那之前一律**靜靜回退成基本立繪**（`script_lint.py` 每次都報，畫面上沒有訊息）。
       交件是 PNG，依 §5 轉 WebP、原 PNG 收進 `_originals/SI/`；逐張量（measure_si.py）。
       ⚠ 兩張都是**全身站姿**（人物像素身高 1526／1521，與基本立繪的 1531 差 0.3%
         ＝雜訊）⇒ 照量即可，**不加** `cm`／`standCm`／`rescale`
         —— 那三個旋鈕是給近景與坐姿用的（見上面 `sobbing`／`desperate`）。 */
    amaze:    { src:'resources/si/anya_si_amaze.webp',     top:1, bot:1527, fx:0.480 },
    /* ══ 貝利薩爾之後那一夜（ver -1386，Ray 交稿）══ 逐張量。 */
    clap:      { src:'resources/si/anya_si_clap.webp',       top:0, bot:1517, fx:0.484 },
    /* ⚠⚠ ver -1407：圖早就交了（`Anya_SI_makeface.png`），只是**沒有登記進這張表** ——
       `script_lint` 一直在唸「ANYA 沒有 makeface 這張差分，會回退基本立繪」，
       而畫面上看不出來（靜靜換成基本立繪）。
       ⚠ **同姿勢的差分只寫 `src`**（§6.5 的 ver -649）：`fx`／`top`／`bot`／`cm`
         一律沿用角色那一層 —— 逐張重量臉反而會讓她在換表情那一拍橫向跳一格。
       ⚠ ver -1408 已轉成 `.webp`（原 PNG 進 `resources/_originals/SI/`，§5 的三步）。
       ⚠ 同一批還有一張 `Anya_SI_peace`（也轉好了）**還沒有登記**，目前沒有腳本用到它
         —— 要用的時候照這一列加一行就好（同姿勢，只寫 `src`）。 */
    makeface:  { src:'resources/si/anya_si_makeface.webp' },
    steady:    { src:'resources/si/anya_si_steady.webp',     top:0, bot:1526, fx:0.498 },
    curious:   { src:'resources/si/anya_si_curious.webp',    top:3, bot:1524, fx:0.421 },
    /* ══ 差分擴充 18 張（ver -1503 美術交件，-1507 接線）══
       ⚠ `wave`／`wheeltalk`／`whisper` 的 `fx` 目視重量（高舉的手套、鋪在右側的長髮
         會把 measure_si 的帶狀重心拉走）；`hug`／`thinking` 複核過，量到的就是對的。
       ⚠ `wheelback`／`wheeltalk` 的「wheel」是**船舵**不是輪椅（工單寫錯，美術已更正）。
       ⚠ `sleep` 不是全身圖 → `cm` ＋ `standCm`。 */
    angry:     { src:'resources/si/anya_si_angry.webp', top:0, bot:1516, fx:0.495 },
    armcross:  { src:'resources/si/anya_si_armcross.webp', top:0, bot:1524, fx:0.503 },
    determine:{ src:'resources/si/anya_si_determine.webp', top:1, bot:1508, fx:0.496 },
    eat:       { src:'resources/si/anya_si_eat.webp', top:0, bot:1530, fx:0.504 },
    hug:       { src:'resources/si/anya_si_hug.webp', top:0, bot:1532, fx:0.467 },
    laugh:     { src:'resources/si/anya_si_laugh.webp', top:1, bot:1509, fx:0.501 },
    lookback:  { src:'resources/si/anya_si_lookback.webp', top:8, bot:1511, fx:0.504 },
    nod:       { src:'resources/si/anya_si_nod.webp', top:2, bot:1512, fx:0.501 },
    read:      { src:'resources/si/anya_si_read.webp', top:1, bot:1528, fx:0.501 },
    relief:    { src:'resources/si/anya_si_relief.webp', top:0, bot:1508, fx:0.502 },
    sleep:     { src:'resources/si/anya_si_sleep.webp', top:312, bot:1223, fx:0.548, cm:98, standCm:132 },   // 座（非全身圖）
    stare:     { src:'resources/si/anya_si_stare.webp', top:3, bot:1521, fx:0.501 },
    think:  { src:'resources/si/anya_si_think.webp', top:8, bot:1522, fx:0.474 },
    wave:      { src:'resources/si/anya_si_wave.webp', top:0, bot:1521, fx:0.480 },   // fx 目視重量（量到 0.398）
    wheelback: { src:'resources/si/anya_si_wheelback.webp', top:5, bot:1520, fx:0.501 },
    wheeltalk: { src:'resources/si/anya_si_wheeltalk.webp', top:36, bot:1498, fx:0.525 },   // fx 目視重量（量到 0.462）
    whisper:   { src:'resources/si/anya_si_whisper.webp', top:6, bot:1522, fx:0.315 },   // fx 目視重量（量到 0.345）
    worry:     { src:'resources/si/anya_si_worry.webp', top:0, bot:1510, fx:0.488 },
  } },
  /* ══ 娜塔莉（ver -636，Ray 交稿）══ 安雅的侍女，只在北方泊地那一幕出現。
     ⚠⚠ 兩張圖都是**坐倒在地**的姿勢，不是站姿 —— 所以 `cm` 不是她的真實身高，
       而是「這張畫應該在畫面上佔多少公分」（§6.5 的 `cm` 就是這個意思）。
       ⚠⚠ 這個數字是**看渲染結果調的**，不是照真人比例算的（ver -636 由 100 改成 150，
         Ray：「娜塔莉跟安雅的立繪太失控了吧」）：照「坐姿約 100cm」填，她會小到整個
         被下半的槍棺面盤吃掉 —— 因為畫面只看得到站姿的上面約六成。
         她那張圖是**用全身立繪的尺畫的坐姿**，所以要接近全身的值才對得上別人的頭。
       ⚠ 這樣算出來的結果正好對：`bot` 一律落在同一條地平線上（那是取景公式的性質），
         所以她「坐在地上」的下緣與別人的腳底同高，而頭比站著的人矮一大截。
     ⚠ `dying` 與 `dead` 是**同一個尺**畫的（頭的位置不同而已），共用一個 `cm`。
     ⚠ 站**左**：這一幕安雅固定站右（她是這一幕的主角），兩人要分邊（§6.5）。
     ⚠ `eye` 沒量（CAST_EYE_MIX=0 不參與運算）。 */
  /* ⚠ `cm` 管**大小**（150：她那張圖是用全身立繪的尺畫的坐姿）、
     `standCm` 管**頭頂高度**（140：她坐在地上，頭比站著的人低一截）。
     ⚠ 照真人比例（坐姿頭頂約 100cm）會把她整個推到對話框底下 —— 這個舞台
       只看得到站姿的上面約六成。140 是「看得見、又明顯比別人低」的折衷。 */
  /* ⚠ ver -641 換過圖並**重量**：兩張的數字與上一版對調了（`dying` 103/0.363、
     `dead` 47/0.657）—— §5「換圖一定要重量取景值」，沿用舊值會歪一大截。
     ⚠⚠ `standCm` 120 → **152**、`fx` **量到 0.363 但填 0.332**：
       `standCm` 抬高＝頭往上；`fx` 是「臉在圖上的位置」，**填得比實測小＝整張圖往右移**
       （錨點固定在畫面左 24%，臉越靠左圖就被推得越右）。
       ⚠ 實測 0.363，Ray 手調成 **0.310**（往右 −0.053）。
       ⚠⚠ 這是**刻意偏離實測值的位移**，不是量錯。兩件事要記住：
         ① 日後重量這張圖，要把 −0.053 補回去，不然她會跳回原位；
         ② **同一個位移要套到每一張差分**（見下面 `dead` 的說明）——
            `fx` 是「臉在那張圖裡的位置」，兩張圖各有各的實測值，抄同一個數字
            會讓她在斷氣那一拍橫向跳一大格。 */
  natalia:{ cm:150, standCm:152, eye:0, fx:0.363, fxShift:0.012, top:103, bot:1535,
           side:'L', alt:null, base:'resources/si/npc/npc_natalia_si_die.webp?v=2', expr:{
    /* ⚠⚠ **`fx` 是「臉在**這張圖**裡的橫向位置」，不是螢幕位置** —— 所以**不能抄**。
       引擎做的是 `left = 畫面錨點 − 縮放 × fx × 圖寬`：只要每張圖的 `fx` 各自量對，
       兩張差分的**臉**就會落在同一個螢幕位置，圖自己會左右挪。
       抄同一個數字反而會讓她在斷氣那一拍**橫向跳一大格**（兩張圖的臉本來就畫在
       不同的地方：dying 0.363、dead 0.594 —— 下面兩個都是**實測值**）。
       ⚠⚠ 要整個人往左右挪，動的是角色層的 **`fxShift`**（ver -645）：它加在**這個
         角色的每一張圖**上，所以只要改一個數字，所有差分一起移，`fx` 永遠保持實測值。
         **正數往左、負數往右**（`fx` 越大＝臉在圖上越右＝圖被推得越左）。
       ⚠⚠ **`fx` 那一格請不要動**（ver -646）：它是實測值，要挪人只動 `fxShift`。
       ⚠ 現行 `+0.012` 是算出來的，不是試出來的（Ray：「水平左移，讓娜塔莉肩觸畫面左緣」）：
         她的**肩**在圖上第 168 欄（上 45% 的最左不透明欄），要讓那一欄落在畫面 x=0
         → `fx+fxShift = (W×0.24 + 縮放×168) ÷ (縮放×1024)`，在 375 寬、縮放 0.4169 之下
         ＝ 0.375 → 位移 0.375 − 0.363 = **+0.012**。
         ⚠ 這個值與**畫面寬高比**有關（`W×0.24` 與 `縮放` 各自跟著寬、高走），
           所以在別的機器上會差一點點 —— 它是美術微調不是幾何保證。 */
    /* ⚠⚠ **`dead` 只寫 `src`，其餘全部沿用 `dying`**（ver -649，Ray：「就用 dying 的
       位置放 dead」）。她是同一個人癱在同一個地方，只有頭的角度不同
       —— **位置就該一模一樣**。`frameOf` 是 `Object.assign({}, 角色, 這一張)`，
       所以不寫就是沿用（`fx` / `fxShift` / `top` / `bot` / `cm` / `standCm` 一併）。
       ⚠ 不要「各自量、再想辦法對齊」（-641~-648 繞的那一大圈）：
         對躺著的圖逐張量臉，反而製造出要對齊的問題。 */
    /* ⚠⚠ `?v=2`（ver -650）：這兩張圖被**同名覆蓋**過（美術改圖直接蓋回原檔名）——
       瀏覽器會沿用舊的快取，於是換到 `dead` 時畫面上還是舊那一張，看起來像
       「dead 出不來」（Ray 回報，實測：不帶 cache-buster 抓到的 `dead.webp`
       與 `dying` 的像素指紋完全相同；帶了就正常）。
       ⚠ **同名覆蓋的圖一定要動這個號碼**，不然只有清快取的人看得到新圖。
       ⚠ 兩張都要帶（`base` 與這一張），少一張就少一張被快取住。 */
    /* ⚠ `fxShift` 是**這一張自己的**（ver -651，Ray：「水平位置要跟 dying 一樣往左切」）。
       兩張圖裡她的身體畫在不同的橫向位置（同一個姿勢、不同角度）：
       身體最左邊在 `dying` 是第 168 欄、`dead` 是第 289 欄 —— 差 121 欄。
       沿用同一個位置的話，`dead` 的身體會往右偏 121×縮放 ≈ 50px，左邊就切不到。
       所以這一張多推 121/1024 = 0.118（`0.012 + 0.118 = 0.130`）。
       ⚠ 高度／大小照舊全部沿用（`top`/`bot`/`cm`/`standCm` 都不寫）—— 只差橫向。 */
    /* ⚠⚠ **高度要用這一張自己的 `top`**（ver -652，Ray：「dead 高度太高」）。
       `top` 是「頭頂在圖上第幾列」，引擎把那一列放到頂線 —— 沿用 `dying` 的 103 時，
       `dead` 的頭其實在第 47 列，於是她整個被抬高 (103−47)×縮放 ≈ 23px。
       ⚠ 連帶 `bot−top` 變成 1488（`dying` 是 1432），縮放會跟著小 3.9% ——
         所以 `cm` 補成 150×1488/1432 ≈ **156**，大小才與 `dying` 一模一樣。
       ⚠ `standCm` 不寫（沿用 152）：那是「頭頂擺多高」，兩張要一樣高就不能各寫一個。
         Ray 手動填的 130 是**有效的**（實測整個往下 87.6px＝(152−130)×每公分像素）——
         只是用它來補「`top` 沒對」會過頭。真的想讓她更低再動它。 */
    /* ⚠ `standCm` 比本尊低 4.7cm ＝ 這一張整個往下 20px（ver -654，Ray 指定）。
       換算走 390×844 那個驗收視口的每公分像素（4.28）—— 位移寫成 cm 才不會
       換一台機器就走鐘（headY 是 `(CAST_TALL−standCm)×pxCm` 算出來的）。 */
    dead: { src:'resources/si/npc/npc_natalia_si_dead.webp?v=2', top:47, bot:1535, cm:156, standCm:147.3, fxShift:0.130 },
  } },
  /* 璐娜：戰鬥搭檔，劇情立繪尚未指定 —— 先指 cut-in 圖，數字**沒有量過**。
     ⚠ 真的要讓她在劇情裡站台，top/bot/fx 一定要重量（cut-in 是胸像構圖，
       照 alpha 上下緣量會把人放大好幾倍，見 CLAUDE.md §6.5）。 */
  /* 璐娜莉亞（團長）。⚠ 站**右側** —— 與諾薇兒（左）分邊，兩人同台不會疊。
     ⚠ 數字是**量出來**的，量法照 CLAUDE.md §6.5 與 HANDOFF F 節：
       · cm 168（Ray 指定）
       · top/bot＝alpha 上下緣（9 / 1528）。先確認過四角 alpha 是 0、逐列輪廓寬
         由 21% 變到 97% —— 是去背立繪不是滿版插圖，所以 alpha 邊界就是頭頂與腳底。
       · fx 0.496 —— 量**頭部那一段**（頭頂往下 8% 圖高）的 alpha 中心得 0.483，
         再用諾薇兒校準這把尺（同法量她得 0.551、表上 0.564，偏移 +0.013）。
       · eye 沒量（CAST_EYE_MIX=0 不參與運算）。要改回混合模式前必須先量。 */
  /* ⚠ faceAdj：**這張插畫自己的頭身比**與其他人差太多時的補償（ver -328）。
       身高鎖是準的（實測兩人都 4.21 px/cm），但璐娜莉亞被畫成八頭身、諾薇兒接近
       六頭半 —— 同樣的身高之下她的臉小約一成，Ray 回報「璐娜立繪比例不對／臉太小」。
     ⚠ 1.10 → **1.22**（ver -333）：Ray 回報「頭明顯比諾薇兒小，臉要差不多大小」。
       量法：把兩張圖各自照鎖身高的縮放算好（實測 pxCm 4.21 時 s＝0.454／0.4656），
       裁出頭部並排比對 —— 臉寬約 60 : 50，缺約兩成。
     ⚠ 這個值是**看出來的，不是量出來的** —— 它補的是畫風差異，沒有客觀基準可量。
       調它的代價寫清楚：她在畫面上會比 168cm 該有的高度**大一成**，
       也就是拿「身高的真實性」換「臉的可讀性」。Ray 定案要後者。
     ⚠ 不要改成鎖眼寬／鎖臉寬來自動解（CLAUDE.md §6.5 踩過）：那會把畫風差異
       **全額**放大成體型差異，四個人的腳就不會落在同一條地平線上了。
       逐張補一個係數是有上限、可控的做法。 */
  /* ⚠ standCm：**只用來算頭頂落點**的「站姿身高」，不影響縮放（ver -334）。
       鎖身高假設的是站直的人；諾薇兒的絕望差分是**彎腰**的姿勢，畫出來的身體被壓短，
       頭頂自然落得低 —— 那沒問題（Ray：「彎腰站位較低沒關係」）。但璐娜莉亞是昂立的，
       頭頂就該比她高（Ray 指定）。給璐娜莉亞 standCm=176（＝全場最高的基準），
       她的頭頂就貼在頂線上，與彎腰的諾薇兒拉開差距。
     ⚠ 不要改 cm 去達成這件事 —— cm 是縮放的分子，一改人就跟著變大變小。 */
  /* ⚠⚠ 坐姿差分（會客廳那一幕，ver -348）：**不能照身高鎖**。
       §6.5 的縮放是「pxCm × 身高cm ÷ 圖裡的像素身高」，但坐著的人那個縱向跨距
       **不是身高** —— 四張坐姿都畫滿整張畫布（1529~1536px），畫師為了填滿畫面
       把她畫大了約一成六（實測坐姿頭高 ≈221px、站姿 ≈190px）。照站姿那組算，
       她的頭會比同台站著的諾薇兒大一大截。
     兩個補償各司其職，不要混：
       faceAdj 0.74  ＝ **大小**。這條的歷程：1.05（偏大 14%，實測頭高 80px vs 諾薇兒 70px）
                      → 0.92（頭高齊平 75/78px）→ **0.74**（Ray 看過實機後指定「再縮小 20%」，
                      0.92×0.8）。
                      ⚠ 所以坐姿**不是**「臉與站著的人一樣大」——她坐在遠處的椅子上，
                        比同台站著的人小一圈才是對的。這是 Ray 的鏡頭判斷，不要用
                        「臉要等大」的理由改回去。
       standCm 155   ＝ **高度**：坐著的人頭頂本來就比站著的人低。155 讓她的頭低於
                      165cm 的諾薇兒約 46px —— 那正是「她坐著」的訊號。
                      145 試過**太低**，人幾乎整個沉到對話框後面。
     ⚠⚠ **坐姿的 `faceAdj` 用「椅子」當尺**（ver -361，Ray：「璐娜坐姿的大小一直跳，
       用椅子來鎖」）。四張坐姿是**各自生成**的，椅子本身就畫得不一樣大（實測像素差
       50~96，不是同一張素材），所以「每張自己的 alpha 跨距」根本不是同一把尺 ——
       這就是大小一直跳的原因。
       量法（可重跑）：把每張的 alpha 輪廓對 `seat_N` 做**只比椅子帶**的縮放對位
       （左右各 22% 欄、縱向 20~75%，避開中間的身體與手臂），求最佳縮放 k：
           seat_N 1.000（基準） / seat_smirk 0.996 / seat_angry 1.140 / seat_hand 1.122
       ⚠ 公式要**連 alpha 跨距一起算**（那是引擎的分母），不是只除 k：
           `faceAdj_i = 0.74 × (bot_i−top_i)/(1536−7) ÷ k_i`
         → seat 0.740 / smirk **0.737** / angry **0.648** / hand **0.634**。
         這樣四張的「椅子在螢幕上的大小」才真的相等（只除 k 會殘留 3~4% 的誤差）。
       ⚠ **`seat_angry` 之後被 Ray 指定再加大 20%**（ver -363）：0.648 × 1.2 ＝ **0.778**。
         它**刻意脫離椅子鎖** —— 那一張是她前傾發火的構圖，鎖住椅子反而讓人顯得縮在後面。
         Ray 的眼睛優先（§6.5：補償是看出來的）。其餘三張仍在鎖上。
       ⚠ 交叉驗證：Ray 先前憑眼睛把 `seat_angry` 收到 **0.63**（−15%），公式算出來是 **0.648**
         —— 兩條獨立的路落在 3% 內，所以這把尺是可信的。四張一律改用公式值，
         方法才是一致的（Ray 的 0.63 與 0.648 肉眼難分）。
       ⚠ **不要**改用「整張輪廓」對位：`hand` 那張手臂舉起來，輪廓變了，量出來是 1.089
         （與椅子帶的 1.122 差 3%），而且 `angry` 會量成 1.027（差 10%，明顯錯）。
         身體會動，椅子不會 —— 那正是「用椅子來鎖」的意思。

     ⚠⚠ 下面這兩個數字是**估出來的，還沒經 Ray 確認**（§6.5 允許「看出來的補償」，
       但要有人看過才算數）。三種自動量法都失敗，別再走一次：膚色偵測臉高會把手臂
       胸口腿一起算進去；窄帶取膚色跨距被髮絲汙染；眼罩當剛體尺標分不出髮帶與衣服。
       正解是渲染出來與諾薇兒並排比頭，再調這兩個值。 */
  /* ⚠⚠ ver -728 修：這一行**曾經有兩個 `standCm`**（`176` 與夾帶進來的 `110`）——
     JS 物件字面取**後面那個**，於是她的頭頂被當成 110cm，整個沉下去約 290px
     （頭頂 y ＝ 頂線 + (176−standCm)×pxCm，pxCm≈4.43）。
     那個 `110` 是 `44211db`（ver -653，**存檔點**那一次）夾帶進來的誤植，與立繪無關，
     從那之後她所有的立繪都是歪的（Ray 回報「璐娜莉亞的第一張黑影立繪位置整個跑掉了」）。
     ⚠ 自檢：改立繪資料時 grep 一下那個角色有沒有重複的鍵 —— 重複鍵不會有錯誤訊息。 */
  lunaria:{ cm:168, standCm:176, eye:32, fx:0.496, top:9, bot:1528, faceAdj:1.22,
           side:'R', alt:null, base:'resources/si/lunaria_si_arm.webp',
           /* 站姿差分（地宮那一幕的收尾，ver -349）。⚠ 這兩張的檔名是 `Luna_*`，
              但畫的是**璐娜莉亞**（同一套黑白洋裝＋眼罩，與 `Lunaria_SI_Armed` 同一人）。
              全身站姿，所以 cm/standCm/faceAdj 全部沿用她站姿那一組，只覆寫取景。 */
           /* ⚠ 兩張站姿都帶 `standCm:171`（ver -356，Ray：「璐娜立姿立繪稍微下修位置，
              往下移半張臉」）。頭頂 y ＝ `頂線 + (176 − standCm) × pxCm`，所以 standCm
              調小 5cm ＝ 往下 5×pxCm ≈ **22px**（實測 pxCm 4.43），約半個臉（一個臉 44px）。
              ⚠ 只寫在 `expr` 上，**不動角色的 `standCm:176`** —— 那是站姿基本立繪
                （`Lunaria_SI_Armed`）的值，動它會連別處一起下沉。
              ⚠ 也不要用 `cm` 去達成：`cm` 是縮放的分子，一改人就跟著變大變小。 */
           /* ⚠ G2 入口那一段的兩張站姿都帶自己的 `faceAdj`（Ray 逐次看實機調的）：
                angry 1.22 → 1.10（-350「再縮 10%」）→ **0.94**（-351「G2 入口的立繪縮 15%」）
                taunt 1.22 → 1.04（-351 的 −15%）→ **0.83**（-353「taunt 再縮 20%」）
              ⚠ 兩張數字不同是**刻意**的：angry 比 taunt 多縮過一輪。補的是那一張畫的
                構圖差異，不是角色屬性 —— 要調就調這裡，**不要回頭動角色的 cm**
                （那會連站姿基本立繪與坐姿一起變）。 */
           expr:{ angry:      { src:'resources/si/luna_si_angry.webp',       top:0, bot:1536, fx:0.477, faceAdj:0.94, standCm:171 },
                  taunt:      { src:'resources/si/luna_si_taunt.webp',       top:0, bot:1536, fx:0.510, faceAdj:0.83, standCm:171 },
                  seat:       { src:'resources/si/luna_si_seat_n.webp',     top:7, bot:1536, fx:0.448, faceAdj:0.74, standCm:155 },
                  seat_smirk: { src:'resources/si/luna_si_seat_smirk.webp', top:2, bot:1519, fx:0.539, faceAdj:0.737, standCm:155 },
                  /* ⚠ `seat_angry` 比其他三張坐姿再小一截：0.74 → **0.63**
                     （-353，Ray「seat_angry 再縮 15%」）。同一組坐姿吃不同的補償是刻意的，
                     補的是**那一張畫**的構圖差異（這張她往前傾、臉畫得比較大）。 */
                  /* ⚠ 取景值於 ver -398 **重量過**（Ray 換了新的一張，同名覆蓋）：
                     `bot 1526→1518`、`fx 0.539→0.531`。§5 的規矩：換圖一定要重量，
                     沿用舊值會歪 —— 這張的下緣少了 8px、臉往左移了 0.8%。
                     ⚠ `faceAdj`／`standCm` 是**這一組坐姿的補償**（見上方那段推導），
                       不是量出來的，換圖不動它。 */
                  seat_angry: { src:'resources/si/luna_si_seat_angry.webp', top:0, bot:1518, fx:0.531, faceAdj:0.778, standCm:155 },
                  seat_hand:  { src:'resources/si/luna_si_seat_hand.webp',  top:20, bot:1489, fx:0.546, faceAdj:0.634, standCm:155 } } },
  /* 雜貨舖店主（ver -369）。⚠ 身高是**估的**（170）—— 沒有設定，先給一個中間值；
     取景值是量的。日後 Ray 給了設定再改 cm 就好，取景不用重量。 */
  shopkeep:{ cm:170, eye:32, fx:0.434, top:6, bot:1533,
           side:'R', alt:null, base:'resources/si/npc/npc_grocerie_si.webp', expr:{} },
  /* 賞金獵人（ver -375）。⚠ 身高是**估的**（178，成年男性獵人）——沒有設定，
     取景值是量的（`tools/measure_si.py`）。日後有設定改 cm 即可，取景不用重量。
     ⚠ `attack` 這張同時是**戰鬥立繪**（config.enemies.guild_hunter.image），
       但戰鬥那邊是滿版取景、不吃這組數字 —— 同一張圖、兩套用途。 */
  hunter: { cm:178, eye:32, fx:0.485, top:6, bot:1529,
           side:'R', alt:null, base:'resources/si/npc/npc_guildhunter_si.webp',
           expr:{ shock:{ src:'resources/si/npc/npc_guildhunter_si_shock.webp', top:0, bot:1535, fx:0.453 },
                  attack: { src:'resources/si/npc/npc_guildhunter_si_attack.webp',  top:0, bot:1535, fx:0.546 },
                  lost:   { src:'resources/si/npc/npc_guildhunter_si_lost.webp',    top:6, bot:1529, fx:0.487 } } },
  /* 東方泊地公會的賞金獵人（ver -1375，Ray 交件 `NPC_ep_SI_bounty`）。
     ⚠ 身高是**估的**（178，沿用帝都那位獵人那一級的體格）；`top`/`bot`/`fx` 是
       **量的**（`tools/measure_si.py`）—— 那三個是這張圖的客觀事實，不可沿用別張（§6.5）。
     ⚠ 全身站姿（人物像素高 1532／1536），所以不必 `cm`／`standCm`／`rescale`
       那組近景旋鈕。
     ⚠ 沒有 `mirror`：他站右（NPC 本位），而且沒有要換邊的場合。
     ⚠⚠ 這張是**對話立繪**；戰鬥那一張是另一張（`man_bounty_EP`，見 config 的
       `enemy_bounty_ep`）—— 帝都那位是兩邊共用一張，這一位不是。 */
  hunter_ep:{ cm:178, eye:32, fx:0.565, top:3, bot:1535,
           side:'R', alt:null, base:'resources/si/npc/npc_ep_si_bounty.webp', expr:{} },
  /* 槍店店主（ver -377）。⚠ 身高是**估的**（175）；取景值是量的
     （`tools/measure_si.py`）。 */
  gunsmith:{ cm:175, eye:32, fx:0.476, top:6, bot:1531,
           side:'R', alt:null, base:'resources/si/npc/npc_capital_gunstore_si.webp', expr:{} },
  /* 禍魘娜塔莉（ver -681）。⚠ `fx` **不是 `measure_si.py` 印的 0.626**：
     那一支量的是「頭頂往下 8% 那一帶的重心」，而她的頭髮往右上飛散一大片 ——
     重心被拉過去了（同槍匠扛長槍的那個坑）。0.542 是照臉的位置定的。
     ⚠ 身高 165 是**估的**（同其他 NPC 的作法）。
     ⚠ 立繪就是敵人那一張：同一張圖兩種用途，戰鬥那邊是滿版取景、不吃這組數字。 */
  natalia_x:{ cm:165, eye:32, fx:0.542, top:0, bot:1534,
           side:'R', alt:null, base:'resources/enemy/mon_natalia.webp?v=3', expr:{} },
  /* ══ 北方泊地的兩位店主（ver -655，Ray 交件）══════════════════════════
     ⚠ 身高是**估的**（槍匠 176＝壯漢、雜貨舖 165＝中年婦人），同 hunter／gunsmith
       那幾筆的作法 —— 日後有設定改 cm 即可，取景值不必重量。
     ⚠⚠ 槍匠**不要填超過 178**（現行最高的獵人）：`CAST_TALL` ＝ 全體 `cm` 的最大值，
       而每公分像素是拿它算的（`story.js` 的 `pxCm`）—— 填 180 等於把**所有人**
       一起縮小 1.1%，而他自己變成「頂到框」的那一位（實測就是這樣）。
       一個 NPC 的估身高不該改寫整個劇組的尺。
     ⚠⚠ 槍匠的 `fx` **不是 `tools/measure_si.py` 印的那個**（0.635）：那支工具量的是
       「頭頂往下 8% 那一帶的 alpha 重心」，而他把**長槍扛在肩上**，槍管橫過那一帶
       一路伸到 x≈990 —— 重心整個被拉到右邊，套上去人會偏出畫面半個身子。
       0.547 是**只取「含最上緣那一團」的連續區段**（＝頭）重算的。
       這與 §6.5「髮飾/武器超出頭頂會污染 `top`」是同一族的坑，只是污染的是 `fx`。
     ⚠ 兩張都是全身圖（縱向佔 98.5%／98.7%），所以 `top`/`bot` 可以當身高用。
     ⚠ 站**右**：玩家的同伴在左、對面的人在右（同所有城鎮 NPC）。 */
  gunsmith_np:{ cm:176, eye:32, fx:0.547, top:11, bot:1524,
           side:'R', alt:null, base:'resources/si/npc/npc_gunsmith_si_northport.webp', expr:{} },
  grocer_np:{ cm:165, eye:32, fx:0.515, top:15, bot:1531,
           side:'R', alt:null, base:'resources/si/npc/npc_grocery_si_northport.webp', expr:{} },
  /* 公會櫃台（ver -375）。身高同樣是估的（168）。 */
  counter:{ cm:168, eye:32, fx:0.511, top:4, bot:1526,
           side:'R', alt:null, base:'resources/si/guildcounterca_si.webp', expr:{} },
  /* 北泊公會櫃台（ver -858）。⚠ 原檔白底未去背 —— matte.py（isnet-anime）粗胚
     先頂著（?v=2 蓋過快取），待 GPT 正式重製後**換圖要重量**（§5）。身高估 167。 */
  counter_np:{ cm:167, eye:32, fx:0.490, top:24, bot:1522,
           side:'R', alt:null, base:'resources/si/npc/npc_guildcounter_si_northport.webp?v=2', expr:{} },
  /* ══ 東方泊地的三位（ver -1340，Ray 交件）══════════════════════════════
     ⚠⚠ **`fx` 不是 `tools/measure_si.py` 印的那個** —— 那支量的是「頭頂往下 8%
       那一帶的 alpha 重心」，而這三張裡有兩張的頭帶被別的東西佔著（同 `gunsmith_np`
       扛長槍、`natalia_x` 頭髮飛散的那個坑）。下面的值一律照 §6.5 的定義
       **兩眼中心的中點 ÷ 圖寬**，逐張放大量的：
         · `gunsmith_ep` 舉起槍管對光檢視 → 槍管與手套橫過頭帶（工具印 0.380）
         · `grocer_ep`   長髮往畫面左側散開（工具印 0.399）
         · `counter_ep`  頭帶乾淨，工具印 0.510、量臉 0.492（差在辮子）
     ⚠ 身高全是**估的**（同 hunter／gunsmith／北泊那幾筆的作法）：
       槍匠 172（精壯女性）／櫃台主任 175（池子的敘述就是「高個」）／雜貨 163（20 出頭）。
       ⚠⚠ **不可以超過 178**（現行最高的獵人）：`CAST_TALL` ＝全體 `cm` 的最大值，
         每公分像素是拿它算的 —— 一個 NPC 的估身高不該把整個劇組一起縮小。
     ⚠ 三張都是全身站姿（縱向佔 96.6% / 99.0% / 98.7%），所以 `top`/`bot` 當得了身高。
     ⚠ 站**右**：玩家的同伴在左、對面的人在右（同所有城鎮 NPC）。
     ⚠⚠ **ver -1371 現況**：槍匠**已經去背了**（美術 -20260916 那一輪，
       `NPC_Gunsmith_SI_v1` 透明 71.7%）—— 同名覆蓋，所以路徑掛了 `?v=2`（§5）。
       ⚠⚠⚠ **公會櫃台（`NPC_GuildCounter_SI_v5`）還是白底沒 alpha**，畫面上仍然
       是一塊白板；雜貨那張本來就是 RGBA。待修的清單在
       `resources/_HANDOFF_ART_20260916.md` §四。
       取景值去背後仍然成立（去背只改 alpha、不動幾何）。
       ⚠ 換圖之後若是**重繪**而不是純去背，`top`/`bot`/`fx` 要重量（§5）。 */
  gunsmith_ep:{ cm:172, eye:32, fx:0.546, top:22, bot:1506,
           side:'R', alt:null, base:'resources/si/npc/npc_gunsmith_si_v1.webp?v=2', expr:{} },
  grocer_ep:  { cm:163, eye:32, fx:0.442, top:11, bot:1527,
           side:'R', alt:null, base:'resources/si/npc/npc_grocer_si_v1.webp', expr:{} },
  counter_ep: { cm:175, eye:32, fx:0.492, top:11, bot:1531,
           side:'R', alt:null, base:'resources/si/npc/npc_guildcounter_si_v5.webp', expr:{} },
  /* 旅店前台（ver -392）。⚠ 身高是**估的**（168）；取景值是量的（`tools/measure_si.py`）。
     ⚠ `top:0 / bot:1535` 不是漏量 —— 這張是**滿版取景**：髮髻碰到上緣、靴子碰到下緣
       （實測 row 0 與 row 1535 都有不透明像素）。 */
  clerk:  { cm:168, eye:32, fx:0.494, top:0, bot:1535,
           side:'R', alt:null, base:'resources/si/npc/npc_hotel_capital.webp', expr:{} },
  luna:   { cm:160, eye:30, fx:0.500, top:0, bot:1000,
           side:'L', alt:null, base:'resources/partner/luna_ci_exc.webp', expr:{}, unmeasured:true },
  /* 北方泊地的司祭。ver -582 首次交件（`Priest_SI_front`），
     **ver -1503 換成 Ray 畫的光頭老祭司 `NPC_NP_Priest`**（Ray：「我記得我畫過一個
     光頭老祭司的 NPC，把北泊的祭司換成他」）—— 那張自 -1408 就躺在 `resources/SI/`
     裡沒有任何人指著它。
     ⚠⚠ **取景值整組重量過，一個都沒有沿用上一版**（§5「換圖一定要重量取景值」）：
       舊 `top:7 bot:1531 fx:0.536` → 新 `top:5 bot:1527 fx:0.460`。
       `fx` 差 0.076 ＝ 圖上 78px —— 沿用的話他的臉會橫向歪掉一大截。
       量法 `tools/measure_si.py`（縱向佔 99.1%＝全身圖，可以當身高用）。
     ⚠ 這是**換檔名**不是同名覆蓋，所以不必掛 `?v=`（§5：新增比覆蓋安全）。
     ⚠ 舊圖 `Priest_SI_front.webp` **不是廢稿**（ver -1504，Ray：「原本的司祭等等
       會用上，名為 Arrhenius」）—— 已由下面的 `arrhenius` 認領，**不要回收**。
     ⚠ 身高 172 是**估的**（中老年男性神職），同 hunter／gunsmith 那幾筆的作法 ——
       ⚠ 沒有跟著換圖改：`cm` 是**這個角色多高**，不是這張畫多大（那是 top/bot 的事）。
       日後有設定改 cm 即可，取景值不必重量。
     ⚠ 站**右**：玩家的同伴在左、對面的人在右（同所有城鎮 NPC）。 */
  /* ══ 夏爾村的臉（ver -838，Ray 交件）══ 身高是**估的**（≤178 那條紅線），
     取景是量的（measure_si.py）。站位照店主邏輯：對面的人在右。
     `sh_craftsman`（NPC_shinier_Gunsmith）＝蕾娜口中的「工匠」，先備著沒戲。 */
  /* ⚠ `flip:true`（ver -1060，Ray：「謝尼的立繪水平翻轉」）＝**這張圖本來就畫反了**，
     一律翻；與 `mirror`（可以翻 → 換邊才翻）是兩件事（見 story.castLayout 的說明）。
     ⚠ 檔名就是 `hunter` —— 這張本來就是謝尼；`VILLAGER`（路人村民）借用同一張，
       所以一起翻。要讓村民不翻就得給他另一張圖（同一張圖不可能一半翻一半不翻）。 */
  sh_villager: { cm:178, eye:32, fx:0.421, top:5, bot:1524, side:'R', alt:null, flip:true,
                 base:'resources/si/npc/npc_shinier_hunter_si.webp', expr:{} },
  sh_villager2:{ cm:172, eye:32, fx:0.542, top:5, bot:1530, side:'R', alt:null,
                 base:'resources/si/npc/npc_shinier_grocery_si.webp', expr:{} },
  sh_chief:    { cm:164, eye:32, fx:0.537, top:6, bot:1520, side:'R', alt:null,
                 base:'resources/si/npc/npc_shinier_chief_si.webp', expr:{} },
  sh_craftsman:{ cm:175, eye:32, fx:0.603, top:5, bot:1531, side:'R', alt:null,
                 base:'resources/si/npc/npc_shinier_gunsmith_si.webp', expr:{} },
  /* 夏爾村餐廳的瑪麗亞（ver -875，measure_si 量測）。 */
  /* ⚠⚠ `flip:true`（ver -953，Ray：「瑪麗亞立繪水平翻轉」）＝**這張圖本來就要翻**，
     與 `mirror` 是兩件事，不要混用：
       `mirror` ＝ 這張畫**可以**翻 → 只在被擺到 `side` 以外那一側時才翻（-625 的讓位）
       `flip`   ＝ 這張畫**畫反了** → 不管站哪一邊都翻
     瑪麗亞本位就是右，用 `mirror` 的話在她站右邊時**一次都不會翻** —— 那不是要的。
     ⚠ 翻轉之後臉的錨點會跟著鏡射（`fx → 1-fx`），錨的永遠是臉不是圖框。 */
  sv_cook: { cm:163, eye:32, fx:0.463, top:8, bot:1522, side:'R', alt:null, flip:true,
             base:'resources/si/npc/npc_shinier_cook_si.webp', expr:{} },
  priest: { cm:172, eye:32, fx:0.460, top:5, bot:1527,
           side:'R', alt:null, base:'resources/si/npc_np_priest.webp', expr:{} },
  /* 阿瑞尼斯（ver -1504）＝ ver -582~-1503 的北泊司祭那張立繪。
     ⚠⚠ 取景值是**那張圖自己的**（`tools/measure_si.py` 重量過一次確認：
       `top:7 bot:1531 fx:0.536`，與 -582 記載的一致）—— 不是從 `priest` 抄來的。
       兩筆現在指著**兩張不同的圖**，數字本來就該不一樣（§6.5：差分之間不可互抄）。
     ⚠ ver -1509 已正名為 `Arrhenius_SI_front.webp`（`git mv`，內容一個位元都沒動）。
       之所以要改：差分叫 `Arrhenius_SI_*`、底圖叫 `Priest_SI_*`，前綴不一致會讓
       `tools/si_xlsx.py` **把同一個人切成兩頁**（而且投票取名之後兩頁都叫「阿瑞尼斯」，
       反而更難看出是同一個人）。
       ⚠ **改名不必掛 `?v=`**：新名字＝新網址，天生沒有快取問題（§5：新增比覆蓋安全）。
     ⚠ `cm:172` 沿用舊的估值（中老年男性神職）；有設定就改，取景值不必重量。
     ⚠ `side:'R'` 也是沿用 —— 他真的有戲之後再看對手是誰（§6.5「兩個人同台就一定
       分站兩邊」）。 */
  /* ══⚠⚠⚠ 鏡湖那一段的三個人（ver -1524）══════════════════════════════════
     取景值全部是 `tools/measure_si.py` **逐張量出來的**（§6.5：差分是不同姿勢，
     不是換臉，**不可以互抄**）。
     ⚠⚠⚠ **`cm`（身高）是我估的，Ray 還沒給** —— 尼莫 174／賽西莉 170／蘿芮 158。
       · 這三個數字**只影響大小與頭頂高度**，改一個數字就好（不必重量 top/bot/fx）。
       · ⚠ 都**低於現行最高的 178**，所以 `CAST_TALL` 不變、既有四位不會被連累縮小
         （§6.5：每公分像素是拿最高那一位算的）。
     ⚠ `eye` 沒量（`CAST_EYE_MIX=0`，不參與運算），照 `arrhenius` 那一筆填 32 佔位。
     ⚠ 三個人都 `side:'R'`：他們是**對面那一隊**，我方在左（同店主／公會那兩位的邏輯）。
     ⚠ `Cecilie_SI_refusertemp.png` **庫裡沒有**（Ray 稿上那張是暫代檔名）——
       「我不要。」那兩拍改用 `nolook`（手撫側髮、不看人），圖到了再加一個鍵。 */
  /* ⚠ `cm` ver -1536 由我估的 174 改成 **165**（Ray：「他的身高跟諾差不多」）
     —— 與諾薇兒同高。 */
  nemo:      { cm:165, eye:32, fx:0.484, top:3, bot:1524,
           side:'R', alt:null, base:'resources/si/nemo_si_front.webp', expr:{
    surprise: { src:'resources/si/nemo_si_surprise.webp', top:8, bot:1524, fx:0.498 },
    happy:    { src:'resources/si/nemo_si_happy.webp',    top:3, bot:1527, fx:0.510 },
    bye:      { src:'resources/si/nemo_si_bye.webp',      top:3, bot:1533, fx:0.499 },
    bore:    { src:'resources/si/nemo_si_bore.webp',    top:3, bot:1531, fx:0.516 },
    /* ⚠ 雙槍那一張還沒有人用（戰鬥立繪走敵人卡的 `enemy_nemo`）—— 先接著。 */
    dual:     { src:'resources/si/nemo_si_dual.webp',     top:0, bot:1535, fx:0.408 },
  } },
  cecilie:   { cm:170, eye:32, fx:0.534, top:7, bot:1533,
           side:'R', alt:null, base:'resources/si/cecilie_si_front.webp', expr:{
    talk:     { src:'resources/si/cecilie_si_talk.webp',      top:7, bot:1527, fx:0.539 },
    tease:    { src:'resources/si/cecilie_si_tease.webp',     top:4, bot:1529, fx:0.574 },
    upset:    { src:'resources/si/cecilie_si_upset.webp',     top:2, bot:1526, fx:0.535 },
    lookaside:{ src:'resources/si/cecilie_si_lookaside.webp', top:8, bot:1531, fx:0.560 },
    smile:    { src:'resources/si/cecilie_si_smile.webp',     top:4, bot:1517, fx:0.557 },
    /* ⚠ 背影：`fx` 量到 0.638（她背對鏡頭、重心偏右）—— 照量到的寫。 */
    sadback:  { src:'resources/si/cecilie_si_sadback.webp',   top:2, bot:1513, fx:0.638 },
    /* ══ ver -1545 美術交件兩張（Ray 指定用途）══ 取景值走 `tools/measure_si.py` 逐張量，
       **沒有互抄**（`back` 與 `sadback` 都是背影，但 fx 差 0.018 —— 姿勢不同）。 */
    back:     { src:'resources/si/cecilie_si_back.webp',      top:13, bot:1505, fx:0.656 },
    spoild:   { src:'resources/si/cecilie_si_spoild.webp',    top:8, bot:1526, fx:0.551 },
    nolook:   { src:'resources/si/cecilie_si_nolook.webp',    top:1, bot:1531, fx:0.543 },
    think:    { src:'resources/si/cecilie_si_think.webp',     top:5, bot:1529, fx:0.560 },
  } },
  /* ⚠⚠ **縮 20%**（ver -1536，Ray：「蘿芮登場那張圖太大了 縮20%」）——
     她的圖是**彎腰前傾**的構圖：像素高佔滿整框，但那是「彎著的 158cm」，
     照 158 去算就等於把一個壓縮過的身體放大到 158cm 該有的高度 ⇒ 整個人偏大。
     §6.5 的近景情形：**`cm` 管大小、`standCm` 管頭頂高度**，兩個旋鈕分開。
     · `cm:126` ＝ 158×0.8（就是 Ray 要的 20%）
     · `standCm:158` ＝ 頭頂仍照 158 擺 ⇒ **只變小，不下沉**
     ⚠ 只調 `cm` 會連頭一起往下掉（§6.5 明寫「只調 `cm` 一定失敗」）。 */
  laurie:    { cm:126, standCm:158, eye:32, fx:0.505, top:6, bot:1514,
           side:'R', alt:null, base:'resources/si/laurie_si_front.webp', expr:{
    /* ══⚠⚠ **除了底圖（`front`）之外，四張差分全部水平翻轉**（ver -1545，Ray 指定）══
       她的底圖朝一邊、四張差分朝另一邊 —— 換個表情人就轉過去了。
       ⚠⚠ 走的是**逐張的 `flip`**（ver -953 瑪麗亞那一支，`frameOf` 會把 expr 蓋在
         角色上，所以 `castLayout` 讀到的就是這一張的值）：`flip` ＝**這張圖本來就
         畫反了，不管站哪一邊都翻**，與 `mirror`（可以翻 → 換邊才翻）是兩件事。
       ⚠ **不要去翻檔案**：翻圖要同名覆蓋 ＋ 跳 `?v=`，而且 `fx` 得全部重量
         （翻轉之後臉落在 `1-fx`）—— `castLayout` 本來就替你做這件事。
       ⚠ 蘿芮**沒有 `mirror`**，所以這裡的 XOR 就只剩 `flip` 一項，站哪一邊都翻。 */
    cry:   { src:'resources/si/laurie_si_cry.webp',    top:4, bot:1524, fx:0.594, flip:true },
    die:    { src:'resources/si/laurie_si_die.webp',     top:6, bot:1523, fx:0.593, flip:true },
    /* ⚠⚠ **這兩張加大 15%**（ver -1565，Ray：「羅芮的 idea 跟 lookaside 立繪太小，
       加大 15%」）—— 大小的旋鈕是 `cm`（§6.5：`cm`＝這張畫該佔多少公分，管縮放的分子），
       126 × 1.15 ＝ **145**。
       ⚠ **只動 `cm`，不要去碰 `top`／`bot`／`fx`** —— 那三個是那張圖的客觀事實
         （量出來的），改了下次重量會把手調一起洗掉。
       ⚠ `standCm` 不動（158）：那管的是**頭頂擺多高**，不是大小。她還是站在
         她該站的高度上，只是人畫得大一點。 */
    idea:     { src:'resources/si/laurie_si_idea.webp',      top:4, bot:1520, fx:0.543, flip:true, cm:145 },
    lookaside:{ src:'resources/si/laurie_si_lookaside.webp', top:4, bot:1525, fx:0.540, flip:true, cm:145 },
  } },
  /* ══ 米夏（米海爾・約瑟・謝索洛夫）══ ver -1549 接線，Ray：「misha 先接上所有他的對話」
     ⚠⚠⚠ **`cm:176` 是我估的，Ray 還沒給** —— 同尼莫／賽西莉／蘿芮那一批（-1524）。
       依據只有「安雅（162）的**雙胞胎哥哥**」這一條。改一個數字就好
       （不必重量 `top`/`bot`/`fx`，那三個是那張圖的客觀事實）。
       ⚠ 低於現行最高的 178 ⇒ `CAST_TALL` 不變、既有角色不會被連累縮小。
     ⚠⚠ **本位 `side:'L'`** ＝要與安雅（本位右）**分兩邊**（§6.5）：那一夜 M2 那一條
       是他們兄妹來回對話四次，同側的話每一句都要抽牌輪轉 ＝ 閃爍。
       ⚠ M1 那一條反過來把他覆寫成右（`sides:{ MISHA_X:'R' }`，見 `script/town.js`）
         —— 那一段蕾娜（左）正在**看著他**講話，人要在畫面上才讀得通。
     ⚠ `mirror` 不寫（＝不翻）：他的姿勢接近正面，翻了只是換一隻手拿刀。
     ⚠ 取景值 `tools/measure_si.py` 量的，只有底圖一張（沒有差分）。 */
  misha:     { cm:176, eye:32, fx:0.393, top:0, bot:1535,
           side:'L', alt:null, base:'resources/si/misha_si_front.webp', expr:{} },
  arrhenius: { cm:172, eye:32, fx:0.536, top:7, bot:1531,
           side:'R', alt:null, base:'resources/si/arrhenius_si_front.webp', expr:{
    /* ══ 表情差分 6 張（ver -1503 美術交件，-1509 接線）══
       Ray 的描述 → 命名：看到久違學生的驚訝帶點喜＝`surprisejoy`／略皺眉微笑
       閉嘴・張嘴＝`wrysmile`・`wrysmileopen`／smiley eyes 微笑閉嘴・張嘴＝
       `smileclose`・`smileopen`／低頭略落沒張嘴＝`lookdown`。
       ⚠⚠ **六張的取景與底圖不同是對的**（底圖 fx:0.536／這六張 0.497）：
         第二版把頭抬起來了，臉回到畫面中央。引擎是
         `left = 錨點 − 縮放 × fx × 圖寬` —— **每張各自量對，臉就會落在同一個
         螢幕位置**，不必也不可以互抄（§6.5 的 -645/-649）。
       ⚠ 六張彼此是**同一個姿勢**，所以 `bot`／`fx` 完全一樣，`top` 的 0~2 是量測雜訊
         （2/1536 ＝ 0.13%，換算到螢幕不到 1px）—— 照量到的寫，不另外對齊。
       ⚠ 這六張是 **Gemini 畫的**（那天 ChatGPT 產圖額度用完）：臉比底圖年輕、
         鬍子淡、疤幾乎看不見。Ray 看過並定案「先用這個，配角而已」。
         日後他升格成有戲份的角色要用 ChatGPT 重跑，提示詞在
         `resources/_HANDOFF_ART_20260919.md` 的四之三／四之四。
       ⚠ `_recycle/resources/SI/` 底下有同名的**第一版**（六張全部繼承了底圖那個
         低頭側傾的角度，Ray：「他是落枕嗎？」）—— 那是廢稿，不要拿。 */
    surprisejoy:  { src:'resources/si/arrhenius_si_surprisejoy.webp',  top:2, bot:1535, fx:0.497 },
    wrysmile:     { src:'resources/si/arrhenius_si_wrysmile.webp',     top:0, bot:1535, fx:0.497 },
    wrysmileopen: { src:'resources/si/arrhenius_si_wrysmileopen.webp', top:0, bot:1535, fx:0.497 },
    smileclose:   { src:'resources/si/arrhenius_si_smileclose.webp',   top:0, bot:1535, fx:0.497 },
    smileopen:    { src:'resources/si/arrhenius_si_smileopen.webp',    top:0, bot:1535, fx:0.497 },
    lookdown:     { src:'resources/si/arrhenius_si_lookdown.webp',     top:1, bot:1535, fx:0.497 } } },
  /* ══ 科爾文（第五騎士團・作戰課副團長，ver -953，Ray 的 Stage8 稿）══
     ⚠ `cm:176` ＝ **Ray 指定「與索菈娜同高」**。不是隨手填的：`CAST_TALL` 取全體
       `cm` 的最大值來算每公分像素，填 180（他原本說的）會讓**全體立繪縮小約 1.1%**
       且他自己頂到框 —— 與索菈娜並列就剛好不動到那個基準。
     ⚠ `top`/`bot`/`fx` 是 `tools/measure_si.py` 逐張量的（9 張全身 1024×1536，
       無半身警告）—— **每一張各自量**，差分之間不可互抄（§6.5）。
     ⚠ `eye:32` 沿用其他 NPC 的預設：`CAST_EYE_MIX` 現在是 0（純鎖身高），
       這一格用不到，先給個合理值備用。
     ⚠ `side:'R'` —— 他的對手戲主要是蕾娜（本位左）。⚠ 但索菈娜／安雅本位也是右，
       那幾幕要靠 scene 的 `sides` 整幕覆寫把人分開（§6.5「兩個人同台就一定分站兩邊」）。
     ⚠ 沒有 `mirror` ＝ 不翻。他的制服與配件不對稱，翻了會錯。 */
  corvin: { cm:176, eye:32, fx:0.459, top:7, bot:1528,
            side:'R', alt:null, base:'resources/si/npc/corvin_si_front.webp',
            expr:{
              smile:     { src:'resources/si/npc/corvin_si_smile.webp',     top:9, bot:1529, fx:0.451 },
              stare:     { src:'resources/si/npc/corvin_si_stare.webp',     top:3, bot:1531, fx:0.455 },
              talk:      { src:'resources/si/npc/corvin_si_talk.webp',      top:6, bot:1531, fx:0.459 },
              shock:     { src:'resources/si/npc/corvin_si_shock.webp',     top:6, bot:1533, fx:0.462 },
              /* ⚠⚠ ver -1002：Ray 換了新圖（同名覆蓋）。`?v=2` 是**必要的** ——
                 瀏覽器以 URL 為鍵，檔名沒變、內容變了它照樣拿舊的那一份（§5）。
                 ⚠ `bot` 重量過：1534 → **1525**（新圖矮了 9px）；`top` 仍是 0。
                 ⚠ `fx` **沿用 0.443**：量過新舊兩張的頭部中線（0.4902 / 0.4893）
                   幾乎一樣＝同一個姿勢 —— 同姿勢的差分直接沿用，不要逐張重量
                   （ver -649 的規矩）。 */
              ecstasy:   { src:'resources/si/npc/corvin_si_ecstasy.webp?v=2', top:0, bot:1525, fx:0.443 },
              think:     { src:'resources/si/npc/corvin_si_think.webp',     top:8, bot:1530, fx:0.450 },
              read:      { src:'resources/si/npc/corvin_si_read.webp',      top:6, bot:1532, fx:0.459 },
              lookaside: { src:'resources/si/npc/corvin_si_lookaside.webp', top:1, bot:1533, fx:0.501 },
            } },
  /* ══ 北方泊地的群眾（ver -741，Ray 交件 NPC_northport_Crowd）══
     碼頭道別那一幕的送行人群 —— 一張圖畫好幾個人，當一個「角色」上台。
     ⚠ `cm` 是**估的**（畫面上最高那位 ≈172）：這張沒有單一的人可量，
       看渲染結果不對就調 cm（同安雅近景那組的規矩，top/bot 不要動）。 */
  /* ⚠⚠ ver -744（Ray：「主角群高度固定，群眾全入鏡，小一點點沒關係」）：
     `fitStage:true` ＝ 這一張**整張貼滿立繪區**、底貼舞台底、不進身高那一套
     也不影響別人（story.castLayout 的 fitStage 分支）。
     -743 用近景 cm／standCm 縮它，結果它的腳高於畫面底、layout 的 shift 把
     **全員**往下推 —— 主角群高度跟著跑掉，Ray 回報的就是這個。
     ⚠ `cm` 只是名目值（fitStage 不用它），留著給 CAST_TALL 之類的彙整讀。 */
  crowd_np: { cm:172, fitStage:true, eye:32, fx:0.370, top:7, bot:1527,
           side:'R', alt:null, base:'resources/si/npc/npc_northport_crowd.webp', expr:{} },
};

/* 最高的人：她定義相機（頭頂貼在舞台頂線，其餘人依身高往下排）。 */
export const CAST_TALL = Math.max(...Object.values(ART).filter(a=>!a.unmeasured).map(a=>a.cm));

/* 顯示名。查不到就原樣回傳 id —— 讓漏填的角色在畫面上直接現形，不要靜默變空白。 */
export function nameOf(id){ const s=SPEAKERS[id]; return s ? s.name : String(id||''); }
/* 該角色的立繪資料。OFFICER 會轉指到 renna。 */
export function artOf(id){ const s=SPEAKERS[id]; return s ? ART[s.art] : null; }
/* 差分的圖檔路徑。expr 的值可以是字串（只有圖、沿用角色的取景）或
   物件 `{src, top, bot, fx}`（自帶取景）—— 兩種都吃。 */
export function exprSrc(a, expr){
  const e = a && a.expr && a.expr[expr];
  if(!e) return null;
  return (typeof e === 'string') ? e : e.src;
}
/* **這一張圖**的取景：差分自帶的值蓋在角色基本值上。
   ⚠ 排版一律走這個，不要直接用 artOf —— 差分是不同姿勢，用角色的基本值會歪
     （見 ART.nouvelle 的說明）。 */
export function frameOf(id, expr){
  const a = artOf(id); if(!a) return null;
  const e = a.expr && a.expr[expr];
  return (e && typeof e === 'object') ? Object.assign({}, a, e) : a;
}

/* ══⚠⚠ **立繪當頭像：唯一那一支**（ver -1035 由 `modules/inn.js` 搬上來，鐵律 8）══
   拿角色自己的立繪，用量好的 `fx` 把臉挪到框中央 —— **不用新素材**，
   而取景值（`fx`）只有 `ART` 這一份（鐵律 7）。
   ⚠ `background-size` 給 260%：框是一個小方塊，整張全身圖塞進去只會看到一個人形
     色塊；放大到只框住頭與肩才讀得出是誰。
   ⚠ 縱向固定貼齊上緣（`top:0`）—— 這幾張立繪的頭頂本來就在圖的最上緣
     （`ART[].top` 都是個位數）。
   ⚠ 收在這裡而不是 inn：旅店的門、破防計量表的月彎（ver -1035）都要用它，
     兩份必然走鐘。⚠ 參數是 **speaker 的鑰匙**（大寫，如 `NOUVELLE`）。
   ⚠⚠⚠ **`tools/si_xlsx.py` 有這一支的第二份實作**（ver -1327）——那支是 Python，
     跑不了 CSS，只能把下面的幾何解成像素來裁縮圖。鐵律 7 的但書：
     **這裡的錨（`faceFx`／`fx` 的優先序）或 `faceZoomK` 的算法一改，
     那邊的 `face_box()` 要一起改**，否則 SI 差分總表的縮圖會與遊戲裡看到的不一樣。 */
export function faceStyle(who, zoom, expr){
  const a = ART[(SPEAKERS[who]||{}).art] || null;
  if(!a || !a.base) return '';
  /* `expr` ＝要用哪一張差分（ver -1047，「熔斷／無飛刀」那一組臉）。
     查不到就退回基本立繪 —— 同 story 的 `missingExpr`，不要整個不出現。 */
  const e = (expr && a.expr && a.expr[expr]) || null;
  /* ⚠⚠ 橫向的錨**可以逐角色覆寫**（`faceFx`，ver -1046，Ray：「索拉娜左移一點，
     不要裁她右側」）：`fx` 是**臉**在圖上的位置（對白立繪用它把臉對到定位），
     而這個小方框看的是「頭與肩那一塊」—— 側面圖的臉在中間、身體卻偏一邊，
     照 `fx` 擺就會把她的右半切掉。
     ⚠ 值越大＝圖往左移（露出更右邊）；沒寫就沿用 `fx`，其他人的行為一個字不變。
     ⚠ 它是**那張圖的性質**，所以住在 `ART` 這一份（鐵律 7）——旅店的門與破防
       計量表的頭像因此一起吃到，不會兩邊各調一次。 */
  /* 橫向的錨：差分自己的 `faceFx` → 差分的 `fx` → 角色的 `faceFx` → 角色的 `fx`。
     ⚠ 差分換了姿勢，人在圖上的位置就換了 —— 沿用本尊的錨會把她切掉一半。 */
  const fx = (e && e.faceFx!=null) ? e.faceFx
           : (e && e.fx!=null)     ? e.fx
           : (a.faceFx!=null)      ? a.faceFx : a.fx;
  /* 縮放：差分的 `faceZoomK` ＝**相對基本立繪**的倍率（ver -1048，Ray：「索拉娜 obe
     爆框了。安雅也爆，沒爆那麼多」）—— 那幾張的人物畫得比基本立繪滿（頭肩寬是
     1.26／1.58／1.96 倍），照同一個 zoom 貼就會頂出框外。
     ⚠ 寫成**倍率**不是絕對值：呼叫端的 zoom（旅店 260／計量表 300）各自不同，
       絕對值會讓其中一邊走鐘。 */
  const z = (zoom||260) * ((e && e.faceZoomK) || 1);
  return 'background-image:url("'+((e&&e.src)||a.base)+'");background-size:'+z.toFixed(1)+'% auto;'
       + 'background-position:'+(fx*100).toFixed(1)+'% 0%;';
}

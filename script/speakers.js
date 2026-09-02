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
  SORANA:   { name:'索拉娜', art:'sorana'   },
  /* 索拉娜：報上名字之前是「？？？」（ver -752，湖上甲板登場稿）。
     同 GIRL／ANYA_Q／OFFICER 的慣例：顯示名不同就是兩個 id，art 同指。 */
  SORANA_Q: { name:'？？？',   art:'sorana'   },
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
  VOICE:    { name:'路人',   art:null },
  /* 旁白（ver -656）：**沒有立繪、名字欄空著** —— 「跳一個對話框」那種畫面訊息
     （「該回去看看了。」）。⚠ 與 `VOICE` 的差別只有名字：那是「某個路人在講話」，
     這是「沒有人在講話」。⚠ 主角的空白框（`blank:true`）又是另一件事：
     那是**他**在說話，只是不出聲，名字欄會印他的暱稱。 */
  NARRATION:{ name:'',      art:null },
  /* 賞金獵人公會（ver -375）。⚠ 兩位都站**右**：與店主同一個邏輯 ——
     玩家的同伴在左，對面的人在右。 */
  HUNTER:   { name:'獵人',   art:'hunter'  },
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

   side：**固定站位**（ver -289，Ray 定案）：右 索拉娜・安雅／左 蕾娜・諾薇兒。
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
     （見 story.js 的 missingExpr），所以腳本可以先照規格寫 expr，圖到位再補這張表。 */
export const ART = {
  /* ⚠ `OFFICER`（正名前，顯示「監察官」）與 `RENNA`（正名後）**共用這一組 art**——
     同一個人、同一批立繪，只有顯示名不同（規格 §2、CLAUDE.md §8）。
     ⚠ 取景值逐張量（ver -347，量法同下方諾薇兒那段）。 */
  renna: { cm:169, eye:32, fx:0.519, top:1, bot:1521,
           side:'L', alt:null, base:'resources/SI/Renna_SI_front.webp',
           expr:{ smile:   { src:'resources/SI/Renna_SI_smile.webp',   top:5, bot:1530, fx:0.518 },
                  bow:     { src:'resources/SI/Renna_SI_bow.webp',     top:0, bot:1530, fx:0.507 },
                  awkward: { src:'resources/SI/Renna_SI_awkwerd.webp', top:6, bot:1526, fx:0.519 },
                  /* 帝都廣場那一段新增（ver -359）。`stare`＝直視／半瞇，用在她盯著人講話那幾拍。 */
                  stare:   { src:'resources/SI/Renna_SI_stare.webp',   top:0, bot:1527, fx:0.515 },
                  surprise:{ src:'resources/SI/Renna_SI_Surprise.webp',top:8, bot:1524, fx:0.498 },
                  /* 北方泊地教堂那一段（ver -595，Ray 交稿）。取景值全部用
                     `tools/measure_si.py` 量的，沒有沿用別張。
                     ⚠ 交件是 PNG，依 §5 轉 WebP 之後才接（原 PNG 進 _originals）。 */
                  shockedCalm:{src:'resources/SI/Renna_SI_shockedCalm.webp',top:4, bot:1516, fx:0.493 },
                  shout:   { src:'resources/SI/Renna_SI_Shout.webp',    top:4, bot:1534, fx:0.549 },
                  writting:{ src:'resources/SI/Renna_SI_writting.webp', top:4, bot:1524, fx:0.507 },
                  ask:     { src:'resources/SI/Renna_SI_ask.webp',     top:3, bot:1525, fx:0.489 },
                  /* 船塢那一段新增（ver -424，Ray 交件）。取景值是 `tools/measure_si.py`
                     量的，**每一張各自帶**（差分是不同姿勢，不是換臉，§6.5）。 */
                  watch:    { src:'resources/SI/Renna_SI_watch.webp',    top:7, bot:1530, fx:0.492 },
                  shocked:  { src:'resources/SI/Renna_SI_shocked.webp',  top:3, bot:1530, fx:0.492 },
                  run:      { src:'resources/SI/Renna_SI_run.webp',      top:3, bot:1532, fx:0.611 },
                  scared:   { src:'resources/SI/Renna_SI_scared.webp',   top:5, bot:1528, fx:0.498 },
                  surprised:{ src:'resources/SI/Renna_SI_surprised.webp',top:0, bot:1522, fx:0.502 },
                  tired:    { src:'resources/SI/Renna_SI_tired.webp',    top:7, bot:1522, fx:0.495 },
                  writing:  { src:'resources/SI/Renna_SI_writting.webp', top:4, bot:1524, fx:0.507 },
                  /* ver -427 交件。`talkserious`＝正色說明、`talkwork`＝談公事、
                     `thinking`＝思索。取景值一張一張量（§6.5）。 */
                  talkserious:{src:'resources/SI/Renna_SI_talkserious.webp',top:3, bot:1516, fx:0.509 },
                  talkwork: { src:'resources/SI/Renna_SI_talkwork.webp',   top:3, bot:1519, fx:0.509 },
                  thinking: { src:'resources/SI/Renna_SI_thinking.webp',   top:4, bot:1530, fx:0.515 },
                  /* ver -425 交件。`covermouth`＝掩口（驚訝／忍笑）、`cringe`＝尷尬皺眉。 */
                  covermouth:{src:'resources/SI/Renna_SI_covermouth.webp',top:2, bot:1528, fx:0.512 },
                  cringe:   { src:'resources/SI/Renna_SI_cringe.webp',    top:3, bot:1524, fx:0.502 },
                  cutescare:{ src:'resources/SI/Renna_SI_cutescare.webp', top:0, bot:1530, fx:0.537 },
                  dying:    { src:'resources/SI/Renna_SI_dying.webp',     top:2, bot:1518, fx:0.543 },
                  relief:   { src:'resources/SI/Renna_SI_relief.webp',    top:3, bot:1525, fx:0.518 },
                  /* 北方泊地教堂那一幕（ver -624，Ray 交稿）。逐張量（tools/measure_si.py）。
                     ⚠ 檔名的 `evalutating` 是交件時的拼字，鍵名照正確拼法 `evaluating`
                       —— 腳本裡寫的是鍵名，路徑只有這裡一處在對。 */
                  worry:    { src:'resources/SI/Renna_SI_worry.webp',      top:6, bot:1527, fx:0.568 },
                  pause:    { src:'resources/SI/Renna_SI_Pause.webp',      top:3, bot:1525, fx:0.513 },
                  upsetstare:{src:'resources/SI/Renna_SI_upsetstare.webp', top:0, bot:1524, fx:0.503 },
                  evaluating:{src:'resources/SI/Renna_SI_evalutating.webp',top:6, bot:1524, fx:0.507 },
                  evaluatingclosemouth:{src:'resources/SI/Renna_SI_evalutatingclosemouth.webp', top:6, bot:1524, fx:0.508 },
                  chase:    { src:'resources/SI/Renna_SI_chase.webp',      top:4, bot:1532, fx:0.554 },
                  /* 娜塔莉那一幕（ver -636）。 */
                  invite:   { src:'resources/SI/Renna_SI_invite.webp',     top:2, bot:1525, fx:0.537 },
                  /* 惡夢戰後那一幕的修正稿（ver -739，Ray 指定 Renna_SI_command）。
                     取景 tools/measure_si.py 量的。 */
                  command:  { src:'resources/SI/Renna_SI_command.webp',    top:0, bot:1527, fx:0.502 },
                  /* 北方泊地第三天（ver -664，Ray 交稿）。逐張量（tools/measure_si.py）。 */
                  smile:    { src:'resources/SI/Renna_SI_smile.webp',      top:5, bot:1529, fx:0.518 },
                  reach:    { src:'resources/SI/Renna_SI_reach.webp',      top:2, bot:1528, fx:0.566 },
                  /* 墓地那一幕（ver -671，Ray 交稿）。逐張量（tools/measure_si.py）。 */
                  meltdown:    { src:'resources/SI/Renna_SI_meltdown.webp',    top:0,  bot:1535, fx:0.528 },
                  meltdowncry: { src:'resources/SI/Renna_SI_meltdowncry.webp', top:4,  bot:1532, fx:0.607 },
                  scarejump:   { src:'resources/SI/Renna_SI_scarejump.webp',   top:0,  bot:1533, fx:0.632 },
                  scarecute:   { src:'resources/SI/Renna_SI_scarecute.webp',   top:0,  bot:1530, fx:0.537 },
                  blushed:     { src:'resources/SI/Renna_SI_blushed.webp',     top:8,  bot:1522, fx:0.551 },
                  lookdown:    { src:'resources/SI/Renna_SI_lookdown.webp',    top:6,  bot:1524, fx:0.548 },
                  chase2:      { src:'resources/SI/Renna_SI_chase2.webp',      top:11, bot:1529, fx:0.579 },
                  /* stage2 出航（ver -741，Ray 交稿）。逐張量（measure_si.py）。 */
                  curious:     { src:'resources/SI/Renna_SI_curious.webp',     top:0,  bot:1526, fx:0.529 },
                  intense:     { src:'resources/SI/Renna_SI_intense.webp',     top:6,  bot:1526, fx:0.629 },
                  lookup:      { src:'resources/SI/Renna_SI_lookup.webp',      top:5,  bot:1520, fx:0.510 },   // ver -746 交件補量
                  /* 湖上甲板（ver -744，Ray 的 stage5 稿）。逐張量。 */
                  intense2:    { src:'resources/SI/Renna_SI_intense2.webp',    top:5,  bot:1520, fx:0.510 },
                  askserious:  { src:'resources/SI/Renna_SI_askserious.webp',  top:3,  bot:1527, fx:0.525 } } },
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
  /* ⚠⚠ `mirror:true`（ver -625，Ray：「諾薇兒跟索拉娜左右是對稱的，可以水平翻轉」）
     ＝**這個角色的立繪換到非預設那一側時可以水平翻轉**。這是 §6.5「立繪朝向是畫死的，
     換邊要水平翻轉，髮旋與持物會左右顛倒」那條的**例外開關**：翻不翻由**這張畫**決定，
     所以寫在角色上、預設不翻 —— 有髮旋／單邊持物／不對稱制服的人不要加這一格。
     ⚠ 蕾娜**沒有**這一格（Ray：「蕾娜原則右，碰到安雅就放左，因為蕾娜整體框細，
       受左右影響小」）—— 她換邊就是換邊，不翻。 */
  nouvelle: { cm:165, eye:40, fx:0.582, top:3, bot:1536, mirror:true,
           side:'L', alt:null, base:'resources/SI/Nouvelle_SI_front.webp',
           expr:{ /* 艦鬥教學那幾拍（ver -424，Ray 交件）：她穩住陣腳的姿勢。 */
                  steady:   { src:'resources/SI/Nouvelle_SI_steady.webp',   top:8,  bot:1529, fx:0.534 },
                  /* 北方泊地碼頭那一幕的收尾（ver -582，Ray 交稿「沒錯！我們上吧！」）。
                     ⚠ 交件是 PNG，依 §5 的規約轉成 WebP 後才接（原 PNG 留在 resources/SI）。
                     ⚠ 取景值是 `tools/measure_si.py` 量的，不是沿用 `run` 那一張。 */
                  runserious:{src:'resources/SI/Nouvelle_SI_runserious.webp',top:12, bot:1521, fx:0.402 },
                  /* ver -427 交件：酒館第一句要的那張（在此之前一直回退基本立繪）。 */
                  pray:     { src:'resources/SI/Nouvelle_SI_pray.webp',     top:0,  bot:1533, fx:0.535 },
                  /* 北方泊地教堂那一段（ver -595，Ray 交稿）。`relief` 交件是 PNG，
                     依 §5 轉 WebP 之後才接；`saintinstall` 的圖早就在，只是沒進表。 */
                  relief:   { src:'resources/SI/Nouvelle_SI_relief.webp',   top:4,  bot:1530, fx:0.540 },
                  /* 娜塔莉那一幕（ver -636）。 */
                  sad:      { src:'resources/SI/Nouvelle_SI_sad.webp',      top:3,  bot:1534, fx:0.481 },
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
                  saintinstall:{src:'resources/SI/Nouvelle_SI_SAINTINSTALL.webp',top:76,bot:1519,fx:0.505, rescale:true },
                  run:      { src:'resources/SI/Nouvelle_SI_Run.webp',       top:13, bot:1533, fx:0.418 },
                  cringe:   { src:'resources/SI/Nouvelle_SI_Cringe.webp',    top:5,  bot:1533, fx:0.459 },
                  scared:   { src:'resources/SI/Nouvelle_SI_Scared.webp',    top:9,  bot:1530, fx:0.397 },
                  desperate:{ src:'resources/SI/Nouvelle_SI_Desperate.webp', top:2,  bot:1532, fx:0.415 },
                  surprise: { src:'resources/SI/Nouvelle_SI_Surprise.webp',  top:5,  bot:1524, fx:0.487 },
                  /* 會客廳那一幕的四張（ver -348）。
                     ⚠⚠ `gossip1` 的臉在 **0.710** —— 其他差分落在 0.39~0.60，這張她整個人
                       偏右。沿用別張的 fx 會把她推出畫面，這就是「每張差分都要自己量」的活例子。 */
                  awkward:  { src:'resources/SI/Nouvelle_SI_Awkwerd.webp',   top:2,  bot:1534, fx:0.468 },
                  gossip1:  { src:'resources/SI/Nouvelle_SI_Gossip1.webp',   top:0,  bot:1536, fx:0.710 },
                  gossip2:  { src:'resources/SI/Nouvelle_SI_Gossip2.webp',   top:2,  bot:1536, fx:0.603 },
                  shy:      { src:'resources/SI/Nouvelle_SI_Shy.webp',       top:4,  bot:1533, fx:0.592 },
                  /* ⚠ `whisper` 的臉在 **0.697**（其他差分 0.39~0.60）——她整個人偏右，
                     與 `gossip1`（0.710）同一類構圖。沿用別張會把她推出畫面。 */
                  whisper:  { src:'resources/SI/Nouvelle_SI_whisper.webp',   top:8,  bot:1530, fx:0.697 },
                  talk:     { src:'resources/SI/Nouvelle_SI_talk.webp',      top:3,  bot:1535, fx:0.582 },   // ver -752
                  /* 城鎮探索那一段新增（ver -369）。 */
                  sadsmile: { src:'resources/SI/Nouvelle_SI_sadsmile.webp',  top:5,  bot:1532, fx:0.587 },
                  hungry:   { src:'resources/SI/Nouvelle_SI_hungry.webp',    top:0,  bot:1536, fx:0.579 },
                  shocked:  { src:'resources/SI/Nouvelle_SI_Shocked.webp',   top:3,  bot:1534, fx:0.504 },
                  lookaway: { src:'resources/SI/Nouvelle_SI_Lookaway.webp',  top:5,  bot:1529, fx:0.504 },
                  bigsmile: { src:'resources/SI/Nouvelle_SI_bigsmile.webp',  top:4,  bot:1534, fx:0.565 },
                  /* 舊街區／公會那一段新增（ver -375）。取景由 `tools/measure_si.py` 量出來的。 */
                  concern:  { src:'resources/SI/Nouvelle_SI_concern.webp',   top:6,  bot:1529, fx:0.505 },
                  happy:    { src:'resources/SI/Nouvelle_SI_happy.webp',     top:1,  bot:1533, fx:0.578 },
                  shocked2: { src:'resources/SI/Nouvelle_SI_Shocked2.webp',  top:3,  bot:1533, fx:0.541 },
                  /* 北方泊地第三天（ver -664）：回頭看。 */
                  lookback: { src:'resources/SI/Nouvelle_SI_lookback.webp',  top:2,  bot:1528, fx:0.661 },
                  /* stage2 出航（ver -741，Ray 交稿）：揮手道別。 */
                  wave:     { src:'resources/SI/Nouvelle_SI_wave.webp',      top:13, bot:1535, fx:0.483 },
                  /* 湖上甲板（ver -744）。⚠ 檔案是 **Scared2**：美術 session 把舊的
                     Nouvelle_SI_Scared.webp 換成這一張（重畫），鍵名照稿寫 scared。 */
                  scared:   { src:'resources/SI/Nouvelle_SI_Scared2.webp',   top:9,  bot:1530, fx:0.399 } } },
  /* ⚠ 索拉娜用 **side** 那張：front 橫向佔 78%，兩人同台一定疊；側面只佔 69%。
     ⚠⚠ ver -752：front／side 換了新圖（同名覆蓋 → 掛 ?v=2，§5）＋湖上甲板
       登場稿的 12 張差分逐張量（measure_si.py）。
       `flight/index.html` 的 PORTRAIT.sorana 是同一組數字，改一邊要改另一邊。 */
  sorana: { cm:176, eye:27, fx:0.498, top:4, bot:1526, mirror:true,
           side:'R', alt:null, base:'resources/SI/Sorana_SI_side.webp?v=2', expr:{
    front:        { src:'resources/SI/Sorana_SI_front.webp?v=2',     top:3,  bot:1523, fx:0.659 },
    side:         { src:'resources/SI/Sorana_SI_side.webp?v=2',      top:4,  bot:1526, fx:0.498 },
    guard:        { src:'resources/SI/Sorana_SI_guard.webp',         top:9,  bot:1527, fx:0.651 },
    guardtalk:    { src:'resources/SI/Sorana_SI_guardtalk.webp',     top:5,  bot:1529, fx:0.653 },
    guardthinking:{ src:'resources/SI/Sorana_SI_guardthinking.webp', top:8,  bot:1529, fx:0.672 },
    embarassed:   { src:'resources/SI/Sorana_SI_embarassed.webp',    top:5,  bot:1527, fx:0.551 },
    sorry:        { src:'resources/SI/Sorana_SI_sorry.webp',         top:12, bot:1528, fx:0.511 },
    talk:         { src:'resources/SI/Sorana_SI_talk.webp',          top:7,  bot:1525, fx:0.508 },
    laugh:        { src:'resources/SI/Sorana_SI_laugh.webp',         top:3,  bot:1529, fx:0.579 },
    amazed:       { src:'resources/SI/Sorana_SI_amazed.webp',        top:3,  bot:1527, fx:0.562 },
    think:        { src:'resources/SI/Sorana_SI_think.webp',         top:3,  bot:1530, fx:0.529 },
    idea:         { src:'resources/SI/Sorana_SI_idea.webp',          top:3,  bot:1525, fx:0.523 } } },
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
           side:'R', alt:null, base:'resources/SI/Anya_SI_front.webp', expr:{
    /* 北方泊地教堂那一幕（ver -624）。逐張量（tools/measure_si.py）。 */
    scared:   { src:'resources/SI/Anya_SI_Scared.webp',   top:0, bot:1511, fx:0.477 },
    runworry: { src:'resources/SI/Anya_SI_runworry.webp', top:0, bot:1534, fx:0.432 },
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
    crying:   { src:'resources/SI/Anya_SI_Crying.webp',    top:6,  bot:1527, fx:0.454 },
    desperate:{ src:'resources/SI/Anya_SI_Desperate.webp', top:13, bot:1535, fx:0.402, cm:110, standCm:162 },
    /* ⚠⚠ `sobbing` 是**裁到膝蓋**的近景，不是全身（§6.5：半身圖照量 alpha 上下緣
       會把人放大好幾倍）。畫面上看得到的大約是「頭頂→膝」＝身高的 75%，
       所以 `cm` 給 162×0.75 ≈ **122** —— 這樣她的**頭**才會與其他立繪一樣大，
       而畫面下緣正好切在膝蓋（那就是近景該有的樣子）。
       ⚠ 95 是**看出來的**，不是量出來的：覺得頭太大就往上調、太小就往下調。 */
    sobbing:  { src:'resources/SI/Anya_SI_sobbing.webp',   top:4,  bot:1535, fx:0.320, cm:95, standCm:162 },
    /* 北方泊地第三天（ver -664，Ray 交稿）。四張都是**全身站姿**，照量即可
       —— 近景那幾張才要 `cm`／`standCm`（見上面的說明）。 */
    silent:    { src:'resources/SI/Anya_SI_Silent.webp',     top:0, bot:1527, fx:0.432 },
    talk:      { src:'resources/SI/Anya_SI_talk.webp',       top:0, bot:1531, fx:0.426 },
    /* 湖上甲板（ver -752，Ray 交稿）。逐張量（measure_si.py）。 */
    wheel:     { src:'resources/SI/Anya_SI_wheel.webp',      top:4, bot:1531, fx:0.483 },
    wheelpoint:{ src:'resources/SI/Anya_SI_wheelpoint.webp', top:0, bot:1529, fx:0.473 },
    dying:     { src:'resources/SI/Anya_SI_dying.webp',      top:0, bot:1526, fx:0.431 },
    cry:       { src:'resources/SI/Anya_SI_Cry.webp',        top:0, bot:1528, fx:0.452 },
    terrifying:{ src:'resources/SI/Anya_SI_terrifying.webp', top:0, bot:1518, fx:0.448 },
    /* ══ 惡夢化（ver -671）══
       ⚠⚠ **不可以照量 alpha 上下緣**（Ray：「安雅的聖徒化 SI 太低太小了，要抓臉」）：
         她頭上有一圈金色法環，`tools/measure_si.py` 量到的 `top:1` 是**法環頂**
         —— 於是頭被壓低了一大截，而且鎖身高把她整個縮小。
         這是諾薇兒 SAINT INSTALL 那一張的同一個坑（ver -635，§6.5「法環也算污染」）。
       ⚠ 量法：用**顏色**把人物挑出來（淡紫的頭髮挑得掉金色特效），
         腳底只看中央那一段（避開兩側披風與光帶）。這張的正解是 308 / 1530。
       ⚠⚠ `rescale:true`：人物在這張圖上只佔 1222px，而基本立繪是 1531px
         （小了 20%）—— 那不是雜訊，是真的畫得比較小，所以這一張用它自己的身高。 */
    nightmareinstall:{ src:'resources/SI/Anya_SI_Nightmareinstall.webp',
                       top:308, bot:1530, fx:0.519, rescale:true },
    /* stage2 出航那一段（ver -741，Ray 交稿）。全身站姿，照量（measure_si.py）。 */
    lookup:    { src:'resources/SI/Anya_SI_lookup.webp',     top:5, bot:1525, fx:0.479 },
    nervous:   { src:'resources/SI/Anya_SI_nervous.webp',    top:0, bot:1526, fx:0.459 },
    scared2:   { src:'resources/SI/Anya_SI_scared2.webp',    top:3, bot:1519, fx:0.356 },
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
           side:'L', alt:null, base:'resources/SI/NPC_Natalia_SI_dying.webp?v=2', expr:{
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
    dead: { src:'resources/SI/NPC_Natalia_SI_dead.webp?v=2', top:47, bot:1535, cm:156, standCm:147.3, fxShift:0.130 },
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
           side:'R', alt:null, base:'resources/SI/Lunaria_SI_Armed.webp',
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
           expr:{ angry:      { src:'resources/SI/Luna_SI_angry.webp',       top:0, bot:1536, fx:0.477, faceAdj:0.94, standCm:171 },
                  taunt:      { src:'resources/SI/Luna_SI_taunt.webp',       top:0, bot:1536, fx:0.510, faceAdj:0.83, standCm:171 },
                  seat:       { src:'resources/SI/Luna_SI_seat_N.webp',     top:7, bot:1536, fx:0.448, faceAdj:0.74, standCm:155 },
                  seat_smirk: { src:'resources/SI/Luna_SI_seat_smirk.webp', top:2, bot:1519, fx:0.539, faceAdj:0.737, standCm:155 },
                  /* ⚠ `seat_angry` 比其他三張坐姿再小一截：0.74 → **0.63**
                     （-353，Ray「seat_angry 再縮 15%」）。同一組坐姿吃不同的補償是刻意的，
                     補的是**那一張畫**的構圖差異（這張她往前傾、臉畫得比較大）。 */
                  /* ⚠ 取景值於 ver -398 **重量過**（Ray 換了新的一張，同名覆蓋）：
                     `bot 1526→1518`、`fx 0.539→0.531`。§5 的規矩：換圖一定要重量，
                     沿用舊值會歪 —— 這張的下緣少了 8px、臉往左移了 0.8%。
                     ⚠ `faceAdj`／`standCm` 是**這一組坐姿的補償**（見上方那段推導），
                       不是量出來的，換圖不動它。 */
                  seat_angry: { src:'resources/SI/Luna_SI_seat_angry.webp', top:0, bot:1518, fx:0.531, faceAdj:0.778, standCm:155 },
                  seat_hand:  { src:'resources/SI/Luna_SI_seat_hand.webp',  top:20, bot:1489, fx:0.546, faceAdj:0.634, standCm:155 } } },
  /* 雜貨舖店主（ver -369）。⚠ 身高是**估的**（170）—— 沒有設定，先給一個中間值；
     取景值是量的。日後 Ray 給了設定再改 cm 就好，取景不用重量。 */
  shopkeep:{ cm:170, eye:32, fx:0.434, top:6, bot:1533,
           side:'R', alt:null, base:'resources/SI/NPC_Grocerie_SI.webp', expr:{} },
  /* 賞金獵人（ver -375）。⚠ 身高是**估的**（178，成年男性獵人）——沒有設定，
     取景值是量的（`tools/measure_si.py`）。日後有設定改 cm 即可，取景不用重量。
     ⚠ `attack` 這張同時是**戰鬥立繪**（config.enemies.guild_hunter.image），
       但戰鬥那邊是滿版取景、不吃這組數字 —— 同一張圖、兩套用途。 */
  hunter: { cm:178, eye:32, fx:0.485, top:6, bot:1529,
           side:'R', alt:null, base:'resources/SI/NPC_GuildHunter_SI.webp',
           expr:{ shocked:{ src:'resources/SI/NPC_GuildHunter_SI_Shocked.webp', top:0, bot:1535, fx:0.453 },
                  attack: { src:'resources/SI/NPC_GuildHunter_SI_Attack.webp',  top:0, bot:1535, fx:0.546 },
                  lost:   { src:'resources/SI/NPC_GuildHunter_SI_Lost.webp',    top:6, bot:1529, fx:0.487 } } },
  /* 槍店店主（ver -377）。⚠ 身高是**估的**（175）；取景值是量的
     （`tools/measure_si.py`）。 */
  gunsmith:{ cm:175, eye:32, fx:0.476, top:6, bot:1531,
           side:'R', alt:null, base:'resources/SI/NPC_Capital_Gunstore_SI.webp', expr:{} },
  /* 禍魘娜塔莉（ver -681）。⚠ `fx` **不是 `measure_si.py` 印的 0.626**：
     那一支量的是「頭頂往下 8% 那一帶的重心」，而她的頭髮往右上飛散一大片 ——
     重心被拉過去了（同槍匠扛長槍的那個坑）。0.542 是照臉的位置定的。
     ⚠ 身高 165 是**估的**（同其他 NPC 的作法）。
     ⚠ 立繪就是敵人那一張：同一張圖兩種用途，戰鬥那邊是滿版取景、不吃這組數字。 */
  natalia_x:{ cm:165, eye:32, fx:0.542, top:0, bot:1534,
           side:'R', alt:null, base:'resources/enemy/mon_natalia.webp', expr:{} },
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
           side:'R', alt:null, base:'resources/SI/NPC_Gunsmith_SI_Northport.webp', expr:{} },
  grocer_np:{ cm:165, eye:32, fx:0.515, top:15, bot:1531,
           side:'R', alt:null, base:'resources/SI/NPC_Grocery_SI_Northport.webp', expr:{} },
  /* 公會櫃台（ver -375）。身高同樣是估的（168）。 */
  counter:{ cm:168, eye:32, fx:0.511, top:4, bot:1526,
           side:'R', alt:null, base:'resources/SI/GuildCounterCA_SI.webp', expr:{} },
  /* 旅店前台（ver -392）。⚠ 身高是**估的**（168）；取景值是量的（`tools/measure_si.py`）。
     ⚠ `top:0 / bot:1535` 不是漏量 —— 這張是**滿版取景**：髮髻碰到上緣、靴子碰到下緣
       （實測 row 0 與 row 1535 都有不透明像素）。 */
  clerk:  { cm:168, eye:32, fx:0.494, top:0, bot:1535,
           side:'R', alt:null, base:'resources/SI/NPC_Hotel_Capital.webp', expr:{} },
  luna:   { cm:160, eye:30, fx:0.500, top:0, bot:1000,
           side:'L', alt:null, base:'resources/partner/Luna_CI_exc.webp', expr:{}, unmeasured:true },
  /* 北方泊地的司祭（ver -582，Ray 交件 `Priest_SI_front`）。
     ⚠ 取景值是 `tools/measure_si.py` 量的（縱向佔 99.2%＝全身圖，可以當身高用）。
     ⚠ 身高 172 是**估的**（中老年男性神職），同 hunter／gunsmith 那幾筆的作法 ——
       日後有設定改 cm 即可，取景值不必重量。
     ⚠ 站**右**：玩家的同伴在左、對面的人在右（同所有城鎮 NPC）。 */
  priest: { cm:172, eye:32, fx:0.536, top:7, bot:1531,
           side:'R', alt:null, base:'resources/SI/Priest_SI_front.webp', expr:{} },
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
           side:'R', alt:null, base:'resources/SI/NPC_northport_Crowd.webp', expr:{} },
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

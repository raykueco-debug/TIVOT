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
     才去 `progress.getPlayerName()` 取。這一筆存在只是為了讓 `speaker:'PLAYER'`
     在資料上有著落（驗稿工具會檢查 speaker 是否有登記）。
     ⚠ `art:null` ＝ 沒有立繪：他從不站台，只有對話框（含 `blank:true` 的空框）。 */
  PLAYER:   { name:'{P}',     art:null },
  /* 城鎮 NPC（ver -369）。⚠ 站**右**：城鎮裡玩家的同伴（諾薇兒/蕾娜）在左，
     對面的人在右 —— 與主線的固定站位同一個邏輯。 */
  SHOPKEEP: { name:'店主',   art:'shopkeep' },
  /* 背景人聲（路人閒聊）：**沒有名字也沒有立繪** —— 讀起來才像鄰桌傳來的，
     而不是「有個叫路人的角色在跟你說話」。 */
  VOICE:    { name:'',       art:null },
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
                  ask:     { src:'resources/SI/Renna_SI_ask.webp',     top:3, bot:1525, fx:0.489 } } },
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
  nouvelle: { cm:165, eye:40, fx:0.582, top:3, bot:1536,
           side:'L', alt:null, base:'resources/SI/Nouvelle_SI_front.webp',
           expr:{ run:      { src:'resources/SI/Nouvelle_SI_Run.webp',       top:13, bot:1533, fx:0.418 },
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
                  /* 城鎮探索那一段新增（ver -369）。 */
                  sadsmile: { src:'resources/SI/Nouvelle_SI_sadsmile.webp',  top:5,  bot:1532, fx:0.587 },
                  hungry:   { src:'resources/SI/Nouvelle_SI_hungry.webp',    top:0,  bot:1536, fx:0.579 },
                  shocked:  { src:'resources/SI/Nouvelle_SI_Shocked.webp',   top:3,  bot:1534, fx:0.504 },
                  lookaway: { src:'resources/SI/Nouvelle_SI_Lookaway.webp',  top:5,  bot:1529, fx:0.504 } } },
  /* ⚠ 索拉娜用 **side** 那張：front 橫向佔 78%，兩人同台一定疊；側面只佔 69%。 */
  sorana: { cm:176, eye:27, fx:0.527, top:4, bot:1522,
           side:'R', alt:null, base:'resources/SI/Sorana_SI_side.webp', expr:{} },
  anya:   { cm:162, eye:34, fx:0.478, top:0, bot:1530,
           side:'R', alt:null, base:'resources/SI/Anya_SI_front.webp', expr:{} },
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
                  seat_angry: { src:'resources/SI/Luna_SI_seat_angry.webp', top:0, bot:1526, fx:0.539, faceAdj:0.778, standCm:155 },
                  seat_hand:  { src:'resources/SI/Luna_SI_seat_hand.webp',  top:20, bot:1489, fx:0.546, faceAdj:0.634, standCm:155 } } },
  /* 雜貨舖店主（ver -369）。⚠ 身高是**估的**（170）—— 沒有設定，先給一個中間值；
     取景值是量的。日後 Ray 給了設定再改 cm 就好，取景不用重量。 */
  shopkeep:{ cm:170, eye:32, fx:0.434, top:6, bot:1533,
           side:'R', alt:null, base:'resources/SI/NPC_Grocerie_SI.webp', expr:{} },
  luna:   { cm:160, eye:30, fx:0.500, top:0, bot:1000,
           side:'L', alt:null, base:'resources/partner/Luna_CI_exc.webp', expr:{}, unmeasured:true },
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

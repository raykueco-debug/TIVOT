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
  renna: { cm:169, eye:32, fx:0.519, top:1, bot:1521,
           side:'L', alt:null, base:'resources/SI/Renna_SI_front.webp', expr:{} },
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
  nouvelle: { cm:165, eye:40, fx:0.564, top:1, bot:1535,
           side:'L', alt:null, base:'resources/SI/Nouvelle_SI_front.webp',
           expr:{ run:      { src:'resources/SI/Nouvelle_SI_Run.webp',       top:13, bot:1533, fx:0.418 },
                  cringe:   { src:'resources/SI/Nouvelle_SI_Cringe.webp',    top:5,  bot:1533, fx:0.459 },
                  scared:   { src:'resources/SI/Nouvelle_SI_Scared.webp',    top:9,  bot:1530, fx:0.397 },
                  desperate:{ src:'resources/SI/Nouvelle_SI_Desperate.webp', top:2,  bot:1532, fx:0.415 },
                  surprise: { src:'resources/SI/Nouvelle_SI_Surprise.webp',  top:5,  bot:1524, fx:0.487 } } },
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
  lunaria:{ cm:168, standCm:176, eye:32, fx:0.496, top:9, bot:1528, faceAdj:1.22,
           side:'R', alt:null, base:'resources/SI/Lunaria_SI_Armed.webp', expr:{} },
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

/* ══════════════════════════════════════════════════════════════════════
   town.js — 城鎮探索（ver -369）
   ──────────────────────────────────────────────────────────────────────
   非線性：玩家在節點之間走動。每個節點有背景（依時段換差分）、出口箭頭、
   第一次進去才播的對白，有的還有商店或路人閒聊。

   ⚠ 對白**不自己寫一個播放器**：走 `story.playAdhoc`，所以立繪取景、明暗、打字機、
     對話框、面盤手勢全部與主線同一套（CLAUDE.md §6.5「同一把尺」）。
   ⚠ 箭頭要**按住 0.5 秒**才走（Ray 指定，防誤觸），按住期間有蓄能圈；放開就取消。
   ⚠ 每次移動：`se_walk` ＋ 時鐘前進（時間是資源）。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG, fileGain, asset } from '../config.js';   // asset＝鍵→路徑（warmEnemies 用）
import { TOWNS, OUTING, DINE, DRAGON_LINES, QUEST_LOCK} from '../script/town.js';
import * as clock from '../script/clock.js';
import * as prog from '../script/progress.js';
import * as story from './story.js';
import * as inn from './inn.js';                 // 旅店大廳（伙伴門／獨自坐坐／回房睡覺）
import { showShop, showBounty, showExchange, showKitchen, canCookAny } from './loot.js';   // showKitchen＝瑪麗亞的廚房（ver -953）；canCookAny＝現在有沒有菜煮得出來（ver -1659）
import * as gear from './gear.js';               // 戰前強制整備（ver -838，onLeave 的 gear 掛鉤）
import { SPEAKERS, faceStyle } from '../script/speakers.js';
import { SFX } from '../audio.js';
import { state, setPickedPartner } from '../state.js';
/* ⚠ `state` 只讀：`battleSession`／`overkillClean`（擁有者是 combat，見鐵律 3.1）。
   `setPickedPartner` 是 §3.6 指定的**唯一寫入管道** —— 出城要把約會前那一位放回去，
   見 `restoreTownPartner`。 */
/* 追逐的台詞（資料歸資料，鐵律 1；判定在 `dragonActDue`）。 */

const $ = id => document.getElementById(id);

const HOLD_MS = 500;      // 箭頭要按住多久才走（Ray 指定 0.5 秒）
const STEP_MIN = 10;      // 每移動一次花掉的遊戲內分鐘數（城鎮村落的預設）
/* ══ 各圖的移動耗時（ver -871，Ray：「野外探索每次移動是1小時，遺蹟是半小時，
   城鎮村落是十分鐘」）══ 寫在**地圖**上（`TOWNS[].stepMin`，鐵律 1）：
   夏爾森林 60、木雅克神殿 **10**（ver -917 由 30 改，Ray：「遺蹟內每次移動10分鐘好了，
   比城市還大不合理」—— 神殿 21 格比帝都的 12 格還大，半小時一步全清要 20 小時）、
   不寫＝10。跨圖那一步算**出發那張圖**的價。 */
const stepMin = ()=> ((TOWNS[townId]||{}).stepMin || STEP_MIN);
/* 閘門的 `afterMoves` 計數（ver -953）：閘門旗 → 從它可觸發那一刻起走了幾步。
   ⚠ **記憶體變數、不進存檔**：見 stageGate 那一段的說明。`open()` 歸零。 */
let gateMoves={};
function bumpGateMoves(){ for(const k in gateMoves) gateMoves[k]++; }
const ARRIVE_MS = 1000;   // 抵達新地點之後、對白開演之前的停頓（Ray：「先停一秒」）
/* 立繪滑入的時間。⚠ 與 `modules/story.js` 的 `SLIDE_MS` 同值（450ms，§6.5 的 450ms ease-out）——
   兩邊必須一致：這裡是拿它來讓對話框「等人站定」。改一邊要改另一邊（鐵律 7 的但書）。 */
const SLIDE_MS = 450;

let townId=null, nodeId=null, layer=null, busy=false;
let carriedIn=false;   // 這一次進城是「被抬回旅店」（ver -496）；enter() 消化一次就歸零
let arriveT=0;            // 抵達停頓的計時器（換節點要取消，見 enter）
/* ⚠⚠ 傍晚那一格**讓過一次**了嗎（ver -430，Ray：「要等角色先把原有的場景對話講完
   才觸發，移動到下一個場景才強制觸發」）。ver -427 的作法是「優先所有事件」——
   它會把這一次抵達原本要演的進場對白整段吃掉，玩家等於被搶走一段戲。
   現在改成：到期的那一次**讓給**節點自己的對白，記下來；**下一次抵達**才強制觸發。
   ⚠ 只讓一次 —— 不設這個旗標的話，一路走過還沒看過的地點會永遠讓下去。
   ⚠ 主線段落（`acts`）本來就是這個行為（`ev` 在有 act 時是 null），
     這一版只是讓進場對白享有同樣的待遇。 */
let eveningHeld=false;
/* 這一趟是「天黑之後才抵達這座城」嗎（ver -1658）：`open()` 算一次、
   `afterArrive` 交給旅店（`inn.sleepOpened` 讀它）。見 `open()` 裡的說明。 */
let arrivedLate=false;

/* ══ 「她開口了，你下一步去哪」（ver -440，Ray 交稿）══════════════════════
   「諾薇兒在上街區表示肚子餓時，不去其它地方而是**直接**往餐酒館走 → 好感 +1，
     反之不動。」
   節點寫 `nextFavor:{ to, aff, flag }`：那一段進場對白**演完**就開一次機會，
   **下一次抵達**結算 —— 去的是 `to` 就加，去別的地方就把機會用掉（不加也不扣）。
   ⚠⚠ 結算收在 `enter()` **唯一**那個入口（鐵律 8）：走一步、強制轉場、
     從旅店被抓回去…每一條進節點的路都經過它，寫在 `go()` 一定會漏掉其他路徑。
   ⚠ 「已經拿過了」看 `flag`（進 progress，存檔帶得走）；`pendingFavor` 只是
     **這一趟探索**的暫存（`open()` 歸零），不進存檔 —— 它是「你剛剛聽她說了那句話」，
     不是一輪遊戲的進度。
   ⚠ 打烊的店走不進去（`go()` 擋在門口、不移動）→ 機會還留著，那是對的：
     玩家確實是往餐酒館走的。 */
let pendingFavor=null;

/* ══ 夥伴回房休息 → 他相關的對白不再觸發（ver -459，Ray 定案）══════════════
   「夥伴只要已經進入旅店休息，就不會在其他地方觸發該夥伴相關的劇情。
     所以諾薇兒說出她要休息之後，就不會再觸發城鎮與她相關的對話。」
   資料一張表：`on` 的任一旗標成立＝這個人回房了；`until` 成立＝那一夜過去了
   （stage 0 是 07:00 的閘門立 `stage1_open`，隔天她又跟在身邊）。
   ⚠ 「相關」看**這一段對白有沒有她**（speaker 或 portrait.char）—— 不是看地點。
   ⚠ 被擋掉的段落**旗標不記**（同「打烊不播」的先例）：她回到隊上之後
     再走到那裡，該演的照演。 */
const RESTING = [
  { who:'NOUVELLE', on:['inn_wait','inn_renna','inn_missed'], until:'stage1_open' },
];

/* ══ Stage 1 起：夥伴在城裡的所在（ver -461，Ray 定案）══════════════════════
   「夥伴進入城市就會自動亮旅店燈」——之後每次進城，夥伴預設住進旅店：
     · 諾薇兒：城裡還有**她的殘留事件**（沒演過、沒過期的進場對白裡有她）
       → 跟著玩家走；沒有 → 在房內（好感 ≥10 敲門可約出來，見 inn.js）。
     · 其餘三人（ver -575 起四人通用）：預設在房內，白天照 `OUTING` 的行程外出 ——
       走到她所在的那一格會碰到她（見下方「女角外出」）。
   ⚠ 這一組是**這一趟探索**的狀態（同 eveningHeld）：`open()` 歸零、不進存檔。
   ⚠ 全部鎖在 `stage1_open` 之後 —— stage 0 的第一晚有自己的劇本
     （inn_wait 那一套），不能被這一套蓋掉。 */
/* ⚠⚠ ver -1096 由布林 `escortNou` 改成**「同行的是誰」**（`escortId`）——
   Ray 的 Stage9 稿四個人都約得出來（「T2 以上可以約會」），而舊的寫法把
   「有人同行」與「那個人是諾薇兒」綁成同一個變數（`escortWho()` 直接回傳
   `'NOUVELLE'`）。多一個人就要多一個布林，那正是鐵律 7 的病。
   ⚠ 空字串／null ＝沒有人同行。 */
let escortId=null;
/* 同行的諾薇兒走完殘留事件（ver -567）：`nouTiredArmed`＝最後一段演完、等下一次
   抵達演「我累了」那一拍；`nouAsleep`＝演完回房，這一趟敲門只回旁白（睡著了）。
   ⚠ `escortLeftover`＝這一趟同行是**殘留事件**帶起的（open() 判的那一次）——
     「累了回房」只對這種同行成立；**敲門約出來**（onInvite）的同行不喊累，
     不然剛答應出門走兩步就要回去，讀起來是她在敷衍玩家。
   三支都是**這一趟探索**的狀態（同 escortNou）：open() 歸零、不進存檔。 */
let nouTiredArmed=false, nouAsleep=false, escortLeftover=false;
function st1Active(){ return prog.hasFlag('stage1_open'); }
/* ══⚠⚠ **任務探索中？**（ver -1416，說明在 `script/town.js` 的 `QUEST_LOCK`）══
   插了 `flag`、而且 `until` 還沒立 ⇒ 鎖著。**判定只有這一支**（鐵律 7）：
   約會、睡覺、（飛行頁那一側的）降落限制問的是同一個答案。
   ⚠ 資料在 `script/town.js`，這裡一個旗名都不寫死（鐵律 1）。 */
/* ⚠ ver -1511：資料改成**陣列**（一輪裡有好幾段任務窗，台詞各自不同）。
   `questWindow()` 是唯一在答「現在被哪一扇窗押著」的那一支 —— 由上往下取第一扇
   成立的；`questLocked`／`questSay` 都只是它的門面（鐵律 7）。
   ⚠ 舊寫法（單一物件）也吃得下，日後若有人改回去不會壞。 */
function questWindow(){
  const L = Array.isArray(QUEST_LOCK) ? QUEST_LOCK : (QUEST_LOCK ? [QUEST_LOCK] : []);
  for(const q of L){
    if(!q || !q.flag) continue;
    if(prog.hasFlag(q.flag) && !(q.until && prog.hasFlag(q.until))) return q;
  }
  return null;
}
export function questLocked(){ return !!questWindow(); }
export function questSay(kind){ const q=questWindow(); return (q && q[kind]) || ''; }
function leftoverForNou(){
  const T=TOWNS[townId]; if(!T) return false;
  for(const id in T.nodes){
    const n=T.nodes[id];
    if(!n.lines || !n.lines.length) continue;
    if(prog.hasFlag(flagOf(n,id))) continue;
    if(n.expire && prog.hasFlag(n.expire)) continue;
    if(n.lines.some(l=>l && (l.speaker==='NOUVELLE' || (l.portrait && l.portrait.char==='NOUVELLE'))))
      return true;
  }
  return false;
}
/* ══════════════════════════════════════════════════════════════════════
   女角外出（ver -575，Ray 交稿）
   ──────────────────────────────────────────────────────────────────────
   「女主角們在早上 8:00 到下午 6 點可能會出門，出門時不顯示頭像，一天最多出門兩次。
     出現區域是所有的連接用場景（非末端），以及各角色不同。」
   資料在 `script/town.js` 的 `OUTING`（鐵律 1），這裡只負責排與查。

   ⚠⚠ 這一整段**取代** ver -461 的 `rennaOut`（只給蕾娜寫的那一份）——
     四個人各寫一份必然走鐘（鐵律 8）。
   ⚠⚠ 「一天最多兩次」是**結構保證**：`hours` 切成 `perDay` 個等寬的窗，
     一個窗最多產出一次外出。事後數次數的話，跨日、離城再回來那幾條路都要各記一次帳。
   ⚠ 行程是**「這座城的這一天」**的狀態：鑰匙 `outKey` 一變就重排，
     所以走出城再回來（同一天）不會多排一輪。存檔不帶它 ——
     睡覺一定跨到隔天 07:00，醒來本來就要重排（同 `escortNou` 那一組）。
   ⚠ **跟著玩家走的人不算「在外面」**：她在你旁邊，不在某個定點（見 `outNow`）。 */
let outKey=null;          // '<城>#<第幾天>'：這一份行程是替誰排的
let outPlan=[];           // [{who, node, from, to}]，from/to＝開局起算的分鐘數

/* 同行的女伴是誰（目前只有敲門約出來的諾薇兒）。
   ⚠ 由 `escortNou` **推**出來，不另存一份（鐵律 7）—— 日後多一個人同行就改這一支。 */
function escortWho(){ return escortId || null; }
/* 這一章在隊上的女角（`from` 同 flight/talks.js 的 `PARTY`，兩邊註解互指）。 */
function girlsHere(){
  const st=prog.getStage(), who=OUTING.who||{};
  return Object.keys(who).filter(w => (who[w].from||0) <= st);
}
/* ⚠⚠ **「連接用場景」是算出來的**（鐵律 7）：`exits` 裡有 `back` 以外的方向
   ＝它通往別的地方。大城地圖已經規則化，列表一寫死，日後加一座城就漏一次。 */
function connectorIds(){
  const T=TOWNS[townId]||{}, out=[];
  for(const id in (T.nodes||{})){
    const ex=T.nodes[id].exits||{};
    if(Object.keys(ex).some(d=>d!=='back')) out.push(id);
  }
  return out;
}
/* 這座城的餐飲街是哪一格（沒有就 null）。 */
function diningNode(){ return ((TOWNS[townId]||{}).dining||{}).node || null; }

/* ══ 城鎮戰（ver -583，Ray：「城鎮戰所以沿用原圖，但是末端只留教堂，其他末端不可進，
   不用顯示箭頭」）══════════════════════════════════════════════════════════
   資料在城上的 `siege:{from, until, keep}`（鐵律 1）。開著時：**通往末端的箭頭
   只留 `keep` 列的那幾格**，其餘直接不出現（不是走過去被擋 —— Ray 指定「不用顯示
   箭頭」，那才讀得出「那邊過不去」而不是「按了沒反應」）。
   ⚠⚠ 「末端」是**算出來的**（鐵律 7）：`connectorIds()` 之外的就是末端。
     大城地圖已經規則化，列一張死名單日後加一格就漏一次。
   ⚠ 連接用場景一律留著 —— 不然玩家會被關在某一格出不去。
   ⚠ 判定只有這一支，`exitsOf()` 那個唯一的出口表問它（箭頭、目的地字格、鍵盤、
     `go()` 全部一次吃到，鐵律 8）。 */
/* ⚠⚠⚠ **戰鬥地圖與城鎮探索是兩個模式**（ver -584，Ray：「戰鬥期間要跟城鎮探索期間
   分開喔，兩個是不同的，只是背景跟城鎮圖沿用」）。
   城鎮戰開著的時候，這張地圖上**只有「走」與「打」** —— 探索的每一層一律不啟動：
     路人單句／店舖／旅店大廳／進場對白／傍晚提醒／營業時間／女角外出與約會／
     一次性操作提示／「走過了沒」的旗標／走一步花掉的時間
   ⚠⚠ **每一層自己問 `siegeOn()`**（鐵律 8），不是在 `enter()` 一處判完再分派 ——
     日後新增任何一層探索機制，它自己會記得問；寫在呼叫端一定會漏。
   ⚠ 唯一照常的是 `acts`：城鎮戰的那幾場戰鬥就是掛在那上面的。 */
/* ══⚠⚠ **這座城現在該放哪一首**（ver -614，Ray 交辦）══ 只有這一支在決定（鐵律 7）：
   城鎮戰進行中 → `siege.bgm`；其餘 → 城上的 `bgm`。
   ⚠ 三個呼叫點（`open`／`enter`／`resumeBgm`）都問它 —— 各自讀 `T.bgm` 的話，
     打完城鎮戰之後只有其中一個會換回來。
   ⚠ 同曲重播由 `playBgm` 自己擋掉，所以每進一格問一次是安全的。 */
/* ⚠⚠ **城鎮戰的曲子有自己的結束點**（ver -633（-893 前用詞））：`siege.bgmUntil`。
   「地圖還在戰鬥模式」與「還在清怪」是兩件事 —— 打贏教堂 Boss（`np_clear_church`）
   之後城裡的怪已經清完，剩下的是那一段戲＋黑爪那一場，曲子該換成 Suspense6
   （Ray 於 ver -614 指定「結束戰鬥，到 boss 登場前用 Suspense6」）；
   而**遇敵**要到黑爪打完才停（`siege.until`，Ray 於 -633 指定）。
   ⚠ 沒寫 `bgmUntil` ＝ 兩者同一個結束點（其他城照舊）。 */
/* 現在成立的是 `bgmWhen` 的哪一列（由上往下取第一個成立的）。
   ⚠ 抽出來是因為**鎖曲要問同一列**（`bgmLocked`）—— 各自再判一次條件就是兩份真相。 */
function bgmWhenRow(T){
  for(const w of ((T && T.bgmWhen) || [])){
    if(!w || !w.bgm) continue;
    if(w.need && !prog.hasFlag(w.need)) continue;
    if(w.until && prog.hasFlag(w.until)) continue;
    return w;
  }
  return null;
}
/* ══⚠⚠⚠ **`lock:true` ＝這一段期間**連戰鬥都不換曲**（ver -1618，Ray：「換 bgm 後
   就算進戰鬥也不會換音樂，一路播這首到我指示換曲」）══
   ⚠⚠ 旗與曲子共用 `bgmWhen` **同一列**（鐵律 7）：「放哪一首」與「別人不准換掉它」
     是同一個決定，分成兩處寫必然走鐘（會出現「換了曲但沒鎖」或反過來）。
   ⚠ 讀它的是 `main.js` 的 `battleBgmOf` —— 那是「這一場放哪一首」的唯一計算點，
     鎖住就回 null，三個呼叫點看到 null 一律**什麼都不做**（不是播 null）。 */
export function bgmLocked(){
  return !!(bgmWhenRow(TOWNS[townId]) || {}).lock;
}
function townBgm(){
  const T=TOWNS[townId]; if(!T) return null;
  /* ══⚠⚠⚠ **某一段劇情期間換一首**（`bgmWhen`，ver -1420，Ray：「追擊戰期間
     不會換音樂」）══════════════════════════════════════════════════════════
     真因：**每走一格 `enter()` 都會 `ensureBgm(townBgm())`**，而這一支在此之前
     只認得城上的 `T.bgm`（貝利薩爾＝`numina`）—— 所以追擊那一拍換成 gothic 之後，
     **下一步就被打回 numina**。腳本那一拍沒有錯，錯的是沒有人把「這一段期間」
     這件事告訴這一支。
     ⚠⚠ **不要拿 `siege` 去湊**：那個開關會連末端封鎖／店關門／路人閉嘴整套一起開。
       「地圖在戰鬥模式」與「這一段放哪一首」是兩件事（同 `siege.bgmUntil` 當初
       與 `siege.until` 拆開的理由）。
     ⚠ 一張表**由上往下取第一個成立的**（同 `acts`／`innDoors`）：
       所以「王座戰結束後的 crisis」要寫在「追擊戰的 gothic」**上面**。
     ⚠ `need`／`until` 都是旗：插了 `need`、而且 `until` 還沒插 ⇒ 用這一首。 */
  { const w=bgmWhenRow(T); if(w) return w.bgm; }
  const g=siegeOn();
  /* ══ 城重建之後換曲（ver -753，Ray：「stage5 以後的北泊 bgm 改成
     PeriTune_Harbor_Morning_loop」）══ 鑰匙寫在 `rebuild.bgm`（與 -627 的
     重建背景同一個章節門檻 `rebuild.fromStage`，鐵律 7：同一件事同一個門）。
     排在 siege 之後：真的又打起來（日後的稿）仍以戰鬥曲優先。 */
  const rb=T.rebuild;
  const rebuilt = rb && rb.bgm && prog.getStage() >= (rb.fromStage|0);
  if(!g || !g.bgm) return rebuilt ? rb.bgm : T.bgm;
  if(g.bgmUntil && prog.hasFlag(g.bgmUntil)) return rebuilt ? rb.bgm : T.bgm;
  return g.bgm;
}
/* ══⚠⚠ 舊章節的對白封存（ver -753，Ray：「且 stage4 之前的對話都不會再觸發」）══
   城上寫 `muteTalksFrom:<章>`：stage 到了那一章，這座城**既有的**進場對白／
   主線段落（acts）／強制轉場（gates）／onLeave 一律不再觸發 ——
   例外是段落自己標了 `fromStage:<章>`（＝那是新章節的稿，日後 S5 的北泊稿用）。
   ⚠ 路人單句（chatter）不在此列：那是市井的氣氛，不是劇情對白。
   ⚠ 每一層自己問（鐵律 8，同 siegeOn 的作法）。 */
/* ver -858：`need` 收**陣列**（全部都要成立）—— 「該回去看看了」那道門要等
   雜貨店與公會兩支旗都齊（need:['np_med','np_guild_seen']）。單值照舊。 */
function needOk(need){
  if(!need) return true;
  if(Array.isArray(need)) return need.every(f=>prog.hasFlag(f));
  return prog.hasFlag(need);
}
function mutedTalks(){
  const T=TOWNS[townId]; if(!T || T.muteTalksFrom==null) return false;
  return prog.getStage() >= T.muteTalksFrom;
}
/* ══⚠⚠ **安全區旗：一插，這張地圖就不再有遭遇戰**（ver -634，Ray：「只要插
   safehouse flag 就不會有遭遇戰，黑爪戰後就插一個，拔 flag 才會遭遇」
   ＋「flag 跟地圖，一插就是整個北泊」）══
   鐵律 9 的標準形狀：**插了以後被拔之前不動，而且只有單一事件能拔**。
   · 誰插的：那張地圖上寫了 `safehouse:true` 的那一段 `acts` 演完時
     （北方泊地＝教堂那一段：黑爪打完＋戰勝那一段對白）。
   · 誰拔的：**目前還沒有人** —— 日後要讓那張地圖再度不安全，由那一個事件拔掉它。
   ⚠⚠ **旗跟著地圖走**（Ray 指定）：名字由 `townId` 推（`safehouse_northport`），
     所以一插就是**整個北泊**、而且不會影響別座城。
     ⚠ 由 `townId` **推**不由資料寫死：寫死的話插旗那一端與查旗那一端各有一個字串，
       打錯一個字就是「插了但查不到」，而且不會有任何錯誤訊息（鐵律 7）。
   ⚠ 收在 `siegeOn()` 這一支（鐵律 8）：城鎮戰的每一層都問它（§6.5.4.3 那張表），
     所以「不再有遭遇戰」順帶把末端解封、店開回來、時間開始走 —— 一次到位。 */
function safehouseFlag(){ return 'safehouse_' + (townId||''); }
/* ══⚠⚠ **劇情探索旗**（`story_explore_<地圖>`，ver -666，Ray：「劇情期間不會在
   城鎮內遇到女角，這個要插個 flag，分自由探索跟劇情探索。目前北泊都是插劇情
   探索旗，一樣視需求插拔」）══════════════════════════════════════════════
   **劇情探索**＝女角不排外出行程：走到哪一格都不會碰到她們，餐飲街也不會因為
   誰在那裡而換店。**自由探索**＝現在帝都的樣子。
   ⚠⚠ **只有一支旗，而且它記的是「例外」**（鐵律 9：一個狀態一個擁有事件）：
     · 城上 `storyExplore:true` ＝ 這座城**預設是劇情探索**（那是資料，不是狀態）。
     · 旗 `free_explore_<地圖>` ＝「這座城已經開放自由探索了」，**插了才算**。
     · 誰插的：act 上 `endStoryExplore:true`（那一段演完）。
     · 誰拔的：act 上 `storyExplore:true`（要再鎖回劇情探索時）。
   ⚠ 為什麼不是「進城時插一支劇情旗」：那樣**拔掉之後下次進城又會插回去**，
     於是需要第二支「已經拔過了」的旗來記——同一個狀態兩支旗，必然有一支忘了立。
     把旗定義成**例外**（自由探索）就只需要一支。
   ⚠ **旗名由 `townId` 推**：插旗端與查旗端各打一個字串的話，打錯一個字就是
     「插了但查不到」，而且不會有任何錯誤訊息。
   ⚠ 它與**安全區旗**是兩件事：那個管「有沒有遭遇戰」，這個管「碰不碰得到女角」。
     一座城可以是安全區但還在演劇情（北方泊地現在就是）。 */
function freeExploreFlag(){ return 'free_explore_' + (townId||''); }
function storyExploreOn(){
  const T=TOWNS[townId]||{};
  return !!T.storyExplore && !prog.hasFlag(freeExploreFlag());
}
/* ══⚠⚠⚠ **自由活動期間：誰陪你約會，誰就是這一場的搭檔**（ver -1380，Ray 定案）══
   > 「約會時誰同行　城鎮內戰鬥　打靶就是誰當夥伴　不可切換」
   > 「沒有約會的話預設無夥伴」
   > 「如果約會的對象是蕾娜就算是打靶或賞金獵人都會給評價」

   這一支是那三條規則**唯一的真相**（鐵律 7）：`combat` 與 `inspector` 都只讀它。
   回 `null` ＝這條規則現在不適用（照舊走章節預設的搭檔）。
   回 `{who}` ＝規則生效；`who` 是 speaker id 或 `null`（沒約人）。

   ⚠⚠⚠ **範圍是「自由活動開著的時候」，不是「所有城鎮戰鬥」** —— 這不是我縮小
     Ray 的話，是**照字面做會把前面的章節打壞**：北方泊地的城鎮戰那五格＋教堂 Boss
     ＋**聖徒化教學戰**都在 `storyExplore`（劇情探索）期間，那時**根本約不到人** ——
     「沒有約會就無夥伴」照字面套下去，聖徒化教學戰會變成沒有諾薇兒，
     而那一場的整段教學就是她（§6.5.2 的 -681：沒有夥伴＝什麼技都沒有）。
   ⇒ 判準就是既有的 `storyExploreOn()`（旗 `free_explore_<圖>`，§6.5.3）：
     **約得到人的時候才套這條規則**。北泊／夏爾村的劇情探索期一律不受影響。
   ⚠ 也擋掉城鎮戰（`siegeOn()`）：那是「只有走與打」的模式，探索的每一層都不啟動。 */
/* ══⚠⚠⚠ **什麼算「城鎮」：有旅店的地方**（ver -1394，Ray：「城鎮的判定是
   有旅店（含索拉娜的家）的地方算城鎮」）══
   ⚠ **算出來、不列名單**（鐵律 7）：問既有的 `innNodeOf()`（它就是掃 `inn:true`
     的那一支）—— 夏爾村的索菈娜家正是 `sorahome:{inn:true}`，所以這一條天生就對。
   ⚠ 荒野／遺蹟／古道沒有旅店 ⇒ 不是城鎮：約會那一套與搭檔快照都不套用。 */
function isTownMap(t){ return !!innNodeOf(t||townId); }
/* ══⚠⚠⚠ **出了城，搭檔要回到進城前那一位**（ver -1394，Ray：「從城鎮回到飛行地圖
   要保留進城前最後一個登記的伙伴，否則從沒有約會的狀態出來的話伙伴槽會是空的」）══
   成因：`dateParty()` 回 `{who:null}` 時 `combat.startGame` 會
   `setPickedPartner(null)`（＝無夥伴，`state` 的唯一真相）—— 而那是**寫下去的**，
   出城之後沒有人把它放回來。⚠ 更糟的是 `isOpen()` 只看 `townId`，而 `suspend()`
   （出航）**不清 townId** ⇒ 人都到天上了，這條城鎮規則還在生效。
   作法（鐵律 9：一個狀態一個擁有事件）：
     · 誰存：進一張**城鎮**地圖的 `open()`（進城前的那一位）
     · 誰放回去：離開那張地圖 —— `suspend()`（出航）／`close()`（回主選單）／
       `open()` 換到別張圖。三個呼叫點，**一支實作**。
   ⚠ `undefined` ＝沒有快照（不是 `null` —— `null` 是合法值「無夥伴」）。 */
let partnerBeforeTown;
function restoreTownPartner(){
  if(partnerBeforeTown===undefined) return;
  setPickedPartner(partnerBeforeTown);
  partnerBeforeTown=undefined;
}
/* ══⚠⚠⚠ **自由活動期間：誰陪你約會，誰就是這一場的搭檔**（見下方原註）══ */
export function dateParty(){
  /* ⚠⚠ 三道門，缺一不可：
       · `isOpen()`＋`townLive` ＝**人真的還在城裡**（`suspend()` 不清 `townId`，
         所以光問 `isOpen()` 會讓這條規則跟著玩家飛到天上，ver -1394 的實測）
       · `isTownMap()` ＝這張圖是城鎮（有旅店）—— 荒野不套用
       · 劇情探索／城鎮戰期間不套用（見下面兩條的原因） */
  if(!isOpen() || !townLive || !isTownMap() || storyExploreOn() || siegeOn()) return null;
  return { who: datingWho() };                                  // null ＝沒約人＝無夥伴
}
/* ver -858：`lines` 可以是**函式**（呼叫時現算）—— 獵人的每日兌換那種
   「今天的內容由日序決定」的段落用。同一天內冪等（種子＝dayNo）。 */
function actLines(a){ if(!a) return null;
  const L=(typeof a.lines==='function') ? a.lines() : a.lines;
  return L||null; }
function actHasBattle(a){ const L=actLines(a); return !!(L && L.some(l=>l && l.battle)); }
/* 這一段有沒有**收局**（`{settle:true}`：休息處／撤離那一拍，ver -913）。
   ⚠ ver -1135 起它與「有戰鬥」一樣會落一個檢查點 —— Ray：「戰鬥中死亡回到上一個
     踩過的安全點或結算點」，安全點正是這一種段落。 */
function actHasSettle(a){ const L=actLines(a); return !!(L && L.some(l=>l && l.settle)); }
function siegeOn(){
  const g=(TOWNS[townId]||{}).siege;
  if(!g || !g.from || !prog.hasFlag(g.from)) return null;
  if(prog.hasFlag(safehouseFlag())) return null;
  if(g.until && prog.hasFlag(g.until)) return null;
  return g;
}
/* 她可能出現在哪：連接用場景 ∪ 她自己的清單 ∪ 餐飲街。
   ⚠ **旅店不算** —— 她就住在那裡，「出門」的意思是不在旅店。 */
/* 她今天可能出現在哪幾格。
   ⚠⚠ **有指定地點的人就只出現在那裡**（ver -1100，Ray：「有指定出現地點的話
     就不會在其他地方碰到」）：-575 原本是「連接場景 ∪ 她自己的那幾格」——
     那會讓「她今天在湖畔」變成「她可能在湖畔，也可能在任何一條路上」，
     玩家找不到人，指定地點就沒有意義了。
   ⚠ **沒有指定地點的人照舊走連接場景**：那是「碰得到人」的保底，不是誰的專屬。
   ⚠ 逐城的指定地點寫 `nodesBy[城id]`（節點 id 是逐城的 —— 帝都的 `cityhall`
     在夏爾村根本不存在）；`nodes` 是不分城的預設。 */
/* 她在**這座城**的指定地點（`nodesBy[城]` 覆寫不分城的 `nodes`）。
   ⚠ 只有這一支在算（鐵律 7）：外出行程（`areaFor`）與碰面那一段戲都問它。 */
function spotsFor(who){
  const w=(OUTING.who||{})[who]||{};
  return ((w.nodesBy||{})[townId]) || w.nodes || [];
}
function areaFor(who){
  const w=(OUTING.who||{})[who]||{}, T=TOWNS[townId]||{};
  const own=spotsFor(who);
  const set=new Set(own.length ? [] : connectorIds());
  for(const id of own) set.add(id);
  const dn=diningNode(); if(dn && w.dine) set.add(dn);
  return [...set].filter(id => T.nodes[id] && !T.nodes[id].inn);
}
/* 今天 00:00 的「開局起算分鐘數」。⚠ 行程用絕對分鐘存，比時刻穩
   （同 clock.firstHourAt 的理由：拿時刻比，隔天會再成立一次）。 */
function midnightMin(){ return clock.elapsed() - Math.round(clock.hourF()*60); }
const rnd=(a,b)=> a + Math.random()*(b-a);
/* 排這座城這一天的行程。⚠ 鑰匙沒變就不重排（同一天走出城再回來不會多排一輪）。 */
function rollOuting(){
  /* ⚠ **還不能排的時候不要記鑰匙**：記了就等於「今天排過了」，而 `stage1_open`
     是白天中途才立得起來的 —— 卡著鑰匙的話那一天整天沒有人出門。 */
  /* ⚠ 劇情探索期間**不排行程**（ver -666）：不是「排了再擋」——排了就會被
     `outingDebug` 印出來、也會被餐飲街的 `whoOutAt` 讀到，那是兩個真相。 */
  if(!townId || !st1Active() || storyExploreOn()){ outKey=null; outPlan=[]; return; }
  /* 第一次進旅店那一趟：全員在家（ver -1102，見 innSeenFlag）。
     ⚠ 不記鑰匙 —— 走出旅店之後那一天照常再擲一次。 */
  if(innFirstVisit){ outKey=null; outPlan=[]; return; }
  const key = townId + '#' + clock.dayNo();
  if(outKey===key) return;
  outKey=key; outPlan=[];
  const H=OUTING.hours||[8,18], per=Math.max(1, OUTING.perDay|0 || 2);
  const ch=(OUTING.chance!=null?OUTING.chance:0.5), stay=OUTING.stay||[60,150];
  const mid=midnightMin(), span=((H[1]-H[0])*60)/per;
  for(const who of girlsHere()){
    const area=areaFor(who); if(!area.length) continue;
    for(let k=0;k<per;k++){
      if(Math.random() >= ch) continue;
      const w0=H[0]*60 + span*k, w1=w0+span;
      /* ══⚠⚠ **出了門就待到 `backHour`**（ver -1100，Ray：「角色如果出門，
         在 19:00 之前不會回來」）══ -575 是「待 `stay` 分鐘就回房」，那會讓玩家
         走到那一格時她剛好回去了，讀起來是撲空不是「她今天出門了」。
         ⚠ `stay` 只剩**出門的時刻**還在用（在這個窗裡隨機挑一點出發），
           結束時刻一律是 19:00。
         ⚠ 一個人排到第一次就佔滿到 19:00，所以第二個窗的重疊檢查自然擋掉她 ——
           不必另外寫「一天只出一次」（鐵律 7：讓既有的檢查自己成立）。 */
      const len=Math.min(rnd(stay[0], stay[1]), span);
      const from=mid + Math.round(rnd(w0, w1-len));
      const to=mid + Math.round(((OUTING.backHour!=null?OUTING.backHour:19))*60);
      /* ⚠ **同一格同一時段不放兩個人**：那樣「當下是誰在那個區域」就答不出唯一解，
         而餐飲街要靠它決定開哪一家店。挑不到空的就這一次不出門。 */
      const free=area.filter(id => !outPlan.some(o =>
        o.node===id && o.from<to && from<o.to));
      if(!free.length) continue;
      /* ⚠ 已經排過一次的人不再排（她要待到 19:00，第二個窗沒有意義）。 */
      if(outPlan.some(o=>o.who===who)) break;
      outPlan.push({ who, node: free[(Math.random()*free.length)|0], from, to });
    }
  }
}
/* ══ 約會（ver -576，Ray：「出城鎮、回旅店以後就要解除約會，一天內同人不能約
   第二次，會拒絕」）══════════════════════════════════════════════════════
   「約會」＝在旅店敲門把人約出來的那種同行（`onInvite`）。
   ⚠⚠ **殘留事件帶起來的同行不算約會**（`escortLeftover`）：那一種有自己的收尾
     （ver -567 的 `nouTired`），被這一條收掉的話她的那一段戲就演不到了。
   ⚠ `datedSet` 是**這一天**的狀態，鑰匙是 `dayNo()` —— 日期一變自己歸零，
     所以「出城再進城」還是同一天就約不了第二次（同 `outKey` 的作法）。
   ⚠ 不進存檔：睡覺一定跨到隔天，醒來本來就該重來。 */
/* `townLive` ＝城鎮的介面現在真的活著。⚠ `townId` **不是**這個答案：`suspend()`
   （出航）刻意不清它（ver -437：飛行畫面下半還要看得到城鎮的移動選項）。 */
let townLive=false;
let dateDay=null, datedSet=new Set();
let dateSpentDay=null;       // 今天的約會額度被某一段劇情用掉了（ver -1394，見 dateSpentToday）
/* 這一天已經演過的碰面戲（ver -1102）：鑰匙是 `誰#m`（碰到）／`誰#d`（約會派生）
   —— 同一天走回同一格不重演，好感也就不會被刷（記帳走 `applyAff`，演完才記）。
   ⚠ 與 `datedSet` 共用**同一支換日檢查**（鐵律 7：「換日了沒」只有一個答案）。 */
let metSet=new Set();
function dateDayCheck(){ const d=clock.dayNo();
  if(dateDay!==d){ dateDay=d; datedSet=new Set(); metSet=new Set(); dateSpentDay=null; } }
/* ══⚠⚠ **今天的約會額度用掉了，但沒有約任何人**（ver -1394，見 act 的 `dateSpent`）══
   誰插：`dateSpent:true` 的那一段演完（現在只有大學巧遇蕾娜那一段）。
   誰拔：換日（上面那一支）／離開地圖（`suspend`）—— 與 `datedSet` **同兩個時機**，
     那是 -1383 就定好的規矩，跟著它走才不會長出第二套換日規則（鐵律 7）。
   ⚠ 它**不進 `datedSet`**：進去的話其他人的頭像會跟著消失，而 Ray 要的是
     「頭像還在，敲門才拒絕」。 */
function dateSpentToday(){ dateDayCheck(); return dateSpentDay===clock.dayNo(); }
function markDateSpent(){ dateDayCheck(); dateSpentDay=clock.dayNo(); }
function datedToday(who){ dateDayCheck(); return datedSet.has(who); }
function markDated(who){ dateDayCheck(); datedSet.add(who); }
function metToday(k){ dateDayCheck(); return metSet.has(k); }
function markMet(k){ dateDayCheck(); metSet.add(k); }
/* ⚠⚠ **「現在正在跟誰約會」只有這一支**（ver -1102，鐵律 7/8）：敲門那一關、
   「約會中誰都不在外面」、碰面的約會派生，三個地方問的是同一件事。
   ⚠ 殘留事件帶起來的同行（`escortLeftover`，ver -567 的諾薇兒）**不算約會**。 */
function datingWho(){ return (escortId && !escortLeftover) ? escortId : null; }
/* ⚠⚠ 解除約會只有這一支（鐵律 8）：出城鎮（`suspend`／`close`）兩條路叫它。
   ⚠ ver -1097 起**「回到旅店」不再解除**（見 `enter()` 那一段的說明）——
     -576 那一條是帝都測試期的鷹架，那時約會還沒有內容。 */
/* ⚠⚠ 約會結束（ver -576 的唯一那一支）。ver -1348 起順手收掉同行徽 ——
   三條解除的路（出城／回主選單／走進旅店）與 `act.endDate`（18:00 她先回去）
   全部經過這裡，所以徽章只有這一個終點需要記（鐵律 8）。
   ⚠ `showEscortBadge()` 是冪等的：沒在約會它自己把元素移除。 */
function endDate(){ if(escortId && !escortLeftover) escortId=null; try{ showEscortBadge(); }catch(_){} }

/* ══⚠⚠⚠ `act.clockToday` ＝這一段演完，時鐘推到「今天的某一刻」（ver -1394／-1396）══
   兩種寫法，**判定只有這一支**（鐵律 7／8 —— 呼叫端只有 acts 收尾那一處）：

     clockToday: 18                  ⇒ 推到今天 18:00（過了就不動）
     clockToday: { hour:18, lateFrom:15 }
                                     ⇒ 推到 18:00 ＋ max(0, floor(現在 − 15)) 小時

   後者是 Ray 的貝利薩爾首戰回程（ver -1396）：「固定 18:00，若在觸發首戰之前
   玩家時間已經超過 15:00，則每超過一小時就在 18:00 的基礎上加一小時」。
   ⚠ 「超過一小時」算的是**整小時**：15:30 不加、16:00 加一。
   ⚠⚠ `lateFrom` 那一條有可能把目標推出當天（現在 ≥21:00 ⇒ 目標 ≥24）——
     那時要走 `advanceToNextHour`（＝隔天的那個時刻）。⚠ **不可以直接餵
     `advanceToHour(目標%24)`**：它只推今天、已經過了就**不動**，時間會憑空少掉
     一整段，而且畫面上沒有任何錯誤訊息。
   ⚠ 兩支都不倒轉（時間是資源，§6.5.4.1）。 */
function applyClockToday(spec){
  if(spec==null) return;
  if(typeof spec==='number'){ clock.advanceToHour(spec); return; }
  const base = +spec.hour;
  if(!isFinite(base)) return;
  let target = base;
  if(spec.lateFrom!=null){
    target += Math.max(0, Math.floor(clock.hourF() - spec.lateFrom));
  }
  if(target >= 24) clock.advanceToNextHour(target % 24);
  else             clock.advanceToHour(target);
}

/* ══ 宵禁（ver -576，Ray：「晚上九點以後女主角就不出門，約不出來…到隔天七點以後
   才恢復」）══ 判定只有這一支（鐵律 8）：外出行程與旅店敲門都問它。
   ⚠ 跨午夜，上界不含（同節點的 `hours`）。 */
function isCurfew(){
  const c=(OUTING.curfew)||[21,7], h=clock.hourF();
  return (c[0] > c[1]) ? (h>=c[0] || h<c[1]) : (h>=c[0] && h<c[1]);
}
/* 現在在外面的人：`{ who: 節點id }`。 */
function outNow(){
  /* 戰鬥地圖上沒有人在逛街（ver -584）：城鎮戰是另一個模式，見 `siegeOn()`。 */
  if(siegeOn()) return {};
  /* ⚠ 行程本來就排在 8~18 點，這一條現在攔不到東西 —— 但**規則要寫在規則上**：
     日後把 `hours` 拉長，宵禁不必跟著改（鐵律 8）。 */
  if(isCurfew()) return {};
  /* ⚠⚠ **約會中誰都不在外面**（ver -1096，Ray：「一旦進入約會狀態…期間不會
     碰到其他女主角」）：那一段是兩個人的時間，路上撞見第三個人會把它打斷。
     ⚠ 擋在這一支（唯一那個「現在誰在外面」的答案）—— 餐飲街開哪一家、
       路上碰不碰得到人、門燈亮不亮全部問它，寫在各個呼叫點一定會漏（鐵律 8）。
     ⚠ 只擋**約會**（`onInvite` 那一種）：殘留事件帶起來的同行不算（`escortLeftover`），
       那一種有自己的收尾。 */
  if(datingWho()) return {};
  rollOuting();
  const t=clock.elapsed(), m={};
  for(const o of outPlan) if(t>=o.from && t<o.to) m[o.who]=o.node;
  const e=escortWho(); if(e) delete m[e];      // 跟著玩家走的不算「在外面」
  return m;
}
function isOutNow(who){ return !!outNow()[who]; }
/* 這一格現在有誰（沒有就 null）。⚠ 排程保證同一格同時只有一個人。 */
function whoOutAt(id){ const m=outNow(); for(const w in m) if(m[w]===id) return w; return null; }
/* ══⚠⚠⚠ **一天只能約一個人**（ver -1383，Ray：「一天只能約一個人　如果約了其中
   一個　其他人的頭像就會消失　就算回旅店解除約會也要到隔天或離開地圖才會回來」）══
   今天已經約過誰了 ⇒ **其他三個人的門一律當成空房**（頭像不畫，不是「燈熄」——
   §6.5.5 的三態裡那是 `out`）。
   ⚠⚠ 它**不看現在還在不在約會中**，看的是 `datedSet`（**今天約過了沒**）——
     所以「送她回旅店、同行解除了」之後其他人照樣不會回來，那正是 Ray 要的。
   ⚠ 回來的兩個時機，都是既有的：
     · **隔天** —— `dateDayCheck()` 換日就把 `datedSet` 倒掉（鑰匙是 `dayNo()`）
     · **離開地圖** —— ver -1383 起 `suspend()` 也清（見那一支）
   ⚠ 被約的那一個**自己照舊**：她送回旅店之後就在房裡，門要亮得回來。 */
function datedSomeoneToday(){ dateDayCheck(); return datedSet.size>0; }
/* 誰在房裡（＝門要亮頭像）。⚠ 出門與同行都是「不在房裡」——
   `doorState` 只問這一支，Ray：「出門時不顯示頭像」。 */
function inRoom(who){
  if(datedSomeoneToday() && !datedToday(who)) return false;   // 今天約的是別人（ver -1383）
  return !isOutNow(who) && who!==escortWho();
}
/* 這一格現在的門設定（ver -666）：`innDoors` 由上往下取第一個 `need` 成立的。
   ⚠ 沒寫就回空物件 —— 呼叫端一律 `||` 帶預設，不必判 null。 */
function innDoorSet(n){
  for(const d of (n && n.innDoors) || []){
    if(d.need && !prog.hasFlag(d.need)) continue;
    return d;
  }
  return {};
}

/* ══ 餐飲街開哪一家（ver -575）══════════════════════════════════════════
   Ray：「餐飲街方向會出什麼場景取決於同行女伴，或者當下是誰在那個區域」
        「無女伴、且該場景無分配角色時就是酒吧」
   ⚠ 判定只有這一支（鐵律 8）：背景、地名、目的地字格全部問它。
   ⚠ 這座城沒開 `scenes` 就回 null（＝照節點原本那一張，帝都的餐酒館）。 */
function dineKey(){
  const d=(TOWNS[townId]||{}).dining;
  if(!d || !d.scenes || !d.node) return null;
  const who = escortWho() || whoOutAt(d.node);
  const k = who && ((OUTING.who||{})[who]||{}).dine;
  return (k && (DINE.scenes||{})[k]) ? k : (DINE.fallback||'bar');
}
/* ══ 這一格的分店（ver -578）══ 不是餐飲街／這座城沒開分店／這座城沒有那一家
   → null（＝照節點原本那一張）。
   ⚠ **名字是全域的、圖與路人語是這座城的**（見 `script/town.js` 的 DINE 註解）——
     合併只有這一支（鐵律 7），背景／地名／路人語都問它。 */
function dineSceneOf(id){
  const d=(TOWNS[townId]||{}).dining;
  if(!d || !d.node || id!==d.node || !d.scenes) return null;
  const k=dineKey(); if(!k) return null;
  const t=d.scenes[k]; if(!t) return null;            // 這座城沒有這一家 → 不換
  return { key:k, name:((DINE.scenes||{})[k]||{}).name || k,
           bg:t.bg, noTime:!!t.noTime, chatter:t.chatter||null };
}

/* 排出來的行程長什麼樣（給調機率用，同 flight/talks.js 的 `talkDebug`）。
   ⚠ 只讀，不排 —— 但會先 `rollOuting()`，所以在城裡任何時候問都是當下那一份。 */
export function outingDebug(){
  rollOuting();
  const t=clock.elapsed();
  return { key:outKey, now:outNow(), dine:dineKey(),
           plan: outPlan.map(o=>({ who:o.who, node:o.node,
             from:hhmm(o.from), to:hhmm(o.to), on:(t>=o.from && t<o.to) })) };
}
/* 開局起算的分鐘數 → 時刻。⚠ 開局是 11:00 不是 00:00（`clock.EPOCH`），
   直接 `%1440` 會整整偏 11 小時。 */
function hhmm(min){
  const t=((min + clock.EPOCH.h*60 + clock.EPOCH.mi) % 1440 + 1440) % 1440;
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}

/* 走到有人的那一格 → 碰到她（立繪＋一句話）。afterArrive 收尾呼叫。
   ⚠ 走**路人單句那一套**（`flashLine` ＋ `chatterOn`）：再點一下收掉，節奏一致。
   ⚠ 有 `meetBy` 的城**先走整段戲**（見 `meetScene`），這一支是它的退路 —— 帝都
     沒寫 `meetBy`，行為一個字都沒動。 */
function maybeMeetOut(){
  const who=whoOutAt(nodeId); if(!who) return;
  const w=(OUTING.who||{})[who]||{};
  story.castSolo(who);
  if(w.line) story.flashLine(w.line, (SPEAKERS[who]||{}).name||'');
  chatterOn=true;
}
/* ══⚠⚠ 碰面的**整段戲**與約會派生（ver -1102，Ray 的 Stage9 稿）══════════════
   回傳這一次抵達要演的那一段（沒有就 null）；資料在 `OUTING.who[誰].meetBy[城]`。
   兩條路各自成立：
     · **沒在約會** → 她今天排到這一格（`whoOutAt`）→ 演 `lines`。
     · **正在跟她約會** → 走到**她的指定地點**（`spotsFor`）→ 演 `lines ＋ date.lines`。
   ⚠⚠⚠ **派生只看「是不是正在跟她約會」，不看好感**（Ray：「通通約會才派生，
     全部改成T2」）：好感那一關在旅店敲門時就判完了（`dateAff`），這裡再判一次
     就是第二個計算點（鐵律 7）。
   ⚠ 約會中 `outNow()` 一律是空的（那一段是兩個人的時間），所以約會這條路
     **一定要自己問 `datingWho()`** —— 靠 `whoOutAt` 永遠等不到她。
   ⚠ 約會中走到**別的**格子什麼都不演：她就在你旁邊，不需要「碰到」。
   ⚠ 好感與「演過了」都是**演完才記**（`applyAff` ＋ `markMet`，見呼叫端）。 */
function meetScene(){
  const dw=datingWho(), who = dw || whoOutAt(nodeId);
  if(!who) return null;
  const M=(((OUTING.who||{})[who]||{}).meetBy||{})[townId];
  if(!M) return null;
  if(dw && spotsFor(who).indexOf(nodeId)<0) return null;
  const key = who + (dw ? '#d' : '#m');
  if(metToday(key)) return null;
  /* 偶遇走 `meet`、約會走 `date` —— 兩條尾巴是**互斥**的（ver -1102，Ray：
     「約會的時候蕾娜是不會有『啊，你也來啦』的，那是偶遇才會有」）。 */
  const tail = dw ? ((M.date||{}).lines||[]) : ((M.meet||{}).lines||[]);
  const lines=(M.lines||[]).concat(tail);
  if(!lines.length) return null;
  /* ⚠ 第一句加 `delay`：立繪滑入要 450ms，框要等她站定才出（§6.5，同 `enter()`）。 */
  return { key, play: lines.map((l,i)=> (i===0 && l && l.delay==null)
                                        ? Object.assign({}, l, { delay:SLIDE_MS }) : l) };
}
function restingSet(){
  const s={};
  for(const r of RESTING){
    if(r.until && prog.hasFlag(r.until)) continue;
    if(r.on.some(f=>prog.hasFlag(f))) s[r.who]=1;
  }
  /* Stage 1 起（ver -461）：諾薇兒在房內（沒被約出來）＝她不在場，
     她會插話的段落（店主對談等）不觸發；約出來（escortNou）就解封。 */
  if(st1Active() && townId && escortId!=='NOUVELLE') s.NOUVELLE=1;
  return s;
}
function linesBlockedByRest(lines){
  const rs=restingSet();
  for(const k in rs){
    if((lines||[]).some(l=>l && (l.speaker===k || (l.portrait && l.portrait.char===k))))
      return true;
  }
  return false;
}
/* 開一次「下一步走去某處就加好感」的機會。⚠ 傳進來的可以是**節點**也可以是
   **段落**（`acts` 的一項）—— 兩者都用 `nextFavor` 這個欄位（ver -664）。 */
function armFavor(n){
  const f = n && n.nextFavor; if(!f) return;
  if(f.flag && prog.hasFlag(f.flag)) return;      // 這一輪已經拿過了
  pendingFavor = f;
}
function resolveFavor(to){
  const f = pendingFavor; if(!f) return;
  /* ⚠⚠ `throughConnectors`（ver -664，Ray：「若**先進了其他末端地圖**則失去此機會」）：
     連接用場景（東側／西側／北側／碼頭大道）**只是路**，走過去不算「去了別的地方」——
     不然從旅店到教堂中間一定要經過兩三格，這個機會根本不可能達成。
     ⚠ 「連接場景」是**算出來的**（`connectorIds`，鐵律 7），不列死名單。 */
  if(f.throughConnectors && to!==f.to && connectorIds().indexOf(to)>=0) return;
  pendingFavor = null;                            // 機會只有一次，去哪裡都用掉
  if(to !== f.to) return;                         // 去了別的地方 → 不加也不扣
  for(const who in (f.aff||{})) prog.addAffection(who, f.aff[who]);
  if(f.flag) prog.addFlags([f.flag]);
}

/* ══ 背景：時段差分 → 退回 `_Day` → 退回無時段的原名 ══
   命名規約（Ray 指定，全城鎮通用）：`<地點>_Dawn/_Day/_Dusk/_night/_midnight`。
   ⚠ **室內不吃時段**（雜貨舖、酒館內部…）：那些圖只有一張，檔名沒有尾巴 ——
     節點寫 `noTime:true`，或讓候選鏈自己退到原名。
   ⚠ 用 `Image` 逐個試而不是 HEAD 請求：一次移動等一個 round-trip 太貴，
     而 Image 本來就要載。**載到才換**，所以不會閃到破圖。
   ⚠ 退回要留一筆 console —— 否則「為什麼晚上還是白天」會查很久。 */
const missingBg=new Set();
/* ⚠⚠ 候選鏈本身（時段尾巴的大小寫變體、`.webp`／`.png` 兩種副檔名、退回 `_Day`
   與原名）**搬到 `modules/story.js` 的 `bandNames`** 了（ver -427）——
   Ray 把插圖也拆成時段差分之後，那條規矩有兩個使用者，抄兩份必然走鐘（鐵律 7）。
   為什麼需要那些變體與副檔名，見那一支的註解。 */
/* ⚠ 換節點的**流水號**：背景是非同步載的，快速連走兩個節點時，前一個的 `onload`
   可能**晚於**後一個才回來 —— 那時它會把已經換好的背景又蓋回舊的那一張
   （實測：開城 → 立刻進大教堂，畫面停在廣場）。載完先確認自己還是最新的那一次。 */
let bgSeq=0;
/* 候選鏈第一個名字（＝已編進時段）→ 真的載得到的那一張（ver -442，見 `bgFor`）。 */
const bgResolved=new Map();
/* ══⚠⚠ **現在畫面上是哪一張背景**（ver -592（-893 前用詞），Ray：「打完敵人應該會留在原背景，
   不要自動切背景」）══ 城鎮的插入戰要用**你站的那一格**當戰鬥背景 ——
   不然打完一場，上半的圖會從敵人卡指定的那張跳回節點原本那張，讀起來是換景。
   ⚠ 記的是**真的載到的那個檔名**（含副檔名與時段），不是基底名 ——
     戰鬥那邊要直接拿去當 `background-image`，再解析一次就是第二個計算點（鐵律 7）。
   ⚠ 由 `main.js` 在交棒進戰鬥的那一刻讀走（`combat.setBattleBg`）：
     城鎮不認識戰鬥層，戰鬥層也不該反過來問城鎮。 */
let bgNow=null;
export function currentBg(){ return bgNow; }
/* ══⚠⚠ **現在打的是不是「劇情戰」**（ver -680（-893 前用詞），Ray：「劇情戰戰敗是回捲至上一段
   劇情喔，不是直接送回旅店」）══
   由 `runArrival` 在取到那一段時記下（`act.storyBattle`），`enter()` 開頭歸零。
   ⚠ 打輸的話那一段的 `done` 不會跑，所以旗會留著 —— 那正是要的：
     戰敗的分流（`main.js` 的 `setStoryReturn`）就是在那個時候問它。
   ⚠ 為什麼不問 `state.storyBattle`：那一支是**戰鬥**那一層的（敵人卡的 `story`），
     北方泊地的城鎮戰雜怪也是 1 —— 分不出「劇本安排的那一場」與「城鎮戰的一格」。
     這裡問的是**段落**怎麼宣告自己（同 `actDue` 的 `storyBattle`，鐵律 7）。 */
let storyActNow = false;
export function storyBattleAct(){ return storyActNow; }
/* 這座城的入口那一格（ver -698，見 open()）：遭遇戰打輸把人放回這裡。 */
let entryNodeId = null;
export function entryNode(){ return entryNodeId; }
/* ══ 這座城要哪些資源 ══ 餵給 `story.loadScene`（鐵律 13 第 3／5 條那一道讀取頁；
   **什麼時候跳那一頁不在這裡判斷**，看 CLAUDE.md 那五條）。
   ⚠⚠ **入口那一格真的解碼，其餘格子只暖 HTTP 快取**（`warm`）—— 一座城十幾格，
     全部解碼是上百 MB。走過去時 `<img>` 現抓即顯示。
   ⚠ 只收**當下時段**的候選（`bgCandsOf` 本來就是照現在幾點算的）。Ray：「四差分的
     時機不重要，因為不是實時的 —— 移動或打完以後剛好切差分，體感也正常。」
   ⚠ 音效**從資料掃出來**（`collectSe`，ver -1298）＋ 程式自己會播的那幾支
     （`TOWN_SE`）。不手維護清單 —— 見 collectSe 的說明。
     ⚠ 掃漏了也不會壞：`playSrc` 查不到 buffer 會自己 load 再播，只是第一次晚一拍。
   ⚠ BGM 取城上那一首就好，不問 `townBgm()`：那一支要 `townId` 已經設好，而這裡
     跑在 `open()` **之前**。圍城／重建換的那一首由 `enter()` 的 `ensureBgm` 現抓
     （晚幾百毫秒起播，§6.6 說得很清楚：音樂晚到不會壞）。 */
/* ══⚠⚠ 這座城會用到哪些音效（ver -1298）══════════════════════════════════
   ⚠⚠ **不手維護清單**（鐵律 7）：腳本自己就是真相 —— 把這座城的資料整個走一遍，
     把每一拍寫的 `se:` 收集起來。手抄一份的話，改腳本忘了改清單就走鐘，
     而走鐘的症狀是「某一句的音效偶爾不出來」，幾乎查不到。
   ⚠ 城鎮層**自己**會播的那幾支不在腳本裡（走路、翻頁、睡覺、買賣、治療），
     所以另外列成 `TOWN_SE` —— 那是**程式**播的，不是資料。
     ⚠ `se_walk` 是每走一步都要響的那一支，沒預載到第一步就是無聲。
   ⚠ 只收字串：`se:` 偶爾寫成物件（帶延遲那種）時取它的名字欄。
   ⚠ 深度設上限：資料是人寫的，環狀參照不值得為它冒風險。 */
const TOWN_SE = ['se_walk', 'se_ui_pageflip', 'se_sleep', 'se_healing', 'se_buy'];
function collectSe(o, out, depth){
  if(!o || depth > 10) return out;
  if(Array.isArray(o)){ for(const v of o) collectSe(v, out, depth+1); return out; }
  if(typeof o !== 'object') return out;
  const v = o.se;
  if(typeof v === 'string') out.add(v);
  else if(Array.isArray(v)) for(const x of v){ if(typeof x === 'string') out.add(x); }
  else if(v && typeof v === 'object' && typeof v.name === 'string') out.add(v.name);
  for(const k in o) if(k !== 'se') collectSe(o[k], out, depth+1);
  return out;
}
/* 把一格的候選鏈**解出來並記住**（ver -1297）：依序 fetch 到第一個 200 為止，
   答案寫進 `bgResolved`（與 `bgFor` 同一張表，鐵律 7）——
   所以進城之後 `bgFor` 直接命中，一個探測都不再發。
   ⚠ 為什麼不讓 `loadScene` 自己試：**404 不進 HTTP 快取**，它試完 `bgFor` 還會
     再試一輪，同一串候選白吃兩遍（實測旅店那一格 35 個 404 ×2）。
   ⚠ `decode` ＝ 真的解碼那一張：它是入口圖，讀取頁一收就要畫出來。
   ⚠ 一張都沒有也要 resolve：不能把玩家留在讀取頁裡（同 `bgFor` 的 `fin`）。 */
function resolveBgOnce(all, decode, maxTry){
  /* ⚠⚠ `maxTry` ＝**最多探幾個候選**（暖身用）。一條完整的候選鏈是
     「4 個時段 × 大小寫 × 4 種副檔名 ＋ 無時段」≈ **32 個名字**，對一座 13 格的城
     全跑一遍就是 **416 個 404**（ver -1297 實測）—— 那正是 -1293「候選鏈少吃
     429 個 404」在修的東西，不能再種回去。
     暖身只探**最可能的那幾個**（規約是 WebP，§5），沒中就放著：玩家真的走過去時
     `bgFor` 會照舊跑完整條鏈，**與沒有暖身時完全一樣**，不會壞。
     ⚠ 入口那一張**不設上限**：它一定要找到，讀取頁就是在等它。 */
  let list = (all || []).filter(Boolean);
  /* ══⚠⚠ **把最可能的那幾個排到最前面**（ver -1298）══════════════════════
     完整的候選鏈是「4 個時段 × 大小寫 × 4 種副檔名 ＋ 無時段」≈ 32 個名字，
     而專案裡實際只有兩種命名：**這個時段的 `.webp`**（`Varn_Square_Day.webp`）
     與**無時段的 `.webp`**（`Northport_west_BF.webp`）。照原順序硬跑，
     後者要探到第 33 個才中 —— 那 32 個 404 每進一次城就白吃一次。
     ⚠⚠ **最後那一個一定要在前排**：它就是無時段那張，整批城靠它。
     ⚠ 其餘候選**不是刪掉是排到後面**（`maxTry` 沒給時）：交件先給 PNG、
       或大小寫不同的情況仍然要找得到（§6.5.4 那條 macOS/靜態空間的差異）。
     ⚠ 暖身（`maxTry`）就只探前排，沒中就放著 —— 玩家真的走過去時
       `bgFor` 會跑完整條鏈，與沒暖身時完全一樣。 */
  const w = list.filter(nm=>/\.webp$/i.test(nm));
  const head = [];
  for(const nm of w.slice(0, 2)) if(head.indexOf(nm) < 0) head.push(nm);
  if(w.length && head.indexOf(w[w.length-1]) < 0) head.push(w[w.length-1]);
  list = maxTry ? head.slice(0, maxTry)
                : head.concat(list.filter(nm => head.indexOf(nm) < 0));
  if(!list.length) return Promise.resolve(null);
  const hit = bgResolved.get(list[0]);
  const draw = nm => !decode ? Promise.resolve(nm) : new Promise(res=>{
    const im = new Image();
    im.onerror = ()=>res(nm);
    im.onload  = ()=>{ (im.decode ? im.decode() : Promise.resolve()).then(()=>res(nm), ()=>res(nm)); };
    im.src = story.bgUrl(nm);
  });
  if(hit) return draw(hit);
  let i = 0;
  const step = ()=>{
    if(i >= list.length) return Promise.resolve(null);
    const nm = list[i++];
    return fetch(story.bgUrl(nm))
      .then(r => (r && r.ok) ? (bgResolved.set(list[0], nm), draw(nm)) : step())
      .catch(step);
  };
  return step();
}
/* 其餘格子的背景：**只暖 HTTP 快取、順便把候選鏈解出來**（ver -1297）。
   ⚠ 用 `fetch` 不用 `new Image()`：一座城十幾格，解碼後上百 MB（ver -1295 的坑）。
     走過去時 `<img>` 現抓即顯示，而且只解碼那一張。
   ⚠ 依序試、中一張就停，並把答案寫進 `bgResolved` —— 與 `bgFor` 同一張表，
     所以之後走過去是直接命中，不再發任何探測請求。
   ⚠ 同時只跑 2 格：讀取頁剛收掉、玩家正在操作，這一批不該跟真的要用的圖搶連線。
   ⚠ 換城就作廢（`warmSeq`）：上一座城的暖身還在跑的話，新的一座要先贏。 */
/* 暖身每格最多探幾個候選（只探 `.webp`）：現在這個時段的大小寫兩種 ＋ 無時段那一張，
   涵蓋專案裡實際存在的兩種命名（`Varn_Square_Day.webp` 與 `Northport_west_BF.webp`）。 */
const WARM_TRIES = 3;
let warmSeq = 0;
function warmRest(T, skipId){
  const my = ++warmSeq;
  const ids = Object.keys(T.nodes || {}).filter(k => k !== skipId);
  let at = 0;
  const nextNode = ()=>{
    if(my !== warmSeq || at >= ids.length) return;
    const k = ids[at++];
    /* ⚠ 走**同一支** `resolveBgOnce`（鐵律 8）——只差不解碼：這幾格還沒要畫，
       位元組進了 HTTP 快取、答案進了 `bgResolved` 就夠了。 */
    resolveBgOnce(bgCandsOf(T.nodes[k], k), false, WARM_TRIES).then(()=>{ if(my===warmSeq) nextNode(); });
  };
  for(let c = 0; c < 2; c++) nextNode();
}
/* ══ 這張圖會出現的怪，進圖時就預熱（ver -1578）══ 鐵律 13 第 3／5 條套用到
   敵人立繪：這張圖的怪由**這張圖自己**在讀取頁收掉之後背景預熱。

   ⚠⚠⚠ **名單是算出來的，不是列出來的**（鐵律 7）：資料上早就寫著「這張圖有哪些
     戰鬥」——`wildSpawn`（必出／池子／指定遭遇）、每一格 `acts` 裡的 `{battle:…}`、
     追兵的 `chase.battles`。列一張死名單的話，Ray 日後把那 26 隻接進 `wildSpawn`，
     **名單那一份不會有人記得更新** —— 而漏掉的下場只是「那一隻晚一拍」，
     沒有任何錯誤訊息，永遠不會有人發現。
   ⚠ 走 `warm`（讀取頁**收掉之後**才跑）不走 `imgs`（會擋讀取頁）：這幾張不是
     這一刻要畫的東西，§6.6 的「等」只留給「這個畫面現在就要的」。
   ⚠ **只進 HTTP 快取、不解碼**（同 `warmRest` 那一句）：解碼是記憶體，而這一批
     多半用不到 —— 真的要畫的那一刻 `loadEnemyPortrait` 自己會解。
   ⚠ 一次兩條連線（同 `warmRest`）：手機並發只有 6 條，背景預熱不該把前景餓死。 */
function battleIdsOf(T){
  const out = new Set();
  const add = b => { if(typeof b==='string' && b) out.add(b); };
  const W = T.wildSpawn || {};
  for(const k in (W.fixed||{})) add(wildVariant(W.fixed[k]));
  for(const p of (W.pool||[])) add(wildVariant(p && p.battle));
  add(wildVariant(W.endBattle));
  for(const e of (W.encounters||[]))
    for(const l of (actLines(e && e.act) || [])) add(l && l.battle);
  for(const id in (T.nodes||{})){
    const n=T.nodes[id];
    for(const a of (n.acts||[])) for(const l of (actLines(a)||[])) add(l && l.battle);
    for(const l of (actLines(n.onLeave)||[])) add(l && l.battle);
  }
  for(const b of ((T.chase||{}).battles||[])) add(b);
  return [...out];
}
function enemyImgsOf(T){
  const B=GAME_CONFIG.battles||{}, E=GAME_CONFIG.enemies||{}, out=[];
  for(const id of battleIdsOf(T)){
    const card = E[(B[id]||{}).enemy || ''];
    const url  = card && card.image && asset(card.image);
    /* ⚠ `asset()` 查不到會回空字串（那一張還沒登記進 `ASSETS`）—— 跳過就好，
       這裡不是驗收的地方（`script_lint.py` 才是）。 */
    if(url && out.indexOf(url)<0) out.push(url);
  }
  return out;
}
function warmEnemies(T){
  const my=warmSeq, list=enemyImgsOf(T);
  let at=0;
  const next=()=>{
    if(my!==warmSeq || at>=list.length) return;   // 已經換圖了 → 這一輪作廢
    const im=new Image();
    im.onload=im.onerror=()=>{ if(my===warmSeq) next(); };
    im.src=list[at++];
  };
  for(let c=0;c<2;c++) next();
}
export function loadSpec(town, nodeId){
  const T = TOWNS[town || 'capital']; if(!T) return {};
  const id = nodeId || T.entry;
  const n  = T.nodes && T.nodes[id];
  /* 其餘格子：**交給 town 自己跑**（`warm` 給的是一支函式，`loadScene` 讀取頁收掉
     之後才呼叫）。⚠⚠ 為什麼不由 loadScene 拿一串網址去暖：候選鏈要**依序試**才知道
     哪一張存在，而試出來的答案要記回 `bgResolved` —— 那張表住在這裡（鐵律 7）。
     順序試完再記，玩家走過去時 `bgFor` 直接命中，一個探測都不必發。 */
  /* ⚠ 兩件事都在讀取頁**收掉之後**才跑：其餘格子的背景、以及這張圖會出現的怪
     （ver -1578，見 `warmEnemies`）。⚠ 背景排前面 —— 玩家下一步就會走到，
     而怪要等遭遇（同 §6.6「哪一張鋪滿畫面就哪一張先」的判準）。 */
  const warm = ()=>{ warmRest(T, id); warmEnemies(T); };
  /* ⚠ 入口圖走 `pre`（一支回 Promise 的函式）不走 `imgs`：候選鏈要**由這裡**解，
     解完的答案才記得回 `bgResolved`（見 resolveBgOnce 的說明）。 */
  return {
    ses : [...collectSe(T, new Set(TOWN_SE), 0)],
    bgms: T.bgm ? [T.bgm] : [],
    pre : n ? (()=> resolveBgOnce(bgCandsOf(n, id), true)) : null,
    warm,
  };
}
/* `done`＝**這一景的背景真的擺好了**（ver -442）。切景的黑幕要等它才掀 ——
   見 `enter()` 的 `reveal`。⚠ 一定要在**每一條出口**都叫（載到了／候選全部
   404 了），漏掉哪一條，那一次就只剩保底計時器在撐。 */
/* ⚠⚠ 吃的是**已經展開好的候選檔名**（ver -578，`bgCandsOf` 算的）而不是基底名。
   理由：餐飲街的分店**逐張決定要不要吃時段差分**（三張新圖沒有、酒吧沿用的
   餐酒館有），一個共用的 `noTime` 參數表達不了 —— 而候選鏈的展開只有
   `story.bandNames` 一支（鐵律 7），所以展開的地方就該在知道每一張是誰的那一支。 */
function bgFor(list, done){
  const my=++bgSeq;
  const fin=()=>{ if(my===bgSeq && done) done(); };
  const all=(list||[]).filter(Boolean);
  if(!all.length){ fin(); return; }
  /* ⚠⚠ **試出來的結果要記起來**（ver -442，同插圖那一份 `cgResolved`／ver -433）：
     沒有該時段差分的地點會生出 4~6 個候選，而**每一次抵達都從頭試一遍** ——
     實測 07:00（Dawn 帶）進一個節點要先吃 4 個 404，切景的黑幕就得蓋著等它們，
     等於每走一步多黑一秒。記住贏家之後，同一個地點同一個時段只請求那一張。
     ⚠ 鑰匙用 `all[0]`（已經把時段編進去了），不是基底名 —— 用基底名的話天亮之後
       還會拿出黃昏那一張，時段差分整個失效（cgResolved 也是踩過才寫下這一條）。
     ⚠ 只記**贏的**：全部載不到就不記，下次再試一遍（素材補進來要看得到）。 */
  const hit=bgResolved.get(all[0]);
  const cands=hit ? [hit] : all;
  const tryAt=(i)=>{
    if(i>=cands.length){ fin(); return; }     // 一個都載不到 → 照樣放行（不能把玩家留在全黑裡）
    const name=cands[i];
    const img=new Image();
    img.onload =()=>{
      if(my!==bgSeq) return;                 // 已經被後面那一次換掉了 → 這一張作廢
      bgResolved.set(all[0], name);          // 這一個時段就是它，下次不必再試一輪
      bgNow = name;                          // 現在畫面上是哪一張（ver -592，見 currentBg）
      /* ⚠ 回報的時機是**它真的畫上去**，不是「叫了 setSceneBg」（ver -442）：
         那一支底下可能還要淡一段（`swapImg`），早報就會在舊圖上把黑幕掀開。 */
      story.setSceneBg(name, fin);
      /* 旅店那兩顆行動鈕（獨自坐坐／回房睡覺）要靠圖的原始比例換算位置（見 bgPoint），
         所以在這裡記下來 —— 這一支本來就要載那張圖，不必另外再抓一次
         （鐵律 7：算的那一支發佈出去）。 */
      /* ⚠⚠ **背景載到才算數**：`bgNat` 在這一刻才有值，而 `refreshArrows()` 早就跑完了
         —— 靠背景圖定位的東西**都要在這裡再擺一次**，不然第一次進來那一格是空的
         （旅店那兩顆鈕當年就是這樣才加的 `inn.relayout()`；ver -1249 的背景鐘同病）。 */
      bgNat=[img.naturalWidth, img.naturalHeight]; inn.relayout(); syncBgClock();
      if(i>0 && !missingBg.has(cands[0])){ missingBg.add(cands[0]);
        console.info('[town] 沒有這個時段的背景，退回：', cands[0], '→', name); } };
    img.onerror=()=>{ if(my===bgSeq) tryAt(i+1); };
    /* ⚠ 走 `story.bgUrl`（唯一那一支，ver -905）：同名覆蓋的圖要帶 `?v=`，
       探測與顯示必須拿到**同一個 URL**，否則探測抓新圖、顯示吃舊快取。 */
    img.src=story.bgUrl(name);
  };
  tryAt(0);
}

function node(){ return (TOWNS[townId]||{}).nodes[nodeId] || null; }

/* ══ 走到過的地點（ver -392）══════════════════════════════════════════
   ⚠ 與「進場對白播過了」（`town_<城>_<節點>`）是**兩件事**：有的節點根本沒有對白
     （中心區），有的對白被打烊擋掉 —— 那些也算走到過。所以另開一組旗標。 */
/* ⚠ 戰鬥地圖不記（ver -584）：「走過這個地方」是探索的帳，
   在城鎮戰裡跑過一輪不算逛過這座城。 */
let revealPending=false;   // 這一次抵達還在等背景（ver -926，見 enter 的 reveal）
function markSeen(id){ if(siegeOn()) return; prog.addFlags(['seen_'+townId+'_'+id]); }
/* ══⚠⚠ **這一格現在有沒有旅店功能**（伙伴門／獨自坐坐／回房睡覺）══
   只有這一支在算（鐵律 7）：`enter()` 要拿它判「這是不是第一次進旅店」、
   `afterArrive2()` 要拿它決定開不開大廳 —— 兩邊各寫一次條件必然走鐘。
   ⚠ `innFrom`（ver -827）：夏爾村的索菈娜家要村戰打完（`safehouse_shinier`）
     旅店功能才開 —— 所以「走進過那一格」與「進過旅店」是兩件事。 */
function innActive(n){
  return !!(n && n.inn && !siegeOn() && (!n.innFrom || prog.hasFlag(n.innFrom)));
}
/* ══⚠⚠⚠ **第一次進旅店：四扇門一定要全員在家**（ver -1102，Ray：「第一次進旅店時，
   一定要所有女主角都在，這邊的話索菈娜是例外」）══
   那一趟是玩家第一次看到這排門 —— 有人外出就是一扇沒有臉、也沒有任何說明的門，
   讀起來是壞了，不是「她出去了」。
   ⚠ 作法是**不排行程**（`rollOuting` 直接 return），不是「排了再擋」：排了就會被
     `outingDebug` 印出來、也會被餐飲街的 `dineKey` 讀到，那是兩個真相（同 -666
     劇情探索那一條）。
   ⚠ **索菈娜是例外**：她那一格的空門是資料上明寫的（`knock.SORANA.absent`，
     好感未達 `dateAff` ＝她根本不在房裡，ver -1099）—— 那是設計，不是排程。
   ⚠ 旗標**逐城逐格**（`inn_seen_<城>_<格>`）：誰插的＝走進旅店那一刻（`afterArrive2`）；
     沒有人拔（鐵律 9）。⚠ **不可以沿用 `seen_*`**：那一支在 `enter()` 開頭就記了，
     而且夏爾村的索菈娜家在旅店功能開放之前就走過很多次了。 */
function innSeenFlag(id){ return 'inn_seen_'+townId+'_'+id; }
let innFirstVisit=false;
/* ══⚠⚠ 迷霧（ver -913，Ray：「小地圖沒走到的地方用迷霧遮住，在控制面板上也顯示
   『？？？』。除非 mist=0，否則預設都是如此。大城市 mist 都是 0」）══
   **判定只有這一支**（鐵律 7/8）：小地圖那邊要決定畫不畫霧、目的地字格那邊要決定
   印不印地名 —— 兩邊各寫一次的話一定有一邊忘了改。
   ⚠ 預設有霧（`mist` 沒寫＝1）：忘了寫的下場是「多遮一點」，不是「整張攤開」。
   ⚠ 「走到過」沿用既有的 `seen_*` 旗（`markSeen`），不另開一組（鐵律 7）——
     所以戰鬥地圖裡走過的不算（那一條是 markSeen 自己的規矩）。
   ⚠ **站著的那一格永遠算走到過**：`markSeen` 是 `enter()` 收尾才記的，
     抵達的當下問它會問到「還沒記」（同「不要從畫面反推」那一族的坑）。 */
/* ══⚠⚠⚠ **黑霧是「一整片」，走過的地方把它化開**（ver -1392，Ray：「黑霧是整片的，
     不要用一圈一圈貼圖，走到的地方才散去，用特效，覆蓋整個地圖」）══

   -913~-1391 是**一格一團**的貼圖（每個沒走到的節點各放一顆橢圓）。那條路錯在
   它把「霧」做成了**點的屬性**：
     · 節點與節點之間的紙面沒有人蓋 ⇒ 換成黑色之後整張圖是**豹紋**，不是未探索區；
     · 放大到互相接得上又變成一堆疊在一起的圓，邊緣一圈一圈的。
   正解是反過來做（世紀帝國那一套）：**霧是整張圖的一層**，走過的那幾格在它身上
   **挖一個洞**。

   ⚠⚠ 作法是 SVG 遮罩，不是 canvas：
     · 尺寸跟著 `.tm-frame` 走（`viewBox 0 0 100 100` ＋ `preserveAspectRatio="none"`），
       **不必量任何 rect、不必理 DPR、不必接 resize** —— 量 rect 那條路在這個專案
       已經踩過太多次（量到 0×0、量到轉場中間值）。
     · 洞的邊緣是 `feGaussianBlur` 糊出來的，硬邊的洞讀起來是貼紙不是霧。
   ⚠⚠ **整片黑要被紙的形狀夾住**：地圖是去背 alpha 的（ver -878），撕邊之外是透明。
     不夾的話黑霧會畫成一個**方框**，蓋掉那圈撕邊。夾法是 CSS 的
     `mask-image:url(那張圖)`（見 `.tm-shroud`）—— 與 SVG 內部那層挖洞的遮罩
     是兩件獨立的事，各做各的。
   ⚠⚠ **形狀要用位置算出來的假亂數，不可以 `Math.random()`**（同 §6.8.1 鐵則 2）：
     每開一次地圖都重建一次 DOM，真亂數會讓同一格的霧**每開一次就換一個形狀**。 */
const FOG_RX = 10.5, FOG_RY = 13;      // 洞的半徑（%，x 是圖寬、y 是圖高）
const FOG_DX = 1.9,  FOG_DY = -0.5;    // 往右下偏一點：圖上的草書地名在墨點右下方
/* 位置算出來的假亂數（同 `flight/index.html` 的 `hash01`）。 */
function fogRand(seed){
  let h=2166136261;
  for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619); }
  return ()=>{ h=Math.imul(h^(h>>>15),2246822507); h^=h>>>13; return ((h>>>0)%1000)/1000; };
}
function fogShroud(M, ids){
  /* 走過的那幾格各挖一個洞 —— 一格三顆稍微錯開的橢圓，邊緣才不是一個正圓。 */
  const holes = ids.filter(seenNode).map(id=>{
    const p=M.spots[id]; if(!p) return '';
    const r=fogRand(id), cx=p[0]*100+FOG_DX, cy=p[1]*100+FOG_DY;
    let out='';
    for(let k=0;k<3;k++){
      const ox=(r()-0.5)*4.4, oy=(r()-0.5)*5.6, sc=0.74+r()*0.26;
      out += '<ellipse cx="'+(cx+ox).toFixed(2)+'" cy="'+(cy+oy).toFixed(2)
           + '" rx="'+(FOG_RX*sc).toFixed(2)+'" ry="'+(FOG_RY*sc).toFixed(2)+'" fill="#000"/>';
    }
    return out;
  }).join('');
  const img=String(M.img).replace(/"/g,'&quot;');
  return '<svg class="tm-shroud" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"'
       + ' style="-webkit-mask-image:url(&quot;'+img+'&quot;);mask-image:url(&quot;'+img+'&quot;)">'
       + '<defs>'
       + '<filter id="tmFogSoft" x="-40%" y="-40%" width="180%" height="180%">'
       +   '<feGaussianBlur stdDeviation="1.7 2.2"/></filter>'
       + '<mask id="tmFogMask">'
       +   '<rect x="-10" y="-10" width="120" height="120" fill="#fff"/>'
       +   '<g filter="url(#tmFogSoft)">'+holes+'</g>'
       + '</mask>'
       + '</defs>'
       /* ⚠⚠ **不透明**（實測）：留一點透明想保住紙的紋理，結果是**整張圖的節點與
            連線照樣讀得出來** —— 那等於沒遮。世紀帝國那一套本來就是實心的。
          ⚠ 顏色帶一點暖褐（不是純黑 #000）：這是羊皮紙上的暗處，
            純黑會讀成「紙破了一個洞」。 */
       + '<rect x="-10" y="-10" width="120" height="120" mask="url(#tmFogMask)" fill="#0e0b09"/>'
       + '</svg>';
}
function fogOn(){ const T=TOWNS[townId]; return !!T && T.mist!==0; }
function seenNode(id){ return id===nodeId || prog.hasFlag('seen_'+townId+'_'+id); }
/* ══⚠⚠ **被指出來的那一格**（`mapHint`，ver -1412，Ray：「安雅指出方向以後祭壇要
   亮起，但不要顯示地名」）══ 城上寫 `{node, need, until}`，這裡只負責回答
   「**現在指的是哪一格**」（鐵律 7：紅點那一支 `dragonAtNode()` 也是這個形狀）。
   ⚠ `need` 還沒立＝還沒有人指路；`until` 立了＝到了，不必再指。
   ⚠ 回 null 就是不指 —— 沒寫 `mapHint` 的圖天生就不指（安全的那一側是預設）。 */
function hintNode(){
  const h=(TOWNS[townId]||{}).mapHint;
  if(!h || !h.node) return null;
  if(h.need && !prog.hasFlag(h.need)) return null;
  if(h.until && prog.hasFlag(h.until)) return null;
  return h.node;
}
/* 城裡的地點都走過了嗎。⚠ **不算旅店自己** —— 那是「走完之後要去的地方」，
   把它算進去的話玩家永遠等不到那句提醒。 */
function allSeen(){
  const T=TOWNS[townId]; if(!T) return false;
  for(const k in T.nodes){
    if(T.nodes[k].inn) continue;
    if(!prog.hasFlag('seen_'+townId+'_'+k)) return false;
  }
  return true;
}
/* ══ 傍晚的提醒（ver -392，Ray 交稿）══
   「拜訪過所有地點後走到下一個場景時**或**時間抵或過 18:00」。
   ⚠ 回傳 `evening` 這一段本身（不是布林）—— 呼叫端要拿它的 `lines` 去演。
   ⚠ **在旅店裡不演**：站在旅店裡說「我們先回旅店吧」是錯的。 */
/* 這個節點現在該演哪一段主線戲（`acts`）。⚠ 條件現在只有 `day`（遊戲內第幾天，
   由開局日推出來 —— 時鐘是唯一的真相，不另存「第幾天」的旗標）。
   ⚠ 由上往下取**第一個**沒演過又符合條件的，所以資料的順序就是劇情的順序。 */
/* ══⚠⚠⚠ 約會宵禁：過了時刻、人又不在旅店 → 她自己先回去（ver -1346，Ray 的東泊稿：
   「時間超過 18:00，而角色不在旅店　諾：哇，這麼晚了。／蕾娜小姐回來的時候沒人可不行，
     我先回去囉。」）══════════════════════════════════════════════════════════
   資料寫在**城**上（鐵律 1）：
     `dateCurfew:{ hour:18, notNode:'inn', by:{ NOUVELLE:{ flag, lines }, … } }`
   ⚠⚠ **回傳的是一個合成的 `act`**，不是另一條播放路徑（鐵律 8）——
     這樣立繪、`sides`、旗標、`endDate`、清場全部走 `enter()` 那一份既有的收尾。
   ⚠⚠ **名單裡沒有的人就不會自己回去**（索菈娜：Ray「索菈娜不會自主回去」）——
     那是**資料**說的，程式不為她寫特例。
   ⚠ `notNode` ＝在旅店裡不觸發（她人都到家了，不必宣告「我先回去」）。
   ⚠ 排在 `actDue` **之前**：這是時間規則，不是那一格的戲 —— 過了 18:00 才走到
     甜品店的話，她會先說要回去，那一格的約會戲就留到下次（那正是「太晚了」的意思）。 */
function dateCurfewAct(n){
  const T=TOWNS[townId]||{}, D=T.dateCurfew;
  if(!D || !D.by) return null;
  const who=datingWho(); if(!who) return null;
  const e=D.by[who]; if(!e || !e.lines || !e.lines.length) return null;
  if(D.notNode && nodeId===D.notNode) return null;
  if(clock.hourF() < (D.hour!=null ? D.hour : 18)) return null;
  if(e.flag && prog.hasFlag(e.flag)) return null;
  return { flag:e.flag, lines:e.lines, endDate:true, sides:e.sides||D.sides };
}
/* ══⚠⚠⚠ 送她回旅店 → 演告別 → 解除同行（ver -1369，Ray：「回旅店女主觸發告別
   對話後同行就會解除」）══════════════════════════════════════════════════════
   ⚠⚠ **與 `dateCurfewAct` 是同一個形狀**（回傳一個合成的 `act`，不是另開一條播放
     路徑，鐵律 8）—— 立繪、`sides`、`endDate`、清場全部走 `enter()` 那一份收尾。
     兩者是同一件事的兩端：**時間到了她自己回去** ／ **你把她送回來**。
   ⚠ 台詞由**城的 `dateBye` 覆寫、沒寫就用 `OUTING.dateBye`**（鐵律 1）：
     `by[誰]` 有專屬的就用它，否則用那一組共用的（同 `nightRestBy` 的作法）。
   ⚠⚠⚠ **不看旗、每次都演**：那一段是「這一次的約會結束了」。掛旗的話第二次不演
     ⇒ `endDate` 不跑 ⇒ **同行永遠解除不掉**（這正是 `dateCurfew` 掛旗、它不掛的原因）。
   ⚠ 排在 `dateCurfewAct` **之後**：兩者同時成立時（過了 18:00 才走回旅店）
     以「你送她回來」為準 —— 她人都到門口了，再講「我先回去囉」讀不通。
     ⚠ 但 `dateCurfew` 有 `notNode:'inn'`，所以實際上不會撞；順序寫明只是為了
       日後有人拿掉那一格時不會變成兩段搶著演。 */
function dateByeAct(n){
  const who=datingWho(); if(!who) return null;
  const T=TOWNS[townId]||{};
  const D=T.dateBye || OUTING.dateBye;
  if(!D) return null;
  /* 「哪一格是旅店」：資料上的 `node` 優先，沒寫就問這一格是不是旅店（`inn:true`）
     —— 各城的旅店節點 id 不一定一樣，寫死一個名字會漏掉別的城。 */
  const isInn = D.node ? (nodeId===D.node) : !!(n && n.inn);
  if(!isInn) return null;
  const e=(D.by && D.by[who]) || D;
  /* ══⚠⚠⚠ **沒有台詞就「就地解除」，不要做成一段空戲**（ver -1536，
     Ray：「約會狀態回旅店沒解除」）══
     · 舊版是 `if(!e.lines || !e.lines.length) return null;` ——
       而全域預設正是 **`OUTING.dateBye = { node:'inn', lines:[] }`**
       （-1383 Ray 拿掉了那句暫代旁白：「回到旅店不用顯示她停下腳步」）
       ⇒ **對每一座沒寫自己 `dateBye` 的城永遠回 null** ⇒ `endDate` 不跑
       ⇒ **走進旅店解除不掉同行**（雪都四條約會線全中）。
     ⚠⚠ -1383 的註解自己就寫著契約：「**機制留著、只是沒有台詞**…`endDate:true`
       照樣會跑，**同行照樣解除得掉**。這一格不可以整個拿掉，拿掉就沒有人解除同行了。」
       —— 台詞拿掉了，**擋它的那一行卻留著**。這是鐵律 7 但書的又一次：
       **契約寫在註解裡，程式沒跟著改，而且不會有任何錯誤訊息。**
     ⚠⚠⚠ **為什麼不是「回傳一個零句的 act」**（我第一版就是那樣，錯的）：
       `enter()` 底下還有一道 **`if(lines.length){ … }`** —— 零句的段落**根本走不到**
       `playAdhoc`，收尾（`act.endDate`）自然也跑不到。放寬那道門的話，
       所有「條件過濾之後剛好零句」的段落都會跟著記旗，**波及面太大**。
     ⇒ 這裡直接呼叫 `endDate()`（唯一那一支，鐵律 8 沒有被破）並回 null：
       「沒有台詞的告別」＝**默默解除**，那正是 -1383 之前 -576 的行為。
     ⚠ 它是冪等的，而且上面 `datingWho()` 那道門擋著 —— 解除之後就不再進來。 */
  if(!e.lines || !e.lines.length){ endDate(); return null; }
  return { lines:e.lines, endDate:true, sides:e.sides||D.sides };
}
/* ══⚠⚠⚠ **一段戲是「抵達時演」還是「按睡覺才演」**（`sleepFirst`，ver -1396）══
   `actDue(n)`        ＝ 走進這一格要演的（預設，**看不到** `sleepFirst` 那幾段）
   `actDue(n, true)`  ＝ 按下回房睡覺才演的（**只看得到**它們）
   Ray：「強制回到東泊時的睡覺…點下不會睡到隔天，會在一小時後起來移動到旅店大廳，
   觸發索菈娜對話」—— 那一段掛在旅店的 `acts` 上，但它的觸發是**躺下去**，不是走進來。
   ⚠⚠ 一個參數而不是另寫一支 `sleepActDue`：`need`／`needTier`／`until`／`hourOfDay`／
     安全區那一整套門**只能有一份**（鐵律 8）—— 複製一份出來必然走鐘。
   ⚠⚠ 兩邊是**互斥**的（`!!a.sleepFirst !== !!sleepOnly`）：漏掉這一行的話，
     那一段會在走進旅店的那一刻就演掉，玩家根本按不到睡覺鈕。 */
function actDue(n, sleepOnly){
  const muted = mutedTalks();
  for(const a of (n && n.acts) || []){
    if(!!a.sleepFirst !== !!sleepOnly) continue;
    /* 舊章節封存（ver -753）：沒標 fromStage 的段落＝舊稿，封存後不再演；
       新章節的段落自己標 `fromStage`（同時也是「還沒到那一章不演」的門）。 */
    if(a.fromStage!=null && prog.getStage() < a.fromStage) continue;
    /* `untilStage`（ver -858）：**到了這一章就不再演**（fromStage 的反向）——
       夏爾村「S5 之前」那批早訪 NPC（村長）用。 */
    if(a.untilStage!=null && prog.getStage() >= a.untilStage) continue;
    if(muted && a.fromStage==null) continue;
    /* ══⚠⚠⚠ **`chaseOnly:true` ＝這一段只有追兵帶得動，走進來不算**
       （ver -1616，Ray：「柱廳怎麼可能會有登場？登場是在進古墓後兩戰以後移動
       下一格觸發」）══
       追兵帶著走的那幾段（`chase.scenes`）**台詞住在某一格的 `acts` 裡**（好找），
       而 `actDue` 看不出那一段是誰的 —— 沒有這一道門的話，玩家自己走到那一格
       就會把「被追上」的戲演掉，而畫面上完全正常，只是**追兵根本不在那裡**。
       ⚠ 背安雅那一段（`chase.next`）**刻意不標**：它的規約從 -1608 起就是
         「兩條路共用同一個 flag，走到那一格照樣演得到」。 */
    if(a.chaseOnly) continue;
    if(a.flag && prog.hasFlag(a.flag)) continue;
    if(!needOk(a.need)) continue;
    /* ver -858：acts 也吃 `hourOfDay`（同 gates 的語意：單值＝今天過了這個時刻、
       `[起,迄]`＝時段且迄不含）—— 雜貨店退燒藥那一段限 18:00 前。 */
    if(a.hourOfDay!=null){
      const h=clock.hourF();
      if(Array.isArray(a.hourOfDay)){ if(h < a.hourOfDay[0] || h >= a.hourOfDay[1]) continue; }
      else if(h < a.hourOfDay) continue;
    }
    /* ⚠⚠ `until` ＝**這支旗立了就不再演**（ver -668，Ray：「教堂諾薇兒卡在
       『不要催我』…每進去一次觸發一次直到下一個劇情事件結束解除」）。
       它是給**沒有 `flag`（每次抵達都演）**的段落收尾用的 —— 那種段落沒有
       自己的旗可以記，不給它一個終點就會演到天荒地老。
       ⚠ 與 `flag` 是兩件事：`flag` ＝「這一段演過了」（自己記的），
         `until` ＝「別人那一段演完了」（別人記的）。 */
    if(a.until && prog.hasFlag(a.until)) continue;
    if(a.day && dayNo() < a.day) continue;
    /* ══⚠⚠ **好感段位的門**（`needTier:{renna:3}`，ver -1387，Ray 的夜襲稿：
       「若蕾娜 T2 隔日正常探索／**若蕾娜 T3** …」）══
       段位只有 `prog.tierOf` 一支在算（鐵律 7）—— 這裡只比大小，不自己換算
       「T3＝40 點」那個數字（段寬改了這裡不必動）。
       ⚠ 它是**那一刻的快照**：走進來的當下夠不夠。條件不成立就跳過這一段，
         日後好感上來了再走進來照樣演得到（那正是分歧該有的行為）。
       ⚠ 可以一次寫好幾個人（and）—— 目前只有蕾娜在用。 */
    if(a.needTier){
      let ok=true;
      for(const who in a.needTier)
        if(prog.tierOf((prog.getAffection()||{})[who]) < a.needTier[who]){ ok=false; break; }
      if(!ok) continue;
    }
    /* ══⚠⚠ 「現在是不是跟某人在約會」（ver -1344，Ray 的東泊稿）══════════════
       約會中走到某一格才演的那幾段（諾薇兒→餐廳／雜貨舖、安雅→甜品店／碼頭、
       索菈娜→武器店／公會）就靠這兩格：
         · `withWho:'NOUVELLE'` ＝**正在跟她約會**才演
         · `noDate:true`        ＝**沒有在約會**才演（大學巧遇蕾娜那一段）
       ⚠⚠ 問的是 `datingWho()`（正在約會的人）**不是** `escortWho()`（有人同行）——
         殘留事件帶起來的同行不是約會（`escortLeftover`，ver -567 的諾薇兒），
         拿後者當判準會讓「沒在約會」那一段在她跟著你走的時候也不演。
       ⚠ 收在 `actDue` 這唯一一支（鐵律 8）：日後任何一段要掛這個條件都自動吃到，
         不要在各個節點自己判一次。 */
    if(a.withWho && datingWho()!==a.withWho) continue;
    if(a.noDate && datingWho()) continue;
    /* ══⚠⚠ **安全區旗插著就不會有遭遇戰**（ver -634（-893 前用詞），Ray）══
       「只要插 safehouse flag 就不會有遭遇戰」「flag 跟地圖，一插就是整個北泊」
       「特殊戰就先拔旗，打完再插，如帝都的賞金獵人跟打靶小遊戲」
       —— 所以判定是：**這一段裡有戰鬥** ＋ 這張地圖插著安全區旗 → 不演。
       ⚠ 判「有沒有戰鬥」看**資料**（拍上有 `battle`），不另外加一個要記得寫的欄位：
         漏寫的下場是「安全區裡冒出一場架」，而那不會有任何錯誤訊息。
       ⚠ `pullSafehouse:true` ＝**特殊戰**（帝都的賞金獵人、打靶）：它們是玩家自己
         走過去挑的，不是遭遇 —— 開演前拔旗、演完再插回去（見下方的收尾）。
       ⚠⚠ 這一條**取代**了 ver -633 的 `siege:true`（同一件事兩個開關＝鐵律 7）：
         安全區旗說了算，`siegeOn()` 也讀同一支旗（見 `safehouseFlag`）。 */
    /* ⚠⚠ **劇情戰不受安全區旗管**（`storyBattle:true`，ver -679（-893 前用詞），Ray：「stage4 在
       北泊的兩場都是劇情戰，不該插戰鬥探索 flag」）——
       安全區旗擋的是**遭遇戰**（城鎮戰那一格一格的雜怪），不是劇本安排的那一場。
       ⚠ 它與 `pullSafehouse` 是**兩件事**，不要拿後者去湊：
         · `pullSafehouse` ＝「這一段期間這裡真的不是安全區」（帝都的賞金獵人／打靶，
           玩家自己走過去挑的特殊戰）—— 開演前拔旗、演完插回去。
         · `storyBattle`    ＝「這是劇本，安全區旗管不著」—— **旗一動都不動**。
       ⚠⚠ 用 `pullSafehouse` 代替會出事：**打輸的話那一段沒演完，旗就停在拔掉的
         狀態** —— 整座城當場退回城鎮戰模式（Ray 回報：第一場戰敗選繼續之後
         「整個城鎮就回到戰鬥探索了」）。 */
    if(!a.storyBattle && !a.pullSafehouse
       && prog.hasFlag(safehouseFlag()) && actHasBattle(a)) continue;
    { const L=actLines(a); if(L && L.length) return a; }
  }
  return null;
}
/* 遊戲內第幾天（開局那天＝第 1 天）。⚠ 從時鐘推，不另存旗標（鐵律 7）。
   ⚠ 算在 `clock.dayNo()`（那裡才有 EPOCH）—— 這裡以前自己 `floor(elapsed/1440)`，
     那是「開局起算的 24 小時塊」不是日曆日，隔天早上會被算成第 1 天（ver -427 修）。 */
function dayNo(){ return clock.dayNo(); }

/* ══ 野生刷怪（ver -862，Ray 的夏爾森林 F 表）══════════════════════════════
   資料在地圖上（`TOWNS[].wildSpawn`，見 script/town.js 的 shinier_forest），
   這裡是**唯一的一支**派場實作（鐵律 8）。規則：
     · 必出格（`fixed`）優先，一趟進圖各一次；隨機池擲 `rate`（每次抵達都擲，
       「踩過也可能出」）。
     · **一趟進圖同一種怪不重複**：`wildDone` 記「種」（日夜差分算同一種），
       `open()` 歸零 ——「洞窟 tiger 只一次，下次進地圖再生」就是這一條。
     · 值寫 `{day,night}` ＝日夜差分：Dawn/Day ＝ day 卡，Dusk/night/midnight ＝
       night 卡（`wildVariant` 是唯一的判定點，鐵律 8）。
     · `where:'connector'` ＝ 非末端限定（末端＝算出來的 `connectorIds`，鐵律 7）。
     · **入口不出怪**（遭遇戰復活點，§6.5.2 的鐵條）；安全區旗插著整套不動
       （同 actDue 那一條的語意）；`acts` 優先（劇本先走，見 runArrival 的接線）。
   ⚠ 它是**遭遇戰**（storyBattle 不設）：打輸走「回這張地圖的入口」那條回程。
   ⚠ `wildDone` 是**這一趟**的狀態（同 eveningHeld）：不進存檔 —— 最壞情況是
     讀檔回來重新能遇怪，而那正是「下次進地圖再生」。 */
let wildDone = new Set();
/* ══⚠⚠ **清過的格子再出怪只有 25%**（ver -924，Ray：「已經擊敗敵人的區域，
   再出敵人的機率是 25%」）══ 記的是「這一趟在哪幾格出過怪」（節點 id）。
   ⚠ 與 `wildDone` 是**兩件事**：那個記「哪幾種怪出過了」（一趟同種不重複），
     這個記「哪幾格出過了」（回頭走不該再必出一隻）。兩個都是這一趟的帳，
     `open()` 一起歸零。
   ⚠ 機率寫在 `config.tuning`（鐵律 1）不寫死在這裡。 */
let wildCleared = new Set();
/* 「這一趟踩過哪幾格」（ver -1618）：`noWildFirst` 要分得出「第一次踏進來」。
   ⚠ 與 `wildCleared`（那一格**出過怪**了）是兩件事 —— 沒出怪也算踩過。 */
let wildVisited = new Set();
function wildSpecies(v){ return (typeof v==='string') ? v : (v && (v.day||v.night)) || ''; }
function wildVariant(v){
  if(!v) return null;
  if(typeof v==='string') return v;
  const b=clock.band();
  return (b==='Dawn'||b==='Day') ? v.day : v.night;
}
/* ══⚠⚠⚠ **連結型地圖：兩端各一個結算點，起點不出怪、終點必出**
   （ver -1026，Ray：「像夏爾森林這種連結兩個地圖的地方，就要把起點跟終點各設一個
   結算點，看是從哪邊進入，起點必不出怪，終點必出」）══════════════════════════
   · 「兩端」＝這張圖的**跨圖出口**（`exits` 裡以 `@` 開頭的那幾格）——**算出來的**，
     不列死名單（大城地圖已經規則化，列一張表日後加一格就漏一次）。
   · **起點** ＝這一趟真的走進來的那一格（`cameNodeId`）；沒指定（讀檔／跳關）
     就退回這座城的入口。**起點必不出怪** —— 它同時是遭遇戰的復活點（§6.5.2）。
   · **終點** ＝另一端。**必出**那一隻結算怪（`wildSpawn.endBattle`），打完接結算。
     ⚠ 這與那一格的 `noWild` 不衝突：`noWild` 擋的是**隨機雜怪**，結算怪是
       **指定遭遇** —— 正是 Ray 在 -879 說的「神殿入口**除了鹿主戰之外**是安全區」。
   · 兩端都寫 `rest:true`（資料）＝**都是結算點**：走回起點一樣收局（-1024 的規矩）。
   ⚠ 三個以上的跨圖出口：挑一個當終點並**這一趟固定**（不每次抵達重擲，
     否則玩家走回頭路時終點會跟著跑）。歸零時機同 `wildDone`（`open()`）。
   ⚠⚠ 這不是把 ver -895／-898 那一套接回來：那一套是「把結算怪擺在**隨便哪一格**、
     那一格拒絕戰鬥就退一格」，落點與結算點無關；這一版落點**就是結算點本身**，
     而收局的條件仍然只有一條（踏入結算點，-1024）。 */
let cameNodeId = null;      // 這一趟從哪一格走進來（起點）
let endNodeId  = null;      // 這一趟的終點（另一端的跨圖出口）
function crossExitIds(){
  const T=TOWNS[townId]; if(!T) return [];
  return Object.keys(T.nodes||{}).filter(id=>{
    const ex=(T.nodes[id]||{}).exits||{};
    return Object.values(ex).some(v=>typeof v==='string' && v[0]==='@');
  });
}
function pickEnds(startNode){
  cameNodeId = null; endNodeId = null;
  const T=TOWNS[townId]; if(!T) return;
  const outs = crossExitIds();
  if(outs.length < 2) return;                     // 末端型：沒有「對面」
  cameNodeId = (startNode && T.nodes[startNode]) ? startNode : entryNodeId;
  const cands = outs.filter(id=>id!==cameNodeId);
  if(!cands.length) return;
  endNodeId = cands[Math.floor(Math.random()*cands.length)];
}
/* 這一趟的起點／終點（給小地圖或除錯用；沒有就回 null）。 */
export function tripEnds(){ return { start:cameNodeId, end:endNodeId }; }

/* ══⚠⚠⚠ **-895／-898 的「結算怪擺在對面出口」已取消**（ver -1024，Ray：「取消結算怪
   的放置，一律以踏入結算點為結算條件」）══════════════════════════════════════
   ver -895／-898 那一整套（`pickEndNode`／`endNodeId`／`endBattleNode`／
   `crossExitIds`）**整組移除**：它的工作是把 `wildSpawn.endBattle` 那一隻擺在
   「這一趟沒走進來的那個出口」，那一格拒絕戰鬥就退一格。
   ⇒ 現在**收局的條件只有一個**：踏進 `rest:true` 的結算點（見下面的 `restActDue`）。
     離開地圖那一條（`leaveMapRitual`）留著當保險 —— 不讓帳被卡在圖裡。
   ⚠ -895 當初的理由（「擺死一格的話，從另一頭進來第一格就撞到、剩下的圖變空景」）
     在新規則下自然消失：結算點是**玩家自己走進去的**，走多遠由他決定。
   ⚠ 資料上的 `wildSpawn.endBattle` 現在沒有人讀 —— 欄位留著不刪（它是「這張圖的
     收局怪是誰」的宣告），但別再指望它會出現。 */

/* ══⚠⚠ **休息處：走進去就閉棺結算**（ver -913，Ray：「養息之間跟命之泉、前廳這三個
   是安全點，進入就結算戰鬥」「走進就閉棺，跳結算頁。但若之前沒有發生戰鬥就不會作動」）══
   節點寫 `rest:true`（資料，鐵律 1）；這裡只回答「這一次抵達要不要結算」。
   ⚠ **沒打過架就不作動**：問的是**帳**（`state.sessionStats`，收段那一場要報的
     那一筆）—— 沒有帳就什麼都不做，不會為了走進來而彈一頁空白戰績。
   ⚠ 交棒與回程走**戰鬥那一套**（`{settle:true}` 那一拍 → story → main → combat，
     鐵律 8）—— 城鎮這邊不自己去碰結算頁。
   ⚠ 排在 `actDue` **之後**、`wildActDue` **之前**：劇本最優先；而休息處本來就
     不該在結算之前先冒一隻怪出來。 */
function restActDue(n){
  if(!n || !n.rest) return null;
  /* ══ **終點必出結算怪**（ver -1026）══ 這一格是這一趟的終點、卡還在、而且這一趟
     還沒打過它 → **打完接結算**（同一段裡串兩拍，一次抵達就走完）。
     ⚠ 串成一段而不是「這次打、下次結算」：後者要玩家再走一次才收局，
       讀起來是「打完了卻沒有結束」。
     ⚠ 記進 `wildDone`（同「一趟同種不重複」的規約）——打完再走回來就只剩結算。
     ⚠ 擋在 `sessionStats` 那道守門**之前**：結算怪是這一格的正事，
       不因為「還沒打過架」而不出（走進終點本來就該遇到牠）。 */
  const W=(TOWNS[townId]||{}).wildSpawn;
  if(W && W.endBattle && nodeId===endNodeId && !prog.hasFlag(safehouseFlag())){
    const sp=wildSpecies(W.endBattle);
    if(!wildDone.has(sp)){
      const eid=wildVariant(W.endBattle);
      if(eid){ wildDone.add(sp); return { lines:[ { battle:eid }, { settle:true } ] }; }
    }
  }
  if(!state.sessionStats) return null;          // 這一趟還沒打過架＝不作動（Ray）
  return { lines:[ { settle:true } ] };
}
/* ══⚠⚠⚠ **離開這張地圖的收尾：先結算、再閉棺**（ver -928，Ray 兩條）══════════
   · 「離開戰鬥探索時如果沒有踩到任何結算怪，於離開地圖時結算」
   · 「點擊離開時先閉棺，然後才進其他地圖或飛行地圖」
   兩句講的是同一個時刻，所以收成**一支**（鐵律 8）：跨圖出口（`@`）與出航都問它。
   ⚠ **有帳就走結算那一條**（`{settle:true}`，與休息處同一支）—— 那一拍自己會
     `playKerberosClose` 閉棺，這裡不要再多演一次門（會演兩次）。
   ⚠⚠ **沒帳就什麼都不演**（ver -1024，Ray：「目前在帝都打完賞金獵人離開帝都時會
     閉棺，像這種完全是多餘的，因為獵人戰完就已經閉棺結算了」）——
     -928 的「沒帳也單純閉棺」（`playKerberosShut`）已撤：那一場**早就結算過**、
     帳也清了，走出去再演一次門讀起來是「又結算了一次」。
     ⚠ 門是**結算**的幕，不是「離開地圖」的幕 —— 沒有要報的帳就沒有幕可演。
   ⚠ 判「有沒有帳」問 `state.sessionStats`（同 `restActDue`，鐵律 7）——
     這一趟已經踩過結算怪的話帳早就清了，走出去不會再彈第二頁。
   ⚠ 呼叫端要**先把導覽收掉、busy 立起來**：這一段期間畫面交給門與結算頁。 */
function leaveMapRitual(done){
  if(state.sessionStats){
    story.playAdhoc([{ settle:true, settleTitle:'撤　離' }],
                    ()=>{ story.clearCast(); done(); });
    return;
  }
  done();                       // ver -1024：沒帳＝這一趟沒有要結算的東西，直接走
}
/* ══════════════════════════════════════════════════════════════════════════
 *  王座徘徊者的追逐（ver -1389，Ray 交規則）
 * ──────────────────────────────────────────────────────────────────────────
 *  > 「追逐的邏輯是他會往主角來向的反方向跑一到兩格　ovk clean 的話兩格 否則一格」
 *  > 「那段時間走三格內必遭遇　格數隨機」
 *  > 「左右跑　隨機　撞牆後通常只有一條路」
 *  > 「紅點…第四戰之後才亮」「走到空格什麼都不發生，不會有提示」
 *
 *  ⚠⚠⚠ **「牠跑到哪一格」在前四戰是看不見的** —— 沒有紅點、走到空格也沒有提示
 *    （Ray 兩條都明講）。所以那一段**唯一觀察得到的行為**就是「再走幾步會遇到」。
 *    ⇒ 這裡**不做圖上的位置模擬**，只留「還要走幾步」：
 *         步數 ＝ max(逃跑距離, 隨機 1~3)
 *       · 逃跑距離 ＝ `state.overkillClean ? 2 : 1`（Ray 的 ovk clean 規則）——
 *         它是**下限**，所以「打得乾淨牠跑得遠」真的會讓你多走一步。
 *       · 上限 3 ＝ Ray 的「走三格內必遭遇」。
 *    ⚠ 這不是偷懶：**做了位置模擬，畫面上也分辨不出來**（同一個可觀察行為兩種實作
 *      ＝鐵律 7 要消滅的那種第二份真相）。紅點亮起來那一刻牠已經被逼進王座廳
 *      （死胡同、位置是寫死的），那時才需要真的位置，而那一格由資料指定。
 *  ⚠ 狀態**不進存檔**：這一段從頭到尾沒有存檔點，而 `open()` 會重置 ——
 *    最壞情況是重進古堡時步數重擲，那與「格數隨機」本來就一致。
 * ════════════════════════════════════════════════════════════════════════ */
/* ══⚠⚠⚠ **牠真的站在某一格上**（ver -1421，Ray 重訂規則）══════════════════════
   > 「每一次戰鬥龍都會往玩家進入房間的反方向移動一格，然後等到玩家再次踩同一格
   >   才會再動」
   > 「『交給我！』以後開小地圖，顯示龍在當前格的隔壁任一位置」
   > 「從開圖開始起算超過 5 場玩家仍沒辦法成功將他往王座之間趕，龍就會開始自己往
   >   那個方向移動…此時玩家移動時不論有沒有遭遇，他都會移動，直到停在王座之間」

   ⚠⚠⚠ **這一版取代 ver -1389 的「步數模擬」**：那一版刻意**不算牠在哪一格**，
     只留「還要走幾步會遇到」（理由是前四戰看不見牠）。現在 Ray 要牠**在圖上**
     —— 小地圖要畫得出來、而且移動有明確的方向規則，步數模擬表達不了。
     ⇒ `dragonSteps`／`dragonFlee`／`DRAGON_CHASE_MAX` 全部退役。

   **三個狀態，都是「這一趟進圖」的**（同上一版；`open()` 歸零、不進存檔）：
     · `dragonNode`   牠站在哪一格
     · `dragonFights` 這一趟打了幾場（Ray 的「從開圖開始起算」）
     · `dragonSeenFights` 開圖之後打了幾場（`afterThree` 那一段的門檻，ver -1433；
       門檻由 `DRAGON_TALK_AFTER` 決定 —— -1485 起是 **1**（開圖後第一戰））
     ⚠ 原本還有一個 `dragonAuto`（超過 5 場自己往王座之間走）—— **ver -1433 取消**，
       見下面那一段的說明。

   ⚠ **看得見是另一件事**：`bl_dragon_seen`（「交給我！」那一拍插的旗）——
     插旗之前 `dragonAtNode()` 回 null ＝小地圖沒有紅點（Ray：「四戰前就是瞎找」）。 */
/* ⚠⚠⚠ **ver -1433：「牠自己往王座之間走」整條取消**（Ray：「取消龍自己往王座廳跑，
   讓玩家把他往那個方向趕」）—— -1421 的 `DRAGON_AUTO_AFTER`(5)／`dragonAuto`／
   `dragonAutoStep()` 全部退役。
   ⚠⚠ **那條路原本兼著當「卡住了的保險絲」**：牠躲進打不起來的格子時，五場之後
     自動模式會把牠帶出來。拿掉之後那個保險沒有了 ⇒ **-1432 的 `dragonCanStop`
     是這一條成立的前提**（牠永遠停在踩得到的格子上）。兩條要一起看，
     不要單獨把其中一條改回去。
   ⚠ 「把牠逼到最深處」現在真的是玩家的事：牠只在**打完一場**才往玩家來的方向跑一格。 */
const DRAGON_THRONE = 'throne';  // 「王座之間」那一格
/* ══⚠⚠⚠ **開圖之前的遭遇機率 ＝ 探索率的一半**（ver -1464，Ray：「索拉娜開小地圖
   之前的龍是在地圖上隨機出，每次移動都有機率出，出現的機率為**地圖探索率的 1/2**」）══
   -1424~-1463 是固定值（50% → -1426 改 25%）。換成跟著探索率走之後：
     · 剛進圖（走過幾格）機率很低 —— 那一段本來就是「瞎找」
     · 圖走得越開越容易撞上 —— 而那正是玩家自己換來的
   ⚠ 探索率只有 `exploreRate()` 一支在算（鐵律 7）：小地圖上那個「探索率 NN%」
     讀的是**同一支** —— 兩邊各算一次的話，畫面上寫 40%、骰子用的卻是別的數字，
     而那種錯**永遠不會有人發現**。 */
const DRAGON_ROLL_K = 0.5;       // 探索率 × 這個 ＝ 每走一步的遭遇機率
const DRAGON_FIRST_NODE = 'stephall';   // 二番戰必刷的那一格（Ray：階梯大廳）
let dragonNode = null, dragonFights = 0;
/* 開圖（`bl_dragon_seen`）之後打了幾場 —— `DRAGON_LINES.afterThree` 那一段的門檻
   （ver -1433）。⚠ 與 `dragonFights` 一樣是**這一趟進圖**的狀態（`open()` 歸零、
   不進存檔）：離圖再回來重算，而那一夜本來就走不開（`QUEST_LOCK` 只准降古城）。 */
let dragonSeenFights = 0;
let dragonRollHit = false;       // 這一步擲到了沒（`go()` 擲、`dragonActDue` 只讀）
/* 「這一場牠已經移動過了」—— 攤開地圖那一下先移了，段落收尾就不要再移一次。 */
let dragonJustPlaced = false;
function dragonChaseOn(){
  return townId==='belisar'
      && prog.hasFlag('ep_night_raid') && !prog.hasFlag('bl_night_throne');
}
/* 這一格通得到哪幾格（同圖、不含 `back`、不含跨圖 `@`）。
   ⚠ 用**資料上的 `exits`** 不用 `exitsOf()`：後者是**玩家看得到的箭頭**（會被城鎮戰、
     章節門擋掉），而牠不是玩家。 */
function nodeNeighbors(id){
  const T=TOWNS[townId]||{}, n=(T.nodes||{})[id]; if(!n||!n.exits) return [];
  const out=[];
  for(const d in n.exits){
    const t=n.exits[d];
    if(d==='back' || typeof t!=='string' || t[0]==='@') continue;
    if((T.nodes||{})[t]) out.push({ dir:d, to:t });
  }
  return out;
}
/* 往王座之間的**下一步**（最短路，BFS）。到不了就回 null。 */
function stepToward(from, goal){
  if(from===goal) return null;
  const seen={ [from]:true }, q=[[from,null]];
  while(q.length){
    const [cur, first]=q.shift();
    for(const e of nodeNeighbors(cur)){
      if(seen[e.to]) continue;
      seen[e.to]=true;
      const f = first || e.to;
      if(e.to===goal) return f;
      q.push([e.to, f]);
    }
  }
  return null;
}
/* ══⚠⚠⚠ **牠不可以停在「打不起來」的格子上**（ver -1432）══════════════════════
   `dragonActDue` 的第一行就是 `if(n.noWild) return null`（ver -1420，Ray：「追擊戰要
   從進到古城內開始，為什麼我設成安全區的前廳會遭遇戰鬥？古城外也是安全區」）——
   **所以牠一旦停在那種格子上，玩家踩上去什麼都不會發生**；而「打完一場才移動一格」
   是位置制的規則（-1421）⇒ 打不到就不會動，**牠永遠躲在那裡，追逐當場死鎖**，
   而且畫面上沒有任何錯誤訊息（自動模式要 `dragonFights>5` 才開，卡住就湊不到場數）。
   `resources/map/_belisar_worklist.md` §四「入口不能當逃生口」講的就是這件事 ——
   古城中庭（`entrance`）正是 `noWild` 的其中一格。

   ⚠⚠ **判準只有 `n.noWild` 一個**（鐵律 7）：與那一行 `dragonActDue` 讀的是同一個真相。
     不要另外列一張「牠不准去的格子」名單 —— 兩份必然走鐘（日後某一格改成安全區，
     名單那一份不會有人記得更新）。
   ⚠⚠⚠ **不可以改成「完全不准進 noWild 的格子」**：實測貝利薩爾 37 格裡 8 格是
     `noWild`，而它們正好是**關節** —— 把它們整個拿掉，剩下 29 格會裂成好幾塊，
     從王座之間只走得到 4 格，牠連自動模式都走不回去。
   ⇒ 作法是**穿過去、不停下**：落點不能停就沿著同一個方向再滑一格，直到落在
     打得起來的格子上。 */
function dragonCanStop(id){
  const n=((TOWNS[townId]||{}).nodes||{})[id];
  if(!n || n.noWild) return false;
  /* ══⚠⚠⚠ **只停在三岔以上的房間**（ver -1446，Ray：「如果龍的停留格只有一進一出
     的話，也讓他往下一格跑，也就是龍只出現在三岔以上的房間」）══
     ⚠ 一進一出的過道停不住 —— 停在那裡玩家只有兩個方向可以逼，整段追擊就沒有
       「把牠往哪邊趕」的餘地了；三岔以上才有選擇，才是一個「房間」。
     ⚠ 度數問 `nodeNeighbors`（＝資料上的 `exits`，鐵律 7）不問畫面上的箭頭。
     ⚠ 實測貝利薩爾 37 格：度數 1×4／2×16／3×12／4×5 ⇒ **可停的有 15 格**，
       而且每一格至少有一個方向滑得出去（不會卡死）。 */
  return nodeNeighbors(id).length >= 3;
}
/* ══⚠⚠⚠ **追擊分兩階段**（ver -1442，Ray 定案：「追擊戰有兩階段／第一階段是隨機
   亂跑／第二階段是索拉娜開圖以後，玩家從左側進房，他就從右側出，從下方進他就從
   上方出／只有一條路的話就往唯一的反方向走／有兩條沒有辦法判斷該走哪條（無相反
   方向）一率往靠近王座廳的方向走」）══

   | | 何時 | 牠怎麼動 |
   |---|---|---|
   | **第一階段** | 索菈娜還沒開圖（`bl_dragon_seen` 沒插） | **隨機**（玩家手上沒有地圖，本來就讀不出動向） |
   | **第二階段** | 開圖之後 | **穿過去**：你從左側進房牠就從右側出 ＝ 照你按的那個方向直走 |

   第二階段判不出來時的兩條退路（**照這個順序**）：
     ① 只有一條路 → 走它（死胡同就是原路折回）
     ② 有兩條以上、而且沒有「正對面」那一條 → **一律往王座廳的方向**（`stepToward`）
   ⚠⚠ 第二階段整段**沒有亂數** —— 玩家看得見小地圖，牠的每一步都要能被預測；
     -1421~-1441 的寫法是「直走那一條不存在就隨機挑」，而貝利薩爾 37 格裡直走
     多半不存在（46 條邊、平均度數 2.5）⇒ 實際跑起來大半落進隨機分支，
     讀起來就是「打一場牠就亂跳一格」（Ray -1442 回報）。 */
function dragonRandom(list){ return list[Math.floor(Math.random()*list.length)]; }
function dragonHerdOn(){ return !!prog.hasFlag('bl_dragon_seen'); }
/* `from` ＝牠站的那一格、`cameDir` ＝玩家按的那個方向、`pool` ＝可挑的出口
   （已經濾掉回頭路，濾完是空的才把回頭路放回來）、`all` ＝這一格全部的出口。 */
function dragonPickExit(from, cameDir, pool, all){
  if(!dragonHerdOn()) return dragonRandom(pool);          // 第一階段：隨機亂跑
  const straight = cameDir && pool.find(e=>e.dir===cameDir);
  if(straight) return straight;                           // 穿過去（你從左進、牠從右出）
  if(all.length===1) return all[0];                       // 只有一條路
  if(pool.length===1) return pool[0];
  const nx = stepToward(from, DRAGON_THRONE);             // 判不出來 → 往王座廳
  return (nx && pool.find(e=>e.to===nx)) || pool[0];
}
/* ══⚠⚠⚠ **休息處／過道是「經過不停留」，不是「沒有路」**（ver -1446，Ray 更正：
   「跳過休息處往下一格，不是等於沒路　是經過了不停留」）══
   ⚠⚠ -1445 我把「停不住」讀成「那個方向沒有路」（於是龍會轉彎、或改往王座廳）——
     **那是錯的**。正確的語意是：牠**照原方向穿過去**，只是不在那裡停下來。
   ⚠ 所以 -1444 拿掉的 `dragonSlide` 這一版**回來了**，但判準換了：
     以前是「`noWild` 就滑過去」，現在是「**不是三岔以上就滑過去**」（見 `dragonCanStop`）。
   ⚠ 滑的時候**同方向優先**；真的遇到岔路才交給 `dragonPickExit`（兩階段那一支）。
   ⚠ 走過的格子記下來不重複踩（`seen`），免得在兩格之間來回滑。
   ⚠ 滑到盡頭（死路）回 null ⇒ 呼叫端**換一個方向再試**（實測只有 6 個方向是死路：
     王座廳→寶冠室／聖物室、階梯大廳→古代祭壇／古城中庭、積水甬道→古代祭壇、
     前廳→古城中庭）。 */
const DRAGON_SLIDE_MAX = 8;      // 保險絲：實測最長要滑 6 格
function dragonSlide(from, dir){
  let cur=from, d=dir, seen={ [from]:true };
  for(let i=0;i<DRAGON_SLIDE_MAX;i++){
    const ns=nodeNeighbors(cur); if(!ns.length) return null;
    const fresh = ns.filter(e=>!seen[e.to]); if(!fresh.length) return null;
    const back = d ? OPPOSITE[d] : null;
    const straight = d && fresh.find(e=>e.dir===d);
    const notBack = fresh.filter(e=>e.dir!==back);
    const pool = straight ? [straight] : (notBack.length ? notBack : fresh);
    const e = dragonPickExit(cur, d, pool, ns);
    cur=e.to; d=e.dir; seen[cur]=true;
    if(dragonCanStop(cur)) return cur;
  }
  return null;
}
/* 把牠擺到某一格的**隔壁任一位置**（Ray：「顯示龍在當前格的隔壁任一位置」）。
   ⚠ 隔壁那幾格裡先挑**停得住**的（見 `dragonCanStop`）；全部停不住才隨便挑一個
     （ver -1444：不再往前滑，理由見上面那一段）。 */
function dragonPlaceNear(id){
  const ns=nodeNeighbors(id);
  if(!ns.length){ dragonNode=id; return; }
  /* ⚠ 隔壁那一格停不住（過道／休息處）就**沿那個方向滑出去**（ver -1446，同
     `dragonFleeStep`）—— 牠的位置永遠落在三岔以上的房間。
     ⚠ 方向隨機（Ray：「顯示龍在**當前格的隔壁任一位置**」），滑到死路就換一個。 */
  const order = ns.slice().sort(()=>Math.random()-0.5);
  for(const e of order){
    const dest = dragonCanStop(e.to) ? e.to : dragonSlide(id, e.dir);
    if(dest){ dragonNode=dest; return; }
  }
  dragonNode = order[0].to;   // 退無可退（實測到不了）
}
/* ══ 打完一場：**往玩家進入房間的反方向**移動一格 ══
   `pendingDir` ＝玩家按的那個方向（`backDir` 是它的反向＝回頭路）——
   所以「進入房間的反方向」＝**繼續往玩家來的方向前進**，也就是 `pendingDir`。
   ⚠ 那個方向沒有路時怎麼辦，看 `dragonPickExit`（ver -1442 的兩階段）：
     第一階段隨機、第二階段「唯一那條路 → 往王座廳」，**不是隨機**。 */
function dragonFleeStep(cameDir){
  if(!dragonNode) return;
  /* ══⚠⚠ **漏斗：站在那一格就直接往目標跑**（ver -1437，Ray：「龍的移動行為
     只要踩到謁見前廳就會往王座廳跑」；-1454 加上「踩到甲冑廊就必往獅階走」）══
     表在城上（`dragonFunnel`，鐵律 1）。
     ⚠ 排在所有規則**之前**：它講的是「這一格的下一步是定死的」，
       不受「往玩家來的方向跑」與挑方向那一套影響。
     ⚠⚠⚠ **但它還是要守「停得住」那一條**（ver -1454）：獅階是 `noWild` 的休息處
       ⇒ 龍停在那裡**玩家踩不到**（`dragonActDue` 對 `noWild` 的格子直接回 null）
       而牠又只在打完一場才動 ⇒ **整段追擊當場卡死**。
       所以漏斗的目標停不住時，照 -1446 那條「**經過了不停留**」沿著同一個方向滑出去。
       實例：甲冑廊 →（獅階，穿過）→ 謁見前廳 —— 而謁見前廳本來就有
       `antecham:'throne'` 這一條漏斗 ⇒ 下一場打完就被逼進王座廳。
     ⚠ 真的滑不出去（整條都停不住）才停在目標上 —— 那時至少牠還在圖上。 */
  { const T=TOWNS[townId]||{}, f=(T.dragonFunnel||{})[dragonNode];
    if(f && (T.nodes||{})[f]){
      if(dragonCanStop(f)){ dragonNode=f; return; }
      const e=nodeNeighbors(dragonNode).find(x=>x.to===f);
      dragonNode = (e && dragonSlide(dragonNode, e.dir)) || f;
      return;
    } }
  const ns=nodeNeighbors(dragonNode);
  if(!ns.length) return;
  const back = cameDir ? OPPOSITE[cameDir] : null;
  /* ══⚠⚠ **先挑方向（兩階段），再沿那個方向滑到停得住的房間**（ver -1446）══
     ⚠⚠ -1445 我把順序寫反了（先濾掉停不住的鄰格＝當成沒有路），Ray 更正：
       休息處／過道是「**經過了不停留**」，方向不該因此改變。
     ⚠ 回頭路先排除；濾完全空（死胡同）才把回頭路放回來。
     ⚠ 那個方向整條滑到死路 ⇒ **換一個方向再試**（實測只有 6 個方向是死路）；
       全部滑不出去才留在原地。 */
  const others = ns.filter(e=>e.dir!==back);
  const order  = others.length ? others : ns;
  const first  = dragonPickExit(dragonNode, cameDir, order, ns);
  const tries  = [first].concat(order.filter(e=>e!==first),
                                others.length ? ns.filter(e=>e.dir===back) : []);
  for(const e of tries){
    const dest = dragonCanStop(e.to) ? e.to : dragonSlide(dragonNode, e.dir);
    if(dest && dest!==dragonNode){ dragonNode=dest; return; }
  }
}
/* ══ 超過 5 場之後：自己往王座之間走一格（玩家每動一步牠就動一步）══ */
/* ══⚠⚠ **開圖之後第一戰的那一段**（ver -1433 原本是「三戰之後」；
   **-1485 Ray 改成第一戰**：「他一直往反方向跑那一段，移到開小地圖以後的第一戰」）══
   台詞在 `DRAGON_LINES.afterThree`。
   ⚠ 它**不必踩到牠**：打完那一場之後走到哪一格都會演（同閘門的語氣）——
     所以判定在這裡，不在 `dragonActDue`（那一支的前提就是「踩到牠」）。
   ⚠ 只演一次（段落自己的 `flag`，演完由 act 的收尾記）。
   ⚠ 門檻寫成具名常數：那是**唯一**的計算點（鐵律 7）；鑰匙名還叫
     `bl_chase_talk3` 是刻意的 —— 它已經寫進 `CHAPTERS`（Stage 11-B）與存檔，
     改名等於把那些打斷，而**旗標的名字不是規格**。 */
const DRAGON_TALK_AFTER = 1;   // 開圖之後打了幾場就演（-1433：3；-1485 Ray 改成 1）
function dragonTalkDue(){
  if(!dragonChaseOn() || !prog.hasFlag('bl_dragon_seen')) return null;
  const a=DRAGON_LINES.afterThree;
  if(!a || dragonSeenFights < DRAGON_TALK_AFTER || prog.hasFlag(a.flag)) return null;
  return a;
}
/* ⚠⚠ **牠現在在哪一格 —— 只有這一支回答**（鐵律 7）：小地圖的紅點與
   「走到那一格就開打」問的是同一件事。
   ⚠ **還沒被「看見」就不給紅點**（`bl_dragon_seen`，「交給我！」那一拍插）——
     在那之前照 Ray 的原話是「瞎找」。 */
function dragonAtNode(){
  if(!dragonChaseOn()) return null;
  return prog.hasFlag('bl_dragon_seen') ? dragonNode : null;
}
function dragonActDue(n){
  if(!dragonChaseOn() || !n) return null;
  /* ⚠⚠⚠ **不出怪的格子也不打追擊戰**（ver -1420，Ray：「追擊戰要從進到古城內
     開始，為什麼我設成安全區的前廳會遭遇戰鬥？古城外也是安全區」）——
     判準用節點自己的 `noWild`（鐵律 1）：一次涵蓋古城外（`entrance`）、
     四個休息處、祭壇。王座之間沒有 `noWild`，決戰照舊。 */
  if(n.noWild) return null;
  const w=[0,1,2,3].filter(i=>prog.hasFlag('bl_chase'+(i+1))).length;
  /* ══⚠⚠⚠ **兩個階段**（ver -1424，Ray 重訂前半）══════════════════════════════
     ① **還看不見牠**（`bl_dragon_seen` 沒插，＝第四戰的「交給我！」之前）
        —— 牠**沒有位置**，用刷新制：
          · **二番戰**（追擊第一場）＝ 走到**階梯大廳**必刷（Ray 指定的那一格）
          · 之後每走一步 **50%** 在任一移動點遭遇（骰子在 `go()` 擲，見那裡）
     ② **看得見之後** —— 走 ver -1421 的**位置制**（牠站在某一格、打完往反方向跑一格、
        超過五場自己往王座之間走）。
     ⚠⚠ 兩階段是 Ray 前後兩次交代的合體：-1421 的位置制是**追趕**那一段
       （「直到第四戰提示小地圖**開始追趕**」），在那之前是找。 */
  if(!prog.hasFlag('bl_dragon_seen')){
    /* ⚠⚠ **王座那一區在追趕開始前不刷**（ver -1425，說明在 `script/town.js` 的
       `dragonKeepOut`）—— 那是最後要把牠逼進去的地方，先撞見就把那一段的意義用掉了。
       ⚠ 只擋這一段：`bl_dragon_seen` 之後牠本來就要往那裡跑（王座廳還是決戰那一格）。 */
    if(((TOWNS[townId]||{}).dragonKeepOut||[]).indexOf(nodeId)>=0) return null;
    if(w>=DRAGON_LINES.chase.length) return null;   // 四場都打完了，等那一拍把地圖打開
    if(w===0) return (nodeId===DRAGON_FIRST_NODE) ? DRAGON_LINES.chase[0] : null;
    return dragonRollHit ? DRAGON_LINES.chase[w] : null;
  }
  /* 看得見了但還沒擺位（理論上 `showMapForStory` 已經擺過）：擺到隔壁，這一步先不遭遇。 */
  if(!dragonNode){ dragonPlaceNear(nodeId); return null; }
  if(nodeId !== dragonNode) return null;          // 沒踩到牠 —— 什麼都不發生（Ray）
  /* 牠被逼進王座之間 ⇒ 決戰（那一段自己帶 `bl_night_throne`）。 */
  if(dragonNode===DRAGON_THRONE) return DRAGON_LINES.throne;
  /* 前四場是寫好的稿；之後（Ray 的「超過 5 場」）用沒有旗的那一段，可以重複。 */
  return (w<DRAGON_LINES.chase.length) ? DRAGON_LINES.chase[w] : DRAGON_LINES.chaseMore;
}
/* ══════════════════════════════════════════════════════════════════════════
   追兵（ver -1577）—— 伊甸古墓那一套「你走一格，牠走兩格」
   ──────────────────────────────────────────────────────────────────────────
   **參數全部在資料上**（`TOWNS[].chase`，鐵律 1）：這裡一個數字都不寫。
   規格（Ray 逐項定案，ver -1574~-1576）與逐項算出來的場數在 `HANDOFF.md`。

   **狀態住在 `progress`**（`tivot_chase_v1`，一輪內）不是這支模組的變數 ——
   古墓的安全點就是存檔點（`rest:true` → `autoSave`），存在記憶體裡的話，
   在安全點存一次再讀回來追兵就不見了（§6.9 的兩面）。
   ⚠⚠ **這一點正是它與貝利薩爾那條龍的分野**：龍那一段從頭到尾沒有存檔點，
     所以它刻意只活在記憶體（`dragonNode`，`open()` 歸零）。**不要拿其中一套
     去套另一套** —— 兩者的持久性需求相反。

   **五個時刻，各有各的擁有者**（鐵律 9：一個狀態一個擁有事件）：
     · 站上入口（`open()` 落在 `entry`）      → 整組清掉（＝「從墓門進入」重算）
     · 玩家走一格（`go()`）                   → 步數 +1、牠推進 `speed` 格
     · 遭遇雜怪（`wildActDue` 取到東西）      → 牠**再**推進 `onEncounter` 格
     · 抵達時踩到牠（`chaseActDue`）          → 追擊戰
     · 段落演完（`enter()` 的收尾）           → 場數 +1／`resetAt` 歸位／打贏後停 `stun`

   ⚠⚠⚠ **牠與雜怪競合 ⇒ 牠優先**（Ray 明講）—— 落地就是 `runArrival` 那一串的
     排序：`chaseActDue` 排在 `wildActDue` 前面。
   ⚠⚠ **安全點不重置牠的位置**（Ray 明講）：這裡**沒有**任何一支在 `rest` 那一格
     動它 —— 安全點只結算＋回血。回頭走的話牠可能已經很近了，那正是壓力來源。
     **不要「順手補上」** 一個 `resetAtRest`。
   ⚠⚠ **打輸就是既有的那一頁**（`聖光黯滅`，ver -1577 Ray：「不用，就是聖光黯滅
     那一套」）—— **不新增 lose kind**。古墓沒有旅店、這幾場又是插入戰，
     `setLoseKind` 現行的分流本來就會給 `rollback`（繼續＝回檔／放棄＝主畫面）。
   ⚠ **雜兵那一半還沒接**（`chase.wildRate`／`firstWildAt` 還沒有人讀）：
     古墓 28 隻的卡還沒到（`resources/enemy/_tomb_mon_spec.md`），而且那兩個數字
     與 `wildSpawn.rate` 是同一件事的兩個真相 —— 卡到齊時要先決定留哪一份（鐵律 7）。
   ══════════════════════════════════════════════════════════════════════════ */
/* ══⚠⚠⚠ **`chase.hard` ＝某一支旗插上去之後，整組追擊參數換一套**
   （ver -1616，Ray：「從這邊開始追擊變密急」，3／2／2）══
   ⚠⚠ **覆寫收在這一支**（鐵律 7）：`speed`／`onEncounter`／`stun` 有五個讀取點
     （`chaseStep`／`chaseOnEncounter`／`chaseAfterAct`…），在每一個讀取點各判一次
     「現在是不是密急階段」＝同一個判斷五份，漏一處就是「牠有時候快有時候慢」，
     而那不會有任何錯誤訊息。
   ⚠ 只蓋 `hard` 上真的寫了的那幾格（`intro`／`scenes`／`resetAt` 照舊）。 */
/* 這一次被追上時，`chaseActDue` 挑中的是哪一段（`chase.scenes` 的那幾段）。
   ⚠ 只是 `chaseAfterAct` 用來認「剛演完的是不是追擊那一段」的把手 —— 不是狀態，
     不必存檔（一次抵達之內用完就算）。 */
let chaseScene=null;
function chaseSpec(){
  const c=(TOWNS[townId]||{}).chase || null;
  if(!c || !c.hard || !c.hard.need || !prog.hasFlag(c.hard.need)) return c;
  const h=Object.assign({}, c.hard); delete h.need;
  return Object.assign({}, c, h);
}
/* 現在那一筆（`null`＝還沒上線／不是這張圖）。⚠ 每次現讀，不快取：
   讀檔會把鑰匙整個換掉，快取一份就會拿著上一個檔的追兵（鐵律 7）。 */
function chaseGet(){ return chaseSpec() ? prog.getChase(townId) : null; }
function chaseSet(o){ prog.setChase(o); }
function chaseNew(){ return { town:townId, node:null, stun:0, steps:0, fights:0, hits:0 }; }
/* 這一格玩家站著時牠不推進（`idleAt`，墓門）。
   ⚠ **是「玩家在哪」不是「牠在哪」**：Ray 的原話是「墓門不是安全區但是也不出怪
     也不會追」—— 那一格是「還沒開始」的緩衝。 */
function chaseIdle(id){ const c=chaseSpec(); return !!(c && (c.idleAt||[]).indexOf(id)>=0); }
/* ══⚠⚠⚠ **追兵走的是「無向」的圖**（ver -1577）══════════════════════════════
   ⚠⚠ 與 `nodeNeighbors` 是**兩個不同的問題**，所以刻意是兩支（不是同一件事寫兩遍）：
     · `nodeNeighbors(id)` ＝「這一格**宣告**得出去的方向」（**有向**，不含 `back`）。
       龍用它 —— 而且 `dragonCanStop` 的「三岔以上才停得住」是**綁在那個度數上**的，
       改成無向等於把貝利薩爾那一整套調好的行為換掉。**不要合併。**
     · `mapLinks(id)`      ＝「這一格**通到**哪幾格」。回頭路也是路。
   ⚠⚠⚠ **不這樣做的下場（實測，ver -1577 當場踩到）**：古墓有兩條邊只寫了 `back:`
     （墓門↔前庭、第一道階梯↔二層梯廳）—— 在有向圖裡那兩條**只能往前不能往後**，
     於是整棵樹變成「從入口單向往外」，`stepToward(任何一格,'gate')` 一律回 null
     ⇒ **追兵永遠放不出來**（`chaseSpawn` 每一步都失敗），而畫面上沒有任何錯誤訊息：
     玩家從頭走到尾什麼事都不會發生。走模擬才看得出來。
   ⚠ 拓樸是常數 ⇒ 逐圖算一次就快取；`open()` 換圖時清掉（`chaseGraph=null`）。 */
let chaseGraph = null;
function mapLinks(id){
  if(!chaseGraph){
    const T=TOWNS[townId]||{}, N=T.nodes||{}, g={};
    const add=(a,b)=>{ if(!N[a]||!N[b]||a===b) return;
                       (g[a]=g[a]||[]).indexOf(b)<0 && g[a].push(b); };
    for(const a in N){
      const ex=N[a].exits||{};
      for(const d in ex){
        const t=ex[d];
        /* ⚠ `back` **也算**（與 `nodeNeighbors` 唯一的差別）：它是一條真的路，
           玩家就是走它回去的。 */
        if(typeof t!=='string' || t[0]==='@') continue;
        add(a,t); add(t,a);                      // 無向：兩個方向都接
      }
    }
    chaseGraph=g;
  }
  return chaseGraph[id]||[];
}
/* 朝 `goal` 的下一步（最短路，BFS）。⚠ 與 `stepToward` 是同一個演算法、**不同的圖**
   —— 那一支是龍的（有向），這一支是追兵的（無向），見上面那一段。 */
function chaseToward(from, goal){
  if(from===goal) return null;
  const seen={ [from]:true }, q=[[from,null]];
  while(q.length){
    const [cur, first]=q.shift();
    for(const to of mapLinks(cur)){
      if(seen[to]) continue;
      seen[to]=true;
      const f = first || to;
      if(to===goal) return f;
      q.push([to, f]);
    }
  }
  return null;
}
/* 從 `from` 朝 `goal` 走 `n` 步停在哪（走不到就停在盡頭）。 */
function chaseWalk(from, goal, n){
  let cur=from;
  for(let i=0;i<n && cur!==goal;i++){ const nx=chaseToward(cur, goal); if(!nx) break; cur=nx; }
  return cur;
}
/* ══ 上線：**直接站在玩家腳下那一格**（ver -1593，Ray：「三戰後下一格才出守護者
   劇情」）══ 那一場就是守墓者的登場戲 —— 所以不是「落後 `gap` 格慢慢追上來」，
   是**下一格就在那裡**。
   ⚠⚠ -1576 的「落後 `gap` 格」拿掉了：那一版配上「踩到第 4 格」的觸發，
     實際跑起來是**走四格就撞上守墓者**（雜兵在 -1591 之前刷不出來），
     玩家第一場就見到牠 —— Ray 回報的正是這個。
   ⚠ 擊退之後牠就留在原地、停 `stun` 回合，之後才照 `speed` 追 —— 那一段沒有變。 */
function chaseSpawn(c, spec, at){
  c.node = at;
}
/* ══ 玩家動了一格：步數 +1 → 該上線就上線 → 牠推進 `speed` 格 ══
   `to` ＝玩家**剛走到**的那一格（不是原本站的那一格）。
   ⚠⚠ 掛在 `go()`（移動的那一刻）**不是** `enter()`：抵達那一支還要判「有沒有踩到牠」，
     而且 `enter()` 讀檔／強制轉場／戰鬥交棒回來都會跑 —— 那幾種不是「玩家走了一格」。 */
function chaseStep(to){
  const spec=chaseSpec(); if(!spec) return;
  if(chaseIdle(to)) return;                       // 墓門：這一步整個不算
  const c = chaseGet() || chaseNew();
  c.steps=(c.steps|0)+1;
  if(!c.node && chaseDue(c, spec)) chaseSpawn(c, spec, to);
  chaseAdvance(c, spec, to, spec.speed|0);
  chaseSet(c);
}
/* 上線的條件：**打過 `startFights` 場**（ver -1593，Ray：「三戰後下一格」）。
   ⚠ `startStep`（-1576 的「踩到第 4 格」）**已停用** —— 0 代表不看步數。
     留著讀它是為了「日後要改回來只動資料」，但預設不會成立。 */
function chaseDue(c, spec){
  const byStep = (spec.startStep|0) > 0 && (c.steps|0) >= (spec.startStep|0);
  return byStep || (c.fights|0) >= (spec.startFights|0);
}
/* 推進 n 格（停頓中就只扣一回合）。⚠ 只有它會動 `c.node`／`c.stun`（鐵律 7）。 */
function chaseAdvance(c, spec, goal, n){
  if(!c.node) return;
  if((c.stun|0) > 0){ c.stun=(c.stun|0)-1; return; }   // 停頓：這一回合不動
  c.node = chaseWalk(c.node, goal, n);
}
/* ══ 遭遇雜怪：牠**再**推進 `onEncounter` 格（玩家停下來打了一場）══ */
function chaseOnEncounter(){
  const spec=chaseSpec(); if(!spec) return;
  const c=chaseGet(); if(!c || !c.node) return;
  chaseAdvance(c, spec, nodeId, spec.onEncounter|0);
  chaseSet(c);
}
/* ══ 抵達：踩到牠了嗎 ══
   ⚠⚠ **不出怪的格子也打不起追擊戰**（同 `dragonActDue` 的第一行，鐵律 7：判準只有
     `n.noWild` 一個）—— 三個安全點與墓門都是 `noWild`，所以「安全點是安全的」
     不必另外列一張名單。牠照樣站得上去，只是踩到不開打。
   ⚠ 沒有台詞：Ray 只給了「追上就打」。要加台詞就在資料上長一格，不要寫進這裡。 */
/* 照 `{at,flag}` 指名那一格的**那一段**（ver -1606；-1608 抽成共用）。
   ⚠ 前置旗／章節門照舊要過；已經演過（flag 插了）就回 null。 */
function namedAct(ref){
  if(!ref || !ref.at || !ref.flag) return null;
  const src=((TOWNS[townId]||{}).nodes||{})[ref.at];
  const a=(src && (src.acts||[]).find(x=>x && x.flag===ref.flag)) || null;
  if(!a || prog.hasFlag(a.flag)) return null;
  if(a.need && !prog.hasFlag(a.need)) return null;
  /* ⚠⚠ `until` ＝**這支旗立了就作廢，不補演**（ver -1616，Ray：「如果到我們才不會輸
     之前沒出死纏濫打的話，就不會再出死纏爛打」）。語意與 `actDue` 的 `until` 同一個
     （鐵律 7：兩支各寫一份必然走鐘）—— 這一支以前沒判它，於是追兵帶著走的那幾段
     **過了時機還是會補演**。 */
  if(a.until && prog.hasFlag(a.until)) return null;
  if(a.fromStage!=null && prog.getStage() < a.fromStage) return null;
  return a;
}
/* ══⚠⚠⚠ **登場戲之後的「下一格」**（ver -1608，Ray：「一直以來都是下一格，
   誰、什麼時候跟你說綁在那裡的？」）══════════════════════════════════════════
   背安雅那一段（`tomb_carry`）稿上寫的是「**下一個房間**」，而 ver -1526 把它
   讀成一個**節點 id**（`nichehall`）釘死在那一格上 —— 沒有人這樣要求過。
   追兵現在可能在任何一格登場，釘死的那一格多半根本不順路 ⇒ 那一段看不到。
   ⇒ `chase.next:{at,flag}` ＝「登場戲之後，**換一格就演**」。
   ⚠ 判「換了一格」＝ `nodeId !== c.node`（牠被擊退後停在登場的那一格，
     所以那一格就是「上一格」）。
   ⚠ 那一段的台詞**留在原本那個節點的 `acts` 裡**（好找），這裡只是指名它 ——
     所以走到那一格照樣演得到，兩條路共用同一個 `flag`，只會演一次。 */
function chaseNextAct(n){
  const spec=chaseSpec(); if(!spec || !spec.next || !n) return null;
  const c=chaseGet(); if(!c || (c.hits|0)<1) return null;      // 還沒登場過
  if(c.node && c.node===nodeId) return null;                   // 還在登場的那一格
  return namedAct(spec.next);
}
function chaseActDue(n){
  const spec=chaseSpec(); if(!spec || !n) return null;
  if(n.noWild) return null;
  const c=chaseGet(); if(!c || !c.node || c.node!==nodeId) return null;
  /* ══⚠⚠ **與 `mustWild` 那一格競合 ⇒ 走追兵**（ver -1648，Ray：「第二格如果跟
     墓主競合，走墓主」）══ 優先序本來就對（`runArrival` 是
     `chaseActDue → chaseNextAct → wildRoll`，鐵律 8 的那一串），這裡只補一件：
     **真的交出一段之後，把那一格的保證一起消耗掉** —— 在那裡打了一場就是
     「遇敵過了」，不然它會繼續欠一場，下一次走過去又硬塞一隻雜怪進來。
     ⚠ 掛在**兩個 return 之前**不是函式開頭：開頭那裡還不知道會不會真的交出東西
     （`battles` 是空的就 return null），先插旗等於把保證白白消耗掉。 */
  const eatMustWild=()=>{
    if(n.mustWild && !prog.hasFlag(mustWildFlag(nodeId))) prog.addFlags([mustWildFlag(nodeId)]);
  };
  /* ══⚠⚠⚠ **被追上時要演哪一段：一張由上往下取第一個成立的表**
     （`chase.scenes`，ver -1616）══════════════════════════════════════════════
     -1603~-1608 只有**一段**（`chase.intro` ＝登場戲），而 Ray 的稿現在有三段：
       ① 登場（首戰兩輪）② 二戰之前被追上（索「真是死纏濫打！」）
       ③ 二戰之後被追上（諾「我……我沒問題的！」）
     ⚠⚠⚠ **順序不靠 `hits` 數，靠那幾段自己的旗**（鐵律 9：一個狀態一個擁有事件）：
       每一段演完插自己的 `flag`，下一段用 `need` 指著前一段的旗、用 `until` 指著
       作廢的時機 —— 全部是 `namedAct` 既有的規約，這裡一個條件都不必新發明。
       用 `hits===0/1/2` 去排的話，玩家多被追上一次整條就錯位，而且查不出來。
     ⚠ 舊的 `chase.intro` 併進這張表的第一列（鐵律 7：不要留第二份）；
       為了不讓舊資料靜靜壞掉，讀不到 `scenes` 時仍然吃 `intro`。 */
  const scenes = spec.scenes || (spec.intro ? [spec.intro] : []);
  for(const ref of scenes){
    const w = namedAct(ref);
    if(!w) continue;
    /* ══⚠⚠⚠ **`afterHits:N` ＝那一段的前置旗插上去之後，**第 N 次**被追上才演**
       （ver -1618，Ray：「二戰之後被追到三次才出諾那段，改成字面的」）══
       ⚠⚠ 不能用 `c.hits` 的絕對值：在那之前被追上幾次是玩家決定的
         （登場 1 次＋死纏濫打 0 或 1 次＋任意場純追擊戰）。所以要**記一個起點**：
         前置旗第一次被看到的那一刻，把當時的 `hits` 存進 `c.marks`。
       ⚠ `marks` 住在追兵那一筆狀態裡 ⇒ 存讀檔／`newRun` 自動跟著走（§6.9）。
       ⚠ 算式：這一次是起點之後的第 `c.hits-mark+1` 次被追上
         （`chaseActDue` 跑在 `hits++` **之前**）。 */
    if(ref.afterHits > 1){
      c.marks = c.marks || {};
      if(c.marks[w.flag] == null){ c.marks[w.flag] = (c.hits|0); chaseSet(c); }
      if((c.hits|0) - c.marks[w.flag] + 1 < ref.afterHits) continue;
    }
    chaseScene = w; eatMustWild(); return w;
  }
  const list=spec.battles||[];
  if(!list.length) return null;
  const id=list[(c.hits|0) % list.length];
  /* ⚠ 標記在物件上（`__chase`）：段落演完那一支要認得出「這是一場追擊戰」
     才會停 `stun`。**白名單而不是排除法**（鐵律 13 與 -1446 龍那一課：
     排除法漏寫會亂動，白名單漏寫只是少動一次）。 */
  eatMustWild();
  return { __chase:true, lines:[ { battle:id } ] };
}
/* ══ 段落演完（`enter()` 的收尾）══ 三件事，順序不可換：
     ① 這一趟打過幾場（`startFights` 的門檻）
     ② `resetAt` 那一格的必觸戰鬥 → 牠的位置設成那一格（Ray：「從柱廳戰後從柱廳開始停」）
     ③ 追擊戰打贏 → 停 `stun` 回合
   `act` ＝剛演完的那一段；`fought` ＝這一段裡真的有戰鬥拍。 */
function chaseAfterAct(act, fought){
  const spec=chaseSpec(); if(!spec) return;
  if(!fought) return;                             // 純對白不算一場
  const c = chaseGet() || chaseNew();
  c.fights=(c.fights|0)+1;
  if(nodeId === spec.resetAt && act && act.flag){
    /* ══ `resetAt`（柱廳）：那一格的**必觸戰鬥**打完，牠的位置設成這一格再停 `stun`
       （Ray：「從柱廳戰後從柱廳開始停 然後追」）══
       ⚠⚠ 條件帶 `act.flag` ＝**只有主線那一段**算數（雜怪與追擊戰都沒有 `flag`）。
         不帶的話，日後走回柱廳隨便打一場雜怪就能把牠叫回柱廳再停四回合 ——
         那是一顆免費的重置鈕，而且看起來與正常行為一模一樣。
       ⚠ 連「還沒上線」也算數：打過那一場就等於追逐真的開始了。 */
    c.node = nodeId; c.stun = spec.stun|0;
  }else if(act && (act.__chase || act===chaseScene)){
    /* ⚠⚠ 追兵帶著走的那幾段（`chase.scenes`）**不是** `__chase`（它們是節點上的
       正規 act），但演完就是「被追上並打退了」—— 一樣 `hits+1` ＋ 停 `stun`，
       不然牠會賴在原地連環開打。
       ⚠⚠⚠ 認的是**物件本身**（`act===chaseScene`）不是 `hits===0`：-1616 之後
         那張表有三段，用場次去認只認得出第一段，後兩段演完牠不會停 `stun`
         —— 症狀是「講完話牠又立刻打一場」，而且沒有任何錯誤訊息。 */
    c.hits=(c.hits|0)+1; c.stun = spec.stun|0;    // 擊退：牠停在原地（＝玩家腳下）
  }
  chaseSet(c);
}
/* 牠現在在哪一格（除錯／日後要畫小地圖紅點時問這一支，鐵律 7）。 */
export function chaseAt(){ const c=chaseGet(); return (c && c.node) || null; }
export function chaseDebug(){
  const spec=chaseSpec(), c=chaseGet();
  const why = ref => { if(!ref) return '（沒設定）';
    const src=((TOWNS[townId]||{}).nodes||{})[ref.at];
    const a=(src && (src.acts||[]).find(x=>x && x.flag===ref.flag))||null;
    if(!a) return '找不到那一段（'+ref.at+'/'+ref.flag+'）';
    if(prog.hasFlag(a.flag)) return '★已經演過了（旗 '+a.flag+' 插著）⇒ 不會重演';
    if(a.need && !prog.hasFlag(a.need)) return '等前置旗 '+a.need;
    if(a.until && prog.hasFlag(a.until)) return '★過期作廢（旗 '+a.until+' 插著）⇒ 不補演';
    if(a.fromStage!=null && prog.getStage()<a.fromStage) return '等 stage '+a.fromStage;
    return '還沒演，條件已到 ✔'; };
  return {
    現在: c || '（還沒上線）',
    上線條件: spec ? ('打過 '+spec.startFights+' 場'+((spec.startStep|0)>0?('，或踩到第 '+spec.startStep+' 格'):'')) : '（這張圖沒有追逐）',
    已打場數: c ? (c.fights|0) : 0,
    被追上要演的那幾段: spec
      ? (spec.scenes||(spec.intro?[spec.intro]:[])).map(r=>r.flag+'：'+why(r))
      : '—',
    密急階段: spec && spec.hard
      ? (prog.hasFlag(spec.hard.need) ? '★已開（'+spec.hard.need+'）' : '還沒（等 '+spec.hard.need+'）')
      : '（這張圖沒有）',
    下一格那一段: spec ? why(spec.next) : '—',
    參數: spec || null,
  };
}
/* 雜怪那一支的**外衣**（ver -1577）：取到東西＝玩家停下來打了一場 ⇒ 追兵再推進
   `onEncounter` 格。⚠ 包一層而不是散在 `wildActDue` 的每一個 `return`
   （那一支有六個出口，漏一個就是「有時候不推進」而且查不出來，鐵律 8）。 */
/* ══ 遇敵率的除錯計數（ver -1603）══ Ray 回報「走好久才一隻」而我在測試機上
   重現不出來 —— 與其互猜，讓他直接讀數字：走幾格／擲了幾次／中了幾次／為什麼沒擲。
   ⚠ 唯讀、沒有副作用，所以不鎖 testmode（同 `audioDebug`／`outingDebug`）。 */
const wildStat = { moves:0, asked:0, rolled:0, hit:0, skip:{} };
function wildSkip(why){ wildStat.skip[why]=(wildStat.skip[why]||0)+1; return null; }
export function wildDebug(){
  const r=wildStat.rolled, h=wildStat.hit;
  return { 走了幾格:wildStat.moves, 問了幾次:wildStat.asked, 真的擲了:r, 中了:h,
           實際命中率: r ? +(h/r).toFixed(3) : null,
           設定的機率: ((TOWNS[townId]||{}).wildSpawn||{}).rate,
           沒擲的原因: wildStat.skip };
}
function wildRoll(n){ const a=wildActDue(n); if(a) chaseOnEncounter(); return a; }
/* ══⚠⚠⚠ **卡上宣告的出沒地**（ver -1584b，Ray：「指定地點要分整個探索地圖跟房間。
   指定探索地圖的話就是圖中安全區以外的任一格都有機會刷出；指定房間的話就是只有
   該房間才刷出」）══════════════════════════════════════════════════════════
   敵人卡的 `spawnAt`（Excel 的「出沒地」那一欄），兩種寫法，多筆用「，」隔開：
       `<圖id>`          ＝整張探索地圖 —— **安全區以外**的任一格都有機會
       `<圖id>:<節點id>` ＝只有那一格才刷
   ⚠⚠ **「安全區以外」是算出來的，不是列名單**（鐵律 7）：問那一格自己的 `noWild`
     （＝`wildActDue` 底下那一行讀的同一個真相）與「入口／這一趟走進來的那一格」。
   ⚠⚠ **與地圖上的 `wildSpawn.pool` 是兩條路，刻意分開**：
     · `wildSpawn.fixed`／`encounters` ＝**那張地圖**安排的（必出格、劇本遭遇）
     · 卡上的 `spawnAt`               ＝**那一隻怪**自己說牠住哪
     兩邊都有東西時**聯集**（同一隻不會重覆，`wildDone` 管）。
     ⚠ 這不是「兩份真相」：問的是兩個不同的問題（「這一格安排了誰」vs「這一隻住哪」）
       —— 同 `nodeNeighbors`／`mapLinks` 那一對的分法。
   ⚠ 空白＝這一隻不由這一欄決定（走地圖自己的 `wildSpawn`），所以**漏填不會變成
     到處都刷**（鐵律 13：漏寫要落在安全的那一側）。 */
function cardSpawnPool(nodeIdNow){
  const E = GAME_CONFIG.enemies || {}, out = [];
  for(const k in E){
    const at = E[k] && E[k].spawnAt;
    if(!at) continue;
    for(const one of String(at).split(/[，,]/)){
      const seg = one.trim(); if(!seg) continue;
      const i = seg.indexOf(':');
      const map = (i < 0 ? seg : seg.slice(0, i)).trim();
      const nd  = (i < 0 ? ''  : seg.slice(i + 1)).trim();
      if(map !== townId) continue;
      if(nd){ if(nd === nodeIdNow) out.push(k); }     // 指定房間：只有那一格
      else out.push(k);                               // 整張圖（安全區由呼叫端擋）
    }
  }
  return out;
}
/* `mustWild` 那一格的「已經保證過了」旗（ver -1648）。
   ⚠ **旗名由圖＋格推出來**，不要寫死在資料裡：插旗端與查旗端各寫一個字串的話，
     打錯一個字就是「插了但查不到」，而且不會有任何錯誤訊息（同 `safehouseFlag`）。 */
function mustWildFlag(id){ return 'mustwild_' + townId + '_' + id; }
function wildActDue(n){
  const T0=TOWNS[townId]||{};
  wildStat.asked++;
  const cardPool = cardSpawnPool(nodeId);
  const W=T0.wildSpawn; if((!W && !cardPool.length) || !n) return wildSkip('這張圖沒有怪');
  if(prog.hasFlag(safehouseFlag())) return wildSkip('安全區旗');
  /* ══⚠⚠ **`wildFrom:'<旗>'` ＝這支旗插上去之前，這張圖一隻野怪都沒有**
     （ver -1399，Ray：「貝利薩爾在王座徘徊者擊敗前沒有野怪」）══
     ⚠ 它與**安全區旗**是兩件事，不要拿其中一個去湊：
       · 安全區旗（`safehouse_<圖>`）＝**會開會關**的狀態，特殊戰還會把它拔掉再插回去
       · `wildFrom` ＝這張圖的**資料**：在那個事件之前它根本還不是一張會出怪的圖
     ⚠ 寫在城上（鐵律 1）；旗名由那一段劇情自己認領（鐵律 9：誰插得出來）。 */
  if(T0.wildFrom && !prog.hasFlag(T0.wildFrom)) return wildSkip('wildFrom 還沒開');
  /* ══⚠⚠⚠ **結算怪已取消**（ver -1024，Ray：「取消結算怪的放置，一律以踏入結算點
     為結算條件」）══ ver -895／-898 的那一套（把 `wildSpawn.endBattle` 擺在
     「這一趟沒走進來的那個出口」、那一格拒絕戰鬥就退一格）**整組撤掉**：
     `pickEndNode()`／`endNodeId`／`endBattleNode()` 與這裡的分支都沒了。
     ⇒ 現在**收局的條件只有一個**：踏進 `rest:true` 的結算點（`restActDue`）。
       離開地圖那一條（`leaveMapRitual`）是保險，不讓帳被卡在圖裡。
     ⚠ 資料上的 `wildSpawn.endBattle` 現在**沒有人讀** —— 欄位留著不刪（它是
       「這張圖的收局怪是誰」的宣告，日後要改回來只動程式），但別再指望它會出現。 */
  /* **起點必不出怪**（ver -1026）：這一趟真的走進來的那一格 —— 它同時是遭遇戰的
     復活點。⚠ 與 `entryNodeId`（資料上的入口）**兩個都擋**：讀檔／跳關可以落在
     中間任何一格，那時 `cameNodeId` 是入口，兩者重合；從另一頭走進來時才分家。 */
  if(cameNodeId && nodeId===cameNodeId) return wildSkip('這一趟的起點格');
  if(nodeId===entryNodeId) return wildSkip('入口（復活點）');
  /* ══⚠⚠ **`noWildFirst:true` ＝這一趟第一次踏進這一格不出怪**（ver -1618，Ray：
     「門廳第一次進去不出怪」）══ 走出去再走回來就照常擲。
     ⚠ 與 `noWild`（永遠不出）、`mustWild`（這一趟第一次必出）是同一族的三個旋鈕，
       三個都宣告在**節點上**（名單寫在城上會與節點走鐘，見 ruins 的 wildSpawn 註解）。 */
  if(n.noWildFirst && !wildVisited.has(nodeId)){
    wildVisited.add(nodeId); return wildSkip('門廳：這一趟第一次進來不出怪');
  }
  wildVisited.add(nodeId);
  /* ══⚠⚠ **指定遭遇**（ver -879，Ray：「鹿主未變異日後則會在黃昏夜晚時段在夏爾森林
     隨機遇到，劇情從諾『牠好像不太歡迎我們』開始跑，進入戰鬥」「打完就沒了，
     不會出第二次，隨機遇到的機率是 5%」）══
     ＝**劇本安排的那一場，只是不指定在哪一格**。排在 fixed／pool **之前**：
     它是劇情不是雜怪，撞在一起時它優先。一筆的欄位：
       need／not  前置旗／擋路旗（`not` 那一支就是「已經打過了」，鐵律 9）
       band       時段白名單（`clock.band()` 的字面）
       at         只在這一格成立（不寫＝不限場域，ver -919）
       rate       每次抵達擲一次
       act        取到就照它演 —— `flag`／`storyBattle`／`lines` 全部照 `acts` 的規約，
                  由 `enter()` 那一套統一收尾（旗標**演完才記**，打輸回頭還遇得到）
     ⚠ 它**不進 `wildDone`**：那一組是「這一趟同種不重複」，而這一場一輩子只有一次，
       靠 `act.flag` 擋 —— 兩者不是同一件事，共用會讓「這一趟沒遇到」變成「永遠沒有」。 */
  for(const e of ((W&&W.encounters)||[])){
    /* `at:'<節點>'` ＝這一筆只在那一格成立（ver -919，神殿的鳴鐘者只出現在巨像廳）。
       ⚠ 不寫＝不限場域（鹿主那一筆就是）—— 舊資料不受影響。 */
    if(e.at && e.at!==nodeId) continue;
    if(e.need && !prog.hasFlag(e.need)) continue;
    if(e.not  &&  prog.hasFlag(e.not))  continue;
    if(e.band && !e.band.includes(clock.band())) continue;
    if(e.act && e.act.flag && prog.hasFlag(e.act.flag)) continue;
    if(Math.random() >= (e.rate||0)) continue;
    return e.act;
  }
  /* ⚠ 節點自己宣告「這裡不出野怪」（ver -879（-893 前用詞），Ray：「神殿入口除了鹿主戰之外是
     安全區，不出怪」）——擋在**指定遭遇之後**：那一場是劇本，不受這條管。 */
  if(n.noWild) return wildSkip('這一格 noWild');
  let pick=null;
  const fx=W && W.fixed && W.fixed[nodeId];
  if(fx && !wildDone.has(wildSpecies(fx))) pick=fx;
  if(!pick){
    const conn=connectorIds().includes(nodeId);
    const okHere = p => !(p.where==='connector' && !conn);
    /* 這一趟**還沒打過的**那幾隻（「一趟同種不重複」的規約）。 */
    /* 卡上宣告的那幾隻（見 cardSpawnPool）與地圖自己的池子**聯集**。
       ⚠ 卡上那一批沒有 `where` 限制（牠自己已經說了住哪），所以直接包成同樣的形狀。 */
    const pool0 = ((W&&W.pool)||[]).concat(cardPool.map(k=>({ battle:k })));
    const fresh=pool0.filter(p=> okHere(p) && !wildDone.has(wildSpecies(p.battle)));
    /* ══⚠⚠ **池子清空之後要能重刷**（ver -958，Ray：「重複攻略神殿時路上要有 25%
       機率遇怪，好像打完中 boss 走到休息點就幾乎碰不到怪了」）══
       -924 就有「重刷率」了，但候選**照樣把 `wildDone` 濾掉** —— 於是池子裡那幾隻
       各打過一次之後 `cands` 永遠是空的，那 25% 擲了也沒用（`return null`）。
       神殿的池子只有四隻，走到中段就見底：那正是 Ray 看到的「幾乎碰不到怪」。
       ⚠ 所以「重刷」有**兩個**觸發，任一成立就走 25%：
         · 這一格這一趟已經出過怪了（`wildCleared`，-924 原本的那條）
         · 這一趟**整池都打過了**（`repeat`，本版新增）—— 這時同種可以再遇
       ⚠ `wildDone` 的語意沒有變：它管的是**第一輪**同種不重複，不是「永遠只遇一次」。
       ⚠ 必出格（`fixed`）與結算怪不受影響：那兩種本來就是一趟一次。 */
    const repeat = !fresh.length;
    let rate = (repeat || wildCleared.has(nodeId))
      ? ((GAME_CONFIG.tuning||{}).wildRespawnRate!=null ? GAME_CONFIG.tuning.wildRespawnRate : 0.25)
      : ((W&&W.rate)||(cardPool.length?((GAME_CONFIG.tuning||{}).wildRespawnRate||0.25):0));
    /* ══⚠⚠⚠ **`mustWild:true` ＝這一格**整輪只保證第一次**必出怪**
       （ver -1616 立；**-1648 由「每一趟」改成「整輪一次」**，Ray：「100% 遇敵格
       也只有剛進去那一次，兩格都遇敵後就解除」）══
       ⚠⚠ 宣告在**節點上**不是在城上列一張名單 —— 與 `noWild` 同一個位置、同一個
         道理（§ruins 的 `wildSpawn` 註解：「名單會與節點走鐘」）。
       ⚠⚠ 與 `fixed` 是兩件事：`fixed` 指定**哪一隻**（那一格永遠是同一隻），
         這一格只保證**有一隻**，抽誰照舊走池子。
       ⚠⚠⚠ **用旗記，不是用這一趟的帳**：`wildCleared` 在 `open()` 歸零 ⇒
         出城再進來又保證兩場。那個保證只是為了「首戰兩輪必在柱廳前」，
         劇情跑完就不該再有（Ray 明講）。
       ⚠ **逐格一支旗**（`mustwild_<圖>_<格>`）而不是「這張圖做完了」一支 ——
         這樣「兩格都遇敵後就解除」是**自然的結果**，不必有人去數還剩幾格
         （鐵律 9：一個狀態一個擁有事件；誰插＝那一格真的出過怪那一次）。
       ⚠ 旗是**一輪內**的（`newRun()` 清、存讀檔帶，§6.9 那張清單）。 */
    if(n.mustWild && !prog.hasFlag(mustWildFlag(nodeId))) rate = 1;
    wildStat.rolled++;
    if(Math.random() >= rate){ wildSkip('擲骰沒中（rate '+rate+'）'); return null; }
    wildStat.hit++;
    const cands = repeat ? pool0.filter(okHere) : fresh;
    if(!cands.length){ wildStat.hit--; return wildSkip('中了但池子是空的'); }
    pick=cands[Math.floor(Math.random()*cands.length)].battle;
  }
  /* 取走就記（同一趟不再出同種）：這一場**立刻開打**（沒有可被中途放掉的對白），
     打輸的回程會把城收掉重開 → open() 歸零，所以不會把「輸了的那一隻」鎖死。 */
  wildDone.add(wildSpecies(pick));
  wildCleared.add(nodeId);          // 這一格出過怪了（ver -924，見上面那一段）
  /* `mustWild` 那一格真的出過怪了 ⇒ 插旗，整輪不再保證（ver -1648，見上）。 */
  if(n.mustWild) prog.addFlags([mustWildFlag(nodeId)]);
  const id=wildVariant(pick);
  return id ? { lines:[ { battle:id } ] } : null;
}

/* ══ 傍晚：強制回旅店（ver -427，Ray 重寫）══════════════════════════════
   兩條觸發、兩句台詞（資料在 `TOWNS[].evening`）：
     · 走完所有地點、還沒到 18:00 → `bySeen`
     · 沒走完、時間過了 18:00     → `byTime`
   ⚠ **兩條同時成立時走 `byTime`**：那時「天色不早了」才是玩家看得到的事實。
   ⚠ 回傳的是**攤平**的一包（`flag/hour/goto/lines`）：呼叫端只要一層就拿得到，
     不必記得「哪一句在哪一層」。
   ⚠ **在旅店裡不演**：那時走的是旅店自己的分支二（Ray 的規則四／五），
     旗標由 `inn.arrive` 那一支記（見 `afterArrive` 傳進去的 `eveningFlag`）。 */
function eveningDue(n){
  if(siegeOn()) return null;     // 戰鬥地圖不催你回旅店（ver -584）
  const T=TOWNS[townId], ev=T && T.evening;
  if(!ev) return null;
  if(n && n.inn) return null;
  if(ev.flag && prog.hasFlag(ev.flag)) return null;
  const byTime = (ev.hour!=null) && (clock.hourF() >= ev.hour);
  const lines = byTime ? ev.byTime : (allSeen() ? ev.bySeen : null);
  return (lines && lines.length)
    ? { flag:ev.flag, hour:ev.hour, goto:ev.goto, lines } : null;
}

/* ══ Stage 0 的結尾（ver -427，Ray 定案）══════════════════════════════════
   「不論用任何方式到達／經過早上七點就進入 stage1，始於船塢。」
   ⚠⚠ **三條路都會推時鐘**（走一步／獨自坐坐／回房睡覺），所以判定收在這一支，
     由推完時鐘的人呼叫（鐵律 8）—— 寫在各個呼叫點一定會漏掉其中一條。
   ⚠ 用**絕對分鐘數**比（`clock.firstHourAt`），不是「現在幾點」：那是時間軸上的
     一個點，用時刻比會在第三天早上又成立一次。
   ⚠ 旗標**立刻記**（不是演完才記）：這一格是狀態轉移不是對白，而且下一拍就要
     `enter(goto)`，不先記的話那一次 enter 又會判到同一個閘門（無窮遞迴）。 */
/* ══⚠⚠ **強制轉場的閘門是一張清單**（ver -656）══════════════════════════
   城上寫 `gates:[…]`；`stage1` 是它的舊名（帝都那一個），視為只有一項的清單 ——
   **判定只有這一支**（鐵律 8），日後多一個閘門只加一筆資料。
   一筆閘門的欄位：
     flag        立起來就不再觸發（**立刻記**，見下）
     need        這支旗立了才有效（前置）
     hour        到達或經過**時間軸上**那一個時刻才觸發（開局起算的分鐘數比，
                 見 `firstHourAt`）—— 帝都 stage 0 的結尾用的是這一種
     hourOfDay   **今天**過了這個時刻就觸發（`hourF()` 比）；
                 寫成 `[起,迄]` ＝**時段**（迄不含）—— 「隔日早上那一幕」要用這個，
                 見下面的說明
     onMove      **走一步就觸發**（Ray：「一進行地圖移動，祭司會出現」）
     fromStage   到了這一章才有效（ver -954，同 acts 的同名欄位）
     afterMoves  這個閘門變成可觸發之後**又走了 N 步**才真的觸發（ver -953）——
                 走一步 10 分鐘，所以 6 ＝一小時，第 7 步發動（Ray 指定的算法）
     goto        強制移到哪一格
     enterAgain  已經站在那一格時也要再 enter 一次（讓那一格的 acts 接手）
     clockTo     轉場前把時鐘推到**下一個**這個時刻（advanceToNextHour）
     stage / lines / sides  同舊的 stage1
   ⚠ 條件全部是 **and**：都寫就都要成立。
   ⚠ 清單由上往下取**第一個成立的**（同 acts）。 */
function gateList(){
  const T=TOWNS[townId]; if(!T) return [];
  return T.gates ? T.gates : (T.stage1 ? [T.stage1] : []);
}
function stageGate(){
  if(mutedTalks()) return null;   // 舊章節封存（ver -753）：安葬／那一夜那些閘門不再抓人
  for(const g of gateList()){
    if(!g) continue;
    if(g.flag && prog.hasFlag(g.flag)) continue;
    /* ⚠⚠ `skipIf`（ver -1095）＝**這支旗立了就把這一道退休**。
       與 `flag`（自己演完才記）是兩件事：那一支答「我演過了沒」，這一支答
       「這件事**還有沒有意義**」—— 有些閘門的前提會被**別的段落**作廢。
       ⚠ 起因：Stage8 的「諾薇兒肚子餓」（`sv_s8_hungry`）條件是「`sv_s8_home`
         演完之後又走了六步」。玩家自己走去餐廳的話它從來沒被觸發，於是**一直
         armed**；ver -1093 讓科爾文那一段演完就開放自由探索之後，玩家終於有地方
         走六步了 —— 肚子餓就在 Stage9 又演了一次（Ray 回報）。
         正解是給它一個**退場條件**（`skipIf:'sv_s8_dine'`：飯都吃過了，餓什麼），
         不是去動 `afterMoves` 的計數。
       ⚠ 同 `acts` 的 `until`（ver -668）是同一個概念：`flag` ＝我演過了、
         `until`／`skipIf` ＝別人那一段演完了。 */
    if(g.skipIf && prog.hasFlag(g.skipIf)) continue;
    if(!needOk(g.need)) continue;
    /* `fromStage`（ver -954）：**到了這一章**才有效。與 acts 的同名欄位同語意
       —— Stage8 的起始時間那一道要的條件是「S7 演完了」，而 S7 有兩條分支
       （鹿主走掉／打贏），插的旗不同、升的章相同，用旗當前置一定漏掉一條。 */
    if(g.fromStage!=null && prog.getStage() < g.fromStage) continue;
    /* 「一進行地圖移動」：`backDir` 是這一次抵達由 `pendingDir` 推出來的 ——
       走過來才有，開城／強制轉場／讀檔都是空的（forceGo 會把 pendingDir 清掉）。 */
    if(g.onMove && !backDir) continue;
    if(g.hour!=null && clock.elapsed() < clock.firstHourAt(g.hour)) continue;
    /* ══ `afterMoves`（ver -953，Stage8：「自由探索。超過一小時仍沒有去餐廳」
       → Ray：「不要那麼麻煩，移動六次就是一小時，第七次就出肚子餓劇情」）══
       **從這個閘門變成可觸發的那一刻起**算走了幾步（走一步 10 分鐘，六步＝一小時）。
       ⚠ 計數是**這一趟進城的記憶體變數**（`gateMoves`），不進存檔：它不是世界的
         狀態，是「玩家在這一段裡逛了多久」。離城再回來重新算，那沒有壞處 ——
         真的要卡也卡不住，餐廳本來就走得過去。
       ⚠ 第一次看到它可以數了就記 0 並且**這一次不觸發**（那是起算點，不是第一步）。 */
    if(g.afterMoves!=null){
      const k=g.flag||g.goto||'';
      if(gateMoves[k]==null){ gateMoves[k]=0; continue; }
      if(gateMoves[k] < g.afterMoves) continue;
    }
    /* ⚠⚠ `hourOfDay` 與 `hour` 是**兩種時刻**，不要混用（ver -656 踩過）：
       `firstHourAt(18)` ＝**開局那天**的 18:00（開局是 11:00，所以是第 7 小時）——
       北方泊地是第二天以後的事，那個點早就過了，寫 `hour:18` 等於「立刻成立」，
       安葬一演完就被抓回旅店，中間那段自由探索整個消失（實測就是這樣）。
       這一段要的是「**今天**過了六點」，所以比的是 `hourF()`。 */
    /* ⚠⚠ **「隔日早上八點」要寫成時段 `[8,18]` 不是 `8`**（ver -664 踩過）：
       `hourOfDay:8` 的意思是「今天過了八點」—— 而**當天晚上八點也過了八點**，
       於是那一幕在前一晚就演掉了（實測 20:00 就跳出來）。
       寫成時段之後，只有真的走到隔天早上（睡醒或熬夜走到）才成立。
       ⚠ 迄不含（同營業時間 `hours` 的規約）。 */
    if(g.hourOfDay!=null){
      const h=clock.hourF();
      if(Array.isArray(g.hourOfDay)){ if(h < g.hourOfDay[0] || h >= g.hourOfDay[1]) continue; }
      else if(h < g.hourOfDay) continue;
    }
    return g;
  }
  return null;
}
/* 時鐘一動就問一次：該不該強制轉場。回傳 true ＝已經接手（呼叫端不要再做別的事）。
   ⚠ 由 `enter()` 的收尾與旅店（`host.onClock`）呼叫 —— 那兩處涵蓋了所有會推時鐘的路。 */
function clockGate(){
  const g=stageGate();
  if(!g) return false;
  if(g.flag) prog.addFlags([g.flag]);
  if(g.stage!=null) prog.setStage(g.stage);
  /* ⚠ 時鐘在**演台詞之前**推（ver -656）：那一段路不算時間，而下一格的背景
     要用推完之後的時段挑（`bgFor` 在 `enter()` 裡才問時鐘）。 */
  if(g.clockTo!=null) clock.advanceToNextHour(g.clockTo);
  /* ══⚠⚠ **閘門也開得了／關得掉自由活動**（ver -1360，Ray：「自由活動期間可以約會，
     而第二天就關閉自由活動，完成任務才開」）══ 欄位與 act 那一邊同名同義
     （`modules/town.js` 的 act 收尾，§6.5.4 的 -666）—— 一個狀態一組欄位（鐵律 7/9）：
       · `endStoryExplore:true` ＝開放自由活動（插 `free_explore_<圖>`）
       · `storyExplore:true`    ＝關閉（拔那支旗）
     ⚠ 為什麼閘門也要有：東泊「第二天醒來就關掉」是**時間推動**的，那是閘門不是 act。
     ⚠ 插拔排在演台詞之前：那一段的台詞可能就是在講「該辦正事了」。 */
  if(g.endStoryExplore) prog.addFlags([freeExploreFlag()]);
  if(g.storyExplore)    prog.removeFlags([freeExploreFlag()]);
  /* ══⚠⚠ **`nudge` ＝這幾句只是催你回去**（ver -1360，Ray：「時間到的時候如果人
     已經在旅店，就不用跑『該回去看看了』」）══
     ⚠⚠ **不可以做成通則**：翌日那一道（`ep_day2`）也是 `goto:'inn'`＋`enterAgain`，
       但**它的台詞就是那一幕** —— 人在旅店照樣要演。差別在於這一句是
       「叫你回去」，那一段是「回去之後發生的事」。所以逐閘門明寫。
     ⚠ 旗照記、時鐘照推（上面已經做完）——「這道閘門用掉了」與「那句話講不講」
       是兩件事（鐵律 9：旗只回答一件事）。 */
  /* ⚠⚠⚠ **`nudge` 只吃掉那句話，不可以把整道閘門吃掉**（ver -1370，Ray：「獨自坐坐
       到時間蕾娜也沒回來啊」）：-1360 這一行原本是 `return false` ——
       於是人已經在旅店時，旗記了、時鐘推了，**`enterAgain` 卻沒有發生**，
       那一格的 `acts`（東泊的 `ep_renna_night`，`hourOfDay:20`）就沒有人叫得動。
       ⚠⚠ 這正是「**為了一個新的局部需求去動一個被共用的守門**」那個形狀：
         我要跳過的只有 `g.lines`，卻連轉場一起跳過了（同鐵律 13 那條
         「看到 `if(<新旗標>)` 包住既有的收尾時，先問我真正想跳過的是哪一件」）。
     ⚠ 沒有 `enterAgain` 的閘門照舊 `return false` —— 那一條的原意就是
       「已經站在那裡，讓原本的流程接手」。 */
  if(g.nudge && g.goto===nodeId){
    if(!g.enterAgain) return false;
    forceGo(g.goto);
    return true;
  }
  /* ══⚠⚠⚠ **沒有 `goto` 的閘門 ＝ 原地講一段**（ver -1397，Ray 的古城探索提示：
       「初入探索超過 3 格還沒踩到祭壇，索菈娜會說『這裡太安靜了』…」）══
     閘門那一整套條件（`afterMoves`／`need`／`skipIf`／`fromStage`／`hourOfDay`…）
     本來就在 `stageGate()` 裡，缺的只是「**不轉場**」這一種收尾 ——
     另開一份計步的機制必然與它走鐘（鐵律 8：一個動作一個實作）。
     ⚠ 沒有 `lines` 又沒有 `goto` ＝什麼都不做（照舊 `return false`）。
     ⚠⚠ **收尾要自己把導覽與鎖放回來**：轉場那一條是靠 `forceGo`→`enter()` 收的，
       這一條沒有人接 —— 漏了就是「講完話之後箭頭不見、走不動」，而且沒有錯誤訊息。
     ⚠ 旗與時鐘上面已經處理過了（那是「這道閘門用掉了」，與講不講話是兩件事）。 */
  if(!g.goto){
    if(!(g.lines && g.lines.length)) return false;
    clearTimeout(arriveT); arriveT=0;
    busy=true; showNav(false);
    const play0=g.lines.map((l,i)=> (i===0 && l && l.delay==null)
      ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
    story.playAdhoc(play0, ()=>{ story.clearCast(); busy=false; showNav(true); },
                    { sides:g.sides });
    return true;
  }
  if(g.goto===nodeId && !g.enterAgain) return false;   // 已經站在那裡：讓原本的流程繼續（acts 會接手）
  /* ⚠⚠ **先講一句再轉場**（ver -438，Ray：「讓蕾娜在旅店先講一句『好囉，該出發囉』
     再淡入淡出轉到下一幕」）。台詞在資料上（`TOWNS[].stage1.lines`，鐵律 1）。
     ⚠ 睡醒那一刻**黑幕還蓋著**（旅店的睡覺演出留下來的）—— 要先把畫面亮回來，
       她才有舞台可站；不亮的話那一句是在一片全黑裡講的。
     ⚠ 亮完再放人：立繪滑入 450ms，黑幕還在淡的時候就上場會從黑裡浮出來（§6.5）。
     ⚠ 第一句給 `delay:SLIDE_MS` —— 對話框要等立繪站定（同 `enter()` 的作法）。
     ⚠ 這一支照樣回傳 true：呼叫端只要知道「我接手了」，不必知道中間演了什麼。 */
  if(g.lines && g.lines.length){
    clearTimeout(arriveT); arriveT=0;
    busy=true; showNav(false);
    const lit = story.veilOn();
    if(lit) story.veil(false, CUT_MS);
    const play=g.lines.map((l,i)=> (i===0 && l && l.delay==null)
      ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
    setTimeout(()=>{
      story.playAdhoc(play, ()=>{ story.clearCast(); forceGo(g.goto); }, { sides:g.sides });
    }, lit ? CUT_MS+80 : 0);
    return true;
  }
  forceGo(g.goto);
  return true;
}
/* 強制移轉：不花時間、不看營業時間、不記「來時方向」（玩家不是自己走過去的）。
   ⚠ 走**同一支** `enter()` —— 清場、背景、對白、大廳那一整套收尾只有那一份（鐵律 8）。 */
/* ══ 換景一律走淡入淡出（ver -438，Ray：「所有切景都用淡入淡出轉場」）══════
   ⚠⚠ 走 `story.veil()` —— **唯一那一片黑幕**（ver -430 起，鐵律 8），不要另貼一片。
   ⚠ `enter()` 要在**全黑之下**跑（同 §6.5「場景與場景之間走黑幕」）：
     不然會看到舊畫面殘留一格才換。
   ⚠⚠ **亮回來不在這裡收，交給 `enter()`**：背景是非同步載的（`bgFor`），
     只有它知道新的一景什麼時候擺好。兩邊都收就會有兩段淡入互相打架。
   ⚠ 這一支取代了 `go()` 與 `forceGo()` 各寫一次的 `setTimeout(()=>enter(to),260)`
     —— 那 260ms 本來就是為換場留的空檔，只是當時什麼都沒演。 */
const CUT_MS = 280;       // 淡出／淡入各一段（同一個數字，切景的節奏才一致）
/* ⚠⚠ 劇情轉場的黑幕拉長到三秒（ver -739，Ray：「日間、劇情場景轉換的黑色淡入
   淡出時間長點，三秒」「自主移動不能三秒，只有劇情轉場要三秒」）——
   `forceGo`（強制轉場：傍晚回旅店、安葬、那一夜、翌朝…）走這個；
   玩家自己走一步（`go` → `sceneCut` 不帶 ms）照舊 280ms。 */
const STORY_CUT_MS = 3000;
/* 黑幕最多蓋多久（ver -442）：背景載不到／請求卡住時的保底 —— 見 `enter()` 的 `reveal`。 */
const REVEAL_CAP_MS = 1800;
let enterSeq = 0;         // 第幾次 enter（保底計時器要認得出自己是不是已經過期）
/* 這一次切景的黑幕時長：`sceneCut` 寫、`enter()` 的 reveal 讀（淡出淡入要同長，
   而亮回來的人是 enter —— 見下面那段「亮回來不在這裡收」）。用完歸位 CUT_MS，
   不然 forceGo 之後第一次 `open()` 的亮回會沿用 3 秒（那一條路不經過 sceneCut）。 */
let cutMs = CUT_MS;
function sceneCut(to, ms){ cutMs = ms || CUT_MS;
  story.veil(true, cutMs); setTimeout(()=>enter(to), cutMs); }
function forceGo(to){
  clearTimeout(arriveT); arriveT=0;
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');
  /* ══⚠⚠⚠ **已經黑著進來就不要再暗一次，也不要播腳步聲**（ver -1658，Ray：
     「開場就要是碼頭送行的背景跟音樂，為什麼每次翌日完都是從墓地自動走過去？」）══
     翌日那一段是黑著收尾的（`fadeOut:3000` ＋ 翌日卡）。照原本的流程走，這裡會
     **再演一次三秒的淡出**（玩家看著槍棺慢慢暗下去）、而且**播一聲腳步** ——
     那一聲正是「自動走過去」的聽感，但這一段根本沒有人在走路，是換了一天。
     ⚠ 兩片黑幕都要問（`veilOn` 罩整個舞台／`sceneFadeOn` 只罩演出區）——
       腳本用的是後者，只問前者等於沒問。
     ⚠⚠ **仍然要把 `#storyVeil` 立刻掛上**，不可以直接 `enter()`：
       `enter()` 的第一件事是 `clearStageLeftovers()`，它會把 `#storyFade` 清掉
       ⇒ 新背景還沒載到，舊的那一張會露出來一格（那就是 -442 修過的「多閃一下」）。
       而 `enter()` 判「要不要等背景才亮」問的正是 `story.veilOn()`。
     ⚠ 亮回來照舊是三秒（`cutMs`）—— 這是劇情轉場，節奏要與其他轉場一致（ver -739）。 */
  const preDark = story.veilOn() || story.sceneFadeOn();
  if(!preDark) stepSfx();
  pendingDir=null;
  /* ══ 跨圖的強制轉場（ver -956，Ray：「神殿攻略結束後自動跳轉回索拉娜家，
     三秒淡入規則」）══ `@<地圖>:<節點>`，與出口的語法同一套（見 go()）。
     ⚠ **三秒**（`STORY_CUT_MS`）不是走一步的 `CUT_MS` —— 這是劇情轉場，
       與同圖的 `sceneCut` 同一個節奏（鐵律 7：那個秒數只有一個來源）。
     ⚠ 分工同 `sceneCut`：這裡只負責**淡出**，淡回交給 `open()→enter()`
       （只有它知道新的一景什麼時候擺好，§6.5.4）。
     ⚠ 不走 `go()` 的跨圖分支：那一支會推時鐘、算 `afterMoves`、跑離圖收尾儀式
       —— 那些是「玩家自己走出去」才該做的事。 */
  if(typeof to==='string' && to[0]==='@'){
    const seg=to.slice(1).split(':'), map=seg[0], nd=seg[1]||null;
    if(!TOWNS[map]){ console.info('[town] 跨圖強制轉場：沒有這張圖', map); busy=false; return; }
    gotoMap(map, nd);           // 鐵律 13 第 6 條：換一張探索地圖＝一道讀取頁
    return;
  }
  /* 已經黑著（見上面 `preDark`）：把整舞台的黑幕**瞬間**接上去，直接換景，
     亮回來交給 `enter()`（§6.5.4「淡出與淡入的擁有者是分開的」）。 */
  /* ⚠ 換景仍然**隔一拍**才跑（同 `sceneCut` 的形狀）：這一支是從上一段對白的
     `done` 回呼裡被叫到的，同步再進一次 `enter()` 等於在別人的收尾中間插隊。 */
  if(preDark){ story.veil(true, 0); cutMs = STORY_CUT_MS; setTimeout(()=>enter(to), 0); return; }
  sceneCut(to, STORY_CUT_MS);   // 劇情轉場＝三秒（ver -739）
}

/* ══ 營業時間（ver -391，Ray 指定）══════════════════════════════════════
   節點寫 `hours:[開,關]`（小時，24 制）。**不寫＝全天**（旅店就是這樣）。
   ⚠ 上界**不含**：`[8,24]` ＝ 23:59 還開著、00:00 關 —— 那正是「開到 00 時」的意思。
   ⚠ 跨午夜（`[20,2]`）也要對，所以兩種寫法都判。
   ⚠ 時刻只有一個計算點：`clock.hourF()`（鐵律 7）。 */
function isOpenNow(n){
  /* ══⚠⚠ **城鎮戰期間沒有營業時間**（ver -927，Ray：「北泊圍城戰時教堂竟然打烊了」）══
     §6.5.4.3 那張表早就把「營業時間」列進「城鎮戰中不啟動的探索層」——
     但這一支漏了問 `siegeOn()`（-584 收那一輪時，每一層都補了、只有它沒有）。
     症狀正是 Ray 看到的：圍城戰的 BOSS 就在教堂，走過去卻被「已打烊」擋下來，
     而那一格是**當時唯一還開著的末端**。
     ⚠ 這是「每一層自己問 `siegeOn()`」那條規矩的又一次應驗（鐵律 8）：
       寫在呼叫端一定會漏，而漏掉的那一層不會有任何錯誤訊息。
     ⚠ 修在這裡一次全好：目的地字格的「（已打烊）」、地名後綴、`go()` 的攔截、
       店主與選單、閉門羹那一句 —— 全部問的都是這一支。 */
  if(siegeOn()) return true;
  const t = clock.hourF();
  /* ver -860（Ray：「所有營業場所七點以後不開，除了酒吧跟夏爾村餐廳」）：
     19:00 起打烊——除非節點標 `lateNight:true`（酒吧／夏爾村餐廳）。
     ⚠⚠⚠ **這條只罩「營業場所」＝帶 `hours` 的節點**（ver -863，Ray 連糾兩次：
     「森林也會打烊是怎樣」「城鎮村落也不會全域打烊啊，旅店打烊怎麼辦？」）——
     -861 那一版寫成全域，把旅店、街道、廣場、船塢、墓地、森林全部 19:00 關掉，
     整個晚上無處可去。**沒有 `hours` 的節點沒有門可以關**（街道／旅店／野外），
     一律不打烊；有 `hours` 的店上界被這條 19:00 蓋住（除 lateNight 例外）。
     ⚠ 荒野圖（`wilderness:true`，夏爾森林）整張再免疫一層 —— 日後真有掛 hours
     的野外設施也不吃 19:00 上限，用自己的 hours 管。 */
  const T=TOWNS[townId];
  if(n && n.hours && !n.lateNight && !(T && T.wilderness)){ if(t >= 19) return false; }
  const h = n && n.hours;
  if(!h || h.length<2) return true;
  return (h[1] > h[0]) ? (t >= h[0] && t < h[1]) : (t >= h[0] || t < h[1]);
}

/* ══ 方向手勢層（ver -370，Ray：「箭頭太醜了，改成畫面按住往指定方向滑，
   該方向跳出提示，時間滿後移動」）══
   互動：**按住 → 往某個方向滑 → 那個方向浮出提示與蓄能圈 → 滿了才走**；
   中途放開或轉向就取消。單純點一下（沒有滑）＝路人閒聊（見 bindInput）。
   ⚠ 提示浮在**那個方向的邊上**，不是畫面中央 —— 玩家的手正往那邊去，
     訊息出現在他看的地方才讀得到。
   ⚠ 不再有常駐的箭頭鈕：Ray 說醜，而且四顆鈕壓在背景上本來就搶戲。 */
function ensureLayer(){
  if(layer && layer.parentNode) return layer;
  const st=story.stageEl(); if(!st) return null;
  layer=document.createElement('div'); layer.id='townNav';
  /* 目的地字格：四個方向**只要有目的地就標名**（ver -790，Ray 指定；-387 原本
     下方只給出航標字，現改成一律標——顯示與否的判定在那一支渲染函式，見 `show`）。
     按住字格蓄能滿了才走（Ray 指定）。 */
  layer.innerHTML=['up','left','right','down'].map(d=>
      '<button class="town-dest '+d+'" data-dir="'+d+'" type="button"><span></span></button>').join('')
    + '<div id="townHint"><svg viewBox="0 0 44 44">'
    + '<circle class="ta-rail" cx="22" cy="22" r="19"/>'
    + '<circle class="ta-prog" cx="22" cy="22" r="19"/></svg>'
    + '<span class="th-label"></span></div>'
    + '<div id="townInfo"></div>'
    /* ⚠⚠ **店舖的入口是一顆大鈕，不是一張常駐的單子**（ver -430，Ray：「龍息事件
       仍然被買賣視窗蓋著，把買賣窗變成一個大的按鈕，點下去開全畫面窗」）。
       ver -404 的「左單子右店主」把整張清單一直攤在畫面左邊，於是**任何要指著
       畫面的演出都會被它蓋住**（整備教學指的吊墜就在它底下）——
       而那張單子窄到只看得到一兩列商品，本來就要點標題展開才好用。
       現在：走進店裡＝店主 ＋ 這一顆鈕；點下去開**全畫面**的那張窗（同一份 CSS，
       只是不帶 `dock-left`，鐵律 8）。 */
    + '<button id="townShopBtn" type="button"><b></b><i>點一下開啟</i></button>'
    ;
  /* ⚠⚠ **櫃台鈕沒有了**（ver -404，Ray：「不用點擊，直接右店主左選單」）。
     走進店裡就是店舖畫面：右邊店主立繪、左邊選單，兩樣一起出來（見 shopEnter）。
     ver -387 的那顆 `#townCounter`（連同節點上的 `counter:{x,y}`）整個撤掉 ——
     留著就是第二個入口，其中一個一定會被忘記維護（鐵律 8）。 */
  st.appendChild(layer);
  return layer;
}

/* ══ 櫃台鈕 ══════════════════════════════════════════════════════════
   位置寫在節點的 `counter:{x,y}`，而那組座標是**背景圖上的比例** ——
   要換算成螢幕座標就得知道 `object-fit:cover` 把圖裁掉了多少。
   ⚠ cover ＝ 等比放大到蓋滿框，多出來的部分（左右或上下）**置中裁掉**。
     所以縮放係數是 `max(框寬/圖寬, 框高/圖高)`，偏移是 `(框 − 放大後)/2`。
   ⚠ 圖的原始比例要**問那張圖**（`naturalWidth/Height`），不能假設每張背景都一樣。
     背景是非同步載進來的，所以在 `bgFor` 載到的那一刻記下來（`bgNat`）。
   ⚠ 量不到圖（還沒載完）就先不擺 —— 擺在錯的地方比晚一拍出現糟得多。 */
let bgNat=null;              // 目前背景圖的原始尺寸 [w,h]
/* ⚠⚠ **背景圖上的一點 → 舞台座標，只有這一支**（鐵律 7）：櫃台鈕與旅店的兩顆行動鈕
   都問它。量不到圖（還沒載完）就回 `null`，呼叫端據此決定「先不要擺」。 */
export function bgPoint(fx, fy){
  const st=story.stageEl(), bg=document.getElementById('storyBg');
  if(!st || !bg || !bgNat) return null;
  const br=bg.getBoundingClientRect();
  if(!br.width || !br.height) return null;
  const sr=st.getBoundingClientRect();
  const k=Math.max(br.width/bgNat[0], br.height/bgNat[1]);
  const w=bgNat[0]*k, h=bgNat[1]*k;
  return { x: br.left-sr.left + (br.width-w)/2 + fx*w,
           y: br.top -sr.top  + (br.height-h)/2 + fy*h };
}
/* ══ 店舖畫面（ver -404，Ray：「把各商店的櫃台按鈕改成店主立繪，並讓店主常駐對話框，
   直接右店主左選單」）════════════════════════════════════════════════════
   走進商店／武器店／公會 ＝ **右邊店主立繪（常駐）＋ 常駐招呼語 ＋ 左邊選單**，
   不必按任何東西。走出店門（面盤的箭）才收。
   ⚠⚠ 立繪走 `story.castSolo` —— 與對白**同一把尺**（§6.5：同一張立繪＝同一個結果）。
     店舖不准另算大小或站位；NPC 的 `side` 本來就是 'R'，所以「右店主」是既有規則的
     結果，不是這裡寫死的。
   ⚠⚠ **店主不放常駐對話框**（ver -404，Ray：「店主不用放對話框想要買點什麼嗎？
     騰空間出來給選單」）—— 那一條全寬的框會吃掉 80px，而一張完整的商店單子
     在 390×844 上就要 306px，留著就塞不下。
   ⚠ 上緣的地名／時刻仍要讓開立繪的臉（`body.town-shop`，§6.5 的 -385 同一個理由），
     所以那兩個資訊改印在單子的標題下（`opts.info`）。
   ⚠⚠ **ver -430 改：走進去出現的是一顆大鈕，不是那張單子**（Ray：「把買賣窗變成
     一個大的按鈕，點下去開全畫面窗」）。常駐的窄單子會蓋住畫面左半 —— 任何要指著
     畫面的演出（整備教學指的吊墜）都被壓在底下，而且窄到只看得到一兩列商品。
     現在：`openMenu()` ＝把鈕交還給玩家、`openSheet()` ＝點下去開**全畫面**那張窗
     （同一份 CSS，只是不帶 `dock:'left'`）。
   ⚠ 玩家把窗關掉之後鈕會自己回來（`onClose`），**點畫面任何一處**也能把它叫回來
     （見 bindInput）—— 那是同一支 `openMenu`，不是第二個入口。 */
let shopOn=false;          // 現在是不是站在店裡（狀態，不從畫面反推 —— §6.5 的 -385）
let sheetClose=null;       // 左邊那張單子的收尾（開著才有值）
/* ⚠ 店舖模式的開關**只有這一支**（鐵律 8）：它同時管旗標與 `body.town-shop`
   （上緣的地名／時刻要讓開立繪的臉）。按下「與店主交談」進入真正的對白時要先關掉 ——
   那一段是普通對白，地名本來就會由 `story-talking` 接手讓開。 */
function setShopOn(v){
  shopOn=!!v;
  document.body.classList.toggle('town-shop', shopOn);
}

/* 這一家店的「店主」是誰。⚠ 資料上寫 `keeperWho` 就用它；沒寫就依店的種類給預設 ——
   不要在三個地方各判一次（鐵律 8）。 */
function keeperOf(n){
  if(!n) return null;
  if(n.keeperWho) return n.keeperWho;
  if(n.shop) return 'SHOPKEEP';
  if(n.board) return 'COUNTER';
  if(n.exchange) return 'HUNTER_SV';   // ver -859：獵人兌換表也擺店主立繪
  if(n.kitchen) return 'COOK_SV';      // ver -953：瑪麗亞的廚房
  return null;
}
/* 這個節點現在有沒有店舖畫面：要是店（或已登記的公會），而且**在營業時間內**。 */
function shopReady(n){
  if(siegeOn()) return false;    // 戰鬥地圖不開店（ver -584）
  if(!n || !isOpenNow(n)) return false;
  /* `shopFrom`（ver -866）：這一章之前店還不存在（杰羅 S5 才到夏爾村，
     工坊在那之前是空房）。同 acts 的 fromStage 語意。 */
  if(n.shopFrom!=null && prog.getStage() < n.shopFrom) return false;
  if(n.shop) return true;
  if(n.exchange) return true;   // ver -859：獵人兌換表
  /* 瑪麗亞的廚房（ver -953）：`kitchenFrom` ＝這一章之前廚房還沒開張
     （Ray：「瑪麗亞的廚房開張，stage8 之前無人」）—— 同 `shopFrom` 的語意，
     但**分開一格**：那一格管的是店在不在，這一格管的是廚房開了沒。 */
  /* ⚠ `kitchenFrom` 沒寫就跟著**駐店那個人**的 `from` 走（ver -975，鐵律 7）：
     廚房是那個人開的，章節寫兩次必然走鐘（夏爾村的瑪麗亞就是同一個 8）。 */
  if(n.kitchen){
    const kf = (n.kitchenFrom!=null) ? n.kitchenFrom : (n.host && n.host.from);
    return !(kf!=null && prog.getStage() < kf);
  }
  return !!(n.board && (!n.boardFlag || prog.hasFlag(n.boardFlag)));
}
/* `opts.noMenu`＝只擺店主，**那顆鈕先不出來**（ver -430，Ray：「武器店的裝備教學
   先彈出，裝備完才跳出武器店的選單」）—— 等玩家真的換完裝備才由 `afterArrive` 補上。
   ⚠ 讓開的是**選單**不是整個店舖畫面：店主照舊立刻上場，不然玩家會以為走錯地方。 */
/* ══⚠⚠ 臨時攤（ver -732，Ray：「碼頭劇情登陸後（戰鬥探索）在左右各設臨時的
   雜貨店跟武器店，黑爪戰後恢復城鎮探索後移除」）══════════════════════════
   節點資料寫 `siegeShops:[{side,shop,label}]`（鐵律 1）——「這一格在城鎮戰中
   擺著哪些攤」。**只在 `siegeOn()` 時存在**：黑爪戰後安全區旗一插、城鎮戰一收，
   攤自動消失 —— 「移除」是推出來的，不另立旗標（鐵律 9）。
   ⚠ 判定只有這一支（鐵律 8）：`shopEnter`／`openMenu`／`showStallBtns` 都問它。
   ⚠ 它是 `shopReady()` 那條「戰鬥地圖不開店」的**明寫例外**：一般店照舊不開，
     只有掛了 `siegeShops` 的節點開攤。
   ⚠ 攤只有買賣那張窗（貨帳沿用本店的鑰匙 —— 同一本帳，鐵律 7）：
     店主立繪、交談、射擊挑戰是本店節點的設施，不跟過來。 */
function stallsOf(n){
  const sts = n && n.siegeShops;
  return (sts && sts.length && siegeOn()) ? sts : null;
}
/* 攤的入口鈕：與 `#townShopBtn` **同一套樣式**（style.css 的共用選擇器），
   一攤一顆、照資料的 `side` 落在畫面左右。每次要顯示就重建（冪等）。 */
function showStallBtns(on){
  if(!layer) return;
  layer.querySelectorAll('.town-stall').forEach(b=>b.remove());
  if(!on) return;
  const sts=stallsOf(node()); if(!sts) return;
  for(const st of sts){
    const b=document.createElement('button');
    b.type='button';
    b.className='town-stall'+(st.side==='right' ? ' right' : '');
    b.innerHTML='<b></b><i>點一下開啟</i>';
    b.querySelector('b').textContent = st.label || '';
    /* ⚠ 同 `#townShopBtn`：一定要 stopPropagation —— 舞台上還有「點一下」那一支。 */
    b.addEventListener('pointerup', e=>{ e.stopPropagation(); openStallSheet(st); });
    layer.appendChild(b);
  }
}
/* 點攤 → 開全畫面那張買賣窗。與 `openSheet` 同一份 CSS 與同一個收尾約定：
   開著時鈕收起來、關掉由 `onClose` 把入口交還玩家（`openMenu` 認得攤）。 */
function openStallSheet(st){
  if(sheetClose) return;                       // 已經開著
  showStallBtns(false);
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  sheetClose = showShop(st.shop, null, null, null,
      { info:infoText(node()), onClose:()=>{ sheetClose=null; openMenu(); } });
}
/* ══ 槍棺地圖（ver -867，Ray 的 H 需求）══════════════════════════════════
   「控制介面右下角放『地圖』選項，點開控制面板變成那張地圖，所在地閃爍光點。」
   · 資料在城上的 `map:{img, spots}`（鐵律 1）—— 沒有 map 的城不出這顆鈕。
   · **開圖規則**（Ray）：「村落/城鎮一進去就有全圖；城村以外（遺蹟/野外）要走過
     才開圖」—— 荒野圖（`wilderness`）只亮 `seen_*` 過的節點＋所在地；
     城村整張全亮。⚠ 我的解讀：底圖（手繪羊皮紙）整張照出，**光點與地名**
     走過才標上 —— 一張圖切區塊遮沒法看（要改再跟 Ray 說）。
   · 每個光點標**中文地名**（節點 name 全形空白後那一段；日後翻譯標的）。
   · 點地圖任何一處＝收掉（它是查看用的覆蓋層，不是導航）。
   · 收在 nav 的生命週期裡：對白中鈕跟著 nav 藏、換節點/離城 mapClose（檢查表）。 */
/* ══⚠⚠ 進新地圖的**圖名卡**（ver -879，Ray：「每到一個新的地圖都要全黑半透遮罩，
   稍大粗字顯示地圖名稱（木雅克神殿或夏爾村、夏爾森林），地點下面顯示小一級字的
   年月日時間，點擊消失，只出一次」）══
   · 「一次」＝**每張圖一次**，記在旗標 `mapcard_<圖>` 上（鐵律 9：誰插＝這張卡演過了；
     誰拔＝沒有人。它是一輪內的狀態，`newRun` 清、存讀檔帶 —— 走 progress 的旗標
     就自動吃到這兩件事）。
   · 報的是**地圖名**（`TOWNS[x].name`）不是節點名 —— Ray 舉的三個例子都是圖名。
   · ⚠ 與腳本裡的情境卡（`#storyCard`）是**兩件事**：那一個是「這一拍要報個地點」，
     由腳本逐拍指定、跟著對白走；這一個是「你踏進了一張新地圖」，由 `open()` 發，
     一輩子一次。共用一個元素會讓兩者互相收掉對方。
   · ⚠ 收在 `open()` 這個**進圖的唯一入口**（鐵律 8）：降落、讀檔、跨圖出口、
     章節跳關全部經過它。 */
function mapCardFlag(t){ return 'mapcard_' + (t||townId||''); }
/* 這一趟要不要報圖名 —— 在 `enter()` **之前**決定（`open()` 開頭），
   真正出現與擋路的時機在 `gateArrival`。 */
let mapCardArmed=false, heldArrival=null;
function armMapCard(){
  const T=TOWNS[townId];
  mapCardArmed = !!(T && T.name && !prog.hasFlag(mapCardFlag(townId)));
}
/* ⚠⚠ **抵達演出的閘門**（ver -879，Ray：「點掉之後才會開始對話或其他動作」）：
   卡要出的時候，把「這一次抵達要演什麼」整包扣住，點掉才放行。
   ⚠ 扣的是 `runArrival` 那一整包（進場對白／主線段落／野生遭遇／傍晚提醒全在裡面）
     —— 收在**唯一那個呼叫點**（鐵律 8），不要在每一種演出各判一次。
   ⚠ 沒有卡就直接跑：這一支是常態路徑上的一層，不能讓它變成「有時候不演」。 */
function gateArrival(fn){
  if(!mapCardArmed){ fn(); return; }
  mapCardArmed=false;
  heldArrival=fn;
  if(!showMapCard()){ const f=heldArrival; heldArrival=null; if(f) f(); }   // 卡出不來就別擋路
}
function showMapCard(){
  const T=TOWNS[townId]; if(!T || !T.name) return false;
  prog.addFlags([mapCardFlag(townId)]);      // 出過了就記（點不點掉都算看過）
  /* ⚠⚠ **卡本身走 `story.showTitleCard`**（ver -899）：它與腳本的「翌日」卡是
     同一種東西（大字＋小一級的字、罩在場景區、點畫面任一處收掉、收掉才往下演），
     所以只有那一支實作（鐵律 8）—— -880 光是字級與那兩條細橫線就調過兩輪，
     兩份必然走鐘。這裡只負責**這張卡要印什麼**與**誰在等它收掉**。 */
  return story.showTitleCard(
    { title:townName(), sub:clock.dateText()+'　'+clock.timeText() },
    ()=>{ const f=heldArrival; heldArrival=null; if(f) try{ f(); }catch(_){} });
}

/* ⚠⚠ **「地圖開著嗎」不另存一個布林**（ver -899）：那一層可能被別人收掉
   （換場的 `story.clearStageLeftovers`），布林就會停在 true —— 下一次點鈕
   變成「切換成關」，畫面上什麼都不會發生，而且沒有任何錯誤訊息（鐵律 7）。
   直接問那個元素，只有一份真相。 */
function mapIsOn(){
  const v=document.getElementById('townMapView');
  return !!(v && v.classList.contains('on'));
}
/* ══ 翻頁音（ver -915，Ray：「點小地圖時播 se_ui_pageflip」）══
   ⚠ 掛在**狀態變化**（開／關）上，不掛在「按鈕被按了」上：地圖有兩個關法
     （再按一次鈕、點地圖本身），掛在輸入上就得記得兩個地方都補，而按鈕那一條
     還會與 `mapClose` 疊成兩聲（鐵律 8）。
   ⚠ 走 `story.playSe`（劇情層那張 `SE_FILES`，同一支會帶上 `fileGain`）——
     town 這邊沒有 `asset()`，而 `se_ui_pageflip` 早就登記在那張表裡了，
     不必再抄一份路徑（鐵律 7）。整備頁換卡（weapon.js）用的是同一支音檔。 */
/* ══⚠⚠⚠ **小地圖的縮放與平移**（ver -1449，Ray：「小地圖提供縮放功能，開啟時依
   版面置入畫面，不限於演出區，也可覆於控制區」）══
   ⚠ 「覆於控制區」是 CSS 那一半（`#townMapView` 本來就吃滿整個舞台、壓過楣）；
     這裡管的是**縮放**。
   ⚠⚠ **每次開圖都歸零**（`renderMap` 收尾呼叫 `tmReset`）：Ray 說的是「**開啟時**
     依版面置入畫面」—— 上一次拉到哪裡是上一次的事，帶著走會讓人一開圖就迷路。
   ⚠ 狀態是**這一次攤開**的（模組變數、不進存檔）：同 `eveningHeld` 那一族。 */
/* ⚠ 上限 6×（ver -1451，Ray：「以地圖清楚為優先」）：古城那張是 2400 寬，
   在 390 寬的手機上 contain 之後只有 0.16 倍 —— 要拉到大約 **6 倍**才接近 1:1，
   那才是紙上的圖示與草書真的看得清楚的那一刻。上限給 4 等於看不到那一檔。 */
const TM_ZOOM_MIN = 1, TM_ZOOM_MAX = 6;
let tmZoom = 1, tmPanX = 0, tmPanY = 0;
function tmFrameEl(){
  const v=document.getElementById('townMapView');
  return v ? v.querySelector('.tm-frame') : null;
}
/* ══⚠⚠⚠ **地名不跟著紙一起放大**（ver -1452，Ray：「以地圖清楚為優先」）══
   實測（貝利薩爾、375 寬）：同一列最窄的間距只有 **42px**，而「近衛墓室（休息處）」
   那一條字有 **90px** —— 兩個名字疊在一起，就是 Ray 說的「上字以後糊成一團」。
   ⚠⚠⚠ **而且放大救不了**：字與紙在同一個 `transform` 底下，一起放大 ⇒
     **重疊的比例是常數**，捏到 6 倍也一樣疊。
   ⇒ 兩件事一起做：
     ① 字**反向縮放**（`--tm-inv` ＝ 1/zoom）＝ 螢幕上的字級固定不變 ⇒
        放大時間距真的變寬，字就分開了（一般地圖介面都是這樣）。
     ② 還沒放到分得開之前（`tmNameZoom`），**先把名字藏起來**只留所在地 ——
        那時畫面是「乾淨的圖示地圖 ＋ 你在這裡」，比一團糊字好讀。
   ⚠ `tmNameZoom` 是**量出來的**不是猜的（`tmMeasureNames`，每次攤開量一次）：
     逐列比對相鄰兩個名字的實際寬度與間距。字短的地圖（帝都那種）量出來就是 1，
     於是它們的行為一個字都沒變 —— 這一條只對真的會疊的圖生效。 */
let tmNameZoom = 1;
function tmMeasureNames(){
  tmNameZoom = 1;
  const f=tmFrameEl(); if(!f) return;
  const rows={};
  f.querySelectorAll('.tm-spot').forEach(el=>{
    const sp=el.querySelector('span'); if(!sp || !sp.textContent) return;
    const k=Math.round(el.offsetTop/4);            // 同一列（容 4px 誤差）
    (rows[k]=rows[k]||[]).push({ x:el.offsetLeft, w:sp.offsetWidth });
  });
  for(const k in rows){
    const a=rows[k].sort((p,q)=>p.x-q.x);
    for(let i=1;i<a.length;i++){
      const gap=a[i].x-a[i-1].x; if(gap<=0) continue;
      /* 字是螢幕尺寸（反向縮放）⇒ 放到 z 倍時間距是 gap×z，字寬不變。
         要不疊：gap×z ≥ 兩邊各半 ＋ 8px 的空隙。 */
      const need=((a[i].w+a[i-1].w)/2+8)/gap;
      if(need>tmNameZoom) tmNameZoom=need;
    }
  }
  if(tmNameZoom>6) tmNameZoom=6;                   // 與 TM_ZOOM_MAX 同一個上限
}
function tmApply(){
  const f=tmFrameEl(); if(!f) return;
  f.style.setProperty('--tm-inv', (1/tmZoom).toFixed(4));
  /* ⚠ 留 1% 的餘裕：捏合出來的倍率是浮點數，剛好等於門檻時不要在那裡閃。 */
  f.classList.toggle('tm-names-off', tmZoom < tmNameZoom*0.99);
  /* ⚠⚠ 平移要夾在「放大之後多出來的那一圈」之內 —— 不夾的話紙可以被拖出畫面，
     而那時畫面上什麼都沒有，玩家只會以為壞了（同 §6.5.5 那條「鈕要夾回畫面內」）。 */
  const w=f.offsetWidth*tmZoom, h=f.offsetHeight*tmZoom;
  const mx=Math.max(0,(w-innerWidth)/2), my=Math.max(0,(h-innerHeight)/2);
  tmPanX=Math.max(-mx,Math.min(mx,tmPanX));
  tmPanY=Math.max(-my,Math.min(my,tmPanY));
  f.style.transform='translate('+tmPanX.toFixed(1)+'px,'+tmPanY.toFixed(1)+'px) scale('+tmZoom.toFixed(3)+')';
}
/* 以 `(ax,ay)`（手指／滑鼠那一點）為錨縮放：那一點在紙上的位置縮放前後不變。
   ⚠ 推導（`transform-origin` 在正中 C）：螢幕點 P 對應的紙上點滿足
     `P = C + T + s·(p−C)`；縮到 s′ 要讓 P 不動 ⇒ `T′ = (P−C) − (s′/s)·((P−C) − T)`。
   ⚠ 不給錨點就以畫面中心縮（鈕那一條走這一支）。 */
function tmZoomTo(z, ax, ay){
  const nz=Math.max(TM_ZOOM_MIN,Math.min(TM_ZOOM_MAX,z));
  if(Math.abs(nz-tmZoom)<1e-4) return;
  const cx=innerWidth/2, cy=innerHeight/2;
  const px=(ax==null?cx:ax)-cx, py=(ay==null?cy:ay)-cy, k=nz/tmZoom;
  tmPanX = px - (px - tmPanX)*k;
  tmPanY = py - (py - tmPanY)*k;
  tmZoom = nz; tmApply();
}
function tmReset(){ tmZoom=1; tmPanX=0; tmPanY=0; tmApply(); }
/* ══⚠⚠ **探索率：唯一的計算點**（ver -1464；-1441 的小地圖那一行搬出來）══
   ＝ **這張紙上有墨點、而且走過了的格數 ÷ 有墨點的格數**。
   ⚠ 分母用「有墨點的那幾格」不是 `nodes` 全部：城裡若有節點沒畫進地圖，
     算進去會讓探索率**永遠到不了 100%**，而那一刻霧卻已經撤了（兩個數字互相打臉）。
   ⚠ 現在有兩個人讀它：小地圖上那一行、以及**開圖前的遭遇骰**（`DRAGON_ROLL_K`）。
     日後再多一個也問這一支 —— 不要在呼叫端自己再除一次。
   ⚠ 沒有地圖的城回 1（＝當成走完了）：那時「探索率」這個概念本來就不成立，
     而回 0 會讓遭遇骰永遠擲不中。 */
/* ══⚠⚠⚠ **小地圖可以是好幾張紙**（`map.sheets`，ver -1649，Ray：「一層一張，共三層」）══
   ⚠⚠ **挑哪一張只有這一支在算**（鐵律 7/8）：`renderMap`／`fogShroud`／探索率
     都問它。散在呼叫端各判一次的話，日後多一張就會有人漏掉。
   ⚠ 舊寫法（單張 `img`＋`spots`）**照舊吃得到** —— 其他 12 座城都還是單張，
     這一支把它包成「只有一張的 sheets」，下游一視同仁。 */
function mapSheets(){
  const T=TOWNS[townId], M=T && T.map;
  if(!M) return [];
  if(Array.isArray(M.sheets)) return M.sheets.filter(x=>x && x.img);
  return M.img ? [{ img:M.img, spots:M.spots||{} }] : [];
}
/* 現在該看哪一張：**裝得下你現在那一格**的那一張（由上往下取第一個）。
   ⚠ 找不到（讀檔落在沒有畫進圖的格、或還沒進城）就回第一張 ——
     回 null 的話地圖會變成「這一帶還沒有留下地圖」，那是另一件事的訊息。 */
function mapSheet(){
  const ss=mapSheets(); if(!ss.length) return null;
  for(const sh of ss) if(sh.spots && sh.spots[nodeId]) return sh;
  return ss[0];
}
function exploreRate(){
  const T=TOWNS[townId]; if(!T) return 1;
  /* ⚠⚠ 分母是**所有紙的聯集**不是當下那一張：探索率講的是「這張**圖**我走過幾格」
     （小地圖上那一行、以及開圖前的遭遇骰都讀它）。
     按當下那一張算的話，同一座圖在不同樓層會顯示不同的百分比，而那不是同一個問題。
     ⚠ 霧是另一回事 —— 那**按當下那一張**算（見 renderMap）。 */
  const ids=new Set();
  for(const sh of mapSheets()) for(const id in (sh.spots||{})) if(T.nodes[id]) ids.add(id);
  if(!ids.size) return 1;
  let n=0; ids.forEach(id=>{ if(seenNode(id)) n++; });
  return n / ids.size;
}
function mapFlip(){ try{ story.playSe('se_ui_pageflip'); }catch(_){} }
function mapClose(){
  const v=document.getElementById('townMapView'); if(!v || !v.classList.contains('on')) return;
  v.classList.remove('on');
  if(layer) layer.classList.remove('map-on');   // 導覽字格回來（ver -867，見 renderMap）
  mapFlip();
}
/* ══⚠⚠ 地圖鈕**常駐**（ver -899，Ray：「地圖的 icon 讓他常駐，槍棺在它就在。
   沒地圖就先顯示無資料」）══
   -867 是「這座城沒有 `map` 就整顆不出現」—— 那讓玩家每換一張圖就要重新確認
   「這裡到底有沒有地圖」，而那顆鈕是槍棺面盤上的固定配件，時有時無讀起來是壞了。
   ⚠ 「還沒畫」與「按不到」是兩件事：鈕照舊在、點下去由 `renderMap` 用一句
     「無資料」回答（同 §6.5.5「還不能做不要靠藏起鈕擋」那一條）。 */
/* ⚠⚠⚠ **鈕住在舞台上，不住在導覽層裡**（ver -899，Ray：「對話期間 icon 也要常駐」）：
   `#townNav` 在對白／演出期間整層 `display:none`（`showNav(false)`），鈕跟著不見 ——
   而 Ray 要的是「**槍棺在它就在**」，槍棺在對白期間本來就在。
   ⚠ 掛在 `#storyStage` 上（與地圖那一層同層），`right/bottom` 的落點不變；
     z-8 ＝與退出／跳段鈕同層，壓得過楣（z-6）才點得到。
   ⚠ 收在 `close()`（離城）—— 那是它唯一的終點。 */
function showMapBtn(){
  const host = story.stageEl(); if(!host) return;
  let b=document.getElementById('townMapBtn');
  if(b && b.parentElement!==host){ b.remove(); b=null; }   // 舊版掛在導覽層裡的那一顆
  if(!b){
    b=document.createElement('button');
    b.type='button'; b.id='townMapBtn';
    /* 旅誌 icon（ver -868，Ray：「地圖用 vfx/map 這個 icon」）。 */
    b.innerHTML='<img src="resources/vfx/map.webp" alt="地圖">';
    /* 同槍棺功能鍵：不讓「點畫面」吃到這一下（§story 的 swallowTap 同款理由）。 */
    b.addEventListener('pointerdown', e=>e.stopPropagation());
    b.addEventListener('pointerup', e=>{ e.stopPropagation();
      /* ⚠ 不再播 `menuClick`（ver -915）：那是「按了一顆鈕」的聲音，而這一顆是
         翻開旅誌 —— 音效改掛在開／關那兩支上（見 `mapFlip`）。 */
      try{ SFX.unlock(); }catch(_){}
      if(mapIsOn()) mapClose(); else renderMap();
    });
    host.appendChild(b);
  }
}
/* ══⚠⚠⚠ 同行徽（ver -1348，Ray：「約會狀態的女主頭像放到演出畫面左下角，
   上方顯示『同行』，並給個金框」）══════════════════════════════════════════
   ⚠⚠ **頭像走 `speakers.faceStyle`**（唯一那一支，旅店的四扇門與破防計量表的
     月彎都用它）—— 不要另裁一份：那組 `fx` 是逐張量出來的，抄一份必然走鐘（鐵律 7）。
   ⚠ 住在**舞台**（`story.stageEl()`）不住在導覽層：導覽層在對白期間整層
     `display:none`，而這是**狀態**不是操作 —— 演出中照樣要看得到自己帶著誰。
   ⚠ 顯示的條件是 `datingWho()`（正在約會）不是 `escortWho()`（有人同行）：
     殘留事件帶起來的同行不是約會。
   ⚠ 這一支是**冪等的**：每次 `enter()` 確認一次（同 `showMapBtn`），
     `close()` 是它唯一的終點（§6.5.4 的檢查表：換畫面時誰收它）。 */
function showEscortBadge(){
  const host = story.stageEl(); if(!host) return;
  const who = datingWho();
  let el = document.getElementById('townEscort');
  if(!who){ if(el) el.remove(); return; }
  if(el && el.parentElement!==host){ el.remove(); el=null; }
  if(!el){
    el=document.createElement('div'); el.id='townEscort';
    el.innerHTML='<b>同行</b><span class="te-face"></span><i class="te-name"></i>';
    /* 純狀態顯示，不吃點擊 —— 讓「點畫面推進一句」照樣穿過去（CSS 也寫了
       `pointer-events:none`，這裡不綁任何 listener 就是第二道保險）。 */
    host.appendChild(el);
  }
  if(el.dataset.who!==who){
    el.dataset.who=who;
    el.querySelector('.te-face').style.cssText = faceStyle(who);
    el.querySelector('.te-name').textContent = (SPEAKERS[who]||{}).name || '';
  }
}
/* ══⚠⚠⚠ **劇情叫得動小地圖**（ver -1397，Ray：「安雅會跳出提示『好像……是在那個
   方向』然後開小地圖，蕾娜在地圖上說『那就往那邊去看看吧』」）══
   腳本那一拍寫 `map:true`；`modules/story.js` 只知道「要攤開地圖」，**怎麼攤是
   城鎮的事** —— 所以由 `main.js` 注入這一支（同 `setTownBgm`／`setGateSkip` 那一族；
   story 不 import town，依賴方向不可以反過來）。
   ⚠⚠ **演出模式的地圖不吃點擊**（`.map-story`）：它是**演出**不是互動 ——
     玩家這一刻要做的事是把對白推下去，而地圖本來的點擊是「點一下收掉」。
     不擋的話那一點會被地圖吃掉，對白推不動（而且畫面上沒有任何錯誤訊息）。
   ⚠ 回傳 true ＝真的攤開了；這座城沒有地圖（`renderMap` 走「無資料」那一句）
     就回 false，story 那邊也就不必記得去收它。 */
export function showMapForStory(on){
  if(!on){
    const v=document.getElementById('townMapView');
    if(v) v.classList.remove('map-story');
    mapClose();
    return false;
  }
  /* ══⚠⚠⚠ **追逐：攤開地圖的那一刻，牠站在隔壁**（ver -1421，Ray：「『交給我！』
     以後開小地圖，顯示龍在**當前格的隔壁任一位置**」）══
     ⚠⚠ 為什麼要在這裡做：那一拍（`map:true` ＋ `bl_dragon_seen`）在**段落中間**播，
       而「打完一場就跑一格」是段落**收尾**才做的 —— 不補這一下，紅點會畫在
       玩家自己那一格（牠還沒跑）。
     ⚠ **移過就記一筆**（`dragonJustPlaced`）：段落收尾那一支看到它就不再跑第二次
       —— 一場戰鬥只移動一格（Ray 的規則），不能被這一下變成兩格。 */
  if(dragonChaseOn() && (!dragonNode || dragonNode===nodeId)){
    dragonPlaceNear(nodeId); dragonJustPlaced=true;
  }
  if(!mapIsOn()) renderMap();
  const v=document.getElementById('townMapView');
  if(!v || !v.classList.contains('on')) return false;
  v.classList.add('map-story');
  return true;
}
function renderMap(){
  const T=TOWNS[townId]; const M=T && T.map;
  /* 這張圖還沒有手繪地圖（ver -899）：鈕照樣在，用一句話回答。
     ⚠ 走路人單句那一套（`say`），不是另做一個面板 —— 它就是一句話。
     ⚠ 名字欄空著＝旁白（主角自己的念頭），同旅店「現在不是睡覺的時候。」。 */
  if(!M){ story.flashLine('這一帶還沒有留下地圖。', ''); chatterOn=true; return; }
  /* ══⚠⚠ **這一次要攤開哪一張紙**（ver -1649）══ 一層一張的圖（古墓）由
     `mapSheet()` 挑「裝得下你現在那一格」的那一張；單張的城它回那唯一一張。
     ⚠ 下面**一律讀 `SH`**（`SH.img` / `SH.spots`），不要再讀 `M.img` / `M.spots`
       —— 那兩個在多張的圖上根本不存在（鐵律 7：挑哪一張只有一個計算點）。 */
  const SH=mapSheet();
  if(!SH){ story.flashLine('這一帶還沒有留下地圖。', ''); chatterOn=true; return; }
  const st=story.stageEl(); if(!st) return;
  let v=document.getElementById('townMapView');
  if(!v){
    v=document.createElement('div'); v.id='townMapView';
    /* ══⚠⚠ **手勢：一指拖曳平移／兩指捏合縮放／單擊收掉**（ver -1449）══
       ⚠⚠⚠ 「點一下就收掉」與「拖曳／捏合」共用同一層 ⇒ **收掉的條件要收窄成
         「真的只是點了一下」**：沒有位移（≤10px）、而且這一輪沒有捏過。
         不收窄的話每一次拖曳結束都會把地圖關掉，縮放等於不能用。
       ⚠ 位移量算**從按下那一點起的總位移**，不是逐次的 delta —— 慢慢拖的話
         每一次 delta 都很小，用 delta 判會永遠判成「沒動」。
       ⚠ `setPointerCapture`：手指滑出這一層時 move/up 還要收得到，
         不然拖到一半放開會變成「永遠沒有 pointerup」＝ 下一次點擊被當成拖曳。 */
    { const pts=new Map();
      let sx=0, sy=0, moved=false, pinched=false, pinch0=0, zoom0=1;
      const two=()=>{ const a=[...pts.values()]; return a.length>=2 ? a : null; };
      const dist=a=>Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
      const mid =a=>({ x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2 });
      v.addEventListener('pointerdown', e=>{
        e.stopPropagation();
        pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pts.size===1){ sx=e.clientX; sy=e.clientY; moved=false; pinched=false; }
        const a=two();
        if(a){ pinched=true; moved=true; pinch0=dist(a)||1; zoom0=tmZoom; }
        try{ v.setPointerCapture(e.pointerId); }catch(_){}
      });
      v.addEventListener('pointermove', e=>{
        const p=pts.get(e.pointerId); if(!p) return;
        const dx=e.clientX-p.x, dy=e.clientY-p.y;
        pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
        const a=two();
        if(a){ const m=mid(a); tmZoomTo(zoom0*(dist(a)/pinch0), m.x, m.y); return; }
        if(Math.hypot(e.clientX-sx, e.clientY-sy) > 10) moved=true;
        if(tmZoom>1){ tmPanX+=dx; tmPanY+=dy; tmApply(); }
      });
      const end=e=>{
        e.stopPropagation();
        pts.delete(e.pointerId);
        try{ v.releasePointerCapture(e.pointerId); }catch(_){}
        if(pts.size){ pinch0=dist(two()||[{x:0,y:0},{x:0,y:0}])||1; zoom0=tmZoom; return; }
        if(!moved && !pinched) mapClose();
        moved=false; pinched=false;
      };
      v.addEventListener('pointerup', end);
      v.addEventListener('pointercancel', e=>{ pts.delete(e.pointerId); moved=false; pinched=false; });
      /* 滑鼠滾輪縮放（桌機沒有捏合）。⚠ `passive:false` 才擋得掉頁面捲動。 */
      v.addEventListener('wheel', e=>{
        e.preventDefault();
        tmZoomTo(tmZoom*(e.deltaY<0 ? 1.15 : 1/1.15), e.clientX, e.clientY);
      }, { passive:false });
    }
    st.appendChild(v);
  }
  /* ══ 迷霧 `mist`（ver -877；-913 改預設與畫法）══
     Ray（-913）：「小地圖沒走到的地方用迷霧遮住，在控制面板上也顯示『？？？』。
       除非 mist=0，否則預設都是如此。大城市 mist 都是 0。」
     ⚠⚠ **預設是「有迷霧」**（-877 是「荒野才有」）：新開一張圖不寫就是走過才亮，
       這樣忘了寫的下場是「多遮一點」而不是「整張圖直接攤開」（安全的那一邊）。
       大城市在資料上明寫 `mist:0`。
     ⚠⚠ 沒走到的**不是不畫，是蓋一團霧**（-913 改）：整格不畫的話玩家讀到的是
       「那裡沒有東西」，蓋霧才讀得出「那裡有東西、我還沒去」。 */
  const ids=Object.keys(SH.spots||{}).filter(id=>T.nodes[id]);
  /* ══⚠⚠ **全部踩過了就把霧整片撤掉**（ver -1393，Ray：「所有點都踩到以後就可以
       把圖霧撤了」）══
     一格一格化開之後，最後會剩下**節點之間那些沒有人蓋到的紙面**還黑著 ——
     那時圖上已經沒有秘密了，留著那幾塊只是髒。
     ⚠ 數的是**圖上有墨點的那幾格**（`ids`）：城裡若有節點沒畫進地圖，它本來就
       不會出現在這張紙上，拿它當條件會讓霧永遠撤不掉。
     ⚠⚠ 收成**一個旗標**（鐵律 7）：這一支同時管「畫不畫整片霧」與「沒走過的格子
       畫不畫點與名字」—— 全部踩過時後者本來就不成立，兩者不會打架。 */
  /* ══ 探索率（ver -1441，Ray：「小地圖顯示地圖探索率」）══
     ⚠⚠ 分母是**這張紙上有墨點的那幾格**（`ids`），與下面「全部踩過就撤霧」用的是
       **同一個數**（鐵律 7：算一次，兩個人讀）—— 城裡若有節點沒畫進地圖，它本來
       就不會出現在這張紙上，算進分母會讓探索率**永遠到不了 100%**，
       而那一刻霧卻已經撤了，兩個數字互相打臉。
     ⚠ 沒有霧的圖（`mist:0` 的大城）照樣顯示：探索率講的是「我走過幾格」，
       與「看不看得到」是兩件事。 */
  const seenN = ids.filter(seenNode).length;
  const pct   = Math.round(exploreRate()*100);
  const fog = fogOn() && seenN < ids.length;
  v.innerHTML='<div class="tm-frame">'
    + '<img class="tm-img" src="'+SH.img+'" alt="">'
    + (fog ? fogShroud(SH, ids) : '')
    + ids.map(id=>{
        const p=SH.spots[id];
        const pos='left:'+(p[0]*100).toFixed(1)+'%;top:'+(p[1]*100).toFixed(1)+'%';
        /* ══⚠⚠⚠ **王座徘徊者的紅點**（ver -1390，Ray：「要有一個發光的紅點」）══
           只有**第四戰之後**才亮（Ray：「四戰前就是瞎找」）—— 那一刻牠已經被逼進
           王座廳那個死胡同。
           ⚠ 牠在哪一格問 `dragonAtNode()` 那一支（鐵律 7：紅點與「走到那一格就開打」
             問的是同一個答案，不要在這裡自己再判一次戰數）。
           ⚠⚠ **它要浮在霧上面**：貝利薩爾沒寫 `mist:0` ＝有霧，而王座廳玩家多半
             還沒走到過 —— 沉在霧底下的話那顆紅點**永遠不會亮**，而這顆點的整個用途
             就是告訴玩家「牠在那裡」。所以那一格的霧不化開，紅點疊上去（CSS z-3）。
           ⚠ 疊上去的那一顆**不給地名**：霧照樣蓋著那一格的速寫與草書名 ——
             玩家看得到「牠在這個方向」，但那一帶長什麼樣還是要自己走。 */
        const dragon = (id===dragonAtNode());
        /* 被指出來的那一格（`mapHint`）：**與紅點同一套做法** —— 浮在霧上、不給地名。 */
        const hint = (id===hintNode());
        /* 沒走到＝那一格還在霧底下：**什麼都不畫**（霧是整片的一層，見 `fogShroud`）。
           ⚠ 只有紅點例外 —— 它要浮上來。 */
        if(fog && !seenNode(id)){
          if(dragon) return '<i class="tm-spot dragon" style="'+pos+'"><b></b><span></span></i>';
          if(hint)   return '<i class="tm-spot hint" style="'+pos+'"><b></b><span></span></i>';
          return '';
        }
        /* ══ 休息處（ver -913，Ray：「探索到以後用筆圈起來，並在中文後方加入
           『（休息處）』」）══ 圈是 CSS 畫的（`.tm-spot.rest`），字在這裡加。
           ⚠ 這一行**只有小地圖在用**：導覽字格那邊是另一支（`nameOfNode`）。 */
        const rest=!!(T.nodes[id]||{}).rest;
        /* ⚠ 被指出來但還沒走到的那一格**不給地名**（Ray 指定）——
             沒有霧的圖（`mist:0`）走這一條，所以名字要在這裡擋，不能只靠上面那一段。 */
        const nm=(hint && !seenNode(id)) ? ''
               : String((T.nodes[id]||{}).name||'').split('　').pop() + (rest?'（休息處）':'');
        return '<i class="tm-spot'+(id===nodeId?' here':'')+(rest?' rest':'')
             + (dragon?' dragon':'')+(hint&&!seenNode(id)?' hint':'')
             + '" style="'+pos+'">'
             + '<b></b><span>'+nm+'</span></i>';
      }).join('')
    + '</div>'
    /* ⚠ 探索率擺在 `.tm-frame` **外面**（同 `.tm-save` 那一條的理由）：框裡的尺寸
       都是「地圖的百分比」，字塞進去會跟著圖縮放，小螢幕上讀不出來。 */
    + '<div class="tm-pct">探索率<b>'+pct+'%</b><i>'+seenN+' ／ '+ids.length+' 處</i></div>'
    /* 縮放鈕（ver -1449）：手機主要走兩指捏合，這三顆是給滑鼠與不捏合的人用的。
       ⚠ 演出模式（`.map-story`）整層不吃點擊，所以它們那時自然是死的 —— 那是對的。 */
    + '<div class="tm-zoom">'
      + '<button class="tm-zb" type="button" data-z="out">－</button>'
      + '<button class="tm-zb" type="button" data-z="fit">⤢</button>'
      + '<button class="tm-zb" type="button" data-z="in">＋</button>'
      + '</div>'
    /* ══ 模擬存檔那一列（ver -936；管理人限定，見 setSimSave）══
       ⚠ 擺在 `.tm-frame` **外面**：框裡是那張羊皮紙，尺寸與座標都是「地圖的百分比」
         （同 `.tm-shroud` 那一條的理由）—— 鈕塞進去會跟著圖縮放，小螢幕上按不到。 */
    /* （ver -937：`body.testmode` 的守門已拿掉，見 setSimSave） */
    + (simIO
        ? '<div class="tm-save">'
          + '<button class="tm-sv" type="button" data-a="save">存　檔</button>'
          + '<button class="tm-sv" type="button" data-a="load">讀　檔</button>'
          + '<i>'+ (()=>{ const r=simIO.info&&simIO.info();
                          return r ? String(r.label||'').replace(/</g,'&lt;') : '（空）'; })() +'</i>'
          + '</div>'
        : '');
  /* ⚠⚠ 綁在 `pointerup` 並 `stopPropagation`：這一層自己有一條
     「點任何地方就收掉地圖」的 pointerup（見上面 `v` 的建立）——
     不擋的話按存檔會順手把地圖關掉，而且是**先關再存**，看不出到底存了沒。
     ⚠ 存完才收地圖：那一下收掉是回饋（「做完了」），toast 由 save.js 自己浮。 */
  v.querySelectorAll('.tm-sv').forEach(b=>{
    b.addEventListener('pointerdown', e=>e.stopPropagation());
    b.addEventListener('pointerup', e=>{
      e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){}
      if(b.dataset.a==='save'){ if(simIO.save) simIO.save(); mapClose(); }
      else { mapClose(); if(simIO.load) simIO.load(); }   // 讀檔會換場：先收地圖
    });
  });
  /* 縮放鈕：與存檔那一列同一套寫法（`stopPropagation` 擋掉「點一下收地圖」）。 */
  v.querySelectorAll('.tm-zb').forEach(b=>{
    b.addEventListener('pointerdown', e=>e.stopPropagation());
    b.addEventListener('pointerup', e=>{
      e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){}
      const a=b.dataset.z;
      if(a==='in')       tmZoomTo(tmZoom*1.5);
      else if(a==='out') tmZoomTo(tmZoom/1.5);
      else               tmReset();
    });
  });
  /* ══⚠⚠⚠ **長寬比只有一份真相：那張圖自己**（ver -1450 立、-1451 拿掉 CSS 那份）══
     古城的小地圖由 1536×1024（**橫**）換成 2400×2600（**直**），而 `.tm-frame` 的
     `aspect-ratio` 以前是 CSS 裡寫死的 —— 寫死的那一份一換方向就開始說謊，
     而且**畫面上只是「點跟圖對不上」**，看不出原因（鐵律 7）。
     Ray（-1451）：「長寬比不用寫死」⇒ **CSS 那一行已經刪掉，不要加回來**。
     ⚠ 圖還沒載完就等 `load`（快取命中走 `complete`），載完再 `tmApply` 重夾一次平移。
     ⚠⚠ **載不到就不要硬撐版面**：沒有比例的話框會塌成 0 高 —— 那時收掉地圖、
       回那一句「這一帶還沒有留下地圖。」（＝這座城沒有地圖時的**同一句話**，鐵律 8）。
       看得出來的缺件，好過一個歪掉的版面。 */
  { const f=v.querySelector('.tm-frame'), im=v.querySelector('.tm-img');
    const fit=()=>{ if(f && im && im.naturalWidth){
                      f.style.aspectRatio = im.naturalWidth+' / '+im.naturalHeight; }
                    /* ⚠ 量字**要在比例定了之後**：框的寬高還沒定，`offsetLeft` 全是 0，
                       量出來的間距會是 0 ⇒ 需要的倍率變成無限大（名字永遠不出現）。 */
                    tmMeasureNames(); tmApply(); };
    const gone=()=>{ console.info('[town] 小地圖載不到：', SH.img);
                     mapClose(); story.flashLine('這一帶還沒有留下地圖。', ''); chatterOn=true; };
    if(im){ if(im.complete && im.naturalWidth) fit();
            else { im.addEventListener('load', fit, { once:true });
                   im.addEventListener('error', gone, { once:true }); } } }
  v.classList.add('on');
  /* ⚠⚠ **開啟時依版面置入畫面**（Ray）＝每次攤開都歸零，不繼承上一次拉到哪裡。
     ⚠ 要在 `.on` **之後**：`display:none` 的元素量到的 `offsetWidth` 是 0，
       `tmApply` 的夾就會把平移夾成 0（這一次是無害，但那是碰巧）。 */
  tmReset();
  mapFlip();                        // 翻開旅誌（ver -915）
  /* 地圖開著＝導覽字格收掉（ver -867，Ray：「不用導覽字格」）——
     那幾片目的地字格會壓在羊皮紙上；看地圖的時候不需要它們。 */
  if(layer) layer.classList.add('map-on');
}

function shopEnter(opts){
  const n=node();
  /* 臨時攤（ver -732）：只擺攤鈕 —— 沒有店主立繪（那是本店的畫面），
     也不進店舖模式（`setShopOn`）：沒有臉要讓，地名照舊。 */
  const sts=stallsOf(n);
  if(sts){ if(!(opts && opts.noMenu)) showStallBtns(true); return; }
  /* ══ 駐店的人（`host`，ver -875，Ray：「夏爾村餐廳早上6點到晚上6點有人，
     圖用cook，名字瑪麗亞」）══ 不是店（沒有單子、沒有鈕），只是**那個時段有人
     站在那裡**：時段內擺立繪（castSolo，同店主那一套＝同一把尺），時段外空場。
     ⚠ 開放空間不掛 `hours`（掛了會被打烊擋在門外——Ray：「只會沒人，不會無法
       進入」），時段寫在 host 自己身上。收場走既有的 shopClose/clearCast。 */
  if(!shopReady(n)){
    const h=n.host;
    /* `from`（ver -975，Ray：「夏爾村在 stage8 之前不應該出現瑪麗亞」）＝
       這一章之前**這個人根本不在**。同 `shopFrom`／`fromStage` 的語意。
       ⚠ 它與 `hours` 是兩件事：`hours` 是「今天幾點在」，`from` 是「哪一章起才有這個人」。 */
    if(h && h.from!=null && prog.getStage() < h.from) return;
    if(h && h.who){
      const t=clock.hourF();
      const inHrs = !h.hours || (h.hours[1]>h.hours[0]
        ? (t>=h.hours[0] && t<h.hours[1]) : (t>=h.hours[0] || t<h.hours[1]));
      if(inHrs){ setShopOn(true); story.castSolo(h.who); }
    }
    return;
  }
  setShopOn(true);
  const who=keeperOf(n);
  if(who) story.castSolo(who);
  if(!(opts && opts.noMenu)) openMenu();
}
/* 收店舖畫面。⚠ 立繪與對話框交給 `story.clearCast()`（唯一的收尾，鐵律 8）——
   這裡只負責把鈕與單子收掉、把狀態歸零。 */
function shopClose(){
  setShopOn(false);
  showShopBtn(false);
  showStallBtns(false);      // 臨時攤的鈕也收（ver -732，同一張檢查表的第六件）
  if(sheetClose){ try{ sheetClose(); }catch(_){} sheetClose=null; }
}
/* ══ 店舖的入口鈕（ver -430）══════════════════════════════════════════
   ⚠⚠ 走進店裡出現的是**這一顆**，不是那張單子（Ray：「把買賣窗變成一個大的按鈕，
     點下去開全畫面窗」）。理由見 `ensureLayer` 那一段：常駐的單子會蓋住任何
     要指著畫面的演出（整備教學指的吊墜就在它底下）。
   ⚠⚠ **鈕上寫店名**（ver -439，Ray：「把各店舖的『買賣』按鈕改成店名」）——
     -430 那一版寫的是「這一家店在做什麼」（買　賣），理由是店名已經在上緣那一行；
     但玩家走進店裡看到的第一個東西是這顆鈕，而上緣那一行在店舖模式下是**讓開臉**
     的（`body.town-shop`）—— 於是三家店走進去長得一模一樣，都寫著「買　賣」。
     寫店名才認得出自己站在哪。
   ⚠ 公會的懸賞榜**不改**：那顆鈕開的不是買賣而是榜單，寫「懸賞榜」才對得上它做的事。
   ⚠ 節點名是「帝都　武器店」（城名＋店名，全形空格分隔）—— 鈕上只要**後面那一段**：
     玩家知道自己在哪座城，鈕上再寫一次只是把字擠小。分隔符與 `TOWNS[].nodes[].name`
     同源，所以取最後一段就好，不必在這裡另存一份店名（鐵律 7）。 */
function shopBtnName(n){
  const s=String(nameOf(nodeId) || (n && n.name) || '');
  const parts=s.split('　').filter(Boolean);
  return parts.length ? parts[parts.length-1] : s;
}
/* ══ 劇情那一拍要開的菜單（ver -956，Ray：「料理情節是要開菜單畫面讓玩家點選」）══
   ⚠ 與店舖那條路走**同一支** `showKitchen`（鐵律 8），差別只有兩個：
     · `mustCook` ＝挑一道煮了才過（那是劇情的閘門，不是逛街）
     · 演出交還給呼叫端（story）—— 它要等演完才推下一句
   ⚠ 導覽先收起來：菜單開著時不該還能走路。 */
/* 這座城的出港位（ver -956）。⚠ 劇情的 `goFlight` 那一拍也要用它 —— 不然從
   夏爾村走劇情出航一樣會在帝都起飛（那條路以前根本沒傳）。 */
/* 出航時交給飛行頁的「從哪一座城起飛」（ver -1105，Ray：「要在城正上方升空，
   所有地圖都一樣」）。⚠ **只傳鑰匙不傳座標**：城在地圖上的位置只有飛行頁的
   `SETTLEMENTS` 那一份（鐵律 7）—— -565 的逐城 `sailFrom` 已刪。 */
export function sailFrom(){ return townId ? { town:townId } : null; }
/* ══⚠⚠⚠ **一道都煮不出來就不要開選單**（ver -1659，Ray：「如果身上沒有相應的
   食材，就不觸發選擇畫面…」）══ 回傳 **false** ＝「我沒開」，劇情那一拍據此
   跳到 `noMats` 那一段（見 `story.js` 的 `line.kitchen`）。
   ⚠ 判定問 `loot.canCookAny()`（唯一那一支，鐵律 7）—— `usual`（跟平常一樣的）
     是 `hidden` 的，不算在內，不然這一支永遠回 true。
   ⚠ 不開的時候**什麼都不要動**：導覽與店門鈕留給那一段對白自己收
     （開了才 `showNav(false)`）。 */
export function openKitchenForStory(onCook){
  const n=node();
  if(!canCookAny()) return false;
  showNav(false); showShopBtn(false);
  sheetClose = showKitchen({ info:infoText(n), mustCook:true,
    onClose:()=>{ sheetClose=null; },
    onCook:(id, first, gain)=>{ sheetClose=null; if(onCook) onCook(id, first, gain); } });
  return true;
}
function showShopBtn(on){
  const b=layer && layer.querySelector('#townShopBtn'); if(!b) return;
  const n=node();
  if(on && n){
    b.querySelector('b').textContent = n.shop ? (shopBtnName(n) || '買　賣')
                                      : n.exchange ? '兌　換'
                                      : n.kitchen  ? '料　理'      // ver -953
                                      : '懸賞榜';
  }
  b.classList.toggle('on', !!on);
}
/* 這一格的「選單」＝把那顆鈕擺出來。⚠ 名字沿用 `openMenu` —— 呼叫端（`afterArrive`、
   整備教學的回呼、談完話回到店裡）要的是同一件事：「把這家店的入口交還給玩家」。 */
function openMenu(){
  const n=node();
  if(stallsOf(n)){ showStallBtns(true); return; }   // 臨時攤（ver -732）：同一個入口
  if(!shopReady(n)) return;
  showShopBtn(true);
}
/* ⚠⚠ **真正的那張窗：全畫面**（ver -430）。與 dock-left 是**同一份 CSS**，
   差別只是不帶 `dock:'left'`（鐵律 8：不要為了全螢幕再寫一套版面）。
   ⚠ 開著的時候把鈕收起來：它在窗底下，點不到也不該看得到。 */
function openSheet(){
  const n=node(); if(!shopReady(n)) return;
  if(sheetClose) return;                       // 已經開著
  showShopBtn(false);
  if(n.shop){ openShop(); return; }
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  if(n.exchange){
    sheetClose = showExchange({ info:infoText(n),
                                onClose:()=>{ sheetClose=null; openMenu(); } });
    return;
  }
  /* ══ 瑪麗亞的廚房（ver -953）══
     ⚠ 「煮」按下去：單子自己收掉 → 這裡接手演出（`story.playCooking`，唯一那一支）
       → 演完把導覽與店門的鈕擺回來。**演出期間不要開回單子**（它會壓在演出上面），
       所以先 `showNav(false)`。
     ⚠ `showKitchen` 在呼叫 `onCook` 之前已經 `close()` 過 —— 它的 `onClose` 也會跑，
       那一支會把鈕擺回來；演出跑完再擺一次是冪等的（`openMenu` 已開就 return）。 */
  if(n.kitchen){
    sheetClose = showKitchen({ info:infoText(n),
                               onClose:()=>{ sheetClose=null; openMenu(); },
                               onCook:(id, first, gain)=>{
                                 showNav(false);
                                 const back=()=>{ showNav(true); openMenu(); };
                                 /* 第一次煮成才報加成的大字（見 story.showBoon 的說明：
                                    大字永遠是另一次呼叫，不藏在演出裡）。 */
                                 /* ⚠ 大字報**真的加了多少**（`gain`，ver -1659），不是那一道的
                                    `boon.hpMax` —— 第一餐會多一份（config.cooking.firstMeal）。 */
                                 story.playCooking(id, {}, ()=> (gain>0) ? story.showBoon(gain, back) : back());
                               } });
    return;
  }
  sheetClose = showBounty(n.board, { info:infoText(n),
                                     onClose:()=>{ sheetClose=null; openMenu(); } });
}
/* 單子標題下那一行：地名＋時刻（＋打烊）。⚠ 與上緣的 `#townInfo` 是**同一組字**，
   所以由同一支算（鐵律 7）—— 那一行在店裡被招呼語讓開了，資訊要在這裡找得到。 */
function infoText(n){
  return (n ? nameOf(nodeId) : '') + '　' + clock.timeText() + (isOpenNow(n) ? '' : '　已打烊');
}

/* ══⚠⚠⚠ 背景上的鐘（ver -1249，Ray：「如果要讓時鐘的分針時針隨遊戲時間變動
     會很麻煩嗎？」「做得到就做，不然背景的時間跟遊戲時間永遠對不上，對我來說那算 bug」）══
   節點寫 `clock:{x,y,r}` —— 圖上的**比例**座標（`x`/`y` 同 `bgPoint`；
   `r` 是盤面半徑，單位是**圖寬**）。可選：`face`／`hand`（顏色）。

   ── 為什麼不用重畫背景 ──────────────────────────────────────────
   畫上去的那兩根指針**用程式蓋掉**就好：那面盤是平的 —— 實測 `Varn_Station.webp`
   半徑 12~46 的盤面是 **(142,141,146)，標準差只有 1.9~3.4** ⇒ 填一塊同色的圓
   看不出接縫。半徑 `r`(50px) 只切掉刻度最內側 1~2 個**原圖**像素，
   在 390 寬的手機上是 0.03 px。**不必動美術、不必跳 `ASSET_VER`。**

   ── 為什麼是疊一層 SVG，而不是畫在背景上 ────────────────────────
   `#storyBg` 是 `<img>`，畫不上去。所以另開 `#townClock`，
   **外框、z-index、filter、transform 全部照它**（見 style.css 那兩條，改一邊要改另一邊）：
   城鎮背景有 `scale(1.01)`，而 `bgPoint` **不含**那個 scale ——
   兩層同框同 transform，縮放才會一起走，指針不會偏（錶盤離圖心 342px，
   1% 就是 3.4 個原圖像素）。

   ⚠ 時間只讀 `clock.hourF()`（鐵律 7），不自己算。
   ⚠⚠ **不轉動、只在進場抓一次**（Ray 指定）：遊戲時間本來就是跳的
     （走一步 10 分鐘、進城／戰鬥各一小時），逐幀轉針是白花的成本。
     掛在 `refreshArrows()` ＝ 「誰更新上緣那一行時刻，誰順便擺指針」（鐵律 8）。
   ⚠ 背景還沒載完時 `bgPoint` 回 null ⇒ **先不要畫**（擺在錯的地方比晚一拍糟）。
   ⚠ 誰收它：`close()` 移除；換到沒有鐘的節點時 `refreshArrows` 自己把它藏起來。 */
let clockEl=null;
/* ══⚠⚠⚠ 面盤與指針的顏色 —— **量圖，不寫在資料裡**（ver -1541）══════════════
   Ray：「瓦恩霍姆的火車站圖有改，時鐘的位置角度要修正」

   ver -1249 那一版把顏色寫成資料上的兩個字串（`face`／`hand`，預設灰 142,141,146）。
   **那是一份會過期的真相**，而且是**四份**：`Varn_Station` 有 dawn／day／dusk／night
   四張差分，同一面錶盤在四個時段的顏色差很多（實測面盤：
   day (187,178,175)／dawn (170,158,156)／**dusk (156,123,111)**／night (168,145,130)）——
   一個字串一定有三個時段是錯的，而畫面上只會是「錶盤上糊了一塊顏色不對的補丁」。

   ⇒ **改成量現在畫面上那一張**：`#storyBg` 是同源的，canvas 讀得到（同 `tone.js`
     量平均亮度那一套）。只畫**錶盤那一小塊**（約 90×90）進 canvas，不是整張 1536×1024。
   · 面盤 ＝ 亮度排序中段偏亮的那一段（55%~85%）—— 暗的是羅馬數字與指針，
     最亮的可能是高光，兩頭都要避開。
   · 指針 ＝ 最暗的 4%。
   ⚠ 換一張圖（換時段／換城／同名覆蓋帶 `?v=`）就重量一次：快取的鑰匙是 `src`。
   ⚠ 量不到（canvas 被污染、圖還沒載完）就退回資料上的 `face`／`hand`，不會整段掛掉。 */
let clockPal={ src:null, face:null, hand:null };
function clockPalette(C){
  const bg=document.getElementById('storyBg');
  const src=bg && bg.getAttribute && bg.getAttribute('src');
  if(!src || !bgNat || !bg.complete) return null;
  if(clockPal.src===src) return clockPal.face ? clockPal : null;
  clockPal={ src, face:null, hand:null };
  try{
    const NW=bgNat[0], NH=bgNat[1], R=C.r*NW;
    const S=Math.max(8, Math.round(R*2)+4);
    const cv=document.createElement('canvas'); cv.width=cv.height=S;
    const g=cv.getContext('2d',{ willReadFrequently:true });
    g.drawImage(bg, Math.round(C.x*NW-S/2), Math.round(C.y*NH-S/2), S, S, 0, 0, S, S);
    const d=g.getImageData(0,0,S,S).data, lim=(R*0.9)*(R*0.9), list=[];
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){
      const dx=x-S/2, dy=y-S/2; if(dx*dx+dy*dy>lim) continue;
      const i=(y*S+x)*4; list.push([d[i],d[i+1],d[i+2],d[i]+d[i+1]+d[i+2]]);
    }
    if(list.length<40) return null;
    list.sort((a,b)=>a[3]-b[3]);
    const band=(lo,hi)=>{ let r=0,gg=0,b=0,n=0;
      for(let i=Math.floor(list.length*lo), e=Math.max(i+1, Math.floor(list.length*hi)); i<e && i<list.length; i++){
        r+=list[i][0]; gg+=list[i][1]; b+=list[i][2]; n++; }
      return n ? (r/n|0)+','+(gg/n|0)+','+(b/n|0) : null; };
    clockPal.face=band(0.55,0.85);
    clockPal.hand=band(0,0.04);
  }catch(e){ return null; }          // 跨網域污染／還沒解碼 —— 退回資料上的顏色
  return clockPal.face ? clockPal : null;
}
function syncBgClock(){
  const st=story.stageEl(); if(!st) return;
  if(clockEl && !clockEl.isConnected) clockEl=null;      // 舞台被整層收掉過
  const hide=()=>{ if(clockEl) clockEl.classList.remove('on'); };
  const n=node(), C=n && n.clock;
  if(!C) return hide();
  const c=bgPoint(C.x, C.y), a=bgPoint(0,0), b=bgPoint(1,0);
  if(!c || !a || !b) return hide();                      // 圖還沒載完
  const R=(b.x-a.x)*C.r;
  if(!(R>1.2)) return hide();                            // 小到讀不出來就別畫（同 §6.8.1）
  const t=clock.hourF();
  const degM=(t%1)*360, degH=((t%12)/12)*360;            // 12 點起算、順時針
  const tip=(len,deg)=>{ const k=deg*Math.PI/180;
    return [c.x+len*Math.sin(k), c.y-len*Math.cos(k)]; };
  /* ⚠⚠ 指針長度是**那一張錶盤的性質**，不是全域常數（ver -1541）：新的火車站圖
     畫上去的兩根都只到 0.80R，沿用舊的 1.06R 會讓分針戳出盤面、壓在外圈的石框上。
     沒寫＝舊值（0.78／1.06），既有的節點行為不變。 */
  const [hx,hy]=tip(R*(C.hLen||0.78), degH), [mx,my]=tip(R*(C.mLen||1.06), degM);
  const pal=clockPalette(C);
  const face=(pal&&pal.face)||C.face||'142,141,146', hand=(pal&&pal.hand)||C.hand||'62,63,70';
  /* ⚠ `wipe`＝**畫上去的指針伸出盤面圓之外的那一截**要另外抹掉
     （`Varn_Station` 的分針畫到 r≈56，而盤面補丁只到 50 —— 不抹的話
     三點鐘方向會留一小截黑，那正是「對不上」的另一種長相）。
     一項＝`[角度°, r0, r1, 半寬]`，後三個的單位都是**盤面半徑**。
     ⚠ 把補丁整個放大到 56 不行：刻度就從 r≈48 開始，會被吃掉一半。 */
  let wipe='';
  for(const w of (C.wipe||[])){
    const [wd,w0,w1,ww]=w, p0=tip(R*w0,wd), p1=tip(R*w1,wd);
    wipe += '<line x1="'+p0[0].toFixed(2)+'" y1="'+p0[1].toFixed(2)+'" '
          + 'x2="'+p1[0].toFixed(2)+'" y2="'+p1[1].toFixed(2)+'" stroke="rgb('+face+')" '
          + 'stroke-width="'+(R*ww*2).toFixed(2)+'" stroke-linecap="round"/>';
  }
  if(!clockEl){
    clockEl=document.createElementNS('http://www.w3.org/2000/svg','svg');
    clockEl.id='townClock';
    st.appendChild(clockEl);                             // 排在 #storyBg 之後＝疊在它上面
  }
  const f=v=>v.toFixed(2);
  /* ⚠⚠⚠ **`faceR` ＝那一塊平面補丁的半徑**（占 `r` 的比例，不寫＝1＝整面蓋掉）。
     ver -1249 的前提是「那面盤是平的」（舊圖只有刻度、而且在 r≈48 之外）——
     **新的火車站圖不是**：盤面上有一圈羅馬數字（r≈29~45），整面蓋掉就等於
     把美術剛畫好的數字全部擦掉，只剩一個空白的奶油色圓盤。
     ⇒ 這一張改成「**只補錶心、畫上去的那兩根交給 `wipe`**」（`faceR:0.22`）。
     ⚠ 新增有鐘的節點時先問一句：**那面盤上有沒有東西不能被蓋掉？** */
  const fr=(C.faceR!=null?C.faceR:1);
  clockEl.innerHTML =
      (fr>0 ? '<circle cx="'+f(c.x)+'" cy="'+f(c.y)+'" r="'+f(R*fr)+'" fill="rgb('+face+')"/>' : '')
    + wipe
    + '<line x1="'+f(c.x)+'" y1="'+f(c.y)+'" x2="'+f(hx)+'" y2="'+f(hy)+'" '
      + 'stroke="rgb('+hand+')" stroke-width="'+f(Math.max(R*0.11,0.8))+'" stroke-linecap="round"/>'
    + '<line x1="'+f(c.x)+'" y1="'+f(c.y)+'" x2="'+f(mx)+'" y2="'+f(my)+'" '
      + 'stroke="rgb('+hand+')" stroke-width="'+f(Math.max(R*0.075,0.6))+'" stroke-linecap="round"/>'
    + '<circle cx="'+f(c.x)+'" cy="'+f(c.y)+'" r="'+f(Math.max(R*0.13,0.7))+'" fill="rgb('+hand+')"/>';
  clockEl.classList.add('on');
}

function refreshArrows(){
  const n=node(); if(!n || !layer) return;
  const info=layer.querySelector('#townInfo');
  /* ⚠ 打烊時在時刻後面補一句（ver -391）：店裡沒有人、選單也開不出來，要有理由 ——
     不然玩家只會覺得「這家店怎麼什麼都沒有」。 */
  /* ⚠⚠ **上方日期、下方時間**（ver -435，Ray 指定）：以前只有一行「地名＋時刻」，
     現在多一行日期在最上面 —— 玩家要看得到「今天是幾號」，時間才成得了資源。
     ⚠ 地名留在下面那一行（它一直都在這裡，而「已打烊」是掛在它後面的）。
     ⚠ 整塊往上提（見 style.css 的 `#townInfo`）：原本壓在立繪的臉上。 */
  if(info) info.innerHTML =
      '<span class="ti-date">' + clock.dateText() + '</span>'
    + '<span class="ti-line">' + nameOf(nodeId)
    +   '<span class="ti-time">' + clock.timeText() + '</span>'
    +   (isOpenNow(n) ? '' : '<span class="ti-shut">已打烊</span>')
    + '</span>';
  /* 背景上的鐘：誰更新這一行時刻，誰順便擺指針（鐵律 8，見 `syncBgClock`）。 */
  syncBgClock();
  /* 目的地字格：有那個方向才出現，字是目的地名，**位置貼著那一支箭**
     （ver -374，Ray：「地名是放在箭頭左右上方」）。
     ⚠ 箭的座標問 `getBoundingClientRect`，不要自己算（鐵律 7）。
     ⚠ 上：擺在箭的**正上方**；左／右：擺在箭的**外側**再往上一點 ——
       正對著箭會把箭遮住，那支箭正在發光晃動，是這一頁的主角。 */
  const ex=exitsOf(), st=story.stageEl();
  const sr=st ? st.getBoundingClientRect() : null;
  layer.querySelectorAll('.town-dest').forEach(b=>{
    const to=ex[b.dataset.dir];
    /* 四個方向只要有目的地就標名（ver -790，Ray：「城鎮移動時四個方向在控制盤上都要
       標移動目的地的名，現在下方常常沒標」）——先前下方只給出航標字（一般的「退回
       上一層」省略），現在一律標。名字走 nameOfNode（出航＝「出航」，back＝該格地名）。 */
    const show = !!to;
    b.classList.toggle('on', show);
    if(!show){ b.style.setProperty('--fill', 0); return; }
    b.style.setProperty('--fill', 0);
    const sp=b.querySelector('span'); if(sp) sp.textContent = to ? nameOfNode(to) : '';
    if(!to || !sr) return;
    const ar=document.querySelector('.kerb-arrow.'+DIR_ARROW[b.dataset.dir]);
    if(!ar) return;
    const r=ar.getBoundingClientRect();
    const cx=r.left-sr.left+r.width/2, cy=r.top-sr.top+r.height/2;
    const off = {                                   // 相對那支箭的偏移
      up:   [0,  -r.height*0.95],
      left: [-r.width*1.5, -r.height*0.75],
      right:[ r.width*1.5, -r.height*0.75],
      /* 下：擺在箭的**正上方**。⚠ 不能擺下面 —— 那支箭本來就快貼到畫面底了
         （實測箭心 y=742、箭底 787，而舞台只有 812 高），字格擺下去會被切掉一半。 */
      down: [0,  -r.height*0.75],
    }[b.dataset.dir] || [0,0];
    b.style.left=(cx+off[0])+'px'; b.style.top=(cy+off[1])+'px';
    /* ⚠ 夾回畫面內：字格是 `translate(-50%,-50%)` 置中的，貼著箭放會半格出界
       （實測左邊那格 left=-33）。量完自己的寬度再夾一次。 */
    const br2=b.getBoundingClientRect();
    const bw=br2.width/2 || 40, bh=br2.height/2 || 16;
    const x=Math.min(Math.max(cx+off[0], bw+8), sr.width-bw-8);
    const y=Math.min(Math.max(cy+off[1], bh+8), sr.height-bh-8);
    b.style.left=x+'px'; b.style.top=y+'px';
  });
}

/* 導覽的開關。⚠ **羅盤跟著一起開關**（ver -372）：對白播放中箭頭就不該亮、也不該能按 ——
   不然玩家會在讀台詞的時候看到底下有東西在發光晃動，而且按下去會與推進台詞打架。 */
function showNav(on){
  if(layer) layer.classList.toggle('on', !!on);
  document.body.classList.toggle('town-nav', !!on && !!townId);
  /* ⚠ 收的是**打開的那一張地圖**（它是 88% 的暗罩，蓋著就看不到對白），
     **不是那顆鈕** —— 鈕自 ver -899 起常駐（見 showMapBtn）。 */
  if(!on) mapClose();
  if(on){
    /* ⚠⚠⚠ **「導覽箭頭出來了」＝玩家可以動了**（ver -903）：那一刻畫面上不該還有
       任何一片黑幕。有的話就是某條路徑忘了收 —— 當場清掉並報出是哪一片
       （`story.assertNoDarkOverlay`，那一支的說明寫著為什麼判準是這個而不是秒數）。
       ⚠ 城鎮這一格是 Ray 玩最久的地方，也是他四次回報「變黑」的現場。 */
    /* ⚠ 還在等背景就不驗（ver -926）：那時候黑幕蓋著是**對的**（見 enter 的 reveal）。
       -904 沒有這一條，於是慢網／冷快取下每進一格都誤報一次紅字。 */
    if(!revealPending) story.assertNoDarkOverlay('town.showNav');
    updateCompass();
    /* ⚠⚠ **字格的位置要在 `.on` 之後才量**（ver -406 修）：`#townNav` 沒有 `.on`
       時整層是 `display:none`，那時候量目的地字格得到的是 **0×0** —— 夾回畫面內那一段
       就退回預設的半寬 40px，字格於是被擺在錯的地方（實測「武器店（已打烊）」
       左緣 −23，第一個字被切掉）。
       ⚠ 以前看不出來是因為字短（「武器店」剛好塞得進錯誤的位置）；ver -406 的
         「（已打烊）」後綴一加就露餡了。**這是量 rect 的通病**：量之前先確認那個東西
         真的顯示著（同 §6.5 那條「量不到就先不要擺」）。 */
    refreshArrows();
  }else
    document.querySelectorAll('.kerb-arrow').forEach(a=>a.classList.remove('avail','holding'));
}

/* 方向提示：擺在**那一支箭的位置**（座標由呼叫端給，因為箭的位置是
   `layoutKerberos` 依實際尺寸算出來的），標目的地名，蓄能圈歸零。 */
const HINT_R=19, HINT_C=2*Math.PI*HINT_R;
function hintShowAt(x, y, name){
  const h=layer && layer.querySelector('#townHint'); if(!h) return;
  h.className='at on';
  h.style.left=x+'px'; h.style.top=y+'px';
  const lab=h.querySelector('.th-label'); if(lab) lab.textContent=name||'';
  const pr=h.querySelector('.ta-prog');
  pr.style.strokeDasharray=HINT_C; pr.style.strokeDashoffset=HINT_C;
}
function hintProgress(p){
  const h=layer && layer.querySelector('#townHint'); if(!h) return;
  h.querySelector('.ta-prog').style.strokeDashoffset=HINT_C*(1-Math.min(1,Math.max(0,p)));
}
function hintHide(){ const h=layer && layer.querySelector('#townHint'); if(h) h.className=''; }

/* ══ 羅盤：槍棺的四支箭就是方向鍵（ver -372，Ray 指定）══
   有目的地的方向 → 那支箭浮起、輕輕晃、從下面發光（CSS 的 `.avail`）。
   **長按**那支箭 → 浮出目的地名與蓄能圈 → 滿了才走；放開就取消。
   ⚠ 方向對應：n＝上、e＝右、s＝下、w＝左（門的箭本來就是正四向）。
   ⚠ 室內只有 `back` 一個出口時，把它掛在**下**（s）那一支 —— 「退回」讀起來就是往下。
   ⚠ 箭的座標要問 `getBoundingClientRect`，不要自己算：那組位置是
     `layoutKerberos` 解出來的（鐵律 7）。 */
const DIR_ARROW={ up:'n', right:'e', down:'s', left:'w' };

/* ══ 「回去」掛在哪一支箭（ver -405，Ray：「左進右出，上進下出」＝來時方向的**反向**）══
   往上走進去的地方往下退回來、往左走進去的往右退回來。
   ⚠ **記的是「這一次是按哪個方向進來的」**（`backDir` ＝ 來時方向的反向），
     不是節點資料上的東西 —— 同一個地方可以從不同的路走到（日後多城時尤其），
     寫死在資料上一定會有一邊是反的。
   ⚠ 沒有記錄時（開城第一格、戰鬥交棒回來、讀檔）退回舊行為「掛在下」。
   ⚠ 這條**不論城鎮探索或戰鬥探索都適用**，之後所有移動地圖照辦（Ray 指定）——
     它是全域規則（收在 enter/exitsOf 一處），不寫死在每座城的資料上。
   ⚠ **兩套機制達成同一條規則**（ver -788）：
     ① 純末端（只有 `back` 出口）＝ 靠這裡的 `backDir`（反向）；
     ② 樞紐 sub-hub（寫死四向出口、無 `back`）＝ 母節點出口**直接硬掛在來時的反向槽**
        （script/town.js 的資料，見那邊 -788 的註解）—— 上進的擺 down、左進的擺 right、
        右進的擺 left；被佔的末端移到空出的 down。兩者都給「左進右出、上進下出」。 */
const OPPOSITE = { up:'down', down:'up', left:'right', right:'left' };
let pendingDir = null;   // go() 記下這一次按的方向，enter() 取用後清掉
let backDir    = null;   // 「回去」該掛在哪一支箭

function exitsOf(){
  const n=node(); const ex=Object.assign({}, (n&&n.exits)||{});
  const back=ex.back; delete ex.back;
  /* ══ 城鎮戰：通往末端的方向只留 `keep` 那幾格（ver -583）══
     ⚠ 擋在**這裡**而不是 `go()`：Ray 要的是「不用顯示箭頭」——
       箭頭都不出現，玩家才讀得出「那邊過不去」。 */
  /* ver -858（Ray：「Stage5 之前無法進入索拉娜家，連箭頭都不會有」）：
     目的節點自己宣告 `hideBelowStage:<章>` —— 章沒到，指向它的方向整個不出
     （同 siege 的「不用顯示箭頭」語彙）。 */
  { const T=TOWNS[townId]||{};
    for(const d in ex){ const t=T.nodes && T.nodes[ex[d]];
      if(t && t.hideBelowStage!=null && prog.getStage() < t.hideBelowStage) delete ex[d]; } }
  const sg=siegeOn();
  if(sg){
    const conn=new Set(connectorIds());
    const keep=new Set(sg.keep||[]);
    for(const d in ex) if(!conn.has(ex[d]) && !keep.has(ex[d])) delete ex[d];
    /* ⚠ `back` 也要吃這一條：它指到的若是被封的末端就不掛（實際上 `back` 一律
       指向連接場景，所以正常不會踩到 —— 但規則要一致，不要留一條後門）。 */
    if(back && !conn.has(back) && !keep.has(back)) return ex;
  }
  /* ══ 出航（ver -387，Ray：「預設的城鎮入口下方為『出航』」）══
     ⚠ 走**同一套**方向出口（長按那一支箭／字格），不另做一顆鈕 —— 對玩家而言
       「往下走」與「出航」是同一個動作，只是目的地在城外（鐵律 8）。
     ⚠ 目的地 id 用 `__sail` 這個保留字，由 `go()` 攔下來分流。
     ⚠ **先擺出航再擺 back**：出航是「下」那一格的既定用途（Ray 指定），
       不能被「回去」擠掉。 */
  /* ══⚠⚠ **有條件的出口**（`exitIf:{ 方向:'<旗>' }`，ver -923）══
     stage7 的石橋：走到底是一道關著的門（蕾娜：「沒路了呢。」）—— 那道門由古代機械
     那一段的開門事件打開（`ruins_gate_open`），開了才走得過去。
     ⚠ 擋在 `exitsOf()` 不是 `go()`（同城鎮戰那條，§6.5.4.3）：**箭頭都不出現**，
       玩家才讀得出「那邊過不去」，而不是「按了沒反應」。
     ⚠ 只擋**還沒立旗**的那一格：旗一立整條路就常開，不必再演一次。 */
  if(n && n.exitIf){
    for(const d in n.exitIf){ if(!prog.hasFlag(n.exitIf[d])) delete ex[d]; }
  }
  /* ══⚠ **方向的章節門檻**（`exitFrom:{ 方向:<第幾章> }`，ver -925，Ray：「stage6 之前
     夏爾森林只能走到懸崖邊的前一個圖，懸崖邊不開放」）══
     ⚠ 與 `exitIf` 是**兩件事**：那個看旗（某個事件開的門），這個看章節（劇情走到了沒）。
       混用會逼出一支「只為了擋路」的旗，而那支旗沒有人插得起（鐵律 9）。
     ⚠ 同樣擋在 `exitsOf`：箭頭直接不出現。 */
  if(n && n.exitFrom){
    for(const d in n.exitFrom){ if(prog.getStage() < (n.exitFrom[d]|0)) delete ex[d]; }
  }
  /* 出航（ver -1221 起可指定方向）：預設掛在**下方**（§6.5.4：對玩家而言
     「往下走」與「出航」是同一個動作）。⚠ 那一格的下方已經被別人占著時要寫
     `sail.dir`（木雅克神殿的遺蹟入口：下方是回斷崖邊的路，所以出航掛在**左**）。
     ⚠ 寫在資料上不寫死在程式裡 —— 哪一格的哪一邊是出口，那是那張圖的事。 */
  if(n && n.sail){ const sd=n.sail.dir||'down'; if(!ex[sd]) ex[sd]=SAIL_ID; }
  if(back){
    /* 首選＝來時方向的反向；那一格已經有別的出口就退回「下」，再不行就找一格空的。 */
    const want = (backDir && !ex[backDir]) ? backDir
               : (!ex.down ? 'down' : ['up','left','right','down'].find(d=>!ex[d]));
    if(want) ex[want]=back;
  }
  return ex;
}
const SAIL_ID='__sail';
/* 出航被擋、而那一格又沒寫自己的台詞時的預設旁白（見 setSail）。 */
const SAIL_NO_SHIP='沒有船，離不開這裡。';
/* ══ 節點的顯示名（含城名前綴）══════════════════════════════════════════
   ⚠⚠ **只有這一支在決定**（鐵律 7）：上緣那一行、目的地字格、店舖鈕、閉門羹的
     名字欄全部問它 —— 四個地方各自讀 `n.name` 的話，哪天有一個要變就只有一個會變。
   ⚠⚠ **餐飲街的地名就是「餐飲街」，不接店別**（ver -580，Ray：「把餐酒館・餐廳
     改成餐飲街，點進去會進哪邊取決於你跟哪個角色在一起」）。-575~-579 曾經印成
     `帝都　餐酒館・餐廳` —— 那把「這是一條街」講成了「這是一家叫餐廳的餐酒館」，
     而且等於在箭頭上先劇透了裡面是誰。玩家看得出自己在哪一家靠的是**背景與路人語**。 */
/* ══⚠⚠ 這張圖**現在**叫什麼（ver -1184）══════════════════════════════
   Ray：「石製遺蹟：（進入後改名為瓦努努石陣）」—— 地名可以是一個**狀態**
   （走進去之後才知道它真正的名字），不只是一個常數。
   ⚠⚠ **只有這一支在決定**（鐵律 7/8）：上緣那一行、目的地字格、圖名卡、
     跨圖出口的字格全部問它 —— 各自讀 `T.name` 的話，改名就只會改到其中幾個。
   ⚠ 由上往下取第一個成立的（同 `acts`／`bgWhen`／`innDoors`）；
     `need`／`not` 兩格都不寫的一筆不算（不然它永遠贏＝把 `name` 換掉）。
   ⚠ 大地圖那一半是另一個 document，`flight/index.html` 的 PLACES 有一份同義的
     `nameWhen`（同一支旗）—— 改一邊要改另一邊（§6.10，兩邊註解互指）。 */
function townName(id){
  const T=TOWNS[id||townId]; if(!T) return '';
  const w=(T.nameWhen||[]).find(o=>o && (o.need || o.not)
            && (!o.need || prog.hasFlag(o.need))
            && (!o.not  || !prog.hasFlag(o.not)));
  return String((w && w.name) || T.name || '');
}
function nameOf(id){
  const T=TOWNS[townId]||{}, n=(T.nodes||{})[id];
  if(!n) return '';
  const s=String(n.name||'');
  /* 節點名裡的城名前綴（`石製遺蹟　崩塌門廊`）跟著改（ver -1184）——
     ⚠ 這樣資料那一邊**逐格的 `name` 一個字都不必動**：圖改名只改 `nameWhen`
       一處（鐵律 7）。前綴對不上就原樣回傳（別座城的節點名本來就沒有前綴問題）。 */
  const base=String(T.name||''), now=townName();
  if(base && now && now!==base && s.indexOf(base+'　')===0) return now+s.slice(base.length);
  return s;
}
/* 這一格要試哪些底圖檔名（ver -575；-578 改成逐張展開候選鏈）：
   **分店優先，載不到退回節點原本那一張** —— 所以圖還沒交也不會變成空畫面。
   ⚠ 每一張各自帶 `noTime`（分店的三張沒有時段差分、酒吧沿用的餐酒館有）。
   ⚠⚠ 候選鏈**只有一份**（ver -427）：`modules/story.js` 的 `bandNames`。
     Ray 把插圖也拆成時段差分之後，這條規矩（時段 → 退路時段 → 大小寫變體 →
     `.webp`／`.png`）就有兩個使用者了 —— 抄一份到這邊必然走鐘
     （其中一份會漏掉大小寫變體、或漏掉 `.png` 那一級）。鐵律 7。 */
/* 這一格現在該用哪一張底圖的**基底名**（ver -627）。
   ⚠⚠ 城重建之後整組換掉（`TOWNS[x].rebuild`，Ray：「stage5 之後北泊改用這一組差分」）：
     節點的 `bg` 是戰損版，`rebuild.bg[id]` 是已重建版 —— 判定只有這一處（鐵律 8），
     所以背景、預載、店舖、戰鬥交棒帶過去的那一張全部同步。
   ⚠ 沒到那一章、或那一格沒列在表上（例如日後新增的節點）→ 照舊用 `n.bg`。 */
function rebuiltBg(n, id){
  const rb=(TOWNS[townId]||{}).rebuild;
  if(!rb || !rb.bg) return null;
  if(prog.getStage() < (rb.fromStage|0)) return null;
  return rb.bg[id] || null;
}
function bgCandsOf(n, id){
  const out=[];
  const add=(base, noTime)=>{ if(!base) return;
    for(const nm of story.bandNames(base, noTime)) if(out.indexOf(nm)<0) out.push(nm); };
  /* ══⚠⚠ **事件差分**（ver -914，Ray：「會有事件差分我再補上」）══
     節點寫 `bgWhen:[{ need:'<旗>', bg:'<基底名>', noTime? }]`，**由上往下取第一個
     旗立著的**（同 `acts`／`innDoors` 的取法）。第一個用例是石橋盡頭那道門開了
     （`Ruins_shinier_Bridgeopen`）。
     ⚠⚠ **它與時段差分是兩件事**：那一條是「現在幾點」（`bandNames` 的候選鏈），
       這一條是「世界變了」（旗標）—— 兩者可以並存（`bgWhen` 那一筆自己也吃候選鏈）。
       同理它與 `rebuild.bg` 也是兩件事：那個是**整座城**跨章節換一組，這個是**一格**
       因為某個事件換一張。
     ⚠ 排在最前面（最specific）、**載不到就往下退**回重建版／節點原本那一張 ——
       圖還沒交也不會變成空畫面（同分店與重建那兩條）。
     ⚠ 鐵律 9：那支旗要答得出「誰插的」。
     ⚠⚠ **`not:` ＝反過來：那支旗**還沒**立的時候用這一張**（ver -1142，
       Ray：「做一張關閉的墓門」「同一格的另一個狀態」）。
       為什麼需要它：伊甸古墓的門**預設是關的**，開了才變成現在那張撬開一道縫的。
       寫成 `need` 的話「關著」就得當成節點的 `bg`（基底），而基底同時是**退路** ——
       關著那張還沒交件時就會變成空畫面。寫成 `not` 就能把**已經交件的那一張**
       留在基底當退路，圖沒到也不會開天窗（同分店與重建那兩條的精神）。
       ⚠ 寫法與 `acts`／`storyPartnerBy` 的 `not` 同義（ver -970），不另發明字。
       ⚠ 兩格可以並用（`need` 且 `not`）；**兩格都不寫的那一筆一律不算**
         —— 不然它會永遠贏，等於把節點的 `bg` 換掉，那不是這個欄位的用途。 */
  { const w=(n.bgWhen||[]).find(o=>o && (o.need || o.not)
              && (!o.need || prog.hasFlag(o.need))
              && (!o.not  || !prog.hasFlag(o.not)));
    if(w) add(w.bg, w.noTime!=null ? w.noTime : n.noTime); }
  const sc=dineSceneOf(id);
  if(sc) add(sc.bg, sc.noTime);
  /* 重建版優先、戰損版當退路 —— 圖還沒交也不會變成空畫面（同分店那一條）。 */
  add(rebuiltBg(n, id), false);
  add(n.bg, n.noTime);
  return out;
}
function nameOfNode(id){
  if(id===SAIL_ID) return '出航';
  /* 跨地圖出口（ver -758）：目的地字格印**那張圖的名字**（或指定節點的名字）。 */
  if(typeof id==='string' && id[0]==='@'){
    const seg=id.slice(1).split(':'), T=TOWNS[seg[0]];
    if(!T) return '';
    if(seg[1] && T.nodes && T.nodes[seg[1]] && T.nodes[seg[1]].name) return T.nodes[seg[1]].name;
    return townName(seg[0]) || '';
  }
  const n=(TOWNS[townId]||{}).nodes[id];
  if(!n) return '';
  /* ══⚠⚠ 沒走到的地方＝「？？？」（ver -913，Ray：「在控制面板上也顯示『？？？』」）══
     與小地圖的迷霧是**同一件事**，所以問同一支 `fogOn()`／`seenNode()`（鐵律 7）。
     ⚠ 排在打烊那一條**之前**：連地名都還不知道的地方，不該先知道它幾點關門。
     ⚠ 跨地圖出口（`@`）在上面就回掉了 —— 那是「往外走」不是這張圖的一格。 */
  if(fogOn() && !seenNode(id)) return '？？？';
  /* ⚠ 打烊的地方在**目的地字格上就標出來**（ver -406）：走過去才發現關門是白走一趟，
     而移動要花掉遊戲內時間（時間是資源）。標在這裡＝所有顯示目的地名的地方
     （字格、蓄能提示）都吃得到，只有這一支在決定（鐵律 7）。 */
  const nm=stripTownPrefix(nameOf(id));
  return isOpenNow(n) ? nm : (nm+'（已打烊）');
}
/* 節點名去掉「城名＋全形空格」前綴（ver -571，Ray：「指示箭不要加『北方泊地』前綴」）。
   ⚠ 城名從 `TOWNS[townId].name` 推，不寫死是哪座城（鐵律 7；舊版寫死 `^帝都　`，
     北方泊地的箭就整排帶著前綴）。只有這一支在做（鐵律 8）—— 字格、打烊浮條都問它。 */
function stripTownPrefix(name){
  const s=String(name||'');
  /* ⚠ 兩個前綴都要認（ver -1184）：`nameOf` 出來的是**現在的**圖名（改名後是
     「瓦努努石陣　崩塌門廊」），而資料上寫的是原名 —— 有些呼叫端傳的是後者
     （例如 `n.name` 的退路）。認一個就會剩下另一個沒剝乾淨。 */
  for(const tn of [townName(), (TOWNS[townId]||{}).name]){
    if(!tn) continue;
    const p=tn+'　';
    if(s.indexOf(p)===0) return s.slice(p.length);
  }
  return s;
}
/* 營業時間那一行。⚠ 只有這一支在把 `hours` 排成字（鐵律 7）—— 打烊提示與日後
   任何要顯示營業時間的地方都問它。 */
function hoursText(n){
  const h=n && n.hours;
  if(!h || h.length<2) return '';
  const p2=v=>(v<10?'0':'')+v;
  return '營業時間　'+p2(h[0])+':00 – '+p2(h[1]%24)+':00';
}

function updateCompass(){
  const ex=exitsOf();
  for(const dir in DIR_ARROW){
    const el=document.querySelector('.kerb-arrow.'+DIR_ARROW[dir]);
    if(!el) continue;
    el.classList.toggle('avail', !!ex[dir]);
    el.classList.remove('holding');
    el.dataset.dir=dir;
  }
}

function bindInput(){
  const st=story.stageEl(); if(!st || st.__townBound) return;
  st.__townBound=true;
  let hold=null;          // {el, to, t0, raf, timer}
  const cancel=()=>{
    if(!hold) return;
    cancelAnimationFrame(hold.raf); clearTimeout(hold.timer);
    hold.el.classList.remove('holding');
    hold=null; hintHide();
  };
  /* 長按開始：只認**有目的地**的箭。
     ⚠ 抽成一支（ver -427）：滑動與鍵盤（WASD）走的是**同一條**長按 —— 蓄能圈、
       目的地字格、0.5 秒的門檻只有這一份（鐵律 8）。 */
  const startHold=(el)=>{
    if(!townId || busy || story.isPlaying() || hold) return false;
    if(!el || !el.classList.contains('avail')) return false;
    const to=exitsOf()[el.dataset.dir]; if(!to) return false;
    el.classList.add('holding');
    const r=el.getBoundingClientRect(), sr=st.getBoundingClientRect();
    hintShowAt(r.left-sr.left+r.width/2, r.top-sr.top+r.height/2, nameOfNode(to));
    hold={ el, to, dir:el.dataset.dir, t0:performance.now(), raf:0, timer:0 };
    const tick=()=>{ if(!hold) return;
      hintProgress((performance.now()-hold.t0)/HOLD_MS);
      if(performance.now()-hold.t0 < HOLD_MS) hold.raf=requestAnimationFrame(tick); };
    tick();
    hold.timer=setTimeout(()=>{ const target=hold.to, d=hold.dir; cancel(); go(target, d); }, HOLD_MS);
    return true;
  };
  st.addEventListener('pointerdown', e=>{
    const el=e.target.closest && e.target.closest('.kerb-arrow.avail');
    if(!el) return;
    if(!startHold(el)) return;
    /* ══⚠⚠⚠ **按下去就把指標抓住**（ver -1650，Ray：「整備選單關掉、地圖關掉或某些
       不明條件下會讓操作區方向鍵點擊無效，要點好幾次才有反應」）══
       病灶：`pointerup`／`pointercancel` **只綁在 `#storyStage` 上**，而整備頁
       （`#gearSheet`，z-8450）與買賣單子是掛在 `body` 上的**兄弟層** ——
       手指在那幾層上放開時舞台**收不到 up** ⇒ `hold` 一直是非空 ⇒
       `startHold` 開頭那句 `|| hold` 讓**之後每一次按箭頭都直接 return false**，
       而且畫面上完全正常（沒有任何錯誤訊息）。「要點好幾次」＝點到某一次的 up
       剛好落在舞台上、把它清掉為止。
       ⇒ `setPointerCapture`：抓住之後不管手指飄到哪一層，up/cancel 一定回到這裡。
       ⚠ 這與地圖那一層用同一招（`renderMap` 的 -1449）—— 那裡的理由一模一樣。 */
    try{ st.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault(); e.stopPropagation();
  }, true);
  /* 店舖的入口鈕（ver -430）：點下去開全畫面那張窗。
     ⚠ 一定要 `stopPropagation` —— 舞台上還有「點一下＝把入口交還玩家／路人單句」，
       不擋的話這一下會被那一支再吃一次（同 `#innLobby` 那一層的作法）。 */
  if(layer){
    const sb=layer.querySelector('#townShopBtn');
    if(sb) sb.addEventListener('pointerup', e=>{ e.stopPropagation(); openSheet(); });
  }

  /* ══ 鍵盤：WASD ＝走（ver -427，Ray 指定）══════════════════════════════
     ⚠⚠ **走同一支** `startHold`：按住 0.5 秒才走、蓄能圈、目的地字格全部照舊 ——
       鍵盤不是第二條移動路徑，是同一條的另一個入口（鐵律 8）。
     ⚠ `e.repeat` 一定要濾掉：按住不放會連發 keydown，每一發都重開一次長按，
       進度圈永遠從頭算，結果是「按住 WASD 走不動」。
     ⚠ 焦點在輸入框時讓位；帶輔助鍵（Ctrl/Alt/Meta）是瀏覽器捷徑，不攔。
     ⚠ 對白播放中不受理 —— 那是 `startHold` 自己的守門（`story.isPlaying()`），
       這裡不要再判一次。 */
  const KEY_DIR = { w:'up', a:'left', s:'down', d:'right' };
  const inField = ()=>{ const a=document.activeElement;
    return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  window.addEventListener('keydown', e=>{
    if(e.repeat || e.ctrlKey || e.altKey || e.metaKey || inField()) return;
    /* ⚠⚠ **導覽沒開就不吃鍵**（ver -1122）：城鎮被暫停（出航／交棒進戰鬥）時
       箭頭元素還在 DOM 上，`startHold` 照樣跑得動 —— 於是**在飛行畫面上按 WASD
       會讓底下那座城裡的人偷偷走路**（時鐘也跟著推）。實測：出航後按了十下
       方向鍵，回頭一看人已經從崩塌門廊走到斷柱道、時間多跑了一個多小時。
       ⚠ 判準用 `body.town-nav`（`showNav` 唯一那支開關，鐵律 8）：暫停、對白中、
         演出中它本來就是關的 —— 那幾個時刻本來也不該走路。 */
    if(!document.body.classList.contains('town-nav')) return;
    const dir=KEY_DIR[(e.key||'').toLowerCase()]; if(!dir) return;
    const el=st.querySelector('.kerb-arrow[data-dir="'+dir+'"]');
    if(!startHold(el)) return;
    e.preventDefault();
    try{ SFX.unlock(); }catch(_){}          // 鍵盤也是使用者手勢
  });
  window.addEventListener('keyup', e=>{
    const dir=KEY_DIR[(e.key||'').toLowerCase()];
    if(dir && hold && hold.dir===dir) cancel();   // 放太早：取消（同滑動）
  });
  /* ⚠ 視窗失焦要取消：按著鍵切走的話 keyup 收不到，回來會憑空走一步。 */
  window.addEventListener('blur', cancel);
  st.addEventListener('pointerup', e=>{
    if(hold){ cancel(); return; }               // 放太早：取消，不算點擊
    if(!townId || busy || story.isPlaying()) return;
    /* ══ 店裡：點畫面 ＝ 把入口鈕交還給玩家（ver -404；-430 改成鈕）══
       ⚠ 走的是**同一支** `openMenu`（鐵律 8），而且已經在畫面上時它只是重設一次。
       ⚠ 店裡沒有路人單句（`chatter` 只寫在餐酒館／教堂／行政廳／船塢），
         所以兩者不會打架；真要兩者兼有時，店舖優先。 */
    if(shopOn){ openMenu(); return; }
    /* 臨時攤（ver -732）：點畫面也把攤鈕交還 —— 同一支 `openMenu`（鐵律 8）。 */
    if(stallsOf(node())){ openMenu(); return; }
    /* ══ 單純點畫面 ＝ 路人單句（ver -387，Ray 指定四個地方都有）══
       節奏是**點一下出一句、再點一下收掉**，收掉之前不出下一句 ——
       一直點就一直換句的話，玩家永遠讀不完一句。 */
    if(chatterOn){ story.hideBubble(); chatterOn=false; return; }
    chatter();
  });
  st.addEventListener('pointercancel', cancel);
  /* ⚠⚠ **第二道保險**：指標抓取失敗（舊瀏覽器）、或那一層在按住期間被整個移除掉時，
     up 還是可能回不到舞台。掛在 window 上的這一對是冪等的 —— 舞台那一支先跑
     （它是子層，bubble 先到），跑完 `hold` 已經是 null，這裡就什麼都不做。
     ⚠ 不要把舞台那一支搬到 window：它還管「點畫面＝路人單句／交還店鋪入口」，
       那幾件事只在舞台上成立（同鐵律 8：一個動作一個實作，但**收尾**可以多一道）。 */
  window.addEventListener('pointerup', cancel);
  window.addEventListener('pointercancel', cancel);

  /* 目的地字格：與羅盤同一套「長按蓄能」，只是回饋畫在字格上（由左往右填）。
     ⚠ 蓄能的時間常數共用 `HOLD_MS` —— 兩個入口的手感要一樣（鐵律 7）。 */
  if(layer) layer.querySelectorAll('.town-dest').forEach(b=>{
    let raf=0, timer=0, t0=0;
    const stop=()=>{ cancelAnimationFrame(raf); clearTimeout(timer); raf=timer=0;
      b.style.setProperty('--fill', 0); b.classList.remove('holding'); };
    b.addEventListener('pointerdown', e=>{
      if(busy || story.isPlaying()) return;
      e.preventDefault(); e.stopPropagation();
      const to=exitsOf()[b.dataset.dir]; if(!to) return;
      b.classList.add('holding'); t0=performance.now();
      const tick=()=>{ const p=Math.min(1,(performance.now()-t0)/HOLD_MS);
        b.style.setProperty('--fill', p.toFixed(3));
        if(p<1) raf=requestAnimationFrame(tick); };
      tick();
      timer=setTimeout(()=>{ stop(); go(to, b.dataset.dir); }, HOLD_MS);
    });
    b.addEventListener('pointerup', e=>{ e.stopPropagation(); stop(); });
    b.addEventListener('pointercancel', stop);
    b.addEventListener('pointerleave', stop);
  });
}

/* 走一步：腳步聲 ＋ **槍棺的吊墜跟著晃**（ver -412，Ray：「平常移動出腳步聲時就要晃」）。
   ⚠ **一支函式**（鐵律 8）：走路的地方不只一處（走到隔壁節點、出航），
     兩件事要一起發生，就不要讓呼叫端各記得一次。
   ⚠ 幅度小（6°）：這是走路的震動，不是槍棺在動 —— 與上彈那一下（22°）要分得出來。 */
function stepSfx(){
  try{ const w='resources/audio/se/se_walk.m4a'; SFX.play(w, fileGain(w)); }catch(_){}   // ⚠ 增益要帶（ver -441）
  try{ story.kerbPendSwing(6, 1.5); }catch(_){}
}

/* ══ 移動 ══
   ⚠ 參數是**目的地的節點 id**，不是方向（ver -370 修）：手勢／羅盤那一段已經把方向
   換算成目的地了，這裡再查一次 `exits[dir]` 只會查到 undefined（實測踩過：
   提示出得來、時間也滿了，就是不會走）。 */
/* ══⚠⚠ **離開這一格之前要演的一段**（`onLeave`，ver -664，Ray：「點擊離開旅店時
   安：『……』…」）══════════════════════════════════════════════════════════
   節點寫 `onLeave:{ flag, need, sides, lines }`：`need` 立了、`flag` 還沒立 →
   按下移動的那一刻先演完這一段，**演完才走**（旗標演完才記，同城鎮所有段落）。
   ⚠ 與 `acts`（抵達時演）是**兩個時機**，不要混用：這一段的語意就是「你要走了」。
   ⚠ 出航（`__sail`）也吃得到 —— 它一樣是「離開這一格」。
   ⚠ `sailOnly:true` ＝**只有出航那一個出口**才演（ver -1103）。 */
/* ══⚠⚠ **ver -1532：`onLeave` 可以是一張表**（同 `acts`／`innDoors`／`bgmWhen`：
   **由上往下取第一個成立的**）══ 東泊走出旅店那一段有兩個分支（古墓探索完成前／後），
   而它們是**兩段各自只演一次的戲** —— 一個 `flag` 記不了兩段。
   ⚠ 單一物件照舊（舊資料一個字都不必改）。
   ⚠ 條件收齊成與 `acts` **同一組**（鐵律 7：同一個語意不要有兩套判法）：
     · `need` 走 `needOk` ⇒ **可以是陣列（全部都要立）**，以前這裡寫死單旗
     · `until` ＝那支旗立了就不再演（`acts` 早就有，這裡漏了） */
function leaveOne(l, to){
  if(!l) return null;
  if(l.flag && prog.hasFlag(l.flag)) return null;
  if(!needOk(l.need)) return null;
  if(l.until && prog.hasFlag(l.until)) return null;
  /* ⚠⚠ `sailOnly:true` ＝**只有出航才演**（ver -1103，Ray 的離村稿：「選擇離開
     夏爾村時，村子入口」）。那一段的語意是「離開這座城」，不是「離開這一格」——
     少了這道，走去北側也會把索菈娜的送別戲演掉。 */
  if(l.sailOnly && to!==SAIL_ID) return null;
  /* ver -839：onLeave 可以**沒有台詞只有整備**（村戰對白搬進戰鬥內之後就是這樣）。 */
  return ((l.lines && l.lines.length) || l.gear) ? l : null;
}
function leaveDue(n, to){
  if(mutedTalks()) return null;   // 舊章節封存（ver -753）
  const o = n && n.onLeave; if(!o) return null;
  for(const l of (Array.isArray(o) ? o : [o])){
    const hit = leaveOne(l, to);
    if(hit) return hit;
  }
  return null;
}
function go(to, dir){
  if(!to) return;
  /* ══ 出口鎖（ver -786，Ray：「野外是連接另一個地圖的地方，stage5 不開放」）══
     節點的 `lock:{ <方向>:{ until, need?, text } }` ＝這個方向現在走不了，就地浮一句
     （走路人單句那一套）。`until` 那支旗立了就解鎖（鐵律 9：開放它的那一段劇情
     插旗，現在還沒有人插＝一律鎖）。
     ⚠ 箭頭照樣顯示（Ray 要的是「按了出訊息」不是「沒有箭頭」——那是 siege 的作法）：
       擋在 go() 不在 exitsOf。
     ⚠ 只認**玩家按方向**（有 dir）：forceGo／內部轉場不帶 dir，不受鎖擋。 */
  /* ══⚠⚠ **鑰匙可以是「方向」，也可以是「目的地那一格的 id」**（ver -1525）══
     為什麼要第二種：`back`（退回來時方向的反向）是**執行期算出來的**，
     同一扇門從不同方向走過來會落在不同的 `dir` 上 ——「不管從哪邊過去都走不了」
     這種門（伊甸古墓的墓門）用方向當鑰匙必然漏掉其中一條路，而且**不會報錯**。
     ⚠ 兩種鑰匙**同一支判定**（鐵律 8）：方向優先，沒有才問目的地。
     ⚠ 照舊只認**玩家按方向**（有 `dir`）：`forceGo`／內部轉場不帶 `dir`，不受鎖擋。 */
  const nlk=node();
  if(dir && nlk && nlk.lock && (nlk.lock[dir] || nlk.lock[to])){
    const L=nlk.lock[dir] || nlk.lock[to];
    if((!L.need || prog.hasFlag(L.need)) && !(L.until && prog.hasFlag(L.until))){
      /* ⚠⚠ **擋下來的時候可以演一段**（ver -1433，Ray：「把南門驛站出口封起來：
         索：『喂！開船去比較快啦！』confused」）—— 帶 `lines` 就走**同一支**
         `playAdhoc`（立繪取景、明暗、打字機全部沿用，鐵律 8）；沒帶就照舊
         浮一句路人單句。
         ⚠ 第一拍補 `delay:SLIDE_MS`（框要等立繪站定，§6.5 檢查表第 5 條）。
         ⚠ 收尾一定要 `clearCast()` ＋ 把導覽開回來 —— 這一條路**沒有移動**，
           沒有人會替它重開（§6.5.4 那張檢查表）。 */
      if(L.lines && L.lines.length){
        busy=true; showNav(false);
        if(chatterOn){ story.hideBubble(); chatterOn=false; }
        const play=L.lines.map((l,i)=> (i===0 && l && l.delay==null)
          ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
        story.playAdhoc(play, ()=>{ story.clearCast(); busy=false; showNav(true); },
                        { sides:L.sides });
        return;
      }
      story.flashLine(L.text||'', ''); chatterOn=true; return;
    }
  }
  const lv = leaveDue(node(), to);
  if(lv){
    busy=true; showNav(false);
    if(chatterOn){ story.hideBubble(); chatterOn=false; }
    const play=(lv.lines||[]).map((l,i)=> (i===0 && l && l.delay==null)
      ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
    /* ══ 戰前強制整備（ver -838/-839）══ onLeave 帶 `gear:{partner,msg,lock}` ＝
       （台詞演完）先開整備頁（夥伴欄聚光燈＋提示；lock＝其他搭檔鎖住），
       **收掉才放行移動** —— gear.onceClosed 是那一頁唯一的收場通知（鐵律 8）。 */
    const fin=()=>{
      if(lv.flag) prog.addFlags([lv.flag]);        // ⚠ 演完才記（同所有城鎮段落）
      if(lv.gear){
        gear.open({ guidePartner:true, guideMsg:lv.gear.msg,
                    forcePartner:lv.gear.partner, lockPartner:!!lv.gear.lock });
        gear.onceClosed(()=>{ busy=false; go(to, dir); });
        return;
      }
      busy=false; go(to, dir); };
    if(!(lv.lines && lv.lines.length)){ fin(); return; }   // 只有整備、沒有台詞（ver -839）
    story.playAdhoc(play, ()=>{ story.clearCast(); fin(); }, { sides:lv.sides });
    return;
  }
  if(to===SAIL_ID){ setSail(); return; }
  /* ══ 跨地圖的走廊（ver -758，夏爾村・野外 ⇄ 夏爾森林）══
     出口寫成 `'@<地圖>'` 或 `'@<地圖>:<節點>'` ＝走過去就換一張地圖
     （淡出 → `open(那張圖, 那一格)` → enter 自己淡回，同 sceneCut 的分工）。
     ⚠ 為什麼是出口不是專用鈕：對玩家而言「往上走進森林」與「往上走到北側」
       是同一個動作 —— 同 `sail` 那一條的理由（§6.5.4）。
     ⚠ 安全區旗、遭遇戰的「回入口」都是**每張地圖自己的**（safehouse_<map>）——
       這正是森林要自成一張圖、而不是掛在村子節點樹上的原因。
     ⚠ 跨圖不記「來時方向」（pendingDir 清掉）：兩張圖的方向系不連續。 */
  if(typeof to==='string' && to[0]==='@'){
    const seg=to.slice(1).split(':'), map=seg[0], nd=seg[1]||null;
    if(!TOWNS[map]) return;
    busy=true; showNav(false);
    document.body.classList.remove('town-nav');
    stepSfx();
    clock.advance(stepMin());          // 戰鬥探索移動也耗時（ver -815；耗時依圖 ver -871）
    bumpGateMoves();   // 閘門的 afterMoves 計數（ver -953）：走一步就 +1
    /* 離開這張圖的收尾（ver -928，見 leaveMapRitual）：沒踩到結算怪就在這裡結算，
       沒帳也要先閉棺 —— 閉完才切到下一張圖。 */
    leaveMapRitual(()=>{ gotoMap(map, nd); });   // 鐵律 13 第 6 條（結算收完才換圖）
    return;
  }
  /* ══ 打烊的店**進不去**（ver -406，Ray 指定）══
     原本會走進去、站在一間關著的店裡（沒有店主、沒有選單），而且白花掉 10 分鐘
     ——「時間是資源」，走一趟空的就是實質的懲罰。改成**擋在門口**：不移動、
     不推進時鐘，就地報店名與營業時間。
     ⚠ 判定走**同一支** `isOpenNow`（鐵律 8）—— 目的地字格上的「（已打烊）」、
       進去之後的地名後綴、店主與選單出不出來，全部是它。 */
  const nx=((TOWNS[townId]||{}).nodes||{})[to];
  if(nx && !isOpenNow(nx)){ knockClosed(nx, to); return; }
  pendingDir = dir || null;            // 這一次按的方向（ver -405）；enter() 取用
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');          // 移動中把羅盤收起來
  stepSfx();
  /* ⚠⚠ **戰鬥探索中移動也耗時**（ver -815，Ray；推翻 -584 的「戰鬥地圖不花時間」）：
     「一步 10 分鐘」在城鎮戰一樣記帳 —— 在被禍魘襲擊的城裡跑一趟，時間照樣流逝
     （也讓夏爾村村戰從黃昏 19:00 隨著移動推進到夜景 20:00）。 */
  clock.advance(stepMin());   // 耗時依圖（ver -871；-917 起：森林 60／遺蹟 10／城村 10）
  /* ══ 追逐（ver -1421）：**超過 5 場之後，玩家每走一步牠也走一步**
     （Ray：「此時玩家移動時不論有沒有遭遇，他都會移動，直到停在王座之間」）══
     ⚠ 擺在**移動的那一刻**（`go()`）而不是抵達（`enter()`）：抵達那一支還要判
       「有沒有踩到牠」，先讓牠走掉的話玩家永遠追不上。
     ⚠ 沒進自動模式之前牠**不動** —— Ray：「等到玩家再次踩同一格才會再動」。 */
  if(dragonChaseOn()){
    /* ⚠ ver -1433：`dragonAutoStep()` 已取消（Ray：「取消龍自己往王座廳跑」）——
       牠只在**打完一場**才動，見 `dragonFleeStep`。 */
    /* ══⚠⚠ **開圖之前的刷新是「走一步擲一次」**（ver -1424，Ray：「二番戰階梯大廳
       必刷一次龍，接下來隨機在任一移動點，直到第四戰提示小地圖開始追趕」）══
       ⚠⚠ **擲在移動的那一刻，不要擲在 `dragonActDue` 裡**：那一支在一次抵達裡
         可能被問到不只一次（`actDue` 的接續、重繪），每次擲一顆骰子＝同一格
         時有時無，那不是機率是閃爍（鐵律 7：一個量一個計算點）。
       ⚠⚠ ver -1464：機率由固定值改成 **探索率 × `DRAGON_ROLL_K`（0.5）**
         （Ray 指定）—— 見那個常數的說明。 */
    dragonRollHit = (Math.random() < exploreRate() * DRAGON_ROLL_K);
  }
  /* ══ 追兵（ver -1577）：玩家走一格，牠推進 `speed` 格 ══
     ⚠ 目標是 `to`（**剛走到**的那一格）不是原本站的那一格 —— 牠追的是你現在的位置。
     ⚠⚠ 掛在這裡（移動的那一刻）與上面那條龍同一個理由：`enter()` 那一支還要判
       「有沒有踩到牠」，先讓牠走掉的話玩家永遠追不上；而且讀檔／強制轉場／
       戰鬥交棒回來都會跑 `enter()`，那幾種不是「玩家走了一格」。
     ⚠⚠ 跨圖那一條（`@`）**刻意不叫**：那是離開這張圖，追兵不跟出去
       （身分證是 `chase.town`，見 `progress.js` 的 `K.chase`）。
     ⚠ 與龍是**兩套**（持久性需求相反，見 `chaseStep` 上面那一段）—— 不要合併。 */
  wildStat.moves++;
  chaseStep(to);
  bumpGateMoves();   // 閘門的 afterMoves 計數（ver -953）：走一步就 +1
  sceneCut(to);          // 換景走淡入淡出（ver -438，見 sceneCut）
}

/* 吃了閉門羹：就地浮一句「哪一家、幾點開」。
   ⚠ 走**路人單句那一套**（`flashLine` ＋ `chatterOn`），所以「再點一下收掉」的節奏
     與城鎮其他單句一致（鐵律 8）—— 不另做一個提示框。
   ⚠ 名字欄放**店名**：這一句不是誰在講話，是「你站在這扇門前看到的事」。 */
function knockClosed(n, id){
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  const parts=[];
  if(n.closed) parts.push(n.closed);
  const ht=hoursText(n); if(ht) parts.push(ht);
  story.flashLine(parts.join('　'), stripTownPrefix(nameOf(id)||n.name));
  chatterOn=true;
}

/* ══ 出航（ver -387，Ray 指定）══════════════════════════════════════════
   「在到達取得船支的劇情前，點擊出航諾薇兒會要求要等蕾娜，船還沒好。」
   ⚠ 旗標由**主線**（拿到船的那一幕）立起來，這裡只讀 —— progress.js 的資料流是
     「主線寫、其餘讀」。旗標名寫在節點資料上（`sail.flag`），不寫死在程式裡。
   ⚠ 攔下來的那一段照樣走劇情播放器（立繪、明暗、打字機一致），演完把台上收乾淨、
     導覽開回來 —— 與城鎮其他每一段對白同一套收尾（鐵律 8）。 */
/* 開飛行頁的實體由 main.js 注入（模組邊界：城鎮不認識啟動層）。 */
let flightOpener=null;
/* ══⚠⚠⚠ **探索地圖 → 探索地圖也要走那道讀取頁**（ver -1581，鐵律 13 第 6 條）══
   由 `main.js` 注入 `enterTown`（進探索地圖**唯一**那道門，鐵律 8）——
   town 不能直接 import main。⚠ 沒注入時退回舊行為（淡出 → `open()`），
   獨立測試載 town.js 也跑得動。 */
let mapEnter=null;
export function setMapEnter(fn){ mapEnter=fn||null; }
/* ══⚠⚠⚠ **這張圖的「野怪局」id**（ver -1596）══ 整張探索地圖算**一局**
   （§6.5.4.3）：中間打幾場都不結算，**走到安全點（`rest:true`）才閉棺結算**。
   ⚠⚠ 既有的野怪場次卡本來就都帶著它（`sf_hog:{enemy,session:'sf_wild'}`、
     `ruins_bellwalker:{…session:'ruins_wild'}`）—— 而卡上 `spawnAt` 刷出來的那些
     **沒有場次卡**，合成的時候若不補這一格就會**每打一場結算一次**
     （ver -1596 Ray 回報：「為什麼每戰一次就結算一次？」）。
   ⚠ 命名跟著既有的走（`<圖>_wild`）。 */
export function wildSessionId(){ return townId ? (townId + '_wild') : null; }
function gotoMap(map, nd){
  if(mapEnter){ mapEnter(map, nd || undefined); return; }
  story.veil(true, CUT_MS);
  setTimeout(()=>{ open(map, nd || undefined); }, CUT_MS);
}
export function setFlightOpener(fn){ flightOpener=fn; }
/* ══⚠⚠ **暫時不可離港**（`sail.hold`，ver -655，Ray：「自由探索，不可離港，
   離港會跳訊息：『不能丟下同伴。』」）══════════════════════════════════
   `need` 立了、`until` 還沒立 → 出航被擋，就地浮一句（走路人單句那一套）。
   ⚠ 它與 `sail.flag` 是**兩件事**，不要合併：`flag` ＝「船還沒到手」（一去不回的
     前置），`hold` ＝「這一段劇情裡不准走」（會開會關的暫時狀態）。
   ⚠ 鐵律 9：`until` 那支旗誰插的要答得出來 —— 現在**還沒有人插**
     （下一段劇情的稿還沒到），所以這一版走到這裡就是走不掉的，那正是 Ray 要的。
   ⚠ 沒有名字欄 ＝ 旁白（那句話是主角自己的念頭，不是誰在講）。 */
function sailHeld(){
  const n=node(), h=n && n.sail && n.sail.hold; if(!h) return null;
  if(h.need && !prog.hasFlag(h.need)) return null;
  if(h.until && prog.hasFlag(h.until)) return null;
  return h;
}
/* ══⚠⚠ **「出不了港」有它的窗口**（ver -925，Ray：「stage4 前可自由進出夏爾村，
   不會跳船沒修好不能離開」「stage7 結束後夏爾村就恢復自由進出」）══
   `sail.blockFrom:<章>` ＝到那一章才開始擋；`sail.blockUntil:'<旗>'` ＝那支旗立了就不再擋。
   窗口外一律當成「船能走」——連那句旁白都不出（那句話在窗口外是錯的：
   早訪的玩家根本還沒有那條劇情線）。
   ⚠ 為什麼不寫成「插一支旗解鎖」：解鎖旗要有人插，而 stage4 之前那一段根本
     沒有事件可以插它（鐵律 9：答不出誰插的旗就不要加）。章節本來就是既有的量。 */
/* ══⚠⚠⚠ **店舖裡演完一段之後，要再問一次「這一格現在該演什麼」**（ver -1368，
     Ray：「索拉娜的武器店打靶劇情未觸發」）══════════════════════════════════
   東泊武器店那一段的稿是「**打靶挑戰後**：索：也讓我試試嘛！」，程式上掛在
   `acts`（`withWho:'SORANA'` ＋ `need:'ep_range_done'`）—— 而 `acts` 是**抵達時**
   才演的。打完靶人還站在店裡，收尾只做了「清場 → 還原導覽 → `shopEnter()`」，
   **從來沒有再問過一次** ⇒ 旗插了、那一段卻要走出去再走回來才看得到。
   ⚠⚠ 這與 ver -599（「一段 `acts` 演完就立刻接下一段」）是**同一條規矩漏掉的第二個
     入口**：那一版把「抵達要演什麼」包成可重入的 `runArrival`，但只有 `acts` 自己的
     收尾會再叫它 —— **店舖那兩段（打靶／交談）沒有接上**。
   ⚠ 收成這一支，兩個呼叫端共用（鐵律 8）：日後店舖再多一種會插旗的互動，
     照樣呼叫它就好，不要各自判一次。
   ⚠ **只有真的有段落到期才轉場**：沒有就照舊回店裡（`shopEnter`）——
     不然每次跟店主講完話都會跑一遍抵達流程（旅店招呼會重播，同 `resume()` 的理由）。 */
let rerunArrival=null;
/* ══⚠⚠⚠ **「這一次抵達是小睡醒來的」**（ver -1396）══ 一次性的閂：
   `napArm()` 插上 → 下一次 `runArrival` 取走並清掉 ⇒ 那一次**只演 `sleepFirst` 那一段**。
   ⚠ 誰插的：旅店的小睡演完（`inn.sleepHere` 走 `host.napArm`）。
     誰清的：`runArrival`（取走即清）。兩個都答得出來（鐵律 9）。
   ⚠ 它**不進存檔**：小睡與那一段戲之間沒有任何可以離開的空檔（黑幕蓋著），
     真的被打斷（重整）也只是回到「按一次睡覺」那一步，不會卡住。
   ⚠ 離城要清（`close()`）—— 同 `rerunArrival`，不要把上一座城的狀態帶過去。 */
let napPending=false;
/* 「這一格現在有沒有段落到期」→ 有就原地接上，回 true。⚠ 兩個呼叫端（店舖收尾、
   旅店的坐坐／睡覺收尾）共用這一支 —— 它們的差別只有「沒有到期時要做什麼」。 */
function rerunIfDue(n){
  const nd = n || node();
  /* ⚠ 小睡醒來那一次要問的是 `sleepFirst` 那一組（見 `napPending`）。 */
  if(rerunArrival && nd && (napPending ? actDue(nd, true) : actDue(nd))){
    rerunArrival(true); return true; }
  return false;
}
function backToShop(n){
  if(rerunIfDue(n)) return;
  shopEnter();
}
function sailBlocked(sail){
  if(!sail) return false;
  if(sail.blockFrom!=null && prog.getStage() < (sail.blockFrom|0)) return false;
  if(sail.blockUntil && prog.hasFlag(sail.blockUntil)) return false;
  return !(!sail.flag || prog.hasFlag(sail.flag));
}
function setSail(){
  const n=node(), sail=n && n.sail; if(!sail) return;
  const held=sailHeld();
  if(held){
    /* ══⚠⚠ 不可離港時可以演**一段帶立繪的對白**（`hold.lines`，ver -1352）══
       Ray 的東泊稿：「若點出航跳出蕾娜　蕾：『時間有限喔，別再亂跑了，
       先去貝利薩爾遺址吧。』talkwork」—— 那是**她開口**，不是一行浮字。
       ⚠ 走的是 `sail.blocked` 那一條**既有**的路（同一支 `playAdhoc`、同一套
         `busy`／`showNav`／第一句等立繪站定），不是第二份實作（鐵律 8）。
       ⚠ 沒寫 `lines` 就照舊走 `text` 那一行浮字（北方泊地的 `hold` 不必改）。 */
    if(held.lines && held.lines.length){
      if(busy) return;
      busy=true; showNav(false);
      if(chatterOn){ story.hideBubble(); chatterOn=false; }
      const n2=node();
      const play=held.lines.map((l,i)=> (i===0 && l && l.delay==null)
        ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
      story.playAdhoc(play, ()=>{ story.clearCast();
        busy=false; refreshArrows(); showNav(true); }, { sides:held.sides||(n2&&n2.sides) });
      return;
    }
    story.flashLine(held.text||'', ''); chatterOn=true; return;
  }
  if(!sailBlocked(sail)){
    /* 船已經到手：交給飛行頁。⚠ 城鎮的位置目前不存 —— 飛行頁那邊回來時走的是
       `tivot_flight_ret_v1`（座標），城鎮節點要不要一起存是另一件事（§6.9 的清單）。 */
    stepSfx();
    /* 出航也是「離開這張地圖」（ver -928，見 leaveMapRitual）：沒踩到結算怪就在這裡
       結算，沒帳也要先閉棺 —— 閉完才把畫面交給飛行頁。
       ⚠ 先立 `busy`／收導覽：這一段期間門與結算頁在演，方向箭頭不該還按得動。 */
    busy=true; showNav(false);
    if(chatterOn){ story.hideBubble(); chatterOn=false; }
    leaveMapRitual(()=>{
      /* ⚠⚠ **先把城鎮的介面收起來**（ver -437）：`flight-on` 只是把舞台藏起來，
         交棒進戰鬥那一刻它會被拿掉 —— 不收的話方向箭頭與地名就從槍棺底下冒出來
         （見 `suspend()` 的說明）。狀態留著，回來時 `resume()` 接回去。 */
      suspend();
      /* ⚠ 走注入的開啟器（ver -388）：飛行頁現在是**內嵌 iframe**，不跳頁 ——
         跳頁會讓音訊要重新解鎖（見 CLAUDE.md §6.10）。town 不 import main，所以用注入。 */
      /* ⚠ 把這座城的**出港位**帶給啟動層（ver -565）：沒有這一手，出航一律重載
         飛行頁＝船回到帝都出港位 —— 從北方泊地出航會瞬移回帝都。 */
      if(flightOpener) flightOpener(sailFrom()); else location.href='flight/index.html';
    });
    return;
  }
  /* ══⚠⚠⚠ **擋下來就一定要說一句**（ver -1154，Ray：「進了遺蹟無法出航」）══
     以前這裡是 `if(!sail.blocked) return;` —— 旗沒立、又沒寫台詞的節點，
     按下去**什麼都不會發生，也沒有任何訊息**。玩家（與我）只會讀成「壞了」。
     實測：試飛落在伊甸古墓（`got_ship` 沒立），出航箭頭在、按下去毫無反應。
     ⚠ 這與 §6.5.5「還不能做不要靠藏起鈕擋」是同一條的另一半：
       鈕要在，**而且按下去要有回應** —— 沉默比藏起來更糟，它看起來像壞掉。
     ⚠ 名字欄空著＝旁白（同旅店「現在不是睡覺的時候。」）。 */
  if(!sail.blocked || !sail.blocked.length){
    story.flashLine(SAIL_NO_SHIP, ''); chatterOn=true; return;
  }
  busy=true; showNav(false);
  if(chatterOn){ story.hideBubble(); chatterOn=false; }
  /* 第一句等立繪站定（同 enter 的作法：立繪滑入 450ms，框太早上就變成「先講話人才到」）。 */
  const play=sail.blocked.map((l,i)=> (i===0 && l && l.delay==null)
    ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
  story.playAdhoc(play, ()=>{ story.clearCast();
    busy=false; refreshArrows(); showNav(true); }, { sides:n.sides });
}

/* ══ 進節點 ══ */
export function enter(id){
  /* ⚠ 上一個畫面的**場景黑幕**要收（ver -881，見 story.clearSceneFade）——
     城鎮不經過 story 的 resetStage，帶著 `fadeOut` 的那一拍離場之後那片黑幕會
     一直蓋在場景區上，而且點不掉。這是 §6.5.4 檢查表該有而漏掉的一項。 */
  /* 上一個畫面留下來的舞台層一次收乾淨（ver -896，見 story.clearStageLeftovers）：
     黑幕／提示遮罩／染色／中景層。⚠ 新增舞台層時加進**那一支**，不要在這裡補。 */
  story.clearStageLeftovers();
  /* 地圖鈕是**常駐配件**（ver -899）：每次進一格都確認它在（第一次會建，之後冪等）。
     ⚠ 掛在這裡不掛在 `showNav(true)` 裡 —— 那一支在對白期間根本不會被叫到，
       而 Ray 要的正是「對話期間 icon 也要在」。 */
  showMapBtn();
  showEscortBadge();   // 同行徽（ver -1348）：冪等，沒在約會就自己移除
  /* ⚠⚠⚠ **提早 return 的路徑要自己把黑幕掀開**（ver -903，「畫面變黑」調查的第三處）：
     切景是「`sceneCut` 淡到全黑 → `enter()` 擺好新的一景 → `enter()` 淡回來」，
     **淡入的擁有者是 `enter()`**（§6.5.4「淡出與淡入的擁有者是分開的」）——
     所以它中途 return 就等於「黑幕沒有人掀」，畫面全黑而且點不掉。
     ⚠ 這兩道 return 是資料壞掉才會走到（沒有這座城／沒有這一格），但**壞資料不該
       變成黑畫面**：要讓玩家看得見自己卡在哪裡，才有機會回報。 */
  const bail = (why)=>{ console.warn('[town] '+why); story.veil(false, 0); busy=false; };
  const T=TOWNS[townId]; if(!T){ bail('沒有這座城：'+townId); return; }
  const n=T.nodes[id];  if(!n){ bail('沒有這個節點：'+id); return; }
  nodeId=id;
  /* ══⚠⚠ **這一格自己的環境音**（ver -1565 建、**-1568 改成循環**，Ray：
     「水拾洞跟瀑布底兩個場景都要播 se_waterfall」→「waterfall 在**場景內要一直 loop**」）══
     節點寫 `amb:'<音效名>'`。
     ⚠⚠ **每一格都要叫一次**（沒寫就是傳 null ＝停）—— 這一行同時是「開」與「收」：
       走到沒有 `amb` 的那一格，上一格的瀑布聲就停了。
       ⚠ 寫成「有 `amb` 才叫」的話，**離開那一格時沒有人收**，瀑布聲會跟著玩家
         走遍全城（§6.5.4 那張檢查表的第一句：「換畫面時誰收它？」）。
     ⚠ 同名不重播（`playAmb` 自己判）：走一步、推一句對白都會再經過這裡。
     ⚠ 一次性的音效仍走拍上的 `se:`（`story.playSe`）—— 兩者是不同的東西。 */
  try{ story.playAmb(n.amb || null); }catch(_){}
  const carried = carriedIn; carriedIn = false;   // 只吃這一次抵達（ver -496）
  storyActNow = false;                           // 換一格就重算（ver -680）
  /* ⚠ 上一個地點開出來的「下一步去哪」在這裡結算（ver -440，見 `resolveFavor`）——
     要在演任何東西之前，好感度是這一步的結果，不是這一段對白的結果。 */
  resolveFavor(id);
  /* 「回去」該掛哪一支箭（ver -405，Ray：「左進右出，上進下出」＝來時方向的**反向**）：
     按 UP 進來按 DOWN 回去、按 LEFT 進來按 RIGHT 回去。走別的路徑進來（開城第一格、
     戰鬥交棒回來、讀檔）時 `pendingDir` 是空的 → `backDir` 歸零，退回「掛在下」。 */
  backDir = pendingDir ? (OPPOSITE[pendingDir] || null) : null;
  pendingDir = null;
  /* ⚠⚠ **換節點先收乾淨**（鐵律 8）：
       ① 還在播的臨時段落要中止 —— 不中止的話它會在新的地點上把上一段演完（實測過）；
       ② 立繪是持續狀態，要清場，不清的話上一個地點的人會站在新的背景前面。
     兩件事各只有一支實作（`story.endAdhoc` / `story.clearCast`）。 */
  /* ⚠ 還有第三件：**抵達停頓的計時器**（`ARRIVE_MS`）也要取消 —— 不取消的話
     上一個地點的對白會在**一秒後於新地點開演**（實測：從西區立刻回廣場，
     諾薇兒的「肚子餓」就跑到廣場上演了）。 */
  clearTimeout(arriveT); arriveT=0;
  /* ══⚠⚠⚠ 「走進旅店就解除約會」**整條拿掉**（ver -1097，Ray：「因為帝都還沒有
     設計約會事件，只會變成無意義的動作，當初只是測試還沒放事件」）══
     -576 寫的是「出城鎮、回旅店以後就要解除約會」，但那時帝都的約會**沒有內容**
     ——「約出來走一段就回房」是測試用的鷹架，不是規矩。真正的規矩只有一條：
     **離開這張地圖才解除**（`suspend`／`close`）。
     ⚠ 所以 -1096 那個逐城的 `dateEndAtInn` 也一起退休了：一條規矩不需要例外，
       留著就是同一件事兩個真相（鐵律 7）。
     ⚠ 帝都的諾薇兒約會因此會撐到出城為止 —— 那正是它本來就該有的樣子。
     ⚠ 「一天內同人不能約第二次」（`datedToday`）沒有動，重複約還是擋得住。 */
  story.endAdhoc();
  story.clearCast();
  chatterOn=false;          // ⚠ 第四件：上一個地點的路人單句（見 §6.5 的新路徑檢查表）
  inn.close();              // ⚠ 第五件：上一個地點的旅店大廳（同一張檢查表）
  shopClose();              // ⚠ 第六件：上一個地點的店舖選單（ver -404，同一張檢查表）
  /* ⚠⚠ 第七件：**黑幕在這裡亮回來**（ver -430；-438 起每一次換景都會蓋著進來）。
     `sceneCut()` 只負責淡出，因為只有這裡知道新的一景什麼時候擺好 ——
     兩邊都收就會有兩段淡入互相打架。
     ⚠ 等一拍再亮：背景是非同步載的（`bgFor`），立刻亮會看到上一張圖。
     ⚠ 睡到隔天七點被強制移到船塢那一次也走這裡（那時黑幕是旅店留下來的）。
     ⚠⚠ **等新的背景真的擺好才掀**（ver -442，Ray：「城鎮場景切換都會多閃一下
       原場景」）。-438 是「換景之後固定 300ms 掀」，但背景是**非同步**載的：
       候選鏈要逐個試（沒有該時段的差分時，先吃 4 個 404 才退回 `_Day`），
       慢網下更久。時間到了圖還沒到 → 掀開來看到的是**上一個地點**的背景，
       一格之後才換掉 ＝ 那一下閃。
     ⚠ 保底 `REVEAL_CAP_MS`：請求整個卡住也要亮回來，不能把玩家留在全黑裡。
     ⚠ 只掀一次，而且**這一次 enter 專屬**（`my!==enterSeq` 就作廢）——
       連走兩步時，前一次的保底計時器不該把後一次的黑幕掀掉。 */
  const my=++enterSeq;
  const needReveal = story.veilOn();
  let revealed=false;
  /* ⚠⚠ **背景還在載的那一段，黑幕蓋著是合法的**（ver -926）：暗罩守望的前提是
     「導覽出來了 ⇒ 畫面就該亮」，但這裡是「亮不亮要等背景」（`bgFor` 的回呼）——
     慢網或冷快取時導覽會比背景先到，於是每進一格都誤報一次。
     `revealPending` ＝這一次抵達還在等背景；守望在那期間不驗（見 showNav）。 */
  revealPending = needReveal;
  const reveal=()=>{
    if(revealed || my!==enterSeq) return;
    revealed=true; revealPending=false;
    /* ⚠ 隔一幀再掀：`setSceneBg` 那一下只是換 `src`，讓瀏覽器先畫出來再淡。
       ⚠ 時長讀 `cutMs`（這一次切景的黑幕多長，淡出淡入要同長，ver -739）——
         讀完歸位 CUT_MS：`open()`／resume 那些不經過 `sceneCut` 的 enter
         不該沿用上一次劇情轉場的 3 秒。 */
    requestAnimationFrame(()=>{ if(my===enterSeq){ story.veil(false, cutMs); cutMs=CUT_MS; } });
  };
  if(needReveal) setTimeout(reveal, REVEAL_CAP_MS);
  bgNat=null;               // 背景要重載，舊的尺寸不能拿來擺旅店那兩顆行動鈕
  /* 這座城的曲子（ver -375（-893 前用詞））。⚠ 每進一個節點都確認一次，不是只在 `open` 時放一次 ——
     中間可能插進一場戰鬥（戰鬥有自己的曲子），回來要接得回去。
     同曲重播由 `playBgm` 自己擋掉，所以重複呼叫是安全的。 */
  story.ensureBgm(townBgm());
  story.setBgFlip(!!n.bgFlip);   // 背景鏡像（ver -877：崩塌走道×2 同圖翻轉）
  bgFor(bgCandsOf(n, id), needReveal ? reveal : null);
  ensureLayer(); bindInput(); refreshArrows(); showNav(false);
  /* ⚠⚠ 進場對白**一律只播一次**（ver -373，Ray：「對話只觸發一次，不重複觸發」）——
     不再看節點的 `once` 欄位：漏寫就會變成每次進去都重播，那是「預設值站錯邊」。
     旗標記在 progress 的 flags，存檔要帶。 */
  /* 這一趟是不是「第一次進這座城的旅店」（ver -1102，見 innSeenFlag 的說明）。
     ⚠ 要算在**記旗之前**，而且每次抵達都重算 —— 走掉就自己歸零。 */
  innFirstVisit = innActive(n) && !prog.hasFlag(innSeenFlag(id));
  markSeen(id);                       // 走到過（給「走完城裡所有地點」用，ver -392）
  /* ══ 初見劇情的旗標（ver -401，Ray：「城內其他地方的初見劇情保留，下次回來或
       **進入他城同質店**時觸發初見劇情」）══
     節點寫了 `kind` 就用**同質**的旗標（`town_kind_<kind>`）—— 那一段是「第一次走進
     這種地方」的戲，不是「第一次走進帝都那一間」。於是：
       · 在帝都沒看到（打烊／被傍晚的提醒插隊／中途離開）→ 下次回來還看得到
       · 到了別的城的同一種店 → 那時才第一次看到，照樣演
       · 已經看過了 → 別的城的同一種店不再重播
     ⚠ 沒寫 `kind` 的節點照舊用「這一城的這一個節點」當旗標（劇情專屬的地方）。
     ⚠⚠ 換旗標名等於**舊存檔的那幾段會再演一次** —— 開發期可接受，上線前若要保留
       舊存檔，得在 `progress` 做一次搬遷。 */
  const flag = flagOf(n, id);
  const played = prog.hasFlag(flag);
  /* ⚠ **打烊時不播進場對白**（ver -391）：在一間關著的店裡讓店主開口是錯的。
     旗標也不會記，所以那一段會留到下次在營業時間內進來時才播 —— 不會漏掉。 */
  /* ⚠⚠ **傍晚的提醒讓過一次才強制**（ver -430 改，Ray：「要等角色先把原有的場景對話
     講完才觸發，移動到下一個場景才強制觸發」）：到期的那一次若這個地點還有自己的
     進場對白，就讓它先講完（記 `eveningHeld`）；**下一次抵達**才不由分說地插隊。
     插隊的那一次仍**取代**該次的進場對白，而那一段的旗標不會記 —— 下次再進來還是
     會演（同上面「打烊不播」的作法）。 */
  /* ══ 主線段落（`acts`，ver -424（-893 前用詞））══════════════════════════════════════
     節點可以掛**好幾段**主線戲，各自帶旗標與條件（目前只有 `day`：遊戲內第幾天）。
     ⚠ **優先於傍晚提醒與進場對白** —— 那兩者是氣氛，這是主線，順序不能反。
     ⚠ 旗標同樣**演完才記**（見下方的收尾）：中間可能插一場戰鬥，打輸會被丟回首頁。 */
  /* ⚠⚠ **主線段落不受「回房休息」擋**（ver -581 修，Ray：「帝都劇情第二天出航的
     trigger 壞了」）。ver -459 原本連 `acts` 一起擋，而 -566 加了那條總則
     —— `stage1_open` 之後諾薇兒預設在房內（`restingSet()` 的最後一段）——
     兩條合起來就成了**矛盾**：船塢那一段的條件正是 `need:'stage1_open'`，
     而它的台詞裡有諾薇兒 → 開啟它的那個旗標同時把它擋死，**永遠演不到**
     （實測 -566 之後第二天出航整段不出來）。
     ⚠ 正解是分清楚兩者：休息擋的是**氣氛對白**（Ray -459 的原話是「城鎮與她相關的
       對話」）；**主線段落是劇本**，它說誰在場誰就在場 —— 更何況玩家是被那條主線
       強制搬到船塢的，用「她在房裡」把戲擋掉講不通。
     ⚠ 進場對白（`own`）與傍晚提醒照舊要看休息，見下面的 `linesBlockedByRest`。 */
  /* ══⚠⚠ **一段 `acts` 演完就立刻接下一段**（ver -599，Ray：「教堂的中 boss 打完
     立刻進劇情，不用進出」）══ 以前 `acts` 一次只取一個到期的，第二段要走出去再
     回來才演 —— 而「打完 Boss 就站在原地看下一幕」才是那一段戲要的節奏。
     ⚠ 作法是把**抵達要演什麼**整段包成一支可重入的 `runArrival()`：
       演完的收尾發現還有下一段就再叫自己一次（鐵律 8：不要把播放與收尾複製第二份）。
     ⚠ 接續的那一次**不停一秒**（`immediate`）：抵達停頓是給「剛走到一個新地方」用的，
       原地接下一段再停一次只是空等。
     ⚠ 不會無限迴圈：`acts` 的旗標是演完才記的，記了 `actDue` 就不再回它。 */
  /* ⚠⚠ 圖名卡擋在**抵達演出**之前（ver -879，Ray：「點掉之後才會開始對話或
     其他動作」）：卡還在畫面上時什麼都不演，點掉才跑這一段（見 gateArrival）。 */
  gateArrival(()=>runArrival(false));
  /* ⚠⚠ **把它發佈出去**（ver -1368）：店舖那一段（打靶／與店主交談）演完之後
     要能再問一次「這一格現在該演什麼」——而 `runArrival` 是 `enter()` 的巢狀函式，
     那邊拿不到。指過去（不是複製一份，鐵律 8）；離開這一格時由下一次 `enter` 覆寫、
     離城由 `close()` 清掉。 */
  rerunArrival = runArrival;

  function runArrival(immediate){
  /* ══⚠⚠⚠ **出怪的優先權**（ver -1063，Ray：「有對話的場景如果出怪，默認先戰鬥，
     戰鬥完才對話」）══ -862 原本是「`acts` 優先（劇本先走）」，現在**反過來**。
     ⚠ 這不會把對話吃掉：野怪那一段演完，`enter` 的收尾會接續再跑一次
       （`runArrival(true)`＝`immediate`），而 `immediate` **不擲野怪** ——
       所以第二趟必定輪到 `actDue`，讀起來就是「打完才講話」。
     ⚠ 一趟進圖同種不重複（`wildDone`），所以不會變成「打完又冒一隻」。
     ⚠ 休息處（`restActDue`）不受影響：那幾格一律 `noWild`，本來就不出怪。 */
  /* 追逐（ver -1389）排在最前：那一段古堡裡只有「走」與「打」，
     其餘的段落（約會收尾、常駐句）在那一夜都不該插隊。 */
  /* ⚠⚠ **小睡醒來那一次只演那一段**（ver -1396）：其餘的（追逐、野怪、約會收尾、
     常駐句）在那一刻都不該插隊 —— 玩家是「躺下去睡不著爬起來」，不是走進門。
     ⚠ 閂取走即清（見 `napPending`）：只作用一次。 */
  let act;
  if(napPending){ napPending=false; act = actDue(n, true); }
  else{
    /* ⚠⚠ **追兵與雜怪競合 ⇒ 追兵優先**（ver -1577，Ray 明講）—— 落地就是這個排序。
       ⚠ 它**不吃 `immediate`**（與雜怪不同）：雜怪那一支第二趟不擲是怕「打完又冒
         一隻」，而追兵**沒有擲骰子** —— 牠站在那裡就是站在那裡。真的不想連打兩場
         的話，牠打完會停 `stun`（`chaseAfterAct`），下一趟自然沒事。 */
    act = dragonActDue(n) || dragonTalkDue() || chaseActDue(n) || chaseNextAct(n)
        || (immediate ? null : wildRoll(n))
        || dateCurfewAct(n) || dateByeAct(n) || actDue(n) || restActDue(n);
    /* ══⚠⚠⚠ **安全點：先結算，再演劇情 —— 這是全域規則**（ver -1574，Ray：
       「安全點處如果有劇情 先跑結算再跑劇情 **這是全域規則**」）══
       ⚠⚠ 這**推翻了 -1433 的逐段宣告**：那一版是「預設先講話，要倒過來就在那一段
         寫 `afterSettle:true`」（只有獅階寫了）。現在**預設就是先結算**，
         `afterSettle` 變成多餘 —— 資料上留著不會壞（同樣的結果），但不要再新增。
       ⚠ 為什麼這樣才對：走進安全點的那一刻，玩家身上還揹著上一段的帳
         （用時／失誤／EXP／錢）。先演劇情等於**讓那筆帳在劇情演完之後才結** ——
         中間他可能又被追上、又打一場，帳就混進去了。**安全點的語意是「這一段到此為止」**，
         那就該先落幕再開下一場。
       ⚠ 結算那一段沒有 `flag`，所以它演完之後段落收尾的接續
         （`const nx=actDue(n)` → `runArrival(true)`）會**再回來演原本那一段**；
         那一趟 `restActDue` 已經沒有帳可報（`clearSessionGain` 清掉了），於是輪到它。
         —— 這就是「先結算、再劇情」真正的落地方式，不是把兩段串起來。
       ⚠ `restActDue` 自己會擋「這一趟還沒打過架」（回 null）⇒ 沒有帳的時候
         這一條等於不存在，劇情照舊直接演。 */
    { const r = (n && n.rest) ? restActDue(n) : null;
      if(r && act !== r) act = r; }
  }
  let ev = act ? null : eveningDue(n);
  /* 這一次抵達**原本**要演的進場對白（打烊、演過了、或段落裡有**回房休息的夥伴**
     （ver -459，見 linesBlockedByRest）就是空的 —— 後者旗標不記，之後照演）。
     ⚠ `expire:<旗標>`（ver -460，Ray：「肚子餓跟餐酒館的劇情過了就沒有了，
       回頭也不會再觸發」）：這一段**綁著某個當下**（上街區的肚子餓與餐酒館那頓飯
       是第一天的戲），那個旗標一立（stage 0 的夜過去＝stage1_open）就永遠不演 ——
       與 -459「保留到他回隊」相反，哪一種由**節點自己**宣告。 */
  const expired = !!(n.expire && prog.hasFlag(n.expire));
  /* ⚠ **戰鬥地圖不播進場對白**（ver -584）：那一段是「第一次走進這個地方」的氣氛戲，
     城裡正在被禍魘襲擊時演它是錯的。旗標也不會記 —— 城鎮戰結束後正常走進來照演。
     ⚠ `acts` **不受這一條管**：城鎮戰的那幾場戰鬥就是掛在 acts 上的。 */
  const own = (siegeOn() || mutedTalks() || played || expired || !isOpenNow(n) || linesBlockedByRest(n.lines))
            ? [] : (n.lines||[]);
  /* ⚠⚠ **傍晚那一格不搶這一段戲**（ver -430，Ray 指定）：讓節點自己的對白先講完，
     移動到**下一個地點**才強制觸發。⚠ 只讓一次（`eveningHeld`）—— 否則一路走過
     還沒看過的地點會永遠讓下去，「強制」就名存實亡。 */
  if(ev && !eveningHeld && own.length){ eveningHeld=true; ev=null; }
  /* ══ 被抬回旅店、初見還沒看過（ver -496，Ray：「如果在那之前還沒觸發旅店初見
     就優先跑諾薇兒一句『啊，醒了。』」）══
     這一拍**取代**該次的進場對白（被抬進來的人聽店員「歡迎光臨」是錯的），
     而初見的旗標**不記** —— 下次正常走進來照演（同打烊／傍晚插隊的作法）。
     初見已經看過＝什麼都不演（正常的安靜抵達）。 */
  const wake = (carried && !played && n.wake && n.wake.length) ? n.wake : null;
  if(act && act.storyBattle) storyActNow = true;   // 這一段是劇情戰（ver -680，見 storyBattleAct）
  const lines = act ? actLines(act)
              : ev ? ev.lines
              : wake ? wake
              : own;
  /* ⚠ 旗標**演完才記**（ver -375（-893 前用詞） 由「開演就記」改過來）：這一段中間可能插一場戰鬥，
     打輸了會被丟回首頁 —— 開演就記的話，回頭再走一次公會就整段跳過，那一場永遠打不到。
     「沒演完就不算演過」才是對的。代價：中途離開會再看一次，那本來就該再看一次。 */
  if(lines.length){
    /* ⚠ **先停一秒再放人**（Ray 指定）：剛走到一個新地方，玩家要先看得到那是哪裡；
       立繪與對話框跟著背景一起跳出來，等於沒有「抵達」這一拍。 */
    busy=true;
    arriveT=setTimeout(()=>{ arriveT=0;
      /* ⚠⚠ **立繪與對話框要一起出來**（ver -374，Ray：「現在是先出對話不出立繪，這不對」）。
         立繪滑入要 450ms，而對話框是這一拍一開始就上 —— 於是看起來是「先講話、人才到」。
         作法：給**第一句**加 `delay`（story 的既有機制：框先不出，等這麼久再打字），
         值就是滑入時間。⚠ 只加在第一句，後面幾句的人已經在台上了。
         ⚠ 不改成全域規則：主線那邊的節奏是 Ray 一句一句調過的，動它會全部走鐘。 */
      const play=lines.map((l,i)=> (i===0 && l && l.delay==null)
        ? Object.assign({}, l, { delay:SLIDE_MS }) : l);
      /* ⚠ 對白演完**把立繪全撤**，只留背景與導覽（Ray 指定）。 */
      /* ⚠ `n.sides`：兩個角色同台要分左右（§6.5）——城鎮這條路徑一樣要吃得到。 */
      /* 特殊戰開演前**拔旗**（ver -634（-893 前用詞），Ray 指定）：這一段真的要打一場，
         那一刻這張地圖就不是安全區。演完由下面插回去。
         ⚠ 拔在**開演**、插在**演完** —— 中途離開（或打輸）會停在「拔掉」的狀態，
           下次走進來這一段還在（`flag` 沒記），照樣拔了再打，收尾時一起插回去。 */
      if(act && act.pullSafehouse) prog.removeFlags([safehouseFlag()]);
      story.playAdhoc(play, ()=>{ story.clearCast();
        if(act){
          if(act.pullSafehouse) prog.addFlags([safehouseFlag()]);   // 打完插回去（見上）
          /* ver -858：acts 也吃 `line.aff`（演完一次記帳，同進場對白那一支）——
             退燒藥那一段的蕾娜/諾薇兒 +5 掛在段落上，以前只有進場對白會結。
             ⚠ applyAff 是**整段盲加**：有分歧的段落把 aff 放在無分歧的拍上
               （分歧內的入帳走 story.js 的逐拍 take/give/money 那一族）。 */
          applyAff(play);
          if(act.flag) prog.addFlags([act.flag]);                 // 主線段落：只演一次
          /* ══ 追逐：打完一場，牠往**玩家進入房間的反方向**跑一格（ver -1421）══
             ⚠ `backDir` 是「回頭路」，**牠要跑的是它的反向**（＝玩家原本前進的方向）。
             ⚠ ver -1433：自動模式（-1421 的「超過 5 場自己往王座之間走」）**已取消**
               —— 這裡只剩計數：`dragonFights` 這一趟打了幾場、`dragonSeenFights`
               開圖之後打了幾場（`afterThree` 那一段的門檻）。
             ⚠⚠⚠ **ver -1446：條件由「不是王座／afterThree」改成「這一段真的是一場
               追擊戰」**（Ray：「為什麼一結算龍的位置就重置了？」）——
               舊寫法是**排除法**，於是那一夜在古堡裡演完的**任何**段落都會算一場：
               休息處的結算（`restActDue` 那一段）、獅階的「把牠往這個方向逼！」、
               降落中庭與進前廳那幾段…… 每一段都 `dragonFights++` **而且叫一次
               `dragonFleeStep`** ⇒ 玩家看到的就是「我只是踩到休息處結算了一下，
               牠的位置就變了」，而且 `afterThree` 那一段的門檻也被灌水。
               ⇒ 改成**白名單**：只有 `DRAGON_LINES.chase[*]` 與 `chaseMore`
                 （＝真的有 `{battle:'bl_chase'}` 那一拍的段落）才算。
                 王座（`throne`）與 `afterThree` 自然不在名單裡，不必再排除。
               ⚠ 這與鐵律 13「名單一律寫成安全的那一側是預設」是同一件事：
                 白名單漏寫的下場是「少動一次」，排除法漏寫的下場是「亂動」。 */
          const isChaseFight = dragonChaseOn() &&
            (act===DRAGON_LINES.chaseMore || DRAGON_LINES.chase.indexOf(act)>=0);
          if(isChaseFight){
            dragonFights++;
            /* ⚠ ver -1433：開圖之後的場次另外數（`afterThree` 那一段的門檻）——
               自動模式那一條已取消。 */
            if(prog.hasFlag('bl_dragon_seen')) dragonSeenFights++;
            /* ⚠ 攤開地圖那一下已經把牠挪到隔壁了（見 showMapForStory）⇒ 不再挪第二次：
               一場戰鬥只移動一格。 */
            if(dragonJustPlaced) dragonJustPlaced=false;
            else dragonFleeStep(backDir ? OPPOSITE[backDir] : null);
          }
          /* ══ 追兵（ver -1577）：這一段演完了 ══ 場數／`resetAt` 歸位／擊退後停頓，
             三件都在 `chaseAfterAct` 一支裡（鐵律 8）。
             ⚠ 「這一段算不算一場」問 `actHasBattle`（＝資料上真的有戰鬥拍）——
               與 -1446 龍那一課同一個道理：用排除法的話，休息處的結算、
               純對白的段落都會被算成一場，而那不會有任何錯誤訊息。
             ⚠ 排在 `goto` **之前**：歸位看的是「打完的那一刻人在哪一格」。 */
          chaseAfterAct(act, actHasBattle(act));
          /* 段落自己的章節（ver -742，Ray：「北泊出航插 stage5，插在眾人給諾薇兒
             送行那一段」）—— 與閘門的 `stage` 同一個語意（clockGate 也是直接 set）；
             重播由 `flag` 擋著，不會倒退（讀檔在更後面的章節時 flag 早就立了）。 */
          if(act.stage!=null) prog.setStage(act.stage);
          /* `safehouse:true`：這一段演完＝**這張地圖從此是安全區**（ver -634，見
             `safehouseFlag` 的說明）。`flag` 記的是「演過了」，這一支記的是
             「這一段讓世界變成什麼樣」—— 語意不同，不要共用一格。
             ⚠ 同樣是**演完才記**（打輸回頭再走一次還要能打）。 */
          if(act.safehouse) prog.addFlags([safehouseFlag()]);
          /* 劇情探索 ⇄ 自由探索（ver -666）：同樣是**演完才記**。
             ⚠ 記的是「自由探索」那一支旗（見 `freeExploreFlag` 的說明）。 */
          if(act.endStoryExplore) prog.addFlags([freeExploreFlag()]);
          if(act.storyExplore)    prog.removeFlags([freeExploreFlag()]);
          /* ══⚠⚠ `endDate:true` ＝這一段演完，約會結束（ver -1346，Ray 的東泊稿：
             「時間超過 18:00，而角色不在旅店」那一段 —— 她自己先回旅店了）══
             ⚠ 走既有的 `endDate()`（唯一那一支，鐵律 8）：它只解除**約會**那一種
               同行，殘留事件帶起來的不受影響。
             ⚠ 排在 `flag` 之後 —— 那一段自己的旗要先記，不然下一次抵達又演一次。 */
          if(act.endDate) endDate();
          /* ══⚠⚠ `act.clockToday:<時>` ＝這一段演完，時鐘推到**今天**的那個時刻
             （ver -1394，Ray：「巧遇蕾娜後回到旅店的時間是 18:00」）══
             ⚠ 走 `clock.advanceToHour`（**只往前、已經過了就不動** —— 時間是資源，
               倒轉就是漏洞）。與傍晚那一格的 `ev.hour` 是**同一支**（鐵律 8）。
             ⚠⚠ **與閘門的 `clockTo` 不是同一件事**，所以不共用名字：
               閘門的 `clockTo` 是 `advanceToNextHour`（**推到下一個**這個時刻，
               過了就跳隔天）；這裡是「今天的那個時刻」。名字不同才不會有人抄錯。
             ⚠ 排在 `goto` **之前**：那一段路是被跳過去的，時間要先到位 ——
               新的一格抵達時（進場對白、門燈、外出行程）問到的才是對的時刻。
             ⚠⚠⚠ **也吃 `{ hour, lateFrom }`**（ver -1396，Ray：「強制回到東泊的時間
               固定在 18:00，若在觸發首戰之前玩家時間已經超過 15:00，則每超過一小時
               就在 18:00 的基礎上加一小時」）——
               目標 ＝ `hour` ＋ max(0, floor(現在時刻 − `lateFrom`))。
               ⚠ 「每超過一小時」是**整小時**：15:30 還沒滿一小時 ⇒ 不加；16:00 ⇒ +1。
               ⚠ 溢出當天（`lateFrom` 那一條讓目標 ≥24）改走 `advanceToNextHour`
                 —— 那才是「隔天的那個時刻」，用 `advanceToHour` 會變成**不動**
                 （它只推今天、過了就不動），時間憑空少掉三小時。 */
          if(act.clockToday!=null) applyClockToday(act.clockToday);
          /* ══⚠⚠⚠ `act.dateSpent:true` ＝這一段**用掉了今天的約會額度**
             （ver -1394，Ray：「巧遇蕾娜後不能再約其他女孩出去／但是女角的頭像
               還是會在／改成敲房門」）══
             ⚠⚠ 它與「今天約了誰」（`datedSet`）是**兩件事**，所以是兩份狀態：
               · `datedSet`  ＝今天約的是**那個人** ⇒ 其他人的頭像**消失**（-1383）
               · `dateSpent` ＝額度用掉了、但**沒有約任何人** ⇒ 頭像**照舊都在**，
                 敲下去由「今天約過了」那一句擋回來（Ray 這一版指定的正是這個差別）
               合成一份就得在其中一邊寫例外，那正是鐵律 7 要消滅的東西。 */
          if(act.dateSpent) markDateSpent();
          /* ══⚠⚠ `act.goto` ＝這一段演完就**強制移轉**（ver -1353，Ray 的貝利薩爾稿：
             「（厚重推門聲）→ 大廳祭壇」「中庭場景」「強制移轉回東泊」）══
             ⚠ 走既有的 `forceGo`（不花時間、不看營業時間、不記來時方向；
               `@<地圖>:<節點>` 的跨圖語法它本來就吃得下，鐵律 8）。
             ⚠ 排在**旗標與檢查點之後**：先把「這一段演完了」記下來再走人 ——
               反過來的話中途被打斷會變成「人到了新的一格、旗卻沒記」。
             ⚠ 它與 `gates` 的 `goto` 是同一個語意，只是掛在段落上：
               閘門是「時鐘推到那一刻就發生」，段落是「這一段演完就發生」。 */
          /* ⚠⚠ 演完把旅店大廳重畫一次（ver -1346）：門燈是 `doorState()` 現算的，
             但那一支只在抵達與敲門之後跑 —— 這一段演的期間時鐘可能走了、旗可能立了
             （蕾娜晚上回來那一段就是兩者都有），門會停在進門那一刻的樣子。
             ⚠ 冪等、而且不在旅店時什麼都不做（`refreshDoors` 自己查 DOM）。 */
          try{ inn.refreshDoors(); }catch(_){}
          /* ⚠⚠ **主線段落演完也要開「下一步」的機會**（ver -664）：`nextFavor`
             以前只掛在**進場對白**那一支上，而第三天那些戲都是 `acts` ——
             於是「應要求直接去教堂 +5」整條不會生效（實測好感是 0）。
             ⚠ 段落自己可以帶一份（`act.nextFavor`），沒帶就用節點上那一份。
             ⚠ 與旗標同一個時機（**演完**才算）：中途離開就沒聽完那句話。 */
          armFavor(act.nextFavor ? act : n);
          /* ══ **一場戰鬥結束 ＝ 一個檢查點**（ver -590（-893 前用詞），Ray：「每次進城跟一場戰鬥
             結束都要有存檔點」）══ 城鎮的插入戰就是掛在 `acts` 上的（城鎮戰每一格
             都是一拍 `{battle:…}`），所以「這一段收完」＝「那一場打完、地圖回來了、
             旗標也記了」，正是該落檢查點的那一刻。
             ⚠ 落在**旗標之後**：早一步存的話那一場會再打一次。
             ⚠⚠ **純對白的段落不落**（ver -687，Ray：「又出現劇情戰戰敗後沒有回捲
               劇情的狀況，安雅的好感還在，也沒有觸發要求去教堂」）——
               -590 原本是「每一段演完都落一筆」，於是**回捲根本回不到哪裡去**：
               碼頭大道的請求、教堂的戰地醫院都各自落了一筆，戰敗讀回來的是
               「請求已經提過、好感已經加過」的那一刻，玩家看到的就是「沒有回捲」。
               Ray 的原話是「每次進城**跟一場戰鬥結束**都要有存檔點」——
               那才是段落邊界；純對白的段落之間不是。
               ⚠ 要在對白段落落點，腳本自己寫 `checkpoint:true`（ver -653 那一支）
                 —— 「這裡是一個可以回來的地方」是**劇本的判斷**，不是引擎的預設。
             ⚠ 走同一支 `checkpoint()`（進城那一支也是它，鐵律 8）。
             ⚠⚠ **「一場」之內不落檢查點**（ver -639，Ray：「『一場』戰鬥內不設紀錄點，
               戰鬥結算後才有」）。城鎮戰的每一格都是一拍 `{battle:…}`，照舊會逐格
               落一筆 —— 那等於把「一場」切成五個存檔點，與 §6.5.4.3
               「整張戰鬥地圖算同一場」互相矛盾（讀檔回到半場中間，資源卻是
               那一刻的殘量，玩家看到的是一個沒頭沒尾的段落）。
               ⚠ 判定讀 `state.battleSession`（**還開著＝這一場還沒打完**）：
                 收段那一場（Boss）打贏時 `endSession()` 已經把它清掉了，
                 所以那一格照樣落得到 —— 正好就是「戰鬥結算後才有」。
               ⚠ 純對白的段落不受影響（那時 `battleSession` 本來就是 null）。 */
          /* ⚠⚠ ver -1135：**安全點（`{settle:true}`）也落**（Ray：「戰鬥中死亡回到
             上一個踩過的安全點或結算點」）—— 休息處走進去就收局，那一刻正是
             「上一個踩過的結算點」。不落的話玩家在遺蹟裡走了半張圖收了一次局，
             死掉卻退回進圖那一筆，中間全白走。 */
          if(checkpoint && !state.battleSession && (actHasBattle(act) || actHasSettle(act)))
            try{ checkpoint(); }catch(_){}
          /* ══ 演完就出航（`sailOut:true`，ver -741，Ray 的 stage2 稿：碼頭道別
             之後「進入飛行畫面」）══ 走與 `setSail` 同一條交棒（suspend →
             flightOpener 帶出港位，鐵律 8）。不看 `sail.hold` —— 這是劇本要走，
             不是玩家自己按的；`np_leave_ok` 也已經在這一段的拍上插了（鐵律 9：
             那支旗的擁有者就是這一段）。 */
          if(act.sailOut){
            stepSfx();
            suspend();
            if(flightOpener) flightOpener(sailFrom());
            return;
          }
          /* 還有下一段就**原地立刻接上**（ver -599）——不停一秒、不必走出去再回來。
             ⚠⚠ **不可以接上「剛剛演完的那一段」**（ver -669，Ray：「還是卡諾薇兒
               不要催我」）：沒有 `flag` 的段落（＝每次抵達都演的「再訪」）演完之後
               `actDue` 照樣回它自己 —— 於是它會**立刻再演一次，永遠不停**。
               那不是「重播」而是**當場無窮迴圈**，畫面就卡在那一句上。
             ⚠ 判的是**物件本身**（`!==act`）不是「有沒有 flag」：日後若有兩段
               都沒有 flag，還是接得上另一段。 */
          /* ⚠⚠ **只接得上「有 flag 的下一段」**（ver -684，Ray：「第一次進教堂
             諾薇兒不會說不要催我，那是第二次以後」）：
             沒有 `flag` 的段落是**每次抵達都演的常駐句**（「再訪」），
             它本來就該等**下一次走進來**才講 —— 接在主線段落後面的話，
             第一次進教堂就會在戰地醫院那一段之後立刻補一句「不要催我」。
             ⚠ 這與 -669 的「不可以接上剛剛那一段」是同一族：**接續是給主線用的**，
               常駐句不屬於那條鏈。 */
          const nx=actDue(n);
          if(nx && nx!==act && nx.flag){ story.clearCast(); runArrival(true); return; }
          if(act.goto){ forceGo(act.goto); return; }   // 段落收尾的強制移轉（ver -1353，見上）
        }
        else if(ev){
          if(ev.flag) prog.addFlags([ev.flag]);                  // 傍晚那一句：只演一次
          /* ⚠ **強制移轉到旅店**（ver -427，Ray：「然後強制移轉到旅店，時間改為當天18:00」）。
             時鐘先推到 18:00 再走 —— 那一段路是被跳過去的，花掉的不是走路的時間。
             ⚠ `advanceToHour` **不會倒轉**：觸發時可能已經 18:05（走一步 10 分鐘）。 */
          if(ev.hour!=null) clock.advanceToHour(ev.hour);
          if(ev.goto && ev.goto!==nodeId){ forceGo(ev.goto); return; }
        }
        else if(wake){ /* 醒來拍（ver -496）：什麼旗標都不記 —— 初見留給下次正常抵達 */ }
        else{
          applyAff(lines);
          prog.addFlags([flag]);                  // ⚠ 演完才記（見上面的說明）
          /* 這一段演完才成立的事（ver -375）：公會登記完才開得了懸賞榜。
             ⚠ 記在**播完**時，中途離開（或戰鬥沒打完）就不算。 */
          if(n.boardFlag) prog.addFlags([n.boardFlag]);
          /* 這一段演完才開的那一次機會（ver -440）：下一步走去 `to` 就加好感。
             ⚠ 與旗標同一個時機（**演完**才算）—— 中途離開就沒聽完那句話，
               那時她還沒說她餓。 */
          armFavor(n);
        }
        /* ⚠ 時鐘閘門要在**對白演完之後**才判（ver -427）：那一段可能就是把時間推過
           七點的那一段（例如旅店的分支二）。放在開演前判會把演出腰斬。 */
        /* ══⚠⚠⚠ **閘門要判在「把畫面亮回來」之前**（ver -1658，Ray：「娜塔莉戰後
           對話完的翌日轉場，開場就要是碼頭送行的背景跟音樂，為什麼每次翌日完
           都是從墓地自動走過去？」）══════════════════════════════════════════
           `showNav(true)` 會順手叫 `story.assertNoDarkOverlay()`（暗罩守望，ver -903）
           —— 而墓地那一段是**刻意黑著收尾**的（`fadeOut:3000` ＋ 翌日卡；ver -1362
           就是為了這件事把 `fadeIn:3000` 拿掉，讓碼頭那一格自己亮）。
           守望把 `#storyFade` 清掉 ⇒ **墓地當場亮回來一眼** ⇒ 下一行才被
           `np_depart` 帶去碼頭。那一眼就是 Ray 講的「從墓地走過去」。
           ⚠⚠ **-1362 的修法沒有錯，是被這一行提前拆掉了** —— 守望是驗收
             （「導覽出來了 ⇒ 畫面就該亮」），而這裡根本還不該讓導覽出來：
             閘門下一拍就要接手轉場。
           ⚠ 閘門接手時它自己會 `busy=true; showNav(false)`（見 `clockGate`），
             所以「先亮再暗」本來就是多餘的一步，拿掉沒有別的副作用。
           ⚠ 沒接手（回 false）才把導覽放回來 —— 那是原本的行為，一個字沒改。 */
        if(clockGate()) return;
        busy=false; refreshArrows(); showNav(true);
        afterArrive(n); }, { sides:(act && act.sides) || n.sides });
    }, immediate ? 0 : ARRIVE_MS);
  }else{
    /* 順序同上（ver -1658）：接手的閘門先問，沒人接手才把導覽放回來。 */
    if(clockGate()) return;
    busy=false; refreshArrows(); showNav(true);
    afterArrive(n);
  }
  }   // ← runArrival
}

/* 進場對白（或傍晚的提醒）演完之後才成立的事。目前只有旅店大廳。
   ⚠ 兩條路（有對白／沒對白）都要呼叫它 —— 漏一條就是「有時候有大廳、有時候沒有」。 */
/* ══ 一次性的操作提示（ver -429）══════════════════════════════════════════
   資料在 `TOWNS[].tips`：`need` 的旗標到齊了就在**下一次抵達、對白演完之後**
   彈一次雪鐵龍箭，彈過就記 `flag` 不再出現。
   ⚠ 為什麼不做成腳本裡的 `hint` 那一拍：那一拍是**位置固定**的，而「取得龍息」
     是有條件的（30 秒內、而且還沒有那把槍）—— 腳本沒有條件式的拍。掛旗標才對得上。
   ⚠ 由上往下取第一個到期的，一次只演一個（同旅店大廳那三個提示的作法）。
   ⚠ 彈之前要確認**被指的那顆真的在畫面上**（吊墜住在槍棺裡）—— `openHint` 自己會
     檢查 rect（量不到就直接跳過），所以這裡不必再判一次。 */
function tipDue(){
  if(siegeOn()) return null;     // 戰鬥地圖不教操作（ver -584）
  for(const t of (TOWNS[townId]||{}).tips || []){
    if(t.flag && prog.hasFlag(t.flag)) continue;
    if(t.need && !prog.hasFlag(t.need)) continue;
    return t;
  }
  return null;
}
/* `done`＝這一則提示**做完**之後要接的下一拍（ver -430，目前是「把店舖的單子擺出來」）。
   「做完」的定義分兩級：
     ① 點到被指的那個東西（`showHint` 的回呼）→ 通常那一下就把整備頁開起來了
     ② 那一頁**收掉**（`gearWatch`）＝ 玩家真的把裝備換完了（Ray 指定的那一刻）
   ⚠ 玩家也可能直接把提示點掉、不去按吊墜 —— 那時 `gearWatch` 查到整備頁根本沒開，
     會立刻放行。**不能把玩家鎖在教學裡**（同 `openHint` 的原則）。 */
function showTip(t, done){
  if(!t){ if(done) done(); return; }
  if(t.flag) prog.addFlags([t.flag]);
  story.showHint({ at:t.at, text:t.text }, ()=>{
    if(gearWatch) gearWatch(done || (()=>{}));
    else if(done) done();
  });
}
/* 整備頁的「收掉了通知我」（`modules/gear.js` 的 `onceClosed`，由 main.js 注入）。
   ⚠ 注入而不是 import：城鎮不認識啟動層的畫面（同 `setFlightOpener`）。 */
let gearWatch=null;
export function setGearWatch(fn){ gearWatch=fn||null; }
/* ══⚠⚠ **進城 ＝ 一個檢查點**（ver -590，Ray：「在北泊劇情戰敗應該是回檔到祭司
   那邊吧」）══════════════════════════════════════════════════════════════
   ver -589 的「功能未開的城鎮裡戰死 → 回檔」讀的是**最新的那一筆存檔**，
   而城鎮的段落**不經過劇情讀取頁**（那才是既有的自動檢查點，ver -555）——
   於是在北方泊地打輸會退回**上一次讀取頁**（帝都船塢），把整段抵達的戲一起退掉。
   ⚠ 補這一支之後，回檔就落在**剛降落**那一刻：碼頭那一幕（司祭）還沒演，
     所以它會重演一次 —— 那正是 Ray 要的「回檔到祭司那邊」。
   ⚠ 落在 `enter()` **之後**：`save.capture()` 要問 `town.getPosition()`，
     節點還沒設好的話存進去的是上一座城的位置。
   ⚠ 段落的旗標是**演完才記**的，所以這一刻存下去的必然是「還沒演」的狀態 ——
     不必刻意避開哪一拍。
   ⚠ 注入而不是 import（同上）：城鎮不認識存檔層。 */
let checkpoint=null;
export function setCheckpoint(fn){ checkpoint=fn||null; }
/* ══ 小地圖裡的「模擬存檔」（ver -936，Ray：「幫我做個存檔鈕在小地圖選單，存的檔跟
   其他進度都錯開，獨立，用來模擬真實玩家推進」）══
   `{save, load, info}` 由 main 注入（城鎮不認識存檔層，同 setCheckpoint）。
   ⚠⚠ **不是管理人限定**（ver -937，Ray：「把這條取消」）：-936 曾以「玩家的存檔規約
     是睡一覺＝唯一那一份（§6.9）」為由鎖成 `body.testmode` —— 那條理由由 Ray 取消了，
     所以這一列**一般玩家也看得到**。
     ⚠ 它存的仍是**獨立的那一格**（`sim`），與 `main`／`auto` 互不相干、也不進
       首頁「繼續」的比較 —— 「錯開」那一條沒有跟著取消。
   ⚠ 沒注入（單獨測 town）＝整組不出現，不會炸。 */
let simIO=null;
export function setSimSave(o){ simIO=o||null; }
/* 跨圖離開荒野時收掉連戰段落（ver -869，見 open() 開頭）。注入＝combat.endSession。 */
let sessionCloser=null;
export function setSessionCloser(fn){ sessionCloser=fn||null; }

function afterArrive(n){
  /* ══ 同行的諾薇兒走完殘留事件（ver -567，Ray 交稿）══════════════════════
     「殘留的帝都諾薇兒劇情結束，諾薇兒會在下一次移動時提出他累了想要回去
       旅店休息，然後回到房間，敲門的時候沒有回應，大概睡著了」
     最後一段演完的那一次抵達只**上膛**（Ray 明說是「下一次移動時」提出）；
     下一次抵達、進場對白演完之後演 `TOWNS[].nouTired`，演完她回房：
     escortNou 收掉（restingSet 重新封她的插話）、nouAsleep 立起（敲門只回旁白）。
     ⚠ 要在 inn.arrive／店舖**之前**演 —— 她回房這件事會改門燈（st1.inRoom）。 */
  if(nouTiredArmed && escortId==='NOUVELLE'){
    nouTiredArmed=false; escortLeftover=false;
    const lines=(TOWNS[townId]||{}).nouTired;
    if(lines && lines.length){
      busy=true; showNav(false);
      story.playAdhoc(lines, ()=>{ story.clearCast();     // 鐵律 8：離開這一段就清場
        escortId=null; nouAsleep=true;
        busy=false; showNav(true);
        afterArrive2(n); });
      return;
    }
    escortId=null; nouAsleep=true;        // 沒有台詞資料也要完成狀態轉移
  }else if(escortId==='NOUVELLE' && escortLeftover && !leftoverForNou()){
    nouTiredArmed=true;
  }
  /* ══ 外出碰面／約會派生的那一段戲（ver -1102，見 `meetScene`）══
     ⚠ 要在**旅店大廳與店舖之前**演完（同 nouTired 的理由）：那一段演的是
       「這一格現在有誰」，店主與大廳是這一格的常駐介面，兩者疊在一起會打架。
     ⚠ 演完才記（`applyAff` ＋ `markMet`）：中途離開就不算，好感也刷不到。
     ⚠ 演完走 `afterArrive2(n, true)` —— 這一次抵達的碰面已經由這一段負責了，
       不要再讓 `maybeMeetOut` 補一句單句上來（那會蓋掉剛演完的收尾）。 */
  const ms=meetScene();
  if(ms){
    busy=true; showNav(false);
    story.playAdhoc(ms.play, ()=>{ story.clearCast();   // 鐵律 8：離開這一段就清場
      applyAff(ms.play); markMet(ms.key);
      busy=false; showNav(true);
      afterArrive2(n, true); });
    return;
  }
  afterArrive2(n);
}
function afterArrive2(n, metDone){
  /* ⚠ `introFlag` 由城鎮算好傳進去（ver -402）：旅店已經沒有 `kind` 了，
     旗標名只有 `enter()` 那一支知道（`kind` 版／節點版兩種）—— inn 自己拼會拼錯城。 */
  if(!metDone) maybeMeetOut();   // 有人外出時走到她那一格 → 碰到她（ver -575，取代 -461 的蕾娜版）
  /* ⚠ 戰鬥地圖不開旅店大廳（ver -584）—— 伙伴門／獨自坐坐／回房睡覺都是探索的機制。 */
  /* ⚠ 沒有初見對白的旅店（北方泊地）傳 **null**（ver -656）：那面旗永遠不會立，
     而大廳是等它才出現的 —— 見 `inn.introDone()`。 */
  /* ⚠ `innFrom`（ver -827，Ray：「第六章起點已經是戰鬥探索，索拉娜家的旅店在當時
     是關掉的」）：這一格的旅店功能要某支旗立了才開（夏爾村＝`safehouse_shinier`，
     ＝村戰打完、村子安全了才開放休息）；沒寫＝一直開（其他城照舊）。 */
  if(innActive(n)) prog.addFlags([innSeenFlag(nodeId)]);   // 「進過這家旅店了」（ver -1102）
  if(innActive(n)) inn.arrive(n, { allSeen: allSeen(),
                                 introFlag: (n.lines && n.lines.length) ? flagOf(n, nodeId) : null,
                                 /* 這是哪一座城的哪個節點（ver -481）：睡覺那一刻要記
                                    「上一次睡覺的旅店」——連敗三場送回來用。 */
                                 where: { town: townId, node: nodeId },
                                 /* Stage 1 起的房門（ver -566；-575 改成四人通用）：
                                    ⚠⚠ `inRoom` 傳的是**函式**不是當下的快照 ——
                                      大廳裡的時鐘會走（獨自坐坐兩小時），快照會過期，
                                      而「她在不在房裡」的真相只有 `inRoom()` 一支（鐵律 7）。 */
                                 st1: st1Active() ? {
                                   /* ⚠⚠ **門的狀態是一張由上往下取的表**（`innDoors`，ver -666）：
                                      每一項 `{need?, roster, asleep?, out?, answerBy?, say?}`，
                                      第一個 `need` 成立的就是現在的樣子（同 `acts` 的取法）。
                                      北方泊地：那一夜是「蕾娜亮／諾薇兒與安雅熄燈、都由蕾娜應門」，
                                      隔天早上變成「蕾娜亮／諾薇兒出門去教堂／安雅亮但只說『……』」。
                                      ⚠ 不寫 `innDoors` ＝照這一章入隊的所有人（`girlsHere`）。 */
                                   roster: (innDoorSet(n).roster) || girlsHere(),
                                   inRoom: inRoom,
                                   /* ══ 約會（ver -1096）══ 四個人共用一張表的那一套：
                                      `escort()` ＝現在誰被約出去了（別人的門就敲不動）、
                                      `dateAff` ＝好感門檻（`OUTING.dateAff`，唯一那個數字）。 */
                                   /* ⚠⚠ 這裡要的是「**現在正在約會嗎**」不是
                                      「有沒有人同行」：殘留事件帶起來的同行
                                      （`escortLeftover`，ver -567 的諾薇兒）也是
                                      同行，但那不是約會 —— 拿 `escortWho` 當判準的話，
                                      一進城就可能把其他三扇門全鎖住。 */
                                   dating: datingWho,
                                   dateAff: (OUTING.dateAff!=null ? OUTING.dateAff : 20),
                                   /* 同行結束回房＝睡著了（ver -567）：敲門只回
                                      `innStage1.nouAsleep` 那句旁白，約不出來。 */
                                   /* ⚠ 節點可以指定「這幾位睡著了」（`innAsleep`，
                                      ver -660）：北方泊地的諾薇兒與安雅躺在房裡 ——
                                      門在、燈熄、臉照畫（見 inn 的 `doorState`）。 */
                                   asleep: who => (innDoorSet(n).asleep||[]).indexOf(who)>=0
                                                  || (who==='NOUVELLE' && nouAsleep),
                                   /* 「不在房裡」也可以由資料指定（ver -666）：
                                      諾薇兒隔天一早就去教堂了 —— 門在、燈滅、臉不畫。 */
                                   /* ⚠⚠ **好感不夠＝她根本不在房裡**（ver -1099，Ray：
                                      「索拉娜不在的話頭像直接拿掉就好，不在的角色
                                      頭像空」）：稿上索菈娜的 T2 以下那一格寫的是
                                      「（不在）」—— 那不是一句台詞，是**門上沒有臉**。
                                      ⚠ 所以它寫在 `knock[WHO].absent` 上（那張表本來就
                                        管「這個人現在會怎樣」），由這裡併進 `out` 的
                                        答案 —— 門的狀態只有 `doorState` 一支在算
                                        （鐵律 7），不要另開一條「她要不要顯示」的路。
                                      ⚠ `doorState` 回 `empty` 的門 `knock()` 開頭就
                                        直接 return，所以連「點了沒反應」都不會發生：
                                        那扇門本來就沒有人。 */
                                   out: who => {
                                     if((innDoorSet(n).out||[]).indexOf(who)>=0) return true;
                                     const kt=((n.innStage1||{}).knock||{})[who];
                                     if(!kt || !kt.absent) return false;
                                     const need=(OUTING.dateAff!=null ? OUTING.dateAff : 20);
                                     return ((prog.getAffection()||{})[String(who).toLowerCase()]||0) < need;
                                   },
                                   /* 這一格現在的門設定（`answerBy` / 逐人的敲門詞）。 */
                                   doors: innDoorSet(n),
                                   /* ══⚠⚠⚠ **約會只在「自由活動」期間開放**（ver -1360，Ray：
                                      「可約會這件事應該要做開關門機制，只有開放時間可約，
                                        不然任務中還約會就很怪」「自由活動期間可以約會，
                                        而第二天就關閉自由活動，完成任務才開」）══
                                      ⚠⚠ **不要另立一個開關**：這件事專案裡早就有了 ——
                                        §6.5.4 的「劇情探索 ⇄ 自由探索」（ver -666）。
                                        劇情探索＝女角不排外出行程、碰不到她們；
                                        那樣的期間本來就不該約得出來（鐵律 7：
                                        一個狀態一份真相）。
                                      ⚠ 判定只有 `storyExploreOn()` 一支，這裡只問它。
                                      ⚠ 它排在**人的分支之前**（同宵禁／今天約過了）：
                                        那是世界的狀態，不是某個人的心情。 */
                                   dateOpen: ()=> !storyExploreOn(),
                                   /* 宵禁（ver -576）：敲門一律回 `nightRest`，約不出來。 */
                                   night: isCurfew,
                                   /* 今天已經約過她了（ver -576）：回 `dateDone`，不再出門。
                                      ⚠⚠ ver -1394：**額度被劇情用掉了也算**（大學巧遇蕾娜）——
                                        那一種是「今天不會再有人陪你出門」，所以**四扇門都擋**，
                                        但頭像照舊都在（`inRoom` 不看這一支，見 `dateSpentToday`）。 */
                                   dated: (who)=> dateSpentToday() || datedToday(who),
                                   data: n.innStage1||{},
                                   /* ⚠ 同行徽（ver -1348）要在**約會成立的那一刻**就出現，
                                      不是等玩家走一步 —— 它顯示的正是「現在帶著誰」。
                                      ⚠ 收在這一個唯一的入口（鐵律 8）：`enter()` 那一次是
                                        「確認它在」，這一次是「它剛剛該出現」。 */
                                   /* 任務探索中：約會與睡覺一律擋（ver -1416，見 questLocked）。 */
                                   questLocked, questSay,
                                   /* ⚠⚠⚠ **對白裡的好感加減也要記帳**（ver -1511）：
                                      `line.aff` 的記帳只有 `applyAff` 一支（鐵律 8），
                                      而它住在這裡 —— 旅店那一層自己演的那幾段
                                      （敲門的 `date`／`rennaAlt`）走的是 `host.play`，
                                      **從來沒有人替它們記過帳**。
                                      ⚠ 症狀是「演了、旗也插了、好感就是不動」，
                                        而且不會有任何錯誤訊息（ver -1511 實測抓到：
                                        敲蕾娜的門那一段 `aff:{renna:2}` 完全沒作用）。
                                      ⚠ 交出去的是**同一支函式**，不要在 inn.js 另寫一份。 */
                                   applyAff,
                                   onInvite(who){ escortId=who||'NOUVELLE'; escortLeftover=false; markDated(escortId); showEscortBadge(); },
                                 } : null,
                                 /* 「還沒六點呢」的那個六點＝傍晚提醒的時刻（ver -405）。
                                    ⚠ 同一個數字只有這一處（鐵律 7）。 */
                                 eveningHour: ((TOWNS[townId]||{}).evening||{}).hour,
                                 /* 這一趟是天黑之後才抵達的（ver -1658）：旅店拿它
                                    決定睡覺鈕開不開（`inn.sleepOpened`）。
                                    ⚠ 判定在 `open()`，這裡只是把答案送過去（鐵律 7）。 */
                                 lateArrival: arrivedLate,
                                 /* 規則四／五（ver -427）：傍晚那一格若在旅店裡成立，
                                    走的是旅店自己的分支二 —— 那一支演完要**把傍晚的旗標
                                    一起記掉**，否則走出去再回來又會被抓一次。 */
                                 eveningFlag: ((TOWNS[townId]||{}).evening||{}).flag });
  /* 注：`noSleep` / `sleepFlag`（ver -1382 由 `noSleepUntil` 改名＋翻面） / `innWake` / `innAsleep` / `innRoster` /
     `innNoGuide` 都是**節點上的欄位**，inn.js 直接讀 `node`（見那一支）。 */
  else inn.close();
  /* ⚠⚠ **教學先、選單後**（ver -430，Ray：「武器店的裝備教學先彈出，裝備完才跳出
     武器店的選單」）。有到期的提示時，店舖只擺店主、那顆入口鈕押後 ——
     等玩家真的把裝備換完（整備頁收掉）才交還給他。
     ⚠ 兩條路都要把入口交還（有提示走 `showTip` 的回呼、沒提示走這裡），
       而它的實作只有 `openMenu()` 那一支（鐵律 8）。 */
  const tip=tipDue();       // 一次性的操作提示（ver -429）：對白與店舖都就位了才彈
  shopEnter(tip ? { noMenu:true } : null);   // 店舖畫面（ver -404）：進場對白演完才擺
  showTip(tip, tip ? openMenu : null);
}
/* 初見劇情的旗標名。⚠ **只有這一支在決定**（鐵律 7）：`enter()` 與 `afterArrive()` 都問它。 */
function flagOf(n, id){ return (n && n.kind) ? ('town_kind_'+n.kind) : ('town_'+townId+'_'+id); }

/* 對白裡的好感度加減（`line.aff`）。⚠ 在**播完**時一次記帳：
   中途離開就不算，也不會因為重看而重複（`once` 的段落只播一次）。 */
function applyAff(lines){
  for(const l of lines){
    if(!l || !l.aff) continue;
    for(const who in l.aff) prog.addAffection(who, l.aff[who]);
  }
}

/* 開商店。⚠ 店主對話是**一段對白**（兩個人輪流講）—— 按下去先收商店、交給劇情播放器演、
   演完再把商店開回來。這樣立繪與明暗都與別處一致，不必在商店頁裡另做一套對話框。 */
function openShop(){
  const n=node(); if(!n || !n.shop) return;
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  /* 店主對話有兩種（ver -377）：
       `keeper`        一整段對白（雜貨舖：兩個人輪流講）
       `keeperRandom`  **隨機一句**（武器店：Ray 指定「隨機出武器改裝、戰鬥相關知識」）
     ⚠ 兩種都走同一個劇情播放器（立繪、明暗、打字機一致），差別只在「這次要播哪幾句」。 */
  const rnd = n.keeperRandom && n.keeperRandom.length ? n.keeperRandom : null;
  /* ⚠ 店主對話裡有**回房休息的夥伴**（諾薇兒常在裡面插話）→ 這一次沒有對談
     （ver -459）：她不在場，那一段演不成。keeperRandom（店主單人隨機句）不受影響。 */
  const keeperOk = !(n.keeper && n.keeper.length && linesBlockedByRest(n.keeper));
  const hasTalk = (keeperOk && n.keeper && n.keeper.length) || rnd;
  /* 「再挑戰」（ver -398）：把那一段（含 `{battle:…}`）交給劇情播放器演 ——
     它自己會推槍棺、打完接回來（`resumeFrom`），與劇情裡那一次走同一條路（鐵律 8）。
     ⚠ 演完**回到櫃台**（同「與店主交談」的作法）：玩家本來就站在那裡。 */
  const onChallenge = (n.challengeLines && n.challengeLines.length) ? ()=>{
    setShopOn(false);                    // 進真正的對白：地名交回 `story-talking` 管
    busy=true; showNav(false);
    story.playAdhoc(n.challengeLines, ()=>{
      story.clearCast();
      busy=false; showNav(true);
      backToShop(n);                     // ⚠ 有新段落到期就接上（ver -1368），否則回店裡
    });
  } : null;
  sheetClose = showShop(n.shop, hasTalk ? [1] : null, ()=>{
    let lines = (keeperOk && n.keeper && n.keeper.length) ? n.keeper : null;
    if(!lines && rnd){
      let i=Math.floor(Math.random()*rnd.length);
      if(rnd.length>1 && i===lastKeeper) i=(i+1)%rnd.length;   // 不要連續兩次同一句
      lastKeeper=i;
      const who=n.keeperWho||'SHOPKEEP';
      lines=[{ speaker:who, text:rnd[i], portrait:{ char:who, show:true } }];
    }
    if(!lines) return;
    setShopOn(false);                    // 同上：交談是普通對白，不是店舖模式
    busy=true; showNav(false);
    story.playAdhoc(lines, ()=>{
      story.clearCast();                 // 鐵律 8：離開這一段就清場
      busy=false; showNav(true);
      backToShop(n);                     // 同上（ver -1368）：談完可能也插了旗
    });
  /* ⚠ **不帶 `dock`＝全畫面**（ver -430）：這張窗現在是「點那顆鈕才開」的，
     開了就該看得清楚。收掉之後把鈕交還給玩家（`openMenu`）—— 兩者是同一個入口的
     兩個狀態，不要讓玩家關掉窗之後就沒得再開。 */
  }, onChallenge, { info:infoText(n),
                    onClose:()=>{ sheetClose=null; openMenu(); } });
}
/* ⚠ `lastChat` **原本沒有宣告**（ver -377 修）：ES module 是嚴格模式，
   `lastChat=i` 會直接丟 ReferenceError —— 也就是說酒館的路人閒聊**一句都放不出來**。
   非嚴格模式下它會變成隱式全域，所以在別處測不出來。兩支「不要連續同一句」的游標
   一起宣告在這裡。 */
let lastKeeper=-1, lastChat=-1;
/* 現在畫面上有沒有一句路人單句（ver -387）。**這是一個狀態，不要從畫面反推** ——
   對話框的 `visibility` 是這一拍稍後才套上／撤掉的，當場量會量到上一個狀態
   （§6.5 的 -385 那個坑）。換節點要歸零（見 enter）。 */
let chatterOn=false;

/* 路人單句：**單句**，不進對話模式（Ray 指定）。點一下出一句、再點一下收掉。 */
function chatter(){
  if(siegeOn()) return;          // 戰鬥地圖沒有路人（ver -584）
  const n=node();
  /* 打烊中：出那一句「關著」的描述就好，不出路人單句（ver -391）。 */
  if(n && !isOpenNow(n)){
    if(n.closed){ story.flashLine(n.closed, ''); chatterOn=true; }
    return;
  }
  /* ⚠ 分店有自己的路人語就用它（ver -578）：咖啡廳／餐廳／甜品店各一組；
     酒吧沒寫 → 回去用節點自己那一組市井線（`tavern.chatter`）。 */
  const sc=dineSceneOf(nodeId);
  const list=(sc && sc.chatter && sc.chatter.length) ? sc.chatter : (n && n.chatter);
  if(!list || !list.length) return;
  let i=Math.floor(Math.random()*list.length);
  if(list.length>1 && i===lastChat) i=(i+1)%list.length;
  lastChat=i;
  /* ⚠ 名字欄標「路人」（ver -405，Ray 指定）。字串問 `SPEAKERS.VOICE.name`，
     不要寫死在這裡（鐵律 7）—— 那是那個角色的顯示名，只有一份。 */
  story.flashLine(list[i], (SPEAKERS.VOICE||{}).name||'');
  chatterOn=true;
}

/* ⚠ 旅店大廳要用到城鎮這邊的三件事，用**注入**而不是讓 inn 反過來 import town
   （那會變成循環相依）：
     say   單句（沒有立繪）＋ 把 `chatterOn` 打開 —— 不打開的話那一句會一直留在畫面上
           （城鎮的「再點一下收掉」是靠這個旗標，見 bindInput）
     lock  演出期間鎖住導覽（同對白）
     play  一段有立繪的對白（走同一個劇情播放器）
   ⚠ `inn.setup` 只呼叫一次（模組載入時），不要放進 `open()` —— 那會每進一次城疊一次。 */
inn.setup({
  say(text, name){ story.flashLine(text, name||''); chatterOn=true; },
  lock(on){ busy=!!on; showNav(!on); },
  play(lines, done, opts){ story.playAdhoc(lines, done, opts); },
  /* 背景圖上的一點 → 舞台座標（旅店的兩顆鈕擺在茶桌／櫃台上，見 `innSpots`）。
     ⚠ 走**同一支** `bgPoint` —— 櫃台鈕也是它算的（鐵律 7）。 */
  bgPoint,
  /* 依**現在的時刻**重新挑一次背景（旅店「獨自坐坐」過完兩小時要換時段差分）。
     ⚠ 走同一支 `bgFor`（候選鏈只有那一份，鐵律 7）。 */
  refreshBg(){ const n=node(); if(n) bgFor(bgCandsOf(n, nodeId)); },
  /* 時鐘動過了 → 問一次強制轉場的閘門（ver -427）。⚠ 旅店是**唯一**在城鎮之外
     推時鐘的地方（獨自坐坐／回房睡覺），所以那兩支推完都要叫這一支（鐵律 8）。
     回傳 true ＝已經接手轉場，呼叫端不要再收尾。 */
  onClock(){ return clockGate(); },
  /* ══⚠⚠⚠ **旅店裡消磨完時間，也要再問一次「這一格現在該演什麼」**（ver -1370，
       Ray：「獨自坐坐到時間蕾娜也沒回來啊」）══════════════════════════════════
     `onClock` 只問**強制轉場**的閘門（會把玩家搬去別的地方那一種）；而東泊
     「晚上回旅店碰到蕾娜」那一段是掛在**這一格自己的 `acts`** 上（`hourOfDay:20`）
     —— 坐坐把時鐘推過 20:00 之後沒有人再問一次 `actDue`，於是她永遠不會回來。
     ⚠⚠ 這與 ver -1368（店舖裡演完一段要再問一次）是**同一條規矩漏掉的第三個
       入口**：`runArrival` 早就做成可重入的了，漏的一直是「誰去叫它」。
       ⇒ 所以收在同一支 `rerunIfDue`（鐵律 8），不要在旅店那邊另寫一份判斷。
     ⚠ **旅店自己的分支優先**（`inn.js` 的 `runBranch` 回 true 就不會走到這裡）：
       帝都 stage 0 的「等蕾娜」是旅店那一套在管的，兩邊搶著演會疊在一起。 */
  rerun(){ return rerunIfDue(); },
  /* ══⚠⚠⚠ **小睡**（`sleepFirst`，ver -1396）══ 旅店按下睡覺時問這兩句：
       napAct() → 這一格現在有沒有「按睡覺才演」的段落到期（有就回那一筆，
                  `hours` 在它的 `sleepFirst` 上）
       napArm() → 小睡演完了，下一次抵達請只演那一段
     ⚠ 判定留在**城鎮這一邊**（`actDue` 的同一道門，鐵律 8）：旅店不認識
       `needTier`／`until`／安全區那一整套，自己判一定與它走鐘。
     ⚠ `node()` ＝玩家現在站的那一格（旅店本來就是其中一格）。 */
  napAct(){ const nd=node(); return nd ? actDue(nd, true) : null; },
  napArm(){ napPending = true; },
});

/* `node`（選填，ver -429）＝從哪一格開始，不寫就是城的入口。
   目前只有「章節」那顆跳關鈕在用；日後要記住離開時站在哪（§6.9 的清單）也走這裡。 */
export function open(town, node, opts){
  /* ══⚠⚠ **跨圖離開荒野＝收段**（ver -869（-893 前用詞））══ 森林的野生遭遇整張圖是一場
     （config.battles 的 session:'sf_wild'，收段＝斷崖那隻）——半途走回村子，
     那一場就沒打完：段落要收掉（資源回滿、帳與掉落作廢，同城鎮戰半途離場的
     既有語意），不然 session 掛著、下一張圖的資源永遠不回滿。
     ⚠ 注入而不是 import（同 setCheckpoint）：城鎮不認識戰鬥層。
     ⚠ 只在**換一張圖**時收（遭遇戰敗北回入口是同一張圖、走 goHome 那條本來就收）。 */
  if(townId && townId!==(town||'capital') && (TOWNS[townId]||{}).wilderness && sessionCloser){
    try{ sessionCloser(); }catch(_){}
  }
  /* 換圖之前先把上一張城鎮圖借走的搭檔放回去（ver -1394，見 `restoreTownPartner`）。 */
  restoreTownPartner();
  townId = town || 'capital';
  townLive = true;
  gateMoves={};   // 閘門的 afterMoves 計數：這一趟進城重新算（ver -953）
  const T=TOWNS[townId]; if(!T) return;
  /* 進一張**城鎮**圖：把「進城前的那一位」存起來（約會規則等一下會覆寫它）。 */
  if(isTownMap(townId) && partnerBeforeTown===undefined) partnerBeforeTown = state.pickedPartner;
  /* 進城就把體力回滿（ver -556，Ray 指定）：城＝安全區，走進來殘血歸零重算。
     收在**入口唯一這一支**（鐵律 8）——正常進城、被抬回旅店（carried）、讀檔
     開在城裡（save.apply → openTown）全部吃到。城內移動與戰後 resume 不經過
     這裡，所以城裡打殘的血照舊帶著，出去再回來才補滿。 */
  prog.clearHp();
  /* ══⚠⚠ **這張地圖預設就是安全區**（ver -634，Ray：「帝都其餘時間都插著
     safehouse flag」）══ 城上寫 `safehouse:true` → 進城時把旗插上（只插一次）。
     ⚠ 為什麼要真的插一支旗而不是「沒寫 siege 就當安全」：**旗才拔得掉**。
       特殊戰（帝都的賞金獵人、打靶）就是靠拔它才打得起來（見 `pullSafehouse`）。
     ⚠ 插在 `townId` 設好之後 —— 旗名是由它推的。 */
  if(T.safehouse && !prog.hasFlag(safehouseFlag())) prog.addFlags([safehouseFlag()]);
  /* ══⚠⚠⚠ 「**來過這張圖了**」（`visitFlag`，ver -1188）══════════════════════
     三座遺蹟是 Ray 開放給玩家自己挑順序的（`s9_ruins_open`「三遺蹟全開」），
     所以「**先去了哪一座**」會一直是分歧的條件（伊甸古墓那一段就是第一個）。
     ⚠⚠ **不要拿 `seen_<圖>_<格>` 去湊**（ver -966 的教訓，見 script/town.js 的
       石橋那一段）：那一支的語意是「**現在**走過了沒」，不是「當時去過了沒」。
       這一支的語意只有一個 —— **踏進過這張圖**。
     ⚠ 鐵律 9：**進圖就插**（在 `townId` 設好之後）、**沒有人拔**（一去不回，
       同 `got_ship` 那一族）。要「這一段之前有沒有去過」那種快照，
       照舊由那一段自己的旗當快照（同 `sr_bridge` 的作法）。
     ⚠ 名字寫在資料上（鐵律 1），不由 `townId` 推：日後有圖不需要這支旗，
       不寫就是沒有。 */
  if(T.visitFlag && !prog.hasFlag(T.visitFlag)) prog.addFlags([T.visitFlag]);
  /* ══⚠⚠ **`arriveNotBefore:<時>` ＝踏進這張圖不會早於那個時刻**（ver -1447，Ray：
     「確保玩家踏入古城前就把時間磨到至少 17:00」）══
     ⚠ 走 `advanceToHour`（只往前推、已經過了就不動）—— **時鐘不倒轉**，
       所以夜裡搭船來的那一趟是 no-op（§6.5.4.1 那條「時鐘只能往前」）。
     ⚠ 判定只有這一處（鐵律 8）：日後任何一條進圖的路都自動吃到。 */
  if(T.arriveNotBefore!=null) clock.advanceToHour(T.arriveNotBefore);
  /* 進帝都＝諾薇兒好感初始化為 5（ver -560，Ray：「預設是全 0，進帝都後諾才 5」）——
     一輪一次（旗標擋重複），直接寫值不走棘輪（這是入隊的起始值，不是獎勵）；
     已經比 5 高就不動（讀檔回城不能倒扣）。 */
  if(townId==='capital' && !prog.hasFlag('aff_init_nouvelle')){
    prog.addFlags(['aff_init_nouvelle']);
    const _a=prog.getAffection();
    if((_a.nouvelle||0) < 5){ _a.nouvelle=5; prog.setAffection(_a); }
  }
  /* 進帝都＝S1（ver -562，Ray 定案的編號：開頭 S0 → 進帝都 S1 → 出航 S2）。
     守門看**值**不看旗標：只從 0 升上來 —— 讀檔在更後面的章節不會被倒退，
     試玩版（無鑰匙，getStage 回測試預設 5）也不受影響。 */
  if(townId==='capital' && prog.getStage()===0) prog.setStage(1);
  /* ver -858（Ray：「解除夏爾村的前期進入管制」）：主線抵達（S4）之前來過
     就記一支旗 —— sv_arrive 那一幕的「之前我們好像來過」分歧讀它（鐵律 9：
     插旗＝這一次早訪，沒有人拔）。 */
  if(townId==='shinier' && prog.getStage()<4) prog.addFlags(['sv_visited_early']);
  /* ver -858（Ray：「開啟的新地點會標在大地圖上，日後可直接降落」）：
     第一次踏進夏爾森林＝發現 —— 大地圖的名牌與降落點由這支旗開。 */
  if(townId==='shinier_forest') prog.addFlags(['sv_forest_found']);
  /* ⚠⚠ 章節重編號（ver -857，Ray：「章節編排錯誤，沒有第二章 —— 把第三章變成
     第二章，以降回推」）：初進北泊**不再升段** —— S2 涵蓋「出航～北泊第一天」
     （-600 的「初進北境插 Stage3」作廢）。新表：S0 開頭／S1 進帝都／S2 出航＋北泊
     ／S3 北泊第二天（np_day3 閘門設）／S4 北泊出航（np_farewell 設）／S5 夏爾村
     （sv_evening 設）。
     ⚠ `gameStage()===2` 的地圖鎖因此**撐到 np_day3 為止**才解 —— 那段期間本來就
       不可離港（sail.hold），行為無差。 */
  /* 被抬回來的（ver -496，Ray：「城鎮中戰鬥死亡就回旅店」）：這一次抵達由
     `enter()` 消化 —— 初見還沒看過就演節點的 `wake` 那一拍（見 enter 的說明）。 */
  carriedIn = !!(opts && opts.carried);
  eveningHeld=false;          // 傍晚那一格的「讓過一次」是這一趟城鎮探索的狀態（ver -430）
  /* ══⚠⚠⚠ **這一趟是天黑之後才抵達的嗎**（ver -1658，Ray：「如果船到城鎮時已經
     超過 1800 則旅店出睡覺鈕，按下直接到隔天，不然要晃到劇情時間點很痛苦」）══
     `open()` 是「從別的畫面進一座城」的**唯一**入口（降落、讀檔、章節跳關、
     被抬回旅店、戰鬥打完回城都走它，鐵律 8）—— 所以「抵達時幾點」在這裡問一次就好。
     ⚠ 用**這座城自己的** `evening.hour`（同「還沒六點呢」那條線，鐵律 7），
       沒寫才退回 18。
     ⚠ 這是**這一趟探索**的狀態（同 `eveningHeld`／`wildDone`）：出城再回來重算、
       不進存檔 —— 它是「怎麼走進來的」，不是一輪遊戲的進度（鐵律 9）。
     ⚠ 它只鬆開旅店的 `sleepFlag` 那一道門，判定在 `inn.sleepOpened()`（見那裡）。 */
  arrivedLate = clock.hourF() >= (((T.evening||{}).hour!=null) ? T.evening.hour : 18);
  /* 追逐的三個狀態也是**這一趟**的（ver -1421，同 eveningHeld／wildDone）：
     離圖再回來牠重新擺位。⚠ 不進存檔 —— 最壞情況是多走幾步，而位置本來就是
     瞎找出來的（`bl_dragon_seen` 之前連紅點都沒有）。 */
  dragonNode=null; dragonFights=0; dragonSeenFights=0; dragonJustPlaced=false; dragonRollHit=false;
  wildDone=new Set();         // 野生刷怪的「這一趟出過誰」也是（ver -862）
  wildCleared=new Set();      // 「這一趟哪幾格出過」（ver -924，重刷率用）
  wildVisited=new Set();      // 「這一趟踩過哪幾格」（ver -1618，noWildFirst 用）
  pendingFavor=null;          // 「下一步去哪」也是（ver -440，見 armFavor）
  /* 夥伴的所在（ver -461）：進城算一次。⚠ 要在 townId 設好之後（leftoverForNou 要查表）。 */
  escortId=null;
  nouTiredArmed=false; nouAsleep=false; escortLeftover=false;   // 同行收尾（ver -567）
  /* ⚠ 殘留事件帶起來的同行只可能是諾薇兒（`leftoverForNou`）—— ver -1096 改成
     存「誰」之後這裡要明寫是她，不能再靠布林。 */
  if(st1Active() && leftoverForNou()){ escortId='NOUVELLE'; escortLeftover=true; }
  /* ⚠⚠ 外出行程（ver -575）**這裡不歸零**：它的鑰匙是「這座城的這一天」
     （`rollOuting`），走出城再回來還是同一天就該是同一份行程 ——
     在這裡清掉等於「出城再進城」可以重擲，「一天最多兩次」就破了。
     真正歸零的地方是 `close()`（離開這一輪遊戲／回主選單）。 */
  const st=story.stageEl(); if(st){ st.classList.add('on','town-on'); }
  document.body.classList.add('story-on');
  /* ⚠ 進城也是**切景**（ver -438）：先蓋上黑幕（`0ms`＝立刻，因為這一層本來就是
     硬切上來的），第一景擺好之後由 `enter()` 淡回來 —— 玩家看到的是一次淡入，
     不是「啪」一聲換上一張還沒載完的背景。 */
  story.veil(true, 0);
  story.showPanel();          // 下半的面盤（不擺會是一片全黑）
  story.ensureBgm(townBgm());
  busy=false;
  /* ══ 第一次（劇情）降落的入口（ver -582，Ray：「第一次劇情降落北方泊地是從碼頭
     進去」）══ 城上寫 `firstEntry:{node,until}`：`until` 那支旗標還沒立起來之前，
     從這一格進去；立了就照舊走 `entry`。
     ⚠ 收在**進城的唯一入口**（鐵律 8）：降落、讀檔、章節跳關都經過這裡。
     ⚠ **明寫節點時不套用**（讀檔／跳關指定了 `node`）—— 那是「回到存檔的那一格」，
       不是「第一次走進這座城」。 */
  /* ⚠⚠ **入口那一格另外記著**（ver -698，Ray：「城鎮、野外、遺蹟非劇情戰則回到
     入口存檔，入口不會有戰鬥」）—— 遭遇戰打輸要把人放回這裡。
     ⚠ 記的是**這座城的入口**（`firstEntry`／`entry`），**不是**這一趟走進來的那一格：
       讀檔／跳關可以落在中間任何一格，而「入口不會有戰鬥」的保證只對入口成立。 */
  const fe=T.firstEntry;
  entryNodeId = (fe && fe.node && T.nodes[fe.node] && !(fe.until && prog.hasFlag(fe.until)))
              ? fe.node : T.entry;
  const start = (node && T.nodes[node]) ? node : entryNodeId;
  /* ══⚠⚠⚠ **追兵只在「站上入口」那一刻歸零**（ver -1577）══ 與上面那條龍相反，
     它**不是**「進圖就重置」：古墓的安全點就是存檔點（`rest:true` → `autoSave`），
     而讀檔會走 `open()` —— 無條件歸零的話，玩家在安全點存一次再讀回來追兵就不見了，
     安全點當場變成無限重置鈕（而且畫面上沒有任何錯誤訊息）。
   ⚠ 判準是「這一趟落在**資料上的入口**」＝ Ray 的「**從墓門進入**」字面。
     問 `entryNodeId`（唯一那一支，它吃得到 `firstEntry`／`until`，鐵律 7）——
     不要自己讀 `T.entry`。落在中間任何一格（讀檔、跳關、戰鬥交棒回來）
     一律**不動**，帶著原本那一筆。
   ⚠ 走回墓門**不歸零**（那是 `idleAt`：只是不推進，牠還在）——「墓門不是安全區
     但是也不出怪也不會追」（Ray），兩件事分得很清楚。 */
  chaseGraph=null;            // 換圖＝換拓樸（追兵那張無向圖的快取，ver -1577）
  wildStat.moves=0; wildStat.asked=0; wildStat.rolled=0; wildStat.hit=0; wildStat.skip={};
  if(T.chase && start===entryNodeId) prog.setChase(null);
  pickEnds(start);            // 這一趟的起點與終點（ver -1026，見 pickEnds）
  armMapCard();               // 這一趟要不要報圖名（ver -879）——在 enter 之前決定
  enter(start);
  /* 進城的檢查點（ver -590（-893 前用詞），見 setCheckpoint）。⚠ 一定要在 `enter()` 之後 ——
     存檔要記「人在哪一格」。
     ⚠ 同上：「一場」之內不落點（ver -639）。正常情況下進城時 `battleSession`
       本來就是 null —— 這一道是為了讓規則只有一條，不要兩個呼叫點各有各的條件。 */
  if(checkpoint && !state.battleSession) try{ checkpoint(); }catch(_){}
}
export function close(){
  /* ⚠ 環境音是**持續狀態**：離開這座城就沒有人收它了（ver -1568）。 */
  try{ story.stopAmb(60); }catch(_){}
  townLive=false;            // 回主選單（ver -1394）
  restoreTownPartner();      // 搭檔回到進城前那一位（見 restoreTownPartner）
  const st=story.stageEl(); if(st) st.classList.remove('town-on');
  showNav(false);
  /* 圖名卡也是覆蓋層（ver -879，同 mapClose 的理由）。⚠ ver -899 起卡住在 story
     那一層（與翌日卡同一支），所以這裡改叫它 —— 它會把還扣著的那一段抵達演出放行，
     而那一段的第一件事就是問「現在在哪一格」，此時城已經在收了 ⇒ 先清扣著的那一包。 */
  heldArrival=null; mapCardArmed=false;
  story.hideTitleCard();
  { const b=document.getElementById('townMapBtn'); if(b) b.remove(); }   // 常駐鈕的唯一終點（ver -899）
  { const e=document.getElementById('townEscort'); if(e) e.remove(); }   // 同行徽的唯一終點（ver -1348）
  if(clockEl){ clockEl.remove(); clockEl=null; }        // 背景上的鐘的唯一終點（ver -1249）
  /* 外出行程（ver -575）：這裡才歸零 —— `close()` 才是「這一趟城鎮探索結束」
     （回主選單／killAllPages／讀檔換城）。`open()` 不清，見那一支的說明。 */
  outKey=null; outPlan=[];
  /* 約會（ver -576）：解除同行、清掉「今天約過誰」。⚠ 出城鎮走的是 `suspend()`
     不是這裡 —— 那一條只解除同行、**不清帳**（Ray：「一天內同人不能約第二次」）。 */
  endDate(); dateDay=null; datedSet=new Set(); dateSpentDay=null;
  townId=null; nodeId=null;
  document.body.classList.remove('town-nav');
  document.querySelectorAll('.kerb-arrow').forEach(a=>a.classList.remove('avail','holding'));
}
export function isOpen(){ return !!townId; }
/* ⚠⚠ **「人真的還在城裡」要問這一支，不是 `isOpen()`**（ver -1455 匯出）：
   `suspend()`（出航）刻意不清 `townId`（ver -437：飛行畫面下半還要看得到城鎮的
   移動選項）⇒ `isOpen()` 在天上照樣是真。憲法 §0.5（ver -1394）就記著這個坑。 */
export function isLive(){ return !!townLive; }
/* 這座城的旅店節點（ver -496：城鎮插入戰敗北要被抬去那裡）。沒有旅店回 null。 */
export function innNodeOf(town){
  const T=TOWNS[town||townId]; if(!T) return null;
  for(const k of Object.keys(T.nodes)) if(T.nodes[k].inn) return k;
  return null;
}
/* ══ 出航：把城鎮的介面收起來，但**不關掉城鎮**（ver -437）══════════════
   Ray：「飛行畫面閉棺時下方出現城鎮的移動選項…飛行畫面城鎮的時間地點殘留。」
   ⚠⚠ 成因：出航之後 `body.flight-on` 只是把 `#storyStage` **藏起來**
     （`visibility:hidden`，§6.10 刻意不用 `display:none`）—— 城鎮那一層還原封不動
     掛在上面。而遭遇交棒進戰鬥時 `closeFlightFrame()` 會把 `flight-on` 拿掉，
     那一刻城鎮的方向箭頭與地名／時刻就從槍棺底下冒出來。
   ⚠⚠ **不能用 `close()`**：那會清掉 `townId`，打完回來就沒有節點可回（§6.10 的舊傷
     「打完靶跟賞金獵人後返回鍵不見了」就是這個）。所以收的是**介面**不是狀態。
   ⚠ 收的四樣與換節點那張檢查表同源（§6.5 的新路徑檢查表）：導覽、店舖、旅店、立繪。 */
export function suspend(){
  /* ⚠ 環境音是**持續狀態**：離開這座城就沒有人收它了（ver -1568）。 */
  try{ story.stopAmb(60); }catch(_){}
  clearTimeout(arriveT); arriveT=0;
  townLive=false;            // 人上船了：約會那條規則不再套用（ver -1394）
  restoreTownPartner();      // 搭檔回到進城前那一位（同上）
  endDate();                // 出城鎮＝約會結束（ver -576，Ray 指定）
  /* ⚠⚠ ver -1383：**離開地圖也清掉「今天約過誰」**（Ray：「就算回旅店解除約會也要
     到隔天或**離開地圖**才會回來」）。-576 當時刻意只在 `close()`（回主選單）清，
     理由是「出城再進城還是同一天就約不了第二次」—— 那條規則被這一版取代了。
     ⚠ 連帶：其他人的頭像跟著回來（`inRoom` 問的就是它）。 */
  dateDay=null; datedSet=new Set(); dateSpentDay=null;
  story.endAdhoc();
  chatterOn=false;
  showNav(false);
  shopClose();
  inn.close();
  story.clearCast();
  story.hideBubble();
  rerunArrival=null;        // ⚠ 離城就放掉（ver -1368）：它指著上一座城的 enter 閉包
  napPending=false;         // ⚠ 同上（ver -1396）：不要把「小睡醒來」帶去下一座城
}
/* 從飛行頁回到城鎮：把介面接回來。⚠ **不重跑 `afterArrive`** —— 那一支會再叫一次
   `inn.arrive`（旅店的招呼會重播）與 `showTip`。回來只要看得到路與店就好。 */
export function resume(){
  if(!townId) return;
  townLive=true;             // 回到城裡（ver -1394）
  bindInput(); refreshArrows(); showNav(true);
  shopEnter();
}
/* 存檔要帶的「人在哪」（ver -430）。⚠ 與 `story.getPosition()` 是同一件事的兩面：
   在城裡就有這個、在劇情裡就有那個 —— 存檔兩個都問，讀檔挑有值的那一個。
   ⚠ 這是**存在存檔紀錄裡**的欄位，不是 localStorage 的一輪內鑰匙，
     所以 §6.9 的 `newRun()`／`runSnapshot()` 那張清單不必動。 */
export function getPosition(){ return townId ? { town:townId, node:nodeId } : null; }
/* 節點的顯示名（存檔欄位上要印「人在哪」）。查不到就回城名。 */
export function placeName(pos){
  const T=TOWNS[(pos&&pos.town)||townId]; if(!T) return '';
  const n=T.nodes[(pos&&pos.node)||nodeId];
  return (n && n.name) || T.name || '';
}
/* 把這座城的曲子接回來（ver -391）。⚠ 進飛行頁時主遊戲的 BGM 被收掉了
   （見 main.js 的 `openFlight`：兩個 document 各有一套 BGM，不收會疊在一起），
   從飛行頁「返回」回到城鎮時要有人把它接回來。 */
export function resumeBgm(){ const T=TOWNS[townId]; if(T) story.ensureBgm(townBgm()); }
/* 這張圖現在該放哪一首（ver -913）：給 `bgmAfter:'@town'` 問的（main 注入給 story）。
   ⚠ 只是把 `townBgm()` 這個唯一的計算點**開一個窗**，不是第二份判斷（鐵律 7）。 */
export function bgmKey(){ return TOWNS[townId] ? townBgm() : null; }

/* ══⚠⚠⚠ **巡場的地圖名單與「這張圖的劇情旗」**（ver -1410，Ray：「巡場加入選擇
   探索地圖名單，選擇以後選是否播放劇情」）══════════════════════════════════
   兩支都是**從 `TOWNS` 算出來的，不列名單**（鐵律 7）—— 日後加一張圖，
   巡場的清單自己會多一列、跳過清單自己會涵蓋它，沒有人要記得回來補。
   ⚠ 這是 -1396 那份**手寫的** `SCRIPT_TEST.tourFlags` 的替代品：那一列只涵蓋
     貝利薩爾，換一張圖測就要手改，而「忘了改」的下場是**劇情把你抓走**
     （巡場的本意正是不要被抓走），畫面上不會有任何錯誤訊息。 */
export function explorableMaps(){
  return Object.keys(TOWNS)
    .filter(id => TOWNS[id] && TOWNS[id].nodes && TOWNS[id].entry)
    .map(id => ({ id, name: TOWNS[id].name || id, node: TOWNS[id].entry,
                  nodes: Object.keys(TOWNS[id].nodes).length }));
}
/* 這張圖「演過了」的那一整組旗 —— 段落（`acts`）、閘門（`gates`）、離場
   （`onLeave`）自己宣告的 `flag`，加上由 `townId` 推得出來的那幾支
   （來過、圖名卡、走過了沒、旅店初見）。
   ⚠ **`safehouse_` 不在裡面**：那是「有沒有怪」，與「劇情演過了沒」是兩件事
     （§6.5.4.3 的安全區旗；巡場兩種模式都要它）。 */
export function storyFlagsOf(id){
  const T=TOWNS[id]; if(!T) return [];
  const out=new Set();
  const eat=a=>{ if(a && a.flag) out.add(a.flag); };
  for(const k in (T.nodes||{})){
    const n=T.nodes[k];
    /* ⚠ `onLeave` ver -1532 起可以是一張表（見 `leaveDue`）—— 這裡要一起吃，
       漏了的話那幾支旗不算在「這張圖演過了」裡面（巡場／封存會少收）。 */
    (n.acts||[]).forEach(eat);
    (Array.isArray(n.onLeave) ? n.onLeave : [n.onLeave]).forEach(eat);
    out.add('seen_'+id+'_'+k);
    if(n.inn) out.add('inn_seen_'+id+'_'+k);
  }
  (T.gates||[]).forEach(eat);
  if(T.stage1) eat(T.stage1);
  if(T.visitFlag) out.add(T.visitFlag);
  out.add('mapcard_'+id);
  return [...out];
}

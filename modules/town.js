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

import { GAME_CONFIG, fileGain } from '../config.js';
import { TOWNS } from '../script/town.js';
import * as clock from '../script/clock.js';
import * as prog from '../script/progress.js';
import * as story from './story.js';
import * as inn from './inn.js';                 // 旅店大廳（伙伴門／獨自坐坐／回房睡覺）
import { showShop, showBounty } from './loot.js';
import { SPEAKERS } from '../script/speakers.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);

const HOLD_MS = 500;      // 箭頭要按住多久才走（Ray 指定 0.5 秒）
const STEP_MIN = 10;      // 每移動一次花掉的遊戲內分鐘數
const ARRIVE_MS = 1000;   // 抵達新地點之後、對白開演之前的停頓（Ray：「先停一秒」）
/* 立繪滑入的時間。⚠ 與 `modules/story.js` 的 `SLIDE_MS` 同值（450ms，§6.5 的 450ms ease-out）——
   兩邊必須一致：這裡是拿它來讓對話框「等人站定」。改一邊要改另一邊（鐵律 7 的但書）。 */
const SLIDE_MS = 450;
const DIRS = ['up','down','left','right','back'];

let townId=null, nodeId=null, layer=null, busy=false;
let arriveT=0;            // 抵達停頓的計時器（換節點要取消，見 enter）
/* ⚠⚠ 傍晚那一格**讓過一次**了嗎（ver -430，Ray：「要等角色先把原有的場景對話講完
   才觸發，移動到下一個場景才強制觸發」）。ver -427 的作法是「優先所有事件」——
   它會把這一次抵達原本要演的進場對白整段吃掉，玩家等於被搶走一段戲。
   現在改成：到期的那一次**讓給**節點自己的對白，記下來；**下一次抵達**才強制觸發。
   ⚠ 只讓一次 —— 不設這個旗標的話，一路走過還沒看過的地點會永遠讓下去。
   ⚠ 主線段落（`acts`）本來就是這個行為（`ev` 在有 act 時是 null），
     這一版只是讓進場對白享有同樣的待遇。 */
let eveningHeld=false;

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
function restingSet(){
  const s={};
  for(const r of RESTING){
    if(r.until && prog.hasFlag(r.until)) continue;
    if(r.on.some(f=>prog.hasFlag(f))) s[r.who]=1;
  }
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
function armFavor(n){
  const f = n && n.nextFavor; if(!f) return;
  if(f.flag && prog.hasFlag(f.flag)) return;      // 這一輪已經拿過了
  pendingFavor = f;
}
function resolveFavor(to){
  const f = pendingFavor; if(!f) return;
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
/* `done`＝**這一景的背景真的擺好了**（ver -442）。切景的黑幕要等它才掀 ——
   見 `enter()` 的 `reveal`。⚠ 一定要在**每一條出口**都叫（載到了／候選全部
   404 了），漏掉哪一條，那一次就只剩保底計時器在撐。 */
function bgFor(base, noTime, done){
  const my=++bgSeq;
  const fin=()=>{ if(my===bgSeq && done) done(); };
  /* ⚠⚠ 候選鏈**只有一份**（ver -427）：`modules/story.js` 的 `bandNames`。
     Ray 把插圖也拆成時段差分之後，這條規矩（時段 → 大小寫變體 → `_Day` → 原名，
     每個名字再試 `.webp`／`.png`）就有兩個使用者了 —— 抄一份到那邊必然走鐘
     （其中一份會漏掉大小寫變體、或漏掉 `.png` 那一級）。鐵律 7。 */
  const all=story.bandNames(base, noTime);
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
      /* ⚠ 回報的時機是**它真的畫上去**，不是「叫了 setSceneBg」（ver -442）：
         那一支底下可能還要淡一段（`swapImg`），早報就會在舊圖上把黑幕掀開。 */
      story.setSceneBg(name, fin);
      /* 旅店那兩顆行動鈕（獨自坐坐／回房睡覺）要靠圖的原始比例換算位置（見 bgPoint），
         所以在這裡記下來 —— 這一支本來就要載那張圖，不必另外再抓一次
         （鐵律 7：算的那一支發佈出去）。 */
      bgNat=[img.naturalWidth, img.naturalHeight]; inn.relayout();
      if(i>0 && !missingBg.has(cands[0])){ missingBg.add(cands[0]);
        console.info('[town] 沒有這個時段的背景，退回：', cands[0], '→', name); } };
    img.onerror=()=>{ if(my===bgSeq) tryAt(i+1); };
    img.src='resources/background/'+name;
  };
  tryAt(0);
}

function node(){ return (TOWNS[townId]||{}).nodes[nodeId] || null; }

/* ══ 走到過的地點（ver -392）══════════════════════════════════════════
   ⚠ 與「進場對白播過了」（`town_<城>_<節點>`）是**兩件事**：有的節點根本沒有對白
     （中心區），有的對白被打烊擋掉 —— 那些也算走到過。所以另開一組旗標。 */
function markSeen(id){ prog.addFlags(['seen_'+townId+'_'+id]); }
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
function actDue(n){
  for(const a of (n && n.acts) || []){
    if(a.flag && prog.hasFlag(a.flag)) continue;
    if(a.need && !prog.hasFlag(a.need)) continue;
    if(a.day && dayNo() < a.day) continue;
    if(a.lines && a.lines.length) return a;
  }
  return null;
}
/* 遊戲內第幾天（開局那天＝第 1 天）。⚠ 從時鐘推，不另存旗標（鐵律 7）。
   ⚠ 算在 `clock.dayNo()`（那裡才有 EPOCH）—— 這裡以前自己 `floor(elapsed/1440)`，
     那是「開局起算的 24 小時塊」不是日曆日，隔天早上會被算成第 1 天（ver -427 修）。 */
function dayNo(){ return clock.dayNo(); }

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
function stageGate(){
  const T=TOWNS[townId], g=T && T.stage1;
  if(!g) return null;
  if(g.flag && prog.hasFlag(g.flag)) return null;
  return (clock.elapsed() >= clock.firstHourAt(g.hour)) ? g : null;
}
/* 時鐘一動就問一次：該不該強制轉場。回傳 true ＝已經接手（呼叫端不要再做別的事）。
   ⚠ 由 `enter()` 的收尾與旅店（`host.onClock`）呼叫 —— 那兩處涵蓋了所有會推時鐘的路。 */
function clockGate(){
  const g=stageGate();
  if(!g) return false;
  if(g.flag) prog.addFlags([g.flag]);
  if(g.stage!=null) prog.setStage(g.stage);
  if(!g.goto || g.goto===nodeId) return false;   // 已經站在那裡：讓原本的流程繼續（acts 會接手）
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
/* 黑幕最多蓋多久（ver -442）：背景載不到／請求卡住時的保底 —— 見 `enter()` 的 `reveal`。 */
const REVEAL_CAP_MS = 1800;
let enterSeq = 0;         // 第幾次 enter（保底計時器要認得出自己是不是已經過期）
function sceneCut(to){ story.veil(true, CUT_MS); setTimeout(()=>enter(to), CUT_MS); }
function forceGo(to){
  clearTimeout(arriveT); arriveT=0;
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');
  stepSfx();
  pendingDir=null;
  sceneCut(to);
}

/* ══ 營業時間（ver -391，Ray 指定）══════════════════════════════════════
   節點寫 `hours:[開,關]`（小時，24 制）。**不寫＝全天**（旅店就是這樣）。
   ⚠ 上界**不含**：`[8,24]` ＝ 23:59 還開著、00:00 關 —— 那正是「開到 00 時」的意思。
   ⚠ 跨午夜（`[20,2]`）也要對，所以兩種寫法都判。
   ⚠ 時刻只有一個計算點：`clock.hourF()`（鐵律 7）。 */
function isOpenNow(n){
  const h = n && n.hours;
  if(!h || h.length<2) return true;
  const t = clock.hourF();
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
  /* 目的地字格：上／左／右三個一律有；**下方只有「出航」時才有**（ver -387）——
     下方通常是「退回上一層」，寫出名字只是重複；但出航是城外，玩家非得看到那兩個字
     才知道那一支箭是幹什麼的（Ray：「預設的城鎮入口下方為『出航』」）。
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
  return null;
}
/* 這個節點現在有沒有店舖畫面：要是店（或已登記的公會），而且**在營業時間內**。 */
function shopReady(n){
  if(!n || !isOpenNow(n)) return false;
  if(n.shop) return true;
  return !!(n.board && (!n.boardFlag || prog.hasFlag(n.boardFlag)));
}
/* `opts.noMenu`＝只擺店主，**那顆鈕先不出來**（ver -430，Ray：「武器店的裝備教學
   先彈出，裝備完才跳出武器店的選單」）—— 等玩家真的換完裝備才由 `afterArrive` 補上。
   ⚠ 讓開的是**選單**不是整個店舖畫面：店主照舊立刻上場，不然玩家會以為走錯地方。 */
function shopEnter(opts){
  const n=node(); if(!shopReady(n)) return;
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
  const s=String((n && n.name) || '');
  const parts=s.split('　').filter(Boolean);
  return parts.length ? parts[parts.length-1] : s;
}
function showShopBtn(on){
  const b=layer && layer.querySelector('#townShopBtn'); if(!b) return;
  const n=node();
  if(on && n){
    b.querySelector('b').textContent = n.shop ? (shopBtnName(n) || '買　賣') : '懸賞榜';
  }
  b.classList.toggle('on', !!on);
}
/* 這一格的「選單」＝把那顆鈕擺出來。⚠ 名字沿用 `openMenu` —— 呼叫端（`afterArrive`、
   整備教學的回呼、談完話回到店裡）要的是同一件事：「把這家店的入口交還給玩家」。 */
function openMenu(){
  const n=node(); if(!shopReady(n)) return;
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
  sheetClose = showBounty(n.board, { info:infoText(n),
                                     onClose:()=>{ sheetClose=null; openMenu(); } });
}
/* 單子標題下那一行：地名＋時刻（＋打烊）。⚠ 與上緣的 `#townInfo` 是**同一組字**，
   所以由同一支算（鐵律 7）—— 那一行在店裡被招呼語讓開了，資訊要在這裡找得到。 */
function infoText(n){
  return (n ? n.name : '') + '　' + clock.timeText() + (isOpenNow(n) ? '' : '　已打烊');
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
    + '<span class="ti-line">' + n.name
    +   '<span class="ti-time">' + clock.timeText() + '</span>'
    +   (isOpenNow(n) ? '' : '<span class="ti-shut">已打烊</span>')
    + '</span>';
  /* 目的地字格：有那個方向才出現，字是目的地名，**位置貼著那一支箭**
     （ver -374，Ray：「地名是放在箭頭左右上方」）。
     ⚠ 箭的座標問 `getBoundingClientRect`，不要自己算（鐵律 7）。
     ⚠ 上：擺在箭的**正上方**；左／右：擺在箭的**外側**再往上一點 ——
       正對著箭會把箭遮住，那支箭正在發光晃動，是這一頁的主角。 */
  const ex=exitsOf(), st=story.stageEl();
  const sr=st ? st.getBoundingClientRect() : null;
  layer.querySelectorAll('.town-dest').forEach(b=>{
    const to=ex[b.dataset.dir];
    /* ⚠ 下方那一格只給出航：一般的「退回上一層」不標名字（見 ensureLayer）。 */
    const show = b.dataset.dir==='down' ? (to===SAIL_ID) : !!to;
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
  if(on){
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

/* ══ 「回去」掛在哪一支箭（ver -405，Ray：「從哪個方向過來，回去就按方向」）══
   往上走進去的地方，往下就退得回來；往左走進去的，往右退回來。
   ⚠ **記的是「這一次是按哪個方向進來的」**（`backDir` ＝ 來時方向的反向），
     不是節點資料上的東西 —— 同一個地方可以從不同的路走到（日後多城時尤其），
     寫死在資料上一定會有一邊是反的。
   ⚠ 沒有記錄時（開城第一格、戰鬥交棒回來、讀檔）退回舊行為「掛在下」。 */
const OPPOSITE = { up:'down', down:'up', left:'right', right:'left' };
let pendingDir = null;   // go() 記下這一次按的方向，enter() 取用後清掉
let backDir    = null;   // 「回去」該掛在哪一支箭

function exitsOf(){
  const n=node(); const ex=Object.assign({}, (n&&n.exits)||{});
  const back=ex.back; delete ex.back;
  /* ══ 出航（ver -387，Ray：「預設的城鎮入口下方為『出航』」）══
     ⚠ 走**同一套**方向出口（長按那一支箭／字格），不另做一顆鈕 —— 對玩家而言
       「往下走」與「出航」是同一個動作，只是目的地在城外（鐵律 8）。
     ⚠ 目的地 id 用 `__sail` 這個保留字，由 `go()` 攔下來分流。
     ⚠ **先擺出航再擺 back**：出航是「下」那一格的既定用途（Ray 指定），
       不能被「回去」擠掉。 */
  if(n && n.sail && !ex.down) ex.down=SAIL_ID;
  if(back){
    /* 首選＝來時方向的反向；那一格已經有別的出口就退回「下」，再不行就找一格空的。 */
    const want = (backDir && !ex[backDir]) ? backDir
               : (!ex.down ? 'down' : ['up','left','right','down'].find(d=>!ex[d]));
    if(want) ex[want]=back;
  }
  return ex;
}
const SAIL_ID='__sail';
function nameOfNode(id){
  if(id===SAIL_ID) return '出航';
  const n=(TOWNS[townId]||{}).nodes[id];
  if(!n) return '';
  /* ⚠ 打烊的地方在**目的地字格上就標出來**（ver -406）：走過去才發現關門是白走一趟，
     而移動要花掉遊戲內時間（時間是資源）。標在這裡＝所有顯示目的地名的地方
     （字格、蓄能提示）都吃得到，只有這一支在決定（鐵律 7）。 */
  const nm=(n.name||'').replace(/^帝都　/,'');
  return isOpenNow(n) ? nm : (nm+'（已打烊）');
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
    /* ══ 單純點畫面 ＝ 路人單句（ver -387，Ray 指定四個地方都有）══
       節奏是**點一下出一句、再點一下收掉**，收掉之前不出下一句 ——
       一直點就一直換句的話，玩家永遠讀不完一句。 */
    if(chatterOn){ story.hideBubble(); chatterOn=false; return; }
    chatter();
  });
  st.addEventListener('pointercancel', cancel);

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
function go(to, dir){
  if(!to) return;
  if(to===SAIL_ID){ setSail(); return; }
  /* ══ 打烊的店**進不去**（ver -406，Ray 指定）══
     原本會走進去、站在一間關著的店裡（沒有店主、沒有選單），而且白花掉 10 分鐘
     ——「時間是資源」，走一趟空的就是實質的懲罰。改成**擋在門口**：不移動、
     不推進時鐘，就地報店名與營業時間。
     ⚠ 判定走**同一支** `isOpenNow`（鐵律 8）—— 目的地字格上的「（已打烊）」、
       進去之後的地名後綴、店主與選單出不出來，全部是它。 */
  const nx=((TOWNS[townId]||{}).nodes||{})[to];
  if(nx && !isOpenNow(nx)){ knockClosed(nx); return; }
  pendingDir = dir || null;            // 這一次按的方向（ver -405）；enter() 取用
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');          // 移動中把羅盤收起來
  stepSfx();
  clock.advance(STEP_MIN);
  sceneCut(to);          // 換景走淡入淡出（ver -438，見 sceneCut）
}

/* 吃了閉門羹：就地浮一句「哪一家、幾點開」。
   ⚠ 走**路人單句那一套**（`flashLine` ＋ `chatterOn`），所以「再點一下收掉」的節奏
     與城鎮其他單句一致（鐵律 8）—— 不另做一個提示框。
   ⚠ 名字欄放**店名**：這一句不是誰在講話，是「你站在這扇門前看到的事」。 */
function knockClosed(n){
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  const parts=[];
  if(n.closed) parts.push(n.closed);
  const ht=hoursText(n); if(ht) parts.push(ht);
  story.flashLine(parts.join('　'), (n.name||'').replace(/^帝都　/,''));
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
export function setFlightOpener(fn){ flightOpener=fn; }
function setSail(){
  const n=node(), sail=n && n.sail; if(!sail) return;
  if(!sail.flag || prog.hasFlag(sail.flag)){
    /* 船已經到手：交給飛行頁。⚠ 城鎮的位置目前不存 —— 飛行頁那邊回來時走的是
       `tivot_flight_ret_v1`（座標），城鎮節點要不要一起存是另一件事（§6.9 的清單）。 */
    stepSfx();
    /* ⚠⚠ **先把城鎮的介面收起來**（ver -437）：`flight-on` 只是把舞台藏起來，
       交棒進戰鬥那一刻它會被拿掉 —— 不收的話方向箭頭與地名就從槍棺底下冒出來
       （見 `suspend()` 的說明）。狀態留著，回來時 `resume()` 接回去。 */
    suspend();
    /* ⚠ 走注入的開啟器（ver -388）：飛行頁現在是**內嵌 iframe**，不跳頁 ——
       跳頁會讓音訊要重新解鎖（見 CLAUDE.md §6.10）。town 不 import main，所以用注入。 */
    if(flightOpener) flightOpener(); else location.href='flight/index.html';
    return;
  }
  if(!sail.blocked || !sail.blocked.length) return;
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
  const T=TOWNS[townId]; if(!T) return;
  const n=T.nodes[id]; if(!n){ console.warn('[town] 沒有這個節點：', id); busy=false; return; }
  nodeId=id;
  /* ⚠ 上一個地點開出來的「下一步去哪」在這裡結算（ver -440，見 `resolveFavor`）——
     要在演任何東西之前，好感度是這一步的結果，不是這一段對白的結果。 */
  resolveFavor(id);
  /* 「回去」該掛哪一支箭（ver -405）：來時方向的反向。走別的路徑進來（開城第一格、
     戰鬥交棒回來）時 `pendingDir` 是空的 → `backDir` 歸零，退回「掛在下」。 */
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
  const reveal=()=>{
    if(revealed || my!==enterSeq) return;
    revealed=true;
    /* ⚠ 隔一幀再掀：`setSceneBg` 那一下只是換 `src`，讓瀏覽器先畫出來再淡。 */
    requestAnimationFrame(()=>{ if(my===enterSeq) story.veil(false, CUT_MS); });
  };
  if(needReveal) setTimeout(reveal, REVEAL_CAP_MS);
  bgNat=null;               // 背景要重載，舊的尺寸不能拿來擺旅店那兩顆行動鈕
  /* 這座城的曲子（ver -375）。⚠ 每進一個節點都確認一次，不是只在 `open` 時放一次 ——
     中間可能插進一場戰鬥（戰鬥有自己的曲子），回來要接得回去。
     同曲重播由 `playBgm` 自己擋掉，所以重複呼叫是安全的。 */
  story.ensureBgm(T.bgm);
  bgFor(n.bg, n.noTime, needReveal ? reveal : null);
  ensureLayer(); bindInput(); refreshArrows(); showNav(false);
  /* ⚠⚠ 進場對白**一律只播一次**（ver -373，Ray：「對話只觸發一次，不重複觸發」）——
     不再看節點的 `once` 欄位：漏寫就會變成每次進去都重播，那是「預設值站錯邊」。
     旗標記在 progress 的 flags，存檔要帶。 */
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
  /* ══ 主線段落（`acts`，ver -424）══════════════════════════════════════
     節點可以掛**好幾段**主線戲，各自帶旗標與條件（目前只有 `day`：遊戲內第幾天）。
     ⚠ **優先於傍晚提醒與進場對白** —— 那兩者是氣氛，這是主線，順序不能反。
     ⚠ 旗標同樣**演完才記**（見下方的收尾）：中間可能插一場戰鬥，打輸會被丟回首頁。 */
  /* ⚠ 主線段落也一樣看休息（ver -459）：段落裡有回房的人就先不演、旗標不記 ——
     她回到隊上再經過時照演。 */
  const act0 = actDue(n);
  const act = (act0 && linesBlockedByRest(act0.lines)) ? null : act0;
  let ev = act ? null : eveningDue(n);
  /* 這一次抵達**原本**要演的進場對白（打烊、演過了、或段落裡有**回房休息的夥伴**
     （ver -459，見 linesBlockedByRest）就是空的 —— 後者旗標不記，之後照演）。
     ⚠ `expire:<旗標>`（ver -460，Ray：「肚子餓跟餐酒館的劇情過了就沒有了，
       回頭也不會再觸發」）：這一段**綁著某個當下**（上街區的肚子餓與餐酒館那頓飯
       是第一天的戲），那個旗標一立（stage 0 的夜過去＝stage1_open）就永遠不演 ——
       與 -459「保留到他回隊」相反，哪一種由**節點自己**宣告。 */
  const expired = !!(n.expire && prog.hasFlag(n.expire));
  const own = (played || expired || !isOpenNow(n) || linesBlockedByRest(n.lines)) ? [] : (n.lines||[]);
  /* ⚠⚠ **傍晚那一格不搶這一段戲**（ver -430，Ray 指定）：讓節點自己的對白先講完，
     移動到**下一個地點**才強制觸發。⚠ 只讓一次（`eveningHeld`）—— 否則一路走過
     還沒看過的地點會永遠讓下去，「強制」就名存實亡。 */
  if(ev && !eveningHeld && own.length){ eveningHeld=true; ev=null; }
  const lines = act ? act.lines
              : ev ? ev.lines
              : own;
  /* ⚠ 旗標**演完才記**（ver -375 由「開演就記」改過來）：這一段中間可能插一場戰鬥，
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
      story.playAdhoc(play, ()=>{ story.clearCast();
        if(act){ if(act.flag) prog.addFlags([act.flag]); }        // 主線段落：只演一次
        else if(ev){
          if(ev.flag) prog.addFlags([ev.flag]);                  // 傍晚那一句：只演一次
          /* ⚠ **強制移轉到旅店**（ver -427，Ray：「然後強制移轉到旅店，時間改為當天18:00」）。
             時鐘先推到 18:00 再走 —— 那一段路是被跳過去的，花掉的不是走路的時間。
             ⚠ `advanceToHour` **不會倒轉**：觸發時可能已經 18:05（走一步 10 分鐘）。 */
          if(ev.hour!=null) clock.advanceToHour(ev.hour);
          if(ev.goto && ev.goto!==nodeId){ forceGo(ev.goto); return; }
        }
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
        busy=false; refreshArrows(); showNav(true);
        /* ⚠ 時鐘閘門要在**對白演完之後**才判（ver -427）：那一段可能就是把時間推過
           七點的那一段（例如旅店的分支二）。放在開演前判會把演出腰斬。 */
        if(clockGate()) return;
        afterArrive(n); }, { sides:(act && act.sides) || n.sides });
    }, ARRIVE_MS);
  }else{
    busy=false; refreshArrows(); showNav(true);
    if(clockGate()) return;
    afterArrive(n);
  }
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

function afterArrive(n){
  /* ⚠ `introFlag` 由城鎮算好傳進去（ver -402）：旅店已經沒有 `kind` 了，
     旗標名只有 `enter()` 那一支知道（`kind` 版／節點版兩種）—— inn 自己拼會拼錯城。 */
  if(n && n.inn) inn.arrive(n, { allSeen: allSeen(), introFlag: flagOf(n, nodeId),
                                 /* 「還沒六點呢」的那個六點＝傍晚提醒的時刻（ver -405）。
                                    ⚠ 同一個數字只有這一處（鐵律 7）。 */
                                 eveningHour: ((TOWNS[townId]||{}).evening||{}).hour,
                                 /* 規則四／五（ver -427）：傍晚那一格若在旅店裡成立，
                                    走的是旅店自己的分支二 —— 那一支演完要**把傍晚的旗標
                                    一起記掉**，否則走出去再回來又會被抓一次。 */
                                 eveningFlag: ((TOWNS[townId]||{}).evening||{}).flag });
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
      shopEnter();                       // ⚠ 回到店裡＝把整個店舖畫面擺回來（立繪＋招呼語＋單子）
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
      shopEnter();                       // 談完回到店裡（立繪＋招呼語＋單子一起回來）
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
  const n=node();
  /* 打烊中：出那一句「關著」的描述就好，不出路人單句（ver -391）。 */
  if(n && !isOpenNow(n)){
    if(n.closed){ story.flashLine(n.closed, ''); chatterOn=true; }
    return;
  }
  const list=n && n.chatter;
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
  refreshBg(){ const n=node(); if(n) bgFor(n.bg, n.noTime); },
  /* 時鐘動過了 → 問一次強制轉場的閘門（ver -427）。⚠ 旅店是**唯一**在城鎮之外
     推時鐘的地方（獨自坐坐／回房睡覺），所以那兩支推完都要叫這一支（鐵律 8）。
     回傳 true ＝已經接手轉場，呼叫端不要再收尾。 */
  onClock(){ return clockGate(); },
});

/* `node`（選填，ver -429）＝從哪一格開始，不寫就是城的入口。
   目前只有「章節」那顆跳關鈕在用；日後要記住離開時站在哪（§6.9 的清單）也走這裡。 */
export function open(town, node){
  townId = town || 'capital';
  const T=TOWNS[townId]; if(!T) return;
  eveningHeld=false;          // 傍晚那一格的「讓過一次」是這一趟城鎮探索的狀態（ver -430）
  pendingFavor=null;          // 「下一步去哪」也是（ver -440，見 armFavor）
  const st=story.stageEl(); if(st){ st.classList.add('on','town-on'); }
  document.body.classList.add('story-on');
  /* ⚠ 進城也是**切景**（ver -438）：先蓋上黑幕（`0ms`＝立刻，因為這一層本來就是
     硬切上來的），第一景擺好之後由 `enter()` 淡回來 —— 玩家看到的是一次淡入，
     不是「啪」一聲換上一張還沒載完的背景。 */
  story.veil(true, 0);
  story.showPanel();          // 下半的面盤（不擺會是一片全黑）
  story.ensureBgm(T.bgm);
  busy=false;
  enter((node && T.nodes[node]) ? node : T.entry);
}
export function close(){
  const st=story.stageEl(); if(st) st.classList.remove('town-on');
  showNav(false);
  townId=null; nodeId=null;
  document.body.classList.remove('town-nav');
  document.querySelectorAll('.kerb-arrow').forEach(a=>a.classList.remove('avail','holding'));
}
export function isOpen(){ return !!townId; }
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
  clearTimeout(arriveT); arriveT=0;
  story.endAdhoc();
  chatterOn=false;
  showNav(false);
  shopClose();
  inn.close();
  story.clearCast();
  story.hideBubble();
}
/* 從飛行頁回到城鎮：把介面接回來。⚠ **不重跑 `afterArrive`** —— 那一支會再叫一次
   `inn.arrive`（旅店的招呼會重播）與 `showTip`。回來只要看得到路與店就好。 */
export function resume(){
  if(!townId) return;
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
export function resumeBgm(){ const T=TOWNS[townId]; if(T) story.ensureBgm(T.bgm); }

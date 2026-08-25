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

import { GAME_CONFIG } from '../config.js';
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
function bgFor(base, noTime){
  const my=++bgSeq;
  /* ⚠⚠ 候選鏈**只有一份**（ver -427）：`modules/story.js` 的 `bandNames`。
     Ray 把插圖也拆成時段差分之後，這條規矩（時段 → 大小寫變體 → `_Day` → 原名，
     每個名字再試 `.webp`／`.png`）就有兩個使用者了 —— 抄一份到那邊必然走鐘
     （其中一份會漏掉大小寫變體、或漏掉 `.png` 那一級）。鐵律 7。 */
  const cands=story.bandNames(base, noTime);
  const tryAt=(i)=>{
    if(i>=cands.length) return;
    const name=cands[i];
    const img=new Image();
    img.onload =()=>{
      if(my!==bgSeq) return;                 // 已經被後面那一次換掉了 → 這一張作廢
      story.setSceneBg(name);
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
  forceGo(g.goto);
  return true;
}
/* 強制移轉：不花時間、不看營業時間、不記「來時方向」（玩家不是自己走過去的）。
   ⚠ 走**同一支** `enter()` —— 清場、背景、對白、大廳那一整套收尾只有那一份（鐵律 8）。 */
function forceGo(to){
  clearTimeout(arriveT); arriveT=0;
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');
  stepSfx();
  pendingDir=null;
  setTimeout(()=>enter(to), 260);
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
   ⚠ 玩家把單子關掉之後，**點畫面任何一處**再開回來（見 bindInput）——
     那是同一支 `openMenu`，不是第二個入口。 */
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
function shopEnter(){
  const n=node(); if(!shopReady(n)) return;
  setShopOn(true);
  const who=keeperOf(n);
  if(who) story.castSolo(who);
  openMenu();
}
/* 收店舖畫面。⚠ 立繪與對話框交給 `story.clearCast()`（唯一的收尾，鐵律 8）——
   這裡只負責把單子收掉、把狀態歸零。 */
function shopClose(){
  setShopOn(false);
  if(sheetClose){ try{ sheetClose(); }catch(_){} sheetClose=null; }
}
/* 左邊那張單子：商店 → 買賣；公會 → 懸賞榜。 */
function openMenu(){
  const n=node(); if(!shopReady(n)) return;
  if(sheetClose) return;                       // 已經開著
  if(n.shop){ openShop(); return; }
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  sheetClose = showBounty(n.board, { dock:'left', info:infoText(n),
                                     onClose:()=>{ sheetClose=null; } });
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
  if(info) info.innerHTML = n.name + '<span class="ti-time">' + clock.timeText()
         + (isOpenNow(n) ? '' : '　已打烊') + '</span>';
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
    /* ══ 店裡：點畫面 ＝ 把左邊那張單子開回來（ver -404）══
       單子是走進來就開著的；玩家關掉之後總得有辦法再開。⚠ 走的是**同一支**
       `openMenu`（鐵律 8），而且已經開著時它自己會 return，所以不會疊第二張。
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
  try{ SFX.play('resources/audio/se/se_walk.m4a'); }catch(_){}
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
  setTimeout(()=>enter(to), 260);
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
  bgNat=null;               // 背景要重載，舊的尺寸不能拿來擺旅店那兩顆行動鈕
  /* 這座城的曲子（ver -375）。⚠ 每進一個節點都確認一次，不是只在 `open` 時放一次 ——
     中間可能插進一場戰鬥（戰鬥有自己的曲子），回來要接得回去。
     同曲重播由 `playBgm` 自己擋掉，所以重複呼叫是安全的。 */
  story.ensureBgm(T.bgm);
  bgFor(n.bg, n.noTime);
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
  /* ⚠ **傍晚的提醒優先所有事件**（ver -392，Ray 指定）：它**取代**這一次抵達原本要演的
     進場對白，而那一段的旗標不會記 —— 下次再進來還是會演（同上面「打烊不播」的作法）。 */
  /* ══ 主線段落（`acts`，ver -424）══════════════════════════════════════
     節點可以掛**好幾段**主線戲，各自帶旗標與條件（目前只有 `day`：遊戲內第幾天）。
     ⚠ **優先於傍晚提醒與進場對白** —— 那兩者是氣氛，這是主線，順序不能反。
     ⚠ 旗標同樣**演完才記**（見下方的收尾）：中間可能插一場戰鬥，打輸會被丟回首頁。 */
  const act = actDue(n);
  const ev = act ? null : eveningDue(n);
  const lines = act ? act.lines
              : ev ? ev.lines
              : ((played || !isOpenNow(n)) ? [] : (n.lines||[]));
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
  shopEnter();              // 店舖畫面（ver -404）：進場對白演完才擺，不然會壓在對白上
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
  const hasTalk = (n.keeper && n.keeper.length) || rnd;
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
    let lines = (n.keeper && n.keeper.length) ? n.keeper : null;
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
  }, onChallenge, { dock:'left', info:infoText(n),
                    onClose:()=>{ sheetClose=null; } });
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

export function open(town){
  townId = town || 'capital';
  const T=TOWNS[townId]; if(!T) return;
  const st=story.stageEl(); if(st){ st.classList.add('on','town-on'); }
  document.body.classList.add('story-on');
  story.showPanel();          // 下半的面盤（不擺會是一片全黑）
  story.ensureBgm(T.bgm);
  busy=false;
  enter(T.entry);
}
export function close(){
  const st=story.stageEl(); if(st) st.classList.remove('town-on');
  showNav(false);
  townId=null; nodeId=null;
  document.body.classList.remove('town-nav');
  document.querySelectorAll('.kerb-arrow').forEach(a=>a.classList.remove('avail','holding'));
}
export function isOpen(){ return !!townId; }
/* 把這座城的曲子接回來（ver -391）。⚠ 進飛行頁時主遊戲的 BGM 被收掉了
   （見 main.js 的 `openFlight`：兩個 document 各有一套 BGM，不收會疊在一起），
   從飛行頁「返回」回到城鎮時要有人把它接回來。 */
export function resumeBgm(){ const T=TOWNS[townId]; if(T) story.ensureBgm(T.bgm); }

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
/* 時段尾巴的**大小寫變體**：`_night` ⇄ `_Night`、`_Dusk` ⇄ `_dusk`…
   ⚠ 為什麼要有：`clock.band()` 出的是 `Dawn/Day/Dusk/night/midnight`（大小寫是 Ray 定的），
     但實際交件的檔名兩種都出現過（`Capital_Church_Night` vs `Capital_Cityhall_night`）。
     靜態空間與多數伺服器**是分大小寫的**，猜錯就 404。與其要求檔名整齊，
     不如在候選鏈裡把兩種都試一次 —— 這比「載不到、畫面停在白天」好查得多。 */
function altCase(name){
  const i=name.lastIndexOf('_'); if(i<0) return null;
  const head=name.slice(0,i+1), tail=name.slice(i+1);
  if(!tail) return null;
  const alt = (tail[0]===tail[0].toUpperCase())
    ? tail[0].toLowerCase()+tail.slice(1) : tail[0].toUpperCase()+tail.slice(1);
  return alt===tail ? null : head+alt;
}
/* ⚠ 副檔名也逐個試：**規約是 WebP**（§5），但 Ray 交件常常先是 PNG ——
   載不到就整個時段沒有背景，不如兩個都試。**先試 webp**，所以轉檔之後自動用新的。 */
const BG_EXT=['.webp','.png'];
/* ⚠ 換節點的**流水號**：背景是非同步載的，快速連走兩個節點時，前一個的 `onload`
   可能**晚於**後一個才回來 —— 那時它會把已經換好的背景又蓋回舊的那一張
   （實測：開城 → 立刻進大教堂，畫面停在廣場）。載完先確認自己還是最新的那一次。 */
let bgSeq=0;
function bgFor(base, noTime){
  const my=++bgSeq;
  const names=[]; const push=n=>{ if(n && names.indexOf(n)<0) names.push(n); };
  if(noTime){ push(base); }
  else{
    const b=clock.bgName(base);
    push(b); push(altCase(b));
    /* ⚠ `_Day` 這一級**也要試大小寫變體**（ver -400）：交件的檔名 `_Day` / `_day`
       兩種都出現過，而這一級是「這個時段沒有圖」時的退路 —— 它自己再漏掉一次，
       夜裡就整片沒有背景。 */
    push(base+'_Day'); push(altCase(base+'_Day'));
    push(base);
  }
  const cands=[];
  for(const n of names) for(const e of BG_EXT) cands.push(n+e);
  const tryAt=(i)=>{
    if(i>=cands.length) return;
    const name=cands[i];
    const img=new Image();
    img.onload =()=>{
      if(my!==bgSeq) return;                 // 已經被後面那一次換掉了 → 這一張作廢
      story.setSceneBg(name);
      /* 櫃台鈕要靠圖的原始比例換算位置（見 placeCounter），所以在這裡記下來 ——
         這一支本來就要載那張圖，不必另外再抓一次（鐵律 7：算的那一支發佈出去）。 */
      bgNat=[img.naturalWidth, img.naturalHeight]; placeCounter(); inn.relayout();
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
function eveningDue(n){
  const T=TOWNS[townId], ev=T && T.evening;
  if(!ev || !ev.lines || !ev.lines.length) return null;
  if(n && n.inn) return null;
  if(ev.flag && prog.hasFlag(ev.flag)) return null;
  const byTime = (ev.hour!=null) && (clock.hourF() >= ev.hour);
  return (byTime || allSeen()) ? ev : null;
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
    /* 櫃台鈕（ver -387，Ray：「商店、武器店、賞金獵人公會的櫃臺放置按鈕以進入各別選單」）。
       ⚠ **一顆鈕、一支實作**（鐵律 8）：商店、武器店、公會共用它，差別只在開哪個選單。
         原本「點畫面就開商店」（`shopOnTap`）已經拿掉 —— 兩個入口做同一件事，
         其中一個一定會被忘記維護。 */
    + '<button id="townCounter" class="town-btn" type="button"></button>';
  st.appendChild(layer);
  const sb=layer.querySelector('#townCounter');
  if(sb) sb.addEventListener('pointerup', e=>{ e.stopPropagation(); openCounter(); });
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
function placeCounter(){
  const b=layer && layer.querySelector('#townCounter'); if(!b) return;
  const n=node();
  /* ⚠ 打烊就不出現（ver -391）：門是關著的，櫃台後面沒有人。 */
  const on = !!(n && n.counter && isOpenNow(n)
                && (n.shop || (n.board && (!n.boardFlag || prog.hasFlag(n.boardFlag)))));
  /* ⚠ **擺好了才亮**：先 `.on` 再算位置的話，量不到圖那一拍鈕會出現在畫面左上角
     （left/top 還沒寫）—— 一顆定位錯的鈕比晚一拍出現糟得多。 */
  const p = on ? bgPoint(n.counter.x, n.counter.y) : null;
  if(!p){ b.classList.remove('on'); return; }
  b.textContent = n.counter.label || '櫃　台';
  b.style.left=p.x+'px'; b.style.top=p.y+'px';
  b.classList.add('on');
}
/* 櫃台鈕按下去開哪個選單：商店 → 買賣；公會 → 懸賞榜。 */
function openCounter(){
  const n=node(); if(!n) return;
  if(n.shop){ openShop(); return; }
  if(n.board && (!n.boardFlag || prog.hasFlag(n.boardFlag))){
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
    showBounty(n.board);
  }
}

function refreshArrows(){
  const n=node(); if(!n || !layer) return;
  placeCounter();
  const info=layer.querySelector('#townInfo');
  /* ⚠ 打烊時在時刻後面補一句（ver -391）：櫃台鈕不見了要有理由，
     不然玩家只會覺得「按鈕怎麼消失了」。 */
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
  if(on) updateCompass(); else
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

function exitsOf(){
  const n=node(); const ex=Object.assign({}, (n&&n.exits)||{});
  /* `back` 沒有自己的箭：只有它的時候掛到「下」。 */
  if(ex.back && !ex.down){ ex.down=ex.back; }
  delete ex.back;
  /* ══ 出航（ver -387，Ray：「預設的城鎮入口下方為『出航』」）══
     ⚠ 走**同一套**方向出口（長按那一支箭／字格），不另做一顆鈕 —— 對玩家而言
       「往下走」與「出航」是同一個動作，只是目的地在城外（鐵律 8）。
     ⚠ 目的地 id 用 `__sail` 這個保留字，由 `go()` 攔下來分流。 */
  if(n && n.sail && !ex.down) ex.down=SAIL_ID;
  return ex;
}
const SAIL_ID='__sail';
function nameOfNode(id){
  if(id===SAIL_ID) return '出航';
  return ((TOWNS[townId]||{}).nodes[id]||{}).name?.replace(/^帝都　/,'')||'';
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
  /* 長按開始：只認**有目的地**的箭。 */
  st.addEventListener('pointerdown', e=>{
    if(!townId || busy || story.isPlaying()) return;
    const el=e.target.closest && e.target.closest('.kerb-arrow.avail');
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    const to=exitsOf()[el.dataset.dir]; if(!to) return;
    el.classList.add('holding');
    const r=el.getBoundingClientRect(), sr=st.getBoundingClientRect();
    hintShowAt(r.left-sr.left+r.width/2, r.top-sr.top+r.height/2, nameOfNode(to));
    hold={ el, to, t0:performance.now(), raf:0, timer:0 };
    const tick=()=>{ if(!hold) return;
      hintProgress((performance.now()-hold.t0)/HOLD_MS);
      if(performance.now()-hold.t0 < HOLD_MS) hold.raf=requestAnimationFrame(tick); };
    tick();
    hold.timer=setTimeout(()=>{ const target=hold.to; cancel(); go(target); }, HOLD_MS);
  }, true);
  st.addEventListener('pointerup', e=>{
    if(hold){ cancel(); return; }               // 放太早：取消，不算點擊
    if(!townId || busy || story.isPlaying()) return;
    if(e.target.closest && e.target.closest('#townCounter')) return;
    /* ══ 單純點畫面 ＝ 路人單句（ver -387，Ray 指定四個地方都有）══
       節奏是**點一下出一句、再點一下收掉**，收掉之前不出下一句 ——
       一直點就一直換句的話，玩家永遠讀不完一句。
       ⚠ 商店／公會不再「點畫面就開選單」：入口改成櫃台鈕（鐵律 8，見 ensureLayer）。 */
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
      timer=setTimeout(()=>{ stop(); go(to); }, HOLD_MS);
    });
    b.addEventListener('pointerup', e=>{ e.stopPropagation(); stop(); });
    b.addEventListener('pointercancel', stop);
    b.addEventListener('pointerleave', stop);
  });
}

/* ══ 移動 ══
   ⚠ 參數是**目的地的節點 id**，不是方向（ver -370 修）：手勢／羅盤那一段已經把方向
   換算成目的地了，這裡再查一次 `exits[dir]` 只會查到 undefined（實測踩過：
   提示出得來、時間也滿了，就是不會走）。 */
function go(to){
  if(!to) return;
  if(to===SAIL_ID){ setSail(); return; }
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');          // 移動中把羅盤收起來
  try{ SFX.play('resources/audio/se/se_walk.m4a'); }catch(_){}
  clock.advance(STEP_MIN);
  setTimeout(()=>enter(to), 260);
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
    try{ SFX.play('resources/audio/se/se_walk.m4a'); }catch(_){}
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
  bgNat=null;               // 背景要重載，舊的尺寸不能拿來擺新的櫃台鈕
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
  const flag = n.kind ? ('town_kind_'+n.kind) : ('town_'+townId+'_'+id);
  const played = prog.hasFlag(flag);
  /* ⚠ **打烊時不播進場對白**（ver -391）：在一間關著的店裡讓店主開口是錯的。
     旗標也不會記，所以那一段會留到下次在營業時間內進來時才播 —— 不會漏掉。 */
  /* ⚠ **傍晚的提醒優先所有事件**（ver -392，Ray 指定）：它**取代**這一次抵達原本要演的
     進場對白，而那一段的旗標不會記 —— 下次再進來還是會演（同上面「打烊不播」的作法）。 */
  const ev = eveningDue(n);
  const lines = ev ? ev.lines : ((played || !isOpenNow(n)) ? [] : (n.lines||[]));
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
        if(ev){ if(ev.flag) prog.addFlags([ev.flag]); }   // 傍晚的提醒：只演一次
        else{
          applyAff(lines);
          prog.addFlags([flag]);                  // ⚠ 演完才記（見上面的說明）
          /* 這一段演完才成立的事（ver -375）：公會登記完才開得了懸賞榜。
             ⚠ 記在**播完**時，中途離開（或戰鬥沒打完）就不算。 */
          if(n.boardFlag) prog.addFlags([n.boardFlag]);
        }
        busy=false; refreshArrows(); showNav(true);
        afterArrive(n); }, { sides:n.sides });
    }, ARRIVE_MS);
  }else{
    busy=false; refreshArrows(); showNav(true);
    afterArrive(n);
  }
}

/* 進場對白（或傍晚的提醒）演完之後才成立的事。目前只有旅店大廳。
   ⚠ 兩條路（有對白／沒對白）都要呼叫它 —— 漏一條就是「有時候有大廳、有時候沒有」。 */
function afterArrive(n){
  if(n && n.inn) inn.arrive(n, { allSeen: allSeen() });
  else inn.close();
}

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
    busy=true; showNav(false);
    story.playAdhoc(n.challengeLines, ()=>{
      story.clearCast();
      busy=false; showNav(true);
      openShop();
    });
  } : null;
  showShop(n.shop, hasTalk ? [1] : null, ()=>{
    let lines = (n.keeper && n.keeper.length) ? n.keeper : null;
    if(!lines && rnd){
      let i=Math.floor(Math.random()*rnd.length);
      if(rnd.length>1 && i===lastKeeper) i=(i+1)%rnd.length;   // 不要連續兩次同一句
      lastKeeper=i;
      const who=n.keeperWho||'SHOPKEEP';
      lines=[{ speaker:who, text:rnd[i], portrait:{ char:who, show:true } }];
    }
    if(!lines) return;
    busy=true; showNav(false);
    story.playAdhoc(lines, ()=>{
      story.clearCast();                 // 鐵律 8：離開這一段就清場
      busy=false; showNav(true);
      openShop();                        // 談完回到櫃台
    });
  }, onChallenge);
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
  story.flashLine(list[i], '');
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

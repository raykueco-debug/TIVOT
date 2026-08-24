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
import { showShop } from './loot.js';
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
function bgFor(base, noTime){
  const cands = noTime ? [base] : [clock.bgName(base), base+'_Day', base];
  const tryAt=(i)=>{
    if(i>=cands.length) return;
    const name=cands[i];
    const img=new Image();
    img.onload =()=>{ story.setSceneBg(name);
      if(i>0 && !missingBg.has(cands[0])){ missingBg.add(cands[0]);
        console.info('[town] 沒有這個時段的背景，退回：', cands[0], '→', name); } };
    img.onerror=()=>tryAt(i+1);
    img.src='resources/background/'+name+'.webp';
  };
  tryAt(0);
}

function node(){ return (TOWNS[townId]||{}).nodes[nodeId] || null; }

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
  /* 目的地字格：**上／左／右**三個（下方不做 —— 那通常是「退回上一層」，
     名字寫出來只是重複）。按住字格蓄能滿了才走（Ray 指定）。 */
  layer.innerHTML=['up','left','right'].map(d=>
      '<button class="town-dest '+d+'" data-dir="'+d+'" type="button"><span></span></button>').join('')
    + '<div id="townHint"><svg viewBox="0 0 44 44">'
    + '<circle class="ta-rail" cx="22" cy="22" r="19"/>'
    + '<circle class="ta-prog" cx="22" cy="22" r="19"/></svg>'
    + '<span class="th-label"></span></div>'
    + '<div id="townInfo"></div>'
    + '<button id="townShop" class="town-btn" type="button">商店</button>';
  st.appendChild(layer);
  const sb=layer.querySelector('#townShop');
  if(sb) sb.addEventListener('pointerup', e=>{ e.stopPropagation(); openShop(); });
  return layer;
}

function refreshArrows(){
  const n=node(); if(!n || !layer) return;
  const sb=layer.querySelector('#townShop');
  if(sb) sb.classList.toggle('on', !!n.shop);
  const info=layer.querySelector('#townInfo');
  if(info) info.innerHTML = n.name + '<span class="ti-time">' + clock.timeText() + '</span>';
  /* 目的地字格：有那個方向才出現，字是目的地名，**位置貼著那一支箭**
     （ver -374，Ray：「地名是放在箭頭左右上方」）。
     ⚠ 箭的座標問 `getBoundingClientRect`，不要自己算（鐵律 7）。
     ⚠ 上：擺在箭的**正上方**；左／右：擺在箭的**外側**再往上一點 ——
       正對著箭會把箭遮住，那支箭正在發光晃動，是這一頁的主角。 */
  const ex=exitsOf(), st=story.stageEl();
  const sr=st ? st.getBoundingClientRect() : null;
  layer.querySelectorAll('.town-dest').forEach(b=>{
    const to=ex[b.dataset.dir];
    b.classList.toggle('on', !!to);
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
    }[b.dataset.dir] || [0,0];
    b.style.left=(cx+off[0])+'px'; b.style.top=(cy+off[1])+'px';
    /* ⚠ 夾回畫面內：字格是 `translate(-50%,-50%)` 置中的，貼著箭放會半格出界
       （實測左邊那格 left=-33）。量完自己的寬度再夾一次。 */
    const bw=b.getBoundingClientRect().width/2 || 40;
    const x=Math.min(Math.max(cx+off[0], bw+8), sr.width-bw-8);
    b.style.left=x+'px';
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
  return ex;
}
function nameOfNode(id){ return ((TOWNS[townId]||{}).nodes[id]||{}).name?.replace(/^帝都　/,'')||''; }

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
    if(e.target.closest && e.target.closest('#townShop')) return;
    /* 單純點畫面：商店節點 → 開買賣選單（Ray 指定）；其餘 → 路人閒聊。 */
    const n=node();
    if(n && n.shopOnTap && n.shop){ openShop(); return; }
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
  busy=true; showNav(false);
  document.body.classList.remove('town-nav');          // 移動中把羅盤收起來
  try{ SFX.play('resources/audio/se/se_walk.mp3'); }catch(_){}
  clock.advance(STEP_MIN);
  setTimeout(()=>enter(to), 260);
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
  bgFor(n.bg, n.noTime);
  ensureLayer(); bindInput(); refreshArrows(); showNav(false);
  /* ⚠⚠ 進場對白**一律只播一次**（ver -373，Ray：「對話只觸發一次，不重複觸發」）——
     不再看節點的 `once` 欄位：漏寫就會變成每次進去都重播，那是「預設值站錯邊」。
     旗標記在 progress 的 flags，存檔要帶。 */
  const flag='town_'+townId+'_'+id;
  const played = prog.hasFlag(flag);
  const lines = played ? [] : (n.lines||[]);
  if(lines.length) prog.addFlags([flag]);
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
      story.playAdhoc(play, ()=>{ applyAff(lines); story.clearCast();
        busy=false; refreshArrows(); showNav(true); }, { sides:n.sides });
    }, ARRIVE_MS);
  }else{
    busy=false; refreshArrows(); showNav(true);
  }
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
  showShop(n.shop, n.keeper, ()=>{
    if(!n.keeper || !n.keeper.length) return;
    busy=true; showNav(false);
    story.playAdhoc(n.keeper, ()=>{
      story.clearCast();                 // 鐵律 8：離開這一段就清場
      busy=false; showNav(true);
      openShop();                        // 談完回到櫃台
    });
  });
}

/* 路人閒聊：**單句**，不進對話模式（Ray 指定）。再點一下換下一句。 */
function chatter(){
  const n=node(); const list=n && n.chatter;
  if(!list || !list.length) return;
  let i=Math.floor(Math.random()*list.length);
  if(list.length>1 && i===lastChat) i=(i+1)%list.length;
  lastChat=i;
  story.flashLine(list[i], '');
}

export function open(town){
  townId = town || 'capital';
  const T=TOWNS[townId]; if(!T) return;
  const st=story.stageEl(); if(st){ st.classList.add('on','town-on'); }
  document.body.classList.add('story-on');
  story.showPanel();          // 下半的面盤（不擺會是一片全黑）
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

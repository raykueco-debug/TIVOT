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
const DIRS = ['up','down','left','right','back'];

let townId=null, nodeId=null, layer=null, busy=false;

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
  layer.innerHTML='<div id="townHint"><svg viewBox="0 0 44 44">'
    + '<circle class="ta-rail" cx="22" cy="22" r="19"/>'
    + '<circle class="ta-prog" cx="22" cy="22" r="19"/></svg>'
    + '<span class="th-label"></span></div>'
    + '<div id="townInfo"></div>'
    + '<button id="townShop" class="town-btn" type="button">商店</button>';
  st.appendChild(layer);
  const sb=layer.querySelector('#townShop');
  if(sb) sb.addEventListener('pointerup', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
    const n=node(); if(n && n.shop) showShop(n.shop, n.keeper); });
  return layer;
}

function refreshArrows(){
  const n=node(); if(!n || !layer) return;
  const sb=layer.querySelector('#townShop');
  if(sb) sb.classList.toggle('on', !!n.shop);
  const info=layer.querySelector('#townInfo');
  if(info) info.textContent = n.name + '　' + clock.timeText();
}

function showNav(on){ if(layer) layer.classList.toggle('on', !!on); }

/* 方向提示：擺到該方向的邊上，標目的地名，蓄能圈歸零。 */
const HINT_R=19, HINT_C=2*Math.PI*HINT_R;
function hintShow(dir, name){
  const h=layer && layer.querySelector('#townHint'); if(!h) return;
  h.className='dir-'+dir+' on';
  const lab=h.querySelector('.th-label'); if(lab) lab.textContent=name||'';
  const pr=h.querySelector('.ta-prog');
  pr.style.strokeDasharray=HINT_C; pr.style.strokeDashoffset=HINT_C;
}
function hintProgress(p){
  const h=layer && layer.querySelector('#townHint'); if(!h) return;
  const pr=h.querySelector('.ta-prog');
  pr.style.strokeDashoffset=HINT_C*(1-Math.min(1,Math.max(0,p)));
}
function hintHide(){ const h=layer && layer.querySelector('#townHint'); if(h) h.className=''; }

/* ══ 移動 ══ */
/* ⚠ 參數是**目的地的節點 id**，不是方向（ver -370 修）：手勢那一段已經把方向
   換算成目的地了，這裡再查一次 `exits[dir]` 只會查到 undefined（實測踩到：
   提示出得來、時間也滿了，就是不會走）。 */
function go(to){
  if(!to) return;
  busy=true; showNav(false);
  try{ SFX.play('resources/audio/se/se_walk.mp3'); }catch(_){}
  clock.advance(STEP_MIN);
  setTimeout(()=>enter(to), 260);
}

/* ══ 進節點 ══ */
export function enter(id){
  const T=TOWNS[townId]; if(!T) return;
  const n=T.nodes[id]; if(!n){ console.warn('[town] 沒有這個節點：', id); busy=false; return; }
  nodeId=id;
  /* ⚠⚠ **換節點先清場**（ver -370）：立繪是持續狀態，不清的話上一個地點的人
     會站在新的背景前面。這是引擎層的規矩，由 `story.clearCast()` 一支負責。 */
  story.clearCast();
  bgFor(n.bg, n.noTime);
  ensureLayer(); bindInput(); refreshArrows(); showNav(false);
  /* 第一次進來才播對白（`once`）。⚠ 旗標記在 progress 的 flags —— 存檔要帶。 */
  const flag='town_'+townId+'_'+id;
  const first = !(n.once && prog.hasFlag(flag));
  const lines = first ? (n.lines||[]) : [];
  if(n.once && first) prog.addFlags([flag]);
  if(lines.length){
    /* ⚠ 對白演完**把立繪全撤**，只留背景與導覽（Ray 指定）——
       城鎮是「看得到路」的畫面，人講完話就該退場。 */
    story.playAdhoc(lines, ()=>{ applyAff(lines); story.clearCast();
      busy=false; refreshArrows(); showNav(true); });
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

/* ══ 輸入（ver -370）══
   一個 pointer 手勢分兩種結果：
     **滑動並按住** → 往那個方向移動（提示＋蓄能圈，滿了才走）
     **只是點一下** → 路人閒聊（單句，不進對話模式）
   ⚠ 對白播放中整組不接管（`story.isPlaying()`）—— 推進台詞是劇情層的事。 */
const DRAG_MIN=26;        // 超過這麼多像素才算「往某個方向滑」
let lastChat=-1;
function dirOf(dx,dy){
  if(Math.abs(dx)<DRAG_MIN && Math.abs(dy)<DRAG_MIN) return null;
  return Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
}
function exitsOf(){ const n=node(); return (n&&n.exits)||{}; }
function nameOfNode(id){ return ((TOWNS[townId]||{}).nodes[id]||{}).name?.replace(/^帝都　/,'')||''; }

function bindInput(){
  const st=story.stageEl(); if(!st || st.__townBound) return;
  st.__townBound=true;
  let p0=null, dir=null, t0=0, raf=0, timer=0;
  const cancel=()=>{ cancelAnimationFrame(raf); clearTimeout(timer); raf=timer=0;
    dir=null; hintHide(); };
  st.addEventListener('pointerdown', e=>{
    if(!townId || busy || story.isPlaying()) return;
    if(e.target.closest && e.target.closest('#townShop')) return;
    p0={ x:e.clientX, y:e.clientY, moved:false }; cancel();
  });
  st.addEventListener('pointermove', e=>{
    if(!p0 || busy) return;
    const d=dirOf(e.clientX-p0.x, e.clientY-p0.y);
    if(!d){ if(dir) cancel(); return; }
    p0.moved=true;
    if(d===dir) return;                        // 同一個方向：繼續蓄能，不要重新開始
    cancel();
    /* `back` 當成「沒有那個方向時的退路」：室內只有一個出口，往任何方向滑都回去。 */
    const ex=exitsOf();
    const to = ex[d] || (ex.back && !ex.up && !ex.down && !ex.left && !ex.right ? ex.back : null);
    if(!to) return;
    dir=d; t0=performance.now();
    hintShow(d, nameOfNode(to));
    const tick=()=>{ hintProgress((performance.now()-t0)/HOLD_MS);
      if(performance.now()-t0 < HOLD_MS) raf=requestAnimationFrame(tick); };
    tick();
    timer=setTimeout(()=>{ const target=to; cancel(); go(target); }, HOLD_MS);
  });
  const up=e=>{
    if(!p0) return;
    const moved=p0.moved; p0=null;
    const hadDir=!!dir; cancel();
    if(moved || hadDir) return;                // 滑過就不算點
    chatter();                                 // 單純點一下 → 路人閒聊
  };
  st.addEventListener('pointerup', up);
  st.addEventListener('pointercancel', ()=>{ p0=null; cancel(); });
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
}
export function isOpen(){ return !!townId; }

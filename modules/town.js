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

/* ══ 箭頭層 ══ */
function ensureLayer(){
  if(layer && layer.parentNode) return layer;
  const st=story.stageEl(); if(!st) return null;
  layer=document.createElement('div'); layer.id='townNav';
  layer.innerHTML=DIRS.map(d=>
      '<button class="town-arrow '+d+'" data-dir="'+d+'" type="button">'
    +   '<svg viewBox="0 0 40 40"><circle class="ta-rail" cx="20" cy="20" r="17"/>'
    +   '<circle class="ta-prog" cx="20" cy="20" r="17"/></svg>'
    +   '<i class="ta-tip"></i><span class="ta-label"></span>'
    + '</button>').join('')
    + '<div id="townInfo"></div>'
    + '<button id="townShop" class="town-btn" type="button">商店</button>';
  st.appendChild(layer);
  bindArrows();
  return layer;
}

/* 按住蓄能 → 滿了才走（防誤觸）。⚠ 放開／移出去都取消，並把圈歸零。 */
function bindArrows(){
  layer.querySelectorAll('.town-arrow').forEach(b=>{
    let t0=0, raf=0, timer=0;
    const prog2=b.querySelector('.ta-prog');
    const C=2*Math.PI*17;
    prog2.style.strokeDasharray=C;
    const reset=()=>{ cancelAnimationFrame(raf); clearTimeout(timer);
      prog2.style.strokeDashoffset=C; b.classList.remove('charging'); };
    const tick=()=>{ const p=Math.min(1,(performance.now()-t0)/HOLD_MS);
      prog2.style.strokeDashoffset=C*(1-p);
      if(p<1) raf=requestAnimationFrame(tick); };
    const start=e=>{
      if(busy) return;
      e.preventDefault(); e.stopPropagation();
      t0=performance.now(); b.classList.add('charging'); tick();
      timer=setTimeout(()=>{ reset(); go(b.dataset.dir); }, HOLD_MS);
    };
    b.addEventListener('pointerdown', start);
    b.addEventListener('pointerup', e=>{ e.stopPropagation(); reset(); });
    b.addEventListener('pointercancel', reset);
    b.addEventListener('pointerleave', reset);
  });
  const sb=layer.querySelector('#townShop');
  if(sb) sb.addEventListener('pointerup', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
    const n=node(); if(n && n.shop) showShop(n.shop, (TOWNS[townId].nodes[nodeId]||{}).keeper); });
}

function refreshArrows(){
  const n=node(); if(!n || !layer) return;
  const names=(TOWNS[townId]||{}).nodes;
  layer.querySelectorAll('.town-arrow').forEach(b=>{
    const to=(n.exits||{})[b.dataset.dir];
    b.classList.toggle('on', !!to);
    const lab=b.querySelector('.ta-label');
    if(lab) lab.textContent = to ? (names[to]||{}).name?.replace(/^帝都　/,'') || '' : '';
  });
  const sb=layer.querySelector('#townShop');
  if(sb) sb.classList.toggle('on', !!n.shop);
  const info=layer.querySelector('#townInfo');
  if(info) info.textContent = n.name + '　' + clock.timeText();
}

function showNav(on){
  if(!layer) return;
  layer.classList.toggle('on', !!on);
}

/* ══ 移動 ══ */
function go(dir){
  const n=node(); if(!n) return;
  const to=(n.exits||{})[dir]; if(!to) return;
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
  bgFor(n.bg, n.noTime);
  ensureLayer(); refreshArrows(); showNav(false);
  /* 第一次進來才播對白（`once`）。⚠ 旗標記在 progress 的 flags —— 存檔要帶。 */
  const flag='town_'+townId+'_'+id;
  const first = !(n.once && prog.hasFlag(flag));
  const lines = first ? (n.lines||[]) : [];
  if(n.once && first) prog.addFlags([flag]);
  if(lines.length){
    story.playAdhoc(lines, ()=>{ applyAff(lines); busy=false; refreshArrows(); showNav(true); });
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

/* 路人閒聊（酒館那種）：導覽開著的時候點畫面 → 隨機一句背景人聲。
   ⚠ 用 `VOICE` 這個沒有名字、沒有立繪的說話者 —— 讀起來才像鄰桌傳來的。
   ⚠ 只在**導覽開著**（沒有對白在播）時才算，否則會與推進台詞打架。 */
let lastChat=-1;
function bindChatter(){
  const st=story.stageEl(); if(!st || st.__chatBound) return;
  st.__chatBound=true;
  st.addEventListener('click', e=>{
    if(!townId || busy) return;
    if(story.isPlaying()) return;                       // 對白播放中 → 交給劇情層
    const n=node(); const list=n && n.chatter;
    if(!list || !list.length) return;
    if(e.target.closest && e.target.closest('#townNav')) return;   // 點在箭頭上不算
    let i=Math.floor(Math.random()*list.length);
    if(list.length>1 && i===lastChat) i=(i+1)%list.length;         // 不要連兩次同一句
    lastChat=i;
    busy=true; showNav(false);
    story.playAdhoc([{ speaker:'VOICE', text:list[i] }],
                    ()=>{ busy=false; showNav(true); });
  });
}

export function open(town){
  townId = town || 'capital';
  const T=TOWNS[townId]; if(!T) return;
  const st=story.stageEl(); if(st){ st.classList.add('on','town-on'); }
  document.body.classList.add('story-on');
  story.showPanel();          // 下半的面盤（不擺會是一片全黑）
  bindChatter();
  busy=false;
  enter(T.entry);
}
export function close(){
  const st=story.stageEl(); if(st) st.classList.remove('town-on');
  showNav(false);
  townId=null; nodeId=null;
}
export function isOpen(){ return !!townId; }

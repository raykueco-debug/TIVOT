/* ══════════════════════════════════════════════════════════════════════
   story.js — 主線 scene 播放器（TIVOT_SCRIPT_ARCHITECTURE §3 / §5）
   ──────────────────────────────────────────────────────────────────────
   吃 script/mainScript.js 的 scene 鏈，一句一句演出來；scene 播完寫
   stage / flags，再依 next 接下一段。

   ── 站位（Ray 定案，取代規格 §3 原有的逐句 pos）────────────────────
   **右位 ＝ 該段對話的「發起位」**：發起人（scene 的 lines[0].speaker）
   固定站右，整段不動；其他人共用左位輪替（同側換人＝舊的滑出、新的滑入）。
   ⚠ 這推翻了 CLAUDE.md §6.5 原本寫的「站位寫在角色資料裡、安雅固定在右」——
     那條是飛行頁閒聊的規則，主線改採發起位制。兩處行為不同是有意的：
     閒聊沒有「發起人」可言，主線每一段都有。
   ⚠ 因此四名女角**每個人都可能站左或站右**，取景參數兩側都要成立
     （不像飛行頁只有安雅在右）。

   ── 明暗（CLAUDE.md §6.5）────────────────────────────────────────
   說話者原色，其餘 brightness(.38) saturate(.75)。
   ⚠ 壓暗必須**不透明** —— DOM 版用 CSS filter 天生不透明，符合要求；
     那條「不可用透明度代替」的警告是給 canvas 版的。

   ── 取景（CLAUDE.md §6.5）────────────────────────────────────────
   縮放**鎖身高**不鎖眼寬；每公分像素與縮放自洽，四人腳底落同一條地平線。
   立繪不可越中線 —— 夾的是**輪廓**不是圖框（留白佔圖寬 2~5 成），
   輪廓界由 measureBounds 在載入時量一次。
   ══════════════════════════════════════════════════════════════════════ */

import { MAIN_SCRIPT, MAIN_ENTRY } from '../script/mainScript.js';
import { SPEAKERS, ART, CAST_TALL, nameOf, artOf } from '../script/speakers.js';
import * as prog from '../script/progress.js';
import { decorateLine } from '../i18n.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);

/* ── 舞台幾何 ──
   CAST_SHOW：最高的人露出身體的幾成。**這是「立繪多大」的唯一旋鈕**，
   值越小＝鏡頭越近＝立繪越大（與 flight 同義同值）。 */
const CAST_SHOW = 0.52;
const SLIDE_MS  = 450;          // 進場滑入（CLAUDE.md §6.5：450ms ease-out）
const TYPE_MS   = 22;           // 打字機每字間隔

let cur = null;                 // 目前 scene 物件
let lineIdx = 0;
let initiator = null;           // 本段的發起人 id（固定站右）
let slot = { L:null, R:null };  // 兩個位置目前站誰（角色 id）
let shown = {};                 // 角色 id → 目前的 portrait 狀態 {expr, show}
let typing = null;              // 打字機 timer
let active = false;
let onExit = null;              // 播完/退出後的回呼

const missingExpr = new Set();  // 已回報過的缺圖，避免洗版

/* ══ 立繪素材解析 ══
   expr 查不到 → 回退 base 立繪，並在 console 記一筆（只記一次）。
   ⚠ 差分素材目前全部不存在，所以**每一句都會走回退**——這是預期狀態。
     console 那串正好就是「還缺哪些圖」的清單。 */
function srcFor(artKey, expr){
  const a = ART[artKey]; if(!a) return '';
  if(expr && a.expr && a.expr[expr]) return a.expr[expr];
  if(expr){
    const tag = artKey+'/'+expr;
    if(!missingExpr.has(tag)){ missingExpr.add(tag);
      console.info('[story] 表情差分尚無素材，回退基本立繪：', tag); }
  }
  return a.base;
}

/* ══ 輪廓界：立繪不可越中線，夾的是輪廓不是圖框 ══
   ⚠⚠ **只量看得見的那一段**（CLAUDE.md §6.5）。整張圖一起量是錯的：
     蕾娜的散髮、諾薇兒的裙襬都在畫面外，卻會把輪廓撐寬一倍以上，
     夾中線時就把人整個推出畫面。實測蕾娜全圖輪廓 548px、
     只量頭到腰那段只有一半左右。
   y0/y1 是**圖檔像素**的列範圍。結果按範圍分桶快取，換句台詞不必重量。 */
function measureBounds(img, y0, y1){
  const H=img.naturalHeight, W=img.naturalWidth;
  if(!W||!H) return { l:0, r:W };
  y0=Math.max(0, Math.min(H-1, y0|0));
  y1=Math.max(y0+1, Math.min(H, y1|0));
  const key=(y0/16|0)+'_'+(y1/16|0);
  img._bcache = img._bcache || {};
  if(img._bcache[key]) return img._bcache[key];

  let b={ l:0, r:W };
  try{
    const sc=Math.min(1, 256/W);
    const cw=Math.max(1,(W*sc)|0), ch=Math.max(1,((y1-y0)*sc)|0);
    const c=document.createElement('canvas'); c.width=cw; c.height=ch;
    const g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(img, 0,y0,W,(y1-y0), 0,0,cw,ch);      // 只畫可見的那一段
    const d=g.getImageData(0,0,cw,ch).data;
    let l=cw, r=-1;
    for(let y=0;y<ch;y++) for(let x=0;x<cw;x++)
      if(d[(y*cw+x)*4+3]>16){ if(x<l)l=x; if(x>r)r=x; }
    if(r>=l) b={ l:l/sc, r:(r+1)/sc };
  }catch(e){ /* 跨來源會擋 getImageData；退回圖框（不夾中線也不會壞） */ }
  img._bcache[key]=b; return b;
}

/* ══ 取景：**兩槽一起算** ══
   ⚠ 不能各算各的：pxCm（每公分幾像素）是共用的，四個人的腳才會落在同一條
     地平線上（CLAUDE.md §6.5）。而「不可越中線」的縮限也必須套用到全體 ——
     只縮一個人會讓身高比例當場失真。 */
function layout(){
  const stage=$('storyStage'); if(!stage) return;
  const W=stage.clientWidth, H=stage.clientHeight;
  if(!W || !H) return;
  const top=topLine();

  /* 最高的人定義相機：頭頂貼頂線、身體露出 CAST_SHOW。 */
  let pxCm = (H-top)/(CAST_SHOW*CAST_TALL);

  const on=[];
  for(const side of ['L','R']){
    const el=slotEl(side), id=slot[side];
    if(!el || !id || !el.naturalWidth) continue;
    const a=artOf(id); if(!a) continue;
    on.push({ el, a, side });
  }
  if(!on.length) return;
  const solo = on.length===1;

  /* 依 pxCm 求每個人的縮放、頭頂 y、以及**畫面內看得見的那一段圖列**，
     只拿那一段量輪廓（見 measureBounds 的警告）。 */
  const calc = ()=>on.map(o=>{
    const a=o.a;
    const s     = pxCm*a.cm/(a.bot-a.top);
    const headY = top + (CAST_TALL-a.cm)*pxCm;
    const yTop  = headY - s*a.top;                    // 圖框上緣的螢幕 y
    const visLo = a.top;                              // 頭頂
    const visHi = Math.min(a.bot, a.top + (H-headY)/s);  // 畫面下緣對應的圖列
    return { ...o, s, headY, yTop, b:measureBounds(o.el, visLo, visHi) };
  });

  let m = calc();
  /* ⚠ 兩人同台時每人只有半屏。用**可見段**的輪廓去比，超出才全體等比縮小
     （維持身高比與地平線）。單人不夾中線、臉置中，預算放到 92%。 */
  const budget = solo ? W*0.92 : W*0.5-6;
  let cap=1;
  for(const o of m){ const wSil=o.s*(o.b.r-o.b.l); if(wSil>budget) cap=Math.min(cap, budget/wSil); }
  if(cap<1){ pxCm*=cap; m=calc(); }

  /* ⚠ 垂直落點：頂線是**上限**（不撞退出鈕），不是非貼不可。
     被輪廓預算縮小之後照樣把頭頂釘在頂線的話，畫面下方會空一大塊。
     所以縮小時改成**把腳落到畫面底**（那本來就是 §6.5 要的「四個人的腳
     落在同一條地平線上」）；沒縮小、腳本來就在畫面外時 shift=0，維持貼頂。 */
  let shift=0;
  for(const o of m) shift=Math.max(shift, H - (o.yTop + o.s*o.a.bot));
  shift=Math.max(0, shift);

  for(const o of m){
    const a=o.a, el=o.el, NW=el.naturalWidth;
    /* ⚠ 站到**非基準邊**要水平翻轉（見 speakers.js 的 faces）—— 這樣不管站哪邊
       都面向畫面中央。翻轉會連帶改變臉的橫向位置與輪廓左右界：
       fx 變 (1-fx)、輪廓界對調成 (NW-r, NW-l)。量測值本身不動，那是原圖的數字。 */
    const flip = !a.noFlip && a.faces && o.side!==a.faces;
    el.classList.toggle('flip', !!flip);
    const fx = flip ? (1-a.fx) : a.fx;
    const bl = flip ? (NW-o.b.r) : o.b.l;
    const br = flip ? (NW-o.b.l) : o.b.r;
    /* 橫向錨的是**臉的中心**（fx），不是圖框中心 —— 插畫左右留白差很多。 */
    const faceX = solo ? W*0.5 : (o.side==='R' ? W*0.74 : W*0.26);
    let x = faceX - o.s*fx*NW;
    if(!solo){                                        // 夾中線：夾輪廓不夾圖框
      const mid=W/2;
      if(o.side==='L'){ const r=x+o.s*br; if(r>mid) x-=(r-mid); }
      else            { const l=x+o.s*bl; if(l<mid) x+=(mid-l); }
      /* ⚠ 夾完再把**輪廓**拉回畫面內：夾中線只保證不互相越界，
         不保證沒被推出外緣（諾薇兒的裙襬就會把她整個頂出左邊）。 */
      const lEdge=x+o.s*bl, rEdge=x+o.s*br;
      if(lEdge<0)      x -= lEdge;
      else if(rEdge>W) x -= (rEdge-W);
    }
    el.style.width  = (o.s*el.naturalWidth)+'px';
    el.style.height = (o.s*el.naturalHeight)+'px';
    el.style.left   = x+'px';
    el.style.top    = (o.yTop+shift)+'px';
  }
}

/* 頂線：**由退出鈕的實際位置量出來**，不寫死 —— 那顆鈕吃 safe-area，
   寫死在瀏海機上一定會撞到（作法同 flight 的 castMeasure 量 HUD）。 */
function topLine(){
  const st=$('storyStage'), ex=$('storyExit');
  if(!st) return 56;
  if(!ex) return 56;
  const h = ex.getBoundingClientRect().bottom - st.getBoundingClientRect().top;
  return Math.round((h>0 ? h : 46) + 10);      // 鈕底下再留 10px，不相觸
}

/* ══ 立繪槽 ══ */
function slotEl(side){ return $(side==='R' ? 'storyCastR' : 'storyCastL'); }

/* 讓某角色出現在他該在的位置；已在場就只更新表情。回傳他所在的 side。 */
function ensureOn(id, expr){
  const sp = SPEAKERS[id]; if(!sp) return null;
  const side = (id===initiator) ? 'R' : 'L';
  const el = slotEl(side); if(!el) return null;
  const src = srcFor(sp.art, expr);
  const swapping = (slot[side] && slot[side]!==id);

  if(slot[side]!==id || el.getAttribute('src')!==src){
    const apply = ()=>{
      el.onload = ()=>{ el.onload=null; layout(); el.classList.add('on'); };
      el.setAttribute('src', src);
      el.dataset.who = id;
      if(el.complete && el.naturalWidth){ el.onload=null; layout(); el.classList.add('on'); }
    };
    if(swapping){
      /* 同側換人：舊的先滑出，再換新的滑入（CLAUDE.md §6.5 的輪轉換卡）。 */
      el.classList.remove('on');
      setTimeout(apply, SLIDE_MS*0.45);
    }else{
      el.classList.remove('on');            // 重設起點，讓 transition 有東西可跑
      setTimeout(apply, 16);
    }
    slot[side]=id;
  }
  return side;
}

function leaveSlot(side){
  const el=slotEl(side); if(!el) return;
  el.classList.remove('on'); slot[side]=null;
  layout();                       // ⚠ 人數變了＝預算與縮限跟著變，剩下的人要重排
}

/* 明暗：說話者原色，其餘壓暗。 */
function highlight(side){
  for(const s of ['L','R']){
    const el=slotEl(s); if(!el) continue;
    el.classList.toggle('dim', slot[s] && s!==side);
  }
}

/* ══ {P} 代換：**顯示的這一刻才換**（玩家中途改名，下一句就會是新名字）══ */
function subst(t){ return String(t==null?'':t).split('{P}').join(prog.getPlayerName()); }

/* ══ 打字機 ══ */
function typeOut(el, text){
  clearInterval(typing);
  const full = subst(text); let i=0;
  el.innerHTML='';
  typing = setInterval(()=>{
    i++;
    el.innerHTML = decorateLine(full.slice(0,i));   // 逐字重繪：關鍵字補完最後一字才上色
    if(i>=full.length){ clearInterval(typing); typing=null; }
  }, TYPE_MS);
}
function typeFinish(el, text){
  clearInterval(typing); typing=null;
  el.innerHTML = decorateLine(subst(text));
}

/* ══ 演一句 ══ */
function renderLine(){
  const line = cur.lines[lineIdx];
  if(!line) return;

  /* 插入戰鬥：本輪先跳過（戰鬥接線是 battles.js 的工作，尚未實作）。 */
  if(line.battle){
    console.info('[story] 遇到戰鬥插入點，本輪尚未接戰鬥系統，跳過：', line.battle);
    return advance();
  }

  const who = (line.portrait && line.portrait.char) || line.speaker;
  const p   = line.portrait || {};

  /* 只寫變化的部分：省略 ＝ 沿用上一狀態。 */
  const prev = shown[who] || {};
  const st   = { expr: (p.expr!==undefined ? p.expr : prev.expr),
                 show: (p.show!==undefined ? p.show : (prev.show!==undefined ? prev.show : true)) };
  shown[who] = st;

  let side = null;
  if(st.show) side = ensureOn(who, st.expr);
  else { const s=(who===initiator)?'R':'L'; if(slot[s]===who) leaveSlot(s); }

  /* 高亮跟著 speaker 走（speaker 與畫面上的人可以不同）。 */
  const spSide = (line.speaker===initiator) ? 'R' : 'L';
  highlight(slot[spSide]===line.speaker ? spSide : side);

  /* CG：全屏插圖蓋過立繪。素材不存在時不顯示（避免破圖），只記一筆。 */
  const cgEl=$('storyCg');
  if(cgEl){
    if(line.cg){
      const tag='cg/'+line.cg;
      if(!missingExpr.has(tag)){ missingExpr.add(tag);
        console.info('[story] CG 尚無素材，暫不顯示：', tag); }
      cgEl.classList.remove('on');
    }else cgEl.classList.remove('on');
  }

  const nm=$('storyName'), tx=$('storyText');
  if(nm) nm.textContent = nameOf(line.speaker);
  if(tx) typeOut(tx, line.text);
}

/* ══ 推進 ══ */
function advance(){
  const line = cur && cur.lines[lineIdx];
  const tx = $('storyText');
  /* 還在打字 → 這一下先補完，不推進（對話演出通則）。 */
  if(typing && line && tx){ typeFinish(tx, line.text); return; }

  lineIdx++;
  if(lineIdx < cur.lines.length){ renderLine(); return; }
  endScene();
}

function endScene(){
  /* scene 收尾才寫進度（規格 §0.2：主線寫，其餘讀）。 */
  if(cur.setStage!=null) prog.setStage(cur.setStage);
  if(cur.setFlags)       prog.addFlags(cur.setFlags);

  const nx = cur.next;
  if(nx && MAIN_SCRIPT[nx]){ playScene(nx); return; }
  if(nx) console.warn('[story] next 指向不存在的 scene：', nx);
  close();
}

function playScene(id){
  const sc = MAIN_SCRIPT[id];
  if(!sc){ console.warn('[story] 找不到 scene：', id); close(); return; }
  cur = sc; lineIdx = 0;
  initiator = (sc.lines[0] && sc.lines[0].speaker) || null;   // 發起人固定站右
  slot={L:null,R:null}; shown={};
  leaveSlot('L'); leaveSlot('R');
  renderLine();
}

/* ══ 對外 ══ */
export function isActive(){ return active; }
/* 存檔要帶的劇情位置。 */
export function getPosition(){ return active && cur ? { scene:cur.sceneId, line:lineIdx } : null; }

export function open(pos, done){
  const st=$('storyStage'); if(!st) return;
  onExit = done || null;
  active = true;
  st.classList.add('on');
  document.body.classList.add('story-on');
  SFX.unlock();
  const id = (pos && pos.scene && MAIN_SCRIPT[pos.scene]) ? pos.scene : MAIN_ENTRY;
  playScene(id);
  if(pos && pos.line>0 && cur && pos.line < cur.lines.length){ lineIdx=pos.line; renderLine(); }
}

export function close(){
  clearInterval(typing); typing=null;
  active=false; cur=null;
  const st=$('storyStage'); if(st) st.classList.remove('on');
  document.body.classList.remove('story-on');
  leaveSlot('L'); leaveSlot('R');
  const cb=onExit; onExit=null; if(cb) cb();
}

/* 讀檔：跳到指定位置（劇情播放中或不在播都可用）。 */
export function jumpTo(pos){
  if(!pos || !pos.scene) return;
  if(!active) return open(pos);
  playScene(pos.scene);
  if(pos.line>0 && cur && pos.line<cur.lines.length){ lineIdx=pos.line; renderLine(); }
}

export function init(){
  const touch=$('storyTouch');
  if(touch) touch.addEventListener('click', ()=>{ if(active) advance(); });
  const ex=$('storyExit');
  if(ex) ex.addEventListener('click', e=>{ e.stopPropagation(); close(); });
  window.addEventListener('resize', ()=>{ if(active) layout(); });
}

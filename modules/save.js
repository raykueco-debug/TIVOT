/* ══════════════════════════════════════════════════════════════════════
   save.js — 劇情層存讀檔（欄位式，10 列一頁，超出增頁）
   ──────────────────────────────────────────────────────────────────────
     F4  即時存檔（寫進專用的快速欄，不佔一般欄位）
     F7  即時讀檔（讀快速欄）
     F5  選取空欄存檔 → 開欄位面板（存檔模式）
     F8  選取存檔     → 開欄位面板（讀檔模式）

   ⚠ **F5 是瀏覽器的重新整理鍵**，必須 preventDefault 才不會整頁重載。
   ⚠ **macOS 預設把 F 鍵當系統功能鍵**（亮度／音量）。沒開「將 F1、F2 等按鍵
     用作標準功能鍵」的話要壓著 fn 一起按。這是系統層的事，程式改不了。
   ⚠ 手機沒有 F 鍵 —— 面板本身是可觸控的，之後在 UI 上補入口即可，
     不必為了手機再寫一套。

   ── 存檔內容（Ray 指定：劇情層全部）──────────────────────────────
     stage / flags / 好感 / 玩家名 ＋ **時鐘 ＋ 道具與金錢** ＋ 目前 scene 與行號
     （＝`progress.runSnapshot()`，「一輪遊戲」的整包，ver -381）。
     ⚠ 戰鬥整備（武器/搭檔的選擇、最佳成績）**不存** —— 那些是跨輪的偏好與成績，
       讀檔把它們拉回去反而是錯的。
     ⚠ 這一包與 `progress.newRun()` 清掉的東西是**同一張清單**：加了新的一輪內存檔，
       兩邊都要加。
   ══════════════════════════════════════════════════════════════════════ */

import * as prog from '../script/progress.js';
import * as story from './story.js';
import { MAIN_SCRIPT } from '../script/mainScript.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const KEY = 'tivot_save_v1';
const ROWS_PER_PAGE = 10;
const SAVE_VERSION = 2;   // v2：改存「一輪遊戲」整包（含時鐘與道具，ver -381）

let page = 0;
let mode = null;               // 'save' | 'load' | null（面板關閉）

/* ══ 存檔庫讀寫 ══
   結構：{ quick: 存檔物件|null, slots: { "1": 存檔物件, … } }
   ⚠ 欄位鍵是**字串化的 1-based 序號**，不是陣列 —— 中間可以有空欄。 */
function load(){
  try{
    const j=JSON.parse(localStorage.getItem(KEY)||'null');
    if(j && typeof j==='object') return { quick:j.quick||null, slots:j.slots||{} };
  }catch(e){}
  return { quick:null, slots:{} };
}
function store(db){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }

/* ══ 目前狀態 → 一筆存檔 ══ */
function capture(){
  const pos = story.getPosition();
  return {
    v: SAVE_VERSION,
    ts: Date.now(),
    /* ⚠ v2 起存的是**一輪遊戲**整包（進度＋時鐘＋道具金錢）——
       「劇情只跑一次」是指一輪內只跑一次，所以讀檔要把那一輪的狀態整組帶回去。
       v1 的舊存檔只有 `progress`，`apply()` 照樣吃得下（見那裡）。 */
    run: prog.runSnapshot(),
    pos: pos,                       // null＝不在劇情中（只存了進度）
    label: labelOf(pos),
  };
}
function labelOf(pos){
  if(!pos) return '（劇情外）';
  const sc = MAIN_SCRIPT[pos.scene];
  const total = sc ? sc.lines.length : '?';
  return `${pos.scene}  ${pos.line+1}/${total}`;
}

/* ══ 套用一筆存檔 ══ */
function apply(rec){
  if(!rec) return false;
  /* v2＝整輪；v1 的舊存檔只有 progress 這一層，照舊吃下去（不要讓舊存檔讀不開）。 */
  if(rec.run) prog.runRestore(rec.run);
  else        prog.restore(rec.progress);
  if(rec.pos) story.jumpTo(rec.pos);
  return true;
}

/* ══ 即時存讀（F4 / F7）══ */
export function quickSave(){
  const db=load(); db.quick=capture(); store(db);
  toast('即時存檔  '+db.quick.label);
  return true;
}
export function quickLoad(){
  const db=load();
  if(!db.quick){ toast('沒有即時存檔'); return false; }
  apply(db.quick);
  toast('即時讀檔  '+db.quick.label);
  return true;
}

/* ══ 欄位面板 ══ */
function maxUsed(db){
  let m=0; for(const k of Object.keys(db.slots)){ const n=parseInt(k,10); if(n>m) m=n; }
  return m;
}
/* 頁數：永遠**多留一個空欄**可存，所以以 maxUsed+1 算頁。 */
function pageCount(db){ return Math.max(1, Math.ceil((maxUsed(db)+1)/ROWS_PER_PAGE)); }

function fmtTime(ts){
  const d=new Date(ts), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function render(){
  const db=load();
  const pc=pageCount(db);
  if(page>=pc) page=pc-1;
  if(page<0) page=0;

  const title=$('saveTitle'), list=$('saveList'), pg=$('savePage');
  if(title) title.textContent = (mode==='save' ? '存檔' : '讀檔');
  if(pg)    pg.textContent = `${page+1} / ${pc}`;
  if(!list) return;

  list.innerHTML='';
  for(let i=0;i<ROWS_PER_PAGE;i++){
    const n = page*ROWS_PER_PAGE + i + 1;         // 1-based 欄位序號
    const rec = db.slots[String(n)] || null;
    const row = document.createElement('button');
    row.className = 'save-row' + (rec ? '' : ' empty');
    /* 讀檔模式：空欄不可選。存檔模式：都可選（佔用的要確認覆蓋）。 */
    if(mode==='load' && !rec) row.disabled = true;

    const no = document.createElement('span'); no.className='sv-no';
    no.textContent = String(n).padStart(2,'0');
    const body = document.createElement('span'); body.className='sv-body';
    if(rec){
      const a=document.createElement('span'); a.className='sv-label';
      a.textContent = rec.label || '—';
      const b=document.createElement('span'); b.className='sv-meta';
      const st=rec.progress ? rec.progress.stage : '?';
      b.textContent = `第 ${st} 章 · ${fmtTime(rec.ts)}`;
      body.appendChild(a); body.appendChild(b);
    }else{
      const a=document.createElement('span'); a.className='sv-label';
      a.textContent='— 空欄 —';
      body.appendChild(a);
    }
    row.appendChild(no); row.appendChild(body);
    row.addEventListener('click', ()=>pick(n, rec));
    list.appendChild(row);
  }
}

function pick(n, rec){
  SFX.menuClick && SFX.menuClick();
  const db=load();
  if(mode==='save'){
    /* ⚠ 覆蓋是不可逆的，一定要先問。 */
    if(rec && !confirm(`第 ${n} 欄已有存檔：\n${rec.label}\n${fmtTime(rec.ts)}\n\n覆蓋它嗎？`)) return;
    db.slots[String(n)] = capture();
    store(db);
    toast(`已存入第 ${n} 欄`);
    close();
  }else{
    if(!rec) return;
    apply(rec);
    toast(`已讀取第 ${n} 欄`);
    close();
  }
}

export function open(m){
  mode = m; page = 0;
  const sh=$('saveSheet'); if(!sh) return;
  render();
  sh.classList.add('on');
}
export function close(){
  mode=null;
  const sh=$('saveSheet'); if(sh) sh.classList.remove('on');
}
export function isOpen(){ return !!mode; }

/* ══ 提示條 ══ */
let toastTimer=null;
function toast(msg){
  const el=$('saveToast'); if(!el) return;
  el.textContent=msg; el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('on'), 1800);
}

/* ══ 綁定 ══ */
export function init(){
  const prev=$('savePrev'), next=$('saveNext'), x=$('saveClose');
  if(prev) prev.addEventListener('click', ()=>{ page--; render(); });
  if(next) next.addEventListener('click', ()=>{ page++; render(); });
  if(x)    x.addEventListener('click', close);
  const sh=$('saveSheet');
  if(sh) sh.addEventListener('click', e=>{ if(e.target===sh) close(); });

  /* F 鍵。⚠ 只在**管理人模式**下受理，一般玩家按 F5 仍是正常的重新整理。 */
  window.addEventListener('keydown', e=>{
    if(!document.body.classList.contains('testmode')) return;
    if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    const a=document.activeElement;
    if(a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;

    switch(e.key){
      case 'F4': e.preventDefault(); quickSave(); break;
      case 'F7': e.preventDefault(); quickLoad(); break;
      case 'F5': e.preventDefault(); open('save'); break;   // ⚠ 不擋就整頁重載
      case 'F8': e.preventDefault(); open('load'); break;
      case 'Escape': if(isOpen()){ e.preventDefault(); close(); } break;
    }
  });
}

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
/* v3：多存「人在哪座城的哪一格」（ver -430）—— 旅店睡覺存的檔要讀得回旅店，
   不然讀檔只把旗標與時鐘放回去，畫面還停在原地（首頁的「繼續」就沒有去處）。
   ⚠ 舊檔照吃：`apply()` 沒有 `town` 就退回原本的「只跳劇情位置」。 */
const SAVE_VERSION = 3;

let page = 0;
let mode = null;               // 'save' | 'load' | null（面板關閉）

/* ══ 啟動層注入（ver -430）══════════════════════════════════════════════
   存檔要知道「人在哪座城」、讀檔要能把那座城開回來 —— 那兩件事住在 `modules/town.js`
   與 `main.js`，而 save 是劇情層的工具，不該反過來 import 它們（依賴方向）。
     townPos()            現在人在城裡的哪一格（不在城裡回 null）
     placeName(pos)       那一格的顯示名（存檔欄位上印給玩家看）
     openTown(town,node)  把那座城開在那一格（首頁「繼續」與讀檔共用，鐵律 8）
     onChange()           存檔庫寫過了 —— 首頁的「繼續」鈕要跟著亮起來
   ⚠ 沒注入時整支照舊只管劇情位置（開發時單獨測 save 面板不會炸）。 */
let host = {};
export function setHost(h){ host = { ...host, ...(h||{}) }; }

/* ══ 存檔庫讀寫 ══
   結構：{ main: 玩家的那一份|null, quick: 即時存檔|null, slots: { "1": …, … } }
   ⚠ 欄位鍵是**字串化的 1-based 序號**，不是陣列 —— 中間可以有空欄。
   ⚠⚠ `main` 是**玩家唯一的存檔**（ver -430，Ray：「只有單檔，睡覺就是建立唯一存檔」）。
     `quick`（F4）與 `slots`（F5/F8）都是 `body.testmode` 限定的開發梯子 ——
     所以 `main` 要**另開一格**，不能借用 `quick`：借過來的話管理人隨手按一下 F4
     就把玩家的進度蓋掉了。 */
function load(){
  try{
    const j=JSON.parse(localStorage.getItem(KEY)||'null');
    if(j && typeof j==='object') return { main:j.main||null, quick:j.quick||null, slots:j.slots||{} };
  }catch(e){}
  return { main:null, quick:null, slots:{} };
}
function store(db){
  try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){}
  /* 存檔庫變了 → 通知啟動層（首頁的「繼續」鈕）。⚠ 寫入點只有這一支，
     所以通知也只掛這一處（鐵律 8）——`quickSave` 與欄位存檔都經過它。 */
  if(host.onChange) try{ host.onChange(); }catch(e){}
}

/* ══ 目前狀態 → 一筆存檔 ══ */
function capture(){
  const pos = story.getPosition();
  /* 人在城裡的哪一格（ver -430）。⚠ 與 `pos` 是**同一件事的兩面**：城鎮探索時
     劇情播放器根本沒在跑（`getPosition()` 回 null），沒有這一欄的話旅店睡覺存的檔
     讀回來就沒有去處。讀檔時 `town` 優先（見 `apply`）。 */
  const twn = host.townPos ? host.townPos() : null;
  return {
    v: SAVE_VERSION,
    ts: Date.now(),
    town: twn,
    /* ⚠ v2 起存的是**一輪遊戲**整包（進度＋時鐘＋道具金錢）——
       「劇情只跑一次」是指一輪內只跑一次，所以讀檔要把那一輪的狀態整組帶回去。
       v1 的舊存檔只有 `progress`，`apply()` 照樣吃得下（見那裡）。 */
    run: prog.runSnapshot(),
    pos: pos,                       // null＝不在劇情中（只存了進度）
    label: labelOf(pos, twn),
  };
}
function labelOf(pos, twn){
  /* 在城裡就印地名（玩家看得懂的），在劇情裡才印 scene／行號（那是開發用的座標）。 */
  if(twn) return (host.placeName ? host.placeName(twn) : '') || twn.node || '城鎮';
  if(!pos) return '（劇情外）';
  const sc = MAIN_SCRIPT[pos.scene];
  const total = sc ? sc.lines.length : '?';
  return `${pos.scene}  ${pos.line+1}/${total}`;
}

/* ══ 套用一筆存檔 ══
   ⚠⚠ **讀檔與首頁「繼續」走同一支**（ver -430，鐵律 8）：兩者要做的事完全一樣
     ——把那一輪放回去、再把玩家擺回存檔當時的位置。分兩份寫必然走鐘。 */
function apply(rec){
  if(!rec) return false;
  /* v2＝整輪；v1 的舊存檔只有 progress 這一層，照舊吃下去（不要讓舊存檔讀不開）。 */
  if(rec.run) prog.runRestore(rec.run);
  else        prog.restore(rec.progress);
  /* 位置：城鎮優先（v3 起才有）。⚠ 城鎮不是劇情的一個位置，`story.jumpTo` 帶不回去。 */
  if(rec.town && host.openTown){ host.openTown(rec.town.town, rec.town.node); return true; }
  if(rec.pos) story.jumpTo(rec.pos);
  return true;
}

/* ══ 最新的一筆（首頁的「繼續」用，ver -430）══════════════════════════════
   即時存檔欄與一般欄位一起比，**看時間戳**取最新的那一筆 —— 玩家心裡的「上次玩到哪」
   就是最後一次存的那一個，不分是哪一種欄位。 */
export function latest(){
  const db=load();
  let best=null;
  for(const rec of [db.main, db.quick, ...Object.keys(db.slots).map(k=>db.slots[k])]){
    if(!rec) continue;
    if(!best || (rec.ts||0) > (best.ts||0)) best=rec;
  }
  return best;
}
/* ══ 玩家的那一份（ver -430，Ray：「不要給存檔欄位，只有單檔，睡覺就是建立唯一存檔」）══
   旅店「回房睡覺」呼叫它 —— **不開面板、不問要存哪一格**：這個遊戲對玩家而言
   只有一份存檔，那一份就是「上次睡覺的地方」。
   ⚠ 覆蓋不必確認：那正是「睡一覺＝存檔」的語意，問一次反而是在暗示有別的選擇。
   ⚠ 面板（F5/F8）照舊留著 —— 那是 `body.testmode` 限定的開發梯子，玩家看不到。 */
export function storySave(){
  const db=load();
  db.main=capture();
  store(db);
  return db.main;
}
export function hasSave(){ return !!latest(); }
/* 首頁「繼續」：讀最新的那一筆。回傳 false＝根本沒有存檔（呼叫端不必自己再查一次）。 */
export function loadLatest(){
  const rec=latest();
  if(!rec) return false;
  apply(rec);
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
      /* ⚠ 章數住在 `run.progress`（v2 起），v1 的舊檔才在 `rec.progress` ——
         兩種都問，不然新檔的章數一律印成「?」（ver -430 修）。 */
      const pg=(rec.run && rec.run.progress) || rec.progress;
      const st=pg ? pg.stage : '?';
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

/* `opts.onClose`（ver -427）：面板收掉之後要接的下一拍（旅店「回房睡覺」→ 醒來）。
   ⚠ **只呼叫一次**（呼叫前先清掉）：存檔／讀檔／叉叉／點背景四條路都走 `close()`。
   ⚠ 面板的 `mode` 開了就不會變，所以 `open('save')` 的回呼不會被讀檔那條路誤觸。 */
let closeCb = null;
export function open(m, opts){
  mode = m; page = 0;
  closeCb = (opts && opts.onClose) || null;
  const sh=$('saveSheet'); if(!sh) return;
  render();
  sh.classList.add('on');
}
export function close(){
  mode=null;
  const sh=$('saveSheet'); if(sh) sh.classList.remove('on');
  const cb=closeCb; closeCb=null;
  if(cb) try{ cb(); }catch(e){ console.warn('[save] onClose', e); }
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

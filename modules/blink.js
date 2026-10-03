/* ══ 立繪眨眼（眨眼 step ④／⑤）—— 唯一的實作（鐵律 8）══════════════════════
   劇情頁（story.js 的 #storyCastL/R）與戰鬥對白（tutorial.js 的 #tutCastL/R）都叫這一支。

   · 補丁＝半閉／全閉兩格小圖，疊在**立繪外框**裡（外框管位置／滑入／翻轉／壓暗／淡入淡出，
     所以補丁全部跟著動）。位置是原圖像素換算成外框的百分比。
   · **唯一的資料是 `script/blink.js` 的 BLINK**（機器產生，tools/blink_build.py）：
     鑰匙＝立繪檔名，表上有就眨，沒有就不動 —— speakers.js／config 不必逐條加欄位。
   · 綁定時機由呼叫端決定：**新的立繪像素真的畫上去那一刻**（onload／complete）。
     解除：開始換圖／下台／清場 —— 舊圖的補丁疊在新圖上就是「別人的眼睛」。
   · 補丁晚到不等：載到之前不眨（失敗模式是「晚一拍才開始眨」，鐵律 13 的安全側）。
   · 沒有 rAF：每 2.6~6 秒一個 setTimeout、切兩次 visibility；`live()` 回 false（舞台不在、
     分頁在背景、人沒站在台上）就跳過這一次。 */
import { BLINK } from '../script/blink.js';
import { assetVer } from '../config.js';

const DIR = 'resources/si/blink/';
const SEQ = [['h',45],['c',85],['h',45]];   // 半閉 → 全閉 → 半閉（毫秒），之後回到睜眼
const T = new WeakMap();                      // 外框 → { t:計時器, live:fn }

export function keyOf(src){
  return String(src||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').toLowerCase();
}
export function has(src){ return !!BLINK[keyOf(src)]; }

function els(box){
  let h=box.querySelector(':scope > .sp-blink-h'), c=box.querySelector(':scope > .sp-blink-c');
  if(!h){
    h=document.createElement('img'); h.className='sp-blink sp-blink-h'; h.alt=''; box.appendChild(h);
    c=document.createElement('img'); c.className='sp-blink sp-blink-c'; c.alt=''; box.appendChild(c);
  }
  return { h, c };
}

export function unbind(box){
  if(!box) return;
  const r=T.get(box); if(r){ clearTimeout(r.t); T.delete(box); }
  const e=els(box);
  for(const im of [e.h, e.c]){ im.classList.remove('on'); im.onload=null; delete im.dataset.ok; delete im.dataset.key; }
}

/* ══ 眨眼節奏（ver -1938，Ray：「立繪模式裡加入眨眼選項」）══
   寫在 speakers.js 那一張立繪上的 `blink` 欄位（首頁「立繪」工作室存檔），沒寫＝one：
     one     一般眨眼：平均間隔、每次單眨
     oneTwo  一二拍：第一次眨一下、第二次連眨兩下，loop
     twoOne  二一拍：第一次連眨兩下、第二次眨一下，loop
     off     不眨 */
export const MODES = ['one', 'oneTwo', 'twoOne', 'off'];
const COUNTS = { one:[1], oneTwo:[1,2], twoOne:[2,1] };

/* box＝立繪外框、img＝外框裡的圖本體、live()＝這一刻可以眨嗎（舞台在、人在台上、不在換圖中）、mode＝眨眼節奏。 */
export function bind(box, img, live, mode){
  if(!box || !img) return;
  mode = COUNTS[mode] || mode==='off' ? mode : 'one';
  const key=keyOf(img.getAttribute('src')), d=BLINK[key];
  const e=els(box);
  if(e.h.dataset.key===key && T.has(box) && T.get(box).mode===mode){ T.get(box).live=live; return; }   // 同一張圖、同一個節奏重綁＝不動
  unbind(box);
  if(!d || !img.naturalWidth || mode==='off') return;
  const NW=img.naturalWidth, NH=img.naturalHeight;
  const put=(el, r, suf)=>{
    el.dataset.key=key;
    el.style.left=(r[0]/NW*100)+'%'; el.style.top=(r[1]/NH*100)+'%';
    el.style.width=(r[2]/NW*100)+'%'; el.style.height=(r[3]/NH*100)+'%';
    el.onload=()=>{ el.onload=null; el.dataset.ok='1'; };
    const p=DIR+key+'_'+suf+'.webp';
    el.setAttribute('src', p+assetVer(p));
    if(el.complete && el.naturalWidth){ el.onload=null; el.dataset.ok='1'; }
  };
  put(e.h, d.half, 'half'); put(e.c, d.closed, 'closed');
  const rec={ t:0, live, mode, n:0 };   // n＝第幾次（一二拍／二一拍輪流用）
  T.set(box, rec);
  rec.t=setTimeout(()=>once(box), 500+Math.random()*1500);   // 上台後第一次眨：0.5~2 秒隨機（Ray，-1940）
}

/* 管理人工具（首頁「立繪」→ 調整工作室）用的兩個入口：
   now(box)   ＝這一刻就眨一次（不等排程）
   setFast(on)＝頻繁眨眼（約 1 秒一次）—— 驗補丁用，下一次排程起生效 */
let fast=false;
export function setFast(on){ fast=!!on; }
/* 慢放（ver -1941，Ray：「立繪調整加入面部特寫跟慢放」）：spd＝速度倍率（1＝正常、0.25＝四倍慢）。
   眨眼每一格的毫秒與間隔都除以它；CSS 動畫那一半由呼叫端調 playbackRate。 */
let spd=1;
export function setSpeed(k){ spd=Math.max(0.02, +k||1); }
export function speed(){ return spd; }
export function isFast(){ return fast; }
export function now(box){
  const rec=box && T.get(box); if(!rec) return false;
  clearTimeout(rec.t); once(box); return true;
}

function once(box){
  const rec=T.get(box); if(!rec) return;
  const e=els(box);
  // 間隔：「平均時間」＝約 4 秒、只抖 ±0.6 秒（舊版 2.6~6 秒亂數加 15% 隨機連眨，已由節奏取代）
  const next=()=>{ if(T.get(box)===rec) rec.t=setTimeout(()=>once(box), (fast ? 700+Math.random()*500 : 3400+Math.random()*1200)/spd); };
  const go = e.h.dataset.ok && e.c.dataset.ok && !document.hidden && (!rec.live || rec.live());
  if(!go){ next(); return; }
  const cs = COUNTS[rec.mode] || COUNTS.one;
  const times = cs[rec.n++ % cs.length];
  let seq = SEQ;
  for(let k=1;k<times;k++) seq = seq.concat([[null,110]], SEQ);   // 連眨：中間睜開 110ms
  let i=0;
  const step=()=>{
    if(T.get(box)!==rec) return;
    if(i>=seq.length){ e.h.classList.remove('on'); e.c.classList.remove('on'); next(); return; }
    const [f, ms]=seq[i++];
    e.h.classList.toggle('on', f==='h'); e.c.classList.toggle('on', f==='c');
    rec.t=setTimeout(step, ms/spd);
  };
  step();
}

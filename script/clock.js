/* ══════════════════════════════════════════════════════════════════════
   clock.js — 遊戲內時間（ver -369）
   ──────────────────────────────────────────────────────────────────────
   起點 **1908年6月13日 11:00**（Ray 指定：踏進城鎮探索的那一刻，ver -384 由 14:00 改）。
   時間是**資源**（docs/TIVOT_AFFECTION_RULES.md：時間即總資源），所以它只會往前走，
   而且每一個「移動／行動」都要花掉一點。

   ⚠ 存檔鑰匙獨立（`tivot_clock_v1`），存的是**分鐘數**（從起點算起的偏移量）——
     存絕對日期會讓「改起點」變成要改存檔。
   ⚠ 時段（黎明/白天/黃昏/夜/深夜）決定背景要用哪一張差分，命名規約**全城鎮通用**：
       `<地點>_Dawn / _Day / _Dusk / _night / _midnight`
     ⚠ 大小寫照 Ray 給的原樣（Dawn/Day/Dusk 大寫，night/midnight 小寫）——
       檔名是他出的，程式不要自作主張改。
   ══════════════════════════════════════════════════════════════════════ */

const KEY = 'tivot_clock_v1';

/* 起點：1908-06-13 11:00。⚠ 只有這裡是計算點（鐵律 7）—— 別處要日期一律問這支。 */
/* ⚠ **11:00**（ver -384，Ray：「預設進入城鎮探索的時間是 11:00」）。
   由 14:00 改過來 —— 在此之前的劇情（地宮→會客廳→帝都廣場）**不推進時鐘**，
   所以「開局時刻」＝「踏進城鎮那一刻的時刻」，改這一個數字就是改那件事。
   ⚠ 要讓劇情段落也有自己的時刻，那是另一件事（要在 scene 上加 `time:`），
     不要拿這個常數去湊。 */
export const EPOCH = { y:1908, mo:6, d:13, h:11, mi:0 };

const rd = () => { try{ const n=parseInt(localStorage.getItem(KEY),10); return isFinite(n)&&n>0?n:0; }catch(e){ return 0; } };
const wr = n => { try{ localStorage.setItem(KEY, String(Math.max(0, n|0))); }catch(e){} };

/* 從起點算起經過幾分鐘。 */
export function elapsed(){ return rd(); }
export function advance(min){ const v=Math.max(0, rd()+(min|0)); wr(v); return v; }
export function reset(){ wr(0); }
/* 讀檔用：直接把「開局以來的分鐘數」設回去。⚠ 只有讀檔會用 —— 遊戲中一律走 `advance`。 */
export function setElapsed(min){ wr(Math.max(0, min|0)); }

/* 目前的日期時間（物件）。用真的 Date 算跨日/跨月，不要自己數。 */
export function now(){
  const d=new Date(Date.UTC(EPOCH.y, EPOCH.mo-1, EPOCH.d, EPOCH.h, EPOCH.mi));
  d.setUTCMinutes(d.getUTCMinutes()+elapsed());
  return { y:d.getUTCFullYear(), mo:d.getUTCMonth()+1, d:d.getUTCDate(),
           h:d.getUTCHours(), mi:d.getUTCMinutes() };
}
const p2 = n => (n<10?'0':'')+n;
export function dateText(){ const t=now(); return t.y+'年'+t.mo+'月'+t.d+'日'; }
export function timeText(){ const t=now(); return p2(t.h)+':'+p2(t.mi); }
export function fullText(){ return dateText()+'　'+timeText(); }
/* 現在的「小時」含分鐘的小數（8:30 → 8.5）。⚠ 營業時間之類的比較**一律問這支**
   （鐵律 7：一個量一個計算點）—— 不要在別處自己 `now().h + now().mi/60`。 */
export function hourF(){ const t=now(); return t.h + t.mi/60; }

/* ── 時段 ──
   ⚠ 界線是**內容設定**，但這裡只有一組（全城鎮通用），所以放這支就好；
     哪天要「北境的夏天天亮得早」再搬進 config。 */
export function band(){
  const h=now().h;
  if(h>=5  && h<8 ) return 'Dawn';       // 黎明
  if(h>=8  && h<17) return 'Day';        // 上午/下午
  if(h>=17 && h<20) return 'Dusk';       // 黃昏
  if(h>=20 && h<24) return 'night';      // 夜
  return 'midnight';                     // 深夜（0~5）
}
/* 地點的背景檔名（含時段）。`<base>_<band>`。 */
export function bgName(base){ return base+'_'+band(); }

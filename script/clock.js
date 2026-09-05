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
/* 現在的「小時」含分鐘的小數（8:30 → 8.5）。⚠ 營業時間之類的比較**一律問這支**
   （鐵律 7：一個量一個計算點）—— 不要在別處自己 `now().h + now().mi/60`。 */
export function hourF(){ const t=now(); return t.h + t.mi/60; }

/* ══ 給「到達／經過某個時刻」的閘門用（ver -427）══════════════════════════
   ⚠⚠ 「隔天早上七點」是**時間軸上的一個點**，不是「現在幾點」——
     用時刻去比的話，第三天早上會再成立一次。所以換成**開局起算的分鐘數**再比，
     判定就變成 `clock.elapsed() >= firstHourAt(7)`：**到達或經過**都算，
     而睡覺是一口氣跳十個小時，「剛好等於」的機率是零。 */
export function firstHourAt(h){
  const from = EPOCH.h*60 + EPOCH.mi, to = (h|0)*60;
  return ((to - from + 1440) % 1440) || 1440;   // 開局那一刻就是 h 點 → 算隔天
}
/* 把時鐘推到**今天**的 h:00；已經過了就不動（時間只會往前，它是資源）。
   ⚠ 給「強制轉場，那一段路不算時間」用（傍晚被抓回旅店）。回傳實際推了幾分鐘。
   ⚠ **不會倒轉**：Ray 的稿寫「時間改為當天 18:00」，但觸發時可能已經是 18:05
     （走一步 10 分鐘）—— 倒轉會讓「時間是資源」這件事出現漏洞。 */
/* 遊戲內第幾天（開局那天＝第 1 天）。
   ⚠⚠ 算的是**日曆日**，不是「開局起算的 24 小時塊」（ver -427 修）：開局是 11:00，
     用 24 小時塊算的話「第 2 天」要到隔天 **11:00** 才成立 —— 而劇本說的第二天是
     **隔天早上**。實測 6/14 07:05 被算成第 1 天，第二日的戲整段不出來。 */
export function dayNo(){
  const t=now();
  return Math.round((Date.UTC(t.y, t.mo-1, t.d)
                   - Date.UTC(EPOCH.y, EPOCH.mo-1, EPOCH.d)) / 86400000) + 1;
}
export function advanceToHour(h){
  const mins = Math.round((h - hourF())*60);
  if(mins <= 0) return 0;
  advance(mins);
  return mins;
}
/* 推到**下一個** h:00 —— 已經過了就推到**隔天**的 h:00（ver -656，Ray：「時間強制
   進到下午2點，如果當前時間已過2點就往後推一天的兩點」）。
   ⚠ 與 `advanceToHour` 是兩件事，不要合併：那一支是「推到今天的 h 點，過了就不動」
     （傍晚被抓回旅店用的），這一支是「一定要到 h 點」。兩者都不倒轉。
   ⚠ 剛好等於 h:00 時**不動**（已經在那一刻了，不必再等一天）。 */
export function advanceToNextHour(h){
  let mins = Math.round((h - hourF())*60);
  if(mins < 0) mins += 1440;
  if(mins <= 0) return 0;
  advance(mins);
  return mins;
}

/* ── 時段 ──
   ⚠ 界線是**內容設定**，但這裡只有一組（全城鎮通用），所以放這支就好；
     哪天要「北境的夏天天亮得早」再搬進 config。 */
export function band(){
  const h=now().h;
  if(h>=5  && h<8 ) return 'Dawn';       // 黎明
  if(h>=8  && h<17) return 'Day';        // 上午/下午
  if(h>=17 && h<19) return 'Dusk';       // 黃昏
  if(h>=19 && h<24) return 'night';      // 夜（ver -816，Ray：夜景改 19:00 開始）
  return 'midnight';                     // 深夜（0~5）
}
/* 地點的背景檔名（含時段）。`<base>_<band>`。 */
export function bgName(base){ return base+'_'+band(); }

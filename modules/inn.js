/* ══════════════════════════════════════════════════════════════════════
   inn.js — 旅店大廳（ver -392，Ray 交稿）
   ──────────────────────────────────────────────────────────────────────
   旅店節點（`script/town.js` 的 `inn:true`）在進場對白演完之後多一層互動：

     伙伴門 ×4   亮起＝房裡有人、燈亮＝醒著、燈熄＝睡了。**敲門**有回應（單句）。
     獨自坐坐    畫面暗去再亮起，時間過兩小時 → 蕾娜回來那一幕
     回房睡覺    存檔

   ⚠ **內容全部在資料上**（`innBranch` / `innKnock` / `innRenna`），這裡只負責演（鐵律 1）。
   ⚠ 不 import `town.js`（會循環）：要用到城鎮那邊的東西一律走 `setup()` 注入。
   ⚠ 進度只有三段，由旗標推出來（`stage()`）——**不要另存一個狀態變數**：
     那個變數存檔存不到，讀檔回來就對不上（§6.9 那張清單）。
   ⚠ 頭像**不用新素材**：拿角色自己的立繪，用 `speakers.js` 量好的 `fx`
     把臉挪到框中央（鐵律 7：取景值只有那一份）。
   ══════════════════════════════════════════════════════════════════════ */

import { SPEAKERS, ART } from '../script/speakers.js';
import * as prog from '../script/progress.js';
import * as clock from '../script/clock.js';
import * as story from './story.js';
import * as save from './save.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);

/* 旗標。⚠ 名字要與 `progress.newRun()` 清掉的那一組同源（flags 整組清，所以不必列名）。 */
const F_WAIT  = 'inn_wait';    // 分支二演完＝諾薇兒去休息了，玩家在等蕾娜
const F_RENNA = 'inn_renna';   // 蕾娜回來、道過晚安了

const SIT_HOURS = 2;           // 「獨自坐坐」過掉的時間（Ray：「時間經過兩小時」）
const FADE_MS   = 520;         // 暗去／亮起各一段

/* 四個門位。⚠ **格數固定四格**（Ray：「共有四人，留出適當空間。目前只有一人」）——
   人還沒到齊，但位子要先看得出來，玩家才知道這裡以後會有誰。
   ⚠ 蕾娜那一格要等她回來才亮：她在外面辦事，門後面沒有人。 */
const DOORS = ['NOUVELLE', 'RENNA', null, null];

let host = null;               // 注入進來的城鎮回呼（見 setup）
let layer = null;
let node = null;

export function setup(api){ host = api || null; }

/* ══ 進度 ══ 由旗標推出來，不另存狀態（讀檔回來才對得上）。 */
function stage(){
  if(prog.hasFlag(F_RENNA)) return 'slept';
  if(prog.hasFlag(F_WAIT))  return 'wait';
  return 'none';
}

/* ══ 版面 ══ 掛在劇情舞台上（與 `#townNav` 同一層）。 */
function ensureLayer(){
  if(layer && layer.parentNode) return layer;
  const st = story.stageEl(); if(!st) return null;
  layer = document.createElement('div'); layer.id = 'innLobby';
  layer.innerHTML =
      '<div class="inn-doors">'
    +   DOORS.map((who,i)=>
          '<button class="inn-door" type="button" data-i="'+i+'">'
        +   '<i class="inn-lamp"></i><span class="inn-face"></span>'
        +   '<b class="inn-name"></b></button>').join('')
    + '</div>'
    /* ⚠ 兩顆鈕**各自定位在背景的家具上**（ver -394）：位置由 `relayout()` 依
       `innSpots` 換算後寫 inline，所以這裡不需要一個排版用的容器。 */
    +   '<button class="inn-btn" data-act="sit" type="button">獨自坐坐</button>'
    +   '<button class="inn-btn" data-act="sleep" type="button">回房睡覺</button>'
    + '<div class="inn-hint"></div>'
    + '<div class="inn-veil"></div>';
  st.appendChild(layer);
  /* ⚠ 這一層的每一顆都要 `stopPropagation`：舞台上還有城鎮的「點一下＝路人單句／
     按住滑動＝移動」，不擋的話按門會順便觸發那些。 */
  layer.addEventListener('pointerdown', e=>e.stopPropagation());
  layer.querySelectorAll('.inn-door').forEach(b=>
    b.addEventListener('pointerup', e=>{ e.stopPropagation(); knock(+b.dataset.i); }));
  layer.querySelectorAll('.inn-btn').forEach(b=>
    b.addEventListener('pointerup', e=>{ e.stopPropagation();
      if(b.dataset.act==='sit') sitAlone(); else sleepHere(); }));
  return layer;
}

/* 頭像：拿角色的立繪，用量好的 `fx` 把臉挪到框中央。
   ⚠ `background-size` 給 260%：框是一個小方塊，整張全身圖塞進去只會看到一個人形色塊；
     放大到只框住頭與肩才讀得出是誰。⚠ 縱向固定貼齊上緣（`top:0`）—— 這幾張立繪的
     頭頂本來就在圖的最上緣（`ART[].top` 都是個位數）。 */
function faceStyle(who){
  const a = ART[(SPEAKERS[who]||{}).art] || null;
  if(!a || !a.base) return '';
  return 'background-image:url("'+a.base+'");background-size:260% auto;'
       + 'background-position:'+(a.fx*100).toFixed(1)+'% 0%;';
}

/* 這一格現在是什麼狀態：`empty`（還沒有這個人）／`awake`／`asleep`。 */
function doorState(who){
  const st = stage();
  if(who==='NOUVELLE') return st==='slept' ? 'asleep' : 'awake';
  if(who==='RENNA')    return st==='slept' ? 'asleep' : 'empty';
  return 'empty';
}

function refresh(){
  if(!layer) return;
  const st = stage();
  layer.querySelectorAll('.inn-door').forEach(b=>{
    const who = DOORS[+b.dataset.i];
    const s = who ? doorState(who) : 'empty';
    b.className = 'inn-door ' + s;
    const face = b.querySelector('.inn-face'), nm = b.querySelector('.inn-name');
    if(s==='empty'){ face.style.cssText=''; nm.textContent=''; }
    else{ face.style.cssText = faceStyle(who);
          nm.textContent = (SPEAKERS[who]||{}).name || ''; }
  });
  /* 兩顆鈕各自的出場時機：等蕾娜的那一段才有「獨自坐坐」，她回來之後才有「回房睡覺」。 */
  wantSit   = (st==='wait');
  wantSleep = (st==='slept');
  relayout();
  /* 教學提示（Ray 稿上的兩句舞台指示）。⚠ 只在該做那件事的時候出現，不常駐。 */
  const hint = layer.querySelector('.inn-hint');
  if(hint) hint.textContent =
      st==='wait'  ? '敲敲伙伴的門，或坐下來消磨時間。'
    : st==='slept' ? '大家都睡了。回房休息吧。'
    : '';
  layer.classList.toggle('on', st!=='none');
}

/* ══ 敲門 ══ 單句、沒有立繪（Ray：「未開門無立繪」），可以一直敲。 */
function knock(i){
  const who = DOORS[i];
  if(!who || doorState(who)==='empty') return;
  const tbl = (node && node.innKnock) || {};
  const set = tbl[stage()==='slept' ? 'slept' : 'wait'] || {};
  const line = set[who];
  if(!line) return;
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  if(host && host.say) host.say(line, (SPEAKERS[who]||{}).name || '');
}

/* ══ 獨自坐坐 ══ 暗去 → 過兩小時 → 亮起 → 蕾娜回來那一幕。 */
let busy = false;
function sitAlone(){
  if(busy || stage()!=='wait') return;
  busy = true;
  if(host && host.lock) host.lock(true);
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  story.hideBubble();
  const veil = layer.querySelector('.inn-veil');
  veil.classList.add('on');
  setTimeout(()=>{
    clock.advance(SIT_HOURS*60);          // 時間是資源：坐著也要花掉
    refresh();
    veil.classList.remove('on');
    setTimeout(()=>{
      const lines = (node && node.innRenna) || [];
      if(!lines.length){ finishRenna(); return; }
      /* ⚠ 蕾娜站**右**：這一段她與玩家對話，台上只有她一個人，但沿用城鎮那一幕的
         整幕覆寫比較不會與日後多人同台打架（§6.5 的固定站位）。 */
      if(host && host.play) host.play(lines, finishRenna, { sides:{ RENNA:'R' } });
      else finishRenna();
    }, FADE_MS);
  }, FADE_MS);
}
function finishRenna(){
  story.clearCast();
  prog.addFlags([F_RENNA]);
  busy = false;
  if(host && host.lock) host.lock(false);
  refresh();
}

/* ══ 回房睡覺 ══ 存檔（Ray：「回房睡覺鈕。存檔」）。
   ⚠ 走既有的存檔欄位面板（F5 那一套），不另做一個 —— 存檔的規矩只有一份。 */
function sleepHere(){
  if(busy || stage()!=='slept') return;
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  story.hideBubble();
  save.open('save');
}

/* ══ 進旅店 ══ 由 `modules/town.js` 的 `afterArrive` 呼叫（進場對白演完之後）。 */
export function arrive(n, ctx){
  node = n;
  ensureLayer();
  /* 分支：**每次進來都判一次**（Ray 的稿子就是這樣寫的）——
     走完城裡所有地點了沒，決定她說哪一句。已經住下了（`wait`／`slept`）就不再演。 */
  const b = (n.innBranch) || {};
  const lines = (ctx && ctx.allSeen) ? b.settled : b.exploring;
  if(stage()==='none' && lines && lines.length){
    if(host && host.lock) host.lock(true);
    const settled = !!(ctx && ctx.allSeen);
    if(host && host.play) host.play(lines, ()=>{
      story.clearCast();
      if(settled) prog.addFlags([F_WAIT]);   // 住下了 → 大廳開張
      if(host && host.lock) host.lock(false);
      refresh();
    });
    return;
  }
  refresh();
}

/* ══ 把兩顆鈕擺到背景的家具上（ver -394）══
   ⚠ 座標是**背景圖上的比例**（`innSpots`），換算走城鎮注入的 `bgPoint` ——
     那是全專案唯一一支「圖上的一點 → 螢幕座標」（鐵律 7）。
   ⚠ **擺好了才亮**：背景還沒載完時 `bgPoint` 回 null，這時先不要顯示 ——
     一顆定位錯的鈕比晚一拍出現糟得多（同櫃台鈕的作法）。
   ⚠ 背景載完（`bgFor` 的 onload）會再呼叫一次，所以晚到的圖也擺得到。 */
let wantSit=false, wantSleep=false;
export function relayout(){
  if(!layer) return;
  const spots = (node && node.innSpots) || {};
  const put=(sel, want, sp)=>{
    const b=layer.querySelector(sel); if(!b) return;
    const p = (want && sp && host && host.bgPoint) ? host.bgPoint(sp.x, sp.y) : null;
    if(!p){ b.classList.remove('on'); return; }
    b.style.left=p.x+'px'; b.style.top=p.y+'px';
    b.classList.add('on');
  };
  put('[data-act="sit"]',   wantSit,   spots.sit);
  put('[data-act="sleep"]', wantSleep, spots.sleep);
}

export function close(){
  if(layer) layer.classList.remove('on');
  node = null;
}

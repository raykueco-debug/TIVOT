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

import { asset, sfxGain } from '../config.js';   // 睡覺音（ver -430）：路徑與增益都只有 config 一份
import { SPEAKERS, ART } from '../script/speakers.js';
import * as prog from '../script/progress.js';
import * as clock from '../script/clock.js';
import * as story from './story.js';
import * as save from './save.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);

/* 旗標。⚠ 名字要與 `progress.newRun()` 清掉的那一組同源（flags 整組清，所以不必列名）。 */
const F_WAIT  = 'inn_wait';    // 分支二演完＝諾薇兒去休息了，玩家在等蕾娜
const F_RENNA = 'inn_renna';   // 蕾娜回來、碰到了、道過晚安
const F_MISS  = 'inn_missed';  // 過了時間才回來 → 她已經在房裡，碰不到

/* ══ 蕾娜的回店時刻（ver -395，Ray 交稿）══════════════════════════════
   「獨自坐坐會自動將時間推至 8 點；如果玩家選擇走出旅店，在 8~9 點時進去仍碰得到蕾娜，
     有碰到的話好感 +1，沒碰到的話蕾娜就已經在房內了。」
   ⚠ 8 點＝**晚上八點**（20:00）：城裡的店也是這個時間打烊，她辦完事回來剛好。
   ⚠ 所以「獨自坐坐」不是加固定時數，是**把時鐘推到 20:00**（已經過了就不動）。
   ⚠ 錯過（≥21:00 才進來）是**記旗標**的，不是每次看時鐘算 —— 隔天早上時鐘又會小於 21，
     不記的話她會「重新出現在大廳等你」。 */
const SIT_MIN    = 120;        // 「獨自坐坐」一次消磨多久（Ray：「消磨時間：2小時」）
const RENNA_BACK = 20;         // 她回到旅店的時刻
const RENNA_GONE = 21;         // 過了就回房了（碰不到）
const WAKE_HOUR  = 7;          // 「回房睡覺」推進到隔日的這個時刻（Ray 指定）
const AFF_MEET   = 1;          // 碰到她：好感 +1（Ray 指定）
/* ══ 兩段轉場的時間（ver -430，Ray 指定）══════════════════════════════════
   ⚠⚠ 黑幕本身走 `story.veil()`（唯一那一片，鐵律 8）—— 舊版那一片
     （`#innLobby .inn-veil`）住在會被 `lock(true)` 藏起來的那一層裡，
     **從來沒有真的亮過**，所以「獨自坐坐暗去再亮起」一直只是乾等 1 秒。
   · 獨自坐坐：暗 → 停 → 亮，**合計約 3 秒**（Ray：「淡出至黑再回到原畫面，約3秒」）。
   · 回房睡覺：暗下去的長度＝**睡覺音檔的長度**（見 sleepHere），所以這裡只有
     「醒來亮回去」那一段的時間，以及音效還沒解碼完時的退路。 */
const SIT_FADE_MS = 700;       // 獨自坐坐：暗去／亮起各一段
const SIT_HOLD_MS = 1600;      // 全黑停留 → 700 + 1600 + 700 = 3.0 秒
const WAKE_FADE_MS = 450;      // 醒來：淡入回旅店（ver -433 由 900 減半）
/* 睡覺的淡出佔音檔長度的幾成（ver -433，Ray：「時間過長，減半，SE 不用改動」）。
   ⚠ 音效**照樣整支播完** —— 減的只有畫面漸暗的長度。 */
const SLEEP_FADE_RATIO = 0.5;
const SLEEP_FADE_FALLBACK = 3000;   // 拿不到音檔長度時的退路（正常不會走到，見 §6.6 預載）

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
  if(prog.hasFlag(F_RENNA) || prog.hasFlag(F_MISS)) return 'slept';
  if(prog.hasFlag(F_WAIT))  return 'wait';
  return 'none';
}
/* 旅店的初入對白演過了沒 —— 「獨自坐坐」從那一刻起就能用（ver -401，Ray 指定）。
   ⚠ 問的是**節點自己的旗標**（`kind` 版），與 `stage()` 是兩件事：
     stage 管的是「蕾娜那條線走到哪」，這裡管的是「這個大廳開張了沒」。 */
let introFlag=null;                // 旗標名由城鎮傳進來（見 town.afterArrive）
/* 「還沒六點」的那個六點（ver -405）。⚠ 與**傍晚的提醒**是同一個時刻
   （`TOWNS[].evening.hour`）—— 由城鎮傳進來，不要在這裡另寫一個 18（鐵律 7）。 */
let eveningHour = 18;
/* 傍晚那一句的旗標（ver -427）。⚠ 規則四／五：18:00 那一格若在旅店裡成立，走的是
   下面的**分支二**（諾：「今天有點累了，我先去休息囉。」）—— 那一支演完要把
   傍晚的旗標一起記掉，否則走出去再回來又會被城鎮抓一次。名字由城鎮傳進來（鐵律 7）。 */
let eveningFlag = null;
function introDone(){ return !!(introFlag && prog.hasFlag(introFlag)); }

/* ══ 一次性說明（遮罩＋箭頭）══════════════════════════════════════════
   ⚠ **一次性**（Ray 指定）：旗標記在 progress，看過就不再擋路。
   ⚠ 被說明的那顆要**抬到遮罩之上**（`.spot`），否則玩家看著一片暗、不知道在指什麼。
   ⚠ 一次只演一個：三個提示（坐、敲門、睡）會在不同時機到齊，排隊比疊在一起清楚。 */
const TIPS = {
  sit:   { flag:'inn_tip_sit',   sel:'[data-act="sit"]',   text:'坐下來消磨時間。一次過兩個小時。' },
  knock: { flag:'inn_tip_knock', sel:'.inn-door.awake, .inn-door.asleep',
           text:'敲敲伙伴的門，看看他們在做什麼。' },
  sleep: { flag:'inn_tip_sleep', sel:'[data-act="sleep"]',
           text:'推進時間至隔日早上七點，恢復體力並存檔。' },
};
let guideKey=null;
function showGuide(key){
  const t=TIPS[key]; if(!t || !layer || guideKey) return;
  if(prog.hasFlag(t.flag)) return;
  const tgt=layer.querySelector(t.sel); if(!tgt) return;
  /* ⚠ **量不到就先不要演**（ver -401 修）：被說明的那顆若還沒被 `relayout()` 擺好
     （背景還沒載完 → `bgPoint` 回 null → 鈕是隱藏的），rect 會是 0×0，
     說明文字就被算到畫面外（實測 `top:-74px`，整行看不見）。
     擺好之後 `relayout()` 會再叫一次（見那一支的收尾）。 */
  const r0=tgt.getBoundingClientRect();
  if(!r0.width || !r0.height) return;
  const g=layer.querySelector('.inn-guide'); if(!g) return;
  guideKey=key;
  /* ⚠⚠ **說明開著時，可按的東西全部留在遮罩之上**（ver -430，Ray：「教學雪鐵龍狀態下
     按鈕不作動」）。遮罩是**說明**不是**鎖** —— 它壓暗的是背景與立繪，不該把玩家
     真正要按的那幾顆一起關掉（實測：想按睡覺卻被指著坐坐的遮罩吃掉，讀起來就是壞了）。
     `.spot` 仍然只給被指的那一顆（那圈金光才是「指的是這個」的線索）。 */
  layer.classList.add('guiding');
  tgt.classList.add('spot');
  g.querySelector('.ig-text').textContent=t.text;
  /* 箭頭擺在目標的**正上方**（同雪鐵龍箭的作法）。位置問 rect，不要自己算。 */
  const st=story.stageEl(), sr=st.getBoundingClientRect(), r=tgt.getBoundingClientRect();
  const cx=r.left-sr.left+r.width/2, top=r.top-sr.top;
  const arw=g.querySelector('.ig-arrow');
  arw.style.left=cx+'px'; arw.style.top=(top-16)+'px';
  const tx=g.querySelector('.ig-text');
  tx.style.left='0px'; tx.style.right='0px'; tx.style.top=(top-74)+'px';
  g.classList.add('on');
}
/* `quiet`＝**這一下同時在做別的事**（按了某顆鈕），所以只收說明，不出音效、
   也不在這裡排下一個 —— 那個動作自己的收尾會 `refresh()`（ver -430）。
   ⚠⚠ **按下任何一顆鈕都要先叫它**：不叫的話遮罩會一直留在畫面上，其餘的鈕全被它
     吃掉，讀起來就是「按鈕不作動」（Ray 回報；實測坐坐按下去時間有走、遮罩沒收，
     之後整個大廳都按不動了）。
   ⚠ 玩家按的若不是被指的那一顆，照樣把這一則記成看過 —— 他用行動表示「知道了」，
     而說明本來就是一次性的（同 `story.openHint`「點提示本身也放行」）。 */
/* 玩家**做過**的事就不必再教（ver -430）：按下坐坐／睡覺／敲門的那一刻，把對應的
   那一則記成看過。⚠ 與 `closeGuide` 是兩件事 —— 那一支收的是「現在畫面上開著的
   那一則」，這一支記的是「他剛剛做的那一件」，兩者常常不是同一則。 */
function learnTip(key){ const t=TIPS[key]; if(t && t.flag) prog.addFlags([t.flag]); }
function closeGuide(quiet){
  if(!guideKey || !layer) return;
  const t=TIPS[guideKey];
  prog.addFlags([t.flag]);
  layer.querySelectorAll('.spot').forEach(e=>e.classList.remove('spot'));
  layer.classList.remove('guiding');
  const g=layer.querySelector('.inn-guide'); if(g) g.classList.remove('on');
  guideKey=null;
  if(quiet) return;
  try{ SFX.menuClick(); }catch(_){}
  refresh();                       // 收掉之後看看還有沒有下一個要演
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
    /* ⚠⚠ 兩顆鈕要**一眼看得出不是同一組**（ver -407，Ray：「兩顆都留，但擺開／改樣式」）：
       它們的份量差很多 —— 一個是消磨兩小時，一個是結束今天並存檔。
       作法是①各帶一行**時間成本**（時間是資源，按之前就該看得到代價）、
       ②睡覺那顆走實心的「主要動作」樣式、③位置拉到對角（見 script/town.js 的 innSpots）。
       ⚠ 成本那一行的字**寫在這裡**而不是資料上：它是那顆鈕的行為說明（`SIT_MIN` /
         `WAKE_HOUR` 就在這一支），不是內容 —— 改常數就要改字，放在一起才不會走鐘。 */
    +   '<button class="inn-btn" data-act="sit" type="button">'
    +     '<b>獨自坐坐</b><i>消磨 '+(SIT_MIN/60)+' 小時</i></button>'
    +   '<button class="inn-btn primary" data-act="sleep" type="button">'
    +     '<b>回房睡覺</b><i>到隔日 '+WAKE_HOUR+':00・存檔</i></button>'
    /* ⚠ 常駐的雪鐵龍箭與說明**都撤掉了**（ver -401 撤說明、-402 撤箭，
       Ray：「說明都是一次性的」「雪鐵龍箭也都是一次性說明」）——
       箭與文字現在都只在下面 `.inn-guide` 那個一次性遮罩裡出現一次。 */
    + '<div class="inn-hint"></div>'
    /* 一次性說明（ver -401，Ray：「用遮罩跟箭頭說明…說明都是一次性的」）。
       ⚠ 遮罩壓暗全場、被說明的那顆抬到遮罩之上（`.spot`），箭頭指著它。點一下收掉。 */
    + '<div class="inn-guide"><div class="ig-arrow"><i></i><i></i></div>'
    +   '<div class="ig-text"></div><div class="ig-go">點一下繼續</div></div>';
  /* ⚠ 這一層**沒有自己的黑幕**（ver -430 移除）：暗場走 `story.veil()`。
     舊版在這裡放過一片 `.inn-veil`，但它住在 `#innLobby` 底下，而演出一開始就
     `lock(true)` 收掉導覽 → 整層 `display:none` → **那片黑幕從來沒有亮過**。
     黑幕不能住在會被收掉的那一層裡（同鐵律 8：一個動作一支實作，而且要放對地方）。 */
  st.appendChild(layer);
  /* ⚠ 這一層的每一顆都要 `stopPropagation`：舞台上還有城鎮的「點一下＝路人單句／
     按住滑動＝移動」，不擋的話按門會順便觸發那些。 */
  layer.addEventListener('pointerdown', e=>e.stopPropagation());
  /* ⚠ 每一顆都**先收說明再做事**（ver -430）：按下去就是「知道了」，
     遮罩留著的話後面每一次點擊都會被它吃掉（見 `closeGuide` 的說明）。
     ⚠ 順手把**這一顆自己的**那一則也記成看過（`learnTip`）—— 不然剛睡完醒來，
       還會被教一次「怎麼睡覺」。 */
  layer.querySelectorAll('.inn-door').forEach(b=>
    b.addEventListener('pointerup', e=>{ e.stopPropagation();
      learnTip('knock'); closeGuide(true); knock(+b.dataset.i); }));
  layer.querySelectorAll('.inn-btn').forEach(b=>
    b.addEventListener('pointerup', e=>{ e.stopPropagation();
      const act = (b.dataset.act==='sit') ? 'sit' : 'sleep';
      learnTip(act); closeGuide(true);
      if(act==='sit') sitAlone(); else sleepHere(); }));
  const g=layer.querySelector('.inn-guide');
  if(g) g.addEventListener('pointerup', e=>{ e.stopPropagation(); closeGuide(); });
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
  /* ⚠ 大廳可能在**還沒住下**（`none`）時就開了（獨自坐坐從初入對白就能用，ver -401）——
     那時候還沒有人回房，四扇門都該是空的。不擋的話諾薇兒的門會在她還站在旁邊時就亮著。 */
  if(st==='none') return 'empty';
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
  /* 兩顆鈕的出場時機（ver -408 統一）：**初入對白演完就都有，之後一直都在**。
     ⚠⚠ 坐坐原本睡下之後（`slept`）就收起來 —— Ray 回報「獨自坐坐又不見了」。
       那個限制是 ver -392 寫的（當時它的用途只有「等蕾娜」），但**消磨兩小時本身
       就是一個行動**：城裡的店有營業時間、打烊了走不進去（ver -406），
       「在旅店坐到店開門」是玩家真的需要的一步。
     ⚠ 「還不能做」一律**不是靠藏起鈕**擋，而是按下去由角色擋回來（見 sleepHere 的
       諾薇兒）—— 鈕不見了玩家只會以為壞了。 */
  wantSit   = introDone();
  wantSleep = introDone();
  relayout();
  /* 教學提示（Ray 稿上的兩句舞台指示）。⚠ 只在該做那件事的時候出現，不常駐。 */
  const hint = layer.querySelector('.inn-hint');
  /* ⚠ **不要寫「敲敲伙伴的門」**（ver -395，Ray 指定）—— 敲門是玩家自己會去試的事，
     寫出來反而像在派任務。這一行只留「現在該做什麼」。 */
  /* ⚠ **「大家都睡了。回房休息吧。」拿掉**（ver -396，Ray 指定）——
     那一段的引導改用**指著鈕的雪鐵龍箭 ＋ 一句說明**（見 relayout），
     比一行浮在半空的字明確得多。 */
  if(hint) hint.textContent = (st==='wait') ? '坐下來消磨時間吧。' : '';
  layer.classList.toggle('on', introDone() || st!=='none');
  /* 一次性說明：**一次排一個**，依「現在畫面上真的有那顆東西」決定演哪一個。
     ⚠ 要在 `relayout()` 之後 —— 鈕還沒擺好就量不到位置。 */
  maybeGuide();
}
/* 現在該演哪一個一次性說明。⚠ `refresh()` 與 `relayout()` 都會叫 —— 後者是為了
   「背景晚一步載完、鈕才被擺好」那一拍（那時 refresh 已經跑過了）。 */
function maybeGuide(){
  if(guideKey || !layer) return;
  const st=stage();
  /* 順序是**玩家會先碰到的那一個在前**：坐 → 睡 → 敲門。
     ⚠⚠ 要**逐個試到真的開起來為止**（ver -408 修）——不能寫成 `else if` 鏈：
       `showGuide` 在「已經看過」或「量不到位置」時是**靜靜地 return**，
       而 else-if 只看前一個條件成不成立，於是第一個候選一旦永遠成立
       （ver -408 起坐坐一直都在），後面兩個就再也輪不到了。 */
  const q=[];
  if(wantSit)     q.push('sit');
  if(wantSleep)   q.push('sleep');
  if(st==='wait') q.push('knock');
  for(const k of q){ showGuide(k); if(guideKey) return; }
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

/* ══ 獨自坐坐 ══ 暗去 → 時鐘推到 20:00 → 亮起 → 蕾娜回來那一幕。 */
let busy = false;
function sitAlone(){
  /* ⚠ 守門看的是**那顆鈕現在在不在**（`wantSit`），不是 `stage()==='wait'`（ver -401 修）——
     ver -395 那個守門是「只有在等蕾娜時才能坐」寫的，但 Ray 已經把它改成
     「初入對白演完就能用」，再用舊守門的話按下去什麼都不會發生。 */
  if(busy || !wantSit) return;
  busy = true;
  if(host && host.lock) host.lock(true);
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  story.hideBubble();
  /* ⚠ 走 `story.veil()`（唯一那一片黑幕，鐵律 8）：舊版用 `#innLobby` 裡的
     `.inn-veil`，而上一行的 `lock(true)` 已經把整層藏起來了 —— 那片黑幕
     **從來沒有真的亮過**，這一段一直只是乾等（ver -430 修）。 */
  story.veil(true, SIT_FADE_MS);
  setTimeout(()=>{
    /* ⚠⚠ 一次**兩小時**（ver -401，Ray：「消磨時間：2小時」）——
       但**還在等蕾娜時不准跨過她回來的那一刻**：從 19:00 一口氣坐到 21:00 就整個錯過她了。
       所以在等她的那一段，這一次最多只坐到 20:00。 */
    let mins = SIT_MIN;
    if(stage()==='wait'){
      const toBack = Math.round((RENNA_BACK - clock.hourF())*60);
      if(toBack > 0) mins = Math.min(mins, toBack);
    }
    clock.advance(Math.max(1, mins));
    /* 時間變了 → **背景換成新時段的差分**（Ray 指定）。走城鎮那一支候選鏈。 */
    if(host && host.refreshBg) host.refreshBg();
    refresh();
    /* ⚠ **在全黑之下停一拍再亮**（ver -430，Ray：「約3秒」）：暗→亮直接相接的話
       換時段的背景是在觀眾眼前抽換的，讀起來像閃了一下，不像過了兩小時。
       ⚠ 坐完之後**不要在這裡自己判一次**「碰到蕾娜了沒／該不該去休息」——
         那是「現在站在旅店裡該發生什麼」，只有 `runBranch` 一支（鐵律 8）。
         ver -427 之前這裡有一份自己的判斷，於是「坐到過 18:00」那一條漏掉了。
       ⚠ 被強制移走時（時鐘剛好推過閘門）黑幕交給 `town.enter()` 收，同睡覺。 */
    setTimeout(()=>{
      if(endSit()) return;
      story.veil(false, SIT_FADE_MS);
    }, SIT_HOLD_MS);
  }, SIT_FADE_MS);
}
/* 一個行動做完了。⚠⚠ **時鐘可能已經推過某個閘門**（stage 0 的結尾＝隔天早上七點）——
   獨自坐坐與回房睡覺都會推時鐘，所以兩條路都走這一支問一次（鐵律 8）。
   回傳 true ＝城鎮已經接手強制轉場（玩家要被移到別的節點），這裡就不要再收尾了：
   `enter()` 會把大廳整個收掉。 */
function settle(){
  busy=false;
  if(host && host.onClock && host.onClock()) return true;
  if(host && host.lock) host.lock(false);
  runBranch();          // ⚠ 時間變了，「現在該發生什麼」要重問一次（見 runBranch）
  return false;
}
/* 坐完但沒有演出：把鎖放掉、畫面接回來。
   ⚠ **要把 `settle()` 的回傳帶出去**（ver -430）：true ＝城鎮已經接手強制轉場，
     呼叫端就不該再把黑幕亮回來（新地點還沒擺好）。 */
function endSit(){ return settle(); }
/* 蕾娜回來那一幕。⚠ 兩條路都走這一支（坐著等到她、或走出去 20~21 點回來撞見），
   所以好感也只在這裡加一次（鐵律 8）。 */
function playRenna(){
  busy = true;
  if(host && host.lock) host.lock(true);
  const lines = (node && node.innRenna) || [];
  if(!lines.length || !host || !host.play){ finishRenna(); return; }
  /* ⚠ 蕾娜站**右**：這一段她與玩家對話，台上只有她一個人，但沿用城鎮那一幕的
     整幕覆寫比較不會與日後多人同台打架（§6.5 的固定站位）。 */
  host.play(lines, finishRenna, { sides:{ RENNA:'R' } });
}
function finishRenna(){
  story.clearCast();
  prog.addFlags([F_RENNA]);
  prog.addAffection('renna', AFF_MEET);     // 碰到她：好感 +1（Ray 指定）
  settle();                                 // ⚠ 這一幕也可能剛好把時間推過閘門
}

/* ══ 回房睡覺 ══ 播睡覺音 → 跟它一樣長的淡出至黑 → 推進到**隔日早上七點**、
   恢復體力、**建立那唯一的一份存檔** → 沒有特別劇情就淡入回旅店。
   （ver -392 只有存檔；-396 補時間與體力；**-430 Ray 改寫成一段演出**。）
   ⚠⚠ **不再開存檔欄位面板**（ver -430，Ray：「不要給存檔欄位，只有單檔，睡覺就是
     建立唯一存檔」）—— 走 `save.storySave()`（玩家那一格，不是 F4/F5 的開發格）。
   ⚠⚠ **淡出的長度＝音檔的長度**，問 `SFX.duration()` 拿實測值，**不要在這裡寫秒數**
     （鐵律 7：長度的真相在音檔身上，換一支音檔這裡不必改）。
   ⚠ 音效還沒解碼完就拿不到長度 → 退回 `SLEEP_FADE_FALLBACK`。照 §6.6 的預載順序
     （音效不載完不放行）正常情況下不會走到那條。
   ⚠⚠ **「特別劇情」才不淡回來**：睡到隔天七點就是 stage 0 的結尾，那一刻會被強制
     移到船塢 —— 那時黑幕留給 `town.enter()` 收（新地點擺好了才亮，一次乾淨的剪接）。
   ⚠⚠ **「恢復體力」目前沒有實體**：這個專案還沒有體力／疲勞系統（戰鬥的 HP 是每場重置的）。
     那一句話先照 Ray 的字寫在鈕的說明上，等體力系統做出來時**接在這裡**（就這一支）。 */
function sleepHere(){
  if(busy || !wantSleep) return;
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  story.hideBubble();
  /* ══ 太早（ver -405，Ray：「在晚上6點之前點的話會彈出諾薇兒 front
     『再逛一下嘛，還沒六點呢。』」）══
     ⚠ 那個時刻與**傍晚的提醒**是同一個（`TOWNS[].evening.hour`，18:00）——
       她說的「還沒六點」就是那條線，所以**問同一個地方**（鐵律 7），
       不要在這裡再寫一個 18。 */
  if(clock.hourF() < eveningHour){
    const lines = (node && node.innEarly) || [];
    if(lines.length && host && host.play){
      busy = true;
      if(host.lock) host.lock(true);
      host.play(lines, ()=>{ story.clearCast(); busy=false;
        if(host.lock) host.lock(false); refresh(); });
    }
    return;
  }
  /* ⚠ 蕾娜還沒回來就先去睡 → 記「錯過」（ver -405）：她 20:00 才進門，人睡著了
     自然碰不到。不記的話 `stage()` 會卡在 `wait`／`none`，隔天早上大廳的狀態
     與「已經過了一夜」對不上（§6.9 那張清單：狀態要推得出來，不要留空窗）。 */
  busy = true;
  if(host && host.lock) host.lock(true);
  /* 睡覺音 ＋ 與它等長的淡出至黑（Ray 指定「配合音檔時間淡出至黑」）。 */
  const src = asset('se_sleep');
  try{ SFX.play(src, sfxGain('se_sleep')); }catch(_){}
  /* ⚠⚠ **淡出只走音檔長度的一半**（ver -433，Ray：「睡覺淡入淡出時間過長，減半，
     SE 不用改動」）—— 音效照樣整支播完（它是那一段的聲音），畫面不必陪它等：
     9.9 秒的漸暗讀起來是卡住，不是入睡。
     ⚠ 長度仍然**從音檔推**（鐵律 7）：換一支音檔這裡不必改，比例還是一半。 */
  const ms = Math.round((SFX.duration(src) || SLEEP_FADE_FALLBACK) * SLEEP_FADE_RATIO);
  story.veil(true, ms);
  setTimeout(()=>{
    /* ⚠ 蕾娜還沒回來就先去睡 → 記「錯過」（ver -405）：她 20:00 才進門，人睡著了
       自然碰不到。不記的話 `stage()` 會卡在 `wait`／`none`，隔天早上大廳的狀態
       與「已經過了一夜」對不上（§6.9 那張清單：狀態要推得出來，不要留空窗）。 */
    if(stage()!=='slept') prog.addFlags([F_MISS]);
    /* 推進到**下一個** 07:00：晚上 21:00 睡 → 隔天 07:00（+10h）；
       凌晨 01:00 睡 → 同一天 07:00（+6h，那本來就已經是「隔日」了）。 */
    let mins = Math.round((WAKE_HOUR - clock.hourF())*60);
    if(mins <= 0) mins += 24*60;
    clock.advance(mins);
    if(host && host.refreshBg) host.refreshBg();   // 天亮了 → 換時段差分（同「獨自坐坐」）
    refresh();
    /* ⚠ 存檔要在**時鐘推完之後**：存的是「醒來的那一刻」，不是躺下的那一刻 ——
       讀檔回來才會接在早上七點的旅店，而不是又要睡一次。 */
    save.storySave();
    /* 被強制移走了（stage 0 的結尾 → 船塢）→ 黑幕交給 `town.enter()` 收。
       其餘情況：淡入回旅店（Ray：「如果沒有特別劇情就淡入回旅店」）。 */
    if(settle()) return;
    story.veil(false, WAKE_FADE_MS);
  }, ms);
}

/* ══ 進旅店 ══ 由 `modules/town.js` 的 `afterArrive` 呼叫（進場對白演完之後）。 */
let allSeenNow = false;         // 這一次進來時「城裡都走過了沒」（坐坐不會改變它）
export function arrive(n, ctx){
  node = n;
  /* ⚠ 旗標名**由城鎮算好傳進來**（ver -402）：旅店已經沒有 `kind` 了，
     `kind` 版／節點版兩種只有 `town.flagOf()` 知道 —— 自己拼會拼錯城（鐵律 7）。 */
  introFlag = (ctx && ctx.introFlag) || null;
  if(ctx && ctx.eveningHour!=null) eveningHour = ctx.eveningHour;
  eveningFlag = (ctx && ctx.eveningFlag) || null;
  allSeenNow = !!(ctx && ctx.allSeen);
  ensureLayer();
  runBranch(true);
}

/* ══⚠⚠ 「現在站在旅店裡，該發生什麼」只有這一支（ver -427，鐵律 8）══════════
   走進來、獨自坐坐坐完、蕾娜那一幕演完，三條路都問它 —— 以前只有「走進來」那一條
   問得到，於是**坐到過 18:00 諾薇兒不會去休息、坐到過 20:00 蕾娜不會回來**
   （那兩件事本來各寫了一份判斷在 `sitAlone` 裡）。
   由上往下：
     ① 還沒住下（`none`）→ 分支一／分支二
     ② 在等蕾娜（`wait`）→ 看時刻決定撞見她／她已經回房
     ③ 其他            → 只重畫
   ⚠ `arrived` ＝這一次是**走進來**（不是坐完）。分支一（「時間還早，我想去城裡逛逛呢」）
     是**招呼**，只在走進來時講；分支二（「今天有點累了」）是**狀態轉移**，時間到了就講，
     所以坐完也要判 —— 不分的話每坐兩小時她就把那句招呼再唸一次。 */
function runBranch(arrived){
  const b = (node && node.innBranch) || {};
  /* ⚠⚠ **分支二的條件是「走完了」或「時間到了」**（ver -427，Ray 的規則四／五：
       「若3發生而主角已在旅店，走5（諾：『今天有點累了，我先去休息囉。』）」）。
     這與城鎮那一格傍晚的兩條**是同一件事**，所以門檻用同一個數字
     （`eveningHour`，由城鎮傳進來，鐵律 7）。
     ⚠ 不要只判 `allSeen`：被強制抓回旅店的那條路上時鐘正好 18:00 而地點沒走完，
       只判 `allSeen` 的話她會說「時間還早，我想去城裡逛逛呢」—— 與剛剛那句話打架。 */
  const settled = allSeenNow || clock.hourF() >= eveningHour;
  const lines = settled ? b.settled : b.exploring;
  if(stage()==='none' && lines && lines.length && (settled || arrived)){
    if(host && host.lock) host.lock(true);
    if(host && host.play) host.play(lines, ()=>{
      story.clearCast();
      if(settled){
        prog.addFlags([F_WAIT]);                          // 住下了 → 大廳開張
        if(eveningFlag) prog.addFlags([eveningFlag]);     // 傍晚那一格＝這一段（規則四／五）
      }
      if(host && host.lock) host.lock(false);
      refresh();
    });
    return;
  }
  /* ══ 蕾娜回來的那一小時（ver -395／-427）══
       20:00~21:00 → **碰得到她**（好感 +1）：走進來、或坐坐坐到那一刻，都算
                     （Ray：「不論是走進去或者是坐坐的時間會『經過』這個時段就觸發」——
                      坐坐在等她的那一段會被夾住不准跨過 20:00，見 `sitAlone`）
       ≥21:00      → 她已經回房了（記旗標，隔天時鐘小於 21 也不會又冒出來）
     ⚠ 這一段要在**分支二之後**才判：那幾句還沒演完就先讓蕾娜上台會疊在一起。 */
  if(stage()==='wait'){
    const h = clock.hourF();
    if(h >= RENNA_GONE){ prog.addFlags([F_MISS]); refresh(); return; }
    if(h >= RENNA_BACK){ refresh(); playRenna(); return; }
  }
  refresh();
}

/* 初入對白剛演完 → 大廳開張（`introDone()` 是問旗標的，而旗標是**演完才記**的，
   所以 `town.enter` 的收尾要再叫一次 refresh —— 那正是 `arrive` 被呼叫的時機）。 */

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
  /* 伙伴門那一排是**貼著畫面右緣**的（CSS 定位），而兩顆行動鈕是**貼著背景圖**的
     （`bgPoint`，會隨機器長寬比在圖上滑動）—— 兩套座標系，所以要真的量一次才知道會不會撞。
     ⚠ 回傳門欄的左緣（沒有門就回 null）。 */
  const doorLeft=()=>{
    const ds=[...layer.querySelectorAll('.inn-door')].filter(d=>!d.classList.contains('empty'));
    if(!ds.length) return null;
    return Math.min(...ds.map(d=>d.getBoundingClientRect().left));
  };
  const put=(sel, want, sp)=>{
    const b=layer.querySelector(sel); if(!b) return;
    const p = (want && sp && host && host.bgPoint) ? host.bgPoint(sp.x, sp.y) : null;
    if(!p){ b.classList.remove('on'); return; }
    b.style.left=p.x+'px'; b.style.top=p.y+'px';
    b.classList.add('on');
    /* ⚠⚠ **擺好之後夾一次**（ver -407）：鈕錨在背景圖上、門欄錨在畫面右緣，
       兩套座標系在不同長寬比的機器上會撞在一起（實測 390×844：睡覺鈕右緣 338、
       門欄左緣 328 —— 疊了 10px）。夾的是**畫面內** ＋ **不進門欄**。
       ⚠ 要在 `.on` 之後量：沒顯示的元素量到 0×0（同 §6.5.4 那個字格的坑）。 */
    const st=story.stageEl(); if(!st) return;
    const sr=st.getBoundingClientRect(), br=b.getBoundingClientRect();
    if(!br.width) return;
    const half=br.width/2, halfH=br.height/2;
    let right = sr.width - half - 8;
    const dl = doorLeft();
    if(dl!=null) right = Math.min(right, dl - sr.left - half - 8);
    b.style.left = Math.min(Math.max(p.x, half+8), Math.max(half+8, right)) + 'px';
    /* ⚠⚠ **下界是對話框的上緣**（ver -409，Ray：「獨自坐坐壓到對話框了」）。
       敲門的回話、路人單句都會把對話框叫出來，而鈕是常駐的 —— 壓在框上就點不到、
       也擋住台詞。對話框的位置是 `layoutKerberos` 那組變數解出來的，**問它不要自己算**
       （鐵律 7）：`visibility:hidden` 的元素照樣量得到 box，所以框沒顯示時也夾得準。 */
    const bub=document.getElementById('storyBubble');
    let bottom = sr.height - halfH - 8;
    if(bub){ const r=bub.getBoundingClientRect();
      if(r.height) bottom = Math.min(bottom, r.top - sr.top - halfH - 8); }
    b.style.top = Math.min(Math.max(p.y, halfH+8), Math.max(halfH+8, bottom)) + 'px';
  };
  put('[data-act="sit"]',   wantSit,   spots.sit);
  put('[data-act="sleep"]', wantSleep, spots.sleep);
  maybeGuide();                      // 鈕剛擺好 → 現在才量得到位置（見 showGuide 的說明）
}

export function close(){
  if(layer) layer.classList.remove('on');
  node = null;
}

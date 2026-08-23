/* ══════════════════════════════════════════════════════════════════════
   story.js — 主線 scene 播放器（TIVOT_SCRIPT_ARCHITECTURE §3 / §5）
   ──────────────────────────────────────────────────────────────────────
   吃 script/mainScript.js 的 scene 鏈，一句一句演出來；scene 播完寫
   stage / flags，再依 next 接下一段。

   ── 站位：固定 2/2 分邊（Ray 定案，ver -289；取代規格 §3 原有的逐句 pos）──
     右　索拉娜・安雅　　　左　蕾娜・諾薇兒
   站位寫在 speakers.js 的 ART[].side，**不隨台詞變動** —— 同一個人每次都站
   同一邊，玩家才記得住誰是誰。同側換人＝舊的滑出、新的滑入。
   ⚠ ver -288 曾短暫改成「發起位制」（發起人站右），**已退回** —— 立繪朝向是
     畫死的，換邊必須水平翻轉，而翻轉會把髮旋、配件、持物左右顛倒
     （實測蕾娜的板夾會換手）。正解是畫左右兩版圖，欄位見 ART[].alt。
   ⚠ 與飛行頁閒聊是**同一條規則同一組數值**，改一邊要改兩邊。

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
import { SPEAKERS, ART, CAST_TALL, nameOf, artOf, exprSrc, frameOf } from '../script/speakers.js';
import * as prog from '../script/progress.js';
import { decorateLine } from '../i18n.js';
import { SFX } from '../audio.js';
import { matchPortraits } from './tone.js';

const $ = id => document.getElementById(id);

/* ── 舞台幾何 ──
   CAST_SHOW：最高的人露出身體的幾成。**這是「立繪多大」的唯一旋鈕**，
   值越小＝鏡頭越近＝立繪越大（與 flight 同義同值）。 */
/* 「最高的人露出身體的幾成」—— **越小＝鏡頭越近＝人越大、露出的身體越少**。
   （飛行頁的對照：0.62＝頭到大腿、0.48＝頭到腰。） */
const CAST_SHOW = 0.56;
/* ⚠⚠ **露出身體的上限**（ver -320，Ray：「立繪不要出全身，以膝部以上為原則，
   不然細節看不清」）。0.72 約是頭到膝。
   為什麼需要它：兩人同台時每人只有半屏，寬度不夠就會一路等比縮小 —— 縮到最後
   全身都出來了，臉只剩幾十像素。這個底線讓「縮小」在膝蓋處停住，
   **寧可兩人的輪廓稍微重疊，也不要縮到看不清臉**。 */
const CAST_SHOW_MAX = 0.72;
const SLIDE_MS  = 450;          // 進場滑入（CLAUDE.md §6.5：450ms ease-out）
const TYPE_MS   = 22;           // 打字機每字間隔

let cur = null;                 // 目前 scene 物件
let lineIdx = 0;
let slot = { L:null, R:null };  // 兩個位置目前站誰（角色 id）
/* 每個槽目前用的是哪張差分。⚠ 排版要用**那一張**的取景（top/bot/fx），
   不是角色的基本值 —— 差分是不同姿勢，見 speakers.js 的 frameOf。 */
let slotExpr = { L:null, R:null };
let shown = {};                 // 角色 id → 目前的 portrait 狀態 {expr, show}
let typing = null;              // 打字機 timer
let waitT  = null;              // delay：對話框延後出現的 timer（見 renderLine）
let autoT  = null;              // auto：沒有台詞的演出拍自己推進的 timer
let battleHandler = null;       // main.js 注入：遇到 {battle:id} 時怎麼發動（見 renderLine）
let active = false;
let onExit = null;              // 播完/退出後的回呼

const missingExpr = new Set();  // 已回報過的缺圖，避免洗版

/* ══ 立繪素材解析 ══
   expr 查不到 → 回退 base 立繪，並在 console 記一筆（只記一次）。
   ⚠ 差分素材目前全部不存在，所以**每一句都會走回退**——這是預期狀態。
     console 那串正好就是「還缺哪些圖」的清單。 */
function srcFor(artKey, expr){
  const a = ART[artKey]; if(!a) return '';
  const es = exprSrc(a, expr);
  if(es) return es;
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
  /* ⚠ 高度取**立繪區**（#storyCast）而不是整個舞台（ver -316）：下半是固定的
     戰鬥盤面，拿整個舞台高去算的話人會被畫到盤面底下，而且「腳落地平線」
     那條規則會落在錯的地方。 */
  const cast=$('storyCast');
  const W=stage.clientWidth, H=(cast?cast.clientHeight:stage.clientHeight);
  if(!W || !H) return;
  const top=topLine();

  /* 最高的人定義相機：頭頂貼頂線、身體露出 CAST_SHOW。 */
  let pxCm = (H-top)/(CAST_SHOW*CAST_TALL);

  const on=[];
  for(const side of ['L','R']){
    const el=slotEl(side), id=slot[side];
    if(!el || !id || !el.naturalWidth) continue;
    const a=frameOf(id, slotExpr[side]); if(!a) continue;
    on.push({ el, a, side });
  }
  if(!on.length) return;
  const solo = on.length===1;

  /* 依 pxCm 求每個人的縮放、頭頂 y、以及**畫面內看得見的那一段圖列**，
     只拿那一段量輪廓（見 measureBounds 的警告）。 */
  const calc = ()=>on.map(o=>{
    const a=o.a;
    /* 縮放：鎖身高。faceAdj＝逐張的畫風補償（見 speakers.js 的說明），沒寫就是 1。 */
    const s     = pxCm*a.cm/(a.bot-a.top) * (a.faceAdj||1);
    /* ⚠ 身高差的縱向讓位**只在兩人同台時**才做（ver -319，Ray：「立繪太低」）。
       它的用意是「四個人的腳落在同一條地平線上」—— 台上只有一個人的時候沒有
       對象可以對齊，那 (CAST_TALL−cm)×pxCm 就只是在頭頂上方空出一塊
       （諾薇兒 165 vs 最高的 176，實測空掉 62px，在 494 高的立繪區裡很明顯）。 */
    /* ⚠⚠ 身高讓位**一律套用**，不再分單人／兩人（ver -336）。
       原本單人時不讓位，於是同一張立繪在「單人那一格」與「兩人那一格」高低不同 ——
       Ray 回報「『讓開』出來的時候諾薇兒立繪縮小了」，看到的就是這個位移
       （實測尺寸其實一樣，697=697，但整個人往下沉 46px，讀起來就是變小）。
       **原則：同一張立繪在任何場合都要算出同一個結果**（Ray 指定寫入原則）。
       代價：單人時頭頂上方會空出 (CAST_TALL−身高)×每公分像素，那是身高的誠實表現。
     ⚠ 頭頂用 standCm（站姿身高）不用 cm：cm 是縮放的分母／分子，改它連大小一起變。 */
    const headY = top + (CAST_TALL-(a.standCm||a.cm))*pxCm;
    const yTop  = headY - s*a.top;                    // 圖框上緣的螢幕 y
    const visLo = a.top;                              // 頭頂
    const visHi = Math.min(a.bot, a.top + (H-headY)/s);  // 畫面下緣對應的圖列
    /* ⚠ b（輪廓左右界）ver -325 起**沒有人用**了 —— 夾中線那道拿掉之後就沒有
       消費者。留著是因為它是唯一「量得出立繪實際佔多寬」的工具，日後要做
       任何位置自動調整都會需要它；量一次幾百微秒，不值得為省它而刪。 */
    return { ...o, s, headY, yTop, b:measureBounds(o.el, visLo, visHi) };
  });

  const m = calc();
  /* ⚠⚠ **不做「依人數縮放」**（ver -320，Ray：「同一張立繪不可有兩個大小」）。
     原本的作法是：兩人同台時每人只有半屏，輪廓超出就整體等比縮小。那會讓
     **同一張圖在不同場合有不同大小** —— 單人時大、兩人時小，換場就跳一下；
     而且縮到最後全身都出來，臉只剩幾十像素（Ray：「細節看不清」）。
     現在 pxCm 只由 CAST_SHOW 與畫面高決定，是個常數 → 同一張圖永遠同一個大小。
     ⚠ 代價是兩人的輪廓會**交疊**。Ray 定案：「多少有些交疊沒關係」。
     ⚠ 也不要改成鎖臉上的特徵（眼寬／耳寬）來解 —— 專案踩過：鎖眼寬會把
       **畫風差異放大成體型差異**（索拉娜眼睛被畫小 → 整個人放大 13%，
       實測螢幕身高比 1.249 vs 真實身高比 1.107）。見 flight/HANDOFF.md F 節。
       尺要鎖**身高**，那是角色的客觀屬性，不隨畫風跑。 */

  /* ⚠ 垂直落點：頂線是**上限**（不撞退出鈕），不是非貼不可。
     被輪廓預算縮小之後照樣把頭頂釘在頂線的話，畫面下方會空一大塊。
     所以縮小時改成**把腳落到畫面底**（那本來就是 §6.5 要的「四個人的腳
     落在同一條地平線上」）；沒縮小、腳本來就在畫面外時 shift=0，維持貼頂。 */
  let shift=0;
  for(const o of m) shift=Math.max(shift, H - (o.yTop + o.s*o.a.bot));
  shift=Math.max(0, shift);

  for(const o of m){
    const a=o.a, el=o.el, NW=el.naturalWidth;
    const fx=a.fx;
    /* 橫向錨的是**臉的中心**（fx），不是圖框中心 —— 插畫左右留白差很多。 */
    /* ⚠ ver -316：**單人也站自己那一側**，不置中（Ray 指定「同一人物立繪需
       一直在同一側」）。置中的話同一個人會因為場上有幾個人而左右跳，
       玩家就記不住誰站哪邊了 —— 那正是固定站位要解決的事。
       單人時錨點往中間讓一點（0.38／0.62 而不是 0.26／0.74），畫面才不會太偏。 */
    /* ⚠⚠ ver -325：兩人同台的錨點由 0.26／0.74 收到 **0.34／0.66**，
       而且**不再夾中線**（Ray：「璐娜登場時兩人的立繪都太靠畫面邊緣」）。
       夾中線的作法是「輪廓不准越過中線，越了就往外推」—— 這些立繪的輪廓
       都比半個畫面寬，於是每次都推到底，兩個人各自貼著左右邊緣，臉有一半
       被 `#storyCast` 的 overflow 裁掉。
       現在只認錨點：臉一定落在 0.34W／0.66W，位置可預期。
       ⚠ 代價是兩人的輪廓會在中間交疊 —— Ray 早就定過「多少有些交疊沒關係」，
         而且交疊的是裙襬與頭髮的邊，臉各自在自己那 1/3 處，不會互相蓋住。
       ⚠ 不要再加「把輪廓拉回畫面內」那道（ver -320 踩過）：它與錨點的方向相反，
         排在後面會贏，結果是兩個人被一起推回中間疊成一團（實測重疊 197px）。 */
    /* ⚠⚠ 錨點**與飛行畫面／戰鬥教學同一組值**（0.24／0.76，見 flight/index.html
       的 `const anchor=(c.side==='L') ? 0.24 : 0.76`）。
       先前這裡是 0.38／0.62（單人）與 0.34／0.66（兩人），比飛行畫面靠中間
       0.10~0.14 個畫面寬 —— Ray 反覆回報「還是往中間放」就是這個。
       ⚠ **單人也用同一組**：站位是角色的屬性，不該因為台上有幾個人而改變。 */
    const faceX = (o.side==='R' ? W*0.76 : W*0.24);
    const x = faceX - o.s*fx*NW;
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
  return Math.round((h>0 ? h : 46) + 4);       // 鈕底下再留 4px（ver -319 由 10 收，Ray：立繪要更高）
}

/* ══ 立繪槽 ══ */
function slotEl(side){ return $(side==='R' ? 'storyCastR' : 'storyCastL'); }

/* 讓某角色出現在他該在的位置；已在場就只更新表情。回傳他所在的 side。 */
function ensureOn(id, expr){
  const sp = SPEAKERS[id]; if(!sp) return null;
  /* ⚠⚠ **沒有立繪資料的角色不准碰立繪槽**（ver -319 修）。
     「？？？」（UNKNOWN）與璐娜莉亞的 art 是 null —— 她們只用 CG／暗調 CI 登場。
     原本沒擋，`artOf` 回 null 之後 side 退回 'L'，於是她們去佔了左邊那個槽，
     把站在那裡的諾薇兒**整個清掉**（Ray 回報「讓開。」那一拍她不見了）。 */
  if(!artOf(id)) return null;
  const side = (artOf(id) && artOf(id).side) || 'L';   // 固定站位，見檔頭
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
    const first = !slot[side];
    if(swapping){
      /* 同側換人：舊的先滑出，再換新的滑入（CLAUDE.md §6.5 的輪轉換卡，
         與飛行畫面同一套）。 */
      el.classList.remove('on');
      setTimeout(apply, SLIDE_MS*0.45);
    }else if(first){
      el.classList.remove('on');            // 首次上場：從自己那一側滑入
      setTimeout(apply, 16);
    }else{
      /* ⚠ 同一個人只換表情／換圖：走**淡入淡出**，不要滑出再滑進來
         （Ray 指定「立繪更換時要淡入淡出，不要直接切」）。
         人沒有離開舞台，滑一次會讀成「她走掉又走回來」。 */
      /* ⚠⚠ `.fading` 要等**新圖載好**才拿掉（ver -322 修）。
         舊寫法是換 src 之後**立刻**移除 —— 但載圖是非同步的，那一瞬間
         元素上還是**舊圖**，於是舊圖先淡回來、新圖才蓋上去，看起來就是
         兩張圖疊在一起（Ray：「同一角色的立繪切換淡入淡出時不可重疊」）。
         ⚠ 也要處理「新圖已在快取」的情況：那時 onload 不會再觸發，
           要靠 `complete && naturalWidth` 這條退路。 */
      el.classList.add('fading');
      setTimeout(()=>{
        const back=()=>{ el.classList.remove('fading'); layout(); el.classList.add('on'); };
        el.onload=()=>{ el.onload=null; back(); };
        el.setAttribute('src', src);
        el.dataset.who = id;
        if(el.complete && el.naturalWidth){ el.onload=null; back(); }
      }, 190);
    }
    slot[side]=id;
  }
  slotExpr[side]=expr||null;
  return side;
}

function leaveSlot(side){
  const el=slotEl(side); if(!el) return;
  el.classList.remove('on'); slot[side]=null; slotExpr[side]=null;
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

/* ══ 演出層（ver -315）══════════════════════════════════════════════
   line 上的**演出欄位**，全部「只寫變化」：省略＝沿用上一句的狀態。

     bg:'HolyseeDungeonWhole'   背景（resources/background/*.webp）。bg:null 清掉
     cg:'001_Nouvelle_Fell'     全屏插圖（resources/illustration/*.webp）。cg:null 清掉
     cgPan:'up' / 'down'        這一句的 CG 平移（up＝由下往上、down＝由上往下）
     ci:'Lunaria_SI_Armed'      暗調 CI 插入（resources/SI/*.webp）。ci:null 收掉
     card:'1908年6月13日，聖王廳地宮G2區'   情境卡：背景上蓋半透黑＋置中文字
                                有 card 的那一句**不顯示對話框**（它不是台詞）
     bgm:'PerituneMaterial_Crisis_loop'   背景音樂（resources/audio/bgm/*.m4a）
                                bgm:null 停掉。與 bg 一樣是**持續**狀態。
     se:'se_steps'              音效；也可以給陣列做多發：
                                se:[{n:'se_weapon_reload'},{n:'se_weapon_reload',delay:500}]
     hide:'UNKNOWN'             把某個人（或陣列）請下台。⚠ portrait 一句只能指定
                                一個人，要**同時**讓另一個人退場就用這個
     dark:true                  這一句的說話者立繪壓成暗調（剪影感，還沒表明身分）
     delay:2600                 **先不出對話框**，等這麼久再打字（等平移／演出跑完）
     shake:true                 畫面抖一下
     load:'sceneId'             **標準讀取頁**：擋畫面把那個場景的素材抓完再往下演。
                                （ver -338，Ray 指定；插在哪由腳本決定）
                                ⚠ 這一行沒有台詞也沒有演出，它就是一道閘門。
     fx:'gunfire'               在 CG 上灑一串槍擊命中點

   ⚠ 這些是**演出**不是狀態機：`shake`／`fx`／`se` 是一次性的（每次演到就放），
     `bg`／`cg`／`ci` 是持續的（沿用到下一次改變）。混在一起寫會很難讀，
     所以分成 applyPersist 與 fireOneShot 兩支。 */
const BG_DIR='resources/background/', CG_DIR='resources/illustration/', SI_DIR='resources/SI/';
/* ⚠ BGM 逐支列出實際路徑，理由同 SE_SRC（bgm/ 裡 mp3 與 m4a 都有）。 */
const BGM_SRC={
  crisis: 'resources/audio/bgm/PerituneMaterial_Crisis_loop.m4a',
};
/* 離開劇情要**回到主畫面的曲子**（Ray 指定）。⚠ 走 config 的鍵不要寫死路徑：
   主選單換曲時只改 config，這裡自動跟著。音量也用 config 那一份。 */
const HOME_BGM='resources/audio/bgm/bgm_mainmenu.m4a', HOME_VOL=0.37;
let stageBg=null, stageCg=null, stageCi=null, stageBgm=null;   // 目前的持續狀態

function setImg(el, src){
  if(!el) return;
  if(src){ if(el.getAttribute('src')!==src) el.src=src; el.classList.add('on'); }
  else   { el.classList.remove('on'); }
}
/* 背景／插圖的來源路徑。⚠ **插圖也可以當背景用**（ver -325，Ray：「『對不起，
   我已經…』的背景是插圖002」）—— 判斷靠命名慣例：插圖一律 `NNN_` 開頭
   （001_Nouvelle_Fell…），背景是名字（HolyseeDungeonWhole…）。
   這樣腳本裡照樣只寫一個名字，不必再記它放在哪個資料夾。 */
function imgSrc(name){
  return (/^\d{3}_/.test(name) ? CG_DIR : BG_DIR) + name + '.webp';
}
/* 換圖：淡出 → 換 → 淡入。FADE_MS 與 style.css 的 transition 同值。
   ⚠⚠ `.fading` 要等**新圖載好**才拿掉（同 ver -322 立繪那個坑）：移除 class 的
     那一瞬間元素上還是舊圖，於是**舊圖先淡回來、新圖才蓋上去**＝兩張疊在一起。
   ⚠ 場上還沒有圖時直接上（不淡入淡出）—— 否則開場會先黑一段莫名的空白。 */
const FADE_MS = 220;
function swapImg(el, src){
  if(!el) return;
  const on  = el.classList.contains('on');
  const cur = on ? el.getAttribute('src') : null;
  if(cur===src) return;
  if(!on){ setImg(el, src); return; }
  el.classList.add('fading');
  setTimeout(()=>{
    if(!src){ el.classList.remove('on','fading'); return; }
    const back=()=>{ el.onload=null; el.classList.remove('fading'); el.classList.add('on'); };
    el.onload=back;
    el.setAttribute('src', src);
    if(el.complete && el.naturalWidth) back();
  }, FADE_MS);
}
/* object-fit:cover 之下，把「圖上的一點」換算成「框上的百分比」。
   ⚠ cover 會把圖等比放大到蓋滿框，再從中央裁掉多出來的那一邊 ——
     所以圖上的 0.09 不等於框上的 0.09，直接拿來當 transform-origin 會偏。 */
function coverOrigin(el, p){
  const W=el.clientWidth, H=el.clientHeight;
  const nw=el.naturalWidth||1, nh=el.naturalHeight||1;
  if(!W||!H) return '50% 50%';
  const s=Math.max(W/nw, H/nh);                    // cover 的縮放
  const dw=nw*s, dh=nh*s;                          // 圖在框裡的實際大小
  const x=(p.x*dw-(dw-W)/2)/W, y=(p.y*dh-(dh-H)/2)/H;
  const cl=v=>Math.max(0,Math.min(1,v));
  return (cl(x)*100).toFixed(1)+'% '+(cl(y)*100).toFixed(1)+'%';
}

function applyPersist(line){
  if(line.bg!==undefined && line.bg!==stageBg){
    stageBg=line.bg;
    swapImg($('storyBg'), line.bg?imgSrc(line.bg):'');
    /* 立繪的色調跟著背景走一點點（見 modules/tone.js）。
       ⚠ 要等換圖跑完再量 —— swapImg 是先淡出、載好才換 src，太早量到的是舊圖。 */
    setTimeout(()=>matchPortraits($('storyBg'), $('storyCast')), 420);
  }
  let cgChanged=false;
  if(line.cg!==undefined && line.cg!==stageCg){
    cgChanged=true;
    stageCg=line.cg;
    const cgEl=$('storyCg');
    swapImg(cgEl, line.cg?CG_DIR+line.cg+'.webp':'');
    /* 進場的「對焦落定」效果（見 style.css 的 .settle）。跑完要**把 class 拿掉** ——
       同一個屬性只有一個 animation 生效，留著會把平移／推近蓋掉。 */
    if(cgEl && line.cg){
      cgEl.classList.remove('settle'); void cgEl.offsetWidth; cgEl.classList.add('settle');
      fxTimers.push(setTimeout(()=>cgEl.classList.remove('settle'), 700));
    }
  }
  if(line.ci!==undefined){ stageCi=line.ci; setImg($('storyCi'), line.ci?SI_DIR+line.ci+'.webp':''); }
  /* 情境卡：⚠ 它是**一次性的畫面狀態**（下一句沒寫就收掉），所以每一句都要判，
     不能只在有 card 的那一句處理。 */
  const card=$('storyCard'), bub=$('storyBubble');
  if(card){
    if(line.card){ card.textContent=line.card; card.classList.add('on'); }
    else card.classList.remove('on');
  }
  if(bub) bub.style.display = line.card ? 'none' : '';
  /* BGM：⚠ 同一首重複指定不會重播（playBgm 自己擋掉），所以每一句都寫也無妨；
     但照「只寫變化」的規矩，正常只在換曲那一句寫。 */
  if(line.bgm!==undefined && line.bgm!==stageBgm){
    stageBgm=line.bgm;
    try{
      if(line.bgm){ const src=BGM_SRC[line.bgm];
        if(src) SFX.playBgm(src, {fadeInMs:800, volume:0.62});
        else { const tag='bgm/'+line.bgm;
          if(!missingExpr.has(tag)){ missingExpr.add(tag); console.info('[story] 沒有這首 BGM：', line.bgm); } }
      }else SFX.stopBgm(900);
    }catch(_){}
  }
  /* 平移是**這一句**的效果，不沿用 —— 每次都要先拿掉再加，否則第二次不會重播
     （同一個 class 還在，animation 不會重新開始）。 */
  /* ── 平移 ────────────────────────────────────────────────────────
     ⚠⚠ **沒指定 cgPan 的句子不要碰平移**（Ray：「『你……！』的時候不要重置
       插圖平移」）。原本是每一句都先 `remove('pan-up','pan-down')` —— 平移要
       2.6 秒，而一句台詞常常一兩秒就被點過去，於是下一句一進來就把動畫掐掉，
       插圖「啪」一聲跳回原位。
     規則：
       · 這一句寫了 cgPan  → 重播那個方向（先移除再加，否則不會重新開始）
       · 這一句**換了圖**  → 清掉（新圖不該繼承舊圖的平移）
       · 其餘             → **不動**，讓它自己跑完
     ⚠ `cgPan:null` 是明確要求停下來，與「沒寫」不同。 */
  const cg=$('storyCg');
  if(cg){
    if(line.cgPan==='up' || line.cgPan==='down'){
      cg.classList.remove('pan-up','pan-down','zoom-in');
      void cg.offsetWidth;                       // 不重設 class，animation 不會重播
      cg.classList.add(line.cgPan==='up'?'pan-up':'pan-down');
    }else if(line.cgZoom){
      /* 以臉為中心緩慢推近。cgZoom 給的是**臉在圖上**的位置（0~1）——
         要換成**元素座標**的 transform-origin，因為 object-fit:cover 會把圖裁掉一圈，
         圖上的 0.09 不等於框上的 0.09。 */
      cg.classList.remove('pan-up','pan-down','zoom-in');
      const go=()=>{ cg.style.transformOrigin = coverOrigin(cg, line.cgZoom);
                     void cg.offsetWidth; cg.classList.add('zoom-in'); };
      if(cg.complete && cg.naturalWidth) go(); else cg.addEventListener('load', go, {once:true});
    }else if(line.cgPan===null || cgChanged){
      cg.classList.remove('pan-up','pan-down','zoom-in');
    }
  }
}
/* 音效：**逐支列出實際路徑**，不要用字串拼副檔名 —— 這個資料夾裡 wav/mp3/m4a
   三種都有，拼出來的路徑會靜默 404（audio.js 載不到只會 resolve(null)，不報錯）。 */
const SE_SRC={
  se_steps:         'resources/audio/se/se_steps.m4a',
  se_weapon_reload: 'resources/audio/se/se_weapon_reload.mp3',
  se_mg_squall:     'resources/audio/se/se_weapon_mg_squall.mp3',
  se_lunaMG:        'resources/audio/se/se_lunaMG.m4a',
  se_Fall:          'resources/audio/se/se_Fall.mp3',
  se_saintroar:     'resources/audio/se/Se_enemy_Saintroar.mp3',
};
function playSe(spec){
  const one=(n,delay)=>{ const src=SE_SRC[n];
    if(!src){ const tag='se/'+n;
      if(!missingExpr.has(tag)){ missingExpr.add(tag); console.info('[story] 沒有這個音效：', n); }
      return; }
    const go=()=>{ try{ SFX.play(src); }catch(_){} };
    if(delay>0) setTimeout(go, delay); else go(); };
  if(!spec) return;
  if(Array.isArray(spec)) spec.forEach(x=> typeof x==='string' ? one(x,0) : one(x.n, x.delay||0));
  else one(spec, 0);
}
/* 槍擊：**機關槍掃射**（Ray 指定）——沿著一條斜線由一端掃到另一端，火花大、
   持續兩秒。⚠ 不是「隨機灑點」：隨機讀起來是一片斑點，沿線推進才讀得出
   「掃過去」。線的角度每次隨機一點，不要每次都同一條。 */
/* 一次性演出的計時器（掃射的每一發、抖動的收尾）。
   ⚠ 要能**中途收掉**：玩家可以在演出跑完之前就點掉這一拍，殘留的抖動會跟著
     蓋到下一句上 —— 在會抖的畫面上讀字很難受。renderLine 一開頭就收一次。 */
let fxTimers = [];
function stopFx(){
  fxTimers.forEach(clearTimeout); fxTimers=[];
  const box=$('storyFx'); if(box) box.innerHTML='';
  const st=$('storyStage');
  if(st){ clearTimeout(st.__shakeT); st.classList.remove('shake','hold'); }
}
function fireHits(ms){
  const box=$('storyFx'); if(!box) return;
  box.innerHTML='';
  const W=box.clientWidth||360, H=box.clientHeight||640;
  const N=96;                                  // 兩秒內的發數（約 48 發/秒；Ray：「大量密集」）
  /* 掃射線：由左下往右上或反向，落在畫面中上段（插圖裡聖徒的位置）。 */
  const dir=Math.random()<0.5?1:-1;
  const x0=dir>0?W*0.14:W*0.86, x1=dir>0?W*0.86:W*0.14;
  const y0=H*0.60, y1=H*0.18;
  for(let i=0;i<N;i++){
    fxTimers.push(setTimeout(()=>{
      const u=i/(N-1);
      const d2=document.createElement('div'); d2.className='story-hit';
      /* 沿線推進，再加一點抖動 —— 完全在線上會像雷射，不像掃射。 */
      d2.style.left=Math.round(x0+(x1-x0)*u + (Math.random()-0.5)*W*0.13)+'px';
      d2.style.top =Math.round(y0+(y1-y0)*u + (Math.random()-0.5)*H*0.10)+'px';
      const sz=1.0+Math.random()*1.3;            // 火花大小有差才有能量感（Ray：「火花大一點」）
      d2.style.transform='scale('+sz.toFixed(2)+')';
      box.appendChild(d2);
      fxTimers.push(setTimeout(()=>d2.remove(), 320));
    }, Math.round(ms*i/N)));
  }
}
const GUNFIRE_MS = 2000;        // 掃射演出長度（Ray 指定：視覺持續兩秒）
function fireOneShot(line){
  if(line.se) playSe(line.se);
  /* ⚠ 抖動要**跟著演出的長度**（ver -327，Ray：「畫面抖動要連續直到射擊效果停止」）。
     單發 0.42 秒的抖法配上兩秒的掃射，會變成「槍還在打、畫面已經定住」。
     有掃射就抖滿掃射的長度（`.hold`＝無限循環），沒有就照舊抖一下。 */
  const hold = (line.fx==='gunfire') ? GUNFIRE_MS : 0;
  if(line.shake){
    const st=$('storyStage');
    if(st){
      st.classList.remove('shake','hold'); void st.offsetWidth;
      st.classList.add('shake'); if(hold) st.classList.add('hold');
      /* ⚠⚠ 動畫跑完要**把 class 拿掉**（ver -318 修）。留著的話那些場景層一旦
         重新顯示（插圖換圖是 display:none→block），animation 會**再跑一次** ——
         Ray 回報「最後一格不要抖」就是這個：抖的是上一句的 shake 殘留。 */
      clearTimeout(st.__shakeT);
      st.__shakeT=setTimeout(()=>st.classList.remove('shake','hold'), hold || 460);
      fxTimers.push(st.__shakeT);
    }
  }
  if(line.fx==='gunfire') fireHits(GUNFIRE_MS);
}

/* ══════════════════════════════════════════════════════════════════════
   Kerberos 之門（ver -329）
   ──────────────────────────────────────────────────────────────────────
   下半盤面區的門。進戰鬥時：
     由下往上升（clip 同時打開到全畫面）→ 撞頂震動 → 四箭彈開 →
     紋章浮起旋轉 180° → 門由中縫拉開，縫裡露出的**就是戰鬥畫面**。

   ⚠ 門與紋章是 **Ray 畫的分件**（ver -330 換上）：門本身就已經把紋章挖掉，
     不再是程式合成的凹槽。四支箭暫時仍由最早那張合成圖切 —— Ray 的 arm.png
     是自己的畫布尺寸，沒有對位資訊（見 tools/kerberos_cut.py 的說明）。
   ⚠ KERB_META 的數字由 tools/kerberos_cut.py 印出來，**改圖要重跑腳本再貼回來**。
   ⚠ 四支箭飛出去的是**複製品**，圓盤上的箭不會消失 —— 它們不是獨立零件
     （上下兩支是同一支十字架的兩端），挖掉會把紋章弄壞。理由記在那支腳本裡。 */
const KERB_DIR='resources/vfx/';
/* 幾何：由 tools/kerberos_cut.py 印出來的（門座標的比例）。**改圖要重跑腳本再貼回來。**
   ⚠ 箭與鉚釘給的是**中心點**與**未旋轉**的尺寸 —— CSS 的 rotate 是繞元素中心轉的，
     只要中心擺對，轉幾度都落在該落的地方。 */
const KERB_META={"w":853,"h":1844,"seam":0.506,
 "plate":{"x":0.18171,"y":0.05152,"w":0.63892,"h":0.30206},
 "top":{"ar":0.11159,"dip":0.11915},
 "arrows":{"n":{"cx":0.50117,"cy":0.09138,"w":0.07737,"h":0.10033,"rot":0,  "ux":0, "uy":-1},
           "e":{"cx":0.73632,"cy":0.20255,"w":0.07737,"h":0.10033,"rot":90, "ux":1, "uy":0},
           "s":{"cx":0.50117,"cy":0.31372,"w":0.07737,"h":0.10033,"rot":180,"ux":0, "uy":1},
           "w":{"cx":0.26602,"cy":0.20255,"w":0.07737,"h":0.10033,"rot":270,"ux":-1,"uy":0}},
 "rivets":{"r10":{"cx":0.24113,"cy":0.09834,"w":0.05393,"h":0.02657,"fx":1, "fy":1, "ux":-0.7558,"uy":-0.6548},
           "r2": {"cx":0.76121,"cy":0.09834,"w":0.05393,"h":0.02657,"fx":-1,"fy":1, "ux":0.7558, "uy":-0.6548},
           "r8": {"cx":0.24113,"cy":0.30676,"w":0.05393,"h":0.02657,"fx":1, "fy":-1,"ux":-0.7558,"uy":0.6548},
           "r4": {"cx":0.76121,"cy":0.30676,"w":0.05393,"h":0.02657,"fx":-1,"fy":-1,"ux":0.7558, "uy":0.6548}}};
const KERB_POP={ arrow:0.045, rivet:0.026 };   // 彈開距離，佔門寬的比例（箭 ver -336 由 0.016 加大）
const KERB_ARROWS=['n','e','s','w'];             // 箭：正四向
const KERB_RIVETS=['r10','r2','r4','r8'];        // 鉚釘：10/2/4/8 點鐘，依這個順序彈開
let kerbReady=false;

/* 幾何：門要多寬，是**解出來的**不是調出來的 ——
   兩個條件同時成立：①圓盤圓心落在下半面板正中 ②升到頂時蓋滿整個畫面。
     令 cy＝圓心佔門高的比例、AR＝門的高寬比
     門頂 = 面板中心y − cy·AR·Wd，要求 ≤ 面板頂 → Wd ≥ (面板高/2)/(cy·AR)
   再與「至少要有畫面那麼寬」取大的。上升距離就是門頂那個值（升完門頂貼齊 y=0）。
   ⚠ 每次開場與 resize 都要重算 —— 面板高吃 safe-area，寫死在瀏海機上會錯位。
   ⚠ 要在舞台已經 `.on` 之後才量，display:none 的元素量出來全是 0。 */
function layoutKerberos(){
  const st=$('storyStage'), kb=$('kerb'), dr=$('kerbDoor'), bd=$('storyBoard');
  if(!st || !kb || !dr || !bd) return;
  const R=st.getBoundingClientRect(), B=bd.getBoundingClientRect();
  const W=R.width, panelTop=B.top-R.top, panelH=B.height;
  if(!W || !panelH) return;
  const AR=KERB_META.h/KERB_META.w;
  const P=KERB_META.plate, cy=P.y+P.h/2;
  const Wd=Math.max(W, (panelH/2)/(cy*AR));
  const Hd=Wd*AR;
  const top=panelTop + panelH/2 - cy*Hd;
  const dx=(W-Wd)/2;
  dr.style.width=Wd+'px'; dr.style.height=Hd+'px';
  dr.style.left=dx+'px'; dr.style.top=top+'px';
  kb.style.setProperty('--kerb-rise', Math.max(0,top)+'px');
  kb.style.setProperty('--kerb-door', 'url("'+KERB_DIR+'kerberos_door.webp")');
  /* 開門時「左半扇＋圓盤」這個剛體要走多遠：兩者取大的 ——
       ① 左扇自己出畫面：半扇寬 ×1.04
       ② 圓盤的右緣也要出畫面（要算 lift 放大之後的，係數 1.14＝1.11 再留餘裕）
     ⚠ 用同一個 px 值餵給兩者，不能各自寫 %：% 相對**自己**的寬度，
       兩者寬度不同就會走不同距離、當場脫節。 */
  const pW=P.w*Wd, pCx=(P.x+P.w/2)*Wd+dx;
  kb.style.setProperty('--kerb-open-x', Math.max(Wd/2*1.04, pCx+pW/2*1.14)+'px');

  const pl=$('kerbPlate');
  if(pl){ pl.style.left=(P.x*Wd)+'px'; pl.style.top=(P.y*Hd)+'px'; pl.style.width=pW+'px'; }
  /* 箭與鉚釘：擺中心。⚠ 尺寸用**未旋轉**的寬高，旋轉交給 CSS 的 --kerb-rot。 */
  /* 擺件：中心對位 ＋ 外向彈開量。
     ⚠ 彈開量寫成**父座標系**的 px（--kerb-px/py）：鉚釘是鏡射擺的，
       若寫成 rotate 後的 translateY，下面兩顆會往內彈（見 style.css）。 */
  const put=(el,b,pop)=>{ if(!el) return;
    const w=b.w*Wd, h=b.h*Hd;
    el.style.width=w+'px'; el.style.height=h+'px';
    el.style.left=(b.cx*Wd-w/2)+'px'; el.style.top=(b.cy*Hd-h/2)+'px';
    if(b.rot!=null) el.style.setProperty('--kerb-rot', b.rot+'deg');
    if(b.fx!=null){ el.style.setProperty('--kerb-fx', b.fx); el.style.setProperty('--kerb-fy', b.fy); }
    const d=pop*Wd;
    el.style.setProperty('--kerb-px', (b.ux*d).toFixed(2)+'px');
    el.style.setProperty('--kerb-py', (b.uy*d).toFixed(2)+'px'); };
  for(const k of KERB_ARROWS) put(kb.querySelector('.kerb-arrow.'+k), KERB_META.arrows[k], KERB_POP.arrow);
  KERB_RIVETS.forEach((k,i)=>{
    const rv=kb.querySelector('.kerb-rivet.'+k);
    put(rv, KERB_META.rivets[k], KERB_POP.rivet);
    if(rv) rv.style.setProperty('--kerb-d', (i*90)+'ms');   // 依次，不是同時
  });
  /* 楣：橫跨整個畫面寬，**下緣貼齊門的上緣**（往下壓 1px 免得留一條髮絲縫）。 */
  /* 十字亮光：豎的沿門的中縫、橫的沿紋章的橫軸（＝箭的那一條線）。
     ⚠ 縫的位置吃 KERB_META.seam，不是寫死 50% —— 門的中縫實測在 0.506。 */
  const gl=$('kerbGlow');
  if(gl){
    const v=gl.querySelector('.kg-v'), h=gl.querySelector('.kg-h');
    const vw=Math.max(10, Wd*0.055), hh=Math.max(10, Hd*0.024);
    const axis=KERB_META.arrows.e.cy*Hd;                 // 橫軸＝左右兩支箭的中心線
    if(v){ v.style.left=(KERB_META.seam*Wd-vw/2)+'px'; v.style.top='0px';
           v.style.width=vw+'px'; v.style.height=Hd+'px'; }
    if(h){ h.style.left='0px'; h.style.top=(axis-hh/2)+'px';
           h.style.width=Wd+'px'; h.style.height=hh+'px'; }
    /* 環狀溢光：比圓盤大一圈（1.16），圓心對齊圓盤圓心。 */
    const rg=gl.querySelector('.kg-r');
    if(rg){ const P2=KERB_META.plate, d=P2.w*Wd*1.16;
      rg.style.width=d+'px'; rg.style.height=d+'px';
      rg.style.left=((P2.x+P2.w/2)*Wd-d/2)+'px';
      rg.style.top =((P2.y+P2.h/2)*Hd-d/2)+'px'; }
  }
  /* 楣：橫跨整個畫面寬。⚠ 對齊的是**中段的下緣**不是圖的下緣 ——
     兩端的鉚接塊比中間的橫桿低（dip＝差多少，佔圖高的比例），照圖的下緣對齊的話
     中間會露一條縫（Ray：「楣還是有縫…中間不要漏」）。往下壓 dip 之後兩端會
     壓進控制列裡 —— 楣的圖層在控制列之上（#kerb z2 > #storyBoard z1），看不出來。 */
  const tp=$('kerbTop');
  if(tp){
    const th=W*KERB_META.top.ar;
    tp.style.width=W+'px'; tp.style.height=th+'px';
    tp.style.left=(-dx)+'px'; tp.style.top=(1-th+th*KERB_META.top.dip)+'px';
    kb.style.setProperty('--kerb-top-h', th+'px');
    /* ⚠ 也寫到舞台上：對話框要拿它把底邊錨在楣的上緣（見 style.css 的 #storyBubble）。
       CSS 變數只往**子孫**繼承，寫在 #kerb 上對話框讀不到。 */
    st.style.setProperty('--kerb-top-h', th+'px');
  }
  if(!kerbReady){
    kerbReady=true;
    const src={ kerbPlate:'kerberos_plate', kerbTop:'kerberos_top' };
    for(const id in src){ const el=$(id); if(el) el.src=KERB_DIR+src[id]+'.webp'; }
    for(const k of KERB_ARROWS){ const a=kb.querySelector('.kerb-arrow.'+k); if(a) a.src=KERB_DIR+'kerberos_arrow.webp'; }
    for(const k of KERB_RIVETS){ const r=kb.querySelector('.kerb-rivet.'+k); if(r) r.src=KERB_DIR+'kerberos_rivet.webp'; }
  }
}

/* 鉚釘彈開處的煙（Ray 指定）。⚠ 掛在 #kerbSmoke（門的子元素）——
   煙要跟著門一起動，掛在舞台上的話門在升、煙站著不動。 */
function kerbPuff(el){
  const box=$('kerbSmoke'), dr=$('kerbDoor');
  if(!box || !el || !dr) return;
  const r=el.getBoundingClientRect(), d=dr.getBoundingClientRect();
  const cx=r.left-d.left+r.width/2, cy=r.top-d.top+r.height/2;
  for(let i=0;i<4;i++){
    const p=document.createElement('i');
    p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--sx', ((Math.random()*2-1)*26).toFixed(0)+'px');
    p.style.setProperty('--sy', (-14-Math.random()*30).toFixed(0)+'px');
    p.style.animationDelay=(i*45)+'ms';
    box.appendChild(p);
    fxTimers.push(setTimeout(()=>p.remove(), 900+i*45));
  }
}

/* 演出。onGap 在門要拉開之前呼叫（讓底下先開戰），onDone 在門全開之後。
   ⚠ 音效還沒有素材（Ray：先不配音）。每一拍的接點留在 KERB_SFX，填路徑就會響。 */
/* ── 音效（ver -336）────────────────────────────────────────────────
   ⚠⚠ 這三支的**時間點是由音檔本身反推的**，不是隨便對齊動畫起點：
     · pop  2.088 秒，撞擊峰值在 **1.002 秒** → 從演出一開始就播，
       並把「上推」的長度定成 1000ms，讓門撞到頂的那一瞬正好是撞擊音
       （Ray：「以槍棺撞頂的那一瞬為撞擊音回推播放時間」）。
     · gear 6.864 秒，遠長於圓盤旋轉 → 旋轉開始播、**旋轉結束就收掉**
       （Ray：「以圓盤轉動開始，停轉結束」）。收要斜降，直接停會有一聲喀，
       所以走 SFX.playCue 的把手。旋轉也拉長到 1600ms，多聽到一點齒輪。
     · open 2.376 秒、可聞段收在 **1.921 秒** → 從「門全開的時刻」往回推
       1921ms 開始播（Ray：「以槍棺全開為結束，回推播放時間，可與 gear 重疊」）。
   ⚠ 換音檔要**重量這三個數字**（工具：瀏覽器 decodeAudioData 後找峰值與首尾過門檻點）。 */
const KERB_SE_DIR='resources/audio/se/';
const KERB_SFX={ pop:'se_Kerberos_pop', gear:'se_Kerberos_gear',
                 open:'se_Kerberos_open', steam:'se_Kerberos_steam' };
const KERB_SFX_EXT={ steam:'m4a' };   // 預設 mp3，例外寫這裡（ver -338 起 wav 一律轉 m4a）
const KERB_SE_T={ popPeak:1002, openTail:1921 };
const KERB_T={ rise:1000, thud:420, rivet:460, arrow:340, lift:1600, open:900 };
let kerbTimers=[];
let kerbPlaying=false;   // 演出期間鎖住點擊推進（不然一點就跳到下一句，門還開著）
let kerbGear=null;       // 齒輪聲的把手（演出中止時要收掉，見 stopKerberos）
function stopKerberos(){
  kerbPlaying=false;
  if(kerbGear){ try{ kerbGear.stop(120); }catch(e){} kerbGear=null; }
  kerbTimers.forEach(clearTimeout); kerbTimers=[];
  const kb=$('kerb'), st=$('storyStage'), sm=$('kerbSmoke');
  if(kb) kb.classList.remove('rise','full','unlock','lift','open','glow');
  if(sm) sm.innerHTML='';
  if(st) st.classList.remove('kerb-open');
}
function playKerberos(onGap, onDone){
  const kb=$('kerb'), st=$('storyStage');
  if(!kb || !st){ onGap&&onGap(); onDone&&onDone(); return; }
  stopKerberos(); layoutKerberos();
  kerbPlaying=true;
  const at=(ms,fn)=>kerbTimers.push(setTimeout(fn,ms));
  const src=k=>KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'mp3');
  const se=k=>{ try{ SFX.play(src(k), 1); }catch(e){} };
  let t=0;
  /* ① 撞擊音：立刻播，撞擊峰值（1002ms）正好落在門撞頂那一瞬（rise 也是 1000ms）。 */
  se('pop');
  kb.classList.add('rise','full');                       // ① 槍棺上推（楣跟著走）
  t+=KERB_T.rise;
  at(t,()=>{                                             // ② 撞頂：震動＋門縫透出十字亮光
    st.classList.remove('shake','hold'); void st.offsetWidth; st.classList.add('shake');
    kerbTimers.push(setTimeout(()=>st.classList.remove('shake'), KERB_T.thud));
    kb.classList.remove('glow'); void kb.offsetWidth; kb.classList.add('glow');
    /* 齒輪聲**從撞頂就開始**（Ray 指定）——機關是撞到頂才被頂開的，
       聲音比畫面早一步起來才像「裡面的東西動起來了」。收在旋轉結束（見下）。 */
    try{ kerbGear = SFX.playCue(src('gear'), 1); }catch(e){ kerbGear=null; }
  });
  t+=200;
  at(t,()=>{                                             // ③ 解鎖：四向鉚釘依次彈開＋冒煙，箭微幅外推
    se('arrow'); kb.classList.add('unlock');
    KERB_RIVETS.forEach((k,i)=>kerbTimers.push(setTimeout(()=>{
      if(i===0) se('steam');        // 噴氣聲只在**第一顆**跳開時（Ray 指定），四顆各播會糊成一片
      kerbPuff(kb.querySelector('.kerb-rivet.'+k));
    }, i*90)));
  });
  t+=KERB_T.rivet + 90*3;
  /* ④ 圓盤浮起＋旋轉 180°（圓心不動）。齒輪聲跟著轉動起訖 —— 素材 6.9 秒，
     不收的話門都開完了還在轉，所以用 playCue 拿把手，轉完斜降收掉。 */
  at(t,()=>{ kb.classList.add('lift'); });
  t+=KERB_T.lift;
  at(t,()=>{ if(kerbGear){ kerbGear.stop(220); kerbGear=null; } });
  at(t,()=>{                                             // ⑤ 讓出舞台 → 底下開戰
    st.classList.add('kerb-open');
    onGap&&onGap();
  });
  t+=260;                                                // 給底下一拍把畫面建起來
  const openAt = t;
  at(t,()=>{ kb.classList.add('open'); });               // ⑥ 開門
  /* 開門音：可聞段收在 1921ms，要讓它**結束在門全開的那一刻** → 往回推。
     推出來的時間點通常落在旋轉那一段，與齒輪重疊 —— Ray 說可以重疊。
     ⚠ 夾在 0 以上：畫面時序若被縮短到比音檔還短，就從頭播（寧可提前，不要不播）。 */
  at(Math.max(0, openAt + KERB_T.open - KERB_SE_T.openTail), ()=>se('open'));
  t+=KERB_T.open;
  at(t,()=>{ onDone&&onDone(); });
}

/* ══ 演一句 ══ */
function renderLine(){
  const line = cur.lines[lineIdx];
  if(!line) return;
  stopFx();   // 上一拍的演出（掃射／持續抖動）到此為止，別讓它蓋到這一句上

  /* ── 插入戰鬥（ver -321）───────────────────────────────────────────
     ⚠ story.js **不 import 戰鬥模組**（單向資料流：劇情不該知道戰鬥怎麼跑）。
       改由 main.js 用 setBattleHandler 注入一支發動函式，並負責在戰鬥結束、
       回到首頁時把劇情從 `resume` 這個位置接回去。
     ⚠ 交棒前要先把舞台收掉，否則劇情層（z-index 8300）會蓋住戰鬥畫面。
     ⚠ 收掉時**不要接回首頁 BGM** —— 戰鬥有自己的曲子，接回去會打架。 */
  /* 讀取頁：`{ load:'sceneId' }` —— 擋畫面把那個場景的素材抓完再往下演。
     ⚠ 它自己會 advance()，所以這裡直接 return，不要再走下面的演出流程。 */
  if(line.load){ runLoadGate(line.load); return; }

  if(line.battle){
    if(!battleHandler){
      console.info('[story] 沒有註冊戰鬥發動器，跳過：', line.battle);
      return advance();
    }
    const resume = { scene: cur.sceneId, line: lineIdx+1 };
    const id = line.battle;
    /* Kerberos 之門（ver -329）：門開的**縫裡露出的就是戰鬥畫面**，所以順序反過來 ——
       先讓底下開戰（onGap），門才拉開；門全開之後才把劇情層收掉。
       ⚠ 舊寫法是「先 close 再交棒」，那樣門一開只會露出黑幕。
       ⚠ close 一定要等門全開（onDone）—— 提早收掉的話門會憑空消失。 */
    playKerberos(()=>battleHandler(id, resume),
                 ()=>close({ keepBgm:true }));
    return;
  }

  applyPersist(line);
  fireOneShot(line);

  const who = (line.portrait && line.portrait.char) || line.speaker;
  const p   = line.portrait || {};

  /* 只寫變化的部分：省略 ＝ 沿用上一狀態。 */
  const prev = shown[who] || {};
  const st   = { expr: (p.expr!==undefined ? p.expr : prev.expr),
                 show: (p.show!==undefined ? p.show : (prev.show!==undefined ? prev.show : true)) };
  shown[who] = st;

  /* 請人下台。⚠ 要在 ensureOn 之前做：同側換人時先清掉舊的，
     新的才會走「首次上場滑入」而不是「輪轉換卡」。 */
  if(line.hide){
    for(const id of [].concat(line.hide)){
      const a3=artOf(id); if(!a3) continue;
      const s3=a3.side||'L';
      if(slot[s3]===id) leaveSlot(s3);
      if(shown[id]) shown[id].show=false;
    }
  }

  let side = null;
  /* ⚠ 沒有立繪資料的角色（UNKNOWN／LUNARIA）整段跳過 —— 不上場也不下場，
     台上原本站著的人維持原樣。 */
  if(artOf(who)){
    if(st.show) side = ensureOn(who, st.expr);
    else { const a2=artOf(who), s2=(a2&&a2.side)||'L'; if(slot[s2]===who) leaveSlot(s2); }
  }

  /* 高亮跟著 speaker 走（speaker 與畫面上的人可以不同）。 */
  /* ⚠ 說話者沒有立繪時**誰都不亮**（傳 null）—— 台上的人不是在講話，
     照原本的邏輯會誤把左邊那位當成說話者點亮。 */
  const spA=artOf(line.speaker);
  if(!spA) highlight(null);
  else { const spSide=spA.side||'L'; highlight(slot[spSide]===line.speaker ? spSide : side); }

  /* CG／背景／CI 由 applyPersist 處理（上面），這裡不再重複。 */

  /* 暗調：套在**這一句說話者**的立繪上。⚠ 每一句都要清一次 —— 它是句子屬性
     不是角色屬性，不清的話下一句她還是黑的。 */
  for(const s2 of ['L','R']){ const el=slotEl(s2); if(el) el.classList.remove('dark'); }
  if(line.dark && side){ const el=slotEl(side); if(el) el.classList.add('dark'); }

  const nm=$('storyName'), tx=$('storyText');
  if(nm) nm.textContent = nameOf(line.speaker);
  /* ⚠ delay：對話框**先不出**，等演出（平移／滑入）跑完再打字（Ray 指定）。
     ⚠ 等待中點畫面要能**跳過等待**而不是直接推到下一句 —— 不然玩家會覺得
       「點了沒反應」然後連點兩下，一次跳掉兩句。 */
  const bub2=$('storyBubble');
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT);  autoT=null;
  /* ⚠ **空台詞不出對話框**（ver -327，Ray：「插圖002出來的時候不要先出空白的
     諾薇兒對話框」）。那一拍是演出（咆哮／掃射），不是對白 —— 掛一個只有名字的
     空框在畫面上，讀起來像「她有話要說但沒說出來」。 */
  if(!line.text){
    if(bub2) bub2.style.visibility='hidden';
    if(tx) tx.textContent='';
    /* auto：這一拍**自己走完**，不等玩家點（Ray：「對話框在播放完
       Se_enemy_Saintroar 後與立繪一同出現」）。
       ⚠ 只給**沒有台詞**的演出拍用 —— 有台詞的一律點擊推進（CLAUDE.md §6.5
         「不自動跳拍」）。玩家想快轉照樣可以點，點了就提前推進。 */
    if(line.auto>0) autoT=setTimeout(()=>{ autoT=null; advance(); }, line.auto);
    return;
  }
  if(line.delay>0){
    if(bub2) bub2.style.visibility='hidden';
    waitT=setTimeout(()=>{ waitT=null;
      if(bub2) bub2.style.visibility='';
      if(tx) typeOut(tx, line.text); }, line.delay);
  }else{
    if(bub2) bub2.style.visibility='';
    if(tx) typeOut(tx, line.text);
  }
}

/* ══ 推進 ══ */
function advance(){
  if(kerbPlaying) return;            // Kerberos 之門演出中：點擊無效（不然會跳過整段演出）
  const line = cur && cur.lines[lineIdx];
  const tx = $('storyText');
  clearTimeout(autoT); autoT=null;   // 玩家點了 → 演出拍提前收，別讓計時器再推一次
  /* 還在等 delay → 這一下先把對話框叫出來，不推進（同「還在打字」的規矩）。 */
  if(waitT){
    clearTimeout(waitT); waitT=null;
    const b=$('storyBubble'); if(b) b.style.visibility='';
    if(tx && line) typeOut(tx, line.text);
    return;
  }
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
  slot={L:null,R:null}; slotExpr={L:null,R:null}; shown={};
  leaveSlot('L'); leaveSlot('R');
  renderLine();
}

/* ══ 對外 ══ */
export function isActive(){ return active; }
/* 存檔要帶的劇情位置。 */
export function getPosition(){ return active && cur ? { scene:cur.sceneId, line:lineIdx } : null; }

/* ⚠ 每次**進劇情**都要把舞台清乾淨（ver -316 修）。
   Bug：第二次點 story 會卡在上一次的結束畫面 —— 因為 stageBg/stageCg/stageCi
   是模組級狀態，關閉時沒清；重開時第一句只寫了 bg，沒寫 cg，於是上一輪最後
   那張插圖就一直蓋在上面。
   ⚠ 清除要放在 **open** 不是 playScene：scene 之間是**接續**的，bg 要能跨場沿用，
     每次 playScene 都清的話換場就會閃一下黑。 */
function resetStage(){
  stageBg=stageCg=stageCi=null; stageBgm=null;
  for(const id of ['storyBg','storyCg','storyCi']){
    const el=$(id); if(el){ el.classList.remove('on','fading','pan-up'); el.removeAttribute('src'); }
  }
  const fx=$('storyFx'); if(fx) fx.innerHTML='';
  const card=$('storyCard'); if(card) card.classList.remove('on');
  const st2=$('storyStage'); if(st2) st2.classList.remove('shake','hold');
  slot={L:null,R:null}; slotExpr={L:null,R:null}; shown={};
  for(const s2 of ['L','R']){ const el=slotEl(s2);
    if(el){ el.classList.remove('on','dim','fading'); el.removeAttribute('src'); } }
}

/* ══ 預載（ver -321，Ray：「story 也要放預載頁，story 相關內容在那一頁預載」）══
   ⚠ **不併進遊戲開機的那個預載**：劇情素材是插圖與背景，一張就上百 KB，
     全部塞進開機會把首頁的等待拉長，而大部分玩家點進去是要出陣不是看劇情。
     改成「點 story → 自己的預載頁 → 播」，代價只落在真的要看劇情的人身上。
   ⚠ 走**整條 scene 鏈**掃，不是只掃第一段 —— 中途才換的插圖若沒先抓，
     切過去那一刻會是空白（圖是 display:block 之後才開始下載）。 */
function collectAssets(startId){
  const imgs=new Set(), bgms=new Set(), ses=new Set();
  const seen=new Set();
  let id=startId;
  while(id && MAIN_SCRIPT[id] && !seen.has(id)){
    seen.add(id);
    const sc=MAIN_SCRIPT[id];
    for(const ln of (sc.lines||[])){
      if(ln.bg) imgs.add(imgSrc(ln.bg));
      if(ln.cg) imgs.add(CG_DIR+ln.cg+'.webp');
      if(ln.ci) imgs.add(SI_DIR+ln.ci+'.webp');
      if(ln.bgm && BGM_SRC[ln.bgm]) bgms.add(BGM_SRC[ln.bgm]);
      for(const n of [].concat(ln.se||[])){ const k=(typeof n==='string')?n:n.n;
        if(SE_SRC[k]) ses.add(SE_SRC[k]); }
      /* 立繪：說話者與被指定的角色都要（含表情差分）。 */
      for(const who of [ln.speaker, ln.portrait&&ln.portrait.char].filter(Boolean)){
        const sp=SPEAKERS[who]; if(!sp||!sp.art) continue;
        const art=ART[sp.art]; if(!art) continue;
        imgs.add(art.base);
        const es=exprSrc(art, ln.portrait&&ln.portrait.expr);
        if(es) imgs.add(es);
      }
    }
    id=sc.next;
  }
  return { imgs:[...imgs], bgms:[...bgms], ses:[...ses] };
}
/* 預載：整條 scene 鏈要用到的圖／音效／音樂，**載完（且解碼完）才開演**。
   ⚠⚠ 圖要 `decode()` 不能只等 `onload`（ver -327）。`onload` 只代表**下載完**，
     1024×1536 的 webp 真正解碼是在第一次要畫的時候 —— 那一刻剛好是立繪滑入／
     插圖切換，於是第一格會頓一下或空一拍。`decode()` 把解碼也搬到預載頁裡做完。
   ⚠ SE 走 `SFX.preload`（解到 AudioBuffer）、BGM 走 `preloadBgm`（抓成 blob），
     兩者都是真的把資料吃進來，不是只發個請求。
   ⚠ 保底時間拉到 25 秒（原本 8 秒）：Ray 要的是「載完才開始」，8 秒在慢網下
     常常是「還沒載完就開演」。但完全不設上限的話，一個卡住的請求會把人鎖在
     預載頁 —— 所以保留上限，只是拉到不會誤觸的長度。
   ⚠ 每一張圖的 promise 都不會 reject（onerror 也 resolve）：**缺一張圖不該擋住整場**。 */
const PRELOAD_CAP_MS = 25000;
function preloadStory(startId, onProgress){
  const A=collectAssets(startId);
  /* ⚠ 門的素材也要預載：它是**進戰鬥那一刻**才動起來的，沒先抓的話升上去是一片空白。 */
  for(const f of ['kerberos_door','kerberos_plate','kerberos_arrow','kerberos_rivet','kerberos_top'])
    A.imgs.push(KERB_DIR+f+'.webp');
  /* ⚠ 門的三支音效也要預載：撞擊音在演出**第 0 毫秒**就要響，
     現抓的話一定遲到（audio.js 的 LATE_PLAY_MS 是 1.5 秒，遲到就乾脆不播）。 */
  for(const k in KERB_SFX) A.ses.push(KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'mp3'));
  const jobs=[];
  for(const src of A.imgs) jobs.push(new Promise(res=>{
    const im=new Image();
    const fin=()=>res();
    im.onerror=fin;
    im.onload=()=>{ (im.decode ? im.decode() : Promise.resolve()).then(fin, fin); };
    im.src=src;
  }));
  jobs.push(SFX.preload(A.ses).catch(()=>{}));
  jobs.push(SFX.preloadBgm(A.bgms).catch(()=>{}));
  let done=0; const total=jobs.length;
  const wrapped=jobs.map(p=>Promise.resolve(p).then(()=>{ done++; onProgress(done/total); }));
  return Promise.race([Promise.all(wrapped), new Promise(r=>setTimeout(r,PRELOAD_CAP_MS))]);
}

/* ══ 場景之間的「標準讀取頁」（ver -338，Ray 指定）══════════════════════
   與開機那一頁**同一個外觀**（同 id、同 CSS）：金色進度圈 ＋ 百分比 ＋ SAINT INSTALL。
   用途是把**下一個場景**的素材先抓完再演，插在哪由腳本決定（line 的 `load` 欄位）。

   ⚠ 為什麼直接重建同 id 的元素、而不是把開機那一顆留著：開機那顆在揭幕後就被
     main.js 移除了（它掛著語言鈕與提示輪播，留著會一直吃資源）。這裡要的只是外觀，
     重建一顆最單純 —— CSS 已經在 style.css 裡，不必再寫一份。
   ⚠ 不掛語言鈕與提示輪播：那些是開機頁的職責，這裡是**場景之間的過場**，
     停留通常一兩秒，掛上去只會閃一下。
   ⚠ 進度圈的周長 301.59 與 main.js 的 RING_C 是同一個數字（r=48 的 viewBox 100）。
     改一邊要改兩邊 —— 它是 SVG 幾何，不是設定值。 */
const AL_RING_C = 301.59;
function showLoader(){
  let ov=document.getElementById('assetLoader');
  if(!ov){
    ov=document.createElement('div'); ov.id='assetLoader';
    ov.innerHTML='<div id="alRing">'
      + '<svg viewBox="0 0 100 100"><circle class="al-rail" cx="50" cy="50" r="48"/>'
      + '<circle id="alRingProg" class="al-prog" cx="50" cy="50" r="48" stroke-dasharray="'+AL_RING_C+'" stroke-dashoffset="'+AL_RING_C+'"/></svg>'
      + '<div id="alRingTxt"><div id="assetLoaderPct">0%</div><div id="alRingCap">SAINT INSTALL</div></div>'
      + '</div>';
    document.body.appendChild(ov);
  }
  ov.classList.remove('al-done');
  return {
    set(p){
      const pr=document.getElementById('alRingProg'), pc=document.getElementById('assetLoaderPct');
      if(pr) pr.style.strokeDashoffset=(AL_RING_C*(1-p)).toFixed(1);
      if(pc) pc.textContent=Math.round(p*100)+'%';
    },
    close(){ if(ov && ov.parentNode) ov.parentNode.removeChild(ov); }
  };
}

/* 演到 `{ load:'sceneId' }` 這一行：擋上標準讀取頁，把那個場景的素材抓完再往下走。
   ⚠ 停留有**下限 600ms**：快取全中時只要一百多毫秒，閃一下讀起來像破圖不像在載入
     （同 ver -327 劇情預載頁的理由）。 */
function runLoadGate(sceneId){
  const ui=showLoader();
  const t0=Date.now();
  preloadStory(sceneId, p=>ui.set(p)).then(()=>{
    ui.set(1);
    setTimeout(()=>{ ui.close(); advance(); }, Math.max(0, 600-(Date.now()-t0)));
  });
}

export function open(pos, done){
  const st=$('storyStage'); if(!st) return;
  resetStage();
  stopKerberos();                       // 上一場的門要歸位（不然這次一進來門就是開的）
  onExit = done || null;
  active = true;
  st.classList.add('on');
  document.body.classList.add('story-on');
  SFX.unlock();
  const id = (pos && pos.scene && MAIN_SCRIPT[pos.scene]) ? pos.scene : MAIN_ENTRY;
  /* 預載頁：先擋著，載完才開演。⚠ 從戰鬥接回來（pos.line>0）時不再擋一次 ——
     那些圖上一輪已經抓過了，再擋一次只是多一個黑畫面。 */
  const ld=$('storyLoad');
  const go=()=>{
    if(ld) ld.classList.remove('on');
    layoutKerberos();     // ⚠ 要在舞台已經 .on 之後量 —— display:none 的元素量出來全是 0
    playScene(id);
    if(pos && pos.line>0 && cur){
      /* ⚠⚠ 續播位置**可能剛好等於該段的長度**（ver -322 修）。
         戰鬥若是一段的最後一句，resume 就是 `lines.length` —— 舊寫法用
         `pos.line < cur.lines.length` 擋掉，於是條件不成立、停在第 0 句
         ＝**打完教學回到故事開頭**（Ray 回報）。
         正解是「超出就走 next 接下一段」，那本來就是 endScene 的行為。 */
      if(pos.line < cur.lines.length){ lineIdx=pos.line; renderLine(); }
      else { lineIdx = cur.lines.length; endScene(); }
    }
  };
  if(pos && pos.line>0){ go(); return; }
  if(ld){
    ld.classList.add('on');
    const bar=$('storyLoadBar');
    /* ⚠ 最短顯示 500ms：快取全中的時候預載只要一百多毫秒，畫面會「閃一下」——
       那讀起來像破圖，不像在載入。壓一個下限讓它看起來是完整的一拍。 */
    const t0=Date.now();
    preloadStory(id, p=>{ if(bar) bar.style.width=Math.round(p*100)+'%'; })
      .then(()=>{ if(bar) bar.style.width='100%';
                  setTimeout(go, Math.max(0, 500-(Date.now()-t0))); });
  }else go();
}

/* main.js 注入戰鬥發動器：fn(battleId, resumePos)。
   ⚠ 回來時由 main.js 呼叫 `open(resumePos)` 續播 —— story 自己不知道戰鬥何時結束。 */
export function setBattleHandler(fn){ battleHandler = fn || null; }

export function close(opts){
  clearInterval(typing); typing=null;
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT); autoT=null;   // ⚠ 沒清的話劇情關掉之後還會推一句（然後在關著的舞台上演）
  const b0=$('storyBubble'); if(b0) b0.style.visibility='';
  active=false; cur=null;
  stopKerberos();
  const st=$('storyStage'); if(st) st.classList.remove('on');
  document.body.classList.remove('story-on');
  leaveSlot('L'); leaveSlot('R');
  /* ⚠ 劇情有自己的 BGM，離場一定要把主畫面那首接回來 —— 不接的話回到首頁
     還在放劇情曲，而首頁的播放邏輯只在「進首頁」那一刻跑一次，不會自己修正。 */
  stageBgm=null;
  /* ⚠ 交棒給戰鬥時**不要**接回首頁 BGM（keepBgm）—— 戰鬥有自己的曲子。 */
  if(!(opts && opts.keepBgm)){
    try{ SFX.playBgm(HOME_BGM, {fadeInMs:600, volume:HOME_VOL}); }catch(_){}
  }
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
  window.addEventListener('resize', ()=>{ if(active){ layout(); layoutKerberos(); } });
}

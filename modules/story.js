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

import { GAME_CONFIG, fileGain } from '../config.js';   // 舞台幾何常數（castStage）與逐支音量（fileGain）：鐵律 7 的單一真相
import { MAIN_SCRIPT, MAIN_ENTRY } from '../script/mainScript.js';
import { SPEAKERS, ART, CAST_TALL, nameOf, artOf, exprSrc, frameOf } from '../script/speakers.js';
import * as prog from '../script/progress.js';
import { decorateLine } from '../i18n.js';
import { SFX } from '../audio.js';
import { matchPortraits } from './tone.js';
/* 立繪的色調要跟著**玩家現在看到的那一層**走（ver -631）：有插圖時插圖就是場景，
   沒有才是背景。⚠ 只有這一支在決定「背後是什麼」（鐵律 8）—— 三個呼叫點都問它。 */
import * as settings from './settings.js';   // 選單（音量／自動播放速度）；葉節點，只依賴 audio
import * as hap from './haptics.js';        // 震動（ver -398）
import * as clock from '../script/clock.js';   // 時段（插圖／背景的差分候選鏈，ver -427）
import * as inv from '../script/inventory.js';  // 選項的挑戰費（ver -655）：葉節點，只依賴 config

const $ = id => document.getElementById(id);

/* ── 舞台幾何 ──
   CAST_SHOW：最高的人露出身體的幾成。**這是「立繪多大」的唯一旋鈕**，
   值越小＝鏡頭越近＝立繪越大（與 flight 同義同值）。 */
/* 「最高的人露出身體的幾成」—— **越小＝鏡頭越近＝人越大、露出的身體越少**。
   （飛行頁的對照：0.62＝頭到大腿、0.48＝頭到腰。） */
const CAST_SHOW = 0.56;
/* （CAST_SHOW_MAX 已拆，ver -495 清死碼：它是「依人數等比縮小」的膝部底線，
   而那套縮放 ver -320 就整個移除了 —— §6.5「同一張立繪＝同一個結果」。） */
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

/* ══ 面盤上的三種手勢與兩種模式（ver -367，Ray 指定）══
     按住下拉 → `fastMode`：打字加速 ＋ 自動點擊（放開就停）
     往右滑   → `autoPlay`：唸完自動推進（再滑一次關掉）
     往左滑   → 開啟「本場已播腳本」
   ⚠ 三者都掛在**面盤**（`--story-top` 之下那一塊）上，上半的場景區照舊是
     「點一下推一句」—— 手勢與推進共用同一個 `#storyTouch`，靠**起點在哪**分流。
   ⚠ 換場（`playScene`）要把兩個模式都關掉：模式是「玩家現在的操作意圖」，
     不是劇本狀態，跨場沿用會變成下一幕自己跑起來。 */
let fastMode=false, autoPlay=false, autoT2=null;
let sceneLog=[];               // 本場已播的台詞（回顧用）：{name, text}

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
/* ⚠⚠ 相機**連頂線一起**快取（ver -350）。ver -346 只快取了 pxCm，但頂線
   `topLine()` 是每次都去量退出鈕的實際位置 —— 而 iOS 的 `env(safe-area-inset-top)`
   會隨網址列收合而變（47px ↔ 0），鈕跟著動，頂線就跟著動。尺寸沒變、**整個人上下跳**，
   讀起來還是「忽大忽小」（§6.5 早就記過：位移會被讀成縮放）。
   規則：一場之內取景是**常數**，寬度變了（轉向）才重量。 */
let cam = { w:0, h:0, px:0, top:0, head:0 };
function resetCamera(){ cam = { w:0, h:0, px:0, top:0, head:0 }; }
function camGeom(H, W){
  if(cam.px && cam.w===W && cam.h && Math.abs(H-cam.h)/cam.h < 0.18) return cam;
  const t = topLines();
  cam = { w:W, h:H, top:t.camTop, head:t.headTop,
          px:(H-t.camTop)/(CAST_SHOW*CAST_TALL) };
  return cam;
}
function layout(){
  const stage=$('storyStage'); if(!stage) return;
  /* ⚠ 高度取**立繪區**（#storyCast）而不是整個舞台（ver -316）：下半是固定的
     戰鬥盤面，拿整個舞台高去算的話人會被畫到盤面底下，而且「腳落地平線」
     那條規則會落在錯的地方。 */
  const cast=$('storyCast');
  const W=stage.clientWidth;
  /* ⚠ 相機的分母用**視口高 × 56%**，不是 `#storyCast` 的即時高度（ver -355，
     照飛行畫面那一套：一個 rect 都不逐句量）。兩者在靜止時相等，但元素的高度會在
     轉場／網址列收合時被抓到中間值，那一瞬的值又被快取一整場。 */
  const VH = window.innerHeight || document.documentElement.clientHeight || 0;
  const H  = VH * STAGE().topRatio;         // 單一真相：config.castStage（見鐵律 7）
  if(!W || !H) return;
  const g=camGeom(H, W);
  const top=g.head;          // 頭頂落點（相機頂線是 g.top，只給 pxCm 用）

  /* 最高的人定義相機：頭頂貼頂線、身體露出 CAST_SHOW。
     ⚠⚠ 相機要**快取**（ver -346，與 modules/tutorial.js 同一個修法）：手機瀏覽器的
       工具列收合會讓 `#storyCast` 的高度變幾十像素，而這裡是**每一句**重算的 ——
       同一張立繪在相鄰兩句之間就會忽大忽小。寬度沒變、高度變化 18% 以內一律沿用；
       真的轉向（寬度變）或版面大改才重量。 */
  let pxCm = g.px;

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
    /* ══⚠⚠ **換到非預設那一側 → 水平翻轉**（ver -625，Ray：「諾薇兒跟索拉娜
       左右是對稱的，可以水平翻轉；蕾娜原則右，碰到安雅就放左，因為蕾娜整體框細，
       受左右影響小」）══
       §6.5 說「立繪朝向是畫死的」—— 所以**翻不翻是這張畫的性質**，
       寫在角色上（`ART[key].mirror`），預設不翻。判定只有這一處（鐵律 8）。
       ⚠ 翻轉之後**臉也跟著跑到鏡像的位置**：原本在圖左 `fx` 的臉，翻完落在 `1-fx`。
         不改的話翻轉會把臉整個推到框外（錨的永遠是臉，不是圖框）。
       ⚠ 只有「可以翻的人」才翻；不能翻的人（蕾娜）換邊就是換邊，
         她的框細，左右對她的影響本來就小。 */
    const mir = !!(a.mirror && a.side && o.side && o.side !== a.side);
    el.classList.toggle('mirrored', mir);
    /* ⚠⚠ `fxShift` ＝**這個角色整個往左右挪一點**（ver -645）：加在角色層，
       所以他的每一張差分一起移，而 `fx` 永遠保持**實測值**（見 speakers.js）。
       ⚠ **正數往左、負數往右**（`fx` 越大＝臉在圖上越右＝圖被推得越左）。
       ⚠ 加在**鏡射之後**：這樣「往右」在翻轉與否之下都是同一個螢幕方向。
       ⚠ 它與 `fx` 是兩件事，不要合成一個數字 —— 合了就分不出「量到的」與
         「手調的」，下次重量那張圖會把手調一起洗掉。 */
    const x = faceX - o.s*((mir ? 1-fx : fx) + (a.fxShift||0))*NW;
    el.style.width  = (o.s*el.naturalWidth)+'px';
    el.style.height = (o.s*el.naturalHeight)+'px';
    el.style.left   = x+'px';
    el.style.top    = (o.yTop+shift)+'px';
  }
}

/* 頂線：**由退出鈕的實際位置量出來**，不寫死 —— 那顆鈕吃 safe-area，
   寫死在瀏海機上一定會撞到（作法同 flight 的 castMeasure 量 HUD）。 */
/* ⚠⚠ **相機的頂線**與**頭頂的落點**是兩件事（ver -352，與 tutorial.js 的 -350 同一個修法）：
     camTop  ＝ 算 pxCm 用的取景上緣（退出鈕的**下緣**再留 4px）—— 不動它，
               CAST_SHOW 是對著這個框調出來的，一改整個人就變大變小。
     headTop ＝ 頭頂真正擺哪，改夾退出鈕的**上緣**（Ray：「手機的對話人物太低，
               再往上一個臉的高度」）。鈕高 44px，正好是一個臉。
   ⚠ 手機上這一條特別有感：`#storyExit` 是 `top: env(safe-area-inset-top) + 10px`，
     瀏海機上鈕的下緣落在 ~101px（桌機 ~58px）—— 夾下緣等於把瀏海高度**再讓一次**。
     要閃開的是瀏海本身，鈕的上緣就是安全線。 */
/* ⚠⚠ **不要量那顆鈕的即時 rect**（ver -354）。量到的值取決於「第一次排版剛好發生在
     哪一刻」—— 鈕若正好被藏起來（`kerb-open` 期間、結算 banner 開著時）或版面還在轉場，
     `br.height` 是 0，整組取景就被那一瞬決定，而它又被快取一整場。
     實測同一段教學跑兩次，立繪高度 665 vs 732（差 10%）—— Ray 說的「忽高忽低」有一半
     是這個，不是手機的問題。
   改成**由 CSS 常數推**：`.corner-btn` 是 44px、`top:10px`，退出鈕吃 `--notch-bar-h`
     （劇情層是全螢幕，鈕相對它定位；戰鬥層的鈕在 `#top` 內、已在瀏海之下，故 notch=0）。
     這樣不管什麼時候算，結果都一樣。 */
/* 舞台幾何：**只有 config 是計算點**（鐵律 7）。這裡與 tutorial.js 都只是讀。 */
function STAGE(){ return GAME_CONFIG.castStage || { topRatio:0.56, btnTop:10, btnH:44 }; }
function notchPx(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--notch-bar-h');
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}
function topLines(){
  const notch = notchPx();
  const G=STAGE();
  return { camTop: notch + G.btnTop + G.btnH + 4,   // 相機頂線：鈕的下緣再留 4px
           headTop: notch + G.btnTop };             // 頭頂落點：鈕的上緣（見 -352）
}

/* ══ 立繪槽 ══ */
function slotEl(side){ return $(side==='R' ? 'storyCastR' : 'storyCastL'); }

/* ══ 站位（ver -360）══
   預設是角色的固定站位（`speakers.js` 的 `ART[].side`，§6.5：同一個人每次都站同一邊）。
   ⚠ **scene 可以覆寫**（`sides:{RENNA:'R'}`）—— 為的是「一幕裡只有兩個人、又剛好同側」
     那種場面：每換一個說話者就是一次滑出＋滑入，讀起來很忙（Ray 在帝都那一幕回報）。
   ⚠ 覆寫是**整幕**的，不是逐句 —— 逐句換邊就回到 ver -288 那個被退回的「發起位制」，
     而立繪朝向是畫死的，換邊得水平翻轉、髮旋與持物會左右顛倒。
   ⚠ 覆寫要小心與同側的人撞車：例如會客廳那一幕璐娜莉亞坐在右邊，蕾娜若也覆寫成右，
     兩人就會互相擠掉。加覆寫前先想清楚那一幕台上有誰。 */
let sideOverride = {};
function sideOf(id){
  if(sideOverride[id]) return sideOverride[id];
  const a=artOf(id); return (a && a.side) || 'L';
}

/* 讓某角色出現在他該在的位置；已在場就只更新表情。回傳他所在的 side。 */
/* 這一拍有沒有人「滑進來」（首次上場或同側換人）。給 renderLine 決定
   無台詞那一拍要多等多久 —— 見下方 `auto` 的說明。 */
let slidIn = false;
function ensureOn(id, expr){
  const sp = SPEAKERS[id]; if(!sp) return null;
  /* ⚠⚠ **沒有立繪資料的角色不准碰立繪槽**（ver -319 修）。
     「？？？」（UNKNOWN）與璐娜莉亞的 art 是 null —— 她們只用 CG／暗調 CI 登場。
     原本沒擋，`artOf` 回 null 之後 side 退回 'L'，於是她們去佔了左邊那個槽，
     把站在那裡的諾薇兒**整個清掉**（Ray 回報「讓開。」那一拍她不見了）。 */
  if(!artOf(id)) return null;
  const side = sideOf(id);                              // 固定站位（可由 scene 覆寫），見 sideOf
  const el = slotEl(side); if(!el) return null;
  const src = srcFor(sp.art, expr);
  const swapping = (slot[side] && slot[side]!==id);
  /* ══⚠⚠ **取景要跟著「畫面上真的畫出來的那一張」走**（ver -647／-648，Ray：
     「娜塔莉說『安娜』的時候位置跑掉了，此時應該就是用 dead 了，但圖還是 dying」
      →「說完安娜以後她又跑了，而且用的也還是 dying」）══
     `slotExpr` 決定 `castLayout` 用哪一張的取景（`frameOf(id, slotExpr)`），
     而換圖有**兩段延遲**：① 排程（換表情 190ms／同側換人 203ms／首次 16ms）
     ② **圖自己的載入解碼**。
     · -647 只把它移到「設 `src` 的那一刻」—— 圖沒快取時 ② 還沒完成，
       畫面上仍是舊圖卻已經套上新取景，於是又跳一次（Ray 回報的第二次）。
     · 現在移到 **`onload`／`complete` 那一刻**：新的像素真的畫上去了才換取景。
     ⚠ 載不到圖時它**不會更新** —— 取景與畫面上那張（舊的）仍然一致，
       那正是我們要的失敗模式。
     ⚠ 娜塔莉 dying→dead 的 `fx` 差 0.23、`top` 差 56，跳起來是 45px，很顯眼。 */
  const setExpr = ()=>{ slotExpr[side]=expr||null; };

  if(slot[side]!==id || el.getAttribute('src')!==src){
    const apply = ()=>{
      /* ⚠⚠ **取景要跟著「畫面上真的是哪一張」走**（ver -647 修，Ray：「娜塔莉說
         『安娜』的時候位置跑掉了，此時應該就是用 dead 了，但圖還是 dying」）。
         `slotExpr` 決定 `castLayout` 用哪一張的取景（`frameOf(id, slotExpr)`），
         而換圖是**延後**的（換表情 190ms、同側換人 203ms、首次 16ms，外加 `onload`）。
         舊寫法在函式**最後**就把 `slotExpr` 設好 —— 於是那段延遲裡
         **舊圖被套上新圖的取景**：娜塔莉 dying→dead 的 `fx` 差 0.23、`top` 差 56，
         畫面上就是「圖還沒換、人先跳走」。
         正解：`slotExpr` 與 `src` **同一刻**更新，然後才 `layout()`。 */
      const ready=()=>{ el.onload=null; setExpr(); layout(); el.classList.add('on'); };
      el.onload = ready;
      el.setAttribute('src', src);
      el.dataset.who = id;
      if(el.complete && el.naturalWidth) ready();
    };
    const first = !slot[side];
    if(swapping || first) slidIn = true;
    if(swapping){
      /* 同側換人：舊的先滑出，再換新的滑入（CLAUDE.md §6.5 的輪轉換卡，
         與飛行畫面同一套）。 */
      el.classList.remove('on');
      slotT[side]=setTimeout(apply, SLIDE_MS*0.45);
    }else if(first){
      el.classList.remove('on');            // 首次上場：從自己那一側滑入
      slotT[side]=setTimeout(apply, 16);
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
      slotT[side]=setTimeout(()=>{
        const back=()=>{ setExpr(); el.classList.remove('fading'); layout(); el.classList.add('on'); };
        el.onload=()=>{ el.onload=null; back(); };
        el.setAttribute('src', src);
        el.dataset.who = id;
        if(el.complete && el.naturalWidth){ el.onload=null; back(); }
      }, 190);
    }
    slot[side]=id;
  }else{
    /* 圖沒有變（同一張）→ 取景本來就一樣，立刻更新即可。 */
    setExpr();
  }
  return side;
}

/* ⚠⚠ **上場是「延後」執行的，所以撤場一定要把那個延後取消掉**（ver -433 修，
   Ray：「感覺是馬上點到路人對話立繪會卡」）。
   `ensureOn` 把真正 `classList.add('on')` 的那一步包在 `setTimeout`（首次上場 16ms、
   同側換人 203ms、換表情 190ms）與 `el.onload` 裡 —— 那兩個都**跑在 `leaveSlot`
   之後**。於是：對白最後一句剛把人放上來、玩家立刻點掉 → `clearCast()` 撤場（槽清空、
   `.on` 拿掉）→ 那個還在路上的 `apply()` 又把 `.on` 加回去。
   結果是**畫面上有人、資料上沒有人** —— 沒有人會再撤她，她就一直站在那裡。
   ⚠ `el.onload` 也要拔掉：圖還在載的話，載完那一刻同樣會補上 `.on`。 */
let slotT = { L:0, R:0 };
function leaveSlot(side){
  const el=slotEl(side); if(!el) return;
  clearTimeout(slotT[side]); slotT[side]=0;
  el.onload=null;
  el.classList.remove('on'); el.classList.remove('fading');
  slot[side]=null; slotExpr[side]=null;
  layout();                       // ⚠ 人數變了＝預算與縮限跟著變，剩下的人要重排
}

/* 明暗：說話者原色，其餘壓暗。 */
function highlight(side){
  for(const s of ['L','R']){
    const el=slotEl(s); if(!el) continue;
    el.classList.toggle('dim', slot[s] && s!==side);
    /* ⚠ **說話的人一定疊在另一個人之上**（ver -350，Ray 指定）。兩人的輪廓本來就
       允許交疊（§6.5），交疊處誰在前就成了「誰在講話」的視覺線索之一 ——
       壓在別人身後講話會讀成「她在後面自言自語」。
       ⚠ 用 inline z-index 不用 class：兩個槽是兄弟元素，DOM 序固定（L 在前 R 在後），
         光靠 class 沒辦法讓 L 蓋過 R。 */
    el.style.zIndex = (s===side) ? '2' : '1';
  }
}

/* ══ {P} 代換：**顯示的這一刻才換**（玩家中途改名，下一句就會是新名字）══ */
/* `{P}`＝名字、`{N}`＝暱稱（ver -395）。⚠ **顯示的那一刻才代換**（見 progress.js）。 */
/* ══⚠⚠ **依好感段位換一句台詞**（ver -624，Ray 的稿：「（T1）／（T2以上）」）══
   線上寫 `textByTier:{1:'…', 2:'…'}`。
   ⚠ 兩個數字是**門檻不是等於**（同 `config.inspectors.dialogues` 與
     `script/evaluation.js` 的兩層查表）：只寫 1 與 2 ＝「T1 一種說法、T2 以上另一種」，
     日後要給 T4 再加一把鑰匙，前面幾段自動沿用。
   ⚠ 看的是**這一句說話者自己的**好感段位 —— 那句話是她說的，門檻自然是她的。
     說話者沒有立繪（旁白／主角）就沒有好感可查，退回 `text`。
   ⚠⚠ 解析只有這一支（鐵律 8）：所有讀「這一句要印什麼字」的地方一律問 `lineText()`，
     不要有人直接讀 `line.text` —— 漏一處就會出現「打字打到一半換成另一句」。
   ⚠ 不要把結果寫回 `line.text`：那是資料模組上的常數，改了下次重播就跟著錯。 */
function lineText(line){
  if(!line) return '';
  const m = line.textByTier;
  if(!m) return line.text || '';
  const key = SPEAKERS[line.speaker] && SPEAKERS[line.speaker].art;
  if(!key) return line.text || '';
  const t = prog.tierOf((prog.getAffection()||{})[key] || 0);
  let picked = line.text || '';
  for(const k of Object.keys(m).map(Number).filter(n=>!isNaN(n)).sort((x,y)=>x-y)){
    if(t >= k) picked = m[k];
  }
  return picked;
}
function subst(t){ return String(t==null?'':t)
  .split('{P}').join(prog.getPlayerName())
  .split('{N}').join(prog.getPlayerNick()); }

/* ══ 打字機 ══ */
/* 打字機。⚠ 速度吃 `typeSpeed()` —— 按住下拉的加速模式要即時變快（ver -367），
   所以每一格都重新問一次，不是進來時決定好。
   ⚠ 打完要回呼 `onTyped`：自動播放靠它決定「這一句唸完了，可以走下一句」。 */
let onTyped = null, typingMs = 0;
function typeSpeed(){ return fastMode ? 4 : TYPE_MS; }
function typeOut(el, text){
  clearInterval(typing);
  const full = subst(text); let i=0;
  el.innerHTML='';
  const step=()=>{
    i++;
    el.innerHTML = decorateLine(full.slice(0,i));   // 逐字重繪：關鍵字補完最後一字才上色
    if(i>=full.length){ clearInterval(typing); typing=null; if(onTyped) onTyped(); return; }
    /* 速度變了就換一個間隔重掛（setInterval 的間隔不能中途改）。
       ⚠ 間隔記在**另一個變數**：瀏覽器的 `setInterval` 回傳的是 number，
         往上面掛屬性會直接 TypeError（實測踩到）。 */
    if(typing && typingMs!==typeSpeed()){
      clearInterval(typing); typingMs=typeSpeed(); typing=setInterval(step, typingMs);
    }
  };
  typingMs=typeSpeed(); typing=setInterval(step, typingMs);
}
function typeFinish(el, text){
  clearInterval(typing); typing=null;
  el.innerHTML = decorateLine(subst(text));
  if(onTyped) onTyped();
}

/* ══ 演出層（ver -315）══════════════════════════════════════════════
   line 上的**演出欄位**，全部「只寫變化」：省略＝沿用上一句的狀態。

     bg:'HolyseeDungeonWhole'   背景（resources/background/*.webp）。bg:null 清掉
     cg:'001_Nouvelle_Fell'     全屏插圖（resources/illustration/*.webp）。cg:null 清掉
     cgPan:'up' / 'down'        這一句的 CG 平移（up＝由下往上、down＝由上往下）
     cgScale:1.18               插圖**直接放大**這個倍率（不做放大動畫，一上來就這麼大）；
                                要動的話配 cgPan 一起寫。與 cgZoom 互斥（那個是推近的過程）
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
     shake:true                 畫面抖一下（**同時震動**，ver -398）
     vibrate:true               只震動、畫面不抖（腳本上備註「震動」時用）
     bgPan:'up'|'down'          背景由下往上／由上往下平移（規則同 cgPan）
     nameInput:true             **輸入主角名與暱稱**（ver -395）。這一拍沒有台詞、
                                不出對話框 —— 它是一道閘門：填完按確定才往下走。
                                台詞裡用 `{P}`（名字）／`{N}`（暱稱）取用。
     load:'sceneId'             **標準讀取頁**：擋畫面把那個場景的素材抓完再往下演。
                                （ver -338，Ray 指定；插在哪由腳本決定）
                                ⚠ 這一行沒有台詞也沒有演出，它就是一道閘門。
     fx:'gunfire'               在 CG 上灑一串槍擊命中點

   ⚠ 這些是**演出**不是狀態機：`shake`／`fx`／`se` 是一次性的（每次演到就放），
     `bg`／`cg`／`ci` 是持續的（沿用到下一次改變）。混在一起寫會很難讀，
     所以分成 applyPersist 與 fireOneShot 兩支。 */
const BG_DIR='resources/background/', CG_DIR='resources/illustration/', SI_DIR='resources/SI/';
/* ══ BGM 表 ══
   ⚠ **逐支列出實際檔名**（不能拼副檔名）：這個資料夾裡 mp3 與 m4a 都有，
     拼出來的路徑會靜默 404（audio.js 載不到只 resolve(null)，不報錯）。
   鍵 ＝ 檔名去副檔名、**轉小寫**（查表也轉小寫，所以腳本裡大小寫寫錯照樣找得到）。
   ⚠ 這份清單由 `tools/script_lint.py` 對照 resources/audio/bgm/ 檢查；
     加了新檔案而忘了加進來，lint 會報「表裡沒有」。 */
const BGM_FILES=[
  'Bgm_Lunaria.m4a', 'PerituneMaterial_Crisis_loop.m4a', 'bgm_Capital_Day.m4a',
  'bgm_battle.m4a', 'bgm_boss.m4a', 'bgm_flight.m4a', 'bgm_mainmenu.m4a',
  'bgm_missionfailed.m4a', 'bgm_result.m4a',
  /* 北方泊地那一段（ver -614；-615 Ray 補上 m4a 版）。
     ⚠ 一律用 m4a（§6.6 的規約）：ogg 在 Safari 17 以前整個不支援，
       手機上會變成「那一段沒有音樂」。 */
  'PerituneMaterial_Suspense6_loop.m4a', 'Peritune_Crimson_Moon_loop.m4a',
  'PerituneMaterial_Entangle.m4a',   // 北方泊地那一夜（ver -656，Ray 指定；Credit 已加）
];
/* 別名：腳本裡慣用的短名 → 實際檔名（去副檔名）。加新別名只動這裡。 */
const BGM_ALIAS={ crisis:'peritunematerial_crisis_loop', lunaria:'bgm_lunaria',
                  mainmenu:'bgm_mainmenu', battle:'bgm_battle', boss:'bgm_boss',
                  result:'bgm_result', failed:'bgm_missionfailed', flight:'bgm_flight',
                  capital:'bgm_capital_day',
                  suspense:'peritunematerial_suspense6_loop',   // ver -614
                  crimson:'peritune_crimson_moon_loop',
                  entangle:'peritunematerial_entangle' };   // ver -656
const BGM_SRC=(()=>{ const m={};
  for(const f of BGM_FILES) m[f.replace(/\.[^.]+$/,'').toLowerCase()]='resources/audio/bgm/'+f;
  return m; })();
function bgmSrc(n){ const k=String(n||'').toLowerCase();
  return BGM_SRC[k] || BGM_SRC[BGM_ALIAS[k]] || null; }
/* 離開劇情要**回到主畫面的曲子**（Ray 指定）。⚠ 走 config 的鍵不要寫死路徑：
   主選單換曲時只改 config，這裡自動跟著。音量也用 config 那一份。 */
const HOME_BGM='resources/audio/bgm/bgm_mainmenu.m4a';   // ⚠ 音量問 fileGain(HOME_BGM)，不要在這裡記第二份（ver -441）
let stageBg=null, stageCg=null, stageCi=null, stageBgm=null;   // 目前的持續狀態

function setImg(el, src){
  if(!el) return;
  if(src){ if(el.getAttribute('src')!==src) el.src=src; el.classList.add('on'); }
  else   { el.classList.remove('on'); }
}

/* ══ 時段差分的候選鏈（ver -427，鐵律 7／8 的單一真相）══════════════════════
   ⚠⚠ 這條規矩本來只長在 `modules/town.js` 的 `bgFor` 裡（背景用）；Ray ver -427
     把**插圖**也拆成時段差分（`005_Kerberos_day` / `_dusk`），所以規矩要抽出來 ——
     兩邊各寫一份的話一定會走鐘（其中一份漏了大小寫變體、或漏了 `.png` 那一級）。
     town 的 `bgFor` 現在讀這一支，插圖那一支也讀這一支。
   順序：`<base>_<時段>` → 大小寫變體 → `_Day`（＋變體）→ 無時段；
   每個名字再試 `.webp` → `.png`。
   ⚠ 為什麼要大小寫變體：`clock.band()` 出的是 `Dawn/Day/Dusk/night/midnight`
     （大小寫是 Ray 定的），但交件的檔名兩種都出現過。**macOS 不分大小寫，靜態空間分**
     —— 本機測不出來，上線才 404。
   ⚠ 為什麼要兩種副檔名：規約是 WebP（§5），但交件常常先是 PNG。
   ⚠ `noTime` ＝這張圖沒有時段差分（室內背景），只試原名。 */
const BAND_EXT = ['.webp', '.png'];
function altCase(name){
  const i=name.lastIndexOf('_'); if(i<0) return null;
  const head=name.slice(0,i+1), tail=name.slice(i+1);
  if(!tail) return null;
  const alt = (tail[0]===tail[0].toUpperCase())
    ? tail[0].toLowerCase()+tail.slice(1) : tail[0].toUpperCase()+tail.slice(1);
  return alt===tail ? null : head+alt;
}
/* ══⚠⚠ 退路要沿著**明暗軸**走，暗的時段不准退回白天（ver -576）══════════════
   Ray：「攝政王廣場的夜間差分不正確」。成因：舊版的退路一律是
   `這個時段 → _Day → 原名`，而 `Capital_Square` 只有 Day／Dusk／midnight
   （**沒有 night**）—— 於是晚上 8 點到 12 點站在廣場看到的是大白天。
   ⚠ 同一個洞不只那一個地點：旅店與餐酒館沒有 midnight、雜貨舖與武器店只有
     day/dusk。改在這一支，全部一起好（鐵律 8）—— 不要在城鎮那邊為某個地點寫特例。
   ⚠ 這是**退路**不是替代品：該有的差分還是要交（退到 midnight 的夜晚廣場只是
     「不會錯得離譜」，不是「對」）。 */
const BAND_FALL = {
  Dawn:     ['Dawn','Day','Dusk'],
  Day:      ['Day','Dawn','Dusk'],
  Dusk:     ['Dusk','Day','night'],
  night:    ['night','midnight','Dusk'],
  midnight: ['midnight','night','Dusk'],
};
export function bandNames(base, noTime){
  const names=[]; const push=n=>{ if(n && names.indexOf(n)<0) names.push(n); };
  if(noTime){ push(base); }
  else{
    const cur=clock.band();
    for(const b of (BAND_FALL[cur] || [cur,'Day'])){
      const n=base+'_'+b; push(n); push(altCase(n));
    }
    push(base);
  }
  const out=[];
  for(const n of names) for(const e of BAND_EXT) out.push(n+e);
  return out;
}
/* 背景／插圖的來源路徑。⚠ **插圖也可以當背景用**（ver -325，Ray：「『對不起，
   我已經…』的背景是插圖002」）—— 判斷靠命名慣例：插圖一律 `NNN_` 開頭
   （001_Nouvelle_Fell…），背景是名字（HolyseeDungeonWhole…）。
   這樣腳本裡照樣只寫一個名字，不必再記它放在哪個資料夾。 */
/* ⚠ `name` 可以自己帶副檔名（`Capital_Downtown_Day.png`）—— 城鎮的背景載入器
   （modules/town.js 的 `bgFor`）會逐個試 `.webp` / `.png`，試到哪一個就把**那一個**
   傳進來。沒帶就照預設補 `.webp`（§5 的規約：新圖一律轉 WebP）。 */
function imgSrc(name){
  const dir = /^\d{3}_/.test(name) ? CG_DIR : BG_DIR;
  return dir + name + (/\.(webp|png|jpe?g)$/i.test(name) ? '' : '.webp');
}
/* 換圖：淡出 → 換 → 淡入。FADE_MS 與 style.css 的 transition 同值。
   ⚠⚠ `.fading` 要等**新圖載好**才拿掉（同 ver -322 立繪那個坑）：移除 class 的
     那一瞬間元素上還是舊圖，於是**舊圖先淡回來、新圖才蓋上去**＝兩張疊在一起。
   ⚠ 場上還沒有圖時直接上（不淡入淡出）—— 否則開場會先黑一段莫名的空白。 */
const FADE_MS = 220;
/* 這個 `<img>` 真的把圖畫上去了嗎 —— 沒載完就等 `onload`（載不到也要放行，
   不能讓等它的人卡住）。⚠ 只有一支（鐵律 8）：凡是「等新圖上去了再做事」都叫它。 */
function whenPainted(el, fn){
  if(!el || !el.getAttribute('src')){ fn && fn(); return; }
  if(el.complete && el.naturalWidth){ fn && fn(); return; }
  el.onload =()=>{ el.onload=null; el.onerror=null; fn && fn(); };
  el.onerror=()=>{ el.onload=null; el.onerror=null; fn && fn(); };
}
/* `done`＝**新圖真的在畫面上了**（ver -442）。城鎮的切景要靠它才知道什麼時候
   可以把黑幕掀開 —— 見 modules/town.js 的 `reveal`。 */
function swapImg(el, src, done){
  const fin=()=>{ if(done) done(); };
  if(!el){ fin(); return; }
  const on  = el.classList.contains('on');
  const cur = on ? el.getAttribute('src') : null;
  if(cur===src){ fin(); return; }
  /* ⚠⚠ **黑幕蓋著就直接換，不要再淡一次**（ver -442，Ray：「城鎮場景切換都會
     多閃一下原場景」）。那一片黑本身就是這一次的轉場，在它底下淡出淡入
     沒有人看得到，卻要多花 `FADE_MS`：於是「換好了」比實際晚 220ms 才成立 ——
     黑幕先掀開，畫面上還是**上一個地點**，一下子才換成新的 ＝ 那一下閃。
     ⚠ 場上還沒有圖時本來就直接上（否則開場會先黑一段空白），兩種情形同一條路。 */
  if(!on || veilOn()){ setImg(el, src); whenPainted(el, fin); return; }
  el.classList.add('fading');
  setTimeout(()=>{
    if(!src){ el.classList.remove('on','fading'); fin(); return; }
    const back=()=>{ el.onload=null; el.classList.remove('fading'); el.classList.add('on'); fin(); };
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

/* 插圖換圖：**黑幕淡出 → 換圖 → 黑幕淡入**，總長 1 秒（Ray 指定）。
   ⚠ 為什麼不用一般的淡入淡出或斜切揭幕，見 style.css 的 #storyFade。
   ⚠ 換圖要壓在**全黑的那一刻**做：早一點或晚一點都會被看見，那就是 Ray 說的
     「多跳了一下」。所以等 transition 的 500ms 走完才換。
   ⚠ 場上還沒有插圖時（第一次上圖）不走黑幕 —— 開場黑一下沒有意義，
     只會讓玩家覺得卡住。 */
const CG_FADE_MS = 500;
/* 現在是不是「持續震動」中（ver -638，見 renderLine 的 `shakeHold`）。 */
let sustainShake = false;
function stopShake(){
  sustainShake = false;
  const st=$('storyStage');
  if(st){ clearTimeout(st.__shakeT); st.classList.remove('shake','hold'); }
}
/* ══⚠⚠ **跨句的畫面染色**（`tintHold`，ver -664，Ray：「畫面變色，紫紅負片」）══
   與 `shakeHold` 同族：那一拍寫 `tintHold:'<名字>'` ＝整個舞台換上那組濾鏡，
   **推對話不會收掉**，一路撐到出口為止。
   ⚠⚠ 跨句的狀態一定要有**明確的出口清單**，而且全部走同一支收尾（§6.5）：
     進戰鬥（`line.battle`）／換場（`playScene`）／離場（`close`）—— 與持續震動同三個。
   ⚠ 它**不是** `line.bg` 那種持續狀態（那些要寫 null 才收）：這是一段演出，
     沒有人會記得在最後一拍寫 `tintHold:null`。
   ⚠ 名字對到 CSS 的 `.story-tint-<名字>`（現在只有 `nightmare`）——
     腳本只寫名字，配方在 CSS（鐵律 1）。 */
let tintName=null;
function stopTint(){
  if(!tintName) return;
  const st=$('storyStage'); if(st) st.classList.remove('story-tint-'+tintName);
  tintName=null;
}
function setTint(name){
  if(name===tintName) return;
  stopTint();
  if(!name) return;
  const st=$('storyStage'); if(!st) return;
  tintName=name; st.classList.add('story-tint-'+name);
}
/* 見檔頭 import 處的說明。⚠ 判「看不看得見」用實際尺寸不用 class（同 tone.js）。 */
function toneSrcEl(){
  const cg=$('storyCg');
  if(cg && cg.getAttribute('src') && cg.offsetWidth>0) return cg;
  return $('storyBg');
}
/* ⚠⚠ 黑幕的計時器**自己一組**，不掛在 `fxTimers` 上（ver -351 修）。
     原本掛在一起，而 `renderLine` 一開頭就 `stopFx()` 把 fxTimers 全清 ——
     玩家在 500ms 的淡黑期間點了下一句，那個「換圖並收黑幕」的計時器就被取消，
     **黑幕永遠留在畫面上**（實測：卡片那一拍點快一點，之後整段都是黑的）。
   現在改成：黑幕有自己的 `cgFadeT` 與 `cgFinish`，`renderLine` 進來時**先把它做完**
     （`flushCgFade`）而不是取消 —— 玩家想快轉就立刻換好圖、收黑幕，不會卡住。
   ⚠ `fadeOwner` 是為了分辨黑幕是誰掛上去的：場景之間的讀取閘門也用同一塊黑幕，
     那一塊**不能**被 flush 收掉（它要蓋到新場景第一拍演完）。 */
let cgFadeT=[], cgFinish=null, fadeOwner=null;
const missingCg=new Set();   // 退回過的插圖：只提示一次，不然每一句都印一行
function flushCgFade(){
  cgFadeT.forEach(clearTimeout); cgFadeT=[];
  if(cgFinish) cgFinish();
  flushCgCross();
}
/* ══⚠⚠ **淡入中的第二層要能被「立刻做完」**（ver -643，Ray：「有時按太快會卡插畫」）══
   `cgCross`（`cgSoft` 的疊上去淡入，ver -628）把交棒排在 `CG_FADE_MS` 之後，
   而且 `#storyCg2` 上還可能掛著沒回來的 `onload`。玩家在那半秒內點下一句時：
     · 交棒的計時器被 `flushCgFade` 清掉 → **主圖層永遠拿不到新的那一張**
     · 第二層停在 `.on`（不透明）→ **它就蓋在畫面上不走了** ＝ 卡插畫
   作法與 `cgFinish` 同一個模式：**被打斷就把它做完**（把該交的交完、把第二層收掉），
   不是「取消」—— 取消等於讓畫面停在半路（同 ver -430 `pendingReveal` 的教訓）。
   ⚠ 冪等：沒有在跑就什麼都不做。 */
let cgCrossFinish = null;
function flushCgCross(){
  const f = cgCrossFinish; cgCrossFinish = null;
  if(f) f();
}
/* `src` 可以是一個**候選陣列**（時段差分，ver -427）：由前往後試，第一張載得起來的
   就是它。⚠ 試的那一次**就是**要用的那一次載入（設 `el.src` 再看 onload/onerror），
   不另外開一輪探測 —— 那等於同一張圖抓兩次。 */
/* ══ 插圖的候選解析（ver -433）══════════════════════════════════════════
   ⚠⚠ **問題**：`bandNames` 對一張沒有時段差分的插圖會生出六個候選
   （`_Day` / `_day` / 原名 × `.webp`/`.png`），而 `cgFade` 是**顯示的當下**才逐個試 ——
   於是每次演到那一拍都要先吃 4~5 個 404 才輪到真的那一張。慢網下這比
   「黑幕最多蓋 900ms」還久，黑幕先掀開了、插圖還沒到 ＝ **插圖沒出現**
   （Ray：「插畫載入有問題」）。
   **作法**：解析一次就記起來，之後只請求那一張；而且**在預載那一段就先解析好**，
   所以第一次演到也是一個請求。
   ⚠⚠ 快取的鑰匙是**第一個候選**（`list[0]`）不是基底名 —— 它已經把「現在是哪個時段」
     編進去了。用基底名當鑰匙的話，天亮之後還會拿出黃昏那一張（時段差分整個失效）。
   ⚠ 一個都載不到就記 `null`（＝這張插圖不存在），下次不必再試一輪。 */
const cgResolved = new Map();
function cgList(base, noTime){ return bandNames(base, noTime).map(n=>CG_DIR+n); }
/* 顯示時要試哪幾個：解析過就只回那一個，沒解析過就回整串（照舊逐個試）。 */
function cgCandidates(base, noTime){
  const list = cgList(base, noTime);
  if(!list.length) return list;
  if(cgResolved.has(list[0])){ const r=cgResolved.get(list[0]); return r ? [r] : []; }
  return list;
}
/* 預載時先把它解出來（回傳 Promise，解完才算這一張載好）。 */
function resolveCg(base, noTime){
  const list = cgList(base, noTime);
  if(!list.length) return Promise.resolve(null);
  if(cgResolved.has(list[0])) return Promise.resolve(cgResolved.get(list[0]));
  return new Promise(res=>{
    const step=(i)=>{
      if(i>=list.length){
        cgResolved.set(list[0], null);
        console.info('[story] 這張插圖一個候選都載不到：', base);
        res(null); return;
      }
      const im=new Image();
      im.onload =()=>{ cgResolved.set(list[0], list[i]); res(list[i]); };
      im.onerror=()=>step(i+1);
      im.src=list[i];
    };
    step(0);
  });
}
/* ══⚠⚠ **`cgSoft:true` ＝這一張換圖用淡入，不走黑幕**（ver -628，Ray：
   「007_Anya_passout / 007-2_Anya_awake 兩張的切換直接用淡入，不用轉黑」）══
   黑幕（淡黑→換→淡回）是「換一個地方」的語氣；**同一張插圖的差分**（昏迷→醒來）
   要的是「同一個畫面上發生了變化」，中間插一片黑等於把那個變化切斷。
   ⚠ 作法是把新圖疊在舊圖上淡入（`#storyCg2`），淡完再把它換成主圖層 ——
     不是「先清空再淡入」（那會閃一格空白，跟黑幕一樣糟）。
   ⚠ 只有**明寫**的那幾拍走這條：預設仍是黑幕（§6.5 的通則不變）。 */
function cgCross(el, src){
  const list = Array.isArray(src) ? src : (src ? [src] : []);
  const top = $('storyCg2');
  if(!top || !list.length) return false;
  /* ⚠⚠ 第二層要與主圖層**同一個取景**（ver -631）：主圖層可能停在平移／放大的
     結果上（`pan-up` 跑完是 `object-position:50% 0%`），第二層用預設值的話
     淡入的是「另一個構圖」，讀起來是跳了一下而不是同一張圖變了。
     ⚠ 讀**computed** 值不是 class：平移是 animation 的 forwards 結果，
       class 名字不告訴你它停在哪（同「不要從畫面反推」的反面 —— 這裡要的
       正是那個算出來的結果）。 */
  { const cs=getComputedStyle(el);
    top.style.objectPosition = cs.objectPosition;
    top.style.transform      = cs.transform==='none' ? '' : cs.transform;
    top.style.transformOrigin= cs.transformOrigin; }
  const tryAt=(i)=>{
    if(i>=list.length){ cgCrossFinish=null; top.classList.remove('on'); setImg(top,''); return; }
    setImg(top, list[i]);
    const done=()=>{ top.onload=null; top.onerror=null;
      cgResolved.set(list[0], list[i]);
      top.classList.add('on');                    // 淡入（CSS transition）
      /* 交棒：把第二層那一張交給主圖層。⚠⚠ **取景要一起交**（ver -631）：
         主圖層那個 `pan-up` 的位置是 animation 的 forwards 結果，換掉 `src` 之後
         它未必守得住 —— 把第二層算好的那組值寫成 inline，交棒才不會跳回正中。
         ⚠ 下一次真的要重新平移時，`startMove` 會把這幾個 inline 清掉（見那裡）。
         ⚠ 冪等：被 `flushCgCross` 提前叫過就不再做第二次。 */
      let handed=false;
      const handoff=()=>{
        if(handed) return; handed=true;
        cgCrossFinish=null;
        el.style.objectPosition = top.style.objectPosition;
        if(top.style.transform){ el.style.transform=top.style.transform;
                                 el.style.transformOrigin=top.style.transformOrigin; }
        setImg(el, list[i]); top.classList.remove('on');
        cgFadeT.push(setTimeout(()=>{ if(!top.classList.contains('on')) setImg(top,''); }, 60));
      };
      cgCrossFinish = handoff;                    // 被打斷就立刻做完（見 flushCgCross）
      cgFadeT.push(setTimeout(handoff, CG_FADE_MS));
    };
    if(top.complete && top.naturalWidth){ done(); return; }
    top.onload=done; top.onerror=()=>{ top.onload=null; top.onerror=null; tryAt(i+1); };
  };
  flushCgCross();                                 // 上一次還沒交棒的，先做完（不要疊兩層）
  cgFadeT.forEach(clearTimeout); cgFadeT=[];
  tryAt(0);
  return true;
}
/* ══⚠⚠ **一段演完就把插圖撤掉**（ver -643，Ray：「插畫播完強制撤掉」）══
   插圖與立繪一樣是**持續狀態** —— 沒人撤它就一直蓋在畫面上。以前靠腳本自己寫
   `cg:null`，漏寫就卡著（而且新增的每一條路徑都會再漏一次，同 §6.5「清場」那條）。
   ⚠ 收在 `clearCast()` 裡：那一支已經是「這一段講完了」的唯一出口（鐵律 8）。
   ⚠ 連第二層與正在跑的淡入一起收，不然被打斷的那一張會留在最上面。 */
export function clearCg(){
  flushCgCross();
  cgFadeT.forEach(clearTimeout); cgFadeT=[];
  cgCrossFinish=null; cgFinish=null;
  stageCg=null;
  const top=$('storyCg2'); if(top){ top.classList.remove('on'); setImg(top,''); }
  const cg=$('storyCg');
  if(cg){ cg.classList.remove('pan-up','pan-down','zoom-in');
          cg.style.objectPosition=''; cg.style.transform=''; cg.style.transformOrigin='';
          setImg(cg,''); }
}
function cgFade(el, src){
  const fade=$('storyFade');
  /* ⚠ **插圖一出現就要走黑幕**，不是只有「插圖換插圖」才走 —— Ray 抱怨的正是
     「插進來那一下」在跳。第一版只在場上已有插圖時才淡，於是最常見的
     「沒有插圖 → 插入插圖」完全沒吃到，等於沒改。 */
  if(!el || !fade){ setImg(el, src); return false; }
  cgFadeT.forEach(clearTimeout); cgFadeT=[];
  fade.classList.add('on'); fadeOwner='cg';
  cgFinish=()=>{
    cgFinish=null;
    const list = Array.isArray(src) ? src : (src ? [src] : []);
    /* 等新圖真的畫上去再收黑幕 —— 沒載完就收，會先看到一格舊圖或空白
       （同 ver -322 立繪、ver -325 背景踩過的那個坑）。 */
    const back=()=>{ el.onload=null; el.onerror=null;
      if(fadeOwner==='cg'){ fade.classList.remove('on'); fadeOwner=null; } };
    /* ⚠ 試出來的結果要**記起來**（ver -433）：下一次演到同一張就只請求那一張。
       鑰匙是 `list[0]`（已經把時段編進去了，見 cgCandidates 的說明）。 */
    const win=(src2)=>{ if(list.length) cgResolved.set(list[0], src2||null); };
    const tryAt=(i)=>{
      if(i>=list.length){ win(null); setImg(el, ''); back(); return; }   // 一張都載不到：等於沒有插圖
      setImg(el, list[i]);
      if(el.complete && el.naturalWidth) { win(list[i]); back(); return; }
      el.onload=()=>{ win(list[i]); back(); };
      el.onerror=()=>{ el.onload=null; el.onerror=null;
        if(i===0 && !missingCg.has(list[0])){ missingCg.add(list[0]);
          console.info('[story] 沒有這個時段的插圖，往下試：', list[0]); }
        tryAt(i+1); };
    };
    if(!list.length){ setImg(el, ''); back(); return; }
    cgFadeT.push(setTimeout(back, 900));    // 保險：候選全都很慢時別把黑幕卡住
    tryAt(0);
  };
  cgFadeT.push(setTimeout(()=>{ if(cgFinish) cgFinish(); }, CG_FADE_MS));
  return true;
}

/* ══ 插圖「直接放大」＝**把元素加寬**，不是 transform: scale ══
   ⚠⚠ 用 transform 放大**幾乎不會讓平移變長**：object-fit:cover 的可平移量是
     「圖被裁掉的那一截」，transform 只是把整個裁好的窗一起放大，裁掉多少不變。
     實測 003（1085×1450）在 375×455 的框裡只裁掉 **46px** —— 那點行程肉眼看不出在動，
     Ray 要的「從下上移到頂」等於沒發生。
   作法：元素寬度給 k×100%、左邊往外拉 (k−1)/2，cover 就以**更大的寬**去鋪圖 →
     圖等比放大 k 倍、被裁掉的高度變成 k×501−455（k=1.18 時 137px，約三倍行程），
     `storyPanUp` 那組 object-position 動畫不必改就一路推到頂。
   ⚠ 橫向多出來的部分往兩側溢出，由舞台的 overflow 收掉 —— 這正是「放大＝裁掉兩側」。
   ⚠ 不要順手改成改高度：高度是場景區的高（--story-top），一改對話框與楣的錨點全歪。 */
function setCgScale(k){
  const cg=$('storyCg'); if(!cg) return;
  if(k && k>0 && k!==1){ cg.style.width=(k*100)+'%'; cg.style.left=(-(k-1)*50)+'%'; }
  else { cg.style.width=''; cg.style.left=''; }
}
/* applyPersist 這一拍有沒有走黑幕（換插圖／收插圖）。用模組變數不用回傳值：
   這支函式的呼叫點只有一個，回傳值改起來要動一串解構，得不償失。 */
let persistFaded=false;
function applyPersist(line){
  /* ⚠ **這一拍要立的旗標**（ver -425）：`flags:['set_sail']`。
     scene 有 `setFlags`（收尾才寫），但城鎮的 `acts` 不是 scene —— 這一條是逐拍的。
     ⚠ 演到就記（不是演完），所以只放「這一刻確實發生了」的事（出航、拿到東西…）。 */
  if(line.flags && line.flags.length) prog.addFlags(line.flags);
  persistFaded=false;
  let bgChanged=false;
  if(line.bg!==undefined && line.bg!==stageBg){
    bgChanged=true;
    stageBg=line.bg;
    swapImg($('storyBg'), line.bg?imgSrc(line.bg):'');
    /* 立繪的色調跟著背景走一點點（見 modules/tone.js）。
       ⚠ 要等換圖跑完再量 —— swapImg 是先淡出、載好才換 src，太早量到的是舊圖。 */
    setTimeout(()=>matchPortraits(toneSrcEl(), $('storyCast')), 420);
  }
  let cgChanged=false, cgFaded=false;
  if(line.cg!==undefined && line.cg!==stageCg){
    cgChanged=true;
    stageCg=line.cg;
    /* ⚠ 插圖**也吃時段差分**（ver -427，Ray 指定）：`005_Kerberos` →
       `005_Kerberos_dusk` / `_day` 由 `clock.band()` 挑，走與背景**同一條**候選鏈。
       ⚠ `cgNoTime:true` ＝這張沒有差分（多數插圖都是），只試原名。 */
    /* ⚠ 走 `cgCandidates`（ver -433）：已經解析過就只請求那一張，
       不必每次把四五個 404 再走一遍（見那一支的說明）。 */
    /* `cgSoft`：同一張插圖的差分 → 淡入不轉黑（ver -628，見 cgCross）。
       ⚠ 收圖（`cg:null`）不吃這一條 —— 那是「這張插圖結束了」，該走黑幕。 */
    /* 插圖換了 → 色調來源也換了（ver -631）：等它畫上去再量。 */
    fxTimers.push(setTimeout(()=>matchPortraits(toneSrcEl(), $('storyCast')), CG_FADE_MS+80));
    cgFaded = (line.cgSoft && line.cg)
      ? !cgCross($('storyCg'), cgCandidates(line.cg, line.cgNoTime))
      : cgFade($('storyCg'), line.cg ? cgCandidates(line.cg, line.cgNoTime) : '');
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
      if(line.bgm){ const src=bgmSrc(line.bgm);
        /* ⚠⚠ 音量**問 config**（ver -441）：以前這裡寫死 0.62，於是**每一首**
           劇情曲都用同一個數字播 —— 母帶差 6 dB 的兩首曲子就差 6 dB。
           現在逐曲的增益只有 `tuning.fileGain` 那一份（鐵律 7），
           而且與別處起播同一首時算出來的值一定相同（playBgm 對同曲直接 return，
           誰先起播誰的音量就定了 —— 兩邊不一致就會「看是誰起播的」而大小聲）。 */
        if(src) SFX.playBgm(src, {fadeInMs:800, volume:fileGain(src)});
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
  /* ⚠ 走黑幕換圖時，平移／推近要**等新圖上去**才開始 —— 立刻開始的話動的是
     還沒被換掉的舊圖，黑幕收起來時動畫已經跑掉一截，看起來就是「跳了一下」。 */
  const cg=$('storyCg');
  const startMove=()=>{
    /* 直接放大（ver -343，Ray：「璐娜莉亞的插圖不要做放大效果，直接放大，
       然後從下上移到頂」）。⚠ 它與 `cgZoom` 是**兩件事**：
         · cgZoom  ＝推近的**過程**（6 秒的 scale 動畫）—— 滿版插圖上任何會動的
                     縮放都會被讀成畫面在抖，這正是 Ray 要拿掉的東西。
         · cgScale ＝**一上來就是這個大小**，不動；要動的只有平移。 */
    if(line.cgScale!==undefined){
      cg.classList.remove('zoom-in');
      cg.style.transform=''; cg.style.transformOrigin='';
      setCgScale(line.cgScale);
    }else if(cgChanged){ cg.style.transform=''; setCgScale(0); }   // 新圖不繼承舊圖的放大
    if(line.cgPan==='up' || line.cgPan==='down'){
      cg.style.objectPosition='';                // 上一次交棒留下的 inline 取景（見 cgCross）
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
    }else if(line.cgPan===null || (cgChanged && !line.cgSoft)){
      /* ⚠⚠ `cgSoft` 的那一拍**不重置平移**（ver -631，Ray：「awake 直接疊在平移後的
         passout 上」）：它是同一張圖的差分、疊上去淡入的 —— 平移是上一拍跑完
         停在那裡的取景，重置等於把畫面「啪」一聲拉回原位，那正是這條要避免的。
         ⚠ 所以 `cgCross` 也要把第二層擺到**同一個** object-position（見那裡）。 */
      cg.style.objectPosition='';                // 同上：回到預設取景
      cg.classList.remove('pan-up','pan-down','zoom-in');
    }
  };
  if(cg){
    if(cgFaded) fxTimers.push(setTimeout(startMove, CG_FADE_MS+20));
    else startMove();
  }
  persistFaded = cgFaded;   // 這一拍走了黑幕 → renderLine 要等畫面全亮才放人出來
  /* 背景的平移（`bgPan`）。規則與插圖那一套相同：
       · 這一句寫了 bgPan → 重播那個方向（先移除再加，否則不會重新開始）
       · 這一句換了背景   → 清掉（新背景不該繼承舊背景的平移）
       · 其餘             → **不動**，讓它自己跑完
     ⚠ 背景換圖走的是淡入淡出（swapImg，等 onload），所以要**等新圖上去才開始平移** ——
       立刻開始的話動的是還沒換掉的舊背景。 */
  const bgEl=$('storyBg');
  if(bgEl){
    const startBgMove=()=>{
      if(line.bgPan==='up' || line.bgPan==='down'){
        bgEl.classList.remove('pan-up','pan-down');
        void bgEl.offsetWidth;
        bgEl.classList.add(line.bgPan==='up'?'pan-up':'pan-down');
      }else if(line.bgPan===null || bgChanged){
        bgEl.classList.remove('pan-up','pan-down');
      }
    };
    if(bgChanged) fxTimers.push(setTimeout(startBgMove, FADE_MS+40));
    else startBgMove();
  }
}
/* ══ 音效表 ══
   ⚠ **逐支列出實際檔名**，不要用字串拼副檔名 —— 這個資料夾裡 mp3/m4a/wav 都有，
     拼出來的路徑會靜默 404（audio.js 載不到只會 resolve(null)，不報錯）。
   鍵 ＝ 檔名去副檔名、**轉小寫**（查表也轉小寫 → 腳本寫 `se_Fall` 或 `se_fall` 都行）。
   ⚠ 這份清單由 `tools/script_lint.py` 對照 resources/audio/se/ 檢查。 */
const SE_FILES=[
  'Se_enemy_Saintroar.m4a', 'Sturm.m4a', 'se_Fall.m4a', 'se_Kerberos_gear.m4a',
  'se_Kerberos_open.m4a', 'se_Kerberos_pop.m4a', 'se_Kerberos_steam.m4a',
  'se_kerberos_drop.m4a',                                    // 槍棺落地（旅店那一幕，ver -392）
  'se_enemy_dagger.m4a', 'se_dart_fail.m4a',                 // 固定立靶點錯（ver -397）
  /* 船艦戰（ver -423／-425）：蜈蚣的攻擊音、艦砲、船戰用的機槍。 */
  'Se_enemy_centipi.m4a', 'se_weapon_cannon_120mm.m4a', 'se_weapon_heavygun.m4a',
  'se_enemy_revolver.m4a', 'se_enemy_shot.m4a', 'se_enemy_slash.m4a', 'se_enemy_smack.m4a',
  'se_flight_heartbeat.m4a', 'se_flight_idle_loop.mp3', 'se_flight_sail_loop.mp3',
  'se_flight_seagull.m4a', 'se_flight_train.mp3', 'vo_lunaMG.m4a', 'se_punch.m4a',
  'se_brickcrush.m4a',                                       // 瓦礫崩落（北方泊地教堂，ver -624）
  'se_earthquake.m4a',                                       // 地鳴（教堂那一拍的震動，ver -636）
  'se_paniccrowd.mp3',                                       // 人群尖叫（墓地那一幕，ver -664）
  /* 高音版的怪物吼叫（ver -671，Ray：「pitch 高 5 個半音，另存為 se_nightmare_hp」）。
     ⚠ 由 `Se_enemy_Saintroar` 升 5 個半音另存 —— **不是**執行期變調
     （那一套在 ver -649 被 Ray 撤掉了，見 enemy.js 著地音的說明）。 */
  'se_nightmare_hp.m4a',
  /* ⚠ `se_saint_maxburst` 於 ver -641 改名成 `vo_saint_maxburst`，而它**還躺在 `se/`**
     —— 這張表是照 `vo_` 前綴推資料夾的，列進來會指到 `vo/` 而 404。
     它本來就在 `ASSETS.se_luna_mb`（開機那一批照樣預載得到），所以這裡直接不列。 */
  'se_saint_install.m4a', 'se_steps.m4a', 'se_ui_click.m4a',
  'se_ginclick.m4a', 'Se_Tummy.m4a', 'se_metalclip.m4a', 'se_SailorShout.mp3',
  'se_ui_kagurabell.m4a', 'se_ui_pageflip.m4a', 'se_ui_sortie.m4a', 'se_walk.m4a',
  'se_weapon_guard.m4a', 'se_weapon_mg_squall.m4a', 'se_weapon_pistol_01.m4a',
  'se_weapon_pistol_02.m4a', 'se_weapon_pistol_03.m4a', 'se_weapon_reload.m4a',
  'se_weapon_shotgun_blast.m4a', 'se_weapon_sniper_falcon.m4a',
];
/* 別名：腳本裡慣用的短名 → 實際檔名（去副檔名）。 */
const SE_ALIAS={ se_saintroar:'se_enemy_saintroar', se_mg_squall:'se_weapon_mg_squall',
                 se_reload:'se_weapon_reload',
                 /* Ray 於 ver -508 把 se_lunaMG 改名 vo_lunaMG（檔案已歸位 vo/，ver -566）——
                    腳本照舊寫 se_lunaMG，這裡接住（稿子不必回頭改）。 */
                 se_lunamg:'vo_lunamg' };
/* vo_ 開頭的檔住在 vo/（§6.6 的命名規約），其餘住 se/ —— 路徑由檔名推，只有這一處。 */
const SE_SRC=(()=>{ const m={};
  for(const f of SE_FILES) m[f.replace(/\.[^.]+$/,'').toLowerCase()]=
    'resources/audio/'+(/^vo_/i.test(f)?'vo/':'se/')+f;
  return m; })();
function seSrc(n){ const k=String(n||'').toLowerCase();
  return SE_SRC[k] || SE_SRC[SE_ALIAS[k]] || null; }
/* ⚠⚠ **劇情用的音效要一起進開機預載**（ver -433，Ray：「為什麼不能把 se 放在預載
   第一位？se 永遠都出不來，一開始的 step 跟 fall 在手機從來沒播過」）。
   ⚠ 真正的原因**不是順序**：`main.js` 的開機批次是從 `ASSETS` 掃出來的，而
     `se_steps` / `se_Fall` 這 20 幾支**根本不在 `ASSETS` 裡**（它們只登記在這裡的
     `SE_FILES`）—— 所以那一批從頭到尾就沒有它們，排第一也沒用。
     它們原本只在 `story.preloadStory` 那一道門才抓，慢網下第一次演到就來不及
     （`LATE_PLAY_MS` 1.5 秒沒等到就乾脆不播）。
   ⚠ **不要把它們抄一份進 `ASSETS`**（鐵律 7）：那會變成兩張表，改檔名只改得到一邊。
     開機那邊 import 這一支，兩邊永遠一致。 */
export function seSources(){ return Object.keys(SE_SRC).map(k=>SE_SRC[k]); }
/* ⚠ 沒解碼完就退回 `HTMLAudio`（ver -354）。`SFX.play` 走 Web Audio，buffer 沒好時
   它只會「限時補播」，超過 1.5 秒就乾脆不播 —— 手機上開場那兩支就是這樣消失的。
   `new Audio(src).play()` 是串流，馬上就能出聲；而且這一下是**使用者點擊**推進的，
   還在手勢的同步區間裡，iOS 不會擋。
   ⚠ 只當退路：Web Audio 那條有匯流 limiter 與音量分層，能走就走那條。 */
function playSeFallback(src, gain){
  /* ⚠ 退路也要吃逐支增益（ver -441），不然「解碼好了」與「還沒好」是兩個響度。
     ⚠ HTMLAudio 的 volume 只能 0~1，而增益可以大於 1 —— 夾住就是了：
       這條路本來就是「先出聲比較重要」的權宜之計。
     ⚠ 這裡不乘 master 與分軌音量：那兩個在 Web Audio 匯流上，HTMLAudio 走不到。
       近似值比沒有聲音好，但**別把它當成正規路徑**。 */
  try{ const a=new Audio(src); a.volume=Math.max(0, Math.min(1, (gain==null?0.9:gain)));
       const p=a.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){}
}
/* ⚠ `export`（ver -429）：戰鬥內的對白（`modules/tutorial.js`）也要放音效，而
   **音效名 → 檔案的那張表只有這裡一份**（`SE_FILES`／`SE_ALIAS`，鐵律 7）。
   抄一份到 tutorial 去必然走鐘（改了檔名只改得到一邊）。 */
export function playSe(spec){
  const one=(n,delay)=>{ const src=seSrc(n);
    if(!src){ const tag='se/'+n;
      if(!missingExpr.has(tag)){ missingExpr.add(tag); console.info('[story] 沒有這個音效：', n); }
      return; }
    /* ⚠⚠ **增益要帶**（ver -441）：以前這裡是 `SFX.play(src)`＝增益 1，
       而這一批（`SE_FILES`）沒有 ASSETS 鍵、拿不到舊的 `sfxGain` ——
       於是整批以母帶的響度播出。實測 `se_steps` −32 LUFS、`se_walk` −34，
       比拉平後的目標低了 12~14 dB ＝ **在手機上根本聽不見**
       （Ray：「跌倒音跟跑步音永遠不出來」，一直被當成預載沒趕上）。
       ⚠ `fileGain` 的鑰匙是檔名，所以路徑丟進去就有值（鐵律 7）。 */
    const g=fileGain(src);
    const go=()=>{ try{ if(SFX.ready && !SFX.ready(src)) playSeFallback(src, g); else SFX.play(src, g); }catch(_){} };
    if(delay>0) setTimeout(go, delay); else go(); };
  if(!spec) return;
  if(Array.isArray(spec)) spec.forEach(x=> typeof x==='string' ? one(x,0) : one(x.n, x.delay||0));
  else one(spec, 0);
}
/* ══ 同拍疊播、跟著主音收（ver -508，Ray：「se_metalclip 應該播這個才對，跟 gear
   一起，但是 se_metalclip 停了 gear 就要停」）══
   `main` 照常播；`follow` 用**可中止的 cue** 疊上去，主音的長度一到就把 cue 淡掉
   （同 Kerberos 之門收齒輪的作法：齒輪素材 6.9 秒，不收會自己響完）。
   長度問 `SFX.duration`（鐵律 7：真相在音檔身上）；還沒解碼就退 1.5 秒。 */
export function playSePair(main, follow){
  playSe(main);
  const fsrc=seSrc(follow);
  if(!fsrc){ playSe(follow); return; }
  let cue=null;
  try{ cue=SFX.playCue(fsrc, fileGain(fsrc)); }catch(_){ playSe(follow); return; }
  const ms=(SFX.duration && SFX.duration(seSrc(main))) || 1500;
  setTimeout(()=>{ try{ cue.fade(120); }catch(_){} }, ms);
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
  /* ⚠⚠ **持續抖不受 `stopFx` 管**（ver -638）：它是跨句的狀態（見 `shakeHold`），
     而 `stopFx` 是「上一句的一次性演出收掉」—— 每推一句就把它收掉的話，
     Ray 要的「點擊推進對話也要繼續」就永遠做不到。 */
  if(st && !sustainShake){ clearTimeout(st.__shakeT); st.classList.remove('shake','hold'); }
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
  /* 腳本備註「震動」但畫面不抖（ver -398，Ray：「我備註震動時震動」）。
     ⚠ 與 `shake` 分開：有時候要的是「手上感覺到」而不是「畫面在晃」。 */
  if(line.checkpoint) lineCheckpoint();   // 腳本上的存檔點（ver -653，見 lineCheckpoint）
  if(line.vibrate) hap.shake();
  /* ══⚠⚠ **持續震動**（ver -638，Ray：「蕾娜的！！之前的畫面震動要持續 10 秒，
     點擊推進對話也要繼續」「直到進戰鬥停止」）══
     腳本寫 `shakeHold:<毫秒>`。它與 `shake` 是**兩件事**：
       · `shake`     ＝這一拍抖一下（一次性，`stopFx` 會收掉）
       · `shakeHold` ＝**跨句的狀態**，一路抖到「進戰鬥」或時間到為止
     ⚠ 收尾有三個出口，全部走 `stopShake()`（鐵律 8）：
       進戰鬥（`line.battle` 那一支）／換場（`playScene`）／離場（`close`）。
     ⚠ 計時器**不進 `fxTimers`**：那一組是給一次性演出用的，每推一句就被清掉。 */
  /* 跨句的染色（ver -664）：只有寫了才動；沒寫的拍不會把它收掉。 */
  if(line.tintHold!==undefined) setTint(line.tintHold||null);
  if(line.shakeHold>0){
    hap.shake();
    const st=$('storyStage');
    if(st){
      clearTimeout(st.__shakeT);
      st.classList.remove('shake','hold'); void st.offsetWidth;
      st.classList.add('shake','hold');
      sustainShake = true;
      st.__shakeT = setTimeout(stopShake, line.shakeHold);
    }
  }
  if(line.shake){
    hap.shake();                 // 畫面震動＝手上也震（Ray 指定）
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
/* ⚠⚠ `top.ar` / `top.dip` 與 `flight/index.html` 的 `FKERB` **是同一組數字** ——
   飛行頁是另一個 HTML（非 module），import 不到這一份，只能各存一份。
   **改圖重跑 tools/kerberos_cut.py 之後，兩邊都要貼**（鐵律 7 的但書：兩邊註解互指）。 */
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
/* 吊墜（ver -411，Ray 指定）。⚠ `ar` 是**那張圖**的高寬比（1536/1024），量出來的；
   `fill` 是「左側空隙要吃掉幾成」—— Ray：「在不擺動的狀況下不可碰觸到圓盤」，
   所以留了 14% 的餘裕，不要調到 1。`drop` 是吊掛點往下離門頂多遠（佔門高）：
   0 會讓鏈子的頂端正好在門頂，被楣壓住一點才像是從楣底下垂下來的。 */
/* 齒輪（ver -413／-414，Ray 指定）。⚠⚠ **這裡沒有位置與大小** —— 兩顆齒輪的圓心與半徑
   都是 `layoutKerberos` 解出來的（大：右上三角區的內接圓；小：同時咬住團徽與大齒輪、
   且避開鉚釘的最小惰輪）。
   ⚠ `bite`＝小齒輪要**咬進**團徽多少 px（Ray：「小齒輪的邊要稍稍被團徽壓到」）——
     它排在 `#kerbPlate` 之前，所以壓過去的那一小段自然被團徽蓋住，看起來就是嵌進去的。 */
/* ⚠ `bandC`／`size`／`gap` 於 ver -414 **拿掉了** —— 大齒輪的位置與大小改成
   「右上三角區的內接圓」解出來的（見 layoutKerberos），不再有可調的落點。
   剩下的只有 `bite`：小齒輪要咬進團徽多少 px（Ray：「邊要稍稍被團徽壓到」）。 */
/* ══ 齒輪（ver -417，Ray 直接在門的圖上標了位置與大小）══════════════════
   ⚠⚠ **座標是「門圖上的比例」，不是螢幕比例**（同紋章／箭／鉚釘那一套）——
     Ray 給的是一張門的貼圖，上面畫著齒輪該在哪、多大。門比畫面寬（`Wd ≥ W`），
     拿螢幕比例去擺會隨機器長寬比在門上滑動。
   ⚠⚠ **不要再解「內接圓」了**（ver -414~-416 那一套已經拿掉）：Ray 的指示是
     「**先以 UI 美觀做大小位置放置準則**」—— 位置與大小是**設計決定**，
     不是幾何最佳化的結果。解出來的那顆又大又居中，他退了兩次。
   ⚠ **小齒輪只有一顆**（ver -418，Ray：「兩個小齒輪太醜了」→「還是要有一個小齒輪
     接到團徽下方」）。它咬在團徽的**右下**（`smAngle`＝從水平往下量的角度），
     ⚠ 為什麼不放正下方：門的中縫在 0.506，正下方會**跨在縫上** —— 開門那一拍
       小齒輪會被撕成兩半。放右下就整顆待在右半扇上。
     ⚠ 角度也要閃開 4 點鐘那顆鉚釘（`r4`）：60° 時距離 48.6，需要 24.75，很寬裕。
     cx/cy 佔門的寬／高，d／smD 佔門寬，smAngle 是度。 */
/* ⚠⚠ ver -419：**齒輪的大小與位置由吊墜推出來**（Ray：「齒輪位置大小依據吊墜調整，
   使兩邊看起來平衡」）—— 左邊掛吊墜、右邊嵌齒輪，兩個是一對配件，所以只留**一組**
   設計數字（吊墜），另一邊鏡射過去。ver -417 那組寫死的 `cx/cy/d` 因此拿掉。
     rel    齒輪直徑 ÷ 吊墜寬
     smRel  小齒輪直徑 ÷ 齒輪直徑
     smAngle 小齒輪咬在團徽的哪個角度（度，從水平往下量；60°＝右下，Ray 指定「團徽下方」）
   ⚠ 位置：**橫向鏡射吊墜的中心**（左緣到吊墜 ＝ 右緣到齒輪），
     **縱向對齊吊墜的「身體中心」**（不是圖框中心 —— 圖的上面 12% 是鏈子）。 */
/* ⚠⚠ **小齒輪是惰輪：同時咬住團徽與大齒輪**（ver -420，Ray：「小齒輪要連結大齒輪跟
   團徽啊」）。所以它的半徑與位置**不能填**，是解出來的：兩個圓都相切 →
   圓心落在兩條軌跡的交點，半徑越大離「兩圓心連線」越遠。
   ⚠⚠ **為什麼它沒辦法很小**：2 點鐘那顆鉚釘（`r2`）幾乎正好落在「團徽圓心 → 右上角」
     那條線上（實測鉚釘在 −40.8°、大齒輪在 −45.8°，只差 5°），而惰輪最小的時候正好
     **在那條線上** —— 一定壓到它。要閃開就得把惰輪撐大讓它滾到線的一側。
     實測最小可行半徑 20.3（＝大齒輪的 0.74 倍）。
   ⚠ `smAllowRivet:true` ＝ 允許壓過鉚釘，惰輪就能縮到 0.61 倍（⌀34）。
     兩者只能二選一（見 HANDOFF 的說明），開關留在這裡。 */
const KERB_GEAR={ rel:0.92, bodyC:0.45, smAllowRivet:false };
const KERB_PEND={
  ar:1536/1024,   // 那張圖的高寬比（量出來的）
  bandC:0.145,    // 吊墜中心在畫面寬的哪個比例（ver -412 由 0.115 往右，Ray 指定）
  /* ⚠⚠ **吊墜是那一組的基準**（ver -419 由 -418 反過來）：齒輪的大小與位置都是從它推的
     （見 `KERB_GEAR`）。所以這裡是唯一填設計數字的地方。 */
  wantW:0.155,    // 設計寬度（佔畫面寬）
  maxW:0.32,      // 保險上限 —— 空間不夠時由輪廓那一段再往下收
  drop:0.004,     // 吊掛點離門頂多遠（佔門高）：鏈子頂端被楣壓住一點才像從楣底下垂下來
  /* ⚠⚠ **輪廓**（`[y佔圖高, 半寬佔圖寬]`，由那張圖的 alpha 逐列量出來）。
     為什麼不用外框：這個吊墜是個 X 形 —— **最寬的地方在很上面**（y=0.21 半寬 0.49），
     往下越來越窄，0.79 以下只剩一根細刺（半寬 0.03）。拿外框去閃圓盤的話，
     等於用「右下角那一大塊空白」去頂著圓盤，吊墜會被壓成只剩一半大、細節全糊掉。
     ⚠ 只列右半（左半對稱，而圓盤在右邊，只有右半會撞到）。 */
  prof:[[0.13,0.41],[0.17,0.45],[0.21,0.49],[0.25,0.45],[0.31,0.40],[0.38,0.31],
        [0.44,0.24],[0.48,0.36],[0.52,0.25],[0.58,0.21],[0.65,0.27],[0.69,0.35],
        [0.75,0.26],[0.78,0.18],[0.86,0.03],[1.00,0.01]],
};
const KERB_ARROWS=['n','e','s','w'];             // 箭：正四向
const KERB_RIVETS=['r10','r2','r4','r8'];        // 鉚釘：10/2/4/8 點鐘，依這個順序彈開
let kerbReady=false;
let kerbGearWarned=false;    // 齒輪撞鉚釘只警告一次（layout 每次 resize 都會跑）

/* 幾何：門要多寬，是**解出來的**不是調出來的 ——
   兩個條件同時成立：①圓盤圓心落在下半面板正中 ②升到頂時蓋滿整個畫面。
     令 cy＝圓心佔門高的比例、AR＝門的高寬比
     門頂 = 面板中心y − cy·AR·Wd，要求 ≤ 面板頂 → Wd ≥ (面板高/2)/(cy·AR)
   再與「至少要有畫面那麼寬」取大的。上升距離就是門頂那個值（升完門頂貼齊 y=0）。
   ⚠ 每次開場與 resize 都要重算 —— 面板高吃 safe-area，寫死在瀏海機上會錯位。
   ⚠ 要在舞台已經 `.on` 之後才量，display:none 的元素量出來全是 0。 */
/* ══ 幾何覆寫（ver -388）══════════════════════════════════════════════
   飛行頁交棒過來的那一場：門是**在飛行頁解出來的**（那一頁沒有「下半面板」，
   它的條件是「推到頂要蓋得滿畫面」）。這邊照自己的公式再算一次會得到不同的寬度
   （實測差 8.6%），交棒那一格紋章就會忽然變大 —— 那正是鐵律 7 說的「兩處各算一次」。
   所以：**算的那一支發佈出去，這邊只讀**（`fkerbGeom` → `showKerbGate(geom)`）。
   ⚠ 用完要清（`clearKerbForce`），否則之後的劇情場次會沿用飛行頁那組尺寸。 */
let kerbForce=null;
function layoutKerberos(){
  const st=$('storyStage'), kb=$('kerb'), dr=$('kerbDoor'), bd=$('storyBoard');
  if(!st || !kb || !dr || !bd) return;
  const R=st.getBoundingClientRect(), B=bd.getBoundingClientRect();
  const W=R.width, panelTop=B.top-R.top, panelH=B.height;
  if(!W || !panelH) return;
  const AR=KERB_META.h/KERB_META.w;
  const P=KERB_META.plate, cy=P.y+P.h/2;
  const Wd=kerbForce ? kerbForce.Wd : Math.max(W, (panelH/2)/(cy*AR));
  const Hd=Wd*AR;
  const top=kerbForce ? kerbForce.top : (panelTop + panelH/2 - cy*Hd);
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
  /* ── 吊墜（ver -411）──
     ⚠⚠ 左側能用的寬度是**「畫面左緣 → 圓盤左緣」**，那是解出來的（門比畫面寬時
       `dx` 是負的，圓盤會往左靠）—— CSS 猜不到，所以在這裡算好寫成 inline（鐵律 7）。
     ⚠ 吊掛點是圖的**上緣中點**（實測鏈子中心 x=511.5/1024，正好是中線），
       所以 `transform-origin:50% 0` 就是那個點，元素本身只要擺對位置。 */
  let pendW=0, pendCx=0, pendTop=0;     // 吊墜的實際尺寸／位置（齒輪要鏡射它，見下）
  const pd=$('kerbPend');
  if(pd){
    /* ⚠⚠ **「不碰到圓盤」要對著圓、不是對著方框**（Ray 指定）。圓盤的外框左緣很靠左，
       但吊墜掛在**它的上方**，那一段圓周是縮進去的 —— 拿方框當界線會把吊墜壓成
       只剩一半大，細節全糊掉。所以：解出「與圓周保持 `clear` 距離」的最大寬度。
       圓心與半徑都由圓盤那一組數字來（鐵律 7），這裡不另外量。 */
    const cx = (P.x+P.w/2)*Wd + dx;                   // 圓心（螢幕座標）
    const cy = (P.y+P.h/2)*Hd;
    const r  = pW/2;
    const top = KERB_PEND.drop*Hd;
    const clear = Math.max(4, W*0.010);              // 與圓周的最小距離
    const pcx = W*KERB_PEND.bandC;                   // 吊墜中心（螢幕座標）
    const fits = w => {
      const h = w*KERB_PEND.ar;
      for(const [fy, fh] of KERB_PEND.prof){
        if(Math.hypot(cx-(pcx+fh*w), cy-(top+fy*h)) <= r + clear) return false;
      }
      return true;
    };
    /* 由大往小試（步進 1px）：第一個過關的就是答案。
       ⚠ 起點是**設計寬度**（`wantW`）；輪廓那一段只負責「真的塞不下時往下收」。 */
    const want = Math.min(W*KERB_PEND.maxW, W*KERB_PEND.wantW);
    let pw = 0;
    for(let w=Math.round(want); w>=14; w--){ if(fits(w)){ pw=w; break; } }
    pd.style.width = pw+'px';
    pd.style.height= (pw*KERB_PEND.ar)+'px';
    /* 橫向錨在畫面左側的 `bandC`（佔畫面寬的比例）；`left` 是門座標，要把 dx 扣回去。 */
    pd.style.left  = (pcx - pw/2 - dx)+'px';
    pd.style.top   = top+'px';
    /* ⚠ **飛行交棒來的門不掛吊墜**（ver -485，Ray：「飛行畫面彈出的槍棺不應該有
       掛飾」——飛行頁那一半自 -481 起吊墜固定在面板上，接手的這一半也不掛，
       交棒前後才是同一扇門）。尺寸照算（齒輪的大小位置由它推，鐵律 7），只藏顯示。 */
    pd.style.display = (pw>=14 && !kerbNoPend) ? '' : 'none';
    pendW=pw; pendCx=pcx; pendTop=top;                // 發佈給齒輪（鐵律 7：算的那一支發佈）
  }
  /* ── 齒輪（ver -419）── **大小與位置都由吊墜推出來**（Ray：「依據吊墜調整，
     使兩邊看起來平衡」）：
       直徑 ＝ 吊墜寬 × `rel`
       橫向 ＝ 鏡射吊墜的中心（左緣到吊墜 ＝ 右緣到齒輪）
       縱向 ＝ 對齊吊墜的**身體中心**（圖的上面 12% 是鏈子，用圖框中心會偏高）
     ⚠ 這裡沒有可調的落點 —— 要動就動吊墜那一組（`KERB_PEND.wantW` / `bandC`）。
     ⚠ 轉速由半徑比來（嚙合 ω ∝ 1/r）：團徽轉 180°，齒輪與小齒輪各自 180·(r團徽/r)，
       方向與團徽相反。 */
  const gb=$('storyExit'), gsm=$('kerbGearSm');
  if(gb && pendW>0){
    const gr  = pendW*KERB_GEAR.rel/2;
    const gcx = (W - pendCx) - dx;                     // 螢幕鏡射 → 換回門座標
    const gcy = pendTop + KERB_GEAR.bodyC*pendW*KERB_PEND.ar;
    gb.style.width=(gr*2)+'px'; gb.style.height=(gr*2)+'px';
    gb.style.left=(gcx-gr)+'px'; gb.style.top=(gcy-gr)+'px';
    gb.style.display='';
    const er=pW/2, ecx=(P.x+P.w/2)*Wd, ecy=(P.y+P.h/2)*Hd;
    kb.style.setProperty('--kerb-gear-rot', (-180*er/gr).toFixed(1)+'deg');
    /* 小齒輪：咬在團徽上（`smAngle`）。⚠ 位置是「團徽圓心 ＋ (er+sr−bite) 沿那個角度」，
       所以它一定貼著團徽；`bite` 讓邊緣被團徽壓住（齒輪排在團徽之前）。 */
    if(gsm){
      /* 惰輪：同時與團徽、大齒輪相切。半徑由最小可行值往上加，
         第一個「離鉚釘與邊界都夠遠」的就是答案（允許壓鉚釘時第一個就成立）。 */
      const RV=[];
      for(const k of KERB_RIVETS){ const b2=KERB_META.rivets[k];
        RV.push([b2.cx*Wd, b2.cy*Hd, Math.max(b2.w*Wd, b2.h*Hd)/2]); }
      const M=Math.max(3, W*0.008), rightX=W-dx;
      const topY=1 + (W*KERB_META.top.ar)*KERB_META.top.dip;
      const D=Math.hypot(gcx-ecx, gcy-ecy), sMin=(D-er-gr)/2;
      let sol=null;
      for(let i=0; i<=140 && !sol; i++){
        const sr=sMin + i*Math.max(0.4, W*0.0012);
        const r1=er+sr, r2=sr+gr;
        if(r1+r2 < D) continue;
        const a2=(r1*r1-r2*r2+D*D)/(2*D), h2=r1*r1-a2*a2;
        if(h2<0) continue;
        const h=Math.sqrt(h2), mx=ecx+a2*(gcx-ecx)/D, my=ecy+a2*(gcy-ecy)/D;
        for(const sg of [1,-1]){
          const sx=mx+sg*h*(gcy-ecy)/D, sy=my-sg*h*(gcx-ecx)/D;
          let cl=Math.min(rightX-M-sx-sr, sy-(topY+M)-sr);
          if(!KERB_GEAR.smAllowRivet)
            for(const [rx,ry,rr] of RV) cl=Math.min(cl, Math.hypot(sx-rx,sy-ry)-rr-sr-M);
          if(cl>0){ sol={sr,sx,sy}; break; }
        }
      }
      if(sol){
        gsm.style.width=(sol.sr*2)+'px'; gsm.style.height=(sol.sr*2)+'px';
        gsm.style.left=(sol.sx-sol.sr)+'px'; gsm.style.top=(sol.sy-sol.sr)+'px';
        gsm.style.display='';
        kb.style.setProperty('--kerb-gear-rot-s', (-180*er/sol.sr).toFixed(1)+'deg');
        /* 惰輪在鏈上多一級 → 大齒輪的方向要翻回來（團徽 + → 惰輪 − → 大齒輪 +）。 */
        kb.style.setProperty('--kerb-gear-rot', (180*er/gr).toFixed(1)+'deg');
      }else{
        gsm.style.display='none';
        if(!kerbGearWarned){ kerbGearWarned=true;
          console.warn('[kerb] 找不到能同時咬住團徽與大齒輪、又閃得開鉚釘的惰輪'); }
      }
    }
    /* 右半扇開門走的距離（左半扇是 `--kerb-open-x`）：`.kerb-half.r` 是 `translateX(104%)`
       而它的寬度是門的一半 —— 齒輪要跟著它走，就得換算成同一個 px（% 是相對自己的寬）。 */
    kb.style.setProperty('--kerb-open-rx', (Wd/2*1.04)+'px');
    /* ⚠ 驗算：不可以壓到鉚釘。撞到只警告一次 —— 動吊墜那一組的人才知道弄壞了什麼。 */
    if(!kerbGearWarned){
      for(const k of KERB_RIVETS){ const b2=KERB_META.rivets[k];
        const rr=Math.max(b2.w*Wd, b2.h*Hd)/2;
        if(Math.hypot(gcx-b2.cx*Wd, gcy-b2.cy*Hd) < gr+rr){
          kerbGearWarned=true; console.warn('[kerb] 齒輪壓到鉚釘', k, '—— 調 KERB_PEND.wantW/bandC'); }
      }
    }
  }else if(gb){ gb.style.display='none'; if(gsm) gsm.style.display='none'; }
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
    const tpTop = 1-th+th*KERB_META.top.dip;          // 楣的上緣（門座標）
    tp.style.left=(-dx)+'px'; tp.style.top=tpTop+'px';
    kb.style.setProperty('--kerb-top-h', th+'px');
    /* ⚠⚠ **clip 的起點要用楣的實際上緣**，不能用「面板頂 − 楣高」（ver -364）。
       兩者只有在「門頂剛好等於面板頂」時才相等，而門多高是 layoutKerberos 依實際尺寸
       **解出來**的 —— 這一版的視窗比例下實測門頂 447、面板頂 494，差了 47px，
       於是 clip 從 432 開始、楣卻從 393 開始 → **楣的上緣 39px 被自己的容器切掉**。
       Ray 回報「楣又被遮了」就是這個：不是被立繪蓋住，是被裁掉，
       露出來的是後面的立繪與背景。 */
    st.style.setProperty('--kerb-clip-top', (top + tpTop) + 'px');
    /* ⚠ 也發佈到 `:root`（ver -404）：城鎮店舖那張靠左停的單子（`#lootSheet.dock-left`）
       是 body 底下的兄弟元素，讀不到 `#storyStage` 上的變數，而它的高度上限正是
       「楣的上緣」。**同一個解，兩個地方讀**（鐵律 7：算的那一支發佈出去，
       不要讓別人用等價的式子再算一次）。 */
    document.documentElement.style.setProperty('--kerb-clip-top', (top + tpTop) + 'px');
    kb.style.setProperty('--kerb-clip-top', (top + tpTop) + 'px');
    /* ⚠ 也寫到舞台上：對話框要拿它把底邊錨在楣的上緣（見 style.css 的 #storyBubble）。
       CSS 變數只往**子孫**繼承，寫在 #kerb 上對話框讀不到。 */
    st.style.setProperty('--kerb-top-h', th+'px');
  }
  if(!kerbReady){
    kerbReady=true;
    const src={ kerbPlate:'kerberos_plate', kerbTop:'kerberos_top', kerbPendImg:'kerberos_pendant',
                kerbGearImg:'kerberos_gear' };
    for(const id in src){ const el=$(id); if(el) el.src=KERB_DIR+src[id]+'.webp'; }
    const gsi=$('kerbGearSm'), gsimg=gsi && gsi.querySelector('img');
    if(gsimg) gsimg.src=KERB_DIR+'kerberos_gear.webp';
    const gbb=$('storyExit');
    if(gbb) gbb.style.setProperty('--kg-mask', 'url("'+KERB_DIR+'kerberos_gear.webp")');
    /* 高光的遮罩＝**吊墜自己那張圖**（鐵律 7：路徑只有 `KERB_DIR` 這一份）。 */
    const pdw=$('kerbPend');
    if(pdw) pdw.style.setProperty('--kp-mask', 'url("'+KERB_DIR+'kerberos_pendant.webp")');
    bindPend();
    for(const k of KERB_ARROWS){ const a=kb.querySelector('.kerb-arrow.'+k); if(a) a.src=KERB_DIR+'kerberos_arrow.webp'; }
    for(const k of KERB_RIVETS){ const r=kb.querySelector('.kerb-rivet.'+k); if(r) r.src=KERB_DIR+'kerberos_rivet.webp'; }
  }
}

/* ══ 吊墜被甩一下（ver -411）══════════════════════════════════════════
   Ray：「槍棺上彈、開、閉的時候進行自然的劇烈擺動」。
   ⚠ **只有這一支**（鐵律 8）：三個時機都叫它，不要各寫一段動畫。
   ⚠ `amp` 是「這一下有多重」—— 撞頂最重、開關門次之、起步最輕。
   ⚠ 要 reflow（`void offsetWidth`）才重播得動：同一個 class 再加一次，
     瀏覽器不會重新開始動畫。 */
/* 吊墜按下去 ＝ 開整備頁（換搭檔／換副武器）。
   ⚠ 綁一次就好（`__bound`）：`layoutKerberos` 每次 resize 都會跑。
   ⚠ 推棺之後不能按（CSS 的 `#kerb.rise #kerbPend`），與齒輪同一條規矩。 */
/* ══⚠⚠ 槍棺上那兩顆功能鍵**不是「點畫面」**（ver -440）══════════════════
   Ray：「在槍店的整備教學點吊墜第一下會先跳買賣出來，應該直接跳整備畫面。」
   ⚠⚠ 成因：`stopPropagation` 只擋了 **click**，而「點畫面」聽的是 **pointerup** ——
     城鎮那一支（`modules/town.js` 的 `st.pointerup`：店裡點畫面＝把買賣鈕交還）
     與劇情的推進都在那一發上。於是按吊墜等於同時按了畫面：買賣鈕先跳出來，
     而教學要的「先整備、單子押後」整個被繞過去。
   ⚠ 三種事件一起擋（down/up/click）：面盤的手勢（按住下拉＝加速、右滑＝自動）
     是從 pointerdown 起算的，從鈕上起手不該被算成手勢。
   ⚠ 收成**一支**（鐵律 8）：吊墜、齒輪、日後任何長在槍棺上的鈕都叫它，
     不要每顆各記得擋一次 —— 漏掉的那一顆就是下一個同款 bug。 */
function swallowTap(el){
  if(!el || el.__swallow) return;
  el.__swallow=true;
  el.addEventListener('pointerdown', e=>e.stopPropagation());
  el.addEventListener('pointerup',   e=>e.stopPropagation());
}
function bindPend(){
  const pd=$('kerbPend'); if(!pd || pd.__bound) return;
  pd.__bound=true;
  swallowTap(pd);
  pd.addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.unlock(); }catch(_){}
    if(prepOpener) prepOpener();
  });
}

export function kerbPendSwing(amp, dur){
  const pd=$('kerbPend'); if(!pd) return;
  const sw=pd.querySelector('.kp-swing'); if(!sw) return;
  pd.style.setProperty('--kp-amp', (amp||14)+'deg');
  pd.style.setProperty('--kp-dur', (dur||2.2)+'s');
  sw.classList.remove('swing'); void sw.offsetWidth; sw.classList.add('swing');
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
                 open:'se_Kerberos_open', steam:'se_Kerberos_steam',
                 /* 關門用（ver -366，Ray：「不要有蒸氣，原蒸氣音改為 se_metalclip」）。
                    ⚠ 只用在**關門**那一套；進場那一套維持原樣（Ray 沒要求改）。 */
                 clip:'se_metalclip' };
/* ⚠ 門的五支音效**全部是 m4a**（ver -384 全部重轉 AAC，原本 256kbps 的 mp3）。
   預設改成 m4a，例外表留著給日後不同副檔名的素材用。
   ⚠ 改副檔名要三個地方一起改：這裡的預設、下面 `playKerberosClose` 裡那一行
     寫死 `.mp3` 的齒輪音、以及預載清單（1469 行那一段）—— 前兩者以前不一致過。 */
const KERB_SFX_EXT={};   // 預設 m4a，例外寫這裡
const KERB_SE_T={ popPeak:1002, openTail:1921 };
const KERB_T={ rise:1000, thud:420, rivet:460, arrow:340, lift:1600, open:900 };
let kerbTimers=[];
let kerbPlaying=false;   // 演出期間鎖住點擊推進（不然一點就跳到下一句，門還開著）
let kerbGear=null;       // 齒輪聲的把手（演出中止時要收掉，見 stopKerberos）
/* ══ 門開期間戰鬥不計時（ver -466，Ray：「槍棺動畫的時候延時就在偷跑了，
   要在槍棺全開以後才開始計時」）══
   onGap（底下開戰）那一拍立刻把戰鬥真暫停，門全開才放行 —— 延時倒數、攻擊圈、
   碼表、敵大絕排程全部等門。掛在 playKerberos **這一支**（鐵律 8）：
   開門演出的所有路徑（劇情插入戰、飛行頁交棒）都經過這裡，各呼叫端不必自己記。
   由 main.js 用 setGateHold 注入 combat 的 pauseForDialog/resumeFromDialog
   （story 不 import combat，維持依賴方向）。 */
let gateHold=null;       // {pause, resume}
let kerbHeld=false;      // 門正押著戰鬥（中止演出時要放行，否則戰鬥凍死）
/* 這一扇門是**飛行交棒來的** → 不掛吊墜（ver -485）：showKerbGate／FromRisen 設，
   回到劇情側的門（playKerberos 非 fromRisen）清。layoutKerberos 讀它決定顯示。 */
let kerbNoPend=false;
export function setGateHold(o){ gateHold = o || null; }
/* ══⚠⚠ 這一場要不要演開棺（ver -585，Ray：「城鎮戰內打掉一個怪不用閉棺，
   打掉 Boss 才閉」）══ 連續戰鬥（`config.battles[].session`）在段落**開始**時演一次，
   段落之內每一格直接接上去 —— 一格演一次開棺，五格就是五次儀式，那不是同一場戰鬥。
   ⚠ 判定的**真相在 combat**（`state.battleSession`，鐵律 7），這裡只問；
     由 `main.js` 注入（story 不 import combat，維持依賴方向）。
   ⚠ 沒注入＝一律演（舊行為），所以漏接不會壞。 */
let gateSkip=null;
export function setGateSkip(fn){ gateSkip = fn || null; }
function gatePause(){ if(gateHold && !kerbHeld){ kerbHeld=true; gateHold.pause(); } }
function gateResume(){ if(kerbHeld){ kerbHeld=false; gateHold && gateHold.resume(); } }
function stopKerberos(){
  kerbPlaying=false;
  gateResume();          // 演出被中止：把押著的戰鬥放行（冪等；正常結束時已放行過）
  if(kerbGear){ try{ kerbGear.stop(120); }catch(e){} kerbGear=null; }
  kerbTimers.forEach(clearTimeout); kerbTimers=[];
  const kb=$('kerb'), st=$('storyStage'), sm=$('kerbSmoke');
  if(kb) kb.classList.remove('rise','full','unlock','lift','open','glow','kerb-shut');
  if(sm) sm.innerHTML='';
  if(st) st.classList.remove('kerb-open');
}
/* `opts.fromRisen`（ver -387）：**門已經在飛行頁推上來了** —— 從「已推到頂」的狀態
   接下去演（撞頂 → 解鎖 → 圓盤 → 開門），不重演上推、也不再播一次撞擊音。
   ⚠ 起始狀態要在 `kerb-instant` 之下擺（同 `playKerberosClose`），否則一掛上 class
     就會從沉在底下的狀態演一次上推。 */
function playKerberos(onGap, onDone, opts){
  const kb=$('kerb'), st=$('storyStage');
  if(!kb || !st){ onGap&&onGap(); onDone&&onDone(); return; }
  const fromRisen = !!(opts && opts.fromRisen);
  if(!fromRisen) kerbNoPend=false;   // 劇情側自己的門：吊墜照掛（ver -485）
  stopKerberos(); layoutKerberos();
  kerbPlaying=true;
  /* ⚠ 槍棺一動，對話框就要**先消失**（Ray 指定，且「以後推槍棺都要這樣處理」）——
     門推上來會蓋掉整個畫面，框留著等於一句台詞被門壓在底下。
     打字機也要停，不然框收了字還在跑。 */
  clearInterval(typing); typing=null;
  const bub=$('storyBubble'); if(bub) bub.style.visibility='hidden';
  const at=(ms,fn)=>kerbTimers.push(setTimeout(fn,ms));
  /* ⚠ 查不到就**不要拼路徑**（ver -344）：`se('arrow')` 沒有素材，原本會拼出
     `resources/audio/se/undefined.mp3` → 404 → 拿到一頁 HTML 去 decodeAudioData
     → console 一個 EncodingError。每次進戰鬥都白發一次請求。
     缺素材是常態（門的箭聲還沒做），所以查不到＝安靜跳過，只記一次。 */
  const src=k=>KERB_SFX[k] ? KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'m4a') : null;
  const se=k=>{ const u=src(k); if(!u){ const tag='kerb/'+k;
      if(!missingExpr.has(tag)){ missingExpr.add(tag); console.info('[story] 門的音效尚無素材：', k); }
      return; }
    try{ SFX.play(u, fileGain(u)); }catch(e){} };   // 逐支增益：config 那一份（ver -441）
  let t=0;
  if(fromRisen){
    /* ①' 飛行頁已經推完了：直接擺成「推到頂」，撞擊音也已經在那邊播過。 */
    kb.classList.add('kerb-instant');
    kb.classList.add('rise','full');
    void kb.offsetWidth;
    kb.classList.remove('kerb-instant');
  }else{
    /* ① 撞擊音：立刻播，撞擊峰值（1002ms）正好落在門撞頂那一瞬（rise 也是 1000ms）。 */
    se('pop');
    kb.classList.add('rise','full');                     // ① 槍棺上推（楣跟著走）
    /* 吊墜：門往上竄，它因為慣性落後 → 先往外盪（ver -411）。起步這一下最輕。 */
    kerbPendSwing(9, 2.0);
    t+=KERB_T.rise;
  }
  at(t,()=>{                                             // ② 撞頂：震動＋門縫透出十字亮光
    /* ⚠ 戰鬥音樂在**撞頂之後**才進（ver -356，Ray 指定；-355 曾放在「開始上推」那一瞬）。
       上推那一秒還是劇情的餘韻，音樂壓在撞擊上等於把那一下的重量分掉；
       撞頂＝門被頂開的那一刻，音樂從這裡起來才是「戰鬥開始」。 */
    riseCue();
    hap.kerbThud();              // 撞頂：全場最重的一下（ver -398，Ray 指定）
    kerbPendSwing(22, 2.6);      // 吊墜也是：撞頂＝甩得最兇的那一下（ver -411）
    st.classList.remove('shake','hold'); void st.offsetWidth; st.classList.add('shake');
    kerbTimers.push(setTimeout(()=>st.classList.remove('shake'), KERB_T.thud));
    kb.classList.remove('glow'); void kb.offsetWidth; kb.classList.add('glow');
    /* 齒輪聲**從撞頂就開始**（Ray 指定）——機關是撞到頂才被頂開的，
       聲音比畫面早一步起來才像「裡面的東西動起來了」。收在旋轉結束（見下）。 */
    try{ const g=src('gear'); kerbGear = g ? SFX.playCue(g, 1) : null; }catch(e){ kerbGear=null; }
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
    gatePause();   // 開戰即押住（同一拍，計時器一毫秒都不偷跑）；門全開放行（ver -466）
  });
  t+=260;                                                // 給底下一拍把畫面建起來
  const openAt = t;
  at(t,()=>{ kb.classList.add('open'); kerbPendSwing(15, 2.2); });   // ⑥ 開門（吊墜跟著甩）
  /* 開門音：可聞段收在 1921ms，要讓它**結束在門全開的那一刻** → 往回推。
     推出來的時間點通常落在旋轉那一段，與齒輪重疊 —— Ray 說可以重疊。
     ⚠ 夾在 0 以上：畫面時序若被縮短到比音檔還短，就從頭播（寧可提前，不要不播）。 */
  at(Math.max(0, openAt + KERB_T.open - KERB_SE_T.openTail), ()=>se('open'));
  t+=KERB_T.open;
  at(t,()=>{ gateResume(); onDone&&onDone(); });          // 門全開 → 計時開始（ver -466）
}

/* ══ 飛行頁交棒過來的那一場：門是**在飛行頁推上來的**（ver -387）══════════
   飛行頁與主遊戲是兩個 HTML，中間隔著一次跳頁 —— 所以上推在那邊演完，這邊接手時
   槍棺已經蓋滿畫面。這兩支就是那個交棒：
     `showKerbGate()`        擺出「已推到頂」的靜止畫面（讀取期間玩家看到的就是它）
     `playKerberosFromRisen` 接著演完（撞頂 → 解鎖 → 圓盤 → 開門）
   ⚠ 為什麼要有一顆「點一下」擋在中間：跳頁＝新的 document，音訊要**這一頁的**
     使用者手勢才解得開（iOS 一定要）。門的齒輪／開門音、戰鬥 BGM 全靠它。
   ⚠ 舞台要自己開（`on` ＋ `story-on`）：這條路徑不經過 `open()`，劇情層本來是收著的。 */
export function showKerbGate(geom){
  const st=$('storyStage'), kb=$('kerb');
  if(!st || !kb) return;
  /* 飛行頁量好的門幾何（內嵌模式會帶過來）。沒帶就照自己的公式算。 */
  kerbForce = (geom && geom.Wd>0 && isFinite(geom.top)) ? { Wd:geom.Wd, top:geom.top } : null;
  kerbNoPend = true;   // 飛行交棒來的門不掛吊墜（ver -485，Ray 指定）
  stopKerberos();
  st.classList.add('on');
  /* ⚠ `kerb-gate`：這一段**沒有劇情**，所以對話框、離開鈕、跳段鈕都要收掉 ——
     舞台一 `.on` 那三個是預設出現的（空的對話框浮在門中間、✕ 讓玩家逃出這一拍）。
     一路留到門全開才拿掉（見 playKerberosFromRisen）。 */
  st.classList.add('kerb-gate');
  document.body.classList.add('story-on');
  layoutKerberos();
  kb.classList.add('kerb-instant');
  kb.classList.add('rise','full');
  void kb.offsetWidth;
  kb.classList.remove('kerb-instant');
}
export function playKerberosFromRisen(onGap, onDone){
  const st=$('storyStage');
  if(st) st.classList.add('on','kerb-gate');
  document.body.classList.add('story-on');
  playKerberos(onGap, ()=>{
    if(st) st.classList.remove('kerb-gate');
    kerbForce=null;                 // ⚠ 用完就清：不清的話之後的劇情場次會沿用飛行頁那組尺寸
    onDone&&onDone();
  }, { fromRisen:true });
}

/* ══ 金屬磨擦火花（ver -366，關門演出用）══
   ⚠ 掛在 `#kerbSmoke`（門的子元素）——與煙同一個容器，理由也一樣：火花要跟著門走，
     掛在舞台上的話門在動、火花站著不動。
   ⚠ 與煙的差別寫在 CSS：煙是慢的灰團，火花是**快、亮、帶重力**的細粒
     （0.5 秒內落完），否則兩者會讀成同一種東西。 */
function kerbSpark(cx, cy, n, spread){
  const box=$('kerbSmoke'); if(!box) return;
  n=n||8; spread=spread||34;
  for(let i=0;i<n;i++){
    const p=document.createElement('b');           // <b>＝火花，<i>＝煙（CSS 分開）
    p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--sx', ((Math.random()*2-1)*spread).toFixed(0)+'px');
    p.style.setProperty('--sy', (-6-Math.random()*22).toFixed(0)+'px');
    p.style.animationDelay=(Math.random()*90|0)+'ms';
    box.appendChild(p);
    kerbTimers.push(setTimeout(()=>p.remove(), 800));
  }
}
/* 元素中心（門座標）→ 火花。 */
function sparkAt(el, n){
  const dr=$('kerbDoor'); if(!el||!dr) return;
  const r=el.getBoundingClientRect(), d=dr.getBoundingClientRect();
  kerbSpark(r.left-d.left+r.width/2, r.top-d.top+r.height/2, n||6, 26);
}
/* 中縫：沿著門縫灑一排（兩扇金屬互相磨過去）。 */
function sparkSeam(){
  const dr=$('kerbDoor'); if(!dr) return;
  const w=dr.getBoundingClientRect().width, h=dr.getBoundingClientRect().height;
  const x=KERB_META.seam*w;
  for(let i=0;i<7;i++) kerbTimers.push(setTimeout(
    ()=>kerbSpark(x, h*(0.18+0.1*i), 5, 20), i*70));
}
/* 圓盤：沿著紋章外緣灑一圈（機構轉回去時的摩擦）。 */
function sparkPlate(){
  const dr=$('kerbDoor'), pl=$('kerbPlate'); if(!dr||!pl) return;
  const r=pl.getBoundingClientRect(), d=dr.getBoundingClientRect();
  const cx=r.left-d.left+r.width/2, cy=r.top-d.top+r.height/2, R=r.width*0.5;
  for(let i=0;i<8;i++){
    const a=Math.PI*2*i/8;
    kerbTimers.push(setTimeout(()=>kerbSpark(cx+Math.cos(a)*R, cy+Math.sin(a)*R, 4, 18), i*55));
  }
}

/* 門的音效（模組級，兩支原地演出與關門都用它）。⚠ 查不到就安靜跳過（見 playKerberos）。 */
function kerbSe(k){
  const u = KERB_SFX[k] ? KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'m4a') : null;
  if(!u) return;
  try{ SFX.play(u, fileGain(u)); }catch(e){}
}

/* ══⚠⚠ 城鎮戰：**在控制盤高度原地開／關**（ver -587，Ray：「雜怪 hp 清零後槍棺
   在原高度閉棺成為控制板，移動後遭遇下一個怪時直接原高度開棺不上彈，
   露出數字面盤」）══════════════════════════════════════════════════════════
   整張戰鬥地圖是**同一場**（§ 上面那一段），所以格與格之間不該再演一次
   「上推 → 撞頂 → 解鎖 → 圓盤 → 開門」的完整儀式 —— 那是「一場戰鬥開始了」的儀式。
   中間只演**門**：開＝露出數字面盤、關＝變回控制板。
   ⚠⚠ **「原高度」＝控制盤高度**：不加 `rise`/`full`（那兩個才是上推）。
     戰鬥期間槍棺根本不在畫面上（舞台是收著的），所以起始狀態由這兩支自己擺 ——
     擺在控制盤高度，玩家看到的就是「面盤打開／闔上」，中間沒有位移。
   ⚠ `kerb-open` 讓舞台透明並藏起場景各層 —— 門一開，底下 `#app` 的數字盤就露出來。
   ⚠ 不演解鎖與圓盤（`unlock`/`lift`）：那是「上彈」的一部分，Ray 明說不上彈。
     紋章與左半扇是同一個剛體（ver -389），所以不掀圓盤也不會把紋章撕成兩半。 */
export function playKerberosInPlace(onGap, onDone){
  const kb=$('kerb'), st=$('storyStage');
  if(!kb || !st){ onGap&&onGap(); onDone&&onDone(); return; }
  stopKerberos(); layoutKerberos();
  kerbPlaying=true;
  clearInterval(typing); typing=null;
  const bub=$('storyBubble'); if(bub) bub.style.visibility='hidden';
  const at=(ms,fn)=>kerbTimers.push(setTimeout(fn,ms));
  st.classList.add('on','kerb-open');
  document.body.classList.add('story-on');
  onGap&&onGap();
  gatePause();                       // 同 playKerberos：門沒全開，戰鬥不計時（ver -466）
  at(60,()=>{ kb.classList.add('open'); kerbPendSwing(15,2.2); kerbSe('open'); });
  at(60+KERB_T.open, ()=>{ gateResume(); kerbPlaying=false; onDone&&onDone(); });
}
/* 原地閉棺 → 成為控制板（同上那一段的說明）。 */
export function playKerberosShut(onDone){
  const st=$('storyStage'), kb=$('kerb');
  if(!st || !kb){ onDone&&onDone(); return; }
  stopKerberos();
  st.classList.add('on','kerb-open');
  document.body.classList.add('story-on');
  layoutKerberos();
  /* 起始＝「開著、在控制盤高度」。⚠ 要在 `kerb-instant` 之下擺，
     否則一掛上 class 就會從關著的狀態先演一次開門（同 playKerberosClose）。 */
  kb.classList.add('kerb-instant');
  kb.classList.add('open');
  void kb.offsetWidth;
  kb.classList.remove('kerb-instant');
  kerbPlaying=true;
  const at=(ms,fn)=>kerbTimers.push(setTimeout(fn,ms));
  at(0,()=>{ kb.classList.add('kerb-shut'); kb.classList.remove('open');
             kerbPendSwing(15,2.2); kerbSe('clip'); sparkSeam(); });
  at(KERB_T.open, ()=>{
    kb.classList.remove('kerb-shut');
    st.classList.remove('kerb-open');   // 場景各層回來 ＝ 變回城鎮的控制板
    kerbPlaying=false;
    onDone&&onDone();
  });
}

/* ══ 關門：**進場那一套的倒放**（ver -366，Ray 指定）══════════════════════
   戰鬥打完 → 兩扇從兩邊合上 → 倒置的紋章轉回並縮小 → 箭與鉚釘依次扣回
   → 上一層黑透遮罩 → 交給結算。每一步都有金屬磨擦火花；**沒有蒸氣**。
   ⚠ 進場結束時舞台已經被 `close({keepBgm:true})` 收掉了，所以這裡要**重新開場**：
     `on` ＋ `kerb-open`（那個 class 會把場景各層與對話框藏起來，只留門）。
   ⚠ 擺「門是開著的」這個起始狀態時要先關掉過場（`kerb-instant`），
     否則一掛上 class 就會從關著的狀態演一次開門。
   ⚠ 收尾要把舞台收掉再叫結算：劇情層是 z-8300，比結算頁（banner z-30）高，
     不收的話門會蓋在結算上面。 */
export function playKerberosClose(onDone){
  const st=$('storyStage'), kb=$('kerb');
  if(!st || !kb){ onDone&&onDone(); return; }
  stopKerberos();
  st.classList.add('on','kerb-open');
  document.body.classList.add('story-on');
  layoutKerberos();
  kb.classList.add('kerb-instant');
  kb.classList.add('rise','full','unlock','lift','open');
  void kb.offsetWidth;                       // 讓「開著」的狀態先落地，再開過場
  kb.classList.remove('kerb-instant');
  kerbPlaying=true;
  const at=(ms,fn)=>kerbTimers.push(setTimeout(fn,ms));
  const se=k=>{ const u=(KERB_SFX[k] ? KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'m4a') : null);
    if(u) try{ SFX.play(u, fileGain(u)); }catch(e){} };   // 同上（ver -441）
  let t=0;
  /* ① 兩扇合上。⚠ **紋章、箭、鉚釘與左半扇是同一個剛體**（Ray 指定）—— `kerb-shut`
     把門的過場曲線（與零延遲）借給那三組，不借的話它們會掉回自己那條帶回彈、帶逐顆
     延遲的曲線，四顆零件先飛回去、門才關上（見 style.css 那一段的說明）。 */
  at(t,()=>{ kb.classList.add('kerb-shut'); kb.classList.remove('open'); kerbPendSwing(15, 2.2);
             se('clip'); sparkSeam(); });                                   // ① 兩扇合上
  t+=KERB_T.open;
  at(t,()=>{                                                              // ② 紋章轉回並縮小
    /* ⚠ `kerb-shut` 與 `lift` 一起拿掉：接下來兩拍（紋章轉回並縮小、箭與鉚釘依次扣回）
       各自該用本來那條帶回彈、帶逐顆延遲的曲線 —— 借門的曲線只到上一拍為止。 */
    kb.classList.remove('kerb-shut','lift'); se('clip'); sparkPlate();
    /* ⚠ 副檔名要跟上面那支 `se()` 同一套 —— 寫死 `.mp3` 在 -384 全部轉 m4a 之後就 404 了。 */
    try{ const g=KERB_SE_DIR+KERB_SFX.gear+'.'+(KERB_SFX_EXT.gear||'m4a'); kerbGear=SFX.playCue(g,1); }catch(e){ kerbGear=null; }
  });
  t+=KERB_T.lift;
  at(t,()=>{ if(kerbGear){ try{ kerbGear.stop(220); }catch(e){} kerbGear=null; } });
  at(t,()=>{                                                              // ③ 箭與鉚釘依次扣回
    kb.classList.remove('unlock'); se('clip');
    KERB_RIVETS.forEach((k,i)=>kerbTimers.push(setTimeout(
      ()=>sparkAt(kb.querySelector('.kerb-rivet.'+k)), i*90)));
    KERB_ARROWS.forEach((k,i)=>kerbTimers.push(setTimeout(
      ()=>sparkAt(kb.querySelector('.kerb-arrow.'+k)), i*90)));
  });
  t+=KERB_T.rivet + 90*3;
  at(t,()=>{ st.classList.add('kerb-veil'); });                           // ④ 黑透遮罩
  t+=460;
  at(t,()=>{                                                              // ⑤ 收舞台 → 結算
    kerbPlaying=false;
    st.classList.remove('on','kerb-open','kerb-veil');
    document.body.classList.remove('story-on');
    stopKerberos();
    onDone&&onDone();
  });
}

/* ══ 演一句 ══ */
function renderLine(){
  const line = cur.lines[lineIdx];
  if(!line) return;
  stopFx();       // 上一拍的演出（掃射／持續抖動）到此為止，別讓它蓋到這一句上
  flushCgFade();  // 上一拍的黑幕若還沒收，**立刻做完**（見 cgFade 的說明），不要取消
  /* ⚠ 上一拍**還沒演的立繪指令**要先補完（ver -430）：`stopFx()` 只是把計時器清掉，
     那一拍的「誰上台、誰下台」還在 `pendingReveal` 手上 —— 不補就是立繪殘留。
     ⚠ 正常路徑上 `advance()` 已經先補過了，這一道是給**不經過 advance** 的入口
       （`goto`／`label` 跳轉、讀取閘門自己 advance）用的保險。
     ⚠ 補完要把打字機收掉：`reveal` 的尾巴會開始打**上一句**的字，而這一句若是
       空框／演出拍就只寫 `textContent=''`、不會去停那個 interval —— 舊句子會一個字
       一個字爬回新的框上。 */
  if(flushReveal()){ clearInterval(typing); typing=null; onTyped=null; }

  /* ── 插入戰鬥（ver -321）───────────────────────────────────────────
     ⚠ story.js **不 import 戰鬥模組**（單向資料流：劇情不該知道戰鬥怎麼跑）。
       改由 main.js 用 setBattleHandler 注入一支發動函式，並負責在戰鬥結束、
       回到首頁時把劇情從 `resume` 這個位置接回去。
     ⚠ 交棒前要先把舞台收掉，否則劇情層（z-index 8300）會蓋住戰鬥畫面。
     ⚠ 收掉時**不要接回首頁 BGM** —— 戰鬥有自己的曲子，接回去會打架。 */
  /* 讀取頁：`{ load:'sceneId' }` —— 擋畫面把那個場景的素材抓完再往下演。
     ⚠ 它自己會 advance()，所以這裡直接 return，不要再走下面的演出流程。 */
  if(line.load){ runLoadGate(line.load); return; }

  /* 跳到某一個 `label`（ver -377）。用途：分歧演完之後跳過另一支、回到合流點。
     ⚠ 找不到就當作這一段結束 —— 打錯字要看得出來，不要靜靜地演下去。 */
  /* ══ 條件拍（`onlyIf` / `skipIf`，ver -656）══════════════════════════════
     這一拍要不要演，看一支旗標：`onlyIf` ＝旗立著才演、`skipIf` ＝旗立著就跳過。
     ⚠ 為什麼需要：同一段對白會被走第二次（店裡的「射擊挑戰」可以一直挑），
       而第二次之後有些拍不該再出現（獎品已經領過了、費用已經免了）。
       腳本層用旗標表達「這一次跟上一次不一樣」，不必為此複製一份對白（鐵律 7）。
     ⚠ 它**只跳過這一拍**，不是跳到別的地方 —— 要跳走請用 `goto`。
       配 `{ end:true, onlyIf:'…' }` 就是「某個條件下這一段提早結束」。
     ⚠ 條件是 progress 的旗標（唯一的真相），不接受任意運算式：
       腳本是資料，資料裡不放程式。 */
  if((line.onlyIf && !prog.hasFlag(line.onlyIf)) ||
     (line.skipIf &&  prog.hasFlag(line.skipIf))) return advance();

  if(line.goto){
    const at=indexOfLabel(cur.lines, line.goto);
    if(at<0){ console.info('[story] 沒有這個 label：', line.goto); return endScene(); }
    lineIdx=at; return renderLine();
  }

  /* ══ 這一段到此為止（`{ end:true }`，ver -655）══════════════════════════
     分歧的**收尾**：一條支線講完了，而它後面還躺著另一條支線的拍。
     ⚠ 為什麼需要它：`goto`／`label` 只做得到「跳到某一拍」，做不到「結束」——
       兩條支線沒有共用結尾時（北方泊地槍店：拒絕／失敗一句話就結束，
       挑戰成功還有十幾拍），先講完的那一條就會**掉進**另一條裡。
       以前的作法是 `goto` 到一個不存在的 label（靠 `endScene` 的退路收場）——
       那會印一行「沒有這個 label」的警告，把真正的打錯字淹掉。 */
  if(line.end){ applyPersist(line); return endScene(); }

  /* ══ 選項（ver -396）══ 這一拍是**閘門**：列出幾個選擇，點下去跳到那個 `label`。
     ⚠ 不出對話框 —— 前一句就是問句，選項是**回答**，再包一層框只會多一次點擊。 */
  if(line.choice){
    applyPersist(line);
    openChoice(line.choice, to=>{
      const at=indexOfLabel(cur.lines, to);
      if(at<0){ console.info('[story] choice 指到不存在的 label：', to); return advance(); }
      lineIdx=at; renderLine();
    });
    return;
  }

  /* ══ 輸入主角名與暱稱（ver -395）══ 這一拍是**閘門**：不出對話框，
     填完按確定才往下走。⚠ 只演一次由腳本自己保證（它在 `once` 的段落裡）。 */
  if(line.nameInput){
    applyPersist(line);            // 這一拍還是可以帶背景／立繪的變化
    openNameInput(()=>advance());
    return;
  }

  /* ══ 操作提示（`hint`，ver -424，Ray：「操作提示，雪鐵龍指示點擊吊飾進入整備畫面」）══
     一個**閘門拍**：指著畫面上某個東西，玩家真的去點過（或點掉提示）才往下走。
     ⚠ 目標寫成**代號**（`pend`／`gear`）不是選擇器 —— 腳本不該知道 DOM 的 id。 */
  if(line.hint){
    applyPersist(line);
    openHint(line.hint, ()=>advance());
    return;
  }
  /* 出航：交給啟動層開飛行頁（`setFlightOpener` 注入）。⚠ 這一拍之後劇情就結束了。 */
  if(line.goFlight){
    /* ⚠ 旗標要**在開飛行頁之前**寫下去（ver -425）：讀取頁的說明者是由
       `config.loadingHost.flag` 當場判的（`set_sail` → 蕾娜）。寫在後面的話
       那一頁已經決定好說明者了，這一趟還是芙蕾雅。 */
    applyPersist(line);
    /* ⚠⚠ **走之前把插圖清掉**（ver -428）：插圖是**持續狀態**（§6.5）——
       不清的話飛行頁一收（按返回／打完回來）畫面上就是那張船的插圖卡在城鎮前面。
       這一拍之後劇情就結束了，清場是**這一拍**的責任，不要求腳本記得寫 `cg:null`
       （鐵律 8：一個動作一支實作）。
       ⚠ 不走 `cgFade`：那要 CG_FADE_MS 才收得掉，而下一格畫面就是飛行頁的讀取頁 ——
         直接拿掉最乾淨（Ray：「用加載頁洗掉」）。 */
    flushCgFade(); stageCg=null; setImg($('storyCg'), '');
    clearCast(); hideBubble();
    if(flightOpener){ endScene(); try{ flightOpener(line.goFlight); }catch(_){} return; }
    console.info('[story] 沒有註冊飛行頁開啟器，跳過 goFlight');
    return advance();
  }

  if(line.battle){
    stopShake(); stopTint();     // 進戰鬥就停（ver -638／-664，Ray 指定）
    if(!battleHandler){
      console.info('[story] 沒有註冊戰鬥發動器，跳過：', line.battle);
      return advance();
    }
    /* 續播位置。⚠ **臨時段落（城鎮）不是 scene**（ver -375）：`__town` 在 MAIN_SCRIPT 裡
       查不到，照 `{scene,line}` 交棒回來會從主線開頭重播。臨時段落改帶著**那一份台詞**
       與它的收尾回呼一起交棒，由 `resumeFrom` 分流。 */
    /* ⚠ 連**現在在放哪一首**一起交棒（ver -375）：戰鬥有自己的曲子，`close()` 會把
       `stageBgm` 歸零 —— 不帶著回來的話，打完接回劇情時整段都還在放戰鬥曲。 */
    /* `onLose`（ver -377）：**這一場可以打輸**，輸了跳到帶那個 `label` 的拍。
       ⚠ 只在戰鬥卡上寫了「可戰敗」（`config.battles[].allowLose`）時才走得到 ——
         其餘場次輸了是 Game Over 回主選單（-376 的規矩），根本不會回到這裡。 */
    /* ⚠ `battleId` 一起帶著（ver -631）：回程要問那張卡「打完換哪一首」
       （`bgmAfter`）—— 不帶的話 `resumeFrom` 認不出剛剛打的是哪一場。 */
    const resume = cur.__adhoc
      ? { adhoc: cur.lines, line: lineIdx+1, done: cur.__done, sides: sideOverride, bgm: stageBgm, onLose: line.onLose, battleId: line.battle }
      : { scene: cur.sceneId, line: lineIdx+1, bgm: stageBgm, onLose: line.onLose, battleId: line.battle };
    const id = line.battle;
    /* Kerberos 之門（ver -329）：門開的**縫裡露出的就是戰鬥畫面**，所以順序反過來 ——
       先讓底下開戰（onGap），門才拉開；門全開之後才把劇情層收掉。
       ⚠ 舊寫法是「先 close 再交棒」，那樣門一開只會露出黑幕。
       ⚠ close 一定要等門全開（onDone）—— 提早收掉的話門會憑空消失。 */
    /* 連續戰鬥的第二格起：**原地開棺**（ver -587）—— 不上推、不解鎖、不掀圓盤，
       門在控制盤的高度直接分開，露出底下的數字面盤。 */
    battleCueId = id;
    if(gateSkip && !gateSkip(id)){
      playKerberosInPlace(()=>battleHandler(id, resume),
                          ()=>close({ keepBgm:true }));
      return;
    }
    battleCueId = id;          // 這一場的曲子（ver -614）：撞頂那一拍的 riseCue 要用
    playKerberos(()=>battleHandler(id, resume),
                 ()=>close({ keepBgm:true }));
    return;
  }

  applyPersist(line);
  fireOneShot(line);

  /* ⚠⚠ **插圖轉回對話時，要等畫面全亮才彈出角色與對話框**（ver -351，Ray 指定原則）。
     換插圖／收插圖走的是黑幕（1 秒：淡黑 → 換圖 → 淡回），而立繪與對話框原本是
     **這一拍一開始就上**的 —— 於是它們在黑幕還蓋著時就出現，黑幕一收，畫面上是
     「已經站好的人」，讀起來像少了一拍。等全亮再放人出來，才是一次乾淨的剪接。
     ⚠ 等的長度＝黑幕淡入 + 換圖 + 淡出（CG_FADE_MS×2 再留一點餘裕）。
     ⚠ 這一段包成 `reveal()` 是為了「延後執行」，內容一行都沒改。 */
  /* ⚠⚠ **請人下台要立刻做，不能跟著 `reveal` 延後**（ver -354，Ray：「G2 場景切換時
     仍有諾薇兒立繪殘留」）。走黑幕的那一拍 `reveal` 會等到畫面全亮才跑，於是她是
     **在觀眾眼前**滑出去的 —— 黑幕收起來時她還站著，然後才走。
     要撤的人在黑幕**蓋著的時候**就該撤乾淨。 */
  if(line.hide){
    for(const id of [].concat(line.hide)){
      const a3=artOf(id); if(!a3) continue;
      const s3=sideOf(id);
      if(slot[s3]===id) leaveSlot(s3);
      if(shown[id]) shown[id].show=false;
    }
  }

  const reveal = ()=>{
  slidIn = false;
  const who = (line.portrait && line.portrait.char) || line.speaker;
  const p   = line.portrait || {};

  /* 只寫變化的部分：省略 ＝ 沿用上一狀態。 */
  const prev = shown[who] || {};
  const st   = { expr: (p.expr!==undefined ? p.expr : prev.expr),
                 show: (p.show!==undefined ? p.show : (prev.show!==undefined ? prev.show : true)) };
  shown[who] = st;

  /* （請人下台已在上面**立刻**做完，見那一段的說明。） */

  let side = null;
  /* ⚠ 沒有立繪資料的角色（UNKNOWN／LUNARIA）整段跳過 —— 不上場也不下場，
     台上原本站著的人維持原樣。 */
  if(artOf(who)){
    if(st.show) side = ensureOn(who, st.expr);
    else { const s2=sideOf(who); if(slot[s2]===who) leaveSlot(s2); }
  }

  /* 高亮跟著 speaker 走（speaker 與畫面上的人可以不同）。 */
  /* ⚠ 說話者沒有立繪時**誰都不亮**（傳 null）—— 台上的人不是在講話，
     照原本的邏輯會誤把左邊那位當成說話者點亮。 */
  const spA=artOf(line.speaker);
  if(!spA) highlight(null);
  else { const spSide=sideOf(line.speaker); highlight(slot[spSide]===line.speaker ? spSide : side); }

  /* CG／背景／CI 由 applyPersist 處理（上面），這裡不再重複。 */

  /* 暗調：套在**這一句說話者**的立繪上。⚠ 每一句都要清一次 —— 它是句子屬性
     不是角色屬性，不清的話下一句她還是黑的。 */
  for(const s2 of ['L','R']){ const el=slotEl(s2); if(el) el.classList.remove('dark'); }
  if(line.dark && side){ const el=slotEl(side); if(el) el.classList.add('dark'); }

  /* 本場回顧：有台詞的才記（演出拍不是台詞）。⚠ 記的是**代換後**的字，
     玩家看到什麼、回顧就是什麼。 */
  if(lineText(line)) sceneLog.push({ name:(line.speaker==='PLAYER' ? prog.getPlayerNick() : nameOf(line.speaker)),
                                text:subst(lineText(line)) });
  const nm=$('storyName'), tx=$('storyText');
  /* 主角沒有立繪、名字由玩家取（存檔裡），所以不走 speakers.js 的查表。
     ⚠ 代換要在**顯示的這一刻**做（同 `{P}` 的規矩）：玩家中途改名，
       正在播的這一段也要跟著換。 */
  /* ⚠ 主角的名牌用**暱稱**（ver -396，Ray：「主角的空對話格用暱稱」）——
     隊上的人平常就是這樣叫他的；全名只在正式場合／台詞裡用 `{P}` 明寫。 */
  if(nm) nm.textContent = (line.speaker==='PLAYER') ? prog.getPlayerNick() : nameOf(line.speaker);
  /* ⚠ delay：對話框**先不出**，等演出（平移／滑入）跑完再打字（Ray 指定）。
     ⚠ 等待中點畫面要能**跳過等待**而不是直接推到下一句 —— 不然玩家會覺得
       「點了沒反應」然後連點兩下，一次跳掉兩句。 */
  const bub2=$('storyBubble');
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT);  autoT=null;
  /* ⚠ **空台詞不出對話框**（ver -327，Ray：「插圖002出來的時候不要先出空白的
     諾薇兒對話框」）。那一拍是演出（咆哮／掃射），不是對白 —— 掛一個只有名字的
     空框在畫面上，讀起來像「她有話要說但沒說出來」。 */
  /* `blank:true` ＝ **出框、但框裡沒有字**（ver -348，Ray 的稿：「主角說話空白頓點，
     空白對話框，點擊接下句」）。主角沒有配音也沒有台詞，但「他確實開口了」這件事
     要在畫面上有份量 —— 空框就是那個份量。
     ⚠ 與「空台詞」是**兩回事**：空台詞是演出拍（咆哮／掃射），那一拍畫面上不該有框。
       兩者都沒有字，差別在**有沒有人在說話**。 */
  if(line.blank){
    if(bub2) bub2.style.visibility='';
    if(tx) tx.textContent='';
    /* ⚠⚠ **空框也是快進／自動播放的對象**（ver -427，Ray：「主角的空白對話框也是
       快進對象，不停，自動播放也不停」）。以前這裡直接 return，於是那兩個模式都
       **卡在他這一拍**等玩家點 —— 而框裡根本沒有字可讀。
       ⚠ 停的長度另給（`BLANK_BEAT`）不照 `autoDelayMs`：那個間隔的語意是
         「一句**唸完**之後停多久」，而空框一出現就等於唸完了。 */
    scheduleAuto(BLANK_BEAT);
    return;
  }
  if(!lineText(line)){
    if(bub2) bub2.style.visibility='hidden';
    if(tx) tx.textContent='';
    /* auto：這一拍**自己走完**，不等玩家點（Ray：「對話框在播放完
       Se_enemy_Saintroar 後與立繪一同出現」）。
       ⚠ 只給**沒有台詞**的演出拍用 —— 有台詞的一律點擊推進（CLAUDE.md §6.5
         「不自動跳拍」）。玩家想快轉照樣可以點，點了就提前推進。 */
    /* ⚠⚠ **立繪滑入的 450ms 不算在那一秒裡**（ver -351，Ray：「璐娜說好好保護侯爵千金
       的時候，監察官立繪撤太快」）。她的立繪要滑 450ms 才站定，若那一秒從這一拍
       的第 0 毫秒起算，實際站定的時間只剩半秒 —— 讀起來就是「才剛出來就走了」。
       規則：**無台詞的立繪拍，等她站定之後再停 `auto` 那麼久**。 */
    /* ══⚠⚠ **有立繪的無台詞拍要點擊才往下播**（ver -628，Ray：「角色立繪無對白時
       也要點擊才往下播，除非自動播放」）══
       那一拍是**演給人看的**（換表情、轉身要跑、站定不說話）—— 自己跑掉的話
       玩家還沒看清楚就沒了，而它又沒有字可以讀、連「剛剛演了什麼」都回想不起來。
       ⚠ 判定看**這一拍有沒有人在台上**（`slot.L`／`slot.R`），不是看有沒有寫
         `portrait` —— 立繪是持續狀態，上一拍放上來的人這一拍還站著。
       ⚠ **自動播放模式照跑**：那是玩家明確要求「不要等我」（`autoPlay`／`fastMode`
         由 `scheduleAuto` 接手，見那裡）。
       ⚠ 純演出拍（震動、空畫面、換插圖）**台上沒人**，照舊吃 `auto` —— 那些沒有
         「要看清楚的東西」，停在那裡只是空等。 */
    const onStage = !!(slot.L || slot.R);
    if(line.auto>0 && !(onStage && !autoPlay && !fastMode)){
      const wait = line.auto + (slidIn ? SLIDE_MS : 0);
      autoT=setTimeout(()=>{ autoT=null; advance(); }, wait);
    }
    return;
  }
  if(line.delay>0){
    if(bub2) bub2.style.visibility='hidden';
    waitT=setTimeout(()=>{ waitT=null;
      if(bub2) bub2.style.visibility='';
      if(tx) typeOut(tx, lineText(line)); }, line.delay);
  }else{
    if(bub2) bub2.style.visibility='';
    if(tx) typeOut(tx, lineText(line));
  }
  /* 自動播放／加速：這一句唸完就排下一句。⚠ 掛在 `onTyped` 而不是固定秒數 ——
     長句與短句該停一樣久的「讀完之後」，不是一樣久的「出現之後」。 */
  onTyped = ()=>{ onTyped=null; scheduleAuto(); };
  };   // reveal 結束

  markTalking(true);   // ver -385：這一拍開始演了（收場在 clearCast／close）
  if(persistFaded){
    /* 黑幕期間先把對話框藏起來（立繪本來就還沒上）—— 不藏的話上一句的框會留在黑幕上。 */
    const b=$('storyBubble'); if(b) b.style.visibility='hidden';
    /* ⚠⚠ **這一拍還沒演的部分要記下來**（ver -430，Ray：「對話點擊太快（或者點到箭頭）
       會有立繪殘留」）。`reveal` 裡面才是「誰上台、誰下台、誰高亮」——
       它被延後了，而玩家在黑幕那一秒是**點得動**的（那時既沒在打字也沒在等 delay），
       於是 `advance()` 直接跳到下一句、`renderLine` 的 `stopFx()` 把這個計時器清掉：
       **這一拍的立繪指令整段沒有執行**。上一個人於是留在台上（`shown[who]` 還是舊的）。
       正解與「還在打字就先補完」是同一條規矩：**點下去先把這一拍演完，不推進**。 */
    pendingReveal = reveal;
    fxTimers.push(setTimeout(flushReveal, CG_FADE_MS*2 + 140));
  }else reveal();
}
/* 黑幕期間還沒跑的 `reveal`（見上）。⚠ 只有一個 —— `renderLine` 一開頭就歸零，
   所以不會累積成一疊。 */
let pendingReveal = null;
/* 把還沒演的那一拍**立刻演完**。回傳 true ＝真的有東西被補上（呼叫端據此吃掉這一下點擊）。 */
function flushReveal(){
  const r = pendingReveal; if(!r) return false;
  pendingReveal = null;
  r();
  return true;
}

/* ══ 推進 ══ */
function advance(){
  if(kerbPlaying) return;            // Kerberos 之門演出中：點擊無效（不然會跳過整段演出）
  const line = cur && cur.lines[lineIdx];
  const tx = $('storyText');
  clearTimeout(autoT); autoT=null;   // 玩家點了 → 演出拍提前收，別讓計時器再推一次
  /* ⚠⚠ 這一拍還在黑幕底下沒演完 → **先把它演完，不推進**（ver -430，Ray：「對話點擊
     太快（或者點到箭頭）會有立繪殘留」）。
     黑幕那一秒既沒在打字、也沒在等 `delay`，所以舊寫法會直接跳到下一句 ——
     而「誰上台、誰下台」全在那個還沒跑的 `reveal` 裡，於是上一個人就留在台上了。
     ⚠ 這與下面兩條（等 delay／還在打字）是**同一條規矩**：點下去先把這一拍做完。
     ⚠ 順序要在它們之前：黑幕期間那兩個都還沒開始。 */
  if(flushReveal()) return;
  /* 還在等 delay → 這一下先把對話框叫出來，不推進（同「還在打字」的規矩）。 */
  if(waitT){
    clearTimeout(waitT); waitT=null;
    const b=$('storyBubble'); if(b) b.style.visibility='';
    if(tx && line) typeOut(tx, lineText(line));
    return;
  }
  /* 還在打字 → 這一下先補完，不推進（對話演出通則）。 */
  if(typing && line && tx){ typeFinish(tx, lineText(line)); return; }

  lineIdx++;
  if(lineIdx < cur.lines.length){ renderLine(); return; }
  endScene();
}

function endScene(){
  /* 城鎮的臨時段落：不寫進度、不收舞台，把控制權交回城鎮（ver -369）。 */
  if(cur && cur.__adhoc){
    const cb=cur.__done; cur=null; active=false;
    stopModes(); clearTimeout(autoT2); autoT2=null; onTyped=null;
    /* ⚠⚠ **一段對白演完就清場**（ver -430，Ray 指定寫進憲法 §6.5）。
       立繪是**持續狀態**：不撤的話上一段的人會站在下一個畫面前面。
       ⚠ 以前這裡只收對話框，清場交給各個呼叫端的 `done` 自己記得做 ——
         那正是鐵律 8 說的「規矩寫給呼叫端」：目前四個呼叫端剛好都寫對了，
         但下一條新路徑一定會漏。**收在這一支唯一的出口**才不會漏。
       ⚠ `clearCast()` 同時收對話框與「正在演」的旗標，所以不必再自己藏一次框；
         呼叫端已經寫了的那幾支照留著不必刪（它是冪等的）。 */
    clearCast();
    if(cb) cb();
    return;
  }
  /* scene 收尾才寫進度（規格 §0.2：主線寫，其餘讀）。 */
  if(cur.setStage!=null) prog.setStage(cur.setStage);
  if(cur.setFlags)       prog.addFlags(cur.setFlags);
  /* ⚠ `initAffection`＝**好感度起算**（ver -359，Ray：「以下不顯示於任何玩家可見 UI，
     僅為好感度計數起點」）。設的是**絕對值**不是加減 —— 隊伍成形的那一刻把四個人的
     計數歸到指定值。
     ⚠ 只設一次：用 flag 擋（`aff_init_<sceneId>`），否則重看這一幕會把玩家累積的好感洗掉。
     ⚠ 走 `prog.setAffection`（直接寫值）而不是 `addAffection`（帶棘輪與夾限）——
       起算點就是地板本身，不該被上一輪的棘輪擋住。 */
  if(cur.initAffection){
    const mark='aff_init_'+cur.sceneId;
    if(!prog.hasFlag(mark)){
      const aff=prog.getAffection();
      for(const k in cur.initAffection) aff[k]=cur.initAffection[k];
      prog.setAffection(aff);
      prog.addFlags([mark]);
    }
  }

  /* 這一段演完直接進城鎮（Ray：黑幕過場之後回到廣場，開始非線性探索）。 */
  if(cur.thenTown && townOpener){
    const t=cur.thenTown;
    active=false; cur=null;
    const fade=$('storyFade'); if(fade) fade.classList.add('on');
    setTimeout(()=>{ townOpener(t);
      setTimeout(()=>{ if(fade) fade.classList.remove('on'); }, 160); }, 520);
    return;
  }
  const nx = cur.next;
  if(nx && MAIN_SCRIPT[nx]){ playScene(nx); return; }
  if(nx) console.warn('[story] next 指向不存在的 scene：', nx);
  close();
}

function playScene(id){
  stopShake(); stopTint();       // 換場一定停（ver -638／-664，跨句演出的三個出口之一）
  const sc = MAIN_SCRIPT[id];
  if(!sc){ console.warn('[story] 找不到 scene：', id); close(); return; }
  cur = sc; lineIdx = 0;
  /* ⚠ 換場要**丟掉**上一幕還沒演的那一拍（ver -430），不是補演它 ——
     下面立刻就把台上清空了，補演等於把上一幕的人又請回來。
     （`renderLine` 那一道保險是給「同一段之內」用的，換場走這裡。） */
  pendingReveal = null;
  sceneLog = [];                        // 回顧只留這一場（見 showBacklog）
  stopModes();                          // 模式不跨場（見宣告處的說明）
  sideOverride = sc.sides || {};        // 這一幕的站位覆寫（見 sideOf）
  slot={L:null,R:null}; slotExpr={L:null,R:null}; shown={};
  leaveSlot('L'); leaveSlot('R');
  renderLine();
}

/* ══ 對外 ══ */
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
  const cgs=new Map();   // 插圖基底名 → 有沒有 cgNoTime（ver -433，見下方 resolveCg）
  const seen=new Set();
  let id=startId;
  while(id && MAIN_SCRIPT[id] && !seen.has(id)){
    seen.add(id);
    const sc=MAIN_SCRIPT[id];
    /* ⚠ 這一段裡若有 `{ load:'下一段' }`，代表**下一段自己有讀取閘門**（ver -348）——
       它的素材不該算進「這一道門」，否則開場那一頁要等整條鏈載完才開演。
       這正是 `load` 存在的意義：把一條長鏈切成幾段各自載。 */
    let gated=false;
    for(const ln of (sc.lines||[])) if(ln.load && ln.load===sc.next) gated=true;
    for(const ln of (sc.lines||[])){
      if(ln.bg) imgs.add(imgSrc(ln.bg));
      /* 插圖有時段差分（ver -427）。⚠⚠ ver -433 起**不再把候選整批丟進圖片清單** ——
         那樣預載會抓一堆必然 404 的名字，而且**顯示的當下還要再試一次**（那一輪
         404 才是「插圖沒出現」的成因，見 `resolveCg`）。改成收基底名，
         預載時解析**一次**，之後顯示只請求解出來的那一張。 */
      if(ln.cg && !cgs.has(ln.cg)) cgs.set(ln.cg, !!ln.cgNoTime);
      if(ln.ci) imgs.add(SI_DIR+ln.ci+'.webp');
      if(ln.bgm && bgmSrc(ln.bgm)) bgms.add(bgmSrc(ln.bgm));
      for(const n of [].concat(ln.se||[])){ const k=(typeof n==='string')?n:n.n;
        if(seSrc(k)) ses.add(seSrc(k)); }
      /* 立繪：說話者與被指定的角色都要（含表情差分）。 */
      for(const who of [ln.speaker, ln.portrait&&ln.portrait.char].filter(Boolean)){
        const sp=SPEAKERS[who]; if(!sp||!sp.art) continue;
        const art=ART[sp.art]; if(!art) continue;
        imgs.add(art.base);
        const es=exprSrc(art, ln.portrait&&ln.portrait.expr);
        if(es) imgs.add(es);
      }
    }
    id = gated ? null : sc.next;
  }
  return { imgs:[...imgs], bgms:[...bgms], ses:[...ses], cgs };
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
  for(const f of ['kerberos_door','kerberos_plate','kerberos_arrow','kerberos_rivet','kerberos_top',
                  'kerberos_pendant','kerberos_gear'])
    A.imgs.push(KERB_DIR+f+'.webp');
  /* ⚠ 門的三支音效也要預載：撞擊音在演出**第 0 毫秒**就要響，
     現抓的話一定遲到（audio.js 的 LATE_PLAY_MS 是 1.5 秒，遲到就乾脆不播）。 */
  for(const k in KERB_SFX) if(KERB_SFX[k]) A.ses.push(KERB_SE_DIR+KERB_SFX[k]+'.'+(KERB_SFX_EXT[k]||'m4a'));
  /* ⚠⚠ **音效先載，圖片後載**（ver -346，Ray：「腳步聲跟跌倒音沒載到」）。
     原本二十幾個請求一起開跑，手機的頻寬全被 3.3 MB 的圖吃掉；只要整包沒在
     `PRELOAD_CAP_MS` 內載完（慢網下很常見），閘門就照樣放行 —— 這時圖已經在
     快取裡、**音效卻還沒解碼完**，於是開場那兩支（`se_steps` / `se_Fall`）
     一播就落進 `LATE_PLAY_MS`（1.5 秒）的「遲到不播」規則，整個消失。
     音效總共只有幾百 KB，先讓它們跑完再抓圖，代價是零。
   ⚠ 圖沒載完最多是晚一拍淡進來；音效沒載完是**直接不響**，兩者的失敗代價不對等。
   ⚠⚠ **ver -430 收斂成全域那一條**（Ray：「全域都是優先預載音效、然後圖、然後 BGM，
     音效不載完不放行」）：`音效 → 圖 → BGM` 三段串接，而且**總上限只罩後兩段**。
     以前 BGM 與音效綁在同一個 `audio` 一起等，圖片讓路 6 秒之後就開跑；
     現在音樂排到最後（`playBgm` 自己會 `ensureBlob`，晚一點只是晚幾百毫秒起播），
     省下來的頻寬全給音效。 */
  const AUDIO_FIRST_MS = 6000;
  const imgJobs = ()=> A.imgs.map(src=>new Promise(res=>{
    const im=new Image();
    const fin=()=>res();
    im.onerror=fin;
    im.onload=()=>{ (im.decode ? im.decode() : Promise.resolve()).then(fin, fin); };
    im.src=src;
  }));
  /* 插圖：**先解析出哪一個候選真的存在**，解出來的那一張就是這一次要載的（ver -433）。
     ⚠ 這一步取代了以前「把六個候選整批丟進圖片清單」的作法 —— 那樣不但預載會抓一堆
       必然 404 的名字，**顯示的當下還要再試一輪**，那一輪才是「插圖沒出現」的成因。
     ⚠ 算在圖片那一段（第②段）：它就是圖。 */
  const cgJobs = ()=> [...A.cgs.keys()].map(base=>
    resolveCg(base, A.cgs.get(base)).then(src=> src ? new Promise(res=>{
      const im=new Image();
      const fin=()=>res();
      im.onerror=fin;
      im.onload=()=>{ (im.decode ? im.decode() : Promise.resolve()).then(fin, fin); };
      im.src=src;
    }) : null));
  const total = A.imgs.length + A.cgs.size + 2;
  let done=0;
  const tick = p => Promise.resolve(p).then(()=>{ done++; onProgress(done/total); });
  /* ① 音效：**沒有時限**（Ray：「音效不載完不放行」）。 */
  const sfxDone = tick(SFX.preload(A.ses).catch(()=>{}));
  /* ② 圖：音效好了才開跑。⚠ `AUDIO_FIRST_MS` 是「圖片**最多**讓路這麼久」
     —— 音效真的卡住時圖片還是要動，不然整頁看起來是死的。
     ⚠ 它**不是**「音效等這麼久就算了」（ver -354 的坑）：下面的 gate 仍然等 `sfxDone`。 */
  const imgsDone = Promise.race([sfxDone, new Promise(r=>setTimeout(r, AUDIO_FIRST_MS))])
    .then(()=> Promise.all([...imgJobs(), ...cgJobs()].map(tick)));
  /* ③ 音樂：排最後。⚠ 晚到不會壞 —— `playBgm` 自己會 `ensureBlob`，最多晚幾百毫秒起播。 */
  const bgmDone = imgsDone.then(()=> tick(SFX.preloadBgm(A.bgms).catch(()=>{})));
  /* ⚠⚠ **總上限只罩後兩段**（ver -430）：25 秒一到就放行的話，那正是
     「音效不載完不放行」的破口。閘門一律等 `sfxDone`。 */
  return sfxDone.then(()=> Promise.race([
    Promise.all([imgsDone, bgmDone]),
    new Promise(r=>setTimeout(r, PRELOAD_CAP_MS)),
  ]));
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
  /* ⚠ 撿回**正在收**的那一顆：把它的收尾計時器取消，否則等一下它會被移除
     （見 `close()` 的說明）。 */
  if(ov && ov.__closeT){ ov.__closeT.forEach(clearTimeout); ov.__closeT=null; }
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
  /* ⚠⚠ **進出都走黑色淡入淡出**（ver -433，Ray 指定）。以前是 `appendChild` /
     `removeChild` 硬切：前一幕「啪」一聲被蓋掉、載完又「啪」一聲換成新場景 ——
     兩次硬切。⚠ `#assetLoader` 的底色本來就是近黑（`#0a0812`）、`transition:opacity`
     也早就在 CSS 上，這裡只是給它一個起點與終點。
     ⚠ 淡入要**隔一幀**才拿掉起始的 `.al-fade`：同一幀加上又拿掉的話瀏覽器會把兩次
       計算合併，過場整個跳掉（同 `story.veil` 那一支的 `offsetWidth` 理由）。
     ⚠⚠ **兩段**（ver -439，Ray：「進預載頁、結束預載頁都要黑色淡入淡出」）：
       `.al-blank` ＝這一層已經全黑、但光圈還沒亮。-433 那一版只淡整層，於是
       光圈與底色一起淡進來 ＝ 城鎮的畫面與金色光圈半透明地疊在一起，
       那是溶接不是轉場。順序改成「城鎮 → 黑 → 光圈」、出場反過來走。 */
  ov.classList.add('al-fade','al-blank');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!ov || !ov.parentNode) return;
    ov.classList.remove('al-fade');                       // ① 黑幕淡入
    setTimeout(()=>{ if(ov && ov.parentNode) ov.classList.remove('al-blank'); },
               AL_FADE_MS);                               // ② 全黑之後才亮光圈
  }));
  return {
    set(p){
      const pr=document.getElementById('alRingProg'), pc=document.getElementById('assetLoaderPct');
      if(pr) pr.style.strokeDashoffset=(AL_RING_C*(1-p)).toFixed(1);
      if(pc) pc.textContent=Math.round(p*100)+'%';
    },
    /* 淡出，淡完才真的拿掉。⚠ 呼叫端（`runLoadGate`）要把黑幕留到淡完，
       否則讀取頁還在淡出、底下的黑幕就先掀開了。
       ⚠ 兩段（ver -439）：**先收光圈剩一片黑，再把黑掀開** —— 直接淡整層的話
         玩家會看到光圈與新場景疊在一起。整段的長度是 `AL_CLOSE_MS`，
         呼叫端要等的是那一個，不是 `AL_FADE_MS`。 */
    /* ⚠⚠ 收場的計時器**掛在元素身上**（`__closeT`）：收一次要花 `AL_CLOSE_MS`，
       這段期間若又有一道讀取閘門開起來，`showLoader()` 會撿到這一顆**正在死的**
       元素當成新的用 —— 然後舊的收尾計時器一到就把它整個移除，新的讀取頁等於
       沒出現過（實測連按兩下 SKIP 就會撞到）。撿回去的那一支負責把它們清掉。 */
    close(){ if(!ov) return;
      const T=[]; ov.__closeT=T;
      ov.classList.add('al-blank');                       // ① 光圈淡掉，只剩全黑
      T.push(setTimeout(()=>{
        if(!ov || !ov.parentNode) return;
        ov.classList.add('al-fade');                      // ② 黑幕淡出，揭開新畫面
        T.push(setTimeout(()=>{
          if(ov && ov.parentNode) ov.parentNode.removeChild(ov);
          if(ov) ov.__closeT=null;
        }, AL_FADE_MS+60));
      }, AL_BLANK_MS)); }
  };
}
/* 讀取頁淡入／淡出的長度。⚠ 與 `style.css` 的 `#assetLoader{transition:opacity .5s}`
   是同一個量，這裡取略短一點當「什麼時候可以拿掉」的依據（鐵律 7 的但書：
   改一邊要看另一邊）。 */
const AL_FADE_MS = 420;
/* 光圈自己淡進／淡出的長度。⚠ 與 `style.css` 的 `#alRing{transition:opacity .26s}`
   同一個量（同 `AL_FADE_MS` 的但書：改一邊要看另一邊）。 */
const AL_BLANK_MS = 260;
/* 收掉讀取頁**整段**要多久（收光圈 ＋ 掀黑幕）。⚠ 呼叫端等的是這一個 ——
   等成 `AL_FADE_MS` 的話黑幕會在光圈還沒收完時就先掀開。 */
const AL_CLOSE_MS = AL_BLANK_MS + AL_FADE_MS;

/* 演到 `{ load:'sceneId' }` 這一行：擋上標準讀取頁，把那個場景的素材抓完再往下走。
   ⚠ 停留有**下限 600ms**：快取全中時只要一百多毫秒，閃一下讀起來像破圖不像在載入
     （同 ver -327 劇情預載頁的理由）。 */
/* ⚠ 前後包一層**黑幕**（ver -350，Ray：「從地宮收尾到會客廳黑色淡入淡出」）：
     黑幕淡入 → 讀取頁 → 讀完收掉讀取頁 → **在全黑之下**演出新場景的第一拍 → 黑幕淡出。
   為什麼要包：讀取頁是硬切上來的，前一幕的畫面「啪」一聲被蓋掉、載完又「啪」一聲換成
   新場景 —— 兩次硬切。黑幕把兩次都藏起來，讀起來是一次剪接。
   ⚠ 新場景的第一拍要在**黑幕還蓋著的時候**演（先 advance 再淡出），否則玩家會看到
     舊畫面殘留一格才換 —— 那正是 -340 換插圖時解過的同一個問題。 */
function runLoadGate(sceneId){
  const fade=$('storyFade');
  if(fade){ fade.classList.add('on'); fadeOwner='gate'; }   // 這一塊不給 flushCgFade 收
  const ui=showLoader();
  const t0=Date.now();
  preloadStory(sceneId, p=>ui.set(p)).then(()=>{
    ui.set(1);
    setTimeout(()=>{
      ui.close();                                  // 讀取頁開始淡出（ver -433）
      advance();                                   // 在黑幕底下把新場景的第一拍演出來
      /* 讀取頁檢查點（ver -555，Ray：「沒有旅店手動存檔就以上一次讀取頁之後的
         那一幕開始銜接」）：新場景第一拍已演出來 → 此刻的位置寫進 auto 格
         （main.js 掛 save.autoSave 進來，story 不 import 存檔系統——會循環）。 */
      if(checkpointHook) try{ checkpointHook(); }catch(e){}
      /* ⚠ 黑幕要等**讀取頁淡完**才掀（ver -433）：以前 120ms 就掀，那時讀取頁還沒
         淡走 —— 現在它是淡的，先掀黑幕會看到「讀取頁疊在新場景上一起變淡」。 */
      setTimeout(()=>{ if(fade){ fade.classList.remove('on'); fadeOwner=null; } }, AL_CLOSE_MS+120);
    }, Math.max(0, 600-(Date.now()-t0)));
  });
}
/* 讀取頁檢查點的掛鉤（ver -555）：main.js 注入 save.autoSave —— 同 battleHandler
   的作法（story 不認識存檔系統，單向資料流）。 */
let checkpointHook = null;
export function setCheckpointHook(fn){ checkpointHook = fn || null; }
/* ══⚠⚠ **腳本上的存檔點**：那一拍寫 `checkpoint:true`（ver -653，Ray：「黑爪戰後
   加一個記錄點」）══
   ⚠ 為什麼需要它：城鎮的 act 是**整段演完**才落點（`town.enter` 的收尾），而一個 act
   可能很長（教堂那一段是「對白 → 打一場 → 戰勝 → 娜塔莉那一幕 → 插圖」）——
   中間想存就得有一個「這一拍存」的辦法。
   ⚠ 走的是**同一支** `checkpointHook`（＝ `save.autoSave`，鐵律 8）：
   讀取頁、城鎮、腳本三條路都存進同一格。
   ⚠ 它與「一場之內不落點」（ver -639）不衝突：那一條看的是 `battleSession`，
   而寫得出 `checkpoint:true` 的地方都是段落之間，不會在連續戰鬥中途。 */
function lineCheckpoint(){ if(checkpointHook) try{ checkpointHook(); }catch(e){} }

export function open(pos, done){
  const st=$('storyStage'); if(!st) return;
  resetStage();
  stopKerberos();                       // 上一場的門要歸位（不然這次一進來門就是開的）
  onExit = done || null;
  active = true;
  st.classList.add('on');
  document.body.classList.add('story-on');
  resetCamera();                        // 這一場重新量一次相機（見 camPxCm）
  SFX.unlock();
  const id = (pos && pos.scene && MAIN_SCRIPT[pos.scene]) ? pos.scene : MAIN_ENTRY;
  /* 預載頁：先擋著，載完才開演。⚠ 從戰鬥接回來（pos.line>0）時不再擋一次 ——
     那些圖上一輪已經抓過了，再擋一次只是多一個黑畫面。 */
  const go=()=>{
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
  /* ⚠ 讀取頁走**開機那一頁的標準外觀**（Ray 指定：「story 按下時就要跑讀取」）——
     不再用劇情自己那一顆簡版（#storyLoad 已停用，DOM 與 CSS 先留著）。
     ⚠ 最短顯示 600ms：快取全中的時候只要一百多毫秒，閃一下讀起來像破圖。 */
  const ui=showLoader();
  const t0=Date.now();
  preloadStory(id, p=>ui.set(p)).then(()=>{
    ui.set(1);
    /* 開場那一頁也是讀取頁（ver -555）：第一拍演出來就落一次檢查點 ——
       玩家在第一個 {load} 閘門之前退出，「繼續」也接得回這一幕。 */
    setTimeout(()=>{ ui.close(); go(); if(checkpointHook) try{ checkpointHook(); }catch(e){} },
               Math.max(0, 600-(Date.now()-t0)));
  });
}

/* main.js 注入戰鬥發動器：fn(battleId, resumePos)。
   ⚠ 回來時由 main.js 呼叫 `open(resumePos)` 續播 —— story 自己不知道戰鬥何時結束。 */
export function setBattleHandler(fn){ battleHandler = fn || null; }
/* 門**撞頂**那一刻要做的事（ver -356 由「開始上推」改到這裡，Ray 指定）。
   ⚠ 由 main.js 注入，story.js 不去認識「戰鬥的曲子叫什麼」——單向資料流。
   ⚠ 為什麼不放在 `battleHandler` 裡：那一支是在門**開到縫**（onGap）才呼叫的，
     距離開始上推有 3 秒多（rise 1000 ＋ 撞頂 ＋ 解鎖 ＋ 紋章浮起 1600）。 */
/* ⚠ 把**這一場的 id** 交給 cue（ver -614）：戰鬥卡可以指定自己的曲子
   （`config.battles[].bgm`），撞頂那一拍就得放對的那一首 —— 沒有 id 的話
   啟動層只能一律放 `bgm_battle`。 */
let battleCueId=null;
function riseCue(){ if(battleCue) try{ battleCue(battleCueId); }catch(e){} }
let battleCue = null;
export function setBattleCue(fn){ battleCue = fn || null; }
/* scene 的 `thenTown:'capital'`：這一段演完就進城鎮探索（ver -369）。
   ⚠ 注入而不是 import —— 城鎮不在劇情的依賴圖裡（同 battleHandler 的作法）。 */
let townOpener = null;
export function setTownOpener(fn){ townOpener = fn || null; }

export function close(opts){
  stopShake(); stopTint();       // 離場一定停（ver -638／-664，跨句演出的三個出口之一）
  clearInterval(typing); typing=null;
  pendingReveal=null;                // ⚠ 離場：還沒演的那一拍**丟掉**（同 playScene，ver -430）
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT); autoT=null;   // ⚠ 沒清的話劇情關掉之後還會推一句（然後在關著的舞台上演）
  const b0=$('storyBubble'); if(b0) b0.style.visibility='';
  active=false; cur=null;
  stopModes(); clearTimeout(autoT2); autoT2=null; onTyped=null;
  kerbNoPend=false;   // 飛行門的「不掛吊墜」只到這一幕為止（ver -485）——城鎮的吊墜是整備入口，不能被殘留旗標藏掉
  stopKerberos();
  const st=$('storyStage'); if(st) st.classList.remove('on');
  document.body.classList.remove('story-on');
  leaveSlot('L'); leaveSlot('R');
  /* ⚠ 黑幕歸位（ver -430）：它是持續狀態，離場時還蓋著的話下次一進來就是一片全黑。
     ⚠ **0ms**：這是重置不是演出 —— 舞台已經收掉了，沒有人看得到它淡出。 */
  veil(false, 0);
  /* ⚠ 劇情有自己的 BGM，離場一定要把主畫面那首接回來 —— 不接的話回到首頁
     還在放劇情曲，而首頁的播放邏輯只在「進首頁」那一刻跑一次，不會自己修正。 */
  stageBgm=null;
  /* ⚠ 交棒給戰鬥時**不要**接回首頁 BGM（keepBgm）—— 戰鬥有自己的曲子。 */
  if(!(opts && opts.keepBgm)){
    try{ SFX.playBgm(HOME_BGM, {fadeInMs:600, volume:fileGain(HOME_BGM)}); }catch(_){}
  }
  document.body.classList.remove('story-talking');   // ver -385
  /* ⚠⚠ **這裡不收城鎮**（ver -399 修）。ver -394 曾經在這裡呼叫 `townCloser()`，
     結果把「交棒給戰鬥」也一起收掉了 —— 推槍棺進戰鬥時走的正是
     `close({keepBgm:true})`（見 playKerberos 的 onDone），於是 `townId` 被清成 null；
     打完回來 `resumeFrom` 雖然把舞台開回來，但 `showNav`／`refreshArrows` 都查不到節點
     → **箭頭與櫃台鈕全不見，玩家被關在店裡**（Ray 回報「打完靶跟賞金獵人後返回鍵不見了」）。
     收城鎮是「**離開這一切**」才要做的事 → 移到 `goHomeNow()`。 */
  const cb=onExit; onExit=null; if(cb) cb();
}
/* 城鎮的收場器（注入，同 `setTownOpener`）。 */
let townCloser=null;
export function setTownCloser(fn){ townCloser=fn; }
/* 點吊墜 → 整備頁（ver -421，Ray 指定）。⚠ 由 main.js 注入：劇情層不認識啟動層。 */
let prepOpener=null;
export function setPrepOpener(fn){ prepOpener=fn; }
/* 出航（`goFlight` 那一拍）：由 main.js 注入 —— 劇情層不認識啟動層。 */
let flightOpener=null;
export function setFlightOpener(fn){ flightOpener=fn; }

/* ══ 「回到主選單」（ver -398）══════════════════════════════════════════
   ⚠⚠ **只收劇情層是不夠的**（Ray 回報「回到主選單的畫面一直變成試玩版戰鬥畫面」）：
     劇情層底下是 `#app`，而 `#home` 早就被別的路徑關掉了（`combat.startGame`、
     `openFlight`、飛行頁交棒…都會 `home.classList.remove('on')`）。只 `close()` 的話
     掀開來就是那一場戰鬥的盤面。
   ⚠ 正解是走**唯一那支「回主選單」**（`combat.goHome`，注入進來）——
     它會把 banner／過渡禎／獎勵層收乾淨、把 `#home` 開回來、接回主選單 BGM，
     而且自帶黑幕。劇情層在**黑幕全蓋的那一刻**才收，所以看不到中間那一格（同交棒的作法）。
   ⚠ 查不到注入的實體才退回只 `close()` —— 那是舊行為，總比什麼都不做好。 */
let homeReturn=null;
export function setHomeReturn(fn){ homeReturn=fn; }
/* ⚠⚠ **「離開這一切回主選單」只有這一支**（ver -430 改成匯出，鐵律 8）：
   選單的「回到主選單」與戰敗那一頁的「放棄」走的是同一件事 —— 收城鎮、收劇情層、
   走 `combat.goHome`。兩邊各寫一份的話，其中一邊遲早會漏掉收城鎮那一步
   （ver -399 就是這樣讓玩家被關在店裡的）。 */
export function leaveToHome(){ goHomeNow(); }
function goHomeNow(){
  /* ⚠ 城鎮在這裡收（不是在 `close()` 裡）—— 只有「回到主選單」才是離開這一切；
     交棒給戰鬥同樣走 `close()`，那時城鎮必須留著（見 close 的說明）。 */
  if(townCloser) try{ townCloser(); }catch(_){}
  if(homeReturn) homeReturn(); else close();
}

/* ══ 給城鎮探索用的三個接口（ver -369）══
   城鎮是**非線性**的（玩家在節點之間走動），不走 MAIN_SCRIPT 的 scene 鏈；
   但對白的演出（立繪取景、明暗、打字機、對話框、面盤手勢）**必須是同一套** ——
   所以不另寫一個播放器，而是把「播一段臨時台詞」與「換背景」開出來給城鎮呼叫。
   ⚠ `playAdhoc` 不做預載也不寫進度：城鎮的素材由城鎮自己顧，進度只有主線能寫（規格 §0.2）。 */
export function stageEl(){ return $('storyStage'); }
/* ⚠⚠ **清場**：把兩個立繪槽清空、對話框收掉（ver -370）。
   「換場景要清場」原本只寫成**腳本**的規矩（第一拍要 `show:false` / `hide`），
   於是城鎮那條**新的程式路徑**（不經過 scene 渲染）就漏掉了 —— Ray 回報「換場景時
   前一幕立繪都沒清」。規矩因此改寫成引擎層級：**任何切換場景／節點的程式路徑都要
   呼叫這一支**，而且只有這一支會清（鐵律 7：一個動作一個實作）。 */
/* 中止還在播的**臨時段落**（城鎮換節點時用，ver -373）。
   ⚠ 不呼叫它的話：舊那一段的推進與計時器還活著，會**在新的地點上把上一段演完**
     （實測換節點時上一段的立繪又跑出來）。`__done` 不呼叫 —— 那一段沒有演完。
   ⚠ 只中止臨時段落：主線 scene 有它自己的收尾（進度、next），不能被城鎮打斷。 */
export function endAdhoc(){
  if(!cur || !cur.__adhoc) return;
  sideOverride = {};
  clearInterval(typing); typing=null;
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT); autoT=null;
  clearTimeout(autoT2); autoT2=null;
  onTyped=null; stopModes(); stopFx();
  cur=null; active=false;
  clearCast();
}
/* ══ 「現在正在演對白」的旗標（ver -385）══
   ⚠⚠ Ray：「有人物立繪、對話播放中不要放時間地點」。城鎮的地名／時刻（`#townInfo`）
     壓在畫面上緣，正好是立繪的臉的高度。
   ⚠ **靠狀態不靠呼叫點**：原本是由 `town.js` 在兩個 showNav 的呼叫點決定，
     於是任何一條沒經過那兩點的路徑（閒聊、店主對話、戰鬥交棒回來…）就漏掉。
     改成由**演出層**在每次改變畫面時宣告一次 —— 誰在演誰就負責說（鐵律 8）。
   ⚠ 判斷條件是「對話框看得見 **或** 台上有人」，不是「在播 scene」：
     無台詞的立繪拍沒有框，但人還站著，那時候也不該出現地名。 */
/* ⚠⚠ **不要去「量 DOM」判斷有沒有在講話**（ver -385 踩過）：立繪的 `.on` 與對話框的
   `visibility` 都是這一拍**稍後**才套上／撤掉的（滑入 450ms、延遲打字、滑出動畫），
   當場量會量到上一個狀態，量出來的結果是**顛倒的**（實測：對白中 false、結束後 true）。
   正解是**演出層自己宣告**：開始演一拍 → true，收場（clearCast／離場）→ false。 */
export function markTalking(on){ document.body.classList.toggle('story-talking', !!on); }

/* ══ 常駐立繪（ver -404）══════════════════════════════════════════════
   把**一個**角色放上台、保持原色，另一側清空。**不接管推進** ——
   給「店裡的店主一直站在那裡」這種**持續狀態**用（城鎮的店舖畫面）。
   ⚠⚠ 走的是與對白**同一支** `ensureOn`、同一把尺（§6.5：同一張立繪＝同一個結果，
     不因場合而變大小或站位）。店舖不准另算一次（鐵律 7）。
   ⚠ 收場走 `clearCast()` —— 它同時收對話框與「正在演」的旗標，是唯一的收尾（鐵律 8）。 */
export function castSolo(id, expr){
  const side = ensureOn(id, expr||null);
  if(!side) return null;
  const other = side==='R' ? 'L' : 'R';
  if(slot[other]) leaveSlot(other);
  highlight(side);
  return side;
}

/* ══ 全畫面黑幕（ver -430）══════════════════════════════════════════════
   「暗下去 → 做點事 → 亮回來」**只有這一支**（鐵律 8）：旅店的睡覺／獨自坐坐是
   第一批用它的，日後任何畫面要同樣的轉場都叫它，不要各自再貼一片黑。
     on  true＝暗下去、false＝亮回來
     ms  這一次要花多久（毫秒）；不給就用 CSS 的預設。
   ⚠ 黑幕**不能住在會被收掉的那一層裡**：旅店舊版那一片在 `#innLobby` 底下，
     而演出一開始就 `lock(true)` 收掉導覽 → 整層 `display:none` → 黑幕從來沒亮過。
   ⚠ 時間是**逐次**指定的（inline 覆寫），因為它由呼叫端的事件決定 ——
     睡覺那一次就是「音檔多長就多長」（鐵律 7：長度的真相在音檔身上）。 */
export function veil(on, ms){
  const v=$('storyVeil'); if(!v) return;
  v.style.transitionDuration = (ms!=null) ? (ms+'ms') : '';
  /* ⚠ 從「沒掛過」到「掛上」要讓瀏覽器先看到起始狀態，否則同一幀改 duration ＋ 加 class
     會被合併成一次計算，過場直接跳掉（實測：黑幕瞬間全黑，沒有淡入）。 */
  void v.offsetWidth;
  v.classList.toggle('on', !!on);
}
/* 黑幕現在蓋著嗎（收場時要確認有沒有人忘了亮回來）。 */
export function veilOn(){ const v=$('storyVeil'); return !!(v && v.classList.contains('on')); }

export function clearCast(){
  slot={L:null,R:null}; slotExpr={L:null,R:null}; shown={};
  leaveSlot('L'); leaveSlot('R');
  const b=$('storyBubble'); if(b) b.style.visibility='hidden';
  markTalking(false);
  /* ⚠⚠ **插圖也一起撤**（ver -643，Ray：「插畫播完強制撤掉」）：它與立繪一樣是
     **持續狀態**，沒人撤就一直蓋在畫面上。以前靠腳本自己寫 `cg:null`，
     漏寫就卡著 —— 而新增的每一條路徑都會再漏一次（同 §6.5「清場」那條的教訓）。
     ⚠ 收在這一支＝「這一段講完了」的唯一出口（鐵律 8）。 */
  clearCg();
  verifyCastCleared();
}
/* ⚠⚠ **撤場之後再驗收一次台上真的空了**（ver -433，Ray：「在播放結束後放一個檢查，
   清除所有立繪」）。`leaveSlot` 已經把該取消的都取消了，這一支是**保險**：
   滑出動畫跑完之後，若畫面上還有人掛著 `.on`、而資料上那個槽是空的 —— 就是漏了。
   ⚠ 判斷看**資料**（`slot[side]`）不是看畫面：撤場之後有人可能立刻被**合法地**
     放上來（店主 `castSolo`、下一段對白的第一拍），那時槽是有值的，不能一起清掉。
   ⚠ 這是「驗收」不是「規矩」：真的驗到東西就是上游有 bug，順手記一筆 console，
     不要靜靜地修掉 —— 靜靜地修會讓下一個同類 bug 永遠查不出來。 */
function verifyCastCleared(){
  clearTimeout(verifyCastCleared._t);
  verifyCastCleared._t = setTimeout(()=>{
    for(const s of ['L','R']){
      if(slot[s]) continue;                       // 有人合法站著 → 不動
      const el=slotEl(s); if(!el) continue;
      if(!el.classList.contains('on')) continue;
      console.info('[story] 撤場後仍有立繪殘留，已清除：', s, el.dataset.who||'');
      clearTimeout(slotT[s]); slotT[s]=0; el.onload=null;
      el.classList.remove('on','fading');
    }
  }, SLIDE_MS+80);
}
/* 單句提示（城鎮的路人閒聊用，ver -370）：**不進對話模式**，只把一句話放進對話框。
   ⚠ 與 `playAdhoc` 是兩回事：那個會接管推進（點畫面＝下一句）；這個只是「浮一句話」，
     玩家再點一下就換下一句，不會卡在對話裡。 */
export function flashLine(text, name){
  const bub=$('storyBubble'), nm=$('storyName'), tx=$('storyText');
  if(!bub||!tx) return;
  clearInterval(typing); typing=null;
  if(nm) nm.textContent=name||'';
  bub.style.visibility='';
  typeOut(tx, text||'');
  markTalking(true);      // 路人閒聊也是對白（ver -385）
}
/* 收掉對話框。⚠ 順便宣告「現在沒有在演」（ver -387）—— `flashLine` 開場時
   `markTalking(true)`，收場就該由**同一個層**關掉（§6.5：誰在演，誰負責宣告）。
   不關的話城鎮的地名／時刻會一直讓開，玩家看不到自己在哪、幾點。 */
/* ══ 操作提示（ver -424）══════════════════════════════════════════════
   雪鐵龍箭指著畫面上的一個東西 ＋ 一句說明；點那個東西（或點說明）才過關。
   ⚠ 目標的代號 → DOM 的對照**只有這一張表**（腳本只寫代號，鐵律 7）。
   ⚠ 箭與文字的位置**每次現量**：這一頁的元素位置是 `layoutKerberos` 解出來的，
     而且會隨轉向變。⚠ 量不到（還沒排版）就直接放行 —— 卡住比沒教學糟得多。 */
const HINT_TARGET = { pend:'kerbPend', gear:'storyExit' };
/* 城鎮的一次性提示（ver -429）：與腳本的 `hint` 那一拍**走同一支**（鐵律 8）——
   遮罩、箭、抬層、關掉才過那一套只有一份。差別只在沒有「下一拍」要接。 */
export function showHint(spec, done){ openHint(spec, done || (()=>{})); }
function openHint(spec, done){
  const o = (typeof spec==='string') ? { at:spec } : (spec||{});
  const tgt = document.getElementById(HINT_TARGET[o.at] || o.at);
  const st = $('storyStage');
  if(!tgt || !st){ done && done(); return; }
  const r = tgt.getBoundingClientRect();
  if(!r.width){ done && done(); return; }
  const sr = st.getBoundingClientRect();
  const ov = document.createElement('div'); ov.id='storyHint';
  ov.innerHTML = '<i class="sh-arrow">▼</i><div class="sh-txt">'+(o.text||'')+'</div>';
  st.appendChild(ov);
  const a = ov.querySelector('.sh-arrow');
  a.style.left = (r.left - sr.left + r.width/2)+'px';
  a.style.top  = (r.top  - sr.top  - 6)+'px';
  ov.querySelector('.sh-txt').style.top = Math.max(8, r.top - sr.top - 62)+'px';
  tgt.classList.add('hint-spot');
  let fired=false;
  const finish=()=>{ if(fired) return; fired=true;
    tgt.classList.remove('hint-spot');
    tgt.removeEventListener('click', onTgt, true);
    if(ov.parentNode) ov.parentNode.removeChild(ov);
    done && done();
  };
  /* ⚠ 點**目標**才算學會（那是這一拍要教的動作）；點提示本身只是收掉它，
     一樣放行 —— 不要把玩家鎖在教學裡。 */
  const onTgt = ()=>setTimeout(finish, 60);
  tgt.addEventListener('click', onTgt, true);
  /* ⚠ 遮罩自己也要吃掉 pointer 那一發（ver -440，同 `swallowTap` 的理由）：
     它蓋在整個舞台上，不擋的話點遮罩＝順手點了畫面（在店裡就把買賣鈕叫出來、
     在劇情裡就多推一句）。 */
  ov.addEventListener('pointerdown', e=>e.stopPropagation());
  ov.addEventListener('pointerup',   e=>e.stopPropagation());
  ov.addEventListener('click', e=>{ e.stopPropagation(); finish(); });
}

/* ══ 選項面板（ver -396）══
   ⚠ 蓋在對話框**之上**並吃掉點擊：這一拍是閘門，不能點畫面跳過去。
   ⚠ 內容全在腳本上（`choice:[{text,goto}]`），這裡只負責演（鐵律 1）。 */
/* 選項面板開著時的鍵盤操作（ver -427）。⚠ 由 `openChoice` 掛上、選完清掉 ——
   鍵盤那一支只要問「現在有沒有選項在等」，不必自己去翻 DOM。 */
let choiceNav=null;
/* 這個選項現在按不按得動（ver -655）：`cost` ＝ 選下去要付的錢（挑戰費、過路費…）。
   ⚠ 錢在**按下去那一刻**扣（見下面的 click），不是演到那一拍就扣 ——
     玩家還沒答應。 */
/* 這個選項現在要付多少（ver -656）：`costUntil` ＝**那支旗立起來之後就免費**
   （Ray：「挑戰失敗就要再花錢挑戰，成功以後挑戰不用錢」）。
   ⚠ 一個計算點：要不要收錢、收多少，只有這一支在算（鐵律 7）—— 顯示（變暗）
     與真的扣錢都問它。 */
function choiceCost(o){
  if(!o || !o.cost) return 0;
  if(o.costUntil && prog.hasFlag(o.costUntil)) return 0;
  return o.cost|0;
}
function choiceAfford(o){ return inv.getMoney() >= choiceCost(o); }
function openChoice(opts, pick){
  if($('choiceSheet') || !opts || !opts.length) return;
  const ov=document.createElement('div'); ov.id='choiceSheet';
  ov.innerHTML='<div class="ch-panel">'
    + opts.map((o,i)=>'<button class="ch-opt'+(choiceAfford(o)?'':' off')+'" type="button" data-i="'+i+'"'
                    + (choiceAfford(o)?'':' disabled')+'>'
                    + String(o.text||'').replace(/</g,'&lt;')+'</button>').join('')
    + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', e=>e.stopPropagation());
  ov.addEventListener('click', e=>e.stopPropagation());
  ov.querySelectorAll('.ch-opt').forEach(b=>b.addEventListener('click', e=>{
    e.stopPropagation();
    try{ SFX.menuClick(); }catch(_){}
    choiceNav=null;
    const o=opts[+b.dataset.i]||{};
    /* 挑戰費：**按下去才扣**（ver -655）。⚠ 錢不夠的選項本來就 disabled，
       這裡再擋一次是保險（鍵盤那條路也走同一顆鈕的 click）。 */
    const need=choiceCost(o);
    if(need && !inv.spendMoney(need)) return;
    ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); pick&&pick(o.goto); }, 180);
  }));
  /* 鍵盤：W/S（或上下鍵）移動、空白／Enter 確定（ver -427，Ray：「空白鍵推進、選擇」）。
     ⚠ 確定走的是**那顆鈕自己的 click**（鐵律 8）—— 不要另寫一條選定的路，
       不然音效、關閉動畫、`pick` 的呼叫時序會有兩份。 */
  const btns=[...ov.querySelectorAll('.ch-opt:not([disabled])')];
  let sel=0, armed=false;
  const paint=()=>btns.forEach((b,i)=>b.classList.toggle('sel', armed && i===sel));
  /* ⚠⚠ **第一下空白只是「亮出游標」，不會選下去**：玩家是一路按空白推對白進來的，
     選項一跳出來就被下一下空白選掉是很糟的意外（而且看不出選了哪一個）。
     `armed` 之前畫面上沒有任何高亮，所以純觸控的玩家也不會憑空多一個「已選取」的框。 */
  choiceNav={
    move(d){ const was=armed; armed=true;
             if(was && btns.length>1) sel=(sel+d+btns.length)%btns.length;
             paint(); try{ SFX.menuClick(); }catch(_){} },
    confirm(){ if(!armed){ armed=true; paint(); try{ SFX.menuClick(); }catch(_){} return; }
               const b=btns[sel]; if(b) b.click(); },
  };
  requestAnimationFrame(()=>ov.classList.add('on'));
}

/* ══ 輸入主角名與暱稱（ver -395，Ray 交稿：「輸入主角名及暱稱／默認為凱勞諾斯、暱稱為凱」；ver -477 預設改托爾斯坦／托爾）══
   ⚠ 預設值問 `progress`（`PLAYER_DEFAULT` / `NICK_DEFAULT`），**不要在這裡再打一次字串**
     （鐵律 7）。留空按確定＝沿用預設。
   ⚠ 這一拍**鎖住推進**：面板開著時點畫面不能跳過去（`kerbPlaying` 那一套的理由相同），
     所以面板自己蓋在最上層並吃掉點擊。 */
function openNameInput(done){
  if($('nameSheet')) return;
  const ov=document.createElement('div'); ov.id='nameSheet';
  /* ⚠ 輸入框裡預填的是**預設名**（托爾斯坦／托爾），不是現在顯示的那個 ——
     取名之前顯示的是 `HUND`（見 progress.js），把它填進去等於要玩家自己刪掉。 */
  const named = prog.isNamed();
  const nm = named ? prog.getPlayerName() : prog.PLAYER_DEFAULT;
  const nk = named ? prog.getPlayerNick() : prog.NICK_DEFAULT;
  ov.innerHTML='<div class="ns-panel">'
    + '<div class="ns-title">請問您的名字是？</div>'
    + '<label class="ns-row"><span>名　字</span>'
    +   '<input id="nsName" type="text" maxlength="12" value="'+nm.replace(/"/g,'&quot;')+'"></label>'
    + '<label class="ns-row"><span>暱　稱</span>'
    +   '<input id="nsNick" type="text" maxlength="8" value="'+nk.replace(/"/g,'&quot;')+'"></label>'
    + '<button class="ns-ok" type="button">確　定</button></div>';
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', e=>e.stopPropagation());
  ov.addEventListener('click', e=>e.stopPropagation());
  const ok=()=>{
    prog.setPlayerName(($('nsName')||{}).value);
    prog.setPlayerNick(($('nsNick')||{}).value);
    try{ SFX.menuClick(); }catch(_){}
    ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); done&&done(); }, 200);
  };
  ov.querySelector('.ns-ok').addEventListener('click', e=>{ e.stopPropagation(); ok(); });
  ov.querySelectorAll('input').forEach(i=>i.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); ok(); } }));
  requestAnimationFrame(()=>ov.classList.add('on'));
}

export function hideBubble(){
  const b=$('storyBubble'); if(b) b.style.visibility='hidden';
  markTalking(false);
}
/* 城鎮用：確保某一首 BGM 在放（ver -375）。
   ⚠ 為什麼要有：城鎮中間會插進一場戰鬥，戰鬥有自己的曲子；回到城鎮時要把地方的曲子
     接回來。**同曲重播由 `playBgm` 自己擋掉**，所以每次進節點都呼叫是安全的。
   ⚠ 走 `stageBgm` 記帳與腳本的 `bgm:` 同一份 —— 不然兩邊會各自以為自己在放。 */
export function ensureBgm(name){
  if(!name) return;
  const src=bgmSrc(name);
  if(!src){ console.info('[story] 沒有這首 BGM：', name); return; }
  stageBgm=name;
  try{ SFX.playBgm(src, {fadeInMs:800, volume:fileGain(src)}); }catch(_){}   // 逐曲增益只有 config 那一份（ver -441）
}
/* 城鎮用：把下半的面盤（槍棺/團徽）擺好。⚠ 不做的話面盤是一片全黑 ——
   那塊是 `layoutKerberos` 依實際尺寸算出來的，不是 CSS 就有的。 */
export function showPanel(){ layoutKerberos(); }
export function isPlaying(){ return active && !!cur; }
/* `done`＝新圖真的上去了（ver -442，見 `swapImg`）。⚠ 同一張圖時要**立刻**回報：
   那就是「已經擺好了」，等它等不到第二次（城鎮的黑幕會一直蓋著）。 */
export function setSceneBg(name, done){
  const el=$('storyBg'); if(!el){ done&&done(); return; }
  if(name===stageBg){ done&&done(); return; }
  stageBg=name;
  swapImg(el, name ? imgSrc(name) : '', done);
  setTimeout(()=>matchPortraits(toneSrcEl(), $('storyCast')), 420);
}
/* 播一段臨時台詞（城鎮節點的進場對白）。done 在最後一句被點掉之後呼叫。
   ⚠ 播完**不收舞台**（城鎮還要留在畫面上），與 scene 鏈的 endScene 不同。 */
/* `opts.sides`＝這一段的站位覆寫（`{RENNA:'R'}`），與 scene 的 `sides` **同一個機制**
   （ver -374）。⚠ 兩個角色同台時要分左右，那是 §6.5 的規矩 —— 城鎮這條新路徑
   一樣要吃得到，不能只有主線 scene 有。 */
export function playAdhoc(lines, done, opts){
  const st=$('storyStage'); if(!st || !lines || !lines.length){ done&&done(); return; }
  st.classList.add('on'); document.body.classList.add('story-on');
  active=true;
  clearCast();                      // ⚠ 新的一段＝新的台上（見 clearCast 的說明）
  sideOverride = (opts && opts.sides) || {};
  cur={ sceneId:'__town', lines, next:null, __adhoc:true, __done:done };
  lineIdx=0; sceneLog=[]; stopModes();
  renderLine();
}

/* ══ 從戰鬥接回來（ver -375）══
   `main.js` 打完戰鬥就呼叫這一支，不必自己判斷這一段是主線還是城鎮的臨時段落。
   ⚠ 一個入口分流兩種續播（鐵律 8）：主線走 `open(pos)`（會重建場景），
     臨時段落走 `playAdhoc` 續播剩下的幾句 —— 城鎮的背景與導覽層都還在畫面上，
     重建一次只會把它們洗掉。
   ⚠ 續播位置**可能剛好等於長度**（戰鬥是最後一句）：那就直接收尾呼叫 done。 */
export function indexOfLabel(lines, label){
  if(!lines || !label) return -1;
  for(let i=0;i<lines.length;i++) if(lines[i] && lines[i].label===label) return i;
  return -1;
}
export function resumeFrom(pos, res){
  if(!pos) return;
  /* ══⚠⚠ **打完換一首**（ver -631，Ray：「黑爪戰完 bgm 換 Suspense6」）══
     戰鬥卡上寫 `bgmAfter:'<鑰匙>'`；沒寫就照舊接回**戰前那一首**（`pos.bgm`）。
     ⚠ **只有打贏才換**：戰敗要再打一次，這一場還沒結束 —— 換了曲子等於幫劇情
       先畫了句點。`res.lost` 為真時走回原本那一首。
     ⚠ 寫在**卡**上不寫在腳本裡（鐵律 1）：「這一場打完之後是什麼氣氛」是那一場
       的性質，日後同一隻怪在別的地方出現也該接同一首。 */
  const _bc = pos.battleId && GAME_CONFIG.battles && GAME_CONFIG.battles[pos.battleId];
  const _after = (_bc && _bc.bgmAfter && !(res && res.lost)) ? _bc.bgmAfter : null;
  ensureBgm(_after || pos.bgm);             // 戰前那一首（見 renderLine 的 resume）
  /* ══⚠⚠ ver -430 的「再戰＝回這一幕的第 0 句」**已在 ver -697 推翻**══════════
     那一顆現在叫「繼續」，做的是**回檔**（`save.loadLatest`，分流在 main 的
     `setStoryReturn`）—— 所以敗北根本走不到這一支了。
     為什麼推翻：跳回某一句只還原了「播到哪裡」，旗標／好感／道具／時鐘全部停在
     戰前 —— 那不是 §6.5.2 說的「這一場還沒發生過」。實測就出過事（Ray 連報兩次
     「安雅的好感還在，也沒有觸發要求去教堂」）。
     ⚠ **回檔＝讀一份完整快照**，所以「這一段對白是初見還是二見」由快照裡的旗標
       回答，不必判斷（鐵律 9）。 */
  /* 打輸了而且這一場有寫 `onLose` → 從那個 label 接下去（ver -377）。 */
  if(res && res.lost && pos.onLose){
    const lines = pos.adhoc || ((MAIN_SCRIPT[pos.scene]||{}).lines);
    const at = indexOfLabel(lines, pos.onLose);
    if(at>=0) pos = Object.assign({}, pos, { line:at });
    else console.info('[story] onLose 指到不存在的 label：', pos.onLose);
  }
  if(pos.adhoc){
    const rest = pos.adhoc.slice(pos.line||0);
    /* ⚠⚠ **舞台要先開回來**（ver -585 修）：戰鬥交棒時 `close()` 把 `#storyStage.on`
       與 `body.story-on` 拿掉了，而 `#home` 在 `goHome` 那一刻被加上 `.on` ——
       舞台沒開回來的話，打完回到的是**首頁**，城鎮明明還開著卻看不見
       （`town.isOpen()` 真、`getPosition()` 有值，但整層 display:none）。
       ⚠ 有剩幾句時 `playAdhoc` 自己會開（它第一行就做這件事），
         但**戰鬥是最後一句**時走的是下面那條捷徑 —— 那一條以前就漏了。
         城鎮的 `acts` 常常整段只有一拍 `{battle:…}`，所以那是常態不是邊角。
       ⚠ 這一支不是「開一個新場」：`active` 不動、不清台上 —— 城鎮的背景與導覽
         都還在，重建一次只會把它們洗掉（同下面 playAdhoc 那條註解）。 */
    const stg=$('storyStage');
    if(stg){ stg.classList.add('on'); document.body.classList.add('story-on'); }
    layoutKerberos();                       // 門被戰鬥收過了，回來要重新擺（不擺是一片黑）
    if(!rest.length){ const d=pos.done; if(d) d(); return; }
    playAdhoc(rest, pos.done, { sides: pos.sides });
    return;
  }
  open(pos);
}

/* 讀檔：跳到指定位置（劇情播放中或不在播都可用）。 */
export function jumpTo(pos){
  if(!pos || !pos.scene) return;
  if(!active) return open(pos);
  playScene(pos.scene);
  if(pos.line>0 && cur && pos.line<cur.lines.length){ lineIdx=pos.line; renderLine(); }
}

/* ══ 跳段（開發者限定，ver -363）══
   「跳到下一個加載頁」＝從目前這一句往後找第一個 `{ load:… }`，直接演它
   （那一行本身就是讀取閘門，會把下一段的素材抓完再接下去）。
   找不到就直接收掉這一段，交給 `endScene` 走 `next`。
   ⚠ 只在管理人模式出現（CSS 的 `body.testmode`）—— 這是開發用的梯子，不是玩家功能。
   ⚠ 跳之前要把還在跑的東西收乾淨（打字機、等待、auto、演出計時器、黑幕），
     否則上一句的殘留會蓋到新段落上。 */
export function skipToNextGate(){
  if(!active || !cur) return;
  clearInterval(typing); typing=null;
  pendingReveal=null;                // ⚠ 跳段：還沒演的那一拍丟掉（同 playScene，ver -430）
  clearTimeout(waitT); waitT=null;
  clearTimeout(autoT); autoT=null;
  stopFx(); flushCgFade();
  const lines=cur.lines||[];
  for(let i=lineIdx+1;i<lines.length;i++){
    if(lines[i] && lines[i].load){ lineIdx=i; renderLine(); return; }
  }
  endScene();
}

/* 空框（`blank:true`）那一拍在自動播放下停多久（ver -427）。⚠ 不用 `autoDelayMs`
   —— 那個值的語意是「**唸完**之後停多久」，而空框一出現就等於唸完了。 */
const BLANK_BEAT = 420;
/* 自動推進的排程。fast＝按住下拉／按住空白（很快）、auto＝自動播放（讀得完的節奏）。
   `ms`（選填）＝這一拍改停多久，蓋掉自動播放的間隔（空框用）。加速模式不吃它。 */
function scheduleAuto(ms){
  clearTimeout(autoT2); autoT2=null;
  if(!active) return;
  if(!fastMode && !autoPlay) return;
  /* ⚠ 自動播放的間隔改由**選單**決定（ver -397）—— 讀 `settings`，不要在這裡寫死。
     加速模式（按住下拉）維持固定的 120ms：那是「一路衝過去」，不是節奏偏好。 */
  autoT2=setTimeout(()=>{ autoT2=null; if(active && (fastMode||autoPlay)) advance(); },
                    fastMode ? 120 : (ms!=null ? ms : settings.autoDelayMs()));
}
function setFast(on){
  if(fastMode===on) return;
  fastMode=on;
  const st=$('storyStage'); if(st) st.classList.toggle('story-fast', on);
  if(on) scheduleAuto(); else { clearTimeout(autoT2); autoT2=null; }
}
function setAuto(on){
  autoPlay=on;
  const st=$('storyStage'); if(st) st.classList.toggle('story-auto', on);
  if(on) scheduleAuto(); else { clearTimeout(autoT2); autoT2=null; }
}
function stopModes(){ setFast(false); setAuto(false); }

/* ══ 本場已播腳本（往左滑開啟）══
   ⚠ 只列**這一場**的：跨場的回顧要另一套資料（存檔級），現在還沒有。 */
function showBacklog(){
  if(document.getElementById('storyLog')) return;
  const ov=document.createElement('div'); ov.id='storyLog';
  const rows = sceneLog.length
    ? sceneLog.map(r=>'<div class="log-row"><span class="log-name">'+r.name+'</span>'
                     +'<span class="log-text">'+r.text+'</span></div>').join('')
    : '<div class="log-empty">（這一場還沒有台詞）</div>';
  ov.innerHTML='<div class="log-panel"><div class="log-title">已播腳本</div>'
             + '<div class="log-list">'+rows+'</div>'
             + '<button class="log-ok" type="button">關閉</button></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(()=>{ ov.classList.add('on');
    const list=ov.querySelector('.log-list'); if(list) list.scrollTop=list.scrollHeight; });
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); };
  ov.querySelector('.log-ok').addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.menuClick(); }catch(_){} close(); });
}

export function init(){
  /* ⚠⚠ **立繪的色調要綁在背景「真的載好」那一刻**（ver -396，Ray：「全場景角色立繪
     都要依背景調整亮度」）。原本是換背景之後 `setTimeout(…, 420)` 去量 ——
     但 `swapImg` 是**先預載、載好才換 src**，慢一點的圖 420ms 還沒換上去，
     於是量到的是**上一張**，而且會用上一張的 src 當快取鍵存起來 →
     那張新背景從此再也不會被量到（沒有人會再叫它一次）。
     綁 `load` 事件就沒有這個問題：換幾次量幾次，主線／城鎮／旅店全部一體適用。
     ⚠ 原本那兩處 `setTimeout` 留著不礙事（同一張圖有快取，第二次是 no-op）。 */
  const bgEl=$('storyBg');
  if(bgEl) bgEl.addEventListener('load', ()=>matchPortraits(toneSrcEl(), $('storyCast')));
  const touch=$('storyTouch');
  /* ══ 面盤手勢（ver -367）══
     起點在**面盤**（`--story-top` 之下）才算手勢；起點在上半就是單純的「點一下推一句」。
     ⚠ 用 pointer 事件自己判，不要用 click：click 沒有起點資訊，分不出「點」與「滑」。
     ⚠ 判定門檻：橫向 40px 決定左右滑；縱向下拉 30px 進加速模式（放開即停）。
       兩者取先達到的那一個，避免斜著滑時同時觸發。 */
  if(touch){
    let p0=null, mode=null;
    /* 面盤的上緣＝立繪區的下緣。⚠ 走 `STAGE()`（鐵律 7 的單一真相），不要在這裡
       再讀一次 config —— 那就是「同一個量兩處各算一次」。 */
    const panelTop = ()=>{ const st=$('storyStage');
      return st ? st.getBoundingClientRect().height*STAGE().topRatio : 0; };
    touch.addEventListener('pointerdown', e=>{
      if(!active) return;
      const st=$('storyStage'); const r=st.getBoundingClientRect();
      const onPanel = (e.clientY - r.top) > panelTop();
      p0 = { x:e.clientX, y:e.clientY, panel:onPanel, moved:false };
      mode = null;
    });
    touch.addEventListener('pointermove', e=>{
      if(!p0 || !p0.panel) return;
      const dx=e.clientX-p0.x, dy=e.clientY-p0.y;
      if(!mode){
        if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ mode = dx>0 ? 'auto' : 'log'; p0.moved=true;
          if(mode==='auto') setAuto(!autoPlay); else { stopModes(); showBacklog(); } }
        else if(dy>30 && dy>Math.abs(dx)){ mode='fast'; p0.moved=true; setFast(true); }
      }
    });
    const end=()=>{ if(mode==='fast') setFast(false); p0=null; mode=null; };
    touch.addEventListener('pointerup', end);
    touch.addEventListener('pointercancel', end);
    /* 點擊推進：⚠ 滑動過就不算點（不然放開手會多推一句）。 */
    touch.addEventListener('click', e=>{ if(!active) return;
      if(mode || (p0 && p0.moved)) return;
      advance(); });
  }
  /* ══ 鍵盤（ver -427，Ray 指定）══════════════════════════════════════════
     空白／Enter ＝**推進**（＝點畫面一下）；**按住**空白＝加速（放開即停）；
     選項面板開著時 W/S（上下鍵）選、空白確定。
     ⚠⚠ **走同一支** `advance()` / `setFast()`（鐵律 8）：鍵盤不是另一套推進，
       是同一套的另一個入口 —— 打字補完、等 delay、選項閘門那些規矩自動一致。
     ⚠ 「按住」用 `e.repeat`：第一下推進，之後的自動連發轉成加速模式。
       這樣一顆鍵同時是「點一下」與「按住」，與面盤那邊的分流（點／下拉）是同一個語意。
     ⚠ 焦點在輸入框（取名那一拍）時整支讓位 —— 不然打字會一路推掉劇情。
     ⚠ Esc **不在這裡**：關面板是全站的事（選單／已播腳本／存讀檔都要），
       收在 `main.js` 那一支通用的（同一個理由：不要每個面板各綁一次）。 */
  const inField = ()=>{ const a=document.activeElement;
    return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  const isGo = k => (k===' ' || k==='Spacebar' || k==='Enter');
  window.addEventListener('keydown', e=>{
    if(!active || inField()) return;
    if(e.ctrlKey||e.altKey||e.metaKey) return;
    /* 選項是**閘門**：開著的時候只受理選與確定，空白不可以拿來跳過去。 */
    if(choiceNav){
      if(e.key==='ArrowUp'   || e.key==='w' || e.key==='W'){ e.preventDefault(); choiceNav.move(-1); return; }
      if(e.key==='ArrowDown' || e.key==='s' || e.key==='S'){ e.preventDefault(); choiceNav.move( 1); return; }
      if(isGo(e.key)){ e.preventDefault(); choiceNav.confirm(); }
      return;
    }
    if(!isGo(e.key)) return;
    e.preventDefault();                 // 空白鍵預設會捲動頁面
    try{ SFX.unlock(); }catch(_){}      // 鍵盤也是使用者手勢
    if(e.repeat){ setFast(true); return; }
    advance();
  });
  window.addEventListener('keyup', e=>{ if(isGo(e.key)) setFast(false); });
  /* ⚠ 視窗失焦要把加速關掉：按著空白切走的話 keyup 收不到，回來會一路自己播完。 */
  window.addEventListener('blur', ()=>setFast(false));

  /* 「選單」（ver -394 由 ✕ 改名；-397 改成開一個真的選單）。
     ⚠ 「回到主選單」才是原本那顆 ✕ 的行為 —— 收劇情層（順帶收城鎮，見 close）。 */
  const ex=$('storyExit');
  /* ⚠ 齒輪與吊墜同一條規矩（ver -440）：它不是「點畫面」，見 `swallowTap`。 */
  swallowTap(ex);
  if(ex) ex.addEventListener('click', e=>{ e.stopPropagation();
    settings.open({ onHome: goHomeNow }); });
  window.addEventListener('resize', ()=>{ if(active){ layout(); layoutKerberos(); } });
}

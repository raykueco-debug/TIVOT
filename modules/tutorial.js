/* ============================================================================
 *  modules/tutorial.js — 教學關卡（首次出陣的穿插式對話教學＋腳本化終盤）
 *  ---------------------------------------------------------------------------
 *  職責：首次判定（localStorage）、對話步驟依戰鬥節點觸發、監察官/搭檔立繪
 *    自左右移入與「說話者原色、非說話者調暗」、打字機對話框、跳過鈕、
 *    罵人插話（按錯/延時）、以及腳本化終盤流程：
 *      第三盤破防值滿 → 暫停＋箭頭引導點計量表 → 雙槍破防 → 清盤
 *      → 第四盤三爪即死 → 即死防禦 → 箭頭引導右滑聖徒化
 *      → MB 過關 or 臨界（99）攔截引導上滑生命歸還 → 收尾殺敵 → 教學專屬結算。
 *    引導閘門（gate）期間遊戲暫停，玩家完成指定操作（點擊/滑動）才繼續。
 *
 *  對話插入期間＝真暫停：走 combat 注入的 pauseForDialog / resumeFromDialog
 *    （cutinPlaying 機制：鎖盤面點擊/延時懲罰/敵大絕生成與釋放/紅點反擊、
 *     凍結攻擊圈與計時碼表；聖徒化倒數槽亦凍結，見 saint.js）。
 *  內容資料一律讀 GAME_CONFIG.tutorial（台詞/腳本/參數），不寫死。
 *
 *  狀態擁有者：3.9（tutorialActive / tutorialDialog / tutorialRun）。
 *  依賴：state / config / audio；combat/weapon/saint/partner 原語一律經 init 注入
 *    （維持 §2 依賴方向：combat 為協調者 import 本模組並轉交所需原語）。
 * ========================================================================== */

import { GAME_CONFIG, asset } from '../config.js';
import { state } from '../state.js';
import { SFX } from '../audio.js';
import { L, decorateLine } from '../i18n.js';   // 多語言（跳過確認文案／台詞關鍵字金色粗字）
import { matchPortraits } from './tone.js';    // 立繪與背景的融合（葉節點）
import * as progress from '../script/progress.js';   // 旗標（戰鬥內短教學的「講過了」）
import { ART } from '../script/speakers.js';   // 「這張畫能不能水平翻」的唯一真相（ver -625）
/* ⚠ 只借**兩支演出原語**：音效名→檔案的表（`SE_FILES`）只有 story.js 一份（鐵律 7），
   抄過來必然走鐘。story.js 不 import 本檔，所以沒有循環相依。 */
import { playSe, playSePair } from './story.js';
import * as hap from './haptics.js';        // 畫面震動＝手上也震（§6.5.6）

const $ = id => document.getElementById(id);
const CFG = () => GAME_CONFIG.tutorial;

/* combat 於啟動時注入：
 *   pauseForDialog / resumeFromDialog — 真暫停/續戰
 *   activateDual    — weapon：發動雙槍破防（引導點擊計量表後呼叫）
 *   activateSaint   — saint：發動聖徒化（引導右滑後呼叫）
 *   tryPartnerActive— partner：主動技統一入口（引導上滑 → 生命歸還）
 *   lethalStrike    — combat：三爪重擊腳本（致死 → 即死防禦保 1 HP）
 *   capEnemyHp      — combat：敵殘血封頂（聖徒化收尾保證本盤能殺完）      */
let api = {};
export function init(a){ api = a; bindUI(); }
/* 選單層 api（main.js 注入）：openPrep＝開出擊整備頁（跳過教學確認「是」的去向；內含 SI_01） */
let menuApi = {};
export function setMenuApi(a){ menuApi = a || {}; }

let stepsLeft = [];            // 尚未觸發的步驟（依 trigger 消耗，一步只觸發一次）
let queue = [];                // 對話中被觸發的步驟 → 當前段講完直接接續（立繪不退場）
let cur = null, lineIdx = 0;   // 進行中的步驟與台詞游標
let typeTimer = null;          // 打字機計時器
let fxTimer = null;            // 演出拍的自動接續計時器（ver -478；收段時要一起清）
let lineGuideOn = false;       // 逐句雪鐵龍箭亮著（ver -478；下一句/收段時收掉）
let startTimer = null;         // battleStart 延遲計時器
let pendingGate = null;        // 當前段落講完後要進入的引導閘門
let gate = null;               // 進行中的閘門 {type:'click'|'right'|'up', action, after}
let defendedDone = false;      // 首次防禦成功已發生（罵人停用、延時懲罰恢復）
let dualGuideDone = false;     // 雙槍引導已觸發（破防值封頂解除）
let saintCritFired = false;    // 聖徒化臨界攔截已觸發（saintFail 只出一次）
let cutinWaiters = [];         // afterCutin 輪詢計時器（teardown 清理）
let cutinLine = -1;            // 已播過 cut-in 的台詞索引（重讀同一句不重播）
let soloRun = false;           // 本場全程只有一個人講話（立繪放大；maybeStart 判定）
let awaitDualEnd = false;      // 劇情版：破防那一盤打完就收尾（等下一盤載入）

/* ── 戰鬥內的短教學／插話（ver -426）─────────────────────────────────────
   `config.battles[<場次>].talk` ＝**那一場自己的**幾句話，掛在既有的 trigger 上
   （`battleStart` / `board:N` / `threat` / `defended`）。
   ⚠⚠ **共用同一支對話實作**（openStep 那一條，鐵律 8）：立繪、打字機、真暫停、
     退場時序全部不另寫一份 —— 另寫一份必然與教學的手感走鐘。
   ⚠⚠ 但**與教學是兩回事**：教學那一整套（鎖攻擊力 2、敵人打不死、教學結算、
     引導閘門、罵人插話）一律只看 `state.tutorialActive`，這裡從頭到尾不碰它
     （§6.5.2「框是共用的，教學那一套不是」）。
   ⚠ `once:'<旗標>'`＝這一輪遊戲只講一次（走 `progress` 的旗標，所以讀檔會跟著回去，
     §6.9）。不寫就是每次打都講。 */
let talkLeft = [];             // 這一場還沒觸發的 talk 步驟（同 stepsLeft，一步只觸發一次）
let talkTimer = null;          // battleStart 延遲計時器（同 startTimer，兩者不會同時存在）
/* 這一場的**站位預設**（ver -619，Ray：「諾要永遠站右側」）：
   戰鬥卡寫 `talkSides:{nouvelle:'right'}`，整場所有段落都吃 ——
   逐段寫一次必然有人漏掉，而站位錯了就是「同一個人一下左一下右」。
   ⚠ 段落自己的 `sides` 仍可覆寫（覆寫贏），但這一場不需要。 */
let talkSides=null;
export function startBattleTalk(list, opts){
  clearTimeout(talkTimer); talkTimer=null;
  talkLeft = [];
  talkSides = (opts && opts.sides) || null;
  if(!list || !list.length) return;
  const once = opts && opts.once;
  if(once && progress.hasFlag(once)) return;    // 打贏過了（旗標由 combat 的勝利收尾記，ver -493）
  talkLeft = list.slice();
  soloRun = computeTalkSolo(talkLeft);          // 只有一個人講 → 立繪放大（同教學的規矩）
  resetCamera();                                // 這一場重新量一次相機（見 cameraPxCm）
  /* ⚠⚠ 開場白要等**玩家看得到戰鬥畫面**（ver -478，Ray：「先進戰鬥畫面，
     咆哮震動再彈蕾娜」）：槍棺還在開（gateHold 的真暫停＝cutinPlaying）就等門 ——
     否則吼聲與震動在門後面就演掉了。只等開場這一次；之後各節點的插話照舊。 */
  const fireStart=()=>{
    if(state.cutinPlaying){ talkTimer=setTimeout(fireStart, 120); return; }
    talkTimer=null; fire('battleStart');
  };
  talkTimer = setTimeout(fireStart, CFG().startDelayMs||700);
}
/* 獨腳戲判定同 computeSoloRun：**以整場為單位**，不逐段看台上幾個人 ——
   逐段判的話同一張立繪會在插話時忽然放大再縮回去（ver -324 定過的規矩）。 */
function computeTalkSolo(list){
  const who=new Set();
  (list||[]).forEach(st=>(st.lines||[]).forEach(l=>{ if(l && l.who) who.add(l.who); }));
  return who.size<=1;
}
function talkFire(trigger){
  if(!talkLeft.length) return;
  const i=talkLeft.findIndex(s=>s.trigger===trigger && whenOk(s));
  if(i<0) return;
  const step=talkTake(i);
  /* 開場白還沒插入就被別的節點搶先 → 先講開場白，這一段排隊接上（同 fire 的作法）。
     ⚠ 這條路是**常態不是例外**：開場的大絕是 0~3 秒內隨機排的（`scheduleOpeningUlt`），
       而開場白要等 `startDelayMs`（700ms）—— 紅點先到的機率不低。 */
  if(trigger!=='battleStart' && talkTimer){
    clearTimeout(talkTimer); talkTimer=null;
    const bi=talkLeft.findIndex(s=>s.trigger==='battleStart');
    if(bi>=0){ queue.push(step); openStep(talkTake(bi)); return; }
  }
  if(state.tutorialDialog){ queue.push(step); return; }
  openStep(step);
}
/* ⚠⚠ `talkOnce` 的旗標**不在這裡記了**（ver -493；-426 曾記在「最後一段被取走」）——
   Ray 定案：劇情戰的開場白**敗北重來每次都要播、打贏才永久停播**（憲法 §6.5.2
   「打贏才記」原則的直接應用）。記錄點在 combat 的勝利收尾（win／storyBattleEnd）。 */
function talkTake(i){
  return talkLeft.splice(i,1)[0];
}
function endBattleTalk(){
  clearTimeout(talkTimer); talkTimer=null;
  talkLeft=[];
}

/* ---- 首次判定（localStorage 不可用時視為未看過：寧可多教，不漏教）---- */
function hasSeen(){ try{ return localStorage.getItem(CFG().storageKey)==='1'; }catch(e){ return false; } }
function markSeen(){ try{ localStorage.setItem(CFG().storageKey,'1'); }catch(e){} }

/* ---- 首頁「教學」鈕：下一場出陣強制進教學（不動已看旗標；用畢即清）---- */
let replayRequested = false;
/* ⚠ 劇情帶起來的教學與首頁「教學」鈕是**兩件事**（Ray 指定要分開）：
   前者是主線的一段（諾薇兒帶），後者是隨時可重看的教材（芙蕾雅／蕾妮帶）。
   ver -323 起**台詞也分**：storyRun 時整份改讀 `config.tutorial.story`
   （稿子與改寫依據見 script/TUTORIAL_LINES_NOUVELLE.md）。
   ⚠ **只換台詞，不換流程** —— 觸發點、節奏、教的東西、閘門全部共用同一套程式碼。
     這是刻意的：教學本身的手感已經校過，另寫一份必然會走鐘。
   ⚠ 兩者都不動「已看過」旗標（requestReplay 本來就不動），所以劇情跑過教學
     不會讓首次出陣的自動教學消失。
   ⚠ ja/en 沒有 story 那一份（中文母本層先定案，見 STYLE.md）→ storyCfg() 回 null
     → 自動退回芙蕾雅／蕾妮那一份。是預期行為，不是漏翻。 */
let storyRun = false;
export function requestReplay(opts){ replayRequested = true; storyRun = !!(opts && opts.story); }
export function isStoryRun(){ return storyRun; }

/* ---- 首頁出陣分流：尚未看過教學（首次出陣會自動進教學）→ 跳過整備頁直接開戰 ---- */
export function isFirstRun(){ return !hasSeen(); }

/* ============================================================================
 *  進場/節點掛鉤（combat / defense / saint 經協調者呼叫）
 * ========================================================================== */
// startGame 於首盤載入後呼叫：首次（未看過）才啟動教學
export function maybeStart(){
  const cfg = CFG();
  if(!cfg || !cfg.steps || !cfg.steps.length) return;
  if((hasSeen() && !replayRequested) || state.tutorialActive) return;
  // ⚠ storyRun 只跟著「這一次的 requestReplay」走：不是被劇情叫起來的（首次出陣自動教學）
  //   就一定是原版那一份，否則上一場劇情教學的旗標會漏到下一場。
  if(!replayRequested) storyRun = false;
  replayRequested = false;
  state.tutorialActive = true;
  state.tutorialRun = true;         // 存續到結算（inspector 據此切教學專屬台詞/按鈕）
  state.tutorialStoryRun = storyRun;   // 劇情版：inspector 據此整段跳過教學結算
  soloRun = computeSoloRun();       // 獨腳戲 → 立繪放大（整場一致，見 applyPortraitFit）
  resetCamera();                    // 這一場重新量一次相機（見 cameraPxCm）
  /* 教學進行中的旗標：**只給 CSS 用**（開發者跳關鈕的顯示條件，ver -366）。
     ⚠ 不要拿它當狀態判斷 —— 狀態的真相在 `state.tutorialActive`（鐵律 2）。 */
  document.body.classList.add('tut-on');
  stepsLeft = cfg.steps.slice();
  /* 劇情版**到破防教學為止**（Ray 指定）：拿掉 'strike' 這一步，
     連帶整條「劇情殺三連擊 → 即死防禦 → 聖徒化 → MB／生命歸還」都不會發生
     （那條鏈是掛在 onStepClosed('strike') 上的）。聖徒化留給劇情後面自己教。
     ⚠ 不要改成「不講 saintCall 的台詞」——流程還是會跑，玩家會卡在沒有引導的閘門。 */
  if(storyRun) stepsLeft = stepsLeft.filter(s=>s.trigger!=='strike');
  awaitDualEnd = false;
  queue = [];
  defendedDone = dualGuideDone = saintCritFired = false; dualForce = false; attackScoldCount = 0; deadHandled = false;
  pendingGate = null; gate = null;
  /* 跳過鈕：劇情帶起來的那一場**不給跳**（Ray 指定）——
     它是主線的一段，跳掉之後劇情接不下去（後面那幕接的是「打完了」）。
     首頁「教學」鈕那一場照舊可跳，那本來就是隨時可重看的教材。 */
  const sk=$('tutSkipBtn'); if(sk) sk.classList.toggle('on', !storyRun);
  clearTimeout(startTimer);
  startTimer = setTimeout(()=>fire('battleStart'), cfg.startDelayMs||700);
}
/* ══⚠⚠ **血量觸發**（ver -599，Ray：「戰鬥卡的 talk 加血量觸發，反正這個怪只會
   出現一次」）══ 兩種寫法，都走 `fire()` 那個唯一的派送（鐵律 8）：
     `hp:30`   敵人血量**掉到 30% 以下**時觸發
     `php:99`  玩家血量**回到 99% 以上**時觸發（聖徒化期間那條槽也是玩家血）
   ⚠ 由 combat 在血量真的變動之後呼叫（`onHpChange`）—— 不要用計時器輪詢：
     那會在「剛好跨過門檻的那一幀」與演出搶拍。
   ⚠ 同時有好幾個門檻符合時取**最接近的那一個**（敵人取最大的 N、玩家取最小的 N）：
     一次只該觸發剛跨過的那一道。 */
/* `fire()` 在 completeGate 裡被同名的區域變數遮蔽了，所以另開一個對外的別名。 */
function fireTrigger(t){ fire(t); }

/* ══⚠⚠ **段落的附加條件** `when`（ver -612，Ray：「boss 戰只要開一槍諾薇兒就會跳
   撐不住了」）══ 光靠 trigger 不夠：`php:99`（玩家血回到 99%）在**開場就成立**
   —— 玩家滿血，第一發傷害一呼叫 `onHpChange` 就把那一段吐出來了。
   而稿上那一句的意思是「**聖徒化期間**那條倒數槽被推回 99%」，所以要再加一個條件。
   ⚠ 條件寫成**具名**的（資料層寫不了函式，同 `gate.action`），對照表只有這一張。
   ⚠ 條件不成立時**不消耗**那一段（`fire` 的 findIndex 一併過濾）——
     消耗掉的話之後就再也不會演了。 */
const WHEN = {
  saint:   ()=>!!state.saintMode,      // 聖徒化進行中
  nosaint: ()=>!state.saintMode,
};
function whenOk(step){
  const w = step && step.when;
  if(!w) return true;
  const fn = WHEN[w];
  if(!fn){ console.info('[tutorial] 不認得的段落條件：', w); return true; }
  return !!fn();
}
export function onHpChange(){
  const list = state.tutorialActive ? stepsLeft : talkLeft;
  if(!list || !list.length) return;
  const emax=state.enemyMax||0, pmax=state.playerMax||0;
  const ep = emax ? (state.enemyHp/emax*100) : null;
  const pp = pmax ? (state.playerHp/pmax*100) : null;
  let hit=null;
  for(const st0 of list){
    if(!whenOk(st0)) continue;        // 條件不成立的那一段先跳過（ver -612）
    const t=String(st0.trigger||'');
    let m=/^hp:(\d+(?:\.\d+)?)$/.exec(t);
    if(m && ep!=null && ep <= +m[1]){
      if(!hit || hit.kind!=='hp' || +m[1] > hit.n) hit={ kind:'hp', n:+m[1], t };
      continue;
    }
    m=/^php:(\d+(?:\.\d+)?)$/.exec(t);
    if(m && pp!=null && pp >= +m[1]){
      if(!hit || (hit.kind==='php' && +m[1] < hit.n)) hit={ kind:'php', n:+m[1], t };
      continue;
    }
    /* `phplow:N` ＝玩家血量**掉到** N% 以下（ver -672，惡夢化熔斷前的引導）。
       ⚠ 與 `php:N` 是**相反方向**：那一支是「回到 N% 以上」（聖徒化的倒數槽往上推），
         這一支是「抽到 N% 以下」（惡夢化的倒數槽往下抽）。同一個血條、兩個方向。 */
    m=/^phplow:(\d+(?:\.\d+)?)$/.exec(t);
    if(m && pp!=null && pp <= +m[1]){
      if(!hit || hit.kind!=='phplow' || +m[1] > hit.n) hit={ kind:'phplow', n:+m[1], t };
    }
  }
  if(hit) fire(hit.t);
}

// combat.loadBoard 每次載盤呼叫 → 觸發 'board:N' 步驟
export function onBoardLoaded(idx){
  /* 劇情版收尾：破防教學那一盤清完 → 下一盤載入的這一刻接「收拾他吧」。
     ⚠ 掛在「下一盤載入」而不是「雙槍窗口關閉」：窗口會因為清盤、敵死、逾時
       好幾種原因關掉，只有載新盤才真的代表「這一輪打完了」。 */
  if(awaitDualEnd && !state.dualWield){ awaitDualEnd=false; finishStoryRun(); return; }
  fire('board:'+idx);
}
/* 劇情版教學的收尾：封頂敵血（保證收尾台詞後一盤內殺完）→ 「撐過來了……收拾他吧！」
   ⚠ 用 finishLR 不用 finishMB：MB 那句寫的是「體力也回來一些了」，
     劇情版沒有聖徒化也沒有回血，講出來對不上畫面。 */
function finishStoryRun(){
  if(!state.tutorialActive) return;
  markSeen();
  /* ⚠ 劇情版用 `storyFinishEnemyHp`（90）不是 `finishEnemyHp`（70，ver -358）：
     那 70 是「聖徒化＋MB 之後」的殘血，劇情版沒有聖徒化那一段，玩家手上只有
     剛學會的雙槍破防與普攻 —— Ray：「聖徒 hp 改為破防結束以後可以一盤內收拾的血量」。 */
  const t=CFG();
  if(api.capEnemyHp) api.capEnemyHp(t.storyFinishEnemyHp!=null ? t.storyFinishEnemyHp : t.finishEnemyHp);
  openScript('finishLR');
}
// defense.spawnThreat 生成紅點時經注入呼叫 → 觸發 'threat' 步驟（紅點凍結於畫面講解）
export function onThreatSpawned(){ fire('threat'); }
// defense.resolveThreat 點掉紅點 → 'defended' 步驟（grade='counter'|'perfect'|'block'）。
//   反擊教學階段（defended 未過）點太早（block）不算過關：監察官已插話「太早」（onEarlyBlock），
//   收段後重放一次反擊圈（見 onStepClosed 'earlyRetry'），直到點出 Perfect / Counter 才進「防得好」段。
export function onThreatResolved(grade){
  if(state.tutorialActive && !defendedDone && grade==='block') return;
  defendedDone = true;    // 防禦成功：延時懲罰恢復、罵人停用（「第二盤結束前不再跳任何提示」）
  fire('defended');
}
// combat 致死鏈呼叫（即死防禦已用盡/不可用時）：教學戰不設戰敗——
//   監察官「服了你了。重來！」收段後該段重來（segmentRestart）。回傳 true＝已接手。
let deadHandled = false;
export function onPlayerDead(){
  if(!state.tutorialRun) return false;
  if(deadHandled) return true;
  deadHandled = true;
  queue = [];                                        // 佇列段落全廢棄：整場即將重開
  if(state.tutorialDialog) closeDialog(false, true); // 蓋掉現開段落，確保 dead 段獨占（不被接續吃掉）
  const line=scoldCfg().dead || '服了你了。重來！';
  openStep({ key:'tutorialDead', lines:[scoldLine(line)] });
  return true;
}
// combat 於「按錯 / 延時懲罰」時呼叫 → 監察官罵人（defended 之後不再插話）
export function onMistake(kind){
  if(!state.tutorialActive || state.tutorialDialog || state.over || defendedDone || deadHandled) return;
  const pool = scoldCfg()[kind];
  if(!pool || !pool.length) return;
  const text = pool[Math.random()*pool.length|0];
  openStep({ lines:[scoldLine(text)] });
}
// defense.resolveThreat 太早防禦（Defense 格擋半傷）→ 監察官「太早了！」。
//   不受 defended 停用限制（每次太早都提醒）；聖徒化期間不插（格擋是推進機制、節奏緊湊）。
export function onEarlyBlock(){
  if(!state.tutorialActive || state.tutorialDialog || state.over || state.saintMode || deadHandled) return;
  const pool = scoldCfg().early;
  if(!pool || !pool.length) return;
  // key='earlyRetry'：反擊教學階段收段後重放反擊圈（onStepClosed 分流；已過 defended 則只罵不重放）
  openStep({ key:'earlyRetry', lines:[scoldLine(pool[Math.random()*pool.length|0])] });
}
// combat 延時懲罰前詢問：整段反擊教學（第二盤起、首次防禦成功前）不套延時懲罰——
//   玩家慢慢讀圈、等圈、重試都不受罰；第一盤（純練清盤）維持有懲罰（台詞已預告）。
export function delayPenaltySuppressed(){
  return state.tutorialActive && state.boardIndex>=1 && !defendedDone;
}
// defense.scheduleUlt 詢問：教學中暫緩敵大絕的情境——
//   ① 前 noUltBoards 回合（第一回合純清盤）② 第四回合聖徒化發動前（劇情殺腳本盤）
//   ③ 場上已有紅點（教學全程一次只出一顆，凍結講解/立繪在場時不疊點）
export function ultSuppressed(){
  if(!state.tutorialActive) return false;
  if(state.boardIndex < (CFG().noUltBoards||0)) return true;
  // ⚠ 劇情版沒有聖徒化腳本盤（saintUsedThisBattle 永遠 false）→ 這條會把大絕壓死，
  //   第四盤起敵人再也不出手。只有原版教學要它。
  if(!storyRun && state.boardIndex===3 && !state.saintUsedThisBattle) return true;
  if(state.threats.length>0) return true;
  return false;
}
/* defense.spawnThreat 詢問：防禦教學期間的紅點用**固定位置**。
   ⚠⚠ 條件是「防禦還沒教會」（!defendedDone），不是「threat 這一步還沒觸發」——
     舊寫法一觸發就不算數了，於是**太早格擋、重放的那一顆會跳到別的地方**
     （Ray：「第一個敵攻擊點固定出同一位置，失敗也不要變」）。
     教學階段的紅點位置是教材的一部分：位置一直換，玩家會以為自己記錯了。 */
export function firstThreatPending(){
  return (state.tutorialActive && !defendedDone) || talkPendingThreat();
}
/* 紅點的**生成帶**：只要這一場會有對話插進來（教學／戰鬥內短教學），紅點就一律走
   中央帶 —— 左右是立繪、下方是對話框，落在那些地方的紅點在講解時根本看不見。
   ⚠⚠ 兩者共用同一組數字（`config.tutorial.threatSpawn`，鐵律 7）：立繪與對話框的
     位置本來就是同一套版面，另訂一組必然走鐘。放在 tutorial 那一節下面是因為
     那組數字是**對著這個對話框**量的，不是因為它「只給教學用」。
   ⚠ 回 null ＝不限制（一般戰鬥照舊 left 20~80 / top 25~70）。 */
export function threatBand(){
  return (state.tutorialActive || talkPendingThreat()) ? (CFG().threatSpawn||null) : null;
}
function talkPendingThreat(){ return talkLeft.some(st=>st.trigger==='threat'); }
// combat.tap 每次正確消格呼叫（cleared＝本盤已消格數）：第四回合清滿 strike.afterCells
//   → 觸發「小心！」劇情殺段
let attackScoldCount = 0;   // 反擊教學「紅圈在場還猛點盤面」插話次數（首次罵、之後無言）
export function onBoardProgress(cleared){
  if(!state.tutorialActive || state.tutorialDialog || deadHandled) return;
  // 反擊教學未過（defended 未觸發）且紅圈在場：玩家不看字猛點盤面攻擊 →
  //   監察官插話「你倒是防禦啊！」，第二次起改「…………」（台詞 config.scold.attackDuringThreat）
  if(!defendedDone && state.threats.length>0){
    const sc=scoldCfg().attackDuringThreat;
    if(sc){
      attackScoldCount++;
      openStep({ lines:[scoldLine(attackScoldCount===1 ? (sc.first||'') : (sc.rest||'…………'))] });
      return;
    }
  }
  const st = CFG().strike || {};
  if(state.boardIndex===3 && cleared >= (st.afterCells||8)) fire('strike');
}
// combat.addEnergy 詢問：雙槍引導前破防值封頂（preFullEnergy），第三盤放行。
//   dualForce＝削血保底觸發中（敵 HP ≤ dualForceHpRatio）：解除封頂讓 fillEnergy 一次填滿。
let dualForce = false;
export function energyCapActive(){
  return state.tutorialActive && !dualGuideDone && !dualForce && state.boardIndex<2;
}
// combat.enemyDamage 每次敵掉血呼叫（非教學為 no-op）：削血保底觸發——
//   玩家用反擊猛削血時，破防/聖徒化教學不因「還沒輪到觸發條件」而被永遠跳過。
//   ≤ dualForceHpRatio 未進破防教學 → 填滿破防值，走原本的滿值引導路徑；
//   ≤ strikeForceHpRatio 已過破防教學而劇情殺未觸發 → 直接觸發「小心！」段。
export function onEnemyHp(ratio){
  if(!state.tutorialActive || state.tutorialDialog || state.over) return;
  if(state.dualWield || state.saintMode || state.cutinPlaying) return;
  const t=CFG();
  if(!dualGuideDone && ratio <= (t.dualForceHpRatio!=null ? t.dualForceHpRatio : 0.5)){
    dualForce = true;                       // 解除 preFullEnergy 封頂
    if(api.fillEnergy) api.fillEnergy();    // 滿值瞬間 → onEnergyFull → dualReady 引導
    return;
  }
  if(dualGuideDone && ratio <= (t.strikeForceHpRatio!=null ? t.strikeForceHpRatio : 0.3)){
    fire('strike');                         // 步驟已消耗則 no-op（與 onBoardProgress 天然去重）
  }
}
// combat.addEnergy 於破防值滿的瞬間呼叫 → 雙槍引導（暫停＋箭頭指向計量表）
export function onEnergyFull(){
  if(!state.tutorialActive || dualGuideDone) return;
  dualGuideDone = true;
  // 反擊/防禦教學若還沒觸發（玩家一路沒防禦），至此已無意義 → 撤下殘餘步驟，
  // 並視同反擊教學結束（defendedDone）：延時懲罰恢復、猛點盤面/太早格擋插話停用
  stepsLeft = stepsLeft.filter(s=>s.trigger!=='threat' && s.trigger!=='defended');
  defendedDone = true;
  openScript('dualReady', { gate:{
    type:'click', immediate:true,   // 對話彈出即亮箭頭，可直接點計量表（不必先點完台詞）
    action: ()=>api.activateDual(),
    after:  ()=>afterCutin(()=>openScript('dualGo')),
  }});
}
// saint.saintAdvance 於倒數槽推至臨界（滿-1）時呼叫 → 生命歸還引導（不進 OBE）
/* ══⚠⚠ **還有人在等「倒數槽推到 99%」那一拍嗎**（ver -619，Ray：「生命歸還在 OBE 後
   不能用，所以要在生命 99% 時發動」）══
   聖徒化的倒數槽推滿＝OBE，而 OBE 一走生命歸還就沒得用了 —— 所以教學／劇情要在
   **滿 −1** 攔下來。攔截的實作在 `saint.saintAdvance`（唯一那一處），
   要不要攔由這一支回答。
   ⚠⚠ 舊版把攔截寫死成 `state.tutorialActive`（ver -619 前）—— 於是**戰鬥卡的
     `talk`**（BOSS 的聖徒化教學，那一場不是教學）整條吃不到：槽推滿 → OBE →
     玩家永遠等不到「我撐不住了」那一拍，也發不了生命歸還。
   ⚠ 判定看**還沒演的那一段**（`talkLeft` 裡還有 `php:` 觸發），不是看旗標：
     那一段演過就從清單裡取走了，不必另記一支旗（鐵律 9）。 */
export function saintCriticalPending(){
  if(state.tutorialActive) return !saintCritFired;
  return (talkLeft||[]).some(st0 => /^php:/.test(String(st0.trigger||'')));
}
export function onSaintCritical(){
  /* 戰鬥卡的 `talk`：攔在 99% 之後就交回血量觸發，由 `php:99` 那一段自己接手。 */
  if(!state.tutorialActive){ onHpChange(); return; }
  if(saintCritFired) return;
  saintCritFired = true;
  openScript('saintFail', { gate:{
    type:'up',
    action: ()=>api.tryPartnerActive('saint'),
  }});
}
// saint 結局掛鉤：'mb'＝Maximum Burst（未擊殺）、'return'＝生命歸還。
//   cut-in 結束後：收尾台詞 → 教學完成（記已看）。敵血不再中途壓縮——
//   教學總血量（config.tutorial.enemyHp）開場即依終盤 overkill 條件反推固定。
export function onSaintEnded(kind){
  if(!state.tutorialActive) return;
  if(kind!=='mb' && kind!=='return') return;
  afterCutin(()=>{
    if(!state.tutorialActive) return;
    markSeen();
    // 敵殘血封頂（config.finishEnemyHp）：保證收尾台詞後「一盤內」殺進 overkill 結束教學戰
    if(api.capEnemyHp) api.capEnemyHp(CFG().finishEnemyHp);
    openScript(kind==='mb' ? 'finishMB' : 'finishLR');
  });
}

/* ============================================================================
 *  步驟觸發 / 腳本段落
 * ========================================================================== */
function fire(trigger){
  if(!state.tutorialActive){ talkFire(trigger); return; }
  const i = stepsLeft.findIndex(s=>s.trigger===trigger && whenOk(s));
  if(i<0) return;
  const step = stepsLeft.splice(i,1)[0];
  if(state.tutorialDialog){ queue.push(step); return; }   // 對話中觸發 → 排隊接續播
  // 開場白尚未插入（startDelayMs 未到）就被其他節點搶先 → 先講開場白，該節點排隊
  if(trigger!=='battleStart' && startTimer){
    clearTimeout(startTimer); startTimer=null;
    const bi = stepsLeft.findIndex(s=>s.trigger==='battleStart');
    if(bi>=0){
      const bs = stepsLeft.splice(bi,1)[0];
      queue.push(step);
      openStep(withStoryLines(bs));
      return;
    }
  }
  openStep(withStoryLines(step));
}
/* 劇情版：整段換掉 lines（流程／觸發點不動，只換誰在講、講什麼）。 */
function withStoryLines(step){
  if(!step) return step;
  const L=linesForStep(step.trigger, null);
  return L ? { ...step, lines:L } : step;
}

// 腳本段落（config.tutorial.script[key]）：由內部流程觸發，不走 steps 的 trigger。
//   opts.gate＝段落講完後進入的引導閘門（完成指定操作才續戰）。
function openScript(key, opts){
  if(!state.tutorialActive) return;
  const raw0 = (CFG().script||{})[key];
  const raw = scriptLines(key, raw0);
  const lines = Array.isArray(raw) ? raw : (raw && raw.lines);
  if(!lines || !lines.length) return;
  pendingGate = (opts && opts.gate) || null;
  openStep({ key, lines, center: !Array.isArray(raw) && !!raw.center });   // center＝立繪移畫面正中
}

// 段落收掉後的腳本接續（closeDialog 於 resume 時呼叫；skip/abort 走 silent 不觸發）
function onStepClosed(id){
  if(id==='tutorialDead'){
    // 教學陣亡收段：「該段重來」——滿血重建當前盤面，已完成的教學段落不重播
    //   （教學步驟/旗標不動；combat.tutorialSegmentRestart 負責戰鬥面重置）
    deadHandled=false;
    api.resumeFromDialog();      // 解除對話暫停（本段走同步收段，未經一般 finish 流程）
    if(api.segmentRestart) api.segmentRestart();
    return;
  }
  if(id==='earlyRetry'){
    // 太早格擋收段：反擊教學未過（defended 未觸發）→ 立即重放一次反擊圈，
    // 玩家點出 Perfect/Counter 才過關；已過 defended 的太早提醒不重放（自然排程接手）
    if(!defendedDone && api.respawnThreat) api.respawnThreat();
    return;
  }
  if(id==='strike'){
    // 「小心！」收段 → 劇情殺三連擊（三種受擊畫面、第二擊三爪、末擊致死 → 即死防禦保 1 HP）
    //   → 即死防禦 cut-in 結束後聖徒化引導
    api.strike();
    afterCutin(()=>openScript('saintCall', { gate:{
      type:'right', immediate:true,   // 「沒時間了」彈出即亮箭頭，可直接右滑發動（不必先點完台詞）
      action: ()=>api.activateSaint('right'),
      after:  ()=>afterCutin(()=>openScript('saintStart')),
    }}));
    return;
  }
  if(id==='dualGo' && storyRun){
    awaitDualEnd = true;   // 劇情版：這一盤打完就收尾（見 onBoardLoaded）
    return;
  }
  if(id==='finishMB' || id==='finishLR'){
    endTutorial();    // 教學段落全數結束（tutorialRun 續留給結算；戰鬥交還玩家收尾）
  }
}

/* 等待當前 cut-in 演出結束再執行 fn：輪詢 cutinPlaying 的 true→false 邊緣；
 * 若 2.5 秒內從未見到演出（如無即死防禦搭檔的退化路徑），逾時直接執行。 */
function afterCutin(fn){
  const t0 = Date.now();
  let saw = state.cutinPlaying;
  const iv = setInterval(()=>{
    /* ⚠⚠ **不再要求 `tutorialActive`**（ver -613，Ray：「聖徒化之後的教學對話
       沒做進去」）—— 戰鬥卡的 `talk` 也在用它（`gate.then` 要等 cut-in 演完才接），
       而那一場不是教學：舊寫法第一拍就 `clearInterval` **而且不呼叫 `fn`**，
       於是聖徒化演完之後那一段從來沒有機會出現。
       ⚠ 收手的條件改成「這一場結束了」。 */
    if(state.over){ clearInterval(iv); return; }
    if(state.cutinPlaying){ saw = true; return; }
    if(saw || Date.now()-t0>2500){ clearInterval(iv); fn(); }
  }, 120);
  cutinWaiters.push(iv);
}

/* ============================================================================
 *  對話段：開啟（真暫停+立繪移入）→ 逐句 → 閘門或關閉（立繪退場+續戰）
 * ========================================================================== */
function castOf(who){ return (CFG().cast||{})[who] || {}; }
/* ── 劇情版教學的台詞（ver -323）──────────────────────────────────────
   ⚠ 兩份台詞是**分開的**（Ray 指定）：劇情帶起來的那一場由諾薇兒帶
   （`config.tutorial.story`），首頁「教學」鈕仍是芙蕾雅／蕾妮。
   ⚠ 只換**台詞**，不換流程 —— 觸發點、節奏、教的東西完全一樣，
     所以這裡只是查表換一份 lines，不動 steps 的結構。 */
function storyCfg(){ return (storyRun && CFG().story) ? CFG().story : null; }
function linesForStep(trigger, fallback){
  const S=storyCfg(); if(!S || !S.steps) return fallback;
  const MAP={ 'battleStart':'battleStart', 'board:1':'board1', 'threat':'threat',
              'defended':'defended', 'strike':'strike' };
  const k=MAP[trigger];
  return (k && S.steps[k]) ? S.steps[k] : fallback;
}
function scriptLines(key, fallback){
  const S=storyCfg(); if(!S || !S.script || !S.script[key]) return fallback;
  return S.script[key];
}
function scoldCfg(){ const S=storyCfg(); return (S && S.scold) ? S.scold : (CFG().scold||{}); }
/* 插話用的一句：劇情版是諾薇兒（配同一張差分），原版是監察官。 */
function scoldLine(text){
  const S=storyCfg();
  return S ? { who:'nouvelle', img:(S.scold&&S.scold.img)||null, text }
           : { who:'inspector', text };
}
/* ══⚠⚠ **逐段的站位覆寫與清台**（ver -613，Ray：「諾薇兒固定站右位，蕾娜話講完
   立繪就移出，不然看不到雪鐵龍」「我撐不住了站左位」）══
   `cast[key].side` 是**全場**的固定站位（§6.5：同一個人每次都站同一邊）。
   但戰鬥內對白會在畫面上疊雪鐵龍箭，那一拍需要**把台清乾淨、把人挪開**——
   所以段落可以覆寫：
     `sides:{ nouvelle:'right' }`  這一段誰站哪邊
     `soloLine:true`               台上**只留現在講話的那一位**（講完就換人，前一位滑出）
   ⚠ 覆寫只到「這一段」為止（`openStep` 設、下一段自然被覆蓋）——
     不要寫成全域，那會把 §6.5 的固定站位打散。 */
let stepSides=null, stepSolo=false;
function sideOf(key){
  if(stepSides && stepSides[key]) return stepSides[key];
  return ((CFG().cast||{})[key]||{}).side;
}
/* ══⚠⚠ **換到非預設那一側 → 水平翻轉**（ver -619，Ray：「諾在喊準備好了的時候
   要站右側，人物水平翻轉。她的立繪是左右對稱的可以翻」）══
   §6.5 說「立繪朝向是畫死的，換邊要水平翻轉，髮旋與持物會左右顛倒」——所以
   **翻不翻是這張畫的性質**，寫在角色上（`cast[key].mirror`），預設不翻。
   ⚠ 判定只有這一支（鐵律 8）：站位覆寫（`sides`／`talkSides`）把她擺到
     `c.side` 以外的那一邊，才翻。
   ⚠ 兩個角色可能**共用同一個槽**（諾薇兒與蕾娜在這一場都被擺到右邊），所以
     這一支要在「**這個槽現在是誰**」被決定的每一處都呼叫一次 ——
     `syncCastFit`（整段）與 `showLine`（逐句換人）。 */
function applyMirror(el, key){
  if(!el) return;
  const c = (CFG().cast || {})[key] || {};
  const sd = sideOf(key);
  /* ⚠⚠ 「這張畫可不可以翻」問的是 **`speakers.js` 的 `ART[key].mirror`**（ver -625）——
     那是**這個角色的立繪**的性質，與「戰鬥對白把她擺哪一邊」（`cast[key].side`，
     這裡自己的安排）是兩件事。寫兩份必然走鐘（鐵律 7）：劇情頁與戰鬥對白會出現
     「同一個人這邊翻、那邊不翻」。 */
  const a = ART[key];
  el.classList.toggle('mirrored', !!(a && a.mirror && c.side && sd && sd!==c.side));
}
function portraitEl(c, key){
  const side = key ? sideOf(key) : (c && c.side);
  return side==='right' ? $('tutCastR') : $('tutCastL');
}

/* 依步驟台詞決定在場立繪：只有一個人說話的段落（如罵人插話）不出現另一名角色。
 * .in 逐立繪掛在 img 上（CSS transition 滑入/滑出）；段落接續（queue）時差異更新即可。 */
/* `uptoIdx`＝只讓**已經輪到過**的人上場（ver -478，落實 §6.5「說話的人先上場，
   接話的人輪到他那一拍才上場」——原本是整段的人一口氣全上）。
   不傳＝整段（舊行為，沒有別的呼叫端在用了，留著當保底）。 */
function syncCast(step, uptoIdx){
  const cast = CFG().cast || {};
  const lines = (step && step.lines) || [];
  const upto = (uptoIdx==null) ? lines.length-1 : uptoIdx;
  /* `soloLine`：台上只留**現在講話的那一位**（ver -613）—— 上一位滑出，
     箭頭那一側才空得出來。 */
  const used = stepSolo
    ? new Set([ (lines[Math.max(0,upto)]||{}).who ].filter(Boolean))
    : new Set(lines.slice(0, upto+1).map(l=>l.who));
  /* ⚠ 逐「槽」算，不是逐「角色」算：諾薇兒與芙蕾雅同站左側，共用同一個 <img>。
     逐角色 toggle 的話，沒講話的那一位會把講話那一位的 .in 關掉（結果取決於
     cast 的鍵順序 —— 這種對順序敏感的東西不要留）。 */
  const want = new Map();
  for(const key of Object.keys(cast)){
    const el = portraitEl(cast[key], key);
    if(!el) continue;
    if(used.has(key) || !want.has(el)) want.set(el, used.has(key));
  }
  for(const [el, on] of want){
    el.classList.toggle('center', on && !!(step && step.center));   // 正中模式（引導箭頭讓位）
    el.classList.toggle('in', on);
  }
}

/* ── 立繪取景（ver -324：獨腳戲放大到「頭到大腿」）────────────────────────
   兩套算法共用同一組 config 值（cast.fit 的 zoom/drop）：

     雙人場（原版教學：芙蕾雅＋蕾妮）
               照舊 —— height=baseH×zoom%、bottom=−drop%。這組數字是 ver -45
               手調到「兩人五官等大、身高差看得出來」的，不要動。
     獨腳戲（劇情版教學：只有諾薇兒）
               把同一組取景**放大 portraitSoloScale 倍，並把頭頂釘在原處**
               （放大後多出來的部分全部從**下面**溢出＝裁掉腿，不是裁掉頭）。

   ⚠ solo 是**整場**的屬性（computeSoloRun），不是逐段看台上幾個人 —— 理由見那裡。

   ⚠ 為什麼獨腳戲要另算：兩人版的尺寸是「兩個人要並排塞進 390 寬」逼出來的，
     台上只有一個人時那個限制不存在，卻還是照著縮 → 全身入鏡、臉只剩四十幾像素
     （Ray：「說明立繪調大」）。劇情版教學從頭到尾只有諾薇兒一個人。
   ⚠ 換算走**像素**不走 %：object-fit:contain 下「元素高」與「圖高」只有在
     寬度不吃緊時才相等，%＋max-width 兩個限制同時在跑很難算準頭頂落在哪。
     算好像素直接寫死，頭頂位置就是可預期的。
   ⚠ 放大時要一併鬆綁 CSS 的 max-width:62%（那是兩人版怕撞在一起的護欄），
     否則寬度先吃到上限、高度就長不上去了。 */
/* 這一場是不是「獨腳戲」（全程只有一個人講話）。
   ⚠ **要以整場為單位判定，不能逐段看台上幾個人**：原版教學的插話段只有芙蕾雅一個人，
     逐段判的話她會在插話時忽然放大 1.8 倍再縮回去 —— 同一張立繪出現兩個大小
     （Ray 在劇情頁定過同一條規矩）。
   ⚠ 判定看**資料**不看旗標：哪天再加第三份台詞（別的角色帶）也自動吃到。 */
function computeSoloRun(){
  const S = storyCfg(), who = new Set();
  const eat = arr => (arr||[]).forEach(l=>{ if(l && l.who) who.add(l.who); });
  if(S){
    Object.keys(S.steps||{}).forEach(k=>eat(S.steps[k]));
    Object.keys(S.script||{}).forEach(k=>{ const r=S.script[k]; eat(Array.isArray(r)?r:(r&&r.lines)); });
  }else{
    (CFG().steps||[]).forEach(st=>eat(st.lines));
    const sc=CFG().script||{};
    Object.keys(sc).forEach(k=>{ const r=sc[k]; eat(Array.isArray(r)?r:(r&&r.lines)); });
  }
  return who.size<=1;
}

function applyPortraitFit(el, fit, baseH, solo, side){
  const wrap=$('tutCast'), topEl=$('top');
  const F = (wrap && wrap.clientHeight) || (topEl && topEl.clientHeight) || 0;
  /* 有取景值 → 走**飛行畫面那一套**（鎖身高）。placePortraitX 會把高度也一起算，
     所以這裡只負責「沒有取景值」的退路。 */
  if(hasFrame(el)){ placePortraitX(el, side); return; }
  const k = solo ? (CFG().portraitSoloScale || 1) : 1;
  if(!F || k===1){                       // 沒量到高度就退回原本的 % 寫法（不至於整個消失）
    el.style.height = (baseH * (fit.zoom || 1)) + '%';
    el.style.bottom = (-(fit.drop || 0)) + '%';
    el.style.maxWidth = '';
    el.style.width=''; el.style.left=''; el.style.right='';   // 橫向交還 CSS（圖框貼邊）
    return;
  }
  const hBase = F * (baseH/100) * (fit.zoom || 1);
  const headY = F * (1 + (fit.drop||0)/100) - hBase;   // 兩人版這組取景的頭頂 y
  const h = hBase * k;
  el.style.height   = h + 'px';
  el.style.maxWidth = 'none';
  el.style.bottom   = (F - headY - h) + 'px';          // 負值＝往框下緣外溢（裁腿不裁頭）
  el.style.width=''; el.style.left=''; el.style.right='';
}
function frameOf(el){ return (CFG().portraitFrames || {})[el && el.dataset.imgKey]; }
function hasFrame(el){ const f=frameOf(el); return !!(f && f.cm && f.bot > f.top); }

/* ⚠⚠ 立繪的尺寸與位置**完全照飛行畫面那一套**（CLAUDE.md §6.5、modules/story.js）：

     縮放  鎖**身高**：每公分像素 × 角色身高 ÷ 這張圖裡人物的像素身高。
           每公分像素只由「頂線到底」與 castShow×castTall 決定 —— 是個常數，
           所以**同一張立繪永遠同一個大小**（Ray：「人物同一張立繪不可改變大小」）。
     站位  臉錨在 portraitFaceX 的左／右（`cast[key].side` 決定，不隨台詞變動）。
           只有一個人也**固定佔自己那一邊**，不置中（Ray 指定）。
     交疊  允許 —— 兩人同台輪廓會碰到，那是講好的代價（Ray：「可略覆蓋」）。

   ⚠ 錨的是**臉的中心**（fx）不是圖框中心：這些插畫左右留白差很多，
     圖框對齊 ≠ 臉對齊（差分之間實測會差 71px）。
   ⚠ 頭頂釘在頂線（portraitTopPct），**不是**把腳對齊 —— 教學的框下緣被對話框
     蓋掉一大塊，對腳等於把臉推出畫面。
   ⚠ 查不到取景值（芙蕾雅／蕾妮沒量過）就整段跳過，交給上面的舊算法。 */
/* ══ 相機快取（ver -346）══════════════════════════════════════════════
   ⚠⚠ `pxCm` 由 `#top` 的**當下高度**算出來，而手機瀏覽器的工具列會收合／彈回 ——
     視口一變，`#top`（height:50%）就跟著變幾十像素。立繪是**每一句**重算的，
     於是同一張立繪在相鄰兩句之間大小不同 ＝ Ray 回報的「戰鬥中忽大忽小」。
   規則：寬度沒變、高度變化在 18% 以內 → **沿用上一次的相機**。
     真的轉向（寬度變）或版面大改（>18%）才重量。
   ⚠ 進戰鬥要 `resetCamera()`，不然上一場的相機會跟著跨場沿用。 */
/* ⚠⚠ **連頂線與頭頂落點一起快取**（ver -350）。ver -346 只快取了 pxCm，Ray 回報
   手機上還是忽大忽小 —— 因為 `camTop`／`headTop` 每一句都去量那顆角落鈕的實際位置，
   而 iOS 的 `env(safe-area-inset-top)` 會隨網址列收合而變（47px ↔ 0），`#app` 的
   padding 跟著變、鈕跟著動、頂線就跟著動。**尺寸沒變、整個人上下跳**，讀起來一樣是
   「忽大忽小」（§6.5 早就記過：位移會被讀成縮放）。
   規則：一場之內取景是**常數**，寬度變了（轉向）才重量。 */
let cam = { w:0, h:0, px:0, head:0 };
function resetCamera(){ cam = { w:0, h:0, px:0, head:0 }; }
function cameraGeom(F, W, C, measure){
  if(cam.px && cam.w===W && cam.h && Math.abs(F-cam.h)/cam.h < 0.18) return cam;
  const m = measure();
  /* ⚠ 分母是 `m.Fref`（劇情頁那個框）不是 `F`（戰鬥自己的框）—— 見 placePortraitX 的說明。 */
  cam = { w:W, h:F, head:m.headTop,
          px:(m.Fref-m.camTop)/((C.castShow||0.56)*(C.castTall||176)) };
  return cam;
}

function placePortraitX(el, side){
  const fr = frameOf(el);
  const wrap=$('tutCast'), topEl=$('top');
  const F = (wrap && wrap.clientHeight) || (topEl && topEl.clientHeight) || 0;
  const W = (wrap && wrap.clientWidth)  || (topEl && topEl.clientWidth)  || 0;
  if(!hasFrame(el) || !F || !W){ if(!fr){ el.style.width=''; el.style.left=''; el.style.right=''; } return; }
  /* ⚠ `.center`（引導箭頭讓位那個模式）不碰 left：那個 class 靠 left:50% +
     translateX(-50%) 置中，寫死 inline left 會把它推歪半個身寬。 */
  const centered = el.classList.contains('center');
  const C = CFG();
  /* ⚠⚠ 頂線不得高於左上角那顆鈕的下緣（Ray：「頭頂不能超過清盤鈕，否則會被
     動態島吃掉」）。鈕吃 safe-area，所以**量它的實際位置**，不要寫死 ——
     瀏海機與平頭機的 safe-area 差很多（同 §6.5 頂線由 HUD 量出來的作法）。 */
  /* ⚠⚠ **相機的頂線**與**頭頂的落點**是兩件事（ver -346）：
       camTop  ＝ 算 pxCm 用的取景上緣 —— 維持原本的算法（鈕的下緣），
                 因為 castShow 0.68 是 Ray 對著這個框調出來的，動了她就變大變小。
       headTop ＝ 頭頂真正擺哪 —— 改夾鈕的**上緣**（Ray：「站太低，再往上一個頭身」）。
     原本兩者共用一個值，等於把整顆鈕的高度（44px）讓出來；但要閃開的只有
     瀏海／動態島，而 `#top` 已被 `#app` 的 padding 推到瀏海之下，鈕的上緣就是安全線。
     何況立繪站左（臉錨 0.24W）、退出鈕在右上，本來就不重疊。
     實測：大小不變（541→維持原本的 479），頭頂由 58px 上移到 12px。
     ⚠ 12px 已經是這個版面的上限 —— 再上去頭會被 `#top` 的 overflow 裁掉。 */
  /* ⚠⚠ **參考框改成與劇情頁同一個**（ver -352，Ray：「手機的戰鬥對話人太小，
       要與一般對話同比例同高度」）。
     戰鬥的立繪層是 `#tutCast`（＝ `#top`，佔 `#app` 的 50%），劇情頁的是 `#storyCast`
     （佔 56%）—— 拿各自的框去算 `pxCm`，同一張立繪當然一大一小（實測差 11%）。
     現在戰鬥這邊改用**劇情頁那個框**（`#app` 高 × 56%）當分母，並且頂線也照劇情頁
     那條（退出鈕上緣／下緣）量 —— 兩邊同一把尺，同一張圖就同一個大小。
     ⚠ 立繪會比 `#top` 高，多出來的由 `#top` 的 `overflow:hidden` 裁掉（本來就裁膝蓋以下）。
     ⚠ 量到的是 `#app` 座標，最後要換算回 `#tutCast` 座標（減掉兩者的 top 差）。 */
  /* ⚠⚠ 參考框要用**視口高**，不是 `#app` 的高（ver -354）。`#app` 是 `height:100%`，
       而 main.js 為了閃開 iOS「幽靈工具列」會取 100vh／100dvh 裡**較大**的那個 ——
       實測 `#app` 是 883 而視口只有 812（差 8.7%）。劇情頁的立繪框是
       `#storyStage`（`position:fixed; inset:0`）的 56%，也就是**視口**的 56%；
       戰鬥這邊若拿 `#app` 去乘，同一張立繪就會大 8.7%，而且 `#app` 的高在開機過程中
       還會變一次 —— 那就是「跑兩次高度 665 vs 732」的來源。 */
  const G = GAME_CONFIG.castStage || { topRatio:0.56, btnTop:10, btnH:44 };   // 單一真相（鐵律 7）
  const RATIO = G.topRatio;                 // 與劇情頁同一個數字，來源同一處
  const VH = window.innerHeight || document.documentElement.clientHeight || 0;
  /* ⚠⚠ **不量鈕的即時 rect，改由 CSS 常數推**（ver -354）。量到的值取決於「第一次排版
       剛好發生在哪一刻」：鈕若正好被藏起來（門還在開、結算 banner 開著）或版面還在轉場，
       `br.height` 是 0 → 頂線變成 3% → 整個人放大一成，而這個值又被快取一整場。
       實測同一段教學跑兩次，立繪高度 **665 vs 732**（差 10%）—— Ray 回報的「人物站位
       忽高忽低、到某一句才恢復」有一半是這個，與手機無關。
     ⚠ 戰鬥的退出鈕在 `#top` 內（`#app` 的 padding 已經讓過瀏海），所以**不吃 notch**；
       劇情層的鈕是相對全螢幕定位的，那邊要加（見 story.js 的 `topLines`）。 */
  /* ⚠ 頂線用**螢幕座標**（與劇情頁同一條）：退出鈕實際落在 `瀏海 + 10px`
     —— 劇情層的鈕相對全螢幕定位、戰鬥層的鈕在 `#top` 內而 `#app` 已被 padding 讓過瀏海，
     兩者算出來是同一個 y。最後再換算回 `#tutCast` 的座標系（減掉 wrap 的 top）。 */
  const BTN_H = G.btnH, BTN_TOP = G.btnTop;   // 同上：讀 config，不在這裡重寫
  const notch = (()=>{ const v=parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--notch-bar-h'));
    return isFinite(v) ? v : 0; })();
  const measure = ()=>({ camTop: notch + BTN_TOP + BTN_H + 4,
                         headTop: notch + BTN_TOP,
                         Fref: VH * RATIO });
  const g = cameraGeom(VH, W, C, measure);
  const pxCm = g.px;
  /* 頭頂：照劇情頁那一條（頂線 ＋ 身高讓位），再換算回 `#tutCast` 的座標系。
     ⚠ 身高讓位一律套用（§6.5「同一張立繪＝同一個結果」）—— 少了它，同一個人
       在戰鬥裡會比在劇情裡高一截（諾薇兒 165 vs 基準 176，差 11cm×pxCm ≈ 50px）。 */
  /* ⚠⚠ **一個 rect 都不要量**（ver -355，照飛行畫面那一套）。飛行頁的做法是
       `castMeasure()` 在 resize 時把 `CAST_TOP`／`CAST_PX_CM` 算成全域常數，之後
       每一句只是**讀**它們 —— 畫面上不會有任何逐句量測。
     這邊最後一個漏洞是 `wr0.top`（`#tutCast` 的螢幕位置）：它是逐句量的，而 iOS 的
       網址列一收合，`#app` 的 padding／位置就變 → 同一組取景算出不同的 `top`，
       **尺寸沒變、人上下跳**。
     現在改成純常數：`#tutCast` 的頂 ＝ `#app` 的 padding-top ＝ 瀏海高，
       所以「螢幕座標的頭頂」減掉瀏海就是「框內座標的頭頂」＝ `BTN_TOP + 身高讓位`。 */
  const headTop = BTN_TOP + (( C.castTall||176 ) - fr.cm) * pxCm;
  const nH    = el.naturalHeight || 1536;              // 這批立繪都是 1024×1536
  const nW    = el.naturalWidth  || 1024;
  /* 鎖身高。⚠ 分母用**該角色基本立繪**的像素身高，不是這一張差分自己的
     （ver -346）：差分是不同姿勢，alpha 上下緣會差 1%（諾薇兒 cringe 1528 /
     surprise 1519），每換一次表情就縮放一次 —— 那是「同一個人忽大忽小」的另一半。
     位置照樣吃這一張自己的 top/fx（那是取景，本來就該逐張算）。 */
  const baseFr = (CFG().portraitFrames||{})[el.dataset.baseKey] || fr;
  /* ⚠⚠ `rescale:true` ＝**這張差分自己就是另一個尺**（ver -635）：
     預設拿基本立繪的像素身高當分母（ver -346：差分之間 alpha 上下緣差 ~1%，
     每換一次表情就縮放一次＝「同一個人忽大忽小」）—— 那個規則的前提是
     「所有差分都畫在同一個尺上，量到的差異是雜訊」。
     但有些圖**真的**畫得比較小（諾薇兒的 SAINT INSTALL 為了容納頭上的法環，
     人物只佔 1443px 而基本立繪是 1523px，差 5%），那就不是雜訊 ——
     那一張要用它自己的身高，否則玩家看到的就是「她變小了」。
     ⚠ 是**明寫的例外**不是自動判斷（門檻式的自動判斷會在雜訊邊界上跳）。 */
  const denom = (fr.rescale ? (fr.bot - fr.top) : (baseFr.bot - baseFr.top)) || 1;
  const s     = pxCm * fr.cm / denom;
  const h     = s * nH, w = s * nW;
  const sd    = side || (el.id==='tutCastR' ? 'right' : 'left');
  const fxc   = C.portraitFaceX;
  const anchor = (fxc && typeof fxc==='object') ? (fxc[sd]!=null ? fxc[sd] : 0.5)
               : (fxc!=null ? fxc : 0.5);
  el.style.maxWidth = 'none';
  el.style.width  = w + 'px';
  el.style.height = h + 'px';
  if(centered){ el.style.left=''; el.style.right=''; }
  /* ⚠ 翻轉之後**臉也跟著跑到鏡像的位置**：原本在圖左 `fx` 的臉，翻完落在 `1-fx`。
     不改這一行的話，翻轉會把臉整個推到框外（鐵律 7：錨的永遠是臉，不是圖框）。 */
  /* `fxShift`：這個角色整個往左右挪一點（ver -645，說明見 speakers.js／story.js）。 */
  const fxA = (el.classList.contains('mirrored') ? (1 - fr.fx) : fr.fx) + (fr.fxShift||0);
  if(!centered){ el.style.left = (W*anchor - w*fxA) + 'px'; el.style.right = 'auto'; }
  el.style.top    = (headTop - s*fr.top) + 'px';       // 頭頂貼頂線（見上面 camTop/headTop 的分工）
  el.style.bottom = 'auto';
}

/* 本段的在場立繪：換圖 ＋ 套取景。⚠ 段落接續（queue）時也要重跑 ——
   上一段是兩人、這一段剩一人（或反過來）時尺寸要跟著換。 */
function syncCastFit(step){
  const cast = CFG().cast || {};
  const baseH = CFG().portraitHeightPct || 88;
  // ⚠ 只套**本段有講話的人**：諾薇兒（劇情版）與芙蕾雅同站左側，左槽只有一個 <img>，
  //   全表掃過去會讓字典順序在後的那個蓋掉真正的說話者（連取景一起蓋錯）。
  const used = new Set((step && step.lines || []).map(l=>l.who));
  for(const key of Object.keys(cast)){
    if(!used.has(key)) continue;
    const c = cast[key], el = portraitEl(c, key);
    if(!el) continue;
    el.dataset.baseKey = c.image;   // 鎖縮放用的基準（見 placePortraitX 的說明）
    if(el.dataset.castKey!==key){ el.src = asset(c.image); el.dataset.castKey = key; el.dataset.imgKey = c.image; }
    const sd = sideOf(key);
    applyMirror(el, key);
    applyPortraitFit(el, c.fit || {}, baseH, soloRun, sd);   // ⚠ 站位吃這一段的覆寫（ver -613）
  }
}

/* ══⚠⚠ **資料上的閘門**（ver -599，Ray：「戰鬥卡的 talk 加血量觸發」）══
   `config.tutorial.script` 那幾段的閘門是**寫在程式裡**的（`gate.action` 是函式），
   但戰鬥卡的 `talk` 是**資料**（config.js）—— 資料寫不了函式。
   所以資料上寫**具名動作**：`gate:{ type:'right', action:'saint', immediate:true }`，
   由這一支翻成真正的呼叫。
   ⚠ 名字只有這一張表在對（鐵律 7）：加新動作就加一列，不要在呼叫端各自翻譯。 */
const GATE_ACTIONS = {
  saint:   ()=>api.activateSaint('right'),
  dual:    ()=>api.activateDual(),
  partner: ()=>api.tryPartnerActive('saint'),
  /* 惡夢化（ver -672）：右滑發動、上滑自爆（那一段的主動技）。 */
  nightmare:  ()=>api.nightmare && api.nightmare(),
  niBurst:    ()=>api.nightmareActive && api.nightmareActive(),
};
function resolveGate(g){
  if(!g) return null;
  if(typeof g.action === 'function') return g;          // 程式裡寫的那幾段，原樣
  const fn = GATE_ACTIONS[g.action];
  if(!fn){ console.info('[tutorial] 不認得的閘門動作：', g.action); return null; }
  return Object.assign({}, g, { action: fn });
}
function openStep(step){
  cur = step; lineIdx = 0; cutinLine = -1;
  /* 這一段自己帶閘門（資料上的 `talk` 用；程式那幾段走 `openScript` 的 opts）。 */
  if(step && step.gate) pendingGate = resolveGate(step.gate);
  stepSides = (step && step.sides) || talkSides || null;   // 段落覆寫 > 整場預設（ver -613／-619）
  stepSolo  = !!(step && step.soloLine);         // 這一段只留現在講話的那一位
  state.tutorialDialog = true;
  api.pauseForDialog();                          // 真暫停：同退出確認框的機制
  document.body.classList.add('dlg-pause');      // 凍結底層警戒脈動（防 iOS 合成假影）
  syncCastFit(step);
  /* 立繪的色調跟著**敵人底圖**走一點點（見 modules/tone.js）——戰鬥框的「背景」就是敵人那張圖。 */
  matchPortraits($('enemyImg'), $('tutCast'));   // 敵人換人時 src 變，tone.js 會重算
  const wrap=$('tutCast'), touch=$('tutTouch'), bubble=$('tutBubble');
  if(touch) touch.classList.add('on');
  if(bubble) bubble.classList.add('on');   // 對話框已移出 #tutCast（z-8000 恆在最上層），自帶顯示控制
  if(wrap){
    wrap.classList.add('on');
    // 起滑延遲用 setTimeout（非 rAF）：隱藏分頁 rAF 不執行，會漏掉立繪進場
    setTimeout(()=>{ if(state.tutorialDialog && cur===step) syncCast(step, lineIdx); }, 30);
  }
  syncBubbleShape(step);
  placeBubble();
  // 即時閘門（immediate）：段落一開就進閘（箭頭同步亮起），台詞照常可點可讀——
  // 玩家隨時完成指定操作（點計量表/滑動）即收段續戰，不必先把台詞點完。
  if(pendingGate && pendingGate.immediate){ enterGate(pendingGate); pendingGate=null; }
  showLine();
}

/* 對話框形狀依段落調整：dualReady（點破防計量表引導）縮窄右移讓出計量表（CSS .clasp-clear） */
function syncBubbleShape(step){
  const b=$('tutBubble');
  if(b) b.classList.toggle('clasp-clear', !!(step && step.key==='dualReady'));
}

/* 對話框的底邊：貼在**敵我血條的上方**，不要蓋住它們（ver -337，Ray 指定）。
 * ⚠ 原本貼的是數字盤面（#grid）的上緣 —— 血條就在盤面與敵人框之間，
 *   貼盤面等於把血條與破防計量表整條蓋掉。ver -336 把它們的 z-index 抬到 21
 *   讓它們壓在立繪之上，但對話框是 z-8000，抬 z 救不了，位置本身要讓開。
 * ⚠ #tutBubble 是 fixed（脫離 #top 的 overflow 裁切），所以用視窗座標算 bottom；
 *   以 bottom 錨定，台詞增行時框體往上長、貼齊邊不動。
 * ⚠ 量不到血條就退回貼盤面（保底，不要整個沒位置）。 */
function placeBubble(){
  const b=$('tutBubble');
  if(!b) return;
  const bars=$('barsBlock'), g=$('grid');
  const r=(bars && bars.getBoundingClientRect().height>0) ? bars.getBoundingClientRect()
        : (g ? g.getBoundingClientRect() : null);
  if(r && r.height>0) b.style.bottom = (innerHeight - r.top + 4)+'px';
}

/* 畫面抖一下（ver -429）：戰鬥畫面沒有劇情層的 `#storyStage.shake`，借敵人框既有的
   `camShake`（`#enemyImg.shake`，受擊特效在用的同一條）。
   ⚠ 抖的是**敵人框**不是整個 App：下半的數字盤面要能點，抖起來很難按。
   ⚠ 畫面震動＝手上也震（§6.5.6 的規矩，呼叫點只有具名函式那一支）。 */
function shakeScreen(){
  hap.shake();
  const el=$('enemyImg'); if(!el) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'), 340);
}

function showLine(){
  const line = cur.lines[lineIdx] || {};
  /* 演出：音效與畫面震動（ver -429）。⚠ 一次性 —— 每次演到就放，不是狀態（同 story.js）。 */
  /* `seFollow`（ver -508）：與 `se` 同拍疊播、但長度**夾在 se 的長度**（se 停了
     它就停）—— 實作在 story.playSePair（音效表只有那一份，鐵律 7）。 */
  if(line.se){ if(line.seFollow) playSePair(line.se, line.seFollow); else playSe(line.se); }
  if(line.shake) shakeScreen();
  /* ⚠⚠ **演出拍**（ver -478，Ray：「先進戰鬥畫面，咆哮震動再彈蕾娜」）：
     只有 se/shake、沒有 who 也沒有 text —— 框藏起來、台上不動人，
     停 `hold`（預設 900ms）自動接下一拍；提前點擊也可以跳過（advance 照常吃）。
     ⚠ 自動接的計時器要驗「還是同一拍」——玩家先點掉的話它不能再推一次。 */
  if(!line.who && !line.text && !line.blank){
    const b0=$('tutBubble'); if(b0) b0.classList.remove('on','done');
    clearInterval(typeTimer); typeTimer=null;
    clearTimeout(fxTimer);
    fxTimer=setTimeout(()=>{ fxTimer=null;
      if(state.tutorialDialog && cur && cur.lines[lineIdx]===line) advance();
    }, line.hold||900);
    return;
  }
  /* 演出拍之後的第一句：把框請回來（演出拍把 `on` 收掉了）。 */
  { const b0=$('tutBubble'); if(b0 && !b0.classList.contains('on')) b0.classList.add('on'); }
  /* 逐拍進場（ver -478，§6.5：接話的人輪到他那一拍才上場）。
     ⚠ 第 0 拍不在這裡叫：openStep 的 30ms 延遲那一發才觸發得了滑入過場。 */
  if(lineIdx>0) syncCast(cur, lineIdx);
  /* 逐句的雪鐵龍箭（ver -478，副武器切換教學）：`guide:'wswitch'` 那一句亮、
     下一句自動收。⚠ 不與閘門（gate）混用：閘門的箭有自己的生命週期。 */
  if(line.guide && !gate){ showGuide(line.guide); lineGuideOn=true; }
  else if(lineGuideOn){ hideGuide(); lineGuideOn=false; }
  /* ⚠⚠ **主角的空白對話框**（`blank:true`，ver -429）：框要出、裡面沒字。
     他沒有立繪也沒有配音，但「他確實開口了」這件事要在畫面上有份量（同 story.js §6.5）。
     ⚠ **不動立繪**：台上的人維持原樣（誰亮誰暗都不變）—— 他不在台上，
       他說話不代表別人要換位或換明暗。
     ⚠ 名字欄放**暱稱**：隊上的人平常就是這樣叫他的（同 story.js 的作法）。 */
  if(line.blank){
    const nm0=$('tutName'); if(nm0) nm0.textContent = progress.getPlayerNick();
    const lineEl0=$('tutLine'); if(lineEl0) lineEl0.textContent='';
    const b0=$('tutBubble'); if(b0){ b0.classList.add('done'); }
    clearInterval(typeTimer); typeTimer=null;
    return;
  }
  const c = castOf(line.who);
  const nm=$('tutName'); if(nm) nm.textContent = c.name || '';
  // 說話者保持原色，另一位色階調暗
  const L=$('tutCastL'), R=$('tutCastR');
  const el = portraitEl(c, line.who), other = (el===L) ? R : L;   // ⚠ 站位吃覆寫（ver -613）
  if(el) el.classList.add('speaking');
  if(other) other.classList.remove('speaking');
  /* ⚠ **說話的人一定疊在另一個人之上**（ver -350，Ray 指定）。兩人的輪廓允許交疊，
     交疊處誰在前就是「誰在講話」的線索之一；壓在別人身後講話會讀成她在後面自言自語。
     ⚠ 用 inline z-index：兩個槽是兄弟元素、DOM 序固定，光靠 class 沒辦法讓左邊蓋過右邊。 */
  if(el) el.style.zIndex='2';
  if(other) other.style.zIndex='1';
  // 逐句表情差分（line.img＝ASSETS 鍵）：沒寫就回該角色的預設立繪。
  // ⚠ 直接換 src，不做淡入淡出——同一角色同一槽的表情切換，淡出會讓她整個人消失一拍。
  if(el){
    const key = line.img || c.image;
    if(key && el.dataset.imgKey!==key){
      el.dataset.imgKey = key;
      el.src = asset(key);
      /* ⚠ 換圖必須重排橫向：每張差分的臉位置不同（見 placePortraitX）。
         先用規格比例排一次（不等載入＝不閃），載好再排一次修正真實寬高比。
         ⚠⚠ 站位吃 `sideOf()` **不是 `c.side`**（ver -619 修）：-613 的站位覆寫
           只做到 `portraitEl`（決定放哪個槽），逐句換圖這一支還在用角色的**預設**
           側 —— 於是被覆寫到右邊的人「人在右槽、臉錨在左邊的位置」，看起來就是
           她站在左邊（Ray 回報諾薇兒沒有站右）。同一個量只有 `sideOf` 一個來源。 */
      const sd = sideOf(line.who);
      applyMirror(el, line.who);
      placePortraitX(el, sd);
      el.onload = ()=>{ el.onload=null; placePortraitX(el, sd); };
    }
  }
  // 全畫面 cut-in（line.cutin＝ASSETS 鍵）：先演完再打字，否則字被 cut-in（z8100）蓋住白打。
  if(line.cutin && cutinLine!==lineIdx){
    cutinLine = lineIdx;
    if(api.playCutin){
      api.playCutin(()=>{ if(state.tutorialDialog && cur && cur.lines[lineIdx]===line) typeLine(line); },
                    line.text||'', line.cutin);
      const lineEl0=$('tutLine'); if(lineEl0) lineEl0.textContent='';
      const b0=$('tutBubble'); if(b0) b0.classList.remove('done');
      return;
    }
  }
  typeLine(line);
}

/* 打字機本體（自 showLine 拆出：cut-in 那一句要等演出結束才起跑）。 */
function typeLine(line){
  // 打字機：lineTypeMs 每字；打完亮出「▼」續行提示
  const lineEl=$('tutLine'), bubble=$('tutBubble');
  if(bubble) bubble.classList.remove('done');
  placeBubble();   // 每句重貼盤面上緣：段落開啟後盤面若重建（聖徒化 25 宮格等）不致錯位
  clearInterval(typeTimer); typeTimer=null;
  const text = line.text || '';
  let i = 0;
  if(lineEl) lineEl.textContent = '';
  typeTimer = setInterval(()=>{
    i++;
    if(lineEl) lineEl.innerHTML = decorateLine(text.slice(0,i));   // 關鍵字（聖徒化）金色粗字
    if(i>=text.length){
      clearInterval(typeTimer); typeTimer=null;
      if(bubble) bubble.classList.add('done');
    }
  }, CFG().lineTypeMs||30);
}

// 點擊推進：打字中→先跳完整句；打完→下一句；最後一句→進閘門或收段續戰
function advance(){
  if(!state.tutorialDialog || !cur) return;
  if(gate && !gate.immediate) return;   // 非即時閘門中不推進台詞（即時閘門台詞照常可點）
  SFX.unlock();   // 對話推進不出按鈕音（只保音訊解鎖）
  if(typeTimer){
    clearInterval(typeTimer); typeTimer=null;
    const line=cur.lines[lineIdx]||{};
    const lineEl=$('tutLine'); if(lineEl) lineEl.innerHTML = decorateLine(line.text || '');
    const bubble=$('tutBubble'); if(bubble) bubble.classList.add('done');
    return;
  }
  lineIdx++;
  if(lineIdx < cur.lines.length){ showLine(); return; }
  // 教學陣亡段：收 UI 後「同步」重開整場（不走 480ms 靜默期——期間任何晚到的插話
  // 都會攔掉 finish，restart 就此丟失＝玩家卡 0 HP 鎖血）
  if(cur.key==='tutorialDead'){ closeDialog(false, true); onStepClosed('tutorialDead'); return; }
  if(gate){ lineIdx = cur.lines.length-1; return; }   // 即時閘門：停在末句，等玩家完成指定操作
  if(pendingGate){ enterGate(pendingGate); pendingGate=null; return; }   // 講完 → 進引導閘門（維持暫停）
  if(queue.length){ cur=queue.shift(); lineIdx=0; cutinLine=-1; syncCastFit(cur); syncCast(cur, 0); syncBubbleShape(cur); showLine(); return; }   // 接續段：在場立繪差異更新（逐拍進場，ver -478）
  closeDialog(true);
}

/* 收掉對話層。resume=true → 解除暫停續戰並跑腳本接續（onStepClosed）；
 * silent=true（skip/abort）→ 只撤 UI、不觸發任何腳本接續。 */
let strikeAfter=null;      // 這一段收掉之後要打的劇情殺（ver -619，見下）
/* 這一段收掉之後要發動的惡夢化（ver -671）。⚠ 與 `strikeAfter` 同一個理由：
   `cur` 在 `closeDialog` 開頭就被清成 null，收尾的 `finish()` 讀不到它。 */
let niAfter=false;
function closeDialog(resume, silent){
  const id = cur && (cur.key || cur.trigger);
  strikeAfter = (cur && (cur.strike || cur.strikeTo!=null)) ? cur : null;
  niAfter     = !!(cur && cur.nightmare);
  cur=null; lineIdx=0;
  clearInterval(typeTimer); typeTimer=null;
  clearTimeout(fxTimer); fxTimer=null;
  lineGuideOn=false;
  pendingGate=null; gate=null; hideGuide();
  syncBubbleShape(null);   // 撤形狀調整（.clasp-clear）
  state.tutorialDialog=false;
  if(!document.getElementById('exitConfirm')) document.body.classList.remove('dlg-pause');
  const wrap=$('tutCast'), touch=$('tutTouch'), bubble=$('tutBubble');
  if(touch) touch.classList.remove('on');
  // 對話框與立繪同時序退場（原本隨父層 #tutCast 一起消失，維持手感）
  if(bubble) setTimeout(()=>{ if(!state.tutorialDialog) bubble.classList.remove('on'); }, 500);
  if(wrap){
    const L=$('tutCastL'), R=$('tutCastR');
    for(const el of [L,R]){ if(el){ el.classList.remove('in','speaking','center'); } }   // 立繪滑出
    setTimeout(()=>{ if(!state.tutorialDialog) wrap.classList.remove('on'); }, 500);
  }
  if(resume){
    const finish=()=>{
      api.resumeFromDialog();
      /* ══⚠⚠ **劇情殺三連擊**（ver -619，Ray：「敵 hp 50% 以下時觸發劇情殺把主角
         三擊清零，一定要三擊，在三擊發生前讓蕾娜喊『小心！』；主角 hp 被清零後
         發動即死防禦，然後才進聖徒化教學」）══
         段落寫 `strike:true` ＝ 這一段講完就打那三下。走的是**既有的**
         `tutorialStrike`（config.tutorial.strike 的三擊：前兩擊必留 1 HP、
         第三擊必致死 → 搭檔的即死防禦接住並播 cut-in），鐵律 8 —— 不要為了
         這一場另寫一份三連擊。
         ⚠ `then` ＝ 三擊與即死防禦的 cut-in 都演完之後要接的下一個 trigger。
           等 `afterCutin` 而不是固定秒數：cut-in 的長度不歸這裡管。
         ⚠ 要在 `resumeFromDialog()` **之後**：對話還壓著真暫停時打下去，
           那三下的演出會被凍在暫停裡。 */
      if(strikeAfter){
        const st0=strikeAfter; strikeAfter=null;
        /* ⚠⚠ **一擊到底的版本**（`strikeTo:<剩多少血>`，ver -671，Ray：
           「敵 HP50% 以下觸發劇情殺：玩家受擊，hp1」）—— 這一場要的是**一下**，
           不是三連擊。三連擊那一套（`strike:true`）是聖徒化教學的節奏，
           它會走即死防禦；這一場接的是惡夢化，由安雅接手。
           ⚠ 走 combat 的同一個受擊入口（`api.strikeTo`），演出與音效才一致。 */
        const dur = (st0.strikeTo!=null)
          ? ((api.strikeTo && api.strikeTo(st0.strikeTo)) || 0)
          : ((api.strike && api.strike()) || 0);
        /* ⚠ 等到**最後一擊落地**才開始等 cut-in：`afterCutin` 沒看到 cut-in 時
           2.5 秒就放行，而末擊在 1.4 秒後才打出去 —— 從 0 秒開始等的話，
           即死防禦的 cut-in 稍微晚一點，下一段就會壓在它上面。 */
        if(st0.then) setTimeout(()=>afterCutin(()=>fireTrigger(st0.then)), dur+80);
      }
      /* ══ 惡夢化（ver -671）：段落寫 `nightmare:true` ＝這一段講完就發動 ══
         ⚠ 它**不是閘門**（不需要玩家操作）：Ray 的稿是安雅自己做的。
         ⚠⚠ 排在**劇情殺之後**：Ray 的順序是「一擊 → 安雅那一句 → CI → 蕾娜反應」。
           而 `then` 是用 `afterCutin` 排的 —— 這裡先把 CI 起播，那一支才等得到它
           （不然 `afterCutin` 2.5 秒逾時放行，蕾娜會搶在 CI 前面講）。 */
      if(niAfter){ niAfter=false; if(api.nightmare) setTimeout(()=>api.nightmare(), 40); }
      // tutorialDead 不受 tutorialActive 限制：收尾盤（tutorialActive 已 false）陣亡也要能重開
      if(!silent && id && (state.tutorialActive || id==='tutorialDead')) onStepClosed(id);
    };
    if(silent){ finish(); }   // 閘門/跳過路徑：同步續戰（action 需緊接執行）
    else{
      // 一般收段：等立繪滑出完成才恢復操作（撤開才可點擊盤面/紅點；期間維持暫停）
      setTimeout(()=>{ if(!state.tutorialDialog) finish(); }, 480);
    }
  }
}

/* ============================================================================
 *  引導閘門（gate）：段落講完後維持暫停，完成指定操作才續戰
 *    click＝點破防計量表（#energyClasp 附近）；right＝向右滑；up＝向上滑。
 *  完成 → 續戰（closeDialog）→ 同步執行 gate.action（activateDual/activateSaint/
 *  tryPartnerActive；resume 與 action 同一 tick，凍結中的計時器來不及先動）。
 * ========================================================================== */
function enterGate(g){
  gate = g;
  showGuide(g.type, g.tone);
}
// 對外：閘門是否進行中（main.js 的方向鍵入口據此讓位——閘門由本檔自行收鍵）
export function gateActive(){ return !!gate; }
function completeGate(){
  const g = gate; gate = null;
  hideGuide();
  SFX.unlock(); SFX.menuClick();
  closeDialog(true, true);   // silent：閘門段落的接續由 g.after 負責，不走 onStepClosed
  // ⚠ 動作須等「轉場/演出」結束才執行：玩家在盤面 RELOADING（900ms）或 cut-in 期間
  //   完成閘門時，activateSaint/activateDual 會被 transitioning/cutinPlaying 守門「無聲擋掉」
  //   → 閘門已消耗、教學軟鎖（敵血鎖 1 永遠打不完）。改輪詢至可執行為止。
  const fire=()=>{
    /* ⚠ **不再要求 `tutorialActive`**（ver -599）：閘門現在也給戰鬥卡的 `talk` 用
       （聖徒化教學戰），那一場不是教學。門是我們自己開的，收的時候只要確認
       這一場還沒結束。 */
    if(state.over) return;
    if(state.transitioning || state.cutinPlaying){ setTimeout(fire, 120); return; }
    if(g.action) g.action();
    if(g.after) g.after();
    /* ⚠ 資料上的接續（ver -599）：`gate.then` 是**下一個 trigger 的名字**
       —— 程式那幾段用的是 `after`（函式），資料寫不了函式所以走名字。
       ⚠ 要等 cut-in 演完才接（聖徒化與主動技都有 cut-in），不然那一段會被蓋掉；
         `afterCutin` 是既有的那一支（鐵律 8）。 */
    if(g.then) afterCutin(()=>fireTrigger(g.then));
  };
  fire();
}

/* ---- 引導箭頭（雪鐵龍雙箭羽依次閃滅）＋文字標示 ---- */
/* 現在台上的人各站哪一側（回傳 Set of 'left'|'right'）。
   ⚠⚠ 讀**資料**不讀 DOM 的 `.in`（ver -619）：`.in` 是**滑入動畫**的旗標，
     `ensureOn` 那一步是延後掛上去的（16ms／450ms×0.45），而引導箭是段落一開就要
     擺位置的 —— 當場問 DOM 一定問到「上一個狀態」（同 §6.5 那條「不要從畫面反推」）。
   ⚠ 與 `syncCast` 的 `used` 是同一套算法（`soloLine` 只留現在講話的那一位）。 */
function stageSides(){
  const lines = (cur && cur.lines) || [];
  const upto  = Math.max(0, Math.min(lineIdx, lines.length-1));
  const who   = stepSolo ? [ (lines[upto]||{}).who ]
                         : lines.slice(0, upto+1).map(l=>l.who);
  const out = new Set();
  for(const k of who){ const sd = k && sideOf(k); if(sd) out.add(sd); }
  return out;
}
/* ⚠ `tone` ＝這一次的顏色（ver -686）：`'red'` 走 `.g-red`（見 style.css）。
   閘門的資料上寫 `gate:{ type:'up', tone:'red' }`；不寫＝原本的金色。 */
function showGuide(type, tone){
  const g=$('tutGuide'); if(!g) return;
  const labels = CFG().guideLabels || {};
  g.classList.remove('g-down','g-right','g-up','g-red');
  if(tone==='red') g.classList.add('g-red');
  let x=innerWidth/2, y=innerHeight/2, dir='g-right', label='';
  if(type==='click'){
    // 破防計量表上方，箭頭向下指、標示 CLICK！
    const r=$('energyClasp') ? $('energyClasp').getBoundingClientRect() : {left:20,top:innerHeight/2,width:24};
    dir='g-down'; label = labels.click || 'CLICK！';
    x = r.left + r.width/2 + 8;
    y = r.top - 52;
  }else if(type==='wswitch'){
    // 副武器切換鈕（血條右側的槍圖）上方，箭頭向下指（ver -478，切換教學）
    const r=$('wpSwitch') ? $('wpSwitch').getBoundingClientRect() : {left:innerWidth-80,top:innerHeight/2,width:60};
    dir='g-down'; label = labels.wswitch || '點擊切換';
    x = r.left + r.width/2;
    y = r.top - 52;
  }else if(type==='right'){
    // 敵人框左緣往右閃、標示向右側滑動（貼框緣：立繪已移正中，箭頭不壓立繪）。
    // ⚠ #tutGuide 為 fixed（視口座標）：x 必須以 #top 的 rect.left 起算——
    //   桌機 #app 置中（max-width 520）時，直接用 42 會落在畫框外。
    const tr=$('top') ? $('top').getBoundingClientRect() : {left:0,top:0,height:innerHeight/2};
    dir='g-right'; label = labels.right || '向右側滑動';
    x = (tr.left||0) + 42;
    y = tr.top + tr.height*0.45;
  }else{
    // 敵人框內由下往上指（生命歸還手勢區）、標示向上滑動；偏左 1/4 處——蕾妮立繪在右側不被壓
    const tr=$('top') ? $('top').getBoundingClientRect() : {left:0,top:0,width:innerWidth,height:innerHeight/2};
    /* ⚠⚠ **箭要落在台上那個人的另一邊**（ver -619；-613 是「一律正中」）。
       Ray 兩次的要求其實是同一條：「箭不要跟立繪重疊」。寫死位置（1/4 左＝閃蕾妮、
       正中＝閃站左邊的諾薇兒）每換一次站位就要再改一次，而站位現在是**資料**
       （`sides`／`talkSides`）——所以改成**看台上的人在哪一側**現算（鐵律 7／8）：
         右邊有人、左邊沒人 → 箭在左 1/4；反過來 → 右 1/4；兩邊都有或都沒有 → 正中。
       ⚠ 讀的是 `.in`（現在台上的那幾個）不是資料上的 side：`soloLine` 的段落
         台上只留說話的那一位，其他人已經滑出去了。 */
    dir='g-up'; label = labels.up || '向上滑動';
    const on = stageSides();
    const inL=on.has('left'), inR=on.has('right');
    const fx = (inR && !inL) ? 0.25 : (inL && !inR) ? 0.75 : 0.5;
    x = tr.left + tr.width*fx;
    y = tr.top + tr.height*0.52;
  }
  g.classList.add(dir);
  // 位置不做保底偏移：箭頭必須正對目標（計量表）。CLICK！標示的左緣溢出
  // 由 CSS 縮字解決（#tutGuide.g-down .tg-label）。
  g.style.left = x+'px';
  g.style.top  = y+'px';
  const lb=g.querySelector('.tg-label'); if(lb) lb.textContent = label;
  g.classList.add('on');
}
function hideGuide(){ const g=$('tutGuide'); if(g) g.classList.remove('on'); }

function inClaspArea(x,y){
  const el=$('energyClasp'); if(!el) return false;
  const r=el.getBoundingClientRect(), pad=26;
  return x>=r.left-pad && x<=r.right+pad && y>=r.top-pad && y<=r.bottom+pad;
}

function endTutorial(){
  state.tutorialActive=false;
  document.body.classList.remove('tut-on');   // 開發者跳關鈕的顯示條件（ver -366）
  clearTimeout(startTimer); startTimer=null;
  cutinWaiters.forEach(iv=>clearInterval(iv)); cutinWaiters=[];
  stepsLeft=[]; queue=[]; pendingGate=null; gate=null;
  hideGuide();
  const sk=$('tutSkipBtn'); if(sk) sk.classList.remove('on');
  const bb=$('tutBubble'); if(bb) bb.classList.remove('on','clasp-clear','done');   // 對話框保險收乾淨
}

/* ============================================================================
 *  跳過 / 中止
 * ========================================================================== */
// 跳過鈕 → 確認視窗（真暫停）：「是」＝skip()、「否」＝繼續教學。
//   面板樣式共用 #exitConfirm 那套（style.css 已併列選擇器）。
function showSkipConfirm(){
  if(!state.tutorialActive) return;
  if(document.getElementById('tutSkipConfirm') || document.getElementById('exitConfirm')) return;
  api.pauseForDialog();                            // 真暫停（教學對話中已暫停＝冪等）
  document.body.classList.add('dlg-pause');
  const grid=$('grid'); if(grid) grid.classList.add('grid-blur');
  const t=(L.tutorial && L.tutorial.skipConfirm) || {};
  const dlg=document.createElement('div'); dlg.id='tutSkipConfirm';
  dlg.innerHTML='<div class="ec-panel">'
    +'<div class="ec-title">'+(t.title||'是否跳過教學？')+'</div>'
    +'<div class="ec-sub">'+(t.sub||'')+'</div>'
    +'<div class="ec-btns"><button class="ec-no">'+(t.no||'繼續教學')+'</button>'
    +'<button class="ec-yes">'+(t.yes||'跳　過')+'</button></div>'
    +'</div>';
  document.body.appendChild(dlg);
  const close=()=>{ if(dlg.parentNode) dlg.remove();
    const g=$('grid'); if(g) g.classList.remove('grid-blur');
    if(!state.tutorialDialog) document.body.classList.remove('dlg-pause'); };   // 教學對話仍開著 → dlg-pause 交還教學層
  const bind=(sel,fn)=>{ const b=dlg.querySelector(sel);
    const run=()=>{ SFX.unlock(); SFX.menuClick(); fn(); };
    b.addEventListener('click',run);
    b.addEventListener('touchstart',e=>{e.preventDefault();run();},{passive:false}); };
  bind('.ec-no', ()=>{ close(); if(!state.tutorialDialog) api.resumeFromDialog(); });   // 否：繼續教學
  bind('.ec-yes',()=>{ close(); skip(); });                                             // 是：跳過 → 出擊整備頁
}

// 跳過整段教學——中止本場教學戰、記為已看，轉進出擊整備頁（openPrep 內播 SI_01）。
export function skip(){
  if(!state.tutorialActive) return;
  markSeen();                                          // 註記：出陣時不再跑教學
  if(state.tutorialDialog) closeDialog(false, true);   // 只撤 UI：goHome 接管流程（會清 cutinPlaying）
  endTutorial();
  state.tutorialRun = false; state.tutorialStoryRun = false;
  // 本場廢棄 → 單次淡出淡入直達整備頁：黑幕「全蓋瞬間」才開整備頁（onCovered），
  // 揭幕時整備頁已就位——不會先閃一下整備頁又被黑幕蓋掉再轉場一次
  if(api.goHome) api.goHome(()=>{ if(menuApi.openPrep) menuApi.openPrep(); });
}
// 中止（combat.stopAll 調度：goHome/勝負/重開場）：只撤 UI、不記已看——
// 中途退出的話，下次出陣仍會重新進教學（skip 或走到終盤才算看過）。
export function abort(){
  endBattleTalk();   // 戰鬥內短教學（ver -426）也隨場次結束收乾淨
  if(!state.tutorialActive && !state.tutorialDialog) return;
  if(state.tutorialDialog) closeDialog(false, true);
  endTutorial();
}

/* ============================================================================
 *  UI 綁定：tutTouch 走 pointer 事件（點擊推進台詞；閘門期間改判定指定操作）
 * ========================================================================== */
function bindUI(){
  const touch=$('tutTouch');
  /* 轉向或視窗寬度真的變了 → 相機重量一次並重排在場立繪。
     ⚠ 只認**寬度**：高度的小幅變動（手機工具列收合）由 cameraPxCm 吸收，
       在這裡一併重排的話又會變成「忽大忽小」。 */
  {
    let lastW = innerWidth;
    window.addEventListener('resize', ()=>{
      if(innerWidth===lastW) return;
      lastW = innerWidth; resetCamera();
      if(cur) syncCastFit(cur);
    });
  }
  if(touch){
    let ptr=null;   // {x,y,moved}
    touch.addEventListener('pointerdown', e=>{ ptr={x:e.clientX, y:e.clientY, moved:false}; });
    touch.addEventListener('pointermove', e=>{
      if(!ptr) return;
      const dx=e.clientX-ptr.x, dy=e.clientY-ptr.y;
      if(Math.hypot(dx,dy)>10) ptr.moved=true;
      if(!gate) return;
      if(gate.type==='right' && dx>70 && dx>Math.abs(dy)){ ptr=null; completeGate(); }
      else if(gate.type==='up' && -dy>70 && -dy>Math.abs(dx)){ ptr=null; completeGate(); }
    });
    touch.addEventListener('pointerup', e=>{
      const p=ptr; ptr=null;
      if(gate){
        // 點擊閘門：落點在破防計量表附近才算完成
        if(gate.type==='click' && p && !p.moved && inClaspArea(e.clientX, e.clientY)){ completeGate(); return; }
        // 即時閘門：未命中指定操作的一般點擊照常推台詞（滑動閘的滑動由 pointermove 判定）
        if(gate.immediate){ if(p && !p.moved) advance(); }
        return;
      }
      advance();
    });
    touch.addEventListener('pointercancel', ()=>{ ptr=null; });
  }
  /* ══ 空白／Enter ＝推進台詞（ver -427，Ray：「對話推進可用空白鍵推進」）══
     ⚠ 走**同一支** `advance()`（鐵律 8）：打字補完、閘門讓位、接續段那些規矩自動一致。
     ⚠ **不拿空白當「完成閘門」**：閘門要的是指定的操作（點計量表／右滑／上滑），
       用空白帶過去等於把教學跳掉。即時閘門（`immediate`）下空白照樣推台詞 ——
       那正是觸控那邊「一般點擊照常推台詞」的同一條規矩。
     ⚠ 焦點在輸入框時讓位。 */
  window.addEventListener('keydown', e=>{
    if(!state.tutorialDialog || e.repeat) return;
    if(e.ctrlKey||e.altKey||e.metaKey) return;
    if(!(e.key===' ' || e.key==='Spacebar' || e.key==='Enter')) return;
    const a=document.activeElement;
    if(a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    if(document.getElementById('tutSkipConfirm') || document.getElementById('exitConfirm')) return;
    if(gate && !gate.immediate) return;      // 非即時閘門中不推進（同 advance 的守門）
    e.preventDefault();                      // 空白鍵預設會捲動頁面
    advance();
  });

  /* 方向鍵＝滑動閘門的等價入口（與戰鬥中的手勢鍵盤入口同一套規則）。
     教學期間 #tutTouch 蓋在最上層吃掉輸入，閘門是發動聖徒化/生命歸還的唯一途徑 →
     不在這裡也收方向鍵的話，純鍵盤玩家會卡死在閘門。
     方向對應畫面上的引導箭頭：g-right→→、g-up→↑（點計量表閘門 type:'click' 不在此列）。 */
  window.addEventListener('keydown', e=>{
    if(!gate || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if((gate.type==='right' && e.key==='ArrowRight') || (gate.type==='up' && e.key==='ArrowUp')){
      e.preventDefault();
      completeGate();
    }
  });
  // 轉向/視窗變化：對話中重貼盤面上緣
  window.addEventListener('resize', ()=>{ if(state.tutorialDialog) placeBubble(); });
  const sk=$('tutSkipBtn');
  if(sk){
    let h=false;
    const run=()=>{ SFX.unlock(); SFX.menuClick(); showSkipConfirm(); };   // 先確認再跳過
    sk.addEventListener('touchstart',e=>{e.preventDefault();h=true;run();},{passive:false});
    sk.addEventListener('click',()=>{ if(h){h=false;return;} run(); });
  }
}

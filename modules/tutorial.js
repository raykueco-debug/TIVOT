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
let startTimer = null;         // battleStart 延遲計時器
let pendingGate = null;        // 當前段落講完後要進入的引導閘門
let gate = null;               // 進行中的閘門 {type:'click'|'right'|'up', action, after}
let defendedDone = false;      // 首次防禦成功已發生（罵人停用、延時懲罰恢復）
let dualGuideDone = false;     // 雙槍引導已觸發（破防值封頂解除）
let saintCritFired = false;    // 聖徒化臨界攔截已觸發（saintFail 只出一次）
let cutinWaiters = [];         // afterCutin 輪詢計時器（teardown 清理）

/* ---- 首次判定（localStorage 不可用時視為未看過：寧可多教，不漏教）---- */
function hasSeen(){ try{ return localStorage.getItem(CFG().storageKey)==='1'; }catch(e){ return false; } }
function markSeen(){ try{ localStorage.setItem(CFG().storageKey,'1'); }catch(e){} }

/* ---- 首頁「教學」鈕：下一場出陣強制進教學（不動已看旗標；用畢即清）---- */
let replayRequested = false;
export function requestReplay(){ replayRequested = true; }

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
  replayRequested = false;
  state.tutorialActive = true;
  state.tutorialRun = true;         // 存續到結算（inspector 據此切教學專屬台詞/按鈕）
  state.tutorialLifeReturn = false;
  stepsLeft = cfg.steps.slice();
  queue = [];
  defendedDone = dualGuideDone = saintCritFired = false; dualForce = false; attackScoldCount = 0; deadHandled = false;
  pendingGate = null; gate = null;
  const sk=$('tutSkipBtn'); if(sk) sk.classList.add('on');
  clearTimeout(startTimer);
  startTimer = setTimeout(()=>fire('battleStart'), cfg.startDelayMs||700);
}
// combat.loadBoard 每次載盤呼叫 → 觸發 'board:N' 步驟
export function onBoardLoaded(idx){ fire('board:'+idx); }
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
  const line=(CFG().scold||{}).dead || '服了你了。重來！';
  openStep({ key:'tutorialDead', lines:[{ who:'inspector', text: line }] });
  return true;
}
// combat 於「按錯 / 延時懲罰」時呼叫 → 監察官罵人（defended 之後不再插話）
export function onMistake(kind){
  if(!state.tutorialActive || state.tutorialDialog || state.over || defendedDone || deadHandled) return;
  const pool = (CFG().scold||{})[kind];
  if(!pool || !pool.length) return;
  const text = pool[Math.random()*pool.length|0];
  openStep({ lines:[{ who:'inspector', text }] });
}
// defense.resolveThreat 太早防禦（Defense 格擋半傷）→ 監察官「太早了！」。
//   不受 defended 停用限制（每次太早都提醒）；聖徒化期間不插（格擋是推進機制、節奏緊湊）。
export function onEarlyBlock(){
  if(!state.tutorialActive || state.tutorialDialog || state.over || state.saintMode || deadHandled) return;
  const pool = (CFG().scold||{}).early;
  if(!pool || !pool.length) return;
  // key='earlyRetry'：反擊教學階段收段後重放反擊圈（onStepClosed 分流；已過 defended 則只罵不重放）
  openStep({ key:'earlyRetry', lines:[{ who:'inspector', text: pool[Math.random()*pool.length|0] }] });
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
  if(state.boardIndex===3 && !state.saintUsedThisBattle) return true;
  if(state.threats.length>0) return true;
  return false;
}
// defense.spawnThreat 詢問：反擊教學第一顆紅點未出（threat 步驟尚未觸發）→ 用固定位置
export function firstThreatPending(){
  return state.tutorialActive && stepsLeft.some(s=>s.trigger==='threat');
}
// combat.tap 每次正確消格呼叫（cleared＝本盤已消格數）：第四回合清滿 strike.afterCells
//   → 觸發「小心！」劇情殺段
let attackScoldCount = 0;   // 反擊教學「紅圈在場還猛點盤面」插話次數（首次罵、之後無言）
export function onBoardProgress(cleared){
  if(!state.tutorialActive || state.tutorialDialog || deadHandled) return;
  // 反擊教學未過（defended 未觸發）且紅圈在場：玩家不看字猛點盤面攻擊 →
  //   監察官插話「你倒是防禦啊！」，第二次起改「…………」（台詞 config.scold.attackDuringThreat）
  if(!defendedDone && state.threats.length>0){
    const sc=(CFG().scold||{}).attackDuringThreat;
    if(sc){
      attackScoldCount++;
      openStep({ lines:[{ who:'inspector', text: attackScoldCount===1 ? (sc.first||'') : (sc.rest||'…………') }] });
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
export function onSaintCritical(){
  if(!state.tutorialActive || saintCritFired) return;
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
  if(kind==='return') state.tutorialLifeReturn = true;   // 結算台詞分歧：發動過生命歸還
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
  if(!state.tutorialActive) return;
  const i = stepsLeft.findIndex(s=>s.trigger===trigger);
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
      openStep(bs);
      return;
    }
  }
  openStep(step);
}

// 腳本段落（config.tutorial.script[key]）：由內部流程觸發，不走 steps 的 trigger。
//   opts.gate＝段落講完後進入的引導閘門（完成指定操作才續戰）。
function openScript(key, opts){
  if(!state.tutorialActive) return;
  const raw = (CFG().script||{})[key];
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
    if(!state.tutorialActive){ clearInterval(iv); return; }
    if(state.cutinPlaying){ saw = true; return; }
    if(saw || Date.now()-t0>2500){ clearInterval(iv); fn(); }
  }, 120);
  cutinWaiters.push(iv);
}

/* ============================================================================
 *  對話段：開啟（真暫停+立繪移入）→ 逐句 → 閘門或關閉（立繪退場+續戰）
 * ========================================================================== */
function castOf(who){ return (CFG().cast||{})[who] || {}; }
function portraitEl(c){ return c.side==='right' ? $('tutCastR') : $('tutCastL'); }

/* 依步驟台詞決定在場立繪：只有一個人說話的段落（如罵人插話）不出現另一名角色。
 * .in 逐立繪掛在 img 上（CSS transition 滑入/滑出）；段落接續（queue）時差異更新即可。 */
function syncCast(step){
  const cast = CFG().cast || {};
  const used = new Set((step && step.lines || []).map(l=>l.who));
  for(const key of Object.keys(cast)){
    const el = portraitEl(cast[key]);
    if(!el) continue;
    el.classList.toggle('center', used.has(key) && !!(step && step.center));   // 正中模式（引導箭頭讓位）
    el.classList.toggle('in', used.has(key));
  }
}

function openStep(step){
  cur = step; lineIdx = 0;
  state.tutorialDialog = true;
  api.pauseForDialog();                          // 真暫停：同退出確認框的機制
  document.body.classList.add('dlg-pause');      // 凍結底層警戒脈動（防 iOS 合成假影）
  const cast = CFG().cast || {};
  const baseH = CFG().portraitHeightPct || 88;
  for(const key of Object.keys(cast)){
    const c = cast[key], el = portraitEl(c);
    if(!el) continue;
    if(el.dataset.castKey!==key){ el.src = asset(c.image); el.dataset.castKey = key; }
    const fit = c.fit || {};
    // 取景（config.cast.fit）：zoom＝以監察官眼寬為基準的縮放；drop＝往框下緣外推裁掉下方 %
    el.style.height = (baseH * (fit.zoom || 1)) + '%';
    el.style.bottom = (-(fit.drop || 0)) + '%';
  }
  const wrap=$('tutCast'), touch=$('tutTouch');
  if(touch) touch.classList.add('on');
  if(wrap){
    wrap.classList.add('on');
    // 起滑延遲用 setTimeout（非 rAF）：隱藏分頁 rAF 不執行，會漏掉立繪進場
    setTimeout(()=>{ if(state.tutorialDialog && cur===step) syncCast(step); }, 30);
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

/* 對話框緊貼數字盤面上方（間隔 2px）：#tutBubble 為 fixed（脫離 #top overflow 裁切），
 * 依 #grid 視窗座標實測寫 bottom——以 bottom 錨定，台詞增行時框體向上長、貼齊邊不動。 */
function placeBubble(){
  const b=$('tutBubble'), g=$('grid');
  if(!b || !g) return;
  const r=g.getBoundingClientRect();
  if(r.height>0) b.style.bottom = (innerHeight - r.top + 2)+'px';
}

function showLine(){
  const line = cur.lines[lineIdx] || {};
  const c = castOf(line.who);
  const nm=$('tutName'); if(nm) nm.textContent = c.name || '';
  // 說話者保持原色，另一位色階調暗
  const L=$('tutCastL'), R=$('tutCastR');
  const el = portraitEl(c), other = (el===L) ? R : L;
  if(el) el.classList.add('speaking');
  if(other) other.classList.remove('speaking');
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
  if(queue.length){ cur=queue.shift(); lineIdx=0; syncCast(cur); syncBubbleShape(cur); showLine(); return; }   // 接續段：在場立繪差異更新
  closeDialog(true);
}

/* 收掉對話層。resume=true → 解除暫停續戰並跑腳本接續（onStepClosed）；
 * silent=true（skip/abort）→ 只撤 UI、不觸發任何腳本接續。 */
function closeDialog(resume, silent){
  const id = cur && (cur.key || cur.trigger);
  cur=null; lineIdx=0;
  clearInterval(typeTimer); typeTimer=null;
  pendingGate=null; gate=null; hideGuide();
  syncBubbleShape(null);   // 撤形狀調整（.clasp-clear）
  state.tutorialDialog=false;
  if(!document.getElementById('exitConfirm')) document.body.classList.remove('dlg-pause');
  const wrap=$('tutCast'), touch=$('tutTouch');
  if(touch) touch.classList.remove('on');
  if(wrap){
    const L=$('tutCastL'), R=$('tutCastR');
    for(const el of [L,R]){ if(el){ el.classList.remove('in','speaking','center'); } }   // 立繪滑出
    setTimeout(()=>{ if(!state.tutorialDialog) wrap.classList.remove('on'); }, 500);
  }
  if(resume){
    const finish=()=>{
      api.resumeFromDialog();
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
  showGuide(g.type);
}
function completeGate(){
  const g = gate; gate = null;
  hideGuide();
  SFX.unlock(); SFX.menuClick();
  closeDialog(true, true);   // silent：閘門段落的接續由 g.after 負責，不走 onStepClosed
  // ⚠ 動作須等「轉場/演出」結束才執行：玩家在盤面 RELOADING（900ms）或 cut-in 期間
  //   完成閘門時，activateSaint/activateDual 會被 transitioning/cutinPlaying 守門「無聲擋掉」
  //   → 閘門已消耗、教學軟鎖（敵血鎖 1 永遠打不完）。改輪詢至可執行為止。
  const fire=()=>{
    if(state.over || !state.tutorialActive) return;
    if(state.transitioning || state.cutinPlaying){ setTimeout(fire, 120); return; }
    if(g.action) g.action();
    if(g.after) g.after();
  };
  fire();
}

/* ---- 引導箭頭（雪鐵龍雙箭羽依次閃滅）＋文字標示 ---- */
function showGuide(type){
  const g=$('tutGuide'); if(!g) return;
  const labels = CFG().guideLabels || {};
  g.classList.remove('g-down','g-right','g-up');
  let x=innerWidth/2, y=innerHeight/2, dir='g-right', label='';
  if(type==='click'){
    // 破防計量表上方，箭頭向下指、標示 CLICK！
    const r=$('energyClasp') ? $('energyClasp').getBoundingClientRect() : {left:20,top:innerHeight/2,width:24};
    dir='g-down'; label = labels.click || 'CLICK！';
    x = r.left + r.width/2 + 8;
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
    dir='g-up'; label = labels.up || '向上滑動';
    x = tr.left + tr.width*0.26;
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
  clearTimeout(startTimer); startTimer=null;
  cutinWaiters.forEach(iv=>clearInterval(iv)); cutinWaiters=[];
  stepsLeft=[]; queue=[]; pendingGate=null; gate=null;
  hideGuide();
  const sk=$('tutSkipBtn'); if(sk) sk.classList.remove('on');
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
  state.tutorialRun = false;
  // 本場廢棄 → 單次淡出淡入直達整備頁：黑幕「全蓋瞬間」才開整備頁（onCovered），
  // 揭幕時整備頁已就位——不會先閃一下整備頁又被黑幕蓋掉再轉場一次
  if(api.goHome) api.goHome(()=>{ if(menuApi.openPrep) menuApi.openPrep(); });
}
// 中止（combat.stopAll 調度：goHome/勝負/重開場）：只撤 UI、不記已看——
// 中途退出的話，下次出陣仍會重新進教學（skip 或走到終盤才算看過）。
export function abort(){
  if(!state.tutorialActive && !state.tutorialDialog) return;
  if(state.tutorialDialog) closeDialog(false, true);
  endTutorial();
}

/* ============================================================================
 *  UI 綁定：tutTouch 走 pointer 事件（點擊推進台詞；閘門期間改判定指定操作）
 * ========================================================================== */
function bindUI(){
  const touch=$('tutTouch');
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

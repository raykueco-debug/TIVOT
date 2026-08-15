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
  defendedDone = dualGuideDone = saintCritFired = false;
  pendingGate = null; gate = null;
  const sk=$('tutSkipBtn'); if(sk) sk.classList.add('on');
  clearTimeout(startTimer);
  startTimer = setTimeout(()=>fire('battleStart'), cfg.startDelayMs||700);
}
// combat.loadBoard 每次載盤呼叫 → 觸發 'board:N' 步驟
export function onBoardLoaded(idx){ fire('board:'+idx); }
// defense.spawnThreat 生成紅點時經注入呼叫 → 觸發 'threat' 步驟（紅點凍結於畫面講解）
export function onThreatSpawned(){ fire('threat'); }
// defense.resolveThreat 成功點掉紅點（Defense/Perfect/Counter 任一）→ 'defended' 步驟
export function onThreatResolved(){
  defendedDone = true;    // 防禦成功：延時懲罰恢復、罵人停用（「第二盤結束前不再跳任何提示」）
  fire('defended');
}
// combat 於「按錯 / 延時懲罰」時呼叫 → 監察官罵人（defended 之後不再插話）
export function onMistake(kind){
  if(!state.tutorialActive || state.tutorialDialog || state.over || defendedDone) return;
  const pool = (CFG().scold||{})[kind];
  if(!pool || !pool.length) return;
  const text = pool[Math.random()*pool.length|0];
  openStep({ lines:[{ who:'inspector', text }] });
}
// combat 延時懲罰前詢問：第二回合在首次防禦成功前不套延時懲罰
export function delayPenaltySuppressed(){
  return state.tutorialActive && state.boardIndex===1 && !defendedDone;
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
export function onBoardProgress(cleared){
  if(!state.tutorialActive || state.tutorialDialog) return;
  const st = CFG().strike || {};
  if(state.boardIndex===3 && cleared >= (st.afterCells||8)) fire('strike');
}
// combat.addEnergy 詢問：雙槍引導前破防值封頂（preFullEnergy），第三盤放行
export function energyCapActive(){
  return state.tutorialActive && !dualGuideDone && state.boardIndex<2;
}
// combat.addEnergy 於破防值滿的瞬間呼叫 → 雙槍引導（暫停＋箭頭指向計量表）
export function onEnergyFull(){
  if(!state.tutorialActive || dualGuideDone) return;
  dualGuideDone = true;
  // 反擊/防禦教學若還沒觸發（玩家一路沒防禦），至此已無意義 → 撤下殘餘步驟
  stepsLeft = stepsLeft.filter(s=>s.trigger!=='threat' && s.trigger!=='defended');
  openScript('dualReady', { gate:{
    type:'click',
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
//   cut-in 結束後：敵殘血封頂（保證本盤殺得完）→ 收尾台詞 → 教學完成（記已看）。
export function onSaintEnded(kind){
  if(!state.tutorialActive) return;
  if(kind!=='mb' && kind!=='return') return;
  if(kind==='return') state.tutorialLifeReturn = true;   // 結算台詞分歧：發動過生命歸還
  afterCutin(()=>{
    if(!state.tutorialActive) return;
    api.capEnemyHp(CFG().finishEnemyHp);
    markSeen();
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
  if(id==='strike'){
    // 「小心！」收段 → 劇情殺三連擊（三種受擊畫面、第二擊三爪、末擊致死 → 即死防禦保 1 HP）
    //   → 即死防禦 cut-in 結束後聖徒化引導
    api.strike();
    afterCutin(()=>openScript('saintCall', { gate:{
      type:'right',
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
  showLine();
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
  clearInterval(typeTimer); typeTimer=null;
  const text = line.text || '';
  let i = 0;
  if(lineEl) lineEl.textContent = '';
  typeTimer = setInterval(()=>{
    i++;
    if(lineEl) lineEl.textContent = text.slice(0,i);
    if(i>=text.length){
      clearInterval(typeTimer); typeTimer=null;
      if(bubble) bubble.classList.add('done');
    }
  }, CFG().lineTypeMs||30);
}

// 點擊推進：打字中→先跳完整句；打完→下一句；最後一句→進閘門或收段續戰
function advance(){
  if(!state.tutorialDialog || !cur || gate) return;   // 閘門中不推進台詞
  SFX.unlock(); SFX.menuClick();
  if(typeTimer){
    clearInterval(typeTimer); typeTimer=null;
    const line=cur.lines[lineIdx]||{};
    const lineEl=$('tutLine'); if(lineEl) lineEl.textContent = line.text || '';
    const bubble=$('tutBubble'); if(bubble) bubble.classList.add('done');
    return;
  }
  lineIdx++;
  if(lineIdx < cur.lines.length){ showLine(); return; }
  if(pendingGate){ enterGate(pendingGate); pendingGate=null; return; }   // 講完 → 進引導閘門（維持暫停）
  if(queue.length){ cur=queue.shift(); lineIdx=0; syncCast(cur); showLine(); return; }   // 接續段：在場立繪差異更新
  closeDialog(true);
}

/* 收掉對話層。resume=true → 解除暫停續戰並跑腳本接續（onStepClosed）；
 * silent=true（skip/abort）→ 只撤 UI、不觸發任何腳本接續。 */
function closeDialog(resume, silent){
  const id = cur && (cur.key || cur.trigger);
  cur=null; lineIdx=0;
  clearInterval(typeTimer); typeTimer=null;
  pendingGate=null; gate=null; hideGuide();
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
      if(!silent && id && state.tutorialActive) onStepClosed(id);
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
  if(g.action) g.action();
  if(g.after) g.after();
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
    // 畫面左緣往右閃、標示向右側滑動（x 貼緣：立繪已移正中，箭頭不壓立繪）
    const tr=$('top') ? $('top').getBoundingClientRect() : {top:0,height:innerHeight/2};
    dir='g-right'; label = labels.right || '向右側滑動';
    x = 42;
    y = tr.top + tr.height*0.45;
  }else{
    // 敵人框內由下往上指（生命歸還手勢區）、標示向上滑動；偏左 1/4 處——蕾妮立繪在右側不被壓
    const tr=$('top') ? $('top').getBoundingClientRect() : {left:0,top:0,width:innerWidth,height:innerHeight/2};
    dir='g-up'; label = labels.up || '向上滑動';
    x = tr.left + tr.width*0.26;
    y = tr.top + tr.height*0.52;
  }
  g.classList.add(dir);
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
// 跳過鈕：記為已看，當場無縫轉正常戰鬥（對話/閘門中按下＝收窗解除暫停，同場繼續）。
//   教學規則一併解除：敵殘血封頂回該敵 config 血量、tutorialRun 歸零（結算走一般流程）。
export function skip(){
  if(!state.tutorialActive) return;
  markSeen();
  if(state.tutorialDialog) closeDialog(true, true);   // silent：不觸發腳本接續
  endTutorial();
  const en = GAME_CONFIG.enemies[state.currentEnemyKey];
  if(en && api.capEnemyHp) api.capEnemyHp(en.hp);     // 教學覆寫的高血量收回正常值
  state.tutorialRun = false;                          // 結算/連戰恢復一般規則
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
        // 點擊閘門：落點在破防計量表附近才算（其餘點擊無效，遊戲不繼續）
        if(gate.type==='click' && p && !p.moved && inClaspArea(e.clientX, e.clientY)) completeGate();
        return;
      }
      advance();
    });
    touch.addEventListener('pointercancel', ()=>{ ptr=null; });
  }
  const sk=$('tutSkipBtn');
  if(sk){
    let h=false;
    const run=()=>{ SFX.unlock(); SFX.menuClick(); skip(); };
    sk.addEventListener('touchstart',e=>{e.preventDefault();h=true;run();},{passive:false});
    sk.addEventListener('click',()=>{ if(h){h=false;return;} run(); });
  }
}

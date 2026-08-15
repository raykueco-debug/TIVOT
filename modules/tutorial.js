/* ============================================================================
 *  modules/tutorial.js — 教學關卡（首次出陣的穿插式對話教學）
 *  ---------------------------------------------------------------------------
 *  職責：首次判定（localStorage）、對話步驟依戰鬥節點觸發、監察官/搭檔立繪
 *    自左右移入與「說話者原色、非說話者調暗」、打字機對話框、跳過鈕。
 *  對話插入期間＝真暫停：走 combat 注入的 pauseForDialog / resumeFromDialog
 *    （既有 cutinPlaying 機制：鎖盤面點擊/延時懲罰/敵大絕生成與釋放/紅點反擊、
 *     凍結攻擊圈縮放與計時碼表），本模組不自行碰任何戰鬥計時器。
 *  內容資料一律讀 GAME_CONFIG.tutorial（台詞/角色/觸發節點/速度），不寫死。
 *
 *  狀態擁有者：3.9（tutorialActive / tutorialDialog）。
 *  依賴：state / config / audio；combat 原語經 init 注入（維持 §2 依賴方向：
 *    combat 為協調者 import 本模組；defense 的首紅點通知經 combat 注入轉交）。
 * ========================================================================== */

import { GAME_CONFIG, asset } from '../config.js';
import { state } from '../state.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const CFG = () => GAME_CONFIG.tutorial;

// combat 於啟動時注入：{ pauseForDialog, resumeFromDialog }
let api = {};
export function init(a){ api = a; bindUI(); }

let stepsLeft = [];            // 尚未觸發的步驟（依 trigger 消耗，一步只觸發一次）
let queue = [];                // 對話中被觸發的步驟 → 當前段講完直接接續（立繪不退場）
let cur = null, lineIdx = 0;   // 進行中的步驟與台詞游標
let typeTimer = null;          // 打字機計時器
let startTimer = null;         // battleStart 延遲計時器

/* ---- 首次判定（localStorage 不可用時視為未看過：寧可多教，不漏教）---- */
function hasSeen(){ try{ return localStorage.getItem(CFG().storageKey)==='1'; }catch(e){ return false; } }
function markSeen(){ try{ localStorage.setItem(CFG().storageKey,'1'); }catch(e){} }

/* ============================================================================
 *  進場/節點掛鉤（combat 於對應時點呼叫）
 * ========================================================================== */
// startGame 於首盤載入後呼叫：首次（未看過）才啟動教學
export function maybeStart(){
  const cfg = CFG();
  if(!cfg || !cfg.steps || !cfg.steps.length) return;
  if(hasSeen() || state.tutorialActive) return;
  state.tutorialActive = true;
  stepsLeft = cfg.steps.slice();
  queue = [];
  const sk=$('tutSkipBtn'); if(sk) sk.classList.add('on');
  clearTimeout(startTimer);
  startTimer = setTimeout(()=>fire('battleStart'), cfg.startDelayMs||700);
}
// combat.loadBoard 每次載盤呼叫 → 觸發 'board:N' 步驟
export function onBoardLoaded(idx){ fire('board:'+idx); }
// defense.spawnThreat 生成紅點時經注入呼叫 → 觸發 'threat' 步驟（紅點凍結於畫面講解）
export function onThreatSpawned(){ fire('threat'); }
// defense.resolveThreat 成功點掉紅點（Defense/Perfect/Counter 任一）→ 'defended' 步驟
//   （首次防禦成功後的反擊/副武器說明；步驟消耗一次，之後為 no-op）
export function onThreatResolved(){ fire('defended'); }
// combat 於「按錯 / 延時懲罰」時呼叫 → 監察官跳出來罵人（隨機一句、可重複觸發，
//   不佔 steps；懲罰傷害先落地才插話，罵完點擊即續戰）
export function onMistake(kind){
  if(!state.tutorialActive || state.tutorialDialog || state.over) return;
  const pool = (CFG().scold||{})[kind];
  if(!pool || !pool.length) return;
  const text = pool[Math.random()*pool.length|0];
  openStep({ lines:[{ who:'inspector', text }] });
}

function fire(trigger){
  if(!state.tutorialActive) return;
  const i = stepsLeft.findIndex(s=>s.trigger===trigger);
  if(i<0) return;
  const step = stepsLeft.splice(i,1)[0];
  if(state.tutorialDialog){ queue.push(step); return; }   // 對話中觸發 → 排隊接續播
  // 開場白尚未插入（startDelayMs 未到）就被其他節點搶先（開場保證大絕可在 3 秒內生成）
  //   → 先講開場白，把該節點排入佇列接續，維持敘事順序。
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

/* ============================================================================
 *  對話段：開啟（真暫停+立繪移入）→ 逐句 → 關閉（立繪退場+續戰）
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
    if(el) el.classList.toggle('in', used.has(key));
  }
}

function openStep(step){
  cur = step; lineIdx = 0;
  state.tutorialDialog = true;
  api.pauseForDialog();                          // 真暫停：同退出確認框的機制
  document.body.classList.add('dlg-pause');      // 凍結底層警戒脈動（防 iOS 合成假影）
  // 立繪掛圖（左右各一位；side/圖片鑰匙讀 cast 設定）
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
    requestAnimationFrame(()=>requestAnimationFrame(()=>syncCast(step)));   // 兩幀後起滑（確保初始位已繪）
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

// 點擊推進：打字中→先跳完整句；打完→下一句；最後一句→收段續戰
function advance(){
  if(!state.tutorialDialog || !cur) return;
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
  if(queue.length){ cur=queue.shift(); lineIdx=0; syncCast(cur); showLine(); return; }   // 接續段：維持暫停、在場立繪差異更新
  closeDialog(true);
}

/* 收掉對話層。resume=true → 解除暫停續戰，且步驟播罄時結束教學（記已看）；
 * resume=false → 只撤 UI（goHome/勝負/重開場等呼叫端已接管流程，不記已看）。 */
function closeDialog(resume){
  cur=null; lineIdx=0;
  clearInterval(typeTimer); typeTimer=null;
  state.tutorialDialog=false;
  if(!document.getElementById('exitConfirm')) document.body.classList.remove('dlg-pause');
  const wrap=$('tutCast'), touch=$('tutTouch');
  if(touch) touch.classList.remove('on');
  if(wrap){
    const L=$('tutCastL'), R=$('tutCastR');
    for(const el of [L,R]){ if(el){ el.classList.remove('in'); el.classList.remove('speaking'); } }   // 立繪滑出
    setTimeout(()=>{ if(!state.tutorialDialog) wrap.classList.remove('on'); }, 500);
  }
  if(resume){
    api.resumeFromDialog();
    if(!stepsLeft.length && !queue.length) complete();   // 全部講完＝教學自然結束
  }
}

function complete(){ markSeen(); endTutorial(); }
function endTutorial(){
  state.tutorialActive=false;
  clearTimeout(startTimer); startTimer=null;
  stepsLeft=[]; queue=[];
  const sk=$('tutSkipBtn'); if(sk) sk.classList.remove('on');
}

/* ============================================================================
 *  跳過 / 中止
 * ========================================================================== */
// 跳過鈕：記為已看，當場無縫轉正常戰鬥（對話中按下＝收窗並解除暫停，同場繼續）
export function skip(){
  if(!state.tutorialActive) return;
  markSeen();
  if(state.tutorialDialog) closeDialog(true);
  endTutorial();
}
// 中止（combat.stopAll 調度：goHome/勝負/重開場）：只撤 UI、不記已看——
// 中途退出的話，下次出陣仍會重新進教學（skip 才算看過）。
export function abort(){
  if(!state.tutorialActive && !state.tutorialDialog) return;
  if(state.tutorialDialog) closeDialog(false);
  endTutorial();
}

/* ============================================================================
 *  UI 綁定（touch/click 去重，同 main.js bindBtn 慣例）
 * ========================================================================== */
function bindUI(){
  const touch=$('tutTouch');
  if(touch){
    let h=false;
    touch.addEventListener('touchstart',e=>{e.preventDefault();h=true;advance();},{passive:false});
    touch.addEventListener('click',()=>{ if(h){h=false;return;} advance(); });
  }
  const sk=$('tutSkipBtn');
  if(sk){
    let h=false;
    const run=()=>{ SFX.unlock(); SFX.menuClick(); skip(); };
    sk.addEventListener('touchstart',e=>{e.preventDefault();h=true;run();},{passive:false});
    sk.addEventListener('click',()=>{ if(h){h=false;return;} run(); });
  }
}

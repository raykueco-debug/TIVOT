/* ============================================================================
 *  modules/inspector.js — 監察官（評價 + 結算）
 *  ---------------------------------------------------------------------------
 *  職責：評價等第計算（規則制 rank + EXP 顯示分數）、監察官挑選/立繪/對白
 *    （Boss 走 bossDialogues）、結算面板分階段演出與打字機、最佳成績存讀
 *    （一般/Boss 兩組 localStorage）、S 解鎖與「再度執槍/迎擊」分流。
 *
 *  狀態擁有者：3.6 評價/流程（sRankUnlocked / resultMode / currentFavor）。
 *    跨擁有者累加值只讀不反寫：counterCount/counterDamage（weapon 經 addCounter）、
 *    perfectCount（defense 經 addPerfect）、sawExecution（saint 經 markExecution）、
 *    flawlessRun（combat）。currentFavor 本輪固定 0（養成層未接），只讀。
 *
 *  依賴方向：只 import state/config。combat/enemy 原語（goHome / triggerIntruder）
 *    一律由 combat 於 setup() 注入，維持「combat 為唯一協調者」的邊界。
 *
 *  評價 rank：規則制（以 reference/index.html:2322 為準）——
 *    無傷 ≤40s→S 否則 A；有傷 ≤40→B / ≤50→C / ≤60→D / >60→E。
 *    config.evaluation.tiers（S3600…）為 reference 未使用的休眠 config，不參與判定；
 *    score/raw 公式只拿來算 EXP 顯示，不決定 rank。
 * ========================================================================== */

import { GAME_CONFIG, asset } from '../config.js';
import { state } from '../state.js';

const $ = id => document.getElementById(id);

/* ---------------------------------------------------------------------------
 *  注入點：combat.setup() 傳入自己與 enemy 的原語（維持依賴方向）。
 *    goHome         — combat 擁有：結算後回首頁。
 *    triggerIntruder— enemy 擁有：迎擊 → 進 Boss 戰（本輪為 no-op，待第 5 步）。
 * ------------------------------------------------------------------------- */
let api = { goHome(){}, triggerIntruder(){} };
export function init(injected){ api = { ...api, ...injected }; }

/* ============================================================================
 *  小工具
 * ========================================================================== */
function fmtTime(sec){
  if(sec==null || !isFinite(sec)) return '--';
  const m=Math.floor(sec/60), s=sec-m*60;
  return m>0 ? `${m}分${s.toFixed(1)}秒` : `${s.toFixed(1)}秒`;
}

// 依「門檻 key → 值」的表，挑出不超過 current 的最高門檻對應值；找不到回 fallback。
// 好感雙軌查表器：未來加好感層＝往 dialogues/portraits 加門檻 key，此查表器不動。
function pickByThreshold(map, current, fallback){
  if(!map) return fallback;
  const keys=Object.keys(map).map(Number).filter(k=>!isNaN(k)).sort((a,b)=>a-b);
  let picked=fallback, found=false;
  for(const k of keys){ if(current>=k){ picked=map[k]; found=true; } }
  return found ? picked : fallback;
}

/* ============================================================================
 *  評價（規則制 rank + EXP 顯示分數）
 * ========================================================================== */
// 依結算數據算 rank 與 EXP。回傳 { score, exp, rank, flawless, execution }。
function computeEvaluation(totalTime){
  // ── 規則制評價（以 reference 為準；tiers 為休眠 config，不參與判定）──
  //  S：無傷 且 ≤40s   A：無傷（無時間上限）
  //  B：有傷 且 ≤40s   C：有傷 且 ≤50s   D：有傷 且 ≤60s   E：有傷 且 >60s
  let rank;
  if(state.flawlessRun){
    rank = (totalTime<=40) ? 'S' : 'A';
  }else{
    if(totalTime<=40)      rank='B';
    else if(totalTime<=50) rank='C';
    else if(totalTime<=60) rank='D';
    else                   rank='E';
  }
  // EXP：沿用原積分作為經驗值展示（反擊/完美/無傷/處決加成），不決定 rank。
  const ev = GAME_CONFIG.evaluation;
  let exp = 0;
  if(ev){
    const s = ev.score;
    let raw = Math.max(0, s.timeBonus.base - totalTime * s.timeBonus.perSecond);
    raw += state.counterDamage * s.counterCoef;
    raw += state.perfectCount  * s.perfectPerHit;
    if(state.flawlessRun)  raw *= s.flawlessMult;
    if(state.sawExecution) raw *= s.executionMult;
    exp = Math.round(raw);
  }
  return { score:exp, exp, rank, flawless:state.flawlessRun, execution:state.sawExecution };
}

/* ============================================================================
 *  監察官挑選 / 立繪 / 對白
 * ========================================================================== */
// 取得當前啟用的監察官 config（無則 null）
function getInspector(){
  const key=GAME_CONFIG.defaultInspector;
  if(!key) return null;
  return GAME_CONFIG.inspectors[key] || null;
}

// 依監察官 + 好感度挑立繪鑰匙（無 portraits 則用單張 image）
function pickInspectorPortrait(insp){
  if(!insp) return null;
  return pickByThreshold(insp.portraits, state.currentFavor, insp.image||null);
}

// 依監察官 + 評價等第（或 'lose'）+ 好感度挑一句台詞；挑不到回 null。
// boss=true 時優先用 bossDialogues（Boss 戰專屬），缺該 rank 才 fallback 回一般 dialogues。
function pickInspectorDialogue(insp, rankKey, boss){
  if(!insp) return null;
  let byRank = null;
  if(boss && insp.bossDialogues) byRank = insp.bossDialogues[rankKey];
  if(!byRank && insp.dialogues)  byRank = insp.dialogues[rankKey];
  if(!byRank) return null;
  const arr = pickByThreshold(byRank, state.currentFavor, null);
  if(!arr || !arr.length) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// 結算共用：Counter（次數+累計傷害）、完美防禦（次數）
function combatStatsRows(){
  let r='';
  r += `<div class="row"><span>Counter 反擊</span><b>${state.counterCount} 次 · ${state.counterDamage} 傷</b></div>`;
  r += `<div class="row"><span>完美防禦</span><b>${state.perfectCount} 次</b></div>`;
  return r;
}

/* ============================================================================
 *  最佳成績（一般 / Boss 兩組 localStorage）
 * ========================================================================== */
const BEST_KEY='saint_best_total_v1';
const BEST_KEY_BOSS='saint_best_total_boss_v1';   // Boss 戰獨立最佳紀錄
function loadBestTotal(boss){
  const key = boss ? BEST_KEY_BOSS : BEST_KEY;
  try{ const v=localStorage.getItem(key); return v?parseFloat(v):null; }catch(e){ return null; }
}
function saveBestTotal(t, boss){
  const key = boss ? BEST_KEY_BOSS : BEST_KEY;
  try{ localStorage.setItem(key, String(t)); }catch(e){}
}

/* ============================================================================
 *  結算入口：combat.win/lose 算好 totalTime/avg（它擁有計時）後呼叫。
 *    opts.isLose 為真＝戰敗流程（rows 只列反擊/完美，不算評價/最佳/EXP）。
 * ========================================================================== */
export function settle(totalTime, avg, opts={}){
  const isLose = !!opts.isLose;
  if(isLose){
    const rows=combatStatsRows();
    showResultSequence('聖光黯滅','HUND 倒下了…', rows, 'lose', true);
    return;
  }
  // ── 勝利結算 ──
  // 最佳總用時 / 破紀錄判定（Boss 戰為獨立戰鬥 → 最佳紀錄分開存）
  const bossFight = state.inIntruderFight;
  const prevBest=loadBestTotal(bossFight);
  const isRecord = (prevBest==null) || (totalTime<prevBest);
  if(isRecord) saveBestTotal(totalTime, bossFight);
  const bestShown = isRecord ? totalTime : prevBest;

  let sub=(($('enemyName')&&$('enemyName').textContent)||'目標')+'已淨化';
  if(state.overkill>0) sub += ` · OVERKILL ${Math.round(state.overkill)}`;

  let rows='';
  rows += `<div class="row"><span>每盤平均用時</span><b>${fmtTime(avg)}</b></div>`;
  rows += `<div class="row"><span>總用時</span><b>${fmtTime(totalTime)}</b></div>`;
  rows += `<div class="row"><span>最佳總用時</span><b>${fmtTime(bestShown)}</b></div>`;
  if(avg==null) rows += `<div class="row" style="opacity:.6;font-size:11px"><span>（平均只計第三盤後）</span><b></b></div>`;
  rows += combatStatsRows();
  // ── 評價分級（規則制 rank + EXP 顯示）──
  const evalResult = computeEvaluation(totalTime);
  rows += `<div class="row"><span>評價</span><b class="rank rank-${evalResult.rank}">${evalResult.rank}</b></div>`;
  rows += `<div class="row" style="opacity:.7;font-size:11px"><span>EXP</span><b>${evalResult.exp}</b></div>`;
  if(isRecord) rows += `<div class="record">★ NEW RECORD ★</div>`;
  // ── 監察官結算展示（依評價等第挑台詞）──
  showResultSequence('聖裁完成', sub, rows, evalResult.rank, false);

  // ── 隱藏關（New Hustle）解鎖判定：S 評價才解鎖，不自動觸發 ──
  //   由「再度執槍 → 迎擊」流程手動進入（見 onRematchBtn）。
  const it = GAME_CONFIG.intruder;
  state.sRankUnlocked = false;
  if(it && it.enable && !state.intruderTriggered && !state.inIntruderFight && evalResult.rank==='S'){
    state.sRankUnlocked = true;
  }
}

/* ============================================================================
 *  結算畫面分階段序列：
 *   T0 立繪＋retry＋大標同時進場 → rows 由上往下刷（1s 內）→ 對話框彈出 → 逐字台詞（2s 內）
 * ========================================================================== */
let _inspTypeTimer=null;
function showResultSequence(title, sub, statsHtml, rankKey, isLose){
  const b=$('banner');
  // 每次結算：按鈕歸位為「再度執槍」模式
  state.resultMode='rematch';
  const rbtn=$('rematchBtn');
  rbtn.textContent='再度執槍';
  rbtn.classList.remove('intercept','ready');
  rbtn.style.display='';
  $('bannerTitle').textContent=title;
  $('bannerSub').textContent=sub;
  const stats=$('resultStats');
  stats.innerHTML=statsHtml||'';
  stats.classList.remove('sweep');

  // 監察官立繪＋台詞（一般失敗不跑監察官；Boss 戰失敗仍顯示監察官，播 Boss 失敗台詞）
  const insp = (isLose && !state.inIntruderFight) ? null : getInspector();
  const stage=$('inspectorStage');
  const bubble=$('inspectorBubble');
  const portrait=$('inspectorPortrait');
  const nameEl=$('inspectorName');
  const lineEl=$('inspectorLine');
  clearTimeout(_inspTypeTimer);
  bubble.classList.remove('show');
  lineEl.textContent='';
  if(insp){
    stage.style.display='flex';
    const pKey=pickInspectorPortrait(insp);
    portrait.src = pKey ? asset(pKey) : '';
    portrait.style.display = portrait.src ? 'block' : 'none';
    nameEl.textContent = insp.name || '監察官';
  }else{
    stage.style.display='none';
  }

  b.classList.toggle('lose', !!isLose);
  b.classList.remove('seq');
  b.classList.add('on');
  // 觸發進場動畫（立繪＋大標＋retry 同時）
  void b.offsetWidth;
  b.classList.add('seq');

  // ── 階段二：rows 由上往下刷，1 秒內刷完 ──
  const rowEls=stats.querySelectorAll('.row, .record');
  const n=rowEls.length;
  const totalSweep=1000;                       // 1 秒內刷完
  const step = n>1 ? Math.min(120, totalSweep/n) : 0;
  rowEls.forEach((el,idx)=>{ el.style.animationDelay=(idx*step)+'ms'; });
  // 稍等立繪起手後再刷 rows
  setTimeout(()=>{ stats.classList.add('sweep'); }, 260);

  // ── 階段三＋四：rows 刷完後彈出對話框，逐字顯示台詞（2 秒內）──
  const sweepDone = 260 + (n>0 ? (n-1)*step : 0) + 300;
  if(insp){
    // 處決勝利（聖徒化 Maximum Burst 擊殺）→ 固定處決台詞，不論 rank；否則走 rank 台詞。
    // Boss 戰一律走 bossDialogues 的 rank 台詞（不套用一般處決台詞）。
    const line = (!state.inIntruderFight && state.sawExecution && insp.executionLine)
      ? insp.executionLine
      : (pickInspectorDialogue(insp, rankKey, state.inIntruderFight) || '（監察官台詞待填）');
    setTimeout(()=>{
      bubble.classList.add('show');
      typeInspectorLine(lineEl, line, 2000);   // 2 秒內逐字
    }, Math.max(sweepDone, 1100));
  }
}

// 逐字打字機：total 毫秒內把整句顯示完
function typeInspectorLine(el, text, total){
  clearTimeout(_inspTypeTimer);
  const chars=[...text];
  const per = chars.length ? Math.max(30, total/chars.length) : 0;
  let i=0;
  el.textContent='';
  const tick=()=>{
    if(i<chars.length){
      el.textContent = chars.slice(0,i+1).join('');
      i++;
      _inspTypeTimer=setTimeout(tick, per);
    }
  };
  tick();
}

/* ============================================================================
 *  結算按鈕：依 resultMode 分流
 *   'rematch'  ：一律回首頁（goHome）。唯一例外＝S 評價解鎖 → 芙蕾雅台詞 → 鈕變「迎擊」。
 *   'intercept'：迎擊 → 呼叫注入的 enemy.triggerIntruder（本輪 no-op，Boss 遭遇待第 5 步）。
 * ========================================================================== */
export function onRematchBtn(){
  const rbtn=$('rematchBtn');
  if(state.resultMode==='intercept'){
    api.triggerIntruder();
    return;
  }
  // resultMode==='rematch'
  if(!state.sRankUnlocked){
    api.goHome();               // 一律回首頁（含 Boss 戰勝/敗後）
    return;
  }
  // S 評價：解鎖迎擊流程（唯一例外）
  state.intruderTriggered=true;  // 標記本場已進入隱藏流程
  rbtn.style.display='none';     // 鈕先消失
  const insp=getInspector();
  const bubble=$('inspectorBubble');
  const lineEl=$('inspectorLine');
  // 芙蕾雅重跳一次對話框：「慢著！有新的敵人！」
  bubble.classList.remove('show'); void bubble.offsetWidth;
  clearTimeout(_inspTypeTimer);
  lineEl.textContent='';
  bubble.classList.add('show');
  const warnLine = (insp && insp.interceptLine) || '慢著！有新的敵人！';
  typeInspectorLine(lineEl, warnLine, 1400);
  // 台詞跳完 → 鈕變「迎擊」、變色發光
  const dur = 1400 + 300;
  setTimeout(()=>{
    state.resultMode='intercept';
    rbtn.textContent='迎擊';
    rbtn.classList.add('intercept','ready');
    rbtn.style.display='';
  }, dur);
}

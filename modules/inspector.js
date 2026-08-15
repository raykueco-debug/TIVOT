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
 *  評價系統（rating）：百分制計分 → 對照 GAME_CONFIG.rating.tiers 取等級 → 換算 EXP。
 *    時間項為主（budget 隨敵人總血量自動變動），加分項（命中率/連擊/完美反擊/overkill）、
 *    受擊扣分；無傷（hitsTaken=0）直接判 S。取代舊「無傷+時間門檻」規則制與 config.evaluation。
 *    evaluate/scoreToExp 為純函式（見下），可單獨測試；stats 由 combat.win 組裝。
 * ========================================================================== */

import { GAME_CONFIG, asset, bgmVol, sfxGain } from '../config.js';
import { state } from '../state.js';
import { SFX } from '../audio.js';   // Boss BGM 於「再度執槍（S 解鎖）」瞬間起播
import { L, fmt } from '../i18n.js';   // 多語言（結算標題/數據列/按鈕）

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
  return m>0 ? fmt(L.result.timeMinSec,{m,s:s.toFixed(1)}) : fmt(L.result.timeSec,{s:s.toFixed(1)});
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
 *  評價系統（rating）— 百分制計分 → 等級 → EXP
 *  ---------------------------------------------------------------------------
 *  所有可調數值集中於 GAME_CONFIG.rating，本檔不硬編任何評分參數。
 *  evaluate / scoreToExp 為「純函式」（只吃 stats/cfg，不讀 state/DOM），方便單獨測試。
 *  stats 需含：totalHP、isBoss、clearTime(秒)、accuracy(0~1)、maxCombo、
 *             perfectCounter、overkill、hitsTaken。
 *  完美反擊 = Counter 反擊次數(counterCount)；反擊總傷 = counterDamage（皆由 combat.win 組裝進 stats）。
 * ========================================================================== */
const clamp01 = x => (x<0 ? 0 : (x>1 ? 1 : x));

// 分數 → EXP：offset 質數基底 + score×mult，尾數微擾 + overkill 加成，避免整齊倍數。
export function scoreToExp(score, stats, cfg = GAME_CONFIG.rating.exp){
  let exp = cfg.offset + score * cfg.mult;
  const jitter = Math.round((score * cfg.mult) % cfg.jitterMod);
  exp += jitter;
  exp += (stats.overkill || 0) * cfg.overkillExp;   // 每次 overkill +overkillExp
  return Math.round(exp);
}

// 主評分：回傳 { grade, score, exp, breakdown }。
export function evaluate(stats, cfg = GAME_CONFIG.rating){
  const t = cfg.time, p = cfg.points, nm = cfg.norm;
  // 1) 時間預算：隨敵人總血量自動變動（+ Boss 加成）
  const budget = (stats.totalHP / t.hpPerBase) * t.base + (stats.isBoss ? t.bossBonus : 0);
  // 2) 剩餘時間
  const timeLeft = budget - stats.clearTime;
  // 3) 時間項：剩餘達 (預算-capSeconds) 即封頂（capSeconds 內 clear → 時間項滿分）
  const fullMarkLeft = budget - t.capSeconds;
  const timeRatio = (fullMarkLeft > 0) ? clamp01(timeLeft / fullMarkLeft) : (timeLeft > 0 ? 1 : 0);
  const timeScore = timeRatio * p.timeMax;
  // 4) 加分項（各自 clamp 到 0~1 後乘配分）
  const accScore   = clamp01(stats.accuracy)                 * p.accuracyMax;
  const accPerfect = (stats.accuracy >= 1 ? (p.accPerfectBonus || 0) : 0);   // 命中率 100% 額外加成
  const comboScore = clamp01(stats.maxCombo / nm.comboTarget) * p.comboMax;
  const pcScore    = clamp01(stats.perfectCounter / nm.pcTarget) * p.perfectCtrMax;
  const okScore    = clamp01(stats.overkill / nm.okTarget)    * p.overkillMax;
  // 5) 受擊扣分
  const hitPenalty = stats.hitsTaken * p.hitPenalty;
  // 6) 總分（下限 0）
  const score = Math.max(0, timeScore + accScore + accPerfect + comboScore + pcScore + okScore - hitPenalty);
  // 7) 級距：tiers 由高到低，取第一個 score >= min
  let grade = cfg.tiers[cfg.tiers.length - 1].grade;
  for(const tier of cfg.tiers){ if(score >= tier.min){ grade = tier.grade; break; } }
  // 8) 無傷 gate：無受擊 → 直接 S（凌駕分數）
  if(stats.hitsTaken === 0) grade = 'S';

  const exp = scoreToExp(score, stats, cfg.exp);
  return {
    grade, score, exp,
    breakdown: { timeScore, accScore, accPerfect, comboScore, pcScore, okScore, hitPenalty, budget, timeLeft },
  };
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

// 戰敗結算用：Counter（次數+累計傷害）、完美防禦（次數）
function combatStatsRows(){
  let r='';
  r += `<div class="row"><span>${L.result.rowCounter}</span><b>${fmt(L.result.timesUnit,{n:state.counterCount})} · ${fmt(L.result.dmgUnit,{n:state.counterDamage})}</b></div>`;
  r += `<div class="row"><span>${L.result.rowPerfect}</span><b>${fmt(L.result.timesUnit,{n:state.perfectCount})}</b></div>`;
  return r;
}

// 勝利結算明細。Overkill 已在標題副行呈現、無傷改為「戰鬥用時」旁的貼標（達標才出現），故此處皆不另列。
function ratingStatsRows(stats, totalTime){
  const accPct = Math.round(clamp01(stats.accuracy) * 100);
  const flawlessTag = (stats.hitsTaken === 0) ? ` <span class="tag-flawless">${L.result.tagFlawless}</span>` : '';
  let r='';
  r += `<div class="row"><span>${L.result.rowCombo}</span><b>${stats.maxCombo}</b></div>`;
  r += `<div class="row"><span>${L.result.rowHits}</span><b>${stats.hitsTaken}</b></div>`;
  r += `<div class="row"><span>${L.result.rowAccuracy}</span><b>${accPct}%</b></div>`;
  r += `<div class="row"><span>${L.result.rowPerfectCtr}</span><b>${fmt(L.result.timesUnit,{n:stats.perfectCounter})}</b></div>`;
  r += `<div class="row"><span>${L.result.rowCtrDamage}</span><b>${Math.round(stats.counterDamage || 0)}</b></div>`;
  r += `<div class="row"><span>${L.result.rowTime}</span><b>${fmtTime(totalTime)}${flawlessTag}</b></div>`;
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
export function settle(totalTime, stats, opts={}){
  const isLose = !!opts.isLose;
  if(isLose){
    const rows=combatStatsRows();
    showResultSequence(L.result.loseTitle, L.result.loseSub, rows, 'lose', true);
    return;
  }
  // ── 勝利結算 ──
  // 最佳總用時 / 破紀錄判定（Boss 戰為獨立戰鬥 → 最佳紀錄分開存）。評價本身不看最佳，只作 NEW RECORD 提示。
  const bossFight = state.inIntruderFight;
  const prevBest=loadBestTotal(bossFight);
  const isRecord = (prevBest==null) || (totalTime<prevBest);
  if(isRecord) saveBestTotal(totalTime, bossFight);

  let sub=fmt(L.result.winSub,{name:(($('enemyName')&&$('enemyName').textContent)||'')});
  if(stats.overkill>0) sub += ` · OVERKILL ${Math.round(stats.overkill)}`;

  // ── 評價系統（rating）：大字等級（顯眼）+ EXP + 各數值明細 ──
  const evalResult = evaluate(stats);
  let rows='';
  rows += `<div class="grade-wrap"><b class="grade-badge rank-${evalResult.grade}">${evalResult.grade}</b>`
        + `<span class="grade-meta"><span class="grade-cap">${L.result.gradeCap}</span>`
        + `<span class="grade-exp">EXP ${evalResult.exp}</span></span></div>`;
  rows += ratingStatsRows(stats, totalTime);
  if(isRecord) rows += `<div class="record">${L.result.newRecord}</div>`;
  // ── 監察官結算展示（依評價等第挑台詞）──
  showResultSequence(L.result.winTitle, sub, rows, evalResult.grade, false);

  // ── 教學戰專屬結算（tutorialRun 存續到此）：覆蓋台詞與按鈕，不進迎擊/獎勵流程 ──
  if(state.tutorialRun){ applyTutorialResult(); return; }

  // ── 隱藏關（New Hustle）解鎖判定：S 評價才解鎖，不自動觸發 ──
  //   由「再度執槍 → 迎擊」流程手動進入（見 onRematchBtn）。
  const it = GAME_CONFIG.intruder;
  state.sRankUnlocked = false;
  if(it && it.enable && !state.intruderTriggered && !state.inIntruderFight && evalResult.grade==='S'){
    state.sRankUnlocked = true;
  }

  // ── Boss 戰 S 級獎勵（銭湯インストール）：兩段式按鈕 ──
  //   第一按「再度執槍」→ 原地變身金色呼吸光「SAINT INSTALL...?」（resultMode 'sentou-offer'→'sentou'）
  //   第二按 → 進獎勵畫面（openSentouReward）。分流見 onRematchBtn。
  if(state.inIntruderFight && evalResult.grade==='S' && it && it.reward){
    const img=new Image(); img.src=asset(it.reward.image);   // 預載獎勵大圖（2.3MB，結算期間先抓）
    state.resultMode='sentou-offer';   // 覆蓋 showResultSequence 預設的 'rematch'
  }
}

/* ============================================================================
 *  結算畫面分階段序列：
 *   T0 立繪＋retry＋大標同時進場 → rows 由上往下刷（1s 內）→ 對話框彈出 → 逐字台詞（2s 內）
 * ========================================================================== */
let _inspTypeTimer=null;
let _resultAutoTimer=null;   // 結算/戰敗畫面自動回首頁計時
function showResultSequence(title, sub, statsHtml, rankKey, isLose){
  const b=$('banner');
  // 結算/戰敗畫面：停留上限（config resultAutoMs，1:10）內沒操作 → 自動回首頁
  clearTimeout(_resultAutoTimer);
  const _autoMs = (GAME_CONFIG.transitions && GAME_CONFIG.transitions.resultAutoMs) || 0;
  if(_autoMs>0) _resultAutoTimer=setTimeout(()=>{ if(api.goHome) api.goHome(); }, _autoMs);
  // 每次結算：按鈕歸位為「再度執槍」模式
  state.resultMode='rematch';
  const rbtn=$('rematchBtn');
  rbtn.textContent=L.result.rematch;
  rbtn.classList.remove('intercept','ready','saintinstall');
  rbtn.style.display='';
  rbtn.style.visibility='';   // 復位：避免沿用上一場「迎擊」流程的 visibility:hidden
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
    nameEl.textContent = insp.name || L.inspector.fallbackName;
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
  const rowEls=stats.querySelectorAll('.grade-wrap, .row, .record');
  const n=rowEls.length;
  const totalSweep=1000;                       // 1 秒內刷完
  const step = n>1 ? Math.min(120, totalSweep/n) : 0;
  rowEls.forEach((el,idx)=>{ el.style.animationDelay=(idx*step)+'ms'; });
  // 稍等立繪起手後再刷 rows
  setTimeout(()=>{ stats.classList.add('sweep'); }, 260);

  // ── 階段三＋四：rows 刷完後彈出對話框，逐字顯示台詞（2 秒內）──
  //   教學戰（tutorialRun）：rank 台詞讓位給 applyTutorialResult 的專屬台詞
  const sweepDone = 260 + (n>0 ? (n-1)*step : 0) + 300;
  if(insp && !state.tutorialRun){
    // 處決勝利（聖徒化 Maximum Burst 擊殺）→ 固定處決台詞，不論 rank；否則走 rank 台詞。
    // Boss 戰一律走 bossDialogues 的 rank 台詞（不套用一般處決台詞）。
    let line = (!state.inIntruderFight && state.sawExecution && insp.executionLine)
      ? insp.executionLine
      : (pickInspectorDialogue(insp, rankKey, state.inIntruderFight) || L.result.lineMissing);
    // {rand3}＝隨機 3 位數，不足 3 位以 0 補滿（如 007 / 042）。Boss 落敗台詞用。
    line = line.replace('{rand3}', String(Math.floor(Math.random()*1000)).padStart(3,'0'));
    setTimeout(()=>{
      bubble.classList.add('show');
      typeInspectorLine(lineEl, line, 2000);   // 2 秒內逐字
    }, Math.max(sweepDone, 1100));
  }
}

/* ============================================================================
 *  教學戰專屬結算（config.tutorial.result）
 *  ---------------------------------------------------------------------------
 *  台詞：依「是否發動過搭檔主動技（生命歸還）」二選一 + outro 接續（同框逐字）。
 *  按鈕：改「回到主畫面」；按下先補 buttonLine（「期待你的表現。」）再回首頁。
 *  不進 S 迎擊/銭湯獎勵流程（教學戰不解鎖隱藏關）。
 * ========================================================================== */
function applyTutorialResult(){
  const tr = (GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.result) || {};
  state.sRankUnlocked = false;
  state.resultMode = 'tutorial-home';
  const rbtn=$('rematchBtn');
  if(rbtn) rbtn.textContent = tr.buttonLabel || '回到主畫面';
  // ⚠ 用 tutorialLifeReturn 而非 partnerActiveUsed：蕾妮主動技無 oncePerBattle，後者不會被設
  const line1 = state.tutorialLifeReturn ? tr.usedLifeReturn : tr.noLifeReturn;
  const bubble=$('inspectorBubble'), lineEl=$('inspectorLine');
  clearTimeout(_inspTypeTimer);
  if(lineEl) lineEl.textContent='';
  // 兩次對話框：第一句打完 → 尾端亮「▼」→ 點擊對話框才重彈打第二句（聖徒化豪賭 outro）
  setTimeout(()=>{
    if(bubble) bubble.classList.add('show');
    if(lineEl) typeInspectorLine(lineEl, line1 || '', 2000);
    if(tr.outro && bubble){
      setTimeout(()=>{
        if(state.resultMode!=='tutorial-home') return;   // 已按鈕離場（buttonLine 播放中）則讓位
        if(lineEl) lineEl.textContent += '　▼';          // 待點提示
        // ⚠ 監聽掛在 #inspectorStage：#inspectorBubble 是 pointer-events:none（結算慣例），
        //   真實點擊會穿透對話框落在立繪/舞台上，再冒泡到 stage——掛 bubble 永遠收不到。
        const stage=$('inspectorStage') || bubble;
        const onTap=()=>{
          stage.removeEventListener('pointerup', onTap);
          if(state.resultMode!=='tutorial-home') return;
          bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
          clearTimeout(_inspTypeTimer);
          if(lineEl) typeInspectorLine(lineEl, tr.outro, 2000);
        };
        stage.addEventListener('pointerup', onTap);
      }, 2100);
    }
  }, 1400);
}

/* ============================================================================
 *  Boss 戰 S 級獎勵演出：銭湯インストール
 *  ---------------------------------------------------------------------------
 *  全圖（2/3 框完整顯示）→ 左上白牆毛筆橫排兩行（config intruder.reward.sign，
 *  「銭湯」＋「INSTALL」，逐字由左往右「寫」出）→ 寫完ツケ板（拍子木）兩聲 → 顯示返回提示，
 *  點畫面任意處回首頁。演出中（done 前）點擊無效，避免誤觸跳過。
 * ========================================================================== */
let _sentouTimer=null, _sentouBannerTimer=null, _sentouBound=false, _sentouLeaving=false;
function openSentouReward(){
  const ov=$('sentouReward');
  if(!ov) return;
  const rw=(GAME_CONFIG.intruder && GAME_CONFIG.intruder.reward) || {};
  SFX.stopBgm(800);   // 靜場：墨與拍子木的留白
  const img=$('sentouImg');
  const src=asset(rw.image);
  if(img && src) img.src=src;
  // 建字：每行一個 .sentou-col、每字一個 <i>，動畫延遲逐字排 → 毛筆逐字寫出
  const sign=$('sentouSign');
  const per=rw.charMs || 380;
  let idx=0;
  sign.innerHTML='';
  (rw.sign || ['銭湯','インストール']).forEach(txt=>{
    const col=document.createElement('span'); col.className='sentou-col';
    [...txt].forEach(ch=>{
      const s=document.createElement('i'); s.textContent=ch;
      s.style.animationDelay=(600 + idx*per)+'ms';   // 進場淡入 0.6s 後起筆
      idx++;
      col.appendChild(s);
    });
    sign.appendChild(col);
  });
  if(!_sentouBound){
    _sentouBound=true;
    ov.addEventListener('click', ()=>{
      if(!ov.classList.contains('done') || _sentouLeaving) return;   // 寫完+響板前不可離開；防連點重入
      _sentouLeaving=true;
      api.goHome();   // 獎勵畫面續留原地，待 goHome 黑幕全蓋後（mid）才收——立即收會露出底下戰鬥畫面
    });
  }
  _sentouLeaving=false;
  ov.classList.remove('done');
  ov.classList.add('on');
  // 收結算畫面：待獎勵層淡入（sentouIn .8s）完全遮蓋後才收。
  // 立即收會在淡入期間透出底下凍結的戰鬥畫面（banner 之下即戰場）。
  clearTimeout(_sentouBannerTimer);
  _sentouBannerTimer=setTimeout(()=>{ $('banner').classList.remove('on'); }, 850);
  clearTimeout(_sentouTimer);
  _sentouTimer=setTimeout(()=>{
    SFX.tsuke();                // 寫完 → ツケ板兩聲（チョン、チョン）
    ov.classList.add('done');   // 響板起 → 顯示「點擊返回」
  }, 600 + idx*per + 420);
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
  clearTimeout(_resultAutoTimer);   // 玩家有操作 → 取消自動回首頁
  if(state.resultMode==='tutorial-leaving') return;   // 教學結算離場中：防連點重入
  if(state.resultMode==='tutorial-home'){   // 教學戰結算：「回到主畫面」→ 監察官補一句 → 回首頁
    const tr=(GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.result) || {};
    state.resultMode='tutorial-leaving';
    SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
    const bubble=$('inspectorBubble'), lineEl=$('inspectorLine');
    if(bubble){ bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show'); }
    clearTimeout(_inspTypeTimer);
    if(lineEl) typeInspectorLine(lineEl, tr.buttonLine || '期待你的表現。', 900);
    setTimeout(()=>{ state.tutorialRun=false; api.goHome(); }, 1600);   // 補完一句才離場
    return;
  }
  if(state.resultMode==='sentou-offer'){   // Boss S 級第一按：「再度執槍」原地變身（金色呼吸光）
    SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));   // 神楽鈴（StartBT_SE，與出陣鈕同）
    state.resultMode='sentou';
    const rw=(GAME_CONFIG.intruder && GAME_CONFIG.intruder.reward) || {};
    rbtn.textContent = rw.btnLabel || 'SAINT INSTALL...?';
    rbtn.classList.add('saintinstall');
    return;
  }
  if(state.resultMode==='sentou'){   // 第二按：SAINT INSTALL...? → 銭湯インストール獎勵畫面
    openSentouReward();
    return;
  }
  if(state.resultMode==='intercept'){
    SFX.gunshot();   // 迎擊：普攻槍聲（setShots 候選，同盤面射擊）
    api.triggerIntruder();
    return;
  }
  // resultMode==='rematch'（一般的再度執槍）：Start_01
  SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
  if(!state.sRankUnlocked){
    api.goHome();               // 一律回首頁（含 Boss 戰勝/敗後）
    return;
  }
  // S 評價：解鎖迎擊流程（唯一例外）
  SFX.playBgm(asset('bgm_boss'), { volume: bgmVol('bgm_boss') });   // 按下再度執槍瞬間 → Boss BGM 起播（結算 BGM 淡出）
  state.intruderTriggered=true;  // 標記本場已進入隱藏流程
  // 用 visibility 而非 display：保留按鈕版位，避免 flex 重排讓立繪（flex:1 舞台）忽大忽小
  rbtn.style.visibility='hidden';
  const insp=getInspector();
  const bubble=$('inspectorBubble');
  const lineEl=$('inspectorLine');
  // 芙蕾雅重跳一次對話框：「慢著！有新的敵人！」
  bubble.classList.remove('show'); void bubble.offsetWidth;
  clearTimeout(_inspTypeTimer);
  lineEl.textContent='';
  bubble.classList.add('show');
  const warnLine = (insp && insp.interceptLine) || L.inspector.interceptLine;
  typeInspectorLine(lineEl, warnLine, 1400);
  // 台詞跳完 → 鈕變「迎擊」、變色發光
  const dur = 1400 + 300;
  setTimeout(()=>{
    state.resultMode='intercept';
    rbtn.textContent=L.result.intercept;
    rbtn.classList.add('intercept','ready');
    rbtn.style.visibility='';   // 復現（版位一直在，無重排 → 立繪不變大小）
  }, dur);
}

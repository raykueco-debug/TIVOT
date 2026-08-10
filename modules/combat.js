/* ============================================================================
 *  modules/combat.js — 戰鬥核心 / 唯一協調者
 *  ---------------------------------------------------------------------------
 *  職責：Schulte 盤面生成/切換、tap 判定（按對/按錯）、逐格計時與延時懲罰、
 *    combo 傷害計算、聖能累積、血條/敵血更新、五盤流程到 win/lose 調度。
 *    combat 是唯一協調者：import 並調度 enemy / defense / weapon / partner；
 *    對 defense / weapon 以「注入 api」的方式回呼（避免它們反向 import combat）。
 *
 *  狀態擁有者：3.1 戰鬥核心、3.2 生命/敵我、3.8 增益（見 state.js）。
 *    所有數值一律讀 config，不寫死。
 *
 *  ⚠ 本輪範圍：一般怪 faceless 一場能打完並進結算。聖徒化 / 雙槍 / 評價細節
 *    與監察官結算為下一輪；相關分支以 TODO 標註、以最小佔位不影響本輪流程。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';
import { state } from '../state.js';
import { SFX } from '../audio.js';
import * as enemy from './enemy.js';
import * as defense from './defense.js';
import * as weapon from './weapon.js';
import { tryDeathGuard } from './partner.js';

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;
const BOARDS = GAME_CONFIG.boards;

// 數值一律讀 config
const DMG_BASE=T.dmgBase, DMG_PER_COMBO=T.dmgPerCombo, DMG_COMBO_CAP=T.dmgComboCap;
const ENERGY_PER_HIT=T.energyPerHit;
const DMG_WRONG=T.dmgWrong, DMG_HEAVY=T.dmgHeavy, DMG_DELAY=T.dmgDelay;
const ATK_BUFF_SECONDS=T.atkBuffSeconds;
const CLASP_LEN=110;

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ============================================================================
 *  啟動：注入 api 與開機閒置畫面（由 main.js 調度）
 * ========================================================================== */
export function setup(){
  // combat 把自己擁有的狀態變動原語注入下游模組，切斷反向依賴
  defense.init({ enemyAttack, enemyDamage, floatDmg, triggerAtkBuff, weaponCounter: weapon.weaponCounter });
  weapon.init({ enemyDamage, floatDmg });
}
export function bootIdle(){
  // 開機停在首頁：先建立盤面/血條供背景顯示，但 over=true 讓計時與敵人不啟動
  enemy.applyConfigToDOM();
  state.over=true;
  loadBoard(0); updateBars();
  $('home').classList.add('on');
}

/* ============================================================================
 *  盤面
 * ========================================================================== */
export function goNextBoard(){
  if(state.over) return;
  const nextIdx=state.boardIndex+1;
  state.transitioning=true;
  stopIntervalTimer();
  const t=$('transition'), txt=$('transText');
  txt.textContent='RELOADING';
  t.classList.add('on');
  txt.style.animation='none'; void txt.offsetWidth; txt.style.animation='';
  setTimeout(()=>{
    if(state.over) return;
    t.classList.remove('on');
    state.transitioning=false;
    loadBoard(nextIdx);
  }, 900);   // 轉場緩衝：讓手停一下、看清新盤面
}
// 決定第 idx 盤（0-based）的格數：① 該怪 boardGrids[idx] 覆寫 → ② 第三盤(idx>=2)起 16 格。
function boardGridFor(idx){
  const en=GAME_CONFIG.enemies[state.currentEnemyKey];
  const bg=en && en.boardGrids;
  const baseBoard=BOARDS[idx]||BOARDS[BOARDS.length-1];
  let grid=(bg && bg[idx]!=null) ? bg[idx] : (idx>=2 ? 16 : baseBoard.grid);
  let cols=Math.round(Math.sqrt(grid));
  if(cols*cols!==grid){ grid=baseBoard.grid; cols=baseBoard.cols; }
  return { grid, cols };
}
export function loadBoard(idx){
  state.boardIndex=idx;
  const g=boardGridFor(idx); state.N=g.grid; state.cols=g.cols;
  state.intervalLimit=(BOARDS[idx]||BOARDS[BOARDS.length-1]).interval;
  state.boardStartTime=Date.now();
  state.boardClean=true;
  buildGrid();
  startIntervalTimer();
  defense.scheduleOpeningUlt();   // 開場保證：每盤 3 秒內敵方就發動大絕
  updateStatus();
}
function buildGrid(){
  const grid=$('grid'); grid.innerHTML=''; state.cells=[];
  grid.style.gridTemplateColumns=`repeat(${state.cols},1fr)`;
  grid.style.gridTemplateRows=`repeat(${state.cols},1fr)`;
  const fs=state.N<=9?30:24;
  state.order=shuffle([...Array(state.N)].map((_,i)=>i+1));
  state.order.forEach(num=>{
    const c=document.createElement('div');
    c.className='cell'; c.textContent=num; c.dataset.num=num; c.style.fontSize=fs+'px';
    let handled=false;
    c.addEventListener('touchstart',e=>{e.preventDefault();handled=true;tap(num,c,e);},{passive:false});
    c.addEventListener('click',e=>{if(handled){handled=false;return;}tap(num,c,e);});
    grid.appendChild(c); state.cells.push(c);
  });
  state.expect=1; markNext();
  fitGridSquare();
}
export function fitGridSquare(){
  const wrap=$('gridWrap'); if(!wrap) return;
  const side=Math.min(wrap.clientWidth, wrap.clientHeight);
  const grid=$('grid');
  grid.style.width=side+'px';
  grid.style.height=side+'px';
}
function markNext(){
  state.cells.forEach(c=>c.classList.remove('next'));
  if(state.saintMode){   // 聖徒化：只提示第一格（本輪聖徒化未接，saintMode 恆 false）
    if(state.expect!==1) return;
    const c0=state.cells.find(c=>+c.dataset.num===state.expect);
    if(c0) c0.classList.add('next');
    return;
  }
  if(!(BOARDS[state.boardIndex]||BOARDS[BOARDS.length-1]).hint) return;
  const c=state.cells.find(c=>+c.dataset.num===state.expect);
  if(c) c.classList.add('next');
}

/* ============================================================================
 *  點擊判定
 * ========================================================================== */
function tap(num,cell,e){
  if(state.over||state.transitioning||state.cutinPlaying) return;   // 轉場/cut-in 期間不可點
  SFX.unlock();                     // iOS：首次觸控解鎖音訊
  enemy.ejectShell(cell);           // 每次點擊都彈殼
  gunHitOnEnemy(cell);              // 槍擊特效映射到敵人對應位置

  // 下一輪接：聖徒化 / 雙槍點擊分支（本輪 saintMode / dualWield 恆 false，不會進入）
  if(state.saintMode){ return; }    // TODO(next/saint)：聖徒化依序點擊 16 格、受擊推進倒數槽
  if(state.dualWield){ return; }    // TODO(next/weapon)：雙槍無視順序快速清盤

  if(num===state.expect){
    SFX.gunshot(false);            // 普通開槍：重「碰」
    cell.classList.add('done'); cell.classList.remove('next'); enemy.shatterCell(cell);
    state.combo++; resetIntervalDeadline(); addEnergy(ENERGY_PER_HIT);
    let dmg=hitDamage(); if(state.atkBuff) dmg*=2;
    enemyDamage(Math.round(dmg),false);   // 點擊直接扣敵血
    state.expect++;
    if(state.expect>state.N) clearBoard(); else markNext();
    updateStatus();
  }else{
    // Overkill 期間（敵HP已歸零）按錯 → 結束 overkill，立即清盤結算
    if(state.enemyHp<=0){
      SFX.clear();
      clearAtkBuff();
      win();
      return;
    }
    // 按錯：紅字期間按錯 → 重擊且紅字消失；否則普通按錯
    state.boardClean=false;
    cell.classList.add('wrong'); setTimeout(()=>cell.classList.remove('wrong'),300);
    state.combo=0;
    if(state.threats.length){
      defense.clearThreat();          // 攻擊點消失，不能再補救
      enemyAttack(Math.max(1, Math.round(DMG_HEAVY*state.WRONG_PENALTY_SCALE)), 'wrong');
    }else{
      SFX.wrong();
      enemyAttack(Math.max(1, Math.round(DMG_WRONG*state.WRONG_PENALTY_SCALE)), 'wrong');
    }
    resetIntervalDeadline(); updateStatus();
  }
}

function clearAtkBuff(){
  state.atkBuff=false; clearTimeout(state.atkBuffTimer);
  $('grid').classList.remove('buffed');
}
function triggerAtkBuff(sec){
  state.atkBuff=true;
  $('grid').classList.add('buffed');
  clearTimeout(state.atkBuffTimer);
  state.atkBuffTimer=setTimeout(()=>{
    state.atkBuff=false; $('grid').classList.remove('buffed'); updateStatus();
  }, (sec||ATK_BUFF_SECONDS)*1000);
  updateStatus();
}

function clearBoard(){
  SFX.clear();                      // 清盤：神聖鈴響
  clearAtkBuff();                   // 攻擊加倍 buff 不跨盤
  const elapsed=(Date.now()-state.boardStartTime)/1000;
  recordBoardTime(elapsed);
  // 清盤 bonus 聖能：僅在本盤全程無出錯、未受擊時給予（依清盤速度）
  if(state.boardClean){
    const ideal=state.N*0.45;
    const speed=Math.max(0.4, Math.min(1.6, ideal/Math.max(elapsed,0.1)));
    const gain=Math.round(state.N*1.8*speed);
    addEnergy(gain);
    floatDmg('完美清盤 +'+gain,'50%','30%',false);
  }
  if(state.enemyHp<=0){ win(); return; }   // 敵HP已歸零 → 本盤清完即結算勝利
  defense.resetEnemyTimers();   // 清盤瞬間即重置敵大絕與延遲懲罰（間隔懲罰由 loadBoard 重置）
  goNextBoard();
}
function recordBoardTime(sec){
  state.boardsCompleted++;
  state.boardTimes.push(sec);
}

/* ============================================================================
 *  打擊 / 傷害
 * ========================================================================== */
// 槍擊命中敵人：格子在盤面的相對位置 → 映射到敵人圖對應位置
function gunHitOnEnemy(cell){
  const fxTop=$('fxTop');
  const gr=$('grid').getBoundingClientRect();
  const cr=cell.getBoundingClientRect();
  const relX=(cr.left+cr.width/2 - gr.left)/gr.width;
  const relY=(cr.top+cr.height/2 - gr.top)/gr.height;
  const top=$('top').getBoundingClientRect();
  const px=relX*top.width;
  const py=(0.2+relY*0.6)*top.height;
  const m=document.createElement('div'); m.className='muzzle';
  m.style.left=px+'px'; m.style.top=py+'px'; fxTop.appendChild(m);
  setTimeout(()=>m.remove(),200);
  for(let i=0;i<4;i++){
    const s=document.createElement('div'); s.className='spark';
    s.style.left=px+'px'; s.style.top=py+'px';
    s.style.transform=`rotate(${Math.random()*360}deg)`;
    fxTop.appendChild(s); setTimeout(()=>s.remove(),260);
  }
}
function hitDamage(){
  const c=Math.min(state.combo,DMG_COMBO_CAP);
  return DMG_BASE + c*DMG_PER_COMBO;
}
function floatDmg(txt,left,top,crit,extraClass){
  const d=document.createElement('div');
  d.className='dmgnum'+(crit?' critnum':'')+(extraClass?' '+extraClass:''); d.textContent=txt;
  d.style.left=left; d.style.top=top; $('fxTop').appendChild(d);
  setTimeout(()=>d.remove(),700);
}
// 被攻擊：扣玩家血 + 受擊特效 + 震動（saintMode 分支下一輪接）
function enemyAttack(dmg, kind, saintAmt){
  if(state.over) return;
  if(state.saintMode){
    // TODO(next/saint)：聖徒化期間敵攻擊不扣血，改推進倒數槽（+shake/受擊特效/紅閃/saintAdvance）。
    //   本輪聖徒化未接，saintMode 恆為 false，不會進入此分支。
    return;
  }
  SFX.hit();                         // 受擊撞擊音
  state.boardClean=false;            // 受擊 → 本盤取消清盤破防獎勵
  state.flawlessRun=false;           // 真實受擊 → 整場無傷旗標取消
  state.playerHp=Math.max(0,state.playerHp-dmg);
  updateBars();
  enemy.showHitFx(kind);             // 依 kind 播放該怪對應受擊特效
  $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
  $('enemyImg').classList.add('shake'); setTimeout(()=>$('enemyImg').classList.remove('shake'),300);
  if(state.playerHp<=0){
    if(tryDeathGuard()) return;      // 即死防禦（本輪固定不擋 → 直接 lose）
    lose();
  }
}
// 對敵造成傷害（含 overkill / 擊殺凍結計時）
function enemyDamage(dmg,isCrit,silent){
  if(dmg>0){
    if(state.enemyHp>0){
      const after=state.enemyHp-dmg;
      if(after<0) state.overkill+=(-after);
      state.enemyHp=Math.max(0,after);
      updateBars();
      if(!silent) floatDmg((isCrit?'暴擊 ':'')+dmg, (30+Math.random()*40)+'%','35%',isCrit);
      if(state.enemyHp<=0){
        if(state.killTime===0) state.killTime=Date.now();   // 凍結計時：OVERKILL 期間不計入總用時
        defense.killThreatSchedule(); clearAtkBuff();
        floatDmg('OVERKILL！','50%','48%',true);
      }
    }else{
      state.overkill+=dmg;
      floatDmg('OVERKILL +'+dmg, (30+Math.random()*40)+'%','35%',true);
    }
  }
  $('enemyImg').classList.add('hit'); setTimeout(()=>$('enemyImg').classList.remove('hit'),80);
}

/* ============================================================================
 *  聖能（本輪只累積與 C 字計量表視覺；雙槍發動下一輪接）
 * ========================================================================== */
function addEnergy(v){
  if(state.saintMode) return;        // 聖徒化期間不累積破防值
  state.energy=Math.min(100,state.energy+v);
  updateEnergyClasp();
}
function updateEnergyClasp(){
  const fill=$('energyClaspFill');
  if(fill){
    const total=fill.getTotalLength ? fill.getTotalLength() : CLASP_LEN;
    fill.style.strokeDasharray=total;
    fill.style.strokeDashoffset=total*(1-state.energy/100);
  }
  $('energyClasp').classList.toggle('full', state.energy>=100);
}

/* ============================================================================
 *  間隔時限（逐格延時懲罰）
 * ========================================================================== */
function startIntervalTimer(){
  clearInterval(state.intervalTimer);
  state.intervalDeadline=Date.now()+effIntervalLimit()*1000;
  state.intervalTimer=setInterval(()=>{
    if(state.over){clearInterval(state.intervalTimer);return;}
    if(state.saintMode||state.cutinPlaying){resetIntervalDeadline();return;}   // 聖徒化/演出中不受間隔壓力
    if(Date.now()>=state.intervalDeadline){
      state.combo=0;
      // 延時懲罰傷害＝一般怪基礎 × 該怪 DELAY_PENALTY_SCALE（Boss=0.5）；時限已由 effIntervalLimit 減
      if(state.enemyHp>0){ enemyAttack(Math.max(1, Math.round(DMG_DELAY*state.DELAY_PENALTY_SCALE)), 'delay'); floatDmg('太慢','60%','55%',false); }
      updateStatus(); resetIntervalDeadline();
    }
  },80);
}
// 本盤實際延時時限＝盤面 intervalLimit + 該怪 DELAY_TIME_DELTA（Boss=-1）。下限 0.6 秒防呆。
function effIntervalLimit(){ return Math.max(0.6, state.intervalLimit + state.DELAY_TIME_DELTA); }
function resetIntervalDeadline(){ state.intervalDeadline=Date.now()+effIntervalLimit()*1000; }
function stopIntervalTimer(){ clearInterval(state.intervalTimer); }

/* ============================================================================
 *  UI
 * ========================================================================== */
function updateBars(){
  const eh=Math.max(0,state.enemyHp), ph=Math.max(0,state.playerHp);
  $('enemyHp').style.width=(eh/state.enemyMax*100)+'%';
  $('enemyHpNum').textContent=Math.round(eh)+' / '+state.enemyMax;
  $('playerHp').style.width=(ph/state.playerMax*100)+'%';
  $('playerHpNum').textContent=Math.round(ph)+' / '+state.playerMax;
  updateEnergyClasp();
}
function updateStatus(){ /* 狀態列已移出畫面（下半為純數字盤），保留為相容呼叫 */ }

/* ============================================================================
 *  勝負 / 結算（本輪為最小結算面板；評價與監察官下一輪接）
 * ========================================================================== */
function stopAll(){
  clearInterval(state.intervalTimer);
  clearTimeout(state.atkBuffTimer);
  defense.stopAll();
  // saintTimer / saintReactTimer / dualTimer 下一輪接（本輪未使用）
}
function fmtTime(sec){
  if(sec==null || !isFinite(sec)) return '--';
  const m=Math.floor(sec/60), s=sec-m*60;
  return m>0 ? `${m}分${s.toFixed(1)}秒` : `${s.toFixed(1)}秒`;
}
function win(){
  if(state.over) return;
  state.over=true; stopAll();
  const endTime=state.killTime || Date.now();
  const totalTime=(endTime-state.runStartTime)/1000;
  const counted=state.boardTimes.slice(2);   // 平均只計第三盤後
  const avg=counted.length ? counted.reduce((a,b)=>a+b,0)/counted.length : null;
  let sub=(($('enemyName')&&$('enemyName').textContent)||'目標')+'已淨化';
  if(state.overkill>0) sub += ` · OVERKILL ${Math.round(state.overkill)}`;
  let rows='';
  rows+=`<div class="row"><span>每盤平均用時</span><b>${fmtTime(avg)}</b></div>`;
  rows+=`<div class="row"><span>總用時</span><b>${fmtTime(totalTime)}</b></div>`;
  rows+=`<div class="row"><span>Counter 反擊</span><b>${state.counterCount} 次 · ${state.counterDamage} 傷</b></div>`;
  rows+=`<div class="row"><span>完美防禦</span><b>${state.perfectCount} 次</b></div>`;
  rows+=`<div class="row" style="opacity:.6;font-size:11px"><span>（評價 / 監察官結算下一輪接）</span><b></b></div>`;
  showResult('聖裁完成', sub, rows, false);
}
function lose(){
  if(state.over) return;
  state.over=true; stopAll();
  const rows=`<div class="row"><span>Counter 反擊</span><b>${state.counterCount} 次 · ${state.counterDamage} 傷</b></div>`
            +`<div class="row"><span>完美防禦</span><b>${state.perfectCount} 次</b></div>`;
  showResult('聖光黯滅','HUND 倒下了…', rows, true);
}
// 最小結算面板（取代下一輪的 showResultSequence；不跑監察官立繪/打字機/評價）
function showResult(title, sub, statsHtml, isLose){
  const b=$('banner');
  state.resultMode='rematch';
  const rbtn=$('rematchBtn');
  rbtn.textContent='再度執槍'; rbtn.classList.remove('intercept','ready'); rbtn.style.display='';
  $('bannerTitle').textContent=title;
  $('bannerSub').textContent=sub;
  $('resultStats').innerHTML=statsHtml||'';
  $('inspectorStage').style.display='none';   // 監察官結算下一輪接
  b.classList.toggle('lose', !!isLose);
  b.classList.remove('seq');
  b.classList.add('on');
}

/* ============================================================================
 *  流程進出
 * ========================================================================== */
export function startGame(){
  state.over=false; state.combo=0; state.energy=0; state.expect=1; state.boardIndex=0;
  state.saintMode=false; state.saintUsedThisBattle=false; state.atkBuff=false;
  state.overkill=0; state.killTime=0; state.transitioning=false;
  state.counterCount=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false;
  state.playerHp=state.playerMax; state.enemyHp=state.enemyMax;
  state.N=9; state.cols=3;
  state.runStartTime=Date.now();
  state.boardTimes=[]; state.boardsCompleted=0;
  state.flawlessRun=true; state.intruderTriggered=false; state.inIntruderFight=false;
  state.deathGuardUsed=false; state.sRankUnlocked=false; state.resultMode='rematch';
  state.enemyAtkSuppressUntil=0;
  enemy.setEnemy(GAME_CONFIG.currentEnemy);
  $('home').classList.remove('on');
  $('banner').classList.remove('on'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert');
  state.cutinPlaying=false;
  stopAll();
  loadBoard(0); updateBars();
}
export function goHome(){
  state.over=true; stopAll();
  $('banner').classList.remove('on'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('home').classList.add('on');
}

/* ---- 測試用「清盤」鈕：依當前應點順序逐格模擬點擊，把盤面清空走 clearBoard ---- */
export function testClearBoard(){
  if(state.over||state.transitioning||state.cutinPlaying) return;
  let guard=0;
  while(!state.over && state.cells.length && guard++ < 200){
    if(state.cells.every(c=>c.classList.contains('done'))) break;
    let target=null;
    if(state.saintMode || !state.dualWield){
      target=state.cells.find(c=>+c.dataset.num===state.expect && !c.classList.contains('done'));
    }
    if(!target){ target=state.cells.find(c=>!c.classList.contains('done')); }
    if(!target) break;
    const before=state.expect, beforeDone=state.cells.filter(c=>c.classList.contains('done')).length;
    tap(+target.dataset.num, target);
    const afterDone=state.cells.filter(c=>c.classList.contains('done')).length;
    if(afterDone===beforeDone && state.expect===before){
      const fix=state.cells.find(c=>+c.dataset.num===state.expect && !c.classList.contains('done'));
      if(fix && fix!==target){ tap(+fix.dataset.num, fix); } else break;
    }
  }
}

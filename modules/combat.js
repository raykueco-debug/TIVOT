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

import { GAME_CONFIG, asset } from '../config.js';
import { state } from '../state.js';
import { SFX } from '../audio.js';
import * as enemy from './enemy.js';
import * as defense from './defense.js';
import * as weapon from './weapon.js';
import * as saint from './saint.js';
import * as partner from './partner.js';
import * as inspector from './inspector.js';
import { playTransition } from './transition.js';   // 過渡禎（勝利進結算前的「驅逐完成」）

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;
const BOARDS = GAME_CONFIG.boards;

// 數值一律讀 config
const DMG_BASE=T.dmgBase, DMG_PER_COMBO=T.dmgPerCombo, DMG_COMBO_CAP=T.dmgComboCap;
const ENERGY_PER_HIT=T.energyPerHit;
const CRIT_BASE_RATE=T.critBaseRate, CRIT_PER_COMBO=T.critPerCombo;      // 普攻暴擊率＝base + critCombo*per
const CRIT_DMG_BASE=T.critDmgBase, CRIT_DMG_PER_COMBO=T.critDmgPerCombo; // 普攻暴擊加傷＝base + critCombo*per
const DMG_WRONG=T.dmgWrong, DMG_HEAVY=T.dmgHeavy, DMG_DELAY=T.dmgDelay;
const DMG_DUAL_MULT=T.dmgDualMult;                   // 雙槍破防窗口點擊傷害倍率（<1＝安全牌）
const ATK_BUFF_SECONDS=T.atkBuffSeconds;
const SAINT_ADVANCE_DIVISOR=T.saintAdvanceDivisor;   // 聖徒化一次「受擊」推進量＝playerMax/此值
const CLASP_LEN=110;

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ============================================================================
 *  啟動：注入 api 與開機閒置畫面（由 main.js 調度）
 * ========================================================================== */
export function setup(){
  // combat 把自己擁有的狀態變動原語注入下游模組，切斷反向依賴
  defense.init({ enemyAttack, enemyDamage, floatDmg, triggerAtkBuff, weaponCounter: weapon.weaponCounter });
  // 武器：反擊演算所需（enemyDamage/floatDmg）+ 雙槍破防窗口所需（cut-in/敵計時/盤面/破防值歸零）。
  weapon.init({
    enemyDamage, floatDmg,
    playCutin: saint.playCutin,
    resetEnemyTimers: defense.resetEnemyTimers,
    scheduleUlt: defense.scheduleUlt,
    markNext, buildGrid, resetEnergy,
  });
  // 聖徒化：combat 為協調者，把 combat/defense/partner 的原語打包注入 saint，
  //   saint 不直接 import 其他業務模組（維持 §2 依賴方向）。改血一律走本檔 HP API（Part A）。
  saint.init({
    // 統一改血 API（Part A）
    healPlayer, setPlayerHpRatio,
    // combat 盤面/傷害/UI 原語
    buildGrid, updateBars, startIntervalTimer, resetIntervalDeadline,
    hitDamage, enemyDamage, floatDmg, markNext, setBoard, resetEnergy,
    onEnemyDefeated: finishEnemyOrAdvance,   // 聖徒化擊殺 → 轉下一敵 or（最後一敵）結算（連戰）
    shatterCell: enemy.shatterCell,
    // defense 原語（combat 代為轉交；大絕頻率經 setUltRate 擁有者管道）
    scheduleUlt: defense.scheduleUlt, clearThreat: defense.clearThreat,
    endCharge: defense.endCharge, resetEnemyTimers: defense.resetEnemyTimers,
    setUltRate: defense.setUltRate,
    // 計時碼表：cut-in 演出期間暫停（playCutin/playSaintCutin 開頭呼叫），維持「非可點不計時」
    clockPause,
  });
  // 搭檔：combat 注入被動技所需原語 + 主動技各 handler 的分域 api。
  //   被動（即死防禦）：updateBars / floatDmg / resetEnemyTimers / scheduleUlt / playCutin。
  //   主動 saintApi（生命歸還）：saint 的中止+保血執行體。partner 不反向 import，一律經此注入。
  partner.init({
    updateBars, floatDmg,
    resetEnemyTimers: defense.resetEnemyTimers,
    scheduleUlt: defense.scheduleUlt,
    playCutin: saint.playCutin,
    saintApi: { lifeReturnAbort: saint.lifeReturnAbort },
  });
  // 監察官（評價/結算）：combat 擁有計時 → 算好 totalTime/avg 呼叫 inspector.settle。
  //   inspector 只 import state/config；goHome（combat）與 triggerIntruder（enemy）經此注入。
  inspector.init({ goHome, triggerIntruder: enemy.triggerIntruder });
  // 敵人：Boss 亂入的戰鬥重置（startIntruderFight，combat 擁有）+ 換敵刷血條（updateBars）注入。
  enemy.init({ startIntruderFight, updateBars });
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
  clockPause();                // 盤面轉場（RELOADING）不計時
  stopIntervalTimer();
  const t=$('transition'), txt=$('transText');
  txt.textContent='RELOADING';
  SFX.play(asset('sfx_reload'));   // 清盤換彈音（RELOADING 顯示時）
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
  state.critCombo=0;              // 暴擊連擊為「盤內連續」：新盤（含清盤後換盤/換敵）歸零＝「清盤中斷」
  buildGrid();
  startIntervalTimer();
  clockResume();                  // 新盤載好、可點 → 碼表起算（開場/換盤/換敵首盤共用）
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
  clockResume();                    // 盤面可點 → 碼表起算（冪等；overkill 時因 enemyHp<=0 不起算）
  SFX.unlock();                     // iOS：首次觸控解鎖音訊
  enemy.ejectShell(cell);           // 每次點擊都彈殼
  gunHitOnEnemy(cell);              // 槍擊特效映射到敵人對應位置

  // 聖徒化：依序點擊 16 格、受擊推進倒數槽（combat 於期間讓出主迴圈，交由 saint 驅動盤面游標）。
  if(state.saintMode){ saint.saintTap(num, cell); updateStatus(); return; }

  // 雙槍破防（獎勵射擊窗口）：無視順序、點掉的格移除不可重點、快速清盤（降攻安全牌，不吃暴擊/atkBuff）。
  //   注意：雙槍清盤走自己的收尾（不走 clearBoard、不給完美清盤 bonus）。
  if(state.dualWield){
    if(cell.classList.contains('done')) return;
    cell.classList.add('done'); enemy.shatterCell(cell);
    state.combo++; if(state.combo>state.maxCombo) state.maxCombo=state.combo;
    resetIntervalDeadline();
    const dmg=hitDamage()*DMG_DUAL_MULT;
    SFX.gunshot(true);
    enemyDamage(Math.round(dmg), false);
    if(state.cells.every(c=>c.classList.contains('done'))){
      SFX.clear(); clearAtkBuff(); weapon.endDual();
      recordBoardTime((Date.now()-state.boardStartTime)/1000);
      if(state.enemyHp<=0){ finishEnemyOrAdvance(); return; }   // 敵死→轉下一敵 or 結算
      defense.resetEnemyTimers();   // 破防清盤瞬間即重置敵大絕與延遲懲罰
      goNextBoard();
    }
    updateStatus();
    return;
  }

  if(num===state.expect){
    SFX.gunshot(false);            // 普通開槍：重「碰」
    cell.classList.add('done'); cell.classList.remove('next'); enemy.shatterCell(cell);
    state.combo++; if(state.combo>state.maxCombo) state.maxCombo=state.combo;
    state.correctTaps++;                 // 命中率分子（依序正確點擊）
    resetIntervalDeadline(); addEnergy(ENERGY_PER_HIT);
    let dmg=hitDamage(); if(state.atkBuff) dmg*=2;
    // 暴擊（普攻）：此分支必為普攻（雙槍破防走上面獨立分支，本輪 saintMode 亦 return），暴擊率/加傷隨 critCombo 成長。
    //   本擊先以「現值」擲骰再 +1（首擊＝base 暴擊率）；命中則跳紅字「暴擊」（交由 enemyDamage 的 isCrit 呈現）。
    let crit=false;
    const cc=state.critCombo;
    if(Math.random() < CRIT_BASE_RATE + cc*CRIT_PER_COMBO){
      crit=true; dmg*=(1 + CRIT_DMG_BASE + cc*CRIT_DMG_PER_COMBO);
    }
    state.critCombo++;
    enemyDamage(Math.round(dmg),crit);   // 點擊直接扣敵血（crit=true → 敵區跳紅字「暴擊」）
    state.expect++;
    if(state.expect>state.N) clearBoard(); else markNext();
    updateStatus();
  }else{
    // Overkill 期間（敵HP已歸零）按錯 → 結束 overkill → 轉下一敵 or 結算
    if(state.enemyHp<=0){
      SFX.clear();
      clearAtkBuff();
      finishEnemyOrAdvance();
      return;
    }
    // 按錯：紅字期間按錯 → 重擊且紅字消失；否則普通按錯
    state.boardClean=false;
    state.wrongTaps++;                    // 命中率分母（按錯格）
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
  if(state.enemyHp<=0){ finishEnemyOrAdvance(); return; }   // 敵死 → 轉下一敵 or（最後一敵）結算
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
  // 敵攻擊音：依 kind 播該怪對應音（ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。
  const sk = state.curEnemySound && state.curEnemySound[kind];
  if(sk) SFX.play(asset(sk));
  if(state.saintMode){
    // 聖徒化期間敵攻擊不扣血：改推進倒數槽（推滿＝OBE）。視覺（震動/受擊特效/紅閃）留在 combat，
    //   倒數槽推進交由 saint.saintAdvance（內部走 HP API healPlayer，滿則觸發 OBE）。
    //   推進量：一般受擊＝playerMax/SAINT_ADVANCE_DIVISOR（≈+1s）；格擋由呼叫端傳 saintAmt（≈+0.5s）。
    const amt=(saintAmt!=null)?saintAmt:(state.playerMax/SAINT_ADVANCE_DIVISOR);
    $('enemyImg').classList.add('shake'); setTimeout(()=>$('enemyImg').classList.remove('shake'),300);
    enemy.showHitFx(kind);
    $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
    saint.saintAdvance(amt);
    return;
  }
  SFX.hit();                         // 受擊撞擊音
  state.boardClean=false;            // 受擊 → 本盤取消清盤破防獎勵
  state.critCombo=0;                 // 受擊中斷：暴擊連擊歸零（延時懲罰/按錯重擊/大絕/格擋掉血皆經此路徑）
  state.hitsTaken++;                 // 評價受擊數（此路徑＝真實掉血；=0 即無傷 gate）
  state.flawlessRun=false;           // 真實受擊 → 整場無傷旗標取消
  state.playerHp=Math.max(0,state.playerHp-dmg);
  updateBars();
  enemy.showHitFx(kind);             // 依 kind 播放該怪對應受擊特效
  $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
  $('enemyImg').classList.add('shake'); setTimeout(()=>$('enemyImg').classList.remove('shake'),300);
  if(state.playerHp<=0){ handlePlayerLethal(kind); }
}
/* ============================================================================
 *  致死判定鏈（統一入口）
 *  ---------------------------------------------------------------------------
 *  所有會扣玩家血的路徑（挨大絕 / 延時懲罰 / 按錯懲罰 / Defense 格擋）都經 enemyAttack，
 *  故致死判定集中於此單一 choke point。刻意偏離 reference：修正「玩家與敵人 HP
 *  同一攻防瞬間同時歸零時，勝利/overkill 搶先結算蓋掉戰敗」的競態——戰敗一律優先。
 *  （見 DECISIONS.md）
 *
 *  ⚠ 判定點刻意放在「未來即死防禦會插入的位置」：本輪 partner 為佔位、deathGuard
 *    恆不可用，實際行為＝致死即戰敗；下一輪接 partner 時只需讓 tryDeathGuard 回真、
 *    於其內把 playerHp 鎖 1，combat 這裡不必再改。
 * ========================================================================== */
function handlePlayerLethal(){
  // 1) 先問即死防禦（本場未用過才可用）。可用 → 已於 tryDeathGuard 內把 HP 鎖 1、續盤；
  //    這一擊若同時打死敵人＝1 HP 慘勝，照常由 clearBoard/tap 走 win（未上戰敗鎖）。
  if(partner.tryDeathGuard()) return;
  // 2) 不可用 → 戰敗。先上鎖：即使同一瞬間敵人也歸零，win() 一律讓位（戰敗優先）。
  state.defeated = true;
  lose();
}

/* ============================================================================
 *  統一改血 API（Part A · 見 DECISIONS.md D3）
 *  ---------------------------------------------------------------------------
 *  playerHp 的擁有者仍是 combat；任何想改血的系統（聖徒化三結局、回血/緩回血、
 *  吸血反擊、各結局回不同百分比…）一律走這組 API，不得直接寫 state.playerHp。
 *  邊界規則全部集中在此：
 *    · 扣血：唯一入口 enemyAttack → handlePlayerLethal（D1 致死鏈：即死防禦 / 戰敗優先）。
 *            致死只可能發生在扣血路徑，故所有來源都自動受 D1 保護。
 *    · 加血 healPlayer：上限裁切至 playerMax；只增不減，永不致死。
 *    · 設比例 setPlayerHpRatio：夾在 [1, playerMax]（下限 floor 1，故 ratio<=0 → 1 HP）。
 *  唯一契約允許的例外寫入：partner 即死防禦 state.applyDeathGuard()（鎖 1 HP）。
 * ========================================================================== */
// 加血（回血/吸血/緩回血 tick / 聖徒化 saintAdvance 推進都走這）。回傳裁切後的當前血量。
export function healPlayer(amount){
  const add=Math.max(0, amount||0);
  state.playerHp=Math.min(state.playerMax, state.playerHp+add);
  updateBars();
  return state.playerHp;
}
// 把血量設為 playerMax 的某百分比（各結局回血走這）。夾在 [1, playerMax]。回傳結果血量。
export function setPlayerHpRatio(ratio){
  const hp=Math.max(1, Math.min(state.playerMax, Math.round(state.playerMax*ratio)));
  state.playerHp=hp;
  updateBars();
  return state.playerHp;
}
// 設定當前盤面格數（N/cols 為 combat 擁有；聖徒化換 16 宮格 / 收尾還原經此，維持擁有者管道）。
function setBoard(n, cols){ state.N=n; state.cols=cols; }
// 歸零聖能並更新 C 字計量表（聖徒化開場清零破防值；energy 為 combat 擁有）。
function resetEnergy(){ state.energy=0; updateEnergyClasp(); }

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
        if(state.killTime===0) state.killTime=Date.now();   // 敵死標記（OVERKILL 起點）
        clockPause();                                       // 敵死→進 overkill：碼表暫停（overkill 不計時）
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
 *  勝負 / 結算（combat 擁有計時 → 算 totalTime/avg → 交 inspector.settle 演出）
 * ========================================================================== */
function stopAll(){
  clearInterval(state.intervalTimer);
  clearTimeout(state.atkBuffTimer);
  defense.stopAll();
  saint.stopTimers();    // 停聖徒化計時器（saintTimer / saintReactTimer）
  weapon.stopTimers();   // 停雙槍破防計時器（dualTimer）
}

/* ---- 計時碼表（連戰用；規則：只在「盤面可點且非 overkill」時作動）----
 *  clockResume：盤面可點才起算（敵活著、非結算/演出/轉場）。多處呼叫皆冪等（僅在暫停中才起算）。
 *  clockPause ：敵死(overkill)/轉場/cut-in/結算時暫停，把這段併入 runElapsedMs。
 *  clockElapsedMs：目前累計＝已併入 + 進行中的一段。overkill 與轉場自然不計入。 */
function clockResume(){
  if(state.clockRunSince===0 && !state.over && state.enemyHp>0
     && !state.cutinPlaying && !state.transitioning){
    state.clockRunSince=Date.now();
  }
}
function clockPause(){
  if(state.clockRunSince>0){
    state.runElapsedMs += Date.now()-state.clockRunSince;
    state.clockRunSince=0;
  }
}
function clockElapsedMs(){
  return state.runElapsedMs + (state.clockRunSince>0 ? Date.now()-state.clockRunSince : 0);
}
function resetClock(){ state.runElapsedMs=0; state.clockRunSince=0; }

/* ---- 敵死收尾：局內還有下一敵→轉敵、否則→結算 ---- */
function finishEnemyOrAdvance(){
  if(enemy.hasNextInLineup()){ advanceEnemy(); }
  else { win(); }
}
/* ---- 換敵（局內連戰）：延續全場狀態，只換敵＋盤序回 0，敵人區播「前進遭遇」進場 ----
 *  延續（不動）：playerHp/combo/energy(聖能)/counter/perfect/sawExecution/flawlessRun/boardTimes。
 *  只動：overkill 歸零（各敵獨立）、killTime 重置、換敵 config、盤序回 0（各敵跑自己的 boardGrids）。
 *  計時：轉敵全程碼表暫停（transitioning），新敵首盤 loadBoard → clockResume。 */
function advanceEnemy(){
  clockPause();                       // 併入前一敵時間（此前已於敵死暫停，冪等）
  state.runOverkill += state.overkill; // 換敵前把本敵 overkill 併入整場累計（評價/EXP 用）
  state.overkill=0;                   // 各敵 overkill 獨立
  state.transitioning=true;           // 鎖點擊＋碼表不 resume（轉場不計）
  stopIntervalTimer();
  defense.resetEnemyTimers();         // 清前一敵殘留紅點/大絕排程
  enemy.advanceToNextEnemy(()=>{      // 敵人區進場動畫 + 換敵 config + 刷血條
    if(state.over) return;
    state.transitioning=false;
    state.killTime=0;                 // combo/energy/playerHp/計數 皆延續（不在此重置）
    loadBoard(0);                     // 新敵自己的盤序從第 0 盤起（boardGrids[0]=9）；loadBoard 內 clockResume
    updateBars();
  });
}
// 整場敵人總血量（評價時間預算用）：一般連戰＝lineup 各敵 hp 相加；Boss 亂入＝單敵新場（enemyMax）。
//   隨敵人 config 血量自動變動，設計新敵人時評價門檻自動跟著調整（見 config.rating 說明）。
function runTotalHp(){
  if(state.inIntruderFight) return state.enemyMax;
  const lu=(GAME_CONFIG.lineup && GAME_CONFIG.lineup.length) ? GAME_CONFIG.lineup : [state.currentEnemyKey];
  return lu.reduce((sum,key)=>{ const en=GAME_CONFIG.enemies[key]; return sum + (en?en.hp:0); }, 0);
}
function win(){
  if(state.over || state.defeated) return;   // 戰敗優先：已判定戰敗則勝利結算一律讓位
  state.over=true; clockPause(); stopAll();
  const totalTime=clockElapsedMs()/1000;               // 只累計實打時間（overkill/轉場/cut-in 皆不計）
  const totalTaps=state.correctTaps+state.wrongTaps;
  // 評價系統輸入（見 inspector.evaluate）：時間/命中率/連擊/完美反擊/overkill/受擊。
  const stats={
    totalHP: runTotalHp(),
    isBoss: state.inIntruderFight,
    clearTime: totalTime,
    accuracy: totalTaps>0 ? state.correctTaps/totalTaps : 1,   // 0~1 比率（非百分比）
    maxCombo: state.maxCombo,
    perfectCounter: state.counterCount,                        // 完美反擊＝Counter 反擊次數（每次反擊事件 +1）
    counterDamage: state.counterDamage,                        // 反擊累計總傷（結算顯示用）
    overkill: state.runOverkill + state.overkill,              // 整場累計 overkill
    hitsTaken: state.hitsTaken,
  };
  // 勝利 → 先播「驅逐完成」過渡禎，淡出瞬間才建結算面板（僅勝利套用；戰敗 lose() 不套）
  playTransition('finish', ()=> inspector.settle(totalTime, stats, { isLose:false }));
}
function lose(){
  if(state.over) return;
  state.over=true; clockPause(); stopAll();
  // 戰敗 → 先播「驅逐失敗」過渡禎，輕觸後才建戰敗結算（含 Boss 戰戰敗）
  playTransition('fail', ()=> inspector.settle(null, null, { isLose:true }));
}

/* ============================================================================
 *  流程進出
 * ========================================================================== */
export function startGame(){
  state.over=false; state.defeated=false; state.combo=0; state.energy=0; state.expect=1; state.boardIndex=0;
  state.atkBuff=false;
  saint.reset();   // 聖徒化狀態全重置（saintMode 經 exitSaint、清計時器、關手勢層、清 saint 旗標）
  weapon.reset();  // 雙槍破防重置（清 dualWield/dualTimer + #grid dualwield class，防跨場殘留）
  state.overkill=0; state.killTime=0; state.transitioning=false;
  state.counterCount=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false;
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0;   // 評價統計歸零
  state.playerHp=state.playerMax;
  state.N=9; state.cols=3;
  state.runStartTime=Date.now(); resetClock();   // 計時碼表歸零（loadBoard 起算）
  state.boardTimes=[]; state.boardsCompleted=0;
  state.flawlessRun=true; state.intruderTriggered=false; state.inIntruderFight=false;
  state.deathGuardUsed=false; state.sRankUnlocked=false; state.resultMode='rematch';
  enemy.startLineup();   // 局：載序列第一隻（lineupIndex=0，含 enemyHp 基準）
  $('home').classList.remove('on');
  $('banner').classList.remove('on'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert');
  state.cutinPlaying=false;
  stopAll();
  loadBoard(0); updateBars();
}
/* ---- Boss 亂入：重開新「場」戰鬥（由 enemy.triggerIntruder 的 enterFight 注入呼叫）----
 *  依 場/局/敵/盤 模型:Boss 亂入＝重開新場,一切從頭 → 與 startGame 相同的完整重置
 *  (含 playerHp 滿血、deathGuardUsed 歸零)。與 startGame 僅三處差異:
 *    ① 載 witch(GAME_CONFIG.intruder.enemy)而非 currentEnemy;
 *    ② 不寫 inIntruderFight(enemy 於 enterFight 已設 true,§3.7 擁有者);
 *    ③ 不寫 intruderTriggered(inspector 於 S 解鎖已設 true,維持防重入)。
 *  觀察上與 reference 等價(S 解鎖前提為無傷,reference 進場時 HP 本就滿、deathGuard 本就未用),
 *  故不記 DECISIONS;此為「新場」語義的顯式重置。 */
export function startIntruderFight(){
  state.over=false; state.defeated=false; state.combo=0; state.energy=0; state.expect=1; state.boardIndex=0;
  state.atkBuff=false;
  saint.reset();
  weapon.reset();
  state.overkill=0; state.killTime=0; state.transitioning=false;
  state.counterCount=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false;
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0;   // 評價統計歸零
  state.playerHp=state.playerMax; state.enemyHp=state.enemyMax;
  state.N=9; state.cols=3;
  state.runStartTime=Date.now(); resetClock();   // 新場：計時碼表歸零
  state.boardTimes=[]; state.boardsCompleted=0;
  state.flawlessRun=true; state.deathGuardUsed=false;
  state.sRankUnlocked=false; state.resultMode='rematch';
  enemy.setEnemy(GAME_CONFIG.intruder.enemy);   // 載槍之魔女（含 Boss 大絕/懲罰/彈痕 config）
  $('home').classList.remove('on');
  $('banner').classList.remove('on'); $('banner').classList.remove('seq'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert');
  state.cutinPlaying=false;
  stopAll();
  loadBoard(0); updateBars();   // loadBoard 內含 scheduleOpeningUlt → 重啟敵大絕排程
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

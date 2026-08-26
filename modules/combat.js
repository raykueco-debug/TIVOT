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

import { GAME_CONFIG, asset, bgmVol, sfxGain } from '../config.js';
import { state, initEnemyHp } from '../state.js';
import { SFX } from '../audio.js';
import { TEL } from '../telemetry.js';
import { L, fmt } from '../i18n.js';   // 多語言（浮動字/RELOADING）   // 遙測（底層純輸出，同 audio 定位；未設定後端時 no-op）
import * as enemy from './enemy.js';
import * as hap from './haptics.js';   // 震動（葉節點：只依賴 settings/瀏覽器 API）
import * as defense from './defense.js';
import * as weapon from './weapon.js';
import * as saint from './saint.js';
import * as partner from './partner.js';
import * as inspector from './inspector.js';
import * as tutorial from './tutorial.js';   // 教學關卡（首次出陣穿插對話；暫停走 pauseForDialog）
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
const OVERKILL_LIMIT_MS=T.overkillLimitMs, OVERKILL_NEXT_DELAY_MS=T.overkillNextDelayMs;   // overkill 限時/收尾延遲
const OVERKILL_ORDER_MULT=T.overkillOrderMult!=null ? T.overkillOrderMult : 1;   // overkill 照順序點的獎勵倍率
const SAINT_ADVANCE_DIVISOR=T.saintAdvanceDivisor;   // 聖徒化一次「受擊」推進量＝playerMax/此值
const CLASP_LEN=110;

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

// 教學期間敵方攻擊基礎傷害覆寫（config.tutorial.enemyAtkDamage；一律 2）。
//   按錯/延時懲罰經此；大絕與 Defense 格擋由 defense 的 effUltDamage 同源處理（格擋＝再減半 → 1）。
//   ⚠ 判定用 tutorialRun（存續到結算）而非 tutorialActive：聖徒化收尾台詞後段落結束
//     （tutorialActive=false）但收尾盤仍是教學戰，攻擊力必須鎖 2 直到勝負。
const tutAtkDmg = dmg => (state.tutorialRun && GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.enemyAtkDamage!=null)
  ? GAME_CONFIG.tutorial.enemyAtkDamage : dmg;

// 教學劇情殺（tutorialStrike 三連擊）的實際擊數：腳本演出、非玩家失誤 →
//   結算受擊數扣除（win 內 clamp 0）。逐擊累計而非固定 -3：陣亡該段重來後
//   若再經歷一次劇情殺，扣除量同步跟上；未演到就死則不誤扣玩家真實受擊。
let _scriptedHits = 0;

/* ============================================================================
 *  啟動：注入 api 與開機閒置畫面（由 main.js 調度）
 * ========================================================================== */
export function setup(){
  // combat 把自己擁有的狀態變動原語注入下游模組，切斷反向依賴
  //   onThreatSpawned/onThreatResolved：教學「首紅點/首次防禦成功」節點通知
  //   ultSuppressed/firstThreatPending：教學暫緩大絕（一次一顆/腳本盤）與首顆固定位
  //   （defense 不 import tutorial，經此轉交）
  defense.init({ enemyAttack, enemyDamage, floatDmg, triggerAtkBuff, weaponCounter: weapon.weaponCounter,
                 onThreatSpawned: tutorial.onThreatSpawned,
                 /* ⚠ 一次防禦判完 → **固定模式的副武器歸位一順位**（ver -422，Ray 指定）。
                    這裡是唯一的呼叫點（鐵律 8）：defense 不 import weapon，
                    所以由 combat 這個協調者把兩件事串起來。 */
                 onThreatResolved: (g)=>{ weapon.onThreatResolved(); tutorial.onThreatResolved(g); },
                 onThreatEarly: tutorial.onEarlyBlock,
                 ultSuppressed: tutorial.ultSuppressed, firstThreatPending: tutorial.firstThreatPending,
                 threatBand: tutorial.threatBand });
  // 教學：真暫停/續戰＋腳本化終盤所需原語注入（雙槍/聖徒化/搭檔主動技/三爪腳本/敵血封頂）
  tutorial.init({
    pauseForDialog, resumeFromDialog,
    activateDual: weapon.activateDual,
    activateSaint: saint.activateSaint,
    tryPartnerActive: partner.tryActive,
    strike: tutorialStrike,
    capEnemyHp: tutorialCapEnemyHp,
    respawnThreat: defense.startCharge,   // 反擊教學：太早格擋 → 罵完重放一次反擊圈
    fillEnergy: ()=>addEnergy(100),       // 削血保底：直接填滿破防值（走滿值引導路徑）
    segmentRestart: tutorialSegmentRestart, // 教學陣亡：「重來！」該段重來（滿血重建本盤，不重播已完成段落）
    goHome,   // 跳過鈕：中止教學戰回主選單
    playCutin: saint.playCutin,   // 劇情版教學：SAINT INSTALL 那一句配全畫面 cut-in
  });
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
    // 教學掛鉤：倒數槽臨界攔截（引導生命歸還）＋結局通知（MB/生命歸還後的收尾台詞）
    onSaintCritical: tutorial.onSaintCritical,
    onSaintEnded: tutorial.onSaintEnded,
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
    //   clockResume 供 finishSaintMode 於三結局收尾後接回碼表（聖徒化全程不計時）
    clockPause, clockResume,
  });
  // 搭檔：combat 注入被動技所需原語 + 主動技各 handler 的分域 api。
  //   被動（即死防禦）：updateBars / floatDmg / resetEnemyTimers / scheduleUlt / playCutin。
  //   主動 saintApi（生命歸還）：saint 的中止+保血執行體。partner 不反向 import，一律經此注入。
  partner.init({
    updateBars, floatDmg,
    resetEnemyTimers: defense.resetEnemyTimers,
    scheduleUlt: defense.scheduleUlt,
    playCutin: saint.playCutin,
    hintCurrentCell,   // 即死防禦後標記當前應點格（一次性續命導航）
    saintApi: { lifeReturnAbort: saint.lifeReturnAbort },
    // 馬季諾：前線補給（cut-in 後直接進雙槍破防窗口，窗口本體歸 weapon）＋高裝藥彈（低血量普攻加倍；lowHpBuff 為 combat 擁有，經此管道寫）
    startDual: weapon.startDualWindow, setLowHpBuff,
  });
  // 監察官（評價/結算）：combat 擁有計時 → 算好 totalTime/avg 呼叫 inspector.settle。
  //   inspector 只 import state/config；goHome（combat）與 triggerIntruder（enemy）經此注入。
  /* ⚠ `storyReturn` 也注入 inspector（ver -358）：劇情叫起來的教學打完會停在結算頁，
     按鈕按下去要**回劇情**而不是回首頁 —— 交還的實體只有 combat 這裡有
     （main.js 透過 setStoryReturn 給的）。 */
  inspector.init({ goHome, triggerIntruder: enemy.triggerIntruder,
                   /* ⚠ **參數要往下傳**（ver -430 修）：舊寫法 `()=>storyReturn()` 把結算頁
                      帶出來的 `res` 整個吃掉 —— 計時挑戰的「超時＝打輸」（`{lost:true}`）
                      因此接不上 `onLose` 那一支分歧，戰敗那三顆鈕也送不出去。 */
                   storyReturn: (res)=>{ if(storyReturn) storyReturn(res); else goHome(); },
                   /* 戰敗那一頁該給哪幾顆鈕（ver -430）：只有啟動層知道這一場是飛行頁
                      交棒過來的（船艦戰）、還是劇情插進來的（見 main.js 的 setLoseKind）。 */
                   loseKind: ()=> (loseKind ? loseKind() : 'home') });
  // 敵人：Boss 亂入的戰鬥重置（startIntruderFight，combat 擁有）+ 換敵刷血條（updateBars）注入。
  enemy.init({ startIntruderFight, updateBars });
}
export function bootIdle(){
  // 開機停在首頁：先建立盤面/血條供背景顯示，但 over=true 讓計時與敵人不啟動
  enemy.applyConfigToDOM();
  state.over=true;
  loadBoard(0); updateBars();
  $('home').classList.add('on');
  // 主選單 BGM 不在此播：playBgm 會立即開抓 1MB 檔，搶走載入畫面立繪/關鍵音效的頻寬。
  //   改由 main.js 預載批次段呼叫（實際起播本來就要等首次手勢 unlock，時序不變）。
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
  txt.textContent=L.battle.reloading;
  SFX.play(asset('sfx_reload'), sfxGain('sfx_reload'));   // 清盤換彈音（RELOADING 顯示時）
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
/* 這一盤要查 boardGrids 的第幾格。`boardLoop` 的怪打完一輪從頭再來（ver -375，
   敵人卡的 `33344, loop`）—— 血厚的怪不會因為盤序用完就一路停在最後一盤的難度。
   ⚠ 盤面時限（BOARDS）也跟著繞回去，兩者要用**同一個索引**，不然難度會錯開。 */
function boardSeqIdx(idx){
  const en=GAME_CONFIG.enemies[state.currentEnemyKey];
  const len=(en && en.boardGrids && en.boardGrids.length) || 0;
  return (en && en.boardLoop && len) ? (idx % len) : idx;
}
function boardGridFor(idx){
  const en=GAME_CONFIG.enemies[state.currentEnemyKey];
  const bg=en && en.boardGrids;
  idx=boardSeqIdx(idx);
  const baseBoard=BOARDS[idx]||BOARDS[BOARDS.length-1];
  let grid=(bg && bg[idx]!=null) ? bg[idx] : (idx>=2 ? 16 : baseBoard.grid);
  let cols=Math.round(Math.sqrt(grid));
  if(cols*cols!==grid){ grid=baseBoard.grid; cols=baseBoard.cols; }
  return { grid, cols };
}
export function loadBoard(idx){
  state.boardIndex=idx;
  const g=boardGridFor(idx); state.N=g.grid; state.cols=g.cols;
  { const si=boardSeqIdx(idx);
    state.intervalLimit=(BOARDS[si]||BOARDS[BOARDS.length-1]).interval; }
  state.boardStartTime=Date.now();
  state.boardClean=true;
  state.critCombo=0;              // 暴擊連擊為「盤內連續」：新盤（含清盤後換盤/換敵）歸零＝「清盤中斷」
  buildGrid();
  startIntervalTimer();
  clockResume();                  // 新盤載好、可點 → 碼表起算（開場/換盤/換敵首盤共用）
  defense.scheduleOpeningUlt();   // 開場保證：每盤 3 秒內敵方就發動大絕
  updateStatus();
  tutorial.onBoardLoaded(idx);    // 教學 'board:N' 節點（非教學中為 no-op）
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

/* 把順序游標推到「下一個還沒被消掉的號碼」。
 *  只有 overkill 的照順序獎勵用得到：該窗口免順序，玩家可能先跳點掉靠後的號碼，
 *  游標若停在已消格上就再也對不上，順序鏈會永久斷掉。 */
function advanceExpectPastCleared(){
  while(state.expect<=state.N){
    const c=state.cells.find(c=>+c.dataset.num===state.expect);
    if(c && !c.classList.contains('done')) break;
    state.expect++;
  }
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
    hap.shot();                        // 破防窗口：**每一發**都震（ver -398，Ray 指定）
    enemyDamage(Math.round(dmg), false, false, 'dual');   // 破防窗口的射擊（ver -423：來源別）
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

  // Overkill（敵 HP 已歸零的追加輸出窗口）：不用管數字順序，點到未消格就算命中。
  //   結束只有兩條路：全清（clearBoard→finish）或 3 秒逾時（autoClearOverkill）；
  //   不再有「按錯結束」——已消格再點一律忽略。傷害/暴擊/聖能與正常命中同規格。
  //   ⚠ 照順序獎勵：免順序是底線，但仍照數字接下去點 → 該擊 ×OVERKILL_ORDER_MULT。
  //     敵已死時傷害 1:1 進 overkill 點數（見 enemyDamage 的 else 分支）→ 加傷即加點數。
  //     順序斷掉不罰（仍算命中，只是 1 倍），之後接回順序即可再拿獎勵。
  if(state.enemyHp<=0){
    if(cell.classList.contains('done')) return;
    SFX.gunshot(false);
    const inOrder = (num===state.expect);
    cell.classList.add('done'); cell.classList.remove('next'); enemy.shatterCell(cell);
    state.combo++; if(state.combo>state.maxCombo) state.maxCombo=state.combo;
    state.correctTaps++;
    resetIntervalDeadline(); addEnergy(ENERGY_PER_HIT);
    let okDmg=hitDamage(); if(state.atkBuff) okDmg*=2;
    if(inOrder){
      okDmg*=OVERKILL_ORDER_MULT;
      // 游標往後推到「下一個還沒消的號碼」——玩家先跳點過的號碼不該卡住順序鏈，
      //   否則 expect 停在已消格上，後面再也接不回順序（獎勵永久斷掉）。
      advanceExpectPastCleared();
    }
    let okCrit=false;
    if(Math.random() < CRIT_BASE_RATE + state.critCombo*CRIT_PER_COMBO){
      okCrit=true; okDmg*=(1 + CRIT_DMG_BASE + state.critCombo*CRIT_DMG_PER_COMBO);
    }
    state.critCombo++;
    enemyDamage(Math.round(okDmg), okCrit, false, 'saint');
    if(state.cells.every(c=>c.classList.contains('done'))){ clearBoard(); return; }
    updateStatus();
    return;
  }

  if(num===state.expect){
    SFX.gunshot(false);            // 普通開槍：重「碰」
    cell.classList.add('done'); cell.classList.remove('next'); enemy.shatterCell(cell);
    state.combo++; if(state.combo>state.maxCombo) state.maxCombo=state.combo;
    state.correctTaps++;                 // 命中率分子（依序正確點擊）
    resetIntervalDeadline(); addEnergy(ENERGY_PER_HIT);
    let dmg=hitDamage(); if(state.atkBuff||state.lowHpBuff) dmg*=2;   // 計時型（Counter）或低血量（高裝藥彈）皆加倍，不疊乘
    // 暴擊（普攻）：此分支必為普攻（雙槍破防走上面獨立分支，本輪 saintMode 亦 return），暴擊率/加傷隨 critCombo 成長。
    //   本擊先以「現值」擲骰再 +1（首擊＝base 暴擊率）；命中則跳紅字「暴擊」（交由 enemyDamage 的 isCrit 呈現）。
    let crit=false;
    const cc=state.critCombo;
    if(Math.random() < CRIT_BASE_RATE + cc*CRIT_PER_COMBO){
      crit=true; dmg*=(1 + CRIT_DMG_BASE + cc*CRIT_DMG_PER_COMBO);
    }
    state.critCombo++;
    enemyDamage(Math.round(dmg),crit,false,'basic');   // 點擊直接扣敵血（crit=true → 敵區跳紅字「暴擊」）
    state.expect++;
    tutorial.onBoardProgress(state.expect-1);   // 教學：第四回合清滿 N 格 → 劇情殺（非教學 no-op）
    if(state.expect>state.N) clearBoard(); else markNext();
    updateStatus();
  }else{
    // （overkill 免順序已在上方分支攔截；此處必為敵存活時的按錯）
    // 按錯：紅字期間按錯 → 重擊且紅字消失；否則普通按錯
    state.boardClean=false;
    state.wrongTaps++;                    // 命中率分母（按錯格）
    cell.classList.add('wrong'); setTimeout(()=>cell.classList.remove('wrong'),300);
    state.combo=0;
    /* ══ 計時挑戰（ver -396）：唯一的懲罰是**時間**══
       按錯 → 碼表直接加秒數（`runElapsedMs` 是碼表的累計，加在那裡就等於「多花了那麼久」），
       並播那一場自己的失手音。⚠ 不走 `enemyAttack` —— 那條路上有扣血、受擊特效、
       致死判定，而這一場的靶子根本不會攻擊。 */
    if(state.timeAttack){
      const pen = state.timeAttack.wrongPenaltySec;
      if(pen>0) state.runElapsedMs += Math.round(pen*1000);
      const se = state.timeAttack.se;
      if(se && asset(se)) SFX.play(asset(se), sfxGain(se)); else SFX.wrong();
      /* 罰了多少秒要**看得見**，不然玩家只覺得「時間怎麼變慢了」。 */
      floatDmg('+'+pen+'s', '50%', '46%', true);
      if(state.threats.length) defense.clearThreat();
    }else if(state.threats.length){
      defense.clearThreat();          // 攻擊點消失，不能再補救
      enemyAttack(tutAtkDmg(wrongDamage(DMG_HEAVY)), 'wrong');
    }else{
      SFX.wrong();
      enemyAttack(tutAtkDmg(wrongDamage(DMG_WRONG)), 'wrong');
    }
    resetIntervalDeadline(); updateStatus();
    tutorial.onMistake('wrong');      // 教學中按錯 → 監察官插話（懲罰已落地才暫停；非教學為 no-op）
  }
}

/* 攻擊加倍視覺（#grid buffed class）由兩個來源共用：計時型 atkBuff（Counter 2 秒）與
 * 狀態型 lowHpBuff（高裝藥彈）。移除 class 前都要確認另一來源不在效。 */
function clearAtkBuff(){
  state.atkBuff=false; clearTimeout(state.atkBuffTimer);
  if(!state.lowHpBuff) $('grid').classList.remove('buffed');
}
function triggerAtkBuff(sec){
  state.atkBuff=true;
  $('grid').classList.add('buffed');
  clearTimeout(state.atkBuffTimer);
  state.atkBuffTimer=setTimeout(()=>{
    state.atkBuff=false;
    if(!state.lowHpBuff) $('grid').classList.remove('buffed');
    updateStatus();
  }, (sec||ATK_BUFF_SECONDS)*1000);
  updateStatus();
}
/* 低血量普攻加倍（馬季諾「高裝藥彈」）開/關管道：partner.checkLowHpBuff 經注入呼叫。
 * lowHpBuff 為 combat 擁有（3.8）；狀態型、無計時器，跨盤跨怪（clearAtkBuff 不碰它）。 */
function setLowHpBuff(on){
  state.lowHpBuff=!!on;
  if(on) $('grid').classList.add('buffed');
  else if(!state.atkBuff) $('grid').classList.remove('buffed');
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
    floatDmg(fmt(L.battle.perfectClear,{n:gain}),'50%','30%',false);
  }
  // 教學：第二盤清盤的最後一槍 → 破防值直接設為只差 1 滿（第三盤首擊即滿、進雙槍引導）
  if(state.tutorialActive && state.boardIndex===1 && GAME_CONFIG.tutorial){
    state.energy = GAME_CONFIG.tutorial.preFullEnergy != null ? GAME_CONFIG.tutorial.preFullEnergy : 99;
    updateEnergyClasp();
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
  /* ⚠ 計時挑戰：靶子**不攻擊**（ver -396）。守在這裡是因為所有會扣玩家血的路徑
     （大絕／延時懲罰／按錯懲罰／格擋）都經過這一支 —— 守一次就全關掉（鐵律 8）。 */
  if(state.timeAttack) return;
  /* 受到敵人主動攻擊 → 震一下（ver -398，Ray 指定）。⚠ 守在這裡就涵蓋了所有扣血路徑
     （大絕／延時／按錯／格擋），與這一支「唯一入口」的定位一致（鐵律 8）。 */
  hap.hit();
  if(state.over) return;
  // 敵攻擊音：依 kind 播該怪對應音（ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。
  const sk = state.curEnemySound && state.curEnemySound[kind];
  if(sk) SFX.play(asset(sk), sfxGain(sk));   // 受擊層增益（全域響度階層見 tuning.sfxGain）
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
  // 2) 教學戰不設戰敗：監察官「服了你了。重來！」→ 收段後整場教學重來（tutorial 接手）
  if(state.tutorialRun && tutorial.onPlayerDead()) return;
  // 3) 不可用 → 戰敗。先上鎖：即使同一瞬間敵人也歸零，win() 一律讓位（戰敗優先）。
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
// 一次性標記「當前應點的數字格」（即死防禦續命導航經注入呼叫）：沿用 .next 高亮；
//   點掉該格後由 tap → markNext 回到該盤原本的提示規則，不持續提示。
function hintCurrentCell(){
  if(state.over || state.saintMode || state.dualWield || state.enemyHp<=0) return;
  const c=state.cells.find(x=>+x.dataset.num===state.expect && !x.classList.contains('done'));
  if(c) c.classList.add('next');
}
// 歸零聖能並更新 C 字計量表（聖徒化開場清零破防值；energy 為 combat 擁有）。
function resetEnergy(){ state.energy=0; updateEnergyClasp(); }

// 對敵造成傷害（含 overkill / 擊殺凍結計時）
/* ══ 抗性／弱點／破防增傷（ver -423，Ray 的敵人卡）══════════════════════
   ⚠⚠ **只有這一處在算**（鐵律 7）：所有打到敵人的傷害都走 `enemyDamage`，
     所以修正也只掛在這裡 —— 不要在反擊、普攻、雙槍那三邊各乘一次。
   ⚠ `src` ＝傷害來源（`basic`／`counter`／`dual`／`saint`…）。卡上的
     `resist[src]` 是減傷成數、`weak[src]` 是增傷成數，兩者相加後套一次。
   ⚠ `dualBonus` 是**破防窗口期間**的額外增傷（與來源無關，卡上分開寫的一欄）。
   ⚠ 至少留 1 點：減傷 100% 也不該變成打不動（那會讓玩家以為卡住）。 */
function applyEnemyMods(dmg, src){
  if(!(dmg>0)) return dmg;
  let k = 1;
  const R=state.enemyResist, Wk=state.enemyWeak;
  if(R && R[src]) k -= R[src];
  if(Wk && Wk[src]) k += Wk[src];
  if(state.dualWield && state.enemyDualBonus) k += state.enemyDualBonus;
  return Math.max(1, Math.round(dmg * Math.max(0, k)));
}
function enemyDamage(dmg,isCrit,silent,src){
  dmg = applyEnemyMods(dmg, src||'basic');
  // 教學：段落未播完前（tutorialActive）敵不可被打死——致死傷害夾到留 1 HP。
  //   防 EXSECUTIŌ／聖徒化中擊殺跳過最後一段教學（finishMB/LR 播完 endTutorial 後才解鎖擊殺）。
  if(state.tutorialActive && dmg>=state.enemyHp && state.enemyHp>0){
    dmg = state.enemyHp - 1;
    if(dmg<=0){ $('enemyImg').classList.add('hit'); setTimeout(()=>$('enemyImg').classList.remove('hit'),80); return; }
  }
  if(dmg>0){
    if(state.enemyHp>0){
      const after=state.enemyHp-dmg;
      if(after<0) state.overkill+=(-after);
      state.enemyHp=Math.max(0,after);
      updateBars();
      tutorial.onEnemyHp(state.enemyHp/state.enemyMax);   // 教學：削血保底觸發（非教學為 no-op）
      if(!silent) floatDmg((isCrit?L.battle.crit:'')+dmg, (30+Math.random()*40)+'%','35%',isCrit);
      if(state.enemyHp<=0){
        if(state.killTime===0) state.killTime=Date.now();   // 敵死標記（OVERKILL 起點）
        clockPause();                                       // 敵死→進 overkill：碼表暫停（overkill 不計時）
        defense.killThreatSchedule(); clearAtkBuff();
        floatDmg(L.battle.overkill,'50%','48%',true);
        enterOverkillFx();   // 聖徒化中擊殺也進 overkill（藍光/鈴鐺；限時與撤游標僅非聖徒化，見函式內）
      }
    }else{
      state.overkill+=dmg;
      SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));   // overkill 期間每一槍帶神楽鈴（StartBT_SE；普攻/雙槍/聖徒化追打統一在此掛鉤）
      floatDmg(fmt(L.battle.overkillAdd,{n:dmg}), (30+Math.random()*40)+'%','35%',true);
    }
  }
  $('enemyImg').classList.add('hit'); setTimeout(()=>$('enemyImg').classList.remove('hit'),80);
}

/* ============================================================================
 *  聖能（本輪只累積與 C 字計量表視覺；雙槍發動下一輪接）
 * ========================================================================== */
function addEnergy(v){
  if(state.saintMode) return;        // 聖徒化期間不累積破防值
  const was=state.energy;
  state.energy=Math.min(100,state.energy+v);
  // 教學：雙槍引導前破防值封頂於 preFullEnergy（第三盤起放行 → 首擊即滿、交給教學引導）
  if(tutorial.energyCapActive()){
    state.energy=Math.min(state.energy, (GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.preFullEnergy) || 99);
  }
  updateEnergyClasp();
  if(was<100 && state.energy>=100){
    energyFullBurst();               // 滿的瞬間：計量表為中心發一圈光圈
    tutorial.onEnergyFull();         // 教學：滿值瞬間插入雙槍引導（非教學為 no-op）
  }
}
// 破防值滿瞬間演出：以 C 字計量表為中心擴散一圈半透漸層光圈（~0.85s，不擋點擊）。
function energyFullBurst(){
  const clasp=$('energyClasp'); if(!clasp) return;
  const r=clasp.getBoundingClientRect();
  const d=document.createElement('div'); d.className='energy-burst';
  d.style.left=(r.left+r.width/2)+'px';
  d.style.top =(r.top +r.height/2)+'px';
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 900);
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
  /* ⚠ 計時挑戰：**沒有延時懲罰**（ver -396，Ray 指定）—— 靶子不會催你，
     唯一的壓力是碼表本身。連計時器都不起，「太慢了」那一格也就不會跳。
     （光靠 `enemyAttack` 守門只擋得住扣血，那行字與 combo 歸零還是會演。） */
  if(state.timeAttack) return;
  state.intervalDeadline=Date.now()+effIntervalLimit()*1000;
  state.intervalTimer=setInterval(()=>{
    if(state.over){clearInterval(state.intervalTimer);return;}
    if(state.saintMode||state.cutinPlaying){resetIntervalDeadline();return;}   // 聖徒化/演出中不受間隔壓力
    if(Date.now()>=state.intervalDeadline){
      // 教學：第二盤在首次防禦成功前不套延時懲罰（只重置期限，手感不受壓）
      if(tutorial.delayPenaltySuppressed()){ resetIntervalDeadline(); return; }
      state.combo=0;
      // 延時懲罰傷害＝一般怪基礎 × 該怪 DELAY_PENALTY_SCALE（Boss=0.5）；時限已由 effIntervalLimit 減
      if(state.enemyHp>0){
        enemyAttack(tutAtkDmg(delayDamage()), 'delay');
        floatDmg(L.battle.tooSlow,'60%','55%',false);
        tutorial.onMistake('delay');   // 教學中延時 → 監察官插話（非教學為 no-op）
      }
      updateStatus(); resetIntervalDeadline();
    }
  },80);
}
/* ══ 懲罰傷害：**絕對值優先**（ver -375）══
   敵人標準卡寫的是絕對值（「延時懲罰 5 秒，攻擊力 5」）→ 有寫就直接用；
   沒寫（null）才走舊的「tuning 基礎 × 該怪縮放」。
   ⚠ 只有這兩支在算懲罰傷害（鐵律 7：一個量一個算式）—— 呼叫端不要自己再乘一次。 */
function delayDamage(){
  if(state.DELAY_DAMAGE!=null) return Math.max(1, Math.round(state.DELAY_DAMAGE));
  return Math.max(1, Math.round(DMG_DELAY*state.DELAY_PENALTY_SCALE));
}
function wrongDamage(base){
  if(state.WRONG_DAMAGE!=null) return Math.max(1, Math.round(state.WRONG_DAMAGE));
  return Math.max(1, Math.round(base*state.WRONG_PENALTY_SCALE));
}
/* 本盤實際延時時限。卡上寫了絕對秒數（DELAY_SECONDS）就是那個數字，逐盤都一樣；
   否則＝盤面 intervalLimit + 該怪 DELAY_TIME_DELTA（Boss=-1）。下限 0.6 秒防呆。 */
function effIntervalLimit(){
  if(state.DELAY_SECONDS!=null) return Math.max(0.6, state.DELAY_SECONDS);
  return Math.max(0.6, state.intervalLimit + state.DELAY_TIME_DELTA);
}
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
  partner.checkLowHpBuff();   // 所有 HP 變動的唯一匯流點 → 高裝藥彈門檻判定（partner 內自帶各情境守門）
}
function updateStatus(){ /* 狀態列已移出畫面（下半為純數字盤），保留為相容呼叫 */ }

/* ============================================================================
 *  勝負 / 結算（combat 擁有計時 → 算 totalTime/avg → 交 inspector.settle 演出）
 * ========================================================================== */
function stopAll(){
  clearInterval(state.intervalTimer);
  clearTimeout(state.atkBuffTimer);
  endOverkillFx();       // 中途退出/結算時清 overkill 限時與藍光
  tutorial.abort();      // 教學中途收場（goHome/勝負/重開場）：只撤 UI，不記已看
  defense.stopAll();
  saint.stopTimers();    // 停聖徒化計時器（saintTimer / saintReactTimer）
  weapon.stopTimers();   // 停雙槍破防計時器（dualTimer）
}

/* ---- 計時碼表（連戰用；規則：只在「盤面可點且非 overkill／非聖徒化」時作動）----
 *  clockResume：盤面可點才起算（敵活著、非結算/演出/轉場/聖徒化）。多處呼叫皆冪等（僅在暫停中才起算）。
 *  clockPause ：敵死(overkill)/轉場/cut-in/結算時暫停，把這段併入 runElapsedMs。
 *  clockElapsedMs：目前累計＝已併入 + 進行中的一段。overkill 與轉場自然不計入。
 *  ⚠ saintMode 一併排除：聖徒化是獨立計時的演出段（倒數槽自有節奏、盤面規則不同），
 *    不該算進「實打時間」。守在 clockResume 而非只在進場暫停一次——tap() 每次點擊都會
 *    呼叫 clockResume，只暫停一次會被聖徒化期間的點擊立刻重新起算。 */
function clockResume(){
  if(state.clockRunSince===0 && !state.over && state.enemyHp>0
     && !state.cutinPlaying && !state.transitioning && !state.saintMode){
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

/* 退出確認框：真暫停／續玩。cutinPlaying 已擋新大絕/敵傷害/點擊/間隔懲罰；
 *  這裡再凍結攻擊圈縮放 + 碼表，續玩時原樣接回（clockResume 需在清旗標後呼叫）。 */
export function pauseForDialog(){
  state.cutinPlaying = true;
  clockPause();
  defense.pauseThreats();
}
export function resumeFromDialog(){
  state.cutinPlaying = false;
  defense.resumeThreats();
  clockResume();
}

/* ---- Overkill 演出/限時 ----
 *  進場（擊殺瞬間，enemyDamage 呼叫）：盤面藍光 + 鈴鐺音 + 起 3 秒限時。
 *  限時到（autoClearOverkill）：殘留格連環碎裂 → 鎖點擊 1 秒（碼表已停，天然不計時）
 *  → finishEnemyOrAdvance。所有 overkill 結束路徑（自然清盤/按錯/逾時/聖徒化擊殺）
 *  都經 finishEnemyOrAdvance → endOverkillFx 統一清理（冪等）。 */
let overkillTimer=null;
function enterOverkillFx(){
  $('grid').classList.add('overkill');            // 數字藍光（見 style.css #grid.overkill）
  SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));   // 神楽鈴（StartBT_SE，擊殺這一槍；之後每槍由 enemyDamage 補鈴）
  // 雙槍窗口與敵同亡：殺敵瞬間收窗（endDual 於敵死不重建盤面），追打統一走 overkill 免順序。
  //   否則雙槍 4 秒計時器晚點到期會 buildGrid 憑空生出一整盤新 overkill 盤。
  if(state.dualWield) weapon.endDual();
  state.cells.forEach(c=>c.classList.remove('next'));   // 免順序（含聖徒化追打）→ 撤下「下一格」高亮
  if(state.saintMode) return;   // 聖徒化：3 秒限時不套（由倒數槽/反應時限施壓），saintTap 走免順序分支
  // 照順序獎勵的起點：擊殺這一槍可能來自雙槍/反擊（免順序清格），游標會停在已消格上
  //   → 先推到下一個還活著的號碼，玩家一進 overkill 就接得回順序鏈。
  advanceExpectPastCleared();
  clearTimeout(overkillTimer);
  overkillTimer=setTimeout(autoClearOverkill, OVERKILL_LIMIT_MS);
}
function endOverkillFx(){
  clearTimeout(overkillTimer); overkillTimer=null;
  $('grid').classList.remove('overkill');
}
function autoClearOverkill(){
  overkillTimer=null;
  if(state.over||state.transitioning||state.cutinPlaying||state.enemyHp>0||state.saintMode) return;
  // 全數字磚破碎：殘留格逐一 done+碎裂，40ms 錯開成連環爆
  let k=0;
  state.cells.forEach(c=>{
    if(c.classList.contains('done')) return;
    setTimeout(()=>{ c.classList.add('done'); c.classList.remove('next'); enemy.shatterCell(c); }, (k++)*40);
  });
  SFX.heavyHit();
  clearAtkBuff();
  if(state.dualWield) weapon.endDual();           // 雙槍窗口若橫跨 overkill，一併收掉
  state.transitioning=true;                       // 延 1 秒插入下一盤：鎖點擊、碼表不 resume（不計時）
  setTimeout(()=>{
    if(state.over) return;
    state.transitioning=false;
    finishEnemyOrAdvance();
  }, OVERKILL_NEXT_DELAY_MS);
}

/* ---- 敵死收尾：局內還有下一敵→轉敵、否則→結算 ---- */
function finishEnemyOrAdvance(){
  endOverkillFx();   // overkill 藍光/限時統一在此清理（所有結束路徑的匯流點，冪等）
  // 教學戰＝單敵一場（tutorialRun 存續到結算；跳過教學則恢復一般連戰）
  if(enemy.hasNextInLineup() && !state.tutorialRun && !state.scriptRun){ advanceEnemy(); }
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
/* 劇情把戰鬥叫起來的那一場（tutorialStoryRun）：打完要**直接交還劇情**。
   ⚠ 不能走一般收尾 —— 那條路上有「驅逐完成」過渡禎（要點一下）、結算 BGM、
     評價頁、主選單，玩家會看到首頁與評價頁閃過去（Ray：「切乾淨」）。
   ⚠ 勝負都走這裡：教學的即死防禦讓戰敗幾乎不可能，但收尾台詞之後盤面交還玩家，
     那一段是真的會死的 —— 沒接的話會卡在戰敗結算頁，劇情永遠回不來。 */
let storyReturn = null;
export function setStoryReturn(fn){ storyReturn = fn; }
/* 「這一場輸了要給哪幾顆鈕」的判定器（ver -430，由 main.js 注入；轉交給 inspector）。
   ⚠ combat 不認識 `flightBack`／`storyResume` —— 那兩個是啟動層的交棒狀態。
   ⚠ 只是**轉交**，這裡不加任何判斷：加了就變成第二個判定點（鐵律 7）。 */
let loseKind = null;
export function setLoseKind(fn){ loseKind = fn; }
/* 關門演出（`story.playKerberosClose`）由 main.js 注入 —— combat **不 import story**
   （模組邊界：劇情層不在戰鬥的依賴圖裡，見 CLAUDE.md §2；同 storyReturn 的作法）。 */
let storyClose = null;
export function setStoryClose(fn){ storyClose = fn; }
/* ⚠ ver -358 起**只有戰敗**走這條「不結算直接交還劇情」的路。
   勝利改成照樣上結算頁（Ray：「教學關卡結束後跳出結算畫面…並跳出拾得道具視窗」），
   由結算頁的按鈕再把場子交還劇情（見 inspector.onRematchBtn 的 tutorial-home 分支）。
   ⚠ 戰敗維持原樣：教學的即死防禦讓戰敗幾乎不可能，真的死了也不該給結算與掉落。 */
/* 開發者跳關（ver -366，Ray：「教學戰也寫個 skip 鈕，跳到下一幕」）。
   ⚠ 不演關門、不上結算、不給掉落 —— 這是**開發用的梯子**，目的只是快點回到劇情往下看。
   ⚠ 走 `storyBattleEnd()` 那條既有的「不結算直接交還劇情」路徑，不要另寫一份收尾。 */
export function devSkipBattle(){
  if(state.over) return;
  if(storyFramed()){ storyBattleEnd(state.defeated); return; }
  state.over=true; clockPause(); stopAll();
  state.tutorialRun=false;
  goHome();
}

/* ══ 「劇情框」的戰鬥（ver -375）══
   ＝ 劇情帶起來的教學（tutorialStoryRun）**或** 腳本插入戰（scriptRun）。
   兩者共用的是**框**：不播櫻花過渡禎、進出走 Kerberos 之門、打完直接交還劇情。
   ⚠ 共用的只有框 —— 教學那一套（鎖攻擊力、敵人打不死、教學台詞結算）只看
     `tutorialRun`，不要混進來。 */
function storyFramed(){ return state.tutorialStoryRun || state.scriptRun; }
function storyBattleEnd(lost){
  if(!storyFramed()) return false;
  state.tutorialRun=false; state.tutorialStoryRun=false; state.scriptRun=false;
  state.over=true; clockPause(); stopAll();
  /* ⚠ 把**勝負**一起交還（ver -377）：可戰敗的場次要靠它決定接哪一支分歧。 */
  if(storyReturn) storyReturn({ lost: !!lost });
  return true;
}

function win(){
  if(state.over || state.defeated) return;   // 戰敗優先：已判定戰敗則勝利結算一律讓位
  state.over=true; clockPause(); stopAll();
  const totalTime=clockElapsedMs()/1000;               // 只累計實打時間（overkill/轉場/cut-in 皆不計）
  /* ══ 計時挑戰：超過標準時間就算「沒過關」（ver -396，Ray：「時間超過 50 秒出失敗分支的台詞」）══
     ⚠ 它**不是戰敗** —— 靶子不會攻擊，打完一定是 win()。這裡只是把「超時」翻譯成
       腳本看得懂的那個布林值（`onLose` 的分歧），交棒由 inspector 帶出去。 */
  state.timeOver = !!(state.timeAttack && state.timeAttack.parSec>0
                      && totalTime > state.timeAttack.parSec);
  TEL.runEnd({ partner:state.pickedPartner, weapon:state.equippedWeapon,
               boss:state.inIntruderFight, result:'win', time_ms:Math.round(totalTime*1000) });
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
    // 教學劇情殺三連擊為腳本演出，不算玩家頭上（下限 0）
    hitsTaken: Math.max(0, state.hitsTaken - _scriptedHits),
  };
  /* 勝利 → 先播「驅逐完成」過渡禎；被點掉（done）後才建結算面板並起播結算 BGM。
     ⚠ **劇情叫起來的教學不播過渡禎**（ver -358）：那一場的進出都由劇情接手，
       中間插一張要點的過渡禎會把節奏切斷（同 -329「切乾淨」的理由）。
       結算頁照出 —— Ray 要的是「沒有監察官的戰績頁 ＋ 拾得道具」。 */
  const toResult = ()=>{
    /* ⚠ **教學戰的結算不放 result BGM**（ver -361，Ray 指定）：那首是「一場驅逐打完」的
       收束感，而教學是劇情中間的一段 —— 直接沿用地宮那條線的 crisis，情緒才接得上。
       ⚠ 同曲重播由 playBgm 自己擋掉（劇情本來就在放 crisis 的話這裡是 no-op）。 */
    /* ⚠ 劇情插入戰（scriptRun）**不換曲**：那一場是劇情中間插進來的一段，
       結算完就回城鎮 —— 換上 result 那首收束感的曲子等於幫這一段畫句點。
       回城鎮時由城鎮自己把該地的 BGM 接回去（town.open/enter）。 */
    if(!state.scriptRun){
      const key = state.tutorialRun ? 'bgm_crisis' : 'bgm_result';
      SFX.playBgm(asset(key), { volume: bgmVol(key) });
    }
    inspector.settle(totalTime, stats, { isLose:false });
  };
  /* ⚠ 劇情版教學：**先演「關門」**（進場那一套的倒放）再上結算（ver -366，Ray 指定）。
     進場是門推上來、打開露出戰場；打完就該把門關回去 —— 沒有這一段，畫面會從戰鬥
     硬切到結算頁。關門的最後一步會上黑透遮罩並把劇情層收掉，才輪到結算。 */
  if(storyFramed() && storyClose) storyClose(toResult);
  else playTransition('finish', toResult);
}
function lose(){
  if(state.over) return;
  /* ══ 戰敗的去向（ver -376，Ray 定案）══
     「**除標明劇情殺／可戰敗之外，戰敗一律接 Game Over 畫面回主選單**」。
     所以這裡只有一個例外：那一場的卡上明寫 `allowLose`（＝劇本要它被打輸，
     輸了要接著演）。其餘一律往下走一般的失敗流程（死亡定格 → 驅逐失敗 → 結算 → 首頁）。
     ⚠ 劇情帶起來的那些場次**也吃這條**，包含教學 —— 教學真正的「劇情殺」是
       另一套（`tutorial.onPlayerDead()` 在傷害落地時就攔下來了，根本走不到這裡）；
       走到這裡就是玩家真的被打死了。
     ⚠ 城鎮那一段對白的旗標是**演完才記**的（見 town.enter），所以回頭再走一次
       還打得到 —— 不會因為輸過就永遠卡住。 */
  const _sb = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
  if(_sb && _sb.allowLose && storyBattleEnd(true)) return;
  /* 走一般失敗流程之前，把「這一場是劇情場」的旗標收掉 —— 不收的話結算會走
     教學／插入戰那一頁（那是給打贏用的），玩家輸了卻看到一頁戰績。 */
  state.scriptRun=false; state.scriptBattleId=null;
  state.tutorialRun=false; state.tutorialStoryRun=false;
  state.over=true; clockPause(); stopAll();
  TEL.runEnd({ partner:state.pickedPartner, weapon:state.equippedWeapon,
               boss:state.inIntruderFight, result:'lose', time_ms:Math.round(clockElapsedMs()) });
  // HP 歸零瞬間 → 畫面黑白定格 1 秒 → 再切「驅逐失敗」過渡禎（BGM 於過渡禎插入時起播）
  const app=$('app');
  if(app) app.classList.add('death-freeze');
  setTimeout(()=>{
    if(app) app.classList.remove('death-freeze');
    SFX.playBgm(asset('bgm_lose'), { volume: bgmVol('bgm_lose') });   // 驅逐失敗插入瞬間 → 任務失敗 BGM
    playTransition('fail', ()=> inspector.settle(null, null, { isLose:true }));
  }, 1000);
}

/* ============================================================================
 *  流程進出
 * ========================================================================== */
export function startGame(){
  state.over=false; state.defeated=false; state.combo=0; state.energy=0; state.expect=1; state.boardIndex=0;
  state.atkBuff=false; state.lowHpBuff=false;
  state.partnerActiveUsed=false;   // 搭檔主動技每場次數重置
  saint.reset();   // 聖徒化狀態全重置（saintMode 經 exitSaint、清計時器、關手勢層、清 saint 旗標）
  weapon.reset();  // 雙槍破防重置（清 dualWield/dualTimer + #grid dualwield class，防跨場殘留）
  weapon.resetWeaponSwitch();   // 副武器切換鈕（ver -410）：排隊中的切換不可以跨場留著
  partner.reset(); // 搭檔被動重置（高裝藥彈 10 秒計時器清除、上膛旗標歸位）
  state.overkill=0; state.killTime=0; state.transitioning=false;
  state.counterCount=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false;
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0;   // 評價統計歸零
  _scriptedHits=0;                                     // 教學劇情殺擊數（結算受擊數扣除用）
  state.playerHp=state.playerMax;
  state.N=9; state.cols=3;
  state.runStartTime=Date.now(); resetClock();   // 計時碼表歸零（loadBoard 起算）
  state.boardTimes=[]; state.boardsCompleted=0;
  state.flawlessRun=true; state.intruderTriggered=false; state.inIntruderFight=false;
  state.deathGuardUsed=false; state.sRankUnlocked=false; state.resultMode='rematch';
  enemy.startLineup();   // 局：載序列第一隻（lineupIndex=0，含 enemyHp 基準）
  TEL.runStart({ partner:state.pickedPartner, weapon:state.equippedWeapon, boss:false });
  $('home').classList.remove('on');
  $('banner').classList.remove('on'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert');
  state.cutinPlaying=false;
  state.noSaint=false; state.noPartner=false;   // 這一場的禁令歸零（劇情插入戰於下方依卡設回）
  /* ⚠ 劇情插入戰的旗標在**這裡**依交棒變數決定，不是靠上一場自己收乾淨 ——
     「上一場結束時記得歸零」是會漏的（漏了就換成一般戰鬥變單敵、還不能聖徒化）。
     開場一律先歸零、再看這一次有沒有指定，才是不會漏的寫法。 */
  state.scriptRun=!!pendingScript; state.scriptBattleId=pendingScript; pendingScript=null;
  state.tutorialRun=false; state.tutorialStoryRun=false; state.tutorialLifeReturn=false;   // 教學場旗標歸零（tutorial 擁有；開場統一歸零、maybeStart 啟動時設回）
  /* 劇情插入戰（ver -375）：**單敵一場**，換上卡上那隻，且這一場不能聖徒化／不能用搭檔技。
     ⚠ 要在 `stopAll()`/`loadBoard(0)` **之前**換敵 —— 盤面配置（boardGrids/boardLoop）
       是查「目前這隻怪」來的，換晚了第一盤會用到上一隻的格數。 */
  const sb = state.scriptRun && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
  state.timeAttack = null; state.timeOver = false;   // 開場先歸零（同 noSaint：不要靠上一場收乾淨）
  state.weaponSound = null;                          // 武器音覆寫也是（ver -423）
  if(sb && GAME_CONFIG.enemies[sb.enemy]){
    enemy.setEnemy(sb.enemy);
    state.noSaint = !!sb.noSaint;
    state.noPartner = !!sb.noPartner;
    state.timeAttack = sb.timeAttack || null;    // 計時挑戰（ver -396，打靶場）
    state.weaponSound = sb.weaponSound || null;  // 這一場的武器音覆寫（ver -423，船艦戰）
  }
  stopAll();
  /* 這一場自己的戰鬥內對話（ver -426，例：船艦戰的反擊短教學）。
     ⚠ 要在 `stopAll()` **之後**掛：`stopAll` 會叫 `tutorial.abort()`，那一支會把它收掉。
     ⚠ 也要在 `loadBoard(0)` **之前**：loadBoard 會觸發 `board:0`，晚掛就吃不到那個節點。 */
  if(state.scriptRun && sb) tutorial.startBattleTalk(sb.talk, { once:sb.talkOnce });
  loadBoard(0); updateBars();
  if(state.scriptRun){ updateBars(); return; }   // 劇情插入戰不進教學
  tutorial.maybeStart();   // 首次出陣 → 進教學（穿插式；看過/跳過後恆 no-op）
  if(state.tutorialActive && GAME_CONFIG.tutorial){
    // 教學固定裝備：蕾妮＋機槍（原選擇暫存，goHome 還原）
    weapon.forceTutorialLoadout();
    // 教學戰：換上教學專用敵（訓練用聖徒；單敵一場，finishEnemyOrAdvance 的 tutorialRun 守門不走 lineup）
    const tk=GAME_CONFIG.tutorial.enemyKey;
    if(tk && GAME_CONFIG.enemies[tk]) enemy.setEnemy(tk);
    // 敵人血量覆寫（撐到腳本終盤；經 initEnemyHp 具名管道）
    if(GAME_CONFIG.tutorial.enemyHp) initEnemyHp(GAME_CONFIG.tutorial.enemyHp);
    updateBars();
  }
}
/* 劇情插入戰的入口（ver -375）：main.js 的 battleHandler 查到 `config.battles[id]` 就走這支。
   ⚠ 旗標要在 `startGame()` **之前**設 —— 開場那一段會依它換敵、跳過教學。 */
let pendingScript = null;   // 下一次 startGame 要開的插入戰 id（交棒用，見 startGame）
export function startScriptBattle(id){
  pendingScript = id;
  startGame();
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
  state.atkBuff=false; state.lowHpBuff=false;
  state.partnerActiveUsed=false;   // 新場：搭檔主動技每場次數重置
  saint.reset();
  weapon.reset();
  partner.reset();
  state.overkill=0; state.killTime=0; state.transitioning=false;
  state.counterCount=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false;
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0;   // 評價統計歸零
  _scriptedHits=0;                                     // 教學劇情殺擊數（結算受擊數扣除用）
  state.playerHp=state.playerMax; state.enemyHp=state.enemyMax;
  state.N=9; state.cols=3;
  state.runStartTime=Date.now(); resetClock();   // 新場：計時碼表歸零
  state.boardTimes=[]; state.boardsCompleted=0;
  state.flawlessRun=true; state.deathGuardUsed=false;
  state.sRankUnlocked=false; state.resultMode='rematch';
  enemy.setEnemy(GAME_CONFIG.intruder.enemy);   // 載槍之魔女（含 Boss 大絕/懲罰/彈痕 config）
  TEL.runStart({ partner:state.pickedPartner, weapon:state.equippedWeapon, boss:true });
  $('home').classList.remove('on');
  $('banner').classList.remove('on'); $('banner').classList.remove('seq'); $('banner').classList.remove('lose');
  $('transition').classList.remove('on');
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert');
  state.cutinPlaying=false;
  stopAll();
  loadBoard(0); updateBars();   // loadBoard 內含 scheduleOpeningUlt → 重啟敵大絕排程
}
// 全螢幕黑幕過場：淡出（轉黑）→ 全黑時執行 mid() 切畫面 → 淡入（浮現）。約 2×half ms。
let _fadeOv=null;
function fadeTransition(mid, half){
  const ms = half || 1400;
  let ov=_fadeOv;
  if(!ov){
    ov=document.createElement('div'); ov.id='fadeOverlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9000;background:#000;opacity:0;pointer-events:none;';
    document.body.appendChild(ov); _fadeOv=ov;
  }
  ov.style.transition='opacity '+ms+'ms ease';
  ov.style.pointerEvents='auto';
  void ov.offsetWidth;
  ov.style.opacity='1';                      // 淡出（轉黑）
  setTimeout(()=>{
    if(mid) mid();                           // 全黑瞬間切畫面
    void ov.offsetWidth;
    ov.style.opacity='0';                    // 淡入（浮現）
    setTimeout(()=>{ ov.style.pointerEvents='none'; }, ms);
  }, ms);
}
// onCovered（選填）：黑幕全蓋瞬間的接續回呼——跳過教學→出擊整備用（蓋著開新畫面不露餡，
//   單次淡出淡入直達，不會先閃一下主選單/整備頁再轉場一次）。
/* opts.noBgm＝黑幕下不起播主選單 BGM。劇情把戰鬥叫起來時用：黑幕之下要接的是
   劇情自己的曲子，起了主選單 BGM 只會在交棒的那一秒漏出半句（Ray：「BGM 切乾淨」）。 */
export function goHome(onCovered, opts){
  fadeTransition(()=>{                        // 回主選單：淡出淡入約 3 秒
    state.over=true; stopAll();
    weapon.restoreTutorialLoadout();          // 教學固定裝備（蕾妮＋機槍）→ 還原玩家原選擇（非教學為 no-op）
    state.cutinPlaying=false;                 // 清掉可能的暫停旗標（退出確認用）
    $('banner').classList.remove('on'); $('banner').classList.remove('lose');
    $('transition').classList.remove('on');
    const sr=$('sentouReward'); if(sr) sr.classList.remove('on','done');   // 銭湯獎勵層：黑幕全蓋後才收（見 inspector）
    $('home').classList.add('on');
    if(!(opts && opts.noBgm)) SFX.playBgm(asset('bgm_home'), { volume: bgmVol('bgm_home') });   // 主選單 BGM
    if(typeof onCovered==='function') onCovered();
  }, 1400);
}

/* ============================================================================
 *  教學腳本原語（注入 tutorial 使用；非教學不會被呼叫）
 * ========================================================================== */
// 劇情殺三連擊：「小心！」收段後依 config.tutorial.strike.hits 分次攻擊——
//   三種受擊畫面各出一次（kind 對應該敵 hitFx：delay=血痕/ult=三爪/wrong=紅刀痕），
//   傷害為真實值（不受教學 enemyAtkDamage=2 管制）；非末擊絕不打死（至少留 1 HP），
//   末擊必致死 → 蕾妮即死防禦保 1 HP＋cut-in。
//   保險：當前搭檔無即死防禦（或已用掉）時末擊退化為「打到剩 1 HP」，不讓教學直接戰死。
function tutorialStrike(){
  const st=(GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.strike) || {};
  const hits=st.hits || [{kind:'ult', dmg:999}];
  const gap=st.gapMs || 700;
  hits.forEach((h,i)=>{
    setTimeout(()=>{
      if(state.over || state.saintMode) return;
      const last = (i === hits.length-1);
      let dmg = h.dmg;
      if(!last){
        // 非末擊：至少留 1 HP。血已見底則 0 傷照打——受擊演出（第二擊三爪）必須出現，
        // 不因玩家先前掉血過多而被跳過
        dmg = Math.min(dmg, Math.max(0, state.playerHp-1));
      }else{
        const p=GAME_CONFIG.partners[state.pickedPartner];
        const guardOk = p && p.passive && p.passive.key==='deathGuard' && !state.deathGuardUsed;
        dmg = guardOk ? state.playerHp + 50 : Math.max(1, state.playerHp - 1);
      }
      _scriptedHits++;            // 本擊為腳本演出（結算受擊數扣除）
      enemyAttack(dmg, h.kind);
    }, i*gap);
  });
}
// 教學陣亡「重來」＝該段重來：滿血、即死防禦歸還、清雙槍/威脅狀態、重建當前盤面。
//   教學步驟旗標不動（已看過的對話不重播）；敵血維持現值（教學夾底 1 不會被誤殺）。
function tutorialSegmentRestart(){
  state.playerHp = state.playerMax;
  state.deathGuardUsed = false;          // 每次重試都還原即死防禦（劇情殺腳本依賴它保命）
  if(state.dualWield) weapon.endDual();  // 死在雙槍窗口 → 收窗（避免殘留旗標/盤面樣式）
  defense.resetEnemyTimers();            // 清場上紅點與大絕排程（loadBoard 會重排開場保證）
  clearAtkBuff();
  updateBars();
  loadBoard(state.boardIndex);           // 重建當前盤（interval/碼表/開場大絕一併重置）
}
// 敵殘血封頂：聖徒化收尾後把敵血壓到 finishEnemyHp 以下，保證玩家「本盤」就能殺進
//   overkill 結束教學戰；跳過教學時也用它把覆寫的高血量收回該敵 config 值。
function tutorialCapEnemyHp(maxHp){
  if(maxHp==null) return;
  if(state.enemyHp>maxHp){ state.enemyHp=maxHp; updateBars(); }
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

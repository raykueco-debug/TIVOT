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
import { state, initEnemyHp, setPickedPartner } from '../state.js';
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
import * as prog from '../script/progress.js';      // 持久 HP／talkOnce 打贏才記（葉節點，無循環）

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
/* 聖徒化倒數槽的被動速度（滿槽需要幾秒）。⚠ 惡夢化把「受擊值多少秒」換算回來時要用
   （ver -691，見 enemyAttack 的 niMode 分支）—— 與 saint.js 讀的是同一格（鐵律 7）。 */
const SAINT_PASSIVE_HEAL_SEC=T.saintPassiveHealSec;

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
let _scriptedAtk  = false;   // 現在這一擊是腳本演出（劇情殺）——不算玩家的失誤（ver -619）

/* ============================================================================
 *  啟動：注入 api 與開機閒置畫面（由 main.js 調度）
 * ========================================================================== */
export function setup(){
  // combat 把自己擁有的狀態變動原語注入下游模組，切斷反向依賴
  //   onThreatSpawned/onThreatResolved：教學「首紅點/首次防禦成功」節點通知
  //   ultSuppressed/firstThreatPending：教學暫緩大絕（一次一顆/腳本盤）與首顆固定位
  //   （defense 不 import tutorial，經此轉交）
  defense.init({ enemyAttack, enemyDamage, floatDmg, triggerAtkBuff, weaponCounter: weapon.weaponCounter,
                 resetIntervalDeadline,   // 反擊硬直：被反擊時延時歸零（ver -495，卡上 counterStagger）
                 onThreatSpawned: tutorial.onThreatSpawned,
                 /* ⚠ 一次防禦判完 → **固定模式的副武器歸位一順位**（ver -422，Ray 指定）。
                    這裡是唯一的呼叫點（鐵律 8）：defense 不 import weapon，
                    所以由 combat 這個協調者把兩件事串起來。 */
                 /* ⚠ `g==='counter'` 才算「完美反擊」（ver -719，Ray 指定）——
                    黃圈與橘圈自 -706 起也會開火，但那不是**完美**反擊。
                    判定放在這裡是因為只有 defense 分得出帶（鐵律 7）。 */
                 onThreatResolved: (g)=>{ weapon.onThreatResolved(); tutorial.onThreatResolved(g);
                                          if(g==='counter') partner.onCounter(); },
                 hintCurrentCell,   // 紅點解決了就指一下正確格（ver -718，見 tuning.hintNextCell）
                 lucidPerfect: partner.lucidActive,   // 明晰之夢發動中＝全帶皆完美反擊（ver -740）
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
    strikeTo: tutorialStrikeTo,           // 一擊打到剩 N 血（ver -671，惡夢化那一場）
    nightmare: saint.activateNightmare,   // 惡夢化（ver -671）：閘門 `action:'nightmare'`
    nightmareActive: saint.nightmareActive,  // 惡夢化的自爆（ver -672）：閘門 `action:'niBurst'`
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
    /* 反擊成功 → 通知搭檔的被動（ver -693，明晰之夢：每隻怪第一次反擊時發動）。 */
    /* ver -719：明晰之夢改由 `onThreatResolved` 的判定等級觸發（只有紅圈），
       weapon 那一支已成空殼 —— 這一條留著，日後「開火就觸發」的被動可以接回去。 */
    onCounter: partner.onCounter,
  });
  // 聖徒化：combat 為協調者，把 combat/defense/partner 的原語打包注入 saint，
  //   saint 不直接 import 其他業務模組（維持 §2 依賴方向）。改血一律走本檔 HP API（Part A）。
  saint.init({
    // 統一改血 API（Part A）
    healPlayer, setPlayerHpRatio, drainPlayer,
    // 教學掛鉤：倒數槽臨界攔截（引導生命歸還）＋結局通知（MB/生命歸還後的收尾台詞）
    onSaintCritical: tutorial.onSaintCritical,
    saintCriticalPending: tutorial.saintCriticalPending,   // 還有人在等 99% 那一拍嗎（ver -619）
    niBurstPending: tutorial.niBurstPending,               // 還有人在等「自爆」那一拍嗎（ver -705）
    onSaintEnded: tutorial.onSaintEnded,
    // combat 盤面/傷害/UI 原語
    buildGrid, updateBars, startIntervalTimer, resetIntervalDeadline,
    hitDamage, enemyDamage, floatDmg, markNext, setBoard, resetEnergy,
    onEnemyDefeated: finishEnemyOrAdvance,   // 聖徒化擊殺 → 轉下一敵 or（最後一敵）結算（連戰）
    hintCurrentCell,                         // 惡夢化發動時高光第一個該點的號碼（ver -683）
    /* 惡夢化收尾要補判一次被動的門檻（ver -688）：期間不發動，退掉才發動。 */
    checkLowHpBuff: partner.checkLowHpBuff,
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
    updateBars, floatDmg, healPlayer,   // healPlayer：生命歸還回滿用（ver -740）
    resetEnemyTimers: defense.resetEnemyTimers,
    scheduleUlt: defense.scheduleUlt,
    playCutin: saint.playCutin,
    hintCurrentCell,   // 即死防禦後標記當前應點格（一次性續命導航）
    lucidFlood,        // 明晰之夢的金光淹漲時限（ver -746；發動端在 partner.fireBuff）
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
  /* ⚠ `screenShake` 給「降臨」的著地那一拍用（ver -640）——
     震動的實作只有 combat 這一支（鐵律 8），enemy 不自己加 class。 */
  enemy.init({ startIntruderFight, updateBars, screenShake,
    /* 換了一隻怪 → 明晰之夢重新上膛（ver -693，Ray：「不算場，每隻怪都可以觸發一次」）。
       ⚠ 掛在 `setEnemy` 是因為那是**「換了一隻怪」的唯一時刻**（開場、連戰換敵、
         Boss 亂入都經過它）—— 在別的地方各補一次一定會漏（鐵律 8）。 */
    onEnemySet: partner.armFirstCounter });
}
export function bootIdle(){
  // 開機停在首頁：先建立盤面/血條供背景顯示，但 over=true 讓計時與敵人不啟動
  enemy.applyConfigToDOM();
  state.over=true;
  loadBoard(0); updateBars();
  armClaspLayout();   // 破防計量照實際血條位置取景（ver -527）
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
  /* 明晰之夢發動中＝**每一格**都指引（ver -740，Ray：「發動期間會指引每一個
     應點格」）—— `hint:false` 的盤也照指。markNext 在每次點對與每次換盤都會跑，
     所以「指引每一格」就是把這一道門讓開（發動那一刻的第一格由 partner 的
     fireBuff 叫 hintCurrentCell 指）。 */
  if(!(BOARDS[state.boardIndex]||BOARDS[BOARDS.length-1]).hint && !partner.lucidActive()) return;
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
  /* 惡夢化（ver -671）：與聖徒化同一個位置分流 —— 兩者不可能同時成立。 */
  if(state.niMode){ saint.nightmareTap(num, cell); updateStatus(); return; }

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
    if(Math.random() < critRateAt(state.critCombo)){
      okCrit=true; okDmg*=(1 + critDmgAt(state.critCombo));
    }
    state.critCombo++;
    saint.onSaintTap();                  // 九階「源泉」：連續 3 發 → 微量延長聖徒化（ver -707）
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
    if(Math.random() < critRateAt(cc)){
      crit=true; dmg*=(1 + critDmgAt(cc));
    }
    state.critCombo++;
    enemyDamage(Math.round(dmg),crit,false,'basic');   // 點擊直接扣敵血（crit=true → 敵區跳紅字「暴擊」）
    /* 即死防禦的免傷窗（ver -740，Ray：「期間普攻每次回血2%」）：比例在
       諾薇兒的卡上（`immuneHealPct`），窗關著回 0 —— 生命歸還的免傷不回血。
       這個分支必為普攻（聖徒化／雙槍走上面的獨立分支），不必再判模式。 */
    { const gp=partner.guardHealPct();
      if(gp>0) healPlayer(Math.max(1, Math.round(state.playerMax*gp))); }
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
  /* 九階強化「交界點」：反擊後的增益延長（ver -707）。加在這唯一的發動點。 */
  sec = (sec||ATK_BUFF_SECONDS) + prog.starBonus('buffSec');
  state.atkBuff=true;
  $('grid').classList.add('buffed');
  clearTimeout(state.atkBuffTimer);
  state.atkBuffTimer=setTimeout(()=>{
    state.atkBuff=false;
    if(!state.lowHpBuff) $('grid').classList.remove('buffed');
    updateStatus();
  }, sec*1000);
  updateStatus();
}
/* 低血量普攻加倍（馬季諾「高裝藥彈」）開/關管道：partner.checkLowHpBuff 經注入呼叫。
 * lowHpBuff 為 combat 擁有（3.8）；狀態型、無計時器，跨盤跨怪（clearAtkBuff 不碰它）。 */
function setLowHpBuff(on){
  state.lowHpBuff=!!on;
  if(on) $('grid').classList.add('buffed');
  else if(!state.atkBuff) $('grid').classList.remove('buffed');
  /* 明晰之夢的金光淹漲（見下）：buff 收掉的那一刻＝技能結束＝到頂爆散。
     馬季諾的 lowHpBuff 沒開過金光（lucidFlood 只有安雅那條在叫），這裡冪等。 */
  if(!on) clearLucidFlood(true);
}

/* ══ 明晰之夢的時限視覺（ver -746，Ray：「技能的結束時間讓盤面的底色從下方
   淹起金光，圖層在數字的背後，金光到頂就爆散，技能結束。金光的末端要高亮」）══
   一片 `.lucid-flood` 疊在 #gridWrap 上、罩住 #grid 的範圍，高度用 CSS transition
   以技能秒數線性長到頂 —— 到頂的同一刻 fireBuff 的計時器把 buff 收掉，
   setLowHpBuff(false) 叫 clearLucidFlood(true) 演爆散。樣式全在 style.css（鐵律 1）。
   ⚠ 掛在 #gridWrap 不掛 #grid：buff 會跨盤，而 buildGrid 每換一盤就把 #grid
     的子節點整批洗掉 —— 掛進去金光活不過一盤。位置在建立那一刻現量一次
     （盤與盤之間 #grid 的外框不變，量一次就夠）。 */
let lucidFloodEl=null;
function lucidFlood(sec){
  clearLucidFlood(false);
  const wrap=$('gridWrap'), grid=$('grid');
  if(!wrap || !grid || !(sec>0)) return;
  const wr=wrap.getBoundingClientRect(), gr=grid.getBoundingClientRect();
  if(!gr.height) return;                      // 盤面沒顯示就不擺（量到 0 的通病，§6.5.4）
  const el=document.createElement('div');
  el.className='lucid-flood';
  el.style.left=(gr.left-wr.left)+'px';
  el.style.width=gr.width+'px';
  el.style.bottom=(wr.bottom-gr.bottom)+'px';
  el.style.height='0px';
  wrap.appendChild(el);
  lucidFloodEl=el;
  /* 隔一幀才給 transition＋目標高度：同一幀設起點與終點會被合併成一次計算，
     整段跳掉（同 story.veil 那條 offsetWidth 的理由）。 */
  void el.offsetWidth;
  el.style.transition='height '+sec+'s linear';
  el.style.height=gr.height+'px';
}
function clearLucidFlood(burst){
  const el=lucidFloodEl; lucidFloodEl=null;
  if(!el) return;
  if(burst){
    el.classList.add('burst');
    setTimeout(()=>{ try{ el.remove(); }catch(_){} }, 650);
  } else { try{ el.remove(); }catch(_){} }
}

function clearBoard(){
  SFX.clear();                      // 清盤：神聖鈴響
  clearAtkBuff();                   // 攻擊加倍 buff 不跨盤
  const elapsed=(Date.now()-state.boardStartTime)/1000;
  recordBoardTime(elapsed);
  // 清盤 bonus 聖能：僅在本盤全程無出錯、未受擊時給予（依清盤速度）
  if(state.boardClean){
    /* 完美清盤 +1（ver -659，Ray：「完美清盤一次 −1 秒」）。
       ⚠ 條件就是既有的 `boardClean`，不另訂一套（鐵律 7）—— 給聖能與給折秒
         是**同一件事**的兩個獎勵。折算的秒數在 `config.rating.penalty.perfectBoard`。 */
    state.perfectBoards++;
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
/* 主槍的永久強化（ver -655，北方泊地槍店）。⚠ **只有這一支在算**（鐵律 7）：
   資料在 `tuning.gunTune`、旗標在 progress，這裡只是把兩者接起來。
   ⚠ 不快取成模組常數（像 `DMG_BASE` 那樣）：旗標是**遊戲中途**才立的，
     而模組常數是 import 那一刻就定死的 —— 那樣強化要重整頁面才生效。 */
/* ══⚠⚠ 主武器的傷害倍率（ver -699）══════════════════════════════════════
   **只有這一支在算**（鐵律 7）：槍店的永久強化（`tuning.gunTune`）＋兩支槍
   掛件槽上的強化護符（`items.defs[].charm.dmgMul`），一起乘出來。
   ⚠ 護符要別的效果（暴擊、破防、聖能）就在**這裡**加一支對應的取值函式，
     不要在各處自己乘一次 —— 那正是鐵律 7 反覆踩過的那個坑。
   ⚠ 不快取：旗標與掛件都是**遊戲中途**才變的（同 gunTuneMul 原本的理由）。 */
function charmDmgMul(){
  const MG=GAME_CONFIG.mainGun; if(!MG || !MG.barrels) return 1;
  const defs=(GAME_CONFIG.items||{}).defs||{};
  let m=1;
  for(const b of MG.barrels){
    const d = defs[prog.charmOf(b.id)];
    const c = d && d.charm;
    if(c && isFinite(c.dmgMul)) m *= c.dmgMul;
  }
  return m;
}
function mainGunDmgMul(){ return gunTuneMul() * charmDmgMul(); }
/* ══ 普攻暴擊：率與加傷（ver -707）══ 兩處點擊分支（聖徒化／一般）**共用這兩支**
   （鐵律 7）—— 九階強化的「運之王」（率 +10%）與「王之運」（加傷 +20%）
   只加在這裡。 */
function critRateAt(cc){ return CRIT_BASE_RATE + cc*CRIT_PER_COMBO + prog.starBonus('critRate'); }
function critDmgAt(cc){  return CRIT_DMG_BASE  + cc*CRIT_DMG_PER_COMBO + prog.starBonus('critDmg'); }
/* ver -707：普攻的永久強化＝九階裡的**吞噬者**（可多次，每次 +5%）。
   ⚠ -700 的線性等級已退役，舊存檔由 `progress.gunStars` 自動遷移成吞噬者的次數。 */
function gunTuneMul(){ return 1 + prog.starBonus('dmgMul'); }
function hitDamage(){
  const c=Math.min(state.combo,DMG_COMBO_CAP);
  /* ⚠ 強化是**乘在整個普攻傷害上**（ver -656，Ray：「主槍普攻攻擊力強化5%」）——
     連擊加成也一起放大，那才是「攻擊力 +5%」。 */
  return (DMG_BASE + c*DMG_PER_COMBO) * mainGunDmgMul();
}
function floatDmg(txt,left,top,crit,extraClass){
  const d=document.createElement('div');
  d.className='dmgnum'+(crit?' critnum':'')+(extraClass?' '+extraClass:''); d.textContent=txt;
  d.style.left=left; d.style.top=top; $('fxTop').appendChild(d);
  setTimeout(()=>d.remove(),700);
}
// 被攻擊：扣玩家血 + 受擊特效 + 震動（saintMode 分支下一輪接）
/* 命中敵人 → 牠被打得一縮（ver -598，Ray：「我方攻擊命中敵人，敵人也要震動或
   其他更好的效果」）。演出在 CSS 的 `enemyHit`，這裡只負責**每一發都重播**：
   ⚠ 一定要 remove → reflow → add，不然連點時第二發之後動畫不會重來
     （class 已經在身上）—— 那正是原本「幾乎看不出來」的一部分原因。
   ⚠ 只動 `#enemyImg`，背景不動（ver -592）；玩家受擊那一下才是整個畫面震（-593）。 */
function enemyHitFlash(){
  const el=$('enemyImg'); if(!el) return;
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  clearTimeout(enemyHitFlash._t);
  enemyHitFlash._t=setTimeout(()=>el.classList.remove('hit'), 180);
}
/* 玩家受擊 → 整個畫面震一下（ver -593，Ray 指定）。
   ⚠ 掛在 `#app`（＝鏡頭）不是 `#enemyImg`：背景與怪一起動才讀得出「你被打到了」。
   ⚠ 只有這一支在做（鐵律 8）—— `enemyAttack` 是所有扣血路徑的唯一入口，
     兩個分支（聖徒化／一般）都叫它。 */
function screenShake(){
  const el=$('app'); if(!el) return;
  el.classList.remove('hitshake'); void el.offsetWidth; el.classList.add('hitshake');
  clearTimeout(screenShake._t);
  screenShake._t=setTimeout(()=>el.classList.remove('hitshake'), 300);
}
function enemyAttack(dmg, kind, saintAmt){
  saint.resetSaintCombo();   // 受擊／點錯／逾時 → 連擊斷（九階「源泉」，ver -707）
  /* ⚠⚠ **失誤之後指一下正確的格子**（ver -717，Ray 指定）。掛在**這一支**是因為
     大絕／延時／按錯／格擋四條扣血路徑全部經過它 —— 守一次就全吃到（鐵律 8），
     與上面那兩行（震動、連擊歸零）同一個理由。
     ⚠ 擺在 `timeAttack` 的守門**之前**：打靶不扣血、那一支會提早 return，
       但「點錯了指一下」在打靶一樣成立（那裡的代價是秒數不是血）。
     ⚠ 走既有的 `hintCurrentCell`（即死防禦續命導航／惡夢化發動同一支，鐵律 8）——
       它自己會擋掉聖徒化（那一盤可以亂點，指一格反而誤導）、擋掉演出中與敵已死。 */
  if(T.hintNextCell) hintCurrentCell();
  /* ⚠ 計時挑戰：靶子**不攻擊**（ver -396）。守在這裡是因為所有會扣玩家血的路徑
     （大絕／延時懲罰／按錯懲罰／格擋）都經過這一支 —— 守一次就全關掉（鐵律 8）。 */
  if(state.timeAttack) return;
  /* 受到敵人主動攻擊 → 震一下（ver -398，Ray 指定）。⚠ 守在這裡就涵蓋了所有扣血路徑
     （大絕／延時／按錯／格擋），與這一支「唯一入口」的定位一致（鐵律 8）。 */
  hap.hit();
  /* 受擊＝連擊歸零（ver -522，Ray：「只要受擊就歸0」）。
     ⚠⚠ ver -527 修：-522 的插入錨點「if(state.saintMode){」在檔案裡第一次出現
       是 markNext（**每一次點擊**都跑）—— 連擊每點先歸零再 +1 ＝「計數永遠在 1」
       （Ray 連報兩次）。守在這裡才是「受擊」的唯一入口。 */
  state.combo=0;
  if(state.over) return;
  /* ══⚠⚠ `kind` 有**兩個用途**，ver -600 之後不再是同一個值（ver -619 修）══
     · **計數**（評價的失誤秒數）要分得出「挨了大絕」與「擋下一半」→ 'ult' / 'block'
     · **演出**（音效、受擊特效）分不出來：敵人卡上只有 ult/delay/wrong 三格
       —— 'block' 就是「大絕擋了一半」，演出一律讀成 'ult'。
     ⚠ 這是 ver -600 留下的破口：那一版把格擋的呼叫由 'ult' 改成 'block' 卻沒有
       別名，於是 `curEnemySound['block']`／`hitFx['block']` 全部查不到 ——
       格擋的敵大絕音沒了、受擊特效退回預設的三爪。 */
  const fxKind = (kind==='block') ? 'ult' : kind;
  /* ══⚠⚠ **失誤計數**（ver -619 補）══ ver -600 定了 `penUlt`／`penBlock`／`penDelay`
     這三個欄位、結算也在讀它們，**但從來沒有人 ++** —— 於是新評價的懲罰秒數
     永遠只有「點錯」那一項，挨大絕／格擋／延時全部免費。
     （那就是「用滑鼠點都可以每場 S」的真正原因，timeK 一路被推到 550 也壓不住。）
     ⚠ 守在這裡＝所有扣血路徑的唯一入口（鐵律 8）。
     ⚠ **腳本演出的擊數不算**（劇情殺三連擊）：那不是玩家的失誤，同 `_scriptedHits`。
     ⚠ 放在聖徒化分支**之前**：聖徒化期間挨打不掉血，但那一擊照樣把倒數槽推短，
       仍是失誤。 */
  if(!_scriptedAtk){
    if(kind==='ult') state.penUlt++;
    else if(kind==='block') state.penBlock++;
    else if(kind==='delay') state.penDelay++;
    // 'wrong' 由 state.wrongTaps 記（點錯那一支自己的計數），不重複記
  }
  // 敵攻擊音：依 kind 播該怪對應音（ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。
  const sk = state.curEnemySound && state.curEnemySound[fxKind];
  if(sk) SFX.play(asset(sk), sfxGain(sk));   // 受擊層增益（全域響度階層見 tuning.sfxGain）
  if(state.saintMode){
    // 聖徒化期間敵攻擊不扣血：改推進倒數槽（推滿＝OBE）。視覺（震動/受擊特效/紅閃）留在 combat，
    //   倒數槽推進交由 saint.saintAdvance（內部走 HP API healPlayer，滿則觸發 OBE）。
    //   推進量：一般受擊＝playerMax/SAINT_ADVANCE_DIVISOR（≈+1s）；格擋由呼叫端傳 saintAmt（≈+0.5s）。
    const amt=(saintAmt!=null)?saintAmt:(state.playerMax/SAINT_ADVANCE_DIVISOR);
    screenShake();                   // 畫面震一下（ver -593）
    enemy.showHitFx(fxKind);
    $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
    saint.saintAdvance(amt);
    return;
  }
  /* ══⚠⚠ **惡夢化期間也一樣不扣「原始傷害」**（ver -691，Ray：「夢魘時被攻擊血掉得
     好像比聖徒化快很多？讓兩邊因受擊所減少的持續時間一致」）══
     那條倒數槽的單位雖然是血，但它量的是**時間** —— 直接扣敵人的攻擊力，
     一發大絕（22）在 12.8 秒的槽上就吃掉 2.9 秒，而聖徒化的同一發只吃 1 秒；
     而且它會隨**敵人的攻擊力**變動（換一隻怪手感就不一樣）。
     ⚠ 作法：把「這一發值多少秒」交給 saint 換算（`saint.niHitSeconds`），
       兩邊用**同一個秒數**（`saintPassiveHealSec / saintAdvanceDivisor`；格擋照舊減半）。
     ⚠ 演出（震動／受擊特效／紅閃）與計數（penUlt…）照走 —— 只換「掉多少」。 */
  if(state.niMode){
    const sec = (saintAmt!=null)
      ? (saintAmt / (state.playerMax/SAINT_PASSIVE_HEAL_SEC))   // 格擋那一半：換算回秒
      : (SAINT_PASSIVE_HEAL_SEC / SAINT_ADVANCE_DIVISOR);
    screenShake();
    enemy.showHitFx(fxKind);
    $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
    saint.nightmareHit(sec);
    return;
  }
  SFX.hit();                         // 受擊撞擊音
  state.boardClean=false;            // 受擊 → 本盤取消清盤破防獎勵
  state.critCombo=0;                 // 受擊中斷：暴擊連擊歸零（延時懲罰/按錯重擊/大絕/格擋掉血皆經此路徑）
  state.hitsTaken++;                 // 評價受擊數（此路徑＝真實掉血；=0 即無傷 gate）
  state.enemyHitsTaken++;            // 這一隻的受擊數（九階「方舟」，ver -708）
  /* 真實受擊 → 整場無傷旗標取消。⚠ **腳本演出的那幾擊不算**（劇情殺三連擊，
     ver -620，Ray：「如果玩家除此之外無傷的話一樣記無傷」）—— 同 `_scriptedHits`
     從 `hitsTaken` 扣掉的作法，兩者要一致，不然畫面上標了無傷、旗標卻是假的。 */
  if(!_scriptedAtk) state.flawlessRun=false;
  /* ══ 免傷窗（ver -740，Ray：「免傷仍算受擊，只是不扣血」）══
     即死防禦／生命歸還開的那扇窗（partner.immuneActive）——
     受擊計數、破無傷、失誤折秒、震動特效**全部照走**（上面一行都沒跳過），
     只有扣血這一行不做。與鎖血同一個位置、同一個理由：手感不失真。 */
  const immune = partner.immuneActive();
  if(immune && dmg>0) floatDmg((L.battle.immune||'免傷'),'50%','46%',true);
  // 鎖血（管理人測試，ver -463）：只擋掉血這一行——上面的特效/計數照走，手感不失真
  if(!state.hpLock && !immune) state.playerHp=Math.max(0,state.playerHp-dmg);
  updateBars();
  tutorial.onHpChange();             // 血量觸發（ver -599）：玩家這一側（`php:N`）
  enemy.showHitFx(fxKind);           // 依 kind 播放該怪對應受擊特效（'block' 讀成 'ult'）
  $('redFlash').style.opacity=.8; setTimeout(()=>$('redFlash').style.opacity=0,120);
  screenShake();                     // 畫面震一下（ver -593，取代原本只抖敵人立繪那一版）
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
  /* 血量觸發（ver -599）：聖徒化期間那條倒數槽走的就是回血這一支 ——
     「血回到 99% 自動觸發主動技教學」靠它（`php:99`）。 */
  tutorial.onHpChange();
  return state.playerHp;
}
/* ══⚠⚠ **抽血**（惡夢化的倒數槽，ver -672）══════════════════════════════
   ⚠ **不可以用 `healPlayer(-x)`**：那一支開頭就 `Math.max(0, amount)` ——
     負數被吃掉，什麼事都不會發生（-671 就是這樣，血是被敵人打掉的，
     倒數槽其實一格都沒動）。
   ⚠ 也**不可以走 `enemyAttack`**：那是「被打到」—— 會記失誤、破無傷、震畫面。
     惡夢化的失血是**它自己的代價**，不是敵人造成的。
   ⚠ 夾在 1：抽到 0 是陣亡，而規格是「剩 hp1 熔斷」。 */
export function drainPlayer(amount){
  const cut=Math.max(0, amount||0);
  state.playerHp=Math.max(1, state.playerHp-cut);
  updateBars();
  tutorial.onHpChange();
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
  /* 依**武器類別**的弱點（ver -500，羽蛇卡：「散射武器＋150%」）：
     鑰匙寫成 `cat:<類別>`（例 `cat:霰彈槍`），只對**反擊**傷害生效 ——
     反擊打出去的就是當下裝備的副武器（state.equippedWeapon）。 */
  if(src==='counter' && Wk){
    const w=(GAME_CONFIG.weapons||{})[state.equippedWeapon];
    if(w && Wk['cat:'+w.cat]) k += Wk['cat:'+w.cat];
  }
  if(state.dualWield && state.enemyDualBonus) k += state.enemyDualBonus;
  return Math.max(1, Math.round(dmg * Math.max(0, k)));
}
function enemyDamage(dmg,isCrit,silent,src){
  dmg = applyEnemyMods(dmg, src||'basic');
  // 教學：段落未播完前（tutorialActive）敵不可被打死——致死傷害夾到留 1 HP。
  //   防 EXSECUTIŌ／聖徒化中擊殺跳過最後一段教學（finishMB/LR 播完 endTutorial 後才解鎖擊殺）。
  if(state.tutorialActive && dmg>=state.enemyHp && state.enemyHp>0){
    dmg = state.enemyHp - 1;
    if(dmg<=0){ enemyHitFlash(); return; }
  }
  if(dmg>0){
    if(state.enemyHp>0){
      const after=state.enemyHp-dmg;
      if(after<0) state.overkill+=(-after);
      state.enemyHp=Math.max(0,after);
      tutorial.onHpChange();          // 血量觸發的 talk 步驟（ver -599）
      updateBars();
      tutorial.onEnemyHp(state.enemyHp/state.enemyMax);   // 教學：削血保底觸發（非教學為 no-op）
      if(!silent) floatDmg((isCrit?L.battle.crit:'')+dmg, (30+Math.random()*40)+'%','35%',isCrit);
      if(state.enemyHp<=0){
        if(state.killTime===0) state.killTime=Date.now();   // 敵死標記（OVERKILL 起點）
        /* ⚠⚠ **overkill 現在照樣計時**（ver -611，Ray：「那 ovk 改計時，一格減 0.1 秒」）。
           以前這裡 `clockPause()`＝overkill 完全不計時，於是那一段是**白拿的**：
           每一格還倒扣秒數，堆個三十格就白送六秒（timeK 600 之下＝12 分）。
           現在碼表照走、每一格只折抵 0.1 秒 —— 想賺就得真的花時間去敲，
           划不划算變成玩家的判斷，那才是取捨。
           ⚠ 碼表由 `win()`／`advanceEnemy()` 收（兩邊本來就有 `clockPause`），
             這裡不收也不會漏掉。 */
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
  enemyHitFlash();
}

/* ============================================================================
 *  聖能（本輪只累積與 C 字計量表視覺；雙槍發動下一輪接）
 * ========================================================================== */
function addEnergy(v){
  if(state.saintMode) return;        // 聖徒化期間不累積破防值
  const was=state.energy;
  /* 九階強化「疾走」：破防值累積加速（ver -707）。⚠ 乘在**入口**這一處 ——
     呼叫端有好幾個（點擊、反擊…），各自乘一次必然漏掉其中一個（鐵律 7/8）。 */
  state.energy=Math.min(100,state.energy+v*(1+prog.starBonus('energyMul')));
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
  const clasp=$('claspMoonFill')||$('energyClasp'); if(!clasp) return;   // 光圈以月牙本體為中心（-539）
  const r=clasp.getBoundingClientRect();
  const d=document.createElement('div'); d.className='energy-burst';
  d.style.left=(r.left+r.width/2)+'px';
  d.style.top =(r.top +r.height/2)+'px';
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 900);
}
/* ══ 破防計量的取景（ver -539：Ray 交了月牙原圖，整支改成「圖直接鋪」）════
   -536~-538 用比例參數化仿他的畫連錯四版 —— 那條路廢除（HANDOFF 的結論）。
   形狀＝`clasp_moon.webp`（他畫的 alpha 月牙）本身，程式只管三件事：
     ① 大小/位置錨定血條（S＝紅頂→藍底，§6.5 老原則：取景算成常數，之後只讀）
     ② 空圈＝同輪廓描邊圖（frame；Ray：「未充滿時是透明框」）
     ③ 計量＝conic-gradient 遮罩，由下月角**順時針**掃到上月角（Ray 拍板）
   ── MOON＝那張圖量出來的常數（缺口中心對 360° 射線掃出月角；換圖要重量）──
   量測對象：resources/_originals/vfx/clasp_moon_raw.png（276×272）。 */
const MOON={
  ar : 276/272,             // 圖的寬高比
  nx : 0.6957, ny : 0.4412, // 缺口中心佔圖比例（連擊數的錨＝掃掠的軸心）
  a0 : 165,                 // 下月角（CSS conic 慣例：0°=正上、順時針增加）
  arc: 258.2,               // 下角→上角的掃角（順時針）
};
let claspSig='';
let claspGeo=null;                                      // 遮罩/連擊數用的幾何（layoutClasp 算好，update 只讀）
function layoutClasp(){
  const host=$('energyClasp'); if(!host) return;
  const frame=$('claspMoonFrame'), fillImg=$('claspMoonFill');
  const blue=document.querySelector('.hpbar.player-bar'), red=document.querySelector('.hpbar.enemy-bar');
  if(!host||!frame||!fillImg||!blue||!red) return;
  const glow=$('claspMoonGlow');
  if(!frame.getAttribute('src')){            // src 只在這裡掛：路徑只有 ASSETS 一份（鐵律 7）
    frame.src=asset('clasp_moon_frame'); fillImg.src=asset('clasp_moon');
    const gs=glow&&glow.querySelector('.glow-shape');   // 蓄能光的月牙形遮罩＝同一張圖
    if(gs){ const u='url("'+asset('clasp_moon')+'")';
            gs.style.webkitMaskImage=u; gs.style.maskImage=u; }
  }
  const hr=host.getBoundingClientRect(), br=blue.getBoundingClientRect(), rr=red.getBoundingClientRect();
  if(hr.height<10||br.width<10) return;      // 還沒排好 → 之後的重試再量
  const sig=[hr.x,hr.y,br.x,br.y,br.height,rr.y].map(v=>Math.round(v)).join(',');
  if(sig===claspSig) return; claspSig=sig;
  const S=(br.y+br.height)-rr.y;             // S＝紅條頂→藍條底（慣例單位）
  const BL=br.x;                             // 血條左緣（視口座標）
  /* 擺位（ver -542，Ray：「月的位置跟大小參考未命名-2」）——
     逐 px 量那張圖（存 resources/_originals/vfx/clasp_moon_mock2.png）換成 S 比例：
     徽章 bbox 高 1.548S、上緣＝紅頂上方 0.516S、右緣＝血條左緣＋0.290S
     （壓進血條左端；月牙圖層本來就在 HP 之下（-526），被蓋住的那一角是刻意的）。
     -540/-541 的月角/臂厚錨定作廢。 */
  const Hm=1.548*S, Wm=Hm*MOON.ar;
  const OVER=0.290*S;                        // 月壓進血條左端的量（未命名-2 量出）
  const GAPB=0.05*S;                         // 鈕與血條右端的縫（-550，Ray：「不要遮到 hp 條」）
  /* 鈕的尺寸與落點（-551，Ray：「小一點…更靠右一些 低一些」）：
     縮成月的 0.78、右緣貼齊面板右緣內 6px、垂直中心＝兩條血條的中線。 */
  const BSC=0.78, Hb=Hm*BSC, Wb=Wm*BSC, BPAD=6;
  const top=rr.y-0.516*S, left=BL+OVER-Wm;
  /* 血條右側讓位（-549；-550 改「整顆讓開」）：鈕與月同大，但月在血條**之下**
     壓著左端無妨，鈕在血條**之上**（要點擊）—— 蓋到會遮住血量，所以鈕整顆
     排在血條右端之外。讓位量改變血條 rect，改了就重跑一次重量。
     鈕藏著（單一類別／試玩版教學）就不讓，血條照舊放滿。 */
  const btn=document.getElementById('wpSwitch');
  const stack=document.getElementById('barStack');
  if(stack){
    /* 讓位量＝鈕寬＋縫－右緣內縮差（blockPad 12 − BPAD 6）：血條右端正好停在鈕左緣外 GAPB。 */
    const want=(btn && btn.style.display!=='none') ? Math.max(0,Math.round(Wb+GAPB-(12-BPAD)))+'px' : '0px';
    if((stack.style.marginRight||'0px')!==want){
      stack.style.marginRight=want; claspSig=''; setTimeout(layoutClasp,30); return;
    }
  }
  for(const el of [frame,fillImg,glow]){
    if(!el) continue;
    el.style.left=(left-hr.x)+'px'; el.style.top=(top-hr.y)+'px';
    el.style.width=Wm+'px'; el.style.height=Hm+'px';
  }
  /* 副武器切換鈕（-549 與月對稱 → -550 移出血條 → -551 縮小靠右壓低）：
     盒＝月的 0.78 倍，右緣＝面板右緣內 BPAD、垂直中心＝兩條血條的中線；
     圓卡直徑＝盒的短邊。幾何只算這一處（鐵律 7），weapon.js 只管卡面與行為。 */
  if(btn){
    const bb2=btn.offsetParent?btn.offsetParent.getBoundingClientRect():{x:0,y:0};
    const bL=bb2.right-BPAD-Wb;
    const bT=(rr.y+br.y+br.height)/2-Hb/2;
    btn.style.left=(bL-bb2.x)+'px'; btn.style.top=(bT-bb2.y)+'px';
    btn.style.width=Wb+'px'; btn.style.height=Hb+'px';
    const wc=btn.querySelector('.ws-card'); const d=Math.round(Math.min(Wb,Hb));
    if(wc){ wc.style.width=d+'px'; wc.style.height=d+'px'; }
  }
  claspGeo={ nxpx:left+MOON.nx*Wm-hr.x,      // 缺口中心（host 座標）＝連擊數的錨
             nypx:top+MOON.ny*Hm-hr.y,
             blpx:BL-hr.x, S };
  /* 連擊數（Ray 定稿）：白粗斜體黑邊、錨在**月牙缺口中心**；
     可蓋月牙、**不可蓋過 HP 條**（右緣的夾在 updateEnergyClasp 換字時做，
     因為夾多少取決於當下的字寬）。 */
  const combo=host.querySelector('.clasp-combo');
  /* 縱向＝缺口中心再上移 0.12S（ver -543，Ray：「連擊數字稍微上移一些」）。 */
  if(combo){ combo.style.top=(claspGeo.nypx-0.12*S)+'px';
             combo.style.bottom='auto'; combo.style.transform='translate(-50%,-50%)';
             const b=combo.querySelector('b');
             if(b){ b.style.fontSize=Math.round(0.9*S)+'px';                  // 定稿截圖：字高≈0.9S
                    b.style.webkitTextStroke=Math.max(1.6,0.05*S).toFixed(1)+'px rgba(8,8,12,.9)'; }
             placeCombo(); }                                                  // 橫向＝夾位那一支（唯一實作）
  /* HITS 照舊：起筆＝血條左緣、紅條上方（svg 76×76 1:1，座標＝相對 svg 的 px）。 */
  const svg=host.querySelector('svg');
  const hits=svg&&svg.querySelector('.clasp-hits');
  if(hits){ const sr=svg.getBoundingClientRect();
            hits.setAttribute('x', String(Math.round(BL-sr.x+0.02*S)));
            hits.setAttribute('y', String(Math.round(rr.y-sr.y-0.28*S)));
            hits.style.fontSize=Math.round(0.36*S)+'px'; }
  updateEnergyClasp();                       // 幾何換了 → 遮罩與連擊數重掛
}
/* 連擊數的橫向擺位（唯一實作，鐵律 8）：錨在缺口中心，但 Ray：「可覆蓋月牙、
   **不可蓋過 HP 條**」—— 依當下字寬把右緣夾在血條左緣內。layoutClasp（幾何變了）
   與 updateEnergyClasp（字換了、變寬了）都呼叫這一支。 */
function placeCombo(){
  if(!claspGeo) return;
  const cb=$('claspCombo'); if(!cb) return;
  const w=cb.offsetWidth;                     // 藏著時是 0 → 落在缺口中心，無妨
  cb.parentNode.style.left=Math.min(claspGeo.nxpx, claspGeo.blpx-2-w/2)+'px';
}
/* 進場後多試幾拍（血條要排好才量得到）；視窗變了整組重量。 */
function armClaspLayout(){ claspSig=''; [0,120,400,1000].forEach(ms=>setTimeout(layoutClasp,ms)); }
window.addEventListener('resize', ()=>{ claspSig=''; setTimeout(layoutClasp,60); });

function updateEnergyClasp(){
  /* 計量（ver -539）：金月圖被 conic 遮罩由下角（MOON.a0）順時針掃出來，
     掃角＝energy 比例 × MOON.arc。0＝整張藏起（只剩 frame 空圈）、
     滿＝拿掉遮罩（避免 360° 接縫）。邊界羽化 ±0.6° 抗鋸齒。 */
  const fillImg=$('claspMoonFill'), glowEl=$('claspMoonGlow');
  if(fillImg && claspGeo){
    const p=Math.max(0,Math.min(1,state.energy/100));
    const els=[fillImg,glowEl].filter(Boolean);        // 蓄能光吃同一條計量遮罩（鐵律 7）
    if(p<=0){ for(const el of els) el.style.visibility='hidden'; }
    else if(p>=1){ for(const el of els){ el.style.visibility='';
      el.style.webkitMaskImage='none'; el.style.maskImage='none'; } }
    else{
      const deg=p*MOON.arc;
      const m='conic-gradient(from '+MOON.a0+'deg at '+(MOON.nx*100).toFixed(2)+'% '+(MOON.ny*100).toFixed(2)+'%,'
             +'#000 0deg,#000 '+Math.max(0,deg-0.6).toFixed(1)+'deg,rgba(0,0,0,0) '+(deg+0.6).toFixed(1)+'deg)';
      for(const el of els){ el.style.visibility='';
        el.style.webkitMaskImage=m; el.style.maskImage=m; }
    }
  }
  $('energyClasp').classList.toggle('full', state.energy>=100);
  /* 累積中隱隱發光（ver -543）：0<energy<100 掛 .charging（滿檔另有強光暈）。 */
  $('energyClasp').classList.toggle('charging', state.energy>0 && state.energy<100);
  /* 中央連擊數（ver -511，Ray：「像 VP1 那樣顯示連擊數在中間」「連擊為 0 的時候
     不顯示，每次連擊數字就由大縮小跳一次，連擊失敗數字就轉紅消失重計」）。
     這一支由 updateBars 帶著跑 —— 每一次打中／被打／點錯都會經過那裡，
     combo 的變動全數涵蓋。變了才動 DOM：
       升 → 換數字＋由大縮小彈一下（.pop 重觸發走 reflow）
       斷（>0 → 0）→ **舊數字**轉紅縮小消散（textContent 不動），散完才藏
       開場歸零（本來就 0）→ 直接藏著 */
  const cb=$('claspCombo');
  if(cb){
    const v=state.combo|0, prev=+cb.dataset.v||0;
    if(v!==prev){
      cb.dataset.v=v;
      const wrap=cb.parentNode;
      if(v>0){
        cb.textContent=v;
        wrap.classList.add('on');
        placeCombo();                          // 字寬變了 → 重夾（不可蓋過 HP 條）
        cb.classList.remove('pop','break'); void cb.offsetWidth; cb.classList.add('pop');
      }else if(prev>0){
        cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('break');
        setTimeout(()=>{ if((+cb.dataset.v||0)===0){ wrap.classList.remove('on'); cb.classList.remove('break'); } }, 460);
      }else{
        wrap.classList.remove('on');
      }
    }
  }
}

/* ============================================================================
 *  間隔時限（逐格延時懲罰）
 * ========================================================================== */
/* ══ 延時懲罰的視覺化（ver -458，Ray：「讓盤面外面有一圈光圈繞著盤面
   順時針行走，走滿的時候延時懲罰發生，從左上角開始走」）══════════════════
   一條貼著盤面外緣的發光線：從**左上角**起、順時針長，走滿一圈＝時限到。
   ⚠ 它是**顯示**不是第二個計時器（鐵律 7）：每一幀讀 `state.intervalDeadline`
     與 `effIntervalLimit()` —— 懲罰何時發生仍由 startIntervalTimer 那一支決定，
     玩家每點一格（resetIntervalDeadline）光圈自己回到左上角重走。
   ⚠ SVG 的 `pathLength="100"`：dash 用 0~100 講話，與盤面實際幾何無關 ——
     盤面尺寸怎麼變（fitGridSquare）都不必重算。
   ⚠ ver -529（Ray 指定）：路徑只剩**上緣一條線**（M0,0→H100）——
     左到右跑滿＝時限到，不再繞整圈。
   ⚠ 掛在 #grid 裡（absolute，不佔 grid 版位）：buildGrid 重建盤面會把它掃掉，
     所以每一幀 `ensureDelayRing` 都會補 —— 那正好也處理了「第一次進場」。 */
let ringRaf=0;
function ensureDelayRing(){
  let sv=document.getElementById('delayRing');
  if(sv) return sv;
  const grid=$('grid'); if(!grid) return null;
  sv=document.createElementNS('http://www.w3.org/2000/svg','svg');
  sv.id='delayRing';
  sv.setAttribute('viewBox','0 0 100 100');
  sv.setAttribute('preserveAspectRatio','none');
  /* ver -529（Ray：「延時懲罰計時器在盤面上邊跑就好了，左到右跑滿觸發，
     不要跑整圈了」）：路徑改成**上緣一條線**，dash 仍用 0~100 講話。 */
  sv.innerHTML='<path class="dr-rail" d="M0,0 H100" pathLength="100"/>'
             + '<path class="dr-prog" d="M0,0 H100" pathLength="100"/>';
  grid.appendChild(sv);
  return sv;
}
function ringTick(){
  ringRaf=requestAnimationFrame(ringTick);
  const sv=ensureDelayRing(); if(!sv) return;
  const lim=effIntervalLimit()*1000;
  /* 聖徒化／overkill／cut-in 中時限不斷被重置（見 interval 那一支）→ 光圈自然停在起點。
     對話真暫停（_intPausedAt）→ 拿暫停時刻當「現在」＝光圈凍結在當下（ver -464）。 */
  const now=_intPausedAt||Date.now();
  let t=state.intervalDeadline ? 1-((state.intervalDeadline-now)/lim) : 0;
  t=Math.max(0, Math.min(1, t));
  const p=sv.querySelector('.dr-prog');
  p.style.strokeDashoffset=String(100*(1-t));
  sv.classList.toggle('danger', t>0.72);     // 快走滿 → 轉紅示警
}
function stopDelayRing(){
  cancelAnimationFrame(ringRaf); ringRaf=0;
  const sv=document.getElementById('delayRing'); if(sv) sv.remove();
}
function startIntervalTimer(){
  clearInterval(state.intervalTimer);
  stopDelayRing();
  /* ⚠ 計時挑戰：**沒有延時懲罰**（ver -396，Ray 指定）—— 靶子不會催你，
     唯一的壓力是碼表本身。連計時器都不起，「太慢了」那一格也就不會跳。
     （光靠 `enemyAttack` 守門只擋得住扣血，那行字與 combo 歸零還是會演。）
     光圈跟著不出（它是這個計時器的臉，計時器不在它就不在）。 */
  if(state.timeAttack) return;
  ringRaf=requestAnimationFrame(ringTick);
  state.intervalDeadline=Date.now()+effIntervalLimit()*1000;
  if(_intPausedAt) _intPausedAt=Date.now();   // 對話凍結中換盤：期限是新的，補時從此刻重新起算
  state.intervalTimer=setInterval(()=>{
    if(state.over){clearInterval(state.intervalTimer);return;}
    /* 聖徒化／overkill（敵已死的追擊窗口）不受間隔壓力：**期限清成 0＝沒有倒數**
       （ver -468，Ray：「一直重覆歸零，要讓他完全不跑才行」—— 每 tick 回滿的話，
       兩次 tick 之間光圈還是會在左上角冒出一小截又縮回去，看起來像在閃）。
       deadline=0 時 ringTick 的 t 恆為 0，光圈穩定全空。
       離開這些狀態的路都會把期限接回來：換盤 loadBoard→startIntervalTimer、
       聖徒化收尾 saint.finishSaintMode→resetIntervalDeadline、盤內點格 tap→reset
       （聖徒化中點格會被下一 tick 再清回 0，無妨）。
       ⚠ overkill 不能只擋扣血——期限走到頭那一下還會把 combo 歸零，
       追擊的連段會被憑空打斷。 */
    if(state.saintMode||state.enemyHp<=0){state.intervalDeadline=0;return;}
    /* 對話真暫停（pauseForDialog）＝凍結在當下，補時在 resumeFromDialog（ver -464）；
       其他演出（雙槍/搭檔 cut-in）維持每 tick 回滿、撤下重走（發動瞬間不被連段）。 */
    if(state.cutinPlaying){ if(!_intPausedAt) resetIntervalDeadline(); return; }
    /* deadline=0＝「沒有倒數」的哨兵（上面兩個狀態清的）：不算到期 ——
       否則 overkill 收尾、敵血已回而新盤未載的那一格會誤發懲罰。 */
    if(state.intervalDeadline && Date.now()>=state.intervalDeadline){
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
function stopIntervalTimer(){ clearInterval(state.intervalTimer); stopDelayRing(); }

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
/* ══⚠⚠ 打靶的棄權（ver -730，Ray：「給打靶遊戲都加個棄權鈕」）══════════════
   當成**沒過關**收場：走 `storyBattleEnd(true)` —— 那一支本來就是「劇本輸」
   的出口（`allowLose` 用的同一條），所以腳本那一拍的 `onLose` 分歧會照常接上，
   玩家回到店裡／劇情，不必打完。
   ⚠ 走既有的出口而不是另開一條（鐵律 8）：交棒、持久 HP、talkOnce 的記法
     全部在那一支裡，另寫一條必然漏掉其中一項。
   ⚠ `timeOver` 一併標起來：結算與腳本判「有沒有過關」讀的是它。 */
export function giveUpTimeAttack(){
  if(!state.timeAttack || state.over) return false;
  state.timeOver = true;
  return storyBattleEnd(true);
}

function stopAll(){
  document.body.classList.remove('timeattack');   // 棄權鈕：所有結束路徑的匯流點（ver -730）
  stopIntervalTimer();   // 含光圈（ver -464 修：raw clearInterval 會把 rAF 留著抱過期 deadline 繼續畫）
  clearTimeout(state.atkBuffTimer);
  endOverkillFx();       // 中途退出/結算時清 overkill 限時與藍光
  tutorial.abort();      // 教學中途收場（goHome/勝負/重開場）：只撤 UI，不記已看
  defense.stopAll();
  saint.stopTimers();    // 停聖徒化計時器（saintTimer / saintReactTimer）
  weapon.stopTimers();   // 停雙槍破防計時器（dualTimer）
  clearLucidFlood(false);   // 明晰之夢的金光（ver -746）：任何結束路徑都收掉，不爆散
}

/* ---- 計時碼表（連戰用；規則：只在「盤面可點且非 overkill／非聖徒化」時作動）----
 *  clockResume：盤面可點才起算（敵活著、非結算/演出/轉場/聖徒化）。多處呼叫皆冪等（僅在暫停中才起算）。
 *  clockPause ：敵死(overkill)/轉場/cut-in/結算時暫停，把這段併入 runElapsedMs。
 *  clockElapsedMs：目前累計＝已併入 + 進行中的一段。overkill 與轉場自然不計入。
 *  ⚠ saintMode 一併排除：聖徒化是獨立計時的演出段（倒數槽自有節奏、盤面規則不同），
 *    不該算進「實打時間」。守在 clockResume 而非只在進場暫停一次——tap() 每次點擊都會
 *    呼叫 clockResume，只暫停一次會被聖徒化期間的點擊立刻重新起算。
 *  ⚠⚠ **惡夢化（niMode）同理**（ver -703，Ray：「聖徒/夢魘化期間不算時間」）——
 *    它是聖徒化的鏡像，同樣有自己的倒數槽與盤面規則。漏了它的話，NI 那 12.8 秒
 *    會整段算進攻略時間，而玩家在那段裡根本不是在「打」。 */
function clockResume(){
  if(state.clockRunSince===0 && !state.over && state.enemyHp>0
     && !state.cutinPlaying && !state.transitioning && !state.saintMode && !state.niMode){
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

/* 退出確認框／戰鬥中對話：真暫停／續玩。cutinPlaying 已擋新大絕/敵傷害/點擊/間隔懲罰；
 *  這裡再凍結攻擊圈縮放 + 碼表 + 延時（間隔）倒數，續玩時原樣接回
 *  （clockResume 需在清旗標後呼叫）。
 *  延時倒數的凍結（ver -464，Ray：「跑對話的時候延時懲罰條不要動，停在當下位置，
 *  對話解除才繼續」）：與 defense.pauseThreats 同一套補時慣例 —— 記下暫停時刻，
 *  續玩把暫停時長加回 intervalDeadline ＝ 剩餘時間不變；光圈（ringTick）在凍結中
 *  拿暫停時刻當「現在」，畫面就停在當下。
 *  ⚠ 只凍對話（走這兩支的路徑）；cut-in（雙槍/搭檔）不走這裡，維持原本
 *    「演出中每 tick 歸零、撤下重走」的設計（發動瞬間不被連段）。 */
let _intPausedAt = 0;
export function pauseForDialog(){
  state.cutinPlaying = true;
  clockPause();
  defense.pauseThreats();
  if(!_intPausedAt) _intPausedAt = Date.now();   // 疊次暫停取最早那一刻（教學中已暫停＝冪等）
}
export function resumeFromDialog(){
  state.cutinPlaying = false;
  defense.resumeThreats();
  clockResume();
  if(_intPausedAt){ state.intervalDeadline += Date.now()-_intPausedAt; _intPausedAt = 0; }
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
/* 「這是不是最後一名敵人」只有這一支（鐵律 7）。
   教學戰／劇情插入戰＝單敵一場，永遠是最後一名。
   （ver -499：聖徒化 overkill 的 EXSECUTIŌ 不再看這個 —— Ray：「只要清空敵 hp
   就發生」；這一支現在只剩 finishEnemyOrAdvance 在用。） */
function isLastEnemy(){
  return !(enemy.hasNextInLineup() && !state.tutorialRun && !state.scriptRun);
}
function finishEnemyOrAdvance(){
  endOverkillFx();   // overkill 藍光/限時統一在此清理（所有結束路徑的匯流點，冪等）
  partner.onEnemyCleared();   // 九階「方舟」：無傷擊殺 → 已用掉的一次性被動重新上膛（ver -707）
  /* 血歸零 → **淨化**（ver -588，Ray：「怪 hp 歸零後淡出」）。
     ⚠ 掛在這個**匯流點**（鐵律 8）：自然清盤／按錯／逾時／聖徒化擊殺四條路都經過它。
     ⚠ 連戰換敵那一條不掛：那一隻是被「掠過」不是被淨化，它有自己的 `enemy-leave`。 */
  if(isLastEnemy()) enemy.purgeEnemy();
  if(!isLastEnemy()){ advanceEnemy(); }
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
  /* ⚠⚠ **劇情／城鎮的插入戰是單敵**（ver -604 修）：那些場次沒有 lineup，
     舊寫法會退回 `GAME_CONFIG.lineup`（＝**挑戰模式**那一串怪）去加總 ——
     實測北方泊地那隻 300 血的雜怪，分母被算成 500。
     新評價的分母就是這個數，錯了整條等第跟著錯。
     ⚠ 「數個敵人算一場」指的是**挑戰模式的 lineup**（連戰），
       那一種才要加總（Ray：「數個敵人算一場的狀況下，以全敵 hp 總和計算」）。 */
  if(state.inIntruderFight || state.scriptRun) return state.enemyMax;
  const lu=(GAME_CONFIG.lineup && GAME_CONFIG.lineup.length) ? GAME_CONFIG.lineup : [state.currentEnemyKey];
  /* ⚠⚠ **只算「真的遭遇到的」**（ver -606，Ray：「血量總和是以遭遇的敵人為總和，
     地圖上有而未遭遇的不算」）：連戰的序列游標 `lineupIndex` 指到哪，就算到哪 ——
     整串加總的話，中途收場（跳關、劇情提前結束）會把**沒打過的怪**也算進分母，
     等第會被灌水。正常打完最後一隻時游標就是最後一格，行為不變。
     ⚠ 城鎮戰那一種「一張地圖好幾格」不走這裡：那是好幾場獨立的戰鬥，
       由 `inspector.bankSessionGain` 逐場累加 —— **打過的才會進帳**，
       沒走到的那幾格自然不算（同一條原則的另一個實作點）。 */
  const upto = Math.min(lu.length - 1, Math.max(0, state.lineupIndex|0));
  return lu.slice(0, upto+1)
           .reduce((sum,key)=>{ const en=GAME_CONFIG.enemies[key]; return sum + (en?en.hp:0); }, 0);
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
/* 原地閉棺（`story.playKerberosShut`）也由 main.js 注入 —— 城鎮戰打掉一隻雜怪之後
   門在控制盤高度闔上、變回控制板（ver -587）。combat 一樣不 import story。 */
let storyShut = null;
export function setStoryShut(fn){ storyShut = fn; }
/* ⚠⚠ 「殺光所有頁面」（ver -494，Ray：「返回首頁就要 kill 所有的 page 再回去」）。
   由 main.js 注入（combat 不認識飛行 iframe／城鎮／劇情層，§2 依賴方向）——
   goHome 在黑幕全蓋的那一刻呼叫它，把還活著的每一層（飛行 iframe、城鎮、
   劇情舞台、整備頁、選單、單子）整個收掉。實作只有 main 那一份（鐵律 8）。 */
let pageKiller = null;
export function setPageKiller(fn){ pageKiller = fn; }
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

/* ══⚠⚠ 連續戰鬥：整張戰鬥地圖算「同一場」（ver -585，Ray：「城鎮戰內打掉一個怪
   不用閉棺，打掉 Boss 才閉，戰鬥地圖中移動期間算同一場，hp／聖徒化次數／
   主動技發動次數／破防值算同一場」）══════════════════════════════════════
   戰鬥卡寫 `session:'<id>'` ＝這一場屬於那一段連續戰鬥；`sessionEnd:true` ＝
   打贏它就收段（＝Boss）。同一段之內：
     · **開棺只演第一次**（判定在 `main.js` 注入給 story 的 `setGateSkip`）
     · **每場一次的資源不回滿**：聖徒化、搭檔主動技、破防值（`energy`）
     · HP 本來就延續（持久 HP，ver -481），不必另外處理
   ⚠⚠ 存的是**離場那一刻的值**（`sessionSave`），下一格開場再放回去（`sessionLoad`）
     —— 不是「不要 reset」：`startGame` 開頭那整排歸零是所有場次共用的乾淨起點，
     在那裡開特例會讓「這一場到底重置了什麼」變成兩份答案（鐵律 7）。
   ⚠ 段落的收尾有三處，全部走 `endSession()`（鐵律 8）：`sessionEnd` 的那一場打贏、
     `goHome`（回首頁／被抬走）、`progress.newRun`（重開一輪，由 main 呼叫）。 */
let sessionCarry=null;                 // { saintUsed, partnerUsed, energy }
export function sessionOf(battleId){
  const b=GAME_CONFIG.battles && GAME_CONFIG.battles[battleId];
  return (b && b.session) || null;
}
/* 這一場要不要演開棺：**沒有連續段、或這一段還沒開始**才演（story 經 main 注入）。 */
export function battleNeedsGate(battleId){
  const sess=sessionOf(battleId);
  return !(sess && state.battleSession===sess);
}
export function endSession(){
  state.battleSession=null; sessionCarry=null;
  sessionUsedKeys=[];                // 這一段出過哪幾隻（ver -628）：下一次重新洗牌

  inspector.clearSessionGain();     // 半途離場：EXP/錢的帳不留到下一段（ver -595）
  /* ══⚠⚠ **一場結束＝回滿血、破防值歸零**（ver -611，Ray 指定）══
     「一場」＝**槍棺上彈到蕾娜評價**（Ray 的定義），也就是這一個 session：
     中間走幾格、打幾隻都算同一場，資源（HP／聖徒化／主動技／破防值）連著算；
     收段之後就是新的一場，全部回滿。
     ⚠ HP 走 `prog.clearHp()`（拔掉持久 HP 那把鑰匙）而不是寫一個滿值 ——
       「沒有鑰匙＝滿血」是既有的語意（§tivot_php_v1），寫值等於多一個真相（鐵律 9）。
     ⚠ 破防值／聖徒化／主動技不必在這裡動：`sessionCarry` 一清，
       下一場 `startGame` 那排歸零就是乾淨的起點（見 sessionSave 那一段）。 */
  prog.clearHp();
}
/* 這一場的戰鬥背景覆寫（ver -592）：由 `main.js` 在交棒的那一刻設 ——
   城鎮插入戰給「你站的那一格」那張圖，其餘一律 null（走敵人卡的 `bg`）。
   ⚠ **每次交棒都要明確設一次**（含設 null）：靠上一場收乾淨會漏，
     漏了就是把上一格的背景帶進下一場（同 `noSaint` 那條的理由）。 */
export function setBattleBg(name){ state.battleBg = name || null; }
/* 這一場是連續戰鬥的**中間一場**嗎（＝不是收段的那一場）。
   ⚠ 問的是**卡**不是 `state.battleSession`：Boss 打贏時段落已經被 `endSession()`
     收掉了，拿 state 判會把 Boss 也算成中間場（鐵律 9：判定要看得到擁有者的那個值）。 */
/* ══⚠⚠ 這一場打哪一隻（ver -596，Ray：「城鎮戰由這幾隻怪隨機出，數值都一樣，
   但是要各別做敵人卡方便我修改」）══ 戰鬥卡的 `enemy` 可以是**一個鍵**或**一串鍵**；
   是一串就隨機抽一隻。
   ⚠⚠ **一場之內只能抽一次**：`startGame` 會問好幾次（判劇情戰、換敵…），
     每次都現抽會抽到不同隻 —— 立繪與數值就對不起來。所以抽完記在 `pendingPick`，
     同一個 `sb` 再問回同一個（鐵律 7：一個量一個計算點）。
   ⚠ 抽的實作只有這一支（鐵律 8）。 */
let pendingPick=null;   // { sb, key }
/* 這一段（session）已經出過哪幾隻 —— **同一段之內不重覆**（ver -628，Ray：
   「北泊城鎮戰的怪每一區不可重覆」）。
   ⚠ 記在**段落**上而不是節點上：Ray 要的是「這一輪城鎮戰四區各不相同」，
     而不是「這一格永遠出這一隻」（後者就不是隨機了）。
   ⚠ 隨 `endSession()` 一起清（見那裡）—— 下一次城鎮戰重新洗牌。 */
let sessionUsedKeys = [];
function pickBattleEnemy(sb){
  if(!sb) return null;
  const e = sb.enemy;
  if(!Array.isArray(e)) return e;
  if(pendingPick && pendingPick.sb===sb) return pendingPick.key;
  /* 抽**還沒出過的**；全部出過了就重新洗（怪比格子少時不至於卡住）。 */
  let pool = e.filter(k => sessionUsedKeys.indexOf(k) < 0);
  if(!pool.length){ sessionUsedKeys = []; pool = e; }
  const key = pool[(Math.random()*pool.length)|0];
  pendingPick = { sb, key };
  return key;
}
function midSession(){
  const b = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
  return !!(b && b.session && !b.sessionEnd);
}
function sessionSave(){
  if(!state.battleSession) return;
  sessionCarry={ saintUsed:!!state.saintUsedThisBattle,
                 partnerUsed:!!state.partnerActiveUsed,
                 energy:state.energy||0 };
}
function storyBattleEnd(lost){
  if(!storyFramed()) return false;
  /* 持久 HP 寫回（ver -481）：打贏（或 allowLose 的劇本輸）把殘量帶去下一場。
     真正的戰敗不經過這裡（lose() 直接走失敗流程）＝重生仍是進場前的殘量。 */
  prog.setHp(Math.max(1, state.playerHp));
  sessionSave();                      // 連續戰鬥：把「每場一次」的資源帶去下一格（ver -585）
  /* talkOnce 也在這裡記（ver -493，同 win 的那一段）：allowLose 的「劇本輸」
     與跳關都算「這一場過去了」—— 劇情不再重播。 */
  { const _sb2 = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
    if(state.storyBattle && _sb2 && _sb2.talkOnce) prog.addFlags([_sb2.talkOnce]); }   // 只有劇情戰記（ver -493）
  state.tutorialRun=false; state.tutorialStoryRun=false; state.scriptRun=false;
  state.over=true; clockPause(); stopAll();
  /* ⚠ 把**勝負**一起交還（ver -377）：可戰敗的場次要靠它決定接哪一支分歧。 */
  if(storyReturn) storyReturn({ lost: !!lost });
  return true;
}

function win(){
  if(state.over || state.defeated) return;   // 戰敗優先：已判定戰敗則勝利結算一律讓位
  /* ⚠⚠ 持久 HP 寫回（ver -489 修）：-481 誤掛在 storyBattleEnd —— 正常勝利走的是
     **這一支**（win → 結算頁 → 繼續交還），storyBattleEnd 只有 devSkip 與
     allowLose 在用，於是血量從來沒繼承過（Ray：「血量沒有繼承上一場的傷害」）。
     storyBattleEnd 那一份留著（它照顧自己那兩條路）。 */
  if(storyFramed()){
    prog.setHp(Math.max(1, state.playerHp));
    sessionSave();                    // 連續戰鬥：資源帶去下一格（ver -585）
    /* ⚠⚠ **收段（`endSession`）要等結算頁領完帳才做**（ver -621）——
       它會 `clearSessionGain()`，而這一段的統計與錢正是結算頁要報的。
       -595~-620 收在這裡：整段的用時／失誤／受擊／金錢在 `stats` 還沒組出來
       之前就被清光了（無傷與等第因此只算最後一隻）。改掛在 `toResult`。 */
    /* ⚠⚠ 開場白的 talkOnce **打贏才記**（ver -493，Ray：「敗北重來要跑，
       結束以戰鬥勝利為條件」）—— 敗北時根本沒記＝每次重來自動重播；
       記了＝這一場的劇情永久結束（隨機再遇同種怪也不播）。憲法 §6.5.2 原則。 */
    const _wsb = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
    if(state.storyBattle && _wsb && _wsb.talkOnce) prog.addFlags([_wsb.talkOnce]);   // 只有劇情戰記（ver -493）
  }
  state.over=true; clockPause(); stopAll();
  const totalTime=clockElapsedMs()/1000;               // 只累計實打時間（overkill/轉場/cut-in 皆不計）
  /* ══ 計時挑戰：超過標準時間就算「沒過關」（ver -396，Ray：「時間超過 50 秒出失敗分支的台詞」）══
     ⚠ 它**不是戰敗** —— 靶子不會攻擊，打完一定是 win()。這裡只是把「超時」翻譯成
       腳本看得懂的那個布林值（`onLose` 的分歧），交棒由 inspector 帶出去。 */
  state.timeOver = !!(state.timeAttack && state.timeAttack.parSec>0
                      && totalTime > state.timeAttack.parSec);
  const totalTaps=state.correctTaps+state.wrongTaps;
  // 評價系統輸入（見 inspector.evaluate）：時間/命中率/連擊/完美反擊/overkill/受擊。
  const stats={
    totalHP: runTotalHp(),
    isBoss: state.inIntruderFight,
    clearTime: totalTime,
    accuracy: totalTaps>0 ? state.correctTaps/totalTaps : 1,   // 0~1 比率（非百分比）
    maxCombo: state.maxCombo,
    /* ver -721：完美反擊＝**紅圈**那一帶（-706 之後黃橘也會開火，
       `counterFired` 已經不等於「完美」了）。折秒另存，見 state.addPerfectCounter。 */
    perfectCounter: state.perfectCounters,
    counterSec: state.counterSec,                              // 完美反擊折抵的秒數（武器卡 counterSec）
    counterDamage: state.counterDamage,                        // 反擊累計總傷（結算顯示用）
    overkill: state.runOverkill + state.overkill,              // 整場累計 overkill
    // 教學劇情殺三連擊為腳本演出，不算玩家頭上（下限 0）
    hitsTaken: Math.max(0, state.hitsTaken - _scriptedHits),
    /* 以 EXSECUTIŌ（處刑）收尾（ver -630）：評價折抵一次幾秒，見 config.rating.penalty。 */
    sawExecution: !!state.sawExecution,
    /* 以 Maximum Burst 收尾（未擊殺那一種，ver -675）：折 10 秒。 */
    sawMaxBurst: !!state.sawMaxBurst,
    /* 完美清盤的盤數（ver -659）：折算成秒數（負的＝獎勵），見 config.rating.penalty。 */
    perfectBoards: state.perfectBoards|0,
    /* 失誤計數（ver -600）：新評價把它們折算成秒數加進攻略時間。 */
    wrongTaps: state.wrongTaps|0,
    ultHits:   state.penUlt|0,
    blocks:    state.penBlock|0,
    delays:    state.penDelay|0,
  };
  /* ⚠ 上報搬到 `stats` 之後（ver -456，Ray：「後台加入玩家的各別等級次數紀錄，
     分成一般跟 boss 戰」）：等第要一起上報，而它由 `stats` 算出來。
     `evaluate` 是純函式（同一份輸入永遠同一個等第），與結算頁顯示的必然一致 ——
     公式仍只有一份（鐵律 7），這裡只是再問一次答案。 */
  TEL.runEnd({ partner:state.pickedPartner, weapon:state.equippedWeapon,
               boss:state.inIntruderFight, result:'win', time_ms:Math.round(totalTime*1000),
               /* ⚠ 上報的等第也要**整場一起算**（ver -621）：`mergeSessionStats`
                  是純函式、不清帳，所以這裡先問一次不影響結算頁再問一次。 */
               grade: inspector.evaluate(inspector.mergeSessionStats(stats)).grade });
  /* 勝利 → 先播「驅逐完成」過渡禎；被點掉（done）後才建結算面板並起播結算 BGM。
     ⚠ **劇情叫起來的教學不播過渡禎**（ver -358）：那一場的進出都由劇情接手，
       中間插一張要點的過渡禎會把節奏切斷（同 -329「切乾淨」的理由）。
       結算頁照出 —— Ray 要的是「沒有監察官的戰績頁 ＋ 拾得道具」。 */
  /* ══⚠⚠ 連續戰鬥的**中間幾場不結算**（ver -586，Ray：「結算也不要留，
     一場打完才結算」）══ 對玩家而言整張戰鬥地圖是**同一場** —— 中間每打掉一隻就
     彈一頁戰績，等於把它切成五場。所以中間場：不演閉棺、不上結算，直接交還城鎮
     （＝回到戰鬥地圖），那兩件事留給 `sessionEnd` 的那一場（Boss）。
     ⚠ 上面的收尾（持久 HP、`sessionSave`、talkOnce）都已經跑過了，這裡只是不演。
     ⚠ 中間場的**戰績與錢先記帳**（`bankSessionGain`），由收段那一場的結算頁
       一起報（ver -621：用時／失誤／受擊／無傷／EXP／金錢全部以「場」為單位）。
       ⚠ 拾得道具仍只在有結算頁的那一場給 —— 那是掉落，不是帳。 */
  if(midSession()){
    /* ⚠ 回程演的是**原地閉棺**（ver -587，Ray：「雜怪 hp 清零後槍棺在原高度閉棺
       成為控制板」）：門在控制盤的高度闔上，闔上就是那張控制板 ——
       所以回城鎮那一段**不走 goHome 的淡出**（`inPlace` 讓 main 那邊分流），
       不然玩家會先看到一次黑幕，門的動作就白演了。 */
    /* EXP 與錢**整場結算**（ver -595）：中間這幾場先記帳，收段那一場一起入。 */
    inspector.bankSessionGain(stats);
    const back = ()=>{ if(storyReturn) storyReturn({ lost:false, inPlace:true }); };
    if(storyShut) storyShut(back); else back();
    return;
  }
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
    /* ⚠ 這一場是段落的最後一場（Boss）→ 收段：下一次進戰鬥重新演開棺、資源回滿。
       ⚠ **一定要在 `settle` 之後**：它清帳，而 settle 開頭才把那筆帳領走（ver -621）。 */
    { const _es = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
      if(_es && _es.sessionEnd) endSession(); }
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
  /* ⚠⚠ 戰鬥內開場白的 talkOnce **打贏才記**（ver -493，Ray：「敗北重來要跑…
     結束以戰鬥勝利為條件」）—— 敗北這裡**什麼都不必做**：旗標根本還沒記，
     重生自然重播；打贏才在 win／storyBattleEnd 記下去永久停播。
     （-480 的「敗北退旗標」與 -492 的「取段當下記、永不退」都已推翻。） */
  /* 走一般失敗流程之前，把「這一場是劇情場」的旗標收掉 —— 不收的話結算會走
     教學／插入戰那一頁（那是給打贏用的），玩家輸了卻看到一頁戰績。 */
  /* 「剛剛那一場是哪一場」交給戰敗頁的去向判定（ver -698，見 state.lastBattleId）——
     **要在清掉之前記**。 */
  state.lastBattleId = state.scriptBattleId;
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
  state.counterFired=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false; state.sawMaxBurst=false;
  state.perfectCounters=0; state.counterSec=0;   // 完美反擊（紅圈）的次數與折秒（ver -721）
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0; state.perfectBoards=0;   // 評價統計歸零
  state.penUlt=0; state.penBlock=0; state.penDelay=0;   // 失誤計數歸零（ver -600 的新評價）
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
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert','hot');
  state.cutinPlaying=false;
  state.noSaint=false; state.noPartner=false;   // 這一場的禁令歸零（劇情插入戰於下方依卡設回）
  /* ⚠ 劇情插入戰的旗標在**這裡**依交棒變數決定，不是靠上一場自己收乾淨 ——
     「上一場結束時記得歸零」是會漏的（漏了就換成一般戰鬥變單敵、還不能聖徒化）。
     開場一律先歸零、再看這一次有沒有指定，才是不會漏的寫法。 */
  state.scriptRun=!!pendingScript; state.scriptBattleId=pendingScript; pendingScript=null;
  state.tutorialRun=false; state.tutorialStoryRun=false;   // 教學場旗標歸零（tutorial 擁有；開場統一歸零、maybeStart 啟動時設回）
  /* 劇情插入戰（ver -375）：**單敵一場**，換上卡上那隻，且這一場不能聖徒化／不能用搭檔技。
     ⚠ 要在 `stopAll()`/`loadBoard(0)` **之前**換敵 —— 盤面配置（boardGrids/boardLoop）
       是查「目前這隻怪」來的，換晚了第一盤會用到上一隻的格數。 */
  const sb = state.scriptRun && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
  /* 是否為**劇情戰**（ver -493；-495 改成卡上統一有這一格）—— 唯一判定，
     之後一律讀 `state.storyBattle`：
       ① 發起端明確宣告的優先（飛行交棒的 `scripted`：隨機遭遇 false、劇本遭遇 true）
       ② 沒宣告（城鎮／腳本插入戰、舊交棒鑰匙）→ 讀**敵人卡**的 `story`（1/0）
       ③ 卡上也沒寫 → true（腳本叫起來的場子天生就是劇情戰）。 */
  { const en = sb && GAME_CONFIG.enemies[pickBattleEnemy(sb)];
    const cardStory = !en || en.story==null || !!en.story;
    state.storyBattle = state.scriptRun &&
      (pendingScriptStory!==null ? pendingScriptStory : cardStory);
    pendingScriptStory = null; }
  state.timeAttack = null; state.timeOver = false;   // 開場先歸零（同 noSaint：不要靠上一場收乾淨）
  state.weaponSound = null;                          // 武器音覆寫也是（ver -423）
  state.counterGapMs = null;                         // 連射間隔覆寫也是（ver -476）
  /* ⚠⚠ 本篇的搭檔在**進場這一刻**切成 `config.storyPartner`（ver -510，Ray：
     「即死防的圖錯了」「飛行戰中的聖徒化CI也是錯的」）—— 以前只有開過整備頁才切，
     出航直接進的船戰帶著試玩版的蕾妮／露娜：即死防禦 cut-in 是蕾妮那張、
     聖徒化 cut-in 落回 Luna（saint.js 那條分流要求搭檔＝諾薇兒才給她的圖）。
     真相只有 config 一份（gear 的清單第一位與它互指，鐵律 7）。 */
  /* ⚠ 現在是誰由 `partner.storyPartnerKey()` 決定（ver -671：安雅入隊之後換她）——
     不要在這裡讀 `GAME_CONFIG.storyPartner`，那只是「都不成立時」的預設。 */
  if(state.scriptRun) setPickedPartner(partner.storyPartnerKey());
  if(sb && GAME_CONFIG.enemies[pickBattleEnemy(sb)]){
    enemy.setEnemy(pickBattleEnemy(sb));
    /* ══⚠⚠ 真的開打了才記「這一段出過牠」，**並且把這一抽用掉**（ver -628）══
       `pendingPick` 是為了讓 `startGame` 裡那兩次呼叫拿到同一隻（立繪與數值要對得起來）
       —— 但它從來沒有人清掉，於是**整輪都黏著第一次抽到的那一隻**
       （實測連開五場都是同一隻，「每一區不可重覆」根本無從談起）。
       ⚠ 記在**開打**這一刻不是抽的那一刻：中途離開／讀檔重來不該把沒打過的算掉。 */
    if(Array.isArray(sb.enemy)){
      const k=pickBattleEnemy(sb);
      if(sessionUsedKeys.indexOf(k)<0) sessionUsedKeys.push(k);
    }
    pendingPick=null;                  // 這一抽用完了 —— 下一場重抽（見上）
    state.noSaint = !!sb.noSaint;
    state.noPartner = !!sb.noPartner;
    state.timeAttack = sb.timeAttack || null;    // 計時挑戰（ver -396，打靶場）
    state.weaponSound = sb.weaponSound || null;  // 這一場的武器音覆寫（ver -423，船艦戰）
    state.counterGapMs = sb.counterGapMs || null;// 這一場的機槍連射間隔（ver -476，船艦戰）
  }
  stopAll();
  /* ⚠⚠ 棄權鈕的 class **要掛在 `stopAll()` 之後**（ver -730）：`stopAll` 會把它
     清掉（那是所有結束路徑的匯流點，見那一支）—— 掛在前面等於沒掛，
     鈕永遠不出現（實測就是這樣）。同憲法那條「talk 要掛在 stopAll 之後」的坑。
     ⚠ 只在計時挑戰出現；收由 `stopAll()` 負責，這裡不必再管。 */
  document.body.classList.toggle('timeattack', !!state.timeAttack);
  /* 這一場自己的戰鬥內對話（ver -426，例：船艦戰的反擊短教學）。
     ⚠ 要在 `stopAll()` **之後**掛：`stopAll` 會叫 `tutorial.abort()`，那一支會把它收掉。
     ⚠ 也要在 `loadBoard(0)` **之前**：loadBoard 會觸發 `board:0`，晚掛就吃不到那個節點。 */
  /* 開場白只屬於**劇情戰**（ver -493：state.storyBattle 是唯一判定）——
     隨機遭遇共用同一張卡（flight_centipede）也不播。
     已打贏過（talkOnce 旗標立了）也不播（startBattleTalk 自己守門）。 */
  if(state.storyBattle && sb) tutorial.startBattleTalk(sb.talk, { once:sb.talkOnce, sides:sb.talkSides });
  /* ══⚠⚠ 本篇的 HP 是**延續的**（ver -481；-490 修位置）══
     讀 progress 的持久 HP；沒有鑰匙＝滿血（開局／睡醒）。挑戰（試玩版）不吃。
     ⚠⚠ 一定要在 `state.scriptRun`（上面 1094）**設好之後**才讀 —— -481 把它放在
       函式開頭，那時 storyFramed() 讀到的是**上一場**的殘值（正常收場後是 false）
       → 讀取永遠被跳過、每場滿血。Ray 連報兩次「血量沒有繼承」就是這個；
       先前實測會過是僥倖（上一場沒收乾淨、旗標殘留 true）。
     ⚠ 劇情教學（tutorialStoryRun）在下面 maybeStart 才設 —— 那一場是本篇的
       **第一場**戰鬥，本來就該滿血開場，不必讀。 */
  if(storyFramed()){
    const ph=prog.getHp();
    if(ph!=null) state.playerHp=Math.max(1, Math.min(state.playerMax, ph));
  }
  /* ══ 連續戰鬥：接上一格的資源（ver -585，見 sessionSave 那一段的說明）══
     ⚠ 要在**所有歸零之後**才放回去 —— 這一段是「把上一格的殘值搬回來」，
       不是在開頭挖特例（那會讓「這一場重置了什麼」有兩份答案，鐵律 7）。
     ⚠ 段落是**這一場的卡**宣告的：接得上（同一段）就沿用，接不上就是新的一段。 */
  { const sess = sb && sb.session || null;
    if(sess && state.battleSession===sess && sessionCarry){
      state.saintUsedThisBattle = sessionCarry.saintUsed;
      state.partnerActiveUsed   = sessionCarry.partnerUsed;
      state.energy              = sessionCarry.energy;
      updateEnergyClasp();          // 破防值搬回來了，扣環要跟著畫（同一支，鐵律 8）
    }else if(sess){
      state.battleSession = sess;     // 這一段從這一場開始（開棺就演這一次）
      sessionCarry = null;
    }else{
      endSession();                   // 不屬於任何連續段 → 收掉還開著的那一段
    }
  }
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
/* 發起端對「這一場是不是劇情戰」的**明確宣告**（ver -493；-495 起卡上也有 `story`）。
   null＝沒宣告（走敵人卡）；true/false＝宣告了（飛行交棒的 `scripted` 走這裡，優先）。
   startGame 寫進 state.storyBattle —— 開場白與 talkOnce 都只讀它分流。 */
let pendingScriptStory = null;
export function startScriptBattle(id, opts){
  pendingScript = id;
  /* 只有**明確的布林**才算宣告（ver -495）—— undefined/null 一律交給敵人卡。 */
  pendingScriptStory = (opts && typeof opts.story==='boolean') ? opts.story : null;
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
  state.counterFired=0; state.counterDamage=0; state.perfectCount=0; state.sawExecution=false; state.sawMaxBurst=false;
  state.perfectCounters=0; state.counterSec=0;   // 完美反擊（紅圈）的次數與折秒（ver -721）
  state.maxCombo=0; state.hitsTaken=0; state.correctTaps=0; state.wrongTaps=0; state.runOverkill=0; state.perfectBoards=0;   // 評價統計歸零
  state.penUlt=0; state.penBlock=0; state.penDelay=0;   // 失誤計數歸零（ver -600 的新評價）
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
  $('grid').classList.remove('saint'); $('grid').classList.remove('buffed'); $('grid').classList.remove('alert','hot');
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
    /* ⚠⚠ **返回首頁＝殺光所有頁面**（ver -494，Ray 指定）：黑幕全蓋的這一刻把
       飛行 iframe／城鎮／劇情層／整備頁／選單全部收掉再回去 —— 藏起來不算，
       背景還活著的頁面（音、計時器、模擬）都要死。
       ⚠ 例外只有 `opts.keepPages`：那幾條是**借 goHome 當過場**、onCovered 立刻
         開回某一頁的路（打完回飛行畫面、戰敗「再戰」續播劇情）—— 那不是回首頁。 */
    /* 連續戰鬥的段落也一起收（ver -585）：真的回首頁＝那一段結束。
       ⚠ `keepPages` 是「借 goHome 當過場」（打完回城鎮續播、戰敗再戰）——
         那幾條不收，不然城鎮戰走一格就把段落斷掉，資源會回滿。 */
    if(!(opts && opts.keepPages)) endSession();
    if(!(opts && opts.keepPages) && pageKiller){ try{ pageKiller(); }catch(_){}}
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
/* 回傳「整段演完要多久」（毫秒）——呼叫端要等它（ver -619：戰鬥卡的 `strike:true`
   打完才接下一段）。⚠ 長度只有這一支算得出來（鐵律 7）：呼叫端不要自己乘一次。 */
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
      _scriptedAtk=true;          // …失誤秒數也不算（ver -619）
      enemyAttack(dmg, h.kind);
      _scriptedAtk=false;
    }, i*gap);
  });
  return (hits.length-1)*gap;
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
/* ══⚠⚠ **一擊打到剩 N 血**（`strikeTo`，ver -671，Ray：「玩家受擊，hp1」）══
   與三連擊（`tutorialStrike`）是**兩種劇情殺**：那一套是「三擊清零 → 即死防禦」，
   這一套是「一下打到剩 1 → 由安雅接手惡夢化」。
   ⚠ 走**同一個受擊入口** `enemyAttack`（演出／音效／畫面震都在那裡，鐵律 8），
     傷害算成「現在的血 − 目標血」。
   ⚠ 這一擊**不算在玩家頭上**（`_scriptedAtk`／`_scriptedHits`，同三連擊的規矩）：
     那是腳本演的，不是他失誤。
   ⚠ 回傳這一段演出的長度（毫秒），呼叫端拿它接下一拍 —— 不要自己乘一次（鐵律 7）。 */
function tutorialStrikeTo(leave){
  const to = Math.max(1, leave|0);
  const dmg = Math.max(1, state.playerHp - to);
  _scriptedAtk = true; _scriptedHits++;
  enemyAttack(dmg, 'ult');
  _scriptedAtk = false;
  return 0;
}
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

/* ============================================================================
 *  modules/saint.js — 聖徒化（v18 受擊推進式）
 *  ---------------------------------------------------------------------------
 *  職責：降臨 → 推進 → 三結局。血條改為倒數槽，只有真受擊才推進
 *    （受擊 ≈+1s / 格擋 ≈+0.5s / Counter・Perfect 免傷不推進 / 無受擊約 10s 回滿）；
 *    維持 16 宮格、期間敵大絕更密集；左右滑觸發、生命歸還下滑觸發。
 *    三結局：
 *      Maximum Burst（EXSECUTIŌ）：滿前清盤，追加期間總傷 20%，sawExecution=true。
 *        回血＝playerMax 的 50%（刻意偏離 reference 的 10%，見 DECISIONS.md D2）。
 *      OBE：推進到滿＝沒守住（HP→1）。
 *      生命歸還：下滑觸發，中止並保留當前血量（第四結局，不改血）。
 *
 *  狀態擁有者：3.5 聖徒化（見 state.js）。
 *  ⚠ 契約鐵律：
 *    · saintMode 只有本模組能寫，且一律經 state.enterSaint()/exitSaint()；
 *      其他模組只讀 state.saintMode 分支。此契約若破＝退回舊單檔病灶。
 *    · 改血一律走 combat 的統一改血 API（api.healPlayer / api.setPlayerHpRatio，Part A）；
 *      saint 不得直接寫 state.playerHp。
 *    · 大絕頻率（ULT_MIN/MAX）為 defense 擁有：saint 只「讀」現值存進自有 saintPrevUlt，
 *      實際「寫」經 api.setUltRate（defense 擁有者管道）。
 *
 *  依賴：只 import state / config / audio。combat / defense / enemy / partner 的原語
 *    一律由 combat 於 setup() 注入 api（維持 §2 依賴方向，不反向 import）。
 * ========================================================================== */

import { GAME_CONFIG, asset } from '../config.js';
import { state, enterSaint, exitSaint, markExecution } from '../state.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;

// 數值一律讀 config
const SAINT_GRID              = T.saintGrid;              // 聖徒化盤面格數（16）
const SAINT_GRID_COLS         = T.saintGridCols;         // 每列格數（4）
const SAINT_ADVANCE_DIVISOR   = T.saintAdvanceDivisor;   // 一次受擊推進＝playerMax/此值（≈+1s）
const SAINT_PASSIVE_HEAL_SEC  = T.saintPassiveHealSec;   // 無受擊時被動回滿約需秒數
const SAINT_REACT_SEC_IN_SAINT= T.saintReactSecInSaint;  // 聖徒化期間放寬的每格反應時限（秒）
const SAINT_ULT_MIN_MS        = T.saintUltMinMs;         // 期間敵大絕頻率下限
const SAINT_ULT_MAX_MS        = T.saintUltMaxMs;         // 期間敵大絕頻率上限
const SAINT_COMBO_STEP        = T.saintComboStep;        // 期間每 combo 疊傷斜率（無上限）
const SAINT_LAST_HIT_RATIO    = T.saintLastHitRatio;     // 結束前清盤 → 追加期間總傷的比例（0.20）

/* combat 於啟動時注入的原語（HP API / 盤面 / 傷害 / defense / partner）。 */
let api = {};
export function init(a){ api = a; }

/* ============================================================================
 *  發動 / 手勢入口
 * ========================================================================== */
// 敵人框左右滑到底 → 發動聖徒化（一場一次）。dir='right'|'left' 給對應橫斬特效。
// enemyHp<=0＝overkill 狀態（敵已死、等玩家收尾）：不可發動——白耗一場一次的聖徒化且無對象。
export function activateSaint(dir){
  if(state.over||state.saintMode||state.cutinPlaying||state.saintUsedThisBattle||state.transitioning||state.dualWield||state.enemyHp<=0) return;
  state.saintUsedThisBattle = true;   // saint 自有欄位：發動即鎖（一場一次），時序同 reference
  SFX.unlock(); SFX.ultCharge();
  SFX.play(asset('sfx_saint'));       // 聖徒化發動音效（SI_01）
  SFX.play(asset('voice_saint_luna'), 1.7);// Luna 發動語音（母帶峰值 -4.9dB，增益 1.7≈+4.6dB 推近滿不破音）
  playSlash(dir);                     // 依滑動方向的橫斬特效
  playCutin(()=>{
    if(state.over) return;
    startSaintMode();
  }, '聖徒降臨！！<span class="cutin-en">SAINT INSTALL!!</span>', 'cutin_saint_luna', { noShot:true });
}

// 橫斬特效：dir='right' 向右斬、'left' 向左斬
function playSlash(dir){
  const fx=$('slashFx');
  if(!fx) return;
  fx.innerHTML='';
  fx.classList.remove('flash'); void fx.offsetWidth; fx.classList.add('flash');
  const line=document.createElement('div');
  line.className='slash-line '+(dir==='left'?'go-left':'go-right');
  fx.appendChild(line);
  // 補一道稍慢的殘影，讓斬擊更有層次
  const echo=document.createElement('div');
  echo.className='slash-line '+(dir==='left'?'go-left':'go-right');
  echo.style.animationDelay='.06s';
  echo.style.opacity='.5';
  echo.style.height='6px';
  fx.appendChild(echo);
  setTimeout(()=>{ if(fx) fx.innerHTML=''; }, 600);
}

/* ============================================================================
 *  降臨：進入聖徒化
 * ========================================================================== */
function startSaintMode(){
  if(state.over) return;
  enterSaint();                          // saintMode=true（唯一寫入管道）
  // v18c/本輪裁決：不設 cut-in 後緩衝——一進聖徒化敵人就照常發動大絕（受擊會加速逼近 OBE）。
  api.resetEnemyTimers();
  state.enemyAtkSuppressUntil = 0;
  api.scheduleUlt();                     // 立即排下一次大絕（不延後）
  setReturnSwipe(true);                  // 開啟生命歸還手勢層
  state.saintDamageDealt = 0;
  state.combo = 0;                       // 期間 saint 代理盤面游標（combat 已讓出主迴圈）
  api.resetEnergy();                     // 清零破防（雙槍）值，期間也不累積
  $('grid').classList.add('saint');
  state.saintPrevBoard = { N:state.N, cols:state.cols };
  api.setBoard(SAINT_GRID, SAINT_GRID_COLS);   // 維持 16 宮格
  api.buildGrid();
  api.floatDmg('SAINT MODE','50%','20%',true);
  // 血條＝倒數槽，被兩股力量往上推：
  //   (1) 被動回血打底：滿血/SAINT_PASSIVE_HEAL_SEC 秒定速回，無受擊時約 10 秒到 OBE；
  //   (2) 受擊額外加速：挨大絕/按錯/延時 +1s、格擋 +0.5s（見 saintAdvance / combat.enemyAttack）。
  //   推滿＝OBE，推滿前清盤＝Maximum Burst。
  const healPerTick = state.playerMax / SAINT_PASSIVE_HEAL_SEC * 0.1;   // 每 100ms 的被動推進量
  clearInterval(state.saintTimer);
  state.saintTimer = setInterval(()=>{
    if(state.over||!state.saintMode){ clearInterval(state.saintTimer); state.saintTimer=null; return; }
    if(state.cutinPlaying) return;       // 演出/教學對話暫停中凍結倒數槽（讀提示不吃聖徒化時間）
    saintAdvance(healPerTick);           // 被動推進；推滿→OBE（由 saintAdvance 內部處理）
  }, 100);
  // 大絕頻率改密集：讀現值存自有 saintPrevUlt、經 defense 擁有者管道 setUltRate 寫入
  state.saintPrevUlt = { min:state.ULT_MIN, max:state.ULT_MAX };
  api.setUltRate(SAINT_ULT_MIN_MS, SAINT_ULT_MAX_MS);
  startSaintReactTimer();                // 起算第一格的反應時限
}

/* ============================================================================
 *  推進倒數槽（＝回血；推滿→OBE）
 *  amount＝本次推進量（playerMax 比例值）。走 combat 統一改血 API（healPlayer）。
 *  Counter／Perfect 免傷則不呼叫此函式。
 * ========================================================================== */
export function saintAdvance(amount){
  if(!state.saintMode) return;
  // 教學：倒數槽推至臨界（滿-1，即 99）即攔截——不進 OBE，交由教學引導生命歸還
  //   （api.onSaintCritical → tutorial.onSaintCritical，內有一次性守門；非教學不生效）
  if(state.tutorialActive && api.onSaintCritical){
    const cap = state.playerMax - 1;
    if(state.playerHp + amount >= cap){
      if(state.playerHp < cap) api.healPlayer(cap - state.playerHp);
      api.onSaintCritical();
      return;
    }
  }
  const hp = api.healPlayer(amount);     // 推進＝回血（上限裁切在 API 內）
  if(hp>=state.playerMax){ triggerOBE(); }
}

/* ============================================================================
 *  聖徒化盤面點擊（combat.tap 於 saintMode 委派至此）
 *  依序點 16 格；combo 疊傷無上限；點錯／反應超時＝一次「受擊」推進 +1s。
 * ========================================================================== */
export function saintTap(num, cell){
  if(cell.classList.contains('done')) return;   // 已點掉的格子不可重點
  // Overkill（敵 HP 已歸零）：免順序追打——點到未消格即命中（同雙槍破防手感），
  //   全清 → triggerMaxBurst（敵已死 → EXSECUTIŌ 處決收尾，回血至滿）。
  //   倒數槽被動推進與反應時限照常施壓（拖太久推滿仍會 OBE）。
  if(state.enemyHp<=0){
    SFX.gunshot(true);
    cell.classList.add('done'); cell.classList.remove('next'); api.shatterCell(cell);
    state.combo++;
    const okDmg=Math.round(api.hitDamage() + state.combo*SAINT_COMBO_STEP);
    api.enemyDamage(okDmg, true);
    state.saintDamageDealt += okDmg;
    if(state.cells.every(c=>c.classList.contains('done'))){ triggerMaxBurst(); }
    else startSaintReactTimer();
    return;
  }
  if(num===state.expect){
    SFX.gunshot(true);
    cell.classList.add('done'); cell.classList.remove('next'); api.shatterCell(cell);
    state.combo++;
    const dmg=api.hitDamage() + state.combo*SAINT_COMBO_STEP;   // 疊傷無上限
    const d=Math.round(dmg);
    api.enemyDamage(d, true);
    state.saintDamageDealt += d;                 // 累計期間傷害（供最後一擊追加）
    state.expect++;
    if(state.expect>state.N){ triggerMaxBurst(); }              // 推滿前點完全盤 → Maximum Burst
    else { api.markNext(); startSaintReactTimer(); }           // 點對一格 → 重設反應時限
  }else{
    // 點錯（掃格失誤）＝一次「受擊」：統一推進 +1 秒
    SFX.wrong();
    cell.classList.add('wrong'); setTimeout(()=>cell.classList.remove('wrong'),300);
    state.combo=0;
    api.floatDmg('MISS','50%','44%',true);
    saintAdvance(state.playerMax/SAINT_ADVANCE_DIVISOR);        // 推進；推滿→OBE
    if(state.saintMode) startSaintReactTimer();                // 未推滿（仍在聖徒化）→ 重設反應時限
  }
}

/* 聖徒化每格反應時限：超時未點下一格 → 一次「受擊」推進，加完重新計時。
 * 期間專用放寬時限 SAINT_REACT_SEC_IN_SAINT（給玩家餘裕）。 */
function startSaintReactTimer(){
  clearTimeout(state.saintReactTimer);
  if(!state.saintMode) return;
  const REACT = SAINT_REACT_SEC_IN_SAINT;
  state.saintReactTimer = setTimeout(function tick(){
    if(state.over||!state.saintMode||state.cutinPlaying){ return; }
    SFX.wrong();
    state.combo=0;
    api.floatDmg('TOO SLOW','50%','40%',true);
    saintAdvance(state.playerMax/SAINT_ADVANCE_DIVISOR);        // 推進；推滿→OBE
    if(!state.saintMode) return;                               // 已因推滿進 OBE → 停
    state.saintReactTimer = setTimeout(tick, REACT*1000);      // 還沒點 → 繼續計時
  }, REACT*1000);
}
function clearSaintReactTimer(){ clearTimeout(state.saintReactTimer); state.saintReactTimer=null; }

// 生命歸還手勢層開關（只在聖徒化期間開啟，避免平時擋住敵畫面）
function setReturnSwipe(on){ const z=$('returnSwipe'); if(z) z.classList.toggle('on', !!on); }

/* ============================================================================
 *  三結局
 * ========================================================================== */
// 還原敵大絕頻率（經 defense 擁有者管道；清掉自有 saintPrevUlt）
function restoreUltRate(){
  if(state.saintPrevUlt){ api.setUltRate(state.saintPrevUlt.min, state.saintPrevUlt.max); state.saintPrevUlt=null; }
}

// Maximum Burst（EXSECUTIŌ）：推滿前把 16 格點完 → 追加期間總傷 20%；未擊殺則回血 50%（D2）。
function triggerMaxBurst(){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreUltRate();
  if(state.saintDamageDealt>0){
    const last=Math.round(state.saintDamageDealt*SAINT_LAST_HIT_RATIO);
    api.enemyDamage(last, true);
    api.floatDmg('MAXIMUM BURST '+last,'50%','28%',true);
    SFX.clear();
  }
  $('grid').classList.remove('saint');
  if(state.enemyHp<=0){
    // 追加傷害讓敵人 HP 歸零 → EXSECUTIŌ 演出後 → 轉下一敵 or（最後一敵）結算。
    // 成功 MB 滿血獎勵（D2）：擊殺也回滿——連戰下 MB 秒殺一敵後帶滿血接下一隻。
    markExecution();   // sawExecution=true（評價 Execution 加乘）
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(1); api.onEnemyDefeated(); });
    return;
  }
  // 敵人未死 → Maximum Burst 演出後回盤面。回血規則（2026-08-13 定案）：
  //   EXSECUTIŌ（MB 擊殺）→ 回滿；MaxBurst（未擊殺）→ 回 50%，並自然延續到同場下一敵。
  playSaintCutin('burst', ()=>{
    finishSaintMode(()=>api.setPlayerHpRatio(0.5));
  });
  if(api.onSaintEnded) api.onSaintEnded('mb');   // 教學終盤掛鉤（cut-in 結束後收尾台詞；非教學 no-op）
}

// OBE：推進到滿＝沒守住（HP → 1）。
function triggerOBE(){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreUltRate();
  api.floatDmg('O.B.E.','50%','28%',true);
  if(state.enemyHp<=0){
    // 聖徒化期間敵 HP 已歸零、但倒數槽先推滿 → 仍播 OBE 演出，收尾轉下一敵/結算。
    // ⚠ OBE 懲罰（HP→1）照樣套用並延續到同場下一敵——推進=回血會把血推滿，
    //   不套懲罰會變成「OBE 後滿血接下一隻」（悖離 OBE=沒守住 的語義）。
    playSaintCutin('obe', ()=>{ $('grid').classList.remove('saint'); api.setPlayerHpRatio(0); api.onEnemyDefeated(); });
    return;
  }
  // 全畫面 OVERWRITE BREAKER ENGAGED cut-in → 結束後回盤面（HP → 1）
  playSaintCutin('obe', ()=>{
    finishSaintMode(()=>api.setPlayerHpRatio(0));   // setPlayerHpRatio 下限 floor 1 → 恰為 1 HP
  });
}

// 生命歸還「執行體」（搭檔主動技·第四結局）：中止聖徒化，保留當前血量後回盤面（不改血）。
//   ⚠ 「能否發、屬於誰」的判定已移至 partner.tryActive（單槽＋context 分派）；此處為純執行能力，
//     由 combat 於 setup() 注入給 partner（saintApi.lifeReturnAbort）。saint 不知道誰觸發它。
//     保留一個 saintMode 保險檢查，避免非聖徒化狀態被誤呼叫。
export function lifeReturnAbort(){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreUltRate();
  api.floatDmg('生命歸還','50%','28%',true);
  // 第四結局 cut-in → 結束後回盤面，血量維持當前值（saintMode 已關、計時器已停，HP 不再變動）
  playSaintCutin('return', ()=>{
    finishSaintMode(()=>{ /* 保留當前血量：不改血 */ });
  });
  if(api.onSaintEnded) api.onSaintEnded('return');   // 教學終盤掛鉤（非教學 no-op）
}

/* 共用收尾：回到當前 9/16 盤面，敵人排程/間隔懲罰全部歸零，恢復正常扣血攻擊。
 * finalHpThunk：由各結局傳入，於此執行結局血量設定（一律走 combat 改血 API）。 */
function finishSaintMode(finalHpThunk){
  $('grid').classList.remove('saint');
  restoreUltRate();                      // 保險：還原敵大絕頻率（triggerX 已還原，冪等）
  if(finalHpThunk) finalHpThunk();       // 設定結局血量（走 combat 改血 API；生命歸還為 no-op）
  const back=state.saintPrevBoard||{N:16,cols:4};
  api.setBoard(back.N, back.cols);
  api.resetEnemyTimers();                // 清紅圈、停蓄力、清大絕排程（含 ultCheckTimer）
  if(!state.over){
    api.buildGrid();
    api.resetIntervalDeadline();         // 間隔（點擊延遲）懲罰歸零
    api.startIntervalTimer();
    api.scheduleUlt();                   // 敵大絕蓄力重新計時，恢復正常扣血攻擊
  }
}

/* ============================================================================
 *  演出：降臨 cut-in（通用）／結局全畫面 cut-in
 * ========================================================================== */
// 通用 cut-in（雙槍破防／聖徒化降臨共用格式）：1.5 秒演出，期間鎖點擊。
export function playCutin(done, label, imgKey, opts){
  opts = opts || {};
  state.cutinPlaying=true;
  if(api.clockPause) api.clockPause();     // 演出期間碼表暫停（非可點不計時；聖徒化降臨/雙槍破防共用）
  const c=$('cutin');
  if(label!==undefined) $('cutinText').innerHTML = label;
  if(imgKey){ const ci=$('cutinImg'); const src=asset(imgKey); if(ci && src) ci.src=src; }
  c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  // cut-in 槍聲已全面取消：雙槍破防有 Luna_dual_se、聖徒化降臨有 SI_01，槍聲只留給盤面實際射擊
  setTimeout(()=>{
    c.classList.remove('on');
    state.cutinPlaying=false;
    if(done) done();
  }, 1500);
}

// 結局全畫面 cut-in（kind: 'burst' | 'obe' | 'execute' | 'return'）
function playSaintCutin(kind, done){
  state.cutinPlaying=true;                 // 演出期間鎖定點擊
  if(api.clockPause) api.clockPause();     // 結局全畫面 cut-in 期間碼表暫停（非可點不計時）
  const c=$('saintCutin');
  let title, sub;
  const enName=(($('enemyName')&&$('enemyName').textContent)||'目標');
  if(kind==='burst'){ title='MAXIMUM BURST'; sub='追加聖裁 · HP 50%'; }       // MB 未擊殺＝回 50%（D2）
  else if(kind==='execute'){ title='EXSECUTIŌ'; sub=enName+' · 消滅'; }
  else if(kind==='return'){ title='LIFE\nRETURN'; sub='生命歸還 · 血量保留'; }
  else { title='OVERWRITE\nBREAKER\nENGAGED'; sub='O.B.E. · HP 1'; }
  $('saintCutinTitle').textContent = title;
  $('saintCutinSub').textContent   = sub;
  // 依 kind 載入對應內嵌 cut-in 圖（資料放 ASSETS，程式只讀）
  const scImgKey = { execute:'cutin_exc', obe:'cutin_obe', burst:'cutin_mb', return:'cutin_return' };
  const scImgEl  = { execute:'saintCutinImg', obe:'saintCutinImgObe', burst:'saintCutinImgBurst', return:'saintCutinImgReturn' };
  if(scImgEl[kind]){ const el=$(scImgEl[kind]); if(el){ const src=asset(scImgKey[kind]); if(src) el.src=src; } }
  c.classList.remove('burst','obe','execute','return','on');
  c.classList.add(kind);
  void c.offsetWidth;                      // reflow → 重播動畫
  c.classList.add('on');
  // 結局 cut-in 專屬 SE（Luna；return＝生命歸還為 Renee，其 SE 由 partner.lifeReturn 播 vo_life_return——saint 不知觸發者）。
  //   槍聲/合成占位音已拔除——cut-in 只播專屬 SE；母帶偏小聲 → 播放端依 tuning.partnerSeGain 增幅。
  const scSeKey = { execute:'se_luna_exc', obe:'se_luna_obe', burst:'se_luna_mb' };
  if(scSeKey[kind]){
    const k=scSeKey[kind];
    SFX.play(asset(k), (GAME_CONFIG.tuning.partnerSeGain||{})[k]);
  }
  const holdMs = kind==='execute' ? 3000 : 1600;   // EXSECUTIŌ 停留 3 秒
  setTimeout(()=>{
    c.classList.remove('on');
    state.cutinPlaying=false;
    if(done) done();
  }, holdMs);
}

/* ============================================================================
 *  生命週期（combat 調度）
 * ========================================================================== */
// 停聖徒化計時器（combat.stopAll 調度）
export function stopTimers(){
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearTimeout(state.saintReactTimer); state.saintReactTimer=null;
}
// 全重置（combat.startGame 調度）：saintMode 經 exitSaint，清計時器/旗標、關手勢層。
export function reset(){
  stopTimers();
  if(state.saintMode) exitSaint();
  state.saintUsedThisBattle=false;
  state.saintDamageDealt=0;
  state.saintPrevBoard=null;
  state.saintPrevUlt=null;
  state.enemyAtkSuppressUntil=0;
  setReturnSwipe(false);
  $('grid').classList.remove('saint');
}

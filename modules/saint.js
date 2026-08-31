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

import { GAME_CONFIG, asset, sfxGain, isVoiceKey } from '../config.js';
import { state, enterSaint, exitSaint, enterNightmare, exitNightmare, markExecution, markMaxBurst, storyMode } from '../state.js';
import { SFX } from '../audio.js';
import { L, fmt } from '../i18n.js';   // 多語言（cut-in 副標/浮動字）

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;

// 數值一律讀 config
const SAINT_GRID              = T.saintGrid;              // 聖徒化盤面格數（16）
const SAINT_GRID_COLS         = T.saintGridCols;         // 每列格數（4）
const SAINT_ADVANCE_DIVISOR   = T.saintAdvanceDivisor;   // 一次受擊推進＝playerMax/此值（≈+1s）
const SAINT_PASSIVE_HEAL_SEC  = T.saintPassiveHealSec;   // 無受擊時被動回滿約需秒數
const SAINT_REACT_SEC_IN_SAINT= T.saintReactSecInSaint;  // 聖徒化期間放寬的每格反應時限（秒）
/* ⚠ ver -688 起**沒有人讀這兩個**（Ray：「把 boss 一進夢魘或聖徒就猛攻的設定
   拿掉」）—— 留著是為了讓「日後要恢復就把 setUltRate 加回去」有東西可指。 */
// const SAINT_ULT_MIN_MS = T.saintUltMinMs;   // 期間敵大絕頻率下限
// const SAINT_ULT_MAX_MS = T.saintUltMaxMs;   // 期間敵大絕頻率上限
const SAINT_COMBO_STEP        = T.saintComboStep;        // 期間每 combo 疊傷斜率（無上限）
const SAINT_LAST_HIT_RATIO    = T.saintLastHitRatio;     // 結束前清盤 → 追加期間總傷的比例（0.20）
/* ══ 惡夢化（Nightmare Install，ver -671，Ray 交稿）══════════════════════════
   「效果類似聖徒化，但發動時以**盤面上殘留的格數**，不會像 Saint install 一樣重置
     整個 16 格。秒數是有幾格就給幾秒 ×0.8……會以現有的 hp 開始扣除，直到剩 hp1
     熔斷，或者把殘格清空 hp 全恢復並在最後一擊增加 NI 期間造成的 20% 傷害
     （同 SI 的 MB）。若在 NI 發動期間把敵 hp 清零一樣有 excute。
     主動技是在 NI 期間往上劃可以一次性清除現有盤面造成相應傷害，但是沒有 MB，
     也不回血，直接結束 NI，hp 剩 1。」
   ⚠ 它是聖徒化的**鏡像**：同一套盤面／連擊／追加傷害的規矩，方向相反 ——
     聖徒化把血往上推（推滿＝OBE），惡夢化把血往下抽（抽乾＝熔斷）。
     所以實作放在**同一支模組**（鐵律 8）：兩者共用 `playCutin`／收尾／api。 */
const NI = T.nightmare || {};
const NI_SEC_PER_CELL = (NI.secPerCell!=null) ? NI.secPerCell : 0.8;   // 每一殘格給幾秒
const NI_BURST_FLOOR  = (NI.burstFloor!=null) ? NI.burstFloor : 0;     // 自爆打不死：敵血最低留這個比例
const NI_BURST_PCT    = (NI.burstPct!=null) ? NI.burstPct : 0.25;      // 滿格自爆＝敵最大 HP 的幾成
const NI_BURST_FULL   = (NI.burstFullCells!=null) ? NI.burstFullCells : 16;  // 「滿格」是幾格
const NI_BURST_NAME   = NI.burstName  || '';       // 自爆的名字（cut-in 的字）
const NI_BURST_CUTIN  = NI.burstCutin || '';       // 自爆的 cut-in 圖（ASSETS 鑰匙）

/* combat 於啟動時注入的原語（HP API / 盤面 / 傷害 / defense / partner）。 */
let api = {};
export function init(a){ api = a; }

/* ============================================================================
 *  發動 / 手勢入口
 * ========================================================================== */
// 敵人框左右滑到底 → 發動聖徒化（一場一次）。dir='right'|'left' 給對應橫斬特效。
// enemyHp<=0＝overkill 狀態（敵已死、等玩家收尾）：不可發動——白耗一場一次的聖徒化且無對象。
export function activateSaint(dir){
  /* ⚠ `noSaint`（ver -375）：這一場不准聖徒化（劇情插入戰，見 config.battles）。
     擋在**這一支**而不是各個入口 —— 手勢、鍵盤、日後任何新入口都會經過這裡（鐵律 8）。 */
  if(state.noSaint) return;
  if(state.over||state.saintMode||state.cutinPlaying||state.saintUsedThisBattle||state.transitioning||state.dualWield||state.enemyHp<=0) return;
  state.saintUsedThisBattle = true;   // saint 自有欄位：發動即鎖（一場一次），時序同 reference
  SFX.unlock(); SFX.ultCharge();
  SFX.play(asset('sfx_saint'), sfxGain('sfx_saint'));       // 聖徒化發動音效（SI_01）
  /* Luna 發動語音。⚠ 增益讀 config 的逐支表（tuning.fileGain），
     不寫死在這裡 —— 全域響度要能一處調完，漏一支就會突出來。 */
  SFX.playVoice(asset('voice_saint_luna'), sfxGain('voice_saint_luna'));
  playSlash(dir);                     // 依滑動方向的橫斬特效
  playCutin(()=>{
    if(state.over) return;
    startSaintMode();
  }, L.cutins.saintInstall+'<span class="cutin-en">SAINT INSTALL!!</span>',
     /* 聖徒化 cut-in 分流（ver -454，Ray：「story 版搭檔為諾薇兒時聖徒化用
        CI_Nouvelle_SAINTINSTALL」）：本篇＋搭檔諾薇兒＝她的那一張；
        其餘（試玩版、或日後本篇換搭檔）照舊 Luna。 */
     (storyMode() && state.pickedPartner==='nouvelle') ? 'cutin_nouvelle_saint'
                                                       : 'cutin_saint_luna',
     { noShot:true });
}

/* 聖徒化回血特效開關：玩家血條（倒數槽）轉金＋末端強光點（CSS .saint-heal） */
function setSaintBarFx(on){
  const b=document.querySelector('.hpbar.player-bar');
  if(b) b.classList.toggle('saint-heal', !!on);
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
  setSaintBarFx(true);                   // 回血特效：血條轉金＋末端強光點（見 style.css .saint-heal）
  state.saintPrevBoard = { N:state.N, cols:state.cols };
  api.setBoard(SAINT_GRID, SAINT_GRID_COLS);   // 維持 16 宮格
  api.buildGrid();
  api.floatDmg(L.battle.saintMode,'50%','20%',true);
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
  /* ⚠⚠ **聖徒化期間不再加密大絕**（ver -688，Ray：「把 boss 一進夢魘或聖徒就猛攻的
     設定拿掉」）——原本這裡會把 `ULT_MIN/MAX` 換成 `saintUltMinMs/MaxMs`。
     ⚠ `restoreUltRate()` 的呼叫留著：`saintPrevUlt` 是 null 時它直接 return，
       是冪等的保險；日後要恢復就把那兩行加回來。 */
  startSaintReactTimer();                // 起算第一格的反應時限
}

/* ============================================================================
 *  推進倒數槽（＝回血；推滿→OBE）
 *  amount＝本次推進量（playerMax 比例值）。走 combat 統一改血 API（healPlayer）。
 *  Counter／Perfect 免傷則不呼叫此函式。
 * ========================================================================== */
export function saintAdvance(amount){
  if(!state.saintMode) return;
  /* 倒數槽推至臨界（滿-1，即 99）即攔截——不進 OBE，交由教學／劇情引導生命歸還。
     ⚠⚠ 守門改問 `api.saintCriticalPending()`（ver -619）：原本寫死
       `state.tutorialActive`，於是 BOSS 那一場的聖徒化教學（走戰鬥卡的 `talk`，
       **不是教學**）整條吃不到，槽一推滿就 OBE，生命歸還沒機會發動
       （Ray：「生命歸還在 OBE 後不能用，所以要在生命 99% 時發動」）。
       ⚠ 誰在等那一拍由 tutorial 那一層回答（鐵律 8）；saint 只負責攔。 */
  if(api.onSaintCritical && (!api.saintCriticalPending || api.saintCriticalPending())){
    const cap = state.playerMax - 1;
    if(state.playerHp + amount >= cap){
      if(state.playerHp < cap) api.healPlayer(cap - state.playerHp);
      api.onSaintCritical();
      return;
    }
  }
  const hp = api.healPlayer(amount);     // 推進＝回血（上限裁切在 API 內）
  if(hp>=state.playerMax){
    /* ⚠⚠ 推滿＝OBE —— 但**敵人已經死了**（overkill 追打中）就不算敗走
       （ver -498；-499 Ray 放寬：「EXSECUTIŌ 只要清空敵 hp 就發生，不一定要
       最後一個敵人」）：人是你殺的，處刑沒點完而已 —— 走 MaxBurst 的收尾
       （敵死 → EXSECUTIŌ CI → onEnemyDefeated → 轉下一敵或結算閉棺，
       連戰中段照樣成立，處刑滿血接下一隻）。
       連帶：triggerOBE 的敵死分支從此走不到（唯一入口在這裡），留著當保險。 */
    if(state.enemyHp<=0){ triggerMaxBurst(); return; }
    triggerOBE();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 *  惡夢化（Nightmare Install，ver -671）—— 聖徒化的鏡像
 *  ⚠ 讀 §config.tuning.nightmare 與 saint* 那一組（共用的數字不重寫，鐵律 7）。
 * ════════════════════════════════════════════════════════════════════════ */
/* 殘格數（還沒點掉的）。⚠ 沒有盤面就回 0 —— 呼叫端要能容忍。 */
function niCellsLeft(){ return (state.cells||[]).filter(c=>!c.classList.contains('done')).length; }
/* 發動。⚠ **不重建盤面**（Ray 指定）：用現在這一盤剩下的格子，秒數由殘格數決定。 */
export function activateNightmare(){
  if(state.over || state.saintMode || state.niMode) return false;
  const left = niCellsLeft();
  if(left<=0) return false;
  playCutin(()=>startNightmareMode(left), L.battle.nightmareLabel||'NIGHTMARE INSTALL', 'ci_anya_ni');
  return true;
}
function startNightmareMode(left){
  if(state.over) return;
  enterNightmare();
  api.resetEnemyTimers();
  state.enemyAtkSuppressUntil = 0;
  api.scheduleUlt();
  setReturnSwipe(true);                  // 上滑＝惡夢化的主動技（見 nightmareActive）
  state.niDamage = 0;
  state.niCells  = 0;
  /* ══⚠⚠ **發動時先把血灌滿，再從滿血抽到 1**（ver -671）══
     Ray 的稿有兩句在這裡打架：「玩家受擊，hp1」→ 安雅發動惡夢化，而惡夢化
     「以現有的 hp 開始扣除，直到剩 hp1 熔斷」—— 現有的 hp 就是 1，這一段
     會在發動的那一瞬間就熔斷（實測：`niTotalMs` 11.2 秒，但 `niFrom` 是 1，
     倒數槽一格都跑不動）。
     ⚠ 兩句只能留一句能成立的：**灌滿再抽**。那也是這個機制的語氣 ——
       安雅把力量灌進來（血條瞬間填滿），然後一路流失；清空殘格＝守住了，
       「hp 全恢復」（Ray 的原話）正好是同一個狀態。
     ⚠ **這是我的判斷不是 Ray 的指定**：要改成「真的從現有 hp 開始抽」，
       把下面這一行的 `setPlayerHpRatio(1)` 拿掉就好（那時劇情殺要留多一點血）。 */
  api.setPlayerHpRatio(1);
  state.niFrom   = state.playerHp;
  state.niTotalMs= Math.max(1, left * NI_SEC_PER_CELL * 1000);
  state.combo    = 0;
  api.resetEnergy();
  $('grid').classList.add('saint','ni');
  setSaintBarFx(true);
  api.floatDmg(L.battle.nightmareLabel||'NIGHTMARE INSTALL','50%','20%',true);
  /* 抽血：從**發動當下的 HP**線性降到 1，跑完整段就是熔斷。
     ⚠ 用「起點 → 1」的線性而不是固定速率：Ray 說「以現有的 hp 開始扣除，
       直到剩 hp1 熔斷」—— 也就是**這一段的長度**由殘格數決定，不是由血量決定。 */
  const per = (state.niFrom - 1) / (state.niTotalMs/100);   // 每 100ms 抽多少
  clearInterval(state.niTimer);
  state.niTimer = setInterval(()=>{
    if(state.over||!state.niMode){ clearInterval(state.niTimer); state.niTimer=null; return; }
    if(state.cutinPlaying) return;       // 演出／對話暫停中凍結（同聖徒化）
    niDrain(per);
  }, 100);
  /* ⚠ 惡夢化期間同樣**不加密大絕**（ver -688，同聖徒化那一條）。 */
  /* ⚠⚠ **發動時高光第一個該點的號碼**（ver -683，Ray 指定）：惡夢化**不重建盤面**，
     所以玩家眼前是打到一半的殘局 —— 不指一下，他得先自己找「剛剛點到幾了」，
     而倒數槽已經在抽血了。
     ⚠ 走**既有的** `hintCurrentCell`（即死防禦之後那個「一次性續命導航」用的同一支，
       鐵律 8）—— 不要用 `markNext`：那一支在 `hint:false` 的盤面上什麼都不做
       （第二盤起全部是 false），等於沒指。
     ⚠ **只指這一次**（同聖徒化「只提示第一格」的規矩）：之後每點一格
       `nightmareTap` 會叫 `markNext`，在 hint 盤上自然就不再提示。 */
  if(api.hintCurrentCell) api.hintCurrentCell();
  startSaintReactTimer();
}
/* 抽血。⚠ 走 combat 統一的改血 API（`hurtPlayer` 不存在 → 用 healPlayer 的負值）。
   抽到 1 就熔斷。 */
function niDrain(amount){
  if(!state.niMode) return;
  /* ⚠⚠ **抽到 1 就停，不可以抽死**（ver -671）：Ray 的規格是「直到剩 hp1 熔斷」——
     直接把量交給 `healPlayer` 的話最後一下會把血扣成 0，那是**陣亡**不是熔斷
     （實測 `playerHp` 掉到 0）。所以先夾住這一次能抽多少。 */
  const room = state.playerHp - 1;
  if(room<=0){ niMeltdown(); return; }
  api.drainPlayer(Math.min(Math.abs(amount), room));
  if(state.playerHp<=1) niMeltdown();
}
/* 熔斷：時間到／血抽乾 → 惡夢化結束，HP 留 1。 */
function niMeltdown(){
  if(!state.niMode) return;
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreUltRate();
  api.floatDmg(L.battle.nightmareOut||'MELTDOWN','50%','28%',true);
  finishNightmare(()=>api.setPlayerHpRatio(0));   // 下限 floor 1 → 恰為 1 HP
}
/* 清空殘格 → 回滿 ＋ 最後一擊追加期間總傷 20%（同 SI 的 MaxBurst）。 */
function triggerNiBurst(){
  if(!state.niMode) return;
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreUltRate();
  if(state.niDamage>0){
    const last=Math.round(state.niDamage*SAINT_LAST_HIT_RATIO);
    api.enemyDamage(last, true, false, 'saint');
    api.floatDmg('MAXIMUM BURST '+last,'50%','28%',true);
    SFX.clear();
  }
  $('grid').classList.remove('saint','ni'); setSaintBarFx(false);
  if(state.enemyHp<=0){
    /* 「若在 NI 發動期間把敵 hp 清零一樣有 excute」（Ray 指定）。 */
    markExecution();
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(1); api.onEnemyDefeated(); });
    return;
  }
  markMaxBurst();   // 惡夢化清空殘格＝MB（Ray：「同 SI 的 MB」，ver -675）
  finishNightmare(()=>api.setPlayerHpRatio(1));   // 「hp 全恢復」
}
/* 主動技（上滑）：一次清掉殘格造成相應傷害 —— **沒有 MB、不回血、直接結束，HP 剩 1**。 */
export function nightmareActive(){
  if(!state.niMode) return false;
  clearSaintReactTimer();
  /* ══ 夢境粉碎（ver -674，Ray 交件 `CI_Anya_Dreambreaker`）══
     ⚠ **先演再結算**：cut-in 是「她發動了」，盤面清空與傷害是它的結果 ——
       反過來的話玩家會先看到數字再看到她出手。
     ⚠ 沒有圖／沒有名字就直接結算（cut-in 是演出不是規則）。 */
  if(NI_BURST_CUTIN){
    playCutin(()=>niBurstResolve(), NI_BURST_NAME, NI_BURST_CUTIN);
    return true;
  }
  return niBurstResolve();
}
function niBurstResolve(){
  if(!state.niMode) return false;
  /* ⚠⚠ **殘格只是清掉，不再逐格結算傷害**（ver -685，Ray：「夢境粉碎太弱了，
     改成夢魘期間清除格數的 2 倍傷害」）——舊算法的份量取決於**剩幾格**，
     於是玩家打得越好、殘格越少，自爆反而越弱，正好反過來。
     現在看的是**期間清掉了多少**（`niDamage`）：打得好就轟得重。 */
  for(const c of (state.cells||[])){
    if(c.classList.contains('done')) continue;
    c.classList.add('done'); c.classList.remove('next'); api.shatterCell(c);
  }
  /* 傷害 ＝ 敵人最大 HP × `burstPct` × （期間清掉的格數 ÷ 滿盤格數）。
     ⚠ 綁在**敵人最大 HP** 上：-685 的「期間累積傷害 ×2」在 900 血的場只打得出
       百來點，大場等於沒有（Ray：「還是太弱」）。 */
  const dmg = Math.round((state.enemyMax||0) * NI_BURST_PCT
                         * Math.min(1, (state.niCells||0) / NI_BURST_FULL));
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  setReturnSwipe(false); restoreUltRate();
  if(dmg>0){
    SFX.gunshot(true);
    /* ⚠⚠ **自爆打不死**（ver -673，Ray：「炸不死也沒關係，最後留個 10%」）：
       敵血最低留 `burstFloor`。所以這一擊的傷害要先夾住 —— 不是打完再把血加回來
       （那樣會先觸發「敵人死了」的那一整套演出，再憑空復活）。 */
    const floorHp = Math.ceil((state.enemyMax||0) * NI_BURST_FLOOR);
    const room = Math.max(0, state.enemyHp - floorHp);
    const real = NI_BURST_FLOOR>0 ? Math.min(dmg, room) : dmg;
    if(real>0) api.enemyDamage(real, true, false, 'saint');
    api.floatDmg(String(real),'50%','28%',true);
  }
  $('grid').classList.remove('saint','ni'); setSaintBarFx(false);
  if(state.enemyHp<=0){
    markExecution();
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(0); api.onEnemyDefeated(); });
    return true;
  }
  finishNightmare(()=>api.setPlayerHpRatio(0));   // HP 剩 1
  return true;
}
/* 惡夢化的盤面點擊（combat.tap 於 niMode 委派至此）。
   ⚠ 與 `saintTap` **同一套規則**，差別只有失誤的方向（抽血而不是推血）
     與清盤之後走哪一支收尾。 */
export function nightmareTap(num, cell){
  if(cell.classList.contains('done')) return;
  const hit=(bonusFree)=>{
    SFX.gunshot(true);
    cell.classList.add('done'); cell.classList.remove('next'); api.shatterCell(cell);
    state.combo++;
    const d=Math.round(api.hitDamage() + state.combo*SAINT_COMBO_STEP);
    api.enemyDamage(d, true, false, 'saint');
    state.niDamage += d;
    state.niCells++;                 // 夢境粉碎的份量由「清了幾格」換算（ver -688）
  };
  if(state.enemyHp<=0){                       // overkill：免順序追打（同聖徒化）
    hit(true);
    if(state.cells.every(c=>c.classList.contains('done'))) triggerNiBurst();
    else startSaintReactTimer();
    return;
  }
  if(num===state.expect){
    hit(false);
    state.expect++;
    if(state.expect>state.N) triggerNiBurst();
    else { api.markNext(); startSaintReactTimer(); }
  }else{
    /* 點錯＝多抽一次血（聖徒化那邊是多推一次）。
       ⚠ **這個懲罰是我定的**（Ray 只寫了時間與熔斷）：不給懲罰的話點錯毫無代價，
         而惡夢化本來就是「一路失血」的段落。份量與聖徒化的一次受擊相同。 */
    SFX.wrong();
    cell.classList.add('wrong'); setTimeout(()=>cell.classList.remove('wrong'),300);
    state.combo=0;
    api.floatDmg(L.battle.miss,'50%','44%',true);
    niDrain(state.playerMax/SAINT_ADVANCE_DIVISOR);
    if(state.niMode) startSaintReactTimer();
  }
}
/* 惡夢化的收尾：回到當前盤面。⚠ 與 `finishSaintMode` **不同的只有一件事** ——
   盤面**不還原**（惡夢化本來就沒有換過盤面），所以不叫 `setBoard`／`buildGrid`；
   全清的那一次由 combat 的正常流程接手（`expect>N` 已經在 tap 那邊處理）。 */
function finishNightmare(finalHpThunk){
  $('grid').classList.remove('saint','ni'); setSaintBarFx(false);
  restoreUltRate();
  if(finalHpThunk) finalHpThunk();
  /* ⚠⚠ **惡夢化退掉才補判被動的門檻**（ver -688，Ray：「明晰之夢在夢魘期間不發動，
     如果是夢魘期間 hp 降到標準以下，要等夢魘退掉才會發動」）——
     期間 `partner.checkLowHpBuff` 直接 return（上膛狀態留著），這裡叫一次它才真的發動。
     ⚠ 要在 `finalHpThunk` **之後**：那一支才剛把結局血量設好（熔斷／自爆＝1、
       清盤＝滿），門檻要對著結果判，不是對著過程判。 */
  if(api.checkLowHpBuff) api.checkLowHpBuff();
  api.resetEnemyTimers();
  if(!state.over){
    /* 殘格已經全部點掉 → 交給 combat 換下一盤；還有殘格 → 就地接回正常盤面規則。 */
    if(state.cells && state.cells.every(c=>c.classList.contains('done'))) api.goNextBoard();
    else api.markNext();
    api.resetIntervalDeadline();
    api.startIntervalTimer();
    api.scheduleUlt();
    if(api.clockResume) api.clockResume();
  }
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
    api.enemyDamage(okDmg, true, false, 'saint');
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
    api.enemyDamage(d, true, false, 'saint');
    state.saintDamageDealt += d;                 // 累計期間傷害（供最後一擊追加）
    state.expect++;
    if(state.expect>state.N){ triggerMaxBurst(); }              // 推滿前點完全盤 → Maximum Burst
    else { api.markNext(); startSaintReactTimer(); }           // 點對一格 → 重設反應時限
  }else{
    // 點錯（掃格失誤）＝一次「受擊」：統一推進 +1 秒
    SFX.wrong();
    cell.classList.add('wrong'); setTimeout(()=>cell.classList.remove('wrong'),300);
    state.combo=0;
    api.floatDmg(L.battle.miss,'50%','44%',true);
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
    api.floatDmg(L.battle.tooSlowEn,'50%','40%',true);
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
    api.enemyDamage(last, true, false, 'saint');
    api.floatDmg('MAXIMUM BURST '+last,'50%','28%',true);
    SFX.clear();
  }
  $('grid').classList.remove('saint'); setSaintBarFx(false);
  if(state.enemyHp<=0){
    // 追加傷害讓敵人 HP 歸零 → EXSECUTIŌ 演出後 → 轉下一敵 or（最後一敵）結算。
    // 成功 MB 滿血獎勵（D2）：擊殺也回滿——連戰下 MB 秒殺一敵後帶滿血接下一隻。
    markExecution();   // sawExecution=true（評價 Execution 加乘）
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(1); api.onEnemyDefeated(); });
    return;
  }
  markMaxBurst();   // 未擊殺的 MB（ver -675）：評價折 10 秒，見 config.rating.penalty
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
    playSaintCutin('obe', ()=>{ $('grid').classList.remove('saint'); setSaintBarFx(false); api.setPlayerHpRatio(0); api.onEnemyDefeated(); });
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
  api.floatDmg(L.battle.lifeReturn,'50%','28%',true);
  // 第四結局 cut-in → 結束後回盤面，血量維持當前值（saintMode 已關、計時器已停，HP 不再變動）
  playSaintCutin('return', ()=>{
    finishSaintMode(()=>{ /* 保留當前血量：不改血 */ });
  });
  if(api.onSaintEnded) api.onSaintEnded('return');   // 教學終盤掛鉤（非教學 no-op）
}

/* 共用收尾：回到當前 9/16 盤面，敵人排程/間隔懲罰全部歸零，恢復正常扣血攻擊。
 * finalHpThunk：由各結局傳入，於此執行結局血量設定（一律走 combat 改血 API）。 */
function finishSaintMode(finalHpThunk){
  $('grid').classList.remove('saint'); setSaintBarFx(false);
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
    // 聖徒化全程不計時（clockResume 內以 saintMode 擋下）→ 收尾回盤面才接回碼表。
    //   此處 saintMode 已由各結局的 exitSaint 關閉、cutinPlaying 亦已於 cut-in 收尾清除，
    //   故 clockResume 會真的起算（不靠玩家下一次點擊補起算，免得漏計那段空檔）。
    if(api.clockResume) api.clockResume();
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
  const ci=$('cutinImg');
  const src=imgKey ? asset(imgKey) : null;
  // cut-in 槍聲已全面取消：雙槍破防有 Luna_dual_VC、聖徒化降臨有 SI_01，槍聲只留給盤面實際射擊
  const start=()=>{
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    setTimeout(()=>{
      c.classList.remove('on');
      // ⚠ 教學對話開著時不清暫停旗標：cut-in（如即死防禦）與教學對話重疊時，
      //   這裡清掉會讓盤面在對話中恢復可點（懲罰/插話亂入，曾致陣亡重開流程被劫持）。
      //   對話層收段時自會 resumeFromDialog。
      state.cutinPlaying = !!state.tutorialDialog;
      if(done) done();
    }, 1500);
  };
  if(ci && src){
    if(ci.getAttribute('src')!==src) ci.src=src;
    // ⚠ 圖未解碼完就起跑＝滑入動畫中途解碼大圖卡死主執行緒（cut-in 卡在一半的主因，
    //   手機尤甚）→ 先 decode 再開演；解碼失敗或逾時 300ms 照樣開演不擋流程（go 冪等）。
    let started=false;
    const go=()=>{ if(!started){ started=true; start(); } };
    (ci.decode ? ci.decode() : Promise.resolve()).then(go, go);
    setTimeout(go, 300);
  } else start();
}

// 結局全畫面 cut-in（kind: 'burst' | 'obe' | 'execute' | 'return'）
function playSaintCutin(kind, done){
  state.cutinPlaying=true;                 // 演出期間鎖定點擊
  if(api.clockPause) api.clockPause();     // 結局全畫面 cut-in 期間碼表暫停（非可點不計時）
  const c=$('saintCutin');
  let title, sub;
  const enName=(($('enemyName')&&$('enemyName').textContent)||'目標');
  if(kind==='burst'){ title='MAXIMUM BURST'; sub=L.cutins.mbSub; }       // MB 未擊殺＝回 50%（D2）
  else if(kind==='execute'){ title='EXSECUTIŌ'; sub=fmt(L.cutins.executeSub,{name:enName}); }
  else if(kind==='return'){ title='LIFE\nRETURN'; sub=L.cutins.lifeReturnSub; }
  else { title='OVERWRITE\nBREAKER\nENGAGED'; sub=L.cutins.obeSub; }
  $('saintCutinTitle').textContent = title;
  $('saintCutinSub').textContent   = sub;
  // 依 kind 載入對應內嵌 cut-in 圖（資料放 ASSETS，程式只讀）
  /* ⚠ 生命歸還在**本篇**換成諾薇兒那一張（ver -454，Ray：「story 版的生命歸還 CI
     換成 Nouvelle_Sturm」）：本篇的搭檔是諾薇兒，演出裡出現蕾妮是錯的人。
     試玩版照舊 Renee。 */
  const scImgKey = { execute:'cutin_exc', obe:'cutin_obe', burst:'cutin_mb',
                     return: storyMode() ? 'cutin_return_nouvelle' : 'cutin_return' };
  const scImgEl  = { execute:'saintCutinImg', obe:'saintCutinImgObe', burst:'saintCutinImgBurst', return:'saintCutinImgReturn' };
  if(scImgEl[kind]){ const el=$(scImgEl[kind]); if(el){ const src=asset(scImgKey[kind]); if(src) el.src=src; } }
  c.classList.remove('burst','obe','execute','return','on');
  c.classList.add(kind);
  void c.offsetWidth;                      // reflow → 重播動畫
  c.classList.add('on');
  // 結局 cut-in 專屬 SE（Luna；return＝生命歸還為 Renee，其 SE 由 partner.lifeReturn 播 vo_life_return——saint 不知觸發者）。
  /*   槍聲/合成占位音已拔除——cut-in 只播專屬 SE。
       ⚠ 這三支**不在同一層**：exc/obe 是 Luna 的語音（走語音鏈），
         而 burst 的 se_luna_mb 是音效（不走）。舊名 Luna_MB_SE 就已經
         說了它是 SE，只是舊版把四支一起放進語音表。 */
  const scSeKey = { execute:'se_luna_exc', obe:'se_luna_obe', burst:'se_luna_mb' };
  if(scSeKey[kind]){
    const k=scSeKey[kind];
    /* ⚠ exc/obe 是語音（走語音鏈），burst 的 se_luna_mb 是音效（不走）——
       判斷依據是 config 的 `voiceKeys`（ver -441 起；以前是「在不在
       partnerSeGain 那張表裡」，增益一搬家那個判斷就會憑空消失）。 */
    if(isVoiceKey(k)) SFX.playVoice(asset(k), sfxGain(k));
    else              SFX.play(asset(k), sfxGain(k));
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
  clearInterval(state.niTimer); state.niTimer=null;
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearTimeout(state.saintReactTimer); state.saintReactTimer=null;
}
// 全重置（combat.startGame 調度）：saintMode 經 exitSaint，清計時器/旗標、關手勢層。
export function reset(){
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  state.niDamage=0; state.niFrom=0; state.niTotalMs=0;
  const g0=$('grid'); if(g0) g0.classList.remove('ni');
  stopTimers();
  if(state.saintMode) exitSaint();
  state.saintUsedThisBattle=false;
  state.saintDamageDealt=0;
  state.saintPrevBoard=null;
  state.saintPrevUlt=null;
  state.enemyAtkSuppressUntil=0;
  setReturnSwipe(false);
  $('grid').classList.remove('saint'); setSaintBarFx(false);
}

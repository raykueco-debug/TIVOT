/* ============================================================================
 *  modules/saint.js — 聖徒化（v18 受擊推進式）
 *  ---------------------------------------------------------------------------
 *  職責：降臨 → 推進 → 三結局。血條改為倒數槽，只有真受擊才推進
 *    （受擊 ≈+1s / 格擋 ≈+0.5s / Counter・Perfect 免傷不推進 / 無受擊約 10s 回滿）；
 *    維持 16 宮格、期間敵大絕更密集；左右滑觸發、生命歸還下滑觸發。
 *    三結局：
 *      Maximum Burst（EXSECUTIŌ）：滿前清盤，追加期間總傷 20%，sawExecution=true。
 *        回血＝playerMax 的 50%（刻意偏離 reference 的 10%，見 DECISIONS.md D2）。
 *      OBE：推進到滿＝沒守住（ver -964 起**不扣血**，維持當前血量＝全滿）。
 *      生命歸還：下滑觸發，中止並保留當前血量（第四結局，不改血）。
 *
 *  狀態擁有者：3.5 聖徒化（見 state.js）。
 *  ⚠ 契約鐵律：
 *    · saintMode 只有本模組能寫，且一律經 state.enterSaint()/exitSaint()；
 *      其他模組只讀 state.saintMode 分支。此契約若破＝退回舊單檔病灶。
 *    · 改血一律走 combat 的統一改血 API（api.healPlayer / api.setPlayerHpRatio，Part A）；
 *      saint 不得直接寫 state.playerHp。
 *    · 大絕頻率（ASSAULT_MIN/MAX）為 defense 擁有：saint 只「讀」現值存進自有 saintPrevAssault，
 *      實際「寫」經 api.setAssaultRate（defense 擁有者管道）。
 *
 *  依賴：只 import state / config / audio。combat / defense / enemy / partner 的原語
 *    一律由 combat 於 setup() 注入 api（維持 §2 依賴方向，不反向 import）。
 * ========================================================================== */

import { GAME_CONFIG, asset, sfxGain, isVoiceKey } from '../config.js';
import { state, enterSaint, exitSaint, enterNightmare, exitNightmare, enterCoop, exitCoop, markExecution, markMaxBurst, storyMode } from '../state.js';
import { SFX } from '../audio.js';
import { L, fmt } from '../i18n.js';   // 多語言（cut-in 副標/浮動字）
import * as prog from '../script/progress.js';   // 九階強化的加成（ver -707；葉節點，無循環）

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;

// 數值一律讀 config
const SAINT_GRID              = T.saintGrid;              // 聖徒化盤面格數（16）
const SAINT_GRID_COLS         = T.saintGridCols;         // 每列格數（4）
const SAINT_ADVANCE_DIVISOR   = T.saintAdvanceDivisor;   // 一次受擊推進＝playerMax/此值（≈+1s）
const SAINT_PASSIVE_HEAL_SEC  = T.saintPassiveHealSec;   // 無受擊時被動回滿約需秒數
const SAINT_REACT_SEC_IN_SAINT= T.saintReactSecInSaint;  // 聖徒化期間放寬的每格反應時限（秒）
/* ⚠ ver -688 起**沒有人讀這兩個**（Ray：「把 boss 一進夢魘或聖徒就猛攻的設定
   拿掉」）—— 留著是為了讓「日後要恢復就把 setAssaultRate 加回去」有東西可指。 */
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
const NI_MAX_SEC      = (NI.maxSec!=null) ? NI.maxSec : 15;          // 沒挨打時這一段最長幾秒（ver -967）
const NI_BURST_FLOOR  = (NI.burstFloor!=null) ? NI.burstFloor : 0;     // 自爆打不死：敵血最低留這個比例
const NI_MELT_NAME    = NI.meltdownName  || 'MELTDOWN';  // 熔斷的字
const NI_MELT_CUTIN   = NI.meltdownCutin || '';          // 熔斷的 cut-in（ASSETS 鑰匙）
const NI_BURST_PCT    = (NI.burstPct!=null) ? NI.burstPct : 0.25;      // 滿格自爆＝敵最大 HP 的幾成
const NI_BURST_HEAL   = (NI.burstHealPct!=null) ? NI.burstHealPct : 0;  // 自爆回血＝玩家最大 HP 的幾成（滿格時）
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
  /* ══⚠⚠ 右滑的分流（ver -745，Ray：「看當下伙伴是誰就走誰的系統。四個系統：
     璐娜聖徒（挑戰限定）、聖徒（諾）、夢魘（安）、共鬥（索、未實裝）」）══
     唯一的發動點在這一支（鐵律 8）：手勢／鍵盤／教學閘門全部經過這裡。
     · 本篇搭檔安雅 → **惡夢化**（先前右滑會走露娜版聖徒化，Ray 回報的 bug）
     · 本篇搭檔索菈娜 → 共鬥：**未實裝**（Ray 的卡還沒到），先不作動
     · 本篇其餘（諾薇兒）→ 往下走聖徒化（資產已依 storyMode 分諾薇兒版）
     · 試玩版 → 往下走（露娜版） */
  if(state.noSaint) return;
  if(storyMode() && state.pickedPartner==='anya'){
    if(state.over||state.saintMode||state.niMode||state.cutinPlaying||state.saintUsedThisBattle
       ||state.transitioning||state.dualWield||state.enemyHp<=0) return;
    state.saintUsedThisBattle = true;   // Install 一場一次：聖徒化與惡夢化同一個槽
    activateNightmare();
    return;
  }
  if(storyMode() && state.pickedPartner==='sorana'){ activateCoop(dir); return; }   // 共鬥（ver -803）
  if(state.over||state.saintMode||state.cutinPlaying||state.saintUsedThisBattle||state.transitioning||state.dualWield||state.enemyHp<=0) return;
  state.saintUsedThisBattle = true;   // saint 自有欄位：發動即鎖（一場一次），時序同 reference
  SFX.unlock(); SFX.ultCharge();
  SFX.play(asset('sfx_saint'), sfxGain('sfx_saint'));       // 聖徒化發動音效（SI_01）
  /* Luna 發動語音。⚠ 增益讀 config 的逐支表（tuning.fileGain），
     不寫死在這裡 —— 全域響度要能一處調完，漏一支就會突出來。 */
  /* 降臨語音（ver -711）：本篇＝諾薇兒，試玩版照舊露娜（同 cut-in 圖的分流，鐵律 8）。
     ⚠ 增益讀 config 的逐支表（tuning.fileGain），不寫死在這裡。 */
  { const vk = storyMode() ? 'vo_nou_saint' : 'voice_saint_luna';
    SFX.playVoice(asset(vk), sfxGain(vk)); }
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

/* ============================================================================
 *  共鬥（Predator's Pack，ver -803，Ray 交稿）— 索菈娜的變身
 * ----------------------------------------------------------------------------
 *  發動邏輯等同聖徒化（右滑、每場一次、消耗破防值），但**不是盤面模式** ——
 *  不換 16 格、不動血條，而是開一段**無敵窗**：
 *    · 免傷（走 partner 的 immune 窗；免傷仍算受擊、只是不扣血）＝「無敵」
 *    · 敵攻擊自動完美反擊、無延時懲罰（combat.enemyAttack 的 coopMode 分支）
 *    · 點錯不受擊，但每次點錯縮短窗口（combat.tap 的 coopMode 分支 → coopShorten）
 *  秒數 ＝ baseSec × (破防值/100)（下夾 minSec），發動消耗全部破防值。
 *  ⚠ 參數全在 config.partners.sorana.coop（鐵律 1）；無敵窗的擁有者是 partner
 *    （`setImmuneUntil`，注入為 `api.coopImmune`），coopMode 旗由本模組獨佔寫入。
 * ========================================================================== */
let coopTimer = null;
export function activateCoop(dir){
  if(state.over||state.saintMode||state.niMode||state.coopMode||state.cutinPlaying
     ||state.saintUsedThisBattle||state.transitioning||state.dualWield||state.enemyHp<=0) return;
  if(state.energy<=0) return;                         // 隨時可發，但要有破防值
  const card = (GAME_CONFIG.partners && GAME_CONFIG.partners[state.pickedPartner]) || {};
  const c = card.coop || {};
  const en = Math.max(0, Math.min(100, state.energy));
  const sec = Math.max(c.minSec||3, (c.baseSec||12) * en/100);
  state.saintUsedThisBattle = true;                   // 與聖徒化／惡夢化同槽（一場一次）
  if(api.resetEnergy) api.resetEnergy();              // 消耗全部破防值
  /* ⚠ 發動**那一刻**先把場上的攻擊圈收掉（ver -871，Ray：「索拉娜的共鬥發動時
     不會清場上的攻擊圈」）—— 不清的話紅圈掛著陪整段 cut-in、一路留進無敵窗。
     排程一併歸零；窗開起（startCoop）那邊照舊再 reset＋scheduleAssault。 */
  if(api.resetEnemyTimers) api.resetEnemyTimers();
  SFX.unlock(); SFX.ultCharge();
  SFX.play(asset('sfx_saint'), sfxGain('sfx_saint'));
  /* 共鬥發動語音（ver -818）：pack/pack2 輪播 —— ver -837 起走 SFX.pickRot（鐵律 8）。 */
  { const vk = SFX.pickRot(c.voice);
    if(vk) SFX.playVoice(asset(vk), sfxGain(vk)); }
  playSlash(dir);
  playCutin(()=>{ if(state.over) return; startCoop(sec); },
    /* ⚠ 英文讀**卡上的 `install.en`**（ver -894 由 PACK 改成 FANGS，Ray 指定）——
       以前寫死在這裡，改名要動兩處（鐵律 7）。卡沒寫才回去用預設。 */
    (L.battle && L.battle.coopMode || '共鬥')
      +'<span class="cutin-en">'+(((card.install&&card.install.en)||"PREDATOR'S FANGS")+'!!')+'</span>',
    card.cutin || 'ci_sorana_predator', { noShot:true });
}
function startCoop(sec){
  if(state.over) return;
  enterCoop();
  api.resetEnemyTimers(); state.enemyAtkSuppressUntil = 0; api.scheduleAssault();
  const until = Date.now() + sec*1000;
  state.coopUntil = until;
  if(api.coopImmune) api.coopImmune(until);            // 開無敵窗（partner.setImmuneUntil）
  const g=$('grid'); if(g) g.classList.add('coop');
  api.floatDmg(L.battle && L.battle.coopMode || '共鬥','50%','20%',true);
  /* ⚠ 發動時指一下「現在該點的格子」（ver -833，Ray：「聖徒夢魘共鬥發動後都要
     標示現在應該點的格子」）—— 共鬥不換盤面，玩家眼前是打到一半的殘局。
     走既有的 hintCurrentCell（鐵律 8）；只指這一次，之後照盤面自己的提示規則。 */
  if(api.hintCurrentCell) api.hintCurrentCell();
  clearInterval(coopTimer);
  coopTimer = setInterval(()=>{
    if(state.over || Date.now() >= state.coopUntil) endCoop();
  }, 100);
}
/* 點錯 → 縮短無敵窗（combat 的 coopMode 分支呼叫）。 */
export function coopShorten(sec){
  if(!state.coopMode) return;
  state.coopUntil = Math.max(Date.now(), state.coopUntil - Math.max(0,sec)*1000);
  if(api.coopImmune) api.coopImmune(state.coopUntil);
  if(Date.now() >= state.coopUntil) endCoop();
}
function endCoop(){
  if(!state.coopMode) return;
  clearInterval(coopTimer); coopTimer = null;
  exitCoop();
  state.coopUntil = 0;
  if(api.coopImmune) api.coopImmune(0);                // 關無敵窗
  const g=$('grid'); if(g) g.classList.remove('coop');
  /* 共鬥時間結束＝飛刀耗盡（obe，ver -818／-822，Ray）——只在**時間到／被縮短到 0**
     那種「窗結束」時播；戰鬥結束（勝/敗，state.over）不播，免得蓋在結算上。
     語音 vo_sorana_obe 與 CI_Sorana_obe 同步（同發動 cut-in 的作法）。 */
  if(!state.over){
    const c = ((GAME_CONFIG.partners && GAME_CONFIG.partners[state.pickedPartner]) || {}).coop || {};
    const ek = SFX.pickRot(c.endVoice);   // ver -837：obe1/obe2 輪播
    if(ek) SFX.playVoice(asset(ek), sfxGain(ek));
    if(c.endCutin) playCutin(()=>{ if(api.hintCurrentCell) api.hintCurrentCell(); },
                             c.endName || '', c.endCutin, { noShot:true });
    else if(api.hintCurrentCell) api.hintCurrentCell();   // 飛刀耗盡後指格（ver -874，同 OBE）
  }
}
export function coopActive(){ return !!state.coopMode; }
/* 重置 Install 槽（ver -837，Ray：「連五場會再發動一次並重置獵手的共鬥」）——
   `saintUsedThisBattle` 的擁有者是 saint（§3.5），跨模組的寫一律走具名 setter：
   partner 的獵手的戰吼經 combat 注入呼叫這一支，不直接改 state。 */
export function resetInstallSlot(){ state.saintUsedThisBattle = false; }

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
  api.scheduleAssault();                     // 立即排下一次大絕（不延後）
  setReturnSwipe(true);                  // 開啟生命歸還手勢層
  /* ══ 「斷鉗星」（諾薇兒 Lv6，ver -971）：發動時體力降至 1 ══
     聖徒化的長度＝倒數槽從**當下血量**推到滿要多久，所以血越少撐越久
     （Ray 的卡抬頭：「聖徒化（血越少持續時間越長）」）—— 這顆星把它推到極限。
     ⚠ 要在 `enterSaint()` **之後**：血條的語意這時才由一般血換成倒數槽。
     ⚠ 走 `api.setPlayerHpRatio(0)`（下限夾 1 HP，既有語意，鐵律 8）。 */
  if(prog.girlHas(state.pickedPartner,'saintStartHp1') && api.setPlayerHpRatio) api.setPlayerHpRatio(0);
  state.saintDamageDealt = 0;
  state.combo = 0;                       // 期間 saint 代理盤面游標（combat 已讓出主迴圈）
  /* 破防值**不清**（ver -749，Ray：「聖徒化／夢魘化都不要清空破防值」）——
     期間本來就不累積（盤面由 saint 代理，不走 combat.tap 的 addEnergy），
     存量凍著，退出後接著用。 */
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
     設定拿掉」）——原本這裡會把 `ASSAULT_MIN/MAX` 換成 `saintUltMinMs/MaxMs`。
     ⚠ `restoreAssaultRate()` 的呼叫留著：`saintPrevAssault` 是 null 時它直接 return，
       是冪等的保險；日後要恢復就把那兩行加回來。 */
  startSaintReactTimer();                // 起算第一格的反應時限
}

/* ============================================================================
 *  推進倒數槽（＝回血；推滿→OBE）
 *  amount＝本次推進量（playerMax 比例值）。走 combat 統一改血 API（healPlayer）。
 *  Counter／Perfect 免傷則不呼叫此函式。
 * ========================================================================== */
/* ══ 九階強化「源泉」（ver -707，Ray：「聖徒化期間連續普攻 3 Combo，可微量增加
   聖徒化時間」）══ 每連續 `saintCombo` 發就把倒數槽**往回退**相當於 `saintSec` 秒的量。
   ⚠ SI 的「時間」就是那條槽（推滿＝OBE），所以「增加時間」＝退槽，不是另開一個計時器。
   ⚠ 一秒值多少槽由**被動推進的速率**換算（`playerMax / SAINT_PASSIVE_HEAL_SEC`）——
     那是槽與秒之間唯一的匯率，不要另訂一個（鐵律 7）。
   ⚠ 連擊**斷了就歸零**（受擊／點錯／清盤都會斷 `state.combo`，這裡跟著它走）。 */
let siComboSeen = 0;
export function onSaintTap(){
  if(!state.saintMode) return;
  const need = prog.bonus('saintCombo'), sec = prog.bonus('saintSec');
  if(!(need>0) || !(sec>0)) return;
  if(++siComboSeen < need) return;
  siComboSeen = 0;
  /* ⚠⚠ **退槽要走 `drainPlayer`，不能用 `saintAdvance(負值)`** —— `healPlayer`
     開頭就 `Math.max(0, amount)`，負數會被整個吃掉、什麼都不會發生
     （ver -671 的惡夢化抽血就是踩這個，查了好幾版）。 */
  if(api.drainPlayer) api.drainPlayer((state.playerMax / SAINT_PASSIVE_HEAL_SEC) * sec);
}
export function resetSaintCombo(){ siComboSeen = 0; }
/* ══⚠⚠ 聖徒化每 combo 的疊傷斜率：**唯一的計算點**（ver -971）══
   底值在 `tuning.saintComboStep`（1.0），諾薇兒 Lv1「先鋒星」把它乘到 1.5
   （卡上寫的是增量 `saintComboMul:0.5`，加總走 `prog.girlBonus`）。
   ⚠ **不可以快取成模組常數**（像 `SAINT_COMBO_STEP` 那樣）：等級是遊戲中途才變的，
     快取的話升級要重整頁面才生效（同 `gunTuneMul`／`playerMaxHp` 踩過的那個坑）。
   ⚠ combat 也要用它（生命歸還之後那扇「連擊延續」窗，見諾薇兒卡的
     `comboKeepSeconds`）—— 所以 export，不要在那邊再算一次。 */
export function saintComboStep(){
  return SAINT_COMBO_STEP * (1 + prog.girlBonus(state.pickedPartner, 'saintComboMul'));
}
/* ══ 「拳鬥者星」（安雅 Lv1，ver -974）：夢魘化期間普攻與反擊 ×1.2 ══
   **只有這一支在算**（鐵律 7）：夢魘化的普攻在 `nightmareTap` 乘、反擊由 combat
   注入給 `weapon.weaponCounter` 乘 —— 兩邊問同一支。
   ⚠ 只在夢魘化期間；不快取（等級中途會變）。 */
export function niAtkMul(){
  if(!state.niMode) return 1;
  return 1 + prog.girlBonus(state.pickedPartner, 'niDmgMul');
}
/* ══ 「雙生星」（安雅 Lv9，ver -974）：每一次反擊讓夢魘化的抽血停 0.5 秒 ══
   實作＝把這一段的**總長**延長 0.5 秒。抽血是「從起點線性到 1」，總長一拉長，
   之後每一刻扣得就少 —— 與「停 0.5 秒」等價，而且不必另做一套暫停／續跑的狀態
   （那會與受擊、cut-in 凍結那幾條互相打架）。
   ⚠ 呼叫點只有 combat 注入給 defense 的那個 `weaponCounter` 包裝（＝「反擊開火了」，
     三帶都算）—— `partner.onCounter` 進不來（它在 niMode 直接 return）。 */
export function niCounterPause(){
  if(!state.niMode) return;
  const sec = prog.girlBonus(state.pickedPartner, 'niCounterPauseSec');
  if(sec>0) state.niTotalMs = (state.niTotalMs||0) + sec*1000;
}
/* ══ 「負行星」（諾薇兒 Lv8，ver -971）：聖徒化期間每一發射擊都延長倒數 ══
   聖徒化的血條＝倒數槽，**扣血＝延長**。第 2 hit 起，每發扣 `playerMax` 的 1%。
   ⚠ 「第 2 Hit 開始」＝`state.combo>=2`（點錯歸零之後要重新數，那正是 Ray 說的
     「隨 Combo 緩增」）。
   ⚠⚠ 走 `api.drainPlayer`（下限夾 1 ＝「不可歸零」）——**不可以用
     `saintAdvance(負值)`**：`healPlayer` 開頭就 `Math.max(0, amount)`，
     負數會被整個吃掉、什麼都不會發生（ver -671 惡夢化抽血踩過同一個坑）。 */
function saintDrainTick(){
  if(!state.saintMode || state.combo < 2) return;
  const pct = prog.girlBonus(state.pickedPartner, 'saintDrainPct');
  if(pct>0 && api.drainPlayer) api.drainPlayer(state.playerMax * pct);
}
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
/* 發動。⚠⚠ **重建成 16 宮格**（ver -690，Ray：「夢魘改成固定 16 格吧，跟 SI 一樣」）——
   -671~-689 是「沿用殘局」，秒數也隨殘格數變；現在盤面與聖徒化同一套：滿盤 16 格，
   收尾再把原本的盤面換回來。**長度**自 ver -967 起是固定的最長 15 秒（見 `NI_MAX_SEC`）。
   ⚠ 連帶：`niCellsLeft` 那一支沒有人用了（份量改由 `niCells` 計數，見 `nightmareTap`）。 */
/* ══⚠⚠⚠ **ver -967（Ray）：「夢魘發動不清盤面攻擊圈」** ══
   發動的那一刻**不動敵人的任何計時器** —— 場上已經在縮的攻擊圈留著、蓄力留著、
   下一次攻擊的排程也留著。惡夢化是「直接介入」，不是重開一局。
   ⚠⚠ 但**光是不清掉還不夠**：cut-in 那 1.5 秒 `updateThreats` 會因 `cutinPlaying`
     整個凍住（畫面不動），而每一顆圈的 `t0` 是**真實時間**在跑 —— 演出結束時
     它們會一次縮掉 1.5 秒，時間到的那幾顆當場開火。玩家在那 1.5 秒**根本不能點**，
     那是白挨的。所以要走既有的 `pauseThreats`／`resumeThreats`（鐵律 8，
     退出確認框與戰鬥中對話用的同一對）：暫停時記下時刻、續玩時把時長補回每顆的
     `t0` ＝**剩餘時間不變**。
   ⚠ 這與聖徒化**刻意不同**（那邊照舊 `resetEnemyTimers()`＋重排）：Ray 只改了夢魘。
   ⚠ cut-in 期間排到的那一次攻擊不會憑空消失 —— `scheduleAssault` 的計時器看到
     `cutinPlaying` 會自己往後重排（defense.js:106），不必在這裡處理。 */
let niPausedThreats = false;   // ver -967：這一次的攻擊圈凍結是不是我做的（見下）
export function activateNightmare(){
  if(state.over || state.saintMode || state.niMode) return false;
  SFX.playVoice(asset('vo_anya_ni'), sfxGain('vo_anya_ni'));   // 惡夢化降臨語音（ver -711）
  /* ⚠ 只有**這一次真的由我凍住的**才由我解凍（`pauseThreats` 的回傳值）——
     這一招常常是在教學對話裡被觸發的，那時圈早就被 `pauseForDialog` 凍著了，
     由我解凍會變成「對話還開著、圈卻在縮」。 */
  niPausedThreats = !!(api.pauseThreats && api.pauseThreats() === true);
  playCutin(()=>startNightmareMode(), L.battle.nightmareLabel||'NIGHTMARE INSTALL', 'ci_anya_ni');
  return true;
}
function startNightmareMode(){
  if(state.over) return;
  enterNightmare();
  /* ver -967（Ray：「夢魘發動不清盤面攻擊圈」）：**不** `resetEnemyTimers()`、
     **不**重排 `scheduleAssault()`、**不**清 `enemyAtkSuppressUntil` ——
     只把 cut-in 期間凍住的攻擊圈原樣接回（剩餘時間不變）。理由見 activateNightmare。 */
  if(niPausedThreats && api.resumeThreats){ api.resumeThreats(); }
  niPausedThreats = false;
  setReturnSwipe(true);                  // 上滑＝惡夢化的主動技（見 nightmareActive）
  state.niDamage = 0;
  state.niCells  = 0;
  /* ══⚠⚠⚠ **ver -967（Ray 定案）：不再灌滿，從現有血量抽起** ══
     > Ray：「惡夢化改成最長 15 秒，**依玩家現有血量比例扣血**，扣到 1 時 OBE，
     >   期間受擊機制維持原案」
     ⚠⚠ 這裡**原本有一行 `api.setPlayerHpRatio(1)`**（ver -671）：Ray 的舊稿有兩句
       在這裡打架（「玩家受擊，hp1」→ 發動惡夢化，而惡夢化「以現有的 hp 開始扣除，
       直到剩 hp1 熔斷」—— hp 是 1 的話發動瞬間就熔斷），我當時選了「灌滿再抽」，
       **並在這裡註明那是我的判斷不是 Ray 的指定**。這一版由他正式定案：不灌滿。
       · 打架的那一半早就不存在了 —— 娜塔莉戰自 ver -672 起不走劇情殺（`strikeTo:1`
         已移除），改成玩家自己右滑，血量是玩家自己的。
     ⚠⚠⚠ **ver -974 改：長度由血量決定**（Ray：「滿血才 13 秒」）—— 抽血是固定速率，
       所以血少的人**每一刻扣得一樣多，但總時間比較短**。
       （-967 的舊形狀是「斜率隨起點變、長度一律 15 秒」，已推翻 —— 見 `niTotalMs`。）
     ⚠⚠ 連帶的設計後果（刻意）：**惡夢化變成「血多才划算」** —— 它與聖徒化正好
       相反（那條槽是往上推、滿血發動當場 OBE，所以瀕死才划算）。兩個鏡像技能的
       最佳時機因此分開了。
     ⚠ 邊角：血本來就是 1 的時候發動 ＝ 沒有東西可以燒，`niDrain` 第一拍就熔斷。
       那是這條規則的直接結果（「扣到 1 時 OBE」），不是 bug。 */
  /* ══ 「前引星」（安雅 Lv6，ver -974）：發動時先把血灌滿 ══
     > Ray：「夢魘化發動時無視現有 HP 多寡，從滿 HP 開始算 13 秒，最大化發動時間」
     ⚠ 只有「**真的灌滿再抽**」這個讀法自洽：不灌血而用滿血的斜率去抽，會提早
       見底、比原本還短。⚠ 要在 `state.niFrom` **之前**（它就是抽血的起點）。 */
  if(prog.girlHas(state.pickedPartner,'niFullStart') && api.setPlayerHpRatio) api.setPlayerHpRatio(1);
  state.niFrom   = state.playerHp;
  /* ══⚠⚠⚠ **ver -974（Ray 改定）：長度由血量決定 —— 滿血才有 `maxSec`** ══
     > Q：13 秒是固定的還是滿血才有？　A：「**滿血才 13 秒**」
     抽血是**固定速率**（滿血 → 1 剛好 `NI_MAX_SEC` 秒），所以半血發動只有一半的時間。
     ⚠⚠ **推翻 ver -967**（「一律 15 秒、血少只是斜率變緩」）—— 那個形狀讓 Lv6
       「前引星」完全沒有作用，而那顆星正是要買回這段時間。
     ⚠ 下限夾 1 格（100ms）：血本來就是 1 的時候發動＝沒有東西可以燒，第一拍就熔斷
       （那是「扣到 1 時 OBE」的直接結果，不是 bug）。 */
  { const room = Math.max(0, state.niFrom - 1), full = Math.max(1, state.playerMax - 1);
    state.niTotalMs = Math.max(100, Math.round(NI_MAX_SEC * 1000 * room / full)); }
  state.combo    = 0;
  /* 破防值不清（ver -749，同聖徒化那一條）。 */
  $('grid').classList.add('saint','ni');
  setSaintBarFx(true);
  /* 盤面換成 16 宮格（收尾再換回來，同聖徒化）。 */
  state.saintPrevBoard = { N:state.N, cols:state.cols };
  api.setBoard(SAINT_GRID, SAINT_GRID_COLS);
  api.buildGrid();
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
/* ══⚠⚠ **受擊：抽掉「相當於 N 秒」的槽**（ver -691，Ray：「讓兩邊因受擊所減少的
   持續時間一致」）══
   惡夢化的倒數槽單位雖然是血，量的卻是**時間** —— 所以受擊要換算成秒再抽，
   不能直接扣敵人的攻擊力（那會隨敵人的攻擊力變動，而且份量與聖徒化對不起來）。
   ⚠ 一秒值多少槽 ＝ `(niFrom − 1) / 這一段總秒數` —— 與被動抽血用的是同一條斜率
     （那一支就是這樣算的，鐵律 7）。 */
export function nightmareHit(sec){
  if(!state.niMode) return;
  const perSec = (state.niFrom - 1) / Math.max(0.001, state.niTotalMs/1000);
  niDrain(Math.max(0, sec) * perSec);
}
/* 抽血。⚠ 走 combat 統一的改血 API（`hurtPlayer` 不存在 → 用 healPlayer 的負值）。
   抽到 1 就熔斷。 */
function niDrain(amount){
  if(!state.niMode) return;
  /* ⚠⚠ **抽到 1 就停，不可以抽死**（ver -671）：Ray 的規格是「直到剩 hp1 熔斷」——
     直接把量交給 `healPlayer` 的話最後一下會把血扣成 0，那是**陣亡**不是熔斷
     （實測 `playerHp` 掉到 0）。所以先夾住這一次能抽多少。 */
  /* ⚠⚠ **有人在等「自爆」那一拍就讓位**（ver -705）：血停在 1、不熔斷 ——
     那一段演完（玩家上滑）之後才輪到熔斷。同生命歸還攔在滿−1 的作法（鐵律 8）。 */
  const holding = () => !!(api.niBurstPending && api.niBurstPending());
  const room = state.playerHp - 1;
  if(room<=0){ if(!holding()) niMeltdown(); return; }
  api.drainPlayer(Math.min(Math.abs(amount), room));
  if(state.playerHp<=1 && !holding()) niMeltdown();
}
/* 熔斷：時間到／血抽乾 → 惡夢化結束，HP 留 1。
   ⚠⚠ **它就是 OBE**（ver -731，Ray：「熔斷就是 obe」）—— 推滿 ↔ 抽乾是同一個結局的
     兩個方向，不是兩件像的事。所以：同一張 cut-in、同樣會被「有人在等這一拍」的
     閘門擋住（SI 的生命歸還／NI 的夢境粉碎），沒有人在等就照常發生。
     螢幕上的字是 `MELTDOWN`，那是字面不是機制。
   ⚠ **先關掉惡夢化再演**：cut-in 期間 `cutinPlaying` 會把倒數槽凍住，
     但槽已經沒有意義了 —— 狀態先收乾淨，演出只是演出。
   ⚠ 沒有 cut-in 圖就直接收（演出不是規則）。 */
function niMeltdown(){
  if(!state.niMode) return;
  /* ⚠⚠ **敵已死（overkill 追打中被抽乾）＝處刑沒點完而已，不算熔斷**（ver -862，
     Ray 回報「NI 中敵 hp 歸零沒跑 EXECUTE」）—— 鏡射 SI 那邊 `saintAdvance` 推滿的
     敵死分支（ver -498/-499：「人是你殺的」→ triggerMaxBurst）：這裡走 triggerNiBurst，
     它自己的敵死分支會 markExecution ＋ EXSECUTIŌ cut-in ＋ onEnemyDefeated。
     不攔的話 finishNightmare 會對著一隻死敵重建盤面，整場卡死。 */
  if(state.enemyHp<=0){ triggerNiBurst(); return; }
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreAssaultRate();
  api.floatDmg(NI_MELT_NAME,'50%','28%',true);
  const done=()=>finishNightmare(()=>api.setPlayerHpRatio(0));   // 下限 floor 1 → 恰為 1 HP
  SFX.playVoice(asset('vo_anya_melt'), sfxGain('vo_anya_melt'));   // 熔斷語音（ver -711）
  if(NI_MELT_CUTIN) playCutin(done, NI_MELT_NAME, NI_MELT_CUTIN);
  else done();
}
/* 清空殘格 → 回滿 ＋ 最後一擊追加期間總傷 20%（同 SI 的 MaxBurst）。 */
function triggerNiBurst(){
  if(!state.niMode) return;
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreAssaultRate();
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
    const rlN = state.saintUsedThisBattle ? 'NIGHTMARE RELOAD' : null;   // 空槍才 reload（ver -896）
    if(rlN) resetInstallSlot();
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(1); api.onEnemyDefeated(); }, rlN);
    return;
  }
  markMaxBurst();   // 惡夢化清空殘格＝MB（Ray：「同 SI 的 MB」，ver -675）
  /* ⚠⚠ **這一支是惡夢化**，所以標籤是 NIGHTMARE RELOAD（ver -963 修）：
     -896 把兩支的變數名與標籤**交叉寫錯了** —— 這裡宣告 `rlMB`／印 `SAINT RELOAD`，
     下面卻傳 `rlNMB`（未宣告）。見 triggerMaxBurst 那一支的同一段。 */
  const rlNMB = state.saintUsedThisBattle ? 'NIGHTMARE RELOAD' : null;   // 空槍才 reload（ver -896）
  if(rlNMB) resetInstallSlot();
  /* ⚠⚠ **要播 MB 的全畫面 cut-in**（ver -719，Ray：「NI 的 MB 跟 execute 沒接上」）——
     -675 只做了「算 MB 的傷害＋記旗標」，演出那一步漏了：擊殺那一支有
     `playSaintCutin('execute')`，未擊殺這一支卻直接跳收尾，畫面上只有一行浮字。
     「同 SI 的 MB」指的是整套，包含它的臉。
     ⚠⚠⚠ **回血＝回到發動夢魘化那一刻的血量**（ver -974，Ray 的雙子座卡：
       「夢魘期間成功清完所有格子玩家 HP 會回到發動夢魘時的值」）——
       推翻「回滿」（-675 的「清空殘格 hp 全恢復」）。
       語意上這才對得起來：夢魘化**抽掉**的那一段是它的代價，清完就是把代價還你，
       不是憑空送一條命（而「前引星」把起點灌滿，所以那顆星的人才會回滿）。
     ⚠ 先抄成區域變數：`finishNightmare` 之後 `state.niFrom` 不保證還在。 */
  { const back = state.niFrom || state.playerHp;
    playSaintCutin('burst', ()=>{
      finishNightmare(()=>api.setPlayerHpRatio(back / (state.playerMax||1)));
    }, rlNMB); }
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
    /* 夢境粉碎的語音（ver -711）：預設 `vo_anya_burst`，**這一場**可以在戰鬥卡上
       改（`burstVoice`）—— 娜塔莉戰用第二版（Ray 指定）。鐵律 1：寫在卡上。 */
    { const bc = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
      const vk = (bc && bc.burstVoice) || 'vo_anya_burst';
      SFX.playVoice(asset(vk), sfxGain(vk)); }
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
  /* 「界心星」（安雅 Lv8，ver -974）：**剩最後一格時發動** → 直接帶走敵最大 HP 的 30%。
     ⚠ 要在清格之前數（下面那一圈會把殘格全部標成 done）。 */
  const cellsLeft = (state.cells||[]).filter(c=>!c.classList.contains('done')).length;
  for(const c of (state.cells||[])){
    if(c.classList.contains('done')) continue;
    c.classList.add('done'); c.classList.remove('next'); api.shatterCell(c);
  }
  /* ══⚠⚠ 傷害 ＝ 敵人最大 HP × `burstPct`(25%) × （**清掉的格數 ÷ 16**）══
     （ver -897，Ray：「夢境粉碎應該要帶走敵最大 hp 的 25%，如果 16 格點完是 25%，
       沒點完依點掉的格子比例計算傷害，也就是最大 23.4%（15 格），點掉的格子越多
       炸的傷害越高」）
     ⚠ ver -789 曾經**拿掉**這個縮放（改成固定 25%），這一版**照 Ray 的規格加回來** ——
       兩者的取捨不同：固定值讓「早爆」與「打好再爆」等值，縮放才讓「點掉的格子
       越多炸得越重」。回血（`burstHealPct`）用的是同一個比例，兩邊一致。
     ⚠ 綁在**敵人最大 HP** 上（不是當前 HP、不是累積傷害）：大場小場同一份量。
     ⚠ 分母是**滿盤 16**（`NI_BURST_FULL`，與回血共用同一個數字，鐵律 7）。 */
  const ratio = Math.max(0, Math.min(1, (state.niCells||0) / (NI_BURST_FULL||16)));
  /* 「界心星」（Lv8）：剩最後一格才成立，取代比例算法（比例算到 15/16 也只有 23.4%）。
     ⚠ 「打不死」的下限（`NI_BURST_FLOOR`）照舊夾在下面 —— 那是另一條規則。 */
  const lastPct = (cellsLeft===1) ? prog.girlBonus(state.pickedPartner,'burstLastCell') : 0;
  const dmg = (lastPct>0) ? Math.round((state.enemyMax||0) * lastPct)
                          : Math.round((state.enemyMax||0) * NI_BURST_PCT * ratio);
  exitNightmare();
  clearInterval(state.niTimer); state.niTimer=null;
  setReturnSwipe(false); restoreAssaultRate();
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
    /* ⚠ 夢境粉碎把敵血打到零：**不演 EXSECUTIŌ 畫面，計分照算處決**
       （ver -746，Ray：「夢境破碎讓敵hp歸零的話不出處決畫面，但是計分時算處決」）
       —— 粉碎自己的 cut-in 剛演完，再疊一張處決是兩段演出打架。 */
    markExecution();
    api.setPlayerHpRatio(0); api.onEnemyDefeated();
    return true;
  }
  /* ══⚠⚠ **粉碎的回血**（ver -888，Ray：「惡夢粉碎發動時可以回復最高 25% hp，
     視你在 NI 打掉的格數而定，16 格都打掉就回最大 hp 的 25%」）══
     先歸 1（那是惡夢化的代價，`setPlayerHpRatio(0)` 的既有語意），再依**期間清掉
     幾格**補回來 —— 一格都沒清就還是 1，滿盤 16 格就回 25%。
     ⚠ 分母用 `NI_BURST_FULL`（滿盤 16），不是「這一盤有幾格」：9 格盤清完不該與
       16 格盤等值（同傷害那一條的理由，鐵律 7 —— 兩者共用同一個數字）。
     ⚠ 走 `api.healPlayer`（combat 的唯一改血 API）：它自己夾上限、刷血條。
     ⚠ 順序要在 `finishNightmare` 的收尾**之後** —— 那一支先把血設成結局值，
       先回血會被它蓋掉（同 lifeReturn「回滿在中止之後」那條的理由）。 */
  /* ⚠⚠ **是「回血 25%」不是「回血到 25%」**（ver -892，Ray 更正 -888）：
     -888 先 `setPlayerHpRatio(0)` 把血歸 1 再補 —— 那等於**起始血完全不影響結果**，
     不管你帶著幾滴血進來，粉碎完永遠落在 1＋25%（實測：粉碎前 60、粉碎後 26）。
     那讀起來就是「回到 25%」。現在**不歸 1**：惡夢化的倒數槽本來就一路把血抽下來，
     那個抽血就是它的代價 —— 粉碎只在你**當下的血**上加回 25%×（清掉的格數÷16）。
     ⚠ 連帶：早發動（清得少）＝血還多但幾乎沒得補；撐到清完＝血很低但補得最多。
       這正是「視你在 NI 打掉的格數而定」該有的形狀。 */
  /* 「築壩者星」（安雅 Lv2，ver -974）：夢境破碎之後追加一扇反擊增益窗
     （攻擊力升橘圈／赤爪星再升紅圈 ＋ 全程指引）。⚠ 窗口的擁有者是 partner，
     這裡只通知（鐵律 8）；沒點星＝那邊 0 秒，等於沒有這扇窗。
     ⚠ 敵已死那一支走不到這裡（上面就 return 了）—— 那時開窗也沒有意義。 */
  if(api.onDreamBreak) api.onDreamBreak();
  finishNightmare(()=>{
    if(NI_BURST_HEAL>0){
      const ratio = Math.max(0, Math.min(1, (state.niCells||0) / (NI_BURST_FULL||16)));
      const heal  = Math.round((state.playerMax||0) * NI_BURST_HEAL * ratio);
      if(heal>0) api.healPlayer(heal);
    }
    /* 保險：抽乾那一刻剛好是 0 就墊回 1（惡夢化的規格是「剩 hp1 熔斷」，不是陣亡）。 */
    if(state.playerHp<1) api.setPlayerHpRatio(0);
  });
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
    const d=Math.round((api.hitDamage() + state.combo*saintComboStep()) * niAtkMul());   // ver -974：拳鬥者星
    api.enemyDamage(d, true, false, 'saint');
    state.niDamage += d;
    state.niCells++;                 // 夢境粉碎的份量由「清了幾格」換算（ver -688）
  };
  /* ══⚠⚠⚠ **ver -974（Ray 改定）：16 格點完＝MB／處決，夢粉歸夢粉** ══
     > 「16 格清完改成 MB 或 execute，夢粉歸夢粉，**夢粉要比 MB 強才合理**，
     >   MB 只是通常獎勵」
     ⚠⚠ **推翻 ver -897**（「16 格點完不出 MB，直接出夢境粉碎回血 25%」）——
       那一版讓「撐到清完」與「自己上滑」變成同一件事，主動技就沒有存在意義了。
       現在兩條路分開：
         · 點完 16 格   → `triggerNiBurst`（MB：期間總傷 20% 追打 ＋ **血回到發動時的值**）
         · 自己上滑粉碎 → `nightmareActive`（敵最大 HP 的比例傷害，份量更重）
     ⚠ 敵已死那一支照舊由 `triggerNiBurst` 自己判 `enemyHp<=0` 並走處決。 */
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
    /* ⚠ 點錯也走**秒**（ver -691）：`playerMax/DIVISOR` 是**聖徒化那條槽**的刻度，
       在惡夢化這條槽上代表的秒數完全不同（同 `nightmareHit` 的理由）。 */
    nightmareHit(SAINT_PASSIVE_HEAL_SEC / SAINT_ADVANCE_DIVISOR);
    if(state.niMode) startSaintReactTimer();
  }
}
/* 惡夢化的收尾（ver -690 起與 `finishSaintMode` 同一套）：把原本的盤面換回來、
   敵人排程歸零、接回碼表。 */
function finishNightmare(finalHpThunk){
  $('grid').classList.remove('saint','ni'); setSaintBarFx(false);
  restoreAssaultRate();
  if(finalHpThunk) finalHpThunk();
  /* ⚠⚠ **惡夢化退掉才補判被動的門檻**（ver -688，Ray：「明晰之夢在夢魘期間不發動，
     如果是夢魘期間 hp 降到標準以下，要等夢魘退掉才會發動」）——
     期間 `partner.checkLowHpBuff` 直接 return（上膛狀態留著），這裡叫一次它才真的發動。
     ⚠ 要在 `finalHpThunk` **之後**：那一支才剛把結局血量設好（熔斷／自爆＝1、
       清盤＝滿），門檻要對著結果判，不是對著過程判。 */
  if(api.checkLowHpBuff) api.checkLowHpBuff();
  const back=state.saintPrevBoard||{N:16,cols:4};
  api.setBoard(back.N, back.cols);
  api.resetEnemyTimers();
  if(!state.over){
    api.buildGrid();
    api.resetIntervalDeadline();
    api.startIntervalTimer();
    api.scheduleAssault();
    if(api.clockResume) api.clockResume();
    if(api.hintCurrentCell) api.hintCurrentCell();   // 熔斷後指格（ver -874，同 OBE）
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
    const okDmg=Math.round(api.hitDamage() + state.combo*saintComboStep());
    api.enemyDamage(okDmg, true, false, 'saint');
    state.saintDamageDealt += okDmg;
    saintDrainTick();                            // 「負行星」：第 2 hit 起每發延長倒數（ver -971）
    if(state.cells.every(c=>c.classList.contains('done'))){ triggerMaxBurst(); }
    else startSaintReactTimer();
    return;
  }
  if(num===state.expect){
    SFX.gunshot(true);
    cell.classList.add('done'); cell.classList.remove('next'); api.shatterCell(cell);
    state.combo++;
    const dmg=api.hitDamage() + state.combo*saintComboStep();   // 疊傷無上限（斜率見 saintComboStep）
    const d=Math.round(dmg);
    api.enemyDamage(d, true, false, 'saint');
    state.saintDamageDealt += d;                 // 累計期間傷害（供最後一擊追加）
    saintDrainTick();                            // 「負行星」：第 2 hit 起每發延長倒數（ver -971）
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
// 還原敵大絕頻率（經 defense 擁有者管道；清掉自有 saintPrevAssault）
function restoreAssaultRate(){
  if(state.saintPrevAssault){ api.setAssaultRate(state.saintPrevAssault.min, state.saintPrevAssault.max); state.saintPrevAssault=null; }
}

// Maximum Burst（EXSECUTIŌ）：推滿前把 16 格點完 → 追加期間總傷 20%；未擊殺則回血 50%（D2）。
function triggerMaxBurst(){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreAssaultRate();
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
    /* ⚠ 空槍才 reload（ver -896，Ray：「要空槍才有 reload」）—— 還沒發動過
       聖徒化的話那一槍本來就在膛裡，印 SAINT RELOAD 是報一件沒發生的事。 */
    const rl = state.saintUsedThisBattle ? 'SAINT RELOAD' : null;
    if(rl) resetInstallSlot();                       // 處決＝賺回一次發動（ver -892）
    playSaintCutin('execute', ()=>{ api.setPlayerHpRatio(1); api.onEnemyDefeated(); }, rl);
    return;
  }
  markMaxBurst();   // 未擊殺的 MB（ver -675）：評價折 10 秒，見 config.rating.penalty
  /* ⚠⚠⚠ **ver -963 修：`rlMB` 從來沒有被宣告過，MB 一觸發就丟 ReferenceError**
     （Ray：「諾薇兒聖徒化 MB 時整個盤面消失了玩不下去」）。
     -896 把這兩支的變數名與標籤**交叉寫錯**：這裡宣告的是 `rlNMB`／印
     `NIGHTMARE RELOAD`（那是惡夢化的字），而下面傳的是 `rlMB` —— 未宣告。
     ⚠⚠ **症狀為什麼是「盤面消失」**：例外丟在 `$('grid').classList.remove('saint')`
       與 `finishSaintMode()` **之間** —— 聖徒化的盤面已經拆掉、還原那一段永遠跑不到，
       於是畫面上什麼都不剩。**兩支都壞了 66 版**（-896 起），惡夢化那一支同病。
     ⚠ 自檢：這種錯 `jsc -m` 抓不到（未宣告的變數要**執行到那一行**才炸），
       而它就藏在一個只有特定收尾方式才走得到的分支裡。 */
  const rlMB = state.saintUsedThisBattle ? 'SAINT RELOAD' : null;   // 空槍才 reload（ver -896）
  if(rlMB) resetInstallSlot();
  // 敵人未死 → Maximum Burst 演出後回盤面。回血規則（2026-08-13 定案）：
  //   EXSECUTIŌ（MB 擊殺）→ 回滿；MaxBurst（未擊殺）→ 回 50%，並自然延續到同場下一敵。
  playSaintCutin('burst', ()=>{
    finishSaintMode(()=>api.setPlayerHpRatio(0.5));
  }, rlMB);
  if(api.onSaintEnded) api.onSaintEnded('mb');   // 教學終盤掛鉤（cut-in 結束後收尾台詞；非教學 no-op）
}

/* OBE：推進到滿＝沒守住。
   ⚠⚠⚠ **ver -964（Ray 改定）：不再扣回 HP 1，維持當前血量（＝全滿）** ——
   > Ray：「OBE 改為維持當前血量(全滿)，不扣回 hp1」
   聖徒化期間血條**就是**那條倒數槽（`saintAdvance` 走的是 `healPlayer`），
   推滿才會走到這裡 —— 所以「維持當前血量」在這條路上必然等於滿血，
   兩句話沒有矛盾，也**不需要在這裡補一行回滿**（鐵律 7：不改就是不改）。
   ⚠ 舊行為（`setPlayerHpRatio(0)` → 下限夾成 1 HP）留在註解裡當紀錄：
     推翻的是**懲罰**，不是 OBE 這個結局本身 —— 演出、評價、失去這一次
     聖徒化的槽全部照舊。 */
function triggerOBE(){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreAssaultRate();
  api.floatDmg('O.B.E.','50%','28%',true);
  if(state.enemyHp<=0){
    // 聖徒化期間敵 HP 已歸零、但倒數槽先推滿 → 仍播 OBE 演出，收尾轉下一敵/結算。
    /* ⚠⚠ ver -964 起**不扣血**：Ray 明訂「OBE 改為維持當前血量(全滿)，不扣回 hp1」
       —— 所以「OBE 後滿血接下一隻」現在是**規格**，不是漏洞。
       （舊註解說那悖離「OBE＝沒守住」的語義 —— 已推翻：沒守住的代價是
        **這一次聖徒化用掉了、而且沒有 MB 的追加傷害**，不再是血。）
       原本這裡有 `api.setPlayerHpRatio(0)` ＝ HP→1。 */
    playSaintCutin('obe', ()=>{ $('grid').classList.remove('saint'); setSaintBarFx(false); api.onEnemyDefeated(); });
    return;
  }
  // 全畫面 OVERWRITE BREAKER ENGAGED cut-in → 結束後回盤面（ver -964：血量不動）
  playSaintCutin('obe', ()=>{
    finishSaintMode();   // ⚠ 不傳 finalHpThunk ＝ 維持當前血量（原本是 setPlayerHpRatio(0)→1 HP）
  });
}

// 生命歸還「執行體」（搭檔主動技·第四結局）：中止聖徒化，保留當前血量後回盤面（不改血）。
//   ⚠ 「能否發、屬於誰」的判定已移至 partner.tryActive（單槽＋context 分派）；此處為純執行能力，
//     由 combat 於 setup() 注入給 partner（saintApi.lifeReturnAbort）。saint 不知道誰觸發它。
//     保留一個 saintMode 保險檢查，避免非聖徒化狀態被誤呼叫。
export function lifeReturnAbort(done){
  if(!state.saintMode) return;
  exitSaint();
  clearInterval(state.saintTimer); state.saintTimer=null;
  clearSaintReactTimer(); setReturnSwipe(false);
  restoreAssaultRate();
  api.floatDmg(L.battle.lifeReturn,'50%','28%',true);
  /* 第四結局 cut-in → 結束後回盤面。
     ⚠⚠ **ver -964（Ray 改定）：血量一律不動**（「保留現血量」）—— -740 那條
       「由呼叫端回滿」已推翻，`partner` 那邊的 `healPlayer(playerMax)` 已移除。
       這裡的 `finalHpThunk` 仍是 no-op：**兩邊都不寫血**才是「保留」（鐵律 7）。
     ⚠ `done` 是呼叫端的「窗口開了」掛鉤（吸血 buff）：與即死防禦的免傷窗同一個
       時機 —— **cut-in 撤下、盤面重建之後**才起算，秒數才完整可用。 */
  playSaintCutin('return', ()=>{
    finishSaintMode();
    /* 伙伴主動技發動後標示當前應點格（ver -833，Ray）：生命歸還收尾是一張全新的
       一般盤面（buildGrid 剛跑完、盤多半 hint:false）—— 指一下第一格。
       ⚠ 要在 finishSaintMode **之後**（saintMode 已關、盤已重建，guard 才放行）。 */
    if(api.hintCurrentCell) api.hintCurrentCell();
    if(done) done();                 // ver -964：吸血窗於此起算（呼叫端 partner 擁有）
  });
  if(api.onSaintEnded) api.onSaintEnded('return');   // 教學終盤掛鉤（非教學 no-op）
}

/* 共用收尾：回到當前 9/16 盤面，敵人排程/間隔懲罰全部歸零，恢復正常扣血攻擊。
 * finalHpThunk：由各結局傳入，於此執行結局血量設定（一律走 combat 改血 API）。 */
function finishSaintMode(finalHpThunk){
  $('grid').classList.remove('saint'); setSaintBarFx(false);
  restoreAssaultRate();                      // 保險：還原敵大絕頻率（triggerX 已還原，冪等）
  if(finalHpThunk) finalHpThunk();       // 設定結局血量（走 combat 改血 API；生命歸還為 no-op）
  const back=state.saintPrevBoard||{N:16,cols:4};
  api.setBoard(back.N, back.cols);
  api.resetEnemyTimers();                // 清紅圈、停蓄力、清大絕排程（含 assaultTimer）
  if(!state.over){
    api.buildGrid();
    api.resetIntervalDeadline();         // 間隔（點擊延遲）懲罰歸零
    api.startIntervalTimer();
    api.scheduleAssault();                   // 敵大絕蓄力重新計時，恢復正常扣血攻擊
    // 聖徒化全程不計時（clockResume 內以 saintMode 擋下）→ 收尾回盤面才接回碼表。
    //   此處 saintMode 已由各結局的 exitSaint 關閉、cutinPlaying 亦已於 cut-in 收尾清除，
    //   故 clockResume 會真的起算（不靠玩家下一次點擊補起算，免得漏計那段空檔）。
    if(api.clockResume) api.clockResume();
    /* OBE 之後指一下現在該點的格（ver -874，Ray：「obe 以後要指示下一個正確格子，
       所有人 obe 後都要有」）——盤面剛換回殘局/新盤，玩家要先找到接點。
       走既有的 hintCurrentCell（鐵律 8）。 */
    if(api.hintCurrentCell) api.hintCurrentCell();
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
  /* `opts.full`（ver -874，Ray：「索拉娜的被動技要放全屏」）：整張圖滿版 cover
     淡入（CSS 的 #cutin.full）。**每次都要設**——上一張的 full 不能殘留。 */
  if(c) c.classList.toggle('full', !!opts.full);
  if(label!==undefined) $('cutinText').innerHTML = label;
  const ci=$('cutinImg');
  const src=imgKey ? asset(imgKey) : null;
  /* 逐張縮放（ver -837，Ray：「CI 後方角色不要被裁掉太多」）：#cutinImg 的 keyframe
     scale 乘上 var(--ci-s)（style.css），表在 config.tuning.cutinFit（鐵律 1）。
     每次都要設（含 1）—— 上一張的縮放不能殘留到這一張。 */
  if(ci){ const fit=(GAME_CONFIG.tuning.cutinFit||{})[imgKey];
          ci.style.setProperty('--ci-s', fit || 1); }
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
/* ══⚠⚠ **處決／MB 就 reload**（ver -892，Ray：「夢魘跟聖徒改成如果打出處決或 mb，
   就會 reload，並在處決或 mb 的 CI 中顯示 SAINT RELOAD 或 NIGHTMARE RELOAD」）══
   `reload` ＝這一張 CI 要不要多印一行「你賺回一次發動」。誰印由**呼叫端**決定
   （聖徒化那條印 SAINT、惡夢化那條印 NIGHTMARE）—— cut-in 自己分不出這一場是哪一套
   （`exitSaint`／`exitNightmare` 在叫它之前就跑掉了）。
   ⚠ 解槽走 `resetInstallSlot()`（saint 自己的具名 setter，鐵律 9）：
     聖徒化／惡夢化／共鬥共用 `saintUsedThisBattle` 那一個槽。 */
function playSaintCutin(kind, done, reload){
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
  /* reload 那一行掛在副標下面（樣式見 style.css 的 `.sc-reload`）。
     ⚠ 用 innerHTML 是因為要多一個元素；`sub` 本身仍是純文字，不會被注入。 */
  { const se=$('saintCutinSub');
    se.textContent = sub;                       // 副標一律走 textContent（不注入）
    if(reload){                                 // reload 那一行另外掛一個元素
      const r=document.createElement('span'); r.className='sc-reload';
      r.textContent = reload; se.appendChild(r);
    } }
  // 依 kind 載入對應內嵌 cut-in 圖（資料放 ASSETS，程式只讀）
  /* ⚠ 生命歸還在**本篇**換成諾薇兒那一張（ver -454，Ray：「story 版的生命歸還 CI
     換成 Nouvelle_Sturm」）：本篇的搭檔是諾薇兒，演出裡出現蕾妮是錯的人。
     試玩版照舊 Renee。 */
  /* ⚠⚠ **MB 與處決在本篇換成托爾斯滕**（ver -702，Ray 交件 CI_Torsten_MB／
     CI_Torsten_Excute）：那兩招是**主角自己**的收尾，本篇演出裡出現露娜是錯的人
     —— 同 -454 的破防與生命歸還，分流一律走 `storyMode()`（鐵律 8）。
     試玩版（挑戰／出陣）照舊 Luna。 */
  const scImgKey = { execute: storyMode() ? 'cutin_exc_torsten' : 'cutin_exc',
                     obe:     storyMode() ? 'cutin_obe_nouvelle' : 'cutin_obe',
                     burst:   storyMode() ? 'cutin_mb_torsten'  : 'cutin_mb',
                     return:  storyMode() ? 'cutin_return_nouvelle' : 'cutin_return' };
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
  /* ver -711：本篇換成自己人的語音（托爾斯滕的 MB／處決、諾薇兒的 OBE），
     試玩版照舊露娜 —— 同上面 cut-in 圖的那一組分流。 */
  const scSeKey = storyMode()
    ? { execute:'vo_torsten_exc', obe:'vo_nou_obe', burst:'vo_torsten_mb' }
    : { execute:'se_luna_exc',    obe:'se_luna_obe', burst:'se_luna_mb' };
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
  niPausedThreats=false;   // ver -967：發動途中被打斷（state.over）也不要把旗留著
  /* 共鬥（ver -803）：清窗口輪詢＋收 coopMode（同 niMode 的重置）；無敵窗歸 partner.reset。 */
  exitCoop(); clearInterval(coopTimer); coopTimer=null; state.coopUntil=0;
  const gc=$('grid'); if(gc) gc.classList.remove('coop');
  const g0=$('grid'); if(g0) g0.classList.remove('ni');
  stopTimers();
  if(state.saintMode) exitSaint();
  state.saintUsedThisBattle=false;
  state.saintDamageDealt=0;
  state.saintPrevBoard=null;
  state.saintPrevAssault=null;
  state.enemyAtkSuppressUntil=0;
  setReturnSwipe(false);
  $('grid').classList.remove('saint'); setSaintBarFx(false);
}

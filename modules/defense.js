/* ============================================================================
 *  modules/defense.js — 三級防禦（大絕紅點判定系統）
 *  ---------------------------------------------------------------------------
 *  職責：大絕排程與紅點的生成/縮放/判定。依剩餘時間比例 ratio 分三段——
 *    ratio 0.35~1.0 → Defense（黃圈）｜0.12~0.35 → Perfect（橘圈）｜<0.12 → Counter（紅圈）
 *    ⚠ ver -706：每一帶「反不反擊／打多少／命中率／挨多少」全部讀卡上的 `bands`
 *      （config 的 `weaponBand`，唯一的計算點）。舊的 defenseDamageScale 等欄位已退役。
 *    ratio 0.12~0.35 → Perfect（免傷；散彈改 perfectDamageScale 打反擊傷）
 *    ratio 0~counterWin → Counter（免傷 + weapon 反擊）
 *    Boss 多發（ASSAULT_SHOTS / ASSAULT_GAP_MS）。
 *
 *  狀態擁有者：3.3（threats / threatTick / assaultTimer）。大絕大寫參數與門檻
 *    由 enemy 於 setEnemy 寫入 state、本模組只讀。門檻常數讀 config。
 *
 *  依賴：import state / config / audio。對玩家/敵人造成效果一律走 combat 於
 *    啟動時注入的 api（enemyAttack / floatDmg / triggerAtkBuff / weaponCounter），
 *    不 import combat/weapon（維持 §2 依賴方向，不製造反向依賴）。
 * ========================================================================== */

import { GAME_CONFIG, asset, sfxGain, weaponOf, weaponBand } from '../config.js';
import { state, addPerfect, addPerfectCounter, storyMode } from '../state.js';
import { SFX } from '../audio.js';
import { L, fmt } from '../i18n.js';   // 多語言（防禦浮動字）
import * as settings from './settings.js';  // 敵攻警告開關（fxOn('alert')，ver -748）

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;
const DEF_DEFENSE_MIN = T.defDefenseMin;   // ratio 0.35~1.0：Defense（傷害減半）
const DEF_PERFECT_MIN = T.defPerfectMin;   // ratio 0.12~0.35：Perfect（免傷）
const SAINT_BLOCK_DIVISOR = T.saintBlockDivisor;   // 聖徒化期間格擋推進量（下一輪聖徒化才會實際觸發）
/* 大絕（門檻波）的黃圈反擊命中率（ver -968，Ray 定案）—— 見 config 那一段的說明。 */
const ULT_BLOCK_HIT = (T.ultBlockHit!=null) ? T.ultBlockHit : 0;
// 開場第一發的延遲改**逐怪**（ver -795）：範圍在 state.ASSAULT_OPEN_MIN/MAX（由 enemy.setEnemy
// 從卡上的 openAssault 讀，預設 1~2 秒）。原本寫死 0~3 秒的 ULT_OPEN_MS 已移除。

// combat 於啟動時注入所需回呼
let api = {};
export function init(a){ api = a; }

/* ---------- 教學調整（config.tutorial）----------
 *  effAssaultDamage：教學中敵大絕基礎傷害一律 enemyAtkDamage（=2）；
 *    Defense 格擋沿用 defenseDamageScale 再減半 → 1（「除非被防禦減半」）。
 *  按錯/延時懲罰的同款覆寫在 combat 的 tutAtkDmg（同一 config 值，兩處同源）。
 *  ⚠ 判定用 tutorialRun（存續到勝負）：聖徒化收尾段落結束後（tutorialActive=false）
 *    收尾盤仍是教學戰，攻擊力必須鎖 2。 */
const TUT = () => GAME_CONFIG.tutorial || {};

/* ── 圈的大小（ver -552，Ray 指定三類武器的觸碰範圍）──────────────────
   視覺圈直徑＝visDia(ratio)（20+90r，唯一那條式子）；**觸碰圈**依武器類別另算：
     連射 orangeOnRed：平時同視覺，只剩紅圈時（ratio<defPerfectMin）擴到
                       橘圈的最大（＝進橘圈那一刻 0.35 的大小）
     散射 yellowMax  ：不論縮到多小，永遠＝黃圈最大（生成時的滿圈）
     高爆 visual     ：永遠＝視覺當下大小
   DOM：外層 .reddot＝觸碰區（它的 rect 就是判定），視覺畫在內層 .rd-vis ——
   dot 自己的 listener 與 main.js 的 hitThreatAt 都以外層 rect 判，天然同一份。 */
const visDia = r => 20 + 90*r;
function hitDia(ratio){
  const w = weaponOf(state.equippedWeapon, storyMode());
  const zone = (GAME_CONFIG.weaponCatHitZone||{})[w && w.cat] || 'visual';
  if(zone==='yellowMax') return visDia(1);
  if(zone==='orangeOnRed' && ratio<DEF_PERFECT_MIN) return visDia(DEF_DEFENSE_MIN);
  return visDia(ratio);
}
function effAssaultDamage(){
  return (state.tutorialRun && TUT().enemyAtkDamage!=null) ? TUT().enemyAtkDamage : state.ASSAULT_DAMAGE;
}
/* ══⚠⚠ **這一顆圈值多少傷害**（ver -939，Ray：「每個圈 atk 多少」）══
   一般攻擊的圈＝敵人卡的 `attack`（`ASSAULT_DAMAGE`）；**大絕那一波的圈**另有
   自己的攻擊力（`ult.atk`）—— 那正是「大絕」與「一般攻擊」的差別之一。
   ⚠ 教學一律照 `enemyAtkDamage`（2）壓平：那一場的傷害是教材不是數值設計，
     所以 `effAssaultDamage()` 優先，不讓大絕在教學裡把人打死。
   ⚠ 一個計算點（鐵律 7）：滿額命中與擋一半都問這一支，不要各自去翻 `enemyUltAct`。 */
function ringDamage(th){
  if(state.tutorialRun && TUT().enemyAtkDamage!=null) return TUT().enemyAtkDamage;
  const ua=state.enemyUltAct;
  if(th && th.ult && ua && ua.atk>0) return ua.atk;
  return effAssaultDamage();
}

/* ---------- 大絕頻率（擁有者管道）----------
 *  ASSAULT_MIN / ASSAULT_MAX 為 defense 擁有（3.3）。聖徒化需暫時改密集頻率、離場再還原——
 *  saint 只「讀」現值存進自有的 saintPrevAssault，實際「寫」一律經此 setter（經 combat 注入的 api），
 *  維持「跨擁有者寫入走擁有者管道」的契約（見 CLAUDE.md 3.3）。 */
export function setAssaultRate(min, max){
  state.ASSAULT_MIN = min;
  state.ASSAULT_MAX = max;
}

/* ---------- 大絕排程 ---------- */
// 每盤開場呼叫：開場保證，逐怪的延遲範圍內隨機發動第一發（ver -795，預設 1~2 秒）。
export function scheduleOpeningAssault(){
  const lo=state.ASSAULT_OPEN_MIN, hi=state.ASSAULT_OPEN_MAX;
  scheduleAssault(lo + Math.random()*Math.max(0, hi-lo));
}

export function scheduleAssault(firstDelayMs){
  clearTimeout(state.assaultTimer);
  /* ⚠ 計時挑戰：靶子**不攻擊**（ver -396）—— 連排程都不要開，不然紅點與蓄力槽
     還是會演一遍（`enemyAttack` 只擋得住扣血，擋不住畫面）。
     ⚠ 例外：`timeAttack.assaultOn`（ver -858，杰羅的「蕃茄人11號」——Ray：「3秒發動
       一次攻擊，被擊中的話時間加3秒」）＝照常排程，被打中的帳走 enemyAttack
       的加秒分支（hitPenaltySec）。 */
  if(state.timeAttack && !state.timeAttack.assaultOn) return;
  const delay = (firstDelayMs!=null) ? firstDelayMs
                                     : state.ASSAULT_MIN+Math.random()*(state.ASSAULT_MAX-state.ASSAULT_MIN);
  state.assaultTimer=setTimeout(()=>{
    // overkill/演出/轉場期間不生成；聖徒化期間照常出攻擊點
    if(state.over||state.enemyHp<=0||state.cutinPlaying||state.transitioning){ scheduleAssault(200); return; }
    // 教學：暫緩大絕的情境統一問 tutorial.assaultSuppressed（首回合純清盤／劇情殺盤／
    //   場上已有紅點＝一次只出一顆），經 combat 注入轉交
    if(api.assaultSuppressed && api.assaultSuppressed()){ scheduleAssault(250); return; }
    /* ⚠ 「不疊加」（ver -423 的敵人卡 `noStack`）：場上還有紅點就不再生一顆，
       等它被解掉。⚠ 用**重排**不是丟掉 —— 丟掉的話這一隻怪會在玩家慢一拍之後
       整場不再攻擊。 */
    if(state.enemyNoStack && state.threats && state.threats.length){ scheduleAssault(300); return; }
    // cut-in／清盤後緩衝期內敵不發動，等窗口過了再排
    if(Date.now() < state.enemyAtkSuppressUntil){ scheduleAssault(state.enemyAtkSuppressUntil - Date.now() + 50); return; }
    /* ══ 大絕（ver -760，Ray 的敵攻四態定義：延時／攻擊（一般圈）／失誤／大絕）══
       卡上 `ult:{ hp:30, act:'ring4' }` ＝ hp 掉到 30% 以下起，這一次攻擊改走
       具名行為（ULT_ACTS 那張表）；沒到門檻＝照常出一般圈（startCharge）。
       ⚠ 判在**發動那一刻**：打到門檻下的下一次排程自然切換，不用另掛監聽。 */
    const ua=state.enemyUltAct;
    const belowHp = ua && state.enemyHp <= state.enemyMax*(ua.hp/100);
    if(belowHp){
      if(ua.act && ULT_ACTS[ua.act]) ULT_ACTS[ua.act]();   // 具名波（ring4＝4 同時）
      else spawnWave(ua.count, ua.gapMs, true);             // 依次波：count 顆、每顆隔 gapMs
    }else startCharge();
    /* 下一波的排程（ver -798）：門檻行為可自訂 CD（整波之間的冷卻，自這一波起算）；
       沒寫＝照常規頻率（ASSAULT_MIN~MAX）。⚠ noStack 仍在排程層擋著：場上有圈就重排，
       所以 CD 是「最快多久一波」，不是保證。 */
    if(belowHp && ua.cdMs!=null) scheduleAssault(ua.cdMs);
    else scheduleAssault();     // 立即排下一個 → 錯開生成、可累積多個
  }, delay);
}
/* 一波攻擊圈：`count` 顆、每顆隔 `gapMs` **依次**隨機出現（gapMs=0＝同時）。
   ⚠ startCharge（Boss 的 ASSAULT_SHOTS/GAP_MS）與 ring4 都是它的特例——同一支（鐵律 8）。 */
/* `isUlt` ＝這一波是**血量門檻的特殊波**（卡上的 `ult:{hp,…}`）—— 由它生出來的圈
   打中時走「大絕」那一種受擊特效（ver -932，見 releaseAssault）。 */
function spawnWave(count, gapMs, isUlt){
  const n=Math.max(1, count||1), g=Math.max(0, gapMs||0);
  waveIsUlt = !!isUlt;
  spawnThreat();
  $('chargeWarn').classList.add('on');
  if(!state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
  for(let s=1;s<n;s++){
    setTimeout(()=>{
      if(state.over||state.enemyHp<=0||state.cutinPlaying||state.transitioning) return;
      waveIsUlt = !!isUlt;
      spawnThreat();
      $('chargeWarn').classList.add('on');
      if(!state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
    }, s*g);
  }
}
/* ══ 大絕的具名行為表（ver -760）══ 資料寫不了函式（同 tutorial 的 GATE_ACTIONS），
   卡上寫名字、這張表翻成呼叫 —— 加新行為就加一列，不要在發動端各自翻譯（鐵律 7）。 */
const ULT_ACTS = {
  /* 同時四圈（索菈娜的實驗卡，Ray：「她 hp30% 以下時會同時出現四個攻擊圈」）
     ＝ spawnWave(4, 0)（gap=0＝同一瞬間全上）。 */
  ring4(){ spawnWave(4, 0); },
};
// 生成一次大絕。Boss 可一次先後出多個點（ASSAULT_SHOTS），每發間隔 ASSAULT_GAP_MS
//   —— ＝ spawnWave 的特例（鐵律 8）。
export function startCharge(){ spawnWave(state.ASSAULT_SHOTS, state.ASSAULT_GAP_MS); }
// 更新所有攻擊點的視覺與倒數；到期則釋放
export function updateThreats(){
  // 演出/對話暫停中一律凍結（教學對話於 spawnThreat 內觸發暫停後，
  //   startCharge 尾端仍會重啟本 tick——沒有這道守門，紅點會在暫停中繼續縮小到被釋放）。
  //   時間補償仍由 pauseThreats/resumeThreats 的 t0 補時處理，剩餘時間不變。
  if(state.cutinPlaying) return;
  const threats=state.threats;
  if(!threats.length){ stopThreatTick(); return; }
  const CHARGE=state.CHARGE_SECONDS;
  let hot=false;   // 盤面警戒第二段（ver -462）：任一顆已縮過黃圈帶 → 盤面轉紅光
  for(let i=threats.length-1;i>=0;i--){
    const th=threats[i];
    const left=Math.max(0,CHARGE-(Date.now()-th.t0)/1000);
    const ratio=left/CHARGE;
    const size=visDia(ratio);
    const hd=hitDia(ratio);                      // 觸碰區（外層）與視覺（內層）分開（-552）
    th.el.style.width=hd+'px'; th.el.style.height=hd+'px';
    const vis=th.vis||th.el;
    vis.style.width=size+'px'; vis.style.height=size+'px';
    th.el.style.opacity=0.5+0.5*ratio;
    /* ver -706：`noPerfectBand` 退役 —— 三把槍現在**都有真正的橘帶**
       （狙擊的橘圈是「挨 1/4 傷」，與黃圈的 1/2 不同），所以圈色不再有特例。 */
    let col;
    if(ratio>=DEF_DEFENSE_MIN)      col='rgba(240,200,60';   // 黃圈
    else if(ratio>=DEF_PERFECT_MIN) col='rgba(240,140,40';   // 橘圈
    else                            col='rgba(240,50,50';    // 紅圈：反擊窗
    if(ratio<DEF_DEFENSE_MIN) hot=true;   // 與圈的分帶同一條門檻；狙擊圈色不同但門檻同一個
    vis.style.background=`radial-gradient(circle,${col},.75),${col},.3) 60%,transparent 72%)`;
    vis.style.borderColor=col+',.95)';
    vis.style.boxShadow=`0 0 22px ${col},.85),inset 0 0 12px ${col},.6)`;
    if(left<=0){ releaseAssault(th); }
  }
  /* 盤面警戒跟著圈走（ver -462，Ray：「亮黃圈時數字盤亮橘光，亮橘圈的時候
     數字盤轉紅光」）：alert（橘光）自 spawnThreat 起、.hot（紅光）自進橘圈帶起
     （紅圈維持紅光）。這裡是唯一的切換點（鐵律 8）——移除一律跟著 alert 一起。 */
  /* 敵攻警告是可關的提示（ver -748，settings.fxOn('alert')）：關掉＝盤面不變色
     不脈動，紅點本體照出（那是玩法不是提示）。 */
  $('grid').classList.toggle('hot', hot && settings.fxOn('alert'));
}
export function stopThreatTick(){
  clearInterval(state.threatTick); state.threatTick=null;
  $('chargeWarn').classList.remove('on');
}
/* 暫停/續玩（退出確認框用）：攻擊圈以 Date.now()-t0 計縮放，暫停時停 tick 凍結畫面，
 *  續玩時把暫停時長補回每個攻擊點的 t0 → 剩餘時間不變、無憑空提前釋放。 */
let _threatPausedAt = 0;
/* ⚠ 回傳值（ver -967）：**這一次真的由我暫停的才回 true** —— 已經暫停著就回 false。
   惡夢化發動時要「凍住攻擊圈、演完再原樣接回」，但它可能是**在教學對話裡**被觸發的
   （那時 `pauseForDialog` 已經暫停過了）—— 不分辨的話 saint 會在對話還開著時
   把圈解凍，玩家一邊讀字一邊挨打。呼叫端據此決定自己該不該 resume。 */
export function pauseThreats(){
  if(_threatPausedAt) return false;
  _threatPausedAt = Date.now();
  clearInterval(state.threatTick); state.threatTick=null;   // 凍結縮圈（不動 chargeWarn 提示）
  return true;
}
export function resumeThreats(){
  if(!_threatPausedAt) return;
  const dt = Date.now() - _threatPausedAt;
  _threatPausedAt = 0;
  state.threats.forEach(th=>{ th.t0 += dt; });              // 補時 → 剩餘時間不變
  if(state.threats.length && !state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
}
// 某個攻擊點時間到 → 釋放攻擊，移除該點
export function releaseAssault(th){
  removeThreat(th);
  if(state.over||state.cutinPlaying) return;
  /* 受擊特效落在**這一顆圈**的位置（ver -766，Ray：「攻擊效果要跟光圈的位置
     一樣」）—— 座標發佈給 state，enemy.spawnBite 讀完即清。 */
  state.lastAssaultPos = { x:th.lp, y:th.tp };
  /* ══⚠⚠ **受擊有四種狀況**（ver -932，Ray：「延時／按錯／攻擊 assault／大絕 ult」）══
     這一顆圈是**門檻波**（`ult:{hp,…}`）生出來的，還是一般攻擊？ —— 只有 defense
     分得出來（旗在 spawnThreat 那一刻寫進 `th.ult`，見 spawnWave）。
     ⚠ `kind` 仍是 `'assault'`：**計數**那一族只有四格（assault／block／delay／wrong），
       門檻波打中照樣算一次 assault。分開的是**受擊特效**，走 `state.lastAssaultUlt`
       —— 一個量一個計算點（鐵律 7），combat 的 fxKind 只讀不算。 */
  state.lastAssaultUlt = !!th.ult;
  api.enemyAttack(ringDamage(th), 'assault');   // 大絕那一波用 ult.atk（見 ringDamage）
  api.floatDmg(L.battle.hitByAssault,'45%','25%',true);
}
// 兼容舊呼叫：結束/清除所有攻擊點
export function endCharge(){ clearThreat(); }
/* 這一顆圈是不是門檻波生的（ver -932）：`spawnWave(…, true)` 之前設、
   `spawnThreat` 讀完就歸零 —— 一般攻擊（startCharge／ring4 以外）一律 false。 */
let waveIsUlt=false;
export function spawnThreat(){
  const layer=$('redDots');
  const dot=document.createElement('div');
  dot.className='reddot';
  const size=visDia(1);                        // 生成＝滿圈；三類武器此刻觸碰＝視覺
  dot.style.width=size+'px'; dot.style.height=size+'px';
  const vis=document.createElement('i');       // 視覺圈（-552：與觸碰區分層）
  vis.className='rd-vis';
  vis.style.width=size+'px'; vis.style.height=size+'px';
  dot.appendChild(vis);
  // 位置挑選：黃圈可重疊，但橘圈／紅圈核心範圍不可與現有攻擊點重疊。
  const lw=layer.clientWidth||360, lh=layer.clientHeight||360;
  const coreDia=visDia(DEF_DEFENSE_MIN);
  const coreR=coreDia/2;
  const pxLeft=l=>l/100*lw, pxTop=t=>t/100*lh;
  // 生成範圍：一般＝left 20~80% / top 25~70%；**會插對話的場次**＝中央帶
  //   （左右立繪滑入、下方有對話框——中央帶保證紅點不被蓋住）。
  //   ⚠ 「這一場會不會插對話」由 tutorial 那一層回答（教學／戰鬥內短教學同一支，
  //     ver -426）——這裡不去認識那兩種場次的差別。
  const ts=(api.threatBand && api.threatBand()) || null;
  const rnd=(min,max)=>min+Math.random()*(max-min);
  const rollL=()=> ts ? rnd(ts.leftMin,ts.leftMax) : 20+Math.random()*60;
  const rollT=()=> ts ? rnd(ts.topMin, ts.topMax)  : 25+Math.random()*45;
  let lp=rollL(), tp=rollT();
  // 反擊教學第一顆：固定畫面正中偏上（凍結講解時不壓左右立繪）
  if(ts && ts.first && api.firstThreatPending && api.firstThreatPending()){
    lp=ts.first.left; tp=ts.first.top;
  }
  for(let tries=0;tries<40;tries++){
    const cx=pxLeft(lp), cy=pxTop(tp);
    let ok=true;
    for(const o of state.threats){
      const ol=parseFloat(o.el.style.left), ot=parseFloat(o.el.style.top);
      const ox=pxLeft(ol), oy=pxTop(ot);
      const dx=cx-ox, dy=cy-oy;
      if(dx*dx+dy*dy < (coreR*2)*(coreR*2)){ ok=false; break; }
    }
    if(ok) break;
    lp=rollL(); tp=rollT();
  }
  dot.style.left=lp+'%';
  dot.style.top=tp+'%';
  const th={el:dot, vis, t0:Date.now(), lp, tp, ult:waveIsUlt};   // 圈的落點（ver -766）＋是不是門檻波（-932）
  waveIsUlt=false;                                 // 讀完就歸零：下一顆預設是一般攻擊
  dot.addEventListener('touchstart',e=>{e.preventDefault();resolveThreat(th);},{passive:false});
  dot.addEventListener('click',()=>resolveThreat(th));
  layer.appendChild(dot);
  state.threats.push(th);
  if(settings.fxOn('alert')) $('grid').classList.add('alert');   // 可關的提示（ver -748）
  if(api.onThreatSpawned) api.onThreatSpawned();   // 教學「首紅點」節點通知（教學外為 no-op）
  /* ══ 共鬥（Predator's Pack，ver -822，Ray）══ 「只要敵人出黃圈瞬間就反擊」——
     黃圈一生成就立刻收掉這一顆、由 weapon.coopCounter 打出 3-hit 反擊，敵不發動。
     ⚠ 稍等 90ms 再收：讓黃圈先畫出來，玩家看得到「出圈瞬間被打掉」。 */
  if(state.coopMode && api.coopCounter){
    const _th = th;
    setTimeout(()=>{ if(state.coopMode && state.threats.indexOf(_th)>=0){
      /* 反擊點＝**這顆圈**（ver -839：飛刀要射到反擊圈）——收掉之前先記
         （同 resolveThreat 那一行，鐵律 7：counterPoint 的來源就是圈）。 */
      try{ const rr=_th.el.getBoundingClientRect();
           state.counterPoint={x:rr.left+rr.width/2, y:rr.top+rr.height/2}; }catch(_){}
      removeThreat(_th); api.coopCounter(); } }, 90);
  }
}
// 從清單移除單一攻擊點
export function removeThreat(th){
  if(th.el && th.el.parentNode) th.el.remove();
  const i=state.threats.indexOf(th);
  if(i>=0) state.threats.splice(i,1);
  if(!state.threats.length){ $('grid').classList.remove('alert','hot'); stopThreatTick(); }
}
// 清除全部攻擊點（清盤/overkill/聖徒化結束等）
export function clearThreat(){
  state.threats.forEach(th=>{ if(th.el && th.el.parentNode) th.el.remove(); });
  state.threats=[];
  $('grid').classList.remove('alert','hot');
  stopThreatTick();
}
/* 反擊硬直（ver -495，Ray：「被反擊時延時歸零；預設為 1，0 的話就算被反擊
   延時計時也不會歸零」）。「被反擊」＝`weaponCounter` 真的開火的那兩個分支
   （Counter 帶、散彈的 Perfect 改傷帶）—— 免傷不開火的 Perfect 不算。
   歸零走 combat 注入的 `resetIntervalDeadline`（唯一那一支，鐵律 8）；
   `enemyCounterStagger` 由 enemy.setEnemy 從卡上載入（沒寫＝1）。 */
function staggerOnCounter(){
  if(state.enemyCounterStagger===0) return;
  if(api.resetIntervalDeadline) api.resetIntervalDeadline();
}
// 點掉單一攻擊點 → 依剩餘時間判定 Counter / Perfect / Defense
export function resolveThreat(th){
  if(!th || state.threats.indexOf(th)<0) return;
  const left=Math.max(0,state.CHARGE_SECONDS-(Date.now()-th.t0)/1000);
  const ratio=left/state.CHARGE_SECONDS;
  const w=weaponOf(state.equippedWeapon, storyMode());   // 本篇／試玩版兩套數值（ver -378）
  /* 反擊點（ver -812）：趁威脅還在，記下它的視窗座標中心 → weapon 從這裡噴彈殼。 */
  if(th.el){ const rr=th.el.getBoundingClientRect();
    state.counterPoint={x:rr.left+rr.width/2, y:rr.top+rr.height/2}; }
  removeThreat(th);
  SFX.confirm();

  const counterWin = w ? w.counterWin : DEF_PERFECT_MIN;
  /* ══⚠⚠ 明晰之夢（ver -740，Ray：「明晰夢增加發動期間反擊不論哪一圈都算完美
     反擊，傷害跟評價都是」）══ 發動中把**任何一帶**的解決一律走紅圈那一支 ——
     全額反擊、免傷、完美反擊計數與折秒、硬直整套自動一致（帶的判定只有這一處，
     鐵律 7；「這是完美反擊才給還是開火就給」那一問在這裡一次答完）。
     ⚠ 是不是明晰之夢由 partner 分辨（`lucidPerfect`＝安雅的 firstCounter 限定，
       馬季諾的高裝藥彈不吃這一條）。 */
  const lucid = !!(api.lucidPerfect && api.lucidPerfect());
  /* ══⚠⚠ **惡夢化期間也一律算紅圈**（ver -959，Ray：「夢魘化期間反擊武器，
     不管哪一圈打出來都是紅圈效果」）══ 與明晰之夢**併在同一個判定**（鐵律 7/8）——
     帶的判定只有這一處，加在別的地方就會變成「傷害算紅圈、計數卻沒算」那種半套。
     ⚠ 它**不影響 `realCounter`**：那一格問的是「玩家真的點到紅圈了嗎」
       （ver -887，Ray：「靠技能強制算成紅圈的不算」）—— 惡夢化與明晰之夢同性質。 */
  const niAll = !!state.niMode;
  let grade='block';   // 判定等級：'counter' | 'perfect' | 'block'（傳給教學層分流，見文末通知）
  /* ⚠⚠ **「真的點到紅圈」與「被技能算成紅圈」要分開報**（ver -887，Ray：
     「我偏向真實點到紅圈就發動，而靠技能強制算成紅圈發動的就不算」）。
     `grade` 是**加成後**的等級（傷害、免傷、完美反擊計數與折秒、硬直都吃它，
     ver -740 的定義不動）；`realGrade` 是**沒有明晰之夢時**會是什麼 ——
     只有「要靠玩家真本事才給」的東西讀它（現在是安雅那條連續三次的計數）。
     ⚠ 兩個都在這一支算（鐵律 7）：帶的判定只有這裡知道，呼叫端不准自己重算。 */
  const realCounter = (ratio < counterWin);
  if(ratio < counterWin || lucid || niAll){
    // === Counter === 免傷 + 反擊武器大傷害（金色微閃）
    grade='counter';
    flashDefense('gold');
    api.floatDmg(L.battle.counter,'50%','38%',true);
    /* ══⚠⚠ **完美反擊的獎勵只剩一件，而且是全域的**（ver -947，Ray 定案）══
       秒數走 `tuning.atkBuffSeconds`（3）、倍率走全域那一套 —— **不要傳參數**。
       ⚠⚠ 舊版是 `api.triggerAtkBuff(cb && cb.seconds ? cb.seconds : 2)`：
         那個寫死的 `2` **繞過了全域的 3**，於是實際跑起來是「四張老卡吃 5 秒、
         其餘所有怪吃 2 秒、沒有人吃到 3」—— 同一個量兩處各寫一次的老毛病（鐵律 7）。
       ⚠⚠ **反擊硬直（`counterStun`）整條拿掉**（Ray：「完美反擊後那隻 3 秒不出手，
         邏輯本身就不對，空戰要靠反擊打傷害，他不出手怎麼反擊？」）——
         那個「獎勵」會把玩家的輸出來源關掉，方向是反的。 */
    api.triggerAtkBuff();
    /* ══ 完美反擊的折秒（ver -721）══ 秒數讀**武器卡**的 `counterSec`，
       沒寫才回去用 `rating.penalty.counter`（鐵律 1：狙擊 −3 寫在那一把槍上）。
       ⚠ 只有這一帶算 —— 黃橘圈自 -706 起也會開火，但那不是**完美**反擊。 */
    { const pc=(GAME_CONFIG.rating&&GAME_CONFIG.rating.penalty)||{};
      addPerfectCounter((w && w.counterSec!=null) ? w.counterSec : (pc.counter||0)); }
    api.weaponCounter(undefined, undefined, undefined, 'counter');   // ver -970：帶名交給 weapon 查 bandMul
    staggerOnCounter();
  }else if(ratio < DEF_DEFENSE_MIN){
    // === Perfect Defense ===（金色微閃）
    grade='perfect';
    addPerfect();
    flashDefense('gold');
    /* ══ 橘圈（ver -706 改寫）══ 行為全部來自卡上的 `bands.perfect`（鐵律 1）：
       會反擊就開火（帶這一帶的傷害與命中率），不反擊就照 `take` 決定挨多少。
       ⚠ 反擊那一支的音由 `weaponCounter` 的武器 SE 出聲，這裡不再疊合成重擊音。 */
    const bp = weaponBand(w, 'perfect');
    api.floatDmg(L.battle.perfect,'50%','40%',true);
    if(bp.counter){
      api.weaponCounter(bp.scale, bp.hit, bp.roll, 'perfect');
      staggerOnCounter();
    }else if(bp.take<=0){
      SFX.play(asset('se_guard'), sfxGain('se_guard'));   // 完美防禦音（免傷那一支）
    }
    if(bp.take>0){
      state.lastAssaultUlt = !!th.ult;      // 擋一半也是同一顆圈（ver -932）
      const dmg=Math.max(1, Math.round(ringDamage(th)*bp.take));
      /* 聖徒化（ver -755）：橘圈的 take 也是「擋下一部分」那一族 → 半格推進
         （同黃圈；不給的話 enemyAttack 會用全額 +1s，把橘圈打成挨大絕）。 */
      api.enemyAttack(dmg, 'block',
        state.saintMode ? state.playerMax/SAINT_BLOCK_DIVISOR : undefined);
      api.floatDmg(fmt(L.battle.blockDmg,{n:dmg}),'50%','46%',false);
    }
  }else{
    // === Defense（格擋＝不完美防禦，仍挨大絕）===（白色微閃）。攻擊音由下方 enemyAttack('assault') 出敵攻擊音。
    flashDefense('block');
    {
      /* ══ 黃圈（ver -706 改寫；**-755 起聖徒化也走同一套**，Ray：「聖徒化期間
         反擊用的是舊系統，更新之」）══ 行為讀卡上的 `bands.block` —— 開不開火、
         挨多少，聖徒化內外**同一張卡**（鐵律 7）。
         聖徒化的差別只有「挨打不掉血、改推倒數槽」——那件事收在 enemyAttack 的
         saintMode 分支（唯一入口），這裡只把「格擋＝+0.5s」的推進量交給它
         （舊規矩不變：擋下是半格推進，不看 take 折了多少）。 */
      const bb = weaponBand(w, 'block');
      api.floatDmg(L.battle.block,'50%','42%',false);
      if(bb.counter){
        /* ══⚠⚠⚠ **大絕的黃圈打不中**（ver -968，Ray：「敵大絕 ult 的黃圈命中率
           皆為 0，除非被安雅的技能壓過」＋ ver -969：「還有獵手的共鬥也壓得過」）══
           規則在 `tuning.ultBlockHit`（鐵律 1），這裡只是唯一那個「這一顆是不是
           大絕」答得出來的地方（`th.ult`，同 -932）。

           **壓得過的有三個，但走的是兩條不同的路** ——
           · **安雅**（明晰之夢／惡夢化）：把**任何一帶**都判成紅圈
             （上面的 `lucid || niAll`）—— 那時根本走不到這一支，不必在這裡判。
           · **獵手的共鬥**（索菈娜）：它**整個繞過帶位系統** —— 黃圈一生成就由
             `spawnThreat` 的共鬥分支收掉、`weapon.coopCounter` 打三把飛刀
             （固定傷害，沒有命中判定）。所以「共鬥壓得過」平時是自動成立的。
             ⚠⚠ **但有一個 90ms 的縫**：那一支是等 90ms 才收圈（讓玩家看得到
               「出圈瞬間被打掉」），玩家在那之前手快點下去就會走到**這裡**——
               不排除的話，共鬥期間點大絕圈反而是保證 0 傷。所以要明寫 `!coopMode`。
           ⚠ **只把它排除在「命中率 0」之外，不把它升成紅圈**：升級會連帶送出免傷、
             完美反擊計數、評價折秒與硬直，那些 Ray 沒說要給（而且共鬥本來就無敵）。
           ⚠ 只動命中率 —— 減傷（`bb.take`）照舊，擋得住還是擋得住。 */
        const hit = (th.ult && !state.coopMode) ? ULT_BLOCK_HIT : bb.hit;
        api.weaponCounter(bb.scale, hit, bb.roll, 'block');
        staggerOnCounter();
      }
      if(bb.take>0){
        state.lastAssaultUlt = !!th.ult;    // 同上（ver -932）
        const dmg=Math.max(1, Math.round(ringDamage(th)*bb.take));   // 教學：2 減半 → 1
        api.enemyAttack(dmg, 'block',
          state.saintMode ? state.playerMax/SAINT_BLOCK_DIVISOR : undefined);   // 聖徒化：格擋＝+0.5s
        api.floatDmg(fmt(L.battle.blockDmg,{n:dmg}),'50%','46%',false);
      }
      if(!state.saintMode && api.onThreatEarly) api.onThreatEarly();   // 教學「太早防禦」插話（教學外/聖徒化為 no-op）
    }
  }
  /* ⚠⚠ **紅點解決了就指一下正確格**（ver -718，Ray：「反擊、格擋成功也顯示下一個
     正確格，要爽就要降難度」）—— **不分成功失敗**：反擊與完美防禦那一刻畫面上是
     cut-in／浮字／連續槍聲，眼睛根本不在盤面上，回來要重新找「我點到幾了」。
     ⚠ 走 `combat.hintCurrentCell`（唯一那一支，鐵律 8）；它自己會擋掉聖徒化
       （那一盤可以亂點，指一格反而誤導）與演出中／敵已死。 */
  if(GAME_CONFIG.tuning.hintNextCell && api.hintCurrentCell) api.hintCurrentCell();
  /* 第二個參數＝**真實**判定等級（ver -887，見上面 realCounter 的說明）。
     ⚠ 加成後與加成前一樣時兩者相同 —— 呼叫端不必分辨有沒有開技能。 */
  const realGrade = realCounter ? 'counter' : (grade==='counter' ? 'block' : grade);
  if(api.onThreatResolved) api.onThreatResolved(grade, realGrade);   // 教學「首次防禦成功」節點通知（帶判定等級；教學外為 no-op）
}
// 防禦統一閃光：color 'block'（白）或 'gold'（金）。整張敵圖微微一閃。
export function flashDefense(color){
  const el=$('defFlash'); if(!el) return;
  el.classList.remove('block','gold'); void el.offsetWidth;
  el.classList.add(color==='block'?'block':'gold');
  setTimeout(()=>el.classList.remove('block','gold'), 400);
}

/* ---------- 清盤/換盤瞬間：重置敵大絕蓄力與排程 ----------
 *  只負責 threat/ult 部分；間隔（點擊延遲）懲罰倒數由 combat 於 loadBoard 重置。 */
export function resetEnemyTimers(){
  clearThreat(); endCharge(); clearTimeout(state.assaultTimer);
}
// 敵擊殺瞬間：停掉大絕蓄力與排程（combat.enemyDamage 於敵 HP 歸零時呼叫）
export function killThreatSchedule(){
  clearThreat(); endCharge(); clearTimeout(state.assaultTimer);
}
// 全停（combat.stopAll 調度）：清掉本模組所有計時器與紅點
export function stopAll(){
  clearTimeout(state.assaultTimer);
  clearInterval(state.threatTick); state.threatTick=null;
  clearThreat();
}

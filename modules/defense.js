/* ============================================================================
 *  modules/defense.js — 三級防禦（大絕紅點判定系統）
 *  ---------------------------------------------------------------------------
 *  職責：大絕排程與紅點的生成/縮放/判定。依剩餘時間比例 ratio 分三段——
 *    ratio 0.35~1.0 → Defense（傷害減半，武器 defenseDamageScale 縮放）
 *    ratio 0.12~0.35 → Perfect（免傷；散彈改 perfectDamageScale 打反擊傷）
 *    ratio 0~counterWin → Counter（免傷 + weapon 反擊）
 *    Boss 多發（ULT_SHOTS / ULT_GAP_MS）；noPerfectBand 武器（狙擊）取消橘圈。
 *
 *  狀態擁有者：3.3（threats / threatTick / ultCheckTimer）。大絕大寫參數與門檻
 *    由 enemy 於 setEnemy 寫入 state、本模組只讀。門檻常數讀 config。
 *
 *  依賴：import state / config / audio。對玩家/敵人造成效果一律走 combat 於
 *    啟動時注入的 api（enemyAttack / floatDmg / triggerAtkBuff / weaponCounter），
 *    不 import combat/weapon（維持 §2 依賴方向，不製造反向依賴）。
 * ========================================================================== */

import { GAME_CONFIG, asset, sfxGain, weaponOf } from '../config.js';
import { state, addPerfect, storyMode } from '../state.js';
import { SFX } from '../audio.js';
import { L, fmt } from '../i18n.js';   // 多語言（防禦浮動字）

const $ = id => document.getElementById(id);
const T = GAME_CONFIG.tuning;
const WEAPONS = GAME_CONFIG.weapons;
const DEF_DEFENSE_MIN = T.defDefenseMin;   // ratio 0.35~1.0：Defense（傷害減半）
const DEF_PERFECT_MIN = T.defPerfectMin;   // ratio 0.12~0.35：Perfect（免傷）
const SAINT_BLOCK_DIVISOR = T.saintBlockDivisor;   // 聖徒化期間格擋推進量（下一輪聖徒化才會實際觸發）
const ULT_OPEN_MS = 3000;                  // 開場保證：每盤 3 秒內敵方就發動大絕

// combat 於啟動時注入所需回呼
let api = {};
export function init(a){ api = a; }

/* ---------- 教學調整（config.tutorial）----------
 *  effUltDamage：教學中敵大絕基礎傷害一律 enemyAtkDamage（=2）；
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
function effUltDamage(){
  return (state.tutorialRun && TUT().enemyAtkDamage!=null) ? TUT().enemyAtkDamage : state.ULT_DAMAGE;
}

/* ---------- 大絕頻率（擁有者管道）----------
 *  ULT_MIN / ULT_MAX 為 defense 擁有（3.3）。聖徒化需暫時改密集頻率、離場再還原——
 *  saint 只「讀」現值存進自有的 saintPrevUlt，實際「寫」一律經此 setter（經 combat 注入的 api），
 *  維持「跨擁有者寫入走擁有者管道」的契約（見 CLAUDE.md 3.3）。 */
export function setUltRate(min, max){
  state.ULT_MIN = min;
  state.ULT_MAX = max;
}

/* ---------- 大絕排程 ---------- */
// 每盤開場呼叫：3 秒內保證發動一次大絕（開場保證）
export function scheduleOpeningUlt(){ scheduleUlt(ULT_OPEN_MS*Math.random()); }

export function scheduleUlt(firstDelayMs){
  clearTimeout(state.ultCheckTimer);
  /* ⚠ 計時挑戰：靶子**不攻擊**（ver -396）—— 連排程都不要開，不然紅點與蓄力槽
     還是會演一遍（`enemyAttack` 只擋得住扣血，擋不住畫面）。 */
  if(state.timeAttack) return;
  const delay = (firstDelayMs!=null) ? firstDelayMs
                                     : state.ULT_MIN+Math.random()*(state.ULT_MAX-state.ULT_MIN);
  state.ultCheckTimer=setTimeout(()=>{
    // overkill/演出/轉場期間不生成；聖徒化期間照常出攻擊點
    if(state.over||state.enemyHp<=0||state.cutinPlaying||state.transitioning){ scheduleUlt(200); return; }
    // 教學：暫緩大絕的情境統一問 tutorial.ultSuppressed（首回合純清盤／劇情殺盤／
    //   場上已有紅點＝一次只出一顆），經 combat 注入轉交
    if(api.ultSuppressed && api.ultSuppressed()){ scheduleUlt(250); return; }
    /* ⚠ 「不疊加」（ver -423 的敵人卡 `noStack`）：場上還有紅點就不再生一顆，
       等它被解掉。⚠ 用**重排**不是丟掉 —— 丟掉的話這一隻怪會在玩家慢一拍之後
       整場不再攻擊。 */
    if(state.enemyNoStack && state.threats && state.threats.length){ scheduleUlt(300); return; }
    // cut-in／清盤後緩衝期內敵不發動，等窗口過了再排
    if(Date.now() < state.enemyAtkSuppressUntil){ scheduleUlt(state.enemyAtkSuppressUntil - Date.now() + 50); return; }
    startCharge();
    scheduleUlt();          // 立即排下一個 → 錯開生成、可累積多個
  }, delay);
}
// 生成一次大絕。Boss 可一次先後出多個點（ULT_SHOTS），每發間隔 ULT_GAP_MS。
export function startCharge(){
  spawnThreat();                     // 第 1 發立即
  $('chargeWarn').classList.add('on');
  if(!state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
  for(let s=1; s<state.ULT_SHOTS; s++){
    setTimeout(()=>{
      if(state.over||state.enemyHp<=0||state.cutinPlaying||state.transitioning) return;
      spawnThreat();
      $('chargeWarn').classList.add('on');
      if(!state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
    }, s*state.ULT_GAP_MS);
  }
}
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
    const _w=weaponOf(state.equippedWeapon, storyMode());
    const wNP=_w && _w.noPerfectBand;
    let col;
    if(ratio>=DEF_DEFENSE_MIN)      col='rgba(240,200,60';   // 黃圈：防一半
    else if(ratio>=DEF_PERFECT_MIN) col= wNP ? 'rgba(240,200,60'   // 狙擊：橘圈被黃圈取代（無 Perfect 帶）
                                              : 'rgba(240,140,40';  // 橘圈：Perfect 免傷
    else                            col='rgba(240,50,50';    // 紅圈：反擊窗
    if(ratio<DEF_DEFENSE_MIN) hot=true;   // 與圈的分帶同一條門檻；狙擊圈色不同但門檻同一個
    vis.style.background=`radial-gradient(circle,${col},.75),${col},.3) 60%,transparent 72%)`;
    vis.style.borderColor=col+',.95)';
    vis.style.boxShadow=`0 0 22px ${col},.85),inset 0 0 12px ${col},.6)`;
    if(left<=0){ releaseUlt(th); }
  }
  /* 盤面警戒跟著圈走（ver -462，Ray：「亮黃圈時數字盤亮橘光，亮橘圈的時候
     數字盤轉紅光」）：alert（橘光）自 spawnThreat 起、.hot（紅光）自進橘圈帶起
     （紅圈維持紅光）。這裡是唯一的切換點（鐵律 8）——移除一律跟著 alert 一起。 */
  $('grid').classList.toggle('hot', hot);
}
export function stopThreatTick(){
  clearInterval(state.threatTick); state.threatTick=null;
  $('chargeWarn').classList.remove('on');
}
/* 暫停/續玩（退出確認框用）：攻擊圈以 Date.now()-t0 計縮放，暫停時停 tick 凍結畫面，
 *  續玩時把暫停時長補回每個攻擊點的 t0 → 剩餘時間不變、無憑空提前釋放。 */
let _threatPausedAt = 0;
export function pauseThreats(){
  if(_threatPausedAt) return;
  _threatPausedAt = Date.now();
  clearInterval(state.threatTick); state.threatTick=null;   // 凍結縮圈（不動 chargeWarn 提示）
}
export function resumeThreats(){
  if(!_threatPausedAt) return;
  const dt = Date.now() - _threatPausedAt;
  _threatPausedAt = 0;
  state.threats.forEach(th=>{ th.t0 += dt; });              // 補時 → 剩餘時間不變
  if(state.threats.length && !state.threatTick){ state.threatTick=setInterval(updateThreats,50); }
}
// 某個攻擊點時間到 → 釋放攻擊，移除該點
export function releaseUlt(th){
  removeThreat(th);
  if(state.over||state.cutinPlaying) return;
  api.enemyAttack(effUltDamage(), 'ult');   // 教學中一律 2（見 effUltDamage）
  api.floatDmg(L.battle.hitByUlt,'45%','25%',true);
}
// 兼容舊呼叫：結束/清除所有攻擊點
export function endCharge(){ clearThreat(); }
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
  const th={el:dot, vis, t0:Date.now()};
  dot.addEventListener('touchstart',e=>{e.preventDefault();resolveThreat(th);},{passive:false});
  dot.addEventListener('click',()=>resolveThreat(th));
  layer.appendChild(dot);
  state.threats.push(th);
  $('grid').classList.add('alert');
  if(api.onThreatSpawned) api.onThreatSpawned();   // 教學「首紅點」節點通知（教學外為 no-op）
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
  removeThreat(th);
  SFX.confirm();

  const counterWin = w ? w.counterWin : DEF_PERFECT_MIN;
  let grade='block';   // 判定等級：'counter' | 'perfect' | 'block'（傳給教學層分流，見文末通知）
  if(ratio < counterWin){
    // === Counter === 免傷 + 反擊武器大傷害（金色微閃）
    grade='counter';
    flashDefense('gold');
    api.floatDmg(L.battle.counter,'50%','38%',true);
    /* 反擊之後的兩件事，都讀**這一隻怪的卡**（ver -423）：
         `counterBuff.seconds` 普攻增益持續幾秒（沒寫＝沿用預設 2 秒）
         `counterStun`         被反擊後幾秒才發起下一次主動攻擊（硬直）
       ⚠ 硬直借用既有的 `enemyAtkSuppressUntil`（cut-in 之後不發動用的那一支）——
         那本來就是「這段時間內不要排大絕」的唯一旗標（鐵律 8）。 */
    const cb=state.enemyCounterBuff;
    api.triggerAtkBuff(cb && cb.seconds ? cb.seconds : 2);
    if(state.enemyCounterStun>0)
      state.enemyAtkSuppressUntil = Math.max(state.enemyAtkSuppressUntil,
                                             Date.now() + state.enemyCounterStun*1000);
    api.weaponCounter();
    staggerOnCounter();
  }else if(!(w && w.noPerfectBand) && ratio < DEF_DEFENSE_MIN){
    // === Perfect Defense ===（金色微閃）
    grade='perfect';
    addPerfect();
    flashDefense('gold');
    /* 橘圈改打傷害的武器（散彈類）。⚠ 卡上寫的是**絕對值**（「橘圈 6 發 ×4」），
       存成 `perfectDmgPerHit`；倍率是**這裡**現算的唯一一處（鐵律 7：資料存絕對值、
       換算只有一個地方）。舊欄位 `perfectDamageScale` 仍吃，但新武器一律寫絕對值。 */
    const perfScale = (w && w.perfectDmgPerHit!=null && w.dmgPerHit)
      ? (w.perfectDmgPerHit / w.dmgPerHit)
      : (w && w.perfectDamageScale);
    if(perfScale){
      // 散彈類：Perfect 檔以傷害取代免傷（打弱化反擊，不觸發 atkBuff、不免傷）。
      //   音效由 weaponCounter 的武器 blast SE 出聲（完防與反擊都會觸發散彈音效），此處不再疊合成重擊音。
      api.floatDmg(L.battle.perfect,'50%','40%',true);
      api.weaponCounter(perfScale);
      staggerOnCounter();
    }else{
      // 一般武器（如重機槍）：完全免傷（狙擊 noPerfectBand=true 時此帶消失，落入下方 Defense）。
      //   完美防禦音＝weapon 的 Guard_SE（散彈完防走自己的槍聲，不到這裡）。
      SFX.play(asset('se_guard'), sfxGain('se_guard'));
      api.floatDmg(L.battle.perfect,'50%','40%',true);
    }
  }else{
    // === Defense（格擋＝不完美防禦，仍挨大絕）===（白色微閃）。攻擊音由下方 enemyAttack('ult') 出敵大絕音。
    flashDefense('block');
    if(state.saintMode){
      // 聖徒化期間：格擋＝推進 +0.5 秒（下一輪聖徒化才會實際生效）
      api.enemyAttack(0, 'ult', state.playerMax/SAINT_BLOCK_DIVISOR);
      api.floatDmg(L.battle.block,'50%','42%',false);
    }else{
      const defScale=(w && w.defenseDamageScale!=null) ? w.defenseDamageScale : 0.5;
      if(defScale<=0){
        api.floatDmg(L.battle.block,'50%','42%',false);        // 完全免傷（若有武器設 0）
      }else{
        const dmg=Math.max(1, Math.round(effUltDamage()*defScale));   // 教學：2 減半 → 1
        api.enemyAttack(dmg, 'ult');                     // 依武器倍率受傷（仍屬大絕受擊）
        api.floatDmg(fmt(L.battle.blockDmg,{n:dmg}),'50%','42%',false);
      }
      if(api.onThreatEarly) api.onThreatEarly();   // 教學「太早防禦」插話（教學外/聖徒化為 no-op）
    }
  }
  if(api.onThreatResolved) api.onThreatResolved(grade);   // 教學「首次防禦成功」節點通知（帶判定等級；教學外為 no-op）
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
  clearThreat(); endCharge(); clearTimeout(state.ultCheckTimer);
}
// 敵擊殺瞬間：停掉大絕蓄力與排程（combat.enemyDamage 於敵 HP 歸零時呼叫）
export function killThreatSchedule(){
  clearThreat(); endCharge(); clearTimeout(state.ultCheckTimer);
}
// 全停（combat.stopAll 調度）：清掉本模組所有計時器與紅點
export function stopAll(){
  clearTimeout(state.ultCheckTimer);
  clearInterval(state.threatTick); state.threatTick=null;
  clearThreat();
}

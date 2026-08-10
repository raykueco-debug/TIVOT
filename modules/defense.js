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

import { GAME_CONFIG } from '../config.js';
import { state, addPerfect } from '../state.js';
import { SFX } from '../audio.js';

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

/* ---------- 大絕排程 ---------- */
// 每盤開場呼叫：3 秒內保證發動一次大絕（開場保證）
export function scheduleOpeningUlt(){ scheduleUlt(ULT_OPEN_MS*Math.random()); }

export function scheduleUlt(firstDelayMs){
  clearTimeout(state.ultCheckTimer);
  const delay = (firstDelayMs!=null) ? firstDelayMs
                                     : state.ULT_MIN+Math.random()*(state.ULT_MAX-state.ULT_MIN);
  state.ultCheckTimer=setTimeout(()=>{
    // overkill/演出/轉場期間不生成；聖徒化期間照常出攻擊點
    if(state.over||state.enemyHp<=0||state.cutinPlaying||state.transitioning){ scheduleUlt(200); return; }
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
  const threats=state.threats;
  if(!threats.length){ stopThreatTick(); return; }
  const CHARGE=state.CHARGE_SECONDS;
  for(let i=threats.length-1;i>=0;i--){
    const th=threats[i];
    const left=Math.max(0,CHARGE-(Date.now()-th.t0)/1000);
    const ratio=left/CHARGE;
    const size=20+90*ratio;
    th.el.style.width=size+'px'; th.el.style.height=size+'px';
    th.el.style.opacity=0.5+0.5*ratio;
    const wNP=WEAPONS[state.equippedWeapon] && WEAPONS[state.equippedWeapon].noPerfectBand;
    let col;
    if(ratio>=DEF_DEFENSE_MIN)      col='rgba(240,200,60';   // 黃圈：防一半
    else if(ratio>=DEF_PERFECT_MIN) col= wNP ? 'rgba(240,200,60'   // 狙擊：橘圈被黃圈取代（無 Perfect 帶）
                                              : 'rgba(240,140,40';  // 橘圈：Perfect 免傷
    else                            col='rgba(240,50,50';    // 紅圈：反擊窗
    th.el.style.background=`radial-gradient(circle,${col},.75),${col},.3) 60%,transparent 72%)`;
    th.el.style.borderColor=col+',.95)';
    th.el.style.boxShadow=`0 0 22px ${col},.85),inset 0 0 12px ${col},.6)`;
    if(left<=0){ releaseUlt(th); }
  }
}
export function stopThreatTick(){
  clearInterval(state.threatTick); state.threatTick=null;
  $('chargeWarn').classList.remove('on');
}
// 某個攻擊點時間到 → 釋放攻擊，移除該點
export function releaseUlt(th){
  removeThreat(th);
  if(state.over||state.cutinPlaying) return;
  api.enemyAttack(state.ULT_DAMAGE, 'ult');
  api.floatDmg('被擊中','45%','25%',true);
}
// 兼容舊呼叫：結束/清除所有攻擊點
export function endCharge(){ clearThreat(); }
export function spawnThreat(){
  const layer=$('redDots');
  const dot=document.createElement('div');
  dot.className='reddot';
  const size=110;
  dot.style.width=size+'px'; dot.style.height=size+'px';
  // 位置挑選：黃圈可重疊，但橘圈／紅圈核心範圍不可與現有攻擊點重疊。
  const lw=layer.clientWidth||360, lh=layer.clientHeight||360;
  const coreDia=20+90*DEF_DEFENSE_MIN;
  const coreR=coreDia/2;
  const pxLeft=l=>l/100*lw, pxTop=t=>t/100*lh;
  let lp=20+Math.random()*60, tp=25+Math.random()*45;
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
    lp=20+Math.random()*60; tp=25+Math.random()*45;
  }
  dot.style.left=lp+'%';
  dot.style.top=tp+'%';
  const th={el:dot, t0:Date.now()};
  dot.addEventListener('touchstart',e=>{e.preventDefault();resolveThreat(th);},{passive:false});
  dot.addEventListener('click',()=>resolveThreat(th));
  layer.appendChild(dot);
  state.threats.push(th);
  $('grid').classList.add('alert');
}
// 從清單移除單一攻擊點
export function removeThreat(th){
  if(th.el && th.el.parentNode) th.el.remove();
  const i=state.threats.indexOf(th);
  if(i>=0) state.threats.splice(i,1);
  if(!state.threats.length){ $('grid').classList.remove('alert'); stopThreatTick(); }
}
// 清除全部攻擊點（清盤/overkill/聖徒化結束等）
export function clearThreat(){
  state.threats.forEach(th=>{ if(th.el && th.el.parentNode) th.el.remove(); });
  state.threats=[];
  $('grid').classList.remove('alert');
  stopThreatTick();
}
// 點掉單一攻擊點 → 依剩餘時間判定 Counter / Perfect / Defense
export function resolveThreat(th){
  if(!th || state.threats.indexOf(th)<0) return;
  const left=Math.max(0,state.CHARGE_SECONDS-(Date.now()-th.t0)/1000);
  const ratio=left/state.CHARGE_SECONDS;
  const w=WEAPONS[state.equippedWeapon];
  removeThreat(th);
  SFX.confirm();

  const counterWin = w ? w.counterWin : DEF_PERFECT_MIN;
  if(ratio < counterWin){
    // === Counter === 免傷 + 反擊武器大傷害（金色微閃）
    flashDefense('gold');
    api.floatDmg('COUNTER！','50%','38%',true);
    api.triggerAtkBuff(2);
    api.weaponCounter();
  }else if(!(w && w.noPerfectBand) && ratio < DEF_DEFENSE_MIN){
    // === Perfect Defense ===（金色微閃）
    addPerfect();
    flashDefense('gold');
    if(w && w.perfectDamageScale){
      // 散彈類：Perfect 檔以傷害取代免傷（打弱化反擊，不觸發 atkBuff、不免傷）
      api.floatDmg('PERFECT','50%','40%',true);
      api.weaponCounter(w.perfectDamageScale);
    }else{
      // 一般武器：完全免傷（狙擊 noPerfectBand=true 時此帶消失，落入下方 Defense）
      api.floatDmg('PERFECT','50%','40%',true);
    }
  }else{
    // === Defense（格擋）===（白色微閃）
    flashDefense('block');
    if(state.saintMode){
      // 聖徒化期間：格擋＝推進 +0.5 秒（下一輪聖徒化才會實際生效）
      api.enemyAttack(0, 'ult', state.playerMax/SAINT_BLOCK_DIVISOR);
      api.floatDmg('BLOCK','50%','42%',false);
    }else{
      const defScale=(w && w.defenseDamageScale!=null) ? w.defenseDamageScale : 0.5;
      if(defScale<=0){
        api.floatDmg('BLOCK','50%','42%',false);        // 完全免傷（若有武器設 0）
      }else{
        const dmg=Math.max(1, Math.round(state.ULT_DAMAGE*defScale));
        api.enemyAttack(dmg, 'ult');                     // 依武器倍率受傷（仍屬大絕受擊）
        api.floatDmg('BLOCK −'+dmg,'50%','42%',false);
      }
    }
  }
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

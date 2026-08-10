/* ============================================================================
 *  modules/weapon.js — 武器（本輪僅 Counter 反擊，雙槍/換裝下一輪）
 *  ---------------------------------------------------------------------------
 *  本輪只實作 defense 三級防禦「Counter／散彈 Perfect」所需的反擊演算
 *  （weaponCounter），這是本輪驗收點「Counter 免傷+反擊」的必要介面。
 *  雙槍破防、聖能發動、換裝面板等留待下一輪。
 *
 *  狀態：不寫任何 weapon-owned 狀態（3.4）。反擊計數/傷害走 state.addCounter()
 *    具名 setter（3.6 的跨擁有者計數例外）。武器選擇讀 state.equippedWeapon
 *    （本輪固定為 defaultWeapon 'mg'，換裝 UI 下一輪接）。
 *
 *  依賴：import state / config / audio；對敵造成傷害走 combat 注入的 api
 *    （enemyDamage / floatDmg），不 import combat（維持依賴方向）。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';
import { state, addCounter } from '../state.js';
import { SFX } from '../audio.js';

const WEAPONS = GAME_CONFIG.weapons;

// combat 於啟動時注入所需回呼（enemyDamage / floatDmg）
let api = {};
export function init(a){ api = a; }

/* 武器反擊：依選配武器造成多段/單發傷害，傷害視覺依 w.vfx 呈現。
 * 一次反擊事件累計傷害後，透過 state.addCounter(總傷) 記一次（+1 次 +總傷）。 */
export function weaponCounter(dmgScale){
  const w = WEAPONS[state.equippedWeapon];
  if(!w) return;
  const scale = (dmgScale==null) ? 1 : dmgScale;

  if(w.vfx==='single'){
    // 狙擊：單發，跳一個較大的紅色數字
    const total=Math.max(1, Math.round(w.hits*w.dmgPerHit*scale));
    SFX.sniperShot();
    api.enemyDamage(total, true, true);       // 靜默扣血（含 overkill/擊殺判定）
    addCounter(total);
    api.floatDmg(total, '46%','32%', false, 'snipernum');
    return;
  }
  if(w.vfx==='burst'){
    // 散彈：所有彈丸同一瞬間、同一區塊齊發，各自跳出數字
    const per=Math.max(1, Math.round(w.dmgPerHit*scale));
    SFX.gunshot(true);
    const bx=40+Math.random()*20;
    for(let k=0;k<w.hits;k++){
      api.enemyDamage(per, true, true);
      api.floatDmg(per, (bx-6+k*3)+'%', (34+(k%2)*6)+'%', true);
    }
    addCounter(per*w.hits);
    return;
  }
  // 預設（重機槍等）：逐發跳出（每 90ms 一發）
  const per=Math.max(1, Math.round(w.dmgPerHit*scale));
  addCounter(per*w.hits);                      // 全彈必中（此期間 over 不會被觸發）→ 一次記總傷
  let i=0;
  const fire=()=>{
    if(state.over||i>=w.hits) return;
    SFX.gunshot(true);
    api.enemyDamage(per, true);                // 走內建逐發數字
    i++;
    if(i<w.hits) setTimeout(fire, 90);
  };
  fire();
}

/* ---- 下一輪接：雙槍破防 / 聖能發動 / 換裝面板（本輪佔位，未綁定）---- */
export function activateDual(){ /* TODO(next): 雙槍破防 */ }
export function endDual(){ /* TODO(next) */ }
export function openPickSheet(/* kind */){ /* TODO(next): 副武器/搭檔換裝面板 */ }
export function closePickSheet(){ /* TODO(next) */ }
export function refreshLoadoutLabels(){ /* TODO(next) */ }

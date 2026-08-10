/* ============================================================================
 *  modules/partner.js — 搭檔（即死防禦 + 生命歸還）
 *  ---------------------------------------------------------------------------
 *  職責：
 *    即死防禦（被動 deathGuard，整場一次性）：致死傷害改為保留 1 HP 並插 cut-in。
 *    生命歸還（主動 lifeReturn）：聖徒化中「下往上滑」強制中止，保留當前血量。
 *      ⚠ 生命歸還的流程已完整實作於 saint.js（activateLifeReturn，由 main.js 的
 *        #returnSwipe 上滑手勢觸發）；partner 側只需 currentPartner() 提供帶
 *        active.key==='lifeReturn' 的 config（現況即滿足）。本模組不另寫 lifeReturn。
 *
 *  狀態互動：playerHp 的唯一跨擁有者寫入例外——即死防禦致死時保留 1 HP，
 *    必須走 state.applyDeathGuard()（鎖 1 + 標記 deathGuardUsed），不得散寫（見 CLAUDE.md 3.2 / D3）。
 *    applyDeathGuard 不碰 DOM，故鎖 1 後由注入的 api.updateBars() 刷新血條（對齊 reference 的
 *    `playerHp=1; updateBars();`）。
 *
 *  依賴：只 import state / config。combat / defense / saint 的原語一律由 combat 於 setup()
 *    注入 api（維持 §2 依賴方向，不反向 import）。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';
import { state, applyDeathGuard } from '../state.js';

/* combat 於啟動時注入的原語（UI / defense 排程 / cut-in 播放器）。 */
let api = {};
export function init(a){ api = a; }

// 目前啟用的搭檔 config（下一輪接玩家實選 pickedPartner；先回預設）
export function currentPartner(){
  return GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
}

/* 即死防禦（被動）：若當前搭檔有此技且本場尚未用掉，將 HP 保留 1 並插 cut-in。
 * 回傳 true = 已擋下（呼叫端 handlePlayerLethal 應 return，不進 lose）。
 * cut-in 圖鑰匙照 reference 硬寫 'cutin_guard'（Reni_CI_guard）——config 的 passive.cutin
 * 為佔位（暫填 cutin_saint），此處不讀 config、直接用正確的即死防禦專屬大圖。 */
export function tryDeathGuard(){
  const p = currentPartner();
  const pas = p && p.passive;
  if(!pas || pas.key!=='deathGuard') return false;
  if(pas.oncePerBattle && state.deathGuardUsed) return false;   // 一次性且已用掉 → 不再擋
  applyDeathGuard();          // 鎖 1 HP + 標記 deathGuardUsed（D3 契約例外的唯一入口）
  api.updateBars();           // applyDeathGuard 不碰 DOM，於此刷新血條（對齊 reference）
  api.floatDmg('即死防禦','50%','40%',true);
  const label = '即死防禦<span class="cutin-en">Death Guard</span>';
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // 即死防禦後：cut-in 撤下瞬間重置敵大絕與延時（間隔）懲罰倒數，避免剛保命就被連段擊殺
    api.resetEnemyTimers();
    api.scheduleUlt();        // 重新排程敵大絕
  }, label, 'cutin_guard');   // 插入 cut-in（即死防禦專屬大圖）
  return true;
}

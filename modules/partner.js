/* ============================================================================
 *  modules/partner.js — 搭檔（被動技 + 主動技通用框架）
 *  ---------------------------------------------------------------------------
 *  本模組是「搭檔能力」的歸屬地：一個搭檔帶「被動技（自動觸發）」與「單一主動技槽
 *  （固定發動入口）」。能力屬於誰、能不能發，全部在此判定——換 partner，其能力即消失。
 *
 *  被動技 · 即死防禦（deathGuard，整場一次性）：
 *    致死傷害改為保留 1 HP 並插 cut-in。判定與執行都在 tryDeathGuard，由 combat 的致死鏈
 *    （handlePlayerLethal）在扣血致死時呼叫；回 true = 已擋下，combat 不進 lose（D1 預留，combat 不動）。
 *
 *  主動技 · 單槽 + 情境標註（context）：
 *    一個搭檔一次只有一個主動技槽（config `active`），一個固定發動入口 tryActive(context)。
 *    每個主動技在 config 帶 `context`（'saint'＝聖徒化內 / 'board'＝一般盤面）標註其發動情境。
 *    tryActive 依 active.key 分派到 handler、並先以 active.context 判定「當前情境能不能發」，
 *    不符即回 false（不執行）。行為執行靠各分域注入 api（saintApi / combatApi / defenseApi），
 *    每個 handler 只取所需。新增能力＝加一筆 handler + 一段 config，不動分派骨架。
 *    本輪只實作 lifeReturn（context='saint'，經 saintApi 中止聖徒化並保留當前血量）。
 *
 *  狀態互動：playerHp 的唯一跨擁有者寫入例外——即死防禦致死時保留 1 HP，必須走
 *    state.applyDeathGuard()（鎖 1 + 標記 deathGuardUsed），不得散寫（見 CLAUDE.md 3.2 / D3）。
 *    applyDeathGuard 不碰 DOM，故鎖 1 後由注入的 api.updateBars() 刷新血條（對齊 reference）。
 *
 *  依賴：只 import state / config。combat / defense / saint 的原語一律由 combat 於 setup()
 *    注入 api（維持 §2 依賴方向，不反向 import）。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';
import { state, applyDeathGuard } from '../state.js';

/* combat 於啟動時注入的原語：
 *   被動技所需：updateBars / floatDmg / resetEnemyTimers / scheduleUlt / playCutin
 *   主動技分域 api：saintApi（本輪；未來再加 combatApi / defenseApi）
 * 每個 handler 只取所需，多來源共存於此單一注入袋。 */
let api = {};
export function init(a){ api = a; }

// 目前啟用的搭檔 config（下一輪接玩家實選 pickedPartner；先回預設）
export function currentPartner(){
  return GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
}

/* ============================================================================
 *  被動技 · 即死防禦
 * ========================================================================== */
// 回傳 true = 已擋下（呼叫端 handlePlayerLethal 應 return，不進 lose）。
// cut-in 圖鑰匙讀 config passive.cutin（維持資料/程式分離；freya 為 'cutin_guard'＝Renee_CI_pas.jpg）。
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
  }, label, pas.cutin);       // 插入 cut-in（即死防禦專屬大圖，讀 config）
  return true;
}

/* ============================================================================
 *  主動技 · 通用框架（單槽 + 情境分派）
 * ----------------------------------------------------------------------------
 *  handler 表：key 對應 config active.key。每個 handler 接注入袋 api、只取所需分域 api，
 *  回傳 true = 已執行 / false = 未執行。新增能力只需在此加一筆 + 補 config（含 context），
 *  分派骨架 tryActive 不動。
 * ========================================================================== */
const ACTIVE_HANDLERS = {
  // 生命歸還：聖徒化中止並保留當前血量。執行能力經 saintApi 注入（saint 內部提供）。
  lifeReturn(a){
    if(!state.saintMode) return false;   // 保險：非聖徒化不執行
    a.saintApi.lifeReturnAbort();
    return true;
  },
  // 未來擴充範例（本輪不實作）：
  //   clearThreats(a){ a.defenseApi.clearAll(); return true; }        // context:'board'，清紅圈
  //   heal(a){ a.combatApi.healPlayer(a.combatApi.playerMax*0.3); return true; }  // 回血
  //   shield(a){ ... a.combatApi ... }                                // 護盾
};

/* 統一發動入口。context＝當前發動情境（'saint' / 'board'）。
 * 判定：當前搭檔有主動技、且該技 config 的 context 與傳入情境相符、且有對應 handler → 執行。
 * 任一不符回 false（不執行）。「能否發、屬於誰」全在此——換 partner 即該技消失。 */
export function tryActive(context){
  const p = currentPartner();
  const act = p && p.active;
  if(!act || act.context !== context) return false;   // 無主動技 / 情境不符 → 不發
  const handler = ACTIVE_HANDLERS[act.key];
  if(!handler) return false;                            // 尚無對應 handler → 不發
  return handler(api) === true;
}

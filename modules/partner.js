/* ============================================================================
 *  modules/partner.js — 搭檔（即死防禦 + 生命歸還）
 *  ---------------------------------------------------------------------------
 *  職責：
 *    即死防禦（被動 deathGuard，整場一次性）：致死傷害改為保留 1 HP 並插 cut-in。
 *    生命歸還（主動 lifeReturn）：聖徒化中「下往上滑」強制中止，保留當前血量。
 *
 *  狀態互動：playerHp 的唯一跨擁有者寫入例外——即死防禦致死時保留 1 HP，
 *    必須走 state.applyDeathGuard()，不得散寫（見 CLAUDE.md 3.2）。
 *
 *  ⚠ 本輪為佔位：只提供 combat.enemyAttack 致死判定所需的 tryDeathGuard 空介面
 *    （固定回 false ＝ 無即死防禦、直接進 lose）。實際被動/主動技與 cut-in 下一輪接。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';

// 目前啟用的搭檔 config（下一輪接玩家實選 pickedPartner；先回預設）
export function currentPartner(){
  return GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
}

// 即死防禦判定佔位：回 true 表示已擋下（呼叫端應 return，不進 lose）。
// 本輪固定回 false，即死防禦與 cut-in 下一輪接。
export function tryDeathGuard(){
  return false;
}

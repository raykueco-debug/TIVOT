/* ============================================================================
 *  modules/defense.js — 三級防禦（大絕紅點判定系統）
 *  ---------------------------------------------------------------------------
 *  說明：此模組是 CLAUDE.md 對 SPEC 模組劃分的唯一調整——把「三級防禦」自
 *        戰鬥核心獨立出來，因它是自成一體的紅點判定系統。
 *
 *  職責：大絕紅點生成/縮放/判定。依剩餘時間比例 ratio 分三段——
 *    0.35~1.0 → Defense（傷害減半，武器 defenseDamageScale 縮放）
 *    0.12~0.35 → Perfect（免傷；散彈改為 perfectDamageScale 打反擊傷）
 *    0~0.12   → Counter（免傷 + 由 weapon 依 hits/dmg 反擊）
 *    Boss 多發（ULT_SHOTS / ULT_GAP_MS）；noPerfectBand 武器（狙擊）取消橘圈。
 *
 *  狀態擁有者：3.3 三級防禦/大絕（見 state.js）。大絕大寫參數
 *    （ULT_DAMAGE/ULT_SHOTS/…）由 enemy.js 設定敵人時寫入、本模組讀取執行。
 *
 *  預定函式（自 reference 搬遷）：
 *    scheduleUlt, startCharge, updateThreats, stopThreatTick, releaseUlt,
 *    endCharge, spawnThreat, removeThreat, clearThreat, resolveThreat,
 *    flashDefense, resetEnemyTimers
 *
 *  ⚠ 本輪為骨架：不實作任何判定邏輯。
 * ========================================================================== */

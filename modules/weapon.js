/* ============================================================================
 *  modules/weapon.js — 武器（雙槍破防 + Counter 反擊）
 *  ---------------------------------------------------------------------------
 *  職責：雙槍破防（聖能滿自動發動，期間傷害 dmgDualMult）、
 *    Counter 反擊演算（依武器 hits/dmgPerHit/vfx）、聖能累積與大絕/聖能按鈕、
 *    副武器換裝面板。
 *
 *  狀態擁有者：3.4 武器/雙槍（見 state.js）。
 *    反擊時經 state.addCounter(dmg) 累加 counterCount/counterDamage
 *    （3.6 的跨擁有者計數例外，供 inspector 結算讀取）。
 *
 *  預定函式（自 reference 搬遷）：
 *    activateDual, endDual, weaponCounter, addEnergy, updateUltBtn,
 *    updateEnergyClasp, refreshLoadoutLabels, openPickSheet, closePickSheet
 *
 *  ⚠ 本輪為骨架：不實作任何武器邏輯。
 * ========================================================================== */

/* ============================================================================
 *  modules/inspector.js — 監察官（評價 + 結算）
 *  ---------------------------------------------------------------------------
 *  職責：評價分數計算（time/counter/perfect + flawless/execution 加乘 → S~E）、
 *    監察官挑選/對白（Boss 走 bossDialogues）、結算面板與打字機演出、
 *    最佳成績存讀（一般/Boss 兩組 localStorage）。
 *
 *  狀態擁有者：3.6 評價/流程（見 state.js）。
 *    counterCount/counterDamage 由 weapon 累加、本模組結算時只讀。
 *
 *  預定函式（自 reference 搬遷）：
 *    computeEvaluation, getInspector, pickByThreshold, pickInspectorPortrait,
 *    pickInspectorDialogue, inspectorPanelHtml, combatStatsRows,
 *    showResultSequence, typeInspectorLine, showBanner,
 *    loadBestTotal, saveBestTotal
 *
 *  ⚠ 本輪為骨架：不實作任何評價/結算邏輯。
 * ========================================================================== */

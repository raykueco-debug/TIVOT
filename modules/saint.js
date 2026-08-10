/* ============================================================================
 *  modules/saint.js — 聖徒化（v18 受擊推進式）
 *  ---------------------------------------------------------------------------
 *  職責：降臨 → 推進 → 三結局。血條改為倒數槽，只有真受擊才推進
 *    （受擊 ≈+1s / 格擋 ≈+0.5s / Counter・Perfect 免傷不推進 / 無受擊約 10s 回滿）；
 *    維持 16 宮格、期間敵大絕更密集；cut-in 後 3 秒敵不發動。
 *    三結局：
 *      Maximum Burst（滿前清盤，追加期間總傷 20%，sawExecution=true）
 *      OBE（推進到滿＝沒守住）
 *      生命歸還（下滑觸發，中止並保留當前血量，第四結局）
 *
 *  狀態擁有者：3.5 聖徒化（見 state.js）。
 *  ⚠ 契約鐵律：saintMode 只有本模組能寫（經 state.enterSaint/exitSaint）；
 *     其他模組一律只讀 state.saintMode 來分支。此契約若破＝退回舊單檔病灶。
 *
 *  預定函式（自 reference 搬遷）：
 *    saintAdvance, activateSaint, playSlash, startSaintReactTimer,
 *    clearSaintReactTimer, setReturnSwipe, startSaintMode, triggerMaxBurst,
 *    triggerOBE, activateLifeReturn, playSaintCutin, finishSaintMode
 *
 *  ⚠ 本輪為骨架：不實作任何聖徒化邏輯。
 * ========================================================================== */

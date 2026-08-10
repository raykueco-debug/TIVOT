/* ============================================================================
 *  modules/combat.js — 戰鬥核心 / 唯一協調者
 *  ---------------------------------------------------------------------------
 *  職責（CLAUDE.md 第 2、4 節）：
 *    Schulte 盤面生成與切換、輸入判定(tap)、逐格計時與延時懲罰、
 *    combo 傷害計算、聖能累積、血條/狀態更新、開始/結束/結算流程調度。
 *    combat 是唯一的協調者：呼叫 defense / weapon / saint / enemy /
 *    partner / inspector；其他模組彼此不直接 import。
 *
 *  狀態擁有者：3.1 戰鬥核心、3.2 生命/敵我、3.8 增益（見 state.js）。
 *
 *  預定函式（自 reference 搬遷）：
 *    shuffle, goNextBoard, boardGridFor, loadBoard, buildGrid,
 *    fitGridSquare, markNext, tap, clearBoard, recordBoardTime,
 *    gunHitOnEnemy, floatDmg, startIntervalTimer, effIntervalLimit,
 *    resetIntervalDeadline, stopIntervalTimer, updateBars, updateStatus,
 *    hitDamage, triggerAtkBuff, clearAtkBuff, startGame, goHome,
 *    win, lose, stopAll, fmtTime
 *
 *  ⚠ 本輪為骨架：不實作任何戰鬥邏輯。
 * ========================================================================== */

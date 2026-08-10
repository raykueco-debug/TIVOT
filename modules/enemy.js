/* ============================================================================
 *  modules/enemy.js — 敵人（立繪 / 大絕排程 / 受擊特效 / Boss 亂入）
 *  ---------------------------------------------------------------------------
 *  職責：敵人立繪載入（imageBase 外部目錄優先，失敗 fallback 內嵌 image）、
 *    大絕排程與發動、受擊特效（血痕/齒痕/爪痕/彈痕）、
 *    Boss（槍之魔女）亂入觸發、設定當前敵人時把大絕大寫參數寫入 state。
 *
 *  狀態擁有者：3.7 亂入/Boss（見 state.js）。
 *    setEnemy 時負責寫入 3.3 的大絕大寫參數（ULT_DAMAGE/ULT_SHOTS/…），
 *    供 defense.js 讀取執行判定（設定是 enemy 職責、執行是 defense 職責）。
 *
 *  預定函式（自 reference 搬遷）：
 *    enemyAttack, enemyDamage, showHitFx, triggerClaw, hitLayer, addFx,
 *    spawnBlood, spawnBite, spawnBullets, bulletSVG, shatterCell, ejectShell,
 *    triggerIntruder, loadEnemyPortrait, setEnemy, displayEnemyName,
 *    applyConfigToDOM
 *
 *  ⚠ 本輪為骨架：不實作任何敵人邏輯。
 * ========================================================================== */

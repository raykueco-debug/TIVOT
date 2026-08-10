/* ============================================================================
 *  state.js — 集中共享狀態（跨模組唯一狀態來源）
 *  ---------------------------------------------------------------------------
 *  依 CLAUDE.md 第 3 節建立。舊單檔約 40 個模組級全域變數散在各處，
 *  此檔全部收攏成單一 `state` 物件，並以「擁有者」制度規範寫入權：
 *
 *    擁有者 = 唯一有權「寫入」該欄位的模組；其他模組一律只讀 state.x。
 *    跨擁有者的寫入一律走本檔匯出的「具名 setter」，禁止外部直接 state.x = …。
 *
 *  ⚠ 本輪為骨架：只立契約與初值，不接任何業務邏輯。
 *    初值取自 GAME_CONFIG.tuning / 當前敵人，實際的 setEnemy／startGame
 *    等重置流程由各模組於後續步驟接上（見各具名 setter 的 TODO）。
 * ========================================================================== */

import { GAME_CONFIG } from './config.js';

const T = GAME_CONFIG.tuning;
const _enemy = GAME_CONFIG.enemies[GAME_CONFIG.currentEnemy];

/* ---------------------------------------------------------------------------
 *  集中狀態物件。分組對應 CLAUDE.md 3.1 ~ 3.8，每組標註擁有者。
 *  純讀取：任何模組 → 直接 state.x
 *  寫入   ：僅該組擁有者模組；跨擁有者的例外一律走下方具名 setter。
 * ------------------------------------------------------------------------- */
export const state = {

  /* ── 3.1 戰鬥核心（擁有者：combat） ───────────────────────────── */
  boardIndex: 0,
  N: 9,
  cols: 3,
  intervalLimit: 2.0,
  intervalDeadline: 0,
  cells: [],
  order: [],
  expect: 1,
  combo: 0,
  energy: 0,
  boardStartTime: 0,
  boardClean: true,
  transitioning: false,
  boardTimes: [],
  boardsCompleted: 0,
  runStartTime: 0,
  killTime: 0,

  /* ── 3.2 生命/敵我（擁有者：combat；playerHp 唯一例外見 applyDeathGuard） ── */
  playerHp: T.playerHp,
  playerMax: T.playerHp,
  enemyHp: _enemy.hp,
  enemyMax: _enemy.hp,
  overkill: 0,
  over: false,
  flawlessRun: true,

  /* ── 3.3 三級防禦/大絕（擁有者：defense；大寫參數由 enemy 設定敵人時寫入） ── */
  threats: [],
  threatTick: null,
  ultCheckTimer: null,
  CHARGE_SECONDS: T.chargeSeconds,
  ULT_DAMAGE: _enemy.attack,
  ULT_SHOTS: 1,
  ULT_GAP_MS: 0,
  ULT_MIN: 4000,
  ULT_MAX: 8000,
  DELAY_PENALTY_SCALE: 1,
  DELAY_TIME_DELTA: 0,
  WRONG_PENALTY_SCALE: 1,

  /* ── 3.4 武器/雙槍（擁有者：weapon） ─────────────────────────── */
  equippedWeapon: GAME_CONFIG.defaultWeapon,
  grenades: T.grenades,
  dualWield: false,
  dualTimer: null,

  /* ── 3.5 聖徒化（擁有者：saint；saintMode 只有 saint.js 能寫） ── */
  saintMode: false,
  saintTimer: null,
  saintUsedThisBattle: false,
  saintDamageDealt: 0,
  saintReactTimer: null,
  saintPrevBoard: null,
  saintPrevUlt: null,
  enemyAtkSuppressUntil: 0,

  /* ── 3.6 評價/流程（擁有者：inspector；counterCount/Damage 允許 weapon 累加） ── */
  counterCount: 0,
  counterDamage: 0,
  perfectCount: 0,
  sawExecution: false,
  sRankUnlocked: false,
  resultMode: 'rematch',
  currentFavor: 0,

  /* ── 3.7 亂入/Boss（擁有者：enemy） ──────────────────────────── */
  currentEnemyKey: GAME_CONFIG.currentEnemy,
  curEnemyHitFx: null,
  intruderTriggered: false,
  inIntruderFight: false,
  deathGuardUsed: false,

  /* ── 3.8 增益（擁有者：combat） ─────────────────────────────── */
  atkBuff: false,
  atkBuffTimer: null,
};

/* ============================================================================
 *  具名 setter（受控寫入）
 *  ---------------------------------------------------------------------------
 *  跨擁有者的寫入、或需要連帶副作用的狀態轉移，一律走這裡，禁止外部直接賦值。
 *  ⚠ 本輪僅立函式簽章與最小狀態轉移，副作用（cut-in、更新血條、結束流程等）
 *    留待對應模組步驟接上。
 * ========================================================================== */

/* partner.js 專用：即死防禦攔截 playerHp。
 * 這是 3.2 playerHp 的唯一跨擁有者寫入例外——致死時保留 1 HP。
 * TODO(partner)：插入即死防禦 cut-in、標記 deathGuardUsed 由 partner 流程處理。 */
export function applyDeathGuard(){
  state.playerHp = 1;
  state.deathGuardUsed = true;
}

/* saint.js 專用：進入聖徒化。saintMode 的寫入唯一入口。
 * 其他模組一律只讀 state.saintMode 來分支，不得寫入。
 * TODO(saint)：接 startSaintMode 的實際初始化（倒數槽、16 宮格、cut-in 緩衝）。 */
export function enterSaint(){
  state.saintMode = true;
  state.saintUsedThisBattle = true;
}

/* saint.js 專用：離開聖徒化（三結局收尾共用）。 */
export function exitSaint(){
  state.saintMode = false;
}

/* weapon.js 專用：反擊成功時累加反擊計數/傷害（3.6 的跨擁有者計數例外）。
 * inspector 結算時只讀這兩個值。 */
export function addCounter(dmg){
  state.counterCount += 1;
  state.counterDamage += dmg;
}

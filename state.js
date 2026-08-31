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
  intervalTimer: null,   // 逐格計時器 handle（§3.1 契約原漏列，補入；combat 所有）
  cells: [],
  order: [],
  expect: 1,
  combo: 0,
  critCombo: 0,          // 暴擊用連擊（普攻）：正確點擊 +1；受擊或清盤歸零。驅動暴擊率/加傷成長。
  // 評價系統（rating）用的整場統計（combat 擁有；startGame/startIntruderFight 歸零）：
  maxCombo: 0,           // 整場最高連擊
  hitsTaken: 0,          // 整場受擊次數（=0 → 無傷 gate 直判 S）
  correctTaps: 0,        // 依序正確點擊數（命中率分子）
  wrongTaps: 0,          // 按錯格次數（命中率＝correct/(correct+wrong)）
  runOverkill: 0,        // 整場累計 overkill（state.overkill 每敵歸零，換敵時併入此）
  /* 完美清盤的盤數（ver -659，Ray：「完美清盤一次 -1 秒」）。
     ⚠ 「完美」＝那一盤 `boardClean` 撐到清盤為止（沒點錯、沒受擊）——
       與清盤獎勵聖能同一個條件，不要另外定義一次（鐵律 7）。 */
  perfectBoards: 0,
  energy: 0,
  boardStartTime: 0,
  boardClean: true,
  transitioning: false,
  boardTimes: [],
  boardsCompleted: 0,
  runStartTime: 0,
  killTime: 0,
  // 計時碼表（連戰用）：只在「盤面可點且非 overkill」時作動——盤載好/點擊＝繼續，
  //   敵死(overkill)/轉場/cut-in/結算＝暫停。totalTime = runElapsedMs + 進行中的一段。
  //   取代舊「killTime 凍結」單一計時，統一成暫停/繼續碼表（overkill 與轉場皆不計）。
  runElapsedMs: 0,       // 已累計的「實打時間」（毫秒）
  clockRunSince: 0,      // 目前這段起算時戳；0＝碼表暫停中

  /* ── 3.2 生命/敵我（擁有者：combat；playerHp 唯一例外見 applyDeathGuard） ── */
  playerHp: T.playerHp,
  playerMax: T.playerHp,
  enemyHp: _enemy.hp,
  enemyMax: _enemy.hp,
  overkill: 0,
  over: false,
  defeated: false,       // 戰敗鎖：一旦致死判定確定戰敗即上鎖，win() 一律讓位（見 DECISIONS.md「戰敗優先」）
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
  /* ── 絕對值版的懲罰（ver -375）─────────────────────────────────
     Ray 的「敵人資訊標準卡」寫的是**絕對值**（「延時懲罰 5 秒，攻擊力 5」），
     不是倍率。所以卡上有寫就用這三個、沒寫（null）才回去走上面那組縮放。
     ⚠ 不要在 config 裡把絕對值換算成倍率再存 —— 那等於把同一個量算兩次
       （鐵律 7），而且 tuning 的基礎值一改，所有換算過的怪就全部走鐘。
     ⚠ 擁有者同上：由 `enemy.setEnemy` 依敵人卡寫入，`combat`/`defense` 只讀。 */
  DELAY_SECONDS: null,   // 延時懲罰的時限（秒，絕對值）；null＝走盤面的 intervalLimit + DELAY_TIME_DELTA
  DELAY_DAMAGE: null,    // 延時懲罰傷害（絕對值）；null＝tuning.dmgDelay × DELAY_PENALTY_SCALE
  WRONG_DAMAGE: null,    // 按錯懲罰傷害（絕對值）；null＝tuning.dmgWrong/dmgHeavy × WRONG_PENALTY_SCALE

  /* ── 3.4 武器/雙槍（擁有者：weapon） ─────────────────────────── */
  /* ── 這一隻怪的「打起來的手感」（ver -423 的敵人卡；擁有者：enemy）──
     ⚠ 每次 `setEnemy` 都要重寫，沒寫的回預設 —— 連戰換敵也會走那一支。 */
  enemyResist: null,        // { basic:0.20 } 之類：**減傷**的成數，依傷害來源
  enemyWeak: null,          // { counter:1.00 }：**增傷**的成數，依傷害來源
  enemyDualBonus: 0,        // 破防（雙槍窗口）期間的增傷成數
  enemyNoStack: false,      // 紅點不疊加（場上同時只有一個）
  enemyCounterBuff: null,   // { mult, seconds }：被反擊後玩家的普攻增益
  enemyCounterStun: 0,      // 被反擊後幾秒才發起下一次主動攻擊
  enemyCounterStagger: 1,   // 反擊硬直（ver -495）：1＝被反擊時延時計時歸零、0＝不歸零。卡上沒寫＝1
  /* 「這一場」的武器音覆寫（ver -423，船艦戰）：`{武器鑰匙: 'se_key' | {key,times}}`。
     ⚠ 覆寫的是**場次**不是武器 —— 同一把槍在陸戰還是原本的聲音（擁有者：combat）。 */
  weaponSound: null,
  /* 「這一場」的機槍反擊連射間隔覆寫（ms；ver -476，Ray：「船戰的速射砲連射
     速度調降50%」＝ 90→180）。同 weaponSound：場次的屬性不是武器卡的，
     卡上寫**絕對值**（counterGapMs），null＝預設 90（擁有者：combat）。 */
  counterGapMs: null,

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
  /* ══ 惡夢化（Nightmare Install，ver -671，Ray 交稿）══
     聖徒化的**鏡像**：一樣由 saint.js 獨佔寫入（`niMode` 只有它能寫）。
     差別全在方向 —— 聖徒化是「血往上推，推滿＝OBE」，惡夢化是
     「血往下抽，抽乾＝熔斷」。 */
  niMode: false,
  niTimer: null,
  niDamage: 0,       // 惡夢化期間造成的總傷（收尾追加 20% 用，同 saintDamageDealt）
  niCells: 0,        // 惡夢化期間清掉幾格（夢境粉碎的傷害由它換算，ver -688）
  niFrom: 0,         // 發動當下的 HP（抽血的起點）
  niTotalMs: 0,      // 這一次惡夢化總共多久（殘格數 × NI_SEC_PER_CELL）
  enemyAtkSuppressUntil: 0,

  /* ── 3.6 評價/流程（擁有者：inspector；counterCount/Damage 允許 weapon 累加） ── */
  counterCount: 0,
  counterDamage: 0,
  perfectCount: 0,
  sawExecution: false,
  sawMaxBurst: false,    // 以 Maximum Burst 收尾（未擊殺那一種；ver -675）
  sRankUnlocked: false,
  /* 結算頁那顆（或那兩顆）底鈕現在是什麼意思。`modules/inspector.js` 擁有它，
     `onRematchBtn`／`onGiveupBtn` 依它分流：
       rematch          再度執槍 → 回首頁（出陣，試玩版）
       sentou-offer / sentou / intercept    Boss 那條 S 級的兩段式
       tutorial-home / tutorial-leaving     教學結算的離場（leaving 同時是防連點的擋門磚）
       script-continue  劇情插入戰打贏 → 交還劇情
       lose-continue    ver -430：船艦戰戰敗 → 一顆「繼續」，回飛行畫面
       lose-retry       ver -430：劇情場次戰敗 → 兩顆「放棄／再戰」 */
  resultMode: 'rematch',
  currentFavor: 0,

  /* ── 3.7 亂入/Boss + 連戰序列（擁有者：enemy） ──────────────── */
  currentEnemyKey: GAME_CONFIG.currentEnemy,
  curEnemyHitFx: null,
  curEnemySound: null,     // 當前怪攻擊音（依 kind：ult/delay/wrong；enemy 於 setEnemy 寫入、combat.enemyAttack 讀）
  intruderTriggered: false,
  inIntruderFight: false,
  deathGuardUsed: false,
  partnerActiveUsed: false,   // 搭檔主動技「每場一次」旗標（oncePerBattle 技用；擁有者 partner，combat 於開場歸零）
  /* ══⚠⚠ 連續戰鬥的「同一場」（ver -585，Ray：「戰鬥地圖中移動期間算同一場，
     hp／聖徒化次數／主動技發動次數／破防值算同一場」）══
     城鎮戰那張地圖上的每一格是一次 `startScriptBattle`，但對玩家而言**是同一場** ——
     所以「每場一次」的資源不可以在格與格之間回滿。
     這裡存的是**現在開著的那一段**的 id（`config.battles[].session`），null＝沒有。
     ⚠ 擁有者是 `combat`（開場設、`sessionEnd` 的那一場打完清、goHome 清）；
       其餘模組只讀。`main.js` 的門也讀它決定要不要演開棺（鐵律 7：只有這一份）。 */
  battleSession: null,
  /* 這一場的戰鬥背景覆寫（ver -592，Ray：「打完敵人應該會留在原背景，
     不要自動切背景」）。城鎮插入戰＝**你站的那一格**那張圖，蓋過敵人卡的 `bg`。
     ⚠ 存的是**檔名**（含副檔名），由 `modules/town.js` 的 `currentBg()` 給。
     ⚠ 擁有者是 combat（`setBattleBg`，每次交棒明確設一次／設 null），
       `enemy.setEnemy` 只讀 —— 不要讓它殘留到下一場（那會把上一格的背景帶過去）。 */
  battleBg: null,
  /* 連續戰鬥的 EXP／錢記帳（ver -595，Ray：「exp 跟錢都用『整場』來結算」）。
     中間幾格不彈結算頁，那幾場的收穫先記在這裡，收段的那一場（Boss）一起入帳。
     ⚠ 擁有者是 inspector（`bankSessionGain`／`clearSessionGain`），
       combat 的 `endSession()` 也會清 —— 半途離場不該把帳留到下一段。 */
  /* 失誤計數（ver -600 的新評價）：擁有者 combat（`enemyAttack` 加、`startGame` 歸零）。
     `penUlt`＝被大絕命中、`penBlock`＝擋下一半、`penDelay`＝延時懲罰；
     點錯格用既有的 `wrongTaps`。 */
  penUlt: 0, penBlock: 0, penDelay: 0,
  /* ⚠⚠ 連續戰鬥的**戰績累計**（ver -601，Ray：「戰鬥用時也是要用整場的全部戰鬥
     總和時間，不計算移動，只算戰鬥時間」）：中間幾格的用時與失誤累加在這裡，
     到收段那一場（Boss）**一起評一次**。null＝這一段還沒有累計。
     ⚠ 累的是**原始統計**不是分數：分數要在總和上算一次，
       各場先算完再平均／相加都不是同一件事。
     ⚠ `clearTime` 本來就只累計實打時間（轉場、cut-in、對話都不計），
       城裡走路更不經過戰鬥 —— 所以「不計算移動」是既有行為，不必另外扣。 */
  sessionStats: null,
  sessionMoney: 0,
  pickedPartner: GAME_CONFIG.defaultPartner,   // 玩家實選搭檔（擁有者 partner；選人畫面經 setPickedPartner 寫入）
  lineupIndex: 0,        // 連戰序列游標（局內第幾隻敵，對應 GAME_CONFIG.lineup）

  /* ── 3.8 增益（擁有者：combat） ─────────────────────────────── */
  atkBuff: false,
  atkBuffTimer: null,
  lowHpBuff: false,      // 低血量普攻加倍（馬季諾被動「高裝藥彈」）：HP≤門檻即生效、回門檻上解除。
                         //   狀態型（無計時器），跨盤跨怪自然延續；由 partner 經 combat 的 setLowHpBuff 管道寫。

  /* ── 3.9 教學關卡（擁有者：tutorial） ───────────────────────────
   *  tutorialActive：教學進行中（含對話段之間的實戰段；首次出陣才啟動）。
   *  tutorialDialog：對話插入中＝真暫停（走 combat.pauseForDialog / cutinPlaying）。
   *    main.js 退出確認據此放行（暫停中仍可按退出）並讓位（關閉確認框不解除教學暫停）。 */
  tutorialActive: false,
  tutorialDialog: false,
  tutorialRun: false,    // 本場為教學戰（maybeStart 設 true、combat.startGame 歸零）：
                         //   與 tutorialActive 不同——存續到結算，inspector 據此切教學專屬台詞/按鈕
  /* 本場教學是**劇情帶起來的那一場**（諾薇兒帶）：台詞走 tutorial.story 那一份，
     且結算整段跳過（Ray 指定，見 script/TUTORIAL_LINES_NOUVELLE.md 第八節）。
     ⚠ 與 tutorialRun 同壽命（開場歸零、requestReplay({story:true}) 設回）。 */
  tutorialStoryRun: false,
  /* ── 劇情插入戰（ver -375；擁有者：combat）────────────────────
     腳本 `{ battle:'guild_hunter' }` 叫起來的那種**單敵一場**：沒有教學台詞、
     不走連戰序列、打完直接交還劇情（同 tutorialStoryRun 的框架，但沒有教學那一套）。
     ⚠ 為什麼不沿用 `tutorialStoryRun`：那支旗標同時代表「這是教學」——
       攻擊力會被鎖成 2、敵人打不死、結算走教學台詞。借用它就得逐條開洞。
     ⚠ `storyFramed()`（combat 內）＝ tutorialStoryRun || scriptRun：兩者共用的是
       **框**（門開門關、不播櫻花過渡禎、打完交還劇情），那部分才是同一件事。 */
  scriptRun: false,      // 本場是劇情插入戰（存續到結算）
  scriptBattleId: null,  // 是哪一場（查 config.battles）
  /* 這一場是不是**劇情戰**（ver -493，Ray：「在戰鬥加上一個是否為劇情戰的判定，
     之後就讀那一個」）。由發起端在 startScriptBattle 宣告（飛行的隨機遭遇＝false，
     劇本遭遇／城鎮插入戰＝true），startGame 寫入 —— 開場白要不要播、talkOnce
     打贏要不要記，**一律只讀這一支**，不要再各自從卡或旗標推。 */
  storyBattle: false,
  /* ══ 計時挑戰（ver -396，打靶場）══
     戰鬥卡的 `timeAttack` 直接放這裡（`{wrongPenaltySec, se}`；不是那種場次就是 null）。
     ⚠ 它一開就把**整條攻擊路徑**關掉（`enemyAttack` 與 `defense.scheduleUlt` 各自守門），
       所以大絕紅點、蓄力槽、延時懲罰、按錯扣血通通不會演 —— 畫面上只剩「打靶」。
     ⚠ 唯一的懲罰是**時間**：按錯 → 碼表加 `wrongPenaltySec` 秒（見 combat 的 tap）。 */
  timeAttack: null,
  /* 這一場的計時挑戰**有沒有超過標準時間**（ver -396）。
     ⚠ 它借用既有的「打輸了」那條分歧路（`onLose`）—— 對腳本而言「超時」與「戰敗」
       是同一件事：接另一支台詞。由 `combat.win()` 判定、`inspector` 交棒時帶出去。 */
  timeOver: false,
  /* 鎖血（ver -463，管理人測試用）：左上「鎖血」鈕切換，開著時玩家不掉血＝打不死。
     ⚠ 只擋 HP 扣除那一行（combat.enemyAttack 唯一入口，鐵律 8）——受擊特效／音／震動／
       combo 歸零照演，測的手感不失真。跨場沿用（測試工具，不隨 startGame 歸零）。 */
  hpLock: false,
  noSaint: false,        // 這一場不能聖徒化（讀者：saint / main 的手勢綁定）
  noPartner: false,      // 這一場不能用搭檔技（讀者：partner / weapon 的按鈕）

  /* ── UI 閘門（跨模組共享的演出鎖；擁有者：播演出的模組） ──────────
   *  cutinPlaying：cut-in／結局演出期間鎖住盤面點擊與敵大絕生成。
   *  combat / defense / saint 皆需「讀」此旗標分支；寫入者為當下播演出的模組
   *  （本輪僅 combat 的結算會用到，聖徒化/雙槍 cut-in 下一輪接）。
   *  此為 §3 契約之外、但確為跨模組共享的旗標，統一收進 state 而非散落全域。 */
  cutinPlaying: false,
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
 * 只切 saintMode；saintUsedThisBattle 為 saint 自有欄位，於 activateSaint（cut-in 前）
 * 自行標記，時序與 reference 一致（發動即鎖一場一次，cut-in 結束才真正 startSaintMode）。 */
export function enterSaint(){
  state.saintMode = true;
}

/* saint.js 專用：離開聖徒化（三結局收尾共用）。 */
export function exitSaint(){
  state.saintMode = false;
}

/* saint.js 專用：進入／離開惡夢化。`niMode` 的唯一寫入管道（同 saintMode 的規矩）。 */
export function enterNightmare(){ state.niMode = true; }
export function exitNightmare(){ state.niMode = false; }

/* saint.js 專用：以 Maximum Burst 擊殺 → 標記本場處決（EXSECUTIŌ）。
 * sawExecution 擁有者為 inspector（3.6，結算讀取加乘）；saint 是唯一使其為真的來源，
 * 比照 addCounter/addPerfect 的「跨擁有者計數例外」，經具名 setter 寫入。 */
export function markExecution(){
  state.sawExecution = true;
}
/* saint.js 專用：以 Maximum Burst 收尾（**沒有擊殺**那一種）→ 標記本場 MB。
   ⚠ 與 `sawExecution` 是**兩件事**：擊殺的那一次走處決（EXSECUTIŌ），
     沒擊殺的才是 MB —— 評價折的秒數不同（ver -675）。
   ⚠ 惡夢化清空殘格（`triggerNiBurst`）也算 MB（Ray：「同 SI 的 MB」）。 */
export function markMaxBurst(){
  state.sawMaxBurst = true;
}

/* weapon.js 專用：反擊成功時累加反擊計數/傷害（3.6 的跨擁有者計數例外）。
 * inspector 結算時只讀這兩個值。一次反擊事件呼叫一次（+1 次、+dmg 傷害）。 */
export function addCounter(dmg){
  state.counterCount += 1;
  state.counterDamage += dmg;
}

/* defense.js 專用：完美防禦成功時累加完美次數（3.6 的跨擁有者計數例外）。
 * perfectCount 擁有者為 inspector；由 defense 判定 Perfect 時 +1、inspector 結算時讀。 */
export function addPerfect(){
  state.perfectCount += 1;
}

/* 搭檔選人畫面專用：切換實選搭檔（pickedPartner 唯一寫入管道）。
 * partner.currentPartner() 讀此值決定能力歸屬——換人即技能切換。 */
export function setPickedPartner(key){
  if(GAME_CONFIG.partners[key]) state.pickedPartner = key;
}

/* enemy.js 專用：載入敵人時，初始化敵方血量（3.2 combat-owned 的載入時寫入）。
 * 戰鬥中對敵血的持續變動仍由 combat 的 enemyDamage 負責；此處僅是換怪時的基準設定，
 * 集中成具名 setter 以符合「跨擁有者寫入走 setter」的契約（見 CLAUDE.md 3.2 / 3.3 註）。 */
export function initEnemyHp(hp){
  state.enemyMax = hp;
  state.enemyHp = hp;
}

/* ══ 現在是「本篇」還是「試玩版」？（ver -378）══
   本篇＝劇情插入戰／劇情帶起來的教學（城鎮那條線）；其餘（首頁出陣、首頁教學）＝試玩版。
   ⚠ 武器數值分兩套（`config.weapons[].story`），**只有這一支**決定要用哪一套 ——
     不要在各模組各判斷一次（鐵律 8）。 */
export function storyMode(){ return !!(state.scriptRun || state.tutorialStoryRun); }

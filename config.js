/* ============================================================================
 *  config.js — 遊戲內容資料層（唯一資料來源）
 *  ---------------------------------------------------------------------------
 *  自 reference/index.html 抽出的 GAME_CONFIG 與 ASSETS，逐字搬遷、行為等價。
 *  鐵律：所有內容數值集中在此，程式碼一律讀 config，不得寫死內容數值。
 *  ASSETS 路徑已指向專案內現有的 resources/ 目錄。
 * ========================================================================== */

/* 版本號：顯示於首頁版權宣告下方，每次部署遞增尾碼——
 *  用來確認手機（尤其 iOS 主畫面 App 的頑固快取）實際跑到的是哪一版。 */
export const VERSION = 'ver 2026.08.13-12';

export const GAME_CONFIG = {

  /* ------------------------------------------------------------------ *
   *  一、武器（特武）— Counter 反擊時使用
   *  counterWin  = 反擊判定窗口大小（越大越好按，越小風險越高回報越大，範圍 0~1）
   *  hits        = 反擊打幾發
   *  dmgPerHit   = 每發傷害（反擊總傷＝hits×dmgPerHit；重機槍 48 為基準）
   *  vfx         = 傷害數字視覺：'burst'＝同區塊同時跳多個數字（散彈）、
   *                'single'＝單發較大紅字（狙擊）、留 null＝預設逐發跳
   *  defenseDamageScale = Defense（格擋）段受傷倍率（相對大絕 ULT_DAMAGE）：
   *                      0.5＝半傷（預設，重機槍等）、0.25＝四分之一傷（散彈的保命特性）、
   *                      0＝完全免傷。留 null 視為 0.5。
   *  noPerfectBand     = true → 取消 Perfect 免傷帶（橘圈被黃圈取代）：
   *                      只剩「防一半」或「反擊成功」（狙擊的高風險特性）
   *  image       = 武器 icon（可留 null，暫時不顯示）
   *  sound       = 反擊音效鑰匙（可留 null，用預設合成音）
   *  新增武器：複製一整段 {...}，改鑰匙名與數值即可。
   * ------------------------------------------------------------------ */
  //  ⚠ 武器鑰匙＝圖檔基底名（類型_武器名，同 resources/weapon/ 圖庫命名，統一代碼與檔名）。
  weapons: {
    // 重機槍 Squall：基準武器（反擊總傷 48），Perfect 帶正常、Defense 吃半傷（0.5）
    MG_Squall:     { name:'重機槍', counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     defenseDamageScale:0.5,  noPerfectBand:false, image:'weapon_mg_squall',     sound:'se_mg_squall' },
    // 散彈槍 Blast：Counter 6發×4=24；Perfect 檔改打 6發×2=12（perfectDamageScale=0.5，傷害取代免傷）；Defense 檔吃 1/4 傷（0.25，保命但不再全免）
    Shotgun_Blast: { name:'散彈槍', counterWin:0.20, hits:6, dmgPerHit:4,  vfx:'burst',  defenseDamageScale:0.25, noPerfectBand:false, perfectDamageScale:0.5, image:'weapon_shotgun_blast', sound:'se_shotgun_blast' },
    // 狙擊槍 Falcon：反擊總傷 72（重機槍 1.5 倍）、單發大紅字、無 Perfect 免傷帶（高風險高回報）
    Sniper_Falcon: { name:'狙擊槍', counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', defenseDamageScale:0.5,  noPerfectBand:true,  image:'weapon_sniper_falcon', sound:'se_sniper_falcon' },
    // 新武器：複製一段，鑰匙用「類型_武器名」（同圖檔基底名），image 指對應 ASSETS 鑰匙。
  },
  defaultWeapon: 'MG_Squall',   // 開局預設武器（填上面的鑰匙名）

  /* ------------------------------------------------------------------ *
   *  二、搭檔（修女 Partner）— 改變戰鬥規則的角色
   *  image  = 立繪鑰匙
   *  cutin  = 聖徒化 cut-in 大圖鑰匙
   *  voice  = 語音鑰匙（可 null）
   *  perk   = 被動效果說明（目前僅記錄，效果之後接）
   *  新增搭檔：複製一段，改鑰匙名與圖音即可。
   * ------------------------------------------------------------------ */
  partners: {
    freya: {
      name:'蕾妮',
      image:'partner_twin',    // 立繪（暫用 cut-in 圖代替）
      cutin:'cutin_saint',     // 聖徒化演出大圖
      voice:null,              // 語音（PARTNER_SE_SI）之後填
      perk:'即死防禦（被動）＋生命歸還（主動）',
      // ── 被動技：即死防禦 ─────────────────────────────
      //   整場一次性。受到足以致死的攻擊時，改為保留 1 HP，並插入 cut-in。用掉後失效。
      passive:{
        key:'deathGuard',
        name:'即死防禦',
        oncePerBattle:true,      // true=整場只擋一次；false=每次都擋（不建議）
        cutin:'cutin_guard',     // 即死防禦專屬大圖（→ Renee_CI_pas.jpg）；程式讀此欄，不硬寫
        voice:'vo_death_guard',  // cut-in 對應語音（預留槽，見 ASSETS；audio 未接前為 null）
      },
      // ── 主動技：生命歸還 ─────────────────────────────
      //   聖徒化中，由「下往上滑」發動：強制中止聖徒化，保留當前血量（第四結局）。
      active:{
        key:'lifeReturn',
        name:'生命歸還',
        context:'saint',         // 發動情境：'saint'＝聖徒化內 / 'board'＝一般盤面。partner 依此判定能否發
        cutin:'cutin_return',    // 生命歸還演出大圖（→ Renee_CI_act.jpg）；實際演出由 saint scImgKey.return 讀同一鑰匙
        voice:'vo_life_return',  // cut-in 對應語音（預留槽，見 ASSETS）
      },
    },
    // 例：新搭檔
    // kerty: { name:'姬爾蒂', image:'partner_kerty', cutin:'cutin_kerty', voice:null, perk:'聖能累積更快' },
  },
  defaultPartner: 'freya',

  /* ------------------------------------------------------------------ *
   *  三、監察官（Inspector）— 結算畫面角色（框架預留，之後接）
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ *
   *  載入畫面教學 Hint（監察官口吻,冷冷的大姐姐）
   *  隨機不重複輪播:整句淡入 0.4s → 停 5s → 淡出換下一句(不用打字機)。
   *  展示參數見 tuning.loadingHintHoldMs / loadingHintFadeMs。
   * ------------------------------------------------------------------ */
  loadingHints: [
    '反擊武器的有效攻擊時間各不相同,可別手忙腳亂了。',
    '太早反擊的話,還是會吃苦頭的。',
    '越是危機時刻聖徒化的價值越高,覺得撐不住了的話就別猶豫。',
    '好好與搭檔配合,戰鬥也能更加輕鬆的吧?',
    '連擊會讓子彈越來越痛。手停下來的那一刻,一切歸零。',
    '猶豫太久,敵人可不會站著等你。指尖別停。',
    '按錯一格,代價是血。看清楚,再出手。',
    '連續命中能磨利你的暴擊。失手一次,就從頭來過。',
    '紅圈收得越小,反擊的價值越高。賭不賭,你自己決定。',
    '防住了不代表沒事——半傷,也是傷。',
    '計量表滿了就別捨不得,那雙槍是替你保命用的。',
    '乾淨俐落地打出一輪,敵人的架勢就更容易崩潰。',
    '聖徒化中受的每一擊,都在把你推向深淵。',
    '能撐到聖徒化的最後一槍,就再多送他兩成的痛苦。',
    '敵人倒下後的三秒,是追加審判的時間。別浪費。',
    '傷痕太多的話,我給的評價可不會好看。',
  ],

  inspectors: {
    freya: {
      name:'芙蕾雅',
      tier:'rookie',
      // 處決勝利（聖徒化 Maximum Burst 擊殺）專屬台詞：優先於 rank 台詞
      executionLine:'熔斷了？真慘烈呢。',
      // S 評價點「再度執槍」時的隱藏關警告台詞
      interceptLine:'慢著！有新的敵人！',
      image:'inspector_freya',          // 單張立繪鑰匙（無 portraits 時的 fallback）
      imageBase:'freya',                // 外部目錄鑰匙 → assets/inspector/freya/portrait.*
      portraits:{                       // 好感度門檻 → 立繪鑰匙（留空則用 image）
        // 0:'inspector_freya', 30:'inspector_freya__lv1', 60:'inspector_freya__lv2',
      },
      // dialogues[評價等第][好感度門檻] → 台詞陣列（隨機取一句）。目前僅好感 0 檔。
      dialogues:{
        S:{ 0:['怎麼可能？竟然能夠做到這種程度！'] },
        A:{ 0:['有興趣加入第十三騎士團嗎？我們需要你這樣的人才。'] },
        B:{ 0:['這不是還不錯嗎？'] },
        C:{ 0:['也就比一般人強一點嗎……？'] },
        D:{ 0:['……你們團長有好好訓練你嗎？'] },
        E:{ 0:['………………'] },
        lose:{ 0:['（監察官失敗台詞待填）'] },
      },
      // v17.3：Boss 戰（槍之魔女）專屬台詞組。Boss 結算時優先於上方 dialogues。格式同上（[rank][好感門檻]）。
      bossDialogues:{
        S:{ 0:['你的實力，說不定能與團長比肩！'] },
        A:{ 0:['HUND中竟然有你這樣的人存在……！'] },
        B:{ 0:['幸虧有你，竟然連那種對手也能戰勝！'] },
        C:{ 0:['我果然沒有看走眼呢。'] },
        D:{ 0:['辛苦了，慘烈的戰鬥呢。'] },
        E:{ 0:['醫療班！千萬別讓他死了！'] },
        lose:{ 0:['......確認HUND {rand3}號機能停止。辛苦了。'] },   // {rand3}＝隨機 3 位數（零補），由 inspector 代入
      },
    },
  },
  defaultInspector: 'freya',   // 填上面的鑰匙名即啟用；null＝結算畫面不顯示監察官

  /* ------------------------------------------------------------------ *
   *  五、評價分級（EVALUATION）— 結算算分 → 六階 S/A/B/C/D/E
   *  ------------------------------------------------------------------
   *  結算時把「用時 + 反擊 + 完美防禦」換算成分數，再套加乘，
   *  最後對照 tiers 由高到低取第一個達標的等第。
   *  想調難度／手感就改這裡的係數與門檻。S 段刻意拉高，較難達成。
   *
   *  分數公式：
   *    raw   = max(0, timeBonus.base − 總用時秒數 × timeBonus.perSecond)
   *          + 反擊累計傷害 × counterCoef
   *          + 完美防禦次數 × perfectPerHit
   *    score = raw × (無傷? flawlessMult : 1) × (以MaxBurst擊殺? executionMult : 1)
   * ------------------------------------------------------------------ */
  evaluation: {
    score: {
      timeBonus:     { base:3000, perSecond:40 }, // 時間分：越短越高，扣到 0 為止
      counterCoef:   2.0,     // 反擊累計傷害 × 此係數
      perfectPerHit: 50,      // 每次完美防禦加分
      flawlessMult:  1.30,    // 全程無傷 → 總分 ×1.30
      executionMult: 1.10,    // 以 Maximum Burst 擊殺（EXSECUTIŌ）→ 總分 ×1.10
    },
    // 六階門檻（分數下限）；由高到低排列，S 段刻意拉高
    tiers: [
      { rank:'S', min:3600 },
      { rank:'A', min:2800 },
      { rank:'B', min:2100 },
      { rank:'C', min:1400 },
      { rank:'D', min: 700 },
      { rank:'E', min:   0 },
    ],
  },

  /* ------------------------------------------------------------------ *
   *  三之二、評價系統（rating）— 取代上方舊 evaluation
   *  ------------------------------------------------------------------
   *  結算以百分制計分（timeScore 為主 60 分 + 加分項 - 受擊扣分），對照 tiers 取等級，
   *  再把分數換算成 EXP。所有可調數值集中於此，程式碼不得硬編評分參數。
   *
   *  時間預算隨敵人總血量自動變動：budget = (totalHP/hpPerBase)*base + (isBoss?bossBonus:0)。
   *  設計新敵人只要給 hp，評價門檻即自動跟著調整。
   *  無傷 gate：hitsTaken===0 → 直接判 S（凌駕分數）。
   * ------------------------------------------------------------------ */
  rating: {
    time: {
      base: 100,          // 每 hpPerBase 血量對應的秒數基數
      hpPerBase: 500,     // 每 500 血 = 100 秒預算
      bossBonus: 20,      // isBoss 時預算額外 +20 秒
      capSeconds: 20,     // 剩餘時間達 (預算-20) 即時間項封頂；即 20 秒內 clear 時間項滿分
    },
    points: {
      timeMax:        60, // 時間項滿分（主評價）
      accuracyMax:    15, // 命中率 × 15
      accPerfectBonus: 5, // 命中率 100%（零按錯）額外加成
      comboMax:       10,
      perfectCtrMax:  8,  // 完美反擊（Counter 反擊次數）配分
      overkillMax:    2,  // overkill 評價分數上限（收緊：原 5 太甜，隨便 overkill 就白拿滿）
      hitPenalty:     10, // 每次受擊扣 10 分（收緊：受擊懲罰加重）
    },
    norm: {
      comboTarget: 30,
      pcTarget: 5,
      okTarget: 4,   // 搭配 overkillMax=2 → 每點 overkill 0.5 分、overkill 4 即封頂（僅 2 分）
    },
    tiers: [
      { grade: 'S', min: 80 },
      { grade: 'A', min: 64 },
      { grade: 'B', min: 48 },
      { grade: 'C', min: 32 },
      { grade: 'D', min: 16 },
      { grade: 'E', min: 0  },
    ],
    exp: {
      mult: 8.7,          // 非整數倍率，避免整齊倍數
      offset: 137,        // 質數基底，保證三位數起跳
      overkillExp: 3,     // 每點 overkill 額外 +3 EXP（EXP 展示用，不影響評價分數）
      jitterMod: 7,       // 用分數尾數做微擾，讓 EXP 數字不整齊
    },
  },

  /* ------------------------------------------------------------------ *
   *  三之三、過渡禎（transitions）— 開始/結束的淡入淡出全畫面轉場
   *  ------------------------------------------------------------------
   *  淡入後停留，等「輕觸畫面繼續」才淡出並進入下一畫面（不自動停留幾秒）。
   *  fadeMs = 淡入/淡出各自時長（同時作為「淡入完成、開放輕觸」的門檻）。
   *  hint   = 淡入完成後顯示的繼續提示文字。
   *  start  = 點「開始遊戲」→ 輕觸後才真正開戰（畫面在不透明遮罩後切換）。
   *  finish = 勝利進結算前；fail = 戰敗進結算前。cn 中文大字；en 英文小字（每元素一行）。
   * ------------------------------------------------------------------ */
  transitions: {
    fadeMs: 300,
    hint: '輕觸畫面繼續',
    resultAutoMs: 70000,   // 結算/戰敗畫面停留上限（1:10 內沒操作 → 自動回首頁）
    start: {
      cn: '驅逐開始',
      autoMs: 3000,     // 3 秒內沒點 → 強制進入戰鬥
      en: [
        'For thou art of dust; unto dust shalt thou return.',
        'And in the end, thou shalt be brought unto silence.',
      ],
    },
    finish: {
      cn: '驅逐完成',
      autoMs: 3000,     // 3 秒內沒點 → 自動進結算
      en: [
        'The Lord shall send forth Her apostles.',
        'The hour of Her revelation shall come.',
        'And all flesh shall repent.',
      ],
    },
    fail: {
      cn: '驅逐失敗',
      fadeInMs: 2000,   // 黑白定格後，戰敗畫面慢慢浮現（淡入約 2 秒；淡出仍用全域 fadeMs）
      autoMs: 3000,     // 3 秒內沒點 → 自動進戰敗結算
      en: [
        'O lamb burdened with sin—follow thou thy Shepherd, and go forth unto the Beyond...',
      ],
    },
  },

  /* ------------------------------------------------------------------ *
   *  四、敵人（Enemy）
   *  name   = 顯示名稱（敵人區上方）
   *  image  = 敵人立繪鑰匙
   *  hp     = 血量（雜魚建議 ~150，測試耐打用 500；Boss 拉高血量即可）
   *  attack = 大絕一擊傷害
   *  image / sound 都對應最下面 ASSETS。
   *  新增敵人：複製一段，改鑰匙名、名稱、圖、血量。
   * ------------------------------------------------------------------ */
  enemies: {
    faceless: {
      name:'地下聖徒_A',        // UI 只顯示底線前的「地下聖徒」；底線後（_A）僅供作者辨識、不顯示
      image:'enemy_faceless',   // 內嵌暫代圖鑰匙（fallback，見最下方 ASSETS）
      imageBase:'faceless',     // 外部目錄鑰匙 → assets/enemy/faceless/portrait.*（優先，載入失敗才用內嵌 image）
      hp:200,          // 連戰第一隻（原測試值 500，v-lineup 調 200）
      attack:45,       // 大絕一擊傷害（原 ULT_DAMAGE）
      atkInterval:null,// 大絕蓄力秒數；null＝沿用 tuning.chargeSeconds（逐怪可覆寫）
      // 攻擊音（依 kind：ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。鑰匙對應 ASSETS。
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      special:[],      // 特殊行動預留（本版不實作邏輯，僅保留結構）
      // v16：每盤格數手動覆寫（index 對應第幾盤，0-based；null／缺項＝用預設規則：第三盤起 16 格）。
      //      作者日後可逐怪逐盤填數值微調難度，例：[9,9,16,16,20]。聖徒化 25 宮格不受此影響。
      boardGrids:[9,9,16,16,16],
      // v17.2：受擊特效三件套（delay＝延時懲罰／wrong＝按錯懲罰／ult＝大絕）。逐怪可各自設定。
      //   type 可用：'claw'（爪痕，可設 count 幾道）／'blood'（血痕）／'bite'（齒痕）／
      //             'bullet'（彈痕/玻璃碎裂）／'slash'（紅刀痕濺血）。
      hitFx:{
        delay:{ type:'blood', angle:'random' },   // 延時懲罰 → 一道血痕、角度隨機
        wrong:{ type:'slash' },                    // 按錯懲罰 → 一條紅刀痕濺血
        ult:{   type:'claw', count:3, angle:'random' },  // 大絕 → 三爪、角度隨機
      },
    },
    // ── 連戰第二隻（局內序列第二敵）：巨型聖徒。完全獨立一筆，非沿用 faceless。 ──
    //    非 Boss（不填 ult/delayPenalty/wrongPenalty → 普通怪走預設：單發大絕、無半傷減時）。
    //    差異：血更厚（300）＋攻擊更密（蓄力 4×1/1.2≈3.33s）；單擊傷害同一般值。
    facelessgiant: {
      name:'巨型聖徒',
      image:'enemy_facelessgiant',   // 內嵌立繪鑰匙 → resources/enemy/Faceless_EN_02.png
      imageBase:'facelessgiant',     // 外部目錄鑰匙（現況無 assets/ → 404 fallback 到內嵌，與其他敵同）
      hp:300,                        // 血更厚
      attack:45,                     // 大絕單擊傷害（普通值；差異在密度不在單擊）
      atkInterval:3.33,              // 大絕蓄力秒數：4×(1/1.2)≈3.33 → 攻擊更密（比第一隻高 20%）
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },   // 兩聖徒攻擊音相同
      special:[],
      boardGrids:[9,9,16,16,16],     // 自帶：前兩盤 9 格（累積破防、combo 加成總量低，不開場爆血）
      hitFx:{                        // 自帶獨立三件套（巨型聖徒風味：大絕爪數加重為 4）
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },      // 按錯 → 紅刀痕濺血
        ult:{   type:'claw', count:4, angle:'random' },
      },
    },
    // 亂入怪（無傷 45 秒內通關才會出現）— 先用同一隻怪測流程，正式再換
    intruderEnemy: {
      name:'亂入者 · ???',
      image:'enemy_faceless',
      imageBase:'faceless',
      hp:400,
      attack:50,
      atkInterval:null,
      sound:{ hit:null, ult:null, death:null },
      special:[],
      boardGrids:[9,9,16,16,16],   // v16：每盤格數手動覆寫（同上，聖徒化不受影響）
    },
    // ── 槍之魔女（Boss）v17：S 評價後遭遇的隱藏 Boss ──
    witch: {
      name:'槍之魔女',
      image:'enemy_witch',      // 內嵌立繪鑰匙（附圖）
      imageBase:'witch',        // 外部目錄鑰匙 → assets/enemy/witch/portrait.*（優先，載入失敗才用內嵌 image）
      hp:500,
      attack:45,                // 大絕單點傷害（同一般怪基準）
      atkInterval:null,         // 大絕蓄力窗口（紅圈縮放時間）；null＝沿用 tuning.chargeSeconds
      // Boss 攻擊音：大絕/不完美防禦/延時＝槍聲 EM_Shot；按錯＝匕首 EM_Dagger。
      sound:{ ult:'em_shot', delay:'em_shot', wrong:'em_dagger' },
      special:[],
      boardGrids:[9,9,16,16,16],
      // v17：Boss 專屬機制（一般怪不填＝走預設，資料/程式分離）
      ult:{ shots:2, gapMs:1000, minMs:2000, maxMs:4000 },   // 大絕：一次先後出 2 個點、間隔 1 秒；發動頻率 2~4 秒
      delayPenalty:{ dmgScale:0.5, timeDelta:-1 },           // 延時懲罰：攻擊力為一般怪一半、時限減 1 秒
      wrongPenalty:{ dmgScale:1 },                           // 按錯懲罰：攻擊力同一般怪
      // v17.2：受擊特效 —— 大絕/延時走彈痕（玻璃碎裂），按錯改紅刀痕濺血
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },   // 延時懲罰 → 一顆彈痕
        wrong:{ type:'slash' },                            // 按錯懲罰 → 一條紅刀痕濺血
        ult:{   type:'bullet', count:2, pos:'random' },   // 大絕 → 兩顆彈痕
      },
    },
    // 例：新怪
    // giant: { name:'巨人', image:'enemy_giant', imageBase:'giant', hp:150, attack:30, atkInterval:5, sound:{}, special:[] },
  },
  currentEnemy: 'faceless',   // 這場開場先打誰（填上面的鑰匙名）

  /* 連戰陣容（局＝同場清一隻接下一隻）。依序取,打完一敵接下一敵,最後一敵清完進結算。
     同場換敵全延續（playerHp/combo/energy/聖能/計數/計時延續）；只有「場」新戰鬥/Boss 亂入才重置。
     每隻各跑自己的 boardGrids 盤序（換敵時盤序回 0）。 */
  lineup: ['faceless','facelessgiant'],

  /* 亂入設定（New Hustle）— 結算畫面後、無傷達標才觸發 */
  intruder: {
    enable:true,
    condition:{ maxTime:45, noDamage:true },  // 45 秒內 + 全程無傷（v15 起觸發已改綁 S 評價，此條件僅備查）
    cutinText:'NEW HUSTLE INCOMING',           // 亂入 Boss 遭遇 cut-in 字樣（一律用此，不因怪而異）
    enemy:'witch',                             // v17：S 評價後遭遇的 Boss＝槍之魔女
    bannerHold:1800,                           // 結算畫面停留多久(ms)後才播 Boss cut-in
  },

  /* ------------------------------------------------------------------ *
   *  五、數值總表（TUNING）— 對應說明書 §16 速查表
   *  想調手感就改這裡的數字，改完存檔重開即可。
   * ------------------------------------------------------------------ */
  tuning: {
    // 玩家
    playerHp:            100,   // 我方血量

    // 傷害
    dmgBase:             3,     // 基礎單發傷害
    dmgPerCombo:         0.2,   // 每層連擊加成
    dmgComboCap:         20,    // 連擊加成計入上限
    dmgDualMult:         0.7,   // 雙槍傷害倍率（<1=安全牌）
    dmgCritMult:         3,     // 暴擊倍率（舊保留欄位，未使用；實際暴擊改用下方 crit* 參數）

    // 暴擊（普攻）：暴擊率/暴擊加傷皆隨「連擊」成長；連擊於受擊或清盤中斷歸零。雙槍破防期間無暴擊。
    critBaseRate:        0.10,  // 普攻初始暴擊率（連擊 0 時）
    critPerCombo:        0.01,  // 每一連擊 +1% 暴擊率
    critDmgBase:         0.10,  // 普攻暴擊加傷（+10%，連擊 0 時）
    critDmgPerCombo:     0.01,  // 每一連擊 +1% 暴擊加傷
    // 暴擊（反擊武器）：固定暴擊率、固定加傷；每一 hit 各自獨立擲骰。
    counterCritRate:     0.20,  // 反擊武器固定暴擊率
    counterCritDmg:      0.10,  // 反擊武器暴擊加傷（+10%）

    dmgWrong:            10,    // 普通按錯受擊
    dmgHeavy:            18,    // 紅字期間按錯的重擊
    dmgDelay:            8,     // v17：延時（太慢）懲罰基礎傷害（一般怪；Boss 以 delayPenalty.dmgScale 縮放）

    // 聖能與大絕蓄力
    energyPerHit:        2,     // 每次正確點擊給的聖能
    chargeSeconds:       4,     // 敵人大絕蓄力窗口（秒）

    // Overkill 限時（敵死後的追加輸出窗口）
    overkillLimitMs:     3000,  // 3 秒內沒清完 → 全數字磚破碎自動清盤
    overkillNextDelayMs: 0,     // 自動清盤後直接插入下一盤（原 1000ms 防連點誤觸，手感太拖已取消）

    // 載入畫面教學 Hint 輪播（文案見 loadingHints）
    loadingHintHoldMs:   5000,  // 每句停留 5 秒
    loadingHintFadeMs:   400,   // 淡入/淡出時間

    // 三級防禦窗口（依紅點剩餘時間比例；大=早，小=晚）
    defDefenseMin:       0.35,  // 0.35~1.0 → Defense（傷害減半）
    defPerfectMin:       0.12,  // 0.12~0.35 → Perfect（免傷）
                                // 0~0.12 → Counter（免傷+武器反擊）

    // 雙槍
    dualSeconds:         4,     // 破防模式時長（秒）

    // 聖徒化（受擊競賽爆發）
    // v18：由「回血計時器」改為「受擊推進計時器」。血條＝倒數槽；只有真正受擊才推進，
    //      推進到滿＝OBE（沒守住）；滿前把盤面點完＝Maximum Burst（贏了就跑）。
    //      Counter／Perfect 維持免傷、不推進。維持 16 宮格、期間敵攻擊更密集保持忙碌爽快。
    saintGrid:           16,    // v18：聖徒化盤面格數（維持 16，不再擴成 25）
    saintGridCols:       4,     // v18：聖徒化盤面每列格數
    saintAdvanceDivisor: 15,    // v18：一次「受擊」（挨大絕／按錯／反應超時）推進量＝playerMax/此值（≈+1 秒）
    saintBlockDivisor:   30,    // v18：一次「格擋（Defense）」推進量＝playerMax/此值（≈+0.5 秒）
    saintPassiveHealSec: 10,    // v18b：被動回血打底——無受擊時，從現存血量回滿約需秒數（受擊會額外加速）
    saintReactSecInSaint:5,     // 聖徒化「發動期間」延時懲罰放寬（秒）：v16
    saintNoAtkAfterCutinSec: 3, // 聖徒化 cut-in 撤下後，敵不發動大絕的秒數（v16）
    saintUltMinMs:       1200,  // v18：聖徒化期間敵大絕發動頻率下限（毫秒；越小越密集）
    saintUltMaxMs:       2600,  // v18：聖徒化期間敵大絕發動頻率上限（毫秒）
    saintComboStep:      1.0,   // 聖徒化每 combo 疊傷斜率（無上限）。reference 為 0.5；本專案調 1.0
                                //   使單場 16 擊累計 ≈211（>200 目標）。見 DECISIONS.md D4。
    saintLastHitRatio:   0.20,  // 結束前清盤 → 追加期間總傷害的 20%（MB 爆發；維持 reference）

    // 攻擊加倍 buff
    atkBuffSeconds:      3,     // 攻擊加倍時長（秒）

    // 榴彈
    grenades:            1,     // 開局榴彈數
  },

  /* ------------------------------------------------------------------ *
   *  六、盤面序列（Schulte 方格）— 進階，通常不用動
   *  grid=格數, cols=每列幾格, interval=間隔時限(秒), hint=是否高亮下一格
   * ------------------------------------------------------------------ */
  boards: [
    { grid:9,  cols:3, interval:2.0, hint:true  },
    { grid:9,  cols:3, interval:2.2, hint:false },
    { grid:16, cols:4, interval:2.8, hint:false },
    { grid:16, cols:4, interval:3.0, hint:false },
    { grid:16, cols:4, interval:3.2, hint:false },
  ],

};

export const ASSETS = {
  // ── 圖片 ──
  home_emblem:    "resources/background/TIVOT_Emblem.png",   // 主畫面徽記（含 THE IV ORDER OF TESTAMENT 弧字）
  enemy_faceless: "resources/enemy/Faceless_EN_01.jpg",   // 無貌者 Boss 暫代圖
  cutin_saint:    "resources/partner/Luna_CI_saint.jpg",   // 聖徒化 cut-in 暫代圖
  partner_twin:   "resources/partner/Luna_SI_01.jpg",   // 雙槍修女立繪（暫用 cut-in 圖）
  inspector_freya: "resources/inspector/Freya_SI_01.png",
  enemy_witch:    "resources/enemy/Witch_EN_01.jpg",   // v17：槍之魔女（Boss）內嵌立繪
  enemy_facelessgiant: "resources/enemy/Faceless_EN_02.png",   // 連戰第二隻：巨型聖徒 內嵌立繪

  // ── 五張 cut-in 圖（v17.7 嵌入）──
  cutin_saint_luna: "resources/partner/Luna_CI_advent.jpg",   // 聖徒化降臨 cut-in（Luna）
  voice_saint_luna: "resources/partner/Luna_SI_SE.m4a",       // 聖徒化發動語音（Luna，1.7s；與 sfx_saint 疊播）
  cutin_exc: "resources/partner/Luna_CI_exc.png",   // 處決 EXSECUTIŌ cut-in（Luna）
  cutin_obe: "resources/partner/Luna_CI_obe.jpg",   // O.B.E. cut-in（Luna）
  cutin_mb: "resources/partner/Luna_CI_maxburst.jpg",   // Maximum Burst cut-in（Luna）
  cutin_guard: "resources/partner/Renee_CI_pas.jpg",   // 即死防禦 cut-in（蕾妮/Renee·被動；檔名 _pas＝passive）
  cutin_return: "resources/partner/Renee_CI_act.jpg",   // 生命歸還 cut-in（蕾妮/Renee·主動；檔名 _act＝active）
  cutin_boss: "resources/enemy/Belinda_CI_boss.jpg",   // v18d：Boss（貝琳妲）遭遇 cut-in 專屬圖

  // ── 副武器圖（換裝選單縮圖）：鑰匙對應 weapons.image；檔名＝類型_武器名 ──
  weapon_mg_squall:     "resources/weapon/MG_Squall.png",       // 重機槍 Squall
  weapon_shotgun_blast: "resources/weapon/Shotgun_Blast.png",   // 散彈槍 Blast
  weapon_sniper_falcon: "resources/weapon/Sniper_Falcon.png",   // 狙擊槍 Falcon

  /* ── 音效 / BGM / 語音（預留槽）───────────────────────────────────────────
   *  目前 audio.js 為 no-op 骨架（合成音尚未搬回），這裡先掛 null 佔位；
   *  日後填 base64 或路徑（建議 resources/audio/{sfx,bgm,voice}/…）即可，
   *  程式 asset(key) 已相容 null→""，故未填不會壞。
   *  命名慣例：SFX＝SE_… ／ BGM＝BGM_… ／ 語音＝VO_…（鑰匙小寫、檔名保留大小寫）  */

  // 反擊武器音效（所有副武器各一支；鑰匙對應 weapons.sound）。檔名＝<類型_武器名>_SE.mp3，統一放 resources/weapon/。
  se_mg_squall:      "resources/weapon/MG_Squall_SE.mp3",       // 重機槍 反擊（連續感：整支播一次）
  se_shotgun_blast:  "resources/weapon/Shotgun_Blast_SE.mp3",   // 散彈槍 反擊（一次一發）
  se_sniper_falcon:  "resources/weapon/Sniper_Falcon_SE.mp3",   // 狙擊槍 反擊（單發）

  // 清盤換彈音（盤面清空、顯示 RELOADING 時播）
  sfx_reload:        "resources/weapon/Reload.mp3",

  // 開始遊戲 stinger（點下開始瞬間，蓋過 BGM 切歌的淡出/進入前段）
  sfx_start:         "resources/Stage/Start_01.mp3",
  // 聖徒化發動音效
  //  ⚠ 素材「內容」更新但檔名不變時,在路徑加/升 ?v=N 強制手機重抓(HTTP 快取以 URL 為鍵)。
  sfx_saint:         "resources/Stage/SI_01.mp3?v=2",

  // 完美防禦（完防）合成替代音（一般武器；散彈完防維持自己的槍聲）
  se_guard:          "resources/weapon/Guard_SE.m4a",

  // 搭檔演出 SE（Luna）：發動/結局 cut-in 同步播。放 resources/partner/。
  se_luna_dual:      "resources/partner/Luna_dual_se.wav",   // 雙槍破防發動
  se_luna_exc:       "resources/partner/Luna_EXC_SE.wav",    // 處決 EXSECUTIŌ cut-in
  se_luna_mb:        "resources/partner/Luna_MB_SE.wav",     // Maximum Burst cut-in
  se_luna_obe:       "resources/partner/Luna_OBE_SE.wav",    // O.B.E. cut-in

  // 敵人攻擊音（依攻擊種類 kind：ult 大絕命中/不完美防禦格擋、delay 太慢、wrong 按錯）。放 resources/enemy/。
  em_slash:          "resources/enemy/EM_Slash_SE.m4a",    // 聖徒：大絕/不完美防禦/按錯
  em_smack:          "resources/enemy/EM_Smack_SE.m4a",    // 聖徒：延時懲罰
  em_shot:           "resources/enemy/EM_Shot_SE.mp3",     // Boss：大絕/不完美防禦/延時
  em_dagger:         "resources/enemy/EM_Dagger_SE.m4a",   // Boss：按錯

  // 普攻槍聲（手槍；每次正確點擊由這兩支隨機播一支，製造變化）
  se_pistol_01:      "resources/weapon/Pistol_SE_01.mp3",
  se_pistol_02:      "resources/weapon/Pistol_SE_02.mp3",

  // BGM（loop、不可交疊，切歌時前一首淡出）。放 resources/Stage/。
  //  BGM 一律 .m4a（AAC-LC 96k，自 128k MP3 轉檔，體積 −24%）：全平台原生支援；
  //  .mp3 原檔保留於 resources/Stage 作母帶，需要重轉時用 ffmpeg -c:a aac -b:a 96k。
  bgm_home:      "resources/Stage/MainMenu.m4a",       // 主選單（含次要選單）
  bgm_battle:    "resources/Stage/Battle_01.m4a",      // 戰鬥（驅逐開始插入瞬間起播）
  bgm_lose:      "resources/Stage/MissonFaild_01.m4a", // 任務失敗（驅逐失敗插入起播）
  bgm_result:    "resources/Stage/Result_01.m4a",      // 結算（驅逐完成頁被點掉後起播）
  bgm_boss:      "resources/Stage/BOSS_01.m4a",        // Boss 戰（點下迎擊起播）
  bgm_intruder:  null,   // （無獨立亂入曲；亂入＝Boss，走 bgm_boss）

  // 語音（每個 cut-in 各一支；檔名 VO_<情境>）
  vo_saint_install: null,   // 聖徒化降臨（SAINT INSTALL）→ VO_SaintInstall
  vo_maxburst:      null,   // Maximum Burst            → VO_MaxBurst
  vo_exsectio:      null,   // EXSECUTIŌ（處決）         → VO_Exsectio
  vo_obe:           null,   // O.B.E.                   → VO_OBE
  vo_life_return:   null,   // 生命歸還（主動）          → VO_LifeReturn
  vo_death_guard:   null,   // 即死防禦（被動）          → VO_DeathGuard
  vo_dual_wield:    null,   // 雙槍破防                 → VO_DualWield
  vo_new_hustle:    null,   // Boss 遭遇 / 亂入          → VO_NewHustle
};

/* ---- 小工具：從 ASSETS 取素材（找不到回傳空字串，不會壞）---- */
export function asset(key){ return (key && ASSETS[key] != null) ? ASSETS[key] : ""; }

/* ============================================================================
 *  config.js — 遊戲內容資料層（唯一資料來源）
 *  ---------------------------------------------------------------------------
 *  自 reference/index.html 抽出的 GAME_CONFIG 與 ASSETS，逐字搬遷、行為等價。
 *  鐵律：所有內容數值集中在此，程式碼一律讀 config，不得寫死內容數值。
 *  ASSETS 路徑已指向專案內現有的 resources/ 目錄。
 * ========================================================================== */

/* 版本號：顯示於診斷 HUD（首頁連點團徽 5 下開啟），每次部署遞增尾碼——
 *  用來確認手機（尤其 iOS 主畫面 App 的頑固快取）實際跑到的是哪一版。 */
export const VERSION = 'ver 2026.08.20-257';

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
  //  name＝選單全名；shortName＝首頁 loadout 鈕顯示的綽號（全名過長會爆版）。
  //  desc＝選單規格文案（\n 換行，.ws-desc 為 pre-line）；暴擊率＝tuning.counterCritRate（20%）。
  weapons: {
    // B1901 陣地機槍「絞肉機」：基準武器（反擊總傷 48），Perfect 帶正常、Defense 吃半傷（0.5）
    MG_Squall:     { name:'B1901陣地機槍「絞肉機」', shortName:'絞肉機',
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     defenseDamageScale:0.5,  noPerfectBand:false, image:'weapon_mg_squall',     sound:'se_mg_squall',
                     desc:'反擊效果\n黃圈：減傷50%\n橘圈：完全防禦\n反擊：8發×6傷害\n暴擊率：20%\n攻守均衡的可靠選擇' },
    // 雙管霰彈槍「鐵拳」：Counter 6發×4=24；Perfect 檔改打 6發×2=12（perfectDamageScale=0.5，傷害取代免傷）；Defense 檔吃 1/4 傷（0.25＝減傷75%）
    Shotgun_Blast: { name:'雙管霰彈槍「鐵拳」', shortName:'鐵拳',
                     counterWin:0.20, hits:6, dmgPerHit:4,  vfx:'burst',  defenseDamageScale:0.25, noPerfectBand:false, perfectDamageScale:0.5, image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     desc:'反擊效果\n黃圈：減傷75%\n橘圈：6發×2傷害\n反擊：6發×4傷害\n暴擊率：20%\n保命的穩健之選' },
    // 85 式步槍「嗜心者」：反擊總傷 72（1.5 倍）、單發大紅字、無 Perfect 帶；
    //   defenseDamageScale 1＝黃圈也無減傷（與文案一致：賭上一切，防禦全靠反擊窗）
    Sniper_Falcon: { name:'85式步槍「嗜心者」', shortName:'嗜心者',
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', defenseDamageScale:1,    noPerfectBand:true,  image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     desc:'反擊效果\n黃圈：無減傷效果\n橘圈：無減傷效果\n反擊：單發72傷害\n暴擊率：20%\n賭上一切的單發重擊' },
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
    renee: {
      name:'蕾妮',
      image:'partner_renee',   // 選人畫面大立繪（Renee_SI_01）
      // 選人畫面取景（基準）：zoom=1 整張以高度貼合取景框；top=0 頭頂對齊框頂。
      //   蕾妮原圖即膝上構圖、頭約佔畫高 22%，作為所有搭檔「頭部大小」的基準。
      siFit:{ zoom:1, top:0 },
      cutin:'cutin_saint',     // 聖徒化演出大圖
      voice:null,              // 語音（PARTNER_SE_SI）之後填
      selectVoice:'vo_life_return', // 選人畫面「選擇此搭檔」確認 SE（→ Renee_VC_Act.wav，與生命歸還共用）
      perk:'即死防禦（被動）＋生命歸還（主動）',
      // ── 被動技：即死防禦 ─────────────────────────────
      //   整場一次性。受到足以致死的攻擊時，改為保留 1 HP，並插入 cut-in。用掉後失效。
      passive:{
        key:'deathGuard',
        name:'即死防禦',
        oncePerBattle:true,      // true=整場只擋一次；false=每次都擋（不建議）
        cutin:'cutin_guard',     // 即死防禦專屬大圖（→ Renee_CI_pas.jpg）；程式讀此欄，不硬寫
        voice:'vo_death_guard',  // cut-in 對應 SE（→ Renee_VC_Pas.wav）
        desc:'受到足以致死的攻擊時，為玩家保留1hp續命。',
      },
      // ── 主動技：生命歸還 ─────────────────────────────
      //   聖徒化中，由「下往上滑」發動：強制中止聖徒化，保留當前血量（第四結局）。
      active:{
        key:'lifeReturn',
        name:'生命歸還',
        context:'saint',         // 發動情境：'saint'＝聖徒化內 / 'board'＝一般盤面 / 'any'＝兩者皆可
        cutin:'cutin_return',    // 生命歸還演出大圖（→ Renee_CI_act.jpg）；實際演出由 saint scImgKey.return 讀同一鑰匙
        voice:'vo_life_return',  // cut-in 對應 SE（→ Renee_VC_Act.wav）
        desc:'聖徒化期間發動：強制中止聖徒化，保留當前血量。',
      },
    },
    // ── 第二搭檔：馬季諾 Malzeno ──────────────────────────
    malzeno: {
      name:'馬季諾',
      image:'partner_malzeno', // 選人畫面大立繪（Malzeno_SI_01）
      // 選人畫面取景：原圖為全身立繪（頭僅約佔畫高 11%）→ 放大 1.85 倍使頭部與蕾妮基準等大，
      //   由頭頂往下取景、下緣自然裁在膝上（不露全身）。調整框內構圖改這兩個數即可。
      siFit:{ zoom:1.85, top:0 },
      cutin:'cutin_saint',     // 聖徒化演出大圖（沿用共通）
      voice:null,
      selectVoice:'vo_hc_rounds',   // 選人畫面「選擇此搭檔」確認 SE（→ Malzeno_VC_Pas.wav，與高裝藥彈共用）
      perk:'前線補給（主動）＋高爆彈頭（被動）',
      // ── 被動技：高裝藥彈 ─────────────────────────────
      //   玩家 HP 降至 threshold（50%）以下的瞬間發動：普攻傷害加倍 buffSeconds 秒，
      //   時間到自然結束、效果可跨盤面延續。邊緣觸發：HP 回到門檻上才重新上膛、
      //   再跌破可再發動（門檻下不重複觸發）。發動瞬間插 cut-in。
      passive:{
        key:'lowHpBuff',
        name:'高裝藥彈',
        en:'High-Charge Rounds', // cut-in 英文副標
        threshold:0.50,          // 發動門檻：HP ≤ playerMax × 此值
        buffSeconds:10,          // 普攻加倍持續秒數（可跨盤）
        cutin:'cutin_malzeno_pas', // 被動 cut-in 大圖（→ Malzeno_CI_pas.png）
        voice:'vo_hc_rounds',    // cut-in 對應 SE（→ Malzeno_VC_Pas.wav）
        desc:'HP 降至 50% 以下時發動：10 秒普攻傷害加倍，效果可跨盤面延續。',
      },
      // ── 主動技：前線補給 ─────────────────────────────
      //   一般盤面發動：立即進入雙槍破防射擊窗口（不吃破防值、不另播雙槍 cut-in——
      //   馬季諾 cut-in 撤下後直接開窗）。每場一次。
      //   ⚠ 聖徒化期間不可發動（「聖徒化不能開雙槍」原則）：context:'board' 擋掉聖徒化入口。
      active:{
        key:'supplyRefill',
        name:'前線補給',
        en:'Frontline Supply',   // cut-in 英文副標
        context:'board',         // 一般盤面限定（聖徒化中不可發動）
        oncePerBattle:true,      // 每場一次（可調：false＝不限次數）
        cutin:'cutin_malzeno_act', // 前線補給 cut-in 大圖（→ Malzeno_CI_act.png）
        voice:'vo_supply_refill',  // cut-in 對應 SE（→ Malzeno_VC_Act.wav）
        desc:'立即進入雙槍破防。聖徒化期間無法發動。',
      },
    },
  },
  defaultPartner: 'renee',   // 搭檔只有 renee（蕾妮）/ malzeno（馬季諾）；freya＝監察官（inspectors）

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
   *  三之四、教學關卡（tutorial）— 首次出陣時插入的對話教學
   *  ------------------------------------------------------------------
   *  首次判定：localStorage[storageKey]；「看完」或「跳過」都記為已看，
   *  之後出陣一律直接進正常戰鬥。中途按退出回主選單＝不算看過。
   *  型態：穿插式——教學就是一場真實戰鬥，打到 steps[].trigger 對應節點
   *  即暫停插入對話（不計時/敵不攻擊/無延時懲罰/不可點盤面與反擊），
   *  講完繼續打。可觸發節點（由 combat/defense 於該節點通知 tutorial）：
   *    'battleStart' ＝開戰首盤載入後（延遲 startDelayMs 讓戰鬥畫面先浮現）
   *    'threat'      ＝敵人首次生成大絕紅點時（紅點凍結於畫面上講解）
   *    'board:N'     ＝第 N 盤（0-based）載入時
   *  lines[].who 對應 cast 鑰匙；cast[].side 決定立繪自左或右移入。
   *  ⚠ 台詞為佔位稿，之後定稿改這裡即可（資料/程式分離）。
   * ------------------------------------------------------------------ */
  tutorial: {
    storageKey: 'tivot.tutorialSeen.v1',
    enemyKey: 'trainee',   // 教學專用敵（enemies.trainee＝訓練用聖徒；combat.startGame 於教學啟動時換上）
    startDelayMs: 700,     // 開戰後多久插入第一段對話（ms）
    lineTypeMs: 30,        // 打字機每字間隔（ms）；點擊對話中先跳完整句、再點下一句
    // 教學戰鬥的規則調整（只在 tutorialActive 期間生效）：
    enemyAtkDamage: 2,     // 敵方所有攻擊（大絕/按錯/延時）基礎傷害一律此值；Defense 格擋再減半（=1）
    noUltBoards: 1,        // 前 N 盤敵人不發動大絕（第一盤純練清盤，第二盤起反擊教學）
    // 教學戰敵人血量：開場固定、全程不變（不再於聖徒化後壓血）。
    //   由「終盤 overkill」條件反推：開場四回合累計傷害 ≈190＋聖徒化+MB ≈260 → 約 450；
    //   定 500（曾上修 550 防提前擊殺，過長 → 回調）：提前擊殺的保證在機制端——
    //   教學段落未播完前（tutorialActive）敵血夾底 1 不可被殺（combat.enemyDamage 的教學夾傷），
    //   血量只影響收尾盤節奏。
    enemyHp: 500,
    preFullEnergy: 90,     // 第二回合清盤時破防值設為此值（＝100−5 擊×energyPerHit(2)：
                           //   第三回合點 5 個數字後才滿、滿了才跳蕾妮引導）；此前破防值也封頂於此
    // 削血保底觸發：玩家反擊削血過快時，教學段落不因「還沒輪到」而被跳過——
    //   敵 HP ≤ dualForceHpRatio 且破防教學未觸發 → 直接填滿破防值走原引導；
    //   敵 HP ≤ strikeForceHpRatio 且劇情殺未觸發 → 直接觸發「小心！」（聖徒化教學）。
    dualForceHpRatio:   0.5,
    strikeForceHpRatio: 0.3,
    // 聖徒化教學收尾（finishMB/finishLR 台詞開播）時敵殘血封頂：保證玩家「一盤內」殺進
    //   overkill 結束教學戰（16 格 × 基礎傷 3＋combo 斜率 ≳ 此值）。
    finishEnemyHp: 70,
    // 教學期間大絕紅點的生成範圍（%），避開左右立繪與下方對話框——只在中央帶出現。
    //   first＝反擊教學第一顆紅點的固定位置（畫面正中偏上，凍結講解時不壓立繪）；
    //   教學全程一次只出一顆（有紅點在場時暫緩下一發，見 tutorial.ultSuppressed）。
    threatSpawn: { leftMin:38, leftMax:62, topMin:25, topMax:55, first:{ left:50, top:18 } },
    // 第四回合劇情殺（聖徒化前導）：玩家清滿 afterCells 格 → 監察官「小心！」→
    //   分三次擊倒（gapMs 間隔）；kinds 對應該敵 hitFx 三種受擊畫面（第二次＝三爪 ult）。
    //   dmg 為真實傷害（劇情殺不受 enemyAtkDamage=2 管制）；末段必致死 → 即死防禦保 1 HP。
    strike: { afterCells:8, gapMs:700, hits:[
      { kind:'delay', dmg:30 },    // 第一擊：血痕
      { kind:'ult',   dmg:40 },    // 第二擊：三爪
      { kind:'wrong', dmg:999 },   // 第三擊：紅刀痕，致死 → 即死防禦
    ]},
    // 立繪：portraitHeightPct＝基準高（佔敵人框高 %）；fit 逐角色取景——
    //   zoom：以監察官（芙蕾雅）「眼睛寬度」為基準縮放，使兩人五官等大、比例一致
    //         （兩圖同 1024×1536；實測眼寬 芙蕾雅≈53px、蕾妮≈65px → 蕾妮 53/65≈0.82）。
    //   drop：立繪往敵人框下緣外推的 %（被裁去下方）——不以全圖置入為原則，
    //         用來調兩人同框的站位與身高差（監察官略高）。
    portraitHeightPct: 88,
    cast: {
      inspector: { name:'芙蕾雅', image:'inspector_freya', side:'left',  fit:{ zoom:1,    drop:10 } },
      partner:   { name:'蕾妮',   image:'partner_renee',   side:'right', fit:{ zoom:0.82, drop:0 } },
    },
    // 罵人台詞（監察官）：教學中玩家「按錯 / 延時」即插入一句（隨機取、可重複觸發；
    //   defended 段講完後停用）。early＝太早防禦（Defense 格擋半傷）專用——不受 defended
    //   停用限制、聖徒化期間不插（見 tutorial.onEarlyBlock）。
    scold: {
      wrong: [
        '看清楚數字再出手。你的搭檔可不會替你挨這一下。',
        '慌了？順序，是基本中的基本。',
      ],
      delay: [
        '手停下來做什麼？敵人可不會等你。',
        '猶豫的代價，記住這種痛。',
      ],
      early: [
        '太早了！看清楚一點！',
      ],
    },
    steps: [
      // 第一盤：純清盤教學（noUltBoards=1 → 敵人不出大絕）
      { trigger:'battleStart', lines:[
        { who:'inspector', text:'開始實戰考核。HUND，讓我看看你的基礎是否紮實。' },
        { who:'partner',   text:'別緊張！照著數字順序點擊下方的盤面，每一次命中都會對敵人開火！' },
        { who:'partner',   text:'這一回合敵人還不會出手——先把手感練起來。不過按錯或停太久，還是會受傷的喔。' },
      ]},
      // 第二盤開始：反擊教學開場（此盤起敵人開始發動大絕）
      { trigger:'board:1', lines:[
        { who:'inspector', text:'基礎還行。接下來——敵人要開始反擊了。' },
        { who:'partner',   text:'敵人蓄力時，畫面上會出現光圈。那就是防禦的信號！' },
      ]},
      // 第一顆紅點生成瞬間（凍結在畫面上講解）——防禦分級講確實：
      //   太早＝格擋（仍受一半傷害）；時機正確＝完美防禦（免傷）
      { trigger:'threat', lines:[
        { who:'partner',   text:'光圈會越縮越小——太早出手只能「擋下」，還是會受到一半傷害！' },
        { who:'partner',   text:'等光圈收得夠小、時機正確，才能「完美防禦」，不受損傷！' },
        { who:'inspector', text:'防住給我看。' },
      ]},
      // 首次成功防下攻擊（點掉紅點）之後：反擊與副武器說明。
      //   此段結束後直到第二盤清完不再插入任何提示（罵人停用、延時懲罰恢復）。
      { trigger:'defended', lines:[
        { who:'inspector', text:'擋得不錯。記住——在敵人出手的前一瞬反擊，就能用副武器造成大量傷害。' },
        { who:'partner',   text:'不過別勉強反擊，覺得危險的話，防下來就好。' },
        { who:'inspector', text:'那樣的話，我的評價可不會留情。' },
        { who:'inspector', text:'不同副武器的效果與反擊時機各不相同。選擇能發揮自己天賦的武器吧。' },
      ]},
      // 第四回合：玩家清滿 strike.afterCells 格後觸發（收段後劇情殺三連擊 → 聖徒化引導）
      { trigger:'strike', lines:[
        { who:'inspector', text:'小心！' },
      ]},
    ],
    /* ── 腳本化段落（scripted）：由 tutorial 內部流程觸發，不走 steps 的 trigger ──
     *  dualReady  ＝第三盤破防值滿的瞬間（暫停＋箭頭指向計量表，點下才繼續）
     *  dualGo     ＝雙槍破防 cut-in 結束後（接著玩家無視順序清盤）
     *  saintCall  ＝三爪即死防禦 cut-in 結束後（暫停＋左側箭頭向右，滑動才繼續）
     *  saintStart ＝聖徒化降臨 cut-in 結束後（講完交還操作）
     *  saintFail  ＝聖徒化倒數槽推至臨界（99）仍未清盤（暫停＋箭頭向上，上滑發動生命歸還）
     *  finishMB   ＝Maximum Burst 結束後；finishLR＝生命歸還結束後（皆接「玩家收尾殺敵」）
     */
    script: {
      dualReady:  [ { who:'partner',   text:'敵人露出破綻了！就是現在！' } ],
      dualGo:     [ { who:'partner',   text:'敵人無法抵抗，無視順序猛攻吧！' } ],
      // center:true → 立繪移到畫面正中（左側讓給向右滑的引導箭頭，箭頭不壓立繪）
      saintCall:  { center:true, lines:[ { who:'inspector', text:'沒時間了，立刻聖徒化！' } ] },
      saintStart: [ { who:'inspector', text:'在熔斷前你死不了，但承受攻擊會加速熔斷！' },
                    { who:'inspector', text:'別失誤！只要撐過這回合就有機會逆轉！' } ],
      saintFail:  [ { who:'partner',   text:'不行了！交給我！' } ],
      finishMB:   [ { who:'inspector', text:'總算撐過來了，體力也回復了一些，現在結束這場戰鬥吧！' } ],
      finishLR:   [ { who:'inspector', text:'總算撐過來了，現在結束這場戰鬥吧！' } ],
    },
    // 引導箭頭（雪鐵龍雙箭羽依次閃滅）文字標示
    guideLabels: { click:'CLICK！', right:'向右側滑動', up:'向上滑動' },
    /* ── 教學專屬結算（inspector.settle 讀取；tutorialRun 旗標存續到結算）──
     *  usedLifeReturn＝有發動蕾妮主動技（生命歸還）；noLifeReturn＝沒發動（MB 過關）。
     *  outro 接在其後同框逐字補完；按鈕改「回到主畫面」，按下先補 buttonLine 再回首頁。 */
    result: {
      usedLifeReturn: '我話說在前頭，這次是蕾妮救了你，萬一熔斷就真的背水一戰了。',
      noLifeReturn:   '身手不錯，但要存活下來也得好好依賴伙伴。',
      outro:          '「聖徒化」是場豪賭，失敗的話就只能背水一戰，謹慎使用吧。',
      buttonLabel:    '回到主畫面',
      buttonLine:     '期待你的表現。',
    },
  },

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
   *  立繪檔名規約：角色_變體_CI（例 Saint_TR_CI／Saint_UG_CI／Saint_GT_CI／GunWitch_Boss_CI）。
   * ------------------------------------------------------------------ */
  enemies: {
    faceless: {
      name:'地下聖徒_A',        // UI 只顯示底線前的「地下聖徒」；底線後（_A）僅供作者辨識、不顯示
      image:'enemy_faceless',   // 立繪鑰匙（見最下方 ASSETS）
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
    // ── 教學專用敵：訓練用聖徒（僅教學戰載入，不進 lineup）──
    //    tutorial.enemyKey 指到這筆；戰鬥數值大多被教學規則覆寫
    //    （攻擊一律 tutorial.enemyAtkDamage=2、總血 tutorial.enemyHp=500），
    //    hp/attack 仍填保底值。立繪：Saint_TR_CI。
    trainee: {
      name:'訓練用聖徒',
      image:'enemy_trainee',    // → resources/enemy/Saint_TR_CI.png
      hp:500,
      attack:45,
      atkInterval:null,         // 沿用 tuning.chargeSeconds
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      special:[],
      boardGrids:[9,9,16,16,16],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    // ── 連戰第二隻（局內序列第二敵）：巨型聖徒。完全獨立一筆，非沿用 faceless。 ──
    //    非 Boss（不填 ult/delayPenalty/wrongPenalty → 普通怪走預設：單發大絕、無半傷減時）。
    //    差異：血更厚（300）＋攻擊更密（蓄力 4×1/1.2≈3.33s）；單擊傷害同一般值。
    facelessgiant: {
      name:'巨型聖徒',
      image:'enemy_facelessgiant',   // 內嵌立繪鑰匙 → resources/enemy/Saint_GT_CI.webp
      // 取景：主體在圖面右下（撲擊構圖），cover 裁切錨點右移下移——爪/頭/軀幹全入鏡
      fit:{ pos:'62% 78%' },
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
      image:'enemy_witch',      // 立繪鑰匙（附圖）
      hp:500,
      attack:45,                // 大絕單點傷害（同一般怪基準）
      atkInterval:null,         // 大絕蓄力窗口（紅圈縮放時間）；null＝沿用 tuning.chargeSeconds
      // Boss 攻擊音：大絕＝左輪 EM_Revolver；延時＝槍聲 EM_Shot；按錯＝匕首 EM_Dagger。
      sound:{ ult:'em_revolver', delay:'em_shot', wrong:'em_dagger' },
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
        ult:{   type:'bullet', count:1, pos:'random', scale:1.6 },   // 大絕 → 一顆大彈痕（1.6 倍）
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
    // ── Boss 戰 S 級獎勵（銭湯インストール）──
    //   兩段式：按下「再度執槍」→ 原地變身金色呼吸光「SAINT INSTALL...?」→ 再按進獎勵畫面：
    //   全圖 + 左上角扁額毛筆字（逐字寫出）→ 寫完ツケ板（拍子木）兩聲。
    reward: {
      image:'bg_sentou',                       // 獎勵大圖（ASSETS 鑰匙）
      btnLabel:'SAINT INSTALL...?',            // 變身後按鈕字樣
      sign:['銭湯','インストール'],             // 毛筆招牌：橫排兩行（左上角木框額）
      charMs:380,                              // 每字書寫間隔(ms)
    },
  },

  /* ------------------------------------------------------------------ *
   *  五、數值總表（TUNING）— 對應說明書 §16 速查表
   *  想調手感就改這裡的數字，改完存檔重開即可。
   * ------------------------------------------------------------------ */
  tuning: {
    // 全域主音量（0~1）：所有 SFX/合成音/BGM 統一縮放（0.7 仍過大 → 再取其 70%＝0.49）。
    //   main.js 開機時經 SFX.setMasterVolume 套用；個別平衡仍走 sfxGain/bgmVol/partnerSeGain。
    masterVolume:        0.49,

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
    // 照順序點的獎勵倍率：overkill 本身免順序（點到未消格就算命中），但若仍照數字順序
    //   接下去點，該擊傷害（＝overkill 點數，敵已死時傷害 1:1 進 overkill）×此值。
    //   1＝關閉獎勵。順序斷掉不罰，只是回到 1 倍；之後接回順序即可再拿獎勵。
    overkillOrderMult:   2,
    // 搭檔演出 SE 播放增益：母帶已重 master 至 RMS −11 dBFS（v2），播放端不再增幅；
    //   個別仍嫌大/小聲時微調這裡即可（>1 增幅、<1 衰減）
    //   vo_* 四支（技能 SE）：對齊 Luna 聖徒化語音的有效響度（RMS −14.4 dBFS）——
    //   依各檔母帶 RMS 差多少補多少，峰值略超滿刻度交給 SFX 匯流 limiter 軟接（不破音）。
    /* ══ 語音鏈（VO，ver -250）══
       只有語音走這一條（SFX.playVoice → audio.js 的 voiceChain），音效與音樂不走。

       為什麼要有：**耳機對了不代表手機對了**。手機單體 600 Hz 以下幾乎不發聲，
       而這幾支語音母帶有 45~92% 的能量落在 150~500 Hz。實測（tools/audio_probe.html）
       整層在耳機上齊平（落差 0.0 dB），到手機上卻散開成 9.7 dB：
         vo_luna_dualwield  −18.0（耳機）→ −25.2（手機）  92% 能量在 150~500 Hz
         vo_malzeno_hcrounds −18.0        → −22.3
       兩支都掉到音效層（−22）以下 —— 被槍聲蓋掉，聽起來就是「糊」。

       eq   切掉手機放不出來的低頻、壓渾濁段（低棚而不是戳一個點）、抬子音。
            存在/渾濁比因此從 −8~−21 dB 拉到 +1~−10 dB。
       comp ⚠ 不是為了更大聲，是為了**不要去踩 SFX 匯流的 limiter**
            （threshold −6／ratio 12／release 120ms）。峰值一過門檻整句被壓住
            120ms，那個 pumping 本身就是悶與糊。

       ⚠ **沒有收尾的 limiter 一節，而且不要加**：Chrome 的 DynamicsCompressor
         內建自動補償增益（跟 threshold 與 ratio 綁在一起），所以再串一顆
         「限幅器」的結果是**整體變大聲、峰值反而更高**。實測把 lim 的門檻從
         −1 降到 −4（照直覺應該壓更多），整層反而從 −17.9 變成 −16.0 LUFS、
         最高峰從 +1.4 升到 +2.6 dBFS。補償後仍過頭的那兩支（+0.5／+1.4）交給
         匯流 limiter 接就好 —— 那本來就是它的工作，而且只作用在瞬態。
       ⚠ 改這裡就要同步 tools/audio_probe.html 的 VO_EQ／VO_COMP，否則量到的
         不是實際播出的東西。 */
    voiceChain: {
      eq:   [ ['highpass', 130, 0.707,  0],
              ['lowshelf', 500, 0.707, -5],
              ['peaking', 3000, 1.00,  +4] ],
      comp: { threshold:-26, knee:14, ratio:4, attack:0.005, release:0.12 },
    },

    /* 語音層（VO）—— 目標 −18 LUFS。se_luna_mb 是音效不是語音，已移到 sfxGain。
       ⚠ 增益是**過完語音鏈之後**量出來反推的，不是母帶的數字 —— 動 voiceChain
         就要整排重算（tools/audio_probe.html 會直接印出建議值）。
       ⚠ 對的是「耳機與手機的**平均**響度」，不是只對其中一邊：只對手機的話，
         低頻重的那幾支在耳機上會突出 4~7 dB，反而把原本對的耳機平衡打壞。
         取平均後兩邊的殘差各自減半（耳機 3.3 dB／手機 3.3 dB，原本是 0.0／9.7）。 */
    partnerSeGain: { se_luna_dual:1.85, se_luna_exc:1.27, se_luna_obe:1.47,
                     voice_saint_luna:1.69,
                     vo_life_return:4.67, vo_death_guard:1.97,
                     vo_supply_refill:2.84, vo_hc_rounds:3.32 },

    /* ══ 全域響度分級（ver -243 重訂）══
       量測法：BS.1770 K 加權 + 閘控積分響度（近似 LUFS）—— 不是單純 RMS，
       RMS 會低估人聲、高估低頻，正是舊表把槍聲調得比語音還大的原因。

       三層目標（業界慣例：對白當錨，音效低 3~6 dB，音樂低 8~12 dB）：
         語音 VO  −18 LUFS   基準
         音效 SE  −22 LUFS   −4 dB
         音樂 BGM −28 LUFS   −10 dB
       以音效為 100%：語音 158%、音效 100%、音樂 50%。

       ⚠ 舊表是**反的**：音效最大聲的 se_mg_squall／em_shot 實測 −15.9 LUFS，
         比語音最大聲的 vo_death_guard（−16.5）還響，而且音效層內部落差 28 dB
         （−15.9 ~ −43.9）—— 那就是「有些聲音特別大」的來源。
       ⚠ 每個值都是實測反推：gain = 10^((目標 − 實測 LUFS)/20) ÷ masterVolume。
         要加新音檔就照這條算，不要憑感覺填。
       ⚠ 除以 masterVolume 是因為 SFX 匯流會再乘一次 master；BGM 走
         HTMLAudio.volume 不吃 master，所以 bgmVol 不用除。 */
    sfxGain: { se_pistol_01:0.47, se_pistol_02:0.77, se_pistol_03:1.36,
               se_mg_squall:0.65, se_shotgun_blast:0.39, se_sniper_falcon:0.82,
               se_guard:0.78, sfx_reload:0.92, sfx_start:1.04,
               se_general_click:4.31, se_pageflip:1.93,   // 母帶偏小聲，之前幾乎聽不到
               sfx_startbt:2.02, sfx_saint:1.01, se_luna_mb:0.80,
               em_slash:0.46, em_smack:0.72, em_shot:0.65, em_revolver:0.51, em_dagger:2.54 },

    /* 音樂層（BGM）—— 目標 −28 LUFS，比語音低 10 dB。走 HTMLAudio.volume，
       不吃 masterVolume，所以這裡不用除。飛行頁的音樂另在 flight/index.html
       的 BGM_VOL 同步（同一個目標）。 */
    bgmVol: { default:0.20, bgm_home:0.37, bgm_battle:0.17, bgm_boss:0.12,
              bgm_result:0.20, bgm_lose:0.35 },

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
  enemy_faceless: "resources/enemy/Saint_UG_CI.jpg",   // 地下聖徒（UG=underground）
  cutin_saint:    "resources/partner/Luna_CI_saint.jpg",   // 聖徒化 cut-in 暫代圖
  partner_twin:   "resources/partner/Luna_SI_01.jpg",   // 雙槍修女立繪（暫用 cut-in 圖）
  inspector_freya: "resources/inspector/Freya_SI_01.webp",
  enemy_witch:    "resources/enemy/GunWitch_Boss_CI.jpg",   // 槍之魔女（Boss）內嵌立繪
  enemy_facelessgiant: "resources/enemy/Saint_GT_CI.webp",   // 連戰第二隻：巨型聖徒（GT=giant）
  enemy_trainee:  "resources/enemy/Saint_TR_CI.webp",   // 教學專用敵：訓練用聖徒

  // ── 五張 cut-in 圖（v17.7 嵌入）──
  cutin_saint_luna: "resources/partner/Luna_CI_advent.jpg",   // 聖徒化降臨 cut-in（Luna）
  voice_saint_luna: "resources/audio/vo/vo_luna_saintinstall.m4a",       // 聖徒化發動語音（Luna，1.7s；與 sfx_saint 疊播）
  cutin_exc: "resources/partner/Luna_CI_exc.webp",   // 處決 EXSECUTIŌ cut-in（Luna）
  cutin_obe: "resources/partner/Luna_CI_obe.jpg",   // O.B.E. cut-in（Luna）
  cutin_mb: "resources/partner/Luna_CI_maxburst.jpg",   // Maximum Burst cut-in（Luna）
  cutin_guard: "resources/partner/Renee_CI_pas.jpg",   // 即死防禦 cut-in（蕾妮/Renee·被動；檔名 _pas＝passive）
  cutin_return: "resources/partner/Renee_CI_act.jpg",   // 生命歸還 cut-in（蕾妮/Renee·主動；檔名 _act＝active）
  cutin_malzeno_act: "resources/partner/Malzeno_CI_act.webp",   // 前線補給 cut-in（馬季諾·主動）
  cutin_malzeno_pas: "resources/partner/Malzeno_CI_pas.webp",   // 高裝藥彈 cut-in（馬季諾·被動；正式圖）

  // ── 搭檔選人畫面大立繪 ──
  partner_renee:   "resources/partner/Renee_SI_01.webp",     // 蕾妮 立繪
  partner_malzeno: "resources/partner/Malzeno_SI_01.webp",   // 馬季諾 立繪
  cutin_boss: "resources/enemy/Belinda_CI_boss.jpg",   // v18d：Boss（貝琳妲）遭遇 cut-in 專屬圖
  bg_sentou: "resources/background/SENTOUINSTALL.webp", // Boss 戰 S 級獎勵畫面（銭湯インストール）

  // ── 副武器圖（換裝選單縮圖）：鑰匙對應 weapons.image；檔名＝類型_武器名 ──
  weapon_mg_squall:     "resources/weapon/MG_Squall.webp",       // 重機槍 Squall
  weapon_shotgun_blast: "resources/weapon/Shotgun_Blast.webp",   // 散彈槍 Blast
  weapon_sniper_falcon: "resources/weapon/Sniper_Falcon.webp",   // 狙擊槍 Falcon

  /* ── 音效 / BGM / 語音（預留槽）───────────────────────────────────────────
   *  目前 audio.js 為 no-op 骨架（合成音尚未搬回），這裡先掛 null 佔位；
   *  日後填 base64 或路徑（建議 resources/audio/{sfx,bgm,voice}/…）即可，
   *  程式 asset(key) 已相容 null→""，故未填不會壞。
   *  命名慣例：SFX＝SE_… ／ BGM＝BGM_… ／ 語音＝VO_…（鑰匙小寫、檔名保留大小寫）  */

  /* ══ 音訊：resources/audio/{bgm,se,vo} ══
     命名規則（一看就知道是什麼，不用翻這份檔）：
       bgm_<場合>            背景音樂，場合＝它在哪一頁／哪個狀態播
       se_<分類>_<名稱>    音效，分類＝ui／weapon／enemy／saint／flight
       vo_<角色>_<技能>    語音，技能用正式名稱
     ⚠ 舊名的病灶是「看不出用途」：Renee_VC_Act / _Pas 要翻這份檔才知道
       哪個是生命歸還、哪個是即死防禦；Battle_01 / BOSS_01 的 _01 不代表任何意思；
       Start_01（出陣）與 StartBT_SE（神楽鈴）兩個都叫 start 却是不同的東西。
       新名一律用**用途**當主詞，不用來源或流水號。
     ⚠ 底線開頭的三個資料夾**不會被遊戲載入**：
       _master＝BGM 母帶（.m4a 由它們轉出），_unused＝目前沒接線的，
       _raw＝還沒處理的素材下載。
     ⚠ 搬檔與改名走 tools/audio_reorg.py，別手改 —— 它會一併改寫
       config.js 與 flight/index.html 兩邊的路徑，手改很容易漏掉後者。 */
  // 反擊武器音效（所有副武器各一支；鑰匙對應 weapons.sound）。
  se_mg_squall:      "resources/audio/se/se_weapon_mg_squall.mp3",       // 重機槍 反擊（連續感：整支播一次）
  se_shotgun_blast:  "resources/audio/se/se_weapon_shotgun_blast.mp3",   // 散彈槍 反擊（一次一發）
  se_sniper_falcon:  "resources/audio/se/se_weapon_sniper_falcon.mp3",   // 狙擊槍 反擊（單發）

  // 清盤換彈音（盤面清空、顯示 RELOADING 時播）
  sfx_reload:        "resources/audio/se/se_weapon_reload.mp3",

  // 開始遊戲 stinger（點下開始瞬間，蓋過 BGM 切歌的淡出/進入前段）
  sfx_start:         "resources/audio/se/se_ui_sortie.mp3",
  sfx_startbt:       "resources/audio/se/se_ui_kagurabell.mp3",   // 出陣鈕/overkill/Boss S 第一按（神楽鈴）
  // 通用 UI 音：所有未指定音效的按鈕（bindBtn/menuClick 統一出口）／搭檔選人換卡翻頁
  se_general_click:  "resources/audio/se/se_ui_click.mp3",
  se_pageflip:       "resources/audio/se/se_ui_pageflip.mp3",
  // 聖徒化發動音效
  //  ⚠ 素材「內容」更新但檔名不變時,在路徑加/升 ?v=N 強制手機重抓(HTTP 快取以 URL 為鍵)。
  sfx_saint:         "resources/audio/se/se_saint_install.mp3?v=3",

  // 完美防禦（完防）合成替代音（一般武器；散彈完防維持自己的槍聲）
  se_guard:          "resources/audio/se/se_weapon_guard.m4a",

  // 搭檔演出 SE（Luna）：發動/結局 cut-in 同步播。放 resources/partner/。
  //  v2：母帶重 master（RMS −28→−11 dBFS + 軟限幅），內容更新 → 升 ?v 強制重抓
  // v3：改「原始檔＋純線性增益到峰值 -1dB」重製（v2 的 tanh 軟限幅有飽和失真=聽感糊）。
  //     RMS 約 -14 dBFS；再大聲改 tuning.partnerSeGain（播放端有 limiter 匯流，不會破音）。
  //  ⚠ 檔名的 VC＝voice（語音），與純音效的 SE 分家：這四支是搭檔的台詞，
  //     響度基準跟語音走（partnerSeGain 對齊 −14.4 dBFS），不是音效層。
  se_luna_dual:      "resources/audio/vo/vo_luna_dualwield.wav?v=3",   // 雙槍破防發動
  se_luna_exc:       "resources/audio/vo/vo_luna_execution.wav?v=3",    // 處決 EXSECUTIŌ cut-in
  se_luna_mb:        "resources/audio/se/se_saint_maxburst.wav?v=3",     // Maximum Burst cut-in
  se_luna_obe:       "resources/audio/vo/vo_luna_obe.wav?v=3",    // O.B.E. cut-in

  // 敵人攻擊音（依攻擊種類 kind：ult 大絕命中/不完美防禦格擋、delay 太慢、wrong 按錯）。
  em_slash:          "resources/audio/se/se_enemy_slash.m4a",    // 聖徒：大絕/不完美防禦/按錯
  em_smack:          "resources/audio/se/se_enemy_smack.m4a",    // 聖徒：延時懲罰
  em_shot:           "resources/audio/se/se_enemy_shot.mp3",     // Boss：延時懲罰
  em_revolver:       "resources/audio/se/se_enemy_revolver.mp3", // Boss：大絕/不完美防禦（左輪）
  em_dagger:         "resources/audio/se/se_enemy_dagger.m4a",   // Boss：按錯

  // 普攻槍聲（手槍；每次正確點擊由這兩支隨機播一支，製造變化）
  se_pistol_01:      "resources/audio/se/se_weapon_pistol_01.mp3",
  se_pistol_02:      "resources/audio/se/se_weapon_pistol_02.mp3",
  se_pistol_03:      "resources/audio/se/se_weapon_pistol_03.wav",  // 普攻槍聲（現行）

  // BGM（loop、不可交疊，切歌時前一首淡出）。
  //  BGM 一律 .m4a（AAC-LC 96k，自 128k MP3 轉檔，體積 −24%）：全平台原生支援；
  //  .mp3 母帶在 resources/audio/bgm/_master/，需要重轉時用 ffmpeg -c:a aac -b:a 96k。
  bgm_home:      "resources/audio/bgm/bgm_mainmenu.m4a",       // 主選單（含次要選單）
  bgm_battle:    "resources/audio/bgm/bgm_battle.m4a",      // 戰鬥（驅逐開始插入瞬間起播）
  bgm_lose:      "resources/audio/bgm/bgm_missionfailed.m4a", // 任務失敗（驅逐失敗插入起播）
  bgm_result:    "resources/audio/bgm/bgm_result.m4a",      // 結算（驅逐完成頁被點掉後起播）
  bgm_boss:      "resources/audio/bgm/bgm_boss.m4a",        // Boss 戰（點下迎擊起播）
  bgm_intruder:  null,   // （無獨立亂入曲；亂入＝Boss，走 bgm_boss）

  // 語音（每個 cut-in 各一支；檔名 VO_<情境>）
  vo_saint_install: null,   // 聖徒化降臨（SAINT INSTALL）→ VO_SaintInstall
  vo_maxburst:      null,   // Maximum Burst            → VO_MaxBurst
  vo_exsectio:      null,   // EXSECUTIŌ（處決）         → VO_Exsectio
  vo_obe:           null,   // O.B.E.                   → VO_OBE
  vo_life_return:   "resources/audio/vo/vo_renee_lifereturn.wav",     // 生命歸還（蕾妮·主動）— partner.lifeReturn 播
  vo_death_guard:   "resources/audio/vo/vo_renee_deathguard.wav",     // 即死防禦（蕾妮·被動）— partner.tryDeathGuard 播
  vo_supply_refill: "resources/audio/vo/vo_malzeno_supplyrefill.wav",   // 前線補給（馬季諾·主動）— partner.supplyRefill 播
  vo_hc_rounds:     "resources/audio/vo/vo_malzeno_hcrounds.wav",   // 高裝藥彈（馬季諾·被動）— partner.checkLowHpBuff 播
  vo_dual_wield:    null,   // 雙槍破防                 → VO_DualWield
  vo_new_hustle:    null,   // Boss 遭遇 / 亂入          → VO_NewHustle
};

/* ---- 小工具：從 ASSETS 取素材（找不到回傳空字串，不會壞）---- */
export function asset(key){ return (key && ASSETS[key] != null) ? ASSETS[key] : ""; }

/* ---- 小工具：BGM 逐曲音量（tuning.bgmVol；未列入的曲用 default）---- */
export function bgmVol(key){
  const m = GAME_CONFIG.tuning.bgmVol || {};
  return m[key] != null ? m[key] : (m.default != null ? m.default : 0.7);
}

/* ---- 小工具：檔案 SFX 逐鍵增益（tuning.sfxGain；未列入＝1）---- */
export function sfxGain(key){
  const m = GAME_CONFIG.tuning.sfxGain || {};
  return m[key] != null ? m[key] : 1;
}

/* ---- 遙測後端（零維運，Supabase REST）----
 * 玩家行為統計（來訪/挑戰/用時/配裝/原作點擊），上報端 telemetry.js、後台頁 stats.html
 * 都讀這一組設定。兩值未填時全部靜默停用（不發任何請求）。
 * 設定步驟：Supabase 建免費專案 → SQL Editor 跑 stats.html 頁尾註解的建表 SQL →
 * 把 Project URL 與 anon public key 填進來即生效（公開匿名寫入/讀取，不做防作弊）。 */
export const TELEMETRY = {
  url: 'https://yirmivtawwyhkftnaxbb.supabase.co',
  anonKey: 'sb_publishable_WRTo91T8Y4RIBULuIPWrRw_dXrVdQGb',   // 公開金鑰（publishable，本來就設計為前端可見）
};

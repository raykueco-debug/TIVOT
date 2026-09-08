/* ============================================================================
 *  script/enemies.js — 敵人資訊標準卡（唯一資料來源，ver -794 由 config.js 抽出）
 *  ---------------------------------------------------------------------------
 *  原本住在 config.js 的 GAME_CONFIG.enemies；為了方便單獨編修怪物數值抽成獨立檔
 *  （Ray 指定）。config.js 頂部 `import { ENEMIES }` 後照舊掛成 `enemies: ENEMIES`，
 *  所有讀取端（modules/enemy.js·combat.js·inspector.js 的 `GAME_CONFIG.enemies[key]`）
 *  一律不變。
 *  ⚠ 純資料檔，不 import 任何東西（不會與 config 成環）；`image`/`sound`/`entrance`
 *    這些是字串鑰匙，執行期才由 config 的 `asset()`／ASSETS 解析。
 *  ⚠ 大地圖的**刷新規則**（稀有度/登場 stage/陸域限定）不在這裡，在
 *    flight/index.html 的 ENEMY_KINDS（兩邊註解互指）。
 * ========================================================================== */
export const ENEMIES = {
    /* ⚠⚠ 敵人卡的兩個統一欄位（ver -495，Ray 指定「敵人卡統一加上」）：
       `story`         ＝ 這一隻的場次是不是**劇情戰**（1/0）。發起端明確宣告的
                         （飛行交棒的 `scripted`）優先；沒宣告（城鎮／腳本插入戰）
                         才讀卡上這一格。判定只有一處：combat.startGame →
                         `state.storyBattle`（§6.5.2，ver -493）。
       `counterStagger`＝ **反擊硬直**（1/0，Ray：「預設為 1，0 的話就算被反擊
                         延時計時也不會歸零」）：被反擊（weaponCounter 真的開火）
                         時延時懲罰計時歸零。判定在 defense 的 staggerOnCounter。
       兩格**每張卡都要寫**（統一），程式端沒寫時的預設：story 走發起端／true、
       counterStagger＝1。 */
    faceless: {
      name:'地下聖徒_A',        // UI 只顯示底線前的「地下聖徒」；底線後（_A）僅供作者辨識、不顯示
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      /* 聖徒系列的結算副標是「已擊殺」（ver -432，Ray 指定）。⚠ 對照表在 i18n 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。三種聖徒同一類。 */
      kind:'slay',
      image:'enemy_faceless',   // 立繪鑰匙（見最下方 ASSETS）
      hp:200,          // 連戰第一隻（原測試值 500，v-lineup 調 200）
      attack:45,       // 大絕一擊傷害（原 ASSAULT_DAMAGE）
      atkInterval:null,// 大絕蓄力秒數；null＝沿用 tuning.chargeSeconds（逐怪可覆寫）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      // 攻擊音（依 kind：ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。鑰匙對應 ASSETS。
      /* 延時懲罰 5 秒（ver -458，Ray：「除了槍之魔女以外的敵人都先預設 5 秒」）。 */
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],      // 特殊行動預留（本版不實作邏輯，僅保留結構）
      // v16：每盤格數手動覆寫（index 對應第幾盤，0-based；null／缺項＝用預設規則：第三盤起 16 格）。
      //      作者日後可逐怪逐盤填數值微調難度，例：[9,9,16,16,20]。聖徒化 25 宮格不受此影響。
      boardGrids:[9,9,9,9,9],
      // v17.2：受擊特效三件套（delay＝延時懲罰／wrong＝按錯懲罰／ult＝大絕）。逐怪可各自設定。
      //   type 可用：'claw'（爪痕，可設 count 幾道）／'blood'（血痕）／'bite'（齒痕）／
      //             'bullet'（彈痕/玻璃碎裂）／'slash'（紅刀痕濺血）。
      hitFx:{
        delay:{ type:'blood', angle:'random' },   // 延時懲罰 → 一道血痕、角度隨機
        wrong:{ type:'slash' },                    // 按錯懲罰 → 一條紅刀痕濺血
        assault:{   type:'bite' },   // 攻擊（一般圈）→ 牙印（ver -762，Ray：「地下聖徒跟巨型聖徒的攻擊都換成牙印」）
      },
    },
    // ── 教學專用敵：訓練用聖徒（僅教學戰載入，不進 lineup）──
    //    tutorial.enemyKey 指到這筆；戰鬥數值大多被教學規則覆寫
    //    （攻擊一律 tutorial.enemyAtkDamage=2、總血 tutorial.enemyHp=500），
    //    hp/attack 仍填保底值。立繪：Saint_TR_CI。
    trainee: {
      name:'訓練用聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_trainee',    // → resources/enemy/Saint_TR_CI.webp
      hp:500,
      attack:45,
      atkInterval:null,         // 沿用 tuning.chargeSeconds
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      delayPenalty:{ seconds:5 },   // 5 秒（ver -458，非魔女的預設）
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ══ 固定立靶（ver -396，Ray 交件 `Dart_timeattack`）══
       打靶場的**計時挑戰**用靶。⚠ 它不是「弱到打不痛人」的怪 —— 它**根本不攻擊**：
       那件事由戰鬥卡的 `timeAttack` 關掉整條攻擊路徑（見 config.battles.range_trainee），
       不是靠把 `attack` 調成 0（調成 0 的話大絕紅點、延時懲罰、蓄力槽照樣會演）。
       ⚠ `attack` 仍留一個值只是為了資料完整；沒有任何一條路會讀到它。 */
    dart_target: {
      name:'固定立靶',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      /* 結算副標的用詞（ver -432，Ray：「『靶』為已擊破」）。⚠ 對照表在 `i18n` 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。 */
      kind:'target',
      image:'enemy_dart_target',     // → resources/enemy/Dart_timeattack.webp
      hp:300,                        // Ray 指定
      attack:0,
      atkInterval:null,
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        /* ⚠ 沙袋靶不噴血：受擊只有**碎屑**（沿用 slash 的刀痕當彈著），
           大絕與延時的特效根本不會演到（它不攻擊）。 */
        delay:{ type:'slash' },
        wrong:{ type:'slash' },
        assault:{   type:'slash' },
      },
    },
    /* ══ 蕃茄人11號（ver -858，Ray：杰羅的自動人型靶）══ 同固定立靶（圖用
       Ray 交件的 Dart_counter，ver -862），但**會攻擊**：戰鬥卡 timeAttack.assaultOn 放行排程
       （assaultEvery 3 秒一發），被打中＝碼表 +3 秒（combat.enemyAttack 的
       hitPenaltySec 分支）—— 不扣血，罰的是時間。 */
    sv_dart: {
      name:'蕃茄人11號',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },
      openAssault:[2,3],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      kind:'target',
      image:'enemy_dart_counter',    // 蕃茄人11號自己的圖（ver -862，Ray 交件 Dart_counter.webp）
      hp:300,
      attack:1,                      // 不會真的扣到血（timeAttack 擋在 enemyAttack）
      atkInterval:null,
      assaultEvery:[3,3],                // Ray：「3 秒發動一次攻擊」
      assault:{ count:1, gap:0 },
      entrance:null, special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'slash' }, wrong:{ type:'slash' }, assault:{ type:'slash' } },
    },
    // ── 連戰第二隻（局內序列第二敵）：巨型聖徒。完全獨立一筆，非沿用 faceless。 ──
    //    非 Boss（不填 ult/delayPenalty/wrongPenalty → 普通怪走預設：單發大絕、無半傷減時）。
    //    差異：血更厚（300）＋攻擊更密（蓄力 4×1/1.2≈3.33s）；單擊傷害同一般值。
    facelessgiant: {
      name:'巨型聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_facelessgiant',   // 內嵌立繪鑰匙 → resources/enemy/Saint_GT_CI.webp
      // 取景：主體在圖面右下（撲擊構圖），cover 裁切錨點右移下移——爪/頭/軀幹全入鏡
      fit:{ pos:'62% 78%' },
      hp:300,                        // 血更厚
      attack:45,                     // 大絕單擊傷害（普通值；差異在密度不在單擊）
      atkInterval:3.33,              // 大絕蓄力秒數：4×(1/1.2)≈3.33 → 攻擊更密（比第一隻高 20%）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],     // ver -792：貝琳妲以外全 9 宮格（Ray 指定）
      hitFx:{                        // 自帶獨立三件套（巨型聖徒風味：大絕爪數加重為 4）
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },      // 按錯 → 紅刀痕濺血
        assault:{   type:'bite' },       // 攻擊（一般圈）→ 牙印（ver -762，同地下聖徒）
      },
    },
    /* ══ 森住民（man_sorana，ver -744，Ray 的卡：「數值用巨型聖徒，攻擊減半，
       延時快一秒。攻擊特效，延時同貝琳妲的 dagger，其他同巨型聖徒」）══════════
       ⚠ 巨型聖徒那一張**逐欄抄**、只動三格（鐵律：卡上寫絕對值就存絕對值）：
         attack 45→22（減半，取整——同娜塔莉那一次的取法）
         delayPenalty.seconds 5→4（延時快一秒）
         hitFx.delay／sound.delay → 貝琳妲的「dagger」語彙（slash 特效＋em_dagger 音）
       ⚠ `kind:'human'`：她是人，不吃降臨／淨化那一套，結算副標「已擊敗」。
       ⚠ 立繪暫用索菈娜的 SI（見 ASSETS enemy_man_sorana）—— 等 Ray 的戰鬥圖。 */
    man_sorana: {
      name:'森住民',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0.3], '萊福槍':[0,0.5] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:1, hp:40, count:2, atk:10, gap:0.4, cd:4 },   // 血 ≤40%：每 0.4 秒丟一顆、連丟 4 顆、每顆打 22、然後歇 4 秒
      /* ⚠ `atk:22` ＝她原本的一般攻擊力（ver -939 之前大絕的圈就是吃 `attack`）——
         寫出來只是把原行為明文化，不是調數值。要讓大絕更痛就改這一格。 */
      kind:'human',
      image:'enemy_man_sorana',
      entrance:'vo_sorana_pack2',   // 敵立繪一出現就播（ver -818，Ray）——她是 human 不吃降臨，另掛登場音
      fit:{ pos:'50% 30%' },   // ver -745 換上專用戰鬥圖；構圖不對再調這格
      hp:400,
      attack:15,                     // 巨型聖徒 45 的一半
      atkInterval:3.33,
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      /* ══ 大絕（ver -760，Ray 的敵攻四態實驗卡：「她 hp30% 以下時會同時出現
         四個攻擊圈」）══ hp 門檻＋具名行為（defense 的 ULT_ACTS）。
         ⚠ `noStack`＝一**波**清完才有下一波（不寫的話下一次排程會在殘圈上再疊
           四顆，實測疊到 8）—— 這是我補的節奏判斷，要改掉直接拔。 */
      noStack:true,
      delayPenalty:{ seconds:4 },    // 快一秒（巨型聖徒是 5）
      special:[],
      boardGrids:[9,9,9,9,16],
      hitFx:{
        delay:{ type:'dagger' },     // 貝琳妲的 dagger（slash 視覺＋匕首音，見 config.HITFX）
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:4, angle:'random' },
      },
    },
    /* ══ 禍魘娜塔莉（ver -671，Ray 交稿）══════════════════════════════════
       「數值與模式同巨型聖徒，攻擊力減半，HP900。」
       ⚠ 所以這張卡是**巨型聖徒那一張**逐欄抄過來、只動兩格 —— 不寫成
         「基礎 × 倍率」（鐵律：卡上寫絕對值就存絕對值，§6.5.2）。
       ⚠ `kind:'harm'` ＝禍魘：吃降臨與淨化那一套演出，結算副標是「已淨化」。 */
    nightmare_natalia: {
      name:'禍魘娜塔莉',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:1, hp:40, count:2, atk:12, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'harm',
      image:'enemy_natalia',         // → resources/enemy/mon_natalia.webp
      fit:{ pos:'50% 30%' },
      hp:700,                        // Ray 指定
      attack:22,                     // 巨型聖徒 45 的一半（減半，取整）
      atkInterval:3.33,              // 以下全部同巨型聖徒
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'claw', count:4, angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'bite', count:4, angle:'random' },
      },
    },
    // 亂入怪（無傷 45 秒內通關才會出現）— 先用同一隻怪測流程，正式再換
    intruderEnemy: {
      name:'亂入者 · ???',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      image:'enemy_faceless',
      hp:400,
      attack:50,
      atkInterval:null,
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],   // v16：每盤格數手動覆寫（同上，聖徒化不受影響）
      hitFx:{                        // 佔位卡的預設三件套（沿用地下聖徒風味；triggerIntruder 載入真正的怪會整組覆寫）
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'bite' },
      },
    },
    // ── 槍之魔女（Boss）v17：S 評價後遭遇的隱藏 Boss ──
    witch: {
      name:'槍之魔女',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0.3], '霰彈槍':[0,0.3], '萊福槍':[0,0.3] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:1, hp:20, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'human',                  // 槍之魔女是人類 → 已擊敗（ver -432，Ray 指定）
      image:'enemy_witch',      // 立繪鑰匙（附圖）
      hp:500,
      attack:45,                // 大絕單點傷害（同一般怪基準）
      atkInterval:null,         // 大絕蓄力窗口（紅圈縮放時間）；null＝沿用 tuning.chargeSeconds
      assaultEvery:[2,4],           // 一般攻擊的頻率 2~4 秒
      assault:{ count:2, gap:1 },   // 一般主動攻擊：一次先後出 2 顆、間隔 1 秒（Boss；ver -801 由舊 ult.shots/gapMs 轉）
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,16,16,16],
      delayPenalty:{ dmgScale:0.5, timeDelta:-1 },           // 延時懲罰：攻擊力為一般怪一半、時限減 1 秒
      // v17.2：受擊特效 —— 大絕/延時走彈痕（玻璃碎裂），按錯改紅刀痕濺血
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },   // 延時 → 彈痕＋槍聲（bullet→em_shot）
        wrong:{ type:'dagger' },                           // 按錯 → 紅刀痕＋匕首音（dagger）
        assault:{   type:'witch_revolver', count:1, pos:'random', scale:1.6 },   // 大絕 → 大彈痕＋左輪（專屬）
      },
    },
    /* ══ 賞金獵人（ver -375）══ 舊街區・賞金獵人公會那一場（劇情插入戰）。
       ⚠ 這一筆是「**敵人資訊標準卡**」的第一個實例（Ray 交稿的格式，見
         `script/SCRIPT_FORMAT.md` 的「敵人卡」一節）。卡上有的欄位這裡都要有，
         沒實作的（抗性/弱點）也**照樣寫進資料**、標明未實作 —— 資料先齊，
         程式後補；不要因為還沒做就把欄位丟掉（丟掉的下場是下次補做時沒人記得。）
       ══⚠⚠ 敵攻四態（ver -760，Ray 定案的卡格式）══
         · 延時＝`delayPenalty`　· 攻擊（一般圈）＝`atkInterval`/`assaultEvery` 排程出的
           蓄力圈　· 失誤（點錯）＝`wrongPenalty`
         · **大絕**＝`ult`，**每張卡都有這一格**（ver -939，Ray：「每張敵人卡都要有 ult
           選項，先設 01 開關，為 1 再設定發動條件血量低於 %、幾個圈、每個圈 atk 多少、
           每個圈隔多久、cd 多久」）：
             `ult:{ on:0, … }` ＝**關**（欄位留著，方便直接填了就開）
             `ult:{ on:1, hp:40, count:4, atk:20, gap:0.4, cd:4 }` ＝血 ≤40% 起，
               一波 4 顆、每顆隔 0.4 秒依次出現、**每顆打 20**、整波之間 CD 4 秒。
           ⚠⚠ 開關看 `on`**不看「有沒有填 hp」**：欄位每張卡都在，用「有沒有寫」判
             等於沒有開關（填了忘了開／關了沒清欄位，兩種都會變成看起來關著其實開著）。
           ⚠ `atk` 不填（或 0）＝退回這隻的一般攻擊力；`cd` 不填＝照常規頻率。
           ⚠ 舊路：`act:'ring4'` 這種具名行為 ——
           行為名對 defense 的 ULT_ACTS 那張表（資料寫不了函式，同 GATE_ACTIONS）；
           沒到門檻照常出一般圈。第一個實驗卡＝man_sorana（hp30% 同時四圈）。
       ══⚠⚠ 副武器調整 `weaponMod`（ver -760→-796 定案，Ray：「弱點跟抗性做一起、
         迴避也做進同一欄、逗點格開、先傷害後迴避、加%不是乘」）══
         **每張卡明列三類**（重機槍／霰彈槍／萊福槍），每把＝ **[傷害, 迴避]**，預設 [0,0]：
           `weaponMod:{ 重機槍:[0,0], 霰彈槍:[0,0], 萊福槍:[0,0] }`
         · **[0] 傷害**：反擊時該副武器的傷害調整——**正=增傷、負=抗性減傷**，加法
           （0.1＝+10%、−0.2＝−20%）。加進 combat.applyEnemyMods 的 k。
         · **[1] 迴避**：該副武器的額外 miss 率(0~1)，加法（0.1＝多 10% miss）；每一發
           反擊命中 ×(1−r)（weapon.weaponCounter 唯一讀點）。
           ⚠「全 miss 也清延時／主動攻擊」本來就成立：紅點收點在 resolveThreat、
             反擊硬直在 staggerOnCounter，兩者都不看打沒打中。
         ⚠ 與 `resist`／`weak`（依**傷害來源** basic/counter/dual/saint 的減/增傷）是
           **另一件事**，不要混用。 */
    /* ══⚠⚠ 北方泊地城鎮戰的雜怪 —— **四隻隨機出，一隻一張卡**（ver -596，Ray：
       「城鎮戰由這幾隻怪隨機出，數值都一樣，但是要各別做敵人卡方便我修改」）══
       四張卡現在的數值**完全一樣**（hp 300／attack 10／攻擊模式抄訓練用聖徒／
       攻擊力抄賞金獵人），分開寫是為了**日後各改各的** ——
       ⚠ 不要為了「省重複」把它們合成一張帶陣列的卡：那樣就回不去逐隻調整了，
         而逐隻可調正是 Ray 要這個形狀的理由（不是冗余）。
       ⚠ 抽哪一隻由**戰鬥卡**決定（`battles.np_harm.enemy` 是陣列，
         `combat.startGame` 開場抽一次）—— 不在這裡抽。
       ⚠ 名字暫時都叫「禍魘」（Ray 還沒給各自的名字）。
       ⚠ `bg`＋`fit.contain` 是去背立繪的必要配套；實戰時 `bg` 會被城鎮那一格的
         背景蓋掉（ver -592），留著是為了在別處單獨叫用時不會身後一片黑。 */
    np_candletower: {
      name:'禍魘祭司',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[-0.5,0], '萊福槍':[0.5,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_candletower',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:15,
      atkInterval:null,
      delayPenalty:{ seconds:6 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'blunt', },
      },
    },
    np_candlepenitent: {
      name:'罪之魔像',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,-0.2], '霰彈槍':[0.5,0], '萊福槍':[-0.5,-0.3] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[0.5,1.5],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_candlepenitent',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:250,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    np_coralman: {
      name:'魘魔',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,-0.2], '霰彈槍':[0.5,0], '萊福槍':[-0.5,-0.3] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_coralman',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:250,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    np_reassembled: {
      name:'心魘',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_reassembled',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:15,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ══ 教堂的 Boss（ver -586，Ray：「B2G01，教堂 boss 用這一隻，跟其他怪數值
       一樣就好」）══ 數值與那四隻雜怪 **完全相同**，差別只有三件事：
         · 立繪（祭壇獸）
         · `bg` 用教堂那一張 —— 打的地方就是那裡
         · `sessionEnd` 在**戰鬥卡**上（`battles.np_boss`）＝打贏它才閉棺、資源回滿
       ⚠ 名字沿用「禍魘」：Ray 還沒給它專屬的名字，不自己編。 */
    np_boss: {
      name:'背負祭壇者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[-0.1,0], '霰彈槍':[-0.5,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_boss',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:500,
      attack:20,
      atkInterval:null,
      delayPenalty:{ seconds:6 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blunt' },
        wrong:{ type:'blood', angle:'random' },
        assault:{   type:'blunt' },
      },
    },
    /* ══ 瓦礫中的紫黑之爪（ver -595，Ray 交稿）══ 教堂那一場之後的真 BOSS，
       也是**聖徒化教學戰**（腳本見 script/town.js 的 northport.church）。
       ⚠⚠ **圖已重繪成 1254×1254（1:1）**（ver -617，Ray 交件；規格見
         `resources/background/_boss_claw_spec.md`）—— 所以走回**滿版 cover**。
         ⚠ -616 曾經改 `contain`：那時的圖是 1536×1024（3:2），而 `#top` 幾乎正方
           （390×420 ＝ 0.93），cover 會把左右各裁掉約四分之一，而兩隻爪子正好
           在兩側。重繪時特地把爪往內收，正方畫幅下 cover 只切掉邊緣約 7%，
           構圖完整而且沒有上下黑邊 —— 這才是這張圖原本的呈現方式。
       ⚠ `bg`＝教堂留著：不是走城鎮那條路（單獨叫用）時的保底。
       ⚠ 數值先沿用禍魘那一張（Ray 還沒給這一隻的卡）—— 劇情殺的門檻（HP 30%）
         與教學的節奏由腳本那一側管，不是靠數值。 */
    np_claws: {
      name:'紫黑之爪',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      kind:'harm',
      image:'enemy_np_claws',
      bg:'Northport_church_BF',
      hp:500,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      boardGrids:[9,9,9,9,16],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ══ 夏爾村村內戰（ver -802，Ray 交稿）══════════════════════════════════
       索菈娜家那一夜之後、踏出家門的圍城戰（script/town.js 的 shinier.siege）。
       全部是**獸骸／魔獸**（kind:'harm' → 降臨/淨化特效、結算副標「已淨化」）。
       ⚠ 模板＝心魘（np_reassembled）：**武器命中與弱點武器（weaponMod）一律同心魘**
         （Ray 指定「武器命中跟弱點武器同心魘」），只有 hp/attack 依「上下 20%」變動。
       ⚠ 連接格（東/廣場/西/北）共用一張怪池卡 `sv_beast`（config.battles）——
         pickBattleEnemy 每格抽不重覆的一隻（同北泊 np_harm 的作法）。
       ⚠ bg 是**保底**：城鎮戰交棒時 battleBg 會用玩家站的那一格背景蓋掉它。 */
    /* ── 連接格怪池（心魘 ±20%，weaponMod 同心魘）── */
    sv_wolf_pack: {                       // 野外那格以外的怪之一：狼群（−20%）
      name:'狼骸群',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },   // ＝心魘（弱點/命中不動）
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_wolf_pack',
      bg:'Shinier_North',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,                             // 心魘 400 −20%
      attack:12,                          // 心魘 15 −20%
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    sv_beast_organ: {                     // 畸變野獸（器官外露，−5%）
      name:'裂肉獸',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_beast_organ',
      bg:'Shinier_North',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:380,                             // 心魘 −5%
      attack:14,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    sv_stag: {                            // 鹿魘（基準值）
      name:'鹿骸',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_stag',
      bg:'Shinier_North',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,                             // ＝心魘
      attack:15,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    sv_beast_shackle: {                   // 魔獸型（鐵環枷鎖長進肉裡，+10%）
      name:'枷獸',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_beast_shackle',
      bg:'Shinier_North',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,                             // 心魘 +10%
      attack:16,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ── 野外那格（圍城的**收尾格**，config.battles.sv_wild 的 sessionEnd）──
       Ray：「boss 放 nightmare bear，比其他怪強 20%」——weaponMod 仍同心魘，
       只有 hp/attack 是心魘 +20%（＝連接格怪池之上）。⚠ 圖目前仍是 .png（未去背轉
       webp，見 ASSETS 註）。 */
    sv_bear: {
      name:'熊骸',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },   // ＝心魘（弱點/命中不動）
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_bear',
      bg:'Shinier_Wilds',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:480,                             // 心魘 +20%（比連接格怪池強）
      /* ⚠ ver -943 補回來：-942 那一版這一格不見了（比對前後版本時抓到）——
         `enemy.setEnemy` 是 `state.ASSAULT_DAMAGE = en.attack`，沒有這一格
         就是 `undefined` → 傷害算出 NaN，而畫面上不會有錯誤訊息。
         值沿用被刪掉之前的 18；要改就改（Excel 上那一格也可以）。 */
      attack:18,
      atkInterval:null,
      delayPenalty:{ seconds:6 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ── 祭壇那格（「最硬的一般格」，數值同 np_boss；Ray 指定）──
       ⚠ weaponMod／hitFx 都**照 np_boss**（不是心魘）——「數值同 np_boss」。 */
    sv_reliquary: {
      name:'聖骨獸',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[-0.1,0], '霰彈槍':[-0.5,0], '萊福槍':[0,0] },   // ＝np_boss
      openAssault:[1,2],
      ult:{ on:1, hp:40, count:2, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_reliquary',
      bg:'Shinier_Altar',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:500,                             // ＝np_boss
      attack:20,
      atkInterval:null,
      delayPenalty:{ seconds:6 },         // ＝np_boss
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blunt' },
        wrong:{ type:'blood', angle:'random' },
        assault:{   type:'blunt' },
      },
    },
    guild_hunter: {
      name:'賞金獵人',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'human',                      // 結算副標「已擊敗」（ver -432）
      image:'enemy_guild_hunter',        // ＝ NPC_GuildHunter_SI_Attack（與對話立繪同一張）
      /* ⚠ `bg`＝**戰鬥背景**（ver -375 新欄位）。這一隻的立繪是**去背**的
         （對話用立繪借過來當戰鬥立繪），沒有背景的話身後是一片黑。
         ⚠ 有 `bg` 就一定要 `fit.mode:'contain'` —— 去背立繪用 cover 會被裁掉頭。 */
      bg:'Captal_Guild_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:200,
      /* 蓄力攻擊（大絕）：10 傷、大彈孔。⚠ 一般怪是 45 —— 這是個街頭鬧事的獵人，
         不是聖徒，數字低是刻意的。 */
      attack:10,
      atkInterval:null,                  // 沿用 tuning.chargeSeconds
      assaultEvery:[2,4],                 // 一般攻擊的頻率（秒）
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      entrance:null,                   // 登場音（卡上覆寫）；無則 null
      special:[],
      /* 盤面配置 `33344, loop`：3＝九宮格、4＝16 宮格；**loop**＝打完五盤還沒死就從頭再來
         （這一隻血厚 200、傷害低，是「耐力戰」的設計）。 */
      boardGrids:[9,9,9,9,9],
      boardLoop:true,
      /* 延時懲罰：**5 秒**、傷害 **5**、彈孔特效。
         ⚠ `seconds`/`damage` 是**絕對值**（ver -375 新欄位），與舊的 `dmgScale`/`timeDelta`
           縮放並存 —— 卡上寫的是絕對值，就照絕對值存（鐵律 1：不要在腦內換算成倍率）。 */
      delayPenalty:{ seconds:5, damage:5 },
      wrongPenalty:{ damage:5 },         // 點錯懲罰：傷害 5、鈍器受擊特效
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },          // 彈孔
        wrong:{ type:'blunt' },                                   // 鈍器
        assault:{   type:'bullet', count:1, pos:'random', scale:1.8 },// 大彈孔
      },
      /* ⚠ 抗性／弱點武器：**卡上有、程式還沒實作**。資料先照卡放著。 */
      /* 掉落物（固定掉，不擲骰）：黃銅彈殼 ×6。 */
      loot:[ { id:'brass_casing', n:6 } ],
      /* 金錢：**HP 的 6~8 成隨機**（卡上的寫法）。所以血越厚的怪給越多錢 ——
         這條規則寫在資料裡，程式只負責擲骰（鐵律 1）。 */
      money:{ hpRatio:[0.6, 0.8] },
    },
    /* ══ 巨型蜈蚣（ver -423，Ray 的敵人卡）══════════════════════════════
       第一場**船艦戰**的怪。卡上的每一欄都照抄成絕對值（鐵律 1／§6.5.2）。 */
    centipi: {
      name:'巨型蜈蚣',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:-0.2,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[2,0], '霰彈槍':[0.5,0], '萊福槍':[1,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:1, hp:40, count:2, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      /* ⚠ 「不疊加」＝場上同時只有一個紅點（見 defense.scheduleAssault 的 `noStack`）。 */
      /* ⚠⚠ **三張時段差分**（Ray：「上午下午用 Centipi_day，晚上用 night，
         黃昏黎明用 Centipi_dd」）。寫成 `{day,dd,night}` 三個槽，時段→槽的對應
         只有一處：`modules/enemy.js` 的 `enemyImage()`（鐵律 7）。 */
      image:{ day:'enemy_centipi_day', dd:'enemy_centipi_dd', night:'enemy_centipi_night' },
      /* ⚠⚠ `kind:'aerial'`＝**飛行敵人自成一類**（ver -869，Ray：「把飛行敵人跟
         一般敵人分開就好了，不要跑 harm，擊敗一樣寫淨化」）——
         結算副標照樣「已淨化」（i18n winSubBy.aerial）、降臨/淨化特效照樣吃
         （enemy.js 的 ENTRANCE_KINDS/PURIFY_KINDS 都含 aerial）。 */
      kind:'aerial',
      hp:500,
      /* 蓄力攻擊（紅點那一發）：傷害 20、**3~5 秒發動一次**、不疊加。
         ⚠ `atkInterval` 給**區間**（陣列）＝每次隨機；給數字＝固定（舊卡不受影響）。 */
      attack:20,
      /* ⚠⚠ 「3~5 秒發動一次」是**發動頻率**不是蓄力長度 —— 所以走 `assaultEvery`
         （＝`ASSAULT_MIN`/`ASSAULT_MAX`），不是 `atkInterval`（那是紅點給你幾秒反應）。
         兩個都叫「秒」但意思完全不同，混用會讓怪要嘛不打人、要嘛打不完。 */
      atkInterval:null,
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      noStack:true,
      entrance:'se_enemy_centipi',    // 登場音（ver -790，船戰各自獨立；蜈蚣＝自己的叫聲）
      special:[],
      /* 盤面配置 `33344, loop`：3＝九宮格、4＝16 宮格，打完五盤沒死就從頭再來。 */
      boardGrids:[9,9,9,9,16],
      boardLoop:true,
      /* 延時懲罰：**5 秒**（ver -458 由 4 調成非魔女的統一預設）、傷害 10、單爪特效。 */
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        assault:{   type:'centipi_claw', count:3, angle:'random' },   // 專屬：爪痕＋蜈蚣叫聲
      },
      /* ⚠⚠ **抗性／弱點／破防增傷**（ver -423 起真的生效，之前只是放著）：
         值是**加減成**，套在 `combat.enemyDamage` 那一個計算點上（鐵律 7）。
           resist.basic   普攻減傷 20%
           weak.counter   全反擊武器增傷 100%
           dualBonus      破防（雙槍窗口）增傷 20% */
      /* 反擊之後的兩件事（卡上分開寫，程式也分開讀）：
           counterBuff  反擊攻擊增益：普攻 ×2、持續 5 秒
           counterStun  反擊硬直：被反擊後 3 秒才發起下一次主動攻擊 */
      /* 掉落物：**各自擲骰**（Ray：「可能都掉，可能都不掉」）——
         `p` 是機率，沒寫＝必掉（舊卡不受影響）。 */
      loot:[ { id:'venom_fang',   n:1, p:0.10 },
             { id:'venom_claw',   n:1, p:0.33 },
             { id:'chitin_wing',  n:1, p:0.10 },
             { id:'chitin_shell', n:1, p:0.33 } ],
      /* 金錢：HP 的 120%~150%。 */
      money:{ hpRatio:[1.2, 1.5] },
    },
    /* ══ 羽蛇（ver -500，Ray 的敵人卡）══════════════════════════════════
       飛行限定的隨機敵（[場景：飛行][區域：全陸域][稀有等級：E]—— 那三格住在
       flight/index.html 的 ENEMY_KINDS.serpent：rarity/fromStage/landOnly，
       兩邊註解互指）。**stage2 的劇情之後才會加入隨機敵人**（fromStage:2）。
       ⚠ 卡上的「劇情」（好快！／廣域破片砲）在 battles.flight_serpent 的 talk；
         「戰鬥結束」那一段（Sturm／Deck_Chaos／著水）是 stage2 劇本的戲，
         觸發點與素材（Deck_Chaos）都還沒有 —— 等 Ray 的 stage2 稿再接。 */
    serpent: {
      name:'羽蛇_A',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:-0.2,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[1,0.3], '霰彈槍':[1.5,-0.5], '萊福槍':[1,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:1, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'aerial',               // 飛行敵人自成一類（ver -869，Ray）→ 副標照樣「已淨化」
      image:{ day:'enemy_serpent_day', dd:'enemy_serpent_dd', night:'enemy_serpent_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      assaultEvery:[2,4],              // 發動頻率 2~4 秒一次
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      noStack:true,                // 不疊加：場上同時只有一個紅點
      /* 降臨著地音（ver -745，Ray：「se 不放 se_saintintall 而是放羽蛇叫聲」）——
         禍魘的著地預設是 sfx_saint，這張卡覆寫成牠自己的吼叫（enemy.js 讀）。 */
      entrance:'se_enemy_serpent',
      special:[],
      boardGrids:[9,9,9,9,16],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 蓄力攻擊「毒牙特效」＝咬痕（bite）；延時單爪、點錯鈍器（同卡）。 */
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        assault:{   type:'serpent_bite' },   // 專屬：牙印＋羽蛇吼叫
      },
      /* 弱點：反擊武器 +100%、**散射武器（霰彈槍類）再 +150%**（Ray 的卡）——
         `cat:<武器類別>` 只對反擊傷害生效，判定在 combat.applyEnemyMods（唯一一處）。 */
      loot:[ { id:'venom_fang',    n:1, p:0.10 },
             { id:'azure_scale',   n:1, p:0.33 },
             { id:'azure_feather', n:1, p:0.33 } ],
      /* 金錢：HP 的 50%~70%。 */
      money:{ hpRatio:[0.5, 0.7] },
    },
    /* ══ 空賊船（ver -509，Ray 的敵人卡）══════════════════════════════════
       飛行限定隨機敵（[場景：飛行][區域：**薩梅爾空域外全域**][稀有等級：E]
       [Stage:1 以後才登場]—— 刷新規則在 flight 的 ENEMY_KINDS.pirate：
       rarity/fromStage/notRegion，兩邊註解互指）。
       ⚠ 為什麼不進薩梅爾（Ray 的設定）：**會被防空砲打下來** —— 故事需求，
         不是平衡參數；別因為「帝都附近打不到空賊」就把限制拿掉。
       ⚠ 卡上「攻擊音」那一段（serpent／em_smack）是範本殘留 —— 真正的音寫在
         各受擊行的 `se:`（延時＝艦砲 120mm、點錯＝手槍二、大絕＝se_weapon_cannon），
         照那三個入表。 */
    pirate_ship: {
      name:'空賊船_A',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      Ganymede:-0.2,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.7,0], '霰彈槍':[0.7,0], '萊福槍':[1.5,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openAssault:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },   // 大絕：on=1 才啟用（見檔頭格式說明）
      kind:'ship',                 // 船隻 → 已擊沉
      image:{ day:'enemy_pirate_day', dd:'enemy_pirate_dd', night:'enemy_pirate_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      assaultEvery:[2,4],              // 發動頻率 2~4 秒一次
      assault:{ count:1, gap:0 },   // 一般主動攻擊：一波幾顆、每顆間隔秒
      noStack:true,                // 不疊加：場上同時只有一個紅點
      entrance:'se_weapon_cannon',   // 登場音（ver -790，船戰各自獨立；空賊船＝艦砲）
      special:[],
      boardGrids:[9,9,9,9,16],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 延時／點錯都是彈孔（牠是用砲跟槍招呼你的）；大絕＝**特大彈孔＋畫面閃紅**
         （`flash:'red'`，ver -509 新演出，實作在 enemy.showHitFx）。 */
      hitFx:{
        delay:{ type:'pirate_shipcannon', count:1, pos:'random' },   // 專屬：艦砲（延時）
        wrong:{ type:'pirate_sniper', count:1, pos:'random' },       // 專屬：狙擊（按錯）
        assault:{   type:'pirate_cannon', count:1, pos:'random', scale:2.4, flash:'red' },   // 專屬：艦砲（大絕）
      },
      /* 弱點：反擊 +100%、**單射武器（萊福槍類）再 +150%**（`cat:` 只對反擊生效，
         判定在 combat.applyEnemyMods，同羽蛇卡）。 */
      loot:[ { id:'brass_casing', n:1, p:0.33 } ],
      /* 金錢：HP 的 70%~90%。 */
      money:{ hpRatio:[0.7, 0.9] },
    },
    /* ══ 夏爾森林的野生怪（ver -862，Ray 交卡的 F 表）══════════════════════
       刷怪規則在 script/town.js 的 `shinier_forest.wildSpawn`（出怪率 25%/地點、
       一趟不重複、必出格），實作只有 modules/town.js 的 `wildActDue` 一支（鐵律 8）。
       · **健全猛獸**（kind:'beast' → 結算「已獵殺」，無降臨/淨化特效）：
         山貓/水蛇/山豬/虎王/鴉群/鹿主 —— hp 是 Ray 的表，⚠ **attack 是暫定**
         （Ray 沒給，照 sv 系列的 hp:attack 比例估）。
       · **骸系（禍魘，kind:'harm'）**：熊骸/鹿骸的日夜差分（日晨＝husk/rot、
         黃昏夜晚＝nightmare）—— ⚠ **hp/attack 都是暫定**（Ray 的表寫 ?）。
       · story:0 ＝ 遭遇戰（無開場白；打輸回森林入口）。
       · 掉落照 F 表：五食材＋三素材；虎王的獨角 25%，其餘必掉。
       ⚠ 名字全部**暫定**（Ray 沒給名），交件後照改。 */
    sf_lynx: {
      name:'森林山貓',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'beast',
      image:'enemy_sf_lynx',
      bg:'Forest_Glade_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:200,
      attack:10,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'claw', count:1, angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'bite', count:3, angle:'random' } },
      loot:[ { id:'meat_lynx', n:1 } ],
    },
    sf_snake: {
      name:'淺灘水蛇',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'beast',
      image:'enemy_sf_snake',
      bg:'Forest_Shoal_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:200,
      attack:10,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'bite' },
              wrong:{ type:'slash' },
              assault:{ type:'bite' } },
      loot:[ { id:'meat_snake', n:1 } ],
    },
    sf_hog: {
      name:'巨山豬',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'beast',
      image:'enemy_sf_hog',
      bg:'Forest_Trail_Day',
      fit:{ mode:'contain', pos:'center 70%' },   // 稍微移高（ver -875，Ray；幅度小於獨角虎的 55%）
      hp:350,
      attack:15,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blunt' },
              wrong:{ type:'slash' },
              assault:{ type:'blunt' } },
      loot:[ { id:'meat_boar', n:1 } ],
    },
    sf_tiger: {
      name:'獨角虎王',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },
      openAssault:[1,2],
      ult:{ on:1, hp:40, count:2, atk:25, gap:1, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'beast',
      image:'enemy_sf_tiger',
      bg:'Forest_Cave_Day',
      /* 位置放高、虎頭對畫面中心（ver -874，Ray 指定）：橫式撲擊構圖，頭在圖高
         約 45%——contain 縮完貼底會整隻沉在下緣，55% 讓頭落在敵區正中。 */
      fit:{ mode:'contain', pos:'center 55%' },
      hp:500,
      attack:20,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'claw', count:1, angle:'random' },
              wrong:{ type:'bite' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'tiger_horn', n:1, p:0.25 } ],   // 虎王的獨角 25%（Ray 表）
    },
    sf_crows: {
      name:'食腐鴉群',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0.2], '霰彈槍':[0,-0.3], '萊福槍':[0.3,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'beast',
      image:'enemy_sf_crows',
      bg:'Forest_Glade_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:250,
      attack:12,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'slash' },
              wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'crow_beak', n:1 } ],
    },
    /* ══⚠⚠ 樹靈鹿主（未變異）**沒有敵人卡**（ver -878，Ray：「鹿主不變異是不會
       有戰鬥的」）══ 牠在遺跡入口是**演出**（中景層 cgBack 的一張去背圖），不是
       可以打的東西 —— 打得到的只有下面那張變異版。
       -870 這裡曾有一張 `sf_deer`（hp600/atk20/purgeFx），連同 config.battles 的
       同名戰鬥卡與遺跡入口的必出設定一起撤掉了；圖仍在 ASSETS.enemy_sf_deer（預載用）。 */
    /* ══ 鹿主變異（ver -870，Ray 的森林行稿：「鹿主變異 mon_shinierforest_deernightmare
       …蕾：『禍魘！』進入戰鬥」）══ 黃昏後抵達遺跡入口的劇情戰。
       kind:'harm'＝變異成禍魘（降臨/淨化特效＋「已淨化」）。
       ⚠ hp/attack 暫定（照本尊 600 上調一階；Ray 沒給這一張的數值）。 */
    sf_deer_nightmare: {
      name:'變異樹靈鹿主',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0.3], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      /* ⚠⚠ **一波三顆**（ver -899，Ray：「被命中的話是 3hits」）：櫻花狂亂是**一陣風**，
         但風裡有三下 —— 三顆光圈各自判定，全沒擋到就挨三下。
         ⚠ `gap` 給 0.35 秒（不是 0）：0 會三顆同時出現、疊在一起看不出是三下；
           太長又會拆成三陣風。特效那一層**只生一層畫布**（見 enemy.spawnSakura），
           所以畫面上仍然是一陣連續的狂風。 */
      openAssault:[1,2],
      ult:{ on:1, hp:40, count:2, atk:25, gap:1, cd:4 },
      assaultEvery:[8,10],
      assault:{ count:3, gap:0.35 },
      kind:'harm',
      image:'enemy_sf_deer_nightmare',
      bg:'ruins_shinier_entrance',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:700,
      attack:22,   // ⚠ 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      /* 主動攻擊＝**櫻花狂亂飛舞**（ver -899，Ray 指定）：牠是樹靈，用爪痕不對。
         音效（Sturm，兩秒淡出）綁在那一支演出裡，不在 HITFX 的 `se` 上。 */
      hitFx:{ delay:{ type:'blood', angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'sakura' } },
      loot:[ { id:'elf_antler', n:1 } ],
    },
    /* ── 骸系（禍魘）：日夜差分是**兩張卡**，刷怪時由 wildSpawn 依 clock.band 選
       （日/晨＝這兩張、黃昏/夜＝nightmare 那兩張）。⚠ hp/attack 全部暫定（Ray 表寫 ?）。 */
    sf_bear_husk: {
      name:'熊骸',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },   // ＝心魘（骸系照 sv）
      openAssault:[1,2],
      ult:{ on:1, hp:40, count:2, atk:25, gap:1, cd:4 },
      assaultEvery:[8,10],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sf_bear_husk',
      bg:'Forest_Trail_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:15,   // ⚠ 暫定（照 sv_stag 級）
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blood', angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'paw_bear', n:1 } ],
    },
    sf_bear_nightmare: {
      name:'夢魘熊骸',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_bear',              // ⚠ 與 sv_bear 同一張圖（mon_bear_nightmare，鐵律 7：一張圖一個鍵）
      bg:'Forest_Trail_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:500,
      attack:18,   // ⚠ 暫定（夜間版比日間強一階）
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blood', angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'paw_bear', n:1 } ],
    },
    sf_stag_rot: {
      name:'腐鹿骸',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sf_stag_rot',
      bg:'Forest_Cliff_Day',
      /* 右貼邊（ver -869，Ray：「把鹿骸（半截的那隻）右移到貼邊」）——
         這張圖是前半身構圖、右緣本來就是裁切線，貼齊畫面右緣裁切線才藏得住。 */
      fit:{ mode:'contain', pos:'right bottom' },
      hp:300,
      attack:12,   // ⚠ 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blood', angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'antler_deer', n:1 } ],
    },
    sf_stag_nightmare: {
      name:'夢魘鹿骸',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_sv_stag',              // ⚠ 與 sv_stag 同一張圖（mon_stag_nightmare，鐵律 7）
      bg:'Forest_Cliff_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:15,   // ⚠ 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blood', angle:'random' },
              wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'antler_deer', n:1 } ],
    },
    /* ══ 木雅克神殿的怪（ver -919，Ray 交表）══════════════════════════════
       刷怪規則在 `script/town.js` 的 `shinier_ruins.wildSpawn`（實作只有
       `modules/town.js` 的 `wildActDue` 一支，鐵律 8）。
       · `kind` 分兩族：`relic`／`beast` 系是**禍魘**（`harm` ⇒ 降臨與淨化特效、
         結算副標「已淨化」）、`saint_*` 是**聖徒系列**（`slay` ⇒ 同一套演出，
         但副標是「已擊殺」，§6.5.4.4 的既有分野）。
       · `story:0` ＝遭遇戰（無開場白；打輸回這張圖的入口）。
       ⚠⚠ **hp 與掉落是 Ray 的表；`attack` 與其餘戰鬥參數是暫定**（他沒給）——
         照森林那一批的 hp:attack 比例（約 25:1）估，交件後照改。
       ⚠ 神殿在地底，背景 `bg` 給那一格自己的圖；城鎮插入戰交棒時
         `state.battleBg` 會蓋過它（§6.5.4.4「戰鬥背景＝你站的那一格」），
         所以這一欄只是「不在神殿打起來時」的退路。 */
    ruins_bonemaw: {
      name:'覆骨者',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0.3], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[8,10],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_ruins_bonemaw',
      bg:'Ruins_shinier_Catacomb',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:16,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'bite' }, wrong:{ type:'slash' },
              assault:{ type:'bite' } },
      loot:[ { id:'harm_bone', n:1, p:0.10 } ],
    },
    ruins_bellreacher: {
      name:'鳴鐘者',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[-0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[8,10],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_ruins_bellreacher',
      bg:'Ruins_shinier_Colossus',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:500,
      attack:18,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,16],
      hitFx:{ delay:{ type:'blunt' }, wrong:{ type:'slash' },
              assault:{ type:'blunt', count:2 } },
      loot:[ { id:'bell_shard', n:1, p:0.10 } ],
    },
    ruins_halo_ring: {
      name:'王的容器',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[8,10],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_ruins_halo_ring',
      bg:'Ruins_shinier_Hollow',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:350,
      attack:14,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blood', angle:'random' }, wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      /* ⚠ Ray 的表**沒給掉落** —— 空著（不是忘了，是還沒定）。 */
      loot:[],
    },
    ruins_heartripper: {
      name:'撕心者',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0.3], '霰彈槍':[0.3,0], '萊福槍':[0,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_ruins_heartripper',
      bg:'Ruins_shinier_Prison',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:16,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'claw', count:1, angle:'random' }, wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'harm_claw', n:1, p:0.10 } ],
    },
    ruins_bellwalker: {
      name:'喪鐘',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[-0.2,0], '霰彈槍':[-0.5,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_ruins_bellwalker',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:500,
      attack:16,   // hp＝Ray 表（ver -920 補）；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blunt' }, wrong:{ type:'slash' },
              assault:{ type:'blunt' } },
      loot:[ { id:'bell_shard', n:1, p:0.10 } ],
    },
    /* ── 聖徒系列（`slay`：降臨與淨化照播，結算副標「已擊殺」）────────────── */
    ruins_saint_prison: {
      name:'鎖鍊聖徒',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'slay',
      image:'enemy_ruins_saint_prison',
      bg:'Ruins_shinier_Prison',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:16,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{ delay:{ type:'blunt' }, wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'saint_claw', n:1 } ],          // 100%
    },
    ruins_saint_inspector: {
      name:'監查者',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'slay',
      image:'enemy_ruins_saint_inspector',
      bg:'Ruins_shinier_DarkBridge',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:400,
      attack:16,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,16],
      hitFx:{ delay:{ type:'slash' }, wrong:{ type:'slash' },
              assault:{ type:'slash', count:2 } },
      loot:[ { id:'saint_fang', n:1 } ],          // 100%
    },
    ruins_saint_thug: {
      name:'巨型聖徒',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'slay',
      image:'enemy_ruins_saint_thug',
      bg:'Ruins_shinier_CorridorA',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:600,
      attack:18,   // hp＝Ray 表；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,16],
      hitFx:{ delay:{ type:'blunt' }, wrong:{ type:'slash' },
              assault:{ type:'blunt', count:2 } },
      loot:[ { id:'saint_bone_big', n:1 } ],      // 100%
    },
    /* BOSS（結算怪）。⚠ **牠還沒有出場的那一拍**：深部祭壇平時不出怪（ver -918），
       Ray：「等等再補劇情給你」—— 卡與戰鬥卡都備好，接的時候是那一段 act 的一拍。 */
    ruins_saint_temperance: {
      name:'節制',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0.2,0], '霰彈槍':[0.3,0], '萊福槍':[1,0] },
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:2, gap:0.35 },
      kind:'slay',
      image:'enemy_ruins_saint_temperance',
      bg:'Ruins_shinier_DeepAltar',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:900,
      attack:20,   // hp＝Ray 表（ver -920 補）；attack 暫定
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,16,9,16],
      hitFx:{ delay:{ type:'blunt' }, wrong:{ type:'slash' },
              assault:{ type:'claw', count:3, angle:'random' } },
      loot:[ { id:'saint_bone', n:1 } ],          // 100%
    },

    /* ══⚠⚠⚠ 聖遺物系（`relic_*`）—— **10 張卡已備好，但還沒部署進遊戲**
       （ver -930，Ray：「先做吧，還不要部署到遊戲裡」）══════════════════════
       美術規格與這一族的文法在 `resources/enemy/_relic_spec.md`（人的肢體＋器物、
       沒有臉、紅繩與縫線）。10 張立繪已入庫。
       ⚠⚠ **沒有任何戰鬥卡指到它們** —— `config.battles` 那邊一個字都沒動，
         刷怪池（`wildSpawn.pool`）也沒有。所以現在玩不到，這是刻意的。
       ⚠⚠⚠ **而且它們的 ASSETS 也註解著**（ver -934，Ray：「先註解，等到開峽谷的
         時候再放」）—— 所以現在 `image` 那一格是查不到的（`asset()` 回空字串）。
         **要上場是兩邊一起改**：① `config.js` 的 ASSETS 那十行拿掉註解
         ② 這裡的怪接進某張戰鬥卡的 `enemy:[…]` 或刷怪池。
         漏一邊都是**沉默的失敗**（多載 3.87 MB 卻遇不到／遇得到卻沒有立繪）。
       ⚠⚠ **數值現在十張完全一樣**（hp 300／attack 10／攻擊模式與延時抄 `np_harm`
         那一組的基準值，`weaponMod` 一律 [0,0] 中性）—— 這是**起點不是設計**，
         等 Ray 逐張調（同 -596 那條：「數值都一樣，但是要各別做敵人卡方便我修改」）。
         ⚠ 不要為了「省重複」把它們合成一張帶陣列的卡：逐隻可調正是這個形狀的理由。
       ⚠ `name` 直接用美術規格上的中文名（鏡唱者／風箱懺者…）—— 那是 Ray 那份表上的
         字，我沒有另取。要換成 `禍魘祭司` 那種稱謂式的名字再說。
       ⚠ `bg` 是**單獨叫用時的墊背**（去背立繪的必要配套）：真的上場時會被城鎮／
         地圖那一格的背景蓋掉（ver -592）。先放神殿那一張。 */
    relic_mirrorchoir: {                       // 裂開的高鏡當頭，手從玻璃內側壓出裂紋
      name:'鏡唱者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_mirrorchoir',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_bellows: {                       // 軀幹是管風琴風箱，自己壓著自己呼吸
      name:'風箱懺者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_bellows',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_confessional: {                       // 身體是木造告解亭，一隻手從格柵裡貼著
      name:'告解者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_confessional',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_hourglass: {                       // 胸腔嵌著巨大沙漏，落下的是灰不是沙
      name:'沙漏苦修者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_hourglass',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_keyward: {                       // 頭是一團鑰匙，兩臂末端是鎖
      name:'鑰匙守',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_keyward',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_lectern: {                       // 骨盆長出石造讀經台，十幾隻手按住書頁
      name:'讀經台',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_lectern',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_censerlung: {                       // 肋骨外扳，胸腔裡擺盪著香爐
      name:'香爐肺',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_censerlung',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_veilhands: {                       // 一整片祭壇帷幕，後面數不清的手往前推
      name:'帷幕手',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_veilhands',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_wheelpsalm: {                       // 巨大的祈禱輪，輻條就是人的手臂
      name:'詩輪',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_wheelpsalm',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },
    relic_chalice: {                       // 頭是過大的聖爵，有手從杯口內側往上抓
      name:'聖爵溺者',
      story:1, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 中性起點，等 Ray 逐張調
      openAssault:[1,2],
      ult:{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 },
      assaultEvery:[2,4],
      assault:{ count:1, gap:0 },
      kind:'harm',
      image:'enemy_relic_chalice',
      bg:'Ruins_shinier_MossChamber',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      delayPenalty:{ seconds:5 },
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        assault:{ type:'blunt' },
      },
    },

    // 例：新怪
    // giant: { name:'巨人', image:'enemy_giant', imageBase:'giant', hp:150, attack:30, atkInterval:5, sound:{}, special:[] },
};

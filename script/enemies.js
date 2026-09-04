/* ============================================================================
 *  script/enemies.js — 敵人資訊標準卡（唯一資料來源，ver -794 由 config.js 抽出）
 *  ---------------------------------------------------------------------------
 *  原本住在 config.js 的 GAME_CONFIG.enemies；為了方便單獨編修怪物數值抽成獨立檔
 *  （Ray 指定）。config.js 頂部 `import { ENEMIES }` 後照舊掛成 `enemies: ENEMIES`，
 *  所有讀取端（modules/enemy.js·combat.js·inspector.js 的 `GAME_CONFIG.enemies[key]`）
 *  一律不變。
 *  ⚠ 純資料檔，不 import 任何東西（不會與 config 成環）；`image`/`sound`/`landSe`
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      /* 聖徒系列的結算副標是「已擊殺」（ver -432，Ray 指定）。⚠ 對照表在 i18n 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。三種聖徒同一類。 */
      kind:'slay',
      image:'enemy_faceless',   // 立繪鑰匙（見最下方 ASSETS）
      hp:200,          // 連戰第一隻（原測試值 500，v-lineup 調 200）
      attack:45,       // 大絕一擊傷害（原 ULT_DAMAGE）
      atkInterval:null,// 大絕蓄力秒數；null＝沿用 tuning.chargeSeconds（逐怪可覆寫）
      // 攻擊音（依 kind：ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。鑰匙對應 ASSETS。
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      /* 延時懲罰 5 秒（ver -458，Ray：「除了槍之魔女以外的敵人都先預設 5 秒」）。 */
      delayPenalty:{ seconds:5 },
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
        ult:{   type:'bite' },   // 攻擊（一般圈）→ 牙印（ver -762，Ray：「地下聖徒跟巨型聖徒的攻擊都換成牙印」）
      },
    },
    // ── 教學專用敵：訓練用聖徒（僅教學戰載入，不進 lineup）──
    //    tutorial.enemyKey 指到這筆；戰鬥數值大多被教學規則覆寫
    //    （攻擊一律 tutorial.enemyAtkDamage=2、總血 tutorial.enemyHp=500），
    //    hp/attack 仍填保底值。立繪：Saint_TR_CI。
    trainee: {
      name:'訓練用聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_trainee',    // → resources/enemy/Saint_TR_CI.webp
      hp:500,
      attack:45,
      atkInterval:null,         // 沿用 tuning.chargeSeconds
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },   // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      /* 結算副標的用詞（ver -432，Ray：「『靶』為已擊破」）。⚠ 對照表在 `i18n` 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。 */
      kind:'target',
      image:'enemy_dart_target',     // → resources/enemy/Dart_timeattack.webp
      hp:300,                        // Ray 指定
      attack:0,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        /* ⚠ 沙袋靶不噴血：受擊只有**碎屑**（沿用 slash 的刀痕當彈著），
           大絕與延時的特效根本不會演到（它不攻擊）。 */
        delay:{ type:'slash' },
        wrong:{ type:'slash' },
        ult:{   type:'slash' },
      },
    },
    // ── 連戰第二隻（局內序列第二敵）：巨型聖徒。完全獨立一筆，非沿用 faceless。 ──
    //    非 Boss（不填 ult/delayPenalty/wrongPenalty → 普通怪走預設：單發大絕、無半傷減時）。
    //    差異：血更厚（300）＋攻擊更密（蓄力 4×1/1.2≈3.33s）；單擊傷害同一般值。
    facelessgiant: {
      name:'巨型聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_facelessgiant',   // 內嵌立繪鑰匙 → resources/enemy/Saint_GT_CI.webp
      // 取景：主體在圖面右下（撲擊構圖），cover 裁切錨點右移下移——爪/頭/軀幹全入鏡
      fit:{ pos:'62% 78%' },
      hp:300,                        // 血更厚
      attack:45,                     // 大絕單擊傷害（普通值；差異在密度不在單擊）
      atkInterval:3.33,              // 大絕蓄力秒數：4×(1/1.2)≈3.33 → 攻擊更密（比第一隻高 20%）
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },   // 兩聖徒攻擊音相同
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,9,9,9],     // ver -792：貝琳妲以外全 9 宮格（Ray 指定）
      hitFx:{                        // 自帶獨立三件套（巨型聖徒風味：大絕爪數加重為 4）
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },      // 按錯 → 紅刀痕濺血
        ult:{   type:'bite' },       // 攻擊（一般圈）→ 牙印（ver -762，同地下聖徒）
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'human',
      image:'enemy_man_sorana',
      fit:{ pos:'50% 30%' },   // ver -745 換上專用戰鬥圖；構圖不對再調這格
      hp:300,
      attack:22,                     // 巨型聖徒 45 的一半
      atkInterval:3.33,
      /* ══ 大絕（ver -760，Ray 的敵攻四態實驗卡：「她 hp30% 以下時會同時出現
         四個攻擊圈」）══ hp 門檻＋具名行為（defense 的 ULT_ACTS）。
         ⚠ `noStack`＝一**波**清完才有下一波（不寫的話下一次排程會在殘圈上再疊
           四顆，實測疊到 8）—— 這是我補的節奏判斷，要改掉直接拔。 */
      ult:{ hp:30, act:'ring4' },
      noStack:true,
      sound:{ ult:'em_slash', delay:'em_dagger', wrong:'em_slash' },
      delayPenalty:{ seconds:4 },    // 快一秒（巨型聖徒是 5）
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'slash' },      // 貝琳妲的 dagger（slash 特效＋em_dagger 音）
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:4, angle:'random' },
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_natalia',         // → resources/enemy/mon_natalia.webp
      fit:{ pos:'50% 30%' },
      hp:900,                        // Ray 指定
      attack:22,                     // 巨型聖徒 45 的一半（減半，取整）
      atkInterval:3.33,              // 以下全部同巨型聖徒
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:4, angle:'random' },
      },
    },
    // 亂入怪（無傷 45 秒內通關才會出現）— 先用同一隻怪測流程，正式再換
    intruderEnemy: {
      name:'亂入者 · ???',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      image:'enemy_faceless',
      hp:400,
      attack:50,
      atkInterval:null,
      sound:{ hit:null, ult:null, death:null },
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,9,9,9],   // v16：每盤格數手動覆寫（同上，聖徒化不受影響）
    },
    // ── 槍之魔女（Boss）v17：S 評價後遭遇的隱藏 Boss ──
    witch: {
      name:'槍之魔女',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'human',                  // 槍之魔女是人類 → 已擊敗（ver -432，Ray 指定）
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
    /* ══ 賞金獵人（ver -375）══ 舊街區・賞金獵人公會那一場（劇情插入戰）。
       ⚠ 這一筆是「**敵人資訊標準卡**」的第一個實例（Ray 交稿的格式，見
         `script/SCRIPT_FORMAT.md` 的「敵人卡」一節）。卡上有的欄位這裡都要有，
         沒實作的（抗性/弱點）也**照樣寫進資料**、標明未實作 —— 資料先齊，
         程式後補；不要因為還沒做就把欄位丟掉（丟掉的下場是下次補做時沒人記得。）
       ══⚠⚠ 敵攻四態（ver -760，Ray 定案的卡格式）══
         · 延時＝`delayPenalty`　· 攻擊（一般圈）＝`atkInterval`/`ultEvery` 排程出的
           蓄力圈　· 失誤（點錯）＝`wrongPenalty`
         · **大絕**＝hp% 以下的特定行為：`ult:{ hp:30, act:'ring4' }` ——
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[-0.5,0], '萊福槍':[0.5,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_candletower',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:6 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    np_candlepenitent: {
      name:'罪之魔像',
      story:1, counterStagger:1,
      weaponMod:{ '重機槍':[0,-0.2], '霰彈槍':[0.5,0], '萊福槍':[-0.5,-0.3] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_candlepenitent',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:250,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    np_coralman: {
      name:'禍魘',
      story:1, counterStagger:1,
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_coralman',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    np_reassembled: {
      name:'禍魘',
      story:1, counterStagger:1,
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_reassembled',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ══ 教堂的 Boss（ver -586，Ray：「B2G01，教堂 boss 用這一隻，跟其他怪數值
       一樣就好」）══ 數值與那四隻雜怪 **完全相同**，差別只有三件事：
         · 立繪（祭壇獸）
         · `bg` 用教堂那一張 —— 打的地方就是那裡
         · `sessionEnd` 在**戰鬥卡**上（`battles.np_boss`）＝打贏它才閉棺、資源回滿
       ⚠ 名字沿用「禍魘」：Ray 還沒給它專屬的名字，不自己編。 */
    np_boss: {
      name:'禍魘',
      story:1, counterStagger:1,
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_boss',
      bg:'Northport_church_BF',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:300,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
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
      name:'禍魘',
      story:1, counterStagger:1,
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',
      image:'enemy_np_claws',
      bg:'Northport_church_BF',
      hp:300,
      attack:10,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    guild_hunter: {
      name:'賞金獵人',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
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
      sound:{ ult:'em_shot', delay:'em_shot', wrong:'em_smack' },
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
        ult:{   type:'bullet', count:1, pos:'random', scale:1.8 },// 大彈孔
      },
      /* ⚠ 抗性／弱點武器：**卡上有、程式還沒實作**。資料先照卡放著。 */
      resist:[], weak:[],
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      /* ⚠⚠ **三張時段差分**（Ray：「上午下午用 Centipi_day，晚上用 night，
         黃昏黎明用 Centipi_dd」）。寫成 `{day,dd,night}` 三個槽，時段→槽的對應
         只有一處：`modules/enemy.js` 的 `enemyImage()`（鐵律 7）。 */
      image:{ day:'enemy_centipi_day', dd:'enemy_centipi_dd', night:'enemy_centipi_night' },
      /* ⚠ `kind` ＝ 結算頁的用詞（Ray 指定）：`harm`＝禍魘→「已淨化」、
         `human`→「已擊敗」、`ship`→「已擊沉」。對照表在 `modules/inspector.js`。 */
      kind:'harm',
      hp:500,
      /* 蓄力攻擊（紅點那一發）：傷害 20、**3~5 秒發動一次**、不疊加。
         ⚠ `atkInterval` 給**區間**（陣列）＝每次隨機；給數字＝固定（舊卡不受影響）。 */
      attack:20,
      /* ⚠⚠ 「3~5 秒發動一次」是**發動頻率**不是蓄力長度 —— 所以走 `ultEvery`
         （＝`ULT_MIN`/`ULT_MAX`），不是 `atkInterval`（那是紅點給你幾秒反應）。
         兩個都叫「秒」但意思完全不同，混用會讓怪要嘛不打人、要嘛打不完。 */
      atkInterval:null,
      ultEvery:[3,5],
      /* ⚠ 「不疊加」＝場上同時只有一個紅點（見 defense.scheduleUlt 的 `noStack`）。 */
      noStack:true,
      sound:{ ult:'se_enemy_centipi', delay:'em_smack', wrong:'em_smack' },
      landSe:'se_enemy_centipi',    // 登場音（ver -790，船戰各自獨立；蜈蚣＝自己的叫聲）
      special:[],
      /* 盤面配置 `33344, loop`：3＝九宮格、4＝16 宮格，打完五盤沒死就從頭再來。 */
      boardGrids:[9,9,9,9,9],
      boardLoop:true,
      /* 延時懲罰：**5 秒**（ver -458 由 4 調成非魔女的統一預設）、傷害 10、單爪特效。 */
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
      /* ⚠⚠ **抗性／弱點／破防增傷**（ver -423 起真的生效，之前只是放著）：
         值是**加減成**，套在 `combat.enemyDamage` 那一個計算點上（鐵律 7）。
           resist.basic   普攻減傷 20%
           weak.counter   全反擊武器增傷 100%
           dualBonus      破防（雙槍窗口）增傷 20% */
      resist:{ basic:0.20 },
      weak:{ counter:1.00 },
      dualBonus:0.20,
      /* 反擊之後的兩件事（卡上分開寫，程式也分開讀）：
           counterBuff  反擊攻擊增益：普攻 ×2、持續 5 秒
           counterStun  反擊硬直：被反擊後 3 秒才發起下一次主動攻擊 */
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[1.50,0], '萊福槍':[0,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'harm',                 // 禍魘 → 已淨化
      image:{ day:'enemy_serpent_day', dd:'enemy_serpent_dd', night:'enemy_serpent_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      ultEvery:[3,5],              // 發動頻率 3~5 秒一次
      noStack:true,                // 不疊加：場上同時只有一個紅點
      sound:{ ult:'se_enemy_serpent', delay:'em_smack', wrong:'em_smack' },
      /* 降臨著地音（ver -745，Ray：「se 不放 se_saintintall 而是放羽蛇叫聲」）——
         禍魘的著地預設是 sfx_saint，這張卡覆寫成牠自己的吼叫（enemy.js 讀）。 */
      landSe:'se_enemy_serpent',
      special:[],
      boardGrids:[9,9,9,9,9],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 蓄力攻擊「毒牙特效」＝咬痕（bite）；延時單爪、點錯鈍器（同卡）。 */
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        ult:{   type:'bite' },
      },
      resist:{ basic:0.20 },
      /* 弱點：反擊武器 +100%、**散射武器（霰彈槍類）再 +150%**（Ray 的卡）——
         `cat:<武器類別>` 只對反擊傷害生效，判定在 combat.applyEnemyMods（唯一一處）。 */
      weak:{ counter:1.00 },
      dualBonus:0.20,
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
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
      weaponMod:{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[1.50,0] },   // 每把＝[傷害, 迴避]：傷害 正=增傷/負=抗性減傷；迴避＝額外 miss 率(0~1)。都加法(0.1＝+10%)，預設 [0,0]
      openUlt:[1,2],   // 登場第一發大絕的延遲（秒，隨機範圍）；預設 [1,2]。改小＝一登場就攻擊、改大＝緩一下
      kind:'ship',                 // 船隻 → 已擊沉
      image:{ day:'enemy_pirate_day', dd:'enemy_pirate_dd', night:'enemy_pirate_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      ultEvery:[3,5],              // 發動頻率 3~5 秒一次
      noStack:true,                // 不疊加：場上同時只有一個紅點
      sound:{ ult:'se_weapon_cannon', delay:'se_ship_cannon', wrong:'se_sniper_falcon' },   // 點錯改狙擊音（ver -512，Ray 指定）
      landSe:'se_weapon_cannon',   // 登場音（ver -790，船戰各自獨立；空賊船＝艦砲）
      special:[],
      boardGrids:[9,9,9,9,9],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 延時／點錯都是彈孔（牠是用砲跟槍招呼你的）；大絕＝**特大彈孔＋畫面閃紅**
         （`flash:'red'`，ver -509 新演出，實作在 enemy.showHitFx）。 */
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },
        wrong:{ type:'bullet', count:1, pos:'random' },
        ult:{   type:'bullet', count:1, pos:'random', scale:2.4, flash:'red' },
      },
      resist:{ basic:0.20 },
      /* 弱點：反擊 +100%、**單射武器（萊福槍類）再 +150%**（`cat:` 只對反擊生效，
         判定在 combat.applyEnemyMods，同羽蛇卡）。 */
      weak:{ counter:1.00 },
      dualBonus:0.20,
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
      loot:[ { id:'brass_casing', n:1, p:0.33 } ],
      /* 金錢：HP 的 70%~90%。 */
      money:{ hpRatio:[0.7, 0.9] },
    },
    // 例：新怪
    // giant: { name:'巨人', image:'enemy_giant', imageBase:'giant', hp:150, attack:30, atkInterval:5, sound:{}, special:[] },
};

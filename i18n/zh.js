/* ============================================================================
 *  i18n/zh.js — 全遊戲待譯字串母本（繁體中文＝原文基準）
 *  ---------------------------------------------------------------------------
 *  翻譯方式：
 *    1. 複製本檔為 en.js / ja.js，把每個「值」翻譯成目標語言；
 *       「鍵」與檔案結構一律不動，翻好整份丟回即可直接置換。
 *    2. \n＝強制換行（保留）；「」引號可換成目標語言慣用引號。
 *    3. 佔位符原樣保留：{n}=數字、{name}=敵人名、{rand3}=隨機三位數。
 *    4. 標注 [EN-STYLE] 的字樣是刻意的英文演出字（RELOADING／OVERKILL 等），
 *       建議三語共用不譯；若要在地化再改。
 *    5. 標注 [KEEP] 的（日文曲名、作者名、英文詩句）維持原文。
 * ========================================================================== */

export const STRINGS = {

  /* ═══ 1. 首頁 ═══ */
  home: {
    title:        '聖約第四騎士團',
    start:        '挑戰',   // ver -471（Ray：「試玩版的出陣現在改成挑戰」）
    storyStart:   '開始故事',   // ver -554：正式遊玩入口（放在挑戰上面）
    tutorialBtn:  '教學',
    continueBtn:  '繼　續',              // 首頁：進最新存檔（ver -430）
    weaponLabel:  '副武器',
    partnerLabel: '搭　檔',
    creditBtn:    'Credit',            // [EN-STYLE] 可不譯
    originalBtn:  '原作',
    statsBtn:     '後臺',              // 管理員限定按鈕，一般玩家看不到
    prepTitle:    '出擊整備',          // 出陣後的整備頁標題
    prepGo:       '執　槍',            // 整備頁底部大鈕（規格同結算「再度執槍」）
  },

  /* ═══ 2. 載入畫面 ═══ */
  loading: {
    loadingMsg:   '載　入　中',
    tapContinue:  '點　擊　繼　續',
    // 監察官口吻的輪播教學 Hint（隨機出現）
    hints: [
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
  },

  /* ═══ 3. 戰鬥中 UI／浮動字 ═══ */
  battle: {
    skipBtn:      'SKIP',              // 教學左上跳過鈕（三語統一英文小字）
    testClear:    '清盤',              // 測試人員鈕（一般玩家看不到）
    reloading:    'RELOADING',        // [EN-STYLE] 換盤轉場
    perfectClear: '完美清盤 +{n}',     // 完美清盤獎勵浮字
    tooSlow:      '太慢',              // 延時懲罰浮字
    crit:         '暴擊 ',             // 暴擊前綴（後接數字，保留尾空格）
    hitByUlt:     '被擊中',            // 挨大絕浮字
    overkill:     'OVERKILL！',        // [EN-STYLE]
    overkillAdd:  'OVERKILL +{n}',    // [EN-STYLE]
    counter:      'COUNTER！',         // [EN-STYLE] 反擊成功
    perfect:      'PERFECT',          // [EN-STYLE] 完美防禦
    block:        'BLOCK',            // [EN-STYLE] 格擋
    blockDmg:     'BLOCK −{n}',       // [EN-STYLE] 格擋損傷
    miss:         'MISS',             // [EN-STYLE] 聖徒化按錯
    tooSlowEn:    'TOO SLOW',         // [EN-STYLE] 聖徒化反應超時
    saintMode:    'SAINT MODE',       // [EN-STYLE] 聖徒化開始浮字
    lifeReturn:   '生命歸還',          // 生命歸還浮字
    deathGuard:   '即死防禦',          // 即死防禦浮字
  },

  /* ═══ 4. 退出確認框 ═══ */
  exitConfirm: {
    title:    '回到主選單？',
    sub:      '目前這場進度不會保留',
    stay:     '繼續遊戲',
    leave:    '回主選單',
  },

  /* ═══ 5. Cut-in 演出（title 大字／sub 副標）═══ */
  cutins: {
    saintInstall:      '聖徒降臨！！',          // 副標 SAINT INSTALL!! [EN-STYLE] 不譯
    dualBreak:         '破防・雙槍',            // 副標 Guard Crushing [EN-STYLE] 不譯
    deathGuard:        '即死防禦',              // 副標 Death Guard [EN-STYLE] 不譯
    mbSub:             '追加聖裁 · HP 50%',     // MAXIMUM BURST 副標
    executeSub:        '{name} · 消滅',        // EXSECUTIŌ 副標（{name}=敵名）
    lifeReturnSub:     '生命歸還 · 血量保留',    // LIFE RETURN 副標
    obeSub:            'O.B.E. · HP 1',        // [EN-STYLE] OVERWRITE BREAKER 副標
    newHustle:         'NEW HUSTLE INCOMING',  // [EN-STYLE] Boss 亂入
  },

  /* ═══ 6. 副武器（選單全名／首頁綽號／規格文案）═══ */
  weapons: {
    MG_Squall: {
      name:      'B1901陣地機槍「絞肉機」',
      shortName: '絞肉機',
      desc:      '反擊效果\n黃圈：減傷50%\n橘圈：完全防禦\n反擊：8發×6傷害\n暴擊率：20%\n攻守均衡的可靠選擇',
    },
    Shotgun_Blast: {
      name:      '雙管霰彈槍「鐵拳」',
      shortName: '鐵拳',
      desc:      '反擊效果\n黃圈：減傷75%\n橘圈：6發×2傷害\n反擊：6發×4傷害\n暴擊率：20%\n保命的穩健之選',
    },
    Sniper_Falcon: {
      name:      '85式步槍「嗜心者」',
      shortName: '嗜心者',
      desc:      '反擊效果\n黃圈：無減傷效果\n橘圈：無減傷效果\n反擊：單發72傷害\n暴擊率：20%\n賭上一切的單發重擊',
    },
    // 選單 UI
    sheetTitle:  '選擇副武器',
    select:      '選擇此武器',
    back:        '返回',
  },

  /* ═══ 7. 搭檔（名字／技能）＋選人選單 ═══ */
  partners: {
    renee: {
      name:        '蕾妮',
      perk:        '即死防禦（被動）＋生命歸還（主動）',
      passiveName: '即死防禦',
      passiveDesc: '受到足以致死的攻擊時，為玩家保留1hp續命。',
      activeName:  '生命歸還',
      activeDesc:  '聖徒化期間發動：強制中止聖徒化，保留當前血量。',
    },
    malzeno: {
      name:        '馬季諾',
      perk:        '前線補給（主動）＋高爆彈頭（被動）',
      passiveName: '高裝藥彈',
      passiveDesc: 'HP 降至 50% 以下時發動：10 秒普攻傷害加倍，效果可跨盤面延續。',
      activeName:  '前線補給',
      activeDesc:  '立即進入雙槍破防。聖徒化期間無法發動。',
    },
    // 選單 UI
    sheetTitle:  '選擇搭檔',
    tagActive:   '主動',
    tagPassive:  '被動',
    howtoActive: '主動技：戰鬥中於敵人畫面「由下往上滑」發動',
    howtoSaint:  '聖徒化：敵人畫面「左右滑到底」隨時可發動\n——HP 越低，持續時間越長',   // \n＝強制換行
    select:      '選擇此搭檔',
    back:        '返回',
  },

  /* ═══ 8. 敵人名（UI 只顯示底線前半）═══ */
  enemies: {
    faceless:      '地下聖徒',
    facelessgiant: '巨型聖徒',
    intruder:      '亂入者 · ???',
    witch:         '槍之魔女',
    trainee:       '訓練用聖徒',   // 教學專用敵
  },

  /* ═══ 9. 監察官（芙蕾雅）＝結算台詞 ═══ */
  inspector: {
    name:          '芙蕾雅',
    fallbackName:  '監察官',
    executionLine: '熔斷了？真慘烈呢。',            // 處決勝利（MB 擊殺）專屬
    interceptLine: '慢著！有新的敵人！',            // S 評價點「再度執槍」時
    // 一般戰結算台詞（依評價等第）
    dialogues: {
      S:    '怎麼可能？竟然能夠做到這種程度！',
      A:    '有興趣加入第十三騎士團嗎？我們需要你這樣的人才。',
      B:    '這不是還不錯嗎？',
      C:    '也就比一般人強一點嗎……？',
      D:    '……你們團長有好好訓練你嗎？',
      E:    '………………',
      lose: '（監察官失敗台詞待填）',
    },
    // Boss 戰結算台詞（依評價等第）
    bossDialogues: {
      S:    '你的實力，說不定能與團長比肩！',
      A:    'HUND中竟然有你這樣的人存在……！',
      B:    '幸虧有你，竟然連那種對手也能戰勝！',
      C:    '我果然沒有看走眼呢。',
      D:    '辛苦了，慘烈的戰鬥呢。',
      E:    '醫療班！千萬別讓他死了！',
      lose: '......確認HUND {rand3}號機能停止。辛苦了。',   // {rand3}=隨機三位數
    },
  },

  /* ═══ 10. 結算畫面 ═══ */
  result: {
    winTitle:     '聖裁',
    winSub:       '{name}已淨化',        // {name}=敵名
    /* 依敵人卡的 `kind` 換用詞（ver -423，Ray 指定）：禍魘＝已淨化、人類＝已擊敗、
       船隻＝已擊沉。⚠ 卡上沒寫 `kind` 就用上面那一句（舊怪不受影響）。 */
    /* 結算副標的用詞，依敵人卡的 `kind`（ver -423；-432 補齊五類，Ray 指定）。
       ⚠ 沒寫 `kind` 的怪退回 `winSub` 那一句，不會壞。 */
    winSubBy:     { harm:'{name}已淨化', human:'{name}已擊敗', ship:'{name}已擊沉',
                    target:'{name}已擊破', beast:'{name}已獵殺',
                    slay:'{name}已擊殺' },
    loseTitle:    '聖光黯滅',
    loseSub:      'HUND 倒下了…',
    gradeCap:     '評價',
    expLabel:     'EXP {n}',            // [EN-STYLE] EXP 可不譯
    rowCombo:     '連擊數',
    rowHits:      '受擊數',
    rowAccuracy:  '命中率',
    rowPerfectCtr:'完美反擊',
    rowCtrDamage: '反擊總傷',
    rowTime:      '戰鬥用時',
    tagFlawless:  '無傷',
    rowCounter:   'Counter 反擊',        // 戰敗結算列
    rowPerfect:   '完美防禦',            // 戰敗結算列
    timesUnit:    '{n} 次',             // 次數單位
    dmgUnit:      '{n} 傷',             // 傷害單位（戰敗結算列）
    timeMinSec:   '{m}分{s}秒',          // 用時格式
    timeSec:      '{s}秒',
    newRecord:    '★ NEW RECORD ★',     // [EN-STYLE]
    rematch:      '再度執槍',
    /* 戰敗的三顆（ver -430，Ray 定案）：船艦戰＝繼續（回飛行畫面）；
       其餘劇情場次＝再戰（回該幕對話的開頭）／放棄（回主畫面）。 */
    loseContinue: '繼　續',
    loseRetry:    '再　戰',
    loseGiveUp:   '放　棄',
    intercept:    '迎擊',
    lineMissing:  '（監察官台詞待填）',
  },

  /* ═══ 11. 過渡禎（全畫面轉場）═══ */
  transitions: {
    tapHint:  '輕觸畫面繼續',
    startCn:  '驅逐開始',
    finishCn: '驅逐完成',
    failCn:   '驅逐失敗',
    // [KEEP] 各過場的英文詩句維持原文不譯（風格演出）
  },

  /* ═══ 12. 教學關卡 ═══ */
  tutorial: {
    /* ══ 劇情版教學（諾薇兒一個人帶）══════════════════════════════════
       ⚠ 與下面那一份（芙蕾雅／蕾妮）是**兩套**，Ray 指定要分開：
         這一份只在劇情帶起來的那一場用（tutorial.isStoryRun()），
         首頁「教學」鈕仍走原本那一份。
       ⚠ 每一句帶 `img`＝該句的表情差分（Ray 在對應表上逐句指定）。
         沒寫就沿用 cast 的預設圖。
       ⚠ 稿子的來源與改寫依據見 script/TUTORIAL_LINES_NOUVELLE.md。 */
    story: {
      steps: {
        battleStart: [
          { who:'nouvelle', img:'tut_nouvelle_cringe',
            text:'對不起……接下來只能靠你了。我會在這裡告訴你該怎麼做。' },
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'不要緊張……照著數字的順序點下面的盤面就好。' },
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'敵人似乎還在觀查……先習慣手感就好。不過失誤、或者停太久的話，敵人還是會攻過來的！' },
        ],
        board1: [
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'很好……你做得到的。小心！攻擊要來了！' },
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'牠蓄力的時候，畫面上會出現光圈——那是要你防禦的信號。' },
        ],
        threat: [
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'光圈會越縮越小。太早出手只能「擋下」，還是會受到一半的傷。' },
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'等它縮得夠小、抓準那一瞬間，才能完美防下！' },
          { who:'nouvelle', img:'tut_nouvelle_cringe',   text:'來了！擋下來！' },
        ],
        defended: [
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'擋下來了。如果在牠出手的前一瞬反擊，副武器可以打出很重的傷害。' },
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'不要勉強。覺得危險的話，好好防下來就好。' },
          /* ⚠ 原本芙蕾雅的「那樣的話，我的評價可不會留情。」Ray 指定**刪除** ——
             她沒有評價玩家的立場。 */
          { who:'nouvelle', img:'tut_nouvelle_surprise', text:'每一種副武器的效果和反擊時機都不一樣，要謹慎使用！' },
        ],
        strike: [
          { who:'nouvelle', img:'tut_nouvelle_cringe', text:'危險——！' },
        ],
      },
      script: {
        dualReady:  [ { who:'nouvelle', img:'tut_nouvelle_surprise', text:'牠露出破綻了……就是現在！' } ],
        dualGo:     [ { who:'nouvelle', img:'tut_nouvelle_surprise', text:'牠沒辦法抵抗了！不用管順序，打下去！' } ],
        /* ⚠ 這一句配**全畫面 cut-in**（Ray 指定）。cutin 是資產鍵，見 config 的 ASSETS。 */
        saintCall:  [ { who:'nouvelle', img:'tut_nouvelle_saint', cutin:'cutin_nouvelle_saint',
                        text:'SAINT INSTALL......！' } ],
        saintStart: [ { who:'nouvelle', img:'tut_nouvelle_saint',
                        text:'在我......熔斷之前你不會死。可是每挨一下，熔斷就會更快。' },
                      { who:'nouvelle', img:'tut_nouvelle_saint',
                        text:'不要出錯……只要撐過這一回合，就還有機會。' } ],
        saintFail:  [ { who:'nouvelle', img:'tut_nouvelle_saint', text:'堅持住！' } ],
        finishMB:   [ { who:'nouvelle', img:'tut_nouvelle_desperate', text:'撐過來了……體力也回來一些了。收拾他吧！' } ],
        finishLR:   [ { who:'nouvelle', img:'tut_nouvelle_desperate', text:'撐過來了……收拾他吧！' } ],
      },
      /* 插話：⚠ 由「責備」改成「她替你痛」（見對應表七節）。全部配 Cringe。 */
      scold: {
        wrong: ['看清楚數字……拜託你。', '別慌……順序，慢慢來就好。'],
        delay: ['不能停下來……牠不會等你的。', '猶豫會受傷的！'],
        early: ['太早了……再看清楚一點。'],
        attackDuringThreat: { first:'防禦——！要來了！', rest:'…………' },
        dead: '沒關係……我們再來一次。',
        img: 'tut_nouvelle_cringe',
      },
      /* ⚠ 教學結算**整段刪除**（Ray 指定）—— 劇情版打完直接接回劇情，
         不需要監察官的講評。 */
      result: null,
    },

    // ── 教學步驟對話（who: inspector=芙蕾雅 / partner=蕾妮）──
    steps: {
      battleStart: [
        { who:'inspector', text:'開始實戰考核。HUND，讓我看看你的基礎是否紮實。' },
        { who:'partner',   text:'別緊張！照著數字順序點擊下方的盤面，每一次命中都會對敵人開火！' },
        { who:'partner',   text:'這一回合敵人還不會出手——先把手感練起來。不過按錯或停太久，還是會受傷的喔。' },
      ],
      board1: [
        { who:'inspector', text:'基礎還行。接下來——敵人要開始反擊了。' },
        { who:'partner',   text:'敵人蓄力時，畫面上會出現光圈。那就是防禦的信號！' },
      ],
      threat: [
        { who:'partner',   text:'光圈會越縮越小——太早出手只能「擋下」，還是會受到一半傷害！' },
        { who:'partner',   text:'等光圈收得夠小、時機正確，才能「完美防禦」，不受損傷！' },
        { who:'inspector', text:'防住給我看。' },
      ],
      defended: [
        { who:'inspector', text:'擋得不錯。記住——在敵人出手的前一瞬反擊，就能用副武器造成大量傷害。' },
        { who:'partner',   text:'不過別勉強反擊，覺得危險的話，防下來就好。' },
        { who:'inspector', text:'那樣的話，我的評價可不會留情。' },
        { who:'inspector', text:'不同副武器的效果與反擊時機各不相同。選擇能發揮自己天賦的武器吧。' },
      ],
      strike: [
        { who:'inspector', text:'小心！' },
      ],
    },
    // ── 腳本化段落 ──
    script: {
      dualReady:  [ { who:'partner',   text:'敵人露出破綻了！就是現在！' } ],
      dualGo:     [ { who:'partner',   text:'敵人無法抵抗，無視順序猛攻吧！' } ],
      saintCall:  [ { who:'inspector', text:'沒時間了，立刻聖徒化！' } ],
      saintStart: [ { who:'inspector', text:'在熔斷前你死不了，但承受攻擊會加速熔斷！' },
                    { who:'inspector', text:'別失誤！只要撐過這回合就有機會逆轉！' } ],
      saintFail:  [ { who:'partner',   text:'不行了！交給我！' } ],
      finishMB:   [ { who:'inspector', text:'總算撐過來了，體力也回復了一些，現在結束這場戰鬥吧！' } ],
      finishLR:   [ { who:'inspector', text:'總算撐過來了，現在結束這場戰鬥吧！' } ],
    },
    // ── 罵人插話（隨機取一句）──
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
      // 反擊教學：紅圈在場還猛點盤面攻擊 → 首次罵、第二次起無言
      attackDuringThreat: { first:'你倒是防禦啊！', rest:'…………' },
      dead: '服了你了。重來！',   // 教學陣亡（收段後該段重來：滿血重建本盤，不重播已完成段落）
    },
    // ── 引導箭頭標示 ──
    guideLabels: {
      click: 'CLICK！',        // [EN-STYLE] 可不譯
      right: '向右側滑動',
      up:    '向上滑動',
    },
    // 跳過鈕確認視窗（暫停中）：是→轉出擊整備頁；否→繼續教學
    skipConfirm: {
      title: '是否跳過教學？',
      sub:   '之後可從首頁「教學」鈕重看',
      yes:   '跳　過',
      no:    '繼續教學',
    },
    // ── 教學專屬結算 ──
    result: {
      buttonLabel:    '繼續',   /* ver -358 起教學結算無監察官——其餘台詞欄位已清（ver -567） */
    },
  },

  /* ═══ 13. Credit／原作 面板 ═══ */
  sheets: {
    creditTip:    '點擊曲目可前往作曲者頁面',
    creditClose:  '關閉',
    creditUse: {                        // 各曲用途標籤（曲名/作者名 [KEEP] 不譯）
      mainMenu:   'Main Menu',          // [EN-STYLE]
      missionFail:'Mission Failed',     // [EN-STYLE]
      result:     '結算畫面',
      battle:     '戰鬥畫面',
      boss:       'Boss戰',
      northport:  '北方泊地',           // ver -614
      harmBoss:   '禍魘BOSS戰',         // ver -614
      flight:     '航行畫面',
    },
    originalNote: '（圖文小說連結，兩站皆已連載完畢）',
    originalBaha: '巴哈姆特',            // 平台名，日/英版視在地慣例（Penana 不譯）
    originalClose:'關閉',
    copyright:    '© 2026 Eternal Original Sin (E.O.S.) · All Rights Reserved.',   // [KEEP]
    eosName:      '永恆的原罪',          // 團隊名（若有正式外文名請提供）
  },

  /* ═══ 14. Boss 戰 S 級獎勵（銭湯インストール）═══ */
  sentou: {
    saintInstallBtn: 'SAINT INSTALL...?',   // [EN-STYLE]
    tapReturn:       '點 擊 返 回',
    // 毛筆招牌「銭湯」「インストール」 [KEEP] 維持日文（演出設定）
  },
};

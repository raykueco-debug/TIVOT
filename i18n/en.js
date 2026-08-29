/* ============================================================================
 *  i18n/en.js — English language pack（母本＝i18n/zh.js、構造完全一致）
 * ========================================================================== */

export const STRINGS = {
  /* ═══ 1. 首頁 ═══ */
  home: {
    title:        'The IV Order of Testament',
    start:        'CHALLENGE',   // ver -471：出陣→挑戰
    storyStart:   'START STORY',   // ver -554
    tutorialBtn:  'TUTORIAL',
    continueBtn:  'CONTINUE',             // 首頁：進最新存檔（ver -430）
    weaponLabel:  'Sub-Weapon',
    partnerLabel: 'PARTNER',
    creditBtn:    'Credit',
    originalBtn:  'Original',
    statsBtn:     'Admin',
    prepTitle:    'Sortie Preparation',
    prepGo:       'Take Up Arms',
  },
  /* ═══ 2. 載入畫面 ═══ */
  loading: {
    loadingMsg:   'L O A D I N G',
    tapContinue:  'T A P   T O   C O N T I N U E',
    hints: [
      'Counter timing varies by weapon. Stay calm.',
      'A counter that is too early will still get you hurt.',
      'The closer you are to death, the more valuable Saint Install becomes. If you think you cannot hold out any longer, use it without hesitation.',
      'Good coordination with your partner will make the battle much easier.',
      'The longer the combo, the more powerful your bullets become. The moment you stop, it all resets.',
      'The enemy will not wait while you hesitate. Keep your fingers moving.',
      'One wrong square, and the price is blood. Look carefully before you act.',
      'Consecutive hits sharpen your criticals. Miss once, and you start over.',
      'The smaller the red circle, the more valuable the counter. Whether you take the risk is up to you.',
      'Blocking does not mean you are unharmed—half damage is still damage.',
      'When the gauge is full, do not hesitate to use it. Those twin guns are there to keep you alive.',
      'Strike cleanly, and the enemy will be easier to stagger.',
      'Every hit you take during Saint Install pushes you closer to the Abyss.',
      'If you make it to the final shot of Saint Install, give them another twenty percent of pain.',
      'The three seconds after an enemy falls are your time for additional Judgment. Do not waste them.',
      'Too many wounds, and my evaluation will not be kind.',
    ],
  },
  /* ═══ 3. 戰鬥中 UI／浮動字 ═══ */
  battle: {
    skipBtn:      'SKIP',
    testClear:    'CLEAR',
    reloading:    'RELOADING',
    perfectClear: 'PERFECT CLEAR +{n}',
    tooSlow:      'TOO SLOW',
    crit:         'CRITICAL ',
    hitByUlt:     'HIT',
    overkill:     'OVERKILL!',
    overkillAdd:  'OVERKILL +{n}',
    counter:      'COUNTER!',
    perfect:      'PERFECT',
    block:        'BLOCK',
    blockDmg:     'BLOCK −{n}',
    miss:         'MISS',
    tooSlowEn:    'TOO SLOW',
    saintMode:    'SAINT MODE',
    lifeReturn:   'LIFE RETURN',
    deathGuard:   'DEATH GUARD',
  },
  /* ═══ 4. 退出確認框 ═══ */
  exitConfirm: {
    title:    'Return to Main Menu?',
    sub:      'Your current progress will not be saved',
    stay:     'Continue',
    leave:    'Main Menu',
  },
  /* ═══ 5. Cut-in 演出 ═══ */
  cutins: {
    saintInstall:      'SAINT INSTALL!!',
    dualBreak:         'GUARD BREAK · DUAL WIELD',
    deathGuard:        'DEATH GUARD',
    mbSub:             'ADDITIONAL JUDGMENT · HP 50%',
    executeSub:        '{name} · ERADICATION',
    lifeReturnSub:     'LIFE RETURN · HP RETAINED',
    obeSub:            'O.B.E. · HP 1',
    newHustle:         'NEW HUSTLE INCOMING',
  },
  /* ═══ 6. 副武器 ═══ */
  weapons: {
    MG_Squall: {
      name:      'B1901 Machine Gun "Meat Grinder"',
      shortName: 'Meat Grinder',
      desc:      'Counter Effect\nYellow Ring: 50% Damage Reduction\nOrange Ring: Full Guard\nCounter: 8 Shots × 6 Damage\nCritical Rate: 20%\nA reliable choice with balanced offense and defense',
    },
    Shotgun_Blast: {
      name:      'Double-Barreled Shotgun "Iron Fist"',
      shortName: 'Iron Fist',
      desc:      'Counter Effect\nYellow Ring: 75% Damage Reduction\nOrange Ring: 6 Shots × 2 Damage\nCounter: 6 Shots × 4 Damage\nCritical Rate: 20%\nA steady choice for staying alive',
    },
    Sniper_Falcon: {
      name:      '85 Rifle "Heart Eater"',
      shortName: 'Heart Eater',
      desc:      'Counter Effect\nYellow Ring: No Damage Reduction\nOrange Ring: No Damage Reduction\nCounter: 72 Damage per Shot\nCritical Rate: 20%\nA devastating single shot that gambles everything',
    },
    sheetTitle:  'Select a Sub-Weapon',
    select:      'Select This Weapon',
    back:        'Back',
  },
  /* ═══ 7. 搭檔＋選人選單 ═══ */
  partners: {
    renee: {
      name:        'Renee',
      perk:        'Death Guard (Passive) + Life Return (Active)',
      passiveName: 'Death Guard',
      passiveDesc: 'When you take a lethal attack, survive with 1 HP remaining.',
      activeName:  'Life Return',
      activeDesc:  'Activate during Saint Installation: forcibly end Saint Install while retaining your current HP.',
    },
    malzeno: {
      name:        'Malzeno',
      perk:        'Frontline Resupply (Active) + High-Load Ammunition (Passive)',
      passiveName: 'High-Load Ammunition',
      passiveDesc: 'Activates when HP falls below 50%: doubles normal attack damage for 10 seconds. The effect persists across Grids.',
      activeName:  'Frontline Resupply',
      activeDesc:  'Immediately enters Dual-Wield Guard Break. Cannot be activated during Saint Installation.',
    },
    sheetTitle:  'Select a Partner',
    tagActive:   'ACTIVE',
    tagPassive:  'PASSIVE',
    howtoActive: 'Active Skill: Swipe the enemy screen "from bottom to top" during battle to activate',
    howtoSaint:  'Saint Install: Swipe the enemy screen "all the way from left to right" to activate at any time\n——The lower your HP, the longer it lasts',
    select:      'Select This Partner',
    back:        'Back',
  },
  /* ═══ 8. 敵人名 ═══ */
  enemies: {
    faceless:      'Underground Saint',
    facelessgiant: 'Giant Saint',
    intruder:      'Intruder · ???',
    witch:         'Gunwitch',
    trainee:       'Training Saint',
  },
  /* ═══ 9. 監察官（Freya）═══ */
  inspector: {
    name:          'Freya',
    fallbackName:  'Inspector',
    executionLine: 'Melted down? How gruesome.',
    interceptLine: 'Wait! A new enemy!',
    dialogues: {
      S:    'How is this possible? You actually managed to do this!',
      A:    'Would you be interested in joining the Thirteenth Order? We need someone like you.',
      B:    'Not bad at all.',
      C:    'Just a little stronger than average, I suppose...?',
      D:    '...Has your commander been training you properly?',
      E:    '………………',
      lose: '(Inspector defeat line pending)',
    },
    bossDialogues: {
      S:    'With that kind of skill, you may one day stand shoulder to shoulder with the commander!',
      A:    'To think someone like you exists among HUND...!',
      B:    'Thanks to you, we actually managed to defeat an opponent like that!',
      C:    'I knew I had not misjudged you.',
      D:    'Good work. That was a brutal battle.',
      E:    'Medical team! Do not let them die!',
      lose: '...Confirmed shutdown of HUND unit {rand3}. Good work.',
    },
  },
  /* ═══ 10. 結算畫面 ═══ */
  result: {
    winTitle:     'Judgment',
    winSub:       '{name} Purified',
    winSubBy:     { harm:'{name} Purified', human:'{name} Defeated', ship:'{name} Sunk',
                    target:'{name} Destroyed', beast:'{name} Hunted',
                    slay:'{name} Slain' },
    loseTitle:    'The Light Fades',
    loseSub:      'HUND has fallen...',
    gradeCap:     'RATING',
    expLabel:     'EXP {n}',
    rowCombo:     'COMBO',
    rowHits:      'HITS TAKEN',
    rowAccuracy:  'ACCURACY',
    rowPerfectCtr:'PERFECT COUNTERS',
    rowCtrDamage: 'TOTAL COUNTER DAMAGE',
    rowTime:      'BATTLE TIME',
    tagFlawless:  'NO DAMAGE',
    rowCounter:   'Counter',
    rowPerfect:   'Perfect Guard',
    timesUnit:    '{n} Times',
    dmgUnit:      '{n} DMG',
    timeMinSec:   '{m}m {s}s',
    timeSec:      '{s}s',
    newRecord:    '★ NEW RECORD ★',
    rematch:      'Take Up Arms Again',
    loseContinue: 'Continue',
    loseRetry:    'Fight Again',
    loseGiveUp:   'Give Up',
    intercept:    'Intercept',
    lineMissing:  '(Inspector line pending)',
  },
  /* ═══ 11. 過渡禎 ═══ */
  transitions: {
    tapHint:  'Tap the screen to continue',
    startCn:  'PURGE INITIATED',
    finishCn: 'PURGE COMPLETE',
    failCn:   'PURGE FAILED',
  },
  /* ═══ 12. 教學關卡 ═══ */
  tutorial: {
    steps: {
      battleStart: [
        { who:'inspector', text:'The practical examination begins. HUND, show me whether your fundamentals are sound.' },
        { who:'partner',   text:'Don’t be nervous! Tap the Grid below in numerical order. Every hit will fire at the enemy!' },
        { who:'partner',   text:'The enemy will not attack during this round—get a feel for the controls first. But misclicking or stopping for too long will still get you hurt.' },
      ],
      board1: [
        { who:'inspector', text:'Your fundamentals are acceptable. Next—the enemy will begin to counterattack.' },
        { who:'partner',   text:'When the enemy charges up, a ring will appear on the screen. That is your cue to guard!' },
      ],
      threat: [
        { who:'partner',   text:'The ring will keep shrinking—act too early and you will only "Guard," taking half damage!' },
        { who:'partner',   text:'Wait until the ring is small enough, then hit it at the right moment for a "Perfect Guard"! You will take no damage!' },
        { who:'inspector', text:'Show me your guard.' },
      ],
      defended: [
        { who:'inspector', text:'A decent guard. Remember—counter just before the enemy strikes, and your Sub-Weapon will deal heavy damage.' },
        { who:'partner',   text:'But don’t force a counter. If it feels dangerous, just guard.' },
        { who:'inspector', text:'In that case, I will not be lenient with my evaluation.' },
        { who:'inspector', text:'Each Sub-Weapon has different effects and counter timing. Choose the weapon that best suits your talents.' },
      ],
      strike: [
        { who:'inspector', text:'Careful!' },
      ],
    },
    script: {
      dualReady:  [ { who:'partner',   text:'The enemy is exposed! Now!' } ],
      dualGo:     [ { who:'partner',   text:'The enemy cannot resist! Ignore the order and attack with everything you have!' } ],
      saintCall:  [ { who:'inspector', text:'No time. Activate Saint Install now!' } ],
      saintStart: [ { who:'inspector', text:'You cannot die before Meltdown, but every hit you take will accelerate it!' },
                    { who:'inspector', text:'No mistakes! If you survive this round, you still have a chance to turn this around!' } ],
      saintFail:  [ { who:'partner',   text:'You can’t hold out! Leave it to me!' } ],
      finishMB:   [ { who:'inspector', text:'You made it through. Your strength has recovered somewhat. Now, let us end this battle!' } ],
      finishLR:   [ { who:'inspector', text:'You made it through. Now, let us end this battle!' } ],
    },
    scold: {
      wrong: [
        'Look carefully at the numbers before you move. Your partner cannot take that hit for you.',
        'Panicking? Following the order is the most basic of fundamentals.',
      ],
      delay: [
        'Why did you stop? The enemy will not wait for you.',
        'That is the price of hesitation. Remember this pain.',
      ],
      early: [
        'Too early! Pay closer attention!',
      ],
      attackDuringThreat: { first:'How about DEFENDING?!', rest:'.........' },
      dead: 'Unbelievable. Do it over!',
    },
    guideLabels: {
      click: 'CLICK!',
      right: 'SWIPE RIGHT',
      up:    'SWIPE UP',
    },
    skipConfirm: {
      title: 'Skip the tutorial?',
      sub:   'You can replay it anytime via TUTORIAL on the home screen',
      yes:   'Skip',
      no:    'Continue',
    },
    result: {
      buttonLabel:    'Continue',   /* ver -358 起教學結算無監察官——其餘台詞欄位已清（ver -567） */
    },
  },
  /* ═══ 13. Credit／原作 面板 ═══ */
  sheets: {
    creditTip:    'Tap a track to visit the composer’s page',
    creditClose:  'Close',
    creditUse: {
      mainMenu:   'Main Menu',
      missionFail:'Mission Failed',
      result:     'Results Screen',
      battle:     'Battle Screen',
      boss:       'Boss Battle',
      flight:     'Voyage Screen',
    },
    originalNote: '(Links to the visual novel. Both sites have completed serialization.)',
    originalBaha: 'Bahamut',
    originalClose:'Close',
    copyright:    '© 2026 Eternal Original Sin (E.O.S.) · All Rights Reserved.',
    eosName:      'Eternal Original Sin',
  },
  /* ═══ 14. Boss 戰 S 級獎勵 ═══ */
  sentou: {
    saintInstallBtn: 'SAINT INSTALL...?',
    tapReturn:       'T A P   T O   R E T U R N',
  },
};

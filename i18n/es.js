/* ============================================================================
 *  i18n/es.js — Paquete de idioma español（母本＝i18n/zh.js、構造完全一致）
 *  ---------------------------------------------------------------------------
 *  專有名詞一律照 reference/TIVOT_Glossary_ZH_EN_JA_ES.xlsx 的 Español 欄。
 *  [EN-STYLE]／[KEEP] 的字樣照母本規則不譯（RELOADING／OVERKILL／SAINT INSTALL…）。
 *  引號用西語慣用的 «»。
 * ========================================================================== */

export const STRINGS = {

  /* ═══ 1. 首頁 ═══ */
  home: {
    title:        'La IV Orden del Testamento',
    start:        'DESAFÍO',
    storyStart:   'HISTORIA',
    tutorialBtn:  'TUTORIAL',
    continueBtn:  'CONTINUAR',
    weaponLabel:  'Arma Secundaria',
    partnerLabel: 'COMPAÑERA',
    creditBtn:    'Credit',
    originalBtn:  'Original',
    statsBtn:     'Admin',
    prepTitle:    'Preparativos de Salida',
    prepGo:       'Empuñar las Armas',
  },

  /* ═══ 2. 載入畫面 ═══ */
  loading: {
    loadingMsg:   'C A R G A N D O',
    tapContinue:  'T O C A   P A R A   C O N T I N U A R',
    hints: [
      'Cada arma de contraataque tiene su propio momento eficaz. No pierdas la calma.',
      'Contraatacar demasiado pronto es seguro, pero el daño es muy limitado.',
      'Cuanto más grave la situación, más vale el Saint Install. Si sientes que no aguantas más, no lo dudes.',
      'Coordínate bien con tu compañera y el combate será mucho más llevadero, ¿no crees?',
      'El combo hace que cada bala duela más. En cuanto tus dedos se detienen, todo vuelve a cero.',
      'Si dudas demasiado, el enemigo no se quedará esperando. No dejes de mover los dedos.',
      'Una casilla equivocada se paga con sangre. Mira bien antes de actuar.',
      'Los impactos consecutivos afilan tus críticos. Falla una vez y vuelves a empezar.',
      'Cuanto más se cierra el círculo rojo, más vale el contraataque. Arriesgarte o no, eso lo decides tú.',
      'Bloquear no significa salir ileso: medio daño sigue siendo daño.',
      'Cuando el medidor esté lleno, no te lo guardes. Esas pistolas están ahí para mantenerte con vida.',
      'Un asalto limpio y sin errores hará que la guardia del enemigo se rompa con más facilidad.',
      'Cada golpe que recibes durante el Saint Install te empuja más cerca del abismo.',
      'Si aguantas hasta el último disparo del Saint Install, regálale un veinte por ciento más de dolor.',
      'Los tres segundos tras la caída del enemigo son para el Juicio Adicional. No los desperdicies.',
      'Si acabas con demasiadas heridas, mi evaluación no será precisamente bonita.',
    ],
  },

  /* ═══ 3. 戰鬥中 UI／浮動字 ═══ */
  battle: {
    coopMode:     'La Manada del Depredador',
    skipBtn:      'SKIP',
    testClear:    'Despejar',
    reloading:    'RELOADING',
    perfectClear: 'Despeje Perfecto +{n}',
    tooSlow:      'Muy lento',
    crit:         'Crítico ',
    hitByAssault: 'Impacto',
    overkill:     'OVERKILL!',
    overkillAdd:  'OVERKILL +{n}',
    counter:      'COUNTER!',
    perfect:      'PERFECT',
    block:        'BLOCK',
    blockDmg:     'BLOCK −{n}',
    miss:         'MISS',
    boltCd:       'RELOAD',
    tooSlowEn:    'TOO SLOW',
    saintMode:    'SAINT MODE',
    lifeReturn:   'Retorno Vital',
    deathGuard:   'Guardia Mortal',
    immune:       'Inmune',
  },

  /* ═══ 4. 退出確認框 ═══ */
  exitConfirm: {
    title:    '¿Volver al menú principal?',
    sub:      'No se guardará el progreso de este combate',
    stay:     'Seguir jugando',
    leave:    'Menú principal',
  },

  /* ═══ 5. Cut-in 演出（title 大字／sub 副標）═══ */
  cutins: {
    saintInstall:      '¡¡Descenso del Santo!!',
    dualBreak:         'Lluvia de Balas',
    deathGuard:        'Guardia Mortal',
    /* ⚠ 與 modules/saint.js 的 triggerMaxBurst 互指（鐵律 7 的但書）：改回血量要四語一起改。 */
    mbSub:             'Juicio Adicional · HP restaurado al máximo',
    nmbSub:            'Juicio Adicional · HP devuelto',
    executeSub:        '{name} · Aniquilado',
    lifeReturnSub:     'Retorno Vital · HP conservado',
    obeSub:            'O.B.E. · HP 1',
    newHustle:         'NEW HUSTLE INCOMING',
  },

  /* ═══ 6. 副武器（選單全名／首頁綽號／規格文案）═══ */
  weapons: {
    MG_Squall: {
      name:      'Ametralladora B1901 «Picadora de Carne»',
      shortName: 'Picadora de Carne',
      desc:      'Efecto de contraataque\nCírculo amarillo: −50 % de daño\nCírculo naranja: guardia total\nContraataque: 8 disparos × 6 de daño\nProb. de crítico: 20 %\nUna opción fiable y equilibrada',
    },
    Shotgun_Blast: {
      name:      'Escopeta de Doble Cañón «Puño de Hierro»',
      shortName: 'Puño de Hierro',
      desc:      'Efecto de contraataque\nCírculo amarillo: −75 % de daño\nCírculo naranja: 6 disparos × 2 de daño\nContraataque: 6 disparos × 4 de daño\nProb. de crítico: 20 %\nLa elección prudente para sobrevivir',
    },
    Sniper_Falcon: {
      name:      'Rifle 85 «Devorador de Corazones»',
      shortName: 'Devorador de Corazones',
      desc:      'Efecto de contraataque\nCírculo amarillo: sin reducción de daño\nCírculo naranja: sin reducción de daño\nContraataque: 1 disparo de 72 de daño\nProb. de crítico: 20 %\nUn único golpe en el que te lo juegas todo',
    },
    sheetTitle:  'Elegir Arma Secundaria',
    select:      'Elegir esta arma',
    back:        'Volver',
  },

  /* ═══ 7. 搭檔（名字／技能）＋選人選單 ═══ */
  partners: {
    renee: {
      name:        'Renée',
      perk:        'Guardia Mortal (pasiva) + Retorno Vital (activa)',
      passiveName: 'Guardia Mortal',
      passiveDesc: 'Al recibir un ataque letal, el jugador sobrevive con 1 HP.',
      activeName:  'Retorno Vital',
      activeDesc:  'Solo durante el Saint Install: lo interrumpe de inmediato y conserva el HP actual.',
    },
    malzeno: {
      name:        'Malzeno',
      perk:        'Reabastecimiento de Primera Línea (activa) + Munición de Alta Carga (pasiva)',
      passiveName: 'Munición de Alta Carga',
      passiveDesc: 'Se activa al bajar del 50 % de HP: duplica el daño del ataque normal durante 10 segundos; el efecto se mantiene entre tableros.',
      activeName:  'Reabastecimiento de Primera Línea',
      activeDesc:  'Entra de inmediato en la Rotura de Guardia a Dos Pistolas. No se puede usar durante el Saint Install.',
    },
    sheetTitle:  'Elegir Compañera',
    tagActive:   'Activa',
    tagPassive:  'Pasiva',
    howtoActive: 'Habilidad activa: en combate, desliza de abajo arriba sobre la pantalla del enemigo',
    howtoSaint:  'Saint Install: desliza de lado a lado sobre la pantalla del enemigo cuando quieras\n— cuanto menos HP, más dura',
    select:      'Elegir a esta compañera',
    back:        'Volver',
  },

  /* ═══ 8. 敵人名（UI 只顯示底線前半）═══ */
  enemies: {
    faceless:      'Santo Subterráneo',
    facelessgiant: 'Santo Gigante',
    intruder:      'Intruso · ???',
    witch:         'Bruja de las Armas',
    trainee:       'Santo de Entrenamiento',
  },

  /* ═══ 9. 監察官（芙蕾雅）＝結算台詞 ═══ */
  inspector: {
    name:          'Freya',
    fallbackName:  'Inspectora',
    executionLine: '¿Fusión? Qué espanto.',
    interceptLine: '¡Alto! ¡Hay un nuevo enemigo!',
    dialogues: {
      S:    '¿Cómo es posible? ¡Llegar hasta este punto!',
      A:    '¿Te interesaría unirte a la Decimotercera Orden? Necesitamos gente como tú.',
      B:    'No está nada mal, ¿verdad?',
      C:    '¿Solo un poco mejor que una persona normal...?',
      D:    '... ¿De verdad tu comandante te entrena como es debido?',
      E:    '..................',
      lose: '(Línea de derrota de la Inspectora pendiente)',
    },
    bossDialogues: {
      S:    '¡Puede que tu fuerza esté a la altura de la de tu comandante!',
      A:    '¡Que entre los HUND exista alguien como tú...!',
      B:    '¡Gracias a ti, hasta un rival así ha caído!',
      C:    'No me equivoqué contigo.',
      D:    'Buen trabajo. Ha sido una batalla terrible.',
      E:    '¡Equipo médico! ¡No dejéis que muera!',
      lose: '...... Confirmado el cese de funciones del HUND n.º {rand3}. Buen trabajo.',
    },
  },

  /* ═══ 10. 結算畫面 ═══ */
  result: {
    winTitle:     'Juicio',
    winSub:       '{name} purificado',
    winSubBy:     { harm:'{name} purificado', human:'{name} derrotado', ship:'{name} hundido',
                    target:'{name} destruido', beast:'{name} cazado', aerial:'{name} purificado',
                    slay:'{name} abatido',
                    multi:'{name} repelido' },
    loseTitle:    'La Luz Sagrada se Apaga',
    loseSub:      'El HUND ha caído…',
    gradeCap:     'Evaluación',
    expLabel:     'EXP {n}',
    rowRecord:    'Registro de Combate',
    recordGain:   'Registro de Combate +{n}',
    rowCombo:     'Combo',
    rowHits:      'Golpes recibidos',
    rowAccuracy:  'Precisión',
    rowPerfectCtr:'Contraataque Perfecto',
    rowCtrDamage: 'Daño de contraataque',
    rowTime:      'Tiempo de combate',
    tagFlawless:  'Sin daño',
    rowCounter:   'Contraataque',
    rowPerfect:   'Guardia Perfecta',
    timesUnit:    '{n} veces',
    dmgUnit:      '{n} de daño',
    timeMinSec:   '{m} min {s} s',
    timeSec:      '{s} s',
    newRecord:    '★ NEW RECORD ★',
    rematch:      'Volver a Empuñar',
    loseContinue: 'CONTINUAR',
    loseRetry:    'REINTENTAR',
    loseGiveUp:   'RENDIRSE',
    intercept:    'Interceptar',
    lineMissing:  '(Línea de la Inspectora pendiente)',
  },

  /* ═══ 11. 過渡禎（全畫面轉場）═══ */
  transitions: {
    tapHint:  'Toca la pantalla para continuar',
    startCn:  'Comienza la Purga',
    finishCn: 'Purga Completada',
    failCn:   'Purga Fallida',
  },

  /* ═══ 12. 教學關卡 ═══ */
  tutorial: {
    /* 劇情版教學（諾薇兒）—— 結構與 zh.js 相同；`img` 是表情差分鍵，照抄不譯。
       ⚠ `board1` 保持空陣列（不可刪鍵，否則退回芙蕾雅那一份）。 */
    story: {
      steps: {
        battleStart: [
          { who:'nouvelle', img:'tut_nouvelle_cringe',
            text:'Lo siento... a partir de aquí todo depende de ti. Yo te iré diciendo qué hacer.' },
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'Tranquilo... solo tienes que tocar las casillas de abajo en el orden de los números.' },
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'Parece que el enemigo todavía está observando... ve cogiéndole el tacto. ¡Pero si fallas o te detienes demasiado, atacará igualmente!' },
        ],
        board1: [],
        threat: [
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'¡Se acerca el ataque del enemigo! ¡Detenlo con tu arma secundaria!' },
        ],
        defended: [
          { who:'nouvelle', img:'tut_nouvelle_surprise',
            text:'¡Cuanto más cerca del instante de su ataque contraatacas, más fuerte es el golpe!' },
        ],
        strike: [
          { who:'nouvelle', img:'tut_nouvelle_cringe', text:'¡Cuidado...!' },
        ],
      },
      script: {
        dualReady:  [ { who:'nouvelle', img:'tut_nouvelle_surprise', text:'Ha bajado la guardia... ¡ahora!' } ],
        dualGo:     [ { who:'nouvelle', img:'tut_nouvelle_surprise', text:'¡Antes de que se recupere, descarga todo tu fuego sobre el enemigo que tienes delante!' } ],
        saintCall:  [ { who:'nouvelle', img:'tut_nouvelle_saint', cutin:'cutin_nouvelle_saint',
                        text:'SAINT INSTALL......!' } ],
        saintStart: [ { who:'nouvelle', img:'tut_nouvelle_saint',
                        text:'Hasta que yo... llegue a la fusión, no morirás. Pero cada golpe que recibas la acelerará.' },
                      { who:'nouvelle', img:'tut_nouvelle_saint',
                        text:'No te equivoques... si aguantas este asalto, aún tenemos una oportunidad.' } ],
        saintFail:  [ { who:'nouvelle', img:'tut_nouvelle_saint', text:'¡Aguanta!' } ],
        finishMB:   [ { who:'nouvelle', img:'tut_nouvelle_desperate', text:'Lo hemos superado... y has recuperado algo de fuerza. ¡Acaba con él!' } ],
        finishLR:   [ { who:'nouvelle', img:'tut_nouvelle_desperate', text:'Lo hemos superado... ¡acaba con él!' } ],
      },
      scold: {
        wrong: ['Mira bien los números... por favor.', 'No te asustes... el orden, poco a poco.'],
        delay: ['No puedes detenerte... no va a esperarte.', '¡Si dudas, te harán daño!'],
        early: [],
        attackDuringThreat: { first:'¡Defiéndete...! ¡Ya viene!', rest:'…………' },
        dead: 'No pasa nada... volvamos a intentarlo.',
        img: 'tut_nouvelle_cringe',
      },
      result: null,
    },

    // ── 教學步驟對話（who: inspector=芙蕾雅 / partner=蕾妮）──
    steps: {
      battleStart: [
        { who:'inspector', text:'Comienza la evaluación práctica. HUND, muéstrame si tus fundamentos son sólidos.' },
        { who:'partner',   text:'¡No te pongas nervioso! Toca las casillas de abajo en el orden de los números; ¡cada acierto dispara contra el enemigo!' },
        { who:'partner',   text:'En este asalto el enemigo aún no atacará; aprovecha para cogerle el tacto. Pero si fallas o te detienes demasiado, te harán daño igualmente.' },
      ],
      board1: [
        { who:'inspector', text:'Los fundamentos no están mal. A partir de ahora, el enemigo empezará a contraatacar.' },
        { who:'partner',   text:'Cuando el enemigo carga su ataque, aparece un círculo en la pantalla. ¡Esa es la señal para defenderte!' },
      ],
      threat: [
        { who:'partner',   text:'El círculo se irá cerrando. Si actúas demasiado pronto lo bloquearás, ¡pero el daño del contraataque será muy limitado!' },
        { who:'partner',   text:'¡Espera a que el círculo sea lo bastante pequeño; con el momento justo, el contraataque dolerá de verdad!' },
        { who:'inspector', text:'Demuéstrame que puedes defenderte.' },
      ],
      defended: [
        { who:'inspector', text:'Buen bloqueo. Recuerda: si contraatacas un instante antes de que el enemigo golpee, tu arma secundaria causará un daño enorme.' },
        { who:'partner',   text:'Pero no te fuerces a contraatacar; si lo ves peligroso, basta con defenderte.' },
        { who:'inspector', text:'Aunque, en ese caso, mi evaluación no tendrá piedad.' },
        { who:'inspector', text:'Cada arma secundaria tiene efectos y momentos de contraataque distintos. Elige la que saque partido a tu talento.' },
      ],
      strike: [
        { who:'inspector', text:'¡Cuidado!' },
      ],
    },
    // ── 腳本化段落 ──
    script: {
      dualReady:  [ { who:'partner',   text:'¡El enemigo ha bajado la guardia! ¡Ahora!' } ],
      dualGo:     [ { who:'partner',   text:'¡Antes de que se recupere, descarga todo tu fuego sobre el enemigo que tienes delante!' } ],
      saintCall:  [ { who:'inspector', text:'¡No hay tiempo, activa el Saint Install ya!' } ],
      saintStart: [ { who:'inspector', text:'No morirás antes de la fusión, ¡pero recibir golpes la acelerará!' },
                    { who:'inspector', text:'¡No falles! ¡Si aguantas este asalto, aún puedes darle la vuelta!' } ],
      saintFail:  [ { who:'partner',   text:'¡No puedo más! ¡Déjamelo a mí!' } ],
      finishMB:   [ { who:'inspector', text:'Por fin lo has superado, y has recuperado algo de fuerza. ¡Ahora termina este combate!' } ],
      finishLR:   [ { who:'inspector', text:'Por fin lo has superado. ¡Ahora termina este combate!' } ],
    },
    // ── 罵人插話（隨機取一句）──
    scold: {
      wrong: [
        'Mira bien los números antes de actuar. Tu compañera no va a recibir ese golpe por ti.',
        '¿Te has asustado? El orden es lo más básico de lo básico.',
      ],
      delay: [
        '¿Para qué detienes las manos? El enemigo no va a esperarte.',
        'El precio de dudar. Recuerda este dolor.',
      ],
      early: [],
      attackDuringThreat: { first:'¡Pues defiéndete de una vez!', rest:'…………' },
      dead: 'Contigo no hay manera. ¡Otra vez!',
    },
    // ── 引導箭頭標示 ──
    guideLabels: {
      click: 'CLICK!',
      right: 'Desliza a la derecha',
      up:    'Desliza hacia arriba',
    },
    skipConfirm: {
      title: '¿Saltar el tutorial?',
      sub:   'Puedes volver a verlo con el botón «Tutorial» del menú principal',
      yes:   'SALTAR',
      no:    'Seguir el tutorial',
    },
    result: {
      buttonLabel:    'Continuar',
    },
  },

  /* ═══ 13. Credit／原作 面板 ═══ */
  sheets: {
    creditTip:    'Toca una pista para ir a la página de su compositor',
    creditClose:  'Cerrar',
    creditUse: {
      mainMenu:   'Main Menu',
      missionFail:'Mission Failed',
      result:     'Resultados',
      battle:     'Combate',
      boss:       'Combate contra el jefe',
      northport:  'Puerto Norte',
      harmBoss:   'Combate contra un jefe Azote',
      flight:     'Navegación',
    },
    originalNote: '(Enlaces a la novela ilustrada; ya está completa en ambas plataformas)',
    originalBaha: 'Bahamut',
    originalClose:'Cerrar',
    copyright:    '© 2026 Eternal Original Sin (E.O.S.) · All Rights Reserved.',
    eosName:      'Pecado Original Eterno',
  },

  /* ═══ 14. Boss 戰 S 級獎勵（銭湯インストール）═══ */
  sentou: {
    saintInstallBtn: 'SAINT INSTALL...?',
    tapReturn:       'T O C A   P A R A   V O L V E R',
  },
};

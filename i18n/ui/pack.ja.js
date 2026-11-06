/* 由 tools/i18n_xlsx.py build 從 i18n_ui.xlsx 產生 —— 不要手改，改 Excel 再重跑。 */
export const STRINGS = {
 "home": {
  "title": "聖約第四騎士団",
  "start": "挑戦",
  "storyStart": "物語を始める",
  "tutorialBtn": "チュートリアル",
  "continueBtn": "つづきから",
  "weaponLabel": "副武装",
  "partnerLabel": "パートナー",
  "creditBtn": "Credit",
  "originalBtn": "原作",
  "statsBtn": "管理画面",
  "prepTitle": "出撃準備",
  "prepGo": "銃を取る"
 },
 "loading": {
  "loadingMsg": "読　込　中",
  "tapContinue": "タ　ッ　プ　し　て　続　行",
  "hints": [
   "カウンターの有効時間は武器によって異なります。慌てないように。",
   "早すぎるカウンターは安全ですが、ほとんどダメージになりません。",
   "死にかけるほど、聖徒化の価値は高まります。もう無理だと思ったら、迷わず使いなさい。",
   "パートナーとうまく連携すれば、戦いはもっと楽になるでしょう。",
   "コンボが続くほど、弾丸の威力は増します。",
   "迷っている間も、敵は待ってくれません。手を止めないように。",
   "一マスでも撃ち間違えれば、代償は血です。よく見てから動きなさい。",
   "連続ヒットがクリティカルを研ぎ澄まします。一度でもミスすれば、最初からやり直しです。",
   "赤い円が小さいほど、カウンターの価値は高まります。賭けるかどうかは、ご自分で決めなさい。",
   "ガードしたからといって、無傷とは限りません。半減しても、ダメージは残ります。",
   "ゲージが満ちたら、惜しまず使いなさい。その二丁拳銃は、命を守るためのものですから。",
   "鮮やかに決めれば、敵の体勢は崩れやすくなります。",
   "聖徒化中に受ける攻撃が、あなたを深淵へと追い込んでいきます。",
   "聖徒化の最後の一発は、さらに二割の苦痛を与えます。",
   "敵が倒れてからの三秒間は、追撃の審判の時間です。無駄にしないように。",
   "傷が多すぎれば、私の評価も厳しくなります。"
  ]
 },
 "battle": {
  "coopMode": "狩人の共闘",
  "skipBtn": "SKIP",
  "testClear": "クリア",
  "reloading": "RELOADING",
  "perfectClear": "パーフェクトクリア +{n}",
  "tooSlow": "遅すぎ",
  "crit": "クリティカル ",
  "hitByAssault": "被弾",
  "overkill": "OVERKILL！",
  "overkillAdd": "OVERKILL +{n}",
  "counter": "COUNTER！",
  "perfect": "PERFECT",
  "block": "BLOCK",
  "blockDmg": "BLOCK −{n}",
  "miss": "MISS",
  "boltCd": "RELOAD",
  "tooSlowEn": "TOO SLOW",
  "saintMode": "SAINT MODE",
  "lifeReturn": "ライフリターン",
  "deathGuard": "デスガード",
  "immune": "免傷"
 },
 "exitConfirm": {
  "title": "メインメニューに戻りますか？",
  "sub": "現在の進行状況は保存されません",
  "stay": "続ける",
  "leave": "メインメニューに戻る"
 },
 "cutins": {
  "saintInstall": "セイント\nインストール！！",
  "dualBreak": "弾雨の嵐",
  "deathGuard": "即死防御",
  "mbSub": "追加聖裁",
  "nmbSub": "追加聖裁",
  "executeSub": "{name} · 消滅",
  "lifeReturnSub": "ライフリターン · HP維持",
  "obeSub": "O.B.E. · HP 1",
  "newHustle": "NEW HUSTLE INCOMING"
 },
 "weapons": {
  "MG_Squall": {
   "name": "B1901陣地機関銃「ミンチメーカー」",
   "shortName": "ミンチメーカー",
   "desc": "カウンター効果\n黄リング：ダメージ50%軽減\n橙リング：完全防御\nカウンター：8発×6ダメージ\nクリティカル率：20%\n攻守のバランスに優れた信頼の一挺"
  },
  "Shotgun_Blast": {
   "name": "二連式散弾銃「鉄拳」",
   "shortName": "鉄拳",
   "desc": "カウンター効果\n黄リング：ダメージ75%軽減\n橙リング：6発×2ダメージ\nカウンター：6発×4ダメージ\nクリティカル率：20%\n生存力に優れた堅実な選択"
  },
  "Sniper_Falcon": {
   "name": "八五式ライフル「ハートイーター」",
   "shortName": "ハートイーター",
   "desc": "カウンター効果\n黄リング：ダメージ軽減なし\n橙リング：ダメージ軽減なし\nカウンター：一発72ダメージ\nクリティカル率：20%\nすべてを賭ける一撃必殺"
  },
  "sheetTitle": "副武装を選択",
  "select": "この武器を選択",
  "back": "戻る"
 },
 "partners": {
  "renee": {
   "name": "レニー",
   "perk": "即死防御（パッシブ）＋ライフリターン（アクティブ）",
   "passiveName": "即死防御",
   "passiveDesc": "致死量のダメージを受けた際、HPを1残して生存する。",
   "activeName": "ライフリターン",
   "activeDesc": "聖徒化中に発動：聖徒化を強制終了し、現在のHPを維持する。"
  },
  "malzeno": {
   "name": "マルゼーノ",
   "perk": "前線補給（アクティブ）＋高装薬弾（パッシブ）",
   "passiveName": "高装薬弾",
   "passiveDesc": "HPが50%以下になると発動：10秒間、通常攻撃のダメージが2倍になる。効果は盤面をまたいで継続する。",
   "activeName": "前線補給",
   "activeDesc": "即座に二丁拳銃によるガードブレイク状態へ移行する。聖徒化中は発動できない。"
  },
  "sheetTitle": "パートナーを選択",
  "tagActive": "アクティブ",
  "tagPassive": "パッシブ",
  "howtoActive": "アクティブスキル：戦闘中、敵画面を「下から上へスワイプ」して発動",
  "howtoSaint": "聖徒化：敵画面を「左右いっぱいにスワイプ」すればいつでも発動可能\n——HPが低いほど、持続時間が長くなる",
  "select": "このパートナーを選択",
  "back": "戻る"
 },
 "enemies": {
  "faceless": "地下聖徒",
  "facelessgiant": "巨型聖徒",
  "intruder": "乱入者 · ???",
  "witch": "銃の魔女",
  "trainee": "訓練用聖徒"
 },
 "inspector": {
  "name": "フレイヤ",
  "fallbackName": "監察官",
  "executionLine": "熔断した？　なんとも凄惨ですね。",
  "interceptLine": "待って！　新たな敵よ！",
  "dialogues": {
   "S": "まさか……ここまでできるなんて！",
   "A": "第十三騎士団に入る気はない？　あなたのような人材が必要なの。",
   "B": "なかなかいいんじゃない？",
   "C": "普通より少し強い、といったところかしら……？",
   "D": "……あなたの団長は、ちゃんと訓練しているの？",
   "E": "………………",
   "lose": "（監察官の敗北台詞・未定）"
  },
  "bossDialogues": {
   "S": "その実力なら、団長と肩を並べる日も来るかもしれないわね！",
   "A": "HUNDに、あなたのような人がいるなんて……！",
   "B": "あなたのおかげで、あんな相手まで倒せたなんて！",
   "C": "やっぱり私の目に狂いはなかったわね。",
   "D": "お疲れさま。壮絶な戦いだったわね。",
   "E": "医療班！　絶対に死なせないで！",
   "lose": "……HUND-{rand3}号の機能停止を確認。お疲れさまでした。"
  }
 },
 "result": {
  "winTitle": "聖裁",
  "winSub": "{name}を浄化",
  "winSubBy": {
   "harm": "{name}を浄化",
   "human": "{name}を撃破",
   "ship": "{name}を撃沈",
   "target": "{name}を破壊",
   "beast": "{name}を狩猟",
   "aerial": "{name}を浄化",
   "slay": "{name}を討伐",
   "multi": "{name}を撃退"
  },
  "loseTitle": "聖光消滅",
  "loseSub": "HUND、倒れる…",
  "gradeCap": "評価",
  "expLabel": "EXP {n}",
  "rowRecord": "戦闘記録",
  "recordGain": "戦闘記録 ＋{n}",
  "rowCombo": "コンボ数",
  "rowHits": "被弾数",
  "rowAccuracy": "命中率",
  "rowPerfectCtr": "パーフェクトカウンター",
  "rowCtrDamage": "カウンター総ダメージ",
  "rowTime": "戦闘時間",
  "tagFlawless": "ノーダメージ",
  "rowCounter": "Counter カウンター",
  "rowPerfect": "パーフェクトガード",
  "timesUnit": "{n} 回",
  "dmgUnit": "{n} ダメージ",
  "timeMinSec": "{m}分{s}秒",
  "timeSec": "{s}秒",
  "newRecord": "★ NEW RECORD ★",
  "rematch": "再び銃を取る",
  "loseContinue": "つづける",
  "loseRetry": "再戦",
  "loseGiveUp": "あきらめる",
  "intercept": "迎撃",
  "lineMissing": "（監察官の台詞・未定）"
 },
 "transitions": {
  "tapHint": "画面をタップして続行",
  "startCn": "駆逐開始",
  "finishCn": "駆逐完了",
  "failCn": "駆逐失敗"
 },
 "tutorial": {
  "story": {
   "steps": {
    "battleStart": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_cringe",
      "text": "對不起……接下來只能靠你了。我會在這裡告訴你該怎麼做。"
     },
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "不要緊張……照著數字的順序點下面的盤面就好。"
     },
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "敵人似乎還在觀察……不過失誤、或者停太久的話，敵人還是會攻過來的！"
     }
    ],
    "board1": [],
    "threat": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "敵人的攻擊要來了！用強力的副武器阻止他！"
     }
    ],
    "defended": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "越接近敵人攻擊的瞬間反擊威力越強！"
     }
    ],
    "strike": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_cringe",
      "text": "危險——！"
     }
    ]
   },
   "script": {
    "dualReady": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "牠露出破綻了……就是現在！"
     }
    ],
    "dualGo": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_surprise",
      "text": "在敵人恢復態勢前，對著視野中的敵人傾洩火力吧！"
     }
    ],
    "saintCall": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_saint",
      "cutin": "cutin_nouvelle_saint",
      "text": "SAINT INSTALL......！"
     }
    ],
    "saintStart": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_saint",
      "text": "在我......熔斷之前你不會死。可是每挨一下，熔斷就會更快。"
     },
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_saint",
      "text": "不要出錯……只要撐過這一回合，就還有機會。"
     }
    ],
    "saintFail": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_saint",
      "text": "堅持住！"
     }
    ],
    "finishMB": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_desperate",
      "text": "撐過來了……體力也回來一些了。收拾他吧！"
     }
    ],
    "finishLR": [
     {
      "who": "nouvelle",
      "img": "tut_nouvelle_desperate",
      "text": "撐過來了……收拾他吧！"
     }
    ]
   },
   "scold": {
    "wrong": [
     "看清楚數字……拜託你。",
     "別慌……順序，慢慢來就好。"
    ],
    "delay": [
     "不能停下來……牠不會等你的。",
     "猶豫會受傷的！"
    ],
    "early": [],
    "attackDuringThreat": {
     "first": "防禦——！要來了！",
     "rest": "…………"
    },
    "dead": "沒關係……我們再來一次。",
    "img": "tut_nouvelle_cringe"
   },
   "result": null
  },
  "steps": {
   "battleStart": [
    {
     "who": "inspector",
     "text": "実戦試験を開始する。HUND、基礎が身についているか見せてもらいます。"
    },
    {
     "who": "partner",
     "text": "緊張しないで！　下の盤面を数字の順番どおりにタップしてね。命中するたびに敵を攻撃できるよ！"
    },
    {
     "who": "partner",
     "text": "このラウンドでは敵はまだ攻撃してこないよ――まずは操作に慣れてね。でも、押し間違えたり長く止まったりすると、ちゃんとダメージを受けるからね。"
    }
   ],
   "board1": [
    {
     "who": "inspector",
     "text": "基礎は悪くない。次は――敵が反撃を始めます。"
    },
    {
     "who": "partner",
     "text": "敵が力を溜めると、画面にリングが現れるよ。そこで防御！"
    }
   ],
   "threat": [
    {
     "who": "partner",
     "text": "リングはどんどん小さくなる――早すぎても防げるけど、カウンターはほとんど効かないよ！"
    },
    {
     "who": "partner",
     "text": "リングが十分に小さくなってから、正しいタイミングで押せば――カウンターがちゃんと刺さる！"
    },
    {
     "who": "inspector",
     "text": "防いでみせてちょうだい。"
    }
   ],
   "defended": [
    {
     "who": "inspector",
     "text": "いい防ぎ方だ。覚えておきなさい――敵が攻撃する直前にカウンターを決めれば、副武装で大ダメージを与えられる。"
    },
    {
     "who": "partner",
     "text": "でも、無理にカウンターを狙わないでね。危ないと思ったら、防ぐだけで十分だよ。"
    },
    {
     "who": "inspector",
     "text": "それでは、私の評価は甘くはなりませんよ。"
    },
    {
     "who": "inspector",
     "text": "副武装によって効果もカウンターのタイミングも異なる。自分の才能を活かせる武器を選びなさい。"
    },
    {
     "who": "partner",
     "guide": "wswitch",
     "text": "戦況に応じて副武装を切り替えよう！"
    }
   ],
   "strike": [
    {
     "who": "inspector",
     "text": "来る！"
    }
   ]
  },
  "script": {
   "dualReady": [
    {
     "who": "partner",
     "text": "敵に隙ができた！　今よ！"
    }
   ],
   "dualGo": [
    {
     "who": "partner",
     "text": "敵が体勢を立て直す前に、視界の敵に火力を叩き込んで！"
    }
   ],
   "saintCall": [
    {
     "who": "inspector",
     "text": "もうダメ。今すぐ聖徒化しなさい！"
    }
   ],
   "saintStart": [
    {
     "who": "inspector",
     "text": "熔断までは不死身だ！だが、攻撃を受けるほど焼き切れるのが早くなる！"
    },
    {
     "who": "inspector",
     "text": "ミスは禁止！　このラウンドを耐え切れば、逆転のチャンス！"
    }
   ],
   "saintFail": [
    {
     "who": "partner",
     "text": "もうダメ！　私に任せて！"
    }
   ],
   "finishMB": [
    {
     "who": "inspector",
     "text": "なんとか乗り切りましたね。体力も少し回復しました。さあ、この戦いを終わらせましょう！"
    }
   ],
   "finishLR": [
    {
     "who": "inspector",
     "text": "なんとか乗り切りましたね。さあ、この戦いを終わらせましょう！"
    }
   ]
  },
  "scold": {
   "wrong": [
    "数字をよく見てから動きなさい。パートナーが代わりにこの一撃を受けてはくれません。",
    "焦ったか？　順番を守るのは基本です。"
   ],
   "delay": [
    "何をしている？　敵は待ってくれませんよ。",
    "迷った代償です。この痛み、覚えておきなさい。"
   ],
   "early": [],
   "attackDuringThreat": {
    "first": "防御をしなさい！",
    "rest": "…………"
   },
   "dead": "参りましたね……。やり直し！"
  },
  "guideLabels": {
   "click": "CLICK！",
   "right": "右にスワイプ",
   "up": "上にスワイプ"
  },
  "skipConfirm": {
   "title": "チュートリアルをスキップしますか？",
   "sub": "ホームの「チュートリアル」からいつでも見直せます",
   "yes": "スキップ",
   "no": "続ける"
  },
  "result": {
   "buttonLabel": "つづける"
  }
 },
 "sheets": {
  "creditTip": "曲名をタップすると作曲者のページへ移動します",
  "creditClose": "閉じる",
  "creditUse": {
   "mainMenu": "Main Menu",
   "missionFail": "Mission Failed",
   "result": "リザルト画面",
   "battle": "戦闘画面",
   "boss": "Boss戦",
   "northport": "北方泊地",
   "harmBoss": "禍魘BOSS戰",
   "flight": "航行画面"
  },
  "originalNote": "（ビジュアルノベルへのリンク。両サイトとも連載完結済み）",
  "originalBaha": "Bahamut",
  "originalClose": "閉じる",
  "copyright": "© 2026 Eternal Original Sin (E.O.S.) · All Rights Reserved.",
  "eosName": "永遠の原罪"
 },
 "sentou": {
  "saintInstallBtn": "SAINT INSTALL...?",
  "tapReturn": "タ ッ プ し て 戻 る"
 }
};

/* ══════════════════════════════════════════════════════════════════════
   mainScript.js — 主線 scene 鏈（TIVOT_SCRIPT_ARCHITECTURE §5）
   ──────────────────────────────────────────────────────────────────────
   主線**純線性**，不被任何條件過濾。scene 用 next 串成鏈，一段接一段跑；
   跑到某段時 setStage / setFlags 推進度。

   ⚠ **主線不讀 stage、不讀好感**（規格 §0.2 單向資料流：主線寫，其餘讀）。
     所以這裡的 scene **結構上就不該出現** when / requires / minTier 這類欄位。
     要分歧，靠玩家「去特定場景找特定角色」觸發支線，不靠對話選項（規格 §0.3）。

   ── scene 格式 ────────────────────────────────────────────────────
     { sceneId:'唯一名字',
       next:'下一段的 sceneId',   // null＝鏈結束，交還控制權
       setStage: 1,               // 選填：播完後設 stage
       setFlags:['nouvelle_joined'],  // 選填：播完後設的旗標
       context:'scene',           // scene / battle / field（過濾用，非分檔依據）
       lines:[ … ] }

   ── line 格式（規格 §3，所有腳本檔共用）────────────────────────────
     { speaker:'RENNA',          // 必填。查 speakers.js 得顯示名，也決定高亮誰
       text:'……',                // 必填。可寫 {P} ＝ 主角名（**顯示時才代換**）
       portrait:{                // 可省 ＝ 沿用上一句的畫面狀態
         char:'RENNA',           //   畫誰的立繪。省＝speaker 本人
         expr:'smile',           //   表情差分 id（查 speakers.js 的 ART[].expr）
         show:true },            //   是否在場。省＝沿用
       cg:'noue_fall' }          // 可省。全屏插圖，蓋過立繪

     ⚠ **只寫「變化」的部分。** 只換表情就只寫 {expr:'…'}，其餘沿用上一狀態。
     ⚠ **站位不寫**（規格 §3 原有的 pos 已移除，Ray 定案）：
       右位＝該段對話的**發起位**，發起人（lines[0].speaker）固定站右，
       其他人在左側輪替。由 story.js 自動判定，腳本不必也不該指定。
     ⚠ **明暗不寫**：未說話者壓暗由渲染層依 speaker 自動處理（CLAUDE.md §6.5）。
     ⚠ 插入戰鬥寫 { battle:'battleId' }，戰鬥系統接手；戰鬥**中**的觸發台詞
       掛在 battles.js 的該場戰鬥 triggers，不寫在這裡。

   ⚠ 口氣守則（四人語域、日文層、呼稱表）一律見 **flight/script/STYLE.md**，
     不要在本檔另寫一份 —— 複製會走鐘。
   ══════════════════════════════════════════════════════════════════════ */

/* ⚠⚠ 以下全部是**示範用的佔位內容**，等 Ray 的正式主線稿替換。
   放著的目的只有一個：讓「首頁 story 鈕 → 播主線 → 存讀檔」整條流程
   現在就跑得起來、測得出來。正式開稿時整段刪掉重寫。 */
export const MAIN_SCRIPT = {

  /* ══ 地宮：追擊 → 戰鬥教學 → 璐娜莉亞登場（Ray 的第一段正式稿）══════════
     ⚠ 演出欄位（bg/cg/cgPan/ci/se/shake/fx）的規格見 modules/story.js 的
       「演出層」註解。全部「只寫變化」，省略＝沿用上一句。
     ⚠ 這一段有**兩個素材缺口**，先照現況接、不要當成完成品：
       · 彈殼落地音沒有這個檔（se/ 裡最接近的只有 reload 與各槍種射擊音）。
       · 諾薇兒的五張表情差分是**不同姿勢**，取景值 top/bot/fx 還沒逐張量，
         目前沿用 front 那一組，人會偏（見 speakers.js 的警告）。 */
  dungeon_chase: {
    sceneId:'dungeon_chase',
    next:'dungeon_lunaria',
    context:'scene',
    lines:[
      /* 情境卡：先立背景，蓋半透黑，打時間與地點（Ray 指定）。
         ⚠ 這一拍沒有台詞也沒有立繪 —— speaker 只是為了讓資料結構一致，
           有 card 的句子不顯示對話框。 */
      { speaker:'NOUVELLE', text:'',
        bg:'HolyseeDungeonWhole', bgm:'crisis',
        card:'1908年6月13日\n聖王廳地宮　G2 區',
        /* ⚠ 一定要明寫 show:false —— 立繪的預設是 show:true，不寫的話她會先用
           base 立繪站在卡片後面，下一句才換成跑姿，看起來像閃了一下。 */
        portrait:{ char:'NOUVELLE', show:false } },
      /* 開場：腳步聲與喘息。 */
      { speaker:'NOUVELLE', text:'追、追上來了！', se:'se_steps',
        portrait:{ char:'NOUVELLE', expr:'run', show:true } },
      /* ⚠ 這一拍要抖（Ray 指定）。抖的是場景各層，對話框不抖 —— 見 style.css
         的 `#storyStage.shake` 選擇器清單。 */
      { speaker:'NOUVELLE', text:'啊！', shake:true, se:'se_Fall',
        portrait:{ expr:'cringe' } },
      /* 跌倒：切全屏插圖。⚠ cg 一上來就蓋住立繪，所以這一句不必也不要再改 expr。 */
      /* ⚠ 對話框**等平移跑完再出**（Ray 指定）。2600 與 CSS 的平移時間同值 ——
         改一邊要改另一邊（style.css 的 storyPanUp/Down）。 */
      { speaker:'NOUVELLE', text:'別管我！你快走！', delay:2600,
        /* ⚠ 由下往上（Ray 指定）：這張是跌倒的構圖，由上往下平移會**停在裙底**，
           往上才會收在臉上。平移的終點就是這一格的重點，方向不能隨便給。 */
        cg:'001_Nouvelle_Fell', cgPan:'up' },
      /* 上膛：兩聲隔 0.5 秒交疊。 */
      { speaker:'NOUVELLE', text:'你……！',
        se:[{n:'se_weapon_reload'},{n:'se_weapon_reload',delay:500}] },
      /* ⚠ 這裡**不插讀取頁**：開場那一頁已經把整條 scene 鏈都預載了
         （preloadStory 跟著 next 走）。要在別處插的話寫 `{ load:'sceneId' }`。 */
      /* 戰鬥教學。⚠ 戰鬥系統尚未接線，story.js 目前會跳過並在 console 記一筆。 */
      { battle:'tutorial' },
    ],
  },

  dungeon_lunaria: {
    sceneId:'dungeon_lunaria',
    next:'hq_audience',
    setFlags:['dungeon_cleared'],
    context:'scene',
    lines:[
      /* 戰勝之後：聖徒咆哮。⚠ **先咆哮＋震動，立繪才出來**（Ray 指定）——
         同一句同時上插圖、上聲音、上立繪的話，咆哮的衝擊會被她的台詞稀釋。
         這一拍沒有台詞也沒有立繪，玩家點一下推過去。 */
      /* ⚠ 這一拍**沒有台詞也沒有對話框**（ver -327，Ray：「不要先出空白的諾薇兒
         對話框」）。story.js 看到 text 為空就不出框。
         ⚠ `auto` = 咆哮音長（Se_enemy_Saintroar 實測 3.34 秒）＋一點餘裕：
         聲音放完自己推到下一句，於是「對話框與立繪一同出現」。玩家想快轉照樣可以點。
         ⚠ 改音檔要改這個數字 —— 沒有自動對時的機制。 */
      /* ⚠ 002 直接當**背景**，不要當插圖（Ray 指定）。插圖層在立繪之上，
         下一句要看到立繪就得把它收掉 —— 那一收一放就是「閃動」。
         當背景的話它從這一拍開始**完全不動**，立繪直接疊上去。 */
      { speaker:'NOUVELLE', text:'', auto:3500,
        bg:'002_SaintAssult', bgPan:'up', se:'se_saintroar', shake:true,
        portrait:{ char:'NOUVELLE', show:false } },
      /* ⚠⚠ 這一句要**把插圖收掉**（cg:null）。插圖的層級在立繪之上，不收的話
         她整個被蓋住 —— Ray 回報「『對不起，我已經……！』的立繪一直沒出來」
         就是這個，不是位置問題。凡是要看到立繪的句子，插圖都得先讓開。 */
      /* ⚠ 背景換成**插圖 002**（Ray 指定）——「插圖收掉」不等於「回地宮」，
         聖徒撲上來的那張要留在她背後當場景，只是要退到立繪之下才看得到她。
         story.js 的 bg 會依「NNN_ 開頭」自動去 illustration/ 找（見 imgSrc）。 */
      /* ⚠ 這一句**什麼背景都不要寫**：上一拍已經是 002 了，再寫一次會觸發換圖
         （即使同一張，也會走一次淡出淡入）—— Ray：「背景不要動」。 */
      { speaker:'NOUVELLE', text:'對不起，我已經……！',
        portrait:{ expr:'desperate', show:true } },
      /* 暗調 CI 插入。⚠ 說話的是「？？？」不是 LUNARIA —— 這一刻她還沒表明身分，
         顯示名要真的是「？？？」（見 speakers.js 的說明）。 */
      /* ⚠⚠ 璐娜莉亞走**正規立繪**（右側滑入），不是全屏 CI（Ray：「她的比例明顯
         與諾薇兒不同，戰鬥中的對話立繪版面分配一概比照飛行畫面」）。
         走立繪系統才會鎖身高、才會與諾薇兒同一把尺 —— CI 那條路是自己一套縮放，
         比例對不上是必然的。
         ⚠ dark:true＝暗調（還沒表明身分的剪影感）；諾薇兒**留在畫面上**，
           所以這一句不動她的 portrait。 */
      { speaker:'UNKNOWN', text:'讓開。', dark:true,
        portrait:{ char:'UNKNOWN', show:true } },
      /* ⚠ 璐娜莉亞這一拍**退場**（Ray 指定）：立繪是持續狀態，不明寫 hide 她會一直站著。 */
      { speaker:'NOUVELLE', text:'！！', hide:'UNKNOWN',
        portrait:{ char:'NOUVELLE', expr:'scared' } },
      /* 密集掃射：⚠ 打在**插圖上**（Ray 原稿：「002_SaintAssult 圖上出現大量密擊
         快速槍擊點」），所以這一拍把插圖叫回來。 */
      /* 密集槍擊：命中點灑在 002 上，畫面同時抖一下。
         ⚠ 這一句沒有台詞（text 空字串）——它是**演出拍**，玩家點一下推過去。
         ⚠ 槍聲用 se_lunaMG（Ray 指定）。原稿另有「彈殼落地音」那一拍，
           但 resources/audio/se/ 裡沒有那個素材，先缺著。 */
      /* ⚠ 同樣是**沒有對話框**的演出拍。`auto` 略長於掃射（2 秒）——
         沒有框也沒有 ▼ 提示，不自己走的話畫面會停在那裡看起來像卡住。
         抖動由 story.js 依 fx 自動抖滿整段（Ray：「抖動要連續直到射擊效果停止」）。 */
      /* ⚠ 掃射這一拍**畫面上不要有人**（Ray 指定）：這是「子彈打在牆上」的鏡頭，
         不是誰在講話。兩位都要明寫 hide —— 立繪是持續狀態，不寫會一直站著。 */
      { speaker:'UNKNOWN', text:'', auto:2200, hide:['NOUVELLE','UNKNOWN'],
        fx:'gunfire', shake:true, se:'se_lunaMG' },
      /* 回地宮。⚠ cg:null 要明寫，否則插圖會一直蓋著。 */
      /* ⚠ 這一句**只留諾薇兒**（Ray 指定）。璐娜莉亞要明寫 hide 請下台 ——
         立繪是持續狀態，不寫的話她會一直站在右邊。 */
      /* ⚠ `show:true` 不可省：上一拍（掃射）把兩位都 hide 了，而 show 是**沿用**的 ——
         不明寫的話她永遠不會回來（Ray：「那一句要彈 Nouvelle_SI_Surprise 立繪」）。 */
      { speaker:'NOUVELLE', text:'那就是......聖約第四騎士團的......',
        cg:null, bg:'HolyseeDungeonWhole',
        portrait:{ expr:'surprise', show:true } },
      /* 璐娜莉亞的插畫。
         ⚠ 演變：由下往上平移（-337）→ 以臉為中心緩慢推近（-339，cgZoom）→
           **直接放大＋由下往上移到頂**（-343，Ray 指定：「不要做放大效果，直接放大，
           然後從下上移到頂」）。放大的**過程**在滿版插圖上會被讀成畫面在抖 ——
           與 -340 把換圖改成黑幕是同一個道理：訊號不要碰到插圖本身。
         ⚠ 所以 `cgScale` 是「一上來就是這麼大」，會動的只有平移；不要再配 cgZoom。
         ⚠ 往上移的終點正好是她的臉（臉在圖上 y≈0.09，靠近頂）—— 方向不能反。 */
      { speaker:'NOUVELLE', text:'璐娜莉亞團長……！',
        cg:'003_Lunaria_Armed', cgScale:1.18, cgPan:'up' },
      /* ── 團長登場 ──
         先**情境卡報地點**（ver -351，Ray 指定「之後接場景介紹：聖王廳地宮 G2入口，
         然後再進對話」）—— 與開場那張卡同一套黑透罩。
         ⚠ 換 BGM＋換背景＋收插圖都放在**卡片這一拍**：收插圖走黑幕，黑幕正好把
           「插圖消失、背景換回地宮」這兩件事一起藏起來，收乾淨才亮出卡片。
         ⚠ 卡片這一拍不出對話框（story.js 看到 `card` 就不出框），玩家點一下推進。 */
      /* ⚠ 卡片這一拍要**清場**（ver -353，Ray：「G2入口時諾薇兒的立繪還在，撤掉，
         說話才出來」）。上一拍她站在左邊，而立繪是持續狀態 —— 不明寫 `hide` 她會
         留在卡片後面，情境卡就變成「有人站在旁邊的地點介紹」。
         ⚠ `portrait` 一句只能指定一個人，要**同時**讓另一個人退場就用 `hide`。 */
      { speaker:'LUNARIA', text:'',
        cg:null, bg:'HolyseeDungeonWhole', bgm:'lunaria',
        card:'聖王廳地宮　G2入口', hide:['NOUVELLE'],
        portrait:{ char:'LUNARIA', show:false } },
      { speaker:'LUNARIA', text:'在G2就熔斷了嗎？真是派不上用場。',
        portrait:{ char:'LUNARIA', expr:'angry', show:true } },
      { speaker:'NOUVELLE', text:'真的……非常抱歉！',
        portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      { speaker:'LUNARIA', text:'不是在說妳。', portrait:{ char:'LUNARIA', expr:'angry' } },
      { speaker:'LUNARIA', text:'如果你也是HUND的話，不要依賴他人的力量如何？',
        portrait:{ expr:'taunt' } },
      { speaker:'LUNARIA', text:'算了。13th來人了，說是要來找這傢伙。',
        portrait:{ expr:'angry' } },
      { speaker:'NOUVELLE', text:' 13th……第十三騎士團嗎！？',
        portrait:{ char:'NOUVELLE', expr:'surprise' } },
      { speaker:'NOUVELLE', text:'你到底又闖了什麼禍啊……', portrait:{ expr:'cringe' } },
      /* ⚠ 交界插**讀取閘門**（ver -348）：會客廳那一幕自己 2.3 MB，不該擠進開場那一道門。
         `collectAssets` 看到「這一段有 load 指向自己的 next」就**不再往下算**，
         所以開場只載地宮，這裡才載會客廳。 */
      { load:'hq_audience' },
    ],
  },



  /* ══ 第四騎士團駐地會客廳：監察官登場（Ray 的第二段正式稿，ver -348）══════
     ⚠ 這一幕她**全程叫「監察官」**（speaker `OFFICER`），下一幕才正名蕾娜（`RENNA`）——
       Ray 定案：「當作兩個角色就好」。所以第一句那個「？？？」不必另立 id，
       直接用 OFFICER；玩家看到的就是「監察官」自報家門。
     ⚠ 站位：璐娜莉亞在右，監察官與諾薇兒同在左 —— 兩人輪流上場時是「舊的滑出、
       新的滑入」，那是固定站位的既定行為（CLAUDE.md §6.5），不是 bug。
     ⚠ 沒有台詞的「反應拍」（只換表情、沒人說話）給 `auto`，因為沒有對話框就沒有
       ▼ 提示，玩家會以為卡住。900ms 約是一個呼吸。 */
  hq_audience: {
    sceneId:'hq_audience',
    next:null,
    setFlags:['hq_briefed'],
    context:'scene',
    lines:[
      /* 開場：她還沒露臉，先用暗調 CI 插入（Ray 指定「通用，暗調CI插入」）。 */
      /* 情境卡：先立背景、蓋半透黑、打地點（Ray 指定「立繪出來之前先按開頭那樣黑透罩
         介紹場景」）—— 與 dungeon_chase 開場同一套。
         ⚠⚠ `show:false` 不可省：立繪預設 **show:true**，不寫的話監察官會先站在卡片後面，
           下一拍才滑進來，看起來像閃了一下（dungeon_chase 開場那一拍踩過同一個坑）。 */
      { speaker:'OFFICER', text:'',
        bg:'LunariaOffice', bgm:'result',
        card:'第四騎士團駐地\n會客廳',
        portrait:{ char:'OFFICER', show:false } },
      /* ⚠⚠ 她走**正規立繪、從左側滑入**，不是全屏 CI（ver -350，Ray 指定
         「這張立繪要在左邊滑入，不用全身，比照對話播放規則縮放」）——
         與 -319 把璐娜莉亞從 CI 改成正規立繪是同一個決定：走立繪系統才會鎖身高、
         才與同台的人同一把尺；CI 那條路是自己一套縮放，比例對不上是必然的。
         ⚠ **不加 `dark`**（ver -354，Ray：「初次見面時已經有一次暗階，不用再塗黑」）——
           立繪滑進來時本來就會經過一次壓暗（`tone.js` 依背景調色 ＋ 非說話者的 `.dim`），
           再疊一層 `.dark` 就黑到看不出是誰了。剪影感交給那一次就夠。
         ⚠ 台詞在這裡**斷句**：後半「蕾姬娜˙馮˙海森伯格。」要壓在插畫上講（見下一拍）。 */
      { speaker:'OFFICER', text:'初次見面，我是第十三騎士團的監察官，',
        portrait:{ char:'OFFICER', show:true } },
      /* 插圖：蕾娜撥髮。⚠ 這一拍沒有台詞 → 不出框 → 沒有 ▼，所以要 `auto` 自己走。 */
      { speaker:'OFFICER', text:'', auto:1000, cg:'004_Renna_intro' },
      /* 報上名字：**對話框壓在插畫上**（Ray 指定）。插圖是持續狀態，這一拍不動它，
         框自然疊在上面（框 z-7 > 插圖 z-2）；點下去才由下一拍收掉插圖切回立繪。 */
      { speaker:'OFFICER', text:'蕾姬娜˙馮˙海森伯格。' },
      /* ⚠ 插圖要收掉才看得到立繪（插圖層在立繪之上，ver -319 踩過）。 */
      { speaker:'LUNARIA', text:'海森伯格家的人嗎……哼，髮飾挺招搖的嘛。',
        cg:null, portrait:{ char:'LUNARIA', expr:'seat_smirk', show:true } },
      { speaker:'NOUVELLE', text:'璐娜莉亞大人自己還不是……',
        portrait:{ char:'NOUVELLE', expr:'gossip1', show:true } },
      /* 兩拍無聲的對看（Ray 的稿只給了立繪、沒有台詞）。 */
      { speaker:'LUNARIA', text:'', auto:1000, portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'NOUVELLE', text:'', auto:1000, portrait:{ char:'NOUVELLE', expr:'cringe' } },
      { speaker:'OFFICER', text:'您見笑了。我一直想與璐娜莉亞大人見上一面呢。',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'OFFICER', text:'兩年前的極東戰場，家父多得您關照了。',
        portrait:{ expr:'bow' } },
      { speaker:'LUNARIA', text:'兩年前……那老頭是妳爸？',
        portrait:{ char:'LUNARIA', expr:'seat_angry' } },
      { speaker:'OFFICER', text:'正是海森伯格侯爵。', portrait:{ char:'OFFICER', expr:'bow' } },
      { speaker:'LUNARIA', text:'嗯——', portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'LUNARIA', text:'哈哈。', portrait:{ expr:'seat_smirk' } },
      { speaker:'LUNARIA', text:'那條黑毛老狐狸竟能生出妳這樣的美人胚子。',
        portrait:{ expr:'seat_smirk' } },
      { speaker:'OFFICER', text:'髮色是繼承自母親的。跟璐娜莉亞大人一樣的髮色呢，您也是北境出身的嗎？',
        portrait:{ char:'OFFICER', expr:'smile' } },
      { speaker:'LUNARIA', text:'……', portrait:{ char:'LUNARIA', expr:'seat_angry' } },
      { speaker:'LUNARIA', text:'果然是那老頭的女兒嘛……', portrait:{ expr:'seat_angry' } },
      { speaker:'NOUVELLE', text:'那個……', portrait:{ char:'NOUVELLE', expr:'awkward', show:true } },
      { speaker:'NOUVELLE', text:'監察官大人，今天怎麼會要找我們......', portrait:{ expr:'awkward' } },
      { speaker:'OFFICER', text:'別那麼緊張嘛，怎麼大家都把十三課當瘟神？',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'NOUVELLE', text:'沒、沒有，只是……',
        portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      { speaker:'NOUVELLE', text:'第一次碰到監察官，有點緊張。', portrait:{ expr:'shy' } },
      /* ⚠ `expr:null` ＝ 回基本立繪（Renna_SI_front）。省略的話會沿用上一張差分。 */
      { speaker:'OFFICER', text:'這不稀奇呀，妳不也是從第十二騎士團調來輔助他的嗎？',
        portrait:{ char:'OFFICER', expr:null, show:true } },
      { speaker:'NOUVELLE', text:'也是……？', portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      { speaker:'LUNARIA', text:'就是這麼回事了。', portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'LUNARIA', text:'最近北境不太平，禍魘像蛆一樣湧出，襲擊城鎮的頻率暴增。上週就多了四十起，空陸都有。',
        portrait:{ expr:'seat' } },
      { speaker:'LUNARIA', text:'帶著這兩個傢伙，去看看是怎麼回事。', portrait:{ expr:'seat' } },
      /* 主角開口，但沒有台詞：**出框、框裡沒有字**（Ray 指定）。名字取存檔裡的玩家名。 */
      { speaker:'PLAYER', blank:true },
      { speaker:'LUNARIA', text:'你那是什麼表情？', portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'LUNARIA', text:'剛剛要不是這傢伙，你早就沒命了吧？', portrait:{ expr:'seat_smirk' } },
      { speaker:'LUNARIA', text:'不服氣的話，就別依靠別人的力量。', portrait:{ expr:'seat_smirk' } },
      { speaker:'NOUVELLE', text:'不，剛剛那只是我擅自——',
        portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      { speaker:'LUNARIA', text:'不論如何，你們兩個，', portrait:{ char:'LUNARIA', expr:'seat_smirk' } },
      { speaker:'LUNARIA', text:'好好保護好侯爵大人的千金。', portrait:{ expr:'seat_smirk' } },
      /* 監察官無聲的一笑（稿上只給了立繪）。 */
      { speaker:'OFFICER', text:'', auto:1000, portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'NOUVELLE', text:'團長不一起去嗎？',
        portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      /* 稿上這一句原本帶著「（舉起義肢）」—— 那是 Ray 給自己看的舞台指示，不是台詞
         （ver -349，Ray 指定）。動作由 `seat_hand` 這張差分演，字面上不必再說一次。 */
      { speaker:'LUNARIA', text:'我討厭坐船。妳看我這樣子方便嗎？',
        portrait:{ char:'LUNARIA', expr:'seat_hand' } },
      { speaker:'OFFICER', text:'那真是可惜，有璐娜團長的話一定馬上能盪平騷亂。',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'NOUVELLE', text:'然後順便毀了幾座村莊......',
        portrait:{ char:'NOUVELLE', expr:'gossip1', show:true } },
      { speaker:'LUNARIA', text:'妳們兩個竊竊私語什麼？', portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'NOUVELLE', text:'沒、沒有啦！', portrait:{ char:'NOUVELLE', expr:'surprise' } },
      { speaker:'NOUVELLE', text:'只是，監察官大人也要跟我們一起？', portrait:{ expr:null } },
      { speaker:'OFFICER', text:'作作記錄而已，不會礙事的。',
        portrait:{ char:'OFFICER', expr:null, show:true } },
      { speaker:'LUNARIA', text:'話說，你在戰場上能派上什麼用場嗎？', portrait:{ char:'LUNARIA', expr:'seat' } },
      /* 同上：原稿的「（乾笑）」是舞台指示，交給 `awkward` 那張差分演。 */
      { speaker:'OFFICER', text:'盡量不尖叫出聲吧......',
        portrait:{ char:'OFFICER', expr:'awkward', show:true } },
      { speaker:'LUNARIA', text:'......', portrait:{ char:'LUNARIA', expr:'seat' } },
      { speaker:'LUNARIA', text:'......你自求多福吧。', portrait:{ expr:'seat' } },
      { speaker:'NOUVELLE', text:'不要緊的，我也是個術師，我會保護監察官大人的安全！',
        portrait:{ char:'NOUVELLE', expr:'surprise', show:true } },
      { speaker:'OFFICER', text:'唉呀好可靠。多好的女孩呀？',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'LUNARIA', text:'行了，要聊天的話路上聊去。', portrait:{ char:'LUNARIA', expr:'seat_angry' } },
      { speaker:'PLAYER', blank:true },
      { speaker:'LUNARIA', text:'怎麼去？你自己問監察官吧！', portrait:{ char:'LUNARIA', expr:'seat_angry' } },
      { speaker:'OFFICER', text:'先到帝都去吧，交通工具已經備好了。',
        portrait:{ char:'OFFICER', expr:null, show:true } },
      { speaker:'OFFICER', text:'那麼，我們就出發了。', portrait:{ expr:'bow' } },
      /* 腳步聲：兩人離場。⚠ 立繪是持續狀態，不明寫 hide 她們會一直站著。
         ⚠ `se_walk` 有 4.06 秒，這一拍只留 1.4 秒就推走 —— 聲音會蓋到下一句，那是要的
           （她們正走出去，璐娜莉亞從背後喊）。 */
      { speaker:'LUNARIA', text:'', auto:1400, se:'se_walk', hide:['OFFICER','NOUVELLE'] },
      { speaker:'LUNARIA', text:'喂！', portrait:{ char:'LUNARIA', expr:'seat', show:true } },
      { speaker:'LUNARIA', text:'好歹是HUND出身的，別丟了第四騎士團的臉。', portrait:{ expr:'seat' } },
    ],
  },


  prologue_audience: {
    sceneId:'prologue_audience',
    next:'prologue_fall',
    setStage:1,
    context:'scene',
    lines:[
      { speaker:'OFFICER', text:'第四騎士團，{P}。教廷的敕令已經下來了。',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'OFFICER', text:'從今天起，我會跟著你們的船。' },
      { speaker:'OFFICER', text:'名義上是監察。實際上……也是監察。',
        portrait:{ expr:'smile' } },
      { speaker:'NOUVELLE', text:'請多指教。我是諾薇兒，負責隨隊的醫護與祈禱。',
        portrait:{ char:'NOUVELLE', expr:'gentle', show:true } },
      { speaker:'OFFICER', text:'……你就這樣說得像在講天氣。',
        portrait:{ char:'OFFICER', expr:'stunned' } },
    ],
  },

  prologue_fall: {
    sceneId:'prologue_fall',
    next:null,
    setFlags:['prologue_done'],
    context:'scene',
    lines:[
      { speaker:'NOUVELLE', text:'竟然，會有那麼巨型的聖徒！',
        portrait:{ char:'NOUVELLE', expr:'pain', show:true } },
      { speaker:'NOUVELLE', text:'啊！', cg:'noue_fall' },
      { speaker:'NOUVELLE', text:'別管我！快走！' },
      { speaker:'OFFICER', text:'……{P}。這種時候，不要問我該怎麼辦。',
        portrait:{ char:'OFFICER', expr:'fluster', show:true } },
    ],
  },

};

/* 主線的起點。存檔沒有進度時從這裡開始。 */
/* ⚠ 入口暫時指到新寫的地宮段，方便直接驗這一幕。
   正式串主線時改回 'prologue_audience'（或把地宮段接進鏈裡）。 */
export const MAIN_ENTRY = 'dungeon_chase';

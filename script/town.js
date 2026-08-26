/* ══════════════════════════════════════════════════════════════════════
   town.js — 城鎮節點（資料，ver -369）
   ──────────────────────────────────────────────────────────────────────
   城鎮探索是**非線性**的：玩家在節點之間走動，每個節點有自己的背景、出口箭頭，
   以及第一次進去時的對白。這裡只有資料，播放與互動在 `modules/town.js`。

   ── 節點格式 ──────────────────────────────────────────────────────
     bg:'Capital_Square'      背景**基底名**（不含時段）。實際檔名由 clock.bgName() 加尾巴
     name:'攝政王廣場'         情境卡上的地名
     exits:{ up/down/left/right:'節點id' }   箭頭。⚠ 方向就是畫面上的方向
     lines:[…]                進場對白（story 的 line 格式；`once:true` 的節點只播一次）
     once:true                對白只播第一次（旗標記在 progress 的 flags）
     shop:'grocery'           這個節點是商店（貨單見 config.shop）
     keeperWho:'SHOPKEEP'     店主是誰（`speakers.js` 的 id）；不寫就依店的種類給預設
     kind:'gunstore'          **這種店**的識別（ver -401；-402 由 Ray 縮到三家）。
                              寫了它，初見劇情的旗標就是「第一次走進**這種店**」——
                              在帝都沒看到的，到別的城的同一種店還會演；看過就不再重播。
                              ⚠⚠ **只有公會／槍店／雜貨舖有**（Ray 指定）。
                                餐酒館、船塢、行政廳那些是**這一座城自己的戲**：
                                跳過就跳過了，不會在別的城重現 —— 所以不要給它們 `kind`。
     hours:[開,關]            營業時間（小時，24 制；不寫＝全天）。跨午夜寫 [20,2] 也對
     closed:'…'              打烊時點畫面出現的那一句（沒寫就什麼都不出）
     sail:{flag,blocked}      這個節點的下方是「出航」（見 square）
     chatter:[…]              點畫面隨機路人單句（見下方「路人單句」）

   ⚠ 對白用的是**劇情播放器**（`story.playAdhoc`）—— 立繪取景、明暗、打字機、面盤手勢
     全部與主線同一套。不要在城鎮另寫一個對話框。
   ⚠ **路人單句**（`chatter`，ver -387 由酒館推廣到四處，Ray 指定）：
       酒館＝市井　教堂＝教廷　行政廳＝政治　船塢＝地理情報
     每個地方的內容要對得上那條線 —— 那是玩家在城裡「聽消息」的唯一管道，
     四個地方講一樣的東西就等於只有一個地方。
     ⚠ 這些是**背景人聲**：沒有立繪、也沒有名字，
       讀起來才像鄰桌／隔壁長椅傳來的，而不是有個 NPC 在對你說話。
     ⚠ 互動是**點一下出一句、再點一下收掉**（見 modules/town.js 的 `chatterOn`）——
       收掉之前不出下一句，玩家才有時間讀完。
   ⚠⚠ **店舖畫面**（ver -404，Ray：「把各商店的櫃台按鈕改成店主立繪…不用點擊，
     直接右店主左選單」）：走進商店／武器店／公會就是**右邊店主立繪、左邊選單**，
     不必按任何東西。ver -387 的櫃台鈕（`counter:{x,y}`）已經整個撤掉。
     ⚠ 店主**不放常駐對話框**（Ray：「騰空間出來給選單」）—— 一條全寬的框要吃掉 80px，
       而一張完整的商店單子在 390×844 上就要 306px，留著就塞不下。
     ⚠ 店主是誰寫在 `keeperWho`；沒寫就依店的種類給預設（見 modules/town.js 的 `keeperOf`）。
   ⚠⚠ **營業時間**（`hours`，ver -391，Ray：「城鎮的店鋪都在早上8點開門晚上8點關門，
     旅店24小時開門，酒吧開到00時」）：
       雜貨舖／武器店 `[8,20]`　餐酒館 `[8,24]`　旅店 不寫（全天）
     打烊時：店主與選單都不出現、地名後面加「已打烊」、**進場對白也不播**
     （在一間關著的店裡讓店主開口是錯的；那一段會留到下次營業時間再進來時才播）。
     ⚠ **賞金獵人公會沒有設時間** —— Ray 那一句列的是「店鋪／旅店／酒吧」，公會不在其中，
       所以維持全天。要給它時間就在這裡加 `hours`，程式端不必動。
   ⚠ 口氣守則見 flight/script/STYLE.md，這裡不重寫一份。
   ══════════════════════════════════════════════════════════════════════ */

/* 諾薇兒的差分（縮寫，對到 speakers.js 的 expr）。寫成常數只是為了讓下面的稿子好讀。 */
const N = who => (expr, text, extra) => Object.assign(
  { speaker:who, text:text||'', portrait:{ char:who, expr:expr||null, show:true } }, extra||{});
const nou = N('NOUVELLE'), ren = N('RENNA');
/* 公會那一場的兩位（ver -375）。⚠ 兩個都站**右**（見 speakers.js）——
   玩家的同伴在左、對面的人在右，與店主同一個邏輯。 */
const hun = N('HUNTER'), cnt = N('COUNTER');
const gun = N('GUNSMITH');   // 槍店店主（ver -377）

export const TOWNS = {
  capital: {
    name: '帝都',
    entry: 'square',
    /* 這座城的 BGM（ver -375）。⚠ 有它才能在**插入戰打完回來**時把曲子接回去 ——
       戰鬥有自己的曲子，回城鎮時沒人接的話會一路放著戰鬥曲。 */
    bgm: 'capital',
    /* ══ 傍晚：**強制**回旅店（ver -427，Ray 重寫）══════════════════════════
       兩條觸發，各有各的台詞（Ray 交稿）：
         · 走完所有地點、**還沒到 18:00** → 諾：「時間差不多了，回旅店吧。」
         · **沒走完**、時間過了 18:00     → 諾：「天色不早了，我們先回廣場旅店吧？」
       講完**強制移轉到旅店**（`goto`），時鐘推到 18:00（`hour`）。
       ⚠⚠ 這一版與 ver -392 那一版的差別是「強制」：以前只是一句提醒，玩家可以不理，
         於是「回旅店」變成一句沒有後果的話。現在它是**流程的一站**。
       ⚠ 「回**廣場**旅店」那三個字 ver -393 曾被拿掉（旅店掛在上街區，會把玩家指錯
         方向）—— ver -427 Ray 又寫回來了，而這一版是**強制移轉**，玩家不必自己走，
         所以指不指錯已經不成立。照他的稿。
       ⚠ 兩條同時成立時（走完了而且過了 18:00）走**時間**那一句：那時「天色不早了」
         才是玩家看得到的事實。
       ⚠ **優先所有事件**：它會取代那一次抵達原本要演的進場對白 —— 那一段的旗標不會記，
         下次再進來還是會演（同「打烊不播」的作法）。
       ⚠ 只演一次（旗標 `town_evening_nudge`）。**在旅店裡不演** —— 那時走的是
         旅店自己的分支二（諾：「今天有點累了，我先去休息囉。」），旗標由那一支記
         （Ray 的規則四／五：「若3發生而主角已在旅店，走5」）。
       ⚠ `allSeen` 不算旅店自己（那是目的地）。 */
    evening: {
      hour: 18,
      flag: 'town_evening_nudge',
      goto: 'inn',
      bySeen: [ nou(null,'時間差不多了，回旅店吧。') ],
      byTime: [ nou(null,'天色不早了，我們先回廣場旅店吧？') ],
    },
    /* ══ 一次性的操作提示（ver -429）══════════════════════════════════════
       `need` 的旗標到齊了 → 下一次「走到某個地點、對白演完」時彈一次雪鐵龍箭，
       彈過就記 `flag` 不再出現。判定在 `modules/town.js` 的 `tipDue()`。
       ⚠⚠ 整備教學**移到取得「龍息」之後**（Ray 指定；原本掛在出航前那一幕）——
         那時玩家手上才真的多了一把可以換的槍，教他去換副武器才有意義。
       ⚠ `got_Shotgun_Dragon` 是**發獎品時記的**（`modules/inspector.js` 的 `scriptSettle`，
         旗標名由武器 id 推出來，不寫死是哪一把，鐵律 1）。
       ⚠ 為什麼不做成腳本裡的 `hint` 那一拍：獎品是**有條件**的（30 秒內、而且還沒有），
         而腳本沒有條件式的拍 —— 掛在旗標上才不會「沒拿到也教你去換」。 */
    tips: [
      { need:'got_Shotgun_Dragon', flag:'tip_gear',
        at:'pend', text:'點槍棺左上的吊墜　→　整備（選搭檔、換副武器）' },
    ],
    /* ══ Stage 0 的結尾（ver -427，Ray 定案）══════════════════════════════
       「不論用任何方式到達／經過早上七點就進入 stage1，始於船塢。」
       ＝ 睡覺、獨自坐坐、在城裡亂逛通宵，三條路都算 —— 判定收在
       `modules/town.js` 的 `clockGate()` 那**一支**（鐵律 8）。
       ⚠ `hour:7` 指的是**開局之後的第一個 7 點**（開局是 6/13 11:00 → 6/14 07:00），
         由 `clock.firstHourAt` 換算成絕對分鐘數 —— 不是「每天早上七點」。
       ⚠ `stage:1` ＝ 同時把 `progress` 的章節推到 1（測試期間的預設是 3）。
       ⚠ 掛在**這座城**上：stage 0 整段都發生在帝都。日後別的城要有自己的閘門
         就在那座城上寫一個。 */
    stage1: { hour: 7, stage: 1, flag: 'stage1_open', goto: 'dock' },
    nodes: {

      /* ══ 攝政王廣場 ══ 上＝中心區、左＝舊街區、右＝上街區（Ray 指定的三個方向） */
      square: {
        bg:'Capital_Square', name:'帝都　攝政王廣場',
        exits:{ up:'midtown', left:'oldtown', right:'uptown' },
        once:true,
        lines:[ nou('surprise','帝都的攝政王廣場，好壯觀。'),
                nou('surprise','每次看都覺得很震憾呢。') ],
        /* ══ 出航（ver -387，Ray：「預設的城鎮入口下方為『出航』。在到達取得船支的
             劇情前，點擊出航諾薇兒會要求要等蕾娜，船還沒好」）══
           ⚠ 掛在**城鎮入口**這個節點上（`entry`），不是每個節點都有 —— 城裡走到一半
             隨處都能起飛的話，城鎮探索就沒有「要走回去」這件事了。
           ⚠ `flag` 還沒立起來之前一律攔下來。立旗標的是**主線**（拿到船的那一幕），
             這裡只讀（progress.js 的資料流：主線寫、其餘讀）。 */
        sail:{
          flag:'got_ship',
          blocked:[
            nou('surprise','現在就要出航嗎？'),
            nou('awkward','可是……蕾娜小姐還沒回來呢。'),
            { speaker:'PLAYER', blank:true },
            nou(null,'船也還沒整備好啦。再等等，好不好？'),
          ],
        },
      },

      /* ══ 一、中心區 ══ 左＝行政廳、右＝教堂、下＝廣場 */
      midtown: {
        bg:'Capital_Midtown', name:'帝都　中心區',
        exits:{ left:'cityhall', right:'church', down:'square' },
      },

      /* (1) 教堂 */
      church: {
        bg:'Capital_Church', name:'帝都　大教堂',
        exits:{ back:'midtown' },
        once:true,
        lines:[
          nou('surprise','雖說不及聖王廳，不過帝都的大教堂真是氣派呢。'),
          /* ⚠ `sadsmile`：她想起蕾妮（搭檔，**不是**蕾娜）。這兩個名字全專案最容易寫錯。 */
          nou('sadsmile','上一次來，還是跟蕾妮團長一起。'),
          { speaker:'PLAYER', blank:true },
          /* ⚠ 稿上這一句標的是 `Renna_SI_awkwerd`，但講話的是**諾薇兒**（「我沒事啦」）——
             判斷是抄稿時的欄位錯位，改用她的 `awkward`。若原意真是蕾娜，說一聲改回去。 */
          nou('awkward','我沒事啦。只是有時候會想起她……'),

        ],
        /* 路人單句：**教廷**線（ver -387）。 */
        chatter:[
          '永夜以來，聖約騎士團變得比帝國軍還可靠呢。',
          '軍隊好像拿那些「禍魘」一點辦法都沒有。果然，還是要靠神的力量啊！',
          '『永夜』之後來告解的人多了一倍，長椅都不夠坐。',
          '將聖約騎士團投入戰鬥，換作兩年前根本無法想像。',
          '比起先皇，達米西安陛下與教廷的關係更緊密了。',
          '要不是有騎士團，就連這帝都也會「禍魘」橫行吧？',
          '聽說東邊有個小村子整個被「禍魘」吞噬了。啊，神啊！',
          '這「永夜」究竟要持續到什麼時候......該死的夜之魔女！',
        ],
      },

      /* (2) 行政廳 */
      cityhall: {
        bg:'Capital_Cityhall', name:'帝都　行政廳',
        exits:{ back:'midtown' },
        /* ⚠ 蕾娜與諾薇兒**都是左側**（固定站位），這一段兩人同台 → 蕾娜暫時站右
           （§6.5：兩個角色要分左右；與 `capital_square` 那一幕同樣的整幕覆寫）。 */
        sides:{ RENNA:'R' },
        once:true,
        lines:[
          ren('surprise','你們兩個怎麼跑這裡來了？'),
          nou('awkward','四處逛逛一不自覺就……'),
          ren('smile','這地方挺無聊的，你們先去旅店安頓好吧？'),
          nou(null,'有沒有什麼我可以幫忙的？'),
          ren('stare','有。你的同伴已經走掉了，幫我看好他。', { se:'se_walk' }),
          nou('run','啊——！', { se:'se_steps' }),
        ],
        /* 路人單句：**政治**線（ver -387）。 */
        chatter:[
          '雖然蒼月戰爭結束了，可是帝國海軍又擴編了。',
          '「永夜」之後各國把大部份的軍力都用來確保航線，沒空打仗了吧。',
          '又是「禍魘」嗎？不知道這個帝都守不守得住......',
          '文件下個月再來吧，蓋章的那位休假。',
          '教廷插手軍務——換前任皇帝根本不可能。',
          '小聲點。帝都裡連路燈都有長耳朵。',
          '稅跟物價都越來越高了......這個國家到底怎麼了？',
        ],
      },

      /* ══ 二、舊街區 ══（ver -375；-376 由 Ray 定案出口與背景）
         左＝槍店、右＝賞金獵人公會、上＝船塢、下＝廣場。
         ⚠ 背景是 `Capital_Downtown`（Ray 指定）。`Capital_Uptown` 還給上街區 ——
           -371 那次是把兩張圖對調過，現在對回來了。 */
      oldtown: {
        bg:'Capital_Downtown', name:'帝都　舊街區',
        exits:{ left:'gunstore', right:'guild', up:'dock', down:'square' },
        lines:[
          nou('cringe','這地方……好像很複雜。'),
          nou('surprise','啊，是要去保養武器嗎？'),
          { speaker:'PLAYER', blank:true },
          nou('bigsmile','沒關係，有你在啊。一起逛逛吧。'),
        ],
      },

      /* ══ 1. 武器店 ══（ver -377）
         ⚠ **還沒有背景**（Ray 還沒給 `Capital_Gunstore`）——`script_lint.py` 會報缺圖，
           那正是我們要的提醒，不要為了讓 lint 全綠而把節點的背景改掉。
         ⚠ 這一段中間插的是**可戰敗**的打靶（`config.battles.range_trainee`）：
           輸了跳到 `range_lose` 那一拍，贏了往下演再 `goto` 合流點。
           分歧的機制見 `modules/story.js` 的 `resumeFrom` 與 `label`/`goto`。 */
      gunstore: {
        /* 背景 `Capital_Firearm_Day`（Ray 於 ver -377 交件）。⚠ 基底名不含時段尾巴，
           其餘時段的差分還沒有 —— 會退回 `_Day`（`bgFor` 會在 console 記一筆）。 */
        bg:'Capital_Firearm', name:'帝都　武器店', kind:'gunstore',
        exits:{ back:'oldtown' },
        shop:'gunstore', keeperWho:'GUNSMITH',
        hours:[8,20], closed:'鐵門拉下來了。門邊的牌子寫著「八點開門」。',
        lines:[
          gun(null,'噢，客人，你腰上那把槍，我有否榮幸……'),
          /* 空畫面：主角把槍遞過去的那一拍（稿上寫「（空畫面）」）。 */
          { speaker:'PLAYER', text:'', auto:900, hide:['GUNSMITH'] },
          gun(null,'點五〇口徑七……不、八連發半自動，光後座力就能殺人吧！'),
          gun(null,'神父你是有大猩猩的腕力嗎？'),
          nou('gossip1','差不多吧。'),
          gun(null,'我還真沒見過有誰能自如使用這種口徑的手槍。'),
          gun(null,'能否讓我開開眼界？', { hide:['NOUVELLE'] }),
          /* ══ 試槍的邀請：**要／不要**（ver -396，Ray 指定）══
             ⚠ 兩個選項的字是**主角的回答**，所以用他的口吻寫（他不出聲，這是他點的頭）。 */
          { choice:[ { text:'答應', goto:'range_yes' },
                     { text:'拒絕',     goto:'range_no' } ] },
          /* —— 答應 ——
             ⚠ 這一場是**計時挑戰**（固定立靶，不攻擊、點錯加 3 秒）——「戰敗」不存在，
               但**超過 50 秒算沒過關**（`config.battles.range_trainee` 的 `parSec`），
               走的就是下面 `range_lose` 這一支（與打輸共用同一條分歧路）。 */
          Object.assign(gun(null,'好！那邊那個靶，儘管打。'), { label:'range_yes' }),
          /* ⚠⚠ 「三十秒」是 `config.battles.range_trainee.timeAttack.prizeSec`
             （ver -421，Ray：「讓槍店老闆在台詞中提出目前最佳紀錄是 30 秒，
             能突破的話可以得到獎品」）。**改那個數字要改這一句**（兩邊註解互指）——
             獎品也是卡上的 `prize`（現在是短板霰彈槍「龍息」）。 */
          gun(null,'先說好，聯盟這一區的最佳紀錄是三十秒。'),
          gun(null,'破得了的話，牆上那支短板霰彈槍「龍息」就是你的。'),
          { battle:'range_trainee', onLose:'range_lose' },
          /* —— 過關（50 秒內）—— */
          gun(null,'了不起，我們槍匠聯盟都會為您這種身手不凡的客人提供特別客製服務。'),
          { goto:'range_merge' },
          /* —— 婉拒（Ray 交稿）—— */
          Object.assign(gun(null,'是嗎？真可惜。'), { label:'range_no' }),
          { goto:'range_merge' },
          /* —— 沒過關（超過 50 秒）—— */
          Object.assign(gun(null,'果然調校不太行呢。'), { label:'range_lose' }),
          gun(null,'不過，我們槍匠聯盟都會為您這種身手不凡的客人提供特別客製服務。'),
          /* —— 合流 —— */
          Object.assign(gun(null,'一般人我們可不接這種單。'), { label:'range_merge' }),
          gun(null,'每週都有競賽，優勝者也會有獎勵喔！各大城市的聯盟槍店都可以進行挑戰。'),
          gun(null,'那麼，就由我來看看這一對美人是否還能更上一層樓。'),
          /* （修理音）Ray 指定用 `se_ginclick`（ver -378，原本先借的是 `se_metalclip`）。 */
          { speaker:'GUNSMITH', text:'', auto:1200, se:'se_ginclick',
            portrait:{ char:'GUNSMITH', show:true } },
          gun(null,'保養很細心，調校還不到位。如果是要獵殺『禍魘』的話，還需要若干改造才能更順手下來吧。'),
          gun(null,'素材到手之後就送來給我吧，馬上能幫你打出趁手的武器。'),
        ],
        /* 店主對話鈕：**隨機一句**（Ray：「隨機出武器改裝、戰鬥相關知識」）。
           ⚠ 與雜貨舖的 `keeper`（一整段對白）不同，所以欄位分開叫 `keeperRandom`。
           ⚠⚠ 這幾句是**我寫的**，Ray 還沒過目 —— 要換掉直接改這裡。
             內容刻意都是「玩得到的知識」：黃圈橘圈、暴擊怎麼擲、改裝的限制。 */
        /* ══ 再挑戰（ver -398，Ray：「槍店的選單要增加一個射擊挑戰的選項」）══
           櫃台 →「射擊挑戰」→ 走的是**同一場** `range_trainee`（同一份最佳紀錄）。
           ⚠⚠ 這三句是**我寫的**（Ray 只說要加那個選項）—— 要換掉直接改這裡。
           ⚠ 超過標準時間走 `retry_lose`，與劇情那一次共用同一條分歧路。 */
        challengeLines:[
          gun(null,'又想活動筋骨了？靶就在那兒。', { portrait:{ char:'GUNSMITH', show:true } }),
          /* ⚠ 同上：三十秒＝`prizeSec`，獎品＝`prize`。獎品只給一次（已持有就不再發，
             見 `modules/inspector.js` 的 `scriptSettle`），所以這一句寫成「還在檯面上」。 */
          gun(null,'三十秒。破得了，「龍息」歸你。'),
          { battle:'range_trainee', onLose:'retry_lose' },
          gun(null,'漂亮。這才是我想看的手。'),
          { goto:'retry_end' },
          Object.assign(gun(null,'手生了啊。多來幾趟吧。'), { label:'retry_lose' }),
          Object.assign(gun(null,'隨時歡迎。'), { label:'retry_end' }),
        ],
        keeperRandom:[
          '黃圈是硬扛、橘圈保命、紅圈才是真本事。分得清楚，命就長。',
          '霰彈容錯率高，防禦同時也能造成傷害，穩妥的選擇。',
          '栓動步槍沒有沒有容錯。要嘛全中，要嘛全挨，自己掂量。',
          '重機槍一梭子彈下去，打中痛點的機會也多了呢。',
          '『禍魘』可不比人類。本事不夠就躲遠一點吧。',
          '有不錯的素材就來問問，說不定還能將武器改裝一番。。',
          '素材決定上限。好鋼配好膛線，差一階就是差一階。',
          '每把槍都有自己的個性，選自己喜歡的吧。',
        ],
      },

      /* ══ 2. 船塢 ══（ver -379，背景 `Capital_Dock_Day` 由 Ray 交件）
         ⚠ 「明天要搭的船」是**下一段主線的伏筆** —— 這一段只有氣氛，沒有機能。 */
      dock: {
        bg:'Capital_Dock', name:'帝都　船塢',
        exits:{ back:'oldtown' },
        lines:[
          nou('happy','哇，好多船。'),
          nou('happy','不知道明天要搭的船長什麼樣子。'),
          /* 空畫面：遠處水手的吆喝。⚠ 沒有立繪、沒有框，只有聲音（§8.6 的空畫面拍）。 */
          { speaker:'PLAYER', text:'', auto:900, se:'se_SailorShout', hide:['NOUVELLE'] },
          /* 無台詞的立繪拍：她被那一聲嚇到，停一秒（§6.5，從立繪站定才起算）。 */
          { speaker:'NOUVELLE', text:'', auto:1000,
            portrait:{ char:'NOUVELLE', expr:'shocked2', show:true } },
          nou('cringe','明天船上如果有很多人的話，我會緊張……'),
          { speaker:'PLAYER', blank:true },
          /* 稿上這一拍寫的是 `Nouvelle_SI_front`＝**基本立繪**（沒有表情差分）。 */
          nou(null,'嗯，謝謝。我安心多了。'),
        ],
        /* ══ 第二日：出航（ver -424，Ray 交稿；-427 換觸發條件）══════════════
           ⚠ `acts` 是**主線段落**（見 modules/town.js 的 `actDue`）：優先於傍晚提醒
             與進場對白，各自帶旗標與條件。
           ⚠⚠ 條件是 **`need:'stage1_open'`** 不是 `day:2`（ver -427，Ray 定案）：
             stage 0 的結尾是「到達／經過隔天早上七點」，而那一刻玩家會被**強制移到
             這裡**（見 `TOWNS.capital.stage1`）—— 觸發它的是那個閘門，不是日期。
             （`day:2` 那一版還有一個 bug：`dayNo` 算的是「開局起算的 24 小時塊」，
              開局 11:00 → 第 2 天要到隔天 11:00 才成立，早上七點整段不出來。）
           ⚠ 兩段是刻意的：第一段演完整場戲，最後問一次「準備出航」；玩家說「再等等」
             的話旗標照樣記下（那一場戲看過了），下次再來只演**第二段**那一句問答 ——
             不然玩家每次回船塢都要重看一次全部台詞。 */
        acts:[
          { flag:'dock_day2', need:'stage1_open', sides:{ RENNA:'R' },
            lines:[
              ren('watch','28號碼頭的白帆三桅船……有了。'),
              /* 插圖：船。⚠ 無台詞的插圖拍要 `auto`（沒有框就沒有 ▼，§6.5）。 */
              { speaker:'RENNA', text:'', auto:1400, cg:'006_Ship', se:'se_flight_seagull' },
              nou('happy','哇，是木造船！好大喔！'),
              ren(null,'瓦爾士戰爭留下來的輕砲艦，這還算小的呢。'),
              ren('watch','雖然是舊式船體，姑且還是裝載了甲板滑膛砲跟速射砲。'),
              ren('watch','航行途中碰到狀況，也不致於無法應對。'),
              nou('shocked','可是…..這麼大的船要多少人才開得動啊？'),
              ren('watch','機械套索的，有個舵手就能動，至於帆手……這個季節沒有驟風，應該無所謂。'),
              ren('smile','船底有教廷紋章，不用擔心被防空砲打下來。'),
              ren('bow','操舵就交給你囉。'),
              ren(null,'那麼，前往第一個目的地，北方泊地。'),
              /* ⚠⚠ **不再問「準備出航／再等一下」，講完就走**（ver -429，Ray 指定）。
                 整備的操作提示也**移到取得「龍息」之後**（見 `TOWNS.capital.tips`）——
                 那時玩家手上才真的多了一把可以換的槍，教他去換才有意義。
                 ⚠ `set_sail` ＝讀取頁的說明者換成蕾娜的那一刻（`config.loadingHost`）。
                 ⚠ `got_ship` ＝廣場那一格「往下走＝出航」從此打得開 —— 這是**回程的路**：
                   從飛行頁回來之後要能再出航一次，而船塢這一段只演一次。 */
              { goFlight:true, flags:['set_sail','got_ship'] },
            ] },
        ],
        /* 路人單句：**地理情報**線（ver -387）。⚠ 這一條要對得上飛行頁的世界 ——
           講的是航線、風、哪裡有東西，玩家出航之後真的用得上。 */
        chatter:[
          '往薇拉馮德的航線改走南邊了。繞是繞，保險。',
          '這季節北邊的雲層不能飛，掉下去連骨頭都找不到。',
          '法爾登的港封了，貨全積在這裡。',
          '銀月山脈那一段有東西出沒，過那裡就飛高一點。',
          '。',
          '三代艦滿天飛，帝都這種舊河港也不合時宜了。',
          '跑遠洋的都知道：夜裡別關航燈，關了就再也沒人找得到你。',
        ],
      },

      /* ══ 二之一、賞金獵人公會 ══（ver -375）
         ⚠ 這是第一個**帶劇情插入戰**的城鎮節點：對白中間一句 `{ battle:'guild_hunter' }`，
           打完接著往下演（續播由 `story.resumeFrom` 負責，見那支的說明）。
         ⚠ 背景基底寫 `Captal_Guild`（Ray 的檔名就少一個 i，**照檔名**不要自作主張改）。 */
      guild: {
        bg:'Captal_Guild', name:'帝都　賞金獵人公會', kind:'guild',
        exits:{ back:'oldtown' },
        /* 登記完才開得了懸賞榜（旗標由 `modules/town.js` 在這段對白播完時記）。 */
        board:'capital', boardFlag:'guild_registered',
        hours:[8,20], closed:'大門上了閂。委託要等明天早上八點。',
        /* 櫃台接待員（ver -404，站右邊）。⚠ 沒登記過整個店舖畫面都不出現
           （`boardFlag`，旗標由下面那一段對白演完才記）。 */
        keeperWho:'COUNTER',
        lines:[
          nou('surprise','人好多喔。'),
          nou('cringe','『永夜』以後治安變差，好像是真的。'),
          /* 空畫面、無立繪：諾薇兒退場，讓獵人上。⚠ 撤人與新人上場同一拍
             （§6.5 的輪轉換卡）—— 所以 `hide` 掛在獵人第一句上。 */
          hun(null,'生面孔啊，小子。大口徑雙槍，你以為你是那個『槍之魔女』嗎？',
              { hide:['NOUVELLE'] }),
          /* 主角上膛。⚠ 空畫面無立繪 → 獵人也先退場，只剩背景與聲音。 */
          { speaker:'PLAYER', text:'', auto:900, se:'se_ginclick', hide:['HUNTER'] },
          /* 一發。⚠ 仍是空畫面 —— 玩家只聽到槍響，下一拍才看到對方的臉。 */
          { speaker:'PLAYER', text:'', auto:900, se:'se_weapon_pistol_03' },
          /* 無台詞的立繪拍：停一秒（§6.5，從立繪站定才起算）。 */
          { speaker:'HUNTER', text:'',
            portrait:{ char:'HUNTER', expr:'shocked', show:true } },
          hun('attack','你、小、子！'),
          /* ══ 推槍棺，進入戰鬥 ══ 這一場不能聖徒化、不能用搭檔技（見 config.battles）。 */
          { battle:'guild_hunter' },
          hun('lost','服了！我服了！'),
          hun('lost','小哥你其實是有名的獵人吧？'),
          hun('lost','咦？聖約騎士團？'),
          nou('awkward','報名號做什麼啦！'),
          hun('lost','這年頭連教廷都要來搶生意了？你們倒是對那些『禍魘』想點辦法啊！'),
          cnt(null,'算了，你來登記一下。盜賊也好異象也好人手都不夠，騎士也無所謂吧？有實力就好。',
              { hide:['HUNTER'] }),
          nou('surprise','那怎麼行！'),
          { speaker:'PLAYER', blank:true },
          nou('shocked','就算你這麼說……'),
          { speaker:'PLAYER', blank:true },
          nou('concern','……也是，情報源多多益善。'),
          cnt(null,'常來啊，委託常常會更新。手腳得快點，盜賊都快被槍之魔女殺完了。'),
          cnt(null,'各個城市的委託也會不同，加油吧，神父弟弟。'),
        ],
      },

      /* 1. 酒館 ⚠ 還沒有背景素材，暫借西區街道那張（見 HANDOFF 的缺口清單）。 */
      tavern: {
        bg:'Capital_Bistro', name:'帝都　餐酒館',
        exits:{ back:'uptown' },
        /* 開到午夜（Ray 指定）。⚠ `[8,24]` 的意思是 23:59 還開著、00:00 就關 —— 見
           modules/town.js 的 `isOpenNow`（上界是**不含**的）。 */
        hours:[8,24], closed:'椅子都翻上桌了。今晚的最後一輪早就結束。',
        once:true,
        lines:[
          nou('pray','感謝神，賜與我們平安與食糧。願主降福於世——'),
          nou('surprise','你怎麼已經開始吃了？禱詞還沒——'),
          { speaker:'NOUVELLE', text:'',
            portrait:{ char:'NOUVELLE', expr:'shocked', show:true } },
          nou('lookaway','好好吃。'),
        ],
        /* 點畫面隨機一句（Ray：「隨便生個幾串輪播」）。⚠ 這些是**背景人聲**，
           沒有立繪、沒有名字 —— 讀起來才像鄰桌傳來的。 */
        chatter:[
          '——那批貨到底是被劫了還是被「禍魘」襲擊了，根本沒人知道！',
          '莫塔鎮那間餐酒館真的太棒了，店員小姐也好可愛。',
          '永夜之後什麼都貴，連麥酒都摻水了。',
          '好像又要徵兵了......明明沒有在打仗呢。',
          '別提戰爭了，喝你的。',
          '唉，南境葡萄酒變得好貴。',
          '那邊那個修女，好可愛啊。',
        ],
      },

      /* 2. 商店 */
      grocery: {
        /* ⚠ ver -400：Ray 交了時段差分（`_day` / `_dusk`），所以**拿掉 `noTime`** ——
           留著的話候選鏈只會找沒有時段尾巴的 `Capital_Grocerie`，而那張已經不存在了
           → 背景整個不見（Ray 回報「雜貨舖的背景圖不見了」）。 */
        bg:'Capital_Grocerie', name:'帝都　雜貨舖', kind:'grocery',
        exits:{ back:'uptown' },
        shop:'grocery', keeperWho:'SHOPKEEP',
        hours:[8,20], closed:'櫥窗裡的燈熄了，門板上掛著「已打烊」。',
        once:true,
        lines:[
          nou('surprise','好多東西！要是可以不穿司祭服就好了。'),
          { speaker:'PLAYER', blank:true },
          /* 好感度 +1（Ray 指定）。⚠ 走 `aff` 這個欄位，由 modules/town.js 在演到這一拍時記帳；
             ⚠ **只加一次**：`once:true` 的節點對白本來就只播一次，所以不必另外擋。 */
          Object.assign(nou('shy','討厭啦，真會說話。要當神父的人油嘴滑舌可不行喔。'),
                        { aff:{ nouvelle:1 } }),
          { speaker:'SHOPKEEP', text:'歡迎光臨。小店應有盡有，請慢慢看。',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('awkward','還真是什麼都有耶。就是有點貴。'),
        ],
        /* 店主對話鈕（商店頁上的按鈕）→ **一段對白**，不是輪播單句（ver -371，Ray 改稿）。
           ⚠ 兩個人輪流講，所以走 `story.playAdhoc`（有立繪、有明暗、有推進），
             不是 `flashLine`。 */
        keeper:[
          { speaker:'SHOPKEEP', text:'『永夜』以來舶來品都漲翻天啦，這一年好不容易才穩定了點。',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('surprise','啊，是因為海運路線都被禍魘截斷了吧？'),
          { speaker:'SHOPKEEP', text:'是啊。要想買正常的物價，去薇拉馮德比較有機會。',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('bigsmile','薇拉馮德啊……真想去看看呢！'),
          { speaker:'SHOPKEEP', text:'那可是當今世界的中心，一輩子至少要去一次喔。',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('sadsmile','一輩子啊……'),
        ],
      },

      /* ⚠ 旅店**還沒有內容**（Ray 還沒給稿），連背景都沒有。先留節點讓箭頭指得到。 */
      /* ══ 三、上街區 ══（ver -376，Ray：「餐廳旅店跟商店放上街區」）
         左＝雜貨舖、右＝餐酒館、上＝旅店、下＝廣場。
         ⚠ 這一組本來掛在「西區街道」底下；那個節點被改名成舊街區、換了出口之後，
           三家店就跟著搬到這裡（Ray 定案）。背景也一併還原成 `Capital_Uptown`。
         ⚠ 進場對白（肚子餓）跟著一起搬 —— 那一段是**餐酒館的前因**
           （「剛剛才經歷一場死鬥，最後一餐差點就是黑麥麵包配豆子」），
           留在舊街區的話後面那頓飯就沒頭沒尾。要改地方再說。 */
      uptown: {
        bg:'Capital_Uptown', name:'帝都　上街區',
        exits:{ left:'grocery', right:'tavern', up:'inn', down:'square' },
        lines:[
          /* 肚子叫：沒有台詞的一拍（立繪＋音效），停一秒自己走（§6.5）。 */
          { speaker:'NOUVELLE', text:'', auto:1000, se:'Se_Tummy',
            portrait:{ char:'NOUVELLE', expr:'hungry', show:true } },
          nou('hungry','對不起，我肚子有點餓。'),
          { speaker:'PLAYER', blank:true },
          nou('hungry','不、不用在意我啦。'),
          { speaker:'PLAYER', blank:true },
          nou('surprise','咦？你也是？'),
          nou('awkward','也是啦……剛剛才經歷一場死鬥，最後一餐差點就是黑麥麵包配豆子了……'),
          nou('run','走吧！', { se:'se_steps' }),
        ],
      },
      /* ══ 旅店 ══（ver -392，Ray 交稿）
         ⚠ 旅店**不寫 `hours`＝全天**（Ray：「旅店24小時開門」）—— 不是忘了填。
         ⚠ 背景基底改成 `Capital_Hotel`（Ray 交件的檔名；原本寫 `Capital_Inn`，
           那張圖從來就不存在）。晨／黃昏／夜的差分由 `bgFor` 的候選鏈自己挑。
         ⚠ `inn:true` ＝ 這個節點有**旅店大廳**（伙伴門／獨自坐坐／回房睡覺），
           實作在 `modules/inn.js`。 */
      inn: {
        bg:'Capital_Hotel', name:'帝都　旅店', exits:{ back:'uptown' },
        inn:true,
        /* 兩顆行動鈕擺在**背景裡的家具上**（ver -394，Ray：「獨自坐坐按鈕移到茶桌上，
           回房睡覺移到櫃台桌面上方」）。座標是**背景圖上的比例**，同櫃台鈕
           （由 `modules/town.js` 的 `bgPoint` 依 `object-fit:cover` 的裁切換算）。
           ⚠ 這張圖是 3:2 的橫幅、框是直幅 → cover 會把左右各裁掉約 22%，
             **只有 x∈[0.225,0.775] 看得到**。茶桌的圓心（x≈0.22）正好在裁切線上，
             所以錨在桌面**看得見的那半邊**（0.315），不是圓心。 */
        /* 兩顆行動鈕在背景圖上的位置（**圖上的比例**，換算見 modules/town.js 的 bgPoint）。
           ⚠⚠ **睡覺那顆固定在櫃台正上方**（ver -408，Ray 指定）。-407 曾把它移到 0.620
             想與坐坐拉成對角 —— 那個位置**就在蕾娜的門旁邊**，Ray：「搞得好像要去跟蕾娜睡
             一樣，害我產生不必要的期待」。**鈕的位置會被讀成語意**，不要只當版面問題挪。
             兩顆的區別交給樣式（實心／空心）與時間成本那一行，不是靠拉遠。
           ⚠ 坐坐由 `0.315/0.735` 上移到 `0.345/0.605`（ver -409，Ray：「壓到對話框了，
             往上移」）—— 落在**椅背上緣**，語意也對得上（要坐的就是那張椅子）。
             ⚠ x 收在 0.345 而不是 0.395：再往右會與上方的睡覺鈕在橫向上重疊一小段，
               兩顆疊成階梯狀又會被讀成一組選單（同 -407 那個坑）。
             ⚠ 這只是「看起來對」的落點；**真正保證不壓到框的是 `inn.relayout()` 的夾**
               （下界＝對話框上緣）—— 換一台長寬比不同的機器，圖上的同一點會落到不同高度。 */
        /* ⚠ 睡覺鈕由 y 0.450 上移到 **0.385**（ver -430，Ray：「睡覺鈕上移一些」）。
             橫向仍固定在櫃台正上方（0.490）—— 那個 x **不要動**（見上面 -408 的說明：
             往右就落到蕾娜的門旁邊，位置會被讀成語意）。 */
        innSpots:{ sit:{ x:0.345, y:0.605 }, sleep:{ x:0.490, y:0.385 } },
        /* 初訪那一幕。⚠ 中間三拍是**演出**不是台詞：
             ① 畫面抖＋槍棺落地聲（無立繪）
             ② 插圖 `005_Kerberos` 由下往上平移（無立繪）
             ③ 收插圖，回到旅店大廳
           `hide` 要明寫 —— 立繪是持續狀態（§6.5）。 */
        lines:[
          { speaker:'CLERK', text:'歡迎光臨。兩位投宿……呃、客人、那個是……',
            portrait:{ char:'CLERK', show:true } },
          { speaker:'CLERK', text:'', auto:900, shake:true, se:'se_kerberos_drop',
            hide:['CLERK'] },
          { speaker:'CLERK', text:'棺材……？', cg:'005_Kerberos', cgPan:'up', delay:600 },
          { speaker:'CLERK', text:'那麼大件的行李，小店恐怕……', cg:null,
            portrait:{ char:'CLERK', show:true } },
          { speaker:'PLAYER', blank:true },
          { speaker:'CLERK', text:'欸、武器……？',
            portrait:{ char:'CLERK', show:true } },
          nou('surprise','啊、啊啊——我們是聖王廳的僧侶，這不是棺材啦！'),
          nou('surprise','這是受過祝福的聖櫃！能帶來好運的！'),
          { speaker:'CLERK', text:'聖櫃……？', portrait:{ char:'CLERK', show:true } },
          nou('awkward','對對！停留過的地方都會生意昌隆喔！'),
          { speaker:'CLERK', text:'是、是嗎？', portrait:{ char:'CLERK', show:true } },
          nou('lookaway','我以二等司祭之名起誓！'),
          { speaker:'CLERK', text:'那……好吧。這邊請。', portrait:{ char:'CLERK', show:true } },
          nou('concern','唉……', { hide:['CLERK'] }),
          nou('concern','跟你在一起我越來越會胡說八道了。'),
        ],
        /* ══ 分支：**每次進來都判一次**（不是只判一次）══
           走完城裡所有地點了沒，決定她說哪一句。判定在 `modules/town.js`（`allSeen`）。 */
        innBranch:{
          exploring:[ nou(null,'時間還早，我想去城裡逛逛呢。') ],
          settled:[
            nou(null,'今天有點累了，我先去休息囉。'),
            nou(null,'你還不累的話，可以在這邊等一下蕾娜小姐嗎？'),
          ],
        },
        /* ══ 太早就想睡（ver -405，Ray 交稿）══
           「回房睡覺」從初入就按得到，但**六點以前**按下去由諾薇兒擋回來。
           ⚠ 那個「六點」＝這座城 `evening.hour` 的同一個數字，由 `modules/town.js`
             傳進 `inn.arrive`（鐵律 7）—— 改集合時間只改 `evening.hour` 那一處。
           ⚠ Ray 指定 **front**（基本立繪），所以 expr 給 null。 */
        innEarly:[ nou(null,'再逛一下嘛，還沒六點呢。') ],
        /* 敲門的回應：**單句、沒有立繪**（Ray：「未開門無立繪」），可以一直敲。
           `wait`＝還在等蕾娜的那一段；`slept`＝蕾娜回來、大家睡了之後。 */
        innKnock:{
          wait:  { NOUVELLE:'怎麼了？蕾娜小姐回來了嗎？' },
          slept: { NOUVELLE:'……', RENNA:'有事明天再說吧。' },
        },
        /* 蕾娜回來那一幕（「獨自坐坐」兩小時之後）。
           ⚠ 第二句是**回答主角的**（「是嗎？她今天也很累了呢。」）—— 稿上沒寫那一拍，
             但沒有它這句話沒有對象，所以補一個主角的空框（§6.5 的慣例）。 */
        innRenna:[
          ren('surprise','唉呀，你在等我嗎？真不好意思。'),
          { speaker:'PLAYER', blank:true },
          ren('stare','是嗎？她今天也很累了呢。'),
          ren('smile','時間不早了，你也早點休息吧。明天一早就要出航了喔。'),
          ren('stare','晚安。'),
        ],
      },
    },
  },
};

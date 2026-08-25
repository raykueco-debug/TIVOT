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
     counter:{x,y,label}      櫃台鈕的位置（**背景圖上的比例**，不是螢幕比例）與字樣
     sail:{flag,blocked}      這個節點的下方是「出航」（見 square）
     chatter:[…]              點畫面隨機路人單句（見下方「路人單句」）

   ⚠ 對白用的是**劇情播放器**（`story.playAdhoc`）—— 立繪取景、明暗、打字機、面盤手勢
     全部與主線同一套。不要在城鎮另寫一個對話框。
   ⚠ **路人單句**（`chatter`，ver -387 由酒館推廣到四處，Ray 指定）：
       酒館＝市井　教堂＝教廷　行政廳＝政治　船塢＝地理情報
     每個地方的內容要對得上那條線 —— 那是玩家在城裡「聽消息」的唯一管道，
     四個地方講一樣的東西就等於只有一個地方。
     ⚠ 這些是**背景人聲**：沒有立繪、沒有名字（所以一律用「」包起來），
       讀起來才像鄰桌／隔壁長椅傳來的，而不是有個 NPC 在對你說話。
     ⚠ 互動是**點一下出一句、再點一下收掉**（見 modules/town.js 的 `chatterOn`）——
       收掉之前不出下一句，玩家才有時間讀完。
   ⚠ **櫃台鈕**（`counter`，ver -387，Ray：「商店、武器店、賞金獵人公會的櫃臺放置
     按鈕以進入各別選單」）：座標是**那張背景圖上的比例**（0~1），由
     `modules/town.js` 依 `object-fit:cover` 的裁切換算成螢幕座標 ——
     不要寫螢幕比例，那會隨手機長寬比跑掉。
     ⚠ 有了櫃台鈕就**不要再點畫面開選單**（原 `shopOnTap` 已移除）：兩個入口做同一件事，
       其中一個一定會被忘記維護（鐵律 8）。
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
          '「聖王廳又派視察官下來了，這個月第二個。」',
          '「主教大人這禮拜第三次閉門祈禱了。」',
          '「『永夜』之後來告解的人多了一倍，長椅都不夠坐。」',
          '「第四騎士團？就是專門處理那些東西的人吧。」',
          '「教典裡可沒寫過『禍魘』。別亂講。」',
          '「奉獻箱最近空得很，神也是要吃飯的。」',
          '「聽說有司祭被派去前線隨軍了。隨軍啊。」',
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
          '「北方的兵役令，議會又把表決推遲了一次。」',
          '「攝政王殿下半年沒公開露面了，你不覺得奇怪嗎？」',
          '「瓦爾士那邊加了關稅，商會鬧翻天。」',
          '「文件下個月再來吧，蓋章的那位休假。」',
          '「教廷插手軍務——十年前這是不可想像的。」',
          '「小聲點。這裡的牆有耳朵。」',
          '「預算全砍到護衛艦上了，道路修繕？做夢。」',
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
          nou('cringe','這地方……有點可怕。'),
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
        bg:'Capital_Firearm', name:'帝都　武器店',
        exits:{ back:'oldtown' },
        shop:'gunstore', keeperWho:'GUNSMITH',
        /* 櫃台在圖的正中偏上（老槍匠站的那一格）。座標是**這張背景圖上的比例**。 */
        counter:{ x:0.51, y:0.55, label:'櫃　台' },
        lines:[
          gun(null,'噢，小哥，你手上那把槍，我有否榮幸……'),
          /* 空畫面：主角把槍遞過去的那一拍（稿上寫「（空畫面）」）。 */
          { speaker:'PLAYER', text:'', auto:900, hide:['GUNSMITH'] },
          gun(null,'點五〇口徑七……不、八連發半自動，光後座力就能殺人吧！'),
          gun(null,'神父你是有大猩猩的腕力嗎？'),
          nou('gossip1','差不多吧。'),
          gun(null,'我還真沒見過有誰能自如使用這種口徑的手槍。'),
          gun(null,'能否讓我開開眼界？', { hide:['NOUVELLE'] }),
          /* ══ 打靶（可戰敗）══ 輸了跳 `range_lose`。 */
          { battle:'range_trainee', onLose:'range_lose' },
          /* —— 戰勝 —— */
          gun(null,'了不起，我們槍匠聯盟都會為您這種身手不凡的客人提供特別客製服務。'),
          { goto:'range_merge' },
          /* —— 戰敗 —— */
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
        keeperRandom:[
          '黃圈是硬吃，橘圈才是本事。分得清楚，命就長。',
          '霰彈的橘圈不免傷，是拿傷害換的——近身才划算。',
          '栓動槍沒有橘圈。要嘛全中，要嘛全挨，自己掂量。',
          '暴擊是逐發擲的。連發槍穩，單發槍看運氣。',
          '『禍魘』的殼比人厚。打不穿就別硬打，先想辦法破防。',
          '改裝一級一級來。跳級的接頭我做不出來，別問。',
          '素材決定上限。好鋼配好膛線，差一階就是差一階。',
          '別急著換槍。手上那把改到滿，常常比新槍還順手。',
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
        /* 路人單句：**地理情報**線（ver -387）。⚠ 這一條要對得上飛行頁的世界 ——
           講的是航線、風、哪裡有東西，玩家出航之後真的用得上。 */
        chatter:[
          '「往薇拉馮德的航線改走南邊了。繞是繞，保險。」',
          '「這季節北邊的雲層不能飛，掉下去連骨頭都找不到。」',
          '「法爾登的港封了，貨全積在這裡。」',
          '「銀月山脈那一段有東西出沒，過那裡就飛高一點。」',
          '「風向轉了，明天出港的都得再等一天。」',
          '「三號塢那艘新船？聽說是騎士團訂的。」',
          '「跑遠洋的都知道：夜裡別關航燈，關了就再也沒人找得到你。」',
        ],
      },

      /* ══ 二之一、賞金獵人公會 ══（ver -375）
         ⚠ 這是第一個**帶劇情插入戰**的城鎮節點：對白中間一句 `{ battle:'guild_hunter' }`，
           打完接著往下演（續播由 `story.resumeFrom` 負責，見那支的說明）。
         ⚠ 背景基底寫 `Captal_Guild`（Ray 的檔名就少一個 i，**照檔名**不要自作主張改）。 */
      guild: {
        bg:'Captal_Guild', name:'帝都　賞金獵人公會',
        exits:{ back:'oldtown' },
        /* 登記完才開得了懸賞榜（旗標由 `modules/town.js` 在這段對白播完時記）。 */
        board:'capital', boardFlag:'guild_registered',
        /* 櫃台＝接待員站的那一格。⚠ 沒登記過就不出現（旗標由這一段對白演完才記）。 */
        counter:{ x:0.52, y:0.58, label:'委　託' },
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
          { speaker:'HUNTER', text:'', auto:1000,
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
        once:true,
        lines:[
          nou('pray','感謝神，賜與我們平安與食糧。願主降福於世——'),
          nou('surprise','你怎麼已經開始吃了？禱詞還沒——'),
          { speaker:'NOUVELLE', text:'', auto:1000,
            portrait:{ char:'NOUVELLE', expr:'shocked', show:true } },
          nou('lookaway','好好吃。'),
        ],
        /* 點畫面隨機一句（Ray：「隨便生個幾串輪播」）。⚠ 這些是**背景人聲**，
           沒有立繪、沒有名字 —— 讀起來才像鄰桌傳來的。 */
        chatter:[
          '「——所以我說啊，那批貨根本進不了港。」',
          '「聽說第四騎士團又出動了。地宮那邊封了一整天。」',
          '「永夜之後什麼都貴，連麥酒都摻水了。」',
          '「北邊的兵役令下來了，我家老二躲不掉囉。」',
          '「別提戰爭了，喝你的。」',
          '「那位小姐是修女吧？來這種地方？」',
          '「噓——人家聽得見。」',
        ],
      },

      /* 2. 商店 */
      grocery: {
        bg:'Capital_Grocerie', noTime:true, name:'帝都　雜貨舖',   // 室內：只有一張圖，不吃時段
        exits:{ back:'uptown' },
        shop:'grocery',
        /* 櫃台＝店主站的那一格（ver -387 由「點畫面就開」改成櫃台鈕，Ray 指定）。 */
        counter:{ x:0.51, y:0.53, label:'櫃　台' },
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
          { speaker:'SHOPKEEP', text:'「『永夜』以來舶來品都漲翻天啦，這一年好不容易才穩定了點。」',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('surprise','啊，是因為海運路線都被禍魘截斷了吧？'),
          { speaker:'SHOPKEEP', text:'「是啊。要想買正常的物價，去薇拉馮德比較有機會。」',
            portrait:{ char:'SHOPKEEP', show:true } },
          nou('bigsmile','薇拉馮德啊……真想去看看呢！'),
          { speaker:'SHOPKEEP', text:'「那可是當今世界的中心，一輩子至少要去一次喔。」',
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
      inn:    { bg:'Capital_Inn', name:'帝都　旅店',  exits:{ back:'uptown' } },
    },
  },
};

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
     chatter:[…]              點畫面隨機路人對話（酒館那種）

   ⚠ 對白用的是**劇情播放器**（`story.playAdhoc`）—— 立繪取景、明暗、打字機、面盤手勢
     全部與主線同一套。不要在城鎮另寫一個對話框。
   ⚠ 口氣守則見 flight/script/STYLE.md，這裡不重寫一份。
   ══════════════════════════════════════════════════════════════════════ */

/* 諾薇兒的差分（縮寫，對到 speakers.js 的 expr）。寫成常數只是為了讓下面的稿子好讀。 */
const N = who => (expr, text, extra) => Object.assign(
  { speaker:who, text:text||'', portrait:{ char:who, expr:expr||null, show:true } }, extra||{});
const nou = N('NOUVELLE'), ren = N('RENNA');

export const TOWNS = {
  capital: {
    name: '帝都',
    entry: 'square',
    nodes: {

      /* ══ 攝政王廣場 ══ 上＝中心區、左＝舊街區、右＝上街區（Ray 指定的三個方向） */
      square: {
        bg:'Capital_Square', name:'帝都　攝政王廣場',
        exits:{ up:'midtown', left:'westside', right:'uptown' },
        once:true,
        lines:[ nou('surprise','帝都的攝政王廣場，好壯觀。'),
                nou('surprise','每次看都覺得很震憾呢。') ],
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
      },

      /* (2) 行政廳 */
      cityhall: {
        bg:'Capital_Cityhall', name:'帝都　行政廳',
        exits:{ back:'midtown' },
        once:true,
        lines:[
          ren('surprise','你們兩個怎麼跑這裡來了？'),
          nou('awkward','四處逛逛一不自覺就……'),
          ren('smile','這地方挺無聊的，你們先去旅店安頓好吧？'),
          nou(null,'有沒有什麼我可以幫忙的？'),
          ren('stare','有。你的同伴已經走掉了，幫我看好他。', { se:'se_walk' }),
          nou('run','啊——！', { se:'se_steps' }),
        ],
      },

      /* ══ 二、西區街道 ══ 左＝商店、右＝酒館、上＝旅店、下＝廣場 */
      westside: {
        bg:'Capital_Downtown', name:'帝都　西區街道',
        exits:{ left:'grocery', right:'tavern', up:'inn', down:'square' },
        once:true,
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

      /* 1. 酒館 ⚠ 還沒有背景素材，暫借西區街道那張（見 HANDOFF 的缺口清單）。 */
      tavern: {
        bg:'Capital_Downtown', name:'帝都　餐酒館',
        exits:{ back:'westside' },
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
        exits:{ back:'westside' },
        shop:'grocery',
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
        /* 店主對話鈕（商店頁上的按鈕，輪播）。 */
        keeper:[
          '「『永夜』以來舶來品都漲翻天啦，這一年好不容易才穩定了點。」',
          '「要想買正常的物價，去薇拉馮德比較有機會。」',
          '「什麼極東戰爭早該結束了。北邊那些瓦爾士人還虎視耽耽地呢！」',
          '「啊，可別說是我說的！」',
        ],
      },

      /* ⚠ 旅店與上街區**還沒有內容**（Ray 還沒給稿）；上街區有背景、旅店連背景都沒有。
         先留節點讓箭頭指得到，進去只有地名卡。 */
      uptown: { bg:'Capital_Uptown', name:'帝都　上街區', exits:{ back:'square' } },
      inn:    { bg:'Capital_Downtown', name:'帝都　旅店',  exits:{ back:'westside' } },
    },
  },
};

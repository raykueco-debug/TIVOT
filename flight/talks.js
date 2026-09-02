/* ══════════════════════════════════════════════════════════════════════
   閒聊對話（右上「對話」鈕）
   ──────────────────────────────────────────────────────────────────────
   這個檔案**只放內容**，挑選與播放的機制在 flight/index.html。
   要加台詞、改台詞、加新的觸發條件，動這裡就好。

   ⚠ 是「隨機挑一組」不是「隨機生成」：執行期沒有語言模型。每人各抽一句的話
     四句彼此無關，讀起來像四個人各自自言自語，所以寫成整段的對話一次播完。

   ── 一組對話長這樣 ────────────────────────────────────────────────
     TALKS[3] 之下放一組：
       { id:'唯一名字',
         when:{ region:'ALL', time:['黎明'] },   // 章節不寫這裡，見下
         until: 4,                               // 選填：只到第 4 章
         lines:[ {who:'sorana', text:'…'}, {who:'anya', text:'…'} ] }

   ⚠⚠ **STAGE 是最高優先級**（Ray 指定）。挑選時 stage 與「說話的人在不在隊伍裡」
     是**硬條件，永遠不放寬**；只有 time 與 region 在挑不到時會依序放寬。
     理由很實際：時段不對只是台詞不應景，**進度不對是講到還沒發生的事、
     或是讓還沒入隊（或已經離隊）的人開口** —— 那是劇情穿幫，不是小瑕疵。

     when 的條件**都省略＝永遠符合**：
       region  地區。目前地圖還沒分區，一律 'ALL'（＝不限地區）。
               日後要限地區就填國名，與 region_map.json 的 zh 同字串，
               例如 '薩梅爾帝國'。也可以給陣列。
       time    時段。六等份，見下方 TALK_TIMES。可給字串或陣列。
   ⚠ **章節不寫在 when 裡** —— 由「這組放在 TALKS 的第幾個群組」決定
     （第 N 組 ＝ 第 N 章起可播）。要限定只在某一章，在該組加 `until: N`。
     這樣同一章的對話會排在一起，手動整理容易得多。

   ── 主角（玩家本人）──────────────────────────────────────────────
     17 歲，教廷聖約騎士團的騎士。主武器是大口徑雙自動手槍，有把陣地機槍
     整挺舉起來掃射的腕力。**性格不設定 —— 他就是玩家本人。**
     ⚠⚠ **他會說話，只是台詞不顯示**（沒有他的發言框，也沒有立繪）。
       這是慣例，**不是人設** —— 千萬不要寫成「他沉默」「他只點頭」「你倒是說句話啊」，
       那是把「沒顯示」誤讀成「寡言」，而且會跟真正寡言的安雅撞人設。
       正確作法：讓別人**接他的話**，從對方的反應反推他說了什麼。
         ✗ 索菈娜「……你就不能給個反應嗎。」
         ✓ 索菈娜「……你就這樣說得像在講天氣。」（他答了，只是玩家沒看到）
     ⚠ 名字由玩家自訂，預設「托爾斯坦」（ver -477；-395 曾是凱勞諾斯）。
     ⚠ 台詞一律用暱稱 `{N}`（ver -477，Ray：「故事中用到名字都用暱稱」）。
       台詞裡寫 `{P}` 會在顯示時換成當前名字 —— **不要把名字直接打進台詞**，
       玩家改了名就露餡。西文只是檔名／程式用的 id，與玩家輸入脫鉤。

   ── 角色口氣（Ray 指定，改台詞照著走）──────────────────────────────
     蕾娜   renna    21 監察官　有禮優雅但不擺架子、溫和圓滑、一點成熟的職業感
     諾薇兒 nouvelle 17 修女　　溫柔溫婉、會照顧人
     索菈娜 sorana   19 獵手　　坦蕩、直接、開朗、有一點男孩子氣
     安雅   anya     16 　　　　寡言少笑、用字簡短、還算有禮
                                ⚠ 簡短是因為**非母語者**，不是冷淡。
                                ⚠ 她其實是某國王女，**任何台詞都不可以點破**，
                                  最多讓她閃避（「……沒什麼好提。」）。

   ── 寫台詞的兩個實務限制 ──────────────────────────────────────────
   ⚠ 一行大約 19 個全形字（對話框內可用寬 287px、字級 15px）。超過會自動換行，
     最多三行，再多就縮字級到 12px。寫的時候抓兩行以內最好讀。
   ⚠ 站位是固定的：安雅在右，其他三人**共用左邊那個位置**。所以左邊三人之中
     連續兩拍換人時，畫面上是「舊的滑出、新的滑入」的輪轉。這不是問題，
     但寫對話時知道一下：左邊三人交替太頻繁會一直在換卡。
   ══════════════════════════════════════════════════════════════════════ */

/* ══ 隊伍成員 ══
   誰在第幾章之間跟著船走。`from` 起（含）、`to` 迄（含，省略＝之後都在）。
   ⚠ **不必逐組對話手動標人**：挑選時會檢查「這組對話裡開口的每一個人，
     在當前 stage 是否都在隊伍裡」，不在就整組排除。所以蕾娜第 3 章才入隊的話，
     只要在這裡寫 renna:{from:3}，所有她開口的對話就自動從前兩章消失。
   ⚠ 目前四個人都寫 from:1（預設進度已是 3，四人皆在）。真正的入隊/離隊章節
     等劇情定案再填 —— 填錯會讓一整批對話無聲消失，改這裡務必連帶測一下
     talkDebug() 看各 stage 還剩幾組。 */
/* ⚠⚠ **第 1 章船上只有蕾娜與諾薇兒**（ver -432）：主線走到這裡，出航的就是他們三個
   —— 索菈娜與安雅還沒登場。所以上面那 23 組（四人同台的日常）在第 1、2 章
   自動整批消失，第 1 章聽到的是下面新寫的那 20 組蕾／諾對話。
   ⚠⚠ **`from:5` 是暫填的**（ver -562 由 3 推到 5，「以防萬一」）（Ray 還沒定案她們哪一章入隊）：填 3 是因為
     `STAGE_DEFAULT` 就是 3 —— **預設進度下的行為與 ver -431 完全一樣**，
     四人同台的那 23 組照舊聽得到，只有真的在第 1、2 章時才會被擋下。
     真正的入隊章節定了就改這兩個數字，其餘什麼都不必動。 */
const PARTY = {
  sorana:   { from: 7 },   // ver -742：入隊章節仍未定，隨試飛預設推到 7（她不在 S5 的船上）
  nouvelle: { from: 1 },
  anya:     { from: 5 },   // ver -742：**留 5**——北泊出航（S5）起她真的在船上，船上對話該有她
  renna:    { from: 1 },
};
function inParty(who, stage){
  /* ⚠ 台詞的 `who` 可能帶表情差分（`renna/relief`，ver -432）—— 先切回本尊再問。
     不切的話 `PARTY['renna/relief']` 查不到，而查不到一律放行 ＝ **整組對話悄悄
     繞過「這個人在不在船上」這條硬條件**（那是劇情穿幫，不是小瑕疵）。
     ⚠ `baseWho` 住在 `flight/index.html`（差分那一段）；這一頁是非 module 的
       獨立文件，兩個檔共用同一個全域函式，不要在這裡抄第二份（鐵律 7）。 */
  who = (typeof baseWho==='function') ? baseWho(who) : who;
  const p = PARTY[who];
  if (!p) return true;                 // 沒登記的人（例如日後的客串）一律視為在場
  if (p.from != null && stage < p.from) return false;
  if (p.to   != null && stage > p.to)   return false;
  return true;
}

/* 六等份的時段。⚠ 是**等分**不是天文時刻：一天 1440 分鐘 ÷ 6 ＝ 每段 4 小時。
   對得上日月模型：日出 06:00 落在「黎明」段內、日落 18:00 落在「黃昏」段內。 */
const TALK_TIMES = [
  { key: '夜半', from:    0 },   // 00:00–04:00
  { key: '黎明', from:  240 },   // 04:00–08:00
  { key: '上午', from:  480 },   // 08:00–12:00
  { key: '下午', from:  720 },   // 12:00–16:00
  { key: '黃昏', from:  960 },   // 16:00–20:00
  { key: '夜晚', from: 1200 },   // 20:00–24:00
];
function talkPeriod(minutes){
  const m = ((minutes % 1440) + 1440) % 1440;
  let k = TALK_TIMES[0].key;
  for (const t of TALK_TIMES) if (m >= t.from) k = t.key;
  return k;
}

/* ══ 對話本體，**依 STAGE 分組** ══
   ⚠ 放在第 N 組 ＝ **第 N 章起可播**（之後的章節仍聽得到）。
     只想讓某組限定在某一章，就在那組加 `until: N`。
     所以不分章節的日常閒聊全部放在第 1 組就好。
   ⚠ 現在全部 23 組都在第 1 組 —— 因為還沒有分章節的內容。第 2、3 組先開好空的，
     要寫該章專屬的對話直接往裡面加。 */
const TALKS = {

/* ═══════════════════════════ STAGE 1 ═══════════════════════════
   第 1 章起。不分章節的日常閒聊都放這裡。 */
1: [

    /* ───────────────────────── 不限時段 ───────────────────────── */

    { id:'cloud-mountains', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'風向轉了。這片雲海底下，是不是有山？'},
      {who:'anya',     text:'有。三座。'},
      {who:'sorana',   text:'你怎麼知道得這麼快啊你。'},
      {who:'anya',     text:'……看雲。雲會繞開。'},
      {who:'nouvelle', text:'安雅說得對呢。雲繞著走的地方，底下多半是硬的。'},
      {who:'renna',    text:'兩位都比我這個監察官管用。報告我就寫「航路由船員自行判定」。'},
    ]},

    { id:'soup', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'今天的湯我多煮了一些，大家記得趁熱喝。'},
      {who:'sorana',   text:'太好了！我去甲板上叫安雅。'},
      {who:'anya',     text:'……已經在這裡。'},
      {who:'sorana',   text:'哇！你走路沒聲音這件事我永遠習慣不了。'},
      {who:'anya',     text:'抱歉。'},
      {who:'nouvelle', text:'不用道歉呀。來，先坐下。'},
      {who:'renna',    text:'我也分一碗好嗎？「監察官在船上蹭飯」我不會寫進去的。'},
    ]},

    { id:'hound', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'安雅小姐，方才那個地方——妳是怎麼找到的？'},
      {who:'anya',     text:'感覺。說不清楚。'},
      {who:'renna',    text:'說不清楚也沒關係。教廷的紀錄裡，說得太清楚的反而少見。'},
      {who:'sorana',   text:'我倒覺得她是鼻子好。跟獵犬一樣。'},
      {who:'anya',     text:'……我不是狗。'},
      {who:'sorana',   text:'誇你啦！獵犬很厲害的！'},
      {who:'nouvelle', text:'索菈娜，這種誇法要看對象的。'},
    ]},

    { id:'blank-map', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'這一帶已經出了帝國的圖了。再往東，紙上就是空白。'},
      {who:'sorana',   text:'空白最好。空白代表沒人去過。'},
      {who:'renna',    text:'也代表沒人回來過。'},
      {who:'sorana',   text:'……妳這人真會說話。'},
      {who:'anya',     text:'我去。'},
      {who:'nouvelle', text:'等等，安雅，先讓大家都同意再說呀。'},
      {who:'anya',     text:'……好。我等。'},
    ]},

    { id:'names', when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'……「索菈娜」。這樣念，對嗎。'},
      {who:'sorana',   text:'對！很標準啊。'},
      {who:'anya',     text:'太長。舌頭會累。'},
      {who:'sorana',   text:'那你叫我索拉就好了。'},
      {who:'nouvelle', text:'那我呢？諾薇兒也不短。'},
      {who:'anya',     text:'……諾。'},
      {who:'renna',    text:'看來我得慶幸自己只有兩個字。'},
    ]},

    /* ───────────────────────── 夜半 ───────────────────────── */

    { id:'nightwatch', when:{ region:'ALL', time:'夜半' }, lines:[
      {who:'sorana',   text:'今晚換我守夜，你們去睡。'},
      {who:'nouvelle', text:'妳昨晚也守了。今天換我吧，好不好？'},
      {who:'sorana',   text:'我不睏。'},
      {who:'anya',     text:'眼睛。紅的。'},
      {who:'sorana',   text:'……被看穿了。'},
      {who:'renna',    text:'那就三個人輪。我算過了，這樣每個人都睡得滿。'},
    ]},

    { id:'cant-sleep', when:{ region:'ALL', time:'夜半' }, lines:[
      {who:'nouvelle', text:'安雅？這麼晚了還不睡呀。'},
      {who:'anya',     text:'……船在響。'},
      {who:'nouvelle', text:'是木頭的聲音喔。船身熱脹冷縮，夜裡就會這樣叫。'},
      {who:'anya',     text:'原來。不是壞掉。'},
      {who:'renna',    text:'我第一次上船時也嚇了一跳，還以為要沉了。'},
      {who:'nouvelle', text:'那我陪妳坐一會兒，等它安靜下來。'},
    ]},

    /* ───────────────────────── 黎明 ───────────────────────── */

    { id:'morning-star', when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'anya',     text:'東邊。那顆。很亮。'},
      {who:'nouvelle', text:'是晨星呢。天要亮的時候，只剩它還在。'},
      {who:'sorana',   text:'獵人管它叫催工星。看到它就代表該起來了。'},
      {who:'anya',     text:'……真討厭。'},
      {who:'sorana',   text:'哈哈哈！你這句我懂！'},
      {who:'renna',    text:'教廷的曆書上寫得雅得多，可惜沒有這句實在。'},
    ]},

    { id:'dawn-fog', when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'sorana',   text:'霧真厚。這種天最容易撞山。'},
      {who:'renna',    text:'要不要降一點高度？貼著雲面走視野會好些。'},
      {who:'sorana',   text:'貼太近會被上升氣流頂。我寧可慢一點。'},
      {who:'anya',     text:'我看前面。'},
      {who:'nouvelle', text:'那我去煮點熱的。這種天，手會冷。'},
    ]},

    /* ───────────────────────── 上午 ───────────────────────── */

    { id:'deck-check', when:{ region:'ALL', time:'上午' }, lines:[
      {who:'nouvelle', text:'索菈娜，甲板上那捆繩子是妳放的嗎？'},
      {who:'sorana',   text:'啊，我等一下就收！'},
      {who:'anya',     text:'……會絆倒。'},
      {who:'sorana',   text:'好啦好啦我現在收，兩個人一起唸我。'},
      {who:'renna',    text:'三個人。我只是還沒開口。'},
    ]},

    { id:'wind-good', when:{ region:'ALL', time:'上午' }, lines:[
      {who:'sorana',   text:'今天風好順，這種日子一年沒幾天。'},
      {who:'renna',    text:'那要不要趁現在多趕一段？'},
      {who:'sorana',   text:'我就在等妳這句。'},
      {who:'anya',     text:'……抓好。'},
      {who:'nouvelle', text:'安雅說得對，大家先抓穩再說呀——索菈娜！'},
    ]},

    /* ───────────────────────── 下午 ───────────────────────── */

    { id:'nap', when:{ region:'ALL', time:'下午' }, lines:[
      {who:'nouvelle', text:'噓——安雅在打盹呢。'},
      {who:'sorana',   text:'她坐著也能睡？'},
      {who:'nouvelle', text:'很淺的。有一點聲音她就會醒。'},
      {who:'anya',     text:'……醒著。'},
      {who:'sorana',   text:'你看吧！'},
      {who:'renna',    text:'那就別吵她了。這艘船上最需要休息的就是她。'},
    ]},

    { id:'supplies', when:{ region:'ALL', time:'下午' }, lines:[
      {who:'renna',    text:'補給清單我列好了。要看嗎？'},
      {who:'sorana',   text:'妳念，我聽。'},
      {who:'renna',    text:'水、油、鹽、繩、藥，還有妳上次弄斷的那根撐桿。'},
      {who:'sorana',   text:'……那根不算我弄斷的，是它自己老了。'},
      {who:'anya',     text:'妳踩的。'},
      {who:'nouvelle', text:'安雅，這種時候不用這麼誠實也可以喔。'},
    ]},

    /* ───────────────────────── 黃昏 ───────────────────────── */

    { id:'sunset', when:{ region:'ALL', time:'黃昏' }, lines:[
      {who:'nouvelle', text:'雲被染成那個顏色的時候，我總覺得該說點什麼。'},
      {who:'renna',    text:'那就什麼都別說，看著就好。'},
      {who:'sorana',   text:'難得妳說話不繞路。'},
      {who:'renna',    text:'……偶爾。'},
      {who:'anya',     text:'很好看。'},
    ]},

    { id:'moor', when:{ region:'ALL', time:'黃昏' }, lines:[
      {who:'sorana',   text:'天要黑了，找個背風的地方停吧。'},
      {who:'renna',    text:'前面那道谷口如何？擋風，也擋別人的視線。'},
      {who:'sorana',   text:'妳連這個都想到了。'},
      {who:'renna',    text:'職業病，別介意。'},
      {who:'anya',     text:'……那裡有水。'},
      {who:'nouvelle', text:'那就更好了，正好補一點。'},
    ]},

    /* ───────────────────────── 夜晚 ───────────────────────── */

    { id:'silver-moon', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'nouvelle', text:'今晚的銀月好亮。'},
      {who:'anya',     text:'在我家鄉……也看得到。'},
      {who:'sorana',   text:'你家鄉？你從來沒提過欸。'},
      {who:'anya',     text:'……沒什麼好提。'},
      {who:'renna',    text:'誰都有不想提的事。我也有。'},
      {who:'nouvelle', text:'那我們就一起看月亮，什麼都不用提。'},
    ]},

    { id:'stars', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'sorana',   text:'獵手認星是為了認路。你們呢？'},
      {who:'nouvelle', text:'修道院教我們認星，是為了記得時辰。'},
      {who:'renna',    text:'教廷則是為了寫進紀錄。同一片天，三種用法。'},
      {who:'anya',     text:'……我只是看。'},
      {who:'sorana',   text:'那大概是最好的用法。'},
    ]},

    { id:'lantern', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'renna',    text:'船燈調暗一點吧。太亮，遠處看得見我們。'},
      {who:'sorana',   text:'妳是怕誰看見？'},
      {who:'renna',    text:'沒有誰。只是習慣。'},
      {who:'anya',     text:'……我也是。'},
      {who:'nouvelle', text:'那就都調暗吧。反正有月亮。'},
    ]},

    /* ─────────────── 主角在場（他沒有台詞，靠別人襯出來）─────────────── */

    { id:'player-wind', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'{N}，你剛剛那一槍，是算好風的吧？'},
      {who:'sorana',   text:'……你講得像在說今天天氣如何。'},
      {who:'nouvelle', text:'他一向這樣呀。做得到的事，說起來就輕。'},
      {who:'sorana',   text:'可惡，我這招練了三年。'},
      {who:'anya',     text:'……我也想學。'},
      {who:'nouvelle', text:'那就請他教嘛。他不會拒絕的。'},
    ]},

    { id:'player-strength', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'等等，{N}，那挺機槍是架在座上的——'},
      {who:'sorana',   text:'……你就這樣抱起來了。還說「這樣比較快」。'},
      {who:'nouvelle', text:'請小心腰喔。'},
      {who:'renna',    text:'腰？那個重量，該擔心的是甲板。'},
      {who:'anya',     text:'……很強。'},
    ]},

    { id:'player-pistols', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'{N}，保養得真勤。那對手槍，口徑不小吧？'},
      {who:'renna',    text:'……原來還能這樣改。我記下來了。'},
      {who:'sorana',   text:'妳連這種事都要寫進報告？'},
      {who:'renna',    text:'不寫。是我自己想知道。'},
      {who:'anya',     text:'……我也想聽。'},
    ]},

    { id:'player-name', when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'{N}。……這樣念，對嗎。'},
      {who:'anya',     text:'……嗯。謝謝。'},
      {who:'sorana',   text:'你們兩個講話都好省。'},
      {who:'nouvelle', text:'省歸省，聽得懂就好呀。'},
      {who:'anya',     text:'……聽得懂。'},
    ]},

    { id:'player-knight', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'renna',    text:'聖約騎士團的騎士……我只在文件上見過。'},
      {who:'renna',    text:'{N}，本人和文件上寫的差得真多。'},
      {who:'sorana',   text:'妳這是誇他還是損他？'},
      {who:'renna',    text:'誇。文件很無趣的。'},
      {who:'nouvelle', text:'呵呵……那大概是最高的評價了。'},
    ]},

    /* ══════════════════════════════════════════════════════════════════
       第 1 章的船上閒聊（ver -432，Ray：「生成 20 組蕾、諾二人的船上對話」）
       ──────────────────────────────────────────────────────────────────
       這一章船上只有**蕾娜與諾薇兒**（索菈娜與安雅還沒入隊，見上方 PARTY）——
       所以這 20 組都只有她們兩個開口，主角照慣例**由別人接他的話**。
       ⚠ 時空背景：剛從帝都出航，往北方泊地。蕾娜是新上船的監察官（隨身板夾寫報告），
         諾薇兒是照顧人的那一個。第一場艦戰已經打完（她剛看過他的實力）。
       ⚠ **不要寫到還沒發生的事**：北方泊地那邊有什麼、璐娜莉亞為什麼推薦他，
         都還沒揭曉 —— 最多讓蕾娜含糊帶過。
       ══════════════════════════════════════════════════════════════════ */

    /* ───────────────────────── 不限時段 ───────────────────────── */

    { id:'s1-report', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'那個……可以問一下你的年紀嗎？報告要填。'},
      {who:'nouvelle', text:'蕾娜小姐，那一欄真的有人看嗎？'},
      {who:'renna',    text:'我看。填不完整，教廷會退回來。'},
      {who:'nouvelle', text:'那就是蕾娜小姐要重寫一次囉？'},
      {who:'renna',    text:'……所以我才問得這麼認真。'},
    ]},

    { id:'s1-coffin', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'那口棺材……真的要一直帶在身上嗎？'},
      {who:'nouvelle', text:'那是槍櫃喔。裡面是他的武器。'},
      {who:'renna',    text:'我知道是槍櫃。我是說，它比我還重。'},
      {who:'nouvelle', text:'他一個人就抬得動，不用擔心。'},
      {who:'renna',    text:'我擔心的是甲板。'},
    ]},

    { id:'s1-recommend', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'蕾娜小姐，剛才那件事……'},
      {who:'renna',    text:'我什麼都沒說。'},
      {who:'nouvelle', text:'可是妳說了呀。'},
      {who:'renna',    text:'……那就當作我在對海風說話。'},
      {who:'nouvelle', text:'呵呵。海風的記性好像不太好呢。'},
    ]},

    { id:'s1-north-cold', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'越往北越冷了。要不要加件衣服？'},
      {who:'renna',    text:'不用，我還撐得住。'},
      {who:'nouvelle', text:'撐得住跟不冷是兩回事喔。'},
      {who:'renna',    text:'……那，麻煩妳了。'},
      {who:'nouvelle', text:'好。順便給你也拿一件。'},
    ]},

    { id:'s1-first-voyage', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'老實說，這是我第一次上船這麼久。'},
      {who:'nouvelle', text:'看不出來耶，妳站得很穩。'},
      {who:'renna',    text:'監察官不能在被監察的人面前跌倒。'},
      {who:'nouvelle', text:'那如果只有我看到呢？'},
      {who:'renna',    text:'……那我會考慮跌一次。'},
    ]},

    { id:'s1-hund', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'我一直叫你 HUND，你不介意吧？'},
      {who:'nouvelle', text:'那是教廷給的編號吧？聽起來好硬。'},
      {who:'renna',    text:'是舊制的稱呼。我用習慣了。'},
      {who:'player',   text:''},
      {who:'renna',    text:'……好。那我再想想別的叫法。'},
    ]},

    { id:'s1-mending', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'袖子破了。脫下來我幫你補。'},
      {who:'renna',    text:'諾薇兒小姐連針線都帶著？'},
      {who:'nouvelle', text:'修女院什麼都自己來的。'},
      {who:'renna',    text:'真好。我只會補文件上的破洞。'},
      {who:'nouvelle', text:'那也是很重要的技能呀。'},
    ]},

    { id:'s1-regine', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'蕾娜小姐的名字，是本名嗎？'},
      {who:'renna',    text:'不是。本名太長，念起來很累。'},
      {who:'nouvelle', text:'我覺得長的名字也很好聽耶。'},
      {who:'renna',    text:'……那等哪天你們幫得上忙，我再告訴你們。'},
      {who:'nouvelle', text:'那我要記在心上囉。'},
    ]},

    { id:'s1-quiet-sea', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'安靜得有點不習慣。'},
      {who:'nouvelle', text:'帝都太吵了嘛。'},
      {who:'renna',    text:'不是那個意思。是……太順利了。'},
      {who:'nouvelle', text:'蕾娜小姐，別把不好的事說出口喔。'},
      {who:'renna',    text:'抱歉。職業病。'},
    ]},

    { id:'s1-ration', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'乾糧還夠三天，水多一點。'},
      {who:'renna',    text:'妳連這個都算好了？'},
      {who:'nouvelle', text:'不然半路餓肚子的是我們三個呀。'},
      {who:'renna',    text:'……我把「後勤良好」寫進去。'},
      {who:'nouvelle', text:'欸，這個要寫嗎？'},
    ]},

    /* ───────────────────────── 黎明・上午 ───────────────────────── */

    { id:'s1-morning-prayer', when:{ region:'ALL', time:['黎明'] }, lines:[
      {who:'nouvelle', text:'早安。今天也平安無事就好了。'},
      {who:'renna',    text:'諾薇兒小姐每天都禱告嗎？'},
      {who:'nouvelle', text:'嗯。習慣了，不做反而怪怪的。'},
      {who:'renna',    text:'那……可以順便替我求一份嗎？'},
      {who:'nouvelle', text:'早就有妳的份囉。'},
    ]},

    { id:'s1-breakfast', when:{ region:'ALL', time:['黎明','上午'] }, lines:[
      {who:'nouvelle', text:'湯好了。趁熱喝。'},
      {who:'renna',    text:'船上還能煮湯，我真的沒想到。'},
      {who:'nouvelle', text:'只要有火有鍋子就可以呀。'},
      {who:'player',   text:''},
      {who:'nouvelle', text:'……你這樣講，我下次會多煮一鍋喔。'},
    ]},

    { id:'s1-logbook', when:{ region:'ALL', time:['上午'] }, lines:[
      {who:'renna',    text:'航海日誌我先幫忙記著了。'},
      {who:'nouvelle', text:'咦，那不是監察官的工作吧？'},
      {who:'renna',    text:'閒著也是閒著。而且字比較好看。'},
      {who:'nouvelle', text:'這句我要記下來，等他回來給他看。'},
      {who:'renna',    text:'……別。'},
    ]},

    /* ───────────────────────── 下午・黃昏 ───────────────────────── */

    { id:'s1-laundry', when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'nouvelle', text:'風這麼好，衣服晾一下就乾了。'},
      {who:'renna',    text:'掛在船首會不會被吹走？'},
      {who:'nouvelle', text:'我打的結，不會的。'},
      {who:'renna',    text:'……修女院真的什麼都教。'},
      {who:'nouvelle', text:'不教的話會沒衣服穿嘛。'},
    ]},

    { id:'s1-seabirds', when:{ region:'ALL', time:['下午'] }, lines:[
      {who:'nouvelle', text:'那些鳥一直跟著我們耶。'},
      {who:'renna',    text:'牠們在等廚餘。'},
      {who:'nouvelle', text:'哇，好現實喔。'},
      {who:'renna',    text:'不過有鳥跟著，通常代表航路沒錯。'},
      {who:'nouvelle', text:'那還是謝謝牠們好了。'},
    ]},

    { id:'s1-tea', when:{ region:'ALL', time:['下午','黃昏'] }, lines:[
      {who:'renna',    text:'……這茶，是教廷配給的那一種嗎？'},
      {who:'nouvelle', text:'嗯。難喝吧？'},
      {who:'renna',    text:'我什麼都沒說。'},
      {who:'nouvelle', text:'蕾娜小姐的表情已經說完了。'},
      {who:'renna',    text:'下次靠港，我請客。'},
    ]},

    { id:'s1-sunset', when:{ region:'ALL', time:['黃昏'] }, lines:[
      {who:'nouvelle', text:'從這裡看夕陽，跟在地面上不一樣呢。'},
      {who:'renna',    text:'嗯。地面上看不到雲的背面。'},
      {who:'nouvelle', text:'蕾娜小姐也會看這種東西啊。'},
      {who:'renna',    text:'……監察官也是人。'},
      {who:'nouvelle', text:'呵呵，我知道啦。'},
    ]},

    /* ───────────────────────── 夜晚・夜半 ───────────────────────── */

    { id:'s1-night-watch', when:{ region:'ALL', time:['夜晚'] }, lines:[
      {who:'renna',    text:'守夜我來吧。反正我也睡不著。'},
      {who:'nouvelle', text:'那我陪妳。一個人看夜太久會胡思亂想。'},
      {who:'renna',    text:'……妳很懂嘛。'},
      {who:'nouvelle', text:'因為我以前也常常這樣。'},
      {who:'renna',    text:'那就一起。謝謝。'},
    ]},

    { id:'s1-stars', when:{ region:'ALL', time:['夜晚','夜半'] }, lines:[
      {who:'nouvelle', text:'星星好多。這樣真的認得出方向嗎？'},
      {who:'renna',    text:'認得。北邊那一顆一整年都不動。'},
      {who:'nouvelle', text:'好厲害……這也是監察官要學的？'},
      {who:'renna',    text:'不是。是小時候我父親教的。'},
      {who:'nouvelle', text:'……那一定是很好的回憶呢。'},
    ]},

    { id:'s1-midnight', when:{ region:'ALL', time:['夜半'] }, lines:[
      {who:'renna',    text:'這個時間還醒著，明天會很難受喔。'},
      {who:'nouvelle', text:'蕾娜小姐自己不也是。'},
      {who:'renna',    text:'我在寫報告。'},
      {who:'player',   text:''},
      {who:'renna',    text:'……好啦。我收一收就去睡。'},
      {who:'nouvelle', text:'講得動她耶，好厲害。'},
    ]},
],

/* ═══════════════════════════ STAGE 2 ═══════════════════════════
   第 2 章起。目前空的。格式與上面相同：
     { id:'…', when:{ region:'ALL', time:'夜晚' }, lines:[ {who:'…', text:'…'} ] }
   要「只有第 2 章聽得到」就加 until:2。 */
2: [],

/* ═══════════════════════════ STAGE 3 ═══════════════════════════
   第 3 章起（**測試期間的預設進度**）。目前空的。 */
3: [],

};

/* ══ 快出圖了：叫你回頭 ══
   地圖沒有硬邊界（船飛得出去，只是會被空氣牆黏住），這一串就是那道**軟邊界**——
   靠碎念把玩家勸回來，而不是用一道看不見的牆把船擋住就算了。

   ── 格式 ──────────────────────────────────────────────────────
     字串        ＝ 蕾娜的單句（最常見，所以做成簡寫）
     lines 陣列  ＝ 多拍對話，格式與一般閒聊相同
   ── 分方位 ────────────────────────────────────────────────────
     ANY 不分方位，且**依蕾娜的好感度分五段**（>=10/20/30/40/50）；
     N/S/E/W 是撞到哪一邊才會出現，不分好感（那是群體梗）。
     ⚠ 方位對應：**北＝上緣(y 小)**、南＝下緣、東＝右緣(x 大)、西＝左緣。
       這與羅盤一致（航向 (0,-1) 就是北），不是隨便定的。
     ⚠ 有該方位的池子時，**一半機率抽方位、一半抽 ANY** —— 全抽方位的話往北
       每次都聽到同一段；全抽 ANY 的話特地寫的方位梗永遠不會出現。

   ⚠ 她這時候可以比平常急一點、也可以耍點官威，但仍是「圓滑」那一路 ——
     不會真的罵人，會拿考評當玩笑。 */
const TALK_EDGE = {

  /* ⚠ ANY 依**蕾娜的好感度**分五段（Ray 指定：>=10 / 20 / 30 / 40 / 50）。
     取的是「不超過目前好感的最高那一段」，**不是累積** —— 累積的話滿好感時
     還會抽到「我扣你分喔」那種公事公辦的句子，語氣就永遠長不大。
     ⚠ 某一段還沒寫台詞時會自動往下退（見 edgeAnyPool），所以可以只先寫幾段。
     ⚠ 預設好感 10 ＝ 第一段。 */
  ANY: {

    /* ≥10 公事公辦。她還在「監察官」這個身分裡。 */
    10: [
      '我扣你分喔。',
      '扣　分。',
      '航路偏離。這句我要念了喔。',
      '這個方向我沒辦法寫進報告裡。',
      '要去哪？舵上面不是有羅盤嗎？',
      '請回到既定航路。以上。',
    ],

    /* ≥20 開始碎念，公事的殼還在但已經懶得端著。 */
    20: [
      '等一下等一下！這是要去哪裡？',
      '前面沒有圖了。真的沒有了。',
      '你想用這艘舊船跨洋嗎？',
      '我不攔你，可是我會記下來。',
      '喂——聽得到嗎？該回頭了。',
    ],

    /* ≥30 半開玩笑，已經是同船的人了。 */
    30: [
      '好，我數到三。一、二……',
      '轉個彎吧？拜託。',
      '……你想走的話，至少先放我們下船。',
      '我今天不想加班。真的。',
      '你每次都這樣。每、次。',
    ],

    /* ≥40 擔心多過職責，話裡開始有「你」而不是「航路」。 */
    40: [
      '你要是掉下去，撈你的人是我。',
      '我不想在報告上寫你的名字。那種報告。',
      '回頭。這次不是命令。',
      '前面沒有東西了。……我確認過很多次了。',
    ],

    /* ≥50 直白。她已經不裝了。 */
    50: [
      '你去哪我都跟。可是今天，別去。',
      '……我會怕。這樣說，可以嗎？',
      '回、頭、了。我等你。',
      '我不寫報告了。你回來就好。',
    ],
  },

  /* 北（上緣）：越往北越冷 */
  N: [
    { lines:[
      {who:'renna',  text:'等等，我們穿這樣再過去，會被凍僵吧？'},
      {who:'anya',   text:'不會的。'},
      {who:'sorana', text:'那是妳啊！'},
    ]},
  ],

  S: [],
  E: [],
  W: [],
};

/* 好感度分級：回傳「不超過 v 的最高門檻」。⚠ 低於第一段也給第一段 —— 沒有更低的
   段落，回 null 的話按鈕會變成沒反應。
   ⚠⚠ ver -724：門檻 10~50 → **20~100**（Ray：「好感度上限改成100…每20一個tier」）。
     這個寬度在三個地方各有一份（`script/progress.js` 的 `TIER_W`、
     `flight/index.html` 的 `progTier`、這裡）—— 改一處要改三處，三邊註解互指。
   ⚠ **台詞池的鑰匙沒有跟著改**：`TALK_EDGE.ANY` 那幾把仍然是 10/20/…，
     所以下面用 `bandKey()` 把新門檻映回舊鑰匙 —— 資料不必重寫。 */
const AFFECTION_BANDS=[20,40,60,80,100];
/* 新門檻 → 台詞池的舊鑰匙（20→10、40→20…）。⚠ 只有這一支在換算（鐵律 7）。 */
function bandKey(b){ return AFFECTION_BANDS.indexOf(b)>=0 ? (AFFECTION_BANDS.indexOf(b)+1)*10 : 10; }
function affBand(v){
  let b=AFFECTION_BANDS[0];
  for(const t of AFFECTION_BANDS) if(v>=t) b=t;
  return b;
}
/* 取該好感度對應的 ANY 池。⚠ 那一段還沒寫台詞就往下退，退到有內容為止 ——
   只寫了第一段就上線也不會壞。 */
function edgeAnyPool(aff){
  const b=affBand(aff);
  for(let i=AFFECTION_BANDS.indexOf(b); i>=0; i--){
    const p=TALK_EDGE.ANY[bandKey(AFFECTION_BANDS[i])];
    if(p && p.length) return p;
  }
  return [];
}

/* 把一筆 TALK_EDGE 條目正規化成 lines 陣列（字串＝蕾娜單句的簡寫）。 */
function edgeLines(entry){
  return (typeof entry==='string') ? [{who:'renna', text:entry}] : entry.lines;
}

/* 攤平成「這個 stage 聽得到的所有對話」。
   ⚠ 群組鍵是「起始章節」，所以取的是所有 <= stage 的群組；再依各組自己的
     until 砍掉過期的。 */
function talksFor(stage){
  const out=[];
  for(const k of Object.keys(TALKS)){
    const from=+k;
    if(!(stage>=from)) continue;
    for(const t of TALKS[k]){
      if(t.until!=null && stage>t.until) continue;
      out.push(t);
    }
  }
  return out;
}

const _inList=(v,x)=> v==null ? true : (Array.isArray(v) ? v.indexOf(x)>=0 : v===x);

/* 硬條件：stage 與「開口的人都在隊伍裡」。**任何情況都不放寬。**
   時段不對只是台詞不應景；進度不對是講到還沒發生的事，或讓還沒入隊的人開口。 */
function talkHard(t, stage){
  /* 章節本身由「放在哪一組」決定（見 talksFor），這裡只再驗隊伍。
     ⚠ 這一條就是「角色是否在隊伍中用 stage 來分」：只要對話裡有人這一章
       不在隊上，整組排除 —— 不必逐組手動標人。 */
  for(const b of t.lines) if(!inParty(b.who, stage)) return false;
  return true;
}

/* 依情境挑一組。回傳 null＝這個 stage 完全沒有可播的對話（＝內容缺口，
   不是程式壞了；用 talkDebug() 看是哪一段缺）。
   ⚠ 軟條件才有保底：先找完全符合的 → 放寬 time → 再放寬 region。
     不保底的話，某個時段剛好沒寫對話時按鈕會變成沒反應，玩家只會覺得壞了。
   ⚠ 排除 lastId：連兩次同一段最容易讓人覺得「就這幾句」。 */
function talkPick(ctx, lastId){
  const base=talksFor(ctx.stage).filter(t=>talkHard(t, ctx.stage));
  const soft=(t,useTime,useRegion)=>{
    const w=t.when||{};
    if(useRegion && w.region && w.region!=='ALL' && !_inList(w.region,ctx.region)) return false;
    if(useTime && !_inList(w.time, ctx.time)) return false;
    return true;
  };
  for(const [ut,ur] of [[true,true],[false,true],[false,false]]){
    let pool=base.filter(t=>soft(t,ut,ur));
    if(pool.length>1 && lastId) pool=pool.filter(t=>t.id!==lastId);
    if(pool.length) return pool[(Math.random()*pool.length)|0];
  }
  return null;
}

/* 內容盤點：各 stage 過得了硬條件的組數、以及各時段的組數。
   ⚠ 改 PARTY 或加 stage 條件之後**一定要看一下這個** —— 填錯章節會讓一整批
     對話無聲消失，畫面上只會表現成「按鈕好像沒反應」，很難回頭找。 */
function talkDebug(maxStage){
  const out={};
  for(let st=1; st<=(maxStage||6); st++){
    const base=talksFor(st).filter(t=>talkHard(t,st));
    const byTime={};
    for(const T of TALK_TIMES)
      byTime[T.key]=base.filter(t=>_inList((t.when||{}).time, T.key)).length;
    out['stage'+st]={ 可播:base.length, 在隊:Object.keys(PARTY).filter(w=>inParty(w,st)), 各時段:byTime };
  }
  return out;
}

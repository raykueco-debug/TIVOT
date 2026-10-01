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

   ── 稱呼（ver -1851，照主線實際用法；舊版的「索拉」「諾」主線從來沒用過）──
     蕾娜：諾薇兒／索菈娜小姐／安雅小姐　　諾薇兒：蕾娜小姐／索菈娜小姐／安雅
     索菈娜：蕾娜／修女小姐（熟了叫諾薇兒）／小公主（自稱姐姐）　安雅：一律直呼名字
     機構一律「聖王廳」。女主角幾乎不叫主角的名字 —— 用「你」。

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
  sorana:   { from: 9 },   // ver -1739 Ray：「索則是 stage9 才加入」（-1360 是 8）。⚠ 與 script/town.js 的 OUTING.who.SORANA.from 是同一件事，改一邊要改另一邊（鐵律 7）
  nouvelle: { from: 1 },
  anya:     { from: 3 },   // ver -1739 Ray：「安雅在 stage3 才會加入」（-742 是 5）。⚠ 與 OUTING.who.ANYA.from 同一件事，改一邊要改另一邊
  /* `away` ＝這兩支旗之間她不參與閒聊（ver -1881，Ray：「雪都事件到古墓踏破前，不播放任何
     有蕾娜參與的閒聊」）。起點＝第一次抵達雪都（`vn_arrive`）、終點＝走出古墓（`tomb_exit_done`）。 */
  renna:    { from: 1, away:{ from:'vn_arrive', until:'tomb_exit_done' } },
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
  if (p.away && typeof flagOn==='function'
      && flagOn(p.away.from) && !flagOn(p.away.until)) return false;
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

/* ══════════════════════════════════════════════════════════════════════
   ver -1851 全面改寫（Ray：「現在劇本也攢夠了，把閒聊台詞換了吧，依照劇中人物的
   個性語氣製作，並注意該 stage 角色是否已加入」）。
   ⚠⚠ **只寫「真的在飛」的那幾章**：S2 首航（帝都→北方泊地）／S4 回程（北泊→聖王廳，
     安雅剛入隊）／S9 起四人同船。S3、S5~S8 船不在天上（北泊、夏爾村，船在湖裡）。
   ⚠⚠ **S10~S13 兩條路線（A 古墓／B 古堡）內容完全不同** —— 閒聊一律不提路線專屬的事
     （髮飾、評鑑報告冷戰、賽西莉學姐、米夏、審訊），只寫兩條線都成立的日常。
   ⚠⚠ **安雅的出身一律不碰**：身分揭曉的章節隨路線不同，閒聊最多到「紫月來的」，
     而且那一組只到 S12（`until:12`）。
   稱呼（照主線實際用法，研究出處見 ver -1851 的 commit）：
     蕾娜 → 諾薇兒「諾薇兒」／索菈娜「索菈娜小姐」／安雅「安雅小姐」／主角「你」
     諾薇兒 → 「蕾娜小姐」「索菈娜小姐」「安雅」／主角「你」
     索菈娜 → 「蕾娜」「修女小姐」（熟了也叫諾薇兒）「小公主」（自稱姐姐）
     安雅 → 一律直呼名字，不加敬稱
     機構一律「聖王廳」（不是教廷）。
   ══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════ STAGE 1 ═══════════════════════════
   S1 還在帝都，船還沒出航 —— 空著。 */
1: [],

/* ═══════════════════════════ STAGE 2 ═══════════════════════════
   第一次出航：帝都 → 北方泊地（東北）。船上只有蕾娜、諾薇兒（＋主角）。
   前半是首航專屬（`until:2`）；後半是兩人的日常，之後的章節照樣聽得到。 */
2: [

    /* ── 首航專屬 ── */
    { id:'s2-oldship', until:2, when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'蕾娜小姐，這艘船……是租來的嗎？'},
      {who:'renna',    text:'是申請來的。跑了好幾趟才批下來呢。'},
      {who:'nouvelle', text:'那、那我走路輕一點。'},
      {who:'renna',    text:'不用啦，它沒那麼脆弱。……應該吧。'},
    ]},

    { id:'s2-northeast', until:2, when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'一直往東北，就是北方泊地。'},
      {who:'nouvelle', text:'那邊很冷嗎？我只帶了一件外套。'},
      {who:'renna',    text:'靠港再買吧。這筆算公費。'},
      {who:'nouvelle', text:'真的可以嗎？'},
      {who:'renna',    text:'我說可以就可以。我是監察官嘛。'},
    ]},

    { id:'s2-age', until:2, when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'那個……可以問你幾歲嗎？報告要填。'},
      {who:'player',   text:''},
      {who:'renna',    text:'十七……比我想的還年輕呢。'},
      {who:'nouvelle', text:'我也是十七喔，蕾娜小姐。'},
      {who:'renna',    text:'……原來船上最年長的是我。'},
    ]},

    { id:'s2-nickname', until:2, when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'蕾娜小姐，真的可以一直這樣叫妳嗎？'},
      {who:'renna',    text:'當然。本來就是我拜託你們叫的。'},
      {who:'nouvelle', text:'可是，那是侯爵家的……'},
      {who:'renna',    text:'都1908年了，沒那麼多規矩啦。'},
      {who:'nouvelle', text:'好、好的，蕾娜小姐。'},
    ]},

    { id:'s2-first-sky', until:2, when:{ region:'ALL', time:['黎明','上午'] }, lines:[
      {who:'nouvelle', text:'原來雲在底下，是這個樣子的……'},
      {who:'renna',    text:'第一次搭飛空艇？'},
      {who:'nouvelle', text:'嗯。上次來帝都，是跟學姐走陸路。'},
      {who:'renna',    text:'那今天多看幾眼吧。第一次只有一次。'},
    ]},

    { id:'s2-watch', until:2, when:{ region:'ALL', time:['夜晚','夜半'] }, lines:[
      {who:'renna',    text:'守夜我先來。反正報告還沒寫完。'},
      {who:'nouvelle', text:'那我陪妳。一個人看夜太久會胡思亂想。'},
      {who:'renna',    text:'……諾薇兒很懂嘛。'},
      {who:'nouvelle', text:'修道院的夜，也很長呀。'},
    ]},

    /* ── 兩人的日常（之後的章節照樣聽得到）── */
    { id:'d-coffin', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'那口槍棺……真的要一直帶在身上？'},
      {who:'nouvelle', text:'他說不帶在身邊會不安心。'},
      {who:'renna',    text:'我不是反對。只是它比我的行李還重。'},
      {who:'nouvelle', text:'比我們兩個的行李加起來還重喔。'},
      {who:'renna',    text:'……我擔心的是甲板。'},
    ]},

    { id:'d-mend', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'你的袖子破了。脫下來，我幫你補。'},
      {who:'player',   text:''},
      {who:'nouvelle', text:'不麻煩的，修道院什麼都要自己來嘛。'},
      {who:'renna',    text:'我只會補文件上的漏洞。'},
      {who:'nouvelle', text:'那也很重要呀。'},
    ]},

    { id:'d-hungry', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'對不起……我肚子有點餓了。'},
      {who:'renna',    text:'早餐才過兩個小時喔。'},
      {who:'nouvelle', text:'施術很耗體力的！……應該吧。'},
      {who:'renna',    text:'好好好，點心在第二個箱子裡。'},
      {who:'nouvelle', text:'蕾娜小姐最好了！'},
    ]},

    { id:'d-luna', when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'renna',    text:'璐娜莉亞團長……是個什麼樣的人？'},
      {who:'nouvelle', text:'很強。情緒上來就不分敵我了。'},
      {who:'renna',    text:'……比傳聞還可怕呢。'},
      {who:'nouvelle', text:'可是她對自己人很好喔。大部分時候。'},
    ]},

    { id:'d-prayer', when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'nouvelle', text:'願今天也平安無事……'},
      {who:'renna',    text:'諾薇兒每天都這麼早。'},
      {who:'nouvelle', text:'習慣了。不做的話，心裡會不踏實。'},
      {who:'renna',    text:'那……順便替我也求一份吧。'},
      {who:'nouvelle', text:'早就有蕾娜小姐的份囉。'},
    ]},

    { id:'d-tea', when:{ region:'ALL', time:['下午','黃昏'] }, lines:[
      {who:'renna',    text:'……這茶，是聖王廳配給的那一種吧？'},
      {who:'nouvelle', text:'嗯。不太好喝對吧？'},
      {who:'renna',    text:'我什麼都沒說。'},
      {who:'nouvelle', text:'蕾娜小姐的表情已經說完了。'},
      {who:'renna',    text:'……下次靠港，我請客。'},
    ]},

    { id:'d-sunset', when:{ region:'ALL', time:'黃昏' }, lines:[
      {who:'nouvelle', text:'從這麼高的地方看夕陽，好不真實。'},
      {who:'renna',    text:'地面上看不到雲的背面嘛。'},
      {who:'nouvelle', text:'蕾娜小姐也會看這種東西呀。'},
      {who:'renna',    text:'……監察官也是人嘛。'},
    ]},

    { id:'d-knight', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'renna',    text:'聖約騎士團的騎士，我以前只在文件上見過。'},
      {who:'renna',    text:'本人跟文件上寫的，差得真多。'},
      {who:'nouvelle', text:'蕾娜小姐，這是誇獎還是……？'},
      {who:'renna',    text:'誇獎。文件很無聊的。'},
    ]},

    { id:'d-midnight', when:{ region:'ALL', time:'夜半' }, lines:[
      {who:'nouvelle', text:'蕾娜小姐，這麼晚了還不睡？'},
      {who:'renna',    text:'評鑑報告還差一點。'},
      {who:'player',   text:''},
      {who:'renna',    text:'……好啦。我收一收就去睡。'},
      {who:'nouvelle', text:'他講得動蕾娜小姐耶，好厲害。'},
    ]},
],

/* ═══════════════════════════ STAGE 4 ═══════════════════════════
   北方泊地出航 → 回聖王廳（往西南）。**安雅剛入隊**（S3）、北泊的事剛過去。
   全部 `until:4`：S5 起船就摔進湖裡了，這一段的心情只屬於這一趟。
   ⚠ 這時候諾薇兒還叫她「安雅小姐」（熟了之後才直呼）。 */
4: [

    { id:'s4-first-flight', until:4, when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'……在飛。'},
      {who:'nouvelle', text:'嗯，在飛喔。安雅小姐第一次坐飛空艇？'},
      {who:'anya',     text:'嗯。……不怕。'},
      {who:'renna',    text:'抓著欄杆說不怕，很有說服力呢。'},
      {who:'anya',     text:'……不怕。'},
    ]},

    { id:'s4-speech', until:4, when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'安雅小姐，我說太快的話要告訴我喔。'},
      {who:'anya',     text:'懂。說……比較慢。'},
      {who:'renna',    text:'慢沒關係。聽得懂比說得快重要。'},
      {who:'anya',     text:'……謝謝。'},
    ]},

    { id:'s4-soup', until:4, when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'安雅小姐，湯。燙，慢慢喝喔。'},
      {who:'anya',     text:'……好喝。'},
      {who:'nouvelle', text:'太好了。還有很多，想喝就說。'},
      {who:'anya',     text:'……再一碗。'},
      {who:'renna',    text:'看來伙食費要重算了。'},
    ]},

    { id:'s4-sealhall', until:4, when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'anya',     text:'到了聖王廳……我，會被帶走？'},
      {who:'renna',    text:'不會。有騎士團在，妳哪裡都不用去。'},
      {who:'nouvelle', text:'嗯。我們會陪著妳的。'},
      {who:'anya',     text:'……嗯。'},
    ]},

    { id:'s4-coffin', until:4, when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'你……那個棺材。很重？'},
      {who:'player',   text:''},
      {who:'anya',     text:'……比我重？'},
      {who:'nouvelle', text:'呵呵，安雅小姐這樣問好可愛。'},
      {who:'renna',    text:'這個問題，他最好別回答。'},
    ]},

    { id:'s4-natalie', until:4, when:{ region:'ALL', time:['夜晚','夜半'] }, lines:[
      {who:'nouvelle', text:'睡不著嗎？'},
      {who:'anya',     text:'……想起娜塔莉。'},
      {who:'nouvelle', text:'嗯。想起來也沒關係的。'},
      {who:'anya',     text:'會……忘記嗎。'},
      {who:'nouvelle', text:'不會。我們一起記得。'},
    ]},

    { id:'s4-stars', until:4, when:{ region:'ALL', time:['夜晚','夜半'] }, lines:[
      {who:'anya',     text:'星星……跟那邊，不一樣。'},
      {who:'renna',    text:'紫月那邊，看得到別的星座嗎？'},
      {who:'anya',     text:'嗯。……名字，不會說。'},
      {who:'nouvelle', text:'那等妳會說了，再教我們吧。'},
      {who:'anya',     text:'……好。'},
    ]},

    { id:'s4-morning', until:4, when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'nouvelle', text:'早安，安雅小姐。睡得好嗎？'},
      {who:'anya',     text:'船……一直在動。'},
      {who:'renna',    text:'我第一晚也是。躺平了還在晃。'},
      {who:'anya',     text:'……蕾娜也是？'},
      {who:'renna',    text:'監察官也會暈船的。這句別傳出去。'},
    ]},
],

/* ═══════════════════════════ STAGE 9 ═══════════════════════════
   索菈娜入隊，四人同船（＋主角）。聖皇諭令：帶安雅去探剩下的遺蹟。
   船還是那艘「破船」；索菈娜當帆手。S9 飛行戲留下的梗：黑魔法（其實是術式）、
   小狗模式、小公主、鄉巴佬、瑪麗亞的廚房。 */
9: [

    /* ── 不限時段 ── */
    { id:'s9-brokenship', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'這破船，今天也好慢耶。'},
      {who:'renna',    text:'破船……是我費好大勁才申請到的船。'},
      {who:'sorana',   text:'所以才說它破嘛。'},
      {who:'renna',    text:'……扣分。'},
      {who:'sorana',   text:'我又不歸妳考核！'},
    ]},

    { id:'s9-blackmagic', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'修女小姐，上次推船那個黑魔法——'},
      {who:'nouvelle', text:'不是黑魔法啦！是術式！'},
      {who:'sorana',   text:'好好好，術式。能再推一次嗎？'},
      {who:'nouvelle', text:'那個很累的，要吃很多才補得回來……'},
      {who:'anya',     text:'……所以，要吃。'},
    ]},

    { id:'s9-puppy', when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'……這附近。有東西。'},
      {who:'sorana',   text:'喔，小狗模式開啟！'},
      {who:'anya',     text:'才不是！'},
      {who:'renna',    text:'索菈娜小姐，請不要再這樣叫了。'},
      {who:'sorana',   text:'可是很準欸。蕾娜不也這麼覺得？'},
      {who:'renna',    text:'……很準沒錯。'},
    ]},

    { id:'s9-bumpkin', when:{ region:'ALL' }, lines:[
      {who:'anya',     text:'……「鄉巴佬」。意思，懂了。'},
      {who:'sorana',   text:'喔？說說看？'},
      {who:'anya',     text:'索菈娜。'},
      {who:'sorana',   text:'喂！'},
      {who:'nouvelle', text:'安雅，不可以學這些難聽的話喔！'},
    ]},

    { id:'s9-senior', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'我這鄉巴佬，飛空艇也是第一次坐。'},
      {who:'anya',     text:'我……第二次。'},
      {who:'sorana',   text:'那妳是前輩了！'},
      {who:'anya',     text:'……前輩。'},
      {who:'nouvelle', text:'安雅好像很開心呢。'},
    ]},

    { id:'s9-outfit', until:14, when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'索菈娜小姐，高空風大，要不要多穿一件？'},
      {who:'sorana',   text:'我又不冷。'},
      {who:'renna',    text:'我是說……旁人看了會冷。'},
      {who:'sorana',   text:'那就別看嘛！'},
      {who:'nouvelle', text:'蕾娜小姐，我們輸了。'},
    ]},

    { id:'s9-eat', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'我、我沒有很餓喔！'},
      {who:'sorana',   text:'我什麼都還沒問耶。'},
      {who:'anya',     text:'肚子，叫了。'},
      {who:'nouvelle', text:'那是船在叫！'},
      {who:'renna',    text:'這艘船今天真多話呢。'},
    ]},

    { id:'s9-ruins', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'安雅小姐，遺蹟的感覺……是什麼樣的？'},
      {who:'anya',     text:'嗡嗡的。……在叫我。'},
      {who:'renna',    text:'叫妳？'},
      {who:'anya',     text:'……說不清楚。'},
      {who:'nouvelle', text:'說不清楚也沒關係。我們一起去看。'},
    ]},

    { id:'s9-sailhand', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'帆交給我，你們去休息啦。'},
      {who:'renna',    text:'索菈娜小姐原來會操帆？'},
      {who:'sorana',   text:'獵人什麼都得會一點嘛。'},
      {who:'sorana',   text:'……喂，你也來幫忙拉一下！'},
      {who:'player',   text:''},
      {who:'sorana',   text:'嗯，力氣不錯。滿足滿足。'},
    ]},

    { id:'s9-pistols', when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'那對手槍，口徑不小吧？保養得真勤。'},
      {who:'player',   text:''},
      {who:'renna',    text:'……原來還能這樣改。我記下來了。'},
      {who:'sorana',   text:'妳連這個也要寫進報告？'},
      {who:'renna',    text:'不寫。是我自己想知道。'},
    ]},

    { id:'s9-machinegun', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'等一下，那挺機槍是要架在座上的——'},
      {who:'sorana',   text:'……你就這樣扛起來了？'},
      {who:'nouvelle', text:'請小心腰喔。'},
      {who:'renna',    text:'那個重量，該擔心的是甲板。'},
      {who:'anya',     text:'……很強。'},
    ]},

    { id:'s9-mapeye', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'風向轉了。這片雲底下是不是有山？'},
      {who:'anya',     text:'有。……三座。'},
      {who:'sorana',   text:'小公主，妳怎麼看得出來？'},
      {who:'anya',     text:'看雲。雲會繞開。'},
      {who:'renna',    text:'兩位都比航圖管用呢。'},
    ]},

    { id:'s9-home', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'好想念瑪麗亞的廚房啊……'},
      {who:'nouvelle', text:'那裡的東西真的好好吃……'},
      {who:'anya',     text:'……想。'},
      {who:'renna',    text:'三個人一起嘆氣，我壓力好大。'},
      {who:'sorana',   text:'那妳煮啊。'},
      {who:'renna',    text:'我會開支票，不會開伙。'},
    ]},

    { id:'s9-report', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'蕾娜，妳每天晚上寫的到底是什麼？'},
      {who:'renna',    text:'評鑑報告。你們每個人的都有。'},
      {who:'sorana',   text:'我也有？'},
      {who:'renna',    text:'有。「服裝儀容：待改進」。'},
      {who:'sorana',   text:'喂！'},
    ]},

    { id:'s9-apply', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'我申請今天的晚餐由我來煮！'},
      {who:'renna',    text:'核准。……為什麼要用申請的？'},
      {who:'nouvelle', text:'因為上次索菈娜小姐烤焦了。'},
      {who:'sorana',   text:'那是火候問題！不是技術問題！'},
      {who:'anya',     text:'……黑的。'},
    ]},

    /* ── 時段 ── */
    { id:'s9-dawn', when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'sorana',   text:'起床起床！太陽都要出來了！'},
      {who:'renna',    text:'……獵人的早晨是不是太早了一點。'},
      {who:'nouvelle', text:'蕾娜小姐，頭髮翹起來了。'},
      {who:'renna',    text:'……！'},
      {who:'anya',     text:'……很可愛。'},
    ]},

    { id:'s9-morningstar', when:{ region:'ALL', time:'黎明' }, lines:[
      {who:'anya',     text:'東邊。那顆。很亮。'},
      {who:'nouvelle', text:'是晨星呢。天快亮了，只剩它還在。'},
      {who:'sorana',   text:'獵人管它叫催工星。看到就得起床。'},
      {who:'anya',     text:'……討厭。'},
      {who:'sorana',   text:'哈哈哈！這句我懂！'},
    ]},

    { id:'s9-wind', when:{ region:'ALL', time:'上午' }, lines:[
      {who:'sorana',   text:'今天風好順，這種日子一年沒幾天！'},
      {who:'renna',    text:'那要不要趁現在多趕一段？'},
      {who:'sorana',   text:'我就在等妳這句。'},
      {who:'anya',     text:'……抓好。'},
      {who:'nouvelle', text:'大家先抓穩再說呀——索菈娜小姐！'},
    ]},

    { id:'s9-rope', when:{ region:'ALL', time:'上午' }, lines:[
      {who:'nouvelle', text:'索菈娜小姐，甲板上那捆繩子是妳的嗎？'},
      {who:'sorana',   text:'啊，我等一下就收！'},
      {who:'anya',     text:'……會絆倒。'},
      {who:'sorana',   text:'好啦好啦，兩個人一起唸我。'},
      {who:'renna',    text:'三個人。我只是還沒開口。'},
    ]},

    { id:'s9-hunt', when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'sorana',   text:'空中的鳥要射，得先算風。'},
      {who:'anya',     text:'……怎麼算。'},
      {who:'sorana',   text:'看雲、看羽毛、看牠怎麼拍翅膀。'},
      {who:'sorana',   text:'喂，你剛剛那一槍也算過風吧？'},
      {who:'player',   text:''},
      {who:'sorana',   text:'……講得像在說今天天氣。可惡。'},
    ]},

    { id:'s9-nap', when:{ region:'ALL', time:'下午' }, lines:[
      {who:'nouvelle', text:'噓——安雅在打盹呢。'},
      {who:'sorana',   text:'她坐著也能睡？'},
      {who:'nouvelle', text:'很淺的。有一點聲音就會醒。'},
      {who:'anya',     text:'……醒著。'},
      {who:'sorana',   text:'妳看吧！'},
    ]},

    { id:'s9-piggyback', when:{ region:'ALL', time:['下午','黃昏'] }, lines:[
      {who:'sorana',   text:'小公主，累了嗎？要不要姐姐背妳？'},
      {who:'anya',     text:'不要。……不累。'},
      {who:'sorana',   text:'腳都在抖了喔。'},
      {who:'anya',     text:'是船在抖。'},
      {who:'nouvelle', text:'呵呵，說得也是呢。'},
    ]},

    { id:'s9-sunset', when:{ region:'ALL', time:'黃昏' }, lines:[
      {who:'nouvelle', text:'雲被染成這個顏色時，總覺得該說點什麼。'},
      {who:'renna',    text:'那就什麼都別說，看著就好。'},
      {who:'sorana',   text:'難得蕾娜說話不繞路。'},
      {who:'renna',    text:'……偶爾嘛。'},
      {who:'anya',     text:'很好看。'},
    ]},

    { id:'s9-moor', when:{ region:'ALL', time:'黃昏' }, lines:[
      {who:'sorana',   text:'天要黑了，找個背風的地方停吧。'},
      {who:'renna',    text:'前面那道谷口如何？擋風，也擋視線。'},
      {who:'sorana',   text:'妳連這個都想到了。'},
      {who:'renna',    text:'職業病，別介意。'},
      {who:'anya',     text:'……那裡有水。'},
    ]},

    { id:'s9-lantern', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'renna',    text:'船燈調暗一點吧，遠處看得見我們。'},
      {who:'sorana',   text:'妳是怕誰看見？'},
      {who:'renna',    text:'沒有誰。只是習慣。'},
      {who:'nouvelle', text:'那就調暗吧。反正有月亮。'},
    ]},

    { id:'s9-moon', until:12, when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'nouvelle', text:'今晚的銀月好亮。'},
      {who:'anya',     text:'在紫月……也看得到。'},
      {who:'sorana',   text:'紫月？小公主是從那麼遠來的啊。'},
      {who:'anya',     text:'……嗯。不想提。'},
      {who:'renna',    text:'那就不提。誰都有不想提的事。'},
      {who:'nouvelle', text:'那我們一起看月亮就好。'},
    ]},

    { id:'s9-stars', when:{ region:'ALL', time:'夜晚' }, lines:[
      {who:'sorana',   text:'獵人認星是為了認路。妳們呢？'},
      {who:'nouvelle', text:'修道院教我們認星，是為了記得時辰。'},
      {who:'renna',    text:'聖王廳是為了寫進紀錄。同一片天，三種用法。'},
      {who:'anya',     text:'……我只是看。'},
      {who:'sorana',   text:'那大概是最好的用法。'},
    ]},

    { id:'s9-nightwatch', when:{ region:'ALL', time:'夜半' }, lines:[
      {who:'sorana',   text:'今晚換我守夜，妳們去睡。'},
      {who:'nouvelle', text:'索菈娜小姐昨晚也守了，今天換我吧。'},
      {who:'sorana',   text:'我不睏。'},
      {who:'anya',     text:'眼睛。紅的。'},
      {who:'sorana',   text:'……被看穿了。'},
      {who:'renna',    text:'那就排班。我排好了，每個人都睡得滿。'},
    ]},

    { id:'s9-creak', when:{ region:'ALL', time:'夜半' }, lines:[
      {who:'nouvelle', text:'安雅？這麼晚了還不睡呀。'},
      {who:'anya',     text:'……船在響。'},
      {who:'nouvelle', text:'是木頭的聲音。夜裡涼了就會這樣叫。'},
      {who:'anya',     text:'不是……壞掉？'},
      {who:'sorana',   text:'這艘破船真要壞，早就壞啦。'},
      {who:'renna',    text:'索菈娜小姐！'},
    ]},
],

/* ═══════════════════════════ STAGE 14 ═══════════════════════════
   雪都合流 → 前往聖索菲亞（瓦勒里亞王國，中立國、不是聖王廳教區）。
   `until:14`：S15 入城之後大家都換了裝。 */
14: [

    { id:'s14-clothes', until:14, when:{ region:'ALL' }, lines:[
      {who:'renna',    text:'索菈娜小姐，入城前要不要換身衣服？'},
      {who:'sorana',   text:'我也沒其他衣服啊！'},
      {who:'nouvelle', text:'那到了先去買吧，我陪妳挑。'},
      {who:'sorana',   text:'修女挑的衣服？那不就……'},
      {who:'nouvelle', text:'不、不會是修女服啦！'},
    ]},

    { id:'s14-neutral', until:14, when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'renna',    text:'瓦勒里亞是中立國，入境要照規矩來。'},
      {who:'sorana',   text:'規矩最麻煩了。'},
      {who:'renna',    text:'所以才需要我這個監察官嘛。'},
      {who:'anya',     text:'……蕾娜，很可靠。'},
      {who:'renna',    text:'安雅小姐，這句可以再說一次。'},
    ]},

    { id:'s14-together', until:14, when:{ region:'ALL', time:['黃昏','夜晚'] }, lines:[
      {who:'nouvelle', text:'大家又在同一艘船上了呢。'},
      {who:'sorana',   text:'本來就該這樣。'},
      {who:'anya',     text:'……嗯。'},
      {who:'renna',    text:'這次，誰都別再一個人亂跑囉。'},
    ]},
],

/* ═══════════════════════════ STAGE 15 ═══════════════════════════
   聖索菲亞救回蘿法之後 → 羅賽爾廢城。大家換上冒險者的裝束；禁航區已解除。 */
15: [

    { id:'s15-outfit', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'蕾娜，這身冒險者的衣服很適合妳嘛。'},
      {who:'renna',    text:'謝謝。……還有點不習慣就是了。'},
      {who:'sorana',   text:'我也是。穿這麼多，全身不對勁。'},
      {who:'nouvelle', text:'索菈娜小姐，那才是正常的量喔。'},
      {who:'anya',     text:'……好看。'},
    ]},

    { id:'s15-eat', when:{ region:'ALL' }, lines:[
      {who:'nouvelle', text:'我不能再這樣吃下去了……'},
      {who:'sorana',   text:'這句妳今天說第三次了。'},
      {who:'nouvelle', text:'聖索菲亞的點心太好吃了嘛！'},
      {who:'anya',     text:'……還有，嗎？'},
      {who:'renna',    text:'安雅小姐，不要煽動她。'},
    ]},

    { id:'s15-sisters', when:{ region:'ALL', time:['黃昏','夜晚'] }, lines:[
      {who:'nouvelle', text:'蘿媞和蘿法，現在應該在一起吃飯吧。'},
      {who:'sorana',   text:'那兩個一定黏得緊緊的。'},
      {who:'anya',     text:'……姐妹。好。'},
      {who:'renna',    text:'能幫上眼前的人，已經很幸運了。'},
    ]},

    { id:'s15-rosel', when:{ region:'ALL', time:['上午','下午'] }, lines:[
      {who:'renna',    text:'廢城附近沒有能登陸的城鎮，補給要算好。'},
      {who:'nouvelle', text:'乾糧跟水我都分好了。'},
      {who:'sorana',   text:'不夠就打獵嘛。'},
      {who:'renna',    text:'在廢城附近打獵……我不想知道會打到什麼。'},
      {who:'anya',     text:'……不能吃的。'},
    ]},

    { id:'s15-sky', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'禁航區解除之後，天空好寬啊！'},
      {who:'renna',    text:'可別因為這樣就亂飛。報告還是要寫的。'},
      {who:'sorana',   text:'知道啦，扣分監察官。'},
      {who:'renna',    text:'……這個稱號我不收。'},
    ]},

    { id:'s15-hunterlicense', when:{ region:'ALL' }, lines:[
      {who:'sorana',   text:'賞金獵人執照，虧妳想得到。'},
      {who:'renna',    text:'聖王廳管不到的地方，就換個身分管。'},
      {who:'nouvelle', text:'蕾娜小姐好厲害……'},
      {who:'renna',    text:'只是比較會鑽規則而已。'},
      {who:'anya',     text:'……壞人的，方法。'},
      {who:'renna',    text:'安雅小姐？'},
    ]},
],

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

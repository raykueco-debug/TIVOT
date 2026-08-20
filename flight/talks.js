/* ══════════════════════════════════════════════════════════════════════
   閒聊對話（右上「對話」鈕）
   ──────────────────────────────────────────────────────────────────────
   這個檔案**只放內容**，挑選與播放的機制在 flight/index.html。
   要加台詞、改台詞、加新的觸發條件，動這裡就好。

   ⚠ 是「隨機挑一組」不是「隨機生成」：執行期沒有語言模型。每人各抽一句的話
     四句彼此無關，讀起來像四個人各自自言自語，所以寫成整段的對話一次播完。

   ── 一組對話長這樣 ────────────────────────────────────────────────
     { id:'唯一名字',
       when:{ region:'ALL', time:['黎明'], stage:1 },
       lines:[ {who:'sorana', text:'…'}, {who:'anya', text:'…'} ] }

     when 的三個條件**都省略＝永遠符合**：
       region  地區。目前地圖還沒分區，一律 'ALL'（＝不限地區）。
               日後要限地區就填國名，與 region_map.json 的 zh 同字串，
               例如 '薩梅爾帝國'。也可以給陣列。
       time    時段。六等份，見下方 TALK_TIMES。可給字串或陣列。
       stage   故事進度。目前一律 1。可給數字或陣列。

   ── 角色口氣（Ray 指定，改台詞照著走）──────────────────────────────
     蕾娜   renna    21 監察官　有禮優雅但不擺架子、溫和圓滑、一點成熟的職業感
     諾薇兒 nouvelle 17 修女　　溫柔溫婉、會照顧人
     索拉娜 sorana   19 獵手　　坦蕩、直接、開朗、有一點男孩子氣
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

const TALKS = [

  /* ───────────────────────── 不限時段 ───────────────────────── */

  { id:'cloud-mountains', when:{ region:'ALL', stage:1 }, lines:[
    {who:'sorana',   text:'風向轉了。這片雲海底下，是不是有山？'},
    {who:'anya',     text:'有。三座。'},
    {who:'sorana',   text:'你怎麼知道得這麼快啊你。'},
    {who:'anya',     text:'……看雲。雲會繞開。'},
    {who:'nouvelle', text:'安雅說得對呢。雲繞著走的地方，底下多半是硬的。'},
    {who:'renna',    text:'兩位都比我這個監察官管用。報告我就寫「航路由船員自行判定」。'},
  ]},

  { id:'soup', when:{ region:'ALL', stage:1 }, lines:[
    {who:'nouvelle', text:'今天的湯我多煮了一些，大家記得趁熱喝。'},
    {who:'sorana',   text:'太好了！我去甲板上叫安雅。'},
    {who:'anya',     text:'……已經在這裡。'},
    {who:'sorana',   text:'哇！你走路沒聲音這件事我永遠習慣不了。'},
    {who:'anya',     text:'抱歉。'},
    {who:'nouvelle', text:'不用道歉呀。來，先坐下。'},
    {who:'renna',    text:'我也分一碗好嗎？「監察官在船上蹭飯」我不會寫進去的。'},
  ]},

  { id:'hound', when:{ region:'ALL', stage:1 }, lines:[
    {who:'renna',    text:'安雅小姐，方才那個地方——妳是怎麼找到的？'},
    {who:'anya',     text:'感覺。說不清楚。'},
    {who:'renna',    text:'說不清楚也沒關係。教廷的紀錄裡，說得太清楚的反而少見。'},
    {who:'sorana',   text:'我倒覺得她是鼻子好。跟獵犬一樣。'},
    {who:'anya',     text:'……我不是狗。'},
    {who:'sorana',   text:'誇你啦！獵犬很厲害的！'},
    {who:'nouvelle', text:'索拉娜，這種誇法要看對象的。'},
  ]},

  { id:'blank-map', when:{ region:'ALL', stage:1 }, lines:[
    {who:'renna',    text:'這一帶已經出了帝國的圖了。再往東，紙上就是空白。'},
    {who:'sorana',   text:'空白最好。空白代表沒人去過。'},
    {who:'renna',    text:'也代表沒人回來過。'},
    {who:'sorana',   text:'……妳這人真會說話。'},
    {who:'anya',     text:'我去。'},
    {who:'nouvelle', text:'等等，安雅，先讓大家都同意再說呀。'},
    {who:'anya',     text:'……好。我等。'},
  ]},

  { id:'names', when:{ region:'ALL', stage:1 }, lines:[
    {who:'anya',     text:'……「索拉娜」。這樣念，對嗎。'},
    {who:'sorana',   text:'對！很標準啊。'},
    {who:'anya',     text:'太長。舌頭會累。'},
    {who:'sorana',   text:'那你叫我索拉就好了。'},
    {who:'nouvelle', text:'那我呢？諾薇兒也不短。'},
    {who:'anya',     text:'……諾。'},
    {who:'renna',    text:'看來我得慶幸自己只有兩個字。'},
  ]},

  /* ───────────────────────── 夜半 ───────────────────────── */

  { id:'nightwatch', when:{ region:'ALL', time:'夜半', stage:1 }, lines:[
    {who:'sorana',   text:'今晚換我守夜，你們去睡。'},
    {who:'nouvelle', text:'妳昨晚也守了。今天換我吧，好不好？'},
    {who:'sorana',   text:'我不睏。'},
    {who:'anya',     text:'眼睛。紅的。'},
    {who:'sorana',   text:'……被看穿了。'},
    {who:'renna',    text:'那就三個人輪。我算過了，這樣每個人都睡得滿。'},
  ]},

  { id:'cant-sleep', when:{ region:'ALL', time:'夜半', stage:1 }, lines:[
    {who:'nouvelle', text:'安雅？這麼晚了還不睡呀。'},
    {who:'anya',     text:'……船在響。'},
    {who:'nouvelle', text:'是木頭的聲音喔。船身熱脹冷縮，夜裡就會這樣叫。'},
    {who:'anya',     text:'原來。不是壞掉。'},
    {who:'renna',    text:'我第一次上船時也嚇了一跳，還以為要沉了。'},
    {who:'nouvelle', text:'那我陪妳坐一會兒，等它安靜下來。'},
  ]},

  /* ───────────────────────── 黎明 ───────────────────────── */

  { id:'morning-star', when:{ region:'ALL', time:'黎明', stage:1 }, lines:[
    {who:'anya',     text:'東邊。那顆。很亮。'},
    {who:'nouvelle', text:'是晨星呢。天要亮的時候，只剩它還在。'},
    {who:'sorana',   text:'獵人管它叫催工星。看到它就代表該起來了。'},
    {who:'anya',     text:'……真討厭。'},
    {who:'sorana',   text:'哈哈哈！你這句我懂！'},
    {who:'renna',    text:'教廷的曆書上寫得雅得多，可惜沒有這句實在。'},
  ]},

  { id:'dawn-fog', when:{ region:'ALL', time:'黎明', stage:1 }, lines:[
    {who:'sorana',   text:'霧真厚。這種天最容易撞山。'},
    {who:'renna',    text:'要不要降一點高度？貼著雲面走視野會好些。'},
    {who:'sorana',   text:'貼太近會被上升氣流頂。我寧可慢一點。'},
    {who:'anya',     text:'我看前面。'},
    {who:'nouvelle', text:'那我去煮點熱的。這種天，手會冷。'},
  ]},

  /* ───────────────────────── 上午 ───────────────────────── */

  { id:'deck-check', when:{ region:'ALL', time:'上午', stage:1 }, lines:[
    {who:'nouvelle', text:'索拉娜，甲板上那捆繩子是妳放的嗎？'},
    {who:'sorana',   text:'啊，我等一下就收！'},
    {who:'anya',     text:'……會絆倒。'},
    {who:'sorana',   text:'好啦好啦我現在收，兩個人一起唸我。'},
    {who:'renna',    text:'三個人。我只是還沒開口。'},
  ]},

  { id:'wind-good', when:{ region:'ALL', time:'上午', stage:1 }, lines:[
    {who:'sorana',   text:'今天風好順，這種日子一年沒幾天。'},
    {who:'renna',    text:'那要不要趁現在多趕一段？'},
    {who:'sorana',   text:'我就在等妳這句。'},
    {who:'anya',     text:'……抓好。'},
    {who:'nouvelle', text:'安雅說得對，大家先抓穩再說呀——索拉娜！'},
  ]},

  /* ───────────────────────── 下午 ───────────────────────── */

  { id:'nap', when:{ region:'ALL', time:'下午', stage:1 }, lines:[
    {who:'nouvelle', text:'噓——安雅在打盹呢。'},
    {who:'sorana',   text:'她坐著也能睡？'},
    {who:'nouvelle', text:'很淺的。有一點聲音她就會醒。'},
    {who:'anya',     text:'……醒著。'},
    {who:'sorana',   text:'你看吧！'},
    {who:'renna',    text:'那就別吵她了。這艘船上最需要休息的就是她。'},
  ]},

  { id:'supplies', when:{ region:'ALL', time:'下午', stage:1 }, lines:[
    {who:'renna',    text:'補給清單我列好了。要看嗎？'},
    {who:'sorana',   text:'妳念，我聽。'},
    {who:'renna',    text:'水、油、鹽、繩、藥，還有妳上次弄斷的那根撐桿。'},
    {who:'sorana',   text:'……那根不算我弄斷的，是它自己老了。'},
    {who:'anya',     text:'妳踩的。'},
    {who:'nouvelle', text:'安雅，這種時候不用這麼誠實也可以喔。'},
  ]},

  /* ───────────────────────── 黃昏 ───────────────────────── */

  { id:'sunset', when:{ region:'ALL', time:'黃昏', stage:1 }, lines:[
    {who:'nouvelle', text:'雲被染成那個顏色的時候，我總覺得該說點什麼。'},
    {who:'renna',    text:'那就什麼都別說，看著就好。'},
    {who:'sorana',   text:'難得妳說話不繞路。'},
    {who:'renna',    text:'……偶爾。'},
    {who:'anya',     text:'很好看。'},
  ]},

  { id:'moor', when:{ region:'ALL', time:'黃昏', stage:1 }, lines:[
    {who:'sorana',   text:'天要黑了，找個背風的地方停吧。'},
    {who:'renna',    text:'前面那道谷口如何？擋風，也擋別人的視線。'},
    {who:'sorana',   text:'妳連這個都想到了。'},
    {who:'renna',    text:'職業病，別介意。'},
    {who:'anya',     text:'……那裡有水。'},
    {who:'nouvelle', text:'那就更好了，正好補一點。'},
  ]},

  /* ───────────────────────── 夜晚 ───────────────────────── */

  { id:'silver-moon', when:{ region:'ALL', time:'夜晚', stage:1 }, lines:[
    {who:'nouvelle', text:'今晚的銀月好亮。'},
    {who:'anya',     text:'在我家鄉……也看得到。'},
    {who:'sorana',   text:'你家鄉？你從來沒提過欸。'},
    {who:'anya',     text:'……沒什麼好提。'},
    {who:'renna',    text:'誰都有不想提的事。我也有。'},
    {who:'nouvelle', text:'那我們就一起看月亮，什麼都不用提。'},
  ]},

  { id:'stars', when:{ region:'ALL', time:'夜晚', stage:1 }, lines:[
    {who:'sorana',   text:'獵手認星是為了認路。你們呢？'},
    {who:'nouvelle', text:'修道院教我們認星，是為了記得時辰。'},
    {who:'renna',    text:'教廷則是為了寫進紀錄。同一片天，三種用法。'},
    {who:'anya',     text:'……我只是看。'},
    {who:'sorana',   text:'那大概是最好的用法。'},
  ]},

  { id:'lantern', when:{ region:'ALL', time:'夜晚', stage:1 }, lines:[
    {who:'renna',    text:'船燈調暗一點吧。太亮，遠處看得見我們。'},
    {who:'sorana',   text:'妳是怕誰看見？'},
    {who:'renna',    text:'沒有誰。只是習慣。'},
    {who:'anya',     text:'……我也是。'},
    {who:'nouvelle', text:'那就都調暗吧。反正有月亮。'},
  ]},

];

/* 依情境挑一組。回傳 null＝完全沒得挑（正常情況不會發生，見 index.html 的保底）。
   ⚠ 條件愈嚴的愈優先：先找完全符合的；沒有就放寬 time；再沒有就放寬 region。
     不做保底的話，某個時段沒寫對話時按鈕會變成沒反應，玩家只會覺得壞了。
   ⚠ 排除 lastId：連兩次同一段最容易讓人覺得「就這幾句」。 */
function talkPick(ctx, lastId){
  const inList=(v,x)=> v==null ? true
    : (Array.isArray(v) ? v.indexOf(x)>=0 : v===x);
  const ok=(t,useTime,useRegion)=>{
    const w=t.when||{};
    if(useRegion && w.region && w.region!=='ALL' && !inList(w.region,ctx.region)) return false;
    if(useTime && !inList(w.time, ctx.time)) return false;
    if(!inList(w.stage, ctx.stage)) return false;
    return true;
  };
  for(const [ut,ur] of [[true,true],[false,true],[false,false]]){
    let pool=TALKS.filter(t=>ok(t,ut,ur));
    if(pool.length>1 && lastId) pool=pool.filter(t=>t.id!==lastId);
    if(pool.length) return pool[(Math.random()*pool.length)|0];
  }
  return null;
}

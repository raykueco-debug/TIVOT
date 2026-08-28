/* 立繪取景值（每張圖的 top/bot/fx）**只有一份**，就在 script/speakers.js 的 ART。
   教學的說明立繪與劇情的立繪是同一批圖，量出來的當然是同一組數字 ——
   ⚠ 不要在這裡再抄一份。這個專案被「同一組數字寫在兩個地方」咬過好幾次
     （speakers.js 與 flight 的 PORTRAIT 至今仍是「改一邊要改兩邊」，
      那是因為兩邊隔著資料夾邊界不好共用，不是因為抄一份比較好）。
   ⚠ speakers.js 不 import 任何東西，所以這條相依不會成環。 */
import { ART } from './script/speakers.js';

/* ============================================================================
 *  config.js — 遊戲內容資料層（唯一資料來源）
 *  ---------------------------------------------------------------------------
 *  自 reference/index.html 抽出的 GAME_CONFIG 與 ASSETS，逐字搬遷、行為等價。
 *  鐵律：所有內容數值集中在此，程式碼一律讀 config，不得寫死內容數值。
 *  ASSETS 路徑已指向專案內現有的 resources/ 目錄。
 * ========================================================================== */

/* 版本號：顯示於診斷 HUD（首頁連點團徽 5 下開啟），每次部署遞增尾碼——
 *  用來確認手機（尤其 iOS 主畫面 App 的頑固快取）實際跑到的是哪一版。 */
export const VERSION = 'ver 2026.08.28-520';

export const GAME_CONFIG = {

  /* ------------------------------------------------------------------ *
   *  一、武器（特武）— Counter 反擊時使用
   *  counterWin  = 反擊判定窗口大小（越大越好按，越小風險越高回報越大，範圍 0~1）
   *  hits        = 反擊打幾發
   *  dmgPerHit   = 每發傷害（反擊總傷＝hits×dmgPerHit；重機槍 48 為基準）
   *  vfx         = 傷害數字視覺：'burst'＝同區塊同時跳多個數字（散彈）、
   *                'single'＝單發較大紅字（狙擊）、留 null＝預設逐發跳
   *  defenseDamageScale = Defense（格擋）段受傷倍率（相對大絕 ULT_DAMAGE）：
   *                      0.5＝半傷（預設，重機槍等）、0.25＝四分之一傷（散彈的保命特性）、
   *                      0＝完全免傷。留 null 視為 0.5。
   *  noPerfectBand     = true → 取消 Perfect 免傷帶（橘圈被黃圈取代）：
   *                      只剩「防一半」或「反擊成功」（狙擊的高風險特性）
   *  image       = 武器 icon（可留 null，暫時不顯示）
   *  sound       = 反擊音效鑰匙（可留 null，用預設合成音）
   *  新增武器：複製一整段 {...}，改鑰匙名與數值即可。
   * ------------------------------------------------------------------ */
  //  ⚠ 武器鑰匙＝圖檔基底名（類型_武器名，同 resources/weapon/ 圖庫命名，統一代碼與檔名）。
  //  name＝選單全名；shortName＝首頁 loadout 鈕顯示的綽號（全名過長會爆版）。
  //  desc＝選單規格文案（\n 換行，.ws-desc 為 pre-line）；暴擊率＝tuning.counterCritRate（20%）。
  /* ══ 副武器（反擊武器）══
     ⚠ 欄位對照 Ray 的**武器卡**（ver -377 起）：
         分類 → `cat`（比較數值時用它找同類）
         黃圈 → `defenseDamageScale`（1＝無減傷、0.5＝減傷 50%、0.25＝減傷 75%）
         橘圈 → `noPerfectBand:true`＝沒有完防帶；否則免傷，或 `perfectDmgPerHit`＝改打傷害
         紅圈 → `hits` × `dmgPerHit`
         爆擊率 → `critRate`（沒寫才回去用 tuning.counterCritRate）
         最大改裝等級 → `maxMod`（**資料先放著，改裝系統還沒做**）
         價格 → `price`（沒寫＝**買不到也賣不掉**）
     ⚠ `perfectDmgPerHit` 存的是**卡上的絕對值**（龍息橘圈 6 發 ×4），不是倍率 ——
       倍率由 `defense.js` 現算（`perfectDmgPerHit / dmgPerHit`）。卡上寫幾就存幾（鐵律 7）。
     ⚠ `owned:true` ＝ **開局就有**。其餘要在槍店買，持有量記在道具欄（id 就是這個鑰匙）。
     ⚠⚠ **`story` ＝ 本篇（劇情／城鎮）專用的數值覆寫**（ver -378，Ray 指定：
       「修改初始特殊武器數值，但是跟試玩版的『出陣』那個分開，試玩版的不要動」）。
       本體那一組是**試玩版**（首頁出陣、教學）在用的，一個字都不要動；
       本篇要調就只動 `story` 裡那幾欄。讀取一律走 `weaponOf(key, story?)`（鐵律 8：
       一個判斷一支函式）—— 不要在各處自己 `Object.assign` 一次。
     ⚠ `value` ＝ **市價**（卡上寫的那個數字），**不是** `price`：初始武器
       Ray 指定「不能賣」，而 `price` 一寫下去就會有賣價（見 inventory.sellPrice）。
       兩者分開之後，卡上的數字留著給改裝／日後的估價用，但賣不掉。 */
  weapons: {
    // B1901 陣地機槍「絞肉機」：基準武器（反擊總傷 48），Perfect 帶正常、Defense 吃半傷（0.5）
    MG_Squall:     { name:'B1901陣地機槍「絞肉機」', shortName:'絞肉機', cat:'重機槍',
                     owned:true, critRate:0.20, maxMod:5, value:4000,
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     defenseDamageScale:0.5,  noPerfectBand:false, image:'weapon_mg_squall',     sound:'se_mg_squall',
                     flavor:'攻守均衡的可靠選擇',
                     /* 本篇用的數值（ver -378，Ray 的「初始重機槍」卡）：紅圈 8發×3、爆擊 10%。 */
                     story:{ hits:8, dmgPerHit:3, critRate:0.10 } },
    // 雙管霰彈槍「鐵拳」：Counter 6發×4=24；Perfect 檔改打 6發×2=12（perfectDmgPerHit=2，傷害取代免傷）；Defense 檔吃 1/4 傷（0.25＝減傷75%）
    Shotgun_Blast: { name:'雙管霰彈槍「鐵拳」', shortName:'鐵拳', cat:'霰彈槍',
                     owned:true, critRate:0.20, maxMod:5, value:3000,
                     counterWin:0.20, hits:6, dmgPerHit:4,  vfx:'burst',  defenseDamageScale:0.25, noPerfectBand:false, perfectDmgPerHit:2, image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     flavor:'保命的穩健之選',
                     /* 本篇用的數值（ver -378，Ray 的「初始霰彈槍」卡）：黃圈 減傷50%、紅圈 6發×3。
                        ⚠ 黃圈由 75% **降**到 50%（試玩版那把仍是 75%）。 */
                     story:{ hits:6, dmgPerHit:3, defenseDamageScale:0.5, perfectDmgPerHit:2 } },
    // 85 式步槍「嗜心者」：反擊總傷 72（1.5 倍）、單發大紅字、無 Perfect 帶；
    //   defenseDamageScale 1＝黃圈也無減傷（與文案一致：賭上一切，防禦全靠反擊窗）
    Sniper_Falcon: { name:'85式萊福槍「嗜心者」', shortName:'嗜心者', cat:'萊福槍',
                     owned:true, critRate:0.20, maxMod:5, value:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', defenseDamageScale:1,    noPerfectBand:true,  image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     flavor:'賭上一切的單發重擊',
                     /* 本篇用的數值（ver -378，Ray 的「初始萊福槍」卡）：紅圈 1發56。 */
                     story:{ hits:1, dmgPerHit:56 } },

    /* ── 槍店的貨（ver -377，Ray 的武器卡）──────────────────────────
       ⚠ 這三把**沒有自己的立繪與音效**：先借同類那一把的（`image`/`sound`）。
         素材到位就只改這兩欄。 */
    Shotgun_Dragon:{ name:'短板霰彈槍「龍息」', shortName:'龍息', cat:'霰彈槍',
                     critRate:0.20, maxMod:5, price:3000,
                     counterWin:0.20, hits:6, dmgPerHit:6,  vfx:'burst',  defenseDamageScale:0.5,  noPerfectBand:false, perfectDmgPerHit:4, image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     flavor:'短管、近身、火力壓制' },
    /* ⚠ 「絞肉機 改」的爆擊率是 **10%**（比原版 20% 低）—— 卡上就是這麼寫的。
       數值面它與原版只差這一項，其餘完全相同。要調就跟 Ray 確認，不要自己改順。 */
    MG_Squall_Kai: { name:'B1901陣地機槍「絞肉機 改」', shortName:'絞肉機改', cat:'重機槍',
                     critRate:0.10, maxMod:5, price:4000,
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     defenseDamageScale:0.5,  noPerfectBand:false, image:'weapon_mg_squall',     sound:'se_mg_squall',
                     flavor:'原廠改良型' },
    Rifle_Shahin:  { name:'Shahin栓動萊福槍「遊隼」', shortName:'遊隼', cat:'萊福槍',
                     critRate:0.20, maxMod:5, price:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', defenseDamageScale:1,    noPerfectBand:true,  image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     flavor:'栓動、遠距、一擊定生死' },
    // 新武器：複製一段，鑰匙用「類型_武器名」（同圖檔基底名），image 指對應 ASSETS 鑰匙。
  },
  defaultWeapon: 'MG_Squall',   // 開局預設武器（填上面的鑰匙名）
  /* 副武器類別 → 切換鈕的圖示（ver -481，Ray：「用簡單易懂清楚可辨的
     『連射武器』『散射武器』『單發高威力武器』圖示代替」）。
     圖示本體（SVG）在 weapon.js 的 WS_ICONS —— 這裡只記「哪一類用哪一個」，
     加新類別補一行（鐵律 1）。 */
  weaponCatIcons: { '重機槍':'rapid', '霰彈槍':'spread', '萊福槍':'single' },

  /* ------------------------------------------------------------------ *
   *  二、搭檔（修女 Partner）— 改變戰鬥規則的角色
   *  image  = 立繪鑰匙
   *  cutin  = 聖徒化 cut-in 大圖鑰匙
   *  voice  = 語音鑰匙（可 null）
   *  perk   = 被動效果說明（目前僅記錄，效果之後接）
   *  新增搭檔：複製一段，改鑰匙名與圖音即可。
   * ------------------------------------------------------------------ */
  partners: {
    renee: {
      name:'蕾妮',
      image:'partner_renee',   // 選人畫面大立繪（Renee_SI_01）
      // 選人畫面取景（基準）：zoom=1 整張以高度貼合取景框；top=0 頭頂對齊框頂。
      //   蕾妮原圖即膝上構圖、頭約佔畫高 22%，作為所有搭檔「頭部大小」的基準。
      siFit:{ zoom:1, top:0 },
      cutin:'cutin_saint',     // 聖徒化演出大圖
      voice:null,              // 語音（PARTNER_SE_SI）之後填
      selectVoice:'vo_life_return', // 選人畫面「選擇此搭檔」確認 SE（→ Renee_VC_Act.wav，與生命歸還共用）
      perk:'即死防禦（被動）＋生命歸還（主動）',
      // ── 被動技：即死防禦 ─────────────────────────────
      //   整場一次性。受到足以致死的攻擊時，改為保留 1 HP，並插入 cut-in。用掉後失效。
      passive:{
        key:'deathGuard',
        name:'即死防禦',
        oncePerBattle:true,      // true=整場只擋一次；false=每次都擋（不建議）
        cutin:'cutin_guard',     // 即死防禦專屬大圖（→ Renee_CI_pas.jpg）；程式讀此欄，不硬寫
        voice:'vo_death_guard',  // cut-in 對應 SE（→ Renee_VC_Pas.wav）
        desc:'受到足以致死的攻擊時，為玩家保留1hp續命。',
      },
      // ── 主動技：生命歸還 ─────────────────────────────
      //   聖徒化中，由「下往上滑」發動：強制中止聖徒化，保留當前血量（第四結局）。
      active:{
        key:'lifeReturn',
        name:'生命歸還',
        context:'saint',         // 發動情境：'saint'＝聖徒化內 / 'board'＝一般盤面 / 'any'＝兩者皆可
        cutin:'cutin_return',    // 生命歸還演出大圖（→ Renee_CI_act.jpg）；實際演出由 saint scImgKey.return 讀同一鑰匙
        voice:'vo_life_return',  // cut-in 對應 SE（→ Renee_VC_Act.wav）
        desc:'聖徒化期間發動：強制中止聖徒化，保留當前血量。',
      },
    },
    /* ── 諾薇兒（ver -422，Ray：「延用蕾妮的能力，CI 之後再補」）───────────
       ⚠⚠ **能力鑰匙沿用蕾妮的**（`deathGuard` / `lifeReturn`）—— 那兩支的實作在
         `modules/partner.js` 與 `modules/saint.js`，`key` 是程式認的字串。
         給新鑰匙等於要新寫一支技能，不是改資料（Ray 指定先延用）。
       ⚠ `cutin` / `voice` 也**暫時借蕾妮的**（Ray：「CI 之後再補」）——
         換成她自己的圖時，改這裡三個欄位就好，程式不必動。
       ⚠ 本篇的整備頁**只列她一個**（見 modules/gear.js 的 `partnerKeys`）；
         試玩版的選人畫面照舊列全部。 */
    nouvelle: {
      name:'諾薇兒',
      image:'partner_nouvelle',
      /* 取景：她的立繪是全身直幅（1024×1536），蕾妮那張是膝上構圖 ——
         同樣的框要放到「頭大小相當」，得往下推並放大。⚠ 這是估的，Ray 換圖時要重量。 */
      siFit:{ zoom:1.6, top:0.01 },
      cutin:'cutin_saint',
      voice:null,
      selectVoice:'vo_life_return',
      perk:'即死防禦（被動）＋生命歸還（主動）',
      passive:{ key:'deathGuard', name:'即死防禦', oncePerBattle:true,
                /* 她自己的 CI（ver -499，Ray 交件 CI_Nouvelle_Deathguard）——
                   之前借蕾妮的 `cutin_guard`；蕾妮那張是試玩版的，不動。 */
                cutin:'cutin_nouvelle_guard', voice:'vo_death_guard',
                desc:'受到足以致死的攻擊時，為玩家保留1hp續命。' },
      active:{ key:'lifeReturn', name:'生命歸還', context:'saint',
               cutin:'cutin_return', voice:'vo_life_return',
               desc:'聖徒化期間發動：強制中止聖徒化，保留當前血量。' },
    },
    // ── 第二搭檔：馬季諾 Malzeno ──────────────────────────
    malzeno: {
      name:'馬季諾',
      image:'partner_malzeno', // 選人畫面大立繪（Malzeno_SI_01）
      // 選人畫面取景：原圖為全身立繪（頭僅約佔畫高 11%）→ 放大 1.85 倍使頭部與蕾妮基準等大，
      //   由頭頂往下取景、下緣自然裁在膝上（不露全身）。調整框內構圖改這兩個數即可。
      siFit:{ zoom:1.85, top:0 },
      cutin:'cutin_saint',     // 聖徒化演出大圖（沿用共通）
      voice:null,
      selectVoice:'vo_hc_rounds',   // 選人畫面「選擇此搭檔」確認 SE（→ Malzeno_VC_Pas.wav，與高裝藥彈共用）
      perk:'前線補給（主動）＋高爆彈頭（被動）',
      // ── 被動技：高裝藥彈 ─────────────────────────────
      //   玩家 HP 降至 threshold（50%）以下的瞬間發動：普攻傷害加倍 buffSeconds 秒，
      //   時間到自然結束、效果可跨盤面延續。邊緣觸發：HP 回到門檻上才重新上膛、
      //   再跌破可再發動（門檻下不重複觸發）。發動瞬間插 cut-in。
      passive:{
        key:'lowHpBuff',
        name:'高裝藥彈',
        en:'High-Charge Rounds', // cut-in 英文副標
        threshold:0.50,          // 發動門檻：HP ≤ playerMax × 此值
        buffSeconds:10,          // 普攻加倍持續秒數（可跨盤）
        cutin:'cutin_malzeno_pas', // 被動 cut-in 大圖（→ Malzeno_CI_pas.png）
        voice:'vo_hc_rounds',    // cut-in 對應 SE（→ Malzeno_VC_Pas.wav）
        desc:'HP 降至 50% 以下時發動：10 秒普攻傷害加倍，效果可跨盤面延續。',
      },
      // ── 主動技：前線補給 ─────────────────────────────
      //   一般盤面發動：立即進入雙槍破防射擊窗口（不吃破防值、不另播雙槍 cut-in——
      //   馬季諾 cut-in 撤下後直接開窗）。每場一次。
      //   ⚠ 聖徒化期間不可發動（「聖徒化不能開雙槍」原則）：context:'board' 擋掉聖徒化入口。
      active:{
        key:'supplyRefill',
        name:'前線補給',
        en:'Frontline Supply',   // cut-in 英文副標
        context:'board',         // 一般盤面限定（聖徒化中不可發動）
        oncePerBattle:true,      // 每場一次（可調：false＝不限次數）
        cutin:'cutin_malzeno_act', // 前線補給 cut-in 大圖（→ Malzeno_CI_act.png）
        voice:'vo_supply_refill',  // cut-in 對應 SE（→ Malzeno_VC_Act.wav）
        desc:'立即進入雙槍破防。聖徒化期間無法發動。',
      },
    },
  },
  defaultPartner: 'renee',   // 搭檔只有 renee（蕾妮）/ malzeno（馬季諾）；freya＝監察官（inspectors）
  /* 本篇（story）的搭檔（ver -510）：劇情/城鎮/船戰一進場就切過去 ——
     以前只有開過整備頁才切，出航直接進的船戰帶著試玩版的蕾妮/露娜，
     即死防禦與聖徒化 cut-in 都是舊圖（Ray 連報兩張圖錯）。
     讀取點：combat.startGame（scriptRun）與 gear（清單第一位），都指這裡（鐵律 7）。 */
  storyPartner: 'nouvelle',

  /* ------------------------------------------------------------------ *
   *  三、監察官（Inspector）— 結算畫面角色（框架預留，之後接）
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ *
   *  載入畫面教學 Hint（監察官口吻,冷冷的大姐姐）
   *  隨機不重複輪播:整句淡入 0.4s → 停 5s → 淡出換下一句(不用打字機)。
   *  展示參數見 tuning.loadingHintHoldMs / loadingHintFadeMs。
   * ------------------------------------------------------------------ */
  loadingHints: [
    '反擊武器的有效攻擊時間各不相同,可別手忙腳亂了。',
    '太早反擊的話,還是會吃苦頭的。',
    '越是危機時刻聖徒化的價值越高,覺得撐不住了的話就別猶豫。',
    '好好與搭檔配合,戰鬥也能更加輕鬆的吧?',
    '連擊會讓子彈越來越痛。手停下來的那一刻,一切歸零。',
    '猶豫太久,敵人可不會站著等你。指尖別停。',
    '按錯一格,代價是血。看清楚,再出手。',
    '連續命中能磨利你的暴擊。失手一次,就從頭來過。',
    '紅圈收得越小,反擊的價值越高。賭不賭,你自己決定。',
    '防住了不代表沒事——半傷,也是傷。',
    '計量表滿了就別捨不得,那雙槍是替你保命用的。',
    '乾淨俐落地打出一輪,敵人的架勢就更容易崩潰。',
    '聖徒化中受的每一擊,都在把你推向深淵。',
    '能撐到聖徒化的最後一槍,就再多送他兩成的痛苦。',
    '敵人倒下後的三秒,是追加審判的時間。別浪費。',
    '傷痕太多的話,我給的評價可不會好看。',
  ],

  inspectors: {
    /* 蕾娜（ver -425）：**讀取頁的說明者**，出航之後接手。
       ⚠ 結算畫面的監察官還是 `defaultInspector`（freya）—— 正名是另一件事（§8），
         這裡只換讀取頁那一張臉。
       ⚠ 立繪先借對白用的正面圖（`resources/SI/Renna_SI_front.webp`）；
         日後有專屬的讀取頁立繪就改 `image` 那一行。 */
    renna: {
      name:'蕾娜',
      tier:'rookie',
      image:'inspector_renna',
      portraits:{}, dialogues:{},
    },
    freya: {
      name:'芙蕾雅',
      tier:'rookie',
      // 處決勝利（聖徒化 Maximum Burst 擊殺）專屬台詞：優先於 rank 台詞
      executionLine:'熔斷了？真慘烈呢。',
      // S 評價點「再度執槍」時的隱藏關警告台詞
      interceptLine:'慢著！有新的敵人！',
      image:'inspector_freya',          // 單張立繪鑰匙（無 portraits 時的 fallback）
      portraits:{                       // 好感度門檻 → 立繪鑰匙（留空則用 image）
        // 0:'inspector_freya', 30:'inspector_freya__lv1', 60:'inspector_freya__lv2',
      },
      // dialogues[評價等第][好感度門檻] → 台詞陣列（隨機取一句）。目前僅好感 0 檔。
      dialogues:{
        S:{ 0:['怎麼可能？竟然能夠做到這種程度！'] },
        A:{ 0:['有興趣加入第十三騎士團嗎？我們需要你這樣的人才。'] },
        B:{ 0:['這不是還不錯嗎？'] },
        C:{ 0:['也就比一般人強一點嗎……？'] },
        D:{ 0:['……你們團長有好好訓練你嗎？'] },
        E:{ 0:['………………'] },
        lose:{ 0:['（監察官失敗台詞待填）'] },
      },
      // v17.3：Boss 戰（槍之魔女）專屬台詞組。Boss 結算時優先於上方 dialogues。格式同上（[rank][好感門檻]）。
      bossDialogues:{
        S:{ 0:['你的實力，說不定能與團長比肩！'] },
        A:{ 0:['HUND中竟然有你這樣的人存在……！'] },
        B:{ 0:['幸虧有你，竟然連那種對手也能戰勝！'] },
        C:{ 0:['我果然沒有看走眼呢。'] },
        D:{ 0:['辛苦了，慘烈的戰鬥呢。'] },
        E:{ 0:['醫療班！千萬別讓他死了！'] },
        lose:{ 0:['......確認HUND {rand3}號機能停止。辛苦了。'] },   // {rand3}＝隨機 3 位數（零補），由 inspector 代入
      },
    },
    /* ══ 璐娜莉亞（ver -471，Ray 交稿）：**挑戰的 Boss 戰打贏**的結算評價者 ══
       「挑戰的boss戰結算畫面原本是監察官，改成璐娜莉亞」—— 那一場是夢裡的對決，
       醒來評語的是她自己。逐**等第**換立繪差分（portraitsByRank，S/A 共用 smirk）。
       ⚠ **戰敗仍是芙蕾雅**（Ray 只交了 S~E 六句）：lose 的「機能停止」那句是
         監察官的行話，混不進這一組。 */
    luna: {
      name:'璐娜莉亞',
      tier:'rookie',
      image:'inspector_luna_n',            // 保險 fallback（portraitsByRank 缺該等第時）
      portraitsByRank:{
        S:'inspector_luna_smirk', A:'inspector_luna_smirk',
        B:'inspector_luna_n',     C:'inspector_luna_lookdown',
        D:'inspector_luna_angry', E:'inspector_luna_hand',
      },
      portraits:{},
      dialogues:{
        S:{ 0:['做了場好夢呢。'] },
        A:{ 0:['是夢啊......？ 真想再跟那傢伙打一場啊。'] },
        B:{ 0:['只是夢啊......現在的我可不會輸。'] },
        C:{ 0:['連在夢裡都那麼討人厭。'] },
        D:{ 0:['......只是場夢而已嗎？'] },
        E:{ 0:['手......又開始痛了。'] },
      },
    },
  },
  defaultInspector: 'freya',   // 填上面的鑰匙名即啟用；null＝結算畫面不顯示監察官
  /* Boss 戰**打贏**的結算改由這一位評（ver -471）；戰敗與其他一切照 defaultInspector。 */
  bossInspector: 'luna',
  /* ══ 讀取頁的**說明者**（ver -425，Ray：「從這個時點開始讀取頁的說明者變成蕾娜」）══
     出航那一刻起換人。⚠ 規則寫在資料上（旗標名 ＋ 換成誰），程式只負責問 ——
     主遊戲的讀取頁與**飛行頁自己的讀取頁**是兩個 document，兩邊都讀這一條
     （飛行頁那一份是第二份，改一邊要改另一邊，見 flight/index.html 的 BOOT_HOST）。 */
  loadingHost: { flag:'set_sail', then:'renna' },

  /* ------------------------------------------------------------------ *
   *  三之四、教學關卡（tutorial）— 首次出陣時插入的對話教學
   *  ------------------------------------------------------------------
   *  首次判定：localStorage[storageKey]；「看完」或「跳過」都記為已看，
   *  之後出陣一律直接進正常戰鬥。中途按退出回主選單＝不算看過。
   *  型態：穿插式——教學就是一場真實戰鬥，打到 steps[].trigger 對應節點
   *  即暫停插入對話（不計時/敵不攻擊/無延時懲罰/不可點盤面與反擊），
   *  講完繼續打。可觸發節點（由 combat/defense 於該節點通知 tutorial）：
   *    'battleStart' ＝開戰首盤載入後（延遲 startDelayMs 讓戰鬥畫面先浮現）
   *    'threat'      ＝敵人首次生成大絕紅點時（紅點凍結於畫面上講解）
   *    'board:N'     ＝第 N 盤（0-based）載入時
   *  lines[].who 對應 cast 鑰匙；cast[].side 決定立繪自左或右移入。
   *  ⚠ 台詞為佔位稿，之後定稿改這裡即可（資料/程式分離）。
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
   *  舞台幾何：立繪取景的共用常數（ver -365，鐵律 7「一個量只有一個計算點」）
   *  ------------------------------------------------------------------
   *  ⚠⚠ 這三個數字**劇情頁與戰鬥教學共用**。以前兩邊各寫一份（`0.56` 出現在
   *    story.js 與 tutorial.js、`44/10` 也是），於是「同一把尺」得靠人記得改兩處 ——
   *    正是鐵律 7 列舉的那類坑。現在只有這裡是計算點，兩邊都讀它。
   *  ⚠ CSS 那邊仍有對應值（`#storyStage{--story-top:56%}`、`.corner-btn{44px}`、
   *    `#storyExit{top:…+10px}`）—— CSS 讀不到 JS，所以那是**必須存在的第二處**：
   *    照鐵律 7 的但書，兩邊註解互指，改一邊一定要改另一邊。
   */
  castStage: {
    topRatio: 0.56,   // 立繪區佔視口高的比例 ＝ style.css 的 `#storyStage{--story-top:56%}`
    btnTop:   10,     // 角落鈕距容器頂 ＝ style.css 的 `#storyExit/#exitBtn{top:…+10px}`
    btnH:     44,     // 角落鈕高       ＝ style.css 的 `.corner-btn{height:44px}`
  },

  /* ------------------------------------------------------------------
   *  道具（ver -358）
   *  ------------------------------------------------------------------
   *  ⚠ 資料/程式分離（鐵律 1）：**所有道具都定義在這裡**，程式只認 id。
   *    來源有三條（戰鬥後獲取、商店購買、劇情取得），全部經 `script/inventory.js`
   *    的 `add()` 進道具欄 —— 不要有第二個地方記「玩家有什麼」。
   *  ⚠ 分類固定五種（Ray 指定）：道具 / 武器 / 素材 / 裝備 / 特殊。
   *    `cat` 只能是 `catOrder` 裡的鍵；驗稿與 UI 都按這個順序排。
   *  ⚠ 名稱先寫在這裡（中文）。要多語系再搬進 i18n —— 但**鍵名（id）永遠是英數**，
   *    存檔存的是 id，改名不會動到存檔。 */
  items: {
    catOrder: ['item','weapon','material','equip','special'],
    catName:  { item:'道具', weapon:'武器', material:'素材', equip:'裝備', special:'特殊' },
    /* ⚠ `price`＝**市價**（買進的價）。賣出價由 `shop.sellRate` 折算（Ray：買收價為物價 50%）
       —— 一個道具只寫一個數字，折扣是店家的事，不是道具的屬性（鐵律 7 的精神）。
       ⚠ 沒寫 `price` 的道具**不能買也不能賣**（劇情道具、任務物品都該如此）。
       ⚠ `use`＝使用效果（目前只有恢復體力的數值；戰鬥外的使用系統還沒做，先把資料放著）。 */
    defs: {
      saint_claw_low: { name:'聖徒之爪（低品質）', cat:'material', price:24,
                        desc:'從訓練用聖徒上剝下來的爪。質地脆，勉強能當研磨材。' },
      /* 巨型蜈蚣的掉落（ver -423，Ray 的卡）。⚠ **價格是我填的**（卡上沒寫）——
         照既有素材的量級：常見的 6~8、稀有的 24 以上。要改直接動這裡。 */
      venom_fang:     { name:'毒牙',               cat:'material', price:30,
                        desc:'蜈蚣型禍魘的毒牙。稀有，硝製後可作彈頭。' },
      venom_claw:     { name:'毒爪',               cat:'material', price:12,
                        desc:'蜈蚣型禍魘的節肢末端。仍帶著麻痺性的體液。' },
      chitin_wing:    { name:'飛翅',               cat:'material', price:26,
                        desc:'極少數個體才長得出的薄翅。輕而不折。' },
      chitin_shell:   { name:'殼甲',               cat:'material', price:10,
                        desc:'蜈蚣型禍魘的節甲。硬度足以擋下小口徑彈。' },
      /* 羽蛇的掉落（ver -500，Ray 的卡）。⚠ **價格是我填的**（卡上沒寫）——
         照 33% 掉落物的量級（殼甲 10、毒爪 12）。要改直接動這裡。 */
      azure_scale:    { name:'蒼鱗',               cat:'material', price:12,
                        desc:'羽蛇的青色鱗片。輕薄而韌，映著天光。' },
      azure_feather:  { name:'蒼羽',               cat:'material', price:14,
                        desc:'羽蛇翼上的長羽。飛行工匠拿它做配重翎。' },
      brass_casing:   { name:'黃銅彈殼',           cat:'material', price:8,
                        desc:'打完的彈殼。收集起來能重新裝填，槍匠都收。' },
      scrap_iron:     { name:'碎鐵片',             cat:'material', price:6,
                        desc:'地宮裡到處都有的碎片。攢多了能換點東西。' },
      milk:           { name:'牛奶',   cat:'item', price:50,  use:{ hp:50 },
                        desc:'恢復 50 點體力。' },
      cheese:         { name:'起司',   cat:'item', price:100, use:{ hp:100 },
                        desc:'恢復 100 點體力。' },
      lime_rum:       { name:'萊姆酒', cat:'item', price:200, use:{ hp:200 },
                        desc:'恢復 200 點體力。' },
    },
    /* 金錢的單位（Ray 指定：**G**）。⚠ 只有一種貨幣，不做多幣別。 */
    moneyName: 'G',
  },

  /* 戰鬥掉落（ver -368，Ray：「戰鬥有機會掉落」）。
     ⚠ 教學戰**不吃這張表**：那一場的掉落是腳本寫死的教材（`tutorial.loot`）。
     ⚠ 機率與範圍都在這裡，程式不寫死（鐵律 1）。 */
  battleLoot: {
    money: { chance:0.7, min:12, max:48, bossMul:3 },
  },

  /* 商店（ver -368）。⚠ **買賣只能在這裡**（Ray 指定）——道具欄純顯示，不做交易。
     ⚠ `buy` 還沒有貨單：要賣什麼、賣多少，等 Ray 給。給了就填在這裡，程式不寫死。
     ⚠ `sellRate`＝實際收購價 ＝ `items.defs[].sell` × 這個係數（1 ＝ 照定價收）。
       日後要做「不同城鎮不同行情」就是每家店各帶一個 rate。 */
  shop: {
    /* Ray：「買收價為物價 50%」—— 店家收購時只給市價的一半。 */
    sellRate: 0.5,
    /* 各家店的貨單（節點的 `shop` 欄位指到這裡的鍵）。
       ⚠⚠ **一筆＝`{id, n}`**（ver -405，Ray：「給店鋪加入存貨數量」）：`n` 是**開店時
         的存貨量**。寫成單純的字串＝**不限量**（那一項永遠買得到，也不記帳）。
       ⚠ 賣光了不會自動補貨 —— **玩家賣給店家才會入庫再賣**（Ray 指定）。
         現在還剩幾個由 `script/shopstock.js` 記帳，這裡只有初始值（鐵律 1）。 */
    stock: {
      grocery: [ { id:'milk',     n:8 },
                 { id:'cheese',   n:5 },
                 { id:'lime_rum', n:3 } ],
      /* 武器店（ver -377）。⚠ 賣的是**武器鑰匙**（`weapons` 的鍵）——武器沒有第二份
         道具定義，價格與規格都在那張武器卡上（見 inventory.defOf 的說明）。
         ⚠⚠ **每把都只有 1 支**（ver -405，Ray 指定）：這些是成品槍不是量產品，
           賣掉就沒了；要再有一把，得有人賣回來。 */
      gunstore: [ { id:'Shotgun_Dragon', n:1 },
                  { id:'MG_Squall_Kai',  n:1 },
                  { id:'Rifle_Shahin',   n:1 } ],
    },
    /* 每家店的長相（ver -377）。沒登記的店走預設（買／賣兩頁、雜貨舖的店主圖）。
         title  頁首的字
         art    店主立繪
         tabs   要哪幾頁：buy／sell／mod（mod＝改裝，**目前留空**，Ray 指定）
         only   這家店只收哪一類（賣出頁的過濾）；不填＝什麼都收
         compare 買的時候要不要跟**現有的同類**比數值（武器店要） */
    shops: {
      grocery:  { title:'雜貨舖', art:'resources/SI/NPC_Grocerie_SI.webp',
                  tabs:['buy','sell'] },
      /* ⚠ `challenge` ＝ 這一家店的櫃台可以**再挑戰**哪一場（ver -398，Ray：「槍店的選單
         要增加一個射擊挑戰的選項」）。值是 `battles` 的鑰匙 —— 打靶那一場本來只有
         劇情裡打得到一次，而它有最佳紀錄，本來就該能再來（見 script/town.js 的
         `challengeLines`）。 */
      gunstore: { title:'武器店', art:'resources/SI/NPC_Capital_Gunstore_SI.webp',
                  tabs:['buy','sell','mod'], tabName:{ buy:'買武器', sell:'賣武器', mod:'武器改裝' },
                  only:'weapon', compare:true,
                  challenge:'range_trainee', challengeLabel:'射擊挑戰' },
    },
  },

  tutorial: {
    storageKey: 'tivot.tutorialSeen.v1',
    enemyKey: 'trainee',   // 教學專用敵（enemies.trainee＝訓練用聖徒；combat.startGame 於教學啟動時換上）
    startDelayMs: 700,     // 開戰後多久插入第一段對話（ms）
    lineTypeMs: 30,        // 打字機每字間隔（ms）；點擊對話中先跳完整句、再點下一句
    // 教學戰鬥的規則調整（只在 tutorialActive 期間生效）：
    enemyAtkDamage: 2,     // 敵方所有攻擊（大絕/按錯/延時）基礎傷害一律此值；Defense 格擋再減半（=1）
    noUltBoards: 1,        // 前 N 盤敵人不發動大絕（第一盤純練清盤，第二盤起反擊教學）
    /* 教學戰敵人血量：開場固定、全程不變（不再於聖徒化後壓血）。
       ⚠ **300**（ver -362，Ray 指定；原 500）。血量只影響**節奏**不影響流程：
         教學段落未播完前（tutorialActive）敵血夾底 1 不可被殺
         （見 combat.enemyDamage 的教學夾傷），所以調低不會提前結束教學。
       ⚠ 連帶的兩個比例是**跟著血量走的**，不必另外改：
         `dualForceHpRatio 0.5` → 150 以下強制進破防教學；
         `strikeForceHpRatio 0.3` → 90 以下強制進劇情殺。
       （原本的 500 是由「終盤 overkill」反推的：開場四回合 ≈190 ＋ 聖徒化+MB ≈260。） */
    enemyHp: 300,
    /* 教學戰的掉落（ver -358，Ray 指定：聖徒之爪（低品質）×1、碎鐵片×2）。
       ⚠ 走 `items.defs` 的 id，不要在這裡寫名字 —— 改名只改上面那一處。 */
    loot: [ { id:'saint_claw_low', n:1 }, { id:'scrap_iron', n:2 } ],
    /* 劇情版教學（教到破防為止）在破防那一盤打完時把敵血壓到這裡（ver -358，Ray：
       「聖徒 hp 改為破防結束以後可以一盤內收拾的血量」）。
       ⚠ 與 `finishEnemyHp`（聖徒化收尾用的 70）分開：劇情版沒有聖徒化那一段，
         玩家手上只有雙槍破防剛結束的普攻，一盤 16 格約打 90~120，故給 90。 */
    storyFinishEnemyHp: 90,
    preFullEnergy: 90,     // 第二回合清盤時破防值設為此值（＝100−5 擊×energyPerHit(2)：
                           //   第三回合點 5 個數字後才滿、滿了才跳蕾妮引導）；此前破防值也封頂於此
    // 削血保底觸發：玩家反擊削血過快時，教學段落不因「還沒輪到」而被跳過——
    //   敵 HP ≤ dualForceHpRatio 且破防教學未觸發 → 直接填滿破防值走原引導；
    //   敵 HP ≤ strikeForceHpRatio 且劇情殺未觸發 → 直接觸發「小心！」（聖徒化教學）。
    dualForceHpRatio:   0.5,
    strikeForceHpRatio: 0.3,
    // 聖徒化教學收尾（finishMB/finishLR 台詞開播）時敵殘血封頂：保證玩家「一盤內」殺進
    //   overkill 結束教學戰（16 格 × 基礎傷 3＋combo 斜率 ≳ 此值）。
    finishEnemyHp: 70,
    // 教學期間大絕紅點的生成範圍（%），避開左右立繪與下方對話框——只在中央帶出現。
    //   first＝反擊教學第一顆紅點的固定位置（畫面正中偏上，凍結講解時不壓立繪）；
    //   教學全程一次只出一顆（有紅點在場時暫緩下一發，見 tutorial.ultSuppressed）。
    threatSpawn: { leftMin:38, leftMax:62, topMin:25, topMax:55, first:{ left:50, top:18 } },
    // 第四回合劇情殺（聖徒化前導）：玩家清滿 afterCells 格 → 監察官「小心！」→
    //   分三次擊倒（gapMs 間隔）；kinds 對應該敵 hitFx 三種受擊畫面（第二次＝三爪 ult）。
    //   dmg 為真實傷害（劇情殺不受 enemyAtkDamage=2 管制）；末段必致死 → 即死防禦保 1 HP。
    strike: { afterCells:8, gapMs:700, hits:[
      { kind:'delay', dmg:30 },    // 第一擊：血痕
      { kind:'ult',   dmg:40 },    // 第二擊：三爪
      { kind:'wrong', dmg:999 },   // 第三擊：紅刀痕，致死 → 即死防禦
    ]},
    // 立繪：portraitHeightPct＝基準高（佔敵人框高 %）；fit 逐角色取景——
    //   zoom：以監察官（芙蕾雅）「眼睛寬度」為基準縮放，使兩人五官等大、比例一致
    //         （兩圖同 1024×1536；實測眼寬 芙蕾雅≈53px、蕾妮≈65px → 蕾妮 53/65≈0.82）。
    //   drop：立繪往敵人框下緣外推的 %（被裁去下方）——不以全圖置入為原則，
    //         用來調兩人同框的站位與身高差（監察官略高）。
    portraitHeightPct: 88,
    /* ⚠ 有取景值（portraitFrames）的立繪走**飛行畫面那一套**：鎖身高、頭頂貼頂線、
       臉錨在 portraitFaceX（見 modules/tutorial.js 的 applyPortraitFit）。
       下面這三個值就是那一套的參數，與 modules/story.js / flight 同義同值。
       ⚠ portraitSoloScale 只留給**沒有取景值**的舊立繪（芙蕾雅／蕾妮）。 */
    /* ⚠⚠ **0.56，與劇情頁同值**（ver -352，Ray：「手機的戰鬥對話人太小，要與一般對話
       同比例同高度」）。
       歷程：0.56 → 0.68（ver -285「戰鬥立繪太滿，縮一下」）→ **0.56**（現在）。
       ⚠ 這個值只有在「兩邊用同一個參考框」時才代表同一件事 —— 見 tutorial.js 的
         `placePortraitX`：戰鬥那邊的分母已經改成劇情頁那個框（`#app` 高 × 56%），
         不是 `#top` 自己的高。要動大小就動這裡，不要回頭去改分母。 */
    castShow: 0.56,          // 最高的人露出身體的幾成（越小＝鏡頭越近＝人越大）
    castTall: 176,           // 最高的角色身高（索拉娜）——全域一致，換人要一起改
    portraitTopPct: 3,       // 頂線：佔敵人框高的 %（頭頂貼在這裡）
    portraitSoloScale: 1.8,
    /* 臉的橫向落點（佔敵人框寬的比例），**依站位分左右**——
       與飛行／劇情畫面同一組數字（story.js 的 solo 錨點 0.38／0.62），
       Ray：「戰鬥中的說明立繪太靠中了，跟飛行畫面立繪一樣分左右邊」。
       ⚠ 有取景值的立繪才用得到（見下方 frames）。 */
    /* ⚠⚠ 0.24／0.76 是**飛行畫面實際在用的值**（flight/index.html 的
       `const anchor=(c.side==='L') ? 0.24 : 0.76`）。先前抄成 0.38／0.62
       （那是 story.js 單人時的值），臉離中線太近，Ray 連續三次回報「太靠中間」。
       要「同飛行畫面」就抄飛行畫面那一行，不要抄別的地方的近似值。 */
    portraitFaceX: { left:0.24, right:0.76 },
    /* 逐張立繪的取景值：ASSETS 鍵 → speakers.js 量好的那一組。
       ⚠⚠ 沒有這張表的話，同一個角色**換表情就會橫向跳**：這些差分是不同姿勢，
         臉在圖上的位置差很多（front 0.564、Scared 0.397），而 CSS 只會把
         **圖框**貼齊左緣 —— 圖框對齊 ≠ 臉對齊，實測相鄰兩句臉會位移 71px。
       ⚠ 芙蕾雅／蕾妮沒有量過，查不到就退回原本的「圖框貼邊」（行為不變）。 */
    /* ⚠ 每一筆都要帶 cm（角色身高）—— 縮放是**鎖身高**算的（§6.5）。
       speakers.js 的 expr 只帶 top/bot/fx，cm 在角色那一層，所以這裡要合進來。 */
    portraitFrames: (()=>{
      const N = ART.nouvelle, R = ART.renna, F = {};
      /* ⚠ 取景值一律**抄 `ART`**（speakers.js 量的那一份，鐵律 7）——
         不要在這裡另填一組數字。`cm` 在角色那一層、expr 只帶 top/bot/fx，所以合起來。 */
      const put = (key, A, v) => { F[key] = Object.assign({ cm:A.cm }, v || A); };
      put('tut_nouvelle',           N);
      put('tut_nouvelle_cringe',    N, N.expr.cringe);
      put('tut_nouvelle_surprise',  N, N.expr.surprise);
      put('tut_nouvelle_desperate', N, N.expr.desperate);
      put('tut_nouvelle_saint',     N, { top:3, bot:1525, fx:0.503 });  // 只有教學用得到，量法同 speakers.js
      /* 船艦戰的戰鬥內對白（ver -429，Ray 交稿）用到的差分。 */
      put('tut_nouvelle_steady',    N, N.expr.steady);
      put('tut_nouvelle_run',       N, N.expr.run);
      put('tut_renna',              R);
      put('tut_renna_shocked',      R, R.expr.shocked);
      put('tut_renna_run',          R, R.expr.run);
      return F;
    })(),
    cast: {
      inspector: { name:'芙蕾雅', image:'inspector_freya', side:'left',  fit:{ zoom:1,    drop:10 } },
      partner:   { name:'蕾妮',   image:'partner_renee',   side:'right', fit:{ zoom:0.82, drop:0 } },
      /* 劇情版教學的唯一說話者。⚠ 站**左**：與地宮那一幕同側，玩家的空間記憶才連得起來
         （CLAUDE.md §6.5：同一個人每次都站同一邊）。 */
      nouvelle:  { name:'諾薇兒', image:'tut_nouvelle',    side:'left',  fit:{ zoom:0.92, drop:6 } },
      /* 蕾娜（ver -429，船艦戰的戰鬥內對白）。
         ⚠⚠ 站**右**：她與諾薇兒在 `speakers.js` 裡**都是左**（左 蕾娜・諾薇兒），
           兩個人同台會一直互相擠掉 —— 這是 §6.5 那條「一幕裡只有兩個人又剛好同側時
           可以整幕覆寫」的同一個情形。船塢那一幕（`sides:{RENNA:'R'}`）已經把她擺右，
           這裡跟著同一個安排，玩家的空間記憶才連得起來。 */
      renna:     { name:'蕾娜',   image:'tut_renna',       side:'right', fit:{ zoom:0.92, drop:6 } },
    },
    // 罵人台詞（監察官）：教學中玩家「按錯 / 延時」即插入一句（隨機取、可重複觸發；
    //   defended 段講完後停用）。early＝太早防禦（Defense 格擋半傷）專用——不受 defended
    //   停用限制、聖徒化期間不插（見 tutorial.onEarlyBlock）。
    scold: {
      wrong: [
        '看清楚數字再出手。你的搭檔可不會替你挨這一下。',
        '慌了？順序，是基本中的基本。',
      ],
      delay: [
        '手停下來做什麼？敵人可不會等你。',
        '猶豫的代價，記住這種痛。',
      ],
      early: [
        '太早了！看清楚一點！',
      ],
    },
    steps: [
      // 第一盤：純清盤教學（noUltBoards=1 → 敵人不出大絕）
      { trigger:'battleStart', lines:[
        { who:'inspector', text:'開始實戰考核。HUND，讓我看看你的基礎是否紮實。' },
        { who:'partner',   text:'別緊張！照著數字順序點擊下方的盤面，每一次命中都會對敵人開火！' },
        { who:'partner',   text:'這一回合敵人還不會出手——先把手感練起來。不過按錯或停太久，還是會受傷的喔。' },
      ]},
      // 第二盤開始：反擊教學開場（此盤起敵人開始發動大絕）
      { trigger:'board:1', lines:[
        { who:'inspector', text:'基礎還行。接下來——敵人要開始反擊了。' },
        { who:'partner',   text:'敵人蓄力時，畫面上會出現光圈。那就是防禦的信號！' },
      ]},
      // 第一顆紅點生成瞬間（凍結在畫面上講解）——防禦分級講確實：
      //   太早＝格擋（仍受一半傷害）；時機正確＝完美防禦（免傷）
      { trigger:'threat', lines:[
        { who:'partner',   text:'光圈會越縮越小——太早出手只能「擋下」，還是會受到一半傷害！' },
        { who:'partner',   text:'等光圈收得夠小、時機正確，才能「完美防禦」，不受損傷！' },
        { who:'inspector', text:'防住給我看。' },
      ]},
      // 首次成功防下攻擊（點掉紅點）之後：反擊與副武器說明。
      //   此段結束後直到第二盤清完不再插入任何提示（罵人停用、延時懲罰恢復）。
      { trigger:'defended', lines:[
        { who:'inspector', text:'擋得不錯。記住——在敵人出手的前一瞬反擊，就能用副武器造成大量傷害。' },
        { who:'partner',   text:'不過別勉強反擊，覺得危險的話，防下來就好。' },
        { who:'inspector', text:'那樣的話，我的評價可不會留情。' },
        { who:'inspector', text:'不同副武器的效果與反擊時機各不相同。選擇能發揮自己天賦的武器吧。' },
      ]},
      // 第四回合：玩家清滿 strike.afterCells 格後觸發（收段後劇情殺三連擊 → 聖徒化引導）
      { trigger:'strike', lines:[
        { who:'inspector', text:'小心！' },
      ]},
    ],
    /* ── 腳本化段落（scripted）：由 tutorial 內部流程觸發，不走 steps 的 trigger ──
     *  dualReady  ＝第三盤破防值滿的瞬間（暫停＋箭頭指向計量表，點下才繼續）
     *  dualGo     ＝雙槍破防 cut-in 結束後（接著玩家無視順序清盤）
     *  saintCall  ＝三爪即死防禦 cut-in 結束後（暫停＋左側箭頭向右，滑動才繼續）
     *  saintStart ＝聖徒化降臨 cut-in 結束後（講完交還操作）
     *  saintFail  ＝聖徒化倒數槽推至臨界（99）仍未清盤（暫停＋箭頭向上，上滑發動生命歸還）
     *  finishMB   ＝Maximum Burst 結束後；finishLR＝生命歸還結束後（皆接「玩家收尾殺敵」）
     */
    script: {
      dualReady:  [ { who:'partner',   text:'敵人露出破綻了！就是現在！' } ],
      dualGo:     [ { who:'partner',   text:'敵人無法抵抗，無視順序猛攻吧！' } ],
      // center:true → 立繪移到畫面正中（左側讓給向右滑的引導箭頭，箭頭不壓立繪）
      saintCall:  { center:true, lines:[ { who:'inspector', text:'沒時間了，立刻聖徒化！' } ] },
      saintStart: [ { who:'inspector', text:'在熔斷前你死不了，但承受攻擊會加速熔斷！' },
                    { who:'inspector', text:'別失誤！只要撐過這回合就有機會逆轉！' } ],
      saintFail:  [ { who:'partner',   text:'不行了！交給我！' } ],
      finishMB:   [ { who:'inspector', text:'總算撐過來了，體力也回復了一些，現在結束這場戰鬥吧！' } ],
      finishLR:   [ { who:'inspector', text:'總算撐過來了，現在結束這場戰鬥吧！' } ],
    },
    // 引導箭頭（雪鐵龍雙箭羽依次閃滅）文字標示
    guideLabels: { click:'CLICK！', right:'向右側滑動', up:'向上滑動',
                   wswitch:'點擊切換' },   // 副武器切換教學（ver -478）
    /* ── 教學專屬結算（inspector.settle 讀取；tutorialRun 旗標存續到結算）──
     *  usedLifeReturn＝有發動蕾妮主動技（生命歸還）；noLifeReturn＝沒發動（MB 過關）。
     *  outro 接在其後同框逐字補完；按鈕改「回到主畫面」，按下先補 buttonLine 再回首頁。 */
    result: {
      usedLifeReturn: '我話說在前頭，這次是蕾妮救了你，萬一熔斷就真的背水一戰了。',
      noLifeReturn:   '身手不錯，但要存活下來也得好好依賴伙伴。',
      outro:          '「聖徒化」是場豪賭，失敗的話就只能背水一戰，謹慎使用吧。',
      buttonLabel:    '繼續',            // ver -361：教學結算是「往下走」不是「離場」
      buttonLine:     '期待你的表現。',
    },
  },

  /* ------------------------------------------------------------------ *
   *  五、評價分級（EVALUATION）— 結算算分 → 六階 S/A/B/C/D/E
   *  ------------------------------------------------------------------
   *  結算時把「用時 + 反擊 + 完美防禦」換算成分數，再套加乘，
   *  最後對照 tiers 由高到低取第一個達標的等第。
   *  想調難度／手感就改這裡的係數與門檻。S 段刻意拉高，較難達成。
   *
   *  分數公式：
   *    raw   = max(0, timeBonus.base − 總用時秒數 × timeBonus.perSecond)
   *          + 反擊累計傷害 × counterCoef
   *          + 完美防禦次數 × perfectPerHit
   *    score = raw × (無傷? flawlessMult : 1) × (以MaxBurst擊殺? executionMult : 1)
   * ------------------------------------------------------------------ */
  evaluation: {
    score: {
      timeBonus:     { base:3000, perSecond:40 }, // 時間分：越短越高，扣到 0 為止
      counterCoef:   2.0,     // 反擊累計傷害 × 此係數
      perfectPerHit: 50,      // 每次完美防禦加分
      flawlessMult:  1.30,    // 全程無傷 → 總分 ×1.30
      executionMult: 1.10,    // 以 Maximum Burst 擊殺（EXSECUTIŌ）→ 總分 ×1.10
    },
    // 六階門檻（分數下限）；由高到低排列，S 段刻意拉高
    tiers: [
      { rank:'S', min:3600 },
      { rank:'A', min:2800 },
      { rank:'B', min:2100 },
      { rank:'C', min:1400 },
      { rank:'D', min: 700 },
      { rank:'E', min:   0 },
    ],
  },

  /* ------------------------------------------------------------------ *
   *  三之二、評價系統（rating）— 取代上方舊 evaluation
   *  ------------------------------------------------------------------
   *  結算以百分制計分（timeScore 為主 60 分 + 加分項 - 受擊扣分），對照 tiers 取等級，
   *  再把分數換算成 EXP。所有可調數值集中於此，程式碼不得硬編評分參數。
   *
   *  時間預算隨敵人總血量自動變動：budget = (totalHP/hpPerBase)*base + (isBoss?bossBonus:0)。
   *  設計新敵人只要給 hp，評價門檻即自動跟著調整。
   *  無傷 gate：hitsTaken===0 → 直接判 S（凌駕分數）。
   * ------------------------------------------------------------------ */
  rating: {
    time: {
      base: 100,          // 每 hpPerBase 血量對應的秒數基數
      hpPerBase: 500,     // 每 500 血 = 100 秒預算
      bossBonus: 20,      // isBoss 時預算額外 +20 秒
      capSeconds: 20,     // 剩餘時間達 (預算-20) 即時間項封頂；即 20 秒內 clear 時間項滿分
    },
    points: {
      timeMax:        60, // 時間項滿分（主評價）
      accuracyMax:    15, // 命中率 × 15
      accPerfectBonus: 5, // 命中率 100%（零按錯）額外加成
      comboMax:       10,
      perfectCtrMax:  8,  // 完美反擊（Counter 反擊次數）配分
      overkillMax:    2,  // overkill 評價分數上限（收緊：原 5 太甜，隨便 overkill 就白拿滿）
      hitPenalty:     10, // 每次受擊扣 10 分（收緊：受擊懲罰加重）
    },
    norm: {
      comboTarget: 30,
      pcTarget: 5,
      okTarget: 4,   // 搭配 overkillMax=2 → 每點 overkill 0.5 分、overkill 4 即封頂（僅 2 分）
    },
    tiers: [
      { grade: 'S', min: 80 },
      { grade: 'A', min: 64 },
      { grade: 'B', min: 48 },
      { grade: 'C', min: 32 },
      { grade: 'D', min: 16 },
      { grade: 'E', min: 0  },
    ],
    exp: {
      mult: 8.7,          // 非整數倍率，避免整齊倍數
      offset: 137,        // 質數基底，保證三位數起跳
      overkillExp: 3,     // 每點 overkill 額外 +3 EXP（EXP 展示用，不影響評價分數）
      jitterMod: 7,       // 用分數尾數做微擾，讓 EXP 數字不整齊
    },
  },

  /* ------------------------------------------------------------------ *
   *  三之三、過渡禎（transitions）— 開始/結束的淡入淡出全畫面轉場
   *  ------------------------------------------------------------------
   *  淡入後停留，等「輕觸畫面繼續」才淡出並進入下一畫面（不自動停留幾秒）。
   *  fadeMs = 淡入/淡出各自時長（同時作為「淡入完成、開放輕觸」的門檻）。
   *  hint   = 淡入完成後顯示的繼續提示文字。
   *  start  = 點「開始遊戲」→ 輕觸後才真正開戰（畫面在不透明遮罩後切換）。
   *  finish = 勝利進結算前；fail = 戰敗進結算前。cn 中文大字；en 英文小字（每元素一行）。
   * ------------------------------------------------------------------ */
  transitions: {
    fadeMs: 300,
    hint: '輕觸畫面繼續',
    /* ⚠ **已停用**（ver -433，Ray：「戰鬥結算畫面放置過久會自動退回主頁，取消此機制」）。
       欄位留著當紀錄，`modules/inspector.js` 已經沒有人讀它 —— ver -430 之後這一頁
       常常是岔路（繼續／再戰／放棄），時間到了自己走人等於幫玩家做了決定。 */
    resultAutoMs: 70000,
    start: {
      cn: '驅逐開始',
      autoMs: 3000,     // 3 秒內沒點 → 強制進入戰鬥
      en: [
        'For thou art of dust; unto dust shalt thou return.',
        'And in the end, thou shalt be brought unto silence.',
      ],
    },
    finish: {
      cn: '驅逐完成',
      autoMs: 3000,     // 3 秒內沒點 → 自動進結算
      en: [
        'The Lord shall send forth Her apostles.',
        'The hour of Her revelation shall come.',
        'And all flesh shall repent.',
      ],
    },
    fail: {
      cn: '驅逐失敗',
      fadeInMs: 2000,   // 黑白定格後，戰敗畫面慢慢浮現（淡入約 2 秒；淡出仍用全域 fadeMs）
      autoMs: 3000,     // 3 秒內沒點 → 自動進戰敗結算
      en: [
        'O lamb burdened with sin—follow thou thy Shepherd, and go forth unto the Beyond...',
      ],
    },
  },

  /* ------------------------------------------------------------------ *
   *  四、敵人（Enemy）
   *  name   = 顯示名稱（敵人區上方）
   *  image  = 敵人立繪鑰匙
   *  hp     = 血量（雜魚建議 ~150，測試耐打用 500；Boss 拉高血量即可）
   *  attack = 大絕一擊傷害
   *  image / sound 都對應最下面 ASSETS。
   *  新增敵人：複製一段，改鑰匙名、名稱、圖、血量。
   *  立繪檔名規約：角色_變體_CI（例 Saint_TR_CI／Saint_UG_CI／Saint_GT_CI／GunWitch_Boss_CI）。
   * ------------------------------------------------------------------ */
  enemies: {
    /* ⚠⚠ 敵人卡的兩個統一欄位（ver -495，Ray 指定「敵人卡統一加上」）：
       `story`         ＝ 這一隻的場次是不是**劇情戰**（1/0）。發起端明確宣告的
                         （飛行交棒的 `scripted`）優先；沒宣告（城鎮／腳本插入戰）
                         才讀卡上這一格。判定只有一處：combat.startGame →
                         `state.storyBattle`（§6.5.2，ver -493）。
       `counterStagger`＝ **反擊硬直**（1/0，Ray：「預設為 1，0 的話就算被反擊
                         延時計時也不會歸零」）：被反擊（weaponCounter 真的開火）
                         時延時懲罰計時歸零。判定在 defense 的 staggerOnCounter。
       兩格**每張卡都要寫**（統一），程式端沒寫時的預設：story 走發起端／true、
       counterStagger＝1。 */
    faceless: {
      name:'地下聖徒_A',        // UI 只顯示底線前的「地下聖徒」；底線後（_A）僅供作者辨識、不顯示
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      /* 聖徒系列的結算副標是「已擊殺」（ver -432，Ray 指定）。⚠ 對照表在 i18n 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。三種聖徒同一類。 */
      kind:'slay',
      image:'enemy_faceless',   // 立繪鑰匙（見最下方 ASSETS）
      hp:200,          // 連戰第一隻（原測試值 500，v-lineup 調 200）
      attack:45,       // 大絕一擊傷害（原 ULT_DAMAGE）
      atkInterval:null,// 大絕蓄力秒數；null＝沿用 tuning.chargeSeconds（逐怪可覆寫）
      // 攻擊音（依 kind：ult＝大絕命中/不完美防禦格擋、delay＝太慢、wrong＝按錯）。鑰匙對應 ASSETS。
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      /* 延時懲罰 5 秒（ver -458，Ray：「除了槍之魔女以外的敵人都先預設 5 秒」）。 */
      delayPenalty:{ seconds:5 },
      special:[],      // 特殊行動預留（本版不實作邏輯，僅保留結構）
      // v16：每盤格數手動覆寫（index 對應第幾盤，0-based；null／缺項＝用預設規則：第三盤起 16 格）。
      //      作者日後可逐怪逐盤填數值微調難度，例：[9,9,16,16,20]。聖徒化 25 宮格不受此影響。
      boardGrids:[9,9,16,16,16],
      // v17.2：受擊特效三件套（delay＝延時懲罰／wrong＝按錯懲罰／ult＝大絕）。逐怪可各自設定。
      //   type 可用：'claw'（爪痕，可設 count 幾道）／'blood'（血痕）／'bite'（齒痕）／
      //             'bullet'（彈痕/玻璃碎裂）／'slash'（紅刀痕濺血）。
      hitFx:{
        delay:{ type:'blood', angle:'random' },   // 延時懲罰 → 一道血痕、角度隨機
        wrong:{ type:'slash' },                    // 按錯懲罰 → 一條紅刀痕濺血
        ult:{   type:'claw', count:3, angle:'random' },  // 大絕 → 三爪、角度隨機
      },
    },
    // ── 教學專用敵：訓練用聖徒（僅教學戰載入，不進 lineup）──
    //    tutorial.enemyKey 指到這筆；戰鬥數值大多被教學規則覆寫
    //    （攻擊一律 tutorial.enemyAtkDamage=2、總血 tutorial.enemyHp=500），
    //    hp/attack 仍填保底值。立繪：Saint_TR_CI。
    trainee: {
      name:'訓練用聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_trainee',    // → resources/enemy/Saint_TR_CI.png
      hp:500,
      attack:45,
      atkInterval:null,         // 沿用 tuning.chargeSeconds
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      delayPenalty:{ seconds:5 },   // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,16,16,16],
      hitFx:{
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
    },
    /* ══ 固定立靶（ver -396，Ray 交件 `Dart_timeattack`）══
       打靶場的**計時挑戰**用靶。⚠ 它不是「弱到打不痛人」的怪 —— 它**根本不攻擊**：
       那件事由戰鬥卡的 `timeAttack` 關掉整條攻擊路徑（見 config.battles.range_trainee），
       不是靠把 `attack` 調成 0（調成 0 的話大絕紅點、延時懲罰、蓄力槽照樣會演）。
       ⚠ `attack` 仍留一個值只是為了資料完整；沒有任何一條路會讀到它。 */
    dart_target: {
      name:'固定立靶',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      /* 結算副標的用詞（ver -432，Ray：「『靶』為已擊破」）。⚠ 對照表在 `i18n` 的
         `result.winSubBy`，這裡只標這一隻是哪一類（鐵律 1）。 */
      kind:'target',
      image:'enemy_dart_target',     // → resources/enemy/Dart_timeattack.webp
      hp:300,                        // Ray 指定
      attack:0,
      atkInterval:null,
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },
      special:[],
      boardGrids:[9,9,16,16,16],
      hitFx:{
        /* ⚠ 沙袋靶不噴血：受擊只有**碎屑**（沿用 slash 的刀痕當彈著），
           大絕與延時的特效根本不會演到（它不攻擊）。 */
        delay:{ type:'slash' },
        wrong:{ type:'slash' },
        ult:{   type:'slash' },
      },
    },
    // ── 連戰第二隻（局內序列第二敵）：巨型聖徒。完全獨立一筆，非沿用 faceless。 ──
    //    非 Boss（不填 ult/delayPenalty/wrongPenalty → 普通怪走預設：單發大絕、無半傷減時）。
    //    差異：血更厚（300）＋攻擊更密（蓄力 4×1/1.2≈3.33s）；單擊傷害同一般值。
    facelessgiant: {
      name:'巨型聖徒',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'slay',                   // 聖徒系列＝已擊殺（ver -432）
      image:'enemy_facelessgiant',   // 內嵌立繪鑰匙 → resources/enemy/Saint_GT_CI.webp
      // 取景：主體在圖面右下（撲擊構圖），cover 裁切錨點右移下移——爪/頭/軀幹全入鏡
      fit:{ pos:'62% 78%' },
      hp:300,                        // 血更厚
      attack:45,                     // 大絕單擊傷害（普通值；差異在密度不在單擊）
      atkInterval:3.33,              // 大絕蓄力秒數：4×(1/1.2)≈3.33 → 攻擊更密（比第一隻高 20%）
      sound:{ ult:'em_slash', delay:'em_smack', wrong:'em_slash' },   // 兩聖徒攻擊音相同
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,16,16,16],     // 自帶：前兩盤 9 格（累積破防、combo 加成總量低，不開場爆血）
      hitFx:{                        // 自帶獨立三件套（巨型聖徒風味：大絕爪數加重為 4）
        delay:{ type:'blood', angle:'random' },
        wrong:{ type:'slash' },      // 按錯 → 紅刀痕濺血
        ult:{   type:'claw', count:4, angle:'random' },
      },
    },
    // 亂入怪（無傷 45 秒內通關才會出現）— 先用同一隻怪測流程，正式再換
    intruderEnemy: {
      name:'亂入者 · ???',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      image:'enemy_faceless',
      hp:400,
      attack:50,
      atkInterval:null,
      sound:{ hit:null, ult:null, death:null },
      delayPenalty:{ seconds:5 },    // 5 秒（ver -458，非魔女的預設）
      special:[],
      boardGrids:[9,9,16,16,16],   // v16：每盤格數手動覆寫（同上，聖徒化不受影響）
    },
    // ── 槍之魔女（Boss）v17：S 評價後遭遇的隱藏 Boss ──
    witch: {
      name:'槍之魔女',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'human',                  // 槍之魔女是人類 → 已擊敗（ver -432，Ray 指定）
      image:'enemy_witch',      // 立繪鑰匙（附圖）
      hp:500,
      attack:45,                // 大絕單點傷害（同一般怪基準）
      atkInterval:null,         // 大絕蓄力窗口（紅圈縮放時間）；null＝沿用 tuning.chargeSeconds
      // Boss 攻擊音：大絕＝左輪 EM_Revolver；延時＝槍聲 EM_Shot；按錯＝匕首 EM_Dagger。
      sound:{ ult:'em_revolver', delay:'em_shot', wrong:'em_dagger' },
      special:[],
      boardGrids:[9,9,16,16,16],
      // v17：Boss 專屬機制（一般怪不填＝走預設，資料/程式分離）
      ult:{ shots:2, gapMs:1000, minMs:2000, maxMs:4000 },   // 大絕：一次先後出 2 個點、間隔 1 秒；發動頻率 2~4 秒
      delayPenalty:{ dmgScale:0.5, timeDelta:-1 },           // 延時懲罰：攻擊力為一般怪一半、時限減 1 秒
      wrongPenalty:{ dmgScale:1 },                           // 按錯懲罰：攻擊力同一般怪
      // v17.2：受擊特效 —— 大絕/延時走彈痕（玻璃碎裂），按錯改紅刀痕濺血
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },   // 延時懲罰 → 一顆彈痕
        wrong:{ type:'slash' },                            // 按錯懲罰 → 一條紅刀痕濺血
        ult:{   type:'bullet', count:1, pos:'random', scale:1.6 },   // 大絕 → 一顆大彈痕（1.6 倍）
      },
    },
    /* ══ 賞金獵人（ver -375）══ 舊街區・賞金獵人公會那一場（劇情插入戰）。
       ⚠ 這一筆是「**敵人資訊標準卡**」的第一個實例（Ray 交稿的格式，見
         `script/SCRIPT_FORMAT.md` 的「敵人卡」一節）。卡上有的欄位這裡都要有，
         沒實作的（抗性/弱點）也**照樣寫進資料**、標明未實作 —— 資料先齊，
         程式後補；不要因為還沒做就把欄位丟掉（丟掉的下場是下次補做時沒人記得。） */
    guild_hunter: {
      name:'賞金獵人',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'human',                      // 結算副標「已擊敗」（ver -432）
      image:'enemy_guild_hunter',        // ＝ NPC_GuildHunter_SI_Attack（與對話立繪同一張）
      /* ⚠ `bg`＝**戰鬥背景**（ver -375 新欄位）。這一隻的立繪是**去背**的
         （對話用立繪借過來當戰鬥立繪），沒有背景的話身後是一片黑。
         ⚠ 有 `bg` 就一定要 `fit.mode:'contain'` —— 去背立繪用 cover 會被裁掉頭。 */
      bg:'Captal_Guild_Day',
      fit:{ mode:'contain', pos:'center bottom' },
      hp:200,
      /* 蓄力攻擊（大絕）：10 傷、大彈孔。⚠ 一般怪是 45 —— 這是個街頭鬧事的獵人，
         不是聖徒，數字低是刻意的。 */
      attack:10,
      atkInterval:null,                  // 沿用 tuning.chargeSeconds
      sound:{ ult:'em_shot', delay:'em_shot', wrong:'em_smack' },
      special:[],
      /* 盤面配置 `33344, loop`：3＝九宮格、4＝16 宮格；**loop**＝打完五盤還沒死就從頭再來
         （這一隻血厚 200、傷害低，是「耐力戰」的設計）。 */
      boardGrids:[9,9,9,16,16],
      boardLoop:true,
      /* 延時懲罰：**5 秒**、傷害 **5**、彈孔特效。
         ⚠ `seconds`/`damage` 是**絕對值**（ver -375 新欄位），與舊的 `dmgScale`/`timeDelta`
           縮放並存 —— 卡上寫的是絕對值，就照絕對值存（鐵律 1：不要在腦內換算成倍率）。 */
      delayPenalty:{ seconds:5, damage:5 },
      wrongPenalty:{ damage:5 },         // 點錯懲罰：傷害 5、鈍器受擊特效
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },          // 彈孔
        wrong:{ type:'blunt' },                                   // 鈍器
        ult:{   type:'bullet', count:1, pos:'random', scale:1.8 },// 大彈孔
      },
      /* ⚠ 抗性／弱點武器：**卡上有、程式還沒實作**。資料先照卡放著。 */
      resist:[], weak:[],
      /* 掉落物（固定掉，不擲骰）：黃銅彈殼 ×6。 */
      loot:[ { id:'brass_casing', n:6 } ],
      /* 金錢：**HP 的 6~8 成隨機**（卡上的寫法）。所以血越厚的怪給越多錢 ——
         這條規則寫在資料裡，程式只負責擲骰（鐵律 1）。 */
      money:{ hpRatio:[0.6, 0.8] },
    },
    /* ══ 巨型蜈蚣（ver -423，Ray 的敵人卡）══════════════════════════════
       第一場**船艦戰**的怪。卡上的每一欄都照抄成絕對值（鐵律 1／§6.5.2）。 */
    centipi: {
      name:'巨型蜈蚣',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      /* ⚠⚠ **三張時段差分**（Ray：「上午下午用 Centipi_day，晚上用 night，
         黃昏黎明用 Centipi_dd」）。寫成 `{day,dd,night}` 三個槽，時段→槽的對應
         只有一處：`modules/enemy.js` 的 `enemyImage()`（鐵律 7）。 */
      image:{ day:'enemy_centipi_day', dd:'enemy_centipi_dd', night:'enemy_centipi_night' },
      /* ⚠ `kind` ＝ 結算頁的用詞（Ray 指定）：`harm`＝禍魘→「已淨化」、
         `human`→「已擊敗」、`ship`→「已擊沉」。對照表在 `modules/inspector.js`。 */
      kind:'harm',
      hp:500,
      /* 蓄力攻擊（紅點那一發）：傷害 20、**3~5 秒發動一次**、不疊加。
         ⚠ `atkInterval` 給**區間**（陣列）＝每次隨機；給數字＝固定（舊卡不受影響）。 */
      attack:20,
      /* ⚠⚠ 「3~5 秒發動一次」是**發動頻率**不是蓄力長度 —— 所以走 `ultEvery`
         （＝`ULT_MIN`/`ULT_MAX`），不是 `atkInterval`（那是紅點給你幾秒反應）。
         兩個都叫「秒」但意思完全不同，混用會讓怪要嘛不打人、要嘛打不完。 */
      atkInterval:null,
      ultEvery:[3,5],
      /* ⚠ 「不疊加」＝場上同時只有一個紅點（見 defense.scheduleUlt 的 `noStack`）。 */
      noStack:true,
      sound:{ ult:'se_enemy_centipi', delay:'em_smack', wrong:'em_smack' },
      special:[],
      /* 盤面配置 `33344, loop`：3＝九宮格、4＝16 宮格，打完五盤沒死就從頭再來。 */
      boardGrids:[9,9,9,16,16],
      boardLoop:true,
      /* 延時懲罰：**5 秒**（ver -458 由 4 調成非魔女的統一預設）、傷害 10、單爪特效。 */
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        ult:{   type:'claw', count:3, angle:'random' },
      },
      /* ⚠⚠ **抗性／弱點／破防增傷**（ver -423 起真的生效，之前只是放著）：
         值是**加減成**，套在 `combat.enemyDamage` 那一個計算點上（鐵律 7）。
           resist.basic   普攻減傷 20%
           weak.counter   全反擊武器增傷 100%
           dualBonus      破防（雙槍窗口）增傷 20% */
      resist:{ basic:0.20 },
      weak:{ counter:1.00 },
      dualBonus:0.20,
      /* 反擊之後的兩件事（卡上分開寫，程式也分開讀）：
           counterBuff  反擊攻擊增益：普攻 ×2、持續 5 秒
           counterStun  反擊硬直：被反擊後 3 秒才發起下一次主動攻擊 */
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
      /* 掉落物：**各自擲骰**（Ray：「可能都掉，可能都不掉」）——
         `p` 是機率，沒寫＝必掉（舊卡不受影響）。 */
      loot:[ { id:'venom_fang',   n:1, p:0.10 },
             { id:'venom_claw',   n:1, p:0.33 },
             { id:'chitin_wing',  n:1, p:0.10 },
             { id:'chitin_shell', n:1, p:0.33 } ],
      /* 金錢：HP 的 120%~150%。 */
      money:{ hpRatio:[1.2, 1.5] },
    },
    /* ══ 羽蛇（ver -500，Ray 的敵人卡）══════════════════════════════════
       飛行限定的隨機敵（[場景：飛行][區域：全陸域][稀有等級：E]—— 那三格住在
       flight/index.html 的 ENEMY_KINDS.serpent：rarity/fromStage/landOnly，
       兩邊註解互指）。**stage2 的劇情之後才會加入隨機敵人**（fromStage:2）。
       ⚠ 卡上的「劇情」（好快！／廣域破片砲）在 battles.flight_serpent 的 talk；
         「戰鬥結束」那一段（Sturm／Deck_Chaos／著水）是 stage2 劇本的戲，
         觸發點與素材（Deck_Chaos）都還沒有 —— 等 Ray 的 stage2 稿再接。 */
    serpent: {
      name:'羽蛇_A',
      story:1, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'harm',                 // 禍魘 → 已淨化
      image:{ day:'enemy_serpant_day', dd:'enemy_serpant_dd', night:'enemy_serpant_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      ultEvery:[3,5],              // 發動頻率 3~5 秒一次
      noStack:true,                // 不疊加：場上同時只有一個紅點
      sound:{ ult:'se_enemy_serpant', delay:'em_smack', wrong:'em_smack' },
      special:[],
      boardGrids:[9,9,9,16,16],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 蓄力攻擊「毒牙特效」＝咬痕（bite）；延時單爪、點錯鈍器（同卡）。 */
      hitFx:{
        delay:{ type:'claw', count:1, angle:'random' },
        wrong:{ type:'blunt' },
        ult:{   type:'bite' },
      },
      resist:{ basic:0.20 },
      /* 弱點：反擊武器 +100%、**散射武器（霰彈槍類）再 +150%**（Ray 的卡）——
         `cat:<武器類別>` 只對反擊傷害生效，判定在 combat.applyEnemyMods（唯一一處）。 */
      weak:{ counter:1.00, 'cat:霰彈槍':1.50 },
      dualBonus:0.20,
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
      loot:[ { id:'venom_fang',    n:1, p:0.10 },
             { id:'azure_scale',   n:1, p:0.33 },
             { id:'azure_feather', n:1, p:0.33 } ],
      /* 金錢：HP 的 50%~70%。 */
      money:{ hpRatio:[0.5, 0.7] },
    },
    /* ══ 空賊船（ver -509，Ray 的敵人卡）══════════════════════════════════
       飛行限定隨機敵（[場景：飛行][區域：**薩梅爾空域外全域**][稀有等級：E]
       [Stage:1 以後才登場]—— 刷新規則在 flight 的 ENEMY_KINDS.pirate：
       rarity/fromStage/notRegion，兩邊註解互指）。
       ⚠ 為什麼不進薩梅爾（Ray 的設定）：**會被防空砲打下來** —— 故事需求，
         不是平衡參數；別因為「帝都附近打不到空賊」就把限制拿掉。
       ⚠ 卡上「攻擊音」那一段（serpant／em_smack）是範本殘留 —— 真正的音寫在
         各受擊行的 `se:`（延時＝艦砲 120mm、點錯＝手槍二、大絕＝se_weapon_cannon），
         照那三個入表。 */
    pirate_ship: {
      name:'空賊船_A',
      story:0, counterStagger:1,   // 劇情戰／反擊硬直（ver -495，統一欄位，見 enemies 檔頭）
      kind:'ship',                 // 船隻 → 已擊沉
      image:{ day:'enemy_pirate_day', dd:'enemy_pirate_dd', night:'enemy_pirate_night' },
      hp:500,
      attack:20,                   // 蓄力攻擊（紅點那一發）
      atkInterval:4,               // 蓄力窗口 4 秒（固定）
      ultEvery:[3,5],              // 發動頻率 3~5 秒一次
      noStack:true,                // 不疊加：場上同時只有一個紅點
      sound:{ ult:'se_weapon_cannon', delay:'se_ship_cannon', wrong:'se_sniper_falcon' },   // 點錯改狙擊音（ver -512，Ray 指定）
      special:[],
      boardGrids:[9,9,9,16,16],    // 33344, loop
      boardLoop:true,
      delayPenalty:{ seconds:5, damage:10 },
      wrongPenalty:{ damage:5 },
      /* 延時／點錯都是彈孔（牠是用砲跟槍招呼你的）；大絕＝**特大彈孔＋畫面閃紅**
         （`flash:'red'`，ver -509 新演出，實作在 enemy.showHitFx）。 */
      hitFx:{
        delay:{ type:'bullet', count:1, pos:'random' },
        wrong:{ type:'bullet', count:1, pos:'random' },
        ult:{   type:'bullet', count:1, pos:'random', scale:2.4, flash:'red' },
      },
      resist:{ basic:0.20 },
      /* 弱點：反擊 +100%、**單射武器（萊福槍類）再 +150%**（`cat:` 只對反擊生效，
         判定在 combat.applyEnemyMods，同羽蛇卡）。 */
      weak:{ counter:1.00, 'cat:萊福槍':1.50 },
      dualBonus:0.20,
      counterBuff:{ mult:2, seconds:5 },
      counterStun:3,
      loot:[ { id:'brass_casing', n:1, p:0.33 } ],
      /* 金錢：HP 的 70%~90%。 */
      money:{ hpRatio:[0.7, 0.9] },
    },
    // 例：新怪
    // giant: { name:'巨人', image:'enemy_giant', imageBase:'giant', hp:150, attack:30, atkInterval:5, sound:{}, special:[] },
  },
  /* ══ 劇情插入戰（ver -375）══
     腳本裡寫 `{ battle:'guild_hunter' }` 時查這張表。**單敵一場**，打完直接交還劇情。
     ⚠ 與「教學戰」不同：教學那一場有台詞、有教到破防為止的閘門；這裡只是一場架。
     ⚠ 欄位只放「這一場」的規則，敵人本身的數值一律在 `enemies` 那張卡上 ——
       同一隻怪之後在別的場次登場時，卡不必抄第二份。
       noSaint / noPartner ＝ 這一場不能用聖徒化與搭檔技（Ray 的稿子指定）。 */
  battles: {
    /* `allowLose`（ver -376，Ray 定案）：**除標明劇情殺／可戰敗之外，戰敗一律接
       Game Over 畫面回主選單**。所以這一欄不寫＝打輸就 Game Over；
       只有「劇本要它被打輸」的場次才寫 `allowLose:true`（輸了接著演）。 */
    guild_hunter: { enemy:'guild_hunter', noSaint:true, noPartner:true },
    /* 槍店的打靶（ver -377）。⚠ 這一場**可以輸**（`allowLose`）—— Ray 的稿子有
       「戰敗」與「戰勝」兩支台詞，所以輸了不是 Game Over，是接另一支分歧。
       ⚠ `record` ＝ 這一場自己的最佳紀錄（通關用時），破紀錄時結算頁加 NEW。
       ⚠ 敵人先用**訓練用聖徒**（Ray 指定「先用」）。它是原始數值（HP 500、大絕 45），
         不是教學那一場被鎖過的版本 —— 所以真的會輸，那正是分歧存在的理由。
       ⚠ 沒有禁聖徒化／搭檔技：Ray 沒說要禁。要禁再加 noSaint/noPartner。 */
    /* ══ 打靶場的計時挑戰（ver -396，Ray 改寫）══════════════════════════
       「敵 hp 300、**不攻擊**、點錯**加 3 秒**、播 se_dart_fail、
         敵 hp 清零結算時間、記錄玩家個人時間、破紀錄加 New Record 標籤」
       ⚠ `timeAttack` 一開就把**整條攻擊路徑**關掉（大絕排程、延時懲罰、按錯扣血）——
         見 `modules/combat.js` 的 `enemyAttack` 與 `modules/defense.js` 的 `scheduleUlt`。
         這樣紅點、蓄力槽、血條變化通通不會演，畫面上只剩「打靶」。
       ⚠ 因此**不可能戰敗**（`allowLose` 不寫）。但**有「沒過關」**：`parSec` ＝ 標準時間，
         超過就走腳本的 `onLose` 那一支台詞（ver -396，Ray：「時間超過 50 秒出失敗分支的台詞」）
         —— 對腳本而言「超時」與「打輸了」是同一件事，共用那條分歧路（鐵律 8）。
       ⚠ `record:'range'` 是既有機制（`modules/inspector.js` 的 `scriptSettle`）：
         存這一場自己的最佳用時、破了就掛 New Record —— 不必另寫一套。 */
    /* ⚠⚠ `prizeSec` / `prize`（ver -421，Ray：「30 秒內清完槍店的靶送你一支龍息」）：
         **破了紀錄就給獎品**，而店主台詞裡說的「目前最佳紀錄」就是這個數字 ——
         兩邊同源（`script/town.js` 的台詞由 `rangeParText()` 產生），改這裡台詞跟著改。
       ⚠ 與 `parSec` 是兩條線：`parSec`（50）＝**沒過關**的分歧；
         `prizeSec`（30）＝**拿獎品**的門檻。中間那一段是「過關但沒獎品」。
       ⚠ 已經有那把槍就不再給（見 inspector.scriptSettle）。 */
    /* ⚠⚠ `noReward`（ver -439，Ray：「靶不要給 exp 跟錢」）：這一場**不給 EXP、
         不給金錢**。它可以重打到膩 —— 給獎勵就是一台印鈔機，而且「被評一次分」
         本來就已經免了（`EVAL_SKIP`）。
       ⚠ **破紀錄的獎品照給**（`timeAttack.prize`）：那是這一場的目的，不是報酬。
       ⚠ 判定在 `modules/inspector.js` 的 `scriptSettle` 讀這一欄，不認場次名。 */
    range_trainee: { enemy:'dart_target', record:'range', noReward:true,
                     timeAttack:{ wrongPenaltySec:3, se:'se_dart_fail', parSec:50,
                                  prizeSec:30, prize:'Shotgun_Dragon' } },
    /* ══ 飛行頁的遭遇戰（ver -382）══ 怪撞上船 → 跳來這一頁打舒爾特盤。
       ⚠⚠ 三隻怪的**敵人卡 Ray 還沒給**，所以現在**一律先借巨型聖徒**跑流程
         （同打靶先用訓練用聖徒的作法）。卡到位之後只要改 `enemy` 這一欄。
       ⚠ 打輸走一般的失敗流程（Game Over → 主選單），打贏才回飛行頁 —— 見 main.js。 */
    /* ⚠ 船艦戰的武器音**整組換掉**（ver -423，Ray 指定）：機槍→重機槍音、
       霰彈→手槍音同時六聲、步槍→艦砲。`weaponSound` 是「這一場」的覆寫，
       武器卡本身不動（同一把槍在陸戰還是原本的聲音）。 */
    /* ⚠ `talk` ＝**這一場自己的**戰鬥內對話（ver -426）。走的是教學那一支對話實作
       （`modules/tutorial.js` 的 openStep，鐵律 8），但**不是教學** —— 鎖攻擊力、
       敵人打不死、教學結算那一整套只看 `tutorialActive`，這裡一律不碰。
       ⚠ trigger 沿用既有那幾個節點：`battleStart`／`board:N`／`threat`／`defended`。
       ⚠ `talkOnce` ＝這一輪遊戲只講一次（旗標走 `progress`，所以讀檔會跟著回去，§6.9）。
       ⚠⚠ 反擊短教學由**諾薇兒**帶，就這兩句（Ray 交稿，一字未改）。 */
    flight_centipede: { enemy:'centipi',
                        /* ⚠⚠ **這一場開啟蕾娜的結算評價**（ver -432，Ray：「第一次艦戰後
                           開啟蕾娜評價」）。旗標由 `inspector.pickEvaluator` 在結算那一刻記，
                           所以**這一場自己那一次就評得到**，之後每一場都有（打靶除外）。
                           ⚠ 寫在卡上不寫死是哪一場（鐵律 1）：日後改成別場開啟只動這一欄。 */
                        evalFrom:true,
                        /* ⚠⚠ 船戰的武器音**按類別**固定（ver -504，Ray：「船戰武器的
                           數值都跟著玩家現在裝備的副武器，但是音效固定用船戰的」）——
                           換上哪一把（絞肉機改、龍息、遊隼…）數值都是那把槍的，
                           聲音一律是艦載的那一套。鑰匙＝武器類別（cat）；
                           也吃武器 id（特定武器要例外時寫 id，id 優先於類別）。
                           `once`（ver -503）：反擊開火同時疊播一支、整串只一次。 */
                        weaponSound:{ '重機槍':'se_ship_heavygun',
                                      /* ver -505（Ray：「發射音改 se_spiltcannon，跟 bulletpiece
                                         同時播，不要隨 hit 數疊加」）—— times 不寫＝1。 */
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_bulletpiece' },
                                      /* ver -506（Ray：「單擊砲 se 換 se_weapon_cannon，發射
                                         瞬間播，0.2 秒後播 se_weapon_shell，可重疊」）——
                                         `after`＝延遲跟播（weapon.js，同 once 一組機制）。 */
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 after:{ key:'se_weapon_shell', delayMs:200 } } },
                        /* 船戰的速射砲（機槍反擊）連射間隔（ver -476，Ray：「連射速度
                           調降50%」）：預設 90ms → 180ms。絕對值寫卡上（同敵人卡慣例）。 */
                        counterGapMs:180,
                        /* ⚠ talkOnce 自 ver -493 起**打贏才記**（combat.win／storyBattleEnd，
                           且僅劇情戰 state.storyBattle）：敗北重來每次都重播、
                           打贏之後永久停播；隨機遭遇共用這張卡也不播（判定由
                           發起端宣告，見 flight 的 toBattle `scripted`）。 */
                        talkOnce:'taught_ship_counter',
                        talk:[
                          /* ══ 進場（ver -429，Ray 交稿，一字未改；-478 改分鏡）══
                             ⚠ 分鏡（ver -478，Ray：「先進戰鬥畫面，咆哮震動再彈蕾娜
                               然後再彈諾薇兒 分左右」）：第一拍是**演出拍**（無人無框，
                               只有吼聲＋震動），蕾娜下一拍才滑入、諾薇兒再下一拍 ——
                               逐拍進場由 tutorial 的 syncCast(upto) 做，這裡只排拍。
                             ⚠ `sides` 不必寫 —— 站位在 `config.tutorial.cast`
                               （蕾娜右／諾薇兒左），那是整場一致的安排。 */
                          { trigger:'battleStart', lines:[
                            { se:'se_enemy_centipi', shake:true, hold:900 },   // 演出拍：牠先出聲
                            { who:'renna',    img:'tut_renna_shocked',
                              text:'竟然在內陸碰到這麼巨大的禍魘……' },
                            { who:'nouvelle', img:'tut_nouvelle_steady', text:'交給我們！' },
                            { who:'nouvelle', img:'tut_nouvelle_steady', text:'大型敵人就要靠重武器！' },
                            /* 主角的空白對話框（他開口了，但沒有台詞 —— §6.5 的慣例）。
                               ver -507/-508（Ray 指定）：這一拍主音是 se_metalclip（上膛），
                               齒輪聲疊在底下、metalclip 停了齒輪就收（seFollow）——
                               他正在拆艦砲，下一句蕾娜才喊「單手就把艦砲……！」。 */
                            { blank:true, se:'se_metalclip', seFollow:'se_kerberos_gear' },
                            { who:'renna',    img:'tut_renna_shocked',   text:'騙人的吧……單手就把艦砲……！' },
                            { who:'nouvelle', img:'tut_nouvelle_run',    text:'蕾娜小姐！請穩住船身！' },
                            { who:'nouvelle', img:'tut_nouvelle_run',    text:'這樣的話，那種東西對他來說就只是靶子！' },
                            { who:'renna',    img:'tut_renna_run',       text:'知道了！拜託了！' },
                          ]},
                          /* ══ 反擊短教學（諾薇兒帶，Ray 交稿）══
                             第一顆紅點生成的瞬間（對話會真暫停，圈就凍在畫面上）——
                             「抓準時機」要指著那個正在縮的圈講，講完才有東西可指。
                             ⚠ 兩句都擺在這裡（ver -429 由「開戰＋紅點」各一句移過來）：
                               進場那一段已經有諾薇兒「大型敵人就要靠重武器！」，
                               緊接著再講「用普通武器很難應付」會讀成她忘了自己剛說過。
                               隔著一段實際戰鬥再講，就變成「剛才你也試過了吧」。 */
                          { trigger:'threat', lines:[
                            { who:'nouvelle', img:'tut_nouvelle_cringe',
                              text:'大型敵人用普通武器很難應付！' },
                            { who:'nouvelle', img:'tut_nouvelle_steady',
                              text:'抓準時機，在敵人攻擊前的一瞬間用艦載武器反擊！' },
                          ]},
                          /* ══ 副武器切換教學（ver -478，Ray：「反擊教學加一段
                             副武器切換教學雪鐵龍」）：首次防禦成功後接一句，
                             雪鐵龍箭（guide:'wswitch'）指著血條右側的切換鈕。
                             ⚠ 台詞是暫擬的 —— Ray 要換稿直接改這一行。 */
                          { trigger:'defended', lines:[
                            { who:'nouvelle', img:'tut_nouvelle_steady', guide:'wswitch',
                              text:'點血條旁的武器圖可以切換艦載武器，反擊的時機與威力各有不同！' },
                          ]},
                        ] },
    /* 羽蛇（ver -500）。艦戰的武器音／連射間隔與蜈蚣那一場同一套（都是船戰）。
       talk＝卡上的「劇情」：登場特效拍（出場音效＋震動）→ 兩句。
       ⚠ 只有**劇情戰**會播（state.storyBattle）：隨機遭遇共用這張卡不播；
         talkOnce 打贏才記（§6.5.2）。 */
    flight_serpent:   { enemy:'serpent',
                        /* ⚠⚠ 船戰的武器音**按類別**固定（ver -504，Ray：「船戰武器的
                           數值都跟著玩家現在裝備的副武器，但是音效固定用船戰的」）——
                           換上哪一把（絞肉機改、龍息、遊隼…）數值都是那把槍的，
                           聲音一律是艦載的那一套。鑰匙＝武器類別（cat）；
                           也吃武器 id（特定武器要例外時寫 id，id 優先於類別）。
                           `once`（ver -503）：反擊開火同時疊播一支、整串只一次。 */
                        weaponSound:{ '重機槍':'se_ship_heavygun',
                                      /* ver -505（Ray：「發射音改 se_spiltcannon，跟 bulletpiece
                                         同時播，不要隨 hit 數疊加」）—— times 不寫＝1。 */
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_bulletpiece' },
                                      /* ver -506（Ray：「單擊砲 se 換 se_weapon_cannon，發射
                                         瞬間播，0.2 秒後播 se_weapon_shell，可重疊」）——
                                         `after`＝延遲跟播（weapon.js，同 once 一組機制）。 */
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 after:{ key:'se_weapon_shell', delayMs:200 } } },
                        counterGapMs:180,
                        talkOnce:'taught_serpent_frag',
                        talk:[
                          { trigger:'battleStart', lines:[
                            { se:'se_enemy_serpant', shake:true, hold:900 },   // 出場音效＋震動（卡：出場特效）
                            { who:'renna',    img:'tut_renna_shocked',   text:'好快！' },
                            { who:'nouvelle', img:'tut_nouvelle_steady', text:'速度快的敵人就用廣域破片砲！' },
                          ]},
                        ] },
    /* 空賊船（ver -509）。船戰的武器音／連射間隔同前兩場（都是船戰）。
       卡上出場音效／特效／背景＝0 ＝ 沒有開場演出、沒有 talk。 */
    flight_pirate:    { enemy:'pirate_ship',
                        weaponSound:{ '重機槍':'se_ship_heavygun',
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_bulletpiece' },
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 after:{ key:'se_weapon_shell', delayMs:200 } } },
                        counterGapMs:180 },
  },

  /* ══ 懸賞（ver -375）══ 賞金獵人公會的委託榜。
     ⚠ 目前**只有展示**：接單／完成／領賞都還沒做（Ray 的稿到「登記」為止）。
       資料先照他給的樣子存著，之後接流程時不用重打。
     ⚠ `city` ＝ 在哪一座城的公會看得到（櫃台：「各個城市的委託也會不同」）。
     ⚠ `reward` 的單位同金錢（G，見 items.moneyName）—— 不要在文案裡再寫一次單位。 */
  bounties: {
    rolf: { name:'黑船洛爾夫', city:'capital', reward:500,
            desc:'在瓦爾士大公國與法爾登王國交界出沒的空賊。' },
  },

  currentEnemy: 'faceless',   // 這場開場先打誰（填上面的鑰匙名）

  /* 連戰陣容（局＝同場清一隻接下一隻）。依序取,打完一敵接下一敵,最後一敵清完進結算。
     同場換敵全延續（playerHp/combo/energy/聖能/計數/計時延續）；只有「場」新戰鬥/Boss 亂入才重置。
     每隻各跑自己的 boardGrids 盤序（換敵時盤序回 0）。 */
  lineup: ['faceless','facelessgiant'],

  /* 亂入設定（New Hustle）— 結算畫面後、無傷達標才觸發 */
  intruder: {
    enable:true,
    condition:{ maxTime:45, noDamage:true },  // 45 秒內 + 全程無傷（v15 起觸發已改綁 S 評價，此條件僅備查）
    cutinText:'NEW HUSTLE INCOMING',           // 亂入 Boss 遭遇 cut-in 字樣（一律用此，不因怪而異）
    enemy:'witch',                             // v17：S 評價後遭遇的 Boss＝槍之魔女
    bannerHold:1800,                           // 結算畫面停留多久(ms)後才播 Boss cut-in
    // ── Boss 戰 S 級獎勵（銭湯インストール）──
    //   兩段式：按下「再度執槍」→ 原地變身金色呼吸光「SAINT INSTALL...?」→ 再按進獎勵畫面：
    //   全圖 + 左上角扁額毛筆字（逐字寫出）→ 寫完ツケ板（拍子木）兩聲。
    reward: {
      image:'bg_sentou',                       // 獎勵大圖（ASSETS 鑰匙）
      btnLabel:'SAINT INSTALL...?',            // 變身後按鈕字樣
      sign:['銭湯','インストール'],             // 毛筆招牌：橫排兩行（左上角木框額）
      charMs:380,                              // 每字書寫間隔(ms)
    },
  },

  /* ------------------------------------------------------------------ *
   *  五、數值總表（TUNING）— 對應說明書 §16 速查表
   *  想調手感就改這裡的數字，改完存檔重開即可。
   * ------------------------------------------------------------------ */
  tuning: {
    // 全域主音量（0~1）：所有 SFX/合成音/BGM 統一縮放（0.7 仍過大 → 再取其 70%＝0.49）。
    //   main.js 開機時經 SFX.setMasterVolume 套用；逐支的平衡走 fileGain（見下）。
    masterVolume:        0.49,

    // 玩家
    playerHp:            100,   // 我方血量

    // 傷害
    dmgBase:             3,     // 基礎單發傷害
    dmgPerCombo:         0.2,   // 每層連擊加成
    dmgComboCap:         20,    // 連擊加成計入上限
    dmgDualMult:         0.7,   // 雙槍傷害倍率（<1=安全牌）

    // 暴擊（普攻）：暴擊率/暴擊加傷皆隨「連擊」成長；連擊於受擊或清盤中斷歸零。雙槍破防期間無暴擊。
    critBaseRate:        0.10,  // 普攻初始暴擊率（連擊 0 時）
    critPerCombo:        0.01,  // 每一連擊 +1% 暴擊率
    critDmgBase:         0.10,  // 普攻暴擊加傷（+10%，連擊 0 時）
    critDmgPerCombo:     0.01,  // 每一連擊 +1% 暴擊加傷
    // 暴擊（反擊武器）：固定暴擊率、固定加傷；每一 hit 各自獨立擲骰。
    counterCritRate:     0.20,  // 反擊武器固定暴擊率
    counterCritDmg:      0.10,  // 反擊武器暴擊加傷（+10%）

    dmgWrong:            10,    // 普通按錯受擊
    dmgHeavy:            18,    // 紅字期間按錯的重擊
    dmgDelay:            8,     // v17：延時（太慢）懲罰基礎傷害（一般怪；Boss 以 delayPenalty.dmgScale 縮放）

    // 聖能與大絕蓄力
    energyPerHit:        2,     // 每次正確點擊給的聖能
    chargeSeconds:       4,     // 敵人大絕蓄力窗口（秒）

    // Overkill 限時（敵死後的追加輸出窗口）
    overkillLimitMs:     3000,  // 3 秒內沒清完 → 全數字磚破碎自動清盤
    overkillNextDelayMs: 0,     // 自動清盤後直接插入下一盤（原 1000ms 防連點誤觸，手感太拖已取消）
    // 照順序點的獎勵倍率：overkill 本身免順序（點到未消格就算命中），但若仍照數字順序
    //   接下去點，該擊傷害（＝overkill 點數，敵已死時傷害 1:1 進 overkill）×此值。
    //   1＝關閉獎勵。順序斷掉不罰，只是回到 1 倍；之後接回順序即可再拿獎勵。
    overkillOrderMult:   2,
    // 搭檔演出 SE 播放增益：母帶已重 master 至 RMS −11 dBFS（v2），播放端不再增幅；
    //   個別仍嫌大/小聲時微調這裡即可（>1 增幅、<1 衰減）
    //   vo_* 四支（技能 SE）：對齊 Luna 聖徒化語音的有效響度（RMS −14.4 dBFS）——
    //   依各檔母帶 RMS 差多少補多少，峰值略超滿刻度交給 SFX 匯流 limiter 軟接（不破音）。
    /* ══ 語音鏈（VO，ver -250）══
       只有語音走這一條（SFX.playVoice → audio.js 的 voiceChain），音效與音樂不走。

       為什麼要有：**耳機對了不代表手機對了**。手機單體 600 Hz 以下幾乎不發聲，
       而這幾支語音母帶有 45~92% 的能量落在 150~500 Hz。實測（tools/audio_probe.html）
       整層在耳機上齊平（落差 0.0 dB），到手機上卻散開成 9.7 dB：
         vo_luna_dualwield  −18.0（耳機）→ −25.2（手機）  92% 能量在 150~500 Hz
         vo_malzeno_hcrounds −18.0        → −22.3
       兩支都掉到音效層（−22）以下 —— 被槍聲蓋掉，聽起來就是「糊」。

       eq   切掉手機放不出來的低頻、壓渾濁段（低棚而不是戳一個點）、抬子音。
            存在/渾濁比因此從 −8~−21 dB 拉到 +1~−10 dB。
       comp ⚠ 不是為了更大聲，是為了**不要去踩 SFX 匯流的 limiter**
            （threshold −6／ratio 12／release 120ms）。峰值一過門檻整句被壓住
            120ms，那個 pumping 本身就是悶與糊。

       ⚠ **沒有收尾的 limiter 一節，而且不要加**：Chrome 的 DynamicsCompressor
         內建自動補償增益（跟 threshold 與 ratio 綁在一起），所以再串一顆
         「限幅器」的結果是**整體變大聲、峰值反而更高**。實測把 lim 的門檻從
         −1 降到 −4（照直覺應該壓更多），整層反而從 −17.9 變成 −16.0 LUFS、
         最高峰從 +1.4 升到 +2.6 dBFS。補償後仍過頭的那兩支（+0.5／+1.4）交給
         匯流 limiter 接就好 —— 那本來就是它的工作，而且只作用在瞬態。
       ⚠ 改這裡就要同步 tools/audio_probe.html 的 VO_EQ／VO_COMP，否則量到的
         不是實際播出的東西。 */
    voiceChain: {
      eq:   [ ['highpass', 130, 0.707,  0],
              ['lowshelf', 500, 0.707, -5],
              ['peaking', 3000, 1.00,  +4] ],
      comp: { threshold:-26, knee:14, ratio:4, attack:0.005, release:0.12 },
    },

    /* ══════════════════════════════════════════════════════════════════
       全域響度：**每一支拉平到同一個目標，三層之間再給一組比例**
       （ver -441 重訂，Ray：「全域音效 bgm 語音響度拉平，語音 100%、
         音效 90%、音樂 80%」）。
       ──────────────────────────────────────────────────────────────────
       量測法沒變：BS.1770 K 加權 + 閘控積分響度（近似 LUFS），不是 RMS
       （RMS 低估人聲、高估低頻，那正是舊表把槍聲調得比語音還大的原因）。
       ⚠ 量兩次：**耳機**（原始）與**手機**（600 Hz 三階高通的小喇叭模型），
         反推用的是**兩者的平均** —— 只對其中一邊會把另一邊的平衡打壞（§6.6）。
       ⚠ 語音要**過完 voiceChain 之後**才量：它真正播出去是走那條鏈。
         動 voiceChain 就要把 vo 那幾支重算。

       ver -243 那套「VO −18／SE −22／BGM −28」的**分級已經取消** ——
       現在是一個目標 `targetLufs` 把 62 支全部拉平，層與層的關係
       只由 `layer` 這三個數字決定（改比例只改這三個，不必重算 60 幾支）。

       ⚠⚠ 分層基準**不乘進逐支的增益**：它在匯流那一節乘一次
         （audio.js 的 `_layerBase`，由 main.js 推進來）—— 一個量一個計算點。
       ⚠ 逐支的公式：gain = 10^((targetLufs − 平均LUFS)/20) ÷ masterVolume。
         除 master 是因為 SFX 匯流會再乘一次；**BGM 現在也吃 master**
         （audio.js 的 `bgmTargetVol`，ver -397 起），所以兩層同一條式子。
       ⚠ `peakCeilDb`：增益推到峰值超過這條線就**夾住**（表上標 CAP）。
         匯流的 limiter 門檻是 −6 dB／ratio 12，再往上推也只是被壓扁，
         不會更大聲，只會多一份失真。被夾住的那幾支（實測 8 支，多半是
         母帶動態很大的環境音）會低於目標，那是母帶的極限不是算錯。
       ⚠ 重量／新增音檔一律跑 `tools/audio_scan.html`：它現場列目錄、
         逐支量完直接印建議值，**不要憑感覺填**。 */
    loudness: {
      targetLufs: -20,       // 拉平的共同目標
      peakCeilDb: 2,         // 增益後的峰值上限（dBFS）
      layer: { vo:1.00, se:0.90, bgm:0.80 },   // Ray 指定的三層比例
    },

    /* 哪幾個 ASSETS 鍵是**語音**（走 voiceChain）。⚠ 這是**歸屬**不是增益 ——
       ver -441 之前這件事是靠「在不在 partnerSeGain 那張表裡」判的，
       增益一搬家那個判斷就會憑空消失。 */
    voiceKeys: ['se_luna_dual','se_luna_exc','se_luna_obe','voice_saint_luna',
                'vo_life_return','vo_death_guard','vo_supply_refill','vo_hc_rounds',
                'vo_dual_torsten'],

    /* ══ 逐支增益：鑰匙是**檔名**（去副檔名、轉小寫）══════════════════
       ⚠⚠ 鑰匙用檔名不用 ASSETS 鍵（ver -441）：**一支音檔只有一個響度**，
         而同一支檔案在專案裡有好幾種叫法（`sfx_saint` 與 `se_saint_install`
         是同一支；劇情層的 `SE_FILES` 根本沒有 ASSETS 鍵 —— 那正是
         `se_steps`／`se_Fall` 一直以 gain 1 播出、比別人小 12 dB 的原因）。
       ⚠ 沒列在這裡的檔案 ＝ 1（等於沒量過）。加音檔請跑 audio_scan 補一列。
       實測日期 ver -441；`CAP` 標記見上面 `peakCeilDb` 的說明。 */
    fileGain: {
      /* ── 語音（過 voiceChain 後量）── */
      vo_luna_dualwield:1.483, vo_luna_execution:1.013, vo_luna_obe:1.163,
      vo_luna_saintinstall:1.345, vo_malzeno_hcrounds:2.647,
      vo_malzeno_supplyrefill:2.261, vo_renee_deathguard:1.563,
      vo_renee_lifereturn:3.712,
      /* ver -479 入表（本篇破防）：語音鏈近似（130Hz 高通）耳機 −18.7／手機 −20.7
         → 平均 −19.7 LUFS → 2.482 */
      vo_torsten_dualcrush:2.482,

      /* ── 武器 ── */
      se_weapon_pistol_01:0.607, se_weapon_pistol_02:1.165, se_weapon_pistol_03:1.751,
      se_weapon_mg_squall:0.854, se_weapon_shotgun_blast:0.530,
      se_weapon_sniper_falcon:1.023, se_weapon_guard:1.254, se_weapon_reload:1.143,
      /* se_weapon_heavygun ver -476 換新檔重量：平均（耳機/手機模型）−13.2 LUFS → 0.738 */
      se_weapon_cannon_120mm:0.839, se_weapon_heavygun:0.738,
      /* ── 敵人 ── */
      se_enemy_slash:0.602, se_enemy_smack:1.173, se_enemy_shot:0.854,
      se_enemy_revolver:0.732, se_enemy_dagger:3.959, se_enemy_centipi:1.272,
      se_enemy_saintroar:2.910,
      /* ── 聖徒化／搭檔 ── */
      se_saint_install:1.059, se_saint_maxburst:0.955, vo_lunamg:2.066,   // se_lunaMG → vo_lunaMG（Ray 改名，ver -508）
      /* ── UI ── */
      se_ui_click:4.750, se_ui_kagurabell:2.530, se_ui_pageflip:2.359,
      se_ui_sortie:1.184, se_ginclick:1.106, se_metalclip:1.139,
      se_buy:1.122, se_healing:1.461,   // ver -499（audio_scan 實測：−14.8／−17.1 LUFS）
      se_enemy_serpant:2.184,           // ver -500（audio_scan 實測：−20.6 LUFS）
      se_bulletpiece:1.49,              // ver -503（audio_scan 實測：−17.2 LUFS）
      se_spiltcannon:0.62,              // ver -505（audio_scan 實測：−9.7 LUFS，母帶很大聲）
      se_weapon_cannon:1.29, se_weapon_shell:1.24,   // ver -506（audio_scan 實測：−16.0／−15.7 LUFS）
      se_dart_fail:2.792,
      /* ── 劇情／城鎮（這一批以前完全沒有增益，見上面的說明）── */
      se_steps:7.198, se_walk:4.481, se_fall:3.724, se_punch:1.596,
      se_tummy:8.268, se_sailorshout:2.048, se_sleep:1.708,
      se_kerberos_open:1.558, se_kerberos_pop:1.479, se_kerberos_steam:1.301,
      se_kerberos_gear:6.179, se_kerberos_drop:1.550,
      /* ── 飛行頁（那一頁用 HTMLAudio，讀同一張表，見 flight/index.html）── */
      se_flight_heartbeat:5.064, se_flight_idle_loop:2.848,
      se_flight_sail_loop:7.928, se_flight_seagull:3.353, se_flight_train:5.059,
      sturm:1.709,

      /* ── 音樂 ── */
      bgm_mainmenu:1.735, bgm_battle:0.849, bgm_boss:0.665, bgm_result:0.855,
      bgm_missionfailed:1.995, bgm_capital_day:1.213, bgm_lunaria:1.230,
      peritunematerial_crisis_loop:1.077,
      /* ⚠ 母帶太小聲（−26 LUFS）：×master×層之後會撞上 HTMLAudio 的 1.0 上限，
         實際只到 −26 而不是目標的 −21.9。要救得重做母帶。 */
      bgm_flight:4.056,
    },

    // 載入畫面教學 Hint 輪播（文案見 loadingHints）
    loadingHintHoldMs:   5000,  // 每句停留 5 秒
    loadingHintFadeMs:   400,   // 淡入/淡出時間

    // 三級防禦窗口（依紅點剩餘時間比例；大=早，小=晚）
    defDefenseMin:       0.35,  // 0.35~1.0 → Defense（傷害減半）
    defPerfectMin:       0.12,  // 0.12~0.35 → Perfect（免傷）
                                // 0~0.12 → Counter（免傷+武器反擊）

    // 雙槍
    dualSeconds:         6,     // 破防模式時長（秒）。ver -474：4→6（Ray：「雙槍破防時間＋2秒」）

    // 聖徒化（受擊競賽爆發）
    // v18：由「回血計時器」改為「受擊推進計時器」。血條＝倒數槽；只有真正受擊才推進，
    //      推進到滿＝OBE（沒守住）；滿前把盤面點完＝Maximum Burst（贏了就跑）。
    //      Counter／Perfect 維持免傷、不推進。維持 16 宮格、期間敵攻擊更密集保持忙碌爽快。
    saintGrid:           16,    // v18：聖徒化盤面格數（維持 16，不再擴成 25）
    saintGridCols:       4,     // v18：聖徒化盤面每列格數
    saintAdvanceDivisor: 15,    // v18：一次「受擊」（挨大絕／按錯／反應超時）推進量＝playerMax/此值（≈+1 秒）
    saintBlockDivisor:   30,    // v18：一次「格擋（Defense）」推進量＝playerMax/此值（≈+0.5 秒）
    saintPassiveHealSec: 10,    // v18b：被動回血打底——無受擊時，從現存血量回滿約需秒數（受擊會額外加速）
    saintReactSecInSaint:5,     // 聖徒化「發動期間」延時懲罰放寬（秒）：v16
    saintNoAtkAfterCutinSec: 3, // 聖徒化 cut-in 撤下後，敵不發動大絕的秒數（v16）
    saintUltMinMs:       1200,  // v18：聖徒化期間敵大絕發動頻率下限（毫秒；越小越密集）
    saintUltMaxMs:       2600,  // v18：聖徒化期間敵大絕發動頻率上限（毫秒）
    saintComboStep:      1.0,   // 聖徒化每 combo 疊傷斜率（無上限）。reference 為 0.5；本專案調 1.0
                                //   使單場 16 擊累計 ≈211（>200 目標）。見 DECISIONS.md D4。
    saintLastHitRatio:   0.20,  // 結束前清盤 → 追加期間總傷害的 20%（MB 爆發；維持 reference）

    // 攻擊加倍 buff
    atkBuffSeconds:      3,     // 攻擊加倍時長（秒）

    // 榴彈
    grenades:            1,     // 開局榴彈數
  },

  /* ------------------------------------------------------------------ *
   *  六、盤面序列（Schulte 方格）— 進階，通常不用動
   *  grid=格數, cols=每列幾格, interval=間隔時限(秒), hint=是否高亮下一格
   * ------------------------------------------------------------------ */
  boards: [
    { grid:9,  cols:3, interval:2.0, hint:true  },
    { grid:9,  cols:3, interval:2.2, hint:false },
    { grid:16, cols:4, interval:2.8, hint:false },
    { grid:16, cols:4, interval:3.0, hint:false },
    { grid:16, cols:4, interval:3.2, hint:false },
  ],

};

export const ASSETS = {
  // ── 圖片 ──
  home_emblem:    "resources/background/TIVOT_Emblem.png",   // 主畫面徽記（含 THE IV ORDER OF TESTAMENT 弧字）
  enemy_faceless: "resources/enemy/Saint_UG_CI.jpg",   // 地下聖徒（UG=underground）
  cutin_saint:    "resources/partner/Luna_CI_saint.jpg",   // 聖徒化 cut-in 暫代圖
  partner_twin:   "resources/partner/Luna_SI_01.jpg",   // 雙槍修女立繪（暫用 cut-in 圖）
  inspector_freya: "resources/inspector/Freya_SI_01.webp",
  /* Boss 戰（挑戰的槍之魔女）勝利結算評價者：璐娜莉亞（ver -471，Ray 交稿）——
     坐姿立繪逐**等第**差分（S/A 共用 smirk）。lose 仍是芙蕾雅，這五張只有打贏用。 */
  inspector_luna_smirk:    "resources/SI/Luna_SI_seat_smirk.webp",
  inspector_luna_n:        "resources/SI/Luna_SI_seat_N.webp",
  inspector_luna_lookdown: "resources/SI/Luna_SI_seat_lookdown.webp",
  inspector_luna_angry:    "resources/SI/Luna_SI_seat_angry.webp",
  inspector_luna_hand:     "resources/SI/Luna_SI_seat_hand.webp",
  enemy_witch:    "resources/enemy/GunWitch_Boss_CI.jpg",   // 槍之魔女（Boss）內嵌立繪
  enemy_facelessgiant: "resources/enemy/Saint_GT_CI.webp",   // 連戰第二隻：巨型聖徒（GT=giant）
  enemy_trainee:  "resources/enemy/Saint_TR_CI.webp",   // 教學專用敵：訓練用聖徒
  enemy_dart_target: "resources/enemy/Dart_timeattack.webp",   // 打靶場：固定立靶（ver -396）
  /* 賞金獵人（ver -375）：戰鬥立繪＝對話立繪的 `attack` 那張（去背，配 `bg` 用）。 */
  enemy_guild_hunter: "resources/SI/NPC_GuildHunter_SI_Attack.webp",

  // ── 五張 cut-in 圖（v17.7 嵌入）──
  cutin_saint_luna: "resources/partner/Luna_CI_advent.jpg",   // 聖徒化降臨 cut-in（Luna）
  voice_saint_luna: "resources/audio/vo/vo_luna_saintinstall.m4a",       // 聖徒化發動語音（Luna，1.7s；與 sfx_saint 疊播）
  cutin_exc: "resources/partner/Luna_CI_exc.webp",   // 處決 EXSECUTIŌ cut-in（Luna）
  cutin_obe: "resources/partner/Luna_CI_obe.jpg",   // O.B.E. cut-in（Luna）
  cutin_mb: "resources/partner/Luna_CI_maxburst.jpg",   // Maximum Burst cut-in（Luna）
  cutin_guard: "resources/partner/Renee_CI_pas.jpg",   // 即死防禦 cut-in（蕾妮/Renee·被動；檔名 _pas＝passive）
  cutin_nouvelle_guard: "resources/CI/CI_Nouvelle_Deathguard.webp",   // 諾薇兒的即死防禦 cut-in（ver -499，Ray 交件）
  cutin_return: "resources/partner/Renee_CI_act.jpg",   // 生命歸還 cut-in（蕾妮/Renee·主動；檔名 _act＝active）
  cutin_malzeno_act: "resources/partner/Malzeno_CI_act.webp",   // 前線補給 cut-in（馬季諾·主動）
  cutin_malzeno_pas: "resources/partner/Malzeno_CI_pas.webp",   // 高裝藥彈 cut-in（馬季諾·被動；正式圖）

  // ── 搭檔選人畫面大立繪 ──
  partner_renee:   "resources/partner/Renee_SI_01.webp",     // 蕾妮 立繪
  /* 諾薇兒的搭檔立繪（ver -422）：先借對白用的正面全身圖。
     ⚠ 換成專屬的選人立繪時，`partners.nouvelle.siFit` 要重量（那是**那一張圖**的數字）。 */
  partner_nouvelle:"resources/SI/Nouvelle_SI_front.webp",     // 諾薇兒 立繪（暫用對白圖）
  /* ── 教學（劇情版）的諾薇兒立繪與差分（ver -323）──────────────────────
     ⚠ 這一組**只給劇情帶起來的教學**用（tutorial.isStoryRun()）。首頁「教學」鈕
       那一場仍是芙蕾雅／蕾妮 —— Ray 指定兩者要分開。 */
  tut_nouvelle:          "resources/SI/Nouvelle_SI_front.webp",
  tut_nouvelle_cringe:   "resources/SI/Nouvelle_SI_Cringe.webp",
  tut_nouvelle_surprise: "resources/SI/Nouvelle_SI_Surprise.webp",
  tut_nouvelle_desperate:"resources/SI/Nouvelle_SI_Desperate.webp",
  tut_nouvelle_saint:    "resources/SI/Nouvelle_SI_SAINTINSTALL.webp",
  /* ⚠ 檔名 ver -454 由 Ray 改為 `CI_` 前綴（`Nouvelle_SAINTINSTALL` → 同名加前綴）。 */
  cutin_nouvelle_saint:  "resources/CI/CI_Nouvelle_SAINTINSTALL.webp",   // 全畫面 cut-in
  /* ══ 本篇（story）的 cut-in 差分（ver -454，Ray 指定三張）══════════════
     試玩版照舊用 Luna／Renee 那一組；分流都走 `storyMode()`（鐵律 8）：
       破防     → weapon.activateDual
       聖徒化   → saint.activateSaint（搭檔為諾薇兒時）
       生命歸還 → saint.playSaintCutin('return') */
  cutin_dual_torsten:    "resources/CI/CI_Torsten_Dualcrush.webp",
  cutin_return_nouvelle: "resources/CI/Nouvelle_Sturm.webp",
  partner_malzeno: "resources/partner/Malzeno_SI_01.webp",   // 馬季諾 立繪
  cutin_boss: "resources/enemy/Belinda_CI_boss.jpg",   // v18d：Boss（貝琳妲）遭遇 cut-in 專屬圖
  bg_sentou: "resources/background/SENTOUINSTALL.webp", // Boss 戰 S 級獎勵畫面（銭湯インストール）

  // ── 副武器圖（換裝選單縮圖）：鑰匙對應 weapons.image；檔名＝類型_武器名 ──
  /* 巨型蜈蚣（ver -423）：**三張時段差分**（Ray 指定：上午下午 day、晚上 night、
     黃昏黎明 dd）。解析在 `modules/enemy.js` 的 `enemyImage()`，那裡是唯一一處。 */
  enemy_centipi_day:   "resources/enemy/Centipi_day.webp",
  enemy_serpant_day:   "resources/enemy/Serpant_day.webp",     // 羽蛇（ver -500，Ray 的卡）
  enemy_pirate_day:    "resources/enemy/Pirateship_day.webp",   // 空賊船（ver -509，Ray 的卡）
  enemy_pirate_dd:     "resources/enemy/Pirateship_DD.webp",
  enemy_pirate_night:  "resources/enemy/Pirateship_night.webp",
  enemy_serpant_dd:    "resources/enemy/Serpant_DD.webp",
  enemy_serpant_night: "resources/enemy/Serpant_night.webp",
  enemy_centipi_night: "resources/enemy/Centipi_night.webp",
  enemy_centipi_dd:    "resources/enemy/Centipi_DD.webp",
  inspector_renna:     "resources/SI/Renna_SI_front.webp",         // 讀取頁的說明者（出航後）
  weapon_mg_squall:     "resources/weapon/MG_Squall.webp",       // 重機槍 Squall
  weapon_shotgun_blast: "resources/weapon/Shotgun_Blast.webp",   // 散彈槍 Blast
  weapon_sniper_falcon: "resources/weapon/Sniper_Falcon.webp",   // 狙擊槍 Falcon

  /* ── 音效 / BGM / 語音（預留槽）───────────────────────────────────────────
   *  目前 audio.js 為 no-op 骨架（合成音尚未搬回），這裡先掛 null 佔位；
   *  日後填 base64 或路徑（建議 resources/audio/{sfx,bgm,voice}/…）即可，
   *  程式 asset(key) 已相容 null→""，故未填不會壞。
   *  命名慣例：SFX＝SE_… ／ BGM＝BGM_… ／ 語音＝VO_…（鑰匙小寫、檔名保留大小寫）  */

  /* ══ 音訊：resources/audio/{bgm,se,vo} ══
     命名規則（一看就知道是什麼，不用翻這份檔）：
       bgm_<場合>            背景音樂，場合＝它在哪一頁／哪個狀態播
       se_<分類>_<名稱>    音效，分類＝ui／weapon／enemy／saint／flight
       vo_<角色>_<技能>    語音，技能用正式名稱
     ⚠ 舊名的病灶是「看不出用途」：Renee_VC_Act / _Pas 要翻這份檔才知道
       哪個是生命歸還、哪個是即死防禦；Battle_01 / BOSS_01 的 _01 不代表任何意思；
       Start_01（出陣）與 StartBT_SE（神楽鈴）兩個都叫 start 却是不同的東西。
       新名一律用**用途**當主詞，不用來源或流水號。
     ⚠ 底線開頭的三個資料夾**不會被遊戲載入**：
       _master＝BGM 母帶（.m4a 由它們轉出），_unused＝目前沒接線的，
       _raw＝還沒處理的素材下載。
     ⚠ 搬檔與改名走 tools/audio_reorg.py，別手改 —— 它會一併改寫
       config.js 與 flight/index.html 兩邊的路徑，手改很容易漏掉後者。 */
  // 反擊武器音效（所有副武器各一支；鑰匙對應 weapons.sound）。
  /* 船艦戰用的武器音（ver -423／-425 補齊，Ray 指定）。
     ⚠ 艦砲的素材原檔叫 `se_weapon_spitCannon`（本來放在 `_unused/`）——
       Ray 確認「是要當艦砲用的」，轉檔時一併正名成 `se_weapon_cannon_120mm`。 */
  se_ship_cannon:    "resources/audio/se/se_weapon_cannon_120mm.m4a",   // 艦砲（步槍在船戰也用它）
  se_ship_heavygun:  "resources/audio/se/se_weapon_heavygun.m4a",       // 船戰的機槍
  se_enemy_centipi:  "resources/audio/se/Se_enemy_centipi.m4a",         // 巨型蜈蚣（登場／攻擊）
  se_enemy_serpant:  "resources/audio/se/Se_enemy_serpant.m4a",   // 羽蛇出場（ver -500）
  se_mg_squall:      "resources/audio/se/se_weapon_mg_squall.m4a",       // 重機槍 反擊（連續感：整支播一次）
  se_shotgun_blast:  "resources/audio/se/se_weapon_shotgun_blast.m4a",   // 散彈槍 反擊（一次一發）
  se_sniper_falcon:  "resources/audio/se/se_weapon_sniper_falcon.m4a",   // 狙擊槍 反擊（單發）

  // 清盤換彈音（盤面清空、顯示 RELOADING 時播）
  sfx_reload:        "resources/audio/se/se_weapon_reload.m4a",

  // 開始遊戲 stinger（點下開始瞬間，蓋過 BGM 切歌的淡出/進入前段）
  sfx_start:         "resources/audio/se/se_ui_sortie.m4a",
  sfx_startbt:       "resources/audio/se/se_ui_kagurabell.m4a",   // 出陣鈕/overkill/Boss S 第一按（神楽鈴）
  // 通用 UI 音：所有未指定音效的按鈕（bindBtn/menuClick 統一出口）／搭檔選人換卡翻頁
  se_general_click:  "resources/audio/se/se_ui_click.m4a",
  se_dart_fail:      "resources/audio/se/se_dart_fail.m4a",   // 打靶失手（ver -396）
  se_pageflip:       "resources/audio/se/se_ui_pageflip.m4a",
  se_buy:            "resources/audio/se/se_buy.m4a",       // 商店結帳（ver -499，Ray 交件）
  se_bulletpiece:    "resources/audio/se/se_bulletpiece.m4a",   // 船戰散射的彈幕聲（ver -503，兩支素材混剪）
  se_spiltcannon:    "resources/audio/se/se_spiltcannon.m4a",   // 船戰散射的發射音（ver -505，Ray 交件）
  se_weapon_cannon:  "resources/audio/se/se_weapon_cannon.m4a",   // 船戰單擊砲發射音（ver -506，Ray 交件）
  se_weapon_shell:   "resources/audio/se/se_weapon_shell.m4a",    // 砲彈殼落地（發射 0.2 秒後跟播）
  se_healing:        "resources/audio/se/se_healing.m4a",   // 使用回復道具（ver -499，Ray 交件）
  /* 旅店「回房睡覺」（ver -430，Ray 交件）。⚠⚠ **淡出至黑的長度就是這支的長度** ——
     不要在別處寫一個秒數（鐵律 7）：`modules/inn.js` 問 `SFX.duration()` 拿實測值。
     ⚠ 它還是 **mp3**（316 KB）；§6.6 規約是 AAC/m4a，但這台機器沒有轉檔工具。
       轉檔時**檔名別改**（改了 ASSETS 與這一行的註解都要跟著動），
       而且轉檔不改響度，所以下面那個增益不必重算。 */
  se_sleep:          "resources/audio/se/Se_sleep.mp3",
  // 聖徒化發動音效
  //  ⚠ 素材「內容」更新但檔名不變時,在路徑加/升 ?v=N 強制手機重抓(HTTP 快取以 URL 為鍵)。
  sfx_saint:         "resources/audio/se/se_saint_install.m4a?v=3",

  // 完美防禦（完防）合成替代音（一般武器；散彈完防維持自己的槍聲）
  se_guard:          "resources/audio/se/se_weapon_guard.m4a",

  // 搭檔演出 SE（Luna）：發動/結局 cut-in 同步播。放 resources/partner/。
  //  v2：母帶重 master（RMS −28→−11 dBFS + 軟限幅），內容更新 → 升 ?v 強制重抓
  // v3：改「原始檔＋純線性增益到峰值 -1dB」重製（v2 的 tanh 軟限幅有飽和失真=聽感糊）。
  //     RMS 約 -14 dBFS；再大聲改 tuning.fileGain（播放端有 limiter 匯流，不會破音）。
  //  ⚠ 檔名的 VC＝voice（語音），與純音效的 SE 分家：這四支是搭檔的台詞，
  //     響度基準跟語音走（fileGain 拉平到 targetLufs），不是音效層。
  se_luna_dual:      "resources/audio/vo/vo_luna_dualwield.m4a",   // 雙槍破防發動
  /* 本篇的破防發動語音（ver -479，Ray 交檔 vo_Torsten_DualCrush）——
     -475 曾暫借馬季諾的高裝藥彈語音，正主到了。檔名照規約轉小寫（靜態空間分大小寫）。 */
  vo_dual_torsten:   "resources/audio/vo/vo_torsten_dualcrush.m4a",
  se_luna_exc:       "resources/audio/vo/vo_luna_execution.m4a",    // 處決 EXSECUTIŌ cut-in
  se_luna_mb:        "resources/audio/se/se_saint_maxburst.m4a",     // Maximum Burst cut-in
  se_luna_obe:       "resources/audio/vo/vo_luna_obe.m4a",    // O.B.E. cut-in

  // 敵人攻擊音（依攻擊種類 kind：ult 大絕命中/不完美防禦格擋、delay 太慢、wrong 按錯）。
  em_slash:          "resources/audio/se/se_enemy_slash.m4a",    // 聖徒：大絕/不完美防禦/按錯
  em_smack:          "resources/audio/se/se_enemy_smack.m4a",    // 聖徒：延時懲罰
  em_shot:           "resources/audio/se/se_enemy_shot.m4a",     // Boss：延時懲罰
  em_revolver:       "resources/audio/se/se_enemy_revolver.m4a", // Boss：大絕/不完美防禦（左輪）
  em_dagger:         "resources/audio/se/se_enemy_dagger.m4a",   // Boss：按錯

  // 普攻槍聲（手槍；每次正確點擊由這兩支隨機播一支，製造變化）
  se_pistol_01:      "resources/audio/se/se_weapon_pistol_01.m4a",
  se_pistol_02:      "resources/audio/se/se_weapon_pistol_02.m4a",
  se_pistol_03:      "resources/audio/se/se_weapon_pistol_03.m4a",  // 普攻槍聲（現行）

  // BGM（loop、不可交疊，切歌時前一首淡出）。
  //  BGM 一律 .m4a（AAC-LC 96k，自 128k MP3 轉檔，體積 −24%）：全平台原生支援；
  //  .mp3 母帶在 resources/audio/bgm/_master/，需要重轉時用 ffmpeg -c:a aac -b:a 96k。
  bgm_home:      "resources/audio/bgm/bgm_mainmenu.m4a",       // 主選單（含次要選單）
  bgm_crisis:     "resources/audio/bgm/PerituneMaterial_Crisis_loop.m4a",   // 劇情/教學的緊張曲；教學結算也用它（ver -361，Ray：結算不要 result BGM）
  bgm_battle:    "resources/audio/bgm/bgm_battle.m4a",      // 戰鬥（驅逐開始插入瞬間起播）
  bgm_lose:      "resources/audio/bgm/bgm_missionfailed.m4a", // 任務失敗（驅逐失敗插入起播）
  bgm_result:    "resources/audio/bgm/bgm_result.m4a",      // 結算（驅逐完成頁被點掉後起播）
  bgm_boss:      "resources/audio/bgm/bgm_boss.m4a",        // Boss 戰（點下迎擊起播）
  bgm_intruder:  null,   // （無獨立亂入曲；亂入＝Boss，走 bgm_boss）

  // 語音（每個 cut-in 各一支；檔名 VO_<情境>）
  vo_saint_install: null,   // 聖徒化降臨（SAINT INSTALL）→ VO_SaintInstall
  vo_maxburst:      null,   // Maximum Burst            → VO_MaxBurst
  vo_exsectio:      null,   // EXSECUTIŌ（處決）         → VO_Exsectio
  vo_obe:           null,   // O.B.E.                   → VO_OBE
  vo_life_return:   "resources/audio/vo/vo_renee_lifereturn.m4a",     // 生命歸還（蕾妮·主動）— partner.lifeReturn 播
  vo_death_guard:   "resources/audio/vo/vo_renee_deathguard.m4a",     // 即死防禦（蕾妮·被動）— partner.tryDeathGuard 播
  vo_supply_refill: "resources/audio/vo/vo_malzeno_supplyrefill.m4a",   // 前線補給（馬季諾·主動）— partner.supplyRefill 播
  vo_hc_rounds:     "resources/audio/vo/vo_malzeno_hcrounds.m4a",   // 高裝藥彈（馬季諾·被動）— partner.checkLowHpBuff 播
  vo_dual_wield:    null,   // 雙槍破防                 → VO_DualWield
  vo_new_hustle:    null,   // Boss 遭遇 / 亂入          → VO_NewHustle
};

/* ══ 戰鬥對白用的立繪鍵（ver -429）══════════════════════════════════════
   ⚠⚠ **路徑不在這裡寫死**：`script/speakers.js` 的 `ART` 才是立繪的唯一真相
     （檔名、取景值都在那邊，鐵律 7）。這裡只是把「戰鬥對白要用到的那幾張」
     掛上 ASSETS 鍵 —— `modules/tutorial.js` 的 `asset(key)` 與
     `config.tutorial.portraitFrames` 都以鍵查表。
   ⚠ **只列真的用得到的**：`ART` 每個角色有二十幾張差分，整批掛上去等於讓開機
     預載多抓幾十張圖（`main.js` 是走 `Object.keys(ASSETS)` 的）。
   ⚠ 加一句新台詞要用新差分時，在這裡補一筆就好，取景值會自己跟著來。 */
(function tutPortraits(){
  const need = { nouvelle:['steady','run'], renna:['shocked','run'] };
  for(const who in need){
    const A = ART[who]; if(!A) continue;
    ASSETS['tut_'+who] = A.base;
    for(const e of need[who]){
      const v = A.expr && A.expr[e];
      if(v && v.src) ASSETS['tut_'+who+'_'+e] = v.src;
    }
  }
})();

/* ---- 小工具：從 ASSETS 取素材（找不到回傳空字串，不會壞）---- */
/* ══ 武器規格文字（ver -377）══
   ⚠⚠ **武器的數值只有一份**：`weapons[].hits/dmgPerHit/defenseDamageScale/…`。
     說明文字由這裡**算出來**，不要在 `desc` 裡再手寫一次數字（鐵律 7）——
     以前那樣寫，改了數值而忘了改文案，玩家看到的規格就是錯的。
     `flavor` 只留一句風味（「攻守均衡的可靠選擇」），那一句沒有數字。
   ⚠ 出擊整備的卡（`weapon.js`）與槍店（`loot.js`）**共用這一支**。 */
/* ⚠⚠ **武器數值的唯一入口**（ver -378）：`story` 為真時套上本篇的覆寫。
   試玩版（首頁出陣／教學）傳 false 或不傳 —— 那一組數值一個字都不會動。 */
export function weaponOf(key, story){
  const w=(GAME_CONFIG.weapons||{})[key];
  if(!w) return null;
  return (story && w.story) ? Object.assign({}, w, w.story) : w;
}
export function weaponStatRows(key, story){
  const w=weaponOf(key, story); if(!w) return [];
  const def = (w.defenseDamageScale==null) ? 0.5 : w.defenseDamageScale;
  const yellow = def>=1 ? '無減傷效果' : (def<=0 ? '完全防禦' : '減傷'+Math.round((1-def)*100)+'%');
  const shots = n => (w.hits>1 ? w.hits+'發×'+n+'傷害' : '單發'+n+'傷害');
  const orange = w.noPerfectBand ? '無減傷效果'
    : (w.perfectDmgPerHit!=null ? shots(w.perfectDmgPerHit)
      : (w.perfectDamageScale ? shots(Math.round(w.dmgPerHit*w.perfectDamageScale)) : '完全防禦'));
  const crit = (w.critRate!=null ? w.critRate : GAME_CONFIG.tuning.counterCritRate);
  const rows=[['分類', w.cat||'—'], ['黃圈', yellow], ['橘圈', orange],
              ['反擊', shots(w.dmgPerHit)], ['暴擊率', Math.round(crit*100)+'%']];
  if(w.maxMod) rows.push(['最大改裝等級', String(w.maxMod)]);   // 卡上就寫「5」，不加單位
  return rows;
}
/* 卡片上那一段（與 -376 之前手寫的 `desc` 同樣的排版，只是現在是算出來的）。 */
export function weaponDescText(key, story){
  const w=weaponOf(key, story); if(!w) return '';
  const rows=weaponStatRows(key, story).filter(r=>r[0]!=='分類');
  return '反擊效果\n' + rows.map(r=>r[0]+'：'+r[1]).join('\n') + (w.flavor ? '\n'+w.flavor : '');
}

export function asset(key){ return (key && ASSETS[key] != null) ? ASSETS[key] : ""; }

/* ══ 逐支音檔的增益（ver -441）══════════════════════════════════════════
   ⚠⚠ **一支音檔只有一個響度**，所以查表的鑰匙是**檔名**（去副檔名、去 `?v=`、
     轉小寫），不是呼叫端手上的那個名字。傳 ASSETS 鍵或直接傳路徑都行 ——
     兩者都會被解析成同一個檔名（鐵律 7：一個量一個計算點）。
   ⚠ 未列入 ＝ 1（＝還沒量過）。加音檔請跑 `tools/audio_scan.html` 補一列。 */
export function fileGain(keyOrPath){
  const raw = (keyOrPath && ASSETS[keyOrPath] != null) ? ASSETS[keyOrPath] : keyOrPath;
  const name = String(raw||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').toLowerCase();
  const m = GAME_CONFIG.tuning.fileGain || {};
  return m[name] != null ? m[name] : 1;
}
/* 這兩支是**同一件事的兩個舊名字**，留著讓呼叫端讀起來仍然是「這是音效／這是音樂」。
   ⚠ 不要再往裡面加第二張表 —— 分層的差別在 `tuning.loudness.layer`（匯流那一節）。 */
export const bgmVol  = fileGain;
export const sfxGain = fileGain;

/* 這個 ASSETS 鍵是不是**語音**（走 voiceChain）。⚠ 歸屬與增益是兩件事，
   見 tuning.voiceKeys 的說明。 */
export function isVoiceKey(key){
  return (GAME_CONFIG.tuning.voiceKeys||[]).indexOf(key) >= 0;
}

/* ---- 遙測後端（零維運，Supabase REST）----
 * 玩家行為統計（來訪/挑戰/用時/配裝/原作點擊），上報端 telemetry.js、後台頁 stats.html
 * 都讀這一組設定。兩值未填時全部靜默停用（不發任何請求）。
 * 設定步驟：Supabase 建免費專案 → SQL Editor 跑 stats.html 頁尾註解的建表 SQL →
 * 把 Project URL 與 anon public key 填進來即生效（公開匿名寫入/讀取，不做防作弊）。 */
export const TELEMETRY = {
  url: 'https://yirmivtawwyhkftnaxbb.supabase.co',
  anonKey: 'sb_publishable_WRTo91T8Y4RIBULuIPWrRw_dXrVdQGb',   // 公開金鑰（publishable，本來就設計為前端可見）
};

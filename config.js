/* 立繪取景值（每張圖的 top/bot/fx）**只有一份**，就在 script/speakers.js 的 ART。
   教學的說明立繪與劇情的立繪是同一批圖，量出來的當然是同一組數字 ——
   ⚠ 不要在這裡再抄一份。這個專案被「同一組數字寫在兩個地方」咬過好幾次
     （speakers.js 與 flight 的 PORTRAIT 至今仍是「改一邊要改兩邊」，
      那是因為兩邊隔著資料夾邊界不好共用，不是因為抄一份比較好）。
   ⚠ speakers.js 不 import 任何東西，所以這條相依不會成環。 */
import { ART } from './script/speakers.js';
import { ENEMIES } from './script/enemies.js';   // 敵人卡抽成獨立檔（ver -794）

/* ══ 受擊特效 → 視覺＋音效（ver -800，Ray：「音效直接跟 hitFx 綁定，改 hitFx 就自動
   連到音效；特殊怪 fx 直接寫 centipi_bite 之類的專屬 type」）══
   敵人卡的 `hitFx:{ ult/delay/wrong:{ type:'…' } }` 只寫 type，這張表把 type 翻成：
     · `base` ＝視覺（enemy.showHitFx 的 switch 吃它：claw/blood/bite/bullet/slash/blunt）
     · `se`   ＝受擊音（combat 播它）
   —— 所以卡上**不再需要 `sound` 欄位**（鐵律 7：一個 type 一個音，不用兩處各寫）。
   ⚠ 通用 type（claw/slash/…）＝通用音；**特殊怪**自己的簽名音用**專屬 type 名**
     （serpent_bite＝羽蛇吼叫、centipi_claw＝蜈蚣叫聲、pirate_*＝空賊船三種艦砲…），
     視覺沿用某個 base，音效獨立——別人用不到，改一格連 fx 帶音一起換掉。 */
/* ══⚠⚠⚠ **受擊特效：一個名字就是一整個樣子**（ver -951，Ray：「受擊特效只要有
   slash, bite 這些單名指定就好，已經全默認 random 了根本不用再列 angle」）══
   敵人卡上那四格（延時／按錯／攻擊／大絕）現在只寫**一個名字**，
   `count`／`pos`／`scale`／`flash`／`angle` 全部住在這張表裡。
   ⚠ 為什麼搬過來：那些參數是「**這種特效**長什麼樣」，不是「這隻怪的性質」——
     散在六十張卡上，同一個 `claw` 就出現了 1/3/4 三種爪數，看卡看不出差別在哪（鐵律 1）。
   ⚠ 所以爪數不同的就**各給一個名字**（`claw1`／`claw`／`claw4`）：名字要能在
     Excel 的下拉選單裡讀得懂，那是 Ray 挑特效的唯一介面。
   ⚠ `angle` 一律 random，表上不再出現（`showHitFx` 的預設）。 */
export const HITFX = {
  // ── 通用 ──
  claw1:  { base:'claw',   se:'em_slash', count:1 },   // 一道爪痕
  claw:   { base:'claw',   se:'em_slash', count:3 },   // 三爪（預設）
  claw4:  { base:'claw',   se:'em_slash', count:4 },   // 四爪（重擊）
  slash:  { base:'slash',  se:'em_slash'  },
  bite:   { base:'bite',   se:'em_slash'  },
  blood:  { base:'blood',  se:'em_smack'  },
  blunt:  { base:'blunt',  se:'em_smack'  },
  /* 櫻花狂亂（ver -899，鹿主）：⚠⚠ **刻意沒有 `se`** —— 它的聲音是「跟花瓣一起播
     兩秒再淡出」的**演出**，長度只有 `enemy.spawnSakura` 知道（走 `SFX.playCue`
     的把手）。寫在這裡會被 combat 當一次性受擊音直接放到底，變成兩份聲音（鐵律 7）。 */
  sakura: { base:'sakura' },
  bullet:     { base:'bullet', se:'em_shot', count:1, pos:'random' },              // 彈孔
  bullet_big: { base:'bullet', se:'em_shot', count:1, pos:'random', scale:1.8 },  // 大彈孔
  dagger: { base:'slash',  se:'em_dagger' },   // 匕首（貝琳妲語彙）：slash 視覺＋匕首音
  // ── 特殊怪的簽名（視覺沿用 base、音效專屬）──
  serpent_bite:      { base:'bite',   se:'se_enemy_serpent' },   // 羽蛇：牙印＋吼叫
  centipi_claw:      { base:'claw',   se:'se_enemy_centipi' },   // 蜈蚣：爪痕＋叫聲
  witch_revolver:    { base:'bullet', se:'em_revolver',      count:1, pos:'random', scale:1.6 },  // 魔女大絕：彈痕＋左輪
  pirate_cannon:     { base:'bullet', se:'se_weapon_cannon', count:1, pos:'random', scale:2.4, flash:'red' },  // 空賊船大絕：艦砲＋畫面閃紅
  pirate_shipcannon: { base:'bullet', se:'se_ship_cannon',   count:1, pos:'random' },  // 空賊船延時：艦砲（另一支）
  pirate_sniper:     { base:'bullet', se:'se_sniper_falcon', count:1, pos:'random' },  // 空賊船按錯：狙擊
};

/* ============================================================================
 *  config.js — 遊戲內容資料層（唯一資料來源）
 *  ---------------------------------------------------------------------------
 *  自 reference/index.html 抽出的 GAME_CONFIG 與 ASSETS，逐字搬遷、行為等價。
 *  鐵律：所有內容數值集中在此，程式碼一律讀 config，不得寫死內容數值。
 *  ASSETS 路徑已指向專案內現有的 resources/ 目錄。
 * ========================================================================== */

/* 版本號：顯示於診斷 HUD（首頁連點團徽 5 下開啟），每次部署遞增尾碼——
 *  用來確認手機（尤其 iOS 主畫面 App 的頑固快取）實際跑到的是哪一版。
 *  ⚠⚠ **尾碼要跟 commit 訊息的 `ver -NNN` 一致，改程式就順手改這裡**
 *    （ver -626 修：-568 到 -625 這 57 版都沒動過它，Ray 看 HUD 一直是 568，
 *     以為是快取卡住 —— 版本號不動就等於沒有版本號）。
 *  ⚠ 它同時是**暖開機戳記的鑰匙**（main.js 的 `WARM_BOOT`）：版本一變，
 *    上一版的戳記就失效 → 下一次開機重跑完整讀取。那正是改版後該有的行為。 */
export const VERSION = 'ver 2026.09.12-1127';

export const GAME_CONFIG = {

  /* ------------------------------------------------------------------ *
   *  一、武器（特武）— Counter 反擊時使用
   *  counterWin  = 反擊判定窗口大小（越大越好按，越小風險越高回報越大，範圍 0~1）
   *  hits        = 反擊打幾發
   *  dmgPerHit   = 每發傷害（反擊總傷＝hits×dmgPerHit；重機槍 48 為基準）
   *  vfx         = 傷害數字視覺：'burst'＝同區塊同時跳多個數字（散彈）、
   *                'single'＝單發較大紅字（狙擊）、留 null＝預設逐發跳
   *  ⚠⚠ ver -706：三帶的行為改由卡上的 `bands` 表決定（見 weaponBand）。
   *     以下 defenseDamageScale／noPerfectBand／perfectDmgPerHit 的說明是**歷史**，
   *     六張卡都已改寫，程式端也沒有人再讀它們。
   *  defenseDamageScale = Defense（格擋）段受傷倍率（相對大絕 ASSAULT_DAMAGE）：
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
         ⚠ ver -706 起三帶一律寫 `bands`（見檔尾的 `weaponBand`），下面兩行是歷史。
         黃圈 → `defenseDamageScale`（1＝無減傷、0.5＝減傷 50%、0.25＝減傷 75%）
         橘圈 → `noPerfectBand:true`＝沒有完防帶；否則免傷，或 `perfectDmgPerHit`＝改打傷害
         紅圈 → `hits` × `dmgPerHit`
         爆擊率 → `critRate`（沒寫才回去用 tuning.counterCritRate）
         最大改裝等級 → `maxMod`（ver -714 起真的在用：每階 +20% 反擊傷害，
                                    加成率在 `tuning.weaponMod.perLv`）
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
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     image:'weapon_mg_squall',     sound:'se_mg_squall',
                     bands:{ block:{ counter:true, hit:0.30 }, perfect:{ counter:true, hit:0.70 } },
                     flavor:'攻守均衡的可靠選擇',
                     /* 本篇用的數值（ver -378，Ray 的「初始重機槍」卡）：紅圈 8發×3、爆擊 10%。 */
                     story:{ hits:8, dmgPerHit:3, critRate:0.10 } },
    // 雙管霰彈槍「鐵拳」（ver -706 改）：**三帶都反擊、都免傷**，傷害遞增 ——
    //   黃圈每發打 1、橘圈半額、紅圈全額。它是保命槍：完全不會挨打，代價是傷害低。
    Shotgun_Blast: { name:'雙管霰彈槍「鐵拳」', shortName:'鐵拳', cat:'霰彈槍',
                     owned:true, critRate:0.20, maxMod:5, value:3000,
                     counterWin:0.20, hits:6, dmgPerHit:4,  vfx:'burst',  image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     bands:{ block:{ counter:true, dmgRoll:[0,1] }, perfect:{ counter:true, dmgScale:0.5 } },
                     flavor:'保命的穩健之選',
                     /* 本篇用的數值（ver -378，Ray 的「初始霰彈槍」卡）：黃圈 減傷50%、紅圈 6發×3。
                        ⚠ 黃圈由 75% **降**到 50%（試玩版那把仍是 75%）。 */
                     story:{ hits:6, dmgPerHit:3 } },
    // 85 式步槍「嗜心者」：反擊總傷 72（1.5 倍）、單發大紅字、無 Perfect 帶；
    //   ver -706：黃圈挨 1/2、橘圈挨 1/4、紅圈才反擊 —— 三把裡唯一「點了還是會挨打」的，
    //   但**越接近完美挨得越少**（賭上一切，回報全在反擊窗）。
    Sniper_Falcon: { name:'85式萊福槍「嗜心者」', shortName:'嗜心者', cat:'萊福槍',
                     owned:true, critRate:0.20, maxMod:5, value:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     /* ══⚠⚠⚠ **ver -975（Ray）：黃橘圈也反擊，但攻擊力 −50%** ══
                        > 「萊福槍改成黃橘圈也反擊，但 nerf 50% 攻擊力」
                        ⚠ **`take` 照舊留著**：Ray 只說「也反擊」，沒說免傷 ——
                          「三把裡唯一點了還是會挨打，但越接近完美挨得越少」
                          （ver -706）仍是這把槍的性格，現在只是多了還手。
                        ⚠ 起因：安雅的「赤足／蹄鐵星」抬的是**攻擊力**，而萊福槍的
                          黃橘圈卡上沒有 `counter` ＝根本不開火，那兩顆星對狙擊手
                          等於沒有效果（ver -974 我回報的第三個連帶後果）。 */
                     bands:{ block:{ counter:true, take:0.5,  dmgScale:0.5 },
                             perfect:{ counter:true, take:0.25, dmgScale:0.5 } }, counterSec:-3,
                     flavor:'賭上一切的單發重擊',
                     /* 本篇用的數值（ver -378，Ray 的「初始萊福槍」卡）：紅圈 1發56。
                        ══⚠⚠⚠ `counterCdSec` ＝ **拉栓時間：這把槍幾秒才能再開一發**
                        （ver -1009，Ray：「萊福槍還是太強，見面開夢魘 4.6 秒就送鹿主歸西」
                        →「改成步槍不能連射，CD 3 秒」→ ver -1010「還是太強，鹿主被打成狗，
                        把步槍 CD 改成 5 秒」）══
                        病因不是**單發威力**是**頻率**：安雅的霸王條款把每一顆黃圈都變成
                        保證命中、而且攻擊力走紅圈的滿額狙擊，四秒內連開六七發。
                        · 冷卻是**逐把槍**算的，所以「先開一槍 → 切槍 → 再換回來」是
                          刻意留下的操作空間（Ray：「高手可以先開一槍，切槍，再換回來開步槍」）——
                          用切換順位換輸出，那正是副武器編成存在的意義。
                        · 三帶一律吃（紅圈也不能連射）：栓動就是栓動。⚠ 但**紅圈的免傷照給**
                          （`bands.counter.take` 恆為 0）—— 完美反擊仍然值得點。
                        ⚠ **只寫在 `story`**：試玩版「挑戰」是另一套數值（§6.5.3），
                          那邊一個字都不動。 */
                     story:{ hits:1, dmgPerHit:56, counterCdSec:5,
                             /* ⚠ `flavor` 也在 `story` 覆寫（ver -1010，Ray：「文案要改，
                                不然使用者要從 UI 才能學到步槍有 CD」）—— **不寫數字**
                                （那是 `weaponStatRows` 從 `counterCdSec` 算出來的那一列，
                                鐵律 7），這一句只負責把「它不能連射」講成人話。
                                試玩版沒有這個冷卻，所以覆寫在 story，base 那句不動。 */
                             flavor:'賭上一切的單發重擊；拉栓費時，開完一發要等' } },

    /* ── 槍店的貨（ver -377，Ray 的武器卡）──────────────────────────
       ⚠ 這三把**沒有自己的立繪與音效**：先借同類那一把的（`image`/`sound`）。
         素材到位就只改這兩欄。 */
    Shotgun_Dragon:{ name:'短板霰彈槍「龍息」', shortName:'龍息', cat:'霰彈槍',
                     critRate:0.20, maxMod:5, price:3000,
                     counterWin:0.20, hits:6, dmgPerHit:6,  vfx:'burst',  image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     bands:{ block:{ counter:true, dmgRoll:[0,1] }, perfect:{ counter:true, dmgScale:0.5 } },
                     flavor:'短管、近身、火力壓制' },
    /* ⚠ 「絞肉機 改」的爆擊率是 **10%**（比原版 20% 低）—— 卡上就是這麼寫的。
       數值面它與原版只差這一項，其餘完全相同。要調就跟 Ray 確認，不要自己改順。 */
    MG_Squall_Kai: { name:'B1901陣地機槍「絞肉機 改」', shortName:'絞肉機改', cat:'重機槍',
                     critRate:0.10, maxMod:5, price:4000,
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     image:'weapon_mg_squall',     sound:'se_mg_squall',
                     bands:{ block:{ counter:true, hit:0.30 }, perfect:{ counter:true, hit:0.70 } },
                     flavor:'原廠改良型' },
    Rifle_Shahin:  { name:'Shahin栓動萊福槍「遊隼」', shortName:'遊隼', cat:'萊福槍',
                     critRate:0.20, maxMod:5, price:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     // ver -975：同「嗜心者」（黃橘圈也反擊、攻擊力 −50%），見那張卡的說明。
                     bands:{ block:{ counter:true, take:0.5,  dmgScale:0.5 },
                             perfect:{ counter:true, take:0.25, dmgScale:0.5 } }, counterSec:-3,
                     flavor:'栓動、遠距、一擊定生死',
                     /* 拉栓時間同「嗜心者」（ver -1009；-1010 由 3 改 5）—— 說明見那一張卡。
                        ⚠ `flavor` 也在 `story` 覆寫：試玩版沒有這個冷卻，那邊照舊那一句。 */
                     story:{ counterCdSec:5,
                             flavor:'栓動、遠距、一擊定生死；每一發都要重新拉栓' } },
    // 新武器：複製一段，鑰匙用「類型_武器名」（同圖檔基底名），image 指對應 ASSETS 鑰匙。
  },
  /* ══⚠⚠ 戰鬥曲的預設（ver -658，Ray：「所有打靶遊戲都用這個音樂」）══════════
     卡上寫了 `bgm` 就用卡上那一首；沒寫就照這張表。
     `timeAttack` ＝**打靶場**（計時挑戰）—— 寫成**規則**不是逐張卡填：
     日後多一座城的靶場自動吃到，不必記得補一行（鐵律 1＋8）。
     ⚠ 決定只有 `main.js` 的 `battleBgmOf` 一支（門的 cue 與交棒兩處都問它）。 */
  /* `shipHarm`（ver -741，Ray：「船戰禍魘默認這一首 PerituneMaterial_EpicBattle_loop」）：
     卡上沒寫 `bgm`、而且是**船戰**（卡上有 `weaponSound`＝艦載武器音，那正是
     船戰的記號）、敵人卡 `kind:'harm'` → 用這一首。判定只有 main.battleBgmOf 一處。 */
  battleBgm: { default:'bgm_battle', timeAttack:'bgm_hopstep', shipHarm:'bgm_epicbattle',
               /* ver -837（Ray：「索拉娜為夥伴時戰鬥音樂換成 Peritune_Whirlwind」）——
                  這一場的搭檔（卡上的 partner，否則整備頁選的人）在這張表裡就換曲；
                  卡上明寫的 bgm 仍最優先（main.battleBgmOf，鐵律 7）。 */
               /* ver -873（Ray 指定，混亂 session 遺失件補回）：安雅＝BattleField4。 */
               partner:{ sorana:'bgm_whirlwind', anya:'bgm_battlefield4' } },

  /* ══⚠⚠ 主武器：迦尼米德雙槍（ver -699，Ray 交卡）══════════════════════════
     Ray：「裝備欄加入雙槍　迦尼米德α「王之運」／迦尼米德β「運之王」。
           兩支算同一個武器，但是各有一個掛件槽，可以掛強化護符」
           「固定武器不可更換，但可以在槍店強化」

     ⚠⚠ **它不進 `weapons`**：那張表是**副武器**（可買可賣可換、有反擊數值
       `counterWin`/`hits`/`dmgPerHit`）。主武器是主角的**普攻**，數值住在
       `tuning`（`dmgBase`/`dmgPerCombo`），而且**不可更換** —— 混進那張表會
       立刻長出「賣掉主槍」「把主槍排進副武器順位」這種不該存在的操作。
     ⚠ 「兩支算同一個武器」：一張卡、一組數值，**只有掛件是逐支的**。
       所以 `barrels` 兩筆只帶名字與掛件槽，不帶任何戰鬥數值。
     ⚠ 強化走槍店（Ray 指定）：目前只有打靶獎品那一項（`tuning.gunTune`），
       改裝分頁的內容等 Ray 的卡 —— 不要先做一個半套的出來（同 loot.js 那一頁）。 */
  mainGun: {
    name:'迦尼米德', image:'weapon_ganymede_ab', fixed:true,
    /* Ray 指定的字面（ver -700）：不寫「固定・不可更換」，寫**固有武裝**。 */
    tag:'固有武裝',
    barrels:[
      { id:'alpha', name:'迦尼米德α「王之運」' },
      { id:'beta',  name:'迦尼米德β「運之王」' },
    ],
    /* 掛件槽收哪一類道具（鐵律 1：不在程式裡寫死類別字串）。 */
    charmCat:'charm',
  },

  /* ══⚠⚠ 主武器的九階強化（ver -707，Ray 交卡）══════════════════════════════
     > 「升級機制：**非線性**。等級編號僅為排列順序，不代表升級先後。升級看素材是否
     >   足夠，玩家自由選擇要升哪一項；部分關鍵素材由劇情控制產出。」
     > 「命名：水瓶座九顆星。強化武器＝逐顆點亮蕾娜的星座；武力巔峰（爆擊）以主角
     >   雙槍 Ganymede 命名。」

     ⚠⚠ **這一版取代 -700/-701 的線性 Lv1~9**：等級不再是一個數字，而是**九顆各自
       獨立的星**（`progress.gunStars` 存 id→已升幾次）。舊存檔的等級會遷移成
       「吞噬者」的次數 —— 那時的效果就是 +5% 普攻，語意完全對得上。
     ⚠⚠ **括號內的數值是內部參數，不顯示給玩家**（Ray 指定）：UI 只印星名、
       名稱與效果那一句。所以數值欄位與 `desc` 是分開的兩件事，不要把數字寫進 desc。
     ⚠ 效果的**累計**只有一個查詢點：`progress.bonus('<欄位名>')`（鐵律 7）——
       各模組一律問它，不要自己去翻 `gunStars`。
     ⚠ `repeat:true` ＝可多次升級（目前只有「吞噬者」，每次 +5% 普攻）。 */
  /* ⚠ ver -737（Ray）：王之運／運之王**拿掉「/ Ganymede α・β」字尾**（那兩個
     西文名是槍管的，已經印在主武器卡上）；疾走→疾行星、方舟→方舟星、
     交界點→界星、源泉→泉之星；**吞噬者移到最下面**（順序＝改裝頁的排列，
     效果查詢全走 id，搬動不影響任何計算）。 */
  gunStars: [
    { id:'sadalmelik', star:'Sadalmelik', name:'王之運',
      desc:'增加爆擊傷害',                 critDmg:0.20 },
    { id:'sadalsuud',  star:'Sadalsuud',  name:'運之王',
      desc:'增加爆擊機率',                 critRate:0.10 },
    { id:'skat',       star:'Skat',       name:'疾行星',
      desc:'加速破防值累積',               energyMul:0.10 },
    { id:'sadaltager', star:'Sadaltager', name:'銀幣星',
      desc:'增加戰鬥金錢掉落數額',         moneyMul:0.20 },
    { id:'safina',     star:'Safina',     name:'方舟星',
      desc:'無傷使敵 HP 歸零，可回復已使用的被動技' },   // ⚠ 無數值參數（Ray 註明）
    { id:'sadachbia',  star:'Sadachbia',  name:'幸運星',
      desc:'增加戰鬥掉落物機率',           lootMul:0.10 },
    { id:'ancha',      star:'Ancha',      name:'界星',
      desc:'增加反擊後的普攻增益持續時間', buffSec:3 },
    { id:'situla',     star:'Situla',     name:'泉之星',
      desc:'聖徒化期間連續普攻 3 Combo，可微量增加聖徒化時間',
      saintCombo:3, saintSec:1 },
    /* ⚠⚠ 吞噬者的第 1 級是**北方泊地槍匠**開的（打靶 30 秒內，腳本
       `gunStar:'albali'`）—— `storyFirst` ＝ 還沒點亮之前**素材升級不開放**
       （Ray ver -737：「北泊槍匠開啟至 LV.1 以後才走素材升級，每一次升級
       +5% 普攻」）。判定只在 `loot.modReady` 一處（鐵律 8）；鎖著時
       改裝頁印 `lockText` 不印素材。 */
    { id:'albali',     star:'Albali',     name:'吞噬者',
      desc:'增加普攻攻擊力（可多次升級）', dmgMul:0.05, repeat:true,
      storyFirst:true, lockText:'尚未開啟——聽說北方泊地的槍匠有辦法' },
  ],
  /* ══ 每一顆星要交什麼（ver -707；-701 的按等級配方已改成按星）══════════════
     鑰匙＝星的 id。⚠⚠⚠ **下面的素材與價格仍是我擬的草案**，等 Ray 的卡覆蓋 ——
     他給的是九顆星的**效果**，沒給配方。排法照原本的三階：靠前的收低階素材、
     靠後的收高階，「吞噬者」可多次所以每次同價。
     ⚠ 「部分關鍵素材由劇情控制產出」（Ray）—— 那幾樣等劇情給了再填進來。 */
  gunUpgrade: {
    recipes: {
      sadalmelik:{ money:200,  items:{ scrap_iron:4,     brass_casing:4 } },
      sadalsuud: { money:400,  items:{ scrap_iron:6,     brass_casing:6,   chitin_shell:3 } },
      skat:      { money:700,  items:{ chitin_shell:6,   venom_claw:4 } },
      sadaltager:{ money:1000, items:{ venom_claw:6,     azure_scale:5 } },
      safina:    { money:1400, items:{ azure_scale:8,    azure_feather:6 } },
      albali:    { money:600,  items:{ scrap_iron:5,     brass_casing:5,   chitin_shell:2 } },
      sadachbia: { money:2000, items:{ azure_feather:8,  chitin_wing:5,    saint_claw_low:3 } },
      ancha:     { money:2800, items:{ chitin_wing:8,    venom_fang:6,     saint_claw_low:5 } },
      situla:    { money:4000, items:{ venom_fang:10,    saint_claw_low:8 } },
    },
  },

  defaultWeapon: 'MG_Squall',   // 開局預設武器（填上面的鑰匙名）
  /* 副武器類別 → 切換鈕的徽章（ver -549，Ray 交圖：連射=Switch_MG、
     散射=Switch_Split、高爆=Switch_Hyper）。值＝ASSETS 鑰匙，weapon.js 的
     renderSwitch 直接 asset() 取圖（-481 的手繪 SVG 圖示已退場）。
     加新類別補一行（鐵律 1）。 */
  weaponCatIcons: { '重機槍':'switch_mg', '霰彈槍':'switch_split', '萊福槍':'switch_hyper' },
  /* 副武器類別 → 紅點的**觸碰範圍**規則（ver -552，Ray 指定）：
       visual      觸碰＝視覺圈當下大小（高爆：有效觸點與實際圈一致）
       orangeOnRed 平時同視覺；**只剩紅圈時**觸碰擴到橘圈的最大範圍（連射）
       yellowMax   不論圈縮到多小，觸碰永遠是黃圈最大範圍（散射）
     實作只有 defense.js 的 hitDia() 一處（鐵律 8）。 */
  weaponCatHitZone: { '重機槍':'orangeOnRed', '霰彈槍':'yellowMax', '萊福槍':'visual' },

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
      /* ⚠⚠ **蕾妮的技能名不跟著諾薇兒改**（ver -985）：ver -984 把「即死防禦／生命歸還」
         換成「獄門天鎖／魂之歸所」，那是**諾薇兒的**名字。這兩個字原本住在 i18n
         （兩人共用），改那裡等於連試玩版的蕾妮一起改名（憲法：試玩版不要動）。
         現在名字一律**讀卡**，所以這裡要把她自己的名字與英文明寫出來。 */
      passive:{
        key:'deathGuard',
        name:'即死防禦',
        en:'Death Guard',
        oncePerBattle:true,      // true=整場只擋一次；false=每次都擋（不建議）
        cutin:'cutin_guard',     // 即死防禦專屬大圖（→ Renee_CI_pas.jpg）；程式讀此欄，不硬寫
        voice:'vo_death_guard',  // cut-in 對應 SE（→ Renee_VC_Pas.wav）
        /* ⚠ ver -888（Ray：「death guard 改成每一場（每個怪）都會 reload 一次」）：
           `oncePerBattle` 的語意由「一局一次」收窄成「**一場（怪）一次**」——
           解鎖點是 partner.onEnemySet（換敵那一刻，鐵律 9）。（ver -893 用詞） */
        desc:'受到足以致死的攻擊時，為玩家保留1hp續命。每換一隻敵人可再觸發一次。',
      },
      // ── 主動技：生命歸還 ─────────────────────────────
      //   聖徒化中，由「下往上滑」發動：強制中止聖徒化，保留當前血量（第四結局）。
      active:{
        key:'lifeReturn',
        name:'生命歸還',
        en:'Life Return',
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
      /* 升級語音（ver -1022，Ray：「升級要播 se 跟 vo，後補」）——
         可寫陣列＝輪播（走 `SFX.pickRot`）；null ＝不出聲。 */
      /* ══ 「這一局沒招了」的臉（ver -1047，Ray：「三人如果處於熔斷、無飛刀狀態
         分別用的圖是 Anya_SI_Desperate／Sorana_SI_panic／Nouvelle_SI_Desperate」）══
         破防計量表中央的頭像，在**變身的槽已經用掉**時換成這一張（`ART` 的差分鍵）。
         ⚠ 三種變身共用同一個槽（`state.saintUsedThisBattle`，§0.5「局」）——
           聖徒化／夢魘化／共鬥發動即鎖，所以「用掉了」對三個人是同一件事。
         ⚠ 沒寫＝一直用基本立繪（蕾妮／馬季諾就是這樣）。 */
      faceSpent:'desperate',
      levelUpVoice:'vo_nouvelle_lvup',
      name:'諾薇兒',
      image:'partner_nouvelle',
      /* 整備頁伙伴卡的「變身」欄（ver -841，Ray：「伙伴卡也要記載聖徒化 夢魘化
         共鬥的效果」）—— 純顯示文案（gear.js 讀），機制本體在 saint.js。 */
      /* ══⚠⚠⚠ **ver -984：說明整組換掉**（Ray 交稿：「技能說明太囉唆了，改成這樣」）══
         格式固定兩段：**發動方式**一行，然後一段白話。
         ⚠⚠ **這是技能的初始值，點星之後不改**（Ray：「後面點星以後不需更改，
           頁面放最基本的說明即可」）—— 所以這幾段字**不要**跟著九星去補條件，
           星的效果各自寫在 `girls.levels` 的 `desc` 上（技能表視窗才看得到）。
         ⚠ 換行用 `<br>`：整備頁是 innerHTML 塞進去的（`gear.js` 的 `.gs-perk`）。 */
      install:{ name:'聖徒化', en:'SAINT INSTALL',
        desc:'發動方式：戰鬥畫面右滑<br>'
            +'強行灌注聖徒之力的爆發模式。期間 HP 快速回復至全滿後結束聖徒化。'
            +'HP 越低，持續時間越長。受敵攻擊僅會縮短時間，不會受到傷害，連擊疊傷無上限。' },
      /* 取景：她的立繪是全身直幅（1024×1536），蕾妮那張是膝上構圖 ——
         同樣的框要放到「頭大小相當」，得往下推並放大。⚠ 這是估的，Ray 換圖時要重量。 */
      siFit:{ zoom:1.6, top:0.01 },
      cutin:'cutin_saint',
      voice:null,
      /* 選人確認的語音（ver -743，Ray：「諾薇兒播主動技語音」＝生命歸還）。 */
      selectVoice:'vo_nou_return',
      perk:'即死防禦（被動）＋生命歸還（主動）',
      /* ⚠⚠ ver -740（Ray）：即死防禦加**十秒免傷**、期間普攻每次回血 2%
         （「免傷仍算受擊，只是不扣血」—— 實作見 combat.enemyAttack 的扣血行）。
         `immuneSeconds`／`immuneHealPct` 是**這張卡**的：蕾妮的即死防禦沒寫
         ＝沒有這扇窗（挑戰那一套不動，ver -694）。 */
      /* ⚠⚠⚠ **ver -971：`oncePerBattle` 回到原義＝一局一次**（Ray：「兩條都收」）。
         ver -888~-970 是「每換一隻怪 reload」（＝一場一次），那條現在是
         Lv7「蟹生星」的獎勵（`guardPerEnemy`）—— 守門在 `partner.onEnemySet`。
         ⚠ **試玩版不動**：蕾妮／馬季諾不在 `girls.who` 裡，那道守門不咬他們，
           他們照舊每場 reload（同「本篇與試玩版是兩套數值」，§6.5.3）。 */
      /* ⚠⚠ **ver -984：名字改成「獄門天鎖」**（Ray 交稿）。`key` 仍是 `deathGuard`
         —— 那是機制的識別碼，改它會牽動一整串判定（`pas.key==='deathGuard'`）。
         ⚠ 它在**戰鬥中**印出來的字走 i18n（`L.cutins.deathGuard`／`L.battle.deathGuard`），
           不是這裡的 `name` —— 兩邊都改了才不會一邊「獄門天鎖」一邊「即死防禦」。
           英文副標維持 `Death Guard`（[EN-STYLE] 不譯；Ray 沒給新的英文名）。 */
      passive:{ key:'deathGuard', name:'獄門天鎖', en:'Hellgate Seal', oncePerBattle:true,
                /* 她自己的 CI（ver -499，Ray 交件 CI_Nouvelle_Deathguard）——
                   之前借蕾妮的 `cutin_guard`；蕾妮那張是試玩版的，不動。 */
                cutin:'cutin_nouvelle_guard', voice:'vo_nou_guard',   // ver -711：她自己的語音（原本借蕾妮的）
                /* ══⚠⚠⚠ **ver -986：基礎不再回血**（Ray 選 (C)：「那些其實不該在
                   基礎技能裡，要移到星上」）══ `immuneHealPct` 由 0.02 **移到
                   Lv4「堅殼星」**（那顆星原本寫「提升為 5%」，現在是「獲得 5%」——
                   Ray 交卡時的原話就是「即死防禦發動後 10 秒吸血 Buff」＝**給**不是**升**）。
                   ⚠ 欄位留著寫 0 不刪：它是「這張卡的免傷窗回不回血」那個旋鈕，
                     蕾妮的卡沒寫＝沒有這扇窗（試玩版不動）。
                   ⚠ 讀值走 `partner.guardHealPct`：那一支現在是 **卡上的值 ＋ 星**。 */
                immuneSeconds:10, immuneHealPct:0,
                desc:'發動方式：戰鬥中受到致死攻擊時保留 1 HP，並獲得 10 秒免傷。' },
      /* ⚠⚠⚠ **ver -964（Ray 改定）：不再回滿，改成「保留現血量 ＋ 10 秒吸血」**
           > 「主動技中止聖徒化，**保留現血量**並發動 10 秒吸血 buff，
           >   **一發回復玩家最大血量 5%**」
         ⚠ 所以 -740 那條「發動一律回滿」**已推翻**（留著當紀錄）：現在中止那一刻
           倒數槽推到哪裡就剩多少，回血全部靠自己打回來 —— 打得準才活得下去。
         ⚠ `lifestealSeconds`／`lifestealPct` 是**這張卡**的（鐵律 1）；
           窗口在 cut-in 撤下才起算，實作見 `partner.js` 的 `vampUntil`。
         ⚠ **實際射出去的每一發都回血**（ver -965，Ray：「放寬吧，強化諾的奶媽感」）
           —— 普攻／雙槍破防／overkill 追打都算，實作只有 `combat.shotHeal()` 一支。
           ⚠ 聖徒化／惡夢化期間走不到（那兩條血條是槽，回血＝推向 OBE／延長惡夢化）。
         ⚠ ver -740（已推翻）：發動一律回滿（不再看當前血量）。
         ⚠⚠ **`context` 是 `'saint'`，不要再改**（ver -889，Ray：「只有聖徒化期間
           才能發動是正確的，放回去」）—— -888 誤讀「不囉唆」把這道門拆成 `'any'`，
           當天就被推翻。Ray 那句指的是**回滿**那一半，不是發動條件。
           ⚠ 這已經是第二次被推翻（-740 同日也撤過一次「隨時可發＋免傷」）。 */
      /* ══⚠⚠ **ver -971（Ray 的九星卡抬頭）：同一扇窗多一件事 —— 連擊延續** ══
           > 「主動技：中止聖徒化，保留現血量，發動後 10 秒吸血 buff，
           >   **並連續聖徒化 combo 增益 10 秒**，一發回最大血量 5%」
         `comboKeepSeconds` ＝那扇窗開著時，普攻（與 overkill 追打）照樣吃
         **聖徒化的連擊疊傷**（`tuning.saintComboStep`）—— 中止之後火力不會斷崖。
         ⚠⚠ **它與 `lifestealSeconds` 是同一扇窗**（`partner.js` 的 `vampUntil`，
           鐵律 7）：Ray 的卡上兩者永遠同一個數字，兩個計時器必然走鐘。
           所以引路星（Lv5）的 `lifeReturnSec:5` 一次把兩者都推到 15 秒。
         ⚠ **雙槍破防（BR）不吃**：那一支本來就不吃暴擊與 atkBuff（降攻安全牌）。 */
      /* ⚠⚠ **ver -984：名字改成「魂之歸所」**（Ray 交稿）。`key` 仍是 `lifeReturn`。
         ⚠ 這個 `name` **戰鬥中也會印**（`partner.js` 的 cut-in 標題與浮字都讀它），
           所以改這裡就等於改了畫面上那一行；浮字另有一份在 i18n（`L.battle.lifeReturn`），
           兩邊都改了。 */
      /* ⚠⚠ **CI 是她自己那一張**（ver -1035，Ray：「魂之歸所的 ci 錯了，應該是
         CI_Nouvelle_Lifereturn」）—— 卡上原本寫 `cutin_return`＝**蕾妮**那張
         （試玩版的圖）。聖徒化期間發動那一條看不出來，因為 saint 的結局 cut-in
         另外做了 `storyMode()` 分流；但 ver -1014 起這一招**一般盤面也發得動**，
         那一條走的是 partner 的 `act.cutin` ＝ 卡上這一格，於是本篇演出裡
         出現了蕾妮（同 -454「本篇的搭檔是諾薇兒，演出裡出現蕾妮是錯的人」）。
         ⚠ 蕾妮自己那張卡（`partners.renee`）不動 —— 試玩版照舊。 */
      active:{ key:'lifeReturn', name:'魂之歸所', en:'Soul Return', context:'any',
               cutin:'cutin_return_nouvelle', voice:'vo_nou_return',   // ver -711：她自己的語音
               /* ══⚠⚠⚠ **ver -986：基礎不再吸血**（Ray 選 (C)）══ 吸血整組移到
                  Lv5「引路星」（`lifeReturnPct` ＋ `lifeReturnSec`）—— 那顆星 Ray 交卡時
                  寫的就是「發動後 15 秒吸血 buff…一發回最大血量 5%」＝**給**不是**升**。
                  ⚠⚠ **連擊延續留在基礎**（Ray：「主動技延續聖徒化連擊增傷 10 秒，
                    這個是要加在文案的」）—— 所以那扇窗**基礎就要開 10 秒**，
                    只是期間不回血。窗長改由 `max(吸血秒, 連擊秒) ＋ 星` 算
                    （見 `partner.js` 的 lifeReturn handler）。 */
               /* ══⚠⚠⚠ **ver -988（Ray 定稿）：基礎只剩「中止 ＋ 保留 HP」** ══
                  · 吸血 -986 移到星，**-988 起連星上也沒有**（定稿把「一發回最大體力 5%」
                    整句拿掉了）—— 回血現在**只存在於獄門天鎖那扇窗**（Lv4 堅殼星）。
                  · 連擊延續 -986 還在基礎，**-988 移到 Lv5「引路星」**。
                  ⚠ 兩個秒數都歸 0 ＝**基礎不開那扇窗**；引路星的 `lifeReturnSec:15`
                    是**絕對值**，窗長＝`max(卡上兩個秒數) ＋ 星`。 */
               lifestealSeconds:0, lifestealPct:0,            // ver -986/-988：那一扇（秒數制）窗不吸血
               comboKeepSeconds:0,                            // ver -988：連擊延續曾在引路星（-1014 起無人給）
               /* ══⚠⚠⚠ **ver -1014（Ray 交卡）：一般時間也發得動，而且會回血** ══
                  > 「一般時間發動：至本盤清盤為止，每次射擊回復最大體力 5%。
                  >   聖徒化期間發動，強制中止爆發時間，保留已回復之 HP。」
                  · `context:'any'` ＝兩個手勢入口都吃（main.js 的兩層上滑早就分開了，
                    `tryActive('board')` / `tryActive('saint')`），**聖徒化那半一個字沒動**。
                  · `boardHealPct` ＝一般時間那扇窗每一發回多少（＝文案上的 5%）。
                  ⚠⚠ 這**不是**把 -889 那條推翻回去：-888 想做的是「隨時可發＝隨時中止
                    聖徒化」，被 Ray 撤回過兩次。這一版是**兩個情境兩種效果**。
                  ⚠ 窗以**盤**為單位不算秒（Ray：「清盤就結束」）——份量因此由盤面大小
                    決定（9 格最多 45%、16 格 80%），而玩家可以自己挑「開盤時發動」，
                    那是技術表現不是讀秒。實作見 `partner.vampBoardPct`。 */
               boardHealPct:0.05,
               desc:'發動方式：戰鬥畫面上滑。<br>'
                   +'一般時間發動：至本盤清盤為止，每次射擊回復最大體力 5%。<br>'
                   +'聖徒化期間發動：強制中止爆發時間，保留已回復之 HP。' },
      /* ══ 點錯的兩層聲音（ver -1015，Ray 交檔）══
         · `missVoice` ＝**只要點錯就出**的失誤語音（三支輪播，走 `SFX.pickRot`）。
         · `missBlockSe` ＝那一下**被擋下來**時**同時**再疊一聲：
           「無敵期間點錯」與「容錯吃掉」兩種都算（Ray 指定）。
         ⚠ 兩者是**同時**不是二選一：語音是她的反應，SE 是「這一下沒落在你身上」。
         ⚠ 沒填就安靜 —— 別的搭檔（蕾妮／馬季諾）卡上沒有這兩格，行為一個字不變。 */
      missVoice:['vo_nouvellemiss1','vo_nouvellemiss2','vo_nouvellemiss3'],
      missBlockSe:'se_windblock',
      /* ══ 無傷擊殺一場 → reload 聖徒化（ver -892 定為兩場，**ver -903 Ray 改成一場**：
         「諾薇兒改無傷一場就恢復聖徒化」）══
         ⚠ 「無傷」是**逐場（逐隻怪）**算的（`state.enemyHitsTaken`，同九星「方舟」
           的定義，ver -708）—— 以整局算的話，同一局中途挨過一次就永遠回不來。
           （ver -893 用詞：局＝結算、場＝一隻怪）
         ⚠ 與九星「方舟」仍是兩件事（雖然條件現在一樣是「一場無傷」）：
           那顆星回復的是**已用掉的被動**，這一條回復的是**聖徒化的槽**
           （`saintUsedThisBattle`）。兩者可以同時發生。
         ⚠ `flawless` 這個欄位留著寫 1 不刪 —— 它是「連續幾場」這個**規則的旋鈕**，
           -892 是 2、-903 是 1，日後要調只動這個數字（鐵律 1）。
         ⚠ 專屬 CI 已交件（ver -894，Ray：「reload CI 為 CI_Nouvelle_saintreload」）
           —— -893 借被動那張的過渡期結束。
         ⚠ 插入的時機是**那一隻無傷打完最後一格那一刻**（Ray）—— 走
           `combat.finishEnemyOrAdvance` 那個匯流點（自然清盤／按錯／逾時／聖徒化
           擊殺四條路都經過它），也就是 partner.onEnemyCleared。
         實作只有那一支（鐵律 8）。 */
      /* ⚠⚠⚠ **ver -971：這一條改成 Lv3「探覓星」的獎勵**（Ray：「兩條都收」）——
         `needStar` ＝要有那顆星才生效（`progress.girlHas` 那個唯一查詢點）。
         -903~-970 它是預設就有的，現在 Lv1~2 沒有。⚠ 欄位寫在**卡上**不寫死在
         `partner.js`（鐵律 1）：日後別的搭檔要有自己的回填條件，加一格就好。 */
      installReload:{ flawless:1, name:'聖徒再臨', en:'SAINT RELOAD',
                      needStar:'saintReload',         // ver -971：諾薇兒 Lv3（探覓星）
                      cutin:'cutin_saintreload',      // ver -894：專屬 CI（原本借被動那張）
                      voice:'vo_nou_saintreload' },
    },
    /* ══ 安雅（ver -671，Ray：「從玩家跟安雅一起出旅店後，夥伴就從諾薇兒
       換成安雅了」）══
       ⚠⚠ **她沒有即死防禦**（ver -672，Ray：「諾薇兒現在不是夥伴，所以不會有
         即死防禦」）—— `passive`／`active` 都不寫。那不是漏寫：即死防禦是
         **諾薇兒**的技，換人就沒有了。
       ⚠ 她的能力是**惡夢化**（`saint.activateNightmare`），走的是它自己那一套
         （右滑發動、上滑自爆），不經過搭檔的被動／主動系統。
       ⚠ `siFit` 是估的（同諾薇兒那一張的作法）—— 換成她自己的選人立繪時要重量。 */
    anya: {
      /* 升級語音（ver -1022，Ray：「升級要播 se 跟 vo，後補」）——
         可寫陣列＝輪播（走 `SFX.pickRot`）；null ＝不出聲。 */
      /* ══ 「這一局沒招了」的臉（ver -1047，Ray：「三人如果處於熔斷、無飛刀狀態
         分別用的圖是 Anya_SI_Desperate／Sorana_SI_panic／Nouvelle_SI_Desperate」）══
         破防計量表中央的頭像，在**變身的槽已經用掉**時換成這一張（`ART` 的差分鍵）。
         ⚠ 三種變身共用同一個槽（`state.saintUsedThisBattle`，§0.5「局」）——
           聖徒化／夢魘化／共鬥發動即鎖，所以「用掉了」對三個人是同一件事。
         ⚠ 沒寫＝一直用基本立繪（蕾妮／馬季諾就是這樣）。 */
      faceSpent:'desperate',
      levelUpVoice:'vo_anya_lvup',
      install:{ name:'夢魘化', en:'NIGHTMARE INSTALL',
        /* ⚠ ver -967：「體力灌滿後」→「由**當下的體力**」（不再灌滿）。
           ⚠ ver -974：**滿血 13 秒**（長度由血量決定，不再是一律 15 秒）、
             期間反擊命中 100%、清空 16 格＝**回到發動時的體力**（不是全回復）。 */
        /* ⚠⚠ **ver -994：文案由 Ray 定稿**，排版比照諾薇兒（「發動方式」一行 ＋ 一段白話）。
           ⚠ 定稿**不再提「每場一次」「命中 100%」「清空 16 格＝MB」** —— 三件事機制照舊
             （Ray 確認「命中 100% 兩邊都保留」），只是不寫進這一段。 */
        desc:'發動方式：戰鬥畫面右滑<br>'
            +'強行灌注惡夢之力的爆發模式。期間 HP 快速削減至 1 後結束夢魘化。'
            +'HP 越高，持續時間越長。受敵攻擊僅會縮短時間，不會受到傷害，連擊疊傷無上限。' },
      name:'安雅',
      image:'partner_anya',
      siFit:{ zoom:1.6, top:0.01 },
      cutin:'ci_anya_ni',
      voice:null,
      /* 選人確認的語音（ver -743，Ray：「安雅播被動技語音」＝明晰之夢）。 */
      selectVoice:'vo_anya_lucid',   // 選人確認音（ver -837：明晰之夢語音收成單支）
      perk:'明晰之夢（被動）＋惡夢化・夢境粉碎（劇情）',
      /* ══ 被動：明晰之夢（Lucid Dream；中文名 ver -682 由 Ray 定）══
         ⚠⚠ **觸發條件 ver -693 改了**（Ray：「娜塔莉戰如果先觸發 lucid dream 再進入
           NI 劇情會卡住，或者同時，所以我決定改 luciddream 的發動條件為觸發單怪
           觸發第一次反擊成功時發動，不算場，每隻怪都可以觸發一次，
           觸發期間 5 秒普攻 2 倍」）：
             舊（-681）：HP ≤30% 發動 —— 與惡夢化**搶同一個時刻**（NI 的倒數槽本來就
               會把血抽到 1），兩段演出疊在一起就卡住。
             新（-693）：**每隻怪第一次反擊成功**時發動。連戰換敵重新上膛。
             ⚠⚠ **現行（ver -886，Ray：「把安雅的被動技改成無限制發動」）：
               每一次完美反擊都發動，沒有次數上限**（-693 的「每隻怪一次」已撤）。
               唯一還擋著的是「這一段還在跑就不重播」—— 見 partner.armFirstCounter
               上面那一段的理由（發動期間任何反擊都算完美反擊，不擋會自我續命）。
         ⚠ 效果不變（5 秒普攻加倍），與 `lowHpBuff` **共用同一個執行體**
           （`partner.fireBuff`，鐵律 8）—— 換的是條件不是效果。 */
      passive:{
        key:'firstCounter',
        /* ⚠ cut-in 上印的就是這個字（`partner` 讀 `passive.name`）—— 只有這一處。 */
        name:'明晰之夢',
        en:'Lucid Dream',
        /* ⚠⚠⚠ **ver -974（Ray 改定）：10 秒，而且只有「命中 100%」** ══
           > 「被動技：是完美反擊後 10 秒間普攻加倍。**反擊命中 100%**。
           >   改成這樣，點星以後才升攻」
           ⚠ 推翻 ver -740「發動期間任何反擊都算完美反擊，傷害跟評價都是」：
             現在**判定分色**（免傷／完美反擊計數／折秒／硬直照玩家真的點到的那一帶），
             **攻擊力**要點星才升（赤足星→橘圈、蹄鐵星→紅圈），
             命中則是霸王條款壓成 100%。
           ⚠ 秒數也吃星（`lucidSec`）：10 ＋ 赤足星的 5 ＝ 15。 */
        /* ⚠⚠ **ver -994：基礎回到 5 秒**（Ray 定稿）—— -974 是 10 秒。
           現在的階梯是 **5 →（赤足星）10 →（蹄鐵星）15**，兩顆星各 +5。 */
        buffSeconds:5,
        cutin:'ci_anya_lucid',
        /* ══ 連續三次完美反擊 → reload 惡夢化（ver -887，Ray）══
           那一發的 CI 與浮字換成「夢魘再臨 / Nightmare Returns」（只換字，圖沿用）。
           實作只有 partner.onCounter 一支（鐵律 8）；解槽走 saint.resetInstallSlot。 */
        reloadStreak:3,
        /* ⚠⚠⚠ **ver -974：這一條改成 Lv3「烙印星」的獎勵**（Ray：「收」，同諾薇兒
           探覓星的作法）—— -887~-973 它是預設就有的，現在 Lv1~2 沒有。
           ⚠ 條件寫在**卡上**不寫死在 `partner.js`（鐵律 1，同 `installReload.needStar`）。 */
        reloadNeedStar:'niReload',
        reloadName:'夢魘再臨',
        /* 專屬 CI 與語音（ver -894，Ray 交件）—— 那一發不再借明晰之夢那張圖。 */
        reloadCutin:'cutin_nireload',
        reloadVoice:'vo_anya_nireload',
        /* ⚠ 英文用 **NIGHTMARE RELOAD**（ver -891，Ray：「用顯眼的字寫
           NIGHTMARE RELOAD…要讓人一看就知道夢魘可以再用了」）——
           -887 的 `Nightmare Returns` 只講「它回來了」，講不出「你可以再發一次」。
           全大寫是刻意的：CI 上那一行要一眼看到。 */
        reloadEn:'NIGHTMARE RELOAD',
        /* ver -759：四支輪播（Ray 指定）—— 陣列＝發動一次換下一支（fireBuff）。 */
        voice:'vo_anya_lucid',   // ver -837：Ray 交新單支，取代 -759 的 ×4 輪播（沒編號＝不輪播）
        /* ver -740（Ray）：發動期間追加「反擊不論哪一圈都算完美反擊（傷害與評價）」
           與「指引每一個應點格」—— 實作見 defense.resolveThreat 與 combat.markNext。 */
        desc:'發動方式：觸發完美反擊即發動。<br>'
            +'5 秒內普攻傷害加倍、反擊命中率為 100%。',
      },
      /* ══⚠⚠⚠ **夢境破碎：純顯示的一格**（ver -994，Ray 的定稿給了它自己一段）══
         她的這一招**不走搭檔主動技那套系統** —— 它是夢魘化期間的上滑，由
         `saint.nightmareActive` 直接處理（同「夢境粉碎」的既有實作）。
         ⚠⚠ 所以 `context` 寫 **'none'**：`partner.tryActive` 的第一道守門是
           「情境要對得上」，寫 none 就永遠不會被它接走（就算被接走也沒有
           對應的 handler，這是第二道保險）。
         ⚠ 加這一格**只為了整備頁印得出來**：九星有三顆（Lv2／Lv5／Lv8）在強化它，
           玩家卻在卡上找不到那一招的說明。
         ⚠ 名字與英文照定稿；`key` 不與任何 handler 同名。 */
      active:{ key:'dreamBreakInfo', name:'夢境破碎', en:'Dream Breaker', context:'none',
               desc:'發動方式：夢魘化期間戰鬥畫面上滑。<br>'
                   +'夢魘化期間發動，強制中止爆發時間，保留已削減之 HP，'
                   +'並一次性給予敵最大 HP 最高 25% 的傷害，視夢魘化期間清除格數而定。' },
    },
    /* ══ 索菈娜（ver -803，Ray 交稿）══ 夏爾村村內戰一進場就強配（見 config.battles
       的 sv_* 的 `partner:'sorana'`，combat.startGame 讀它覆寫）。
       ⚠ 她的變身是**共鬥**（`saint.activateCoop`，右滑發動、發動邏輯等同聖徒化）——
         走它自己那一套（無敵窗＋自動完美反擊），不經搭檔的被動／主動系統，
         同安雅的惡夢化。所以 `cutin` 是共鬥的變身圖。
       ⚠ 被動名「獵手的直覺」是**我填的佔位**（Ray 只給了效果與 CI_Sorana_cheer）。 */
    sorana: {
      /* 升級語音（ver -1022，Ray：「升級要播 se 跟 vo，後補」）——
         可寫陣列＝輪播（走 `SFX.pickRot`）；null ＝不出聲。 */
      /* ══ 「這一局沒招了」的臉（ver -1047，Ray：「三人如果處於熔斷、無飛刀狀態
         分別用的圖是 Anya_SI_Desperate／Sorana_SI_panic／Nouvelle_SI_Desperate」）══
         破防計量表中央的頭像，在**變身的槽已經用掉**時換成這一張（`ART` 的差分鍵）。
         ⚠ 三種變身共用同一個槽（`state.saintUsedThisBattle`，§0.5「局」）——
           聖徒化／夢魘化／共鬥發動即鎖，所以「用掉了」對三個人是同一件事。
         ⚠ 沒寫＝一直用基本立繪（蕾妮／馬季諾就是這樣）。 */
      faceSpent:'panic',
      levelUpVoice:'vo_sorana_lvup',
      name:'索菈娜',
      image:'partner_sorana',
      selectVoice:'vo_sorana_pack',   // 選人確認音（ver -839，Ray 指定）
      /* ⚠ 英文 ver -894 由 `PREDATOR'S PACK` 改成 **`PREDATOR'S FANGS`**（Ray 指定）。
         中文「獵手的共鬥」不變。 */
      /* ⚠⚠ **ver -993：文案由 Ray 定稿**（同諾薇兒 -984/-988 的作法：頁面只放最基本的
         說明，細節交給九星那九列）。⚠ 定稿**不再提「每場一次」「無敵」與「滿值 12 秒」**
         —— 那三件事機制照舊在（`saintUsedThisBattle` 的槽、`partner` 的免傷窗、
         `coop.baseSec`），只是不寫進這一段（同諾薇兒的 MB／每場一次）。 */
      install:{ name:'獵手的共鬥', en:"PREDATOR'S FANGS",
        /* ⚠ ver -996：排版比照諾薇兒（「發動方式」一行 ＋ 一段白話）。
           ⚠ 手勢那一句統一寫「**戰鬥畫面右滑**」—— 三位是同一個手勢，
             -993 這裡寫「敵人框右滑」是三段裡唯一的異寫。 */
        desc:'發動方式：戰鬥畫面右滑<br>'
            +'消耗全部破防值發動共鬥，期間索菈娜會自動反擊敵人攻擊。'
            +'玩家射擊失誤會加速消耗。' },
      siFit:{ zoom:1.6, top:0.01 },   // 估（同諾薇兒/安雅）；Ray 交專用選人立繪再重量
      cutin:'ci_sorana_predator',     // 共鬥的變身 cut-in
      voice:null,
      /* ══⚠⚠ **她搭檔時副武器命中率減半，步槍除外**（ver -962，Ray 指定）══
         `counterHit:{ mul, except:[類別…] }` —— 乘在**副武器反擊的命中率**上。
         ⚠ 這是她的**代價**：共鬥期間無敵、又有飛刀，所以近距離的那兩把要付出代價；
           `萊福槍`（步槍）是遠距的那一把，不受影響（Ray 指定的唯一例外）。
         ⚠ 寫在**搭檔卡**上不寫死在程式（鐵律 1，同 `timeKBonus`）：日後別的搭檔
           要有自己的命中修正，加一格就好。
         ⚠ 類別名照 `weapons[].cat`（重機槍／霰彈槍／萊福槍）—— 不要另立一套代號。
         ⚠ 計算點只有 `weapon.weaponCounter` 的 `hitR` 一處（鐵律 7）。
         ══⚠⚠⚠ **ver -970 追加：玩家自點的黃圈／橘圈再 ×0.7**（Ray：「另外加入
           索拉娜為隊友時，玩家自點黃橘圈命中率降 30%」＋理由：「因為她不是後方
           輔助是**共鬥者**，重武器為了要避免 TK 命中率會變低」）══
         · `bandMul:{ 帶:倍率 }` —— **乘在那一帶之上**（與 `mul` 相乘，不是取代）。
           所以現在：黃／橘 ＝ 0.5×0.7 ＝ **0.35**、紅 ＝ 0.5。
         · **為什麼只砍黃橘不砍紅**：紅圈是抓準了那一瞬間才開的火（精準），
           黃橘是提早亂噴 —— 她就在你前面，噴得越亂越可能打到她。
         · ⚠ **同一條 `except` 也適用**（`萊福槍` 不受影響）：TK 是**重武器**的問題，
           Ray 那句理由講的就是重武器 —— 遠距單發的那一把沒有這個問題。
           ⚠⚠ **ver -971 Ray 確認沿用**（「索是共鬥者，不是後方術師，而且定位玩法是
             破防 loop，設定上防止重武器 TK 本來就會降命中」）—— 這一段不再是待決事項。
           ⚠ 但**它對現有六把槍一發都不差**：萊福槍的黃橘圈本來就不反擊
             （卡上 `block:{take:0.5}`／`perfect:{take:0.25}` 沒有 `counter:true`，
             `defense.resolveThreat` 只在 `counter:true` 那兩支才叫 `weaponCounter`）
             —— `except` 在 `bandMul` 這一格是空的，留著只為了語意一致：
             日後真的給萊福槍開黃橘反擊時，規則不會突然變樣。
             `except` 現在唯一真的在擋的是 `mul`（紅圈 ×0.5）。
         · ⚠ **只咬「玩家自點」那條路**：共鬥的飛刀（`weapon.coopCounter`）根本沒有
           命中判定，天生不受影響 —— 不必另外寫守門。
         · ⚠ 帶名照 `weaponBand` 的三個鑰匙（`block`／`perfect`／`counter`），
           不要另立代號。 */
      /* ⚠⚠ **這條代價刻意不寫進技能文案**（ver -995，Ray：「目前只活在程式裡，
         劇情或評價時再提就好」）—— 整備頁那三段是「這一招怎麼用」，
         「帶她出場要付什麼代價」由劇情或蕾娜的結算評價講。
         ⚠ 所以看到 `install`／`passive`／`active` 的 desc 沒提它**不是漏寫**，
           不要好心補進去。 */
      counterHit:{ mul:0.5, except:['萊福槍'], bandMul:{ block:0.7, perfect:0.7 } },
      /* ══ 難度加成（ver -805 立；**-935 由 Ray 調高**）══ 共鬥的無敵讓她好打，
         評價就要更嚴 —— `inspector.evaluate` 把它加在全域 `timeK` 上（鐵律 1）。
         ⚠⚠ Ray -935：「索拉娜搭檔**評價係數給到 650**」—— 那是**加完之後的值**：
           全域 `rating.timeK` 400 ＋ 這裡的 250 ＝ **650**。
           所以改全域 timeK 的時候**這個數字要跟著回推**，不然她那邊就不是 650 了
           （這一格存的是差值不是絕對值 —— 它是「比別人嚴多少」）。
         ⚠ -805 原本是 +100（＝當時的 500）。 */
      timeKBonus:250,
      perk:'獵手的共鬥（共鬥/無敵）＋獵手的智慧（上滑 Bullets Rain）＋獵手的戰吼（被動）',
      /* ══ 共鬥（Predator's Pack）的參數（saint.activateCoop 讀，鐵律 1）══
         無敵秒數 ＝ baseSec × (破防值/100)（下夾 minSec），發動消耗全部破防值、
         每場一次；點錯縮短 wrongShortenSec 秒；敵攻擊自動完美反擊（counterScale 倍）。
         ⚠ baseSec=12＝滿破防的無敵秒數（Ray：「無敵12秒」＋「破防越高越長」）。 */
      /* 語音（ver -818，Ray）：`voice` 陣列＝發動時輪播（同安雅明晰之夢的輪播）；
         `endVoice`＝共鬥時間結束那一刻播。 */
      /* ⚠⚠ **ver -976（Ray 的射手座卡）：「玩家受擊會扣一秒（**失誤或延時**）」** ——
         1.5 → **1**，而且**延時懲罰也算**（-803~-975 只有點錯會縮短）。
         兩條路都走 `saint.coopShorten`（鐵律 8）：點錯在 `combat.tap`、
         延時在 `combat.enemyAttack` 的 coopMode 分支。
         ⚠ `baseSec` 是**上限**（實際秒數 ＝ baseSec × 破防值/100）；
           Lv8「射手星」把它抬到 15。 */
      /* ══⚠⚠⚠ `energyBackMul` ＝ **共鬥期間普攻回充破防值的比例**（ver -1006，Ray：
           「普攻加太多，索拉娜飛刀也會加，兩個加上去整個自給自足，永動機」）══
         -1005 起破防計量表就是共鬥的碼表，所以「加破防值」＝「加時間」——
         照平時的速率回充的話，點盤面每秒賺到的時間比抽掉的還多，共鬥就永遠不會結束。
         現行 **0.5＝減半**（Ray 指定：「把普攻增加的量減半」）。
         ⚠ 它只在 Lv9「獵手星」開了閘門之後才有意義（之前是一點都不加）。
         ⚠ **飛刀不吃這一格，是根本不加**（見 weapon.coopCounter）：那是共鬥自己打的，
           回充自己就是自給自足，折多少都還是永動機。 */
      /* 點錯的失誤語音（ver -1015，Ray 交檔）：三支輪播，只要點錯就出。
         ⚠ 她**沒有** `missBlockSe`：那一聲（`se_windblock`）是諾薇兒那張卡的東西
           （Ray 只指定她）——共鬥期間的無敵是另一回事，不要順手一起給。 */
      missVoice:['vo_sorana_miss1','vo_sorana_miss2','vo_sorana_miss3','vo_sorana_miss4'],
      coop:{ baseSec:12, minSec:3, wrongShortenSec:1, counterScale:1, energyBackMul:0.5,
             voice:['vo_sorana_pack','vo_sorana_pack2'],
             /* 共鬥結束＝飛刀耗盡（obe，ver -822）。ver -837：語音兩支輪播（Ray：「有編1、2的都是輪播」）。 */
             endVoice:['vo_sorana_obe1','vo_sorana_obe2'], endCutin:'ci_sorana_obe', endName:'飛刀耗盡' },
      /* 主動技：**照搬馬季諾的前線補給**（Ray 指定）＝ supplyRefill（立即進入雙槍破防、
         不吃破防值）。上滑手勢（bindBoardActiveSwipe → tryActive('board')）發動，
         只換她自己的名字與 CI。 */
      /* ⚠ `reloadName`／`reloadEn`／`reloadVoice` ＝ Lv7「聚落星」那一發的臉與聲音
         （ver -976 由被動的 streak2 搬過來 —— 那一段已被 Ray 的新卡取代）。
         CI 沿用被動那三張輪播（`passive.cutin`）：同一個人吼的同一件事。 */
      active:{ key:'supplyRefill', name:'獵手的智慧', en:"Predator's Wisdom", context:'board',
               oncePerBattle:true, cutin:'ci_sorana_supply', voice:['vo_sorana_supply1','vo_sorana_supply2'],   // ver -837 輪播
               reloadName:'共鬥再開', reloadEn:'FANGS RELOAD', reloadVoice:'vo_sorana_roar',
               // ⚠ 定稿用「彈雨傾洩」（＝那扇窗的正式名字，i18n 的 cutins.dualBreak，ver -750）。
               /* ⚠ 「共鬥期間以外」＝Ray 的卡上那一句（`context:'board'`：一般盤面才發得動，
                  共鬥期間不算）—— 排版比照諾薇兒的主動技那一段。 */
               desc:'發動方式：共鬥期間以外，戰鬥畫面上滑。<br>'
                   +'無視破防值，立即進入彈雨傾洩。' },
      /* 被動：連續三輪完美清盤 → 10 秒破防值累積速度加倍，可重覆發動。
         實作＝ combat.clearBoard 累加 `svPerfectStreak`，滿 `streak` 由 partner.fireEnergyBuff
         開一段 `energyBoostUntil`（addEnergy 讀它 ×`energyMul`）。 */
      /* CI 三張隨機輪播（ver -809，Ray 指定）——發動時 partner.onBoardCleared 隨機挑一張。 */
      /* 被動＝獵手的戰吼（ver -822 定名；**ver -837 改成兩段式**，Ray：「連三場會發動
         獵手戰吼，播 vo_sorana_roar2；連五場會再發動一次並重置獵手的共鬥，播 vo_sorana_roar」）：
         · 連 `streak`(3) 盤完美清盤 → 發動（10 秒破防加速），語音 `voice`（roar2）
         · 連 `streak2`(5) 盤 → **再發動一次＋重置共鬥**（saintUsedThisBattle 歸零，
           可再右滑共鬥），語音 `voice2`（roar），連擊計數歸零重頭數。
         ⚠ 3 那一發**不歸零**計數 —— 歸零的話 5 永遠到不了。CI 三張照舊隨機輪播。 */
      /* ⚠ 連 `streak2`(5) 那一發的 CI 字另外給（ver -894，Ray：「索拉娜觸發第五次
         完美清盤時 CI 文字為『共鬥再開』FANGS RELOAD」）—— 那一發的重點不是
         「她又吼了」，是**共鬥可以再發一次**，所以字要換（同安雅的夢魘再臨）。
         連 3 那一發照舊印「獵手的戰吼」。 */
      /* ══⚠⚠⚠ **ver -976（Ray 的射手座卡）：改回單段** ══
         > 「被動技：獵手的戰吼，**連 5 盤**完美清盤增加 10 秒的破防值累積量 200%」
         ⚠⚠ **推翻 ver -837／-894 的兩段式**（連 3 發動／連 5 再發動＋重置共鬥）：
           · 門檻 3 → **5**（Lv5「箭頭星」減 2 ＝ 回到 3）
           · reload **主動技** 移到 Lv2「海宣星」（戰吼發動時）
           · reload **共鬥**   移到 Lv7「聚落星」（主動技發動時）
           所以 `streak2`／`voice2` 整組拿掉，「共鬥再開」的字與語音搬到 `active`。
         ⚠ `voice` 改成**兩支輪播**（Ray：「被動語音改輪播」「兩個輪播」）——
           走既有的 `SFX.pickRot`（同 `active.voice` 那一組的作法）。 */
      passive:{ key:'perfectStreak', name:'獵手的戰吼', en:"Predator's Roar",
                streak:5, buffSeconds:10, energyMul:2,
                voice:['vo_sorana_roar2','vo_sorana_roar'],
                cutin:['ci_sorana_roar_renna','ci_sorana_roar_anya','ci_sorana_roar_nouvelle'],
                /* ⚠ 「同戰役內可跨戰鬥累計」＝既有行為（ver -891/-892：連段跨場不歸零、
                   換局才歸零；`sessionSave` 帶著 `svStreak` 過場）—— 定稿把它寫出來了。 */
                desc:'發動方式：連續五輪完美清盤即發動。<br>'
                    +'10 秒內破防值累積速度加倍。同戰役內可跨戰鬥累計。' },
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
  /* ⚠⚠ **蕾妮與馬季諾只存在於「挑戰」（試玩版），正篇不會有他們**（ver -694，Ray 指定）。
     所以他們卡上的數值與觸發條件是**另一套**，不必跟著本篇的調整走 ——
     例如馬季諾的高裝藥彈照舊是血量觸發，而安雅的明晰之夢 ver -693 改成反擊觸發
     （§6.5.2 那一段）。**動其中一邊之前先確認那一張卡是誰在用。** */
  defaultPartner: 'renee',   // 搭檔只有 renee（蕾妮）/ malzeno（馬季諾）；freya＝監察官（inspectors）
  /* ⚠⚠ **「挑戰」的選人畫面只列這幾位**（ver -694，Ray：「挑戰的伙伴只留馬跟蕾妮
     可選」）—— `partners` 現在也裝著**本篇**的搭檔（諾薇兒、安雅），
     而那兩位是劇情給的，不該出現在出陣的選人卡疊上。
     ⚠ 用**白名單**不是黑名單：日後加一位本篇搭檔，預設不會漏進挑戰（同首頁那條
       白名單的理由，§6.9）。
     ⚠ 讀取只有 `weapon.PARTNER_KEYS` 一處（鐵律 7）。 */
  challengePartners: ['renee', 'malzeno'],
  /* 本篇（story）的搭檔（ver -510）：劇情/城鎮/船戰一進場就切過去 ——
     以前只有開過整備頁才切，出航直接進的船戰帶著試玩版的蕾妮/露娜，
     即死防禦與聖徒化 cut-in 都是舊圖（Ray 連報兩張圖錯）。
     讀取點：combat.startGame（scriptRun）與 gear（清單第一位），都指這裡（鐵律 7）。 */
  storyPartner: 'nouvelle',
  /* ══⚠⚠ **本篇的搭檔會換人**（ver -671，Ray：「從玩家跟安雅一起出旅店後，
     夥伴就從諾薇兒換成安雅了」）══
     由上往下取**第一個 `need` 成立的**（同 `acts`／`innDoors` 的取法）；
     都不成立就回 `storyPartner`。
     ⚠ 判定只有 `partner.storyPartnerKey()` 一支（鐵律 8）：`combat.startGame`
       與整備頁都問它，不要各自讀這張表。
     ⚠ 這是**資料**不是狀態：換人的那個事件記的是 `np_anya_join` 那支旗
       （離開旅店那一段演完才記）—— 一個狀態一個擁有事件（鐵律 9）。 */
  storyPartnerBy: [
    /* ══ 夏爾村村內戰：強配索菈娜（ver -804，Ray：「村莊戰索拉娜是強制搭配出擊的，
       在前一段劇情就先設置，出戰之前」）══ 那一夜（`sv_night_done`）演完就切成她 ——
       ⚠ 這是**在出戰之前**設好的：整備頁／任何進戰前的畫面都已經是索菈娜（比戰鬥卡
         上的 `partner` 覆寫更早、更正，所以那條已拿掉，單一真相＝這裡）。
       ⚠ **排在安雅之前**：stage5 時 `np_anya_join` 早已立（stage4 入隊），
         storyPartnerKey 取**第一個 need 成立的** —— 要索菈娜贏就得排前面。
       ⚠⚠ **ver -970：圍城打完就自由選**（Ray：「過了夏爾村圍城夜之後就自由選」）——
         -804 那句「村戰後索菈娜仍是搭檔，等 Ray 的轉場旗」的旗來了，就是既有的
         `safehouse_shinier`（圍城收尾格 `sv_clear_wild` 演完＝打贏才插，
         見 script/town.js）。
         · **`not`（ver -970 新增的欄位）**＝這支旗立了這一條就不算。所以
           `sv_night_done` 那一條只在**圍城期間**成立（強配索菈娜）；圍城一結束
           它退場，三個人一起留在池子裡 → 整備頁的頁籤可以自由切（ver -741 的機制）。
         · ⚠ 「自由選」是**池子**的事，不是「誰排第一」的事：`storyPartnerKey()` 先看
           玩家在整備頁挑過誰（`load.partner()`，還在池子裡才算），沒挑過才取 `pool[0]`。
         · ⚠⚠ 圍城結束**之後**索菈娜是靠**最後那一條**留在池子裡的 —— 所以要**兩條**：
           一條帶 `not` 管「圍城期間強配」、一條不帶 `not` 管「之後仍可選」。
           少了後者她會整個從池子裡消失。 */
    /* 圍城期間：強配索菈娜（排在安雅前面才贏得了）。 */
    { need:'sv_night_done', not:'safehouse_shinier', key:'sorana' },
    { need:'np_anya_join', key:'anya' },
    /* 圍城打完：她照樣留在池子裡（自由選）。 */
    { need:'sv_night_done', key:'sorana' },
  ],

  /* ══════════════════════════════════════════════════════════════════════ *
   *  三之〇、女主的九級（ver -970，Ray 交辦）
   * ----------------------------------------------------------------------
   *  > Ray：「現在要把女主們加入等級系統。像嘉尼米德那樣分九級，但是**純吃 exp**，
   *  >   所以現在重新把 exp 放回去，升級陡度你先拿捏，遊戲內時間是兩個月，
   *  >   要三個女主都有機會滿級的陡度。」
   *  > 「你先放 lv1~lv9，**星名跟對應技能我會分角色給你**。」
   *
   *  ⚠⚠ **與迦尼米德九星是兩套，刻意不共用**（鐵律 7 的反面：它們不是同一個量）：
   *    · 九星（`gunStars`）＝**非線性**，玩家挑要升哪一顆，吃**素材**，`{id:次數}`
   *    · 女主九級（這裡）  ＝**線性** Lv1→Lv9，純吃 **EXP**，一位一個累計數字
   *    共用的只有「九格」這個形狀與 `bonus` 那種「唯一查詢點」的作法。
   *
   *  ⚠⚠⚠ **EXP 發給誰：單局出場數最多的那一位**（Ray 定案）——
   *    「exp 給單局最多出場數的那一個，平手的話給好感度高的那一個，
   *      還是平手的話均分」。判定只有 `inspector.settleExpShares()` 一支（鐵律 7/8），
   *    出場帳沿用 ver -921 的 `state.partnerFights`（`enemy.setEnemy` 記，一局一份）
   *    —— **不另開一份帳**：好感與 EXP 問的是同一件事「這一局誰打得多」。
   *    ⚠ 它與好感的分配規則**不一樣**，所以是兩支 resolver：好感那邊索菈娜自己一桶
   *      （低評價高好感，不與人爭），EXP 沒有那種事，就是比場數。
   * ────────────────────────────────────────────────────────────────────── */
  girls: {
    /* 吃這套的是**三位戰鬥搭檔**。⚠ 蕾娜不在裡面：她是監察官不是搭檔，沒有戰鬥技能
       （她走 `rating.affection.renna` 那一欄）。⚠ 蕾妮／馬季諾是**試玩版**的，
       本篇不會有他們（§6.5「挑戰的伙伴只留馬跟蕾妮」的反面）。
       ⚠ 名字不抄一份 —— 一律讀 `partners[key].name`（鐵律 7）。 */
    who: ['nouvelle', 'anya', 'sorana'],

    /* ══⚠⚠ **升級陡度**（Ray：「你先拿捏」）══ 累計 EXP 門檻，索引＝等級−1。
       Lv1 是出廠（0），所以只有八段要爬。

         Lv   1     2     3     4     5     6      7      8      9
         累計  0   600  1500  2800  4600  7000  10200  14400  20000
         這一級  —   600   900  1300  1800  2400   3200   4200   5600   （比例 ≈1.33）

       **怎麼拿捏出來的**（數字都可以直接調，形狀不必動）：
       · 一局拿多少 ＝ `rating.exp` 那個式子：`137 + 分數×8.7 + 微擾 + overkill×3`
         → D 約 140~440、C 約 445、B 約 575、A 約 705、S 約 835~1010。
         **平均一局 600 上下**（連戰是整局併帳算一次，不是逐隻；boss ×2）。
       · ver -1027 起 **Lv9 ＝ 50000 ≈ 專養一位 70 局**（boss 局約 1400，
         全走 boss 約 36 局）。
       · 三個人輪流養 ⇒ 全部滿級需要 **約 200 局** —— 那是「主線做完之後」的量級，
         現在（主線約 1/5）刻意到不了，正是 Ray 要的「不要升太快」。
         遊戲內兩個月、而且野怪 session 可以重複刷，100 局達得到
         —— 所以是「**有機會**滿級」而不是「一定滿級」，正好是 Ray 那句話的份量。
       ⚠⚠ **形狀是「前期快、後期慢」**（每級 ×1.33）：Lv2 一局就到（立刻有回饋），
         Lv9 那一段要 5600（差不多九局），才撐得起一個目標。
         要整體變快／變慢**只動這一排數字**；要改形狀改比例。
       ⚠ 這裡是**累計**不是逐級（同 `rating.tiers` 的門檻寫法）：等級由累計值查表推出來，
         不必存「等級」這個第二真相（鐵律 7 —— 存了就會與 EXP 走鐘）。 */
    /* ══⚠⚠⚠ **ver -1027：整條 ×2.5**（Ray：「現在三女角升級太快了，以諾薇兒為例
       她在安雅登場前（娜塔莉戰前）差不多可以升到 lv2~lv3 是最妥當的。也就是
       訓練用聖徒、賞金獵人、蜈蚣（boss）、北泊掃盪(含一個 boss)、紫黑之爪(boss)
       後可以升到 lv3」）══
       校準的算法（**照 Ray 點名的那條路實算**，不是憑感覺乘一個數）：
         · 訓練用聖徒＝教學戰，`tutorialSettle` **不發 EXP** → 0
         · 其餘四場各一局（北泊掃盪整段是一個 `session`，收段那一場才結算）
         · 蜈蚣／北泊收段（np_boss）／紫黑之爪三隻**都是 boss**（ver -1024 的
           `bossMul.exp` ×2；那三張卡的 `boss` 也在這一版一併標成 1）
       實算（`scoreToExp` 含 jitter）：
         55 分 → 618＋1236×3 ＝ 4326    65 分 → 708＋1416×3 ＝ 4956
         75 分 → 792＋1584×3 ＝ 5544    85 分 → 880＋1760×3 ＝ 6160
       ⇒ ×2.5 之下 **55~85 分全部落在 Lv3**，而且過程正好是
         賞金獵人 Lv1 → 蜈蚣 Lv2 → 北泊 Lv2 → **紫黑之爪 Lv3** —— 與 Ray 的
         「lv2~lv3」「紫黑之爪後 lv3」一字對得上。
       ⚠ 試過 ×3（低分會掉回 Lv2）與 ×3.5（要 75 分以上才 Lv3）—— 都不夠穩。
       ⚠ 索菈娜的方向相反（D 約 1000／局），所以她天生升得比另外兩位快 —— 那是
         `invertFor` 的設計，不是這一排數字的事。 */
    expTo: [0, 1500, 3800, 7000, 11500, 17500, 25500, 36000, 50000],

    /* ══ 九格的內容 —— **Ray 分角色給**（他的原話：「星名跟對應技能我會分角色
       給你，有不懂的就問別瞎做」）══
       `star` 是西文星名、`name` 是中文星名、`desc` 是給玩家看的說明，
       其餘欄位是效果（格式照 `gunStars`）。
       ⚠⚠ **諾薇兒（巨蟹座九星）已交卡，ver -971 填好了**；
         **安雅與索菈娜還是空的 —— 不要自己發明星名或效果**
         （同護符 `items.defs` 那一批、同副武器的 `weaponPerks`：
         那兩處也是「Ray 的卡還沒到就空著」）。
       ⚠ 一位九格、順序就是 Lv1→Lv9；填的時候只動 `name`／`desc` 與效果欄位，
         不要動陣列長度（`maxLv` 由 `expTo` 的長度推，鐵律 7）。 */
    levels: {
      /* ══⚠⚠⚠ 諾薇兒（ver -971，Ray 交卡）—— **巨蟹座九星** ══════════════
         > 「諾薇兒　聖徒化（血越少持續時間越長）／被動技：即死防禦／
         >   主動技：中止聖徒化，保留現血量，發動後 10 秒吸血 buff，
         >   **並連續聖徒化 combo 增益 10 秒**，一發回最大血量 5%」

         ⚠⚠ **那段抬頭＝出廠就有的基礎組**（Ray 定案）。⚠ `expTo[0]` 是 0，
           所以 **Lv1 同時就已經點亮「先鋒星」** —— 抬頭那一段是「一顆星都沒有時
           她會什麼」，不是 Lv1 的全部。所以有兩件現行預設的能力
           **被收回去當升級獎勵**（他選的是「兩條都收」）：
           · 聖徒化 Reload（`installReload`，ver -903 起一直是預設）→ **Lv3** 才有
           · 即死防禦「一場（怪）一次」（ver -888 起是預設）→ **Lv7** 才有；
             Lv1~6 退回卡上 `oncePerBattle` 的原義＝**一局一次**
           ⚠⚠ **試玩版不受影響**：蕾妮／馬季諾不在 `girls.who` 裡，
             `onEnemySet` 那道守門只咬本篇的三位（同「本篇與試玩版是兩套」）。
         ⚠ 抬頭裡的「連續聖徒化 combo 增益 10 秒」是**這一版才實作的**
           （`active.comboKeepSeconds`）—— 舊版只有吸血窗。

         格式照 `gunStars`：`star`＝西文星名、`name`＝中文星名、`desc`＝給玩家看的
         一句話，其餘欄位是效果（讀值一律走 `progress.girlBonus/girlHas` 那個
         唯一查詢點，鐵律 7 —— 呼叫端不自己翻這張表）。
         ⚠ 效果是**累加到現在這一級為止**（`girlBonus` 把 Lv1~現級加總），
           所以每一格寫的是**增量**不是絕對值（`guardHealPct:0.03` ＝卡上的
           0.02 再加 3% ＝ 5%）。 */
      nouvelle: [
        { star:'Guisuer', skill:'install',           name:'先鋒星',
          desc:'聖徒化的連擊疊傷提升至 150%。',
          /* 聖徒化每 combo 的疊傷斜率（`tuning.saintComboStep` 1.0）**乘上 1+這個值**
             → 1.5。⚠ Ray 選的是「只調斜率」：「無上限」是對現況的確認
             （聖徒化那一段本來就沒有上限），**普攻 `dmgComboCap:20` 不解除**。 */
          saintComboMul:0.50 },
        /* ══⚠⚠⚠ **ver -1014：Lv2 與 Lv5 對調，而且 Lv2 換成全新的效果**（Ray 交卡）══
           診斷：她的前四顆星全部只在「聖徒化」與「獄門天鎖」那兩扇**一局一次**的窗裡
           生效 —— 是**事件型**回報；而安雅 Lv1（每一顆圈）、索菈娜 Lv1~3（每一盤）
           都是**頻率型**。玩家在練到 Lv8 之前感覺不到自己變強，所以在她真正發威之前
           就把她換掉了 —— 那不是強度問題，是**兌現頻率**問題。
           ⇒ 容錯是**每一次點擊**都在兌現的東西，放前期正是為了補這條曲線。
           ⚠ 舊 Lv5「引路星」的效果（魂之歸所後延續連擊增傷 15 秒＋指引）**整顆退場**
             （Ray：「先不用，本來就是湊數的」）—— 連擊延續的**基礎那 10 秒仍在**
             （卡上的 `comboKeepSeconds`），沒有一起消失。 */
        { star:'Asellus Borealis', skill:'install',  name:'引路星',
          desc:'失誤一次不受擊，點擊正確就重置。並在聖徒化期間全程指引下一格。',
          /* `missGuard` ＝容錯本體（實作見 `partner.tryMissGuard` ／ `combat.tap`）；
             `saintHint` ＝聖徒化全程指引（舊「端首星」的那一半，搬過來合併）。
             ⚠ 被吃掉的那一次**盤面與評價都不算**（Ray：「留著，她就是衝評價女神，
               這是最開始我給她的定位」）、而且**連擊不斷**。 */
          missGuard:1, saintHint:1 },
        { star:'Nahn', skill:'active',               name:'探覓星',
          desc:'發動彈雨傾洩可回復魂之歸所的使用次數。',
          /* ver -1014（Ray 交卡）：舊效果（單場無傷擊殺回填聖徒化）搬到 Lv5「端首星」。
             ⚠ 回填的是**主動技的次數**（`state.partnerActiveUsed`）——
               掛在雙槍破防真的發動那一刻（`weapon.activateDual`），那是唯一的入口。 */
          brReloadActive:1 },
        { star:'Tegmine', skill:'passive',           name:'堅殼星',
          desc:'獄門天鎖的十秒免傷期間，每次射擊回復最大體力 5%。'
              +'反擊一次算一發，聖徒化期間不作動。',
          /* `guardHealPct` 是**增量**：卡上 0.02 ＋ 這裡 0.03 ＝ 5%。
             ⚠ 「單局一次」＝**即死防禦本身**一局一次（Ray 確認）——
               那正是 Lv1~6 的基礎行為（Lv7 的蟹生星才放寬成一場一次），
               所以這一格不必再寫一次那個限制。
             ⚠ `guardHealCounter` ＝副武器反擊也算一發（**一次反擊算 1 hit**，
               不是每一顆子彈各算一次）。
             ⚠⚠⚠ **聖徒化／惡夢化期間這個回血一律失效**（ver -973，Ray 定案：
               「那就讓堅殼星的回血效果在聖徒化期間失效吧」）—— 那兩條血條是
               倒數槽，回血＝把自己推向 OBE。會撞在一起是因為**反擊在聖徒化期間
               打得出來**（另外三種射擊在 `tap` 就被分流給 saint 了，碰不到）：
               即死防禦接住 → 10 秒窗開著 → 立刻右滑進聖徒化，那幾秒的每一次反擊
               都會推槽。守門在 `combat.shotHeal()` 一支（鐵律 8）。 */
          guardHealPct:0.05, guardHealCounter:1 },
        { star:'Guisuyi', skill:'install',           name:'端首星',
          desc:'單場無傷擊殺即回復聖徒化熔斷；同場戰鬥內不可連續使用。同戰役的次場戰鬥生效。',
          /* ver -1014：由 Lv3「探覓星」搬過來（效果一個字沒改，只換星位）。
             ⚠ 用字統一成「**熔斷**」（Ray：「聖徒跟夢魘用字都是熔斷」）——
               聖徒化推滿與夢魘化抽乾是同一件事的兩端，兩邊同一個詞。 */
          saintReload:1 },
        { star:'Acubens', skill:'install',           name:'斷鉗星',
          desc:'聖徒化時體力降至 1。',
          /* 聖徒化的長度＝倒數槽從**當下血量**推到滿要多久，所以血越少撐越久
             （抬頭那句「血越少持續時間越長」）。這顆星把它推到極限。
             ⚠ 走 `combat.setPlayerHpRatio(0)`（下限夾 1 HP，既有語意）。 */
          saintStartHp1:1 },
        { star:'Yuyu', skill:'passive',              name:'蟹生星',
          desc:'獄門天鎖於同場戰役內的每一場戰鬥都可發動一次。',
          /* ＝ver -888 那條「每換一隻怪 reload」，現在是這一級的獎勵。
             ⚠ 九星「方舟」（無傷擊殺回復被動）與它**是兩件事**，照舊各自生效。 */
          guardPerEnemy:1 },
        { star:'Asellus Australis', skill:'install', name:'負行星',
          desc:'聖徒化時間不受到敵方攻擊減少。',
          /* ══⚠⚠⚠ **ver -988：Lv8 與 Lv9 的效果對調**（Ray 定稿）══
             星名與順位不動，換的是**效果**：這一顆現在是「受擊不推進倒數槽」
             （-987 之前在 Lv9 終焉星）。
             ⚠ 只擋**敵方攻擊**（含格擋那一半）；點錯與反應逾時照舊推進 ——
               那兩支在 `saint.js` 自己叫 `saintAdvance`，守門在
               `combat.enemyAttack` 的聖徒化分支。 */
          saintNoHitAdvance:1 },
        { star:'Tarf', skill:'install',              name:'終焉星',
          desc:'聖徒化期間的攻擊可小幅延長爆發時間。',
          /* ══⚠⚠⚠ **ver -988：與 Lv8 對調**（Ray 定稿）══ 這一顆現在是
             「每一發射擊延長倒數」（-987 之前在 Lv8 負行星）。
             聖徒化期間血條＝倒數槽，**扣血＝延長**：每發扣 `playerMax` 的 1%
             （走 `combat.drainPlayer`，下限夾 1 ＝不會歸零）。
             ⚠⚠ **「第 2 Hit 開始」數的是「這一段聖徒化的第幾發」**（ver -1016 修）——
               -988~-1015 寫成 `state.combo>=2`，而 `combat.enemyAttack` 一律把連擊
               歸零（ver -522「只要受擊就歸 0」，聖徒化期間照樣跑）。碰到高頻攻擊的怪
               （鹿主）連擊永遠停在 0~1，**這顆星整個沒作動**（Ray：「終焉星效果
               沒發動啊」「被鹿主打得迷迷冒冒」）。現在用 saint 自己的射擊計數。
             ⚠⚠ **ver -1019 加倍：0.01 → 0.02**（Ray：「終焉星不夠強，加倍看看」）。
             ⚠ 匯率備忘：被動推進每 100ms 是 `playerMax×0.01`，所以 0.02 ＝
               **一發抵銷 200ms**，要 5 發/秒才打得平。
               2 發/秒 → 約 17 秒；2.7 發/秒 → 約 22 秒；4 發/秒 → 約 50 秒。
             ⚠ **它不會變成永動機**：聖徒化的終點有兩個 —— 槽推滿（熔斷）**或
               16 格點完（Maximum Burst）**。點得越快越早清完盤，所以「快到打平」
               那個人根本撐不到那裡就結束了。延長只在你被打斷、變慢的時候有意義，
               而那正是需要它的時候。 */
          saintDrainPct:0.02 },
      ],
      /* ══⚠⚠⚠ 安雅（ver -974，Ray 交卡）—— **雙子座九星** ══════════════════
         > 「夢魘降臨是以現有血量回扣倒數到 hp1 的時候熔斷，13 秒夢魘期間所有反擊
         >   命中都是 100%，普攻 combo 增益無上限。夢魘期間成功清完所有格子玩家 HP
         >   會回到發動夢魘時的值，失敗的話 OBE 也就是 hp 被扣到 1。
         >   主動技夢境破碎可以在夢魘期間發動，效果是依夢魘期間清除的格數比例對敵
         >   一次性產生敵最大 hp 25％ 的傷害。
         >   **被動技：完美反擊後 10 秒間普攻加倍。反擊命中 100%。**」

         ⚠⚠⚠ **這張卡推翻了三條舊規則**（舊註解會騙人，見各處的 ver -974 標註）：
           · ver -740「明晰之夢期間任何反擊都算完美反擊，傷害跟評價都是」
           · ver -959「惡夢化期間三帶一律紅圈」
           · ver -897「16 格點完不出 MB，直接出夢境粉碎」
         ⚠⚠⚠ **反擊現在是三件事，分開處理**（Ray：「只有攻擊力走紅圈，判定還是
           分色。命中則是技能霸王條款覆蓋」）：
             · **判定**（免傷／算不算完美反擊／折秒／硬直／教學通知）＝**玩家真的
               點到哪一帶**，技能不再覆蓋它
             · **命中**＝技能可以霸王條款壓成 100%
             · **攻擊力**＝技能可以把它抬到橘圈／紅圈（就是這一族星在賣的東西）
           判定只有 `defense.resolveThreat` 一支（鐵律 7），三者都在那裡分流。

         ⚠ `counterAtk`／`burstAtk` 是**階數**（girlBonus 會加總）：1＝橘圈攻擊力、
           2＝紅圈攻擊力。所以 Lv4 寫 1、Lv7 再寫 1（累計 2），不要寫絕對值。
         ⚠⚠ **`skill` ＝這一顆強化的是哪一招**（ver -990，Ray：「在技能表裡也要標色」）：
           `install`（變身，金）／`passive`（被動，淡藍）／`active`（主動，淡紅）——
           顏色與搭檔卡上那三行同一套（值在 CSS，鐵律 1）。
           ⚠ 兩顆是**判斷題**（Ray 沒明說，跟著「敘述裡先出現哪一招」歸）：
             索菈娜的「地弓星」（破防彈雨的攻擊力 → 歸主動，因為主動技就是直接進 BR）
             與「海宣星」（戰吼發動時回填主動技 → 歸被動，因為觸發的是戰吼）。 */
      anya: [
        { star:'Pollux', skill:'install',          name:'拳鬥者星',
          /* ⚠ ver -1012（Ray：「我記得夢魘化好像也會加普攻，拿掉」）：
             這顆星只加**反擊** —— 盤面點格那一份（`saint.nightmareTap`）已經拿掉。
             安雅的定位是反擊，普攻加成是白給的。 */
          desc:'夢魘化期間反擊攻擊力提升至 120%。',
          /* 只在**夢魘化期間**生效。普攻在 `saint.nightmareTap`、反擊在
             `weapon.weaponCounter` 的 `scale`（各自唯一的計算點，鐵律 7）。 */
          niDmgMul:0.20 },
        { star:'Castor', skill:'active',          name:'築壩者星',
          desc:'夢境破碎發動後追加 10 秒反擊增益，並全程指引下一格。',
          /* 那扇窗的擁有者是 `partner`（`burstBuffUntil`）—— 與生命歸還那扇窗
             同一個形狀。⚠ 這裡**只抬攻擊力**，不壓命中（卡上沒說）。 */
          burstBuffSec:10, burstAtk:1, burstHint:1 },
        { star:'Alhena', skill:'install',          name:'烙印星',
          /* ⚠ Ray 的定稿這一句寫成「回填**聖徒化**」—— 那是諾薇兒的招，已確認是筆誤
             （「是筆誤，改夢魘化」），照實作寫成夢魘化。措辭比照諾薇兒的探覓星。 */
          desc:'連續三次完美反擊即回復夢魘化熔斷；同場戰鬥內不可連續使用。同戰役的次場戰鬥生效。',
          /* ＝既有的 `passive.reloadStreak`（ver -887），ver -974 起收成這一級的獎勵
             （同諾薇兒探覓星的作法，Ray：「收」）。守門走卡上的 `reloadNeedStar`。
             ⚠ 「連續三次**紅圈**」數的是 `realGrade` —— 靠技能算成紅圈的不算
               （ver -887 就定了）。判定分色之後這件事更單純：兩個等級現在一樣。 */
          niReload:1 },
        { star:'Tejat', skill:'passive',           name:'赤足星',
          desc:'明晰之夢延長為 10 秒，期間所有反擊攻擊力提升。',
          /* `lucidSec` 是**增量**：卡上的 10 ＋ 5 ＝ 15 秒。 */
          lucidSec:5, counterAtk:1 },
        { star:'Mebsuta', skill:'active',         name:'赤爪星',
          desc:'夢境破碎後的反擊增益期間，所有反擊攻擊力提升。',
          /* 與築壩者星累計＝2（紅圈）。秒數不再加（卡上兩顆都寫「追加 10 秒」）。 */
          burstAtk:1 },
        { star:'Propus', skill:'install',          name:'前引星',
          desc:'夢魘化發動時體力先回滿，發動時間最大化。',
          /* 夢魘化的長度＝從**發動當下的血**以固定速率抽到 1（滿血＝`maxSec`），
             所以血少就比較短 —— 這顆星把起點拉回滿血＝一律撐滿 13 秒。
             ⚠ 「從滿 HP 開始算」只有「**真的把血灌滿再抽**」這一個讀法能自洽：
               不灌血而用滿血的斜率去抽，會提早見底，比原本還短。 */
          niFullStart:1 },
        { star:'Alzirr', skill:'passive',          name:'鐵蹄星',
          desc:'明晰之夢延長為 15 秒，期間所有反擊攻擊力提升。',
          /* 攻擊力與赤足星累計＝2（紅圈）。**秒數也再 +5**（ver -994）：
             5 →（赤足星）10 →（這一顆）15 —— 定稿的兩句都寫了「延長為」。
             ⚠ 中文名「鐵蹄星」由 Ray 定（ver -995）—— 他的卡上這一顆原本只有西文
               星名與「被動技升級」，我一度暫填成「蹄鐵星」，已更正。 */
          lucidSec:5, counterAtk:1 },
        { star:'Wasat', skill:'active',           name:'界心星',
          desc:'夢境破碎若在夢魘化期間最後一格時發動，一次給與敵人最大體力的 30% 傷害。',
          /* 取代比例算法的那一發（比例算到 15/16 也只有 23.4%）。
             ⚠ 「打不死」的下限（`burstFloor`）照舊 —— 那是另一條規則。 */
          burstLastCell:0.30 },
        { star:'κ Geminorum', skill:'install',     name:'孿生星',
          desc:'夢魘化期間發動反擊先消耗破防計，破防計耗盡才開始消耗體力。',
          /* ══⚠⚠⚠ ver -1012（Ray 定案）：整顆換掉 —— 舊效果是「反擊讓抽血減緩
             0.5 秒」（`niCounterPauseSec`），那是**在補她已經最強的地方**。
             現在它是「**先付破防、再付命**」：霸王條款那一發反擊的代價
             （`tuning.nightmare.forcedCounterSec`，1 秒）改成**先從破防計扣**，
             扣完了才開始扣倒數槽。
             · 值 ＝ 一次反擊扣掉**多少比例的破防計**（0.3333 ＝ 1/3 表）——
               Ray：「滿表讓她多扛三次反擊就很多了，一次約扣 1/3」。
             · 抽的是**次數**不是傷害：三刀十刀都一樣，那是「用了幾次外掛」。
             ⚠⚠ **夢魘化期間破防計只減不增**（ver -1012 的全域規則，見
               `combat.addEnergy`）—— 所以那 100 點是**進場前存好的彈藥**，
               玩法變成「我要不要先攢滿再開」。累積的話就是共鬥 -1005 那個永動機。 */
          niCounterEnergy:0.3333 },
      ],
      /* ══⚠⚠⚠ 索菈娜（ver -976，Ray 交卡）—— **射手座九星** ══════════════════
         > 「獵手的共鬥：以現玩家累積的破防值，最大進行 12 秒的全自動反擊。
         >   玩家受擊會扣一秒（失誤或延時）。**初始為黃圈的攻擊力，命中都是 100%**。
         >   被動技：獵手的戰吼，**連 5 盤**完美清盤增加 10 秒的破防值累積量 200%。
         >   主動技：共鬥期間以外，可無視破防值立即進入破防彈雨。」

         ⚠⚠⚠ **這張卡推翻了被動的兩段式**（ver -837／-894 的「連 3 發動／連 5 再發動
           ＋重置共鬥」）—— Ray：「換成卡上的，被動語音改輪播」。現在是**單段**：
             · 基礎＝連 **5** 盤（Lv5「箭頭星」降為 3 盤）
             · reload **主動技** → Lv2「海宣星」
             · reload **共鬥**   → Lv7「聚落星」（改掛在主動技發動時）
           「共鬥再開 FANGS RELOAD」那張臉與語音**搬到 Lv7 那一發**（素材不浪費）。
         ⚠⚠⚠ **共鬥的飛刀改吃副武器的帶位攻擊力**（Ray：「以玩家現裝備的副武器
           攻擊力為準，步槍一樣 nerf 50%，**演出不變**」）：飛刀的動畫、音效、
           三段時序一個字都沒動，只有**傷害的來源**換了。
         ══⚠⚠⚠ **ver -1012（Ray 定案）：飛刀的傷害改成「三刀合計＝一次普攻」** ══
           > 「自動反擊的威力改成 3 刀＝1 普攻。獵弓星跟天弓星改成反擊威力
           >   +50% 跟 +100%，共 150% 就好」
           **理由是分工不是數字**：安雅賣的是「反擊」，索菈娜賣的是「你不用管圈」——
           飛刀的價值在**自動**，不在傷害。它一強就變成「自動打贏」，而且那份傷害
           **不收技術費**（安雅的反擊要玩家點得到圈，這個不用）。
           · 基底 ＝ `combat.hitDamage()`（一次普攻，唯一的計算點，鐵律 7）
           · 獵弓星 +50%／天弓星 +100% → 滿星 ×2.5
           ⚠ ver -976 的「以副武器在那一帶的攻擊力為準」整條退場：帶位（`coopAtk`）、
             改裝、`weaponBand` 都不再參與 —— 連帶「萊福槍 nerf 50% 自動成立」
             那一句也不再適用（飛刀根本不看武器了）。 */
      sorana: [
        { star:'Kaus Australis', skill:'active',  name:'地弓星',
          desc:'彈雨傾洩的攻擊力提升至 120%。',
          /* 「破防攻擊力」＝雙槍破防（Bullets Rain）那一段的每一發。
             唯一的計算點在 `combat.tap` 的 `dualWield` 分支。 */
          brDmgMul:0.20 },
        { star:'Nunki', skill:'passive',           name:'海宣星',
          desc:'獵手的戰吼發動時，可再次使用獵手的智慧。',
          /* ⚠ 「5 盤」是**戰吼的門檻**不是另一個數字 —— 點了箭頭星之後就是 3 盤
             （鐵律 7：門檻只有 `passive.streak` 減去 `roarStreakCut` 一處在算）。 */
          roarReloadActive:1 },
        { star:'Ascella', skill:'active',         name:'曳弦星',
          desc:'獵手的智慧發動後追加 10 秒破防值累積量 200%。',
          /* 與戰吼**同一個執行體**（`partner.fireEnergyBuff`，鐵律 8）：
             倍率照卡上的 `passive.energyMul`，這裡只給秒數。 */
          activeEnergyBuffSec:10 },
        { star:'Kaus Media', skill:'install',      name:'獵弓星',
          /* ⚠ ver -1012 起兩顆星的**數字不同**（+50% / +100%），所以文案也分開寫了
             —— -976~-1011 那條「兩顆一字不差是刻意的」已不再適用（那時是帶位制，
             刻意不對玩家講橘圈／紅圈）。加成走 `prog.girlBonus` 累加：滿星 ×2.5。 */
          desc:'獵手的共鬥期間，自動反擊威力提升 50%。',
          coopCounterMul:0.5 },
        { star:'Alnasl', skill:'passive',          name:'箭頭星',
          desc:'獵手的戰吼發動條件由連續5盤完美清盤降低為3盤。',
          /* 減量寫在星上（5 − 2 ＝ 3）：門檻的真相仍是卡上的 `passive.streak`。 */
          roarStreakCut:2 },
        { star:'Kaus Borealis', skill:'install',   name:'天弓星',
          desc:'獵手的共鬥期間，自動反擊威力再提升 100%。',
          coopCounterMul:1.0 },
        { star:'Albaldah', skill:'active',        name:'聚落星',
          desc:'主動技發動同時回填獵手的共鬥。同一場戰鬥可連續使用。',
          /* 與海宣星串成一個循環：戰吼 → 回填主動技 → 主動技 → 回填共鬥。
             ⚠ 「單場可連續使用」是這個循環的**結果**，不是另一條規則 ——
               不必再開一個「共鬥不限次數」的旗（那會讓兩處各說一次）。 */
          activeReloadCoop:1 },
        { star:'Eta Sagittarii', skill:'install',  name:'射手星',
          desc:'獵手的共鬥最大持續時間延長。',
          /* 增量：卡上的 `coop.baseSec` 12 ＋ 3 ＝ 15。
             ⚠ 實際秒數仍照破防值換算（`baseSec × 破防值/100`）—— 這顆星抬的是**上限**。 */
          coopSec:3 },
        { star:'Phi Sagittarii', skill:'install',  name:'獵手星',
          desc:'獵手的共鬥期間可累積之破防值，延長爆發時間。',
          /* 「每一 hit 可增加破防值，即延長共鬥時間」—— 共鬥期間本來就照常
             `addEnergy`（共鬥不是盤面模式，玩家照樣點盤），這顆星把**那一份增量**
             即時換算成秒數（同一條匯率：`baseSec/100` 秒 per 點）。
             ⚠ 所以**不必發明一個「每 hit 幾點」的數字**（鐵律 1：Ray 沒給就不要編）
               —— 用的就是既有的每擊破防量。 */
          coopEnergyTime:1 },
      ],
    },
  },

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
    '太早反擊的話,雖然安全,但傷害很有限。',
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
    /* ══ 璐娜莉亞（ver -471，Ray 交稿）：**挑戰的 Boss 戰**的結算評價者 ══
       「挑戰的boss戰結算畫面原本是監察官，改成璐娜莉亞」—— 那一場是夢裡的對決，
       醒來評語的是她自己。逐**等第**換立繪差分（portraitsByRank，S/A 共用 smirk）。
       ver -553（Ray 交稿）：**戰敗也是她**（angry＋「討人厭的夢......」）——
       -471「戰敗仍是芙蕾雅」那條作廢。 */
    luna: {
      name:'璐娜莉亞',
      tier:'rookie',
      image:'inspector_luna_n',            // 保險 fallback（portraitsByRank 缺該等第時）
      portraitsByRank:{
        S:'inspector_luna_smirk', A:'inspector_luna_smirk',
        B:'inspector_luna_n',     C:'inspector_luna_lookdown',
        D:'inspector_luna_angry', E:'inspector_luna_hand',
        lose:'inspector_luna_angry',
      },
      portraits:{},
      dialogues:{
        S:{ 0:['做了場好夢呢。'] },
        A:{ 0:['是夢啊......？ 真想再跟那傢伙打一場啊。'] },
        B:{ 0:['只是夢啊......現在的我可不會輸。'] },
        C:{ 0:['連在夢裡都那麼討人厭。'] },
        D:{ 0:['......只是場夢而已嗎？'] },
        E:{ 0:['手......又開始痛了。'] },
        lose:{ 0:['討人厭的夢......'] },
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
    /* ══⚠⚠ 原則「戰鬥中對話立繪尺寸」（ver -878，Ray：「鹿主完成變身後恢復角色
       立繪，稍小一點，並列入原則『戰鬥中對話立繪尺寸』」「從鹿主出現時立繪就採
       戰鬥中對話立繪尺寸」）══ 敵人在畫面上的對話（戰鬥內對白、劇情頁的中景敵
       cgBack 在場）立繪一律乘這個縮小比 —— 人讓一點位給怪，怪才是那一幕的主體。
       單一真相（鐵律 7）：兩個消費者都讀這裡 ——
         · modules/tutorial.js sizePortrait（戰鬥內對白，永遠適用）
         · modules/story.js castLayout（stageCgBack 非空＝中景有敵人時）
       0.85 是暫定值，Ray 說了算。 */
    battleTalkScale: 0.85,
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
    /* ⚠ `charm`（ver -699）＝**強化護符**：掛在主武器兩支槍的掛件槽上（見 `mainGun`）。
       ⚠⚠ **護符的卡還沒到**（Ray 未給）—— 這一版只做好槽與生效的管線，
         `defs` 裡一張護符都沒有是**刻意的**：不要自己發明名字與數值
         （同「改裝服務準備中」的原則）。一張護符長這樣：
             charm_xxx: { name:'…', cat:'charm', price:…,
                          charm:{ dmgMul:1.05 },        // 普攻傷害倍率
                          desc:'…' }
         `charm.dmgMul` 是目前唯一接上的效果（`combat.mainGunDmgMul`）；
         要別的效果（暴擊、破防、聖能）就在那一支加，**不要另開第二個計算點**。 */
    catOrder: ['item','weapon','charm','material','food','treasure','equip','special'],
    catName:  { item:'道具', weapon:'武器', charm:'護符', material:'素材', food:'食材', treasure:'寶物', equip:'裝備', special:'特殊' },
    /* ⚠ `price`＝**市價**（買進的價）。賣出價由 `shop.sellRate` 折算（Ray：買收價為物價 50%）
       —— 一個道具只寫一個數字，折扣是店家的事，不是道具的屬性（鐵律 7 的精神）。
       ⚠ 沒寫 `price` 的道具**不能買也不能賣**（劇情道具、任務物品都該如此）。
       ⚠ `use`＝使用效果（目前只有恢復體力的數值；戰鬥外的使用系統還沒做，先把資料放著）。 */
    defs: {
      /* ══⚠⚠ **薇拉馮德家的紋章**（ver -661，Ray 指定）══════════════════════
         「讓主角身上永遠有一個，數量無限，賣一次得錢 1000 元」。
         ⚠ `always:true` ＝ 它是道具**定義**的性質，不進道具欄的帳
           （不必存、不必清、賣掉不會變少）—— 見 script/inventory.js 的說明。
         ⚠ `sellValue` ＝**絕對值**（1000），不走 `shop.sellRate` 折算：
           Ray 說的是「賣一次得 1000」，不是「市價 2000 打五折」。
         ⚠ 沒有 `price` ＝ 商店不會拿出來賣（那是他家的東西）。 */
      verafond_crest: { name:'薇拉馮德家的紋章', cat:'item', sellValue:10000, always:true,   /* ver -859：Ray 改 10000 */
                        desc:'薇拉馮德家的家徽。同樣的東西他身上似乎總還有一個。' },
      saint_claw_low: { name:'聖徒之爪（低品質）', cat:'material', price:24,
                        desc:'從訓練用聖徒上剝下來的爪。質地脆，勉強能當研磨材。' },
      /* 巨型蜈蚣的掉落（ver -423，Ray 的卡）。⚠ **價格是我填的**（卡上沒寫）——
         照既有素材的量級：常見的 6~8、稀有的 24 以上。要改直接動這裡。 */
      /* ══ 夏爾森林狩獵食材（ver -858，Ray 交稿）══ 森林戰鬥的掉落（掉落表
         等森林敵卡到了再接）；獵人謝尼每日收一種换獎勵（script/town.js 的
         svHunterTrade）。⚠ 價格是我擬的草案。 */
      meat_lynx:  { name:'山貓腿肉', cat:'food', food:'meat', price:60,  desc:'緊實的山貓腿肉。烤過之後香氣四溢。' },
      meat_boar:  { name:'山豬腹肉', cat:'food', food:'meat', price:80,  desc:'油花漂亮的山豬腹肉。獵人的最愛。' },
      /* ⚠ 這三樣是**食材**（ver -862 補正：-861 說「五食材改 cat:'food'」只改了兩樣）——
         「五食材」＝ huntExchange.foods 那五樣，獵人兌換表與料理都當食材看。 */
      antler_deer:{ name:'鹿角',     cat:'food', price:50,  desc:'分岔漂亮的鹿角。可入藥也可做工藝。' },
      paw_bear:   { name:'熊掌',     cat:'food', food:'meat', price:120, desc:'稀有的熊掌。燉煮費工，滋味濃厚。' },
      meat_snake: { name:'蛇肉',     cat:'food', food:'meat', price:40,  desc:'處理乾淨的蛇肉。意外地清爽可口。' },
      /* ══ 料理食材（ver -953，Ray：「食材做成道具，準備十道菜…材料都是一肉一菜一調味」）══
         ⚠⚠ **`food` 這一格＝它在料理裡佔哪一格**（`meat` 肉／`veg` 菜／`season` 調味），
           只有這裡在說（鐵律 7）：`cooking.dishes` 的配方只列三個 id，
           哪個是肉哪個是調味由**道具自己**回答 —— 配方表再記一次必然走鐘。
         ⚠ 沒有 `food` 的食材（鹿角）＝不能下鍋，只能賣或兌換。
         ⚠⚠ `huntExchange.foods` 那五樣是**另一件事**（獵人每日兌換），
           不要因為這裡多了食材就去動那張表。
         ⚠ 價格是我擬的草案（照既有食材的量級：常見 20~60、費工的 80~120）。 */
      meat_deer:      { name:'鹿腿肉',   cat:'food', food:'meat',   always:true, price:90,
                        desc:'厚實的鹿後腿肉。腥味淡，煎烤都合適。' },
      /* ⚠⚠⚠ **那三樣的 `always:true` 是測試期間的暫時措施**（ver -956，Ray：「設計上
         玩家此時一定會有鹿排食材，測試期間讓包裡永遠有那三樣就好」）——
         鹿腿肉／迷迭香／草原奶油**目前遊戲裡拿不到**（沒有怪掉、沒有店賣），
         而 Stage8 的料理那一段要玩家自己從菜單挑一道煮。
         ⚠ `always` ＝不進道具欄的帳、數量無限（同薇拉馮德家的紋章）——
           所以煮過一次也不會少。
         ⚠⚠ **正式版要把這三個 `always` 拿掉**，改成真的拿得到：怪的掉落（鹿腿肉）
           ／店貨（奶油）／野外採集（迷迭香）。拿掉的同時要確認 Stage8 那一段仍然
           煮得出第一道 —— 不然那一拍會開著菜單卻一道都按不下去。 */
      /* ── 菜（蔬菜與香草）── */
      herb_rosemary:  { name:'迷迭香',   cat:'food', food:'veg',    always:true, price:25,
                        desc:'林間隨處可見的香草。一小把就能壓住肉的腥。' },
      veg_wildgarlic: { name:'野蒜',     cat:'food', food:'veg',    price:20,
                        desc:'葉子寬而柔軟的野蒜。氣味比栽種的溫和些。' },
      veg_mushroom:   { name:'林地菇',   cat:'food', food:'veg',    price:35,
                        desc:'長在倒木背面的菇。摘的人得認得清楚才行。' },
      veg_sorrel:     { name:'酸模葉',   cat:'food', food:'veg',    price:20,
                        desc:'帶酸味的野菜。配油脂重的肉正好。' },
      veg_watercress: { name:'河芹',     cat:'food', food:'veg',    price:30,
                        desc:'淺灘邊成叢的水芹。清爽，帶一點辛。' },
      /* ── 調味 ── */
      season_butter:  { name:'草原奶油', cat:'food', food:'season', always:true, price:60,
                        desc:'草原牧場的奶油。煎過之後香得很霸道。' },
      /* ══ 北峰山羊奶油（ver -979，Ray 交辦）══ 北方泊地的居民在碼頭送行時塞給你的
         那一份心意（`np_farewell` 那一拍 `give`），**也在北方泊地的雜貨舖買得到**。
         ⚠ 它是**食材**（Ray 指定），佔調味那一格 —— 瑪麗亞第一道菜（奶油鹿腿排）
           要的就是它（-953 原本寫 `season_butter`，這一版換過來）。
         ⚠ **不是 `always`**：草原奶油掛 `always` 是因為它在遊戲裡拿不到（-955 的待辦），
           這一個既送又賣，本來就拿得到。
         ⚠⚠ 價格 90 是**我填的**（Ray 沒給）：調味這一族現在是岩鹽 20／萊姆皮 40／
           草原奶油 60／黑胡椒 70／森蜜 80，它是「跟一般的奶油可不一樣」的高級品，
           所以排在最上面。要改就改這一個數字。 */
      /* ⚠⚠ `devKit` ＝**章節跳關的測試補給要發幾個**（ver -999，Ray：「測試環境包裡
         要常備北峰奶油，不然會卡關」）。
         為什麼會卡：這一樣只有兩個來源 —— 北方泊地送行那一拍的 `give`，以及
         北方泊地的雜貨舖。**跳關直接進 Stage 8 的話兩個都沒經過**，而瑪麗亞的
         第一道菜（奶油鹿腿排）指名要它 → 那一段就過不去。
         ⚠ 寫成**道具身上的一格**不是在 `main.js` 寫死 id（鐵律 1，同那一批回復道具
           走 `use.hp` 的作法）—— 日後再有「劇情發的、跳關拿不到」的東西，
           加一格就自動進補給包。 */
      season_goatbutter:{ name:'北峰山羊奶油', cat:'food', food:'season', price:90, devKit:5,
                        desc:'北峰山羊奶製的奶油。奶香濃得多，煎起來會回甘。' },
      season_rocksalt:{ name:'岩鹽',     cat:'food', food:'season', price:20,
                        desc:'敲下來的粗粒岩鹽。撒上去就很夠味。' },
      season_honey:   { name:'森蜜',     cat:'food', food:'season', price:80,
                        desc:'森林裡取的野蜂蜜。收得少，甜得深。' },
      season_pepper:  { name:'黑胡椒',   cat:'food', food:'season', price:70,
                        desc:'從河港運來的黑胡椒。研碎了香氣才出得來。' },
      season_limezest:{ name:'萊姆皮',   cat:'food', food:'season', price:40,
                        desc:'刨下來曬乾的萊姆皮。去油膩的一手。' },
      /* 禍魘素材（獵人兌換的獎勵；日後接九星配方）。⚠ 價格是我擬的草案。 */
      harm_claw_s:   { name:'禍魘的小爪', cat:'material', price:60,  desc:'小型禍魘的爪。泛著不祥的光。' },
      harm_claw:     { name:'禍魘之爪',   cat:'material', price:200, desc:'成體禍魘的利爪。堅硬異常。' },
      harm_bone_big: { name:'禍魘巨骨',   cat:'material', price:350, desc:'大型禍魘的骨。沉重而緻密。' },
      harm_bone_frag:{ name:'禍魘碎骨',   cat:'material', price:120, desc:'禍魘骨骼的碎片。仍殘留著微弱的脈動。' },
      harm_fang:     { name:'禍魘的細牙', cat:'material', price:80,  desc:'細小的禍魘牙。串起來像一條項鍊。' },
      /* ══ 木雅克神殿的掉落（ver -919，Ray 交表）══ ⚠ **價格與說明是我擬的草案**
         （表上只有名字與機率）：照既有素材的量級 —— 10% 的稀有品 200~400、
         100% 的必掉品 120~350。要改直接動這裡（鐵律 1：數值住在資料上）。
         ⚠ 「禍魘之爪」表上有，但**既有的 `harm_claw` 就是它**，不另開一筆（鐵律 7）。 */
      harm_bone:      { name:'禍魘之骨',   cat:'material', price:260,
                        desc:'成體禍魘的骨。比看起來輕，敲擊時會有餘響。' },
      bell_shard:     { name:'喪鐘碎片',   cat:'material', price:300,
                        desc:'鏽蝕的鐘體碎片。貼近耳邊仍聽得見很遠的一聲。' },
      saint_claw:     { name:'聖徒之爪',   cat:'material', price:220,
                        desc:'聖徒指端的角質。比鋼還硬，斷面像結晶。' },
      saint_fang:     { name:'聖徒之牙',   cat:'material', price:240,
                        desc:'聖徒的牙。齒根仍連著一小截未腐的組織。' },
      saint_bone_big: { name:'聖徒巨骨',   cat:'material', price:350,
                        desc:'大型聖徒的長骨。表面刻著看不懂的細密經文。' },
      saint_bone:     { name:'聖徒之骨',   cat:'material', price:400,
                        desc:'聖徒的骨。溫的 —— 明明已經不會動了。' },
      /* 夏爾森林獸掉落的素材（ver -860，改槍用）。⚠ 價格草案。 */
      tiger_horn:  { name:'虎王的獨角', cat:'material', price:400, desc:'森林之王額上的獨角。堅硬如鐵。' },
      crow_beak:   { name:'尖喙',       cat:'material', price:90,  desc:'食腐鴉的利喙。意外地鋒利。' },
      elf_antler:  { name:'精靈鹿角',   cat:'material', price:300, desc:'靈鹿的角。泛著淡淡螢光。' },
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
    /* ⚠ ver -1024（Ray：「G 改為金錢」）：畫面上一律印「金錢」。
       ⚠ 這是**唯一的真相**（鐵律 7）—— 結算頁、道具欄、商店、戰利品視窗都問
         `inv.moneyName()`／`items.moneyName`，改這一個字全部一起換。 */
    moneyName: '金錢',
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
      /* 杰羅的工坊（ver -870）：**不賣東西**（只有改槍分頁）——貨單是空的，
         這一格只為滿足「shop 都要有貨單」的資料契約。 */
      sv_workshop: [],
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
      /* ══ 北方泊地的兩家店（ver -655，Ray：「兩間店目前都與帝都功能相同」）══
         ⚠⚠ **貨單分開記帳**，不共用帝都那兩份：`script/shopstock.js` 的鑰匙就是
           這裡的鍵 —— 共用的話在帝都買空的東西，飛到北方泊地也是空的（那是兩家店）。
         ⚠ 內容照抄帝都（Ray 指定「功能相同」）。店主台詞說「物資都被徵調了、
           貨品有限」是**氣氛**，要真的砍貨單等 Ray 指定砍哪幾樣。 */
      np_grocery:  [ { id:'milk',     n:8 },
                     { id:'cheese',   n:5 },
                     { id:'lime_rum', n:3 },
                     /* ver -979（Ray：「然後這個也可以在北泊的商店買到」）——
                        送行那一份用掉之後還買得回來（第一道菜才不會變成死路）。 */
                     { id:'season_goatbutter', n:4 } ],
      /* 夏爾村雜貨街（ver -858）：小村規模，貨比城裡少。 */
      sv_grocery:  [ { id:'milk',     n:4 },
                     { id:'cheese',   n:3 } ],
      np_gunstore: [ { id:'Shotgun_Dragon', n:1 },
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
      /* ══ 北方泊地的兩家店（ver -655）══ 功能與帝都相同，差別只有**店主圖**與
         **貨單的鑰匙**（見上面 stock 的說明）。⚠ 射擊挑戰指的是這座城自己那一場
         （`np_range`，25 秒、要 200G）—— 最佳紀錄與帝都那一場也是分開的。 */
      np_grocery:  { title:'雜貨舖', art:'resources/SI/NPC_Grocery_SI_Northport.webp',
                     tabs:['buy','sell'] },
      /* ══ 夏爾村雜貨街（ver -858，Ray 交稿）══ 退休行商。`sale`＝一起經歷過
         魔獸圍城（safehouse_shinier）之後**商品打 9 折**（loot.js 只在買價乘，
         賣價不動）。 */
      sv_grocery:  { title:'雜貨街', art:'resources/SI/NPC_shinier_grocery_SI.webp',
                     tabs:['buy','sell'],
                     sale:{ need:'safehouse_shinier', mul:0.9 } },
      np_gunstore: { title:'武器店', art:'resources/SI/NPC_Gunsmith_SI_Northport.webp',
                     tabs:['buy','sell','mod'], tabName:{ buy:'買武器', sell:'賣武器', mod:'武器改裝' },
                     only:'weapon', compare:true,
                     challenge:'np_range', challengeLabel:'射擊挑戰' },
      /* ══ 杰羅的工坊（ver -866，Ray：「杰羅不賣槍，只改槍」「杰羅的工坊就是槍店」）══
         只有一個「改槍」分頁（賭博式改造，規則在 tuning.jeroMod；UI 在 loot.js 的
         jero 分頁）。不賣不買 —— tabs 沒有 buy/sell，貨帳也就不存在。 */
      sv_workshop: { title:'杰羅的工坊', art:'resources/SI/NPC_shinier_Gunsmith_SI.webp',
                     tabs:['jero'], tabName:{ jero:'改槍' } },
    },
  },

  tutorial: {
    storageKey: 'tivot.tutorialSeen.v1',
    enemyKey: 'trainee',   // 教學專用敵（enemies.trainee＝訓練用聖徒；combat.startGame 於教學啟動時換上）
    startDelayMs: 700,     // 開戰後多久插入第一段對話（ms）
    lineTypeMs: 30,        // 打字機每字間隔（ms）；點擊對話中先跳完整句、再點下一句
    // 教學戰鬥的規則調整（只在 tutorialActive 期間生效）：
    enemyAtkDamage: 2,     // 敵方所有攻擊（大絕/按錯/延時）基礎傷害一律此值；Defense 格擋再減半（=1）
    noAssaultBoards: 1,        // 前 N 盤敵人不發動大絕（第一盤純練清盤，第二盤起反擊教學）
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
    //   教學全程一次只出一顆（有紅點在場時暫緩下一發，見 tutorial.assaultSuppressed）。
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
    castTall: 176,           // 最高的角色身高（索菈娜）——全域一致，換人要一起改
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
      const N = ART.nouvelle, R = ART.renna, A = ART.anya, F = {};
      /* ⚠⚠ 索菈娜與夏爾村那三位**也要有取景值**（ver -928，Ray：「夏爾圍城時村民立繪
         又跑掉，不要放全身，比照主角們的比例位置」）—— -839 把他們加進 `cast`
         與 `tutPortraits`，卻**漏了這張表**：查不到就退回「圖框貼邊」的舊路
         （不鎖身高、不錨臉），畫面上就是一張**整張的全身圖**貼在邊上，
         與旁邊鎖過身高的主角組完全不同尺。 */
      const S = ART.sorana, V1 = ART.sh_villager, V2 = ART.sh_villager2, C = ART.sh_chief;
      /* ⚠ 取景值一律**抄 `ART`**（speakers.js 量的那一份，鐵律 7）——
         不要在這裡另填一組數字。`cm` 在角色那一層、expr 只帶 top/bot/fx，所以合起來。 */
      /* ⚠ `cm` 與 `fxShift` 在**角色**那一層、`expr` 只帶 top/bot/fx，所以要合進來
         （`fxShift` ver -645：整個角色往左右挪的手調位移，見 speakers.js）。 */
      /* ⚠ `standCm` 與 `cm` 一樣住在**角色**那一層（ver -705），要一起帶進來。 */
      const put = (key, A, v) => { F[key] = Object.assign({ cm:A.cm, standCm:A.standCm, fxShift:A.fxShift }, v || A); };
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
      /* 北方泊地的聖徒化教學戰（ver -599，Ray 交稿）用到的差分。
         ⚠ 取景值一樣抄 `ART`（speakers.js 量的那一份，鐵律 7）。 */
      put('tut_renna_thinking',     R, R.expr.thinking);
      put('tut_renna_ask',          R, R.expr.ask);
      put('tut_renna_shout',        R, R.expr.shout);
      put('tut_nouvelle_saintinstall', N, N.expr.saintinstall);
      /* 禍魘娜塔莉戰（ver -671，Ray 交稿）用到的差分。 */
      put('tut_anya_terrifying',    A, A.expr.terrifying);
      put('tut_anya_ni',            A, A.expr.nightmareinstall);
      /* 夏爾村村戰的四位（ver -928）：索菈娜兩張差分＋三位村民的基本立繪。 */
      put('tut_sorana',             S);
      put('tut_sorana_guardtalk',   S, S.expr.guardtalk);
      put('tut_sorana_ready',       S, S.expr.ready);
      put('tut_sh_villager',        V1);
      put('tut_sh_villager2',       V2);
      put('tut_sh_chief',           C);
      return F;
    })(),
    cast: {
      inspector: { name:'芙蕾雅', image:'inspector_freya', side:'left',  fit:{ zoom:1,    drop:10 } },
      partner:   { name:'蕾妮',   image:'partner_renee',   side:'right', fit:{ zoom:0.82, drop:0 } },
      /* 劇情版教學的唯一說話者。⚠ 站**左**：與地宮那一幕同側，玩家的空間記憶才連得起來
         （CLAUDE.md §6.5：同一個人每次都站同一邊）。 */
      /* ⚠⚠ 「這張畫能不能水平翻」寫在 **`speakers.js` 的 `ART[key].mirror`**（ver -625
         由這裡搬過去）—— 那是**這個角色的立繪**的性質，劇情頁與戰鬥對白共用一份
         （鐵律 7）。這裡只寫「戰鬥對白把她擺哪一邊」（`side`），那是兩件事。 */
      nouvelle:  { name:'諾薇兒', image:'tut_nouvelle',    side:'left',  fit:{ zoom:0.92, drop:6 } },
      /* 蕾娜（ver -429，船艦戰的戰鬥內對白）。
         ⚠⚠ 站**右**：她與諾薇兒在 `speakers.js` 裡**都是左**（左 蕾娜・諾薇兒），
           兩個人同台會一直互相擠掉 —— 這是 §6.5 那條「一幕裡只有兩個人又剛好同側時
           可以整幕覆寫」的同一個情形。船塢那一幕（`sides:{RENNA:'R'}`）已經把她擺右，
           這裡跟著同一個安排，玩家的空間記憶才連得起來。 */
      renna:     { name:'蕾娜',   image:'tut_renna',       side:'right', fit:{ zoom:0.92, drop:6 } },
      /* 夏爾村村戰的戰鬥內對白（ver -839）：索菈娜站左（搭檔側，ART.sorana.mirror
         會自己翻），村民村長站右（對面的人在右）。 */
      sorana:      { name:'索菈娜', image:'tut_sorana',       side:'left',  fit:{ zoom:0.92, drop:6 } },
      sh_villager: { name:'村民',   image:'tut_sh_villager',  side:'right', fit:{ zoom:0.92, drop:6 } },
      sh_villager2:{ name:'村民',   image:'tut_sh_villager2', side:'right', fit:{ zoom:0.92, drop:6 } },
      sh_chief:    { name:'村長',   image:'tut_sh_chief',     side:'right', fit:{ zoom:0.92, drop:6 } },
      /* 安雅（ver -671，禍魘娜塔莉戰）。⚠ 站**右**（`speakers.js` 的本位）——
         她與蕾娜同台時蕾娜本來就在右…… 所以這一場**蕾娜讓到左**：
         §6.5 的表「蕾娜原則右，碰到安雅就放左」。 */
      anya:      { name:'安雅',   image:'tut_anya_terrifying', side:'right', fit:{ zoom:0.92, drop:6 } },
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
      /* ⚠ 「太早了！看清楚一點！」Ray 指定**刪除**（ver -728）。
         ⚠ 空陣列是**有意義的**：`onEarlyBlock` 看到空的就跳過台詞、**直接重放
           反擊圈** —— 不要把這個鍵整個拿掉，留著才看得出「這裡本來有一段」。 */
      early: [],
    },
    steps: [
      // 第一盤：純清盤教學（noAssaultBoards=1 → 敵人不出大絕）
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
      /* ⚠⚠ **箭頭指著那個光圈、點掉才放行**（ver -938，Ray：「雪鐵龍箭向上指反擊圈，
         點擊發動」）—— 以前這一段只有台詞、沒有箭：第一次看到光圈的人不知道那是可以
         點的東西，而畫面又是凍結的，讀起來像卡住。
         ⚠ 閘門寫在**共用的步驟**上（劇情版與首頁教學版同一套流程，只有台詞分兩份）
           —— 那正是 tutorial.js 檔頭那條「只換台詞，不換流程」。
         ⚠ 完成＝**點掉那顆光圈**（tutorial.onThreatResolved 收門），不是點畫面。 */
      { trigger:'threat', gate:{ type:'threat', immediate:true }, lines:[
        { who:'partner',   text:'光圈會越縮越小——太早出手雖然擋得下來，但反擊的傷害很有限！' },
        { who:'partner',   text:'等光圈收得夠小、時機正確，反擊才真的打得痛！' },
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
    /* ── 教學專屬結算（inspector.tutorialSettle 讀取；tutorialRun 旗標存續到結算）──
     *  ver -358 起教學結算**無監察官、不評等級**（Ray 指定），台詞欄位
     *  （usedLifeReturn／noLifeReturn／outro／buttonLine）已隨舊版 applyTutorialResult
     *  一併清掉（ver -567 清死碼）。⚠ 這一塊開機時被 i18n 整包蓋掉（i18n.js 的
     *  `tut.result={...L.tutorial.result}`）——改欄位要連 i18n 三份一起改。 */
    result: {
      buttonLabel:    '繼續',            // ver -361：教學結算是「往下走」不是「離場」
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
   *  ⚠ 這一段是**舊百分制**的說明，已於 ver -600 退役（見下方 `rating` 的新註解）。
   *  設計新敵人只要給 hp，評價門檻即自動跟著調整。
   *  無傷 gate：hitsTaken===0 → 直接判 S（凌駕分數）。
   * ------------------------------------------------------------------ */
  /* ══════════════════════════════════════════════════════════════════════
     評價（ver -600 改寫；-604 收斂成**單一係數**）
     ──────────────────────────────────────────────────────────────────────
     Ray：「我只要一個單一係數，用來把時間轉換成分數的係數，
           我先從單一係數來調整難度。」

     ── 算式（只有這一份，`inspector.evaluate()` 實作）───────────────────
         用時  ＝ 實際戰鬥秒數 ＋ 失誤秒 − 獎勵秒　　（夾在 0 以上）
         分數  ＝ 100 −（用時 ÷ 敵人總血量）×  timeK
         等第  ＝ 分數對照 `tiers`（S 80／A 65／B 50／C 35／D 兜底）

     ⚠⚠⚠ **要調難度就只動 `timeK` 這一個數字。**
       它就是「把時間換成分數」的比例：**調大＝更嚴**（同樣的時間扣更多分），
       調小＝更寬鬆。其餘兩組（`penalty`／`tiers`）是形狀，平常不必動。
     ⚠ 為什麼除以敵人總血量：血厚的怪本來就要打比較久（Ray：「現在都用 hp 來控」）
       —— 除掉之後 `timeK` 對每一種怪的意義才一致，一個數字就管得動全部。
     ⚠⚠ 分母是**真的遭遇到的敵人**的血量總和（ver -606，Ray：「血量總和是以遭遇
       的敵人為總和，地圖上有而未遭遇的不算」）：
         · 單敵的插入戰 → 就是那一隻（`state.enemyMax`）
         · 連戰序列    → 只加到 `lineupIndex` 指到的那一隻（`runTotalHp()`）
         · 城鎮戰的一張地圖 → 逐場累加，**打過的才進帳**（`bankSessionGain`）
       把地圖上還沒走到的怪也算進去的話，分母變大＝等第被灌水。
     ⚠ **Boss 沒有任何額外加成**（ver -602）：難度用牠的 `hp` 表達。
     ⚠ **沒有 E**（Ray 指定）：`tiers` 最後一級是兜底。
     ⚠⚠ **「一場」的定義**（ver -611，Ray）：**槍棺上彈 → 蕾娜評價**。
       中間走幾格、打幾隻都算同一場 —— 用時與失誤加總後**評一次**（不是各場各評），
       資源（HP／聖徒化／主動技／破防值）也連著算。收段之後才是新的一場：
       **HP 回滿、破防值歸零**（`combat.endSession`）。
       實作就是 `config.battles[].session`／`sessionEnd`（§6.5.4.3）。
     ══════════════════════════════════════════════════════════════════════ */
  rating: {
    /* ⚠⚠⚠ **唯一要調的數字**。分數 = 100 −（用時秒 ÷ 敵人總血量）× timeK。
       以 300 血為例（timeK 550）：
         11s → 80 分 S　　19s → 65 分 A　　27s → 50 分 B
         35s → 35 分 C　　46s → 15 分 D
       ⚠ 換算：S 要 `用時 ÷ 血量 ≤ 0.036`（每 100 血 3.6 秒）、A ≤ 0.064、B ≤ 0.091。
       ⚠⚠ **「用時」是含失誤／獎勵折算之後的內部值**；畫面上的「戰鬥用時」
         一律顯示**實際秒數**（ver -610，Ray 指定）。
       調大＝更嚴、調小＝更寬鬆。 */
    timeK: 400,
    /* 失誤／表現折算成秒（Ray 指定）。⚠ **負數＝減秒**（獎勵）。
       ⚠ 這是「形狀」不是難度旋鈕 —— 先調 `timeK`，這一組通常不必動。
       ⚠⚠ **`overkill` 不折秒**（ver -659，Ray：「OVK 還是不能算時間，否則不公平，
         因為 ovk 的量幾乎隨機」）—— ver -611 的「一格減 0.1 秒」已推翻：
         那個量取決於最後一擊溢出多少與敵人剩多少血，**不是玩家控制得了的**，
         折成秒數等於把隨機數寫進等第。⚠ **overkill 那一段照樣計時**（-611 那半條
         留著）、**EXP 照樣給**（`exp.overkillExp`）—— 它是「打爽的」不是「打好的」。
         ⚠ 欄位留著寫 0 不刪：日後要改回來只動這一個數字。
       ⚠⚠ `perfectBoard` ＝**完美清盤一盤折 1 秒**（ver -659，Ray 指定）。
         它與 overkill 正好相反：「這一盤沒點錯也沒被打到」是玩家**每一盤自己決定**
         的事，不隨機，所以折成秒數是公平的。條件＝`state.boardClean`
         （與清盤獎勵聖能同一個，鐵律 7）。 */
    /* ⚠ `execution` ＝以 **EXSECUTIŌ（處刑）** 收尾、`maxBurst` ＝以 **Maximum Burst**
       收尾（沒擊殺那一種）。兩者都是**一次性**折抵，**不乘次數**
       （它們是「這一場有沒有發生過」），而且**互斥**：擊殺的那一次是處決。
       ⚠ 秒數 ver -675 由 Ray 改定：MB −10、處決 −15（原本處決是 −5）。
       ⚠⚠⚠ **折得重是刻意的，不要「平衡」掉它**（ver -676，Ray：「處決的發生率
         本來就不高，而且聖徒／夢魘既然高風險高回報，那就要在評價上也表現出來」）——
         處決要在倒數槽推滿前清完整盤而且那一擊剛好致死；而聖徒化／惡夢化本身
         就是拿 OBE／熔斷換來的。要調難度動 `timeK`，不要回頭削這兩項。
       ⚠⚠ 「小場＝好賺」是誤讀（ver -678，Ray）：小場多半是 BOSS 那種血戰，
         在那裡開得出聖徒化就代表被逼到**慘勝**；而監察官評的本來就是
         **主角對聖徒化的適性** —— 這不是數值上的例外，是這套評價的本意。
       ⚠ 惡夢化清空殘格也算 MB（Ray：「同 SI 的 MB」）。 */
    /* ══⚠⚠ 等第 → 好感（ver -723，Ray：「評價A好感度也給一半。跟別人相反的
       索菈娜則是評價D＋1 評價C+0.5」）══════════════════════════════════════
       -557 只有「S +1／索菈娜 C 以下 +1／蕾娜四次 S +1」，這一版把**次一級**
       也算進去，一律**給一半**：
       ⚠⚠ **ver -724 全面 ×2**（Ray：「好感度上限改成100，原本+1的地方變成+2，
         +5的變+10就解決了，每20一個tier」）—— 上限 50→100、一段 10→20，
         所有給好感的地方一律加倍。加倍的好處正是這個：蕾娜的 +0.125 本來會被
         `addAffection` 的 1/4 對齊吃掉，×2 之後變 +0.25，剛好落在格子上。
         · 搭檔（諾薇兒／安雅）  S **+2**、A **+1**
         · 索菈娜（方向相反）    D **+2**、C **+1**
         · 蕾娜（不是搭檔，最難） S **+0.5**、A **+0.25**
       ⚠ 沒有 E 那一格（Ray 指定沒有 E，`tiers` 最後一級是兜底）。 */
    /* ⚠⚠ **ver -970：打開了**（Ray：「現在重新把 exp 放回去」）—— -725 關掉它的
       理由是「等有了等級系統再打開」，那個系統就是這一版的女主九級（`girls`）。
       ⚠ **兩個顯示點都問這一支**（結算頁與戰利品視窗，鐵律 8）。 */
    showExp: true,
    /* ══⚠⚠ **Boss 的加成**（ver -1024，Ray：「boss 經驗 2 倍錢 2.5 倍」）══
       「這一場是不是 Boss」問**敵人卡的 `boss`**（每一張卡都有那一格，同 `story`／
       `counterStagger` 的作法）；判定與相乘只有 `inspector.bossMul` 一處（鐵律 7）。
       ⚠ 連戰整段以**收段那一場**（帶 `sessionEnd` 的那隻）為準 —— 結算是那一場的事。 */
    bossMul: { exp:2, money:2.5 },
    affection: {
      partner: { S:2, A:1 },
      /* ══⚠⚠⚠ ver -1024（Ray：「索拉娜只要出場就會好感+1，D＋3 C+2」）══
         · `always` ＝**只要出場就給**（不看等第）—— 她的性格是「打得爛也開心」，
           所以連保底都給；別人沒有這一格（沒寫＝0）。
         · `D`／`C` 是**在那之上再加**：D 總共 +4、C 總共 +3、其餘 +1。
         ⚠ 加總只有 `progress.applyRankAffection` 一支在做（鐵律 7）——
           不要把 `always` 併進每一格（那會變成「同一個保底寫了五份」）。 */
      sorana:  { always:1, D:3, C:2 },
      renna:   { S:0.5, A:0.25 },
    },
    /* ⚠⚠ `counter` 是**每一次完美反擊（紅圈）**折抵的秒數 —— 武器卡上可以覆寫
       （`weapons[].counterSec`，ver -721：狙擊 −3，Ray 指定）。狙擊的黃橘圈都要挨傷、
       只有紅圈有回報，折得重一點才對得上那個風險。
       ⚠⚠ **只有紅圈算**（ver -721 修）：-706 之後黃圈與橘圈也會呼叫 `weaponCounter`，
         而計數掛在那裡 —— 於是「完美反擊」把三帶全算進去，一次威脅折 1.5 秒而不是
         0.5 秒，等第被灌水。判定只有 `defense` 分得出帶（同明晰之夢那一條，鐵律 7）。 */
    /* ══⚠⚠⚠ **錢＝敵人血量 × 評價**（ver -950，Ray：「money 簡易化，一概取用
       敵 hp x 評價：S 90% A80% B70% C60% D50%」）══
       ⚠⚠ **連戰是用整局併帳後的等第算一次**（Ray 定案）—— 血量取 `stats.totalHP`
         （中間幾場已經由 `bankSessionGain` 加總），等第取那一次併完的評價。
         逐隻各算一次再相加是另一件事（等第會失真，同 -601 對分數的那一條）。
       ⚠ 取代了兩套舊寫法：敵人卡的 `money.hpRatio`（逐卡的隨機區間）與
         `battleLoot.money` 的逐場擲骰 —— 同一筆收入三個來源，調起來永遠對不準（鐵律 7）。
       ⚠ 沒有 E 了（`tiers` 是 S/A/B/C/D 五階，D 接住所有人）。查不到就當 D。 */
    moneyByGrade: { S:0.9, A:0.8, B:0.7, C:0.6, D:0.5 },
    /* ⚠ `coop` ＝**獵手的共鬥發動一次加 20 秒**（ver -958 立 5、-959 改 10、
       **-1002 由 Ray 改 20**：「每一次使用共鬥，評價 +20 秒」）——
       正號是刻意的：共鬥期間**無敵**，那一段本來就好打，評價要把它還回去
       （同索菈娜搭檔卡上的 `timeKBonus`）。它是這張表裡唯一「用了技能反而變嚴」的項。 */
    penalty: { wrong: 2, assault: 3, block: 1, delay: 1, counter: -0.5,
               overkill: 0, perfectBoard: -1, maxBurst: -10, execution: -15, coop: 20 },
    /* ══⚠⚠ **整場無傷 ＝ 等第下限**（ver -626，Ray：「無傷基本讓他保證 S」）══
       ver -620 是「折 10 秒」，已推翻 —— 定額折秒的份量被**場的大小稀釋**：
       同樣 10 秒在 300 血的場值 16.7 分、在 1500 血的城鎮戰只值 3.3 分（五倍差），
       而「保證 S」是一句**等第**的宣告，用等第表達才不會被場的大小改寫。
       ⚠ 判定是 `stats.hitsTaken===0` —— 而 `hitsTaken` 已經把**腳本演出的擊數**
         扣掉了（劇情殺三連擊，見 combat 的 `_scriptedHits`），
         所以「除了劇情殺之外沒被打到」照樣算無傷（Ray 指定）。
       ⚠⚠ **無傷是個很硬的條件**：全程不點錯、不逾時、每一發大絕都完美防禦或反擊
         —— 任何一項破功就掉血，`hitsTaken` 就不是 0 了。
       ⚠ **不必另外加「太慢就不給」的上限**：大絕每 4~8 秒一次，拖得越久要連續完美的
         次數越多（拖到 200 秒約要連過 33 次）—— 無傷這個條件**本身就隨時間變難**，
         慢慢磨的漏洞是自限的。多加一條時間上限只是多一個要調的數字。
       ⚠ 分數一起抬到那一級的門檻（EXP 由分數算，等第與 EXP 不該互相打架，鐵律 7）。
       ⚠ 寫等第代號不寫 80：門檻在 `tiers` 上，那裡改了這裡要跟著對（鐵律 7）。 */
    flawlessFloor: 'S',
    /* 等第門檻（分數下限，由高到低）。⚠ 同上：形狀，不是難度旋鈕。
       ⚠ 最後一級 D 是 0 ＝ 兜底，所以永遠評得出等第、而且**沒有 E**。 */
    tiers: [
      { grade: 'S', min: 80 },
      { grade: 'A', min: 65 },
      { grade: 'B', min: 50 },
      { grade: 'C', min: 35 },
      { grade: 'D', min:  0 },
    ],
    exp: {
      mult: 8.7,          // 非整數倍率，避免整齊倍數
      offset: 137,        // 質數基底，保證三位數起跳
      overkillExp: 3,     // 每點 overkill 額外 +3 EXP（EXP 展示用，不影響評價）
      jitterMod: 7,       // 用分數尾數做微擾，讓 EXP 數字不整齊
      /* ══⚠⚠⚠ **索菈娜的 EXP 方向相反**（ver -970，Ray：「如果是索拉娜拿 exp
         也就是 Rank 越低 exp 越高，跟其他兩人反過來」）══
         作法是**把分數鏡射**（`100 − 分數`）再走同一個式子（鐵律 7：不要另訂一條
         公式）—— 所以她的 D 約 1000、S 約 137，與另外兩位剛好對稱。
         ⚠ 這與好感那邊是**同一個性格**（`affection.sorana` 是 `{D:2, C:1}`，
           而 `affection.partner` 是 `{S:2, A:1}`）—— 一個角色一套方向，
           不要讓 EXP 與好感各講一套。
         ⚠⚠ **所以 EXP 是「逐個收款人各算一次」的**：同一局裡諾薇兒與索菈娜平手
           均分時，兩人各拿**自己那條公式**的一半，不是同一個數字對切。
           計算只有 `inspector.expForWho()` 一支（鐵律 7）。
         ⚠ 用名單不用布林：日後再有一位反向的角色就加進來（同 `except` 的寫法）。 */
      invertFor: ['sorana'],
      /* ══ 升級的聲音（ver -1033，Ray：「升級播放 se_lvup…同時各角色語音」）══
         SE 是**全域**的一聲（誰升級都一樣），角色語音在各自的搭檔卡上
         （`partners[who].levelUpVoice`）—— 兩層同時播，播放只有
         `inspector.levelUpSound()` 一支（鐵律 8）。 */
      levelUpSe: 'se_lvup',
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
  enemies: ENEMIES,
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
    /* ⚠⚠ `special:true`（ver -698，Ray：「城鎮偶有特殊戰（賞金獵人挑釁、抓賊等
       非戰鬥探索），戰敗就後送旅店。特殊戰原則上不可重覆挑戰、過了就沒了，
       所以沒有劇情 flag 問題」）—— 戰敗**一次就送旅店**（不計連敗、不回檔）。 */
    /* ⚠⚠ `noEvalBeforeStage:2`（ver -729 原是 noEval:true；**-756 Ray 改**：
       「帝都賞金獵人戰如在 stage2 才打，就要放蕾娜評價」）——
       stage 0/1 打＝她還是「監察官」，不評（-729 的理由）；玩家拖到出航之後
       （stage2+）才回頭打，她已經在結算頁講評了，這一場照評。
       判定在 inspector.pickEvaluator（問結算那一刻的 stage，唯一讀點）。 */
    /* ⚠ ver -1060（Ray：「賞金獵人戰被加了一條沒有評價的註解，把它拿掉」）：
       `noEvalBeforeStage:2` 撤掉 —— 回到 -670 的通則「預設就有評價」。 */
    guild_hunter: { enemy:'guild_hunter', special:true, noSaint:true, noPartner:true },
    /* 北方泊地的城鎮戰（ver -583）：每一格走進去打一場，共用這一張佔位卡。
       ⚠ **不禁聖徒化／搭檔技**：Ray 沒說要禁（禁了要明寫 noSaint/noPartner）。
       ⚠ 打輸走一般流程 —— 城鎮插入戰的敗北會被抬回這座城的旅店（§6.5.2 那張表）。
         ⚠ 北方泊地的旅店還沒掛 `inn:true`，所以現在會退回「上次睡覺的旅店」
           （帝都）。要讓他被抬回這裡的旅店，得先把北方泊地的旅店大廳接起來。 */
    /* ⚠⚠ `session` ＝**整張戰鬥地圖算同一場**（ver -585，Ray：「城鎮戰內打掉一個怪
       不用閉棺，打掉 Boss 才閉，戰鬥地圖中移動期間算同一場，hp／聖徒化次數／
       主動技發動次數／破防值算同一場」）。同一段之內：開棺只演第一次，
       聖徒化／搭檔主動技／破防值不回滿（HP 本來就延續）。
       ⚠ **Boss 那一場要寫 `sessionEnd:true`** —— 打贏它才收段（＝閉棺、資源回滿）。
         Boss 的卡 Ray 還沒給，所以現在這一段**沒有出口**：五格打完段落仍開著，
         直到回首頁（`goHome`）才收。卡一到就補一張 `{…, session:'np_siege',
         sessionEnd:true }`。 */
    /* ⚠ `enemy` 是**陣列**＝這一場隨機抽一隻（ver -596）。抽的實作只有
       `combat.startGame` 的 `pickBattleEnemy()` 一支（鐵律 8）。 */
    np_harm: { enemy:['np_candletower','np_candlepenitent','np_coralman','np_reassembled'],
               session:'np_siege' },
    /* 教堂的 Boss（ver -586）：同一段連續戰鬥的**最後一場** ——
       `sessionEnd` ＝打贏它才閉棺、聖徒化／主動技／破防值回滿。 */
    np_boss: { enemy:'np_boss', session:'np_siege', sessionEnd:true },
    /* ══ 夏爾村村內戰（ver -802，Ray 交稿）══════════════════════════════════
       整張圍城算一場（`session:'shinier_siege'`）：格與格之間開棺原地開/關、
       hp／聖徒化／主動技／破防值不回滿。**收尾格＝野外那格**（`sv_wild`，
       `sessionEnd`）——Ray：「夏爾村 seige 無 boss…打到野外為止」，所以沒有一場
       戲劇性的 Boss，野外那格（熊骸）打完就閉棺、結算、解除圍城。
       ⚠ **搭檔強配索菈娜是在劇情設的**（ver -804，Ray：「在前一段劇情就先設置，
         出戰之前」）—— `storyPartnerBy` 的 `sv_night_done` 分支（那一夜演完就切她）。
         所以這裡**不寫 `partner`**（單一真相在 storyPartnerBy，不在戰鬥卡）。
       ⚠ 祭壇那格（`sv_altar`）是「最硬的一般格」，**不是 sessionEnd**（打不打隨
         玩家，走西側直接到野外可跳過）。 */
    sv_beast: { enemy:['sv_wolf_pack','sv_beast_organ','sv_stag','sv_beast_shackle'],
                session:'shinier_siege',
                /* ══ 村民的戰前對白（ver -839，Ray：「進入第一場戰鬥以後才發生，
                   有背景，有怪才開始對話」）══ 掛 battleStart（§6.5.2 的 talk）——
                   拓撲上第一場一定是東側（索菈娜家唯一的出口）。
                   ⚠⚠ `talkOnce` 是**卡層**的欄位（combat 的勝利收尾與 startBattleTalk
                   讀的都是 `sb.talkOnce`）——ver -839 一度寫進段落裡，引擎讀不到，
                   於是每一格都重講（Ray：「怎麼每打一次怪都出一次村民對話？」）。 */
                talkOnce:'sv_siege_talk',
                talk:[ { trigger:'battleStart', lines:[
                  { who:'sh_villager',  img:'tut_sh_villager',    text:'是……是獸骸！' },
                  { who:'sh_chief',     img:'tut_sh_chief',       text:'！！' },
                  { who:'sh_chief',     img:'tut_sh_chief',       text:'擋下來！絕不能讓牠們踏進村子一步！' },
                  { who:'sh_villager2', img:'tut_sh_villager2',   text:'不行！太多了！' },
                  { who:'sh_chief',     img:'tut_sh_chief',       text:'可惡！' },
                  { who:'sorana',       img:'tut_sorana_guardtalk', text:'盡量別殺！往森林裡趕！' },
                  { who:'sorana',       img:'tut_sorana_ready',   text:'要上了！' },
                ]} ] },
    sv_altar: { enemy:'sv_reliquary', session:'shinier_siege' },
    sv_wild:  { enemy:'sv_bear', session:'shinier_siege', sessionEnd:true },
    /* ══ 夏爾森林野生遭遇（ver -862；-869 掛 session）══
       由 modules/town.js 的 `wildActDue` 依 `shinier_forest.wildSpawn` 派場。
       ⚠⚠ **進野戰地圖＝「一場」**（ver -869，Ray：「進入野戰地圖以後就算一場，
       打到地圖結束才結算——夏爾森林打到斷崖邊的敵人消滅才算結束。戰利品也是
       到那個時候結算」）：全部掛 `session:'sf_wild'`，斷崖那隻（鹿骸，日夜兩張卡）
       ＝`sessionEnd`。中間場不結算、掉落與錢由 bankSessionGain 記帳、
       資源（HP/聖徒化/主動技/破防）整場連著算、格間原地開閉棺 —— 全是既有的
       session 機制（§6.5.4.3）。
       ⚠ 中途離開地圖＝收段不結算（帳與掉落作廢）——同城鎮戰半途離場的既有語意。
       ⚠⚠ **沒有 `sf_deer` 這一場**（ver -878，Ray：「鹿主不變異是不會有戰鬥的」）：
         未變異的樹靈鹿主是**演出**（中景 cgBack）不是敵人 —— 打得到的只有黃昏分支
         變異之後的 `sf_deer_nightmare`。-870 曾有一張 `sf_deer` 戰鬥卡＋遺跡入口的
         必出設定，兩者已一起撤掉；敵人卡 `enemies.sf_deer` 也同步撤。 */
    sf_lynx:           { enemy:'sf_lynx',           session:'sf_wild' },
    sf_snake:          { enemy:'sf_snake',          session:'sf_wild' },
    sf_hog:            { enemy:'sf_hog',            session:'sf_wild' },
    sf_tiger:          { enemy:'sf_tiger',          session:'sf_wild' },
    sf_crows:          { enemy:'sf_crows',          session:'sf_wild' },
    sf_bear_husk:      { enemy:'sf_bear_husk',      session:'sf_wild' },
    sf_bear_nightmare: { enemy:'sf_bear_nightmare', session:'sf_wild' },
    sf_stag_rot:       { enemy:'sf_stag_rot',       session:'sf_wild', sessionEnd:true },
    sf_stag_nightmare: { enemy:'sf_stag_nightmare', session:'sf_wild', sessionEnd:true },
    /* ══ 木雅克神殿的野生遭遇（ver -919，Ray 交表）══
       全部掛 `session:'ruins_wild'`（同森林那一批：進圖＝一局，資源連著算、
       中間場不結算、格間原地開閉棺）。**三隻是結算怪**（`sessionEnd`）——
       鳴鐘者（開門事件後的巨像廳）、監查者（黑暗斷橋）、BOSS 節制（深部祭壇）：
       打贏牠就閉棺結算、收掉這一局。
       ⚠ 這張圖另外有三個**安全點**（前廳／深部祭壇／命之泉，ver -918）：
         走進去也會閉棺結算 —— 兩條路都收在同一個 `endSession`（鐵律 8）。
       ⚠ 巨型聖徒（劇情中第一隻）是**劇情戰**：`storyBattle` 寫在那一段 act 上
         （script/town.js 的 `wildSpawn.encounters`），不寫在卡上 —— 同鹿主那一場。 */
    ruins_bonemaw:      { enemy:'ruins_bonemaw',      session:'ruins_wild' },
    ruins_halo_ring:    { enemy:'ruins_halo_ring',    session:'ruins_wild' },
    ruins_heartripper:  { enemy:'ruins_heartripper',  session:'ruins_wild' },
    ruins_bellwalker:   { enemy:'ruins_bellwalker',   session:'ruins_wild' },
    ruins_saint_prison: { enemy:'ruins_saint_prison', session:'ruins_wild' },
    ruins_saint_thug:   { enemy:'ruins_saint_thug',   session:'ruins_wild' },
    ruins_bellreacher:  { enemy:'ruins_bellreacher',  session:'ruins_wild', sessionEnd:true },
    ruins_saint_inspector:{ enemy:'ruins_saint_inspector', session:'ruins_wild', sessionEnd:true },
    /* BOSS。⚠ 曲子還沒指定（Ray 沒說），沒寫＝走 main 的 battleBgmOf 預設。 */
    ruins_saint_temperance:{ enemy:'ruins_saint_temperance', session:'ruins_wild', sessionEnd:true },
    /* 鹿主變異（ver -870，G 稿的黃昏後分支）：劇情戰、自己一場（斷崖已收段）。 */
    sf_deer_nightmare: { enemy:'sf_deer_nightmare',
      /* 與異化那一段**同一首**（ver -877，Ray：「戰鬥用同一首」）——卡上明寫最優先，
         同曲重播由 playBgm 擋掉＝開打不換曲（同 man_sorana/whirlwind 的作法）。 */
      bgm:'bgm_lostplace',
      /* ══⚠⚠ 打完接回**這張圖的曲子**（ver -913，Ray：「鹿主戰結束後 BGM 換回
         森林用的」）══ 戰前那一首是異化那一段的 `lostplace`（跨句的持續狀態），
         所以「接回戰前」在這一場是錯的答案。
         ⚠ `'@town'` ＝現在站的那張圖的 `bgm`（`story.resumeFrom` 解，town 那邊
           只有 `townBgm()` 一個計算點）—— **不要在這裡寫死 `'misty'`**：
           森林那一首是暫代的（Ray：「森林曲後換」），寫死就是同一個量兩份真相（鐵律 7）。
         ⚠ 只有打贏才換（`resumeFrom` 那一條規矩）：戰敗要再打一次。 */
      bgmAfter:'@town' },
    /* ══⚠⚠ 瓦礫中的紫黑之爪 ＝ **聖徒化教學戰**（ver -595，Ray 交稿）══
       腳本節奏：BOSS HP ≤30% → 劇情殺（主角 HP 歸零）→ 諾薇兒「我準備好了，現在
       聖徒化！」→ 雪鐵龍教學**右滑**發動聖徒化 → 聖徒化戰鬥 → 血回 99% 自動觸發
       **主動技教學**（上滑生命歸還）→ 諾薇兒倒下 → 打完。
       ⚠⚠ **那一整套的機制還沒接** —— 現有的教學系統（`config.tutorial`）本來就有
         右滑／上滑那兩個閘門與劇情殺，但那是「首次出陣」那一場的腳本；
         這一場要的是**同一套機制、不同的稿與觸發條件**（門檻是 BOSS 血量而不是盤序）。
         接法要 Ray 拍板（沿用 tutorial 的腳本格式再加一組？還是走 battles 的 `talk`
         加上血量觸發？），所以現在這一場**只是一場普通的 Boss 戰**。
       ⚠ 不禁聖徒化／搭檔技：這一場的重點就是教它們。
       ⚠ 不掛 `session` —— 城鎮戰那一段已經在祭壇獸那一場收掉了，這是新的一場。 */
    np_claws: { enemy:'np_claws', bgm:'bgm_crimson',   // BOSS 專屬曲（ver -614，Ray 指定）
      /* 打完換回 Suspense6（ver -631，Ray：「黑爪戰完 bgm 換 Suspense6」）——
         不接回戰前那一首（Crimson Moon 是這一戰的曲子，安雅那一段要的是餘韻）。
         ⚠ 只有打贏才換（戰敗要再打一次，見 story.resumeFrom）。 */
      /* ⚠ 這裡的鍵走**劇情層那張表**（`story.js` 的 `BGM_ALIAS`／`BGM_FILES`），
         不是 `ASSETS` 的鍵 —— `resumeFrom` 是用 `story.ensureBgm` 播的。
         寫成 `bgm_suspense` 查不到（ver -637 抓到，-631 起一直是啞的）。 */
      bgmAfter:'suspense',
      /* ⚠⚠ **這一場的整幕站位覆寫**（ver -619，Ray：「諾要永遠站右側」
         ＋「人物要分站兩邊，如果同邊換人要用抽牌輪轉」）。
         寫在**場**上不是逐段寫：逐段寫必然漏掉其中一段，而站位錯了就是
         「同一個人一下左一下右」（§6.5 固定站位）。段落自己的 `sides` 仍可覆寫。
         ⚠⚠ **兩個人一定要分兩邊**：諾薇兒被指定站右，蕾娜（`cast.renna` 預設也是右，
           那是船艦戰的安排）就必須讓到左邊 —— 同側就是「同一個槽換人」，
           換人只能靠抽牌輪轉，一句一換讀起來很忙（§6.5）。
         ⚠ 蕾娜的立繪本來就是朝左側畫的（`ART.renna.side:'L'`），擺左不必翻。
           諾薇兒站到非預設側，由 `cast.nouvelle.mirror` 水平翻轉。 */
      talkSides:{ nouvelle:'right', renna:'left' },
      /* ══⚠⚠ **聖徒化教學戰**（ver -599，Ray：「戰鬥卡的 talk 加血量觸發，
         反正這個怪只會出現一次」）══ 走的是教學那一支對話實作（鐵律 8），
         但**這不是教學**（`tutorialActive` 一律不碰，同 §6.5.2「框是共用的」）。
         節奏（ver -619 依 Ray 改寫：「敵 hp 50% 以下時觸發劇情殺把主角三擊清零，
         一定要三擊，在三擊發生前讓蕾娜喊『小心！』；主角 hp 被清零後發動即死防禦，
         然後才進聖徒化教學」）：
           BOSS ≤50% → 蕾娜「小心！」→ **三連擊**打到 0 → **即死防禦**接住（cut-in）
           → 諾薇兒喊聖徒化 → **右滑**發動 → 聖徒化戰鬥
           → 血回 99% → 諾薇兒撐不住 → **上滑**生命歸還 → 她倒下
         ⚠ `hp:50`／`php:99` 是**血量觸發**（ver -599 新增，見 tutorial.onHpChange）：
           前者是敵人血掉到 50% 以下，後者是玩家血回到 99% 以上
           —— 聖徒化期間那條倒數槽走的就是玩家血，所以同一支吃得到。
         ⚠ `gate` 寫的是**具名動作**（`saint`／`partner`），不是函式：
           這裡是資料（config.js），函式寫不進來 —— 名字在 `tutorial.GATE_ACTIONS` 對。
         ⚠⚠ `strike:true` ＝ 這一段講完就打**劇情殺三連擊**，走的是**既有的**
           `config.tutorial.strike`（教學第四回合那一套，鐵律 8）：前兩擊必留 1 HP、
           第三擊必致死 → 搭檔的即死防禦接住並播 cut-in。
           ⚠ ver -599~-618 是 `drain:true`（一步把血設成 0），那**不是三擊**、
             也**不會發動即死防禦** —— 玩家看不到自己是怎麼倒下的，
             也看不到諾薇兒接住他。已整支移除。
           ⚠ `then` ＝ 三擊與 cut-in 都演完才接的下一個 trigger（等 `afterCutin`，
             不是固定秒數）。
         ⚠ `once` 不寫：Ray 說「這個怪只會出現一次」，敗北重來要重播（同 §6.5.2）。 */
      talk:[
        /* ── ① 蕾娜示警 → 劇情殺三連擊 ────────────────────────────────
           ⚠ 只有一句：喊完就打。她的驚呼與那三下之間不要再插別的話 ——
             「小心！」是**對那三下的預告**，隔了一段就成了無主的驚呼。 */
        { trigger:'hp:50', strike:true, then:'downed', soloLine:true, lines:[
          { who:'renna', img:'tut_renna_shout', text:'小心！' },
        ]},
        /* ── ② 倒下之後（即死防禦已經接住他）→ 聖徒化 ──────────────────
           ⚠ `soloLine`（ver -613，Ray：「蕾娜話講完立繪就移出，不然看不到雪鐵龍」）：
             右滑的箭貼在**敵人框左緣**，所以台上只留現在講話的那一位 ——
             蕾娜講完就滑出去，左邊空出來給箭（諾薇兒在右邊，不擋）。 */
        { trigger:'downed', soloLine:true, lines:[
          { who:'nouvelle', img:'tut_nouvelle_desperate', text:'不行！' },
          { who:'renna',    img:'tut_renna_thinking',     text:'到此為止了嗎？' },
          /* ⚠ 這一句用 `steady`（Ray 指定）不是 SAINTINSTALL —— 那張是發動的瞬間，
             這一拍她還在「準備好了」。 */
          { who:'nouvelle', img:'tut_nouvelle_steady',    text:'我準備好了，現在聖徒化！' },
          /* ⚠ **箭要等她說完才出**（ver -607，Ray 指定）：`immediate` 拿掉 ——
             `immediate:true` 是「段落一開就進閘、台詞照常可讀」，那樣箭會跟
             「不行！」一起亮，玩家還沒聽到她說要聖徒化就先被指著滑。
             不寫 `immediate` ＝ 講完最後一句才進閘，而最後一句正是那一句。
             ⚠ 原本後面還有一句蕾娜「！！」，Ray 指定拿掉 —— 留著的話箭會落在
               她的驚呼上，發動的理由就從諾薇兒身上跑掉了。 */
        ], gate:{ type:'right', action:'saint', then:'saintOn' } },
        { trigger:'saintOn', lines:[
          { who:'renna',    img:'tut_renna_shocked',      text:'那就是……聖徒化？' },
          { who:'nouvelle', img:'tut_nouvelle_saintinstall',
            text:'在我熔斷之前你都會是不死之身！趁現在！' },
        ]},
        /* ⚠⚠ `when:'saint'`（ver -612，Ray：「boss 戰只要開一槍諾薇兒就會跳撐不住了」）：
           `php:99` 在**開場就成立**（玩家滿血），第一發傷害一觸發就把這一段吐出來。
           稿上這一句的意思是「**聖徒化期間**那條倒數槽被推回 99%」—— 加上條件才對。 */
        /* ⚠ 箭放中央（ver -613）；諾薇兒照 `talkSides` 站**右**（ver -619 改，
           原本這一段特地把她挪到左邊，那正是「一下左一下右」）。 */
        { trigger:'php:99', when:'saint', soloLine:true, lines:[
          { who:'nouvelle', img:'tut_nouvelle_desperate', text:'我撐不住了！至少……' },
        ], gate:{ type:'up', immediate:true, action:'partner', then:'partnerOn' } },
        { trigger:'partnerOn', lines:[
          { who:'renna',    img:'tut_renna_shocked',      text:'諾薇兒！' },
          { who:'renna',    img:'tut_renna_shout',        text:'解決祂！不要白費諾薇兒的覺悟！' },
        ]},
      ] },
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
         見 `modules/combat.js` 的 `enemyAttack` 與 `modules/defense.js` 的 `scheduleAssault`。
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
         不給金錢**。它可以重打到膩 —— 給獎勵就是一台印鈔機。
         ⚠ 「不給評價」那一條 -1060 撤過一次，**ver -1127 又加回來**（見下）。
       ⚠ **破紀錄的獎品照給**（`timeAttack.prize`）：那是這一場的目的，不是報酬。
       ⚠ 判定在 `modules/inspector.js` 的 `scriptSettle` 讀這一欄，不認場次名。 */
    /* ⚠⚠ ver -1127（Ray：「帝都打靶出現蕾娜評價，打靶不該有評價」）：三場打靶的
       `noEval` **加回來**。-1060 曾經照 Ray 當時那句「打靶也是」把它撤掉，
       -1126 他推翻了 —— 打靶是可以重打到膩的小遊戲（`noReward` 也是同一個理由），
       每打一次被評一次等第讀起來像正式戰鬥。
       ⚠ 通則仍然是 -670 的「預設就有評價，沒有的是特例」：特例寫在**卡**上
         （`noEval` 永遠不評／`noEvalBeforeStage:N` 第 N 章之前不評），
         不要在 inspector 那邊另列一張不評的場次名單（鐵律 7）。 */
    range_trainee: { enemy:'dart_target', record:'range', noReward:true, noEval:true,
                     timeAttack:{ wrongPenaltySec:3, se:'se_dart_fail', parSec:50,
                                  prizeSec:30, prize:'Shotgun_Dragon' } },
    /* ══ 北方泊地的打靶（ver -655，Ray 交稿）══════════════════════════════
       「咱這一區的記錄可是25秒，破得了的話……現在我也拿不出像樣的東西，
         就免費幫你調校一下那兩把槍吧！」「挑戰費200G喔。」
       ⚠⚠ 這一場**只有一條門檻**（25 秒）：Ray 的稿只有「挑戰成功／挑戰失敗」
         兩支台詞，所以用 `parSec` 就夠了 —— **不寫 `prizeSec`/`prize`**。
         帝都那一場的「過關但沒獎品」中間帶在這裡不存在。
       ⚠ 獎品不是道具而是**主槍的強化**（見 tuning.gunTune）：由腳本那一拍
         `flags:['np_gun_tuned']` 記下去，不走 `timeAttack.prize`（那一欄只發道具）。
       ⚠ `record` 與帝都那一場**分開**（'np_range'）：那是兩間店各自的紀錄。
       ⚠ **挑戰費 200G 寫在腳本的選項上**（`choice` 的 `cost`），不寫在卡上 ——
         「打這一場要多少錢」是那家店的規矩，不是這場戰鬥的性質；
         而且要在**玩家答應的那一刻**扣，卡上沒有那個時機。 */
    np_range: { enemy:'dart_target', record:'np_range', noReward:true, noEval:true,
                timeAttack:{ wrongPenaltySec:3, se:'se_dart_fail', parSec:25 } },
    /* ══ 蕃茄人11號（ver -858，杰羅的修船打靶）══ 同帝都配置＋兩個新旋鈕：
       `assaultOn` 放行大絕排程（3 秒一發，defense.scheduleAssault 的例外）、
       `hitPenaltySec` 被打中＝碼表 +3 秒（combat.enemyAttack）。par 30 秒。 */
    sv_range: { enemy:'sv_dart', record:'sv_range', noReward:true, noEval:true,
                timeAttack:{ wrongPenaltySec:3, se:'se_dart_fail', parSec:30,
                             hitPenaltySec:3, assaultOn:true } },
    /* ══ 墓地那一場（ver -664，Ray：「教堂那隻中 boss，背景維持墓地」）══
       ⚠ **另開一張卡**不共用 `np_boss`：那一張是城鎮戰的收段場（`sessionEnd`、
         屬於 `siege` 那一段），這一場是自由探索期的單場遭遇 —— 同一隻怪、
         兩個場合，把場合寫在戰鬥卡上才分得開（鐵律 7）。
       ⚠ **背景不寫**：城鎮插入戰交棒時 `main.js` 會把「你站的那一格」設進
         `state.battleBg`（ver -592），所以自然就是墓地那一張。 */
    /* ⚠⚠ **這一場身邊沒有任何夥伴**（ver -681，Ray：「主角在沒有任何夥伴的狀況下
       不會有任何主被動技能，也沒有聖徒化，也就是娜塔莉戰的前一場」）——
       諾薇兒去了教堂、安雅還沒介入。所以聖徒化與搭檔技都關掉。
       ⚠ 禁令擋在**唯一的發動點**（`saint.activateSaint` 的 `noSaint`／
         `partner.tryActive` 的 `noPartner`），不是在手勢那邊各擋一次（鐵律 8）。 */
    /* ⚠⚠⚠ `solo:true`（ver -1127，Ray：「北泊墓地戰的第一戰是處於無夥伴的狀態，
         娜塔莉戰才強制換安雅」）＝**身邊真的沒有人**：`state.pickedPartner` 設 null
         （唯一真相，見 state.setPickedPartner）—— 破防計量表不放頭像、**即死防禦
         那類被動也不會發動**。
       ⚠ 與 `noPartner` 是兩件事：那一格是「有人但不准用主動技」，擋不住被動
         （-681 之後墓地第一場仍然會被諾薇兒接住一次，那就是這一版修掉的）。
         兩格都留著：`solo` 已經涵蓋 `noPartner`，但寫出來才讀得出意圖。 */
    np_cemetery: { enemy:'np_boss', solo:true, noSaint:true, noPartner:true },
    /* ══ 禍魘娜塔莉戰（ver -671，Ray 交稿）══════════════════════════════════
       敵 HP 50% 以下 → 劇情殺（**一擊**打到剩 1）→ 安雅接手惡夢化。
       ⚠ 與聖徒化教學那一場的三連擊是**兩種劇情殺**：那一套要走即死防禦
         （所以要三下），這一場接的是惡夢化（`strikeTo:1` ＝一下）。
       ⚠ `bgm` 不寫＝照舊 `bgm_battle`；背景照舊由城鎮交棒帶進來（墓地那一張）。 */
    /* ⚠⚠ 這一場**開場也沒有**（同上，Ray：「娜塔莉戰也是，等到安雅干涉才有
       聖徒化跟主動技」）：`noSaint`／`noPartner` 把玩家自己發動的那兩個入口關掉，
       惡夢化與夢境粉碎由**腳本的閘門**帶出來（`gate.action` 直接呼叫，不經過那兩道守門）。 */
    /* ⚠ `burstVoice`（ver -711，Ray：「vo_anya_dreambreaker2 目前只有娜塔莉戰使用」）
       —— 寫在**卡**上不寫死在程式裡（鐵律 1）：日後別的場次要換一支就加一行。 */
    /* ⚠ BGM 與黑爪戰同一首（ver -720，Ray 指定）：`bgm_crimson`。
       兩場都是這一章的 BOSS 級對決 —— 用同一首把它們讀成同一條線。
       ⚠ 只寫鑰匙不抄路徑（鐵律 7）：曲子換檔時 ASSETS 改一處就好。 */
    np_nightmare: { enemy:'nightmare_natalia', bgm:'bgm_crimson', bgmAfter:'suspense',
      /* ⚠ `bgmAfter` 的鍵走**劇情層那張表**（`story.js` 的 `BGM_ALIAS`／`BGM_FILES`），
         **不是** ASSETS 的鍵 —— 寫成 `bgm_suspense` 查不到（-631 起啞了六版，
         -637 才抓到）。與黑爪戰同一個收尾（ver -720，Ray 指定）。
         ⚠ 只有打贏才換：戰敗要再打一次，換了曲子等於先畫句點。 */
      /* ⚠⚠ **這一場強制換安雅**（ver -1127，Ray：「娜塔莉戰才強制換安雅」）：
         她是這一幕的主角（惡夢化與夢境粉碎都是她的），破防計量表上的臉、
         被動（明晰之夢）與 `burstVoice` 都要對得起來。
         ⚠ 走**戰鬥卡的 `partner` 覆寫**（combat.startGame 那條挑人鏈的第一順位）——
           不要為這一場在 `storyPartnerBy` 加一條：那張表管的是「這一章身邊是誰」，
           這裡要的是「這一場是誰」。
         ⚠ `noPartner` 照留：主動技仍然要等安雅干涉（腳本的閘門直接呼叫，
           不經過那道守門）。 */
      partner:'anya', burstVoice:'vo_anya_burst2', noSaint:true, noPartner:true,
      /* ⚠ 站位：安雅本位右 → 蕾娜讓到**左**（§6.5 的表）。 */
      talkSides:{ renna:'left', anya:'right' },
      talk:[
        /* ══⚠⚠ **不走劇情殺，改成玩家自己發動**（ver -672，Ray：「那就不要劇情殺，
           直接介入，右滑雪鐵龍」）══
           -671 曾經用 `strikeTo:1` 把血打到 1 再自動發動 —— 那一版有兩個問題：
             ① 安雅不是即死防禦的擁有者（諾薇兒才是），打到 1 沒有人接得住；
             ② 惡夢化「以現有的 hp 開始扣」在 hp=1 時當場熔斷。
           現在是**閘門**：講完那一句就亮雪鐵龍箭，玩家右滑發動（同聖徒化的手勢）。
           ⚠ 順序照 Ray 指定：安雅那一句 → **CI 先跑** → 蕾娜才說「聖徒化？」
             （`gate.then` 是 `afterCutin` 排的，所以一定在 CI 之後）。 */
        /* ⚠⚠ **觸發點由 50% 壓到 30%**（ver -689，Ray：「把夢魘化的時間壓後，最好讓
           夢境粉碎可以爆到她只剩 5% 血」）——
           算一下就知道為什麼是 30：夢境粉碎滿格是**敵最大 HP 的 25%**，加上惡夢化
           期間點掉那十幾格的傷（約一成），30% 打完正好落在 5% 那條下限上。
           50% 觸發的話爆完還剩兩成多，讀起來就不是「一擊把她打到只剩一口氣」。 */
        { trigger:'hp:30', lines:[
          { who:'anya', img:'tut_anya_terrifying', text:'娜塔莉！' },
        ], gate:{ type:'right', immediate:true, action:'nightmare', then:'niCall', tone:'red' } },
        { trigger:'niCall', lines:[
          { who:'renna', img:'tut_renna_shocked', text:'那是……！' },
          { who:'renna', img:'tut_renna_shocked', text:'聖徒化？' },
          { who:'anya',  img:'tut_anya_ni',       text:'對不起……！' },
          { who:'anya',  img:'tut_anya_ni',       text:'請讓娜塔莉安息吧！' },
        ] },
        /* ══ 熔斷前教一次「上滑自爆」（ver -672，Ray：「在熔斷前增加一個教學
           上滑雪鐵龍發動自爆一次把娜塔莉炸死」）══
           ⚠⚠ `phplow:1` ＝**血被抽到只剩 1 的那一刻**（ver -705，Ray：「娜塔莉戰讓
           主角 hp 到 1 的時候再發動 dreambreaker」）。-672 原本是 20%，太早 ——
           那個時候玩家還沒被逼到底，讀不出「這是最後手段」。
           ⚠ 到 1 就熔斷，兩件事撞在同一個瞬間 —— 所以熔斷要**讓位**：
             `tutorial.niBurstPending()` 說還有人在等這一拍時，`saint.niDrain`
             把血停在 1 不熔斷（同生命歸還攔在滿−1 的作法，鐵律 8）。
           ⚠⚠ 這兩句是**我寫的**（Ray 只寫了「教學上滑雪鐵龍發動自爆」）。 */
        { trigger:'phplow:1', lines:[
          { who:'anya', img:'tut_anya_ni', text:'撐不住了……' },
          { who:'anya', img:'tut_anya_ni', text:'一起……結束吧，娜塔莉。' },
        ], gate:{ type:'up', immediate:true, action:'niBurst', tone:'red' } },
      ] },
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
                        /* ⚠⚠ 船戰的武器音**按類別**固定（ver -504，Ray：「船戰武器的
                           數值都跟著玩家現在裝備的副武器，但是音效固定用船戰的」）——
                           換上哪一把（絞肉機改、龍息、遊隼…）數值都是那把槍的，
                           聲音一律是艦載的那一套。鑰匙＝武器類別（cat）；
                           也吃武器 id（特定武器要例外時寫 id，id 優先於類別）。
                           `once`（ver -503）：反擊開火同時疊播一支、整串只一次。 */
                        weaponSound:{ '重機槍':'se_ship_heavygun',
                                      /* ver -505（Ray：「發射音改 se_spiltcannon，跟 bulletpiece
                                         同時播，不要隨 hit 數疊加」）—— times 不寫＝1。 */
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_weapon_cannonshell' },
                                      /* ver -506（Ray：「單擊砲 se 換 se_weapon_cannon，發射
                                         瞬間播，0.2 秒後播 se_weapon_shell，可重疊」）——
                                         `after`＝延遲跟播（weapon.js，同 once 一組機制）。 */
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 once:'se_weapon_cannonshell' } },
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
    /* ══ 森住民戰（man_sorana，ver -744，Ray 的 stage5 稿）══
       湖上甲板・索菈娜登場戰。`bgm`＝Peritune Whirlwind（Ray 指定，進 credit）；
       `bgmAfter`＝打贏換 Whistling Winds（ver -752 的續稿；-747 曾改 misty，
       Ray：「戰鬥結束。BGM Peritune_Whistling_Winds_loop」）。
       ⚠ `bgm` 與插畫登場那一拍（mainScript 的 bgm:'whirlwind'）是同一首同一個
       路徑：riseCue 的同曲判斷直接放行＝「戰鬥時不再更換音樂」。 */
    man_sorana:       { enemy:'man_sorana',
                        bgm:'bgm_whirlwind', bgmAfter:'whistling' },
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
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_weapon_cannonshell' },
                                      /* ver -506（Ray：「單擊砲 se 換 se_weapon_cannon，發射
                                         瞬間播，0.2 秒後播 se_weapon_shell，可重疊」）——
                                         `after`＝延遲跟播（weapon.js，同 once 一組機制）。 */
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 once:'se_weapon_cannonshell' } },
                        counterGapMs:180 },
                        /* ⚠ 舊的戰內 talk（好快！／廣域破片砲）於 ver -741 移除 ——
                           Ray 的 stage2 稿把這段改成**戰前**的登場演出
                           （flight 的 runSerpentIntro：插圖＋對白＋換搭檔教學）。 */
    /* 空賊船（ver -509）。船戰的武器音／連射間隔同前兩場（都是船戰）。
       卡上出場音效／特效／背景＝0 ＝ 沒有開場演出、沒有 talk。 */
    flight_pirate:    { enemy:'pirate_ship',
                        /* ver -741（Ray：「船戰的空賊戰定成這一首」）—— Seven Seas
                           （Alexander Nakarada），出處與授權字樣在 credit（index.html）。 */
                        bgm:'bgm_piratebattle',
                        weaponSound:{ '重機槍':'se_ship_heavygun',
                                      '霰彈槍':{ key:'se_spiltcannon', once:'se_weapon_cannonshell' },
                                      '萊福槍':{ key:'se_weapon_cannon',
                                                 once:'se_weapon_cannonshell' } },
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
    /* 北方泊地（ver -664，Ray 交稿）。 */
    arad: { name:'北海暴徒阿拉德', city:'northport', reward:2000,   /* ver -858：Ray 改 2000G */
            desc:'出沒地：東北空域。' },
  },

  /* ══ 夏爾村獵人兌換表（ver -859，Ray：「獵人小屋要像賞金獵人公會一樣有表可以看…
     目標食材↔獎勵素材，配對隨機，每天更換」）══ 五種食材各配一個獎勵，
     配對每天洗牌（種子＝dayNo，見 loot.huntPairs）。玩家帶食材來換對應獎勵。 */
  huntExchange: {
    foods:  ['meat_lynx','meat_boar','antler_deer','paw_bear','meat_snake'],
    prizes: [ { id:'__money', amount:500 }, { id:'harm_claw_s' }, { id:'harm_claw' },
              { id:'harm_bone_big' }, { id:'harm_bone_frag' }, { id:'harm_fang' } ],
  },

  /* ══ 瑪麗亞的廚房（ver -953，Ray：「食材做成道具，準備十道菜就好，除了第一道以外
     其他你發揮，材料都是一肉一菜一調味」）══════════════════════════════════════
     夏爾村餐廳（`shinier.restaurant`，店主 COOK_SV 瑪麗亞）。stage8 那一場開張。

     ⚠⚠ **配方只列三個 id，不記「哪個是肉」** —— 那一格寫在**道具身上**
       （`items.defs[x].food`＝`meat`／`veg`／`season`，鐵律 7）。
       兩邊各記一次的話，同一樣東西會出現「在配方裡是調味、在道具欄是菜」。
     ⚠⚠ **`boon` 的欄位名一律沿用九星那一套**（`dmgMul`／`critRate`／`critDmg`／
       `energyMul`／`lootMul`／`moneyMul`），日後才接得回**同一個**加總點
       （`progress.bonus` 那一支）—— 料理另開一個計算點就是鐵律 7 的病。
       `hpMax` 是這一版新增的欄位（劇本：吃完第一道 HP 上限 ＋40）。
     ⚠⚠ **每一道固定 HP 上限 ＋40**（ver -953，Ray 定案）—— 十道吃滿 ＋400。
       ⚠ **每一道只算一次**：記的是「吃過哪幾道」不是「吃過幾次」
         （`progress.cookedDishes`），不然帶食材反覆煮同一道就能無限刷上限。
       ⚠ 一輪內：`newRun()` 清、存檔帶。上限的式子只有 `progress.playerMaxHp()` 一支。
       ⚠ 欄位名沿用九星那一套是為了**日後**要給別的加成時不必改結構 ——
         現在十道都是 `hpMax`，那是 Ray 的決定，不要「順手」調成各有各的。
     ⚠ 圖：`ci` 是插圖鑰匙。**目前只有第一道有圖**（`dish_deersteak`），
       其餘九道等美術 —— 沒有圖的那幾道演到時就不出插圖，不會壞。 */
  cooking: {
    /* ── 演出的秒數（`story.playCooking`，鐵律 1：程式不寫死時間）──
       `panMs` 兩張鍋子交替的間隔（Ray 指定 0.75 秒）／`dotMs` COOKING 後面的點
       每隔多久多一個／`animMs` 煎多久（⚠ 不是音檔長度：`se_cooking` 有 39.7 秒，
       演出只用開頭，收尾把它淡掉）／`holdMs` 成品停多久／`boonDelayMs`＋`boonMs`
       加成大字的延遲與停留。 */
    /* ⚠⚠ `animMs` **對齊 `se_cooking` 的長度**（ver -954：Ray 換了新的音檔，
       39.7 秒 → **3.73 秒**）—— Ray 的稿寫「**音效期間** panup、pandown 交替」，
       所以煎多久就是那支音效多長。舊的 4800 是對著 39.7 秒那一版隨手取的段落。
       ⚠ 音檔再換就要回來對一次（`afinfo resources/audio/se/se_cooking.m4a`）。 */
    panMs:750, dotMs:420, animMs:3730, holdMs:1500, boonDelayMs:700, boonMs:1600,
    dishes: {
      /* 第一道是劇本指定的（Stage8 瑪麗亞的第一頓）。⚠ Ray 口頭說「羊腿排」，
         但稿上的台詞是「奶油鹿腿一份」、交件的插圖也是 `di_deersteak`（鹿）
         —— 以稿與圖為準寫成鹿腿。要改成羊的話，圖與台詞要一起改。 */
      /* ⚠ 調味 ver -979 由 `season_butter` 換成 `season_goatbutter`（Ray：「瑪莉亞
         第一道料理所需的就是這一個調味」）—— 那一份正是北方泊地居民送行時給的。
         連帶解掉 -955 的待辦「草原奶油目前遊戲裡拿不到」：第一道菜不再依賴它。 */
      deersteak:  { name:'奶油鹿腿排',   ci:'dish_deersteak',
                    mats:['meat_deer','herb_rosemary','season_goatbutter'],
                    boon:{ hpMax:40 },
                    desc:'厚切鹿腿以奶油慢煎，最後撒上迷迭香。不用再調味就很好吃。' },
      lynxgrill:  { name:'香煎山貓腿',   ci:'dish_lynxgrill',
                    mats:['meat_lynx','veg_wildgarlic','season_rocksalt'],
                    boon:{ hpMax:40 },
                    desc:'岩鹽抹過再下鍋，野蒜連葉子一起煎香。' },
      boarhoney:  { name:'蜜燒山豬腹肉', ci:'dish_boarhoney',
                    mats:['meat_boar','veg_mushroom','season_honey'],
                    boon:{ hpMax:40 },
                    desc:'油花厚的腹肉裹上森蜜，慢火燒到收汁。' },
      snakestew:  { name:'胡椒燉蛇肉',   ci:'dish_snakestew',
                    mats:['meat_snake','veg_watercress','season_pepper'],
                    boon:{ hpMax:40 },
                    desc:'清爽的蛇肉配河芹，起鍋前才磨黑胡椒。' },
      bearbutter: { name:'奶油燴熊掌',   ci:'dish_bearbutter',
                    mats:['paw_bear','veg_mushroom','season_butter'],
                    boon:{ hpMax:40 },
                    desc:'燉了半天的熊掌，最後以奶油與林地菇收尾。費工，但值得。' },
      deersorrel: { name:'酸模烤鹿腿',   ci:'dish_deersorrel',
                    mats:['meat_deer','veg_sorrel','season_pepper'],
                    boon:{ hpMax:40 },
                    desc:'烤得焦香的鹿腿，佐一把帶酸的酸模葉解膩。' },
      beargarlic: { name:'野蒜燜熊掌',   ci:'dish_beargarlic',
                    mats:['paw_bear','veg_wildgarlic','season_rocksalt'],
                    boon:{ hpMax:40 },
                    desc:'整顆野蒜跟熊掌一起燜，鹹香得能配三碗飯。' },
      lynxhoney:  { name:'蜜漬山貓腿',   ci:'dish_lynxhoney',
                    mats:['meat_lynx','veg_watercress','season_honey'],
                    boon:{ hpMax:40 },
                    desc:'先用森蜜漬過再烤，肉緊實卻不柴。' },
      boarlime:   { name:'萊姆烤山豬',   ci:'dish_boarlime',
                    mats:['meat_boar','herb_rosemary','season_limezest'],
                    boon:{ hpMax:40 },
                    desc:'萊姆皮與迷迭香一起塞進肉裡，烤出來滿屋子都是香的。' },
      snakesteam: { name:'河芹清蒸蛇',   ci:'dish_snakesteam',
                    mats:['meat_snake','veg_mushroom','season_limezest'],
                    boon:{ hpMax:40 },
                    desc:'幾乎不加東西的清蒸，吃的是食材本身。瑪麗亞說這道最難。' },
    },
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
    /* 清過的格子再出怪的機率（ver -924，Ray：「已經擊敗敵人的區域，
       再出敵人的機率是 25%」）。⚠ 沒清過的那一格照舊看地圖自己的 `wildSpawn.rate`
       （神殿是 1＝必出）—— 這一格只管**回頭走**的那一次。 */
    wildRespawnRate: 0.25,
    /* ══⚠⚠ **立繪的色調要跟著場景**（ver -631，Ray：「人物色調要隨場景調整，
       安雅現在太亮」）══ 量背景的平均亮度 → 換成一組濾鏡套在立繪容器上
       （實作只有 `modules/tone.js` 一支）。
       形狀：以 `ref` 為中性點的線性斜率，再夾在 `min`~`max` 之間 ——
       中等亮度的場景幾乎不動（≈1.0），只有很暗／很亮才明顯偏。
       ⚠ 這幾個是**看出來的**數字，沒有客觀指標；放在這裡就是為了能不動程式就調。
       ⚠ 實測參考：北方泊地教堂（戰損）0.152 → 0.78（夾底）、重建版白天 0.433 → 0.985、
         帝都廣場白天 0.542 → 1.083；安雅的立繪本身是 0.573（全場最亮的一張）。
       ⚠ 舊值是 `ref` 隱含 0.5、`gain` 0.24、夾 ±12% —— 在 0.15 的教堂只給 0.916，
         等於沒調（那就是「安雅太亮」的成因）。調小 `gain` 或收窄 `min` 可以退回去。 */
    /* ⚠ ver -632：`min` 0.78 → **0.85**、`satMin` 0.86 → 0.90（Ray：「這邊立繪
       有點太暗了，調亮 30%」）—— 壓暗量由 22% 減為 **15%**（正好三成）。
       ⚠ 這裡動的是**夾底**不是斜率：教堂那種很暗的場景本來就被夾在底，
         中間亮度的場景走的是 `gain` 那條線，本來就沒問題，不必跟著動。 */
    portraitTone: { ref:0.45, gain:0.90, min:0.85, max:1.08,
                    satGain:0.35, satMin:0.90, satMax:1.05 },
    // 全域主音量（0~1）：所有 SFX/合成音/BGM 統一縮放（0.7 仍過大 → 再取其 70%＝0.49）。
    //   main.js 開機時經 SFX.setMasterVolume 套用；逐支的平衡走 fileGain（見下）。
    masterVolume:        0.49,

    // 玩家
    playerHp:            100,   // 我方血量

    // 傷害
    dmgBase:             3,     // 基礎單發傷害
    /* ══⚠⚠ **主槍的永久強化**（ver -655，Ray 的北方泊地槍店稿：「膛壓增強了，
         後座力也會強一點」）══
       `flag` 立起來之後，`dmgBase` 永久 +`dmgBase` 這麼多（`combat.hitDamage` 唯一那一處在讀）。
       ⚠ 它是**一輪遊戲內**的狀態：旗標走 `progress`，所以 `newRun()` 會清、讀檔會跟著回去（§6.9）。
       ⚠ **試玩版（出陣）吃不到**：那條路不跑主線，旗標永遠不存在 —— 與 `weapons[].story`
         那條「本篇與試玩版是兩套數值」同一個原則，只是這一支是用旗標分的。
       ⚠⚠ **+5%**（ver -656，Ray：「挑戰成功主槍普攻攻擊力強化5%」）——
         乘在**整個普攻傷害**上（含連擊加成），不是只加在基礎值。
         -655 那一版是 `dmgBase:1`（絕對值 +1），已被 Ray 的指定取代。 */
    /* ══⚠⚠ 主武器的**強化等級**（ver -700，Ray：「顯示強化等級就好…強化等級到 9」
       「現在強化一次就是 2」）══════════════════════════════════════════════
       等級 `base`(1) ~ `max`(9)，**出廠就是 1**；北方泊地打靶那一次強化 → 2。
       加成 ＝ `(等級 − base) × dmgMulPerLv` —— 所以 Lv2 正好是 +5%
       （＝ ver -655 Ray 給的「主槍普攻攻擊力強化 5%」，數字沒有變），Lv9 是 +40%。
       ⚠⚠ **等級是唯一真相**（`progress.gunLevel`，鐵律 9）：`flag` 已經**不再**
         決定加成，它只剩「北方泊地那一次做過了」這個意思（免除重挑戰的費用，
         見 `costUntil`）。兩者各有各的擁有事件，不要拿其中一個去推另一個。 */
    gunTune: { flag:'np_gun_tuned', base:1, max:9, dmgMulPerLv:0.05 },
    /* ══⚠⚠ 副武器的改裝（ver -714，Ray：「副武器可以直接升級，每次升級增加
       攻擊力 20%，最高五階，**花錢就好**。第一次是槍價的半額，第二次是全額，
       第三次 1.5，第四次兩倍，第五次三倍，**不加數值，加特殊能力**」）══════════
       · 上限讀**卡上的 `maxMod`**（三把初始槍都是 5）—— 那是那一把槍的性質。
       · `perLv` 每階 +20% 反擊傷害；⚠ **只加到 `statLv`（第 4 階）為止**，
         第 5 階換成**特殊能力**（見下）。所以滿階的數值加成是 +80%，不是 +100%。
       · `costMul[n]` ＝升到第 n+1 階要付「槍價」的幾倍。槍價＝卡上的
         `price`（店貨）或 `value`（開局那三把的市價）。
       ⚠ 只影響**反擊傷害**：副武器只在反擊時開火，普攻是主武器的事。
       ⚠⚠ **第 5 階的特殊能力還沒定**（Ray：「先留槽，我還沒想好，應該是類似
         雙槍的掛飾但是**固定不可換**」）—— `perks` 先空著。
         「固定不可換」是它與雙槍掛件的分野：掛件玩家自己換，這個是升上去就定了。 */
    weaponMod: { perLv:0.20, statLv:4, costMul:[0.5, 1, 1.5, 2, 3] },
    /* ══ 杰羅的賭博式改造（ver -866；-867 Ray 更正）══
       「50%機率會失敗，白花錢。成功的話增加增益15~50%隨機」
       ⚠⚠ 放大的是**改造增益**不是直接加火力（Ray：「杰羅火力不是直接+50%，
         是改造增益＋50%」）：總乘數＝1＋改造增益×(1＋杰羅加成)，
         乘點只有 weapon.js 的 subgunPowerMul 一支（鐵律 7）。
         沒改裝過的槍他不收（loot.js 的 jeroReady 擋）。
       ⚠ `costMul` 是**暫定**（Ray 沒給費用）：一次改造費＝槍價 × 0.5。 */
    jeroMod: { costMul:0.5, failP:0.5, bonus:[0.15, 0.50] },
    /* 陸戰反擊的「額外音」按類別（ver -816，Ray）——沒有艦載音覆寫（`state.weaponSound`）
       時才吃：只帶 once/after（發射殼音、延遲上膛），**不帶 key** → 保留武器原音效。
       實作只有 weapon.weaponCounter 一處（鐵律 8）。
       ⚠ 散射(霰彈槍)的發射殼音是**船戰限定**（Ray，-816），寫在船戰卡的 weaponSound
         （once:se_weapon_cannonshell），不在這裡。 */
    landCounterSound: {
      '萊福槍': { after:{ key:'se_weapon_riflereload', delayMs:500 } },   // 陸戰高爆：發射後 0.5s 上膛
    },
    /* ══⚠⚠ **打斷之後指一下正確的格子**（ver -717/-718，Ray：「受擊、點錯以後
       馬上提示正確的格子」→「反擊、格擋成功也顯示下一個正確格，**要爽就要降難度**」）══
       規則收斂成一句：**任何一次把玩家注意力從盤面拉走的事件之後，指一下**。
       兩個呼叫點（都走同一支 `combat.hintCurrentCell`，鐵律 8）：
         · `enemyAttack` —— 大絕／延時／點錯／格擋扣血（失誤那一半）
         · `defense.resolveThreat` 的收尾 —— 紅點解決了，**不分成功失敗**
           （反擊／完美防禦也算：那一刻畫面上是 cut-in、浮字、槍聲，眼睛不在盤上）
       ⚠ 一次性：點掉那一格提示就沒了（`.next` 由 `tap` 自己移除）——
         它是「把你接回軌道」，不是把整盤的提示打開。 */
    /* ══ 破防計量表的月彎中間放什麼（ver -1036，Ray：「試試看讓破防計量不顯示
       hit 數，把搭檔的頭像放月彎中間？」）══
         true  ＝ 搭檔頭像（連擊數與 HITS 小標一起不顯示）
         false ＝ 連擊數（ver -511 起的 VP1 風大白字）
       ⚠ 兩者**共用同一個錨**（月牙缺口中心）與同一條「不可蓋過 HP 條」的夾位，
         所以這是一個開關不是兩套版面（鐵律 7）。切回去只改這一個值。
       ⚠ 沒有搭檔（或她沒有立繪）時自動退回連擊數 —— 空的圓圈比較糟。 */
    claspFace: true,
    /* ══ 下滑換搭檔（ver -1040，Ray：「手勢下滑可以切換女主，測試期間先開放，
       正式版這功能是三女主好感都滿了以後才開放」）══
         keys          ＝ 輪替的順序（本篇三位；名單裡少於兩位就等於沒有這個功能）
         needAffection ＝ 正式版的解鎖門檻：**名單上每一位**都要到這個值
       ⚠ 測試期間由 `body.testmode` 直接放行 —— 那是明寫的開發梯子（同章節跳關），
         判定只有 `combat.partnerSwapUnlocked()` 一支（鐵律 8）。
       ⚠ 門檻寫成數字不寫「滿」：好感上限（`progress.AFF_MAX`）是程式那邊的常數，
         兩邊各寫一個「滿」的定義必然走鐘。要改門檻只動這裡。 */
    partnerSwap: { keys:['nouvelle','anya','sorana'], needAffection:100 },
    hintNextCell: true,
    /* 第 5 階給哪一個特殊能力（鑰匙＝武器 id）。⚠ 內容待 Ray 的卡，先空著 ——
       不要自己發明能力（同護符那一批的處理）。 */
    weaponPerks: {},
    dmgPerCombo:         0.2,   // 每層連擊加成
    dmgComboCap:         20,    // 連擊加成計入上限
    /* ⚠ ver -720（Ray：「現在破防攻擊是 80%，改成 100%」）：由 **0.7** 改成 1.0。
       ⚠ 實際的舊值是 **70%** 不是 80% —— 一併記著，免得日後看 commit 訊息對不上。
       破防窗口的點擊**不吃暴擊也不吃 atkBuff**（見 combat 那一行），
       所以 1.0 ＝「與一發沒有暴擊的普攻等值」，不是「兩倍普攻」。 */
    dmgDualMult:         1.0,   // 雙槍傷害倍率（破防窗口的每一擊）

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
    /* 反擊給的破防值＝`energyPerHit × 這個 × (實傷/打滿的傷)`（ver -880，Ray：
       「反擊也要依傷害比例增加破防值，一次反擊打滿大概是普攻兩倍的增加量」）。
       ⚠ 2＝**打滿時**是普攻的兩倍（2×2＝4）；沒打滿就按比例縮 —— 機槍黃圈只有
         三成命中率，那一次自然只拿到約三成。實作只有 weapon.counterEnergy 一支。 */
    counterEnergyMul:    2,
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
    /* ══ cut-in 逐張縮放（ver -837，Ray：「獵手的智慧發動時注意 CI 後方角色不要被
       裁掉太多」）══ #cutinImg 是 96% 高再乘 keyframe 的 scale 1.2~1.3 ——
       等於放大到約 120%，低角度構圖裡站在後方的角色頭部會被裁掉。
       這張表＝逐張的縮小倍率（乘進 keyframe 的 scale，見 style.css 的 var(--ci-s)），
       1＝照舊；saint.playCutin 讀（鐵律 1）。 */
    /* ver -859（Ray：「被動技圖不要放那麼大，後方的 Q 版角色也要入鏡，
       手機版幾乎全被裁掉」）：獵手戰吼三張縮到 0.62 —— 後方那位 Q 版夥伴才進得了框。 */
    cutinFit: { ci_sorana_supply:0.78,
                ci_sorana_roar_renna:0.62, ci_sorana_roar_anya:0.62, ci_sorana_roar_nouvelle:0.62 },

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
      /* ver -847（Ray：「語音全部被音樂壓住聽不見，調整響度讓語音清晰」「連開槍的
         音效都聽不見」）：bgm 由 -441 的 0.80 再壓一階到 **0.70** —— 音樂墊底，
         槍聲與語音才浮得出來。⚠ 飛行頁的 LAYER_BASE 是同一組數字的第二份
         （非 module 頁面），改一邊要改另一邊。
         ══⚠⚠ **ver -1058（Ray：「全域的語音都太小聲了，我捏著嗓子配的音給點面子」）**══
         vo **1.00 → 1.40**（＋2.9 dB）。
         ══⚠⚠⚠ **ver -1059（Ray：「最大的問題不是音效，是音樂太大聲」）**══
         **bgm 0.70 → 0.45**（−3.9 dB）—— 這一版真正的病灶。
         ══⚠⚠ **ver -1063（Ray：「音樂還是太大聲，iPhone 是有自動增益嗎？」）**══
         再壓一階：**bgm 0.45 → 0.32**（又 −2.9 dB，對 -1058 之前總共 −6.8 dB），
         語音時的閃避也更深（`voiceDuck.level` 0.35 → **0.25**）。
         ⚠ **iOS 沒有會影響網頁音訊的自動增益**（系統的「響度均衡」只作用在音樂 App）。
           手機上音樂顯得大是**喇叭的頻率響應**造成的（§6.6 的老問題）：
           600 Hz 以下幾乎不發聲，而語音的能量集中在被削掉的那一段、
           音樂的中高頻卻原樣送出來 —— 於是同一組數字在耳機上對、在手機上偏。
           真正的解法是逐支重量（`tools/audio_probe.html` 的手機喇叭模型），
           那要整批跑；在那之前先用層級把音樂壓下去。
         ══⚠⚠⚠ **ver -1066（Ray：「那就把語音跟音效的響度全部調高」）**══
         vo 1.40 → **1.85**（＋2.4 dB）、se 0.90 → **1.20**（＋2.5 dB）；bgm 維持 0.32。
         ⚠⚠ **這已經是靠 limiter 在推響度，不是靠峰值**：語音的 gain 本來就夾在
           `peakCeilDb`（+2 dBFS），乘完 master 之後 -1058 算出來約 −1.3 dBFS ——
           再 ×1.85 是 +1.1 dBFS，**超過滿刻度**。匯流的 limiter（門檻 −6 dB／
           ratio 12）會把超出的部分壓掉，所以輸出峰值幾乎不動、**RMS（聽感的大小）
           明顯上去**，代價是動態變小（大聲與小聲的差距被壓平）。
         ⚠⚠ **再往上就會開始聽得出失真**（壓縮比拉到那個程度會把子音削鈍）。
           要繼續大聲得走另一條路：提高 `targetLufs` 並**逐支重量**
           （`tools/audio_probe.html` 的耳機＋手機喇叭兩次量測），
           那才是把每一支的母帶餘裕真正用出來。
         ⚠ 飛行頁不受影響：那一頁的 `fileVol` 夾在 1（HTMLAudio 的上限），
           它的音效本來就早已滿刻度。
         ⚠ se 跟著**還原回 0.90**：-1058 我把它降到 0.80 是為了「讓出空間」給語音，
           但 Ray 說音效不是問題 —— 壓錯了層等於平白讓槍聲變小。
           要讓語音浮出來，動的應該是**音樂**（它是唯一從頭到尾都在響的那一層）。
         ⚠ 這一層是**相對比例**，不是絕對音量：逐支的 `fileGain` 已經把每一支拉到
           `targetLufs`，這裡只決定「語音比音效大多少」。
         ⚠⚠ **峰值幾乎不會變**：語音的 gain 本來就夾在 `peakCeilDb`（+2 dBFS），
           ×0.49 的 master 之後約 −6 dBFS，再 ×1.4 是 −3.3 dBFS ——
           剛好落在匯流 limiter 的門檻（−6 dB／ratio 12）上，被輕壓成 ≈−5.8。
           所以**變大的是響度（RMS）不是峰值**，不會削波。
         ⚠ 還嫌不夠的話要動的是 `targetLufs`（−20 往上），但那等於**全部的
           `fileGain` 都要重量**（每一支都是依它反推的）—— 不要只調其中幾支。 */
      layer: { vo:1.85, se:1.20, bgm:0.32 },
      /* 語音時 BGM 自動閃避（ver -847）：語音開播把 BGM 壓到 level 倍、結束淡回。
         audio.js 的 setVoiceDuck 吃這一組（main 開機推入）。 */
      voiceDuck: { level:0.25, attackMs:120, releaseMs:350 },   // ver -1063：閃避更深
    },

    /* 哪幾個 ASSETS 鍵是**語音**（走 voiceChain）。⚠ 這是**歸屬**不是增益 ——
       ver -441 之前這件事是靠「在不在 partnerSeGain 那張表裡」判的，
       增益一搬家那個判斷就會憑空消失。 */
    voiceKeys: ['se_luna_dual','se_luna_exc','se_luna_obe','voice_saint_luna',
                'vo_life_return','vo_death_guard','vo_supply_refill','vo_hc_rounds',
                'vo_dual_torsten',
                /* ver -711 這一批全是語音（走 voiceChain）。 */
                'vo_dual_torsten2','vo_torsten_mb','vo_torsten_exc',
                'vo_nou_saint','vo_nou_obe','vo_nou_guard','vo_nou_return',
                'vo_anya_ni','vo_anya_burst','vo_anya_burst2','vo_anya_melt',
                'vo_anya_lucid',
                /* ver -818：索菈娜語音（共鬥/供給/共鬥結束）。 */
                'vo_sorana_pack','vo_sorana_pack2','vo_sorana_supply1','vo_sorana_supply2',
                'vo_sorana_obe1','vo_sorana_obe2','vo_sorana_roar','vo_sorana_roar2',
                /* ver -1033 補登記：**歸屬**的漏網之魚。這幾支目前都由呼叫端直接
                   `SFX.playVoice`（partner 的失誤語音、inspector 的升級語音），
                   所以現在聽起來是對的 —— 但這張表是「誰是語音」的唯一真相，
                   漏著就等於下一條改走通用 `SFX.play` 的路徑會把它當音效播。
                   ⚠ -1015 那六支失誤語音當初就漏了。 */
                'vo_nouvellemiss1','vo_nouvellemiss2','vo_nouvellemiss3',
                'vo_sorana_miss1','vo_sorana_miss2','vo_sorana_miss3','vo_sorana_miss4',
                'vo_nouvelle_lvup','vo_anya_lvup','vo_sorana_lvup'],

    /* ══ 逐支增益：鑰匙是**檔名**（去副檔名、轉小寫）══════════════════
       ⚠⚠ 鑰匙用檔名不用 ASSETS 鍵（ver -441）：**一支音檔只有一個響度**，
         而同一支檔案在專案裡有好幾種叫法（`sfx_saint` 與 `se_saint_install`
         是同一支；劇情層的 `SE_FILES` 根本沒有 ASSETS 鍵 —— 那正是
         `se_steps`／`se_Fall` 一直以 gain 1 播出、比別人小 12 dB 的原因）。
       ⚠ 沒列在這裡的檔案 ＝ 1（等於沒量過）。加音檔請跑 audio_scan 補一列。
       實測日期 ver -441；`CAP` 標記見上面 `peakCeilDb` 的說明。 */
    fileGain: {
      /* ── 語音（過 voiceChain 後量）── */
      /* ══ ver -711 交件那一批 ══════════════════════════════════════════
         ⚠⚠ **語音要過完 `voiceChain` 之後才量**（§6.6）—— `tools/audio_scan.html`
           量的是**原始波形**，對語音會系統性低估約 5 dB（實測：它給
           `vo_torsten_dualcrush` 的建議是 1.34，而那一支 -479 過鏈量出來是 2.482）。
           所以這一批是另外量的：過 eq＋comp 之後，再取「耳機／手機（600Hz 三階高通）」
           兩次的平均，並以**已校準的 `vo_torsten_dualcrush`（2.482）當錨**換算 ——
           那一支重量回來是 2.48，方法自洽。
         ⚠ `vo_torsten_dualcrush` 本身不在這一批（它 -479 就有一列，見下）。 */
      vo_torsten_dualcrush2:2.83,
      vo_torsten_mb:3.53,            vo_torsten_execute:2.63,
      vo_nouvelle_saintinstall:1.08,   // ver -837 新錄音重量
      /* ver -745：OBE 語音更新（Ray 交新檔，1.2 秒 —— 舊 10.6 秒那支的懸案結案）。
         錨換算（vo_nouvelle_saintinstall 2.43 ÷ 本機量 1.724 ＝鏈補償 1.41）。 */
      vo_nouvelle_obe:2.04,
      vo_nouvelle_deathguard:1.35,   vo_nouvelle_lifereturn:1.63,   // ver -837 新錄音重量
      vo_anya_nightmareinstall:4.14, vo_anya_obe:0.67,   // obe ver -837 新錄音重量
      vo_anya_dreambreaker1:5.15,    vo_anya_dreambreaker2:2.63,
      /* ver -881：Ray 重錄。瀏覽器內 BS.1770＋voiceChain 實測 —— 耳機 −14.88／
         手機 −12.11、平均 −13.50 LUFS（前一版是 −10.08，新錄音安靜 3.4 dB），
         峰值 −1.14 dBFS 未觸頂 ⇒ 0.77 → 1.141。 */
      vo_anya_luciddream:1.141,
      /* ver -894：Ray 重錄，兩支一起量（voiceChain 之後 BS.1770）。
         saintreload  耳機 −15.40／手機 −13.28、平均 −14.34、峰值 −1.28
         nightmarereload 耳機 −12.83／手機 −11.54、平均 −12.19、峰值 −0.62
         兩支都沒觸頂。 */
      vo_nouvelle_saintreload:1.257,
      vo_anya_nightmarereload:0.981,
      /* ver -837 整批新錄音（BS.1770＋voiceChain EQ 實測，耳機/手機平均，峰值夾 +2dB；
         未過壓縮器 —— 同 -818 的方法）。⚠ obe2 是氣音收尾（−28 LUFS），增益 5.22 是對的。 */
      vo_sorana_pack:0.69,  vo_sorana_pack2:0.57,
      vo_sorana_supply1:0.98, vo_sorana_supply2:0.96,
      vo_sorana_obe1:1.17,  vo_sorana_obe2:5.22,
      /* 「發現了」（ver -1089，怪一出現時插播）：**只有飛行頁在播**，
         `flight/index.html` 的 `FILE_GAIN` 有同值的一份（兩邊互指，§6.10）。
         實測 LUFS −18.06／−13.81；search1 的增益被 `peakCeilDb`(+2) 夾在 1.69
         （母帶峰值 −2.54 dB，再推就削頂）。 */
      vo_sorana_search1:1.69, vo_sorana_search2:1.06, vo_sorana_search3:1.89,
      vo_sorana_found1:0.86,  vo_sorana_found2:0.75,   // 「找到了」（實測 LUFS −11.94／−10.82）
      vo_sorana_roar:0.76,  vo_sorana_roar2:0.69,
      /* ══ 點錯的失誤語音與擋下音（ver -1015）══ 依 §6.6 的公式反推：
         gain ＝ 10^((targetLufs − LUFS)/20) ÷ masterVolume，峰值超過 `peakCeilDb` 就夾住。
         實測（WebAudio 閘控積分，未過手機喇叭模型）：
           nouvellemiss1  −17.02／peak −1.36   miss2 −14.14／+0.11   miss3 −16.81／−2.31
         ⚠⚠ **`fileGain` 的鑰匙是「檔名」不是 ASSETS 鍵**（§6.6）—— 第一版把它寫成
           `vo_nouvelle_miss1`（我自己取的鍵名）而檔案叫 `vo_nouvellemiss1`，
           於是那三支查不到增益、以母帶響度播出。ASSETS 鍵現在一律與檔名同名。
           sorana_miss1   −23.78／peak −6.85（CAP）  miss2 −22.02／−7.58  miss3 −21.59／−10.27
           se_windblock   −19.52／peak −0.33（CAP）
         ⚠⚠ **這是第一手估值，不是定稿**：§6.6 要的是「耳機 ＋ 手機喇叭模型兩次量測的
           平均」，而且語音要**過完 voiceChain** 才量 —— 用 tools/audio_scan.html
           跑一次才是權威值。先補上是因為**沒補＝增益 1 ＝以母帶響度播出**
           （`se_steps` 就是這樣「永遠不出來」的）。 */
      /* ⚠⚠⚠ `vo_nouvellemiss1` **ver -1035 退回 -1015 的原始錄音**（Ray：「我聽到的
         就是那個行けまーす」）—— -1032 交進來的那一支**內容是安雅的夢魘裝填**
         （同一句台詞的另一個 take：1.80 秒，而三支 miss 是 1.42／0.88／0.59）。
         程式端沒有接錯：三個鍵各自指向同名的檔案，md5 與音訊指紋都不同 ——
         **是那個檔案本身放錯了**。從回收區的 wav 重轉回來，量測與 -1015 一字不差
         （−17.02／peak −1.36 → 增益 1.45），可以確認轉回的就是原本那一支。
         ⚠ 真的要換新錄音時重交一次，照 §5／§6.6 走：轉 m4a → 重量 → 升 `?v=`。 */
      vo_nouvellemiss1:1.45,  vo_nouvellemiss2:1.04,  vo_nouvellemiss3:1.41,
      vo_sorana_miss1:2.77,   vo_sorana_miss2:2.58,   vo_sorana_miss3:2.45,   // miss1 CAP
      /* 第四支（ver -1105，Ray：「wahetta.wav 現在被規到 sorana_miss 系列」）——
         本機 BS.1770 實測 −16.44 LUFS／peak −1.78 dB，**錨在 miss3**（同尺 −21.25
         ／表值 2.45）→ 2.45×10^((−21.25+16.44)/20)＝1.41；加上增益後峰值 +1.2 dBFS，
         沒頂到 `peakCeilDb`(+2)。⚠ 它比另外三支響 5 dB，所以增益低很多是對的。 */
      vo_sorana_miss4:1.41,
      se_windblock:1.31,      // CAP（峰值頂到 +2 dBFS）
      /* ══ 升級的 SE 與三支語音（ver -1033）══ 同上式反推，實測（WebAudio 閘控積分）：
           se_lvup        −21.42／peak −6.43
           nouvelle_lvup  −14.40／peak −0.54     anya_lvup −22.33／−11.97
           sorana_lvup    −10.71／peak +0.08  ← 母帶本來就大聲，所以增益 <1
         ⚠ 三支語音的母帶差了 11.6 dB（sorana 對 anya）—— 沒有這一列的話升級語音
           會「有的震耳、有的聽不見」，正是 §6.6 說的「沒補＝以母帶響度播出」。 */
      se_lvup:2.40,
      vo_nouvelle_lvup:1.07,  vo_anya_lvup:2.67,  vo_sorana_lvup:0.70,
      vo_luna_dualwield:1.483, vo_luna_execution:1.013, vo_luna_obe:1.163,
      vo_luna_saintinstall:1.345, vo_malzeno_hcrounds:2.647,
      vo_malzeno_supplyrefill:2.261, vo_renee_deathguard:1.563,
      vo_renee_lifereturn:3.712,
      /* ver -479 入表（本篇破防）：語音鏈近似（130Hz 高通）耳機 −18.7／手機 −20.7
         → 平均 −19.7 LUFS → 2.482 */
      vo_torsten_dualcrush:2.482,
      /* ══ Stage8（ver -953）══ `tools/audio_scan.html` 現場量的建議值。
         ⚠ 瑪麗亞這一支原始就有 −13.0 LUFS（比 −20 的目標**大聲**），所以建議值是
           **衰減**（0.91）—— §6.6 那條「語音要過完 voiceChain 再量、掃描會低估 5 dB」
           是針對**會被低估到聽不見**的情形；這一支不在那個風險裡。
         ⚠ 實測那張表本身是混的：33 支語音的「現值÷掃描建議」從 0.69 到 2.62、
           中位數 1.00 —— 多數本來就直接用掃描值，只有 -711 那一批過鏈另量。
           所以這裡不套任何「修正係數」（套了就是憑空發明一個數字）。 */
      se_cooking:1.59, se_openletter:3.70, vo_maria_dishdone:0.91,   // ⚠ se_cooking ver -954 換新檔（39.7→3.73 秒）重量

      /* ── 武器 ── */
      se_weapon_pistol_01:0.607, se_weapon_pistol_02:1.165, se_weapon_pistol_03:1.751,
      se_weapon_mg_squall:0.854, se_weapon_shotgun_blast:0.530,
      se_weapon_sniper_falcon:1.023, se_weapon_guard:1.254, se_weapon_reload:1.143,
      /* se_weapon_heavygun ver -476 換新檔重量：平均（耳機/手機模型）−13.2 LUFS → 0.738 */
      se_weapon_cannon_120mm:0.839, se_weapon_heavygun:0.738,
      /* ── 敵人 ── */
      se_enemy_slash:0.602, se_enemy_smack:1.173, se_enemy_shot:0.854,
      se_enemy_revolver:0.732, se_enemy_dagger:2.192, se_enemy_centipi:1.272,
      /* ver -899 兩支新音。⚠⚠ **值是「對照鄰居」定的，不是照公式硬算**：
         本機用 numpy 重寫的 BS.1770 量出來，與這張表既有的值換算不回去
         （對 5 支已知的反推，比例從 0.15 到 0.88 都有 —— 那批多半被手調過）。
         所以改成**相對定位**：匕首對齊它自己的舊版（舊 −28.8 → 新 −23.7 LUFS，
         3.959→2.192）、櫻花對齊同級的 se_enemy_slash（0.602）。
         ⚠ 要精確就重跑 `tools/audio_scan.html`（瀏覽器內那一支才是這張表的來源）。 */
      se_enemy_sakura:0.836,
      se_enemy_saintroar:2.910,
      /* ── 聖徒化／搭檔 ── */
      se_saint_install:1.059, vo_saint_maxburst:0.955, vo_lunamg:2.066,   // se_lunaMG → vo_lunaMG（Ray 改名，ver -508）；se_saint_maxburst → vo_saint_maxburst（ver -641）
      /* ── UI ── */
      se_ui_click:4.750, se_ui_kagurabell:2.530, se_ui_pageflip:2.359,
      se_ui_sortie:1.184, se_ginclick:1.106, se_metalclip:1.139,
      /* stage7 兩支（ver -922）：⚠ 增益是**對著已校準的鄰居** `se_metalclip`（−17.1 LUFS
         → 1.139）推出來的 —— 實測 se_metalopen −16.7（大 0.4 dB）、
         se_monsterroardeep −16.2（大 0.9 dB），所以各自往下折那麼多。 */
      se_metalopen:1.09, se_monsterroardeep:1.03,
      se_buy:1.122, se_healing:1.461,   // ver -499（audio_scan 實測：−14.8／−17.1 LUFS）
      se_enemy_serpent:2.184,           // ver -500（audio_scan 實測：−20.6 LUFS）
      se_bulletpiece:1.49,              // ver -503（audio_scan 實測：−17.2 LUFS）
      se_spiltcannon:0.62,              // ver -505（audio_scan 實測：−9.7 LUFS，母帶很大聲）
      se_weapon_cannon:0.76,           // ver -816 更新素材（BS.1770 實測 −11.4 LUFS；-506 舊值 1.29）
      se_weapon_cannonshell:1.17,      // ver -816（BS.1770 實測 −15.2 LUFS）
      se_weapon_riflereload:1.26,      // ver -816（BS.1770 實測 −15.8 LUFS）
      se_weapon_shell:1.24,            // ver -506（audio_scan 實測 −15.7 LUFS；-816 起未用）
      se_dart_fail:2.792,
      /* ── 劇情／城鎮（這一批以前完全沒有增益，見上面的說明）── */
      se_steps:7.198, se_walk:4.481, se_fall:3.724, se_punch:1.596,
      se_tummy:8.268, se_sailorshout:2.048, se_sleep:1.708,
      se_kerberos_open:1.558, se_kerberos_pop:1.479, se_kerberos_steam:1.301,
      se_kerberos_gear:6.179, se_kerberos_drop:1.550,
      se_brickcrush:1.825,              // ver -624（audio_scan 實測：−19.0 LUFS）
      /* ⚠ **還沒量**（ver -664 新加的音效）：跑一次 tools/audio_scan.html 貼回來（§6.6）。 */
      se_paniccrowd:1.0,
      /* ⚠ 由 `Se_enemy_Saintroar` 升 5 個半音另存（ver -671，Ray 指定）——
         增益沿用原音那一支（同一段素材，響度沒變）。 */
      se_nightmare_hp:1.0,
      se_earthquake:2.306,              // ver -636（audio_scan 實測：−21.1 LUFS）
      /* 樹靈鹿主的吼（ver -879，Ray 交件）——瀏覽器內 BS.1770 實測
         耳機 −19.64／手機 −24.18、平均 −21.91 LUFS，峰值 −8.33 dBFS（未觸頂）。 */
      se_enemy_roardeer:3.006,
      /* ── 飛行頁（那一頁用 HTMLAudio，讀同一張表，見 flight/index.html）── */
      se_flight_heartbeat:5.064, se_flight_idle_loop:2.848,
      se_flight_sail_loop:7.928, se_flight_seagull:3.353, se_flight_train:5.059,
      sturm:1.709,
      /* stage2 甲板混亂那一段（ver -741，本機 BS.1770 實測，錨：se_earthquake 誤差
         <0.1%、sturm 6%）。飛行頁 FILE_GAIN 有第二份，改一邊要改另一邊。 */
      se_sail:2.056, se_shipcrush:2.358,

      /* ── 音樂 ── */
      bgm_mainmenu:1.735, bgm_battle:0.849, bgm_boss:0.665, bgm_result:0.855,
      /* ══⚠⚠⚠ 索菈娜的戰鬥曲（`Peritune_Whirlwind`）—— ver -1105 修**重複鑰匙**══
         Ray：「角色戰鬥曲音量現在太低了」。這一支在這張表裡**被寫了兩次**：
         -847 量出 0.80（索菈娜戰鬥曲），-744 的「湖上甲板三首」又寫了一次 0.588
         —— 物件字面值**後寫的贏**，所以實際播出來一直是 0.588，比該有的低 **3.1 dB**。
         ⚠ 這正是鐵律 7 的病：同一支檔案只有一個響度，這張表的鑰匙就是檔名，
           寫第二次必然走鐘。重複的那一列已經刪掉，這裡是唯一的一處。
         ⚠ 現值 0.842＝本機 BS.1770 實測 −8.29 LUFS，錨在 `bgm_battle`
           （同尺 −8.37／表值 0.849）—— 兩首幾乎同響度，所以增益也幾乎一樣。
         ⚠ 安雅的戰鬥曲（`peritunematerial_battlefield4`）同尺量是 −5.89 LUFS
           → 0.637，與表上的 0.636 相符＝**她那一首本來就是對的**，不要跟著調。 */
      peritune_whirlwind:0.842,
      se_soranacounter:1.47, se_soranacounterhit:1.04,   // 飛刀射出/命中（ver -839 實測；hit 峰值夾）
      se_glasscrack:1.94,   // 裂紋輻射（ver -839 實測 −19.5 LUFS）
      bgm_missionfailed:1.995, bgm_capital_day:1.213, bgm_lunaria:1.230,
      peritunematerial_crisis_loop:1.077,
      /* 北方泊地那兩首（ver -624 補量，audio_scan 實測 −16.7／−12.7 LUFS）。 */
      peritunematerial_suspense6_loop:1.401,
      /* ⚠ **還沒量**（ver -656 新加的曲子）：1.0 ＝以母帶的響度播出。
         跑一次 `tools/audio_scan.html` 把建議值貼回來（§6.6）。 */
      peritunematerial_entangle:1.0,
      /* ⚠ 同上，**還沒量**（ver -658 新加的曲子）。 */
      peritune_hopstep_battle_loop:1.0,
      /* 船戰兩首（ver -741，本機 BS.1770 實測，同上錨）。 */
      peritunematerial_epicbattle_loop:0.523,
      /* 安雅戰鬥曲（ver -873 本機 BS.1770 實測 −8.4 LUFS，錨校正 bgm_battle 0.849：
         尺差 ×1.18 對回表尺 → 0.636；峰值 1.1dB 未觸頂）。 */
      peritunematerial_battlefield4:0.636,
      /* 木雅克神殿（ver -876 同尺實測 −14.4 LUFS → 1.265，**峰值觸頂夾到 1.175**
         （檔案峰值 +0.6dB、ceil +2）＝表上的 CAP。 */
      peritune_frosylva:1.175,
      /* 鹿主異化～戰鬥（ver -877 同尺實測 −11.2 LUFS → 0.880，峰值 -0.7dB 未觸頂）。 */
      peritunematerial_lost_place4_loop:0.880,
      bgm_piratebattle:1.277,
      /* 湖上甲板三首＋著岸音（ver -744，同一把尺）。 */
      peritune_misty_hollow_loop:0.569,
      /* ⚠ `peritune_whirlwind` 原本在這裡還有第二份（-744 的 0.588）——
         ver -1105 刪掉，值在上面那一處（同一支檔案只有一個響度）。 */
      peritune_whistling_winds_loop:0.698,
      peritune_harbor_morning_loop:0.758,   // ver -753（measure_lufs 實測：平均 −11.4 LUFS）
      se_land:3.143,
      se_woodbreak:0.552,
      se_villagealarm:0.880,            // ver -772（measure_lufs 實測 −12.7）
      bgm_warhorn:1.275,                // ver -772（measure_lufs 實測 −15.9）               // ver -751（measure_lufs 實測：平均 −8.6 LUFS）
      peritune_crimson_moon_loop:0.879,
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

    /* ══⚠⚠⚠ **敵大絕（門檻波）的黃圈：反擊命中率一律 0**（ver -968，Ray 定案）══
       > Ray：「敵大絕 ult 的黃圈命中率皆為 0，**除非被安雅的技能壓過**」
       這是**規則不是卡的性質**（所以住在 tuning，不是逐張武器卡的 `bands.block.hit`）：
       大絕來的時候太早按，擋得住、但**打不到** —— 想punish 就得等到橘圈或紅圈。
       ⚠ 「大絕」＝卡上 `ult:{hp,…}` 那個血量門檻波生出來的圈（`th.ult`），
         不是每一發主動攻擊（同 ver -932 受擊特效分 `ult`／`assault` 的那條線）。
       ⚠⚠ **壓得過的有三個，兩條不同的路**（ver -969 補上共鬥）：
         · **安雅**（明晰之夢／惡夢化）把**任何一帶**一律判成紅圈
           （`defense.resolveThreat` 的 `lucid || niAll`）—— 那時根本走不到黃圈
           這一支，命中率自然是 100%。判定只有那一處（鐵律 7）。
         · **獵手的共鬥**（索菈娜）**整個繞過帶位系統**：圈一生成就被收掉、
           改由 `weapon.coopCounter` 打三把飛刀（固定傷害、沒有命中判定）。
           ⚠ 它仍要在黃圈那一支明寫排除 —— 收圈是**延後 90ms** 的，
             玩家手快點在那之前就會走到帶位系統裡（見 defense 那一段）。
       ⚠ 它**只改命中率**，不改減傷：黃圈該擋掉的照舊擋掉（`bands.block.take`）。
       ⚠ 連帶：那一次的破防值也自然是 0（`weapon.counterEnergy` 按實際打出的傷害給）。 */
    ultBlockHit:         0,

    /* ══ 惡夢化（Nightmare Install，ver -671，Ray 交稿）══
       ⚠ 它與聖徒化共用大部分數字（連擊斜率、反應時限、追加 20%）——
         那些一律讀 `saint*` 那一組，不要在這裡抄第二份（鐵律 7）。
         這裡只放**惡夢化自己才有**的那一個。 */
    nightmare: {
      /* ══⚠⚠⚠ **ver -967（Ray 改定）：最長 15 秒、依現有血量比例扣血** ══
         > Ray：「惡夢化改成最長 15 秒，**依玩家現有血量比例扣血**，扣到 1 時 OBE，
         >   期間受擊機制維持原案」
         · `maxSec` ＝**沒挨打的話**這一段有多長（受擊會抽掉額外的量 → 提早熔斷，
           所以是「最長」不是「固定」）。
         · **不再灌滿**：發動時血量原樣不動，從**現有血量**線性抽到 1 ——
           所以每一刻扣掉的量與你現在有多少血成正比（血少就扣得少），
           而**跑完整段的時間一樣是 15 秒**。實作見 `saint.startNightmareMode`。
         ⚠⚠ 連帶：**惡夢化現在是「血多才划算」** —— 與聖徒化正好相反（那一條槽是
           往上推、滿血發動當場 OBE，所以瀕死才划算）。兩個鏡像技能的最佳時機
           因此分開了，這是這一版的重點。
         ⚠ 被推翻的舊版（留著當紀錄）：`secPerCell:0.8` × 16 格 ＝ 12.8 秒，
           而且**發動時先 `setPlayerHpRatio(1)` 把血灌滿再抽**（那是 ver -671 我為了
           讓 Ray 稿裡打架的兩句都成立所做的判斷，程式裡當時就註明「這是我的判斷
           不是 Ray 的指定」）—— 這一版由 Ray 正式定案，那一行已移除。 */
      /* ══⚠⚠⚠ **ver -974（Ray 的雙子座卡）：13 秒，而且長度由血量決定** ══
         > 「夢魘降臨是以現有血量回扣倒數到 hp1 的時候熔斷，**13 秒**」
         > Q：13 秒是固定的還是滿血才有？　A：「**滿血才 13 秒**」
         · 抽血是**固定速率**（滿血 → 1 剛好 `maxSec` 秒），所以
           **半血發動只有一半的時間** —— 這一版與 -967 的差別就在這裡。
         ⚠⚠ -967 是「一律 15 秒、血少只是斜率變緩」，那讓 Lv6「前引星」
           （無視現有 HP、從滿 HP 開始算）**完全沒有作用** —— 那就是這一版改回來的原因。
         ⚠ 連帶：「血多才划算」比 -967 更強烈（血少不只傷害槽短，時間也短）。
         · `maxSec` 仍是「**最長**」：受擊會多抽，提早到底。 */
      maxSec: 13,
      /* ══⚠⚠⚠ `forcedCounterSec` ＝ **霸王條款的價目表**（ver -1012，Ray：
           「代價不要綁在反擊上，綁在霸王條款上…很合理，照這樣做」）══
         夢魘化期間，靠**命中霸王條款**（`partner.counterHitForced`）保證命中的那一發
         反擊，抽掉「相當於這麼多秒」的倒數槽；**玩家真的點到紅圈的完美反擊免費**。
         ⚠ 為什麼綁技能不綁反擊：這正是 ver -974 三分法的延伸 ——
           判定看 `ratio`（技術）、技能只覆蓋命中與攻擊力（外掛）。
           **技術不收費、外掛才收費**，安雅的玩法因此從「無腦點圈」變成
           「這一顆值不值得付」。
         ⚠ 它同時取代了「用武器擋角色」那條補丁的方向（萊福槍 5 秒拉栓，ver -1009）——
           那一條留著當武器自己的性格，但角色的失衡從此在角色這一端收。
         ⚠ 安雅 Lv9「孿生星」會先拿**破防計**來付（見 girls.levels.anya）。 */
      /* ══⚠⚠⚠ ver -1024（Ray：「安雅夢魘化扣秒依反擊照傷害為比例，秒數先以
         傷害額的 0.2 來計」）══ `秒 ＝ 傷害 × forcedCounterPerDmg`。
         推翻 -1012 的「一律 1 秒」—— 一發 112 的萊福槍與一串 40 的機槍付一樣的錢
         本來就講不通。
         ⚠⚠ **ver -1025：0.2 → 0.025**（Ray 看過試算後定的）。0.2 之下一發 112 的
           萊福槍要付 22 秒，而夢魘化全長只有 13 秒（`maxSec`）——**一發就熔斷**。
           0.025 的試算：
             · 機槍 8 發約 40 傷 → **1.0 秒**（≈ -1012 的固定 1 秒，一般武器手感不變）
             · 霰彈 6 發約 36 傷 → **0.9 秒**
             · 萊福槍 1 發 112（鹿主的 `weaponMod` ×2）→ **2.8 秒**
           ⇒ 這正是「依傷害為比例」要的形狀：打得越痛付越多，而不是每一發同價。
         ⚠ `forcedCounterSec` 留著當**退路**：傷害傳不進來（0）時用它，
           免得那一發變成免費。 */
      forcedCounterPerDmg: 0.025,
      forcedCounterSec: 1,
      /* ══ 自爆（上滑主動技 · 夢境粉碎）══
         `burstFloor` ＝自爆**打不死**：敵血最低留這個比例（ver -673，Ray：
           「炸不死也沒關係，最後留個 10%」）。
         `burstPct` / `burstFullCells` ＝傷害是**敵人最大 HP 的百分比**（ver -688，Ray：
           「夢境粉碎還是太弱，用百分比好了，滿格 16 可以帶敵最大 hp 25% 傷害走」）：
             傷害 ＝ 敵人最大 HP × `burstPct` × （惡夢化期間清掉的格數 ÷ `burstFullCells`）
         ⚠⚠ **改成百分比是為了讓它在大場也有份量**：-685 的「期間累積傷害 ×2」
           在 900 血的場只打得出百來點（累積傷害本身就只有幾十），大場等於沒有。
           綁在敵人最大 HP 上，同一招在哪一場都是同一個「份量」。
         ⚠ 分母是**滿盤 16 格**不是「這一盤幾格」：9 格盤清完不該與 16 格盤等值。
         ⚠ ver -673 的「下一盤普攻 2 倍 ×5 秒」已由 Ray 拿掉（-685）；
           -685 的 `burstMul` 由這一組取代（-688）。 */
      /* ⚠ `burstFloor` 由 0.10 降到 **0.05**（ver -689，Ray：「最好讓夢境粉碎
         可以爆到她只剩 5% 血」）—— 它是「打不死」的下限，不是傷害本身。 */
      burstFloor: 0.05,
      burstPct: 0.25,
      /* ══ 夢境粉碎的回血（ver -888，Ray：「惡夢粉碎發動時可以回復最高 25% hp，
         視你在 NI 打掉的格數而定，NI 是 16 格，16 格都打掉就回最大 hp 的 25%」）══
             回血 ＝ 玩家最大 HP × `burstHealPct` × （惡夢化期間清掉的格數 ÷ `burstFullCells`）
         ⚠ 分母是**滿盤 16 格**（`burstFullCells`，與傷害那一條共用同一個數字）——
           不是「這一盤有幾格」：9 格盤清完不該與 16 格盤等值。
         ⚠ 這是**取代**「HP 剩 1」那一條，不是加在它上面：粉碎仍然先把血歸到 1
           （那是惡夢化的代價），再依戰果補回來 —— 一格都沒清就還是 1。 */
      /* ⚠⚠⚠ **ver -994：回血拿掉**（Ray 定案）—— 定稿的「夢境破碎」只寫
         「保留已削減之 HP」，不再回血：夢魘化的那一段失血就真的是它的代價。
         ⚠ 欄位留著寫 0 不刪（`saint.js` 是 `if(NI_BURST_HEAL>0)` 才回），
           要加回來只要填一個數字（鐵律 1）。
         ⚠ 被推翻的是 ver -888／-892（「惡夢粉碎發動時可以回復最高 25% hp，
           視你在 NI 打掉的格數而定」「是回血 25% 不是回血到 25%」）。 */
      burstHealPct: 0,
      burstFullCells: 16,
      /* 自爆的名字與 cut-in（ver -674，Ray：「CI_Anya_Dreambreaker／夢境粉碎／
         這是安雅的主動技」）。
         ⚠ **不寫進她的搭檔卡的 `active`**：那一格是搭檔系統（`partner.tryActive`）
           在讀的 —— 寫進去的話聖徒化期間上滑會去問它，而夢境粉碎是**惡夢化自己的**
           主動技，只在 NI 期間存在（鐵律 8：一個動作一個入口）。 */
      burstName: '夢境粉碎',
      burstCutin: 'ci_anya_dreambreaker',
      /* ══⚠⚠ **熔斷就是 OBE**（ver -731，Ray 定案）══════════════════════════
         -692 的註解寫成「對稱的失敗結局，**不是**同一件事」—— 那是錯的，已更正：
         聖徒化推滿與惡夢化抽乾**是同一個結局的兩個方向**，所以行為要一致：
           · 都用那一張 cut-in（`CI_Anya_OBE`）
           · 都會被「有人在等這一拍」的閘門**擋住**，等玩家做完那個動作才輪到它
             （SI：生命歸還的上滑 → `saintCriticalPending`；
              NI：夢境粉碎的上滑 → `niBurstPending`）
           · 沒有人在等就照常發生
         ⚠ 螢幕上的字是 **DREAM AWAKE**（ver -731，Ray 指定）——「熔斷」是講機制時的
           說法，玩家看到的是這個字。⚠ 全大寫是跟著同一場的鄰居走
           （NIGHTMARE INSTALL／MAXIMUM BURST／EXSECUTIŌ 都是大寫）——
           同一場裡混大小寫會讀成排版失誤。 */
      meltdownName: 'DREAM AWAKE',
      meltdownCutin: 'ci_anya_obe',
    },

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
    /* ⚠⚠ **這兩個已經沒有人讀了**（ver -688，Ray：「把 boss 一進夢魘或聖徒就猛攻的
       設定拿掉」）—— 聖徒化／惡夢化期間不再改敵人的大絕頻率。欄位留著當紀錄，
       日後要恢復就把 `saint.js` 那兩行 `setAssaultRate` 加回去。 */
    saintUltMinMs:       1200,  // v18：聖徒化期間敵大絕發動頻率下限（毫秒；越小越密集）
    saintUltMaxMs:       2600,  // v18：聖徒化期間敵大絕發動頻率上限（毫秒）
    saintComboStep:      1.0,   // 聖徒化每 combo 疊傷斜率（無上限）。reference 為 0.5；本專案調 1.0
                                //   使單場 16 擊累計 ≈211（>200 目標）。見 DECISIONS.md D4。
    saintLastHitRatio:   0.20,  // 結束前清盤 → 追加期間總傷害的 20%（MB 爆發；維持 reference）

    // 攻擊加倍 buff
    atkBuffSeconds:      3,     // 攻擊加倍時長（秒）——完美反擊後的**唯一**獎勵（ver -947）
    /* 船戰（飛行頁交棒的那一場）BR 窗口期間敵人多吃的成數（ver -947，Ray：
       「只要船戰敵都吃這個就好了」）。取代逐卡的 `dualBonus`：那是**場次**的
       性質不是怪的性質，寫成規則之後新增飛行遭遇不必記得補欄位。 */
    shipDualBonus:       0.2,

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
  enemy_dart_counter: "resources/enemy/Dart_counter.webp",   // 蕃茄人11號：杰羅的自動人型靶（ver -862，Ray 交件）
  /* 禍魘娜塔莉（ver -671，Ray 交件）＋惡夢化 cut-in。
     ⚠ cut-in 住在 `resources/CI/`（Ray 指定；-672 曾誤指 `partner/`）。 */
  enemy_natalia:  "resources/enemy/mon_natalia.webp",
  /* ⚠⚠ `?v=2`：這兩張是**同名覆蓋**的（ver -689，Ray：「這兩個 CI 都有改」）——
     檔名沒變、內容變了，瀏覽器照樣拿舊的那一份（§5 的老坑，娜塔莉那一組踩過
     四版才查出來）。**一組要一起帶**，漏掉哪一張哪一張就被快取住。 */
  ci_anya_ni:     "resources/CI/CI_Anya_NightmareInstall.webp?v=2",
  /* 索菈娜的三張 CI（ver -803，Ray 交件於 resources/CI/）——共鬥／上滑 bullets rain／
     被動。⚠ 目前是 jpg/png（美術交件格式），轉 webp 後改副檔名（§5 轉檔三步）。
     ⚠ 伙伴立繪先用她的 SI 佔位（本篇強配不經選人，整備頁才顯示；Ray 交專用選人圖再換）。 */
  partner_sorana:     "resources/SI/Sorana_SI_front.webp",
  /* ver -837：索菈娜 CI 整批轉 webp（2.0~2.5MB 的 1024×1536 PNG → 0.10~0.27MB）——
     戰鬥中 cut-in 解碼那一口就是手機卡頓的主嫌之一；原 PNG 留在原位給美術 session。 */
  ci_sorana_predator: "resources/CI/CI_Sorana_predator.webp",
  ci_sorana_supply:   "resources/CI/CI_Sorana_supply.webp",   // -820 過渡圖 → -837 webp
  /* 獵手的直覺（被動）發動的 CI：三張隨機輪播（ver -809，Ray 指定）——與三位女角的合擊圖。 */
  ci_sorana_roar_renna:    "resources/CI/CI_Sorana_roar_Renna.webp",
  ci_sorana_roar_anya:     "resources/CI/CI_Sorana_roar_Anya.webp",
  ci_sorana_roar_nouvelle: "resources/CI/CI_Sorana_roar_Nouvelle.webp",
  ci_sorana_obe:           "resources/CI/CI_Sorana_obe.webp",   // 飛刀耗盡（共鬥結束，ver -822）
  /* 共鬥反擊的飛刀（ver -839，Ray 交件 weapon/dagger）：黑底光暈圖，畫面上走
     mix-blend-mode:screen（黑自然消失，同星芒那條的理由）。刀尖朝下＝畫的 +90°。 */
  vfx_dagger:         "resources/weapon/dagger.webp",
  se_soranacounter:    "resources/audio/se/se_soranacounter.m4a",     // 飛刀射出（ver -839）
  se_soranacounterhit: "resources/audio/se/se_soranacounterhit.m4a",  // 飛刀命中
  se_glasscrack:       "resources/audio/se/se_glasscrack.m4a",        // 破防/ovk 裂紋輻射（ver -839）
  /* 夢境粉碎（ver -674，Ray 交件）：惡夢化期間上滑的那一發。 */
  ci_anya_dreambreaker: "resources/CI/CI_Anya_Dreambreaker.webp?v=3",   // ver -702：Ray 又換了一版
  /* 惡夢化熔斷（ver -692，Ray 交件 `CI_Anya_OBE`）：倒數槽抽乾的那一結局。 */
  ci_anya_obe:    "resources/CI/CI_Anya_OBE.webp",
  /* stage7・養息之間那一拍（ver -922，Ray 的稿：安：CI_Anya_scared）。 */
  ci_anya_scared: "resources/CI/CI_Anya_scared.webp",
  /* 明晰之夢（ver -681 交件／-682 定中文名）：安雅的被動 —— HP≤30% 普攻加倍 5 秒。 */
  ci_anya_lucid:  "resources/CI/CI_Anya_Luciddream.webp?v=2",   // ver -708：Ray 換了一版（同名覆蓋 → 必掛 ?v，§5）
  /* 賞金獵人（ver -375）：戰鬥立繪＝對話立繪的 `attack` 那張（去背，配 `bg` 用）。 */
  /* ⚠⚠ **ver -975 修**（Ray 回報「賞金獵人戰中的敵人圖不見了」）：那 18 張 NPC 立繪
     ver -955 搬進 `resources/SI/NPC/` 時**這一條漏改**，於是這張圖一直是 404 ——
     而畫面上沒有任何錯誤訊息（同 -955 抓到的那一批）。
     ⚠ 它與 `speakers.js` 的 `ART.hunter.expr.attack` 是**同一張圖**（對話立繪借來當
       敵人立繪），那邊 -955 已經改對了，只有 ASSETS 這一份留在舊路徑。
     ⚠ 自檢法：把 config 裡所有 `"resources/…"` 字串抓出來逐個 `test -f` ——
       這一次全檔只有這一條是壞的。 */
  enemy_guild_hunter: "resources/SI/NPC/NPC_GuildHunter_SI_Attack.webp",
  /* ══⚠⚠ 北方泊地城鎮戰的雜怪（ver -596，Ray 指定四隻隨機出）＋教堂的 Boss（祭壇獸）══
     ⚠⚠ **一定要放在 `resources/enemy/` 底下，不可以留在 `_drafts`**（ver -595，
       Ray 回報「手機端讀不到怪的圖」）：靜態空間（GitHub Pages）跑的是 Jekyll，
       **底線開頭的檔案與資料夾整個被忽略**，而 `_drafts` 還正好是 Jekyll 的保留字
       —— 本機的 dev server 照給，線上一律 404，所以只有手機（吃線上版）看不到。
       ⚠ 順手補了根目錄的 `.nojekyll`（那才是根治：以後任何底線路徑都不會消失），
         但**草稿還是不要直接引用** —— `_drafts` 的意思就是「還沒選定」。 */
  enemy_np_candletower:    "resources/enemy/mon_relic_candletower.webp",
  enemy_np_candlepenitent: "resources/enemy/mon_relic_candlepenitent.webp",
  enemy_np_coralman:       "resources/enemy/mon_sea_coralman.webp",
  enemy_np_reassembled:    "resources/enemy/mon_relic_reassembled.webp",
  /* ⚠ 美術把 `mon_beast_altar` 更名成 `mon_beast_reliquary`（ver -928 才發現）——
     舊檔名一直指著一個不存在的檔案＝北泊教堂 Boss 沒有立繪，而**畫面上不會有錯誤訊息**。
     自檢：把 config 裡所有 resources 路徑抓出來逐個 `test -f`（同 §5 的同名覆蓋自檢）。 */
  enemy_np_boss: "resources/enemy/mon_beast_reliquary.webp",
  /* 教堂那一場之後的真 BOSS：**瓦礫中生出的紫黑之爪**（ver -595，Ray：「boss 圖為
     TheClaws」）。⚠ 這一張是**連背景一起畫的整張戰鬥圖**（規格見
     `resources/background/_boss_claw_spec.md`）—— 所以敵人卡**不給 `bg`、不給
     `fit.contain`**，走預設的 cover 滿版；那兩個是給去背立繪配背景用的。 */
  enemy_np_claws: "resources/enemy/TheClaws.webp",
  /* 夏爾村村內戰（ver -802，Ray 交稿）—— 敵人卡見 script/enemies.js 的 sv_*。
     ⚠ bear／stag 目前仍是 **.png**（美術尚未去背轉 webp）：先指 .png 讓它載得出來，
       轉檔後把副檔名改成 .webp（同 §5 的轉檔三步）。其餘四張已是 webp。 */
  enemy_sv_wolf_pack:     "resources/enemy/mon_wolf_pack.webp?v=2",
  enemy_sv_beast_organ:   "resources/enemy/mon_beast_organ.webp?v=2",
  enemy_sv_stag:          "resources/enemy/mon_stag_nightmare.webp",   // ver -845：2.4MB PNG → webp（手機發燙/圖讀不出來的調查）
  enemy_sv_beast_shackle: "resources/enemy/mon_beast_shackle.webp?v=2",
  enemy_sv_bear:          "resources/enemy/mon_bear_nightmare.webp",   // 同上
  enemy_sv_reliquary:     "resources/enemy/mon_beast_reliquary.webp?v=2",
  /* ══ 夏爾森林野生怪（ver -862，卡在 script/enemies.js 的 sf_ 系列）══
     ⚠ 夜間的熊骸/鹿骸**沿用 enemy_sv_bear／enemy_sv_stag**（同一張圖一個鍵，鐵律 7）。 */
  enemy_sf_lynx:      "resources/enemy/mon_shinierforest_lynx.webp",
  enemy_sf_snake:     "resources/enemy/mon_shinierforest_snake.webp",
  enemy_sf_hog:       "resources/enemy/mon_shinierforest_hog.webp",
  enemy_sf_tiger:     "resources/enemy/mon_shinierforest_tiger.webp",
  enemy_sf_crows:     "resources/enemy/mon_shinierforest_crows.webp",
  enemy_sf_deer:      "resources/enemy/mon_shinierforest_deer.webp",
  enemy_sf_bear_husk: "resources/enemy/mon_bear_husk.webp",
  enemy_sf_stag_rot:  "resources/enemy/mon_stag_rot.webp",
  enemy_sf_deer_nightmare: "resources/enemy/mon_shinierforest_deernightmare.webp",   // 鹿主變異（ver -870，G 稿）

  /* ══ 木雅克神殿的怪（ver -919，Ray 交表）══ 圖是 Ray 交的 PNG，這一版轉成 webp
     （原 PNG 進 `resources/_originals/enemy/`，§5 的三步）。
     ⚠ `mon_beast_bonemaw`（覆骨者）ver -920 補進庫（Ray），已放回刷怪池。 */
  enemy_ruins_bonemaw:           "resources/enemy/mon_beast_bonemaw.webp",
  enemy_ruins_bellreacher:       "resources/enemy/mon_relic_bellreacher.webp",
  enemy_ruins_halo_ring:         "resources/enemy/mon_halo_ring.webp",
  enemy_ruins_heartripper:       "resources/enemy/mon_relic_heartripper.webp",
  enemy_ruins_bellwalker:        "resources/enemy/mon_relic_bellwalker.webp",
  enemy_ruins_saint_prison:      "resources/enemy/mon_saint_prison.webp",
  enemy_ruins_saint_inspector:   "resources/enemy/mon_saint_inspector.webp",
  enemy_ruins_saint_thug:        "resources/enemy/mon_saint_thug.webp",
  enemy_ruins_saint_temperance:  "resources/enemy/mon_saint_Temperance.webp",

  /* ══⚠⚠⚠ 聖遺物系 10 隻 —— **先註解著，開峽谷的時候再放**（ver -934，Ray 定案）══
     卡已經備好（`script/enemies.js` 的 `relic_*`，十張數值一樣等逐張調），
     圖也已經入庫（`resources/enemy/mon_relic_*.webp`）—— **只有這一段沒接上**。
     ⚠⚠ **為什麼要註解**：登記進 `ASSETS` 就會進**開機第二段的背景預載**
       （main.js 的 `_restImgs`，進主選單那一刻開載）—— 這 10 張合計 **3.87 MB**，
       而現在遊戲裡一隻都遇不到。手機冷啟動白背 3.87 MB 換不到任何東西。
     ⚠⚠ **要放回來時，這一段與戰鬥卡兩邊一起改**（漏一邊都是沉默的失敗）：
       ① 把下面十行的註解拿掉 ② 在**戰鬥卡**那邊把它們接進 `enemy:[…]` 或刷怪池。
       只放①＝多載 3.87 MB 但還是遇不到；只放②＝`asset()` 回空字串、怪沒有立繪
       （而畫面上不會有任何錯誤訊息 —— 同 -929 那隻教堂 Boss 踩過的坑）。
  enemy_relic_mirrorchoir:   "resources/enemy/mon_relic_mirrorchoir.webp",
  enemy_relic_bellows:       "resources/enemy/mon_relic_bellows.webp",
  enemy_relic_confessional:  "resources/enemy/mon_relic_confessional.webp",
  enemy_relic_hourglass:     "resources/enemy/mon_relic_hourglass.webp",
  enemy_relic_keyward:       "resources/enemy/mon_relic_keyward.webp",
  enemy_relic_lectern:       "resources/enemy/mon_relic_lectern.webp",
  enemy_relic_censerlung:    "resources/enemy/mon_relic_censerlung.webp",
  enemy_relic_veilhands:     "resources/enemy/mon_relic_veilhands.webp",
  enemy_relic_wheelpsalm:    "resources/enemy/mon_relic_wheelpsalm.webp",
  enemy_relic_chalice:       "resources/enemy/mon_relic_chalice.webp",
  */

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
  /* 安雅（ver -671）。⚠ 暫用她的對白立繪，同諾薇兒那一張的作法。 */
  partner_anya:   "resources/SI/Anya_SI_front.webp",
  /* ── 教學（劇情版）的諾薇兒立繪與差分（ver -323）──────────────────────
     ⚠ 這一組**只給劇情帶起來的教學**用（tutorial.isStoryRun()）。首頁「教學」鈕
       那一場仍是芙蕾雅／蕾妮 —— Ray 指定兩者要分開。 */
  tut_nouvelle:          "resources/SI/Nouvelle_SI_front.webp",
  tut_nouvelle_cringe:   "resources/SI/Nouvelle_SI_Cringe.webp",
  tut_nouvelle_surprise: "resources/SI/Nouvelle_SI_Surprise.webp",
  tut_nouvelle_desperate:"resources/SI/Nouvelle_SI_Desperate.webp",
  tut_nouvelle_saint:    "resources/SI/Nouvelle_SI_SAINTINSTALL.webp",
  /* ══⚠⚠ **戰鬥內對白（`battles[].talk`）用到的立繪也要在這裡登記**
     （ver -607，Ray：「聖徒化教學的立繪一直沒讀到」）══
     `portraitFrames` 給的是**取景值**，圖的**路徑**要在 ASSETS 這一份 ——
     兩份都要有，少一邊就是「有位置沒有圖」。
     ⚠⚠ 船艦戰那一組（ver -429 的 `tut_renna*`／`tut_nouvelle_steady`／`_run`）
       **從來沒登記過** —— 那一場的立繪應該一直都是空的，順手一起補。
     ⚠ 路徑一律**抄 `ART`**（`script/speakers.js` 那一份，鐵律 7）：
       換圖只改那裡，這邊自動跟上；寫死字串必然走鐘。 */
  tut_renna:                ART.renna.base,
  tut_renna_shocked:        ART.renna.expr.shocked.src,
  tut_renna_run:            ART.renna.expr.run.src,
  tut_renna_thinking:       ART.renna.expr.thinking.src,
  tut_renna_ask:            ART.renna.expr.ask.src,
  tut_renna_shout:          ART.renna.expr.shout.src,
  tut_nouvelle_steady:      ART.nouvelle.expr.steady.src,
  tut_nouvelle_run:         ART.nouvelle.expr.run.src,
  tut_nouvelle_saintinstall:ART.nouvelle.expr.saintinstall.src,
  /* 禍魘娜塔莉戰（ver -671）。 */
  tut_anya_terrifying:      ART.anya.expr.terrifying.src,
  tut_anya_ni:              ART.anya.expr.nightmareinstall.src,
  /* ⚠ 檔名 ver -454 由 Ray 改為 `CI_` 前綴（`Nouvelle_SAINTINSTALL` → 同名加前綴）。 */
  cutin_nouvelle_saint:  "resources/CI/CI_Nouvelle_SAINTINSTALL.webp",   // 全畫面 cut-in
  /* ══ 本篇（story）的 cut-in 差分（ver -454，Ray 指定三張）══════════════
     試玩版照舊用 Luna／Renee 那一組；分流都走 `storyMode()`（鐵律 8）：
       破防     → weapon.activateDual
       聖徒化   → saint.activateSaint（搭檔為諾薇兒時）
       生命歸還 → saint.playSaintCutin('return') */
  cutin_dual_torsten:    "resources/CI/CI_Torsten_Dualcrush.webp",
  /* ══ 本篇的 MB／處決 cut-in（ver -702，Ray 交件）══ 試玩版照舊 Luna（見 cutin_mb／
     cutin_exc）；分流走 `storyMode()`，與破防／生命歸還那兩張同一套（鐵律 8）。
     ⚠ ver -703：檔名的拼字由 `Excute` 更正為 `Execute`（Ray 指定）。 */
  cutin_mb_torsten:      "resources/CI/CI_Torsten_MB.webp",
  cutin_exc_torsten:     "resources/CI/CI_Torsten_Execute.webp",
  /* ══ 本篇的生命歸還／OBE cut-in（ver -703，Ray 交件）══
     ⚠ 生命歸還原本**借** `Nouvelle_Sturm`（ver -454 的權宜）—— 正牌的來了就換掉。
       那張 Sturm 留著（她自己的招，日後用得到）。
     ⚠ OBE 在本篇也換成諾薇兒：那一拍是**搭檔**把靈魂拉回來，本篇的搭檔是她。
       試玩版照舊 Luna。 */
  cutin_return_nouvelle: "resources/CI/CI_Nouvelle_Lifereturn.webp",
  cutin_obe_nouvelle:    "resources/CI/CI_Nouvelle_OBE.webp",
  partner_malzeno: "resources/partner/Malzeno_SI_01.webp",   // 馬季諾 立繪
  cutin_boss: "resources/enemy/Belinda_CI_boss.jpg",   // v18d：Boss（貝琳妲）遭遇 cut-in 專屬圖
  bg_sentou: "resources/background/SENTOUINSTALL.webp",
  /* 瑪麗亞的料理插圖（ver -953）。⚠ **只有第一道有圖**，其餘九道等美術；
     `cooking.dishes[x].ci` 查不到就不出插圖，不會壞。 */
  dish_deersteak: "resources/dishes/di_deersteak.webp",
  /* 料理演出用的兩張鍋子（0.75 秒交替＝煎的動作，見 Stage8 的廚房拍）。 */
  dish_panup:     "resources/dishes/panup.webp",
  dish_pandown:   "resources/dishes/pandown.webp", // Boss 戰 S 級獎勵畫面（銭湯インストール）

  // ── 副武器圖（換裝選單縮圖）：鑰匙對應 weapons.image；檔名＝類型_武器名 ──
  /* 巨型蜈蚣（ver -423）：**三張時段差分**（Ray 指定：上午下午 day、晚上 night、
     黃昏黎明 dd）。解析在 `modules/enemy.js` 的 `enemyImage()`，那裡是唯一一處。 */
  enemy_centipi_day:   "resources/enemy/Centipi_day.webp",
  enemy_serpent_day:   "resources/enemy/Serpent_day.webp",     // 羽蛇（ver -500，Ray 的卡）
  enemy_pirate_day:    "resources/enemy/Pirateship_day.webp",   // 空賊船（ver -509，Ray 的卡）
  enemy_pirate_dd:     "resources/enemy/Pirateship_DD.webp",
  enemy_pirate_night:  "resources/enemy/Pirateship_night.webp",
  enemy_serpent_dd:    "resources/enemy/Serpent_DD.webp",
  enemy_serpent_night: "resources/enemy/Serpent_night.webp",
  enemy_centipi_night: "resources/enemy/Centipi_night.webp",
  enemy_centipi_dd:    "resources/enemy/Centipi_DD.webp",
  /* ══ 新怪圖：卡是 `newcards` 建的「最普通的怪」，數值等 Ray 手動改 ══ */
  enemy_bug_mantis:               "resources/enemy/mon_bug_mantis.webp",
  enemy_relic_bellascetic:        "resources/enemy/mon_relic_bellascetic.webp",
  enemy_rictus_hooked:            "resources/enemy/mon_rictus_hooked.webp",
  inspector_renna:     "resources/SI/Renna_SI_front.webp",         // 讀取頁的說明者（出航後）
  /* ⚠ ver -1037：破防計量表的月牙（`clasp_moon` / `clasp_moon_frame`）**已退場**
     —— Ray：「放棄原本的計量設計，改成以角色圓頭像為中心…」。兩張圖仍留在
     `resources/vfx/`（他的原圖，沒有回收），但**不再登記進 ASSETS**：留著只會讓
     開機那一批白抓兩張沒有人要用的圖。要回頭用把這兩行接回來就行。 */
  /* ── 副武器切換鈕的類別徽章（ver -549，Ray 交件：連射/散射/高爆）──
     原檔白底 → 轉檔時沿金環裁圓去背、縮 256（原 PNG 在 _originals/vfx）。 */
  switch_mg:    "resources/vfx/Switch_MG.webp",
  switch_split: "resources/vfx/Switch_Split.webp",
  switch_hyper: "resources/vfx/Switch_Hyper.webp",
  /* 主武器（ver -699）：交叉雙槍＝整備頁的卡；單槍留著給日後的改裝頁。 */
  weapon_ganymede_ab:   "resources/weapon/GanymedeAB.webp",       // 迦尼米德 α（上）＋β（下）＝整備頁的卡
  weapon_ganymede_twin: "resources/weapon/GanymedeTwin.webp",     // 交叉雙槍（備用）
  weapon_ganymede:      "resources/weapon/Ganymede.webp",         // 迦尼米德 單支（黑底）
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
  se_enemy_serpent:  "resources/audio/se/Se_enemy_serpent.m4a",   // 羽蛇出場（ver -500）
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
  se_weapon_cannon:  "resources/audio/se/se_weapon_cannon.m4a?v=2",   // 船戰高爆(爆發型)發射音（ver -816 Ray 更新素材）
  se_weapon_cannonshell: "resources/audio/se/se_weapon_cannonshell.m4a",  // 船戰高爆的彈殼音（發射同時，ver -816）
  se_weapon_riflereload: "resources/audio/se/se_weapon_riflereload.m4a",  // 陸戰高爆發射後 0.5s 上膛音（ver -816）
  se_weapon_shell:   "resources/audio/se/se_weapon_shell.m4a",    // 砲彈殼落地（舊船戰高爆跟播音，-816 起未用）
  se_healing:        "resources/audio/se/se_healing.m4a",   // 使用回復道具（ver -499，Ray 交件）
  /* 旅店「回房睡覺」（ver -430，Ray 交件）。⚠⚠ **淡出至黑的長度就是這支的長度** ——
     不要在別處寫一個秒數（鐵律 7）：`modules/inn.js` 問 `SFX.duration()` 拿實測值。
     ⚠ 它還是 **mp3**（316 KB）；§6.6 規約是 AAC/m4a，但這台機器沒有轉檔工具。
       轉檔時**檔名別改**（改了 ASSETS 與這一行的註解都要跟著動），
       而且轉檔不改響度，所以下面那個增益不必重算。 */
  se_sleep:          "resources/audio/se/Se_sleep.mp3",
  // 聖徒化發動音效
  //  ⚠ 素材「內容」更新但檔名不變時,在路徑加/升 ?v=N 強制手機重抓(HTTP 快取以 URL 為鍵)。
/* 咬痕特效圖（ver -761，Ray 交件）：CSS 背景用同一路徑 —— 這裡登記只為了
     進開機預載批把 HTTP 快取暖起來，第一口咬下去才不會白框。 */
  ef_bite: "resources/effects/ef_bite2.webp",   // ver -766 換 ef_bite2（舊 ef_bite.webp 留檔備選）
  sfx_saint:         "resources/audio/se/se_saint_install.m4a?v=3",

  // 完美防禦（完防）合成替代音（一般武器；散彈完防維持自己的槍聲）
  se_guard:          "resources/audio/se/se_weapon_guard.m4a",
  /* 點錯**被擋下來**的那一聲（ver -1015，Ray：「無敵期間點錯，容許點錯時與
     se_windblock 一同播放」）—— 與失誤語音是**同時**播的兩層：語音是她的反應，
     這一聲是「這一下沒有落在你身上」。鑰匙在搭檔卡上的 `missBlockSe`。 */
  se_windblock:      "resources/audio/se/se_windblock.m4a",
  /* 升級音（ver -1033，Ray：「升級播放 se_lvup」）——結算頁 EXP 條推過一級時響一聲，
     鑰匙在 `rating.exp.levelUpSe`（全域，不逐角色）。 */
  se_lvup:           "resources/audio/se/se_lvup.m4a",

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
  /* ══ ver -711：Ray 一次交了一批語音，逐支嵌到對應場合 ══════════════════════
     ⚠ **本篇與試玩版分家**：托爾斯滕／諾薇兒／安雅是本篇的人，露娜與蕾妮留給
       挑戰（出陣）—— 分流一律走 `storyMode()`（鐵律 8，同 cut-in 圖那一套）。 */
  vo_dual_torsten2:  "resources/audio/vo/vo_torsten_dualcrush2.m4a",   // 破防第二版（與上面交互）
  vo_torsten_mb:     "resources/audio/vo/vo_torsten_mb.m4a",           // Maximum Burst
  vo_torsten_exc:    "resources/audio/vo/vo_torsten_execute.m4a",      // 處決 EXSECUTIŌ
  vo_nou_saint:      "resources/audio/vo/vo_nouvelle_saintinstall.m4a?v=2",// 聖徒化降臨（?v=2：ver -837 新錄音同名覆蓋）
  vo_nou_obe:        "resources/audio/vo/vo_nouvelle_obe.m4a",         // O.B.E.
  vo_nou_guard:      "resources/audio/vo/vo_nouvelle_deathguard.m4a?v=2",  // 即死防禦（?v=2 同上）
  vo_nou_return:     "resources/audio/vo/vo_nouvelle_lifereturn.m4a?v=2",  // 生命歸還（?v=2 同上）
  vo_anya_ni:        "resources/audio/vo/vo_anya_nightmareinstall.m4a",// 惡夢化降臨
  vo_anya_burst:     "resources/audio/vo/vo_anya_dreambreaker1.m4a",   // 夢境粉碎（預設）
  vo_anya_burst2:    "resources/audio/vo/vo_anya_dreambreaker2.m4a",   // 夢境粉碎（娜塔莉戰，見戰鬥卡）
  vo_anya_melt:      "resources/audio/vo/vo_anya_obe.m4a?v=2",             // 熔斷 MELTDOWN（?v=2 同上）
  /* 明晰之夢語音（ver -759 ×4 輪播 → ver -837 收成單支新錄音）。 */
  /* ?v=2：Ray 重錄後同名覆蓋（ver -881）——同名換檔一定要掛 cache-buster（§5）。 */
  vo_anya_lucid:     "resources/audio/vo/vo_anya_luciddream.m4a?v=2",
  /* Reload 三兄弟（ver -894，Ray 交件）——聖徒／夢魘各自的 reload 語音與 CI。
     ⚠ `?v=2`：諾薇兒那支是**同名覆蓋**（-893 那版已被新錄音取代），必掛 buster（§5）。 */
  vo_nou_saintreload:"resources/audio/vo/vo_nouvelle_saintreload.m4a?v=2",
  vo_anya_nireload:  "resources/audio/vo/vo_anya_nightmarereload.m4a",
  cutin_saintreload: "resources/CI/CI_Nouvelle_saintreload.webp",
  cutin_nireload:    "resources/CI/CI_Anya_Nightmarereload.webp",
  /* 索菈娜語音（ver -818，Ray 交件）——共鬥發動 pack/pack2 輪播、共鬥結束 obe、
     供給技 supply；pack2 另作 man_sorana 敵登場音。 */
  vo_sorana_pack:    "resources/audio/vo/vo_sorana_pack.m4a?v=2",   // ?v=2：ver -837 新錄音同名覆蓋
  vo_sorana_pack2:   "resources/audio/vo/vo_sorana_pack2.m4a?v=2",
  vo_sorana_supply1: "resources/audio/vo/vo_sorana_supply1.m4a",   // ver -837：獵手的智慧 ×2 輪播
  vo_sorana_supply2: "resources/audio/vo/vo_sorana_supply2.m4a",
  vo_sorana_obe1:    "resources/audio/vo/vo_sorana_obe1.m4a",   // ver -837：飛刀耗盡 ×2 輪播
  vo_sorana_obe2:    "resources/audio/vo/vo_sorana_obe2.m4a",
  /* ══ 點錯的失誤語音（ver -1015，Ray 交檔）══ 三支輪播，走 `SFX.pickRot`（鐵律 8）。
     **只要點錯就出**（不分是不是被容錯／無敵擋下），鑰匙在搭檔卡上的 `missVoice`。
     ⚠ 交件是 wav，已照 §6.6 轉成 m4a（96k）、原檔進回收區。
     ⚠⚠ **`tuning.fileGain` 還沒量**（見那一節的說明）—— 沒補就是以母帶響度播出，
       §6.6 的 `se_steps` 事件就是這樣「永遠不出來」的。用 tools/audio_scan.html 量。 */
  /* ⚠ `?v=2`（ver -1032）：Ray 換了新錄音而**檔名沒變** —— 不加 cache-buster 的話
     已經載過舊檔的瀏覽器會一直拿舊的那一份（§5 那條「同名覆蓋的圖一定要加 ?v=N」，
     音檔同理）。⚠ `tuning.fileGain` 的鑰匙會**去掉 `?v=`** 再查，所以不受影響。 */
  /* ⚠⚠⚠ **`?v=3`：miss1 退回 -1015 的原始錄音**（ver -1035，Ray：「諾薇兒的 miss 音
     接錯了，有一個接到 vo_anya_nightmarereload 去」「我聽到的就是那個行けまーす」）。
     ⚠⚠ **接線沒有錯，錯的是那個檔案**：三個鍵各自指向同名的 m4a，三支的 md5 與
       音訊指紋彼此不同、也都不等於 `vo_anya_nightmarereload` —— -1032 交進來的
       那一支**內容本身**就是安雅那句台詞的另一個 take（1.80 秒，而三支 miss 是
       1.42／0.88／0.59）。所以**沒有第二個地方可以接錯**，只能換檔。
     ⚠ 這種錯**程式驗不出來**：檔名對、路徑對、載得到、響度也量得出來 ——
       只有聽的人分得出那是誰在講話。交檔換錄音時值得順手確認一次時長。
     ⚠ 三支**一起**掛 buster：`?v=` 漏掉哪一支，哪一支就被快取住（§5）。 */
  vo_nouvellemiss1:  "resources/audio/vo/vo_nouvellemiss1.m4a?v=3",
  vo_nouvellemiss2:  "resources/audio/vo/vo_nouvellemiss2.m4a?v=3",
  vo_nouvellemiss3:  "resources/audio/vo/vo_nouvellemiss3.m4a?v=3",
  vo_sorana_miss1:   "resources/audio/vo/vo_sorana_miss1.m4a",
  vo_sorana_miss2:   "resources/audio/vo/vo_sorana_miss2.m4a",
  vo_sorana_miss3:   "resources/audio/vo/vo_sorana_miss3.m4a",
  vo_sorana_miss4:   "resources/audio/vo/vo_sorana_miss4.m4a",   // ver -1105（原 wahetta.wav）
  /* ══ 升級語音（ver -1033，Ray 交檔）══ 三位各一支，與 `se_lvup` **同時**播：
     SE 是系統的一聲、語音是她的反應（同失誤那兩層的關係）。
     鑰匙在各自的搭檔卡 `levelUpVoice`（可寫陣列＝輪播）。
     ⚠ Ray 只點名了 anya 與 sorana，但 `vo_nouvelle_lvup` 也在交件裡 —— 三位都接上，
       少一位的話諾薇兒升級只有 SE，讀起來像漏了。 */
  vo_nouvelle_lvup:  "resources/audio/vo/vo_nouvelle_lvup.m4a",
  vo_anya_lvup:      "resources/audio/vo/vo_anya_lvup.m4a",
  vo_sorana_lvup:    "resources/audio/vo/vo_sorana_lvup.m4a",
  vo_sorana_roar:    "resources/audio/vo/vo_sorana_roar.m4a?v=3",   // ver -859：Ray 更新 5連完美戰吼   // 獵手的戰吼・連5盤那一發（ver -837 新錄音）
  vo_sorana_roar2:   "resources/audio/vo/vo_sorana_roar2.m4a",      // 獵手的戰吼・連3盤那一發
  se_luna_exc:       "resources/audio/vo/vo_luna_execution.m4a",    // 處決 EXSECUTIŌ cut-in
  /* ⚠ ver -641 改名 `se_saint_maxburst` → `vo_saint_maxburst`（它是語音）。
     ⚠ **檔案還躺在 `se/`**（同 `vo_lunaMG` 那一筆，等 Ray 點頭再搬 `vo/`）——
       所以路徑照實寫，不要照 `vo_` 前綴推資料夾。 */
  se_luna_mb:        "resources/audio/se/vo_saint_maxburst.m4a",     // Maximum Burst cut-in
  se_luna_obe:       "resources/audio/vo/vo_luna_obe.m4a",    // O.B.E. cut-in

  // 敵人攻擊音（依攻擊種類 kind：ult 大絕命中/不完美防禦格擋、delay 太慢、wrong 按錯）。
  em_slash:          "resources/audio/se/se_enemy_slash.m4a",    // 聖徒：大絕/不完美防禦/按錯
  em_smack:          "resources/audio/se/se_enemy_smack.m4a",    // 聖徒：延時懲罰
  em_shot:           "resources/audio/se/se_enemy_shot.m4a",     // Boss：延時懲罰
  em_revolver:       "resources/audio/se/se_enemy_revolver.m4a", // Boss：大絕/不完美防禦（左輪）
  em_dagger:         "resources/audio/se/se_enemy_dagger.m4a?v=2", // Boss：按錯（ver -899 換新音，同名覆蓋 → ?v）
  /* 櫻花受擊（ver -899，Ray：「櫻花受擊音效是 se_enemy_sakura，只在第一 hit 播」）。
     ⚠ 它**不掛在 `HITFX.sakura.se` 上** —— 那條路是每一擊都播，而這一招一波三顆。
       由 `enemy.spawnSakura` 播，那一支「一陣風只跑一次」，所以自然只有第一下有聲。 */
  em_sakura:         "resources/audio/se/se_enemy_sakura.m4a",

  /* 普攻槍聲：**固定用 pistol_03，不隨機**（ver -37 定案；main.js 的 setShots）。
     pistol_01/02 的 ASSETS 鍵已清（ver -567）——音檔本身仍在 SE_FILES（劇情層在用），別刪檔。 */
  se_pistol_03:      "resources/audio/se/se_weapon_pistol_03.m4a",  // 普攻槍聲（現行）
  /* 鹿主的櫻花狂亂（ver -899，Ray：「音效用 sturm」）—— 與飛行頁的加速音同一支檔案
     （那邊是 `../resources/audio/se/Sturm.m4a`，非 module 頁面自己 new Audio）。
     ⚠ 它**不是**一次性受擊音：由 `enemy.spawnSakura` 用 `SFX.playCue` 播、兩秒淡出，
       所以 `HITFX.sakura` 那一列刻意沒有 `se`（見那裡的說明）。
     ⚠ 增益查表的鑰匙是**檔名**（`sturm`），`tuning.fileGain` 早就有那一列。 */
  se_sturm:          "resources/audio/se/Sturm.m4a",

  // BGM（loop、不可交疊，切歌時前一首淡出）。
  //  BGM 一律 .m4a（AAC-LC 96k，自 128k MP3 轉檔，體積 −24%）：全平台原生支援；
  //  .mp3 母帶在 resources/audio/bgm/_master/，需要重轉時用 ffmpeg -c:a aac -b:a 96k。
  bgm_home:      "resources/audio/bgm/bgm_mainmenu.m4a",       // 主選單（含次要選單）
  bgm_crisis:     "resources/audio/bgm/PerituneMaterial_Crisis_loop.m4a",   // 劇情/教學的緊張曲；教學結算也用它（ver -361，Ray：結算不要 result BGM）
  /* ══ 北方泊地那一段的三首（ver -614，Ray 交辦）══
       抵達／城鎮戰打完到 BOSS 登場前 → `bgm_suspense`（Suspense6）
       城鎮戰進行中                   → `bgm_crisis`（既有那一首）
       BOSS（紫黑之爪）               → `bgm_crimson`（Crimson Moon）
     ⚠ 兩首新的都要進 Credit（Ray 指定，見 index.html 的 BGM Source）。
     ⚠ 兩首都用 **m4a**（§6.6 的規約）：ogg 在 Safari 17 以前整個不支援，
       手機上會變成「那一段沒有音樂」。Crimson_Moon 的 m4a 版由 Ray 於 -615 補上。 */
  bgm_suspense:   "resources/audio/bgm/PerituneMaterial_Suspense6_loop.m4a",
  /* 船戰兩首（ver -741，Ray：「船戰禍魘默認這一首」「船戰的空賊戰定成 bgm_piratebattle」）。
     禍魘船戰的「默認」規則在 battleBgm.shipHarm（main.battleBgmOf 讀）；
     空賊寫在 flight_pirate 卡上。 */
  bgm_epicbattle:   "resources/audio/bgm/PerituneMaterial_EpicBattle_loop.m4a",
  /* 安雅為夥伴時的戰鬥曲（ver -873，Ray 指定 BattleField4——混亂 session 遺失件補回）。 */
  bgm_battlefield4: "resources/audio/bgm/PerituneMaterial_BattleField4.m4a",
  bgm_frosylva:     "resources/audio/bgm/PeriTune_Frosylva.m4a",   // 木雅克神殿（ver -876）
  bgm_lostplace:    "resources/audio/bgm/PerituneMaterial_Lost_place4_loop.m4a",   // 鹿主異化～戰鬥（ver -877）
  bgm_piratebattle: "resources/audio/bgm/bgm_piratebattle.m4a",
  /* 湖上甲板那一段（ver -744，Ray 的 stage5 稿）。 */
  bgm_misty:        "resources/audio/bgm/Peritune_Misty_Hollow_loop.m4a",
  bgm_whirlwind:    "resources/audio/bgm/Peritune_Whirlwind.m4a",   // 索菈娜為夥伴的戰鬥曲（ver -837；ver -1105 刪掉下面那份重複的）
  bgm_whistling:    "resources/audio/bgm/Peritune_Whistling_Winds_loop.m4a",
  /* ver -745：Ray 交專用戰鬥圖（man_sorana.jpg → webp，原檔入 _originals）。 */
  enemy_man_sorana: "resources/enemy/man_sorana.webp",
  bgm_crimson:    "resources/audio/bgm/Peritune_Crimson_Moon_loop.m4a",
  /* 打靶場（計時挑戰）專屬曲（ver -658，Ray：「所有打靶遊戲都用這個音樂」）。
     ⚠ 哪一場用它**不寫在卡上**而是規則：見下面的 `battleBgm.timeAttack`。 */
  bgm_hopstep:    "resources/audio/bgm/Peritune_Hopstep_Battle_loop.m4a",
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
  const need = { nouvelle:['steady','run'], renna:['shocked','run'],
                 /* ver -839：夏爾村村戰的戰鬥內對白。 */
                 sorana:['guardtalk','ready'],
                 sh_villager:[], sh_villager2:[], sh_chief:[] };
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
/* ══⚠⚠ 三級防禦逐帶的行為（ver -706，Ray 交規格）══════════════════════════
   Ray：「遊戲的爽感要大於難度，我把難度放在角色攻略與解鎖劇情還有升級素材」

   一張表講完三帶，**卡上寫、這裡讀，只有這一個計算點**（鐵律 1＋7）：
     `bands.block`（黃）／`bands.perfect`（橘）／`bands.counter`（紅，可省略）
   每一帶的欄位：
     `counter:true` 這一帶也反擊（紅圈永遠反擊，不必寫）
     `dmgPerHit:N`  這一帶的反擊**每發絕對傷害**（卡上寫幾就存幾，同敵人卡的原則）
     `dmgScale:x`   或用比例（沒寫 `dmgPerHit` 時才看）；兩個都沒寫＝全額
     `dmgRoll:[…]`  **每一發從這幾個值裡等機率抽**（ver -708，Ray：「1 跟 0 是黃圈的
                    時候跳的數字，只有 1 跟 0，機率一半，不要全都 1 很沒感」）——
                    它蓋過上面兩個。⚠ 與 `hit`（命中率）是**兩件事**：沒中跳 MISS，
                    抽到 0 跳的是**數字 0** —— 那是「打到了但只有一點」，讀感不同。
     `hit:0..1`     命中率（沒寫＝1）。⚠ **第一發一定命中**，見 weapon.weaponCounter
     `take:0..1`    這一帶挨多少大絕傷（沒寫＝0 免傷；紅圈永遠 0）
   ⚠⚠ **會反擊的帶就不挨傷**（ver -709，Ray：「現在點黃圈還是受擊」）——
     -706 我在機槍的黃圈留了 `take:0.5`（沿用舊的減傷 50%），那是我自己加的，
     Ray 的規格只講了命中率。整套的讀法是：**擋下來就是擋下來了**，
     「點了還是會挨打」是**狙擊獨有**的性格（黃 1/2、橘 1/4），不是通則。
   ⚠ 欄位保留（日後真的要一把「能反擊但擋不乾淨」的槍還是寫得出來），
     只是現在沒有人用它 —— 除了狙擊那兩帶。
   ⚠ 舊欄位 `defenseDamageScale`／`perfectDmgPerHit`／`noPerfectBand` **已退役**
     —— 六張卡全部改寫成 `bands`，不留第二套（鐵律 7）。
   ⚠ 本篇與試玩版**行為相同**（Ray：「試玩版跟著改」），所以 `bands` 只寫在卡本體；
     `story:{}` 只覆寫數值（hits／dmgPerHit）。 */
export function weaponBand(w, grade){
  const b = (w && w.bands && w.bands[grade]) || {};
  const full = (w && w.dmgPerHit) || 0;
  const dmgPerHit = (b.dmgPerHit!=null) ? b.dmgPerHit
                  : (b.dmgScale!=null ? Math.max(1, Math.round(full*b.dmgScale)) : full);
  return {
    counter: (grade==='counter') ? true : !!b.counter,
    dmgPerHit,
    scale: full ? (dmgPerHit/full) : 1,
    roll: Array.isArray(b.dmgRoll) ? b.dmgRoll.slice() : null,
    hit:  (b.hit!=null) ? b.hit : 1,
    take: (grade==='counter') ? 0 : ((b.take!=null) ? b.take : 0),
  };
}
export function weaponStatRows(key, story){
  const w=weaponOf(key, story); if(!w) return [];
  const shots = n => (w.hits>1 ? w.hits+'發×'+n+'傷害' : '單發'+n+'傷害');
  /* 一帶一句：會反擊就報反擊的份量（帶命中率），不反擊就報減傷。 */
  const line = (g)=>{
    const b=weaponBand(w,g);
    if(b.counter){
      const n = b.roll ? (Math.min(...b.roll)+'~'+Math.max(...b.roll)) : b.dmgPerHit;
      return shots(n) + (b.hit<1 ? '（命中'+Math.round(b.hit*100)+'%）' : '');
    }
    return b.take>=1 ? '無減傷效果' : (b.take<=0 ? '完全防禦' : '減傷'+Math.round((1-b.take)*100)+'%');
  };
  const crit = (w.critRate!=null ? w.critRate : GAME_CONFIG.tuning.counterCritRate);
  const rows=[['分類', w.cat||'—'], ['黃圈', line('block')], ['橘圈', line('perfect')],
              ['反擊', shots(w.dmgPerHit)], ['暴擊率', Math.round(crit*100)+'%']];
  /* 裝填時間（ver -1009，Ray：「每一把步槍都描述加上裝填時間 3 秒」）：
     ⚠ **算出來的不是手寫的**（鐵律 7）—— 數字只有卡上的 `counterCdSec` 一份，
       改秒數不必回頭改文案；沒有這一格的槍不長這一列。 */
  if(w.counterCdSec>0) rows.push(['裝填時間', w.counterCdSec+' 秒']);
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

/* ══⚠⚠⚠ 同名覆蓋的圖要換一次快取（ver -905）══════════════════════════════
   §5 的規約：「同名覆蓋的圖一定要加／改 `?v=N`」—— 但那條以前**只有 `ASSETS` 那條路
   走得到**（路徑是手寫的字串，可以直接把 `?v=2` 打進去）。**背景不是**：
   它的檔名是由 `bandNames` 把基底名＋時段＋副檔名**組出來的**，沒有地方讓人寫 `?v=`。
   於是美術同名覆蓋一張背景，玩家端就會抱著舊圖不放（-650 娜塔莉那張踩過的同一個坑，
   只是這次換成背景）。

   所以這裡開一張**逐檔的版本表**，鑰匙與 `tuning.fileGain` 同一套：
   **檔名、去副檔名、去 `?v=`、轉小寫**。沒列到的＝版本 1＝不加尾巴（不動快取）。
   ⚠ **不要改成「全域一個版本號」**：那會讓每次覆蓋一張圖就把**所有**背景重抓一遍，
     手機上是好幾 MB。只列真的被覆蓋過的那幾張。
   ⚠ 加在**組 URL 的那一支**（`story.bgUrl`，鐵律 7 的唯一計算點）—— 不要在
     呼叫端各自拼一次。 */
export const ASSET_VER = {
  /* ver -905：美術補跑 Gemini 去顆粒重繪、同名覆蓋（Ray：「顆粒多到刺眼」）。
     ⚠ 只有主圖被覆蓋，dawn/dusk/night 本來就是 Gemini 產物、沒有動 —— 所以不列。 */
  'ruins_shinier_crossway_day': 2,
  'ruins_shinier_brazier':      2,
  'ruins_shinier_hollow':       2,
  /* ver -909：Ray 換了兩張新圖（命之泉／圓井房，交件是 jpeg，已轉 webp），
     黑暗斷橋那張**水平翻轉**（Ray 指定）—— 三張都是同名覆蓋。 */
  'ruins_shinier_deepspring':   2,
  'ruins_shinier_well':         2,
  'ruins_shinier_darkbridge':   2,
  /* ver -910：Ray 又換了一批（交件是 jpeg，已轉 webp、原檔進 `_originals/background/`）。
     ⚠ `deepaltar` 不在這裡 —— 它是**新檔**（原本只有 _dawn/_day/_dusk/_night 四張，
       那四張被 Ray 刪掉了），新檔沒有快取問題。但那四張**可能還在玩家的快取裡**，
       而候選鏈會先試它們 ⇒ 節點改成 `noTime:true`，只試不帶時段的那一張。 */
  'ruins_shinier_machine':      2,
  'ruins_shinier_mosschamber':  2,
  'ruins_shinier_prison':       2,
  'ruins_shinier_rift':         2,
  'ruins_shinier_stairdeep':    2,
  'ruins_shinier_stairup':      2,
};
export function assetVer(nameOrPath){
  const n = String(nameOrPath||'').split('/').pop().split('?')[0]
              .replace(/\.[^.]+$/,'').toLowerCase();
  const v = ASSET_VER[n];
  return v ? ('?v='+v) : '';
}

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

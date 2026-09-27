/* ============================================================================
 *  script/weapons.js — 副武器卡（唯一資料來源，ver -1781 由 config.js 抽出）
 *  ---------------------------------------------------------------------------
 *  Ray：「把副武器做成武器卡，並讓每個武器加入彈數與裝填時間，預設機槍四發 2 秒裝填，
 *        霰彈兩發 1 秒裝填，並且留一欄改造滿級特殊效果」
 *  同 `script/enemies.js` 的作法：config.js 頂部 `import { WEAPONS }` 後照舊掛成
 *  `weapons: WEAPONS`，所有讀取端（`GAME_CONFIG.weapons[key]`／`weaponOf`）一律不變。
 *  填寫範本：`script/WEAPON_CARD_TEMPLATE.txt`。
 *
 *  ⚠⚠ **彈數與裝填（ver -1781）**：寫在 `story`（本篇）—— 試玩版（挑戰）那一套照舊沒有彈數限制（§6.5.3）。
 *    · `mag`       ＝一個彈匣幾發。**一次反擊算一發**（機槍那一串 8 顆子彈也是一發）。
 *    · `reloadSec` ＝打空之後幾秒裝填完（裝填中這把槍不能反擊，圈照樣要處理 —— 同步槍的拉栓）。
 *    預設：重機槍 4 發／2 秒、霰彈槍 2 發／1 秒；萊福槍 1 發／5 秒（＝原本的拉栓 `counterCdSec:5`，行為不變）。
 *    ⚠ 逐把槍記帳：切槍不會把另一把的彈匣補滿（「先開一槍、切槍、再換回來」照舊是操作空間）。
 *    實作只有 `modules/weapon.js` 的 `counterReady`／`weaponCounter` 那一組（鐵律 7）。
 *  ⚠⚠ **`perk` ＝改造滿級（第 5 階）的特殊效果**，一把槍一格；`null`＝還沒定（Ray 的卡還沒到，不要自己發明）。
 *    形狀預定 `{ name:'', desc:'', <效果欄位> }`。取代 -714 的 `tuning.weaponPerks`（那是同一件事的第二份表，已拿掉）。
 *  ⚠ 純資料檔，不 import 任何東西（不會與 config 成環）。
 * ========================================================================== */
export const WEAPONS = {
    // B1901 陣地機槍「絞肉機」：基準武器（反擊總傷 48），Perfect 帶正常、Defense 吃半傷（0.5）
    MG_Squall:     { name:'B1901陣地機槍「絞肉機」', shortName:'絞肉機', cat:'重機槍',
                     owned:true, critRate:0.20, maxMod:5, value:4000,
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     image:'weapon_mg_squall',     sound:'se_mg_squall',
                     bands:{ block:{ counter:true, hit:0.30 }, perfect:{ counter:true, hit:0.70 } },
                     flavor:'攻守均衡的可靠選擇',
                     /* 本篇用的數值（ver -378，Ray 的「初始重機槍」卡）：紅圈 8發×3、爆擊 10%。 */
                     story:{ hits:8, dmgPerHit:3, critRate:0.10, mag:4, reloadSec:2 },
                     perk:null },
    // 雙管霰彈槍「鐵拳」（ver -706 改）：**三帶都反擊、都免傷**，傷害遞增 ——
    //   黃圈每發打 1、橘圈半額、紅圈全額。它是保命槍：完全不會挨打，代價是傷害低。
    Shotgun_Blast: { name:'雙管霰彈槍「鐵拳」', shortName:'鐵拳', cat:'霰彈槍',
                     owned:true, critRate:0.20, maxMod:5, value:3000,
                     counterWin:0.20, hits:6, dmgPerHit:4,  vfx:'burst',  image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     bands:{ block:{ counter:true, dmgRoll:[0,1] }, perfect:{ counter:true, dmgScale:0.5 } },
                     flavor:'保命的穩健之選',
                     /* 本篇用的數值（ver -378，Ray 的「初始霰彈槍」卡）：黃圈 減傷50%、紅圈 6發×3。
                        ⚠ 黃圈由 75% **降**到 50%（試玩版那把仍是 75%）。 */
                     story:{ hits:6, dmgPerHit:3, mag:2, reloadSec:1 },
                     perk:null },
    // 85 式步槍「嗜心者」：反擊總傷 72（1.5 倍）、單發大紅字、無 Perfect 帶；
    //   ver -706：黃圈挨 1/2、橘圈挨 1/4、紅圈才反擊 —— 三把裡唯一「點了還是會挨打」的，
    //   但**越接近完美挨得越少**（賭上一切，回報全在反擊窗）。
    Sniper_Falcon: { name:'85式萊福槍「嗜心者」', shortName:'嗜心者', cat:'萊福槍',
                     owned:true, critRate:0.20, maxMod:5, value:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     /* ══⚠⚠ **重擊**（`counterWipe`，ver -1659，Ray：「步槍跟高爆彈在紅圈
                        命中時敵人都要劇烈一震，像遭到重擊，且命中可以清掉所有攻擊圈」）══
                        **紅圈命中**（完美反擊）時：敵人劇烈一震 ＋ 當下所有攻擊圈清空、
                        連同還沒生出來的那一波（齊射被打斷）。判定與清場在 `defense`
                        的紅圈分支（鐵律 7/8），這裡只宣告「這把槍做得到」。
                        ⚠ 「步槍」與「高爆彈」是**同一條分支的兩個場合**
                        （`vfx:'single'`＝爆發型，陸戰是萊福槍、船戰是高爆砲）——
                        所以兩張萊福槍卡各標一次就涵蓋了 Ray 講的兩個名字。
                        ⚠ **只清當下畫面上的圈**（ver -1660 Ray 定案）——
                          還沒生出來的那一波照舊會來，見 `defense` 那一段的說明。 */
                     counterWipe:true,
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
                        ══⚠⚠⚠ 拉栓（ver -1781 起寫成 `mag:1, reloadSec:5`，原欄位 `counterCdSec`）＝ **這把槍幾秒才能再開一發**
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
                     story:{ hits:1, dmgPerHit:56, mag:1, reloadSec:5,   // ver -1781：原 counterCdSec:5（拉栓＝1 發／5 秒裝填，行為不變）
                             /* ⚠ `flavor` 也在 `story` 覆寫（ver -1010，Ray：「文案要改，
                                不然使用者要從 UI 才能學到步槍有 CD」）—— **不寫數字**
                                （那是 `weaponStatRows` 從 `counterCdSec` 算出來的那一列，
                                鐵律 7），這一句只負責把「它不能連射」講成人話。
                                試玩版沒有這個冷卻，所以覆寫在 story，base 那句不動。 */
                             flavor:'賭上一切的單發重擊；拉栓費時，開完一發要等' },
                     perk:null },

    /* ── 槍店的貨（ver -377，Ray 的武器卡）──────────────────────────
       ⚠ 這三把**沒有自己的立繪與音效**：先借同類那一把的（`image`/`sound`）。
         素材到位就只改這兩欄。 */
    Shotgun_Dragon:{ name:'短板霰彈槍「龍息」', shortName:'龍息', cat:'霰彈槍',
                     critRate:0.20, maxMod:5, price:3000,
                     counterWin:0.20, hits:6, dmgPerHit:6,  vfx:'burst',  image:'weapon_shotgun_blast', sound:'se_shotgun_blast',
                     bands:{ block:{ counter:true, dmgRoll:[0,1] }, perfect:{ counter:true, dmgScale:0.5 } },
                     flavor:'短管、近身、火力壓制',
                     story:{ mag:2, reloadSec:1 },
                     perk:null },
    /* ⚠ 「絞肉機 改」的爆擊率是 **10%**（比原版 20% 低）—— 卡上就是這麼寫的。
       數值面它與原版只差這一項，其餘完全相同。要調就跟 Ray 確認，不要自己改順。 */
    MG_Squall_Kai: { name:'B1901陣地機槍「絞肉機 改」', shortName:'絞肉機改', cat:'重機槍',
                     critRate:0.10, maxMod:5, price:4000,
                     counterWin:0.12, hits:8, dmgPerHit:6,  vfx:null,     image:'weapon_mg_squall',     sound:'se_mg_squall',
                     bands:{ block:{ counter:true, hit:0.30 }, perfect:{ counter:true, hit:0.70 } },
                     flavor:'原廠改良型',
                     story:{ mag:4, reloadSec:2 },
                     perk:null },
    Rifle_Shahin:  { name:'Shahin栓動萊福槍「遊隼」', shortName:'遊隼', cat:'萊福槍',
                     critRate:0.20, maxMod:5, price:5000,
                     counterWin:0.06, hits:1, dmgPerHit:72, vfx:'single', image:'weapon_sniper_falcon', sound:'se_sniper_falcon',
                     counterWipe:true,   // 重擊：同「嗜心者」（ver -1659，說明見那一張卡）
                     // ver -975：同「嗜心者」（黃橘圈也反擊、攻擊力 −50%），見那張卡的說明。
                     bands:{ block:{ counter:true, take:0.5,  dmgScale:0.5 },
                             perfect:{ counter:true, take:0.25, dmgScale:0.5 } }, counterSec:-3,
                     flavor:'栓動、遠距、一擊定生死',
                     /* 拉栓時間同「嗜心者」（ver -1009；-1010 由 3 改 5）—— 說明見那一張卡。
                        ⚠ `flavor` 也在 `story` 覆寫：試玩版沒有這個冷卻，那邊照舊那一句。 */
                     story:{ mag:1, reloadSec:5,   // ver -1781：原 counterCdSec:5
                             flavor:'栓動、遠距、一擊定生死；每一發都要重新拉栓' },
                     perk:null },
    // 新武器：複製一段，鑰匙用「類型_武器名」（同圖檔基底名），image 指對應 ASSETS 鑰匙。
};

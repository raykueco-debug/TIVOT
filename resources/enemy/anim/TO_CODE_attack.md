# 給程式 session：敵人「攻擊／延時」動畫（動畫 session 2026-11-05 起）

> 動畫 session 不碰程式（憲法鐵律 11），要接的寫在這裡。接完請在 HANDOFF 註記。
> 來源：Ray 的 `敵人一覽_非空戰_動畫編排.xlsx`（待機 loop／攻擊動畫／延時點錯動畫三欄）。

## ⚠ 11-22 待程式接：伊甸古墓 9 隻攻擊（敵人線 3060）

Ray：「交件 並將交件的頭尾去掉倒放成 r」。每一支＝**Ray 剪的 A→B ＋ R：原片全格倒放、去頭尾、抽半（倒放類）**——⚠ 11-22 Ray 定用 **`_atk_v3`**（v1＝剪片倒放、v2＝全格不抽，留作紀錄，不要接），首尾相接成一支，24fps、loop:false，從中立起手回到中立。
攻擊、延時、點錯先共用這一支（`ENEMY_ATK`／`ENEMY_DELAY`／`ENEMY_MISS` 都指它）。鑰匙＝立繪檔名，立繪不換（`resources/enemy/mon_<名>.webp`）。

| 怪 | 鑰匙 | 資料夾 | 格／秒 | 打到 | R 從第幾格起 |
|---|---|---|---|---|---|
| 拱門守衛（雙石拳砸） | `mon_arch_warden` | `mon_arch_warden_atk_v3/` | 32／1.33 | 7 | 8 |
| 燭台魔（斜劈爪擊） | `mon_candelabra_fiend` | `mon_candelabra_fiend_atk_v3/` | 24／1.00 | 4 | 5 |
| 墓穴蜈蚣（大顎下擊） | `mon_crypt_centipede` | `mon_crypt_centipede_atk_v3/` | 30／1.25 | 9 | 10 |
| 裹屍寡婦（雙爪前抓） | `mon_shroud_widow` | `mon_shroud_widow_atk_v3/` | 22／0.92 | 4 | 5 |
| 碑背爬行者（骷髏顎撲咬） | `mon_slab_creeper` | `mon_slab_creeper_atk_v3/` | 28／1.17 | 3 | 4 |
| 墓熊（撲擊） | `mon_tomb_bear` | `mon_tomb_bear_atk_v3/` | 30／1.25 | 5 | 6 |
| 骷髏塚（傾倒骨手抓） | `mon_skull_cairn` | `mon_skull_cairn_atk_v3/` | 20／0.83 | 5 | 6 |
| ⚠ 雙頭骨犬（雙頭撲咬） | `mon_twin_skull_hound` | `mon_twin_skull_hound_atk_v3/` | 30／1.25 | **6** | 6 |
| 聖匣之手（往前倒、爪觸地）（11-22 晚補） | `mon_reliquary_hand` | `mon_reliquary_hand_atk_v1/` | 41／1.71 | 16 | 17 |

- ✅ 已接（敵人副理 ver -2909～-2914）：ADM 三表都指 `_atk_v3`；雙頭骨犬受擊＝咬擊（卡上 hitFx 三格都 bite）、`near:1.45, nearIn:120, nearHold:220, nearOut:120, nearSteps:2`（Ray：「位移少幀」；-2915「看不出來」→ 加大、停久一點）；石板匍匐者同一組撲近（-2916）。
- 打到＝A→B 最後一格（撲到最近／劈到底），**雙頭骨犬例外**：Ray「r 時第一格才出咬擊判定」⇒ 打到＝第 6 格（R 的第一格）。
- 骷髏塚：Ray「r 時把周圍掉落的頭骨摳掉」—— R 段（第 6–9 格）脫離主體的碎塊已摳掉；第 5 格（打到）飛散的頭骨是攻擊演出，留著。
- ✅ 已接（ver -2925）**骷髏塚攻擊扣破防值**：Ray「攻擊會減 15% 破防值 HP 也會扣」→ ENEMY_ATK 第 5 格 `fx type:'drainBR', pct:15`（滿表的 15%，走 combat 的 setEnergy；HP 照一般攻擊扣）。
- ✅ 已接（ver -2917，敵人副理：`fx type:'bones'`、ENEMY_ATK 第 5 格 12 顆）**骷髏塚的攻擊特效（Ray 11-22：「攻擊時是散骨高速飛向 VIEWER」）**：打到那一格（第 5 格）起，程式從骷髏塚身上噴出**散骨，高速朝鏡頭飛來**（由小變大、帶旋轉、越過鏡頭消失）。
  素材＝`resources/enemy/fx/skull_cairn_bones/bone_00～16.webp`（17 個：頭骨 8、下顎、腿骨 2、肋骨 1＋1 對、脊椎、骨盆、指骨、碎頭骨；GPT 同畫風、真 alpha、無動態模糊——速度感請程式加）。整張表 `skull_cairn_bones16.webp` 只是原檔。
- 碰邊：Ray 在 animechk 剪過，照交。

- ✅ 已接（ver -2919）**裹屍寡婦的攻擊＝袖口射布**（Ray 11-22：「攻擊效果是從袖子射出兩束布」「裹布髒一點」）：ENEMY_ATK 第 4 格 `fx type:'shroudShot'`，左右袖口各接出一道連續的裹屍布流（像雷射：袖口端一直接著、布面往鏡頭流、約 0.5 秒後收細消失，-2921）。素材 `resources/enemy/fx/shroud_strip.webp`（GPT 髒版、平塗污漬、真 alpha）。
- ✅ 已接（ver -2922～-2924）**DA＝一般攻擊（射布）、M＝射布＋纏布**（Ray：「da 是一般攻擊 m 會附加纏布效果」）。纏布＝一條繃緊的布貫穿整個數字盤（兩端裁在盤緣、落下回彈繃緊；Ray：「頭尾貫穿數字盤 要有綁的緊繃感」），遮數字、點擊穿得過、換盤清掉、會疊。素材 `resources/enemy/fx/shroud_bind/bind_00～08.webp`（GPT 九宮格，隨機挑）。布流兩端羽化（-2922）。

### ⚠⚠ 螺旋紗 `mon_spiral_veil`：特規（Ray 11-22）

`mon_spiral_veil_atk_v1/`（14 格／0.58 秒，loop:false），**只有 A→B，沒有 BA、沒有 R**：
1. 攻擊時播這一支，**播完停在最後一格、維持這個姿態**（不回待機）。
2. **不出攻擊圈**（這一下本身不是可防禦的攻擊）。
3. 之後玩家**延時或點錯** ⇒ 牠**化成血霧自爆**：玩家**破防值歸零**、**怪死亡**、**戰鬥結束**。
4. 炸的時候做一個**破防圈碎裂**的效果。血霧與碎裂都請程式做（沒有美術素材；要圖再跟 Ray 說）。
- ⚠ 沒寫的地方（停在那個姿態之後多久沒失誤會怎樣、會不會再攻擊）Ray 還沒講，請問 Ray。

### 廢棄（要重做，Ray 11-22）

墓犬（沒有對 viewer 前撲咬下）、吊鍊屍（尺寸縮小了）、聖匣之手、墓香爐（沒有對 viewer 的攻擊性）、抬棺列（往後跳了）—— 這 5 隻目前**沒有**攻擊動畫。

## ⚠ 11-22 預告（還沒交件）：伊甸古墓詩班兩隻的攻擊要由程式加「音波」特效

- `choir_organ` 唱詩管風琴、`choir_pale` 蒼白詩班的攻擊＝**詠唱**（Ray 11-22）。關鍵格的音波環 Ray 叫拿掉（「後期用程式加」），所以動畫只有張口詠唱的身體動作。
- 程式端：攻擊段播放期間，從嘴部向外擴散的同心音波環（往鏡頭方向放大、淡出），打到那一格的時間點等交件時一起給。
- 交件（Ray 剪完）時這一段會補上動檔名與打到格。

## ⚠ 11-21 待程式接：賞金獵人 `guild_hunter`（帝都公會特殊戰）新立繪＋開槍（敵人線 3060）

Ray：中立「要已經掏槍」「槍要已經指著 viewer」；B「只要開槍就好 槍口微仰」；「F 越少越好」「不用跑 R」；剪片 `hunter_fire_A_AB_cut`「用這個當 ADM」。

| 動作 | 表 | 鑰匙（立繪檔名） | 資料夾 | 格／秒 | 打到 |
|---|---|---|---|---|---|
| 開槍（A／D／M 共用同一支） | ENEMY_ATK、ENEMY_DELAY、ENEMY_MISS 都指這一支 | `npc_guildhunter_neutral` | `npc_guildhunter_neutral_atk_v1/` | 10／0.42 | 1 |

- ⚠⚠ **換立繪**：`ASSETS.enemy_guild_hunter` 改指 **`resources/enemy/npc_guildhunter_neutral.webp`**（1024×1536，GPT 真 alpha，左輪已瞄準鏡頭，本機縮排補白）。
  `resources/si/npc/npc_guildhunter_si*.webp` 是劇情立繪，**不動**。
- 片子本身就是一個完整來回：第 0 格瞄準 → 第 1 格開槍（後座開始）→ 第 3～5 格槍口仰到最高 → 第 8～9 格回到瞄準。所以**不用接 R**，播完切回待機（靜態立繪）。
- 打到＝第 1 格（槍口剛被後座頂起那一瞬）。**槍口火光／煙／子彈請程式做**（片子裡刻意沒畫），位置在槍口（第 1 格大約在畫面左上、主體外框 x≈0～15%、y≈15～25%）。受擊特效建議用槍擊那一套（彈孔／子彈），音效用左輪槍聲。
- 碰邊：原片第 9–11 格槍口碰生成畫布上緣，Ray 剪過照交。
- ⚠ **E 倒地（11-21 補交，Ray：「E也要跑」→ 選「單膝跪地」，剪片 `hunter_down_A_AB_cut`）**：`resources/enemy/anim/npc_guildhunter_neutral_down_v1/`（9 格 24fps，loop:false，停在最後一格＝單膝跪地、槍撐地）。
  程式端目前**沒有倒地表**（ENEMY_IDLE／ATK／MISS／DELAY／DODGE／ENTER 都不是）——請新開一個（例如 `ENEMY_DOWN`，鑰匙＝立繪檔名），擊敗時播一次、**停在最後一格**接結算，不切回待機。只跑了 A→B，沒有 R。
- ✅ 待機（11-21 補交，Ray 剪的 `hunter_hunter_A_idle_cut`）：待機表加 `npc_guildhunter_neutral: 'resources/enemy/anim/npc_guildhunter_neutral_idle_v1/'`（13 格 24fps，loop:true）。數值、名字都沒動。

## ⚠ 11-20 待程式接：地下聖徒 `faceless`（夢境戰 cap_dream）新立繪＋A／M／D（敵人線 3060）

Ray 改設定（「改畫成巨型聖徒 身上有被掙脫的宗教風枷具 頭是鐵面具 鐵處女那種感覺 頸部粗狀」「聖徒一類原則上都是白膚 無五官的類人怪物」），
KF Ray：「都過」；剪片 Ray 給的 6 支 `faceless_{atk,miss,delay}_{A_AB,B_BA}_cut`。AB＋BA 同一生成空間首尾相接、**接點只留一張**，24fps、loop:false，從中立起手回到中立。

| 動作 | 表 | 鑰匙（立繪檔名） | 資料夾 | 格／秒 | 打到 |
|---|---|---|---|---|---|
| A 爪撲（右爪斜劈到底） | ENEMY_ATK | `saint_ug_giant` | `saint_ug_giant_atk_v1/` | 17／0.71 | 7 |
| M 上勾拳 | ENEMY_MISS | `saint_ug_giant` | `saint_ug_giant_miss_v1/` | 14／0.58 | 5 |
| D 直拳（朝鏡頭） | ENEMY_DELAY | `saint_ug_giant` | `saint_ug_giant_delay_v1/` | 13／0.54 | 4 |

- ⚠⚠ **換立繪**：`ASSETS.enemy_faceless` 改指 **`resources/enemy/saint_ug_giant.webp`**（1024×1536，GPT 真 alpha，本機縮排補白）。
  舊的 `saint_ug_ci.jpg` 是 CI 構圖（沒有 alpha），**亂入者 `intruderEnemy` 也指它** —— 亂入者要不要跟著換請問 Ray，這一條只換 `faceless`。
- 打到＝AB 段最後一格（爪劈到底／拳到頂／拳到鏡頭前）。受擊特效建議：A＝斜劈爪痕（左上→右下）、M／D＝拳擊，音效未定（請照現有拳擊／爪擊那一套，或等 Ray）。
- R 沒另做：BA 段就是收回（收回中立）。
- ✅ 待機（11-20 補交，Ray 剪的 `faceless_idle2_cut`：重呼吸＋雙手反覆握拳鬆開）：待機表加 `saint_ug_giant: 'resources/enemy/anim/saint_ug_giant_idle_v1/'`（28 格 24fps，loop:true）。第一版 `faceless_idle` Ray 退了（「沒有呼吸感」）。
- 碰邊：爪撲原片 AB 第 24–28、BA 第 15–20 格碰生成畫布左緣，Ray 剪過照交。
- 數值、名字（仍「地下聖徒_A」）都沒動。KF 原圖在 `resources/_originals/enemy/faceless_kf/`，Wan 入料在 `resources/enemy/_neutral_refs/faceless_kf/wan/`。

## ✅ 11-10 KF 第二輪五支（敵人線 4070S；Ray 剪過、車輪戰 8124 注入試跑中）

Ray：「可交件 colossus_A_AB_cut／saint_inspector_A_AB_cut／stag_rot_A_AB_cut／deernightmare_A_AB_cut／bear_nightmare_B_BA_cut，回檔就用同樣剪法」。
另一段（沒剪的那一半）照 Ray 那一段的取格表套用（`tools/anim/deliver_kf2.py`），同一生成空間首尾相接、接點只留一張，從中立起手回到中立。格式＝待機的程式端版（有 `px`），24fps、loop:false。

| 怪（卡） | 表 | 鑰匙（立繪檔名） | 資料夾 | 格／秒 | 打到 |
|---|---|---|---|---|---|
| 崩岩巨像 `canyon_colossus` | ENEMY_ATK（拳砸地） | `mon_canyon_colossus_dark` | `mon_canyon_colossus_dark_atk_v1/` | 36／1.50 | 21 |
| 監查者 `ruins_saint_inspector` | ENEMY_DELAY（翅膀揮動） | `mon_saint_inspector` | `mon_saint_inspector_delay_v1/` | 39／1.62 | 23 |
| 腐鹿骸 `sf_stag_rot` | ENEMY_ATK（角頂） | **`mon_stag_rot_neutral`** | `mon_stag_rot_neutral_atk_v1/` | 30／1.25 | 17 |
| 變異樹靈鹿主 `sf_deer_nightmare` | ENEMY_ATK **與** ENEMY_DELAY 都指這一支（仰天咆哮） | `mon_shinierforest_deernightmare` | `mon_shinierforest_deernightmare_atk_v1/` | 55／2.29 | 32 |
| 熊骸（夢魘）`sv_bear`（＋同圖那張卡） | ENEMY_MISS（爪擊） | `mon_bear_nightmare` | `mon_bear_nightmare_miss_v1/` | 62／2.58 | 37 |

- ⚠⚠ **腐鹿骸換立繪**：動畫是用新的中立站姿生成的 ⇒ `ASSETS.enemy_sf_stag_rot` 改指 **`resources/enemy/mon_stag_rot_neutral.webp`**（1024×1536）。舊待機 `mon_stag_rot_idle_v2` 是舊立繪的，**新立繪目前沒有待機**（鑰匙不同就不會套上去，靜態立繪＋攻擊）。
- 鹿主的程式效果（A＝櫻花飛舞、D＝攻擊頻率 +50% 10 秒）、監查者 D 銅色飛刃見 `_KF_第二輪_1109.md` §二。
- 碰邊：巨像第 17–23、27–28 格（原片）碰生成畫布左緣，監查者翅膀張開左右出框 —— Ray 看過剪過，照交。

## 規格（全部共通）

- 位置：`resources/enemy/anim/<立繪名>_atk_v<N>/`（攻擊）、`<立繪名>_delay_v<N>/`（延時・點錯）。
- 格式**與待機相同**（`frame_00.webp…` ＋ `anim.json`：`canvas`／`box`／`frames`／`fps`／`px`），差別只有：
  - **`loop:false`** —— 播一次。
  - `fps` 照 Ray 在 animechk 剪的（目前 24）。
- Ray 定的規則：**所有攻擊都從待機的中立姿勢起手、最後回到中立姿勢**（「所有攻擊都要回到原本的中立動畫」）。
  ⇒ 程式端：觸發時從待機切進這一支，播完切回待機 loop。
- ⚠ 首尾格不保證與待機第 0 格像素相同（Ray 剪掉頭尾的停頓），切換點建議蓋在既有的命中閃白／受擊特效之下。

## 已交

| 編號 | 敵人 | 用途 | 資料夾 | 格數／fps／秒 | 大小 | box |
|---|---|---|---|---|---|---|
| E007／E008 | 同上 | **攻擊 v5（現行）**（撲出同 v4；收回換成重新生成的 biteBA2_cut_2） | `mon_natalia_atk_v5/` | 48／24／2.0 秒，loop:false | 2.2 MB | `[-33,-53,1068,1572]` |
| E007／E008 | 同上 | ~~攻擊 v4~~ ⚠ **已被 v5 取代**（同 v3，撲出段多最後一格咬到底的原片 #48） | `mon_natalia_atk_v4/` | 48／24／2.0 秒，loop:false | 2.2 MB | `[-33,-42,1091,1565]` |
| E007／E008 | 同上 | ~~攻擊 v3~~ ⚠ **已被 v4 取代**（縮身蓄力 → 彈射撲向鏡頭張嘴咬 → 回彈落回中立站姿） | `mon_natalia_atk_v3/` | 47／24／1.96 秒，loop:false | 2.1 MB | `[-33,-42,1091,1565]` |
| E007／E008 | 禍魘娜塔莉 `nightmare_natalia`／逝去的守護者 `dm_lost_guardian` | **延時・點錯**（撲向鏡頭一爪劈下 → 殭屍左右晃歸位；Ray 11-05：爪＝延時、撲咬＝攻擊，攻擊另交 `mon_natalia_atk_v3/`） | `mon_natalia_delay_v1/` | 37／24／1.54 秒 | 1.9 MB | `[-33,-19,1091,1536]` |
| E007／E008 | 同上 | **待機（換新）** | `mon_natalia_idle_v3/` | 38／24／1.58 秒，loop | 1.9 MB | `[104,13,820,1502]` |
| E007／E008 | 同上 | ~~攻擊~~ ⚠ **已被 v3 取代**（縮身蓄力 → 彈射撲向鏡頭張嘴咬、雙爪抓來；只有撲出段，停在撲咬姿勢，沒有歸位段） | `mon_natalia_atk_v2/` | 16／24／0.67 秒，loop:false | 0.7 MB | `[-21,4,1041,1511]`（左右略超出畫布） |

- E007 攻擊 **v5**（現行）：撲出 `mon_natalia_neutral_biteAB2_cut_3`（17 格）＋ 收回 `mon_natalia_B_bite_src_biteBA2_cut_2`（31 格；取格表同 v3/v4 那支，但來源 biteBA2 在 17:07～17:19 重生成過，內容是新的），FIT 0.92。**咬到＝第 16 格**。接縫 16→17 差 12.2（撲出段相鄰格約 32），沒有跳。
- E007 攻擊 v4（已被 v5 取代，收回段誤用舊的 biteBA2_cut、與 v3 相同）：撲出 `mon_natalia_neutral_biteAB2_cut_3`（17 格＝v3 那 16 格＋原片 #48）＋ 收回 `mon_natalia_B_bite_src_biteBA2_cut`（31 格），同一生成空間首尾相接、FIT 0.92（同 v3）。**咬到＝第 16 格**（撲出段最後一格）。
- E007 攻擊 v3（已被 v4 取代）：撲出 `biteAB2_cut`（13 格→16）＋ 收回 `biteBA2_cut`（25 格→31）同一個生成空間首尾相接。⚠ `edge_check`：第 25–30 格（收回段開頭、雙爪張開）碰到生成畫布左右邊緣，爪尖會被切一點點。
- E007 攻擊 v2（已被 v3 取代）：Ray 剪的 `out/export/mon_natalia_neutral_biteAB2_cut`（A 中立 → B 撲咬，原片 49 格取 13 格、部分 ×2 → 16 格），`edge_check` 無碰邊。B 圖 `resources/enemy/_natalia_bite/mon_natalia_B_bite2.png`（GPT）。⚠ 結尾停在撲咬姿勢，與待機第 0 格差很多 —— 切回待機要蓋在受擊特效之下。
| E017 | 魘魔 `np_coralman` | 延時・點錯（單爪大幅斜劈） | `mon_sea_coralman_delay_v1/` | 30／24／1.25 秒 | 2.0 MB | `[-44,-46,1113,1574]`（略超出畫布四邊） |
| E017 | 同上 | **攻擊**（縮身蓄力 → 雙爪張開撲向鏡頭；只有撲出段，停在撲到最近那一格） | `mon_sea_coralman_atk_v1/` | 14／24／0.58 秒，loop:false | 0.5 MB | `[-966,-431,2954,2197]`（撲到最近時雙爪遠超出畫布，大半會被 #top 切掉） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~延時 v2~~ ⚠ **已被 delay_v3 取代**（程式端 ver -2519 組：Ray 剪的 hswipeAB_cut）（右前爪胸前水平橫掃 → 收爪落回低伏） | `mon_shinierforest_tiger_delay_v2/` | 32／24／1.33 秒，loop:false | 0.6 MB | `[-154,-91,1724,1112]` |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~延時~~ ⚠ **已被 delay_v2 取代**（右前爪胸前水平橫掃 → 收爪落回低伏；四足爪擊一律橫向） | `mon_shinierforest_tiger_delay_v1/` | 23／24／0.96 秒，loop:false | 0.4 MB | `[38,-91,1455,1108]`（上下超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊~~ ⚠ **已被 v2 取代**（只有撲出段） | `mon_shinierforest_tiger_atk_v1/` | 20／24／0.83 秒，loop:false | 0.3 MB | `[-7,-136,1654,1178]`（四邊略超出畫布） |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊 v3~~ ⚠ **已被 atk_v4 取代**（程式端 ver -2519 組：Ray 指定改用 biteAB）（縮身蓄力 → 撲向鏡頭張嘴咬 → 收勢落回低伏） | `mon_shinierforest_tiger_atk_v3/` | 29／24／1.21 秒，loop:false | 0.5 MB | `[-31,-332,1677,1413]` |
| E068 | 獨角虎 `mon_shinierforest_tiger` | ~~攻擊~~ ⚠ **已被 atk_v3 取代**（縮身蓄力 → 撲向鏡頭張嘴咬 → 收勢落回低伏） | `mon_shinierforest_tiger_atk_v2/` | 41／24／1.71 秒，loop:false | 0.7 MB | `[-13,-332,1664,1413]` |
| E065 | 森林山貓 `mon_shinierforest_lynx` | **延時・點錯**（右前爪胸前水平橫掃過身體 → 收爪落回低伏） | `mon_shinierforest_lynx_delay_v1/` | 32／24／1.33 秒，loop:false | 0.7 MB | `[-249,20,1268,1352]` |
| E065 | 同上 | **攻擊**（縮身蓄力 → 撲向鏡頭雙爪抓來 → 落回低伏） | `mon_shinierforest_lynx_atk_v1/` | 29／24／1.21 秒，loop:false | 0.6 MB | `[-265,-230,1556,1887]` |
| E066 | 淺灘水蛇 `mon_shinierforest_snake` | **攻擊＝延時**（盤身 → 彈出張嘴咬向鏡頭 → 縮回盤姿；表上兩欄都是咬擊，同一支） | `mon_shinierforest_snake_atk_v1/` | 29／24／1.21 秒，loop:false | 0.7 MB | `[-85,9,1105,1526]` |
| E067 | 巨山豬 `mon_shinierforest_hog` | **攻擊＝延時**（低頭蹬地 → 撞向鏡頭 → 退回站姿；表上兩欄都是撞擊，同一支） | `mon_shinierforest_hog_atk_v1/` | 29／24／1.21 秒，loop:false | 0.4 MB | `[64,-103,1422,1197]` |
| 北泊 | 安雅光翼 `mon_np_anyawings`（新敵，卡還沒有） | **待機**（紫焰之翼流動） | `mon_np_anyawings_idle_v1/` | 48／24／2.0 秒，loop | 2.3 MB | `[105,111,1561,990]` |
| 北泊 | 同上 | **大力振翅**（高舉→全力下拍到底→回升展開） | `mon_np_anyawings_flap_v1/` | 81／24／3.4 秒，loop:false | 3.4 MB | `[62,-9,1653,1200]` |
| 北泊 | 同上 | **爆炎**（收攏→從翼根炸開紫焰→收回展翼） | `mon_np_anyawings_burst_v1/` | 81／24／3.4 秒，loop:false | 4.6 MB | `[35,12,1719,1161]` |
| 北泊 | 同上 | **攻擊 A＝振翅接爆炎**（Ray 剪） | `mon_np_anyawings_atk_v1/` | 64／24／2.67 秒，loop:false | 3.3 MB | `[47,25,1696,1166]` |
| 教學 | 訓練用聖徒（新架勢） | **待機**（低伏架勢呼吸、爪微抽、頭木靈式喀喀抽轉兩陣，不眨眼） | `saint_tr_neutral2_idle_v1/` | 48／24／2.0 秒，loop | 1.7M | `[10,193,1000,1210]` |
| 教學 | 訓練用聖徒（新架勢） | **出場**（從半空落下、屈膝深蹲著地、單手拍地、爪後拉，停在新架勢）——**新種類：開戰時播一次再接待機** | `saint_tr_neutral2_enter_v1/` | 16／24／0.67 秒，loop:false | 0.5 MB | `[-57,187,1067,1211]` |
| 教學 | 訓練用聖徒（新架勢） | **攻擊＝延時＝點錯（DMA 共用）**：前撲爪擊 → 斜後跳 → 落回架勢（IAR 完整） | `saint_tr_neutral2_atk_v1/` | 31／24／1.29 秒，loop:false | 1.0 MB | `[-57,21,1067,1458]` |
| 教學 | 訓練用聖徒 `trainee`（ASSETS `enemy_trainee`） | **待機**（身體呼吸、頭以頸為軸木靈式喀喀抽轉兩陣，不眨眼） | `saint_tr_neutral_idle_v1/` | 48／24／2.0 秒，loop | 1.9 MB | `[115,-11,772,1520]` |
| 教學 | 同上 | **攻擊＝延時＝點錯 v2（現行，DMA 共用）**：前撲爪擊＋退回待機（IAR 完整） | `saint_tr_neutral_atk_v2/` | 30／24／1.25 秒，loop:false | 0.9 MB | `[-193,-3,1260,1669]` |
| 教學 | 同上 | ~~攻擊 v1~~ ⚠ **已被 v2 取代**（只有 A 段）：前撲爪擊（從待機往鏡頭撲、右爪劈下；只有撲出段，停在劈中那一格） | `saint_tr_neutral_atk_v1/` | 10／24／0.42 秒，loop:false | 0.3 MB | `[-193,9,1214,1657]` |
| E019 | 背負祭壇者 `mon_beast_altar` | **延時・點錯 v2（現行）**（咆哮：中立起手 → 上身撲向鏡頭、胸口巨口張到最大咆哮 → 慣性前衝壓低 → 從另一側收回中立站姿） | `mon_beast_altar_delay_v2/` | 42／24／1.75 秒，loop:false | 1.8 MB | `[-19,26,787,1010]`（左右略超出畫布） |
| E019 | 同上 | ~~延時・點錯~~ ⚠ **已被 delay_v2 取代**（吼叫：一開場就在仰身張大胸口巨口咆哮 → 收口落回站姿） | `mon_beast_altar_delay_v1/` | 22／24／0.92 秒，loop:false | 0.5 MB | `[-56,21,774,995]`（左右略超出畫布） |
| E019 | 同上 | **攻擊**（低伏蓄力 → 撲撞向鏡頭、胸口黑洞大口張開雙爪抓來 → 落回四足站姿） | `mon_beast_altar_atk_v1/` | 29／24／1.21 秒，loop:false | 0.6 MB | `[-306,-68,1316,1341]`（撲到最近時四邊超出畫布） |
| E019 | 同上 | **待機** | `mon_beast_altar_idle_v1/` | 48／24／2.0 秒，loop | 3.5 MB | `[-71,58,780,960]` |

- 安雅光翼（Ray 11-05：「教堂中間大瓦礫堆，安雅被埋在下面看不到，只看得到背後一對光翼」）：
  · 立繪 `resources/enemy/mon_np_anyawings.webp`（1781×1187 橫幅 alpha，只有翅膀、沒有人；翼根在下緣中央）；**背景** `resources/background/northport/northport_church_ruin.webp`（北泊教堂室內殘垣，中央大瓦礫堆＝安雅被埋的地方，光翼要擺成從瓦礫堆中央長出來）。
  · 振翅與爆炎**都還沒經 Ray 剪**（Ray：「先接上」），各 81 格全留。**打到＝第 48 格**（兩支都是 A 段最後一格：振翅下拍到底／爆炎炸到最大）。**對應（Ray 11-06）：A＝`atk_v1`（振翅接爆炎）、D＝`flap_v1`（振翅）、M＝`burst_v1`（爆炎）**。A：瓦礫噴襲在第 8 格（下拍到底），**打到＝第 48 格**（爆炎炸到最大）；來源 `out/export/mon_np_anyawings_flapburst_joined_cut`（爆炎段已換算到振翅的生成空間）。
  · ⚠⚠ **振翅要程式加「瓦礫噴襲」效果**（Ray 指定）：下拍到底那一格（第 48 格）從瓦礫堆往鏡頭噴碎石。美術沒有做這個效果。
  · 輸出比例 0.5（解碼約 43 MB／支）：81 格全留太重，手機優先。
- 訓練用聖徒**重畫成新架勢**（Ray 11-06：「站得太筆直沒有救，腿岔開身體壓低單手撐地、爪後拉」）：新立繪 `resources/enemy/saint_tr_neutral2.webp`（1024×1536 alpha）。出場 `saint_tr_neutral2_enter_v1/` 是 Ray 指定（「這個當成出場動畫」，來源 `out/export/saint_tr2_R_hop_land_cut`），最後一格＝新架勢。
  ⚠ 新架勢攻擊已交：`saint_tr_neutral2_atk_v1/`＝A `saint_tr2_A_canvas_lunge_cut`（8 格）＋跳開 `saint_tr2_R_start_hop_cut`（7 格）＋落地 `saint_tr2_R_hop_land_cut`（16 格），**打到＝第 7 格**，最後一格＝新架勢。✅ **新架勢整組已交齊（ver 美術 11-06）**：立繪 `saint_tr_neutral2.webp`、出場 `saint_tr_neutral2_enter_v1`、待機 `saint_tr_neutral2_idle_v1`、攻擊 `saint_tr_neutral2_atk_v1`（打到第 7 格）——請一起換；舊直立姿勢那一組（`saint_tr_neutral*_v1/v2`）標成被取代。
- 訓練用聖徒攻擊 **v2**（現行）：A＝`out/export/saint_tr_neutral_lungeAB_cut`（10 格）＋ R＝`saint_tr_R_start_R_cut`（20 格，由 A 段結尾那一格＝原片第 25 格重跑 Wan 回中立，同一生成空間），**打到＝第 9 格**；第 29 格回到中立，可直接接回待機。
- 訓練用聖徒（Ray 11-05「把第一個怪 訓練用聖徒跟背景拆開 獨立出來」）：⚠⚠ **立繪要換**：`enemy_trainee` 由合成圖 `saint_tr_ci.webp`（怪＋走廊）改指 **`resources/enemy/saint_tr_neutral.webp`**（中立站姿、alpha 1024×1536，待機與爪擊都用它生成）；戰鬥背景另交 **`resources/enemy/saint_tr_bg.webp`**（1254² 空走廊，同原構圖），卡上 `bg` 請指它。`saint_tr.webp` 是原姿勢（伸手）的去背版，備用。待機頭部抽動是程式旋轉（Ray 同意）、身體是 Wan。攻擊（前撲爪擊，DMA 共用一支）＝`saint_tr_neutral_atk_v1/`：Ray 剪的 `out/export/saint_tr_neutral_lungeAB_cut`（原片 49 格取前段 10 格），**打到＝最後一格（第 9 格）**；結尾停在劈中姿勢、與待機差很多 —— R（退回待機）還沒交，先蓋在受擊特效之下切回待機。
- E068 tiger rule 重剪（Ray 指定）：攻擊 v3＝`out/export/mon_shinierforest_tiger_atk_tigerrule`（biteAB2＋biteBA2，pounce 規則，**打到第 13 格**；兩段同一生成空間 720×480／FIT 0.72／OY 0.85，不必換算）；延時 v2＝`mon_shinierforest_tiger_delay_tigerrule`（hswipeAB＋hswipeBA，hswipe 規則，**打到第 9 格**；720×480／FIT 0.78／OY 0.5）。canvas 對 `mon_shinierforest_tiger_neutral.webp`。
- E019 攻擊：tiger rule 自動剪（`out/export/mon_beast_altar_atk_tiger`＝ramAB＋ramBA），**打到＝第 13 格**，無碰邊。B 圖 `_neutral_refs/mon_beast_altar_B_ram.png`。待機：`out/monsters/mon_beast_altar_idle2` 48 格全留（Ray 未另剪；第一版 idle 左側經幡碰邊、已棄）。
- E019 延時 **v2**（11-08，Ray：「把這個當成咆哮交件」）：natali rule 重做 —— 新 B `_neutral_refs/np_kf/cm_altar_B_roar_v2.png`（GPT，加揮動模糊、對色），R＝收勢。三段 tiger rule（撲擊表）初剪直接接：撲出 `np_altar_roarAB2`（14 格）＋ 慣性 `np_altar_roarBF2`（13 張→15 格）＋ 收回 `np_altar_roarFA`（13 張→15 格），接點重複格只留一張，FIT 0.78。**咆哮到位（打到）＝第 13 格**（撲出段最後一格）。從中立起手、回到中立，不必再蓋特效切入。⚠ 第 9 格（原片 #18）右前腳尖碰生成畫布右緣、會被切一點。
- E019 延時（v1，已被 v2 取代）：Ray 剪的 `out/export/mon_beast_altar_B_roar_roarBA_cut`（**只有收回段**，原片 33 格取 19 格、部分 ×2 → 22 格）。⚠ **第 0 格就是吼叫姿勢**（胸口巨口張到最大），從待機切進來那一下會直接跳到吼的那一格 —— 要蓋在受擊特效之下。吼叫的「打到」＝第 0 格。B 圖 `_neutral_refs/mon_beast_altar_B_roar.png`。
- E017 攻擊：Ray 剪的 `out/export/mon_sea_coralman_atk_tiger_cut`（tiger rule 自動剪的 29 格只留前 14 格＝撲出段），**打到那一格＝最後一格（第 13 格）**，結尾停在撲擊姿勢、與待機第 0 格差很多 —— 切回待機要蓋在受擊特效之下（同娜塔莉 v2）。720×720 生成、FIT 0.52（撲出時雙爪張到畫布邊，AB 16–41 碰邊，Ray 看過選用）；B 圖 `_neutral_refs/mon_sea_coralman_B_pounce.png`。
- E017：Ray 剪的 `out/export/mon_sea_coralman_delay2_cut`（原片 48 格取 24 格、部分 ×2 → 30 格）。最後一格與第一格差 8.8（不完全相同，見上方 ⚠）。

- E007：Ray 定的作法（**所有爪擊照這套**）：GPT 先把原圖改成「中立站姿」(A) 與「爪已劈到底、手背朝鏡頭」(B)；Wan 跑 A→B（撲擊劈下）＋ B→A（歸位過渡），Ray 剪完兩段接成一支。
  延時 = `out/export/mon_natalia_neutral_slashAB_cut`（9 格）＋ `mon_natalia_B_slash_returnBA_cut`（28 格）。
- ⚠⚠ **娜塔莉換了立繪**：待機、延時、攻擊都是用新的中立站姿生成的，**卡上的立繪要一起換成 `resources/enemy/mon_natalia_neutral.webp`**（1024×1536，舊的 `mon_natalia.webp` 是撲擊姿勢），
  `ENEMY_IDLE.mon_natalia` 也要改指 `mon_natalia_idle_v3/`（或新增一把 `mon_natalia_neutral` 的鑰匙 —— 照 ENEMY_IDLE 以立繪檔名當鑰匙的規約，建議後者）。不換的話待機第一格會跟靜態立繪對不上。

## 程式端要做的（Ray 11-05：「進遊戲測」）

1. **播放器**：戰鬥中敵人「主動攻擊」那一刻（受擊演出之前）從待機 loop 切進 `_atk_v*`，播一次後切回待機；**延時／點錯**懲罰那一刻同理切 `_delay_v*`。格式同 `ENEMY_IDLE`（`startIdleLoop` 那一套的 canvas/box/px），只多 `loop:false`。
2. **登記**：建議 `ENEMY_ATK`／`ENEMY_DELAY` 兩張表（鑰匙＝立繪檔名，同 `ENEMY_IDLE`），沒有登記的敵人照舊只有現有演出。
3. **讀取**：照鐵律 13，只在那一場戰鬥的門載（`enterBattleAudio` 那一族的圖版），戰後釋放。
4. 驗收：開 `np_nightmare`（娜塔莉）與北方泊地的魘魔那一場，攻擊／延時各觸發一次，看切換點有沒有跳。

- E068 延時：Ray 剪的 `out/export/mon_shinierforest_tiger_B_hswipe_hswipeBA_cut`（收回段，原片 33 格取 19 格、部分 ×2 → 23 格），`edge_check` 無碰邊。⚠⚠ **立繪要換成中立站姿 `resources/enemy/mon_shinierforest_tiger_neutral.webp`**（舊的 `mon_shinierforest_tiger.webp` 是撲擊姿勢）；canvas 是這一張。B 圖 `_neutral_refs/mon_shinierforest_tiger_B_hswipe.png`。攻擊（撲咬）製作中。

- E068 攻擊：Ray 剪的 `out/export/mon_shinierforest_tiger_neutral_biteAB_cut`（撲出段，原片 49 格取 20 格）。**咬到那一格＝最後一格（第 19 格，0 起算）**。⚠ `edge_check`：第 6 格獨角尖碰到生成畫布上緣。結尾停在撲咬姿勢、沒有歸位段（同娜塔莉 v2 的情況），切回待機要蓋在受擊特效下。B 圖 `_neutral_refs/mon_shinierforest_tiger_B_bite.png`。

- E068 攻擊 **v2**（現行）：撲出 `biteAB_cut`（20 格）＋ 收勢 `biteBA2_cut`（18 格→23 格）。**咬到那一格＝第 19 格（0 起算，撲出段最後一格）**。⚠ 兩段原本不在同一個生成空間（撲出 FIT 0.78／OY 0.5、收勢 FIT 0.72／OY 0.85）：撲出段已用 B 圖的對位**整格等比縮放＋平移**換算到收勢那一個空間（不重畫、不交叉淡化），接點差異 12.9（小於撲出段相鄰格 26.9）。canvas 照收勢空間交（FIT 0.72／OY 0.85）。⚠ `edge_check`：收勢段開頭幾格獨角碰生成畫布上緣。

- E065：延時＝`hswipeAB2_cut`（10 格）＋`hswipeBA2_cut`（22 格），**打到那一格＝第 9 格**；攻擊＝`pounceAB2_cut`（14 格）＋`pounceBA2_cut`（15 格），**打到那一格＝第 13 格**（皆 0 起算＝撲出段最後一格）。兩段同一生成空間（直式、FIT 0.64）。⚠ `edge_check`：攻擊第 9–10 格雙爪碰生成畫布左右邊；延時無碰邊。⚠⚠ **立繪要換成中立站姿 `resources/enemy/mon_shinierforest_lynx_neutral.webp`**（舊的 `mon_shinierforest_lynx.webp` 是撲擊姿勢）。中立待機已生成（`out/enemy_atk/mon_shinierforest_lynx_neutral_idle`），等 Ray 剪。

- E066／E067：tiger rule 自動剪（`tivot_wan/tiger_cut.py pounce`），**打到那一格＝第 13 格**（0 起算），兩支都 29 格、無碰邊。ENEMY_ATK 與 ENEMY_DELAY 都指同一支。⚠⚠ **立繪要換成中立站姿** `mon_shinierforest_snake_neutral.webp`／`mon_shinierforest_hog_neutral.webp`（舊的在咬／在衝）。⚠ 水蛇第 16–19 格頭縮進身體；山豬收回段兩格帶一小團煙塵（Ray 看過說交）。中立待機在 animechk 等 Ray 剪。

- 索菈娜（敵人）**左閃**（11-19，Ray 剪）：兩段，**同一個 box/px**，可直接接著播不跳：
  · 閃出 `resources/enemy/anim/sorana_guard_dodgeL_out_v1/`（`np_sorana_dodgeL_test_cut` 6 格：站姿→過渡模糊格→左閃姿勢）
  · 歸位 `resources/enemy/anim/sorana_guard_dodgeL_back_v1/`（`np_sorana_dodgeL_fwdrev_cut` 7 格：左閃姿勢→倒放→站姿）
  canvas＝`resources/si/sorana_si_guard.webp`（1024×1535，Ray 指定的待機底圖），24fps，`loop:false`。
  ⚠⚠ **切換邏輯（Ray 11-19）**：玩家開槍 → 播一支閃出（左／右／下三選一）並停在閃避姿勢；
    **玩家沒有持續攻擊 → 播那一支的歸位回待機；持續攻擊 → 直接換另一個閃避動作的閃出**（不先歸位）。
  ✔ **ver -2805 已接**（`config.ENEMY_DODGE` → `enemy.enemyEvade`，測試戰 `np_test_sorana`）：右閃／下閃／格擋也已交（`sorana_guard_{dodgeR,dodgeD,parry}_{out,back}_v1`，照左閃的剪法），八段同一個 box。目前**每一槍都閃**，格擋的觸發時機待 Ray 定。原本的說明：Ray 的設計前提——**玩家開槍（點盤面）時她播閃避**（左閃／右閃／下閃三選一），**打中時改播匕首格擋**；A＝撲斬、D／M＝飛刀（飛刀由程式畫，GPT 圖已去掉刀）。
  其餘五支（右閃、下閃、格擋、撲斬、飛刀）的關鍵格與過渡模糊格已交（`resources/_originals/enemy/sorana_kf/`），待 Wan。待機（guard 呼吸）還沒跑。
  ✔✔ **ver -2831 整組定版**（Ray：「索菈娜整組定版」），已套到正式卡 `man_sorana`（測試卡 `test_sorana` 只是換名字的複本）：
  · 待機 `sorana_guard_idle_v1/`（`np_sorana_idle_wan7_cut` 22 格 24fps 循環）
  · A＝撲斬 `sorana_guard_atk_v1/`（16fps，打到那一格前撲 1.35）；刀痕 `HITFX.sorana_slash`（固定左上往右下斜）
  · D／M＝擲飛刀 `sorana_guard_throw_v1/`（第 2 格出手；程式飛刀平飛、90ms、由小變大；音效同共鬥；受擊 `HITFX.sorana_knife` 不放刀痕）
  · 閃避三種＋格擋 `ENEMY_DODGE.sorana_si_guard`（`dodgeL_v4`／`dodgeR_v3`／`dodgeD_v3`／`parry_v2`，無程式位移）；普攻與反擊有效率 30%（`parryBasic:0.7`），BR 也演閃避／格擋（只演出、照舊打穿）；格擋音＝米夏劈落 `se_bulletguard`
  · 背景 `resources/enemy/sorana_battle_bg_v3.webp`（湖上甲板，`bgLock`）＋程式水面／雲（`script/bg_fx.js` 的 `sorana_battle_bg_v3`）

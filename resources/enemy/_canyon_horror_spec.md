# 卡耶爾山谷（canyon 背景）— 扭曲恐怖系怪物（2026-10-09，美術）

Ray：「生一批卡耶爾山谷的怪 扭曲恐怖風格 搭配背景 先來一隻確認風格」→ 吊屍者過關 →
「照這風格再生 10 隻，要有一些碩大的、堅甲的、詭異的」。

⚠ 取代 `_canyon_beast_spec.md` 那份從沒生成過的 20 隻名單（那份是「健全／畸變／魔獸」寫實獸路線，這一批是扭曲恐怖路線）。

## 共同規格
- 產線：GPT 直接出真 alpha（每隻一個新對話，避免剪影趨同）；參考圖＝`mon_canyon_hanged`（系列畫風）＋ `background/canyon/canyon_corridor_day`（場景）
- 配色：冷灰／青灰／骨白為主，只點綴暗紅朝聖布條與鏽褐；朝聖者遺物（石龕、鏽燈、經幡、念珠、鎖鏈、聖像）是器物來源
- 不血腥、無文字、全身入框、1024×1536；四鐵則（anime style, cel shading, clean lineart, 無顆粒）
- ⚠ 共同段不寫姿勢 —— 姿勢逐隻指定

## 名單（基準 1 ＋ 新 10）

| 檔名 | 中文 | 類 | 剪影 | 狀態 |
|---|---|---|---|---|
| `mon_canyon_hanged` | 崖縫吊屍者 | 詭異 | 倒掛、六臂放射 | ✔ 交件（定風格） |
| `mon_canyon_colossus` | 崩岩巨像 | 碩大 | 塔狀直立巨人 | ✔ 交件 |
| `mon_canyon_coffinbeetle` | 石棺甲蟲 | 堅甲 | 低矮橫寬的甲蟲 | ✔ 交件 |
| `mon_canyon_bonecrab` | 骸殼蟹 | 堅甲 | 橫向張開雙螯 | ✔ 交件 |
| `mon_canyon_pilgrimmass` | 朝聖者團塊 | 詭異 | 一團蠕動的兜帽群 | ✔ 交件 |
| `mon_canyon_bellwyrm` | 喪鐘蠕蟲 | 碩大 | 從地面竄起的 S 形長蟲 | ✔ 交件 |
| `mon_canyon_saintvulture` | 聖面鷲 | 詭異 | 雙翼大張的鳥 | ✔ 交件 |
| `mon_canyon_ironpenitent` | 鐵衣苦修者 | 堅甲 | 佝僂人形拖著巨物 | ✔ 交件 |
| `mon_canyon_ribcage` | 肋籠獸 | 碩大 | 四足長頸骨架 | ✔ 交件 |
| `mon_canyon_stilt` | 高蹺細影 | 詭異 | 極細極高、四根長腿 | ✔ 交件 |
| `mon_canyon_censer` | 香爐蠍 | 堅甲 | 尾巴高舉的蠍 | ✔ 交件 |

## 交件（2026-10-09）
- 11 張全部 `enemy/mon_canyon_<名>.webp`（真 alpha、1024×1536），原 PNG 在 `_originals/enemy/`；總覽 `_canyon_horror_sheet.jpg`（疊在 `canyon_corridor_day` 上）。
- 每隻一個新對話、附吊屍者＋峽谷背景兩張參考，11 張一次就過、沒有被擋。
- ⚠ 構圖都很滿（外框貼近畫布邊）：`censer` 的尾巴頂到上緣、`ironpenitent` 的十字杖貼左緣、`pilgrimmass` 的經幡貼右緣 —— 遊戲的 fit 若會裁就要重出縮小版，等 Ray 看。
- ⚠ 程式端要接（鐵律 11）：這 11 隻都還沒有敵人卡；卡耶爾山谷的遭遇表要換成這一批，數值等 Ray 給。

## 第二批 5 隻：群體用的小型個體（Ray：「再畫個五隻吧」→「畫一些可以在畫面上放好幾隻的」）
規矩（Ray：「記得怪圖都要有朝 viewer 攻擊的態勢」）：每隻提示詞都寫明「哪個部位正朝鏡頭攻擊」＋「不要只是站著」。崩岩巨像因為只是站著被退，重畫成石拳砸向鏡頭。
群體用：**一張只畫一隻**、體型緊湊（不是巨獸）、四邊留白約 12%，方便程式端複製成 3～5 隻同畫面（同惡棍群戰的分層做法）。

| 檔名 | 中文 | 攻擊態勢 | 狀態 |
|---|---|---|---|
| `mon_canyon_crawler` | 爬行朝聖者 | 四肢著地、撲向鏡頭，石面具張口 | ✔ 交件 |
| `mon_canyon_bellmite` | 鐘殼蟲 | 跳起撲向鏡頭，大顎張開 | ✔ 交件 |
| `mon_canyon_chainhound` | 鎖鏈餓犬 | 躍起撲咬鏡頭 | ✔ 交件 |
| `mon_canyon_lanternimp` | 提燈小鬼 | 掄起鏽燈朝鏡頭砸來 | ✔ 交件 |
| `mon_canyon_bonecrow` | 骨鴉 | 俯衝、爪子伸向鏡頭 | ✔ 交件 |

### 交件（第二批＋石頭人重畫，2026-10-09）
- `mon_canyon_colossus` 換成石拳砸向鏡頭版（舊版在 `_recycle/`，原稿 `_originals/enemy/mon_canyon_colossus_v2.png`）—— ⚠ 同名覆蓋，程式端要 `bust.py --bump`。
- 群體 5 隻全部交件，總覽 `_canyon_swarm_sheet.jpg`（每種左右各一隻＋前排一隻、一隻水平翻轉，示意同畫面 3 隻）。
- ⚠ 程式端要接：群體用要比照惡棍群戰（每隻一層、可水平翻轉做變化）；敵人卡與數值等 Ray。

## 第三批：深色重生版 17 隻（2026-10-11，美術）

Ray（經程式 session 轉交）：「卡耶爾的怪跟背景色太近了，讓 gpt 再生一組，更有壓迫感的怪物」。
先定調 1 大 1 小給 Ray 看 → 「狗怎麼變小型寵物犬了」重畫成魔獸 → 「保留當大型，另外畫一隻小的群體版」→「算新增，用新名字，開始量產」。

**配色規則（取代上面「冷灰／青灰／骨白」那一條）**：主體焦黑／瀝青黑（骨、甲殼、石頭也是燒焦的黑，⛔ 不要骨白與灰白）；
裂縫、眼睛、口中透出暗橙的餘燼光；點綴深鏽紅朝聖布條與鏽鐵鏈。大型＝低角度仰拍、朝鏡頭壓過來；群體＝撲向鏡頭。
參考圖只附 `background/canyon/canyon_bones_day`（**不附舊怪** —— 附了會把灰白配色帶回來）。三串對話：大型 5／大型 5／群體 4。

**全部是新檔名，舊的 16 張原封不動**（不必 `bust.py --bump`）。總覽 `_canyon_dark_sheet.jpg`（疊在白骨之地上）。

| 檔名 | 中文 | 類 | 備註 |
|---|---|---|---|
| `mon_canyon_colossus_dark` | 崩岩巨像 | 大型 | 石拳朝鏡頭砸下，拳頭擋住頭 |
| `mon_canyon_houndbeast` | 餓獸（**新增**） | 大型 | 原本是鎖鏈餓犬的定調稿，Ray 改列大型 |
| `mon_canyon_hanged_dark` | 崖縫吊屍者 | 大型 | 倒掛，鐵鏈從上緣垂入（上緣切齊是造型） |
| `mon_canyon_coffinbeetle_dark` | 石棺甲蟲 | 大型 | |
| `mon_canyon_bonecrab_dark` | 骸殼蟹 | 大型 | |
| `mon_canyon_pilgrimmass_dark` | 朝聖者團塊 | 大型 | |
| `mon_canyon_bellwyrm_dark` | 喪鐘蠕蟲 | 大型 | 頂上十字貼上緣 |
| `mon_canyon_saintvulture_dark` | 聖面鷲 | 大型 | ⚠ 翅尖碰左右邊緣 |
| `mon_canyon_ironpenitent_dark` | 鐵衣苦修者 | 大型 | |
| `mon_canyon_ribcage_dark` | 肋籠獸 | 大型 | |
| `mon_canyon_stilt_dark` | 高蹺細影 | 大型 | |
| `mon_canyon_censer_dark` | 香爐蠍 | 大型 | |
| `mon_canyon_chainhound_dark` | 鎖鏈餓犬 | 群體 | 餓獸的小型群體版（顱骨也焦黑） |
| `mon_canyon_crawler_dark` | 爬行朝聖者 | 群體 | |
| `mon_canyon_bellmite_dark` | 鐘殼蟲 | 群體 | |
| `mon_canyon_lanternimp_dark` | 提燈小鬼 | 群體 | ⚠ 提燈碰右緣 |
| `mon_canyon_bonecrow_dark` | 骨鴉 | 群體 | |

- ⚠ 群體 4 隻（crawler／bellmite／lanternimp／bonecrow）GPT 沒照「四邊留 15%」，構圖偏滿 —— 程式端排群戰時要縮小；只有 `chainhound_dark` 是真的緊湊。
- 原 PNG 在 `_originals/enemy/`（同名 `.png`）。
- 資產盤點：✔ 不欠（17 張，Ray 點名的都交了；舊 16 張保留不回收，等程式端切換完再決定）。

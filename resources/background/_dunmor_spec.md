# 無人廢城（暫名 `dunmor`）— 背景工單（2026-09-25 開單，拓樸已由 Ray 定案）

> Ray：「先照這樣畫圖吧，**破敗的古凱爾特古城風格，但是不要太破，看起來好像剛被破壞，
>   似乎不久前還有人的樣子，天空紫紅，不做四差分**」

拓樸與逐格出口：`resources/map/_dunmor_spec.md`（v2，56 格・5 環，**同向直線 ≤2 段**）／
佈局圖 `resources/map/_layout_dunmor.png`。**這一單只管畫法與交件。**

---

## 一、Ray 定死的四件（每一則提示詞都要帶）

| | 規格 | 提示詞裡怎麼寫（寫成「畫什麼」，不要只寫形容詞） |
|---|---|---|
| **風土** | 古凱爾特丘堡廢城（鐵器時代）：乾砌石壘、圓屋（roundhouse）、立石、石環、歐甘石、三曲紋（triskele）、頸環、木棧、茅頂 | 「乾砌石牆（無灰漿、扁石層疊）、圓形石基座配塌落的茅草錐頂、刻三曲紋與螺旋的立石、歐甘刻痕的界石」。⛔ 沒有羅馬拱券、沒有哥德尖拱、沒有城堡塔樓（圓塔 broch 除外）、**沒有東方元素** |
| **破敗程度：剛被破壞** | 不是千年廢墟，是**幾天前**被毀的：牆倒了但石頭還新、木頭沒有朽、茅草還是黃的 | 「倒塌的石牆**斷口是新的、石面乾淨沒有苔**；燒黑的茅草**還在冒一縷細煙**；斷掉的木柱**木色新鮮**；沒有藤蔓、沒有青苔、沒有風化」 |
| **不久前還有人** | 生活的東西都還在原位，只是主人不在了 | 每一格**放一到兩件**：翻倒的陶罐、還掛在火上的鐵鍋、晾了一半的格紋布、地上的木碗與麵包、門邊的木桶與掃帚、繫在樁上的斷韁繩、車轍還很深的泥地。⛔ **畫面裡不准有人、也不要屍體**（無人廢城） |
| **天空：紫紅** | 全圖同一片天：紫紅色的天空，像一直停在黃昏又不是黃昏 | 「整片天空是**紫紅到絳紅的漸層**（不是橘色的夕陽），雲層低而厚、帶暗紫；環境光偏紅、陰影偏紫藍；地面石頭是冷灰帶一點紅光」。**每一格同一組色溫**，第一張定色之後**之後每一則都附第一張當色票** |

- **不做時段差分**：一格一張、全部 `noTime:true`。檔名**不帶時段尾綴**。
- ⚠ 銀月規矩（§5）照舊成立：這片紫紅天裡若朝西就掛**一輪銀色滿月、低空**；朝東不畫本體。
  **這張圖入口在南、祭壇在北** ⇒ 主軸各格鏡頭朝北（不畫月亮本體，月光從左邊來、影子往右拖）；
  西望樓／西壘牆那幾格朝西才畫月亮。答不出朝向就只畫月光。
- 畫風四鐵則（§5）**每一則結尾都帶**：anime style, cel shading, clean lineart，絕不要顆粒感、不要雜訊噪點、不要油畫質感。
  「動漫風」要寫成六件事（看得見的描邊／2~3 階硬邊色塊／彩度偏高／天空與雲是有形狀的塊／草葉成團／不要景深模糊與鏡頭光暈）。
- 第五鐵則（越塞越多）：每一張交件前與上一張並排，**多出來的東西預設是錯的**。這一批最容易長出來的是「人」與「屍體」—— 明寫禁掉。

---

## 二、構圖硬規定（同所有探索地圖）

- 橫式 **3:2**、平視、**中央留空給人物立繪**（景物擺兩側），畫面下四成會被槍棺蓋住 ⇒ 重點在上半。
- **出口要畫得出來**：那一格有幾個方向的出口，畫面上就要有幾條真通道（正面一道＝畫面深處的路；左右＝兩側的缺口／坡道／門）。
  逐格的出口在 `_dunmor_spec.md` §二的「出口」欄 —— **來路（↓）在鏡頭後面不畫**，其餘照畫。
  三向口（19 格）＝正面一道＋一側，或左右各一道；四向口只有湖岸（正面棧道＋左右岸邊）。
  ⚠ 端末口（12 格）畫成**盡頭**：不要留任何看起來走得過去的缺口，多畫一條就是說謊（憲法 -890）。
- 死路裡有 4 格是「值得繞去看」的（王塚、積石塚、圓塔頂、顱骨壁龕）：構圖給它們一個**明確的主體**（塚門、塔頂視野、整面顱骨），日後放寶箱／插圖。
- 五格地下／室內（`souterrain`／`fogou`／`cistgrave`／`ossuary`／`brochbase`）沒有天空：光源是洞口透進來的紫紅光 ＋ 一盞還沒熄的油燈（「剛才還有人」）。

---

## 三、產線（照既有流程，§5 的分工表）

1. **ChatGPT 出每一格**（同一串連著畫，第一則附 `_layout_dunmor.png` 與逐格清單，之後每則附**第一張**當色票）。
   ⚠ 附圖與文字同一則送（`file_upload` 後等送出鈕可用、框裡有字再點）；抓圖用 blob 大小排除已下載過的。
   ⚠ 同一串失敗兩次就換串（§5 立繪差分產線的規則 2 一樣適用）。
2. **Gemini 只做後製**：有顆粒才過（平坦區雜點法＋校準點，100% 裁切用眼睛複核），構圖／視角／位置一律不變。
   ⚠ 這批**沒有差分要衍生**，所以 Gemini 那一步是條件分支，不是每張都跑。
3. 交件：`resources/background/dunmor/dunmor_<id>.webp`（cwebp q85、1536 寬、**檔名全小寫、不帶時段**）；
   GPT 原稿進 `resources/_originals/background/dunmor/`。交完跑 `python3 tools/bg_index.py`（漏跑的症狀是「停在上一格的背景」，不是空白）。
4. 順序建議：先畫**主軸與三個休息處**（跨圖出口→堤道→南壘門→西壕→歐甘石列→門內廣場→石板主街→市集十字→野豬石→內壘門→德魯伊居所→橡樹林→聖林祭場→祭壇 ＋ 聖井廣場），
   Ray 看過色調與破敗程度**再**鋪其餘 41 格 —— 第一批就是色票與尺度的校準點。

---

## 四、交件清單（55 張，`✔` 才算交）

| 帶 | id（照 `_dunmor_spec.md` §二） | 張數 |
|---|---|---|
| 外壘 | causeway southgate ditchW ditchE rampartW rampartE watchW watchE oghamrow gatecourt granary | 11 |
| 居住區 | mainstreet marketcross smithy kilnyard tannery kingshall chariotshed treasury hallcourt lawstone boarstone innergate innerditch potters roundring wellsq weaverhut souterrain fogou cistgrave ossuary | 21 |
| 聖域 | druidhouse oakgrove stonerow dolmen headshrine barrowfield kingsbarrow nemeton altar triskele springpool altarcourt skullniche sacredway henge brochbase bardsstep brochtop boglane lakeshore crannog bogoffer cairn | 23 |

（`gate` 是跨圖出口，不畫。）

---

## 五、⚠ 程式端要接的（美術不碰，鐵律 11）

- 拓樸搬進 `script/town.js`：節點／出口照 `tools/map_dunmor_draft.py` 的 `NODES`／`EDGES`（方向＝相對位置：左邊的鄰居掛 `left`…，`back` 不寫、由 `exitsOf` 現算）。
  搬完 `map_layout.py` 的 `POS` 補一格、**產生器回收**（同一個拓樸不留兩份）。
- **每一格的 `bg` 就是 `dunmor_<id 小寫>`**（`bg_index.js` 的 `dunmor` 那一列，`ditchW`→`dunmor_ditchw`）。
- **每一格 `noTime:true`**（Ray：不做四差分）；`wilderness:true`；迷霧預設（不要寫 `mist:0`）；
  `rest:true`＋`noWild:true`：`wellsq`／`oakgrove`／`nemeton`；入口 `entry:'gate'`。
- 還沒定：地圖 id／中文正名、祭壇那一場是誰（`sessionEnd`）、`wildSpawn`（怪卡到了再接）、祭壇前庭要不要 `exitIf` 開路。
- 小地圖：拓樸定案後走 `tools/map_compose.py`（圖示表 55 格，8×7），另開一單。

## 六、第一批交件紀錄（2026-09-25 下午，Mac；ChatGPT 一串 14 則、零重送、零被擋）

**交了 14 張** → `resources/background/dunmor/dunmor_<id>.webp`（cwebp q85、1536×1024）；
GPT 原稿 `resources/_originals/background/dunmor/`；總覽圖 `resources/background/_dunmor_batch1_sheet.jpg`
（**給 Ray 看色調與破敗程度的就是這一張**）。`tools/bg_index.py` 已重跑（`bg_index.js` 多 `dunmor` 一列）。

| # | id | 檔名（**全小寫**） | 出口對了嗎 | 備註 |
|---|---|---|---|---|
| 01 | causeway | `dunmor_causeway` | ✔ 正前 | **色票**（之後每一則都附它）；遠景門道楣石沒塌（那是南壘門那格演的，遠景不計較） |
| 02 | southgate | `dunmor_southgate` | ✔ 左右、正前楣石堵死 | |
| 03 | ditchW | `dunmor_ditchw` ⚠ id 是 `ditchW`，檔名照規約小寫 | ✔ 正前上坡；⚠ **右側出口不夠明確**（坡地與柵欄之間的開口） | 色調過關後可考慮重出 |
| 04 | oghamrow | `dunmor_oghamrow` | ✔ 右側缺口（看得到石臼）、正前牆堵 | |
| 05 | gatecourt | `dunmor_gatecourt` | ✔ 三向（左立石、右穀倉石柱） | |
| 06 | mainstreet | `dunmor_mainstreet` | ✔ 正前＋右巷（鍛爐紅光） | |
| 07 | marketcross | `dunmor_marketcross` | ✔ 左路、正前圓屋殘骸封死 | |
| 08 | boarstone | `dunmor_boarstone` | ✔ 三岔（正前看得到內壘門頭像楣） | |
| 09 | innergate | `dunmor_innergate` | ✔ 正前門洞＋左下坡 | |
| 10 | druidhouse | `dunmor_druidhouse` | ✔ 左路往橡樹林；屋內油燈／槲寄生／獸骨 | |
| 11 | oakgrove | `dunmor_oakgrove` | ✔ 三向 | 休息處 |
| 12 | nemeton | `dunmor_nemeton` | ✔ 正前石階通祭壇；右側缺口偏弱 | 休息處 |
| 13 | altar | `dunmor_altar` | ✔ 盡頭（三立石＋懸崖＋霧） | 終點 |
| 14 | wellsq | `dunmor_wellsq` | ✔ 死角；來路畫在左緣缺口 | 休息處 |

**顆粒**（`flat30` 同一支腳本量三張校準：被退的舊 `Crossway_day` 7.80／現行過關版 5.27）：
14 張落在 3.4~5.6，`druidhouse` 7.6／`nemeton` 7.4／`wellsq` 7.2／`oakgrove` 14.5 —— 100% 裁切看過，
高的那幾張全是**畫出來的鵝卵石與樹葉**，天空平坦區乾淨。**這一批不過 Gemini**（過一趟會削細節，§5）。

**產線紀錄（照這樣跑第二批；第一批的 ChatGPT 串 `https://chatgpt.com/c/6ab5f75b-4808-83ee-97b3-88aaae6ac5ed`，第二批開新串即可，色票靠附圖帶）**：`resources/si/_grab.js` 注入分頁 → 第一則只送文字、不附佈局圖
（拓樸圖會被畫進去）→ 之後每則 `file_upload` 第一張當色票 ＋ 共通段 ＋ 那一格的段落 → 70 秒 `__grab`
→ 本機比像素指紋（防抓到自己上傳的那張）。共通段與 14 格的提示詞全文在
`resources/background/_dunmor_prompts.md`。

### ⚠ 第二批之前要 Ray 定的一件：**端末口的鏡頭朝向**
這一批的慣例是「每格鏡頭朝北、↓（來路）在鏡頭後面不畫」，14 格全部成立。
但其餘 41 格裡有幾個端末口的**唯一出口不是 ↓**：`crannog`（湖上木屋）與 `tannery`（鞣皮坊）唯一出口是 **↑**、
`watchW`／`headshrine`／`kingsbarrow` 是 **→**、`watchE`／`brochtop`／`cairn` 是 **←**。
照聖井廣場的作法（**來路畫在那一側的畫面邊緣，其餘三面封死**）就可以畫，
唯獨 `crannog`／`tannery`「來路在正前方」＝鏡頭要朝南（背對祭壇）—— 這兩格**要不要改成朝北、把來路留在畫面下緣**，等 Ray 一句話；沒回就照聖井的作法（正前方畫湖岸／陶窯場，當作走回去的路）。
⚠ 望樓兩格朝西／朝東：`watchW` 朝西**要掛銀色滿月**（§5 銀月規矩），`watchE` 朝東只畫月光。

## 進度

- [x] 第一批 14 張（主軸＋三個休息處）→ **等 Ray 看色調與破敗程度**（`_dunmor_batch1_sheet.jpg`）
- [ ] 其餘 41 張（Ray 點頭後；第一批的問題先修：`ditchW` 右口、`nemeton` 右口）
- [ ] 小地圖

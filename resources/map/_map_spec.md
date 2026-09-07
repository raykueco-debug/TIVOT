# 槍棺地圖（手繪羊皮紙）— 場景規格

## ⚠⚠⚠ 先排小地圖，再畫場景（2026-09-07，Ray 定案，全美術產線適用）

> Ray：「以後繪圖應該**先排小地圖再下去畫**，才不會畫出來移動邏輯不通」

**一張新地圖的順序是：拓樸 → 每一格要幾個出口 → 場景圖 → 小地圖。**
不是「先畫一批好看的場景，再想辦法把它們連起來」。

**為什麼**（木雅克神殿就是反例，繞了十幾版）：場景圖畫死了那一格**能有幾個出口** ——
畫面上看得到幾道門，那一格就只能接幾條路（§`_ruins_spec.md`「三個出口要真的是路」）。
先畫的 18 張裡**只有 3 張畫得出側向通道**，於是：

- 地圖只做得出「一條主軸＋一個岔口」，Ray 連退三版（「太過一直線」「根本一直線」）；
- 為了補救得**回頭加畫三張三岔**（Crossway／Brazier／Hollow，一層一張）才長出抉擇點；
- 中途每改一次拓樸，小地圖就得整張重畫（**地圖的每一筆線都是拓樸的函數**）。

**所以開一張新地圖時，第一件事是問**：
1. 這張圖要幾格？主軸多長？要幾個**抉擇點**（3~4 向）、幾個**末端**？
2. 逐格列出**它需要幾個出口、分別朝哪個方向** —— 這是**場景圖的規格**，
   不是畫完再看著辦。
3. 抉擇點那幾格的提示詞要明寫「正面一道＋左右各一道**真通道**」
   （門框／塌開的缺口、地面延續進去、裡面暗下去）。
4. 拓樸**定案並接進 `script/town.js`、實走過**，才畫小地圖。

- ⚠⚠ **拓樸是遊戲設計，不是美術** —— 定案前不要開始畫小地圖。
  神殿那幾版就是拓樸還在動的時候畫的，全部白畫。
- ⚠⚠ **小地圖上的相對位置＝遊戲裡的箭頭方向**（ver -908 程式端確認）：
  某格畫在另一格的左邊，玩家就是按左過去。所以構圖可以疏密不均、線可以彎，
  但**上下左右的相對關係一格都不准挪** —— 挪了地圖就在騙人。
- ⚠ 這條與「同一條邊的兩端必須是相反方向」（CLAUDE.md §6.5.4.3 後）是同一件事的
  兩端：那條管資料，這條管圖。


點開槍棺右下角的書 → 控制面盤變成這張圖，所在地閃爍光點。
程式端只讀 `img` 與 `spots`（比例座標），所以**圖上每個地點的位置就是規格**。

## 共用規格（ver -883，Ray 定案）

- 橫式 **1536×1024**，舊羊皮紙、褐墨、撕裂毛邊。
- **畫風＝鋼筆簡筆素描**（Ray 指定）：單色褐墨線稿、細筆觸、簡筆速寫，
  **不要上色、不要塗滿、不要水彩**。每格的小插畫是**幾筆帶過的速寫**，不是插圖。
- ⚠⚠ **去白背走 alpha 通道**（Ray 每次都提）：撕邊之外一律透明，不要留白框、
  不要白霧邊 —— 遊戲裡它是疊在場景上的。
- ⚠⚠⚠ **圖上只准有英文節點名，而且是極草書**（Ray：「圖上的字只能是各節點的英文
  極草書，之後地名留給 code 壓字，這樣以後才能翻譯」）：
  · 那串草書是**裝飾**，不必讀得清楚 —— 真正給玩家看的地名由程式壓在上面。
  · **一個中文字都不要**、不要標題、不要圖例、不要方位、不要比例尺、不要年份。
  · 字烘進圖裡就翻不了譯（日文／英文版要換字），所以可讀的那一層一定要留給 code。
- 每個地點：一個**墨點**（程式的光點會蓋在這裡）＋ 那一格的辨識物速寫 ＋ 草書英文名。
- 地點之間用**手繪墨線**連起來；換層用**虛線**。
- 基準：`map_shinierforest.webp`（夏爾森林那張，已驗收）。

## ⚠⚠ 路線圖必須畫出「分岔」與「末端」（ver -882，Ray 退件時指出）

> Ray：「這張不行」「地圖太過一直線了，要有分叉跟迷宮感」
> 「要把端點跟過道分清楚，適合當端點的圖就不要再衍生其他路，分岔過道就讓他路線多擇」

**`map_shinier_ruins.webp`（第一版）被退回的原因**：三層各畫成**一排直線**，
每個地點只接左右兩邊 —— 看起來像三份清單，不是地圖。玩家看不出哪裡要選路。

**重畫時的硬規則：**

1. **連線要照下面那張拓樸表**，不要自己排成一排。
2. **末端（dead end）只准接一條線** —— 畫面上要看得出「那條路到底了」。
3. **樞紐要接三～四條線**，而且方向要散開（不是左右一直線）。
4. **環路要看得出是環**（走一圈回到原點），不要畫成兩條平行線。
5. 位置可以為了構圖挪，但**連線關係一個都不能改**。

## 木雅克神殿 `map_shinier_ruins`（重畫）

⚠⚠ **只用 `Ruins_shinier_*` 那 18 個場景**（Ray：「不是所有 ruin 都是木雅克神殿，
只有 ruin_shinier 才是」）。第一版畫進去的 Rotunda／Observatory／Throne／Vault／
Spring／Sarcophagus／PillarHall／Guardians／Ritual／Flooded／MuralGallery／StairDown
**沒有 shinier 前綴 ＝ 別座遺跡的素材，不要畫**。

入口（Entrance）畫在圖上當起點，但它是**夏爾森林的「遺跡入口」那一格**，不是神殿的節點。

### 三層（照美術交件的光源分，畫面的光要跟著換）

| 層 | 光源 | 場景 |
|---|---|---|
| 上層・地表 | 天光（有四時段差分） | Antechamber, CorridorA, CorridorB, Collapsed, Bridge |
| 中層・火與骨 | 長明火／符文 | StairUp, Catacomb, Prison, Mural, Machine, Colossus, Well, DarkBridge, StairDeep |
| 深層・苔光 | 發光苔 | Rift, MossChamber, DeepSpring, DeepAltar |

### ⚠⚠⚠ 下面這張拓樸表已作廢，**不要照它畫**（2026-09-07）

**神殿的地圖設計 Ray 收回去自己做了**（原話：「算了，給你設計這個根本浪費資源，
我自己來」）。在他把新的定案交下來、程式端把 `script/town.js` 的
`shinier_ruins.nodes` 接好之前，**美術不要再產任何一版神殿地圖** —— 節點與連線
還在動，畫了就是白畫。

作廢的經過（三版，兩週內連改）：

| 版 | 誰改的 | 為什麼 |
|---|---|---|
| 18 格（下表） | 我 | 已交件，見「進度」 |
| 21 格 A 案 | 程式端 ver -902 | `Bridge` 與 `StairUp` 兩端都掛 `up`，一直按同一個方向會在兩格之間彈（Ray：「單向一直走變成無法走出的迴圈」） |
| 21 格 B 案 | 程式端 ver -903 | Ray：「根本一直線」，形狀整個重排（環①移到上層、環②橫跨中～深七格） |
| — | **Ray 自己接手** | 停在這裡 |

⚠ **教訓：地圖的拓樸不是美術的東西，是遊戲設計的東西。** 我照著程式端寄來的
拓樸排了佈局圖、準備產圖，而那份拓樸在我畫的期間就已經被改掉兩次 ——
**拓樸沒有定案就不要開始畫**，因為地圖的每一筆線都是拓樸的函數，改一條線
＝整張重畫。等 `script/town.js` 裡真的接好、走得通了，再拿那一份當規格。

### 拓樸（⚠ 這是 18 格那一版的，已作廢，只留作紀錄）

    Entrance — Antechamber                （自夏爾森林進來）

    上層（Antechamber 一進門就分兩條，在 CorridorB 會合＝環路）
      Antechamber — CorridorA
      Antechamber — Collapsed
      CorridorA   — CorridorB
      Collapsed   — CorridorB
      CorridorB   — Bridge
      Bridge      — StairUp                （虛線：下到中層）

    中層（Catacomb／Mural／Colossus 三角環路，四個末端掛在上面）
      StairUp   — Catacomb
      Catacomb  — Prison        ← 末端
      Catacomb  — Mural
      Catacomb  — Colossus
      Mural     — Machine       ← 末端
      Mural     — DarkBridge    ← 末端
      Mural     — Colossus                 （環路合攏）
      Colossus  — Well          ← 末端
      Colossus  — StairDeep                （虛線：下到深層）

    深層（Rift 是最後一個岔口）
      StairDeep — Rift
      Rift      — MossChamber   ← 末端
      Rift      — DeepSpring    ← 末端
      Rift      — DeepAltar     ← **終點**（畫得最醒目，發光苔最密）

- **末端 6**：Prison／Machine／DarkBridge／Well／MossChamber／DeepSpring
- **樞紐 5**：CorridorB／Catacomb／Mural／Colossus／Rift
- **環路 2**：上層 Antechamber⇄CorridorA/Collapsed⇄CorridorB／中層 Catacomb⇄Mural⇄Colossus

### 每一格的辨識物（照 `_ruins_spec.md` 那張表）

Antechamber 兩側殘破石像基座／CorridorA 筆直長廊、一側崩開露出樹根／
CorridorB **三叉拱道分岔口**／Collapsed 半塌走道、只能從石堆缺口鑽過去／
Bridge 跨深淵的窄石橋／StairUp 向上石階、頂端沒入黑暗拱門／
Catacomb 滿壁骨龕的墓道／Prison 石柱柵欄、撞斷的牢門／Mural 兩壁上色壁畫、顏料剝落／
Machine 石與青銅齒輪、斷連桿／Colossus 巨大坐像、腳邊火盆／Well 深井、井壁苔光／
DarkBridge 深淵上的斷橋、垂鏈／StairDeep 向下石階、下半段苔光漸濃／
Rift 人工砌石接天然岩隙的窄道／MossChamber 滿室苔光、飄浮孢子／
DeepSpring 封閉的地下泉、苔光從池底照亮水體／DeepAltar 最深處的祭壇

## 產出後

WebP q85（**帶 alpha**）→ `resources/map/`；alpha 原 PNG → `resources/_originals/map/`。
同名覆蓋要在 `script/town.js` 的 `map.img` 掛／改 `?v=N`（§5）。
交件後由程式端量 `spots` 的比例座標。

## 進度

- [x] `map_shinierforest`（夏爾森林，10 格）—— 已上線，去白背 alpha 版 `?v=2`。
- [x] `map_ruins_shinier.webp`（木雅克神殿，18 格＋Entrance）—— **已交件**（2026-09-07）。
      · 檔名照 Ray 放的節點佈局圖 `map_ruins_shinier.png`（**不是** spec 早先寫的
        `map_shinier_ruins`）；程式端 `map.img` 還空著，接線時用這個名字。
      · 節點位置與連線 100% 照 `resources/map/map_ruins_shinier.png`（Ray 的權威佈局）：
        **一整張連續平面**，不是三條分開的紙帶。
      · 極簡鋼筆簡筆（Ray：「草草幾筆而已」）、單色褐墨、撕邊外 alpha 透明、
        只有英文極草書、無中文無圖例。1536×1024 q85。
      · 原稿：`_originals/map/map_ruins_shinier_art.png`；產線對話
        `chatgpt.com/c/6a9e5f7a-450c-83e8-a1ad-ab0f7b9c4ebd`。
      · 被退掉的兩版已進回收區（v1 一直線＋畫錯場景；v2 太細膩）。
- [x] **`map_ruins_shinier.webp` 重畫（21 格＋Entrance，ver -908 定案拓樸）—— 已交件**
      （2026-09-07）。舊的 18 格版已進回收區。

      · **拓樸是 Ray 自己排的**，程式端接進 `script/town.js` 並驗過（ver -908 / 1e68a78）。
        工單附件 `resources/map/_layout_ruins_shinier.png` ＋ `.svg`（343fc8b）——
        **那張圖是直接從 `town.js` 的資料畫出來的**，所以與程式一定一致。
        ⚠ 要再改圖一律以它為準，不要翻本檔上面那張作廢的 18 格表。
      · **樹狀，21 條邊、沒有環**（Ray 明確要的：他把原本兩條合攏邊斷掉）——
        **不要自己補一條讓它「看起來像地圖」**。
        末端 7：Well／Mural／DeepAltar(終點)／Machine／DarkBridge／DeepSpring／Rift。
        抉擇點 3：Crossway(3)／Brazier(4)／Hollow(4)；Antechamber 的第三條是通往森林。
      · 兩個改名：**火盆→養息之間（Brazier）**、**地下泉水→命之泉（DeepSpring）**。
      · 1536×1024、鋼筆簡筆、單色褐墨、撕邊外 alpha 透明（實測透明 7.2%）、
        22 個英文極草書地名、無中文、無圖例、無方位羅盤。
      · 原稿：`_originals/map/map_ruins_shinier_art_v2.png`；產線對話
        `chatgpt.com/c/6a9e974a-7308-83e8-99b6-b06f3a6de637`（**一次就過**）。
      · **交件前逐條驗過 21 條連線與 22 個節點的相對方位**（見下面那條自檢）。
      · 修掉一處：Prison 旁邊多了一顆**沒接線的孤兒墨點**（會被讀成一個沒有名字的房間），
        就地取鄰近乾淨羊皮紙補掉，沒有重生成。

### ⚠⚠ 交件前的自檢：逐條核對連線與方位（2026-09-07 立）

小地圖的錯**不會有任何錯誤訊息**，玩家只會發現「箭頭跟地圖對不上」。所以交件前要：

1. **逐條數連線**：節點數、邊數（樹狀就是 `邊＝節點−1`）、每個末端**只准接一條**、
   每個抉擇點的度數對不對。
2. **逐格核對相對方位**：A 在 B 的左邊／上面，要與 `_layout_*.png` 一致 ——
   那就是遊戲裡的按鍵方向。
3. **放大看每一顆墨點**：AI 會多畫「沒有接線的孤兒點」與「沒有名字的轉角點」。
   判準是**一個名字一顆點、一顆點至少一條線**。
   ⚠ 縮圖看不出來，要 2~3 倍裁切逐區看（同 `_ruins_spec.md` 的顆粒自檢）。
4. **數地名**：22 個要到齊、拼字要對、**一個中文字都不能有**。

<!-- 由 Ray 提供的設計文件歸檔。本區塊是歸檔時補的專案脈絡。
     ⚠ 內文原則上不改。已知的唯一例外：ver -262 依 Ray 指示把角色的西文名
       **Regine 全面更名為 Renna**（原稿寫的是 Regine，含 tier_lock.regine 等
       偽代碼識別字一併改為 renna）。除此之外一字未動。 -->

> ## ⚠ 這份是「未實裝」的規劃規格
> 與 `GAMESPEC.md`（現況實裝快照）**性質不同**，不要拿來當現行行為的依據。
> 目前程式裡**一行都還沒接**：養成層（好感度/城鎮/結局）尚未開工。
>
> ### 唯一已存在的接點
> - `state.js` 的 `currentFavor`（本輪固定 0，見 `modules/inspector.js` 檔頭註解）
> - `config.js` 的 `dialogues[rank][好感門檻]` 與 `inspectors[].portraits[好感門檻]`
>   —— 查表機制已在（`pickByThreshold`），只是門檻表目前只有 0 這一檔。
>   本規格的 tier 1..5 若要接上，是把門檻表填滿，不是另建一套。
>
> ### 監察官＝蕾娜（Ray 定案）
> **蕾娜（Renna Heisenberg）就是正式版的監察官。芙蕾雅（Freya）是暫代版。**
> 所以本文 §5 的蕾娜機制**不是新增一個角色**，是接在現行監察官那個位子上 ——
> 她已經是玩家每場結算都會見到的人（`inspectors` / 結算演出 / 載入畫面門面 /
> 教學對白 `who:inspector`），這正好對上 §5「預設對話最多的人 → 好感自然到 tier2~3」。
>
> 正名時要動的地方（角色資料已參數化，不必改程式邏輯）：
> ```
> config.js   inspectors.freya → inspectors.renna（executionLine / warnLine / dialogues 全跟著）
>             defaultInspector: 'freya' → 'renna'
>             ASSETS.inspector_freya → inspector_renna（需要新立繪，見下）
>             castTable 的 inspector.name / image
> i18n/       zh.js「芙蕾雅」· en.js「Freya」· ja.js — 三份的 inspector.name
> main.js     ✅ 已改走 defaultInspector（原本寫死 `.freya`，ver -256 修掉）
> ```
> ⛔ **卡在素材**：`resources/inspector/` 目前只有 `Freya_SI_01`。蕾娜的立繪（`Renna_SI_01`）
> 還沒有 —— 沒有它就正名，結算與載入畫面會變成沒有立繪的空框。
> 另外 §5 提到 tier3 解鎖的**眼鏡差分**，也是另一張圖。
>
> ### ⚠ 命名對照（極易混淆，動手前先看這裡）
> | 本文 | 程式裡 | 說明 |
> |---|---|---|
> | 蕾娜 / Renna Heisenberg | 芙蕾雅 / Freya（**暫代**） | 監察官。正式版就是蕾娜，見上 |
> | — | **蕾妮** / Renee | 現行搭檔（即死防禦／生命歸還）。**與「蕾娜」是不同人** |
>
> ⚠⚠ **Renna（蕾娜，監察官）與 Renee（蕾妮，搭檔）是兩個人。**
> 更名之後這兩個名字只差兩個字母、中文只差一個字，是全專案最容易寫錯的一組。
> 蕾妮已經**實裝在程式裡**（`config.js` 的 `partners.renee`、即死防禦、生命歸還、
> `Renee_CI_pas/act`、`vo_renee_*`）；蕾娜還不存在。看到 `renee` 一律是搭檔，
> 不要當成監察官順手改掉。
> | 璐娜 | Luna | 聖徒化 cut-in 的那位（`resources/partner/Luna_*`） |
> | 諾薇兒 / 安雅 / 索拉娜 | 立繪已有（`resources/partner/`），程式未接 | 身高見 `CLAUDE.md` §6.5 |
>
> ### 相關檔案
> `CLAUDE.md`（憲法）· `GAMESPEC.md`（現況實裝）· `DECISIONS.md`（架構決策）
> 本文提及的《TIVOT 分支系統設計》《TIVOT 設定補完》尚未歸檔進 repo。

---

# TIVOT 實作規格備忘（給 code）

> 精簡實作規格，非設計說明。設計理由見《TIVOT 分支系統設計》。
> 本檔涵蓋：城鎮結構、好感度/tier、結局判定、諾薇兒暴走、蕾娜機制。

---

## 1. 城鎮結構（TOWN）

### 導航樹（節點式，非走路探索；每節點一張場景圖 + 可點熱點）

```
PLAZA (廣場 / 樞紐 / 入口)
├─ INN            旅店：存檔、時間加速、(可選)私密事件      [廣場獨立按鈕，最淺]
├─ DISTRICT_ADMIN 行政區(上)  ├─ CHURCH     教堂
│                             └─ CITYHALL   市政廳
├─ DISTRICT_LEFT  生產區(左)  ├─ GUNSMITH   槍坊
│                             └─ SHOP       商店
└─ DISTRICT_RIGHT 江湖區(右)  ├─ TAVERN     酒館
                              └─ GUILD      賞金獵人公會
每個節點(含PLAZA)保留 1 個 EVENT_SLOT：放名勝/劇情事件/好感同行事件
```

### 設施功能

| 設施 | 功能 | 常駐角色 |
|---|---|---|
| INN 旅店 | 存檔、時間加速；先進功能選單(存檔/加速/離開)，有事件時選單多一個提示鈕(玩家主動選觸發，勿強制) | 私密/夜間事件場 |
| CHURCH 教堂 | (諾薇兒/蕾娜的特定事件) | Nouvelle；Renna(事件時) |
| CITYHALL 市政廳 | **蕾娜情報站主駐點**(玩家拿情報/推進蕾娜線固定來此) | Renna(主駐) |
| GUNSMITH 槍坊 | 武器打造(MH模式，收集特殊素材) | — |
| SHOP 商店 | 道具(無補血道具；賣素材/補給/好感小物，好感小物須防「用錢繞過行為」，見備註) | — |
| TAVERN 酒館 | 情報 | Sorana |
| GUILD 公會 | 支線任務 | Ann、Sorana |

### 導航規則
- PLAZA 為中央樞紐；任何設施內可一鍵回 PLAZA。
- INN(存檔)為最高頻，放 PLAZA 獨立鈕。GUNSMITH 若高頻可考慮 PLAZA 快捷。
- 場景圖數：4 張區域圖(PLAZA/ADMIN/LEFT/RIGHT，可跨城鎮換色複用) + 各設施內景 + 按需 EVENT_SLOT 圖。
- 小聚落用共通功能模板；大城/劇情城才填 EVENT_SLOT 名勝與專屬事件。

### 好感同行事件（好感度支流）
- 容器：建議用 EVENT_SLOT 觸發(與功能導航分開，勿誤觸)。
- 觸發：**有限次數/特定節點**(非每次進城無限刷)。空檔資源。
- 機制：觸發時各女角出現在不同去向/選項；玩家選 = 選同行對象 = 該角好感 +。

### 商店經濟備註
- 本作無補血道具(靠技術不靠消耗品)。
- 錢的出入待定：主要疑似 GUNSMITH 打造 + 飛船維護。定案後 SHOP 內容才定。
- 好感小物：勿做成「花錢刷好感」。建議：小幅、有上限、或「送對才加(懂不懂她的測驗，尤其蕾娜)」。

---

## 2. 好感度 / Tier 系統（AFFECTION）

### 資料
```
affection[char]  # 連續值, 範圍 1..50, 可增可減
tier[char]       # = floor((affection[char]-1)/10)+1  → 1..5  (每10一級)
tier_lock[char]  # 棘輪底線: 已達到過的最高 tier, 只升不降
```

### Tier 定義
| tier | affection | 關係 |
|---|---|---|
| 1 | 1–10  | 同行 |
| 2 | 11–20 | 朋友 |
| 3 | 21–30 | 摯友 |
| 4 | 31–40 | 羈絆 |
| 5 | 41–50 | 愛 |

### 棘輪（封頂不降）
```
on affection change:
    new_tier = tier_of(affection[char])
    tier_lock[char] = max(tier_lock[char], new_tier)
    # affection 可跌，但不可跌破 tier_lock 對應區間的底
    floor_val = (tier_lock[char]-1)*10 + 1
    affection[char] = max(affection[char], floor_val)
```

### 判定用哪個值
- **結局/分歧資格判定** → 用 `tier_lock`(曾達到的最高 tier，保底)。
- **即時行為反饋**(如榨諾薇兒→蕾娜卡住) → 影響當前 `affection` / 通往下一 tier 進度。

### 四條軸
`affection.novel` / `affection.ann` / `affection.sorana` / `affection.renna`
互相獨立。角色反應只讀自己那條。

### 角色關鍵門檻（tier_lock）
```
ANN(安雅):     存活 = tier4;  單人HE(紫月) = tier5   # 未達tier4 → 覺醒BOSS死
SORANA(索拉娜): 留下 = tier4;  單人HE(懷孕) = tier5   # 未達tier4 → 離隊結局(ending非gameover)
NOVEL(諾薇兒):  單人HE(結婚) = tier5                   # 暴走另見獨立機制
RENNA(蕾娜):  展開諾薇兒說明/觸發挑戰璐娜 = tier4; 覆蓋三女主/真結局 = tier5
HE入場券 = tier4; 單人/真結局 = tier5
```

### 稱呼系統（可選：親密度可視化）
- Renna 正式名 `Renna Heisenberg`；暱稱 `蕾娜`。
- 初期玩家/NPC 稱「監察官/Renna」；達某 tier 解鎖稱「蕾娜」(可做成一個事件)。
- 類似：Renna 眼鏡差分 = tier3 解鎖(主角面前/私下戴，公開不戴)。

---

## 3. 結局判定（ENDING）

### 執行時機
- **主結算點 = 安雅戰後**(終戰BOSS=覺醒的安雅)。一次性讀 tier_lock + flags，按優先級匹配。
- 諾薇兒暴走(見§4)為全程後台，命中則 BE1 gameover，走不到此結算點。
- 索拉娜離隊(未達tier4)為 ending，非中途 gameover。

### 判定偽代碼（優先級由上而下）
```
# --- 前置(過程中，非結算點) ---
if novel_berserk_triggered:        → BE1 (gameover, 中途結束)   # 見§4
if tier_lock.sorana < 4:           sorana_left = true           # 影響下方後宮/單人

# --- 最終結算(安雅戰後) ---
if tier_lock.ann < 4:
    # 安雅死 (覺醒BOSS被戰勝) → BE2, ending
    → BE2 (安雅死)
    # 收尾按 tier 覆寫最後一幕(見下 BE2_outro)
else:
    # 安雅存活
    if tier_lock.renna >= 5:
        → HE4 蕾娜線 (強制覆蓋三女主)
        # 第一輪: 告白→流淚→分道揚鑣
        # 第二輪(見§5): 關鍵道具開場tier3 + 再告白 + 格里芬戰勝第一階段 → 真結局→索拉娜遠望收尾
    elif tier_lock.renna == 4 and challenged_luna and not luna_challenge_passed_to_5:
        → BE4 (諾薇兒被銷毀)   # tier4觸發挑戰璐娜，未達tier5
    elif tier_lock.novel>=5 and tier_lock.ann>=5 and tier_lock.sorana>=5:
        → HE5 後宮 (綠月)       # 三伙伴皆tier5, renna未達5
    elif exactly_one_of(novel,ann,sorana) reaches tier5 (renna<5):
        → 該角單人HE            # HE1索拉娜懷孕 / HE2安雅紫月 / HE3諾薇兒結婚
    elif multiple reach tier5:
        → resolve_by_keyevents() # 見下「同級競合」
    else:
        → BE3 各奔東西          # 安雅存活但無人達tier5 (且renna<4)
```

### BE2 收尾覆寫（ending 原則：故事走完須結算關係）
```
BE2_outro:  # 安雅死，主體共通，最後一幕按最高tier角色覆寫
    if tier_lock.renna >= 4: 播 蕾娜苦味收尾(沉默/一句別人聽不到的話)
    elif tier_lock.novel high: 播 諾薇兒收尾
    elif tier_lock.sorana high: 播 索拉娜收尾
    else: 併入 BE3 各奔東西通用收尾
```

### 同級競合裁決（多人 tier5，renna<5）
```
resolve_by_keyevents():
    # 不比 affection 數值(可能同級)
    1. 比各角 key_event 完成數量 / 特定 key_event 是否成立
    2. key_event 可複數角色同時成立 → 若三人皆成立 = 後宮(HE5)
    3. 平手 → 比 CG 收集率
    # 不存在「留兩個走一個」: 要嘛選一個(單人)，要嘛三個全拿(後宮)
```

### 信物伏筆（跨結局道具，必要前置，勿漏）
```
FLAG: sorana_gave_token   # 索拉娜給主角信物, 某好感節點觸發, 無論走哪線都會發生
歸宿:
    HE1(選索拉娜):   信物留在兩人家庭
    蕾娜真結局:      信物戴在 主角×蕾娜 的孩子身上 → 索拉娜遠望收尾的核心道具
```

### 結局清單速查
| id | 條件摘要 | 類型 |
|---|---|---|
| BE1 | 諾薇兒暴走命中(§4) | gameover |
| BE2 | ann tier<4 (安雅死) | ending(收尾覆寫) |
| BE3 | 安雅存活+無人tier5+renna<4 | ending |
| BE4 | 安雅存活+renna tier4挑戰璐娜+未達tier5 | ending(諾薇兒銷毀) |
| 離隊 | sorana tier<4 | ending(非gameover) |
| HE1 | 安雅存活+sorana tier5(其他未突出) | 懷孕 |
| HE2 | 安雅存活+ann tier5(其他未突出) | 紫月 |
| HE3 | 安雅存活+novel tier5(其他未突出) | 結婚 |
| HE4 | 安雅存活+renna tier5 | 蕾娜線(覆蓋三女主) |
| HE5 | 安雅存活+三伙伴皆tier5(renna<5) | 後宮 |

---

## 4. 諾薇兒暴走（NOVEL_BERSERK，獨立風險系統）

**與好感度/結局正交。必然在戰鬥中發生，不在劇情中。命中 = BE1 gameover。**

### 資料
```
novel_load          # 算力負載, 隨聖徒化使用累積
novel_diff          # 立繪差分: normal(<50) / pain(>=50, 隨暴走率分級)
berserk_prob        # 暴走機率, 累積、疊加不歸零
```

### 狀態閾值
```
load < 50 : normal 差分, 安全
load >= 50: pain 差分(視覺預警); 戰鬥中觸發→強制下線, 需降至 40 才復歸
load >= 51: 開始累積 berserk_prob
```

### 核心不對稱
```
# 優勢: 累進、永不降
combat_bonus += f(pain持續時間)   # 諾薇兒越痛→bonus越高, 且不減

# 暴走機率: 可降但疊加不歸零
berserk_prob += g(pain持續時間, 累積次數)   # ∝ 維持痛苦時間
```

### 決算
```
on novel saint_install (load>=51):
    berserk_prob += g(...)
    if roll() < berserk_prob:
        → BE1 (gameover, 不可撤銷)

on N battles without novel deployed:
    novel_load 下降   # 降至40恢復normal差分
    berserk_prob 當前值下降   # 但歷史疊加保留(再過50從上次值續疊)
```

### 戰後模組（本場 load 到過50則播）
```
探望諾薇兒 → 諾薇兒:「有點累，沒事」(絕不喊苦)
→ 蕾娜反應(覆寫, 見§5): 沉默 / 「等等來找我。」
```

### 工程注意
- **SAVE SCUMMING(生死線)**：暴走 roll 結果須與存檔種子綁定(讀檔後同場同時機結果不變)，否則機制崩潰。
- pain 差分隨 berserk_prob 分級(皺眉→冷汗→顫抖→瀕臨崩潰)，作為玩家可讀的危險儀表板。

---

## 5. 蕾娜機制（RENNA）

### 5.0 背景（已定）
- 本名 `Renna Heisenberg`，暱稱蕾娜。海森伯格侯爵（帝國武人勳爵，第二部東方司令部指揮官）之女。
- **嫡女（正室之女，身分正當）。血緣之謎永不展開：**
  - 侯爵黑髮、夫人金髮 → 生出金髮女兒，機率不高但可能。「說得通，但不好說」。
  - 侯爵常年征戰在外（不在場）→ 金髮疑點滋生 → 她不受待見 → **從小被藏進修道院**（故自然進入教廷體系，非刻意安插的間諜）。
  - 疑點**永不證實/證偽**（也許親生，也許不是，連她自己不知道）。這是她測不準、討喜求生、經營美貌之倔強的根源。
  - 璐娜「沒想到那老狐狸能生出妳這等美人」的遲疑 = 黑髮家族/金髮女兒的血緣問號，永成立永不解。
- **不是被派來的間諜**，是被家族放逐、在教廷長大的孩子（比孤兒多一層「有家族卻不被要」的傷）。
- 側室設定廢棄。金髮 = 視覺上永遠可見的傷疤（她最美的地方正是她一生痛苦的源頭）。

### 好感累積：情報站
- 蕾娜=情報站(監察官/知情者)，主駐 CITYHALL。玩家為拿情報頻繁對話 → 預設對話最多的人 → affection 自然到 tier2~3。
- **tier3→tier4 需特殊事件**(自然對話封頂 tier3；跨羈絆要契機)。→ 多數玩家停在 tier3「摯友陷阱」不自知。

### 蕾娜好感不影響其他 HE
- 其他三線 HE 不需要 renna 好感。無蕾娜提示，玩家仍能靠自察走到別人的 HE。
- 三角提醒(§下)中蕾娜的說明是「幫助」非「必要」。

### 差分 / 稱呼（親密可視化）
```
tier3: 解鎖 眼鏡差分(主角面前/私下戴, 公開不戴); 解鎖 暱稱「蕾娜」(可做事件)
```

### 三角提醒（諾薇兒暴走的資訊）
```
諾薇兒到50 → 主角(玩家)察覺異狀(看到pain差分) → 可主動找蕾娜
蕾娜信號: 「……」(暗示來問) 或 戰後「等等來找我。」
玩家問蕾娜:
    if tier_lock.renna < 4: 回「讓她多休息吧。」   (不展開)
    else(tier4+):            展開說明(暴走風險/規則/如何管理)
道德閘門:
    聽勸(諾薇兒未恢復40前不派) → renna 好感可漲
    無視(痛苦時續派)          → renna 好感卡住
    差分恢復(40)後派          → 不影響
註: 諾薇兒不會怪你(越用越愛你、絕不喊苦); 唯一因你榨她而扣分的是蕾娜。
```

### T4+ 吃醋 / 曖昧（索拉娜火藥）
```
tier4+ renna:
    對主角與他人互動吃味 → 扭頭就走(不明說, 玩家自行讀)
    主角與他角曖昧事件後告知 → 蕾娜不安
索拉娜火藥(助攻):
    sorana tier5 → 直接求愛(主動、公開、藏不住)
    → 刺激蕾娜 → 蕾娜心意動搖鬆動 → 推進 renna 好感/事件(嫉妒使她更快面對自己的愛)
    → 蕾娜不是聖人(有慾望佔有欲); 主角只能從她的「動搖」猜心思(呼應零心之聲/測不準)
    → 機制應由玩家自行發現, 非遊戲明示(保索拉娜純粹)
```

### 告白 / 兩輪 / 真結局
```
告白事件: 蕾娜只流淚, 然後假裝什麼都沒發生 → 好感上 tier5
第一輪: tier5也只到 HE4 分道揚鑣(求不得, 無圓滿結局)
第二輪: 開場多一件關鍵道具 → 蕾娜開場 affection=tier3
        再告白 + 格里芬戰勝第一階段 → 真結局
        → 真結局收尾: 多年後索拉娜見到 神似蕾娜的小女孩(=蕾娜×主角的孩子, 帶索拉娜當年的信物)
                     → 索拉娜「帶淚的溫柔遠望笑容」, end
        (此收尾專屬第二輪真結局; 第一輪HE4無此幕)
```

### 格里芬戰（結局分野）
```
其他HE: 格里芬戰可敗(劇情接管脫身/被成全)
蕾娜HE: 須戰勝格里芬「第一階段」(證明有資格為她一戰)
        格里芬戰前設存檔點; 敗可重試
```

---

## 6. 待定（尚未定案，勿臆造）

```
- 分歧點1/2/3 的位置與門檻(落到具體幕次)
- 好感度加減規則表(每個選擇/行為 +/- 哪條軸 多少)
- key_event 清單(各角關鍵事件, 標可複數成立者)
- SHOP 內容(待「錢的出入」定案)
- 「……」信號: 諾薇兒到50主動彈出 vs 玩家問時才給
- 蕾娜背景已定, 見§5.0(血緣永不展開)
- 蕾娜第二輪「解除枷鎖」的枷鎖具體為何(非家族使命; 或職務/自我囚禁/不信自己配幸福, 待定)
- 蕾娜HE條件滿足但格里芬第一階段未過之處理(可重試; 放棄則落某ending)
```

---

*配套設計說明見《TIVOT 分支系統設計》；角色/世界觀見《TIVOT 設定補完》。*

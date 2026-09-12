# HANDOFF — ver -1127〜-1143（2026-09-12）／七件修正・戰鬥紀錄・伊甸古墓・禁航區

> **HEAD ＝ `ver 2026.09.12-1143`**（`config.js` 的 `VERSION`）。
> 前一份是 `HANDOFF_ver971-995.md`（-971〜-995），**它的第 7、8 節（環境備忘／
> 搭檔煙霧測試）仍然有效**，本檔不重抄，改過 `partner`／`saint` 之後照樣要跑那一支。
>
> ⚠⚠⚠ **這一輪有三條規則被推翻、一條新的建置步驟**（第 2、3 節）。動任何一支檔案
> 之前先看那兩節 —— 舊註解會騙人。

---

## 0. 版本 → 動了哪幾支檔案（**重讀清單**，鐵律 11）

| 版本 | 主題 | 動到的檔案 |
|---|---|---|
| `-1127` | Ray 的七件一次修（教學搭檔／打靶不評／索敵誤觸／聖徒 ovk 殘格／墓地無夥伴…） | `config.js` `state.js` `style.css` `index.html` `flight/index.html` `modules/{combat,weapon,partner,story}.js` |
| `-1128` | 「評價完全消失」的診斷：HUD 多一行＋抓「是誰蓋住它」 | `config.js` `style.css` `index.html` `main.js` `modules/inspector.js` |
| `-1129` | 賞金獵人 stage0/1 不評（-756 那條加回來；**-1130 又被收斂掉**） | `config.js` `modules/inspector.js` |
| `-1130` | **第 1 章起除打靶外每場必評**（全域一條線） | `config.js` `modules/inspector.js` `script/evaluation.js` |
| `-1131` | **importmap 快取破除**＋`tools/bust.py` | `config.js` `index.html` `flight/index.html` `main.js` `tools/{bust,script_lint}.py` |
| `-1132` | 控制面板不算飛行窗／索敵與生怪推到第 8 章 | `config.js` `index.html` `flight/index.html` |
| `-1133` | **女主的星改用《戰鬥紀錄》點亮**（逐角色）／EXP 正名 | `config.js` `style.css` `index.html` `flight/index.html` `i18n/{zh,en,ja}.js` `modules/{gear,inspector}.js` `script/{inventory,progress}.js` |
| `-1134` | **伊甸古墓**接上（(735,196) 降落點＋34 格樹狀迷宮） | `config.js` `index.html` `flight/{index.html,export_mapref.py}` `script/town.js` `tools/{map_layout,script_lint}.py` `resources/map/_tomb_spec.md` `_layout_tomb.png` |
| `-1135` | **死亡回到上一個安全點／結算點**＋掉一半戰鬥紀錄（等級棘輪） | `config.js` `state.js` `index.html` `flight/index.html` `main.js` `modules/{combat,inspector,town}.js` `script/progress.js` |
| `-1136`〜`-1139` | **禁航區**（空氣牆／自動轉舵／蕾娜三句／地圖紅罩）　⚠ -1137・-1138 是中途版號，一起併進 -1139 那一筆 | `config.js` `index.html` `flight/index.html` |
| `-1140` | 伊甸古墓背景 40 張交件 → 拔掉 34 個 `bgPending` | `config.js` `index.html` `script/town.js` |
| `-1141` | `map_layout.py` 的 tomb 版面註解對回被回收的草圖工具（純註解） | `tools/map_layout.py` |
| `-1142` | **墓門的「關著」狀態**（`bgWhen` 加 `not:`） | `config.js` `index.html` `flight/index.html` `modules/town.js` `script/town.js` |
| `-1143` | 記下 `tomb_opened` 的擁有事件（純註解） | `config.js` `index.html` `flight/index.html` `script/town.js` |

⚠ `config.js`／`index.html`／`flight/index.html` 幾乎每一版都在清單裡，因為**版號與
快取戳記**在那三支（見第 3 節）——看 diff 時先跳過那三行再看內容。

---

## 1. 這一輪的成果（四句話）

1. **玩家的四個新機制**：星要花《戰鬥紀錄》點亮／死亡回安全點且掉一半紀錄／
   四國禁航區有空氣牆／伊甸古墓（34 格迷宮）可以降落探索。
2. **評價收斂成一條線**：第 1 章起除打靶外每場必評（旗標與名單全部退場）。
3. **建置多一個步驟**：改完程式要跑 `python3 tools/bust.py`（見第 3 節）。
4. 七件回報全修掉，其中「手機上評價完全消失」是**規格疊出來的**不是壞掉（見第 4 節）。

---

## 2. **被推翻的舊規則**（舊註解會騙人）

| 舊規則 | 現在 | 版本 |
|---|---|---|
| 女主等級到了**自動亮星**（`girlBonus` 加 Lv1~現級） | **只加已點亮的星**；亮星要花《她的戰鬥紀錄》（升一級產一份） | `-1133` |
| 戰敗（遭遇戰）回**這張地圖的入口**（`noJump`＋明指節點） | **讀最新的檢查點**（位置也跟著快照走）＝上一個踩過的安全點／結算點 | `-1135` |
| 打靶**有**評價（-1060 撤掉 `noEval`） | 打靶三場一律 `noEval`；評價改由 `evaluation.js` 的 `FROM_STAGE=1` 全域控制 | `-1127`／`-1130` |
| 索敵／加速／掃描從 **stage 7** 開 | **stage 8**；試飛（沒有章節鑰匙）不受限 | `-1132` |
| 長按天空生怪只看 `ADMIN` | 還要 `featureOn('sense')`，而且**控制面板（含伸進窗裡的方向計與舵輪）不算天空** | `-1132` |
| 安全點（`{settle:true}`）**不落**檢查點 | 與「有戰鬥的段落」同等對待，會落 | `-1135` |

---

## 3. ⚠⚠ 新的建置步驟：`tools/bust.py`（**忘了跑＝玩家拿到舊 JS**）

`index.html` 現在掛一張 **importmap**，把 39 支模組指到「同一支 ＋ `?v=<版號>`」。
版號的唯一真相是 `config.js` 的 `VERSION`，同步靠：

```bash
python3 tools/bust.py          # 改完 VERSION 之後跑這一支
python3 tools/bust.py --check  # 只檢查（script_lint.py 每次也會順手檢查）
```

- 入口那兩支（`main.js`／`orientation.js`）是 `<script src>`，吃不到 importmap，
  由工具直接改 `src`。飛行頁是另一個 document：iframe 的 `src` 由 `main.js` 讀
  `VERSION` 現組（`FLIGHT_SRC`），它自己那三支 `<script src>` 由工具改。
- **症狀**：沒跑的話 lint 會多一條提醒；真的漏掉就是「我改好了他手機上還是舊行為」。

---

## 4. 刻意如此、**不要「修好」它**的四件事

1. **第 0 章沒有任何評價**（`evaluation.js` 的 `FROM_STAGE=1`），而第 0/1 章的帝都
   只有打靶（`noEval`）與賞金獵人兩場 —— 那一段「看不到評價」是規格疊出來的。
2. **墓門現在一律是關的**（`tomb_opened` 沒有人插），而關著那張圖還沒交，
   所以畫面上暫時**退回開著那張** —— 候選鏈的退路，不是壞掉。
3. **禁航掉頭是在對白收掉之後才開始轉**：ver -481 定的「對白播放中整個世界暫停」
   還在。要「一邊講一邊轉」得把禁航排除在那個暫停之外，**Ray 還沒說要**。
4. **`TOWNS.tomb` 沒有 `map:`**：小地圖的座標兩邊都量不出來（見第 5 節）。

---

## 5. 等別人的（**不要自己動手**）

| 事 | 卡在誰 | 備註 |
|---|---|---|
| 伊甸古墓的小地圖（圖＋`_spots_tomb.json`） | 美術 session（`tivot-a3`） | 他們寫好了合成器 `tools/map_compose.py`（spots 由 `map_layout.py` 的版面**算**出來），卡在 chatgpt.com 的下載確認框。**兩個檔一起收**，不要拿現在 repo 裡那張舊圖配新座標 |
| 伊甸古墓的 12 隻怪 | 同上 | 同一個下載問題 |
| `Tomb_Gate_Sealed_{dawn,day,dusk,night}` | 同上 | 需求已發：同構圖同機位同光，只有門扇完全閉合 |
| `tomb_opened` 誰插 | Ray 的劇本 | 條件已定：**另一座遺跡啟動才會開**。⚠ 現有的遺跡啟動旗有兩支（`ruins_altar_on`／`ruins_gate_open`），**不要發明第三支**，直接在那一段收尾加 `flags:['tomb_opened']` |
| `girls.recordPerLevel` / `starCost` | Ray | 我填的是草案（1 與 `[1,1,2,2,3,3,4,4,5]`）：九級只產 9 份、全點要 23 份 ⇒ **點不滿，要選**。要「練滿能全點」把 `recordPerLevel` 調到 3 |
| 門關著要不要**走不進去** | Ray | 現在照樣走得進去（他只要了一張圖） |

---

## 6. 這一輪踩到的坑（逐字遵守）

1. **`?v=` 只保護 CSS 是不夠的** —— 模組的網址一版不變，iOS「加到主畫面」那個
   webview 會抱著舊 JS 不放，而且**沒有任何錯誤訊息**。（→ 第 3 節）
2. **「畫面上看不見」不要用猜的** —— 問 `document.elementFromPoint` 誰在上面。
   -1128 的看門狗當場抓到 `#assetLoader`（讀取頁沒點掉）與 `#startBtn`（首頁還開著）。
3. **可見性不可以由動畫決定**：`opacity:0` 基底 ＋ `animation ... both/forwards`
   ＝ 動畫沒套到就永遠透明。基底要是「看得見的樣子」，動畫只負責怎麼出現。
4. **`_lootHold` 那條規矩只寫了一半**（-961 只擋亂入那一句）：結算頁一開，下一次
   點擊就彈戰利品、確認完還會自動離場 —— 評價要 1.1 秒才出框。已補成「有人要講話
   就押著」。
5. **CSS 權重**：狀態類（`.done`／`.next`）要比模式類（`.saint`／`.overkill`）**多一級**，
   不然模式一疊上去就把狀態洗掉（-684 與 -1127 是同一種病）。
6. **飛行頁測試**：`document.hidden` 時 rAF 整個停 —— 在背景分頁量到的「船不動」
   是假象。要逐幀資料就**在頁內裝 rAF 記錄器**，一次讀回來（外部逐次 `eval` 會
   把節奏打散）。另外 `takeoffPlaying` 期間 `update()` 不跑，等 `clock.dist>0` 才算起飛完。
7. **小地圖的墨點不是每格一顆**（有些是連線接點、有些與圖示黏在一起）——
   「偵測墨點 → 配回節點」這條路在伊甸古墓上不成立。合成才是正解。

---

## 7. 環境備忘／快速測法

**沿用 `HANDOFF_ver971-995.md` 的第 7、8 節**（jsc 路徑、資源路徑自檢、戰鬥類交給 Ray、
搭檔模組煙霧測試）。這一輪再補三條：

- 改完程式：`python3 tools/bust.py` → `python3 tools/script_lint.py`（0 錯誤才算完）。
- 飛行頁語法檢查：把 HTML 註解剝掉、抽出非 module 的 `<script>` 存成 `/tmp/fl_check.js`
  再 `jsc` 跑它；看到 `Can't find variable: Image` ＝ **語法沒問題**。
- 瀏覽器實測前先 `fetch(路徑,{cache:'reload'})` 再 `location.reload()`；
  **開機讀取頁一定要用真的 `computer.left_click` 點掉**（程式化 `click()` 點不掉）。

# HANDOFF — 截至 `ver 2026.09.15-1326`

> 這一份是**唯一**的交接檔。**下一次交接請直接改這一份，不要再開新檔。**
>
> ⚠⚠⚠ **寫進這裡的每一條都要當場驗過**（ver -1291 的教訓）：交接檔曾經把
> 已經被 revert 掉的東西寫成現況，於是下一個 session 照著它做了錯的判斷。
> **沒有 `grep` 過、沒有量過的事實不要寫。**
>
> ⚠⚠⚠ **-1306 這一輪是「換機器前的最後一版」** —— 下面第零節整節是
> **舊機器（Windows / GT 1030）**的數字。**新機器一律重量，不要繼承。**
> （-1303 已經因為繼承舊數字錯過一次：上一份寫 `_originals` 2.6 GB，
> 實測 61 MB。）

---

# 最新這一輪（-1326）：驗收工具在 Windows 上全部復活

> ⚠ 這一輪**沒有動遊戲程式**，只動 `tools/`（外加 `config.js` 的 `VERSION`
> 與 bust 產生的三處版本號）。遊戲行為一個字都沒變。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

| 版 | 檔案 |
|---|---|
| -1326 | `tools/*.py`（28 支各加一行 import）、**新** `tools/_utf8.py`／`_jsrun.py`／`_font.py` |
| -1326 | `config.js`（VERSION）、`index.html`／`flight/index.html`／`modules/story.js`（bust 產生） |
| 憲法 | `CLAUDE.md` §6.5.4（「Windows 上跑不了」那一句已作廢） |

## 問題是什麼

**這台機器（Windows）上，`tools/` 幾乎整層跑不動**，而其中好幾支是憲法指定的驗收：

| 病 | 中招 | 代表 |
|---|---|---|
| 主控台 cp950，印到第一個 ⚠ 就 `UnicodeEncodeError` | **22 支** | `bust.py --check`（§5 的快取驗收）崩在印訊息那一行，看起來像工具本身壞了 |
| 寫死 macOS 的 `jsc` | **7 支** | `script_lint.py`（§6.5.1「稿子轉完一定要跑」）、`map_layout.py`（§6.7.5「回給美術的佈局簡圖只能用它產」） |
| 寫死 macOS 的字型路徑 | **6 支** | 畫圖那一族 `OSError: cannot open resource` |

⚠⚠ 所以 §6.5.1／§6.7.5 那兩道「一定要跑」的驗收，**在唯一會用到它們的機器上一直是空的**。

## 修法（三支共用檔，鐵律 7／8：一件事一個實作）

- **`tools/_utf8.py`** —— 主控台強制 UTF-8。28 支各加一行 import，不是 22 個地方各貼三行。
- **`tools/_jsrun.py`** —— 把專案裡的 JS 資料真的跑一次再 dump 成 JSON，唯一一支。
  **有 jsc 用 jsc（macOS），沒有就用 node**（PATH 上有就認得，不必設定）。
  · jsc 有內建 `print()`、node 沒有 ⇒ node 那條注入一行 shim，**呼叫端照舊寫 `print`**。
  · ⚠ 一律走暫存檔不用 `-e`：Windows 命令列上限約 32 KB，而餵進去的常常是整支
    `town.js`／`config.js`（數百 KB）。
  · ⚠ `file_url()`：node 的 ESM 不吃 `C:\...` 絕對路徑（當成套件名）—— macOS 的
    `/a/b.js` 剛好長得像相對路徑，所以以前沒露餡。
  · ⚠ subprocess 要明寫 `encoding='utf-8'`：`text=True` 走 locale 編碼，而 dump 出來
    整份是中文 —— 不寫的症狀是「讀不到資料」不是編碼錯誤，會害人查錯方向。
- **`tools/_font.py`** —— 字型候選由上往下取第一個存在的（macOS→Windows→Linux）。
  **macOS 的行為一個字沒變。** ⚠ `.ttc` 的 index 是字重、逐字型不同
  （PingFang 的 4 ≠ 微軟正黑的 4）⇒ 收 `weight` 參數，對不到退回 0，不要炸掉。

## 這一輪量到的（都是當場跑的）

| 項 | 結果 |
|---|---|
| `script_lint.py` | **0 個錯誤、17 個提醒**（首次在 Windows 上跑得動） |
| 　└ 負向測試 | 故意寫壞的檔報得出 `script/broken.js:5` —— **行號對得回原檔** |
| `bust.py --check` | 先前崩潰 → 現在正常回報；順手清掉走鐘（檔案 `?v=1324` vs config -1325） |
| `map_layout.py` | 三張圖都出得來（shinier_ruins 21 格/20 邊、shinier 13、northport 13），繁體中文正常 |
| `enemies_xlsx` | 57 張卡／ASSETS 238 筆／HITFX 讀得到 |
| `ruin_elevation`／`ruin_heightmap` | 跑完，最高 **302 單位**＝§6.8.1 記的那個數字 |
| `tools/*.py` 語法 | 33 支，0 錯 |

## 這台機器的工具鏈（-1326 當場確認，第零節那張表的 ③）

| 項 | 實測 |
|---|---|
| Python | ⚠ **仍然只有 `py`**（`python`／`python3` 不存在）—— 與舊機一樣 |
| 版本 | Python **3.10.0** |
| node | **v24.19.0** 在 PATH 上 ⇒ `_jsrun` 走 node 那條 |
| 主控台 | **cp950**（所以才需要 `_utf8`） |
| 中文字型 | `C:/Windows/Fonts/msjh.ttc`（微軟正黑，繁體）⇒ `_font.cjk()` 取到它 |
| 缺的套件 | `openpyxl`（只有出 xlsx 那兩支要） |

⚠ **文件裡的 `python3 tools/xxx.py` 在這台機器要唸成 `py tools/xxx.py`。**

⚠ `enemies_xlsx export` 另缺 **openpyxl**（沒裝，與這一版無關）。要出表先 `py -m pip install openpyxl`。

## 這一輪**沒有**碰的

- 產生的圖檔（`_layout_*.png`／`belisar_*`）跑完都**還原**了 —— 那些是工具隨時重跑得出來的產物。
- 遊戲程式、資料、素材：一個字都沒動。

## 還沒做（程式端）

1. ~~無尾綴舊檔退役（`East_*.webp`）~~ → **已經做掉了**（-1319 的 `1203f29`
   「回收 9 個重複檔」，`ls` 確認過那七張不在了）。
2. **`Ravn_Church`**：圖**還沒交**（`ls resources/background | grep Ravn_Church` 是空的），
   節點仍是 `bg:'Ravn_Midtown'` ＋ `bgPending:'Ravn_Church'`。圖到了才改 `bg`、
   拔 `bgPending`、**補回 `noTime:true`**。
3. **兩支音檔交了但從來沒接上**（`script_lint` 報的，-922 入庫至今）：
   · `resources/audio/se/se_cannonslide.mp3`（⚠ 還是 `.mp3`，§6.6 規約是 m4a）
   · `resources/audio/bgm/Peritune_Mystic_Tides_loop.m4a`
   兩支**全專案零引用**，是木雅克神殿那一批的素材。**要接在哪一拍是 Ray 的決定**，
   不要自己發明用途；接的時候別忘了補 `tuning.fileGain` 那一列（§6.6）。
4. 原「接下來的事項」第 5／7／8／11 項**照舊等 Ray**（貝利薩爾降落旗、山谷敵人卡、
   瓦努努 Boss 卡、ImageBitmap 要不要入憲）。

---

# 上一輪（-1319 ~ -1325）：以下照 commit 訊息整理，**我沒有逐項複驗**

- -1319　標記點進地圖編輯器；教學期間連鍵盤都不給操船
- -1320　無名遺蹟＝瓦努努（兩筆併一筆、接上地圖內容與地表量體）
- -1321　讀取間隙不再露出首頁與挑戰立繪／**憲法鐵律 11 改寫**（美術 session 被下 code 指令要**拒絕**）
- -1322　遺蹟掃到才出現，而且是淡入
- -1323　攝政王廣場五張重畫；主角的空白格換成冷鋼藍
- -1324　遊戲起始時間改成 **1908 年 10 月 11 日**
- -1325　雪都三格重修 12 張（清掉輕軌與架空線）
- 憲法另加：§5 產圖第五條鐵則（模型會「越塞越多東西」）、銀月大陸只有一輪銀月

---

# 再上一輪（-1309 ~ -1318）：飛行地圖撕裂、開機量、東泊接線

> ⚠ 這一輪跑在**新機器**（RTX 4070 SUPER / 2560×1440）。第零節那些是**舊機器**的數字，
> 兩者不要混用。

## 動了哪幾支檔（給美術 session 自保用，鐵律 11）

| 版 | 檔案 |
|---|---|
| -1309 ~ -1315 | `flight/index.html`、`main.js`、`config.js`、`index.html`、`modules/story.js` |
| -1316 | `resources/background/*`（美術交件入庫）、`_recycle/RECYCLE_LOG.tsv` |
| -1317 / -1318 | `script/town.js`、`config.js`、`index.html`、`flight/index.html`、`modules/story.js` |
| 憲法 | `CLAUDE.md`（鐵律 12、§0.1） |

## 修掉的

- **-1310　地形撕裂的真因：texture unit 撞號。** 地形跳空的 max-mipmap（`uHmax`，-1303
  新增）與**遺蹟量體的石材貼圖**（`uTexW`）都綁在 **TEXTURE14**。遺蹟一進視距就把 14
  換掉 ⇒ 地形讀到石頭的顏色當「這一塊的最高點」⇒ 射線亂跳 ⇒ 撕裂。
  **指紋是 GPU 時間掉一半**（同機位 6.8ms → 3.0ms：少走了一半的步＝被騙）。
  遺蹟的貼材改用 unit **6/15**，14 從此屬於地形。
  ⚠ 分兩族：**長期綁著的**（地形 0~5、7~14）與**畫前才綁的**（量體 6、遺蹟 6/15）——
  長期那一族絕對不能被短期的借走。
- **-1312　開機量 36.2 MB → 5.6 MB。** `SFX.preloadBgm` 是**一支一支排隊**下載的，
  而開機批揹著 15 首（31.5 MB），首頁只播一首 ⇒ 進度圈卡在 89%（實測 84 秒下完 9 首）。
  `LATE_BGM_PATHS` 改成**排除法**：只留 `bgm_home`，其餘 20 首背景補載。
  ⚠ 它平時被快取蓋住，**版本號一跳就現形** —— 那天連跳三次，等於每台裝置重跑冷載入。
- **-1313　解開 -1309 那把畫質鎖**（`QUALITY_LOCK`）。-1309 是誤判的產物
  （把撕裂讀成「畫質降到底」），病在 -1310 才修掉，鎖卻留著 ⇒ 把機器釘在 q0。
- **-1315　軟體算圖改走 CPU 路徑。** 認出 SwiftShader／llvmpipe／Microsoft Basic Render
  ⇒ **當作這台沒有 WebGL**（`GLX=null; return false`，走既有退路）。
  理由是**演算法的量級反過來**：GL ＝逐像素 17.5 萬條／幀、CPU ＝逐欄 406 條（差 332 倍），
  GPU 在時 GL 大勝，沒 GPU 時拿 CPU 跑十三萬條就是 6~8 fps。HUD 印 `cpu(sw)`。
  ⚠⚠ **不要因此把 CPU 那條變成預設**：GL 存在的理由是**手機發熱**（Ray -1315 指出），
  而那件事從 fps 上看不出來（桌機兩條都是 60）。
- **-1317　東泊室內五格＋餐飲街三張的 `noTime` 拔掉。** 美術 -1263~-1268 交的 32 張
  時段差分**整批看不到**（節點還寫著 -1293 當時正確的 `noTime:true`，候選鏈只試無尾綴
  那一張）。⚠ 症狀是「交了卻看不到」，沒有任何錯誤訊息。
- **-1318　東泊餐飲街接成樞紐**（`_eastport_spec.md` §八 的 **(甲) 樞紐＝酒吧**，
  Ray：「隨便排就好」）：`tavern`(酒吧) → up 餐廳／right 咖啡廳／down 甜品店。
  連帶把這座城的 `dining` 整塊移除（分店機制 -1263 就取消了，留著會與「走進去的是哪一家」打架）。
  ⚠ **四張圖都已經交了**（`East_Dessert` 也在）—— spec §八 那張「甜品店開單」是舊的。

## 這一輪量到的（新機器，都是當場量的）

| 項 | 數字 |
|---|---|
| 飛行 fps（GL，q0 420×418） | **59.9 fps／GPU 6.8ms** ← 交接檔上一版「fps 還沒複驗」**結案** |
| 飛行 fps（CPU 路徑，同機位） | **59.9 fps／最差幀 16.9ms** |
| renderer（內建瀏覽器） | `ANGLE (NVIDIA, RTX 4070 SUPER, D3D11)` |
| renderer（Ray 的 Chrome，實測） | **`ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)`** ＝軟體算圖 |
| 開機（線上冷載） | -1311 卡在 89%／84 秒 → **-1312 COMPLETE ＜9 秒** |

⚠⚠ **那個 Chrome 掉到 WARP 不是誰設定的**：主行程啟動列是空的、捷徑沒帶參數、
`chrome://flags` 沒改過、沒有企業政策 —— 是 Chrome 自己 fallback 之後記住了。
要修是 `chrome://settings/system` 開圖形加速＋完全重開。**玩家那一邊由 -1315 接住。**

## 還沒做（程式端）

1. **無尾綴舊檔退役**（HANDOFF 原第 3 件）：`East_{Firearm,Guild,Bistro,Grocerie,Hotel,
   Cafe,Restaurant}.webp` 那幾張。**要等 -1317 上線、確認四時段真的吃得到之後**才走
   `tools/recycle.sh` —— 先退會讓那幾格當場變空背景。
2. **`Ravn_Church`**：圖**還沒交**（`ls resources/background | grep Ravn_Church` 是空的），
   節點仍是 `bg:'Ravn_Midtown'` ＋ `bgPending:'Ravn_Church'`。圖到了才動。
3. 原「接下來的事項」第 5／7／8／11 項**照舊等 Ray**（貝利薩爾降落旗、山谷敵人卡、
   瓦努努 Boss 卡、ImageBitmap 要不要入憲）。

## 憲法改了兩處

- **鐵律 12　載體優先序**：手機第一、PC／Mac 其次；網頁是過渡，成品是上架的 App。
  驗收基準是手機不是桌機；發熱與續航是一等公民。
- **§0.1　開工的第一個動作是讀 `HANDOFF.md`**（-1317，Ray 定案）。
  那一天我沒讀就開工，用 `git log`／檔案時間推現況 —— 把早就建好的夏爾村講成缺圖、
  把一筆沒有任何腳本在用的休眠立繪講成「線上在借圖」、漏掉正在建的雪都與東泊，
  而交接檔的「程式端要接的三件」就攤在那裡沒人接。

---

# ⚠⚠⚠ 第零節：**舊**機器（Windows）的環境 —— 新機器請重量

⚠⚠ Ray 於 -1306 之後**再次換機器**。以下是舊機那台的實測（-1303/-1306 當場量），
留著只為了兩件事：① 底下那三個「容易誤導人」的陷阱多半**跨機器成立**
② 新機器量完可以對照。**數字本身一律作廢。**

| 項目 | 實測 |
|---|---|
| 機器 | Windows 10、**4 核**、**實體 RAM 8 GB** |
| 顯示卡 | **NVIDIA GeForce GT 1030、2 GB VRAM** |
| 驅動 | **582.66**（`32.0.15.8266`，2026/6/9）—— 這一輪從 560.94 更新上來 |
| Python | ⚠⚠ **只有 `py` 能用**。`python`／`python3` 是 Microsoft Store 的空殼，**跑什麼都 exit 49 而且零輸出** |
| `MAP_EDITS_SRC` | 仍是 `[]`（`flight/index.html:1891`）—— 地圖編輯的筆畫仍然只在瀏覽器裡 |
| 未追蹤散檔 | **零個**（`git status --untracked-files=all` 乾淨） |
| `resources/_originals` | **61 MB**（gitignore） |
| `_recycle` | **36 KB**（gitignore，唯一的刪除出口，永不真的刪） |

### ⚠⚠⚠ 這台機器最容易誤導人的三件事（-1303 這一輪各騙過我一次以上）

1. ⚠⚠⚠ **Claude 桌面版的硬體加速會被它自己關掉，而且選單救不回來**（-1306 解決）。
   症狀：內建瀏覽器的 `renderer` 是
   `ANGLE (Microsoft, **Microsoft Basic Render Driver**, D3D11)` ＝ **純軟體算圖**，
   顯卡完全沒碰到。**在那個面板裡量效能全部作廢** —— 它一天之內給過三個假結論
   （「地形 shader 只要 1.4ms」「跳空沒有差別」「每幀 2.2ms」），真相是 GPU 100%、fps 2~30。

   **成因與解法（-1306 查出來的）**：`%APPDATA%\Claude\claude_desktop_config.json` 有**兩格**：

   | 旗標 | 誰設的 | 選單切得到嗎 |
   |---|---|---|
   | `isHardwareAccelerationDisabled` | 使用者 | ✔ |
   | **`isHardwareAccelerationAutoDisabled`** | **Claude 自己**（驅動反覆 TDR 時） | **✘** |

   ⇒ 這就是 -1303 記的「Help 選單點過一次**沒有生效**」：選單只切前者，
     Claude 自己關的那一格還立著，下次啟動又把它壓回去。**兩格要一起清。**
   ⚠ 改設定檔要**先完全結束 Claude**，否則它退出時會寫回舊值。
   ⇒ 清完實測 `renderer` ＝ `ANGLE (NVIDIA, NVIDIA GeForce GT 1030, D3D11)`，
     內建面板 fps 由「當掉」變成 **56.5**。
   ⚠ **新機器要重新確認一次**：這一格是 Claude 自己會設的，換機器不會跟著過去，
     但新機器也可能自己設上。**量效能之前一律先看 `renderer` 有沒有 NVIDIA／AMD／Intel。**

2. **分頁不在前景時 rAF 被節流**（實測 2.5 秒只跑 1 幀）。
   量到「fps 2.6、CPU 15%、GPU 0%」那種「什麼都不忙卻跑不動」的組合，
   **那是節流不是效能問題**。要量就得請 Ray 把視窗放前景。

3. **`py -m http.server` 會被回收**（這一輪死了五次）。症狀是
   **首頁破圖＋沒有 testmode 鈕**，與程式壞掉一模一樣。分辨法：
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/main.js
   ```
   回 `000` 就是伺服器沒了。
   ⚠ `.claude/launch.json` 已改成讀 `PORT` ＋ `autoPort`（-1303），
     所以預覽伺服器不會再跟手動起的那台搶 8000。

### 換機器要帶什麼（-1306 當場清點，不是沿用舊交接）

| | 實測 | 要不要帶 |
|---|---|---|
| `MAP_EDITS_SRC` | 仍是 `[]`，而且**兩個瀏覽器的 localStorage 都沒有地圖編輯的鑰匙** | **不用** —— 沒有待匯出的筆畫 |
| `tivot_settle_drag_v1`（拖城） | **不存在**（只有 `_purge` 那支旗） | **不用** |
| localStorage 存檔 | 真 Chrome 8 筆 761 字；`main:null`／`quick:null`，只有 `dev_seed_money`、玩 175 秒 | **不用** —— 是空的開發狀態 |
| `resources/_originals` | **67 MB**（gitignore） | ⚠⚠ **要**。轉檔前的原 PNG，git 帶不走 |
| `_recycle` | 36 KB（gitignore；`RECYCLE_LOG.tsv` 本身有進版控） | 要（很小） |
| 未追蹤散檔 | **零個** | — |

⚠⚠ **「玩家存檔在 localStorage」這件事要分兩個瀏覽器看**：內建面板與 Ray 的真
Chrome 是不同的設定檔、不同的 localStorage。-1306 兩邊都查過，兩邊都是空的開發狀態。
匯出法（在該瀏覽器的 console）：
```js
copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('tivot_')))))
```
⚠ 管理人模式：`localStorage.tivot_admin_v1='1'`（沒有它首頁只剩四顆鈕，§6.9 的白名單）。

---

## 上一輪（-1294 ~ -1303）：讀取分工 ＋ 飛行地圖上 GPU

⚠ 期間有**另一個 session 並行在做美術**（-1263~-1267 那幾筆，東方泊地室內四時段）。
編號是兩套計數器，不要混。這一輪程式端**只動過**下面列的那幾支檔案。

### A. 讀取分工（Ray：「每一個讀取頁都只讀接下來要用的資源，並且清空上一個場景的資源」）

| 版 | 內容 | 實測 |
|---|---|---|
| -1294 | 四座城的 BGM 接上播放表（`story.js` 的 `BGM_FILES`/`BGM_ALIAS` 少了它們，`bgmSrc()` 回 null ⇒ 延用進城前那一首、不報錯） | 19 個短名全部解析，分大小寫對過磁碟 |
| -1295 | **開機只載這個畫面要的圖** | DOM 解碼 **738 MB → 19 MB**、圖片請求 132 → 20 |
| -1296 | `SFX.releaseAudio(keep)`（全專案第一支會把記憶體**真的**還回去的函式）＋ 挑戰卡改 fetch 暖快取 | 117 sfx / 21 bgm → 放掉 116 / 20 |
| -1297 | `story.loadScene()` —— 換場唯一的那道門（清場 → 讀取頁 → 音效/圖/音樂 → 開演 → 背景暖快取） | 背景請求 432 → 72 |
| -1298 | 每座城的音效**從資料掃出來**（`collectSe`，不手維護清單）＋ 候選鏈先試最可能的 | 12 座城 28 支、合計 2.41 MB；404 56 → 26 |
| -1300 | 進飛行畫面把主頁音訊整個放掉 | 117 支 / **121 MB** → 5 支 / 4.8 MB |

⚠⚠⚠ **-1295 與 -1300 是同一課**：**預載的成本要算「解碼後的量」，不是檔案大小。**
· 圖：`new Image()` 會**解碼成點陣圖**（寬×高×4），WebP 常壓到 1/30~1/50 ——
  5.3 MB 的 WebP 解開來是 250 MB。
· 音：Web Audio 存 Float32 PCM，96kbps 的 m4a 解開來約 **32 倍** ——
  7.2 MB 的檔案是 **121 MB** 的記憶體。
`SFX.audioHeld()` 現在直接報 `sfxMB`，不要再用檔案大小推。

### B. 飛行地圖的效能（Ray：「這種程度的 2.5D 再怎麼樣也不該卡」——他是對的）

**成因：ver -1198~-1223 把地形搬上 GPU 時，演算法的複雜度等級變了。**

```
舊（CPU，voxel space 正宗作法）：逐欄   →     406 條射線
新（GPU，fragment shader）    ：逐像素 → 134,792 條射線     ← 多 332 倍（＝BH）
```

GPU 每條射線快 20~50 倍，但工作多 332 倍 ⇒ 淨值更慢。而且逐欄版的 `ybuf`
有免費的遮擋剔除（填滿就收手），逐像素版每條各走各的，沒有人把它補回來。
⚠ 這不是誰寫壞了：fragment shader 天生逐像素，「一條射線填一整條色帶」在那個
模型裡做不到。**那幾個 commit 記的「3~11ms → 0.14ms」全是 `workMs`（CPU 送出
指令的時間）—— 成本沒消失，是搬到了那個指標看不見的地方。**

| 版 | 內容 |
|---|---|
| -1301 | 雲團改貼預烘的圖（每幀 141 個 `createRadialGradient` 歸零）。**不是主因**，但是真的浪費 |
| -1302 | 射線高過地形最高點且還在爬 ⇒ 提早結束（模擬省 37.8%）；HUD 加印 GPU 時間 `g` |
| **-1303** | **max-mipmap 跳空** ＋ 畫質階梯的兩個 bug |

**-1303 的實測（Ray 的真 Chrome，前景）**：

| | 修前 | 修後 |
|---|---|---|
| fps | 2~30 | **54** |
| GPU（Chrome 程序） | **100%、79°C** | **11%**（全系統 16%） |

⚠⚠⚠ **max-mipmap 的四個坑，每一個都會讓畫面破洞或不等價**：
1. **跳的必須是「整數個原本的步」**（二次式反解一次 sqrt）—— 射線要永遠落在原本
   會取樣的那些 z 上，第一個命中點才會一模一樣。跳任意距離 ⇒ 取樣點偏移 ⇒ 不等價。
2. **安全距離用 DDA 算**（沿射線離開這一塊還有多遠），不要拿格寬去猜：
   `dir` **沒有正規化**（|dir| 最大 2.6），拿格寬當距離會一口氣跨過兩三格。
3. **hNeed 在區間內不是單調的**（往下看先降後升，頂點在 `z=k/(2·curv)`）——
   要取區間內的**最小值**。只看起點會漏掉中間比較低的那一段。
4. **底階要先做 3×3 膨脹**：`hSurf` 是**雙線性**取樣，它讀的四個 texel 可能有一個
   落在隔壁格 —— 只取「這一格的最大值」涵蓋不到。**實測就是這樣抓到的**
   （某個機位差 337 個通道／最大 28），膨脹之後歸零。
⚠ **不可以用 `generateMipmap`**：那一支做的是平均（box filter），這裡要的是最大值。
  MIN 濾鏡必須 `NEAREST_MIPMAP_NEAREST`。

**位元等價驗收（這是硬性門檻，不等價就不上）**：固定 `uTime`、**12 幀暖機**、
每一組都配「同設定跑兩次」的對照組 —— 5 個高度 × 6 組角度高度 × 先前失敗的那一組，
**全部 0/0**。
⚠ 暖機不足會出現假陽性（城與遺蹟的貼圖還在載、LOD 遲滯還沒穩），-1303 踩過。

**畫質階梯修好的兩個 bug**：
1. 反應時間用**幀數**算（40 幀評估、換檔靜置 90 幀）—— 60fps 下是 2 秒，
   **2fps 下降一級要 65 秒、降到底四分鐘**。越需要它快越慢。
   加了「中位數 > 24ms 連續 8 幀就立刻降」（只放寬降級，升級照舊）。
2. `clamp(v, 下限, 上限)` 在**下限 > 上限**時回傳**下限** —— 1920 寬時五個檔位
   全是 **634**（比上限 420 還大）。改成把上限夾在**視窗寬**上：q0 420 → q4 231。
   ⚠ 與 -1196 是同一個病的兩端（那次下限寫死 160 壓平下面三階）。

### C. 機器層面（與程式無關，但害我查了很久）

- **驅動在反覆 TDR**：更新前五分鐘內三次
  `Display driver nvlddmkm stopped responding and has successfully recovered.`
  → 更新到 582.66 之後**重開機至今 0 次**。
- Claude 桌面版因此自己關掉硬體加速（見第零節第 1 點，**至今沒開回來**）。

---

## 這一輪（-1304 ~ -1306）：頓挫結案 ＋ 硬體加速

⚠ 這三版都是**程式端**；期間美術 session 並行在做東方泊地室內差分（-1266~-1268），
**編號是兩套計數器**。兩邊動的檔案不重疊（美術只動 `resources/`，程式動
`config.js`／`flight/index.html`／`index.html`／`modules/story.js`）。

### -1304　走遠的城把 GL 貼圖也放掉（VRAM 25.8 MB）

`releaseFarCityArt`（-1195）只放掉 CPU 那一半（`cityPlanArt`／`CITY_PYR`），
GL 那一份沒有人動；而且 `RELEASE_R`(14400) ≫ `ZFAR`(3600) ⇒ 被放掉的城
**再也不會被 `glPickCities` 選到** ⇒ 永遠等不到重建。十座城走一遍 25.8 MB
（拉芬 7.4／卡耶爾 5.7／東泊 5.3）。
實測 `GLX.isTexture(舊物件)` `true → false`，飛回去重建成全解析、`glGetError()` 0。

### -1305　GL 之下不再白建取樣金字塔 ← **「偶發頓挫」的主犯**

`CITY_PYR` 的 `levels` **只有 CPU 那一大圈在取樣**，而 `GLON && glReady` 時
那一整段被 `z=ZFAR` 跳過（城的地面自 -1206 起由 shader 讀 `glCityTexture`）。
-1206 的註解早就寫著「GL 的 mipmap 取代了 CITY_PYR 那一整套」，
**但沒有人把建構那一端關掉。**

20 秒橫越大陸（帝都 → 東方泊地）：

| | 修前 | 修後 |
|---|---|---|
| `buildCityPyramid` | **204ms**（單次最高 **101.5ms**） | **3ms** |
| `>28ms` 的長幀 | 72 個 | — |

最貴的那一次＝飛近東方泊地 1024×1024 → 7 層，每層一次 `getImageData`（GPU→CPU 回讀）。

作法：分流收在 `buildCityPyramid` 自己身上（鐵律 8，兩個呼叫者一起好），
GL 之下退成**佔位** `{levels:null, full, src}`，CPU 退路真的要取樣才補建（`pyrLevels`）。
⚠ **不可以整個不留**：`planCity`／`groundSampled` 兩處在看它**存不存在**
（＝「這座城有手繪圖」，沒有它程序生成的白色小房子會疊在插畫上，§6.7.5）。
⚠ `src` 必須是呼叫端傳進來的那一張 —— 抓全解析的話 -1195/-1304 就白放了。

### -1306　城的貼圖改走 ImageBitmap(Blob)

拆開量才知道錢在哪（GT 1030，`g.finish()` 逼它做完）：

| | ms |
|---|---|
| `generateMipmap` | **0**（硬體全免費，不是它的錯） |
| `texImage2D` ← `HTMLImageElement` | 78.5 首次／**36.7 熱快取** |
| `texImage2D` ← `ImageBitmap` | **2.4** |

貴的是**主執行緒把圖轉成貼圖格式**，而且**每次都要重做**——
「載過了就便宜」的直覺在這裡是錯的。

⚠⚠⚠ **而且 bitmap 一定要從 Blob 建，不可以從 `<img>` 建**（733×1536 實測）：

| | 同步段（卡幀的那一段） | 總計 |
|---|---|---|
| `createImageBitmap(HTMLImageElement)` | **70.2ms**（整段都是同步的！） | 70.2ms |
| `createImageBitmap(Blob)` | **0.1ms** | 32.3ms（主執行緒外） |

從 `<img>` 那一支回傳的是「已經做完」的 promise —— 看起來非同步，該卡的一分沒少。
**-1306 的第一版就是這樣寫的，幀 1 反而 57.2ms（比舊路徑還糟）。**
改 `fetch(img.src).then(r=>r.blob())` 才真的搬得出去（打 HTTP 快取，3.3ms）。

`glCityTexture` 是在畫的迴圈裡**同步**呼叫的，所以不能等 —— 作法是
「排解碼、這一幀先用手上有的」。一座城從無到有：幀1 12.0ms／幀2 10.0ms／幀3 **0.1ms**。
⚠ 上傳完 `close()`（ImageBitmap 抱著解碼後的點陣，1024² ＝ 4MB）。

視覺驗收：低空過帝都，手繪地面（放射狀街道、街廓）正常，沒有白色小房子疊上去。

### ⚠⚠ 還沒驗的一件：**fps**

修後的 fps 一直量不到 —— 內建面板每次量到一半就被藏起來，rAF 節流到 30Hz
（第零節陷阱 2；**形狀是「幾乎每一幀都剛好 33ms」**，看起來像效能爆掉）。
那幾組整組作廢。**函式耗時不受節流影響**，所以上面那些數字是有效的。
⇒ **新機器第一件事：在真瀏覽器前景飛一段跨兩三座城的長程，看頓挫還在不在。**

---

## 平台實測（-1303／-1306，**舊機器**）

| | 狀態 |
|---|---|
| Windows + Chrome（GT 1030） | ✔ fps 54、GPU 11% |
| Mac / MacBook / iPhone | ✔ Ray 回報正常 |
| **Claude 內建瀏覽器** | ✔ **-1306 修好**：硬體加速那兩格清掉之後 renderer ＝ NVIDIA、fps 56.5（先前的「仍卡」是軟體算圖，非程式問題） |

Ray 定的目標：**以 GPU 為前提優化，最爛的設備也要跑全效**（下限抓
Intel HD 520 級的內顯），**Android / Win / Mac / iOS 都要跑得動**。
GT 1030 現在只用 11% GPU，那個餘裕是留給內顯與手機的。

---

## 接下來的事項

> ⚠ **第 0 件（換機器）**：`resources/_originals`（67 MB，gitignore）要自己複製過去 ——
> git 帶不走。其餘保命項 -1306 清點過，都是空的（見第零節那張表）。

1. ⚠⚠ **新機器要重跑一次「量測前的確認」**：
   ① `renderer` 有沒有真的顯卡（第零節陷阱 1，硬體加速那兩格）
   ② 量 fps 時面板／分頁在不在前景（陷阱 2）
   ③ `py` 還是 `python`／`python3`（舊機只有 `py` 能用）
   ④ `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/main.js` 確認伺服器活著
2. **飛行的 fps 還沒複驗**（見上一節）。-1305/-1306 把兩個最大宗拿掉了，
   但「修後實際跑幾 fps」缺一個有效的數字。
3. ~~`glCityTex` 小洩漏~~ → **-1304 修掉了**。
4. ~~Claude 硬體加速還關著~~ → **-1306 解決**（兩格旗標，見第零節陷阱 1）。
5. **`belisar_land_ok` 這支旗還沒有人插** ⇒ 貝利薩爾**永遠降不下去**
   （常數在 `flight/index.html` 的 `BELISAR_LAND_OK`）。等 Ray 的稿。
6. **`Ravn_Church`** 交件 → 改 `bg`、拔 `bgPending`、**補回 `noTime:true`**。
7. **卡耶爾山谷**：小地圖 `resources/map/map_canyon.webp`；**遭遇戰的敵人卡還沒有**
   （所以 `wildSpawn` 先沒給）。工單 `resources/background/_canyon_spec.md`。
8. **瓦努努遺蹟的 Boss 卡**（`script/town.js:3900` 那一拍）。
9. 兩座新城沒有 `midnight` 差分（午夜退到 `night`，有 `bgResolved` 快取所以一輪只吃一次）。
10. 鐵路要不要重做是 Ray 的決定。⚠⚠ **鐵路是開著的不是暫停**（-1276 的 `RAILS_ON`
    已隨 -1269 的 revert 消失，專案裡沒有這個名字）。
11. **要不要把「貼圖上傳一律走 ImageBitmap(Blob)」寫進憲法**（§6.7 那一族的通則）——
    -1306 只寫在程式註解與這裡。日後任何新的 GL 貼圖都會踩同一個坑。**Ray 決定。**

## 驗收指令（⚠ 以下是**舊機器**Windows 的寫法，新機器要重新確認）

```bash
py tools/script_lint.py     # ⚠ 需要 macOS 的 jsc，這台跑不了（見下）
py tools/bust.py            # 改完 config.js 的 VERSION 之後跑
```

⚠⚠ **`python`／`python3` 在這台是空殼（exit 49、零輸出），一律用 `py`。**
⚠ `PYTHONUTF8=1` 前綴：中文輸出在 cp950 下會炸。

**語法檢查**：
```bash
node --input-type=module --check < modules/story.js
```
⚠⚠ **不要用 `node --check`** —— 它把 `.js` 當 CommonJS，**抓不到重複宣告**。
  -1297 就是因此讓兩個同名函式（`seSrc`／`bgUrl`）上線，首頁整個壞掉才發現。

**`flight/index.html` 是 HTML**，要抽出最大的 `<script>` 再驗（`node --check` 即可，
它是非 module）。
⚠⚠⚠ **JS 語法過了不代表 shader 過**：GLSL 編譯失敗是**悄悄退回 CPU**
（`glReady:false`、畫面上沒有任何錯誤訊息）。**改完 shader 一定要在瀏覽器確認
`glReady===true`。**
⚠⚠ GLSL 在 JS 樣板字串裡，**註解不可以有反引號** —— 憲法記第七次，-1302/-1303
  我又踩了第八、第九次（順手用反引號括變數名就會炸）。
⚠⚠ GLSL **不能用 `<` 比較向量**（`abs(dm)<vec2(1e-6)` 是編譯錯誤）—— 要逐分量寫。

**跑起來**：`.claude/launch.json` 已改成讀 `PORT` ＋ `autoPort`（-1303）。
手動起一台不會被面板帶走的：
```bash
powershell -c "Start-Process py -ArgumentList '-m','http.server','8000' -WorkingDirectory 'C:\Users\Kaede\OneDrive\桌面\TIVOT' -WindowStyle Hidden"
```

⚠⚠⚠ **背景檔名的大小寫不可以只靠本機驗**：Windows 與 macOS 都**不分大小寫**，
本機 server 會把 `_Day.webp` 當成 `_day.webp` 送出來 —— **靜態空間會分**，
上線才 404。真值要用分大小寫的比對。

---

# 美術產線（-1263 ~ -1268，與程式那一串平行）

> ⚠ 美術與程式的版本號是**兩條**，會撞號。這一段是美術那一條。

## 做完了什麼

**東方泊地室內八格 × 四時段 ＝ 32 張全部交件**（`resources/background/East_*_{dawn,day,dusk,night}.webp`）。

| 版 | 內容 |
|---|---|
| -1263 | 餐飲街改成走得進去的節點（Ray 定案，分店機制取消）＋ 室內四時段工單 |
| -1264 | 甜品店四時段 `East_Dessert_*` ＋ `tools/imgbridge.py` |
| -1265 | 逐格光線要點（七格採光條件不同，不能用同一段通用敘述） |
| -1266 | 六格 18 張差分（酒吧／咖啡廳／餐廳／武器店／公會／雜貨舖） |
| -1267 | 交件進度表 ＋ 踩坑紀錄 |
| -1268 | 旅店四時段，八格到齊 |

權威規格與逐格光線：`resources/map/_eastport_spec.md` §八～§十之二。
驗收：24 張衍生圖**全部 scale 1.00**（邊緣圖相關度 ＋ 掃縮放找最佳擬合）。

## ⚠ 程式端要接的三件

1. **拔掉 `noTime:true`** —— 東泊的 `gunstore`／`guild`／`tavern`／`grocery`／`inn`，
   以及 `dining.scenes` 那三支。檔名現在都帶時段尾綴，留著 `noTime` 只會去抓無尾綴那張。
2. **餐飲街接成樞紐**（Ray：「進去多加三條路線　餐廳　甜品店　咖啡廳」）——
   四家店的圖都在，拓樸是 Ray 的設計（憲法 ver -907），美術沒動 `town.js`。
3. **無尾綴的舊檔先留著**，等 1 做完才走 `tools/recycle.sh` 退役 ——
   先退會讓那幾格當場變空背景。

## 還沒定 ／ 還沒做

- ⚠ **餐飲街那一格自己顯示哪一張**：樞紐＝酒吧（現況，不必再畫）／樞紐＝街景
  （要再補 `East_Dining` 室外四張）。等 Ray 一句話，兩種讀法寫在 `_eastport_spec.md` §八。
- **拉芬斯達爾室內 7 格 × 3 ＝ 21 張**（同一套流程，清單在 §九）。
- `Ravn_Church`（見上面「接下來的事項」第 5 項）。

## ⚠⚠⚠ 產線：三條會咬人的（下一台機器照抄，不要再撞一次）

1. **表單 POST 回本機一定要 `target="_blank"`**。不加的話 Chrome 會把主分頁導去
   `127.0.0.1:8777/save`、CDP 連線當場中斷，**請求根本沒送完** ——
   檔案不會落地，而且**沒有任何錯誤訊息**。
   ⚠ 內建瀏覽器吃 204 所以不導頁、**Chrome 不吃**：在內建瀏覽器驗過不代表 Chrome 也對。
2. **這個 ChatGPT 帳號不保存對話**：`/backend-api/conversations` 恆為 0 筆、
   用對話網址回去會被導到「庫」、在另一個瀏覽器開同一串回「登入以查看此對話」。
   ⇒ **每張一畫好就立刻存**，不要等三張跑完（雜貨舖那一串就是這樣整個丟掉重跑）。
   ⇒ `resources/background/_art_sessions.md` 與各 spec 記的產線網址**全部 404**
     （那是**別的帳號**的），畫風上下文接不回來，只能靠上傳底圖重建。
3. **`javascript_tool` 的等待迴圈不要超過 40 秒**：CDP `Runtime.evaluate` 45 秒逾時；
   逾時之後那一支其實還在跑（存檔會成功），但你拿不到回傳值。輪詢拆成多次短呼叫。

### 工具

- **`tools/imgbridge.py`**（已入版控）：內建瀏覽器沒有上傳／下載工具時的圖橋。
  `py tools/imgbridge.py <serve_dir> <drop_dir> [port]`
  · `GET /<檔名>` 讀本機圖　· `GET /grab?f=&back=` window.name 傳輸（⚠ Chrome 會清，已無效）
  · `POST /save?name=` 收檔並回 **204**（204 ＝ 內建瀏覽器不導頁）
- 上傳走 **Claude in Chrome 的 `file_upload`** —— 內建瀏覽器沒有這個工具，
  而 chatgpt.com 的 CSP（`connect-src` 白名單）＋ 混合內容擋死了所有從網路進料的路。

## ⚠ 換機器：這些**不會**跟著走

- ⚠⚠⚠ **這是換機器唯一真的會掉東西的一項**——見第零節「換機器要帶什麼」那張清點表：localStorage 、存檔、地圖筆畫、拖城 **全部是空的**（-1306 兩個瀏覽器都查過），**只有這一項要搬**。
- `resources/_originals`（**67 MB／31 個檔**，含這一輪 25 張成品的原始 PNG）與 `_recycle`
  —— 都在 `.gitignore` 裡。要留就自己複製。
- ⚠ 上一次換機器已經掉過一次大的：舊機器的 `_originals` 有 **2.6 GB**，
  這台只剩 11 MB —— **卡耶爾山谷那 20 隻怪的 Gemini 原形就是那樣沒的**
  （`_canyon_beast_spec.md` 的下一步「GPT 加氣勢＋去背」因此做不下去，要重生成一輪）。

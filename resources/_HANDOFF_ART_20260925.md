# 美術 session 交接 — 2026-09-25 凌晨（Windows 那台收工，換機器）

> 開工第一件事讀這一份（憲法 §0.1）。上一份 `_HANDOFF_ART_20260924.md` §七～§八 與工單 `si/_misha_program_worklist.md` 附三～附三之五是這一輪的細節。

## 一、⚠⚠⚠ Ray 這一輪定的產線規則（下一個 session 照做，寫進憲法 §5）

1. **只改表情的差分，直接用 GPT 的整張輸出，不做本機拼接**（Ray：「效率太低了 而且你的 token 比較貴 只是改表情的話給 gpt 做更划算」）。
   9/24 那條「GPT 表情差分會整張重畫、不要整張採用」**被這條覆蓋**：瀏海微變的代價，Ray 接受；美術 session 的 token 比較貴。
   本機只做 **GPT 做不到的幾何修正**（例：刀身拉直、只換刀柄拼回）。
2. **同一個 ChatGPT session 失敗兩次就換**，不在原串盧第三次。
3. **局部修改不要拿有問題的原圖回去餵**，用 `front` 當底整張重畫（原圖的錯結構會被一路繼承）。
4. 刀長要用「長刀」＋「強透視」構圖才畫得出來（平貼畫面的橫刀 GPT 永遠畫短）。
5. 護弓：海軍軍刀往外鼓的 D（畜生道設定圖），**在刀刃側**，老舊黃銅扁條，每一則都附 `weapon/chikushoudou.webp` ＋ 護手局部裁圖。
6. 本機修圖：Ray 說「刀身彎了」＝刀身自己彎，先轉水平看；「稍微」＝個位數像素。

## 二、交件現況（`git log` 可複驗，全部已 push）

| 檔 | 狀態 | 程式端要接 |
|---|---|---|
| `si/misha_si_draw.webp` | ✔ Ray 自己出的拔刀圖（護手定案）＋ 本機刀身拉直 1.8 px | `speakers.js:1486` `?v=2→3`，**取景值 top:6 bot:1534 fx:0.434** |
| `si/misha_si_drawopen.webp` | ✔ 新 draw ＋ GPT 攻擊性張嘴（咬牙露齒瞪視），眉眼嘴拼回 | `speakers.js:1498` **加 `?v=2`**，取景值同 draw |
| `_originals/si/misha_si_drawclose_src.png` | 未入庫：新 draw ＋ 攻擊性閉嘴 | 用途等 Ray（換掉 draw 的臉／另開鍵） |

其餘米夏檔沒動。`_originals/si/` 這台有：`misha_si_draw_ray_src.png`（Ray 原圖）、`_bladefix_src.png`（拉直母版）、
`drawopen/drawclose` 的 GPT 整張與拼接母版、`draw_guardfix_*`（v1～v8 的過程）、`draw_newsession_v1~3`。**`_originals/` 不入版控，換機器帶不走。**

## 三、⚠ 等 Ray 決定的

1. 閉嘴攻擊版的用途。
2. `front` 與 09-23 那五張（`stare`／`order`／`side`／`guard`／`salute`）的護手仍是亮金圓管大圓弧，只有 `draw` 是畜生道規格 —— 要不要全套換。
3. `draw` 刀長 ≈ 身高 0.63（規格 0.66～0.74，略短）。
4. 刀長不合格 7 張（`_misha_sword_lock.md` §四）要不要重畫。
5. 09-24 交接 §三那批 untracked 檔（`anya_si_nod.png`、`renna_si_hug*.png`）—— 這台沒有，在 Mac。

## 四、下一個要做的（米夏）

- `close` 自然站姿（重心單腳、手搭刀柄）→ 以它為底重做 `closeopen`。**這台與 Mac 都沒有** `_originals/si/misha_si_close_natural_src.png`，要重新向 GPT 要。
  照規則 1：表情差分整張採用；照規則 5：附畜生道圖鎖護手；收件量刀長（`_misha_sword_lock.md` §三）。

## 五、ChatGPT 串（對話在伺服器端）

| 串 | 內容 |
|---|---|
| `https://chatgpt.com/c/6ab54b89-2c30-83e8-b09c-3bf1668b34f3` | 新 draw 白底在第一則；出了嚴肅張嘴／閉嘴、攻擊性張嘴／閉嘴各一 |
| `https://chatgpt.com/c/6ab54481-5000-83e8-9250-66d8cbcd9357` | 用 front 重畫拔刀的三張（都不合格，Ray 之後自己出） |
| `https://chatgpt.com/c/6ab538d4-7dc4-83e8-a53d-8b8f0f3f3450` | 舊 draw 修護手 v1～v8（作廢，留紀錄） |

## 六、這台（Windows）的產線備註

- Claude in Chrome 連 **Browser 1（Windows）**，`file_upload` 可用；ChatGPT 帳號 Ku Ray（Go）。GPT 圖用 `fetch→blob→a.download` 落 `~/Downloads`。
- ⚠ **附圖與文字要同一則送**：`file_upload` 後立刻 `btn.click()` 會把圖單獨送出（文字留在框裡）；等送出鈕可用、框裡有字再點。
- ⚠ 抓圖：DOM 裡附件縮圖排在最後，1024×1536 計數不會因新圖增加 —— **用 blob 大小排除已下載過的版本**，生成完（stop 鈕消失）還要再等 20～40 秒佔位框才載入。
- `javascript_tool` 單次 45 秒上限，輪詢分段。
- python 3.11、cv2 4.9／skimage／scipy 都在；主控台要 `PYTHONIOENCODING=utf-8`。`.venv-matting/` 在（ToonOut 備案）。
- 交件編碼：PNG 母版 q85、既有 webp 二代 q92，`alpha_quality=100, method=6`（Pillow，這台沒 cwebp）。

---

## 七、2026-09-25 凌晨～（**Mac 這一台**，接在 Windows 收工之後）：米夏九張重做 —— ✔ 全部入庫

Ray 這一輪的指令（見 `si/_misha_program_worklist.md` **附四**，逐鍵取景與程式端要改的九行都在那裡）：
`draw`／`drawopen` 臉改 front 畫風（嚴肅閉嘴／微張嘴）、`stare`／`stareopen` 護弓照 draw、
`frown`／`frownopen` 以 front 重畫（刀先短了一次，同串加長到 0.67）、`close`／`closeopen` 以 front 重畫自然站姿、
`frontshock` 以 front 重畫冷靜震驚、直視觀者。

- **九張全部 GPT 整張採用、alpha 直出、本機零拼接**（§一規則 1）。近白 ≤0.06%。
- 五條線五個串並行，全部一次或兩次就過；唯一的坑：`frownopen` 第二次回來是**畫上去的棋盤格假透明**，
  明寫「不要畫灰白相間的棋盤格」重出才對（憲法 §5 早就記過這一條）。
- ⚠⚠ **程式端要接九行**（都是同名覆蓋、版號全跳；`frontshock` 要從字串縮寫改成物件，頭轉正了 fx 0.444）—— 附四那張表。
- ⚠ **這一台現在 Claude in Chrome 連得到 Mac 自己的 Chrome**（09-24 §六那條「Mac 搬不回圖」的前提已變：
  那天連的是 Windows 的 Chrome；今天 `list_connected_browsers` 回的是 macOS・isLocal）。下載直接落 `~/Downloads`。
- ⚠ **程式 session 同時在這棵工作樹上活著**（-1728 在我做圖的中途 commit 進來，`_SI_差分總表.xlsx` 是它動的）——
  我只 `git add` 自己的檔，沒碰它的。

### 等 Ray 看畫面決定
- `stare`／`stareopen` 刀長 0.77（規格上限 0.74；舊版 0.78，這次只改護弓沒動長度）。
- §三那五件照舊（閉嘴攻擊版用途 / 其餘五張護手要不要全換 / 刀長 7 張…）——
  ⚠ 其中 `close`／`frown`／`stare`／`frontshock` 這次已重畫，**刀長不合格名單剩 `side`／`talk`／`guard`／`back`**。

### 資產盤點（米夏，2026-09-25）
| 鍵 | 狀態 |
|---|---|
| draw／drawopen／stare／stareopen／frown／frownopen／close／closeopen／frontshock | ✔ 不欠 —— 今天重做，程式端待接 |
| front／order／salute／wound／side／talk／guard／back／frontgrit／frontopen／saluteopen／sideopen／guardopen／stareopen(舊) | ✔ 不欠（線上照舊）；⚠ side／talk／guard／back 刀長不合格等 Ray |
| retainer | ✔ 不欠（-1715 已接） |

## 八、2026-09-25：無人廢城（暫名 `dunmor`）拓樸 —— ✅ **Ray 定案 v2，開畫**（換 session）

Ray：「先交一份無人廢城拓樸方案，50～60 格，含一個祭壇終點，古凱爾特風格，迷宮與岔路」
- 提案：`resources/map/_dunmor_spec.md`（數據、三帶、逐格特徵、背景預算、要 Ray 定的五件）
- 佈局圖：`resources/map/_layout_dunmor.png`（產生器 `tools/map_dunmor_draft.py`，自檢：同欄同列／不交叉／不穿格／≤4 向／連通／一直按↑不直達）
- **v2**（Ray 追加「同一方向不要有三次以上的直線」→ 整張重排成之字形，產生器多一條「同向 ≤2 段」自檢）：56 格・60 邊・5 環；四向口 1、三向口 19、端末 12、休息處 3；一直按↑只走到南壘門（門道塌了，要走兩側壕溝坡道）
- ⚠ **沒有搬進 `town.js`、沒有開背景工單** —— 先排拓樸再畫場景，Ray 點頭之後：程式端搬資料、`map_layout.py` 補 `POS`、這支產生器回收；美術再開 212 張的背景單（52 格四差分＋地下 4 格單張）

### ⚠⚠⚠ 換 session 的第一件事（2026-09-25 傍晚，Ray：「交接吧 換 session」）
1. **廢城第一批 14 張被 Ray 退了**：「長得太一致沒有辨識度」「天空也要有一定程度的**變化**（不是變色）不然會疲勞」
   「朝西的可以有銀色滿月」→ 重做規則與**逐格分配表已填好**：`resources/background/_dunmor_spec.md` **§七**，照表做，不要現場想。
   ⚠ 病因是共通段一字不差＋同一張色票 —— 重做時色票只沿用色溫，天空四軸與鏡頭三軸逐格指定、連續兩格不可相同。
2. **聖索菲亞補圖 9 張**（酒吧 3／餐廳 1／旅店 4／碼頭→貧民窟 1，居民是深膚白髮的森住民）：工單與提示詞全文
   `resources/background/_sofia_add_spec.md`，**還沒開畫**（Ray 叫停換 session 時正要開）。
   ⚠ 同樣要避免「三間室內長一樣」。
3. 兩件的先後 Ray 沒說 —— 開工先問一句；沒回就先做聖索菲亞（新內容），廢城重做排後面。

### ⚠ 2026-09-25 下午（Mac）：第一批 14 張畫出來了（下面是退稿前的紀錄）
- 檔：`resources/background/dunmor/dunmor_<id>.webp` ×14（主軸 11＋休息處 3）、總覽 `resources/background/_dunmor_batch1_sheet.jpg`。
- 逐格對照表、顆粒量測、產線步驟、**第二批前要 Ray 定的「端末口朝向」**全在 `resources/background/_dunmor_spec.md` §六。
- 提示詞全文 `resources/background/_dunmor_prompts.md`（第二批照抄共通段）。
- 程式端要接的沒變（工單 §五）：拓樸搬 `town.js`、`bg:'dunmor_<id 小寫>'`、全部 `noTime`、三個 `rest`。
- ⚠ 第一批可能要修的兩格：`ditchW` 右側出口不明確、`nemeton` 右側缺口偏弱 —— 等 Ray 看完一起講。

### ⚠⚠⚠ 下一個 session 的第一件事：畫廢城背景（Ray：「先照這樣畫圖吧」）
- **工單**：`resources/background/_dunmor_spec.md` —— Ray 定死的四件（古凱爾特／**剛被破壞、不要太破**／**不久前還有人**／**紫紅天空**）＋ **不做四差分、一格一張**。
- 逐格出口照 `resources/map/_dunmor_spec.md` §二；佈局圖 `_layout_dunmor.png` 第一則附給 GPT。
- **先畫 15 張**（主軸＋三個休息處）給 Ray 看色調與破敗程度，過了再鋪其餘 40 張。
- 交件 `resources/background/dunmor/dunmor_<id>.webp`（小寫、不帶時段），交完跑 `tools/bg_index.py`。
- 開工先 `list_connected_browsers` 確認連的是**本機** Chrome（不是本機就搬不回圖，見 09-24 §六／今天 §七）。
- 程式端要接的寫在工單 §五（拓樸搬 `town.js`、全部 `noTime`、三個 `rest`）。


## 九、2026-09-25 傍晚～晚上（Mac）：聖索菲亞補圖 9 張 ✔ 交件；廢城改成「石製遺蹟感古代都市」第四版跑 14 格

### 聖索菲亞 9 張 —— ✔ 全部入庫（commit `ce3cc0d`）
`resources/background/sofia/sofia_inn_{dawn,day,dusk,night}`／`sofia_bar_{day,dusk,night}`／`sofia_restaurant`／`sofia_slum`。
逐張驗收與**程式端要接的四件**在 `resources/background/_sofia_add_spec.md` §四／§五。`bg_index.js` 已重跑。

### 廢城（dunmor）—— 兩次退稿、第四版進行中
1. §七 那一版（天空四軸／鏡頭三軸）出到第 7 張，Ray：「**太像普通村落而不是古代廢城**」→ 停。七張留 scratch，總覽 `_dunmor_batch2_stopped_sheet.jpg`。
2. Ray：「**以石製遺蹟感 古代都市為主**」「顆粒感也太重，強調 clean lineart 無顆粒，**先跑一張我定風格**」→ 石板主街定風格那張 **過**：
   「可以，**天太紅了偏點紫，不要冒煙**」→「**就用這個風格跑完**」。
3. 第四版共通段＋14 格石造版提示詞全文：`_dunmor_prompts.md` 第四版；規則與紀錄：`_dunmor_spec.md` §八。
4. **交件位置 `resources/background/dunmor/_v3/`**（底線＝不上線），原稿 `_originals/background/dunmor/_v3/`；第一版 14 張原位不動，Ray 看完再搬。

### 廢城 55 格 —— **55／55 ✔ 不欠**（2026-09-26 00:40；第一版 14 格已被第四版覆蓋、其餘 41 格全數入庫；盤點表在 `_dunmor_spec.md` §八／§九；總覽 `_dunmor_all55_sheet.jpg`）
- 程式端要接：拓樸搬 `town.js`（§五）、`bg:'dunmor_<id 小寫>'`、全部 `noTime`、三個 `rest`、**`ASSET_VER` 跳那 14 個被覆蓋的鍵**。
- ⚠ 產線結論：分頁在背景時 ChatGPT 頁面不更新，圖其實都在 —— 每 6～7 分鐘把分頁切前景再抓（Ray 教的）。「額度限了」是誤判。
- 待 Ray 決定：`hallcourt` 正門只擋一半要不要重出；小地圖（`tools/map_compose.py`）另開一單。

### 資產盤點（廢城第四版）—— **14／14 ✔ 不欠**，全部在 `resources/background/dunmor/_v3/`（commit `9553771`、`4af0375`）
逐格的出口／§七 分配／雜點在 `_dunmor_spec.md` §八 的表；總覽 `_dunmor_batch3_sheet.jpg`。
**等 Ray 決定**：①`_v3` 要不要整批搬上去覆蓋第一版（程式端要跳 `ASSET_VER`）②其餘 41 格要不要現在開（先改寫成石造、填 §七 兩張表）③端末口朝向。
⚠ 沒有 push（程式 session 同一棵樹上還有它的 commit，push 是 Ray 的動作）。

### ⚠ 產線的坑（這一輪新踩的，別再踩）
- **排隊器不能用「幾秒沒圖就送下一則」**：慢隊列（5～10 分鐘一張）下晚到的圖會貼到下一格的名字上。要**等到圖真的出現才送下一則**（`run2`），
  已送出還沒回的按送出順序對號，收件時**用排隊器記錄的 blob 大小對號，不看檔名**（Chrome 會把同名檔改成 `(1)`、還會把 `.png` 弄掉）。
- **第一則附「畫風圖」＋一段很長的規格，模型有時會直接照抄附圖**（A 串第一張就是主街＋煙的翻版）→ 那一串之後的圖全部往前錯一格，收尾要對號。
  下次第一則寫短一點、把「這一格是堤道，不是主街」放最前面。
- 定風格那一串第二則之後**兩則都沒有回應**（連生成框都沒有）→ 換串（憲法：生圖卡住換 session）。
- `[data-message-author-role]` 會被虛擬清單卸載，**不能拿 user 訊息數當「送出了沒」**；用「輸入框清空」＋「圖多了一張」。
- 不動的 Chrome 分頁截圖會拿到空白（渲染被暫停），`innerText` 照樣讀得到。

### 這台的其他未追蹤檔（Ray 自己丟的，我沒動）
`resources/si/renna_si_hugangry2.png`（RGBA）／`resources/si/ssophia_si_thug.png`（RGBA）／`resources/ci/nemo_ci_dual.webp`／
`resources/ci/045ac642-….png`（RGB 白底）／`resources/illustration/023_anyacottoncandy.png`、`024_nouvellesmile.png`（RGB）／
根目錄兩張 png、`地理筆記.docx`、`索菈娜技能.docx`；另 `resources/si/gen_renna_si_blush.webp` 在工作樹裡是**已刪除**狀態（不是我刪的）。
用途未知 → 等 Ray 說；要入庫的話走 §5 的 webp 流程＋取景值重量。


## 十、2026-09-26 凌晨（Mac）：聖索菲亞郊外・里朋家族據點（Stage 14 合流）—— ✔ 10 張背景齊（中午補跑 6 格）

Ray：「生成一條前往郊外的拓樸，不用太複雜，還有馬努的據點」→「應該是毒梟豪宅，注意年代 1900」→「地下囚室是終點、連到宅內；兩個終點：囚室決戰、挾人質逃到露台進劇情」→「選有圍牆那個」→「跑完」→「交接吧」。

- **拓樸 v3（提案，等程式端搬）**：`resources/map/_sofiaout_spec.md` §一＋佈局圖 `resources/map/_layout_sofiaout.png`（產生器 `tools/map_sofiaout_draft.py`）。
  11 格：城門→橄欖園道→莊園門房→棕櫚車道→噴泉前庭（→馬車房）→大廳→後廊→**地下囚室（決戰）**；大廳→沙龍→**露台（劇情）**。
- **已交 4 張** ✔（`resources/background/sofia/sofiaout_{lodge,forecourt,hall,salon}.webp`，commit `711dccc`）：前庭是**圍牆版**（第一版左側有溫室門，作廢留 scratch）。
- ⚠⚠ **下一個美術 session 的第一件事：跑剩下 6 格**（road／avenue／carriage／backhall／cellar／terrace）—— Ray 已說「跑完」，
  **提示詞全文在 `_sofiaout_spec.md` §四**，產線照那一節（附 `sofiaout_forecourt` 當色票、兩串並行、每 6～7 分鐘切前景收圖）。

### 資產盤點（sofiaout）
| id | 狀態 |
|---|---|
| lodge／forecourt／hall／salon | ✔ 不欠（下午單張、`noTime`） |
| road／avenue／carriage／backhall／cellar／terrace | ✔ 2026-09-26 12:10 入庫（下午單張、`noTime`）；⚠ `backhall` 往下石階不明顯，重出與否等 Ray |
| gate | ✔ 不欠（跨圖出口，不畫） |
| 小地圖 | ⚠ 欠 —— 拓樸 Ray 點頭後另開（`tools/map_compose.py`） |


## 十一、2026-09-26（Mac）：羅賽爾廢城（舊稱無人廢城，程式端 ver -1753 已正名並搬進 `TOWNS.dunmor`）小地圖 ✔ 交件
- `resources/map/map_dunmor.webp`＋`_spots_dunmor.json`＋`_icons_dunmor.png`；做法與程式端要補的那一行在 `resources/background/_dunmor_spec.md` §十。
- 美術工單三份的標題已改成「羅賽爾廢城」；地圖 id 維持 `dunmor`。
- 聖索菲亞郊外那 6 格已由別的美術 session 補完（`a6c0cc4`），§十那一句「6 格沒跑」作廢。
- ⚠ 產線：GPT 的圖示表格子不均勻 —— 別直接餵 `map_compose.py`，先切符號重排（作法見 §十）。

## 十二、2026-09-26 下午（Mac）：聖索菲亞四張同名覆蓋 ✔ 交件
- `sofia_slum`（拿掉碼頭）／`sofia_guild`／`sofia_firearm`／`sofia_grocerie`（改室內）；驗收表在 `resources/background/_sofia_add_spec.md` §六。
- ⚠⚠ Ray 定的全域規矩：**只要是個店的都要室內**（日後任何城的店都照這條，不要再交店門口街景）。
- 程式端：`ASSET_VER` 四鍵、`dock` 中文名 —— HANDOFF 第 12 項。
- 還欠：`map_santasofia` 的 `dock` 圖示換貧民窟簡筆（美術單，未開）。
- 薇拉馮德拓樸 v2（帝都加強版）等 Ray 點頭：`resources/map/_verafond_spec.md` §三 有四個待定問題。

## 十三、2026-09-26 晚～09-27（Mac）收工換機器 —— 薇拉馮德 73 張・惡棍 6 張・索拉娜三張回版

### ✔ 做完、程式端也接了
| 件 | 交件 | 程式端 |
|---|---|---|
| **薇拉馮德港 `verafond`**（拓樸 v2 Ray 定案；「整座城義大利風、當世最富庶的港都」「1900 年」） | 背景 **73／73**（`resources/background/verafond/`；室外 15 格四差分、店內單張、旅店四差分、酒吧三差分、咖啡廳／甜品店單張）；工單 `resources/background/_verafond_spec.md`（§六＝`TOWNS.verafond` 整段，機器產生） | ✅ ver -1764（8af09df）接上 22 格；出航 `sail:{dir:'right'}`；⚠ 旅店暫不寫 `inn:true`（沒有敲門對白表）、店沒有買賣介面 |
| 聖索菲亞四張同名覆蓋（§十二） | `sofia_slum`／`guild`／`firearm`／`grocerie` | 見 HANDOFF 12 |
| 聖索菲亞餐飲街「進去是室內」 | 不是圖錯，是 `dining.scenes` fallback＝酒吧 | ✅ 已改三分支（`bar`／`restaurant` 走得進去） |
| **惡棍系 6 張 `man_thug_*`**（Ray：「`ssophia_si_thug` 此系列風格，大多手槍步槍，1900 年」「被突擊的感覺」「不要女的、表情動作多變化」） | `resources/enemy/man_thug_{pistol,shotgun,rifle,dual,lookout,boss}.webp`，真 alpha；工單 `resources/enemy/_thug_spec.md`，總覽 `_thug_all6_sheet.jpg` | 等 Ray 給數值卡（HANDOFF 15） |
| **索拉娜 `remind`／`smile`／`relief` 回上一版**（Ray：「修壞了，回上一版」） | 三張都換回 d556b53（09-20）那版，09-21／22 的重製版進 `_recycle/` | ✅ `?v=` 已跳（-1767／-1768／-1783），取景用重量值 |
| **索拉娜 `ready`／`readysmile` 回上一版**（09-27 Windows；Ray：「改回來」） | 兩張換回 d556b53（09-20），09-21 重製版（95d5226）進 `_recycle/` | ⚠ 待接：HANDOFF 第 19 項（兩張都跳 `?v=3`；`ready` 取景改 `top:6 bot:1467 fx:0.567`） |
| **索拉娜 alpha 夾 24 張換臉**（09-27 Windows；Ray：「給辦了」） | 全部只換臉、alpha 不動；原 PNG 進 `_originals/si/*_src.png`；新鍵 `ideasmile`／`lookawayupset`／`taunt` | ⚠ 待接：HANDOFF 第 20 項、`resources/si/_sorana_alpha0927_worklist.md` |
| **蕾娜 `holdnouvelle` 換臉**（09-27 Windows，alpha 夾） | `renna_si_holdnouvelle.webp`（新檔，alpha 不動）；原 PNG 進 `_originals/si/` | ⚠ 待接：HANDOFF 第 21 項（`.png`→`.webp`，之後回收舊 PNG） |

### ⚠ 還開著（下一台接手）
- **等 Ray**：薇拉馮德的 **bgm**；**酒吧 `vela_bar` 掛哪一格**（餐飲街四向滿、碼頭右邊給了出航）；惡棍 6 人的**數值卡**；廢城 `hallcourt` 正門、郊外 `backhall` 石階要不要重出；郊外結算點（囚室／露台）。
- **美術待開**：① **薇拉馮德小地圖**（`tools/map_compose.py verafond`，POS 已在 `map_layout.py`；GPT 圖示表格子不均勻要先切符號重排，見 §十一）② **聖索菲亞小地圖**：`dock` 船錨圖示換貧民窟、補 `bar`／`restaurant` 兩個點。
- ⚠⚠ **工作樹裡有三個刪除不是美術做的、也沒走回收區**（都沒 commit，檔案在 git 裡救得回來）：
  `resources/enemy/man_thug_boss.webp`（惡棍幹部，原稿在 `_originals/enemy/man_thug_boss.png`）／`resources/si/npc/corvin_si_ecstasy.webp`（`speakers.js` 還指著它）／`resources/si/gen_renna_si_blush.webp`。另外 `docs/girl_star_economy.xlsx` 有改動。**問 Ray 是不是他刪的再動。**

### 產線的坑（這一輪學到的）
1. **ChatGPT Go 方案真的有圖像上限**：頁面明寫「你已達 Go 方案的圖像生成要求上限，1 小時後重置」—— 有這段字才是額度；沒有這段字的「不出圖」照舊先切前景（memory 那條）。這一輪一小時約十幾張。
2. **A/B 二選一**：點了「圖像 2 較好」，後面的時段差分**仍接 A 的構圖**（圓環廣場踩到）⇒ 看下一則差分接哪張再定案，不要先轉檔。
3. **「Unusual activity has been detected」**：一次送太密。先讓其他串跑完，再按那串的「重試」（會把提示詞放回輸入框，再送一次；參考圖可能沒跟上）。
4. **SPA 內點「新聊天」連結不重載頁面** ⇒ 注入的 helper（`__ins`／`__send`／`__grab2`／共通段）留著，換格不必重貼共通段。`navigate` 會洗掉它們。
5. **要「真 alpha」**：第一則要求透明常回**畫上去的棋盤格**（RGB）；在原串追「100% 保留剛剛這張，只把棋盤格背景變成真正透明的 Alpha PNG」一次就過。收件一律先看 `mode` 與角落 alpha。
6. **「慌亂、大吼」只會出同一張驚叫臉** ⇒ 逐張指定一種反應，並明寫「不要張大嘴驚叫（別人用過了）」。
7. **程式端支援 `sail.dir`**：入口的 `down` 被佔用時出航可以掛別的方向（薇拉馮德掛右、木雅克神殿掛左）。
8. **不要用 `dining.scenes`**：新城一律「餐飲街＝街道，店走得進去」。
9. **有程式 session 在線時**：`ListAgents` → `SendMessage` 直接通知它接交接項目（這一輪 remind／smile／relief／薇拉馮德都是這樣接的，比等 Ray 轉交快）。

## 十四、2026-09-27（Mac → 交 PC）：一張 GPT 拒畫的 alpha，**走本機**（Ray：「gpt 拒畫，這張走本機，進交接我去 pc 做」）

> ✅ **結案（09-27，Windows）**：Ray：「不用了 gpt 生了 結案」—— GPT 最後出了 alpha，**不走本機 matting**。PC 這邊沒動任何檔案。以下留著當紀錄。

- **檔案**：`resources/si/npc/64ea1d7a-d141-499d-b8ae-2b2ed7a7cd04 (1).png`（未入版控；`~/Downloads/64ea1d7a-…cd04.png` 是同一張，已逐位元組比對）
  內容：聖索菲亞的惡棍（繡花背心、紅腰巾、長靴，被打得後仰、手槍脫手）架著白髮深膚的女孩（破白洋裝、哭喊）。1024×1536。
- **現況**：RGB，**背景是畫上去的灰白棋盤格**（不是白底，也不是 alpha）。GPT「100% 保留，只把棋盤格變真透明」那句被拒。
- **Ray 核准走本機**＝憲法 §5 ver -1516 那一條：`tools/si_matting.py`（ToonOut ＋ pymatting），只有 PC 那台有 `.venv-matting`。
- ⚠⚠ **它的前提是白底**：前景色 F 是用 `I = αF + (1−α)B`、**B＝白** 解出來的。這張的 B 是棋盤格 ⇒ 半透明的髮絲／布邊會混進格子的灰，疊上深色背景就是一圈雜點。建議順序：
  1. 先只跑 alpha（`--raw-alpha`，看 α 本身有沒有把棋盤格判成前景 —— 格子是規則的高對比紋理，最容易被誤判）；
  2. α 乾淨的話，前景色**不要用「B＝白」那一段**，改用 pymatting 的 `estimate_foreground_ml(image, alpha)`（不需要已知背景色）；
  3. 驗收照 §5：`matting_eval.py crops` 出 100% 裁切、深色棋盤上用眼睛看，**不准看縮圖**；近白比例這張不準（白髮），看像素數。
- 交件：轉 webp（`cwebp -q 85 -alpha_q 100 -exact`）放 `resources/si/npc/`，**檔名還沒定**（這張是 UUID 檔名，要問 Ray 叫什麼、給哪一段劇情用），原 PNG 進 `resources/_originals/SI/NPC/`。

## 十五、2026-09-27～28（Mac）收工 —— 蘿媞六張・cry 手指・市政廳室內・惡棍群體

### ✔ 做完、程式端也接了
| 件 | 交件 | 程式端 |
|---|---|---|
| **`npc_ss_loki` 六張重畫：拿掉頭巾與腰巾**（Ray：「保留原風格重畫」）→ 程式端隨後整批改名 **`loti`／蘿媞**（ver -1801） | `resources/si/npc/npc_ss_loti_{ask,give,guard,happy,sad,shock}.webp`；先畫 `ask` 當新基底，其餘五張「新基底髮型服裝＋原圖姿勢表情」各自重畫（每串上傳兩張圖）；舊原稿 `_originals/SI/NPC/_npc_ss_loti_*_v1_headscarf.png` | ✅ -1795 |
| **蘿媞 `cry` 手指**（Ray：「手指數量不對」） | ⚠ 第一次（520de78）我數成五指、其實**六指**，被 Ray 退。改走 Ray 的流程：GPT 重出（失敗）→ **Gemini 修指兩輪**（第一輪只修好右手；第二輪在多的那根**畫紅圈**才修好左手）→ GPT 重繪清晰版＋真 alpha。原稿 `_originals/SI/NPC/_npc_ss_loti_cry_v1_fingers.png`／`_v2_sixfingers.png` | ✅ -1804（`?v=3`） |
| **聖索菲亞市政廳室內 `sofia_cityhall_in`**（程式端開的美術單，參考插畫 `34_rennacityhall`） | `resources/background/sofia/sofia_cityhall_in.webp`（單張 day、無時段尾綴 ⇒ `noTime:true`） | 等程式端把櫃台那段 `bg` 改指它（HANDOFF 頂部那條已標「美術已交」） |
| **惡棍群體 `man_thug_squad`**（Ray：「四五個人，躲翻倒的沙發，向主角射擊」） | v3 定稿：5 個**全新**角色（老水手／油頭刀疤臉／草帽胖子／眼罩捲髮青年／黑帽大鬍子）、系列低彩度土色、**五把槍口全對 viewer**、沙發超寬超出畫面。v1（與現有 thug 撞造型）、v2（配色太雜、槍口亂）都進 `_recycle/`，原稿 `_originals/enemy/_man_thug_squad_v{1,2}_*.png` | 還沒引用（等腳本／敵人卡） |

### ⚠ 還開著
- **§十四 那張 GPT 拒畫的 alpha**（`resources/si/npc/64ea1d7a-…cd04 (1).png`，棋盤格底）—— Ray 說去 **PC 走本機 `si_matting.py`**，作法寫在 §十四（前景色別用「B＝白」）。檔名還沒定。
- **原本的惡棍畫風參考 `resources/si/npc/ssophia_si_thug.png` 已經不見**（原位、回收區都沒有，也從沒入版控）—— 不是美術刪的；之後惡棍系的畫風參考改用 `_originals/enemy/man_thug_dual.png`／`man_thug_pistol.png`（乾淨原稿，不要用深底總覽 jpg）。
- 其餘等 Ray 的（酒吧 `vela_bar` 掛點、廢城／郊外重出、小地圖兩張）照 §十三。

### 這一輪學到的（產線）
1. **驗手指：每隻手單獨原尺寸放大、逐根列指尖再數**，兩隻都要重數（模型常只修好一隻）。要刪哪根就**在圖上畫紅圈**上傳 —— 文字「每隻手 5 根」沒用。（已寫進 memory `count-fingers-at-full-zoom`）
2. **Gemini 的上傳選單／Cmd+V 要 Chrome 視窗在前景**才吃得到；不在前景時選單打不開、貼上也送不進去（合成 paste／drop 事件都無效）。卡住就請 Ray 把 Chrome 拉到前景。
3. **Gemini 生成圖的下載**：「下載原尺寸」按了不落地；在頁面內把 `<img>` 畫到 canvas 再 `toBlob` 下載可行，但只有預覽尺寸（682×1024）——所以一定要**回 GPT 重繪成 1024×1536**（本來就要回 GPT 去背）。
4. **群體敵人**：①參考圖用乾淨原稿、②色調限定系列色、③**逐把點名檢查槍口方向**（第一次常有兩把朝旁邊）、④要「不同角色」就**點名禁掉現有系列的招牌造型**。
5. `file_upload` 只能讀專案與 scratchpad：`~/Downloads` 的檔要先複製到 scratchpad 再上傳。

## 十六、2026-10-04（Windows 3070）：背景雷同修正 9 組＋北泊櫃台去背＋主祭壇點亮版＋親衛隊正式版 —— ✔ 全部交件、已入庫

### ✔ 做完（程式端也接了）
| 件 | 交件 | 程式端 |
|---|---|---|
| **背景雷同修正 9 組（37 張）**（Mac 審查工單 `resources/background/_similarity_audit_20261003.md`） | Ray 中途改方向：「有雷同的圖要整張重繪，不是小改」→ 7 組整張重繪（vela_cathedral／vela_midtown／capital_cityhall／capital_church／east_university／ruins_shinier_deepspring／shinier_altar），北泊 grocery／east 只改招牌字（含 `_bf`）。逐張結果在工單末段「交件紀錄」。commit `ffba450d` | ✅ HANDOFF 已結案 |
| **北泊公會櫃台 `si/npc/npc_guildcounter_si_northport`** 重新去背（Ray：「去背不全」：臂與馬甲夾縫白塊、髮側白邊） | GPT「100% 保留，只把白色背景變成真正透明 Alpha PNG」一次過，近白邊 64%→0%，位置不變 | ⚠ 眨眼補丁要重跑（HANDOFF 第 7 項） |
| **主祭壇點亮版 `background/dunmor/dunmor_altar_lit`** | **Ray 指定改用 Gemini**（「先給 gem 畫，達標就直接用」）：附 `dunmor_cairn` 原圖／`_lit` 當示範，一次達標；結繩紋亮成實心光帶，比小祭壇的細線略簡化 | ✅ -1998 |
| **親衛隊正式版 `enemy/man_misha_guards`**（取代 Gemini 代圖） | GPT：金髮馬尾女兵／銀髮老兵／黑髮士官，三把槍口都對鏡頭；胸章由鳶尾花（法國真實紋章）換成原創星形劍徽；連背景（主祭壇）一起畫 | ✅ -1998 |
| 插圖「主角被刺穿」 | GPT 出了一張（米夏正面突刺、強透視、主角只露背影），**Ray 說他自己處理**，美術沒交件（線上已是 Ray 的 `038_mishasting`） | — |

### 這一輪學到的（產線）
1. **「雷同」要整張重繪，不是局部改**（Ray）。作法：**不上傳舊圖**（上傳就沿用原型），只附「同城另一個場景」當畫風參考，文字指定新設計並**點名要避開的真實地標**；出圖後再自己判一次像不像別的地標（帝都行政廳第一版就成了巴黎市政廳）。
2. **時段差分**：重繪那幾組**不附舊時段圖**（舊構圖會把舊建築帶回來），光線用文字描述；構圖沒變的（只改招牌）才附舊時段圖當光線參考。夜景一律「不畫月亮本體、只要銀藍月光」。
3. ⚠ **提示詞別寫「新月」**：這個世界只有滿月 —— 我寫了「新月浮雕」，大教堂立面就長滿新月，要重修。
4. **Gemini 只在前景分頁動**：背景分頁的上傳不會掛上、送出不會送、還會凍結 renderer。**同時只開一個 Gemini 分頁**，依序跑。
5. **Gemini「下載原尺寸」不落地的解法（拿得到 2528×1696 原尺寸）**：在頁面裡包住 `fetch`（網址含 `rd-gg`／`s0-d`）與 `URL.createObjectURL`，攔下它抓到的那個 blob，再用自己的 `<a download>` 存檔。§十五第 3 條「只能拿預覽尺寸」作廢。
6. Gemini 的對話頁有 Trusted Types，`eval(localStorage…)` 會被擋（只有 `/app` 首頁能用）—— 對話頁裡的程式一律直接寫。
7. **同一台 Chrome 別兩個 session 同時用**：下午眨眼那條也在用，我的分頁被關、前景被搶。
8. 覆蓋＝先回收再寫：寫新檔之前確認目的資料夾存在（`_originals/enemy` 不存在害我空窗一分鐘）；bash 路徑不能直接餵 Windows 的 Python。

### ⚠ 還開著（美術）
- 廢城 `hallcourt` 正門碎石只擋一半，要不要重出 —— 等 Ray。
- `032_rennablush` 插圖還沒交。
- 眨眼半閉 10 張是程式 session 的活（合併要改 `script/blink.js`），美術不碰。

### 資產盤點（這一輪動到的）
| 件 | 狀態 |
|---|---|
| 背景雷同 9 組（37 張） | ✔ 不欠 —— 其餘 405 組審過判不改（工單） |
| `npc_guildcounter_si_northport` | ✔ 不欠（美術）；⚠ 程式端欠眨眼重跑 |
| `dunmor_altar_lit` | ✔ 不欠 |
| `man_misha_guards` | ✔ 不欠 |

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

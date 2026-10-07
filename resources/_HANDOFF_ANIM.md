# 動畫 session 交接（2026-10-06 起，Ray：「這個 session 改為『動畫』，跟美術分開，可以協作」）

> 開工先讀這一份。美術交接（`_HANDOFF_ART_20260925.md`）§十七／§十八 是這條線分家之前的紀錄。

## 分工
- **動畫**＝把既有的圖（CI、怪、立繪）用本機 Wan 做成格動畫，交件進 `resources/`，寫交接給程式。
- **美術**＝產靜態圖（GPT／Gemini）、去背、時段差分。動畫要新的關鍵格（例如 A→B 的 A 圖）就向美術要。
- **程式**＝接線（`config` 的 `tuning.cutinAnim`、CSS、播放器）。動畫 session 同美術一樣**不碰程式**（鐵律 11），交件後用 `ListAgents`＋`SendMessage` 通知程式 session。

## 工具（不在版控，在 `C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\`）
- `tivot_wan.py`：`--mode hit|idle|portrait|ci`、`--style default|beast|eerie`（idle 分系）、`--length`（Wan 格數＝16fps，4n+1）、`--fps`（抽格）、
  `--loop`（首尾鎖同一張）、`--end <圖>`（A→B）、`--lora 檔名:強度`（只接 High 段）、`--prompt "<英文>"`、`--seed`、`--suffix`。
- `batch_monsters.py`：怪物待機批次（每張歇 90 秒、每 10 張歇 10 分鐘，寫 `out/monsters/check.html`）。
- 預覽頁：`out/ci/speed.html`、`out/ci/nou.html`（只播一次、← → 逐格、空白重播）。
- 實測速度（4070 SUPER）：Wan 25 格約 100 秒、49 格約 130～190 秒、65 格約 200 秒。**不要再高估**（Ray 指正過）。
- LoRA：`models/loras/zxtp_wan22_bb_high.safetensors`（Bouncing B，HF `zxtopower/loras`）。⚠ 授權只寫「生成內容可自由發佈」，**上架前要私訊作者確認商用**。

## Ray 定的規矩（這一輪）
1. **CI 從推入到撤出全程都要在動，不可停格**。⚠⚠ **CI 長度逐張由 `tuning.cutinDur` 定**（ver -2032；Ray 跟程式調，動畫不管）：預設 1.5 秒，諾薇兒聖徒化 2 秒、索拉娜共鬥 2 秒。動檔以「那張 CI 長度內看得到的那一段」為準（2 秒×16fps＝32 格），多做的會被截掉。
2. **重交動檔一律開新資料夾**（`_v2`、`_v3`…），不覆蓋。`cutinAnim` 寫 `fps`＝播完停住、只寫 `ms`＝平均分配。
3. **A→B 變身要一鏡到底**：兩段拼接的接點怎麼修都明顯（試過：重生起點、交叉淡化、光流拉近、先快後慢抽格，全部被退）。
   作法：Wan 一次生長一點（4 秒），**剪中間**，丟掉結尾吸附到 B 的那幾格。
4. 平均抽格比「極點停留＋大跳格」好；加速播放比慢播好。
5. 怪：野獸系伏身低喘、不舉手；聖遺物／葬系／守墓者要詭異；3 秒 24 格。
6. 乳搖：中文提示詞幾乎沒用；英文寫物理過程有一點；Bouncing B LoRA 最有效但節奏不受控（每 0.6 秒一彈）。諾薇兒要「被手臂擠壓變形」不是甩。

## 交件現況
| 件 | 位置 | 狀態 |
|---|---|---|
| 索拉娜共鬥 CI | `resources/ci/anim/ci_sorana_predator_v7/`（**32 格、2 秒**，`ms:2000`）＋退路圖 `ci/ci_sorana_predator_start.webp` | ✅ 已接（-2033）：`ASSETS.ci_sorana_predator` 改指 `_start.webp`，`_v5` 已回收；舊靜態圖 `ci_sorana_predator.webp` 已無引用（未刪）。原圖改用 `ci_sorana_predator1.png`（眉毛清楚）；A 段＝LoRA 1.5 單彈一下的第 0～7 格；B 段＝從 A 第 7 格接、同樣的風、LoRA 0.6、咬刀、seed 1（Ray：「可以了 交件」） |
| 諾薇兒聖徒化 CI | `resources/ci/anim/ci_nouvelle_saintinstall_v1/`（56 格、3.5 秒） | ✅ 程式已接（-2028）；⚠ -2029 CI 改回固定 1.5 秒 ⇒ 只看得到前 24 格左右（變身剛完成就撤），要不要重剪成 24 格等 Ray。靜態退路圖仍是舊 B 圖 —— 要換成 `saintinstall1` 得交 webp（新檔名），等 Ray |
| 安雅**惡夢化（NI）發動** CI | `resources/ci/anim/ci_anya_dreambreaker_v1/`（64 格；⚠ 資料夾名是誤植，實際是 NI 發動） | ✅ 已接（-2036）：`cutinAnim.ci_anya_ni` 取 `pick:{from:24,to:56}`（去頭 1.5 秒、去尾 0.5 秒、原速 16fps、32 格 2 秒）。`ci_anya_dreambreaker_start.webp` 目前沒人用 |
| 安雅夢境粉碎（DB）CI | 待做 → 交件開 `ci_anya_dreambreaker_v2/` | ⚠ 欠（等 Ray 給 A／B 圖） |
| 安雅 OBE（熔斷）抱頭崩潰 CI | `resources/ci/anim/ci_anya_obe_v1/`（64 格、4 秒） | ✅ 已接（-2037，`ms:4000`；CI 仍 1.5 秒，只播到第 25 格左右，加長等 Ray）。單張 `ci_anya_obe.webp` 自由動 4 秒、無 LoRA、seed 7 |
| 諾薇兒 OBE 崩潰金光爆散 CI | `resources/ci/anim/ci_nouvelle_obe_v1/`（64 格、4 秒） | ✅ 已接（-2037，結局全畫面 CI 也能播動檔了；CI 仍 1.6 秒，加長等 Ray）。⚠ 原圖 1122×1402（4:5），送 Wan 前**左右各裁 94 px 成 2:3**，動檔比靜態圖窄；無 LoRA、seed 7 |
| 賽西莉聖徒化 CI | `resources/ci/anim/ci_cecilie_saintinstall_v1/`（80 格、5 秒） | ✅ 已接（-2039）：Ray「前兩秒去掉、最後一秒也去掉」⇒ `pick:{from:32,to:64}`、32 格 2 秒（cutinDur 2000 暫照諾）。沒有常態 A 圖 ⇒ 先倒播法（B 往回散光再倒放）生出常態格，**拿那一格當 A、原圖當 B，A→B 一鏡到底**、LoRA 1.0、seed 77。法環快速閃現、力量從周身升起（Ray）。⚠ 第 0 格（常態）只有 480 寬的 Wan 輸出，沒有高解析原圖 |
| 米夏夢魘化 敵人待機 | `resources/enemy/anim/man_misha_ni_idle_v1/`（24 格、3 秒循環、8fps、原圖畫布座標 box） | ⚠ 10-07 交件待接（Ray：「s7 可以 交件」）。法環緩轉、金色氣浪升騰、髮衣飄起；seed 7。⚠ 原尺寸解碼約 64 MB，程式端可縮 |
| 怪物待機 94 隻 | `tivot_wan/out/monsters/`（未進 resources） | ⚠ 等 Ray 檢查 `check.html`；每隻解碼約 33 MB 記憶體，交件要提醒程式做釋放 |

## 等 Ray
- 2 秒以上的 CI 長度是只給有動畫的 CI，還是全部 CI 統一。
- 怪物 94 隻檢查結果。

## 這一輪學到的（索拉娜 v5）
- 乳搖只晃一次：A 段用 LoRA 跑一晃，**末格當 B 段的首格**接下去；B 段 LoRA 調到 0.2 才不會再大晃。
- B 段首尾鎖同一張 ⇒ 人會被定住（Ray 退）；不鎖 ⇒ 會慢慢下沉（Ray：下沉不是問題）。
- 嘴：提示詞寫「嘴閉著」沒用，寫「牙齒咬著匕首」才有用；仍不保證 ⇒ 抽 seed 挑。蓋原圖的臉會「整張掉下來」，不要再用。
- 接段的斷感：①**接點選胸部靜止的那一格**（不是回到原位那一格，回原位時還在高速回彈）②**兩段的風寫成一字不差**，只改胸部那句 ③B 段 LoRA 0.6 比 0.35 接得順。**不准交叉淡化**（Ray 明令）。
- 3 秒一次生成壓不住「後面只小晃」（LoRA 1.5 每 0.6 秒大彈一次），一定要 AB 兩段。
- 沒有 A 圖時：**倒播法生一格常態 → 那一格當 A → 正向 A→B**。直接用倒播成品會「先手動完才亮光」（Wan 把兩件事排成先後）。
- ⚠ ComfyUI 輸出檔名同名同 seed 會**跨輪接著編號**，不能用「第 N 張」去抓某一輪的格 —— 從 `out/` 該輪資料夾拿。
- ⚠ Ray 接檔時常常**去頭去尾只留中段**（安雅 NI 24～56、賽西莉 32～64）：動檔可以生長一點，精華放中段，程式用 `pick` 截。

## ⚠⚠ CI 改用影片（10-07，Ray：「動畫都歸你管，程式負責接，做吧」）
- 交件：`resources/ci/video/<cutinAnim 的鍵>_v1.mp4` ×8（H.264 High、yuv420p、**480×720、16fps**、crf 22、faststart、無音軌），合計 8.7 MB（`_c12` 序列 9.5 MB）。
- 內容＝Ray 剪定的 16fps 原片（與 `_c12` 同一段，只是沒抽格縮圖）：索拉娜共鬥 18 格／諾聖徒化 56／安雅 NI 45／安雅 OBE 64／諾 OBE 64／賽西莉聖徒化 50／賽西莉 OBE 32／索拉娜飛刀耗盡 26。
- 為什麼：序列要把每一格解碼常駐記憶體；影片只留當前一格、走硬體解碼 ⇒ 記憶體近零、不燙，畫質可回 480／16fps。
- 程式端要注意：`muted playsinline`＋預載；第一格出來前顯示靜態圖；CI 撤下時停播並釋放（`src=''`＋`load()`）。只交 mp4（全平台可播）。
- ✅ 已接（ver -2060，`d023ce51`）：`cutinAnim[鍵]={ video:'resources/ci/video/<鍵>_v1.mp4' }`，cutinDur 不變（片長＝CI 長）；開演前整支 fetch 成 blob、開演才建 `<video>`；`_c12` 序列已回收。驗收頁 `tools/ci_review.html` 可逐格（1/16 秒）。
- 之後新 CI 動檔：動畫端直接交 mp4（同規格）＋留 16fps 格序列在 `tivot_wan/out` 備查。

## 中槍倒下（10-07）
- **目標格數決定生成長度**：只要 5 格就生 1 秒（`--length 17`），不要生 3 秒再抽（Ray：「目標只有 5f，一開始跑 16f 不就好了」）。生成時間約三分之一。
- 抽 5 格、**不均抽**：0、15%、33%、60%、100%（中彈到後仰最大那段密抽 3 格才有速度感），最後一格＝倒地。
- 倒法：掩體前／無掩體＝往前倒；掩體後＝往後倒；臥射＝垂頭；跪射無掩體＝往前倒。沒有血、沒有槍火（引擎有槍火）。
- 交件解析度可低（群戰的人轉回原圖位置與大小）；往後倒的人要讓掩體蓋在他上面（程式疊層）。
- ✅ **群戰中槍交件（10-07，Ray：「可以 交件」）**：`resources/enemy/anim/<場>_hit_v1/thug_N/frame_00~04.webp`＋`anim.json`（`canvas` 1024×1536、`box`＝這人 5 格聯集在原圖畫布上的 [x,y,w,h]、`kind` back/forward/prone）；總表 `resources/enemy/anim/_squad_hit_v1.json`。共 26 人、4.7 MB。
  ⚠ 這批是 3 秒原片抽 5 格（之後改生 1 秒）；第 0 格與原分層位置差約 10～20 px（Wan 第一格已在動、槍口火光已拿掉）。
- ✅ **帝都教廷衛士 16 人＋米夏親衛隊 3 人中槍交件（10-07，Ray：「敵倒地全過 交件給 code」）**：
  `resources/background/capital/fight_<場>_hit_v1/guard_N/`（場＝hotel/uptown/square/downtown，畫布 1536×1024）、
  `resources/enemy/anim/man_misha_guards_hit_v1/guard_N/`（畫布 1024×1536）；每人 frame_00~04＋anim.json（canvas／box／kind）；總表 `resources/enemy/anim/_guards_hit_v1.json`。約 3.9 MB。
  **抽格（Ray 定）**：生 1 秒（16 格），**第 1 格＝遊戲原本的分層（不另交）**，之後原片第 7、9、11、13、15 格（1 起算）—— 第 3 格也不要，中彈直接跳。
  倒法：衛士 16 人全往後倒（無掩體站姿，預設後倒）；親衛隊 1 號蹲射往前倒、2／3 號往後倒。

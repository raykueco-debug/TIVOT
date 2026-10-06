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
| 安雅夢境粉碎 CI | `resources/ci/anim/ci_anya_dreambreaker_v1/`（64 格、4 秒，`fps:16`）＋退路圖 `ci/ci_anya_dreambreaker_start.webp` | ⚠ 10-06 交件待接。Wan A→B 一鏡到底（A＝`dreambreaker0` 手張開、B＝現行 `dreambreaker.webp` 握拳金光）、LoRA 0.5、seed 77，取全 64 格（Ray：「後段再加長用 77」）。CI 長度 Ray 跟程式調。原 png 已收 `_originals/CI/` |
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

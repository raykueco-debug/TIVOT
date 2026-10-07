# 動畫 session 交接（現況：2026-10-07 晚）

> 開工先讀這份。這份只留**現況＋做法＋原則**；舊版在 `_recycle/resources/_HANDOFF_ANIM.md`。
> 動畫 session 在 2026-10-06 從美術 session 分出來（Ray：「這個 session 改為『動畫』，跟美術分開，可以協作」）。

---

## 一、分工

| session | 管什麼 |
|---|---|
| **動畫** | 把既有的圖（CI、敵人、立繪）用本機 Wan 做成動畫，挑格、轉回原圖座標、交件進 `resources/`、通知程式 |
| **美術** | 產靜態圖、去背、分層、時段差分。動畫要新圖（A 圖／乾淨背景／去背分層）就**開單給美術** |
| **程式** | 接線（config、播放器、疊層）。**動畫和美術都不碰程式**（憲法鐵律 11） |

- 跨 session 溝通：`ListAgents` → `SendMessage`。程式 session 名稱常是「版本核對與進度檢查」、美術是「交接美術」（名稱會變，以 `ListAgents` 為準）。
- Ray 原話：「動畫都歸你管，程式負責接」—— **用什麼格式交（影片／序列）由動畫決定**，程式照接。

---

## 二、環境與工具

### 本機 Wan（4070 SUPER、16 GB RAM）
- ComfyUI：`C:\Users\Ray Ku\Desktop\ComfyUI-master\`，專用 venv `ComfyUI-master\.venv`（**不要動系統 Python 那份**）。
- 模型：Wan2.2 I2V A14B GGUF Q4_K_M（High／Low）＋ LightX2V 4 步 LoRA ＋ umt5 fp8 ＋ wan_2.1_vae。
- ⚠ 記憶體只有 16 GB：`tivot_wan.py` 會自己用 `--lowvram --disable-smart-memory --cache-none` 啟動 ComfyUI。**跑 Wan 時不要開 SD／其他 ComfyUI**（Ray 忘了關 SD 那次，一步 198 秒）。
- 實測：一段 Wan **約 90～200 秒**，長度影響不大（大頭是載模型與固定成本）。**不要高估時間**（Ray 指正過）。
- 動作 LoRA（在 `models/loras/`）：
  - `zxtp_wan22_bb_high.safetensors`（Bouncing B，只有 High）—— 乳搖最有效，但節奏固定約每 0.6 秒一彈。
  - `zxtp_wan22_m0tt0_high/low.safetensors`（Motto Hayaku，High＋Low）—— 晃動頻率較慢；強度 1.3 以上會帶入鏡頭晃動。
  - ⚠ 兩者都來自 HF `zxtopower/loras`，授權只寫「生成內容可自由發佈、不必付費」，**沒寫商用 —— 上架前要私訊作者確認**。

### 工具資料夾 `ComfyUI-master\tivot_wan\`（⚠ 不在版控；**備份在 `TIVOT/tools/anim/`**，換機器從那裡拷回）
| 檔 | 用途 |
|---|---|
| `tivot_wan.py` | 主工具。`--mode hit\|idle\|portrait\|ci`、`--style`（idle：default/beast/eerie；hit：back）、`--length`（Wan 格數，16fps，**必須 4n+1**）、`--fps`（idle 抽格）、`--frames`（hit 抽格數，**0＝全格**）、`--loop`（首尾鎖同一張）、`--end <圖>`（A→B）、`--lora 檔:強度`（High）、`--lora-low 檔:強度`（Low）、`--prompt "<英文>"`（覆蓋內建）、`--seed`、`--reuse`（沿用上次同 seed 的 Wan 原片只重抽格，不重跑）、`--suffix`、`--out` |
| `batch_*.py` | 批次（monsters／hit／squad／guards），每支之間歇 30～90 秒讓顯卡休息；`out/*_batch.log` 看進度 |
| `pick_*.py` | 抽格＋產總覽頁（`out/<x>_pick/index.html`，播一次、空白鍵重播） |
| `deliver_*.py` | 把 Wan 的格**轉回原圖畫布座標**、裁成全格聯集框、寫 `anim.json`、存進 `resources/` |
| `serve_player.py`＋`make_player.py`＋`out/player.html` | **播放器**（下方） |

### 播放器 animechk
- 桌面 **`animechk.bat`**（備份 `tools/anim/animechk.bat`）：先砍掉舊的 8130 伺服器、再啟動、再開 `http://localhost:8130/player.html`。
- 功能：選動畫（`[遊戲交件]`／`[輸出]`／`[ci]`／`[hit]`／`[guards]`／`[squad]`／`[monsters]`）、點縮圖勾掉不播（可拖曳多選）、一次／循環、逐格（← →）、倍速 0.1～3×、顯示原始秒數與保留後秒數、**⬇ 輸出**（存到 `out/export/<名字>/`，附 `preview.html` 與 `export.json`）。
- 網址可帶 `#資料夾`（例：`player.html#guards/hotel_guard_1`）直接定位。
- ⚠ **開頁面給 Ray 之前先確認伺服器活著**（`netstat … 8130 LISTENING`）。伺服器死掉過兩次。
- ⚠ **不要在 Ray 用播放器時搬動 `out/` 底下的資料夾**（搬走後他輸出會失敗、留下空資料夾 —— 發生過）。

### 其他
- ffmpeg：`C:\ffmpeg\bin\ffmpeg.exe`。
- ChatGPT 去雜物／改圖：Claude in Chrome，`file_upload` 只能上傳**專案資料夾內**的檔（scratchpad 不行 → 先拷到 `resources/_originals/…`）。

---

## 三、Ray 定的原則（最重要）

1. **不准交叉淡化**（「永遠不要，爛死了」）。後製只准**整格取捨**，不准半透明疊兩張。接點問題從生成端解。
2. **CI 從推入到撤出全程都要在動，不可停格**。CI 長度逐張由程式的 `cutinDur` 定（Ray 跟程式調），動畫只要「那段時間內看得到的部分」夠長。
3. **要幾格就生多長**：中槍只要 5 格就生 1 秒（`--length 17`），不要生 3 秒再抽（「目標只有 5f，一開始跑 16f 不就好了」）。但 **8 格（半秒）太短，人來不及倒**（實測只會張嘴），中槍至少 1 秒。
4. **重交一律開新資料夾**（`_v2`、`_v3`…），不覆蓋已交件的檔。換掉任何已交件的檔**先問 Ray**，並走 `tools/recycle.sh`。
5. **沒有血、沒有槍火**（遊戲引擎自己有槍火）。提示詞要逐項寫死：no blood stains/drops/spray/red liquid/wounds、no muzzle flash/bullets/sparks/smoke/light effects。
6. **工不是優先，成品的品質、效率、資源才是**：先找最優解，再談工夫。
7. 給 Ray 看的預覽頁**不要 loop**：播一次停在最後，可重播。
8. 動畫格式：**CI（不透明、一次性）→ 影片 mp4**；**敵人（透明、循環／倒地）→ 長期最優是 GPU 壓縮貼圖（KTX2）**（尚未實作；目前交 webp 序列）。

---

## 四、各類動畫的做法（照抄可用）

### A. CI（全畫面 cut-in，不透明）→ 交 mp4
- 規格：H.264 High、yuv420p、**480×720、16fps**、crf 22、`-movflags +faststart`、無音軌。路徑 `resources/ci/video/<cutinAnim 的鍵>_vN.mp4`。
  `ffmpeg -framerate 16 -i frame_%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an out.mp4`
- 程式那邊已改成 `<video>` 播（ver -2060）：開演前 fetch 成 blob、第一格出來前顯示靜態圖、撤下時釋放。
- **一張圖自由動**（崩潰類）：`--mode ci --length 65`（4 秒），首尾不鎖。
- **A→B 變身**：`--mode ci --end <B圖>`，**一鏡到底**生長一點（4～5 秒）、**剪中間**，丟掉結尾吸附到 B 的那幾格。兩段拼接怎麼修接點都明顯（試過重生起點、淡化、光流、先快後慢抽格，全部被退）。
- **沒有 A 圖（只有結尾那張）→ 倒推法**：從原圖生「力量散去／手收回／表情放鬆」的反向動作，取最後一格當 A，再正向 A→B。直接倒播成品會變成「先動完才亮光」（Wan 把兩件事排成先後），所以一定要「倒推一格 → 正向重生」。
- Wan 會**提早往 B 圖的光效靠**（法環、紅光太早出現）。要控時序：分兩段（先生無光效的手部動作 → 末格當 A → A→B）。
- 圖比例不是 2:3 時，送 Wan 前裁成 2:3（Wan 出 480×720），不然會被壓扁。

### B. AB 兩段接（例：乳搖只晃一次，後面小晃）
- A 段掛 LoRA 跑一晃 → **取胸部靜止的那一格**（不是回到原位那格，那時還在高速回彈）當 B 段首格。
- 兩段的提示詞**除了要改的那句以外一字不差**（風的描述要一樣，不然一進 B 段畫面就慢下來）。
- B 段首尾鎖同一張會把人定住（Ray 退）；不鎖會慢慢下沉（Ray：沒關係）。
- 嘴：寫「嘴閉著」沒用，寫「牙齒咬著匕首」才有用；仍不保證 → 抽 seed 挑。**不要蓋原圖的臉**（會「整張掉下來」）。

### C. 敵人待機（循環）
- `--mode idle --length 49 --fps 8` → 24 格、3 秒、頭尾同姿勢無縫循環、綠底去背成 alpha。
- 分系（`--style`）：野獸系 beast＝伏身低喘、不舉手；聖遺物／葬系／守墓者 eerie＝詭異（頭歪斜頓住、軀幹卡帶抽動、器物各自晃，手固定）；其他＝呼吸。
- 交件：`deliver_idle.py <原圖> <格資料夾> <目的地> <fps>` → 轉回原圖畫布、`anim.json`（canvas／box／frames／fps／loop）。
- ⚠ 原尺寸 24 格解碼可達 60 MB 以上，交件時提醒程式可縮。

### D. 中槍倒下（人類敵人）
- **生 1 秒**：`--mode hit --length 17 --frames 0`（全 16 格）。
- **倒法**（Ray）：掩體前／無掩體＝往前倒；掩體後＝往後倒；臥射＝垂頭；跪射無掩體＝往前倒。站著無掩體 Ray 沒定，目前預設往後倒（衛士那批 Ray 全過）。
- **抽格（Ray 最終定案）**：**第 1 格＝遊戲原本的分層（不另交）→ 原片第 7、9、11、13、15 格**（1 起算）。中彈直接跳到大後仰（前快），之後均速倒地（後慢）。
  （演變：均抽 ✘ → 前段密抽 0/15/33/60/100% ✘ → 3/8/10/13/16 ✘ → 原圖＋7/9/11/13/15 ✔）
- 群體圖：用美術的分層（全身原稿在 `_originals/…/thug_N.png`、`guard_N.png`）一人一支；交件轉回原圖畫布座標（`deliver_squad.py`／`deliver_guards.py`），每人 `anim.json`（canvas／box／kind）。
- 往後倒的人在**掩體後**時，程式要讓他倒下時畫到掩體下面（群戰已接）。

---

## 五、踩過的坑

- **ComfyUI 輸出檔名同名同 seed 會跨輪接著編號**：不能用「第 N 張」去抓某一輪的格（賽西莉 A 圖抓錯過）。一律從 `out/` 該輪資料夾拿。
- 用 `&&` 串批次時，`tivot_wan.py` 最後寫總覽頁若出錯會回失敗、讓下一步不跑（已修 `m.get`）。長批次一律用 `Start-Process` 脫離，再掛背景監看等 log 出現「全部完成」。
- 用 `&` 丟背景的指令**收不到完成通知** —— 要另外掛監看（`until grep … ; do sleep 30; done`），不然會漏通知 Ray（發生過）。
- 提示詞壓不住的：臉（張嘴、眨眼、眼睛變圓）、構圖跑掉（寫「衝刺」就整個重演）、Wan 提早往 B 圖光效靠、LoRA 帶入鏡頭晃動。對策：換 seed、分段、鎖首尾、降 LoRA。
- 背景頭尾不一致（A 圖有雜物、B 圖沒有）→ 整個畫面會像在晃。A／B 要用同一個乾淨背景。
- Wan 第一格已經在動（約差 10～20 px），所以中槍改成「第 1 格用遊戲原圖」。
- **綠眼角色走綠底去背，眼睛會被挖掉**（索拉娜吼叫踩到：原色時眼睛發暗，改鮮綠後整個被挖空、露出後面的火變紅眼）。解法 `rekey_eyes.py`：從 ComfyUI 原始輸出重新去背，臉部範圍內「沒有連到外圍綠幕」的綠色區塊保留。⚠ 臉部範圍是寫死的座標，換角色要改。**不要為了這個去改原圖的眼色**（Ray：太綠；改顏色前要先給他挑）。

---

## 六、交件現況

| 件 | 位置 | 狀態 |
|---|---|---|
| CI 影片 8 支 | `resources/ci/video/*_v1.mp4`（索拉娜共鬥／諾聖徒化／安雅 NI／安雅 OBE／諾 OBE／賽西莉聖徒化／賽西莉 OBE／索拉娜飛刀耗盡） | ✅ 已接（ver -2060） |
| 惡棍群戰中槍 26 人 | `resources/enemy/anim/<場>_hit_v1/thug_N/`（5 場） | ✅ 已接（ver -2062）。⚠ 這批是舊抽法（3 秒原片、5 格不均抽），未照最終規則重做 |
| 帝都衛士 16 人＋米夏親衛隊 3 人中槍 | `resources/background/capital/fight_<場>_hit_v1/guard_N/`、`resources/enemy/anim/man_misha_guards_hit_v1/guard_N/` | ✅ 已接（ver -2070）：原圖停 80ms＋5 格各 80ms＋停 0.6 秒淡出 |
| 米夏夢魘化待機 | `resources/enemy/anim/man_misha_ni_idle_v1/`（24 格 8fps 循環） | ✅ 已接（ver -2069）：程式另存六成尺寸 `man_misha_ni_idle_s60`（約 22 MB） |
| 單人中槍 18 隻（`man_*`） | `tivot_wan/out/hit/`（未交） | ⚠ 舊規格（3 秒、10 格），Ray 未說交件；要做請用 1 秒＋最終抽法重跑 |
| 索拉娜吼叫 CI 3 支 | `resources/ci/video/ci_sorana_roar_{anya,nouvelle,renna}_v1.mp4`（480×720、16fps、2 秒） | ⚠ 待程式接。三層：火（Wan）＋Q 版從右滑入彈抖（程式合成，`compose_roar.py`）＋索拉娜（Wan seed 7，原色＋保護眼睛去背） |
| 怪物待機 94 隻 | `tivot_wan/out/monsters/`（未交） | ⚠ 等 Ray 檢查；長期建議 GPU 貼圖 |

---

## 七、進行中／待辦

0. **安雅 NI 第二段 CI（5 秒，`anya_ni2.png`＝結尾圖）**：左手從右肩往外一揮作灑的手勢（不真的灑出東西）、動作一開始冒金色氣浪、眼睛藍→紅。Wan 逆推起手圖失敗三次（手套變長、眼睛不藍、鏡頭拉遠）→ **已開單給美術出起手圖**（`_HANDOFF_ART_20260925.md` §二十六，交件 `resources/ci/anya_ni1_start.png`）。拿到後跑 A→B 正向 5 秒（length 81）。
1. **安雅夢境粉碎（DB）CI**：還沒做，等 Ray 給 A／B 圖。
2. **敵人動畫改 GPU 貼圖（KTX2/Basis）**：已跟 Ray 分析過是最優解（記憶體 4～8 MB、播放零成本、透明乾淨、循環無縫、逐格精準），還沒實作，要先做一隻試樣量數據，再跟程式談。
3. 惡棍群戰要不要照最終抽法（原圖＋7/9/11/13/15）重做：未問。

## 八、等 Ray
- 單人中槍 18 隻、怪物待機 94 隻要不要交。
- 站著沒掩體的中槍，往後倒還是往前倒（目前預設後倒）。

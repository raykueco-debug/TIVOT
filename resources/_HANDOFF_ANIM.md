# 動畫 session 交接（現況：2026-10-13 00:40，Windows 4070 SUPER 那台收工）

> 開工先讀這份。只留**現況＋做法＋原則**；舊版在 `_recycle/resources/_HANDOFF_ANIM.md.20261013-003836`（git 歷史也有）。
> 動畫 session 只管把圖做成動畫、交件；**不碰程式**（憲法鐵律 11）—— 要接的寫成 `TO_CODE*.md` 交程式。

---

## 一、分工

| session | 管什麼 |
|---|---|
| **動畫** | 本機 Wan／VACE 生成、運鏡合成、挑格、交件進 `resources/`、寫交件單 |
| **美術** | 靜態圖（A 圖、去背、分層）。動畫缺圖就**開單**給美術，或 Ray 指名時自己請 GPT 畫 |
| **程式** | 接線（`config.js` 的 `cutinAnim`／`cutinDur`／`ENEMY_IDLE`、引擎） |

- 用什麼格式交由動畫決定（Ray：「動畫都歸你管，程式負責接」）。

---

## 二、環境（10-12 這台補齊到最新）

### 本機 Wan（4070 SUPER、16 GB RAM）
- ComfyUI：`C:\Users\Ray Ku\Desktop\ComfyUI-master\`，專用 venv `.venv`（**不要動系統 Python**）。
- 模型（`models/`，全部 SHA-256 對過 HF）：

| 檔 | 用途 |
|---|---|
| `unet/Wan2.2-I2V-A14B-{High,Low}Noise-Q4_K_M.gguf` | I2V 主模型 |
| `unet/Wan2.2-VACE-Fun-A14B-{high,low}-noise-Q4_K_M.gguf` | **VACE**（關鍵格釘格號）—— 10-12 下載 |
| `loras/wan2.2_i2v_lightx2v_4steps_lora_v1_{high,low}_noise` | I2V 4 步 |
| `loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_{high,low}_noise` | VACE 用 4 步（`--steps 4 --cfg 1`）—— 10-12 下載 |
| `loras/bounce_test_{High,Low}Noise-000005.safetensors` | ⭐ **乳搖標準 LoRA**（HF `RunningHubAI/rh-bounce-test-*`，10-12 下載） |
| `loras/zxtp_wan22_bb_high` Bouncing B | ✘ 不用：彈太多下、甩髮 |
| `loras/zxtp_wan22_m0tt0_*` Motto Hayaku | ✘ 不用（名字就是「再快一點」） |
| `loras/wan22_live2d_low` | 米夏測過、看不出效果 |

- ⚠ 授權：bounce_test 在 HF **沒標授權**、Bouncing B／Motto 只寫「可自由發佈」—— 上架前要確認（HANDOFF 第 16 條）。
- ⚠ 記憶體 16 GB：**一次只跑一支 Wan**；批次跑著時要插隊，先停批次（批次會跳過已做好的）。
- 實測：VACE 33 格 130 秒、81 格 ~250 秒；I2V 720×1080 49 格 ~255 秒、1080×720 33 格 ~190 秒。

### 工具 `ComfyUI-master\tivot_wan\`（⚠ 不在版控；**備份 `TIVOT/tools/anim/`**，10-12 已同步）
新增／改動（10-12）：

| 檔 | 改了什麼 |
|---|---|
| `tivot_wan.py` | `TIVOT_GEN=寬x高`（生成解析度；CI 運鏡拉近用 720x1080、橫幅插畫 1080x720）、`TIVOT_FIT`（去背模式的主體佔比，振翅會出框的飛行怪用 0.62~0.72）、idle 新增 `--style flyer`（原地懸停振翅） |
| `tivot_vace.py` | `--ci`：整張 CI（含背景）直接餵、輸出不去綠 |
| **`cam_cut.py`（新）** | ⭐ CI 近→遠運鏡合成（見三-1） |
| `deliver_idle.py` | 第 5 參數＝生成時的 fit；畫布四周留 600px，**box 可負數**（振翅超出原圖不會被切） |
| `batch_new_idle.py`／`batch_refit*.py`／`batch_group_idle.py` | 10-12 的批次（見六） |
| `player.html`（animechk） | 資訊列顯示**資料夾名** |
| `run.bat`／`run_idle.bat`／桌面 `animechk.bat` | 加 `set PYTHONIOENCODING=utf-8`（這台主控台 cp950，印 ▶✘ 會整支掛掉） |

- ⚠ 自己用 Bash 跑 `tivot_wan.py` 一律帶 `PYTHONIOENCODING=utf-8`。
- **animechk**：要從**檔案總管**啟動（`Start-Process explorer.exe animechk.bat`）—— 從我這邊的指令視窗啟動，視窗一結束伺服器就跟著死（10-12 死了兩次）。開頁給 Ray 前先確認 `netstat … 8130 LISTENING`。
- 批次一律 `Start-Process … -WindowStyle Hidden` 脫離，`-RedirectStandardOutput` 寫 log，再掛 until-loop 等「全部完成」。

### 產圖
- **GPT**（Claude in Chrome）：A 圖、去光版、黑底版都靠它。⚠ 10-12 額度用完。
  上傳：`find` 找「hidden input accepting image files」→ `file_upload`；送出：`.ProseMirror` 塞字 → 按 aria-label「傳送」的鈕（JS `.click()`）。下載：`fetch(img.src)`→`<a download>`（落 `~/Downloads`）。
- **Gemini：不用**（Ray：「GEM 是個白癡」）—— 10-12 試畫賽西莉特寫，出來是扁平卡通風；圖也無法程式化下載。

---

## 三、Ray 定的原則

### 0. 舊原則照舊
不准交叉淡化／CI 全程在動／重交開新資料夾（`_v2`…）、換已交件先問＋`tools/recycle.sh`／沒有血沒有槍火／一次只跑一支 seed／改顏色先給 Ray 挑／預覽不 loop／火星同向直飛無尾巴。

### 1. ⭐⭐ CI 一律「機戰式近→遠」（10-12，Ray：「賽西莉這一版是目前最成功的 CI，其他 CI 也用這個模式」）
範本：`out/ci/cutin_cecilie_saint_cam_full`（Ray 剪成 v2/v3，程式 -2169/-2171 已接）。

1. **A**＝貼臉特寫、**發動前**（沒有法環／光效、眼睛還是本色），**背景純黑**。GPT 畫，指名「背景純黑、不要任何建築」。
2. **B**＝**原版 CI 圖直接裁半身到大腿**（⚠ 不要用 GPT 重畫的 —— 頭髮會亂；Ray 罵過兩次「用原本的 B」）。
3. **Wan I2V 從 B 原地生 3 秒**（49 格）：`TIVOT_GEN=720x1080 --width 720`，LoRA **bounce_test High/Low 0.8**（⚠ **安雅 0.6**），提示詞寫光效「從第 0 格就在動」。
4. **`cam_cut.py` 合成**：
   - A 原構圖**不縮、不平移**、只微推 1.0→1.03（縮或平移都會露圖邊／歪一側被裁 —— 10-12 踩過）。
   - 換到 Wan 影格那一格，**兩眼位置與臉大小要對齊**：量兩張圖的眼距算 `--zoom`，**放大實量、不要看縮圖**（縮圖會騙人，10-12 誤判過一次）。
   - 10 格均勻緩出拉到半身 → 接 Wan 其餘影格；取景框夾在圖內，不准露黑邊。
   - 賽西莉實際參數：`--close-face 635,545 --hold 24 --face 506,256 --zoom 2.5`。
5. 交 animechk **不裁**，Ray 自己剪。

- ⚠ **為什麼不讓 AI 生運鏡**：VACE／Wan 生「特寫→半身」這種大跨度鏡頭，中間必糊、會亂補（換教堂背景、拉成全身、法環散、衣服跑），試了六版全失敗。Ray：「我用 KEYNOTE 都能做得比這好」。
- ⚠ 提示詞不要用 **step** 這類字（Ray：會產生不需要的效果）；過渡格要給，不然 AI 會亂補。

### 2. 待機動畫：**人以外一拍二**（10-12，Ray：「人以外的待機全部 f 數減半 freeze x2 交件」）
- 怪：**12 格、fps 4**（3 秒）；人：24 格 fps 8 不減半。
- 引擎是等間隔播 `1000/fps`、沒有單格停留 ⇒ 「每格停兩倍」＝取偶數格＋fps 減半。
- **無臉巨人 `saint_gt_ci` 照怪的規格**（Ray 10-12）。

### 3. 插畫動畫（10-12 第一支：017_rennasmile）
- 只有結尾圖時用**倒推法**：從原圖往回生（手放下、睜眼）→ 取中間一格當 A → 正向 A→原圖。
- ⚠ **頭尾都鎖原圖 ⇒ 頭髮飄不起來**（提示詞寫多強都沒用，量過：鎖尾 5.8 vs 不鎖 10.7）。要飄就**不鎖結尾**，代價是最後一格不等於原圖。
- 蕾娜是**綠眼**、睜眼要偏垂半睜（參考 `004_renna_intro`）—— 倒推出來的眼型偏圓萌，要正確得請 GPT 畫睜眼版當 A。

---

## 四、資產盤點（憲法 §0.1：不欠的寫「不欠」、有欠才寫「欠」）

### CI（`resources/ci/video/`）
| CI | 狀態 |
|---|---|
| 賽西莉聖徒化 | ✔ 不欠：近→遠新版 v3（程式 -2171 已接） |
| 賽西莉 OBE／即死防禦／生命歸還 | ⚠ 欠：要改近→遠。OBE 的 A 我提議**直接裁原圖臉部**（OBE 沒有狀態變化，不必等 GPT），Ray 未答 |
| 諾薇兒 4 支（聖徒化／OBE／即死防禦／生命歸還） | ✔ 不欠：Ray「諾不用改」 |
| 索拉娜 補給／OBE／捕食者／吼叫 ×3 | ⚠ 欠：要改近→遠（0.8） |
| 安雅 NI／OBE／清醒夢／夢境粉碎／夢中夢 | ⚠ 欠：要改近→遠（**0.6**）。夢中夢 v5（v4 接紫光爆散，Ray 剪）程式 -2168 已接 |
| 托爾斯滕 BR | ⚠ 欠：要改近→遠（男性，不搖） |

### 怪物待機（`resources/enemy/anim/`）
| 件 | 狀態 |
|---|---|
| 87 隻 `mon_*_idle_v1` | ✔ 不欠：已做一拍二 `mon_*_idle_v2`（117→59 MB）；**程式要改指 v2**（`TO_CODE_idle_v2.md`），之後 v1 回收 |
| 崩岩巨像 `mon_canyon_colossus_dark_idle_v1` | ✔ 不欠（一拍二直接交；程式可馬上接） |
| 空中戰 8 隻 `mon_sky_*_idle_v1` | ✔ 不欠（一拍二；振翅超出原圖，box 有負數）；等有敵人卡才接 |
| 鹿主 | ✔ 不欠：出場的是 `deernightmare`（已有）；變異前 `deer` 那張卡 -870 已撤 |
| 背負祭壇者 `mon_beast_altar` | ✔ 不欠：`out/monsters/` 早就生過；沒有任何卡在用，所以沒交 |
| 卡耶爾單隻小怪 34 張 | ✔ 不欠：是群戰圖層的素材，群戰改用每一層各自的待機（見下） |

### 人型＋群戰待機（**今晚整夜批次中**，見六）
| 件 | 狀態 |
|---|---|
| 米夏／米夏 NI | ✔ 不欠 |
| 單人 9：尼莫、賞金獵人 EP、公會賞金獵人、惡棍 6 種 | ⚠ 批次中 |
| 群戰人 45：惡棍 5 場 26、帝都衛士 4 場 16、米夏親衛隊 3 | ⚠ 批次中（Ray：「群體敵人已經拆分了 可以做」） |
| 卡耶爾大軍 11 組 44 隻 | ⚠ 批次中（怪 → 交件時減半） |
| 索拉娜敵對 `man_sorana`／槍之魔女 `gunwitch_boss_ci`／無臉巨人 `saint_gt_ci` | ⚠ 欠：**不透明整張圖**（沒有 alpha），綠幕做不了 → 要試「整張生成＋首尾鎖」循環；先做無臉巨人一支給 Ray 看（照怪的規格） |

### 插畫
| 件 | 狀態 |
|---|---|
| `017_rennasmile` | ⚠ Ray 說「可以」：`out/ci/rennasmile_A13_free7wind`（不鎖結尾、頭髮飄，2 秒 1080×720）。**還沒交件**：要剪哪段、交到哪、程式怎麼播都沒定 |

---

## 五、待程式接（交件單都在檔案裡）
- `resources/enemy/anim/TO_CODE_idle_v2.md`：① `ENEMY_IDLE` 改指 `_v2` ② 崩岩巨像補進去 ③ 空中戰等卡 ④ 群戰待機要改引擎（`idleDirFor` 對 `en.group` 直接回 null；要每一層各播各的、被打倒切倒地）。
- 群戰待機交件格式：同中槍倒地（`<組>_idle_v1/<人>/frame_*.webp＋anim.json`，座標＝那一層的畫布；分層與美術原稿同畫布，已比對）。

## 六、⚠ 今晚整夜批次（下一個 session 第一件事：收它）
- `tivot_wan/batch_group_idle.py` → 輸出 `out/idle_group/<組>__<名>/`，log `out/group_idle_batch2.log`（看到「全部完成」）。
  10-12 23:xx 開跑、00:15 因插隊做蕾娜暫停一次（做到第 23 支），00:37 恢復；98 支，預計清晨跑完。
- 跑完要做：
  1. 逐支檢查出框（四邊 alpha）、姿勢／武器跑掉 → 有問題的換 seed 或 `TIVOT_FIT`。
  2. 交件：人 24 格 8fps、卡耶爾大軍減半（12 格 4fps）；`deliver_idle.py <原稿> <格> <目的地> <fps> 0.92`，原稿＝`_originals/.../thug_N.png`／`guard_N.png`／`canyon_swarm/fly<n>/guard_N.webp`。
     目的地建議：`resources/enemy/anim/<場>_idle_v1/<人>/`、`resources/background/capital/fight_<場>_idle_v1/<人>/`、`resources/enemy/canyon_swarm/fly<n>_idle_v1/<隻>/`。
  3. 寫群戰的 `TO_CODE`。

## 七、等 Ray
- 賽西莉 OBE／即死防禦／生命歸還：A 用原圖裁（不畫新圖）還是等 GPT 額度？
- 骨鯨（`mon_sky_ribwhale`）的翼被 Wan 越張越大，像不像原本的牠。
- 017 蕾娜：交件方式（最後一格≠原圖，劇情裡停在原圖上會不會跳）。
- 舊的未決：單人中槍 18 隻（`man_*`，舊規格）要不要交；站著無掩體中槍往哪倒；惡棍群戰要不要照最終抽法重做。

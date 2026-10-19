# 動畫 session 交接（最新：2026-10-19，Windows 3060 那台；舊段 10-16 為 4070 那台）

## ⭐⭐ 10-17～10-19（Windows **3060** 那台，動畫 session）—— 先讀這段
> 下面「10-14～10-16」與一～七是 4070 那台的舊現況，**這次沒有重盤**（Ray 要先推上），下次開工照規矩逐項清點再整份重寫。

**這幾天交件（全部已推；遊戲版在 `resources/illustration/video/`，交件單＝`TO_CODE.md`；PV 版在 `PV/`）：**
| 件 | 檔 | 備註 |
|---|---|---|
| 插畫 torsten_sit | `torsten_sit_v3.mp4`（v1、v2 已被取代） | 天空起手→上帶一點→快速下搖到主角再查膛，手持晃動。第二十支 |
| 插畫 torsten_sit_gunclose | `torsten_sit_gunclose_v1.mp4` | 純槍機特寫、固定鏡頭（另一個鏡頭，不取代 v3）。第二十二支 |
| 插畫 deck_long | `deck_long_v1.mp4`（10 秒，Kling 4.0 九關鍵格） | ⚠ PV 已換成 Ray 新剪 6.58 秒版，**遊戲版還是 10 秒**，要不要跟著換等 Ray |
| 插畫 044_soranahug | `044_soranahug_v3.mp4`（Kling 3.0 單圖） | 抱頭在胸口、主角不回抱。第七支 |
| 插畫 038_mishasting | `038_mishasting_v3.mp4`（Kling 4.0 只鎖尾格） | 遠方衝刺左右橫跳接突刺，尾格＝原圖。第八支 |
| 插畫 010_anyaheadrubbing | `010_anyaheadrubbing_v2.mp4` | Ray 重剪 v1 成 24fps。第五支 |
| 插畫 005_cecilieintro | `005_cecilieintro_v2.mp4` | Ray 重剪 v1 成 24fps。第十五支 |
| 插畫 28_tordefeat | `28_tordefeat_v1.mp4`（576×864） | Wan 單圖：垂頭垂肩、煙霧。撞牆飛入那段（A/M/B 在 `_anim/28_tordefeat/`）試過不能用。第二十三支 |
| 插畫 canyon_army | `canyon_army_v1.mp4` | Kling 3.0 直出。第十九支；PV 版 Ray 改用 `magaarmy.mp4` |
| CI 尼莫 Bullet Rain | `resources/ci/video/cutin_dual_nemo_v2.mp4` | v1 加火星背景（`comp_fgbg_embers.py --native`）。單在 `ci/layers/nemo_bulletrain/TO_CODE.md` |
| PV 專用 | `PV/illustration/torsten_face_v1.mp4`、`torcam_v1.mp4`、`PV/ci/ci_anya_ni_v4.mp4` | 只進 PV、沒進遊戲 |
| 眨眼補丁 96 張 | `resources/si/blink/`、`script/blink.js` | 待辦見 `HANDOFF.md`「眨眼補完」 |

**做了但還沒交（都在 `ComfyUI-master/tivot_wan/out/ci/`，chk 看得到）：**
- `torcam_cut_bite`：torcam 剪輯＋第 96 格接 Wan 咬牙 1 秒（121 格）。Ray 交進 PV 的 `torcam_v1` 是不含咬牙的 `_cut_cut_cut`。
- `torsten_dualsit_flip_s7`：雙槍坐姿抬槍甩握（Wan 單圖；A＝`_anim/torsten_dualsit/dualsit_A_gpt2.png`）。Kling 版沒送。
- `cecilienemo_s7`（6 秒）：另一個 session 已交 041 v1（鎖嘴版），這支可回收。
- `mishasting_wan_s7`、`tordefeat_abc*／mbc_s7`、`gunclose_kling_A1／A2`、`soranahug_kling_AB`：Ray 退件，留著可回收。

**被取代、等 Ray 說才回收：** 插畫 044 v1/v2、038 v1/v2、torsten_sit v1/v2、010 v1、005 v1；CI `cutin_dual_nemo_v1`。

**3060 這台的環境（跟 4070 不同）：**
- 12 GB VRAM＋16 GB RAM：Wan I2V Q4 576×864，65 格約 7 分、97 格約 12.5 分；**VACE 會 RAM OOM ⇒ 用 I2V 首尾格（FLF）分段**。腳本：`out/ci/torsten_sit/wan_flf_576.py`（首尾格）、`out/ci/torsten_face/wan_i2v_576.py`（單圖）。
- ComfyUI 開機：`.venv/Scripts/python.exe main.py --lowvram --fp16-vae`（不要 `py -3.11`、不要 `--use-split-cross-attention`）。
- animechk：`serve_player.py 8131`（**重開機後要自己重起**，開頁給 Ray 前先 `curl` 確認），頁面是 `/player.html`。
- 後置運鏡腳本（手持晃動、不加模糊）：`out/ci/torsten_sit/cam_gun_ul.py`／`cam_gun_ur.py`／`cam_tilt_down.py`／`cam_gun_static.py` —— ⚠ 在 `out/`，**沒同步進 `tools/anim/`**。
- Claude in Chrome 同時連著 Mac 和 Windows 兩個瀏覽器，**開工先 `list_connected_browsers` 選 Windows 那個**（10-18 誤送到 Mac 一次）。
- Kling：上傳先攔 `HTMLInputElement.prototype.click`（aria-label KTARGET）再點槽位→Upload→`file_upload`；面板會自己重置成 Omni reference，送出前截圖核對模式／模型／720p／秒數。**只鎖尾格會自動切 4.0（40 點）**。點數剩 **42**。

**這幾天學到的：**
- 「從遠處衝進來」「撞上去」這種大動作：**Kling 4.0 只鎖尾格**最好（米夏突刺 Ray：「非常好」）；Wan 首尾格會變成從上面掉下來、很好笑，加中間格也救不了。
- 拉滑套（槍的機械動作）A/B 圖、單圖都做不好，Ray 放棄；槍的特寫連 GPT 都會畫成雙槍口、變形。
- 甩槍 Kling／Wan 都只會做成「舉起翻轉握定」，不會真的繞指轉。

## ⭐ 10-14～10-16 新增（先讀這段；下面一～七是 10-13 的現況，四、六兩節**還沒重盤**）

**這兩天交件（全部已推、程式 -2184 已接前幾支）：**
| 件 | 檔 | 狀態 |
|---|---|---|
| CI 托爾斯坦 MB v2 | `resources/ci/video/ci_torsten_mb_v2.mp4` | ✔ 已接（單管、爆風吹髮，28 格） |
| CI 托爾斯坦 處決 v2 | `ci_torsten_execute_v2.mp4` | ✔ 已接；⚠ 底圖換了（Ray SD 修＋GPT 修背景＋換迦尼米德大槍＝`layers/torsten_execute/exec_gun_gpt.png`），**靜態佔位要換成這張**（見該資料夾 TO_CODE） |
| CI 米夏 NI v2 | `ci_misha_ni_v2.mp4`（seed 77，65 格 4.06 秒；v1 已被取代、回收等 Ray） | ⚠ 待接：`resources/ci/layers/misha_ni/TO_CODE.md`。Ray：「暫時先這樣」，之後可能重做 |
| 插畫 003／005／35／044_cecilietorsten | `resources/illustration/video/` | ✔ 已接（TO_CODE 第十三～十六支） |

**宣傳片用的全格版**：`tools/promo/editor/out/anim_full/<遊戲檔名>_full.mp4`（38 支，Ray 勾掉的格補回；`.gitignore` 掉了、只在本機）。
⚠ 4 支這台沒有原片、只是複製遊戲版：`ci_sorana_supply_v2`、`cutin_cecilie_guard_v1`、`cutin_cecilie_return_v1`、`cutin_dual_torsten_v7`。

**這兩天學到的（已進 memory）：**
- ⛔ 動畫一律 Wan，**不准程式拼**（分層 rig、程式槍火、整格搖晃）；Wan 做不出來就改餵的圖／長度／提示詞。
- ⛔ 動畫素材要 alpha 一律 GPT 重製，**本機去背沒問不准用**（si_matting 把槍口摳掉過）。
- 整張要活：頭髮飄＋呼吸全程都在；定格也要 Wan 生，**不准複製靜止格**。每支開 `REQ.md` 逐條對（範例 `layers/torsten_mb/REQ.md`）。
- 鎖結尾且 A／B 頭髮一樣 ⇒ 頭髮不動；要飄就讓 B 的頭髮先被吹開（GPT 改 B），或不鎖結尾。
- 「整片頭髮」這種字會生出**髮片**；寫 fine soft strands。
- 原圖畫成風衣，Wan 就一直長風衣 —— 提示詞擋不住，要先改圖。
- 給 GPT 改圖一律**送整張**，不要裁局部（Ray：「你自做聰明畫局部幹什麼」）；被擋才用拼屍法。
- 做不到就直說，不要硬做。

**環境變動：**
- 螢幕改接主機板 HDMI（UHD 770），4070 閒置 VRAM 0 MB（多出約 1.4 GB）。
- **8130 現在是宣傳片剪輯器**（`tools/promo/editor/server.py`）；animechk 改跑 **8131**：`python serve_player.py 8131`（`serve_player.py` 已改成可帶 port，預設仍 8130）。
- `tivot_wan.py` 的 `--lora`／`--lora-low` 可以串多支（逗號分隔）。

**等 Ray：** 米夏 NI 要不要重做；004_renna_intro（silent7 版）沒有回覆；Kling 試作只在離峰才送得出去（素材 `layers/torsten_bulletrain/_kling_test/`）。

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

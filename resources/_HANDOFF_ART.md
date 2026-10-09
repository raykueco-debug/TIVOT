# 美術交接 — 2026-10-09 收工（Windows 4070 SUPER）

> ⚠ 這個檔**只留一份現況**（交接規則同 `HANDOFF.md`）：開工先逐項清點給 Ray 確認，收工重寫、舊的走 `tools/recycle.sh`。
> 上一份（09-24～10-08 疊起來的那份）在 `_recycle/resources/_HANDOFF_ART_20260925.md`，git 歷史也有。
> 美術只管產圖與交件，**一行程式都不碰**（憲法鐵律 11）；交件後寫進那一批的 spec，由程式 session 接。

## 一、這一輪做了什麼（全部已 push）

| 件 | 交件 | 程式端 |
|---|---|---|
| 返回帝都～薇拉馮德稿：缺的差分 6 張（安雅 sad／shakehead、諾薇兒 runcry、術師 hurt、賽西莉 teary、指揮官 `npc_commander_si_front`） | `si/_capital_return_gap_worklist.md` | ✅ 已接（ver -2099，新 speaker MAGE／COMMANDER） |
| 諾薇兒 runcry 改「閉眼捂嘴跑」（Ray 改定，同名覆蓋） | 同上 | ⚠ 確認 `?v=` 有跳、取景 top 4／bot 1529 |
| 插圖 042 安雅王女宣言 | `illustration/042_annadeclare.webp`、單子 `illustration/_capital_return_ill_worklist.md` | ⚠ 還沒有腳本引用 |
| 卡耶爾山谷（canyon 背景）扭曲恐怖系怪物 **16 隻**：大型 11（吊屍者定風格＋10）＋群體小怪 5 | `enemy/mon_canyon_*.webp`；規格與名單 `enemy/_canyon_horror_spec.md`；總覽 `_canyon_horror_sheet.jpg`／`_canyon_swarm_sheet.jpg` | ⚠ 欠敵人卡＋遭遇表（數值等 Ray）；`colossus` 同名覆蓋要 `bust.py --bump`；群體 5 隻比照惡棍群戰分層 |

## 二、⚠⚠ Ray 這一輪定的規矩（已寫進 memory）

1. **插圖（插畫）由 Ray 自己畫**（「插畫還是我來吧 全部不及格」「只有安雅能用」）—— 美術盤點腳本時只**列出**需要哪些插圖給 Ray，不生成。
2. **怪圖一律要有「朝 viewer 攻擊的態勢」**（崩岩巨像站姿被退）—— 提示詞寫明哪個部位正朝鏡頭打過來＋「不要只是站著」，收件逐隻檢查。
3. **群體用小怪**＝一張只畫一隻、體型緊湊、四邊留白，讓程式端在同畫面放 3～5 隻（可水平翻轉）。

## 三、資產盤點（只列這一輪碰過的＋還開著的；`✔ 不欠`／`⚠ 欠`）

| 件 | 狀態 |
|---|---|
| 返回帝都～薇拉馮德稿的立繪差分 | ✔ 不欠 —— 逐句對過，其餘全由現有差分頂（對照表在 gap worklist）；**索拉娜一張都不用畫** |
| 該稿的插圖 039 落淚／040 撲倒／041 賽西莉尼莫／043 船首術師／044 碎片 02 主角與賽西莉／碎片 01 巨大聖徒 | ⚠ 欠 —— **Ray 自己畫**（GPT 版 039/040/041/043 不及格，檔案還在 `illustration/` 工作區**未入庫**，要不要回收等 Ray） |
| 卡耶爾山谷怪 16 隻 | ✔ 不欠（美術） |
| 032 蕾娜臉紅插圖 | ⚠ 欠 —— 插圖歸 Ray（參考圖在 `_originals/illustration/_032/`） |
| 聖索菲亞小地圖修正（碼頭→貧民區圖示、補酒吧／餐廳點） | ⚠ 欠（美術） |
| 聖索菲亞郊外 sofiaout 小地圖 | ⚠ 欠（美術） |
| 廢城 `hallcourt` 前廳、郊外 `backhall` 重畫 | ⚠ 欠 —— 等 Ray 說要不要 |
| 薇拉馮德小地圖 | ⏸ 暫停 —— 拓樸要改，等 Ray |
| 米夏 NI 眼效 | ⚠ 欠（程式端 `eye_fx.py` 重產，不是美術） |

## 四、產線（這一輪學到的，下一個人直接照做）

- **Chrome**：`list_connected_browsers` 回空時直接 `tabs_context_mcp(createIfEmpty)` 常常就連上了。三個分頁並行、每隻一個新對話。
- **送出**：`#prompt-textarea` → `execCommand('insertText')` → 等「傳送」鈕可用再 `.click()`；送完看 URL 變成 `/c/…` 才算數。
- **收圖**：頁面裡 `fetch(img.src)→blob→a.download`，用 blob 大小對號（我上傳的參考圖是 webp、產圖是 png）。分頁在背景時常顯示「回覆完畢」卻沒有圖 → 重新 `navigate` 同一個對話網址就出來了。
- **真 alpha**：怪物與差分直接要「真正透明背景的 Alpha PNG（不要畫灰白棋盤格）」，這一輪 20 張只有 1 張回棋盤格（同串要「100% 保留，只把棋盤格變真透明」就過）。身體內部 alpha 常是 250~254 → 交件時 ≥245 補成 255。
- **「詐騙」誤判**：拿動態姿勢圖（諾薇兒 run）或暗底圖當底常被擋 → 換串、改用 `front` 當底、用文字描述姿勢就過。
- **怪物提示詞模板**：在 `enemy/_canyon_horror_spec.md` 的共同規格；參考圖固定附 `mon_canyon_hanged`（系列畫風）＋ `background/canyon/canyon_corridor_day`（場景）。驗收用「疊在峽谷背景上」的總覽看，不要只看白底。
- 檢查／交件小工具在 scratchpad（`hcheck.py`／`hdeliver.py`），不入庫；要用就照這兩段重寫。

## 五、工作區裡不是美術的東西（不要動）

`tools/anim/*`、`resources/ci/layers/_cec_guardfx*.mp4`（動畫 session 的）；`resources/si/eyefx/cecilie_si_fluster_te_mask.webp`（程式 session 的）。

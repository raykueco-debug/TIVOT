# 敵人攻擊／延時動畫（Excel 到 E068）—— 交接（動畫 session，2026-11-05 收工）

> 規則見 `CLAUDE.md` §5「敵人動畫（攻擊／延時）的動畫憲法：natali rule」。交件單 `resources/enemy/anim/TO_CODE_attack.md`。
> 來源表：`敵人一覽_非空戰_動畫編排.xlsx`（待機 loop／攻擊／延時點錯三欄）。
> 這個資料夾放 A（中立）與 B（關鍵姿勢）的 GPT 原圖 —— 底線開頭，遊戲不讀。

## 工具（都在 `ComfyUI-master/tivot_wan/`）
- `atk_one.sh <圖> <suffix> <seed> "<prompt>"`：首尾鎖原圖的單段（共用提示詞已含躍動＋全程飄動）。
- A→B／B→A：直接跑 `tivot_wan.py --files A --end B --mode idle --fps 16 --length 49|33`，加 `TIVOT_FIT=0.78`；橫圖加 `TIVOT_GEN=720x480`。
- `edge_check.py <格資料夾>…`：逐格查碰邊。
- 交件：`deliver_idle_lite.py <A圖> <格資料夾> <目的地> 24 0.75`，再把 `anim.json` 的 `loop` 改 false；兩段要接時先把兩個 `_cut` 的格依序複製成一個資料夾再交（生成空間一致）。
- animechk 掃描清單已加 `out/enemy_atk`。

## ✔ 已交
| 編號 | 項目 | 檔 |
|---|---|---|
| E007／E008 娜塔莉 | 待機（新中立立繪） | `anim/mon_natalia_idle_v3/`，立繪 `mon_natalia_neutral.webp` |
| E007／E008 | 延時（爪擊） | `anim/mon_natalia_delay_v1/` |
| E007／E008 | 攻擊（撲咬，另一個 session 交） | `anim/mon_natalia_atk_v3/`（程式已接，ver -2484） |
| E016 罪之魔像 | 延時 | Ray 定 `out/export/mon_relic_candlepenitent_delay_cut` —— ⚠ **還沒轉成交件資料夾**（舊版爪擊寫法，Ray 說可用） |
| E017 魘魔 | 延時 | `anim/mon_sea_coralman_delay_v1/` |

## ⚠ 進行中／欠
- **E065 山貓**：舊的四支（slashAB／returnBA／blurAB／blurBA）作廢 —— B 圖多一條腿。收工時 GPT 正在重出 B（Chrome 分頁，提示詞明寫恰好四條腿），**還沒收**。收到後 Wan 提示詞加 "four legs only, never more than four legs"。
- **E068 獨角虎**：A＝`mon_shinierforest_tiger_neutral.png`（GPT 重出的中立，原圖太動態）、B＝`..._tiger_B_blur.png`。待機 `out/enemy_atk/mon_shinierforest_tiger_neutral_idle` 已跑；`_blurAB`／`_blurBA` 收工時還在 Wan 佇列。立繪要換成中立那張（交件時寫進 TO_CODE）。
- **E024 枷獸**：`mon_beast_shackle_blurAB`（第 7–14、22–25 格碰邊）＋`_B_blur_blurBA`（不碰邊）已開給 Ray，等他看；動作 OK 就縮主體只重跑 blurAB。
- **E015 禍魘祭司**：攻擊 `mon_relic_candletower_atk`（爪風是黑色漩渦），Ray 未回；表上延時＝同攻擊。
- **E016**：待機與攻擊的飄浮版由另一個 session 做（`_idle_float`／`_atk_float`），在 animechk 等 Ray。
- **E017**：攻擊（雙爪撲擊）還沒照 natali rule 做。
- **E021 狼骸群**：跳過（Ray：GPT 不給出）。
- **還沒開始**：E018、E019、E022、E023、E025、E026、E043、人類 E044–E050／E064、紫月軍 E052–E058（群戰分層）、E066、E067（原圖在衝鋒，要 GPT 出中立）。

## ✔ tiger rule（Ray 2026-11-05：「有爪牙攻擊的獸都照這個剪」）
範本＝山貓 E065 四支 cut（`out/export/mon_shinierforest_lynx_*AB2_cut／*BA2_cut`）的 kept_index／holds，fps 24：
- 爪擊 AB(49)：`[0,1,36,37,41,42,44,47,48]`，第 5 個停 2 拍
- 爪擊 BA(33)：`[0,1,3,5,6,10,11,12,13,17,18,22,23,24,25,29,30,31,32]`，第 6／11／16 個停 2 拍
- 撲擊 AB(49)：`[0,1,6,11,13,18,23,25,30,35,37,42,47,48]`，不停拍
- 撲擊 BA(33)：`[0,1,4,8,11,12,13,18,23,24,25,30,32]`，第 3／4 個停 2 拍
獸類爪牙攻擊照 natali rule 跑完、edge_check 過，就套這組直接交（AB＋BA 同空間接一支，打到＝AB 最後一格）。

## ✔ E065 山貓、E068 獨角虎 已交（見 TO_CODE_attack.md）

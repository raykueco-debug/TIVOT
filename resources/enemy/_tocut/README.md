# 待 Ray 剪的 Wan 片（11-23，3060 這台帶出來換機器剪）

底線開頭：遊戲不載入、離線包（`tools/offline_list.py`）排除、animechk 的「遊戲交件」掃描也跳過。

| 資料夾 | 是什麼 | 備註 |
|---|---|---|
| `tomb3_vault_bat_A_AB` | 穹頂蝙蝠 攻擊 A→B（49 格） | 第 40～42 格碰左邊 |
| `tomb3_ossuary_wheel_A_AB` | 納骨輪 攻擊 A→B（49 格，提示詞「先轉起來再撞鏡頭」） | 不碰邊；輪子沒有變大，撞向鏡頭要靠程式 `near` 拉近補 |
| `tomb3_ossuary_wheel_B_BA` | 納骨輪 收回 B→A（33 格） | 交件 R 照例用 A_AB 倒放留 1/3，這段備用 |
| `s3_mon_shinierforest_snake_neutral_idle` | 水蛇 中立待機 | |
| `s3_mon_shinierforest_hog_neutral_idle` | 山豬 中立待機 | |
| `s3_stag_rot_A_idle` | 腐鹿骸 待機 | |

## 新機器的 animechk 怎麼讀到

animechk（`ComfyUI-master/tivot_wan/serve_player.py`，port 8130）只讀 `tivot_wan/out/` 底下的資料夾
（攻擊片在 `out/enemy_atk/`），不讀這裡。所以：

1. 把這裡每個資料夾**原名**複製到新機的 `ComfyUI-master/tivot_wan/out/enemy_atk/`。
2. 開 `http://localhost:8130/player.html?q=tomb3_`（或 `q=s3_`），播放器每次載入都會重掃清單。
3. 剪完按「輸出」→ 出現在 `out/export/<名>_cut/`（含 `export.json`）。

⚠ 名字要保持原樣：交件時用 `export/<名>_cut/export.json` 的 `kept_index` 回頭到 `enemy_atk/<名>/` 取原片做 R 倒放 —— 原片必須在同名資料夾。
⚠ 這台已剪未按輸出的標記另存在 `tools/anim/animechk_marks_1123.json`。

# 古墓怪 alpha 重做 —— 交件與程式端要接的事（ver -1648，美術 session）

> Ray：「古墓怪全部都要重繪，動物先不管，**先把動物以外的怪 alpha 重繪**」

## 一、做了哪 16 隻

26 隻古墓怪裡，**動物 9 隻先不動**（依圖分類，不是照名字猜）：
`ossuary_rats` `crypt_centipede` `crypt_hound` `twin_skull_hound` `vault_bat`
`tomb_bear` `pallid_stag` `gorge_toad` `stone_adder`

非動物 17 隻，其中 `pall_bearers` 的 alpha 本來就乾淨（0.00%）⇒ **這一輪做 16 隻**：

```
arch_warden  sarcoph_crawler  slab_creeper  kneeling_penitent  chain_hanged  iron_maiden
ossuary_wheel  choir_organ  choir_pale  bellfounder  grave_censer  candelabra_fiend
reliquary_hand  spiral_veil  shroud_widow  skull_cairn
```

## 二、驗收

量法一律用 `tools/matting_eval.py` 的 `near_white_pct`（半透明像素中 min(RGB)≥235 的比例）。

| | 舊 | 新 |
|---|---|---|
| 近白比例 | **35.25 ~ 50.10%** | **0.00 ~ 0.23%** ✔ |
| 四角 alpha | 0 | 0 |

⚠ 舊的那一批是 `tools/mon_dekey.py` 出的 —— 那正是 §5 的 -1503 講的
「只把邊緣像素變半透明、沒有把它的顏色修掉」⇒ 白底圖的邊緣本來就被白色污染。
**所以這一輪一張都沒有走本機去背**，全部上傳白底原稿、由 GPT 重製 alpha。

16 組新舊並排（暗底）逐一看過：設計、構圖、零件全對。
新版顏色比較飽和是**白霧被拿掉**的結果，不是重畫。

## 三、⚠⚠ 有效的措辭：**短的那一句**

```
100% 保留原圖細節，不要重畫，只把白底變成透明。alpha 背景。
```

⚠⚠⚠ 一開始我寫了四行（加上「骨頭之間的空隙也要透明」「不要把棋盤格畫成像素」…），
**兩張都被重畫了** —— `arch_warden` 拱門裡那兩點發光的眼睛不見了、
`sarcoph_crawler` 手臂上多纏了好幾圈鐵鏈。換成上面那一句就保住了：

| | 與白底原稿的平均差 |
|---|---|
| 四行版 | **10.3** ❌（眼睛不見） |
| 一行版 | **2.8** ✔ |

⇒ 同 §5 的 -1503：**提示詞要短。長了就是邀請它創作。**
⚠ 這與「框成格式轉換不要框成重繪」是同一件事的兩面：措辭要**又短又只講格式**。

## 四、⚠ 程式端要接：**`ASSET_VER` 要跳版**

這 16 個是**同名覆蓋**，而 `config.js` 的 `ASSETS` 已經登記了它們
（`enemy_arch_warden` 等，4252 行起）⇒ 依 §5 的 -650 必須在 `ASSET_VER` 給
`mon_arch_warden` 那 16 個檔名各加一版。
不加的話玩家的瀏覽器會繼續拿舊的那一份，**而且畫面上不會有任何錯誤訊息**。

## 五、還沒做的

- **動物那 9 隻的 alpha**（Ray：先不管）
- **全部 26 隻的「重繪」本身**（Ray：「全部都要重繪」）—— 這一輪只做了 alpha。
  畫風重繪照守墓者那一套（`_gravekeeper_handoff.md` §五）：
  「請直接修改我上傳的這一張圖，不要重新繪製一張」＋明寫失敗長什麼樣。

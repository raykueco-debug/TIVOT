---
name: anim-deliver
description: TIVOT 動畫交件。Ray 說「<資料夾名> 交件」「<名字>_cut 交件」「更新」時用：把 animechk 剪好的 out/export/<名>_cut 轉成 mp4 放進遊戲資源、寫 TO_CODE、commit 並推上去。適用插畫動畫（resources/illustration/video）與 CI（resources/ci/video）。
---

# 動畫交件（插畫／CI）

Ray 在 animechk 剪好片之後說「`<X>_cut` 交件」或「`<X>` 更新」。照下面做，**一步都不要省**。

## 0. 先確認來源
- 來源資料夾：`C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/out/export/<X>_cut`
- ⚠ Ray 說「更新」時通常是**重剪了**：animechk 會另存成 `<X>_cut_2`、`_cut_3`…。用 `ls -lt out/export | head` 找**最新**的那個，不要拿舊的。
- 讀 `export.json`：`kept_index`（取了原片哪幾格）、`holds`（停格倍數）、`fps`。
- 影格是已經展開停格的 `frame_00.webp…`，**照順序全用，不要再裁、不要抽格**（Ray：「裁是我的事」）。

## 1. 判斷交到哪裡、叫什麼名字
| 原圖在 | mp4 放 | 命名 | 交件單 |
|---|---|---|---|
| `resources/illustration/<名>.webp` | `resources/illustration/video/` | `<原圖檔名>_v<N>.mp4` | `resources/illustration/video/TO_CODE.md`（加一節「第 N 支」） |
| `resources/ci/<名>.png/webp` | `resources/ci/video/` | `ci_<角色>_<技能>_v<N>.mp4`（照該資料夾既有命名） | `resources/ci/layers/<角色_技能>/TO_CODE.md` |

- **版本號**：`ls` 目標資料夾，取下一個沒用過的 `vN`。**永不覆蓋舊版**（同名覆蓋會被快取住）。
- 取代舊版時，TO_CODE 把舊的標「已被 vN 取代，不要接；回收等 Ray」，**不要刪檔**（刪檔一律 `tools/recycle.sh`，而且要 Ray 說）。

## 2. 轉檔（固定指令）
```bash
cd <來源資料夾>
ffmpeg -loglevel error -framerate <fps> -i frame_%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an "<目標mp4>"
ffprobe -v error -show_entries stream=width,height,nb_frames -of csv=p=0 "<目標mp4>"
```
- 格數要等於 `frame_*` 的數量；不等就停下來查。
- ⚠ 透明背景（`_alpha`）的片：mp4 沒有 alpha —— **先問 Ray 要什麼格式**（webm VP9 alpha／png 序列／保留影格資料夾），不要自己決定。

## 3. 量首尾格（寫進 TO_CODE，程式靠這個決定怎麼接）
把影片第一格、最後一格各自跟原圖比（縮到同尺寸，平均絕對差）：
- 差 < ~8 ＝「≒原圖」→ 可以從原圖無縫接入／播完可切回原圖／首尾都是就可循環
- 否則 ＝「≠原圖」→ 播完要**停在影片最後一格**、靜態佔位用影片第一格
- 結尾若是 B 圖（A→B 跑法），寫明 B 圖路徑（`_anim/<名>/…`），並把 B 圖一起 `git add`

## 4. 寫 TO_CODE（照既有格式）
每支一節，包含：⭐ 檔名＋**尺寸、fps、格數＝秒數、大小**；Ray 剪的來源資料夾與 `kept_index` 範圍（第幾～幾格挑幾格、有無 ×2）；一句內容描述；首尾格與原圖的關係（✅／⚠）。
新的一節插在「## ⚠ 要程式決定／注意的（各支共通）」**之前**。
⚠ 寫完核對一次：檔案大小、格數、秒數（格數÷fps）都要跟 ffprobe／ls 對得上（寫錯過，`0.97 MB` 寫成 `1.9 MB`）。

## 5. commit ＋ push
```bash
cd "C:/Users/Ray Ku/Desktop/TIVOT"
git fetch -q; git rev-list --count master..origin/main   # 不是 0 → 先停下來跟 Ray 說
git add <mp4> <TO_CODE.md> [<A/B 圖>]                    # ⚠ 只 add 這幾個，工作區有美術在用
git commit -m "動畫交件：<類型> <名> v<N>（Ray 剪，<格數> 格 <fps>fps <秒> 秒[，取代 vN-1]）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin master:main
```
- ⛔ 不要 `git add -A`／`.`；不要碰 `.claude/launch.json`、`.gitignore`。

## 6. 回報 Ray（短）
檔名、尺寸、fps、格數＝秒數；首尾格能不能接原圖／能不能循環；取代了哪一版。

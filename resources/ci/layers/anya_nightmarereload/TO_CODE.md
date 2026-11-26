# TO_CODE（動畫交件）

## cutin_nireload v6／v7（11-26）
- ⭐ **接 v7**：`resources/ci/video/cutin_nireload_v7.mp4`：**480×720、16fps、49 格＝3.06 秒**、約 1.41 MB（1,473,702 bytes）。Ray 剪 `out/export/cutin_nireload_v4_burst7_cut_2_cut`（從 `cutin_nireload_v4_burst7_cut_2` 再剪，取第 4～52 格）。
- 備用 v6：`resources/ci/video/cutin_nireload_v6.mp4`：**480×720、24fps、48 格＝2.0 秒**、約 0.94 MB。Ray 剪 `out/export/cutin_nireload_v5_cut`（現行 v5 前 48 格）。
- 兩支同一則交辦裡都說「交件」，但只對應一個 CI（安雅被動 `cutin_nireload`）—— 接的是後交的 v7；要換 v6 改一行 `cutinAnim`。
- `cutinDur.cutin_nireload` 維持 2500（ver -2168 Ray：「播 2.5 秒就要完成淡出」）⇒ v7 撤出時還在播。
- ✅ 已接（動畫線，ver -3036）。v5 回收等 Ray。

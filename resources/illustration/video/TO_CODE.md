# 給程式 session：插畫動畫第一支 017_rennasmile（動畫 session 2026-10-13 交件）

> 動畫 session 不碰程式（憲法鐵律 11），寫在這裡。接完請刪這份或在 HANDOFF 註記。

## 檔案
- **`resources/illustration/video/017_rennasmile_v1.mp4`**
  - H.264 High、yuv420p、**1080×720、24fps、43 格＝1.792 秒**、crf 22、faststart、無音軌、約 1 MB。
  - Ray 剪的 `out/export/rennasmile_A_gem_3s_shrug7_cut`（原片 49 格的第 6～48 格，全 ×1）。

## 內容
- 蕾娜睜著綠色半睜眼看 viewer、拳頭在胸前 → 閉眼笑、肩膀輕顫、拳頭抬到嘴邊；整段晚風吹髮。
- 開頭圖＝`resources/illustration/_anim/017_rennasmile/rennasmile_A_gem.jpg`（GPT 畫睜眼版、Gemini 修手）。

## 第二支：009_soranadebute（10-13）
- ⭐ **接 `resources/illustration/video/009_soranadebute_v3.mp4`**：**720×1080、16fps、43 格＝2.69 秒**、約 2 MB。
  Ray 剪的 `out/export/soranadebute_wind7_4s_mouth_cut`（4 秒鎖嘴版的第 0～63 格挑 43 格，全 ×1）。
- `_v2.mp4`（4 秒未剪鎖嘴）、`_v1.mp4`（3 秒、嘴會動）都已被 v3 取代，不要接；回收等 Ray。
- 內容：人物姿勢與臉不動，只有短髮、白色腰布、流蘇、金鍊被海風吹動，帆微微起伏。
- 從原圖 `009_soranadebute.webp` 直接生（第一格≒原圖），沒鎖結尾 ⇒ 最後一格不等於原圖；要循環播的話首尾會跳一下，請告訴動畫改做首尾鎖的循環版。

## 第三支：31-2_rennaprincesshold（10-13）
- ⭐ **`resources/illustration/video/31-2_rennaprincesshold_v1.mp4`**：**720×1080、16fps、59 格＝3.69 秒**、約 1.2 MB。
  Ray 剪的 `out/export/rennaprincesshold_lift7b_cut`（原片 65 格挑 59 格，全 ×1）。
- 內容：公主抱，蕾娜驚訝害羞、眼神左右游移、眨眼，長髮擺動；男方與背景不動。
- 從原圖直接生（第一格≒原圖），沒鎖結尾 ⇒ 最後一格不等於原圖。

## 第四支：024_nouvellesmile（10-13）
- ⭐ **`resources/illustration/video/024_nouvellesmile_v1.mp4`**：**720×1080、16fps、39 格＝2.44 秒**、約 1 MB。
  Ray 剪的 `out/export/nouvellesmile_A_gpt_ab7mfix_cut`（原片 65 格挑 39 格，全 ×1，保留最後一格）。
- 內容：抬頭驚訝 → 閉嘴微笑、身體害羞扭動 → 低頭、瀏海遮眼；頭髮自然晃動。
- ✅ **最後一格＝原圖 024**（鎖結尾生成）：播完可以直接切回 `024_nouvellesmile.webp`，不會跳。
  第一格是睜眼驚訝版（`_anim/024_nouvellesmile/nouvellesmile_A_gpt.png`），不是 024。

## ⚠ 要程式決定／注意的（各支共通）
1. **插畫目前沒有播影片的路**（`story.js` 的 `cg:` 只吃圖）。CI 那套（ver -2060：開演前 fetch 成 blob、第一格出來前顯示靜態圖、撤下時釋放）可以照搬。
2. **最後一格≠原圖 017**：生成時沒鎖結尾（鎖了頭髮就飄不起來，Ray 要髮絲飄），最後一格是 Wan 畫的閉眼掩嘴，構圖與 017 接近但不是同一張。
   ⇒ 播完要**停在影片最後一格**，不要切回 `017_rennasmile.webp`，否則會跳一下。
3. 開頭第一格是**睜眼版**，不是 017；腳本那一拍若是先顯示 017 再播影片，第一格會跳。靜態佔位請用影片第一格（或 `rennasmile_A_gem.jpg`）。

# 北方泊地　司祭立繪 — 產圖規格（ver -582）

腳本已經接好了（`script/town.js` 的 `northport.nodes.port.acts`），
**檔案丟到 `resources/SI/NPC_SI_Priest.webp` 就會出現**。
圖進來之後要跑一次 `python3 tools/measure_si.py resources/SI/NPC_SI_Priest.webp`，
把 top/bot/fx 貼進 `script/speakers.js` 的 `ART.priest` 並拿掉 `unmeasured:true`
（現在掛的是佔位值，沿用別張的數字人一定會歪 —— CLAUDE.md §5／§6.5）。

## 情境（他在這一幕是什麼狀態）

北方泊地昨晚被禍魘襲擊，碼頭一片瓦礫、還在冒煙。他是這個教區的本地司祭，
在廢墟裡攔下剛降落的三個人。情緒走這條線：
**驚惶 → 憤慨（「太過份了！派聖約騎士團來啊！」）→ 認命（「……我知道了。」）**
—— 所以基本立繪要**疲憊、緊繃、但還撐著**，不是慈祥或平靜。

年紀：中老年（他管主角們叫「小鬼」）。男性，身高約 172cm。

## 規格（與既有 NPC 立繪同一套）

- **1024×1536 直式，全身**（頭頂到鞋底都要在框內，不可裁切）。
- **真 alpha 透明背景**，不要純色背景、不要陰影落地、不要外框光暈。
- **日式動漫 cel style**：平塗、二～三階硬邊陰影，**無顆粒／無雜訊／無紙紋**。
- 1908 年歐洲風。教廷神職服（黑法衣＋領巾），配十字架吊墜；
  磨損、沾灰、下襬有塵土 —— 他剛從昨晚的襲擊裡活下來。
- ⚠ **不要誇張的頭飾／高帽**：取景的縱向基準是「人物最上緣」，
  超出頭頂的東西會把整個人往下壓（§6.5）。要戴就戴貼頭的小帽。
- ⚠ 手上不要拿超出頭頂或伸出圖框的長物（權杖、旗）。
- 站姿正面（略側身可以），視線朝向鏡頭偏右下 —— 他站在畫面**右側**與主角們對話。

## 可直接貼的 prompt（英文）

```
Full-body character portrait, 1024x1536 vertical, transparent background (true alpha,
no backdrop, no ground shadow, no glow).

Japanese anime cel-shading: flat color fills with two-to-three step hard-edged shadows,
clean crisp linework. NO grain, NO noise, NO paper texture, NO painterly gradients,
NO watercolor. Solid, clean, print-like.

Subject: a middle-aged-to-elderly male parish priest of a 1908 European-style church.
Black cassock with a clerical collar and a dark stole, a simple cross pendant.
The cassock is scuffed and dust-stained, hem soiled — he has just survived a night attack
on his harbor town. Short greying hair, no hat (or at most a small close-fitting skullcap;
nothing that rises above the top of his head).

Expression and posture: exhausted and tense but still holding himself together —
grief and indignation held back, not serene, not kindly. Standing, facing the viewer
slightly turned, gaze angled down-right as if speaking to people in front of him.
Hands empty or lightly clasped; no staff, banner, or long object.

Full body must fit inside the frame: top of the head and the soles of both shoes
fully visible, nothing cropped at any edge. Centered.
```

## 交件流程（同 §5）

1. GPT 出**真 alpha PNG**（Gemini 生不出 alpha → 走綠幕＋`tools/chroma_cut.py`＋`despill.py`）。
2. `cwebp -q 85 -alpha_q 100 NPC_SI_Priest.png -o NPC_SI_Priest.webp`，放進 `resources/SI/`。
3. 原 PNG 移進 `resources/_originals/SI/`（不入版控）。
4. 量取景值、更新 `ART.priest`（見檔頭）。

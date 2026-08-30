# BOSS 圖規格：瓦礫中的紫黑能量之爪（ver -585；-617 改為**重繪成方形**）

> **⚠⚠ 現在要的是「同一張圖，換一個畫幅」**（Ray：「沒辦法，圖幅限制，讓 gpt 重繪，
> 確保不要改變原圖設計」）。**設計不要動** —— 構圖、配色、光線、爪的形狀與姿態
> 全部照舊，只是把畫幅從 3:2 橫式改成 **1:1 正方**，並把原本擠在左右兩側的東西
> 往內收，讓正方畫幅裡什麼都不會被切掉。

## 為什麼要重繪

戰鬥畫面的上半（`#top`）是**接近正方**的：390×844 的手機上是 390×420（比例 0.93），
更高的機器會到 0.84、較矮的到 1.13。現行的 `TheClaws.webp` 是 **1536×1024（3:2）**，
用 `cover` 貼上去會把**左右各裁掉約四分之一** —— 而兩隻爪子正好在兩側，
整個構圖就沒了（Ray：「左右被裁太多」）。

⚠ 已先改成 `fit:{mode:'contain'}` 當**權宜之計**（一個像素都不裁，上下留白由教堂
底圖補）。新圖進來之後**不必改程式**：正方的圖在正方的框裡，contain 與 cover
看起來一樣。

## 新規格

- **1024×1024（1:1 正方）**，WebP q85。
  ⚠ 這是本專案整張戰鬥圖的既有慣例：`Saint_TR_CI` 1254×1254（1.00）、
    `Saint_GT_CI` 1622×1700（0.95）。
- 檔名沿用 **`TheClaws`**（覆蓋 `resources/enemy/TheClaws.webp`），原 PNG 進
  `resources/_originals/enemy/`。
- 連背景一起畫、**不去背**（同原圖）。

## 可直接貼給 GPT 的 prompt（重繪用）

> Redraw this exact same scene and design in a **1:1 square** canvas (1024×1024).
> **Do not redesign anything** — same composition, same colours, same lighting,
> same creature. Only reflow it to fit a square frame.
>
> The scene: the ruined interior of a 1908 European-style church — toppled stone
> columns, smashed and overturned pews, shattered stained-glass windows, rubble and
> dust across the floor, cold grey daylight falling through a hole in the roof.
>
> The subject: a pair of enormous **purple-black energy claws** erupting upward out
> of the rubble, one on each side, curving inward toward the viewer.
> They are **not solid matter** — they are living dark flame and black smoke, with
> violet fire particles and arcs of purple lightning trailing off their edges.
> The claw shape is only faintly readable, as if the energy itself has gathered into
> the form of talons. Low camera angle, wide-angle lens, strong perspective:
> the claw tips loom huge and close to the viewer and shrink away sharply behind.
>
> **Square-frame reflow (the only change):** bring both claws **inward from the
> edges** so that nothing important touches the left or right border — the whole
> silhouette of both claws must sit comfortably inside the square. Let them rise
> **taller** to fill the extra vertical room instead of spreading sideways.
> Keep a clear, darker area in the lower-centre so a UI bar can sit over it.
>
> Style: Japanese anime cel shading — large flat colour areas with two-to-three step
> hard-edged shadows. Render the energy in **distinct stepped colour bands, not soft
> gradients** (like dark-flame effects in animation). No noise, no grain, no oil-paint
> texture, no watermark, no text.

## 產出後

1. `cwebp -q 85 TheClaws.png -o TheClaws.webp`，覆蓋 `resources/enemy/TheClaws.webp`。
2. 原 PNG 移進 `resources/_originals/enemy/`（不入版控）。
3. 程式端**不必動** —— `config.js` 的 `enemies.np_claws` 已經指著這個檔名，
   `fit:contain` 在正方畫幅下與 cover 等價。

## 參考

- 底圖基準：`resources/background/Northport_church_BF.webp`（北方泊地教堂，1536×1024）
- 能量質感參考：炎殺黑龍波那種「暗焰活體」的表現 —— 黑中透紫、邊緣有流火。
- ⚠ 不做時段差分（BOSS 戰是劇情固定時點）。

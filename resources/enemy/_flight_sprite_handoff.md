# 交給程式 session：飛行地圖的怪 —— 只做正面（ver -1440，Ray 交辦）

> Ray：「飛行圖基本用不到側面，不如把正面精緻化，**以龍為例只做正面，精度拉高，
>   透視正確**，只作正面應該不難」
> 憲法已寫入：`CLAUDE.md` §5「飛行地圖的怪：只做正面一張，把精度拉高」（ver -1440）。

---

## 一、⚠⚠⚠ 先講一件查出來的事：**引擎本來就只讀一張**

`flight/index.html:14587`

```js
im.src = sp.dir + sp.dorsal;      // 怪的 sprite 只有這一行在載圖
```

`plan:'chain'` 的那三隻怪（蜈蚣／羽蛇／王座徘徊者）**從頭到尾只用 `sprite.dorsal`
那一張**，`view_1`~`view_5` **沒有任何程式讀它們** —— 它們是 `split_enemy.py`
時代留下來的死檔。

⇒ **所以「只做正面」不是要改引擎，是要：**
  ① 美術把那一張的精度拉高（我這邊做）
  ② **把沒人讀的那幾張回收掉**（下面第三節）

⚠ **例外是空賊船 `FLH_Pirate`**：它真的用八視圖（`flight/index.html:16674` 的
`set.frontQ` 那一族依航向挑圖）。**那一族不要動。**

---

## 二、程式端要改的（只有兩處，都在資料上）

### 1. 王座徘徊者：換 sprite ＋ **重量三帶**

新素材交件後（`flight/enemy/FLM_DragonThrone/view_0.webp` 同名覆蓋），
`flight/index.html` 的 `bldragon` 那一筆：

```js
sprite:{ dir:'enemy/FLM_DragonThrone/', dorsal:'view_0.webp',
         head:[0.00, A], wings:[A, B], body:[B, 1.00] },   // ← A / B 由美術量完給
```

⚠⚠ **三個數字一定要跟著換**：那是**逐隻量出來的**（羽蛇的頭佔 16.5%、
王座徘徊者只佔 7.9% —— 蛇有長頸，這一隻的頭直接接在肩上）。照抄舊值或別隻的值，
**拍翼時頭會跟著晃**。交件單上會附新的 A／B。

### 2. `config.js`：戰鬥立繪指向新檔（ver -1414 就交了，還沒接）

```js
enemy_bl_dragon_sky  →  resources/enemy/mon_dragon_v1_flight.webp
```
HP≤50% 換 `ascendant`（立姿）——那是第四型態，不要與空中戰那張搞混。

---

## 三、可以回收的死檔（**美術不自己刪，等程式端確認**）

確認 `grep -n "view_[1-5]" flight/` 只剩空賊船那一段之後，這幾張可以走
`tools/recycle.sh`：

```
flight/enemy/FLM_CENTIPI/view_1.webp … view_5.webp      （5 張）
flight/enemy/FLM_Serpent/view_0,1,2,4,5.webp            （5 張，它讀的是 view_3）
```

⚠ **`FLH_Pirate/view_0`~`view_7` 一張都不要動。**
⚠ 回收前先跑一次那個 grep —— 這是「沒有人讀」的唯一證據。

---

## 四、日後新增飛行怪的規格（照這個交件）

| 項 | 規格 |
|---|---|
| 張數 | **1 張**（`view_0.webp`，正俯視的正面） |
| 來源尺寸 | **1536×2048 起跳**（舊的是 1024×1536） |
| 透視 | 身體有厚度、翼膜有弧度、尾巴因為往後而**透視縮短**；⛔ 不要左右對稱的平面紋章 |
| 背景 | 真 alpha（GPT 重製去背，不要自動去背） |
| 細節密度 | **比立繪低一階** —— 它在畫面上只有一兩百像素高，剪影與大色塊才是關鍵 |
| 交件單要附 | **`head`／`wings`／`body` 三個切分比例**（美術量，程式照抄） |

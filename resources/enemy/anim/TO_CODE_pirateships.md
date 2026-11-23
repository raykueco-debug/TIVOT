# 空賊船 8 艘 —— 交件單（空戰動畫副理 → 程式 session）

> Ray 11-20：「海賊船多做幾艘不同風格 19世紀晚期到20世紀風格 大部份是木造船貼金屬蒙皮 還有一些蒸氣帆船」
> → 九宮格定稿（Ray 在同串自己改：船身加長、帆統一黑、不要旋轉砲台）→ 「除了9都可以用」→ 11-21「可以，交件排待機」

## ✅ 立繪交件（11-21）

全部 **1536×1024 橫式、真 alpha（GPT 直出 RGBA）、船頭朝左、四邊各留 12%**（本機只做裁邊＋等比縮放置中），格式同 `mon_pirateship_side_v2`。
放在 `resources/enemy/`：

| 檔 | 型 | 特徵（取名參考，名字 Ray 定） |
|---|---|---|
| `mon_pirateship_n1_side.webp` | 木殼包鐵皮 | 現行那艘加長版：三桅、9 門側舷砲、艦橋窗列 |
| `mon_pirateship_n2_side.webp` | 木殼包鐵皮 | 紅褐細長快船、兩桅、砲少 |
| `mon_pirateship_n3_side.webp` | 木殼包鐵皮 | 灰色鐵甲、紅色船底、單主桅、舷側管線 |
| `mon_pirateship_n4_side.webp` | 木殼包鐵皮 | 橄欖綠雙桅縱帆船、圓舷窗、輕巧 |
| `mon_pirateship_n5_side.webp` | 木殼包鐵皮 | 深藍三桅巡防艦、兩層砲門、重火力 |
| `mon_pirateship_n6_side.webp` | 木殼包鐵皮 | 灰紅砲艇、單桅、低矮 |
| `mon_pirateship_n7_side.webp` | 蒸汽帆船 | 紅煙囪、側明輪、雙桅 |
| `mon_pirateship_n8_side.webp` | 蒸汽帆船 | 淺灰鐵甲、雙煙囪、5 門側砲、雙桅 |

原檔／九宮格／比對圖：`resources/_originals/enemy/pirateship_variants/`（`_README.md`）。

## ⚠ 程式端要接的（美術不碰 code，鐵律 11）
1. `config.js` 的 ASSETS 加 8 個鍵（例 `enemy_pirate_n1_side` → 上表檔名），照 `enemy_pirate_side` 那一列。
2. 敵人卡：現行只有一張 `pirate_ship`。這 8 艘要**各開一張卡**還是**同一張卡隨機抽外觀**、數值與名字，**Ray 未定**——先問他。
3. 取景（`fit`）：比例與 `mon_pirateship_side_v2` 相同（1536×1024、四邊 12%），照它的值應該就對；逐隻看一眼。
4. 待機：Wan 在跑（`ComfyUI-master/tivot_wan/out/sky_ships/`），Ray 剪完交件後補在下面，屆時 `config.ENEMY_IDLE` 加 `mon_pirateship_nN_side` 一列即可。

## 待機交件進度
| 鍵 | 資料夾 | 格 | fps | 狀態 |
|---|---|---|---|---|
| `mon_pirateship_n1_side` | `anim/mon_pirateship_n1_side_idle_v1/` | 30 | 24 | ✅ 交件（11-21，Ray 剪的 `mon_pirateship_n1_side_v3enh_cut`；box 在畫布內、碰邊 0）→ **`config.ENEMY_IDLE` 加一列即可** |
| `mon_pirateship_n4_side` | `anim/mon_pirateship_n4_side_idle_v3enh/` ／ `_idle_v4air/` | 34 ／ 27 | 24 | ✅ 交件（11-21，Ray 剪的兩版都要；**有浪花**，見下）|
| `mon_pirateship_n5_side` | `anim/mon_pirateship_n5_side_idle_v3enh/` ／ `_idle_v4air/` | 33 ／ 35 | 24 | ✅ 交件（同上，**有浪花**）|
| `mon_pirateship_n8_side` | `anim/mon_pirateship_n8_side_idle_v3enh/` | 33 | 24 | ✅ 交件（無浪花，煙囪冒煙）|
| n2、n3、n6、n7 | —— | | | ⏳ Wan 跑好（`out/sky_ships/*_v3enh`），等 Ray 剪 |

✅ 螺旋槳（11-21）：Ray「螺旋槳的部份 inpaint 重跑」→「換進去」—— n4／n5 兩版、n8 共 5 支，VACE 只重畫螺旋槳那一框、貼回 Ray 原剪法（框外像素不動），**同名覆蓋**（舊格已回收）。
⚠⚠ **同名覆蓋 ⇒ 程式端 commit 前跑 `py -X utf8 tools/bust.py --bump`**（asset_bust 會換 `?v=`，不然瀏覽器吃舊快取）。格數不變；`px` 差幾像素，`splash.json`／`splash_mask.webp` 已對新格重算。n1 沒重畫。

## ⚠⚠ 程式要做：浪花 → 程式雲浪（Ray 11-21）
> Ray：「有浪花讓程式碰到那幾格就跑雲出來，看能不能自然變成雲浪」「浪花要有背景色差分」「讓程式配合浪花時機與形狀顏色飄雲過來」

Wan 在 4、5 號船底自己長出了浪花（白藍色）。白天的雲景上還算像雲，**黃昏／夜晚的背景上很突兀**。Ray 要的是：**程式在浪花出現的那幾格，照浪花的時機、形狀、位置飄雲過來蓋住它，雲的顏色跟著當下背景**。

資料（美術已交，逐格）：有浪花的那四支資料夾裡各有
- `splash.json`：`splash[i] = { f:格號, k:強度0~1, box:[x0,y0,x1,y1], rgb:[r,g,b] }`
  · `k`＝該格浪花面積 ÷ 這支最大那格（0＝沒有浪花，不必出雲）
  · `box`＝浪花範圍，**比例座標，相對於格子本身**（＝ `anim.json` 的 `box` 那一塊）
  · `rgb`＝原片浪花的平均色（參考用；實際顏色要取背景的）
- `splash_mask.webp`：逐格遮罩**橫排**（每格同格子大小 `px`，白＝浪花），要做形狀貼合時用

建議做法（細節程式定）：
1. 播待機時讀當格的 `k`／`box`：`k>0` 就在 `box` 那一帶生程式雲（同 `bg_fx` 的程式雲那一套），雲量／不透明度跟 `k` 走，`k` 降回 0 雲就飄走散掉（不要瞬間消失）。
2. 雲色**取當下戰鬥背景**（亮部＋暗部兩色，同 `bg_fx` 對雲層的取色），所以白天／清晨／黃昏／夜晚自然各有一版 ——這就是 Ray 說的「背景色差分」。
3. 雲要**蓋在浪花上面**（浪花本身留在格子裡，被雲吃掉）；雲往船尾方向飄（世界往右流）。
4. ⚠ 1 號、8 號**沒有浪花**（不必掛）。2、3、6、7 號還沒剪。
- 預覽（美術用，非遊戲）：`ComfyUI-master/tivot_wan/out/skyship_preview.html`（:8130），12 張空戰背景同時疊船。

- 生成：Wan 720×480、49 格、強風帆提示詞＋`TIVOT_LX2V=enh`（Ray：「帆沒動啊」—— 第一版只寫帆鼓動，帆幾乎不動）。交件 `deliver_idle_lite.py`（`TIVOT_FIT=0.86`、scale 1.0）。

## ✅ 11-21 晚：改「飛空船」提示詞重跑（v6airship）＋程式雲霧／細煙（空戰副理自己接，Ray：空戰敵程式歸這邊）
- Ray：「inpaint 走不通 在 prompt 加入飛空船 這樣就不會出水」⇒ `batch_skyships_v6_1121.py`（v3enh 那句的開頭換成 `Flying airship floating in mid-air, steampunk sky ship`）。
- 4 號 `anim/mon_pirateship_n4_side_idle_v6airship/`（35 格）、5 號 `…n5_side_idle_v6airship/`（33 格）已交件並接上 `ENEMY_IDLE`（取代 `_fade` 兩版陣列）。上面「浪花→程式雲浪」那一節作廢。
- 1、2、3、6、7、8 號照同一句重跑中（7、8 加煙囪煙），Ray 一艘一艘剪。
- 程式（`enemy.startShipAir`）：所有空戰船都有**前景雲霧**（色取戰鬥背景）＋**船尾兩條細煙**（`config.SHIP_TRAIL`，噴口量自各船螺旋槳上下緣）。

- ⛔ **7 號（紅煙囪側明輪）整個拔掉**（11-21 Ray：「7號跳過」→「整個拔掉」）：ASSETS 鍵、SHIP_TRAIL、測試戰都已移除（ver -2876）；立繪檔與 Wan 片子還在磁碟上，回收要問 Ray。

## 11-23 換機交接：現況（空戰副理）
- ✔ 待機全接上（v6airship「飛空船」版，Ray 剪）：n1 n2 n3 n4 n5 n6 n8 n9 n10 → `anim/mon_pirateship_nN_side_idle_v6airship/`；n2/n3/n6/n9/n10 另有程式船首起伏（`SHIP_TRAIL.pitch`）。
- ✔ 程式：前景雲霧、船尾兩條細煙＋船首雲線拉到畫面外（`enemy.startShipAir`／`config.SHIP_TRAIL`）；登艦戰甲板時段跟對艦戰、落影 220ms、落地震動。
- ⛔ n7 拔掉並回收。舊的 `_idle_v1`／`v3enh`／`v4air`／`_fade` 資料夾已沒人引用（回收要問 Ray）。
- ⚠ 8 艘（+9、10）各開卡還是同卡隨機外觀：Ray 未定；目前只有 test_pirate_nN 測試戰在用。
- ⚠ 空賊船攻擊動畫：沒做（現行是程式側舷齊射 broadside）。

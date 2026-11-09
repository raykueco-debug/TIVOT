# 背景動畫：分地圖工作表（2026-11-09 起，背景線副理／4070）

> Ray 11-09：「**從頭開始做，分地圖來做，城鎮一律靜態背景**」
> ⇒ 這一份**取代** `_anim_candidates.md`（11-06 那份是「以檔名為單位」的逐張判斷，混了城鎮與非背景素材）。
> ⇒ `anim/` 裡 11-07／11-08 那 20 支「整張丟 Wan」的 mp4 **全部作廢重做**（不拆層、循環是來回）。回收要等 Ray 點頭。
> 地圖清單取自 `script/town.js` 的 `TOWNS`；「城鎮」＝有旅店（`inn:true`）的地圖（憲法 §0.5）。

## 做法（每一格都一樣，憲法 11-08「一律拆層」）

1. 原圖 = 靜態層：天空、地面、岩石、樹幹、建築**一律取原圖**，不讓 Wan 碰。
2. 只有**被風吹的層**（葉、草、蕨、布、旗）＋**水**取 Wan 的像素（遮罩內才換）。
3. **雲由程式動**（遠慢近快、依焦點；Ray 11-08 的雲法），不進 Wan。
4. Wan 跑長一點（81 格），在成品裡**找自然回到原點的一段**當循環 —— 不倒放、不來回、不交叉淡化。
5. 一種新做法先做**一張樣本**給 Ray 看，點頭才批次。
工具：`ComfyUI-master/tivot_wan/bg_layer/bg_wan.py`（送 Wan）＋ `bg_comp.py`（遮罩、找循環段、合成 mp4）。
版控副本在 `tools/anim/bg_layer/`（換機器從這裡拷回 `tivot_wan/bg_layer/`）。

### 註記頁（Ray 11-09：「分各種顏色的半透明畫筆讓我在圖面上註記，有畫上去的顏色就在旁邊出 textbox 寫該色塊怎麼動」「下捲式、可提交可存檔、地圖分區擺、頁首放索引」）

- 開法：Claude Desktop 的啟動設定 `bg-annotate`（`http://localhost:8133/`），伺服器 `annotate_server.py`。
- 一頁捲到底：頁首是工具列（8 色畫筆、橡皮擦、筆刷大小）＋各地圖的索引（已提交／總格數）；
  底下依地圖分區，每格一張卡（可切時段）。
- 存檔＝草稿；提交＝這一格定了，可以照它做。
- 存在 `tivot_wan/bg_layer/notes/<地圖>__<格>__<時段>/`：`notes.json`（每色的說明＋整體備註）＋每色一張遮罩 PNG（原圖解析度，白＝塗到的）。
- ⇒ **拆層的遮罩改用 Ray 塗的**（`bg_comp.py` 的自動猜綠色只是沒註記時的退路）；每一色各自照它的說明送 Wan。

## 城鎮 —— ✔ 不欠（一律靜態，Ray 11-09 定）

帝都 capital／北方泊地 northport／夏爾村 shinier／聖索菲亞 santasofia／拉芬斯達爾 ravnsdal／
東方泊地 eastport／溫斯摩爾 winsmoor／孤舟島 loneisle／薇拉馮德 verafond —— 9 張圖，不做動畫。

## 非城鎮地圖（要做的）

| 地圖 | 格數 | 狀態 |
|---|---|---|
| 夏爾森林 shinier_forest | 10 | **進行中**（第一張樣本：林間空地 glade） |
| 卡耶爾山谷 canyon | 5 | 未盤 |
| 石製遺蹟 fallen | 5 | 未盤 |
| 帝都外郊 capital_outer | 4 | 未盤（11-06 判 gate／river 有人 → 靜態） |
| 里朋莊園 sofiaout | 10 | 未盤 |
| 平原古道 plainsroad | 11 | 未盤 |
| 鏡湖 lake | 10 | 未盤 |
| 木雅克神殿 shinier_ruins | 21 | 未盤 |
| 伊甸古墓 tomb | 61 | 未盤 |
| 羅賽爾廢城 dunmor | 55 | 未盤 |
| 貝利薩爾遺址 belisar | 37 | 未盤 |
| 聖王廳地宮 holysee_g3 | 1 | 未盤 |
| ⚠ 溫斯摩爾港（守城戰） winsmoor_siege | 82 | **待 Ray 定**：它沒有旅店，但背景是城鎮（戰鬥版）—— 算城鎮（靜態）還是要做？ |

## 夏爾森林（逐格）

| 格 | 背景 | 會動的層 | 狀態 |
|---|---|---|---|
| glade 林間空地 | forest_glade | 樹冠、草地、蕨 | 樣本跑中 |
| entry 森林入口 | forest_entry | 樹冠、蕨、架上掛的布 | 待樣本點頭 |
| trail 舊獵道 | forest_trail | 樹冠、蕨、紅布條 | 同上 |
| highland 高地 | forest_highland | 松枝、草；雲（程式） | 同上 |
| shoal 淺灘 | forest_shoal | 樹冠、蕨；小瀑布與水面 | 同上 |
| valley 河谷 | forest_valley | 樹冠、蕨；溪水 | 同上 |
| nest 獸巢 | forest_nest | 樹冠、蕨 | 同上 |
| cliff 斷崖邊 | forest_cliff | 草、松枝；雲海（程式） | 同上 |
| cave 岩窟 | forest_cave | 垂藤、蕨 | 同上 |
| ruins 遺蹟入口 | ruins_shinier_entrance | 未看 | 未盤 |

⚠ 時段：這張圖每格有 day／dusk／night 三張。樣本先做 day；其他時段怎麼跟（各跑一次 Wan，或同一段動作套到三個時段）等樣本過了再定。

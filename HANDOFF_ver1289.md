# 交接（截至 ver -1289）

## 現有進度

| 項目 | 狀態 |
|---|---|
| **地圖編輯器** | 完成並在用。筆：山／挖（每點 −100）／平（可指定高度）／自動修正／水／湖／河／貼材／擦除（含擦水、擦路軌）／移城。中鍵平移、每次改動要確認、復原、匯出。`mapEditClear()` 是**搬進回收區**不真的刪 |
| **地形圖** | 水文重整已**退回**（Ray 退：修改痕跡太重），現況＝`_src/terrain/heightmap_base.png`。同名覆蓋走 `TERRAIN_V`（`build_terrain.py` 自動 +1） |
| **鐵路／火車** | **整套暫停**：`flight/index.html` 的 `RAILS_ON=false`。軌道、路基、石橋、站場、火車、大地圖上的虛線一起不出。編輯器的「鐵路」筆跟著停用（顯示「＝ 鐵路（暫停）」），Ray 畫過的筆畫原封不動留在 `MAP_EDITS` |
| **貝利薩爾第一次降落** | 已上線（-1279）：按降落 → 演十拍（索菈娜找不到落點 → 改去東方泊地）→ 開大地圖標記東方泊地 → 蕾娜一句 → 關地圖記旗。之後再按降落只出蕾娜「先去東方泊地吧。」 |
| **索菈娜 `watch` 立繪** | 交件已進版（PNG→WebP、原檔在 `_originals/SI/`）。尺寸與站位 Ray 已驗收：`cm:132`／`standCm:168`／`fx:0.680`／`top:6`／`bot:1521` —— **不要再動** |
| **東方泊地** | 城鎮資料（13 格）、BGM、佈局圖都在；15 張背景還沒交 |
| git | 全部已 push。本機已改用 SSH 金鑰，`git push` 不會再問密碼 |

## 接下來的事項

1. **`belisar_land_ok` 這支旗還沒有人插** ⇒ 貝利薩爾目前**永遠降不下去**。
   等 Ray 的下一段稿決定由哪一拍插旗（作法同北方泊地的 `sail.hold.until`）。
2. **鐵路重做** —— Ray：「故事寫完城都做完再一次做」。`RAILS_ON=true` 就回來。
   重開時要重跑 `RAIL_CLIMB`，並過**兩條**驗收：
   ① 沿線坡度（可以有一點點坡，不可以爬山）
   ② 大地圖上的線密度（不可以變成一張網）
3. **東方泊地 15 張背景**交件後：拔各節點的 `bgPending`、補 `SETTLEMENTS` 的 `town:'eastport'`。
4. **拉芬斯達爾 5 張店內圖**（同名覆蓋）交件時要補 `config.js` 的 `ASSET_VER` 五列。
5. 長期：canyon 小地圖、瓦努努 Boss 卡。

## 驗收指令

```bash
python3 tools/script_lint.py     # 現況基準：0 個錯誤、41 個提醒
python3 tools/bust.py            # 改完 config.js 的 VERSION 之後跑
```

語法檢查：抽出 `flight/index.html` 最大的 `<script>`，用 macOS 的 `jsc` 跑
`new Function(...)`。⚠ `jsc` 檢不出 GLSL 的錯——shader 壞掉是**悄悄退回 CPU**
（`glReady` 變 false、無錯誤訊息），改完 shader 一定要在瀏覽器確認 `glReady===true`。
⚠ GLSL 在 JS 樣板字串裡，**註解不可以有反引號**。

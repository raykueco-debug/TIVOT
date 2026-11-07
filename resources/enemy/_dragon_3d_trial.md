# 王座徘徊者 3D 試驗（2026-11-06～07，ver -2587）

> Ray 交辦：空中遇敵改用 3D 畫敵人是否更好？照木桶理論挑最難的龍。
> 合格三條缺一條就判 3D 不適合、其他怪不跟進：① 與 2D 並排畫風不違和 ② 振翅手感不輸 Wan 2D ③ 手機不掉幀。

## ⚠ 定案（2026-11-07）：Ray 判「3D 方案可行，做下去」
- 下面「結果」那張表是 11-06 夜間試驗的紀錄（當時判第①條不過），**已被 Ray 的實看推翻**：他開遊戲繞著看過之後定案採用。
- 範圍：**其他空中怪全部跟進**；龍身上的鎖鏈／吊墜／布幡**不補回**（Ray：「不用」）。
- 抽格 33%（每 3 幀重畫 2 幀，`CAD.pat`）是 Ray 指定的。
- ⚠ 仍待：**手機真機 fps**（第③條），以及 3D 何時變成預設（現在仍要網址參數才開）。

## 空中怪整批（ver -2592，17 隻）
| 怪 | 資料夾 | 備註 |
|---|---|---|
| 王座徘徊者 | `flm_dragonthrone/drg3d*` | 拍翅參數讀 `ENEMY_KINDS.bldragon.sprite` |
| 骨刺飛鰩／浮空骨鯨 | `flm_boneray`／`flm_ribwhale` | 樣品（-2591） |
| 雙頭翼龍／裂口巨蝠／千眼巨蛾／甲殼飛鱟／骨脊長帶／懸環長鏈 | `flm_twinwyvern`…`flm_sky2_ringchain` | 有翅：三節拍翅＋尾波 |
| 飛鰻群／氣囊水母獸／面具長幡／群口之柱／人面花冠／眼之幕／天之裂隙／無面巨首 | `flm_eelswarm`…`flm_sky2_maw` | 無翅：只有身體波；管狀的四隻 `fit:'rad'`（照外接球對齊 2D 圖寬，不照身寬） |
- 南天的霸王＝無面巨首換名，`DEF.sky_southlord` 直接指過去。
- 參數全在 `flight/drg3d.js` 的 `DEF`（拍翅 `flap`、尾波 `tail`、比例 `spanK`／`fit`）。
- 四視圖：`resources/_originals/flight/mon3d/mon3d_<鍵>_4view_v1.png`（GPT，每隻一個新對話＋上傳戰鬥立繪）。
  群口之柱的原圖（滿身帶牙的嘴）連擋四次，改成「珊瑚柱、火山口狀圓孔」的描述＋拿眼之幕的四視圖當畫風參考才過。
- Hunyuan 常見的壞法與修法（`bake.py`）：多長一根桿子／一片平板 → `CROP`（可多個方塊，`;` 隔開）或 `PLANEZ=z,容差`（那一層、法線朝 z 的面刪掉）；
  面數太高（水母獸 8 萬）→ 改用粗一點的格點減面。
- ⚠ 四視圖切格：GPT 的版面不一定等分，`prep4.py` 會找空白分隔線；四格要**同一比例尺**餵 Hunyuan（各自填滿會把管狀的怪撐成一大塊）。

## 怎麼開
- **全部輪流看**：`?drg3d=side&drg3dhold&drg3dkind=all` —— 畫面上方「◀ 名字 ▶」或 `[` `]` 鍵換下一隻（免戰、停在原地不追）。
- 飛行頁網址加 `?drg3d=side`：2D 照舊，3D 擺在右邊並排；`?drg3d=1`：3D 取代 2D；再加 `&drg3dlo` 換低面數版。
- 試飛中叫出龍（主控台）：`spawnEnemy({kind:'bldragon', ahead:true, spawnDist:1500, speedMul:0.01})`
- 指定朝向：`DRG3D.dbg.yaw=0`（迎面）／`0.7`（斜）／`1.57`（側面）；`null` 還原跟航向。
- 增量成本：`DRG3D.bench(300,300)` → 每畫一次的毫秒數（含貼回 2D 畫布）。

## 產線（全部本機，未用 Blender —— 這台 3060 沒裝）
1. GPT 上傳 `mon_dragon_v1_flight`／`_flight_side` 當參考，出**簡化**四視圖（拿掉鎖鏈、吊墜、布幡，骨刺併成骨板）
   → `resources/_originals/flight/drg3d/drg3d_gpt_4view_v1.png`
2. ComfyUI 0.12 內建 Hunyuan3D 節點：`hunyuan3d-dit-v2-mv_fp16`（4.93 GB），正／左／背／右（側面鏡射）四張 → 23 萬面，約 5 分鐘
   （單張的 `-v2-mini` 3.82 GB 也試過：正面像、側面與俯視的深度是亂補的，淘汰）
3. 格點聚類減面 → 2.7 萬面（`drg3d.glb`，470 KB）／1.6 萬面（`drg3d_lo.glb`，265 KB）
4. 上色：四視圖投影成 2×2 圖集（`drg3d_atlas.webp`），依法線混合；投不到的地方用語意頂點色（骨白／金／紅／藍）
5. 繪製：`flight/drg3d.js`，自己的小 WebGL 畫布 → drawImage 貼回飛行頁 2D 畫面（解析度與 2D 怪同一個背景緩衝），
   地形遮擋沿用 `clipByTerrainDepth`；三階硬邊明暗＋背面外擴描邊
6. 振翅：頂點著色器三節鉸鏈，**參數直接讀** `ENEMY_KINDS.bldragon.sprite`（wingCut／flapAmp／wingRest／flapLag／flapDown）與 `wingHz`，與 2D 同一份

## 結果
| 條 | 結論 | 證據 |
|---|---|---|
| ① 畫風 | **不過** | `_originals/flight/drg3d/compare_2d_3d.jpg`：2D 立繪的鎖鏈、布幡、骨刺、彩繪玻璃紋路，3D 全部糊掉或被簡化掉；投影貼圖在斜角處拉花，整體讀起來是黏土模型 |
| ② 振翅 | 動作本身**較好**，但被①拖累 | `flap_strip_3d.jpg`：斜角時膜翼真的在 3D 空間下拍、上收（2D 鉸鏈只能正面看）；但翼膜是剛體分節，沒有 Wan 版的膜面起伏 |
| ③ 效能 | 桌機**過**；手機**待真機** | 3060：每畫一次 0.26 ms（2.7 萬面與 1.6 萬面幾乎一樣，瓶頸不在面數）；推估手機 3～5 ms。⚠ 風險：iOS Safari 的 WebGL→2D drawImage 可能整張讀回 CPU，只有真機量得出 |

⇒ **照「缺一條就不適合」：第①條不過，3D（這條 AI 產線）不適合，其他怪不跟進。**
⚠ 不適合的是「GPT 四視圖 → Hunyuan → 自動上色」這條**全自動**產線；手工建模＋手繪貼圖（Ray 在 Blender 做）沒有試，畫風那一條有可能過，但成本完全是另一個量級。

## 檔案
- 程式：`flight/drg3d.js`（只在 `?drg3d=` 時載入）；`flight/index.html` 兩處掛鉤（script 標籤、`drawEnemy3D` 開頭那一段）
- 素材：`flight/enemy/flm_dragonthrone/drg3d.glb`／`drg3d_lo.glb`／`drg3d_atlas.webp`
- 原始檔（不進版控）：`resources/_originals/flight/drg3d/`
- 判定不採用時：上面三個素材＋`drg3d.js`＋兩處掛鉤一起拿掉（走 `tools/recycle.sh`）

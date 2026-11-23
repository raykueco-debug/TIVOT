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


## 空戰調整面板（ver -2595～-2615，Ray 逐項要的）
- **入口**：首頁「空戰」鈕（管理人模式）→ 開在遊戲自己的飛行框裡（`?drg3d=1&drg3dfight&drg3dkind=all`）。
  左上「空戰調整」鈕收／展開**整個**面板（狀態記在瀏覽器）。
- **選怪**：◀ 名字 ▶（或 `[` `]`）—— 18 隻（17 隻＋南天的霸王）。
- **頂排**：免戰（勾＝到距離只閃字、不勾＝真的推棺進戰鬥；王座徘徊者／南天的霸王借劇本戰卡 `bl_sky`／`li_south`）／
  標準化（把目前這隻的設定抄給全部，**大小與觸手不抄**）／重刷／儲存。
- **分組**（點標題收合）：基本（開戰距離、大小、數量、動作速度、接近速度）／出場（出場方式：原本・直接飛來・側面巡航；巡航轉追、巡航消失）／
  轉彎（先壓坡再轉：傾斜角、傾斜快慢）／上下扭動（頭→尾的行進波）／觸手（蠕動、起點、波數；水母預設開）／描邊（粗細、消失 px：畫面上變小時線自動收）／已調清單。
- **唯一真相**：`flight/enemy/sky3d_tune.json` —— 按「儲存」寫它（devserver `/__save/` 白名單），開機讀它。
  ⚠ 開戰距離、接近速度、出場方式在**正式遭遇**也吃這份（只限有 3D 的怪）；沒寫的欄位＝原本的值（`ENEMY_CFG`）。
  ⚠ 數值由 Ray 調，定案前這支檔不由程式 session commit。
- 接戰之後牠**照原方向繼續飛**（推棺那段時間不消失、不停住）。
- 數量 >1：斜後隊形、相位錯開；33% 抽格每隻各存一張（不再整群關掉抽格）。

## 羽蛇／巨型蜈蚣補做（2026-11-21，空戰 3D 怪副理）
- 這兩隻是舊六視圖的 2D 怪（`ENEMY_KINDS` 鍵 `serpent`／`centipede`），11-07 那批沒做；現在 `DEF` 有了，`drg3dkind=all` 輪流清單裡也有。
- 四視圖：`resources/_originals/flight/mon3d/mon3d_sky_serpent_4view_v3.png`／`mon3d_sky_centipi_4view_v2.png`（GPT 各一個新對話，上傳戰鬥立繪 `mon_serpent_side_v2`／`mon_centipi_side`）。
  ⚠ GPT 第一版的正面／背面會把身體畫成「往下垂」（其實是俯視圖的畫法）→ 要明講「身體水平往後，正面看會被頭擋住」。
  ⚠ 羽蛇 v2 的側面把翅膀畫成高舉，與正面／俯視的平展矛盾 → Hunyuan 把翅膀做成一整面垂直的牆。v3 要求「側面看翅膀是側邊、薄薄一片」才對。
  ⇒ **四張的翅膀姿勢必須一致**，送 Hunyuan 前先用眼睛對一次。
- Ray 11-21 兩隻都通過。羽蛇用 v3、蜈蚣用翅膀紋路淡化版（`tools/sky3d/wing_veins.py sky_centipi 5 0.6` → `bake.py --cells _cells_vein5_60`，Ray：「翅膀紋路少一點」）；兩隻的 v1 已回收（`_recycle/flight/enemy/`）。
- 大小：2D 沒有 `spanW`，`spanK` 對齊俯視圖量到的翼展（羽蛇 ≈256、蜈蚣 ≈164 世界單位）。

## 空賊船十艘（2026-11-22，Ray：「空賊船也全部做成3D吧」）
- 本船＋n1～n6／n8／n9／n10，模型在 `flight/enemy/flh_pirate/`（本船）與 `flh_pirate_n<N>/`；四視圖 `mon3d_pirate[_nN]_4view_v1.png`（每艘一個新 GPT 對話，上傳戰鬥側面圖）。
- `drg3d.js`：`DEF.pirate` 是剛體（flap／tail 全 0、`TUNE_KDEF` 不扭、傾斜 12°），`fit:'rad'` 對齊 2D 船長 300；十艘掛在 `vars`。
  ⚠ ~~遭遇時挑哪一艘還沒接~~ 11-23 起每一隻隨機抽一款；網址 `&drg3dvar=n5` 或 `DRG3D.dbg.variant='n5'` 換看。要接得先定「哪一場用哪一艘」，戰鬥卡那一邊也要對上。
- 提示詞重點：桅杆垂直、帆是實心平板、**不要纜繩／旗／煙**（細線 Hunyuan 做不出來，只會長成平板）。
- Hunyuan 壞法：**中線縱向薄板**（x≈0 一片，從側面看是一大塊長方形）—— n5 船尾、n6 整條。
  修法：`bake.py --cropn=x0,y0,z0,x1,y1,z1,0`（只刪方塊內、法線朝 x 的面），太薄的帶（|x|<0.01）整條刪不會傷到桅杆；
  ⚠ 負號開頭的參數要寫成 `--cropn=-0.06,…`（argparse 會把 `-0.06` 當成旗標）。
- **十艘的烘焙一律加 `--sail --keel --keelsm 0.06`**（11-22 Ray 核可後全部重烘）：
  · `--sail` 帆單色（Ray：「帆都用單色就好不要有其他紋」）：側面圖裡低彩度、整塊在船身之上、不是扁長條的灰塊＝帆；
    那些頂點塗帆色、COLOR_0 alpha＝0 → `drg3d.js` 的著色器不吃貼圖、不描邊、不分明暗。遮罩存 `_originals/…/<鍵>_sailmask.png` 可檢查。
    （原本帆上的紋與方框＝其他視圖的圖案（甲板木紋、艙口）投影上去＋薄帆破洞透出描邊。）
    ⚠ `DEF.pirate.twoSide`：薄帆面向不一致，本體那一趟不剔背面，不然帆會破洞。
  · `--keel` 船底拉弧（Ray：「船底在側面變波浪狀，要拉成乾淨的弧型」）：側面船底線先中位數去尖刺（船尾螺旋槳葉）
    再高斯平滑（σ＝船身長 6%），船底往上一成全高以內的頂點等比拉過去，甲板不動。
    ⚠ 不要用 `--keeldeg` 的多項式那條（`--keelsm 0`）：整條套曲線會讓中段鼓太深、頭尾翹太急，被退過。
  · n5、n6 照舊帶各自的 `--cropn`／`--crop`（n6 用 `mv_pirate_n6_00002_.glb`，種子 777）。
- 檢查：網址 `&drg3dvar=all` ＝一場裡同時飛出十艘（數量自動＝款數，第 i 隻用第 i 款），不寫進調整值。

## 製作工具（2026-11-21 重寫進版控，舊的在 scratchpad 已遺失）
- `tools/sky3d/prep4.py <四視圖> <鍵>`：找空白分隔線切格（左右欄各找各的橫線、清 GPT 畫的格線）→ 同一比例尺 → ComfyUI input 四張＋`_cells/` 四塊。
- `tools/sky3d/run_hy.py <鍵>`：送 ComfyUI 的 Hunyuan3D-2mv（工作流是從 11-07 成品 glb 裡 SaveGLB 存的 prompt 撈回來的）。
- `tools/sky3d/bake.py <鍵> <原始.glb> <輸出資料夾> [--crop …] [--planez z,容差] [--cropn …] [--sail] [--keel --keelsm 0.06]`：刪碎塊 → 格點聚類減面（3 萬／1.7 萬面）→ 頂點色＋2×2 圖集。
- Hunyuan 輸出的軸就是遊戲的軸（+z 頭、+y 上），不必轉。

## ⚠ 早上待 Ray 決定
- `sky3d_tune.json` 的數值定案（他還在調）。
- 天之裂隙：清平板時膜邊被削成鏤空，要不要重跑 Hunyuan。
- ~~3D 何時變預設~~ → **11-23 Ray：「全部空中怪」接入遊戲**：`flight/index.html` 一律載 `drg3d.js`，不帶參數＝3D；`?drg3d=0` 關回 2D。模型載不到／沒 WebGL2 自動退回 2D。
  空賊船遭遇時每一隻隨機抽一款（記在 `enemy._v3d`）；⚠ 戰鬥畫面仍是本船那張 2D 圖，對不上。
- 手機真機 fps（第③條）。

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

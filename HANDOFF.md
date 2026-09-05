# HANDOFF — 彈殼演出／索拉娜共鬥語音／夏爾村嵌圖 ver -803〜-830（2026-09-05，全數已 push）

> 前一份（-696〜-731：回收區、戰鬥分級、九星、難度下修）已被本檔取代；
> 檔尾的「教訓／快速測法／背景待辦」是**沿用**的，不隨版次汰換。
> 目前 HEAD＝`ver 2026.09.05-830`，工作樹只剩並行美術 session 的未提交檔（**不要動**）。

## 這一批做了什麼

### 1. 彈殼噴出 VFX（-810〜-814）
彈殼素材：`Shell.png`＋`shotgunshell.png`（已轉 webp）。CSS 在 `style.css` 的 `.shell`
（`--sc`／`--sl` 兩個縮放變數＋sprite webp）。兩條 keyframe：
- `shellEject`＝拋物線（上升→頂點→落下，逐格 cubic-bezier 讓**頂點速度＝0** 才平滑）。
- `shellSide`＝直線斜射（單調，不減速不轉折）。
- 陸戰彈道反擊走 **JS `el.animate()`**（linear timing＝等速水平），過 (0,0)→(0.30,−apexUp)→(1,dyDown) 共 18 格。

規則（全部 Ray 逐項定案）：
- **點格彈殼**（`enemy.ejectShell(cell)`）＝低角度斜上往兩側噴到畫面外，
  **左排必往左、右排必往右**（`side` 由 cell 對盤面中心算）。
- **反擊彈殼**（`enemy.ejectCounterShell(x,y,opts)`）從 `state.counterPoint`（威脅生成點）噴出，
  **逐武器型別**：速射／機槍＝每發一顆一般款；散射／霰彈＝一顆 1.5× 紅殼金底火；
  爆發／狙擊＝一顆 1.3× 加長金色。船戰版更大、金色。
- **主武器**＝低角度斜上往兩側（無下降段）。
- **陸戰反擊**＝彈道弧（等速水平＋弧＋落下）；**船戰反擊**＝斜下無上升。
- 爆發型長度 +30%；**陸戰連射型反擊一律往右噴**（-814）。
- vfx 分類：`null`＝機槍(速射)、`'burst'`＝霰彈(散射)、`'single'`＝狙擊(爆發)；船戰＝`!!state.weaponSound`。
- 資料流：`defense.resolveThreat` 在 `removeThreat` 前寫 `state.counterPoint`；
  `weapon.weaponCounter` 讀它、逐分支呼叫 `ejectShell()`；`opts{sc,sl,shotgun,down,dir}`。

### 2. 戰鬥探索移動照樣耗時（-815）
**推翻 -584 的「戰鬥地圖不花時間」**（Ray：「戰鬥探索中移動也要耗時」）。
`modules/town.js` 的 `go()` 兩條移動路徑都**無條件** `clock.advance(STEP_MIN)`
（移除 `!siegeOn()` 的守門）。CLAUDE.md §6.5.4.3 那張表的「走一步 10 分鐘」列已改成
「照樣耗時 ver -815」。

### 3. 夜景時刻與反擊音效（-816／-817）
- 夜景 band 改成 **19:00 起**（`script/clock.js`：`h>=17&&h<19 Dusk`／`h>=19&&h<24 night`）。
- 反擊武器音：`se_weapon_cannon` 更新（船戰高爆）；`se_weapon_cannonshell` 發射同時播；
  `se_weapon_riflereload` 於**陸戰高爆**發射後 **0.5 秒**播。
- 新增 `config.tuning.landCounterSound`（`萊福槍:{after:{key:'se_weapon_riflereload',delayMs:500}}`）；
  三張船戰卡（萊福槍／霰彈槍）`once:'se_weapon_cannonshell'`。
- `weapon.weaponCounter` 的 soundKey 解析：`(typeof ov==='string')?ov:((ov&&ov.key)?ov.key:w.sound)`
  —— 陸戰 ov 是物件（沒有 key）時的破口已修。

### 4. 索拉娜搭檔：CI／語音／共鬥（-818〜-823）
- **語音**（config.js `partners.sorana`）：共鬥 `coop.voice=[vo_sorana_pack, vo_sorana_pack2]` 輪播、
  `coop.endVoice=vo_sorana_obe`＋`coop.endCutin=ci_sorana_obe`、`coop.endName='飛刀耗盡'`；
  主動 `active.voice=vo_sorana_supply`（獵手的智慧）；被動 `獵手的戰吼`(en `Predator's Roar`)`voice=vo_sorana_roar`。
- **登場音**：`man_sorana` 敵人卡 `entranceVo:'vo_sorana_pack2'`，`enemy.loadEnemyPortrait` 載立繪時播。
- **共鬥 3-hit 黃圈反擊**（`weapon.coopCounter`）：total＝hits×dmgPerHit×modMul×counterScale，
  per＝total/3，3 hits × 300ms，100% 命中。觸發在 `defense.spawnThreat` 尾端（90ms 後 `removeThreat`＋`api.coopCounter`）。
- fileGain 全部量過（BS.1770：cannon 0.76／cannonshell 1.17／riflereload 1.26／pack 2.35／
  pack2 1.73／supply 1.09／obe 1.78／roar 0.95）；voiceKeys 已加索拉娜語音。
- ⚠ vo 檔名原是 `vo_sorara_roar.wav`（typo「sorara」），已轉成正名 `vo_sorana_roar.m4a`。
- ⚠ **CI_Sorana_supply 是過渡圖，已撤出版控**（-820，Ray 指定）；webp 回收、png 留本機未追蹤。

### 5. Stage 6／選單／BR 底色（-821〜-825）
- **回索拉娜小屋後的劇情＝Stage 6**：`script/town.js` `sv_evening` 加 `stage:6`；
  `sorahome` 節點加 `innFrom:'safehouse_shinier'`（旅店 gated）。
- **章節列表**加 stage6（`script/progress.js` CHAPTERS，`clockHour:19, town:'shinier', node:'sorahome'`）。
- **選單對話文字加大**（`modules/settings.js`）：`K.text`／`bigText()`／`setBigText()`，
  `apply()` toggle `document.body.classList.toggle('dlg-large', ...)`；面板 #gmBigText「加大／預設」。
  CSS：`body.dlg-large` 下三種對話框行 font-size 16px。
- **BR 盤面底色維持原底色不轉黑**（-825）：`style.css` `#grid.dualwield,.overkill{filter:none;animation:none}`
  （拿掉 `background:#000`），非 done 格 `background-color:var(--grid)`。
- 旅店 gate：`modules/town.js` afterArrive2 `if(n&&n.inn&&!siegeOn()&&(!n.innFrom||prog.hasFlag(n.innFrom)))`。

### 6. 夏爾村（Shinier Village）飛行地圖嵌入（-826〜-830）
照 §6.7.5 的城市嵌入流程做的第一個新村。
- `flight/build_city.py` 的 JOB（shinier）：`hsrc` 外部灰階標高圖、`unsquash:1.0`、`maxdim:200`、
  `val:1.50`、`sat:0.95`，出 `_plan/_plan_lo/_h/_mass(.webp)`＋`_mass.json`（200×133、50 塊量體）。
  · build_city.py 這一批補強：`import cv2` 改 lazy（try/except，cv2=None）；`J.get('sat'/'val'/'maxdim')`；
    `hsrc` 分支（載外部灰階、crop、resize、`water=_hg<waterLevel`）；mass 區塊包 `if nomass or cv2 is None: skip`。
- `flight/index.html` SETTLEMENTS 補一列（`mx:1088, my:864, planW:360, planRot:0.0, planTall:24,
  podium:{r:1.05,skirt:8,lift:0}, plan:'city/shinier_plan.webp', planH:'city/shinier_h.webp'`）。
- ⚠ **落點踩過坑**：原定 (1107,826)，terrain 灰階 32 < CLOUD_H 44＝雲海盆地，podium 填不了雲海格
  → 村子「泡水裡」。Ray：「往西南移一個村落的位置就好了，太暗了跟坨大便一樣」→ 移到 (1088,864)
  實地陸地、val 1.12→1.50 大幅提亮。
- ⚠ cv2 之前沒裝，已 `pip install opencv-python-headless`（完成，cv2 5.0.0），量體層重跑補上。

## 這一批留下的缺口／進行中（下一個 session 接手）

### A. 平面 2D 開發地圖（Ray：「先把大地圖做成全平面不要有 3D，我直接點座標給你比較快」）
**還沒做。** 目的：讓 Ray 直接在正俯視的色圖上點，讀出精確地圖座標（給夏爾村這種要定位的城用）。
已分析好的落點：
- 色圖是 `flight/index.html` 的 `COL`（Uint32Array，從 `silvermoon_terrain.png` 載，約 line 3213-3230）。
- 現行地圖視圖是 `mapCv` canvas（`mctx`），變換 `sc=base*MV.zoom, ox=w/2-MV.cx*sc, oy=h/2-MV.cy*sc`；
  `mapPick(cssX,cssY)`（約 line 5035）已做 `rx=Math.round((cssX-ox)/sc)`。ADMIN 雙擊會傳送
  （`cam.x=MV.pick[0]*MAP_SCALE`）。
- `reliefXY(mx,my)` 是斜投影：`{x:mx*MAP_SS, y:my*MAP_SS*MAP_TILT+R.maxRise-hh*R.hK}`（X 線性、Y 有 tilt＋height）。
- **建議做法**：加一個 `?flatmap` 模式，把 `COL` 1:1 正俯視畫出來（**不吃 relief/tilt/height**），
  點擊 = 直接 `(round(cssX/scale), round(cssY/scale))` 讀出地圖座標。X 本來就線性，只要把 Y 也拉成線性即可。

### B. 技能發動後高光「該點的格子」（Ray：「所有戰鬥中的伙伴主被動，聖徒夢魘共鬥發動後都要標示現在應該點的格子。獵手的智慧除外，因為會直接進 BR」）
**還沒做。** 聖徒化(Saint)／夢魘化(Nightmare)／共鬥(Coop) 發動後，高光現在該點的那一格。
**例外：獵手的智慧（supply）不標** —— 它直接進 BR。
- 現成基建：`hintCurrentCell`（即死防禦後那個「一次性續命導航」同一支，鐵律 8）——
  惡夢化發動高光第一格已在用它（見 CLAUDE.md 惡夢化那節，`markNext` 在 hint:false 盤面上沒作用，
  **要用 `hintCurrentCell`**）。
- ⚠ CSS 權重坑（已在惡夢化踩過）：`.cell.next` 只改 border＋淡光，而 `#grid.saint .cell` 把每格設金邊、
  `#grid.saint` 又罩一層 drop-shadow 吃掉淡光 → 要一條**權重更高且換顏色**的規則（如 `#grid.ni .cell.next` 白框白光）。
  聖徒化盤面同樣是金的，加金光找不到 —— 需要對應的高權重規則。
- 發動點：`saint.activateSaint`／`activateCoop`（`saint.js`）；共鬥的黃圈反擊在 `defense.spawnThreat`。

### C. 夏爾村 planRot 微調
村在 (1088,864)、`planRot:0`。需要 Ray 用平面圖（做出 A 之後）看一眼，給旋轉角讓平面圖北向的湖
對齊地形現有湖水（Ray：「平面圖的北向要貼地形現有的湖水，可旋轉調整」）。目前落在一個坡上，
也可能要重新挑點。build_city.py 的 JOB 與 index.html 的 SETTLEMENTS 兩邊 `mx/my/planW/planRot` 要一起改。

### D. CI 佔位圖（美術 session 領域）
`CI_Sorana_predator.jpg`／`roar_*.png`／`ci_sorana_obe`／`supply.png` 都是未追蹤的美術佔位；
部署要它們在，但那是並行美術 session 的事，**不要動**。

## 環境備忘（給下一個 session）
- cv2 已裝（opencv-python-headless 5.0.0）—— build_city.py 的 mass 區塊現在跑得動。
- dev server 埠會變（上次是 57635），用 `preview_start` 起。
- 飛行相機：console 直接讀 `cam`（x/y/angle/alt/speed）；強制白天 `clock.minutes=720`。
- 音量測法：`tools/audio_scan.html` 現場列目錄逐支印建議值；語音要過完 voiceChain 才量（見 §6.6）。
- 原 wav 進 `resources/_originals/audio/<vo|se>`，不入版控。

## 教訓（沿用，逐字遵守）

1. **「不准再自己發揮，嚴格用我給的形狀跟位置，1 pixel 都不准差。」** 他給圖就是規格。
2. **「做之前先跟我確認。」** 對圖有任何一處看不懂，先問再動手。
3. **改完必須在瀏覽器實測再交**。
4. python 替換程式碼時**錨點必須唯一**。
5. ⚠⚠ **改了一個機制之後，去問「誰掛在它上面」**（-706 三帶反擊連環四 bug 的教訓）。
   **改語意的那一版，就要把所有讀它的地方掃一遍。**
6. ⚠ **重複鍵不會有錯誤訊息**：物件字面同一個鍵寫兩次，JS 靜靜取後面那個。改資料前 grep 一下。
7. ⚠ **jsc 的語法檢查會把 `import` 剝掉** —— 以瀏覽器實測為準。
8. ⚠ python splice 用「起點到終點索引」時先確認中間沒有別的東西。
9. ⚠⚠ **靜態空間分大小寫、macOS 不分**：檔名推法（如 `_BF` → 基底名）本機測不出來，上線整排 404
   —— 逐格寫出真實檔名（夏爾村 hsrc、城重建背景都踩過）。
10. ⚠ **改圖同名覆蓋要帶 `?v=N`**：瀏覽器快取沿用舊圖，量像素指紋確認換到新的。

## 快速測法（瀏覽器 console）

```js
Promise.all([import('/state.js'), import('/modules/combat.js')]).then(([st,combat])=>{
  window.__st=st; window.__combat=combat;
  document.getElementById('home').classList.remove('on');
  combat.startScriptBattle('flight_pirate',{story:false});
});
// 等 1.5 秒後：
__combat.pauseForDialog(); __st.state.energy=85; __st.state.combo=13;
window.dispatchEvent(new Event('resize'));   // 觸發 layoutClasp + updateEnergyClasp
```

彈殼／反擊要看實際軌跡：`enemy.ejectShell(cell)`／`enemy.ejectCounterShell(x,y,opts)` 手動叫一次，
用 DOMMatrix 取樣確認頂點速度＝0、方向、等速。

## 背景待辦（沿用中）

- ⚠⚠ **多語種整批留到最後做**（Ray：「多語種等全部完成再做」）—— 在那之前**只維護繁中**，
  英日落差先記著、不逐版追。已知落差：`tutorial.story`（地宮聖徒戰那份）只有 `i18n/zh.js` 有，
  切 en/ja 時 `tut.story` 是 null；逐版改的台詞 en/ja 跟不上。
- **交叉雙槍兩張圖**（`resources/vfx/42452231-….png` 彩色、`background/…` 黑剪影）：
  Ray「另有用途」，用途還沒講 —— 下次問清楚再接，先不入版控。
- stage2 羽蛇「戰鬥結束」戲（Sturm／Deck_Chaos／著水）等 Ray 的 stage2 稿與素材。
- **九星素材配方**（`config.gunUpgrade.recipes`）仍是草案；「部分關鍵素材由劇情控制產出」那幾樣沒填。
- **副武器第 5 階特殊能力**（`tuning.weaponPerks`）先留槽（Ray 還沒想好）。
- **強化護符**（`items.defs` 的 `cat:'charm'`）：管線全通、一張卡都還沒給，不要自己發明。
- **S3 章節編號**未定（出航～北方泊地之間）；試玩／飛行的暫填值（STAGE_DEFAULT 等）先擺 5。
- 森林地圖的戰鬥（夏爾村所在的暗色森林）尚未鋪。
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。

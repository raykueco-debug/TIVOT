# HANDOFF — 彈殼演出／索拉娜共鬥語音／夏爾村嵌圖／平面地圖／技能指格 ver -803〜-833（2026-09-05）

> 前一份（-696〜-731：回收區、戰鬥分級、九星、難度下修）已被本檔取代；
> 檔尾的「教訓／快速測法／背景待辦」是**沿用**的，不隨版次汰換。
> 目前 HEAD＝`ver 2026.09.05-833`，工作樹只剩並行美術 session 的未提交檔（**不要動**）。

## -832〜-833（接手 session 完成的兩項）

### 7. ?flatmap 平面 2D 開發地圖（-832，＝原缺口 A）
`flight/index.html` 網址帶 **`?flatmap`** → 地圖視圖改畫 `COL` 的 **1:1 正俯視**
（不吃斜投影／tilt／高度位移），**點選讀數＝精確地圖座標**（與 SETTLEMENTS／
build_city.py 同一套；ADMIN 雙點瞬移照舊）。
- 作法：`buildRelief()` 開頭分流建平面畫布（海＝HGT≤CLOUD_H 塗 SEA 色）；
  `reliefXY` 在 flat 下是**恆等式** → 國界／道路／鐵路／聚落／自機／標記全部自動落對位
  （一行都沒分岔，鐵律 8）。`relief` 物件多 `ss`（地圖px→畫布px 倍率，浮雕 0.5／平面 1）
  與 `flat` 旗，drawMap 的線寬與聚落半徑改讀 `R.ss`。
- `mapPick` flat 下 `i=ry*MAPW+rx`；左上讀數 flat 時顯示「平面1:1 中心 (x,y)」
  （平面下中心座標是準的，浮雕那條「寧可不給」只針對斜投影）。
- `MV.max` flat 下放寬到 48（要放大到看得清單一像素）。
- 實測：zoom 1 與 zoom 24 點選讀回的座標**一像素不差**；不帶 ?flatmap 的浮雕版
  回歸無變化。

### 8. 技能發動後標示「現在應該點的格子」（-833，＝原缺口 B）
Ray：「所有戰鬥中的伙伴主被動，聖徒夢魘共鬥發動後都要標示現在應該點的格子。
獵手的智慧除外，因為會直接進 BR」。全部走既有的 `hintCurrentCell`／`.next`（鐵律 8）：
- **聖徒化**：markNext 的 saintMode 分支**本來就在標**第一格 —— 病在 CSS
  （`#grid.saint .cell` 金邊權重蓋掉 `.cell.next`，正是 -684 NI 那個坑）。
  補 `#grid.saint .cell.next`（白框白光，niNextPulse），放在 `#grid.ni` 那條**之前**
  讓 NI 底色贏。
- **夢魘化**：-683 已有，不動。
- **共鬥**：`saint.startCoop` 補一次 `api.hintCurrentCell()`（不換盤，指殘局當前格）。
- **生命歸還**：`lifeReturnAbort` 的 return cut-in 回呼在 `finishSaintMode` **之後**
  補指（那時 saintMode 已關、新盤已建，guard 才放行）。
- **fireBuff**（明晰之夢＋高裝藥彈共用執行體）：拿掉 `pas.key==='firstCounter'`
  的限制 → 兩支被動發動都指一次（全程指引仍只有明晰之夢，那是 lucidActive 的事）。
- **獵手的直覺**（perfectStreak）：cut-in 回呼補指（clearBoard→goNextBoard 是同步的，
  cut-in 撤下時新盤已擺好）。
- **獵手的智慧／前線補給**不指（直接進 BR，Ray 指定的例外同理）。
- 實測：SI 發動白框標 1 號格；共鬥發動標殘局當前格（expect=4 標 4）；
  生命歸還收尾標新盤 1 號格。

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

## -837：vo 大更新／獵手戰吼兩段式／手機卡頓調查（接手 session）

- **vo 13 支新錄音**（Ray 交 mp3/wav）轉 m4a 接線；「編 1、2 的都是輪播」＝
  `SFX.pickRot`（**唯一的輪播實作**，鐵律 8 —— saint 的 coopVoIdx 與 partner 的
  voRotIdx 已收攏）。同名覆蓋的（nou_saint/guard/return、anya_melt、sorana pack/pack2/
  roar）ASSETS 掛 `?v=2`；舊 sorana 五支走 recycle。原 mp3/wav 進 `_originals/audio/vo`。
  fileGain 全部重量（BS.1770＋voiceChain EQ、耳機/手機平均、峰值夾 +2dB —— 量測腳本
  是 session 現寫的，方法同 -818）。明晰之夢 4 支輪播收成單支 `vo_anya_lucid`。
- **獵手的戰吼兩段式**（Ray）：連 3 盤完美清盤發動（voice＝roar2，**計數不歸零**）；
  連 5 盤再發動＋**重置共鬥**（`saint.resetInstallSlot` 具名 setter，partner 經 combat
  注入呼叫）＋計數歸零，voice2＝roar。卡上 `streak2`/`voice2`。
- **索菈娜為夥伴 → 戰鬥 BGM `bgm_whirlwind`**（Peritune_Whirlwind.m4a，已量 0.97）：
  表在 `config.battleBgm.partner`，判定只在 `main.battleBgmOf`（卡上 `bgm` 仍最優先；
  搭檔＝卡上 `partner`，否則 `partner.storyPartnerKey()`）。
- **手機戰鬥卡頓調查結論**：①主嫌＝索菈娜 CI 五張 2.0~2.5MB 的 1024×1536 PNG ——
  戰吼每 3 盤輪播一張，cut-in 當下下載＋解碼（playCutin 的 300ms 保底蓋不住），
  已整批轉 webp（0.10~0.27MB，90%↓；原 PNG 留原位給美術）②戰鬥開場的敵立繪/背景
  解碼尖峰（桌機 76/51ms，手機 ×5~10）—— 補 `combat.warmPartnerCutins`（開場 idle
  預熱搭檔全部 CI）③點格＋彈殼 VFX 實測**不卡**（快速清整盤 0 個 long task）。
- **cutinFit**（Ray：「獵手的智慧 CI 後方角色不要被裁掉太多」）：`#cutinImg` 是 96% 高
  再乘 keyframe scale 1.2~1.3＝溢出 ~20%；keyframe 改乘 `var(--ci-s)`，
  逐張表在 `config.tuning.cutinFit`（supply＝0.78，實測 computed scale 0.95）。
- **拖城「舊的要刪掉」**：`dropSettlement` 落定即 `buildCityMask()` —— 插畫/量體當場
  搬家、舊位置立刻回地形；整地（podium 烘在 HGT）仍要重整才跟上（讀數框有寫）。
- **Sorana_SI_readysmile**：session 開始前就被刪（git D），Ray 21:28 放了新 PNG ——
  已轉回 webp＋重量取景（top:6 bot:1534 fx:0.578，`?v=2`）。**tease 找回**：
  `_originals/SI/Sorana_SI_tease.png`（透明版）轉 webp、量好掛進 ART（腳本還沒用到）。
- ⚠ `Peritune_Mystic_Tides_loop.m4a` 還沒接線（Ray 沒說用在哪），未入版控。
- ⚠ `resources/audio/se/` 的 `dragon-studio-groaning-metal`／`se_cannonslide` mp3
  未轉檔未接線（-816 的 cannonslide 已有？—— 待確認是否重複）。

## -838：夏爾村村戰全接線（Ray 交稿＋交件）

- **onLeave 立繪**：村民（獵人）/村民（雜貨）/村長＝`NPC_shinier_*` 轉 webp＋量取景；
  兩位「村民」是不同 id（VILLAGER/VILLAGER2，同 NP 店主那條）。索的 expr 換
  `guardtalk`、第一拍 `bg:'Shinier_East_night'`（⚠ 對白拍的 bg 不走時段鏈，寫死夜版）、
  `sides:{SORANA:'L'}`。工匠立繪（Gunsmith）備著（`ART.sh_craftsman`，還沒有戲）。
- **戰前強制整備**（Ray：「強制開整備畫面，高光伙伴欄，提示此場戰鬥由索拉娜搭檔出擊」）：
  onLeave 帶 `gear:{partner:'sorana', msg}` → 對白演完開整備頁（既有 `guidePartner`
  聚光燈＋自訂訊息），**收掉才放行移動**（gear.onceClosed）；`forcePartner` 先寫進
  loadout，頁面顯示的就是她。
- **評價 T1/T2**：`BY_BATTLE.sv_wild.byTier`（門檻查表，tier＝蕾娜自己的好感
  `prog.tierOf`）；十句稿全接（shockedCalm/writting/upset/dying/bow/pause 差分都在）。
- **好感**：戰後索菈娜 +10 掛在評價句的 `aff`（D 併成 12、C 併成 11；once 旗
  `eval_aff_sv_wild_<rank>`）。⚠ E 沒給稿＝沒有評價那一段也沒有 +10（同 np_claws 慣例）。
- **索菈娜亂入**（D/C）：`evaluation.INTRUDE[場次][等第]` → `spk.follow` ——
  蕾娜那句打完 0.9 秒，換 `RennaSorana_SI_annoyedD/C` 雙人圖＋名字改索菈娜重打字。
- 實測全鏈：onLeave 立繪→整備頁（聚光燈+提示+索菈娜已配對）→關頁→移動→sv_beast 開打；
  sv_wild 結算 T1-S 句、+10 入帳、D 亂入雙人圖與台詞。script_lint 0 錯誤。

## -839：村戰對白入戰鬥／飛刀反擊／裂紋輻射／亂入抽卡（Ray 連環交辦）

- **村民戰前對白搬進第一場戰鬥**（Ray：「進入第一場戰鬥以後才發生，有背景，有怪
  才開始對話」）：`battles.sv_beast.talk`（battleStart、talkOnce:'sv_siege_talk'）；
  onLeave 只剩圍城旗＋強制整備（引擎支援**沒有台詞只有整備**的 onLeave）。
  cast 補 sorana＋夏爾村三人（tutPortraits 自動出鍵）。
- **戰鬥對白同槽換人＝抽牌輪轉**（Ray：「村民換人講話時也要比照對話特效」）：
  showLine 的換圖分「換人」（滑出 200ms→換 src→滑入）與「表情差分」（照舊直換）；
  syncCastFit 步首只擺**該槽第一個開口的人**。⚠ 快速連點會打斷 200ms 排程 →
  補「pending 就取消並復原 .in」（§6.5 延後上場要能取消的同族坑，實測踩到）。
- **共鬥反擊＝飛刀**（weapon/dagger 交件）：`enemy.throwDagger`（畫面外左右輪替
  射向反擊圈、旋轉對齊彈道＋隨機傾角/尺寸、mix-blend-mode:screen 吃黑底）；
  3hits×**0.2s**；射出 `se_soranacounter`／命中 `se_soranacounterhit`（傷害與命中音
  掛在 onHit —— 時刻由 enemy 唯一決定）；反擊點＝defense 收圈前記的那顆圈。
- **破防/ovk 裂紋輻射**：裂紋切片搬到 `.cell::after`（進入 dual/overkill 才生成），
  逐格 `--cd`＝離盤心距離＋抖動（buildGrid 算），crackIn 0.1s → 全程 0.3 秒鋪完；
  `se_glasscrack` 在 startDualWindow 與 overkill 開窗各播一次。
- **索拉娜亂入＝水平抽卡**：inspector 的 follow 改兩段 animate（滑出→換雙人圖＋
  名字→滑入）。**搭檔鎖定（僅本劇情戰）**：gear open 的 `lockPartner` —— 其他頁籤
  反灰不可選＋gsNote 回饋；close 歸零。索菈娜 `selectVoice:'vo_sorana_pack'`。
- 修正：Ray 現場把 town.js 的一拍改成裸識別字 `Nouvelle_SI_Shocked2` → `nou('shocked2')`。
- 全部瀏覽器實測：talk 立繪與輪轉、鎖定整備頁、9 刀 9 中、crackIn 逐格延遲、
  glasscrack 請求、D 亂入雙人圖。

## 這一批留下的缺口／進行中（下一個 session 接手）

### A. 平面 2D 開發地圖 → **已完成（-832，見上面第 7 節）**
### B. 技能發動後高光「該點的格子」 → **已完成（-833，見上面第 8 節）**

### C. 夏爾村落點（-834 → -835 兩改）＋管理者拖城工具
- 落點：Ray 先點 (1116,828)（-834，還是泡湖）→ 再改 **(1098,798)**（-835，湖西北岸
  高地，高度 69~128 實地）。`planRot` 仍 0，Ray 這次沒提旋轉。
- **管理者拖城**（-835，Ray：「用管理者模式點城鎮兩下就可以拖著走」）：
  地圖上（浮雕與 ?flatmap 都行）**雙點一座聚落＝拿起來**（落在聚落上就不瞬移，
  空地雙點瞬移照舊），拖到哪跟到哪（圖標與同名 PLACES 名牌即時走），
  **放開＝落定**：讀數框＋console 印座標、存 localStorage（`tivot_settle_drag_v1`），
  **重新整理後**整地／取樣遮罩／道路在新位置重烘（loadWorld 烘的，活的世界改不動）。
  覆寫只在 ADMIN 生效；`settleDragClear()` 清掉。
  ⚠ **定稿流程**：Ray 拖好 → 把落定座標交給 session → 寫回 SETTLEMENTS＋
  build_city.py（兩邊互指）＋重跑 build_city → 請 Ray `settleDragClear()`。
- **鐵路與夏爾村**（Ray：「不用硬拉火車過去，他沒有在路線上」）：查證後**本來就沒接**
  —— `buildRails` 只連 `t` 以 `city` 開頭的大城，村不在網內；(1098,798) 下鐵路最近點
  39 地圖像素。之前貼著湖的那段是幹線沿河谷取道。**拉到村口的是公路**
  （村落靠公路接駁的既有設計）—— Ray 若連公路也不要，再說。
- 順手：飛行頁 HUD 的 `FLIGHT_VER` 從 -793 更新到 -835（它是獨立寫死的戳，隨版推進）。
- **-836**（Ray：「太糊了都看不出來是村落」「要跟帝都一樣遠遠的就看得到提示箭頭」）：
  · 插畫解析度 `maxdim` 200→440：-827 的 200 是當時「縮小再放大像素化」的指定，
    現在退回全案預設；原圖 1534px 細節都在，**不必重渲**（Ray 有提議給原圖重渲，
    若 440 版他仍嫌糊再接受）。量體 49→197 塊。
  · 遠距箭頭＝`drawPlaces` 畫 PLACES —— 夏爾村之前**沒有 PLACES 條目**所以什麼都沒有。
    補 `{x:1098,y:798,name:'夏爾村',type:'帝國・村落'}`（index.html＋export_mapref.py
    同步；拖城工具搬的是同名兩份，會一起走）。實測遠距 ▼ 箭頭與近距名牌都出現。
  · ⚠ `shinier_plan.webp` 同名覆蓋且**內容真的變了**（200→440）——city plan 的載入鏈
    （`_plan.webp`→`_plan_lo`/`_mass` 字串推導）掛不了 `?v=`；GH Pages max-age 600 秒，
    上線後若還看到糊的等十分鐘再重整。

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

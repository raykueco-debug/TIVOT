# HANDOFF — 截至 `ver 2026.10.30-2323`（10-30 深夜，iMac 程式 session）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、回收舊交接**（`tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261030-203231`（10-19，-2255；git 歷史也有）。
> ⚠ -2256～-2316 這 61 版**當時沒有人寫交接**，下面「這一段做了什麼」是 10-30 從 git log 補的，不是各 session 自己的收工紀錄 —— **實測狀態不明的一律列在「要實測」**。

## 現況
- 只有一個分支 `main`。兩台在推：**Windows 3060**（`C:/Users/User/Desktop/TIVOT`）與 **iMac**（`/Users/rayku/Desktop/TIVOT`）。**開工先 `git pull`，推之前再 pull 一次**。
- 測試伺服器（Windows）：遊戲 `tivot-claude` **8202**、試玩版 dist **8215**、PV 編輯器 **8130**。**8200 是 Ray 的，不要碰**；Ray 測試中的分頁不碰，要測另開。
- 版本號一律 `tools/bust.py --bump`；commit 前 `tools/script_lint.py`。
- 美術交接 `resources/_HANDOFF_ART.md` 也停在 10-16，**下一個美術 session 開工要一起換新**。

## 這一段做了什麼（-2256～-2316，都推上了）
- **-2257 離線包**：檢查更新／下載收進選單（槍棺齒輪／飛行畫面 II），浮動鈕拿掉；只有主畫面 App 才出現。
- **-2259 Ray 10-25 待辦一批（20 件做了 19 件，1 件待確認 —— commit 訊息沒寫是哪一件）**：動畫 004／008、044 v3；教堂 024 改 T2 就出；夢境黑幕蓋滿前點擊不推進；結算頁拿掉兩列 ⚠；B 級以上的怪自帶結算（RUSH 除外）；槍店重複挑戰不再升階；無搭檔也預熱破防 CI；索菈娜 counterAll；夏爾村／鏡湖／東泊／驛站的出航鎖；餓扁強制送餐廳；神殿前廳 _day 暫以 dawn 代；飛行 S1 以前不畫遺跡；獵手之眼條件。
- **-2260**：獵手之眼改成索菈娜入隊就能發動、追王座徘徊者教學一定出；兩句出航鎖改「不能丟下伙伴。」；鏡湖瀑布不出箭頭。
- **-2261～-2268 空中怪**：第二批 spine／mouthpillar／ringchain／eyeveil／maw 待機動畫交件；**16 隻接上飛行地圖＋敵人卡（數值暫用羽蛇）**。
- **-2269～-2292 薇拉馮德**：夜襲（分支1 敲門夜談／分支2 直接睡 → 賽西莉＋尼莫戰 → 亞隆收場）、拆出 **Stage 21**（回到薇拉馮德旅店那一拍）、夜襲演完三秒黑跳隔天 08:00、隔日一日遊 → 快進三天 → 茉莉來訪 → 莊園大門；插圖 045／047／048（依好感分歧）、041 由下往上平移；破窗房間；照 Ray 改過的差分表對齊；亞隆不眨眼。
- **-2293～-2316 孤舟島**：040 換 Ray 新版；出航方向說明、抵達＝**Stage 22**、六號船塢、旅舍敲門；胡安 10／蘿芮／尼莫／賽西莉差分、兩個船匠；索菈娜暈船系列＋插圖 049（T3）、faint；BGM＝Bustling Village；後半：索菈娜 T4 解鎖、快進六天改裝完成、巡航 800、四個空之主、尼莫戰、離島對白；**飛行怪游動 loop 播放＋劇本遭遇預熱**（懸環長鏈飛行正面圖＋振翅 loop 已接）；賽西莉 sulkshout、蘿芮 disbelief、bowsweat 無汗版。
- **美術**：溫斯摩爾港守城戰拓樸 v3 → **v9b**（82 格、市政廳西北、敵從南東、室內地點改為店門口的街；模擬器在 `resources/map/`）；**守城戰戰鬥背景 57/57 交齊**（黃昏，寬圖裁兩格 768×1024，工單 `_worklist.md`）；空中怪飛行正面圖交辦 13 隻（10-27）。

## 10-30 晚上接著做的（-2317～-2323，都推上了）
- **離開孤舟島 → 南天的霸王 → 溫斯摩爾港（西泊）**：離島對白後飛出孤舟島空域，正面刷「南天的霸王」（借無面巨首、飛行圖加倍大、rarity S、戰鬥卡 `li_south` 數值暫代），撞上凍住演戰前對白（飛行頁新的 `intro:'talk'`）再開戰，打贏演戰後對白。
- **西泊抵達＝Stage 23**：第一次降落在碼頭（`firstEntry` 到 `ws_arrive`），演阿什弗德那一段 → 自由行動（旅館開大廳可約人、不能睡、不能離港）。章節列表有 Stage 23（從碼頭開始；Stage 22 起始旗抽成 `CH22_FLAGS`）。
- **17:00 米夏攻城**：閘門依約會對象換人通知（閘門新欄位 `linesByDate`；約安雅→諾薇兒、約諾薇兒→索菈娜、約索菈娜→諾薇兒、約蕾娜→阿什弗德、沒約人→傳令兵）→ 讀取頁跨圖進**戰時地圖**市政廳演攻城那一段，演完停在那裡。
- **戰時地圖 `winsmoor_siege` 換成 v9b 82 格**（照 spec 出口表逐列抄、黃昏戰鬥背景），舊 40 格日景圖已沒有人引用（還沒回收）。
- **戰時地圖碼頭移位（ver -2325，Ray：「市政廳接雲海碼頭的邏輯很奇怪」）**：碼頭由 (2,3) 移到西緣 (0,3)、(2,3) 改成「市政廳街2段」——**只換名字與背景，連線沒動**。碼頭圖改名 `ws_0_3_dusk`，舊崖邊路2段圖已回收；(2,3) 暫借 `ws_2_1`。城鎮版佈局圖 `resources/map/_layout_winsmoor.png`（`tools/map_layout.py winsmoor`）。
- **阿什弗德立繪**：front（Ray 定案）＋ bow/talk/serious/smile/sweat/phone/think/shout 已接（`rescale` 逐張量，取景未在遊戲裡看過）。
- **紫月軍一般步兵小隊**：照里朋一家的群戰分層作法。**小隊 1 定案並拆層**（`resources/enemy/man_purple_squad_1_layers/`，spec `resources/enemy/_purple_spec.md`），敵人卡 `purple_squad_1`、戰鬥卡 `ws_purple_1`（數值暫抄 thug_squad，還沒有腳本引用）。
  **小隊 2~7 群體圖已出、未拆、未 commit**（`resources/_originals/enemy/man_purple_squad_{2..7}.png`，Ray 還沒看）。

## 等 Ray 決定
1. **試玩版上線方式**：主 repo `raykueco-debug/TIVOT` 是公開的、GitHub Pages 有完整遊戲 —— 建議主 repo 改名設私人、另開公開 repo 只放 `tools/challenge_build/dist`。部署腳本還沒寫。
2. **守城戰玩法**：⚠ 上一版這一條寫「都沒定」是**錯的** —— 規則在 `resources/map/_winsmoor_spec.md` 的「A-定案 v9」：主角先走、敵人沿最短路走一格；同格／錯身＝戰鬥（不耗回合）；戰後其餘敵凍 S2／A1／B0 回合；場上 2 隻、清一補一、共 7 隻；敵人踏進市政廳＝輸。
   ⚠ **ver -2327 Ray 改稿**：攻城那段改成「市政廳第一戰白衣衛隊（`ws_guards`）→ 戰略圖 → `ws_defend` 進守城戰」；
   守城戰**前五場灰衣（紫月軍小隊）、第六場白衣衛隊**（不是七隊），第六場打完結算 → 插 `ws_defend_clear` → 米夏段＋米夏戰（`ws_misha`：NI 回滿後再清一次就贏，`lastStand.noKill`）。
   **輸了一律回到第一戰前的對話**（WS_SIEGE 第一拍 checkpoint、那一段 `noCheckpoint`）。
   **ver -2328 守城戰引擎接上**（`modules/town.js` 的 `defend*`，資料 `TOWNS.winsmoor_siege.defend`）：B 不停（Ray 定）、場上 2 隊、6 隊（紫月 1～5＋白衣）、紅點畫在小地圖、每步戰情中心廣播、敵軍進市政廳＝回檔。⚠ 只驗了「踩到→開打→A 凍 1→補兵」與「戰敗回檔」，六隊打完接米夏段沒走過；踏進市政廳那一句是暫填。
   真的還沒定的：截到打的敵人卡數值（紫月軍菁英？）、輸了回捲到哪、紅點小地圖畫法、「B 不凍」取代舊稿「B 敵走 2 格」有沒有點頭。
   入口已接（17:00 閘門 → `winsmoor_siege` 市政廳），但戰時地圖上目前**只能走、沒有戰鬥、不能出航**。
   ✔ **紫月軍小隊 2~7 已拆層並接卡（ver -2324）**：art `a0ec8bfb` 交 6 隊分層（`man_purple_squad_{2..7}_layers/`，第 6 隊 4 人、其餘 5 人；每層誰被哪件掩體剪見 `_purple_spec.md`「群戰分層（小隊 2～7）」）。敵人卡 `purple_squad_2..7`（同小隊 1：contain 置底、數值暫抄 thug_squad），戰鬥卡 `ws_purple_2..7`，**還沒有腳本引用**。⚠ 待 Ray 進遊戲看：2、5 隊左右貼畫布邊、3 隊只剩 5~7px；2 隊前排老兵靴子比原圖低約 39px；5 隊長椅右端與幾把槍口／刺刀尖是照原圖輪廓軟切（切口無線稿）；5 隊沙包比原圖略大略高；6 隊整群較小（目前沒另外調縮放）。
3. **-2259 那一件「待確認」是哪一件**，要 Ray 點名。
4. 數值暫填：卡耶爾 Boss（崩岩巨像）與群怪抄 `np_boss`（群怪整群總血 220）；**16 隻空中怪抄羽蛇**；卡耶爾大小型分法、mix12 是我加的。
5. 夢境整備頁那句「……夢裡沒有整備的餘裕。」是暫填。
6. 薇拉馮德新地名「港町」「中央區」西文沒對應（西文暫停中）；試玩版 es 教學缺新那一句（西文整批時補）。
7. 立繪：同一人台上中途翻回來目前做不到 —— 要不要加「這一拍翻回」。
8. 美術待判：賽西莉 call／ready／battlecry 頭髮、pant 左肩、shyhand 頭頂裁到要不要重畫；廢城 `hallcourt`、郊外 `backhall` 要不要重畫；`capital_outskirts_dusk`（厚塗）要不要換成 `capital_outer` 的 windmill；插圖 023／024 沒引用、032 未交、042 未引用；被刪的 33 張圖要不要還原；其他人類敵人要不要比照米夏補呼吸待機。
9. **眨眼補丁**（10-19 新增 96 張）：約 30 張待判寫進 `tools/blink_reject.txt`（清單見上一份交接），13 張沒產出建議直接排除；賽西莉 9 張半閉待 GPT 換串重出（`grid_d19_3.png`）。⚠ 這段期間已排除：亞隆 9 張、`npc_imsoldier_si_awe`、安雅 shakehead 舊圖。
10. **iMac 未進版控的檔**：兩張 UUID png（根目錄）、`resources/enemy/phamtoms/*.jpeg`、`resources/enemy/rivon/`、`se_flesh／se_pant／se_page1／se_page2／se_pickup`、`_raw/se_dooropen／se_page3／se_preasure`、`vo_sorana_miss4.wav`、`vo/未命名 1.*`、`resources/ci/nemo_ci_dual.webp`＋一張 UUID png、`npc_ss_lofa_shoot.png`、`resources/si/image - …png`、`_layout_dunmor.pptx`、`ART_HANDOVER.md`、`地理筆記.docx`、`索菈娜技能.docx`、`reference/script.docx`／`maze.png`／`lake_topology.pdf`、`flight/_loneisle_preview.png`、`flight/reference/ship_topdown.png`、`docs/eos_bahamut/`、`docs/eos_penana/` —— 要接進來還是回收。
11. Credit 的動畫 LoRA（Bouncing B、Motto Hayaku）上架前私訊作者確認商用；索菈娜 bounce_test LoRA 作者標註待確認。
12. 舊影片回收：BR v1～v4、清醒夢／夢中夢舊版。

## 要實測（這一段都沒有實測紀錄）
- 西泊：Stage 23 章節 → 碼頭抵達 → 約會 → 17:00 通知（五種）→ 戰時市政廳；南天的霸王（飛行頁）戰前戰後對白；阿什弗德各差分的取景。
- 薇拉馮德夜襲兩條分支、隔日一日遊／茉莉來訪／莊園大門（Stage 20→21）。
- 孤舟島整段（Stage 22：抵達 → 六天後 → 空之主四連 → 尼莫戰 → 離島）、飛行怪 loop 在手機上的效能（鐵律 12）。
- -2259 那一批（出航鎖、餓扁強制移動、B 級自帶結算、counterAll）。
- 上一份留下的：碎片 02 整段（夢醒 → 北方泊地字卡）、群體受擊單抖、骨鴉抬高、Boss 曲；返回帝都降落廣場到風車荒地；Stage 16/17 飛行無紅罩；手機（首頁 BGM、BR 進場、群戰倒地閉棺、米夏 NI 取景、主祭壇自動出航）。

## 程式端可以做的
- 孤舟島時段差分：目前全部節點 `noTime:true`；美術交齊後拔 `noTime`（照 `loneisle/_spec.md` 鍵名）。
- `misha_si_ni` 眼效是舊圖座標，要用時重產。
- 科爾文 `salute` 我對到 `bow`；卡耶爾地圖圖名卡在夢境以外會報夜間時刻。
- ✔ 已不欠：茉莉／羅伯特已接進 speakers.js；`se_march` 一律用 `se_troops` 頂（主祭壇、夜襲）。

## 美術欠的（細節以 `resources/_HANDOFF_ART.md` 為準，但它停在 10-16）
- 孤舟島時段差分 ⚠ 欠 **4 張**：`wild` dawn／dusk／night、`inn` night（磁碟上 inn 已有 dawn／dusk，10-30 量）。
- 西泊城鎮版時段差分 ⚠ 欠 20 張（church／cityhall／oldtown／dock／uptown／inn × 三時段＋bar dusk／night）。
- 小地圖：聖索菲亞修正、`sofiaout`；薇拉馮德等 Ray 開工；溫斯摩爾港守城戰小地圖畫法待定。
- 空中怪飛行正面圖：10-27 交辦 13 隻，**已交懸環長鏈**，其餘待做。

## 資產盤點（`✔ 不欠`／`⚠ 欠`）
| 件 | 狀態 |
|---|---|
| 守城戰戰鬥背景 57 張（82 格，黃昏） | ✔ 不欠 —— Ray 定單張黃昏 |
| 守城戰 (2,3) 市政廳街2段 | ⚠ 欠 1 張（-2325 碼頭移走後變普通街，工單 `winsmoor_siege/_worklist.md` #20） |
| 孤舟島日景 13 張 | ✔ 不欠 |
| 孤舟島 gunsmith／canteen／store 時段差分 | ✔ 不欠 —— 店舖只有 day（憲法 §5） |
| 孤舟島 wild／inn 時段差分 | ⚠ 欠 4 張（見上） |
| 孤舟島立繪（胡安 10／蘿芮／尼莫／賽西莉／船匠 2／索菈娜暈船 7＋faint） | ✔ 不欠（全接進 speakers.js） |
| 插圖 040 新版、045、047、048、049 | ✔ 不欠 |
| 空中怪待機動畫：第二批 spine／mouthpillar／ringchain／eyeveil／maw | ✔ 不欠 |
| 空中怪飛行正面圖 | ⚠ 欠 12 隻（懸環長鏈已交） |
| 空中怪敵人卡數值 | ⚠ 欠（暫抄羽蛇，等 Ray） |
| 卡耶爾 Boss／群怪數值卡 | ⚠ 欠（暫抄北泊，等 Ray） |
| 西泊城鎮版日景 15 張 | ✔ 不欠 |
| 西泊城鎮版時段差分 | ⚠ 欠 20 張 |
| 帝都外郊 4 格 | ✔ 不欠 —— Ray 定只有黃昏 |
| 立繪眨眼補丁 | ⚠ 欠：約 30 張待判、13 張沒產出、賽西莉 9 張半閉 |
| PV 字卡、開棺／閉棺 alpha | ✔ 不欠 |

## 已結案（不要再列）
（-2255 以前見上一份。）這一段：離線包收進選單、-2259 的 19 件、薇拉馮德夜襲／隔日／茉莉／莊園大門、孤舟島全段接線、空中怪 16 隻上飛行地圖、守城戰背景交齊、茉莉／羅伯特立繪、`se_march`→`se_troops`。

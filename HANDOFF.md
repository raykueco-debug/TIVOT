# HANDOFF — 截至 `ver 2026.09.22-2166`（10-12，iMac 程式 session 收工，換機器）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、回收舊交接**（`tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.20261012-151833`（-2112 那一份＋美術在頂端加的交件條；git 歷史也有）。

## 現況
- 只有一個分支：`main`。兩台在推：**Windows 3060**（`C:\Users\User`）與 **iMac**（`~/Desktop/TIVOT`）。**開工先 `git pull`，推之前再 pull 一次**。
- 測試伺服器：Windows 用 `tivot-claude`（8202）；iMac 用 **`tivot-verify`（8123）**。**8200 是 Ray 的，不要碰**
  （⚠ 本輪踩過一次：預覽分頁 `seed` 被切到 8200，我對它重整並開了一場 `test_misha` —— 動手前先確認 `location.port`）。
- iMac 沒有 node：語法檢查用 jsc、`script_lint.py` 照樣能跑。
- 其他 session：**美術**（本機另一個 session，`resources/_HANDOFF_ART.md`）、**動畫**（另一台，`resources/_HANDOFF_ANIM.md`）。交件由程式接、commit。
- 不要 commit：`script/speakers.js` 的未提交改動（Ray 本機在調）、`docs/EOS_CONTEST.md`、`reference/TIVOT_Glossary_ZH_EN_JA_ES.xlsx`、根目錄兩張 UUID png 等未追蹤檔（見下「等 Ray」）。
- 測試開章法（本輪一直在用）：8123 開機點掉讀取頁 → `import('/script/progress.js?v=<版號>')` 往 `CHAPTERS` 前面塞一筆臨時章節（flags／stage／clockHour／town／node）→ 點章節鈕 → 選「演劇情」。

## 本輪做的（-2113～-2166）—— 都推上了
**資源接上**：士兵 `imsoldier`（`worry` 鍵）／指揮官 `imcommander`、賽西莉 11 張（pant 用 cm150／standCm135）、愛里歐（`MAGE`／`MAGE_X`）全套＋hurtdown、
索菈娜 guardgrimace／runserious×2、科爾文 bow／hurt×3、蕾娜／蘿法／安雅新差分；CI 更新（賽西莉被動 v4、安雅被動等）；插圖 043／044；差分總表重出（NPC 各自一頁、孤兒圖同一頁）。

**帝都 Stage 17～19**：返回帝都（CAP_RETURN）→ Stage 18 旅店夜襲（`clockSet:23` 鎖時間、Nocturnal Bloom → 索「！！」起 Rituale 鎖到愛里歐戰）→
衛士追擊戰（`siege.route` 單行道、走一步播 `se_steps`）→ 碼頭愛里歐戰（`cap_mage`：400 血、六角護罩只吃清盤傷害、反擊免疫顯示 GUARD、RetroRoman Battle2、專用背景）→ Stage 19 強制出航。章節列表有 17／18／19。
深夜時段改 22:00 起。群體敵人倒地動畫同時淡出。

**北泊 → 碎片 02（卡耶爾山谷夢境）整段**（-2134～-2165）：
- 蕾娜夜談 → 睡覺音（BGM 同時淡出）→ 長黑幕 → 讀取頁 → 卡耶爾入口**黑著抵達**（新欄位 `darkStart`：`story.holdSceneFade`，場景曲等腳本 `fadeIn` 才放）→ 黑幕裡戰場聲由遠到近、士兵第一句 → 淡入。
- 夢境期間：Rituale Machina 上鎖（路上戰鬥不換曲）、每格必出怪（城上 `wildForce`）、搭檔賽西莉、不可入整備頁（城上 `noGear` → `gear.setBlocker` 唯一守門）、不能出航、背景鎖白天、打輸直接回北泊（`loseGoto`）。
- 入口開場戰 → 風蝕迴廊一場（`frag02_mid`）→ 谷底祭場 Boss **崩岩巨像**（`canyon_colossus`，數值暫抄北泊教堂 Boss）。Boss 戰前解鎖、放賽西莉戰鬥曲一路到夢境結束。
- 結尾：士兵 awe「竟然……只憑兩個人就……」→ 插圖 044 由下往上平移 →「那就是……聖約騎士團！」→ 轉泛黃（新欄位 `cgTone:'sepia'`）→ 三秒黑（BGM 淡出）→
  夢醒直接推到隔天 8:00／S3（`FRAG02_WAKE`，打輸三條路同）→ 北泊旅店黑著抵達、字卡大字「北方泊地」＋日期時刻 → 淡入。
- 群怪「禍魘大軍」：11 組 `canyon_mix2..12`（美術深色重生版；每組後排一隻大型＋前面 2～4 小型、≤5 隻、同種 ≤2；骨鴉飛行抬高、`group.noShadow` 不畫影子）。圖層 `resources/enemy/canyon_swarm/fly<n>/`。
- 群體敵人受擊只抖被打中的那一個（`enemy.groupHitFlash`）。

**引擎修正**：
- 換插圖不再搶走腳本蓋的黑幕（`cgFade` 的 `keepOwner`）—— 修「插畫跑完先露出場景再播腳步聲走到次日」（娜塔莉戰後接碼頭同一病）。
- 拍上 `flip` 改成每人各自記、翻了就一直翻到下台。
- 換怪先收上一隻的待機動畫（修米夏 NI 殘留到帝都第一戰）。
- 立繪編輯改台詞：前後一拍篩不開時走整拍序列定位（修娜塔莉連續「……」寫入失敗；`devserver.py` 改了，**Ray 的 8200 要重開才吃得到**）。
- 北泊聖徒教學戰：劇情三擊之後即死防禦還原（以前被腳本那一擊吃掉）。
- 約會／巧遇好感 +5；「限時才加」的事件改成去了就加；聖索菲亞約索菈娜 +10。

**其他**：賽西莉兩首 BGM（RetroRoman Battle／World OP2）響度共 +21%；搭檔是賽西莉的戰鬥放 RetroRoman Battle。
薇拉馮德拓樸照帝都改（圓環廣場：上中央區／左港町／右上街區；港町照舊街區排，碼頭外接造船廠與燈塔）。
**溫斯摩爾港（守城戰地圖，暫名）**：40 格節點與出口照美術拓樸圖接上（到廣場步數 40 格全對），背景只有日景；入口暫定中央棧橋、出航往下。

## 未完成
**守城戰（溫斯摩爾港）—— 等 Ray 定玩法，規格在 `resources/map/_winsmoor_spec.md`**
1. 敵人一回合走幾格（建議：玩家走一步＝一回合，每支敵軍沿最短路徑往廣場走一格）；一次幾支、從 20 個進入點哪裡冒、撐幾波。
2. 截到就打一場？打哪類怪？評價 S／A／B 的回合效果（S 敵停一回合／A 照常／B 以下敵走 2 格）照戰鬥結算等第？
3. 小地圖（守城戰的主介面，40 格方格＋紅點）要不要做、怎麼畫。
4. 美術等 Ray 看：同一張大圖截出的格子很像（要不要每格一張，約多 23 張）；畫風半寫實沒過平塗；城名暫名；怎麼進這座城（目前沒有入口）。
5. 討論過的定位：最後一個大型迷宮＝守城戰（Ray 的想法）；我提過的「雙層翻面」「消耗戰」都被否／備用。

**等 Ray 確認（我自己判斷的）**
6. 卡耶爾大小型的分法、mix12（餓獸那一組）是我加的；崩岩巨像 Boss 數值暫抄 `np_boss`；群怪整群總血 220（5 隻每隻只 44）要不要依隻數調。
7. 夢境整備頁擋下的那句「……夢裡沒有整備的餘裕。」是我暫填的。
8. 薇拉馮德新地名「港町」「中央區」西文翻譯表沒有對應（西文暫停中）；美術 `_verafond_spec.md` 還寫舊名。
9. 立繪編輯：同一人台上中途要翻回來目前做不到（翻了就到下台）—— 要的話加「這一拍翻回」。

**要實測**
10. 碎片 02 整段（蕾娜夜談 → 夢醒北泊）Ray 測到 Boss 前後；夢醒那段「黑幕 → 讀取頁 → 北方泊地字卡」修完還沒看過完整一次。
11. 群體受擊單抖、骨鴉抬高、Boss 曲一路到結束 —— 都沒在遊戲裡看過。
12. 上一份留下的：返回帝都降落廣場到風車荒地那一段、Stage 16/17 飛行無紅罩、手機實測（首頁 BGM、BR 進場、群戰倒地閉棺、米夏 NI 取景、主祭壇自動出航）。

**等 Ray（上一份延續）**
13. 其他人類敵人要不要比照米夏補呼吸待機；帝都衛士戰四件假設；被刪的 33 張圖要不要還原；廢城 `hallcourt` 碎石重出；插圖 023／024 沒引用、032 未交、042 未引用。
14. 舊影片回收：BR v1～v4、清醒夢／夢中夢舊版。郊外風車荒地只有黃昏一張。
15. iMac 未進版控的檔：兩張 UUID png、`resources/enemy/phamtoms/*.jpeg`、`resources/enemy/rivon/`、`se_flesh/se_pant/se_page1/se_page2/se_pickup`、
    `vo_sorana_miss4.wav`、`vo/未命名 1.*`、`resources/ci/nemo_ci_dual.webp`、`npc_ss_lofa_shoot.png`、`resources/si/image - …png`、`_layout_dunmor.pptx`、
    根目錄 `ART_HANDOVER.md`／幾份 docx／xlsx、`reference/script.docx` 等 —— 要不要接或回收。
16. Credit 的動畫 LoRA（Bouncing B、Motto Hayaku）上架前要私訊作者確認商用；索菈娜 bounce_test LoRA 的作者標註待確認。

**美術 session 收工時留的（10-12，e0c999d6；其餘幾條程式端已做完）**
- 賽西莉 `call`／`ready`／`battlecry` 頭髮比 front 長而散、`pant` 左肩露出、`shyhand` 頭頂被裁一點 —— 要不要重畫，等 Ray。
- ⚠ GPT 原圖 PNG 都在 Mac 的 `resources/_originals/`（gitignore，**另一台沒有**）—— 要重修那幾張就回 Mac，或從 `.webp` 開工。
- 台詞差分表 `卡耶爾山谷_碎片02_台詞差分.xlsx`（根目錄）已 commit；Ray 改過的版本才是正本，之後只准 `dialogue_xlsx.py --refresh`。

**美術 session 10-12 晚（Windows）—— 接著做的**
- ✔ **溫斯摩爾港（西泊）城鎮版 15 格正式版日景已交（10-14，第二版，Ray 試稿通過）**：`resources/background/winsmoor_town/ws_town_<鍵>_day.webp`，總覽 `_sheet15.jpg`、產法見 `_spec.md`。
  美術還欠：時段差分（街道／室外四差分、旅館四差分、酒館三差分、店舖只有 day）、戰鬥版。程式端：還沒有任何節點接這批圖（`script/town.js` 還沒有溫斯摩爾），要接時照 `_spec.md` 的拓樸表。
- ⚠ **西泊城鎮版時段差分（Gemini）做到 6／26 張**（square、midtown 三時段）：Gemini 當天額度用完，其餘等重置；進度表在 `winsmoor_town/_spec.md` 尾段。
- ✔ **帝都外郊 4 格（只有黃昏，Ray 定）已交**：`resources/background/capital_outer/outer_<鍵>_dusk.webp`（城外→河畔→殘破村落→廢風車＝安雅躲藏處）。程式端：4 格直線、`noTime`；舊的 `capital/capital_outskirts_dusk.webp`（厚塗）要不要換成本批 windmill 由 Ray 決定。
- ✔ **孤舟島（工匠村落，拓樸照夏爾村 13 格）日景已交**：`resources/background/loneisle/loneisle_<鍵>_day.webp`，鍵對照與出口表在 `loneisle/_spec.md`。美術還欠四時段差分（Gemini）；程式端還沒有節點。
- 空中戰怪圖第二批剩 5 張（群口之柱／人面花冠／眼之幕／天之裂隙／無面巨首）—— 一律 GPT，方向照已定的三張（`resources/enemy/_sky_battle_spec.md`）。
- 戰鬥版（現有 40 格不能當戰鬥背景）：城鎮版定了再做。

**程式端可做**
- ⚠ 美術 10-14 同名覆蓋了插圖 `003_lunaria_armed.webp`（`config.js` 的 `ASSET_VER` 還是舊雜湊 `f656d515`）—— 要跑 `python3 tools/bust.py --bump` 才不會吃到快取的舊圖。`044_soranahug.png` 同理（10-13 覆蓋）。
17. `misha_si_ni` 眼效是舊圖座標，要用時重產；茉莉／羅伯特／亞隆立繪還沒接；`se_march` 不存在（主祭壇用 `se_troops` 頂）。
18. 科爾文 `salute` 我對到 `bow`；卡耶爾地圖圖名卡在夢境以外會報夜間時刻（夢境入口已不報）。

## 資產盤點（這一輪碰過的；`✔ 不欠`／`⚠ 欠`）
| 件 | 狀態 |
|---|---|
| 士兵 7／指揮官 6／賽西莉 11／愛里歐 7／索菈娜 3／科爾文 4 差分 | ✔ 不欠（全接進 speakers.js） |
| 插圖 043_eliointro、044_cecilietorsten | ✔ 不欠 |
| 碎片 02 音效：se_battlefield（m4a，fileGain 0.84）、se_sleep、se_monsterroardeep、se_weapon_reload | ✔ 不欠 |
| 碎片 02 BGM：Rituale Machina、RetroRoman Battle | ✔ 不欠 |
| 卡耶爾怪：深色重生版 17 張（大型 12＋群體 5） | ✔ 不欠（崩岩巨像＝Boss、其餘進 11 組群戰）；舊 16 張留著沒用 |
| 卡耶爾 Boss／群怪數值卡 | ⚠ 欠（暫抄北泊，等 Ray） |
| 溫斯摩爾港背景 40 格日景 | ✔ 日景齊；⚠ 時段差分看需求、「格子太像」等 Ray 決定 |
| 溫斯摩爾港小地圖 | ⚠ 欠（待定畫法） |
| 溫斯摩爾港城鎮版 15 格（帝都拓樸＋餐飲街 4 家） | ⚠ 欠正式版（Gemini 草稿 15 張齊，等 GPT 額度） |
| 茉莉 v3 立繪 15 張 | ✔ 不欠（無瀏海、保留長捲鬢髮、虹膜 S×2.4；還沒接 speakers.js） |
| 空中戰怪圖第一批 8 張（`mon_sky_*`） | ✔ 不欠（羽蛇／守墓者風格第三版） |
| 空中戰怪圖第二批（`mon_sky2_*`） | ⚠ 欠 5 張（已交 3 張方向定案） |

## 已結案（不要再列）
（-2112 以前的見上一份。）本輪：上一份頂端美術交件的五條（士兵／指揮官、賽西莉 11、愛里歐、新立繪 7、插圖 044）全接；Stage 17～19 帝都整段；碎片 02 整段；
卡耶爾群怪三次改版到深色版；cgFade 搶黑幕、flip、米夏 NI 殘留、編輯器寫入失敗、即死防禦被吃；薇拉馮德拓樸；溫斯摩爾港城資料。

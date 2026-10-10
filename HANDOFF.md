> ⭐⭐⭐⭐⭐ **【帝國軍：士兵 7 張＋前線指揮官 6 張・等程式端接】（10-10，Mac 美術）** —— 碎片 02（卡耶爾山谷）。制服照 Ray 給的參考圖（深藍雙排扣、金滾邊、筒帽），帶戰地塵土；指揮官與士兵同制服、只差金色流蘇肩章＋軍刀。檔在 `resources/si/npc/`，**還沒寫進 `speakers.js`**。
> · ⚠⚠ 程式端要決定的兩件：① `SOLDIER` 現在是 `art:null`（沒有立繪）→ 要新開一個 ART 鍵（建議 `imsoldier`）並把 `SOLDIER.art` 指過去；② 既有的 `commander`（`npc_commander_si_front`）是**白色制服**、對不上參考圖 → 建議 `COMMANDER.art` 改指新的 `imcommander`。
> · 士兵 `imsoldier`（`cm:172`、`side:'R'`、`base` 用 front）：
>   `front:{ src:'resources/si/npc/npc_imsoldier_si_front.webp', top:24, bot:1516, fx:0.493 },`
>   `panic:{ src:'resources/si/npc/npc_imsoldier_si_panic.webp', top:14, bot:1517, fx:0.441 },`（不行了！數量太多！）
>   `worried:{ src:'resources/si/npc/npc_imsoldier_si_worried.webp', top:11, bot:1519, fx:0.592 },`（應該中午就該到了才對……）
>   `alarm:{ src:'resources/si/npc/npc_imsoldier_si_alarm.webp', top:10, bot:1507, fx:0.351 },`（南門被攻破了！）
>   `awe:{ src:'resources/si/npc/npc_imsoldier_si_awe.webp', top:2, bot:1514, fx:0.406 },`（一個人就擋下了禍魘／那就是……聖約騎士團！）
>   `rally:{ src:'resources/si/npc/npc_imsoldier_si_rally.webp', top:18, bot:1512, fx:0.365 },`（撐下去！援軍一定會到的！ 舉槍射擊）
>   `doubt:{ src:'resources/si/npc/npc_imsoldier_si_doubt.webp', top:14, bot:1521, fx:0.647 },`（就你們……兩個人？）
> · 指揮官 `imcommander`（`cm:180`、`side:'R'`）：
>   `front:{ src:'resources/si/npc/npc_imcommander_si_front.webp', top:8, bot:1523, fx:0.460 },`
>   `urgent:{ src:'resources/si/npc/npc_imcommander_si_urgent.webp', top:4, bot:1518, fx:0.669 },`（援軍呢？還沒有到嗎？ ⚠ 右腳靴尖貼到畫布右緣被裁一點，舞台看不到）
>   `shock:{ src:'resources/si/npc/npc_imcommander_si_shock.webp', top:12, bot:1518, fx:0.699 },`（！！）
>   `surprise:{ src:'resources/si/npc/npc_imcommander_si_surprise.webp', top:4, bot:1521, fx:0.444 },`（聖王廳的援軍……？）
>   `salute:{ src:'resources/si/npc/npc_imcommander_si_salute.webp', top:11, bot:1521, fx:0.452 },`（失禮了。行軍禮）
>   `plead:{ src:'resources/si/npc/npc_imcommander_si_plead.webp', top:8, bot:1515, fx:0.481 },`（出海口方向還有我軍殘部，能否……）
> · top/bot/fx 是 `measure_si.py` 量的；舉手指人那幾張的 fx 可能被手拉偏，上線看臉再微調。
>
> ⭐⭐⭐⭐⭐ **【賽西莉差分 11 張・等程式端接】（10-10，Mac 美術）** —— 碎片 02／03 的劇本。她是後勤術師：**沒有戰損**，戰後疲憊只畫流汗喘氣，鼻血＝能力過載（Ray 定）。檔在 `resources/si/`，**還沒寫進 `speakers.js`**：
>   `smirk:{ src:'resources/si/cecilie_si_smirk.webp', top:8, bot:1529, fx:0.520 },`（是『兩個人』吧？）
>   `call:{ src:'resources/si/cecilie_si_call.webp', top:4, bot:1526, fx:0.680 },`（喂！等我一下！）
>   `ready:{ src:'resources/si/cecilie_si_ready.webp', top:10, bot:1509, fx:0.701 },`（數量不少。可以嗎？）
>   `battlecry:{ src:'resources/si/cecilie_si_battlecry.webp', top:46, bot:1528, fx:0.649 },`（驅逐殆盡吧！ ⚠ top/fx 是頭髮量的，alpha 量會被術式光拉到 0／0.528）
>   `command:{ src:'resources/si/cecilie_si_command.webp', top:7, bot:1526, fx:0.375 },`（往後撤，離開火線）
>   `pant:{ src:'resources/si/cecilie_si_pant.webp', top:69, bot:1443, fx:0.626 },`（哈啊……，單膝跪地 ⚠ 非站姿，要用 §6.5 的 cm／standCm 調）
>   `proud:{ src:'resources/si/cecilie_si_proud.webp', top:5, bot:1526, fx:0.550 },`（你以為我是誰？）
>   `nosebleed:{ src:'resources/si/cecilie_si_nosebleed.webp', top:5, bot:1511, fx:0.553 },`（鼻血插分 ！！）
>   `shynose:{ src:'resources/si/cecilie_si_shynose.webp', top:6, bot:1496, fx:0.524 },`（不、不要看！／不是說了不准看嗎 —— 手遮鼻 shy）
>   `shocknose:{ src:'resources/si/cecilie_si_shocknose.webp', top:6, bot:1497, fx:0.401 },`（等一下！很髒的啊！ shock）
>   `shyhand:{ src:'resources/si/cecilie_si_shyhand.webp', top:0, bot:1498, fx:0.559 },`（脫下來。回去我給你洗洗。 ⚠ 頭頂碰到畫布上緣，髮梢被裁一點點）
> · ⚠ 已知小偏差：`pant` 左肩露出（front 有袖）；`call`／`ready`／`battlecry` 的頭髮比 front 長而散 —— 要不要重畫等 Ray 看過再定。
>
> ⭐⭐⭐⭐⭐ **【愛里歐（謎之術師 `mage`）差分 6 張・等程式端接】（10-10，Mac 美術）** —— 照碼頭那一段劇本補角度與動作，眼睛一律瞇著。檔在 `resources/si/npc/`，**還沒寫進 `speakers.js`**：
>   `wave:{ src:'resources/si/npc/mage_si_wave.webp', top:7, bot:1532, fx:0.444 },`（嗨！）
>   `talk:{ src:'resources/si/npc/mage_si_talk.webp', top:2, bot:1533, fx:0.431 },`（一般說話）
>   `shrug:{ src:'resources/si/npc/mage_si_shrug.webp', top:9, bot:1530, fx:0.443 },`（藏起爪子／嗅覺很靈敏，攤手）
>   `laugh:{ src:'resources/si/npc/mage_si_laugh.webp', top:3, bot:1529, fx:0.515 },`（笑，側身仰頭）
>   `threat:{ src:'resources/si/npc/mage_si_threat.webp', top:6, bot:1527, fx:0.462 },`（得請你們倒在這裡了，手上紫光）
>   `leave:{ src:'resources/si/npc/mage_si_leave.webp', top:5, bot:1523, fx:0.715 },`（有緣再會吧，半轉身回頭兩指揮別）
> · ✔ 補交 `hurtdown:{ src:'resources/si/npc/mage_si_hurtdown.webp', top:35, bot:1517, fx:0.351 },`（咕……／不愧是前第一後補 —— Ray：受創不要破衣、不要髒污、低頭瞇眼無笑容。⚠ 取代先前的 `hurtsmile`，那張已回收、不要接）
>
> ⭐⭐⭐⭐⭐ **【新立繪 7 張・等程式端接】（10-10，Mac 美術 session；commit a904d66d）** —— 檔案已在 `resources/si/`，**還沒寫進 `script/speakers.js`**（美術不碰程式，鐵律 11）。
> · 索菈娜 `ART.sorana.expr` 加：
>   `guardgrimace:{ fxShift:-0.01, yShift:14, src:'resources/si/sorana_si_guardgrimace.webp', top:9, bot:1527, fx:0.651, cm:150 },`（與 guard 同姿勢，沿用 guard 的值）
>   `runserious:{ src:'resources/si/sorana_si_runserious.webp', top:8, bot:1515, fx:0.509 },`（正面朝鏡頭跑）
>   `runserious_side:{ src:'resources/si/sorana_si_runserious_side.webp', top:23, bot:1507, fx:0.774 },`（側面奔跑，Ray：兩個都留）
> · 科爾文 `ART.corvin.expr` 加：
>   `bow:{ src:'resources/si/npc/corvin_si_bow.webp', top:15, bot:1522, fx:0.371 },`（向女士致意，戴眼鏡）
>   `hurthold:{ src:'resources/si/npc/corvin_si_hurthold.webp', top:7, bot:1523, fx:0.419 },`
>   `hurttalk:{ src:'resources/si/npc/corvin_si_hurttalk.webp', top:4, bot:1504, fx:0.456 },`
>   `hurtcommand:{ src:'resources/si/npc/corvin_si_hurtcommand.webp', top:6, bot:1522, fx:0.469 },`（Ray 稿寫 hurtcoomand，當成拼錯；三張受傷版都無眼鏡、傷勢一致）
> · top/bot/fx 都是 `tools/measure_si.py` 量的。眨眼補丁這 7 張都還沒做。
> · 資產盤點：✔ 不欠＝以上 7 張（Ray 點名的都交了）。
>
# HANDOFF — 截至 `ver 2026.09.22-2112`（10-09 深夜，iMac 程式 session 收工）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、回收舊交接**（`tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.*`（-2101，3060 機那一份；git 歷史也有）。

## 現況
- 只有一個分支：`main`。兩台在推：**Windows 3060**（`C:\Users\User`）與 **iMac**（`~/Desktop/TIVOT`，iMac18,3／8 GB，macOS 13）。
  ⚠ 兩台同時推過一次（-2103 撞號，`e923c854` 合併）—— **開工先 `git pull`，推之前再 pull 一次**。
- 測試伺服器：Windows 用 `.claude/launch.json` 的 `tivot-claude`（8202）；iMac 用 **`tivot-verify`（8123）**。8200 是 Ray 的，不要碰。
  iMac 沒有 node：`script_lint.py` 走 macOS 內建 jsc，照樣能跑。
- ⚠⚠ 西文翻譯暫停（Ray 10-09）—— 改中文時不要動 `i18n/*/es*`。
- 其他 session：**動畫**（`resources/_HANDOFF_ANIM.md`）、**美術**（`resources/_HANDOFF_ART.md`）。交件由程式接、commit。
- 不要 commit：`tools/anim/*` 未提交的修改、`resources/ci/layers/**` 中間檔、`resources/si/eyefx/cecilie_si_fluster_te_mask.webp`（來源不明）、
  Ray 本機的 `docs/EOS_CONTEST.md`／`reference/TIVOT_Glossary_ZH_EN_JA_ES.xlsx` 改動（他自己的）。

## 本輪做的（-2102～-2112）—— 都推上了
- **另一台的資源接上**（-2102）：蘿法 `shy/ask/lookdown`、蕾娜 `letter/check/checktalk`、安雅 `cryhard/shysmile`（WebP＋measure_si）；摺信聲 `se_paperfold`（fileGain 3.40）。
- **返回帝都整段**（-2103～-2110，Ray 稿；`script/town.js` 的 `CAP_RETURN`、`flight/index.html` 的 `crFlightMaybe`）：
  廢城出航 → 飛行對白＋開大地圖標帝都 → 降落攝政王廣場（`cr_return`，fromStage:17）→ 負片瞬閃（`se_monsterroardeep`、BGM 換 Glass Cradle）
  → 追到帝都郊外風車荒地（`capital_outskirts_dusk`，BGM Hesitation＝`failed`，`sturm` ambVol 0.4）→ 演完 `goto:'inn'`（我的判讀）。
  新 speaker 小男孩／母親（`capi_boy`／`capi_mom`）；孩童笑聲 `se_kidlaughter`（fileGain 2.31）；`playAmb` 吃 `ambVol`。
- **Stage 17**（-2107）：廢城升空完由 16 升 17（`crFlightMaybe`）；章節列表加 Stage 17（從廢城起飛）。
- **Stage 16 以後無禁航區**（-2108，`noflyOff` 加章節判定）。
- **蕾娜念的禍魘日期跟遊戲時間掛勾**（-2111／-2112）：事件日期 `tivot_eventdate_v1`（一輪內，存檔帶；鐵律 9：第一次才記、沒人拔）。
  `np_natalia`＝娜塔莉戰打完那一拍、`valse_serpent`＝羽蛇強制戰打贏（飛行頁自己寫同一把鑰匙，兩邊互指）、`muyak`＝第一次進木雅克神殿（城上 `eventDate`）。
  台詞寫 `{VD:事件?退路天數+加幾天}`；跳章沒記錄＝開局第 7 天起算（瓦爾士 9、木雅克 10 是我排的）；木雅克之後 +9／+24／+37（累加）。
- **Credit** 加「Animation LoRA」：Bouncing B、Motto Hayaku（zxtopower）。⚠ 模型卡沒寫商用 —— 上架前要私訊作者確認。
- 賽西莉即死防禦／生命歸還 CI 影片：另一台（`5626ed7f`）交件並接好，生命歸還 cutinDur 1042。

## 未完成
**等 Ray 確認（這一輪我自己判斷的）**
1. 返回帝都：「諾：『妳怎麼知道！』」稿上圖是 `Sorana_SI_surprised` ⇒ 我讓索菈娜講；演完走回旅店（`goto:'inn'`）。
2. 差分取最接近的：蕾 `lookasidetalk→lookawaytalk`、`evalutating→evaluate`、`asksious→askserious`；諾 `raisehand→risehand`、`confuse→surprise`（她沒這張）；
   索 `smilebig→lauaghbig`、`furious→angry`、`surprised→surprise`；安 `terrifying→terrify`、`sobbing→sob`、`deseprade→desperate`。
3. 禍魘日期：木雅克之後「9／15／13 天」我當**累加**；跳章退路瓦爾士 9、木雅克 10 天。
4. 小男孩／母親身高是估的（120／160 cm）。

**要實測（還沒實際演過）**
5. 返回帝都整段：降落廣場之後到風車荒地那一段沒人實際播過（只做了靜態檢查＋飛行段開頭）；羽蛇戰打贏後 `valse_serpent` 有沒有寫進去。
6. Stage 16/17 進飛行畫面確認沒有紅罩、可飛進羅賽爾那幾國。
7. 上一份留下的手機實測：首頁 BGM（冷／熱啟動）、BR 進場、群戰倒地與閉棺、米夏 NI 取景、主祭壇自動出航。

**等 Ray**
8. 謎之術師數值卡（建卡＋碼頭 Boss）、術師名字定稿。
9. 其他人類敵人要不要比照米夏補呼吸待機。
10. 帝都衛士戰四件假設：前三場受擊特效、storyBattle 輸了回檔、守衛名稱、舊街區後城鎮戰結束。
11. 被刪的 33 張圖要不要還原；廢城 `hallcourt` 碎石重出；插圖 `023`／`024` 沒腳本引用、`032_rennablush` 未交、`042_annadeclare` 已交未引用。
12. 舊影片回收：BR v1～v4、清醒夢 v1／v2、夢中夢 v1／v2。
13. 郊外風車荒地只有黃昏一張（硬指定 `capital_outskirts_dusk`）—— 要不要補其他時段（補了就改 `bgBand`）。
14. iMac 工作區沒進版控、沒人提過的檔：兩張 UUID png（根目錄）、`resources/enemy/phamtoms/*.jpeg`、`resources/enemy/rivon/man_thug_*.webp`、
    `se_flesh/se_pant/se_page1/se_page2/se_pickup.mp3`、`vo_sorana_miss4.wav`、`resources/ci/nemo_ci_dual.webp`、`npc_ss_lofa_shoot.png`（假透明，已用 cryshoot 頂）、
    `resources/si/image - 2026-09-26…png`、`resources/map/_layout_dunmor.pptx` —— 要不要接或回收。

**程式端可做**
15. `misha_si_ni` 眼效是舊圖座標，要用時重產（`tools/eye_fx.py`）。
16. 茉莉／羅伯特／亞隆的立繪已在 `si/npc/`，還沒接進 `speakers.js`。
17. 卡耶爾山谷 16 隻怪（`resources/enemy/mon_canyon_*`）—— 敵卡／遭遇表等 Ray 數值。
18. `se_march` 不存在，主祭壇那一拍用 `se_troops` 頂著。

**眨眼／眼睛（舊單）**
19. GPT 半閉欠 10 張（`tools/_blink_base/grid_fixh4.png`、`grid_fixh3.png`）；瞳顫框偏大（索拉娜 surprise／furious／readshock、柯文 shock）；
    `sorana_si_carrynouvelleshock` 欠眨眼；淚光 6 張待修（`tools/tear_reject.txt`）。

## 資產盤點（這一輪碰過的；`✔ 不欠`／`⚠ 欠`）
| 件 | 狀態 |
|---|---|
| 聖索菲亞旅店收尾：蘿法 shy/ask/lookdown、蕾娜 letter、摺信聲 | ✔ 不欠（-2102 進庫，lint 0 錯） |
| 返回帝都稿的立繪差分 | ✔ 不欠 —— 全部有對應（取最接近的見上「等 Ray 確認」2） |
| 返回帝都稿的音效：kidlaughter／monsterroardeep／steps／walk／highheels／sturm／page3／heartbeat | ✔ 不欠 |
| 返回帝都稿的 BGM：Glass Cradle、Hesitation | ✔ 不欠 |
| 帝都郊外風車荒地背景 | ✔ 黃昏一張（Ray 只交這張）；其他時段要不要補 ⇒ 上面 13 |
| 小男孩／母親立繪 | ✔ 不欠（各一張 front） |
| 蕾娜 check/checktalk、安雅 cryhard/shysmile | ✔ 不欠（返回帝都已用上） |
| 賽西莉即死防禦／生命歸還 CI 影片 | ✔ 不欠（另一台 -2103 交件） |

## 已結案（不要再列）
（-2101 以前的見上一份。）本輪：另一台資源接線、返回帝都整段、Stage 17＋章節、Stage 16 起無禁航、禍魘日期掛事件、Credit LoRA 兩支、
`se_paperfold`／`se_kidlaughter` 進庫、`se_roarfar` 撤掉（改用既有 `se_monsterroardeep`）。

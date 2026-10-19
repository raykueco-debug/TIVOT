# HANDOFF — 截至 `ver 2026.10.19-2255`（10-19，Windows 程式 session 收工）

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點這一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、回收舊交接**（`tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 上一份：`_recycle/HANDOFF.md.*`（-2166 iMac 那一份＋美術 10-19 眨眼條；git 歷史也有）。
> ⚠ 本輪（PV／試玩版）沒碰上一份的待辦，所以「上一份沿用」那一大段**原樣搬過來、本輪沒有清點** —— 下一輪開工要跟 Ray 逐條確認。

## 現況
- 只有一個分支：`main`。兩台在推：**Windows 3060**（`C:/Users/User/Desktop/TIVOT`）與 **iMac**。**開工先 `git pull`，推之前再 pull 一次**。
- 測試伺服器（Windows）：遊戲 `tivot-claude` **8202**、試玩版 dist `challenge-dist` **8215**、PV 編輯器 **8130**（Ray 開著的那個）。**8200 是 Ray 的，不要碰**；Ray 測試中的分頁不碰，要測另開。
- 版本號一律 `py -X utf8 tools/bust.py --bump`；commit 前 `py tools/script_lint.py`（本輪 0 錯誤、61 個既有提醒）。

## 本輪做的（-2167～-2255）—— 都推上了
**挑戰（首頁「挑戰」＝給玩家試玩）**
- 拿掉出擊整備：固定蕾妮＋機槍（`weapon.useChallengeLoadout`），遊戲內不可換伙伴。
- 按挑戰 → 槍棺**由畫面底外**以飛行頁同一條曲線推上來開棺（`story.playKerberosChallenge`、`#kerb.kerb-low/.kerb-lowrise`）→ 打完／打輸都閉棺再結算（`state.kerbChallenge`，combat 勝敗兩條路）。
- 訓練用聖徒教學：副武器切換鈕放回（試玩版教學不再藏）；反擊教學（defended）最後加蕾妮「依戰況切換副武器吧！」＋ `guide:'wswitch'` 箭頭**由上往下**指切換鈕，該句對話框掛 `.ws-clear` 縮窄左移讓位。
  ⚠ 教學台詞的真相在 **`i18n/zh.js`／`en.js`／`ja.js`**（`i18n.js` 會整段蓋掉 config 的 steps）—— 改教學台詞要改語系檔。西文 `es.js` 未補（照「西文最後一次整批」）。

**挑戰試玩版打包（`tools/challenge_build/`）—— 目前只在 PTT／Penana／巴哈發布**
- 流程：`build.py trace-html` 產追蹤頁 → 用 `tools/promo` 錄製器跑 `trace_chal`／`trace_tut`（PROMO_DUMP）取得 dump → `build.py build <挑戰dump> <教學dump>` 出 `dist/`。
  本輪 dump 在 scratchpad，**換機器要重跑追蹤**。esbuild 在 `tools/challenge_build/node_modules`（gitignore，`npm i` 重裝）。
- 作法：真程式碼照用、資料模組用 overlay 換掉（敵人只留 faceless／facelessgiant／trainee／witch、伙伴只留蕾妮、監察官芙蕾雅＋璐娜、教學以外的劇情樹全砍、戰鬥／料理／商店空表、**道具全空＋敵人 loot 拔掉＝不掉道具**）；town／inn／gear／save 換空殼；管理人手勢關閉；西文劇本動態 import 拔掉；esbuild 單檔（charset utf8）。
- 劇情 ID 黑名單擋檔案／素材／SE；打包後掃描敏感字串（947 條）＝**命中 0**；殘在程式碼裡的劇情名自動遮成「…」。
- 實測（8215，手機尺寸）：教學全程（含新的切換箭頭）、挑戰、亂入都跑得完；結算無拾得道具。app.js 約 519 KB、素材 122 個。
- ⚠ **主 repo `raykueco-debug/TIVOT` 是公開的，GitHub Pages 有完整遊戲** —— 試玩版要藏內容，建議：主 repo 改名（例 TIVOT-dev）設私人、另開公開 repo 只放 dist。**等 Ray 決定**，部署腳本還沒寫。
- 「不要動到主程式」＝打包流程不准改主程式；試玩的遊戲改動直接改主程式（Ray 10-19 確認）。

**PV（`tools/promo/editor`，專案 `pv_v4_board`）**
- 編輯器：clip 旗標 `flicker`（閃**黑**，16 Hz）、`zin/zout` 的焦點 `fx/fy`、音軌**音量包絡線**（拉中段＝響度、拉尾段＝淡出角度）。render.py 與 app.js 預覽同步。
- 錄製器：場景 `alpha:True`（透明 PNG 序列）、`PROMO_NOSHOT`、`PROMO_DUMP`；新場景 `kerbopen`（開棺 alpha）／`kerbdoor`／`kerbclose`（閉棺 alpha）。
- 字卡：`end_card.py`（A 款熱光掃＋火星飛散、緩縮：2026.11.27 中文體驗版釋出）、`credit_card.py` 的 `credit_end_v2`（Project E.O.S. logo 並列 PV BGM）、`credit_al_v2`（原作 A.L.）、`credit_eos_v2`（單行 Project E.O.S.，純黑底無光暈）。
- BGM 尾音實驗：`bgm_havoc_endnote_v1`／`bgm_havoc_echo_v1`（Ray 最後自己換回原版）。
- ✔ 素材板引用的 media（`tools/promo/editor/media/`，本來 gitignore）**這次強制收進版控**，另一台 pull 後開編輯器 `?project=pv_v4_board` 就有全部素材。
  ⚠ 之後素材板新增 media 一樣要 `git add -f`，不然另一台缺檔。
  ⚠ 開編輯器一律帶 `?project=pv_v4_board`、舊分頁先關 —— 本輪踩過舊分頁存檔把改動蓋回去。

## 本輪等 Ray
1. 試玩版上線方式（上面 repo 私人化那條）。
2. 試玩版西文：es 教學缺新那一句（西文整批時補）。

## 上一份沿用（⚠ 本輪未清點，下一輪開工跟 Ray 確認）
### 未完成
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
- ✔ **空中戰怪圖第二批後 5 張已交（10-15，GPT）**：`resources/enemy/mon_sky2_{mouthpillar,facecrown,eyeveil,rift,maw}.webp`，總覽 `_sky2_sheet.jpg`。Ray 10-15 定案。程式端：還沒有敵人卡（同第一批）。
- 戰鬥版（現有 40 格不能當戰鬥背景）：城鎮版定了再做。
- ⚠ **孤舟島時段差分做到 24／30（10-15 晚，Windows）**：`loneisle_<鍵>_{dawn,dusk,night}.webp`，剩 `wild`、`inn` 各三張等 Gemini 額度重置。進度表在 `loneisle/_spec.md`，產線細節在 `resources/_HANDOFF_ART.md`。程式端：還沒有節點，接時照 spec 的鍵名。
- ⚠ **內建瀏覽器產圖的限制（10-15 實測；Windows 這台的 Claude in Chrome 可用，上傳走得通）**：① **不能上傳檔案** —— 選檔不行、ChatGPT／Gemini 的 CSP 擋掉從頁面 fetch 外站（raw.githubusercontent 也擋）、腳本開新分頁會被擋、給 Gemini 網址它也讀不了 ⇒ **要參考圖的（Gemini 衍生差分）走不通**，純文字的 GPT 新圖可以。② 下載用 `fetch(img.src)→blob→a.download` 可行，**但那個分頁要在最前面**（`tabs_select`），落在 `~/Downloads`。

**眨眼補完（10-19 美術，Windows；已接上 `902e936f`，之後回來補完）**
- 已做：照眨眼 SOP（`face_parse --lite` → `blink_gpt.py grid/merge` 全閉＋半閉 → `blink_build.py --qa`）新增 96 張，`script/blink.js` 329→425。
  拼圖批名 `d19_1`～`d19_12`（`tools/_blink_base/grid_d19_*`），驗收總覽 `tools/_blink_out/_qa_01～04.png`。
- ⚠ 待 Ray 判、寫進 `tools/blink_reject.txt`（附理由）再重跑 `blink_build`：
  · 裁切抓錯：`renna_si_meltdownsmile`（只拍到頭髮）、`robert_si_closedtalk`（只拍到鬍子）。
  · 只閉一隻眼：`church_guard_si_draw`、`npc_imcommander_si_shock`、`npc_imsoldier_si_awe`。
  · 耳邊黑／紅點：`aaron_si_armscross／attention／confused／signal`、`church_guard_si_c`。
  · 原圖本來就閉眼／瞇眼（眨了看不出來）：`aaron_si_closedsmile`、`anya_si_cryhard／shakehead／shysmile`、`capi_mom`、`mage_si_front／laugh／wave／cast`、`molly_si_closedtalk／eyesmile`、`renna_si_cough／coughsoft`、`robert_si_bow`。
  · 其他：`anya_si_dizzy`（漩渦眼被眨成閉眼，要不要眨）、`npc_imcommander_si_urgent`（幾乎沒變）、`npc_imcommander_si_salute`（帽簷遮眼）。
- ⚠ 沒產出（找不到臉／眼，建議直接進排除清單）：`anya_si_back`、`nouvelle_si_back`、`torsten_si_back`、`anya_si_wheelback`、`church_guard_si_e`、`nouvelle_si_runcry／sadnoeye／shycover`、`npc_guildhunter_si`、`renna_si_die`、`renna_si_meltdown`、`npc_imsoldier_si_alarm`（全閉對位沒過門檻）、`torsten_si_front`（瀏海遮眼）。
- ⚠ 賽西莉 9 張（`d19_3`：call／command／nosebleed／pant／proud／ready／shocknose／shyhand／shynose）**半閉** GPT 連三次被審查擋，現用本機補丁推的半閉；全閉是 GPT 版。之後換串重送 `grid_d19_3.png` 半閉、`merge d19_3 … half`、再 `blink_build` 這 9 張。

**程式端可做**
- ⚠ 美術 10-14 同名覆蓋了插圖 `003_lunaria_armed.webp`（`config.js` 的 `ASSET_VER` 還是舊雜湊 `f656d515`）—— 要跑 `python3 tools/bust.py --bump` 才不會吃到快取的舊圖。`044_soranahug.png` 同理（10-13 覆蓋）。
17. `misha_si_ni` 眼效是舊圖座標，要用時重產；茉莉／羅伯特／亞隆立繪還沒接；`se_march` 不存在（主祭壇用 `se_troops` 頂）。
18. 科爾文 `salute` 我對到 `bow`；卡耶爾地圖圖名卡在夢境以外會報夜間時刻（夢境入口已不報）。

## 資產盤點（上一份沿用＋本輪新增）
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
| 空中戰怪圖第二批（`mon_sky2_*`） | ✔ 不欠（8 張齊，Ray 10-15 定案） |

| 立繪眨眼補丁（10-19 新增 96 張） | ⚠ 欠：約 30 張待判排除／重做、13 張沒產出、賽西莉 9 張半閉待 GPT 重出（見「未完成」眨眼條） |
| PV 字卡 credit_al_v2／credit_eos_v2／credit_end_v2、end_card_v2 | ✔ 不欠（Ray 10-19 定稿進素材板） |
| PV 開棺 alpha（kerbopen_alpha.webm）／閉棺（kerbclose_alpha.webm） | ✔ 不欠（閉棺 Ray 自己處理） |

## 已結案（不要再列）
（-2166 以前見上一份。）本輪：挑戰出擊整備移除、挑戰推棺閉棺、試玩版打包與不掉道具、教學副武器切換、PV 閃黑／焦點推近／包絡線／字卡／開棺。

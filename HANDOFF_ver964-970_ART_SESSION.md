# HANDOFF — ver -964〜-970（2026-09-09）／**由美術 session 做的程式改動**

> ⚠⚠⚠ **這一份不是程式 session 寫的。** `HANDOFF.md`（-953〜-955）是它自己那條線的
> 交接檔，**沒有被取代，也不要動它** —— 這一份是**補**：-964〜-970 這七版是 Ray 在
> **美術（產圖）session** 裡交辦、由它做完並 commit 的。
>
> **HEAD ＝ `ver 2026.09.09-970`**（`config.js` 的 `VERSION`）。
>
> ⚠⚠⚠ **程式 session 手上那幾支檔案是 `-963` 的舊讀值。**
> 它看不到那一邊的對話，也不知道這七版動了什麼 —— **沒重讀就動同一支檔案，
> 就會把這些改動蓋掉，而且不會有任何錯誤訊息。**
> 動下面那張表裡的任何檔案之前，**先重讀那一支**。
>
> 這件事已經寫進憲法：**CLAUDE.md 鐵律 11**（繪圖 session 被要求 coding 要先跳提醒；
> 決定繼續的話收工一定要交出這張版本清單）。

---

## 0. 版本 → 動了哪幾支檔案（**重讀清單**）

| 版本 | 主題 | 動到的檔案 |
|---|---|---|
| `-964` | 諾薇兒生命歸還改吸血、OBE 不再扣血 | `config.js` `modules/saint.js` `modules/partner.js` `modules/combat.js` |
| `-965` | 回血窗放寬到 BR 與 overkill | `config.js` `modules/partner.js` `modules/combat.js` |
| `-966` | 感應 CI 滿版脈動；石橋兩段疊播 | `config.js` `style.css` `script/town.js` |
| `-967` | 惡夢化最長 15 秒、不灌滿、發動不清攻擊圈 | `config.js` `modules/saint.js` `modules/combat.js` `modules/defense.js` |
| `-968` | 敵大絕的黃圈反擊命中率一律 0 | `config.js` `modules/defense.js` `modules/weapon.js` |
| `-969` | 獵手的共鬥也壓得過那條 0 | `config.js` `modules/defense.js` |
| `-970` | 女主九級＋索菈娜三條規則＋鐵律 11 | `config.js` `CLAUDE.md` `style.css` `script/progress.js` `modules/inspector.js` `modules/gear.js` `modules/weapon.js` `modules/defense.js` `modules/partner.js` |

**熱區**（被動最多次，最容易撞）：`config.js`／`modules/defense.js`／`modules/saint.js`／
`modules/combat.js`／`modules/partner.js`。

⚠ 工作樹裡的未追蹤檔（根目錄兩張 uuid png、`resources/SI/*.png`、`flight/Reference/`、
`地理筆記.docx`、`resources/vfx/42452231-….png` 的改動）**是 Ray 自己丟進來的美術素材**
—— 照 `HANDOFF.md` 檔頭的規矩：**不要動、不要提交**。

---

## 1. 被推翻的舊規則（**這一段最重要**：舊註解會騙人）

| 版本 | 推翻了什麼 | 現在是 |
|---|---|---|
| -964 | ver -740「生命歸還發動一律**回滿**」 | **保留現血量** ＋ 10 秒吸血窗（每發回 `playerMax` 5%） |
| -964 | 「OBE ＝ HP→1」（`setPlayerHpRatio(0)`） | **血量不動**（推滿才會走到那裡，所以必然是滿血） |
| -965 | ver -740 的回血窗「只有普攻算」 | **普攻／雙槍破防／overkill 三種射擊都算** |
| -967 | ver -671 惡夢化「發動時先把血灌滿再抽」 | **不灌滿**，從當下血量線性抽到 1 |
| -967 | ver -690 惡夢化「16 格 × `secPerCell` 0.8 ＝ 12.8 秒」 | **最長 15 秒**（`tuning.nightmare.maxSec`） |
| -967 | 惡夢化發動 `resetEnemyTimers()` ＋ 重排 | **完全不動敵人計時器**，只凍結／解凍攻擊圈 |
| -970 | ver -725「`showExp:false`，等有了等級系統再打開」 | **打開了**（那個系統就是 `config.girls`） |
| -970 | ver -804「村戰後索菈娜仍是搭檔，等 Ray 的轉場旗」 | 旗來了＝`safehouse_shinier`；圍城打完**自由選** |

⚠⚠ **`modules/saint.js` 的檔頭與 `triggerOBE`／`startNightmareMode` 的註解全部重寫過**
—— 舊版註解裡「OBE：HP→1」「灌滿再抽」「12.8 秒」那幾句已經不成立。

---

## 2. 新增的 config 欄位（讀值都要走既有的唯一查詢點）

```
partners.nouvelle.active.lifestealSeconds / lifestealPct   -964  生命歸還的吸血窗
partners.sorana.counterHit.bandMul{block,perfect}          -970  玩家自點黃橘圈再 ×0.7
tuning.nightmare.maxSec                                    -967  取代 secPerCell
tuning.ultBlockHit                                         -968  大絕黃圈的反擊命中率
rating.showExp                                             -970  由 false 改 true
rating.exp.invertFor: ['sorana']                           -970  她的 EXP 方向相反
storyPartnerBy[].not                                       -970  這支旗立了這一條就不算
girls{ who, expTo, levels }                                -970  女主九級（見 §4）
```

被移除的：`tuning.nightmare.secPerCell`（12.8 秒那條，已被 `maxSec` 取代）。

---

## 3. 新增／改了簽名的 API

```
partner.shotHealPct()            -965  取代 guardHealPct（已改成私有）。「這一發回多少血」
                                       的唯一查詢點：即死防禦 2% 與生命歸還 5% 取大的、不相加。
combat.shotHeal()                -965  「什麼時候回」的唯一實作，三個射擊分支各叫一次。
saint.lifeReturnAbort(done)      -964  多一個 done：cut-in 撤下、盤面重建之後才叫（吸血窗於此起算）。
defense.pauseThreats()           -967  **改成有回傳值**：這一次真的由我暫停的才回 true。
                                       （惡夢化常在教學對話裡觸發，那時圈早被 pauseForDialog 凍著）
weapon.weaponCounter(scale,hit,roll,grade)
                                 -970  多一個 grade（'block'|'perfect'|'counter'），
                                       只有 defense.resolveThreat 答得出來，由它傳進來。
progress.girlExp/girlLevel/girlProgress/girlBonus/girlStarName/addGirlExp/setGirlLevel/isGirl/girlMaxLv
                                 -970  女主九級（見 §4）
inspector.settleExpShares()      -970  EXP 給誰（私有）
inspector.expForWho(who,score,stats)
                                 -970  這一位拿多少（索菈娜鏡射分數）
inspector.awardExp(score,stats,shares)
                                 -970  發放的唯一入口
```

---

## 4. 女主九級（-970）—— **還沒完，等 Ray 的卡**

> Ray：「像嘉尼米德那樣分九級，但是**純吃 exp**」「你先放 lv1~lv9，**星名跟對應技能
>   我會分角色給你**，有不懂的就問別瞎做」「蕾娜沒有」

- **對象**：`config.girls.who = ['nouvelle','anya','sorana']`。蕾娜沒有（她是監察官、
  沒有戰鬥技能，走 `rating.affection.renna` 那一欄）；蕾妮／馬季諾是試玩版的。
- **陡度**（`girls.expTo`，累計）：`0 / 600 / 1500 / 2800 / 4600 / 7000 / 10200 / 14400 / 20000`
  （每級 ×1.33）。依據：一局 EXP ＝ D 137／C 446／B 573／A 709／S 836~1009，**平均 600**
  → Lv9 ≈ **專養一位 33 局**、三人輪流養 ≈ 100 局（S 級打法 ≈ 60 局）。
  Ray 的條件是「遊戲內兩個月、三個女主都**有機會**滿級」。
  ⚠ 要整體調快慢**只動那一排數字**，形狀（比例）不必碰。
- **只存累計 EXP，等級是算出來的**（鐵律 7）—— 存「等級」就是第二個真相。
- **一輪內**：`newRun()` 清、`snapshot/restore` 帶（§6.9 的兩面，兩支都加過了）。
- ✅ **諾薇兒的九格 ver -971/-972 已填**（Ray 交卡：巨蟹座九星）——
  連帶把兩件現行預設的能力收成升級獎勵（Reload→Lv3、即死防禦每場 reload→Lv7），
  並實作抬頭那句「連續聖徒化 combo 增益 10 秒」。細節見那一版的 commit 與
  `config.js` 的 `girls.levels.nouvelle`。
- ⛔⛔ **安雅與索菈娜的 9 格仍是空的（`{name:'', desc:''}`）** ——
  **不要自己發明星名或效果**（同 `items.defs` 的護符、`tuning.weaponPerks`：
  Ray 的卡還沒到就空著）。
  卡到了只要填 `name`／`desc` 與效果欄位：`prog.girlBonus(who, key)` 那個唯一查詢點
  已經立好，**呼叫端一行都不必改**就會吃到。

**EXP 發給誰**（Ray：「給單局最多出場數的那一個，平手的話給好感度高的那一個，
還是平手的話均分」）：

- 出場帳**沿用 ver -921 的 `state.partnerFights`**（`enemy.setEnemy` 記，一局一份）——
  沒有另開一份帳：好感與 EXP 問的是同一件事「這一局誰打得多」。
- ⚠⚠ **但分配規則與好感不同，所以是兩支 resolver**：好感那邊索菈娜自己一桶
  （她的獎在低評價那一格，不與人爭）；EXP 這邊就是**比場數 → 好感度 → 均分**。
- ⚠⚠⚠ **收款人要在 `clearSessionGain()` 之前算好再傳下去** ——
  那一支會把 `partnerFights` 一起清掉（ver -921 那個「誰都沒加到好感」的坑一模一樣）。
- **索菈娜方向相反**（Ray：「Rank 越低 exp 越高」）：作法是**把分數鏡射**（`100−score`）
  再走同一條公式，不另訂第二條式子。實測 D≈1009／B 573（交叉點）／S≈137，與另外兩位
  對稱、也與好感表（`sorana:{D,C}` vs `partner:{S,A}`）同一個方向。
  ⇒ **所以 EXP 是逐個收款人各算一次的**：平手均分時兩人各拿**自己那條公式**的一半。
- 發放只有 `awardExp()` 一支，`scriptSettle`／`restSettle` 都叫它。
  打靶（卡上 `noReward`）不給；出陣（試玩版）那條路的搭檔不是女主，`isGirl` 自然擋掉。

**介面**：整備頁搭檔卡多了一條 `Lv N ＋星名 ＋ EXP 進度條`（`gear.girlLvHtml`）。
**管理人模式整條可點：+1 級、滿級歸 Lv1**（明寫的開發梯子，同九星那條，鐵律 9 的例外）——
沒有它，等技能到了根本測不動。

---

## 5. 我推的假設（**Ray 沒明說，等他一句話**）

1. ✅ **已由 Ray 確認（ver -971）**：索菈娜的黃橘圈 ×0.7 **沿用** `except:['萊福槍']`。
   Ray：「索是共鬥者，不是後方術師，而且定位玩法是**破防 loop**，設定上防止重武器 TK
   本來就會降命中。」⚠ 順帶查清楚：這個 `except` 對現有六把槍**一發都不差** ——
   萊福槍的黃橘圈本來就不反擊，`bandMul` 對它形同不存在（詳見 `config.js` 那段註解）。
   以下為當初提問時的原文，留著當紀錄：
   他的理由是「她不是後方輔助是**共鬥者**，**重武器**為了要避免 TK 命中率會變低」——
   我照那個理由推「遠距單發的那一把沒有這個問題」，**但他沒說例外要不要沿用**。
   現在的實際值：黃／橘 ＝ 0.5×0.7 ＝ **0.35**、紅 ＝ 0.5、萊福槍 ＝ 1。
2. 石橋那個分岔（-966）的邊角：**來過石橋但對白沒推完就走掉**（`flag` 是演完才記）
   → 之後開門會被當成「沒去過」走 B。B 是比較通用的說法，而 A 那句
   「剛剛打開的，會是那扇門嗎？」預設玩家看過那扇門是關的。已在資料註解裡寫明。
3. 感應 CI（-966）用 `object-fit:cover` 滿版 → 正方形的圖在直式場景區**左右各裁掉約一成**
   （頭髮外緣）。那是「可稍超出畫面」的必然；要一根頭髮都不裁就得留上下邊。

---

## 6. 待驗（**戰鬥類交給 Ray**，這幾版只做過語法檢查與離線驗算）

- **-964／-965**：聖徒化中下滑生命歸還 → cut-in 收掉後**血停在中止那一刻**（不是滿的），
  金光柱倒數 10 秒；那 10 秒內**普攻／BR 每一發／overkill 追打**都跳血（滿血 100 → 一發 +5）。
  倒數槽推滿吃 OBE → cut-in 收掉後**血是滿的**，不是 1。
  免傷窗（2%）與吸血窗（5%）同時開著時，一發只回 5% 不是 7%。
- **-967**：惡夢化發動瞬間場上的紅圈**還在、而且大小沒跳**；滿血發動撐 15 秒、
  半血發動也是 15 秒但斜率一半；抽到 1 跑 MELTDOWN。
- **-968／-969**：大絕的黃圈點下去**全 miss**（連第一發都不中）；
  明晰之夢／惡夢化／共鬥期間**不受這條管**。
- **-970**：打完一局看結算頁有 `EXP　<名字>　＋n`（升級那一局多一列 `LEVEL UP`）；
  連戰中途去整備頁換人 → EXP 進**場數多**的那一位；帶索菈娜打一場 D 看她拿到接近 1000。
- `tools/script_lint.py`：**0 錯誤**（46 個提醒都是既有的）。

---

## 7. 順手抓到的既有問題（**沒改，報一下**）

1. ⚠⚠ **`saintAdvanceDivisor` 的註解與實際不符**。`config.js` 與 `combat.js`／`saint.js`
   三處都寫「一次受擊推進 ≈**+1 秒**、格擋 ≈+0.5 秒」，但實際是 **0.67／0.33 秒** ——
   `saintAdvanceDivisor:15` 是對著「滿槽 15 秒」寫的，而 `saintPassiveHealSec` 現在是 **10**，
   匯率變了、divisor 沒跟著改。兩條路都是 Ray 的決定：
   · 要維持「受擊 −1 秒」→ divisor 改 **10**／block 改 **20**（懲罰**變重 1.5 倍**）
   · 要維持現在的手感 → 只改註解寫成 0.67／0.33
   ⚠ 這個數字**惡夢化也在讀**（ver -691 刻意共用「讓兩邊因受擊減少的持續時間一致」），
   動它兩個系統一起變。
2. ⚠ **共鬥期間玩家自己點圈會搶掉飛刀反擊** —— 收圈是延後 90ms 的（-822 刻意，
   讓玩家看得到「出圈瞬間被打掉」），在那之前手快點下去走的是自己副武器的黃圈反擊。
   -969 只把「大絕黃圈命中率 0」那條排除掉了（不然共鬥期間點大絕圈反而是保證 0 傷），
   **搶反擊這件事本身沒動**。要讓共鬥期間的點擊一律讓給飛刀，是 `resolveThreat` 開頭
   加一道 `coopMode` 守門的事。
3. 整備頁武器卡的「黃圈」那一列印的是**那把槍的常態命中率**（機槍 30%）——
   大絕時是 0，卡上沒標。要標再說。

---

## 8. 美術那條線（**停在這裡**，這個 session 原本的隊列）

照鐵律 11：接了程式的活，美術隊列就停了。現況：

- **幽墓系 `mon_gloom_*`**：①原形 10/10 完成、②去顆粒 0/10（量過，全部不需要）、
  ③**去背 4/10 送出**（gargoyle／buttress／tracery／effigy），剩 6 隻沒送，**一張都還沒回收**。
  產線對話 `chatgpt.com/c/6a9fbaef-4e00-83ee-82eb-a1456969faa2`
- **民俗傳說系 `mon_folk_*`**（`_folk_spec.md`）：①**1/10 送出**（mariwyd），未驗。
  產線對話 `chatgpt.com/c/6aa033f3-3150-83e9-b89a-cb0848ed2c18`
- **機關系 `mon_gear_*`／菌葬系 `mon_spore_*`**：規格與十個剪影已定，**0/10 產出**。
- **苦笑系 `mon_rictus_*`**：Gemini 那批原形整批作廢（Ray：「gem 生的太卡通了」），
  整族要照新產線（GPT 先）重跑。
- **峽谷 20 隻**的 Gemini 原形：同一個判斷下大概也不能用，**已回報、Ray 未決定**。

⚠ 那兩個 ChatGPT 對話串放久會過期／被別的東西污染（一族一串的規矩見 `_rictus_spec.md`）。

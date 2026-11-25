# 語音授權盤點（ElevenLabs 免費期生成的要重生）

> 行銷副專，2026-11-25。比對來源：Ray 的 ElevenLabs 帳號 History（最早一筆是 2026-09-05）＋各語音檔第一次進版控的 commit 日期。
> 帳號在 **2026-11-25 才升級 Starter**（下次續訂 12-25）⇒ **今天以前生成的全部是免費期，沒有商用授權**。
> 狀態只有兩種：`✔ 不欠`（寫理由）／`⚠ 欠重生`。「？」＝要 Ray 聽一下確認。

## 〇、聲音比對結果（2026-11-25，取代下面一、二節的推測）

作法：遊戲裡 86 支語音逐支算音量包絡（20ms 一格），和 ElevenLabs History 裡 230 筆 TIVOT 生成逐筆滑動比對。
真的是從那筆剪出來的會幾乎完全吻合（相關係數 ≥0.97，而且明顯贏過其他每一筆）；RVC 的檔對誰都差不多。
⚠ 包絡比對是粗的：長的 History 錄音會讓不相干的短檔也拿到 0.9 上下，所以「中」那一欄另外看**台詞內容是否對得上**。

| 結論 | 檔 | 根據 |
|---|---|---|
| ⚠ **確定 ElevenLabs**（聲音吻合） | `vo_sorana_found1` `found2` `search1` `search2` `pack` `pack2`、`vo_anya_obe`、`vo_nemo_slow1` `slow2`、`vo_nouvelle_lvup` | 相關 0.97～1.00，且領先第二名 0.09 以上 |
| ⚠ **幾乎確定**（聲音高度吻合＋台詞對得上） | `vo_nemo_feint` `win` `bulletrain` `play`、`vo_sorana_supply1` `supply2` `obe1` `obe2`、`vo_nouvelle_lifereturn` `saintinstall`、`vo_anya_nightmarereload` | 相關 0.90～0.97 且對到的是同一句台詞 |
| ⚠ **很可能**（台詞與日期對得上，聲音比對不夠明顯） | `vo_nouvelle_saintreload`、`vo_maria_dishdone`、`vo_sorana_search3`、`vo_sorana_roar` `roar2` `lvup`、`vo_nouvelle_deathguard` | 要 Ray 聽一下 |
| ⚠ **確定 ElevenLabs**（History 沒有，但原稿在 `_originals`） | `vo_cecilie_miss1～5` | Ayaka 草稿 |
| ✔ 不欠：Ray 自己配 | `vo_luna_*` `vo_lunamg` `vo_renee_*` `vo_malzeno_*`、`vo_nouvellemiss1～3` | Ray 11-25 確認 |
| ✔ 不欠：比對不到任何 ElevenLabs | `vo_misha_*`（20）、`vo_torsten_*`、`vo_anya_dreambreaker1/2` `nightmareinstall` `luciddream` `lvup`、`vo_nouvelle_obe`、`vo_sorana_miss1～4`、`vo_cecilie_saintinstall` `obe` `deathguard` `lifereturn` | 每一筆的最佳相關都只是「長錄音的背景值」，沒有明顯贏家 |

⚠ **RVC 不洗授權**：「ElevenLabs 生成 → 自己 RVC 轉聲」的檔，聲音包絡會和原生成幾乎一樣（安雅 OBE 0.997），來源仍是那一筆 ElevenLabs 輸出；免費期生成的照樣要換成付費期生成的再轉。
⚠ 比對只涵蓋 History 有的（09-05 起）。09-05 以前的只能靠 Ray 確認。

## 一、History 裡屬於 TIVOT 的生成（全部免費期）

| 生成日 | ElevenLabs 聲音 | 台詞（節錄） | 對到的檔 | 把握 |
|---|---|---|---|---|
| 11-24 | Ayaka（另試過 Yuki） | ちゃんとやりなさい！… | `vo_cecilie_miss1～5` | 確定（原稿在 `_originals`） |
| 10-02 | Akira | 遊ぼうぜ／遅い／死なないでくださいよ／っと！見せかけ！／さすがです／これでもくらえ | `vo_nemo_play` `slow1` `slow2` `feint` `win` `bulletrain` | 高（同日 ver -1920 進版控、台詞對得上） |
| 09-11 | itsuki | よく見えないが／確かその辺に／あった！／見つけた！／みっけ！／どれどれ | `vo_sorana_found1` `found2` `search1` `search2` `search3` | 高（同日 ver -1089／-1090） |
| 09-10 | Yui | よかった—— | `vo_nouvelle_lvup` | 確定（Ray 11-25 確認） |
| 09-09 | Yui | よく見てください！ | **沒用上** | ✔ 不欠：諾薇兒失誤音 `vo_nouvellemiss1～3` 是 Ray 自己配的（11-25 確認），這筆只是試聽 |
| 09-08 | Saori／Kuon | 出来上がり！ | `vo_maria_dishdone` | 高（同日 ver -954） |
| 09-07 | Suzu | 行けます！ | `vo_anya_nightmarereload` | 中（同日 ver -894） |
| 09-07 | Yui | わたしも頑張らなくちゃ | `vo_nouvelle_saintreload` | 中（同日 ver -893） |
| 09-05 | itsuki | よっしゃー！いい感じ！／行くぞ！任せておきな！ | `vo_sorana_roar` `roar2` `pack` `pack2`？ | 中（ver -837／-818 同日） |
| 09-05 | Suzu | あなたに……力を！／一緒に……逝って！ナイトメア……インストール | `vo_anya_luciddream`？`vo_anya_nightmareinstall`（同名覆蓋？） | ？ |
| 09-05 | Yui（另試 Lime、Kana） | 死なないで！もう限界！私の全てを！セイントインストール！ | `vo_nouvelle_saintinstall`（同名覆蓋？） | ？ |

## 二、History 查不到的（＝Ray 說的「自己 RVC」那一大部分，或 09-05 以前）

`vo_luna_*`／`vo_lunamg`／`vo_renee_*`／`vo_malzeno_*`（8 月）、`vo_torsten_*`、
9 月 1 日那批（`vo_nouvelle_deathguard` `lifereturn` `obe`、`vo_anya_dreambreaker1/2` `obe`）、
`vo_sorana_obe1/2` `supply1/2` `miss1～4`、`vo_cecilie_saintinstall` `obe` `deathguard` `lifereturn`、`vo_misha_*`（20 支）。

⚠ 注意：下載資料夾裡有一支 **2026-08-12 的 Mitsuki**，但 History 裡沒有 8 月的紀錄 —— History 可能不完整（刪過或另一個帳號）。8 月那批若有 ElevenLabs 生成的，這份表抓不到，要 Ray 回想。

## 二之一、重生順序（Ray 11-25：試玩版要用的排前面）

| 順位 | 檔 | 理由 |
|---|---|---|
| **1 試玩必用** | 諾薇兒：`vo_nouvelle_saintinstall`／`lifereturn`／`saintreload`／`deathguard`？／`lvup`（`lvup` 已重生 2 個 take，在 `resources/audio/_raw/vo_regen_1125/`） | 試玩全程的搭檔 |
| **1 試玩必用** | 安雅：`vo_anya_nightmarereload`、`vo_anya_obe`（比對確定；`luciddream`／`nightmareinstall` 比對不到，不欠） | 北泊惡夢化與明晰之夢都在試玩範圍 |
| 2 待確認 | 索菈娜：`vo_sorana_found1/2`／`search1～3`／`roar`／`roar2`／`pack`／`pack2` | 她在試玩終點那一戰才登場；「發現了」若在試玩的飛行畫面會響就升 1 |
| 3 正式版 | 尼莫 6 支、瑪麗亞 `dishdone`、賽西莉失誤 5 支 | 鏡湖戰、Stage 8 料理、賽西莉都不在試玩九場主戰裡 |

## 二之二、額度（2026-11-25 量）

- 帳號剩 **32,148 點**（Starter 每月 3 萬，12-25 續）。Eleven v3／v4 是 **1 字元＝1 點**，`[tag]` 標籤也算字。
- **TRG**（Serafina 那個專案）所有不同台詞合計約 **10,000 字**；照以前平均每句重生 2 次算約 **2 萬點**。
- **TIVOT** 要重生的約 30 句短台詞，含標籤每句約 30～90 字；每句試 3 次也只要約 **3,000～5,000 點**。
- ⇒ 兩邊一起約 **2.3～2.5 萬點**，這個月的額度夠，**TIVOT 先做不會擠到 TRG**。不夠的話 12-25 會再補 3 萬。

## 二之三、試玩用的已重生（2026-11-25，付費期，每句 2 個版本 A／B）

檔在 `resources/audio/_raw/vo_regen_1125/`（同一個聲音、同一段台詞、同一組設定，照比對到的那一筆 Restore 重生）：

| 新檔 | 要換的遊戲檔 | 備註 |
|---|---|---|
| `nouvelle_lvup_A/B` | `vo_nouvelle_lvup` | |
| `nouvelle_saintinstall_Lime_A/B` | `vo_nouvelle_saintinstall` | 比對結果是 **Lime** 這個聲音，不是 Yui（Ray 聽一下） |
| `nouvelle_lifereturn_chain_A/B` | `vo_nouvelle_lifereturn`（＋`deathguard` 若確認是 ElevenLabs） | 整串「もう限界！死なないで！私の全てを！セイントインストール！」，**要剪**出對應那一段 |
| `nouvelle_saintreload_Yui_A/B`、`_Suzu_A/B` | `vo_nouvelle_saintreload` | 比對偏向 Suzu 但不明顯，兩種聲音都生了，Ray 挑 |
| `anya_obe_A/B` | `vo_anya_obe` | 整句「あなたに……力を！！これ以上！！」，原檔是剪過的，要剪 |
| `anya_nightmarereload_A/B` | `vo_anya_nightmarereload` | |

**交接（Ray 挑好版本後 → 劇情副理）**：同名換上（m4a、單聲道 64k，照 ver -1919 的轉法）、需要剪的照原檔長度剪、重量 `tuning.fileGain` 那幾列、`bust.py --bump`；舊檔走 `tools/recycle.sh`。換完把第〇節那幾列改成 `✔ 不欠（11-25 付費期重生）`。

## 二之四、Ray 試聽定案（2026-11-25 18:16 提交）→ 交劇情副理換檔

| 遊戲檔 | 用哪一個新檔 | 怎麼處理 |
|---|---|---|
| `vo_nouvelle_lvup` | `nouvelle_lvup_A.mp3` | ✔ 已換（ver -3027） |
| `vo_nouvelle_lifereturn` | `nouvelle_lifereturn_chain_A.mp3` | ✔ 已換（ver -3027，剪「私の全てを！」） |
| `vo_nouvelle_deathguard` | `nouvelle_lifereturn_chain_B.mp3` | ✔ 已換（ver -3027，剪「死なないで！」） |
| `vo_nouvelle_saintreload` | `nouvelle_saintreload_Suzu_A.mp3` | ✔ 已換（ver -3027） |
| `vo_anya_obe` | `anya_obe_B_cut3_koreijou.mp3`（付費期的「これ以上！！」） | ⚠ 等 Ray 過一次 RVC 再換。Ray：「これ以上是我的 rvc」—— 但原檔與 9-05 那筆 Suzu 免費期生成的 3.04～4.6 秒（＝「これ以上！！」）包絡相關 **0.997**，是那一段經 RVC 轉的，來源仍是免費期輸出。作法：拿 cut3 用同一個 RVC 模型轉一次，再交劇情副理換 |
| `vo_anya_nightmarereload` | `anya_nightmarereload_A.mp3` | ✔ 已換（ver -3027） |
| `vo_nouvelle_saintinstall` | **等 Ray 第二輪**（Lime 被退，補了 Yui A／B，或從整串 A 結尾剪） | 定了再換 |

新檔都在 `resources/audio/_raw/vo_regen_1125/`。換法照 ver -1919：m4a 單聲道 64k、重量 `tuning.fileGain` 那幾列、`bust.py --bump`、舊檔走 `tools/recycle.sh`。

## 三、怎麼重生

1. 用 Starter 帳號，**同一個聲音、同一段台詞**重新生成（History 裡每一筆都能直接重用文字與設定）。
2. 新檔交劇情副理：同名換上、重量 `tuning.fileGain`、`bust.py --bump`。
3. 換完把第一節的狀態改成 `✔ 不欠（11-25 後付費期重生）`。

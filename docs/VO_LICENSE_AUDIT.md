# 語音授權盤點（ElevenLabs 免費期生成的要重生）

> 行銷副專，2026-11-25。比對來源：Ray 的 ElevenLabs 帳號 History（最早一筆是 2026-09-05）＋各語音檔第一次進版控的 commit 日期。
> 帳號在 **2026-11-25 才升級 Starter**（下次續訂 12-25）⇒ **今天以前生成的全部是免費期，沒有商用授權**。
> 狀態只有兩種：`✔ 不欠`（寫理由）／`⚠ 欠重生`。「？」＝要 Ray 聽一下確認。

## 一、History 裡屬於 TIVOT 的生成（全部免費期）

| 生成日 | ElevenLabs 聲音 | 台詞（節錄） | 對到的檔 | 把握 |
|---|---|---|---|---|
| 11-24 | Ayaka（另試過 Yuki） | ちゃんとやりなさい！… | `vo_cecilie_miss1～5` | 確定（原稿在 `_originals`） |
| 10-02 | Akira | 遊ぼうぜ／遅い／死なないでくださいよ／っと！見せかけ！／さすがです／これでもくらえ | `vo_nemo_play` `slow1` `slow2` `feint` `win` `bulletrain` | 高（同日 ver -1920 進版控、台詞對得上） |
| 09-11 | itsuki | よく見えないが／確かその辺に／あった！／見つけた！／みっけ！／どれどれ | `vo_sorana_found1` `found2` `search1` `search2` `search3` | 高（同日 ver -1089／-1090） |
| 09-10 | Yui | よかった—— | `vo_*_lvup` 其中一支？ | ？ |
| 09-09 | Yui | よく見てください！ | 失誤語音其中一支？（`vo_nouvellemiss*`／`vo_sorana_miss*`） | ？ |
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

## 三、怎麼重生

1. 用 Starter 帳號，**同一個聲音、同一段台詞**重新生成（History 裡每一筆都能直接重用文字與設定）。
2. 新檔交劇情副理：同名換上、重量 `tuning.fileGain`、`bust.py --bump`。
3. 換完把第一節的狀態改成 `✔ 不欠（11-25 後付費期重生）`。

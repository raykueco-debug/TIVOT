# 返回帝都～薇拉馮德稿：缺差分補圖（2026-10-09，美術）

Ray 交的稿（返回帝都／郊外風車荒地／帝都旅店與城鎮戰／碼頭術師戰／薇拉馮德／尼莫來襲／碎片 01・02／備用橋段），
逐句對過現有差分，**只補磁碟上沒有、也沒有現成差分能頂的**。總覽 `_capital_return_gap_sheet.jpg`。

## ✔ 交件（6 張，全部 GPT 出圖、真 alpha、1024×1536；原 PNG 在 `_originals/SI/`）

| 檔 | 稿上那一句 | 量到的 top／bot（alpha>20） |
|---|---|---|
| `si/anya_si_sad.webp` | 安：sad（兩次） | 8／1524 |
| `si/anya_si_shakehead.webp` | 安：搖頭 | 5／1522 |
| `si/nouvelle_si_runcry.webp` | 諾：邊哭邊跑 | 4／1523 |
| `si/npc/mage_si_hurt.webp` | ？？？：「咕……」（碼頭戰後） | 13／1515 |
| `si/cecilie_si_teary.webp` | 備用橋段：賽不甘含淚 | 3／1532 |
| `si/npc/npc_commander_si_front.webp` | 碎片 02：指揮官（**新角色**，同 `sodier_` 部隊制服＋軍官配件，徽章原創） | 4／1526 |

- `fx` 沒量（要眼睛位置），程式端照 §6.5「新增立繪要量什麼」量。
- 身體內部 alpha GPT 給 250~254，交件時 ≥245 一律補成 255（否則疊背景會微透）。邊緣半透明區近白 ≤77 px，乾淨。

## ✔ 不欠（現有差分頂得住，不畫）
- 安雅：terrifying→`terrify`、sobbing→`sob`、deseprade→`desperate`、冷顫→`scare2`、臉紅→`smileshy`、不爽→`makeface`、？？？→`curious`；其餘 shy/scare/silent/nervous/talkshy/nod/steady/upset 同名都在
- 諾薇兒：smilebig→`bigsmile`、欲言又止→`lookdown`；worry/surprise/concern/shock/sadsmile 都在
- 蕾娜：evalutating→`evaluate`、awkwar→`awkwerd`、清喉嚨→`covermouth`、不爽→`annoy`、神會→`nod`；其餘都在
- 索拉娜：surprised→`surprise`、驚→`surprise`；cringe/embarrass/side/tease 都在；背安雅→`soranaanya_si_backcarry`
- 科爾文、教廷衛兵 a~f、羅貝爾特（使眼色→`blindeye`、笑→`closedtalk`）、亞隆（→`confused`）、茉莉、賽西莉（含 `saintinstall`）、蘿芮、尼莫（呵欠→`bore`）、術師（笑→`front`）、士兵→`sodier_`
- 小男孩／母親：只有聲音，不畫立繪

## ⚠ 不是立繪、這一單沒做（插圖，等 Ray 決定要不要另開）
落淚插圖（蕾娜夜談）、主角撲倒蕾娜、賽西莉與尼莫、安娜王女宣言、月下船首的瞇眼青年、碎片的巨大聖徒／主角與賽西莉。

## ⚠ 程式端要接（鐵律 11，美術不碰）
1. `script/speakers.js` 的 `ART` 補六個 expr：`anya.sad`／`anya.shakehead`／`nouvelle.runcry`／`mage.hurt`／`cecilie.teary`；指揮官是新 speaker（`npc_commander_si_front`）。
2. 取景值照上表的 top/bot，`fx` 現量。
3. 新檔不是同名覆蓋，不必跳 `ASSET_VER`。

# 無傷清盤讚聲（CHEER）定稿 —— 11-26 Ray 審定

- 用途：無傷清盤時搭檔隨機一句（接口在 `config.tuning.perfectCrit.cheerVoice`，語音生好再接）。
- 情境：**全部都是戰鬥中**的語音。槍聲還在響、敵人還在前面，所以是「短促、提高音量、帶點喘」，不是坐著聊天的口氣。
- 情緒 tag 是 ElevenLabs v3 的方括號寫法，整行直接貼進去。
- 檔名規則：`vo_<角色>_cheer<編號>`（例：`vo_cecilie_cheer1`）。

## 賽西莉（傲嬌）

| # | 貼進 11Labs | 中文 |
|---|---|---|
| 1 | [flustered, slightly out of breath, mid-battle] べ、別に…！ | 才、才不是…！ |
| 2 | [smug, confident, raised voice over gunfire] ふん、当然よ。 | 哼，當然。 |
| 3 | [aloof, quick, mid-battle] まあまあね。 | 還算可以吧。 |
| 4 | [grudgingly impressed, short breath] …悪くないわ。 | …不差嘛。 |
| 5 | [shy, stammering, flustered, mid-battle] ちょ、調子に乗らないでよね… | 別、別得意忘形啦…（Ray：句首口吃、有點害羞） |
| 6 | [embarrassed, quiet but quick, mid-battle] …ちょっとだけ、ね。 | …只有一點點啦。 |

## 諾薇兒（溫暖）

| # | 貼進 11Labs | 中文 |
|---|---|---|
| 1 | [excited, bright, raised voice over gunfire] すごいです！ | 好厲害！ |
| 2 | [relieved, warm, slightly breathless] 怪我がなくてよかった。 | 沒受傷，太好了。 |
| 3 | [admiring, warm, mid-battle] さすがです。 | 不愧是你。 |
| 4 | [warm, impressed, quick] お見事です。 | 漂亮。 |
| 5 | [proud, gentle but energetic] 信じてましたよ。 | 我就相信你。 |
| 6 | [encouraging, energetic, shouting over gunfire] その調子です！ | 就是這樣！ |

## 索菈娜（假小子）

| # | 貼進 11Labs | 中文 |
|---|---|---|
| 1 | [cocky, energetic, shouting over gunfire] やるじゃん！ | 不賴嘛！ |
| 2 | [grinning, playful, quick] いいね！ | 讚！ |
| 3 | [thrilled, loud, adrenaline] 今の、最高！ | 剛才那下，超棒！ |
| 4 | [sporty, quick, mid-battle] ナイス！ | Nice！ |
| 5 | [cocky, laughing slightly, mid-battle] 楽勝じゃん。 | 輕鬆嘛。 |
| 6 | [pumped, shouting, adrenaline] よっしゃ！ | 好耶！ |

## 安雅（無口）

| # | 貼進 11Labs | 中文 |
|---|---|---|
| 1 | [soft surprised gasp, quiet, mid-battle] ……っ。 | （含蓄驚呼） |
| 2 | [calm, flat, clearly voiced, normal volume, mid-battle] ……いい。 | ……好。 |
| 3 | [calm, faintly impressed, clearly voiced, normal volume, mid-battle] ……すごい。 | ……厲害。 |
| 4 | [calm, short nod, clearly voiced, normal volume, mid-battle] ……うん。 | ……嗯。 |
| 5 | [calm, flat, clearly voiced, normal volume, mid-battle] ……完璧。 | ……完美。 |
| 6 | [calm, faintly impressed, clearly voiced, normal volume, mid-battle] ……強い。 | ……強。 |

⚠ 索菈娜 5 的原稿是「樂勝」（繁體字形），日文寫成「楽勝」11Labs 才唸得對。

⚠ 安雅（11-26 Ray：「變氣音了」）：tag 裡的 quiet／low 會被唸成氣音。無口要寫成 calm＋flat＋**clearly voiced, normal volume**，只有第 1 句驚呼保留氣音。

音檔：`resources/audio/_raw/vo_cheer_1126/`（`_post/` 是後製版）；試聽頁 `python tools/vo_review_server.py 8138 vo_cheer_1126` → http://localhost:8138/tools/vo_cheer_review.html

# 孤舟島 —— 工匠村落（10-14，Windows 美術 session）

> Ray：「一個村莊，工匠村落，船匠、槍匠的聚落，拓樸先照夏爾村，"孤舟島"，雲海中的一座孤島，沒有海水」

- **世界觀**：島頂浮出雲海，四周懸崖往下落進雲裡，**畫面上沒有海水**。船匠造的是航行於雲海上的木造帆船（同本作的飛空船）。
- **產法**：GPT，每格一個新對話；只上傳一張夏爾村同格的圖當畫風參考（明寫構圖內容不要照它）。
- **檔名**：`loneisle_<鍵>_day.webp`（1536×1024）；GPT 原輸出 `_gpt/_raw_<鍵>.png`（不進版控）。

## 拓樸（照 `script/town.js` 的夏爾村 13 格，鍵名一一對應）

| 夏爾村 | 孤舟島鍵 | 名稱 | 內容 | 出口（照夏爾村） | 日景 |
|---|---|---|---|---|---|
| plaza | plaza | 島心廣場 | 工坊圍著的小石鋪廣場、水井與木架起重滑輪、遠處雲海 | up north／left west／right east | ✔ |
| north | north | 北坡 | 往上坡的路，左邊頭領之家、右邊坡頂燈塔 | up cliff／left chief／right lighthouse／down plaza | ✔ |
| west | west | 船匠街 | 木屑與纜繩的街，左邊船台、下面槍匠工坊、上面通島緣 | up wild／left slipway／right plaza／down gunsmith | ✔ |
| east | east | 東坡 | 住家與晾衣、上面旅舍、右邊食堂、下面材料舖 | up inn／left plaza／right canteen／down store | ✔ |
| lakeside | cliff | 雲海崖 | 崖邊木欄、腳下一整片雲海（末端） | back | ✔ |
| chief | chief | 工匠頭領之家 | 石砌老屋、門前工具架與舊錨（末端） | back | ✔ |
| altar | lighthouse | 引航燈塔 | 坡頂石造燈塔，為雲海上的船引航（末端） | back | ✔ |
| wild | wild | 島緣荒地 | 島的邊緣、風蝕岩與矮草、遠處雲海（出口通飛行） | back／up 出島 | ✔ |
| workshop | slipway | 船匠船台 | 懸在崖邊的木造船台、造到一半的帆船龍骨（末端） | back | ✔ |
| hunter | gunsmith | 槍匠工坊（室內） | 鍛爐、砧台、槍管與槍托半成品、工具牆（末端，留店主空位） | back | ✔ |
| sorahome | inn | 工匠旅舍（室內，inn） | 樸素的木造旅舍大廳（末端，中央留空） | back | ✔ |
| restaurant | canteen | 工匠食堂（室內） | 長桌長凳的大眾食堂（末端） | back | ✔ |
| grocery | store | 材料舖（室內） | 木材、繩索、鐵件、釘子桶、帆布（末端，留店主空位） | back | ✔ |

- ✔ **日景 13 張已交（10-15，GPT）**：`loneisle_<鍵>_day.webp`，總覽 `_sheet13.jpg`。廣場第一版遠景畫了一堆其他浮島（與「孤島」矛盾）→ 同串改掉，之後每格提示詞都寫「雲海中沒有其他浮島」。
- ⚠ 欠：時段差分（村落照夏爾村全部四差分，Gemini 衍生）。

# 卡耶爾山谷（canyon 背景）— 扭曲恐怖系怪物（2026-10-09，美術）

Ray：「生一批卡耶爾山谷的怪 扭曲恐怖風格 搭配背景 先來一隻確認風格」→ 吊屍者過關 →
「照這風格再生 10 隻，要有一些碩大的、堅甲的、詭異的」。

⚠ 取代 `_canyon_beast_spec.md` 那份從沒生成過的 20 隻名單（那份是「健全／畸變／魔獸」寫實獸路線，這一批是扭曲恐怖路線）。

## 共同規格
- 產線：GPT 直接出真 alpha（每隻一個新對話，避免剪影趨同）；參考圖＝`mon_canyon_hanged`（系列畫風）＋ `background/canyon/canyon_corridor_day`（場景）
- 配色：冷灰／青灰／骨白為主，只點綴暗紅朝聖布條與鏽褐；朝聖者遺物（石龕、鏽燈、經幡、念珠、鎖鏈、聖像）是器物來源
- 不血腥、無文字、全身入框、1024×1536；四鐵則（anime style, cel shading, clean lineart, 無顆粒）
- ⚠ 共同段不寫姿勢 —— 姿勢逐隻指定

## 名單（基準 1 ＋ 新 10）

| 檔名 | 中文 | 類 | 剪影 | 狀態 |
|---|---|---|---|---|
| `mon_canyon_hanged` | 崖縫吊屍者 | 詭異 | 倒掛、六臂放射 | ✔ 交件（定風格） |
| `mon_canyon_colossus` | 崩岩巨像 | 碩大 | 塔狀直立巨人 | ✔ 交件 |
| `mon_canyon_coffinbeetle` | 石棺甲蟲 | 堅甲 | 低矮橫寬的甲蟲 | ✔ 交件 |
| `mon_canyon_bonecrab` | 骸殼蟹 | 堅甲 | 橫向張開雙螯 | ✔ 交件 |
| `mon_canyon_pilgrimmass` | 朝聖者團塊 | 詭異 | 一團蠕動的兜帽群 | ✔ 交件 |
| `mon_canyon_bellwyrm` | 喪鐘蠕蟲 | 碩大 | 從地面竄起的 S 形長蟲 | ✔ 交件 |
| `mon_canyon_saintvulture` | 聖面鷲 | 詭異 | 雙翼大張的鳥 | ✔ 交件 |
| `mon_canyon_ironpenitent` | 鐵衣苦修者 | 堅甲 | 佝僂人形拖著巨物 | ✔ 交件 |
| `mon_canyon_ribcage` | 肋籠獸 | 碩大 | 四足長頸骨架 | ✔ 交件 |
| `mon_canyon_stilt` | 高蹺細影 | 詭異 | 極細極高、四根長腿 | ✔ 交件 |
| `mon_canyon_censer` | 香爐蠍 | 堅甲 | 尾巴高舉的蠍 | ✔ 交件 |

## 交件（2026-10-09）
- 11 張全部 `enemy/mon_canyon_<名>.webp`（真 alpha、1024×1536），原 PNG 在 `_originals/enemy/`；總覽 `_canyon_horror_sheet.jpg`（疊在 `canyon_corridor_day` 上）。
- 每隻一個新對話、附吊屍者＋峽谷背景兩張參考，11 張一次就過、沒有被擋。
- ⚠ 構圖都很滿（外框貼近畫布邊）：`censer` 的尾巴頂到上緣、`ironpenitent` 的十字杖貼左緣、`pilgrimmass` 的經幡貼右緣 —— 遊戲的 fit 若會裁就要重出縮小版，等 Ray 看。
- ⚠ 程式端要接（鐵律 11）：這 11 隻都還沒有敵人卡；卡耶爾山谷的遭遇表要換成這一批，數值等 Ray 給。

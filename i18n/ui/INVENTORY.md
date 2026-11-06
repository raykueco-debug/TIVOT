# 介面字盤點（tools/ui_i18n.py extract 產生，不要手改）

> 這是**語種無關**的盤點：哪裡有中文、各用什麼方式換。新增語種只要翻
> `i18n/ui/strings.json` 裡 `need:true` 的那些 `zh`，不必重新盤點。

| 檔案 | wrap | data | html | script | skip-console | skip-key | skip-case | skip-compare | skip-template | skip-shader | skip-id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `(FORCE)` |  | 15 |  |  |  |  |  |  |  |  |  |
| `config.js` | 394 |  |  | 71 |  | 23 |  |  |  |  |  |
| `flight/index.html` | 463 |  | 43 | 65 | 116 | 2 |  |  | 1 | 19 |  |
| `index.html` |  |  | 87 | 8 |  |  |  |  |  |  |  |
| `main.js` | 115 |  |  |  | 14 |  |  |  |  |  |  |
| `modules/beatpick.js` | 11 |  |  |  |  |  |  |  |  |  |  |
| `modules/combat.js` | 1 |  |  |  |  |  |  |  |  |  |  |
| `modules/enemy.js` | 2 |  |  |  | 1 |  |  |  |  |  |  |
| `modules/gear.js` | 54 |  |  |  |  |  |  |  |  |  |  |
| `modules/inn.js` | 20 |  |  | 3 | 1 |  |  |  |  |  |  |
| `modules/inspector.js` | 38 |  |  |  | 5 |  |  |  |  |  |  |
| `modules/loot.js` | 83 |  |  |  |  |  |  |  |  |  |  |
| `modules/partner.js` | 1 |  |  |  |  |  |  |  |  |  |  |
| `modules/saint.js` | 6 |  |  |  | 3 |  |  |  |  |  |  |
| `modules/save.js` | 15 |  |  |  |  |  |  |  | 4 |  |  |
| `modules/settings.js` | 108 |  |  | 4 |  |  |  | 1 |  |  |  |
| `modules/story.js` | 190 |  |  | 1 | 33 |  |  |  |  |  |  |
| `modules/town.js` | 70 |  |  |  | 3 |  |  |  |  |  |  |
| `modules/transition.js` | 9 |  |  |  | 2 |  |  |  |  |  |  |
| `modules/tutorial.js` | 16 |  |  |  | 2 |  |  |  |  |  |  |
| `modules/weapon.js` |  |  |  |  | 4 |  |  |  |  |  |  |
| `script/clock.js` | 4 |  |  |  |  |  |  |  |  |  |  |
| `script/enemies.js` |  | 169 |  | 5 |  | 519 |  |  |  |  |  |
| `script/inventory.js` | 2 |  |  |  | 1 |  |  |  |  |  |  |
| `script/progress.js` | 58 |  |  |  |  |  |  |  |  |  |  |
| `script/shopcards.js` |  | 54 |  | 10 |  |  |  |  |  |  |  |
| `script/weapons.js` |  | 20 |  |  |  |  |  |  |  |  | 6 |
| **合計（處）** | **1660** | **258** | **130** | **167** | **185** | **544** | **0** | **1** | **5** | **19** | **6** |

- 不重複字串：2003 種；要翻：**1713 種／22455 字**
- `skip-template`／`skip-compare` 的那幾處是**人工檢查清單**：含 `${}` 的樣板字串查不了表、
  比較運算元換了會壞邏輯 —— 玩家看得到的要改寫成 `T()` 能查的形狀。

## 人工檢查清單（skip-template／skip-compare）

- `modules/save.js:308` skip-template：'第 ${st} 章 · ${fmtTime(rec.ts)}'
- `modules/save.js:326` skip-template：'第 ${n} 欄已有存檔：\\n${rec.label}\\n${fmtTime(rec.ts)}\\n\\n覆蓋它嗎？'
- `modules/save.js:329` skip-template：'已存入第 ${n} 欄'
- `modules/save.js:334` skip-template：'已讀取第 ${n} 欄'
- `modules/settings.js:352` skip-compare：'管理人'
- `flight/index.html:1033` skip-template：'\nfloat umH(vec2 q){ return fract(sin(dot(q,vec2(127.1,311.7)'

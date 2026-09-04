# 西湖村 Shinier — 待產清單（ver -734，可續跑）

**節點命名以 Ray 交的檔名為準**（`chiefhouse` / `huntercabin` / `soranahouse` / `Altar`），
時段四張：`_Dawn` / `_Day` / `_Dusk` / `_night`。

## 產法（Ray 定案）

1. **GPT 只畫日景那一張**
2. **其餘三張由 Gemini 從日景衍生** —— 上傳日景，要求
   「構圖、視角、景物位置、比例完全不變，只換光與色溫」＋ 該時段的光線描述
3. 順便吃到 cel shading／去顆粒的重繪（Gemini 那一趟本來就在做）

## 缺口（21 張）

| 節點 | Dawn | Day | Dusk | night |
|---|---|---|---|---|
| Plaza | **缺** | ✔ | ✔ | ✔ |
| North | **缺** | ✔ | ✔ | ✔ |
| West | **缺** | ✔ | ✔ | ✔ |
| East | **缺** | ✔ | ✔ | ✔ |
| Lakeside | **缺** | ✔ | ✔ | **缺** |
| chiefhouse | **缺** | ✔ | **缺** | ✔ |
| Altar | **缺** | ✔ | ✔ | ✔ |
| Wilds | **缺** | **缺** | **缺** | **缺** |
| Workshop | **缺** | ✔ | ✔ | **缺** |
| huntercabin | **缺** | ✔ | ✔ | ✔ |
| soranahouse | **缺** | ✔ | ✔ | ✔ |
| Grocery | **缺** | ✔ | ✔ | ✔ |
| Restaurant | **缺** | ✔ | ✔ | **缺** |

**合計：Dawn ×13、night ×3（Lakeside/Workshop/Restaurant）、Dusk ×1（chiefhouse）、
Wilds 全 4 張（要先請 GPT 畫日景）= 21 張**

## 各時段的光線描述（衍生時照抄）

| 時段 | 光 |
|---|---|
| `Dawn` | 清晨：**冷藍紫的天空底 ＋ 地平線一帶泛淡金**，光線低角度但**柔和不刺眼**；空氣帶薄霧與露水感；屋內燈**多半已熄**；人很少或沒有 |
| `Dusk` | 黃昏：暖橘金斜光、影子拉得很長、天空橙紫漸層；屋內開始點燈 |
| `night` | 深藍紫夜空、屋內透暖光、油燈提燈；**一個人都沒有**（連剪影都不要）；若畫月亮**必為銀色滿月** |

## 已清理

- `alter_*`（拼錯）與重複的 jpeg 已進回收區
- `_dd` → `_Dusk`（Altar／huntercabin／soranahouse）
- 今天誤改的 38 個 `_DD` 已全部改回 `_Dusk`

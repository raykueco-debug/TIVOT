# `resources/si/alpha/` —— Ray 的 SD／GPT 臉**投放夾**

> Ray（ver -1670 後）：「看來索可以用 SD 跑再 toon 掉，挺穩，我再選一些 gpt 臉的丟 alpha 資料夾」
> 「/alpha 裡的東西在工作完成後可以移到 origin，**但資料夾留著**」

Ray 把白底的新臉／新稿丟進這裡，美術 session 收進庫裡。

## ⚠⚠⚠ 資料夾**永遠留著**，只清內容

收完把**原 PNG 移進 `resources/_originals/si/`**（命名 `<交件鍵>_src.png`），
**不要把這個資料夾一起回收掉**（ver -1670 後犯過一次）。
內容有 `.gitignore` 擋著不會進版控 —— 這一份 README 是唯一入版控的檔，
它的工作就是讓這個資料夾在 clone 之後還在。

⚠ raw PNG **不可以留在這裡**：`resources/si/` 是會被遊戲載入的目錄（憲法 §5）。

## 交件流程

⚠⚠⚠ **第一件事不是去背，是逐像素量「他改了哪裡」** —— 這決定作法，而兩條路差很多：

| 他重畫的是 | 怎麼判 | 作法 |
|---|---|---|
| **臉／內部** | 改動像素落在 `α<200` 的**有 0 個** | **alpha 一個位元都不要動**，只換 RGB（混合靠 `w=clip((α−200)/55)`，不靠框） |
| **頭髮／輪廓** | 改動像素**碰得到**半透明區 | 跑 `tools/si_matting.py --backend toonout`，只取改動那一塊，其餘沿用現行 alpha |

⚠⚠ **不要因為「上一次這樣做」就照抄** —— 對沒動過的輪廓重解 alpha 是純粹的風險
（實測髮緣接縫帶會差到平均 6.7／最大 228）。

```bash
export HF_HUB_DISABLE_SYMLINKS=1 PYTHONIOENCODING=utf-8
.venv-matting/Scripts/python.exe tools/si_matting.py "resources/si/alpha/*.png" \
        --out resources/_originals/_matting_work/out --backend toonout
python resources/si/_sorana_check.py <交件檔…>      # 四項，唯一計算點
```

- 編碼：從 PNG 母版第一次壓 **q85**；**第二代**（身體是既有 webp 解碼再壓）用 **q92**
- 同名覆蓋要走 `tools/recycle.sh`，並在工單註明 `speakers.js` 要跳 `?v=`
- 細節與實測數字：`resources/si/_sorana_r3_worklist.md` §四（laugh）／§七（battlecry 六張）

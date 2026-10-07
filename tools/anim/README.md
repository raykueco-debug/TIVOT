# TIVOT 動檔工具（本機 Wan 2.2）

## 你自己用
1. 把**透明背景**的立繪／怪物圖（PNG 或 WebP）丟進 `in\`。
2. 雙擊：
   - `run.bat` —— **中彈**（人類敵人：正面中彈 → 跪倒，取 10 格，0.9 秒同時淡出）
   - `run_idle.bat` —— **待機循環**（怪物：起伏＋肢體怪異抽動，8fps）
3. 結果在 `out\<檔名>\`：`frame_XX.webp`（去背格圖）、`sheet.jpg`（總覽）、`preview.html`（播放）、`meta.json`。
   全部總覽：`out\index.html`。

一張約 3 分鐘（4070 SUPER）。ComfyUI 沒開的話工具會自己在背景開。

## 單張的設定（可選）
在 `in\` 放一個**同名的 .txt**：
```
一隻由蒼白枯枝般的手臂與燭台組成的怪物     ← 第一行起＝長相描述（塞進提示詞）
mode=idle                                    ← hit / idle
seed=12345                                   ← 不滿意就換 seed 重跑
fps=8                                        ← idle：16＝全格、8＝減半
frames=10                                    ← hit：取幾格
```

## 給 Claude 自動批量
```
..\.venv\Scripts\python.exe tivot_wan.py --files A.png B.png --mode idle --out D:\某處
```
每張的結果寫在 `meta.json`（格數、大小、seed、Wan 秒數、提示詞）。

## 已知
- 記憶體 16 GB 很吃緊：工具用 `--disable-smart-memory --cache-none` 啟動 ComfyUI；仍會掛的話加大分頁檔。
- 去閃動只修**整體**明暗／色調；局部閃動要換 seed 或加步數。
- idle 的循環接縫可能輕微跳一下（首尾差較大時換 seed）。

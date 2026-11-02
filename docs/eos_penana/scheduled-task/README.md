# 《永恆的原罪》讀者流監控：在另一台機器上跑

`SKILL.md` 是排程任務 `eos-penana-weekly` 的提示詞（本機正本在
`~/.claude/scheduled-tasks/eos-penana-weekly/SKILL.md`，這裡是版控副本；改了正本要再 copy 一次過來）。

快照與分析都在版控裡：`docs/eos_penana/`、`docs/eos_bahamut/`（`<日期>.csv` ＋ `analyze.py`）。

## 換機器的三步

1. `git pull`，拿到最新的快照（兩支 analyze.py 只比「最新 vs 上一份」，少了舊快照就只能從今天重新累積）。
2. 在那台機器的 Claude 桌面版建一個排程任務，內容貼 `SKILL.md` 的本文，
   **把裡面的 `/Users/rayku/Desktop/TIVOT/` 換成那台機器的專案根目錄**（Windows 上 `python3` 改 `py`）。
3. 在那台的 `.claude/settings.local.json`（不進版控）放行下面這幾條，不然排程會卡在 allow：
   - `Bash(<python> <根目錄>/docs/eos_penana/analyze.py)`、`Bash(<python> <根目錄>/docs/eos_bahamut/analyze.py)`
   - `Edit(/<根目錄>/docs/eos_penana/*.csv)`、`Edit(/<根目錄>/docs/eos_bahamut/*.csv)`
   - 內建瀏覽器開 penana.com 與 home.gamer.com.tw 的站台許可

⚠ 兩台不要同一天都跑：同一天的 CSV 會被兩邊各寫一份，pull 時衝突。換機器跑之前先 push 這台的快照。
⚠ 排程任務本身不會 commit；要讓另一台拿到新快照，跑完要有人 commit＋push `docs/eos_*`。

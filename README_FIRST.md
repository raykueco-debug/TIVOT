# 給操作者:如何把這個資料夾交給 Claude Code

1. 這整個資料夾就是專案根目錄。把它放到你電腦上。
2. 在此資料夾開啟終端機,執行 `git init`,再 `git add -A && git commit -m "init: reference + handoff"`。
   (先存一個初始版本,之後 Claude Code 改壞隨時可回。)
3. 在此資料夾啟動 Claude Code。它會自動讀 `CLAUDE.md` 當專案憲法。
4. 第一個指令建議這樣下(小步、可驗證,不要叫它一次重寫全部):

   > 讀 CLAUDE.md、SPEC.md、reference/index.html。先只做「開發順序」第 1 步:
   > 建目錄骨架 + index.html + style.css + config.js + state.js 的空殼契約,
   > 能用本地伺服器載入並顯示標題畫面即可。完成後停下讓我驗,再做下一步。

5. 每步完成、驗過手感,再 commit、再下一步。順序照 CLAUDE.md 第 6 節。

## 資料夾內容
- CLAUDE.md         專案憲法(鐵律、模組邊界、state 契約、函式歸屬、驗收)
- SPEC.md           行為規格
- reference/index.html   現行完整版,唯讀行為基準,永不修改
- resources/        已外置的圖片(依功能分目錄)

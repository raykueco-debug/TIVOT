---
name: eos-penana-weekly
description: 每天抓 Penana 與巴哈《永恆的原罪》逐篇閱讀快照（日追），週一出週報判斷短期爆發或長尾發酵（週結）
---

用繁體中文回報。目的：監控小說《永恆的原罪》（作者 AL＝Ray）在 Penana 與巴哈姆特小屋的逐篇讀者流向，作為投稿／IP 招商的數據。兩站幾乎同時連載、已完結。

節奏是「日追週結」（Ray 2026-10-25 定）：**每天**都抓快照（下面步驟 1–7）；**週一**才出完整週報，其餘日子只回一段簡短日報。
理由：每週一次的快照會把「幾天高峰、之後回落」平均成一個數字，2026-10-17～22 那一波（單日約 700～800、一天內慢慢增加，之後回到日增約 100）就是這樣被誤讀成「墊高一階」。

⛔⛔ 絕對不要點進任何一篇文章（Ray：「切記不要自己點進去污染數據」）。點進去就會 +1 閱讀／人氣，污染的正是要量的東西。
   只准開下面這兩個「列表頁」：Penana 的故事目錄頁（不加閱讀，Ray 確認過）、巴哈的小屋創作列表頁＋它背後的 creation_list API（只回列表資料）。
   不准 navigate／點擊／fetch 任何單篇網址（Penana 的 /story/199520/…/<篇>、巴哈的 home.gamer.com.tw/artwork.php?sn=…、creationDetail 之類），也不准為了「確認內容」開一篇來看。抓不到數字就回報抓不到，不要繞進單篇。

⚙ 免手動 allow 的寫法（專案 .claude/settings.local.json 已放行這些「確切形式」，換寫法就會跳 allow 卡住排程）：
   · 瀏覽器只用 preview_start / navigate / javascript_tool / tabs_context。
   · CSV 一律用 **Write 工具**寫（不要用 bash heredoc、echo、cat > 寫檔）。
   · analyze.py 一律照下面寫的**完整絕對路徑**單獨一行執行，不要加 cd、不要接 &&、管線或其他指令。
   · 自己的統計計算用 `python3 -`（stdin 餵程式），**單獨一個 Bash 呼叫**、不要接 cd 或其他指令；用絕對路徑讀檔。

【Penana】
1. 用內建瀏覽器（mcp__Claude_Browser__* 工具；Penana 會擋 curl）開啟
   https://www.penana.com/story/199520/%E6%B0%B8%E6%81%86%E7%9A%84%E5%8E%9F%E7%BD%AAii-%E7%81%BD%E5%8E%84%E4%B9%8B%E5%AD%90/
   記下故事頁頭那排總數（2026-10-25 是「407.9K 25 467 40.0K 21」，40.0K 是總閱讀數；它比逐篇加總固定多約 2.7K，推測是已刪除／重發篇章的舊數字，增量以逐篇加總為準）。
2. 在該分頁用 javascript_tool 執行：
   const t=document.body.innerText; const re=/#(\d+)\n([^\n]+)\n(\d+) 喜歡\n(\d+) 閱讀\n(\d+) 留言/g; let m,o=[]; while(m=re.exec(t)) o.push(m[1]+','+m[4]+','+m[3]+','+m[5]); o.join(';')
   結果是「idx,reads,likes,comments」以分號分隔。確認共 223 筆（2026-10-25 起多了 #223；篇數再變就回報，analyze.py 的章節對照可能要更新）。
   ⚠ idx 是 Penana 目錄流水號，不是章號：#1＝第一部簡介、#2–3＝第 1 章、#4–5＝第 2 章…（analyze.py 的 p1/p2 有對照）。
3. 寫成 /Users/rayku/Desktop/TIVOT/docs/eos_penana/<今天日期 YYYY-MM-DD>.csv，表頭 idx,reads,likes,comments（同一天已有檔就覆寫）。
4. 執行 python3 /Users/rayku/Desktop/TIVOT/docs/eos_penana/analyze.py。

【巴哈姆特】
5. 用內建瀏覽器開 https://home.gamer.com.tw/profile/index_creation.php?owner=AngeLucifer ，在該分頁用 javascript_tool 執行：
   let all=[];for(let p=1;p<=8;p++){const r=await fetch('https://api.gamer.com.tw/home/v2/creation_list.php?owner=AngeLucifer&page='+p+'&row=30',{credentials:'include'}).then(r=>r.json());all.push(...r.data.list)} all.sort((a,b)=>a.csn-b.csn); ({n:all.length, rows:all.map(x=>x.csn+','+x.category+','+x.visit+','+x.gp).join(';')})
   確認 n＝224（2026-10-25 起多了 csn 6419399，新資料夾 category 534130；篇數再變就回報）。
6. 寫成 /Users/rayku/Desktop/TIVOT/docs/eos_bahamut/<今天日期>.csv，表頭 csn,category,visit,gp，每筆一行（同一天已有檔就覆寫）。
7. 執行 python3 /Users/rayku/Desktop/TIVOT/docs/eos_bahamut/analyze.py。
   ⚠ 兩支 analyze.py 只比「最新 vs 上一份」。日增、週合計、逐日序列請自己用 python 讀所有快照算（按檔名日期，增量除以間隔天數；跨篇數變動時只比兩邊都有的篇）。

【日報（週二～週日，三到五行就好）】
- 兩站昨天→今天的增量（Penana 逐篇加總、巴哈人氣合計），與過去 7 天的日均比。
- 有異常才多講：單日超過約 300（Penana）／200（巴哈）＝可能又一波追讀潮；全部篇數都 +1；新留言／新喜歡／新 GP；篇數變了。
- 沒事就一句「平穩」。不要每天重寫整套分析。

【週報（週一）】
- 過去 7 天兩站的**逐日**增量序列（一天一列），週合計與日均。對照基準：Penana 10 月初每天約 80～230、10-17～22 追讀潮單日約 700～800、10-23 起回到約 100；巴哈 Ray 估每天 60～120（10-20→25 實測約 81）。
- ⭐ 主問題：短期爆發還是長尾發酵？
  · 基礎流量（扣掉尖峰日）是持平、上升還是下滑。
  · 這週有沒有尖峰日；有的話持續幾天、多高、回落多快。
  · Penana 第 1 章（#2–3）的每日／每週增量：持續有新人進來＝持續流入。
  · 「全部篇數都至少 +1」的區間有沒有出現（＝有人整本讀完，或爬蟲）。分辨法：真人讀者的增量會從前面章節往後推進、前段多後段略少；爬蟲是短時間全書一起加、各段一樣多。
  · 兩站是否同步起落（同步＝可能有共同外部來源；只有一站動＝那一站站內曝光，例如 10 月那一波只有 Penana 動）。
- 讀者落在哪幾段、增量最多的幾篇、新留言／新喜歡／新 GP。
⚠ 單篇增量只有個位數，是雜訊——只拿段落平均與前幾名下結論；數據不足時直說。
⚠ 留存的解讀：兩站同時連載。巴哈讀者多跟著新篇讀（累計曲線平＝追更讀者七個月幾乎不流失）；Penana 讀者多從頭補讀（第 1 章篩選，以第 2 章為分母約四成讀完全書；10 月追讀潮那批約七成）。兩站都是高留存，不要用巴哈的平線說它量不出東西。
⚠ 第一部追憶篇（11–24 章）是作者刻意設計、反響最深的段落，不要當成待修的低谷。
⚠ 第二部 Ch 28（上）（csn 6322787）在巴哈被放進第一部資料夾，analyze.py 已自動歸位；若 Ray 已移回也不影響。
8. 不要 git commit，不要改其他檔案。
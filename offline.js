/* ══ 離線包：註冊 sw.js ＋「下載全部素材」（ver -2256／-2842；-3078 改成真正的離線版）══
   ver -2842（Ray：「首頁要放一個下載鈕，讓遊戲可以完全在本機運行不連網」）：
   · 入口是**首頁的「離線下載」鈕**（選單裡那一顆保留，兩顆走同一支 click）。
   · ⚠⚠ **打包成 App（Capacitor）時整支不跑**（鐵律 12）—— App 的素材本來就在安裝包裡。
   · localhost 不註冊（開發機不要被快取干擾），除非網址帶 ?offline。
   · 清單＝offline_list.json（tools/bust.py 每版重產）；中斷了再按會接著下。
   · 下載期間螢幕不要鎖（iOS 鎖螢幕會把頁面凍住），中斷了重按即可續傳。

   ver -3078（Ray：「下載後要變快、要自動變成離線版」，調查見 docs/OFFLINE_WEB_FINDINGS.md 第三節）：
   · ⚠⚠ **完成旗標寫進快取**（`__offline_ready__`，內容＝版本號）—— sw.js 讀得到它，看到就切成「快取優先」。
     localStorage 那一份只剩按鈕文字在用（SW 讀不到 localStorage，這正是以前「下載了也沒變快」的原因之一）。
   · **更新只重抓內容雜湊變了的檔**：清單帶 `hash`（與 files 同順序），已存的雜湊記在 `__offline_hashes__`。
     以前「素材已在快取就跳過」，同名覆蓋的圖會一直是舊的。
   · **存之前看 Content-Type**：Cloudflare Pages 缺檔會回 200＋首頁 HTML，不准把 HTML 存成素材。
   · **開啟時自我檢查**：有完成旗標就抽查幾支關鍵檔，缺了就把旗標拔掉（退回網路優先）、按鈕回到「離線下載」；
     有網路就順手查新版本，有就把按鈕改成「有新版本 · 更新」。
   · **iPhone**：主畫面 App 與 Safari 分頁的儲存是分開的 —— 在 Safari 分頁按下去先提示「加到主畫面」。

   ver -3101（Ray：「iPhone 邊下載邊玩燙到可以煎蛋」「下載才是主因 修這個」）：
   · **讓位**：首頁 4 條、遊戲畫面 1 條、切背景全停（判定只有 `inGame()` 一支）。
   · **一定載得完**：切背景／斷網時失敗不算數、回來接著抓同一支；其他失敗重試兩次，最後再補一輪。
     開始時記 `tivot_offline_want_v1`，完成才拔 —— App 被關掉，下次開啟自動續傳（已存且雜湊對得上的跳過）。
   · **少寫**：雜湊表 30 秒／切背景／關頁才寫；驗收每批 40 支逐支問，不一次 `cache.keys()`。
   · sw.js 同版：影片 Range 用 Blob 切片；平常取檔不再順手寫快取（下載中每檔寫兩次的原因）。 */
(function(){
  const CACHE = 'tivot-offline-v1';
  const DONE_KEY = 'tivot_offline_done_v1';
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if(native) return;
  const q = location.search.indexOf('offline') >= 0;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if(!('serviceWorker' in navigator) || !('caches' in window)) return;
  if(local && !q) return;
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('[offline] sw 註冊失敗', e));

  /* 介面字譯文（ver -2582）：classic script 拿不到 i18nT 的 import —— 呼叫當下才問 i18n/scriptTr.js 掛上的全域那一支。 */
  const T = s => (window.i18nT ? window.i18nT(s) : s);
  const keyOf = p => { const u = new URL(p, location.href); u.search = ''; u.hash = ''; return u.href; };
  /* 兩筆中繼資料的鑰匙：sw.js 用同一套算法（scope 底下的同名路徑），改一邊要改另一邊。 */
  const READY = keyOf('__offline_ready__'), HASHES = keyOf('__offline_hashes__');
  const CHECK = ['index.html', 'main.js', 'config.js', 'style.css', 'offline.js'];   // 開啟時抽查的關鍵檔
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  let busy = false;
  let updAvail = null;       // 背景查到的新版本號（有＝按鈕顯示「有新版本」）
  let lastSay = '';          // 下載中最新的一句（ver -3102：選單打開就看得到進度）

  function doneVer(){ try{ return localStorage.getItem(DONE_KEY); }catch(_){ return null; } }
  function setDone(v){ try{ v ? localStorage.setItem(DONE_KEY, v) : localStorage.removeItem(DONE_KEY); }catch(_){} }
  function label(){
    if(busy && lastSay) return lastSay;
    if(updAvail) return T('有新版本 · 更新');
    return doneVer() ? T('✓ 已可離線 · 檢查更新') : T('離線下載');
  }
  /* 下載狀態同時印在首頁與選單兩顆鈕上（ver -3102，Ray：遊戲內也要看得到下載到哪）——
     不管是哪一顆按下去的，兩顆都跟著跑；選單是開著才有那一顆。 */
  const BTN_IDS = ['offlineBtn', 'gmOffline'];
  function broadcast(t){ lastSay = t; BTN_IDS.forEach(id => { const b = document.getElementById(id); if(b) b.textContent = t; }); }
  const mb = n => { const m = n / 1048576; return m >= 1024 ? (m / 1024).toFixed(1) + ' GB' : Math.round(m) + ' MB'; };
  function relabel(){ const b = document.getElementById('offlineBtn'); if(b && !busy) b.textContent = label(); }
  function tellSW(){ try{ navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type:'offline-ready-changed' }); }catch(_){} }
  async function readyVer(cache){ const r = await cache.match(READY); return r ? await r.text() : null; }
  async function fetchList(){
    return (await fetch('offline_list.json?t=' + Date.now(), { cache: 'no-store' })).json();
  }
  /* 首頁與選單共用的那一支（鐵律 8）：
     ver -3102（Ray）：**按一下就開始** —— 讀當下的清單、看剩餘空間，字樣寫這一次的大小（「開始下載 · 約 695 MB」）就直接下。
     以前要按兩下（第一下只報大小），按一下就進遊戲的人其實根本沒開始。下載中再按不做事。 */
  async function click(say){
    if(busy) return;
    if(ios && !standalone){
      const msg = T('iPhone 要先「加入主畫面」：Safari 下方的分享鈕 → 加入主畫面，再從主畫面的圖示打開，才能下載');
      say(T('請先「加入主畫面」再下載'));
      try{ window.alert(msg); }catch(_){}   // Safari 分頁的下載存不進主畫面 App —— 按鈕字太小容易沒看到，跳一次提示框
      return;
    }
    say(T('讀取清單…'));
    let list;
    try{ list = await fetchList(); }catch(_){ say(T('讀不到清單 · 需要網路')); return; }
    let free = null;
    try{
      if(navigator.storage && navigator.storage.estimate){
        const e = await navigator.storage.estimate();
        if(e && e.quota) free = e.quota - (e.usage || 0);
      }
    }catch(_){}
    if(free !== null && free < list.bytes){
      say(T('空間不足：需要 {need}，只剩 {free}').replace('{need}', mb(list.bytes)).replace('{free}', mb(free)));
      return;
    }
    const upd = doneVer() && doneVer() !== list.version;
    const first = (upd ? T('開始更新 · 約 {n}') : T('開始下載 · 約 {n}')).replace('{n}', mb(list.bytes));
    say(first); broadcast(first);
    return run(say, list);
  }
  /* 統計（ver -3091）：這一支是非 module，import 不到遙測 —— 發事件，main.js 收了轉給 TEL.offline。 */
  function tell(phase, ms){ try{ window.dispatchEvent(new CustomEvent('tivot-offline', { detail:{ phase, ms } })); }catch(_){} }
  /* ══ 下載讓位（ver -3101，Ray：「iPhone 邊下載邊玩燙到可以煎蛋」「下載才是主因 修這個」）══
     「現在在不在遊戲畫面」**只有這一支在判**（鐵律 8）：首頁亮著、而且劇情舞台與飛行頁都沒開＝在首頁（選單蓋在首頁上也算）。
     首頁 4 條（原本 6 條）、遊戲中 1 條；切到背景（iOS 鎖螢幕／切 App）＝全停，回來接著下。 */
  const CONC_HOME = 4, CONC_GAME = 1;
  function inGame(){
    const h = document.getElementById('home');
    if(!h || !h.classList.contains('on')) return true;
    const st = document.getElementById('storyStage'); if(st && st.classList.contains('on')) return true;
    const f = document.getElementById('flightFrame'); if(f && f.classList.contains('on')) return true;
    return false;
  }
  const lanes = () => document.hidden ? 0 : (inGame() ? CONC_GAME : CONC_HOME);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const offline = () => navigator.onLine === false;
  /* 自動續傳（ver -3101）：開始下載就記下「想要這一版」，完成才拔 —— 中途關掉 App、被 iOS 收掉，下次開啟自己接著下（selfCheck）。 */
  const WANT_KEY = 'tivot_offline_want_v1';
  const want = v => { try{ v ? localStorage.setItem(WANT_KEY, v) : localStorage.removeItem(WANT_KEY); }catch(_){} };
  const wanted = () => { try{ return localStorage.getItem(WANT_KEY); }catch(_){ return null; } };
  async function run(say0, list){
    if(busy) return; busy = true;
    const say = t => { try{ say0(t); }catch(_){} broadcast(t); };   // 按下去的那顆＋另一顆一起更新（ver -3102）
    let stopSave = null;
    try{
      if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
      if(!list){ say(T('讀取清單…')); list = await fetchList(); }
      want(list.version);
      const cache = await caches.open(CACHE);
      const files = list.files.slice(), hs = Array.isArray(list.hash) ? list.hash : null;
      if(files.indexOf('index.html') < 0){ files.unshift('index.html'); if(hs) hs.unshift(''); }
      const allF = files.slice(), allH = hs ? hs.slice() : null;   // 驗收一律驗整份（補抓那一輪會把 files 換成子集）
      let stored = {}; { const r = await cache.match(HASHES); if(r){ try{ stored = await r.json(); }catch(_){} } }
      /* 舊版下載（-3078 以前）沒有雜湊紀錄：素材已在快取就沿用、記下這一版的雜湊（不要逼 iPhone 重下 1.5 GB）。 */
      const legacy = !Object.keys(stored).length;
      const fresh = doneVer() !== list.version;
      /* 雜湊表＝續傳的依據（已存且雜湊對得上就跳過）。⚠ 低頻寫（ver -3101）：以前每 200 檔整份序列化寫回一次；
         改成 30 秒一次、切背景／關頁時補一次、結束時一次 —— 有改動（dirty）才寫。 */
      let dirty = false;
      const saveHashes = () => { if(!dirty) return Promise.resolve(); dirty = false;
        return cache.put(HASHES, new Response(JSON.stringify(stored), { headers:{ 'Content-Type':'application/json' } })).catch(()=>{ dirty = true; }); };
      const iv = setInterval(saveHashes, 30000);
      const onHide = () => { if(document.hidden) saveHashes(); };
      document.addEventListener('visibilitychange', onHide); addEventListener('pagehide', saveHashes);
      stopSave = () => { clearInterval(iv); document.removeEventListener('visibilitychange', onHide); removeEventListener('pagehide', saveHashes); };
      let i = 0, ok = 0, fail = 0, skip = 0, failed = [];
      let got = 0;   // 這一輪真的新抓了幾支（跨補抓／驗收那幾輪都算；ok 每輪會歸零）—— 統計只在 >0 時報時間（ver -3104）
      const t0 = Date.now();
      tell('start');
      const progress = () => { const n = ok + fail + skip;
        if(n % 10 === 0 || n === files.length)
          say(T('下載中 {p}%（{n}/{all}{fail}）').replace('{p}', Math.floor(n / files.length * 100)).replace('{n}', n).replace('{all}', files.length).replace('{fail}', fail ? T('，失敗 ') + fail : '')); };
      /* 一支檔：切背景／斷網時失敗不算數 —— 等回來再抓同一支；其他錯誤重試兩次才算失敗。 */
      const getOne = async (f, k, h) => {
        for(let tries = 0; ; ){
          try{
            const res = await fetch(f, { cache: 'no-cache' });
            if(!res.ok) throw new Error(res.status);
            const ct = res.headers.get('Content-Type') || '';
            if(/text\/html/i.test(ct) && !/\.html$/i.test(f)) throw new Error('拿到 HTML（缺檔）');
            await cache.put(k, res);
            if(h){ stored[f] = h; dirty = true; }
            return true;
          }catch(e){
            if(document.hidden || offline()){ while(document.hidden || offline()) await sleep(1000); continue; }
            if(++tries > 2){ console.warn('[offline] 失敗', f, e); return false; }
            await sleep(2000);
          }
        }
      };
      const worker = async (lane) => {
        while(i < files.length){
          while(lane >= lanes() && i < files.length) await sleep(800);   // 讓位：遊戲中只留第 0 條、背景全停
          /* ⚠ ver -3102：等待時也要看「還有沒有檔」—— -3101 只看條數，遊戲中第 1～3 條會一直等到回首頁，
             整輪收不了尾（實測停在 100% 不顯示完成）。 */
          if(i >= files.length) break;
          const n0 = i++, f = files[n0], h = hs ? hs[n0] : '';
          const k = keyOf(f);
          const code = /\.(js|html|css|json|webmanifest)$/i.test(f);
          let have = null; try{ have = await cache.match(k); }catch(_){}
          const same = h ? (stored[f] === h || (legacy && !code)) : !(fresh && code);
          if(have && same){ if(h && stored[f] !== h){ stored[f] = h; dirty = true; } skip++; }
          else if(await getOne(f, k, h)){ ok++; got++; }
          else { fail++; failed.push(n0); }
          progress();
        }
      };
      const pass = () => Promise.all(Array.from({ length: CONC_HOME }, (_, lane) => worker(lane)));
      await pass();
      /* 失敗的那幾支再補一輪（ver -3101）：不必等人按「重試」。 */
      if(failed.length){
        const again = failed.slice(); failed = [];
        files.splice(0, files.length, ...again.map(n => files[n]));
        if(hs) hs.splice(0, hs.length, ...again.map(n => hs[n]));
        i = 0; fail = 0; await sleep(3000); await pass();
      }
      /* 驗收（ver -3078 實測：一次報完成卻有一整段沒進快取）：逐支問快取，缺的補抓一輪；仍缺就算失敗、不寫完成旗標。
         ⚠ ver -3101：不再一次 `cache.keys()` 掃到底（七千多筆一次撈出來是個尖峰）—— 每批 40 支、批與批之間讓一拍，
         遊戲中照樣讓位。 */
      if(!fail){
        const miss = [];
        for(let s = 0; s < allF.length; s += 40){
          while(lanes() === 0) await sleep(800);
          const part = await Promise.all(allF.slice(s, s + 40).map(f => cache.match(keyOf(f)).catch(()=>null)));
          part.forEach((r, j) => { if(!r) miss.push(s + j); });
          await sleep(inGame() ? 50 : 0);
        }
        if(miss.length){
          console.warn('[offline] 驗收缺', miss.length, '支，補抓');
          files.splice(0, files.length, ...miss.map(n => allF[n]));
          if(hs) hs.splice(0, hs.length, ...miss.map(n => allH[n]));
          for(const f of files){ delete stored[f]; } dirty = true;
          i = 0; ok = 0; skip = 0; failed = [];
          await pass();
        }
      }
      await saveHashes();
      if(fail){ say(T('失敗 {n} 個 · 點一下重試').replace('{n}', fail)); tell('fail'); }
      else{
        await cache.put(READY, new Response(list.version, { headers:{ 'Content-Type':'text/plain' } }));
        setDone(list.version); updAvail = null; tellSW(); want(null);
        /* ver -3104（Ray：「連0秒一起解決」）：秒數只是「這一輪」的時間 —— 續傳／檢查更新那一輪全部跳過就是 0 秒，
           讀起來像沒下載。字樣不寫秒數；統計只在這一輪真的有新抓時才報 time_ms（全部跳過＝0 ⇒ TEL.offline 不帶時間）。 */
        tell('done', got > 0 ? Date.now() - t0 : 0);
        say(T('✓ 完成 · 斷網也能玩'));
      }
    }catch(e){
      say(T('下載中斷 · 點一下重試')); tell('fail');
    }finally{ busy = false; if(stopSave) stopSave(); }
  }
  /* 開啟時自我檢查＋背景查更新（ver -3078）。 */
  async function selfCheck(){
    try{
      const cache = await caches.open(CACHE);
      const rv = await readyVer(cache);
      /* 自動續傳（ver -3101）：上次按了下載、還沒完成就被關掉／收掉 ⇒ 這次開啟自己接著下（已存的跳過）。 */
      const w = wanted();
      if(w && w !== rv && !busy && navigator.onLine !== false && !(ios && !standalone)){
        if(rv === null && doneVer()) setDone(null);
        const sayBtn = t => { const b = document.getElementById('offlineBtn'); if(b) b.textContent = t; };
        run(sayBtn, null); return;
      }
      if(!rv){ if(doneVer()){ setDone(null); relabel(); } return; }
      for(const f of CHECK){
        if(!(await cache.match(keyOf(f)))){
          console.warn('[offline] 自我檢查：缺', f, '—— 退回網路優先');
          await cache.delete(READY); setDone(null); tellSW(); relabel(); return;
        }
      }
      if(doneVer() !== rv){ setDone(rv); relabel(); }
      if(navigator.onLine === false) return;
      const list = await fetchList().catch(()=>null);
      if(list && list.version && list.version !== rv){ updAvail = list.version; relabel(); }
    }catch(e){ console.warn('[offline] 自我檢查失敗', e); }
  }
  setTimeout(selfCheck, 1500);
  window.__tivotOffline = { label, click, run, busy: () => busy };
})();

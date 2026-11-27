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
   · **iPhone**：主畫面 App 與 Safari 分頁的儲存是分開的 —— 在 Safari 分頁按下去先提示「加到主畫面」。 */
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
  const gb = n => (n / 1e9).toFixed(1) + ' GB';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  let busy = false;
  let armed = null;          // 第一下讀到的清單；第二下才真的開始下載
  let updAvail = null;       // 背景查到的新版本號（有＝按鈕顯示「有新版本」）

  function doneVer(){ try{ return localStorage.getItem(DONE_KEY); }catch(_){ return null; } }
  function setDone(v){ try{ v ? localStorage.setItem(DONE_KEY, v) : localStorage.removeItem(DONE_KEY); }catch(_){} }
  function label(){
    if(updAvail) return T('有新版本 · 更新');
    return doneVer() ? T('✓ 已可離線 · 檢查更新') : T('離線下載');
  }
  function relabel(){ const b = document.getElementById('offlineBtn'); if(b && !busy) b.textContent = label(); }
  function tellSW(){ try{ navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type:'offline-ready-changed' }); }catch(_){} }
  async function readyVer(cache){ const r = await cache.match(READY); return r ? await r.text() : null; }
  async function fetchList(){
    return (await fetch('offline_list.json?t=' + Date.now(), { cache: 'no-store' })).json();
  }
  /* 首頁與選單共用的那一支（鐵律 8）：
     第一下 → 讀清單、報大小與剩餘空間；第二下 → 開始下載。下載中再按不做事。 */
  async function click(say){
    if(busy) return;
    if(ios && !standalone){ say(T('請先「加到主畫面」，從主畫面打開再下載')); return; }
    if(armed){ const list = armed; armed = null; return run(say, list); }
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
      say(T('空間不足：需要 {need}，只剩 {free}').replace('{need}', gb(list.bytes)).replace('{free}', gb(free)));
      return;
    }
    armed = list;
    const upd = doneVer() && doneVer() !== list.version;
    say((upd ? T('有更新 · 約 {n} · 再按一次開始') : T('下載約 {n} · 再按一次開始')).replace('{n}', gb(list.bytes)));
  }
  /* 統計（ver -3091）：這一支是非 module，import 不到遙測 —— 發事件，main.js 收了轉給 TEL.offline。 */
  function tell(phase, ms){ try{ window.dispatchEvent(new CustomEvent('tivot-offline', { detail:{ phase, ms } })); }catch(_){} }
  async function run(say, list){
    if(busy) return; busy = true;
    try{
      if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
      if(!list){ say(T('讀取清單…')); list = await fetchList(); }
      const cache = await caches.open(CACHE);
      const files = list.files.slice(), hs = Array.isArray(list.hash) ? list.hash : null;
      if(files.indexOf('index.html') < 0){ files.unshift('index.html'); if(hs) hs.unshift(''); }
      let stored = {}; { const r = await cache.match(HASHES); if(r){ try{ stored = await r.json(); }catch(_){} } }
      /* 舊版下載（-3078 以前）沒有雜湊紀錄：素材已在快取就沿用、記下這一版的雜湊（不要逼 iPhone 重下 1.5 GB）。 */
      const legacy = !Object.keys(stored).length;
      const fresh = doneVer() !== list.version;
      const saveHashes = () => cache.put(HASHES, new Response(JSON.stringify(stored), { headers:{ 'Content-Type':'application/json' } })).catch(()=>{});
      let i = 0, ok = 0, fail = 0, skip = 0;
      const t0 = Date.now();
      tell('start');
      const worker = async () => {
        while(i < files.length){
          const n0 = i++, f = files[n0], h = hs ? hs[n0] : '';
          const k = keyOf(f);
          try{
            const code = /\.(js|html|css|json|webmanifest)$/i.test(f);
            const have = await cache.match(k);
            const same = h ? (stored[f] === h || (legacy && !code)) : !(fresh && code);
            if(have && same){ if(h) stored[f] = h; skip++; continue; }
            const res = await fetch(f, { cache: 'no-cache' });
            if(!res.ok) throw new Error(res.status);
            const ct = res.headers.get('Content-Type') || '';
            if(/text\/html/i.test(ct) && !/\.html$/i.test(f)) throw new Error('拿到 HTML（缺檔）');
            await cache.put(k, res);
            if(h) stored[f] = h;
            ok++;
            if(ok % 200 === 0) saveHashes();
          }catch(e){ fail++; console.warn('[offline] 失敗', f, e); }
          const n = ok + fail + skip;
          if(n % 10 === 0 || n === files.length)
            say(T('下載中 {p}%（{n}/{all}{fail}）').replace('{p}', Math.floor(n / files.length * 100)).replace('{n}', n).replace('{all}', files.length).replace('{fail}', fail ? T('，失敗 ') + fail : ''));
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      /* 驗收（ver -3078 實測：一次報完成卻有一整段沒進快取）：照快取實際有的鑰匙比一次，缺的補抓一輪；
         仍缺就算失敗、不寫完成旗標 —— 「報完成其實缺檔」比「再按一次」糟得多。 */
      if(!fail){
        const have = new Set((await cache.keys()).map(r => r.url));
        const miss = files.map((f, n) => n).filter(n => !have.has(keyOf(files[n])));
        if(miss.length){
          console.warn('[offline] 驗收缺', miss.length, '支，補抓');
          files.splice(0, files.length, ...miss.map(n => files[n]));
          if(hs) hs.splice(0, hs.length, ...miss.map(n => hs[n]));
          for(const f of files) delete stored[f];
          i = 0; ok = 0; skip = 0;
          await Promise.all(Array.from({ length: 6 }, worker));
          const have2 = new Set((await cache.keys()).map(r => r.url));
          fail += files.filter(f => !have2.has(keyOf(f))).length;
        }
      }
      await saveHashes();
      if(fail){ say(T('失敗 {n} 個 · 點一下重試').replace('{n}', fail)); tell('fail'); }
      else{
        await cache.put(READY, new Response(list.version, { headers:{ 'Content-Type':'text/plain' } }));
        setDone(list.version); updAvail = null; tellSW();
        tell('done', Date.now() - t0);
        say(T('✓ 完成（{n} 秒）· 斷網也能玩').replace('{n}', Math.round((Date.now() - t0) / 1000)));
      }
    }catch(e){
      say(T('下載中斷 · 點一下重試')); tell('fail');
    }finally{ busy = false; }
  }
  /* 開啟時自我檢查＋背景查更新（ver -3078）。 */
  async function selfCheck(){
    try{
      const cache = await caches.open(CACHE);
      const rv = await readyVer(cache);
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

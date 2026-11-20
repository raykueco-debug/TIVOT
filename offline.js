/* ══ 離線包：註冊 sw.js ＋「下載全部素材」（ver -2256／-2842）══
   ver -2842（Ray：「首頁要放一個下載鈕，讓遊戲可以完全在本機運行不連網」）：
   · 入口改成**首頁的「離線下載」鈕**（選單裡那一顆保留，兩顆走同一支 click）。
   · **任何瀏覽器分頁都提供**，不再限主畫面 App（standalone）。
     ⚠ iOS 的主畫面 App 與 Safari 分頁**各有各的儲存空間**：在哪裡下載就只在哪裡有效。
   · ⚠⚠ **打包成 App（Capacitor）時整支不跑**（鐵律 12：最終成品是上架的 App）——
     App 的素材本來就在安裝包裡，而且 WKWebView 的 capacitor:// 不支援 service worker。
     判斷只看 `Capacitor.isNativePlatform()`，鈕自己就不會出現。
   · localhost 不註冊（開發機不要被快取干擾），除非網址帶 ?offline。
   · 清單＝offline_list.json（tools/bust.py 每版重產）；已經在快取裡的跳過 ⇒ 中斷了再按會接著下。
   · 存進 sw.js 同一個 cache、同一套鑰匙（拿掉 ?v=）。
   · 下載期間螢幕不要鎖（iOS 鎖螢幕會把頁面凍住），中斷了重按即可續傳。 */
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
  const gb = n => (n / 1e9).toFixed(1) + ' GB';
  let busy = false;
  let armed = null;          // 第一下讀到的清單；第二下才真的開始下載

  function doneVer(){ try{ return localStorage.getItem(DONE_KEY); }catch(_){ return null; } }
  function label(){
    return doneVer() ? T('✓ 已可離線 · 檢查更新') : T('離線下載');
  }
  async function fetchList(){
    return (await fetch('offline_list.json?t=' + Date.now(), { cache: 'no-store' })).json();
  }
  /* 首頁與選單共用的那一支（鐵律 8）：
     第一下 → 讀清單、報大小與剩餘空間；第二下 → 開始下載。下載中再按不做事。 */
  async function click(say){
    if(busy) return;
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
  async function run(say, list){
    if(busy) return; busy = true;
    try{
      if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
      if(!list){ say(T('讀取清單…')); list = await fetchList(); }
      const cache = await caches.open(CACHE);
      const files = list.files.slice();
      if(files.indexOf('index.html') < 0) files.unshift('index.html');
      // 版本換了：程式與清單類的小檔一律重抓（素材多半沒變，照舊跳過已有的）
      const fresh = doneVer() !== list.version;
      let i = 0, ok = 0, fail = 0, skip = 0;
      const t0 = Date.now();
      const worker = async () => {
        while(i < files.length){
          const f = files[i++];
          const k = keyOf(f);
          try{
            const code = /\.(js|html|css|json|webmanifest)$/i.test(f);
            if(!(fresh && code) && await cache.match(k)){ skip++; continue; }
            const res = await fetch(f, { cache: 'no-cache' });
            if(!res.ok) throw new Error(res.status);
            await cache.put(k, res);
            ok++;
          }catch(e){ fail++; console.warn('[offline] 失敗', f, e); }
          const n = ok + fail + skip;
          if(n % 10 === 0 || n === files.length)
            say(T('下載中 {p}%（{n}/{all}{fail}）').replace('{p}', Math.floor(n / files.length * 100)).replace('{n}', n).replace('{all}', files.length).replace('{fail}', fail ? T('，失敗 ') + fail : ''));
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if(fail) say(T('失敗 {n} 個 · 點一下重試').replace('{n}', fail));
      else{
        try{ localStorage.setItem(DONE_KEY, list.version); }catch(_){}
        say(T('✓ 完成（{n} 秒）· 斷網也能玩').replace('{n}', Math.round((Date.now() - t0) / 1000)));
      }
    }catch(e){
      say(T('下載中斷 · 點一下重試'));
    }finally{ busy = false; }
  }
  window.__tivotOffline = { label, click, run, busy: () => busy };
})();

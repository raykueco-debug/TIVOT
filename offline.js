/* ══ 離線包：註冊 sw.js ＋「下載全部素材」（ver -2256）══
   只在**主畫面 App**（standalone）裡出現下載鈕 —— iOS 的主畫面 App 與 Safari 分頁
   **各有各的儲存空間**，在 Safari 裡下載的東西主畫面那個 App 看不到。
   網址帶 ?offline 也會出現（桌機測試用）。localhost 不註冊（開發機不要被快取干擾），
   除非帶 ?offline。
   · 清單＝offline_list.json（tools/offline_list.py 產生）；已經在快取裡的跳過 ⇒ 中斷了再按會接著下。
   · 存進 sw.js 同一個 cache、同一套鑰匙（拿掉 ?v=）。
   · 下載期間螢幕不要鎖（iOS 鎖螢幕會把頁面凍住），中斷了重按即可續傳。 */
(function(){
  const CACHE = 'tivot-offline-v1';
  const DONE_KEY = 'tivot_offline_done_v1';
  const q = location.search.indexOf('offline') >= 0;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if(!('serviceWorker' in navigator) || !('caches' in window)) return;
  if(local && !q) return;
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('[offline] sw 註冊失敗', e));
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if(!standalone && !q) return;

  const keyOf = p => { const u = new URL(p, location.href); u.search = ''; u.hash = ''; return u.href; };
  let btn, busy = false;
  function ui(){
    btn = document.createElement('button');
    btn.id = 'offlineBtn';
    btn.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 6px);'
      + 'z-index:2147483000;padding:6px 12px;border-radius:14px;border:1px solid #b8933f;background:rgba(10,8,14,.92);'
      + 'color:#e8c76a;font:12px/1.3 sans-serif;letter-spacing:1px;max-width:92vw;';
    btn.onclick = run;
    document.body.appendChild(btn);
    refresh();
  }
  async function refresh(){
    let done = null; try{ done = localStorage.getItem(DONE_KEY); }catch(_){}
    btn.textContent = done ? '✓ 離線包已就緒（點擊檢查更新）' : '⬇ 下載離線包（約 1.6 GB，需 Wi‑Fi）';
  }
  async function run(){
    if(busy) return; busy = true;
    try{
      if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
      btn.textContent = '讀取清單…';
      const list = await (await fetch('offline_list.json?t=' + Date.now(), { cache: 'no-store' })).json();
      const cache = await caches.open(CACHE);
      const files = list.files.slice();
      if(files.indexOf('index.html') < 0) files.unshift('index.html');
      let i = 0, ok = 0, fail = 0, skip = 0;
      const t0 = Date.now();
      const worker = async () => {
        while(i < files.length){
          const f = files[i++];
          const k = keyOf(f);
          try{
            if(await cache.match(k)){ skip++; continue; }
            const res = await fetch(f, { cache: 'no-cache' });
            if(!res.ok) throw new Error(res.status);
            await cache.put(k, res);
            ok++;
          }catch(e){ fail++; console.warn('[offline] 失敗', f, e); }
          const n = ok + fail + skip;
          if(n % 10 === 0 || n === files.length){
            const pct = Math.floor(n / files.length * 100);
            btn.textContent = `下載中 ${pct}%（${n}/${files.length}${fail ? '，失敗 ' + fail : ''}）螢幕不要鎖`;
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if(fail){
        btn.textContent = `有 ${fail} 個檔失敗 —— 點一下重試（已下載的會跳過）`;
      }else{
        try{ localStorage.setItem(DONE_KEY, list.version); }catch(_){}
        btn.textContent = `✓ 離線包完成（${list.version}，${Math.round((Date.now() - t0) / 1000)} 秒）`;
        setTimeout(refresh, 6000);
      }
    }catch(e){
      btn.textContent = '下載中斷（' + (e && e.message || e) + '）—— 點一下重試';
    }finally{ busy = false; }
  }
  if(document.body) ui(); else addEventListener('DOMContentLoaded', ui);
})();

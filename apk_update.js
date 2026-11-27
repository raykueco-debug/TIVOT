/* ══ Android 安裝版（Capacitor）的版本自檢（ver -3135，Ray：「andriod版也要可以自檢更新」）══
   · App 的素材在安裝檔裡，網頁那套離線更新（offline.js）在 App 裡整支不跑 —— 這一支補上 App 的那一半：
     開機抓一次網頁版根目錄的 apk_latest.json（{ver,url,note}），比本機版號，較新就提示「前往下載」，
     點了交給系統瀏覽器開 itch 頁，由玩家自己下載安裝（不自動下載、不自動安裝）。
   · 只在 Capacitor 原生環境跑；網頁版直接 return（那邊是 offline.js 的事）。
   · 介面沿用 offline.js 那一格：掛同一個 window.__tivotOffline（label／click），
     首頁 #offlineBtn 與選單 #gmOffline 就是同兩顆鈕；首頁那顆只在「有新版」時才留著。
   · 版本判定只在這裡一處（verNum：取版號最後一段數字，數字比，不是字串比）。
   · apk_latest.json 由 release/itch_push.ps1 在「簽好且上傳 itch 成功」後才寫，打包網頁時一起部署
     （tools/release/build_demo.mjs）；跨網域讀，所以 dist 裡的 _headers 給它開 CORS。 */
(function(){
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if(!native) return;
  const URL_LATEST = 'https://tivot-demo.pages.dev/apk_latest.json';
  const ITCH = 'https://alworks.itch.io/saint-install';
  const T = s => (window.i18nT ? window.i18nT(s) : s);
  const verNum = v => { const m = String(v || '').match(/(\d+)\s*$/); return m ? +m[1] : 0; };
  let localVer = '', latest = null, state = 'idle';   // idle | checking | newer | latest | fail

  function label(){
    const lv = localVer ? ' v' + verNum(localVer) : '';
    if(state === 'checking') return T('檢查更新中…');
    if(state === 'newer') return T('有新版本') + ' v' + verNum(latest.ver) + T(' · 前往下載');
    if(state === 'latest') return T('✓ 已是最新版') + lv;
    if(state === 'fail') return T('無法檢查更新') + lv + T(' · 再試一次');
    return T('檢查更新') + lv;
  }
  const BTN_IDS = ['offlineBtn', 'gmOffline'];
  function paint(){
    BTN_IDS.forEach(id => { const b = document.getElementById(id); if(b) b.textContent = label(); });
    const home = document.getElementById('offlineBtn');   // 首頁只在有新版時出現
    if(home) home.classList.toggle('on', state === 'newer');
  }
  async function readLocal(){
    if(localVer) return localVer;
    try{ const t = await (await fetch('config.js', { cache: 'no-store' })).text();
         const m = t.match(/VERSION = '([^']+)'/); localVer = m ? m[1] : ''; }catch(_){}
    return localVer;
  }
  async function check(){
    state = 'checking'; paint();
    await readLocal();
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 5000);
    try{
      const r = await fetch(URL_LATEST + '?t=' + Date.now(), { cache: 'no-store', signal: ac.signal });
      if(!r.ok) throw new Error('http ' + r.status);
      latest = await r.json();
      state = verNum(latest.ver) > verNum(localVer) ? 'newer' : 'latest';
    }catch(_){ state = 'fail'; }
    finally{ clearTimeout(to); }
    paint();
    return state;
  }
  function openItch(){
    const u = (latest && latest.url) || ITCH;
    try{ location.assign(u); }catch(_){ try{ window.open(u, '_system'); }catch(__){} }   // Capacitor 把外站網址交給系統瀏覽器
  }
  function click(cb){
    if(state === 'newer') { openItch(); return; }
    check().then(() => { if(cb) cb(label()); });
  }
  window.__tivotOffline = { label, click, run: click, busy: () => state === 'checking', kind: 'apk' };
  window.__tivotApkUpdate = { check, label, state: () => state, latest: () => latest };
  /* 開機首頁穩定後查一次：失敗就安靜（只是首頁不出鈕），不擋遊戲。 */
  const start = () => { paint(); setTimeout(() => { check().catch(() => {}); }, 3000); };   // 先收起首頁那顆（main.js 開機會加 .on），查到新版才亮
  if(document.readyState === 'complete') start(); else addEventListener('load', start);
})();

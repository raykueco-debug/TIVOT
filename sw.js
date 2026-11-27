/* ══ 離線快取（ver -2256，Ray：「等等要去坐飛機沒網路，把主體遊戲打包成 iOS 能玩的」）══
   · 快取鑰匙**拿掉 ?v=**：程式與素材的網址都帶版本戳（bust.py），而「下載全部」
     存的是沒有戳的路徑 —— 兩邊對得上才查得到。
   · ⚠ iOS 播 <video>／<audio> 會送 Range 請求，回整包 200 會播不出來 —— 從快取切出那一段回 206。
   · 整包下載由 offline.js 在頁面裡跑（同一個 cache 名），這裡不做預載。

   ══ ver -3078（Ray：「下載後要變快、要自動變成離線版」，docs/OFFLINE_WEB_FINDINGS.md 第三節）══
   兩種模式，看快取裡有沒有 `__offline_ready__`（offline.js 下載完成時寫，內容＝版本號；鑰匙算法兩邊同一套）：
   · **沒下載**：網路優先、斷線讀快取（舊行為）。
   · **已下載＝離線版**：**快取優先** —— 快取有就直接回本機、不打網路；沒有才打網路並存起來。
     首頁與程式也一樣（程式與素材同一個版本，才不會對不上）。更新由首頁那顆鈕做（offline.js 比雜湊，只抓變了的）。
   例外（一律網路優先）：`offline_list.json`（要拿得到新版本號）、請求自己帶 `cache:'no-store'/'no-cache'/'reload'` 的
   （offline.js 下載與更新用的就是這個 —— 不然更新時會拿到快取裡的舊檔再存回去）。
   · 存快取之前看 Content-Type：Cloudflare Pages 缺檔回 200＋首頁 HTML，HTML 不准存成 .webp／.m4a。 */
const CACHE = 'tivot-offline-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

function keyOf(url){
  const u = new URL(url);
  u.search = ''; u.hash = '';
  if(u.pathname.endsWith('/')) u.pathname += 'index.html';
  return u.href;
}
const scoped = p => new URL(p, self.registration.scope).href;

/* 離線版了沒（快取裡的旗標）—— 記在記憶體，offline.js 下載完成／自我檢查拔旗時 postMessage 叫這裡重讀。 */
let ready = null;
async function isReady(){
  if(ready === null){
    try{ const r = await (await caches.open(CACHE)).match(scoped('__offline_ready__')); ready = r ? (await r.text()) : ''; }
    catch(_){ ready = ''; }
  }
  return !!ready;
}
self.addEventListener('message', e => { if(e.data && e.data.type === 'offline-ready-changed') ready = null; });

async function fromCache(req){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(keyOf(req.url));
  if(!hit) return null;
  const range = req.headers.get('range');
  if(!range) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.byteLength;
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : size - 1;
  if(!m[1] && m[2]){ start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

/* 打網路，完整的 200 才順手存（206 是片段、存了會壞；HTML 只准存成 .html／導覽頁）。 */
async function fromNet(req){
  const res = await fetch(req);
  if(res.ok && res.status === 200 && !req.headers.get('range')){
    const path = new URL(req.url).pathname;
    const html = /text\/html/i.test(res.headers.get('Content-Type') || '');
    if(!html || req.mode === 'navigate' || /\.html$/i.test(path) || path.endsWith('/')){
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(keyOf(req.url), copy)).catch(()=>{});
    }
  }
  return res;
}

async function indexFallback(req){
  if(req.mode !== 'navigate') return null;
  return (await caches.open(CACHE)).match(keyOf(scoped('index.html')));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  const netFirst = /\/offline_list\.json$/.test(url.pathname) || req.cache === 'no-store' || req.cache === 'no-cache' || req.cache === 'reload';
  e.respondWith((async () => {
    if(!netFirst && await isReady()){
      const hit = await fromCache(req) || (req.mode === 'navigate' ? await indexFallback(req) : null);
      if(hit) return hit;
      return fromNet(req);
    }
    try{ return await fromNet(req); }
    catch(err){
      const hit = await fromCache(req) || await indexFallback(req);
      if(hit) return hit;
      throw err;
    }
  })());
});

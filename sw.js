/* ══ 離線快取（ver -2256，Ray：「等等要去坐飛機沒網路，把主體遊戲打包成 iOS 能玩的」）══
   · 快取鑰匙**拿掉 ?v=**：程式與素材的網址都帶版本戳（bust.py），而「下載全部」
     存的是沒有戳的路徑 —— 兩邊對得上才查得到。
   · ⚠ iOS 播 <video>／<audio> 會送 Range 請求，回整包 200 會播不出來 —— 從快取切出那一段回 206。
   · 整包下載由 offline.js 在頁面裡跑（同一個 cache 名），這裡不做預載。

   ══ ver -3078（Ray：「下載後要變快、要自動變成離線版」，docs/OFFLINE_WEB_FINDINGS.md 第三節）══
   兩種模式，看快取裡有沒有 `__offline_ready__`（offline.js 下載完成時寫，內容＝版本號；鑰匙算法兩邊同一套）：
   · **沒下載**：網路優先、斷線讀快取（舊行為）。
   · **已下載＝離線版**：**快取優先** —— 快取有就直接回本機、不打網路；沒有才打網路（ver -3101 起不順手存，只有導覽頁存）。
     首頁與程式也一樣（程式與素材同一個版本，才不會對不上）。更新由首頁那顆鈕做（offline.js 比雜湊，只抓變了的）。
   例外（一律網路優先）：`offline_list.json`（要拿得到新版本號）、請求自己帶 `cache:'no-store'/'no-cache'/'reload'` 的
   （offline.js 下載與更新用的就是這個 —— 不然更新時會拿到快取裡的舊檔再存回去）。
   · 存快取之前看 Content-Type：Cloudflare Pages 缺檔回 200＋首頁 HTML，HTML 不准存成 .webp／.m4a。 */
const CACHE = 'tivot-offline-v1';

/* ══⚠⚠ 轉址過的回應不准交給頁面（ver -3112，Ray：Safari「response served by service worker has redirections」整頁打不開）══
   Cloudflare Pages 會把 .html 轉址（/index.html → 308 → /、/flight/index.html → /flight/）；fetch 跟著轉、拿到
   `redirected === true` 的回應。這種回應**拿去回應導覽請求，Safari 直接拒絕**。-3112 之前 offline.js 下載時把它原樣存進快取，
   下載完成（快取優先）之後開首頁就中。⇒ 從快取取出／存進快取／斷線退回首頁，一律先過 `clean`：重建一份乾淨的回應。 */
async function clean(res){
  if(!res || !res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
self.addEventListener('install', e => { self.skipWaiting(); });
/* 啟用時把快取裡已經存壞的 html（轉址過的回應）原地改寫乾淨 —— 已經下載完的玩家不必重下 700 MB。 */
self.addEventListener('activate', e => { e.waitUntil((async () => {
  try{
    const cache = await caches.open(CACHE);
    for(const req of await cache.keys()){
      if(!/\.html$/i.test(new URL(req.url).pathname)) continue;
      const res = await cache.match(req);
      if(res && res.redirected) await cache.put(req, await clean(res));
    }
  }catch(_){}
  await self.clients.claim();
})()); });

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
  const hit = await clean(await cache.match(keyOf(req.url)));
  if(!hit) return null;
  const range = req.headers.get('range');
  if(!range) return hit;
  /* ⚠ ver -3101（Ray：iPhone 燙）：Range 一律用 Blob 切片 —— 以前整支 `arrayBuffer()` 讀進記憶體再 slice，
     iOS 播影片會一直送 Range，背景動畫／CI 影片每一段都把整支檔複製一次。Blob.slice 不複製資料。 */
  const buf = await hit.blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.size;
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

/* 打網路。⚠ ver -3101（Ray：iPhone 燙）：**只有導覽頁（index.html）順手存**，素材一律不在這裡寫快取 ——
   以前「完整的 200 都 clone 一份存起來」：平常玩每抓一個檔就多寫一次儲存，而 offline.js 下載自己也會 put，
   它的請求（cache:'no-cache'）又會經過這裡 ⇒ 下載中每個檔寫兩次。寫快取只歸 offline.js 那一條（鐵律 8）。
   導覽頁照存：斷線時 indexFallback 要有東西可退。 */
async function fromNet(req){
  const res = await fetch(req);
  if(res.ok && res.status === 200 && req.mode === 'navigate'){
    const copy = res.clone();
    clean(copy).then(c2 => caches.open(CACHE).then(c => c.put(keyOf(req.url), c2))).catch(()=>{});
  }
  return clean(res);
}

async function indexFallback(req){
  if(req.mode !== 'navigate') return null;
  return clean(await (await caches.open(CACHE)).match(keyOf(scoped('index.html'))));
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

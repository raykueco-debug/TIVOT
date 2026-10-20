/* ══ 離線快取（ver -2256，Ray：「等等要去坐飛機沒網路，把主體遊戲打包成 iOS 能玩的」）══
   iOS 安裝檔要 Mac＋Xcode，這台做不出來 —— 改走「主畫面網頁 App ＋ 離線快取」。
   · 策略：**網路優先，斷線才讀快取**。有網路時永遠拿最新的（不會吃到舊版），
     抓到的順手存進快取；斷線（飛機上）就整個從快取供應。
   · 快取鑰匙**拿掉 ?v=**：程式與素材的網址都帶版本戳（bust.py），而「下載全部」
     存的是沒有戳的路徑 —— 兩邊對得上才查得到。
   · ⚠ iOS 播 <video>／<audio> 會送 Range 請求，回整包 200 會播不出來 ——
     斷線時從快取切出那一段回 206。
   · 整包下載由 offline.js 在頁面裡跑（同一個 cache 名），這裡不做預載。 */
const CACHE = 'tivot-offline-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

function keyOf(url){
  const u = new URL(url);
  u.search = ''; u.hash = '';
  if(u.pathname.endsWith('/')) u.pathname += 'index.html';
  return u.href;
}

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

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try{
      const res = await fetch(req);
      // 完整的 200 才存（206 是片段、存了會壞）；存失敗（額度）不影響這一次回應
      if(res.ok && res.status === 200 && !req.headers.get('range')){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(keyOf(req.url), copy)).catch(()=>{});
      }
      return res;
    }catch(err){
      const hit = await fromCache(req);
      if(hit) return hit;
      if(req.mode === 'navigate'){
        const idx = await (await caches.open(CACHE)).match(keyOf(new URL('index.html', self.registration.scope).href));
        if(idx) return idx;
      }
      throw err;
    }
  })());
});

// 挑戰試玩版：追蹤用的開機（ver -2225）。由 build.py 產生的 trace.html 載入（<base href="../../">）。
// 在 main.js 之前先把 config／立繪表包一層記錄器，實際跑一輪教學＋挑戰，記下「真的讀到的」：
//   GAME_CONFIG 的路徑、ASSETS／ASSET_VER／HITFX／ENEMY_IDLE 的鍵、speakers 的 ART／SPEAKERS 鍵。
// 跑完由 record.py 的 PROMO_DUMP 叫 window.__traceDump() 取回（＋ performance 的資源清單）。
import * as C from '../../config.js';
import * as SP from '../../script/speakers.js';

performance.setResourceTimingBufferSize(50000);   // 預設只記 250 筆，素材白名單會漏
const T = window.__trace = { g: new Set(), a: new Set(), v: new Set(), hit: new Set(), idle: new Set(), art: new Set(), spk: new Set(), enumG: new Set() };
const MAXD = 4;
function wrap(obj, path, depth){
  if(!obj || typeof obj !== 'object' || depth > MAXD) return obj;
  for(const k of Object.keys(obj)){
    const v = obj[k];
    if(v && typeof v === 'object') obj[k] = wrap(v, path + '.' + k, depth + 1);
  }
  return new Proxy(obj, {
    get(t, k, r){ if(typeof k === 'string') T.g.add(path + '.' + k); return Reflect.get(t, k, r); },
    has(t, k){ if(typeof k === 'string') T.g.add(path + '.' + k); return Reflect.has(t, k); },
    ownKeys(t){ T.enumG.add(path); return Reflect.ownKeys(t); },
  });
}
const G = C.GAME_CONFIG;
for(const k of Object.keys(G)){
  const v = G[k];
  if(v && typeof v === 'object') G[k] = wrap(v, k, 1);
  else { let cur = v; Object.defineProperty(G, k, { get(){ T.g.add(k); return cur; }, set(x){ cur = x; }, enumerable: true, configurable: true }); }
}
// 平的表：每個鍵掛一個 getter 記錄
function keyTrace(obj, set){
  for(const k of Object.keys(obj)){
    let cur = obj[k];
    Object.defineProperty(obj, k, { get(){ set.add(k); return cur; }, set(x){ cur = x; }, enumerable: true, configurable: true });
  }
}
keyTrace(C.ASSETS, T.a); keyTrace(C.ASSET_VER, T.v); keyTrace(C.HITFX, T.hit); keyTrace(C.ENEMY_IDLE, T.idle);
keyTrace(SP.ART, T.art); keyTrace(SP.SPEAKERS, T.spk);
window.__traceDump = () => JSON.stringify({
  g: [...T.g].sort(), enumG: [...T.enumG].sort(), a: [...T.a].sort(), v: [...T.v].sort(), hit: [...T.hit].sort(),
  idle: [...T.idle].sort(), art: [...T.art].sort(), spk: [...T.spk].sort(),
  res: performance.getEntriesByType('resource').map(e => e.name),
});
await import('../../main.js');

/* ============================================================================
 *  audio.js — 音效引擎（純輸出，不依賴其他模組；見 CLAUDE.md 第 2 節）
 *  ---------------------------------------------------------------------------
 *  兩條路：
 *    (1) 音檔播放（Web Audio 解碼成 buffer，播放時 new BufferSource → 可自由重疊）。
 *        反擊武器 SE、清盤換彈 Reload 走這條。呼叫端傳「已解析路徑」(asset(key))，
 *        本模組不 import config，維持葉節點。
 *    (2) 合成音（Web Audio 即時合成）。完防／格擋的「重擊感」走這條（heavyHit）。
 *  解鎖：unlock() 於首次使用者手勢呼叫（resume AudioContext）。
 *  ⚠ 其餘既有介面（gunshot/sniperShot/wrong/hit/clear/ultCharge/confirm/menuClick）
 *    本輪維持 no-op 佔位（合成音尚未逐一搬回），供各模組安全呼叫。
 * ========================================================================== */

let _ctx = null;
let _needRebuild = false;   // 上次手勢 resume 沒生效（iOS 主畫面 App 常見）→ 下次手勢內重建 context
let _unlockChk = null;      // resume 生效檢查計時器
const _buffers = {};   // src → AudioBuffer（已解碼；AudioBuffer 不綁 context，重建後仍可播）
const _pending = {};   // src → Promise（解碼中，避免重複 fetch）

/* ── SFX 主匯流 limiter ──
 *  所有 SFX（音檔 + 合成音）先進 DynamicsCompressor 再到 destination：
 *  多音疊播（語音×增益 + SI_01 + 槍聲）總和超過 0 dBFS 時，原本在輸出端硬削波
 *  （聽感＝破/糊）；limiter 以 2ms attack 軟接峰值，疊播再多也不破音。
 *  參數為「透明限幅」取向：threshold -6dB 之下完全不動、ratio 12 近似 brickwall。
 *  context 可能被 unlock 重建（iOS）→ 依 context 快取，換 context 自動重建。 */
let _bus = null, _busCtx = null, _busMaster = null;
let _master = 1;   // 全域主音量（setMasterVolume；呼叫端於開機從 config 設定——本模組維持不讀 config）
function busOut(c){
  if(_bus && _busCtx === c) return _bus;
  try{
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -6;    // 總和 -6dB 以下完全透明
    lim.knee.value = 6;
    lim.ratio.value = 12;        // 近似 brickwall
    lim.attack.value = 0.002;    // 2ms：咬住瞬態不悶掉打擊感
    lim.release.value = 0.12;
    const mg = c.createGain();   // limiter 之後的主音量節（全 SFX/合成音統一縮放）
    mg.gain.value = _master;
    lim.connect(mg); mg.connect(c.destination);
    _bus = lim; _busCtx = c; _busMaster = mg;
    return lim;
  }catch(e){ return c.destination; }
}

/* ══ 分軌音量（ver -397，Ray：「音量分 BGM／SE／語音」）══════════════════
   ⚠ 分軌**要在 limiter 之前**：limiter 是所有聲音的共同入口（`busOut`），
     在它之後只有一顆總音量，切不開軌。所以每一軌各掛一顆 gain 接進 limiter，
     發聲端改連 `busIn(c, 軌)`。
   ⚠ context 會被 `unlock()` 重建（iOS）—— 節點跟著重建，所以用 `_layerCtx` 記住是哪一個。
   ⚠ BGM 不走 Web Audio（它是 HTMLAudio），所以那一軌是在 `bgmTargetVol()` 乘進去的。
   ⚠ 這一層是**玩家的偏好**，與 `config` 那份「每一支音檔的實測增益」是兩回事：
     那份負責把三層拉齊（§6.6），這一層負責讓玩家再調整。兩者相乘。 */
const _layerVol = { bgm:1, se:1, vo:1 };
let _layerCtx = null, _layerNode = {};
function busIn(c, layer){
  const out = busOut(c);
  if(out === c.destination) return out;        // 建不出 limiter 的退路：不分軌
  if(_layerCtx !== c){ _layerCtx = c; _layerNode = {}; }
  if(!_layerNode[layer]){
    try{
      const g = c.createGain();
      g.gain.value = _layerVol[layer]!=null ? _layerVol[layer] : 1;
      g.connect(out);
      _layerNode[layer] = g;
    }catch(e){ return out; }
  }
  return _layerNode[layer];
}
/* 這支音檔屬於哪一軌：走**資料夾**判（§6.6 的命名規約），不靠呼叫端記得傳。 */
function layerOf(src, voice){
  if(voice) return 'vo';
  const p = String(src||'');
  return /\/audio\/vo\//.test(p) ? 'vo' : 'se';
}
/* BGM 元素的目標音量：曲子自己的音量 × 主音量 × BGM 軌。 */
function bgmTargetVol(){ return Math.min(1, _bgmVol * _master * _layerVol.bgm); }

function ctx(){
  if(!_ctx){
    try{ _ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ _ctx = null; }
  }
  return _ctx;
}

// 解碼一個音檔成 buffer（冪等；解碼不需 running context，故可於解鎖前預載）
function load(src){
  if(!src) return Promise.resolve(null);
  if(_buffers[src]) return Promise.resolve(_buffers[src]);
  if(_pending[src]) return _pending[src];
  const c = ctx();
  if(!c) return Promise.resolve(null);
  _pending[src] = fetch(src)
    .then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
    .then(buf => { _buffers[src] = buf; delete _pending[src]; return buf; })
    .catch(() => { delete _pending[src]; return null; });
  return _pending[src];
}

/* ── 語音鏈（VO）────────────────────────────────────────────────────
 *  只有語音走這一條，音效與音樂不走。要解決的是**手機外放**的可懂度：
 *  同一支語音在耳機上與手機上根本不是同一個響度——手機單體 600 Hz 以下
 *  幾乎不發聲，而這幾支母帶有 45~92% 的能量落在 150~500 Hz。實測整層
 *  在耳機上齊平（落差 0.0 dB）、到手機上卻散開成 9.7 dB，最慘的一支
 *  掉到音效層以下 → 被槍聲蓋掉 → 聽起來就是「糊」。
 *
 *  鏈的順序（每一節都有它非在這裡不可的理由）：
 *    EQ   切掉手機放不出來的低頻、壓渾濁段、抬子音的存在感
 *    comp 把平均拉近峰值。⚠ 不是為了更大聲，是為了**不要去踩 SFX 匯流的
 *         limiter**（threshold −6 / ratio 12 / release 120ms）——峰值一過門檻，
 *         整句話會被壓住 120ms，那個 pumping 本身就是「悶、糊」。
 *    gain 逐檔的補償增益（呼叫端從 config 給），一定在 comp **之後**：
 *         comp 的門檻是絕對值，放前面等於每支檔案吃到不同的壓縮量。
 *    lim  收尾的峰值限幅，接住補償後仍然過頭的那 1~2 支。
 *
 *  ⚠ 參數由呼叫端（main.js）從 config 推進來——本模組維持葉節點不讀 config。
 *    沒設定時 _voice 為 null，語音就走一般路徑（不會整個掛掉）。 */
let _voice = null;
function setBq(b, spec){
  const [type, freq, q, gain] = spec;
  b.type = type; b.frequency.value = freq;
  if(q!=null) b.Q.value = q;
  if(gain!=null) b.gain.value = gain;
}
function setComp(cp, o){
  for(const k of ['threshold','knee','ratio','attack','release'])
    if(o[k]!=null) cp[k].value = o[k];
}
/* 建一條語音鏈，回傳 {head, tail}；tail 之後接匯流。 */
function voiceChain(c, vol){
  const V = _voice;
  let head = null, node = null;
  const push = n => { if(node) node.connect(n); else head = n; node = n; };
  try{
    for(const spec of (V.eq || [])) { const b = c.createBiquadFilter(); setBq(b, spec); push(b); }
    if(V.comp){ const cp = c.createDynamicsCompressor(); setComp(cp, V.comp); push(cp); }
    const g = c.createGain(); g.gain.value = (vol==null ? 1 : vol); push(g);
    if(V.lim){ const lm = c.createDynamicsCompressor(); setComp(lm, V.lim); push(lm); }
    return { head, tail: node };
  }catch(e){ return null; }
}

/* ⚠⚠ `src` **一定要傳進來**：`busIn` 要靠它判軌（`layerOf`）。
   ver -397 忘了加這個參數，於是這裡的 `src` 是未宣告的識別字 → ReferenceError →
   被下面那個 `catch(e){}` **靜靜吞掉** → **所有音效整個不見**（Ray 回報，ver -399 修）。
   ⚠ 那個空的 catch 是刻意的（音效壞掉不該讓遊戲停），但它也會把這種低級錯誤藏起來
     —— 動這一支之後**一定要真的聽一次**，不要只看 console。 */
function playBuffer(c, buf, vol, voice, handle, src){
  try{
    const s = c.createBufferSource(); s.buffer = buf;
    if(voice && _voice){
      const ch = voiceChain(c, vol);
      if(ch){ s.connect(ch.head); ch.tail.connect(busIn(c,'vo')); s.start(); return; }
    }
    const g = c.createGain(); g.gain.value = (vol==null ? 1 : vol);
    s.connect(g); g.connect(busIn(c, layerOf(src, voice)));
    s.start();
    /* 可中止的把手（playCue 用）：演出結束時要把還在響的機械聲收掉。
       ⚠ 直接 stop() 會有「喀」一聲 —— 一定要先把增益斜降到 0 再 stop。 */
    if(handle){ handle.node=s; handle.gain=g; handle.ctx=c;
      if(handle.stopAt!=null) handle.fade(handle.stopAt); }
  }catch(e){}
}

// 補播時限：play() 當下未解碼 → 解碼完成若已超過此時限就放棄不播。
//   遲到的音效比沒播更糟——會在無關的場景突然冒出來（如揭幕音拖到進戰鬥才響）。
const LATE_PLAY_MS = 1500;

/* context 未 running（iOS 解鎖中/被中斷）時不盲目 s.start()——被排入的音源會卡到
 * 「下一次手勢 resume」才突然冒出（=延到下一幕才響）。改輪詢等 running，
 * LATE_PLAY_MS 內沒等到就放棄（遲到不亂響）。context 若中途重建，改用新 _ctx。 */
function playWhenRunning(buf, vol, t0, voice, handle, src){
  if(Date.now()-t0 > LATE_PLAY_MS) return;
  const c = _ctx; if(!c) return;
  if(c.state === 'running'){ playBuffer(c, buf, vol, voice, handle, src); return; }
  setTimeout(()=>playWhenRunning(buf, vol, t0, voice, handle, src), 60);
}

// 播放音檔（src＝已解析路徑）。已解碼→立即播；未解碼→限時補播（逾時放棄）。null/空→靜默略過。
function playSrc(src, vol, voice, handle){
  if(!src) return;
  if(!ctx()) return;
  const t0 = Date.now();
  const buf = _buffers[src];
  if(buf){ playWhenRunning(buf, vol, t0, voice, handle, src); return; }
  load(src).then(b => { if(b) playWhenRunning(b, vol, t0, voice, handle, src); });
}

let _shots = [];    // 普攻槍聲候選（已解析路徑，隨機播一支）
let _shotsVol = 1;  // 普攻槍聲音量（setShots 由呼叫端連同增益傳入——維持本模組不讀 config）

/* ── BGM（單一 HTMLAudio + Blob 全下載後播）───────────────────────────────────
 *  為什麼這樣：BGM 很長（如主選單 285 秒），整段 Web Audio 解碼 ≈100MB 會爆手機記憶體；
 *  而 HTMLAudio 直接串流（邊下載邊播）在手機上緩衝不足會斷斷續續。折衷：把整首 fetch 成 Blob
 *  （壓縮 mp3 留記憶體只有幾 MB）→ 從 blobURL 播（已完整在記憶體、不再走網路 → 不會串流卡頓）。
 *  單一元素：首次手勢解鎖後跨場景重用（換 src 即可，含 setTimeout 也能播）。loop、不交疊、切歌淡出。 */
/* 已經歷過使用者手勢？armOnly 用它判斷「現在還需不需要憋著」。
   ⚠ 沒有這個旗標會有競態：玩家在 blob 還沒上膛好之前就點下去 —— 那時 unlock()
     看到的 el.src 還是空的、什麼也沒播，而稍後上膛完成的那一刻又因為 armOnly
     直接 return → **BGM 永遠不會響**。有了旗標，上膛完成時若已解鎖就直接開火。 */
let _unlocked = false;
let _bgmEl = null;      // 單一 BGM 元素
let _bgmSrc = null;     // 目前/目標曲（邏輯路徑，非 blobURL）
/* ⚠⚠ `_bgmSrc`（**要播哪一首**）與 `_bgmPlaying`（**真的已經掛上元素的那一首**）
   是兩件事：換歌的那 0.9~1.9 秒之間，`_bgmSrc` 早就是新的一首了，元素上掛的還是舊的。
   同曲判斷一定要看後者 —— 看前者會在換歌的窗口裡把「重複請求同一首」誤判成
   「已經在播了」（見 playBgm 的說明，ver -391 的 bug）。 */
let _bgmPlaying = null;      // 真的已經掛上 el.src 的那一首
let _bgmSwitching = false;   // 換歌在路上（淡出中／等 delay／等 blob）
let _bgmVol = 0.7;      // 目標音量
let _bgmTimer = null;   // 切歌間隔/待播計時器
const _bgmBlob = {};    // path → objectURL（快取；壓縮 mp3，體積小可多留）
const _bgmPending = {}; // path → Promise（下載中；同曲併發呼叫去重，避免重複抓整首）
function bgmElem(){
  if(!_bgmEl){ _bgmEl = new Audio(); _bgmEl.loop = true; }
  return _bgmEl;
}
function bgmFade(el, to, ms, done){
  if(!el) return;
  clearInterval(el.__fade);
  const from = el.volume;
  const steps = Math.max(1, Math.round(ms/40));
  let i = 0;
  el.__fade = setInterval(()=>{
    i++;
    el.volume = Math.max(0, Math.min(1, from + (to-from)*(i/steps)));
    if(i>=steps){ clearInterval(el.__fade); el.__fade=null; if(done) done(); }
  }, 40);
}
// 整首下載成 Blob（快取 objectURL）：完整在記憶體後播 → 不再串流 → 不卡頓
function ensureBlob(src){
  if(_bgmBlob[src]) return Promise.resolve(_bgmBlob[src]);
  if(_bgmPending[src]) return _bgmPending[src];
  _bgmPending[src] = fetch(src).then(r=>r.blob())
    .then(b=>{ const u=URL.createObjectURL(b); _bgmBlob[src]=u; delete _bgmPending[src]; return u; })
    .catch(()=>{ delete _bgmPending[src]; return null; });
  return _bgmPending[src];
}

export const SFX = {
  // 使用者手勢呼叫（每次按鈕/手勢都會進來）：喚醒 AudioContext + 補播被 autoplay 擋下的 BGM。
  //  iOS（尤其主畫面 App）resume() 會靜默失敗、context 卡 suspended/interrupted →
  //  三重保險：① 手勢內播 1-frame 無聲 buffer（WebKit 經典解鎖點火）② resume()
  //  ③ 400ms 後仍非 running → 標記下次手勢「整顆重建 context」（手勢內新建即為 running；
  //    已解碼的 AudioBuffer 不綁 context，重建後照播）。
  unlock(){
    let c = ctx();
    if(c && c.state !== 'running'){
      if(_needRebuild){
        try{ c.close(); }catch(e){}
        _ctx = null; _needRebuild = false;
        c = ctx();   // 手勢內重建：iOS 直接進 running
      }
      if(c){
        try{
          const b=c.createBuffer(1,1,22050), s=c.createBufferSource();
          s.buffer=b; s.connect(c.destination); s.start(0);   // 無聲點火
        }catch(e){}
        try{ const p=c.resume(); if(p&&p.catch) p.catch(()=>{}); }catch(e){}
        clearTimeout(_unlockChk);
        _unlockChk=setTimeout(()=>{ if(_ctx && _ctx.state !== 'running') _needRebuild = true; }, 400);
      }
    }
    _unlocked = true;
    const el = _bgmEl;
    if(el && el.paused && el.src){ el.volume=bgmTargetVol(); const p=el.play(); if(p&&p.catch) p.catch(()=>{}); }
  },

  /* 切換 BGM：同一元素先淡出 →（可選 delayMs 空一拍）→ 換 blobURL 起播（預設不淡入）loop。
   *  同一首播放中 → 不重播。src 空 → 不動作。
   *  opts：fadeOutMs / delayMs / volume / fadeInMs（預設 0）/ armOnly。
   *
   *  ⚠ armOnly＝**只上膛不開火**：blob 抓好、el.src 就位、音量設好，但**不呼叫
   *    play()**，讓元素留在 paused。之後由 unlock() 在使用者手勢裡**同步**開火
   *    （見 unlock 尾端的 `el.paused && el.src` 那段）。
   *
   *    為什麼要這樣，而不是直接把 playBgm 搬到點擊處理器裡：真正的 el.play()
   *    在 `ensureBlob(src).then(...)` 內，那已經是下一個微任務 —— **脫離使用者
   *    手勢**，iOS 會擋掉。上膛/開火拆開，開火那一步才留在手勢的同步區段內。
   *
   *    為什麼不乾脆照舊「先 play()，被擋了再由 unlock 補播」：那在**政策寬鬆的
   *    瀏覽器上會直接播出來**（桌機 Chrome 就是），於是「要不要按了才有聲音」
   *    變成看瀏覽器臉色。Ray 指定統一成按下才播（ver -259）。 */
  playBgm(src, opts){
    opts = opts || {};
    if(!src) return;
    const el = bgmElem();
    /* ══ 同曲判斷（ver -391 修，Ray：「BGM 不播下一首就停上一首」）══════════
       ⚠⚠ 舊寫法是 `if(src === _bgmSrc && !el.paused){ clearTimeout(_bgmTimer); return; }`
         —— 兩個錯疊在一起：
           ① `_bgmSrc` 一進 playBgm 就被設成**新的一首**，但舊的那首還在淡出，
              `el.paused` 仍然是 false。於是在換歌的那 0.9~1.9 秒裡，**再請求一次
              同一首**（`ensureBgm`／`riseCue`／場景切換都會這樣）就會被判成
              「已經在播了」而直接 return。
           ② 更糟的是它順手 `clearTimeout(_bgmTimer)` —— 那個 timer 正是
              「等一下把新的一首掛上去」的那一步。清掉之後：舊的淡到 0（聽起來像停了）、
              新的永遠沒播。
       正解：同曲要看**真的掛上去的那一首**（`_bgmPlaying`）；換歌在路上時
       （`_bgmSwitching`）收到同一首的請求就**讓它走完**，一個字都不要動。 */
    if(src === _bgmPlaying && !el.paused) return;          // 真的在播同一首：什麼都不做
    if(src === _bgmSrc && _bgmSwitching) return;           // 已經在切往這一首：別打斷它
    const fadeOut = opts.fadeOutMs!=null ? opts.fadeOutMs : 900;
    const fadeIn  = opts.fadeInMs!=null  ? opts.fadeInMs  : 0;   // 預設不淡入
    const delay   = opts.delayMs!=null   ? opts.delayMs   : 0;
    _bgmVol = opts.volume!=null ? opts.volume : 0.7;
    _bgmSrc = src;
    _bgmSwitching = true;
    clearTimeout(_bgmTimer); _bgmTimer=null;
    clearInterval(el.__fade); el.__fade=null;
    ensureBlob(src);   // 提早開始下載，切歌時多半已就緒
    const switchTo = ()=>{
      _bgmTimer = null;
      if(_bgmSrc !== src) return;   // 已被後續切歌取代 → 放棄
      ensureBlob(src).then(url=>{
        if(_bgmSrc !== src) return;        // 已被後續切歌取代（那一支自己會管旗標）
        _bgmSwitching = false;
        /* ⚠ 抓不到 blob 就**退回直接串流**（`el.src = src`）：整首下載失敗（離線、
           快取被清、CORS）不該讓整段變安靜 —— 串流播得動就播，播不動也只是同樣安靜。
           舊寫法是 `if(!url) return`，那會讓舊的一首停在音量 0、新的永遠不播。 */
        const u = url || src;
        try{ el.src = u; el.currentTime = 0; }catch(e){}
        _bgmPlaying = src;
        el.volume = (fadeIn > 0 ? 0 : bgmTargetVol());
        // 只上膛：src 已就位、留在 paused，等 unlock() 於手勢內同步開火。
        // 若手勢**已經**發生過（玩家點得比 blob 快），就不必再憋 —— 直接開火。
        if(opts.armOnly && !_unlocked){ el.volume = bgmTargetVol(); return; }
        const p = el.play();
        if(p && p.catch) p.catch(()=>{});   // 尚未解鎖 → 等 unlock 於手勢補播
        if(fadeIn > 0) bgmFade(el, bgmTargetVol(), fadeIn);
      });
    };
    const afterOut = ()=>{ if(delay>0) _bgmTimer=setTimeout(switchTo, delay); else switchTo(); };
    if(!el.paused && el.src && el.volume>0.001) bgmFade(el, 0, fadeOut, afterOut);
    else afterOut();
  },
  // 停 BGM（淡出後停）
  stopBgm(fadeOutMs){
    clearTimeout(_bgmTimer); _bgmTimer=null;
    _bgmSrc = null; _bgmPlaying = null; _bgmSwitching = false;
    const el = _bgmEl;
    if(el && !el.paused) bgmFade(el, 0, fadeOutMs!=null ? fadeOutMs : 700, ()=>{ try{ el.pause(); }catch(e){} });
  },

  // 預載一批 SFX（Web Audio 解碼成 buffer）：回傳 Promise（全部解完）
  preload(srcs){ return Promise.all((srcs || []).filter(Boolean).map(load)); },
  /* 這支音檔**已經解碼好**了嗎。呼叫端據此決定要不要走自己的退路
     （劇情層在還沒解碼完時改用 HTMLAudio 串流，見 modules/story.js 的 playSeFallback）——
     因為 playSrc 的補播有 LATE_PLAY_MS 1.5 秒的時限，超過就乾脆不播。 */
  ready(src){ return !!(src && _buffers[src]); },
  /* 這支音檔有多長（毫秒）；還沒解碼就回 null（ver -430）。
     ⚠⚠ 存在的理由是**鐵律 7**：「淡出至黑要跟音檔一樣長」這種需求，
       如果把秒數抄一份寫在演出那邊，換一支音檔就會走鐘 —— 音檔自己就是那個真相，
       問它就好。呼叫端拿到 null 時要有自己的退路（音效可能還沒載完）。 */
  duration(src){ const b = src && _buffers[src]; return b ? b.duration*1000 : null; },
  // 預載一批 BGM（整首下載成 Blob，切歌即播不再下載）：回傳 Promise
  preloadBgm(srcs){ return Promise.all((srcs || []).filter(Boolean).map(ensureBlob)); },

  // 播放音檔（src＝已解析路徑）。每次 new source → 可自由重疊、不限制、不打斷前一個。
  play(src, vol){ playSrc(src, vol); },
  /* 播一支**可中止**的音效，回傳把手：`.stop(fadeMs)` 收掉它。
     用途：演出用的機械聲（Kerberos 的齒輪）必須跟著動畫收尾，不能自己響完 ——
     素材 6.9 秒、動畫只有 1.6 秒，不收的話門都開完了齒輪還在轉。
     ⚠ 收的時候要**斜降增益再 stop**，直接 stop 會有一聲喀。
     ⚠ 把手在音檔還沒解碼完就可能被呼叫 stop（演出被跳過）→ 記下 stopAt，
       等真的播起來再補做，否則會漏收。 */
  playCue(src, vol){
    const h = { node:null, gain:null, ctx:null, stopAt:null,
      fade(ms){
        const c=this.ctx, g=this.gain, n=this.node;
        if(!c||!g||!n) return;
        const t=c.currentTime, d=Math.max(0.02,(ms||160)/1000);
        try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t);
             g.gain.linearRampToValueAtTime(0.0001, t+d); n.stop(t+d+0.02); }catch(e){}
      },
      stop(ms){ if(this.node) this.fade(ms); else this.stopAt = (ms||160); } };
    playSrc(src, vol, false, h);
    return h;
  },

  /* 播放**語音**：與 play 的差別是走語音鏈（見上方 voiceChain 的說明）。
     ⚠ 由呼叫端決定層別，不是由 audio.js 猜檔名 —— 這一層的成員就是
       config 的 tuning.partnerSeGain 那一張表，判斷歸屬是呼叫端的事。 */
  playVoice(src, vol){ playSrc(src, vol, true); },

  /* 語音鏈參數（main.js 開機時從 config 的 tuning.voiceChain 推進來）。
     傳 null／不呼叫＝不裝鏈，語音走一般路徑。 */
  setVoiceChain(cfg){ _voice = cfg || null; },

  // 設定普攻槍聲候選（傳已解析路徑陣列，gunshot 隨機播其一；vol＝播放增益，未傳＝1）
  setShots(srcs, vol){ _shots = (srcs || []).filter(Boolean); _shotsVol = (vol==null ? 1 : vol); },
  // 全域主音量（0~1）：SFX/合成音經 limiter 後的主音量節縮放、BGM 於各寫入點乘上係數。
  //   呼叫端（main.js）開機時從 config（tuning.masterVolume）設定；本模組維持葉節點不讀 config。
  /* 分軌音量（ver -397）：`'bgm' | 'se' | 'vo'`，0~1。玩家的偏好，與 config 的
     每支增益相乘（那份負責把三層拉齊，這一層負責讓玩家再調）。 */
  setLayerVolume(layer, v){
    if(!(layer in _layerVol)) return;
    _layerVol[layer] = Math.max(0, Math.min(1, v==null ? 1 : v));
    const g=_layerNode[layer]; if(g) try{ g.gain.value=_layerVol[layer]; }catch(e){}
    if(layer==='bgm'){
      const el=_bgmEl;
      if(el && !el.paused && !el.__fade) el.volume = bgmTargetVol();
    }
  },
  getLayerVolume(layer){ return _layerVol[layer]!=null ? _layerVol[layer] : 1; },

  setMasterVolume(v){
    _master = Math.max(0, Math.min(1, v==null ? 1 : v));
    if(_busMaster) _busMaster.gain.value = _master;
    const el=_bgmEl;
    if(el && !el.paused && !el.__fade) el.volume = bgmTargetVol();   // 播放中即時套用（淡入淡出中不干預）
  },

  // 合成「重擊感」：完防／格擋用。短促低頻衝擊 + 高頻噪音瞬態（打擊質感）。可重疊。
  heavyHit(){
    const c = ctx();
    if(!c) return;
    try{
      const t = c.currentTime;
      // 低頻衝擊：方波 180→60Hz 快速下滑
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(busIn(c,'se'));
      o.start(t); o.stop(t + 0.2);
      // 瞬態噪音：高通後的短脈衝，增加「敲擊」咬合感
      const len = Math.floor(c.sampleRate * 0.06);
      const nb = c.createBuffer(1, len, c.sampleRate);
      const d = nb.getChannelData(0);
      for(let i=0;i<len;i++){ d[i] = (Math.random()*2-1) * (1 - i/len); }
      const n = c.createBufferSource(); n.buffer = nb;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
      n.connect(hp); hp.connect(ng); ng.connect(busIn(c,'se'));
      n.start(t); n.stop(t + 0.08);
    }catch(e){}
  },

  // 普攻槍聲：由 setShots 候選中隨機播一支（正確點擊/雙槍/聖徒化的主武器射擊共用）。
  gunshot(/* heavy */){
    if(!_shots.length) return;
    playSrc(_shots[Math.floor(Math.random()*_shots.length)], _shotsVol);
  },

  // Overkill 進場鈴：明亮鈴鐺（基音＋泛音成串衰減＋輕微回音第二響）。
  //   峰值合計 ≈0.45，介於 heavyHit(0.5) 與一般 SFX 之間——「響亮但適中」。
  overkillBell(){
    const c = ctx();
    if(!c) return;
    try{
      const t = c.currentTime;
      // [頻率Hz, 峰值, 衰減秒]：B5 基音 + 八度/十二度泛音 → 教堂手鈴質感
      const partials = [[988,0.22,1.1],[1976,0.12,0.8],[2953,0.06,0.55],[1479,0.05,0.9]];
      partials.forEach(p=>{
        const o=c.createOscillator(), g=c.createGain();
        o.type='sine'; o.frequency.setValueAtTime(p[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p[1], t+0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t+p[2]);
        o.connect(g); g.connect(busIn(c,'se'));
        o.start(t); o.stop(t+p[2]+0.05);
      });
      // 第二響（0.16s 後、較弱）：增加「響亮」的迴盪感而不刺耳
      const t2=t+0.16, o2=c.createOscillator(), g2=c.createGain();
      o2.type='sine'; o2.frequency.setValueAtTime(1319, t2);
      g2.gain.setValueAtTime(0.0001, t2);
      g2.gain.exponentialRampToValueAtTime(0.10, t2+0.008);
      g2.gain.exponentialRampToValueAtTime(0.0001, t2+0.9);
      o2.connect(g2); g2.connect(busIn(c,'se'));
      o2.start(t2); o2.stop(t2+1);
    }catch(e){}
  },

  // ツケ板（拍子木）二丁：Boss S 級獎勵演出（銭湯インストール）毛筆字寫完後「チョン、チョン」兩聲。
  //   一聲＝極短噪聲 click（敲擊瞬態）+ 三部分音快速衰減（木質共鳴）；第二聲略強、間隔 0.55s。
  tsuke(){
    const c = ctx();
    if(!c) return;
    try{
      const hit=(t, gain)=>{
        // 敲擊瞬態：30ms 噪聲、平方衰減包絡、highpass 去悶
        const nb=c.createBuffer(1, Math.floor(c.sampleRate*0.03), c.sampleRate);
        const d=nb.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
        const n=c.createBufferSource(); n.buffer=nb;
        const nf=c.createBiquadFilter(); nf.type='highpass'; nf.frequency.value=1800;
        const ng=c.createGain();
        ng.gain.setValueAtTime(gain*0.9, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t+0.03);
        n.connect(nf); nf.connect(ng); ng.connect(busIn(c,'se')); n.start(t);
        // 木質共鳴：[頻率Hz, 峰值, 衰減秒]，每打微幅走音（±2%）避免機械感
        [[2450,0.5,0.07],[1150,0.35,0.10],[3600,0.2,0.045]].forEach(p=>{
          const o=c.createOscillator(), g=c.createGain();
          o.type='triangle'; o.frequency.value=p[0]*(0.98+Math.random()*0.04);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gain*p[1], t+0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t+p[2]);
          o.connect(g); g.connect(busIn(c,'se'));
          o.start(t); o.stop(t+p[2]+0.02);
        });
      };
      const t=c.currentTime+0.02;
      hit(t, 0.9); hit(t+0.55, 1.0);
    }catch(e){}
  },

  // 既有介面：本輪維持 no-op（合成音尚未搬回），供各模組安全呼叫、不報錯。
  sniperShot(){},
  wrong(){},
  hit(){},
  clear(){},
  ultCharge(){},
  confirm(){},
  // 通用按鈕音：main.js 以 setMenuClick 注入檔案（GeneralClick_SE）——所有未指定
  //   音效的按鈕（bindBtn/選單/對話推進）皆經 menuClick 出聲；未注入前維持無聲。
  //   （本模組維持葉節點不讀 config，檔案路徑/增益由呼叫端解析注入。）
  setMenuClick(src, gain){ _menuClickSrc = src || null; _menuClickGain = (gain==null ? 1 : gain); },
  menuClick(){ if(_menuClickSrc) playSrc(_menuClickSrc, _menuClickGain); },
};
let _menuClickSrc = null, _menuClickGain = 1;

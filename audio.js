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
const _buffers = {};   // src → AudioBuffer（已解碼）
const _pending = {};   // src → Promise（解碼中，避免重複 fetch）

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

function playBuffer(c, buf, vol){
  try{
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain(); g.gain.value = (vol==null ? 1 : vol);
    s.connect(g); g.connect(c.destination);
    s.start();
  }catch(e){}
}

// 播放音檔（src＝已解析路徑）。已解碼→立即播；未解碼→解碼後補播。null/空→靜默略過。
function playSrc(src, vol){
  if(!src) return;
  const c = ctx();
  if(!c) return;
  const buf = _buffers[src];
  if(buf) playBuffer(c, buf, vol);
  else load(src).then(b => { if(b) playBuffer(c, b, vol); });
}

let _shots = [];   // 普攻槍聲候選（已解析路徑，隨機播一支）

/* ── BGM（單一 HTMLAudio 元素；首次手勢解鎖後跨場景重複使用「換 src」而非每首 new Audio）───
 *  為什麼單一元素：手機/iOS 規定「每個新音訊元素都要在使用者手勢當下才能播」。若每首 new Audio，
 *  用了 delayMs（在 setTimeout 內建立+播）就不在手勢裡 → 被擋（手機沒 BGM）。改用同一個已解鎖的
 *  元素換 src，之後就算在 setTimeout 也能播。loop、不可交疊、切歌淡出。 */
let _bgmEl = null;      // 單一 BGM 元素
let _bgmSrc = null;     // 目前/目標曲（同曲不重播）
let _bgmVol = 0.7;      // 目標音量
let _bgmTimer = null;   // 切歌間隔/淡出後的待播計時器
function bgmElem(){
  if(!_bgmEl){ _bgmEl = new Audio(); _bgmEl.loop = true; _bgmEl.preload = 'auto'; }
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

export const SFX = {
  // 首次使用者手勢呼叫：喚醒 AudioContext + 於手勢當下解鎖並補播單一 BGM 元素
  unlock(){
    const c = ctx();
    if(c && c.state === 'suspended') c.resume().catch(()=>{});
    const el = _bgmEl;
    if(el && el.paused && _bgmSrc){ el.volume=_bgmVol; const p=el.play(); if(p&&p.catch) p.catch(()=>{}); }
  },

  /* 切換 BGM：同一元素先淡出 →（可選 delayMs 空一拍）→ 換 src 起播（預設不淡入）loop。
   *  同一首播放中 → 不重播。src 空 → 不動作。opts：fadeOutMs / delayMs / volume / fadeInMs（預設 0）。 */
  playBgm(src, opts){
    opts = opts || {};
    if(!src) return;
    const el = bgmElem();
    if(src === _bgmSrc && !el.paused){ clearTimeout(_bgmTimer); _bgmTimer=null; return; }  // 同曲播放中
    const fadeOut = opts.fadeOutMs!=null ? opts.fadeOutMs : 900;
    const fadeIn  = opts.fadeInMs!=null  ? opts.fadeInMs  : 0;   // 預設不淡入（作者要求：只淡出）
    const delay   = opts.delayMs!=null   ? opts.delayMs   : 0;
    _bgmVol = opts.volume!=null ? opts.volume : 0.7;
    _bgmSrc = src;                          // 鎖定目標（間隔中同曲再呼叫被上面擋掉）
    clearTimeout(_bgmTimer); _bgmTimer=null;
    clearInterval(el.__fade); el.__fade=null;
    const switchTo = ()=>{
      _bgmTimer = null;
      if(_bgmSrc !== src) return;           // 已被後續切歌取代 → 放棄
      try{ el.src = src; el.currentTime = 0; }catch(e){}
      el.volume = (fadeIn > 0 ? 0 : _bgmVol);
      const p = el.play();
      if(p && p.catch) p.catch(()=>{});     // 尚未解鎖 → 等 unlock 於手勢補播
      if(fadeIn > 0) bgmFade(el, _bgmVol, fadeIn);
    };
    const afterOut = ()=>{ if(delay>0) _bgmTimer=setTimeout(switchTo, delay); else switchTo(); };
    // 正在播 → 先淡出（同一元素）再切；否則直接（間隔後）切
    if(!el.paused && el.src && el.volume>0.001) bgmFade(el, 0, fadeOut, afterOut);
    else afterOut();
  },
  // 停 BGM（淡出後停）
  stopBgm(fadeOutMs){
    clearTimeout(_bgmTimer); _bgmTimer=null;
    _bgmSrc = null;
    const el = _bgmEl;
    if(el && !el.paused) bgmFade(el, 0, fadeOutMs!=null ? fadeOutMs : 700, ()=>{ try{ el.pause(); }catch(e){} });
  },

  // 預載一批音檔（傳已解析路徑陣列）：降低首次播放延遲
  preload(srcs){ (srcs || []).forEach(load); },

  // 播放音檔（src＝已解析路徑）。每次 new source → 可自由重疊、不限制、不打斷前一個。
  play(src, vol){ playSrc(src, vol); },

  // 設定普攻槍聲候選（傳已解析路徑陣列，gunshot 隨機播其一）
  setShots(srcs){ _shots = (srcs || []).filter(Boolean); },

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
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.2);
      // 瞬態噪音：高通後的短脈衝，增加「敲擊」咬合感
      const len = Math.floor(c.sampleRate * 0.06);
      const nb = c.createBuffer(1, len, c.sampleRate);
      const d = nb.getChannelData(0);
      for(let i=0;i<len;i++){ d[i] = (Math.random()*2-1) * (1 - i/len); }
      const n = c.createBufferSource(); n.buffer = nb;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
      n.connect(hp); hp.connect(ng); ng.connect(c.destination);
      n.start(t); n.stop(t + 0.08);
    }catch(e){}
  },

  // 普攻槍聲：由 setShots 候選中隨機播一支（正確點擊/雙槍/聖徒化的主武器射擊共用）。
  gunshot(/* heavy */){
    if(!_shots.length) return;
    playSrc(_shots[Math.floor(Math.random()*_shots.length)]);
  },

  // 既有介面：本輪維持 no-op（合成音尚未搬回），供各模組安全呼叫、不報錯。
  sniperShot(){},
  wrong(){},
  hit(){},
  clear(){},
  ultCharge(){},
  confirm(){},
  menuClick(){},
};

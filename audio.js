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

/* ── BGM（HTMLAudio；loop、全域單一、不可交疊，切歌時舊曲淡出）────────────── */
let _bgm = null;        // 目前 BGM 的 HTMLAudioElement
let _bgmSrc = null;     // 目前 BGM 路徑（同一首播放中不重播、不中斷）
let _bgmVol = 0.7;      // 目標音量
let _bgmTimer = null;   // 切歌間隔（delayMs）的待播計時器
function bgmFade(a, to, ms, done){
  if(!a) return;
  clearInterval(a.__fade);
  const from = a.volume;
  const steps = Math.max(1, Math.round(ms/40));
  let i = 0;
  a.__fade = setInterval(()=>{
    i++;
    a.volume = Math.max(0, Math.min(1, from + (to-from)*(i/steps)));
    if(i>=steps){ clearInterval(a.__fade); a.__fade=null; if(done) done(); }
  }, 40);
}

export const SFX = {
  // 首次使用者手勢呼叫：喚醒 AudioContext + 補播被 autoplay 擋下的 BGM
  unlock(){
    const c = ctx();
    if(c && c.state === 'suspended') c.resume().catch(()=>{});
    // BGM 被 autoplay 擋 → 首次手勢直接全音量補播（不淡入）
    if(_bgm && _bgm.paused){ _bgm.volume=_bgmVol; const p=_bgm.play(); if(p&&p.catch) p.catch(()=>{}); }
  },

  /* 切換 BGM：舊曲淡出後停 →（可選 delayMs 空一拍）→ 新曲直接全音量起播（不淡入）loop。
   *  同一首播放中 → 不重播、不中斷。src 空 → 不動作。不可交疊：全域只留一個 _bgm。
   *  opts：fadeOutMs / delayMs（舊曲淡出到新曲起播之間的間隔）/ volume / fadeInMs（預設 0＝不淡入）。 */
  playBgm(src, opts){
    opts = opts || {};
    if(!src) return;
    if(src === _bgmSrc && _bgm && !_bgm.paused){ clearTimeout(_bgmTimer); _bgmTimer=null; return; }  // 同一首正在播
    const fadeOut = opts.fadeOutMs!=null ? opts.fadeOutMs : 900;
    const fadeIn  = opts.fadeInMs!=null  ? opts.fadeInMs  : 0;   // 預設不淡入（作者要求：只淡出）
    const delay   = opts.delayMs!=null   ? opts.delayMs   : 0;
    _bgmVol = opts.volume!=null ? opts.volume : 0.7;
    clearTimeout(_bgmTimer); _bgmTimer=null;
    // 舊曲淡出後停
    const old = _bgm; _bgm = null;
    if(old){ bgmFade(old, 0, fadeOut, ()=>{ try{ old.pause(); }catch(e){} }); }
    _bgmSrc = src;   // 先鎖定目標（間隔中同曲再呼叫會被上面判斷擋掉）
    const startNew = ()=>{
      _bgmTimer = null;
      const a = new Audio(src); a.loop = true; a.preload = 'auto';
      a.volume = (fadeIn > 0 ? 0 : _bgmVol);   // 不淡入 → 直接全音量
      _bgm = a;
      const p = a.play();
      if(p && p.catch) p.catch(()=>{});   // autoplay 被擋 → 等首次手勢由 unlock 補播
      if(fadeIn > 0) bgmFade(a, _bgmVol, fadeIn);
    };
    if(delay > 0) _bgmTimer = setTimeout(startNew, delay);   // 空一拍再起新曲
    else startNew();
  },
  // 停 BGM（淡出後停）
  stopBgm(fadeOutMs){
    clearTimeout(_bgmTimer); _bgmTimer=null;
    const old = _bgm; _bgm = null; _bgmSrc = null;
    if(old) bgmFade(old, 0, fadeOutMs!=null ? fadeOutMs : 700, ()=>{ try{ old.pause(); }catch(e){} });
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

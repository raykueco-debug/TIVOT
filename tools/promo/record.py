# 宣傳片錄影器：虛擬時間逐格推進（1/60 秒），每格截一張 1080×1920，並記錄音效播放時間。
#
# 用法：py tools/promo/record.py <場景名> <輸出資料夾> [秒數]
#   場景定義在 tools/promo/scenes.py（setup＝即時跑的開場 JS、bot＝每格跑的自動操作 JS）。
# 產出：<輸出>/f00000.jpg…、<輸出>/audio.json（[{t:秒, src, loop, stop}]）
#
# 原理：
#   · 截圖走 Page.captureScreenshot 的 clip.scale＝DPR，CDP 預設只給 CSS 像素。
#   · Emulation.setVirtualTimePolicy 每次只放 16.67ms，遊戲的計時器／rAF／CSS 動畫都照虛擬時間走，
#     所以截圖再慢，成片都是穩定 60 fps。
#   · 音效：攔 fetch → decodeAudioData → AudioBufferSourceNode.start，記下「哪個檔、虛擬時間幾秒」。
#     瀏覽器以 --mute-audio 啟動：照常解碼與排程，只是不從喇叭出聲。
import asyncio, sys, os, json, base64, time, importlib.util, subprocess, tempfile, shutil
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('scenes', os.path.join(HERE, 'scenes.py'))
scenes = importlib.util.module_from_spec(spec); spec.loader.exec_module(scenes)

URL = os.environ.get('PROMO_URL', 'http://localhost:8124/')
W, H, DPR = 432, 768, 2.5          # 9:16，輸出 1080×1920
FPS = 60

HOOK = r"""
(()=>{
  window.__promoAudio = [];
  const tag = new WeakMap();                       // ArrayBuffer / AudioBuffer → url
  const of = window.fetch;
  window.fetch = function(u, o){
    return of.apply(this, arguments).then(r=>{
      const url = (typeof u==='string') ? u : (u && u.url) || '';
      if(/\.mp4/i.test(url)){
        const bl = r.blob.bind(r);
        r.blob = ()=>bl().then(b=>{ tag.set(b, url); return b; });
      }
      if(/\.(m4a|mp3|wav|ogg)/i.test(url)){
        const ab = r.arrayBuffer.bind(r);
        r.arrayBuffer = ()=>ab().then(b=>{ tag.set(b, url); return b; });
      }
      return r;
    });
  };
  const dec = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function(b, ok, ng){
    const url = tag.get(b);
    const p = dec.call(this, b, buf=>{ if(url) tag.set(buf, url); ok&&ok(buf); }, ng);
    return p && p.then ? p.then(buf=>{ if(url) tag.set(buf, url); return buf; }) : p;
  };
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(when, off){
    const url = this.buffer && tag.get(this.buffer);
    if(url){ const e = {t: performance.now()/1000, src:url, loop:!!this.loop, off: off||0};
             window.__promoAudio.push(e); this.__promoEv = e; }
    return st.apply(this, arguments);
  };
  /* 影片（CI 的 mp4）：真的 <video> 會讓虛擬時間與截圖停住 —— 改成假的影片物件：
     src 指到 CI 影片時不交給瀏覽器解，改用 tools/promo/_cifr/ 預先拆好的逐格圖，
     drawImage(video) 時依虛擬時間挑那一格畫上去。 */
  const man = (()=>{ try{ const x=new XMLHttpRequest(); x.open('GET','/tools/promo/_cifr/manifest.json',false); x.send();
                          return JSON.parse(x.responseText); }catch(e){ return {}; } })();
  const blobSrc = new Map();
  const cou = URL.createObjectURL;
  URL.createObjectURL = function(o){ const u = cou.apply(this, arguments); if(o && tag.get(o)) blobSrc.set(u, tag.get(o)); return u; };
  const frames = {};
  const loadFr = name => frames[name] || (frames[name] = Array.from({length: man[name].n}, (_, i)=>{
    const im = new Image(); im.src = '/tools/promo/_cifr/'+name+'/'+String(i+1).padStart(4,'0')+'.jpg'; return im; }));
  const fcur = v => { const f = v.__fake; return f.t0==null ? f.base : f.base + (performance.now()-f.t0)/1000; };
  const fdur = v => v.__fake.n / v.__fake.fps;
  const D = (o,k)=>Object.getOwnPropertyDescriptor(o,k);
  const MP = HTMLMediaElement.prototype, VP = HTMLVideoElement.prototype;
  const nat = { src:D(MP,'src'), cur:D(MP,'currentTime'), rs:D(MP,'readyState'), dur:D(MP,'duration'),
                paused:D(MP,'paused'), ended:D(MP,'ended'), vw:D(VP,'videoWidth'), vh:D(VP,'videoHeight') };
  Object.defineProperty(MP, 'src', { configurable:true,
    get(){ return this.__fake ? this.__fake.src : nat.src.get.call(this); },
    set(v){
      if(this instanceof HTMLVideoElement){
        const orig = blobSrc.get(v) || v, m = String(orig).match(/([^\/?]+)\.mp4/);
        if(m && man[m[1]]){ this.__fake = {src:v, name:m[1], fr:loadFr(m[1]), n:man[m[1]].n, fps:man[m[1]].fps, t0:null, base:0}; return; }
      }
      if(this instanceof HTMLVideoElement){ this.__fake = null; this.__deadSrc = v; return; }   // 錄影時任何原生影片載入都會讓截圖停住
      nat.src.set.call(this, v);
    } });
  const fakeGet = (k, f)=>Object.defineProperty(k==='vw'||k==='vh'?VP:MP,
    {cur:'currentTime',rs:'readyState',dur:'duration',paused:'paused',ended:'ended',vw:'videoWidth',vh:'videoHeight'}[k],
    { configurable:true, get(){ return this.__fake ? f(this) : nat[k].get.call(this); },
      set: nat[k].set ? function(v){ if(this.__fake){ if(k==='cur'){ this.__fake.base=v; if(this.__fake.t0!=null) this.__fake.t0=performance.now(); } return; }
                                      nat[k].set.call(this, v); } : undefined });
  fakeGet('cur', v=>Math.min(fcur(v), fdur(v)));
  fakeGet('rs', v=>4); fakeGet('dur', fdur); fakeGet('paused', v=>v.__fake.t0==null);
  fakeGet('ended', v=>fcur(v)>=fdur(v)); fakeGet('vw', v=>480); fakeGet('vh', v=>720);
  delete VP.requestVideoFrameCallback; VP.requestVideoFrameCallback = undefined;
  const vplay = MP.play, vpause = MP.pause, vload = MP.load;
  MP.play = function(){
    if(this instanceof HTMLVideoElement && !this.__fake) return Promise.resolve();
    if(!this.__fake) return vplay.apply(this, arguments);
    const v = this, f = v.__fake; if(f.t0!=null) return Promise.resolve();
    f.t0 = performance.now();
    setTimeout(()=>v.dispatchEvent(new Event('playing')), 0);
    const tick = ()=>{ if(v.__fake!==f || f.t0==null) return;
      if(fcur(v) >= fdur(v)){ f.base = fdur(v); f.t0 = null; v.dispatchEvent(new Event('ended')); return; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    return Promise.resolve();
  };
  MP.pause = function(){ if(this.__fake){ const f=this.__fake; if(f.t0!=null){ f.base=fcur(this); f.t0=null; } return; } return vpause.apply(this, arguments); };
  MP.load = function(){ if(this instanceof HTMLVideoElement) return; return vload.apply(this, arguments); };
  const sat = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(k, v){ if(this instanceof HTMLVideoElement && String(k).toLowerCase()==='src'){ this.src = v; return; } return sat.apply(this, arguments); };
  const di = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(img){
    if(img && img.__fake){
      const f = img.__fake; let k = Math.max(0, Math.min(f.n-1, Math.floor(fcur(img)*f.fps)));
      let im = f.fr[k]; while(k>0 && !(im.complete && im.naturalWidth)) im = f.fr[--k];
      if(!(im.complete && im.naturalWidth)) return;
      const args = Array.prototype.slice.call(arguments); args[0] = im;
      return di.apply(this, args);
    }
    return di.apply(this, arguments);
  };
  const sp = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function(){
    if(this.__promoEv) this.__promoEv.stop = performance.now()/1000;
    return sp.apply(this, arguments);
  };
})();
"""

def _find_shell():
    # 哪一版 chromium_headless_shell 都行（10-18 Windows 3060 那台裝到的是 1248，原本寫死 1243）
    import glob
    c = sorted(glob.glob(os.path.join(os.environ['LOCALAPPDATA'], 'ms-playwright', 'chromium_headless_shell-*',
                                      'chrome-headless-shell-win64', 'chrome-headless-shell.exe')))
    return c[-1] if c else ''
SHELL = _find_shell()
PORT = int(os.environ.get('PROMO_PORT', '9333'))
BOT_JS = "(i)=>{ try{ return window.__promoBot(i)||[] }catch(e){ return [{err:String(e)}] } }"

async def main(name, out, secs):
    sc = scenes.SCENES[name]
    secs = float(secs or sc.get('secs', 10))
    os.makedirs(out, exist_ok=True)
    # BeginFrame 控制：合成器不自己出圖，每一格由我們叫 HeadlessExperimental.beginFrame 出圖＋截圖。
    #   只用虛擬時間＋captureScreenshot 時，CI 收尾那一刻常常等不到下一格、整個停住
    #   （實測：停用非同步解碼、改軟體算圖都救不了；頁面 JS 仍有回應，只是合成器不出圖）。
    prof = os.path.join(tempfile.gettempdir(), 'tivot_promo_profile')
    shutil.rmtree(prof, ignore_errors=True)
    proc = subprocess.Popen([SHELL, f'--remote-debugging-port={PORT}', f'--user-data-dir={prof}',
        '--deterministic-mode', '--enable-begin-frame-control', '--run-all-compositor-stages-before-draw',
        '--disable-new-content-rendering-timeout', '--disable-threaded-animation', '--disable-threaded-scrolling',
        '--disable-checker-imaging', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11',
        '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run',
        f'--force-device-scale-factor={DPR}', f'--window-size={W},{H}', 'about:blank'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        async with async_playwright() as p:
            b = None
            for _ in range(100):
                try: b = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{PORT}'); break
                except Exception: await asyncio.sleep(0.2)
            ctx = b.contexts[0]
            await ctx.add_init_script("localStorage.setItem('tivot_admin_v1','1');localStorage.setItem('tivot_admin_ui_v1','0');localStorage.removeItem('tivot_mute_v1');"
                                      + sc.get('storage',''))
            await ctx.add_init_script(HOOK)
            bc = await b.new_browser_cdp_session()
            tid = (await bc.send('Target.createTarget', {'url':'about:blank', 'enableBeginFrameControl':True}))['targetId']
            pg = cdp = None
            for _ in range(100):
                for q in ctx.pages:
                    c = await ctx.new_cdp_session(q)
                    info = await c.send('Target.getTargetInfo')
                    if info['targetInfo']['targetId'] == tid: pg, cdp = q, c; break
                if pg: break
                await asyncio.sleep(0.1)
            pg.on('console', lambda m: m.type=='error' and print('[console]', m.text[:200]))
            pg.on('pageerror', lambda e: print('[pageerror]', str(e)[:300]))
            await cdp.send('Emulation.setDeviceMetricsOverride', {'width':W,'height':H,'deviceScaleFactor':DPR,'mobile':True})
            await cdp.send('Emulation.setTouchEmulationEnabled', {'enabled':True, 'maxTouchPoints':5})

            # 開機那一段即時跑：背景每 16ms 叫一格（不截圖）
            state = {'pump': True}
            async def pump():
                while state['pump']:
                    try: await asyncio.wait_for(cdp.send('HeadlessExperimental.beginFrame', {'interval':1000/FPS}), 5)
                    except Exception: pass
                    await asyncio.sleep(1/FPS)
            pt = asyncio.ensure_future(pump())
            await pg.goto(URL, wait_until='domcontentloaded')
            await pg.wait_for_function("document.body&&document.body.innerText.includes('COMPLETE')", timeout=120000, polling=200)
            await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':W/2,'y':H*0.78}]})
            await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            await pg.wait_for_function("document.getElementById('home')&&document.getElementById('home').classList.contains('on')", timeout=30000, polling=200)
            await asyncio.sleep(2.5)
            await pg.evaluate("document.body.classList.remove('testmode')")   # 錄影一律是玩家視角
            await pg.evaluate("async()=>{ window.__promo={}; " + scenes.PRELUDE + sc['setup'] + " }")
            await asyncio.sleep(sc.get('settle', 0)/1000)
            state['pump'] = False; await pt
            await pg.evaluate("()=>{ window.__promoAudio.length=0; }")
            await pg.evaluate("()=>{ window.__promoBot = " + sc.get('bot', '()=>[]') + "; }")

            done = asyncio.Event()
            cdp.on('Emulation.virtualTimeBudgetExpired', lambda e: done.set())
            t_start = await pg.evaluate('performance.now()/1000')
            # ⚠ 每一格的畫面時間戳記要跟著虛擬時間走（ver -2224）：不給的話 beginFrame 用真實時鐘，
            #   而一格要截 ~70ms ⇒ 拿 rAF 時間戳算步長的地方（飛行頁 loop 的 dt，上限 40ms）每格都走 40ms ＝ 畫面快 2.4 倍。
            ft0 = time.monotonic() * 1000 + 1000
            # 場景寫 'alpha': True ＝透明背景、存 PNG（ver -2224，Ray：「門要 alpha 通道，像遊戲裡那樣」）
            ALPHA = bool(sc.get('alpha'))
            if ALPHA: await cdp.send('Emulation.setDefaultBackgroundColorOverride', {'color':{'r':0,'g':0,'b':0,'a':0}})
            SHOT = {'format':'png'} if ALPHA else {'format':'jpeg','quality':93}
            NOSHOT = bool(os.environ.get('PROMO_NOSHOT'))   # 追蹤用：不截圖、不存畫格（只跑邏輯，快很多）
            EXT = 'png' if ALPHA else 'jpg'
            n = int(secs * FPS); t0 = time.time(); last = None; same = 0
            for i in range(n):
                pend = []
                acts = await asyncio.wait_for(pg.evaluate(BOT_JS, i), 20)
                stop = False
                for a in acts:
                    if 'err' in a: print('[bot]', a['err']); continue
                    if a.get('stop'): stop = True; break
                    if 'key' in a:
                        k = a['key']; vk = ord(k.upper()) if len(k)==1 else {'Enter':13,' ':32,'ArrowLeft':37,'ArrowUp':38,'ArrowRight':39,'ArrowDown':40}.get(k,0)
                        ev = {'type':a['type'], 'key':k, 'code':('Key'+k.upper()) if len(k)==1 and k.isalpha() else k, 'windowsVirtualKeyCode':vk}
                        if a['type']=='keyDown' and len(k)==1: ev['text'] = k
                        pend.append(asyncio.ensure_future(cdp.send('Input.dispatchKeyEvent', ev)))
                        continue
                    tp = [{'x':a['x'],'y':a['y']}]
                    # 送出就走：虛擬時間停著時渲染端不回條，等了會死鎖
                    pend.append(asyncio.ensure_future(cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':tp})))
                    pend.append(asyncio.ensure_future(cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})))
                if stop: n = i; break
                done.clear()
                await cdp.send('Emulation.setVirtualTimePolicy', {'policy':'advance','budget':1000/FPS})
                try: await asyncio.wait_for(done.wait(), 20)
                except asyncio.TimeoutError: print('[stall] budget', i, flush=True); n = i; break
                r = await asyncio.wait_for(cdp.send('HeadlessExperimental.beginFrame',
                        {'interval':1000/FPS, 'frameTimeTicks': ft0 + i * 1000/FPS, 'screenshot':({'format':'jpeg','quality':1,'optimizeForSpeed':True} if NOSHOT else SHOT)}), 20)   # ⚠ 不要截圖時 beginFrame 會卡住 ⇒ 截最小的、不存
                if pend:
                    try: await asyncio.wait_for(asyncio.gather(*pend), 10)
                    except asyncio.TimeoutError: print('[input stall] frame', i)
                data = r.get('screenshotData')
                if data: last = base64.b64decode(data)
                else: same += 1
                if last and not NOSHOT:
                    with open(os.path.join(out, 'f%05d.' % i + EXT), 'wb') as f: f.write(last)
                if i % 300 == 0: print('frame', i, '/', n, '%.0fs' % (time.time()-t0), 'no-damage frames', same, flush=True)
            # 挑戰試玩版的追蹤（ver -2225）：PROMO_DUMP＝一段 JS 運算式，跑完把結果存成 <輸出>/dump.json
            if os.environ.get('PROMO_DUMP'):
                dv = await pg.evaluate(os.environ['PROMO_DUMP'])
                open(os.path.join(out, 'dump.json'), 'w', encoding='utf-8').write(dv if isinstance(dv, str) else json.dumps(dv, ensure_ascii=False))
            aud = await pg.evaluate('window.__promoAudio')
            for e in aud:
                e['t'] = round(e['t'] - t_start, 4)
                if 'stop' in e: e['stop'] = round(e['stop'] - t_start, 4)
            json.dump({'frames': n, 'fps': FPS, 'audio': aud}, open(os.path.join(out, 'audio.json'), 'w'), ensure_ascii=False, indent=1)
            print('done', n, 'frames, audio events', len(aud), 'in %.0fs' % (time.time()-t0))
            await b.close()
    finally:
        proc.kill()

asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None))

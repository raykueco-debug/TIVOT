# 試錄：量 CDP screencast 的幀率與畫質（headless vs headed）
import asyncio, sys, time, base64, os
from playwright.async_api import async_playwright
URL = 'http://localhost:8124/'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'probe_out'
async def main(headed):
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=not headed, args=['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11','--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width':432,'height':768}, device_scale_factor=2.5, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('tivot_admin_v1','1');localStorage.setItem('tivot_mute_v1','1');")
        pg = await ctx.new_page()
        cdp = await ctx.new_cdp_session(pg)
        frames = []
        def on(f):
            frames.append((time.time(), f['data']))
            asyncio.ensure_future(cdp.send('Page.screencastFrameAck', {'sessionId': f['sessionId']}))
        cdp.on('Page.screencastFrame', on)
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await cdp.send('Page.startScreencast', {'format':'jpeg','quality':92,'maxWidth':1080,'maxHeight':1920,'everyNthFrame':1})
        await pg.wait_for_timeout(8000)
        await cdp.send('Page.stopScreencast')
        print('gl:', await pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('webgl');const d=c&&c.getExtension('WEBGL_debug_renderer_info');return d?c.getParameter(d.UNMASKED_RENDERER_WEBGL):'none'})()"))
        if frames:
            dur = frames[-1][0]-frames[0][0]
            print('frames', len(frames), 'dur %.2f'%dur, 'fps %.1f'%(len(frames)/max(dur,1e-3)))
            open(os.path.join(OUT,'last.jpg'),'wb').write(base64.b64decode(frames[-1][1]))
        await b.close()
asyncio.run(main(sys.argv[1]=='headed'))

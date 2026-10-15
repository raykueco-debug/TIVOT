# 虛擬時間逐格：每推 1/60 秒截一張，看畫面是否平順前進
import asyncio, sys, time, base64, os
from playwright.async_api import async_playwright
OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'])
        ctx = await b.new_context(viewport={'width':432,'height':768}, device_scale_factor=2.5, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('tivot_admin_v1','1');localStorage.setItem('tivot_mute_v1','1');")
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await pg.goto('http://localhost:8124/'); await pg.wait_for_timeout(1500)
        await pg.mouse.click(216,400); await pg.wait_for_timeout(3000)   # 點掉讀取頁
        done = asyncio.Event()
        cdp.on('Emulation.virtualTimeBudgetExpired', lambda e: done.set())
        t0=time.time(); n=90
        for i in range(n):
            done.clear()
            await cdp.send('Emulation.setVirtualTimePolicy',{'policy':'advance','budget':1000/60})
            await done.wait()
            r=await cdp.send('Page.captureScreenshot',{'format':'jpeg','quality':92,'clip':{'x':0,'y':0,'width':432,'height':768,'scale':2.5}})
            open(os.path.join(OUT,'f%03d.jpg'%i),'wb').write(base64.b64decode(r['data']))
        print('captured',n,'frames in %.1fs real'%(time.time()-t0))
        print('perf', await pg.evaluate('performance.now()'))
        await b.close()
asyncio.run(main())

import asyncio, sys, time, base64, os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'])
        ctx = await b.new_context(viewport={'width':432,'height':768}, device_scale_factor=2.5, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await pg.goto('http://localhost:8124/'); await pg.wait_for_timeout(1500)
        print('dpr', await pg.evaluate('devicePixelRatio'))
        await pg.screenshot(path=os.path.join(sys.argv[1],'pw.png'))
        r=await cdp.send('Page.captureScreenshot',{'format':'jpeg','quality':90,'clip':{'x':0,'y':0,'width':432,'height':768,'scale':2.5}})
        open(os.path.join(sys.argv[1],'clip.jpg'),'wb').write(base64.b64decode(r['data']))
        t=time.time(); n=0
        while time.time()-t<4:
            await cdp.send('Page.captureScreenshot',{'format':'jpeg','quality':90,'optimizeForSpeed':True,'clip':{'x':0,'y':0,'width':432,'height':768,'scale':2.5}}); n+=1
        print('clip fps %.1f'%(n/4))
        await b.close()
asyncio.run(main())

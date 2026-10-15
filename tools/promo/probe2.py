import asyncio, sys, time, base64, os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'])
        ctx = await b.new_context(viewport={'width':432,'height':768}, device_scale_factor=2.5, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('tivot_admin_v1','1');localStorage.setItem('tivot_mute_v1','1');")
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await pg.goto('http://localhost:8124/'); await pg.wait_for_timeout(1500)
        for fmt,q in (('jpeg',90),('png',None)):
            t=time.time(); n=0; last=None
            while time.time()-t<4:
                a={'format':fmt,'optimizeForSpeed':True}
                if q: a['quality']=q
                r=await cdp.send('Page.captureScreenshot',a); n+=1; last=r['data']
            print(fmt,'fps %.1f'%(n/4))
            open(os.path.join(sys.argv[1],'shot.'+fmt),'wb').write(base64.b64decode(last))
        await b.close()
asyncio.run(main())

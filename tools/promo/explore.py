# 探索用：開機 → 點掉讀取頁 → 執行一段 JS → 等幾秒 → 截圖＋印出 JS 結果
# 用法: py explore.py OUTDIR "<setup js>" WAIT_MS "<probe js>"
import asyncio, sys, os, json
from playwright.async_api import async_playwright
OUT, SETUP, WAIT, PROBE = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11','--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width':432,'height':768}, device_scale_factor=1, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('tivot_admin_v1','1');localStorage.setItem('tivot_mute_v1','1');")
        pg = await ctx.new_page()
        pg.on('console', lambda m: m.type in ('error','warning') and print('[console]', m.type, m.text[:200]))
        await pg.goto('http://localhost:8124/')
        await pg.wait_for_function("document.body.innerText.includes('COMPLETE')", timeout=60000)
        await pg.mouse.click(216, 600)
        await pg.wait_for_function("document.getElementById('home') && document.getElementById('home').classList.contains('on')", timeout=30000)
        await pg.wait_for_timeout(2500)
        await pg.evaluate("async()=>{"+SETUP+"}")
        await pg.wait_for_timeout(WAIT)
        await pg.screenshot(path=os.path.join(OUT,'shot.png'))
        r = await pg.evaluate("()=>{"+PROBE+"}")
        print(json.dumps(r, ensure_ascii=False, indent=1)[:6000])
        await b.close()
asyncio.run(main())

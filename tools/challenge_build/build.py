# 挑戰試玩版打包（ver -2225，Ray：「挑戰是給玩家試玩用的，不想要玩家可以從原始碼或管理人手勢看到其他內容」）
#
# 原則：**試玩版根本不包含其他內容** —— 程式碼照用真的那一份（戰鬥、劇情播放器只是程式），
#       **資料**換成只剩挑戰用得到的版本，城鎮／旅店／整備／存檔換成空殼，管理人手勢整段拿掉，
#       素材只複製「精簡後的資料或程式碼有指名、而且追蹤時真的抓過」的那些。
#
#   py -X utf8 tools/challenge_build/build.py trace-html          產生 trace.html（追蹤用）
#   py -X utf8 tools/challenge_build/build.py build <追蹤dump…>   產出 tools/challenge_build/dist/（可直接放上靜態空間）
#
# 追蹤 dump 的作法（實際跑一輪教學＋一輪挑戰，記下讀到的 config 與抓過的檔案）：
#   PROMO_NOSHOT=1 PROMO_URL=http://localhost:8202/tools/challenge_build/trace.html PROMO_DUMP='window.__traceDump()' \
#     python -X utf8 tools/promo/record.py trace_tut <輸出>     （另一輪換 trace_chal）
#
# ⚠ 打包完一定跑敏感字串掃描（build 的最後一步，自動）：從**真的**劇情資料收集角色名／地名／章節名／台詞片段，
#   出現在 dist 裡任何檔案（含檔名）就報錯、exit 1。
import os, re, sys, io, json, shutil, subprocess, threading, http.server, socketserver, functools

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OVL = os.path.join(HERE, 'build', 'overlay')
DIST = os.path.join(HERE, 'dist')

def rd(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

# ───────────────────────── trace.html ─────────────────────────
def trace_html():
    s = rd('index.html')
    s = s.replace('<head>', '<head>\n<base href="../../">', 1)
    s, n = re.subn(r'<script type="module" src="main\.js\?v=\d+"></script>',
                   '<script type="module" src="tools/challenge_build/trace_boot.js"></script>', s)
    assert n == 1, 'main.js 的 script 標籤找不到'
    io.open(os.path.join(HERE, 'trace.html'), 'w', encoding='utf-8').write(s)
    print('-> trace.html')

# ───────────────────────── 原始碼手術：把 `export const NAME = <literal>` 的字面值整段換掉 ─────────────────────────
def literal_span(src, name, exported=True):
    m = re.search(r'(?m)^%sconst\s+%s\s*=\s*' % ('export\\s+' if exported else '', re.escape(name)), src)
    if not m: raise KeyError(name)
    i = m.end(); open_ch = src[i]
    if open_ch not in '{[': raise ValueError('%s 不是物件／陣列字面值' % name)
    depth = 0; j = i; n = len(src)
    while j < n:
        c = src[j]
        if c in '"\'`':
            q = c; j += 1
            while j < n and src[j] != q:
                if src[j] == '\\': j += 1
                elif q == '`' and src[j] == '$' and j + 1 < n and src[j+1] == '{':   # 樣板字串裡的 ${…}
                    d2 = 1; j += 2
                    while j < n and d2:
                        if src[j] == '{': d2 += 1
                        elif src[j] == '}': d2 -= 1
                        j += 1
                    continue
                j += 1
        elif src.startswith('//', j): j = src.index('\n', j)
        elif src.startswith('/*', j): j = src.index('*/', j) + 1
        elif c in '{[(': depth += 1
        elif c in '}])':
            depth -= 1
            if depth == 0: return i, j + 1
        j += 1
    raise ValueError('%s 的字面值沒有收尾' % name)

def replace_literals(src, repl, exported=True):
    for name, val in repl.items():
        a, b = literal_span(src, name, exported)
        src = src[:a] + (val if isinstance(val, str) else json.dumps(val, ensure_ascii=False)) + src[b:]
    return src

# ───────────────────────── 讀真的資料（無頭瀏覽器載入原始模組） ─────────────────────────
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
def serve(root, port):
    h = functools.partial(_Quiet, directory=root)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', port), h); srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def browser_eval(root, page_rel, js, port=8219):
    import glob   # ⚠ 不要 import record.py：它沒有 __main__ 保護，一 import 就開始錄影
    c = sorted(glob.glob(os.path.join(os.environ['LOCALAPPDATA'], 'ms-playwright', 'chromium_headless_shell-*',
                                      'chrome-headless-shell-win64', 'chrome-headless-shell.exe')))
    SHELL = c[-1] if c else None
    from playwright.sync_api import sync_playwright
    srv = serve(root, port)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path=SHELL, headless=True)
            pg = b.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/%s' % (port, page_rel))
            out = pg.evaluate(js)
            b.close()
            return out, errs
    finally:
        srv.shutdown(); srv.server_close()

DUMP_JS = r"""async()=>{
  const C=await import('./config.js'); const SP=await import('./script/speakers.js'); const EN=await import('./script/enemies.js');
  const EY=await import('./script/eyefx.js'); const BL=await import('./script/blink.js'); const PR=await import('./script/progress.js');
  const MS=await import('./script/mainScript.js'); const TW=await import('./script/town.js'); const EV=await import('./script/evaluation.js');
  return JSON.stringify({ G:C.GAME_CONFIG, ASSETS:C.ASSETS, ASSET_VER:C.ASSET_VER, HITFX:C.HITFX, ENEMY_IDLE:C.ENEMY_IDLE,
    HOME_IMG:C.HOME_IMG, HOME_SFX:C.HOME_SFX, ENEMIES:EN.ENEMIES, SPEAKERS:SP.SPEAKERS, ART:SP.ART, EYEFX:EY.EYEFX, BLINK:BL.BLINK,
    CHAPTERS:PR.CHAPTERS, MAIN:MS.MAIN_SCRIPT, TOWNS:TW.TOWNS, EVAL:EV.LINES });
}"""

# ───────────────────────── 修剪 ─────────────────────────
CH_ENEMIES = None   # 由資料推：lineup ＋ currentEnemy ＋ intruder.enemy ＋ tutorial.enemyKey
PARTNER = 'renee'

def strings_in(o, acc):
    if isinstance(o, str): acc.add(o)
    elif isinstance(o, dict):
        for k, v in o.items(): acc.add(k); strings_in(v, acc)
    elif isinstance(o, list):
        for v in o: strings_in(v, acc)
    return acc

def prune_config(D):
    G = D['G']
    en = set(G['lineup']) | {G['currentEnemy'], G['intruder']['enemy'], G['tutorial']['enemyKey']}
    insp = {G['defaultInspector'], G['bossInspector']}
    keepG = {}
    for k, v in G.items():
        keepG[k] = v
    # 挑戰不會掉道具（Ray 10-19）：試玩敵人身上的 loot 拿掉
    keepG['enemies'] = {k: {x: y for x, y in G['enemies'][k].items() if x != 'loot'} for k in en if k in G['enemies']}
    keepG['partners'] = {k: v for k, v in G['partners'].items() if k == PARTNER or not isinstance(v, dict) or 'name' not in v}
    keepG['defaultPartner'] = PARTNER
    keepG['challengePartners'] = [PARTNER]
    keepG['inspectors'] = {k: G['inspectors'][k] for k in insp}
    keepG['battles'] = {}; keepG['bounties'] = {}; keepG['huntExchange'] = {}
    keepG['cooking'] = {'dishes': {}}
    keepG['storyPartner'] = None; keepG['storyPartnerNone'] = []; keepG['storyPartnerBy'] = []
    keepG['partnerMapOff'] = []; keepG['partnerBench'] = []
    keepG['loadingHost'] = {}
    keepG['flightBgmWhen'] = {} if isinstance(G.get('flightBgmWhen'), dict) else []
    # 本篇女角（養成）：挑戰的搭檔不是她們 ⇒ 名單清空，結構留著（程式會查 who／proxy）
    gl = dict(G['girls']); gl['who'] = []
    for kk in list(gl.keys()):
        if isinstance(gl[kk], dict) and kk not in ('starCond',): gl[kk] = {x: y for x, y in gl[kk].items() if x == PARTNER}
    gl['starCond'] = {}
    keepG['girls'] = gl
    # 教學：只留試玩版那一套（監察官＋搭檔）；劇情版教學（story）整段拿掉
    T = dict(G['tutorial'])
    T['cast'] = {k: v for k, v in T['cast'].items() if k in ('inspector', 'partner')}
    imgs = {v['image'] for v in T['cast'].values()}
    T['portraitFrames'] = {k: v for k, v in T['portraitFrames'].items() if k in imgs}
    T.pop('story', None)
    T['loot'] = []                                   # 挑戰不會掉道具（Ray 10-19）：教學打完也不給獎品
    keepG['tutorial'] = T
    # 道具：挑戰不會掉道具（Ray 10-19）⇒ 道具定義整個清空，商店也不要
    items = dict(G['items']); items['defs'] = {}
    keepG['items'] = items
    keepG['shop'] = {}
    return keepG, en, insp

# 劇情角色的 id（檔名／資產鍵裡帶著它的一律不收）＝ 立繪表 ∪ 搭檔 ∪ 本篇女角 ∪ 監察官 ∪ 敵人，扣掉試玩版看得到的
GENERIC = {'counter', 'mage', 'clerk', 'hunter', 'priest', 'shopkeep', 'commander', 'retainer', 'worker'}
def story_ids(D, keep):
    G = D['G']; ids = set(D['ART']) | set(G['partners']) | set(G['girls'].get('who', [])) | set(G['inspectors']) | set(D['ENEMIES'])
    ids = {i.lower() for i in ids if isinstance(i, str) and len(i) >= 4 and re.fullmatch(r'[a-z0-9_]+', i.lower())}
    return sorted((ids - {k.lower() for k in keep}) - GENERIC, key=len, reverse=True)
def has_id(text, BL):
    t = str(text or '').lower()
    return next((i for i in BL if i in t), None)

def build_overlays(D, trace_res, BL):
    os.makedirs(OVL, exist_ok=True)
    G, en, insp = prune_config(D)
    # 劇情相關的大型資料一律清空
    data_strings = strings_in(G, set()) | strings_in(D['HITFX'], set()) | strings_in(D['HOME_IMG'], set()) | strings_in(D['HOME_SFX'], set())
    # 程式碼裡寫死的資產鍵（asset('sfx_saint') 那一類）：掃描會打包的程式檔
    code_strings = set()
    for f in CODE_FILES():
        code_strings |= set(re.findall(r"""['"`]([A-Za-z0-9_\-./]+)['"`]""", strip_data(f)))
    want = data_strings | code_strings
    ASSETS = {k: v for k, v in D['ASSETS'].items() if k in want and not has_id(k, BL) and not has_id(v, BL)}
    # 調音表／CI 動檔表：只留還在的鍵
    def base(p): return re.sub(r'\?.*$', '', os.path.splitext(os.path.basename(str(p)))[0]).lower()
    kept_files = {base(v) for v in ASSETS.values()} | {base(r) for r in trace_res}
    tun = dict(G['tuning'])
    if isinstance(tun.get('fileGain'), dict): tun['fileGain'] = {k: v for k, v in tun['fileGain'].items() if (k.lower() in kept_files or k in ASSETS) and not has_id(k, BL)}
    if isinstance(tun.get('cutinAnim'), dict): tun['cutinAnim'] = {k: v for k, v in tun['cutinAnim'].items() if (k in ASSETS or k in data_strings) and not has_id(k, BL) and not has_id(json.dumps(v), BL)}
    G['tuning'] = tun
    ENEMIES = {k: {x: y for x, y in v.items() if x != 'loot'} for k, v in D['ENEMIES'].items() if k in en}   # 挑戰不會掉道具
    ENEMY_IDLE = {k: v for k, v in D['ENEMY_IDLE'].items() if k in en or k in ASSETS}
    ASSET_VER = {k: v for k, v in D['ASSET_VER'].items() if k in kept_files}
    # 立繪：教學那兩位（cast 的 image 鍵是 ASSETS 鍵，不走 ART）——ART／SPEAKERS 只留蕾妮給頭像用
    ART = {k: v for k, v in D['ART'].items() if k in (PARTNER,)}
    SPEAKERS = {k: v for k, v in D['SPEAKERS'].items() if (v or {}).get('art') in ART}
    EYEFX = {k: v for k, v in D['EYEFX'].items() if k in kept_files and not has_id(k, BL)}
    BLINK = {k: v for k, v in D['BLINK'].items() if k in kept_files and not has_id(k, BL)}
    put = lambda rel, s: (os.makedirs(os.path.dirname(os.path.join(OVL, rel)), exist_ok=True),
                          io.open(os.path.join(OVL, rel), 'w', encoding='utf-8').write(s))
    # config.js：資料換掉，函式照舊
    src = replace_literals(rd('config.js'), {'GAME_CONFIG': G, 'ASSETS': ASSETS, 'ASSET_VER': ASSET_VER, 'ENEMY_IDLE': ENEMY_IDLE})
    put('config.js', src)
    put('script/enemies.js', replace_literals(rd('script/enemies.js'), {'ENEMIES': ENEMIES}))
    put('script/speakers.js', replace_literals(rd('script/speakers.js'), {'SPEAKERS': SPEAKERS, 'ART': ART}))
    put('script/eyefx.js', replace_literals(rd('script/eyefx.js'), {'EYEFX': EYEFX}))
    put('script/blink.js', replace_literals(rd('script/blink.js'), {'BLINK': BLINK}))
    put('script/mainScript.js', replace_literals(rd('script/mainScript.js'), {'MAIN_SCRIPT': {}}).replace("MAIN_ENTRY = 'dungeon_chase'", "MAIN_ENTRY = ''"))
    tw = rd('script/town.js')
    for nm in ('DRAGON_LINES', 'OUTING', 'DINE', 'TOWNS'): tw = replace_literals(tw, {nm: {}})
    tw = replace_literals(tw, {'QUEST_LOCK': []})
    put('script/town.js', tw)
    # 背景索引（區域資料夾 → 檔名）：只留追蹤時真的抓過的背景
    bgs = {}
    for r in trace_res:
        m = re.search(r'resources/background/([^/]+)/([^/?#]+)\.[a-z0-9]+', r)
        if m: bgs.setdefault(m.group(1), set()).add(m.group(2).lower())
    put('script/bg_index.js', replace_literals(rd('script/bg_index.js'), {'G': {d: sorted(v) for d, v in bgs.items()}}, exported=False))
    put('script/shopcards.js', replace_literals(rd('script/shopcards.js'), {'SHOP_CARDS': {}}))
    ev = rd('script/evaluation.js')
    for nm in re.findall(r'(?m)^export const ([A-Z_]+)\s*=\s*[\[{]', ev): ev = replace_literals(ev, {nm: [] if re.search(r'export const %s\s*=\s*\[' % nm, ev) else {}})
    put('script/evaluation.js', ev)
    pr = rd('script/progress.js')
    for nm in re.findall(r'(?m)^export const ([A-Z_0-9]+)\s*=\s*[\[{]', pr):
        pr = replace_literals(pr, {nm: [] if re.search(r'export const %s\s*=\s*\[' % re.escape(nm), pr) else {}})
    for nm in re.findall(r'(?m)^const ([A-Z_0-9]+)\s*=\s*[\[{]', pr):
        try: pr = replace_literals(pr, {nm: [] if re.search(r'(?m)^const %s\s*=\s*\[' % re.escape(nm), pr) else {}}, exported=False)
        except (KeyError, ValueError): pass
    put('script/progress.js', pr)
    # 城鎮／旅店／整備／存檔：挑戰不會開 ⇒ 同名的空函式
    for rel in ('modules/town.js', 'modules/inn.js', 'modules/gear.js', 'modules/save.js'):
        names = re.findall(r'(?m)^export (?:async )?function ([A-Za-z_0-9]+)', rd(rel))
        put(rel, '// 挑戰試玩版：空殼（%s 在試玩版不存在）\n' % rel + ''.join('export function %s(){}\n' % n for n in names))
    # 劇本譯文（西文）＝整份劇情的翻譯 ⇒ 試玩版不提供西文：不載那兩張表（也就沒有頂層 await）
    st = rd('i18n/scriptTr.js')
    st, n1 = re.subn(r"const AVAILABLE = \[[^\]]*\];", "const AVAILABLE = [];", st)
    st, n2 = re.subn(r"const \[S_TAB, U_TAB\] = has \? await[^\n]*", "const [S_TAB, U_TAB] = [null, null];", st)
    # ⚠ 用變數拼路徑的動態 import 也要拿掉：esbuild 會把整個資料夾符合的檔案都打包進來（實測整份西文劇本被帶進去）
    st, n3 = re.subn(r"const load = \(dir\) => import\([^\n]*\n[^\n]*\n", "const load = () => Promise.resolve(null);\n", st)
    assert n1 == 1 and n2 == 1 and n3 == 1, 'scriptTr.js 的寫法變了'
    put('i18n/scriptTr.js', st)
    # story.js（劇情播放器，程式照用）：開機預載的音效表剪掉帶劇情角色的那些
    sj = rd('modules/story.js'); a, b = literal_span(sj, 'SE_FILES', exported=False)
    ses = [x for x in re.findall(r"'([^']+)'", sj[a:b]) if not has_id(x, BL)]
    put('modules/story.js', sj[:a] + json.dumps(ses) + sj[b:])
    # main.js：管理人手勢整段拿掉（開機還原也一起）
    mj = rd('main.js')
    mj, n = re.subn(r'\(function testUnlockGesture\(\)\{', '(function testUnlockGesture(){ return;', mj); assert n == 1
    put('main.js', mj)
    return ASSETS

def strip_data(rel):
    s = rd(rel)
    if rel == 'config.js':
        for nm in ('GAME_CONFIG', 'ASSETS', 'ASSET_VER', 'ENEMY_IDLE', 'HITFX', 'HOME_IMG', 'HOME_SFX'):
            try: a, b = literal_span(s, nm); s = s[:a] + '{}' + s[b:]
            except (KeyError, ValueError): pass
    return s

def CODE_FILES():
    out = ['main.js', 'audio.js', 'state.js', 'i18n.js', 'telemetry.js', 'config.js']
    out += ['modules/' + f for f in os.listdir(os.path.join(ROOT, 'modules')) if f.endswith('.js') and f not in ('town.js', 'inn.js', 'gear.js', 'save.js')]
    return out

# ───────────────────────── 打包 ─────────────────────────
BUNDLE_MJS = r"""
import * as esbuild from 'esbuild';
import fs from 'fs'; import path from 'path';
const [ROOT, OVL, OUT] = process.argv.slice(2);
const overlay = { name:'overlay', setup(b){
  b.onLoad({ filter:/\.js$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    const o = path.join(OVL, rel);
    if(fs.existsSync(o)) return { contents: fs.readFileSync(o, 'utf8'), loader:'js', resolveDir: path.dirname(args.path) };
    return null;
  });
}};
await esbuild.build({ entryPoints:[path.join(ROOT,'main.js')], bundle:true, format:'esm', minify:true, legalComments:'none',
  sourcemap:false, target:'es2020', charset:'utf8', outfile: path.join(OUT,'app.js'), plugins:[overlay], logLevel:'warning' });
for(const css of ['style.css','css/lootsheet.css']){
  const r = await esbuild.build({ entryPoints:[path.join(ROOT,css)], bundle:false, minify:true, legalComments:'none', charset:'utf8', write:false, loader:{'.css':'css'} });
  fs.mkdirSync(path.dirname(path.join(OUT,css)), { recursive:true });
  fs.writeFileSync(path.join(OUT,css), r.outputFiles[0].text);
}
"""

def bundle():
    if os.path.isdir(DIST): shutil.rmtree(DIST)
    os.makedirs(DIST)
    mjs = os.path.join(HERE, 'build', 'bundle.mjs'); io.open(mjs, 'w', encoding='utf-8').write(BUNDLE_MJS)
    subprocess.run(['node', mjs, ROOT, OVL, DIST], check=True, cwd=HERE)

def build_html():
    s = rd('index.html')
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)                                    # 註解全拿掉
    s = re.sub(r'<span class="cl-use">.*?</span>', '', s, flags=re.S)                  # BGM Credit 的「用在哪裡」（劇情地名／角色）
    s = re.sub(r'<script type="importmap">.*?</script>', '', s, flags=re.S)            # 已打包，不需要 importmap
    s = re.sub(r'<script type="module" src="main\.js\?v=\d+"></script>', '<script type="module" src="app.js"></script>', s)
    s = re.sub(r"\s*if\(\[[^\]]*\]\.indexOf\(l\)>=0\) document\.write\([^\n]*\n", '\n', s)  # 劇本譯文（整份劇情的翻譯）不載
    io.open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(s)
    for f in ('orientation.js', 'manifest.webmanifest'):
        if os.path.exists(os.path.join(ROOT, f)): shutil.copy(os.path.join(ROOT, f), os.path.join(DIST, f))

def copy_assets(ASSETS, trace_res, D, BL):
    """素材＝（精簡後的資產表有指名的）∪（追蹤時真的抓過、而且不是被剪掉的資產）∪（CSS／HTML 直接引用、而且抓過的）。"""
    clean = lambda p: re.sub(r'[?#].*$', '', str(p or '')).lstrip('./')
    dropped = {clean(v) for k, v in D['ASSETS'].items() if k not in ASSETS}
    files = {clean(v) for v in ASSETS.values() if v}
    for r in trace_res:
        p = clean(re.sub(r'^https?://[^/]+/', '', r))
        if p and not p.endswith(('.js', '.html', '.css', '.webmanifest')) and p not in dropped and not p.startswith(('tools/', 'flight/')): files.add(p)
    # 打包後的程式／CSS／HTML 裡直接寫死的素材路徑（戰鬥特效預熱、CSS 背景圖…）
    for f in ('app.js', 'style.css', 'css/lootsheet.css', 'index.html'):
        fp = os.path.join(DIST, f)
        if os.path.exists(fp):
            for m in re.findall(r'(resources/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|m4a|mp3|mp4|webm|gif|svg|ttf|otf|woff2?))', io.open(fp, encoding='utf-8').read()):
                files.add(m)
    files = {p for p in files if not has_id(p, BL)}
    n = 0; miss = []
    for p in sorted(files):
        src = os.path.join(ROOT, p)
        if not os.path.isfile(src): miss.append(p); continue
        dst = os.path.join(DIST, p)
        if os.path.exists(dst): continue                                  # 打包產生的（壓縮過的 CSS 等）不要被原檔蓋回去
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy(src, dst); n += 1
    print('素材 %d 個（缺 %d）' % (n, len(miss)))
    return files

# ───────────────────────── 敏感字串掃描 ─────────────────────────
def sentinels(D, kept_names):
    S = set()
    def add(s):
        if isinstance(s, str):
            s = s.strip()
            if len(s) >= 2 and s not in kept_names and not re.fullmatch(r'[\x00-\x7f]{0,3}', s): S.add(s)
    for k, v in D['SPEAKERS'].items(): add((v or {}).get('name'))
    for k in D['ART']: S.add(k) if len(k) >= 4 and k not in ('renee',) else None
    for ch in D['CHAPTERS'] or []: add(ch.get('name')); add(ch.get('sub'))
    for tid, t in (D['TOWNS'] or {}).items():
        add(t.get('name'))
        for nid, nd in (t.get('nodes') or {}).items(): add((nd or {}).get('name'))
    lines = []
    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get('text'), str) and len(o['text']) >= 8: lines.append(o['text'])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(D['MAIN']); walk(D['TOWNS'])
    for l in lines[::7][:400]: S.add(l[:12])
    for k, e in D['ENEMIES'].items():
        if k not in kept_names: add((e or {}).get('name'))
    for k, p in D['G']['partners'].items():
        if k != PARTNER and isinstance(p, dict): add(p.get('name'))
    return sorted(S, key=len, reverse=True)

def scan(D, kept_names, BL):
    sents = sentinels(D, kept_names)
    hits = []
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            p = os.path.join(dp, f); rel = os.path.relpath(p, DIST).replace(os.sep, '/')
            hid = has_id(rel, BL)
            if hid: hits.append((rel, '（檔名）' + hid))
            if f.endswith(('.js', '.css', '.html', '.json', '.webmanifest')):
                t = io.open(p, encoding='utf-8', errors='ignore').read()
                for s in sents:
                    if not s.isascii() and s in t: hits.append((rel, s))
    return sents, hits

# 試玩版本來就看得到的字（職稱／亂入戰／亂入時的監察官／舊版挑戰搭檔）
ALLOW = {'監察官', '璐娜', '亂入者 · ???', '馬季諾'}
def redact(sents):
    """程式碼裡寫死、試玩版走不到的劇情字串（好感統計表的人名、除錯訊息、BGM 用途表…）→ 換成「…」。
    ⚠ 只動打包後的 app.js，主程式不碰；換了什麼一律印出來給人看。"""
    p = os.path.join(DIST, 'app.js'); t = io.open(p, encoding='utf-8').read(); log = []
    for x in sents:
        if x.isascii() or x in ALLOW: continue
        n = t.count(x)
        if n: t = t.replace(x, '…'); log.append('%s×%d' % (x, n))
    io.open(p, 'w', encoding='utf-8').write(t)
    print('程式碼內遮掉的劇情字串：', '、'.join(log) if log else '（無）')

# ───────────────────────── 主流程 ─────────────────────────
def build(dumps):
    out, errs = browser_eval(ROOT, 'tools/challenge_build/blank.html', DUMP_JS)
    if errs: print('[讀資料] 頁面錯誤：', errs[:3])
    D = json.loads(out)
    trace_res = set()
    for d in dumps: trace_res |= set(json.load(io.open(d, encoding='utf-8'))['res'])
    if os.path.isdir(OVL): shutil.rmtree(OVL)
    G0 = D['G']
    keep_ids = {PARTNER, G0['defaultInspector'], G0['bossInspector']} | set(G0['lineup']) | {G0['currentEnemy'], G0['intruder']['enemy'], G0['tutorial']['enemyKey']}
    BL = story_ids(D, keep_ids)
    ASSETS = build_overlays(D, trace_res, BL)
    bundle(); build_html()
    copy_assets(ASSETS, trace_res, D, BL)
    G = D['G']
    kept = {G['enemies'][k]['name'] for k in (set(G['lineup']) | {G['currentEnemy'], G['intruder']['enemy'], G['tutorial']['enemyKey']}) if k in G['enemies']}
    kept |= {G['partners'][PARTNER]['name']} | {G['inspectors'][k]['name'] for k in (G['defaultInspector'], G['bossInspector'])}
    kept |= {'renee'}
    kept |= ALLOW
    redact(sentinels(D, kept))
    sents, hits = scan(D, kept, BL)
    print('敏感字串 %d 條，命中 %d 處' % (len(sents), len(hits)))
    for rel, s in hits[:80]: print('  ✗', rel, '：', s[:40])
    return 1 if hits else 0

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'trace-html': trace_html()
    elif cmd == 'build': sys.exit(build(sys.argv[2:]))
    else: print('usage: build.py trace-html | build <dump.json…>')

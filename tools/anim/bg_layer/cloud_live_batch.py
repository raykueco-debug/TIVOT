"""野外／遺蹟：影片裡的雲改成遊戲內程式跑（11-24 Ray：「其他還在跑影片的雲也改成程式跑」）。
作法＝守城戰那一套（war_run.py 的 WAR_EXPORT）：天空底＋遮罩＋遠中近三層程式雲；地面照舊播原本那支影片（樹葉／布／水的動態留著），
只有天空那一塊被程式雲蓋掉。天空遮罩不找 GPT：用 bgchk 精修過的 notes/<格>/refined/sky_alpha.webp 合成一張洋紅 __cut。
格子＝notes 裡標「雲湧動」、而且 script/bg_anim.js 有影片的那幾格（CELLS 可手動排除）。
用法：python cloud_live_batch.py [格名...]   ／  --emit 把結果寫進 script/bg_fx.js 的 ⟨cloud-live⟩ 段"""
import json, os, re, glob, shutil, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
BG = os.path.join(ROOT, 'resources', 'background')
LG = os.path.join(BG, '_layers_gpt')
SKIP = set('''lake_cave_day lake_fallbase_day'''.split())   # 水蝕洞幾乎沒有天空；瀑布底的天空寫在 bg_fx.js 自己那一列（有水面／水花）。11-25 其餘鏡湖、峽谷吊橋、平原枯木、落水崖改 GPT 重摳（--gpt 那條路）


def cells():
    anim = dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', open(os.path.join(ROOT, 'script', 'bg_anim.js'), encoding='utf8').read()))
    out = {}
    for p in glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json')):
        d = json.load(open(p, encoding='utf8')); f = d.get('file', '')
        k = os.path.basename(f).rsplit('.', 1)[0].lower()
        if k in SKIP or k not in anim: continue
        if not any('雲' in c.get('text', '') for c in d.get('colors', [])): continue
        ra = os.path.join(os.path.dirname(p), 'refined', 'sky_alpha.webp')
        if not os.path.exists(ra): continue
        out[k] = dict(img=os.path.join(BG, f), alpha=ra, anim=os.path.dirname(anim[k]).replace('resources/background/anim/', ''))
    return out


def prep(k, c):
    """原圖 → _src/<k>.png；原圖＋天空塗洋紅 → out/cloud/<k>__cut.png（war_run 認這個當天空遮罩）"""
    im = Image.open(c['img']).convert('RGB')
    a = Image.open(c['alpha']); a = (a.getchannel('A') if a.mode == 'RGBA' else a.convert('L')).resize(im.size, Image.LANCZOS)
    os.makedirs(os.path.join(LG, '_src'), exist_ok=True); os.makedirs(os.path.join(LG, 'out', 'cloud'), exist_ok=True)
    im.save(os.path.join(LG, '_src', k + '.png'))
    m = np.array(a) > 127; arr = np.array(im); arr[m] = [255, 0, 255]
    Image.fromarray(arr).save(os.path.join(LG, 'out', 'cloud', k + '__cut.png'))


def run(k, c):
    prep(k, c)
    out = os.path.join(BG, 'anim', c['anim'], 'live')   # 子資料夾：舊的同名天空檔（峽谷 aba 版、落水崖）不會被蓋掉
    env = dict(os.environ, WAR_EXPORT=out, WAR_STATIC='1', WAR_SMOKE='', WAR_NOSUN='1', PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, '-X', 'utf8', 'war_run.py', k, '--recomp'], cwd=HERE, env=env, capture_output=True, text=True, encoding='utf8', errors='replace')
    ok = '即時素材' in (r.stdout + r.stderr)
    print(k, 'ok' if ok else 'FAIL ' + (r.stderr or r.stdout)[-400:], flush=True)
    sm = os.path.join(out, k + '_smoke.webp')
    if ok and os.path.exists(sm): os.remove(sm)   # 野外沒有煙柱，圖集是自動找的副產品（剛產生、沒入版控，直接丟）
    return ok


def emit():
    """anim/<區>/live/<k>_live.json 全部寫進 ⟨cloud-live⟩ 段（bgchk 精修遮罩那批＋11-25 GPT 重摳那批：鏡湖／峽谷吊橋／平原枯木／落水崖／帝都）"""
    rows = []
    for p in sorted(glob.glob(os.path.join(BG, 'anim', '*', 'live', '*_live.json'))):
        k = os.path.basename(p)[:-len('_live.json')]; area = os.path.basename(os.path.dirname(os.path.dirname(p)))
        if k in SKIP: continue
        j = json.load(open(p, encoding='utf8'))
        if j.get('sky_frac', 1) < 0.01: continue
        o = [f"bottom: {j.get('bottom') or 0.4}"] + ([] if 'sun' in j['files'] else ['sun: false'])
        rows.append(f"  {k}: LIVE('{area}/live/')('{k}', {{ {', '.join(o)} }}).sky,")
    p = os.path.join(ROOT, 'script', 'bg_fx.js'); s = open(p, encoding='utf8').read()
    a, b = s.index('  /* ⟨cloud-live⟩'), s.index('  /* ⟨/cloud-live⟩ */')
    s = s[:a] + '  /* ⟨cloud-live⟩ 以下由 tools/anim/bg_layer/cloud_live_batch.py --emit 自動產生，不要手改 */\n' + '\n'.join(rows) + '\n' + s[b:]
    open(p, 'w', encoding='utf8').write(s); print('emit', len(rows), '格')


if __name__ == '__main__':
    if '--emit' in sys.argv: emit()
    else:
        C = cells(); names = [a for a in sys.argv[1:] if not a.startswith('--')] or sorted(C)
        if '--list' in sys.argv:
            for k in sorted(C): print(k, C[k]['anim'])
            print(len(C))
        else:
            for k in names: run(k, C[k])

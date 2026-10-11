"""低於 2 秒的 CI 重跑成 5 秒（81 格 16fps）原片，給 Ray 剪。A→B 一鏡到底，提示詞要大位移、躍動感。
輸出 out/ci5s/<名>_5s/，log：out/ci5s_batch.log。每支之間歇 60 秒讓顯卡休息。
用法：python batch_ci5s.py [只跑的鍵 …]
"""
import os, subprocess, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
R = os.path.normpath(os.path.join(HERE, '..', '..', 'TIVOT', 'resources', 'ci'))
L = os.path.join(R, 'layers')
PREP = os.path.join(HERE, 'out', 'ci5s', '_in'); os.makedirs(PREP, exist_ok=True)
LOG = os.path.join(HERE, 'out', 'ci5s_batch.log')

def on_black(src, name):
    """ci 模式直接吃整張 RGB；透明圖先鋪黑底（不然透明處會是亂色）。"""
    im = Image.open(src).convert('RGBA'); bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
    p = os.path.join(PREP, name + '.png'); bg.convert('RGB').save(p); return p

def copy_as(src, name):
    p = os.path.join(PREP, name + '.png'); Image.open(src).convert('RGB').save(p); return p

DYN = '動作幅度很大、充滿躍動感，身體在畫面中有明顯的位移與重心移動，有蓄力、爆發、過衝再回彈的節奏。'
TAIL = '鏡頭固定。動漫風格，賽璐珞上色，作畫張力強、動作誇張有力。'
NOFX = '沒有槍火、沒有子彈、沒有血。'

JOBS = {
 'cec_return': lambda: dict(mode='ci',
    a=os.path.join(L, 'cecilie_return', 'cec_return_A3.png'), b=os.path.join(L, 'cecilie_return', 'cec_return_B_clean.png'),
    lora='BounceHighWan2_2.safetensors:1.3', lora_low='BounceLowWan2_2.safetensors:1.3',
    prompt='暗色背景前，一位紅色長髮、胸部豐滿、穿黑金修女服與白色金邊披肩的修女，仰角鏡頭。' + DYN +
           '她原本閉著眼睛、頭低垂、身體往下沉、右手臂垂在身側下方；接著猛然睜眼抬頭，整個身體往上彈起伸展，右手臂從下方往上甩出一道很大的弧線，'
           '一路高高舉起、食指筆直指向天空，身體跟著揮臂大幅度往上拉長、往一側扭轉，胸部隨著身體的動作自然地上下彈動、晃動。'
           '金色的聖光從掌心與全身爆發湧出，一條條明亮的金色光帶沿著手臂劃過的弧線捲起、螺旋般往指尖高速竄升，夾帶細小的金色光點。'
           '長髮與寬大的袖子被動作甩起、大幅度飄揚。' + TAIL + 'her breasts are bouncing.'),
 'br_torsten': lambda: dict(mode='idle',
    a=os.path.join(L, 'torsten_bulletrain', 'wan_in', 'A2.png'), b=os.path.join(L, 'torsten_bulletrain', 'wan_in', 'C_nc.png'),
    prompt='一位穿黑色金邊立領神父制服的黑髮男子站在純綠色背景前，仰角鏡頭由下往上拍。' + DYN +
           '他從弓身低頭、重心壓低的蓄力姿勢猛然挺身抬頭，整個上半身大幅往後仰再往前壓，雙臂從身體兩側用力甩起畫出大弧線，兩把手槍從畫面左右兩側甩進畫面，'
           '衣襬被動作甩開，接著身體往鏡頭方向前傾逼近，雙手持槍對準鏡頭、低頭俯視鏡頭鎖定。嘴巴保持閉著。'
           '畫面上沒有飛舞的彈殼，沒有槍火、沒有煙、沒有火花、沒有任何光效。背景始終是純綠色。' + TAIL),
 'nireload': lambda: dict(mode='ci',
    a=on_black(os.path.join(L, 'anya_nightmarereload', 'anya_A.png'), 'nr_anya_A'), b=os.path.join(L, 'anya_nightmarereload', 'anya_B_on_black.png'),
    prompt='純黑背景前，一位紫色長髮、戴金色髮箍、穿黑色金邊斗篷與白色洋裝的少女。' + DYN +
           '她原本身體前傾蜷起、低頭，接著猛然往上挺身、頭往後甩再抬眼瞪向鏡頭，整個上半身大幅扭轉、往鏡頭逼近，'
           '紫色的夢魘火焰從她身上爆發、像氣浪一樣往外猛烈翻騰捲起，長髮與斗篷被氣浪大幅度往上掀起、劇烈飄動。' + TAIL),
 'sorana_supply': lambda: dict(mode='idle',
    a=os.path.join(L, 'sorana_supply', 'sorana_A.png'), b=os.path.join(L, 'sorana_supply', 'sorana_B.png'),
    lora='zxtp_wan22_bb_high.safetensors:0.8',
    prompt='一位白色短髮、褐色皮膚、胸部豐滿、穿白色金邊民族服飾的女戰士，站在純綠色背景前。' + DYN +
           '她原本手伸到腰後握著彈匣、身體壓低扭向一側；接著整個身體大幅轉身、往前跨步，手臂用力把彈匣往後方遞出甩出，'
           '上半身隨轉身大幅扭轉、重心從一腳移到另一腳，胸部隨著身體的大動作自然地上下彈動、晃動，白色腰布、流蘇與串珠被甩起大幅度飄動。'
           '背景始終是純綠色。' + NOFX + TAIL + 'her breasts are bouncing.'),
 'sorana_predator': lambda: dict(mode='ci',
    a=copy_as(os.path.join(R, 'ci_sorana_predator_start.webp'), 'predator_A'), b=os.path.join(R, 'ci_sorana_predator.jpg'),
    prompt='一位白色短髮、綠色眼睛、褐色皮膚、胸部豐滿的女戰士，嘴裡咬著匕首、雙手指間夾滿飛刀，仰角鏡頭，背景是暗色的速度線與光點。' + DYN +
           '她像撲向獵物的野獸，整個人先往後縮、壓低身體蓄力，接著猛然往鏡頭方向撲過來，身體大幅往前衝、逼近畫面，雙臂交叉往外甩開飛刀再收回，'
           '胸部隨著身體的大動作自然地上下彈動、晃動，白色短髮、腰布、流蘇與串珠被衝勢甩起大幅度飄動。嘴裡一直咬著匕首。' + TAIL + 'her breasts are bouncing.'),
 'sorana_obe': lambda: dict(mode='ci',
    a=copy_as(os.path.join(R, 'ci_sorana_obe_start.webp'), 'sorana_obe_A'), b=os.path.join(R, 'ci_sorana_obe.webp'),
    prompt='一位白色短髮、綠色眼睛、褐色皮膚、胸部豐滿的女戰士，仰角鏡頭，背景是暗色的速度線。' + DYN +
           '她伸手往腿上的刀套去摸飛刀，發現飛刀已經用完，整個人嚇了一跳往後彈開、身體大幅度往後仰再往前踉蹌，'
           '一隻手慌張地在刀套上拍摸、另一隻手往上甩，嘴巴張開露出驚慌的表情，胸部隨著身體的大動作自然地上下彈動、晃動，短髮與白色腰布被甩起大幅度飄動。' + TAIL + 'her breasts are bouncing.'),
 'anya_lucid': lambda: dict(mode='ci',
    a=copy_as(os.path.join(HERE, 'out', '_gameci', 'ci_anya_luciddream_v3', 'frame_000.webp'), 'lucid_A'), b=os.path.join(R, 'ci_anya_luciddream.webp'),
    prompt='暗色背景前，一位銀紫色長髮編辮子、戴髮箍、穿黑色洋裝與白色蓬袖的少女。' + DYN +
           '她原本雙手交握在胸前、低頭閉眼，接著猛然睜眼，整個身體往鏡頭方向大幅前傾逼近，雙手用力往鏡頭推出、五指張開伸向鏡頭，'
           '紅色的夢境氣浪從她身後爆發、像環狀衝擊波一樣往外高速旋轉擴散，長髮與辮子被氣浪大幅度往後掀起、劇烈飄動。' + TAIL),
}

def run(key):
    j = JOBS[key]()
    cmd = [PY, os.path.join(HERE, 'tivot_wan.py'), '--mode', j['mode'], '--files', j['a'], '--end', j['b'],
           '--length', '81', '--seed', '7', '--out', os.path.join(HERE, 'out', 'ci5s'), '--suffix', '_5s', '--prompt', j['prompt']]
    cmd += ['--fps', '16']   # 全 81 格（預設 8 會隔格抽）
    if j.get('lora'): cmd += ['--lora', j['lora']]
    if j.get('lora_low'): cmd += ['--lora-low', j['lora_low']]
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(f'\n=== {key} {time.strftime("%H:%M:%S")}\n'); f.flush()
        subprocess.run(cmd, cwd=HERE, stdout=f, stderr=subprocess.STDOUT, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})

if __name__ == '__main__':
    keys = sys.argv[1:] or list(JOBS)
    for i, k in enumerate(keys):
        if i: time.sleep(60)
        run(k)
    with open(LOG, 'a', encoding='utf-8') as f: f.write('\n全部完成\n')

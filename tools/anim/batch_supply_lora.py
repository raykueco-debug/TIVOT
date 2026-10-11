"""索拉娜補給：同一組 A/B／提示詞／seed，每個乳搖 LoRA 跑一版比較（Ray 2026-10-10）。
log：out/ci5s_lora_batch.log；輸出 out/ci5s/sorana_A_turn6_<tag>/
"""
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
L = r'C:\Users\User\Desktop\TIVOT\resources\ci\layers\sorana_supply'
LOG = os.path.join(HERE, 'out', 'ci5s_lora_batch.log')
PROMPT = ('女戰士站在純綠色背景前。戰鬥，躍出，轉身微笑，把兩個彈匣往後給viewer。頭髮與衣服飄動，安靜的微笑，胸部自然晃動。'
          '鏡頭固定，背景始終是純綠色。動漫風格，賽璐珞上色。her breasts are bouncing naturally')
RUNS = [  # (tag, High, Low)
 ('L1_zxtpbb06',   'zxtp_wan22_bb_high.safetensors:0.6', None),
 ('L2_bounce10',   'BounceHighWan2_2.safetensors:1.0', 'BounceLowWan2_2.safetensors:1.0'),
 ('L3_motto08',    'zxtp_wan22_m0tt0_high.safetensors:0.8', 'zxtp_wan22_m0tt0_low.safetensors:0.8'),
 ('L4_btest08',    'bounce_test_HighNoise-000005.safetensors:0.8', 'bounce_test_LowNoise-000005.safetensors:0.8'),
 ('L5_bwalk08',    'BouncyWalk02_HighWan2_2-000048.safetensors:0.8', 'BouncyWalk02_LowWan2_2-000048.safetensors:0.8'),
 ('L6_boobphys08', 'BoobPhysics_WAN_v7.safetensors:0.8', None),
 ('L7_bounceV08',  'bounceV_01.safetensors:0.8', None),
]
for k, (tag, hi, lo) in enumerate(RUNS):
    if k: time.sleep(30)
    cmd = [PY, '-W', 'ignore', os.path.join(HERE, 'tivot_wan.py'), '--mode', 'idle', '--files', os.path.join(L, 'sorana_A_turn6.png'),
           '--end', os.path.join(L, 'sorana_B.png'), '--length', '81', '--seed', '7', '--fps', '16', '--lora', hi,
           '--out', os.path.join(HERE, 'out', 'ci5s'), '--suffix', '_' + tag, '--prompt', PROMPT]
    if lo: cmd += ['--lora-low', lo]
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(f'\n=== {tag} {time.strftime("%H:%M:%S")}\n'); f.flush()
        subprocess.run(cmd, cwd=HERE, stdout=f, stderr=subprocess.STDOUT, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
with open(LOG, 'a', encoding='utf-8') as f: f.write('\n全部完成\n')

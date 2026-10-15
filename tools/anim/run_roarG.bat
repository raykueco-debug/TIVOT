@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
..\.venv\Scripts\python.exe tivot_wan.py --mode idle --files in_roar\sorana_roarG.png --out out\ci --fps 16 --length 33 --lora zxtp_wan22_bb_high.safetensors:1.0 --seed 7 --suffix _s7 --prompt "Anime illustration, smooth continuous animation. The dark-skinned woman with short white hair and bright vivid green eyes stands in front of a pure green background, shouting fiercely with excitement, her raised fist pumps once firmly, her shoulders and body heave with the shout, her short white hair and the white waist cloth and tassels flutter, her large breasts bounce with the motion. Her pose and position stay the same, her face stays the same, her eyes stay bright green. Camera completely static, background always pure green, the figure stays the same size. Anime style, cel shading, clean lineart." > out\roarG_s7.log 2>&1
echo ALLDONE > out\roarG_done.txt

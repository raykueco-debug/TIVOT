@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
..\.venv\Scripts\python.exe tivot_wan.py --mode idle --files in_dg\nouvelle_dg.png --out out\ci --length 49 --fps 16 --lora zxtp_wan22_bb_high.safetensors:1.0 --seed 7 --suffix _bb7 --prompt "Anime illustration, smooth continuous animation. The red-haired nun in white robes stands in front of a pure green background with her hands clasped in prayer at her chest. She starts calm with her eyes closed and slightly hunched, then her whole upper body jolts upward and straightens as she throws her head back slightly, opens her eyes wide and shouts desperately with all her strength, her large breasts bounce with the sudden movement. Golden light gathers on her body, glowing golden light patches spread across her white robes. Her short red hair and robes flutter strongly. Her hands stay clasped at her chest. Camera completely static, background always pure green, the figure stays the same size. Anime style, cel shading, clean lineart." > out\dg2.log 2>&1
..\.venv\Scripts\python.exe rekey_solid.py nouvelle_dg_7 out\ci\nouvelle_dg_bb7k >> out\dg2.log 2>&1
..\.venv\Scripts\python.exe comp_black_embers.py out\ci\nouvelle_dg_bb7k in_dg\nouvelle_dg.png dg_bb7 >> out\dg2.log 2>&1
..\.venv\Scripts\python.exe make_player.py >> out\dg2.log 2>&1
echo ALLDONE > out\dg2_done.txt

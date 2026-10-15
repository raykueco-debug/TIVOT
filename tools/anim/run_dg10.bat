@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
:w
rem
..\.venv\Scripts\python.exe tivot_wan.py --mode idle --files in_dg\nouvelle_dg3.png --end in_dg\nouvelle_dg3_B.png --out out\ci --length 49 --fps 16 --seed 7 --suffix _j3 --lora zxtp_wan22_bb_high.safetensors:0.3 --prompt "Anime illustration, smooth continuous animation. The red-haired nun in white robes stands in front of a pure green background. She starts hunched forward and curled up with her head bowed low, eyes closed, hands clasped tightly below her chest in prayer. Then her whole body straightens and rises up powerfully, she lifts her head, opens her eyes wide and shouts desperately with all her strength. As she straightens up, her clasped hands press deep into her soft breasts. Soft breasts, jelly breasts: her breasts are very soft and jelly-like, the hands sink into them and the soft flesh squishes and bulges around the hands, wobbling softly like jelly from the pressure; they do not swing side to side. Golden light gathers on her body, glowing golden light patches spread across her white robes. Her short red hair and robes flutter strongly. She wears no headband, no hair ribbon and no hair accessory. Her hands stay clasped at her chest. Camera completely static, background always pure green. Anime style, cel shading, clean lineart."  >> out\dg10.log 2>&1
..\.venv\Scripts\python.exe rekey_solid.py nouvelle_dg3_7 out\ci\nouvelle_dg3_j3k >> out\dg10.log 2>&1
..\.venv\Scripts\python.exe comp_black_embers.py out\ci\nouvelle_dg3_j3k in_dg\nouvelle_dg3.png dg3j_s7 >> out\dg10.log 2>&1
..\.venv\Scripts\python.exe fix_magenta.py out\ci\dg3j_s7 >> out\dg10.log 2>&1
C:\ffmpeg\bin\ffmpeg.exe -loglevel error -y -framerate 16 -i out\ci\dg3j_s7\frame_%%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an out\ci\dg3j_s7.mp4
..\.venv\Scripts\python.exe make_player.py >> out\dg10.log 2>&1
echo ALLDONE > out\dg10_done.txt
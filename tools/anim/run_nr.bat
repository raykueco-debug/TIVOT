@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
:w
if not exist out\dg3_done.txt ( timeout /t 15 /nobreak >nul & goto w )
..\.venv\Scripts\python.exe tivot_wan.py --mode ci --files in_nr\anya_nr.png --out out\ci --length 49 --fps 16 --seed 7 --suffix _a7 --prompt "Anime illustration, smooth continuous animation. Pure black background. From the very first frame, dark purple nightmare energy slowly rises and swirls up around the girl with long lavender hair, wisps of glowing violet flame and smoke drifting upward around her body and hair, gradually growing stronger. She starts curled up with her head bowed and eyes closed, hands clasped at her chest, then she slowly lifts her head, her body opens up, she opens her eyes and looks straight at the viewer and speaks to the viewer. Her long hair flows gently in the rising energy. Camera completely static, background always pure black. Anime style, cel shading, clean lineart." > out\nr.log 2>&1
..\.venv\Scripts\python.exe embers2.py out\ci\anya_nr_a7 out\ci\nr_a7 110 35 >> out\nr.log 2>&1
..\.venv\Scripts\python.exe tivot_wan.py --mode ci --files in_nr\anya_nr.png --end in_nr\anya_nr_B.png --out out\ci --length 49 --fps 16 --seed 7 --suffix _ab7 --prompt "Anime illustration, smooth continuous animation. Pure black background. From the very first frame, dark purple nightmare energy slowly rises and swirls up around the girl with long lavender hair, wisps of glowing violet flame and smoke drifting upward around her body and hair, gradually growing stronger. She starts curled up with her head bowed and eyes closed, hands clasped at her chest, then she slowly lifts her head, her body opens up, she opens her eyes and looks straight at the viewer and speaks to the viewer. Her long hair flows gently in the rising energy. Camera completely static, background always pure black. Anime style, cel shading, clean lineart." >> out\nr.log 2>&1
..\.venv\Scripts\python.exe embers2.py out\ci\anya_nr_ab7 out\ci\nr_ab7 110 35 >> out\nr.log 2>&1
..\.venv\Scripts\python.exe make_player.py >> out\nr.log 2>&1
echo ALLDONE > out\nr_done.txt

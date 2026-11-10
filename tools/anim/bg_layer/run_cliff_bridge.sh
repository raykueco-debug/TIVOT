#!/bin/bash
# 夏爾森林 斷崖邊：照卡耶爾斷橋那一支的作法（Ray 11-10「雲還是變成倒回 要用卡耶爾斷橋的方式出」）
# 每段 49 格、種子 505、A→B 先單獨生 49 格，再交 chain_loop 接 B→C→D→A
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
P="動漫風格的森林斷崖邊。樹葉草叢隨風搖曳；天空的雲與崖下的雲海緩緩翻湧流動。鏡頭完全固定不動，岩石、山壁、地面、樹幹都完全不動。動漫風格，賽璐珞上色。"
python -c "from PIL import Image;Image.open(r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background/forest/forest_cliff_day.webp').convert('RGB').resize((768,512),Image.LANCZOS).save(r'../../input/bg_shinier_forest_cliff_day.png')"
python -c "import bg_queue as Q,time
while Q.queue_busy(8188, True)==99: time.sleep(15)"
python bg_wan.py bg_shinier_forest_cliff_day.png bgl/shinier_forest_cliff_day_br_ab 49 "$P" 505 || exit 1
python chain_loop.py shinier_forest__cliff__day bgl/shinier_forest_cliff_day_br_ab 48 abcd_br "$P" --seed 505
echo ALLDONE

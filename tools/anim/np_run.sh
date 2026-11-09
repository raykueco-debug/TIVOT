# 用法：bash np_run.sh <鍵> <A路徑> <B路徑> <suffix> <FIT> <seedAB> <seedBA> "<AB動作>" "<BA動作>" "<共同尾句>"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
K=$1;A=$2;B=$3;S=$4;F=$5
W(){ env TIVOT_FIT=$F TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 $NP_EXTRA --out out/enemy_atk >> out/np_$K.log 2>&1; }
: > out/np_$K.log
W --files "$A" --end "$B" --length 49 --seed $6 --prompt "$8, springy elastic motion, ${10}" --suffix _${S}AB
W --files "$B" --end "$A" --length 33 --seed $7 --prompt "$9, springy rebound, ${10}" --suffix _${S}BA
an=$(basename "$A"); an=${an%.*}; bn=$(basename "$B"); bn=${bn%.*}
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/${an}_${S}AB out/enemy_atk/${bn}_${S}BA >> out/np_$K.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/np_$K.log

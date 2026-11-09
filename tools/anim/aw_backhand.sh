cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
N="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
T="the bright root point where the two wings meet at the bottom center stays perfectly fixed in place and never moves, the right wing stays spread and still, the flames constantly flowing and fluttering the whole time, never frozen, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_GEN=960x640 TIVOT_FIT=0.98 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --width 960 --out out/enemy_atk >> out/np_awbackhand.log 2>&1; }
: > out/np_awbackhand.log
W --files "$N/mon_np_anyawings_B_windup_canvas.png" --end "$N/mon_np_anyawings_B_backhand_canvas.png" --length 33 --seed 2171 --prompt "the coiled left flame wing, pulled all the way over to the right, whips back violently fast in a backhand slap: it swings from right to left with the back of the wing leading, sweeping right in front of the camera, huge and very close to the viewer, like a backhand slap to the viewer's face, strong horizontal motion blur, flames dragged into long trails, $T" --suffix _backhand
W --files "$N/mon_np_anyawings_B_backhand_canvas.png" --end "$N/mon_np_anyawings_A_canvas.png" --length 33 --seed 2172 --prompt "after the backhand slap the huge left flame wing pulls back away from the camera and settles spread open on the left side again, both wings returning to their open-wings pose, springy rebound, $T" --suffix _backhandBA
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/mon_np_anyawings_B_windup_canvas_backhand out/enemy_atk/mon_np_anyawings_B_backhand_canvas_backhandBA >> out/np_awbackhand.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/np_awbackhand.log

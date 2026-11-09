cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
N="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
T="the bright root point where the two wings meet at the bottom center stays perfectly fixed in place and never moves, the right wing stays spread and still, the flames constantly flowing and fluttering, never frozen, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_GEN=960x640 TIVOT_FIT=0.98 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --width 960 --out out/enemy_atk >> out/aw_bh_kf2.log 2>&1; }
: > out/aw_bh_kf2.log
W --files "$N/mon_np_anyawings_A_canvas.png" --end "$N/mon_np_anyawings_bh_kf1.png" --length 17 --seed 2301 --prompt "the left purple flame wing swings upward, rotating around the root point toward the right until it stands upright, $T" --suffix _t1
W --files "$N/mon_np_anyawings_bh_kf1.png" --end "$N/mon_np_anyawings_bh_kf2.png" --length 17 --seed 2302 --prompt "the upright left flame wing keeps rotating around the root over to the right side, leaning across in front of the right wing, coiling tension, $T" --suffix _t2
W --files "$N/mon_np_anyawings_bh_kf2.png" --end "$N/mon_np_anyawings_bh_kf3.png" --length 9 --seed 2303 --prompt "the coiled left flame wing whips back violently fast from right to left, laying flat and sweeping horizontally across the frame toward the camera with strong horizontal motion blur, $T" --suffix _t3
W --files "$N/mon_np_anyawings_bh_kf3.png" --end "$N/mon_np_anyawings_bh_kf4.png" --length 9 --seed 2304 --prompt "the sweeping left flame wing finishes its backhand slap, flinging out huge and close to the camera on the far left, flame trails dragging, $T" --suffix _t4
W --files "$N/mon_np_anyawings_bh_kf4.png" --end "$N/mon_np_anyawings_A_canvas.png" --length 25 --seed 2305 --prompt "after the backhand slap the huge left flame wing pulls back from the camera and settles back into its spread-open pose on the left, springy rebound, $T" --suffix _t5
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/aw_bh_kf2.log

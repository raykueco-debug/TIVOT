cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
N="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
T="the bright root point where the two wings meet at the bottom center stays perfectly fixed in place and never moves, the right wing stays spread and still, the flames constantly flowing and fluttering, never frozen, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_GEN=960x640 TIVOT_FIT=0.98 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --width 960 --out out/enemy_atk >> out/aw_chop_kf.log 2>&1; }
: > out/aw_chop_kf.log
W --files "$N/mon_np_anyawings_chopA_canvas.png" --end "$N/mon_np_anyawings_chop_kf1.png" --length 21 --seed 2401 --prompt "the left purple flame wing slowly rises and swings back over the top, arching backward over the root toward the upper right like a giant blade raised behind the head, building tension, $T" --suffix _c1
W --files "$N/mon_np_anyawings_chop_kf1.png" --end "$N/mon_np_anyawings_chop_kf2.png" --length 5 --seed 2402 --prompt "the arched-back left flame wing whips forward and starts slashing down diagonally with motion blur, $T" --suffix _c2
W --files "$N/mon_np_anyawings_chop_kf2.png" --end "$N/mon_np_anyawings_chop_kf3.png" --length 5 --seed 2403 --prompt "the left flame wing slashes all the way down to the lower right in front of the viewer like a blade chop, strong motion blur, $T" --suffix _c3
W --files "$N/mon_np_anyawings_chop_kf3.png" --end "$N/mon_np_anyawings_chop_kf4.png" --length 9 --seed 2404 --prompt "after the chop the left flame wing rebounds from the recoil, bouncing up halfway along a different arc toward the upper left, $T" --suffix _c4
W --files "$N/mon_np_anyawings_chop_kf4.png" --end "$N/mon_np_anyawings_chopA_canvas.png" --length 21 --seed 2405 --prompt "the rebounding left flame wing settles back into its spread-open pose on the left, springy, $T" --suffix _c5
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/aw_chop_kf.log

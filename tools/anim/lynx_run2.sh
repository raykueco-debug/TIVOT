cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
R="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
A="$R/mon_shinierforest_lynx_neutral.png"; S="$R/mon_shinierforest_lynx_B_hswipe.png"; P="$R/mon_shinierforest_lynx_B_pounce.png"
T="exactly four legs only, never more than four legs, the limb count never changes, its fur, ear tufts and tail keep moving and its body keeps breathing the whole time, never frozen, no light, no glow, no flash, no sparks, no energy effects, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_FIT=0.64 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/enemy_atk >> out/lynx2.log 2>&1; }
: > out/lynx2.log
W --files "$A" --end "$S" --length 49 --seed 6511 --prompt "a crouching forest lynx coils its shoulders for an instant, then explosively lifts its right front paw and sweeps it horizontally across in front of its chest from left to right, a fast flat sideways claw swipe parallel to the ground crossing the body, the other three paws stay planted, springy elastic motion, purely physical swipe, $T" --suffix _hswipeAB2
W --files "$S" --end "$A" --length 33 --seed 6512 --prompt "a crouching forest lynx finishes a sideways claw swipe and pulls its right front paw back, planting it on the ground and settling into its low snarling crouch, springy rebound, $T" --suffix _hswipeBA2
W --files "$A" --end "$P" --length 49 --seed 6513 --prompt "a crouching forest lynx sinks low and coils for an instant, then explosively springs and pounces straight at the camera, front body leaping up, mouth open snarling, both front paws reaching out with claws spread at the viewer, springy elastic motion, $T" --suffix _pounceAB2
W --files "$P" --end "$A" --length 33 --seed 6514 --prompt "a forest lynx in mid-pounce lands and recoils back, settling into its low snarling crouch, springy rebound, $T" --suffix _pounceBA2
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/mon_shinierforest_lynx_neutral_hswipeAB2 out/enemy_atk/mon_shinierforest_lynx_B_hswipe_hswipeBA2 out/enemy_atk/mon_shinierforest_lynx_neutral_pounceAB2 out/enemy_atk/mon_shinierforest_lynx_B_pounce_pounceBA2 >> out/lynx2.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/lynx2.log

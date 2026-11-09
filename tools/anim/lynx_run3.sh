R="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
A="$R/mon_shinierforest_lynx_neutral.png"; S="$R/mon_shinierforest_lynx_B_hswipe.png"; P="$R/mon_shinierforest_lynx_B_pounce.png"
T="exactly four legs only, never more than four legs, the limb count never changes, its fur, ear tufts and tail keep moving and its body keeps breathing the whole time, never frozen, no light, no glow, no flash, no sparks, no energy effects, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_GEN=720x720 TIVOT_FIT=0.64 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/enemy_atk >> out/lynx3.log 2>&1; }
: > out/lynx3.log
W --files "$A" --end "$P" --length 49 --seed 6513 --prompt "a crouching forest lynx sinks low and coils for an instant, then explosively springs and pounces straight at the camera, front body leaping up, mouth open snarling, both front paws reaching out with claws spread at the viewer, springy elastic motion, $T" --suffix _pounceAB3
W --files "$P" --end "$A" --length 33 --seed 6514 --prompt "a forest lynx in mid-pounce lands and recoils back, settling into its low snarling crouch, springy rebound, $T" --suffix _pounceBA3
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/mon_shinierforest_lynx_neutral_pounceAB3 out/enemy_atk/mon_shinierforest_lynx_B_pounce_pounceBA3 >> out/lynx3.log 2>&1

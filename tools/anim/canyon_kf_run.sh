# 卡耶爾山谷 KF（Ray 11-14 審閱提交 submit_canyonkf_20261114_215730）：natali rule，A→B 49 ＋ B→A 33，一個種子
# 輸入：resources/enemy/_neutral_refs/canyon_kf/wan/（已對色 kf_colormatch、對齊 kf_align_bbox）
# 3060：FLF（--end），不走 VACE。用法：bash tools/anim/canyon_kf_run.sh [只跑這些名字...]
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/canyon_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="idle motion keeps going, cloth and chains keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/canyon_kf.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/canyon_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
SEG(){ W --files "$D/$1" --end "$D/$2" --length $3 --seed $4 --prompt "$5, $T" --suffix "$6"; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"
want coffin   && { SEG coffin_A.png coffin_B.png 49 8101 "the coffin beetle lunges at the camera, both huge pincers swing forward" _AB; SEG coffin_B.png coffin_A.png 33 8102 "the coffin beetle pulls back its pincers and settles into its stance" _BA; }
want crab     && { SEG crab_A.png crab_B.png 49 8111 "the bone crab rears up and throws both pincers wide open to the sides" _AB; SEG crab_B.png crab_A.png 33 8112 "the bone crab closes its pincers and lowers back into its stance" _BA; }
want pilgrim  && { SEG pilgrim_A.png pilgrim_B.png 49 8121 "the pilgrim mass throws all its arms open and spreads its hands outward" _AB; SEG pilgrim_B.png pilgrim_A.png 33 8122 "the pilgrim mass draws its arms back in" _BA; }
want wyrm     && { SEG wyrm_A.png wyrm_B.png 49 8131 "the bell wyrm lunges its bell head straight at the camera, maw wide open" _AB; SEG wyrm_B.png wyrm_A.png 33 8132 "the bell wyrm pulls its bell head back and coils into its stance" _BA; }
want colossus && { SEG colossus_A.png colossus_B.png 49 8141 "the rock colossus throws its head back and roars at the sky, arms spread wide" _AB; SEG colossus_B.png colossus_A.png 33 8142 "the rock colossus lowers its head and arms back into its stance" _BA; }
want iron     && { SEG iron_N.png iron_W.png 33 8151 "the iron penitent heaves its huge mace up and winds up for a blow" _NW; SEG iron_W.png iron_D.png 33 8152 "the iron penitent smashes its mace down straight at the camera" _WD; SEG iron_D.png iron_N.png 33 8153 "the iron penitent lifts the mace back onto its shoulder and stands ready" _DN; }
want stilt    && { SEG stilt_N.png stilt_M.png 49 8161 "the stilt shade lunges and rakes one long claw diagonally down" _NM; SEG stilt_M.png stilt_N.png 33 8162 "the stilt shade pulls its claw back and returns to its crouched ready stance" _MN; }
want ribcage  && { SEG ribcage_A.png ribcage_B.png 49 8171 "the ribcage beast side-steps and swings its long neck around so its glowing mouth gapes at the camera" _AB; SEG ribcage_B.png ribcage_A.png 33 8172 "the ribcage beast swings its neck back and settles into its stance" _BA; }
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/canyon_kf/* >> $LOG 2>&1
echo ALLDONE >> $LOG

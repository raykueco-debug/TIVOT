# 賞金獵人 guild_hunter：受擊（胸口中彈後仰，Ray 11-21：「過，跑 Wan」）
# A→B 17 ＋ B→A 17（同開槍那支，格數壓到最少），一個種子；3060 FLF
# 輸入：hurtk_A/B（kf_colormatch 對色 hunter_A、kf_align_bbox 對齊）
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/hunter_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="coat and hair keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/hunter_kf.log; echo "=== $(date) hurt" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/hunter_kf >> $LOG 2>&1; }
W --files "$D/hurtk_A.png" --end "$D/hurtk_B.png" --length 17 --seed 9331 --prompt "the gunslinger is shot in the chest, his body snaps backward from the impact, gun arm flung up, head jerks back, grimacing in pain, $T" --suffix _AB
W --files "$D/hurtk_B.png" --end "$D/hurtk_A.png" --length 17 --seed 9332 --prompt "the gunslinger recovers from the hit, straightens up and aims the revolver at the camera again, $T" --suffix _BA
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/hunter_kf/hurtk_A_AB out/hunter_kf/hurtk_B_BA >> $LOG 2>&1
for d in out/hunter_kf/hurtk_A_AB out/hunter_kf/hurtk_B_BA; do n=hunter_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo HURTDONE >> $LOG

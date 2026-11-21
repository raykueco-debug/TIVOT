# 賞金獵人 guild_hunter：待機＋開槍（Ray 11-21：「B只要開槍就好 槍口微仰」「可以跑 F 越少越好」）
# A→B 17 ＋ B→A 17（格數壓到最少），一個種子；3060 FLF
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/hunter_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="coat and hair keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/hunter_kf.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/hunter_kf >> $LOG 2>&1; }
W --files "$D/fire_A.png" --end "$D/fire_B.png" --length 17 --seed 9311 --prompt "the gunslinger fires his revolver at the camera, sharp recoil kicks the gun up, $T" --suffix _AB
W --files "$D/fire_B.png" --end "$D/fire_A.png" --length 17 --seed 9312 --prompt "the gunslinger brings the revolver back down and aims at the camera again, $T" --suffix _BA
env TIVOT_GEN=480x720 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/hunter_A.png" --mode idle --loop --fps 16 --length 49 --seed 9301 --prompt "the gunslinger keeps his revolver aimed at the camera, deep breathing, chest rising and falling, torn long coat and hair swaying, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _idle --out out/hunter_kf >> $LOG 2>&1
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/hunter_kf/* >> $LOG 2>&1
for d in out/hunter_kf/*_AB out/hunter_kf/*_BA out/hunter_kf/*_idle; do n=hunter_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG

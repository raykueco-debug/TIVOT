# 伊甸古墓 攻擊 B：natali rule A→B 49 ＋ B→A 33，一個種子；3060 FLF
# Ray 11-22：「其他可以先跑WAN」（老鼠刪、車輪/詩班×2/石棺/鐵處女/跪罪者/鑄鐘者 重出 B、蒼白牡鹿待重轉透明，不在這批）
# 輸入：resources/enemy/_neutral_refs/tomb_kf/wan/（kf_colormatch 對色原圖、kf_align_bbox 對齊）
# 用法：bash tools/anim/tomb_kf_run.sh [只跑這些名字...]
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/tomb_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="idle motion keeps going, cloth and chains keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/tomb_kf.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/tomb_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=9500
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
R arch_warden      "the stone arch warden gathers force and slams both stone fists down at the camera" "the stone arch warden lifts its fists back and settles into its stance"
R slab_creeper     "the slab creeper lunges forward and snaps its skull jaws at the camera" "the slab creeper pulls its head back and settles behind its slab"
R chain_hanged     "the hanged corpse swings forward on its chains and rakes its claws at the camera, $NG" "the hanged corpse swings back on its chains and hangs ready"
R grave_censer     "the grave censer winds up and swings both censers forward at the camera" "the grave censer pulls the censers back and lets them sway"
R candelabra_fiend "the candelabra fiend raises its claw high and slashes it diagonally down across its body, $NG" "the candelabra fiend pulls its claw back and settles into its stance"
R reliquary_hand   "the giant reliquary hand lunges toward the camera and grabs down with all five fingers" "the giant hand opens its fingers and draws back into its stance"
R spiral_veil      "the spiral veil whips its cloth strips forward at the camera" "the spiral veil draws its cloth strips back and keeps swirling"
R shroud_widow     "the shroud widow spreads her shroud wide and lunges, both claws reaching at the camera, $NG" "the shroud widow folds her shroud back and settles into her stance"
R crypt_centipede  "the crypt centipede rears up and strikes down with its huge mandibles at the camera" "the crypt centipede lowers its body and coils back into its stance"
R crypt_hound      "the crypt hound crouches, lunges at the camera and bites" "the crypt hound pulls back and crouches into its stance"
R twin_skull_hound "the twin skull hound lunges at the camera and both skull heads bite" "the twin skull hound pulls back and crouches into its stance"
R vault_bat        "the vault bat dives at the camera and rakes with its claws, $NG" "the vault bat flaps back up and hovers in its stance"
R skull_cairn      "the skull cairn topples forward and its bony hands grab at the camera" "the skull cairn rocks back and settles into its pile"
R pall_bearers     "the pall bearers charge forward with the coffin at the camera, the lid flying open" "the pall bearers slow down, the lid falls shut, they settle back"
R tomb_bear        "the tomb bear rears up and pounces at the camera" "the tomb bear drops back down onto all fours into its stance"
# 11-22 Ray 審過重出的 B（詩班兩張先拿掉音波再跑，音波後期由程式加）
R ossuary_wheel     "the bone wheel turns toward the camera and rolls straight at it, crashing forward" "the bone wheel rolls back and turns to settle in its place"
R sarcoph_crawler   "the sarcophagus lid bursts open and the corpse inside lunges out grabbing at the camera, $NG" "the corpse sinks back into the sarcophagus and the lid closes"
R iron_maiden       "the iron maiden slams its doors shut and blood splatters out" "the iron maiden doors open again and it settles into its stance"
R kneeling_penitent "the kneeling penitent raises its head showing its sewn eyes and lunges with both claws at the camera, $NG" "the kneeling penitent lowers its head and kneels back into its stance"
R bellfounder       "the bellfounder lowers its shoulders and charges straight at the camera" "the bellfounder slows down, straightens up and settles into its stance"
R pallid_stag       "the pallid stag lowers its head and charges with its antlers at the camera" "the pallid stag lifts its head and steps back into its stance"
R choir_organ       "the choir organ opens its mouths wide and chants loudly, pipes trembling" "the choir organ closes its mouths and the chant fades"
R choir_pale        "the three pale nuns open their mouths wide and chant together" "the pale nuns close their mouths and the chant fades"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/tomb_kf/* >> $LOG 2>&1
for d in out/tomb_kf/*_AB out/tomb_kf/*_BA; do n=tomb_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG

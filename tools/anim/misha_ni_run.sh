cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
P="anime illustration, low angle shot, camera fixed, a white-haired young man in a black and white coat with a long cape stands holding a sword, a powerful shockwave of golden energy erupts and surges upward from below him, the glowing golden halo ring above his head rotates steadily, his fine soft white hair strands and his long cape and coat tails fly wildly upward in the rising blast, he breathes so his chest rises and falls, the cluster of golden light crystals in his raised left hand bursts and shatters outward into glowing shards that scatter into the air, golden sparks and embers fly upward"
for s in 7 77; do
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x1080 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files in_misha/ci_misha_ni.png --length 65 --fps 16 --width 720 --seed $s --out out/ci --suffix _burst$s --prompt "$P" 2>&1 | tail -1
echo '{"fps":16}' > out/ci/ci_misha_ni_burst$s/holds.json
done
python make_player.py >/dev/null 2>&1

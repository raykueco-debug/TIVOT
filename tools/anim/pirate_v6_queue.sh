# 常駐佇列：等前一個 runner 結束，之後每 20 秒掃一次 cells/，有新的人就跑，28 人都跑完才停
O="$1"
while ! grep -q ALLDONE "$O" 2>/dev/null; do sleep 10; done
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
while :; do
  n=$(ls -d out/pirate_atk_v6/sp*_L17 2>/dev/null | wc -l); [ "$n" -ge 28 ] && break
  bash pirate_v6.sh 1 2 3 4 5 6 7 8 | grep -v "^skip"
  sleep 20
done; echo QUEUE_DONE

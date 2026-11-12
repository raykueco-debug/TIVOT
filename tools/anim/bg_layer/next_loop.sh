#!/bin/bash
# 順序（Ray 11-12）：伊甸古墓 → 北方泊地（戰損版 13 張）→ GPT 已摳天空的格子
cd "$(dirname "$0")"
while ! grep -q DONE tomb_loop.log 2>/dev/null; do sleep 60; done
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8
for pass in 1 2; do
  for n in northport_cemetery_bf northport_east_bf northport_north_bf northport_port_bf northport_square_bf northport_west_bf \
           northport_church_bf northport_cityhall_bf northport_grocery_bf northport_guild_bf northport_gunstore_bf northport_hotel_bf northport_tavern_bf; do
    [ -f "out/${n}_war/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python war_run.py "$n"
  done
done
echo NP_DONE
export SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
for pass in 1 2; do
  for k in $(cat next_keys.txt); do
    b=${k//__/_}
    [ -f "out/${b}_sep_F/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python sep_run.py "$k"
  done
done
echo DONE

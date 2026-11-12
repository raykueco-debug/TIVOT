#!/bin/bash
# 白天場景（GPT 已摳天空）：等室內那批跑完再跑；聖物室沒有天空，當室內
cd "$(dirname "$0")"
while ! grep -q "^DONE" batch_next.log 2>/dev/null; do sleep 60; done
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
for k in belisar__forge__day belisar__greathall__day belisar__starroom__day belisar__stephall__day belisar__throne__day shinier_forest__glade__day shinier_forest__nest__day shinier_ruins__antechamber__day shinier_ruins__collapsed__day shinier_ruins__corridora__day shinier_ruins__corridorb__day shinier_ruins__crossway__day tomb__gate__day; do
  b=${k//__/_}; [ -f "out/${b}_sep_F/loop.mp4" ] && continue
  until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
  python sep_run.py "$k"
done
SEP_NOSKY=1 python sep_run.py belisar__offering__day
echo DONE

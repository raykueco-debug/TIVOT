#!/bin/bash
# Ray 11-16：貝利薩爾 5 格依 11-13 23:54 意見重跑；「排在敵人副理後跑完」⇒ 開跑前先等 GPU 與 8188 佇列連續閒 10 分鐘。不倒放。
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_REV=1 SEP_NOREV=1 SEP_SEED=505
python - <<'PY'
import time,subprocess,urllib.request,json
calm=0
while calm<60:   # 60×10 秒＝10 分鐘
    try:
        q=json.load(urllib.request.urlopen('http://127.0.0.1:8188/queue',timeout=5))
        busy=len(q.get('queue_running',[]))+len(q.get('queue_pending',[]))
        util=int(subprocess.run(['nvidia-smi','--query-gpu=utilization.gpu','--format=csv,noheader,nounits'],capture_output=True,text=True).stdout.split()[0])
        calm = calm+1 if (busy==0 and util<10) else 0
    except Exception: calm=0
    time.sleep(10)
print('GPU 連續閒 10 分鐘，開跑',flush=True)
PY
T='鏡頭完全固定不動。動漫風格，賽璐珞上色。'
SEP_SUFFIX=_F3 SEP_PROTECT_BOX='0.42,0,0.66,0.16;0.55,0.55,0.72,0.75' SEP_FPROMPT="動漫風格的背景。燭火搖曳閃動，垂掛的旗幟隨風輕輕飄動；中間的王座與台階完全不動。$T" python sep_run.py belisar__throne__day --recomp
SEP_SUFFIX=_F3 SEP_PROTECT_BOX='0,0,1,0.29' SEP_FPROMPT="動漫風格的背景。天體儀的球體與圓環緩緩旋轉；上方天花板的星座圖完全不動。$T" python sep_run.py belisar__starroom__day --recomp
SEP_SUFFIX=_F3 SEP_PROTECT_BOX='0.35,0,0.65,0.48' SEP_FPROMPT="動漫風格的背景。兩側的燭火搖曳閃動；上方天井垂下的白布與旗幟完全不動。$T" python sep_run.py belisar__stephall__day --recomp
SEP_SUFFIX=_F3 SEP_NOSKY=1 SEP_PROTECT_BOX='0,0,1,0.1;0,0.24,1,1;0,0.1,0.44,0.24;0.52,0.1,1,0.24' SEP_FPROMPT="動漫風格的室內背景。中間吊燈裡的火焰閃動，吊燈本身不晃。$T" python sep_run.py belisar__oldtomb__base --recomp
SEP_SUFFIX=_F3 SEP_NOSKY=1 SEP_PROTECT_BOX='0.46,0,0.66,0.22;0.40,0.25,0.62,0.64;0.05,0.24,0.18,0.63;0.83,0.24,0.94,0.63' SEP_FPROMPT="動漫風格的室內背景。燭台上的燭火搖曳閃動；上方吊燈與三扇門完全不動。$T" python sep_run.py belisar__antecham__base --recomp
echo FIX12_DONE

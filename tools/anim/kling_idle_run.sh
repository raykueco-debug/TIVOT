# 卡耶爾：用 Kling 攻擊片的第 0 格（去綠幕、裁到主體）生「接得上」的 idle 循環（Ray 11-14：「用kling的圖回生可以接得上的idle」）
# 分工：idle 一律本機 Wan（idle 模式＝首尾同一張，可循環）。待機提示詞照 Ray 在編排頁寫的 I 欄；沒寫＝自由發揮。
# 輸入：resources/enemy/_neutral_refs/canyon_kf/kling/idle_src/<名>_kling0.png（裁切位置記在 crop.json，交件時換算回影片座標）
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/canyon_kf/kling/idle_src"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/kling_idle.log; echo "=== $(date) $*" >> $LOG
ONLY="$*"; want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
I(){ env TIVOT_GEN=480x720 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/$1_kling0.png" --mode idle --length 49 --fps 16 --seed $2 --prompt "$3, $T" --out out/kling_idle >> $LOG 2>&1; echo "done $1" >> $LOG; }
want coffin  && I coffin  9101 "an insect-like coffin beetle monster idles in place, its body gently rising and falling, its two huge pincers alternately pinching open and closed"
want crab    && I crab    9111 "an insect-like bone crab monster idles in place, its body gently rising and falling, its pincers alternately pinching open and closed, tail swaying"
want pilgrim && I pilgrim 9121 "a many-limbed pilgrim mass monster idles in place, its many arms slowly writhing, the red cloth strips flowing naturally"
want wyrm    && I wyrm    9131 "a bell wyrm monster idles in place, its segmented body slowly coiling and swaying, the small bells gently swinging"
want iron    && I iron    9141 "a hulking armored iron penitent idles in place, natural slow breathing, shoulders rising and falling, cloth and chains swaying"
want ribcage && I ribcage 9151 "a ribcage beast idles in place, its long segmented neck slowly swaying, the glow inside its ribcage pulsing, cloth swaying"
want stilt   && I stilt   9161 "a thin stilt shade monster idles in its crouched ready stance, natural slow breathing, claws twitching, cloth strips swaying"



# 11-15 Ray：「再把兩個飛行型的idle跑完」—— 聖面鷲、骨鴉（攻擊是程式的閃現黑影，沒有 Kling 片 ⇒ 直接用深色版立繪）；用 tivot_wan 內建 flyer 提示詞
E2="C:/Users/User/Desktop/TIVOT/resources/enemy"
F(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.80 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$E2/$1.webp" --mode idle --style flyer --length 49 --fps 16 --seed $2 --out out/kling_idle >> $LOG 2>&1; echo "done $1" >> $LOG; }
want vulture && F mon_canyon_saintvulture_dark 9171
want crow    && F mon_canyon_bonecrow_dark 9181
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kling_idle/* >> $LOG 2>&1
echo ALLDONE >> $LOG

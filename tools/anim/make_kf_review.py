# KF 審閱頁（往下捲看 A／B）：輸出到 ComfyUI tivot_wan/out/kf_review.html，由 animechk 伺服器（8130）供圖（/gameres/ → TIVOT/resources）
import os, html
T='C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy'; K=f'{T}/_neutral_refs/s3_kf'
OUT='C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/out/kf_review.html'
ROWS=[  # (編號, 名字, KF 鍵, 原圖, 走法, 表上寫的, 問題)
 (1,'裂肉獸 E022','beast_organ','mon_beast_organ','tiger','（空白）','撲咬嘴沒張開；橫掃前腳畫成帶爪的掌（原圖是蹄）'),
 (2,'鹿骸 E023／夢魘鹿骸 E078','stag_nightmare','mon_stag_nightmare','tiger','E023 攻擊＝延時＝黑炎襲向 viewer','⚠ 表上是黑炎，KF 是撲咬＋蹄掃；原圖側面、B 正面；撲咬碰下緣'),
 (3,'熊骸 E025／夢魘熊骸 E076','bear_nightmare','mon_bear_nightmare','tiger','E025 攻擊＝撲擊、延時＝黑炎襲向 viewer','⚠ 延時對不上（表上黑炎）'),
 (4,'聖骨獸 E026','beast_reliquary','mon_beast_reliquary','tiger','攻擊＝胸口裂開','⚠ 撲咬對不上表；橫掃那張金光帶不見了'),
 (5,'熊骸 husk E075','bear_husk','mon_bear_husk','tiger','（空白）','撲咬碰右緣'),
 (6,'變異樹靈鹿主 E070','deernightmare','mon_shinierforest_deernightmare','tiger','攻擊＝仰天長嘯、延時＝揮頭角擊','⚠ 兩張都對不上表'),
 (7,'覆骨者 E079','beast_bonemaw','mon_beast_bonemaw','tiger','（空白）','原圖太動態→新 A；撲咬頭部骨面變樣'),
 (8,'腐鹿骸 E077','stag_rot','mon_stag_rot','tiger','（空白）','原圖太動態→新 A'),
 (9,'守墓者 seal E071','gravekeeper_seal','mon_gravekeeper_seal','tiger','（空白）','有翼骸骨，算不算空戰？原圖俯衝→新 A 落地'),
 (10,'崩岩巨像 E043','colossus','mon_canyon_colossus_dark','natali','攻擊＝巨拳襲下、延時＝揮手掃蕩','新 A；斜劈當掃蕩可以嗎'),
 (11,'撕心者 E082','heartripper','mon_relic_heartripper','natali','（空白）','撲咬是臉部大特寫，左上右三邊碰'),
 (12,'鳴鐘者 E080','bellreacher','mon_relic_bellreacher','natali','（空白）','無嘴→撲抓；斜劈碰上緣'),
 (13,'王的容器 E081','halo_ring','mon_halo_ring','natali','（空白）','無嘴→撲抓；光環變亮、碰上緣'),
 (14,'喪鐘 E083','bellwalker','mon_relic_bellwalker','natali','（空白）','無嘴→撲抓；撲抓碰左右'),
 (15,'鎖鍊聖徒 E084','saint_prison','mon_saint_prison','natali','（空白）','原圖太動態→新 A'),
 (16,'監查者 E085','saint_inspector','mon_saint_inspector','natali','（空白）','突刺那張只剩一把鐮刀'),
 (17,'巨型聖徒 E086','saint_thug','mon_saint_thug','natali','（空白）','原圖揮拳→新 A；無嘴→重拳'),
 (18,'告解者 E093','relic_confessional','mon_relic_confessional','natali','（空白）',''),
 (19,'沙漏苦修者 E094','relic_hourglass','mon_relic_hourglass','natali','（空白）',''),
 (20,'鑰匙守 E095','relic_keyward','mon_relic_keyward','natali','（空白）',''),
 (21,'讀經台 E096','relic_lectern','mon_relic_lectern','natali','（空白）',''),
 (22,'香爐肺 E097','relic_censerlung','mon_relic_censerlung','natali','（空白）','⚠ 斜劈缺：_claw 假透明、_claw_v2 畫成撲抓'),
 (23,'帷幕手 E098','relic_veilhands','mon_relic_veilhands','natali','（空白）',''),
 (24,'詩輪 E099','relic_wheelpsalm','mon_relic_wheelpsalm','natali','（空白）','⚠ 撲抓缺；斜劈殘影畫成一根長棍'),
 (25,'聖爵溺者 E100','relic_chalice','mon_relic_chalice','natali','（空白）','撲抓兩張選一（都碰左右）'),
 (26,'鏡唱者 E091','relic_mirrorchoir','mon_relic_mirrorchoir','natali','（空白）',''),
 (27,'風箱懺者 E092','relic_bellows','mon_relic_bellows','natali','（空白）','⚠ 撲抓缺'),
]
LBL={'A_neutral':'新 A 中立','B_bite':'B 撲咬／撲抓（攻擊）','B_bite_2':'B 撲抓②','B_claw':'B 爪／斜劈（延時）','B_claw_2':'B 斜劈②','B_claw_v2':'B 斜劈 重出'}
fs=os.listdir(K); h=[]
for no,name,key,orig,rule,table,note in ROWS:
    cells=[('原圖',f'/gameres/enemy/{orig}.webp')]
    for f in sorted(f for f in fs if f.startswith(f'cm_{key}_') and f.endswith('.png')):
        tag=f[len(f'cm_{key}_'):-4]; cells.append((LBL.get(tag,tag),f'/gameres/enemy/_neutral_refs/s3_kf/{f}'))
    figs=''.join(f'<figure><img loading=lazy src="{html.escape(s)}"><figcaption>{html.escape(l)}</figcaption></figure>' for l,s in cells)
    h.append(f'<section id=k{no}><h2>{no}. {html.escape(name)} <span class=r>{rule}</span></h2><p class=t>表上：{html.escape(table)}</p>'+(f'<p class=n>{html.escape(note)}</p>' if note else '')+f'<div class=row>{figs}</div></section>')
open(OUT,'w',encoding='utf-8').write('''<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>KF 審閱</title>
<style>body{margin:0;background:#1b1b22;color:#ddd;font:15px sans-serif;padding:12px}h1{font-size:18px}h2{font-size:17px;margin:22px 0 4px;color:#fc6}.r{font-size:13px;color:#8cf;border:1px solid #8cf;border-radius:4px;padding:0 6px}
.t{margin:2px 0;color:#aaa}.n{margin:2px 0;color:#f99}.row{display:flex;gap:10px;overflow-x:auto}figure{margin:0;flex:0 0 auto}figure img{height:46vh;max-height:520px;background:repeating-conic-gradient(#3a3a44 0 25%,#2c2c34 0 50%) 0 0/24px 24px;border-radius:6px}
figcaption{text-align:center;color:#ccc;font-size:13px}section{border-bottom:1px solid #333;padding-bottom:10px}</style>
<h1>單隻怪 KF 審閱（27 隻，11-09）—— 回覆格式：「全過，除了 N…」</h1>'''+''.join(h))
print('ok',len(ROWS))

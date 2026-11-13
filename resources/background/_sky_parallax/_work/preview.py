import subprocess;from PIL import Image;import numpy as np
W,H=768,512;FPS=30;T=8;SP=4
sets=[('sky_cumulus_day',None),('sky_cirrus_day',None),('sky_towers','sky_towers_moon.webp')]
p=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','20','_work/sky_parallax_preview.mp4'],stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)
for k,moon in sets:
  L=[Image.open(f'{k}_{n}.webp').convert('RGBA').resize((W,H),Image.LANCZOS) for n in ['l0_far','l1_mid','l2_near']]
  M=Image.open(moon).convert('RGBA').resize((W,H),Image.LANCZOS) if moon else None
  periods=[120/SP,40/SP,12/SP]
  for f in range(FPS*T):
    t=f/FPS;fr=Image.new('RGBA',(W,H))
    for i,(lay,per) in enumerate(zip(L,periods)):
      if i==1 and M: fr.alpha_composite(M)
      off=int((t/per)*W)%W
      fr.alpha_composite(lay,(-off,0));fr.alpha_composite(lay,(W-off,0))
    p.stdin.write(fr.convert('RGB').tobytes())
p.stdin.close();p.wait()

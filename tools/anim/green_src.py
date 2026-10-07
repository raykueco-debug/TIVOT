import numpy as np
from PIL import Image
s = Image.open(r'C:\Users\Ray Ku\Desktop\TIVOT\resources\ci\layers\sorana_roar\sorana.png').convert('RGBA'); a = np.array(s)
X0, Y0, X1, Y1 = 300, 200, 560, 360
reg = a[Y0:Y1, X0:X1]; hsv = np.array(Image.fromarray(reg[..., :3]).convert('HSV')).astype(float)
h, sat, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
m = (reg[..., 3] > 128) & (h > 60) & (h < 170) & (sat > 0.15)
hsv[..., 0] = np.where(m, 125 * 255 / 360, hsv[..., 0])
hsv[..., 1] = np.where(m, np.minimum(255, hsv[..., 1] * 1.3 + 40), hsv[..., 1])
hsv[..., 2] = np.where(m, np.minimum(255, hsv[..., 2] * 1.25 + 15), hsv[..., 2])
reg[..., :3] = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')); a[Y0:Y1, X0:X1] = reg
Image.fromarray(a).save(r'in_roar\sorana_roarG.png')
Image.fromarray(a).crop((250, 150, 650, 450)).save(r'C:\Users\RAYKU~1\AppData\Local\Temp\claude\C--Users-Ray-Ku-Desktop-TIVOT\ff6be655-022e-4082-abd5-45f44ccca3cc\scratchpad\eyeG.png')
print(m.sum())

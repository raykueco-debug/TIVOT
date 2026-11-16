# TIVOT：Mobius 式潛空間輪轉循環（arXiv 2502.20307），給原生 Wan I2V（GGUF）流程用
# 每一步把潛空間的時間軸（連同 I2V 的 c_concat 條件）輪轉 idx 格再送進模型，輸出再轉回來 ⇒ 頭尾被當成相鄰格一起去噪，影片本身就是一個圈。
# Wrapper 版（WanVideoLoopArgs）在這台缺 accelerate 載不起來，所以自己寫這一支（11-08 美術 session）。
import torch

class TivotLatentShiftLoop:
    @classmethod
    def INPUT_TYPES(cls):
        return {'required': {'model': ('MODEL',),
                             'shift_skip': ('INT', {'default': 3, 'min': 0, 'max': 64}),
                             'offset': ('INT', {'default': 0, 'min': 0, 'max': 256})}}
    RETURN_TYPES = ('MODEL',)
    FUNCTION = 'apply'
    CATEGORY = 'tivot'

    def apply(self, model, shift_skip, offset):
        m = model.clone()
        st = {'n': 0}
        def wrapper(apply_model, args):
            x, t, c = args['input'], args['timestep'], dict(args['c'])
            T = x.shape[2]
            idx = (offset + st['n'] * shift_skip) % T
            st['n'] += 1
            print(f'[tivot_loop] call={st["n"]} T={T} idx={idx} keys={[k for k in c]} concat={tuple(c["c_concat"].shape) if torch.is_tensor(c.get("c_concat")) else None}', flush=True)
            if idx == 0:
                return apply_model(x, t, **c)
            x = torch.roll(x, -idx, dims=2)
            for k in ('c_concat',):
                v = c.get(k)
                if torch.is_tensor(v) and v.dim() == 5 and v.shape[2] == T:
                    c[k] = torch.roll(v, -idx, dims=2)
            out = apply_model(x, t, **c)
            return torch.roll(out, idx, dims=2)
        m.set_model_unet_function_wrapper(wrapper)
        return (m,)

NODE_CLASS_MAPPINGS = {'TivotLatentShiftLoop': TivotLatentShiftLoop}
NODE_DISPLAY_NAME_MAPPINGS = {'TivotLatentShiftLoop': 'TIVOT Latent Shift Loop (Mobius)'}

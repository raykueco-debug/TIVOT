"""TIVOT 背景線：Mobius（arXiv 2502.20307）潛空間輪轉循環 —— 原生 KSampler 版。
1. TivotLatentShift：每一次模型呼叫前把潛空間在時間軸上轉 shift_idx 格，算完轉回來；shift_idx 每次 +skip。
   ⇒ 每一格都輪流當過「開頭」與「結尾」，生出來的序列首尾接成一圈。（同 WanVideoWrapper 的 loop_args 作法）
2. TivotLoopDecode：解碼時前面墊最後 pad 個潛格、解完丟掉墊的那幾格。
   Wan 的 3D VAE 把第一個潛格當單獨一格解（其他是 4 格一組），不墊的話接縫一定差一截（論文 4.3 節）。
   輸出 4×T 格，最後一格接回第一格。
"""
import torch


class TivotLatentShift:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {"model": ("MODEL",), "shift_skip": ("INT", {"default": 3, "min": 1, "max": 64}),
                             "start_percent": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                             "end_percent": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                             "roll_cond": ("BOOLEAN", {"default": False})}}
    RETURN_TYPES = ("MODEL",)
    FUNCTION = "patch"
    CATEGORY = "tivot"

    def patch(self, model, shift_skip, start_percent, end_percent, roll_cond=False):
        m = model.clone()
        st = {"idx": 0}
        ms = m.get_model_object("model_sampling")
        s_hi = ms.percent_to_sigma(start_percent); s_lo = ms.percent_to_sigma(end_percent)

        def wrap(apply_model, args):
            x, t, c = args["input"], args["timestep"], args["c"]
            sig = float(t.max())
            if x.ndim != 5 or not (s_lo <= sig <= s_hi):
                return apply_model(x, t, **c)
            T = x.shape[2]; k = st["idx"] % T
            xr = torch.roll(x, shifts=-k, dims=2)
            c2 = dict(c)
            cc = c2.get("c_concat")
            if roll_cond and cc is not None and cc.ndim == 5 and cc.shape[2] == T:   # 選用：I2V 的影像條件跟著轉（WanVideoWrapper 不轉）
                c2["c_concat"] = torch.roll(cc, shifts=-k, dims=2)
            out = apply_model(xr, t, **c2)
            out = torch.roll(out, shifts=k, dims=2)
            st["idx"] = (k + shift_skip) % T
            return out

        m.set_model_unet_function_wrapper(wrap)
        return (m,)


class TivotLoopDecode:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {"samples": ("LATENT",), "vae": ("VAE",), "pad": ("INT", {"default": 2, "min": 1, "max": 8})}}
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "decode"
    CATEGORY = "tivot"

    def decode(self, samples, vae, pad):
        z = samples["samples"]
        T = z.shape[2]
        zz = torch.cat([z[:, :, T - pad:], z], dim=2)
        img = vae.decode(zz)
        if img.ndim == 5: img = img.reshape(-1, img.shape[-3], img.shape[-2], img.shape[-1])
        drop = 1 + 4 * (pad - 1)
        return (img[drop:drop + 4 * T],)


NODE_CLASS_MAPPINGS = {"TivotLatentShift": TivotLatentShift, "TivotLoopDecode": TivotLoopDecode}
NODE_DISPLAY_NAME_MAPPINGS = {"TivotLatentShift": "TIVOT 潛空間輪轉（Mobius）", "TivotLoopDecode": "TIVOT 循環解碼（墊格）"}

"""Key the dark backdrop out of cartouche.png -> transparent ornament.

gpt-image-1 keeps filling the cartouche's empty center with a dark vignette
instead of honoring transparency. Since the ornament is light on dark, we make
alpha follow luminance (bright engraving -> opaque, dark backdrop -> clear) and
warm the strokes toward aged gold so they read on parchment.
"""
import numpy as np
from PIL import Image

src = Image.open("cartouche.png").convert("RGB")
a = np.asarray(src).astype(np.float32)
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

lo, hi = 70.0, 175.0
alpha = np.clip((lum - lo) / (hi - lo), 0, 1) ** 1.15      # smooth cut of the halo

# warm the bright strokes toward aged gold, keeping the engraving's shading
gold = np.array([202, 162, 79], dtype=np.float32)
shade = np.clip(lum / 255.0, 0, 1)[..., None]
rgb = gold * (0.55 + 0.45 * shade)

out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
Image.fromarray(out, "RGBA").save("cartouche.png")
print("cartouche.png keyed to transparent ornament")

# Hero image fix

Same restaurant source image; no replacement scene.

Implemented:
- Mobile-specific crop from the original image.
- Desktop-specific landscape crop from the same original.
- `<picture>` art direction by viewport.
- High-density WebP candidates for 2x/3x displays.
- Removed hero figure transform/fade motion so the LCP image is never rasterized through a motion transform.
- No `object-fit: cover` runtime crop on the hero.
- High-quality WebP (quality 96); PNG fallback.

This specifically addresses perceived softness from:
1. serving a single portrait composition into both portrait and landscape slots;
2. insufficient source density on high-DPI screens;
3. extra runtime scaling/cropping/compositing.

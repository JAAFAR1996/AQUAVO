#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AQUAVO UGC Card - Print Ready Generator (Playwright)
100x100mm | CMYK | 300 DPI | 3mm Bleed
يستخدم browser داخلياً للنص العربي الصحيح → يحفظ TIFF + JPEG
"""

import sys, io, os, base64, tempfile
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── إعدادات الطباعة ───────────────────────────────────────
DPI       = 300
MM_TO_PX  = DPI / 25.4          # 11.811 px/mm
CARD_MM   = 100
BLEED_MM  = 3
TOTAL_MM  = CARD_MM + BLEED_MM * 2    # 106mm
TOTAL_PX  = round(TOTAL_MM * MM_TO_PX)  # 1252px
CARD_PX   = round(CARD_MM  * MM_TO_PX)  # 1181px
BLEED_PX  = round(BLEED_MM * MM_TO_PX)  # 35px

BG_IMAGE  = r"C:\Users\jaafa\Downloads\ros\ChatGPT Image Apr 23, 2026, 10_18_42 AM.png"
LOGO_IMG  = r"C:\Users\jaafa\Desktop\upload\FishWebClean\client\public\brand\logos\aquavo-vertical.png"
OUT_PNG   = r"C:\Users\jaafa\Downloads\ros\AQUAVO_UGC_CARD_PRINT.png"
OUT_JPG   = r"C:\Users\jaafa\Downloads\ros\AQUAVO_UGC_CARD_PREVIEW.jpg"

def img_to_base64(path):
    ext = os.path.splitext(path)[1].lower()
    mime = {"png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(ext, "image/png")
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{data}"

def build_html(bg_b64, logo_b64, total_px, card_px, bleed_px):
    photo_h   = round(card_px * 0.68)
    grad_start = round(card_px * 0.40)

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:{total_px}px; height:{total_px}px; overflow:hidden; background:#0D1F3D; }}

.canvas {{
    width:{total_px}px;
    height:{total_px}px;
    position:relative;
    background:#0D1F3D;
    overflow:hidden;
}}

/* ─ Bleed border guides (تبقى خارج الكارت) ─ */
.trim-mark {{
    position:absolute;
    background:#000;
}}
.tm-tl-h {{ top:{bleed_px}px; left:0; width:{bleed_px-4}px; height:2px; }}
.tm-tl-v {{ top:0; left:{bleed_px}px; width:2px; height:{bleed_px-4}px; }}
.tm-tr-h {{ top:{bleed_px}px; right:0; width:{bleed_px-4}px; height:2px; }}
.tm-tr-v {{ top:0; right:{bleed_px}px; width:2px; height:{bleed_px-4}px; }}
.tm-bl-h {{ bottom:{bleed_px}px; left:0; width:{bleed_px-4}px; height:2px; }}
.tm-bl-v {{ bottom:0; left:{bleed_px}px; width:2px; height:{bleed_px-4}px; }}
.tm-br-h {{ bottom:{bleed_px}px; right:0; width:{bleed_px-4}px; height:2px; }}
.tm-br-v {{ bottom:0; right:{bleed_px}px; width:2px; height:{bleed_px-4}px; }}

/* ─ Card area ─ */
.card {{
    position:absolute;
    top:{bleed_px}px;
    left:{bleed_px}px;
    width:{card_px}px;
    height:{card_px}px;
    overflow:hidden;
    background:#0D1F3D;
}}

/* ─ Aquascape photo ─ */
.photo {{
    position:absolute;
    top:0; left:0;
    width:100%;
    height:{photo_h}px;
    background: url('{bg_b64}') center top / cover no-repeat;
}}

/* ─ Gradient overlay ─ */
.gradient {{
    position:absolute;
    top:{grad_start}px;
    left:0;
    width:100%;
    height:{card_px - grad_start}px;
    background: linear-gradient(
        to bottom,
        rgba(13,31,61,0) 0%,
        rgba(13,31,61,0.7) 40%,
        rgba(13,31,61,1) 70%
    );
}}

/* ─ Logo ─ */
.logo-wrap {{
    position:absolute;
    top:{round(0.03*card_px)}px;
    right:{round(0.03*card_px)}px;
    background:#fff;
    padding:{round(0.015*card_px)}px;
    border-radius:{round(0.015*card_px)}px;
}}
.logo-wrap img {{
    width:{round(0.22*card_px)}px;
    display:block;
}}

/* ─ Text block ─ */
.text-block {{
    position:absolute;
    bottom:{round(0.04*card_px)}px;
    right:{round(0.05*card_px)}px;
    left:{round(0.05*card_px)}px;
    direction:rtl;
    text-align:right;
    font-family:'Cairo', 'Arabic Typesetting', sans-serif;
}}

.title {{
    font-size:{round(0.08*card_px)}px;
    font-weight:900;
    color:#FFFFFF;
    line-height:1.2;
    margin-bottom:{round(0.015*card_px)}px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.6);
}}

.subtitle {{
    font-size:{round(0.034*card_px)}px;
    font-weight:400;
    color:#C8D7E6;
    line-height:1.4;
    margin-bottom:{round(0.04*card_px)}px;
}}

.hashtag {{
    font-size:{round(0.055*card_px)}px;
    font-weight:700;
    color:#00BCBC;
    text-align:center;
    direction:rtl;
    letter-spacing:1px;
}}
</style>
</head>
<body>
<div class="canvas">

  <!-- Trim marks -->
  <div class="trim-mark tm-tl-h"></div>
  <div class="trim-mark tm-tl-v"></div>
  <div class="trim-mark tm-tr-h"></div>
  <div class="trim-mark tm-tr-v"></div>
  <div class="trim-mark tm-bl-h"></div>
  <div class="trim-mark tm-bl-v"></div>
  <div class="trim-mark tm-br-h"></div>
  <div class="trim-mark tm-br-v"></div>

  <!-- Card -->
  <div class="card">
    <div class="photo"></div>
    <div class="gradient"></div>

    <!-- Logo -->
    <div class="logo-wrap">
      <img src="{logo_b64}" alt="AQUAVO">
    </div>

    <!-- Text -->
    <div class="text-block">
      <div class="title">راوينا حوضك! 📷</div>
      <div class="subtitle">حوضك ممكن يكون النجم الجاي على صفحتنا!</div>
      <div class="hashtag">#حوضي_مع_اكواف</div>
    </div>
  </div>

</div>
</body>
</html>"""

def main():
    print("جاري تحميل الصور...")
    bg_b64   = img_to_base64(BG_IMAGE)
    logo_b64 = img_to_base64(LOGO_IMG)

    html = build_html(bg_b64, logo_b64, TOTAL_PX, CARD_PX, BLEED_PX)

    # حفظ HTML مؤقت
    tmp = tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8")
    tmp.write(html)
    tmp.close()
    html_path = tmp.name

    print("فتح المتصفح...")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": TOTAL_PX, "height": TOTAL_PX})

        # تحميل Google Fonts محلياً إذا ما في إنترنت، ولا نستنى
        page.goto(f"file:///{html_path.replace(chr(92), '/')}", wait_until="networkidle",
                  timeout=15000)

        page.wait_for_timeout(1500)  # انتظر تحميل الخطوط

        # Screenshot بالدقة الكاملة
        page.screenshot(path=OUT_PNG, full_page=False, type="png")
        browser.close()

    os.unlink(html_path)

    # تحويل PNG → JPEG للمعاينة + TIFF للطباعة
    try:
        from PIL import Image
        img = Image.open(OUT_PNG)

        # JPEG preview
        img.convert("RGB").save(OUT_JPG, format="JPEG", quality=95, dpi=(DPI, DPI))

        # TIFF CMYK للطباعة
        out_tiff = OUT_PNG.replace(".png", "_CMYK.tif")
        img.convert("CMYK").save(out_tiff, format="TIFF", dpi=(DPI, DPI), compression="lzw")

        print(f"\n✅ تم الحفظ!")
        print(f"📄 TIFF CMYK للطبع  : {out_tiff}")
        print(f"🖼  PNG عالي الدقة  : {OUT_PNG}")
        print(f"👁  JPEG معاينة      : {OUT_JPG}")
        print(f"\n📐 المواصفات:")
        print(f"   الحجم    : {CARD_MM}x{CARD_MM}mm + {BLEED_MM}mm bleed")
        print(f"   Pixels   : {TOTAL_PX}x{TOTAL_PX}px")
        print(f"   DPI      : {DPI}")
        print(f"   Color    : CMYK")
    except Exception as e:
        print(f"تحويل الصورة: {e}")
        print(f"\n✅ PNG محفوظ: {OUT_PNG}")

if __name__ == "__main__":
    main()

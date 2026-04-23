from PIL import Image
import os

src = r"C:\Users\jaafa\Downloads\ros\AQUAVO_UGC_CARD_PRINT.png"
out_png  = r"C:\Users\jaafa\Downloads\ros\AQUAVO_UGC_CARD_PRINT_300DPI.png"
out_tiff = r"C:\Users\jaafa\Downloads\ros\AQUAVO_UGC_CARD_PRINT_CMYK_300DPI.tif"

img = Image.open(src).convert("RGB")

# PNG بـ 300 DPI
img.save(out_png, format="PNG", dpi=(300, 300))

# TIFF CMYK بـ 300 DPI للمطبعة
img.convert("CMYK").save(out_tiff, format="TIFF", dpi=(300, 300), compression="lzw")

# تحقق من النتيجة
for f in [out_png, out_tiff]:
    i = Image.open(f)
    mb = os.path.getsize(f) / (1024*1024)
    dpi = i.info.get("dpi", "???")
    print(f"{os.path.basename(f)}")
    print(f"  Pixels : {i.size[0]} x {i.size[1]}")
    print(f"  DPI    : {dpi}")
    print(f"  Mode   : {i.mode}")
    print(f"  Size   : {mb:.2f} MB")
    print()

print("Done!")

"""
P2 — سخان الساموراي الأسود — حرق النص مباشرة على الفيديو
================================================================
يأخذ فيديو 0419.mp4 ويحرق كل النصوص عليه مباشرة.

المتطلبات:
    pip install moviepy pillow arabic-reshaper python-bidi numpy

الخطوط المطلوبة (ضعها بمجلد fonts/):
    - Cairo-Bold.ttf
    - Tajawal-Medium.ttf
    - Inter-Medium.ttf

الاستخدام:
    python p2_burn_text.py
"""

import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except ImportError:
    print("pip install arabic-reshaper python-bidi")
    sys.exit(1)

try:
    from moviepy.editor import (
        VideoFileClip,
        ImageClip,
        CompositeVideoClip,
    )
except ImportError:
    print("pip install moviepy")
    sys.exit(1)


# ─────────────────────────────────────────────
# المسارات
# ─────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR / "fonts"
VIDEO_INPUT = Path(r"C:\Users\jaafa\Downloads\0419.mp4")
VIDEO_OUTPUT = SCRIPT_DIR / "output" / "P2_SAMURAI_FINAL.mp4"

Path(SCRIPT_DIR / "output").mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# الأبعاد
# ─────────────────────────────────────────────
WIDTH = 1080
HEIGHT = 1920
FPS = 30
MARGIN_RIGHT = 170
MARGIN_LEFT = 50

# ─────────────────────────────────────────────
# الألوان (RGBA)
# ─────────────────────────────────────────────
WHITE = (255, 255, 255, 255)
GOLD = (255, 215, 0, 255)
AMBER = (255, 179, 71, 255)

# ─────────────────────────────────────────────
# الخطوط
# ─────────────────────────────────────────────
FONT_FILES = {
    "cairo_bold": "Cairo-Bold.ttf",
    "tajawal_medium": "Tajawal-Medium.ttf",
    "tajawal_regular": "Tajawal-Regular.ttf",
    "inter_medium": "Inter-Medium.ttf",
}

_font_cache = {}

def get_font(key: str, size: int) -> ImageFont.FreeTypeFont:
    cache_key = (key, size)
    if cache_key in _font_cache:
        return _font_cache[cache_key]
    path = FONTS_DIR / FONT_FILES.get(key, "Cairo-Bold.ttf")
    if not path.exists():
        print(f"  ⚠ خط {path.name} غير موجود — استخدام Cairo-Bold كبديل")
        path = FONTS_DIR / "Cairo-Bold.ttf"
    font = ImageFont.truetype(str(path), size)
    _font_cache[cache_key] = font
    return font


# ─────────────────────────────────────────────
# معالجة النص العربي
# ─────────────────────────────────────────────
def fix_arabic(text: str) -> str:
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

def has_arabic(text: str) -> bool:
    return any('\u0600' <= c <= '\u06FF' for c in text)


# ─────────────────────────────────────────────
# رسم النص على صورة شفافة
# ─────────────────────────────────────────────
def wrap_text(text: str, font, max_w: int) -> str:
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    words = text.split()
    lines = []
    line = ""
    for w in words:
        test = f"{line} {w}".strip() if line else w
        if dummy.textlength(test, font=font, direction="rtl") <= max_w:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return "\n".join(lines)

def render_text(
    text: str,
    font_key: str,
    font_size: int,
    color: tuple,
) -> np.ndarray:
    max_w = WIDTH - MARGIN_RIGHT - MARGIN_LEFT - 60
    font = get_font(font_key, font_size)
    is_rtl = has_arabic(text)
    
    # التفاف النص الأصلي
    wrapped_text = wrap_text(text, font, max_w) if is_rtl else text
    
    if is_rtl:
        # Apply fix_arabic to each line individually to maintain correct order
        wrapped_text = "\n".join(fix_arabic(line) for line in wrapped_text.split("\n"))
    
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bx = dummy.multiline_textbbox((0, 0), wrapped_text, font=font, direction="rtl" if is_rtl else "ltr")
    
    # أبعاد الصورة
    pad = 20
    img_w = (bx[2] - bx[0]) + pad * 2
    img_h = (bx[3] - bx[1]) + pad * 2

    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    x = img_w - pad if is_rtl else img_w // 2
    y = pad
    anchor = "ra" if is_rtl else "ma"
    align = "right" if is_rtl else "center"
    direction = "rtl" if is_rtl else "ltr"

    # Drop Shadow
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            draw.multiline_text((x + 3 + dx, y + 3 + dy), wrapped_text,
                      font=font, fill=(0, 0, 0, 180), anchor=anchor, align=align, direction=direction)

    # إصلاح مشكلة تداخل حروف اللغة العربية مع الـ Stroke (طريقة الـ Two-Pass)
    # Pass 1: رسم الحدود بخط عريض (الخلفية)
    draw.multiline_text((x, y), wrapped_text, font=font, fill=(0, 0, 0, 153),
              stroke_width=2, stroke_fill=(0, 0, 0, 153), anchor=anchor, align=align, direction=direction)
              
    # Pass 2: رسم لون النص الأساسي فوقه لملء الفراغات ومنع التداخل
    draw.multiline_text((x, y), wrapped_text, font=font, fill=color,
              stroke_width=0, anchor=anchor, align=align, direction=direction)

    return np.array(img)


# ─────────────────────────────────────────────
# إنشاء كليب نصي مع أنيميشن
# ─────────────────────────────────────────────
def text_clip(
    text: str,
    font_key: str,
    font_size: int,
    color: tuple,
    y_pct: float,
    t_start: float,
    t_dur: float,
    anim: str = "fade",
    fade_in: float = 0.3,
    fade_out: float = 0.3,
    hold_end: bool = False,
    video_duration: float = 16.0,
):
    arr = render_text(text, font_key, font_size, color)
    y_pos = int(HEIGHT * y_pct) - arr.shape[0] // 2
    x_pos = (WIDTH - arr.shape[1]) // 2

    dur = (video_duration - t_start) if hold_end else t_dur

    clip = (
        ImageClip(arr, ismask=False, transparent=True)
        .set_duration(dur)
        .set_start(t_start)
    )

    if anim == "slide_right":
        slide_dist = 120
        orig_x = x_pos
        def pos_fn(t):
            if t < fade_in:
                p = t / fade_in
                ease = 1 - (1 - p) ** 3
                return (orig_x + slide_dist * (1 - ease), y_pos)
            return (orig_x, y_pos)
        clip = clip.set_position(pos_fn)
        
    elif anim == "scale_pop":
        # برمجة حركة الدخول (Zoom In / Pop) بشكل رياضي
        def pop_scale(t):
            if t < fade_in:
                p = t / fade_in
                # تكبير مع ارتداد خفيف (Overshoot)
                if p < 0.7:
                    scale = (p / 0.7) * 1.1
                else:
                    scale = 1.1 - ((p - 0.7) / 0.3) * 0.1
                return max(0.01, scale)
            return 1.0
        
        # نطبق التكبير مع ضمان بقاء النص في المنتصف دائماً
        clip = clip.resize(pop_scale)
        clip = clip.set_position(lambda t: ('center', y_pos))
        
    else:
        # الحالة الافتراضية (Fade in)
        clip = clip.set_position(('center', y_pos))

    clip = clip.crossfadein(fade_in)
    if not hold_end:
        clip = clip.crossfadeout(fade_out)

    return clip


# ─────────────────────────────────────────────
# النصوص — مطابقة 100% لسكربت CapCut (مدة 30 ثانية)
# ─────────────────────────────────────────────
OVERLAYS = [
    # ══════ HOOK (0:00 → 0:10) ══════
    {
        "text": "سخان المي ديشوه منظر حوضك؟",
        "font_key": "cairo_bold", "font_size": 76,
        "color": WHITE, "y_pct": 0.30,
        "t_start": 0.5, "t_dur": 4.5,
        "anim": "scale_pop", "fade_in": 0.2, "fade_out": 0.3,
    },
    {
        "text": "كل هالتعب على التنسيق — وسخان قبيح بالنص يدمر كلشي",
        "font_key": "cairo_bold", "font_size": 48,
        "color": WHITE, "y_pct": 0.44,
        "t_start": 2.5, "t_dur": 2.0,
        "anim": "slide_right", "fade_in": 0.3, "fade_out": 0.3,
    },
    {
        "text": "الساموراي الأسود — قوة ما تنشاف",
        "font_key": "cairo_bold", "font_size": 56,
        "color": AMBER, "y_pct": 0.57,
        "t_start": 4.5, "t_dur": 5.5,
        "anim": "fade", "fade_in": 0.4, "fade_out": 0.0,
    },

    # ══════ SOLUTION (0:10 → 0:22) ══════
    {
        "text": "ستانلس ستيل 304 — لا يصدأ ولا ينكسر",
        "font_key": "cairo_bold", "font_size": 60,
        "color": WHITE, "y_pct": 0.30,
        "t_start": 11.0, "t_dur": 3.0,
        "anim": "fade", "fade_in": 0.5, "fade_out": 0.4,
    },
    {
        "text": "تصميم أسود غامق يندمج بالخلفية",
        "font_key": "tajawal_medium", "font_size": 48,
        "color": WHITE, "y_pct": 0.42,
        "t_start": 13.5, "t_dur": 3.0,
        "anim": "slide_right", "fade_in": 0.4, "fade_out": 0.3,
    },
    {
        "text": "100 واط — يغطي 50 إلى 100 لتر",
        "font_key": "tajawal_medium", "font_size": 48,
        "color": AMBER, "y_pct": 0.53,
        "t_start": 16.0, "t_dur": 3.0,
        "anim": "fade", "fade_in": 0.3, "fade_out": 0.3,
    },
    {
        "text": "ثرموستات دقيق مع حماية تلقائية",
        "font_key": "tajawal_regular", "font_size": 44,
        "color": WHITE, "y_pct": 0.63,
        "t_start": 18.5, "t_dur": 3.0,
        "anim": "fade", "fade_in": 0.3, "fade_out": 0.3,
    },

    # ══════ CTA (0:22 → 0:30) ══════
    {
        "text": "مو مجرد سخان — جزء من التصميم",
        "font_key": "cairo_bold", "font_size": 64,
        "color": GOLD, "y_pct": 0.33,
        "t_start": 22.5, "t_dur": 3.0,
        "anim": "scale_pop", "fade_in": 0.3, "fade_out": 0.3,
    },
    {
        "text": "قوة مخفية وجمال ظاهر",
        "font_key": "cairo_bold", "font_size": 52,
        "color": WHITE, "y_pct": 0.45,
        "t_start": 25.0, "t_dur": 2.5,
        "anim": "fade", "fade_in": 0.4, "fade_out": 0.3,
    },
    {
        "text": "متوفر الآن — aquavoiq.com",
        "font_key": "cairo_bold", "font_size": 48,
        "color": AMBER, "y_pct": 0.57,
        "t_start": 27.0, "t_dur": 3.0,
        "anim": "fade", "fade_in": 0.3,
        "hold_end": True,
    },
    {
        "text": "AQUAVO",
        "font_key": "inter_medium", "font_size": 44,
        "color": GOLD, "y_pct": 0.65,
        "t_start": 28.5, "t_dur": 1.5,
        "anim": "fade", "fade_in": 0.5,
        "hold_end": True,
    },
]


# ─────────────────────────────────────────────
# البناء الرئيسي
# ─────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  P2 — سخان الساموراي الأسود")
    print("  حرق النص مباشرة على الفيديو")
    print("=" * 50)

    # التحقق من الفيديو
    if not VIDEO_INPUT.exists():
        print(f"\n❌ الفيديو غير موجود: {VIDEO_INPUT}")
        sys.exit(1)
    print(f"\n📹 الفيديو: {VIDEO_INPUT}")

    # التحقق من الخطوط
    print("\n📎 الخطوط:")
    for key, fname in FONT_FILES.items():
        p = FONTS_DIR / fname
        status = "✅" if p.exists() else "❌"
        print(f"  {status} {fname}")

    # تحميل الفيديو
    print("\n🎬 تحميل الفيديو...")
    base_video = VideoFileClip(str(VIDEO_INPUT))
    
    # تمديد الفيديو ليصبح 30 ثانية بتكراره ثم قصه
    from moviepy.editor import concatenate_videoclips
    # تكرار مرتين (16 + 16 = 32 ثانية) ثم أخذ أول 30 ثانية
    video = concatenate_videoclips([base_video, base_video]).subclip(0, 30.0)
    duration = video.duration
    print(f"  📐 {video.size[0]}×{video.size[1]} | {duration:.1f}ث (تمديد 30ث)")

    # إنشاء طبقات النص
    print(f"\n📝 إنشاء {len(OVERLAYS)} طبقة نص...")
    clips = [video]

    for i, ov in enumerate(OVERLAYS):
        print(f"  ✏️  [{i+1}/{len(OVERLAYS)}] {ov['text'][:35]}...")
        tc = text_clip(
            text=ov["text"],
            font_key=ov["font_key"],
            font_size=ov["font_size"],
            color=ov["color"],
            y_pct=ov["y_pct"],
            t_start=ov["t_start"],
            t_dur=ov["t_dur"],
            anim=ov.get("anim", "fade"),
            fade_in=ov.get("fade_in", 0.3),
            fade_out=ov.get("fade_out", 0.3),
            hold_end=ov.get("hold_end", False),
            video_duration=duration,
        )
        clips.append(tc)

    # تركيب
    print("\n🎞️  تركيب النصوص على الفيديو...")
    final = CompositeVideoClip(clips, size=(WIDTH, HEIGHT))

    # تصدير
    print(f"\n💾 تصدير → {VIDEO_OUTPUT}")
    final.write_videofile(
        str(VIDEO_OUTPUT),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        bitrate="8000k",
        threads=4,
    )

    video.close()
    final.close()

    print("\n" + "=" * 50)
    print(f"  ✅ تم! {VIDEO_OUTPUT}")
    print("=" * 50)


if __name__ == "__main__":
    main()

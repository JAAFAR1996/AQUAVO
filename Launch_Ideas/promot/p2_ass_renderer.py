import os
import subprocess

WIDTH = 1080
HEIGHT = 1920

def time_to_ass(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    return f"{hours:d}:{minutes:02d}:{secs:02d}.{cs:02d}"

# الألوان بصيغة ASS: &HAABBGGRR (AA = Transparency, BB = Blue, GG = Green, RR = Red)
WHITE = "&H00FFFFFF"
AMBER = "&H0047B3FF" # #FFB347 -> R:FF, G:B3, B:47
GOLD  = "&H0000D7FF" # #FFD700 -> R:FF, G:D7, B:00

OVERLAYS = [
    # HOOK
    {"text": "سخان المي ديشوه منظر حوضك؟", "font": "Cairo", "size": 76, "color": WHITE, "y_pct": 0.30, "t_start": 0.5, "t_dur": 4.5, "anim": "pop"},
    {"text": "كل هالتعب على التنسيق — وسخان قبيح بالنص يدمر كلشي", "font": "Cairo", "size": 48, "color": WHITE, "y_pct": 0.44, "t_start": 2.5, "t_dur": 2.0, "anim": "fade"},
    {"text": "الساموراي الأسود — قوة ما تنشاف", "font": "Cairo", "size": 56, "color": AMBER, "y_pct": 0.57, "t_start": 4.5, "t_dur": 5.5, "anim": "fade"},
    # SOLUTION
    {"text": "ستانلس ستيل 304 — لا يصدأ ولا ينكسر", "font": "Cairo", "size": 60, "color": WHITE, "y_pct": 0.30, "t_start": 11.0, "t_dur": 3.0, "anim": "fade"},
    {"text": "تصميم أسود غامق يندمج بالخلفية", "font": "Tajawal", "size": 48, "color": WHITE, "y_pct": 0.42, "t_start": 13.5, "t_dur": 3.0, "anim": "fade"},
    {"text": "100 واط — يغطي 50 إلى 100 لتر", "font": "Tajawal", "size": 48, "color": AMBER, "y_pct": 0.53, "t_start": 16.0, "t_dur": 3.0, "anim": "fade"},
    {"text": "ثرموستات دقيق مع حماية تلقائية", "font": "Tajawal", "size": 44, "color": WHITE, "y_pct": 0.63, "t_start": 18.5, "t_dur": 3.0, "anim": "fade"},
    # CTA
    {"text": "مو مجرد سخان — جزء من التصميم", "font": "Cairo", "size": 64, "color": GOLD, "y_pct": 0.33, "t_start": 22.5, "t_dur": 3.0, "anim": "pop"},
    {"text": "قوة مخفية وجمال ظاهر", "font": "Cairo", "size": 52, "color": WHITE, "y_pct": 0.45, "t_start": 25.0, "t_dur": 2.5, "anim": "fade"},
    {"text": "متوفر الآن — aquavoiq.com", "font": "Cairo", "size": 48, "color": AMBER, "y_pct": 0.57, "t_start": 27.0, "t_dur": 3.0, "anim": "fade"},
    {"text": "AQUAVO", "font": "Inter", "size": 44, "color": GOLD, "y_pct": 0.65, "t_start": 28.5, "t_dur": 1.5, "anim": "fade"},
]

def build_ass():
    ass = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {WIDTH}",
        f"PlayResY: {HEIGHT}",
        "WrapStyle: 1", # Smart wrapping
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ]
    
    # تعريف الـ Style الأساسي لكل خط ولون
    # Outline=3, Shadow=4 لضمان التباين العالي
    for i, ov in enumerate(OVERLAYS):
        style_name = f"Style{i}"
        ass.append(f"Style: {style_name},{ov['font']},{ov['size']},{ov['color']},&H000000FF,&H00000000,&H44000000,-1,0,0,0,100,100,0,0,1,3,4,8,50,50,{int(ov['y_pct']*HEIGHT)},1")

    ass.append("")
    ass.append("[Events]")
    ass.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text")

    for i, ov in enumerate(OVERLAYS):
        start_ass = time_to_ass(ov['t_start'])
        end_ass = time_to_ass(ov['t_start'] + ov['t_dur'])
        
        # حركات الأنيميشن (Tags)
        if ov['anim'] == "pop":
            # Scale من 10% إلى 110% في أول 200ms ثم إلى 100% في 100ms التالية
            tags = "{\\fad(100,300)\\fscx10\\fscy10\\t(0,200,\\fscx110\\fscy110)\\t(200,300,\\fscx100\\fscy100)}"
        else:
            # Fade in 300ms, fade out 300ms
            tags = "{\\fad(300,300)}"
            
        ass.append(f"Dialogue: 0,{start_ass},{end_ass},Style{i},,0,0,0,,{tags}{ov['text']}")

    with open("P2_ASS_SUBS.ass", "w", encoding="utf-8-sig") as f:
        f.write("\n".join(ass))
        
    print("✅ تم إنشاء ملف ASS بنجاح: P2_ASS_SUBS.ass")

def render_video():
    build_ass()
    
    # 1. تكرار الفيديو الأصلي ليكون 30 ثانية
    # 2. دمج الترجمة بفلتر ass
    cmd = [
        "ffmpeg", "-y",
        "-stream_loop", "-1", "-i", r"C:\Users\jaafa\Downloads\0419.mp4",
        "-t", "30",
        "-vf", "ass=P2_ASS_SUBS.ass",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac",
        "output/P2_SAMURAI_ASS_FINAL.mp4"
    ]
    
    print("🚀 جاري معالجة الفيديو باستخدام FFmpeg...")
    subprocess.run(cmd)
    print("🎬 انتهى الرندر: output/P2_SAMURAI_ASS_FINAL.mp4")

if __name__ == "__main__":
    render_video()

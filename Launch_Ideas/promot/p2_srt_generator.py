# -*- coding: utf-8 -*-
"""
AQUAVO SRT Generator - P2 Samurai Heater
يولد ملف ترجمة بصيغة SRT يحتوي على التوقيتات الدقيقة جداً والنصوص
ويمكن سحبه مباشرة إلى CapCut ليتحول إلى Text Tracks قابلة للتعديل
"""
import os

# التوقيتات الدقيقة (بالثواني)
OVERLAYS = [
    {"text": "سخان المي ديشوه منظر حوضك؟", "start": 0.5, "dur": 4.5},
    {"text": "كل هالتعب على التنسيق\nوسخان قبيح يدمر كلشي", "start": 2.5, "dur": 2.0},
    {"text": "الساموراي الأسود قوة ما تنشاف", "start": 4.5, "dur": 5.5},
    {"text": "ستانلس ستيل 304 لا يصدأ ولا ينكسر", "start": 11.0, "dur": 3.0},
    {"text": "تصميم أسود غامق يندمج بالخلفية", "start": 13.5, "dur": 3.0},
    {"text": "100 واط يغطي 50 إلى 100 لتر", "start": 16.0, "dur": 3.0},
    {"text": "ثرموستات دقيق مع حماية تلقائية", "start": 18.5, "dur": 3.0},
    {"text": "مو مجرد سخان\nجزء من التصميم", "start": 22.5, "dur": 3.0},
    {"text": "قوة مخفية وجمال ظاهر", "start": 25.0, "dur": 2.5},
    {"text": "متوفر الآن aquavoiq.com", "start": 27.0, "dur": 3.0},
    {"text": "AQUAVO", "start": 28.5, "dur": 1.5},
]

def format_time(seconds):
    """تحويل الثواني إلى صيغة SRT: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def generate_srt(filename):
    with open(filename, "w", encoding="utf-8") as f:
        for i, ov in enumerate(OVERLAYS, 1):
            start_str = format_time(ov["start"])
            end_str = format_time(ov["start"] + ov["dur"])
            f.write(f"{i}\n")
            f.write(f"{start_str} --> {end_str}\n")
            f.write(f"{ov['text']}\n\n")
    print(f"✅ تم بنجاح إنشاء ملف: {filename}")

if __name__ == "__main__":
    generate_srt("P2_CAPCUT_AUTO_TIMING.srt")

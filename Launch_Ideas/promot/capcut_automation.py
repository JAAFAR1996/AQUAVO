import re
import os

# مسار قاموس العمل
SCRIPT_PATH = "P2_SAMURAI_CAPCUT_SCRIPT.md"
# مسار الملف الذي سيتم استخراجه لـ CapCut
OUTPUT_SRT = "P2_CAPCUT_AUTOMATION.srt"

def parse_time(time_str):
    """تحويل الوقت من تنسيق 0:00.5 إلى ثواني (Float)"""
    try:
        parts = time_str.replace('ث', '').strip().split(':')
        minutes = int(parts[0])
        seconds = float(parts[1])
        return (minutes * 60) + seconds
    except:
        return 0.0

def float_to_srt_time(seconds_float):
    """تحويل الثواني إلى تنسيق التايملاين الخاص بـ CapCut (HH:MM:SS,mmm)"""
    hours = int(seconds_float // 3600)
    minutes = int((seconds_float % 3600) // 60)
    seconds = int(seconds_float % 60)
    milliseconds = int(round((seconds_float - int(seconds_float)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def generate_capcut_srt():
    if not os.path.exists(SCRIPT_PATH):
        print(f"Error: Could not find {SCRIPT_PATH}")
        return

    with open(SCRIPT_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # استخراج كل صفوف الجداول التي تحتوي على النصوص والتوقيت
    # نمط البحث: يبدأ بوقت مثل 0:00.5 ثم نص ثم تفاصيل أخرى ثم مدة مثل 4.5ث
    pattern = re.compile(r'\|\s*(\d+:\d+\.?\d*)\s*\|\s*([^\|]+)\s*\|[^\|]+\|[^\|]+\|[^\|]+\|[^\|]+\|\s*(\d+\.?\d*)ث\s*\|')
    matches = pattern.findall(content)

    srt_content = ""
    counter = 1

    print("🚀 جاري سحب النصوص والتوقيتات من القاموس لأتمتة CapCut...")
    
    for match in matches:
        start_str = match[0]
        text = match[1].strip()
        duration_str = match[2]

        # الحسابات الدقيقة للوقت
        start_seconds = parse_time(start_str)
        duration_seconds = float(duration_str)
        end_seconds = start_seconds + duration_seconds

        # تحويلها لصيغة CapCut
        start_srt = float_to_srt_time(start_seconds)
        end_srt = float_to_srt_time(end_seconds)

        # بناء هيكل الـ SRT
        srt_content += f"{counter}\n"
        srt_content += f"{start_srt} --> {end_srt}\n"
        srt_content += f"{text}\n\n"
        
        print(f"✅ تم سحب: [{start_srt} -> {end_srt}] {text}")
        counter += 1

    # حفظ الملف
    with open(OUTPUT_SRT, 'w', encoding='utf-8') as f:
        f.write(srt_content)

    print(f"\n🎉 تمت العملية بنجاح! تم إنشاء ملف الأتمتة: {OUTPUT_SRT}")
    print("👉 كيفية استخدامه في CapCut:")
    print("1. اسحب ملف P2_CAPCUT_AUTOMATION.srt وأسقطه في CapCut.")
    print("2. ستنزل جميع النصوص في التايملاين بتوقيتاتها الدقيقة بنقرة واحدة.")
    print("3. حدد كل النصوص معاً، وضع (الظل والحدود) مرة واحدة فقط!")

if __name__ == "__main__":
    generate_capcut_srt()

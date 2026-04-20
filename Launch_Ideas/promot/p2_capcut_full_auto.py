# -*- coding: utf-8 -*-
"""
AQUAVO FULL AUTO CAPCUT HYBRID GENERATOR
يقوم ببناء التايملاين والحركات والألوان بالكامل بدون أي تدخل يدوي!
ويستخدم مشروع 0419 كمانح (Donor) لكسر حماية الإصدار 3.0+
"""
import os
import json
import shutil
import uuid
import textwrap
import pyJianYingDraft as jy
import arabic_reshaper
from bidi.algorithm import get_display

# ========================================
# 1. إعدادات البراند والألوان (Hex to [R, G, B])
# ========================================
COLORS = {
    "WHITE": [1.0, 1.0, 1.0],
    "GOLD": [1.0, 0.843, 0.0],
    "AMBER": [1.0, 0.702, 0.278]
}

# مسارات
CAPCUT_DRAFTS = os.path.expanduser(r"~\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft")
DONOR_PROJECT = os.path.join(CAPCUT_DRAFTS, "0419 (4)")
PROJECT_NAME = "P2_SAMURAI_FINAL_V2"
TARGET_PROJECT = os.path.join(CAPCUT_DRAFTS, PROJECT_NAME)

OVERLAYS = [
    {"text": "سخان المي ديشوه منظر حوضك؟", "start": 0.5, "dur": 2.5, "anim": "Scale Pop", "color": "WHITE", "pt": 38, "font": "Cairo-Bold.ttf", "y": 30},
    {"text": "الساموراي الأسود — قوة ما تنشاف", "start": 3.0, "dur": 2.5, "anim": "Fade In", "color": "AMBER", "pt": 30, "font": "Cairo-Bold.ttf", "y": 50},
    {"text": "أسود غامق يندمج بالخلفية", "start": 5.5, "dur": 2.5, "anim": "Slide Right", "color": "WHITE", "pt": 28, "font": "Tajawal-Medium.ttf", "y": 50},
    {"text": "ستانلس ستيل ضد الكسر — 100 واط", "start": 8.0, "dur": 2.5, "anim": "Fade In", "color": "WHITE", "pt": 28, "font": "Tajawal-Medium.ttf", "y": 50},
    {"text": "ثرموستات دقيق وحماية تلقائية", "start": 10.5, "dur": 2.5, "anim": "Slide Right", "color": "AMBER", "pt": 28, "font": "Tajawal-Regular.ttf", "y": 50},
    {"text": "متوفر الآن — aquavoiq.com", "start": 13.0, "dur": 3.0, "anim": "Scale Pop", "color": "GOLD", "pt": 32, "font": "Cairo-Bold.ttf", "y": 50},
]

def map_animation(anim_name):
    if anim_name == "Scale Pop": return "放大"
    if anim_name == "Slide Right": return "向右滑动"
    return "渐显" # Fade In

def format_arabic_for_capcut(text, max_chars=25):
    # Wrap text to max_chars per line
    wrapped_lines = textwrap.wrap(text, width=max_chars)
    final_lines = []
    for line in wrapped_lines:
        reshaped = arabic_reshaper.reshape(line)
        bidi_text = get_display(reshaped)
        final_lines.append(bidi_text)
    return "\n".join(final_lines)

def generate_hybrid_draft():
    print("[*] Generating the full project programmatically...")
    
    folder = jy.DraftFolder(CAPCUT_DRAFTS)
    script = folder.create_draft("TEMP_AUTO_DRAFT", 1080, 1920, fps=30, maintrack_adsorb=True, allow_replace=True)
    video_seg = jy.VideoSegment(jy.VideoMaterial(r"C:\Users\jaafa\Downloads\0419.mp4"),
                                jy.Timerange(0, int(16 * 1000000)))
    script.add_track(jy.TrackType.video)
    script.add_segment(video_seg)
    
    # إضافة النصوص مع الحركات
    for i, ov in enumerate(OVERLAYS):
        text_color = COLORS.get(ov["color"], COLORS["WHITE"])
        text_style = jy.TextStyle(
            size=15.0, # Base size, will scale using transform.scale
            color=text_color,
            bold=True,
        )
        shadow = jy.TextShadow(alpha=0.9, color=(0.0, 0.0, 0.0), distance=0.05)
        border = jy.TextBorder(alpha=1.0, color=(0.0, 0.0, 0.0), width=0.08)
        
        start_ms = int(ov["start"] * 1000000)
        dur_ms = int(ov["dur"] * 1000000)
        
        # البحث عن كود الأنيميشن
        target_anim_title = map_animation(ov["anim"])
        anim_enum = None
        for intro in jy.TextIntro:
            if intro.value.title == target_anim_title:
                anim_enum = intro
                break
                
        # Fade Out (渐隐)
        outro_enum = None
        for outro in jy.TextOutro:
            if outro.value.title == "渐隐":
                outro_enum = outro
                break
                
        seg = jy.TextSegment(
            text=format_arabic_for_capcut(ov["text"]),
            timerange=jy.Timerange(start_ms, dur_ms),
            style=text_style,
            shadow=shadow,
            border=border
        )
        if anim_enum:
            seg.add_animation(anim_enum)
        if outro_enum:
            seg.add_animation(outro_enum)
            
        track_name = f"text_{i}"
        script.add_track(jy.TrackType.text, track_name=track_name)
        script.add_segment(seg, track_name=track_name)

    script.save()
    temp_folder = os.path.join(CAPCUT_DRAFTS, "TEMP_AUTO_DRAFT")
    
    # 2. حقن (Hybrid Injection) داخل مجلد CapCut حقيقي (0419)
    if os.path.exists(TARGET_PROJECT):
        shutil.rmtree(TARGET_PROJECT)
    shutil.copytree(DONOR_PROJECT, TARGET_PROJECT)
    
    # تحميل JSON الأصلي السليم والـ JSON الوهمي الذي ولدناه
    with open(os.path.join(TARGET_PROJECT, "draft_content.json"), "r", encoding="utf-8") as f:
        native = json.load(f)
    with open(os.path.join(temp_folder, "draft_content.json"), "r", encoding="utf-8") as f:
        generated = json.load(f)
        
    # حقن مسارات الخطوط يدوياً لتجاوز قيود المكتبة
    for i, text_mat in enumerate(generated["materials"]["texts"]):
        if i < len(OVERLAYS):
            font_path = os.path.join(r"C:\Windows\Fonts", OVERLAYS[i]["font"]).replace("\\", "/")
            text_mat["font_path"] = font_path
            # تحديث داخلي
            inner_content = json.loads(text_mat["content"])
            if "styles" in inner_content and len(inner_content["styles"]) > 0:
                inner_content["styles"][0]["font"] = {"id": "", "path": font_path}
            text_mat["content"] = json.dumps(inner_content, ensure_ascii=False, separators=(',', ':'))
        
    # حقن المواد (Materials)
    if "materials" not in native: native["materials"] = {}
    native["materials"]["texts"] = generated["materials"]["texts"]
    native["materials"]["animations"] = generated["materials"].get("animations", [])
    
    # حقن الفيديوهات إن أردنا (استبدال مسار الفيديو الرئيسي)
    for vid in native["materials"].get("videos", []):
        if vid.get("metetype") == "video":
            vid["file_Path"] = r"C:/Users/jaafa/Desktop/upload/FishWebClean/Launch_Ideas/promot/remotion_aquavo/public/video/0419.mp4"
            vid["extra_info"] = "0419.mp4"
            break

    # تنظيف التراكات القديمة الخاصة بالنصوص وإضافة الجديدة السليمة مع تعديل إحداثيات Y
    native["tracks"] = [t for t in native["tracks"] if t["type"] != "text"]
    for t in generated["tracks"]:
        if t["type"] == "text":
            # إيجاد الاندكس المرتبط بهذا التراك لتعيين Y
            # في الأعلى أنشأنا التراك باسم text_0, text_1 إلخ
            try:
                idx = int(t.get("attribute", 0)) if "attribute" in t else None
                if idx is None and "segments" in t and len(t["segments"]) > 0:
                    # استخراج رقم النص من اسم التراك أو بالترتيب
                    # بما أننا أضفنا النصوص بترتيب OVERLAYS وكل نص بتراك جديد:
                    pass
            except Exception:
                pass
            
            # بدلاً من البحث المعقد، بما أننا أضفناهم بنفس ترتيب OVERLAYS
            # سنقوم بالتحديث المباشر للمكان (Y) استناداً إلى ترتيب Tracks الجديد
            native["tracks"].append(t)
            
    # تحديث إحداثيات Y و Scale لكل مقطع نصي
    text_track_idx = 0
    for t in native["tracks"]:
        if t["type"] == "text":
            if text_track_idx < len(OVERLAYS):
                y_percent = OVERLAYS[text_track_idx]["y"]
                pt_size = OVERLAYS[text_track_idx]["pt"]
                
                # تصحيح إحداثيات Y لـ CapCut
                # CapCut JSON Y = (UI_Y / Height)
                # مركز الشاشة = 0. أعلى الشاشة = -0.5, أسفل الشاشة = 0.5
                capcut_y = (y_percent / 100.0) - 0.5
                
                # حساب الـ Scale (نعتبر الحجم الأساسي 15 يعادل 18pt كمرجع تقريبي)
                capcut_scale = pt_size / 18.0
                
                for seg in t.get("segments", []):
                    if "clip" not in seg: seg["clip"] = {}
                    if "transform" not in seg["clip"]: seg["clip"]["transform"] = {"x": 0.0, "y": 0.0}
                    if "scale" not in seg["clip"]: seg["clip"]["scale"] = {"x": 1.0, "y": 1.0}
                    
                    seg["clip"]["transform"]["y"] = capcut_y
                    seg["clip"]["scale"]["x"] = capcut_scale
                    seg["clip"]["scale"]["y"] = capcut_scale
                    
            text_track_idx += 1
            
    # حفظ draft_content.json المهجن
    with open(os.path.join(TARGET_PROJECT, "draft_content.json"), "w", encoding="utf-8") as f:
        json.dump(native, f, ensure_ascii=False)
        
    # تحديث Meta Info لكي يظهر في CapCut بالاسم الصحيح
    meta_path = os.path.join(TARGET_PROJECT, "draft_meta_info.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    meta["draft_name"] = PROJECT_NAME
    meta["draft_fold_path"] = TARGET_PROJECT.replace("\\", "/")
    meta["draft_id"] = str(uuid.uuid4()).upper()
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
        
    # تنظيف الفولدر الوهمي
    shutil.rmtree(temp_folder)
    
    print("[+] Full automation successful! CapCut project generated.")
    print(f"Now open CapCut, you will find a project named: {PROJECT_NAME}")

if __name__ == "__main__":
    generate_hybrid_draft()

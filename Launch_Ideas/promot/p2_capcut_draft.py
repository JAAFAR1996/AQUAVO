# -*- coding: utf-8 -*-
"""
CapCut Draft Generator — P2 سخان الساموراي الأسود
يولد مشروع CapCut جاهز مع كل النصوص والتوقيتات والأنيميشن تلقائياً
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")

import pyJianYingDraft as jy
from pyJianYingDraft import SEC, Timerange

# ─── مسار الفيديو الأصلي ────────────────────────────────────────────
VIDEO_PATH = r"C:\Users\jaafa\Downloads\0419.mp4"

# ─── مجلد حفظ المشروع ───────────────────────────────────────────────
CAPCUT_DRAFTS = os.path.expanduser(
    r"~\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
)
PROJECT_NAME = "P2_SAMURAI_AQUAVO"
PROJECT_DIR  = os.path.join(CAPCUT_DRAFTS, PROJECT_NAME)

# ─── ألوان (R, G, B بين 0.0 و 1.0) ─────────────────────────────────
WHITE = (1.0, 1.0, 1.0)
AMBER = (1.0, 0.702, 0.278)
GOLD  = (1.0, 0.843, 0.0)

# ─── دوال البحث عن الأنيميشن بالاسم الصيني ──────────────────────────
def _find_intro(cn_name: str) -> jy.TextIntro:
    for member in jy.TextIntro:
        if member.value.title == cn_name:
            return member
    raise ValueError(f"TextIntro not found: {cn_name}")

def _find_outro(cn_name: str) -> jy.TextOutro:
    for member in jy.TextOutro:
        if member.value.title == cn_name:
            return member
    raise ValueError(f"TextOutro not found: {cn_name}")

# ─── تعريف النصوص مع التوقيتات الدقيقة بالثواني ──────────────────
# (النص، حجم، لون، Bold، بداية، مدة، اسم أنيميشن IN بالصيني، اسم OUT بالصيني)
OVERLAYS = [
    # ━━━ HOOK
    {"text": "سخان المي ديشوه منظر حوضك؟",
     "size": 15.0, "color": WHITE, "bold": True,
     "start": 0.5,  "dur": 4.5,  "intro": "放大", "outro": "渐隐"},

    {"text": "كل هالتعب على التنسيق —\nوسخان قبيح يدمر كلشي",
     "size": 10.0, "color": WHITE, "bold": True,
     "start": 2.5,  "dur": 2.0,  "intro": "向右滑动",  "outro": "渐隐"},

    {"text": "الساموراي الأسود — قوة ما تنشاف",
     "size": 12.0, "color": AMBER, "bold": True,
     "start": 4.5,  "dur": 5.5,  "intro": "渐显",       "outro": "渐隐"},

    # ━━━ SOLUTION
    {"text": "ستانلس ستيل 304 — لا يصدأ ولا ينكسر",
     "size": 12.0, "color": WHITE, "bold": True,
     "start": 11.0, "dur": 3.0,  "intro": "渐显",       "outro": "渐隐"},

    {"text": "تصميم أسود غامق يندمج بالخلفية",
     "size": 10.0, "color": WHITE, "bold": False,
     "start": 13.5, "dur": 3.0,  "intro": "向右滑动",  "outro": "渐隐"},

    {"text": "100 واط — يغطي 50 إلى 100 لتر",
     "size": 10.0, "color": AMBER, "bold": False,
     "start": 16.0, "dur": 3.0,  "intro": "渐显",       "outro": "渐隐"},

    {"text": "ثرموستات دقيق مع حماية تلقائية",
     "size": 9.0,  "color": WHITE, "bold": False,
     "start": 18.5, "dur": 3.0,  "intro": "渐显",       "outro": "渐隐"},

    # ━━━ CTA
    {"text": "مو مجرد سخان\nجزء من التصميم",
     "size": 14.0, "color": GOLD,  "bold": True,
     "start": 22.5, "dur": 3.0,  "intro": "放大", "outro": "渐隐"},

    {"text": "قوة مخفية وجمال ظاهر",
     "size": 11.0, "color": WHITE, "bold": True,
     "start": 25.0, "dur": 2.5,  "intro": "渐显",       "outro": "渐隐"},

    {"text": "متوفر الآن — aquavoiq.com",
     "size": 10.0, "color": AMBER, "bold": True,
     "start": 27.0, "dur": 3.0,  "intro": "向右滑动",  "outro": "渐隐"},

    {"text": "AQUAVO",
     "size": 9.0,  "color": GOLD,  "bold": True,
     "start": 28.5, "dur": 1.5,  "intro": "渐显",       "outro": "渐隐"},
]


def build_draft():
    # مدير المشاريع في المسار الأساسي
    folder = jy.DraftFolder(CAPCUT_DRAFTS)
    
    # إنشاء مشروع جديد (ينشئ المجلد و draft_meta_info تلقائياً)
    script = folder.create_draft(PROJECT_NAME, 1080, 1920, fps=30, maintrack_adsorb=True, allow_replace=True)

    # إنشاء الـ Tracks للـ Video فقط في البداية
    script.add_track(jy.TrackType.video)

    # الفيديو الأصلي
    video_mat = jy.VideoMaterial(VIDEO_PATH)
    script.add_segment(
        jy.VideoSegment(video_mat, Timerange(0, 16 * SEC))
    )

    # الظل والحدود المشتركة
    shadow = jy.TextShadow(alpha=0.8, color=(0.0, 0.0, 0.0),
                            diffuse=6.0, distance=3.0, angle=-135.0)
    border = jy.TextBorder(alpha=0.6, color=(0.0, 0.0, 0.0), width=40.0)

    for i, ov in enumerate(OVERLAYS):
        t_start = int(ov["start"] * SEC)
        t_dur   = int(ov["dur"]   * SEC)

        style = jy.TextStyle(
            size  = ov["size"],
            bold  = ov["bold"],
            color = ov["color"],
            alpha = 1.0,
            align = 1,   # Center
        )

        seg = jy.TextSegment(
            text      = ov["text"],
            timerange = Timerange(t_start, t_dur),
            style     = style,
            border    = border,
            shadow    = shadow,
        )

        # إضافة الأنيميشن بالبحث عن الـ enum الصحيح
        seg.add_animation(_find_intro(ov["intro"]), duration=0.4 * SEC)
        seg.add_animation(_find_outro(ov["outro"]), duration=0.3 * SEC)

        # CapCut يمنع تداخل النصوص في نفس الـ Track، لذلك ننشئ Track مستقل لكل نص
        track_name = f"text_track_{i}"
        script.add_track(jy.TrackType.text, track_name=track_name)
        script.add_segment(seg, track_name=track_name)
        
        print(f"  ✅ [{i+1:02d}] {ov['text'][:30]:30s}  {ov['start']:.1f}s → {ov['start']+ov['dur']:.1f}s  [{ov['intro']}]")

    # حفظ المشروع (ينشئ draft_content و meta_info)
    script.save()
    print(f"\n🎬 تم حفظ المشروع بنجاح!")
    print("📂 افتح CapCut ← My Projects ← P2_SAMURAI_AQUAVO")


if __name__ == "__main__":
    print("=" * 58)
    print("  P2 CapCut Draft Generator — AQUAVO Samurai Heater")
    print("=" * 58)
    print(f"\n📹 {VIDEO_PATH}")
    print(f"📁 {PROJECT_DIR}\n")
    build_draft()

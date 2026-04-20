import os
import json
import shutil
import uuid
from copy import deepcopy

CAPCUT_DRAFTS = os.path.expanduser(r"~\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft")
TEMPLATE_DIR = os.path.join(CAPCUT_DRAFTS, "AQUAVO_TEMPLATE")

def update_capcut_project(target_name, target_video_path, overlays_data):
    target_dir = os.path.join(CAPCUT_DRAFTS, target_name)
    
    # 1. نسخ القالب
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    shutil.copytree(TEMPLATE_DIR, target_dir)
    
    # 2. تعديل meta_info
    meta_path = os.path.join(target_dir, "draft_meta_info.json")
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    
    meta["draft_name"] = target_name
    meta["draft_fold_path"] = target_dir.replace("\\", "/")
    meta["draft_root_path"] = CAPCUT_DRAFTS.replace("\\", "/")
    meta["draft_id"] = str(uuid.uuid4()).upper()
    
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))

    # 3. تعديل content.json
    content_path = os.path.join(target_dir, "draft_content.json")
    with open(content_path, 'r', encoding='utf-8') as f:
        content = json.load(f)
        
    # تحديث مسار الفيديو
    if "videos" in content.get("materials", {}):
        for vid in content["materials"]["videos"]:
            if vid.get("metetype") == "video": # تجاهل الصور
                vid["file_Path"] = target_video_path.replace("\\", "/")
                vid["extra_info"] = os.path.basename(target_video_path)
                break
                
    # استخراج النصوص من القالب (مرتبة حسب الوقت)
    # سنحتاج إلى معرفة IDs الخاص بالنصوص لتحديث التايملاين
    texts = content["materials"].get("texts", [])
    
    # جمع كل قطع النصوص من التراكات
    text_segments = []
    text_tracks = []
    for track in content.get("tracks", []):
        if track.get("type") == "text":
            text_tracks.append(track)
            for seg in track.get("segments", []):
                text_segments.append(seg)
                
    # ترتيب القطع حسب وقت البداية
    text_segments.sort(key=lambda x: x["target_timerange"]["start"])
    
    # تحديث النصوص والتوقيتات
    for i, ov in enumerate(overlays_data):
        if i >= len(text_segments):
            print(f"⚠️ القالب لا يحتوي على نصوص كافية! تم تجاهل النص: {ov['text']}")
            break
            
        seg = text_segments[i]
        mat_id = seg["material_id"]
        
        # 1. تحديث التوقيت في القطعة
        start_ms = int(ov["start"] * 1000000) # تحويل الثواني إلى ميكروثانية
        dur_ms = int(ov["dur"] * 1000000)
        
        seg["target_timerange"]["start"] = start_ms
        seg["target_timerange"]["duration"] = dur_ms
        seg["source_timerange"]["duration"] = dur_ms
        
        # 2. تحديث النص الفعلي في قائمة المواد
        for text_mat in texts:
            if text_mat["id"] == mat_id:
                # محتوى النص داخل CapCut هو JSON string
                inner_content = json.loads(text_mat["content"])
                inner_content["text"] = ov["text"]
                # تحديث طول النص في التنسيق
                if "styles" in inner_content and len(inner_content["styles"]) > 0:
                    inner_content["styles"][0]["range"] = [0, len(ov["text"])]
                text_mat["content"] = json.dumps(inner_content, ensure_ascii=False, separators=(',', ':'))
                break
                
    # 4. حفظ التعديلات
    with open(content_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, separators=(',', ':'))
        
    print(f"✅ تم توليد المشروع بنجاح: {target_name}")

if __name__ == "__main__":
    print("السكربت جاهز للأتمتة!")

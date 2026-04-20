import os

skills_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\.agents\skills"
output_file = r"c:\Users\jaafa\Desktop\upload\FishWebClean\AQUAVO_ALL_SKILLS_RAW.md"

with open(output_file, "w", encoding="utf-8") as out_f:
    out_f.write("# ===================================================================\n")
    out_f.write("# AQUAVO — جميع ملفات SKILL.md المحملة (النسخ الحقيقية)\n")
    out_f.write("# للاستخدام مع أي AI: ChatGPT, Claude, Gemini, Copilot, etc.\n")
    out_f.write("# ===================================================================\n\n")
    
    count = 0
    if os.path.exists(skills_dir):
        for item in os.listdir(skills_dir):
            item_path = os.path.join(skills_dir, item)
            if os.path.isdir(item_path):
                skill_file = os.path.join(item_path, "SKILL.md")
                
                out_f.write("\n\n========================================\n")
                out_f.write(f"### SKILL: {item}\n")
                out_f.write("========================================\n\n")
                
                if os.path.exists(skill_file):
                    with open(skill_file, "r", encoding="utf-8") as f:
                        out_f.write(f.read())
                        count += 1
                else:
                    out_f.write("[ملف SKILL.md غير موجود — المجلد قد يكون فارغاً أو يحمل اسماً مختلفاً]\n")
                out_f.write("\n")

print(f"Done! Successfully compiled {count} skills into {output_file}")

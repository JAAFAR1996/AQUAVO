import os
import shutil

source_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\.agents\skills"
target_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\All_Skills_Extracted"

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

count = 0
for item in os.listdir(source_dir):
    item_path = os.path.join(source_dir, item)
    if os.path.isdir(item_path):
        skill_file = os.path.join(item_path, "SKILL.md")
        if os.path.exists(skill_file):
            dest_file = os.path.join(target_dir, f"{item}.md")
            shutil.copy2(skill_file, dest_file)
            count += 1

print(f"Extraction complete! Copied {count} files to {target_dir}")

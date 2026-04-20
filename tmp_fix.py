import re

file_path = r'C:\Users\jaafa\Desktop\upload\FishWebClean\Launch_Ideas\promot\AQUAVO_REELS_PROMPTS_BATCH11.md'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace any occurrence of the typography prompt
pattern = re.compile(r'TYPOGRAPHY DESIGN: Generate bold Arabic text directly on the image\. CRITICAL LAYOUT RULE: You MUST place all typography exactly in the DEAD CENTER of the frame\. DO NOT place any text in the top 30% or the bottom 35% of the image vertical space\. Keep all text tightly grouped in the absolute mathematical center\. Texts to include:.*?(?=")', re.DOTALL)

matches = pattern.findall(text)
print(f"Found {len(matches)} matches to replace")

new_text = pattern.sub('COMPOSITION RULE: Leave the DEAD CENTER of the frame slightly darker and uncluttered (negative space) for text overlays. DO NOT GENERATE ANY TEXT, LETTERS, OR WATERMARKS IN THE IMAGE.', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Replacement complete.")

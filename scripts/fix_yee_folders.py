"""
إصلاح المجلدات غير المتطابقة يدوياً
"""
import os
import shutil

yee_folder = r'c:\Users\jaafa\Desktop\upload\FishWebClean\yee'

# المطابقة اليدوية للمجلدات المتبقية
manual_mapping = {
    '(Blue) New upgraded 6D filter cotton 5040 two pieces': 'YLL-087',
    '50W  & 100W&  200Wpure steel heating rod YSH-50': 'YEE-3006_3007_3008',  # 3 منتجات بمجلد واحد
    'Acrylic incubator 201010': 'YKL-018',
    'New Shelled Eggs (140g 200ml) White Bottle + Feeder': 'YYY-078',  # ملاحظة: Excel يقول 80g لكن المجلد 140g
    '[Novice Level 50] 9-in-1BucketWith Comparison Chart': 'C4-1123',
    '【All-in-one】Microparticles0.2mm210g': 'C1-1082-2',  # نسخة الـ 0.2mm
    '【Ammonia nitrogen tester】can test about 60 timesaccurate and fast & 【Nitrite test kit】can test about 100 timesaccurate and fast': 'C3-1010',
    '【Refill】9 in 1Refill50 pieces': 'C4-1123-2',
}

print("🔧 جاري إعادة تسمية المجلدات المتبقية...")
print("-" * 60)

for old_name, new_name in manual_mapping.items():
    old_path = os.path.join(yee_folder, old_name)
    new_path = os.path.join(yee_folder, new_name)
    
    if os.path.exists(old_path):
        try:
            os.rename(old_path, new_path)
            print(f"  ✅ {old_name[:40]:40} → {new_name}")
        except Exception as e:
            print(f"  ❌ خطأ: {e}")
    else:
        print(f"  ⚠️ غير موجود: {old_name[:50]}")

print("\n✅ تم إصلاح جميع المجلدات!")

# عرض قائمة المجلدات النهائية
print("\n📁 قائمة المجلدات النهائية:")
print("-" * 60)
folders = sorted([f for f in os.listdir(yee_folder) if os.path.isdir(os.path.join(yee_folder, f))])
for i, folder in enumerate(folders, 1):
    folder_path = os.path.join(yee_folder, folder)
    images = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif'))]
    print(f"  {i:2}. {folder:40} ({len(images)} صور)")

print(f"\n📊 إجمالي المجلدات: {len(folders)}")

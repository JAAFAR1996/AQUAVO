"""
تنظيم صور YEE - نسخ من Downloads وإعادة التسمية بأسماء الموديلات
"""
import pandas as pd
import os
import shutil
from pathlib import Path

# المسارات
source_folder = r'C:\Users\jaafa\Downloads\yee'
target_folder = r'c:\Users\jaafa\Desktop\upload\FishWebClean\yee'
excel_path = r'c:\Users\jaafa\Desktop\upload\FishWebClean\客户伊拉克Jaafar-1.3.xlsx'

# قراءة ملف Excel
df = pd.read_excel(excel_path, header=None)

# استخراج بيانات المنتجات (من الصف 9 إلى 73)
products_df = df.iloc[9:74]

# إنشاء قاموس الموديلات
excel_products = {}
for idx, row in products_df.iterrows():
    if pd.notna(row[0]) and row[0] != 'Products price' and row[0] != 'Total':
        model = str(row[3]).strip() if pd.notna(row[3]) else ''
        english_name = str(row[5]).strip() if pd.notna(row[5]) else ''
        if model and english_name:
            excel_products[english_name] = model

print(f"📋 عدد المنتجات في Excel: {len(excel_products)}")

# قراءة مجلدات المصدر
source_folders = [f for f in os.listdir(source_folder) if os.path.isdir(os.path.join(source_folder, f))]
print(f"📁 عدد المجلدات في Downloads: {len(source_folders)}")

# مطابقة الأسماء
mapping = {}
unmatched = []

for folder in source_folders:
    matched = False
    for excel_name, model in excel_products.items():
        # مقارنة مباشرة
        if folder.lower() == excel_name.lower():
            mapping[folder] = model
            matched = True
            break
        # مقارنة جزئية
        if excel_name.lower() in folder.lower() or folder.lower() in excel_name.lower():
            mapping[folder] = model
            matched = True
            break
    
    if not matched:
        # محاولة مطابقة أكثر مرونة
        folder_clean = folder.lower().replace(' ', '').replace('-', '').replace('_', '')
        for excel_name, model in excel_products.items():
            excel_clean = excel_name.lower().replace(' ', '').replace('-', '').replace('_', '')
            if folder_clean in excel_clean or excel_clean in folder_clean:
                mapping[folder] = model
                matched = True
                break
    
    if not matched:
        unmatched.append(folder)

print(f"\n✅ المجلدات المتطابقة: {len(mapping)}")
print(f"❌ المجلدات غير المتطابقة: {len(unmatched)}")

# عرض المطابقات
print("\n📋 خريطة التسمية:")
print("-" * 80)
for folder, model in mapping.items():
    print(f"  {folder[:45]:45} → {model}")

print("\n❌ لم يتم التطابق:")
for f in unmatched:
    print(f"  • {f}")

# تأكيد المتابعة
print("\n" + "="*80)
response = input("هل تريد المتابعة مع حذف المجلد القديم ونسخ الجديد؟ (y/n): ")

if response.lower() != 'y':
    print("تم الإلغاء")
    exit()

# حذف المجلد القديم
print("\n🗑️ جاري حذف المجلد القديم...")
if os.path.exists(target_folder):
    shutil.rmtree(target_folder)
    print("  تم الحذف")

# إنشاء المجلد الجديد
os.makedirs(target_folder, exist_ok=True)

# نسخ وإعادة تسمية المجلدات
print("\n📦 جاري نسخ وإعادة تسمية المجلدات...")
copied = 0
for folder in source_folders:
    source_path = os.path.join(source_folder, folder)
    
    if folder in mapping:
        # استخدم اسم الموديل
        new_name = mapping[folder]
    else:
        # احتفظ بالاسم الأصلي
        new_name = folder
    
    # تنظيف اسم المجلد
    new_name = new_name.replace('/', '_').replace('\\', '_').replace(':', '_')
    target_path = os.path.join(target_folder, new_name)
    
    # نسخ المجلد
    try:
        shutil.copytree(source_path, target_path)
        print(f"  ✅ {folder[:35]:35} → {new_name}")
        copied += 1
    except Exception as e:
        print(f"  ❌ خطأ في نسخ {folder}: {e}")

# نسخ الصور المفردة
for item in os.listdir(source_folder):
    item_path = os.path.join(source_folder, item)
    if os.path.isfile(item_path) and item.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
        target_path = os.path.join(target_folder, item)
        shutil.copy2(item_path, target_path)
        print(f"  📷 نسخ صورة: {item}")

print(f"\n✅ تم نسخ {copied} مجلد بنجاح!")
print(f"📁 المسار الجديد: {target_folder}")

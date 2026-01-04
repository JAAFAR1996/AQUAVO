"""
تحليل منتجات YEE ومقارنة الصور
"""
import pandas as pd
import os
from pathlib import Path
import json

# قراءة ملف Excel
excel_path = r'c:\Users\jaafa\Desktop\upload\FishWebClean\客户伊拉克Jaafar-1.3.xlsx'
df = pd.read_excel(excel_path, header=None)

# استخراج بيانات المنتجات (من الصف 9 إلى 73)
products_df = df.iloc[9:74]

# إنشاء قائمة المنتجات من Excel
excel_products = []
for idx, row in products_df.iterrows():
    if pd.notna(row[0]) and row[0] != 'Products price' and row[0] != 'Total':
        product = {
            'item_no': row[0],
            'business_code': row[2] if pd.notna(row[2]) else '',
            'model': row[3] if pd.notna(row[3]) else '',
            'chinese_name': row[4] if pd.notna(row[4]) else '',
            'english_name': row[5] if pd.notna(row[5]) else '',
            'price': row[6] if pd.notna(row[6]) else 0,
            'qty': row[7] if pd.notna(row[7]) else 0,
        }
        excel_products.append(product)

print(f"عدد المنتجات في Excel: {len(excel_products)}")
print("="*80)

# قراءة مجلدات yee
yee_folder = r'c:\Users\jaafa\Desktop\upload\FishWebClean\yee'
yee_folders = []
yee_images = {}

for item in os.listdir(yee_folder):
    item_path = os.path.join(yee_folder, item)
    if os.path.isdir(item_path):
        # عد الصور في كل مجلد
        images = [f for f in os.listdir(item_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif'))]
        yee_folders.append(item)
        yee_images[item] = images
    elif item.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
        # صور مباشرة في المجلد الرئيسي
        if '_root_' not in yee_images:
            yee_images['_root_'] = []
        yee_images['_root_'].append(item)

print(f"عدد المجلدات في yee: {len(yee_folders)}")
print("="*80)

# مقارنة المنتجات
matched = []
unmatched_excel = []
unmatched_folders = list(yee_folders)

for product in excel_products:
    english_name = str(product['english_name']).strip()
    found = False
    matched_folder = None
    
    for folder in yee_folders:
        # مقارنة مباشرة
        if folder.lower() == english_name.lower():
            found = True
            matched_folder = folder
            break
        # مقارنة جزئية
        if english_name.lower() in folder.lower() or folder.lower() in english_name.lower():
            found = True
            matched_folder = folder
            break
    
    if found and matched_folder:
        matched.append({
            'excel_name': english_name,
            'folder_name': matched_folder,
            'model': product['model'],
            'images_count': len(yee_images.get(matched_folder, [])),
            'images': yee_images.get(matched_folder, [])
        })
        if matched_folder in unmatched_folders:
            unmatched_folders.remove(matched_folder)
    else:
        unmatched_excel.append(product)

print("\n📊 ملخص التحليل:")
print("="*80)
print(f"✅ المنتجات المتطابقة: {len(matched)}")
print(f"❌ منتجات Excel بدون مجلد صور: {len(unmatched_excel)}")
print(f"📁 مجلدات yee بدون منتج Excel: {len(unmatched_folders)}")

print("\n\n📋 المنتجات المتطابقة:")
print("-"*80)
for m in matched:
    print(f"  • {m['model']}: {m['excel_name'][:50]}...")
    print(f"    المجلد: {m['folder_name'][:50]}...")
    print(f"    عدد الصور: {m['images_count']}")

print("\n\n❌ منتجات Excel بدون صور:")
print("-"*80)
for p in unmatched_excel:
    print(f"  • {p['model']}: {p['english_name']}")

print("\n\n📁 مجلدات صور بدون منتج في Excel:")
print("-"*80)
for f in unmatched_folders:
    print(f"  • {f}")
    print(f"    عدد الصور: {len(yee_images.get(f, []))}")

# حفظ التقرير
report = {
    'total_excel_products': len(excel_products),
    'total_yee_folders': len(yee_folders),
    'matched_count': len(matched),
    'unmatched_excel_count': len(unmatched_excel),
    'unmatched_folders_count': len(unmatched_folders),
    'matched': matched,
    'unmatched_excel': unmatched_excel,
    'unmatched_folders': unmatched_folders
}

with open(r'c:\Users\jaafa\Desktop\upload\FishWebClean\yee_analysis_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("\n\n✅ تم حفظ التقرير في: yee_analysis_report.json")

INSERT INTO products (
  id, slug, name, brand, category, subcategory, 
  description, price, original_price, currency, 
  images, thumbnail, rating, review_count, 
  stock, low_stock_threshold, is_new, is_best_seller,
  specifications, category_id, has_variants, variants
) VALUES (
  'yee-cwd-003-cherlam-lcd-thermometer-alarm',
  'yee-cwd-003',
  'Cherlam ميزان حرارة رقمي LCD مع تنبيه صوتي | نسخة المنبه',
  'YEE',
  'الفحص والمراقبة',
  'أدوات فحص المياه',
  'ميزان حرارة رقمي بشاشة LCD واضحة مع خاصية التنبيه الصوتي عند تجاوز درجة الحرارة الحدود الآمنة.

يعرض درجة الحرارة بدقة عالية مع إمكانية ضبط حدود التنبيه العليا والدنيا. عند تجاوز الماء للحدود المحددة، يصدر تنبيه صوتي لحماية أسماكك.

مثالي لأحواض الأسماك الاستوائية التي تحتاج مراقبة مستمرة لدرجة الحرارة. سهل التركيب والاستخدام مع شاشة كبيرة سهلة القراءة.',
  0,
  NULL,
  'IQD',
  '[ "/images/products/yee/Cwd-003/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/Cwd-003/_model_gemini25flashimage_4k_20260_1.jpeg", "/images/products/yee/Cwd-003/5.jpeg", "/images/products/yee/Cwd-003/55.jpeg" ]'::jsonb,
  '/images/products/yee/Cwd-003/_model_gemini25flashimage_4k_20260.jpeg',
  0,
  0,
  10,
  5,
  true,
  false,
  '{
    "الماركة": "Cherlam",
    "الموديل": "CWD-003",
    "النوع": "ميزان حرارة رقمي مع منبه",
    "الشاشة": "LCD",
    "التنبيه": "صوتي عند تجاوز الحدود",
    "مناسب لـ": "أحواض المياه العذبة والمالحة"
  }'::jsonb,
  'db9d816c-ac55-4cef-8f6b-01490072163c',
  false,
  NULL
);

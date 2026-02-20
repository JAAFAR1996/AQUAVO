BEGIN;

-- Step 1: Update original product with variants
UPDATE products SET 
  has_variants = true,
  variants = '[
    {"id": "complete", "label": "المنتج الكامل (مع العلبة وجدول المقارنة)", "price": 0, "stock": 33},
    {"id": "refill", "label": "إعادة تعبئة (شرائط فقط)", "price": 0, "stock": 34}
  ]'::jsonb,
  description = 'شرائط اختبار سريعة تقيس 9 معايير مائية في غمسة واحدة: pH، أمونيا، نيتريت، نترات، كلور، عسر الماء، قلوية، حديد، ونحاس.

تأتي مع جدول مقارنة ألوان واضح لقراءة النتائج بسهولة. 50 شريط في علبة محكمة الإغلاق.

الطريقة الأسرع والأسهل لمراقبة جودة مياه حوضك بانتظام. اختبار أسبوعي يمنع كوارث الأحواض.

📦 متوفر بخيارين:
• المنتج الكامل: يشمل العلبة + جدول مقارنة الألوان (للمشتري الجديد)
• إعادة تعبئة: 50 شريط فقط بسعر أقل (لمن عنده العلبة من قبل)',
  name = 'YEE شرائط اختبار الماء 9 في 1 - تحليل شامل خلال ثوانٍ | 50 شريط'
WHERE id = 'yee-novice-level-50-9-in-1bucketwith-comparison-chart';

-- Step 2: Delete refill product related data
DELETE FROM product_embeddings WHERE product_id = 'yee-refill9-in-1refill50-pieces';
DELETE FROM product_interactions WHERE product_id = 'yee-refill9-in-1refill50-pieces';
DELETE FROM product_views WHERE product_id = 'yee-refill9-in-1refill50-pieces';

-- Step 3: Delete refill product itself
DELETE FROM products WHERE id = 'yee-refill9-in-1refill50-pieces';

COMMIT;

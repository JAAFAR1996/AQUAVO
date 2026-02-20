-- =====================================================
-- إصلاح الصورة المفقودة + \n\n في الوصف
-- =====================================================

-- 1. إصلاح صورة yee-3656 (اسم الملف الصحيح بـ _32 بدل (32))
UPDATE products SET
  thumbnail = '/images/products/yee/yee-reinforced-tube/_model_gemini25flashimage_4k_20260_32.jpeg',
  images = '["/images/products/yee/yee-reinforced-tube/_model_gemini25flashimage_4k_20260_32.jpeg", "/images/products/yee/yee-reinforced-tube/Change_the_other_4k_202602091926.jpeg"]'::jsonb
WHERE id = 'yee-3656-tubing';

-- 2. إصلاح وصف السيفون (إزالة \n\n)
UPDATE products SET
  description = 'سيفون تغيير ماء عملي وسهل الاستخدام لتنظيف حوض السمك. أنبوب مائي بطول 1.5 متر مصنوع من مادة مرنة عالية الجودة لا تتصلب مع الوقت. مصمم لسحب الماء القديم والأوساخ والفضلات المتراكمة في قاع الحوض بسهولة. مقاوم للتآكل والاتساخ. أداة أساسية لكل هاوي أحواض لتغيير الماء بشكل دوري والحفاظ على بيئة صحية للأسماك.'
WHERE id = 'yee-air-tube-reinforced';

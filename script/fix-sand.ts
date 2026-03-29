import { db } from '../server/db.js';
import { products, translations, ProductVariant } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function updateSandProduct() {
  console.log('⏳ جاري جلب المنتج من قاعدة البيانات...');
  const sandProduct = await db.query.products.findFirst({
    where: eq(products.slug, 'houyi-south-american-sand')
  });

  if (!sandProduct) {
    console.log('❌ لم يتم العثور على المنتج houyi-south-american-sand في قاعدة البيانات.');
    process.exit(1);
  }

  // إنشاء الخيارات (أحمر وأسود) بنفس السعر الافتراضي للمنتج
  const currentPrice = Number(sandProduct.price) || 5000;
  
  const variants: ProductVariant[] = [
    {
      id: "red",
      label: "أحمر",
      price: currentPrice,
      stock: sandProduct.stock > 0 ? sandProduct.stock : 50,
      isDefault: true
    },
    {
      id: "black",
      label: "أسود",
      price: currentPrice,
      stock: sandProduct.stock > 0 ? sandProduct.stock : 50,
      isDefault: false
    }
  ];

  console.log('🔄 جاري تحديث الاسم وإضافة الخيارات (أحمر وأسود)...');

  // تحديث الاسم الإنجليزي وإضافة الخيارات
  await db.update(products).set({
    name: 'South American Sand (Red & Black)',
    hasVariants: true,
    variants: variants
  }).where(eq(products.id, sandProduct.id));

  // تحديث الاسم العربي في جدول الترجمات (إزالة كلمة الذهبي)
  const newArabicName = 'رمل أمريكا الجنوبية (أحمر وأسود)';
  
  // البحث عما إذا كانت هناك ترجمة عربية موجودة للاسم
  const existingArName = await db.query.translations.findFirst({
    where: and(
      eq(translations.entityId, sandProduct.id),
      eq(translations.language, 'ar'),
      eq(translations.field, 'name')
    )
  });

  if (existingArName) {
    await db.update(translations)
      .set({ value: newArabicName })
      .where(eq(translations.id, existingArName.id));
  } else {
    // إذا لم تكن موجودة، قم بإنشائها
    await db.insert(translations).values({
      entityType: 'product',
      entityId: sandProduct.id,
      field: 'name',
      language: 'ar',
      value: newArabicName
    });
  }

  console.log('✅ تم التعديل بنجاح!');
  console.log(`- الاسم الجديد: ${newArabicName}`);
  console.log(`- الخيارات المضافة: أحمر ، أسود`);
  process.exit(0);
}

updateSandProduct().catch(console.error);

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Adding Acrylic Pipe Clamp ===\n');

  const id = 'houyi-acrylic-pipe-clamp';
  const name = 'مشبك أكريليك لتثبيت أنابيب الفلتر';
  const slug = 'houyi-acrylic-pipe-clamp';

  const description = `ثبّت أنابيب الفلتر على حافة الحوض بثبات مطلق — بدون اهتزاز ولا انزلاق.

مشبك أكريليك شفاف عالي الجودة مصمم لتثبيت أنابيب دخول وخروج الماء (Inflow / Outflow) على حافة زجاج الحوض. يُبقي الأنابيب مستقرة في مكانها ويمنعها من التحرك أو السقوط أثناء التشغيل.

مصنوع من أكريليك شفاف بالكامل فلا يؤثر على المظهر الجمالي للحوض — يندمج مع الزجاج ويبدو وكأنه غير موجود. مزوّد ببراغي تثبيت قابلة للتعديل تناسب سماكات زجاج مختلفة.

مثالي لأحواض الأكواسكيب التي تستخدم أنابيب زجاجية (Lily Pipe) أو أنابيب ستانلس ستيل — يوفّر تثبيتاً احترافياً يحافظ على أناقة الحوض.`;

  const specifications = {
    "العلامة التجارية": "HOUYI",
    "المادة": "أكريليك شفاف عالي الجودة",
    "اللون": "شفاف",
    "الاستخدام": "تثبيت أنابيب دخول وخروج الماء على حافة الحوض",
    "قابل للتعديل": "نعم — براغي تثبيت تناسب سماكات زجاج مختلفة",
    "يناسب": "أنابيب Lily Pipe، أنابيب ستانلس ستيل، أنابيب الفلتر الخارجي",
    "benefits": [
      "تثبيت محكم — يمنع اهتزاز وانزلاق الأنابيب",
      "أكريليك شفاف — يندمج مع الزجاج ولا يشوّه المظهر",
      "براغي قابلة للتعديل — تناسب سماكات زجاج مختلفة",
      "يحمي الأنابيب الزجاجية — يمنع سقوطها وانكسارها",
      "تصميم احترافي — مثالي لأحواض الأكواسكيب",
      "سهل التركيب والإزالة — بدون أدوات إضافية"
    ],
    "safetyWarnings": [
      "لا تشد البراغي بقوة مفرطة — قد تضغط على الزجاج",
      "تأكد من تثبيت المشبك قبل تشغيل الفلتر",
      "افحص المشبك دورياً وتأكد من عدم تراخي البراغي",
      "نظّف الأكريليك بقطعة قماش ناعمة — لا تستخدم مواد كاشطة",
      "لا تعرّض للشمس المباشرة لفترات طويلة لمنع الاصفرار"
    ],
    "usageInstructions": [
      "فك البراغي وافتح المشبك بالكامل",
      "ضع المشبك على حافة زجاج الحوض في المكان المطلوب",
      "شد البراغي تدريجياً حتى يثبت المشبك على الزجاج بإحكام",
      "مرّر أنبوب الفلتر (Inflow أو Outflow) من خلال الفتحة المخصصة",
      "عدّل وضعية الأنبوب ثم تأكد من ثباته قبل تشغيل الفلتر"
    ]
  };

  // Check if product already exists
  const existing = await sql`SELECT id FROM products WHERE id = ${id}`;
  if (existing.length > 0) {
    console.log('⚠️  Product already exists! Updating...');
    await sql`
      UPDATE products SET
        name = ${name},
        slug = ${slug},
        description = ${description},
        specifications = ${JSON.stringify(specifications)}::jsonb,
        price = ${1500},
        stock = ${20},
        category = ${'accessories'},
        subcategory = ${'clamps'},
        brand = ${'Houyi'},
        thumbnail = ${'/images/products/houyi/houyi-acrylic-pipe-clamp/placeholder.jpg'},
        images = ${'[]'}::jsonb,
        deleted_at = ${null},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    console.log('Adding new product...');
    await sql`
      INSERT INTO products (id, name, slug, description, specifications, price, stock, category, subcategory, brand, thumbnail, images, created_at, updated_at)
      VALUES (
        ${id},
        ${name},
        ${slug},
        ${description},
        ${JSON.stringify(specifications)}::jsonb,
        ${1500},
        ${20},
        ${'accessories'},
        ${'clamps'},
        ${'Houyi'},
        ${'/images/products/houyi/houyi-acrylic-pipe-clamp/placeholder.jpg'},
        ${'[]'}::jsonb,
        NOW(),
        NOW()
      )
    `;
  }

  console.log('✅ Product added!\n');

  // Verify
  const verify = await sql`
    SELECT id, name, price, stock, category, subcategory, brand, thumbnail, images
    FROM products WHERE id = ${id}
  `;
  const p = verify[0];
  console.log(`ID: ${p.id}`);
  console.log(`Name: ${p.name}`);
  console.log(`Price: ${p.price} IQD`);
  console.log(`Stock: ${p.stock}`);
  console.log(`Category: ${p.category}/${p.subcategory}`);
  console.log(`Brand: ${p.brand}`);
  console.log(`Images: ${p.images?.length || 0} (waiting for upload)`);
  console.log(`\n📁 Image folder: client/public/images/products/houyi/houyi-acrylic-pipe-clamp/`);
  console.log(`   ⚠️  Add images to this folder, then run a script to update the DB paths.`);
  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));

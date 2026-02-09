/**
 * 🔍 Full Audit - بحث + فحص كامل
 * 
 * الخطوات:
 * 1. يبحث بالإنترنت عن أحدث معايير 2026
 * 2. يفحص الموقع بناءً على هذه المعايير
 * 3. يولد تقرير شامل
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ================================
// 🔬 الخطوة 1: البحث عن المعايير
// ================================
async function researchCriteria() {
    console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('  🔬 الخطوة 1: البحث عن أحدث معايير 2026'));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════\n'));

    const spinner = ora('🌐 جاري البحث عن أحدث المعايير...').start();

    const currentDate = new Date().toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const prompt = `
أنت خبير عالمي في التجارة الإلكترونية ومعايير تصميم المواقع لعام 2026.

التاريخ الحالي: ${currentDate}

قدم أحدث وأصرم المعايير العالمية لمواقع التجارة الإلكترونية في 2026:

## المطلوب:

### 1. صفحة المنتج
- كم صورة minimum؟
- هل الفيديو مطلوب؟
- كم كلمة للوصف؟
- ما هي العناصر الإلزامية؟

### 2. الصور
- ما هي الصيغ المقبولة (JPEG فات الزمن)؟
- ما هي متطلبات Dark Mode؟
- ما هو الحجم الأقصى؟

### 3. السرعة (Core Web Vitals 2026)
- ما هو LCP المقبول؟
- ما هو INP المقبول؟
- ما هو CLS المقبول؟
- ما هو زمن التحميل الأقصى؟

### 4. تجربة المستخدم
- هل Sticky Button مطلوب على الموبايل؟
- ما هي متطلبات checkout؟

### 5. الثقة والأمان
- ما هي شارات الثقة المطلوبة؟
- ما هي متطلبات سياسة الإرجاع؟

أجب بصيغة JSON فقط:
{
  "research_date": "string",
  "source": "2026 E-commerce Standards",
  "criteria": {
    "product_page": {
      "min_images": number,
      "video_required": boolean,
      "description_min_words": number,
      "mandatory_elements": ["string"]
    },
    "images": {
      "accepted_formats": ["string"],
      "rejected_formats": ["string"],
      "dark_mode_requirement": "string",
      "max_size_kb": number
    },
    "speed": {
      "max_load_time": number,
      "lcp_max": number,
      "inp_max": number,
      "cls_max": number
    },
    "ux": {
      "sticky_button_mobile": boolean,
      "guest_checkout_required": boolean,
      "required_features": ["string"]
    },
    "trust": {
      "required_badges": ["string"],
      "return_policy_visible": boolean
    }
  },
  "penalties": [
    {"violation": "string", "points_deducted": number}
  ],
  "summary_ar": "string"
}
`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });

        const research = JSON.parse(completion.choices[0].message.content);

        spinner.succeed('✅ تم الحصول على أحدث المعايير!');

        // حفظ المعايير
        fs.mkdirSync('./data', { recursive: true });
        fs.writeFileSync('./data/criteria_2026.json', JSON.stringify(research, null, 2));

        // عرض ملخص
        console.log(chalk.yellow('\n📋 المعايير المكتشفة:'));
        const c = research.criteria;
        console.log(chalk.gray(`   • صور minimum: ${c.product_page.min_images}`));
        console.log(chalk.gray(`   • صيغ مقبولة: ${c.images.accepted_formats.join(', ')}`));
        console.log(chalk.gray(`   • صيغ مرفوضة: ${c.images.rejected_formats.join(', ')}`));
        console.log(chalk.gray(`   • سرعة max: ${c.speed.max_load_time}s`));
        console.log(chalk.gray(`   • Sticky Button: ${c.ux.sticky_button_mobile ? 'مطلوب ✅' : 'اختياري'}`));

        return research;

    } catch (error) {
        spinner.fail('❌ فشل البحث');
        throw error;
    }
}

// ================================
// 🌐 الخطوة 2: تصفح الموقع
// ================================
async function crawlWebsite(criteria) {
    console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('  🌐 الخطوة 2: تصفح الموقع'));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════\n'));

    const spinner = ora('🔍 جاري تصفح الموقع...').start();

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        const websiteUrl = process.env.WEBSITE_URL;

        // قياس السرعة
        const startTime = Date.now();
        await page.goto(`${websiteUrl}/products`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // انتظار تحميل React SPA
        spinner.text = '⏳ انتظار تحميل المحتوى (React SPA)...';

        // انتظار ظهور عنصر المنتجات (حتى 10 ثواني)
        try {
            await page.waitForSelector('a[href*="/products/"]', { timeout: 10000 });
        } catch (e) {
            // محاولة بديلة - انتظار أي رابط
            await page.waitForTimeout(5000);
        }

        const loadTime = (Date.now() - startTime) / 1000;

        // جمع روابط المنتجات بطرق متعددة
        const productLinks = await page.evaluate(() => {
            // طريقة 1: روابط تحتوي /products/
            const links1 = document.querySelectorAll('a[href*="/products/"]');

            // طريقة 2: روابط داخل كروت المنتجات
            const links2 = document.querySelectorAll('[class*="product"] a, [class*="card"] a');

            // جمع كل الروابط
            const allLinks = [...links1, ...links2];

            // فلترة وتنظيف
            const productUrls = allLinks
                .map(link => link.href)
                .filter(href => href && href.includes('/products/'))
                .filter(href => !href.includes('/products?')) // استبعاد صفحة المنتجات
                .filter((v, i, a) => a.indexOf(v) === i); // إزالة التكرار

            return productUrls;
        });

        spinner.succeed(`✅ تم العثور على ${productLinks.length} منتج (${loadTime.toFixed(2)}s)`);

        // إذا لم نجد منتجات، نحاول طريقة أخرى
        if (productLinks.length === 0) {
            console.log(chalk.yellow('   ⚠️ لم يتم العثور على روابط منتجات'));
            console.log(chalk.gray('   جاري محاولة الحصول على المنتجات من API...'));

            // محاولة جلب المنتجات من API مباشرة
            const apiProducts = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/products');
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        return data.map(p => `/products/${p.slug || p.id}`);
                    }
                    if (data.products && Array.isArray(data.products)) {
                        return data.products.map(p => `/products/${p.slug || p.id}`);
                    }
                    return [];
                } catch (e) {
                    return [];
                }
            });

            if (apiProducts.length > 0) {
                const baseUrl = process.env.WEBSITE_URL;
                const fullUrls = apiProducts.map(path => `${baseUrl}${path}`);
                console.log(chalk.green(`   ✅ تم جلب ${fullUrls.length} منتج من API`));
                await browser.close();
                return { productLinks: fullUrls, loadTime };
            }
        }

        await browser.close();
        return { productLinks, loadTime };

    } catch (error) {
        await browser.close();
        spinner.fail('❌ فشل التصفح');
        throw error;
    }
}


// ================================
// 🔍 الخطوة 3: فحص المنتجات
// ================================
async function auditProducts(productLinks, criteria) {
    console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('  🔍 الخطوة 3: فحص المنتجات'));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════\n'));

    const browser = await puppeteer.launch({ headless: 'new' });
    const results = [];

    // فحص 5 منتجات كعينة
    const samplesToAudit = productLinks.slice(0, 5);

    for (let i = 0; i < samplesToAudit.length; i++) {
        const spinner = ora(`🔍 فحص المنتج ${i + 1}/${samplesToAudit.length}...`).start();

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 375, height: 812, isMobile: true });

            const startTime = Date.now();
            await page.goto(samplesToAudit[i], { waitUntil: 'networkidle2' });
            const loadTime = (Date.now() - startTime) / 1000;

            const pageData = await page.evaluate(() => {
                const images = document.querySelectorAll('img');
                return {
                    title: document.title,
                    imageCount: images.length,
                    images: [...images].map(img => ({
                        src: img.src,
                        alt: img.alt,
                        format: img.src.split('.').pop().split('?')[0].toUpperCase()
                    })),
                    description: document.querySelector('[class*="description"]')?.textContent || '',
                    price: document.querySelector('[class*="price"]')?.textContent || '0',
                    hasAddToCart: !!document.querySelector('button[class*="cart"]'),
                    hasStickyButton: !!document.querySelector('[style*="position: sticky"], [style*="position: fixed"]')
                };
            });

            pageData.url = samplesToAudit[i];
            pageData.loadTime = loadTime;
            pageData.wordCount = pageData.description.split(/\s+/).filter(w => w.length > 0).length;

            await page.close();

            // تحليل AI
            const analysis = await analyzeProduct(pageData, criteria);
            results.push({ ...pageData, analysis });

            spinner.succeed(`✅ ${pageData.title.substring(0, 30)}... (${analysis.score}/100)`);

        } catch (error) {
            spinner.fail(`❌ فشل فحص المنتج ${i + 1}`);
        }
    }

    await browser.close();
    return results;
}

// ================================
// 🤖 تحليل AI
// ================================
async function analyzeProduct(product, criteria) {
    const c = criteria.criteria;

    const prompt = `
أنت مدقق صارم جداً لمواقع التجارة الإلكترونية.

المعايير المطلوبة (من بحث 2026):
- صور minimum: ${c.product_page.min_images}
- صيغ مقبولة: ${c.images.accepted_formats.join(', ')}
- صيغ مرفوضة: ${c.images.rejected_formats.join(', ')}
- سرعة max: ${c.speed.max_load_time}s
- وصف min: ${c.product_page.description_min_words} كلمة
- Sticky Button: ${c.ux.sticky_button_mobile ? 'مطلوب' : 'اختياري'}

بيانات المنتج:
- العنوان: ${product.title}
- عدد الصور: ${product.imageCount}
- صيغ الصور: ${product.images.map(i => i.format).join(', ')}
- سرعة التحميل: ${product.loadTime.toFixed(2)}s
- كلمات الوصف: ${product.wordCount}
- Sticky Button: ${product.hasStickyButton ? 'موجود' : 'غير موجود'}

قيّم من 100 بصرامة شديدة.

الرد بـ JSON:
{
  "score": number,
  "grade": "A|B|C|D|F",
  "issues": [{"problem": "string", "fix": "string", "points_lost": number, "severity": "critical|high|medium|low"}],
  "passed": ["string"]
}
`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
}

// ================================
// 📝 الخطوة 4: توليد التقرير
// ================================
function generateReport(results, criteria) {
    console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('  📝 الخطوة 4: توليد التقرير'));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════\n'));

    const timestamp = new Date().toISOString().split('T')[0];
    const avgScore = results.reduce((sum, r) => sum + r.analysis.score, 0) / results.length;

    let report = `# 🔍 تقرير فحص موقع AQUAVO
## التاريخ: ${timestamp}

---

## 📊 النتيجة الإجمالية: ${avgScore.toFixed(1)}/100

${avgScore >= 90 ? '✅ **ممتاز!**' : avgScore >= 70 ? '⚠️ **جيد مع ملاحظات**' : '❌ **يحتاج تحسين عاجل!**'}

---

## 🔬 المعايير المستخدمة (بحث 2026)

| المعيار | القيمة |
|---------|--------|
| صور minimum | ${criteria.criteria.product_page.min_images} |
| صيغ مقبولة | ${criteria.criteria.images.accepted_formats.join(', ')} |
| سرعة max | ${criteria.criteria.speed.max_load_time}s |
| Sticky Button | ${criteria.criteria.ux.sticky_button_mobile ? 'مطلوب' : 'اختياري'} |

---

## 📋 تفاصيل المنتجات

`;

    results.forEach((product, index) => {
        const a = product.analysis;
        report += `### ${index + 1}. ${product.title || 'بدون عنوان'}
**التقييم:** ${a.score}/100 (${a.grade})

`;

        if (a.passed?.length > 0) {
            report += `**✅ نقاط القوة:**\n`;
            a.passed.forEach(p => report += `- ${p}\n`);
            report += '\n';
        }

        if (a.issues?.length > 0) {
            report += `**❌ المشاكل:**\n`;
            a.issues.forEach(issue => {
                const icon = issue.severity === 'critical' ? '🔴' :
                    issue.severity === 'high' ? '🟠' :
                        issue.severity === 'medium' ? '🟡' : '🟢';
                report += `- ${icon} **${issue.problem}** (-${issue.points_lost})\n`;
                report += `  - التصحيح: ${issue.fix}\n`;
            });
        }

        report += '\n---\n\n';
    });

    // حفظ التقرير
    fs.mkdirSync('./reports', { recursive: true });
    const reportPath = `./reports/full_audit_${timestamp}.md`;
    fs.writeFileSync(reportPath, report);

    console.log(chalk.green(`✅ تم حفظ التقرير: ${reportPath}`));

    return reportPath;
}

// ================================
// 🚀 التشغيل الرئيسي
// ================================
async function main() {
    console.log(chalk.cyan.bold('\n'));
    console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('  ║  🔍 AQUAVO Full Audit Tool                   ║'));
    console.log(chalk.cyan.bold('  ║  بحث + فحص + تقرير (معايير 2026 الصارمة)    ║'));
    console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════════╝'));

    try {
        // الخطوة 1: البحث
        const criteria = await researchCriteria();

        // الخطوة 2: التصفح
        const { productLinks, loadTime } = await crawlWebsite(criteria);

        // الخطوة 3: الفحص
        const results = await auditProducts(productLinks, criteria);

        // الخطوة 4: التقرير
        const reportPath = generateReport(results, criteria);

        // النتيجة النهائية
        const avgScore = results.reduce((sum, r) => sum + r.analysis.score, 0) / results.length;

        console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════'));
        console.log(chalk.cyan.bold('  📊 النتيجة النهائية'));
        console.log(chalk.cyan.bold('═══════════════════════════════════════════════\n'));

        console.log(chalk.bold(`   متوسط التقييم: ${avgScore.toFixed(1)}/100`));
        console.log(chalk.gray(`   التقرير: ${reportPath}\n`));

    } catch (error) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
        process.exit(1);
    }
}

main();

/**
 * 🔍 فحص منتج واحد
 * استخدام: npm run audit:product -- --url "https://aquavo.vercel.app/products/xxx"
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import puppeteer from 'puppeteer';
import chalk from 'chalk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// الحصول على URL من الأرجومنتات
const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const productUrl = urlIndex !== -1 ? args[urlIndex + 1] : null;

if (!productUrl) {
    console.log(chalk.red('❌ يرجى تحديد رابط المنتج:'));
    console.log(chalk.gray('   npm run audit:product -- --url "https://aquavo.vercel.app/products/xxx"'));
    process.exit(1);
}

async function auditSingleProduct(url) {
    console.log(chalk.cyan.bold('\n🔍 فحص منتج واحد - معايير 2026 الصارمة\n'));
    console.log(chalk.gray('URL: ' + url + '\n'));

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        // فحص Desktop
        console.log(chalk.yellow('📱 فحص Desktop...'));
        await page.setViewport({ width: 1920, height: 1080 });

        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle2' });
        const loadTime = (Date.now() - startTime) / 1000;

        // جمع البيانات
        const pageData = await page.evaluate(() => {
            const images = document.querySelectorAll('img');
            const imageData = [...images].map(img => ({
                src: img.src,
                alt: img.alt || 'بدون alt',
                format: img.src.split('.').pop().split('?')[0].toUpperCase()
            }));

            const description = document.querySelector('[class*="description"]')?.textContent || '';
            const price = document.querySelector('[class*="price"]')?.textContent || '0';
            const addToCartBtn = document.querySelector('button[class*="cart"], button[class*="add"]');
            const reviewSection = document.querySelector('[class*="review"]');

            return {
                images: imageData,
                imageCount: imageData.length,
                description: description.trim(),
                descriptionWordCount: description.split(/\s+/).filter(w => w.length > 0).length,
                price: price.trim(),
                hasAddToCart: !!addToCartBtn,
                hasReviews: !!reviewSection,
                title: document.title
            };
        });

        // فحص Mobile
        console.log(chalk.yellow('📱 فحص Mobile...'));
        await page.setViewport({ width: 375, height: 812, isMobile: true });
        await page.reload({ waitUntil: 'networkidle2' });

        const mobileData = await page.evaluate(() => {
            // فحص زر Sticky
            const stickyBtn = document.querySelector('[style*="position: fixed"], [style*="position: sticky"]');
            return {
                hasStickyButton: !!stickyBtn,
                viewportWidth: window.innerWidth
            };
        });

        await browser.close();

        // تحليل AI
        console.log(chalk.yellow('\n🤖 تحليل GROQ AI...'));

        const prompt = `
أنت مدقق صارم جداً لمواقع التجارة الإلكترونية بمعايير 2026.

قيّم هذا المنتج بصرامة شديدة جداً:

البيانات:
- العنوان: ${pageData.title}
- عدد الصور: ${pageData.imageCount}
- صيغ الصور: ${pageData.images.map(i => i.format).join(', ')}
- Alt text: ${pageData.images.filter(i => i.alt !== 'بدون alt').length}/${pageData.imageCount}
- طول الوصف: ${pageData.descriptionWordCount} كلمة
- السعر: ${pageData.price}
- زمن التحميل: ${loadTime.toFixed(2)} ثانية
- زر إضافة للسلة: ${pageData.hasAddToCart ? 'موجود' : 'غير موجود'}
- زر Sticky (موبايل): ${mobileData.hasStickyButton ? 'موجود' : 'غير موجود'}
- قسم التقييمات: ${pageData.hasReviews ? 'موجود' : 'غير موجود'}

المعايير الصارمة 2026:
1. سرعة التحميل < 1.5 ثانية (${loadTime < 1.5 ? '✅ ممتاز' : '❌ بطيء'})
2. 3+ صور على الأقل
3. صيغة WebP أو AVIF فقط (ليس JPEG/PNG/JPG)
4. وصف 50+ كلمة
5. Alt text لكل صورة
6. زر Sticky على الموبايل
7. قسم تقييمات

أعطِ تقييم من 100 مع شرح مفصل للمشاكل والتصحيحات.
كن صارماً جداً!

الرد بصيغة JSON:
{
  "score": number,
  "grade": "A|B|C|D|F",
  "issues": [{ "problem": string, "fix": string, "severity": "critical|high|medium|low", "points_lost": number }],
  "strengths": [string],
  "summary": string
}
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const analysis = JSON.parse(completion.choices[0].message.content);

        // عرض النتائج
        console.log(chalk.gray('\n' + '═'.repeat(50)));
        console.log(chalk.cyan.bold(`\n📊 نتيجة التقييم: ${analysis.score}/100 (${analysis.grade})\n`));

        if (analysis.strengths?.length > 0) {
            console.log(chalk.green('✅ نقاط القوة:'));
            analysis.strengths.forEach(s => console.log(chalk.green(`   • ${s}`)));
        }

        if (analysis.issues?.length > 0) {
            console.log(chalk.red('\n❌ المشاكل:'));
            analysis.issues.forEach(issue => {
                const icon = issue.severity === 'critical' ? '🔴' :
                    issue.severity === 'high' ? '🟠' :
                        issue.severity === 'medium' ? '🟡' : '🟢';
                console.log(chalk.red(`   ${icon} ${issue.problem} (-${issue.points_lost} نقطة)`));
                console.log(chalk.gray(`      ← ${issue.fix}`));
            });
        }

        console.log(chalk.cyan(`\n📝 الملخص: ${analysis.summary}`));
        console.log(chalk.gray('\n' + '═'.repeat(50) + '\n'));

    } catch (error) {
        await browser.close();
        console.error(chalk.red('❌ خطأ:'), error.message);
    }
}

auditSingleProduct(productUrl);

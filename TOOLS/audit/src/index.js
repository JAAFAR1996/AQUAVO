/**
 * 🔍 AQUAVO Website Audit Tool
 * أداة فحص موقع AQUAVO باستخدام GROQ AI
 * 
 * المعايير الصارمة 2026:
 * - سرعة التحميل < 1.5 ثانية
 * - صور WebP/AVIF فقط
 * - خلفية شفافة أو داكنة (ليس أبيض!)
 * - زر Sticky على الموبايل
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

// ================================
// 📋 معايير التقييم الصارمة 2026
// ================================
const AUDIT_CRITERIA = {
  productPage: {
    maxScore: 40,
    checks: {
      hasImage: { score: 8, name: 'وجود صورة' },
      imageQuality: { score: 5, name: 'جودة الصورة' },
      imageBackground: { score: 5, name: 'خلفية الصورة (داكنة/شفافة)' },
      multipleImages: { score: 4, name: 'صور متعددة (3+)' },
      hasVideo: { score: 3, name: 'فيديو/360°' },
      hasDescription: { score: 10, name: 'وصف تفصيلي (50+ كلمة)' },
      hasPrice: { score: 5, name: 'سعر صحيح' }
    }
  },
  seo: {
    maxScore: 25,
    checks: {
      altText: { score: 5, name: 'Alt text للصور' },
      fileName: { score: 4, name: 'اسم ملف وصفي' },
      imageFormat: { score: 6, name: 'صيغة WebP/AVIF' },
      loadSpeed: { score: 5, name: 'سرعة < 1.5 ثانية' },
      mobileResponsive: { score: 5, name: 'تجاوب الموبايل' }
    }
  },
  ux: {
    maxScore: 20,
    checks: {
      addToCartButton: { score: 5, name: 'زر إضافة للسلة' },
      stickyButton: { score: 3, name: 'زر Sticky (موبايل)' },
      navigation: { score: 4, name: 'سهولة التصفح' },
      clearInfo: { score: 4, name: 'معلومات واضحة' },
      designConsistency: { score: 4, name: 'تناسق التصميم' }
    }
  },
  trust: {
    maxScore: 15,
    checks: {
      reviews: { score: 5, name: 'قسم التقييمات' },
      returnPolicy: { score: 5, name: 'سياسة الإرجاع' },
      shippingInfo: { score: 5, name: 'معلومات الشحن' }
    }
  }
};

// ================================
// 🔧 إعداد GROQ AI
// ================================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ================================
// 📊 قراءة ملف Excel
// ================================
async function readExcelProducts() {
  const spinner = ora('📊 قراءة ملف Excel...').start();
  
  try {
    const excelPath = process.env.EXCEL_PATH;
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const products = XLSX.utils.sheet_to_json(sheet);
    
    spinner.succeed(`✅ تم قراءة ${products.length} منتج من Excel`);
    return products;
  } catch (error) {
    spinner.fail('❌ فشل قراءة ملف Excel');
    console.error(error.message);
    return [];
  }
}

// ================================
// 🌐 فحص الموقع
// ================================
async function crawlWebsite() {
  const spinner = ora('🌐 تصفح الموقع...').start();
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    const websiteUrl = process.env.WEBSITE_URL;
    
    // قياس سرعة التحميل
    const startTime = Date.now();
    await page.goto(`${websiteUrl}/products`, { waitUntil: 'networkidle2' });
    const loadTime = (Date.now() - startTime) / 1000;
    
    spinner.text = '🔍 البحث عن المنتجات...';
    
    // جمع روابط المنتجات
    const productLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/products/"]');
      return [...links].map(link => link.href).filter((v, i, a) => a.indexOf(v) === i);
    });
    
    spinner.succeed(`✅ تم العثور على ${productLinks.length} منتج | سرعة التحميل: ${loadTime.toFixed(2)}s`);
    
    await browser.close();
    return { productLinks, loadTime };
  } catch (error) {
    spinner.fail('❌ فشل تصفح الموقع');
    await browser.close();
    throw error;
  }
}

// ================================
// 🔍 فحص منتج واحد
// ================================
async function auditProduct(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // محاكاة موبايل
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const loadTime = (Date.now() - startTime) / 1000;
    
    // جمع بيانات الصفحة
    const pageData = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const imageData = [...images].map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight
      }));
      
      const description = document.querySelector('[class*="description"]')?.textContent || '';
      const price = document.querySelector('[class*="price"]')?.textContent || '';
      const addToCartBtn = document.querySelector('button[class*="cart"], button[class*="add"]');
      
      return {
        images: imageData,
        imageCount: imageData.length,
        description: description,
        descriptionWordCount: description.split(/\s+/).filter(w => w.length > 0).length,
        price: price,
        hasAddToCart: !!addToCartBtn,
        title: document.title
      };
    });
    
    // لقطة شاشة للتحليل
    const screenshot = await page.screenshot({ encoding: 'base64' });
    
    await browser.close();
    
    return {
      url,
      loadTime,
      ...pageData,
      screenshot
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// ================================
// 🤖 تحليل AI باستخدام GROQ
// ================================
async function analyzeWithAI(productData) {
  const prompt = `
أنت مدقق صارم جداً لمواقع التجارة الإلكترونية بمعايير 2026.

قيّم هذا المنتج بصرامة شديدة:

البيانات:
- عدد الصور: ${productData.imageCount}
- طول الوصف: ${productData.descriptionWordCount} كلمة
- السعر: ${productData.price}
- زمن التحميل: ${productData.loadTime} ثانية
- زر إضافة للسلة: ${productData.hasAddToCart ? 'موجود' : 'غير موجود'}

المعايير الصارمة 2026:
1. سرعة التحميل يجب أن تكون < 1.5 ثانية
2. يجب وجود 3+ صور على الأقل
3. الوصف يجب أن يكون 50+ كلمة
4. السعر يجب ألا يكون صفر
5. صيغة الصور يجب أن تكون WebP أو AVIF

أعطِ تقييم من 100 مع شرح المشاكل والتصحيحات المقترحة.

الرد يجب أن يكون بصيغة JSON:
{
  "score": number,
  "issues": [{ "problem": string, "fix": string, "severity": "critical|high|medium|low" }],
  "summary": string
}
`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

// ================================
// 📝 توليد التقرير
// ================================
function generateReport(results, analysisResults) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = `./reports/audit_${timestamp}.md`;
  
  // حساب المتوسط
  const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
  
  let report = `# 🔍 تقرير فحص موقع AQUAVO
## ${timestamp}

---

## 📊 النتيجة الإجمالية: ${avgScore.toFixed(1)}/100

${avgScore >= 90 ? '✅ ممتاز!' : avgScore >= 70 ? '⚠️ جيد مع ملاحظات' : '❌ يحتاج تحسين عاجل'}

---

## 📋 تفاصيل المنتجات

`;

  analysisResults.forEach((analysis, index) => {
    const product = results[index];
    report += `### ${index + 1}. ${product.title || product.url}

**التقييم:** ${analysis.score}/100

**المشاكل:**
`;
    
    analysis.issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '🔴' : 
                   issue.severity === 'high' ? '🟠' : 
                   issue.severity === 'medium' ? '🟡' : '🟢';
      report += `- ${icon} **${issue.problem}**
  - التصحيح: ${issue.fix}
`;
    });
    
    report += '\n---\n\n';
  });

  // حفظ التقرير
  fs.mkdirSync('./reports', { recursive: true });
  fs.writeFileSync(reportPath, report);
  
  return reportPath;
}

// ================================
// 🚀 التشغيل الرئيسي
// ================================
async function main() {
  console.log(chalk.cyan.bold('\n🔍 AQUAVO Website Audit Tool - معايير 2026 الصارمة\n'));
  console.log(chalk.gray('═'.repeat(50)) + '\n');
  
  try {
    // 1. قراءة Excel
    const excelProducts = await readExcelProducts();
    
    // 2. تصفح الموقع
    const { productLinks, loadTime } = await crawlWebsite();
    
    // 3. مقارنة Excel مع الموقع
    console.log(chalk.yellow('\n📊 مقارنة Excel مع الموقع...'));
    console.log(`   Excel: ${excelProducts.length} منتج`);
    console.log(`   الموقع: ${productLinks.length} منتج`);
    
    // 4. فحص المنتجات
    const spinner = ora('🔍 فحص المنتجات...').start();
    const auditResults = [];
    const analysisResults = [];
    
    // فحص أول 5 منتجات كعينة
    const samplesToAudit = productLinks.slice(0, 5);
    
    for (let i = 0; i < samplesToAudit.length; i++) {
      spinner.text = `🔍 فحص المنتج ${i + 1}/${samplesToAudit.length}...`;
      
      const productData = await auditProduct(samplesToAudit[i]);
      auditResults.push(productData);
      
      const analysis = await analyzeWithAI(productData);
      analysisResults.push(analysis);
    }
    
    spinner.succeed('✅ اكتمل فحص المنتجات');
    
    // 5. توليد التقرير
    const reportPath = generateReport(auditResults, analysisResults);
    
    console.log(chalk.green.bold(`\n✅ تم حفظ التقرير: ${reportPath}\n`));
    
    // عرض ملخص
    const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
    console.log(chalk.cyan(`📊 متوسط التقييم: ${avgScore.toFixed(1)}/100`));
    
    if (avgScore < 70) {
      console.log(chalk.red('⚠️ الموقع يحتاج تحسينات عاجلة!'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ خطأ:'), error.message);
    process.exit(1);
  }
}

main();

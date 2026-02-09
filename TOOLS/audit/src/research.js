/**
 * 🔬 Research Module - يبحث بالإنترنت عن أحدث معايير 2026
 * 
 * يستخدم GROQ للبحث والتحليل
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ================================
// 🔍 مواضيع البحث
// ================================
const RESEARCH_TOPICS = [
    {
        topic: 'e-commerce product page best practices 2026',
        category: 'صفحة المنتج'
    },
    {
        topic: 'e-commerce image optimization standards 2026 WebP AVIF',
        category: 'الصور'
    },
    {
        topic: 'mobile UX e-commerce 2026 sticky buttons',
        category: 'تجربة الموبايل'
    },
    {
        topic: 'e-commerce page load speed requirements 2026',
        category: 'السرعة'
    },
    {
        topic: 'dark mode e-commerce design best practices 2026',
        category: 'Dark Mode'
    }
];

// ================================
// 🤖 البحث والتحليل باستخدام GROQ
// ================================
async function researchWithAI() {
    console.log(chalk.cyan.bold('\n🔬 البحث عن أحدث معايير 2026\n'));
    console.log(chalk.gray('═'.repeat(50)) + '\n');

    const spinner = ora('جاري البحث...').start();

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `
أنت خبير في التجارة الإلكترونية ومعايير تصميم المواقع.

التاريخ الحالي: ${currentDate}

ابحث وقدم أحدث معايير 2026 الصارمة للمواقع التجارية في هذه المجالات:

1. **صفحة المنتج:**
   - ما هي العناصر الإلزامية؟
   - كم صورة مطلوبة؟
   - ما طول الوصف المثالي؟

2. **الصور:**
   - ما هي الصيغ المطلوبة (WebP, AVIF, etc)؟
   - ما هي الخلفية المثالية للـ Dark Mode؟
   - ما هي متطلبات alt text؟

3. **السرعة:**
   - ما هو الزمن المقبول للتحميل؟
   - ما هي Core Web Vitals المطلوبة؟

4. **تجربة المستخدم (UX):**
   - هل زر Sticky مطلوب؟
   - ما هي متطلبات الموبايل؟

5. **الثقة والمصداقية:**
   - ما هي عناصر الثقة المطلوبة؟

قدم إجابة منظمة بصيغة JSON:
{
  "research_date": "${currentDate}",
  "criteria": {
    "product_page": {
      "required_images": number,
      "description_min_words": number,
      "must_have_elements": [string]
    },
    "images": {
      "required_formats": [string],
      "dark_mode_background": string,
      "alt_text_required": boolean
    },
    "speed": {
      "max_load_time_seconds": number,
      "lcp_max_seconds": number
    },
    "ux": {
      "sticky_button_required": boolean,
      "mobile_requirements": [string]
    },
    "trust": {
      "required_elements": [string]
    }
  },
  "summary": string
}
`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const research = JSON.parse(completion.choices[0].message.content);

        spinner.succeed('✅ اكتمل البحث عن المعايير');

        // حفظ نتائج البحث
        const researchPath = './data/research_criteria.json';
        fs.mkdirSync('./data', { recursive: true });
        fs.writeFileSync(researchPath, JSON.stringify(research, null, 2));

        console.log(chalk.green(`\n📁 تم حفظ المعايير في: ${researchPath}`));

        // عرض الملخص
        console.log(chalk.cyan('\n📋 ملخص المعايير:'));
        console.log(chalk.gray('─'.repeat(40)));

        const c = research.criteria;

        console.log(chalk.yellow('\n📸 الصور:'));
        console.log(`   • الصيغ المطلوبة: ${c.images.required_formats.join(', ')}`);
        console.log(`   • خلفية Dark Mode: ${c.images.dark_mode_background}`);

        console.log(chalk.yellow('\n⚡ السرعة:'));
        console.log(`   • الحد الأقصى للتحميل: ${c.speed.max_load_time_seconds} ثانية`);

        console.log(chalk.yellow('\n📱 UX:'));
        console.log(`   • زر Sticky: ${c.ux.sticky_button_required ? 'مطلوب ✅' : 'غير مطلوب'}`);

        console.log(chalk.gray('\n' + '═'.repeat(50)));
        console.log(chalk.cyan(`\n📝 ${research.summary}\n`));

        return research;

    } catch (error) {
        spinner.fail('❌ فشل البحث');
        console.error(error.message);
        throw error;
    }
}

// ================================
// 🚀 التشغيل
// ================================
async function main() {
    try {
        const research = await researchWithAI();
        console.log(chalk.green.bold('\n✅ جاهز للفحص! شغّل: npm run audit\n'));
        return research;
    } catch (error) {
        console.error(chalk.red('❌ خطأ:'), error.message);
        process.exit(1);
    }
}

// تصدير للاستخدام في index.js
export { researchWithAI };

// تشغيل مباشر
main();

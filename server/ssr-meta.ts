export function generateSsrMeta(requestPath: string): string {
  const BASE_URL = "https://www.aquavoiq.com";
  const LOGO_URL = `${BASE_URL}/logo_aquavo.png`;
  let jsonLdScripts: any[] = [];

  // Helper to generate script tags
  const scriptTag = (data: any) => `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;

  // 1. Organization & Core Schemas
  if (requestPath === "/" || requestPath === "/ar") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "AQUAVO",
      "alternateName": ["أكوافو", "AQUAVO Store", "AQUAVO Iraq"],
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": LOGO_URL,
        "width": 512,
        "height": 512
      },
      "description": "متجر إلكتروني عراقي متخصص في مستلزمات ومعدات أحواض الزينة الأصلية. نوفر الفلاتر، السخانات، الأغذية، الديكورات، ومعالجات المياه. الدفع عند الاستلام مع توصيل لجميع محافظات العراق بـ 5,000 دينار.",
      "slogan": "مستلزمات ومعدات أحواض الزينة الأصلية في العراق",
      "areaServed": [
        {
          "@type": "Country",
          "name": "Iraq",
          "sameAs": "https://www.wikidata.org/wiki/Q796"
        }
      ],
      "knowsAbout": [
        "مستلزمات أحواض الزينة",
        "معدات أحواض الزينة",
        "فلاتر الأحواض",
        "سخانات الأحواض",
        "معالجات المياه",
        "طعام أسماك الزينة",
        "ديكورات الأحواض"
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "telephone": "+964-774-788-0673",
          "contactType": "customer support",
          "availableLanguage": ["Arabic"],
          "areaServed": "IQ"
        }
      ],
      "sameAs": [
        "https://www.facebook.com/profile.php?id=61587249730248",
        "https://instagram.com/aquavo_iq",
        "https://www.tiktok.com/@aquavo.iq"
      ]
    });

    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "name": "AQUAVO",
      "url": BASE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${BASE_URL}/products?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    });

  }

  // 2. Beginner Guide Page
  if (requestPath === "/beginner-guide") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "دليل المبتدئين", "item": `${BASE_URL}/beginner-guide` }
      ]
    });

    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "كيف تبدأ حوض أسماك ناجح في العراق",
      "description": "دليل خطوة بخطوة للمبتدئين في هواية تربية الأسماك: من اختيار الحوض إلى الدورة البايولوجية",
      "totalTime": "PT14D",
      "step": [
        {
          "@type": "HowToStep",
          "name": "اختيار الحوض وتحديد الموقع",
          "text": "اختر مكان بعيد عن أشعة الشمس المباشرة والتيارات الهوائية. استخدم قاعدة إسفنجية لتسوية الحوض.",
          "url": `${BASE_URL}/beginner-guide#step-1`
        },
        {
          "@type": "HowToStep",
          "name": "التجهيز المائي (مزيل الكلور)",
          "text": "املأ الحوض بماء الإسالة، وأضف مزيل الكلور (Anti-Chlorine) فوراً. الكلور قاتل للأسماك والبكتيريا النافعة.",
          "url": `${BASE_URL}/beginner-guide#step-2`
        },
        {
          "@type": "HowToStep",
          "name": "إضافة الديكور والمعدات الأساسية",
          "text": "اغسل الحصى جيداً قبل وضعه. ركّب الفلتر والسخان (حسب نوع الأسماك) لكن لا تشغلها إلا بعد التأكد من منسوب الماء.",
          "url": `${BASE_URL}/beginner-guide#step-3`
        },
        {
          "@type": "HowToStep",
          "name": "تجميع البكتيريا النافعة (الدورة البايولوجية)",
          "text": "أضف كبسولة أو سائل البكتيريا النافعة، وشغل الفلتر، وانتظر من 3 إلى 7 أيام على الأقل قبل إضافة أي سمكة. هذه الخطوة تمنع متلازمة الحوض الجديد.",
          "url": `${BASE_URL}/beginner-guide#step-4`
        },
        {
          "@type": "HowToStep",
          "name": "الحوض يحيا (إضافة الأسماك تدريجياً)",
          "text": "أضف سمكتين أو ثلاث فقط كأسماك تحمل (مثل الزيبرا أو الغوبي). طوّف الكيس في الحوض لمدة 15 دقيقة لمعادلة الحرارة قبل إطلاقها.",
          "url": `${BASE_URL}/beginner-guide#step-5`
        }
      ]
    });
  }

  // 3. Filter Choice Guide
  if (requestPath === "/guides-filter-choice") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "دليل اختيار الفلتر", "item": `${BASE_URL}/guides-filter-choice` }
      ]
    });

    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "كيف تختار فلتر حوض الأسماك المناسب",
      "description": "دليل خطوة بخطوة لاختيار الفلتر الصحيح لحجم حوضك ونوع أسماكك",
      "totalTime": "PT10M",
      "step": [
        {
          "@type": "HowToStep",
          "name": "احسب حجم حوضك بالليتر",
          "text": "قِس طول × عرض × ارتفاع الحوض بالسنتيمتر وأضرب الناتج في 0.001. مثلاً: حوض 60×30×35 سم = 63 لتر تقريباً.",
          "url": `${BASE_URL}/guides-filter-choice#step-1`
        },
        {
          "@type": "HowToStep",
          "name": "احسب معدل تدفق الفلتر المطلوب",
          "text": "القاعدة الذهبية: الفلتر يجب أن يضخ حجم الحوض كاملاً من 4 إلى 6 مرات في الساعة. لحوض 60 لتر = فلتر بقدرة 240-360 لتر/ساعة على الأقل.",
          "url": `${BASE_URL}/guides-filter-choice#step-2`
        },
        {
          "@type": "HowToStep",
          "name": "اختر نوع الفلتر المناسب",
          "text": "الفلتر الداخلي: مناسب للأحواض الصغيرة (حتى 60 لتر) وسهل التركيب. الفلتر الخارجي (كانيستر): مناسب للأحواض الكبيرة (+80 لتر) ويعطي فلترة أعمق. الفلتر الإسفنجي: مثالي للأحواض العزل والريشات الصغيرة.",
          "url": `${BASE_URL}/guides-filter-choice#step-3`
        },
        {
          "@type": "HowToStep",
          "name": "راجع مواصفات المنتج قبل الشراء",
          "text": "تأكد من مطابقة قدرة الفلتر لحجم حوضك. ابحث عن الفلتر في صفحة المنتجات على AQUAVO واقرأ المواصفات الكاملة.",
          "url": `${BASE_URL}/products`
        }
      ]
    });
  }

  // 4. New Aquarium Setup Guide
  if (requestPath === "/guides/new-aquarium-setup-iraq") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "الأدلة", "item": `${BASE_URL}/guides` },
        { "@type": "ListItem", "position": 3, "name": "تجهيز حوض سمك جديد", "item": `${BASE_URL}/guides/new-aquarium-setup-iraq` }
      ]
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "كيف تجهز حوض سمك جديد في العراق — خطوة بخطوة",
      "description": "دليل كامل لتجهيز أول حوض سمك: من اختيار المعدات حتى إضافة السمك بأمان. مقدم من AQUAVO — متجر مستلزمات أحواض الزينة في العراق.",
      "totalTime": "PT7D",
      "supply": [
        { "@type": "HowToSupply", "name": "فلتر مائي" },
        { "@type": "HowToSupply", "name": "سخان حوض بثرموستات" },
        { "@type": "HowToSupply", "name": "مزيل كلور وكلورامين" },
        { "@type": "HowToSupply", "name": "شرائط فحص ماء" },
        { "@type": "HowToSupply", "name": "حصى أو رمل مغسول" }
      ],
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "نظف الحوض وحدد موقعه", "text": "انظف الحوض بماء فقط بدون صابون. اختر مكان بعيد عن أشعة الشمس المباشرة.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-1` },
        { "@type": "HowToStep", "position": 2, "name": "ضع الحصى وركب المعدات", "text": "اغسل الحصى جيداً ثم ضعه. ركب الفلتر والسخان قرب مصدر تدفق الماء.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-2` },
        { "@type": "HowToStep", "position": 3, "name": "أملأ بالماء وأضف مزيل الكلور", "text": "أملأ بماء الإسالة وأضف مزيل الكلور فوراً. الكلور يقتل السمك والبكتيريا النافعة.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-3` },
        { "@type": "HowToStep", "position": 4, "name": "انتظر الدورة البايولوجية", "text": "شغل الفلتر وانتظر 3-7 أيام مع بكتيريا جاهزة. البكتيريا النافعة تحمي السمك من الأمونيا.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-4` },
        { "@type": "HowToStep", "position": 5, "name": "افحص الماء قبل إضافة السمك", "text": "استخدم شرائط فحص الماء. الأمونيا والنتريت يجب أن يكونا صفر.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-5` },
        { "@type": "HowToStep", "position": 6, "name": "أضف السمك تدريجياً", "text": "ابدأ بـ 2-3 سمكات فقط. طوّف الكيس 15 دقيقة في الحوض لمعادلة الحرارة.", "url": `${BASE_URL}/guides/new-aquarium-setup-iraq#step-6` }
      ],
      "publisher": { "@type": "Organization", "name": "AQUAVO", "url": BASE_URL },
      "inLanguage": "ar"
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "شنو أحتاج حتى أجهز حوض سمك جديد؟", "acceptedAnswer": { "@type": "Answer", "text": "تحتاج: حوض، فلتر مائي، سخان (للأسماك الاستوائية)، حصى أو رمل، مزيل كلور، وشرائط فحص ماء." } },
        { "@type": "Question", "name": "هل أحتاج فلتر للحوض؟", "acceptedAnswer": { "@type": "Answer", "text": "نعم، الفلتر ضروري في كل حوض. يزيل الأمونيا والمواد الضارة ويحافظ على توازن الماء." } },
        { "@type": "Question", "name": "كم يوم أنتظر قبل ما أضيف السمك؟", "acceptedAnswer": { "@type": "Answer", "text": "الحد الأدنى 3 أيام مع بكتيريا جاهزة، و7-14 يوم بدونها. افحص الماء أولاً: لما الأمونيا والنتريت يصيرون صفر، الحوض جاهز." } },
        { "@type": "Question", "name": "ليش مزيل الكلور مهم؟", "acceptedAnswer": { "@type": "Answer", "text": "ماء الإسالة يحتوي على كلور وكلورامين يقتل السمك والبكتيريا النافعة. مزيل الكلور يحيّد هذه المواد فوراً." } }
      ]
    });
  }

  // 5. Water Test Guide
  if (requestPath === "/guides/aquarium-water-test-guide") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "الأدلة", "item": `${BASE_URL}/guides` },
        { "@type": "ListItem", "position": 3, "name": "فحص ماء الحوض", "item": `${BASE_URL}/guides/aquarium-water-test-guide` }
      ]
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "شنو تفحص شرائط ماء الحوض؟", "acceptedAnswer": { "@type": "Answer", "text": "شرائط ماء الحوض تقيس: الأمونيا (NH3)، النتريت (NO2)، النترات (NO3)، درجة الحموضة (pH)، وأحياناً الكلور والصلابة." } },
        { "@type": "Question", "name": "شنو القراءات الآمنة لماء الحوض؟", "acceptedAnswer": { "@type": "Answer", "text": "الأمونيا: 0 ppm. النتريت: 0 ppm. النترات: أقل من 40 ppm. pH: بين 6.8 و7.5." } },
        { "@type": "Question", "name": "شنو أسوي إذا الأمونيا ارتفعت؟", "acceptedAnswer": { "@type": "Answer", "text": "فوراً: غيّر 25-30% من الماء. أوقف الأكل يوم أو يومين. تأكد من شغل الفلتر. افحص الماء مرة ثانية بعد 24 ساعة." } },
        { "@type": "Question", "name": "شنو الفرق بين النتريت والنترات؟", "acceptedAnswer": { "@type": "Answer", "text": "النتريت (NO2) أخطر بكثير من النترات (NO3). النتريت يمنع الدم من حمل الأوكسجين ويقتل السمك بسرعة. النترات أقل خطراً ويُخفَّض بتغيير الماء." } }
      ]
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "شرائط فحص ماء الحوض — كيف تقرأ النتائج وشنو تسوي",
      "description": "دليل كامل لشرائط فحص ماء الحوض: الأمونيا والنتريت والنترات وpH والكلور — القراءات الآمنة والتصرف الصحيح.",
      "author": { "@type": "Organization", "name": "AQUAVO" },
      "publisher": { "@type": "Organization", "name": "AQUAVO", "url": BASE_URL },
      "datePublished": "2026-06-29",
      "dateModified": "2026-06-29",
      "inLanguage": "ar",
      "url": `${BASE_URL}/guides/aquarium-water-test-guide`,
      "mainEntityOfPage": `${BASE_URL}/guides/aquarium-water-test-guide`
    });
  }

  // 6. Decor & Stones Guide
  if (requestPath === "/guides/aquarium-decor-stones-guide") {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "الأدلة", "item": `${BASE_URL}/guides` },
        { "@type": "ListItem", "position": 3, "name": "ديكور وأحجار الحوض", "item": `${BASE_URL}/guides/aquarium-decor-stones-guide` }
      ]
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "شنو أفضل حجر آمن لحوض السمك؟", "acceptedAnswer": { "@type": "Answer", "text": "الأحجار الخاملة هي الأآمن: البازلت، الكوارتز، الأردواز (Slate)، والأحجار النهرية المصقولة. ما يُغيّرون pH ولا يُطلقون مواد ضارة. تجنب الرخام والحجر الجيري لأنهما يرفعان pH والصلابة." } },
        { "@type": "Question", "name": "هل كل حجر طبيعي يصلح للحوض؟", "acceptedAnswer": { "@type": "Answer", "text": "لا. بعض الأحجار الطبيعية مثل الرخام والحجر الجيري تُغيّر pH وتضر ببعض أنواع الأسماك. دائماً افحص الحجر باختبار الخل قبل إدخاله للحوض." } },
        { "@type": "Question", "name": "هل الحجر يرفع pH؟", "acceptedAnswer": { "@type": "Answer", "text": "الأحجار الكلسية ترفع pH. الأحجار الخاملة مثل البازلت والكوارتز لا تُغيّر pH. اختبار الخل: ضع قطرة خل أبيض على الحجر — إذا فقّع فهو كلسي." } },
        { "@type": "Question", "name": "هل الخشب الطبيعي يغير لون الماء؟", "acceptedAnswer": { "@type": "Answer", "text": "نعم، يُفرز تانينات تُحوّل الماء للأصفر. هذا طبيعي وغير ضار. نقّع الخشب أسبوعاً في ماء ساخن مع تغيير الماء يومياً لتقليل الصبغة." } },
        { "@type": "Question", "name": "هل أغسل الديكور بالصابون؟", "acceptedAnswer": { "@type": "Answer", "text": "لا أبداً. الصابون والمنظفات تُسمّم الماء وتقتل البكتيريا النافعة. اغسل الديكور بماء دافئ نظيف فقط." } },
        { "@type": "Question", "name": "هل الديكور البلاستك آمن؟", "acceptedAnswer": { "@type": "Answer", "text": "نعم إذا كان مُصنَّفاً aquarium-safe أو food-grade. تجنب الديكور البلاستك الرخيص غير المخصص للأحواض لأنه قد يُطلق مواد كيميائية." } },
        { "@type": "Question", "name": "شلون أعرف الديكور غير مناسب للحوض؟", "acceptedAnswer": { "@type": "Answer", "text": "علامات الديكور غير المناسب: طلاء يتقشر، رائحة كيميائية، معدن غير مطلي، أو ألوان فاقعة من مصدر غير موثوق. اشترِ دائماً ديكوراً مُصنَّفاً لأحواض الزينة." } },
        { "@type": "Question", "name": "هل AQUAVO يبيع ديكور وأحجار أحواض الزينة في العراق؟", "acceptedAnswer": { "@type": "Answer", "text": "نعم. AQUAVO متجر معدات ومستلزمات أحواض الزينة في العراق يوفر ديكورات وأحجاراً آمنة ومختبرة، مع توصيل 5,000 دينار لكل المحافظات والدفع عند الاستلام." } }
      ]
    });
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "دليل ديكور وأحجار أحواض الزينة في العراق",
      "description": "دليل عملي لاختيار ديكور وأحجار آمنة لأحواض الزينة في العراق: شنو الحجر الآمن، هل الحجر يغير pH، شلون تغسل الديكور قبل الاستخدام، والفرق بين الديكور الطبيعي والصناعي.",
      "author": { "@type": "Organization", "name": "AQUAVO" },
      "publisher": { "@type": "Organization", "name": "AQUAVO", "url": BASE_URL },
      "datePublished": "2026-06-29",
      "dateModified": "2026-06-29",
      "inLanguage": "ar",
      "url": `${BASE_URL}/guides/aquarium-decor-stones-guide`,
      "mainEntityOfPage": `${BASE_URL}/guides/aquarium-decor-stones-guide`,
      "about": [
        { "@type": "Thing", "name": "ديكور أحواض الزينة" },
        { "@type": "Thing", "name": "أحجار أحواض الزينة" },
        { "@type": "Thing", "name": "أمان مستلزمات الأحواض" }
      ]
    });
  }


  return jsonLdScripts.map(scriptTag).join("\n");
}

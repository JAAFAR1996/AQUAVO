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
      "@type": "OnlineStore",
      "@id": `${BASE_URL}/#store`,
      "name": "AQUAVO Store",
      "image": LOGO_URL,
      "url": BASE_URL,
      "telephone": "+964-774-788-0673",
      "currenciesAccepted": "IQD",
      "paymentAccepted": ["Cash on Delivery", "Cash"],
      "description": "متجر إلكتروني عراقي متخصص في مستلزمات ومعدات أحواض الزينة الأصلية. خدمة توصيل لجميع المحافظات.",
      "areaServed": [
        {
          "@type": "Country",
          "name": "Iraq",
          "sameAs": "https://www.wikidata.org/wiki/Q796"
        }
      ],
      "parentOrganization": {
        "@id": `${BASE_URL}/#organization`
      },
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

    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": "AQUAVO — معدات أحواض أسماك أصلية في العراق",
      "description": "نشرة AQUAVO لمعدات أحواض الأسماك: فلاتر، سخانات، أغذية، ديكورات، معالجات مياه — توصيل لكل العراق خلال 24 ساعة",
      "thumbnailUrl": "https://www.aquavoiq.com/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp",
      "uploadDate": "2026-01-01",
      "contentUrl": "https://www.aquavoiq.com/images/hero/Aquarium_Animation_Request_Fulfilled.mp4",
      "duration": "PT30S"
    });

    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "SpeakableSpecification",
      "cssSelector": ["#hero-headline", "#trust-signals", "h1", ".hero-description"]
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

  return jsonLdScripts.map(scriptTag).join("\n");
}


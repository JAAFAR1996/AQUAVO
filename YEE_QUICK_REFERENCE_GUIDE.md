# ⚡ YEE Quick Reference Guide
## دليل مرجعي سريع لإنتاج صور المنتجات

> **استخدم هذا الدليل للوصول السريع للـ prompts والتقنيات**

---

## 📋 جدول المحتويات السريع

- [8 أنواع الصور لكل منتج](#8-أنواع-الصور-لكل-منتج)
- [7 إعدادات إضاءة سينمائية](#7-إعدادات-إضاءة-سينمائية)
- [قواعد التوافق Dark/Light Mode](#قواعد-التوافق-darklight-mode)
- [نموذج JSON أساسي](#نموذج-json-أساسي)
- [خريطة سريعة: منتج → نوع صورة](#خريطة-سريعة-منتج--نوع-صورة)

---

## 8 أنواع الصور لكل منتج

### 1. 🏆 Hero Shot
**الهدف:** جذب انتباه فوري وإلهام المشتري
**متى:** أول صورة في صفحة المنتج
**التركيز:** جمال المنتج، إضاءة درامية، خلفية احترافية

### 2. 🔬 Technical Detail
**الهدف:** بناء الثقة من خلال التفاصيل الدقيقة
**متى:** بعد Hero shot مباشرة
**التركيز:** ماكرو، جودة المواد، تفاصيل التصنيع

### 3. 🏡 Lifestyle / In-Context
**الهدف:** إظهار المنتج في بيئته الطبيعية
**متى:** بعد Technical details
**التركيز:** المنتج قيد الاستخدام، سياق حقيقي، مشاعر إيجابية

### 4. 💎 Emotional Close-up
**الهدف:** خلق ارتباط عاطفي وإظهار النتيجة النهائية
**متى:** منتصف معرض الصور
**التركيز:** النتيجة (سمكة صحية، ماء نظيف)، تفاصيل جميلة

### 5. 🔄 360° Angle / Multi-View
**الهدف:** شفافية كاملة، إظهار جميع الزوايا
**متى:** قبل قرار الشراء
**التركيز:** 4 زوايا رئيسية، اتساق، معلومات العبوة

### 6. 📚 Infographic / Educational
**الهدف:** تعليم العميل كيفية الاستخدام الأمثل
**متى:** في تبويب "How to Use"
**التركيز:** خطوات واضحة، أيقونات، نصائح

### 7. 📦 Unboxing / Scale Reference
**الهدف:** توقعات دقيقة للحجم، تقليل الإرجاع
**متى:** في تبويب "Product Details"
**التركيز:** مقارنة الحجم، محتويات العبوة

### 8. ⚡ Action / Usage
**الهدف:** إثارة الحماس، إظهار الفعالية
**متى:** آخر صورة قبل زر الشراء
**التركيز:** حركة، ديناميكية، نتائج فورية

---

## 7 إعدادات إضاءة سينمائية

### 1. 🌅 Golden Hour
```
الإضاءة: "45° key light with warm golden glow"
المزاج: "Warm, aspirational, luxury"
متى تستخدمها: أطعمة الأسماك، منتجات premium، lifestyle shots
```

### 2. 🌑 Low Key
```
الإضاءة: "Low-key lighting with dark shadows, high contrast"
المزاج: "Dramatic, powerful, mysterious"
متى تستخدمها: معدات احترافية، منتجات تقنية
```

### 3. 🎭 Spotlight
```
الإضاءة: "Single dramatic beam from above, complete darkness surrounding"
المزاج: "Theatrical, hero moment"
متى تستخدمها: product launch, premium positioning
```

### 4. 🎨 Chiaroscuro
```
الإضاءة: "Dramatic side lighting, strong contrast, Rembrandt-style"
المزاج: "Artistic, classical, high-end"
متى تستخدمها: premium decorations, artistic aquascaping products
```

### 5. ⚡ Cutter Lights
```
الإضاءة: "Graphic patterns, hard-edged shadows"
المزاج: "Edgy, modern, bold"
متى تستخدمها: modern equipment, tech accessories
```

### 6. 📸 Hard Flash
```
الإضاءة: "Direct on-camera flash, sharp shadows"
المزاج: "Raw, authentic, energetic"
متى تستخدمها: action shots, dynamic usage scenes
```

### 7. 👤 Silhouette
```
الإضاءة: "Complete backlighting, no facial details"
المزاج: "Mysterious, iconic, minimalist"
متى تستخدمها: dramatic reveals, artistic shots
```

---

## قواعد التوافق Dark/Light Mode

### ✅ DO (افعل):

#### للخلفيات:
```json
"background": "Gradient من #E5E7EB إلى #9CA3AF"  // متوسط الدرجات
"background": "Gradient من #F5F1E8 إلى #2C5F77"  // تدرج طبيعي
"background": "Gradient من #E0F2FE إلى #0891B2"  // أكوا متوازن
```

#### للإضاءة:
```json
"lighting": {
  "color_temperature": "5500K-6500K",  // محايد
  "quality": "High contrast on product itself"  // تباين على المنتج
}
```

#### للظلال:
```json
"shadows": "Natural shadows beneath product for grounded realism"
```

### ❌ DON'T (لا تفعل):

```json
"background": "pure white (#FFFFFF)"  // يفشل في dark mode
"background": "pure black (#000000)"  // يفشل في light mode
"lighting": "Completely flat - no shadows"  // يبدو مسطحاً
```

---

## نموذج JSON أساسي

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "[الهدف الرئيسي للصورة]",
    "secondary": "[الهدف الثانوي]"
  },
  "subject": {
    "main": "[اسم المنتج]",
    "attributes": {
      "physical": "[الوصف المادي الدقيق]"
    }
  },
  "environment": {
    "lighting": {
      "type": "[نوع الإضاءة من القائمة السابقة]",
      "direction": "[اتجاه الضوء]",
      "quality": "[وصف جودة الضوء]",
      "color_temperature": "[5000K-6500K]"
    },
    "background": "[تدرج متوافق مع Dark/Light mode]"
  },
  "style": {
    "artistic": "[الأسلوب الفني]",
    "camera": {
      "angle": "[زاوية الكاميرا]",
      "lens": "[50mm, 85mm, 100mm macro]",
      "aperture": "[f/2.8 - f/11]",
      "shot_type": "[نوع اللقطة]"
    },
    "mood": "[المزاج والشعور المطلوب]"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "[1:1, 4:5, 16:9 حسب الاستخدام]",
    "quality": "maximum"
  },
  "constraints": {
    "exclusions": ["pure white background", "harsh shadows", "low detail"]
  },
  "context_awareness": {
    "real_world_logic": true,
    "physics_accurate": true
  },
  "output_specs": {
    "success_criteria": "[ماذا يجب أن يفكر العميل]",
    "emotional_trigger": "[المشاعر المستهدفة]"
  }
}
```

---

## خريطة سريعة: منتج → نوع صورة

### 🐟 أطعمة الأسماك
**الأولوية:**
1. Hero Shot (Golden Hour lighting)
2. Lifestyle (Feeding time joy)
3. Emotional Close-up (Healthy fish scales)
4. Technical Detail (Ingredient macro)
5. Infographic (Feeding guide)
6. Action (Feeding frenzy)

**خلفيات موصى بها:**
- Warm cream (#F5F1E8) → Deep teal (#2C5F77)
- Golden yellow (#FEF3C7) → Aqua (#0E7490)

---

### 🔥 سخانات
**الأولوية:**
1. Hero Shot (Low Key / Cutter Lights)
2. Technical Detail (Cable cross-section)
3. Technical Detail (Thermostat cutaway)
4. Lifestyle (Tropical fish thriving)
5. Action (Temperature distribution visualization)
6. Emotional Close-up (Precision dial)

**خلفيات موصى بها:**
- Deep navy (#1E3A8A) → Steel grey (#475569)
- Charcoal (#3A3A3A) → Slate blue (#4A5568)

---

### 💧 فلاتر
**الأولوية:**
1. Hero Shot (Rembrandt lighting, professional)
2. Technical Detail (Filtration stages exploded view)
3. Lifestyle (Crystal clear aquarium)
4. Emotional Close-up (Impeller engineering)
5. Infographic (Flow path diagram)
6. 360° Product views

**خلفيات موصى بها:**
- Deep ocean blue (#1E40AF) → Dark teal (#115E59)
- Light blue-grey (#E0F2FE) → White (#FAFAFA)

---

### 🧹 أدوات الصيانة
**الأولوية:**
1. Hero Shot (Clean studio lighting)
2. Action (Before/after cleaning)
3. Lifestyle (Easy maintenance scene)
4. Infographic (How to use steps)
5. Scale Reference (Size comparison)

**خلفيات موصى بها:**
- Sand beige (#F5F5DC) → Sky blue (#DBEAFE)
- Mint (#ECFDF5) → Light blue (#DBEAFE)

---

### 🌡️ أدوات القياس
**الأولوية:**
1. Hero Shot (Clean technical)
2. Technical Detail (Sensor macro)
3. Emotional Close-up (Display showing perfect reading)
4. Infographic (Species temperature guide)
5. Lifestyle (Monitoring peace of mind)

**خلفيات موصى بها:**
- Clear blue (#E0F2FE) → Deep aqua (#0891B2)
- Light grey (#F3F4F6) → Medium grey (#9CA3AF)

---

### 💨 ملحقات الهواء
**الأولوية:**
1. Hero Shot (Flat lay complete kit)
2. Action (Bubbles in action, backlit)
3. Technical Detail (Check valve cutaway)
4. Lifestyle (Aeration system in tank)

**خلفيات موصى بها:**
- Light grey (#F3F4F6) → White with bubble overlay
- Deep navy (#1E3A8A) → Black (for bubble drama)

---

### 🪨 ديكورات وأحجار
**الأولوية:**
1. Hero Shot (Natural aquascape beauty)
2. Lifestyle (Fish natural behavior)
3. Infographic (Aquascaping layouts)
4. Emotional Close-up (Texture and natural beauty)

**خلفيات موصى بها:**
- Bright lime green (#D9F99D) → Deep forest (#064E3B)
- Warm sand (#F4E4C1) → Cool water blue (#A5F3FC)

---

## 📊 نسب الصور الموصى بها

### للاستخدامات المختلفة:

- **Hero Image (صفحة المنتج الرئيسية):** `4:5` (مثالي للموبايل)
- **Product Details (تفاصيل المنتج):** `1:1` (مربع، يعمل في كل مكان)
- **Lifestyle/Action Shots:** `16:9` (سينمائي، للصور العريضة)
- **Infographics:** `16:9` أو `1:1` حسب المحتوى
- **Technical Diagrams:** `1:1` (لتوزيع متساوي للمعلومات)

---

## 🎯 معادلة النجاح السريعة

```
صورة ناجحة =
  إضاءة درامية (من القائمة السابقة)
  + تدرج متوافق Dark/Light
  + تباين عالي على المنتج
  + مزاج واضح
  + هدف عاطفي محدد
```

---

## ⚡ نصائح سريعة للتوليد

### إذا كانت الصورة مملة:
1. **غيّر الإضاءة** من القائمة السبعة
2. **أضف عمق:** زد aperture لـ bokeh جميل
3. **أضف حركة:** action shots أو water effects

### إذا لم تعمل في Dark Mode:
1. **تحقق من الخلفية:** هل هي أبيض خالص؟ → غيّرها لتدرج
2. **أضف تباين:** ظلال طبيعية تحت المنتج
3. **استخدم تدرجات متوسطة:** لا أبيض ولا أسود خالص

### إذا لم يثق العميل بالجودة:
1. **أضف Technical Detail shots**
2. **أضف Scale Reference**
3. **أضف Infographic تعليمي**

---

## 📈 مؤشرات الجودة السريعة

### صورة ممتازة تحقق:
✅ تعمل بنفس القوة في Dark و Light mode
✅ تُفهم بدون نص
✅ تُثير مشاعر إيجابية فوراً
✅ تُجيب على سؤال ضمني للعميل
✅ تجعله يتخيل نفسه يستخدم المنتج

---

## 🔗 الملفات الكاملة

للتفاصيل الكاملة، راجع:
- `YEE_MASTER_PRODUCT_VISUAL_PROMPTS.md` - الدليل الشامل
- `YEE_ADDITIONAL_CATEGORIES_PROMPTS.md` - الفئات الإضافية

---

## 💡 مثال سريع للاستخدام

**السيناريو:** تريد إنشاء Hero Shot لطعام Koi

1. **افتح:** `YEE_MASTER_PRODUCT_VISUAL_PROMPTS.md`
2. **ابحث عن:** "YEE-C1-1065 | Koi Food"
3. **انسخ:** JSON الخاص بـ Hero Shot
4. **عدّل:** اسم المنتج والألوان فقط (إذا لزم)
5. **الصق في:** Gemini 2.5 Flash Image / Higgsfield
6. **ولّد:** واحصل على صورة احترافية

---

**تم إعداد هذا الدليل السريع ليكون مرجعك اليومي!**

**للأسئلة أو التخصيصات:**
ارجع للملفات الكاملة للحصول على شرح تفصيلي لكل تقنية.

---

# 🎬 Sources & Credits

هذا الدليل مبني على أبحاث ومصادر احترافية:

## Tim Koda Techniques:
- [7 Cinematic Lighting Setups](https://www.instagram.com/timkoda_/)
- The Realism Formula
- Impossible Product Shots Guide

## E-commerce Best Practices 2026:
- [Ecommerce Product Photography Guide - Iconic](https://iconicwp.com/blog/ecommerce-product-photography/)
- [Product Photography Tools for Growth](https://www.gotolstoy.com/blog/product-photography-tools)
- [Beginner's Guide to Product Photography - WizCommerce](https://wizcommerce.com/blog/ecommerce-product-photography/)
- [Stunning E-Commerce Photography - The Line Studios](https://thelinestudios.nyc/how-to-create-stunning-e-commerce-product-photography-that-converts/)
- [AI Product Photography Statistics](https://www.photoroom.com/blog/ai-image-statistics)

## Aquarium Photography Techniques:
- [Aquarium Photography Guide - Aquarium Libraries](https://aqualibs.com/how-to-take-great-aquarium-photos/)
- [19 Aquarium Photography Tips - FixThePhoto](https://fixthephoto.com/aquarium-photography-tips.html)
- [Aquarium Lighting Guide 2026](https://insiderfish.com/aquarium-lighting-guide/)

**تأثير متوقع:**
- +60-94% زيادة في معدل التحويل
- -40% تقليل في معدل الإرجاع
- +85% زيادة في الوقت على الصفحة

---


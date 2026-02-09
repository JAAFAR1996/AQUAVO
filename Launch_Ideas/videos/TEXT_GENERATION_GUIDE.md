# 📝 دليل توليد النصوص مع الصور
## TEXT GENERATION GUIDE FOR AQUAVO VIDEOS

---

## 🎯 الهدف

توليد صور تحتوي على **النص العربي مدمج داخل الصورة** - مثل أسلوب NanoBanana

---

## ⚠️ مشكلة النص العربي في AI

معظم نماذج AI تعاني مع النص العربي:
- الحروف تظهر مفككة
- الاتجاه معكوس (LTR بدل RTL)
- الخطوط غير متناسقة

### ✅ الحلول المتاحة:

---

## الطريقة 1: Ideogram + Midjourney (الأفضل للنصوص)

```
الخطوة 1: ولّد الصورة في Midjourney بدون نص
الخطوة 2: ارفع الصورة إلى Ideogram Canvas
الخطوة 3: أضف النص العربي في Ideogram (يدعم العربية جيداً)
الخطوة 4: استخدم AI لدمج النص بشكل احترافي
```

**التكلفة: ~$26-30 شهرياً**

---

## الطريقة 2: Gemini 2.5 Flash Image (مباشر)

### الـ Prompt المُحسّن للنص العربي:

عند استخدام Gemini، أضف هذه التعليمات في بداية الـ prompt:

```
TEXT RENDERING INSTRUCTIONS:
- Render Arabic text RIGHT-TO-LEFT (RTL) direction
- Use bold sans-serif Arabic font style
- Text must be clearly readable with high contrast
- Place text inside a semi-transparent dark box
- Font size: large and prominent
- Text color: pure white (#FFFFFF)
- Box color: black at 70-80% opacity
- Add subtle drop shadow under text
[الآن أضف الـ Prompt البصري]
```

### مثال كامل:

```
TEXT RENDERING INSTRUCTIONS:
- Render Arabic text "سمكة البيتا لا تحتاج فلتر؟ 🤔" in RIGHT-TO-LEFT direction
- Use bold sans-serif Arabic font, large and prominent
- Place in upper area of image inside semi-transparent black box (80% opacity)
- Text color: pure white with subtle shadow
- Box has rounded corners (8px)

VISUAL SCENE:
Photorealistic close-up of stunning Halfmoon Betta fish in small glass bowl.
Fish has deep red body gradient to blue fins, large Pixar-style expressive eyes...
[باقي التفاصيل البصرية]
```

---

## الطريقة 3: CapCut / Canva (Post-Production)

إذا لم تنجح الطرق الأخرى:

### في CapCut:
1. افتح الفيديو/الصورة
2. اضغط "Text" → "Add Text"
3. اختر خط عربي (Cairo, Tajawal)
4. أضف Background Box
5. استخدم "Effects" للحركة

### في Canva:
1. ارفع الصورة
2. اختر "Text" → اكتب بالعربية
3. اختر خط Arabic
4. أضف "Background" للنص
5. صدّر بجودة عالية

---

## 📐 موقع النصوص (Safe Zones)

```
┌─────────────────────────────────────┐
│ ████ AVOID - Top 250px ████        │  ← شعارات TikTok
├─────────────────────────────────────┤
│                                     │
│     ✅ TEXT SAFE ZONE               │  ← النص هنا
│     (1080 x 1420px)                │
│                                     │
├─────────────────────────────────────┤
│ ████ AVOID - Bottom 300px ████     │  ← أزرار التفاعل
└─────────────────────────────────────┘
        │← 120px →│
         تجنب اليمين للأيقونات
```

---

## 🎨 تنسيق النصوص لكل فيديو

### V1: البيتا
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | سمكة البيتا لا تحتاج فلتر؟ 🤔 | أعلى |
| 3-8s | هذا ما يحدث فعلاً... 💔 | وسط |
| 8-12s | الفلتر = حياة أطول ✨ | وسط |
| 12-15s | 🐟 سمكتك تستحق الأفضل | أسفل |

### V2: الألم
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | السمك لا يحس بالألم؟ 🤔 | أعلى |
| 3-8s | نفس مستقبلات الألم! 🧠 | وسط |
| 8-12s | الأسماك تشعر... وتستحق الرحمة 💙 | وسط |
| 12-15s | 🐟 عاملها برفق | أسفل |

### V3: الإطعام
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | أطعم سمكتي 3 مرات! 🍽️ | أعلى |
| 3-8s | الطعام الزائد = سم بطيء ☠️ | وسط |
| 8-12s | القاعدة: ما تأكله في دقيقتين فقط ⏱️ | وسط |
| 12-15s | 🐟 أقل = أكثر | أسفل |

### V4: الأحلام
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | هل تعلم؟ السمك يحلم! 💭 | أعلى |
| 3-8s | نشاط دماغي مشابه للبشر! 🧠 | وسط |
| 8-12s | ماذا تحلم سمكتك؟ 🌊 | وسط |
| 12-15s | 🐟 دعها تنام بسلام | أسفل |

### V5: الكرسي المتحرك
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | سمكة لا تستطيع السباحة... 💔 | أعلى |
| 3-8s | Derek صنع لها كرسي متحرك! ♿ | وسط |
| 8-12s | والآن تسبح بسعادة! ✨ | وسط |
| 12-15s | 🐟 لا تستسلم أبداً | أسفل |

### V6: الإضاءة
| الوقت | النص | الموقع |
|-------|------|--------|
| 0-3s | حوضي مضيء 24 ساعة! 💡 | أعلى |
| 3-8s | هذا يقتل ملايين الأسماك سنوياً! ⚠️ | وسط |
| 8-12s | الحل: 8-10 ساعات ضوء + ظلام للراحة 🌙 | وسط |
| 12-15s | 🐟 أسماكك تحتاج الليل! | أسفل |

---

## 🔧 إعدادات النص الموحدة

```json
{
  "text_settings": {
    "font": "DIN Next Arabic Bold أو Cairo Bold",
    "size": "50-62px",
    "color": "#FFFFFF",
    "stroke": {
      "width": "3px",
      "color": "#000000"
    },
    "background_box": {
      "color": "rgba(0, 0, 0, 0.75)",
      "padding": "16px 28px",
      "border_radius": "10px"
    },
    "shadow": "2px 2px 4px rgba(0,0,0,0.5)"
  }
}
```

---

## 💡 نصيحة NanoBanana Style

للحصول على مظهر احترافي مثل NanoBanana:

1. **استخدم Ideogram لإضافة النص** - أفضل دعم للعربية
2. **أو أضف النص في CapCut** مع:
   - تأثيرات ظهور متدرجة
   - حركة خفيفة (bounce)
   - تزامن مع الصوت
3. **حافظ على التناسق** - نفس الخط والحجم في كل الفيديوهات

---

**جاهز للإنتاج! 🎬**

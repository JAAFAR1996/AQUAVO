# 🎬 HunyuanVideo I2V - مولد فيديوهات الريلز

واجهة بسيطة لتحويل الصور إلى فيديوهات باستخدام **Tencent HunyuanVideo** على **Modal**.

## 🚀 البدء السريع

### 1. تثبيت Modal CLI
```bash
pip install modal
modal token new
```

### 2. إنشاء Secret للـ HuggingFace (اختياري)
```bash
modal secret create huggingface-secret HUGGING_FACE_HUB_TOKEN=hf_xxxxx
```

### 3. نشر التطبيق
```bash
cd Launch_Ideas/hunyuan-video
modal deploy hunyuan_modal.py
```

### 4. تحديث رابط الـ API
بعد النشر، ستحصل على رابط مثل:
```
https://YOUR_USERNAME--hunyuan-video-i2v-hunyuanvideoi2v-generate.modal.run
```

افتح `app.js` وحدّث `CONFIG.API_URL`:
```javascript
API_URL: 'https://YOUR_USERNAME--hunyuan-video-i2v-hunyuanvideoi2v-generate.modal.run',
```

### 5. فتح الواجهة
افتح `index.html` في المتصفح أو شغّل سيرفر محلي:
```bash
python -m http.server 8000
# ثم افتح http://localhost:8000
```

## 📋 الميزات

- ✅ رفع صور (drag & drop)
- ✅ كتابة وصف للحركة (prompt)
- ✅ اختيار الأبعاد (9:16 للريلز، 1:1، 16:9)
- ✅ اختيار المدة (3, 5, 7 ثواني)
- ✅ معاينة وتحميل الفيديو

## 💰 التكلفة التقريبية

| المدة | وقت التوليد | التكلفة |
|-------|-------------|---------|
| 3 ثواني | ~1-2 دقيقة | ~$0.10 |
| 5 ثواني | ~2-3 دقائق | ~$0.20 |
| 7 ثواني | ~3-5 دقائق | ~$0.35 |

## 🛠️ الملفات

```
hunyuan-video/
├── hunyuan_modal.py   # Modal Backend (H100 GPU)
├── index.html         # واجهة المستخدم
├── style.css          # التصميم
├── app.js             # JavaScript للواجهة
├── requirements.txt   # المتطلبات
└── README.md          # هذا الملف
```

## ⚠️ ملاحظات مهمة

1. **أول تشغيل بطيء**: تحميل النموذج (~50GB) يستغرق 5-10 دقائق في المرة الأولى فقط
2. **GPU H100**: يستخدم 80GB VRAM للحصول على أفضل جودة
3. **الكاش**: النموذج يُحفظ في Modal Volume لتسريع التشغيلات اللاحقة

## 🎯 نصائح للـ Prompts

### ✅ جيد:
> سمكة ذهبية تسبح برشاقة في ماء صافٍ، مع فقاعات صغيرة تتصاعد، إضاءة ناعمة

### ❌ سيء:
> سمكة

---

**Powered by Tencent HunyuanVideo on Modal** 🚀

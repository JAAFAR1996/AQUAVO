# 🏢 AQUAVO CORPORATE MASTER BLUEPRINT (2026 EDITION)
*The definitive architecture for the AQUAVO autonomous "Zero-Employee" AI Corporation. Graded 10/10.*

---

## 🌍 1. رؤية الشركة (The Vision)
هذا الملف يمثل الدستور التقني لشركة AQUAVO، أول شركة عراقية تُدار بالكامل بواسطة الذكاء الاصطناعي (AI Agency). 
دور المؤسس (أبو جوج) يقتصر على: الموافقة النهائية (✅)، استلام الكاش، تصوير الإعلانات، وتسجيل البصمات الصوتية للمؤثرين.

### 🔴 التخصيص الواقعي لسوق العراق وواقع 2026:
1. **نظام الدفع (COD Exclusive):** الاعتماد الكلي على الدفع عند الاستلام (Cash on Delivery).
2. **الانقطاع الكهربائي (100% Cloud-Native):** ممنوع الاعتماد على حاسبة المؤسس لأي عملية برمجية. النظام يعمل 24/7 على سيرفرات Railway السحابية لضمان عدم توقف الطابور عند انقطاع الكهرباء.
3. **دورة النقد المكتملة:** النظام يمتلك حالة "مبالغ قيد التحصيل" ولا يقوم بجدولة شراء أي بضاعة من الموردين إلا بعد التأكد من استلام السيولة.
4. **تزامن المخزون اللحظي:** إذا تم بيع آخر "هيتر"، القاعدة تبلغ الوكلاء فوراً ليتوقف قسم التسويق عن الترويج له.

---

## 🧠 2. الهيكلية الإدارية المدمجة (The 8 Super-Agents)

تم دمج الشركة برمجياً إلى **8 وكلاء رئيسيين (Super-Agents)** لتسريع اتخاذ القرار، مزودين بمهام فرعية (Tools) لحل النقوصات التشغيلية:

### 1. 👑 المدير التنفيذي والعمليات (The CEO & RevOps Agent)
*   **المهام:** يدير الشركة، يراقب الأزمات، ويفصل الأقسام عند الضرورة.
*   **أدواته (Tools):** `Telegram_Gateway`، `Global_Variables_Manager`، `Website_Uptime_Monitor` (لمراقبة سقوط الموقع وإرسال إنذار فوري).

### 2. 💰 المحاسب المالي (The Finance Agent)
*   **المهام:** حساب التكلفة (Landed Cost)، والمطابقة النقدية.
*   **أدواته (Tools):** `Cash_Flow_Tracker`، `Supplier_Payment_Scheduler` (لجدولة مواعيد تحويل الأموال للمصانع).

### 3. 📣 مدير التسويق والإعلانات (The Chief Marketing Agent)
*   **المهام:** الإعلانات المدمجة (عضوية + ممولة).
*   **أدواته (Tools):** `Parallel_Quality_Control` (يعمل بالتوازي بعد النشر لكي لا يؤخر الـ Trend)، `AEO_Schema_Builder`.

### 4. 🛒 مدير المبيعات والتفاعل (Sales & Engagement Agent)
*   **المهام:** استرجاع السلات المتروكة والرد على التعليقات.
*   **أدواته (Tools):** `Email_Marketing_Machine`، `Social_Comments_AutoReply` (للرد السريع على تيك توك وإنستغرام).

### 5. 💖 مدير نجاح العملاء المدمج (Customer Success)
*   **المهام:** إرسال أدلة تعليمية للزبائن بعد استلام الشحنة لضمان الولاء.

### 6. 📦 مدير العمليات اللوجستية والتوالف (Logistics & Inventory Agent)
*   **المهام:** يصدر البوليصات (Stickers) أوتوماتيكياً عبر الوسيط.
*   **أدواته (Tools):** 
    - `Al_Waseet_Order_Creator`.
    - `Returns_Restock_Sync` (لتحديث المخزون فورياً عند استرجاع بضاعة تالفة أو مرفوضة).
    - `Reverse_Logistics_Manager` (لرفع مطالبة تعويض ضد شركة التوصيل).

### 7. 🕵️ مدير الاستخبارات والمشتريات (Intelligence & Sourcing Agent)
*   **المهام:** يراقب المنافسين عبر الـ Proxies، ويهيئ عروض المؤثرين العراقيين.
*   **ملحوظة تشغيلية (العراق):** الوكيل *يجهز* مسودة رسالة للمؤثر العراقي، ولكن لا يرسلها كـ Bot، بل يسلمها للمؤسس ليقوم بإرسالها مرفقة بـ "بصمة صوتية" لضمان رد المؤثر.

### 8. 🔬 مهندس البحث والتصنيع (R&D Agent)
*   **المهام:** يقرر متى يجب تصنيع المنتجات محلياً لزيادة الربح.
*   **أدواته (Tools):** `Manufacturing_Cost_Analyzer` (يقارن تكلفة الاستيراد مقابل التصنيع بالقوالب)، و `Supplier_RFQ_Generator` (يولّد طلبات عروض أسعار هندسية من المصانع).

---

## 🛠️ 3. التكلفة الحقيقية والحلول الهندسية (Technical & Cost Check)

تم تصميم النظام ليكون **(Bulletproof)** من حيث الذاكرة والتكاليف التشغيلية (الحد الأقصى $75 شهرياً):

1. **الخادم الأساسي وقواعد البيانات ($15/شهر):** استضافة 24/7 على **Railway**.
2. **منع الانهيار (BullMQ + Redis) ($10/شهر):** تثبيت **Redis** إجبارياً كقاعدة بيانات خلفية لـ BullMQ لتنسيق الطابور ومنع الـ OOM Deadlocks.
3. **معالجة الذكاء الاصطناعي (Hybrid Routing):**
   - **Groq API:** المهام المستمرة والبسيطة تعمل عليه (تكلفة شبه مجانية + سرعة أجزاء من الثانية) بدلاً من Ollama لضمان بقاء النظام سحابياً 100%.
   - **claude-sonnet-4-5 ($40/شهر):** يستخدم حصرياً للمهام الثقيلة (التحليل وبناء الإعلانات).
4. **المجموع التقريبي للتكلفة:** ~$50 إلى $75 دولار كحد أقصى (Ceiling).

---

## 🚀 4. خارطة الطريق للتنفيذ (Execution Road Map)

- [ ] **Task 1: Foundations** - Create `aquavo-agency`. Install `mastra`, `bullmq` + `ioredis` (Crucial for Queueing), `drizzle-orm`, `telegram-bot-api`.
- [ ] **Task 2: Memory & Database** - Setup Neon `pgvector` and `schema.ts`, including Inventory Sync logic and "Pending Cash Collection".
- [ ] **Task 3: Command Center** - Build Telegram gateway strictly locked to Founder's Chat ID. Combine with Uptime Monitor logic.
- [ ] **Task 4: AI Cost Router** - Build logic to route trivial tasks to **Groq API** and complex logic to **claude-sonnet-4-5**.
- [ ] **Task 5: Al-Waseet Logistics & Returns Engine** - Build the Logistics agent using Al-Waseet API, ensuring it handles Returns/Restock Sync and Automated Claim creation.
- [ ] **Task 6: Execution of the 8 Super-Agents** - Instantiate the 8 main Mastra agents with their sub-tools (Email Marketing, Social Reply, Parallel QC).

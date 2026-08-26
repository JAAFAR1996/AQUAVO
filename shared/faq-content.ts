/**
 * The FAQ, once.
 *
 * There were two of these. `client/src/pages/faq.tsx` held eleven questions in
 * four groups — the real customer-facing FAQ, covering delivery, both payment
 * methods, the YEE document and the limited warranty. `api/_seo-preview-shell`
 * held a different six, written for crawlers. So `/faq` answered a different
 * set of questions depending on who asked, and each page's FAQPage schema was
 * internally consistent with content the other never showed.
 *
 * Neither list was wrong; there were simply two of them, and they drifted. The
 * client's is the one customers actually read, so it is the one that survives.
 *
 * Only text lives here. The icons the client page renders per group stay in the
 * client, keyed by `id` — a server module must not import lucide-react.
 *
 * Every answer below is a statement of fact about how AQUAVO operates. Changing
 * one changes what the business promises, in the page, in the schema and in the
 * markdown representation at the same time. That is the point.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  /** Stable key the client uses to attach an icon. */
  id: "delivery" | "products" | "receiving" | "payment";
  title: string;
  items: readonly FaqItem[];
}

export const AQUAVO_FAQ_GROUPS: readonly FaqGroup[] = [
  {
    id: "delivery",
    title: "الطلب والتوصيل",
    items: [
      {
        question: "وين يوصل AQUAVO؟",
        answer: "نوصل لكل العراق خلال 24 ساعة، وأجرة التوصيل ثابتة 5,000 د.ع.",
      },
      {
        question: "شلون أدفع؟",
        answer:
          "تگدر تدفع نقداً عند الاستلام، أو إلكترونياً من خلال بوابة الدفع أثناء إكمال الطلب. بيانات بطاقتك تدخل ببوابة الدفع وما يخزنها AQUAVO.",
      },
      {
        question: "شلون أتتبع طلبي؟",
        answer:
          "استخدم صفحة تتبع الطلب برقم الطلب ورقم الهاتف. وإذا احتجت مساعدة، الدعم متوفر 24/7.",
      },
    ],
  },
  {
    id: "products",
    title: "المنتجات والاختيار",
    items: [
      {
        question: "شنو يبيع AQUAVO؟",
        answer:
          "نبيع معدات ومستلزمات الأحواض مثل الفلاتر والسخانات والإضاءة والغذاء والديكور ومعالجة المياه. ما نبيع أسماك حية، كائنات حية، أو نباتات مائية حية.",
      },
      {
        question: "شلون أعرف القطعة تناسب حوضي؟",
        answer:
          "راجع المواصفات بصفحة المنتج، أو دز حجم الحوض ونوع الاستخدام حتى نرتبلك الخيار المناسب بدون تخمين.",
      },
      {
        question: "شلون أختار الفلتر المناسب؟",
        answer:
          "ابدأ بحجم الحوض وعدد الأسماك والحمل الحيوي، ثم قارن التدفق الفعلي ومساحة وسائط الفلترة، مو رقم اللترات المكتوب وحده.",
      },
      {
        question: "شلون أختار السخان؟",
        answer:
          "يعتمد اختيار السخان على حجم الحوض وفرق الحرارة بين الماء والغرفة، ويجب مراقبة الحرارة بميزان مستقل.",
      },
      {
        question: "هل كل المنتجات عليها وثيقة YEE؟",
        answer:
          "لا. وثيقة YEE تخص منتجات YEE الموردة إلى AQUAVO العراق فقط، وما تشمل باقي العلامات تلقائياً.",
      },
    ],
  },
  {
    id: "receiving",
    title: "مشاكل الاستلام",
    items: [
      {
        question: "شنو أسوي إذا وصل المنتج تالف أو غلط؟",
        answer:
          "دز رقم الطلب وصور واضحة فور ما تلاحظ المشكلة. نراجع حالة الضرر أو النقص أو عدم المطابقة ونرتب الحل حسب السياسة.",
      },
      {
        question: "هل كل جهاز عليه ضمان 6 أشهر؟",
        answer:
          "لا. ضمان AQUAVO المحدود ينطبق فقط على منتج كهربائي معتمد ومذكور بوضوح بصفحة المنتج. إذا ما مذكور، لا تعتبر المنتج مشمول.",
      },
      {
        question: "منو مقدم ضمان AQUAVO؟",
        answer:
          "إذا المنتج معتمد ومشمول بوضوح، مقدم الضمان هو AQUAVO / محل المنبع / AL NABEA SHOP، مو شركة YEE تلقائياً.",
      },
    ],
  },
  {
    id: "payment",
    title: "الدفع والفاتورة",
    items: [
      {
        question: "هل السعر النهائي واضح؟",
        answer:
          "ملخص الطلب يعرض سعر المنتجات والخصم إن وجد وأجرة التوصيل والمبلغ الكلي قبل التأكيد.",
      },
      {
        question: "هل أقدر أشوف تفاصيل طلبي بعد التأكيد؟",
        answer: "نعم، صفحة تأكيد الطلب تعرض رقم الطلب والمنتجات والمبلغ وحالة الطلب.",
      },
      {
        question: "هل دعم AQUAVO متوفر طول اليوم؟",
        answer: "نعم، دعم AQUAVO متوفر 24/7 للاستفسار عن الطلبات واختيار المعدات.",
      },
    ],
  },
];

/** Every question, flattened — the shape both the schema and the shell want. */
export const AQUAVO_FAQ_ITEMS: readonly FaqItem[] = AQUAVO_FAQ_GROUPS.flatMap(
  (group) => group.items,
);

/** The same, as `[question, answer]` pairs. */
export const AQUAVO_FAQ_PAIRS: readonly (readonly [string, string])[] =
  AQUAVO_FAQ_ITEMS.map((item) => [item.question, item.answer] as const);

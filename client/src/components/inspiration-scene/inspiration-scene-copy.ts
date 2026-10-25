import type { Locale } from '@shared/i18n/locales';
import type { InspirationAvailability } from '@/lib/inspiration-board';
import type { InspirationSceneRole } from '@/lib/inspiration-scene';

export interface InspirationSceneCopy {
  eyebrow: string; title: string; intro: string; frameLabel: string; imageLabel: string;
  settingLabel: string; backgroundAlt: string; disclosure: string; scopeNote: string;
  listLabel: string; listNote: string; view: string; picturedOption: string; missingPhoto: string;
  unavailable: string; loading: string; pendingPrice: string; unpowered: string; pumpWarning: string;
  roles: Record<InspirationSceneRole, string>;
  availability: Record<InspirationAvailability, string>;
}

export const INSPIRATION_SCENE_COPY: Record<Locale, InspirationSceneCopy> = {
  ar: {
    eyebrow: 'فكرة تشوف تفاصيلها',
    title: 'شوف الفكرة. وتعرّف على كل قطعة.',
    intro: 'خشب، رمل، ومضخة. جمعنا صورها من الكتالوگ بمشهد تخطيطي واحد؛ كل رقم يودّيك لصفحة القطعة نفسها.',
    frameLabel: 'مشهد تخطيطي توضيحي', imageLabel: 'صور المنتجات من الكتالوگ', settingLabel: 'خلفية الحوض مولّدة بالذكاء الاصطناعي',
    backgroundAlt: 'خلفية مولّدة بالذكاء الاصطناعي لحوض زجاجي فارغ وجاف',
    disclosure: 'الخلفية لحوض فارغ مولّدة بالذكاء الاصطناعي، وفوكها صور الكتالوگ بدون تغيير شكلها. صور الكتالوگ ممكن تكون معدّلة سابقاً؛ مو صور موثّقة لتركيب فعلي.',
    scopeNote: 'الأحجام مو على مقياس حقيقي، ومو باقة متوافقة أو دليل تركيب. الحوض والمي والأسماك والنباتات مو ضمن الاختيارات.',
    listLabel: 'ثلاث قطع. تفاصيل واضحة.',
    listNote: 'افتح المنتج وراجع المقاس والسعر والتوفر هناك. الرابط ما يختار خيار ولا يضيف شي للسلة.',
    view: 'شوف تفاصيل المنتج', picturedOption: 'الخيار المصوّر', missingPhoto: 'صورة هالاختيار مو متاحة للمشهد هسه',
    unavailable: 'هالاختيار مو موجود بالكتالوگ هسه', loading: 'دا نحمّل اختيارات الكتالوگ', pendingPrice: 'السعر بعده مو محدد',
    unpowered: 'المضخة معروضة بدون تشغيل', pumpWarning: 'لا تشغل المضخة خارج الماء',
    roles: { wood: 'نقطة البداية: الخشب', sand: 'تفاصيل الرمل', pump: 'المضخة: عرض فقط' },
    availability: { listed: 'مُدرج كمتوفر بالكتالوگ', 'sold-out': 'مو متوفر هسه', 'coming-soon': 'قريباً، مو متاح للشراء هسه', 'pending-price': 'السعر بعده مو محدد', unknown: 'راجع التوفر بصفحة المنتج', unavailable: 'هالاختيار مو متاح' },
  },
  en: {
    eyebrow: 'An idea, with every detail linked', title: 'See the idea. Meet every piece.',
    intro: 'Wood, sand, and a pump. Their catalogue images share one illustrative planning scene. Follow each number to that exact product.',
    frameLabel: 'Illustrative planning scene', imageLabel: 'Catalogue product images', settingLabel: 'AI-generated tank background',
    backgroundAlt: 'AI-generated background of an empty, dry glass tank',
    disclosure: 'An AI-generated empty-tank background with unchanged catalogue-image layers. Catalogue images may have been edited previously; this is not a verified photo of an installation.',
    scopeNote: 'Not to physical scale, a compatible kit, or an installation guide. The tank, water, fish, and plants are not included in these selections.',
    listLabel: 'Three pieces. Clear details.', listNote: 'Open each product to check its option, price, and availability. Links do not select options or add anything to your cart.',
    view: 'View product details', picturedOption: 'Pictured option', missingPhoto: 'This selection’s image is not available for the scene',
    unavailable: 'This selection is not in the catalogue now', loading: 'Loading catalogue selections', pendingPrice: 'Price not yet confirmed',
    unpowered: 'Pump shown unpowered', pumpWarning: 'Do not run the pump outside water.',
    roles: { wood: 'Start with the wood', sand: 'Explore the sand', pump: 'Pump: display only' },
    availability: { listed: 'Listed in stock in the catalogue', 'sold-out': 'Out of stock', 'coming-soon': 'Coming soon, not available to buy yet', 'pending-price': 'Price not yet confirmed', unknown: 'Check availability on the product page', unavailable: 'This selection is unavailable' },
  },
  ckb: {
    eyebrow: 'بیرۆکەیەک بە وردەکارییەوە', title: 'بیرۆکەکە ببینە. هەر پارچەیەک بناسە.',
    intro: 'دار، لم و پەمپ. وێنەکانی کاتەلۆگیان لە یەک دیمەنی پلاندا کۆکراونەتەوە. هەر ژمارەیەک پەڕەی هەمان بەرهەم دەکاتەوە.',
    frameLabel: 'دیمەنێکی ڕوونکەرەوە بۆ پلان', imageLabel: 'وێنەی بەرهەمەکانی کاتەلۆگ', settingLabel: 'پاشبنەمای حەوز بە زیرەکی دەستکرد',
    backgroundAlt: 'پاشبنەمای حەوزێکی شووشەیی بەتاڵ و وشک بە زیرەکی دەستکرد',
    disclosure: 'پاشبنەمای حەوزی بەتاڵ بە زیرەکی دەستکرد دروستکراوە و وێنەکانی کاتەلۆگ بەبێ گۆڕینی شێوەیان لەسەری دانراون. وێنەکانی کاتەلۆگ لەوانەیە پێشتر دەستکاری کرابن؛ ئەمە وێنەی پشتڕاستکراوەی دامەزراندنێکی ڕاستەقینە نییە.',
    scopeNote: 'قەبارەکان پێوەری ڕاستەقینە نین؛ ئەمە پاکێجێکی گونجاو یان ڕێنمایی دامەزراندن نییە. حەوز، ئاو، ماسی و ڕووەک لەم هەڵبژاردنانەدا نەگونجاون.',
    listLabel: 'سێ پارچە. وردەکاریی ڕوون.', listNote: 'بەرهەمەکە بکەرەوە بۆ پشکنینی هەڵبژاردە، نرخ و بەردەستبوون. بەستەرەکان هیچ هەڵبژاردەیەک دیاری ناکەن و هیچ شتێک ناخەنە سەبەتە.',
    view: 'وردەکاریی بەرهەم ببینە', picturedOption: 'هەڵبژاردەی ناو وێنە', missingPhoto: 'وێنەی ئەم هەڵبژاردەیە بۆ دیمەنەکە بەردەست نییە',
    unavailable: 'ئەم هەڵبژاردەیە ئێستا لە کاتەلۆگدا نییە', loading: 'هەڵبژاردەکانی کاتەلۆگ بار دەکرێن', pendingPrice: 'نرخ هێشتا دیاری نەکراوە',
    unpowered: 'پەمپەکە بە کوژاوەیی پیشان دراوە', pumpWarning: 'پەمپەکە لە دەرەوەی ئاو کار پێ مەکە.',
    roles: { wood: 'لە دارەکەوە دەست پێ بکە', sand: 'وردەکاریی لم', pump: 'پەمپ: تەنها پیشاندان' },
    availability: { listed: 'لە کاتەلۆگدا بەردەستە', 'sold-out': 'ئێستا بەردەست نییە', 'coming-soon': 'بەم نزیکانە، ئێستا بۆ کڕین بەردەست نییە', 'pending-price': 'نرخ هێشتا دیاری نەکراوە', unknown: 'بەردەستبوون لە پەڕەی بەرهەم بپشکنە', unavailable: 'ئەم هەڵبژاردەیە بەردەست نییە' },
  },
};

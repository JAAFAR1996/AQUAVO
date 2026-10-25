import type { Locale } from '@shared/i18n/locales';
import type { InspirationAvailability, InspirationMaterial } from '@/lib/inspiration-board';

export interface InspirationBoardCopy {
  eyebrow: string;
  title: string;
  intro: string;
  photoLabel: string;
  disclosure: string;
  scaleNote: string;
  listLabel: string;
  listNote: string;
  picturedOption: string;
  view: string;
  missingPhoto: string;
  unavailable: string;
  loading: string;
  pendingPrice: string;
  materials: Record<InspirationMaterial, string>;
  availability: Record<InspirationAvailability, string>;
}

export const INSPIRATION_BOARD_COPY: Record<Locale, InspirationBoardCopy> = {
  ar: {
    eyebrow: 'لوحة اختيارات من الكتالوگ',
    title: 'من الفكرة، لاختيارات الكتالوگ',
    intro: 'خشب، حجر، ورمل. شوف كل خامة بصورتها بالكتالوگ، وافتح رقمها حتى تعرف تفاصيلها.',
    photoLabel: 'صور الكتالوگ',
    disclosure: 'هاي لوحة اختيار بصور الكتالوگ، مو تحديد للقطع بالمشاهد المولّدة بالذكاء الاصطناعي، ومو باقة كاملة أو ضمان توافق.',
    scaleNote: 'أحجام الصور مو مقياس لحجم القطع الحقيقي.',
    listLabel: 'القطع بهاللوحة',
    listNote: 'كل رقم يفتح صفحة منتجه. اختار المقاس وراجع السعر والتوفر هناك؛ فتح الرابط ما يختار خيار ولا يضيف شي للسلة.',
    picturedOption: 'الخيار المصوّر',
    view: 'شوف تفاصيل المنتج',
    missingPhoto: 'صورة هالخيار مو متوفرة هسه',
    unavailable: 'هالاختيار مو موجود بالكتالوگ هسه',
    loading: 'دا نحمّل اختيارات الكتالوگ',
    pendingPrice: 'السعر بعده مو محدد',
    materials: { wood: 'تفرّعات الخشب', stone: 'ملمس الحجر', sand: 'تفاصيل الرمل' },
    availability: { listed: 'مُدرج كمتوفر بالكتالوگ', 'sold-out': 'مو متوفر هسه', 'coming-soon': 'قريباً، مو متاح للشراء هسه', 'pending-price': 'السعر بعده مو محدد', unknown: 'راجع التوفر بصفحة المنتج', unavailable: 'هالاختيار مو متاح' },
  },
  en: {
    eyebrow: 'A catalogue selection board',
    title: 'From inspiration to catalogue selections',
    intro: 'Wood, stone, and sand. Explore catalogue product images and follow each number to its details.',
    photoLabel: 'Catalogue product images',
    disclosure: 'An editorial board of catalogue product images, not an identification of objects in AI-generated scenes, a complete kit, or a compatibility guarantee.',
    scaleNote: 'Photo sizes do not represent the relative sizes of the actual pieces.',
    listLabel: 'Products on this board',
    listNote: 'Each number opens its product page. Choose the option and check price and availability there; opening a link neither selects an option nor adds to cart.',
    picturedOption: 'Pictured option',
    view: 'View product details',
    missingPhoto: 'A photo of this option is not available yet',
    unavailable: 'This selection is not in the catalogue now',
    loading: 'Loading catalogue selections',
    pendingPrice: 'Price not yet confirmed',
    materials: { wood: 'Wood branches', stone: 'Stone texture', sand: 'Sand details' },
    availability: { listed: 'Listed in stock in the catalogue', 'sold-out': 'Out of stock', 'coming-soon': 'Coming soon, not available to buy yet', 'pending-price': 'Price not yet confirmed', unknown: 'Check availability on the product page', unavailable: 'This selection is unavailable' },
  },
  ckb: {
    eyebrow: 'تەختەی هەڵبژاردەکانی کاتەلۆگ',
    title: 'لە ئیلهامەوە بۆ هەڵبژاردەکانی کاتەلۆگ',
    intro: 'دار، بەرد و لم. وێنەی کاتەلۆگی هەر بەرهەمێک ببینە و ژمارەکەی بکەرەوە بۆ وردەکاری.',
    photoLabel: 'وێنەکانی کاتەلۆگ',
    disclosure: 'ئەمە تەختەی هەڵبژاردنە بە وێنەکانی کاتەلۆگ؛ ناساندنی شتەکانی دیمەنی دروستکراوی زیرەکی دەستکرد نییە، پاکێجی تەواو یان گەرەنتی گونجانیش نییە.',
    scaleNote: 'قەبارەی وێنەکان پێوەری قەبارەی ڕاستەقینەی پارچەکان نییە.',
    listLabel: 'بەرهەمەکانی ئەم تەختەیە',
    listNote: 'هەر ژمارەیەک پەڕەی بەرهەمەکە دەکاتەوە. لەوێ هەڵبژاردەکە دیاری بکە و نرخ و بەردەستبوون بپشکنە؛ کردنەوەی بەستەر هیچ هەڵبژاردەیەک دیاری ناکات و هیچ شتێک ناخاتە سەبەتە.',
    picturedOption: 'هەڵبژاردەی ناو وێنە',
    view: 'وردەکاریی بەرهەم ببینە',
    missingPhoto: 'وێنەی ئەم هەڵبژاردەیە هێشتا بەردەست نییە',
    unavailable: 'ئەم هەڵبژاردەیە ئێستا لە کاتەلۆگدا نییە',
    loading: 'هەڵبژاردەکانی کاتەلۆگ بار دەکرێن',
    pendingPrice: 'نرخ هێشتا دیاری نەکراوە',
    materials: { wood: 'لقەکانی دار', stone: 'ڕووکاری بەرد', sand: 'وردەکاریی لم' },
    availability: { listed: 'لە کاتەلۆگدا بەردەستە', 'sold-out': 'ئێستا بەردەست نییە', 'coming-soon': 'بەم نزیکانە، ئێستا بۆ کڕین بەردەست نییە', 'pending-price': 'نرخ هێشتا دیاری نەکراوە', unknown: 'بەردەستبوون لە پەڕەی بەرهەم بپشکنە', unavailable: 'ئەم هەڵبژاردەیە بەردەست نییە' },
  },
};

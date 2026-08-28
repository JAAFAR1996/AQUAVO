/**
 * The published rules for the community gallery.
 *
 * /community-gallery is two things at once. The gallery itself is customer
 * submissions read from /api/gallery behind an auth context, so it cannot be
 * rendered statically and is not what a search engine should be indexing. The
 * terms of entry and the prizes are fixed, published business rules, and a
 * crawler was shown neither: the route served 20 substantive words where a
 * visitor reads 114.
 *
 * The strings live here so the page and the crawler view read the same rules.
 * Only the wording moves; the page keeps its own icons and layout, and the
 * decorative emoji stay in the component rather than entering published content.
 */
export const GALLERY_ENTRY_TERMS: readonly string[] = Object.freeze([
  "الصورة يجب أن تكون لحوض أسماك حقيقي تملكه",
  "جودة الصورة واضحة (دقة عالية)",
  "يمكنك المشاركة مرة واحدة شهرياً",
  "الصور تخضع للمراجعة قبل النشر",
  "الفائز يُختار من قبل إدارة AQUAVO",
]);

export const GALLERY_PRIZES: readonly string[] = Object.freeze([
  "كوبون خصم على المنتجات (تحدده الإدارة)",
  "عرض صورتك واسمك في الصفحة الرئيسية",
  "مشاركة حوضك على حسابات AQUAVO",
  'شهادة "أفضل حوض الشهر"',
]);

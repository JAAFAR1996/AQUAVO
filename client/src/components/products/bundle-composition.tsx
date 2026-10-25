import { ImageOff } from 'lucide-react';
import { cardImage } from '@/lib/cloudinary';
import { isVariantActive } from '@shared/variant-commerce';
import type { Product } from '@/types';
import type { BundlePreviewItem } from './bundle-contents-preview';
const COPY = {
 ar:{title:'القطع المشمولة معاً',note:'ترتيب لصور الكتالوج، وليس صورة تركيب فعلي أو مقياساً للأحجام.',only:'المشمول هو القطع المذكورة فقط؛ أي حوض أو أسماك أو نباتات غير مذكورة ليست ضمن الباقة.',missing:'صورة الخيار غير متوفرة'},
 en:{title:'Included items together',note:'A catalogue-image composition, not an installed setup or a size scale.',only:'Only listed items are included; unlisted aquariums, fish and plants are not part of the bundle.',missing:'Option image unavailable'},
 ckb:{title:'پارچە ناوخۆکان پێکەوە',note:'ڕێکخستنی وێنەکانی کەتەلۆگە، نە وێنەی دامەزراندنە و نە پێوانەی قەبارە.',only:'تەنها پارچە ناوبراوەکان لە پاکێجەکەدان؛ حەوز و ماسی و ڕووەکی نەنووسراو لە پاکێجەکەدا نین.',missing:'وێنەی هەڵبژاردە بەردەست نییە'},
} as const;
export function bundleCompositionImage(item: BundlePreviewItem, products?: ReadonlyMap<string,Product>) {
 const product=products?.get(item.productId);
 if(item.variantId){const variant=product?.variants?.find(v=>v.id===item.variantId && isVariantActive(v));return variant?.images?.length===0?undefined:variant?.image || variant?.images?.[0];}
 return product?.thumbnail || product?.images?.[0] || item.thumbnail || undefined;
}
export function BundleComposition({items,language,products}:{items:BundlePreviewItem[];language:keyof typeof COPY;products?:ReadonlyMap<string,Product>}){
 const included=items.filter(item=>item.required); const t=COPY[language];
 if(!included.length)return null;
 return <figure className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
 <ul aria-label={t.title} className="grid grid-cols-3 gap-2 bg-primary/[0.035] p-3 sm:p-4">
 {included.map(item=>{const image=bundleCompositionImage(item,products);return <li key={`${item.productId}:${item.variantId||''}`} className="min-w-0 text-center"><div className="relative flex aspect-square items-center justify-center rounded-xl bg-background/80 p-2">{image?<img src={cardImage(image)} alt="" width={180} height={180} loading="lazy" decoding="async" className="h-full w-full object-contain"/>:<ImageOff aria-label={t.missing} className="h-6 w-6 text-muted-foreground"/>}<span className="absolute end-1 top-1 rounded-full border border-border bg-card px-1.5 text-xs font-bold"><bdi>×{item.quantity}</bdi></span></div><p className="mt-2 text-xs leading-5">{item.name||item.productId}</p>{item.variantLabel&&<p className="text-[10px] text-muted-foreground">{item.variantLabel}</p>}</li>})}
 </ul><figcaption className="space-y-2 p-3 text-[10px] leading-5 text-muted-foreground"><p>{t.note}</p><p>{t.only}</p></figcaption>
 </figure>;
}

import { adaptWoodProducts } from "@/lib/wood-gallery";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useLocale } from '@/i18n/locale-context';
import { MetaTags } from '@/components/seo/meta-tags';
import { MaterialCatalogue } from '@/components/material-catalogue/material-catalogue';
import { WoodGallery } from '@/components/wood-gallery/WoodGallery';
import { adaptMaterialProducts } from '@/lib/material-catalogue';
import { fetchProducts } from '@/lib/api';
const COPY={ar:{title:'كتالوج الرمل والحجر والخشب',intro:'استكشف صور الكتالوج، خيارات الخامات والقطع الخشبية المفردة. التكبير يوضح الصورة فقط، وليس الحجم الحقيقي.',materials:'الرمل والحجر',wood:'القطع الخشبية',loading:'نحمّل صور وبيانات الكتالوج…',error:'تعذر تحميل الكتالوج. جرّب مرة ثانية.',retry:'إعادة المحاولة',empty:'لا توجد خامات أو قطع خشبية مطابقة حالياً.',browse:'تصفح المنتجات'},en:{title:'Sand, stone & wood catalogue',intro:'Explore catalogue images, material options and individual wood pieces. Image zoom is not actual physical scale.',materials:'Sand & stone',wood:'Wood pieces',loading:'Loading catalogue images and data…',error:'The catalogue could not load. Please try again.',retry:'Try again',empty:'No matching materials or individual wood pieces are currently listed.',browse:'Browse products'},ckb:{title:'کەتەلۆگی لم و بەرد و دار',intro:'وێنەکانی کەتەلۆگ و هەڵبژاردەکانی ماددە و پارچە دارە تاکەکان ببینە. گەورەکردنی وێنە پێوانەی ڕاستەقینە نییە.',materials:'لم و بەرد',wood:'پارچە دارەکان',loading:'وێنە و زانیاریی کەتەلۆگ بار دەکرێت…',error:'کەتەلۆگ بار نەکرا. تکایە دووبارە هەوڵ بدەوە.',retry:'دووبارە هەوڵدانەوە',empty:'ئێستا ماددە یان پارچە داری گونجاو تۆمار نەکراوە.',browse:'بەرهەمەکان ببینە'}} as const;
export default function MaterialsPage(){
 const {locale,dir}=useLocale();const t=COPY[locale];
 const query=useQuery({queryKey:['products','visual-materials',locale],queryFn:()=>fetchProducts({category:'تربة وديكور',limit:100}),staleTime:300_000,retry:1});
 const products=query.data?.products||[];
 const items=adaptMaterialProducts(products);
 const hasItems=items.length>0 || adaptWoodProducts(products).length>0;
 return <main dir={dir} className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8"><MetaTags title={t.title} description={t.intro} noIndex />
 <header className="max-w-3xl space-y-4"><h1 className="font-display text-3xl font-bold sm:text-5xl">{t.title}</h1><p className="leading-8 text-muted-foreground">{t.intro}</p><nav className="flex flex-wrap gap-3"><a href="#materials" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 focus-visible:ring-2 focus-visible:ring-primary">{t.materials}</a><a href="#wood" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 focus-visible:ring-2 focus-visible:ring-primary">{t.wood}</a></nav></header>
 {query.isLoading&&<p role="status">{t.loading}</p>}{query.isError&&<div role="alert"><p>{t.error}</p><button type="button" onClick={()=>query.refetch()} className="mt-3 min-h-11 rounded-full border border-border px-5">{t.retry}</button></div>}
 {!query.isLoading&&!query.isError&&!hasItems&&<div role="status" className="rounded-2xl border border-border p-6"><p>{t.empty}</p><Link href="/products" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-border px-5 focus-visible:ring-2 focus-visible:ring-primary">{t.browse}</Link></div>}
 <div id="materials" className="scroll-mt-28"><MaterialCatalogue items={items} language={locale}/></div><div id="wood" className="scroll-mt-28"><WoodGallery products={products} language={locale}/></div>
 </main>;
}

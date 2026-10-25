import { Link } from 'wouter';
import { cardImage } from '@/lib/cloudinary';
const FILTER = 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792832033/aquavo/products/master-v4-four-reviewed-20261024/general-sponge-filter-xy180/01_Hero.webp';
const WATER = 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792820419/aquavo/products/master-v4-reviewed-20261024/yee-02924/01_Hero.webp';
const SAND = 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792392507/aquavo/products/transparent-20261019/houyi-stream-sand.webp';
const SIPHON = 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792839084/aquavo/products/nine-corrective-generated-20261024/houyi-water-changer-siphon/01_Hero.webp';
const COPY = {
 ar: [{title:'حوض جديد',text:'رتّب احتياجك خطوة بخطوة، بدون شراء قطع زائدة.'},{title:'فلترة وماء أنظف',text:'استكشف خيارات الترشيح حسب حوضك.'},{title:'أرضية وديكور',text:'قارن الرمل والحجر وصور الكتالوج.'},{title:'صيانة أسهل',text:'أدوات تغيير الماء والتنظيف.'}],
 en: [{title:'A new aquarium',text:'Plan step by step, without unnecessary extras.'},{title:'Filtration & cleaner water',text:'Explore filtration for your aquarium.'},{title:'Substrate & décor',text:'Compare sand, stone and catalogue images.'},{title:'Easier maintenance',text:'Water-changing and cleaning tools.'}],
 ckb: [{title:'حەوزێکی نوێ',text:'هەنگاو بە هەنگاو پێداویستییەکانت ڕێکبخە، بەبێ کڕینی پارچەی زیادە.'},{title:'فلتەرکردن و ئاوی پاکتر',text:'هەڵبژاردەکانی فلتەر بۆ حەوزەکەت ببینە.'},{title:'بنەڕەت و دیکۆر',text:'لم و بەرد و وێنەکانی کەتەلۆگ بەراورد بکە.'},{title:'چاودێریی ئاسانتر',text:'ئامرازەکانی گۆڕینی ئاو و پاککردنەوە.'}],
} as const;
export function NeedsPhotoBento({language}:{language:keyof typeof COPY}) {
 const links=['/journey','/products?category='+encodeURIComponent('الفلترة والتنقية'),'/materials','/products?category='+encodeURIComponent('الصيانة والتنظيف')];
 return <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-2">
 {COPY[language].map((item,index)=><Link key={item.title} href={links[index]} className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index===0?'lg:col-span-2 lg:row-span-2':index===1?'lg:col-span-2':''}`}>
 <div className={`relative flex flex-1 items-center justify-center gap-2 bg-primary/[0.035] p-3 ${index===0?'min-h-40 lg:min-h-72':'h-36'}`}>
 {(index===0?[FILTER,WATER]:[[FILTER],[FILTER],[SAND],[SIPHON]][index]).map((src,i)=><img key={src} src={cardImage(src)} alt="" width={400} height={300} loading="lazy" decoding="async" className={`${index===0?'w-[44%]':'w-full'} max-h-48 object-contain lg:max-h-60 ${index===0&&i===1?'translate-y-4':''}`} />)}
 </div><div className="p-4 sm:p-5"><h3 className="text-base font-bold leading-6 sm:text-xl">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></div>
 </Link>)}
 </div>;
}

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Boxes, CheckCircle2, ShoppingCart } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/cart-context";
import { useShippingFee } from "@/contexts/shipping-fee-context";
import { useLocale } from "@/i18n/locale-context";
import { formatIQD } from "@/lib/utils";
import { getBundleCopy, getBundleItemPurpose } from "@/lib/bundle-copy";
import type { Product } from "@/types";

type BundleItem={
  productId:string;
  variantId:string|null;
  variantLabel:string|null;
  quantity:number;
  required:boolean;
  name:string;
  slug:string;
  price:number|string;
  stock:number|string;
  thumbnail?:string|null;
  hasVariants?:boolean;
};

type Bundle={
  id:string;
  slug:string;
  nameAr:string;
  descriptionAr:string;
  retailSum:number;
  bundlePrice:number;
  inStock:boolean;
  requiresVariantSelection:boolean;
  audienceTag:string|null;
  items:BundleItem[];
};

type ProductResponse={products?:Array<Record<string,unknown>>};

const COPY={
  ar:{
    title:"باقات AQUAVO",
    description:"اختار حسب احتياج حوضك، وشوف شنو مشمول بكل باقة وشنو تسوي كل قطعة قبل ما تضيفها للسلة.",
    note:"عندك بعض القطع؟ تكدر تفتح صفحة أي قطعة وتطلب الباقي وحده.",
    components:"شنو مشمول بالباقة؟",add:"أضف الباقة للسلة",added:"تمت إضافة الباقة",
    unavailable:"بعض القطع غير متوفرة",price:"سعر المكونات",
    available:"القطع المشمولة متوفرة",included:"مشمول",optional:"إضافة اختيارية",quantity:"الكمية",unitPrice:"سعر القطعة",
    optionalNote:"الإضافات الاختيارية مو ضمن زر إضافة الباقة؛ تختارها من صفحة المنتج إذا تحتاجها.",
    allComponents:"سعر كل القطع المعروضة",optionalTotal:"المجموع النهائي يعتمد على القطع اللي تختارها بالسلة.",
    shipping:"توصيل الطلب",total:"مجموع الباقة التقريبي ويه التوصيل",shippingNote:"التوصيل ينحسب مرة وحدة للطلب، حتى لو جمعت أكثر من باقة.",
    help:"ساعدني أتأكد من الاختيار",selectOptions:"حدد الخيارات من صفحات القطع",cart:"شوف السلة",
    productsFailed:"تعذر تحميل تفاصيل القطع. حدّث الصفحة حتى تكدر تضيف الباقة.",
    loading:"جاري تحميل الباقات…",empty:"ماكو باقات متاحة حالياً.",failed:"تعذر تحميل الباقات حالياً.",
  },
  en:{
    title:"AQUAVO Bundles",
    description:"Start with your aquarium's needs. See what each bundle includes and what each item does before adding it to your cart.",
    note:"Already own some of these items? Open any product page to order just the pieces you need.",
    components:"What's included?",add:"Add bundle to cart",added:"Bundle added",
    unavailable:"Some items are unavailable",price:"Component total",
    available:"Included items in stock",included:"Included",optional:"Optional extra",quantity:"Quantity",unitPrice:"Unit price",
    optionalNote:"Optional extras are not added with the bundle button. Choose them on their product pages if you need them.",
    allComponents:"Total for all displayed items",optionalTotal:"Your final total depends on the items you select in your cart.",
    shipping:"Order delivery",total:"Estimated bundle total with delivery",shippingNote:"Delivery is charged once per order, even if you combine several bundles.",
    help:"Help me check my selection",selectOptions:"Choose options on the product pages",cart:"View cart",
    productsFailed:"Item details could not be loaded. Refresh the page to add a bundle.",
    loading:"Loading bundles…",empty:"No bundles are available right now.",failed:"Bundles could not be loaded right now.",
  },
  ckb:{
    title:"پاکێجەکانی AQUAVO",
    description:"بەپێی پێویستی حەوزەکەت هەڵبژێرە. پێش زیادکردن بۆ سەبەتە، بزانە هەر پاکێجێک چی لەخۆدەگرێت و هەر پارچەیەک چی دەکات.",
    note:"هەندێک لە پارچەکانت هەیە؟ پەڕەی بەرهەمەکە بکەرەوە و تەنها ئەوە داوا بکە کە پێویستتە.",
    components:"چی لە پاکێجەکەدایە؟",add:"پاکێجەکە زیاد بکە بۆ سەبەتە",added:"پاکێجەکە زیادکرا",
    unavailable:"هەندێک بەرهەم بەردەست نییە",price:"کۆی نرخی پێکهاتەکان",
    available:"پارچە ناوخۆکان بەردەستن",included:"لە پاکێجەکەدایە",optional:"زیادەی هەڵبژاردەیی",quantity:"ژمارە",unitPrice:"نرخی یەک دانە",
    optionalNote:"زیادە هەڵبژاردەییەکان بە دوگمەی پاکێج زیاد ناکرێن. ئەگەر پێویستت بوون لە پەڕەی بەرهەمەکان هەڵیانبژێرە.",
    allComponents:"کۆی نرخی هەموو پارچە پیشاندراوەکان",optionalTotal:"کۆی کۆتایی بەو پارچانەوە بەستراوە کە لە سەبەتەکەت هەڵیاندەبژێریت.",
    shipping:"گەیاندنی داواکاری",total:"کۆی نزیکەیی پاکێج لەگەڵ گەیاندن",shippingNote:"کرێی گەیاندن تەنها جارێک بۆ هەر داواکارییە، تەنانەت ئەگەر چەند پاکێجێک کۆبکەیتەوە.",
    help:"یارمەتیم بدە لە هەڵبژاردنەکەم دڵنیا بمەوە",selectOptions:"هەڵبژاردەکان لە پەڕەی بەرهەمەکان دیاری بکە",cart:"سەبەتە ببینە",
    productsFailed:"وردەکاری پارچەکان بار نەکران. پەڕەکە نوێ بکەرەوە بۆ زیادکردنی پاکێج.",
    loading:"پاکێجەکان بار دەکرێن…",empty:"ئێستا هیچ پاکێجێک بەردەست نییە.",failed:"ئێستا نەتوانرا پاکێجەکان بار بکرێن.",
  },
} as const;

function toProduct(raw:Record<string,unknown>):Product{
  return {
    ...(raw as unknown as Product),
    id:String(raw.id ?? ""),slug:String(raw.slug ?? ""),name:String(raw.name ?? ""),
    brand:String(raw.brand ?? ""),price:Number(raw.price ?? 0),
    rating:Number(raw.rating ?? 0),reviewCount:Number(raw.reviewCount ?? raw.review_count ?? 0),
    thumbnail:String(raw.thumbnail ?? ""),images:Array.isArray(raw.images)?raw.images.map(String):[],
    stock:Number(raw.stock ?? 0),
    variants:Array.isArray(raw.variants)?raw.variants as Product["variants"]:null,
    hasVariants:Boolean(raw.hasVariants ?? raw.has_variants),
  };
}

function productForBundleItem(base:Product,item:BundleItem):Product|null{
  if(!item.variantId) return base;
  const variant=base.variants?.find((candidate)=>candidate.id===item.variantId);
  if(!variant || Number(variant.price)<=0 || Number(variant.stock)<=0) return null;
  return {
    ...base,
    price:Number(variant.price),
    stock:Number(variant.stock),
    _variantId:variant.id,
    _variantLabel:variant.label,
  } as Product;
}

export default function BundlesPage(){
  const {locale,dir,intl}=useLocale();
  const t=COPY[locale];
  const {addItem,addItems}=useCart();
  const shippingFee=useShippingFee();
  const [adding,setAdding]=useState<string|null>(null);
  const [added,setAdded]=useState<string|null>(null);

  const bundles=useQuery<Bundle[]>({
    queryKey:["growth-bundles",locale],
    queryFn:async()=>{
      const response=await fetch("/api/growth/bundles",{credentials:"include"});
      if(!response.ok) throw new Error("bundles_failed");
      return response.json();
    },
  });
  const products=useQuery<ProductResponse>({
    queryKey:["growth-bundle-products",locale],
    queryFn:async()=>{
      const response=await fetch("/api/products?limit=500",{credentials:"include",headers:{"x-locale":locale}});
      if(!response.ok) throw new Error("products_failed");
      return response.json();
    },
  });

  const productMap=useMemo(()=>{
    const map=new Map<string,Product>();
    for(const raw of products.data?.products ?? []){
      const product=toProduct(raw);
      if(product.id) map.set(product.id,product);
    }
    return map;
  },[products.data]);

  useEffect(()=>{
    const target=window.location.hash.slice(1);
    if(!bundles.data?.some((bundle)=>bundle.slug===target)) return;
    const frame=window.requestAnimationFrame(()=>{
      const card=document.getElementById(target);
      card?.scrollIntoView({block:"start"});
      card?.focus({preventScroll:true});
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[bundles.data]);

  const addBundle=async(bundle:Bundle)=>{
    if(!bundle.inStock || bundle.requiresVariantSelection || adding) return;
    const required=bundle.items.filter((item)=>item.required);
    const resolved:Array<{product:Product;quantity:number}>=[];
    for(const item of required){
      const base=productMap.get(item.productId);
      const product=base?productForBundleItem(base,item):null;
      const quantity=Number(item.quantity);
      if(!product||!Number.isSafeInteger(quantity)||quantity<1||Number(product.stock)<quantity) return;
      resolved.push({product,quantity});
    }
    if(resolved.length===0) return;

    setAdding(bundle.id);
    try{
      let count=0;
      if(resolved.every((item)=>item.quantity===1)){
        count=await addItems(resolved.map((item)=>item.product));
      }else{
        for(const item of resolved){
          if(await addItem(item.product,item.quantity)) count+=1;
        }
      }
      if(count===resolved.length){
        setAdded(bundle.id);
        window.setTimeout(()=>setAdded((current)=>current===bundle.id?null:current),2500);
      }
    }finally{setAdding(null);}
  };

  return (
    <>
      <MetaTags title={t.title} description={t.description}/>
      <main id="main-content" dir={dir} className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
            <Boxes className="h-4 w-4"/> AQUAVO
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-3 text-base leading-8 text-muted-foreground">{t.description}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{t.note}</p>
        </section>

        {bundles.isLoading && <p className="py-12 text-center text-muted-foreground">{t.loading}</p>}
        {bundles.error && <p className="py-12 text-center text-destructive">{t.failed}</p>}
        {products.error && <p className="mb-6 text-sm text-destructive" role="status">{t.productsFailed}</p>}
        {!bundles.isLoading&&!bundles.error&&(bundles.data?.length ?? 0)===0&&(
          <p className="py-12 text-center text-muted-foreground">{t.empty}</p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {bundles.data?.map((bundle)=>{
            const localized=getBundleCopy(bundle.slug,locale,bundle.nameAr,bundle.descriptionAr);
            const hasOptional=bundle.items.some((item)=>!item.required);
            return (
              <Card key={bundle.id} id={bundle.slug} tabIndex={-1} aria-labelledby={bundle.slug+"-title"} className="scroll-mt-28 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle id={bundle.slug+"-title"} role="heading" aria-level={2} className="text-xl">{localized.name}</CardTitle>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{localized.description}</p>
                      {localized.scope&&<p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium leading-6">{localized.scope}</p>}
                    </div>
                    <Badge variant={bundle.inStock?"default":"secondary"}>
                      {bundle.inStock?t.available:t.unavailable}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <h3 className="text-sm font-bold">{t.components}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bundle.items.map((item)=>{
                      const base=productMap.get(item.productId);
                      const variant=base?.variants?.find((candidate)=>candidate.id===item.variantId);
                      const purpose=getBundleItemPurpose(item.productId,locale);
                      const variantLabel=variant?.label ?? item.variantLabel;
                      return (
                        <Link key={item.productId+"::"+(item.variantId ?? "")} href={"/products/"+item.slug}
                          className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {item.thumbnail?<img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy"/>:null}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold">{base?.name ?? item.name}</p>
                            {purpose&&<p className="mt-1 text-xs leading-5 text-muted-foreground">{purpose}</p>}
                            {variantLabel&&<p className="mt-1 text-xs font-medium">{variantLabel}</p>}
                            <p className="mt-2 text-xs text-muted-foreground">{t.quantity}: <bdi>{new Intl.NumberFormat(intl).format(item.quantity)}</bdi> · {item.required?t.included:t.optional}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t.unitPrice}: <bdi>{formatIQD(Number(variant?.price ?? base?.price ?? item.price ?? 0))}</bdi></p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  {hasOptional&&<p className="text-xs leading-6 text-muted-foreground">{t.optionalNote}</p>}
                  {localized.fitNote&&(
                    <div className="rounded-xl bg-muted/50 p-3 text-sm leading-7">
                      <p>{localized.fitNote}</p>
                      {localized.installationNote&&<p className="mt-2 text-xs leading-6 text-muted-foreground">{localized.installationNote}</p>}
                      <Link href="/contact" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t.help}</Link>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <dl className="w-full space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{hasOptional?t.allComponents:t.price}</dt><dd className="font-semibold"><bdi>{formatIQD(bundle.bundlePrice)}</bdi></dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.shipping}</dt><dd><bdi>{formatIQD(shippingFee)}</bdi></dd></div>
                      {!hasOptional&&<div className="flex flex-wrap justify-between gap-3 border-t pt-2"><dt className="font-medium">{t.total}</dt><dd className="text-lg font-bold text-primary"><bdi>{formatIQD(Number(bundle.bundlePrice)+shippingFee)}</bdi></dd></div>}
                    </dl>
                    <p className="w-full text-xs leading-6 text-muted-foreground">{hasOptional?t.optionalTotal:t.shippingNote}</p>
                    <Button onClick={()=>void addBundle(bundle)}
                      disabled={!bundle.inStock||bundle.requiresVariantSelection||Boolean(adding)||products.isLoading||products.isError}>
                      {added===bundle.id?<CheckCircle2 className="me-2 h-4 w-4"/>:<ShoppingCart className="me-2 h-4 w-4"/>}
                      {added===bundle.id?t.added:bundle.requiresVariantSelection?t.selectOptions:bundle.inStock?t.add:t.unavailable}
                    </Button>
                    {added===bundle.id&&<Link href="/cart" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t.cart}</Link>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}

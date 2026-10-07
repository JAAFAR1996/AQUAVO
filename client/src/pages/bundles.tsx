import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Boxes, CheckCircle2, ShoppingCart } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/cart-context";
import { useLocale } from "@/i18n/locale-context";
import { formatIQD } from "@/lib/utils";
import { getBundleCopy } from "@/lib/bundle-copy";
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
    description:"احتياج واحد، قطع تشتغل ويه بعض، وطلب واحد. رسوم التوصيل ثابتة للطلب، فنجمع القطع اللي تحتاجها فعلاً بدل طلب كل قطعة وحدها.",
    note:"ما نحسب خصم أو توفير إلا إذا السعر فعلاً أقل من مجموع القطع.",
    components:"المكونات",add:"أضف الباقة للسلة",added:"تمت إضافة الباقة",
    unavailable:"بعض القطع غير متوفرة",price:"سعر المكونات",
    loading:"جاري تحميل الباقات…",empty:"ماكو باقات متاحة حالياً.",failed:"تعذر تحميل الباقات حالياً.",
  },
  en:{
    title:"AQUAVO Bundles",
    description:"One need, compatible parts, one order. The delivery fee is charged per order, so each set groups items you genuinely use together instead of ordering them one by one.",
    note:"We only show a saving when the bundle price is genuinely lower than the component total.",
    components:"Components",add:"Add bundle to cart",added:"Bundle added",
    unavailable:"Some items are unavailable",price:"Component total",
    loading:"Loading bundles…",empty:"No bundles are available right now.",failed:"Bundles could not be loaded right now.",
  },
  ckb:{
    title:"پاکێجەکانی AQUAVO",
    description:"یەک پێویستی، پارچەی گونجاو و یەک داواکاری. کرێی گەیاندن بۆ هەر داواکارییە، بۆیە پاکێجەکە تەنها ئەو شتانە کۆدەکاتەوە کە پێکەوە بەکاریان دەهێنیت.",
    note:"تەنها کاتێک قازانج پیشان دەدەین کە نرخی پاکێجەکە بەڕاستی لە کۆی پارچەکان کەمتر بێت.",
    components:"پێکهاتەکان",add:"پاکێجەکە زیاد بکە بۆ سەبەتە",added:"پاکێجەکە زیادکرا",
    unavailable:"هەندێک بەرهەم بەردەست نییە",price:"کۆی نرخی پێکهاتەکان",
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
  const {locale}=useLocale();
  const t=COPY[locale];
  const {addItems}=useCart();
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

  const addBundle=async(bundle:Bundle)=>{
    if(!bundle.inStock || bundle.requiresVariantSelection || adding) return;
    const required=bundle.items.filter((item)=>item.required);
    const resolved=required
      .map((item)=>{
        const base=productMap.get(item.productId);
        return base?productForBundleItem(base,item):null;
      })
      .filter((item):item is Product=>Boolean(item));
    if(resolved.length!==required.length) return;

    setAdding(bundle.id);
    try{
      const count=await addItems(resolved);
      if(count===resolved.length){
        setAdded(bundle.id);
        window.setTimeout(()=>setAdded((current)=>current===bundle.id?null:current),2500);
      }
    }finally{setAdding(null);}
  };

  return (
    <>
      <MetaTags title={t.title} description={t.description}/>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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
        {!bundles.isLoading&&!bundles.error&&(bundles.data?.length ?? 0)===0&&(
          <p className="py-12 text-center text-muted-foreground">{t.empty}</p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {bundles.data?.map((bundle)=>{
            const localized=getBundleCopy(bundle.slug,locale,bundle.nameAr,bundle.descriptionAr);
            return (
              <Card key={bundle.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{localized.name}</CardTitle>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{localized.description}</p>
                    </div>
                    <Badge variant={bundle.inStock?"default":"secondary"}>
                      {bundle.inStock?t.components+" ✓":t.unavailable}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bundle.items.map((item)=>{
                      const base=productMap.get(item.productId);
                      const variant=base?.variants?.find((candidate)=>candidate.id===item.variantId);
                      return (
                        <Link key={item.productId+"::"+(item.variantId ?? "")} href={"/products/"+item.slug}
                          className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {item.thumbnail?<img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy"/>:null}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold">{base?.name ?? item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {variant?.label?variant.label+" · ":""}{formatIQD(Number(variant?.price ?? base?.price ?? item.price ?? 0))}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div><p className="text-xs text-muted-foreground">{t.price}</p><p className="text-xl font-bold">{formatIQD(bundle.bundlePrice)}</p></div>
                    <Button onClick={()=>void addBundle(bundle)}
                      disabled={!bundle.inStock||bundle.requiresVariantSelection||adding===bundle.id||products.isLoading}>
                      {added===bundle.id?<CheckCircle2 className="me-2 h-4 w-4"/>:<ShoppingCart className="me-2 h-4 w-4"/>}
                      {added===bundle.id?t.added:bundle.inStock?t.add:t.unavailable}
                    </Button>
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

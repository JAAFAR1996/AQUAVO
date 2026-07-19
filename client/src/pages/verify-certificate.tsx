import { useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, FileCheck2, Maximize2, Minus, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { Link, useParams } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const CERTIFICATE_IMAGE = "/certificates/yee-certificate.jpg";
const CERTIFICATE_PDF = "/certificates/yee-certificate.pdf";
const CERTIFICATE_ALT = "وثيقة أصالة YEE الموردة إلى AQUAVO العراق";

function CertificateViewer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [zoom, setZoom] = useState(1);
  const zoomPercent = Math.round(zoom * 100);

  const updateOpen = (nextOpen: boolean) => {
    if (!nextOpen) setZoom(1);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={updateOpen}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden border-border bg-background p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 pr-12" dir="rtl">
          <DialogTitle className="text-base font-bold sm:text-lg">عرض وثيقة YEE</DialogTitle>
          <DialogDescription className="sr-only">كبّر أو صغّر صورة الوثيقة، واضغط Escape حتى تغلق العرض.</DialogDescription>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="تكبير الشهادة"
              disabled={zoom >= 2}
              onClick={() => setZoom((current) => Math.min(2, current + 0.25))}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <output className="min-w-12 text-center text-sm font-bold" aria-live="polite">{zoomPercent}%</output>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="تصغير الشهادة"
              disabled={zoom <= 0.75}
              onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="إرجاع الحجم" onClick={() => setZoom(1)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#e8ecee] p-4 sm:p-8" tabIndex={0}>
          <img
            src={CERTIFICATE_IMAGE}
            alt={CERTIFICATE_ALT}
            width={1240}
            height={1754}
            className="aq-proof-window mx-auto block h-auto max-w-none bg-card shadow-xl transition-transform duration-150"
            style={{ width: `${Math.round(680 * zoom)}px` }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VerifyCertificate() {
  const { id } = useParams<{ id: string }>();
  const [viewerOpen, setViewerOpen] = useState(false);
  const isYeeDocument = id?.toLowerCase() === "yee";

  if (!isYeeDocument) {
    return (
      <div className="flex-1 bg-background text-foreground" dir="rtl">
        <main id="main-content" className="mx-auto max-w-3xl px-4 pb-20 pt-32 text-center">
          <h1 className="text-3xl font-bold">الوثيقة مو موجودة</h1>
          <p className="mt-4 text-muted-foreground">الرابط اللي فتحته ما يطابق وثيقة منشورة من AQUAVO.</p>
          <Link href="/products" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-white">
            ارجع للمتجر
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags
        title="وثيقة أصالة منتجات YEE"
        description="عرض الوثيقة الصادرة من Weifang Yipin Pet Products إلى AQUAVO العراق بخصوص أصالة منتجات YEE الموردة."
      />

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            إثبات خاص بعلامة YEE
          </p>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-5xl">وثيقة أصالة منتجات YEE</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            الوثيقة الصادرة من Weifang Yipin Pet Products تنص أن منتجات YEE الموردة إلى AQUAVO العراق أصلية 100%.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            هذا الإثبات خاص بمنتجات YEE المذكورة بالوثيقة. مو ضمان AQUAVO، وما يشمل باقي العلامات أو المنتجات تلقائياً.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start">
          <section aria-labelledby="document-preview-title" className="overflow-hidden rounded-2xl border border-border bg-card/60">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="document-preview-title" className="font-bold">نسخة الوثيقة</h2>
                <p className="mt-1 text-xs text-muted-foreground">اضغط على الصورة حتى تفتحها بحجم أكبر</p>
              </div>
              <Maximize2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <button
              type="button"
              className="aq-evidence-anchor block w-full bg-[#e8ecee] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6"
              onClick={() => setViewerOpen(true)}
              aria-label="افتح الشهادة بحجم أكبر"
            >
              <img
                src={CERTIFICATE_IMAGE}
                alt={CERTIFICATE_ALT}
                width={1240}
                height={1754}
                className="aq-proof-window mx-auto h-auto w-full max-w-2xl bg-card shadow-lg"
                decoding="async"
              />
            </button>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6" aria-labelledby="document-facts-title">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="document-facts-title" className="font-bold">المعلومات الظاهرة بالوثيقة</h2>
                  <p className="mt-1 text-xs text-muted-foreground">من نفس الملف المنشور، بدون رقم تحقق مخترع</p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-border text-sm">
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">الجهة المصدرة</dt>
                  <dd className="font-semibold" dir="ltr">Weifang Yipin Pet Products Co., Ltd.</dd>
                </div>
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">الجهة المستلمة</dt>
                  <dd className="font-semibold" dir="ltr">AQUAVO, Iraq</dd>
                </div>
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">تاريخ الوثيقة</dt>
                  <dd className="flex items-center gap-2 font-semibold">
                    <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                    14 كانون الثاني 2026
                  </dd>
                </div>
              </dl>
            </section>

            <div className="grid gap-3">
              <a
                href={CERTIFICATE_PDF}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                افتح ملف PDF
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-bold hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                ارجع للمتجر
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <CertificateViewer open={viewerOpen} onOpenChange={setViewerOpen} />
    </div>
  );
}

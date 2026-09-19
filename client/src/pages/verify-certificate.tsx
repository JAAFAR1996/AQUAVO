import { useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, FileCheck2, Maximize2, Minus, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { Link, useParams } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const CERTIFICATE_IMAGE = "/certificates/yee-certificate.jpg";
const CERTIFICATE_PDF = "/certificates/yee-certificate.pdf";
const CERTIFICATE_ALT = i18next.t("account:verify-certificate.s1");

function CertificateViewer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("account");
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
          <DialogTitle className="text-base font-bold sm:text-lg">{t("verify-certificate.s2")}</DialogTitle>
          <DialogDescription className="sr-only">{t("verify-certificate.s3")}</DialogDescription>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={t("verify-certificate.s4")}
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
              aria-label={t("verify-certificate.s5")}
              disabled={zoom <= 0.75}
              onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label={t("verify-certificate.s6")} onClick={() => setZoom(1)}>
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
  const { t } = useTranslation("account");
  const { id } = useParams<{ id: string }>();
  const [viewerOpen, setViewerOpen] = useState(false);
  const isYeeDocument = id?.toLowerCase() === "yee";

  if (!isYeeDocument) {
    return (
      <div className="flex-1 bg-background text-foreground" dir="rtl">
        <main id="main-content" className="mx-auto max-w-3xl px-4 pb-20 pt-32 text-center">
          <h1 className="text-3xl font-bold">{t("verify-certificate.s7")}</h1>
          <p className="mt-4 text-muted-foreground">{t("verify-certificate.s8")}</p>
          <Link href="/products" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-white">
            {t("verify-certificate.s9")}
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags
        title={t("verify-certificate.s10")}
        description={t("verify-certificate.s11")}
      />

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("verify-certificate.s12")}
          </p>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-5xl">{t("verify-certificate.s10")}</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            {t("verify-certificate.s13")}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t("verify-certificate.s14")}
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start">
          <section aria-labelledby="document-preview-title" className="overflow-hidden rounded-2xl border border-border bg-card/60">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="document-preview-title" className="font-bold">{t("verify-certificate.s15")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("verify-certificate.s16")}</p>
              </div>
              <Maximize2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <button
              type="button"
              className="aq-evidence-anchor block w-full bg-[#e8ecee] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6"
              onClick={() => setViewerOpen(true)}
              aria-label={t("verify-certificate.s17")}
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
                  <h2 id="document-facts-title" className="font-bold">{t("verify-certificate.s18")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("verify-certificate.s19")}</p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-border text-sm">
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">{t("verify-certificate.s20")}</dt>
                  <dd className="font-semibold" dir="ltr">Weifang Yipin Pet Products Co., Ltd.</dd>
                </div>
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">{t("verify-certificate.s21")}</dt>
                  <dd className="font-semibold" dir="ltr">AQUAVO, Iraq</dd>
                </div>
                <div className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]">
                  <dt className="text-muted-foreground">{t("verify-certificate.s22")}</dt>
                  <dd className="flex items-center gap-2 font-semibold">
                    <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("verify-certificate.s23")}
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
                {t("verify-certificate.s24")}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-bold hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("verify-certificate.s9")}
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

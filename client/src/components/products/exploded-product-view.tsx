import type { VerifiedExternalAnnotations } from "@/lib/verified-external-annotations";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ExplodedProductViewProps {
    product: Product;
    annotations?: VerifiedExternalAnnotations;
}

/** A photo annotation, not an invented cutaway: only supplied part data is shown. */
export function ExplodedProductView({ product, annotations }: ExplodedProductViewProps) {
    const { t, i18n } = useTranslation("products");
    const instanceId = useId();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const parts = annotations?.parts ?? product.explodedViewParts ?? [];
    const photo = annotations?.imageUrl || product.image || product.thumbnail || product.images?.[0];
    const arabic = i18n.language?.startsWith("ar");
    if (parts.length === 0) return null;

    return (
        <section aria-labelledby={`${instanceId}-title`} className="rounded-3xl border border-border bg-background p-4 text-foreground sm:p-6">
            <h3 id={`${instanceId}-title`} className="mb-5 text-xl font-bold">
                {annotations?.title ?? t("anatomy.title", { defaultValue: arabic ? "تعرّف على أجزاء المنتج" : "Explore the product parts" })}
            </h3>
            {annotations && <p className="mb-5 text-sm leading-7 text-muted-foreground">{annotations.note} {annotations.sourceLabel}</p>}
            <div className="grid gap-6 md:grid-cols-2">
                <div className={cn("relative self-start overflow-hidden rounded-2xl border border-border bg-card", !annotations && "aspect-square md:aspect-video")} style={annotations ? { aspectRatio: `${annotations.imageWidth}/${annotations.imageHeight}` } : undefined}>
                    {photo && failedImage !== photo ? (
                        <img src={photo} alt={product.name} width={annotations?.imageWidth} height={annotations?.imageHeight} className={cn("absolute inset-0 h-full w-full object-contain", !annotations && "p-8")} loading="lazy" decoding="async" onError={() => setFailedImage(photo)} />
                    ) : (
                        <p className="p-8 text-center text-muted-foreground">{t("anatomy.photoUnavailable", { defaultValue: arabic ? "صورة المنتج مو متوفرة" : "Product photo unavailable" })}</p>
                    )}
                    {photo && failedImage !== photo && parts.map((part, index) => {
                        // Preserve the original square/video annotation frame and padded photo.
                        // Physical photo coordinates are deliberately not mirrored in RTL.
                        if (!Number.isFinite(part.x) || !Number.isFinite(part.y) || part.x! < 0 || part.x! > 100 || part.y! < 0 || part.y! > 100) return null;
                        return (
                            <button key={part.id} type="button" aria-label={`${index + 1}. ${part.name}`} aria-controls={`${instanceId}-part-${index}`} aria-pressed={selectedId === part.id}
                                onClick={() => setSelectedId(part.id)}
                                style={{ left: `clamp(22px, ${part.x}%, calc(100% - 22px))`, top: `clamp(22px, ${part.y}%, calc(100% - 22px))`, transform: "translate(-50%, -50%)" }}
                                className={cn("absolute flex h-11 w-11 items-center justify-center rounded-full border-2 border-background font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", selectedId === part.id ? "bg-primary text-primary-foreground" : "bg-foreground text-background")}>
                                {index + 1}
                            </button>
                        );
                    })}
                </div>
                <ol className="space-y-3">
                    {parts.map((part, index) => (
                        <li key={part.id} id={`${instanceId}-part-${index}`} className={cn("rounded-2xl border p-4", selectedId === part.id ? "border-primary bg-primary/5" : "border-border bg-card")}>
                            <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-pressed={selectedId === part.id} onClick={() => setSelectedId(part.id)}>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>
                                <span className="font-semibold">{part.name}</span>
                            </button>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{part.description}</p>
                            {part.imageUrl && <img src={part.imageUrl} alt={part.name} className="mt-3 h-20 w-20 rounded-lg object-contain" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true; }} />}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Info, PackageSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FitCandidate } from "@shared/tank-compatibility";
import type { WizardData } from "@/types/journey";
import { filterJourneyFitGroups, normalizeWizardData } from "./utils";
import { JourneySupport } from "./journey-support";

const candidateSchema = z.object({
    productId: z.string(), name: z.string(), slug: z.string().nullable(), category: z.string().nullable(),
    price: z.number().finite().nullable(), variantId: z.string().nullable(), variantLabel: z.string().nullable(),
    inStock: z.boolean(), range: z.object({ minL: z.number().nullable(), maxL: z.number().nullable() }).nullable(),
    confidence: z.enum(["VERIFIED", "PARTIAL", "NONE"]),
    verdict: z.enum(["FITS", "TOO_SMALL_FOR_TANK", "TOO_LARGE_FOR_TANK"]).nullable(),
    evidence: z.string().nullable(), evidenceKey: z.string().nullable(),
    // Older responses without equipment identity cannot establish the selected approach.
    filterType: z.enum(["hob", "canister", "sponge", "internal"]).nullable().optional().default(null),
    heaterWattage: z.number().nullable().optional().default(null),
    isHeater: z.boolean().optional().default(false),
});
const fitResponseSchema = z.object({
    litres: z.number().finite(),
    groups: z.array(z.object({
        category: z.string(), fits: z.array(candidateSchema),
        ratedButUnsuitable: z.array(candidateSchema), noSizeEvidence: z.array(candidateSchema),
    })),
});

function ProductLine({ candidate, tone }: { candidate: FitCandidate; tone: "fit" | "unknown" | "excluded" }) {
    const { t } = useTranslation("tools");
    const href = `/products/${encodeURIComponent(candidate.slug || candidate.productId)}`;
    return (
        <Link href={href} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3 text-start transition-colors hover:border-primary/50">
            <span className="min-w-0 flex-1 basis-48">
                <span className="block text-sm font-bold text-foreground">
                    {candidate.name}
                    {candidate.variantLabel && <span className="text-primary"> — {candidate.variantLabel}</span>}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                    {candidate.evidence || t("tank-fit.s2")}
                </span>
                <span className="mt-1 block text-xs text-primary">{t("tank-fit.reviewProduct")}</span>
            </span>
            <span className="shrink-0">
                {candidate.price !== null && candidate.price > 0 && (
                    <span className="block text-xs font-bold text-foreground">{t("tank-fit.s1", { v0: candidate.price.toLocaleString("en-US") })}</span>
                )}
                <Badge variant="outline" className="mt-1 whitespace-normal text-start">
                    {t(tone === "fit" ? "tank-fit.s3" : tone === "excluded" ? "tank-fit.excluded" : "tank-fit.s4")}
                </Badge>
            </span>
        </Link>
    );
}

export function TankFit({ litres, wizardData, showSupport = true }: { litres: number; wizardData?: WizardData; showSupport?: boolean }) {
    const { t } = useTranslation("tools");
    const enabled = Number.isFinite(litres) && litres >= 10 && litres <= 2000;
    const support = showSupport ? <JourneySupport wizardData={wizardData ?? normalizeWizardData({ tankLiters: litres })} /> : null;
    const { data, isLoading, isError } = useQuery({
        queryKey: ["products", "fit", litres],
        queryFn: async () => {
            const response = await fetch(`/api/products/fit?litres=${litres}`);
            if (!response.ok) throw new Error("Fit request failed");
            const result = fitResponseSchema.parse(await response.json());
            if (result.litres !== litres) throw new Error("Fit response volume mismatch");
            return result;
        },
        enabled, staleTime: 5 * 60 * 1000, retry: false,
    });

    if (!enabled || isError || isLoading || !data) {
        return (
            <div className="space-y-3">
                <p className="rounded-xl border border-dashed border-border p-4 text-start text-sm text-muted-foreground" role="status">
                    {t(!enabled ? "tank-fit.s5" : isError ? "tank-fit.s6" : "tank-fit.s7")}
                </p>
                {support}
            </div>
        );
    }

    const groups = filterJourneyFitGroups(data.groups, wizardData);
    const anyFit = groups.some((group) => group.fits.length > 0);

    return (
        <div className="space-y-4 text-start" data-testid="journey-tank-fit">
            <h3 className="flex items-start gap-2 font-bold text-foreground">
                <PackageSearch className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {t("tank-fit.heading", { litres })}
            </h3>
            <p className="text-sm text-muted-foreground">{t("tank-fit.selectionScope")}</p>

            {!anyFit && <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">{t("tank-fit.noMatch", { litres })}</p>}

            {groups.map((group) => (
                <section key={group.category} className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">
                        {t(group.category === "التحكم بالحرارة" ? "journey-summary.s19" : "journey-summary.s18")}
                    </h4>
                    {group.fits.map((candidate) => <ProductLine key={`${candidate.productId}:${candidate.variantId ?? "-"}`} candidate={candidate} tone="fit" />)}
                    {group.noSizeEvidence.length > 0 && (
                        <details className="rounded-lg border border-border p-3" open={group.fits.length === 0}>
                            <summary className="cursor-pointer text-sm text-muted-foreground">{t("tank-fit.unknownCount", { count: group.noSizeEvidence.length })}</summary>
                            <p className="mt-2 text-xs text-muted-foreground">{t("tank-fit.s12")}</p>
                            <div className="mt-2 space-y-2">
                                {group.noSizeEvidence.slice(0, 6).map((candidate) => <ProductLine key={`${candidate.productId}:${candidate.variantId ?? "-"}`} candidate={candidate} tone="unknown" />)}
                            </div>
                        </details>
                    )}
                    {group.ratedButUnsuitable.length > 0 && (
                        <details className="rounded-lg border border-border/60 p-3">
                            <summary className="cursor-pointer text-xs text-muted-foreground">{t("tank-fit.excludedCount", { count: group.ratedButUnsuitable.length })}</summary>
                            <div className="mt-2 space-y-2">
                                {group.ratedButUnsuitable.slice(0, 4).map((candidate) => <ProductLine key={`${candidate.productId}:${candidate.variantId ?? "-"}`} candidate={candidate} tone="excluded" />)}
                            </div>
                        </details>
                    )}
                </section>
            ))}

            <div className="flex items-start gap-2 rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{t("tank-fit.limitation")}</p>
            </div>
            {support}
        </div>
    );
}

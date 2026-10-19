import type { ReactNode } from "react";
import { Link } from "wouter";
import { ClipboardList, Filter, Fish, MapPin, Mountain, Package, Printer, RotateCcw, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WizardData } from "@/types/journey";
import type { Product } from "@/types";
import type { FoodFilter } from "@shared/food-choice";
import { journeyLabel, journeySpeciesNames, missingJourneyDecisions, normalizeWizardData } from "./utils";
import { JourneySupport } from "./journey-support";
import { TankFit } from "./tank-fit";

interface JourneySummaryProps {
    wizardData: WizardData;
    products?: Product[];
    onReset?: () => void;
    onSave?: () => void;
    isSaving?: boolean;
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
    return <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{children}</dd></div>;
}

// These links organize food by an explicitly selected species. They do not certify an SKU's diet.
type JourneyFoodFilter = Extract<FoodFilter, "betta" | "goldfish" | "small-fish" | "shrimp">;
const SPECIES_FOOD_FILTER: Partial<Record<string, JourneyFoodFilter>> = {
    betta: "betta", "common-goldfish": "goldfish", oranda: "goldfish", ranchu: "goldfish",
    guppy: "small-fish", "neon-tetra": "small-fish", "cardinal-tetra": "small-fish", "harlequin-rasbora": "small-fish",
    "cherry-shrimp": "shrimp", "amano-shrimp": "shrimp",
};

const LOCATION_LABELS: Partial<Record<string, "location-setup.s4" | "location-setup.s6" | "location-setup.s8" | "location-setup.s10" | "location-setup.s12" | "location-setup.s14">> = {
    "away-from-sunlight": "location-setup.s4", "stable-surface": "location-setup.s6",
    "near-power": "location-setup.s8", "quiet-area": "location-setup.s10",
    "easy-access": "location-setup.s12", "away-from-hvac": "location-setup.s14",
};

export function JourneySummary({ wizardData, onReset, onSave, isSaving }: JourneySummaryProps) {
    const { t, i18n } = useTranslation("tools");
    const data = normalizeWizardData(wizardData);
    const missing = missingJourneyDecisions(data);
    const species = journeySpeciesNames(data, i18n.language);
    const foodFilters = [...new Set(data.selectedSpecies.map((id) => SPECIES_FOOD_FILTER[id]).filter((value): value is JourneyFoodFilter => !!value))];
    const unknown = t("journey-labels.unknown");
    const dimensions = [data.tankLengthCm, data.tankWidthCm, data.tankHeightCm]
        .map((value) => typeof value === "number" && value > 0 ? String(value) : unknown).join(" × ");

    return (
        <Card className="border-2">
            <CardContent className="space-y-8 p-6 text-start md:p-8">
                <header className="space-y-3">
                    <ClipboardList className="h-9 w-9 text-primary" aria-hidden="true" />
                    <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("journey-review.title")}</h2>
                    <p className="text-lg text-muted-foreground">{t("journey-review.intro")}</p>
                </header>

                <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <h3 className="font-bold">{t("journey-review.recorded", { count: 9 - missing.length, total: 9 })}</h3>
                    <p className="text-sm text-muted-foreground">{t(missing.length ? "journey-review.missingIntro" : "journey-review.allRecorded")}</p>
                    {missing.length > 0 && <ul className="flex flex-wrap gap-2">{missing.map((key) => <li key={key}><Badge variant="outline">{t(`journey-review.missing.${key}`)}</Badge></li>)}</ul>}
                    <p className="text-xs text-muted-foreground">{t("journey-review.editHint")}</p>
                </section>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="journey-recorded-answers">
                    <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
                        <h3 className="flex items-center gap-2 font-bold"><Package className="h-5 w-5 text-primary" aria-hidden="true" />{t("journey-summary.s5")}</h3>
                        <dl className="space-y-2">
                            <SummaryRow label={t("journey-summary.s6")}>{data.tankLiters > 0 ? t("journey-summary.s7", { v0: data.tankLiters }) : unknown}</SummaryRow>
                            <SummaryRow label={t("journey-review.sizePreset")}>{journeyLabel(t, "tankSize", data.tankSize)}</SummaryRow>
                            <SummaryRow label={t("journey-summary.s12")}>{journeyLabel(t, "tankType", data.tankType)}</SummaryRow>
                            <SummaryRow label={t("journey-review.waterSource")}>{journeyLabel(t, "waterSource", data.waterSource)}</SummaryRow>
                            <SummaryRow label={t("journey-review.cyclingMethod")}>{journeyLabel(t, "cyclingMethod", data.cyclingMethod)}</SummaryRow>
                        </dl>
                        <p className="text-sm">{t("journey-review.dimensions", { value: dimensions })}</p>
                    </section>
                    <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
                        <h3 className="flex items-center gap-2 font-bold"><Filter className="h-5 w-5 text-primary" aria-hidden="true" />{t("journey-summary.s17")}</h3>
                        <dl className="space-y-2">
                            <SummaryRow label={t("journey-summary.s18")}>{journeyLabel(t, "filterType", data.filterType)}</SummaryRow>
                            <SummaryRow label={t("journey-summary.s19")}>{data.heaterWattage > 0 ? t("journey-review.selectedWattage", { value: data.heaterWattage }) : unknown}</SummaryRow>
                            <SummaryRow label={t("journey-summary.s22")}>{journeyLabel(t, "lightingType", data.lightingType)}</SummaryRow>
                        </dl>
                    </section>
                    <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
                        <h3 className="flex items-center gap-2 font-bold"><Mountain className="h-5 w-5 text-primary" aria-hidden="true" />{t("journey-summary.s24")}</h3>
                        <dl className="space-y-2"><SummaryRow label={t("journey-summary.s25")}>{journeyLabel(t, "substrateType", data.substrateType)}</SummaryRow></dl>
                        <div className="flex flex-wrap gap-2">
                            {data.decorations.length ? data.decorations.map((value) => <Badge key={value} variant="outline">{journeyLabel(t, "decorations", value)}</Badge>) : <span className="text-sm text-muted-foreground">{unknown}</span>}
                        </div>
                    </section>
                    <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
                        <h3 className="flex items-center gap-2 font-bold"><Fish className="h-5 w-5 text-primary" aria-hidden="true" />{t("journey-summary.s27")}</h3>
                        <dl className="space-y-2"><SummaryRow label={t("journey-summary.s28")}>{journeyLabel(t, "stockingLevel", data.stockingLevel)}</SummaryRow></dl>
                        <p className="text-sm text-muted-foreground">{t("journey-summary.s29")}</p>
                        <div className="flex flex-wrap gap-2">{species.length ? species.map((name) => <Badge key={name} variant="outline">{name}</Badge>) : <span className="text-sm text-muted-foreground">{unknown}</span>}</div>
                        <p className="text-sm text-muted-foreground">{t("journey-review.fishGroups")}</p>
                        <div className="flex flex-wrap gap-2">{data.fishTypes.length ? data.fishTypes.map((value) => <Badge key={value} variant="outline">{journeyLabel(t, "fishTypes", value)}</Badge>) : <span className="text-sm text-muted-foreground">{unknown}</span>}</div>
                        <p className="text-xs text-muted-foreground">{t("journey-review.livestockScope")}</p>
                    </section>
                    <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-4 md:col-span-2">
                        <h3 className="flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-primary" aria-hidden="true" />{t("journey-review.locationAndCare")}</h3>
                        <p className="text-sm text-muted-foreground">{t("location-setup.s3")}</p>
                        <div className="flex flex-wrap gap-2">
                            {data.location.length ? data.location.map((value) => <Badge key={value} variant="outline">{LOCATION_LABELS[value] ? t(LOCATION_LABELS[value]) : unknown}</Badge>) : <span className="text-sm text-muted-foreground">{unknown}</span>}
                        </div>
                        <dl><SummaryRow label={t("journey-review.maintenancePreference")}>{journeyLabel(t, "maintenancePreference", data.maintenancePreference)}</SummaryRow></dl>
                    </section>
                </div>

                <TankFit litres={data.tankLiters} wizardData={data} showSupport={false} />

                {data.filterType === "sponge" && <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">{t("equipment-selection.spongeRequirements")}</p>}

                <section className="space-y-3">
                    <h3 className="text-xl font-bold">{t("journey-review.foodTitle")}</h3>
                    <p className="text-sm text-muted-foreground">{t("journey-review.foodBody")}</p>
                    <div className="flex flex-wrap gap-2">
                        {foodFilters.map((filter) => (
                            <Button key={filter} asChild variant="outline" className="h-auto min-h-11 whitespace-normal">
                                <Link href={`/products?${new URLSearchParams({ category: "طعام الأسماك", food: filter })}`}>{t(`journey-review.foodTargets.${filter}`)}</Link>
                            </Button>
                        ))}
                        <Button asChild variant="outline"><Link href={`/products?${new URLSearchParams({ category: "طعام الأسماك" })}`}>{t("journey-review.browseFood")}</Link></Button>
                    </div>
                </section>

                <section className="space-y-4 border-t border-border pt-6">
                    <h3 className="text-xl font-bold">{t("journey-review.nextTitle")}</h3>
                    <ol className="list-inside list-decimal space-y-3 text-sm text-muted-foreground">
                        {(["equipment", "water", "cycle", "stocking"] as const).map((step) => <li key={step}>{t(`journey-review.next.${step}`)}</li>)}
                    </ol>
                    <p className="rounded-xl bg-muted/30 p-4 text-sm text-foreground">{t("journey-review.readiness")}</p>
                </section>

                <JourneySupport wizardData={data} />

                <div className="space-y-3 border-t border-border pt-6 print:hidden">
                    <p className="text-xs text-muted-foreground">{t("journey-review.saveScope")}</p>
                    <div className="flex flex-wrap gap-3">
                        {onSave && <Button onClick={onSave} disabled={isSaving}><Save className="h-4 w-4" aria-hidden="true" />{t(isSaving ? "journey.s10" : "journey.s11")}</Button>}
                        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />{t("journey-summary.s68")}</Button>
                        {onReset && <Button variant="ghost" onClick={onReset}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("journey-summary.s67")}</Button>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

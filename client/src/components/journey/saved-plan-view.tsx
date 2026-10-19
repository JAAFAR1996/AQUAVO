import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SavedJourneyPlan, WizardData } from "@/types/journey";
import { journeyLabel } from "./utils";

interface SavedPlanViewProps {
    plan: SavedJourneyPlan;
    onContinue: (data: WizardData, step: number) => void;
    onDelete: () => void;
}

export function SavedPlanView({ plan, onContinue, onDelete }: SavedPlanViewProps) {
    const { t, i18n } = useTranslation("tools");
    const data = plan.data;
    return (
        <div className="container mx-auto max-w-2xl py-8">
            <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="pb-2 text-center">
                    <Badge variant="outline" className="mx-auto mb-4 w-fit border-primary text-primary">{t("saved-plan-view.s1")}</Badge>
                    <CardTitle className="text-3xl font-bold">{t("saved-plan-view.s2")}</CardTitle>
                    <CardDescription className="text-lg">{t("saved-plan-view.s3")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 rounded-xl bg-muted/30 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">{t("saved-plan-view.s4")}</span>
                            <span className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4 text-primary" aria-hidden="true" />{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString(i18n.language) : t("journey-labels.unknown")}</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-sm text-muted-foreground">{t("saved-plan-view.s5")}</h2>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{data.tankLiters > 0 ? t("journey-summary.s7", { v0: data.tankLiters }) : journeyLabel(t, "tankSize", data.tankSize)}</Badge>
                                <Badge variant="secondary">{journeyLabel(t, "tankType", data.tankType)}</Badge>
                                <Badge variant="secondary">{t("saved-plan-view.resumeStep", { step: plan.currentStep + 1 })}</Badge>
                            </div>
                        </div>
                        {(!data.tankLiters || !data.selectedSpecies.length) && <p className="text-sm text-muted-foreground">{t("saved-plan-view.partialData")}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="h-12 w-full text-lg" onClick={() => onContinue(data, plan.currentStep)}>{t("saved-plan-view.s14")}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
                    <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" aria-hidden="true" />{t("saved-plan-view.s15")}</Button>
                </CardFooter>
            </Card>
        </div>
    );
}

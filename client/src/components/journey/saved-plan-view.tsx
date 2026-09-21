import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SavedPlanViewProps {
    plan: any; // Ideally this should be a proper type from the API
    onContinue: (planData: any) => void;
    onDelete: () => void;
}

export function SavedPlanView({ plan, onContinue, onDelete }: SavedPlanViewProps) {
  const { t } = useTranslation("tools");
    // Parse data if it's a string, otherwise use as is
    const planData = typeof plan.data === 'string' ? JSON.parse(plan.data) : plan.data;

    return (
        <div className="container py-8 max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-2">
                    <Badge variant="outline" className="w-fit mx-auto mb-4 border-primary text-primary">
                        {t("saved-plan-view.s1")}
                    </Badge>
                    <CardTitle className="text-3xl font-bold">{t("saved-plan-view.s2")}</CardTitle>
                    <CardDescription className="text-lg">
                        {t("saved-plan-view.s3")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("saved-plan-view.s4")}</span>
                            <span className="font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {new Date(plan.createdAt).toLocaleDateString('en-GB')}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <span className="text-muted-foreground block mb-1">{t("saved-plan-view.s5")}</span>
                            <div className="flex flex-wrap gap-2">
                                {planData.tankSize && (
                                    <Badge variant="secondary">
                                        {t("saved-plan-view.s6")} {planData.tankSize === 'small' ? t("saved-plan-view.s7") : planData.tankSize === 'medium' ? t("saved-plan-view.s8") : planData.tankSize === 'large' ? t("saved-plan-view.s9") : t("saved-plan-view.s10")}
                                    </Badge>
                                )}
                                {planData.tankType && (
                                    <Badge variant="secondary">
                                        {planData.tankType === 'planted' ? t("saved-plan-view.s11") : t("saved-plan-view.s12")}
                                    </Badge>
                                )}
                                {planData.fishTypes?.length > 0 && (
                                    <Badge variant="secondary">
                                        {planData.fishTypes.length} {t("saved-plan-view.s13")}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        className="w-full text-lg h-12"
                        onClick={() => onContinue(planData)}
                    >
                        {t("saved-plan-view.s14")}
                        <ArrowRight className="mr-2 h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("saved-plan-view.s15")}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { WizardData } from "@/types/journey";
import { buildJourneySupportMessage } from "./utils";

export function JourneySupport({ wizardData }: { wizardData: WizardData }) {
    const { t, i18n } = useTranslation("tools");
    const message = buildJourneySupportMessage(wizardData, t, i18n.language);

    return (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-start print:hidden">
            <h3 className="font-bold text-foreground">{t("journey-review.supportTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("journey-review.supportBody")}</p>
            <Button asChild className="h-auto min-h-11 whitespace-normal">
                <WhatsAppLink source="beginner_guide" message={message} data-testid="journey-support-link">
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("journey-review.supportCta")}
                </WhatsAppLink>
            </Button>
            <p className="text-xs text-muted-foreground">{t("journey-review.supportDraft")}</p>
            <details className="text-sm">
                <summary className="cursor-pointer text-primary">{t("journey-review.previewMessage")}</summary>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-3 text-muted-foreground">{message}</p>
            </details>
        </div>
    );
}

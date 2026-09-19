import { MetaTags } from "@/components/seo/meta-tags";
import { CompatibilityCalculator } from "@/components/fish/compatibility-calculator";

import { BackToTop } from "@/components/back-to-top";
import { useTranslation } from "react-i18next";

export default function FishCompatibility() {
  const { t } = useTranslation("tools");
    return (
        <div className="flex-1 flex flex-col bg-background">            <MetaTags
                title={t("fish-compatibility.s1")}
                description={t("fish-compatibility.s2")}
                keywords={[t("fish-compatibility.s3"), t("fish-compatibility.s4"), t("fish-compatibility.s5"), t("fish-compatibility.s6")]}
            />

            <main className="flex-1 container mx-auto px-4 py-8">
                <CompatibilityCalculator />
            </main>

            <BackToTop />
        </div>
    );
}

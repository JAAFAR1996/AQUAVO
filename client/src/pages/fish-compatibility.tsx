import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags } from "@/components/seo/meta-tags";
import { CompatibilityCalculator } from "@/components/fish/compatibility-calculator";

import { BackToTop } from "@/components/back-to-top";

export default function FishCompatibility() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <MetaTags
                title="كاشف توافقية الأسماك | AQUAVO"
                description="اختر أنواع الأسماك التي تريد تربيتها معاً واكتشف مدى توافقها. أداة ذكية للتأكد من سلامة أسماكك."
                keywords={["توافقية الأسماك", "حوض سمك", "تربية الأسماك", "أسماك متوافقة"]}
            />

            <main className="flex-1 container mx-auto px-4 py-8">
                <CompatibilityCalculator />
            </main>

            <Footer />

            <BackToTop />
        </div>
    );
}

import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags } from "@/components/seo/meta-tags";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";

export default function FishFinder() {
    const [, setLocation] = useLocation();

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <MetaTags
                title="مكتشف الأسماك | قريباً"
                description="أداة البحث الذكي عن الأسماك قادمة قريباً!"
            />
            <Navbar />

            <main id="main-content" className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
                <div className="max-w-2xl mx-auto w-full text-center space-y-8">
                    <div className="relative flex justify-center">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                        <ShrimpMascot mood="happy" size="xl" animate />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-primary">مكتشف الأسماك</h1>
                        <p className="text-xl text-muted-foreground">
                            نحن نعمل على تطوير أداة ذكية لمساعدتك في العثور على سمكتك المثالية! 🐠
                        </p>
                    </div>

                    <button
                        onClick={() => setLocation("/")}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
                    >
                        العودة للرئيسية
                    </button>
                </div>
            </main>

            <Footer />
        </div>
    );
}

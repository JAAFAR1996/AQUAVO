import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ProductReviewsSectionProps {
    productId: string;
    productName?: string;
    className?: string;
}

export function ProductReviewsSection({
    productId,
    productName,
    className,
}: ProductReviewsSectionProps) {
  const { t } = useTranslation("pages");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleReviewSubmitted = () => {
        setIsFormOpen(false);
        // Force refresh of review list
        setRefreshKey((k) => k + 1);
    };

    return (
        <section className={cn("py-8", className)}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{t("product-reviews-section.s1")}</h2>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <MessageSquarePlus className="w-4 h-4" />
                            {t("product-reviews-section.s2")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-right">
                                {t("product-reviews-section.s3")} {productName && t("product-reviews-section.s4", { v0: productName })}
                            </DialogTitle>
                        </DialogHeader>
                        <ReviewForm
                            productId={productId}
                            onReviewSubmitted={handleReviewSubmitted}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <ReviewList key={refreshKey} productId={productId} />
        </section>
    );
}

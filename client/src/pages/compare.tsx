import { useQuery } from "@tanstack/react-query";
import { MetaTags } from "@/components/seo/meta-tags";
import { ProductComparisonTable, useComparison } from "@/components/products/product-comparison";
import { Button } from "@/components/ui/button";
import { ArrowRight, Scale, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@/types";
import { useTranslation } from "react-i18next";
import { fetchProductsByIds } from "@/lib/api";

export default function ComparePage() {
  const { t } = useTranslation("tools");
  const { t: common } = useTranslation("common");
    const { compareIds, clearCompare, removeFromCompare } = useComparison();

    const { data: comparedProducts = [], isPending, isError, refetch } = useQuery<Product[]>({
        queryKey: ["comparison-products", compareIds],
        queryFn: () => fetchProductsByIds(compareIds),
        enabled: compareIds.length > 0,
        staleTime: 30_000,
    });

    return (
        <div className="flex-1 flex flex-col bg-background">
            <MetaTags
                title={t("compare.s1")}
                description={t("compare.s2")}
                keywords={[t("compare.s3"), t("compare.s4"), "AQUAVO"]}
            />
            <main id="main-content" className="flex-1 container mx-auto px-4 py-8 pt-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Scale className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">{t("compare.s1")}</h1>
                                <p className="text-muted-foreground">{t("compare.s5")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/products">
                            <Button variant="outline" className="gap-2">
                                <ArrowRight className="w-4 h-4" />
                                {t("compare.s6")}
                            </Button>
                        </Link>
                        {compareIds.length > 0 && (
                            <Button variant="destructive" onClick={clearCompare} className="gap-2">
                                <Trash2 className="w-4 h-4" />
                                {t("compare.s7")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Comparison Table */}
                {compareIds.length > 0 && isPending ? <p role="status">{common("status.loading")}</p> : isError ? <div role="alert">
                    <p>{common("status.error")}</p>
                    <Button onClick={() => void refetch()}>{common("actions.retry")}</Button>
                </div> : <ProductComparisonTable
                    products={comparedProducts}
                    onRemove={removeFromCompare}
                />}
            </main>
        </div>
    );
}

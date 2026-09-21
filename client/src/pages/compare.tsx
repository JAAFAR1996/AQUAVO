import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetaTags } from "@/components/seo/meta-tags";
import { ProductComparisonTable, useComparison } from "@/components/products/product-comparison";
import { Button } from "@/components/ui/button";
import { ArrowRight, Scale, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@/types";
import { useTranslation } from "react-i18next";

export default function ComparePage() {
  const { t } = useTranslation("tools");
    const { compareIds, clearCompare, removeFromCompare } = useComparison();

    // Fetch all products
    const { data: allProducts = [] } = useQuery<Product[]>({
        queryKey: ["/api/products"],
        queryFn: async () => {
            const res = await fetch("/api/products?limit=200");
            if (!res.ok) throw new Error("Failed to fetch products");
            const data = await res.json();
            // API returns { products: [...] }, extract the array
            return data.products || [];
        },
    });

    // Filter products that are in comparison
    const comparedProducts = allProducts.filter(p => compareIds.includes(p.id));

    return (
        <div className="flex-1 flex flex-col bg-background">
            <MetaTags
                title={t("compare.s1")}
                description={t("compare.s2")}
                keywords={[t("compare.s3"), t("compare.s4"), "AQUAVO"]}
            />
            <main className="flex-1 container mx-auto px-4 py-8 pt-24">
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
                        {comparedProducts.length > 0 && (
                            <Button variant="destructive" onClick={clearCompare} className="gap-2">
                                <Trash2 className="w-4 h-4" />
                                {t("compare.s7")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Comparison Table */}
                <ProductComparisonTable
                    products={comparedProducts}
                    onRemove={removeFromCompare}
                />
            </main>
        </div>
    );
}

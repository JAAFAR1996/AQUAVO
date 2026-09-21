import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Product } from '@/types';
import { SearchIcon } from 'lucide-react';
import { cardImage } from '@/lib/cloudinary';
import { useTranslation } from "react-i18next";
import { getProductDisplayIdentity } from "@/lib/product-display";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { t } = useTranslation("search");
  const [query, setQuery] = useState('');
  const { data } = useQuery<{ products: Product[] }>({ queryKey: ['products'], queryFn: () => fetchProducts() });
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredProducts([]);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const results = (data?.products || []).filter(product =>
      product.name.toLowerCase().includes(lowerCaseQuery) ||
      product.brand.toLowerCase().includes(lowerCaseQuery) ||
      product.category.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredProducts(results);
  }, [query, data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            {t("search-dialog.s1")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="search"
            placeholder={t("search-dialog.s2")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-lg"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() !== '' && filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t("search-dialog.s3")}</p>
          )}
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const productDisplay = getProductDisplayIdentity(product);
              return (
                <Link key={product.id} href={`/products/${product.slug}`} onClick={() => onOpenChange(false)}>
                  <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <img src={cardImage(product.image) || "/brand/aquavo-v2-icon.svg"} alt={product.name} loading="lazy" decoding="async" width={64} height={64} className="w-16 h-16 object-contain rounded-md bg-card" />
                    <div className="min-w-0">
                      {productDisplay.brand ? (
                        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-primary/75">
                          <bdi dir="ltr">{productDisplay.brand}</bdi>
                        </p>
                      ) : null}
                      <h4 className="font-semibold line-clamp-2">{productDisplay.name}</h4>
                      <p className="text-sm font-bold text-purple-500">{t("search-dialog.s4")}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

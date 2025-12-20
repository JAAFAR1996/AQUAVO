import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Product } from '@/types';
import { SearchIcon } from 'lucide-react';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
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
            البحث عن المنتجات
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="search"
            placeholder="ابحث عن فلتر، سخان، نباتات..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-lg"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() !== '' && filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">لا توجد نتائج بحث.</p>
          )}
          <div className="space-y-2">
            {filteredProducts.map(product => (
              <Link key={product.id} href={`/products/${product.slug}`} onClick={() => onOpenChange(false)}>
                <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="w-16 h-16 object-contain rounded-md bg-white" />
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-primary">{product.price.toLocaleString()} د.ع</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

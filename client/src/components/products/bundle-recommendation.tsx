import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingBag } from 'lucide-react';
import { Product, Bundle } from '@/types';

interface BundleRecommendationProps {
  bundle: Bundle;
  products: Product[]; // Products included in the bundle
  onAddToCart: () => void;
}

export function BundleRecommendation({ bundle, products, onAddToCart }: BundleRecommendationProps) {
  const savings = bundle.products.reduce((acc, id) => {
    const product = products.find(p => p.id === id);
    return acc + (product?.price || 0);
  }, 0) - bundle.totalPrice;

  return (
    <Card className="border-primary/20 overflow-hidden bg-gradient-to-br from-card to-accent/5">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="secondary" className="mb-2 text-primary">Perfect Match</Badge>
            <CardTitle className="text-xl">{bundle.name}</CardTitle>
          </div>
          <Badge className="bg-destructive text-destructive-foreground animate-pulse">
            Save ${savings.toFixed(2)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{bundle.description}</p>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex items-center gap-2 py-4 overflow-x-auto pb-6">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center shrink-0">
              <div className="relative group w-20 h-20 rounded-md overflow-hidden border bg-background">
                <img
                  src={product.thumbnail}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              {index < products.length - 1 && (
                <Plus className="w-4 h-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="line-through text-muted-foreground">
              ${(bundle.totalPrice + savings).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <span className="font-medium">Bundle Price:</span>
            <span className="text-2xl font-bold text-primary">
              ${bundle.totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full gap-2 group" onClick={onAddToCart}>
          <ShoppingBag className="w-4 h-4" />
          Add Bundle to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}

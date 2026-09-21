import { Leaf, Globe, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductTransparencyProps {
  ecoFriendly?: boolean;
  origin?: string;
  material?: string;
  className?: string;
}

export function ProductTransparency({ ecoFriendly, origin = "ألمانيا", material = "بلاستيك معاد تدويره", className }: ProductTransparencyProps) {
  return (
    <div className={cn("p-6 bg-muted/30 rounded-xl border border-border/50 space-y-4", className)}>
      <h4 className="font-bold text-lg flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        شفافية المنتج
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3" /> بلد المنشأ
          </span>
          <p className="font-medium">{origin}</p>
        </div>
        
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" /> استهلاك الطاقة
          </span>
          <p className="font-medium">A+ موفر للطاقة</p>
        </div>

        <div className="col-span-2 pt-2 border-t border-border/50">
          {ecoFriendly ? (
             <div className="flex items-center gap-3 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
               <Leaf className="w-5 h-5" />
               <div>
                 <p className="font-bold text-sm">منتج صديق للبيئة</p>
                 <p className="text-xs opacity-80">يساهم في تقليل البصمة الكربونية</p>
               </div>
             </div>
          ) : (
            <p className="text-sm text-muted-foreground">مواد عالية الجودة تضمن عمراً طويلاً للمنتج.</p>
          )}
        </div>
      </div>
    </div>
  );
}

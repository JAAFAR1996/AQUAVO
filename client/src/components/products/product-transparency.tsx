import { Leaf, Globe, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface ProductTransparencyProps {
  ecoFriendly?: boolean;
  origin?: string;
  material?: string;
  className?: string;
}

export function ProductTransparency({ ecoFriendly, origin = i18next.t("pages:product-transparency.s1"), material = i18next.t("pages:product-transparency.s2"), className }: ProductTransparencyProps) {
  const { t } = useTranslation("pages");
  return (
    <div className={cn("p-6 bg-muted/30 rounded-xl border border-border/50 space-y-4", className)}>
      <h4 className="font-bold text-lg flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        {t("product-transparency.s3")}
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3" /> {t("product-transparency.s4")}
          </span>
          <p className="font-medium">{origin}</p>
        </div>
        
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" /> {t("product-transparency.s5")}
          </span>
          <p className="font-medium">{t("product-transparency.s6")}</p>
        </div>

        <div className="col-span-2 pt-2 border-t border-border/50">
          {ecoFriendly ? (
             <div className="flex items-center gap-3 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
               <Leaf className="w-5 h-5" />
               <div>
                 <p className="font-bold text-sm">{t("product-transparency.s7")}</p>
                 <p className="text-xs opacity-80">{t("product-transparency.s8")}</p>
               </div>
             </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("product-transparency.s9")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

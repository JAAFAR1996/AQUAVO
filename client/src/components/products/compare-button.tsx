import { Check, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComparison } from "@/contexts/comparison-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 4;

interface CompareButtonProps {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
}

export function CompareButton({ productId, variant = "icon", className }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useComparison();
  const { toast } = useToast();
  const inCompare = isInCompare(productId);

  const handleToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (inCompare) {
      removeFromCompare(productId);
      return;
    }

    if (!canAdd) {
      toast({
        title: "الحد الأقصى للمقارنة",
        description: `يمكنك مقارنة ${MAX_COMPARE} منتجات كحد أقصى`,
        variant: "destructive",
      });
      return;
    }

    addToCompare(productId);
    void import("canvas-confetti").then((confetti) => {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti.default({
        particleCount: 30,
        spread: 60,
        origin: { x, y },
        colors: ["#10b981", "#3b82f6", "#8b5cf6"],
        startVelocity: 15,
        gravity: 0.8,
        scalar: 0.8,
      });
    });
  };

  if (variant === "icon") {
    return (
      <Button
        variant={inCompare ? "default" : "outline"}
        size="icon"
        className={cn("h-9 w-9 transition-all", inCompare && "bg-primary scale-110", className)}
        onClick={handleToggle}
        title={inCompare ? "إزالة من المقارنة" : "إضافة للمقارنة"}
      >
        <Scale className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={inCompare ? "default" : "outline"}
      size="sm"
      className={cn("gap-1 transition-all", inCompare && "bg-primary text-primary-foreground scale-105", className)}
      onClick={handleToggle}
    >
      {inCompare ? (
        <>
          <Check className="w-4 h-4" />
          في المقارنة
        </>
      ) : (
        <>
          <Scale className="w-4 h-4" />
          قارن
        </>
      )}
    </Button>
  );
}

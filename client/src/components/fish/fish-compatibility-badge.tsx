import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FishCompatibilityBadgeProps {
  status: "compatible" | "caution" | "incompatible";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function FishCompatibilityBadge({
  status,
  size = "md",
  showIcon = true,
  className,
}: FishCompatibilityBadgeProps) {
  const config = {
    compatible: {
      label: "متوافق تماماً",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    },
    caution: {
      label: "يحتاج حذر",
      icon: AlertTriangle,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    },
    incompatible: {
      label: "غير متوافق",
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-bold border",
        statusClassName,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], "ml-1")} />}
      {label}
    </Badge>
  );
}

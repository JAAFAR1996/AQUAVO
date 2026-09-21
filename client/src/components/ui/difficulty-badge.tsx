import { Badge } from "@/components/ui/badge";
import { DifficultyLevel } from "@/types";
import { cn } from "@/lib/utils";
import { i18next } from "@/i18n";

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string; bg: string }> = {
  easy: { label: i18next.t("common:difficulty-badge.s1"), color: "text-green-700", bg: "bg-green-100 border-green-200" },
  medium: { label: i18next.t("common:difficulty-badge.s2"), color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" },
  hard: { label: i18next.t("common:difficulty-badge.s3"), color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  expert: { label: i18next.t("common:difficulty-badge.s4"), color: "text-red-700", bg: "bg-red-100 border-red-200" },
};

interface DifficultyBadgeProps {
  level?: DifficultyLevel;
  className?: string;
}

export function DifficultyBadge({ level, className }: DifficultyBadgeProps) {
  const config = difficultyConfig[level as DifficultyLevel] ?? difficultyConfig.medium;
  
  return (
    <Badge variant="outline" className={cn("font-medium border", config.bg, config.color, className)}>
      {config.label}
    </Badge>
  );
}

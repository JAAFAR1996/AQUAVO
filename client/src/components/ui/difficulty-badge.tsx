import { Badge } from "@/components/ui/badge";
import { DifficultyLevel } from "@/types";
import { cn } from "@/lib/utils";

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string; bg: string }> = {
  easy: { label: "مبتدئ", color: "text-green-700", bg: "bg-green-100 border-green-200" },
  medium: { label: "متوسط", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" },
  hard: { label: "متقدم", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  expert: { label: "خبير", color: "text-red-700", bg: "bg-red-100 border-red-200" },
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

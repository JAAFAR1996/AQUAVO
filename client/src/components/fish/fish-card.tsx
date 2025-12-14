import { FishSpecies } from "@/data/freshwater-fish";
import { Badge } from "@/components/ui/badge";
import { Droplets, Thermometer, Heart, Fish, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FishCardProps {
  fish: FishSpecies;
  onClick?: () => void;
  isSelected?: boolean;
  showCompatibility?: boolean;
  compatibilityStatus?: "compatible" | "warning" | "incompatible";
}

const temperamentColors = {
  peaceful: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
  "semi-aggressive": "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800",
  aggressive: "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-800",
};

const careLevelColors = {
  beginner: "bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800",
  intermediate: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800",
  advanced: "bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800",
};

const temperamentLabels = {
  peaceful: "سلمي",
  "semi-aggressive": "شبه عدواني",
  aggressive: "عدواني",
};

const careLevelLabels = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export function FishCard({
  fish,
  onClick,
  isSelected,
  showCompatibility,
  compatibilityStatus,
}: FishCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-right cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden relative rounded-xl border bg-card text-card-foreground shadow",
        isSelected && "ring-2 ring-primary shadow-lg scale-[1.02]",
        showCompatibility && compatibilityStatus === "incompatible" && "ring-2 ring-red-500 opacity-60"
      )}
      aria-label={`عرض تفاصيل ${fish.arabicName}`}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
        <img
          src={fish.image}
          alt={fish.arabicName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Corner badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {fish.schooling && (
            <Badge className="bg-blue-500/90 backdrop-blur-sm text-white border-0 shadow-lg">
              <Fish className="w-3 h-3 ml-1" />
              سرب {fish.minimumGroup}+
            </Badge>
          )}
          {showCompatibility && compatibilityStatus && (
            <Badge
              className={cn(
                "backdrop-blur-sm border-0 shadow-lg",
                compatibilityStatus === "compatible" && "bg-green-500/90 text-white",
                compatibilityStatus === "warning" && "bg-yellow-500/90 text-white",
                compatibilityStatus === "incompatible" && "bg-red-500/90 text-white"
              )}
            >
              <AlertCircle className="w-3 h-3 ml-1" />
              {compatibilityStatus === "compatible" && "متوافق"}
              {compatibilityStatus === "warning" && "تحذير"}
              {compatibilityStatus === "incompatible" && "غير متوافق"}
            </Badge>
          )}
        </div>

        {/* Size indicator */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold">
          {fish.maxSize} سم
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Names */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1 line-clamp-1">
            {fish.arabicName}
          </h3>
          <p className="text-sm text-muted-foreground italic line-clamp-1">
            {fish.scientificName}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {fish.commonName}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {fish.description}
        </p>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title="درجة الحرارة">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <span>{fish.waterParameters.tempMin}-{fish.waterParameters.tempMax}°س</span>
          </div>
          <div className="flex items-center gap-1" title="الحموضة">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>pH {fish.waterParameters.phMin}-{fish.waterParameters.phMax}</span>
          </div>
          <div className="flex items-center gap-1" title="الحد الأدنى للحوض">
            <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>{fish.minTankSize}ل</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={temperamentColors[fish.temperament]}>
            <Heart className="w-3 h-3 ml-1" />
            {temperamentLabels[fish.temperament]}
          </Badge>
          <Badge variant="outline" className={careLevelColors[fish.careLevel]}>
            {careLevelLabels[fish.careLevel]}
          </Badge>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
      </div>
    </button>
  );
}


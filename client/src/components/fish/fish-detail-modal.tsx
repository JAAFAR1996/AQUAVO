import { FishSpecies } from "@/data/freshwater-fish";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Heart,
  Fish,
  Clock,
  Ruler,
  ShieldCheck,
  Utensils,
  Baby,
  Lightbulb,
  CheckCircle,
  XCircle,
  X,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface FishDetailModalProps {
  fish: FishSpecies | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const temperamentLabels: Record<string, string> = {
  peaceful: i18next.t("tools:fish-detail-modal.s1"),
  "semi-aggressive": i18next.t("tools:fish-detail-modal.s2"),
  aggressive: i18next.t("tools:fish-detail-modal.s3"),
};

const careLevelLabels: Record<string, string> = {
  beginner: i18next.t("tools:fish-detail-modal.s4"),
  intermediate: i18next.t("tools:fish-detail-modal.s5"),
  advanced: i18next.t("tools:fish-detail-modal.s6"),
};

const categoryLabels: Record<string, string> = {
  community: i18next.t("tools:fish-detail-modal.s7"),
  cichlid: i18next.t("tools:fish-detail-modal.s8"),
  catfish: i18next.t("tools:fish-detail-modal.s9"),
  tetra: i18next.t("tools:fish-detail-modal.s10"),
  livebearer: i18next.t("tools:fish-detail-modal.s11"),
  betta: i18next.t("tools:fish-detail-modal.s12"),
  gourami: i18next.t("tools:fish-detail-modal.s13"),
  goldfish: i18next.t("tools:fish-detail-modal.s14"),
  other: i18next.t("tools:fish-detail-modal.s15"),
};

const hardnessLabels: Record<string, string> = {
  soft: i18next.t("tools:fish-detail-modal.s16"),
  medium: i18next.t("tools:fish-detail-modal.s17"),
  hard: i18next.t("tools:fish-detail-modal.s18"),
};

export function FishDetailModal({ fish, open, onOpenChange }: FishDetailModalProps) {
  const { t } = useTranslation("tools");
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open || !fish) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      <div
        ref={modalRef}
        className="relative bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute left-4 top-4 z-50 rounded-full w-10 h-10 flex items-center justify-center bg-background border-2 border-border hover:border-primary/50 hover:bg-accent transition-all shadow-md hover:scale-110"
          aria-label={t("fish-detail-modal.s19")}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh] p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-3xl font-bold">{fish.arabicName}</h2>
            <p className="sr-only">
              {t("fish-detail-modal.s20")} {fish.arabicName} {t("fish-detail-modal.s21")}
            </p>
          </div>

          {/* Hero Image */}
          <div className="relative h-80 w-full rounded-xl overflow-hidden my-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
            <img
              src={fish.image}
              alt={fish.arabicName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 right-4 flex flex-wrap gap-2">
              <Badge className="bg-primary text-white">
                {categoryLabels[fish.category]}
              </Badge>
              {fish.schooling && (
                <Badge className="bg-blue-500 text-white">
                  <Fish className="w-3 h-3 ml-1" />
                  {t("fish-detail-modal.s22")} {fish.minimumGroup}+
                </Badge>
              )}
            </div>
          </div>

          {/* Names Section */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">{t("fish-detail-modal.s23")}</span>
              <span className="text-lg italic">{fish.scientificName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">{t("fish-detail-modal.s24")}</span>
              <span>{fish.commonName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">{t("fish-detail-modal.s25")}</span>
              <span>{fish.family}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">{t("fish-detail-modal.s26")}</span>
              <span>{fish.origin}</span>
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Fish className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s27")}
            </h3>
            <p className="text-muted-foreground leading-relaxed">{fish.description}</p>
          </div>

          <hr className="my-6 border-border" />

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4 text-center">
              <Ruler className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t("fish-detail-modal.s28")}</p>
              <p className="font-bold">{fish.minSize}-{fish.maxSize} {t("fish-detail-modal.s29")}</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t("fish-detail-modal.s30")}</p>
              <p className="font-bold">{fish.lifespan} {t("fish-detail-modal.s31")}</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t("fish-detail-modal.s32")}</p>
              <p className="font-bold text-sm">{temperamentLabels[fish.temperament]}</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <ShieldCheck className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t("fish-detail-modal.s33")}</p>
              <p className="font-bold text-sm">{careLevelLabels[fish.careLevel]}</p>
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Water Parameters */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s34")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border/50 shadow-sm rounded-xl p-4 hover:border-orange-200 dark:hover:border-orange-900 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  <span className="font-bold">{t("fish-detail-modal.s35")}</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {fish.waterParameters.tempMin}{t("fish-detail-modal.s36")} {fish.waterParameters.tempMax}{t("fish-detail-modal.s37")}
                </p>
              </div>
              <div className="bg-card border border-border/50 shadow-sm rounded-xl p-4 hover:border-blue-200 dark:hover:border-blue-900 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="font-bold">{t("fish-detail-modal.s38")}</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fish.waterParameters.phMin} - {fish.waterParameters.phMax}
                </p>
              </div>
              <div className="bg-card border border-border/50 shadow-sm rounded-xl p-4 hover:border-purple-200 dark:hover:border-purple-900 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-bold">{t("fish-detail-modal.s39")}</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {fish.minTankSize} {t("fish-detail-modal.s40")}
                </p>
              </div>
              <div className="bg-card border border-border/50 shadow-sm rounded-xl p-4 hover:border-cyan-200 dark:hover:border-cyan-900 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  <span className="font-bold">{t("fish-detail-modal.s41")}</span>
                </div>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {hardnessLabels[fish.waterParameters.hardness]}
                </p>
              </div>
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Diet */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s42")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {fish.diet.map((food) => (
                <Badge key={food} variant="secondary" className="text-sm">
                  {food}
                </Badge>
              ))}
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Breeding */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s43")}
            </h3>
            {typeof fish.breeding === 'string' ? (
              <p className="text-muted-foreground leading-relaxed">{fish.breeding}</p>
            ) : (
              <div className="space-y-4">
                {/* Difficulty */}
                <div className="flex items-center gap-2">
                  <Badge className={
                    fish.breeding.difficulty === 'easy' ? 'bg-green-500' :
                      fish.breeding.difficulty === 'moderate' ? 'bg-yellow-500' :
                        fish.breeding.difficulty === 'difficult' ? 'bg-orange-500' :
                          'bg-red-500'
                  }>
                    {fish.breeding.difficulty === 'easy' ? t("fish-detail-modal.s44") :
                      fish.breeding.difficulty === 'moderate' ? t("fish-detail-modal.s5") :
                        fish.breeding.difficulty === 'difficult' ? t("fish-detail-modal.s45") : t("fish-detail-modal.s46")}
                  </Badge>
                  <Badge variant="outline">
                    {fish.breeding.method === 'egg-layer' ? t("fish-detail-modal.s47") :
                      fish.breeding.method === 'live-bearer' ? t("fish-detail-modal.s11") :
                        fish.breeding.method === 'bubble-nest' ? t("fish-detail-modal.s48") :
                          t("fish-detail-modal.s49")}
                  </Badge>
                </div>

                {/* Sexual Dimorphism */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="font-bold mb-2">{t("fish-detail-modal.s50")}</div>
                  <p className="text-sm text-muted-foreground">{fish.breeding.sexualDimorphism}</p>
                </div>

                {/* Spawning Triggers */}
                <div>
                  <div className="font-bold mb-2">{t("fish-detail-modal.s51")}</div>
                  <ul className="text-sm space-y-1">
                    {fish.breeding.spawningTriggers.map((trigger) => (
                      <li key={trigger} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-muted-foreground">{trigger}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Breeding Setup */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="font-bold mb-3">{t("fish-detail-modal.s52")}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-primary">{t("fish-detail-modal.s53")}</span> {fish.breeding.breedingSetup.tankSize}
                    </div>
                    <div>
                      <span className="font-semibold text-primary">{t("fish-detail-modal.s54")}</span> {fish.breeding.breedingSetup.temperature}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-primary">{t("fish-detail-modal.s55")}</span> {fish.breeding.breedingSetup.waterConditions}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-primary">{t("fish-detail-modal.s56")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {fish.breeding.breedingSetup.equipment.map((eq) => (
                          <Badge key={eq} variant="secondary" className="text-xs">{eq}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spawning Behavior */}
                <div>
                  <div className="font-bold mb-2">{t("fish-detail-modal.s57")}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{fish.breeding.spawningBehavior}</p>
                </div>

                {/* Egg Care */}
                <div>
                  <div className="font-bold mb-2">{t("fish-detail-modal.s58")}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{fish.breeding.eggCare}</p>
                </div>

                {/* Fry Info */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 border">
                  <div className="font-bold mb-3">{t("fish-detail-modal.s59")}</div>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-semibold">{t("fish-detail-modal.s60")}</span> {fish.breeding.fryInfo.firstFood}</div>
                    <div><span className="font-semibold">{t("fish-detail-modal.s61")}</span> {fish.breeding.fryInfo.growthRate}</div>
                    <div><span className="font-semibold">{t("fish-detail-modal.s62")}</span> {fish.breeding.fryInfo.adulthoodTime}</div>
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <div className="font-bold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    {t("fish-detail-modal.s63")}
                  </div>
                  <ul className="space-y-2">
                    {fish.breeding.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-sm bg-muted/30 rounded p-2">
                        <span className="text-primary">✓</span>
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <hr className="my-6 border-border" />

          {/* Compatibility */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {t("fish-detail-modal.s64")}
              </h3>
              <div className="space-y-2">
                {fish.compatibility.goodWith.map((species) => (
                  <div
                    key={species}
                    className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-lg p-3"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{species}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                {t("fish-detail-modal.s65")}
              </h3>
              <div className="space-y-2">
                {fish.compatibility.avoidWith.map((species) => (
                  <div
                    key={species}
                    className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3"
                  >
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm">{species}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Care Tips */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s66")}
            </h3>
            <div className="grid gap-3">
              {fish.careTips.map((tip) => (
                <div
                  key={tip}
                  className="flex items-start gap-3 bg-card border border-border/50 shadow-sm rounded-xl p-4 hover:bg-accent/50 transition-colors"
                >
                  <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Recommended Products */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              {t("fish-detail-modal.s67")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/products?category=tanks`}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Fish className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground">{t("fish-detail-modal.s68")}</div>
                  <div className="text-sm text-muted-foreground">+{fish.minTankSize} {t("fish-detail-modal.s40")}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href={`/products?category=food`}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground">{t("fish-detail-modal.s69")}</div>
                  <div className="text-sm text-muted-foreground">{t("fish-detail-modal.s70")}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href={`/products?category=equipment`}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Thermometer className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground">{t("fish-detail-modal.s71")}</div>
                  <div className="text-sm text-muted-foreground">
                    {fish.waterParameters.tempMin}-{fish.waterParameters.tempMax}{t("fish-detail-modal.s37")}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render modal at document body level
  return createPortal(modalContent, document.body);
}

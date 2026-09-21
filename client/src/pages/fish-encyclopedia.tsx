import { useState, useMemo } from "react";
import { MetaTags } from "@/components/seo/meta-tags";
import { FishCard } from "@/components/fish/fish-card";
import { FishDetailModal } from "@/components/fish/fish-detail-modal";
import { FishComparisonTool } from "@/components/fish/fish-comparison-tool";
import { FishSpecies } from "@/data/freshwater-fish";
import { useFishData } from "@/hooks/use-fish-data";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X, Fish, BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";


import { BackToTop } from "@/components/back-to-top";
import { useTranslation } from "react-i18next";

export default function FishEncyclopedia() {
  const { t } = useTranslation("tools");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCareLevel, setSelectedCareLevel] = useState<string>("all");
  const [selectedTemperament, setSelectedTemperament] = useState<string>("all");
  const [selectedTankSize, setSelectedTankSize] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: freshwaterFish = [], isLoading, error } = useFishData();

  // Filter and sort fish
  const filteredAndSortedFish = useMemo(() => {
    let result = [...freshwaterFish];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (fish) =>
          fish.arabicName.toLowerCase().includes(query) ||
          fish.commonName.toLowerCase().includes(query) ||
          fish.scientificName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((fish) => fish.category === selectedCategory);
    }

    // Care level filter
    if (selectedCareLevel !== "all") {
      result = result.filter((fish) => fish.careLevel === selectedCareLevel);
    }

    // Temperament filter
    if (selectedTemperament !== "all") {
      result = result.filter((fish) => fish.temperament === selectedTemperament);
    }

    // Tank size filter
    if (selectedTankSize !== "all") {
      const maxSize = parseInt(selectedTankSize);
      result = result.filter((fish) => fish.minTankSize <= maxSize);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.arabicName.localeCompare(b.arabicName, "ar");
        case "size":
          return a.maxSize - b.maxSize;
        case "care-easy":
          const careLevelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return careLevelOrder[a.careLevel] - careLevelOrder[b.careLevel];
        case "care-hard":
          const careLevelOrderReverse = { beginner: 3, intermediate: 2, advanced: 1 };
          return careLevelOrderReverse[a.careLevel] - careLevelOrderReverse[b.careLevel];
        case "tank-small":
          return a.minTankSize - b.minTankSize;
        case "tank-large":
          return b.minTankSize - a.minTankSize;
        default:
          return 0;
      }
    });

    return result;
  }, [freshwaterFish, searchQuery, selectedCategory, selectedCareLevel, selectedTemperament, selectedTankSize, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        {t("fish-encyclopedia.s1")}
      </div>
    );
  }

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedCareLevel !== "all" ||
    selectedTemperament !== "all" ||
    selectedTankSize !== "all";

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedCareLevel("all");
    setSelectedTemperament("all");
    setSelectedTankSize("all");
    setSearchQuery("");
  };

  const handleFishClick = (fish: FishSpecies) => {
    setSelectedFish(fish);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-background">      <MetaTags
        title={t("fish-encyclopedia.s2")}
        description={t("fish-encyclopedia.s3")}
        keywords={[t("fish-encyclopedia.s4"), t("fish-encyclopedia.s5"), t("fish-encyclopedia.s6"), t("fish-encyclopedia.s7"), t("fish-encyclopedia.s8")]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-card/20 backdrop-blur-md border border-white/30 px-6 py-2 rounded-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <BookOpen className="h-5 w-5" />
              <span className="font-bold">{t("fish-encyclopedia.s9")}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              {t("fish-encyclopedia.s10")}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              {t("fish-encyclopedia.s11")} {freshwaterFish.length} {t("fish-encyclopedia.s12")}
            </p>
            <Link href="/fish-compatibility">
              <Button size="lg" variant="secondary" className="gap-2 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                <CheckCircle2 className="w-5 h-5" />
                {t("fish-encyclopedia.s13")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <div>
        <section className="py-8 bg-card border-b">
          <div className="container mx-auto px-4">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-6" data-tour="encyclopedia-search">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("fish-encyclopedia.s14")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 h-14 text-lg text-right"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap flex-1" data-tour="encyclopedia-filters">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="font-medium text-sm">{t("fish-encyclopedia.s15")}</span>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder={t("fish-encyclopedia.s16")} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">{t("fish-encyclopedia.s17")}</SelectItem>
                    <SelectItem value="community">{t("fish-encyclopedia.s18")}</SelectItem>
                    <SelectItem value="cichlid">{t("fish-encyclopedia.s19")}</SelectItem>
                    <SelectItem value="catfish">{t("fish-encyclopedia.s20")}</SelectItem>
                    <SelectItem value="tetra">{t("fish-encyclopedia.s21")}</SelectItem>
                    <SelectItem value="livebearer">{t("fish-encyclopedia.s22")}</SelectItem>
                    <SelectItem value="betta">{t("fish-encyclopedia.s23")}</SelectItem>
                    <SelectItem value="gourami">{t("fish-encyclopedia.s24")}</SelectItem>
                    <SelectItem value="goldfish">{t("fish-encyclopedia.s25")}</SelectItem>
                    <SelectItem value="other">{t("fish-encyclopedia.s26")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCareLevel} onValueChange={setSelectedCareLevel}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder={t("fish-encyclopedia.s27")} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">{t("fish-encyclopedia.s28")}</SelectItem>
                    <SelectItem value="beginner">{t("fish-encyclopedia.s29")}</SelectItem>
                    <SelectItem value="intermediate">{t("fish-encyclopedia.s30")}</SelectItem>
                    <SelectItem value="advanced">{t("fish-encyclopedia.s31")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTemperament} onValueChange={setSelectedTemperament}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder={t("fish-encyclopedia.s32")} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">{t("fish-encyclopedia.s33")}</SelectItem>
                    <SelectItem value="peaceful">{t("fish-encyclopedia.s34")}</SelectItem>
                    <SelectItem value="semi-aggressive">{t("fish-encyclopedia.s35")}</SelectItem>
                    <SelectItem value="aggressive">{t("fish-encyclopedia.s36")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTankSize} onValueChange={setSelectedTankSize}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder={t("fish-encyclopedia.s37")} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">{t("fish-encyclopedia.s38")}</SelectItem>
                    <SelectItem value="40">{t("fish-encyclopedia.s39")}</SelectItem>
                    <SelectItem value="80">{t("fish-encyclopedia.s40")}</SelectItem>
                    <SelectItem value="150">{t("fish-encyclopedia.s41")}</SelectItem>
                    <SelectItem value="200">{t("fish-encyclopedia.s42")}</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 ml-1" />
                    {t("fish-encyclopedia.s43")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("fish-encyclopedia.s44")}</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="name" className="text-right">{t("fish-encyclopedia.s45")}</SelectItem>
                    <SelectItem value="size">{t("fish-encyclopedia.s46")}</SelectItem>
                    <SelectItem value="care-easy">{t("fish-encyclopedia.s47")}</SelectItem>
                    <SelectItem value="care-hard">{t("fish-encyclopedia.s48")}</SelectItem>
                    <SelectItem value="tank-small">{t("fish-encyclopedia.s49")}</SelectItem>
                    <SelectItem value="tank-large">{t("fish-encyclopedia.s50")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("fish-encyclopedia.s51")} <span className="font-bold text-foreground">{filteredAndSortedFish.length}</span> {t("fish-encyclopedia.s52")}
                {hasActiveFilters && t("fish-encyclopedia.s53", { v0: freshwaterFish.length })}
              </p>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("fish-encyclopedia.s54")} {selectedCategory}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedCategory("all")}
                      />
                    </Badge>
                  )}
                  {selectedCareLevel !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("fish-encyclopedia.s55")} {selectedCareLevel}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedCareLevel("all")}
                      />
                    </Badge>
                  )}
                  {selectedTemperament !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("fish-encyclopedia.s56")} {selectedTemperament}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedTemperament("all")}
                      />
                    </Badge>
                  )}
                  {selectedTankSize !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("fish-encyclopedia.s57")} {selectedTankSize}{t("fish-encyclopedia.s58")}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedTankSize("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Fish Comparison Tool Section */}
      <section className="py-8 bg-muted/20">
        <div className="container mx-auto px-4">
          <FishComparisonTool />
        </div>
      </section>

      {/* Fish Grid */}
      <section className="py-12 flex-1">
        <div className="container mx-auto px-4">
          {filteredAndSortedFish.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Fish className="h-24 w-24 text-muted-foreground/20 mb-6" />
              <h3 className="text-2xl font-bold mb-2">{t("fish-encyclopedia.s59")}</h3>
              <p className="text-muted-foreground mb-6">
                {t("fish-encyclopedia.s60")}
              </p>
              <Button onClick={clearFilters}>{t("fish-encyclopedia.s61")}</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-tour="encyclopedia-grid">
              {filteredAndSortedFish.map((fish) => (
                <FishCard
                  key={fish.id}
                  fish={fish}
                  onClick={() => handleFishClick(fish)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <FishDetailModal
        fish={selectedFish}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />


      <BackToTop />    </div>
  );
}

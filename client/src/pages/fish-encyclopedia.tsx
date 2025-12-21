import { useState, useMemo } from "react";
import { MetaTags } from "@/components/seo/meta-tags";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
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
import { Search, SlidersHorizontal, X, Fish, BookOpen } from "lucide-react";
import { WaveScrollEffect } from "@/components/effects/wave-scroll-effect";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";

export default function FishEncyclopedia() {
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
        فشل في تحميل البيانات
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MetaTags
        title="موسوعة الأسماك"
        description="موسوعة شاملة لأنواع أسماك المياه العذبة مع معلومات تفصيلية عن الرعاية والتغذية والتكاثر"
        keywords={["أسماك", "موسوعة", "أحواض", "رعاية الأسماك", "أسماك المياه العذبة"]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-2 rounded-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <BookOpen className="h-5 w-5" />
              <span className="font-bold">موسوعة الأسماك الشاملة</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              اكتشف عالم الأسماك
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              موسوعة متكاملة لأكثر من {freshwaterFish.length} نوع من أسماك المياه العذبة
              بمعلومات تفصيلية ونصائح خبراء
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <WaveScrollEffect>
        <section className="py-8 bg-card border-b">
          <div className="container mx-auto px-4">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-6">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث بالاسم العربي، الإنجليزي، أو العلمي..."
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
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="font-medium text-sm">تصفية:</span>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">كل الفئات</SelectItem>
                    <SelectItem value="community">مجتمع</SelectItem>
                    <SelectItem value="cichlid">سيكلد</SelectItem>
                    <SelectItem value="catfish">سمك القراميط</SelectItem>
                    <SelectItem value="tetra">تترا</SelectItem>
                    <SelectItem value="livebearer">ولود</SelectItem>
                    <SelectItem value="betta">بيتا</SelectItem>
                    <SelectItem value="gourami">جورامي</SelectItem>
                    <SelectItem value="goldfish">ذهبية</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCareLevel} onValueChange={setSelectedCareLevel}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder="مستوى الرعاية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">كل المستويات</SelectItem>
                    <SelectItem value="beginner">مبتدئ</SelectItem>
                    <SelectItem value="intermediate">متوسط</SelectItem>
                    <SelectItem value="advanced">متقدم</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTemperament} onValueChange={setSelectedTemperament}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder="الطباع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">كل الطباع</SelectItem>
                    <SelectItem value="peaceful">سلمي</SelectItem>
                    <SelectItem value="semi-aggressive">شبه عدواني</SelectItem>
                    <SelectItem value="aggressive">عدواني</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTankSize} onValueChange={setSelectedTankSize}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue placeholder="حجم الحوض" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right">كل الأحجام</SelectItem>
                    <SelectItem value="40">حتى 40 لتر</SelectItem>
                    <SelectItem value="80">حتى 80 لتر</SelectItem>
                    <SelectItem value="150">حتى 150 لتر</SelectItem>
                    <SelectItem value="200">حتى 200 لتر</SelectItem>
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
                    مسح الكل
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ترتيب:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="name" className="text-right">الاسم (أ-ي)</SelectItem>
                    <SelectItem value="size">الحجم (صغير-كبير)</SelectItem>
                    <SelectItem value="care-easy">الأسهل رعاية</SelectItem>
                    <SelectItem value="care-hard">الأصعب رعاية</SelectItem>
                    <SelectItem value="tank-small">حوض صغير أولاً</SelectItem>
                    <SelectItem value="tank-large">حوض كبير أولاً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                عرض <span className="font-bold text-foreground">{filteredAndSortedFish.length}</span> نوع
                {hasActiveFilters && ` من أصل ${freshwaterFish.length}`}
              </p>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      فئة: {selectedCategory}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedCategory("all")}
                      />
                    </Badge>
                  )}
                  {selectedCareLevel !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      رعاية: {selectedCareLevel}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedCareLevel("all")}
                      />
                    </Badge>
                  )}
                  {selectedTemperament !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      طباع: {selectedTemperament}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedTemperament("all")}
                      />
                    </Badge>
                  )}
                  {selectedTankSize !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      حوض: حتى {selectedTankSize}ل
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
      </WaveScrollEffect>

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
              <h3 className="text-2xl font-bold mb-2">لم يتم العثور على نتائج</h3>
              <p className="text-muted-foreground mb-6">
                جرب تغيير معايير البحث أو الفلاتر
              </p>
              <Button onClick={clearFilters}>مسح الفلاتر</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

      <WhatsAppWidget />
      <BackToTop />
      <Footer />
    </div>
  );
}

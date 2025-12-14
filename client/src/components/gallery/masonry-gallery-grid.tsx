import Masonry from "react-masonry-css";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Heart, Info, Share2, Bookmark, X } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGallerySubmissions, voteGallerySubmission } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function MasonryGalleryGrid() {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGallerySubmissions
  });

  const likeMutation = useMutation({
    mutationFn: voteGallerySubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      toast.success("تم تسجيل إعجابك!");
    },
    onError: (err) => {
      toast.error("لقد قمت بالإعجاب بهذا بالفعل");
    }
  });

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    likeMutation.mutate(id);
  };

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl w-full" />)}
      </div>
    );
  }

  // Helper to fallback tags if missing (since DB might not have them)
  const getTags = (item: any) => {
    if (item.tags && Array.isArray(item.tags)) return item.tags;
    // Generate some dummy tags based on style if empty
    const defaultTags: Record<string, string[]> = {
      "Dutch Style": ["نباتات كثيفة", "ألوان زاهية", "بدون صخور"],
      "Nature Style": ["أمانو", "صخور", "خشب", "طبيعي"],
      "Iwagumi": ["صخور", "بساطة", "زن", "عشب"],
      "Biotope": ["نهر", "طبيعة", "سمك بري", "حقيقي"],
      "Jungle Style": ["وحشي", "كثيف", "سهل", "أخضر"]
    };
    return defaultTags[item.tankSize] || ["حوض سمك", "تصميم"];
  };

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="flex w-auto -ml-6"
      columnClassName="pl-6 bg-clip-padding"
    >
      {galleryItems.map((item: any) => (
        <div
          key={item.id}
          className="mb-6 group relative overflow-hidden rounded-2xl bg-muted shadow-md hover:shadow-xl transition-all duration-300 card-hover-lift gpu-accelerate"
        >
          <Dialog>
            <DialogTrigger asChild>
              <div
                className="cursor-pointer relative"
                role="button"
                aria-label={`عرض ${item.customerName}`}
                onClick={() => setActiveItem(item.id)}
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.customerName}
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />

                  {/* Hover Overlay */}
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]"
                  >
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 text-white font-medium flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      <span>عرض التفاصيل</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card border-t border-border/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg leading-none mb-2 group-hover:text-primary transition-colors">{item.customerName}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-500 px-2 h-auto py-1 rounded-md transition-colors z-10"
                      onClick={(e) => handleLike(item.id, e)}
                    >
                      <Heart className={`w-4 h-4 ${Boolean(likeMutation.isPending && activeItem === item.id) ? 'animate-pulse' : ''} fill-current text-red-500`} /> {item.likes}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogTrigger>

            <DialogContent
              className="max-w-6xl p-0 overflow-hidden bg-background border outline-none shadow-2xl rounded-3xl gap-0 h-[85vh] md:h-auto md:max-h-[85vh] flex flex-col md:flex-row"
            >
              {/* Image Section (Left/Top) */}
              <div className="relative w-full md:w-2/3 bg-black/5 dark:bg-black/40 flex items-center justify-center p-4 md:p-8 h-[40vh] md:h-full">
                <OptimizedImage
                  src={item.imageUrl}
                  alt={item.customerName}
                  className="w-full h-full object-contain rounded-lg shadow-lg"
                  priority={true}
                />
              </div>

              {/* Details Section (Right/Bottom) */}
              <div className="w-full md:w-1/3 flex flex-col h-full bg-card relative z-10 p-0">
                <ScrollArea className="flex-1">
                  <div className="p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-3xl font-extrabold text-foreground mb-2 flex items-center gap-2">
                        {item.customerName}
                        <Badge variant="secondary" className="text-xs font-normal px-2 bg-primary/10 text-primary border-primary/20">رائج</Badge>
                      </h2>
                      <p className="text-muted-foreground text-lg font-medium">{item.tankSize}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {getTags(item).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="rounded-full px-3 py-1 border-primary/20 text-foreground/80 hover:bg-primary/5 cursor-default transition-colors">#{tag}</Badge>
                      ))}
                    </div>

                    {/* Detailed Description */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                      <p className="text-foreground/90 leading-relaxed text-sm md:text-base whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>

                    {/* Stats & Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/20 p-3 rounded-lg text-center border border-border/50">
                        <span className="block text-2xl font-bold text-foreground">{item.likes}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">إعجاب</span>
                      </div>
                      <div className="bg-muted/20 p-3 rounded-lg text-center border border-border/50">
                        <span className="block text-2xl font-bold text-foreground">5.0</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">تقييم</span>
                      </div>
                    </div>

                  </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                      onClick={(e) => handleLike(item.id, e)}
                      disabled={likeMutation.isPending}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${likeMutation.isPending ? 'animate-spin' : ''}`} /> إعجاب
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </Masonry>
  );
}

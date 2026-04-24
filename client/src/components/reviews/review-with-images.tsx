import { Star, ThumbsUp, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ReviewImage {
  id: string;
  url: string;
}

interface ReviewProps {
  id: string;
  author: string;
  authorTier?: string;
  avatar?: string;
  rating: number;
  date: string;
  content: string;
  images?: ReviewImage[];
  verifiedPurchase?: boolean;
  helpfulCount?: number;
}

const tierBadgeConfig: Record<string, { label: string; className: string }> = {
  bronze: { label: "برونزي", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  silver: { label: "فضي", className: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
  gold: { label: "ذهبي", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  diamond: { label: "ماسي", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
};

export function ReviewWithImages({ review }: { review: ReviewProps }) {
  const tier = tierBadgeConfig[review.authorTier || "bronze"] || tierBadgeConfig.bronze;

  return (
    <Card className="border-none shadow-none bg-muted/30 mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={review.avatar} />
              <AvatarFallback>{review.author[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm">{review.author}</h4>
                <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 ${tier.className}`}>
                  {tier.label}
                </Badge>
                {review.verifiedPurchase && (
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1 px-1.5 bg-green-100 text-green-700 hover:bg-green-200">
                    <ShieldCheck className="w-3 h-3" /> شراء مؤكد
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} 
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed mb-4">{review.content}</p>
        
        {review.images && review.images.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex w-max space-x-2">
              {review.images.map((img) => (
                <Dialog key={img.id}>
                  <DialogTrigger asChild>
                    <div className="relative w-24 h-24 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                      <img 
                        src={img.url} 
                        alt="Review" 
                        className="object-cover w-full h-full" 
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl border-none bg-transparent shadow-none p-0">
                    <img 
                      src={img.url} 
                      alt="Review Full" 
                      className="rounded-lg w-full h-auto max-h-[80vh] object-contain" 
                    />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            <ThumbsUp className="w-3 h-3" /> مفيد ({review.helpfulCount || 0})
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

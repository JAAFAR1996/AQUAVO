import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Heart, Trophy, Camera, Award, Crown, Star, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { GALLERY_ENTRY_TERMS, GALLERY_PRIZES } from "@shared/gallery-terms";

/** Decoration only; the prize wording is shared with the crawler view. */
const PRIZE_ICONS = ["🏆", "⭐", "📱", "👑"];
import { Link } from "wouter";
import { addCsrfHeader } from "@/lib/csrf";
import { useTranslation } from "react-i18next";

interface GallerySubmission {
  id: string;
  customerName: string;
  customerPhone: string;
  imageUrl: string;
  tankSize: string;
  description: string;
  likes: number;
  isWinner: boolean;
  winnerMonth?: string;
  prize?: string;
  createdAt: string; // Changed from submittedAt to match schema
  isApproved: boolean; // Changed from approved to match schema
}

export default function CommunityGallery() {
  const { t } = useTranslation("tools");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    tankSize: "",
    description: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Auto-fill name from logged-in user
  useEffect(() => {
    if (user?.fullName && !formData.customerName) {
      setFormData(prev => ({ ...prev, customerName: user.fullName! }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.fullName]);

  const { data: submissions = [], isLoading } = useQuery<GallerySubmission[]>({
    queryKey: ["/api/gallery"],
  });

  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/gallery/${id}/like`, {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    }
  });

  const submitMutation = useMutation({
    mutationFn: async ({ fields, file }: { fields: typeof formData; file: File }) => {
      const body = new FormData();
      body.append("image", file);
      body.append("customerName", fields.customerName);
      body.append("customerPhone", fields.customerPhone);
      body.append("tankSize", fields.tankSize);
      body.append("description", fields.description);

      // Do NOT set Content-Type — browser sets it automatically with the correct boundary
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: addCsrfHeader(), // CSRF only, no Content-Type
        credentials: "include",
        body,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to submit";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch { }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("community-gallery.s1"),
        description: t("community-gallery.s2"),
      });
      setIsUploadOpen(false);
      setFormData({
        customerName: "",
        customerPhone: "",
        tankSize: "",
        description: ""
      });
      setImageFile(null);
      setImagePreview("");
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (error) => {
      console.error("Gallery Upload Error:", error);
      toast({
        title: t("community-gallery.s3"),
        description: error instanceof Error ? error.message : t("community-gallery.s4"),
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      toast({
        title: t("community-gallery.s5"),
        description: t("community-gallery.s6"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("community-gallery.s7"),
        description: t("community-gallery.s8"),
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone || !imageFile) {
      toast({
        title: t("community-gallery.s9"),
        description: t("community-gallery.s10"),
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({ fields: formData, file: imageFile });
  };

  const winner = submissions.find(s => s.isWinner && s.isApproved);
  const approvedSubmissions = submissions.filter(s => s.isApproved && !s.isWinner);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-2 rounded-full text-primary font-bold">
            <Camera className="h-5 w-5" />
            <span>{t("community-gallery.s11")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            {t("community-gallery.s12")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("community-gallery.s13")}
          </p>

          {/* Upload Button - Conditional */}
          {user ? (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2" data-tour="gallery-upload">
                  <Upload className="h-5 w-5" />
                  {t("community-gallery.s14")}
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-2xl"
                onEscapeKeyDown={(e) => { if (imageFile || formData.customerName) e.preventDefault(); }}
                onInteractOutside={(e) => { if (imageFile || formData.customerName) e.preventDefault(); }}
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t("community-gallery.s15")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <Label>{t("community-gallery.s16")}</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-64 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              URL.revokeObjectURL(imagePreview);
                              setImagePreview("");
                              setImageFile(null);
                            }}
                          >
                            {t("community-gallery.s17")}
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">{t("community-gallery.s18")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <Label htmlFor="name">{t("community-gallery.s19")}</Label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder={t("community-gallery.s20")}
                      required
                    />
                  </div>

                  {/* Phone — optional */}
                  <div>
                    <Label htmlFor="phone">{t("community-gallery.s21")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="+964 770 000 0000"
                      required
                    />
                  </div>

                  {/* Tank Size */}
                  <div>
                    <Label htmlFor="tankSize">{t("community-gallery.s22")}</Label>
                    <Input
                      id="tankSize"
                      value={formData.tankSize}
                      onChange={(e) => setFormData(prev => ({ ...prev, tankSize: e.target.value }))}
                      placeholder={t("community-gallery.s23")}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">{t("community-gallery.s24")}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t("community-gallery.s25")}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? t("community-gallery.s26") : t("community-gallery.s27")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">{t("community-gallery.s28")}</p>
              <Link href="/login">
                <Button variant="outline" size="lg" data-tour="gallery-upload">{t("community-gallery.s29")}</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Current Winner */}
        {winner && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border-2 border-yellow-500/50 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Crown className="h-12 w-12 text-yellow-500" />
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-center">
                <img
                  src={winner.imageUrl}
                  alt={t("community-gallery.s30", { v0: winner.customerName })}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-80 object-cover rounded-xl shadow-2xl"
                />

                <div className="space-y-4">
                  <Badge className="bg-yellow-500 text-white text-lg px-4 py-2">
                    <Trophy className="h-5 w-5 mr-2" />
                    {t("community-gallery.s31")} {winner.winnerMonth}
                  </Badge>

                  <h2 className="text-3xl font-bold">
                    {winner.customerName}
                  </h2>

                  {winner.tankSize && (
                    <p className="text-muted-foreground">
                      {t("community-gallery.s32")} <span className="font-bold text-foreground">{winner.tankSize}</span>
                    </p>
                  )}

                  {winner.description && (
                    <p className="text-muted-foreground leading-relaxed">
                      {winner.description}
                    </p>
                  )}

                  {winner.prize && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="font-bold">{t("community-gallery.s33")}</span>
                      </div>
                      <p className="text-lg font-bold text-primary">{winner.prize}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                      <span>{winner.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div data-tour="gallery-grid">
          <h2 className="text-2xl font-bold mb-6">{t("community-gallery.s34")}</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-64 bg-muted"></div>
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : approvedSubmissions.length === 0 ? (
            <Card className="p-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t("community-gallery.s35")}</h3>
              <p className="text-muted-foreground mb-4">{t("community-gallery.s36")}</p>
              <Button onClick={() => setIsUploadOpen(true)}>
                {t("community-gallery.s37")}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedSubmissions.map((submission) => (
                <Card key={submission.id} className="group overflow-hidden hover:shadow-lg transition-all">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={submission.imageUrl}
                      alt={t("community-gallery.s30", { v0: submission.customerName })}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-1">{submission.customerName}</h3>
                    {submission.tankSize && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("community-gallery.s38")} {submission.tankSize}
                      </p>
                    )}
                    {submission.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {submission.description}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => likeMutation.mutate(submission.id)}
                    >
                      <Heart className="h-4 w-4" />
                      <span>{submission.likes}</span>
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Rules Section */}
        <div className="mt-16 bg-muted/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            {t("community-gallery.s39")}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">{t("community-gallery.s40")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {GALLERY_ENTRY_TERMS.map((term) => (
                  <li key={term} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3">{t("community-gallery.s41")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {GALLERY_PRIZES.map((prize, index) => (
                  <li key={prize} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">{PRIZE_ICONS[index]}</span>
                    <span>{prize}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

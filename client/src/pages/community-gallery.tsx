import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useState } from "react";
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
import { Link } from "wouter";
import { addCsrfHeader } from "@/lib/csrf";

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    imageUrl: "",
    tankSize: "",
    description: ""
  });
  const [imagePreview, setImagePreview] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        imageBase64: data.imageUrl // Server expects imageBase64
      };

      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload)
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
        title: "تم الإرسال بنجاح",
        description: "صورتك قيد المراجعة. سيتم عرضها بعد الموافقة من الإدارة.",
      });
      setIsUploadOpen(false);
      setFormData({
        customerName: "",
        customerPhone: "",
        imageUrl: "",
        tankSize: "",
        description: ""
      });
      setImagePreview("");
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (error) => {
      console.error("Gallery Upload Error:", error);
      toast({
        title: "❌ خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الصورة. حاول مرة أخرى.",
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "نوع الملف غير مدعوم",
          description: "الرجاء رفع ملف صورة.",
          variant: "destructive"
        });
        return;
      }

      try {
        const { compressImage } = await import("@/lib/image-utils");
        // Compress to 4MB max for Vercel
        const base64 = await compressImage(file, 4);

        setImagePreview(base64);
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
      } catch (error) {
        console.error("Error processing image:", error);
        toast({
          title: "خطأ في معالجة الصورة",
          description: "لم نتمكن من معالجة الصورة. يرجى المحاولة مرة أخرى.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone || !formData.imageUrl) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    submitMutation.mutate(formData);
  };

  const winner = submissions.find(s => s.isWinner && s.isApproved);
  const approvedSubmissions = submissions.filter(s => s.isApproved && !s.isWinner);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-2 rounded-full text-primary font-bold">
            <Camera className="h-5 w-5" />
            <span>ألبوم العائلة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            شاركنا إبداعك في ألبوم العائلة! 📸
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            اعرض حوض أسماكك الرائع، احصل على إعجابات، وتنافس للفوز بجوائز شهرية من AQUAVO!
          </p>

          {/* Upload Button - Conditional */}
          {user ? (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  أضف صورة للألبوم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">شارك حوض أسماكك في ألبوم العائلة</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <Label>صورة الحوض *</Label>
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
                              setImagePreview("");
                              setFormData(prev => ({ ...prev, imageUrl: "" }));
                            }}
                          >
                            إزالة
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">اضغط لرفع صورة (حتى 5MB)</span>
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
                    <Label htmlFor="name">اسمك *</Label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="محمد أحمد"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone">رقم الهاتف *</Label>
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
                    <Label htmlFor="tankSize">حجم الحوض</Label>
                    <Input
                      id="tankSize"
                      value={formData.tankSize}
                      onChange={(e) => setFormData(prev => ({ ...prev, tankSize: e.target.value }))}
                      placeholder="مثال: 200 لتر"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">وصف الحوض</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="أخبرنا عن حوضك: الأسماك، النباتات، المعدات..."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? "جاري الإرسال..." : "إرسال"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">سجل دخولك لتتمكن من مشاركة صور حوضك مع العائلة</p>
              <Link href="/login">
                <Button variant="outline" size="lg">تسجيل الدخول للمشاركة</Button>
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
                  alt={`حوض ${winner.customerName}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-80 object-cover rounded-xl shadow-2xl"
                />

                <div className="space-y-4">
                  <Badge className="bg-yellow-500 text-white text-lg px-4 py-2">
                    <Trophy className="h-5 w-5 mr-2" />
                    الفائز لشهر {winner.winnerMonth}
                  </Badge>

                  <h2 className="text-3xl font-bold">
                    {winner.customerName}
                  </h2>

                  {winner.tankSize && (
                    <p className="text-muted-foreground">
                      حجم الحوض: <span className="font-bold text-foreground">{winner.tankSize}</span>
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
                        <span className="font-bold">الجائزة:</span>
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
        <div>
          <h2 className="text-2xl font-bold mb-6">معرض الأحواض</h2>

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
              <h3 className="text-xl font-bold mb-2">لا توجد صور بعد</h3>
              <p className="text-muted-foreground mb-4">كن أول من يشارك حوضه الرائع!</p>
              <Button onClick={() => setIsUploadOpen(true)}>
                ارفع أول صورة
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedSubmissions.map((submission) => (
                <Card key={submission.id} className="group overflow-hidden hover:shadow-lg transition-all">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={submission.imageUrl}
                      alt={`حوض ${submission.customerName}`}
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
                        الحجم: {submission.tankSize}
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
            شروط المسابقة والجوائز
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">📋 الشروط:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>الصورة يجب أن تكون لحوض أسماك حقيقي تملكه</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>جودة الصورة واضحة (دقة عالية)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>يمكنك المشاركة مرة واحدة شهرياً</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>الصور تخضع للمراجعة قبل النشر</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>الفائز يُختار من قبل إدارة AQUAVO</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3">🎁 الجوائز:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">🏆</span>
                  <span>كوبون خصم على المنتجات (تحدده الإدارة)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">⭐</span>
                  <span>عرض صورتك واسمك في الصفحة الرئيسية</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">📱</span>
                  <span>مشاركة حوضك على حسابات AQUAVO</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">👑</span>
                  <span>شهادة "أفضل حوض الشهر"</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

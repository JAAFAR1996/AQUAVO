import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Crown, Heart, Trophy, Tag, Percent, Trash2, Clock } from "lucide-react";
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
  createdAt: string;
  isApproved: boolean;
}

interface GalleryPrize {
  month: string;
  prize: string;
  discountCode?: string;
  discountPercentage?: number;
}

export function GalleryManagement() {
  const [isPrizeDialogOpen, setIsPrizeDialogOpen] = useState(false);
  const [prizeData, setPrizeData] = useState({
    prize: "",
    discountCode: "",
    discountPercentage: 20
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery<GallerySubmission[]>({
    queryKey: ["/api/admin/gallery/submissions"],
  });

  const { data: currentPrize } = useQuery<GalleryPrize>({
    queryKey: ["/api/gallery/prize"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/gallery/approve/${id}`, {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery/submissions"] });
      toast({ title: "✅ تمت الموافقة", description: "تم نشر الصورة في المعرض" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/gallery/reject/${id}`, {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery/submissions"] });
      toast({ title: "🗑️ تم الرفض", description: "تم حذف الصورة" });
    }
  });

  const setWinnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/gallery/set-winner/${id}`, {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          couponCode: currentPrize?.discountCode || ""
        }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to set winner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/submissions"] });
      toast({
        title: "👑 تم اختيار الفائز!",
        description: "سيظهر الفائز الآن في المعرض والصفحة الرئيسية"
      });
    }
  });

  const updatePrizeMutation = useMutation({
    mutationFn: async (data: typeof prizeData) => {
      const res = await fetch("/api/admin/gallery/prize", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to update prize");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/prize"] });
      toast({ title: "🎁 تم تحديث الجائزة", description: "الجائزة الجديدة جاهزة!" });
      setIsPrizeDialogOpen(false);
    }
  });

  const deleteWinnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/gallery/winner/${id}`, {
        method: "DELETE",
        headers: addCsrfHeader(),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete winner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/submissions"] });
      toast({
        title: "🗑️ تم حذف الفائز",
        description: "تم حذف الفائز وصورته بنجاح"
      });
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل في حذف الفائز",
        variant: "destructive"
      });
    }
  });

  const pending = submissions.filter(s => !s.isApproved && !s.isWinner);
  const approved = submissions.filter(s => s.isApproved && !s.isWinner);
  // Get the current month to identify the current winner
  const currentMonth = new Date().toISOString().slice(0, 7);
  const winners = submissions.filter(s => s.isWinner);
  const winner = winners.find(s => s.winnerMonth === currentMonth) || winners[0];
  const pastWinners = winners.filter(s => s.id !== winner?.id);

  return (
    <div className="space-y-6">
      {/* Prize Management */}
      <Card className="bg-gradient-to-r from-[var(--aqv-warning)]/10 to-[var(--aqv-warning)]/10 border-[var(--aqv-warning)]/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[var(--aqv-warning)]" />
                الجائزة الحالية
              </h3>
              {currentPrize && (
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">الشهر:</span> {currentPrize.month}</p>
                  <p><span className="font-semibold">الجائزة:</span> {currentPrize.prize}</p>
                  {currentPrize.discountCode && (
                    <p className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span className="font-mono bg-[var(--aqv-warning)]/20 px-2 py-0.5 rounded">
                        {currentPrize.discountCode}
                      </span>
                      <Badge className="bg-[var(--aqv-warning)]">{currentPrize.discountPercentage}%</Badge>
                    </p>
                  )}
                </div>
              )}
            </div>

            <Dialog open={isPrizeDialogOpen} onOpenChange={setIsPrizeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Trophy className="mr-2 h-4 w-4" />
                  تحديث الجائزة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تحديث جائزة الشهر</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>الجائزة</Label>
                    <Input
                      value={prizeData.prize}
                      onChange={(e) => setPrizeData(prev => ({ ...prev, prize: e.target.value }))}
                      placeholder="مثال: كوبون خصم 20%"
                    />
                  </div>

                  <div>
                    <Label>كود الخصم</Label>
                    <Input
                      value={prizeData.discountCode}
                      onChange={(e) => setPrizeData(prev => ({ ...prev, discountCode: e.target.value }))}
                      placeholder="مثال: GALLERY20"
                    />
                  </div>

                  <div>
                    <Label>نسبة الخصم (%)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={prizeData.discountPercentage}
                      onChange={(e) => setPrizeData(prev => ({ ...prev, discountPercentage: Number(e.target.value) }))}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => updatePrizeMutation.mutate(prizeData)}
                    disabled={updatePrizeMutation.isPending}
                  >
                    {updatePrizeMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Current Winner */}
      {winner && (
        <Card className="border-[var(--aqv-warning)]/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-[var(--aqv-warning)]" />
              <h3 className="text-lg font-bold">الفائز الحالي</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-center">
              <img
                src={winner.imageUrl}
                alt={winner.customerName}
                className="w-full h-48 object-cover rounded-lg"
              />

              <div className="space-y-2">
                <p><span className="font-semibold">الاسم:</span> {winner.customerName}</p>
                <p><span className="font-semibold">الهاتف:</span> {winner.customerPhone}</p>
                {winner.tankSize && <p><span className="font-semibold">حجم الحوض:</span> {winner.tankSize}</p>}
                <p><span className="font-semibold">الإعجابات:</span> <Heart className="inline h-4 w-4 text-red-500" /> {winner.likes}</p>
                <Badge className="bg-[var(--aqv-warning)]">{winner.prize}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Submissions */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4">في انتظار الموافقة ({pending.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((submission) => (
              <Card key={submission.id} className="overflow-hidden">
                <img
                  src={submission.imageUrl}
                  alt={submission.customerName}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-bold">{submission.customerName}</p>
                    <p className="text-sm text-muted-foreground">{submission.customerPhone}</p>
                    {submission.tankSize && (
                      <p className="text-sm text-muted-foreground">الحجم: {submission.tankSize}</p>
                    )}
                  </div>

                  {submission.description && (
                    <p className="text-sm line-clamp-2">{submission.description}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(submission.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => rejectMutation.mutate(submission.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      رفض
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-[var(--aqv-warning)] text-[var(--aqv-warning)] hover:bg-[var(--aqv-warning)]/10"
                    onClick={() => setWinnerMutation.mutate(submission.id)}
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    اختيار كفائز
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Submissions */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4">معتمد ({approved.length})</h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {approved.map((submission) => (
              <Card key={submission.id} className="overflow-hidden group">
                <img
                  src={submission.imageUrl}
                  alt={submission.customerName}
                  className="w-full h-32 object-cover"
                />
                <CardContent className="p-3">
                  <p className="font-bold text-sm">{submission.customerName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span>{submission.likes}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-[var(--aqv-warning)] text-[var(--aqv-warning)] hover:bg-[var(--aqv-warning)]/10"
                    onClick={() => setWinnerMutation.mutate(submission.id)}
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    فائز
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Winners Section */}
      {pastWinners.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            الفائزون السابقون ({pastWinners.length})
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastWinners.map((pastWinner) => (
              <Card key={pastWinner.id} className="overflow-hidden border-muted">
                <img
                  src={pastWinner.imageUrl}
                  alt={pastWinner.customerName}
                  className="w-full h-32 object-cover opacity-80"
                />
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{pastWinner.customerName}</p>
                      {pastWinner.winnerMonth && (
                        <p className="text-xs text-muted-foreground">{pastWinner.winnerMonth}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      فائز سابق
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span>{pastWinner.likes}</span>
                    {pastWinner.prize && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{pastWinner.prize}</span>
                      </>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full mt-3"
                        disabled={deleteWinnerMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        حذف الفائز وصورته
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف الفائز "{pastWinner.customerName}" وصورته نهائياً.
                          لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteWinnerMutation.mutate(pastWinner.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف نهائياً
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      )}

      {!isLoading && pending.length === 0 && approved.length === 0 && !winner && (
        <Card className="p-12 text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">لا توجد صور بعد</h3>
          <p className="text-muted-foreground">في انتظار أول مشاركة من العملاء</p>
        </Card>
      )}
    </div>
  );
}

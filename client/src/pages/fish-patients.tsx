/**
 * 🐟 صفحة سجل الأسماك — Fish Patient Records
 * =============================================
 * Allows users to register their fish, view medical history,
 * and track follow-up appointments.
 */

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Fish, Plus, Calendar, Activity, AlertTriangle, CheckCircle, Clock,
  Stethoscope, ChevronLeft, Heart, Droplets, Thermometer, X
} from "lucide-react";
import { useLocation } from "wouter";

// ── Types ──
interface FishPatient {
  id: string;
  name: string;
  species?: string;
  scientificName?: string;
  age?: string;
  gender?: string;
  tankSize?: string;
  waterType?: string;
  photoUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface MedicalRecord {
  id: string;
  fishPatientId: string;
  diagnosis?: string;
  arabicDiagnosis?: string;
  confidence?: string;
  category?: string;
  symptoms?: string[];
  treatment?: string[];
  waterParams?: {
    temperature?: string;
    ph?: string;
    ammonia?: string;
    nitrite?: string;
    nitrate?: string;
  };
  userNotes?: string;
  outcome?: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
  imageUrl?: string;
  createdAt: string;
}

interface FollowUp {
  recordId: string;
  fishId: string;
  fishName: string;
  species?: string;
  diagnosis: string;
  followUpDate: string;
  daysUntil: number;
  isOverdue: boolean;
}

// ── Component ──
export default function FishPatients() {
  const [, navigate] = useLocation();
  const [patients, setPatients] = useState<FishPatient[]>([]);
  const [selectedFish, setSelectedFish] = useState<FishPatient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch patients ──
  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/fish-patients");
      if (res.status === 401) {
        setError("يجب تسجيل الدخول لعرض سجل أسماكك");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) setPatients(data.data || []);
    } catch {
      setError("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch follow-ups ──
  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await fetch("/api/fish-patients/follow-ups/pending");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setFollowUps(data.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch medical records for a fish ──
  const fetchRecords = useCallback(async (fishId: string) => {
    try {
      const res = await fetch(`/api/fish-patients/${fishId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedFish(data.data.patient);
        setRecords(data.data.records || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchFollowUps();
  }, [fetchPatients, fetchFollowUps]);

  // ── Add new fish ──
  const handleAddFish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/fish-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          species: formData.get("species") || undefined,
          age: formData.get("age") || undefined,
          gender: formData.get("gender") || undefined,
          tankSize: formData.get("tankSize") || undefined,
          waterType: formData.get("waterType") || undefined,
          notes: formData.get("notes") || undefined,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        fetchPatients();
      }
    } catch { /* ignore */ }
  };

  // ── Mark follow-up complete ──
  const completeFollowUp = async (fishId: string, recordId: string) => {
    try {
      await fetch(`/api/fish-patients/${fishId}/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpCompleted: true }),
      });
      fetchFollowUps();
      if (selectedFish) fetchRecords(selectedFish.id);
    } catch { /* ignore */ }
  };

  // ── Category colors ──
  const categoryColor: Record<string, string> = {
    parasitic: "bg-red-500/20 text-red-300 border-red-500/30",
    bacterial: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    fungal: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    viral: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    environmental: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    nutritional: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    physical: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    healthy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  const outcomeLabels: Record<string, { text: string; color: string }> = {
    recovered: { text: "✅ تعافى", color: "text-emerald-400" },
    worsened: { text: "⚠️ ساءت", color: "text-red-400" },
    stable: { text: "📊 مستقر", color: "text-yellow-400" },
    died: { text: "💀 نفق", color: "text-red-600" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl" dir="rtl">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 px-6 py-2 rounded-full border border-cyan-500/20 mb-4">
            <Stethoscope className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-medium">سجل طبي ذكي</span>
          </div>
          <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            🐟 سجل أسماكي
          </h1>
          <p className="text-slate-400 text-lg">سجّل أسماكك وتابع صحتها — Dr. AQUAVO يتذكر كل شيء!</p>
        </div>

        {/* ── Follow-Up Alerts ── */}
        {followUps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              متابعات قادمة ({followUps.length})
            </h2>
            <div className="space-y-3">
              {followUps.map(fu => (
                <div
                  key={fu.recordId}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    fu.isOverdue
                      ? "bg-red-500/10 border-red-500/30"
                      : fu.daysUntil <= 2
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-cyan-500/10 border-cyan-500/30"
                  }`}
                >
                  <div>
                    <p className="font-bold text-white">
                      {fu.isOverdue ? "🚨" : fu.daysUntil <= 2 ? "⚠️" : "📅"} {fu.fishName}
                      {fu.species && <span className="text-slate-400 text-sm mr-2">({fu.species})</span>}
                    </p>
                    <p className="text-sm text-slate-300">{fu.diagnosis}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {fu.isOverdue
                        ? `متأخرة بـ ${Math.abs(fu.daysUntil)} يوم!`
                        : fu.daysUntil === 0
                        ? "اليوم!"
                        : `بعد ${fu.daysUntil} ${fu.daysUntil === 1 ? "يوم" : "أيام"}`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                      onClick={() => navigate("/fish-health-diagnosis")}
                    >
                      🔬 فحص جديد
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/10"
                      onClick={() => completeFollowUp(fu.fishId, fu.recordId)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 ml-1" /> تم
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error / Login required ── */}
        {error && (
          <div className="text-center py-16">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{error}</h2>
            <Button className="bg-cyan-600 hover:bg-cyan-500 mt-4" onClick={() => navigate("/login")}>
              تسجيل الدخول
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && !error && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">جاري التحميل...</p>
          </div>
        )}

        {/* ── Fish Detail View ── */}
        {selectedFish ? (
          <div>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white mb-4"
              onClick={() => { setSelectedFish(null); setRecords([]); }}
            >
              <ChevronLeft className="w-4 h-4 ml-1" /> رجوع للقائمة
            </Button>

            {/* Fish Info Card */}
            <Card className="bg-slate-800/50 border-slate-700/50 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20">
                      <Fish className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">{selectedFish.name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {selectedFish.species && `${selectedFish.species}`}
                        {selectedFish.age && ` • ${selectedFish.age}`}
                        {selectedFish.gender && ` • ${selectedFish.gender}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={selectedFish.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}>
                    {selectedFish.isActive ? "🟢 نشطة" : "🔴 غير نشطة"}
                  </Badge>
                </div>
              </CardHeader>
              {(selectedFish.tankSize || selectedFish.waterType || selectedFish.notes) && (
                <CardContent className="pt-0">
                  <div className="flex gap-4 flex-wrap text-sm text-slate-400">
                    {selectedFish.tankSize && <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" /> {selectedFish.tankSize}</span>}
                    {selectedFish.waterType && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" /> {selectedFish.waterType}</span>}
                  </div>
                  {selectedFish.notes && <p className="text-sm text-slate-500 mt-2">{selectedFish.notes}</p>}
                </CardContent>
              )}
            </Card>

            {/* Medical Timeline */}
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              السجل الطبي ({records.length} زيارة)
            </h3>

            {records.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">لا يوجد سجلات طبية بعد</p>
                <Button className="bg-cyan-600 hover:bg-cyan-500 mt-4" onClick={() => navigate("/fish-health-diagnosis")}>
                  🔬 أول فحص
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((rec, i) => {
                  const date = new Date(rec.createdAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
                  const catClass = categoryColor[rec.category || "healthy"] || categoryColor.healthy;
                  const outcome = rec.outcome ? outcomeLabels[rec.outcome] : null;

                  return (
                    <div key={rec.id} className="relative">
                      {/* Timeline line */}
                      {i < records.length - 1 && (
                        <div className="absolute top-12 right-5 w-0.5 h-full bg-slate-700/50" />
                      )}

                      <Card className="bg-slate-800/40 border-slate-700/40 hover:border-cyan-500/20 transition-colors">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-sm">
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">
                                  {rec.arabicDiagnosis || rec.diagnosis || "فحص عام"}
                                </p>
                                <p className="text-xs text-slate-500">{date}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {rec.category && (
                                <Badge className={`${catClass} text-xs border`}>
                                  {rec.category}
                                </Badge>
                              )}
                              {rec.confidence && (
                                <Badge className="bg-slate-700/50 text-slate-300 text-xs">
                                  {(parseFloat(rec.confidence) * 100).toFixed(0)}%
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Symptoms */}
                          {rec.symptoms && rec.symptoms.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-slate-500 mb-1">الأعراض:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {rec.symptoms.map((s, j) => (
                                  <span key={j} className="text-xs bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Treatment */}
                          {rec.treatment && rec.treatment.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-slate-500 mb-1">العلاج:</p>
                              <ul className="text-sm text-slate-300 list-disc list-inside space-y-0.5">
                                {rec.treatment.slice(0, 3).map((t, j) => (
                                  <li key={j}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Outcome + Follow-up */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
                            <div className="flex gap-3">
                              {outcome && (
                                <span className={`text-sm font-medium ${outcome.color}`}>{outcome.text}</span>
                              )}
                              {rec.userNotes && (
                                <span className="text-xs text-slate-500">📝 {rec.userNotes}</span>
                              )}
                            </div>
                            {rec.followUpDate && !rec.followUpCompleted && (
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                                <Clock className="w-3 h-3 ml-1" />
                                متابعة: {new Date(rec.followUpDate).toLocaleDateString("ar-IQ")}
                              </Badge>
                            )}
                            {rec.followUpCompleted && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">✅ تمت المتابعة</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Fish List View ── */
          !loading && !error && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  أسماكي ({patients.filter(p => p.isActive).length})
                </h2>
                <Button
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white gap-2"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4" /> سجّل سمكة جديدة
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <Card className="bg-slate-800/60 border-cyan-500/20 mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">🐟 سجّل سمكة جديدة</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddFish} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">اسم السمكة *</label>
                          <input
                            name="name"
                            required
                            placeholder='مثال: "نيمو"'
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">النوع</label>
                          <input
                            name="species"
                            placeholder="مثال: Betta, Guppy..."
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">العمر</label>
                          <input
                            name="age"
                            placeholder="مثال: 6 أشهر"
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">الجنس</label>
                          <select
                            name="gender"
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                          >
                            <option value="">غير محدد</option>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">حجم الحوض</label>
                          <input
                            name="tankSize"
                            placeholder="مثال: 60 لتر"
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">نوع الماء</label>
                          <select
                            name="waterType"
                            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                          >
                            <option value="">غير محدد</option>
                            <option value="عذبة">عذبة (Freshwater)</option>
                            <option value="مالحة">مالحة (Saltwater)</option>
                            <option value="شبه مالحة">شبه مالحة (Brackish)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">ملاحظات</label>
                        <textarea
                          name="notes"
                          rows={2}
                          placeholder="أي ملاحظة عن سمكتك..."
                          className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold py-2.5">
                        ✅ سجّل السمكة
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Fish Grid */}
              {patients.filter(p => p.isActive).length === 0 ? (
                <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                  <Fish className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-400 mb-2">لا يوجد أسماك مسجلة بعد</h3>
                  <p className="text-slate-500 mb-6">سجّل أول سمكة وابدأ تتابع صحتها!</p>
                  <Button
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white gap-2"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="w-4 h-4" /> سجّل أول سمكة
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.filter(p => p.isActive).map(fish => (
                    <Card
                      key={fish.id}
                      className="bg-slate-800/40 border-slate-700/40 hover:border-cyan-500/30 cursor-pointer transition-all group hover:shadow-lg hover:shadow-cyan-500/5"
                      onClick={() => fetchRecords(fish.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
                            <Fish className="w-7 h-7 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg group-hover:text-cyan-300 transition-colors">{fish.name}</h3>
                            <p className="text-sm text-slate-400">{fish.species || "نوع غير محدد"}</p>
                          </div>
                        </div>

                        <Separator className="opacity-20 mb-3" />

                        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                          {fish.age && <span>📅 {fish.age}</span>}
                          {fish.gender && <span>👤 {fish.gender}</span>}
                          {fish.tankSize && <span>🐠 {fish.tankSize}</span>}
                          {fish.waterType && <span>💧 {fish.waterType}</span>}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          مسجلة: {new Date(fish.createdAt).toLocaleDateString("ar-IQ")}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Link to diagnosis */}
              <div className="mt-10 text-center">
                <Separator className="opacity-20 mb-6" />
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white gap-2 text-lg py-6 px-8"
                  onClick={() => navigate("/fish-health-diagnosis")}
                >
                  <Stethoscope className="w-5 h-5" /> فحص سمكة بالذكاء الاصطناعي 🤖
                </Button>
              </div>
            </div>
          )
        )}
      </main>

      <Footer />
    </div>
  );
}

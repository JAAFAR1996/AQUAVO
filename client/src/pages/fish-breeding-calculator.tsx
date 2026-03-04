import { useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Heart,
  Fish,
  Baby,
  Calendar,
  Thermometer,
  Droplets,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Beaker,
  Scale,
  Download,
  Mail,
  Snail,
  Settings,
  Utensils,
  Stethoscope,
  Mountain,
  ShoppingCart
} from "lucide-react";
import { breedingSpecies, type BreedingSpecies, type FryGrowthStage } from "@/data/breeding-data";
import { toast } from "sonner";
import { addCsrfHeader } from "@/lib/csrf";
import { generateBreedingPDF } from "@/lib/pdf-generator";

export default function FishBreedingCalculator() {
  const [, setLocation] = useLocation();
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [numberOfPairs, setNumberOfPairs] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentTemp, setCurrentTemp] = useState<number>(26);
  const [currentPH, setCurrentPH] = useState<number>(7.0);

  // Email state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // PDF download state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const species = breedingSpecies.find(s => s.id === selectedSpecies);

  // Calculate breeding timeline
  const calculateTimeline = () => {
    if (!species) return null;

    const start = new Date(startDate);
    const timeline = [];

    // Sexual Maturity
    const maturityDate = new Date(start);
    maturityDate.setDate(maturityDate.getDate() + (species.sexualMaturityWeeks * 7));
    timeline.push({
      date: maturityDate,
      event: "Sexual Maturity Reached",
      eventAr: "نضج جنسي",
      description: "الكائنات جاهزة للتكاثر",
      icon: Heart,
      color: "text-pink-500"
    });

    // First Spawn/Birth
    const firstSpawn = new Date(maturityDate);
    firstSpawn.setDate(firstSpawn.getDate() + 7); // Conditioning period
    timeline.push({
      date: firstSpawn,
      event: species.method === "live-bearer" ? "First Mating Expected" : "First Spawn Expected",
      eventAr: species.method === "live-bearer" ? "التزاوج الأول المتوقع" : "أول وضع بيض متوقع",
      description: species.method === "live-bearer" ? "بداية فترة الحمل" : "وضع البيض",
      icon: Fish,
      color: "text-blue-500"
    });

    // Birth/Hatch
    const birthDate = new Date(firstSpawn);
    if (species.method === "live-bearer" && species.gestationDays) {
      birthDate.setDate(birthDate.getDate() + species.gestationDays);
      timeline.push({
        date: birthDate,
        event: "First Fry Birth",
        eventAr: "ولادة أول صغار",
        description: `متوقع ${species.avgFryCount.min}-${species.avgFryCount.max} صغير`,
        icon: Baby,
        color: "text-green-500"
      });
    } else if (species.eggHatchDays) {
      birthDate.setDate(birthDate.getDate() + species.eggHatchDays);
      timeline.push({
        date: birthDate,
        event: "Eggs Hatch",
        eventAr: "فقس البيض",
        description: `متوقع ${species.avgFryCount.min}-${species.avgFryCount.max} يرقة`,
        icon: Baby,
        color: "text-green-500"
      });
    }

    // Second Spawn
    const secondSpawn = new Date(firstSpawn);
    if (species.breedingInterval > 0) {
      secondSpawn.setDate(secondSpawn.getDate() + species.breedingInterval);
      timeline.push({
        date: secondSpawn,
        event: "Second Spawn/Mating",
        eventAr: "التكاثر الثاني",
        description: "دورة تكاثر جديدة",
        icon: Heart,
        color: "text-purple-500"
      });
    }

    return timeline;
  };

  const timeline = calculateTimeline();

  // Handle PDF download using jspdf + html2canvas (React 19 compatible)
  const handleDownloadPDF = async () => {
    if (!species || !timeline) {
      toast.error("الرجاء اختيار النوع أولاً");
      return;
    }

    setIsGeneratingPDF(true);
    const loadingToast = toast.loading("جاري تحضير ملف PDF...");

    try {
      const fileName = `breeding-plan-${species.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      // Use the dedicated PDF container which includes the full report
      await generateBreedingPDF('pdf-export-container', fileName);

      toast.dismiss(loadingToast);
      toast.success("✓ تم تحميل الخطة بنجاح!");

    } catch (error) {
      console.error('[PDF] Generation error:', error);
      toast.dismiss(loadingToast);

      let errorMessage = "خطأ غير معروف";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(`فشل في إنشاء PDF: ${errorMessage}`, {
        duration: 5000,
        description: "تأكد من اختيار النوع وإدخال جميع البيانات"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress || !species || !timeline) return;

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/fish/breeding-plan/email', {
        method: 'POST',
        headers: addCsrfHeader({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          email: emailAddress,
          speciesId: species.id,
          speciesData: {
            id: species.id,
            name: species.name,
            arabicName: species.arabicName,
            type: species.type,
            method: species.method,
            difficulty: species.difficulty,
            optimalTemp: species.optimalTemp,
            optimalPH: species.optimalPH,
            minTankSize: species.minTankSize,
            avgFryCount: species.avgFryCount,
            breedingInterval: species.breedingInterval,
            sexualMaturityWeeks: species.sexualMaturityWeeks,
          },
          inputData: {
            pairs: numberOfPairs,
            startDate: startDate,
            temp: currentTemp,
            ph: currentPH
          },
          yearlyProduction: calculateYearlyProduction(),
          timeline: timeline.map(e => ({
            date: e.date.toISOString(),
            eventAr: e.eventAr,
            description: e.description
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success("تم إرسال الخطة إلى بريدك الإلكتروني بنجاح!");
      setEmailOpen(false);
      setEmailAddress("");
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إرسال البريد الإلكتروني.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Calculate expected fry per year
  const calculateYearlyProduction = () => {
    if (!species || species.breedingInterval === 0) return 0;
    const spawnsPerYear = Math.floor(365 / species.breedingInterval);
    const avgFry = (species.avgFryCount.min + species.avgFryCount.max) / 2;
    return Math.round(spawnsPerYear * avgFry * numberOfPairs);
  };

  // Growth stages - Generic based on type for now or customized per species if added to data
  const getGrowthStages = (): FryGrowthStage[] => {
    if (!species) return [];

    if (species.type === 'snail') {
      return [
        {
          week: 0,
          stage: "Eggs",
          stageAr: "بيض",
          size: "1-2mm",
          food: "N/A",
          foodAr: "لا شيء",
          tips: "تحتاج رطوبة عالية، لا تغمر بالماء (لحلزون التفاح)"
        },
        {
          week: 2,
          stage: "Hatchlings",
          stageAr: "فقس جديد",
          size: "2-3mm",
          food: "Soft algae, powdered food",
          foodAr: "طحالب ناعمة، طعام مطحون",
          tips: "تأكد من وجود كالسيوم في الماء"
        },
        {
          week: 8,
          stage: "Juvenile",
          stageAr: "يافعة",
          size: "10mm",
          food: "Vegetables, pellets",
          foodAr: "خضروات، حبيبات",
          tips: "جاهزة للبيع"
        }
      ];
    } else if (species.method === "live-bearer") {
      return [
        {
          week: 0,
          stage: "Newborn Fry",
          stageAr: "صغار حديثة الولادة",
          size: "3-5mm",
          food: "Infusoria, liquid fry food",
          foodAr: "إنفوزوريا، طعام سائل للصغار",
          tips: "تغذية 4-6 مرات يومياً"
        },
        {
          week: 1,
          stage: "Early Fry",
          stageAr: "صغار مبكرة",
          size: "5-8mm",
          food: "Baby brine shrimp, micro worms",
          foodAr: "روبيان ملحي صغير، ديدان ميكرو",
          tips: "تغيير 20% من الماء يومياً"
        },
        {
          week: 4,
          stage: "Juvenile",
          stageAr: "يافعة",
          size: "12-20mm",
          food: "Small pellets, flakes",
          foodAr: "حبيبات صغيرة، رقائق",
          tips: "يمكن دمجها مع البالغين تدريجياً"
        },
        {
          week: species.sexualMaturityWeeks,
          stage: "Adult",
          stageAr: "بالغة",
          size: "30-40mm+",
          food: "Standard diet",
          foodAr: "نظام غذائي قياسي",
          tips: "جاهزة للتكاثر"
        }
      ];
    } else {
      return [
        {
          week: 0,
          stage: "Eggs",
          stageAr: "بيض",
          size: "1-2mm",
          food: "N/A",
          foodAr: "لا شيء",
          tips: "حافظ على درجة حرارة ثابتة"
        },
        {
          week: 1,
          stage: "Free Swimming",
          stageAr: "سباحة حرة",
          size: "4-6mm",
          food: "Infusoria, liquid fry food",
          foodAr: "إنفوزوريا، طعام سائل",
          tips: "تغذية 5-6 مرات يومياً"
        },
        {
          week: 4,
          stage: "Juvenile",
          stageAr: "يافعة",
          size: "10-20mm",
          food: "Crushed flakes, small pellets",
          foodAr: "رقائق مطحونة، حبيبات صغيرة",
          tips: "تغذية 3-4 مرات يومياً"
        },
        {
          week: species.sexualMaturityWeeks,
          stage: "Adult",
          stageAr: "بالغة",
          size: "Full size",
          food: "Standard diet",
          foodAr: "نظام غذائي قياسي",
          tips: "جاهزة للتكاثر"
        }
      ];
    }
  };

  const growthStages = getGrowthStages();

  // Check water parameters
  const checkWaterParameters = () => {
    if (!species) return { temp: "unknown", ph: "unknown" };

    const tempStatus =
      currentTemp >= species.optimalTemp.min && currentTemp <= species.optimalTemp.max
        ? "optimal"
        : currentTemp < species.optimalTemp.min - 2 || currentTemp > species.optimalTemp.max + 2
          ? "critical"
          : "warning";

    const phStatus =
      currentPH >= species.optimalPH.min && currentPH <= species.optimalPH.max
        ? "optimal"
        : currentPH < species.optimalPH.min - 0.5 || currentPH > species.optimalPH.max + 0.5
          ? "critical"
          : "warning";

    return { temp: tempStatus, ph: phStatus };
  };

  const waterStatus = checkWaterParameters();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-pink-50 to-background dark:from-pink-950/20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-pink-500/20 px-6 py-2 rounded-full mb-6">
              <Heart className="h-5 w-5 text-pink-600" />
              <span className="font-bold text-pink-700 dark:text-pink-400">آلة حساب تكاثر الكائنات المائية</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              خطط لمشروع التكاثر بدقة
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              احسب الجدول الزمني، الاحتياجات، والإنتاج المتوقع لتكاثر الأسماك والحلزونات
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Fish className="h-6 w-6" />
                  معلومات التكاثر الأساسية
                </CardTitle>
                <CardDescription>أدخل تفاصيل مشروع التكاثر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النوع (سمكة / حلزون / جمبري)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {breedingSpecies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.arabicName} ({s.name}) [{s.type === 'snail' ? 'حلزون' : s.type === 'shrimp' ? 'جمبري' : 'سمكة'}]
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>عدد الأزواج</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={numberOfPairs}
                      onChange={(e) => setNumberOfPairs(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ البدء</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>درجة الحرارة الحالية (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="18"
                      max="32"
                      value={currentTemp}
                      onChange={(e) => setCurrentTemp(parseFloat(e.target.value) || 26)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الـ pH الحالي</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="5.0"
                      max="9.0"
                      value={currentPH}
                      onChange={(e) => setCurrentPH(parseFloat(e.target.value) || 7.0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {species && timeline && (
              <>
                {/* Species Info - PDF Content Wrapper */}
                <div id="breeding-plan-content" className="grid md:grid-cols-3 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-500" />
                        معلومات النوع
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">التصنيف:</span>
                        <Badge variant="secondary">
                          {species.type === 'snail' ? 'حلزون' : species.type === 'shrimp' ? 'روبيان' : 'سمكة'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">طريقة التكاثر:</span>
                        <Badge variant="outline">
                          {species.method === "live-bearer" && "ولّاد"}
                          {species.method === "egg-layer" && "بيّاض"}
                          {species.method === "egg-clutch" && "كتلة بيض"}
                          {species.method === "bubble-nest" && "عش فقاعات"}
                          {species.method === "mouth-brooder" && "حاضن فموي"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الصعوبة:</span>
                        <Badge className={
                          species.difficulty === "easy" ? "bg-green-500" :
                            species.difficulty === "moderate" ? "bg-yellow-500" :
                              "bg-red-500"
                        }>
                          {species.difficulty === "easy" && "سهل"}
                          {species.difficulty === "moderate" && "متوسط"}
                          {species.difficulty === "difficult" && "صعب"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">أقل حجم حوض:</span>
                        <span className="font-bold">{species.minTankSize} لتر</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-orange-500" />
                        ظروف الماء
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">الحرارة المثلى:</span>
                          <span className="font-bold">
                            {species.optimalTemp.min}-{species.optimalTemp.max}°C
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {waterStatus.temp === "optimal" && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              مثالي
                            </Badge>
                          )}
                          {waterStatus.temp === "warning" && (
                            <Badge className="bg-yellow-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              تحذير
                            </Badge>
                          )}
                          {waterStatus.temp === "critical" && (
                            <Badge className="bg-red-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              حرج
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">الـ pH المثالي:</span>
                          <span className="font-bold">
                            {species.optimalPH.min}-{species.optimalPH.max}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {waterStatus.ph === "optimal" && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              مثالي
                            </Badge>
                          )}
                          {waterStatus.ph === "warning" && (
                            <Badge className="bg-yellow-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              تحذير
                            </Badge>
                          )}
                          {waterStatus.ph === "critical" && (
                            <Badge className="bg-red-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              حرج
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        الإنتاج المتوقع
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">صغار لكل دورة:</span>
                        <span className="font-bold">
                          {species.avgFryCount.min}-{species.avgFryCount.max}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">دورات سنوياً:</span>
                        <span className="font-bold">
                          {species.breedingInterval > 0 ? `~${Math.floor(365 / species.breedingInterval)}` : '0'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">إجمالي سنوي:</span>
                        <span className="font-bold text-green-600 text-lg">
                          ~{calculateYearlyProduction().toLocaleString('en-US')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-4 mb-6">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isGeneratingPDF ? 'جاري التجهيز...' : 'حفظ كملف PDF'}
                  </Button>

                  <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Mail className="w-4 h-4" />
                        إرسال عبر البريد
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إرسال الخطة</DialogTitle>
                        <DialogDescription>
                          أدخل بريدك الإلكتروني لاستلام نسخة كاملة من خطة التكاثر.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>البريد الإلكتروني</Label>
                          <Input
                            placeholder="name@example.com"
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleSendEmail}
                          disabled={isSendingEmail || !emailAddress}
                        >
                          {isSendingEmail ? "جاري الإرسال..." : "إرسال"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="timeline">
                      <Calendar className="h-4 w-4 mr-2" />
                      الجدول الزمني
                    </TabsTrigger>
                    <TabsTrigger value="growth">
                      <Baby className="h-4 w-4 mr-2" />
                      مراحل النمو
                    </TabsTrigger>
                    <TabsTrigger value="supplies">
                      <Package className="h-4 w-4 mr-2" />
                      المستلزمات
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="timeline" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>الجدول الزمني للتكاثر</CardTitle>
                        <CardDescription>
                          الأحداث المتوقعة بناءً على تاريخ البدء
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {timeline?.map((event, i) => {
                            const Icon = event.icon;
                            return (
                              <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${event.color}`}>
                                    <Icon className="h-6 w-6" />
                                  </div>
                                  {i < timeline.length - 1 && (
                                    <div className="w-0.5 h-full bg-border min-h-[40px] mt-2" />
                                  )}
                                </div>

                                <div className="flex-1 pb-8">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg">{event.eventAr}</span>
                                    <Badge variant="outline">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {event.date.toLocaleDateString('en-GB')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {event.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ({Math.ceil((event.date.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم من البداية)
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="growth" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>مراحل نمو الصغار</CardTitle>
                        <CardDescription>
                          دليل التغذية والعناية لكل مرحلة
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {growthStages.map((stage, i) => (
                            <div
                              key={i}
                              className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex flex-col items-center min-w-[60px]">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                                  <span className="font-bold text-primary">
                                    {stage.week === 0 ? "Now" : "W" + stage.week}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {stage.size}
                                </Badge>
                              </div>

                              <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1">{stage.stageAr}</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {stage.stage}
                                </p>

                                <div className="flex items-start gap-2 mb-2">
                                  <Beaker className="h-4 w-4 text-blue-500 mt-0.5" />
                                  <div>
                                    <span className="text-sm font-semibold">الطعام: </span>
                                    <span className="text-sm text-muted-foreground">
                                      {stage.foodAr}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                  <span className="text-sm text-muted-foreground">
                                    {stage.tips}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="supplies" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>مستلزمات التكاثر الموصى بها</CardTitle>
                        <CardDescription>
                          قائمة بالأدوات والمعدات الأساسية لنجاح عملية تكاثر {species.arabicName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {species.supplies && species.supplies.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {species.supplies.map((item, i) => (
                              <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.priority === 'essential' ? 'bg-red-500/10 text-red-500' :
                                  item.priority === 'recommended' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                                  }`}>
                                  {item.category === 'equipment' && <Settings className="w-6 h-6" />}
                                  {item.category === 'breeding' && <Heart className="w-6 h-6" />}
                                  {item.category === 'food' && <Utensils className="w-6 h-6" />}
                                  {item.category === 'care' && <Stethoscope className="w-6 h-6" />}
                                  {item.category === 'decor' && <Mountain className="w-6 h-6" />}
                                  {item.category === 'water_care' && <Droplets className="w-6 h-6" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold">{item.nameAr}</h4>
                                    {item.priority === 'essential' && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">ضروري</Badge>}
                                    {item.priority === 'recommended' && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">موصى به</Badge>}
                                    {item.priority === 'optional' && <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-500 border-green-500/30">اختياري</Badge>}
                                  </div>
                                  <p className="text-sm text-muted-foreground text-left font-sans mb-2" dir="ltr">{item.name}</p>

                                  {item.productName && (
                                    <div
                                      className="mt-3 bg-secondary/30 p-2.5 rounded-md border border-border flex items-center justify-between group hover:border-primary hover:bg-secondary/50 transition-all">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">نرشح لك (من منتجاتنا)</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-foreground leading-tight" dir="ltr">{item.productName}</span>
                                          {item.productCode && <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1 py-0.5 rounded border border-border/50">{item.productCode}</span>}
                                        </div>
                                      </div>
                                      <a
                                        href={item.productCode ? `/products/${item.productCode.toLowerCase()}` : `/search?q=${encodeURIComponent((item.nameAr || item.productName || item.name || '').split('(')[0].trim())}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 w-8 rounded-full p-0 z-10 relative cursor-pointer shadow-md hover:scale-105 transition-transform bg-primary text-primary-foreground flex items-center justify-center"
                                        onClick={() => {
                                          toast.success(`جاري فتح صفحة المنتج...`);
                                        }}
                                      >
                                        <ShoppingCart className="w-4 h-4" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            لا توجد مستلزمات محددة لهذا النوع حالياً.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Hidden PDF Export Container */}
      {species && timeline && (
        <div
          id="pdf-export-container"
          className="fixed left-[-9999px] top-[-9999px] w-[794px] bg-white text-slate-950 font-sans p-8 pointer-events-none opacity-0"
          style={{ direction: 'rtl', zIndex: -100 }}
        >
          {/* Background Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
            <img
              src={`${import.meta.env.BASE_URL}logo_aquavo_icon.png`}
              alt="Watermark"
              className="w-[600px] h-auto object-contain grayscale"
            />
          </div>

          <div className="relative z-10 space-y-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6">
              <div className="text-right">
                <h1 className="text-3xl font-extrabold text-slate-950 mb-2">خطة تكاثر: {species.arabicName} ({species.name})</h1>
                <p className="text-lg text-slate-700 font-medium">تم الإنشاء بتاريخ: {new Date().toLocaleDateString('ar-IQ')}</p>
                <div className="flex gap-4 mt-2 text-sm font-semibold text-slate-600">
                  <span>عدد الأزواج: {numberOfPairs}</span>
                  <span>|</span>
                  <span>تاريخ البدء: {new Date(startDate).toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>
              <img
                src={`${import.meta.env.BASE_URL}logo_aquavo.png`}
                alt="AQUAVO"
                className="h-24 w-auto object-contain"
              />
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Species Info */}
              <div className="p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-700" /> معلومات النوع
                </h3>
                <div className="space-y-2 text-right text-sm">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-700 font-medium">التصنيف:</span>
                    <span className="font-bold text-slate-900">{species.type === 'snail' ? 'حلزون' : species.type === 'shrimp' ? 'روبيان' : 'سمكة'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-700 font-medium">التكاثر:</span>
                    <span className="font-bold text-slate-900">{species.method === "live-bearer" && "ولّاد"}{species.method === "egg-layer" && "بائض"}{species.method === "bubble-nest" && "عش فقاعي"}{species.method === "egg-clutch" && "عنقود بيض"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">حجم الحوض:</span>
                    <span className="font-bold text-slate-900">{species.minTankSize} لتر</span>
                  </div>
                </div>
              </div>

              {/* Water Parameters */}
              <div className="p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-orange-600" /> ظروف الماء
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">الحرارة:</span>
                    <span className="text-lg font-black text-slate-900" dir="ltr">{species.optimalTemp.min}-{species.optimalTemp.max}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">الـ pH:</span>
                    <span className="text-lg font-black text-slate-900" dir="ltr">{species.optimalPH.min}-{species.optimalPH.max}</span>
                  </div>
                </div>
              </div>

              {/* Production */}
              <div className="p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-700" /> الإنتاج المتوقع
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">العدد (للدورة):</span>
                    <span className="font-bold text-slate-900" dir="ltr">{species.avgFryCount.min}-{species.avgFryCount.max}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">مدة الدورة:</span>
                    <span className="font-bold text-slate-900" dir="ltr">{species.breedingInterval} يوم</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-700 font-medium">سنوي (تقريبي):</span>
                    <span className="font-black text-green-800 text-base" dir="ltr">
                      {species.breedingInterval > 0 ? Math.floor(365 / species.breedingInterval * species.avgFryCount.max * numberOfPairs) : 'N/A'}+
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Calendar className="w-6 h-6 text-indigo-600" /> الجدول الزمني للتكاثر
              </h2>
              <div className="space-y-6 relative border-r-2 border-indigo-100 pr-8 mr-4">
                {timeline.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <div className={`absolute -right-[43px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${event.color.replace('bg-', 'bg-').replace('/10', '')} text-white`} style={{ backgroundColor: event.color.includes('pink') ? '#ec4899' : event.color.includes('blue') ? '#3b82f6' : event.color.includes('green') ? '#22c55e' : '#a855f7' }}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-lg text-slate-900">{event.eventAr}</h4>
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-bold text-slate-600 font-mono" dir="ltr">
                            {event.date.toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <p className="text-slate-600">{event.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          ({Math.ceil((event.date.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم من البداية)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Growth Stages Section */}
            <div className="pt-8 page-break-inside-avoid">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Baby className="w-6 h-6 text-pink-500" /> مراحل نمو الصغار
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {growthStages.map((stage, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 break-inside-avoid">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{stage.stageAr}</h3>
                        <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">{stage.size}</span>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-700 w-16">التغذية:</span>
                        <span className="text-slate-600 flex-1">{stage.foodAr}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-700 w-16">نصيحة:</span>
                        <span className="text-slate-600 flex-1">{stage.tips}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-500 flex justify-between items-center">
              <span className="text-sm">www.aquavoiq.com</span>
              <span className="text-sm font-bold">AQUAVO © {new Date().getFullYear()} - جميع الحقوق محفوظة</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

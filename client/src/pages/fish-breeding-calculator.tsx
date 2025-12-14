import { useState } from "react";
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
  Snail
} from "lucide-react";
import { breedingSpecies, type BreedingSpecies, type FryGrowthStage } from "@/data/breeding-data";
import { pdf } from "@react-pdf/renderer";
import { BreedingPlanPDF } from "@/components/fish/breeding-pdf";
import { toast } from "sonner";

export default function FishBreedingCalculator() {
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

  // Handle PDF download manually for React 19 compatibility
  const handleDownloadPDF = async () => {
    if (!species || !timeline) return;

    setIsGeneratingPDF(true);
    try {
      const doc = (
        <BreedingPlanPDF
          species={species}
          timeline={timeline}
          inputData={{
            pairs: numberOfPairs,
            startDate,
            temp: currentTemp,
            ph: currentPH,
          }}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `breeding-plan-${species.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الخطة بنجاح!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("حدث خطأ أثناء إنشاء ملف PDF.");
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          speciesId: species.id, // Send ID, server fetches full data
          inputData: {
            pairs: numberOfPairs,
            startDate: startDate,
            temp: currentTemp,
            ph: currentPH
          },
          // We send simplified timeline data
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

      <main className="flex-1">
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
                      <SelectContent>
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
                {/* Species Info */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                          ~{calculateYearlyProduction().toLocaleString()}
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
                                      {event.date.toLocaleDateString('ar-IQ')}
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
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        سيتم إضافة قائمة المستلزمات قريباً.
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
    </div>
  );
}

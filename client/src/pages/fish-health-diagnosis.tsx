import { useState, useRef, useCallback } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Upload,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  Stethoscope,
  Pill,
  Droplets,
  Thermometer,
  FileText,
  Sparkles,
  ShieldAlert,
  Bug,
  Search,
  Clock,
  AlertTriangle,
  Heart,
  Eye,
  Target,
  Zap,
  TrendingUp,
  Shield,
  Microscope,
  Syringe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Fish,
  XCircle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// Types — matches the new backend schema
// ═══════════════════════════════════════════════════════

interface ImageQuality {
  score: number;
  feedback: string;
  canDiagnose: boolean;
}

interface SpeciesIdentification {
  commonName: string;
  scientificName: string;
  family: string;
  waterType: string;
  confidence: number;
  knownVulnerabilities: string[];
}

interface DifferentialDiagnosisItem {
  disease: string;
  arabicName: string;
  probability: number;
  reasoning: string;
}

interface TreatmentTimelineItem {
  day: string;
  actions: string[];
}

interface QuarantineProtocol {
  required: boolean;
  duration: string;
  tankSetup: string;
  steps: string[];
}

interface Prognosis {
  recoveryChance: string;
  expectedDuration: string;
  signsOfImprovement: string[];
  signsOfDeterioration: string[];
  followUpDate: string;
}

interface WaterParameters {
  temperature: string;
  ph: string;
  ammonia: string;
  nitrite?: string;
  nitrate?: string;
}

interface DiagnosisResult {
  disease: string;
  arabicName: string;
  confidence: number;
  category: string;
  pathogen?: string;
  symptoms: string[];
  causes: string[];
  diagnosis: string;
  treatment: string[];
  prevention: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  waterParameters?: WaterParameters;
  // New advanced fields
  imageQuality?: ImageQuality;
  speciesIdentification?: SpeciesIdentification;
  differentialDiagnosis?: DifferentialDiagnosisItem[];
  treatmentTimeline?: TreatmentTimelineItem[];
  medicationWarnings?: string[];
  quarantineProtocol?: QuarantineProtocol;
  prognosis?: Prognosis;
}

// ═══════════════════════════════════════════════════════
// Analysis Steps for the animated progress
// ═══════════════════════════════════════════════════════

const analysisSteps = [
  { id: 1, label: "فحص بيانات الماء (Rule Engine)", icon: Droplets, duration: 500 },
  { id: 2, label: "الوكيل البصري — وصف الصورة", icon: Eye, duration: 2500 },
  { id: 3, label: "وكيل التشخيص — تحليل الأعراض", icon: Microscope, duration: 3000 },
  { id: 4, label: "وكيل المراجعة — فحص الاستثناءات", icon: Shield, duration: 2500 },
  { id: 5, label: "وكيل العلاج — خطة العلاج", icon: Syringe, duration: 2500 },
  { id: 6, label: "تجميع النتائج النهائية", icon: TrendingUp, duration: 500 },
];

// ═══════════════════════════════════════════════════════
// Disease categories reference for the bottom section
// ═══════════════════════════════════════════════════════

const diseaseCategories = [
  {
    category: "طفيلية",
    categoryEn: "Parasitic",
    icon: Bug,
    color: "from-red-500 to-orange-500",
    diseases: [
      { name: "مرض النقط البيضاء (Ich)", urgency: "high" as const },
      { name: "المخملية (Velvet)", urgency: "high" as const },
      { name: "ديدان الخياشيم / الجلد", urgency: "high" as const },
      { name: "ثقب الرأس (Hexamita)", urgency: "high" as const },
    ]
  },
  {
    category: "بكتيرية",
    categoryEn: "Bacterial",
    icon: Microscope,
    color: "from-purple-500 to-pink-500",
    diseases: [
      { name: "تعفن الزعانف (Fin Rot)", urgency: "medium" as const },
      { name: "القطنية (Columnaris)", urgency: "high" as const },
      { name: "الاستسقاء (Dropsy)", urgency: "critical" as const },
      { name: "القرح البكتيرية", urgency: "high" as const },
    ]
  },
  {
    category: "فطرية / فيروسية",
    categoryEn: "Fungal / Viral",
    icon: ShieldAlert,
    color: "from-teal-500 to-cyan-500",
    diseases: [
      { name: "فطريات الماء (Saprolegnia)", urgency: "medium" as const },
      { name: "الأورام اللمفاوية (Lymphocystis)", urgency: "low" as const },
      { name: "فطر الخياشيم", urgency: "critical" as const },
      { name: "فيروس الكوي (KHV)", urgency: "critical" as const },
    ]
  },
  {
    category: "بيئية / تغذوية",
    categoryEn: "Environmental",
    icon: Droplets,
    color: "from-amber-500 to-yellow-500",
    diseases: [
      { name: "تسمم الأمونيا", urgency: "critical" as const },
      { name: "تسمم النيتريت", urgency: "high" as const },
      { name: "صدمة pH / الحرارة", urgency: "high" as const },
      { name: "اضطراب المثانة الهوائية", urgency: "medium" as const },
    ]
  },
];

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export default function FishHealthDiagnosis() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    differential: true,
    timeline: true,
    quarantine: false,
    prognosis: true,
  });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // User Context State
  const [userContextSpecies, setUserContextSpecies] = useState("");
  const [userContextEating, setUserContextEating] = useState("");
  const [userContextSymptoms, setUserContextSymptoms] = useState("");

  // Water Parameters State
  const [waterTemperature, setWaterTemperature] = useState("");
  const [waterPh, setWaterPh] = useState("");
  const [waterAmmonia, setWaterAmmonia] = useState("");
  const [waterNitrite, setWaterNitrite] = useState("");
  const [waterNitrate, setWaterNitrate] = useState("");
  const [showWaterParams, setShowWaterParams] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.");
        return;
      }
      setImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setDiagnosis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateSteps = useCallback(async () => {
    for (let i = 0; i < analysisSteps.length; i++) {
      setCurrentStep(i + 1);
      await new Promise(resolve => setTimeout(resolve, analysisSteps[i].duration));
    }
  }, []);

  const analyzeFish = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(0);

    // Start step simulation in parallel
    const stepsPromise = simulateSteps();

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('analysisType', 'health');
      if (userContextSpecies) formData.append('userContextSpecies', userContextSpecies);
      if (userContextEating) formData.append('userContextEating', userContextEating);
      if (userContextSymptoms) formData.append('userContextSymptoms', userContextSymptoms);
      // Water Parameters
      if (waterTemperature) formData.append('waterTemperature', waterTemperature);
      if (waterPh) formData.append('waterPh', waterPh);
      if (waterAmmonia) formData.append('waterAmmonia', waterAmmonia);
      if (waterNitrite) formData.append('waterNitrite', waterNitrite);
      if (waterNitrate) formData.append('waterNitrate', waterNitrate);

      const response = await fetch('/api/ai-advanced/visual/analyze-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'فشل تحليل الصورة');
      }

      const result = await response.json();
      const details = result.data?.analysis?.details || {};

      // Wait for step simulation to finish
      await stepsPromise;

      const diagnosisResult: DiagnosisResult = {
        disease: details.disease || 'غير محدد',
        arabicName: details.arabicName || 'غير محدد',
        confidence: Math.round((result.data?.analysis?.confidence || 0.7) * 100),
        category: details.category || 'unknown',
        pathogen: details.pathogen,
        symptoms: details.symptoms || result.data?.analysis?.detected || [],
        causes: details.causes || [],
        diagnosis: details.diagnosis || '',
        treatment: details.treatment || result.data?.analysis?.suggestions || [],
        prevention: details.prevention || [],
        urgency: details.urgency || 'medium',
        waterParameters: details.waterParameters,
        imageQuality: details.imageQuality,
        speciesIdentification: details.speciesIdentification,
        differentialDiagnosis: details.differentialDiagnosis,
        treatmentTimeline: details.treatmentTimeline,
        medicationWarnings: details.medicationWarnings,
        quarantineProtocol: details.quarantineProtocol,
        prognosis: details.prognosis,
      };

      setDiagnosis(diagnosisResult);
      setAnalysisId(result.data?.id || null);
      setFeedbackSent(false);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء التحليل';
      setError(message);
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(0);
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setImageFile(null);
    setDiagnosis(null);
    setError(null);
    setCurrentStep(0);
  };

  const printDiagnosis = useCallback(() => {
    window.print();
  }, []);

  const urgencyConfig = {
    low: { color: 'bg-green-500', gradient: 'from-green-500 to-emerald-600', text: 'منخفضة', textColor: 'text-green-700 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-950', icon: CheckCircle, border: 'border-green-200 dark:border-green-800' },
    medium: { color: 'bg-yellow-500', gradient: 'from-yellow-500 to-amber-600', text: 'متوسطة', textColor: 'text-yellow-700 dark:text-yellow-400', bgLight: 'bg-yellow-50 dark:bg-yellow-950', icon: Info, border: 'border-yellow-200 dark:border-yellow-800' },
    high: { color: 'bg-orange-500', gradient: 'from-orange-500 to-red-500', text: 'عالية', textColor: 'text-orange-700 dark:text-orange-400', bgLight: 'bg-orange-50 dark:bg-orange-950', icon: AlertCircle, border: 'border-orange-200 dark:border-orange-800' },
    critical: { color: 'bg-red-600', gradient: 'from-red-600 to-red-800', text: 'حرجة!', textColor: 'text-red-700 dark:text-red-400', bgLight: 'bg-red-50 dark:bg-red-950', icon: AlertTriangle, border: 'border-red-200 dark:border-red-800' },
  };

  const categoryLabels: Record<string, { label: string; icon: typeof Bug }> = {
    parasitic: { label: "طفيلي", icon: Bug },
    bacterial: { label: "بكتيري", icon: Microscope },
    fungal: { label: "فطري", icon: ShieldAlert },
    viral: { label: "فيروسي", icon: ShieldAlert },
    environmental: { label: "بيئي", icon: Droplets },
    nutritional: { label: "تغذوي", icon: Heart },
    physical: { label: "إصابة فيزيائية", icon: Zap },
    healthy: { label: "سليم", icon: CheckCircle },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        {/* ═══════════ Header ═══════════ */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-950 dark:to-orange-950 px-6 py-2 rounded-full mb-4 shadow-sm">
            <Stethoscope className="h-5 w-5 text-red-600 animate-pulse" />
            <span className="font-bold text-red-700 dark:text-red-400">Dr. AQUAVO — تشخيص ذكي بالـ AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            تشخيص أمراض الأسماك
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            التقط صورة لسمكتك واحصل على تشخيص فوري مع خطة علاج مفصلة
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl mx-auto">
            مدرّب على أهم المراجع البيطرية العالمية • قاعدة بيانات 40+ مرض • تشخيص تفاضلي متعدد المراحل
          </p>

          <Alert className="mt-6 max-w-2xl mx-auto bg-blue-50 dark:bg-blue-950 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <strong>ملاحظة:</strong> هذا التشخيص تقديري يعتمد على الذكاء الاصطناعي. للحالات الحرجة، استشر طبيب بيطري متخصص.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* ═══════════ Upload Section ═══════════ */}
          <Card className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                ارفع صورة السمكة
              </CardTitle>
              <CardDescription>
                صورة واضحة للسمكة من الجانب للحصول على أفضل تشخيص
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!image ? (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <Camera className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">التقط أو ارفع صورة سمكتك</h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    صورة واضحة من الجانب تساعد الذكاء الاصطناعي على تشخيص المرض بدقة أعلى
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} className="gap-2 shadow-md">
                      <Upload className="h-4 w-4" />
                      رفع صورة
                    </Button>
                    <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                      <Camera className="h-4 w-4" />
                      التقاط صورة
                    </Button>
                  </div>

                  {/* Tips */}
                  <div className="mt-6 text-xs text-muted-foreground space-y-1 text-right w-full max-w-sm">
                    <p className="font-semibold mb-2">💡 نصائح لأفضل نتيجة:</p>
                    <p>• التقط الصورة من الجانب وليس من الأعلى</p>
                    <p>• تأكد أن الإضاءة كافية ووضحة</p>
                    <p>• حاول تصوير المنطقة المصابة عن قرب</p>
                    <p>• الحد الأقصى لحجم الصورة: 5 ميجابايت</p>
                  </div>

                  {error && (
                    <Alert className="mt-4 bg-red-50 dark:bg-red-950 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={image}
                      alt="Uploaded fish"
                      className="w-full h-64 object-cover"
                    />
                    {diagnosis?.imageQuality && (
                      <div className="absolute top-3 left-3">
                        <Badge className={`${diagnosis.imageQuality.score >= 7 ? 'bg-green-500' : diagnosis.imageQuality.score >= 4 ? 'bg-yellow-500' : 'bg-red-500'} text-white shadow-lg`}>
                          جودة الصورة: {diagnosis.imageQuality.score}/10
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Context Gathering Form (Pre-prompting) */}
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-right space-y-3">
                    <p className="text-sm font-semibold mb-2">💡 ساعد الذكاء الاصطناعي لنتائج أدق (اختياري)</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">شنو نوع السمكة؟ (مثال: جولد فيش، ديسكس)</label>
                        <input 
                          type="text" 
                          placeholder="النوع..."
                          value={userContextSpecies}
                          onChange={(e) => setUserContextSpecies(e.target.value)}
                          className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">هل السمكة تأكل بصورة طبيعية؟</label>
                        <select 
                          value={userContextEating}
                          onChange={(e) => setUserContextEating(e.target.value)}
                          className="w-full text-sm p-2 rounded-md border border-input bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">اختر...</option>
                          <option value="تأكل بشهية ممتازة">تأكل بصورة ممتازة</option>
                          <option value="تأكل بصعوبة أو قليل">قليل جداً / بصعوبة</option>
                          <option value="لا تأكل أبداً وتقذف الطعام">لا تأكل أبداً</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">هل تلاحظ أي أعراض؟ (مثل: حكة، خمول، بقع)</label>
                      <input 
                        type="text" 
                        placeholder="الأعراض..."
                        value={userContextSymptoms}
                        onChange={(e) => setUserContextSymptoms(e.target.value)}
                        className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Analysis Progress Steps */}

                   {/* Water Parameters (Expandable) */}
                   <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 p-4 rounded-lg border border-cyan-500/20 text-right space-y-3">
                     <button
                       type="button"
                       onClick={() => setShowWaterParams(!showWaterParams)}
                       className="w-full flex items-center justify-between text-sm font-semibold"
                     >
                       <span className="flex items-center gap-2">
                         <Droplets className="h-4 w-4 text-cyan-400" />
                         🧪 فحوصات الماء (يرفع الدقة بنسبة كبيرة)
                       </span>
                       {showWaterParams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                     </button>
                     {showWaterParams && (
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                         <div>
                           <label className="text-xs text-muted-foreground font-medium mb-1 block">🌡️ الحرارة (°م)</label>
                           <input
                             type="text"
                             placeholder="مثال: 28"
                             value={waterTemperature}
                             onChange={(e) => setWaterTemperature(e.target.value)}
                             className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-cyan-500"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-muted-foreground font-medium mb-1 block">⚗️ pH</label>
                           <input
                             type="text"
                             placeholder="مثال: 7.2"
                             value={waterPh}
                             onChange={(e) => setWaterPh(e.target.value)}
                             className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-cyan-500"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-red-400 font-medium mb-1 block">⚠️ أمونيا (ppm)</label>
                           <input
                             type="text"
                             placeholder="مثال: 0"
                             value={waterAmmonia}
                             onChange={(e) => setWaterAmmonia(e.target.value)}
                             className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-red-500"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-orange-400 font-medium mb-1 block">⚠️ نيتريت (ppm)</label>
                           <input
                             type="text"
                             placeholder="مثال: 0"
                             value={waterNitrite}
                             onChange={(e) => setWaterNitrite(e.target.value)}
                             className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-orange-500"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-muted-foreground font-medium mb-1 block">نيترات (ppm)</label>
                           <input
                             type="text"
                             placeholder="مثال: 20"
                             value={waterNitrate}
                             onChange={(e) => setWaterNitrate(e.target.value)}
                             className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-cyan-500"
                           />
                         </div>
                       </div>
                     )}
                   </div>

                  {isAnalyzing && (
                    <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border">
                      <p className="font-semibold text-sm text-center mb-3">🔬 Dr. AQUAVO يحلل صورتك...</p>
                      {analysisSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = currentStep === step.id;
                        const isComplete = currentStep > step.id;
                        return (
                          <div
                            key={step.id}
                            className={`flex items-center gap-3 text-sm transition-all duration-500 ${isActive ? 'text-primary font-semibold scale-105' : isComplete ? 'text-green-600' : 'text-muted-foreground opacity-50'}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-green-500 text-white' : isActive ? 'bg-primary text-white animate-pulse' : 'bg-muted'}`}>
                              {isComplete ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                            </div>
                            <span>{step.label}</span>
                            {isActive && <Activity className="h-4 w-4 animate-spin mr-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={resetAnalysis}
                      className="gap-2"
                      disabled={isAnalyzing}
                    >
                      <RefreshCw className="h-4 w-4" />
                      صورة أخرى
                    </Button>
                    <Button
                      onClick={analyzeFish}
                      disabled={isAnalyzing}
                      className="gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Activity className="h-4 w-4 animate-spin" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          تشخيص الآن
                        </>
                      )}
                    </Button>
                  </div>
                  {error && (
                    <Alert className="mt-4 bg-red-50 dark:bg-red-950 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-700 dark:text-red-400">{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════ Diagnosis Result ═══════════ */}
          <div ref={resultsRef}>
            <Card className={`overflow-hidden border-2 transition-colors ${diagnosis ? urgencyConfig[diagnosis.urgency].border : ''}`}>
              <CardHeader className={diagnosis ? `bg-gradient-to-r ${urgencyConfig[diagnosis.urgency].bgLight}` : ''}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    نتيجة التشخيص
                  </CardTitle>
                  {diagnosis && (
                    <Button variant="ghost" size="sm" onClick={printDiagnosis} title="طباعة التقرير">
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {!diagnosis ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Stethoscope className="h-16 w-16 mb-4 opacity-20" />
                    <p>ارفع صورة للحصول على التشخيص</p>
                    <p className="text-xs mt-2 opacity-60">Dr. AQUAVO مدرب على 40+ مرض من أسماك الزينة</p>
                  </div>
                ) : (
                  <div className="space-y-5 print:space-y-3">

                    {/* ── Image Quality Feedback ── */}
                    {diagnosis.imageQuality && !diagnosis.imageQuality.canDiagnose && (
                      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm">
                          <strong>جودة الصورة غير كافية:</strong> {diagnosis.imageQuality.feedback}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* ── Species Identification ── */}
                    {diagnosis.speciesIdentification && (
                      <div className="p-4 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 dark:from-blue-950/60 dark:to-cyan-950/60 rounded-xl border border-blue-500/30 dark:border-blue-400/20 shadow-inner">
                        <div className="flex items-center justify-between mb-3 border-b border-blue-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <Fish className="h-4 w-4 text-blue-400" />
                            <span className="font-bold text-sm text-blue-100 dark:text-blue-200">نوع السمكة</span>
                          </div>
                          <Badge variant="outline" className="text-xs bg-blue-950/50 text-blue-200 border-blue-500/30">
                            ثقة {Math.round(diagnosis.speciesIdentification.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center space-y-1 mb-3">
                          <p className="font-extrabold text-lg text-white drop-shadow-sm">{diagnosis.speciesIdentification.commonName}</p>
                          <p className="text-xs text-blue-200/70 italic font-mono">{diagnosis.speciesIdentification.scientificName}</p>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{diagnosis.speciesIdentification.family}</Badge>
                          <Badge variant="secondary" className="text-xs">{diagnosis.speciesIdentification.waterType}</Badge>
                        </div>
                        {diagnosis.speciesIdentification.knownVulnerabilities?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ عرضة لـ: {diagnosis.speciesIdentification.knownVulnerabilities.join("، ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── Disease Name & Urgency ── */}
                    <div className="text-center space-y-3 mt-6 mb-2">
                      <div className="inline-flex flex-col items-center justify-center gap-2">
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-sm">{diagnosis.arabicName}</h3>
                        <Badge className={`${urgencyConfig[diagnosis.urgency].color} text-white text-sm px-3 py-1 shadow-lg ${diagnosis.urgency === 'critical' ? 'animate-pulse' : ''}`}>
                          {urgencyConfig[diagnosis.urgency].text}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <p className="text-sm border border-border/50 px-3 py-1 rounded-full text-muted-foreground bg-background/50 shadow-sm">{diagnosis.disease}</p>
                        {diagnosis.category && categoryLabels[diagnosis.category] && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[diagnosis.category].label}
                          </Badge>
                        )}
                        {diagnosis.pathogen && (
                          <Badge variant="outline" className="text-xs font-mono bg-background/50">
                            {diagnosis.pathogen}
                          </Badge>
                        )}
                      </div>
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-muted-foreground shrink-0">الدقة:</span>
                        <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${urgencyConfig[diagnosis.urgency].gradient} transition-all duration-1000`}
                            style={{ width: `${diagnosis.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold shrink-0">{diagnosis.confidence}%</span>
                      </div>
                    </div>

                    {/* ── Diagnosis Explanation ── */}
                    {diagnosis.diagnosis && (
                      <>
                        <Separator />
                        <div className={`p-4 rounded-xl shadow-inner ${urgencyConfig[diagnosis.urgency].bgLight} border-l-4 ${urgencyConfig[diagnosis.urgency].border.replace('border', 'border-l')}`}>
                          <h4 className="font-extrabold mb-3 flex items-center gap-2 text-base">
                            <Target className="h-5 w-5 opacity-80" />
                            تفسير التشخيص:
                          </h4>
                          <p className="text-sm leading-8 text-foreground/90 font-medium text-justify">{diagnosis.diagnosis}</p>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* ── Symptoms ── */}
                    <div>
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-500" />
                        الأعراض المكتشفة:
                      </h4>
                      <ul className="space-y-2">
                        {diagnosis.symptoms.map((symptom, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500 mt-1 shrink-0">•</span>
                            <span>{symptom}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* ── Differential Diagnosis ── */}
                    {diagnosis.differentialDiagnosis && diagnosis.differentialDiagnosis.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <button
                            onClick={() => toggleSection('differential')}
                            className="w-full flex items-center justify-between font-bold mb-3"
                          >
                            <span className="flex items-center gap-2">
                              <Microscope className="h-4 w-4 text-purple-500" />
                              التشخيص التفاضلي:
                            </span>
                            {expandedSections.differential ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {expandedSections.differential && (
                            <div className="space-y-2">
                              {diagnosis.differentialDiagnosis.map((item, i) => (
                                <div key={i} className="p-3 border rounded-lg bg-muted/30">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm">{item.arabicName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(item.probability * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground italic mb-1">{item.disease}</p>
                                  <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                                  <div className="mt-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-purple-500 transition-all"
                                      style={{ width: `${item.probability * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* ── Treatment ── */}
                    <div>
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <Pill className="h-4 w-4 text-green-500" />
                        العلاج:
                      </h4>
                      <ol className="space-y-2">
                        {diagnosis.treatment.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="shrink-0 w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* ── Treatment Timeline ── */}
                    {diagnosis.treatmentTimeline && diagnosis.treatmentTimeline.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <button
                            onClick={() => toggleSection('timeline')}
                            className="w-full flex items-center justify-between font-bold mb-3"
                          >
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-500" />
                              الجدول الزمني للعلاج:
                            </span>
                            {expandedSections.timeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {expandedSections.timeline && (
                            <div className="relative pr-4">
                              {/* Timeline line */}
                              <div className="absolute right-1 top-2 bottom-2 w-0.5 bg-blue-200 dark:bg-blue-800" />
                              <div className="space-y-4">
                                {diagnosis.treatmentTimeline.map((item, i) => (
                                  <div key={i} className="relative pr-6">
                                    {/* Timeline dot */}
                                    <div className="absolute -right-0 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-background z-10" />
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">{item.day}</p>
                                      <ul className="mt-1 space-y-1">
                                        {item.actions.map((action, j) => (
                                          <li key={j} className="text-xs flex gap-1">
                                            <span className="text-blue-500">→</span>
                                            <span>{action}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Medication Warnings ── */}
                    {diagnosis.medicationWarnings && diagnosis.medicationWarnings.length > 0 && (
                      <>
                        <Separator />
                        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription>
                            <p className="font-bold text-sm mb-2">⚠️ تحذيرات الأدوية:</p>
                            <ul className="space-y-1">
                              {diagnosis.medicationWarnings.map((warning, i) => (
                                <li key={i} className="text-xs flex gap-1">
                                  <span className="text-amber-600 shrink-0">⛔</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </>
                    )}

                    {/* ── Quarantine Protocol ── */}
                    {diagnosis.quarantineProtocol?.required && (
                      <>
                        <Separator />
                        <div>
                          <button
                            onClick={() => toggleSection('quarantine')}
                            className="w-full flex items-center justify-between font-bold mb-3"
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-red-500" />
                              بروتوكول الحجر الصحي:
                            </span>
                            {expandedSections.quarantine ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {expandedSections.quarantine && (
                            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800 space-y-2">
                              <div className="flex gap-4 text-sm">
                                <span className="text-muted-foreground">المدة:</span>
                                <span className="font-semibold">{diagnosis.quarantineProtocol.duration}</span>
                              </div>
                              {diagnosis.quarantineProtocol.tankSetup && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">إعداد الحوض: </span>
                                  <span>{diagnosis.quarantineProtocol.tankSetup}</span>
                                </div>
                              )}
                              <ol className="space-y-1 mt-2">
                                {diagnosis.quarantineProtocol.steps.map((step, i) => (
                                  <li key={i} className="text-xs flex gap-2">
                                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 text-[10px] shrink-0">{i + 1}</Badge>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Water Parameters ── */}
                    {diagnosis.waterParameters && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-bold mb-3 flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            معايير المياه الموصى بها:
                          </h4>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-sm">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                              <Thermometer className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                              <div className="font-semibold text-[10px] mb-0.5">الحرارة</div>
                              <div className="font-bold text-xs text-blue-600">{diagnosis.waterParameters.temperature}</div>
                            </div>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
                              <div className="font-semibold text-[10px] mb-0.5">pH</div>
                              <div className="font-bold text-xs text-purple-600">{diagnosis.waterParameters.ph}</div>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
                              <div className="font-semibold text-[10px] mb-0.5">أمونيا</div>
                              <div className="font-bold text-xs text-amber-600">{diagnosis.waterParameters.ammonia}</div>
                            </div>
                            {diagnosis.waterParameters.nitrite && (
                              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                                <div className="font-semibold text-[10px] mb-0.5">نيتريت</div>
                                <div className="font-bold text-xs text-red-600">{diagnosis.waterParameters.nitrite}</div>
                              </div>
                            )}
                            {diagnosis.waterParameters.nitrate && (
                              <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                                <div className="font-semibold text-[10px] mb-0.5">نيترات</div>
                                <div className="font-bold text-xs text-green-600">{diagnosis.waterParameters.nitrate}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Prognosis ── */}
                    {diagnosis.prognosis && (
                      <>
                        <Separator />
                        <div>
                          <button
                            onClick={() => toggleSection('prognosis')}
                            className="w-full flex items-center justify-between font-bold mb-3"
                          >
                            <span className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-indigo-500" />
                              التوقعات والمتابعة:
                            </span>
                            {expandedSections.prognosis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {expandedSections.prognosis && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                  <p className="text-xs text-muted-foreground">احتمال الشفاء</p>
                                  <p className="font-bold text-lg text-indigo-600">{diagnosis.prognosis.recoveryChance}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                  <p className="text-xs text-muted-foreground">مدة العلاج</p>
                                  <p className="font-bold text-lg text-indigo-600">{diagnosis.prognosis.expectedDuration}</p>
                                </div>
                              </div>

                              {diagnosis.prognosis.signsOfImprovement?.length > 0 && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                  <p className="font-semibold text-xs text-green-700 dark:text-green-400 mb-1">✅ علامات التحسن المتوقعة:</p>
                                  <ul className="space-y-1">
                                    {diagnosis.prognosis.signsOfImprovement.map((sign, i) => (
                                      <li key={i} className="text-xs flex gap-1">
                                        <span className="text-green-500 shrink-0">•</span>
                                        <span>{sign}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {diagnosis.prognosis.signsOfDeterioration?.length > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                  <p className="font-semibold text-xs text-red-700 dark:text-red-400 mb-1">🚨 علامات تستوجب تدخل فوري:</p>
                                  <ul className="space-y-1">
                                    {diagnosis.prognosis.signsOfDeterioration.map((sign, i) => (
                                      <li key={i} className="text-xs flex gap-1">
                                        <span className="text-red-500 shrink-0">•</span>
                                        <span>{sign}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {diagnosis.prognosis.followUpDate && (
                                <p className="text-xs text-muted-foreground">
                                  📅 موعد إعادة التقييم: <strong>{diagnosis.prognosis.followUpDate}</strong>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Prevention ── */}
                    {diagnosis.prevention.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-bold mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-teal-500" />
                            الوقاية:
                          </h4>
                          <ul className="space-y-2">
                            {diagnosis.prevention.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* ── Feedback Loop ── */}
                    {analysisId && !feedbackSent && (
                      <>
                        <Separator />
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl border border-blue-200 dark:border-blue-800">
                          <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                            📊 هل التشخيص صحيح؟
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            ملاحظاتك تساعد Dr. AQUAVO يصير أذكى مع كل حالة
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await fetch('/api/ai-advanced/diagnosis/feedback', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ analysisId, isCorrect: true, rating: 5 }),
                                  });
                                  setFeedbackSent(true);
                                } catch { /* ignore */ }
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> صحيح
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await fetch('/api/ai-advanced/diagnosis/feedback', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ analysisId, isCorrect: false }),
                                  });
                                  setFeedbackSent(true);
                                } catch { /* ignore */ }
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> غير دقيق
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    {feedbackSent && (
                      <>
                        <Separator />
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center text-sm text-green-700 dark:text-green-300">
                          ✅ شكراً لملاحظتك! Dr. AQUAVO يتعلم من كل حالة
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══════════ Disease Categories Reference ═══════════ */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">قاعدة بيانات الأمراض</h2>
            <p className="text-muted-foreground">40+ مرض مصنف حسب النوع — Dr. AQUAVO يعرفها جميعاً</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {diseaseCategories.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <Card key={cat.category} className="hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                      <CatIcon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{cat.category}</CardTitle>
                    <CardDescription className="text-xs">{cat.categoryEn}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cat.diseases.map((disease) => (
                        <div key={disease.name} className="flex items-center justify-between gap-2">
                          <span className="text-xs">{disease.name}</span>
                          <Badge className={`${urgencyConfig[disease.urgency].color} text-white text-[10px] px-1.5 py-0`}>
                            {urgencyConfig[disease.urgency].text}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

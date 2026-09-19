import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MetaTags } from "@/components/seo/meta-tags";
import { useToast } from "@/hooks/use-toast";
import { GOVERNORATES } from "@/components/cart/checkout/types";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Handshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

type YesNo = "yes" | "no" | "";

interface FormState {
  // honeypot
  website: string;
  // Section 1
  agreeCommissionOnly: YesNo;
  agreeCommissionAfterReceipt: YesNo;
  agreeNoMoneyWithoutApproval: YesNo;
  agreeNoPriceChange: YesNo;
  agreeNoTreatment: YesNo;
  // Section 2
  fullName: string;
  age: string;
  gender: "male" | "female" | "";
  governorate: string;
  area: string;
  phone: string;
  whatsapp: string;
  socialLink: string;
  // Section 3
  fieldReady: YesNo;
  weeklyHours: string;
  transport: string;
  weeklyVisits: string;
  firstWeekPlaces: string;
  // Section 4
  salesExperience: YesNo;
  soldBefore: string;
  workedCommission: YesNo;
  relationshipsDetails: string;
  aquariumKnowledge: string;
  // Section 5
  testDiscount: string;
  testCash: string;
  testTreatment: string;
  testMarkup: string;
  testMistake: string;
  // Section 6
  sellWhyAquavo: string;
  sellNewTank: string;
  sellShopMessage: string;
  sellFirstThreeOrders: string;
  // Section 7
  agreeWhatsappEval: YesNo;
  agreeVoiceNote: YesNo;
  agreeIdLater: YesNo;
  bestContactTime: string;
  // Section 8
  consentCommissionNotJob: boolean;
  consentCommissionAfterReceipt: boolean;
  consentNoPriceChange: boolean;
  consentNoMoneyWithoutApproval: boolean;
  consentNoTreatment: boolean;
  consentViolationStops: boolean;
  consentDataUsage: boolean;
  signature: string;
}

const initialState: FormState = {
  website: "",
  agreeCommissionOnly: "",
  agreeCommissionAfterReceipt: "",
  agreeNoMoneyWithoutApproval: "",
  agreeNoPriceChange: "",
  agreeNoTreatment: "",
  fullName: "", age: "", gender: "", governorate: "", area: "", phone: "", whatsapp: "", socialLink: "",
  fieldReady: "", weeklyHours: "", transport: "", weeklyVisits: "", firstWeekPlaces: "",
  salesExperience: "", soldBefore: "", workedCommission: "", relationshipsDetails: "", aquariumKnowledge: "",
  testDiscount: "", testCash: "", testTreatment: "", testMarkup: "", testMistake: "",
  sellWhyAquavo: "", sellNewTank: "", sellShopMessage: "", sellFirstThreeOrders: "",
  agreeWhatsappEval: "", agreeVoiceNote: "", agreeIdLater: "", bestContactTime: "",
  consentCommissionNotJob: false, consentCommissionAfterReceipt: false, consentNoPriceChange: false,
  consentNoMoneyWithoutApproval: false, consentNoTreatment: false, consentViolationStops: false,
  consentDataUsage: false, signature: "",
};

const STEP_TITLES = [
  i18next.t("pages:partners.s1"),
  i18next.t("pages:partners.s2"),
  i18next.t("pages:partners.s3"),
  i18next.t("pages:partners.s4"),
  i18next.t("pages:partners.s5"),
  i18next.t("pages:partners.s6"),
  i18next.t("pages:partners.s7"),
  i18next.t("pages:partners.s8"),
];

// Reusable bits ---------------------------------------------------------------

function YesNoField({
  label, value, onChange, name,
}: { label: string; value: YesNo; onChange: (v: YesNo) => void; name: string }) {
  const { t } = useTranslation("pages");
  return (
    <div className="space-y-2">
      <Label className="text-base leading-relaxed">{label}</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as YesNo)}
        className="flex gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${name}-yes`} />
          <Label htmlFor={`${name}-yes`} className="cursor-pointer">{t("partners.s9")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${name}-no`} />
          <Label htmlFor={`${name}-no`} className="cursor-pointer">{t("partners.s10")}</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function ConsentField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-1" />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  );
}

function TextField({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={type === "tel" ? "tel" : undefined} />
    </div>
  );
}

function AreaField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-base leading-relaxed">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    </div>
  );
}

// Page ------------------------------------------------------------------------

export default function PartnersPage() {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const phoneOk = (p: string) => /^07[3-9]\d{8}$/.test(p.replace(/\D/g, ""));

  function validateStep(): string | null {
    switch (step) {
      case 0:
        for (const k of [
          "agreeCommissionOnly", "agreeCommissionAfterReceipt", "agreeNoMoneyWithoutApproval",
          "agreeNoPriceChange", "agreeNoTreatment",
        ] as const) {
          if (!form[k]) return t("partners.s11");
        }
        return null;
      case 1:
        if (form.fullName.trim().length < 3) return t("partners.s12");
        if (!form.age || Number(form.age) < 10 || Number(form.age) > 99) return t("partners.s13");
        if (!form.gender) return t("partners.s14");
        if (!form.governorate) return t("partners.s15");
        if (!form.area.trim()) return t("partners.s16");
        if (!phoneOk(form.phone)) return t("partners.s17");
        if (form.whatsapp.trim() && !phoneOk(form.whatsapp)) return t("partners.s18");
        return null;
      case 7:
        for (const k of [
          "consentCommissionNotJob", "consentCommissionAfterReceipt", "consentNoPriceChange",
          "consentNoMoneyWithoutApproval", "consentNoTreatment", "consentViolationStops", "consentDataUsage",
        ] as const) {
          if (!form[k]) return t("partners.s19");
        }
        if (form.signature.trim().length < 3) return t("partners.s20");
        return null;
      default:
        return null;
    }
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast({ title: t("partners.s21"), description: err, variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      toast({ title: t("partners.s21"), description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        agreeCommissionOnly: form.agreeCommissionOnly === "yes",
        agreeCommissionAfterReceipt: form.agreeCommissionAfterReceipt === "yes",
        agreeNoMoneyWithoutApproval: form.agreeNoMoneyWithoutApproval === "yes",
        agreeNoPriceChange: form.agreeNoPriceChange === "yes",
        agreeNoTreatment: form.agreeNoTreatment === "yes",
        agreeWhatsappEval: form.agreeWhatsappEval || undefined,
        agreeVoiceNote: form.agreeVoiceNote || undefined,
        agreeIdLater: form.agreeIdLater || undefined,
        fieldReady: form.fieldReady || undefined,
        salesExperience: form.salesExperience || undefined,
        workedCommission: form.workedCommission || undefined,
      };
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: t("partners.s22"), description: data.message || t("partners.s23"), variant: "destructive" });
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({ title: t("partners.s22"), description: t("partners.s24"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <div className="flex-1 flex flex-col bg-background" dir="rtl">
      <MetaTags
        title={t("partners.s25")}
        description={t("partners.s26")}
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {done ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">{t("partners.s27")}</h1>
              <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                {t("partners.s28")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6 mt-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <Handshake className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">{t("partners.s25")}</h1>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {t("partners.s29")}
              </p>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-semibold text-primary">{STEP_TITLES[step]}</span>
                <span className="text-muted-foreground">{step + 1} / {STEP_TITLES.length}</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Honeypot — hidden from users, traps bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <Card>
              <CardContent className="py-6 space-y-6">
                {step === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">{t("partners.s30")}</p>
                    <YesNoField name="t1" label={t("partners.s31")}
                      value={form.agreeCommissionOnly} onChange={(v) => set("agreeCommissionOnly", v)} />
                    <YesNoField name="t2" label={t("partners.s32")}
                      value={form.agreeCommissionAfterReceipt} onChange={(v) => set("agreeCommissionAfterReceipt", v)} />
                    <YesNoField name="t3" label={t("partners.s33")}
                      value={form.agreeNoMoneyWithoutApproval} onChange={(v) => set("agreeNoMoneyWithoutApproval", v)} />
                    <YesNoField name="t4" label={t("partners.s34")}
                      value={form.agreeNoPriceChange} onChange={(v) => set("agreeNoPriceChange", v)} />
                    <YesNoField name="t5" label={t("partners.s35")}
                      value={form.agreeNoTreatment} onChange={(v) => set("agreeNoTreatment", v)} />
                  </>
                )}

                {step === 1 && (
                  <>
                    <TextField label={t("partners.s36")} value={form.fullName} onChange={(v) => set("fullName", v)} placeholder={t("partners.s37")} />
                    <div className="grid grid-cols-2 gap-4">
                      <TextField label={t("partners.s38")} value={form.age} onChange={(v) => set("age", v.replace(/\D/g, ""))} type="number" />
                      <div className="space-y-2">
                        <Label className="text-base">{t("partners.s39")}</Label>
                        <RadioGroup value={form.gender} onValueChange={(v) => set("gender", v as any)} className="flex gap-6 pt-2">
                          <div className="flex items-center gap-2"><RadioGroupItem value="male" id="g-m" /><Label htmlFor="g-m" className="cursor-pointer">{t("partners.s40")}</Label></div>
                          <div className="flex items-center gap-2"><RadioGroupItem value="female" id="g-f" /><Label htmlFor="g-f" className="cursor-pointer">{t("partners.s41")}</Label></div>
                        </RadioGroup>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">{t("partners.s42")}</Label>
                      <Select value={form.governorate} onValueChange={(v) => set("governorate", v)}>
                        <SelectTrigger><SelectValue placeholder={t("partners.s15")} /></SelectTrigger>
                        <SelectContent>
                          {GOVERNORATES.map((g) => (
                            <SelectItem key={g.value} value={g.label}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <TextField label={t("partners.s43")} value={form.area} onChange={(v) => set("area", v)} placeholder={t("partners.s44")} />
                    <TextField label={t("partners.s45")} value={form.phone} onChange={(v) => set("phone", v)} type="tel" placeholder="07701234567" />
                    <TextField label={t("partners.s46")} value={form.whatsapp} onChange={(v) => set("whatsapp", v)} type="tel" placeholder={t("partners.s47")} />
                    <TextField label={t("partners.s48")} value={form.socialLink} onChange={(v) => set("socialLink", v)} placeholder={t("partners.s47")} />
                  </>
                )}

                {step === 2 && (
                  <>
                    <YesNoField name="fr" label={t("partners.s49")} value={form.fieldReady} onChange={(v) => set("fieldReady", v)} />
                    <TextField label={t("partners.s50")} value={form.weeklyHours} onChange={(v) => set("weeklyHours", v)} placeholder={t("partners.s51")} />
                    <TextField label={t("partners.s52")} value={form.transport} onChange={(v) => set("transport", v)} placeholder={t("partners.s53")} />
                    <TextField label={t("partners.s54")} value={form.weeklyVisits} onChange={(v) => set("weeklyVisits", v)} placeholder={t("partners.s55")} />
                    <AreaField label={t("partners.s56")} value={form.firstWeekPlaces} onChange={(v) => set("firstWeekPlaces", v)} placeholder={t("partners.s57")} />
                  </>
                )}

                {step === 3 && (
                  <>
                    <YesNoField name="se" label={t("partners.s58")} value={form.salesExperience} onChange={(v) => set("salesExperience", v)} />
                    <AreaField label={t("partners.s59")} value={form.soldBefore} onChange={(v) => set("soldBefore", v)} />
                    <YesNoField name="wc" label={t("partners.s60")} value={form.workedCommission} onChange={(v) => set("workedCommission", v)} />
                    <AreaField label={t("partners.s61")} value={form.relationshipsDetails} onChange={(v) => set("relationshipsDetails", v)} />
                    <AreaField label={t("partners.s62")} value={form.aquariumKnowledge} onChange={(v) => set("aquariumKnowledge", v)} />
                  </>
                )}

                {step === 4 && (
                  <>
                    <AreaField label={t("partners.s63")} value={form.testDiscount} onChange={(v) => set("testDiscount", v)} />
                    <AreaField label={t("partners.s64")} value={form.testCash} onChange={(v) => set("testCash", v)} />
                    <AreaField label={t("partners.s65")} value={form.testTreatment} onChange={(v) => set("testTreatment", v)} />
                    <AreaField label={t("partners.s66")} value={form.testMarkup} onChange={(v) => set("testMarkup", v)} />
                    <AreaField label={t("partners.s67")} value={form.testMistake} onChange={(v) => set("testMistake", v)} />
                  </>
                )}

                {step === 5 && (
                  <>
                    <AreaField label={t("partners.s68")} value={form.sellWhyAquavo} onChange={(v) => set("sellWhyAquavo", v)} />
                    <AreaField label={t("partners.s69")} value={form.sellNewTank} onChange={(v) => set("sellNewTank", v)} />
                    <AreaField label={t("partners.s70")} value={form.sellShopMessage} onChange={(v) => set("sellShopMessage", v)} />
                    <AreaField label={t("partners.s71")} value={form.sellFirstThreeOrders} onChange={(v) => set("sellFirstThreeOrders", v)} />
                  </>
                )}

                {step === 6 && (
                  <>
                    <YesNoField name="we" label={t("partners.s72")} value={form.agreeWhatsappEval} onChange={(v) => set("agreeWhatsappEval", v)} />
                    <YesNoField name="vn" label={t("partners.s73")} value={form.agreeVoiceNote} onChange={(v) => set("agreeVoiceNote", v)} />
                    <YesNoField name="id" label={t("partners.s74")} value={form.agreeIdLater} onChange={(v) => set("agreeIdLater", v)} />
                    <TextField label={t("partners.s75")} value={form.bestContactTime} onChange={(v) => set("bestContactTime", v)} placeholder={t("partners.s76")} />
                  </>
                )}

                {step === 7 && (
                  <>
                    <p className="text-sm text-muted-foreground">{t("partners.s77")}</p>
                    <ConsentField label={t("partners.s78")} checked={form.consentCommissionNotJob} onChange={(v) => set("consentCommissionNotJob", v)} />
                    <ConsentField label={t("partners.s79")} checked={form.consentCommissionAfterReceipt} onChange={(v) => set("consentCommissionAfterReceipt", v)} />
                    <ConsentField label={t("partners.s80")} checked={form.consentNoPriceChange} onChange={(v) => set("consentNoPriceChange", v)} />
                    <ConsentField label={t("partners.s81")} checked={form.consentNoMoneyWithoutApproval} onChange={(v) => set("consentNoMoneyWithoutApproval", v)} />
                    <ConsentField label={t("partners.s82")} checked={form.consentNoTreatment} onChange={(v) => set("consentNoTreatment", v)} />
                    <ConsentField label={t("partners.s83")} checked={form.consentViolationStops} onChange={(v) => set("consentViolationStops", v)} />
                    <ConsentField label={t("partners.s84")} checked={form.consentDataUsage} onChange={(v) => set("consentDataUsage", v)} />
                    <TextField label={t("partners.s85")} value={form.signature} onChange={(v) => set("signature", v)} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-3 mt-6">
              <Button variant="outline" onClick={prev} disabled={step === 0 || submitting} className="gap-1">
                <ChevronRight className="w-4 h-4" /> {t("partners.s86")}
              </Button>
              {step < STEP_TITLES.length - 1 ? (
                <Button onClick={next} className="gap-1">
                  {t("partners.s87")} <ChevronLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting} className="gap-2 min-w-32">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("partners.s88")}</> : t("partners.s89")}
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

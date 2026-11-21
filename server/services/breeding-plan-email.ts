import { z } from "zod";
import { breedingSpecies } from "../../shared/breeding-data.js";
import { OperationalError } from "../middleware/error-handler.js";

const startDate = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "تاريخ البدء غير صالح");

// Legacy clients can send descriptive fields, but those are intentionally ignored.
export const breedingPlanEmailInput = z.object({
  email: z.string().trim().max(254).email().optional(),
  speciesId: z.string().trim().min(1).max(100),
  inputData: z.object({
    pairs: z.number().int().min(1).max(1000),
    startDate,
    temp: z.number().finite().min(0).max(45),
    ph: z.number().finite().min(0).max(14),
  }).strict(),
});

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function buildBreedingPlanEmail(data: z.infer<typeof breedingPlanEmailInput>) {
  const species = breedingSpecies.find(candidate => candidate.id === data.speciesId);
  if (!species) throw new OperationalError("نوع التكاثر غير موجود", 400);
  const { inputData } = data;
  const dateAt = (days: number) => {
    const date = new Date(`${inputData.startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toLocaleDateString("ar-IQ", { timeZone: "UTC" });
  };
  const maturity = species.sexualMaturityWeeks * 7;
  const firstSpawn = maturity + 7;
  const timeline = [
    { date: dateAt(maturity), event: "موعد النضج الجنسي التقديري" },
    { date: dateAt(firstSpawn), event: species.method === "live-bearer" ? "التزاوج الأول المتوقع" : "وضع البيض الأول المتوقع" },
  ];
  const hatchDays = species.method === "live-bearer" ? species.gestationDays : species.eggHatchDays;
  if (hatchDays) timeline.push({ date: dateAt(firstSpawn + hatchDays), event: species.method === "live-bearer" ? "الولادة الأولى المتوقعة" : "فقس البيض المتوقع" });
  if (species.breedingInterval > 0) timeline.push({ date: dateAt(firstSpawn + species.breedingInterval), event: "دورة التكاثر الثانية المتوقعة" });
  const yearlyProduction = species.breedingInterval > 0
    ? Math.round(Math.floor(365 / species.breedingInterval) * (species.avgFryCount.min + species.avgFryCount.max) / 2 * inputData.pairs) : 0;
  const rows: [string, unknown][] = [
    ["تاريخ البدء", inputData.startDate], ["عدد الأزواج", inputData.pairs],
    ["الحرارة المدخلة", `${inputData.temp} °C`], ["pH المدخل", inputData.ph],
    ["مدى الحرارة", `${species.optimalTemp.min}–${species.optimalTemp.max} °C`],
    ["مدى pH", `${species.optimalPH.min}–${species.optimalPH.max}`],
    ["أقل حجم حوض", `${species.minTankSize} لتر`],
    ["صغار لكل دورة", `${species.avgFryCount.min}–${species.avgFryCount.max}`],
    ["الإنتاج السنوي التقديري", yearlyProduction],
  ];
  return {
    subject: `خطة التكاثر: ${species.arabicName} من AQUAVO`,
    html: `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#F6F4EF;color:#0B1E28;padding:20px">
<main style="max-width:600px;margin:auto;background:white;padding:24px">
<h1 style="color:#0B93A6">خطة التكاثر</h1><h2>${escapeEmailHtml(species.arabicName)} (${escapeEmailHtml(species.name)})</h2>
<p>هذه مواعيد وتقديرات حسابية حسب بيانات الحاسبة. النتيجة الفعلية تتأثر بالعمر والصحة وظروف الحوض.</p>
<table style="width:100%;text-align:right">${rows.map(([label, value]) => `<tr><th style="padding:8px">${escapeEmailHtml(label)}</th><td style="padding:8px">${escapeEmailHtml(value)}</td></tr>`).join("")}</table>
<h2>الجدول الزمني التقديري</h2>${timeline.map(item => `<p><strong>${escapeEmailHtml(item.date)}</strong>: ${escapeEmailHtml(item.event)}</p>`).join("")}
<p>AQUAVO — مستلزمات أحواض الزينة</p></main></body></html>`,
  };
}

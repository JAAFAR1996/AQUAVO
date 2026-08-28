/**
 * The steps the aquarium-setup journey walks a visitor through.
 *
 * /journey is an interactive wizard, so its answers and product suggestions
 * only exist once React runs and a person makes choices. What the tool *covers*
 * is fixed, though, and a crawler was told none of it: the route served 19
 * substantive words where a visitor sees 197.
 *
 * The ids and titles live here so the client wizard and the crawler page read
 * the same list. client/src/components/journey/constants.ts attaches an icon to
 * each entry for the UI; the crawler renders the titles. Neither side restates
 * the other, so a renamed or reordered step cannot show up in one place only.
 */
export interface JourneyStepOutline {
  id: string;
  title: string;
}

export const JOURNEY_STEPS: readonly JourneyStepOutline[] = Object.freeze([
  { id: "tank", title: "اختيار الحوض" },
  { id: "location", title: "الموقع" },
  { id: "equipment", title: "المعدات" },
  { id: "decor", title: "الديكور" },
  { id: "water", title: "المياه" },
  { id: "cycling", title: "التدوير" },
  { id: "fish", title: "الأسماك" },
  { id: "maintenance", title: "الصيانة" },
  { id: "summary", title: "الملخص" },
]);

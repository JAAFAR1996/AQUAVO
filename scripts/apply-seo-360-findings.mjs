import fs from "node:fs";

function replaceExact(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected exactly one match, found ${count}`);
  }
  fs.writeFileSync(path, source.replace(from, to));
}

replaceExact(
  "api/ssr-preview.ts",
  `} from "./_canonical-guides.js";\nimport {\n  AQUAVO_BASE_URL,`,
  `} from "./_canonical-guides.js";\nimport { getSeoMetaOverride } from "./_seo-content.js";\nimport {\n  AQUAVO_BASE_URL,`,
);

replaceExact(
  "api/ssr-preview.ts",
  `        title: "الأسئلة الشائعة | AQUAVO",\n        description: "إجابات مباشرة عن الشحن والدفع والدعم واختيار معدات أحواض الزينة.",`,
  `        title: getSeoMetaOverride(pathname)?.title || "الأسئلة الشائعة | AQUAVO",\n        description: getSeoMetaOverride(pathname)?.description || "إجابات مباشرة عن الشحن والدفع والدعم واختيار معدات أحواض الزينة.",`,
);

replaceExact(
  "api/ssr-preview.ts",
  `        title: "عن AQUAVO | متجر أحواض الزينة في العراق",\n        description: "AQUAVO متجر إلكتروني عراقي لمعدات ومستلزمات أحواض الزينة، يعمل عبر الموقع وواتساب ولا يبيع كائنات حية.",`,
  `        title: getSeoMetaOverride(pathname)?.title || "عن AQUAVO | متجر أحواض الزينة في العراق",\n        description: getSeoMetaOverride(pathname)?.description || "AQUAVO متجر إلكتروني عراقي لمعدات ومستلزمات أحواض الزينة، يعمل عبر الموقع وواتساب ولا يبيع كائنات حية.",`,
);

replaceExact(
  "api/ssr-preview.ts",
  `  const copy = STATIC_COPY[pathname];\n  if (copy) {\n    return {\n      page: { kind: "static", path: pathname, ...copy },\n      meta: {\n        title: \`${"${copy.heading}"} | AQUAVO\`,\n        description: copy.summary,\n        canonicalPath: pathname,\n        jsonLd: webPageSchema(copy.heading, copy.summary, pathname),\n      },`,
  `  const copy = STATIC_COPY[pathname];\n  if (copy) {\n    const metaOverride = getSeoMetaOverride(pathname);\n    const description = metaOverride?.description || copy.summary;\n    return {\n      page: { kind: "static", path: pathname, ...copy },\n      meta: {\n        title: metaOverride?.title || \`${"${copy.heading}"} | AQUAVO\`,\n        description,\n        canonicalPath: pathname,\n        jsonLd: webPageSchema(copy.heading, description, pathname),\n      },`,
);

replaceExact(
  "api/_seo-content.ts",
  `  "/shipping": {\n    title: "التوصيل والدفع عند الاستلام في العراق | AQUAVO",`,
  `  "/contact": {\n    title: "تواصل مع AQUAVO لطلبات ومستلزمات أحواض الزينة",\n    description: "تواصل مع AQUAVO عبر القنوات الرسمية للاستفسار عن حالة الطلب، التوصيل، أو اختيار معدات ومستلزمات مناسبة لحجم حوض الزينة في العراق.",\n  },\n  "/shipping": {\n    title: "التوصيل والدفع عند الاستلام في العراق | AQUAVO",`,
);

replaceExact(
  "api/_seo-content.ts",
  `    title: "الشروط والأحكام | AQUAVO",`,
  `    title: "الشروط والأحكام للطلبات واستخدام موقع AQUAVO",`,
);

replaceExact(
  "scripts/seo-production-360-audit.mjs",
  `  if (record.ssrMode !== "semantic-v3") {\n    addCritical("crawler-not-semantic", url, \`x-aquavo-ssr-mode=${"${record.ssrMode || \"missing\"}"}\`);\n  }`,
  `  if (!["semantic-v3", "guide-index-v3", "guide-content-v3"].includes(record.ssrMode)) {\n    addCritical("crawler-not-semantic", url, \`x-aquavo-ssr-mode=${"${record.ssrMode || \"missing\"}"}\`);\n  }`,
);

replaceExact(
  "scripts/verify-generated-ssr-runtime.ts",
  `assert(guide.body.includes('rel="canonical"'), "Guide initial HTML has no canonical");\n\nconst missing = await invoke(runtime.default, "/__aquavo_missing_runtime_smoke__");`,
  `assert(guide.body.includes('rel="canonical"'), "Guide initial HTML has no canonical");\n\nconst optimizedStaticRoutes = [\n  "/deals",\n  "/beginner-guide",\n  "/terms",\n  "/faq",\n  "/privacy-policy",\n  "/contact",\n  "/shipping",\n  "/journey",\n  "/fish-encyclopedia",\n  "/aquarium-wizard",\n  "/tank-builder",\n];\nfor (const route of optimizedStaticRoutes) {\n  const response = await invoke(runtime.default, route);\n  const title = response.body.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]?.trim() || "";\n  const description = response.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() || "";\n  assert(response.statusCode === 200, \`${"${route} returned ${response.statusCode}"}\`);\n  assert(response.headers["x-aquavo-ssr-mode"] === "semantic-v3", \`${"${route} did not use semantic-v3"}\`);\n  assert([...title].length >= 25, \`${"${route} title is too short: ${[...title].length}"}\`);\n  assert([...description].length >= 70, \`${"${route} description is too short: ${[...description].length}"}\`);\n}\n\nconst missing = await invoke(runtime.default, "/__aquavo_missing_runtime_smoke__");`,
);

console.log("Applied SEO 360 findings remediation.");

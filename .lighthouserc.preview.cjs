const base = (process.env.PREVIEW_URL || "").replace(/\/$/, "");

if (!base) {
  throw new Error("PREVIEW_URL is required for the Lighthouse preview audit");
}

module.exports = {
  ci: {
    collect: {
      url: [`${base}/`, `${base}/products`, `${base}/faq`],
      numberOfRuns: 1,
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices"],
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
        throttlingMethod: "simulate",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.65 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.85 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.15 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],
        "errors-in-console": ["error", { maxLength: 0 }],
        "document-title": "error",
        "html-has-lang": "error",
        "meta-description": "error",
        "link-name": "error",
        "heading-order": "error",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "artifacts/lighthouse",
    },
  },
};

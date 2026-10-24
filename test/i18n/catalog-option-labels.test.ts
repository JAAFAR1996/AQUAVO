import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Public catalog IDs and literal measurement tokens only; no inventory or cost evidence.
const requiredOptions: Record<string, Record<string, string[]>> = {
  "houyi-south-american-sand": {
    "brown": [],
    "red": []
  },
  "houyi-blue-dragon-stone": {
    "pickling": [],
    "unpicked": []
  },
  "tian-yuan-water-valves": {
    "15-15mm": [
      "15",
      "15"
    ],
    "15-19mm": [
      "15",
      "19"
    ],
    "19-19mm": [
      "19",
      "19"
    ]
  },
  "aquarium-clear-lid-supports": {
    "6mm": [
      "6"
    ],
    "8mm": [
      "8"
    ],
    "10mm": [
      "10"
    ],
    "12mm": [
      "12"
    ]
  },
  "voonline-filter-intake-guards": {
    "12mm": [
      "12"
    ],
    "16mm": [
      "16"
    ]
  },
  "glass-filter-intake-u": {
    "12mm": [
      "12"
    ],
    "16mm": [
      "16"
    ]
  },
  "glass-filter-outlet-horn": {
    "12mm": [
      "12"
    ],
    "16mm": [
      "16"
    ]
  },
  "glass-filter-outlet-double-cut": {
    "12mm": [
      "12"
    ],
    "16mm": [
      "16"
    ]
  },
  "green-filter-hose": {
    "12mm": [
      "12"
    ],
    "16mm": [
      "16"
    ]
  },
  "qanvee-k-quick-connections": {
    "k-12-16": [
      "12",
      "16"
    ],
    "k-16-22": [
      "16",
      "22"
    ]
  },
  "sunsun-xbl-hang-on-filters": {
    "xbl-300": [
      "300",
      "300"
    ],
    "xbl-500": [
      "500",
      "500"
    ],
    "xbl-600": [
      "600",
      "500"
    ]
  },
  "sunsun-eh-external-heaters": {
    "eh-300": [
      "300"
    ],
    "eh-500": [
      "500"
    ]
  },
  "houyi-decorative-sands-2-5kg": {
    "pink": [
      "0.2",
      "0.5"
    ],
    "peach": [
      "0.5",
      "1"
    ],
    "grey": [
      "0.5",
      "1"
    ],
    "snowflake": [
      "0.8",
      "1.2"
    ]
  },
  "sobo-aq-submersible-pumps": {
    "aq-1000": [
      "1000",
      "15"
    ],
    "aq-1500": [
      "1500",
      "25"
    ]
  },
  "houyi-volcanic-stone-red": {
    "1-2cm": [
      "1",
      "2"
    ],
    "3-5cm": [
      "3",
      "5"
    ],
    "5-8cm": [
      "5",
      "8"
    ],
    "10-30cm": [
      "10",
      "30"
    ]
  },
  "houyi-volcanic-stone-black": {
    "1-2cm": [
      "1",
      "2"
    ],
    "3-5cm": [
      "3",
      "5"
    ],
    "5-8cm": [
      "5",
      "8"
    ],
    "10-30cm": [
      "10",
      "30"
    ]
  },
  "houyi-stream-sand": {
    "2-6mm": [
      "2",
      "6"
    ],
    "5-8mm": [
      "5",
      "8"
    ]
  },
  "houyi-dutch-sand": {
    "current-5kg": [
      "5"
    ],
    "1mm": [
      "1"
    ]
  },
  "houyi-white-cotton": {
    "30x50cm": [
      "30",
      "50"
    ],
    "120x30x2": [
      "120",
      "30",
      "2"
    ]
  }
};
type Translation = { data: { variantLabels?: Record<string, string>; specifications?: { labelled?: Record<string, { label: string; value: string }> } } };
const catalog = (locale: string): Record<string, Translation> => JSON.parse(readFileSync(`data/i18n/translations/${locale}/products.json`, "utf8"));
const numbers = (value: string) => value.match(/\d+(?:\.\d+)?/g) ?? [];

describe("verified catalog option locale labels", () => {
  it("covers exactly the 48 required active catalog IDs", () => {
    expect(Object.values(requiredOptions).reduce((sum, options) => sum + Object.keys(options).length, 0)).toBe(48);
  });
  it.each(["en", "ckb"])("preserves every required option and literal measurement in %s", (locale) => {
    const products = catalog(locale);
    for (const [productId, options] of Object.entries(requiredOptions)) {
      for (const [optionId, measurements] of Object.entries(options)) {
        const label = products[productId]?.data.variantLabels?.[optionId];
        expect(label, `${locale}/${productId}/${optionId}`).toBeTruthy();
        expect(numbers(label!), `${locale}/${productId}/${optionId}`).toEqual(measurements);
      }
    }
  });
  it.each(["en", "ckb"])("does not invent units for the incoming cotton dimensions in %s", (locale) => {
    const products = catalog(locale);
    const values = [
      [products["houyi-white-cotton"].data.variantLabels!["120x30x2"], "120×30×2"],
      [products["houyi-biochemical-filter-foam"].data.specifications!.labelled!["الأبعاد التقريبية"].value, "45×45×4"],
      [products["houyi-green-white-filter-cotton"].data.specifications!.labelled!["الأبعاد التقريبية"].value, "120×30×0.8"],
    ];
    for (const [value, dimensions] of values) {
      expect(value).toContain(dimensions);
      expect(value).toContain(locale === "en" ? "unit not specified" : "دیاری نەکراوە");
      expect(value).not.toMatch(/\bcm\b|سانت|سم/);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  getVerifiedExternalAnnotations,
  VERIFIED_EXTERNAL_ANNOTATION_SOURCE,
  type ExternalAnnotationProduct,
} from "./verified-external-annotations";

const source = VERIFIED_EXTERNAL_ANNOTATION_SOURCE;
const product: ExternalAnnotationProduct = {
  id: source.productId,
  thumbnail: source.imageUrl,
  images: [source.imageUrl],
  hasVariants: false,
  variants: [],
};

describe("verified exterior photo annotations", () => {
  it("returns only the reviewed product and exact source image", () => {
    const result = getVerifiedExternalAnnotations(product, { locale: "en" });
    expect(result).toMatchObject({
      productId: "luby-gyhs03-202610",
      imageUrl: source.imageUrl,
      imageWidth: 1000,
      imageHeight: 1000,
      coordinateSpace: "image-plane-percent",
      title: "Explore the visible parts",
    });
    expect(result?.parts).toHaveLength(4);
    expect(result?.parts.map((part) => [part.x, part.y])).toEqual([
      [81.4, 58.8], [39.1, 62.8], [17.4, 45.8], [28.7, 22.3],
    ]);
  });

  it.each([null, undefined, { ...product, id: "different-product" }])(
    "returns no annotations for a missing or unknown product",
    (input) => expect(getVerifiedExternalAnnotations(input)).toBeNull(),
  );

  it.each([
    "https://example.com/another-angle.jpg",
    source.imageUrl.replace("v1792385362", "v1792385363"),
    `${source.imageUrl}?crop=another-angle`,
    null,
    "",
  ])("does not let coordinates follow a changed or missing photo: %s", (photoUrl) => {
    expect(getVerifiedExternalAnnotations(product, { photoUrl })).toBeNull();
  });

  it("does not revive an old photo after it is removed from the current product", () => {
    expect(getVerifiedExternalAnnotations({ ...product, thumbnail: "new.jpg", images: ["new.jpg"] }, {
      photoUrl: source.imageUrl,
    })).toBeNull();
  });

  it("checks the actual displayed image before an otherwise matching thumbnail", () => {
    expect(getVerifiedExternalAnnotations({ ...product, image: "other-angle.jpg" })).toBeNull();
  });

  it("can annotate an explicitly displayed verified gallery image", () => {
    expect(getVerifiedExternalAnnotations({ ...product, image: "other-angle.jpg" }, {
      photoUrl: source.imageUrl,
    })?.imageUrl).toBe(source.imageUrl);
  });

  it.each(["17m", "unknown-variant", ""])("rejects selected variant identity %s", (selectedVariantId) => {
    expect(getVerifiedExternalAnnotations(product, { selectedVariantId })).toBeNull();
  });

  it("rejects a newly variant-bearing product even before a variant is selected", () => {
    expect(getVerifiedExternalAnnotations({ ...product, hasVariants: true })).toBeNull();
    expect(getVerifiedExternalAnnotations({ ...product, variants: [{ id: "new-variant" }] })).toBeNull();
  });

  it.each(["ar", "ar-IQ", "en", "en-US", "ckb", "ckb-IQ"])("supplies every part and context in %s", (locale) => {
    const result = getVerifiedExternalAnnotations(product, { locale });
    expect(result?.title).toBeTruthy();
    expect(result?.note).toBeTruthy();
    expect(result?.sourceLabel).toBeTruthy();
    expect(result?.parts.every((part) => part.name && part.description)).toBe(true);
    expect(result?.parts.every((part) => part.imageUrl === "")).toBe(true);
  });

  it("falls back to the store's Arabic language for unknown locales", () => {
    expect(getVerifiedExternalAnnotations(product, { locale: "xx" }))
      .toEqual(getVerifiedExternalAnnotations(product, { locale: "ar" }));
  });

  it("keeps source-image coordinates physical, bounded, and unchanged in RTL", () => {
    const positions = (locale: string) => getVerifiedExternalAnnotations(product, { locale })?.parts.map(({ x, y }) => ({ x, y }));
    expect(positions("ar")).toEqual(positions("en"));
    expect(positions("ckb")).toEqual(positions("en"));
    for (const { x, y } of positions("ar") ?? []) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
    }
  });

  it("returns fresh parts so caller mutation cannot move future markers", () => {
    const first = getVerifiedExternalAnnotations(product);
    if (!first) throw new Error("Expected reviewed image annotations");
    first.parts[0].x = 0;
    expect(getVerifiedExternalAnnotations(product)?.parts[0].x).toBeCloseTo(81.4);
  });
});

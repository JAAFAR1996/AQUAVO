import { describe, expect, it } from "vitest";
import { canonicalProductGallery, primaryImageFirst } from "../product-gallery";

describe("one product gallery with one primary image", () => {
  it("deduplicates media and removes blank URLs while preserving the gallery order", () => {
    expect(canonicalProductGallery(["/a", " /b ", "/a", "", "  "])).toEqual(["/a", "/b"]);
  });
  it("promotes a selected picture to the same first position the storefront uses", () => {
    expect(primaryImageFirst(["/a", "/b", "/c"], "/c")).toEqual(["/c", "/a", "/b"]);
  });
  it("includes a newly uploaded hero without dropping historical gallery entries", () => {
    expect(primaryImageFirst(["/a", "/b"], "/new")).toEqual(["/new", "/a", "/b"]);
  });
  it("never creates a non-gallery thumbnail when there is no preferred image", () => {
    expect(primaryImageFirst(["/a", "/b"], "")).toEqual(["/a", "/b"]);
    expect(primaryImageFirst([], null)).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import {
  ELIGIBLE_SECTIONS,
  isEligibleSection,
  normalizeSectionPath,
  sectionDepth,
  flowDirection,
} from "../flow-gate-routes";

describe("flow-gate-routes eligibility", () => {
  it("accepts every principal top-level section", () => {
    for (const s of ELIGIBLE_SECTIONS) expect(isEligibleSection(s)).toBe(true);
  });

  it("ignores query and hash when matching a section", () => {
    expect(isEligibleSection("/products?sort=price&page=2")).toBe(true);
    expect(isEligibleSection("/profile?tab=orders")).toBe(true);
    expect(isEligibleSection("/#featured")).toBe(true);
    expect(isEligibleSection("/products/")).toBe(true); // trailing slash
  });

  it("excludes product details, cart/checkout, guides, search and utility routes", () => {
    for (const p of [
      "/products/aquavo-driftwood-collection", // product card → details
      "/checkout",
      "/order-confirmation/6364af3e",
      "/guides", // full-reload anchor, not an SPA section
      "/guides/algae-control",
      "/search",
      "/wishlist",
      "/contact",
      "/deals",
      "/admin",
      "/admin/finance",
    ]) {
      expect(isEligibleSection(p)).toBe(false);
    }
  });
});

describe("normalizeSectionPath", () => {
  it("strips hash, query and a trailing slash", () => {
    expect(normalizeSectionPath("/products?x=1#y")).toBe("/products");
    expect(normalizeSectionPath("/products/")).toBe("/products");
    expect(normalizeSectionPath("/")).toBe("/");
    expect(normalizeSectionPath("")).toBe("");
  });
});

describe("sectionDepth + flowDirection", () => {
  it("treats Home as the top level and other sections one level in", () => {
    expect(sectionDepth("/")).toBe(0);
    expect(sectionDepth("/products")).toBe(1);
    expect(sectionDepth("/about")).toBe(1);
  });

  it("derives forward / back / neutral from depth", () => {
    expect(flowDirection("/", "/products")).toBe("forward"); // deeper
    expect(flowDirection("/products", "/")).toBe("back"); // shallower
    expect(flowDirection("/products", "/about")).toBe("neutral"); // same level
  });
});

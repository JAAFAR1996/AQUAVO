import { describe, expect, it } from "vitest";
import { isKnownSitePath } from "../../shared/site-routes";

describe("isKnownSitePath", () => {
  it.each([
    "/",
    "/products",
    "/products/yee-filter-123",
    "/deals",
    "/tank-builder",
    "/verify-certificate/yee",
    "/order-confirmation/order-123",
    "/invoice/public-token",
  ])("recognizes routed page %s", (pathname) => {
    expect(isKnownSitePath(pathname)).toBe(true);
  });

  it.each([
    "/does-not-exist",
    "/products/one/more",
    "/verify-certificate",
    "/unknown/deep/path",
  ])("does not overmatch unknown path %s", (pathname) => {
    expect(isKnownSitePath(pathname)).toBe(false);
  });

  it("accepts only explicitly supplied standalone guide paths", () => {
    expect(isKnownSitePath("/guides/aquarium-filter-guide", ["/guides/aquarium-filter-guide"])).toBe(true);
    expect(isKnownSitePath("/guides/invented-guide", ["/guides/aquarium-filter-guide"])).toBe(false);
  });
});

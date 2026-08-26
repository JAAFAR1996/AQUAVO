import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEmbeddedProduct, resetEmbeddedProductCache } from "../embedded-product";

/**
 * Reading the server-embedded product payload.
 *
 * This is an optimisation sitting in front of a network fetch, so the rules it
 * has to obey are mostly about failing safely: wrong product, malformed block
 * or no block at all must all degrade to "fetch normally", never to a wrong
 * price under the wrong name and never to a thrown error on the PDP.
 */

const PRODUCT = {
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي للأحواض",
  price: "6985",
  stock: 12,
};

function installBlock(content: string): void {
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = "__AQUAVO_PRODUCT__";
  script.textContent = content;
  document.body.appendChild(script);
}

function installPayload(overrides: Record<string, unknown> = {}): void {
  installBlock(
    JSON.stringify({ slug: PRODUCT.slug, renderedAt: 1_700_000_000_000, product: PRODUCT, ...overrides }),
  );
}

beforeEach(() => {
  resetEmbeddedProductCache();
  document.getElementById("__AQUAVO_PRODUCT__")?.remove();
});

afterEach(() => {
  document.getElementById("__AQUAVO_PRODUCT__")?.remove();
  resetEmbeddedProductCache();
});

describe("reading a valid payload", () => {
  it("returns the product for the slug it was rendered for", () => {
    installPayload();
    const result = getEmbeddedProduct("houyi-thermostat");
    expect(result?.product.name).toBe(PRODUCT.name);
    expect(result?.product.price).toBe("6985");
  });

  it("returns the server render time for TanStack to age the data from", () => {
    installPayload();
    expect(getEmbeddedProduct("houyi-thermostat")?.renderedAt).toBe(1_700_000_000_000);
  });

  it("treats a missing or nonsense timestamp as infinitely old, forcing a refetch", () => {
    installPayload({ renderedAt: undefined });
    expect(getEmbeddedProduct("houyi-thermostat")?.renderedAt).toBe(0);

    resetEmbeddedProductCache();
    document.getElementById("__AQUAVO_PRODUCT__")?.remove();
    installPayload({ renderedAt: "yesterday" });
    expect(getEmbeddedProduct("houyi-thermostat")?.renderedAt).toBe(0);
  });
});

describe("it refuses to show the wrong product", () => {
  it("ignores the payload when the requested slug is a different product", () => {
    installPayload();
    // This is the client-side-navigation case: the document was rendered for
    // one product, the user is now looking at another.
    expect(getEmbeddedProduct("some-other-product")).toBeNull();
  });

  it("returns null when no slug is known yet", () => {
    installPayload();
    expect(getEmbeddedProduct(undefined)).toBeNull();
    expect(getEmbeddedProduct("")).toBeNull();
  });
});

describe("it fails safe rather than breaking the page", () => {
  it("returns null when there is no payload block at all", () => {
    expect(getEmbeddedProduct("houyi-thermostat")).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", () => {
    installBlock("{ this is not json");
    expect(() => getEmbeddedProduct("houyi-thermostat")).not.toThrow();
    expect(getEmbeddedProduct("houyi-thermostat")).toBeNull();
  });

  it("returns null for an empty block", () => {
    installBlock("");
    expect(getEmbeddedProduct("houyi-thermostat")).toBeNull();
  });

  it("rejects a payload whose product is not usable as a product", () => {
    for (const bad of [
      { slug: PRODUCT.slug, renderedAt: 1, product: null },
      { slug: PRODUCT.slug, renderedAt: 1, product: {} },
      { slug: PRODUCT.slug, renderedAt: 1, product: { id: "x" } },
      { slug: PRODUCT.slug, renderedAt: 1, product: "a string" },
      { renderedAt: 1, product: PRODUCT },
    ]) {
      resetEmbeddedProductCache();
      document.getElementById("__AQUAVO_PRODUCT__")?.remove();
      installBlock(JSON.stringify(bad));
      expect(getEmbeddedProduct("houyi-thermostat")).toBeNull();
    }
  });
});

describe("it is read once", () => {
  it("does not pick up a block swapped in after the first read", () => {
    installPayload();
    expect(getEmbeddedProduct("houyi-thermostat")?.product.name).toBe(PRODUCT.name);

    // Simulate a client-side navigation replacing the block: the cached read
    // must win, so a stale document block cannot resurface later.
    document.getElementById("__AQUAVO_PRODUCT__")?.remove();
    installBlock(
      JSON.stringify({
        slug: "another-product",
        renderedAt: 2,
        product: { ...PRODUCT, slug: "another-product", name: "منتج آخر" },
      }),
    );
    expect(getEmbeddedProduct("another-product")).toBeNull();
  });

  it("is safe to call repeatedly", () => {
    installPayload();
    const first = getEmbeddedProduct("houyi-thermostat");
    const second = getEmbeddedProduct("houyi-thermostat");
    expect(second).toBe(first);
  });
});

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MetaTags } from "../meta-tags";

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], meta[name="robots"]').forEach((node) => node.remove());
});

describe("MetaTags canonical URLs", () => {
  it("removes search parameters and fragments from the default canonical", async () => {
    window.history.replaceState({}, "", "/products?category=filters#results");
    render(<MetaTags title="المتجر" />);

    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://www.aquavoiq.com/products");
      expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute("content", "https://www.aquavoiq.com/products");
    });
  });

  it("keeps a 404 noindex, follow without canonical or social metadata after hydration", async () => {
    document.head.insertAdjacentHTML("beforeend", '<link rel="canonical" href="https://www.aquavoiq.com/unknown"><meta property="og:url" content="https://www.aquavoiq.com/unknown"><meta name="twitter:title" content="Unknown">');
    render(<MetaTags title="الصفحة غير موجودة | AQUAVO" noIndex notFound />);

    await waitFor(() => {
      expect(document.title).toBe("الصفحة غير موجودة | AQUAVO");
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.querySelector('meta[property^="og:"]')).toBeNull();
      expect(document.querySelector('meta[name^="twitter:"]')).toBeNull();
    });
  });
});

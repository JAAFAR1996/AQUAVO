import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MetaTags } from "../meta-tags";

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach((node) => node.remove());
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
});

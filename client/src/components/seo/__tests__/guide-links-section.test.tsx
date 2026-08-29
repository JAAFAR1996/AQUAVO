import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GuideLinksSection } from "../guide-links-section";
import { guidesForCategory } from "@shared/guide-links";

afterEach(cleanup);

// The crawler-visible markup and the page a person sees are rendered by
// different code. If only one of them carried the guide links, the site would
// be showing Googlebot links its readers never get — or the reverse. Both read
// the same map; these tests hold the reader half of that up.

describe("GuideLinksSection", () => {
  it("renders a real anchor with an href for every guide in the category", () => {
    render(<GuideLinksSection category="الفلترة والتنقية" />);
    const expected = guidesForCategory("الفلترة والتنقية");
    expect(expected.length).toBeGreaterThan(0);
    for (const link of expected) {
      const anchor = screen.getByRole("link", { name: link.label });
      expect(anchor).toHaveAttribute("href", link.href);
    }
  });

  it("shows the guide own heading as the link text", () => {
    render(<GuideLinksSection category="الصيانة والتنظيف" />);
    for (const link of guidesForCategory("الصيانة والتنظيف")) {
      expect(screen.getByText(link.label)).toBeInTheDocument();
    }
  });

  it("resolves an English alias to the same links as the canonical value", () => {
    const { container } = render(<GuideLinksSection category="heaters" />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(guidesForCategory("التحكم بالحرارة").map((l) => l.href));
  });

  it("renders nothing for an unknown or missing category", () => {
    const { container: unknown } = render(<GuideLinksSection category="لا شيء" />);
    expect(unknown.querySelectorAll("a")).toHaveLength(0);
    const { container: missing } = render(<GuideLinksSection category={null} />);
    expect(missing.querySelectorAll("a")).toHaveLength(0);
  });
});

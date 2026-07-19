/**
 * The Guides publishing boundary is cross-document (SPA <-> server-rendered
 * /guides). Both surfaces must opt into cross-document View Transitions with the
 * same shared header name so navigating in/out of Guides gets a smooth branded
 * morph where supported, and both must disable it under reduced motion. This
 * guards that wiring without needing a live browser.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { renderGuidesIndexHtml } from "../../../api/_guides-content";

const here = dirname(fileURLToPath(import.meta.url));
const appCss = readFileSync(resolve(here, "../index.css"), "utf8");
const guidesHtml = renderGuidesIndexHtml("https://aquavoiq.com", "https://aquavoiq.com/brand/aquavo-v2-icon.svg");

describe("Flow Gate — Guides cross-document boundary", () => {
  it("the SPA opts into cross-document view transitions with the shared header name", () => {
    expect(appCss).toContain("@view-transition");
    expect(appCss).toContain("navigation: auto");
    expect(appCss).toContain("view-transition-name: aqv-site-header");
  });

  it("the Guides publishing shell opts in with the same shared header name", () => {
    expect(guidesHtml).toContain("@view-transition{navigation:auto}");
    expect(guidesHtml).toContain("view-transition-name:aqv-site-header");
  });

  it("both surfaces disable the transition under reduced motion", () => {
    // SPA: inside a reduced-motion media block.
    const reduced = appCss.slice(appCss.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain("navigation: none");
    // Guides shell.
    expect(guidesHtml).toContain("@media (prefers-reduced-motion: reduce){@view-transition{navigation:none}}");
  });
});

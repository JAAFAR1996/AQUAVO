import { describe, expect, it } from "vitest";
import { renderLocalFallbackHtml } from "../static";

const TEMPLATE = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <title>__META_TITLE__</title>
    <meta name="description" content="__META_DESCRIPTION__" />
    <meta name="keywords" content="__META_KEYWORDS__" />
    <link rel="canonical" href="__META_URL__" />
    <meta property="og:image" content="__META_IMAGE__" />
    <meta property="og:type" content="__META_OG_TYPE__" />
    <link rel="stylesheet" href="/assets/app.css" />
    __JSON_LD__
  </head>
  <body><div id="root" dir="rtl"></div></body>
</html>`;

describe("renderLocalFallbackHtml", () => {
  it("keeps the React root as the only visible body content and loads app CSS normally", () => {
    const html = renderLocalFallbackHtml(TEMPLATE, "/");

    expect(html).toContain('<div id="root" dir="rtl"></div>');
    expect(html).not.toContain("critical-home-shell");
    expect(html).not.toContain("data-app-css");
    expect(html).not.toContain("media=\"print\"");
    expect(html.match(/<h1\b/g) ?? []).toHaveLength(0);
  });

  it("does not append crawlable duplicate content after the React root on inner pages", () => {
    const html = renderLocalFallbackHtml(TEMPLATE, "/products");
    const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? "";

    expect(body.trim()).toBe('<div id="root" dir="rtl"></div>');
  });
});

import { describe, expect, it } from "vitest";
import { injectBlogArticleShell } from "../../api/blog-ssr";

const shell = '<!doctype html><html lang="ar"><body><div id="root"></div></body></html>';

describe("published blog initial HTML", () => {
  it("includes the real article heading, summary and readable body before JavaScript", () => {
    const html = injectBlogArticleShell(shell, {
      title: "اختيار تربة الحوض",
      excerpt: "دليل التربة",
      content: "<h2>ليش التربة مهمة؟</h2><p>اختار التربة على أساس نباتاتك.</p>",
    });
    expect(html).toContain("<h1>اختيار تربة الحوض</h1>");
    expect(html).toContain("<p>دليل التربة</p>");
    expect(html).toContain("ليش التربة مهمة؟");
    expect(html).toContain("اختار التربة على أساس نباتاتك.");
  });

  it("treats database content as untrusted and never inserts HTML scripts", () => {
    const html = injectBlogArticleShell(shell, {
      title: '<img src=x onerror="alert(1)">',
      content: "<script>alert('owned')</script><p>آمن &amp; واضح</p>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("owned");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("آمن &amp; واضح");
  });

  it("leaves a nonempty React container unchanged", () => {
    const html = '<div id="root"><p>Already rendered</p></div>';
    expect(injectBlogArticleShell(html, { title: "test", content: "text" })).toBe(html);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * vercel.json routes a crawler to the prerendered semantic view by matching its
 * user agent. Anything not in that list falls through to api/ssr-meta and gets
 * the SPA shell.
 *
 * Measured on production, comparing the <main> landmark for Googlebot against
 * Storebot-Google across the 50 user-agent-gated URLs: 38 of them served
 * Googlebot full content and Storebot-Google zero substantive words. /deals
 * (2,721 words), /fish-encyclopedia (1,917), /products (1,255), /blog (2,135),
 * every static page and the 15 ported guides were all invisible.
 *
 * These are documented Google crawlers with documented jobs:
 *   Storebot-Google        every surface of Google Shopping
 *   Google-InspectionTool  Rich Results Test and URL inspection in Search Console
 *   GoogleOther            generic crawler used across Google product teams
 *   AdsBot-Google          ad landing page quality
 *   Googlebot-Video        video features
 *
 * Googlebot-Image and Googlebot-News already matched, because the pattern
 * contains the Googlebot substring. These do not.
 *
 * https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
 */

const VERCEL = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
  rewrites: Array<{
    source: string;
    destination: string;
    has?: Array<{ type: string; key: string; value: string }>;
  }>;
};

function crawlerPattern(): string {
  for (const rule of VERCEL.rewrites) {
    for (const has of rule.has ?? []) {
      if (has.type === "header" && has.key === "user-agent") return has.value;
    }
  }
  throw new Error("no user-agent gated rewrite found in vercel.json");
}

/** The exact tokens Google publishes, as they appear in a real user agent. */
const GOOGLE_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Googlebot-News",
  "Googlebot-Video",
  "Storebot-Google",
  "Google-InspectionTool",
  "GoogleOther",
  "Google-Extended",
  "AdsBot-Google",
];

/** Real user agent strings, matched the way Vercel matches them. */
const SAMPLE_AGENTS: Record<string, string> = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Googlebot-Image": "Googlebot-Image/1.0",
  "Googlebot-News": "Googlebot-News",
  "Googlebot-Video": "Googlebot-Video/1.0",
  "Storebot-Google":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Safari/537.36 (compatible; Storebot-Google/1.0; +http://www.google.com/bot.html)",
  "Google-InspectionTool":
    "Mozilla/5.0 (compatible; Google-InspectionTool/1.0; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)",
  GoogleOther: "Mozilla/5.0 (compatible; GoogleOther)",
  "Google-Extended": "Mozilla/5.0 (compatible; Google-Extended/1.0)",
  "AdsBot-Google": "AdsBot-Google (+http://www.google.com/adsbot.html)",
};

describe("crawler allowlist covers Google's documented crawlers", () => {
  it("names every Google crawler that should get the prerendered view", () => {
    const pattern = crawlerPattern();
    const regex = new RegExp(pattern);
    for (const crawler of GOOGLE_CRAWLERS) {
      const agent = SAMPLE_AGENTS[crawler];
      expect(agent, `no sample agent for ${crawler}`).toBeTruthy();
      expect(regex.test(agent), `${crawler} is not matched by the allowlist`).toBe(true);
    }
  });

  it("keeps the AI and social crawlers it already carried", () => {
    const regex = new RegExp(crawlerPattern());
    for (const agent of [
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
      "facebookexternalhit/1.1",
    ]) {
      expect(regex.test(agent), `${agent.slice(0, 40)} should still match`).toBe(true);
    }
  });

  it("does not divert an ordinary browser", () => {
    const regex = new RegExp(crawlerPattern());
    for (const agent of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ]) {
      expect(regex.test(agent), `${agent.slice(0, 40)} must keep the SPA`).toBe(false);
    }
  });
});

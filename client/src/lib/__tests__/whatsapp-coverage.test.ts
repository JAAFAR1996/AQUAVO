/**
 * COVERAGE ENFORCEMENT for the WhatsApp handoff.
 *
 * WhatsApp carries roughly 55% of AQUAVO's orders and `WhatsAppClick` had fired three times in its
 * whole history. The cause was not event loss — it was that `phTrackWhatsAppClick` had one call site
 * against about ten customer-facing WhatsApp doors. Wiring those ten fixes today; it does not fix the
 * eleventh, which somebody will add next month.
 *
 * So this test scans the real client source. Any customer-facing file that opens WhatsApp must do it
 * through `WhatsAppLink` or `openWhatsApp`, both of which record the handoff themselves. A raw
 * `<a href={WHATSAPP_URL}>` or a bare `window.open('https://wa.me/...')` fails the build.
 *
 * It is a source scan rather than a runtime assertion on purpose: the failure mode is a door that is
 * never opened in any test, and you cannot observe an event that nothing fires.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const CLIENT_SRC = join(process.cwd(), "client", "src");

/** Admin surfaces are internal tooling, not customer acquisition paths, so they are out of scope. */
const OUT_OF_SCOPE = [
  `components${sep}admin${sep}`,
  `pages${sep}admin`,
  `__tests__`,
  `${sep}lib${sep}whatsapp.ts`,            // the helper itself
  `${sep}components${sep}whatsapp-link.tsx`, // the component itself
  `${sep}lib${sep}constants${sep}shipping.ts`, // where the URL constant is defined
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?|jsx?)$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** A file "opens WhatsApp" if it references the URL constant or a wa.me link. */
const OPENS_WHATSAPP = /WHATSAPP_URL|wa\.me/;
/** …and it is instrumented if it goes through one of the two sanctioned entry points. */
const USES_HELPER = /WhatsAppLink|openWhatsApp|trackWhatsAppHandoff/;

/** The raw shapes that silently bypass measurement. */
const RAW_ANCHOR = /<a\s[^>]*href=\{?[`"']?\s*(?:\$\{)?WHATSAPP_URL/;
const RAW_WINDOW_OPEN = /window\.open\(\s*[`"']?\s*(?:https:\/\/wa\.me|\$\{WHATSAPP_URL\}|WHATSAPP_URL)/;

describe("WhatsApp handoff coverage", () => {
  const files = walk(CLIENT_SRC)
    .filter((f) => !OUT_OF_SCOPE.some((skip) => f.includes(skip)))
    .map((f) => ({ path: relative(process.cwd(), f), text: readFileSync(f, "utf8") }));

  const whatsappFiles = files.filter((f) => OPENS_WHATSAPP.test(f.text));

  it("finds the customer-facing WhatsApp surfaces at all — a scan that matches nothing proves nothing", () => {
    expect(whatsappFiles.length).toBeGreaterThanOrEqual(8);
  });

  it("every customer-facing WhatsApp surface goes through the shared helper", () => {
    const unwired = whatsappFiles.filter((f) => !USES_HELPER.test(f.text)).map((f) => f.path);
    expect(
      unwired,
      `these open WhatsApp without recording it — import WhatsAppLink or openWhatsApp from @/lib/whatsapp:\n  ${unwired.join("\n  ")}`,
    ).toEqual([]);
  });

  it("no raw <a href={WHATSAPP_URL}> anchor survives", () => {
    const raw = whatsappFiles.filter((f) => RAW_ANCHOR.test(f.text)).map((f) => f.path);
    expect(raw, `raw WhatsApp anchors bypass tracking:\n  ${raw.join("\n  ")}`).toEqual([]);
  });

  it("no raw window.open to WhatsApp survives", () => {
    const raw = whatsappFiles.filter((f) => RAW_WINDOW_OPEN.test(f.text)).map((f) => f.path);
    expect(raw, `raw window.open calls bypass tracking:\n  ${raw.join("\n  ")}`).toEqual([]);
  });

  it("the surfaces the audit named are all present and wired", () => {
    // Named explicitly so that DELETING a surface is also visible, not just adding one.
    const expected = [
      "product-details", "footer", "contact", "links", "checkout",
      "order-confirmation", "checkout-success-fallback", "beginner-guide",
      "ai-chat-bot", "profile-referral", "invoice-dialog",
    ];
    const covered = expected.filter((name) =>
      whatsappFiles.some((f) => f.path.includes(name) && USES_HELPER.test(f.text)));
    expect(
      expected.filter((e) => !covered.includes(e)),
      "surfaces from the audit that are no longer wired",
    ).toEqual([]);
  });

  it("the scan can actually fail — a bypassing file is detected", () => {
    // Guards against a regex that quietly matches nothing, which is how the original gap survived.
    const bypass = { path: "synthetic.tsx", text: '<a href={WHATSAPP_URL} target="_blank">chat</a>' };
    expect(OPENS_WHATSAPP.test(bypass.text)).toBe(true);
    expect(USES_HELPER.test(bypass.text)).toBe(false);
    expect(RAW_ANCHOR.test(bypass.text)).toBe(true);
    const openBypass = 'window.open(`${WHATSAPP_URL}?text=hi`, "_blank")';
    expect(RAW_WINDOW_OPEN.test(openBypass)).toBe(true);
  });
});

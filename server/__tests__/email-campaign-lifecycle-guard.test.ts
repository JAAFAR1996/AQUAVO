import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const email = read("server/utils/email.ts");
const jobs = read("server/cron/scheduled-jobs.ts");

describe("email campaign lifecycle guard", () => {
  it("requires explicit opt-in plus a production-ready Resend sender", () => {
    expect(email).toContain("EMAIL_CAMPAIGNS_ENABLED");
    expect(email).toContain("RESEND_API_KEY_NOT_CONFIGURED");
    expect(email).toContain("SMTP_FROM_NOT_PRODUCTION_READY");
    expect(email).toContain("onboarding@resend.dev");
  });

  it("skips scheduled fanout before campaign generation", () => {
    const cron = jobs.indexOf('cron.schedule("0 10 * * 1"');
    const gate = jobs.indexOf("const readiness = getEmailCampaignReadiness()", cron);
    const run = jobs.indexOf("const result = await runWeeklyEmailCampaign()", cron);
    expect(cron).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(cron);
    expect(run).toBeGreaterThan(gate);
    expect(jobs).toContain('status: "skipped", reason: readiness.reason');
  });

  it("guards manual and direct campaign execution too", () => {
    expect(jobs).toContain("Email campaigns unavailable:");
    expect(jobs).toContain("[EmailCampaign] Skipped before campaign creation:");
    expect(jobs).toContain('campaignId: "skipped"');
  });
});

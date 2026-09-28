import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/vercel-prebuilt-production.yml"),
  "utf8",
);

describe("Vercel prebuilt production fallback", () => {
  it("never runs on an ordinary main push", () => {
    expect(workflow).toContain("[prebuilt-vercel-prod]");
    expect(workflow).toContain("workflow_dispatch");
  });

  it("requires a secret token and uses prebuilt production deployment", () => {
    expect(workflow).toContain("secrets.VERCEL_TOKEN");
    expect(workflow).toContain("deploy --prebuilt --prod");
    expect(workflow).toContain("vercel@${VERCEL_CLI_VERSION} build --prod");
  });

  it("smoke-checks the public readiness contract after deploy", () => {
    expect(workflow).toContain("https://www.aquavoiq.com/ready");
    expect(workflow).toContain("orderCreationReady !== true");
  });
});
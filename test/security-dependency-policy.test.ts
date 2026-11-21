// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  pnpm: { overrides: Record<string, string> };
};
const workflow = readFileSync(".github/workflows/security-remediation.yml", "utf8");
const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
const importer = lockfile.split("\npackages:\n")[0];
const unquote = (value: string) => value.replace(/^['"]|['"]$/g, "");
const lockedVersions = new Map([...importer.matchAll(/^ {6}(.+):\r?\n {8}specifier: .+\r?\n {8}version: (.+)$/gm)]
  .map((entry) => [unquote(entry[1]), unquote(entry[2]).split("(")[0]]));

function workflowOverrides(assignment: string): Record<string, string> {
  const start = workflow.indexOf(assignment);
  expect(start).toBeGreaterThan(-1);
  const open = workflow.indexOf("{", start);
  const end = workflow.indexOf("\n          };", open);
  expect(end).toBeGreaterThan(open);
  return JSON.parse(workflow.slice(open, end) + "\n}");
}

describe("reviewed security remediation inputs", () => {
  it("keeps both workflow override lists equal to the reviewed application policy", () => {
    expect(workflowOverrides("pkg.pnpm.overrides =")).toEqual(manifest.pnpm.overrides);
    expect(workflowOverrides("const expected =")).toEqual(manifest.pnpm.overrides);
  });

  it("keeps the verified lockfile stable when the remediation workflow reapplies its floors", () => {
    const floors = [...workflow.matchAll(/^ {10}((?:@[^/\s]+\/)?[^@\s]+)@(\d+\.\d+\.\d+)[ \t]*$/gm)];
    expect(floors).toHaveLength(30);
    for (const [, name, version] of floors) {
      const declared = manifest.dependencies[name] ?? manifest.devDependencies[name];
      expect(declared, name).toBeDefined();
      expect(declared.replace(/^[~^]/, ""), name).toBe(version);
      expect(lockedVersions.get(name), name).toBe(version);
    }
  });

  it("preserves the Playwright version matched to the CI browser image", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const imageVersion = ci.match(/mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/);
    expect(imageVersion).not.toBeNull();
    expect(lockedVersions.get("@playwright/test")).toBe(imageVersion?.[1]);
  });

  it("keeps pull-request verification from rewriting or pushing the reviewed dependency files", () => {
    const steps = workflow.split(/^      - name: /m).slice(1);
    const mutationSteps = steps.filter(step => /pnpm (?:update|add -D|remove)|writeFileSync\(|pnpm install --no-frozen-lockfile|git push/.test(step));
    expect(mutationSteps).toHaveLength(6);
    for (const step of mutationSteps) {
      expect(step).toContain("if: github.event_name == 'workflow_dispatch' && inputs.apply_remediation");
    }
    expect(workflow).toMatch(/apply_remediation:[\s\S]*?default: false/);
    const branchGuard = steps.find(step => step.startsWith("Require a review branch"));
    expect(branchGuard).toContain('"$TARGET_REF_TYPE" != "branch"');
    expect(branchGuard).toContain('"$TARGET_BRANCH" = "main"');
    expect(branchGuard).toContain('"$TARGET_BRANCH" = "develop"');
    expect(workflow).toContain("git diff --exit-code -- package.json pnpm-lock.yaml pnpm-workspace.yaml");
    const commit = steps.find(step => step.startsWith("Commit verified dependency repair"));
    for (const gate of ["types", "tests", "build", "audit", "audit_all"]) {
      expect(commit).toContain(`steps.${gate}.outputs.exit_code == '0'`);
    }
  });
});

// Only Vercel production waits. Preview and GitHub CI must not wait on themselves.
import { setTimeout as sleep } from "node:timers/promises";
if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Production requires an identified Git revision");
  const url = `https://api.github.com/repos/JAAFAR1996/AQUAVO/actions/runs?head_sha=${sha}&event=push&per_page=100`;
  let approved = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Cannot verify production CI (${response.status}); keeping prior deployment`);
    const result = await response.json();
    const runs = (result.workflow_runs ?? []).filter((run) => run.head_sha === sha && run.event === "push"
      && run.head_branch === "main" && run.path === ".github/workflows/ci.yml").sort((a, b) => b.id - a.id);
    const latest = runs[0];
    if (latest?.status === "completed") {
      if (latest.conclusion !== "success") throw new Error("This exact production revision did not pass CI");
      approved = true;
      console.log(`Production gate approved verified revision ${sha.slice(0, 12)}`);
      break;
    }
    await sleep(30_000);
  }
  if (!approved) throw new Error("Timed out waiting for this production revision's CI; keeping prior deployment");
}

/**
 * MiroFish Client — AQUAVO Bridge
 * ================================
 * Orchestrates the full MiroFish pipeline:
 * Graph → Simulation → Agents → Report
 *
 * MiroFish runs as a sidecar Docker service.
 * Groq is used as the LLM backend (OpenAI-compatible).
 */

const MIROFISH_URL = process.env.MIROFISH_URL || "http://localhost:5001";
const MIROFISH_TIMEOUT = 120_000; // 2 minutes per request

// ─── Low-level HTTP helpers ───────────────────────────────────

async function mfGet(path: string): Promise<any> {
  const res = await fetch(`${MIROFISH_URL}${path}`, {
    signal: AbortSignal.timeout(MIROFISH_TIMEOUT),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MiroFish GET ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function mfPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${MIROFISH_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MIROFISH_TIMEOUT),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`MiroFish POST ${path} → ${res.status}: ${errBody}`);
  }
  return res.json();
}

async function mfPostForm(path: string, form: FormData): Promise<any> {
  const res = await fetch(`${MIROFISH_URL}${path}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(MIROFISH_TIMEOUT),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`MiroFish FORM ${path} → ${res.status}: ${errBody}`);
  }
  return res.json();
}

// ─── Health check ─────────────────────────────────────────────

export async function isMiroFishAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${MIROFISH_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Polling helper ───────────────────────────────────────────

async function pollTask(
  path: string,
  intervalMs = 2000,
  timeoutMs = 90_000
): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await mfGet(path);
    const status = result.status || result.task_status || "";
    if (status === "COMPLETED" || status === "completed" || status === "ready") {
      return result;
    }
    if (status === "FAILED" || status === "failed" || status === "error") {
      throw new Error(`MiroFish task failed: ${JSON.stringify(result)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`MiroFish task timed out after ${timeoutMs}ms`);
}

// ─── Step 1: Upload seed documents ───────────────────────────

export async function uploadSeedAndBuildGraph(
  seedMarkdown: string,
  simulationRequirement: string,
  projectName: string
): Promise<{ projectId: string; graphId: string }> {
  // a) Generate ontology from seed text
  const form = new FormData();
  const blob = new Blob([seedMarkdown], { type: "text/markdown" });
  form.append("files", blob, "seed.md");
  form.append("simulation_requirement", simulationRequirement);
  form.append("project_name", projectName);

  const ontologyRes = await mfPostForm("/api/graph/ontology/generate", form);
  const projectId: string = ontologyRes.project_id;

  // b) Build the knowledge graph
  const buildRes = await mfPost("/api/graph/build", { project_id: projectId });
  const taskId: string = buildRes.task_id;

  // c) Poll until graph is ready
  await pollTask(`/api/graph/task/${taskId}`, 3000, 120_000);

  // d) Get graph id from project
  const project = await mfGet(`/api/graph/project/${projectId}`);
  const graphId: string = project.graph_id || project.graphs?.[0]?.graph_id;
  if (!graphId) throw new Error("No graph_id returned from MiroFish");

  return { projectId, graphId };
}

// ─── Step 2: Create + prepare + run simulation ────────────────

export async function runSimulation(
  projectId: string,
  graphId: string,
  entityTypes: string[],
  maxRounds = 20,
  platform: "parallel" | "twitter" | "reddit" = "parallel"
): Promise<{ simulationId: string }> {
  // Create simulation
  const simRes = await mfPost("/api/simulation/create", {
    project_id: projectId,
    graph_id: graphId,
    enable_twitter: true,
    enable_reddit: true,
  });
  const simulationId: string = simRes.simulation_id;

  // Prepare agents
  const prepRes = await mfPost("/api/simulation/prepare", {
    simulation_id: simulationId,
    entity_types: entityTypes,
    use_llm_for_profiles: true,
    parallel_profile_count: 5,
  });
  const prepTaskId: string = prepRes.task_id;

  // Poll preparation
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await mfPost("/api/simulation/prepare/status", {
      task_id: prepTaskId,
    });
    if (status.status === "ready" || status.progress === 100) break;
    if (status.status === "failed") throw new Error("Preparation failed");
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Start simulation
  await mfPost("/api/simulation/start", {
    simulation_id: simulationId,
    platform,
    max_rounds: maxRounds,
    enable_graph_memory_update: false,
  });

  // Poll simulation completion
  const runDeadline = Date.now() + 180_000;
  while (Date.now() < runDeadline) {
    const runStatus = await mfGet(`/api/simulation/${simulationId}/run-status`);
    if (runStatus.progress_percent >= 100 || runStatus.runner_status === "stopped") break;
    await new Promise((r) => setTimeout(r, 4000));
  }

  return { simulationId };
}

// ─── Step 3: Interview all agents ────────────────────────────

export async function interviewAllAgents(
  simulationId: string,
  prompt: string,
  platform: "twitter" | "reddit" = "twitter"
): Promise<Array<{ agentId: number; response: string }>> {
  const result = await mfPost("/api/simulation/interview/all", {
    simulation_id: simulationId,
    prompt,
    platform,
    timeout: 180,
  });

  const interviews = result.interviews || result.results || [];
  return interviews.map((item: any) => ({
    agentId: item.agent_id ?? item.agentId,
    response: item.response || item.content || "",
  }));
}

// ─── Step 4: Generate report ──────────────────────────────────

export async function generateReport(simulationId: string): Promise<{ reportId: string; content: string }> {
  const genRes = await mfPost("/api/report/generate", { simulation_id: simulationId });
  const reportId: string = genRes.report_id;
  const taskId: string = genRes.task_id;

  // Poll report generation
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const statusRes = await mfPost("/api/report/generate/status", { task_id: taskId });
    if (statusRes.status === "COMPLETED" || statusRes.progress === 100) break;
    if (statusRes.status === "FAILED") throw new Error("Report generation failed");
    await new Promise((r) => setTimeout(r, 3000));
  }

  const report = await mfGet(`/api/report/${reportId}`);
  return {
    reportId,
    content: report.content || report.markdown || "",
  };
}

// ─── Chat with Report Agent ───────────────────────────────────

export async function chatWithReport(
  simulationId: string,
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const result = await mfPost("/api/report/chat", {
    simulation_id: simulationId,
    message,
    history,
  });
  return result.response || result.content || "";
}

// ─── Get simulation timeline ──────────────────────────────────

export async function getTimeline(simulationId: string): Promise<any[]> {
  const result = await mfGet(`/api/simulation/${simulationId}/timeline`);
  return result.timeline || result.rounds || [];
}

// ─── Get agent statistics ─────────────────────────────────────

export async function getAgentStats(simulationId: string): Promise<any> {
  return mfGet(`/api/simulation/${simulationId}/agent-stats`);
}

// ─── Full pipeline helper ─────────────────────────────────────

export interface MiroFishPipelineResult {
  simulationId: string;
  reportId: string;
  reportContent: string;
  interviewResponses: Array<{ agentId: number; response: string }>;
  timeline: any[];
  agentStats: any;
}

export async function runFullPipeline(opts: {
  seedMarkdown: string;
  simulationRequirement: string;
  projectName: string;
  entityTypes: string[];
  interviewPrompt: string;
  maxRounds?: number;
}): Promise<MiroFishPipelineResult> {
  const { projectId, graphId } = await uploadSeedAndBuildGraph(
    opts.seedMarkdown,
    opts.simulationRequirement,
    opts.projectName
  );

  const { simulationId } = await runSimulation(
    projectId,
    graphId,
    opts.entityTypes,
    opts.maxRounds ?? 20
  );

  const [interviewResponses, reportResult, timeline, agentStats] = await Promise.allSettled([
    interviewAllAgents(simulationId, opts.interviewPrompt),
    generateReport(simulationId),
    getTimeline(simulationId),
    getAgentStats(simulationId),
  ]);

  return {
    simulationId,
    reportId:
      reportResult.status === "fulfilled" ? reportResult.value.reportId : "",
    reportContent:
      reportResult.status === "fulfilled" ? reportResult.value.content : "",
    interviewResponses:
      interviewResponses.status === "fulfilled" ? interviewResponses.value : [],
    timeline:
      timeline.status === "fulfilled" ? timeline.value : [],
    agentStats:
      agentStats.status === "fulfilled" ? agentStats.value : {},
  };
}

/**
 * Azure DevOps REST helpers. Server-only.
 */

export type Rag = "GREEN" | "AMBER" | "RED";

export interface ProjectHealth {
  id: string;
  name: string;
  processTemplate: string;
  calcRag: Rag;
  schedulePct: number;
  staleTasks: number;
  overdueTasks: number;
  criticalBugs: number;
  showstopperBugs: number;
  openBugs: number;
  openRisks: number;
  riskHigh: number;
  riskMedium: number;
  productBugs: number;
  phase: string;
  lastActivity: string | null;
}

export interface DashboardData {
  organization: string;
  refreshedAt: string;
  projects: ProjectHealth[];
}

interface WorkItem {
  id: number;
  fields: Record<string, unknown>;
}

const API = "api-version=7.1";

function authHeader(pat: string) {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

function orgBase(raw: string) {
  return raw.replace(/\/+$/, "");
}

async function adoFetch<T>(url: string, pat: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(pat),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure DevOps request failed [${res.status}] ${url}: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

async function runWiql(org: string, project: string, pat: string, query: string) {
  const data = await adoFetch<{ workItems?: { id: number }[] }>(
    `${org}/${encodeURIComponent(project)}/_apis/wit/wiql?${API}`,
    pat,
    { method: "POST", body: JSON.stringify({ query }) },
  );
  return (data.workItems ?? []).map((w) => w.id);
}

async function getWorkItems(org: string, ids: number[], pat: string): Promise<WorkItem[]> {
  const out: WorkItem[] = [];
  const fields = [
    "System.Id",
    "System.WorkItemType",
    "System.State",
    "System.ChangedDate",
    "System.Tags",
    "Microsoft.VSTS.Common.Severity",
    "Microsoft.VSTS.Common.Priority",
    "Microsoft.VSTS.Scheduling.DueDate",
    "Microsoft.VSTS.Scheduling.TargetDate",
  ];
  for (let i = 0; i < ids.length; i += 190) {
    const chunk = ids.slice(i, i + 190);
    const data = await adoFetch<{ value: WorkItem[] }>(`${org}/_apis/wit/workitemsbatch?${API}`, pat, {
      method: "POST",
      body: JSON.stringify({ ids: chunk, fields }),
    });
    out.push(...data.value);
  }
  return out;
}

const str = (w: WorkItem, k: string) => (typeof w.fields[k] === "string" ? (w.fields[k] as string) : "");
const daysSince = (iso: string) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0;

function severityOf(w: WorkItem) {
  return str(w, "Microsoft.VSTS.Common.Severity").toLowerCase();
}

function computeRag(p: Omit<ProjectHealth, "calcRag">): Rag {
  if (p.criticalBugs > 0 || p.showstopperBugs > 0 || p.riskHigh >= 3 || p.overdueTasks > 30) return "RED";
  if (p.overdueTasks > 0 || p.staleTasks > 5 || p.riskHigh > 0 || p.openBugs > 5) return "AMBER";
  return "GREEN";
}

async function projectHealth(
  org: string,
  project: { id: string; name: string },
  pat: string,
): Promise<ProjectHealth> {
  const ids = await runWiql(
    org,
    project.name,
    pat,
    `SELECT [System.Id] FROM WorkItems
     WHERE [System.TeamProject] = '${project.name.replace(/'/g, "''")}'
       AND [System.State] NOT IN ('Closed','Done','Removed','Resolved')`,
  );

  const items = ids.length ? await getWorkItems(org, ids, pat) : [];

  const tasks = items.filter((w) =>
    ["Task", "User Story", "Product Backlog Item", "Requirement"].includes(str(w, "System.WorkItemType")),
  );
  const bugs = items.filter((w) => str(w, "System.WorkItemType") === "Bug");
  const risks = items.filter((w) => ["Risk", "Issue", "Impediment"].includes(str(w, "System.WorkItemType")));

  const dueOf = (w: WorkItem) =>
    str(w, "Microsoft.VSTS.Scheduling.DueDate") || str(w, "Microsoft.VSTS.Scheduling.TargetDate");

  const staleTasks = tasks.filter((w) => daysSince(str(w, "System.ChangedDate")) >= 14).length;
  const overdueTasks = tasks.filter((w) => {
    const d = dueOf(w);
    return !!d && new Date(d).getTime() < Date.now();
  }).length;

  const criticalBugs = bugs.filter((w) => severityOf(w).includes("1 -")).length;
  const showstopperBugs = bugs.filter((w) => str(w, "System.Tags").toLowerCase().includes("showstopper")).length;
  const productBugs = bugs.filter((w) => str(w, "System.Tags").toLowerCase().includes("product")).length;
  const riskHigh = risks.filter((w) => ["1", "2"].includes(str(w, "Microsoft.VSTS.Common.Priority"))).length;
  const riskMedium = risks.length - riskHigh;

  const lastChanged = items
    .map((w) => str(w, "System.ChangedDate"))
    .filter(Boolean)
    .sort()
    .pop();

  const totalTasks = Math.max(tasks.length, 1);
  const schedulePct = Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) - 95;

  const phase = overdueTasks > 0 || staleTasks > 0 ? "Development" : bugs.length > 0 ? "SIT" : "UAT";

  const base = {
    id: project.id,
    name: project.name,
    processTemplate: "Azure Boards",
    schedulePct,
    staleTasks,
    overdueTasks,
    criticalBugs,
    showstopperBugs,
    openBugs: bugs.length,
    openRisks: risks.length,
    riskHigh,
    riskMedium,
    productBugs,
    phase,
    lastActivity: lastChanged ?? null,
  };

  return { ...base, calcRag: computeRag(base) };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const orgUrl = process.env["AZURE_DEVOPS_ORG_URL"];
  const pat = process.env["AZURE_DEVOPS_PAT"];
  if (!orgUrl || !pat) {
    throw new Error(
      "Azure DevOps is not configured yet. Add AZURE_DEVOPS_ORG_URL and AZURE_DEVOPS_PAT to connect.",
    );
  }
  const org = orgBase(orgUrl);

  const projectList = await adoFetch<{ value: { id: string; name: string }[] }>(
    `${org}/_apis/projects?${API}&$top=200`,
    pat,
  );

  const queue = [...projectList.value];
  const projects: ProjectHealth[] = [];
  const worker = async () => {
    for (;;) {
      const p = queue.shift();
      if (!p) return;
      try {
        projects.push(await projectHealth(org, p, pat));
      } catch (err) {
        console.error(`project health failed for ${p.name}:`, err);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));


  projects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    organization: org.split("/").filter(Boolean).pop() ?? "Azure DevOps",
    refreshedAt: new Date().toISOString(),
    projects,
  };
}

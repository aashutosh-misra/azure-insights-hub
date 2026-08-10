import { DEFECT_SLA_DAYS } from "./seed";
import type { Defect, QaModule, QaState, TestCase } from "./types";

export const PALETTE = {
  green: "#1C6B45",
  amber: "#966107",
  red: "#A13327",
  blue: "#2C5C99",
  purple: "#5B4A8A",
  teal: "#166B6E",
};

export const STATUS_TONE: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "teal" | "muted"> = {
  "Requirement Gathering": "purple",
  "Development in Progress": "amber",
  "Released to SA": "teal",
  "Testing in Progress": "blue",
  "Released to UAT": "green",
  "Customer Signoff": "purple",
  "Go-Live": "green",
  Pass: "green",
  Fail: "red",
  Hold: "amber",
  Skipped: "purple",
  "Not Executed": "muted",
  "In Progress": "blue",
  Open: "red",
  Retest: "amber",
  Closed: "green",
  Deferred: "muted",
  Critical: "red",
  High: "amber",
  Medium: "blue",
  Low: "green",
  Active: "green",
  Draft: "muted",
  Approved: "green",
  Rejected: "red",
  "Pending Approval": "amber",
  "Not Submitted": "muted",
  Assigned: "blue",
  Completed: "green",
  Blocked: "red",
};

export function moduleById(state: QaState, id: string): QaModule | undefined {
  return state.modules.find((m) => m.id === id);
}

export function projectOfModule(state: QaState, id: string): string {
  return moduleById(state, id)?.proj ?? "";
}

/** Modules within the active project scope */
export function scopedModules(state: QaState): QaModule[] {
  return state.currentProject === "All"
    ? state.modules
    : state.modules.filter((m) => m.proj === state.currentProject);
}

export function scopedTestCases(state: QaState): TestCase[] {
  const ids = new Set(scopedModules(state).map((m) => m.id));
  return state.testCases.filter((tc) => ids.has(tc.moduleId));
}

export function scopedDefects(state: QaState): Defect[] {
  const ids = new Set(scopedModules(state).map((m) => m.id));
  return state.defects.filter((d) => ids.has(d.moduleId));
}

export interface ExecStats {
  total: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  notExecuted: number;
  execPct: number;
  passPct: number;
}

export function execStats(cases: TestCase[]): ExecStats {
  const total = cases.length;
  const passed = cases.filter((c) => c.status === "Pass").length;
  const failed = cases.filter((c) => c.status === "Fail").length;
  const blocked = cases.filter((c) => c.status === "Hold").length;
  const notExecuted = cases.filter((c) => c.status === "Not Executed").length;
  const executed = total - notExecuted;
  return {
    total,
    executed,
    passed,
    failed,
    blocked,
    notExecuted,
    execPct: total ? Math.round((executed / total) * 100) : 0,
    passPct: executed ? Math.round((passed / executed) * 100) : 0,
  };
}

export function daysSince(iso: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function slaBreached(d: Defect) {
  if (d.status === "Closed" || d.status === "Deferred") return false;
  return daysSince(d.createdAt) > (DEFECT_SLA_DAYS[d.severity] ?? 20);
}

export function slaAgeing(d: Defect) {
  const limit = DEFECT_SLA_DAYS[d.severity] ?? 20;
  return { age: daysSince(d.createdAt), limit, breached: slaBreached(d) };
}

export type Rag = "GREEN" | "AMBER" | "RED";

export interface ProjectRag {
  project: string;
  modules: number;
  execPct: number;
  passPct: number;
  openDefects: number;
  criticalDefects: number;
  slaBreaches: number;
  coveragePct: number;
  rag: Rag;
  score: number;
}

export function projectRag(state: QaState, project: string): ProjectRag {
  const mods = state.modules.filter((m) => m.proj === project);
  const modIds = new Set(mods.map((m) => m.id));
  const cases = state.testCases.filter((c) => modIds.has(c.moduleId));
  const defects = state.defects.filter((d) => modIds.has(d.moduleId));
  const open = defects.filter((d) => d.status !== "Closed" && d.status !== "Deferred");
  const critical = open.filter((d) => d.severity === "Critical").length;
  const breaches = open.filter(slaBreached).length;
  const st = execStats(cases);
  const totalReqs = mods.reduce((n, m) => n + m.totalReqs, 0);
  const doneReqs = mods.reduce((n, m) => n + m.reqs, 0);
  const coveragePct = totalReqs ? Math.round((doneReqs / totalReqs) * 100) : 0;

  let score = 100;
  score -= critical * 15;
  score -= breaches * 8;
  score -= Math.max(0, 90 - st.passPct) * 0.4;
  score -= Math.max(0, 80 - st.execPct) * 0.3;
  score -= Math.max(0, 85 - coveragePct) * 0.2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const rag: Rag = critical > 0 || score < 55 ? "RED" : score < 78 ? "AMBER" : "GREEN";

  return {
    project,
    modules: mods.length,
    execPct: st.execPct,
    passPct: st.passPct,
    openDefects: open.length,
    criticalDefects: critical,
    slaBreaches: breaches,
    coveragePct,
    rag,
    score,
  };
}

export interface GoNoGo {
  score: number;
  verdict: "GO" | "CONDITIONAL GO" | "NO-GO";
  criteria: { label: string; value: string; weight: number; earned: number; pass: boolean }[];
}

export function goNoGo(state: QaState, project: string): GoNoGo {
  const mods = project === "All" ? state.modules : state.modules.filter((m) => m.proj === project);
  const modIds = new Set(mods.map((m) => m.id));
  const cases = state.testCases.filter((c) => modIds.has(c.moduleId));
  const defects = state.defects.filter((d) => modIds.has(d.moduleId));
  const open = defects.filter((d) => d.status !== "Closed" && d.status !== "Deferred");
  const st = execStats(cases);
  const totalReqs = mods.reduce((n, m) => n + m.totalReqs, 0);
  const doneReqs = mods.reduce((n, m) => n + m.reqs, 0);
  const coveragePct = totalReqs ? Math.round((doneReqs / totalReqs) * 100) : 0;
  const critical = open.filter((d) => d.severity === "Critical").length;
  const breaches = open.filter(slaBreached).length;

  const criteria = [
    { label: "Execution completeness", value: `${st.execPct}% executed`, weight: 25, pass: st.execPct >= 90, earned: Math.round((Math.min(st.execPct, 100) / 100) * 25) },
    { label: "Pass rate", value: `${st.passPct}% passed`, weight: 25, pass: st.passPct >= 95, earned: Math.round((Math.min(st.passPct, 100) / 100) * 25) },
    { label: "No critical defects", value: `${critical} critical open`, weight: 20, pass: critical === 0, earned: critical === 0 ? 20 : Math.max(0, 20 - critical * 10) },
    { label: "Requirement coverage", value: `${coveragePct}% covered`, weight: 20, pass: coveragePct >= 90, earned: Math.round((Math.min(coveragePct, 100) / 100) * 20) },
    { label: "SLA compliance", value: `${breaches} breaches`, weight: 10, pass: breaches === 0, earned: breaches === 0 ? 10 : Math.max(0, 10 - breaches * 3) },
  ];

  const score = criteria.reduce((n, c) => n + c.earned, 0);
  const verdict: GoNoGo["verdict"] = critical > 0 || score < 60 ? "NO-GO" : score < 85 ? "CONDITIONAL GO" : "GO";
  return { score, verdict, criteria };
}

export interface Recommendation {
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  detail: string;
  area: string;
}

export function recommendations(state: QaState): Recommendation[] {
  const out: Recommendation[] = [];
  const mods = scopedModules(state);
  const cases = scopedTestCases(state);
  const defects = scopedDefects(state).filter((d) => d.status !== "Closed" && d.status !== "Deferred");

  defects
    .filter((d) => d.severity === "Critical")
    .forEach((d) =>
      out.push({
        severity: "Critical",
        title: `Resolve ${d.defectId}: ${d.title}`,
        detail: `Critical defect open for ${daysSince(d.createdAt)} days on ${moduleById(state, d.moduleId)?.name ?? "unknown module"}. Blocks release sign-off.`,
        area: "Defects",
      }),
    );

  defects.filter(slaBreached).forEach((d) =>
    out.push({
      severity: "High",
      title: `SLA breached on ${d.defectId}`,
      detail: `${d.severity} defect ageing ${daysSince(d.createdAt)}d against a ${DEFECT_SLA_DAYS[d.severity]}d SLA. Escalate to ${d.assignee}.`,
      area: "SLA",
    }),
  );

  mods.forEach((m) => {
    const cov = m.totalReqs ? Math.round((m.reqs / m.totalReqs) * 100) : 0;
    if (cov < 80)
      out.push({
        severity: cov < 50 ? "High" : "Medium",
        title: `Improve requirement coverage for ${m.name}`,
        detail: `Only ${m.reqs}/${m.totalReqs} requirements covered (${cov}%). Add test cases before UAT entry.`,
        area: "Coverage",
      });
    const mc = cases.filter((c) => c.moduleId === m.id);
    if (mc.length === 0)
      out.push({
        severity: "Medium",
        title: `No test cases authored for ${m.name}`,
        detail: `${m.name} is at "${m.status}" with zero test cases. Author a baseline suite.`,
        area: "Test design",
      });
    const st = execStats(mc);
    if (mc.length > 0 && st.execPct < 60)
      out.push({
        severity: "Medium",
        title: `Execution lagging on ${m.name}`,
        detail: `${st.execPct}% executed (${st.executed}/${st.total}). Reassign capacity to close the gap.`,
        area: "Execution",
      });
  });

  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function fmtDate(iso: string) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
}

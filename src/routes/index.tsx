import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, Empty, inputCls, Kpi, PageHeader, Progress, Table, Td } from "@/components/qa/ui";
import {
  daysSince,
  execStats,
  fmtDate,
  goNoGo,
  moduleById,
  projectRag,
  recommendations,
  scopedDefects,
  scopedModules,
  scopedTestCases,
  slaBreached,
  STATUS_TONE,
} from "@/lib/qa/compute";
import { useQa } from "@/lib/qa/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QA Delivery Intelligence Dashboard" },
      {
        name: "description",
        content:
          "Live QA delivery command centre: execution progress, pass rate, open defects, SLA breaches, module health and Go/No-Go readiness.",
      },
      { property: "og:title", content: "QA Delivery Intelligence Dashboard" },
      {
        property: "og:description",
        content: "Execution progress, defect SLA, module health and release readiness in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const verdictTone = { GO: "green", "CONDITIONAL GO": "amber", "NO-GO": "red" } as const;

function DashboardPage() {
  const { state } = useQa();
  const project = state.currentProject;

  const [moduleFilter, setModuleFilter] = useState("All");

  const allModules = useMemo(() => scopedModules(state), [state]);
  const modules = useMemo(
    () => (moduleFilter === "All" ? allModules : allModules.filter((m) => m.id === moduleFilter)),
    [allModules, moduleFilter],
  );
  const moduleIds = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);
  const cases = useMemo(
    () => scopedTestCases(state).filter((c) => moduleFilter === "All" || moduleIds.has(c.moduleId)),
    [state, moduleFilter, moduleIds],
  );
  const defects = useMemo(
    () => scopedDefects(state).filter((d) => moduleFilter === "All" || moduleIds.has(d.moduleId)),
    [state, moduleFilter, moduleIds],
  );
  const st = useMemo(() => execStats(cases), [cases]);
  const gate = useMemo(() => goNoGo(state, project), [state, project]);
  const recs = useMemo(() => recommendations(state), [state]);

  const openDefects = defects.filter((d) => d.status !== "Closed" && d.status !== "Deferred");
  const critical = openDefects.filter((d) => d.severity === "Critical").length;
  const breaches = openDefects.filter(slaBreached).length;
  const openTasks = state.tasks.filter((t) => t.status !== "Completed");
  const overdueTasks = openTasks.filter((t) => t.due && new Date(t.due).getTime() < Date.now()).length;

  const totalReqs = modules.reduce((n, m) => n + m.totalReqs, 0);
  const doneReqs = modules.reduce((n, m) => n + m.reqs, 0);
  const coveragePct = totalReqs ? Math.round((doneReqs / totalReqs) * 100) : 0;

  const trend = state.history.map((h) => ({
    date: fmtDate(h.date),
    executed: h.executed,
    passed: h.passed,
    failed: h.failed,
  }));

  const statusMix = [
    { name: "Pass", value: st.passed, color: "var(--rag-green)" },
    { name: "Fail", value: st.failed, color: "var(--rag-red)" },
    { name: "Hold", value: st.blocked, color: "var(--rag-amber)" },
    { name: "Not executed", value: st.notExecuted, color: "var(--rag-blue)" },
  ].filter((d) => d.value > 0);

  const byModule = modules
    .map((m) => {
      const mc = cases.filter((c) => c.moduleId === m.id);
      const s = execStats(mc);
      return {
        name: m.name.length > 16 ? `${m.name.slice(0, 15)}…` : m.name,
        executed: s.executed,
        pending: s.notExecuted,
      };
    })
    .slice(0, 10);

  const projectCards = (project === "All" ? state.projects.map((p) => p.name) : [project]).map((p) =>
    projectRag(state, p),
  );

  const attention = openDefects
    .filter((d) => d.severity === "Critical" || d.severity === "High" || slaBreached(d))
    .sort((a, b) => daysSince(b.createdAt) - daysSince(a.createdAt))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHeader
        title="QA Delivery Dashboard"
        subtitle={`${project === "All" ? "All projects" : project} · ${modules.length} modules · ${cases.length} test cases`}
        actions={
          <select
            className={`${inputCls} max-w-[240px]`}
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            aria-label="Module filter"
          >
            <option value="All">All modules</option>
            {allModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.proj} › {m.name}
              </option>
            ))}
          </select>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Execution progress" value={`${st.execPct}%`} sub={`${st.executed} of ${st.total} executed`} tone="blue" />
        <Kpi label="Pass rate" value={`${st.passPct}%`} sub={`${st.passed} passed · ${st.failed} failed`} tone={st.passPct >= 90 ? "green" : st.passPct >= 75 ? "amber" : "red"} />
        <Kpi label="Open defects" value={openDefects.length} sub={`${critical} critical · ${breaches} SLA breached`} tone={critical ? "red" : openDefects.length ? "amber" : "green"} />
        <Kpi label="Requirement coverage" value={`${coveragePct}%`} sub={`${doneReqs} of ${totalReqs} requirements`} tone={coveragePct >= 85 ? "green" : "amber"} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card title="Execution trend" className="lg:col-span-2">
          <div className="h-60">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="executed" stroke="var(--rag-blue)" fill="var(--rag-blue-bg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="passed" stroke="var(--rag-green)" fill="var(--rag-green-bg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" stroke="var(--rag-red)" fill="var(--rag-red-bg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="No execution history yet." />
            )}
          </div>
        </Card>

        <Card title="Release readiness">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-black text-foreground">{gate.score}</div>
            <Badge tone={verdictTone[gate.verdict]}>{gate.verdict}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {gate.criteria.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-semibold text-foreground">{c.value}</span>
                </div>
                <Progress pct={Math.round((c.earned / c.weight) * 100)} tone={c.pass ? "green" : "amber"} />
              </div>
            ))}
          </div>
          <Link to="/gonogo" className="mt-3 inline-block text-[11.5px] font-semibold text-brand hover:underline">
            Open Go/No-Go gate →
          </Link>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card title="Status mix">
          <div className="h-52">
            {statusMix.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                    {statusMix.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="No test cases in scope." />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusMix.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: d.color }} />
                {d.name} · {d.value}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Execution by module" className="lg:col-span-2">
          <div className="h-52">
            {byModule.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byModule} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} height={44} textAnchor="end" stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="executed" stackId="a" fill="var(--rag-green)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="var(--rag-blue)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="No modules in scope." />
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card title="Project health">
          <Table head={["Project", "RAG", "Score", "Exec", "Pass", "Open", "SLA"]}>
            {projectCards.map((p) => (
              <tr key={p.project} className="border-b border-border last:border-0">
                <Td className="font-semibold">{p.project}</Td>
                <Td>
                  <Badge tone={p.rag === "GREEN" ? "green" : p.rag === "AMBER" ? "amber" : "red"}>{p.rag}</Badge>
                </Td>
                <Td>{p.score}</Td>
                <Td>{p.execPct}%</Td>
                <Td>{p.passPct}%</Td>
                <Td>{p.openDefects}</Td>
                <Td>{p.slaBreaches}</Td>
              </tr>
            ))}
            {!projectCards.length && (
              <tr>
                <td colSpan={7}>
                  <Empty text="No projects configured." />
                </td>
              </tr>
            )}
          </Table>
        </Card>

        <Card title="Needs attention">
          <Table head={["Defect", "Severity", "Module", "Age", "SLA"]}>
            {attention.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <Td>
                  <span className="font-semibold">{d.defectId}</span>
                  <span className="block text-[11px] text-muted-foreground">{d.title}</span>
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[d.severity] ?? "muted"}>{d.severity}</Badge>
                </Td>
                <Td>{moduleById(state, d.moduleId)?.name ?? "—"}</Td>
                <Td>{daysSince(d.createdAt)}d</Td>
                <Td>
                  <Badge tone={slaBreached(d) ? "red" : "green"}>{slaBreached(d) ? "Breached" : "Within"}</Badge>
                </Td>
              </tr>
            ))}
            {!attention.length && (
              <tr>
                <td colSpan={5}>
                  <Empty text="No high-priority defects. Nice." />
                </td>
              </tr>
            )}
          </Table>
          <Link to="/defects" className="mt-2 inline-block text-[11.5px] font-semibold text-brand hover:underline">
            View all defects →
          </Link>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card title="Top recommendations" className="lg:col-span-2">
          <ul className="space-y-2">
            {recs.slice(0, 5).map((r) => (
              <li key={r.title} className="flex gap-2 rounded-md border border-border px-3 py-2">
                <Badge tone={STATUS_TONE[r.severity] ?? "muted"}>{r.severity}</Badge>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">{r.title}</p>
                  <p className="text-[11.5px] text-muted-foreground">{r.detail}</p>
                </div>
              </li>
            ))}
            {!recs.length && <Empty text="Nothing flagged right now." />}
          </ul>
          <Link to="/recommendations" className="mt-2 inline-block text-[11.5px] font-semibold text-brand hover:underline">
            All recommendations →
          </Link>
        </Card>

        <Card title="Workload">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Open tasks" value={openTasks.length} tone="blue" />
            <Kpi label="Overdue" value={overdueTasks} tone={overdueTasks ? "red" : "green"} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {openTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="truncate text-foreground">{t.title}</span>
                <span className="shrink-0 text-muted-foreground">{t.due ? fmtDate(t.due) : "—"}</span>
              </li>
            ))}
            {!openTasks.length && <Empty text="No open tasks." />}
          </ul>
          <Link to="/tasks" className="mt-2 inline-block text-[11.5px] font-semibold text-brand hover:underline">
            Manage tasks →
          </Link>
        </Card>
      </section>
    </div>
  );
}

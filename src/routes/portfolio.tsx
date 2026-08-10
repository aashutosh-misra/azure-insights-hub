import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQa } from "@/lib/qa/store";
import { PALETTE, execStats, projectRag, scopedModules, slaBreached } from "@/lib/qa/compute";
import { Badge, Card, Kpi, PageHeader, Table, Td, Tabs, Progress, Empty } from "@/components/qa/ui";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio RAG | QA Delivery Intelligence" },
      { name: "description", content: "Portfolio-wide RAG health, project scorecards and risk & ticket matrix." },
      { property: "og:title", content: "Portfolio RAG" },
      { property: "og:description", content: "Portfolio-wide RAG health, project scorecards and risk & ticket matrix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

const RAG_COLOR: Record<string, string> = { GREEN: PALETTE.green, AMBER: PALETTE.amber, RED: PALETTE.red };

function riskLevel(criticalOpen: number, highOpen: number, coveragePct: number): "High" | "Medium" | "Low" {
  if (criticalOpen > 0 || coveragePct < 50) return "High";
  if (highOpen > 0 || coveragePct < 80) return "Medium";
  return "Low";
}

function PortfolioPage() {
  const { state } = useQa();
  const [tab, setTab] = useState("health");

  const projects = useMemo(
    () => (state.currentProject === "All" ? state.projects.map((p) => p.name) : [state.currentProject]),
    [state.currentProject, state.projects],
  );

  const rags = useMemo(() => projects.map((p) => projectRag(state, p)), [projects, state]);

  const ragCounts = useMemo(() => {
    const c: Record<string, number> = { GREEN: 0, AMBER: 0, RED: 0 };
    rags.forEach((r) => {
      c[r.rag] = (c[r.rag] ?? 0) + 1;
    });
    return c;
  }, [rags]);

  const modules = scopedModules(state);

  return (
    <div>
      <PageHeader
        title="Portfolio RAG"
        subtitle="Portfolio-wide health scorecards, RAG distribution and risk & ticket matrix across projects."
      />

      <Tabs
        tabs={[
          { id: "health", label: "Project Health Summary" },
          { id: "matrix", label: "Risk & Ticket Matrix" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "health" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Projects" value={rags.length} tone="blue" />
            <Kpi label="Green" value={ragCounts['GREEN']} tone="green" />
            <Kpi label="Amber" value={ragCounts['AMBER']} tone="amber" />
            <Kpi label="Red" value={ragCounts['RED']} tone="red" />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card title="Health Score by Project" className="lg:col-span-2">
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rags} margin={{ left: -20 }}>
                    <XAxis dataKey="project" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                      {rags.map((r, i) => (
                        <Cell key={i} fill={RAG_COLOR[r.rag]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="RAG Distribution">
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(ragCounts).map(([k, v]) => ({ name: k, value: v }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {Object.keys(ragCounts).map((k) => (
                        <Cell key={k} fill={RAG_COLOR[k]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Project Health Summary">
            {rags.length === 0 ? (
              <Empty text="No projects in scope." />
            ) : (
              <Table
                head={["Project", "RAG", "Health", "Exec %", "Pass %", "Open Def.", "Critical", "SLA Breach", "Coverage %", "Modules"]}
              >
                {rags.map((r) => (
                  <tr key={r.project} className="hover:bg-accent/40">
                    <Td className="font-semibold">{r.project}</Td>
                    <Td><Badge tone={r.rag === "GREEN" ? "green" : r.rag === "AMBER" ? "amber" : "red"} dot>{r.rag}</Badge></Td>
                    <Td className="font-bold">{r.score}</Td>
                    <Td>{r.execPct}%</Td>
                    <Td>{r.passPct}%</Td>
                    <Td>{r.openDefects}</Td>
                    <Td className={r.criticalDefects > 0 ? "font-bold text-rag-red" : ""}>{r.criticalDefects}</Td>
                    <Td className={r.slaBreaches > 0 ? "font-bold text-rag-amber" : ""}>{r.slaBreaches}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-16"><Progress pct={r.coveragePct} tone={r.coveragePct >= 80 ? "green" : r.coveragePct >= 50 ? "amber" : "red"} /></div>
                        <span>{r.coveragePct}%</span>
                      </div>
                    </Td>
                    <Td>{r.modules}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === "matrix" && (
        <div className="space-y-3">
          <Card title="Risk Heatmap (Severity × Coverage Risk)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {modules.map((m) => {
                const cases = state.testCases.filter((c) => c.moduleId === m.id);
                const st = execStats(cases);
                const openDefects = state.defects.filter((d) => d.moduleId === m.id && d.status !== "Closed" && d.status !== "Deferred");
                const critical = openDefects.filter((d) => d.severity === "Critical").length;
                const high = openDefects.filter((d) => d.severity === "High").length;
                const coveragePct = m.totalReqs ? Math.round((m.reqs / m.totalReqs) * 100) : 0;
                const level = riskLevel(critical, high, coveragePct);
                const tone = level === "High" ? "red" : level === "Medium" ? "amber" : "green";
                const bg = level === "High" ? "bg-rag-red-bg text-rag-red" : level === "Medium" ? "bg-rag-amber-bg text-rag-amber" : "bg-rag-green-bg text-rag-green";
                return (
                  <div key={m.id} title={`${m.name} · ${level} · ${st.execPct}% executed`} className={`flex flex-col items-center justify-center rounded-md border border-border p-3 ${bg}`}>
                    <span className="text-[11px] font-bold">{m.name}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase">{level}</span>
                    <span className="text-[10px]">{st.execPct}% exec</span>
                  </div>
                );
              })}
              {modules.length === 0 && <Empty text="No modules in scope." />}
            </div>
          </Card>

          <Card title="Module Risk & Ticket Matrix">
            {modules.length === 0 ? (
              <Empty text="No modules in scope." />
            ) : (
              <Table head={["Module", "Project", "Status", "Open Bugs", "Coverage %", "Exec %", "Risk"]}>
                {modules.map((m) => {
                  const cases = state.testCases.filter((c) => c.moduleId === m.id);
                  const st = execStats(cases);
                  const openDefects = state.defects.filter((d) => d.moduleId === m.id && d.status !== "Closed" && d.status !== "Deferred");
                  const critical = openDefects.filter((d) => d.severity === "Critical").length;
                  const high = openDefects.filter((d) => d.severity === "High").length;
                  const coveragePct = m.totalReqs ? Math.round((m.reqs / m.totalReqs) * 100) : 0;
                  const level = riskLevel(critical, high, coveragePct);
                  const tone = level === "High" ? "red" : level === "Medium" ? "amber" : "green";
                  return (
                    <tr key={m.id} className="hover:bg-accent/40">
                      <Td className="font-semibold">{m.name}</Td>
                      <Td><Badge tone="muted">{m.proj}</Badge></Td>
                      <Td><Badge>{m.status}</Badge></Td>
                      <Td className={openDefects.length > 0 ? "font-bold text-rag-red" : ""}>{openDefects.length}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-16"><Progress pct={coveragePct} tone={coveragePct >= 80 ? "green" : coveragePct >= 50 ? "amber" : "red"} /></div>
                          <span>{coveragePct}%</span>
                        </div>
                      </Td>
                      <Td>{st.execPct}%</Td>
                      <Td><Badge tone={tone}>{level}</Badge></Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

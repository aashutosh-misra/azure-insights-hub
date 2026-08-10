import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQa } from "@/lib/qa/store";
import { DEFECT_SLA_DAYS, SEVERITIES } from "@/lib/qa/seed";
import { daysSince, execStats, fmtDate, moduleById, scopedDefects, scopedModules, scopedTestCases, slaAgeing } from "@/lib/qa/compute";
import type { Severity } from "@/lib/qa/types";
import { Badge, Card, Empty, Kpi, PageHeader, Table, Td } from "@/components/qa/ui";

export const Route = createFileRoute("/risks")({
  head: () => ({
    meta: [
      { title: "Risk & SLA Overview | QA Delivery Intelligence" },
      {
        name: "description",
        content: "SLA compliance by severity, ageing buckets, at-risk items and module-level risk scoring.",
      },
      { property: "og:title", content: "Risk & SLA Overview" },
      { property: "og:description", content: "Monitor SLA compliance, ageing defects and module risk exposure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RisksPage,
});

const BUCKETS = [
  { label: "0-2d", min: 0, max: 2 },
  { label: "3-5d", min: 3, max: 5 },
  { label: "6-10d", min: 6, max: 10 },
  { label: "11+d", min: 11, max: Infinity },
];

function RisksPage() {
  const { state } = useQa();
  const modules = scopedModules(state);
  const defects = scopedDefects(state);
  const openDefects = defects.filter((d) => d.status !== "Closed" && d.status !== "Deferred");

  const slaBySeverity = SEVERITIES.map((sev) => {
    const items = openDefects.filter((d) => d.severity === sev);
    const breached = items.filter((d) => slaAgeing(d).breached).length;
    const within = items.length - breached;
    const compliance = items.length ? Math.round((within / items.length) * 100) : 100;
    return { severity: sev, target: DEFECT_SLA_DAYS[sev], count: items.length, within, breached, compliance };
  });

  const ageingData = useMemo(
    () =>
      BUCKETS.map((b) => ({
        name: b.label,
        count: openDefects.filter((d) => {
          const age = daysSince(d.createdAt);
          return age >= b.min && age <= b.max;
        }).length,
      })),
    [openDefects],
  );

  const atRisk = openDefects
    .filter((d) => {
      const a = slaAgeing(d);
      return a.breached || a.age / a.limit > 0.75;
    })
    .sort((a, b) => slaAgeing(b).age / slaAgeing(b).limit - slaAgeing(a).age / slaAgeing(a).limit);

  const moduleRisk = modules
    .map((m) => {
      const mDefects = openDefects.filter((d) => d.moduleId === m.id);
      const critHigh = mDefects.filter((d) => d.severity === "Critical" || d.severity === "High").length;
      const cases = scopedTestCases(state).filter((c) => c.moduleId === m.id);
      const st = execStats(cases);
      const coverageGap = m.totalReqs ? 100 - Math.round((m.reqs / m.totalReqs) * 100) : 0;
      const execLag = Math.max(0, 80 - st.execPct);
      const score = critHigh * 15 + coverageGap * 0.4 + execLag * 0.3;
      const rag: "GREEN" | "AMBER" | "RED" = score >= 40 ? "RED" : score >= 18 ? "AMBER" : "GREEN";
      return { module: m, critHigh, coverageGap, execLag, score: Math.round(score), rag };
    })
    .sort((a, b) => b.score - a.score);

  const totalBreached = openDefects.filter((d) => slaAgeing(d).breached).length;
  const overallCompliance = openDefects.length
    ? Math.round(((openDefects.length - totalBreached) / openDefects.length) * 100)
    : 100;

  return (
    <div>
      <PageHeader title="Risk & SLA Overview" subtitle="SLA compliance, ageing exposure and module-level risk scoring" />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Overall SLA Compliance" value={`${overallCompliance}%`} tone={overallCompliance >= 90 ? "green" : overallCompliance >= 70 ? "amber" : "red"} />
        <Kpi label="Open Defects" value={openDefects.length} tone="blue" />
        <Kpi label="SLA Breaches" value={totalBreached} tone="red" />
        <Kpi label="At-Risk Items" value={atRisk.length} tone="amber" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="SLA Compliance by Severity">
          <Table head={["Severity", "Target", "Open", "Within", "Breached", "Compliance"]} minWidth={500}>
            {slaBySeverity.map((r) => (
              <tr key={r.severity}>
                <Td><Badge>{r.severity}</Badge></Td>
                <Td>{r.target}d</Td>
                <Td>{r.count}</Td>
                <Td>{r.within}</Td>
                <Td>{r.breached}</Td>
                <Td>
                  <Badge tone={r.compliance >= 90 ? "green" : r.compliance >= 70 ? "amber" : "red"}>{r.compliance}%</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Ageing Buckets (Open Defects)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--rag-amber)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="At-Risk Items (Breached or >75% of SLA window)" className="mb-3">
        <Table head={["Defect", "Severity", "Module", "Age", "SLA Limit", "Status", "Escalation Owner"]} minWidth={900}>
          {atRisk.map((d) => {
            const a = slaAgeing(d);
            return (
              <tr key={d.id}>
                <Td className="font-semibold text-foreground">{d.defectId} — {d.title}</Td>
                <Td><Badge>{d.severity}</Badge></Td>
                <Td>{moduleById(state, d.moduleId)?.name ?? "—"}</Td>
                <Td>{a.age}d</Td>
                <Td>{a.limit}d</Td>
                <Td>{a.breached ? <Badge tone="red">Breached</Badge> : <Badge tone="amber">Near Breach</Badge>}</Td>
                <Td>{d.assignee || "Unassigned"}</Td>
              </tr>
            );
          })}
        </Table>
        {!atRisk.length && <Empty text="No at-risk items right now." />}
      </Card>

      <Card title="Module Risk Score">
        <Table head={["Module", "Project", "Critical/High Open", "Coverage Gap", "Execution Lag", "Score", "RAG"]} minWidth={900}>
          {moduleRisk.map((r) => (
            <tr key={r.module.id}>
              <Td className="font-semibold text-foreground">{r.module.name}</Td>
              <Td>{r.module.proj}</Td>
              <Td>{r.critHigh}</Td>
              <Td>{r.coverageGap}%</Td>
              <Td>{r.execLag}%</Td>
              <Td>{r.score}</Td>
              <Td>
                <Badge tone={r.rag === "RED" ? "red" : r.rag === "AMBER" ? "amber" : "green"}>{r.rag}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
        {!moduleRisk.length && <Empty text="No modules in scope." />}
      </Card>
    </div>
  );
}

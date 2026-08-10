import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQa } from "@/lib/qa/store";
import { daysSince, goNoGo, moduleById, scopedDefects, slaAgeing } from "@/lib/qa/compute";
import { Badge, Btn, Card, Empty, Field, inputCls, Kpi, Modal, PageHeader, Table, Td } from "@/components/qa/ui";

export const Route = createFileRoute("/gonogo")({
  head: () => ({
    meta: [
      { title: "Go/No-Go Gate | QA Delivery Intelligence" },
      {
        name: "description",
        content: "Release readiness verdict with weighted criteria, blockers and sign-off history.",
      },
      { property: "og:title", content: "Go/No-Go Gate" },
      { property: "og:description", content: "Weighted release-readiness scoring, blockers and sign-off tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoNoGoPage,
});

const VERDICT_TONE: Record<string, "green" | "amber" | "red"> = {
  GO: "green",
  "CONDITIONAL GO": "amber",
  "NO-GO": "red",
};

function GoNoGoPage() {
  const { state, log, currentUser } = useQa();
  const result = useMemo(() => goNoGo(state, state.currentProject), [state]);

  const defects = scopedDefects(state);
  const openCritical = defects.filter(
    (d) => d.severity === "Critical" && d.status !== "Closed" && d.status !== "Deferred",
  );
  const slaBreaches = defects.filter(
    (d) => d.status !== "Closed" && d.status !== "Deferred" && slaAgeing(d).breached,
  );

  const [decision, setDecision] = useState<"GO" | "CONDITIONAL GO" | "NO-GO">(result.verdict);
  const [comments, setComments] = useState("");
  const [showModal, setShowModal] = useState(false);

  const signoffs = state.activity.filter((a) => a.action.startsWith("Sign-off:")).slice(0, 10);

  function recordSignoff() {
    log(`Sign-off: ${decision} for ${state.currentProject}${comments ? ` — ${comments}` : ""}`);
    setComments("");
    setShowModal(false);
  }

  const tone = VERDICT_TONE[result.verdict];

  return (
    <div>
      <PageHeader title="Go/No-Go Gate" subtitle={`Release readiness for ${state.currentProject}`} actions={<Btn variant="primary" onClick={() => setShowModal(true)}>Record Sign-off</Btn>} />

      <div
        className={`mb-3 rounded-md border-l-4 p-5 ${
          tone === "green"
            ? "border-l-rag-green bg-rag-green-bg"
            : tone === "amber"
            ? "border-l-rag-amber bg-rag-amber-bg"
            : "border-l-rag-red bg-rag-red-bg"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Verdict</p>
        <p className={`mt-1 text-3xl font-black ${tone === "green" ? "text-rag-green" : tone === "amber" ? "text-rag-amber" : "text-rag-red"}`}>
          {result.verdict}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Overall readiness score: <span className="font-bold text-foreground">{result.score}/100</span></p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Score" value={`${result.score}/100`} tone={tone} />
        <Kpi label="Open Critical Defects" value={openCritical.length} tone="red" />
        <Kpi label="SLA Breaches" value={slaBreaches.length} tone="amber" />
        <Kpi label="Criteria Passing" value={`${result.criteria.filter((c) => c.pass).length}/${result.criteria.length}`} tone="blue" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Gate Criteria">
          <Table head={["Criterion", "Value", "Weight", "Earned", "Result"]} minWidth={500}>
            {result.criteria.map((c) => (
              <tr key={c.label}>
                <Td className="font-semibold text-foreground">{c.label}</Td>
                <Td>{c.value}</Td>
                <Td>{c.weight}</Td>
                <Td>{c.earned}</Td>
                <Td>{c.pass ? <Badge tone="green">Pass</Badge> : <Badge tone="red">Fail</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Score Breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={result.criteria} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" domain={[0, "dataMax"]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10.5 }} width={140} />
              <Tooltip />
              <Bar dataKey="earned" radius={[0, 3, 3, 0]}>
                {result.criteria.map((c) => (
                  <Cell key={c.label} fill={c.pass ? "var(--rag-green)" : "var(--rag-red)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Blockers" className="mb-3">
        <Table head={["Type", "Defect", "Module", "Severity", "Age", "Assignee"]} minWidth={800}>
          {openCritical.map((d) => (
            <tr key={`crit-${d.id}`}>
              <Td><Badge tone="red">Critical Open</Badge></Td>
              <Td className="font-semibold text-foreground">{d.defectId} — {d.title}</Td>
              <Td>{moduleById(state, d.moduleId)?.name ?? "—"}</Td>
              <Td><Badge>{d.severity}</Badge></Td>
              <Td>{daysSince(d.createdAt)}d</Td>
              <Td>{d.assignee || "Unassigned"}</Td>
            </tr>
          ))}
          {slaBreaches
            .filter((d) => d.severity !== "Critical")
            .map((d) => (
              <tr key={`sla-${d.id}`}>
                <Td><Badge tone="amber">SLA Breach</Badge></Td>
                <Td className="font-semibold text-foreground">{d.defectId} — {d.title}</Td>
                <Td>{moduleById(state, d.moduleId)?.name ?? "—"}</Td>
                <Td><Badge>{d.severity}</Badge></Td>
                <Td>{daysSince(d.createdAt)}d</Td>
                <Td>{d.assignee || "Unassigned"}</Td>
              </tr>
            ))}
        </Table>
        {!openCritical.length && !slaBreaches.length && <Empty text="No blockers — release path is clear." />}
      </Card>

      <Card title="Sign-off History">
        <Table head={["Date", "User", "Decision"]} minWidth={600}>
          {signoffs.map((a) => (
            <tr key={a.id}>
              <Td>{new Date(a.ts).toLocaleString()}</Td>
              <Td className="font-semibold text-foreground">{a.user}</Td>
              <Td>{a.action.replace("Sign-off: ", "")}</Td>
            </tr>
          ))}
        </Table>
        {!signoffs.length && <Empty text="No sign-offs recorded yet." />}
      </Card>

      <Modal
        open={showModal}
        title="Record Sign-off"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={recordSignoff}>Submit Sign-off</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground">Signing off as <span className="font-semibold text-foreground">{currentUser.name}</span> for <span className="font-semibold text-foreground">{state.currentProject}</span>.</p>
          <Field label="Decision">
            <select className={inputCls} value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
              <option value="GO">GO</option>
              <option value="CONDITIONAL GO">CONDITIONAL GO</option>
              <option value="NO-GO">NO-GO</option>
            </select>
          </Field>
          <Field label="Comments">
            <textarea className={`${inputCls} min-h-20`} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add rationale or conditions..." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

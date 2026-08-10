import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useQa, uid } from "@/lib/qa/store";
import { execStats, moduleById } from "@/lib/qa/compute";
import type { ExecStatus, ActivityEntry } from "@/lib/qa/types";
import { Badge, Card, Kpi, PageHeader, Btn, Progress, Field, inputCls, Empty } from "@/components/qa/ui";

export const Route = createFileRoute("/execution")({
  head: () => ({
    meta: [
      { title: "Execution Runner | QA Delivery Intelligence" },
      { name: "description", content: "Run through test plan queues, mark pass/fail/hold/skip, capture actuals and auto-log defects." },
      { property: "og:title", content: "Execution Runner | QA Delivery Intelligence" },
      { property: "og:description", content: "Execute test cases and track live progress with a results donut chart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutionPage,
});

const RESULT_COLORS: Record<string, string> = {
  Pass: "var(--rag-green)",
  Fail: "var(--rag-red)",
  Hold: "var(--rag-amber)",
  Skipped: "var(--tone-purple)",
  "Not Executed": "var(--muted-foreground)",
};

function ExecutionPage() {
  const { state, update, log, currentUser } = useQa();
  const plans = useMemo(
    () => (state.currentProject === "All" ? state.testPlans : state.testPlans.filter((p) => p.proj === state.currentProject)),
    [state.testPlans, state.currentProject],
  );
  const modules = useMemo(
    () => (state.currentProject === "All" ? state.modules : state.modules.filter((m) => m.proj === state.currentProject)),
    [state.modules, state.currentProject],
  );

  const [source, setSource] = useState<"plan" | "module">("plan");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [idx, setIdx] = useState(0);
  const [actual, setActual] = useState("");
  const [logDefect, setLogDefect] = useState(false);
  const [severity, setSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");

  const queue = useMemo(() => {
    if (source === "plan") {
      const plan = state.testPlans.find((p) => p.id === planId);
      if (!plan) return [];
      return plan.tcIds.map((id) => state.testCases.find((c) => c.id === id)).filter(Boolean) as typeof state.testCases;
    }
    return state.testCases.filter((c) => c.moduleId === moduleId);
  }, [source, planId, moduleId, state.testPlans, state.testCases]);

  const current = queue[idx];
  const stats = execStats(queue);

  const donutData = ["Pass", "Fail", "Hold", "Skipped", "Not Executed"]
    .map((k) => ({ name: k, value: queue.filter((c) => c.status === k).length }))
    .filter((d) => d.value > 0);

  function record(status: ExecStatus) {
    if (!current) return;
    const entry: ActivityEntry = {
      ts: new Date().toISOString(),
      user: currentUser.name,
      text: `Executed with result ${status}${actual ? `: ${actual}` : ""}`,
    };
    const updatedTc = { ...current, status, actual: actual || current.actual, activity: [entry, ...current.activity] };

    update((s) => {
      let testCases = s.testCases.map((c) => (c.id === current.id ? updatedTc : c));
      let defects = s.defects;
      if (status === "Fail" && logDefect) {
        const defectId = `BUG-${String(s.defects.length + 1).padStart(3, "0")}`;
        const newDefect = {
          id: uid("d"),
          defectId,
          title: `${current.title} — failed on execution`,
          severity,
          priority: severity,
          status: "Open",
          moduleId: current.moduleId,
          testCaseId: current.id,
          assignee: current.assignee || currentUser.name,
          reporter: currentUser.name,
          createdAt: new Date().toISOString().slice(0, 10),
          comments: [],
        };
        defects = [newDefect, ...s.defects];
        testCases = testCases.map((c) => (c.id === current.id ? { ...c, defect: defectId } : c));
      }
      return { ...s, testCases, defects };
    });
    log(`Executed ${current.id} → ${status}${status === "Fail" && logDefect ? " (defect logged)" : ""}`);
    setActual("");
    setLogDefect(false);
    if (idx < queue.length - 1) setIdx(idx + 1);
  }

  return (
    <div>
      <PageHeader title="Execution" subtitle="Run through a test plan or module queue, one test case at a time." />

      <Card className="mb-3">
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Source">
            <select
              className={inputCls}
              value={source}
              onChange={(e) => {
                setSource(e.target.value as any);
                setIdx(0);
              }}
            >
              <option value="plan">Test Plan</option>
              <option value="module">Module</option>
            </select>
          </Field>
          {source === "plan" ? (
            <Field label="Test Plan">
              <select
                className={`${inputCls} min-w-[220px]`}
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setIdx(0);
                }}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Module">
              <select
                className={`${inputCls} min-w-[220px]`}
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setIdx(0);
                }}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Card>

      {queue.length === 0 ? (
        <Card><Empty text="No test cases in this queue." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card
              title={`Test Case ${idx + 1} of ${queue.length}`}
              actions={
                <div className="flex gap-1.5">
                  <Btn onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← Prev</Btn>
                  <Btn onClick={() => setIdx((i) => Math.min(queue.length - 1, i + 1))} disabled={idx === queue.length - 1}>Next →</Btn>
                </div>
              }
            >
              {current && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{current.id} — {current.title}</h3>
                    <Badge>{current.status}</Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    Module: {moduleById(state, current.moduleId)?.name ?? "—"} · Priority: {current.priority} · Assignee: {current.assignee || "—"}
                  </p>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Steps</p>
                    <p className="whitespace-pre-wrap text-[12.5px]">{current.steps || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Expected Result</p>
                    <p className="whitespace-pre-wrap text-[12.5px]">{current.expected || "—"}</p>
                  </div>
                  <Field label="Actual Result">
                    <textarea className={`${inputCls} min-h-[70px]`} value={actual} onChange={(e) => setActual(e.target.value)} placeholder={current.actual || "Enter observed result…"} />
                  </Field>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[12px]">
                      <input type="checkbox" checked={logDefect} onChange={(e) => setLogDefect(e.target.checked)} />
                      Log defect if marked Fail
                    </label>
                    {logDefect && (
                      <select className={`${inputCls} max-w-[140px]`} value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                        {["Critical", "High", "Medium", "Low"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Btn variant="primary" onClick={() => record("Pass")}>Pass</Btn>
                    <Btn variant="danger" onClick={() => record("Fail")}>Fail</Btn>
                    <Btn onClick={() => record("Hold")}>Hold</Btn>
                    <Btn onClick={() => record("Skipped")}>Skipped</Btn>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-3">
            <Card title="Progress Summary">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Kpi label="Executed" value={`${stats.execPct}%`} tone="teal" />
                <Kpi label="Pass Rate" value={`${stats.passPct}%`} tone="green" />
              </div>
              <Progress pct={stats.execPct} />
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={RESULT_COLORS[d.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {donutData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: RESULT_COLORS[d.name] }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </Card>
            <Card title="Queue">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {queue.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setIdx(i)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11.5px] ${i === idx ? "bg-accent" : "hover:bg-accent/50"}`}
                  >
                    <span className="truncate">{c.id} — {c.title}</span>
                    <Badge>{c.status}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQa, uid } from "@/lib/qa/store";
import { execStats, fmtDate } from "@/lib/qa/compute";
import type { TestPlan } from "@/lib/qa/types";

import { Badge, Card, PageHeader, Btn, Progress, Modal, Field, inputCls, Empty } from "@/components/qa/ui";

export const Route = createFileRoute("/testplans")({
  head: () => ({
    meta: [
      { title: "Test Plans | QA Delivery Intelligence" },
      { name: "description", content: "Create, approve and track test plans with linked test cases and live execution progress." },
      { property: "og:title", content: "Test Plans | QA Delivery Intelligence" },
      { property: "og:description", content: "Manage test plans, approvals and execution progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestPlansPage,
});

const TYPES = ["Regression", "Smoke", "Full", "UAT", "Sanity"];
const STATUSES = ["Draft", "In Progress", "Completed", "Blocked"];

function emptyPlan(proj: string): TestPlan {
  return {
    id: uid("tp"),
    name: "",
    proj,
    type: "Regression",
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    owner: "",
    status: "Draft",
    desc: "",
    tcIds: [],
    approval: { status: "Not Submitted", approver: "", comments: "", date: "" },
  };
}

function TestPlansPage() {
  const { state, update, log, currentUser } = useQa();
  const plans = useMemo(
    () => (state.currentProject === "All" ? state.testPlans : state.testPlans.filter((p) => p.proj === state.currentProject)),
    [state.testPlans, state.currentProject],
  );

  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [rejecting, setRejecting] = useState<TestPlan | null>(null);
  const [comment, setComment] = useState("");

  function savePlan(p: TestPlan) {
    update((s) => {
      const exists = s.testPlans.some((x) => x.id === p.id);
      return { ...s, testPlans: exists ? s.testPlans.map((x) => (x.id === p.id ? p : x)) : [p, ...s.testPlans] };
    });
    log(`Saved test plan ${p.name}`);
    setEditing(null);
  }

  function deletePlan(id: string) {
    if (!confirm("Delete this test plan?")) return;
    update((s) => ({ ...s, testPlans: s.testPlans.filter((p) => p.id !== id) }));
    log(`Deleted test plan ${id}`);
  }

  function submitForApproval(p: TestPlan) {
    const updated = { ...p, approval: { ...p.approval, status: "Pending Approval", date: new Date().toISOString().slice(0, 10) } };
    update((s) => ({ ...s, testPlans: s.testPlans.map((x) => (x.id === p.id ? updated : x)) }));
    log(`Submitted plan ${p.name} for approval`);
  }

  function approve(p: TestPlan) {
    const updated = { ...p, approval: { status: "Approved", approver: currentUser.name, comments: "", date: new Date().toISOString().slice(0, 10) } };
    update((s) => ({ ...s, testPlans: s.testPlans.map((x) => (x.id === p.id ? updated : x)) }));
    log(`Approved plan ${p.name}`);
  }

  function reject(p: TestPlan, comments: string) {
    const updated = { ...p, approval: { status: "Rejected", approver: currentUser.name, comments, date: new Date().toISOString().slice(0, 10) } };
    update((s) => ({ ...s, testPlans: s.testPlans.map((x) => (x.id === p.id ? updated : x)) }));
    log(`Rejected plan ${p.name}: ${comments}`);
    setRejecting(null);
    setComment("");
  }

  return (
    <div>
      <PageHeader
        title="Test Plans"
        subtitle="Plan, approve and monitor execution progress by test cycle."
        actions={
          <Btn variant="primary" onClick={() => setEditing(emptyPlan(state.currentProject === "All" ? state.projects[0]?.name ?? "" : state.currentProject))}>
            + New Test Plan
          </Btn>
        }
      />

      {plans.length === 0 ? (
        <Card>
          <Empty text="No test plans yet for this project." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const cases = state.testCases.filter((c) => p.tcIds.includes(c.id));
            const st = execStats(cases);
            return (
              <Card key={p.id} title={p.name} actions={<Badge>{p.status}</Badge>}>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{p.proj}</span>
                    <span>{p.type}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {fmtDate(p.start)} → {fmtDate(p.end)} · Owner: {p.owner || "—"}
                  </p>
                  <p className="text-muted-foreground">{p.desc}</p>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>{cases.length} test cases linked</span>
                      <span>{st.execPct}% executed · {st.passPct}% pass</span>
                    </div>
                    <Progress pct={st.execPct} tone={st.failed > 0 ? "amber" : "green"} />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge tone={p.approval.status === "Approved" ? "green" : p.approval.status === "Rejected" ? "red" : p.approval.status === "Pending Approval" ? "amber" : "muted"}>
                      {p.approval.status}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Btn onClick={() => setEditing(p)}>Edit</Btn>
                      <Btn variant="danger" onClick={() => deletePlan(p.id)}>Delete</Btn>
                    </div>
                  </div>
                  {p.approval.comments && (
                    <p className="rounded bg-rag-red-bg px-2 py-1 text-[11px] text-rag-red">Rejection: {p.approval.comments}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.approval.status === "Not Submitted" && <Btn onClick={() => submitForApproval(p)}>Submit for Approval</Btn>}
                    {p.approval.status === "Pending Approval" && (
                      <>
                        <Btn onClick={() => approve(p)}>Approve</Btn>
                        <Btn variant="danger" onClick={() => setRejecting(p)}>Reject</Btn>
                      </>
                    )}
                    {p.approval.status === "Rejected" && <Btn onClick={() => submitForApproval(p)}>Resubmit</Btn>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <PlanModal plan={editing} onClose={() => setEditing(null)} onSave={savePlan} />}

      {rejecting && (
        <Modal
          open
          title={`Reject "${rejecting.name}"`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Btn onClick={() => setRejecting(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => reject(rejecting, comment)}>Reject</Btn>
            </>
          }
        >
          <Field label="Rejection Comments">
            <textarea className={`${inputCls} min-h-[80px]`} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

function PlanModal({ plan, onClose, onSave }: { plan: TestPlan; onClose: () => void; onSave: (p: TestPlan) => void }) {
  const { state } = useQa();
  const [form, setForm] = useState<TestPlan>(plan);

  function toggleTc(id: string) {
    setForm((f) => ({ ...f, tcIds: f.tcIds.includes(id) ? f.tcIds.filter((x) => x !== id) : [...f.tcIds, id] }));
  }

  const casesInProject = state.testCases.filter((c) => {
    const mod = state.modules.find((m) => m.id === c.moduleId);
    return !form.proj || mod?.proj === form.proj;
  });

  return (
    <Modal
      open
      title={state.testPlans.some((p) => p.id === form.id) ? "Edit Test Plan" : "New Test Plan"}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => form.name && onSave(form)}>Save</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Project">
          <select className={inputCls} value={form.proj} onChange={(e) => setForm({ ...form, proj: e.target.value })}>
            {state.projects.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <input className={inputCls} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input type="date" className={inputCls} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </Field>
        <Field label="End Date">
          <input type="date" className={inputCls} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea className={`${inputCls} min-h-[60px]`} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={`Linked Test Cases (${form.tcIds.length} selected)`}>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded border border-border p-2">
              {casesInProject.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={form.tcIds.includes(c.id)} onChange={() => toggleTc(c.id)} />
                  <span className="font-mono text-[10.5px] text-muted-foreground">{c.id}</span> {c.title}
                </label>
              ))}
              {casesInProject.length === 0 && <p className="text-[12px] text-muted-foreground">No test cases in this project yet.</p>}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQa, uid } from "@/lib/qa/store";
import { SEVERITIES } from "@/lib/qa/seed";
import { PALETTE, scopedModules } from "@/lib/qa/compute";
import type { Requirement, Severity } from "@/lib/qa/types";
import { Badge, Btn, Card, Empty, Field, inputCls, Kpi, Modal, PageHeader, Table, Td } from "@/components/qa/ui";

export const Route = createFileRoute("/rtm")({
  head: () => ({
    meta: [
      { title: "Requirement Coverage (RTM) | QA Delivery Intelligence" },
      { name: "description", content: "Requirement traceability matrix with linked test cases and coverage status." },
      { property: "og:title", content: "Requirement Coverage (RTM)" },
      { property: "og:description", content: "Requirement traceability matrix with linked test cases and coverage status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RtmPage,
});

type CoverageTag = "Covered" | "Partially covered" | "Not covered" | "Issues found";

function coverageOf(execStatuses: string[]): CoverageTag {
  if (execStatuses.length === 0) return "Not covered";
  if (execStatuses.some((s) => s === "Fail")) return "Issues found";
  if (execStatuses.every((s) => s === "Pass")) return "Covered";
  return "Partially covered";
}

const covTone: Record<CoverageTag, "green" | "amber" | "red" | "muted"> = {
  Covered: "green",
  "Partially covered": "amber",
  "Issues found": "red",
  "Not covered": "muted",
};

const emptyForm = { reqId: "", title: "", moduleId: "", priority: "Medium" as Severity };

function RtmPage() {
  const { state, update, log } = useQa();
  const modules = scopedModules(state);
  const modIds = new Set(modules.map((m) => m.id));
  const requirements = state.requirements.filter((r) => modIds.has(r.moduleId));

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [linkReq, setLinkReq] = useState<Requirement | null>(null);

  const rows = useMemo(
    () =>
      requirements.map((r) => {
        const linked = state.testCases.filter((c) => (c.reqIds || []).includes(r.id));
        const mod = state.modules.find((m) => m.id === r.moduleId);
        const cov = coverageOf(linked.map((c) => c.status));
        return { req: r, mod, linked, cov };
      }),
    [requirements, state.testCases, state.modules],
  );

  const covered = rows.filter((r) => r.cov === "Covered" || r.cov === "Partially covered" || r.cov === "Issues found").length;
  const uncovered = rows.length - covered;
  const coveragePct = rows.length ? Math.round((covered / rows.length) * 100) : 0;

  const moduleChartData = useMemo(() => {
    return modules.map((m) => {
      const reqs = state.requirements.filter((r) => r.moduleId === m.id);
      const cov = reqs.filter((r) => state.testCases.some((c) => (c.reqIds || []).includes(r.id))).length;
      const pct = reqs.length ? Math.round((cov / reqs.length) * 100) : 0;
      return { name: m.name, pct };
    });
  }, [modules, state.requirements, state.testCases]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, moduleId: modules[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(r: Requirement) {
    setEditId(r.id);
    setForm({ reqId: r.reqId, title: r.title, moduleId: r.moduleId, priority: r.priority });
    setModalOpen(true);
  }

  function save() {
    if (!form.reqId.trim() || !form.title.trim() || !form.moduleId) return;
    if (editId) {
      update((s) => ({ ...s, requirements: s.requirements.map((r) => (r.id === editId ? { ...r, ...form } : r)) }));
      log(`Updated requirement ${form.reqId}`);
    } else {
      const id = uid("r");
      update((s) => ({ ...s, requirements: [...s.requirements, { id, ...form }] }));
      log(`Added requirement ${form.reqId}`);
    }
    setModalOpen(false);
  }

  function remove(r: Requirement) {
    update((s) => ({
      ...s,
      requirements: s.requirements.filter((x) => x.id !== r.id),
      testCases: s.testCases.map((c) => ({ ...c, reqIds: (c.reqIds || []).filter((id) => id !== r.id) })),
    }));
    log(`Deleted requirement ${r.reqId}`);
  }

  function toggleLink(reqId: string, tcId: string, linked: boolean) {
    update((s) => ({
      ...s,
      testCases: s.testCases.map((c) => {
        if (c.id !== tcId) return c;
        const set = new Set(c.reqIds || []);
        if (linked) set.delete(reqId);
        else set.add(reqId);
        return { ...c, reqIds: Array.from(set) };
      }),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Requirement Coverage (RTM)"
        subtitle="Traceability from requirements to linked test cases and execution roll-up."
        actions={<Btn variant="primary" onClick={openAdd}>+ Add Requirement</Btn>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total Requirements" value={rows.length} tone="blue" />
        <Kpi label="Covered" value={covered} tone="green" />
        <Kpi label="Uncovered" value={uncovered} tone="red" />
        <Kpi label="Coverage %" value={`${coveragePct}%`} tone="purple" />
      </div>

      <Card title="Coverage by Module" className="mb-3">
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleChartData} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                {moduleChartData.map((d, i) => (
                  <Cell key={i} fill={d.pct >= 80 ? PALETTE.green : d.pct >= 50 ? PALETTE.amber : PALETTE.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Requirement Traceability Matrix">
        {rows.length === 0 ? (
          <Empty text="No requirements tracked yet." />
        ) : (
          <Table head={["REQ ID", "Title", "Module", "Priority", "Linked TCs", "Coverage", "Actions"]}>
            {rows.map(({ req, mod, linked, cov }) => (
              <tr key={req.id} className="hover:bg-accent/40">
                <Td className="font-semibold">{req.reqId}</Td>
                <Td className="max-w-xs truncate" title={req.title}>{req.title}</Td>
                <Td><Badge tone="muted">{mod?.name ?? "—"}</Badge></Td>
                <Td><Badge tone={req.priority === "Critical" || req.priority === "High" ? "red" : req.priority === "Medium" ? "amber" : "green"}>{req.priority}</Badge></Td>
                <Td>
                  <button className="underline decoration-dotted hover:text-foreground" onClick={() => setLinkReq(req)}>
                    {linked.length}
                  </button>
                </Td>
                <Td><Badge tone={covTone[cov]}>{cov}</Badge></Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Btn size="sm" onClick={() => openEdit(req)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => remove(req)}>Delete</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editId ? "Edit Requirement" : "Add Requirement"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Btn onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Requirement ID">
            <input className={inputCls} value={form.reqId} onChange={(e) => setForm({ ...form, reqId: e.target.value })} placeholder="e.g. REQ-101" />
          </Field>
          <Field label="Title">
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Module">
            <select className={inputCls} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Severity })}>
              {SEVERITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!linkReq}
        title={linkReq ? `Link Test Cases — ${linkReq.reqId}` : ""}
        onClose={() => setLinkReq(null)}
        wide
      >
        {linkReq && (
          <div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Toggle test cases from module “{state.modules.find((m) => m.id === linkReq.moduleId)?.name ?? "—"}” to link/unlink from this requirement.
            </p>
            <Table head={["", "ID", "Title", "Status"]} minWidth={500}>
              {state.testCases
                .filter((c) => c.moduleId === linkReq.moduleId)
                .map((c) => {
                  const linked = (c.reqIds || []).includes(linkReq.id);
                  return (
                    <tr key={c.id}>
                      <Td>
                        <input type="checkbox" checked={linked} onChange={() => toggleLink(linkReq.id, c.id, linked)} />
                      </Td>
                      <Td>{c.id}</Td>
                      <Td>{c.title}</Td>
                      <Td><Badge>{c.status}</Badge></Td>
                    </tr>
                  );
                })}
            </Table>
            {state.testCases.filter((c) => c.moduleId === linkReq.moduleId).length === 0 && <Empty text="No test cases in this module." />}
          </div>
        )}
      </Modal>
    </div>
  );
}

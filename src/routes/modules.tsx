import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQa, uid } from "@/lib/qa/store";
import { STATUSES } from "@/lib/qa/seed";
import { execStats, scopedModules } from "@/lib/qa/compute";
import type { ModuleStatus, QaModule } from "@/lib/qa/types";
import { Badge, Btn, Card, Empty, Field, inputCls, Kpi, Modal, PageHeader, Progress, Table, Td } from "@/components/qa/ui";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "Module Register | QA Delivery Intelligence" },
      { name: "description", content: "Manage delivery modules, owners, release dates, coverage and status." },
      { property: "og:title", content: "Module Register" },
      { property: "og:description", content: "Manage delivery modules, owners, release dates, coverage and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModulesPage,
});

const emptyForm = {
  name: "",
  proj: "",
  esg: "",
  sag: "",
  saRel: "",
  uat: "",
  status: "Requirement Gathering" as ModuleStatus,
  bugs: 0,
  reqs: 0,
  totalReqs: 0,
};

function ModulesPage() {
  const { state, update, log } = useQa();
  const modules = scopedModules(state);

  const [search, setSearch] = useState("");
  const [projFilter, setProjFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return modules.filter((m) => {
      if (search && !`${m.name} ${m.proj}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (projFilter !== "All" && m.proj !== projFilter) return false;
      if (statusFilter !== "All" && m.status !== statusFilter) return false;
      return true;
    });
  }, [modules, search, projFilter, statusFilter]);

  const inTesting = modules.filter((m) => m.status === "Testing in Progress").length;
  const releasedUat = modules.filter((m) => m.status === "Released to UAT" || m.status === "Customer Signoff" || m.status === "Go-Live").length;
  const avgCoverage = modules.length
    ? Math.round(modules.reduce((n, m) => n + (m.totalReqs ? (m.reqs / m.totalReqs) * 100 : 0), 0) / modules.length)
    : 0;

  const projectNames = useMemo(() => Array.from(new Set(state.modules.map((m) => m.proj))), [state.modules]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, proj: state.currentProject !== "All" ? state.currentProject : projectNames[0] ?? "" });
    setModalOpen(true);
  }

  function openEdit(m: QaModule) {
    setEditId(m.id);
    setForm({ name: m.name, proj: m.proj, esg: m.esg, sag: m.sag, saRel: m.saRel, uat: m.uat, status: m.status, bugs: m.bugs, reqs: m.reqs, totalReqs: m.totalReqs });
    setModalOpen(true);
  }

  function save() {
    if (!form.name.trim() || !form.proj.trim()) return;
    if (editId) {
      update((s) => ({ ...s, modules: s.modules.map((m) => (m.id === editId ? { ...m, ...form } : m)) }));
      log(`Updated module ${form.name}`);
    } else {
      const id = uid("m");
      update((s) => ({ ...s, modules: [...s.modules, { id, ...form }] }));
      log(`Added module ${form.name}`);
    }
    setModalOpen(false);
  }

  function remove(m: QaModule) {
    update((s) => ({ ...s, modules: s.modules.filter((x) => x.id !== m.id) }));
    log(`Deleted module ${m.name}`);
  }

  const detailModule = detailId ? state.modules.find((m) => m.id === detailId) : null;
  const detailCases = detailModule ? state.testCases.filter((c) => c.moduleId === detailModule.id) : [];
  const detailDefects = detailModule ? state.defects.filter((d) => d.moduleId === detailModule.id) : [];

  return (
    <div>
      <PageHeader
        title="Module Register"
        subtitle="Delivery modules, owners, release milestones and requirement coverage."
        actions={<Btn variant="primary" onClick={openAdd}>+ Add Module</Btn>}
      />


      <Card
        title="Filters"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${inputCls} w-48`} placeholder="Search module or project…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={inputCls} value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
              <option>All</option>
              {projectNames.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <Empty text="No modules match the current filters." />
        ) : (
          <Table head={["Module", "Project", "ESG Owner", "SA Owner", "SA Release", "UAT Date", "Status", "Open Bugs", "Req Coverage", "Actions"]}>
            {filtered.map((m) => {
              const cov = m.totalReqs ? Math.round((m.reqs / m.totalReqs) * 100) : 0;
              return (
                <tr key={m.id} className="hover:bg-accent/40">
                  <Td>
                    <button className="font-semibold text-foreground hover:underline" onClick={() => setDetailId(m.id)}>
                      {m.name}
                    </button>
                  </Td>
                  <Td><Badge tone="muted">{m.proj}</Badge></Td>
                  <Td>{m.esg || "—"}</Td>
                  <Td>{m.sag || "—"}</Td>
                  <Td className="whitespace-nowrap">{m.saRel || "—"}</Td>
                  <Td className="whitespace-nowrap">{m.uat || "—"}</Td>
                  <Td><Badge>{m.status}</Badge></Td>
                  <Td className={m.bugs > 8 ? "font-bold text-rag-red" : m.bugs > 4 ? "font-bold text-rag-amber" : ""}>{m.bugs}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-20"><Progress pct={cov} tone={cov >= 80 ? "green" : cov >= 50 ? "amber" : "red"} /></div>
                      <span className="text-[11px]">{m.reqs}/{m.totalReqs}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn size="sm" onClick={() => openEdit(m)}>Edit</Btn>
                      <Btn size="sm" variant="danger" onClick={() => remove(m)}>Delete</Btn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editId ? "Edit Module" : "Add Module"}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <>
            <Btn onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Module Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Project (required)">
            <select className={inputCls} value={form.proj} onChange={(e) => setForm({ ...form, proj: e.target.value })}>
              <option value="">Select project…</option>
              {projectNames.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="ESG Owner">
            <input className={inputCls} value={form.esg} onChange={(e) => setForm({ ...form, esg: e.target.value })} />
          </Field>
          <Field label="SA Owner">
            <input className={inputCls} value={form.sag} onChange={(e) => setForm({ ...form, sag: e.target.value })} />
          </Field>
          <Field label="SA Release Date">
            <input className={inputCls} value={form.saRel} onChange={(e) => setForm({ ...form, saRel: e.target.value })} placeholder="e.g. 13-May-26" />
          </Field>
          <Field label="UAT Date">
            <input className={inputCls} value={form.uat} onChange={(e) => setForm({ ...form, uat: e.target.value })} placeholder="e.g. 19-Jun-26" />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ModuleStatus })}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Open Bugs">
            <input type="number" min={0} className={inputCls} value={form.bugs} onChange={(e) => setForm({ ...form, bugs: Number(e.target.value) })} />
          </Field>
          <Field label="Requirements Covered">
            <input type="number" min={0} className={inputCls} value={form.reqs} onChange={(e) => setForm({ ...form, reqs: Number(e.target.value) })} />
          </Field>
          <Field label="Total Requirements">
            <input type="number" min={0} className={inputCls} value={form.totalReqs} onChange={(e) => setForm({ ...form, totalReqs: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>

      <Modal open={!!detailModule} title={detailModule ? `Module Detail — ${detailModule.name}` : ""} onClose={() => setDetailId(null)} wide>
        {detailModule && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Test Cases" value={detailCases.length} tone="blue" />
              <Kpi label="Exec %" value={`${execStats(detailCases).execPct}%`} tone="teal" />
              <Kpi label="Pass %" value={`${execStats(detailCases).passPct}%`} tone="green" />
              <Kpi label="Open Defects" value={detailDefects.filter((d) => d.status !== "Closed" && d.status !== "Deferred").length} tone="red" />
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Test Cases</h4>
              {detailCases.length === 0 ? (
                <Empty text="No test cases authored." />
              ) : (
                <Table head={["ID", "Title", "Status", "Priority", "Assignee"]} minWidth={600}>
                  {detailCases.map((c) => (
                    <tr key={c.id}>
                      <Td>{c.id}</Td>
                      <Td>{c.title}</Td>
                      <Td><Badge>{c.status}</Badge></Td>
                      <Td><Badge tone={c.priority === "Critical" || c.priority === "High" ? "red" : "muted"}>{c.priority}</Badge></Td>
                      <Td>{c.assignee}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Defects</h4>
              {detailDefects.length === 0 ? (
                <Empty text="No defects logged." />
              ) : (
                <Table head={["ID", "Title", "Severity", "Status", "Assignee"]} minWidth={600}>
                  {detailDefects.map((d) => (
                    <tr key={d.id}>
                      <Td>{d.defectId}</Td>
                      <Td>{d.title}</Td>
                      <Td><Badge tone={d.severity === "Critical" || d.severity === "High" ? "red" : "amber"}>{d.severity}</Badge></Td>
                      <Td><Badge>{d.status}</Badge></Td>
                      <Td>{d.assignee}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

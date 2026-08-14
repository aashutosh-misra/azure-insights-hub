import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQa, uid } from "@/lib/qa/store";
import { DEFECT_STATUSES, SEVERITIES } from "@/lib/qa/seed";
import { fmtDate, moduleById, scopedDefects, scopedModules, slaAgeing } from "@/lib/qa/compute";
import type { Defect, Severity } from "@/lib/qa/types";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  inputCls,
  Modal,
  PageHeader,
  Table,
  Td,
} from "@/components/qa/ui";

export const Route = createFileRoute("/defects")({
  head: () => ({
    meta: [
      { title: "Defect Register | QA Delivery Intelligence" },
      {
        name: "description",
        content: "Log, triage and track defects with SLA ageing, severity distribution and full comment history.",
      },
      { property: "og:title", content: "Defect Register" },
      { property: "og:description", content: "Track defects across modules with SLA breach visibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DefectsPage,
});

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: "var(--rag-red)",
  High: "var(--rag-amber)",
  Medium: "var(--rag-blue)",
  Low: "var(--rag-green)",
};

const emptyForm = () => ({
  title: "",
  severity: "Medium" as Severity,
  priority: "Medium" as Severity,
  status: "Open" as string,
  moduleId: "",
  testCaseId: "",
  assignee: "",
  reporter: "",
});

function DefectsPage() {
  const { state, update, log, currentUser } = useQa();
  const modules = scopedModules(state);
  const defects = scopedDefects(state);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  const [editing, setEditing] = useState<Defect | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<Defect | null>(null);
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Defect | null>(null);

  const assignees = useMemo(
    () => Array.from(new Set(defects.map((d) => d.assignee).filter(Boolean))),
    [defects],
  );

  const filtered = useMemo(() => {
    return defects.filter((d) => {
      if (search && !`${d.defectId} ${d.title}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (moduleFilter !== "All" && d.moduleId !== moduleFilter) return false;
      if (severityFilter !== "All" && d.severity !== severityFilter) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (assigneeFilter !== "All" && d.assignee !== assigneeFilter) return false;
      return true;
    });
  }, [defects, search, moduleFilter, severityFilter, statusFilter, assigneeFilter]);

  const open = defects.filter((d) => d.status !== "Closed" && d.status !== "Deferred");
  const critical = open.filter((d) => d.severity === "Critical").length;
  const breached = open.filter((d) => slaAgeing(d).breached).length;
  const closed = defects.filter((d) => d.status === "Closed").length;

  const byModule = modules
    .map((m) => ({ name: m.name, count: open.filter((d) => d.moduleId === m.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const bySeverity = SEVERITIES.map((s) => ({ name: s, value: open.filter((d) => d.severity === s).length })).filter(
    (x) => x.value > 0,
  );

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm(), moduleId: modules[0]?.id ?? "", reporter: currentUser.name });
    setShowModal(true);
  }

  function openEdit(d: Defect) {
    setEditing(d);
    setForm({
      title: d.title,
      severity: d.severity,
      priority: d.priority,
      status: d.status,
      moduleId: d.moduleId,
      testCaseId: d.testCaseId,
      assignee: d.assignee,
      reporter: d.reporter,
    });
    setShowModal(true);
  }

  function saveForm() {
    if (!form.title.trim() || !form.moduleId) return;
    if (editing) {
      update((s) => ({
        ...s,
        defects: s.defects.map((d) => (d.id === editing.id ? { ...d, ...form } : d)),
      }));
      log(`Updated defect ${editing.defectId}`);
    } else {
      const seq = state.defects.length + 1;
      const defectId = `BUG-${String(seq).padStart(3, "0")}`;
      const newDefect: Defect = {
        id: uid("d"),
        defectId,
        createdAt: new Date().toISOString(),
        comments: [],
        ...form,
      };
      update((s) => ({ ...s, defects: [newDefect, ...s.defects] }));
      log(`Logged defect ${defectId}: ${form.title}`);
    }
    setShowModal(false);
  }

  function changeStatus(d: Defect, status: string) {
    update((s) => ({ ...s, defects: s.defects.map((x) => (x.id === d.id ? { ...x, status } : x)) }));
    log(`Changed status of ${d.defectId} to ${status}`);
    setDetail((cur) => (cur && cur.id === d.id ? { ...cur, status } : cur));
  }

  function doDelete(d: Defect) {
    update((s) => ({ ...s, defects: s.defects.filter((x) => x.id !== d.id) }));
    log(`Deleted defect ${d.defectId}`);
    setConfirmDelete(null);
    if (detail?.id === d.id) setDetail(null);
  }

  function addComment() {
    if (!detail || !commentText.trim()) return;
    const entry = { ts: new Date().toISOString(), user: currentUser.name, text: commentText.trim() };
    update((s) => ({
      ...s,
      defects: s.defects.map((d) => (d.id === detail.id ? { ...d, comments: [...d.comments, entry] } : d)),
    }));
    setDetail((cur) => (cur ? { ...cur, comments: [...cur.comments, entry] } : cur));
    log(`Commented on ${detail.defectId}`);
    setCommentText("");
  }

  return (
    <div>
      <PageHeader
        title="Defect Register"
        subtitle="Log, triage and track defects with SLA ageing across modules"
        actions={<Btn variant="primary" onClick={openNew}>+ Log Defect</Btn>}
      />


      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Open Bugs by Module">
          {byModule.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byModule} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--rag-blue)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No open defects" />
          )}
        </Card>
        <Card title="Severity Distribution">
          {bySeverity.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {bySeverity.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name as Severity]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No open defects" />
          )}
        </Card>
      </div>

      <Card
        title="All Defects"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className={`${inputCls} w-40`}
            />
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={`${inputCls} w-36`}>
              <option value="All">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={`${inputCls} w-32`}>
              <option value="All">All Severity</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-32`}>
              <option value="All">All Status</option>
              {DEFECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className={`${inputCls} w-32`}>
              <option value="All">All Assignees</option>
              {assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        }
      >
        <Table
          head={["ID", "Title", "Severity", "Priority", "Status", "Module", "Test Case", "Assignee", "Age", "SLA", ""]}
          minWidth={1200}
        >
          {filtered.map((d) => {
            const ageing = slaAgeing(d);
            const mod = moduleById(state, d.moduleId);
            return (
              <tr key={d.id} className="hover:bg-accent/40">
                <Td className="font-semibold text-foreground">
                  <button className="hover:underline" onClick={() => setDetail(d)}>{d.defectId}</button>
                </Td>
                <Td className="max-w-[220px] truncate">{d.title}</Td>
                <Td><Badge>{d.severity}</Badge></Td>
                <Td><Badge>{d.priority}</Badge></Td>
                <Td>
                  <select
                    value={d.status}
                    onChange={(e) => changeStatus(d, e.target.value)}
                    className="rounded border border-input bg-background px-1.5 py-1 text-[11px]"
                  >
                    {DEFECT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Td>
                <Td>{mod?.name ?? "—"}</Td>
                <Td>{d.testCaseId || "—"}</Td>
                <Td>{d.assignee || "—"}</Td>
                <Td>{ageing.age}d</Td>
                <Td>
                  {ageing.breached ? (
                    <Badge tone="red">Breached</Badge>
                  ) : (
                    <Badge tone="green">Within SLA</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Btn size="sm" onClick={() => openEdit(d)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(d)}>Delete</Btn>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!filtered.length && <Empty text="No defects match these filters." />}
      </Card>

      <Modal
        open={showModal}
        title={editing ? `Edit ${editing.defectId}` : "Log Defect"}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={saveForm}>Save</Btn>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Module">
            <select className={inputCls} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Linked Test Case">
            <input className={inputCls} value={form.testCaseId} onChange={(e) => setForm({ ...form, testCaseId: e.target.value })} placeholder="tc1" />
          </Field>
          <Field label="Severity">
            <select className={inputCls} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Severity })}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {DEFECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <input className={inputCls} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
          </Field>
          <Field label="Reporter">
            <input className={inputCls} value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        title="Delete Defect"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Btn onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => confirmDelete && doDelete(confirmDelete)}>Delete</Btn>
          </>
        }
      >
        <p className="text-[12.5px] text-muted-foreground">
          Delete {confirmDelete?.defectId}: {confirmDelete?.title}? This cannot be undone.
        </p>
      </Modal>

      <Modal open={!!detail} title={detail ? `${detail.defectId}` : ""} onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-[10.5px] uppercase text-muted-foreground">Severity</p><Badge>{detail.severity}</Badge></div>
              <div><p className="text-[10.5px] uppercase text-muted-foreground">Priority</p><Badge>{detail.priority}</Badge></div>
              <div><p className="text-[10.5px] uppercase text-muted-foreground">Status</p><Badge>{detail.status}</Badge></div>
              <div><p className="text-[10.5px] uppercase text-muted-foreground">Age</p><span className="text-[12.5px] font-semibold">{slaAgeing(detail).age}d</span></div>
            </div>
            <div>
              <p className="text-[10.5px] uppercase text-muted-foreground">Title</p>
              <p className="text-[13px] font-semibold text-foreground">{detail.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
              <div><p className="text-muted-foreground">Module</p><p>{moduleById(state, detail.moduleId)?.name ?? "—"}</p></div>
              <div><p className="text-muted-foreground">Test Case</p><p>{detail.testCaseId || "—"}</p></div>
              <div><p className="text-muted-foreground">Assignee</p><p>{detail.assignee || "—"}</p></div>
              <div><p className="text-muted-foreground">Reporter</p><p>{detail.reporter || "—"}</p></div>
              <div><p className="text-muted-foreground">Created</p><p>{fmtDate(detail.createdAt)}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Comments</p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-border p-2">
                {detail.comments.length === 0 && <p className="text-[12px] text-muted-foreground">No comments yet.</p>}
                {detail.comments.map((c, i) => (
                  <div key={i} className="rounded bg-secondary/50 p-2 text-[12px]">
                    <p className="font-semibold text-foreground">{c.user} <span className="font-normal text-muted-foreground">· {new Date(c.ts).toLocaleString()}</span></p>
                    <p className="mt-0.5">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className={inputCls}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                />
                <Btn variant="primary" onClick={addComment}>Post</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

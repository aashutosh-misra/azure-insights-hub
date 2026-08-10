import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQa, uid } from "@/lib/qa/store";
import { scopedTestCases, moduleById, fmtDate } from "@/lib/qa/compute";
import type { TestCase, ActivityEntry } from "@/lib/qa/types";
import { EXEC_STATUSES, SEVERITIES } from "@/lib/qa/seed";
import {
  Badge,
  Card,
  Kpi,
  PageHeader,
  Btn,
  Table,
  Td,
  Empty,
  Modal,
  Field,
  inputCls,
} from "@/components/qa/ui";

export const Route = createFileRoute("/testcases")({
  head: () => ({
    meta: [
      { title: "Test Cases | QA Delivery Intelligence" },
      { name: "description", content: "Manage, execute and track test cases across modules with filters, bulk actions and CSV import/export." },
      { property: "og:title", content: "Test Cases | QA Delivery Intelligence" },
      { property: "og:description", content: "Register of all test cases with status, defects and coverage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestCasesPage,
});

const TYPES = ["Functional", "Integration", "Regression", "Performance", "Security", "UAT"];
const AUTOMATION = ["Manual", "Automated"] as const;

function emptyTc(): TestCase {
  return {
    id: uid("tc"),
    title: "",
    moduleId: "",
    type: "Functional",
    priority: "Medium",
    assignee: "",
    status: "Not Executed",
    desc: "",
    steps: "",
    expected: "",
    actual: "",
    defect: "",
    createdAt: new Date().toISOString().slice(0, 10),
    automation: "Manual",
    reqIds: [],
    activity: [],
    tags: "",
  };
}

function TestCasesPage() {
  const { state, update, log, currentUser } = useQa();
  const cases = scopedTestCases(state);

  const [search, setSearch] = useState("");
  const [fModule, setFModule] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [fAssignee, setFAssignee] = useState("All");
  const [fAutomation, setFAutomation] = useState("All");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<TestCase | null>(null);
  const [viewing, setViewing] = useState<TestCase | null>(null);
  const [isNew, setIsNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const assignees = useMemo(() => Array.from(new Set(cases.map((c) => c.assignee).filter(Boolean))), [cases]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (search && !`${c.title} ${c.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (fModule !== "All" && c.moduleId !== fModule) return false;
      if (fStatus !== "All" && c.status !== fStatus) return false;
      if (fPriority !== "All" && c.priority !== fPriority) return false;
      if (fAssignee !== "All" && c.assignee !== fAssignee) return false;
      if (fAutomation !== "All" && c.automation !== fAutomation) return false;
      return true;
    });
  }, [cases, search, fModule, fStatus, fPriority, fAssignee, fAutomation]);

  const kpis = useMemo(() => {
    const total = cases.length;
    const executed = cases.filter((c) => c.status !== "Not Executed").length;
    const pass = cases.filter((c) => c.status === "Pass").length;
    const fail = cases.filter((c) => c.status === "Fail").length;
    const notExec = cases.filter((c) => c.status === "Not Executed").length;
    return { total, executed, pass, fail, notExec };
  }, [cases]);

  function saveCase(tc: TestCase) {
    update((s) => {
      const exists = s.testCases.some((c) => c.id === tc.id);
      return {
        ...s,
        testCases: exists ? s.testCases.map((c) => (c.id === tc.id ? tc : c)) : [tc, ...s.testCases],
      };
    });
    log(`${isNew ? "Created" : "Updated"} test case ${tc.id} - ${tc.title}`);
    setEditing(null);
  }

  function deleteCase(id: string) {
    if (!confirm("Delete this test case?")) return;
    update((s) => ({ ...s, testCases: s.testCases.filter((c) => c.id !== id) }));
    log(`Deleted test case ${id}`);
    setViewing(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkStatus(status: string) {
    if (selected.size === 0) return;
    update((s) => ({
      ...s,
      testCases: s.testCases.map((c) => (selected.has(c.id) ? { ...c, status: status as TestCase["status"] } : c)),
    }));
    log(`Bulk updated ${selected.size} test case(s) to ${status}`);
    setSelected(new Set());
  }

  function exportCsv() {
    const header = ["id", "title", "moduleId", "type", "priority", "assignee", "status", "automation", "defect"];
    const rows = filtered.map((c) => header.map((h) => JSON.stringify((c as Record<string, unknown>)[h] ?? "")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases.csv";
    a.click();
    URL.revokeObjectURL(url);
    log("Exported test cases to CSV");
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const header = (lines[0] ?? "").split(",").map((h) => h.replace(/"/g, "").trim());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.replace(/^"|"$/g, ""));
        const rec: Record<string, string> = {};
        header.forEach((h, i) => (rec[h] = vals[i] ?? ""));
        return rec;
      });
      const imported: TestCase[] = rows.map((r) => ({
        ...emptyTc(),
        ...r,
        id: r["id"] || uid("tc"),
        priority: (r["priority"] as any) || "Medium",
        status: (r["status"] as any) || "Not Executed",
        automation: (r["automation"] as any) || "Manual",
        reqIds: [],
        activity: [],
      }));
      update((s) => ({ ...s, testCases: [...imported, ...s.testCases] }));
      log(`Imported ${imported.length} test case(s) from CSV`);
    };
    reader.readAsText(file);
  }

  function addActivity(tc: TestCase, text: string): TestCase {
    const entry: ActivityEntry = { ts: new Date().toISOString(), user: currentUser.name, text };
    return { ...tc, activity: [entry, ...tc.activity] };
  }

  return (
    <div>
      <PageHeader
        title="Test Cases"
        subtitle="Register of all authored test cases scoped to the active project."
        actions={
          <>
            <Btn onClick={() => fileRef.current?.click()}>Import CSV</Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <Btn onClick={exportCsv}>Export CSV</Btn>
            <Btn
              variant="primary"
              onClick={() => {
                setIsNew(true);
                setEditing(emptyTc());
              }}
            >
              + New Test Case
            </Btn>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Total" value={kpis.total} tone="blue" />
        <Kpi label="Executed" value={kpis.executed} tone="teal" />
        <Kpi label="Pass" value={kpis.pass} tone="green" />
        <Kpi label="Fail" value={kpis.fail} tone="red" />
        <Kpi label="Not Executed" value={kpis.notExec} tone="muted" />
      </div>

      <Card className="mb-3">
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Search title or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={`${inputCls} max-w-[160px]`} value={fModule} onChange={(e) => setFModule(e.target.value)}>
            <option value="All">All Modules</option>
            {state.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select className={`${inputCls} max-w-[150px]`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="All">All Status</option>
            {EXEC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className={`${inputCls} max-w-[130px]`} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="All">All Priority</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className={`${inputCls} max-w-[150px]`} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
            <option value="All">All Assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select className={`${inputCls} max-w-[150px]`} value={fAutomation} onChange={(e) => setFAutomation(e.target.value)}>
            <option value="All">Manual & Automated</option>
            {AUTOMATION.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selected.size > 0 && (
        <Card className="mb-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold">{selected.size} selected</span>
            {EXEC_STATUSES.map((s) => (
              <Btn key={s} onClick={() => bulkStatus(s)}>
                Mark {s}
              </Btn>
            ))}
            <Btn variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        {filtered.length === 0 ? (
          <Empty text="No test cases match the current filters." />
        ) : (
          <Table
            head={["", "ID", "Title", "Module", "Type", "Priority", "Assignee", "Status", "Automation", "Defect", ""]}
          >
            {filtered.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setViewing(c)}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(c.id)}
                  />
                </Td>
                <Td className="font-mono text-[11px]">{c.id}</Td>
                <Td className="font-medium">{c.title}</Td>
                <Td>{moduleById(state, c.moduleId)?.name ?? "—"}</Td>
                <Td>{c.type}</Td>
                <Td>
                  <Badge>{c.priority}</Badge>
                </Td>
                <Td>{c.assignee || "—"}</Td>
                <Td>
                  <Badge>{c.status}</Badge>
                </Td>
                <Td>{c.automation}</Td>
                <Td>{c.defect || "—"}</Td>
                <Td>
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Btn
                      onClick={() => {
                        setIsNew(false);
                        setEditing(c);
                      }}
                    >
                      Edit
                    </Btn>
                    <Btn variant="danger" onClick={() => deleteCase(c.id)}>
                      Delete
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {viewing && (
        <Modal open title={`${viewing.id} — ${viewing.title}`} onClose={() => setViewing(null)} wide>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Module</p>
                <p className="text-[12.5px]">{moduleById(state, viewing.moduleId)?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap text-[12.5px]">{viewing.desc || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Steps</p>
                <p className="whitespace-pre-wrap text-[12.5px]">{viewing.steps || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Expected Result</p>
                <p className="whitespace-pre-wrap text-[12.5px]">{viewing.expected || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Actual Result</p>
                <p className="whitespace-pre-wrap text-[12.5px]">{viewing.actual || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Linked Requirements</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {viewing.reqIds.length === 0 && <span className="text-[12px] text-muted-foreground">None</span>}
                  {viewing.reqIds.map((rid) => {
                    const r = state.requirements.find((x) => x.id === rid);
                    return <Badge key={rid} tone="blue">{r?.reqId ?? rid}</Badge>;
                  })}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">Activity Log</p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-border p-2">
                {viewing.activity.length === 0 && <p className="text-[12px] text-muted-foreground">No activity yet.</p>}
                {viewing.activity.map((a, i) => (
                  <div key={i} className="border-b border-border pb-1.5 text-[11.5px] last:border-0">
                    <span className="font-semibold">{a.user}</span> · {fmtDate(a.ts)}
                    <p className="text-muted-foreground">{a.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXEC_STATUSES.map((s) => (
                  <Btn
                    key={s}
                    onClick={() => {
                      const updated = addActivity({ ...viewing, status: s as TestCase["status"] }, `Status changed to ${s}`);
                      saveCase(updated);
                      setViewing(updated);
                    }}
                  >
                    {s}
                  </Btn>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <TestCaseModal
          tc={editing}
          onClose={() => setEditing(null)}
          onSave={saveCase}
        />
      )}
    </div>
  );
}

function TestCaseModal({
  tc,
  onClose,
  onSave,
}: {
  tc: TestCase;
  onClose: () => void;
  onSave: (tc: TestCase) => void;
}) {
  const { state } = useQa();
  const [form, setForm] = useState<TestCase>(tc);

  function applyTemplate(templateId: string) {
    const t = state.templates.find((x) => x.id === templateId);
    if (!t) return;
    setForm((f) => ({ ...f, type: t.type, priority: t.priority, desc: t.desc, steps: t.steps, expected: t.expected }));
  }

  return (
    <Modal
      open
      title={form.id.startsWith("tc") && state.testCases.some((c) => c.id === form.id) ? "Edit Test Case" : "New Test Case"}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => form.title && form.moduleId && onSave(form)}>
            Save
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Template (prefill)">
          <select className={inputCls} onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
            <option value="">— None —</option>
            {state.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Module">
          <select
            className={inputCls}
            value={form.moduleId}
            onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
          >
            <option value="">Select module…</option>
            {state.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={inputCls}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TestCase["priority"] })}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assignee">
          <input className={inputCls} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
        </Field>
        <Field label="Automation">
          <select
            className={inputCls}
            value={form.automation}
            onChange={(e) => setForm({ ...form, automation: e.target.value as TestCase["automation"] })}
          >
            {AUTOMATION.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TestCase["status"] })}
          >
            {EXEC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Linked Defect ID">
          <input className={inputCls} value={form.defect} onChange={(e) => setForm({ ...form, defect: e.target.value })} />
        </Field>
        <Field label="Linked Requirement IDs (comma separated)">
          <input
            className={inputCls}
            value={form.reqIds.join(",")}
            onChange={(e) => setForm({ ...form, reqIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea className={`${inputCls} min-h-[60px]`} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Steps">
            <textarea className={`${inputCls} min-h-[70px]`} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} />
          </Field>
        </div>
        <Field label="Expected Result">
          <textarea className={`${inputCls} min-h-[60px]`} value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} />
        </Field>
        <Field label="Actual Result">
          <textarea className={`${inputCls} min-h-[60px]`} value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

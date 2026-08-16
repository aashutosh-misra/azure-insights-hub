import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQa, uid } from "@/lib/qa/store";
import { scopedTestCases, scopedModules, moduleById, fmtDate } from "@/lib/qa/compute";
import { ImportDialog } from "@/components/qa/ImportDialog";
import type { ImportField } from "@/lib/qa/import";
import type { TestCase, ActivityEntry } from "@/lib/qa/types";
import { EXEC_STATUSES, SEVERITIES } from "@/lib/qa/seed";
import {
  Badge,
  Card,
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
    version: 1,
    versions: [],

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
  const [, setIsNew] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const projectModules = useMemo(() => scopedModules(state), [state]);
  const [importModuleId, setImportModuleId] = useState("");
  const aiModule = useMemo(
    () => projectModules.find((m) => m.id === importModuleId) ?? projectModules[0],
    [projectModules, importModuleId],
  );
  const aiCore = useMemo(
    () => state.projects.find((p) => p.name === (aiModule?.proj ?? state.currentProject))?.core ?? "Other",
    [state, aiModule],
  );

  function addGenerated(gen: GeneratedCase[]) {
    const moduleId = importModuleId || aiModule?.id || "";
    const created: TestCase[] = gen.map((g) => ({
      ...emptyTc(),
      id: uid("tc"),
      moduleId,
      title: g.title,
      desc: g.desc,
      steps: g.steps,
      expected: g.expected,
      type: g.type,
      priority: (SEVERITIES as readonly string[]).includes(g.priority) ? (g.priority as TestCase["priority"]) : "Medium",
      tags: g.tags,
    }));
    update((s) => ({ ...s, testCases: [...created, ...s.testCases] }));
    log(`AI generated ${created.length} test case(s) into ${aiModule?.name ?? "module"}`);
  }


  function importRecords(records: Record<ImportField, string>[]) {
    const imported: TestCase[] = records.map((r) => ({
      ...emptyTc(),
      id: uid("tc"),
      moduleId: importModuleId,
      title: r.title ?? "",
      desc: r.desc ?? "",
      steps: r.steps ?? "",
      expected: r.expected ?? "",
      type: r.type || "Functional",
      priority: (SEVERITIES as readonly string[]).includes(r.priority) ? (r.priority as TestCase["priority"]) : "Medium",
      assignee: r.assignee ?? "",
      status: (EXEC_STATUSES as readonly string[]).includes(r.status) ? (r.status as TestCase["status"]) : "Not Executed",
      automation: r.automation?.toLowerCase().startsWith("auto") ? "Automated" : "Manual",
      tags: r.tags ?? "",
    }));
    update((s) => ({ ...s, testCases: [...imported, ...s.testCases] }));
    log(`Imported ${imported.length} test case(s) into module ${moduleById(state, importModuleId)?.name ?? ""}`);
  }

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

  function saveCase(tc: TestCase, note?: string): TestCase {
    const prev = state.testCases.find((c) => c.id === tc.id);
    let next = tc;
    if (prev) {
      const changed =
        prev.title !== tc.title ||
        prev.desc !== tc.desc ||
        prev.steps !== tc.steps ||
        prev.expected !== tc.expected ||
        prev.priority !== tc.priority ||
        prev.type !== tc.type ||
        prev.moduleId !== tc.moduleId ||
        prev.tags !== tc.tags;
      if (changed) {
        const prevVersion = prev.version ?? 1;
        next = {
          ...tc,
          version: prevVersion + 1,
          versions: [
            {
              version: prevVersion,
              ts: new Date().toISOString(),
              user: currentUser.name,
              note: note ?? "Edited test case",
              snapshot: {
                title: prev.title,
                type: prev.type,
                priority: prev.priority,
                desc: prev.desc,
                steps: prev.steps,
                expected: prev.expected,
                moduleId: prev.moduleId,
                tags: prev.tags,
              },
            },
            ...(prev.versions ?? []),
          ].slice(0, 30),
        };
      }
    } else {
      next = { ...tc, version: tc.version ?? 1, versions: tc.versions ?? [] };
    }
    update((s) => ({
      ...s,
      testCases: prev ? s.testCases.map((c) => (c.id === next.id ? next : c)) : [next, ...s.testCases],
    }));
    log(`${prev ? "Updated" : "Created"} test case ${next.id} - ${next.title}${prev && next.version !== prev.version ? ` (v${next.version})` : ""}`);
    setEditing(null);
    return next;
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
    const rows = filtered.map((c) => header.map((h) => JSON.stringify((c as unknown as Record<string, unknown>)[h] ?? "")).join(","));
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
            <Btn onClick={() => setImportOpen(true)}>Import Excel / CSV</Btn>
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

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importRecords}
        canImport={Boolean(importModuleId)}
        target={
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 — target module ({state.currentProject === "All" ? "all projects" : state.currentProject})
            </p>
            <select className={inputCls} value={importModuleId} onChange={(e) => setImportModuleId(e.target.value)}>
              <option value="">Select a module…</option>
              {projectModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.proj} › {m.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

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
            {scopedModules(state).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.proj}
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
              <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase text-muted-foreground">
                Version history · v{viewing.version ?? 1}
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-border p-2">
                {(viewing.versions ?? []).length === 0 && (
                  <p className="text-[12px] text-muted-foreground">No previous versions.</p>
                )}
                {(viewing.versions ?? []).map((v) => (
                  <div key={v.version} className="border-b border-border pb-1.5 text-[11.5px] last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <Badge tone="purple">v{v.version}</Badge>{" "}
                        <span className="font-semibold">{v.user}</span> · {fmtDate(v.ts)}
                      </span>
                      <Btn
                        onClick={() => {
                          const restored = saveCase({ ...viewing, ...v.snapshot }, `Restored from v${v.version}`);
                          setViewing(restored);
                        }}
                      >
                        Restore
                      </Btn>
                    </div>
                    <p className="text-muted-foreground">{v.note}</p>
                    <p className="text-muted-foreground">{v.snapshot.title}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXEC_STATUSES.map((s) => (
                  <Btn
                    key={s}
                    onClick={() => {
                      const updated = addActivity({ ...viewing, status: s as TestCase["status"] }, `Status changed to ${s}`);
                      setViewing(saveCase(updated, `Status → ${s}`));
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
            {scopedModules(state).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.proj}
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

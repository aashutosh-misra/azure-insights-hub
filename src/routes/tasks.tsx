import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQa, uid } from "@/lib/qa/store";
import { daysSince, moduleById, fmtDate } from "@/lib/qa/compute";
import type { Task } from "@/lib/qa/types";
import { SEVERITIES } from "@/lib/qa/seed";
import { Badge, Card, PageHeader, Btn, Table, Td, Empty, Modal, Field, inputCls } from "@/components/qa/ui";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Assignments | QA Delivery Intelligence" },
      { name: "description", content: "Assign, track and manage QA tasks with due dates, priorities and status across modules and plans." },
      { property: "og:title", content: "Task Assignments | QA Delivery Intelligence" },
      { property: "og:description", content: "KPI-driven task board for QA delivery assignments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const STATUSES = ["Assigned", "In Progress", "Completed", "Blocked"];

function emptyTask(): Task {
  return {
    id: uid("task"),
    title: "",
    assignee: "",
    planId: "",
    moduleId: "",
    priority: "Medium",
    due: new Date().toISOString().slice(0, 10),
    status: "Assigned",
    notes: "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function isOverdue(t: Task) {
  return t.status !== "Completed" && new Date(t.due).getTime() < Date.now();
}

function TasksPage() {
  const { state, update, log } = useQa();
  const modIds = useMemo(
    () => new Set((state.currentProject === "All" ? state.modules : state.modules.filter((m) => m.proj === state.currentProject)).map((m) => m.id)),
    [state.modules, state.currentProject],
  );
  const tasks = useMemo(() => state.tasks.filter((t) => !t.moduleId || modIds.has(t.moduleId)), [state.tasks, modIds]);

  const [fAssignee, setFAssignee] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [editing, setEditing] = useState<Task | null>(null);

  const assignees = useMemo(() => Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))), [tasks]);

  const filtered = tasks.filter((t) => {
    if (fAssignee !== "All" && t.assignee !== fAssignee) return false;
    if (fStatus !== "All" && t.status !== fStatus) return false;
    if (fPriority !== "All" && t.priority !== fPriority) return false;
    return true;
  });

  const kpis = {
    open: tasks.filter((t) => t.status === "Assigned").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    overdue: tasks.filter(isOverdue).length,
    completed: tasks.filter((t) => t.status === "Completed").length,
  };

  function save(t: Task) {
    update((s) => {
      const exists = s.tasks.some((x) => x.id === t.id);
      return { ...s, tasks: exists ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [t, ...s.tasks] };
    });
    log(`Saved task ${t.title}`);
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    log(`Deleted task ${id}`);
  }

  function quickStatus(t: Task, status: string) {
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) }));
    log(`Task ${t.title} → ${status}`);
  }

  return (
    <div>
      <PageHeader
        title="Task Assignments"
        subtitle="Track QA delivery tasks assigned to team members."
        actions={<Btn variant="primary" onClick={() => setEditing(emptyTask())}>+ New Task</Btn>}
      />


      <Card className="mb-3">
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} max-w-[160px]`} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
            <option value="All">All Assignees</option>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className={`${inputCls} max-w-[150px]`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="All">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={`${inputCls} max-w-[130px]`} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="All">All Priority</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <Empty text="No tasks match the current filters." />
        ) : (
          <Table head={["Title", "Assignee", "Plan", "Module", "Priority", "Due", "Status", ""]}>
            {filtered.map((t) => {
              const overdue = isOverdue(t);
              const plan = state.testPlans.find((p) => p.id === t.planId);
              return (
                <tr key={t.id} className="hover:bg-accent/40">
                  <Td className="font-medium">{t.title}</Td>
                  <Td>{t.assignee || "—"}</Td>
                  <Td>{plan?.name ?? "—"}</Td>
                  <Td>{moduleById(state, t.moduleId)?.name ?? "—"}</Td>
                  <Td><Badge>{t.priority}</Badge></Td>
                  <Td className={overdue ? "font-semibold text-rag-red" : ""}>
                    {fmtDate(t.due)}{overdue && ` (${daysSince(t.due)}d overdue)`}
                  </Td>
                  <Td>
                    <select
                      className={`${inputCls} py-1 text-[11.5px]`}
                      value={t.status}
                      onChange={(e) => quickStatus(t, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn onClick={() => setEditing(t)}>Edit</Btn>
                      <Btn variant="danger" onClick={() => remove(t.id)}>Delete</Btn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function TaskModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (t: Task) => void }) {
  const { state } = useQa();
  const [form, setForm] = useState<Task>(task);

  return (
    <Modal
      open
      title={state.tasks.some((t) => t.id === form.id) ? "Edit Task" : "New Task"}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => form.title && onSave(form)}>Save</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <input className={inputCls} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Test Plan">
            <select className={inputCls} value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
              <option value="">— None —</option>
              {state.testPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Module">
            <select className={inputCls} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
              <option value="">— None —</option>
              {state.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input type="date" className={inputCls} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={`${inputCls} min-h-[70px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
